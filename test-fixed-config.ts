#!/usr/bin/env tsx
/**
 * Test Fixed Supabase Configuration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '../.env.local' });

async function testFixedConfig() {
  console.log('🧪 Testing fixed Supabase configuration...');
  
  // Test BETABASE connection
  const betabaseClient = createClient(
    process.env.NEXT_PUBLIC_BETABASE_SUPABASE_URL!,
    process.env.BETABASE_SUPABASE_KEY!
  );
  
  try {
    // Test basic connection
    const { data, error } = await betabaseClient.from('auth.users').select('count').limit(1);
    
    if (error && error.code !== '42P01') {
      console.log('❌ BETABASE connection failed:', error);
    } else {
      console.log('✅ BETABASE connection working');
      
      // Test if we can create a simple Jira table for testing
      console.log('Creating test Jira table...');
      // Note: This would require database admin privileges
      console.log('(Table creation would need to be done manually in Supabase dashboard)');
    }
  } catch (error) {
    console.log('❌ Connection test failed:', error);
  }
}

testFixedConfig().catch(console.error);
