#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';

async function inspectSupabaseFunctions() {
  console.log('🔍 INSPECTING SUPABASE FUNCTION DEFINITIONS');
  console.log('='.repeat(80));

  const supabase = createClient(
    'https://kfxetwuuzljhybfgmpuc.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Get function definitions from information_schema
    console.log('\n🔧 CHECKING FUNCTION DEFINITIONS:');
    
    const { data: functions, error: functionsError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          routine_name,
          routine_type,
          data_type,
          routine_definition
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%match%'
        ORDER BY routine_name;
      `
    });

    if (functionsError) {
      console.log('Error getting function definitions via sql rpc:', functionsError.message);
      
      // Alternative approach - check pg_proc directly
      console.log('\nTrying alternative method...');
      
      const { data: pgFunctions, error: pgError } = await supabase.rpc('sql', {
        query: `
          SELECT 
            p.proname as function_name,
            pg_get_function_arguments(p.oid) as arguments,
            pg_get_function_result(p.oid) as return_type,
            p.prosrc as source_code
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' 
          AND p.proname LIKE '%match%'
          ORDER BY p.proname;
        `
      });

      if (pgError) {
        console.log('❌ Also failed to get pg_proc info:', pgError.message);
      } else {
        console.log('✅ Function definitions from pg_proc:');
        pgFunctions?.forEach((func: any) => {
          console.log(`\n📋 Function: ${func.function_name}`);
          console.log(`   Arguments: ${func.arguments}`);
          console.log(`   Returns: ${func.return_type}`);
          console.log(`   Source: ${func.source_code?.substring(0, 200)}...`);
        });
      }
    } else {
      console.log('✅ Function definitions:');
      functions?.forEach((func: any) => {
        console.log(`\n📋 ${func.routine_name} (${func.routine_type})`);
        console.log(`   Returns: ${func.data_type}`);
        console.log(`   Definition: ${func.routine_definition?.substring(0, 200)}...`);
      });
    }

    // Try to get specific info about the vector column types
    console.log('\n🧬 CHECKING VECTOR COLUMN TYPES:');
    
    const { data: columnInfo, error: columnError } = await supabase.rpc('sql', {
      query: `
        SELECT 
          table_name,
          column_name,
          data_type,
          udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND (column_name LIKE '%embedding%' OR column_name LIKE '%vector%')
        ORDER BY table_name, column_name;
      `
    });

    if (columnError) {
      console.log('❌ Error getting column info:', columnError.message);
    } else {
      console.log('✅ Vector column information:');
      columnInfo?.forEach((col: any) => {
        console.log(`   ${col.table_name}.${col.column_name}: ${col.data_type} (${col.udt_name})`);
      });
    }

    // Test both function variants with proper types
    console.log('\n🧪 TESTING FUNCTION VARIANTS:');
    
    const testEmbedding = new Array(1536).fill(0.1);
    
    // Test with explicit vector type casting
    console.log('\nTesting match_jira_tickets with vector type...');
    try {
      const { data: vectorResult, error: vectorError } = await supabase.rpc('sql', {
        query: `
          SELECT * FROM match_jira_tickets(
            $1::vector, 
            $2::double precision, 
            $3::integer
          ) LIMIT 1;
        `,
        params: [JSON.stringify(testEmbedding), 0.5, 1]
      });
      
      if (vectorError) {
        console.log('❌ Vector type error:', vectorError.message);
      } else {
        console.log('✅ Vector type works!');
      }
    } catch (e) {
      console.log('❌ Vector type exception:', e.message);
    }

    // Test with halfvec type
    console.log('\nTesting match_jira_tickets with halfvec type...');
    try {
      const { data: halfvecResult, error: halfvecError } = await supabase.rpc('sql', {
        query: `
          SELECT * FROM match_jira_tickets(
            $1::halfvec, 
            $2::double precision, 
            $3::integer
          ) LIMIT 1;
        `,
        params: [JSON.stringify(testEmbedding), 0.5, 1]
      });
      
      if (halfvecError) {
        console.log('❌ Halfvec type error:', halfvecError.message);
      } else {
        console.log('✅ Halfvec type works!');
      }
    } catch (e) {
      console.log('❌ Halfvec type exception:', e.message);
    }

  } catch (error) {
    console.error('❌ Overall error:', error);
  }

  console.log('\n' + '='.repeat(80));
}

inspectSupabaseFunctions();
