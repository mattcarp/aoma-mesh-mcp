#!/usr/bin/env tsx
/**
 * Comprehensive Jira Functionality Test
 * 
 * Tests the Jira search functionality in the MCP server to identify and fix issues
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.local') });
config({ path: join(__dirname, '..', '.env') });

interface JiraTestResult {
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message: string;
  data?: any;
  error?: any;
}

class JiraFunctionalityTester {
  private supabaseClient: any;
  private results: JiraTestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Comprehensive Jira Functionality Tests...\n');

    // Test 1: Environment Variables
    await this.testEnvironmentVariables();

    // Test 2: Supabase Connection
    await this.testSupabaseConnection();

    // Test 3: Jira Tables Existence
    await this.testJiraTablesExistence();

    // Test 4: Vector Search Function
    await this.testVectorSearchFunction();

    // Test 5: Sample Data Retrieval
    await this.testSampleDataRetrieval();

    // Test 6: Jira Search Query
    await this.testJiraSearchQuery();

    // Test 7: Enhanced Jira Agent Import
    await this.testEnhancedJiraAgentImport();

    // Test 8: MCP Server Integration
    await this.testMCPServerIntegration();

    // Print Results
    this.printResults();
  }

  private async testEnvironmentVariables(): Promise<void> {
    console.log('1. Testing Environment Variables...');
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'OPENAI_API_KEY'
    ];

    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length === 0) {
      this.results.push({
        test: 'Environment Variables',
        status: 'pass',
        message: 'All required environment variables are present'
      });
      console.log('✅ All required environment variables found');
      console.log(`   SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30)}...`);
      console.log(`   SERVICE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 30)}...`);
    } else {
      this.results.push({
        test: 'Environment Variables',
        status: 'fail',
        message: `Missing variables: ${missing.join(', ')}`,
        error: missing
      });
      console.log(`❌ Missing variables: ${missing.join(', ')}`);
    }
    console.log();
  }

  private async testSupabaseConnection(): Promise<void> {
    console.log('2. Testing Supabase Connection...');
    
    try {
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.results.push({
          test: 'Supabase Connection',
          status: 'skip',
          message: 'Skipped - missing environment variables'
        });
        console.log('⏭️ Skipped - missing environment variables');
        console.log();
        return;
      }

      this.supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false } }
      );

      // Test basic query
      const { data, error } = await this.supabaseClient
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        throw error;
      }

      this.results.push({
        test: 'Supabase Connection',
        status: 'pass',
        message: 'Successfully connected to Supabase'
      });
      console.log('✅ Successfully connected to Supabase');
    } catch (error) {
      this.results.push({
        test: 'Supabase Connection',
        status: 'fail',
        message: 'Failed to connect to Supabase',
        error
      });
      console.log('❌ Failed to connect to Supabase:', error);
    }
    console.log();
  }

  private async testJiraTablesExistence(): Promise<void> {
    console.log('3. Testing Jira Tables Existence...');
    
    if (!this.supabaseClient) {
      this.results.push({
        test: 'Jira Tables Existence',
        status: 'skip',
        message: 'Skipped - no Supabase connection'
      });
      console.log('⏭️ Skipped - no Supabase connection');
      console.log();
      return;
    }

    try {
      // Check if jira_ticket_embeddings table exists
      const { data, error } = await this.supabaseClient
        .from('jira_ticket_embeddings')
        .select('count')
        .limit(1);

      if (error) {
        // Check if it's a table not found error
        if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
          this.results.push({
            test: 'Jira Tables Existence',
            status: 'fail',
            message: 'jira_ticket_embeddings table does not exist',
            error
          });
          console.log('❌ jira_ticket_embeddings table does not exist');
        } else {
          throw error;
        }
      } else {
        this.results.push({
          test: 'Jira Tables Existence',
          status: 'pass',
          message: 'jira_ticket_embeddings table exists'
        });
        console.log('✅ jira_ticket_embeddings table exists');
      }
    } catch (error) {
      this.results.push({
        test: 'Jira Tables Existence',
        status: 'fail',
        message: 'Error checking table existence',
        error
      });
      console.log('❌ Error checking table existence:', error);
    }
    console.log();
  }

  private async testVectorSearchFunction(): Promise<void> {
    console.log('4. Testing Vector Search Function...');
    
    if (!this.supabaseClient) {
      this.results.push({
        test: 'Vector Search Function',
        status: 'skip',
        message: 'Skipped - no Supabase connection'
      });
      console.log('⏭️ Skipped - no Supabase connection');
      console.log();
      return;
    }

    try {
      // Test the match_jira_tickets function
      const { data, error } = await this.supabaseClient.rpc('match_jira_tickets', {
        query_embedding: new Array(1536).fill(0), // Dummy embedding
        match_threshold: 0.1,
        match_count: 1
      });

      if (error) {
        // Check if it's a function not found error
        if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
          this.results.push({
            test: 'Vector Search Function',
            status: 'fail',
            message: 'match_jira_tickets function does not exist',
            error
          });
          console.log('❌ match_jira_tickets function does not exist');
        } else {
          throw error;
        }
      } else {
        this.results.push({
          test: 'Vector Search Function',
          status: 'pass',
          message: 'match_jira_tickets function exists and callable',
          data: data?.length || 0
        });
        console.log(`✅ match_jira_tickets function works (returned ${data?.length || 0} results)`);
      }
    } catch (error) {
      this.results.push({
        test: 'Vector Search Function',
        status: 'fail',
        message: 'Error testing vector search function',
        error
      });
      console.log('❌ Error testing vector search function:', error);
    }
    console.log();
  }

  private async testSampleDataRetrieval(): Promise<void> {
    console.log('5. Testing Sample Data Retrieval...');
    
    if (!this.supabaseClient) {
      this.results.push({
        test: 'Sample Data Retrieval',
        status: 'skip',
        message: 'Skipped - no Supabase connection'
      });
      console.log('⏭️ Skipped - no Supabase connection');
      console.log();
      return;
    }

    try {
      // Try to get sample data from jira_ticket_embeddings
      const { data, error } = await this.supabaseClient
        .from('jira_ticket_embeddings')
        .select('*')
        .limit(3);

      if (error) {
        this.results.push({
          test: 'Sample Data Retrieval',
          status: 'fail',
          message: 'Failed to retrieve sample data',
          error
        });
        console.log('❌ Failed to retrieve sample data:', error);
      } else {
        this.results.push({
          test: 'Sample Data Retrieval',
          status: 'pass',
          message: `Retrieved ${data?.length || 0} sample records`,
          data: data?.length || 0
        });
        console.log(`✅ Retrieved ${data?.length || 0} sample records`);
        if (data && data.length > 0) {
          console.log('Sample record keys:', Object.keys(data[0]));
        }
      }
    } catch (error) {
      this.results.push({
        test: 'Sample Data Retrieval',
        status: 'fail',
        message: 'Error retrieving sample data',
        error
      });
      console.log('❌ Error retrieving sample data:', error);
    }
    console.log();
  }

  private async testJiraSearchQuery(): Promise<void> {
    console.log('6. Testing Jira Search Query...');
    
    if (!this.supabaseClient) {
      this.results.push({
        test: 'Jira Search Query',
        status: 'skip',
        message: 'Skipped - no Supabase connection'
      });
      console.log('⏭️ Skipped - no Supabase connection');
      console.log();
      return;
    }

    try {
      // Test a semantic search query
      const testQuery = 'authentication login issues';
      
      // This would normally use the OpenAI embeddings API
      // For now, we'll just test the RPC call structure
      const { data, error } = await this.supabaseClient.rpc('match_jira_tickets', {
        query_text: testQuery,
        match_threshold: 0.7,
        match_count: 5
      });

      if (error) {
        this.results.push({
          test: 'Jira Search Query',
          status: 'fail',
          message: 'Failed to execute search query',
          error
        });
        console.log('❌ Failed to execute search query:', error);
      } else {
        this.results.push({
          test: 'Jira Search Query',
          status: 'pass',
          message: `Search query executed successfully (${data?.length || 0} results)`,
          data: data?.length || 0
        });
        console.log(`✅ Search query executed successfully (${data?.length || 0} results)`);
      }
    } catch (error) {
      this.results.push({
        test: 'Jira Search Query',
        status: 'fail',
        message: 'Error executing search query',
        error
      });
      console.log('❌ Error executing search query:', error);
    }
    console.log();
  }

  private async testEnhancedJiraAgentImport(): Promise<void> {
    console.log('7. Testing Enhanced Jira Agent Import...');
    
    try {
      const module = await import('../src/lib/agents/langgraph/enhanced-jira-agent.js');
      const { EnhancedJiraAgent } = module;
      
      if (EnhancedJiraAgent) {
        this.results.push({
          test: 'Enhanced Jira Agent Import',
          status: 'pass',
          message: 'Successfully imported EnhancedJiraAgent'
        });
        console.log('✅ Successfully imported EnhancedJiraAgent');
      } else {
        this.results.push({
          test: 'Enhanced Jira Agent Import',
          status: 'fail',
          message: 'EnhancedJiraAgent not found in module'
        });
        console.log('❌ EnhancedJiraAgent not found in module');
      }
    } catch (error) {
      this.results.push({
        test: 'Enhanced Jira Agent Import',
        status: 'fail',
        message: 'Failed to import EnhancedJiraAgent',
        error
      });
      console.log('❌ Failed to import EnhancedJiraAgent:', error);
    }
    console.log();
  }

  private async testMCPServerIntegration(): Promise<void> {
    console.log('8. Testing MCP Server Integration...');
    
    try {
      // Test importing the agent server
      const { AgentServer } = await import('./src/agent-server.js');
      
      if (AgentServer) {
        const server = new AgentServer();
        const tools = server.getToolDefinitions();
        
        const jiraTools = tools.filter(tool => 
          tool.name.includes('jira') || 
          tool.description.toLowerCase().includes('jira')
        );
        
        this.results.push({
          test: 'MCP Server Integration',
          status: 'pass',
          message: `MCP Server loaded with ${jiraTools.length} Jira-related tools`,
          data: jiraTools.map(t => t.name)
        });
        console.log(`✅ MCP Server loaded with ${jiraTools.length} Jira-related tools:`);
        jiraTools.forEach(tool => console.log(`   - ${tool.name}: ${tool.description}`));
      } else {
        this.results.push({
          test: 'MCP Server Integration',
          status: 'fail',
          message: 'AgentServer not found in module'
        });
        console.log('❌ AgentServer not found in module');
      }
    } catch (error) {
      this.results.push({
        test: 'MCP Server Integration',
        status: 'fail',
        message: 'Failed to test MCP Server integration',
        error
      });
      console.log('❌ Failed to test MCP Server integration:', error);
    }
    console.log();
  }

  private printResults(): void {
    console.log('📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const skipped = this.results.filter(r => r.status === 'skip').length;
    
    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : 
                   result.status === 'fail' ? '❌' : 
                   '⏭️';
      console.log(`${icon} ${result.test}: ${result.message}`);
      if (result.error && result.status === 'fail') {
        console.log(`   Error: ${result.error.message || result.error}`);
      }
      if (result.data) {
        console.log(`   Data: ${JSON.stringify(result.data)}`);
      }
    });
    
    console.log('=' .repeat(50));
    console.log(`📈 Summary: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    
    if (failed > 0) {
      console.log('\n🔧 Recommended Actions:');
      this.results.filter(r => r.status === 'fail').forEach(result => {
        console.log(`- Fix ${result.test}: ${result.message}`);
      });
    }
  }
}

// Run the tests
const tester = new JiraFunctionalityTester();
tester.runAllTests().catch(console.error);