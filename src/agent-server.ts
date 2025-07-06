/**
 * Agent Server Implementation
 * 
 * Manages the MCP interface to the LangGraph agents, providing tools and resources
 * for external development tools to interact with the agent ecosystem.
 */

import { 
  Tool, 
  Resource, 
  CallToolResult, 
  ReadResourceResult,
  TextResourceContents,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import agent services from the main application
import { 
  createAgent, 
  startAgent, 
  getAgentStatus, 
  getAgentEvents, 
  submitHumanFeedback,
  getAgentVisualization
} from '../../src/lib/agents/langgraph/agent-service.js';

// Import agent types
import { 
  AgentState, 
  AgentEvent, 
  QueryCategory 
} from '../../src/lib/agents/langgraph/agent-types.js';

// Import specific agents for direct access
import { EnhancedJiraAgent } from '../../src/lib/agents/langgraph/enhanced-jira-agent.js';
import { EnhancedGitAgent } from '../../src/lib/agents/langgraph/enhanced-git-agent.js';
import { TestGenerationAgent } from '../../src/lib/agents/langgraph/test-generation-agent.js';
import { BetabaseTestAgent } from './betabase-test-agent.js';
import { VisualIntelligenceAgent } from './visual-intelligence-agent.js';

/**
 * Interface for active agent instances
 */
interface ActiveAgent {
  id: string;
  type: 'coordinator' | 'jira' | 'git' | 'test_generation' | 'betabase_test' | 'visual_intelligence';
  status: AgentState;
  createdAt: Date;
  lastUpdated: Date;
  taskDescription?: string;
  events: AgentEvent[];
}

/**
 * Main agent server class that implements MCP interface
 */
export class AgentServer {
  private activeAgents: Map<string, ActiveAgent> = new Map();
  private jiraAgent?: EnhancedJiraAgent;
  private gitAgent?: EnhancedGitAgent;
  private testAgent?: TestGenerationAgent;
  private betabaseTestAgent?: BetabaseTestAgent;
  private visualIntelligenceAgent?: VisualIntelligenceAgent;

  /**
   * Initialize the agent server
   */
  async initialize(): Promise<void> {
    console.error('Initializing MC-TK Agent Server...');
    
    try {
      // Initialize specialized agents
      await this.initializeSpecializedAgents();
      console.error('Agent server initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agent server:', error);
      throw error;
    }
  }

  /**
   * Initialize specialized agent instances
   */
  private async initializeSpecializedAgents(): Promise<void> {
    try {
      // Initialize Jira Agent
      this.jiraAgent = new EnhancedJiraAgent({
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
        temperature: 0.2,
        enableTracing: false,
      });

      // Initialize Git Agent
      this.gitAgent = new EnhancedGitAgent({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      // Initialize Test Generation Agent
      this.testAgent = new TestGenerationAgent({
        apiKey: process.env.OPENAI_API_KEY!,
        jiraAgent: this.jiraAgent,
        gitAgent: this.gitAgent,
        modelName: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
        temperature: 0.3,
      });

      // Initialize BETABASE Test Agent
      this.betabaseTestAgent = new BetabaseTestAgent();

      // Initialize Visual Intelligence Agent
      this.visualIntelligenceAgent = new VisualIntelligenceAgent();

      console.error('Specialized agents initialized');
    } catch (error) {
      console.error('Error initializing specialized agents:', error);
      throw error;
    }
  }

  /**
   * Get tool definitions for MCP
   */
  getToolDefinitions(): Tool[] {
    return [
      // Coordinator Agent Tools
      {
        name: 'create_coordinator_agent',
        description: 'Create a new coordinator agent to orchestrate multiple sub-agents for complex tasks',
        inputSchema: {
          type: 'object',
          properties: {
            taskDescription: {
              type: 'string',
              description: 'Description of the task for the coordinator to handle'
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata for the agent execution',
              properties: {},
              additionalProperties: true
            }
          },
          required: ['taskDescription']
        }
      },
      {
        name: 'get_agent_status',
        description: 'Get the current status and progress of an agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent to check status for'
            }
          },
          required: ['agentId']
        }
      },
      {
        name: 'get_agent_events',
        description: 'Get the execution history and events for an agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent to get events for'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of events to return (default: 50)',
              default: 50
            }
          },
          required: ['agentId']
        }
      },
      {
        name: 'submit_agent_feedback',
        description: 'Provide human feedback to a running agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent to provide feedback to'
            },
            feedback: {
              type: 'string',
              description: 'The feedback message to send to the agent'
            }
          },
          required: ['agentId', 'feedback']
        }
      },
      
      // Specialized Agent Tools
      {
        name: 'query_jira_tickets',
        description: 'Search and analyze Jira tickets using semantic search',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query to search Jira tickets'
            },
            projectKey: {
              type: 'string',
              description: 'Optional Jira project key to filter results'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'analyze_git_repository',
        description: 'Analyze a Git repository structure and content',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about the repository'
            },
            repositoryPath: {
              type: 'string',
              description: 'Optional local path to the repository (defaults to current directory)'
            },
            includeContent: {
              type: 'boolean',
              description: 'Whether to include file content in analysis (default: false)',
              default: false
            }
          },
          required: ['query']
        }
      },
      {
        name: 'generate_test_plan',
        description: 'Generate comprehensive test plans based on requirements',
        inputSchema: {
          type: 'object',
          properties: {
            feature: {
              type: 'string',
              description: 'The feature or component to generate tests for'
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific requirements to focus on'
            },
            testType: {
              type: 'string',
              enum: ['e2e', 'unit', 'integration', 'api'],
              description: 'Type of tests to generate',
              default: 'e2e'
            },
            framework: {
              type: 'string',
              enum: ['playwright', 'jest', 'cypress', 'vitest'],
              description: 'Test framework to use',
              default: 'playwright'
            }
          },
          required: ['feature']
        }
      },
      {
        name: 'create_diagram',
        description: 'Generate mermaid diagrams from descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Description of what to diagram'
            },
            diagramType: {
              type: 'string',
              enum: ['flowchart', 'sequence', 'class', 'state', 'entity-relationship', 'gantt'],
              description: 'Type of diagram to generate',
              default: 'flowchart'
            }
          },
          required: ['description']
        }
      },

      // Enhanced Development Tools
      {
        name: 'analyze_code_quality',
        description: 'Analyze code quality metrics, complexity, and potential issues',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file or directory to analyze'
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['complexity', 'maintainability', 'testability', 'security', 'performance']
              },
              description: 'Specific metrics to analyze',
              default: ['complexity', 'maintainability']
            },
            language: {
              type: 'string',
              enum: ['typescript', 'javascript', 'python', 'java', 'auto'],
              description: 'Programming language (auto-detect if not specified)',
              default: 'auto'
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'analyze_architecture',
        description: 'Analyze project architecture, dependencies, and design patterns',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project root directory'
            },
            analysisType: {
              type: 'string',
              enum: ['dependencies', 'structure', 'patterns', 'full'],
              description: 'Type of architecture analysis to perform',
              default: 'full'
            },
            includeVisualization: {
              type: 'boolean',
              description: 'Whether to generate architecture diagrams',
              default: true
            }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'suggest_refactoring',
        description: 'Analyze code and suggest refactoring improvements',
        inputSchema: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file to analyze for refactoring'
            },
            refactoringType: {
              type: 'string',
              enum: ['extract-method', 'extract-class', 'rename', 'optimize', 'modernize', 'all'],
              description: 'Type of refactoring to suggest',
              default: 'all'
            },
            includeCode: {
              type: 'boolean',
              description: 'Whether to include refactored code examples',
              default: true
            }
          },
          required: ['filePath']
        }
      },
      {
        name: 'search_codebase',
        description: 'Search for code patterns, functions, or components across the codebase',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (natural language or regex pattern)'
            },
            searchType: {
              type: 'string',
              enum: ['semantic', 'pattern', 'symbol', 'text'],
              description: 'Type of search to perform',
              default: 'semantic'
            },
            fileTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'File extensions to search (e.g., [".ts", ".js"])',
              default: ['.ts', '.tsx', '.js', '.jsx']
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 20
            }
          },
          required: ['query']
        }
      },
      {
        name: 'generate_documentation',
        description: 'Generate documentation for code components, APIs, or architecture',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Path to the code or component to document'
            },
            docType: {
              type: 'string',
              enum: ['api', 'component', 'readme', 'architecture', 'tutorial'],
              description: 'Type of documentation to generate',
              default: 'api'
            },
            format: {
              type: 'string',
              enum: ['markdown', 'jsdoc', 'typedoc', 'plain'],
              description: 'Documentation format',
              default: 'markdown'
            },
            includeExamples: {
              type: 'boolean',
              description: 'Whether to include code examples',
              default: true
            }
          },
          required: ['target']
        }
      },
      {
        name: 'analyze_dependencies',
        description: 'Analyze project dependencies for security, updates, and optimization',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the project root directory'
            },
            analysisType: {
              type: 'string',
              enum: ['security', 'updates', 'unused', 'conflicts', 'all'],
              description: 'Type of dependency analysis',
              default: 'all'
            },
            includeDevDeps: {
              type: 'boolean',
              description: 'Whether to include development dependencies',
              default: true
            }
          },
          required: ['projectPath']
        }
      },

      // IDE-Specific Integration Tools
      {
        name: 'analyze_workspace',
        description: 'Analyze workspace structure and provide IDE-specific insights',
        inputSchema: {
          type: 'object',
          properties: {
            workspacePath: {
              type: 'string',
              description: 'Path to the workspace/project root'
            },
            ide: {
              type: 'string',
              enum: ['cursor', 'windsurf', 'vscode', 'claude-code', 'auto'],
              description: 'Target IDE for optimization suggestions',
              default: 'auto'
            },
            includeConfig: {
              type: 'boolean',
              description: 'Whether to analyze IDE configuration files',
              default: true
            }
          },
          required: ['workspacePath']
        }
      },
      {
        name: 'suggest_ide_improvements',
        description: 'Suggest IDE-specific improvements and configurations',
        inputSchema: {
          type: 'object',
          properties: {
            currentFile: {
              type: 'string',
              description: 'Path to the file being worked on'
            },
            context: {
              type: 'string',
              description: 'Current development context or task'
            },
            ide: {
              type: 'string',
              enum: ['cursor', 'windsurf', 'vscode', 'claude-code'],
              description: 'Target IDE',
              default: 'claude-code'
            }
          },
          required: ['currentFile', 'context']
        }
      },
      {
        name: 'generate_ide_snippets',
        description: 'Generate IDE-specific code snippets and shortcuts',
        inputSchema: {
          type: 'object',
          properties: {
            language: {
              type: 'string',
              description: 'Programming language for snippets'
            },
            framework: {
              type: 'string',
              description: 'Framework or library context'
            },
            ide: {
              type: 'string',
              enum: ['cursor', 'windsurf', 'vscode', 'claude-code'],
              description: 'Target IDE for snippet format',
              default: 'claude-code'
            },
            snippetType: {
              type: 'string',
              enum: ['component', 'function', 'test', 'hook', 'api', 'config'],
              description: 'Type of snippet to generate'
            }
          },
          required: ['language', 'snippetType']
        }
      },
      {
        name: 'analyze_development_context',
        description: 'Analyze current development context and suggest next actions',
        inputSchema: {
          type: 'object',
          properties: {
            currentFiles: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of currently open files'
            },
            recentChanges: {
              type: 'array',
              items: { type: 'string' },
              description: 'Recent file changes or commits'
            },
            currentTask: {
              type: 'string',
              description: 'Description of current development task'
            },
            timeframe: {
              type: 'string',
              enum: ['immediate', 'session', 'day', 'week'],
              description: 'Timeframe for suggestions',
              default: 'session'
            }
          }
        }
      },
      {
        name: 'optimize_workflow',
        description: 'Analyze and optimize development workflow based on patterns',
        inputSchema: {
          type: 'object',
          properties: {
            workspacePath: {
              type: 'string',
              description: 'Path to the workspace'
            },
            workflowType: {
              type: 'string',
              enum: ['coding', 'testing', 'debugging', 'reviewing', 'planning'],
              description: 'Type of workflow to optimize'
            },
            tools: {
              type: 'array',
              items: { type: 'string' },
              description: 'Currently used development tools'
            }
          },
          required: ['workspacePath', 'workflowType']
        }
      },
      {
        name: 'create_development_plan',
        description: 'Create a structured development plan with milestones and tasks',
        inputSchema: {
          type: 'object',
          properties: {
            projectGoal: {
              type: 'string',
              description: 'Main goal or feature to implement'
            },
            timeEstimate: {
              type: 'string',
              description: 'Estimated time (e.g., "2 hours", "1 day", "1 week")'
            },
            complexity: {
              type: 'string',
              enum: ['simple', 'moderate', 'complex'],
              description: 'Estimated complexity level',
              default: 'moderate'
            },
            includeTests: {
              type: 'boolean',
              description: 'Whether to include testing tasks',
              default: true
            },
            includeDocumentation: {
              type: 'boolean',
              description: 'Whether to include documentation tasks',
              default: true
            }
          },
          required: ['projectGoal']
        }
      },

      // Agent Management Tools
      {
        name: 'list_active_agents',
        description: 'List all currently active agent instances',
        inputSchema: {
          type: 'object',
          properties: {
            includeCompleted: {
              type: 'boolean',
              description: 'Whether to include completed agents (default: false)',
              default: false
            }
          }
        }
      },
      {
        name: 'terminate_agent',
        description: 'Stop and cleanup an agent instance',
        inputSchema: {
          type: 'object',
          properties: {
            agentId: {
              type: 'string',
              description: 'The ID of the agent to terminate'
            }
          },
          required: ['agentId']
        }
      },

      // BETABASE Test Knowledge Agent Tools
      ...this.getBetabaseTestTools(),

      // Visual Intelligence Agent Tools (Screenshot-Powered Testing & Training)
      ...this.getVisualIntelligenceTools()
    ];
  }

  /**
   * Get BETABASE test tools
   */
  private getBetabaseTestTools(): Tool[] {
    if (!this.betabaseTestAgent) {
      return [];
    }
    return this.betabaseTestAgent.getToolDefinitions();
  }

  /**
   * Get Visual Intelligence tools
   */
  private getVisualIntelligenceTools(): Tool[] {
    if (!this.visualIntelligenceAgent) {
      return [];
    }
    return this.visualIntelligenceAgent.getToolDefinitions();
  }

  /**
   * Get resource definitions for MCP
   */
  getResourceDefinitions(): Resource[] {
    const resources: Resource[] = [
      {
        uri: 'agent://instances',
        name: 'Active Agent Instances',
        mimeType: 'application/json',
        description: 'List of all active agent instances and their status'
      },
      {
        uri: 'agent://types',
        name: 'Available Agent Types',
        mimeType: 'application/json',
        description: 'Information about available agent types and their capabilities'
      }
    ];

    // Add resources for each active agent
    for (const [agentId, agent] of this.activeAgents) {
      resources.push({
        uri: `agent://instances/${agentId}`,
        name: `Agent ${agentId}`,
        mimeType: 'application/json',
        description: `Status and events for agent ${agentId} (${agent.type})`
      });

      resources.push({
        uri: `agent://instances/${agentId}/events`,
        name: `Agent ${agentId} Events`,
        mimeType: 'application/json',
        description: `Event history for agent ${agentId}`
      });
    }

    return resources;
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: any): Promise<CallToolResult> {
    try {
      switch (name) {
        case 'create_coordinator_agent':
          return await this.createCoordinatorAgent(args);
        case 'get_agent_status':
          return await this.getAgentStatusTool(args);
        case 'get_agent_events':
          return await this.getAgentEventsTool(args);
        case 'submit_agent_feedback':
          return await this.submitAgentFeedbackTool(args);
        case 'query_jira_tickets':
          return await this.queryJiraTickets(args);
        case 'analyze_git_repository':
          return await this.analyzeGitRepository(args);
        case 'generate_test_plan':
          return await this.generateTestPlan(args);
        case 'create_diagram':
          return await this.createDiagram(args);
        case 'list_active_agents':
          return await this.listActiveAgents(args);
        case 'terminate_agent':
          return await this.terminateAgent(args);
        // Enhanced Development Tools
        case 'analyze_code_quality':
          return await this.analyzeCodeQuality(args);
        case 'analyze_architecture':
          return await this.analyzeArchitecture(args);
        case 'suggest_refactoring':
          return await this.suggestRefactoring(args);
        case 'search_codebase':
          return await this.searchCodebase(args);
        case 'generate_documentation':
          return await this.generateDocumentation(args);
        case 'analyze_dependencies':
          return await this.analyzeDependencies(args);
        // IDE-Specific Tools
        case 'analyze_workspace':
          return await this.analyzeWorkspace(args);
        case 'suggest_ide_improvements':
          return await this.suggestIdeImprovements(args);
        case 'generate_ide_snippets':
          return await this.generateIdeSnippets(args);
        case 'analyze_development_context':
          return await this.analyzeDevelopmentContext(args);
        case 'optimize_workflow':
          return await this.optimizeWorkflow(args);
        case 'create_development_plan':
          return await this.createDevelopmentPlan(args);
        
        // BETABASE Test Knowledge Agent Tools
        case 'query_betabase_tests':
        case 'analyze_test_patterns':
        case 'search_test_scripts':
        case 'get_test_suite_insights':
        case 'generate_test_recommendations':
          return await this.callBetabaseTestTool(name, args);
        
        // Visual Intelligence Agent Tools
        case 'analyze_screenshot_collection':
        case 'create_visual_test_suite':
        case 'visual_regression_analysis':
        case 'generate_customer_training_dataset':
        case 'brand_compliance_audit':
        case 'accessibility_visual_audit':
        case 'visual_similarity_search':
          return await this.callVisualIntelligenceTool(name, args);
        
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
   * Read a resource
   */
  async readResource(uri: string): Promise<ReadResourceResult> {
    try {
      if (uri === 'agent://instances') {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              activeAgents: Array.from(this.activeAgents.values()),
              totalCount: this.activeAgents.size
            }, null, 2)
          }]
        };
      }

      if (uri === 'agent://types') {
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              agentTypes: [
                {
                  type: 'coordinator',
                  description: 'Orchestrates multiple sub-agents for complex tasks',
                  capabilities: ['task_planning', 'agent_delegation', 'human_feedback']
                },
                {
                  type: 'jira',
                  description: 'Searches and analyzes Jira tickets using semantic search',
                  capabilities: ['ticket_search', 'semantic_analysis', 'project_insights']
                },
                {
                  type: 'git',
                  description: 'Analyzes Git repositories and code content',
                  capabilities: ['repository_analysis', 'code_search', 'file_content_analysis']
                },
                {
                  type: 'test_generation',
                  description: 'Generates comprehensive test plans and test code',
                  capabilities: ['test_planning', 'code_generation', 'requirement_analysis']
                }
              ]
            }, null, 2)
          }]
        };
      }

      // Handle agent-specific resources
      const agentMatch = uri.match(/^agent:\/\/instances\/([^\/]+)(?:\/(.+))?$/);
      if (agentMatch) {
        const [, agentId, subResource] = agentMatch;
        const agent = this.activeAgents.get(agentId);
        
        if (!agent) {
          throw new McpError(ErrorCode.InvalidRequest, `Agent ${agentId} not found`);
        }

        if (!subResource) {
          // Return agent details
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(agent, null, 2)
            }]
          };
        }

        if (subResource === 'events') {
          // Return agent events
          return {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify({
                agentId,
                events: agent.events,
                eventCount: agent.events.length
              }, null, 2)
            }]
          };
        }
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

  // Tool implementation methods
  private async createCoordinatorAgent(args: any): Promise<CallToolResult> {
    const { taskDescription, metadata = {} } = args;
    
    const agentId = await createAgent('coordinator', { 
      taskDescription,
      ...metadata 
    });
    
    // Start the agent
    await startAgent(agentId);
    
    // Track the agent
    this.activeAgents.set(agentId, {
      id: agentId,
      type: 'coordinator',
      status: AgentState.STARTING,
      createdAt: new Date(),
      lastUpdated: new Date(),
      taskDescription,
      events: []
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          agentId,
          taskDescription,
          status: 'started',
          message: 'Coordinator agent created and started successfully'
        }, null, 2)
      }]
    };
  }

  private async getAgentStatusTool(args: any): Promise<CallToolResult> {
    const { agentId } = args;
    
    const status = await getAgentStatus(agentId);
    const agent = this.activeAgents.get(agentId);
    
    if (agent) {
      agent.status = status.status;
      agent.lastUpdated = new Date();
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          agentId,
          ...status,
          lastUpdated: agent?.lastUpdated || new Date()
        }, null, 2)
      }]
    };
  }

  private async getAgentEventsTool(args: any): Promise<CallToolResult> {
    const { agentId, limit = 50 } = args;
    
    const events = await getAgentEvents(agentId);
    const limitedEvents = events.slice(-limit);
    
    // Update cached events
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.events = events;
      agent.lastUpdated = new Date();
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          agentId,
          events: limitedEvents,
          totalEvents: events.length,
          limitApplied: limit
        }, null, 2)
      }]
    };
  }

  private async submitAgentFeedbackTool(args: any): Promise<CallToolResult> {
    const { agentId, feedback } = args;
    
    submitHumanFeedback(agentId, feedback);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          agentId,
          feedback,
          message: 'Feedback submitted successfully'
        }, null, 2)
      }]
    };
  }

  private async queryJiraTickets(args: any): Promise<CallToolResult> {
    const { query, projectKey, maxResults = 10 } = args;
    
    if (!this.jiraAgent) {
      throw new McpError(ErrorCode.InternalError, 'Jira agent not initialized');
    }

    const result = await this.jiraAgent.processQuery(query);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          projectKey,
          maxResults,
          result
        }, null, 2)
      }]
    };
  }

  private async analyzeGitRepository(args: any): Promise<CallToolResult> {
    const { query, repositoryPath, includeContent = false } = args;
    
    if (!this.gitAgent) {
      throw new McpError(ErrorCode.InternalError, 'Git agent not initialized');
    }

    const result = await this.gitAgent.processQuery(query);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          repositoryPath,
          includeContent,
          result
        }, null, 2)
      }]
    };
  }

  private async generateTestPlan(args: any): Promise<CallToolResult> {
    const { feature, requirements = [], testType = 'e2e', framework = 'playwright' } = args;
    
    if (!this.testAgent) {
      throw new McpError(ErrorCode.InternalError, 'Test generation agent not initialized');
    }

    // Create a test generation request
    const testRequest = {
      query: `Generate ${testType} tests for ${feature} using ${framework}`,
      testType,
      framework,
      priority: 'medium' as const
    };

    const result = await this.testAgent.generateTestsFromRequest(testRequest);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          feature,
          requirements,
          testType,
          framework,
          result
        }, null, 2)
      }]
    };
  }

  private async createDiagram(args: any): Promise<CallToolResult> {
    const { description, diagramType = 'flowchart' } = args;
    
    // Use the diagram tool from the main application
    const { generateDiagramTool } = await import('../../src/lib/agents/langgraph/tools/diagram-tool.js');
    
    const result = await generateDiagramTool.func({ description, diagramType });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          description,
          diagramType,
          result
        }, null, 2)
      }]
    };
  }

  private async listActiveAgents(args: any): Promise<CallToolResult> {
    const { includeCompleted = false } = args;
    
    let agents = Array.from(this.activeAgents.values());
    
    if (!includeCompleted) {
      agents = agents.filter(agent => 
        agent.status !== AgentState.COMPLETED && 
        agent.status !== AgentState.ERROR
      );
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          agents,
          totalCount: agents.length,
          includeCompleted
        }, null, 2)
      }]
    };
  }

  private async terminateAgent(args: any): Promise<CallToolResult> {
    const { agentId } = args;
    
    const agent = this.activeAgents.get(agentId);
    if (agent) {
      agent.status = AgentState.COMPLETED;
      agent.lastUpdated = new Date();
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          agentId,
          message: 'Agent terminated successfully'
        }, null, 2)
      }]
    };
  }

  // Enhanced Development Tool Implementations
  private async analyzeCodeQuality(args: any): Promise<CallToolResult> {
    const { filePath, metrics = ['complexity', 'maintainability'], language = 'auto' } = args;
    
    try {
      // Use the existing test quality analysis API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/testing/analyze-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          analysisType: 'code_quality',
          metrics,
          language
        })
      });

      const analysis = await response.json();
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            filePath,
            metrics,
            language,
            analysis
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Code quality analysis failed: ${error}`);
    }
  }

  private async analyzeArchitecture(args: any): Promise<CallToolResult> {
    const { projectPath, analysisType = 'full', includeVisualization = true } = args;
    
    try {
      // Create a coordinator agent to analyze architecture
      const agentId = await createAgent('coordinator', {
        taskDescription: `Analyze the architecture of the project at ${projectPath}. Focus on ${analysisType} analysis and ${includeVisualization ? 'include' : 'exclude'} visualization diagrams.`
      });
      
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription: `Architecture analysis for ${projectPath}`,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            projectPath,
            analysisType,
            includeVisualization,
            agentId,
            message: 'Architecture analysis started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Architecture analysis failed: ${error}`);
    }
  }

  private async suggestRefactoring(args: any): Promise<CallToolResult> {
    const { filePath, refactoringType = 'all', includeCode = true } = args;
    
    try {
      // Use Git agent to analyze the file and suggest refactoring
      if (!this.gitAgent) {
        throw new McpError(ErrorCode.InternalError, 'Git agent not initialized');
      }

      const query = `Analyze the file ${filePath} and suggest ${refactoringType} refactoring improvements. ${includeCode ? 'Include specific code examples.' : 'Provide only recommendations.'}`;
      const result = await this.gitAgent.processQuery(query);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            filePath,
            refactoringType,
            includeCode,
            suggestions: result
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Refactoring analysis failed: ${error}`);
    }
  }

  private async searchCodebase(args: any): Promise<CallToolResult> {
    const { query, searchType = 'semantic', fileTypes = ['.ts', '.tsx', '.js', '.jsx'], maxResults = 20 } = args;
    
    try {
      // Use Git agent for codebase search
      if (!this.gitAgent) {
        throw new McpError(ErrorCode.InternalError, 'Git agent not initialized');
      }

      const searchQuery = `Search the codebase for: ${query}. Use ${searchType} search focusing on files with extensions: ${fileTypes.join(', ')}. Limit to ${maxResults} results.`;
      const result = await this.gitAgent.processQuery(searchQuery);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            searchType,
            fileTypes,
            maxResults,
            results: result
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Codebase search failed: ${error}`);
    }
  }

  private async generateDocumentation(args: any): Promise<CallToolResult> {
    const { target, docType = 'api', format = 'markdown', includeExamples = true } = args;
    
    try {
      // Create a coordinator agent to generate documentation
      const taskDescription = `Generate ${docType} documentation for ${target} in ${format} format. ${includeExamples ? 'Include code examples.' : 'No examples needed.'}`;
      
      const agentId = await createAgent('coordinator', { taskDescription });
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            target,
            docType,
            format,
            includeExamples,
            agentId,
            message: 'Documentation generation started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Documentation generation failed: ${error}`);
    }
  }

  private async analyzeDependencies(args: any): Promise<CallToolResult> {
    const { projectPath, analysisType = 'all', includeDevDeps = true } = args;
    
    try {
      // Create a coordinator agent to analyze dependencies
      const taskDescription = `Analyze ${analysisType} dependencies for the project at ${projectPath}. ${includeDevDeps ? 'Include development dependencies.' : 'Exclude dev dependencies.'}`;
      
      const agentId = await createAgent('coordinator', { taskDescription });
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            projectPath,
            analysisType,
            includeDevDeps,
            agentId,
            message: 'Dependency analysis started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Dependency analysis failed: ${error}`);
    }
  }

  // IDE-Specific Tool Implementations
  private async analyzeWorkspace(args: any): Promise<CallToolResult> {
    const { workspacePath, ide = 'auto', includeConfig = true } = args;
    
    try {
      // Create a coordinator agent to analyze workspace
      const taskDescription = `Analyze the workspace at ${workspacePath} for ${ide} IDE optimization. ${includeConfig ? 'Include IDE configuration analysis.' : ''}`;
      
      const agentId = await createAgent('coordinator', { taskDescription });
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            workspacePath,
            ide,
            includeConfig,
            agentId,
            message: 'Workspace analysis started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Workspace analysis failed: ${error}`);
    }
  }

  private async suggestIdeImprovements(args: any): Promise<CallToolResult> {
    const { currentFile, context, ide = 'claude-code' } = args;
    
    try {
      // Use Git agent to analyze the current file and context
      if (!this.gitAgent) {
        throw new McpError(ErrorCode.InternalError, 'Git agent not initialized');
      }

      const query = `Analyze the file ${currentFile} in the context of "${context}" and suggest ${ide} IDE-specific improvements, configurations, and optimizations.`;
      const result = await this.gitAgent.processQuery(query);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            currentFile,
            context,
            ide,
            suggestions: result
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `IDE improvement suggestions failed: ${error}`);
    }
  }

  private async generateIdeSnippets(args: any): Promise<CallToolResult> {
    const { language, framework, ide = 'claude-code', snippetType } = args;
    
    try {
      // Create a coordinator agent to generate snippets
      const taskDescription = `Generate ${ide} IDE snippets for ${language} ${framework ? `using ${framework}` : ''} framework. Focus on ${snippetType} type snippets.`;
      
      const agentId = await createAgent('coordinator', { taskDescription });
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            language,
            framework,
            ide,
            snippetType,
            agentId,
            message: 'Snippet generation started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Snippet generation failed: ${error}`);
    }
  }

  private async analyzeDevelopmentContext(args: any): Promise<CallToolResult> {
    const { currentFiles = [], recentChanges = [], currentTask, timeframe = 'session' } = args;
    
    try {
      // Use Git agent to analyze development context
      if (!this.gitAgent) {
        throw new McpError(ErrorCode.InternalError, 'Git agent not initialized');
      }

      const query = `Analyze the current development context:
        - Current files: ${currentFiles.join(', ')}
        - Recent changes: ${recentChanges.join(', ')}
        - Current task: ${currentTask || 'Not specified'}
        - Timeframe: ${timeframe}
        Suggest next actions and development priorities.`;
      
      const result = await this.gitAgent.processQuery(query);
      
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            currentFiles,
            recentChanges,
            currentTask,
            timeframe,
            analysis: result
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Development context analysis failed: ${error}`);
    }
  }

  private async optimizeWorkflow(args: any): Promise<CallToolResult> {
    const { workspacePath, workflowType, tools = [] } = args;
    
    try {
      // Create a coordinator agent to optimize workflow
      const taskDescription = `Optimize ${workflowType} workflow for workspace at ${workspacePath}. Current tools: ${tools.join(', ')}. Provide specific recommendations and automation suggestions.`;
      
      const agentId = await createAgent('coordinator', { taskDescription });
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            workspacePath,
            workflowType,
            tools,
            agentId,
            message: 'Workflow optimization started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Workflow optimization failed: ${error}`);
    }
  }

  private async createDevelopmentPlan(args: any): Promise<CallToolResult> {
    const { 
      projectGoal, 
      timeEstimate, 
      complexity = 'moderate', 
      includeTests = true, 
      includeDocumentation = true 
    } = args;
    
    try {
      // Create a coordinator agent to create development plan
      const taskDescription = `Create a structured development plan for: ${projectGoal}. 
        Time estimate: ${timeEstimate || 'Not specified'}
        Complexity: ${complexity}
        Include tests: ${includeTests}
        Include documentation: ${includeDocumentation}
        Provide milestones, tasks, and timeline.`;
      
      const agentId = await createAgent('coordinator', { taskDescription });
      await startAgent(agentId);
      
      // Track the agent
      this.activeAgents.set(agentId, {
        id: agentId,
        type: 'coordinator',
        status: AgentState.STARTING,
        createdAt: new Date(),
        lastUpdated: new Date(),
        taskDescription,
        events: []
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            projectGoal,
            timeEstimate,
            complexity,
            includeTests,
            includeDocumentation,
            agentId,
            message: 'Development plan creation started. Use get_agent_status to monitor progress.'
          }, null, 2)
        }]
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Development plan creation failed: ${error}`);
    }
  }

  /**
   * Call BETABASE Test Agent tools
   */
  private async callBetabaseTestTool(name: string, args: any): Promise<CallToolResult> {
    if (!this.betabaseTestAgent) {
      throw new McpError(ErrorCode.InternalError, 'BETABASE Test Agent not initialized');
    }

    try {
      return await this.betabaseTestAgent.callTool(name, args);
    } catch (error) {
      console.error(`Error calling BETABASE test tool ${name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `BETABASE test tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Call Visual Intelligence Agent tools
   */
  private async callVisualIntelligenceTool(name: string, args: any): Promise<CallToolResult> {
    if (!this.visualIntelligenceAgent) {
      throw new McpError(ErrorCode.InternalError, 'Visual Intelligence Agent not initialized');
    }

    try {
      return await this.visualIntelligenceAgent.callTool(name, args);
    } catch (error) {
      console.error(`Error calling Visual Intelligence tool ${name}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `Visual Intelligence tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}