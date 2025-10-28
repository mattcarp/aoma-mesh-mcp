import { validateAndLoadEnvironment } from './src/config/environment.js';
import { SupabaseService } from './src/services/supabase.service.js';

const config = validateAndLoadEnvironment();
const supabase = new SupabaseService(config);

console.log('Checking database contents...\n');

// Check git_file_embeddings table
try {
  const { data: gitData, error: gitError } = await supabase.client
    .from('git_file_embeddings')
    .select('id, repo_path, file_path')
    .limit(5);

  if (gitError) {
    console.error('❌ git_file_embeddings error:', gitError);
  } else {
    console.log(`✅ git_file_embeddings table exists: ${gitData?.length || 0} rows (sample)`);
    if (gitData && gitData.length > 0) {
      console.log('Sample files:');
      gitData.forEach((row: any) => {
        console.log(`  - ${row.file_path} (from ${row.repo_path})`);
      });
    }
  }

  // Get count
  const { count: gitCount, error: gitCountError } = await supabase.client
    .from('git_file_embeddings')
    .select('*', { count: 'exact', head: true });

  if (!gitCountError) {
    console.log(`Total git_file_embeddings rows: ${gitCount}`);
  }
} catch (e) {
  console.error('❌ git_file_embeddings exception:', e);
}

console.log('\n---\n');

// Check aoma_unified_vectors table
try {
  const { data: unifiedData, error: unifiedError } = await supabase.client
    .from('aoma_unified_vectors')
    .select('id, source_type, source_id')
    .limit(5);

  if (unifiedError) {
    console.error('❌ aoma_unified_vectors error:', unifiedError);
  } else {
    console.log(`✅ aoma_unified_vectors table exists: ${unifiedData?.length || 0} rows (sample)`);
    if (unifiedData && unifiedData.length > 0) {
      console.log('Sample entries:');
      unifiedData.forEach((row: any) => {
        console.log(`  - [${row.source_type}] ${row.source_id}`);
      });
    }
  }

  // Get count by source type
  const { data: countData, error: countError } = await supabase.client
    .from('aoma_unified_vectors')
    .select('source_type');

  if (!countError && countData) {
    const counts: Record<string, number> = {};
    countData.forEach((row: any) => {
      counts[row.source_type] = (counts[row.source_type] || 0) + 1;
    });
    console.log('Counts by source_type:', counts);
  }
} catch (e) {
  console.error('❌ aoma_unified_vectors exception:', e);
}

console.log('\n---\n');

// Test the match_git_files function
try {
  console.log('Testing match_git_files function...');

  // Create a simple test embedding (all zeros)
  const testEmbedding = new Array(1536).fill(0);

  const { data: matchData, error: matchError } = await supabase.client
    .rpc('match_git_files', {
      query_embedding: testEmbedding,
      match_count: 5,
      match_threshold: 0.0
    });

  if (matchError) {
    console.error('❌ match_git_files error:', matchError);
  } else {
    console.log(`✅ match_git_files works: ${matchData?.length || 0} results`);
    if (matchData && matchData.length > 0) {
      console.log('Sample results:');
      matchData.slice(0, 3).forEach((row: any) => {
        console.log(`  - ${row.file_path} (similarity: ${row.similarity})`);
      });
    }
  }
} catch (e) {
  console.error('❌ match_git_files exception:', e);
}

console.log('\n✅ Database contents check complete');
