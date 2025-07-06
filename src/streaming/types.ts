/**
 * Streaming Response Types for MC-TK MCP Server
 * Provides real-time feedback for long-running operations
 */

export interface StreamingMessage {
  id: string;
  timestamp: number;
  type: 'progress' | 'data' | 'error' | 'complete';
  data: any;
  metadata?: Record<string, any>;
}

export interface ProgressMessage extends StreamingMessage {
  type: 'progress';
  data: {
    stage: string;
    progress: number; // 0-100
    message: string;
    details?: string;
  };
}

export interface DataMessage extends StreamingMessage {
  type: 'data';
  data: {
    partial: boolean;
    content: any;
    contentType: 'json' | 'text' | 'binary';
  };
}

export interface ErrorMessage extends StreamingMessage {
  type: 'error';
  data: {
    error: string;
    code?: string;
    recoverable: boolean;
    context?: Record<string, any>;
  };
}

export interface CompleteMessage extends StreamingMessage {
  type: 'complete';
  data: {
    result: any;
    summary: string;
    metrics?: {
      duration: number;
      operations: number;
      cacheHits?: number;
      errors?: number;
    };
  };
}

export interface StreamingOptions {
  enableProgress?: boolean;
  enablePartialResults?: boolean;
  bufferSize?: number;
  timeout?: number;
  cancellationToken?: AbortSignal;
}

export interface StreamingContext {
  streamId: string;
  operation: string;
  startTime: number;
  options: StreamingOptions;
  emit: (message: StreamingMessage) => void;
  isCancelled: () => boolean;
  updateProgress: (progress: number, stage?: string) => void;
  args: any;
}

export type StreamingHandler = (context: StreamingContext) => Promise<any>;

export interface StreamingCapability {
  supportsStreaming: boolean;
  supportsProgress: boolean;
  supportsPartialResults: boolean;
  supportsCancellation: boolean;
  estimatedDuration?: number;
}

/**
 * Stream state management
 */
export enum StreamState {
  PENDING = 'pending',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

export interface StreamInfo {
  id: string;
  operation: string;
  state: StreamState;
  startTime: number;
  lastActivity: number;
  progress: number;
  currentStage: string;
  messageCount: number;
  metadata: Record<string, any>;
}

/**
 * Streaming operation registry
 */
export interface StreamingOperation {
  name: string;
  execute: StreamingHandler;
  capabilities: StreamingCapability;
  description: string;
}