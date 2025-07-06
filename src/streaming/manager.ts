/**
 * Streaming Manager for MC-TK MCP Server
 * Handles real-time streaming operations with progress tracking and cancellation
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import {
  StreamingMessage,
  ProgressMessage,
  DataMessage,
  ErrorMessage,
  CompleteMessage,
  StreamingOptions,
  StreamingContext,
  StreamingHandler,
  StreamingCapability,
  StreamState,
  StreamInfo,
  StreamingOperation
} from './types.js';

export class StreamingManager extends EventEmitter {
  private activeStreams = new Map<string, StreamInfo>();
  private operations = new Map<string, StreamingOperation>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupCleanup();
  }

  /**
   * Register a streaming operation
   */
  registerOperation(name: string, operation: StreamingOperation): void {
    this.operations.set(name, operation);
  }

  /**
   * Get a registered streaming operation
   */
  getOperation(name: string): StreamingOperation | undefined {
    return this.operations.get(name);
  }

  /**
   * Start a streaming operation
   */
  async startStream(
    operationName: string,
    args: any = {},
    options: StreamingOptions = {}
  ): Promise<string> {
    const operation = this.operations.get(operationName);
    if (!operation) {
      throw new Error(`Unknown streaming operation: ${operationName}`);
    }

    const streamId = randomUUID();
    const startTime = Date.now();

    // Create stream info
    const streamInfo: StreamInfo = {
      id: streamId,
      operation: operationName,
      state: StreamState.PENDING,
      startTime,
      lastActivity: startTime,
      progress: 0,
      currentStage: 'Initializing',
      messageCount: 0,
      metadata: { args, options }
    };

    this.activeStreams.set(streamId, streamInfo);

    // Create streaming context
    const context: StreamingContext = {
      streamId,
      operation: operationName,
      startTime,
      options,
      args,
      emit: (message: StreamingMessage) => this.emitMessage(streamId, message),
      isCancelled: () => this.getStreamState(streamId) === StreamState.CANCELLED,
      updateProgress: (progress: number, stage?: string) => {
        const streamInfo = this.activeStreams.get(streamId);
        if (streamInfo) {
          streamInfo.progress = Math.max(0, Math.min(100, progress));
          if (stage) streamInfo.currentStage = stage;
          streamInfo.lastActivity = Date.now();
        }
      }
    };

    // Start the operation asynchronously
    this.executeOperation(operation, context, args).catch(error => {
      this.handleStreamError(streamId, error);
    });

    return streamId;
  }

  /**
   * Cancel a streaming operation
   */
  cancelStream(streamId: string): boolean {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo || streamInfo.state === StreamState.COMPLETED) {
      return false;
    }

    streamInfo.state = StreamState.CANCELLED;
    streamInfo.lastActivity = Date.now();

    this.emitMessage(streamId, {
      id: randomUUID(),
      timestamp: Date.now(),
      type: 'error',
      data: {
        error: 'Operation cancelled by user',
        code: 'CANCELLED',
        recoverable: false
      }
    } as ErrorMessage);

    this.emit('streamCancelled', streamId);
    return true;
  }

  /**
   * Get stream information
   */
  getStreamInfo(streamId: string): StreamInfo | undefined {
    return this.activeStreams.get(streamId);
  }

  /**
   * Get all active streams
   */
  getActiveStreams(): StreamInfo[] {
    return Array.from(this.activeStreams.values())
      .filter(stream => stream.state === StreamState.ACTIVE || stream.state === StreamState.PENDING);
  }

  /**
   * Get stream state
   */
  getStreamState(streamId: string): StreamState | undefined {
    return this.activeStreams.get(streamId)?.state;
  }

  /**
   * Get operation capabilities
   */
  getOperationCapabilities(operationName: string): StreamingCapability | undefined {
    return this.operations.get(operationName)?.capabilities;
  }

  /**
   * List all registered operations
   */
  listOperations(): Array<{ name: string; description: string; capability: StreamingCapability }> {
    return Array.from(this.operations.values()).map(op => ({
      name: op.name,
      description: op.description,
      capability: op.capabilities
    }));
  }

  /**
   * Execute a streaming operation
   */
  private async executeOperation(
    operation: StreamingOperation,
    context: StreamingContext,
    args: any
  ): Promise<void> {
    const streamInfo = this.activeStreams.get(context.streamId);
    if (!streamInfo) return;

    try {
      // Update state to active
      streamInfo.state = StreamState.ACTIVE;
      streamInfo.lastActivity = Date.now();

      // Execute the operation
      const result = await operation.execute(context);

      // Check if cancelled during execution
      if (context.isCancelled()) {
        return;
      }

      // Emit completion message
      this.emitMessage(context.streamId, {
        id: randomUUID(),
        timestamp: Date.now(),
        type: 'complete',
        data: {
          result,
          summary: `${operation.name} completed successfully`,
          metrics: {
            duration: Date.now() - context.startTime,
            operations: 1
          }
        }
      } as CompleteMessage);

      // Update stream state
      streamInfo.state = StreamState.COMPLETED;
      streamInfo.progress = 100;
      streamInfo.currentStage = 'Completed';
      streamInfo.lastActivity = Date.now();

      this.emit('streamCompleted', context.streamId, result);

    } catch (error) {
      this.handleStreamError(context.streamId, error);
    }
  }

  /**
   * Handle stream errors
   */
  public handleStreamError(streamId: string, error: any): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) return;

    streamInfo.state = StreamState.ERROR;
    streamInfo.lastActivity = Date.now();

    this.emitMessage(streamId, {
      id: randomUUID(),
      timestamp: Date.now(),
      type: 'error',
      data: {
        error: error.message || 'Unknown error occurred',
        code: error.code || 'UNKNOWN_ERROR',
        recoverable: false,
        context: {
          operation: streamInfo.operation,
          stage: streamInfo.currentStage
        }
      }
    } as ErrorMessage);

    this.emit('streamError', streamId, error);
  }

  /**
   * Emit a message for a stream
   */
  public emitMessage(streamId: string, message: StreamingMessage): void {
    const streamInfo = this.activeStreams.get(streamId);
    if (!streamInfo) return;

    // Update stream activity
    streamInfo.lastActivity = Date.now();

    // Update progress if it's a progress message
    if (message.type === 'progress') {
      const progressMsg = message as ProgressMessage;
      streamInfo.progress = progressMsg.data.progress;
      streamInfo.currentStage = progressMsg.data.stage;
    }

    // Emit to listeners
    this.emit('message', streamId, message);
    this.emit(`message:${streamId}`, message);
  }

  /**
   * Setup cleanup for old streams
   */
  private setupCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const [streamId, streamInfo] of this.activeStreams.entries()) {
        if (now - streamInfo.lastActivity > maxAge) {
          this.activeStreams.delete(streamId);
          this.emit('streamCleanedUp', streamId);
        }
      }
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
    this.activeStreams.clear();
  }
}

/**
 * Helper function to create progress messages
 */
export function createProgressMessage(
  stage: string,
  progress: number,
  message: string,
  details?: string
): ProgressMessage {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    type: 'progress',
    data: {
      stage,
      progress: Math.max(0, Math.min(100, progress)),
      message,
      details
    }
  };
}

/**
 * Helper function to create data messages
 */
export function createDataMessage(
  content: any,
  partial: boolean = false,
  contentType: 'json' | 'text' | 'binary' = 'json'
): DataMessage {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    type: 'data',
    data: {
      partial,
      content,
      contentType
    }
  };
}

/**
 * Helper function to create error messages
 */
export function createErrorMessage(
  error: string,
  code?: string,
  recoverable: boolean = false,
  context?: Record<string, any>
): ErrorMessage {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    type: 'error',
    data: {
      error,
      ...(code !== undefined && { code }),
      recoverable,
      ...(context !== undefined && { context })
    }
  };
}

// Global streaming manager instance
export const streamingManager = new StreamingManager();