#!/usr/bin/env node
/**
 * AOMA Mesh MCP Server - Lambda Optimized Version
 *
 * Optimized for AWS Lambda deployment with Function URLs.
 * Removes Express server and stdio transport dependencies.
 *
 * @version 2.0.0-lambda
 * @author MC-TK Development Team
 */
import { Tool, Resource, CallToolResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
        openai: {
            status: boolean;
            latency?: number;
            error?: string;
        };
        supabase: {
            status: boolean;
            latency?: number;
            error?: string;
        };
        vectorStore: {
            status: boolean;
            latency?: number;
            error?: string;
        };
    };
    metrics: {
        uptime: number;
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        lastRequestTime: string;
        version: string;
    };
    timestamp: string;
}
interface ServerMetrics {
    uptime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestTime: string;
    version: string;
    lambdaInvocations?: number;
    coldStarts?: number;
}
/**
 * Lambda-optimized AOMA Mesh MCP Server
 */
export declare class AOMAMeshServer {
    private readonly env;
    private readonly openaiClient;
    private readonly supabaseClient;
    private readonly startTime;
    private metrics;
    private healthCache;
    private readonly HEALTH_CACHE_TTL;
    private isInitialized;
    constructor();
    /**
     * Initialize server (called once per Lambda container)
     */
    initialize(): Promise<void>;
    /**
     * Validate environment (Lambda optimized - no file system access)
     */
    private validateAndLoadEnvironment;
    /**
     * Handle MCP request (main entry point)
     */
    handleMCPRequest(request: any): Promise<any>;
    /**
     * Call a tool directly
     */
    callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult>;
    /**
     * Get tool definitions
     */
    getToolDefinitions(): Tool[];
    /**
     * Get resource definitions
     */
    getResourceDefinitions(): Resource[];
    /**
     * Read a resource
     */
    readResource(uri: string): Promise<ReadResourceResult>;
    /**
     * Get health status with caching
     */
    getHealthStatus(): Promise<HealthStatus>;
    /**
     * Perform actual health check
     */
    private performHealthCheck;
    /**
     * Get metrics
     */
    getMetrics(): Promise<ServerMetrics>;
    /**
     * Update invocation metrics (Lambda-specific)
     */
    updateInvocationMetrics(duration: number): void;
    private queryAOMAKnowledge;
    private searchJiraTickets;
    /**
     * Poll OpenAI Assistant run completion
     */
    private pollRunCompletion;
    /**
     * Get strategy-specific prompts
     */
    private getStrategyPrompt;
    private delay;
    private getAOMADocumentsSample;
    private getJiraTicketsSample;
    private updateResponseMetrics;
    private sanitizeArgs;
    private getErrorMessage;
    private logError;
    private logWarn;
    private logInfo;
}
export {};
