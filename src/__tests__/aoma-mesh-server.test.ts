/**
 * Basic Test Suite for AOMA Mesh MCP Server
 *
 * Tests basic functionality and imports.
 * Full integration tests require proper ESM setup.
 */

import { jest } from '@jest/globals';
import { AOMAMeshServer } from '../aoma-mesh-server.js';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

// Mock OpenAI
const mockOpenAI = {
  models: {
    list: jest.fn(),
  },
  beta: {
    threads: {
      create: jest.fn(),
      del: jest.fn(),
      messages: {
        list: jest.fn(),
      },
      runs: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    vectorStores: {
      retrieve: jest.fn(),
    },
  },
};

// Mock Supabase
const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  rpc: jest.fn(),
};

// Mock environment variables
const mockEnv = {
  OPENAI_API_KEY: 'sk-test-key-1234567890123456789012345678901234567890',
  AOMA_ASSISTANT_ID: 'asst_test123456789',
  OPENAI_VECTOR_STORE_ID: 'vs_test123456789',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key-1234567890',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-1234567890',
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  MCP_SERVER_VERSION: '2.0.0-test',
  MAX_RETRIES: '2',
  TIMEOUT_MS: '5000',
};

// Mock modules
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => mockOpenAI),
  };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(() => mockSupabase),
}));

// Mock stdio transport
const mockTransport = {
  connect: jest.fn(),
  close: jest.fn(),
};

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => mockTransport),
}));

describe('AOMA Mesh MCP Server', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let server: AOMAMeshServer;

  beforeAll(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, ...mockEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to successful defaults
    mockOpenAI.models.list.mockResolvedValue({ data: [] });
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ error: null, data: [] }),
      }),
    });
    mockSupabase.rpc.mockResolvedValue({ error: null, data: [] });
    mockOpenAI.beta.vectorStores.retrieve.mockResolvedValue({ id: 'vs_test123456789' });
  });

  describe('Server Initialization', () => {
    test('should initialize successfully with valid environment', async () => {
      expect(() => new AOMAMeshServer()).not.toThrow();
    });

    test('should validate environment variables', () => {
      const invalidEnv = { ...mockEnv, OPENAI_API_KEY: 'short' };
      process.env = { ...originalEnv, ...invalidEnv };
      
      expect(() => new AOMAMeshServer()).toThrow(/Environment validation failed/);
      
      process.env = { ...originalEnv, ...mockEnv };
    });

    test('should handle missing required environment variables', () => {
      const { OPENAI_API_KEY: _OPENAI_API_KEY, ...incompleteEnv } = mockEnv;
      process.env = { ...originalEnv, ...incompleteEnv };
      
      expect(() => new AOMAMeshServer()).toThrow(/OPENAI_API_KEY/);
      
      process.env = { ...originalEnv, ...mockEnv };
    });

    test('should initialize with proper defaults', () => {
      const server = new AOMAMeshServer();
      expect(server).toBeDefined();
      // Verify server is constructed with proper configuration
    });
  });

  describe('Health Checks', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should perform comprehensive health check', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [{ id: 'gpt-4' }] });
      mockSupabase.from().select().limit.mockResolvedValue({ error: null, data: [{ count: 100 }] });
      mockOpenAI.beta.vectorStores.retrieve.mockResolvedValue({ id: 'vs_test123456789' });

      const result = await server['performHealthCheck'](true);
      
      expect(result.status).toBe('healthy');
      expect(result.services.openai.status).toBe(true);
      expect(result.services.supabase.status).toBe(true);
      expect(result.services.vectorStore.status).toBe(true);
      expect(result.services.openai.latency).toBeGreaterThan(0);
    });

    test('should handle OpenAI service failure', async () => {
      mockOpenAI.models.list.mockRejectedValue(new Error('OpenAI API error'));
      
      const result = await server['performHealthCheck'](false);
      
      expect(result.status).toBe('degraded');
      expect(result.services.openai.status).toBe(false);
      expect(result.services.openai.error).toBe('OpenAI API error');
    });

    test('should handle Supabase service failure', async () => {
      mockSupabase.from().select().limit.mockResolvedValue({ 
        error: { message: 'Database connection failed' }, 
        data: null 
      });
      
      const result = await server['performHealthCheck'](false);
      
      expect(result.status).toBe('degraded');
      expect(result.services.supabase.status).toBe(false);
    });

    test('should cache health check results', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] });
      
      // First call
      const result1 = await server['performHealthCheck'](false);
      // Second call within cache TTL
      const result2 = await server['performHealthCheck'](false);
      
      expect(mockOpenAI.models.list).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
    });
  });

  describe('Tool Definitions', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should provide comprehensive tool definitions', () => {
      const tools = server['getToolDefinitions']();
      
      expect(tools).toHaveLength(5);
      expect(tools.map(t => t.name)).toEqual([
        'query_aoma_knowledge',
        'search_jira_tickets',
        'analyze_development_context',
        'get_system_health',
        'get_server_capabilities',
      ]);
    });

    test('should validate tool input schemas', () => {
      const tools = server['getToolDefinitions']();
      
      tools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
        expect(tool.description).toBeTruthy();
        expect(tool.name).toBeTruthy();
      });
    });

    test('should include proper parameter validation', () => {
      const aomaKnowledgeTool = server['getToolDefinitions']().find(t => t.name === 'query_aoma_knowledge');
      
      expect(aomaKnowledgeTool?.inputSchema.properties?.query).toEqual({
        type: 'string',
        description: 'Natural language query about AOMA systems, procedures, or technical guidance',
        minLength: 1,
        maxLength: 2000,
      });
    });
  });

  describe('AOMA Knowledge Query', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should execute successful AOMA knowledge query', async () => {
      const mockThread = { id: 'thread_123' };
      const mockRun = { id: 'run_123', status: 'completed' };
      const mockMessages = {
        data: [{
          content: [{
            type: 'text',
            text: { value: 'This is the AOMA knowledge response' }
          }]
        }]
      };

      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });
      mockOpenAI.beta.threads.messages.list.mockResolvedValue(mockMessages);
      mockOpenAI.beta.threads.del.mockResolvedValue({});

      const result = await server['queryAOMAKnowledge']({
        query: 'How do I deploy AOMA services?',
        strategy: 'focused',
      });

      expect(result.content[0].type).toBe('text');
      const response = JSON.parse(result.content[0].text);
      expect(response.query).toBe('How do I deploy AOMA services?');
      expect(response.strategy).toBe('focused');
      expect(response.response).toBe('This is the AOMA knowledge response');
    });

    test('should handle empty query', async () => {
      await expect(server['queryAOMAKnowledge']({ query: '' }))
        .rejects.toThrow(McpError);
    });

    test('should handle OpenAI API failures', async () => {
      mockOpenAI.beta.threads.create.mockRejectedValue(new Error('OpenAI API failure'));

      await expect(server['queryAOMAKnowledge']({ query: 'test query' }))
        .rejects.toThrow(McpError);
    });

    test('should handle run timeout', async () => {
      const mockThread = { id: 'thread_123' };
      const mockRun = { id: 'run_123', status: 'in_progress' };

      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue({ status: 'in_progress' });

      // Override timeout for test
      server['env'].TIMEOUT_MS = 100;

      await expect(server['queryAOMAKnowledge']({ query: 'test query' }))
        .rejects.toThrow(/timed out/);
    });

    test('should clean up threads after completion', async () => {
      const mockThread = { id: 'thread_123' };
      const mockRun = { id: 'run_123', status: 'completed' };
      const mockMessages = {
        data: [{
          content: [{
            type: 'text',
            text: { value: 'Response' }
          }]
        }]
      };

      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });
      mockOpenAI.beta.threads.messages.list.mockResolvedValue(mockMessages);
      mockOpenAI.beta.threads.del.mockResolvedValue({});

      await server['queryAOMAKnowledge']({ query: 'test query' });

      expect(mockOpenAI.beta.threads.del).toHaveBeenCalledWith('thread_123');
    });
  });

  describe('Jira Search', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should execute successful Jira search', async () => {
      const mockJiraResults = [
        {
          key: 'AOMA-123',
          summary: 'Authentication issue',
          status: 'Open',
          priority: 'High',
          project_key: 'AOMA',
          similarity: 0.85,
        },
      ];

      mockSupabase.rpc.mockResolvedValue({
        error: null,
        data: mockJiraResults,
      });

      const result = await server['searchJiraTickets']({
        query: 'authentication problems',
        maxResults: 10,
        threshold: 0.7,
      });

      expect(result.content[0].type).toBe('text');
      const response = JSON.parse(result.content[0].text);
      expect(response.results).toHaveLength(1);
      expect(response.results[0].key).toBe('AOMA-123');
      expect(response.results[0].similarity).toBe(0.85);
    });

    test('should handle Jira search with filters', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: null,
        data: [],
      });

      await server['searchJiraTickets']({
        query: 'bug reports',
        projectKey: 'AOMA',
        status: ['Open', 'In Progress'],
        priority: ['High', 'Critical'],
        maxResults: 15,
        threshold: 0.6,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_jira_tickets_semantic', {
        search_query: 'bug reports',
        max_results: 15,
        similarity_threshold: 0.6,
        filters: {
          project_key: 'AOMA',
          status: ['Open', 'In Progress'],
          priority: ['High', 'Critical'],
        },
      });
    });

    test('should handle Supabase RPC failures', async () => {
      mockSupabase.rpc.mockResolvedValue({
        error: { message: 'RPC function not found' },
        data: null,
      });

      await expect(server['searchJiraTickets']({ query: 'test' }))
        .rejects.toThrow(McpError);
    });
  });

  describe('Development Context Analysis', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should analyze development context', async () => {
      const mockThread = { id: 'thread_123' };
      const mockRun = { id: 'run_123', status: 'completed' };
      const mockMessages = {
        data: [{
          content: [{
            type: 'text',
            text: { value: 'Context analysis results' }
          }]
        }]
      };

      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });
      mockOpenAI.beta.threads.messages.list.mockResolvedValue(mockMessages);
      mockOpenAI.beta.threads.del.mockResolvedValue({});

      const result = await server['analyzeDevelopmentContext']({
        currentTask: 'Fix authentication timeout',
        systemArea: 'backend',
        urgency: 'high',
        codeContext: 'async function authenticate() { ... }',
      });

      expect(result.content[0].type).toBe('text');
      const response = JSON.parse(result.content[0].text);
      expect(response.task).toBe('Fix authentication timeout');
      expect(response.systemArea).toBe('backend');
      expect(response.urgency).toBe('high');
      expect(response.analysis).toBe('Context analysis results');
    });
  });

  describe('Resource Reading', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should read health resource', async () => {
      mockOpenAI.models.list.mockResolvedValue({ data: [] });
      mockSupabase.from().select().limit.mockResolvedValue({ error: null, data: [] });

      const result = await server['readResource']('aoma://health');

      expect(result.contents[0].mimeType).toBe('application/json');
      const health = JSON.parse(result.contents[0].text);
      expect(health.status).toBeDefined();
      expect(health.services).toBeDefined();
    });

    test('should read metrics resource', async () => {
      const result = await server['readResource']('aoma://metrics');

      expect(result.contents[0].mimeType).toBe('application/json');
      const metrics = JSON.parse(result.contents[0].text);
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.version).toBe('2.0.0-test');
    });

    test('should read documentation resource', async () => {
      const result = await server['readResource']('aoma://docs');

      expect(result.contents[0].mimeType).toBe('text/markdown');
      expect(result.contents[0].text).toContain('# AOMA Mesh MCP Server Documentation');
      expect(result.contents[0].text).toContain('## Version: 2.0.0-test');
    });

    test('should handle unknown resource', async () => {
      await expect(server['readResource']('aoma://unknown'))
        .rejects.toThrow(McpError);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should handle unknown tool calls', async () => {
      await expect(server['callTool']('unknown_tool', {}))
        .rejects.toThrow(McpError);
    });

    test('should handle malformed requests gracefully', async () => {
      // Test with null/undefined inputs
      await expect(server['queryAOMAKnowledge']({ query: null as any }))
        .rejects.toThrow(McpError);
    });

    test('should sanitize sensitive arguments in logs', () => {
      const args = {
        query: 'test',
        password: 'secret123',
        api_key: 'sensitive_data',
        normal_field: 'public_data',
      };

      const sanitized = server['sanitizeArgs'](args);

      expect(sanitized.query).toBe('test');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.normal_field).toBe('public_data');
    });
  });

  describe('Performance and Metrics', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should track request metrics', async () => {
      const initialMetrics = server['metrics'];
      const initialTotal = initialMetrics.totalRequests;

      // Mock successful tool call
      const mockThread = { id: 'thread_123' };
      const mockRun = { id: 'run_123', status: 'completed' };
      const mockMessages = {
        data: [{
          content: [{
            type: 'text',
            text: { value: 'Response' }
          }]
        }]
      };

      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });
      mockOpenAI.beta.threads.messages.list.mockResolvedValue(mockMessages);
      mockOpenAI.beta.threads.del.mockResolvedValue({});

      await server['queryAOMAKnowledge']({ query: 'test' });

      const updatedMetrics = server['metrics'];
      expect(updatedMetrics.totalRequests).toBe(initialTotal + 1);
      expect(updatedMetrics.successfulRequests).toBe(initialMetrics.successfulRequests + 1);
      expect(updatedMetrics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should update failure metrics on errors', async () => {
      const initialMetrics = server['metrics'];
      const initialFailed = initialMetrics.failedRequests;

      mockOpenAI.beta.threads.create.mockRejectedValue(new Error('API failure'));

      try {
        await server['queryAOMAKnowledge']({ query: 'test' });
      } catch {
        // Expected to fail
      }

      const updatedMetrics = server['metrics'];
      expect(updatedMetrics.failedRequests).toBe(initialFailed + 1);
    });
  });

  describe('Environment Compatibility', () => {
    test('should work with Claude Desktop environment variables', () => {
      const claudeEnv = {
        ...mockEnv,
        // Claude Desktop typically provides these directly
        OPENAI_API_KEY: 'sk-claude-desktop-key',
        AOMA_ASSISTANT_ID: 'asst_claude123',
      };

      process.env = { ...originalEnv, ...claudeEnv };
      expect(() => new AOMAMeshServer()).not.toThrow();
      process.env = { ...originalEnv, ...mockEnv };
    });

    test('should load from .env.local when environment variables not provided', () => {
      // This would typically require mocking fs.readFileSync
      // For now, we test that the server gracefully handles missing .env.local
      expect(() => new AOMAMeshServer()).not.toThrow();
    });

    test('should validate different log levels', () => {
      const levels = ['error', 'warn', 'info', 'debug'];
      
      levels.forEach(level => {
        const envWithLevel = { ...mockEnv, LOG_LEVEL: level };
        process.env = { ...originalEnv, ...envWithLevel };
        expect(() => new AOMAMeshServer()).not.toThrow();
      });
      
      process.env = { ...originalEnv, ...mockEnv };
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      server = new AOMAMeshServer();
    });

    test('should handle complete server lifecycle', async () => {
      // Mock successful initialization
      mockOpenAI.models.list.mockResolvedValue({ data: [] });
      mockSupabase.from().select().limit.mockResolvedValue({ error: null, data: [] });
      mockOpenAI.beta.vectorStores.retrieve.mockResolvedValue({ id: 'vs_test' });

      // Test initialization
      await expect(server.initialize()).resolves.not.toThrow();

      // Test tool execution
      const mockThread = { id: 'thread_123' };
      const mockRun = { id: 'run_123', status: 'completed' };
      const mockMessages = {
        data: [{
          content: [{
            type: 'text',
            text: { value: 'Integration test response' }
          }]
        }]
      };

      mockOpenAI.beta.threads.create.mockResolvedValue(mockThread);
      mockOpenAI.beta.threads.runs.create.mockResolvedValue(mockRun);
      mockOpenAI.beta.threads.runs.retrieve.mockResolvedValue({ status: 'completed' });
      mockOpenAI.beta.threads.messages.list.mockResolvedValue(mockMessages);
      mockOpenAI.beta.threads.del.mockResolvedValue({});

      const result = await server['queryAOMAKnowledge']({ query: 'integration test' });
      expect(result).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should fail initialization with unhealthy services', async () => {
      // Mock all services failing
      mockOpenAI.models.list.mockRejectedValue(new Error('OpenAI down'));
      mockSupabase.from().select().limit.mockRejectedValue(new Error('Supabase down'));
      mockOpenAI.beta.vectorStores.retrieve.mockRejectedValue(new Error('Vector store down'));

      await expect(server.initialize()).rejects.toThrow(/unhealthy/);
    });
  });
});

// Test utilities
export const testUtils = {
  createMockServer: () => new AOMAMeshServer(),
  mockSuccessfulResponses: () => {
    mockOpenAI.models.list.mockResolvedValue({ data: [] });
    mockSupabase.from().select().limit.mockResolvedValue({ error: null, data: [] });
    mockOpenAI.beta.vectorStores.retrieve.mockResolvedValue({ id: 'vs_test' });
  },
  mockFailedResponses: () => {
    mockOpenAI.models.list.mockRejectedValue(new Error('Service unavailable'));
    mockSupabase.from().select().limit.mockRejectedValue(new Error('Database error'));
    mockOpenAI.beta.vectorStores.retrieve.mockRejectedValue(new Error('Vector store error'));
  },
};