/**
 * Tool Interface Definition
 * 
 * Base contract that all AOMA Mesh tools must implement.
 * Provides consistent structure for tool execution, validation, and metadata.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Logger } from '../../utils/logger';

export interface ToolExecutionContext {
  logger: Logger;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

export interface ToolExecutor {
  /**
   * Tool metadata and schema definition
   */
  readonly definition: Tool;
  
  /**
   * Execute the tool with given arguments
   */
  execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult>;
  
  /**
   * Validate tool arguments (optional override for custom validation)
   */
  validateArgs?(args: Record<string, unknown>): void;
  
  /**
   * Tool-specific health check (optional)
   */
  healthCheck?(): Promise<{ healthy: boolean; error?: string }>;
}

export abstract class BaseTool implements ToolExecutor {
  abstract readonly definition: Tool;
  
  abstract execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult>;
  
  /**
   * Default argument validation using the tool's schema
   */
  validateArgs(args: Record<string, unknown>): void {
    // Basic validation - tools can override for custom logic
    const required = this.definition.inputSchema.required || [];
    const properties = this.definition.inputSchema.properties || {};
    
    for (const field of required) {
      if (!(field in args)) {
        throw new Error(`Missing required parameter: ${field}`);
      }
    }
    
    // Validate types for provided arguments
    for (const [key, value] of Object.entries(args)) {
      if (key in properties) {
        this.validateFieldType(key, value, properties[key]);
      }
    }
  }
  
  private validateFieldType(key: string, value: unknown, schema: any): void {
    if (schema.type === 'string' && typeof value !== 'string') {
      throw new Error(`Parameter ${key} must be a string`);
    }
    if (schema.type === 'number' && typeof value !== 'number') {
      throw new Error(`Parameter ${key} must be a number`);
    }
    if (schema.type === 'boolean' && typeof value !== 'boolean') {
      throw new Error(`Parameter ${key} must be a boolean`);
    }
    if (schema.type === 'array' && !Array.isArray(value)) {
      throw new Error(`Parameter ${key} must be an array`);
    }
  }
  
  /**
   * Helper to create successful tool result
   */
  protected success(content: unknown): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
        }
      ]
    };
  }
  
  /**
   * Helper to create error tool result
   */
  protected error(message: string, details?: unknown): CallToolResult {
    const errorText = details 
      ? `${message}\n\nDetails: ${JSON.stringify(details, null, 2)}`
      : message;
    
    return {
      content: [
        {
          type: 'text',
          text: errorText
        }
      ]
    };
  }
}
