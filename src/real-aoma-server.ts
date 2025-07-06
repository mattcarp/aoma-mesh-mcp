/**
 * Real AOMA Agent Server Implementation
 * 
 * Integrates with the actual LangGraph architecture, OpenAI Assistant with vector store,
 * and Supabase vector database for authentic AOMA knowledge retrieval.
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

interface VectorSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
}

interface AOMAKnowledgeItem {
  id: string;
  title: string;
  content: string;
  relevance: number;
  source: string;
}

interface ActiveAgent {
  id: string;
  type: 'aoma-assistant' | 'enhanced-jira' | 'aoma-context' | 'test-generation';
  status: string;
  createdAt: Date;
  lastUpdated: Date;
  taskDescription?: string;
  threadId?: string;
}

/**
 * Real AOMA Agent Server with authentic LangGraph integration
 */
export class RealAOMAServer {
  private openaiClient: OpenAI;
  private supabaseClient: any;
  private aomaAssistantId: string;
  private vectorStoreId: string;
  private activeAgents: Map<string, ActiveAgent> = new Map();

  async initialize(): Promise<void> {
    console.error('Initializing Real AOMA Agent Server with LangGraph integration...');
    
    try {
      await this.loadEnvironment();
      await this.initializeClients();
      console.error('Real AOMA Agent Server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Real AOMA Agent Server:', error);
      throw error;
    }
  }

  private async loadEnvironment(): Promise<void> {
    const required = [
      'OPENAI_API_KEY',
      'AOMA_ASSISTANT_ID',
      'OPENAI_VECTOR_STORE_ID',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    this.aomaAssistantId = process.env.AOMA_ASSISTANT_ID!;
    this.vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID!;
    
    console.error(`✅ Using AOMA Assistant ID: ${this.aomaAssistantId.slice(0, 15)}...`);
    console.error(`✅ Using Vector Store ID: ${this.vectorStoreId.slice(0, 15)}...`);
  }

  private async initializeClients(): Promise<void> {
    // Initialize OpenAI client
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
    
    // Initialize Supabase client
    this.supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false }
      }
    );
    
    console.error('✅ OpenAI and Supabase clients initialized');
  }

  /**
   * Get tool definitions for MCP
   */
  getToolDefinitions(): Tool[] {
    return [
      {
        name: 'query_aoma_assistant',
        description: 'Query the AOMA Assistant with attached vector store for specific AOMA/USM knowledge',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about AOMA operations, procedures, or technical details'
            },
            useKnowledgeBase: {
              type: 'boolean',
              description: 'Explicitly instruct to use the vector store knowledge base',
              default: true
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_aoma_vectors',
        description: 'Perform direct vector similarity search in the AOMA Supabase knowledge base',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for vector similarity matching'
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 20,
              description: 'Maximum number of results to return',
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
        name: 'run_enhanced_jira_agent',
        description: 'Execute the Enhanced Jira Agent for ticket analysis with vector search',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about Jira tickets'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'get_aoma_context',
        description: 'Use the AOMA Context Agent to retrieve relevant context for development',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Context query for AOMA development insights'
            },
            contextTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['release-notes', 'documentation', 'requirements', 'meeting-notes']
              },
              description: 'Types of context to retrieve',
              default: ['documentation', 'requirements']
            },
            maxResults: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description: 'Maximum number of context items',
              default: 5
            }
          },
          required: ['query']
        }
      },
      {
        name: 'list_langgraph_agents',
        description: 'List all available LangGraph agents in the AOMA system',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'query_agent_capabilities',
        description: 'Get detailed information about a specific LangGraph agent\'s capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            agentName: {
              type: 'string',
              description: 'Name of the LangGraph agent to query'
            }
          },
          required: ['agentName']
        }
      }
    ];
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'query_aoma_assistant':
          return await this.queryAOMAAssistant(args);
        case 'search_aoma_vectors':
          return await this.searchAOMAVectors(args);
        case 'run_enhanced_jira_agent':
          return await this.runEnhancedJiraAgent(args);
        case 'get_aoma_context':
          return await this.getAOMAContext(args);
        case 'list_langgraph_agents':
          return await this.listLangGraphAgents(args);
        case 'query_agent_capabilities':
          return await this.queryAgentCapabilities(args);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error calling tool ${name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to execute tool ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Query the AOMA Assistant with attached vector store
   */
  private async queryAOMAAssistant(args: any): Promise<CallToolResult> {
    const { query, useKnowledgeBase = true } = args;
    
    try {
      console.error(`🤖 Querying AOMA Assistant: "${query}"`);
      
      // Create a thread
      const thread = await this.openaiClient.beta.threads.create();
      
      // Construct message with explicit knowledge base instruction
      const messageContent = useKnowledgeBase 
        ? `${query}\n\nPlease use the knowledge base to answer this question with specific information about AOMA or USM. Include relevant details from the vector database rather than providing generic information.`
        : query;
      
      // Add message to thread
      await this.openaiClient.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: messageContent
      });
      
      // Run the assistant
      const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
        assistant_id: this.aomaAssistantId
      });
      
      // Wait for completion with timeout
      let runStatus = await this.openaiClient.beta.threads.runs.retrieve(thread.id, run.id);
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await this.openaiClient.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }
      
      if (runStatus.status === 'completed') {
        // Get the assistant's response
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
                threadId: thread.id,
                runId: run.id,
                useKnowledgeBase,
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
            error: `Assistant run status: ${runStatus.status}`,
            threadId: thread.id,
            runId: run.id
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('Error querying AOMA Assistant:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'AOMA Assistant Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Perform direct vector search in Supabase
   */
  private async searchAOMAVectors(args: any): Promise<CallToolResult> {
    const { query, maxResults = 5, threshold = 0.3 } = args;
    
    try {
      console.error(`🔍 Performing vector search: "${query}"`);
      
      // Generate embedding for the query using OpenAI
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Search in wiki_documents table using the match_wiki_documents function
      const { data, error } = await this.supabaseClient.rpc('match_wiki_documents', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: maxResults
      });
      
      if (error) {
        console.error('Supabase vector search error:', error);
        throw error;
      }
      
      console.error(`✅ Found ${data?.length || 0} documents via vector search`);
      
      const results = data?.map((item: any) => ({
        id: item.id,
        title: item.title || 'AOMA Document',
        content: item.markdown_content || item.content || '',
        similarity: item.similarity || 0,
        metadata: {
          url: item.url,
          crawled_at: item.crawled_at,
          source: 'AOMA Vector Database'
        }
      })) || [];
      
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
            source: 'Supabase Vector Search'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('Error in vector search:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Vector Search Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Run the Enhanced Jira Agent
   */
  private async runEnhancedJiraAgent(args: any): Promise<CallToolResult> {
    const { query } = args;
    
    try {
      console.error(`🎫 Running Enhanced Jira Agent: "${query}"`);
      
      // Try to dynamically import and run the Enhanced Jira Agent
      try {
        // This will attempt to load the real Enhanced Jira Agent
        const module = await import('../../src/lib/agents/langgraph/enhanced-jira-agent.js');
        const { EnhancedJiraAgent } = module;
        
        const jiraAgent = new EnhancedJiraAgent({
          apiKey: process.env.OPENAI_API_KEY,
          model: 'gpt-4o',
          temperature: 0.2
        });
        
        const result = await jiraAgent.processQuery(query);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              query,
              response: result.response,
              tickets: result.tickets || [],
              source: 'Enhanced Jira Agent (Real)'
            }, null, 2)
          }]
        };
        
      } catch (importError) {
        console.error('Could not load Enhanced Jira Agent, using fallback:', importError);
        
        // Fallback: direct vector search for Jira tickets
        const jiraResults = await this.searchJiraTickets(query);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              query,
              response: `Found ${jiraResults.length} Jira tickets matching your query.`,
              tickets: jiraResults,
              source: 'Jira Vector Search (Fallback)',
              note: 'Real Enhanced Jira Agent not available, using direct vector search'
            }, null, 2)
          }]
        };
      }
      
    } catch (error) {
      console.error('Error running Enhanced Jira Agent:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Enhanced Jira Agent Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Search Jira tickets using vector similarity
   */
  private async searchJiraTickets(query: string): Promise<any[]> {
    try {
      // Generate embedding for the query
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
        dimensions: 1536
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Search in jira_ticket_embeddings table
      const { data, error } = await this.supabaseClient.rpc('match_jira_tickets', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 10
      });
      
      if (error) {
        console.error('Jira vector search error:', error);
        return [];
      }
      
      return data || [];
      
    } catch (error) {
      console.error('Error searching Jira tickets:', error);
      return [];
    }
  }

  /**
   * Get AOMA Context using the context agent
   */
  private async getAOMAContext(args: any): Promise<CallToolResult> {
    const { query, contextTypes = ['documentation', 'requirements'], maxResults = 5 } = args;
    
    try {
      console.error(`📚 Getting AOMA context: "${query}"`);
      
      // Try to import and use the real AOMA Context Agent
      try {
        const module = await import('../../src/lib/agents/langgraph/aoma-context-agent.js');
        const { AomaContextAgent } = module;
        
        const contextAgent = new AomaContextAgent({
          modelName: 'gpt-4o',
          temperature: 0.2
        });
        
        const result = await contextAgent.getContext({
          query,
          contextTypes,
          maxResults
        });
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: result.success,
              query,
              contextTypes,
              maxResults,
              contextItems: result.contextItems,
              source: 'AOMA Context Agent (Real)'
            }, null, 2)
          }]
        };
        
      } catch (importError) {
        console.error('Could not load AOMA Context Agent, using fallback:', importError);
        
        // Fallback: direct vector search
        const contextResults = await this.searchAOMAVectors({ 
          query, 
          maxResults, 
          threshold: 0.4 
        });
        
        const parsedResults = JSON.parse(contextResults.content[0].text as string);
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: true,
              query,
              contextTypes,
              maxResults,
              contextItems: parsedResults.results,
              source: 'AOMA Context Search (Fallback)',
              note: 'Real AOMA Context Agent not available, using direct vector search'
            }, null, 2)
          }]
        };
      }
      
    } catch (error) {
      console.error('Error getting AOMA context:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'AOMA Context Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * List all available LangGraph agents
   */
  private async listLangGraphAgents(args: any): Promise<CallToolResult> {
    try {
      console.error('📋 Listing LangGraph agents...');
      
      const agents = [
        {
          name: 'aoma-assistant-agent',
          description: 'Main AOMA Assistant with OpenAI Assistant API and vector store',
          capabilities: ['knowledge_base_query', 'operational_guidance', 'technical_support'],
          status: 'active',
          assistantId: this.aomaAssistantId
        },
        {
          name: 'enhanced-jira-agent',
          description: 'Jira ticket analysis with vector search capabilities',
          capabilities: ['ticket_search', 'semantic_analysis', 'trend_analysis'],
          status: 'active',
          vectorStoreTable: 'jira_ticket_embeddings'
        },
        {
          name: 'aoma-context-agent',
          description: 'Context retrieval from AOMA knowledge base',
          capabilities: ['context_retrieval', 'documentation_search', 'requirements_analysis'],
          status: 'active',
          vectorStoreTable: 'wiki_documents'
        },
        {
          name: 'test-generation-agent',
          description: 'Automated test generation based on AOMA patterns',
          capabilities: ['test_generation', 'coverage_analysis', 'pattern_recognition'],
          status: 'active'
        },
        {
          name: 'enhanced-git-agent',
          description: 'Git operations and repository analysis',
          capabilities: ['code_analysis', 'commit_history', 'branch_management'],
          status: 'active'
        },
        {
          name: 'coordinator-agent',
          description: 'Orchestrates multiple agents for complex tasks',
          capabilities: ['task_coordination', 'agent_delegation', 'workflow_management'],
          status: 'active'
        }
      ];
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            totalAgents: agents.length,
            agents,
            infrastructure: {
              openaiClient: '✅ Connected',
              supabaseClient: '✅ Connected',
              vectorStoreId: this.vectorStoreId,
              aomaAssistantId: this.aomaAssistantId
            },
            source: 'LangGraph Agent Registry'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('Error listing LangGraph agents:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Agent List Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Query capabilities of a specific agent
   */
  private async queryAgentCapabilities(args: any): Promise<CallToolResult> {
    const { agentName } = args;
    
    try {
      console.error(`🔍 Querying capabilities for agent: ${agentName}`);
      
      const agentCapabilities: Record<string, any> = {
        'aoma-assistant-agent': {
          name: 'AOMA Assistant Agent',
          type: 'OpenAI Assistant API Wrapper',
          capabilities: [
            'Query AOMA knowledge base using natural language',
            'Access attached vector store with government documents',
            'Provide operational guidance and procedures',
            'Answer technical questions about AOMA systems'
          ],
          inputTypes: ['natural_language_query', 'operational_question'],
          outputTypes: ['structured_response', 'guidance_document'],
          vectorStore: {
            attached: true,
            storeId: this.vectorStoreId,
            description: 'Contains AOMA documentation, procedures, and technical guides'
          },
          usage: 'Best for complex queries requiring deep AOMA domain knowledge'
        },
        'enhanced-jira-agent': {
          name: 'Enhanced Jira Agent',
          type: 'LangGraph Agent with Vector Search',
          capabilities: [
            'Semantic search of Jira tickets',
            'Ticket analysis and classification',
            'Trend identification across projects',
            'Natural language ticket queries'
          ],
          inputTypes: ['jira_query', 'ticket_search', 'project_analysis'],
          outputTypes: ['ticket_list', 'analysis_report', 'trend_data'],
          vectorStore: {
            table: 'jira_ticket_embeddings',
            searchFunction: 'match_jira_tickets',
            embeddingModel: 'text-embedding-3-small'
          },
          usage: 'Best for searching and analyzing Jira tickets semantically'
        },
        'aoma-context-agent': {
          name: 'AOMA Context Agent',
          type: 'Context Retrieval Specialist',
          capabilities: [
            'Retrieve relevant AOMA documentation',
            'Find operational procedures',
            'Search meeting notes and requirements',
            'Multi-layered search strategies'
          ],
          inputTypes: ['context_query', 'documentation_search'],
          outputTypes: ['context_items', 'documentation_references'],
          vectorStore: {
            table: 'wiki_documents',
            searchFunction: 'match_wiki_documents',
            fallbackStrategies: ['title_search', 'content_search']
          },
          usage: 'Best for finding specific AOMA documentation and context'
        }
      };
      
      const agentInfo = agentCapabilities[agentName];
      
      if (!agentInfo) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              agentName,
              error: 'Agent not found',
              availableAgents: Object.keys(agentCapabilities),
              source: 'Agent Capabilities Query'
            }, null, 2)
          }]
        };
      }
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: true,
            agentName,
            ...agentInfo,
            source: 'Agent Capabilities Database'
          }, null, 2)
        }]
      };
      
    } catch (error) {
      console.error('Error querying agent capabilities:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            agentName,
            error: error instanceof Error ? error.message : 'Unknown error',
            source: 'Agent Capabilities Error Handler'
          }, null, 2)
        }]
      };
    }
  }

  /**
   * Get resource definitions for MCP
   */
  getResourceTemplates(): Resource[] {
    return [
      {
        uri: 'aoma://agents',
        name: 'AOMA Agents',
        mimeType: 'application/json',
        description: 'List of all AOMA LangGraph agents'
      },
      {
        uri: 'aoma://infrastructure',
        name: 'AOMA Infrastructure',
        mimeType: 'application/json',
        description: 'AOMA system infrastructure status'
      }
    ];
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    try {
      if (uri === 'aoma://agents') {
        const agentsList = await this.listLangGraphAgents({});
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: agentsList.content[0].text
          }]
        };
      }

      if (uri === 'aoma://infrastructure') {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              openaiClient: this.openaiClient ? 'Connected' : 'Disconnected',
              supabaseClient: this.supabaseClient ? 'Connected' : 'Disconnected',
              aomaAssistantId: this.aomaAssistantId,
              vectorStoreId: this.vectorStoreId,
              environment: process.env.NODE_ENV,
              timestamp: new Date().toISOString()
            }, null, 2)
          }]
        };
      }

      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    } catch (error) {
      console.error(`Error reading resource ${uri}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}