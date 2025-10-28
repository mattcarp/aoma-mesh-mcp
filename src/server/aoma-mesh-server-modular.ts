#!/usr/bin/env node
/**
 * AOMA Mesh MCP Server - Modular Architecture
 * 
 * Clean, maintainable main server orchestrator.
 * Coordinates services, tools, and transport layers.
 * 
 * @version 2.0.0 - Refactored Architecture
 * @author MC-TK Development Team
 */

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

// Configuration and utilities
import { validateAndLoadEnvironment, Environment } from '../config/environment';
import { createLogger } from '../utils/logger';
import { getAvailablePort } from '../utils/port-manager';
import { toMcpError } from '../utils/errors';

// Services
import { OpenAIService } from '../services/openai.service';
import { SupabaseService } from '../services/supabase.service';

// Tool system
import { ToolRegistry } from '../tools/base/tool.registry';
import { AOMAKnowledgeTool } from '../tools/aoma-knowledge.tool';
import { SystemHealthTool } from '../tools/system-health.tool';
import { JiraSearchTool } from '../tools/jira-search.tool';
import { JiraCountTool } from '../tools/jira-count.tool';
import { GitSearchTool } from '../tools/git-search.tool';
import { CodeSearchTool } from '../tools/code-search.tool';
import { OutlookSearchTool } from '../tools/outlook-search.tool';
import { DevelopmentContextTool } from '../tools/development-context.tool';
import { ServerCapabilitiesTool } from '../tools/server-capabilities.tool';
import { SwarmAnalysisTool } from '../tools/swarm-analysis.tool';

// Types
import { ServerMetrics } from '../types/common';

const logger = createLogger('AOMAMeshServer');

export class AOMAMeshServer {
  private readonly config: Environment;
  private readonly openaiService: OpenAIService;
  private readonly supabaseService: SupabaseService;
  private readonly toolRegistry: ToolRegistry;
  private readonly server: Server;
  private readonly httpApp: express.Application;
  private readonly startTime: number = Date.now();
  private metrics: ServerMetrics;

  constructor() {
    // Load and validate configuration
    this.config = validateAndLoadEnvironment();
    
    // Initialize services
    this.openaiService = new OpenAIService(this.config);
    this.supabaseService = new SupabaseService(this.config);
    
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry(this.config.TIMEOUT_MS);
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: '@sony-music/aoma-mesh-mcp-server',
        version: this.config.MCP_SERVER_VERSION,
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

    // CORS configuration
    const allowedOriginsRaw =
      process.env.ALLOWED_ORIGINS ||
      (this.config && (this.config as any).ALLOWED_ORIGINS) ||
      '*';
    let allowedOrigins: string[] | string = allowedOriginsRaw;

    if (allowedOriginsRaw !== '*') {
      allowedOrigins = allowedOriginsRaw
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
    }

    // In production, require explicit origins
    const isProduction =
      (this.config && this.config.NODE_ENV === 'production') ||
      process.env.NODE_ENV === 'production';

    if (isProduction && (allowedOrigins === '*' || !allowedOrigins || (Array.isArray(allowedOrigins) && allowedOrigins.length === 0))) {
      throw new Error(
        'CORS misconfiguration: ALLOWED_ORIGINS must be set to explicit origins in production'
      );
    }

    this.httpApp.use(
      cors({
        origin: allowedOrigins,
        credentials: false,
      })
    );
    this.httpApp.use(express.json({ limit: '10mb' }));

    // Initialize metrics
    this.metrics = {
      uptime: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date().toISOString(),
      version: this.config.MCP_SERVER_VERSION,
    };

    this.setupTools();
    this.setupMcpHandlers();
    this.setupHttpEndpoints();

    logger.info('AOMA Mesh Server initialized', {
      version: this.config.MCP_SERVER_VERSION,
      environment: this.config.NODE_ENV,
      toolCount: this.toolRegistry.getToolCount()
    });
  }

  private setupTools(): void {
    // Register all available tools
    this.toolRegistry.registerAll([
      new AOMAKnowledgeTool(this.openaiService, this.supabaseService, this.config),
      new SystemHealthTool(this.openaiService, this.supabaseService, this.toolRegistry, this.metrics, this.startTime),
      new JiraSearchTool(this.supabaseService),
      new JiraCountTool(this.supabaseService),
      new GitSearchTool(this.supabaseService),
      new CodeSearchTool(this.supabaseService),
      new OutlookSearchTool(this.supabaseService),
      new DevelopmentContextTool(this.openaiService, this.supabaseService),
      new ServerCapabilitiesTool(this.toolRegistry, this.config.MCP_SERVER_VERSION, this.config.NODE_ENV),
      new SwarmAnalysisTool(this.openaiService, this.supabaseService),
    ]);

    logger.info('Tools registered', {
      count: this.toolRegistry.getToolCount(),
      tools: this.toolRegistry.getToolNames()
    });
  }

  private setupMcpHandlers(): void {
    // Tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.toolRegistry.getToolDefinitions()
    }));

    // Resource listing (empty for now)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: []
    }));

    // Tool execution with metrics
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      const toolName = request.params.name;
      const args = request.params.arguments || {};

      try {
        this.metrics.totalRequests++;
        
        const result = await this.toolRegistry.executeTool(toolName, args, {
          requestId: `mcp-${Date.now()}`,
          metadata: { transport: 'mcp' }
        });
        
        this.metrics.successfulRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        return result;
      } catch (error) {
        this.metrics.failedRequests++;
        this.updateResponseMetrics(Date.now() - startTime);
        
        logger.error(`Tool execution failed: ${toolName}`, { error });
        throw toMcpError(error, `Tool ${toolName} execution`);
      }
    });

    // Resource reading (placeholder)
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      throw toMcpError(new Error('Resource reading not implemented'), 'Resource read');
    });
  }

  private setupHttpEndpoints(): void {
    // Health endpoint
    this.httpApp.get('/health', async (req, res) => {
      try {
        const healthTool = new SystemHealthTool(
          this.openaiService, 
          this.supabaseService, 
          this.toolRegistry, 
          this.metrics, 
          this.startTime
        );
        
        const result = await healthTool.execute({ includeMetrics: true }, {
          logger: createLogger('HealthEndpoint'),
          requestId: `http-health-${Date.now()}`
        });
        
        // Parse the result content
        const healthData = typeof result.content[0].text === 'string' 
          ? JSON.parse(result.content[0].text)
          : result.content[0].text;
        
        res.json(healthData);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
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
          res.status(400).json({ error: 'Only tools/call method supported' });
          return;
        }

        this.metrics.totalRequests++;
        
        const result = await this.toolRegistry.executeTool(params.name, params.arguments, {
          requestId: `http-${Date.now()}`,
          metadata: { transport: 'http' }
        });
        
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
        
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Unknown error',
          },
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

  public async start(): Promise<void> {
    try {
      // Get available port
      const httpPort = await getAvailablePort(this.config.HTTP_PORT);
      
      // Start HTTP server
      const httpServer = this.httpApp.listen(httpPort, () => {
        logger.info('HTTP endpoints available', {
          port: httpPort,
          endpoints: ['/health', '/rpc', '/metrics'],
        });
      });

      // Start MCP transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info('AOMA Mesh MCP Server running', {
        version: this.config.MCP_SERVER_VERSION,
        tools: this.toolRegistry.getToolCount(),
        environment: this.config.NODE_ENV,
        httpPort: httpPort,
        transports: ['stdio', 'http'],
      });

      // Enhanced graceful shutdown
      const shutdown = async (signal: string) => {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        
        try {
          await new Promise<void>((resolve) => {
            httpServer.close(() => {
              logger.info('HTTP server closed');
              resolve();
            });
          });
          
          if (transport) {
            transport.close();
            logger.info('MCP transport closed');
          }
          
          await new Promise(resolve => setTimeout(resolve, 100));
          logger.info('AOMA Mesh MCP Server shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      };

      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGHUP', () => shutdown('SIGHUP'));
      
    } catch (error) {
      logger.error('Failed to start AOMA Mesh MCP Server', { error });
      process.exit(1);
    }
  }

  private updateResponseMetrics(responseTime: number): void {
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) / 
      this.metrics.totalRequests;
    this.metrics.lastRequestTime = new Date().toISOString();
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new AOMAMeshServer();
  server.start().catch((error) => {
    console.error('❌ AOMA Mesh MCP Server startup failed:', error);
    process.exit(1);
  });
}
