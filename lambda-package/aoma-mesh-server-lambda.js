#!/usr/bin/env node
"use strict";
/**
 * AOMA Mesh MCP Server - Lambda Optimized Version
 *
 * Optimized for AWS Lambda deployment with Function URLs.
 * Removes Express server and stdio transport dependencies.
 *
 * @version 2.0.0-lambda
 * @author MC-TK Development Team
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AOMAMeshServer = void 0;
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const openai_1 = __importDefault(require("openai"));
const supabase_js_1 = require("@supabase/supabase-js");
const zod_1 = require("zod");
// Environment validation with Lambda-specific defaults
const EnvSchema = zod_1.z.object({
    OPENAI_API_KEY: zod_1.z.string().min(20, 'OpenAI API key must be at least 20 characters'),
    AOMA_ASSISTANT_ID: zod_1.z.string().startsWith('asst_', 'Invalid AOMA Assistant ID format'),
    OPENAI_VECTOR_STORE_ID: zod_1.z.string().startsWith('vs_', 'Invalid Vector Store ID format').optional(),
    NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url('Invalid Supabase URL'),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(20, 'Supabase service key required'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().min(20, 'Supabase anonymous key required'),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('production'),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    MCP_SERVER_VERSION: zod_1.z.string().default('2.0.0-lambda'),
    MAX_RETRIES: zod_1.z.coerce.number().int().min(1).max(10).default(3),
    TIMEOUT_MS: zod_1.z.coerce.number().int().min(5000).max(300000).default(30000),
    // Lambda-specific: No HTTP_PORT needed
});
/**
 * Lambda-optimized AOMA Mesh MCP Server
 */
class AOMAMeshServer {
    env;
    openaiClient;
    supabaseClient;
    startTime = Date.now();
    metrics;
    healthCache = null;
    HEALTH_CACHE_TTL = 30000; // 30 seconds
    isInitialized = false;
    constructor() {
        // Lambda optimization: Load environment without file system dependencies
        this.env = this.validateAndLoadEnvironment();
        // Initialize OpenAI client with retry configuration
        this.openaiClient = new openai_1.default({
            apiKey: this.env.OPENAI_API_KEY,
            timeout: this.env.TIMEOUT_MS,
            maxRetries: this.env.MAX_RETRIES,
        });
        // Initialize Supabase client with optimized settings for Lambda
        this.supabaseClient = (0, supabase_js_1.createClient)(this.env.NEXT_PUBLIC_SUPABASE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: {
                headers: { 'x-client-info': 'aoma-mesh-mcp-lambda/2.0.0' }
            },
        });
        // Initialize metrics with Lambda-specific fields
        this.metrics = {
            uptime: 0,
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageResponseTime: 0,
            lastRequestTime: new Date().toISOString(),
            version: this.env.MCP_SERVER_VERSION,
            lambdaInvocations: 0,
            coldStarts: 0,
        };
    }
    /**
     * Initialize server (called once per Lambda container)
     */
    async initialize() {
        if (this.isInitialized) {
            this.logInfo('Server already initialized, skipping...');
            return;
        }
        try {
            this.logInfo('🚀 Initializing AOMA Mesh MCP Server (Lambda)', {
                version: this.env.MCP_SERVER_VERSION,
                environment: this.env.NODE_ENV,
            });
            // Test connections
            await this.performHealthCheck();
            this.isInitialized = true;
            this.metrics.coldStarts = (this.metrics.coldStarts || 0) + 1;
            this.logInfo('✅ AOMA Mesh MCP Server initialized successfully', {
                tools: this.getToolDefinitions().length,
                resources: this.getResourceDefinitions().length,
            });
        }
        catch (error) {
            this.logError('❌ Failed to initialize AOMA Mesh MCP Server', error);
            throw error;
        }
    }
    /**
     * Validate environment (Lambda optimized - no file system access)
     */
    validateAndLoadEnvironment() {
        try {
            // In Lambda, environment variables are already loaded
            const result = EnvSchema.parse(process.env);
            console.log('[INFO] Environment validated successfully', {
                nodeEnv: result.NODE_ENV,
                logLevel: result.LOG_LEVEL,
                version: result.MCP_SERVER_VERSION,
            });
            return result;
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join(', ');
                console.error('❌ Environment validation failed:', issues);
                throw new Error(`Environment validation failed: ${issues}`);
            }
            throw error;
        }
    }
    /**
     * Handle MCP request (main entry point)
     */
    async handleMCPRequest(request) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        this.metrics.lambdaInvocations = (this.metrics.lambdaInvocations || 0) + 1;
        try {
            let result;
            if (request.method === 'tools/list') {
                result = { tools: this.getToolDefinitions() };
            }
            else if (request.method === 'tools/call') {
                const { name, arguments: args } = request.params;
                result = await this.callTool(name, args);
            }
            else if (request.method === 'resources/list') {
                result = { resources: this.getResourceDefinitions() };
            }
            else if (request.method === 'resources/read') {
                const { uri } = request.params;
                result = await this.readResource(uri);
            }
            else {
                throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown method: ${request.method}`);
            }
            this.metrics.successfulRequests++;
            this.updateResponseMetrics(Date.now() - startTime);
            return {
                jsonrpc: '2.0',
                id: request.id,
                result,
            };
        }
        catch (error) {
            this.metrics.failedRequests++;
            this.logError('MCP request failed', error);
            return {
                jsonrpc: '2.0',
                id: request.id,
                error: {
                    code: error instanceof types_js_1.McpError ? error.code : types_js_1.ErrorCode.InternalError,
                    message: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
    /**
     * Call a tool directly
     */
    async callTool(name, args) {
        const startTime = Date.now();
        try {
            this.logInfo(`Tool call: ${name}`, this.sanitizeArgs(args));
            let result;
            switch (name) {
                case 'query_aoma_knowledge':
                    result = await this.queryAOMAKnowledge(args);
                    break;
                case 'search_jira_tickets':
                    result = await this.searchJiraTickets(args);
                    break;
                case 'get_system_health':
                    const health = await this.getHealthStatus();
                    result = {
                        content: [{
                                type: 'text',
                                text: JSON.stringify(health, null, 2),
                            }],
                    };
                    break;
                default:
                    throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
            }
            const duration = Date.now() - startTime;
            this.logInfo(`Tool completed: ${name}`, { duration });
            return result;
        }
        catch (error) {
            this.logError(`Tool failed: ${name}`, error);
            throw error instanceof types_js_1.McpError ? error :
                new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Tool ${name} failed: ${this.getErrorMessage(error)}`);
        }
    }
    /**
     * Get tool definitions
     */
    getToolDefinitions() {
        return [
            {
                name: 'query_aoma_knowledge',
                description: 'Query the Sony Music AOMA knowledge base for business intelligence and procedures',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The question or topic to search for in the AOMA knowledge base',
                        },
                        strategy: {
                            type: 'string',
                            enum: ['comprehensive', 'focused', 'rapid'],
                            description: 'Search strategy (default: comprehensive)',
                            default: 'comprehensive',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of results to return (default: 10)',
                            default: 10,
                        },
                        threshold: {
                            type: 'number',
                            description: 'Similarity threshold (0-1, default: 0.7)',
                            default: 0.7,
                        },
                        context: {
                            type: 'string',
                            description: 'Additional context for the query',
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'search_jira_tickets',
                description: 'Search Sony Music JIRA tickets with semantic similarity',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'Search query for JIRA tickets',
                        },
                        projectKey: {
                            type: 'string',
                            description: 'JIRA project key to filter by (e.g., AOMA, ITSM)',
                        },
                        status: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Status values to filter by',
                        },
                        priority: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Priority values to filter by',
                        },
                        maxResults: {
                            type: 'number',
                            description: 'Maximum number of results (default: 15)',
                            default: 15,
                        },
                        threshold: {
                            type: 'number',
                            description: 'Similarity threshold (default: 0.6)',
                            default: 0.6,
                        },
                    },
                    required: ['query'],
                },
            },
            {
                name: 'get_system_health',
                description: 'Get detailed system health and performance metrics',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ];
    }
    /**
     * Get resource definitions
     */
    getResourceDefinitions() {
        return [
            {
                uri: 'aoma://knowledge-base',
                name: 'AOMA Knowledge Base',
                description: 'Sony Music AOMA knowledge base with business procedures and documentation',
                mimeType: 'application/json',
            },
            {
                uri: 'jira://tickets',
                name: 'JIRA Tickets',
                description: 'Sony Music JIRA tickets and issue tracking',
                mimeType: 'application/json',
            },
        ];
    }
    /**
     * Read a resource
     */
    async readResource(uri) {
        if (uri === 'aoma://knowledge-base') {
            const docs = await this.getAOMADocumentsSample();
            return {
                contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(docs, null, 2),
                    }],
            };
        }
        if (uri === 'jira://tickets') {
            const tickets = await this.getJiraTicketsSample();
            return {
                contents: [{
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify(tickets, null, 2),
                    }],
            };
        }
        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
    /**
     * Get health status with caching
     */
    async getHealthStatus() {
        const now = Date.now();
        if (this.healthCache && (now - this.healthCache.lastCheck) < this.HEALTH_CACHE_TTL) {
            return this.healthCache.status;
        }
        const status = await this.performHealthCheck();
        this.healthCache = { status, lastCheck: now };
        return status;
    }
    /**
     * Perform actual health check
     */
    async performHealthCheck() {
        const services = {
            openai: { status: false, latency: 0, error: undefined },
            supabase: { status: false, latency: 0, error: undefined },
            vectorStore: { status: false, latency: 0, error: undefined },
        };
        // Test OpenAI
        try {
            const start = Date.now();
            await this.openaiClient.models.list();
            services.openai = { status: true, latency: Date.now() - start, error: undefined };
        }
        catch (error) {
            services.openai = {
                status: false,
                latency: 0,
                error: this.getErrorMessage(error)
            };
        }
        // Test Supabase
        try {
            const start = Date.now();
            await this.supabaseClient.from('docs').select('id').limit(1);
            services.supabase = { status: true, latency: Date.now() - start, error: undefined };
        }
        catch (error) {
            services.supabase = {
                status: false,
                latency: 0,
                error: this.getErrorMessage(error)
            };
        }
        // Test Vector Store (if configured)
        if (this.env.OPENAI_VECTOR_STORE_ID) {
            try {
                const start = Date.now();
                // Check if vectorStore API is available
                if ('vectorStores' in this.openaiClient.beta) {
                    await this.openaiClient.beta.vectorStores.retrieve(this.env.OPENAI_VECTOR_STORE_ID);
                }
                services.vectorStore = { status: true, latency: Date.now() - start, error: undefined };
            }
            catch (error) {
                services.vectorStore = {
                    status: false,
                    latency: 0,
                    error: this.getErrorMessage(error)
                };
            }
        }
        else {
            services.vectorStore = { status: true, latency: 0, error: undefined };
        }
        // Determine overall status
        const allHealthy = Object.values(services).every(service => service.status);
        const someHealthy = Object.values(services).some(service => service.status);
        return {
            status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
            services,
            metrics: {
                uptime: Date.now() - this.startTime,
                totalRequests: this.metrics.totalRequests,
                successfulRequests: this.metrics.successfulRequests,
                failedRequests: this.metrics.failedRequests,
                averageResponseTime: this.metrics.averageResponseTime,
                lastRequestTime: this.metrics.lastRequestTime,
                version: this.env.MCP_SERVER_VERSION,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Get metrics
     */
    async getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.startTime,
        };
    }
    /**
     * Update invocation metrics (Lambda-specific)
     */
    updateInvocationMetrics(duration) {
        this.updateResponseMetrics(duration);
    }
    // Tool implementations (Lambda optimized)
    async queryAOMAKnowledge(request) {
        const { query, strategy = 'focused', context, maxResults = 10 } = request;
        if (!query?.trim()) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidRequest, 'Query cannot be empty');
        }
        try {
            // Enhanced query with context if provided
            const enhancedQuery = context ? `Context: ${context}\n\nQuery: ${query}` : query;
            this.logInfo('AOMA knowledge query started', {
                queryLength: query.length,
                strategy,
                hasContext: !!context
            });
            // Use OpenAI Assistant API with AOMA assistant
            const thread = await this.openaiClient.beta.threads.create({
                messages: [{
                        role: 'user',
                        content: enhancedQuery,
                    }],
            });
            const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
                assistant_id: this.env.AOMA_ASSISTANT_ID,
                additional_instructions: this.getStrategyPrompt(strategy),
            });
            const response = await this.pollRunCompletion(thread.id, run.id);
            // Clean up thread to prevent quota issues
            try {
                await this.openaiClient.beta.threads.del(thread.id);
            }
            catch (cleanupError) {
                this.logWarn('Failed to cleanup thread', cleanupError);
            }
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            query,
                            strategy,
                            response,
                            metadata: {
                                hasContext: !!context,
                                threadId: thread.id,
                                timestamp: new Date().toISOString(),
                                version: this.env.MCP_SERVER_VERSION,
                            },
                        }, null, 2),
                    }],
            };
        }
        catch (error) {
            this.logError('AOMA knowledge query failed', error);
            throw error instanceof types_js_1.McpError ? error :
                new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `AOMA knowledge query failed: ${this.getErrorMessage(error)}`);
        }
    }
    async searchJiraTickets(request) {
        const { query, projectKey, status, priority, maxResults = 15, threshold = 0.6 } = request;
        try {
            this.logInfo('Jira search started', {
                queryLength: query.length,
                projectKey,
                maxResults,
                threshold
            });
            let results = [];
            let searchMethod = 'vector';
            try {
                // Build filters
                const filters = {};
                if (projectKey)
                    filters.project_key = projectKey;
                if (status?.length)
                    filters.status = status;
                if (priority?.length)
                    filters.priority = priority;
                // First, generate the embedding for the query using the OpenAI client
                const embeddingResponse = await this.openaiClient.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: query,
                });
                // Safely handle the response to prevent build errors
                if (!embeddingResponse?.data?.[0]?.embedding) {
                    throw new Error('Failed to generate embedding for Jira search query.');
                }
                const query_embedding = embeddingResponse.data[0].embedding;
                const { data, error } = await this.supabaseClient
                    .rpc('search_jira_tickets_semantic', {
                    p_query_embedding: query_embedding,
                    p_max_results: maxResults,
                    p_similarity_threshold: threshold,
                    p_filters: Object.keys(filters).length > 0 ? filters : null,
                });
                if (error) {
                    throw new Error(`Jira search failed: ${error.message}`);
                }
                results = data || [];
            }
            catch (vectorError) {
                this.logWarn('Vector search failed, falling back to text search', vectorError);
                searchMethod = 'text';
                // Fallback to basic text search
                let query_builder = this.supabaseClient
                    .from('jira_tickets')
                    .select('external_id, title, status, priority, metadata')
                    .limit(maxResults);
                // Add filters
                if (projectKey) {
                    query_builder = query_builder.eq('metadata->>projectKey', projectKey);
                }
                if (status?.length) {
                    query_builder = query_builder.in('status', status);
                }
                if (priority?.length) {
                    query_builder = query_builder.in('priority', priority);
                }
                // Text search in title and description
                if (query.trim()) {
                    query_builder = query_builder.or(`title.ilike.%${query}%,external_id.ilike.%${query}%`);
                }
                const { data, error } = await query_builder;
                if (error) {
                    throw new Error(`Text search failed: ${error.message}`);
                }
                results = (data || []).map((ticket) => ({
                    key: ticket.external_id,
                    summary: ticket.title,
                    status: ticket.status,
                    priority: ticket.priority,
                    project_key: ticket.metadata?.projectKey || 'Unknown',
                    similarity: 0.5, // Default similarity for text search
                }));
            }
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            query,
                            filters: { projectKey, status, priority },
                            results: results.map((ticket) => ({
                                key: ticket.key,
                                summary: ticket.summary,
                                status: ticket.status,
                                priority: ticket.priority,
                                project: ticket.project_key,
                                similarity: ticket.similarity,
                                url: `https://mattcarp.atlassian.net/browse/${ticket.key}`,
                            })),
                            metadata: {
                                totalResults: results.length,
                                threshold,
                                searchMethod,
                                timestamp: new Date().toISOString(),
                            },
                        }, null, 2),
                    }],
            };
        }
        catch (error) {
            this.logError('Jira search failed', error);
            throw error instanceof types_js_1.McpError ? error :
                new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Jira search failed: ${this.getErrorMessage(error)}`);
        }
    }
    /**
     * Poll OpenAI Assistant run completion
     */
    async pollRunCompletion(threadId, runId) {
        const maxWaitTime = this.env.TIMEOUT_MS;
        const pollInterval = 1000;
        let elapsed = 0;
        while (elapsed < maxWaitTime) {
            try {
                const run = await this.openaiClient.beta.threads.runs.retrieve(threadId, runId);
                if (run.status === 'completed') {
                    const messages = await this.openaiClient.beta.threads.messages.list(threadId);
                    const lastMessage = messages.data[0];
                    if (lastMessage?.content[0] && 'text' in lastMessage.content[0]) {
                        return lastMessage.content[0].text.value;
                    }
                    throw new Error('No response content found');
                }
                if (['failed', 'cancelled', 'expired'].includes(run.status)) {
                    throw new Error(`Run ${run.status}: ${run.last_error?.message || 'Unknown error'}`);
                }
                await this.delay(pollInterval);
                elapsed += pollInterval;
            }
            catch (error) {
                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Run polling failed: ${this.getErrorMessage(error)}`);
            }
        }
        throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Run timed out after ${maxWaitTime}ms`);
    }
    /**
     * Get strategy-specific prompts
     */
    getStrategyPrompt(strategy) {
        switch (strategy) {
            case 'comprehensive':
                return 'Provide a comprehensive, detailed analysis covering all relevant aspects. Include background context, multiple approaches, and potential implications.';
            case 'rapid':
                return 'Provide a concise, direct answer focusing on the most critical information. Prioritize actionable insights and immediate next steps.';
            case 'focused':
            default:
                return 'Provide a focused, well-structured response that directly addresses the query with relevant details and practical guidance.';
        }
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async getAOMADocumentsSample() {
        // Sample implementation
        return [];
    }
    async getJiraTicketsSample() {
        // Sample implementation
        return [];
    }
    // Utility methods
    updateResponseMetrics(responseTime) {
        this.metrics.averageResponseTime =
            (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + responseTime) /
                this.metrics.totalRequests;
        this.metrics.lastRequestTime = new Date().toISOString();
    }
    sanitizeArgs(args) {
        const sanitized = { ...args };
        const sensitiveKeys = ['password', 'token', 'key', 'secret'];
        Object.keys(sanitized).forEach(key => {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            }
        });
        return sanitized;
    }
    getErrorMessage(error) {
        if (error instanceof Error)
            return error.message;
        if (typeof error === 'string')
            return error;
        return JSON.stringify(error);
    }
    logError(message, error) {
        console.error(`[ERROR] ${message}`, error);
    }
    logWarn(message, error) {
        if (!['error'].includes(this.env.LOG_LEVEL)) {
            console.warn(`[WARN] ${message}`, error);
        }
    }
    logInfo(message, meta) {
        if (['info', 'debug'].includes(this.env.LOG_LEVEL)) {
            console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
        }
    }
}
exports.AOMAMeshServer = AOMAMeshServer;
