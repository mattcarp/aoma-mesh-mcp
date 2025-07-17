#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

console.log('=== Testing Supabase Connection ===');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service Key:', supabaseKey ? `Set (***${supabaseKey.slice(-4)})` : 'NOT SET');

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('Testing basic Supabase connection...');
  
  // Test a simple query to check connection
  const { data, error } = await supabase
    .from('jira_tickets')
    .select('count')
    .limit(1);
    
  if (error) {
    console.error('❌ Supabase query failed:', error.message);
  } else {
    console.log('✅ Supabase connection successful');
    console.log('Sample query result:', data);
  }
  
} catch (error) {
  console.error('❌ Supabase connection failed:', error.message);
}
