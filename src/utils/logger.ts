/**
 * Structured Logger for AOMA Mesh MCP Server
 * 
 * Provides consistent, structured logging with multiple levels and metadata support.
 * Replaces scattered console.error calls with proper logging infrastructure.
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogMetadata {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: LogMetadata;
  context?: string;
}

export class Logger {
  private readonly logLevel: LogLevel;
  private readonly context?: string;

  constructor(logLevel: LogLevel = 'info', context?: string) {
    this.logLevel = logLevel;
    this.context = context;
  }

  /**
   * Create a new logger with additional context
   */
  withContext(context: string): Logger {
    return new Logger(this.logLevel, this.context ? `${this.context}:${context}` : context);
  }

  /**
   * Log error message with optional metadata
   */
  error(message: string, metadata?: LogMetadata): void {
    this.log('error', message, metadata);
  }

  /**
   * Log warning message with optional metadata
   */
  warn(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('warn')) {
      this.log('warn', message, metadata);
    }
  }

  /**
   * Log info message with optional metadata
   */
  info(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('info')) {
      this.log('info', message, metadata);
    }
  }

  /**
   * Log debug message with optional metadata
   */
  debug(message: string, metadata?: LogMetadata): void {
    if (this.shouldLog('debug')) {
      this.log('debug', message, metadata);
    }
  }

  /**
   * Sanitize sensitive data from log metadata
   */
  sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'key', 'secret', 'apikey', 'api_key'];
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    };
    
    return levels[level] <= levels[this.logLevel];
  }

  private log(level: LogLevel, message: string, metadata?: LogMetadata): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata: metadata ? this.sanitize(metadata) : undefined,
      context: this.context,
    };

    const output = this.formatOutput(entry);
    
    // Use console.error for all output to ensure it appears in MCP logs
    console.error(output);
  }

  private formatOutput(entry: LogEntry): string {
    const levelTag = `[${entry.level.toUpperCase()}]`;
    const contextTag = entry.context ? ` [${entry.context}]` : '';
    const timestamp = entry.timestamp;
    const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    
    return `${timestamp} ${levelTag}${contextTag} ${entry.message}${metadata}`;
  }
}

/**
 * Default logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with specific context
 */
export function createLogger(context: string, logLevel?: LogLevel): Logger {
  return new Logger(logLevel || 'info', context);
}
