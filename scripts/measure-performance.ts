/**
 * Performance Measurement Script for MCP Server Migration
 * Tracks response times before (Railway) and after (Render) migration
 */

import { performance } from 'perf_hooks';
import { writeFile } from 'fs/promises';

interface PerformanceResult {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: string;
}

interface ServerMetrics {
  server: string;
  url: string;
  results: PerformanceResult[];
  summary: {
    avgResponseTime: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
}

class MCPPerformanceTester {
  private railwayUrl = 'https://aoma-mesh-mcp-production.up.railway.app';
  private renderUrl = process.env.RENDER_MCP_URL || 'http://aoma-mesh-mcp:10000';
  private iterations = 20; // Number of test calls per endpoint

  async measureEndpoint(
    url: string,
    endpoint: string,
    method: string = 'GET',
    body?: any
  ): Promise<PerformanceResult> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${url}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.MCP_API_KEY && { 'X-API-Key': process.env.MCP_API_KEY })
        },
        body: body ? JSON.stringify(body) : undefined
      });

      const responseTime = performance.now() - startTime;
      
      return {
        endpoint,
        method,
        responseTime,
        status: response.status,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        endpoint,
        method,
        responseTime: performance.now() - startTime,
        status: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testServer(serverName: string, url: string): Promise<ServerMetrics> {
    const results: PerformanceResult[] = [];
    
    console.log(`\n📊 Testing ${serverName} at ${url}`);
    console.log('─'.repeat(50));

    // Test endpoints
    const tests = [
      { endpoint: '/health', method: 'GET' },
      { endpoint: '/metrics', method: 'GET' },
      { 
        endpoint: '/rpc', 
        method: 'POST', 
        body: { 
          jsonrpc: '2.0',
          method: 'get_server_capabilities', 
          params: {},
          id: 1
        } 
      },
      {
        endpoint: '/rpc',
        method: 'POST',
        body: {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'get_system_health',
            arguments: {}
          },
          id: 2
        }
      }
    ];

    // Run tests
    for (const test of tests) {
      process.stdout.write(`Testing ${test.endpoint} (${test.method}): `);
      const endpointResults: number[] = [];
      
      for (let i = 0; i < this.iterations; i++) {
        const result = await this.measureEndpoint(url, test.endpoint, test.method, test.body);
        results.push(result);
        endpointResults.push(result.responseTime);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avg = endpointResults.reduce((a, b) => a + b, 0) / endpointResults.length;
      console.log(`avg: ${avg.toFixed(2)}ms`);
    }

    // Calculate summary statistics
    const allTimes = results.map(r => r.responseTime).sort((a, b) => a - b);
    const summary = {
      avgResponseTime: allTimes.reduce((a, b) => a + b, 0) / allTimes.length,
      p50: allTimes[Math.floor(allTimes.length * 0.5)],
      p95: allTimes[Math.floor(allTimes.length * 0.95)],
      p99: allTimes[Math.floor(allTimes.length * 0.99)],
      min: allTimes[0],
      max: allTimes[allTimes.length - 1]
    };

    return { server: serverName, url, results, summary };
  }

  async compareServers(): Promise<void> {
    console.log('🚀 MCP Server Performance Comparison');
    console.log('═'.repeat(50));

    // Test Railway (current production)
    const railwayMetrics = await this.testServer('Railway (Current)', this.railwayUrl);

    // Test Render (if accessible externally for testing)
    // Note: Once deployed as private service, this needs to run from within Render network
    let renderMetrics: ServerMetrics | null = null;
    if (process.env.RENDER_MCP_URL) {
      renderMetrics = await this.testServer('Render (New)', this.renderUrl);
    }

    // Print comparison
    console.log('\n📈 PERFORMANCE SUMMARY');
    console.log('═'.repeat(50));
    
    console.log(`\n🚂 Railway (Production):`);
    console.log(`  Average Response Time: ${railwayMetrics.summary.avgResponseTime.toFixed(2)}ms`);
    console.log(`  P50 (Median):         ${railwayMetrics.summary.p50.toFixed(2)}ms`);
    console.log(`  P95:                  ${railwayMetrics.summary.p95.toFixed(2)}ms`);
    console.log(`  P99:                  ${railwayMetrics.summary.p99.toFixed(2)}ms`);
    console.log(`  Min:                  ${railwayMetrics.summary.min.toFixed(2)}ms`);
    console.log(`  Max:                  ${railwayMetrics.summary.max.toFixed(2)}ms`);

    if (renderMetrics) {
      console.log(`\n🎨 Render (New):`);
      console.log(`  Average Response Time: ${renderMetrics.summary.avgResponseTime.toFixed(2)}ms`);
      console.log(`  P50 (Median):         ${renderMetrics.summary.p50.toFixed(2)}ms`);
      console.log(`  P95:                  ${renderMetrics.summary.p95.toFixed(2)}ms`);
      console.log(`  P99:                  ${renderMetrics.summary.p99.toFixed(2)}ms`);
      console.log(`  Min:                  ${renderMetrics.summary.min.toFixed(2)}ms`);
      console.log(`  Max:                  ${renderMetrics.summary.max.toFixed(2)}ms`);

      // Calculate improvements
      const improvement = ((railwayMetrics.summary.avgResponseTime - renderMetrics.summary.avgResponseTime) 
        / railwayMetrics.summary.avgResponseTime * 100);
      
      console.log('\n🎯 PERFORMANCE IMPROVEMENT:');
      console.log(`  ${improvement > 0 ? '✅' : '⚠️'} ${Math.abs(improvement).toFixed(1)}% ${improvement > 0 ? 'faster' : 'slower'}`);
      console.log(`  Absolute difference: ${Math.abs(railwayMetrics.summary.avgResponseTime - renderMetrics.summary.avgResponseTime).toFixed(2)}ms`);
    }

    // Save detailed results
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `performance-metrics-${timestamp}.json`;
    
    await writeFile(
      filename,
      JSON.stringify({ railwayMetrics, renderMetrics }, null, 2)
    );
    
    console.log(`\n💾 Detailed metrics saved to: ${filename}`);
  }
}

// Run the comparison
const tester = new MCPPerformanceTester();
tester.compareServers().catch(console.error);
