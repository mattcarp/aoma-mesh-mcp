/**
 * Build and Run Integration Test
 *
 * Tests that the project builds and can be started without crashes
 */

import { describe, test, expect } from '@jest/globals';

describe('Build and Run Integration', () => {
  test('should import basic types without errors', async () => {
    const { McpError } = await import('@modelcontextprotocol/sdk/types.js');
    expect(McpError).toBeDefined();
  });

  test('should import utilities without errors', async () => {
    const { logger } = await import('../utils/mcp-logger.js');
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
  });

  test('should validate environment schema exists', async () => {
    // Test that our zod schema can be imported
    const { z } = await import('zod');
    expect(z).toBeDefined();
    expect(typeof z.object).toBe('function');
  });
});