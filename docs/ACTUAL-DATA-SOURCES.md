# Actual Data Sources Available

## Current Architecture: Unified Vector Store

Unlike what I initially documented, the architecture uses a **single unified Supabase table** with source types, not separate tables.

### Supabase: `aoma_unified_vectors` Table

**Schema** (from `001_aoma_vector_store.sql`):
```sql
CREATE TABLE aoma_unified_vectors (
  id uuid,
  content TEXT,
  embedding vector(1536),  -- OpenAI embeddings
  source_type TEXT,        -- 'knowledge', 'jira', 'git', 'email', etc.
  source_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Search Function**:
```sql
match_aoma_vectors(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  filter_source_types text[] DEFAULT NULL  -- Filter by source type!
)
```

### Source Types Available

Based on schema (line 14 of migration):

| Source Type | Description | Status | Notes |
|-------------|-------------|--------|-------|
| **knowledge** | AOMA documentation, wiki pages | ✅ Populated | Main docs source |
| **jira** | JIRA tickets, issues | ✅ Populated | Has migration file |
| **git** | Git commits | ❓ Unknown | Check if populated |
| **email** | Outlook emails | ❌ **Not populated** | Skip for now! |
| **metrics** | Performance metrics | ❓ Unknown | Probably not populated |
| **openai_import** | Data from OpenAI | ❓ Unknown | Legacy import? |
| **cache** | Cached results | ❓ Unknown | Probably not needed |

### OpenAI Vector Store

- **Location**: Separate OpenAI service (not Supabase)
- **Content**: 150+ AOMA documentation files
- **Access**: Via `openaiService.queryVectorStoreDirect()`
- **Status**: ✅ Currently the ONLY source being used

---

## Corrected Architecture

### 1 → 2 Sources (Not 1 → 6!)

**Before**:
```
User Query → OpenAI Vector Store (150 docs) → Response
```

**After**:
```
User Query → {
  OpenAI Vector Store (150 docs),
  Supabase aoma_unified_vectors (filtered by source_type)
} → Merged Response
```

### How to Query Each Source

#### Source 1: OpenAI Vector Store
```typescript
// Already working
const results = await openaiService.queryVectorStoreDirect(query, 10);
```

#### Source 2: Supabase Unified Vectors (by source_type)

**Query Knowledge Docs**:
```typescript
const { data } = await supabase.rpc('match_aoma_vectors', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10,
  filter_source_types: ['knowledge']
});
```

**Query JIRA Tickets**:
```typescript
const { data } = await supabase.rpc('match_aoma_vectors', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10,
  filter_source_types: ['jira']
});
```

**Query ALL Supabase sources**:
```typescript
const { data } = await supabase.rpc('match_aoma_vectors', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 10,
  filter_source_types: ['knowledge', 'jira', 'git']  // Exclude email
});
```

---

## Revised LangChain Integration Plan

### Phase 1: 2-Source Orchestration (Simpler!)

Instead of 6 separate retrievers, we need:

1. **OpenAI Retriever** (existing)
2. **Supabase Unified Retriever** (with source_type filtering)

#### Implementation

**File**: `src/services/retrievers/supabase-unified-retriever.ts`
```typescript
import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { SupabaseClient } from '@supabase/supabase-js';
import { OpenAIEmbeddings } from '@langchain/openai';

export class SupabaseUnifiedRetriever extends BaseRetriever {
  lc_namespace = ['aoma-mesh-mcp', 'retrievers', 'supabase-unified'];

  constructor(
    private supabaseClient: SupabaseClient,
    private embeddings: OpenAIEmbeddings,
    private sourceTypes: string[] = ['knowledge', 'jira', 'git'], // Exclude 'email'
    private k: number = 10,
    private threshold: number = 0.7
  ) {
    super();
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // 1. Get query embedding
    const queryEmbedding = await this.embeddings.embedQuery(query);

    // 2. Search unified table with source type filter
    const { data, error } = await this.supabaseClient.rpc('match_aoma_vectors', {
      query_embedding: queryEmbedding,
      match_threshold: this.threshold,
      match_count: this.k,
      filter_source_types: this.sourceTypes
    });

    if (error) throw error;

    // 3. Convert to LangChain Documents
    return (data || []).map((item: any) => new Document({
      pageContent: item.content,
      metadata: {
        source: 'supabase',
        sourceType: item.source_type,
        sourceId: item.source_id,
        similarity: item.similarity,
        ...item.metadata
      }
    }));
  }

  /**
   * Create retriever for specific source types
   */
  static forKnowledge(client: SupabaseClient, embeddings: OpenAIEmbeddings, k = 10) {
    return new SupabaseUnifiedRetriever(client, embeddings, ['knowledge'], k);
  }

  static forJira(client: SupabaseClient, embeddings: OpenAIEmbeddings, k = 10) {
    return new SupabaseUnifiedRetriever(client, embeddings, ['jira'], k);
  }

  static forAll(client: SupabaseClient, embeddings: OpenAIEmbeddings, k = 10) {
    return new SupabaseUnifiedRetriever(
      client,
      embeddings,
      ['knowledge', 'jira', 'git'],  // Exclude unpopulated sources
      k
    );
  }
}
```

**File**: `src/services/langchain-orchestrator.service.ts`
```typescript
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { SupabaseUnifiedRetriever } from './retrievers/supabase-unified-retriever';
import { OpenAIVectorRetriever } from './retrievers/openai-retriever';

export class LangChainOrchestrator {
  private chatModel: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private supabaseRetriever: SupabaseUnifiedRetriever;
  private openaiRetriever: OpenAIVectorRetriever;

  constructor(
    private openaiService: OpenAIService,
    private supabaseService: SupabaseService,
    config: Environment
  ) {
    this.chatModel = new ChatOpenAI({
      modelName: 'gpt-5',
      temperature: 1,
      openAIApiKey: config.OPENAI_API_KEY,
    });

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.OPENAI_API_KEY,
    });

    // Single unified Supabase retriever (all source types)
    // @ts-ignore
    this.supabaseRetriever = SupabaseUnifiedRetriever.forAll(
      this.supabaseService.client,
      this.embeddings,
      10
    );

    // OpenAI vector store retriever
    this.openaiRetriever = new OpenAIVectorRetriever(openaiService, 10);
  }

  async query(
    query: string,
    strategy: 'comprehensive' | 'focused' | 'rapid' = 'focused'
  ) {
    // Retrieve from BOTH sources in parallel
    const [supabaseResults, openaiResults] = await Promise.all([
      this.supabaseRetriever.getRelevantDocuments(query).catch(() => []),
      this.openaiRetriever.getRelevantDocuments(query).catch(() => []),
    ]);

    // Combine and rank
    const allDocs = [...supabaseResults, ...openaiResults];
    allDocs.sort((a, b) => (b.metadata.similarity || 0) - (a.metadata.similarity || 0));

    const topN = strategy === 'comprehensive' ? 20 : strategy === 'focused' ? 10 : 5;
    const topDocs = allDocs.slice(0, topN);

    // Generate answer with GPT-5
    // ... (same as before)

    return {
      answer,
      sourceDocuments: topDocs,
      stats: {
        supabase: supabaseResults.length,
        openai: openaiResults.length,
        total: allDocs.length,
        bySourceType: this.countBySourceType(supabaseResults)
      }
    };
  }

  private countBySourceType(docs: Document[]) {
    const counts: Record<string, number> = {};
    docs.forEach(doc => {
      const type = doc.metadata.sourceType || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }
}
```

---

## Benefits of This Simpler Architecture

1. **Less Complex**: 2 retrievers instead of 6
2. **Already Unified**: Supabase table already combines sources
3. **Easy Filtering**: Can still break down by source_type for analytics
4. **Skip Empty Sources**: Don't query 'email' until populated

---

## Next Steps

1. ✅ Verify which source_types are populated in Supabase
2. Create `SupabaseUnifiedRetriever` (30 min)
3. Create `OpenAIVectorRetriever` (15 min)
4. Create simplified `LangChainOrchestrator` (45 min)
5. Wire up and test (30 min)

**Total**: ~2 hours instead of 3-4 hours!
