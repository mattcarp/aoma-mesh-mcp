import { validateAndLoadEnvironment } from './src/config/environment.js';
import { SupabaseService } from './src/services/supabase.service.js';

const config = validateAndLoadEnvironment();
console.log('✅ Environment loaded');
console.log('SUPABASE_URL:', config.SUPABASE_URL ? 'Present' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', config.SUPABASE_SERVICE_ROLE_KEY ? 'Present' : 'Missing');

const supabase = new SupabaseService(config);
console.log('✅ Supabase service created');
console.log('Client exists:', supabase.client ? 'Yes' : 'No');

// Test a simple query
try {
  const { data, error } = await supabase.client.from('aoma_unified_vectors').select('id').limit(1);
  if (error) {
    console.error('❌ Supabase query error:', error);
  } else {
    console.log('✅ Supabase query successful, rows:', data?.length || 0);
  }
} catch (e) {
  console.error('❌ Supabase query exception:', e);
  console.error('Exception details:', JSON.stringify(e, null, 2));
}
