/**
 * Measure Embedding Quality - Before/After Comparison
 *
 * Tests semantic similarity of Supabase embeddings vs OpenAI embeddings
 * for the same queries to identify embedding mismatch issues.
 */

import { validateAndLoadEnvironment } from './src/config/environment.js';
import { SupabaseService } from './src/services/supabase.service.js';
import { OpenAIService } from './src/services/openai.service.js';
import { OpenAIEmbeddings } from '@langchain/openai';

const config = validateAndLoadEnvironment();
const supabase = new SupabaseService(config);
const openai = new OpenAIService(config);

// Create embeddings service
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

console.log('='.repeat(80));
console.log('EMBEDDING QUALITY MEASUREMENT - BASELINE');
console.log('='.repeat(80));
console.log(`Model: text-embedding-ada-002`);
console.log(`Date: ${new Date().toISOString()}\n`);

// Test queries covering different content types
const testQueries = [
  'How do I manage QC providers in AOMA?',
  'What is the Media Batch Converter used for?',
  'How can I search for artists in AOMA?',
  'TypeScript components for Master Details',
  'Java classes for Archive Master'
];

interface QueryResults {
  query: string;
  openai: {
    count: number;
    topSimilarity: number;
    avgSimilarity: number;
  };
  supabaseUnified: {
    count: number;
    topSimilarity: number;
    avgSimilarity: number;
  };
  supabaseGit: {
    count: number;
    topSimilarity: number;
    avgSimilarity: number;
  };
}

const results: QueryResults[] = [];

for (const query of testQueries) {
  console.log(`\nQuery: "${query}"`);
  console.log('-'.repeat(80));

  // Generate embedding
  const queryEmbedding = await embeddings.embedQuery(query);

  // Test OpenAI vector store
  const openaiResults = await openai.queryVectorStoreDirect(query, 10);
  const openaiCount = openaiResults.length;
  const openaiScores = openaiResults.map((r: any) => r.score || 0);
  const openaiTop = Math.max(...openaiScores);
  const openaiAvg = openaiScores.reduce((a: number, b: number) => a + b, 0) / openaiCount;

  console.log(`OpenAI Vector Store: ${openaiCount} results`);
  console.log(`  Top similarity: ${openaiTop.toFixed(3)}`);
  console.log(`  Avg similarity: ${openaiAvg.toFixed(3)}`);

  // Test Supabase unified table
  const { data: unifiedData } = await supabase.client
    .rpc('match_aoma_vectors', {
      query_embedding: queryEmbedding,
      match_threshold: 0.0,
      match_count: 10,
      filter_source_types: ['knowledge', 'jira', 'git']
    });

  const unifiedCount = unifiedData?.length || 0;
  const unifiedScores = (unifiedData || []).map((r: any) => r.similarity || 0);
  const unifiedTop = unifiedCount > 0 ? Math.max(...unifiedScores) : 0;
  const unifiedAvg = unifiedCount > 0
    ? unifiedScores.reduce((a: number, b: number) => a + b, 0) / unifiedCount
    : 0;

  console.log(`Supabase Unified: ${unifiedCount} results`);
  console.log(`  Top similarity: ${unifiedTop.toFixed(3)}`);
  console.log(`  Avg similarity: ${unifiedAvg.toFixed(3)}`);

  // Test Supabase git table
  const { data: gitData } = await supabase.client
    .rpc('match_git_files', {
      query_embedding: queryEmbedding,
      match_count: 10,
      match_threshold: 0.0
    });

  const gitCount = gitData?.length || 0;
  const gitScores = (gitData || []).map((r: any) => r.similarity || 0);
  const gitTop = gitCount > 0 ? Math.max(...gitScores) : 0;
  const gitAvg = gitCount > 0
    ? gitScores.reduce((a: number, b: number) => a + b, 0) / gitCount
    : 0;

  console.log(`Supabase Git Files: ${gitCount} results`);
  console.log(`  Top similarity: ${gitTop.toFixed(3)}`);
  console.log(`  Avg similarity: ${gitAvg.toFixed(3)}`);

  // Calculate quality gap
  const unifiedGap = openaiTop - unifiedTop;
  const gitGap = openaiTop - gitTop;

  console.log(`\nQuality Gap:`);
  console.log(`  OpenAI vs Unified: ${(unifiedGap * 100).toFixed(1)}% difference`);
  console.log(`  OpenAI vs Git: ${(gitGap * 100).toFixed(1)}% difference`);

  results.push({
    query,
    openai: { count: openaiCount, topSimilarity: openaiTop, avgSimilarity: openaiAvg },
    supabaseUnified: { count: unifiedCount, topSimilarity: unifiedTop, avgSimilarity: unifiedAvg },
    supabaseGit: { count: gitCount, topSimilarity: gitTop, avgSimilarity: gitAvg }
  });
}

console.log('\n' + '='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));

// Calculate averages across all queries
const avgOpenaiTop = results.reduce((sum, r) => sum + r.openai.topSimilarity, 0) / results.length;
const avgUnifiedTop = results.reduce((sum, r) => sum + r.supabaseUnified.topSimilarity, 0) / results.length;
const avgGitTop = results.reduce((sum, r) => sum + r.supabaseGit.topSimilarity, 0) / results.length;

console.log(`\nAverage Top Similarity (across ${results.length} queries):`);
console.log(`  OpenAI:           ${avgOpenaiTop.toFixed(3)} (${(avgOpenaiTop * 100).toFixed(1)}%)`);
console.log(`  Supabase Unified: ${avgUnifiedTop.toFixed(3)} (${(avgUnifiedTop * 100).toFixed(1)}%)`);
console.log(`  Supabase Git:     ${avgGitTop.toFixed(3)} (${(avgGitTop * 100).toFixed(1)}%)`);

console.log(`\nQuality Gap:`);
console.log(`  OpenAI vs Unified: ${((avgOpenaiTop - avgUnifiedTop) * 100).toFixed(1)}% worse`);
console.log(`  OpenAI vs Git:     ${((avgOpenaiTop - avgGitTop) * 100).toFixed(1)}% worse`);

console.log(`\nConclusion:`);
if (avgUnifiedTop < 0.3) {
  console.log(`  ❌ Unified embeddings need re-vectorization (avg similarity ${(avgUnifiedTop * 100).toFixed(1)}%)`);
} else if (avgUnifiedTop < 0.5) {
  console.log(`  ⚠️  Unified embeddings are marginal (avg similarity ${(avgUnifiedTop * 100).toFixed(1)}%)`);
} else {
  console.log(`  ✅ Unified embeddings are good (avg similarity ${(avgUnifiedTop * 100).toFixed(1)}%)`);
}

if (avgGitTop < 0.3) {
  console.log(`  ❌ Git embeddings need re-vectorization (avg similarity ${(avgGitTop * 100).toFixed(1)}%)`);
} else if (avgGitTop < 0.5) {
  console.log(`  ⚠️  Git embeddings are marginal (avg similarity ${(avgGitTop * 100).toFixed(1)}%)`);
} else {
  console.log(`  ✅ Git embeddings are good (avg similarity ${(avgGitTop * 100).toFixed(1)}%)`);
}

// Save results to file
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `embedding-quality-baseline-${timestamp}.json`;
const fs = await import('fs/promises');
await fs.writeFile(
  `docs/${filename}`,
  JSON.stringify({ timestamp: new Date().toISOString(), results, summary: {
    avgOpenaiTop,
    avgUnifiedTop,
    avgGitTop,
    qualityGapUnified: avgOpenaiTop - avgUnifiedTop,
    qualityGapGit: avgOpenaiTop - avgGitTop
  }}, null, 2)
);

console.log(`\n📊 Results saved to: docs/${filename}`);
console.log('='.repeat(80));
