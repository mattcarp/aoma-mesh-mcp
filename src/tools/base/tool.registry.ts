/**
 * Tool Registry
 * 
 * Manages registration, discovery, and execution of all AOMA Mesh tools.
 * Provides centralized tool management with lifecycle hooks.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ToolExecutor, ToolExecutionContext } from './tool.interface.js';
import { createLogger } from '../../utils/logger.js';
import { withErrorHandling, withTimeout } from '../../utils/errors.js';

const logger = createLogger('ToolRegistry');

export class ToolRegistry {
  private readonly tools = new Map<string, ToolExecutor>();
  private readonly executionTimeout: number;

  constructor(executionTimeout: number = 30000) {
    this.executionTimeout = executionTimeout;
  }

  /**
   * Register a tool in the registry
   */
  register(tool: ToolExecutor): void {
    const name = tool.definition.name;
    
    if (this.tools.has(name)) {
      logger.warn(`Tool ${name} is already registered, overwriting`);
    }
    
    this.tools.set(name, tool);
    logger.info(`Registered tool: ${name}`, {
      description: tool.definition.description,
      hasHealthCheck: !!tool.healthCheck
    });
  }

  /**
   * Register multiple tools at once
   */
  registerAll(tools: ToolExecutor[]): void {
    tools.forEach(tool => this.register(tool));
    logger.info(`Registered ${tools.length} tools`);
  }

  /**
   * Get tool definitions for MCP protocol
   */
  getToolDefinitions(): Tool[] {
    return Array.from(this.tools.values()).map(tool => tool.definition);
  }

  /**
   * Execute a tool with comprehensive error handling
   */
  async executeTool(
    name: string, 
    args: Record<string, unknown>,
    context: Partial<ToolExecutionContext> = {}
  ): Promise<CallToolResult> {
    const toolLogger = createLogger(`Tool:${name}`);
    const executionContext: ToolExecutionContext = {
      logger: toolLogger,
      requestId: context.requestId || `${name}-${Date.now()}`,
      metadata: context.metadata
    };

    return withTimeout(
      () => withErrorHandling(async () => {
        const tool = this.tools.get(name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }

        toolLogger.info('Executing tool', { args: this.sanitizeArgs(args) });
        
        // Validate arguments
        if (tool.validateArgs) {
          tool.validateArgs(args);
        }

        const startTime = Date.now();
        const result = await tool.execute(args, executionContext);
        const duration = Date.now() - startTime;

        toolLogger.info('Tool execution completed', { 
          duration,
          success: true
        });

        return result;
      }, `Tool execution: ${name}`),
      this.executionTimeout,
      `Tool execution timeout: ${name}`
    );
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get list of registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Perform health check on all tools
   */
  async performHealthChecks(): Promise<Record<string, { healthy: boolean; error?: string }>> {
    const results: Record<string, { healthy: boolean; error?: string }> = {};
    
    for (const [name, tool] of this.tools) {
      if (tool.healthCheck) {
        try {
          results[name] = await tool.healthCheck();
        } catch (error) {
          results[name] = {
            healthy: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      } else {
        results[name] = { healthy: true }; // No health check means assumed healthy
      }
    }
    
    return results;
  }

  /**
   * Get tool metadata for diagnostics
   */
  getToolMetadata(): Array<{
    name: string;
    description: string;
    hasHealthCheck: boolean;
    parameterCount: number;
    requiredParams: string[];
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.definition.name,
      description: tool.definition.description,
      hasHealthCheck: !!tool.healthCheck,
      parameterCount: Object.keys(tool.definition.inputSchema.properties || {}).length,
      requiredParams: tool.definition.inputSchema.required || []
    }));
  }

  /**
   * Sanitize arguments for logging (remove sensitive data)
   */
  private sanitizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...args };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'apikey', 'api_key'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }
}
