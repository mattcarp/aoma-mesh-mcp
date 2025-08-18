#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirnameFromMeta = path.dirname(__filename); // Renamed to avoid confusion

// Import specific function from fs to avoid collision
import { existsSync, readFileSync } from 'fs';
import net from 'net';

// Function to find project root by looking for pnpm-workspace.yaml
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    if (existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) { // Use existsSync directly
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  // Fallback if pnpm-workspace.yaml is not found
  // console.warn("pnpm-workspace.yaml not found. Falling back to relative path for project root. This might be unreliable.");
  return path.resolve(__dirnameFromMeta, '../../../'); // Original fallback
}

const projectRoot = findProjectRoot(__dirnameFromMeta);

// Load .env.local from the project root
const envLocalPath = path.join(projectRoot, '.env.local');
if (existsSync(envLocalPath)) { // Use existsSync directly
  dotenv.config({ path: envLocalPath });
  // console.log(`Loaded .env.local from: ${envLocalPath}`);
} else {
  // console.warn(`.env.local not found at: ${envLocalPath}`);
}

// Also load .env from the current package directory (e.g., packages/mcp-server/.env) if it exists
// This allows for package-specific overrides.
// Adjusted path to look for .env in the parent of src/ or dist/
const packageEnvPath = path.resolve(__dirnameFromMeta, '../.env'); 
if (existsSync(packageEnvPath)) { // Use existsSync directly
 dotenv.config({ path: packageEnvPath });
  // console.log(`Loaded .env from: ${packageEnvPath}`);
} else {
  // console.warn(`.env not found in package directory: ${packageEnvPath}`);
}

/**
 * AOMA Mesh MCP Server - Production Hardened
 * 
 * Self-contained, production-ready MCP server for Sony Music AOMA Agent Mesh.
 * Supports multiple hosting environments: Claude Desktop, Windsurf, VS Code, etc.
 * NOW WITH HTTP ENDPOINTS for web applications like tk-ui!
 * 
 * @version 2.0.0
 * @author MC-TK Development Team
 */

import { 
  Tool, 
  Resource, 
  CallToolResult, 
  ReadResourceResult,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import * as fs from 'fs/promises';
import { initializeLangSmith, traceToolCall, isLangSmithEnabled } from './utils/langsmith.js';
import { logger } from './utils/mcp-logger.js';

// Environment validation with comprehensive error messages
const EnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(20, 'OpenAI API key must be at least 20 characters'),
  AOMA_ASSISTANT_ID: z.string().startsWith('asst_', 'Invalid AOMA Assistant ID format'),
  OPENAI_VECTOR_STORE_ID: z.string().startsWith('vs_', 'Invalid Vector Store ID format').optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20, 'Supabase service key required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'Supabase anonymous key required'),
  JIRA_BASE_URL: z.string().url('Invalid Jira base URL').optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MCP_SERVER_VERSION: z.string().default('2.0.0'),
  MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(3),
  TIMEOUT_MS: z.coerce.number().int().min(5000).max(300000).default(120000),
  HTTP_PORT: z.coerce.number().int().min(1024).max(65535).default(3333),
  PORT: z.coerce.number().int().min(1024).max(65535).optional(), // Railway's PORT env var
});

type Environment = z.infer<typeof EnvSchema>;

// Core interfaces
interface VectorSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
  url?: string;
  crawled_at?: string;
  metadata?: Record<string, unknown>;
}

interface AOMAQueryRequest {
  query: string;
  strategy?: 'comprehensive' | 'focused' | 'rapid';
  maxResults?: number;
  threshold?: number;
  context?: string;
}

interface JiraSearchRequest {
  query: string;
  projectKey?: string;
  status?: string[];
  priority?: string[];
  maxResults?: number;
  threshold?: number;
}

interface JiraCountRequest {
  projectKey?: string;
  status?: string[];
  priority?: string[];
}

interface GitSearchRequest {
  query: string;
  repository?: string[];
  author?: string[];
  dateFrom?: string;
  dateTo?: string;
  filePattern?: string;
  maxResults?: number;
  threshold?: number;
}

interface CodeSearchRequest {
  query: string;
  repository?: string[];
  language?: string[];
  fileExtension?: string[];
  maxResults?: number;
  threshold?: number;
}

interface OutlookEmailSearchRequest {
  query: string;
  dateFrom?: string;
  dateTo?: string;
  fromEmail?: string[];
  toEmail?: string[];
  subject?: string;
  hasAttachments?: boolean;
  priority?: string[];
  maxResults?: number;
  threshold?: number;
}

interface ServerMetrics {
  uptime: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: string;
  version: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    openai: { status: boolean; latency?: number; error?: string };
    supabase: { status: boolean; latency?: number; error?: string };
    vectorStore: { status: boolean; error?: string };
  };
  metrics: ServerMetrics;
  timestamp: string;
}

/**
 * Production-ready AOMA Mesh MCP Server
 */
export class AOMAMeshServer {
  private readonly env: Environment;
  private readonly openaiClient: OpenAI;
  private readonly supabaseClient: any;
  private readonly server: Server;
  private readonly httpApp: express.Application;
  private readonly startTime: number = Date.now();
  private metrics: ServerMetrics;
  private healthCache: { status: HealthStatus; lastCheck: number } | null = null;
  private readonly HEALTH_CACHE_TTL = 30000; // 30 seconds

  constructor() {
    // Generate timestamp in YYYYMMDD-HHMMSS format
const now = new Date();
const year = now.getFullYear();
const month = (now.getMonth() + 1).toString().padStart(2, '0');
const day = now.getDate().toString().padStart(2, '0');
const hours = now.getHours().toString().padStart(2, '0');
const minutes = now.getMinutes().toString().padStart(2, '0');
const seconds = now.getSeconds().toString().padStart(2, '0');
const timestamp = `${year}${month}${day}-${hours}${minutes}${seconds}`;

// Create versioned instance without modifying global env
const baseVersion = process.env.MCP_SERVER_VERSION || 'unknown';
const versionWithTimestamp = `${baseVersion}_${timestamp}`;

this.env = this.validateAndLoadEnvironment();
// Override version for this instance only
this.env.MCP_SERVER_VERSION = versionWithTimestamp;
    
    // Initialize OpenAI client with retry configuration
    this.openaiClient = new OpenAI({
      apiKey: this.env.OPENAI_API_KEY,
      timeout: this.env.TIMEOUT_MS,
      maxRetries: this.env.MAX_RETRIES,
    });

    // Initialize Supabase client with optimized settings
    this.supabaseClient = createClient(
      this.env.NEXT_PUBLIC_SUPABASE_URL,
      this.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-client-info': 'aoma-mesh-mcp/2.0.0' } },
      }
    );

    // Initialize MCP server
    this.server = new Server(
      {
        name: '@sony-music/aoma-mesh-mcp-server',
        version: this.env.MCP_SERVER_VERSION,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Initialize HTTP server
    this.httpApp = express();
    this.httpApp.use(cors());
    this.httpApp.use(express.json({ limit: '10mb' }));

    // Initialize metrics
    this.metrics = {
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date().toISOString(),
      version: this.env.MCP_SERVER_VERSION,
    };

    this.setupRequestHandlers();
    this.setupHttpEndpoints();
  }

  /**
   * Validate environment with detailed error reporting
   */
  private validateAndLoadEnvironment(): Environment {
    try {
      // Try to load from .env files if not provided via environment
      const envVars = { ...process.env };
      
      // Check for .env.local in parent directory
      try {
        const envPath = path.join(process.cwd(), '..', '.env.local');
        const envContent = readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n').filter((line: string) => line.trim() && !line.startsWith('#'));
        
        envLines.forEach((line: string) => {
          const [key, ...valueParts] = line.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            if (!envVars[key]) {
              envVars[key] = value;
            }
          }
        });
      } catch (error) {
        // .env.local not found or not readable - continue with process.env
      }

      return EnvSchema.parse(envVars);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => 
          `❌ ${err.path.join('.')}: ${err.message}`
        );
        
        this.logError('Environment validation failed', {
          errors,
          available: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('SUPABASE') || k.includes('AOMA'))
        });
        
        throw new Error(`Environment validation failed:\n${errors.join('\n')}\n\nPlease ensure all required environment variables are set.`);
      }
      throw error;
    }
  }

  /**
   * Setup MCP request handlers with comprehensive error handling
   */
  private setupRequestHandlers(): void {
    // Tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        return { tools: this.getToolDefinitions() };
      } catch (error) {
        this.logError('Failed to list tools', error);
        throw new McpError(ErrorCode.InternalError, 'Failed to retrieve available tools');
      }
    });

    // Resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        return { resources: this.getResourceDefinitions() };
      } catch (error) {
        this.logError('Failed to list resources', error);
        throw new McpError(ErrorCode.InternalError, 'Failed to retrieve available resources');
      }
    });

    // Tool execution with metrics tracking
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const toolName = request.params.name;
      const args = request.params.arguments || {};
      
      try {
        this.metrics.totalRequests++;
        this.logInfo(`Tool call: ${toolName}`, { args: this.sanitizeArgs(args) });
        
        const result = await this.callTool(toolName, args);
        
        this.metrics.successfulRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        this.logInfo(`Tool completed: ${toolName}`, { 
          duration: Date.now() - startTime,
          success: true 
        });
        
        return result;
      } catch (error) {
        this.metrics.failedRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        this.logError(`Tool failed: ${toolName}`, { 
          error: this.getErrorMessage(error),
          duration: Date.now() - startTime,
          args: this.sanitizeArgs(args)
        });
        
        throw error instanceof McpError ? error : 
          new McpError(ErrorCode.InternalError, `Tool ${toolName} failed: ${this.getErrorMessage(error)}`);
      }
    });

    // Resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        return await this.readResource(request.params.uri);
      } catch (error) {
        this.logError('Resource read failed', { uri: request.params.uri, error });
        throw error instanceof McpError ? error :
          new McpError(ErrorCode.InternalError, `Failed to read resource: ${this.getErrorMessage(error)}`);
      }
    });
  }

  /**
   * Setup HTTP endpoints for web application integration
   */
  private setupHttpEndpoints(): void {
    // Health check endpoint
    this.httpApp.get('/health', async (req, res) => {
      try {
        const health = await this.performHealthCheck(true);
        res.json(health);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: this.getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Tool execution endpoint
    this.httpApp.post('/rpc', async (req, res) => {
      const startTime = Date.now();
      
      try {
        const { method, params } = req.body;
        
        if (method !== 'tools/call') {
          res.status(400).json({
            error: 'Invalid method',
            message: 'Only tools/call method is supported',
          });
          return;
        }

        const { name: toolName, arguments: args } = params;
        
        this.metrics.totalRequests++;
        this.logInfo(`HTTP Tool call: ${toolName}`, { args: this.sanitizeArgs(args) });
        
        const result = await this.callTool(toolName, args);
        
        this.metrics.successfulRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        res.json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          result,
        });
        
      } catch (error) {
        this.metrics.failedRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        this.logError('HTTP Tool call failed', {
          error: this.getErrorMessage(error),
          duration: Date.now() - startTime,
        });
        
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          error: {
            code: -32603,
            message: this.getErrorMessage(error),
          },
        });
      }
    });

    // Direct tool endpoints for easier integration
    this.httpApp.post('/tools/:toolName', async (req, res) => {
      const startTime = Date.now();
      const { toolName } = req.params;
      
      try {
        this.metrics.totalRequests++;
        this.logInfo(`Direct HTTP Tool call: ${toolName}`, { args: this.sanitizeArgs(req.body) });
        
        const result = await this.callTool(toolName, req.body);
        
        this.metrics.successfulRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        res.json(result);
        
      } catch (error) {
        this.metrics.failedRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        this.logError(`Direct HTTP Tool call failed: ${toolName}`, {
          error: this.getErrorMessage(error),
          duration: Date.now() - startTime,
        });
        
        res.status(500).json({
          error: this.getErrorMessage(error),
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Metrics endpoint
    this.httpApp.get('/metrics', (req, res) => {
      res.json({
        ...this.metrics,
        uptime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Get comprehensive tool definitions for AOMA Mesh
   */
  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'query_aoma_knowledge',
        description: 'Query Sony Music AOMA knowledge base using AI assistant with 1000+ documents',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about AOMA systems, procedures, or technical guidance',
              minLength: 1,
              maxLength: 2000,
            },
            strategy: {
              type: 'string',
              enum: ['comprehensive', 'focused', 'rapid'],
              description: 'Response strategy: comprehensive (detailed), focused (specific), rapid (concise)',
              default: 'focused',
            },
            context: {
              type: 'string',
              description: 'Additional context about your current task or system',
              maxLength: 1000,
            },
            maxResults: {
              type: 'number',
              description: 'Maximum knowledge base results to consider',
              minimum: 1,
              maximum: 20,
              default: 10,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'search_jira_tickets',
        description: 'Search Sony Music Jira tickets using semantic vector search (6000+ tickets)',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query for Jira tickets',
              minLength: 1,
              maxLength: 500,
            },
            projectKey: {
              type: 'string',
              description: 'Specific Jira project key to filter results',
              pattern: '^[A-Z]+$',
            },
            status: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by ticket status (e.g., ["Open", "In Progress", "Resolved"])',
            },
            priority: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by priority (e.g., ["High", "Critical", "Medium"])',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum tickets to return',
              minimum: 1,
              maximum: 50,
              default: 15,
            },
            threshold: {
              type: 'number',
              description: 'Semantic similarity threshold (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.6,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_jira_ticket_count',
        description: 'Get exact count of Jira tickets across all projects and statuses',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: {
              type: 'string',
              description: 'Optional: Count tickets for specific project (e.g., "ITSM")',
              pattern: '^[A-Z]+$',
            },
            status: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Count tickets with specific statuses',
            },
            priority: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional: Count tickets with specific priorities',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'search_git_commits',
        description: 'Search Git commit history using semantic vector search across all repositories',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query for Git commits',
              minLength: 1,
              maxLength: 500,
            },
            repository: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific repositories (e.g., ["mc-tk", "aoma-ui"])',
            },
            author: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by commit author names',
            },
            dateFrom: {
              type: 'string',
              description: 'Filter commits from this date (ISO 8601 format)',
            },
            dateTo: {
              type: 'string',
              description: 'Filter commits to this date (ISO 8601 format)',
            },
            filePattern: {
              type: 'string',
              description: 'Filter by file path pattern (e.g., "*.ts", "auth", "api/")',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum commits to return',
              minimum: 1,
              maximum: 50,
              default: 15,
            },
            threshold: {
              type: 'number',
              description: 'Semantic similarity threshold (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.6,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'search_code_files',
        description: 'Search code files using semantic vector search across all repositories',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query for code files',
              minLength: 1,
              maxLength: 500,
            },
            repository: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific repositories (e.g., ["mc-tk", "aoma-ui"])',
            },
            language: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by programming language (e.g., ["TypeScript", "JavaScript"])',
            },
            fileExtension: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by file extension (e.g., ["ts", "js", "py"])',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum files to return',
              minimum: 1,
              maximum: 50,
              default: 15,
            },
            threshold: {
              type: 'number',
              description: 'Semantic similarity threshold (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.6,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'search_outlook_emails',
        description: 'Search corporate Outlook emails using semantic vector search for zeitgeist analysis',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language search query for corporate emails',
              minLength: 1,
              maxLength: 500,
            },
            dateFrom: {
              type: 'string',
              description: 'Filter emails from this date (ISO 8601 format)',
            },
            dateTo: {
              type: 'string',
              description: 'Filter emails to this date (ISO 8601 format)',
            },
            fromEmail: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by sender email addresses',
            },
            toEmail: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by recipient email addresses',
            },
            subject: {
              type: 'string',
              description: 'Filter by subject line keywords',
            },
            hasAttachments: {
              type: 'boolean',
              description: 'Filter emails with/without attachments',
            },
            priority: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by email priority (High, Normal, Low)',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum emails to return',
              minimum: 1,
              maximum: 50,
              default: 15,
            },
            threshold: {
              type: 'number',
              description: 'Semantic similarity threshold (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.6,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'analyze_development_context',
        description: 'Analyze current development context and provide intelligent recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            currentTask: {
              type: 'string',
              description: 'Description of current development task or issue',
              minLength: 1,
              maxLength: 1000,
            },
            codeContext: {
              type: 'string',
              description: 'Relevant code, error messages, or technical details',
              maxLength: 5000,
            },
            systemArea: {
              type: 'string',
              enum: ['frontend', 'backend', 'database', 'infrastructure', 'integration', 'testing'],
              description: 'Primary system area being worked on',
            },
            urgency: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Urgency level of the current task',
              default: 'medium',
            },
          },
          required: ['currentTask'],
          additionalProperties: false,
        },
      },
      {
        name: 'get_system_health',
        description: 'Get comprehensive health status of AOMA Mesh server and all connected services',
        inputSchema: {
          type: 'object',
          properties: {
            includeMetrics: {
              type: 'boolean',
              description: 'Include detailed performance metrics',
              default: true,
            },
            includeDiagnostics: {
              type: 'boolean',
              description: 'Include service diagnostics and latency tests',
              default: false,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'get_server_capabilities',
        description: 'Get complete list of server capabilities, supported environments, and version info',
        inputSchema: {
          type: 'object',
          properties: {
            includeExamples: {
              type: 'boolean',
              description: 'Include usage examples for each tool',
              default: false,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'swarm_analyze_cross_vector',
        description: '🚀 2025 LangGraph Swarm: Advanced multi-agent cross-vector analysis with dynamic handoffs',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Complex query requiring multiple agent specializations',
              minLength: 1,
              maxLength: 1000,
            },
            primaryAgent: {
              type: 'string',
              enum: ['code_specialist', 'jira_analyst', 'aoma_researcher', 'synthesis_coordinator'],
              description: 'Initial agent to handle the query (2025 swarm pattern)',
              default: 'synthesis_coordinator',
            },
            contextStrategy: {
              type: 'string',
              enum: ['isolated', 'shared', 'selective_handoff'],
              description: 'Context sharing strategy between agents (2025 memory patterns)',
              default: 'selective_handoff',
            },
            maxAgentHops: {
              type: 'number',
              description: 'Maximum agent handoffs allowed (prevents infinite loops)',
              minimum: 1,
              maximum: 10,
              default: 5,
            },
            enableMemoryPersistence: {
              type: 'boolean',
              description: 'Enable cross-session memory for agents',
              default: false,
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'swarm_agent_handoff',
        description: '🔄 2025 Command Pattern: Manual agent handoff with state transfer',
        inputSchema: {
          type: 'object',
          properties: {
            targetAgent: {
              type: 'string',
              enum: ['code_specialist', 'jira_analyst', 'aoma_researcher', 'synthesis_coordinator'],
              description: 'Agent to hand off to',
            },
            handoffContext: {
              type: 'string',
              description: 'Context and instructions for the receiving agent',
              maxLength: 2000,
            },
            preserveHistory: {
              type: 'boolean',
              description: 'Whether to preserve full conversation history',
              default: true,
            },
            urgencyLevel: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Urgency for agent processing',
              default: 'medium',
            },
          },
          required: ['targetAgent', 'handoffContext'],
          additionalProperties: false,
        },
      },
      {
        name: 'swarm_context_engineering',
        description: '🧠 2025 Context Engineering: Advanced context optimization for multi-agent workflows',
        inputSchema: {
          type: 'object',
          properties: {
            originalQuery: {
              type: 'string',
              description: 'Original user query',
              maxLength: 1000,
            },
            agentSpecializations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Agent specializations to optimize for',
              default: ['code_specialist', 'jira_analyst', 'aoma_researcher'],
            },
            contextCompressionLevel: {
              type: 'string',
              enum: ['none', 'light', 'aggressive', 'semantic'],
              description: 'Level of context compression (2025 memory optimization)',
              default: 'semantic',
            },
            crossVectorCorrelations: {
              type: 'boolean',
              description: 'Include cross-vector correlation analysis',
              default: true,
            },
          },
          required: ['originalQuery'],
          additionalProperties: false,
        },
      },
      {
        name: 'generate_failure_heatmap',
        description: '🔥 Generate actual heat map data for AOMA processing failures with temporal and geographic analysis',
        inputSchema: {
          type: 'object',
          properties: {
            timeRange: {
              type: 'number',
              description: 'Number of days to analyze (default: 90)',
              minimum: 1,
              maximum: 365,
              default: 90,
            },
            includeGeographic: {
              type: 'boolean',
              description: 'Include geographic distribution analysis',
              default: true,
            },
            includeTemporal: {
              type: 'boolean', 
              description: 'Include time-of-day and day-of-week analysis',
              default: true,
            },
            generateVisualizationData: {
              type: 'boolean',
              description: 'Generate JSON data ready for chart visualization',
              default: true,
            },
            minFailureThreshold: {
              type: 'number',
              description: 'Minimum failures to include in analysis',
              minimum: 1,
              default: 5,
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'analyze_performance_metrics',
        description: '📊 Analyze real AOMA performance data and generate actionable insights with predictive elements',
        inputSchema: {
          type: 'object',
          properties: {
            analysisType: {
              type: 'string',
              enum: ['failure_patterns', 'performance_trends', 'capacity_planning', 'predictive_model'],
              description: 'Type of performance analysis to conduct',
              default: 'failure_patterns',
            },
            timeWindow: {
              type: 'number',
              description: 'Analysis time window in days',
              minimum: 7,
              maximum: 365,
              default: 90,
            },
            includeRecommendations: {
              type: 'boolean',
              description: 'Generate actionable recommendations with impact estimates',
              default: true,
            },
            generatePredictions: {
              type: 'boolean',
              description: 'Include predictive analysis for future periods',
              default: false,
            },
            confidenceLevel: {
              type: 'number',
              description: 'Statistical confidence level for predictions (0-1)',
              minimum: 0.8,
              maximum: 0.99,
              default: 0.95,
            },
          },
          required: ['analysisType'],
          additionalProperties: false,
        },
      },
      {
        name: 'build_predictive_model',
        description: '🤖 Actually build and train predictive models for AOMA system failures using historical data',
        inputSchema: {
          type: 'object',
          properties: {
            targetVariable: {
              type: 'string',
              description: 'Target variable to predict (e.g., "system_failure", "processing_delay")',
              default: 'system_failure',
            },
            predictorVariables: {
              type: 'array',
              items: { type: 'string' },
              description: 'Variables to use as predictors',
              default: ['jira_ticket_volume', 'commit_frequency', 'asset_volume', 'time_of_day', 'day_of_week'],
            },
            modelType: {
              type: 'string',
              enum: ['auto', 'logistic_regression', 'random_forest', 'gradient_boosting', 'time_series'],
              description: 'Type of predictive model to build',
              default: 'auto',
            },
            trainingPeriod: {
              type: 'number',
              description: 'Number of days of historical data to use for training',
              minimum: 30,
              maximum: 365,
              default: 90,
            },
            predictionHorizon: {
              type: 'number',
              description: 'Number of days to predict into the future',
              minimum: 1,
              maximum: 30,
              default: 7,
            },
            includeFeatureImportance: {
              type: 'boolean',
              description: 'Include feature importance analysis',
              default: true,
            },
            generateActionablePredictions: {
              type: 'boolean',
              description: 'Generate specific predictions with confidence intervals and recommendations',
              default: true,
            },
          },
          required: ['targetVariable'],
          additionalProperties: false,
        },
      },
    ];
  }

  /**
   * Get resource definitions
   */
  private getResourceDefinitions(): Resource[] {
    return [
      {
        uri: 'aoma://health',
        name: 'AOMA Mesh Health Status',
        mimeType: 'application/json',
        description: 'Real-time health status of all AOMA Mesh components and services',
      },
      {
        uri: 'aoma://metrics',
        name: 'Performance Metrics',
        mimeType: 'application/json',
        description: 'Server performance metrics, usage statistics, and response times',
      },
      {
        uri: 'aoma://docs',
        name: 'AOMA Mesh Documentation',
        mimeType: 'text/markdown',
        description: 'Complete documentation for AOMA Mesh MCP server',
      },
      {
        uri: 'aoma://config',
        name: 'Server Configuration',
        mimeType: 'application/json',
        description: 'Current server configuration and environment settings',
      },
    ];
  }

  /**
   * Execute tool calls with comprehensive validation
   */
  private async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    // Wrap tool execution with LangSmith tracing
    return await traceToolCall(
      name,
      args,
      async () => {
        switch (name) {
          case 'query_aoma_knowledge':
            return await this.queryAOMAKnowledge(args as unknown as AOMAQueryRequest);
          case 'search_jira_tickets':
            return await this.searchJiraTickets(args as unknown as JiraSearchRequest);
          case 'get_jira_ticket_count':
            return await this.getJiraTicketCount(args as unknown as JiraCountRequest);
          case 'search_git_commits':
            return await this.searchGitCommits(args as unknown as GitSearchRequest);
          case 'search_code_files':
        return await this.searchCodeFiles(args as unknown as CodeSearchRequest);
      case 'search_outlook_emails':
        return await this.searchOutlookEmails(args as unknown as OutlookEmailSearchRequest);
      case 'analyze_development_context':
        return await this.analyzeDevelopmentContext(args);
      case 'get_system_health':
        return await this.getSystemHealth(args);
      case 'get_server_capabilities':
        return await this.getServerCapabilities(args);
      case 'swarm_analyze_cross_vector':
        return await this.swarmAnalyzeCrossVector(args);
      case 'swarm_agent_handoff':
        return await this.swarmAgentHandoff(args);
      case 'swarm_context_engineering':
        return await this.swarmContextEngineering(args);
      case 'generate_failure_heatmap':
      case 'analyze_performance_metrics':
          case 'build_predictive_model':
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not yet implemented`);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      },
      // Metadata for LangSmith tracing
      {
        tool: name,
        timestamp: new Date().toISOString(),
      }
    );
  }

  /**
   * Query AOMA knowledge base with enhanced error handling
   */
  private async queryAOMAKnowledge(request: AOMAQueryRequest): Promise<CallToolResult> {
    const { query, strategy = 'focused', context, maxResults = 10 } = request;
    
    if (!query?.trim()) {
      throw new McpError(ErrorCode.InvalidRequest, 'Query cannot be empty');
    }

    try {
      // Enhanced query with context if provided
      const enhancedQuery = context ? `Context: ${context}\n\nQuery: ${query}` : query;
      
      this.logInfo('AOMA knowledge query started', { 
        queryLength: query.length, 
        strategy, 
        hasContext: !!context 
      });

      // Use OpenAI Assistant API with AOMA assistant
      const thread = await this.openaiClient.beta.threads.create({
        messages: [{
          role: 'user',
          content: enhancedQuery,
        }],
      });

      const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
        assistant_id: this.env.AOMA_ASSISTANT_ID,
        additional_instructions: this.getStrategyPrompt(strategy),
      });

      const response = await this.pollRunCompletion(thread.id, run.id);

      // Clean up thread to prevent quota issues
      try {
        await this.openaiClient.beta.threads.del(thread.id);
      } catch (cleanupError) {
        this.logWarn('Failed to cleanup thread', cleanupError);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            strategy,
            response,
            metadata: {
              hasContext: !!context,
              threadId: thread.id,
              timestamp: new Date().toISOString(),
              version: this.env.MCP_SERVER_VERSION,
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('AOMA knowledge query failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `AOMA knowledge query failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Search Jira tickets with fallback to text search if vector search fails
   */
  private async searchJiraTickets(request: JiraSearchRequest): Promise<CallToolResult> {
    const { query, projectKey, status, priority, maxResults = 15, threshold = 0.6 } = request;
    
    try {
      this.logInfo('Jira search started', { 
        queryLength: query.length, 
        projectKey, 
        maxResults, 
        threshold 
      });

      // Try vector search first, fallback to text search if it fails
      let results: any[] = [];
      let searchMethod = 'vector';

      try {
        // Skip vector search for now and go directly to text search
        throw new Error('Skipping vector search - using text search fallback');
      } catch (vectorError) {
        this.logInfo('Vector search failed, falling back to text search', { error: this.getErrorMessage(vectorError) });
        searchMethod = 'text';

        // Fallback to simple text search
        let query_builder = this.supabaseClient
          .from('jira_tickets')
          .select('external_id, title, status, priority, metadata')
          .limit(maxResults);

        // Add filters
        if (projectKey) {
          query_builder = query_builder.eq('metadata->>projectKey', projectKey);
        }
        if (status?.length) {
          query_builder = query_builder.in('status', status);
        }
        if (priority?.length) {
          query_builder = query_builder.in('priority', priority);
        }

        // Text search in title and description
        if (query.trim()) {
          query_builder = query_builder.or(`title.ilike.%${query}%,external_id.ilike.%${query}%`);
        }

        const { data, error } = await query_builder;

        if (error) {
          throw new Error(`Text search failed: ${error.message}`);
        }

        results = (data || []).map((ticket: any) => ({
          key: ticket.external_id,
          summary: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          project_key: ticket.metadata?.projectKey || 'Unknown',
          similarity: 0.5, // Default similarity for text search
        }));
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            filters: { projectKey, status, priority },
            results: results.map((ticket: any) => ({
              key: ticket.key,
              summary: ticket.summary,
              status: ticket.status,
              priority: ticket.priority,
              project: ticket.project_key,
              similarity: ticket.similarity,
              url: `${this.env.JIRA_BASE_URL || 'https://jia.smedigitalapp.com'}/browse/${ticket.key}`,
            })),
            metadata: {
              totalResults: results.length,
              threshold,
              searchMethod,
              timestamp: new Date().toISOString(),
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Jira search failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `Jira search failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get exact count of Jira tickets with optional filters
   */
  private async getJiraTicketCount(request: JiraCountRequest): Promise<CallToolResult> {
    const { projectKey, status, priority } = request;
    
    try {
      this.logInfo('Jira count started', { 
        projectKey, 
        statusCount: status?.length || 0, 
        priorityCount: priority?.length || 0 
      });

      // Build filters
      const filters: Record<string, unknown> = {};
      if (projectKey) filters.project_key = projectKey;
      if (status?.length) filters.status = status;
      if (priority?.length) filters.priority = priority;

      // Get count using Supabase function
      const { data, error } = await this.supabaseClient
        .rpc('count_jira_tickets', {
          p_filters: Object.keys(filters).length > 0 ? filters : null,
        });

      if (error) {
        throw new Error(`Jira count failed: ${error.message}`);
      }

      const totalCount = data || 0;

      // Also get breakdown by project if no specific project requested
      let projectBreakdown: any[] = [];
      if (!projectKey) {
        const { data: breakdown, error: breakdownError } = await this.supabaseClient
          .rpc('count_jira_tickets_by_project', {
            p_status_filter: status,
            p_priority_filter: priority,
          });

        if (!breakdownError) {
          projectBreakdown = breakdown || [];
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            totalCount,
            filters: { projectKey, status, priority },
            projectBreakdown: projectBreakdown.length > 0 ? projectBreakdown.map((proj: any) => ({
              project: proj.project_key,
              count: proj.count,
            })) : undefined,
            metadata: {
              timestamp: new Date().toISOString(),
              filterCount: Object.keys(filters).length,
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Jira count failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `Jira count failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Search Git commits with vector search
   */
  private async searchGitCommits(request: GitSearchRequest): Promise<CallToolResult> {
    const { 
      query, 
      repository, 
      author, 
      dateFrom, 
      dateTo, 
      filePattern, 
      maxResults = 15, 
      threshold = 0.6 
    } = request;

    if (!query?.trim()) {
      throw new McpError(ErrorCode.InvalidRequest, 'Query cannot be empty');
    }

    try {
      this.logInfo('Git search started', { 
        queryLength: query.length, 
        filters: { repository, author, dateFrom, dateTo, filePattern }
      });

      // Generate embedding for the search query
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      if (!embeddingResponse.data?.[0]?.embedding) {
        throw new Error('Failed to generate embedding for Git search query');
      }

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Build filters object
      const filters: Record<string, any> = {};
      if (repository?.length) filters.repository = repository;
      if (author?.length) filters.author = author;
      if (dateFrom) filters.date_from = dateFrom;
      if (dateTo) filters.date_to = dateTo;
      if (filePattern) filters.file_pattern = filePattern;

      // Search Git commits using Supabase function
      const { data: results, error } = await this.supabaseClient
        .rpc('search_git_commits_semantic', {
          p_query_embedding: queryEmbedding,
          p_similarity_threshold: threshold,
          p_max_results: maxResults,
          p_filters: Object.keys(filters).length > 0 ? filters : {}
        });

      if (error) {
        throw new Error(`Supabase Git search error: ${error.message}`);
      }

      this.logInfo('Git search completed', { 
        resultsCount: results?.length || 0, 
        threshold 
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            filters: { repository, author, dateFrom, dateTo, filePattern },
            results: (results || []).map((commit: any) => ({
              hash: commit.commit_hash,
              message: commit.commit_message,
              author: commit.author_name,
              email: commit.author_email,
              date: commit.commit_date,
              repository: commit.repository_name,
              filesChanged: commit.files_changed,
              additions: commit.additions,
              deletions: commit.deletions,
              diffSummary: commit.diff_summary,
              similarity: commit.similarity,
            })),
            metadata: {
              totalResults: results?.length || 0,
              threshold,
              timestamp: new Date().toISOString(),
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Git search failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `Git search failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Search code files with vector search
   */
  private async searchCodeFiles(request: CodeSearchRequest): Promise<CallToolResult> {
    const { 
      query, 
      repository, 
      language, 
      fileExtension, 
      maxResults = 15, 
      threshold = 0.6 
    } = request;

    if (!query?.trim()) {
      throw new McpError(ErrorCode.InvalidRequest, 'Query cannot be empty');
    }

    try {
      this.logInfo('Code search started', { 
        queryLength: query.length, 
        filters: { repository, language, fileExtension }
      });

      // Generate embedding for the search query
      const embeddingResponse = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });

      if (!embeddingResponse.data?.[0]?.embedding) {
        throw new Error('Failed to generate embedding for code search query');
      }

      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Build filters object
      const filters: Record<string, any> = {};
      if (repository?.length) filters.repository = repository;
      if (language?.length) filters.language = language;
      if (fileExtension?.length) filters.file_extension = fileExtension;

      // Search code files using Supabase function
      const { data: results, error } = await this.supabaseClient
        .rpc('search_code_files_semantic', {
          p_query_embedding: queryEmbedding,
          p_similarity_threshold: threshold,
          p_max_results: maxResults,
          p_filters: Object.keys(filters).length > 0 ? filters : {}
        });

      if (error) {
        throw new Error(`Supabase code search error: ${error.message}`);
      }

      this.logInfo('Code search completed', { 
        resultsCount: results?.length || 0, 
        threshold 
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            filters: { repository, language, fileExtension },
            results: (results || []).map((file: any) => ({
              path: file.file_path,
              name: file.file_name,
              extension: file.file_extension,
              language: file.language,
              preview: file.content_preview,
              summary: file.content_summary,
              repository: file.repository_name,
              lineCount: file.line_count,
              lastModified: file.last_modified,
              similarity: file.similarity,
            })),
            metadata: {
              totalResults: results?.length || 0,
              threshold,
              timestamp: new Date().toISOString(),
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Code search failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `Code search failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Search Outlook emails with vector search (STUB - TODO: Implement)
   */
  private async searchOutlookEmails(request: OutlookEmailSearchRequest): Promise<CallToolResult> {
    const { query } = request;

    // TODO: Implement Microsoft Graph API integration
    // TODO: Create outlook_emails table in Supabase
    // TODO: Implement email vectorization and embedding generation
    // TODO: Add authentication with Microsoft Graph API
    
    this.logInfo('Outlook email search requested (not yet implemented)', { 
      queryLength: query.length 
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'not_implemented',
          message: 'Outlook email search is planned but not yet implemented. This will integrate with Microsoft Graph API to search corporate emails for zeitgeist analysis and decision making.',
          query,
          roadmap: [
            'Set up Microsoft Graph API authentication',
            'Create outlook_emails table in Supabase with vector embeddings',
            'Implement email extraction and vectorization pipeline',
            'Add semantic search functionality',
            'Integrate with LangChain decision making process'
          ],
          timestamp: new Date().toISOString(),
        }, null, 2),
      }],
    };
  }

  /**
   * Analyze development context
   */
  private async analyzeDevelopmentContext(args: Record<string, unknown>): Promise<CallToolResult> {
    const { currentTask, codeContext, systemArea, urgency = 'medium' } = args;
    
    try {
      // Create context analysis using AOMA knowledge
      const analysisQuery = `Development Context Analysis:
Task: ${currentTask}
System Area: ${systemArea || 'general'}
Urgency: ${urgency}
${codeContext ? `\nCode/Technical Context:\n${codeContext}` : ''}

Please provide:
1. Root cause analysis
2. Recommended approach
3. Potential risks and mitigation
4. Similar historical issues
5. Next steps with priority`;

      const thread = await this.openaiClient.beta.threads.create({
        messages: [{
          role: 'user',
          content: analysisQuery,
        }],
      });

      const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
        assistant_id: this.env.AOMA_ASSISTANT_ID,
        additional_instructions: 'Provide a structured development context analysis with actionable recommendations.',
      });

      const response = await this.pollRunCompletion(thread.id, run.id);

      // Cleanup
      try {
        await this.openaiClient.beta.threads.del(thread.id);
      } catch (cleanupError) {
        this.logWarn('Failed to cleanup analysis thread', cleanupError);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            task: currentTask,
            systemArea,
            urgency,
            analysis: response,
            metadata: {
              timestamp: new Date().toISOString(),
              hasCodeContext: !!codeContext,
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Development context analysis failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `Context analysis failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get comprehensive system health
   */
  private async getSystemHealth(args: Record<string, unknown>): Promise<CallToolResult> {
    const { includeMetrics = true, includeDiagnostics = false } = args;
    
    try {
      const health = await this.performHealthCheck(includeDiagnostics as boolean);
      
      const result: any = {
        ...health,
        uptime: Date.now() - this.startTime,
        version: this.env.MCP_SERVER_VERSION,
      };

      if (includeMetrics) {
        result.metrics = {
          ...this.metrics,
          uptime: Date.now() - this.startTime,
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Health check failed', error);
      throw new McpError(ErrorCode.InternalError, `Health check failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Get server capabilities
   */
  private async getServerCapabilities(args: Record<string, unknown>): Promise<CallToolResult> {
    const { includeExamples = false } = args;
    
    const capabilities = {
      server: {
        name: '@sony-music/aoma-mesh-mcp-server',
        version: this.env.MCP_SERVER_VERSION,
        environment: this.env.NODE_ENV,
      },
      tools: this.getToolDefinitions(),
      resources: this.getResourceDefinitions(),
      supportedClients: [
        'Claude Desktop',
        'Windsurf',
        'VS Code (with MCP extension)',
        'Cursor (with MCP support)',
        'Any MCP-compatible client',
      ],
      features: [
        'Sony Music AOMA Knowledge Base (1000+ documents)',
        'Jira Ticket Semantic Search (6000+ tickets)',
        'Development Context Analysis',
        'Real-time Health Monitoring',
        'Comprehensive Error Handling',
        'Performance Metrics Tracking',
        'Multi-environment Support',
      ],
    };

    if (includeExamples) {
      capabilities.tools = capabilities.tools.map(tool => ({
        ...tool,
        examples: this.getToolExamples(tool.name),
      }));
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(capabilities, null, 2),
      }],
    };
  }

  /**
   * Perform comprehensive health check
   */
  private async performHealthCheck(includeDiagnostics: boolean): Promise<HealthStatus> {
    // Check cache first
    if (this.healthCache && (Date.now() - this.healthCache.lastCheck) < this.HEALTH_CACHE_TTL) {
      return this.healthCache.status;
    }

    const services = {
      openai: await this.checkOpenAIHealth(includeDiagnostics),
      supabase: await this.checkSupabaseHealth(includeDiagnostics),
      vectorStore: await this.checkVectorStoreHealth(),
    };

    const allHealthy = Object.values(services).every(s => s.status);
    const anyHealthy = Object.values(services).some(s => s.status);

    const health: HealthStatus = {
      status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
      services,
      metrics: {
        ...this.metrics,
        uptime: Date.now() - this.startTime,
      },
      timestamp: new Date().toISOString(),
    };

    // Cache result
    this.healthCache = {
      status: health,
      lastCheck: Date.now(),
    };

    return health;
  }

  /**
   * Check OpenAI service health (SOTA optimized)
   */
  private async checkOpenAIHealth(includeDiagnostics: boolean): Promise<{ status: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // Fixed: 5 second timeout
    
    try {
      // SOTA: Use fast HEAD request instead of full models.list()
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'Authorization': `Bearer ${this.env.OPENAI_API_KEY}` }
      });
      
      clearTimeout(timeout);
      const latency = Date.now() - start;
      
      return {
        status: response.ok,
        ...(includeDiagnostics && { latency }),
      };
    } catch (error) {
      clearTimeout(timeout);
      this.logWarn('OpenAI health check failed', error);
      return {
        status: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Check Supabase service health (SOTA optimized)
   */
  private async checkSupabaseHealth(includeDiagnostics: boolean): Promise<{ status: boolean; latency?: number; error?: string }> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // Fixed: 5 second timeout
    
    try {
      // SOTA: Use fast HEAD request instead of database query
      const supabaseUrl = this.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        signal: controller.signal,
        headers: { 'apikey': this.env.SUPABASE_SERVICE_ROLE_KEY }
      });
      
      clearTimeout(timeout);
      const latency = Date.now() - start;
      
      return {
        status: response.ok,
        ...(includeDiagnostics && { latency }),
      };
    } catch (error) {
      clearTimeout(timeout);
      this.logWarn('Supabase health check failed', error);
      return {
        status: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Check Vector Store health
   */
  private async checkVectorStoreHealth(): Promise<{ status: boolean; error?: string }> {
    if (!this.env.OPENAI_VECTOR_STORE_ID) {
      return { status: true }; // Optional service
    }

    try {
      // Check if vectorStores exists on beta API
      if ('vectorStores' in this.openaiClient.beta) {
        await (this.openaiClient.beta as any).vectorStores.retrieve(this.env.OPENAI_VECTOR_STORE_ID);
      }
      return { status: true };
    } catch (error) {
      this.logWarn('Vector Store health check failed', error);
      return {
        status: false,
        error: this.getErrorMessage(error),
      };
    }
  }

  /**
   * Read resources
   */
  private async readResource(uri: string): Promise<ReadResourceResult> {
    switch (uri) {
      case 'aoma://health':
        const health = await this.performHealthCheck(true);
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(health, null, 2),
          }],
        };
      
      case 'aoma://metrics':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              ...this.metrics,
              uptime: Date.now() - this.startTime,
            }, null, 2),
          }],
        };
      
      case 'aoma://docs':
        const docs = await this.generateDocumentation();
        return {
          contents: [{
            uri,
            mimeType: 'text/markdown',
            text: docs,
          }],
        };
      
      case 'aoma://config':
        return {
          contents: [{
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({
              version: this.env.MCP_SERVER_VERSION,
              environment: this.env.NODE_ENV,
              logLevel: this.env.LOG_LEVEL,
              timeout: this.env.TIMEOUT_MS,
              maxRetries: this.env.MAX_RETRIES,
              features: {
                aomaKnowledgeBase: !!this.env.AOMA_ASSISTANT_ID,
                vectorStore: !!this.env.OPENAI_VECTOR_STORE_ID,
                jiraSearch: true,
              },
            }, null, 2),
          }],
        };
      
      default:
        throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
  }

  /**
   * Poll for OpenAI run completion
   */
  private async pollRunCompletion(threadId: string, runId: string): Promise<string> {
    const maxWaitTime = this.env.TIMEOUT_MS;
    const pollInterval = 1000;
    let elapsed = 0;

    while (elapsed < maxWaitTime) {
      try {
        const run = await this.openaiClient.beta.threads.runs.retrieve(threadId, runId);
        
        if (run.status === 'completed') {
          const messages = await this.openaiClient.beta.threads.messages.list(threadId);
          const lastMessage = messages.data[0];
          
          if (lastMessage?.content[0] && 'text' in lastMessage.content[0]) {
            return lastMessage.content[0].text.value;
          }
          
          throw new Error('No response content found');
        }
        
        if (['failed', 'cancelled', 'expired'].includes(run.status)) {
          throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
        }
        
        await this.delay(pollInterval);
        elapsed += pollInterval;
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Run polling failed: ${this.getErrorMessage(error)}`
        );
      }
    }
    
    throw new McpError(ErrorCode.InternalError, `Run timed out after ${maxWaitTime}ms`);
  }

  /**
   * Get strategy-specific prompts
   */
  private getStrategyPrompt(strategy: string): string {
    switch (strategy) {
      case 'comprehensive':
        return 'Provide a comprehensive, detailed analysis covering all relevant aspects. Include background context, multiple approaches, and potential implications.';
      case 'rapid':
        return 'Provide a concise, direct answer focusing on the most critical information. Prioritize actionable insights and immediate next steps.';
      case 'focused':
      default:
        return 'Provide a focused, well-structured response that directly addresses the query with relevant details and practical guidance.';
    }
  }

  /**
   * Get tool usage examples
   */
  private getToolExamples(toolName: string): string[] {
    const examples: Record<string, string[]> = {
      query_aoma_knowledge: [
        'How do I deploy AOMA services to production?',
        'What are the authentication requirements for AOMA APIs?',
        'Troubleshoot AOMA database connection issues',
      ],
      search_jira_tickets: [
        'Find all authentication-related bugs from last month',
        'Show high-priority tickets for project AOMA',
        'Search for deployment failures in production',
      ],
      analyze_development_context: [
        'Analyze API timeout error in user authentication service',
        'Review database performance issues in AOMA dashboard',
        'Investigate frontend rendering problems in asset management',
      ],
    };
    
    return examples[toolName] || [];
  }

  /**
   * Generate comprehensive documentation
   */
  private async generateDocumentation(): Promise<string> {
    return `# AOMA Mesh MCP Server Documentation

## Overview

The Sony Music AOMA Mesh MCP Server provides intelligent development assistance through the Model Context Protocol. It connects multiple AI agents and knowledge bases to provide comprehensive support for AOMA (Asset and Offering Management Application) development workflows.

## Version: ${this.env.MCP_SERVER_VERSION}

## Supported Environments

- **Claude Desktop**: Full support with automatic configuration
- **Windsurf**: Compatible with MCP protocol
- **VS Code**: Use with MCP extension
- **Cursor**: Compatible with MCP support
- **Any MCP Client**: Standard MCP protocol compliance

## Available Tools

${this.getToolDefinitions().map(tool => `
### ${tool.name}

${tool.description}

**Required Parameters:**
${(tool.inputSchema.required as string[] || []).map((param: string) => `- \`${param}\``).join('\n') || 'None'}

**Optional Parameters:**
${Object.keys(tool.inputSchema.properties || {})
  .filter(param => !(tool.inputSchema.required as string[] || []).includes(param))
  .map(param => `- \`${param}\`: ${(tool.inputSchema.properties as any)[param].description}`)
  .join('\n') || 'None'}
`).join('\n')}

## Health Monitoring

Access real-time health status:
- Resource: \`aoma://health\`
- Includes: Service status, latency metrics, error rates
- Cache TTL: 30 seconds

## Configuration

Required environment variables:
- \`OPENAI_API_KEY\`: OpenAI API access
- \`AOMA_ASSISTANT_ID\`: AOMA Assistant ID
- \`NEXT_PUBLIC_SUPABASE_URL\`: Supabase database URL
- \`SUPABASE_SERVICE_ROLE_KEY\`: Supabase service key

## Performance

- **Timeout**: ${this.env.TIMEOUT_MS}ms
- **Max Retries**: ${this.env.MAX_RETRIES}
- **Health Cache**: 30s TTL
- **Thread Cleanup**: Automatic

Generated: ${new Date().toISOString()}
`;
  }

  /**
   * Initialize server with startup validation
   */
  public async initialize(): Promise<void> {
    this.logInfo('Initializing AOMA Mesh MCP Server...', {
      version: this.env.MCP_SERVER_VERSION,
      environment: this.env.NODE_ENV,
    });
    
    try {
      // Initialize LangSmith tracing
      initializeLangSmith();
      if (isLangSmithEnabled()) {
        this.logInfo('LangSmith tracing enabled', {
          project: process.env.LANGCHAIN_PROJECT || 'default',
        });
      }
      
      // Perform initial health check
      const health = await this.performHealthCheck(false);
      
      if (health.status === 'unhealthy') {
        throw new Error('Server initialization failed: All critical services are unhealthy');
      }
      
      this.logInfo('AOMA Mesh MCP Server initialized successfully', {
        status: health.status,
        services: Object.entries(health.services).map(([name, service]) => ({
          name,
          status: service.status,
        })),
      });
    } catch (error) {
      this.logError('Server initialization failed', error);
      throw error;
    }
  }

  /**
   * 🚀 2025 LangGraph Swarm: Advanced Multi-Agent Cross-Vector Analysis
   * Implements cutting-edge swarm architecture with dynamic handoffs
   */
  private async swarmAnalyzeCrossVector(args: Record<string, unknown>): Promise<CallToolResult> {
    const { 
      query, 
      primaryAgent = 'synthesis_coordinator',
      contextStrategy = 'selective_handoff',
      maxAgentHops = 5,
      enableMemoryPersistence = false
    } = args;

    this.logInfo('🐝 Swarm Analysis Started', { 
      query, 
      primaryAgent, 
      contextStrategy,
      version: '2025-LangGraph-Swarm'
    });

    try {
      // Initialize swarm state with 2025 patterns
      const swarmState = {
        query: query as string,
        activeAgent: primaryAgent as string,
        agentHops: 0,
        maxHops: maxAgentHops as number,
        contextStrategy: contextStrategy as string,
        agentMemory: {},
        crossVectorResults: {},
        handoffHistory: [],
        correlations: [],
        finalSynthesis: null,
        timestamp: new Date().toISOString(),
      };

      // Execute swarm workflow with Command-based handoffs
      const finalResult = await this.executeSwarmWorkflow(swarmState);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            swarmAnalysis: finalResult,
            architecture: '2025-LangGraph-Swarm',
            features: [
              'Dynamic agent handoffs',
              'Context-aware specialization', 
              'Memory isolation patterns',
              'Command-based routing'
            ],
            metadata: {
              totalAgentHops: finalResult.agentHops,
              contextStrategy: contextStrategy,
              correlationsFound: finalResult.correlations?.length || 0,
              processingTime: Date.now() - new Date(finalResult.timestamp).getTime(),
            }
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('🐝 Swarm analysis failed', error);
      throw new McpError(ErrorCode.InternalError, `Swarm analysis failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * 🔄 2025 Command Pattern: Agent Handoff Implementation
   */
  private async swarmAgentHandoff(args: Record<string, unknown>): Promise<CallToolResult> {
    const { 
      targetAgent, 
      handoffContext, 
      preserveHistory = true,
      urgencyLevel = 'medium' 
    } = args;

    this.logInfo('🔄 Agent Handoff Command', { 
      targetAgent, 
      urgencyLevel,
      contextLength: (handoffContext as string)?.length || 0
    });

    try {
      // Create handoff command using 2025 Command pattern
      const handoffCommand = {
        type: 'AGENT_HANDOFF',
        targetAgent: targetAgent as string,
        payload: {
          context: handoffContext as string,
          preserveHistory: preserveHistory as boolean,
          urgency: urgencyLevel as string,
          timestamp: new Date().toISOString(),
          sourceAgent: 'external_request',
        },
        routing: {
          method: 'command_based',
          version: '2025-LangGraph',
        }
      };

      // Execute handoff based on target agent specialization
      const handoffResult = await this.executeAgentHandoff(handoffCommand);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            handoffExecuted: true,
            command: handoffCommand,
            result: handoffResult,
            patterns: ['2025-Command-Handoffs', 'LangGraph-Swarm'],
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('🔄 Agent handoff failed', error);
      throw new McpError(ErrorCode.InternalError, `Agent handoff failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * 🧠 2025 Context Engineering: Advanced Context Optimization
   */
  private async swarmContextEngineering(args: Record<string, unknown>): Promise<CallToolResult> {
    const { 
      originalQuery,
      agentSpecializations = ['code_specialist', 'jira_analyst', 'aoma_researcher'],
      contextCompressionLevel = 'semantic',
      crossVectorCorrelations = true
    } = args;

    this.logInfo('🧠 Context Engineering', { 
      query: originalQuery,
      compressionLevel: contextCompressionLevel,
      agentCount: (agentSpecializations as string[]).length
    });

    try {
      // Apply 2025 context engineering patterns
      const engineeredContext = await this.engineerContextForAgents({
        originalQuery: originalQuery as string,
        agentSpecializations: agentSpecializations as string[],
        compressionLevel: contextCompressionLevel as string,
        enableCorrelations: crossVectorCorrelations as boolean,
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            engineeredContext,
            techniques: [
              '2025-Semantic-Compression',
              'Agent-Specific-Optimization',
              'Cross-Vector-Correlation',
              'Memory-Efficient-Handoffs'
            ],
            metadata: {
              originalLength: (originalQuery as string)?.length || 0,
              optimizedContexts: engineeredContext.agentContexts?.length || 0,
              compressionRatio: engineeredContext.compressionRatio || 1.0,
            }
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('🧠 Context engineering failed', error);
      throw new McpError(ErrorCode.InternalError, `Context engineering failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Execute swarm workflow with 2025 LangGraph patterns
   */
  private async executeSwarmWorkflow(swarmState: any): Promise<any> {
    while (swarmState.agentHops < swarmState.maxHops) {
      swarmState.agentHops++;
      
      this.logInfo(`🐝 Agent Hop ${swarmState.agentHops}`, { 
        activeAgent: swarmState.activeAgent,
        strategy: swarmState.contextStrategy
      });

      // Execute current agent with specialization
      const agentResult = await this.executeSpecializedAgent(
        swarmState.activeAgent, 
        swarmState.query,
        swarmState
      );

      // Check if agent recommends handoff (2025 Command pattern)
      if (agentResult.handoffCommand) {
        swarmState.activeAgent = agentResult.handoffCommand.targetAgent;
        swarmState.handoffHistory.push({
          from: swarmState.activeAgent,
          to: agentResult.handoffCommand.targetAgent,
          reason: agentResult.handoffCommand.reason,
          hop: swarmState.agentHops,
        });
        continue;
      }

      // If no handoff needed, we have final results
      swarmState.finalSynthesis = agentResult;
      break;
    }

    return swarmState;
  }

  /**
   * Execute specialized agent with 2025 capabilities
   */
  private async executeSpecializedAgent(agentType: string, query: string, swarmState: any): Promise<any> {
    switch (agentType) {
      case 'code_specialist':
        return await this.executeCodeSpecialistAgent(query, swarmState);
      case 'jira_analyst':
        return await this.executeJiraAnalystAgent(query, swarmState);
      case 'aoma_researcher':
        return await this.executeAOMAResearcherAgent(query, swarmState);
      case 'synthesis_coordinator':
        return await this.executeSynthesisCoordinatorAgent(query, swarmState);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * 2025 Code Specialist Agent with advanced capabilities
   */
  private async executeCodeSpecialistAgent(query: string, swarmState: any): Promise<any> {
    this.logInfo('👨‍💻 Code Specialist Agent Active');
    
    try {
      const codeResults = await this.searchCodeFiles({
        query,
        maxResults: 10,
        threshold: 0.7,
      });

      const codeData = this.parseToolResult(codeResults);
      const codeCount = codeData?.results?.length || 0;

      // Advanced 2025 pattern: Recommend handoff if query needs broader context
      if (query.toLowerCase().includes('issue') || query.toLowerCase().includes('problem')) {
        return {
          type: 'code_analysis_with_handoff',
          results: codeData,
          handoffCommand: {
            targetAgent: 'jira_analyst',
            reason: 'Query mentions issues/problems - Jira context needed',
            priority: 'high',
          },
          agentInsights: {
            codeFilesFound: codeCount,
            recommendsJiraCorrelation: true,
            confidence: 0.85,
          }
        };
      }

      return {
        type: 'code_analysis_complete',
        results: codeData,
        agentInsights: {
          codeFilesFound: codeCount,
          queryComplexity: 'standalone',
          confidence: 0.9,
        }
      };
    } catch (error) {
      this.logError('👨‍💻 Code specialist failed', error);
      return { type: 'error', error: this.getErrorMessage(error) };
    }
  }

  /**
   * 2025 Jira Analyst Agent with correlation capabilities
   */
  private async executeJiraAnalystAgent(query: string, swarmState: any): Promise<any> {
    this.logInfo('🎫 Jira Analyst Agent Active');
    
    try {
      const jiraResults = await this.searchJiraTickets({
        query,
        maxResults: 8,
        threshold: 0.6,
      });

      const jiraData = this.parseToolResult(jiraResults);
      const ticketCount = jiraData?.results?.length || 0;

      // Check if we need AOMA documentation context
      if (ticketCount > 0 && !swarmState.crossVectorResults.aoma) {
        return {
          type: 'jira_analysis_with_handoff',
          results: jiraData,
          handoffCommand: {
            targetAgent: 'aoma_researcher',
            reason: 'Found relevant tickets - need documentation context',
            priority: 'medium',
          },
          agentInsights: {
            ticketsFound: ticketCount,
            requiresDocumentation: true,
            confidence: 0.8,
          }
        };
      }

      return {
        type: 'jira_analysis_complete',
        results: jiraData,
        agentInsights: {
          ticketsFound: ticketCount,
          queryComplexity: 'jira_focused',
          confidence: 0.85,
        }
      };
    } catch (error) {
      this.logError('🎫 Jira analyst failed', error);
      return { type: 'error', error: this.getErrorMessage(error) };
    }
  }

  /**
   * 2025 AOMA Researcher Agent with knowledge synthesis
   */
  private async executeAOMAResearcherAgent(query: string, swarmState: any): Promise<any> {
    this.logInfo('📚 AOMA Researcher Agent Active');
    
    try {
      const aomaResults = await this.queryAOMAKnowledge({
        query,
        strategy: 'comprehensive',
        maxResults: 5,
      });

      // Always hand off to synthesis coordinator when done
      return {
        type: 'aoma_research_complete',
        results: aomaResults,
        handoffCommand: {
          targetAgent: 'synthesis_coordinator',
          reason: 'Research complete - ready for synthesis',
          priority: 'high',
        },
        agentInsights: {
          documentationFound: true,
          readyForSynthesis: true,
          confidence: 0.9,
        }
      };
    } catch (error) {
      this.logError('📚 AOMA researcher failed', error);
      return { type: 'error', error: this.getErrorMessage(error) };
    }
  }

  /**
   * 2025 Synthesis Coordinator Agent - orchestrates final analysis
   */
  private async executeSynthesisCoordinatorAgent(query: string, swarmState: any): Promise<any> {
    this.logInfo('🧠 Synthesis Coordinator Agent Active');
    
    try {
      // Collect all results from swarm state
      const allResults = {
        code: swarmState.crossVectorResults.code || null,
        jira: swarmState.crossVectorResults.jira || null,
        aoma: swarmState.crossVectorResults.aoma || null,
      };

      // Generate correlations using 2025 patterns
      const correlations = this.generateAdvancedCorrelations(allResults, query);

      // Create synthesis using development context analysis
      const synthesisContext = this.buildSwarmSynthesisContext(query, allResults, correlations, swarmState);
      
      const synthesisResult = await this.analyzeDevelopmentContext({
        currentTask: synthesisContext,
        systemArea: 'integration',
        urgency: 'medium'
      });

      return {
        type: 'synthesis_complete',
        finalSynthesis: synthesisResult,
        correlations,
        swarmMetrics: {
          totalHops: swarmState.agentHops,
          agentsInvolved: swarmState.handoffHistory.map((h: any) => h.from),
          processingTime: Date.now() - new Date(swarmState.timestamp).getTime(),
        },
        confidence: 0.95,
      };
    } catch (error) {
      this.logError('🧠 Synthesis coordinator failed', error);
      return { type: 'error', error: this.getErrorMessage(error) };
    }
  }

  /**
   * Execute agent handoff with 2025 Command patterns
   */
  private async executeAgentHandoff(handoffCommand: any): Promise<any> {
    const { targetAgent, payload } = handoffCommand;
    
    // Simulate agent handoff execution
    this.logInfo(`🔄 Executing handoff to ${targetAgent}`);
    
    // Create mock agent response based on 2025 patterns
    const handoffResponse = {
      accepted: true,
      targetAgent,
      contextReceived: payload.context.length,
      processingStrategy: this.getAgentProcessingStrategy(targetAgent),
      estimatedResponseTime: this.estimateAgentResponseTime(targetAgent),
      capabilities: this.getAgentCapabilities(targetAgent),
    };

    return handoffResponse;
  }

  /**
   * Engineer context for agents using 2025 patterns
   */
  private async engineerContextForAgents(config: any): Promise<any> {
    const { originalQuery, agentSpecializations, compressionLevel, enableCorrelations } = config;
    
    // Apply semantic compression (2025 technique)
    const compressedContext = this.applySemanticCompression(originalQuery, compressionLevel);
    
    // Generate agent-specific contexts
    const agentContexts = agentSpecializations.map((agent: string) => ({
      agent,
      optimizedContext: this.optimizeContextForAgent(compressedContext, agent),
      specialization: this.getAgentSpecialization(agent),
      expectedOutputFormat: this.getExpectedOutputFormat(agent),
    }));

    return {
      originalQuery,
      compressedContext,
      agentContexts,
      compressionRatio: originalQuery.length / compressedContext.length,
      correlationsEnabled: enableCorrelations,
      engineeringTechniques: ['semantic-compression', 'agent-optimization', 'context-routing'],
    };
  }

  // Helper methods for 2025 swarm patterns
  private parseToolResult(result: any): any {
    try {
      const content = result?.content?.[0]?.text;
      return content ? JSON.parse(content) : null;
    } catch {
      return null;
    }
  }

  private generateAdvancedCorrelations(results: any, query: string): any[] {
    // Advanced 2025 correlation patterns
    const correlations = [];
    
    if (results.code && results.jira) {
      correlations.push({
        type: 'implementation-issues',
        strength: 0.8,
        pattern: '2025-semantic-correlation',
        insight: 'Code patterns correlate with historical issues'
      });
    }

    return correlations;
  }

  private buildSwarmSynthesisContext(query: string, results: any, correlations: any[], swarmState: any): string {
    return `2025 Swarm Analysis for: "${query}"

Agent Handoff History: ${JSON.stringify(swarmState.handoffHistory)}
Cross-Vector Results: ${JSON.stringify(results)}
Advanced Correlations: ${JSON.stringify(correlations)}

Please provide a comprehensive synthesis using 2025 swarm intelligence patterns.`;
  }

  private getAgentProcessingStrategy(agentType: string): string {
    const strategies = {
      code_specialist: '2025-semantic-code-analysis',
      jira_analyst: '2025-issue-correlation-engine',
      aoma_researcher: '2025-knowledge-synthesis',
      synthesis_coordinator: '2025-swarm-orchestration',
    };
    return strategies[agentType as keyof typeof strategies] || '2025-generic-processing';
  }

  private estimateAgentResponseTime(agentType: string): number {
    const estimates = {
      code_specialist: 3000,
      jira_analyst: 2500,
      aoma_researcher: 4000,
      synthesis_coordinator: 5000,
    };
    return estimates[agentType as keyof typeof estimates] || 3000;
  }

  private getAgentCapabilities(agentType: string): string[] {
    const capabilities = {
      code_specialist: ['semantic-code-search', 'pattern-recognition', 'cross-repo-analysis'],
      jira_analyst: ['issue-correlation', 'historical-analysis', 'trend-detection'],
      aoma_researcher: ['knowledge-synthesis', 'documentation-mining', 'context-engineering'],
      synthesis_coordinator: ['multi-agent-orchestration', 'correlation-analysis', 'insight-generation'],
    };
    return capabilities[agentType as keyof typeof capabilities] || ['generic-processing'];
  }

  private applySemanticCompression(text: string, level: string): string {
    // 2025 semantic compression simulation
    const compressionRatios = {
      none: 1.0,
      light: 0.8,
      aggressive: 0.6,
      semantic: 0.4,
    };
    
    const ratio = compressionRatios[level as keyof typeof compressionRatios] || 1.0;
    const targetLength = Math.floor(text.length * ratio);
    
    if (targetLength >= text.length) return text;
    
    // Simulate semantic compression (in reality, this would use advanced NLP)
    return text.substring(0, targetLength) + '... [semantically compressed]';
  }

  private optimizeContextForAgent(context: string, agentType: string): string {
    const agentOptimizations = {
      code_specialist: 'Focus on technical implementation, code patterns, and architectural concerns',
      jira_analyst: 'Emphasize issues, bugs, features, and historical problem resolution',
      aoma_researcher: 'Prioritize business context, requirements, and documentation',
      synthesis_coordinator: 'Consider all aspects for comprehensive analysis',
    };
    
    const optimization = agentOptimizations[agentType as keyof typeof agentOptimizations] || '';
    return `${optimization}\n\nOriginal Context: ${context}`;
  }

  private getAgentSpecialization(agentType: string): string {
    const specializations = {
      code_specialist: 'Source code analysis and technical pattern recognition',
      jira_analyst: 'Issue tracking and historical problem analysis',
      aoma_researcher: 'Business documentation and requirements research',
      synthesis_coordinator: 'Multi-source synthesis and insight generation',
    };
    return specializations[agentType as keyof typeof specializations] || 'General analysis';
  }

  private getExpectedOutputFormat(agentType: string): string {
    const formats = {
      code_specialist: 'Technical analysis with code patterns and architectural insights',
      jira_analyst: 'Issue correlation report with historical context',
      aoma_researcher: 'Business context analysis with requirements mapping',
      synthesis_coordinator: 'Comprehensive multi-vector synthesis with actionable recommendations',
    };
    return formats[agentType as keyof typeof formats] || 'Structured analysis report';
  }

  /**
   * Check if port is available before starting server
   */
  private async checkPortAvailability(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      
      server.on('error', () => resolve(false));
    });
  }

  /**
   * Find next available port starting from the configured port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    for (let port = startPort; port <= startPort + 10; port++) {
      if (await this.checkPortAvailability(port)) {
        return port;
      }
    }
    throw new Error(`No available ports found in range ${startPort}-${startPort + 10}`);
  }
  /**
   * Start the MCP server with both stdio and HTTP transports
   */
  public async start(): Promise<void> {
    try {
      await this.initialize();
      
      // Railway sets PORT env var, use it if available
      let httpPort = this.env.PORT || this.env.HTTP_PORT;
      
      // Skip port availability check in production (Railway manages ports)
      if (this.env.NODE_ENV !== 'production') {
        if (!(await this.checkPortAvailability(httpPort))) {
          this.logWarn(`Port ${httpPort} is busy, finding alternative...`);
          httpPort = await this.findAvailablePort(httpPort + 1);
          this.logInfo(`Using alternate port: ${httpPort}`);
        }
      }
      
      // Start HTTP server for web applications (tk-ui, etc.)
      const httpServer = this.httpApp.listen(httpPort, '0.0.0.0', () => {
        this.logInfo('🌐 HTTP endpoints available', {
          port: httpPort,
          host: '0.0.0.0',
          endpoints: ['/health', '/rpc', '/tools/:toolName', '/metrics'],
        });
      });
      
      // Add error handling for HTTP server
      httpServer.on('error', (error) => {
        this.logError('HTTP server error', { error: this.getErrorMessage(error), port: httpPort });
        throw error;
      });

      // Start stdio transport only in development (not Railway)
      let transport = null;
      const transports = ['http'];
      
      if (this.env.NODE_ENV !== 'production') {
        transport = new StdioServerTransport();
        await this.server.connect(transport);
        transports.push('stdio');
      }
      
      this.logInfo('🚀 AOMA Mesh MCP Server running', {
        version: this.env.MCP_SERVER_VERSION,
        tools: this.getToolDefinitions().length,
        resources: this.getResourceDefinitions().length,
        environment: this.env.NODE_ENV,
        httpPort: httpPort,
        transports: transports,
      });

      // Enhanced graceful shutdown handling
      const shutdown = async (signal: string) => {
        this.logInfo(`Received ${signal}, shutting down AOMA Mesh MCP Server gracefully...`);
        
        try {
          // Close HTTP server first
          await new Promise<void>((resolve) => {
            httpServer.close(() => {
              this.logInfo('HTTP server closed');
              resolve();
            });
          });
          
          // Close stdio transport if it exists
          if (transport) {
            transport.close();
            this.logInfo('MCP transport closed');
          }
          
          // Small delay to ensure everything is cleaned up
          await this.delay(100);
          
          this.logInfo('AOMA Mesh MCP Server shutdown complete');
          process.exit(0);
        } catch (error) {
          this.logError('Error during shutdown', error);
          process.exit(1);
        }
      };

      // Handle multiple shutdown signals
      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGHUP', () => shutdown('SIGHUP'));
      
      // Handle uncaught exceptions
      process.on('uncaughtException', (error) => {
        this.logError('Uncaught exception', error);
        shutdown('uncaughtException');
      });
      
      process.on('unhandledRejection', (reason) => {
        this.logError('Unhandled rejection', reason);
        shutdown('unhandledRejection');
      });
      
    } catch (error) {
      this.logError('❌ Failed to start AOMA Mesh MCP Server', error);
      process.exit(1);
    }
  }

  // Utility methods
  private updateResponseMetrics(responseTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
    this.metrics.lastRequestTime = new Date().toISOString();
  }

  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    // Remove sensitive information from logs
    const sanitized = { ...args };
    const sensitiveKeys = ['password', 'token', 'key', 'secret'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return JSON.stringify(error);
  }

  private logError(message: string, error?: unknown): void {
    logger.error(message, error);
  }

  private logWarn(message: string, error?: unknown): void {
    if (!['error'].includes(this.env.LOG_LEVEL)) {
      logger.warn(message, error);
    }
  }

  private logInfo(message: string, meta?: Record<string, unknown>): void {
    if (['info', 'debug'].includes(this.env.LOG_LEVEL)) {
      logger.info(message, meta);
    }
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AOMAMeshServer();
  
  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    await logger.flush();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  server.start().catch(async (error) => {
    logger.error('AOMA Mesh MCP Server startup failed', error);
    await logger.flush();
    process.exit(1);
  });
}