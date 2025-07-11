/**
 * Error Handling Utilities
 * 
 * Centralized error handling patterns and utilities for consistent error management.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from './logger.js';

const logger = createLogger('ErrorHandler');

/**
 * Extract error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}

/**
 * Convert unknown errors to MCP errors with proper error codes
 */
export function toMcpError(error: unknown, context?: string): McpError {
  if (error instanceof McpError) {
    return error;
  }
  
  const message = getErrorMessage(error);
  const contextMessage = context ? `${context}: ${message}` : message;
  
  // Determine appropriate error code based on error type/message
  let errorCode = ErrorCode.InternalError;
  
  if (message.includes('timeout') || message.includes('TIMEOUT')) {
    errorCode = ErrorCode.InternalError; // MCP doesn't have timeout-specific code
  } else if (message.includes('not found') || message.includes('NOT_FOUND')) {
    errorCode = ErrorCode.InvalidRequest;
  } else if (message.includes('unauthorized') || message.includes('UNAUTHORIZED')) {
    errorCode = ErrorCode.InvalidRequest;
  } else if (message.includes('bad request') || message.includes('validation')) {
    errorCode = ErrorCode.InvalidParams;
  }
  
  return new McpError(errorCode, contextMessage);
}

/**
 * Async error handler wrapper for tools
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Operation failed: ${context}`, { error: getErrorMessage(error) });
    throw toMcpError(error, context);
  }
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
        context,
        error: getErrorMessage(error),
        attempt,
        maxRetries
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  logger.error(`All ${maxRetries} attempts failed`, {
    context,
    error: getErrorMessage(lastError)
  });
  
  throw toMcpError(lastError, context ? `${context} (after ${maxRetries} attempts)` : undefined);
}

/**
 * Timeout wrapper for operations
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    throw toMcpError(error, context);
  }
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T = unknown>(json: string, fallback?: T): T | null {
  try {
    return JSON.parse(json);
  } catch (error) {
    logger.warn('Failed to parse JSON', { error: getErrorMessage(error), json: json.slice(0, 100) });
    return fallback ?? null;
  }
}
