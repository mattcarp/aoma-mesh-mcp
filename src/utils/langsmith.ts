import { Client } from 'langsmith';
import { RunTree } from 'langsmith/run_trees';
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
  metadata: Record<string, any> = {},
  correlationId?: string
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
        correlationId,
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
  metadata: Record<string, any> = {},
  correlationId?: string
): Promise<T> {
  const runTree = await createRunTree(
    toolName,
    'tool',
    { args },
    { tool: toolName, ...metadata },
    correlationId
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
  metadata: Record<string, any> = {},
  correlationId?: string
): Promise<T> {
  const runTree = await createRunTree(
    `${model} Call`,
    'llm',
    { messages },
    { model, ...metadata },
    correlationId
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
  runType: 'tool' | 'chain' | 'llm' | 'retriever' = 'chain',
  correlationId?: string
): T {
  return (async (...args: Parameters<T>) => {
    const runTree = await createRunTree(
      name,
      runType,
      { args },
      { function: name },
      correlationId
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

/**
 * Get LangSmith project metrics
 */
export async function getProjectMetrics(
  projectName?: string,
  timeRange: { startTime?: Date; endTime?: Date } = {}
): Promise<any> {
  if (!langsmithClient) {
    throw new Error('LangSmith client not initialized');
  }

  try {
    const project = projectName || process.env.LANGCHAIN_PROJECT || 'aoma-mesh-mcp';
    
    const runs = await langsmithClient.listRuns({
      projectName: project,
      startTime: timeRange.startTime,
      // endTime is not supported by ListRunsParams, filter will be applied after fetching
      limit: 100,
    });

    const metrics = {
      project: project,
      timeRange: {
        startTime: timeRange.startTime?.toISOString(),
        endTime: timeRange.endTime?.toISOString(),
      },
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      averageDuration: 0,
      toolMetrics: {} as Record<string, any>,
      recentActivity: [] as any[],
    };

    let totalDuration = 0;
    const toolStats: Record<string, { count: number; successes: number; totalDuration: number }> = {};

    for await (const run of runs) {
      // Filter by endTime if provided
      if (timeRange.endTime && run.start_time) {
        const runStartTime = new Date(run.start_time);
        if (runStartTime > timeRange.endTime) {
          continue;
        }
      }
      metrics.totalRuns++;
      
      const duration = run.end_time && run.start_time 
        ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime()
        : 0;
      
      totalDuration += duration;

      if (run.error) {
        metrics.failedRuns++;
      } else {
        metrics.successfulRuns++;
      }

      const toolName = run.name || 'unknown';
      if (!toolStats[toolName]) {
        toolStats[toolName] = { count: 0, successes: 0, totalDuration: 0 };
      }
      
      toolStats[toolName].count++;
      toolStats[toolName].totalDuration += duration;
      
      if (!run.error) {
        toolStats[toolName].successes++;
      }

      if (metrics.recentActivity.length < 10) {
        metrics.recentActivity.push({
          name: run.name,
          startTime: run.start_time,
          duration: duration,
          success: !run.error,
          error: run.error || null,
        });
      }
    }

    metrics.averageDuration = metrics.totalRuns > 0 ? totalDuration / metrics.totalRuns : 0;
    
    Object.entries(toolStats).forEach(([tool, stats]) => {
      metrics.toolMetrics[tool] = {
        totalCalls: stats.count,
        successRate: stats.count > 0 ? (stats.successes / stats.count) * 100 : 0,
        averageDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
        failureCount: stats.count - stats.successes,
      };
    });

    return metrics;
  } catch (error) {
    logger.error('[LangSmith] Failed to get project metrics', error);
    throw error;
  }
}

/**
 * Get recent traces from LangSmith
 */
export async function getRecentTraces(
  limit: number = 20,
  projectName?: string
): Promise<any[]> {
  if (!langsmithClient) {
    throw new Error('LangSmith client not initialized');
  }

  try {
    const project = projectName || process.env.LANGCHAIN_PROJECT || 'aoma-mesh-mcp';
    
    const runs = await langsmithClient.listRuns({
      projectName: project,
      limit,
    });

    const traces = [];
    for await (const run of runs) {
      traces.push({
        id: run.id,
        name: run.name,
        runType: run.run_type,
        startTime: run.start_time,
        endTime: run.end_time,
        duration: run.end_time && run.start_time 
          ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime()
          : null,
        status: run.error ? 'error' : 'success',
        error: run.error || null,
        inputs: run.inputs,
        outputs: run.outputs,
        metadata: run.extra?.metadata || {},
      });
    }

    return traces;
  } catch (error) {
    logger.error('[LangSmith] Failed to get recent traces', error);
    throw error;
  }
}

/**
 * Get LangSmith configuration and status
 */
export function getLangSmithStatus(): any {
  return {
    enabled: isLangSmithEnabled(),
    project: process.env.LANGCHAIN_PROJECT || 'aoma-mesh-mcp',
    endpoint: process.env.LANGCHAIN_ENDPOINT || 'https://api.smith.langchain.com',
    tracingEnabled: process.env.LANGCHAIN_TRACING_V2 === 'true',
    hasApiKey: !!process.env.LANGCHAIN_API_KEY,
    clientInitialized: langsmithClient !== null,
  };
}