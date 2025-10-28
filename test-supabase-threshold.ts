import { validateAndLoadEnvironment } from './src/config/environment.js';
import { SupabaseService } from './src/services/supabase.service.js';
import { OpenAIEmbeddings } from '@langchain/openai';

const config = validateAndLoadEnvironment();
const supabase = new SupabaseService(config);

console.log('Testing Supabase retrieval with different thresholds...\n');

// Create embeddings service
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

const testQuery = 'How do I manage QC providers in AOMA?';
console.log(`Test query: "${testQuery}"\n`);

// Generate embedding
console.log('Generating query embedding...');
const queryEmbedding = await embeddings.embedQuery(testQuery);
console.log(`✅ Embedding generated (${queryEmbedding.length} dimensions)\n`);

// Test with different thresholds
const thresholds = [0.0, 0.3, 0.5, 0.7, 0.8];

for (const threshold of thresholds) {
  console.log(`\n--- Testing with threshold: ${threshold} ---`);

  // Test unified table
  const { data: unifiedData, error: unifiedError } = await supabase.client
    .rpc('match_aoma_vectors', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: 10,
      filter_source_types: ['knowledge', 'jira', 'git']
    });

  if (unifiedError) {
    console.error('❌ match_aoma_vectors error:', unifiedError);
  } else {
    console.log(`unified table (match_aoma_vectors): ${unifiedData?.length || 0} results`);
    if (unifiedData && unifiedData.length > 0) {
      const avgSim = unifiedData.reduce((sum: number, r: any) => sum + (r.similarity || 0), 0) / unifiedData.length;
      console.log(`  Top similarity: ${(unifiedData[0].similarity || 0).toFixed(3)}`);
      console.log(`  Avg similarity: ${avgSim.toFixed(3)}`);
      console.log(`  First result: [${unifiedData[0].source_type}] ${unifiedData[0].source_id.slice(0, 60)}...`);
    }
  }

  // Test git table
  const { data: gitData, error: gitError } = await supabase.client
    .rpc('match_git_files', {
      query_embedding: queryEmbedding,
      match_count: 10,
      match_threshold: threshold
    });

  if (gitError) {
    console.error('❌ match_git_files error:', gitError);
  } else {
    console.log(`git table (match_git_files): ${gitData?.length || 0} results`);
    if (gitData && gitData.length > 0) {
      const avgSim = gitData.reduce((sum: number, r: any) => sum + (r.similarity || 0), 0) / gitData.length;
      console.log(`  Top similarity: ${(gitData[0].similarity || 0).toFixed(3)}`);
      console.log(`  Avg similarity: ${avgSim.toFixed(3)}`);
      console.log(`  First result: ${gitData[0].file_path.slice(0, 80)}...`);
    }
  }
}

console.log('\n✅ Threshold testing complete');
