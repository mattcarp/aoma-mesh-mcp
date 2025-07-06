/**
 * Standalone AOMA MCP Server
 * 
 * Self-contained implementation that connects to real AOMA infrastructure
 * without complex module dependencies that cause build issues.
 */

import { 
  Tool, 
  Resource, 
  CallToolResult, 
  ReadResourceResult,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { agentMeshMCPIntegration } from '../../src/lib/agents/mesh/mcp-integration.js';

interface VectorSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  url?: string;
  crawled_at?: string;
}

/**
 * Standalone AOMA Agent Server
 */
export class StandaloneAOMAServer {
  private openaiClient: OpenAI;
  private supabaseClient: any;
  private aomaAssistantId: string;
  private vectorStoreId: string;

  async initialize(): Promise<void> {
    console.error('🚀 Initializing Standalone AOMA MCP Server with real infrastructure...');
    
    try {
      // Check if running in Claude Desktop (environment variables provided)
      if (process.env.OPENAI_API_KEY && process.env.AOMA_ASSISTANT_ID) {
        console.error('📁 Using provided environment variables (Claude Desktop mode)');
      } else {
        // Load environment variables from files
        await this.loadDotenv();
      }
      
      await this.loadEnvironment();
      await this.initializeClients();
      console.error('✅ Standalone AOMA MCP Server initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Standalone AOMA MCP Server:', error);
      throw error;
    }
  }

  private async loadDotenv(): Promise<void> {
    try {
      const dotenv = await import('dotenv');
      dotenv.config({ path: '.env' });
      dotenv.config({ path: '../.env.local' });
      console.error('📁 Environment variables loaded from files');
    } catch (error) {
      console.error('⚠️ Could not load dotenv:', error);
    }
  }

  private async loadEnvironment(): Promise<void> {
    const required = [
      'OPENAI_API_KEY',
      'AOMA_ASSISTANT_ID', 
      'OPENAI_VECTOR_STORE_ID'
    ];
    
    // Only require Supabase if not explicitly disabled
    if (!process.env.SUPABASE_DISABLED) {
      required.push('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    this.aomaAssistantId = process.env.AOMA_ASSISTANT_ID!;
    this.vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID!;
    
    console.error(`📋 AOMA Assistant ID: ${this.aomaAssistantId.slice(0, 15)}...`);
    console.error(`🗂️ Vector Store ID: ${this.vectorStoreId.slice(0, 15)}...`);
    
    if (process.env.SUPABASE_DISABLED) {
      console.error('⚠️ Supabase vector search disabled - operating in limited mode');
    }
  }

  private async initializeClients(): Promise<void> {
    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
    
    // Initialize Supabase client only if not disabled
    if (!process.env.SUPABASE_DISABLED) {
      this.supabaseClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { persistSession: false }
        }
      );
      console.error('🔗 OpenAI and Supabase clients connected');
    } else {
      console.error('🔗 OpenAI client connected (Supabase disabled)');
    }
  }

  /**
   * Get tool definitions for MCP
   */
  getToolDefinitions(): Tool[] {
    // Get mesh tools
    const meshTools = agentMeshMCPIntegration.getToolDefinitions();
    
    // Combine with existing tools
    return [
      ...meshTools,
      {
        name: 'query_aoma_assistant',
        description: 'Query the AOMA Assistant with attached vector store for operational knowledge',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about AOMA operations, procedures, or technical details'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_aoma_knowledge',
        description: 'Direct vector search in AOMA knowledge base (Supabase)',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Search query for AOMA documentation and procedures'
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              description: 'Maximum number of results',
              default: 5
            },
            threshold: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Similarity threshold (0-1)',
              default: 0.3
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_jira_tickets',
        description: 'Search Jira tickets using vector similarity',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about Jira tickets'
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              description: 'Maximum number of tickets to return',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_system_status',
        description: 'Get the status of AOMA infrastructure connections',
        inputSchema: {
          type: 'object' as const,
          properties: {}
        }
      },
      {
        name: 'review_code',
        description: 'Perform comprehensive code review with security, performance, and quality analysis',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'Natural language description of what to review'
            },
            filePath: {
              type: 'string',
              description: 'Path to specific file to review (optional)'
            },
            repositoryPath: {
              type: 'string',
              description: 'Path to repository for comprehensive review (optional)'
            },
            gitDiff: {
              type: 'string',
              description: 'Git diff content to analyze (optional)'
            },
            reviewTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['security', 'performance', 'quality', 'best_practices', 'accessibility', 'testing', 'documentation', 'dependencies', 'architecture', 'aoma_standards']
              },
              description: 'Types of review to perform',
              default: ['security', 'performance', 'quality']
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Minimum severity level to report',
              default: 'medium'
            },
            includeAOMAStandards: {
              type: 'boolean',
              description: 'Apply AOMA-specific coding standards',
              default: true
            }
          },
          required: ['query']
        }
      },
      {
        name: 'analyze_git_diff',
        description: 'Analyze Git diff for code changes and potential issues',
        inputSchema: {
          type: 'object' as const,
          properties: {
            repositoryPath: {
              type: 'string',
              description: 'Path to the Git repository'
            },
            diffContent: {
              type: 'string',
              description: 'Git diff content to analyze (optional - will generate if not provided)'
            },
            baseCommit: {
              type: 'string',
              description: 'Base commit for diff comparison (optional, defaults to HEAD~1)'
            },
            focusAreas: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['security', 'performance', 'breaking_changes', 'test_coverage']
              },
              description: 'Specific areas to focus the analysis on',
              default: ['security', 'breaking_changes']
            }
          },
          required: ['repositoryPath']
        }
      },
      {
        name: 'suggest_code_improvements',
        description: 'Suggest specific code improvements and optimizations',
        inputSchema: {
          type: 'object' as const,
          properties: {
            codeContent: {
              type: 'string',
              description: 'Code content to analyze'
            },
            filePath: {
              type: 'string',
              description: 'File path for context'
            },
            language: {
              type: 'string',
              description: 'Programming language (auto-detected if not provided)'
            },
            improvementTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['performance', 'readability', 'maintainability', 'security', 'testing']
              },
              description: 'Types of improvements to suggest',
              default: ['performance', 'readability', 'maintainability']
            },
            includeRefactoring: {
              type: 'boolean',
              description: 'Include refactoring suggestions',
              default: true
            }
          },
          required: ['codeContent']
        }
      }
    ];
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      // Check if this is a mesh tool
      const meshToolNames = [
        'query_agent_mesh', 'get_mesh_status', 'get_agent_capabilities',
        'create_workflow', 'execute_workflow', 'get_workflow_status',
        'agent_collaboration', 'agent_consensus', 'mesh_health_check',
        'get_mesh_statistics', 'reconfigure_mesh'
      ];
      
      if (meshToolNames.includes(name)) {
        const result = await agentMeshMCPIntegration.handleToolCall(name, args);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
      
      // Handle existing tools
      switch (name) {
        case 'query_aoma_assistant':
          return await this.queryAOMAAssistant(args);
        case 'search_aoma_knowledge':
          return await this.searchAOMAKnowledge(args);
        case 'search_jira_tickets':
          return await this.searchJiraTickets(args);
        case 'get_system_status':
          return await this.getSystemStatus(args);
        case 'review_code':
          return await this.reviewCode(args);
        case 'analyze_git_diff':
          return await this.analyzeGitDiff(args);
        case 'suggest_code_improvements':
          return await this.suggestCodeImprovements(args);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Error calling tool ${name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute tool ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Query the AOMA Assistant with vector store
   */
  private async queryAOMAAssistant(args: any): Promise<CallToolResult> {
    const { query } = args;
    
    try {
      console.error(`🤖 Querying AOMA Assistant: "${query}"`);
      
      // Create a thread
      const thread = await this.openaiClient.beta.threads.create();
      
      // Add message with knowledge base instruction
      const messageContent = `${query}\n\nPlease use the knowledge base to answer this question with specific information about AOMA or USM. Include relevant details from the vector database rather than providing generic information.`;
      
      await this.openaiClient.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: messageContent
      });
      
      // Run the assistant
      const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
        assistant_id: this.aomaAssistantId
      });
      
      // Wait for completion
      let runStatus = await this.openaiClient.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30;
      
      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openaiClient.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }
      
      if (runStatus.status === 'completed') {
        const messages = await this.openaiClient.beta.threads.messages.list(thread.id);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const response = assistantMessage.content[0].text.value;
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                success: true,
                query,
                response,
                assistantId: this.aomaAssistantId,
                threadId: thread.id,
                source: 'AOMA Assistant with Vector Store'
              }, null, 2)
            }]
          };
        }
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: `Assistant run failed with status: ${runStatus.status}`,
            runStatus: runStatus.status
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error querying AOMA Assistant:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Search AOMA knowledge base directly
   */
  private async searchAOMAKnowledge(args: any): Promise<CallToolResult> {
    const { query, maxResults = 5, threshold = 0.3 } = args;
    
    // Check if Supabase is disabled
    if (process.env.SUPABASE_DISABLED) {
      console.error('⚠️ Vector search unavailable - Supabase disabled');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: 'Vector search temporarily unavailable - Supabase connection disabled. Try using the AOMA Assistant instead.',
            suggestion: 'Use the query_aoma_assistant tool for knowledge queries.'
          }, null, 2)
        }]
      };
    }
    
    try {
      console.error(`🔍 Searching AOMA knowledge: "${query}"`);
      
      // Generate embedding
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Search using Supabase function
      const { data, error } = await this.supabaseClient.rpc('match_wiki_documents', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: maxResults
      });
      
      if (error) {
        console.error('❌ Supabase search error:', error);
        throw error;
      }
      
      const results: VectorSearchResult[] = data?.map((item: any) => ({
        id: item.id,
        title: item.title || 'AOMA Document',
        content: item.markdown_content || item.content || '',
        similarity: item.similarity || 0,
        url: item.url,
        crawled_at: item.crawled_at
      })) || [];
      
      console.error(`✅ Found ${results.length} knowledge base results`);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            query,
            threshold,
            maxResults,
            found: results.length,
            results,
            source: 'AOMA Supabase Vector Database'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error searching AOMA knowledge:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Search Jira tickets
   */
  private async searchJiraTickets(args: any): Promise<CallToolResult> {
    const { query, maxResults = 10 } = args;
    
    // Check if Supabase is disabled
    if (process.env.SUPABASE_DISABLED) {
      console.error('⚠️ JIRA search unavailable - Supabase disabled');
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: 'JIRA ticket search temporarily unavailable - Supabase connection disabled.',
            suggestion: 'Try using the enhanced JIRA agent through the Agent Mesh instead.',
            alternative: 'Use the query_agent_mesh tool with JIRA-related queries.'
          }, null, 2)
        }]
      };
    }
    
    try {
      console.error(`🎫 Searching Jira tickets: "${query}"`);
      
      // Generate embedding
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Search Jira tickets
      const { data, error } = await this.supabaseClient.rpc('match_jira_tickets', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: maxResults
      });
      
      if (error) {
        console.error('❌ Jira search error:', error);
        throw error;
      }
      
      console.error(`✅ Found ${data?.length || 0} Jira tickets`);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            query,
            maxResults,
            found: data?.length || 0,
            tickets: data || [],
            source: 'Jira Vector Database'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error searching Jira tickets:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Get system status
   */
  private async getSystemStatus(args: any): Promise<CallToolResult> {
    try {
      console.error('📊 Checking system status...');
      
      // Test OpenAI connection
      let openaiStatus = 'disconnected';
      try {
        await this.openaiClient.models.list();
        openaiStatus = 'connected';
      } catch (error) {
        console.error('OpenAI connection test failed:', error);
      }
      
      // Test Supabase connection
      let supabaseStatus = 'disabled';
      if (!process.env.SUPABASE_DISABLED) {
        supabaseStatus = 'disconnected';
        try {
          const { data, error } = await this.supabaseClient.from('wiki_documents').select('id').limit(1);
          if (!error) {
            supabaseStatus = 'connected';
          } else {
            console.error('Supabase connection error:', error);
          }
        } catch (error) {
          console.error('Supabase connection test failed:', error);
        }
      }
      
      // Test AOMA Assistant
      let assistantStatus = 'unknown';
      try {
        const assistant = await this.openaiClient.beta.assistants.retrieve(this.aomaAssistantId);
        assistantStatus = assistant ? 'available' : 'not found';
      } catch (error) {
        assistantStatus = 'error';
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'unknown',
            connections: {
              openai: openaiStatus,
              supabase: supabaseStatus,
              aomaAssistant: assistantStatus
            },
            configuration: {
              aomaAssistantId: this.aomaAssistantId,
              vectorStoreId: this.vectorStoreId,
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
            }
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error checking system status:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Get resource definitions
   */
  getResourceTemplates(): Resource[] {
    return [
      {
        uri: 'aoma://status',
        name: 'AOMA System Status',
        mimeType: 'application/json',
        description: 'Current status of AOMA infrastructure connections'
      }
    ];
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    try {
      if (uri === 'aoma://status') {
        const statusResult = await this.getSystemStatus({});
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: statusResult.content[0].text
          }]
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    } catch (error) {
      console.error(`❌ Error reading resource ${uri}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Perform comprehensive code review
   */
  private async reviewCode(args: any): Promise<CallToolResult> {
    const { 
      query, 
      filePath, 
      repositoryPath, 
      gitDiff, 
      reviewTypes = ['security', 'performance', 'quality'], 
      severity = 'medium',
      includeAOMAStandards = true 
    } = args;
    
    try {
      console.error(`🔍 Performing code review: "${query}"`);
      
      // Try to import and use the real Code Review Agent
      try {
        const module = await import('../../src/lib/agents/langgraph/code-review-agent-simple.js');
        const { CodeReviewAgent } = module;
        
        const reviewAgent = new CodeReviewAgent({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o',
          temperature: 0.1
        });
        
        const result = await reviewAgent.reviewCode({
          query,
          filePath,
          repositoryPath,
          gitDiff,
          reviewType: reviewTypes,
          severity,
          includeAOMAStandards
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              query,
              findings: result.findings,
              metrics: result.metrics,
              summary: result.summary,
              recommendations: result.recommendations,
              response: result.response,
              source: 'Code Review Agent (Real)'
            }, null, 2)
          }]
        };
        
      } catch (importError) {
        console.error('Could not load Code Review Agent, using fallback analysis:', importError);
        
        // Fallback: Basic code analysis using OpenAI directly
        const analysisResult = await this.performBasicCodeAnalysis(query, filePath, repositoryPath);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              query,
              analysis: analysisResult,
              source: 'Basic Code Analysis (Fallback)',
              note: 'Real Code Review Agent not available, using simplified analysis'
            }, null, 2)
          }]
        };
      }
      
    } catch (error) {
      console.error('❌ Error in code review:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Code Review Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Analyze Git diff for changes and issues
   */
  private async analyzeGitDiff(args: any): Promise<CallToolResult> {
    const { 
      repositoryPath, 
      diffContent, 
      baseCommit = 'HEAD~1', 
      focusAreas = ['security', 'breaking_changes'] 
    } = args;
    
    try {
      console.error(`📊 Analyzing Git diff in: ${repositoryPath}`);
      
      // Get or use provided diff content
      let actualDiffContent = diffContent;
      if (!actualDiffContent && repositoryPath) {
        const { execSync } = await import('child_process');
        actualDiffContent = execSync(`git diff ${baseCommit}`, { 
          cwd: repositoryPath, 
          encoding: 'utf-8' 
        });
      }
      
      if (!actualDiffContent) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'No diff content available',
              repositoryPath
            }, null, 2)
          }]
        };
      }
      
      // Analyze the diff using OpenAI
      const analysisPrompt = `Analyze this Git diff for potential issues and improvements:

Focus Areas: ${focusAreas.join(', ')}

Git Diff:
\`\`\`
${actualDiffContent.slice(0, 5000)} ${actualDiffContent.length > 5000 ? '...[truncated]' : ''}
\`\`\`

Please provide:
1. Summary of changes
2. Potential security concerns
3. Breaking changes identified
4. Performance implications
5. Code quality observations
6. Recommendations

Format as structured analysis.`;

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a senior code reviewer. Analyze the provided Git diff and provide comprehensive feedback focusing on the specified areas.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1
      });
      
      const analysis = response.choices[0]?.message?.content || 'No analysis generated';
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            repositoryPath,
            baseCommit,
            focusAreas,
            diffStats: {
              length: actualDiffContent.length,
              lines: actualDiffContent.split('\n').length
            },
            analysis,
            source: 'Git Diff Analysis'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error analyzing Git diff:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            repositoryPath,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Git Diff Analysis Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Suggest code improvements and optimizations
   */
  private async suggestCodeImprovements(args: any): Promise<CallToolResult> {
    const { 
      codeContent, 
      filePath, 
      language, 
      improvementTypes = ['performance', 'readability', 'maintainability'],
      includeRefactoring = true 
    } = args;
    
    try {
      console.error(`💡 Suggesting improvements for: ${filePath || 'code snippet'}`);
      
      // Detect language if not provided
      const detectedLanguage = language || this.detectLanguageFromPath(filePath) || 'text';
      
      const improvementPrompt = `Analyze this ${detectedLanguage} code and suggest improvements:

File: ${filePath || 'code snippet'}
Improvement Types: ${improvementTypes.join(', ')}
Include Refactoring: ${includeRefactoring}

Code:
\`\`\`${detectedLanguage}
${codeContent.slice(0, 8000)}${codeContent.length > 8000 ? '...[truncated]' : ''}
\`\`\`

Please provide:
1. Performance optimizations
2. Readability improvements  
3. Maintainability enhancements
4. Security considerations
5. Best practice recommendations
${includeRefactoring ? '6. Refactoring suggestions with code examples' : ''}

Focus on actionable, specific suggestions with explanations.`;

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a senior software engineer and code reviewer. Provide specific, actionable code improvement suggestions with clear explanations and examples.'
          },
          {
            role: 'user',
            content: improvementPrompt
          }
        ],
        temperature: 0.1
      });
      
      const suggestions = response.choices[0]?.message?.content || 'No suggestions generated';
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            filePath,
            language: detectedLanguage,
            improvementTypes,
            includeRefactoring,
            codeStats: {
              length: codeContent.length,
              lines: codeContent.split('\n').length
            },
            suggestions,
            source: 'Code Improvement Suggestions'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('❌ Error suggesting code improvements:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            filePath,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Code Improvement Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Fallback method for basic code analysis
   */
  private async performBasicCodeAnalysis(query: string, filePath?: string, repositoryPath?: string): Promise<string> {
    try {
      let codeContent = '';
      
      if (filePath) {
        const fs = await import('fs');
        codeContent = fs.readFileSync(filePath, 'utf-8');
      } else if (repositoryPath) {
        // Analyze a few key files from the repository
        const fs = await import('fs');
        const path = await import('path');
        
        const keyFiles = ['package.json', 'tsconfig.json', 'README.md'];
        const foundFiles = keyFiles
          .map(file => path.join(repositoryPath, file))
          .filter(file => fs.existsSync(file));
        
        if (foundFiles.length > 0) {
          codeContent = foundFiles
            .map(file => `// ${file}\n${fs.readFileSync(file, 'utf-8')}`)
            .join('\n\n');
        }
      }
      
      const analysisPrompt = `Perform a code review analysis based on this request: "${query}"

${codeContent ? `Code Content:\n\`\`\`\n${codeContent.slice(0, 4000)}${codeContent.length > 4000 ? '...[truncated]' : ''}\n\`\`\`` : 'No specific code content provided.'}

Please provide:
1. General observations about code quality
2. Potential security concerns
3. Performance considerations
4. Best practice recommendations
5. Maintainability suggestions

Focus on actionable insights and specific recommendations.`;

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a senior code reviewer. Provide comprehensive analysis and actionable recommendations.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.1
      });
      
      return response.choices[0]?.message?.content || 'No analysis generated';
      
    } catch (error) {
      console.error('Error in basic code analysis:', error);
      return `Error performing code analysis: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguageFromPath(filePath?: string): string | null {
    if (!filePath) return null;
    
    // Extract file extension manually
    const lastDotIndex = filePath.lastIndexOf('.');
    const ext = lastDotIndex > 0 ? filePath.substring(lastDotIndex).toLowerCase() : '';
    
    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.go': 'go',
      '.rs': 'rust',
      '.php': 'php',
      '.rb': 'ruby',
      '.css': 'css',
      '.scss': 'scss',
      '.html': 'html',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml'
    };
    
    return languageMap[ext] || null;
  }
}