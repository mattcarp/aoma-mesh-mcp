/**
 * MCP-Safe Logger
 * 
 * Provides logging capabilities for MCP servers without breaking the JSON-RPC protocol.
 * All logs are written to files or sent to external services, never to stdout.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  error?: any;
}

class MCPLogger {
  private logFile: string;
  private logStream: fs.WriteStream | null = null;
  private readonly maxLogSize = 10 * 1024 * 1024; // 10MB
  private currentLogSize = 0;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.MCP_LOGGING === 'true' || process.env.NODE_ENV === 'development';
    
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../../logs');
    if (this.enabled && !fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Set up log file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.logFile = path.join(logsDir, `mcp-server-${timestamp}.log`);
    
    if (this.enabled) {
      this.initLogStream();
    }
  }

  private initLogStream(): void {
    if (this.logStream) {
      this.logStream.end();
    }

    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    this.currentLogSize = 0;
    
    // Check file size periodically
    if (fs.existsSync(this.logFile)) {
      const stats = fs.statSync(this.logFile);
      this.currentLogSize = stats.size;
    }
  }

  private rotateLogIfNeeded(): void {
    if (this.currentLogSize > this.maxLogSize) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedFile = this.logFile.replace('.log', `-rotated-${timestamp}.log`);
      
      if (this.logStream) {
        this.logStream.end();
      }
      
      fs.renameSync(this.logFile, rotatedFile);
      this.initLogStream();
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, message, data, error } = entry;
    let logLine = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      logLine += ` | Data: ${JSON.stringify(data, null, 2)}`;
    }
    
    if (error) {
      const errorMessage = error instanceof Error ? 
        `${error.message}\n${error.stack}` : 
        JSON.stringify(error, null, 2);
      logLine += ` | Error: ${errorMessage}`;
    }
    
    return logLine + '\n';
  }

  private writeLog(entry: LogEntry): void {
    if (!this.enabled || !this.logStream) return;

    const logLine = this.formatLogEntry(entry);
    this.currentLogSize += Buffer.byteLength(logLine);
    
    this.logStream.write(logLine);
    this.rotateLogIfNeeded();
  }

  log(level: LogLevel, message: string, data?: any, error?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      error
    };

    this.writeLog(entry);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any, data?: any): void {
    this.log(LogLevel.ERROR, message, data, error);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true') {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  // Special method for LangSmith integration logging
  langsmith(event: string, data?: any): void {
    this.log(LogLevel.INFO, `[LangSmith] ${event}`, data);
  }

  // Get the current log file path (useful for debugging)
  getLogFilePath(): string {
    return this.logFile;
  }

  // Flush logs immediately (useful before shutdown)
  flush(): Promise<void> {
    return new Promise((resolve) => {
      if (this.logStream) {
        this.logStream.end(() => resolve());
      } else {
        resolve();
      }
    });
  }
}

// Export singleton instance
export const logger = new MCPLogger();

// Also export for testing or special cases
export { MCPLogger };
