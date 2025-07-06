#!/usr/bin/env node
/**
 * AOMA Mesh MCP Client Library
 * 
 * Simple TypeScript client for consuming the AOMA Mesh MCP server
 * from other applications (Eleven Labs, LangChain, etc.)
 * 
 * @version 2.0.0
 * @author MC-TK Development Team
 */

export interface AOMAQueryOptions {
  strategy?: 'comprehensive' | 'focused' | 'rapid';
  maxResults?: number;
  threshold?: number;
  context?: string;
}

export interface JiraSearchOptions {
  projectKey?: string;
  status?: string[];
  priority?: string[];
  maxResults?: number;
  threshold?: number;
}

export interface AOMAHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    openai: { status: boolean; latency?: number; error?: string };
    supabase: { status: boolean; latency?: number; error?: string };
    vectorStore: { status: boolean; latency?: number; error?: string };
  };
  metrics: {
    uptime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestTime: string;
    version: string;
  };
  timestamp: string;
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * AOMA Mesh MCP Client
 * 
 * Easy-to-use client for integrating with the AOMA Mesh MCP server
 */
export class AOMAMeshClient {
  private readonly baseUrl: string;
  private readonly timeout: number;
  private requestId: number = 1;

  constructor(
    baseUrl: string = 'https://5so2f6gefeuoaywpuymjikix5e0rhqyo.lambda-url.us-east-2.on.aws',
    timeout: number = 30000
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
  }

  /**
   * Query the AOMA knowledge base for business intelligence
   */
  async queryAOMAKnowledge(
    query: string, 
    options: AOMAQueryOptions = {}
  ): Promise<string> {
    const response = await this.callTool('query_aoma_knowledge', {
      query,
      strategy: options.strategy || 'comprehensive',
      maxResults: options.maxResults || 10,
      threshold: options.threshold || 0.7,
      context: options.context,
    });

    return this.extractTextContent(response);
  }

  /**
   * Search JIRA tickets with semantic similarity
   */
  async searchJiraTickets(
    query: string,
    options: JiraSearchOptions = {}
  ): Promise<any[]> {
    const response = await this.callTool('search_jira_tickets', {
      query,
      projectKey: options.projectKey,
      status: options.status,
      priority: options.priority,
      maxResults: options.maxResults || 15,
      threshold: options.threshold || 0.6,
    });

    const content = this.extractTextContent(response);
    try {
      const parsed = JSON.parse(content);
      return parsed.results || [];
    } catch {
      return [];
    }
  }

  /**
   * Get system health and performance metrics
   */
  async getSystemHealth(): Promise<AOMAHealthStatus> {
    const response = await this.callTool('get_system_health', {});
    const content = this.extractTextContent(response);
    
    try {
      return JSON.parse(content) as AOMAHealthStatus;
    } catch (error) {
      throw new Error(`Failed to parse health response: ${error}`);
    }
  }

  /**
   * Check if the MCP server is healthy (simple boolean check)
   */
  async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getSystemHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Quick health check using the HTTP health endpoint
   */
  async quickHealthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    const response = await this.makeRequest('tools/list', {});
    return response.result?.tools || [];
  }

  /**
   * Call a specific tool directly
   */
  async callTool(toolName: string, args: Record<string, any>): Promise<any> {
    const response = await this.makeRequest('tools/call', {
      name: toolName,
      arguments: args,
    });

    if (response.error) {
      throw new Error(`Tool call failed: ${response.error.message}`);
    }

    return response.result;
  }

  /**
   * Make a direct MCP JSON-RPC request
   */
  async makeRequest(method: string, params: any): Promise<MCPResponse> {
    const requestId = this.requestId++;
    const payload = {
      jsonrpc: '2.0' as const,
      id: requestId,
      method,
      params,
    };

    try {
      const response = await fetch(`${this.baseUrl}/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as MCPResponse;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`MCP request failed: ${error.message}`);
      }
      throw new Error('MCP request failed with unknown error');
    }
  }

  /**
   * Extract text content from MCP tool response
   */
  private extractTextContent(response: any): string {
    if (response?.content?.[0]?.text) {
      return response.content[0].text;
    }
    
    if (typeof response === 'string') {
      return response;
    }
    
    return JSON.stringify(response);
  }
}

/**
 * Simple factory function for creating AOMA client instances
 */
export function createAOMAClient(
  baseUrl?: string,
  timeout?: number
): AOMAMeshClient {
  return new AOMAMeshClient(baseUrl, timeout);
}

/**
 * Default export for convenience
 */
export default AOMAMeshClient;
