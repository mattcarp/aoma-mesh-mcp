import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { config } from 'dotenv';

/**
 * Set Up UAT Test Results Schema in Supabase
 * 
 * Executes the comprehensive schema for storing
 * 319-test suite results with UAT marking
 */

config(); // Load environment variables

class SupabaseUATSchemaSetup {
  private supabase: any;
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  async setupSchema(): Promise<void> {
    console.log('🗄️ Setting up UAT Test Results Schema in Supabase...');
    
    try {
      // Read the schema SQL file
      const schemaSQL = await readFile('setup-uat-test-results-schema.sql', 'utf-8');
      
      console.log('📜 Executing schema SQL...');
      
      // Execute the schema
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: schemaSQL
      });
      
      if (error) {
        console.error('❌ Schema execution failed:', error);
        throw error;
      }
      
      console.log('✅ Schema executed successfully!');
      
      // Verify tables were created
      await this.verifySchema();
      
    } catch (error) {
      console.error('❌ Schema setup failed:', error);
      throw error;
    }
  }
  
  private async verifySchema(): Promise<void> {
    console.log('🔍 Verifying schema setup...');
    
    const tablesToCheck = [
      'uat_test_sessions',
      'uat_test_suites', 
      'uat_test_results',
      'uat_test_execution_details'
    ];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .limit(1);
          
        if (error && !error.message.includes('0 rows')) {
          console.warn(`⚠️ Issue with table ${table}:`, error);
        } else {
          console.log(`✅ Table ${table} verified`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not verify table ${table}:`, error);
      }
    }
  }
  
  async createTestSession(sessionName: string = 'Comprehensive UAT Suite - Night Run'): Promise<string> {
    console.log(`🎯 Creating test session: ${sessionName}`);
    
    try {
      const { data, error } = await this.supabase
        .from('uat_test_sessions')
        .insert([
          {
            session_name: sessionName,
            environment: 'UAT',
            jira_version: '10.3.6',
            framework_version: 'Enhanced Session Manager v1.0',
            session_metadata: {
              execution_type: 'comprehensive_night_run',
              total_planned_tests: 319,
              execution_phases: 4,
              launched_by: 'automated_framework'
            }
          }
        ])
        .select()
        .single();
        
      if (error) {
        console.error('❌ Failed to create test session:', error);
        throw error;
      }
      
      console.log(`✅ Test session created with ID: ${data.id}`);
      return data.id;
      
    } catch (error) {
      console.error('❌ Test session creation failed:', error);
      throw error;
    }
  }
  
  async getSessionSummary(sessionId?: string): Promise<void> {
    console.log('📊 Retrieving session summary...');
    
    try {
      let query = this.supabase
        .from('v_uat_session_summary')
        .select('*')
        .order('started_at', { ascending: false });
        
      if (sessionId) {
        query = query.eq('id', sessionId);
      } else {
        query = query.limit(5);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Failed to retrieve session summary:', error);
        return;
      }
      
      console.log('\n📋 Session Summary:');
      data?.forEach((session: any) => {
        console.log(`
🎯 Session: ${session.session_name}
   ID: ${session.id}
   Environment: ${session.environment}
   Status: ${session.status}
   Started: ${session.started_at}
   Duration: ${session.duration_minutes} minutes
   Tests: ${session.total_tests} (${session.success_rate}% success)
   Framework: ${session.framework_version}
        `);
      });
      
    } catch (error) {
      console.error('❌ Failed to get session summary:', error);
    }
  }
}

// Export for use in other scripts
export { SupabaseUATSchemaSetup };

// Run if called directly
if (require.main === module) {
  const setup = new SupabaseUATSchemaSetup();
  
  setup.setupSchema()
    .then(() => setup.createTestSession())
    .then(() => setup.getSessionSummary())
    .then(() => console.log('\n🎉 Supabase UAT schema setup complete!'))
    .catch(console.error);
} 