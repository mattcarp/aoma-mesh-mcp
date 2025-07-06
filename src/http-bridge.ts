#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: any;
}

/**
 * HTTP-to-MCP Bridge Server
 * Calls REAL MCP server or FAILS HARD - NO MOCKS EVER
 */
class HTTPMCPBridge {
  private app: express.Application;
  private mcpProcess: any = null;
  private requestId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function }>();
  private readonly port = 3333;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.startMCPServer();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private startMCPServer(): void {
    try {
      console.log('🚀 Starting real AOMA MCP server...');
      const serverPath = path.join(__dirname, 'aoma-mesh-server.js');
      this.mcpProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: __dirname
      });

      this.mcpProcess.stdout.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        for (const line of lines) {
          try {
            const response: MCPResponse = JSON.parse(line);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              this.pendingRequests.delete(response.id);
              if (response.error) {
                pending.reject(new Error(response.error.message || 'MCP Error'));
              } else {
                pending.resolve(response.result);
              }
            }
          } catch (e) {
            console.log('[MCP Server]', line);
          }
        }
      });

      this.mcpProcess.stderr.on('data', (data: Buffer) => {
        console.error('[MCP Server Error]', data.toString());
      });

      this.mcpProcess.on('exit', (code: number) => {
        console.error(`❌ MCP Server exited with code ${code}`);
        this.mcpProcess = null;
      });

      console.log('✅ Real MCP server started');
    } catch (error) {
      console.error('❌ Failed to start MCP server:', error);
      throw error;
    }
  }

  private async callMCPTool(name: string, args: any): Promise<any> {
    if (!this.mcpProcess) {
      throw new Error('MCP Server not running - HARD FAIL as requested');
    }

    const request: MCPRequest = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: { name, arguments: args }
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        reject(new Error('MCP request timeout - REAL SERVER NOT RESPONDING'));
      }, 30000); // 30 second timeout

      this.pendingRequests.set(request.id, {
        resolve: (result: any) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      try {
        this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } catch (error) {
        this.pendingRequests.delete(request.id);
        clearTimeout(timeout);
        reject(new Error('Failed to send MCP request - CONNECTION DEAD'));
      }
    });
  }

  private setupRoutes(): void {
    // Health endpoint
    this.app.get('/health', (req, res) => {
      const isHealthy = this.mcpProcess !== null;
      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        mcpServerRunning: isHealthy,
        message: isHealthy ? 'Real MCP server connected' : 'MCP server down - WILL FAIL',
        timestamp: new Date().toISOString()
      });
    });

    // JSON-RPC endpoint for tools/call  
    this.app.post('/rpc', async (req, res) => {
      try {
        const { method, params } = req.body;
        console.log(`🎯 HTTP-to-MCP Bridge: ${method}`, params);
        
        if (method === 'tools/call') {
          const { name, arguments: toolArgs } = params;
          
          // CALL REAL MCP SERVER - NO MOCKS, NO FALLBACKS
          console.log(`📡 Calling REAL MCP tool: ${name}`);
          const result = await this.callMCPTool(name, toolArgs || {});
          
          res.json({
            jsonrpc: '2.0',
            id: req.body.id || 1,
            result
          });
        } else {
          throw new Error(`Unknown method: ${method}`);
        }
      } catch (error) {
        console.error('❌ MCP Bridge HARD FAILURE (as requested):', error);
        res.status(503).json({
          jsonrpc: '2.0',
          id: req.body.id || 1,
          error: {
            code: -32603,
            message: `REAL MCP FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      console.log(`🌐 HTTP-to-MCP Bridge running on port ${this.port}`);
      console.log(`📋 Health: http://localhost:${this.port}/health`);
      console.log(`🔧 JSON-RPC: http://localhost:${this.port}/rpc`);
      console.log(`✅ Bridge ready - REAL MCP CALLS ONLY, NO MOCKS!`);
    });
  }

  public shutdown(): void {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
    }
  }
}

// Start the bridge with error handling
try {
  const bridge = new HTTPMCPBridge();
  bridge.start();
  
  process.on('SIGINT', () => {
    console.log('\n💀 Shutting down HTTP-MCP Bridge...');
    bridge.shutdown();
    process.exit(0);
  });
  
} catch (error) {
  console.error('❌ Failed to start HTTP-MCP Bridge:', error);
  process.exit(1);
}

export default HTTPMCPBridge; 