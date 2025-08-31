/**
 * Internal performance test for Render MCP deployment
 * Run this FROM YOUR CLIENT APP on Render to test internal latency
 */

async function testInternalMCP() {
  const internalUrl = 'http://aoma-mesh-mcp:10000';
  const tests = [
    { name: 'Health Check', endpoint: '/health', method: 'GET' },
    { name: 'Metrics', endpoint: '/metrics', method: 'GET' },
    { 
      name: 'Get Capabilities', 
      endpoint: '/rpc',
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        method: 'get_server_capabilities',
        params: {},
        id: 1
      }
    }
  ];

  console.log('🎯 Testing Internal Render MCP Performance');
  console.log('=' .repeat(50));
  
  const results = [];
  
  for (const test of tests) {
    const times = [];
    console.log(`\nTesting ${test.name}...`);
    
    // Run 10 iterations
    for (let i = 0; i < 10; i++) {
      const start = Date.now();
      
      try {
        const response = await fetch(`${internalUrl}${test.endpoint}`, {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
            ...(process.env.MCP_API_KEY && { 'X-API-Key': process.env.MCP_API_KEY })
          },
          body: test.body ? JSON.stringify(test.body) : undefined
        });
        
        const data = await response.json();
        const time = Date.now() - start;
        times.push(time);
        
        if (i === 0) {
          console.log(`  ✓ Status: ${response.status}`);
          if (test.name === 'Get Capabilities' && data.result?.tools) {
            const toolCount = data.result.tools.list ? data.result.tools.list.length : data.result.tools.length;
            console.log(`  ✓ Tools found: ${toolCount}`);
          }
        }
      } catch (error) {
        console.log(`  ✗ Error: ${error.message}`);
        times.push(-1);
      }
    }
    
    const validTimes = times.filter(t => t > 0);
    const avg = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
    const min = Math.min(...validTimes);
    const max = Math.max(...validTimes);
    
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  Min/Max: ${min}ms / ${max}ms`);
    
    results.push({ test: test.name, avg, min, max });
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 PERFORMANCE SUMMARY (Internal Render)');
  console.log('='.repeat(50));
  
  const overallAvg = results.reduce((sum, r) => sum + r.avg, 0) / results.length;
  console.log(`Overall Average: ${overallAvg.toFixed(2)}ms`);
  console.log('\nCompare to Railway (external): 177ms avg');
  console.log(`Expected improvement: ~${((177 - overallAvg) / 177 * 100).toFixed(0)}% faster`);
  
  return results;
}

// Export for use in client app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testInternalMCP;
}

// Run if called directly
if (require.main === module) {
  testInternalMCP().catch(console.error);
}
