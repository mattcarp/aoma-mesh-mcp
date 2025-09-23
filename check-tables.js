import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  console.log('🔍 Checking existing Supabase tables...\n');
  
  const tables = [
    'aoma_knowledge',
    'aoma_unified_vectors',
    'confluence_knowledge', 
    'alexandria_knowledge',
    'jira_issues',
    'documents',
    'document_sections'
  ];
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        console.log(`✅ ${table}: ${count || 0} records`);
      }
    } catch (e) {
      // Table doesn't exist
    }
  }
}

checkTables().catch(console.error);