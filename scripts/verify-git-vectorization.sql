-- ============================================
-- Git Vectorization Verification Script
-- ============================================
-- Purpose: Verify what git data is actually vectorized and accessible
-- Date: 2025-10-28

BEGIN;

-- ============================================
-- STEP 1: Check Legacy git_file_embeddings Table
-- ============================================

\echo '\n=== LEGACY GIT_FILE_EMBEDDINGS TABLE ==='

-- Check if table exists and row count
SELECT
  'git_file_embeddings' as table_name,
  COUNT(*) as total_vectors,
  COUNT(DISTINCT repo_path) as unique_repos,
  pg_size_pretty(pg_total_relation_size('git_file_embeddings')) as table_size
FROM git_file_embeddings;

-- Expected: ~4,092 rows, 2 repos, ~50-100 MB

-- Sample of what's in the table
SELECT
  repo_path,
  file_path,
  LENGTH(content) as content_size,
  embedding IS NOT NULL as has_embedding
FROM git_file_embeddings
ORDER BY LENGTH(content) DESC
LIMIT 10;

-- File type distribution
SELECT
  CASE
    WHEN file_path ~ '\.java$' THEN 'java'
    WHEN file_path ~ '\.ts$' THEN 'typescript'
    WHEN file_path ~ '\.tsx$' THEN 'tsx'
    WHEN file_path ~ '\.js$' THEN 'javascript'
    WHEN file_path ~ '\.html$' THEN 'html'
    WHEN file_path ~ '\.css$|\.scss$' THEN 'styles'
    WHEN file_path ~ '\.xml$' THEN 'xml'
    WHEN file_path ~ '\.json$' THEN 'json'
    WHEN file_path ~ '\.(png|jpg|gif|svg)$' THEN 'images'
    ELSE 'other'
  END as file_type,
  COUNT(*) as count,
  pg_size_pretty(SUM(LENGTH(content))::bigint) as total_size
FROM git_file_embeddings
GROUP BY file_type
ORDER BY count DESC;

-- ============================================
-- STEP 2: Check Unified aoma_unified_vectors Table
-- ============================================

\echo '\n=== UNIFIED AOMA_UNIFIED_VECTORS TABLE ==='

-- Check git source_type count
SELECT
  'aoma_unified_vectors (git)' as table_name,
  COUNT(*) as total_vectors,
  pg_size_pretty(pg_total_relation_size('aoma_unified_vectors')) as table_size
FROM aoma_unified_vectors
WHERE source_type = 'git';

-- Expected: 0 rows (or unknown - this is what we're checking!)

-- If any git data exists, show samples
SELECT
  source_type,
  source_id,
  LENGTH(content) as content_size,
  metadata->>'repo_path' as repo_path,
  metadata->>'file_path' as file_path
FROM aoma_unified_vectors
WHERE source_type = 'git'
LIMIT 10;

-- All source types in unified table
SELECT
  source_type,
  COUNT(*) as count
FROM aoma_unified_vectors
GROUP BY source_type
ORDER BY count DESC;

-- ============================================
-- STEP 3: Test Query Performance
-- ============================================

\echo '\n=== QUERY PERFORMANCE TEST ==='

-- Test legacy search_git_files function
\timing on

-- Generate a test embedding (all zeros for testing)
WITH test_embedding AS (
  SELECT ARRAY_FILL(0::float, ARRAY[1536])::vector(1536) as embedding
)
SELECT COUNT(*) as legacy_results
FROM search_git_files(
  (SELECT embedding FROM test_embedding),
  10,
  0.0
);

-- Test unified search with git filter
WITH test_embedding AS (
  SELECT ARRAY_FILL(0::float, ARRAY[1536])::vector(1536) as embedding
)
SELECT COUNT(*) as unified_results
FROM match_aoma_vectors(
  (SELECT embedding FROM test_embedding),
  0.0,
  10,
  ARRAY['git']::text[]
);

\timing off

-- ============================================
-- STEP 4: Check Indexes
-- ============================================

\echo '\n=== INDEX STATUS ==='

-- Check HNSW indexes exist
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('git_file_embeddings', 'aoma_unified_vectors')
  AND indexdef LIKE '%hnsw%'
ORDER BY tablename, indexname;

-- ============================================
-- STEP 5: Repository Analysis
-- ============================================

\echo '\n=== REPOSITORY BREAKDOWN ==='

-- Files per repository
SELECT
  repo_path,
  COUNT(*) as file_count,
  pg_size_pretty(SUM(LENGTH(content))::bigint) as total_content_size,
  AVG(LENGTH(content))::int as avg_file_size
FROM git_file_embeddings
GROUP BY repo_path
ORDER BY file_count DESC;

-- Expected:
-- aoma-ui: ~3,713 files, ~14.6 MB
-- aoma-ui-service: ~624 files, ~5.8 MB

-- Largest files (might be candidates for exclusion)
SELECT
  repo_path,
  file_path,
  LENGTH(content) as size_bytes,
  pg_size_pretty(LENGTH(content)) as size_human
FROM git_file_embeddings
ORDER BY LENGTH(content) DESC
LIMIT 20;

-- ============================================
-- STEP 6: Data Quality Checks
-- ============================================

\echo '\n=== DATA QUALITY ==='

-- Check for files with no content
SELECT COUNT(*) as empty_files
FROM git_file_embeddings
WHERE content IS NULL OR LENGTH(content) = 0;

-- Check for files with no embedding
SELECT COUNT(*) as no_embedding
FROM git_file_embeddings
WHERE embedding IS NULL;

-- Check for duplicate file paths
SELECT file_path, COUNT(*) as duplicates
FROM git_file_embeddings
GROUP BY file_path
HAVING COUNT(*) > 1
ORDER BY duplicates DESC
LIMIT 10;

-- ============================================
-- SUMMARY
-- ============================================

\echo '\n=== SUMMARY ==='
\echo 'Expected state:'
\echo '  - git_file_embeddings: 4,092 vectors (populated)'
\echo '  - aoma_unified_vectors (git): 0 vectors (needs migration)'
\echo '  - Total repo size: ~20 MB (manageable)'
\echo '  - Main content: Java (514), TypeScript (2,672), HTML (405)'
\echo ''
\echo 'If git_file_embeddings has data but unified table does not:'
\echo '  -> Need to implement dual-query strategy'
\echo '  -> Or migrate legacy data to unified table'

COMMIT;
