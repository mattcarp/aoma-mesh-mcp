/**
 * Common Types for AOMA Mesh MCP Server
 *
 * Shared interfaces and types used across the application.
 */
export interface VectorSearchResult {
    id: string;
    title: string;
    content: string;
    similarity: number;
    url?: string;
    crawled_at?: string;
    metadata?: Record<string, unknown>;
}
export interface ServerMetrics {
    uptime: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    lastRequestTime: string;
    version: string;
}
export interface HealthStatus {
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
            error?: string;
        };
    };
    metrics: ServerMetrics;
    timestamp: string;
}
