/**
 * Add this test function to your siam-app to verify internal MCP connection
 * Run after aoma-mesh-mcp is deployed on Render
 */

async function testInternalMCPConnection() {
  const internalUrl = 'http://aoma-mesh-mcp:10000';
  const externalUrl = 'https://aoma-mesh-mcp-production.up.railway.app';
  
  console.log('🔍 Testing MCP Connectivity from siam-app');
  console.log('='.repeat(50));
  
  // Test internal Render connection
  console.log('\n📊 Testing Internal Render Connection:');
  try {
    const start = Date.now();
    const response = await fetch(`${internalUrl}/health`);
    const latency = Date.now() - start;
    const data = await response.json();
    
    console.log(`✅ Internal connection successful!`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Latency: ${latency}ms`);
    console.log(`   Server: ${data.server || 'aoma-mesh-mcp'}`);
  } catch (error) {
    console.log(`❌ Internal connection failed: ${error.message}`);
    console.log('   Make sure aoma-mesh-mcp is deployed as a private service');
  }
  
  // Compare with Railway (external)
  console.log('\n📊 Comparing with Railway (External):');
  try {
    const start = Date.now();
    const response = await fetch(`${externalUrl}/health`);
    const latency = Date.now() - start;
    
    console.log(`✅ Railway connection:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Latency: ${latency}ms`);
  } catch (error) {
    console.log(`❌ Railway connection failed: ${error.message}`);
  }
  
  // Performance test
  console.log('\n⚡ Running Performance Comparison:');
  const tests = 5;
  let internalTimes = [];
  let externalTimes = [];
  
  // Test internal
  for (let i = 0; i < tests; i++) {
    try {
      const start = Date.now();
      await fetch(`${internalUrl}/health`);
      internalTimes.push(Date.now() - start);
    } catch (e) {
      // Skip failed attempts
    }
  }
  
  // Test external
  for (let i = 0; i < tests; i++) {
    try {
      const start = Date.now();
      await fetch(`${externalUrl}/health`);
      externalTimes.push(Date.now() - start);
    } catch (e) {
      // Skip failed attempts
    }
  }
  
  if (internalTimes.length > 0) {
    const internalAvg = internalTimes.reduce((a, b) => a + b, 0) / internalTimes.length;
    console.log(`\n🚀 Internal (Render): ${internalAvg.toFixed(1)}ms average`);
  }
  
  if (externalTimes.length > 0) {
    const externalAvg = externalTimes.reduce((a, b) => a + b, 0) / externalTimes.length;
    console.log(`🌍 External (Railway): ${externalAvg.toFixed(1)}ms average`);
  }
  
  if (internalTimes.length > 0 && externalTimes.length > 0) {
    const internalAvg = internalTimes.reduce((a, b) => a + b, 0) / internalTimes.length;
    const externalAvg = externalTimes.reduce((a, b) => a + b, 0) / externalTimes.length;
    const improvement = ((externalAvg - internalAvg) / externalAvg * 100).toFixed(0);
    console.log(`\n✨ Performance Improvement: ${improvement}% faster internally!`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('Next step: Update siam-app env vars to use internal URL');
  console.log('MCP_SERVER_URL=http://aoma-mesh-mcp:10000');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testInternalMCPConnection;
}

// Test immediately if run directly
if (require.main === module) {
  testInternalMCPConnection().catch(console.error);
}
