/**
 * System Health Tool
 * 
 * Provides comprehensive health status of AOMA Mesh server 
 * and all connected services with detailed diagnostics.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { OpenAIService } from '../../services/openai.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToolRegistry } from '../base/tool.registry';
import { SystemHealthRequest } from '../../types/requests';
import { HealthStatus, ServerMetrics } from '../../types/common';

export class SystemHealthTool extends BaseTool {
  readonly definition: Tool = {
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
  };

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly supabaseService: SupabaseService,
    private readonly toolRegistry: ToolRegistry,
    private readonly serverMetrics: ServerMetrics,
    private readonly startTime: number
  ) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as SystemHealthRequest;
    const { includeMetrics = true, includeDiagnostics = false } = request;

    context.logger.info('Performing system health check', { includeMetrics, includeDiagnostics });

    try {
      const healthStatus = await this.performHealthCheck(includeMetrics, includeDiagnostics);
      
      context.logger.info('System health check completed', {
        status: healthStatus.status,
        serviceCount: Object.keys(healthStatus.services).length
      });

      return this.success(healthStatus);
    } catch (error) {
      context.logger.error('System health check failed', { error });
      return this.error('Failed to perform system health check', { error: error instanceof Error ? error.message : error });
    }
  }

  private async performHealthCheck(includeMetrics: boolean, includeDiagnostics: boolean): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    
    // Check core services
    const [openaiHealth, supabaseHealth] = await Promise.all([
      this.openaiService.healthCheck(),
      this.supabaseService.healthCheck()
    ]);

    // Check tool registry health
    let toolHealth: { status: boolean; unhealthyTools?: Array<{ name: string; error?: string }> } = { status: true };
    if (includeDiagnostics) {
      const toolHealthChecks = await this.toolRegistry.performHealthChecks();
      const unhealthyTools = Object.entries(toolHealthChecks).filter(([, health]) => !health.healthy);
      toolHealth = {
        status: unhealthyTools.length === 0,
        unhealthyTools: unhealthyTools.length > 0 ? unhealthyTools.map(([name, health]) => ({ name, error: health.error })) : undefined
      };
    }

    // Determine overall status
    const servicesHealthy = openaiHealth.healthy && supabaseHealth.healthy && toolHealth.status;
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (servicesHealthy) {
      overallStatus = 'healthy';
    } else if (openaiHealth.healthy || supabaseHealth.healthy) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    // Build metrics
    const metrics = includeMetrics ? {
      ...this.serverMetrics,
      uptime: Date.now() - this.startTime,
      toolCount: this.toolRegistry.getToolCount(),
      timestamp
    } : {
      uptime: Date.now() - this.startTime,
      version: this.serverMetrics.version,
      timestamp,
      toolCount: this.toolRegistry.getToolCount(),
      totalRequests: this.serverMetrics.totalRequests,
      successfulRequests: this.serverMetrics.successfulRequests,
      failedRequests: this.serverMetrics.failedRequests,
      averageResponseTime: this.serverMetrics.averageResponseTime,
      lastRequestTime: this.serverMetrics.lastRequestTime
    };

    const healthStatus: HealthStatus = {
      status: overallStatus,
      services: {
        openai: openaiHealth,
        supabase: supabaseHealth,
        vectorStore: { status: supabaseHealth.healthy, error: supabaseHealth.error },
        ...(includeDiagnostics && { tools: toolHealth })
      },
      metrics,
      timestamp
    };

    return healthStatus;
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    // Meta health check - always healthy since this tool doesn't depend on external services
    return { healthy: true };
  }
}
