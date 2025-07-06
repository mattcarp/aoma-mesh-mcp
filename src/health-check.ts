#!/usr/bin/env node
/**
 * Health Check Script for AOMA Mesh MCP Server
 * 
 * Comprehensive health validation for production deployments
 */

import { AOMAMeshServer } from './aoma-mesh-server.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn';
  checks: {
    environment: { status: 'pass' | 'fail'; details: string[] };
    build: { status: 'pass' | 'fail'; details: string[] };
    services: { status: 'pass' | 'fail' | 'warn'; details: string[] };
    performance: { status: 'pass' | 'fail' | 'warn'; details: string[] };
  };
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  timestamp: string;
}

class HealthChecker {
  private results: HealthCheckResult;
  
  constructor() {
    this.results = {
      status: 'pass',
      checks: {
        environment: { status: 'pass', details: [] },
        build: { status: 'pass', details: [] },
        services: { status: 'pass', details: [] },
        performance: { status: 'pass', details: [] },
      },
      summary: {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
      timestamp: new Date().toISOString(),
    };
  }

  async runFullHealthCheck(): Promise<HealthCheckResult> {
    console.log('🔍 AOMA Mesh MCP Server - Comprehensive Health Check\n');

    try {
      await this.checkEnvironment();
      await this.checkBuild();
      await this.checkServices();
      await this.checkPerformance();
      
      this.calculateSummary();
      this.printResults();
      
      return this.results;
    } catch (error) {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    }
  }

  private async checkEnvironment(): Promise<void> {
    console.log('🔧 Checking Environment Configuration...');
    
    const requiredVars = [
      'OPENAI_API_KEY',
      'AOMA_ASSISTANT_ID',
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    const optionalVars = [
      'OPENAI_VECTOR_STORE_ID',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NODE_ENV',
      'LOG_LEVEL',
    ];

    let envIssues = 0;

    // Check required variables
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (!value) {
        this.results.checks.environment.details.push(`❌ Missing required variable: ${varName}`);
        envIssues++;
      } else if (value.length < 10) {
        this.results.checks.environment.details.push(`⚠️  Variable ${varName} seems too short (${value.length} chars)`);
      } else {
        this.results.checks.environment.details.push(`✅ ${varName}: Configured`);
      }
    });

    // Check optional variables
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        this.results.checks.environment.details.push(`✅ ${varName}: ${value}`);
      } else {
        this.results.checks.environment.details.push(`ℹ️  Optional variable ${varName}: Not set`);
      }
    });

    // Check .env.local file
    try {
      const envPath = path.join(process.cwd(), '..', '.env.local');
      await fs.access(envPath);
      this.results.checks.environment.details.push('✅ .env.local file found');
    } catch {
      this.results.checks.environment.details.push('ℹ️  .env.local file not found (using environment variables)');
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const versionParts = nodeVersion.slice(1).split('.');
    const majorVersion = parseInt(versionParts[0] || '0');
    if (majorVersion >= 18) {
      this.results.checks.environment.details.push(`✅ Node.js version: ${nodeVersion}`);
    } else {
      this.results.checks.environment.details.push(`❌ Node.js version ${nodeVersion} is too old (require 18+)`);
      envIssues++;
    }

    this.results.checks.environment.status = envIssues > 0 ? 'fail' : 'pass';
    console.log(`   ${envIssues > 0 ? '❌' : '✅'} Environment: ${envIssues > 0 ? 'FAILED' : 'PASSED'}\n`);
  }

  private async checkBuild(): Promise<void> {
    console.log('🏗️  Checking Build Status...');
    
    let buildIssues = 0;

    // Check if dist directory exists
    try {
      const distPath = path.join(process.cwd(), 'dist');
      const distStats = await fs.stat(distPath);
      if (distStats.isDirectory()) {
        this.results.checks.build.details.push('✅ dist/ directory exists');
      } else {
        this.results.checks.build.details.push('❌ dist/ is not a directory');
        buildIssues++;
      }
    } catch {
      this.results.checks.build.details.push('❌ dist/ directory not found - run npm run build');
      buildIssues++;
    }

    // Check main server file
    try {
      const serverPath = path.join(process.cwd(), 'dist', 'aoma-mesh-server.js');
      await fs.access(serverPath);
      this.results.checks.build.details.push('✅ aoma-mesh-server.js built');
    } catch {
      this.results.checks.build.details.push('❌ aoma-mesh-server.js not found');
      buildIssues++;
    }

    // Check package.json
    try {
      const packagePath = path.join(process.cwd(), 'package.json');
      const packageContent = await fs.readFile(packagePath, 'utf8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.name && packageJson.version) {
        this.results.checks.build.details.push(`✅ Package: ${packageJson.name}@${packageJson.version}`);
      } else {
        this.results.checks.build.details.push('⚠️  Package.json missing name or version');
      }
    } catch {
      this.results.checks.build.details.push('❌ package.json not found or invalid');
      buildIssues++;
    }

    // Check TypeScript configuration
    try {
      const tsconfigPath = path.join(process.cwd(), 'tsconfig.json');
      await fs.access(tsconfigPath);
      this.results.checks.build.details.push('✅ tsconfig.json found');
    } catch {
      this.results.checks.build.details.push('⚠️  tsconfig.json not found');
    }

    this.results.checks.build.status = buildIssues > 0 ? 'fail' : 'pass';
    console.log(`   ${buildIssues > 0 ? '❌' : '✅'} Build: ${buildIssues > 0 ? 'FAILED' : 'PASSED'}\n`);
  }

  private async checkServices(): Promise<void> {
    console.log('🌐 Checking External Services...');
    
    let serviceIssues = 0;
    let serviceWarnings = 0;

    try {
      // Try to create server instance (validates environment)
      const server = new AOMAMeshServer();
      this.results.checks.services.details.push('✅ Server instance created successfully');

      // Initialize and check health
      await server.initialize();
      this.results.checks.services.details.push('✅ Server initialized successfully');

      // Get detailed health status
      const health = await server['performHealthCheck'](true);
      
      // Check OpenAI service
      if (health.services.openai.status) {
        const latency = health.services.openai.latency;
        this.results.checks.services.details.push(
          `✅ OpenAI: Connected ${latency ? `(${latency}ms)` : ''}`
        );
      } else {
        this.results.checks.services.details.push(
          `❌ OpenAI: ${health.services.openai.error || 'Connection failed'}`
        );
        serviceIssues++;
      }

      // Check Supabase service
      if (health.services.supabase.status) {
        const latency = health.services.supabase.latency;
        this.results.checks.services.details.push(
          `✅ Supabase: Connected ${latency ? `(${latency}ms)` : ''}`
        );
      } else {
        this.results.checks.services.details.push(
          `❌ Supabase: ${health.services.supabase.error || 'Connection failed'}`
        );
        serviceIssues++;
      }

      // Check Vector Store (optional)
      if (health.services.vectorStore.status) {
        this.results.checks.services.details.push('✅ Vector Store: Available');
      } else if (process.env.OPENAI_VECTOR_STORE_ID) {
        this.results.checks.services.details.push(
          `⚠️  Vector Store: ${health.services.vectorStore.error || 'Unavailable'}`
        );
        serviceWarnings++;
      } else {
        this.results.checks.services.details.push('ℹ️  Vector Store: Not configured (optional)');
      }

      // Overall service health
      if (health.status === 'healthy') {
        this.results.checks.services.details.push('✅ Overall service health: Healthy');
      } else if (health.status === 'degraded') {
        this.results.checks.services.details.push('⚠️  Overall service health: Degraded');
        serviceWarnings++;
      } else {
        this.results.checks.services.details.push('❌ Overall service health: Unhealthy');
        serviceIssues++;
      }

    } catch (error) {
      this.results.checks.services.details.push(`❌ Service check failed: ${error instanceof Error ? error.message : String(error)}`);
      serviceIssues++;
    }

    this.results.checks.services.status = 
      serviceIssues > 0 ? 'fail' : serviceWarnings > 0 ? 'warn' : 'pass';
    
    const statusText = serviceIssues > 0 ? 'FAILED' : serviceWarnings > 0 ? 'WARNINGS' : 'PASSED';
    const emoji = serviceIssues > 0 ? '❌' : serviceWarnings > 0 ? '⚠️' : '✅';
    console.log(`   ${emoji} Services: ${statusText}\n`);
  }

  private async checkPerformance(): Promise<void> {
    console.log('⚡ Checking Performance...');
    
    let perfIssues = 0;
    let perfWarnings = 0;

    try {
      const server = new AOMAMeshServer();
      await server.initialize();

      // Memory usage check
      const memUsage = process.memoryUsage();
      const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
      
      if (heapUsedMB < 256) {
        this.results.checks.performance.details.push(`✅ Memory usage: ${heapUsedMB}MB`);
      } else if (heapUsedMB < 512) {
        this.results.checks.performance.details.push(`⚠️  Memory usage: ${heapUsedMB}MB (warning level)`);
        perfWarnings++;
      } else {
        this.results.checks.performance.details.push(`❌ Memory usage: ${heapUsedMB}MB (too high)`);
        perfIssues++;
      }

      // Response time test
      const startTime = Date.now();
      const health = await server['performHealthCheck'](false);
      const responseTime = Date.now() - startTime;

      if (responseTime < 1000) {
        this.results.checks.performance.details.push(`✅ Health check response: ${responseTime}ms`);
      } else if (responseTime < 3000) {
        this.results.checks.performance.details.push(`⚠️  Health check response: ${responseTime}ms (slow)`);
        perfWarnings++;
      } else {
        this.results.checks.performance.details.push(`❌ Health check response: ${responseTime}ms (too slow)`);
        perfIssues++;
      }

      // Tool availability test
      const tools = server['getToolDefinitions']();
      this.results.checks.performance.details.push(`✅ Available tools: ${tools.length}`);

      // Resource availability test
      const resources = server['getResourceDefinitions']();
      this.results.checks.performance.details.push(`✅ Available resources: ${resources.length}`);

    } catch (error) {
      this.results.checks.performance.details.push(`❌ Performance check failed: ${error instanceof Error ? error.message : String(error)}`);
      perfIssues++;
    }

    this.results.checks.performance.status = 
      perfIssues > 0 ? 'fail' : perfWarnings > 0 ? 'warn' : 'pass';
    
    const statusText = perfIssues > 0 ? 'FAILED' : perfWarnings > 0 ? 'WARNINGS' : 'PASSED';
    const emoji = perfIssues > 0 ? '❌' : perfWarnings > 0 ? '⚠️' : '✅';
    console.log(`   ${emoji} Performance: ${statusText}\n`);
  }

  private calculateSummary(): void {
    const checks = Object.values(this.results.checks);
    
    this.results.summary.totalChecks = checks.length;
    this.results.summary.passed = checks.filter(c => c.status === 'pass').length;
    this.results.summary.failed = checks.filter(c => c.status === 'fail').length;
    this.results.summary.warnings = checks.filter(c => c.status === 'warn').length;

    // Overall status
    if (this.results.summary.failed > 0) {
      this.results.status = 'fail';
    } else if (this.results.summary.warnings > 0) {
      this.results.status = 'warn';
    } else {
      this.results.status = 'pass';
    }
  }

  private printResults(): void {
    console.log('📊 Health Check Summary');
    console.log('========================');
    
    const { summary } = this.results;
    console.log(`Total Checks: ${summary.totalChecks}`);
    console.log(`✅ Passed: ${summary.passed}`);
    if (summary.warnings > 0) {
      console.log(`⚠️  Warnings: ${summary.warnings}`);
    }
    if (summary.failed > 0) {
      console.log(`❌ Failed: ${summary.failed}`);
    }
    
    console.log('\nOverall Status:', this.getStatusEmoji(this.results.status), this.results.status.toUpperCase());
    
    if (this.results.status === 'pass') {
      console.log('\n🎉 AOMA Mesh MCP Server is healthy and ready for production!');
    } else if (this.results.status === 'warn') {
      console.log('\n⚠️  AOMA Mesh MCP Server has warnings but is functional.');
      console.log('   Consider addressing warnings for optimal performance.');
    } else {
      console.log('\n❌ AOMA Mesh MCP Server has critical issues that need attention.');
      console.log('   Please fix the failed checks before deployment.');
    }

    // Print detailed results if requested
    if (process.argv.includes('--detailed')) {
      console.log('\n🔍 Detailed Results:');
      console.log('==================');
      
      Object.entries(this.results.checks).forEach(([category, check]) => {
        console.log(`\n${category.toUpperCase()}:`);
        check.details.forEach(detail => console.log(`  ${detail}`));
      });
    }
    
    console.log(`\nGenerated: ${this.results.timestamp}`);
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'pass': return '✅';
      case 'warn': return '⚠️';
      case 'fail': return '❌';
      default: return '❓';
    }
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  
  checker.runFullHealthCheck()
    .then((results) => {
      if (results.status === 'fail') {
        process.exit(1);
      } else if (results.status === 'warn') {
        process.exit(2);
      } else {
        process.exit(0);
      }
    })
    .catch((error) => {
      console.error('💥 Health check crashed:', error);
      process.exit(3);
    });
}