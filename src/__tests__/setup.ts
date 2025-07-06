/**
 * Jest Test Setup
 * 
 * Global test configuration and mocks
 */

import { jest } from '@jest/globals';

// Mock console methods to reduce test noise
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
};