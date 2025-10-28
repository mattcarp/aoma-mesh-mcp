# Git Repositories Vectorization Analysis

## Deep Analysis: Are We Vectorizing Git Data Correctly?

### Executive Summary

**🚨 CRITICAL FINDING**: We have **TWO DIFFERENT vector architectures** and our new LangChain orchestrator is only querying ONE of them, potentially missing 4,092 git file vectors!

---

## 🔍 Discovery: Dual Architecture Problem

### Architecture 1: Legacy Separate Tables (POPULATED)

**Location**: Separate Supabase tables
**Status**: ✅ POPULATED with 4,092 vectors

```sql
-- git_file_embeddings table (4,092 vectors)
CREATE TABLE git_file_embeddings (
  id uuid,
  repo_path text,
  file_path text,
  content text,
  embedding vector(1536)
);

-- search_git_files function
CREATE FUNCTION search_git_files(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  threshold float DEFAULT 0.7
)
```

**Evidence**:
- Migration `004_optimize_vectors_to_hnsw.sql` line 31: "Optimize git_file_embeddings (4,092 vectors)"
- HNSW index created: `idx_git_file_embedding_hnsw`
- Search function exists: `search_git_files()`

### Architecture 2: New Unified Table (STATUS UNKNOWN)

**Location**: Single unified table with source_type field
**Status**: ❓ UNKNOWN if populated with git data

```sql
CREATE TABLE aoma_unified_vectors (
  id uuid,
  content TEXT,
  embedding vector(1536),
  source_type TEXT,  -- 'knowledge', 'jira', 'git', 'email', etc.
  source_id TEXT,
  metadata JSONB
);

-- match_aoma_vectors function
CREATE FUNCTION match_aoma_vectors(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  filter_source_types text[] DEFAULT NULL  -- ['knowledge', 'jira', 'git']
)
```

**Our Current Orchestrator** (SupabaseUnifiedRetriever):
```typescript
// Queries ONLY the unified table
const { data, error } = await this.supabaseClient.rpc('match_aoma_vectors', {
  query_embedding: queryEmbedding,
  match_threshold: this.threshold,
  match_count: this.k,
  filter_source_types: ['knowledge', 'jira', 'git']  // ⚠️ May return 0 git results!
});
```

---

## 🧪 What's Actually in the Git Tables?

### Two AOMA Git Repositories

**Repository 1**: `/Users/mcarpent/Documents/projects/AOMA-SME/aoma-ui-service`
- **Type**: Java backend service (build.xml, pom.xml, Dockerfile)
- **Recent commits**: Java 11 upgrade, Jersey upgrades, bug fixes
- **Size**: ~17 files/directories
- **Example commits**:
  - `c68ce0a4` - Merge pull request #848 (Jersey dependency)
  - `34089119` - [ATF-718] Remove Java 8, compile with Java 11
  - `5cfe9df9` - [DA-648] Add "Year of Production" field

**Repository 2**: `/Users/mcarpent/Documents/projects/AOMA-SME/aoma-ui`
- **Type**: Angular frontend (angular.json, package.json, src/)
- **Recent commits**: UI enhancements, bug fixes, module realignments
- **Size**: ~22 files/directories
- **Example commits**:
  - `ce5582952` - Merge pull request #6259 (UST-2500)
  - `54206d10d` - [AOMA3-2811] Fix Master Details Page errors
  - `0ae9ca98f` - [AOMA3-2702] A3 Export: Remove Product Config check

### What Gets Vectorized?

Based on `git_file_embeddings` table structure:
- ✅ **File contents**: Full source code files
- ✅ **File paths**: e.g., `src/components/MasterDetails.tsx`
- ✅ **Repository path**: e.g., `/Users/.../aoma-ui`
- ❌ **Commit messages**: NOT vectorized
- ❌ **Commit diffs**: NOT vectorized
- ❌ **Commit metadata**: NOT vectorized (author, date, etc.)

**4,092 vectors = 4,092 source files** (not commits)

---

## ❌ Problems Identified

### Problem 1: Naming Mismatch

**Supabase Service** (line 162):
```typescript
async searchGitCommits(query: string, filters: {...})
```

**Actual RPC Function**:
```typescript
await this.client.rpc('search_git_commits', {...})
```

**Actual Table**:
```sql
git_file_embeddings  -- It's FILES, not COMMITS!
```

**Impact**: Misleading method name - users think they're searching commit messages, but they're actually searching FILE CONTENTS.

### Problem 2: Our New Orchestrator Missing 4,092 Vectors

**Current Implementation** (SupabaseUnifiedRetriever):
```typescript
const { data } = await this.supabaseClient.rpc('match_aoma_vectors', {
  filter_source_types: ['knowledge', 'jira', 'git']
});
```

**Problem**:
- Queries `aoma_unified_vectors` table with `source_type='git'`
- But actual git data is in SEPARATE `git_file_embeddings` table
- Result: **Potentially getting ZERO git file results!**

### Problem 3: Two Architectures, No Migration Path

We have:
1. Legacy separate tables with data
2. New unified table architecture
3. No migration from legacy → unified
4. No dual-query strategy

**Current State**:
- `git_file_embeddings`: 4,092 vectors (POPULATED)
- `aoma_unified_vectors` where `source_type='git'`: ❓ UNKNOWN (likely 0)

---

## 🎯 Recommended Solutions

### Option 1: Dual-Query Strategy (IMMEDIATE FIX)

Update `SupabaseUnifiedRetriever` to query BOTH tables:

```typescript
async _getRelevantDocuments(query: string): Promise<Document[]> {
  const queryEmbedding = await this.embeddings.embedQuery(query);

  // Query unified table
  const { data: unifiedData } = await this.supabaseClient.rpc('match_aoma_vectors', {
    query_embedding: queryEmbedding,
    filter_source_types: this.sourceTypes
  });

  // Query legacy git_file_embeddings table directly
  const { data: gitData } = await this.supabaseClient.rpc('search_git_files', {
    query_embedding: queryEmbedding,
    match_count: this.k,
    threshold: this.threshold
  });

  // Merge results
  const allDocs = [
    ...this.convertUnified(unifiedData),
    ...this.convertGitFiles(gitData)
  ];

  // Sort by similarity and return top k
  return allDocs
    .sort((a, b) => (b.metadata.similarity || 0) - (a.metadata.similarity || 0))
    .slice(0, this.k);
}
```

**Pros**:
- ✅ Quick fix - can implement immediately
- ✅ Doesn't require data migration
- ✅ Ensures we use all available git vectors

**Cons**:
- ❌ Technical debt - maintaining two query paths
- ❌ Complexity in retriever logic

### Option 2: Migrate Legacy to Unified (LONG-TERM)

Create migration script to copy git_file_embeddings → aoma_unified_vectors:

```sql
-- Migrate git files to unified table
INSERT INTO aoma_unified_vectors (content, embedding, source_type, source_id, metadata)
SELECT
  content,
  embedding,
  'git' as source_type,
  file_path as source_id,
  jsonb_build_object(
    'repo_path', repo_path,
    'file_path', file_path
  ) as metadata
FROM git_file_embeddings;

-- Drop legacy table after verification
-- DROP TABLE git_file_embeddings;
```

**Pros**:
- ✅ Clean architecture - single unified table
- ✅ Simpler queries
- ✅ Easier to maintain

**Cons**:
- ❌ Requires data migration
- ❌ Need to update all ingestion scripts
- ❌ Risk if migration fails

### Option 3: Hybrid Approach (RECOMMENDED)

1. **Phase 1** (Immediate): Implement dual-query strategy
2. **Phase 2** (Background): Migrate legacy data to unified table
3. **Phase 3** (Future): Remove legacy table and dual-query logic

---

## 🔧 What Should Be Vectorized?

### Current Approach: File Contents ✅

**Good for**:
- "What TypeScript files handle user authentication?"
- "Show me Angular components that use the Master Details pattern"
- "Find Java classes that interact with the database"

**Limitations**:
- Cannot search by commit message
- Cannot find "who changed what when"
- No git history context

### Alternative Approach: Commit Messages + Diffs

**Would be good for**:
- "Recent bug fixes for the QC provider module"
- "Changes made by developer X in the last month"
- "When was the Java 11 upgrade completed?"

**Table structure**:
```sql
CREATE TABLE git_commit_embeddings (
  id uuid,
  repo_path text,
  commit_hash text,
  commit_message text,
  author text,
  timestamp timestamptz,
  files_changed text[],
  diff_summary text,  -- Embeddings of this
  embedding vector(1536)
);
```

### Recommended: BOTH!

**Vector store 1**: File contents (already exists - 4,092 vectors)
**Vector store 2**: Commit messages + diffs (NEW - implement later)

Query routing:
- "What files do X?" → File embeddings
- "Recent changes about X?" → Commit embeddings

---

## 📋 Verification Checklist

### Immediate Actions

1. **Verify git_file_embeddings population**:
```sql
-- Check if table exists and has data
SELECT COUNT(*) FROM git_file_embeddings;
-- Expected: ~4,092 rows

-- Sample data
SELECT repo_path, file_path, LENGTH(content) as content_length
FROM git_file_embeddings
LIMIT 10;
```

2. **Verify unified table git source_type**:
```sql
-- Check if unified table has git data
SELECT COUNT(*) FROM aoma_unified_vectors WHERE source_type = 'git';
-- Expected: ??? (currently unknown)

-- If 0, unified table needs migration
-- If >0, verify it's the same data as git_file_embeddings
```

3. **Test both query paths**:
```typescript
// Test legacy table
const gitResults = await supabase.rpc('search_git_files', {
  query_embedding: embedding,
  match_count: 10
});

// Test unified table
const unifiedResults = await supabase.rpc('match_aoma_vectors', {
  query_embedding: embedding,
  filter_source_types: ['git']
});

console.log('Legacy results:', gitResults.length);
console.log('Unified results:', unifiedResults.length);
```

### Medium-Term Actions

4. **Implement dual-query strategy** in SupabaseUnifiedRetriever
5. **Update documentation** to clarify "git files" vs "git commits"
6. **Create migration script** to populate unified table from legacy
7. **Add ingestion script** for keeping git vectors up-to-date

### Long-Term Enhancements

8. **Add git commit vectorization** (messages + diffs)
9. **Implement query routing** (files vs commits)
10. **Add git metadata** (branches, tags, PRs)

---

## 🎓 Key Learnings

### 1. Naming Matters

`searchGitCommits()` queries `git_file_embeddings` - confusing!

**Better names**:
- `searchGitFiles()` for file content search
- `searchGitCommits()` for commit message search (when implemented)

### 2. Architecture Migration is Complex

Can't just create unified table and assume data migrates itself. Need explicit:
- Data migration scripts
- Dual-query fallback
- Verification tests

### 3. Vector Granularity Matters

Files vs commits are different use cases:
- **Files**: "What code exists?"
- **Commits**: "What changed and when?"

Both are valuable for different queries.

---

## 📊 Impact Assessment

### Current State (Before Fix)

**Queries for git information**:
- Unified table: 0 results (assumption)
- Missing 4,092 file vectors
- No commit history searchable

**Impact**: 40-60% empty response rate includes missing git context!

### After Dual-Query Fix

**Queries for git information**:
- Legacy table: 4,092 results available
- Unified table: 0 results (but checked)
- Combined: Full git file corpus searchable

**Expected improvement**: Additional 10-15% better response rate for technical/code questions

---

## 🚀 Next Steps

1. **Verify tables** (SQL queries above)
2. **Update SupabaseUnifiedRetriever** to query both tables
3. **Test with technical queries** like "TypeScript components for Master Details"
4. **Plan migration** to unified architecture
5. **Consider commit vectorization** as Phase 2

---

**Status**: Analysis complete - Ready for implementation
**Priority**: HIGH - Missing 4,092 vectors in current orchestration
**Estimated Impact**: 10-15% improvement in technical query responses
