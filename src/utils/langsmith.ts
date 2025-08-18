import { Client } from 'langsmith';
import { RunTreeConfig, RunTree } from 'langsmith/run_trees';
import { logger } from './mcp-logger.js';

let langsmithClient: Client | null = null;

/**
 * Initialize LangSmith client if tracing is enabled
 */
export function initializeLangSmith(): void {
  const tracingEnabled = process.env.LANGCHAIN_TRACING_V2 === 'true';
  
  if (!tracingEnabled) {
    logger.langsmith('Tracing disabled via LANGCHAIN_TRACING_V2');
    return;
  }

  const apiKey = process.env.LANGCHAIN_API_KEY;
  if (!apiKey) {
    logger.warn('[LangSmith] LANGCHAIN_API_KEY not set, tracing disabled');
    return;
  }

  try {
    langsmithClient = new Client({
      apiKey,
      apiUrl: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
    });

    logger.langsmith('Initialized successfully', {
      project: process.env.LANGCHAIN_PROJECT || 'default',
      endpoint: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com'
    });
  } catch (error) {
    logger.error('[LangSmith] Failed to initialize', error);
  }
}

/**
 * Create a new run tree for tracing
 */
export async function createRunTree(
  name: string,
  runType: 'tool' | 'chain' | 'llm' | 'retriever' = 'tool',
  inputs: Record<string, any> = {},
  metadata: Record<string, any> = {}
): Promise<RunTree | null> {
  if (!langsmithClient) {
    return null;
  }

  try {
    const projectName = process.env.LANGCHAIN_PROJECT || 'aoma-mesh-mcp';
    
    const runTree = new RunTree({
      name,
      run_type: runType,
      inputs,
      metadata: {
        ...metadata,
        server: 'aoma-mesh-mcp',
        version: process.env.MCP_SERVER_VERSION || '1.0.0',
      },
      project_name: projectName,
      client: langsmithClient,
    });

    await runTree.postRun();
    return runTree;
  } catch (error) {
    logger.error('[LangSmith] Failed to create run tree', error);
    return null;
  }
}

/**
 * Trace a tool call with LangSmith
 */
export async function traceToolCall<T>(
  toolName: string,
  args: Record<string, any>,
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  const runTree = await createRunTree(
    toolName,
    'tool',
    { args },
    { tool: toolName, ...metadata }
  );

  const startTime = Date.now();
  
  try {
    const result = await fn();
    
    if (runTree) {
      await runTree.end({
        outputs: { result },
        metadata: {
          duration_ms: Date.now() - startTime,
          success: true,
        },
      });
      await runTree.patchRun();
    }
    
    return result;
  } catch (error) {
    if (runTree) {
      await runTree.end({
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration_ms: Date.now() - startTime,
          success: false,
          error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      });
      await runTree.patchRun();
    }
    
    throw error;
  }
}

/**
 * Trace an LLM call with LangSmith
 */
export async function traceLLMCall<T>(
  model: string,
  messages: any[],
  fn: () => Promise<T>,
  metadata: Record<string, any> = {}
): Promise<T> {
  const runTree = await createRunTree(
    `${model} Call`,
    'llm',
    { messages },
    { model, ...metadata }
  );

  const startTime = Date.now();
  
  try {
    const result = await fn();
    
    if (runTree) {
      await runTree.end({
        outputs: { result },
        metadata: {
          duration_ms: Date.now() - startTime,
          success: true,
        },
      });
      await runTree.patchRun();
    }
    
    return result;
  } catch (error) {
    if (runTree) {
      await runTree.end({
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          duration_ms: Date.now() - startTime,
          success: false,
        },
      });
      await runTree.patchRun();
    }
    
    throw error;
  }
}

/**
 * Create a traced wrapper for any async function
 */
export function createTracedFunction<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  runType: 'tool' | 'chain' | 'llm' | 'retriever' = 'chain'
): T {
  return (async (...args: Parameters<T>) => {
    const runTree = await createRunTree(
      name,
      runType,
      { args },
      { function: name }
    );

    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      
      if (runTree) {
        await runTree.end({
          outputs: { result },
          metadata: {
            duration_ms: Date.now() - startTime,
            success: true,
          },
        });
        await runTree.patchRun();
      }
      
      return result;
    } catch (error) {
      if (runTree) {
        await runTree.end({
          error: error instanceof Error ? error.message : String(error),
          metadata: {
            duration_ms: Date.now() - startTime,
            success: false,
          },
        });
        await runTree.patchRun();
      }
      
      throw error;
    }
  }) as T;
}

/**
 * Get the LangSmith client instance
 */
export function getLangSmithClient(): Client | null {
  return langsmithClient;
}

/**
 * Check if LangSmith tracing is enabled
 */
export function isLangSmithEnabled(): boolean {
  return langsmithClient !== null;
}