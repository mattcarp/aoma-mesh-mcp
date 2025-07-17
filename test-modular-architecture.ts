/**
 * Quick Test for Modular Architecture
 * 
 * Simple test to verify our components work together.
 */

import { validateAndLoadEnvironment } from '../config/environment';
import { createLogger } from '../utils/logger';
import { ToolRegistry } from '../tools/base/tool.registry';

async function quickTest() {
  const logger = createLogger('QuickTest');
  
  try {
    logger.info('Testing environment loading...');
    const config = validateAndLoadEnvironment();
    logger.info('Environment loaded successfully', { version: config.MCP_SERVER_VERSION });
    
    logger.info('Testing tool registry...');
    const registry = new ToolRegistry();
    logger.info('Tool registry created successfully', { toolCount: registry.getToolCount() });
    
    logger.info('✅ Basic architecture test passed!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Architecture test failed', { error });
    process.exit(1);
  }
}

quickTest();
