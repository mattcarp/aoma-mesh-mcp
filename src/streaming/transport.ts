import { EventEmitter } from 'events';
import { 
  StreamingMessage, 
  StreamingContext, 
  StreamingOptions,
  StreamState 
} from './types.js';
import { streamingManager } from './manager.js';

/**
 * Streaming-aware MCP transport layer that extends standard MCP responses
 * with real-time streaming capabilities for long-running operations.
 */
export class StreamingTransport extends EventEmitter {
  private activeStreamHandlers = new Map<string, (message: StreamingMessage) => void>();

  constructor() {
    super();
    this.setupStreamingHandlers();
  }

  /**
   * Setup event handlers for streaming manager events
   */
  private setupStreamingHandlers(): void {
    // Forward streaming messages to connected clients
    streamingManager.on('message', (streamId: string, message: StreamingMessage) => {
      this.emit('streaming-message', { streamId, message });
      
      // Call specific stream handler if registered
      const handler = this.activeStreamHandlers.get(streamId);
      if (handler) {
        handler(message);
      }
    });

    // Handle stream completion
    streamingManager.on('completed', (streamId: string, result: any) => {
      this.emit('streaming-completed', { streamId, result });
      this.activeStreamHandlers.delete(streamId);
    });

    // Handle stream cancellation
    streamingManager.on('cancelled', (streamId: string) => {
      this.emit('streaming-cancelled', { streamId });
      this.activeStreamHandlers.delete(streamId);
    });

    // Handle stream errors
    streamingManager.on('error', (streamId: string, error: Error) => {
      this.emit('streaming-error', { streamId, error });
      this.activeStreamHandlers.delete(streamId);
    });
  }

  /**
   * Execute a tool with streaming support
   */
  async executeStreamingTool(
    toolName: string,
    args: any,
    options: StreamingOptions = {},
    messageHandler?: (message: StreamingMessage) => void
  ): Promise<{ streamId?: string; result?: any; isStreaming: boolean }> {
    // Check if the operation supports streaming
    const operation = streamingManager.getOperation(toolName);
    if (!operation) {
      // Non-streaming operation - execute normally
      return { result: await this.executeNormalTool(toolName, args), isStreaming: false };
    }

    // Start streaming operation
    const streamId = await streamingManager.startStream(toolName, args, options);
    
    // Register message handler if provided
    if (messageHandler) {
      this.activeStreamHandlers.set(streamId, messageHandler);
    }

    // Create streaming context
    const context: StreamingContext = {
      streamId,
      emit: (message: StreamingMessage) => {
        this.emitStreamMessage(streamId, message);
      },
      isCancelled: () => {
        const info = streamingManager.getStreamInfo(streamId);
        return info?.state === StreamState.CANCELLED;
      },
      args,
      operation: toolName,
      startTime: Date.now(),
      options: options || {},
      updateProgress: (progress: number, stage?: string) => {
        this.emitStreamMessage(streamId, {
          id: `${streamId}-progress-${Date.now()}`,
          timestamp: Date.now(),
          type: 'progress',
          data: { progress, stage },
          metadata: { streamId }
        });
      }
    };

    try {
      // Execute the streaming operation
      const result = await operation.execute(context);
      
      // Mark as completed
      this.emitStreamMessage(streamId, {
        id: `${streamId}-complete`,
        timestamp: Date.now(),
        type: 'complete',
        data: {
          result,
          metrics: {
            duration: Date.now() - (streamingManager.getStreamInfo(streamId)?.startTime || 0),
            messagesEmitted: streamingManager.getStreamInfo(streamId)?.messageCount || 0
          }
        },
        metadata: { streamId }
      });

      return { streamId, result, isStreaming: true };
    } catch (error) {
      // Handle streaming operation error
      this.handleStreamError(streamId, error as Error);
      throw error;
    }
  }

  /**
   * Execute a normal (non-streaming) tool
   */
  private async executeNormalTool(toolName: string, args: any): Promise<any> {
    // This would integrate with the existing AgentServer tool execution
    // For now, we'll throw an error to indicate this needs to be implemented
    throw new Error(`Normal tool execution for ${toolName} not implemented in streaming transport`);
  }

  /**
   * Cancel an active stream
   */
  cancelStream(streamId: string): boolean {
    return streamingManager.cancelStream(streamId);
  }

  /**
   * Get information about an active stream
   */
  getStreamInfo(streamId: string) {
    return streamingManager.getStreamInfo(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams() {
    return streamingManager.getActiveStreams();
  }

  /**
   * Register a streaming operation
   */
  registerStreamingOperation(name: string, operation: any) {
    return streamingManager.registerOperation(name, operation);
  }

  /**
   * Create a streaming-aware MCP response
   */
  createStreamingResponse(
    requestId: string,
    toolName: string,
    result: any,
    streamId?: string
  ): any {
    const baseResponse = {
      jsonrpc: '2.0',
      id: requestId,
      result: {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      }
    };

    // Add streaming metadata if this is a streaming operation
    if (streamId) {
      return {
        ...baseResponse,
        result: {
          ...baseResponse.result,
          streaming: {
            streamId,
            state: streamingManager.getStreamInfo(streamId)?.state,
            capabilities: streamingManager.getOperation(toolName)?.capabilities
          }
        }
      };
    }

    return baseResponse;
  }

  /**
   * Create a streaming progress response
   */
  createProgressResponse(streamId: string, message: StreamingMessage): any {
    return {
      jsonrpc: '2.0',
      method: 'streaming/progress',
      params: {
        streamId,
        message
      }
    };
  }

  /**
   * Create a streaming completion response
   */
  createCompletionResponse(streamId: string, result: any): any {
    return {
      jsonrpc: '2.0',
      method: 'streaming/complete',
      params: {
        streamId,
        result
      }
    };
  }

  /**
   * Create a streaming error response
   */
  createErrorResponse(streamId: string, error: Error): any {
    return {
      jsonrpc: '2.0',
      method: 'streaming/error',
      params: {
        streamId,
        error: {
          message: error.message,
          stack: error.stack
        }
      }
    };
  }

  /**
   * Helper method to check if an operation supports streaming
   */
  hasStreamingOperation(toolName: string): boolean {
    return streamingManager.getOperation(toolName) !== undefined;
  }

  /**
   * Get a streaming operation by name
   */
  getOperation(toolName: string) {
    return streamingManager.getOperation(toolName);
  }

  /**
   * Emit a streaming message (wrapper for internal use)
   */
  private emitStreamMessage(streamId: string, message: StreamingMessage): void {
    streamingManager.emitMessage(streamId, message);
  }

  /**
   * Handle streaming errors (wrapper for internal use)
   */
  private handleStreamError(streamId: string, error: Error): void {
    streamingManager.handleStreamError(streamId, error);
  }
}

// Export singleton instance
export const streamingTransport = new StreamingTransport();