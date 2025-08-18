#!/usr/bin/env tsx

/**
 * AOMA Mesh MCP Intelligent Startup Wrapper
 * Handles network failures, retries, and graceful degradation
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import dns from 'dns/promises';
import net from 'net';

const RETRY_CONFIG = {
  maxAttempts: 5,
  delayMs: 2000,
  backoffMultiplier: 1.5,
};

const HEALTH_CHECKS = {
  'api.openai.com': { port: 443, name: 'OpenAI API', required: true },
  'kfxetwuuzljhybfgmpuc.supabase.co': { port: 443, name: 'Supabase', required: false },
};

// ANSI color codes for our sophisticated French-infused logging
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

class MCPStartupOrchestrator {
  private serverPath: string;
  private failedServices: Set<string> = new Set();
  
  constructor() {
    this.serverPath = join(process.cwd(), 'src', 'aoma-mesh-server.ts');
  }
  
  log(message: string, color: keyof typeof colors = 'reset') {
    const timestamp = new Date().toISOString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
  }
  
  async checkDNS(hostname: string): Promise<boolean> {
    try {
      await dns.resolve4(hostname);
      return true;
    } catch (error) {
      this.log(`DNS resolution failed for ${hostname}: ${error.message}`, 'yellow');
      return false;
    }
  }
  
  async checkPort(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000);
      
      socket.once('connect', () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });
      
      socket.once('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
      
      socket.connect(port, host);
    });
  }
  
  async performHealthChecks(): Promise<boolean> {
    this.log('Performing network health checks...', 'blue');
    let allHealthy = true;
    
    for (const [hostname, config] of Object.entries(HEALTH_CHECKS)) {
      this.log(`Checking ${config.name}...`, 'yellow');
      
      // First check DNS
      const dnsOk = await this.checkDNS(hostname);
      if (!dnsOk) {
        this.failedServices.add(config.name);
        if (config.required) {
          allHealthy = false;
        }
        continue;
      }
      
      // Then check port connectivity
      const portOk = await this.checkPort(hostname, config.port);
      if (portOk) {
        this.log(`✓ ${config.name} is healthy`, 'green');
      } else {
        this.log(`✗ ${config.name} is unreachable on port ${config.port}`, 'red');
        this.failedServices.add(config.name);
        if (config.required) {
          allHealthy = false;
        }
      }
    }
    
    return allHealthy;
  }
  
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> {
    let delay = RETRY_CONFIG.delayMs;
    
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        this.log(`Attempt ${attempt}/${RETRY_CONFIG.maxAttempts} for ${operationName}`, 'yellow');
        const result = await operation();
        this.log(`✓ ${operationName} succeeded`, 'green');
        return result;
      } catch (error) {
        this.log(`Attempt ${attempt} failed: ${error.message}`, 'red');
        
        if (attempt < RETRY_CONFIG.maxAttempts) {
          this.log(`Waiting ${delay}ms before retry...`, 'yellow');
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= RETRY_CONFIG.backoffMultiplier;
        }
      }
    }
    
    this.log(`✗ ${operationName} failed after ${RETRY_CONFIG.maxAttempts} attempts`, 'red');
    return null;
  }
  
  async startServer(): Promise<void> {
    if (!existsSync(this.serverPath)) {
      this.log(`Server file not found: ${this.serverPath}`, 'red');
      process.exit(1);
    }
    
    // Set environment variables for degraded mode if needed
    if (this.failedServices.size > 0) {
      this.log('Starting in degraded mode due to failed services:', 'yellow');
      this.failedServices.forEach(service => {
        this.log(`  - ${service}`, 'yellow');
      });
      
      // Set flags for the server to know which services are unavailable
      process.env.AOMA_DEGRADED_MODE = 'true';
      process.env.AOMA_FAILED_SERVICES = Array.from(this.failedServices).join(',');
    }
    
    this.log('Starting AOMA Mesh MCP Server...', 'green');
    
    const serverProcess = spawn('tsx', [this.serverPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
        MCP_STARTUP_WRAPPER: 'intelligent',
      },
    });
    
    serverProcess.on('error', (error) => {
      this.log(`Failed to start server: ${error.message}`, 'red');
      process.exit(1);
    });
    
    serverProcess.on('exit', (code) => {
      if (code !== 0) {
        this.log(`Server exited with code ${code}`, 'red');
        process.exit(code || 1);
      }
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      this.log('Received SIGTERM, shutting down gracefully...', 'yellow');
      serverProcess.kill('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      this.log('Received SIGINT, shutting down gracefully...', 'yellow');
      serverProcess.kill('SIGINT');
    });
  }
  
  async run(): Promise<void> {
    this.log('=== AOMA Mesh MCP Intelligent Startup ===', 'magenta');
    
    // Perform health checks with retry
    const healthCheckResult = await this.retryWithBackoff(
      () => this.performHealthChecks(),
      'Network Health Checks'
    );
    
    if (healthCheckResult === false) {
      this.log('Critical services are unavailable. Starting anyway...', 'yellow');
    }
    
    // Start the server
    await this.startServer();
  }
}

// Execute
const orchestrator = new MCPStartupOrchestrator();
orchestrator.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
