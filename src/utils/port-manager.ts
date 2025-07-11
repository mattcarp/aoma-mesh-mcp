/**
 * Port Management Utilities
 * 
 * Handles port availability checking and automatic port selection.
 * Prevents EADDRINUSE errors by finding alternative ports when needed.
 */

import { createLogger } from './logger.js';

const logger = createLogger('PortManager');

/**
 * Check if a specific port is available
 */
export async function checkPortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        logger.debug(`Port ${port} is available`);
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        logger.debug(`Port ${port} is busy`);
        resolve(false);
      } else {
        logger.warn(`Error checking port ${port}`, { error: error.message });
        resolve(false);
      }
    });
  });
}

/**
 * Find the next available port starting from a given port
 */
export async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  logger.debug(`Searching for available port starting from ${startPort}`);
  
  for (let port = startPort; port <= startPort + maxAttempts; port++) {
    if (await checkPortAvailability(port)) {
      logger.info(`Found available port: ${port}`);
      return port;
    }
  }
  
  const error = `No available ports found in range ${startPort}-${startPort + maxAttempts}`;
  logger.error(error);
  throw new Error(error);
}

/**
 * Get port with automatic fallback to next available port
 */
export async function getAvailablePort(preferredPort: number): Promise<number> {
  if (await checkPortAvailability(preferredPort)) {
    return preferredPort;
  }
  
  logger.warn(`Port ${preferredPort} is busy, finding alternative...`);
  return findAvailablePort(preferredPort + 1);
}

/**
 * Kill process using a specific port (requires lsof command)
 */
export async function killProcessOnPort(port: number): Promise<boolean> {
  try {
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec(`lsof -ti:${port}`, (error: Error | null, stdout: string) => {
        if (error || !stdout.trim()) {
          logger.debug(`No process found on port ${port}`);
          resolve(false);
          return;
        }
        
        const pids = stdout.trim().split('\n');
        let killedCount = 0;
        
        pids.forEach(pid => {
          exec(`kill ${pid}`, (killError: Error | null) => {
            if (!killError) {
              killedCount++;
              logger.info(`Killed process ${pid} on port ${port}`);
            } else {
              logger.warn(`Failed to kill process ${pid}`, { error: killError.message });
            }
            
            if (killedCount === pids.length || killedCount > 0) {
              resolve(true);
            }
          });
        });
      });
    });
  } catch (error) {
    logger.error('Failed to kill process on port', { port, error });
    return false;
  }
}
