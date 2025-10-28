import { validateAndLoadEnvironment } from './src/config/environment.js';
import { SupabaseService } from './src/services/supabase.service.js';

async function main() {
  const config = validateAndLoadEnvironment();
  const supabase = new SupabaseService(config);

  console.log('Checking git_file_embeddings content...\n');

  // Check for files with content
  const { data, error } = await supabase.client
    .from('git_file_embeddings')
    .select('id, file_path, content')
    .limit(20);

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  let hasContent = 0;
  let noContent = 0;

  data?.forEach((row: any) => {
    if (row.content && row.content.trim().length > 0) {
      hasContent++;
      console.log(`✅ HAS content (${row.content.length} chars): ${row.file_path}`);
    } else {
      noContent++;
      console.log(`❌ NO content: ${row.file_path}`);
    }
  });

  console.log(`\nSample of 20 files: ${hasContent} with content, ${noContent} without`);

  // Get total counts
  const { count: totalCount } = await supabase.client
    .from('git_file_embeddings')
    .select('*', { count: 'exact', head: true });

  console.log(`Total files in database: ${totalCount}`);
}

main().catch(console.error);
