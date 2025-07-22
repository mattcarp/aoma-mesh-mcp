#!/usr/bin/env node

/**
 * Test script to verify the chat landing page integration with AOMA Mesh MCP server
 */

const https = require('https');
const http = require('http');

class MCPClient {
    constructor(baseUrl = 'http://localhost:3333') {
        this.baseUrl = baseUrl;
        this.requestId = 1;
    }

    async callTool(toolName, args = {}) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({
                jsonrpc: '2.0',
                id: this.requestId++,
                method: 'tools/call',
                params: {
                    name: toolName,
                    arguments: args
                }
            });

            const options = {
                hostname: 'localhost',
                port: 3333,
                path: '/rpc',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.error) {
                            reject(new Error(response.error.message || 'Unknown error'));
                        } else {
                            resolve(response.result);
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    async getHealth() {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3333,
                path: '/health',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.end();
        });
    }
}

async function runTests() {
    console.log('🧪 Testing AOMA Mesh MCP Chat Integration\n');
    console.log('=' .repeat(50));

    const client = new MCPClient();
    let passed = 0;
    let failed = 0;

    // Test 1: Health Check
    console.log('\n1. Testing Health Check...');
    try {
        const health = await client.getHealth();
        console.log('   ✅ Health check passed');
        console.log(`   📊 Status: ${health.status}`);
        console.log(`   🔧 Version: ${health.version}`);
        console.log(`   ⏰ Uptime: ${Math.round(health.uptime / 1000)}s`);
        passed++;
    } catch (error) {
        console.log('   ❌ Health check failed:', error.message);
        failed++;
    }

    // Test 2: System Health Tool
    console.log('\n2. Testing System Health Tool...');
    try {
        const result = await client.callTool('get_system_health', {
            includeMetrics: true,
            includeDiagnostics: true
        });
        console.log('   ✅ System health tool passed');
        const data = JSON.parse(result.content[0].text);
        console.log(`   📊 System Status: ${data.status}`);
        console.log(`   🔧 Services: ${Object.keys(data.services || {}).length}`);
        passed++;
    } catch (error) {
        console.log('   ❌ System health tool failed:', error.message);
        failed++;
    }

    // Test 3: AOMA Knowledge Query
    console.log('\n3. Testing AOMA Knowledge Query...');
    try {
        const result = await client.callTool('query_aoma_knowledge', {
            query: 'What is AOMA and what does it do?',
            strategy: 'comprehensive'
        });
        console.log('   ✅ AOMA knowledge query passed');
        const data = JSON.parse(result.content[0].text);
        console.log(`   📝 Query: ${data.query}`);
        console.log(`   💡 Response length: ${data.response?.length || 0} characters`);
        passed++;
    } catch (error) {
        console.log('   ❌ AOMA knowledge query failed:', error.message);
        failed++;
    }

    // Test 4: JIRA Search
    console.log('\n4. Testing JIRA Search...');
    try {
        const result = await client.callTool('search_jira_tickets', {
            query: 'authentication issues',
            maxResults: 5,
            threshold: 0.7
        });
        console.log('   ✅ JIRA search passed');
        const data = JSON.parse(result.content[0].text);
        console.log(`   🎫 Total results: ${data.totalResults || 0}`);
        console.log(`   📋 Returned: ${data.results?.length || 0} tickets`);
        passed++;
    } catch (error) {
        console.log('   ❌ JIRA search failed:', error.message);
        failed++;
    }

    // Test 5: Cross-Vector Analysis
    console.log('\n5. Testing Cross-Vector Analysis...');
    try {
        const result = await client.callTool('swarm_analyze_cross_vector', {
            query: 'user authentication problems',
            sources: ['code', 'jira', 'aoma'],
            analysisDepth: 'standard'
        });
        console.log('   ✅ Cross-vector analysis passed');
        const data = JSON.parse(result.content[0].text);
        console.log(`   🚀 Analysis query: ${data.query}`);
        console.log(`   🧠 Has synthesis: ${data.analysis?.synthesis ? 'Yes' : 'No'}`);
        passed++;
    } catch (error) {
        console.log('   ❌ Cross-vector analysis failed:', error.message);
        failed++;
    }

    // Test Results
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 Test Results Summary');
    console.log('=' .repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

    if (failed === 0) {
        console.log('\n🎉 All tests passed! Chat integration is working perfectly.');
        console.log('🌐 You can now use the chat landing page at: file://' + __dirname + '/chat-landing-page.html');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the MCP server status.');
    }

    console.log('\n💡 Usage Tips:');
    console.log('• Open chat-landing-page.html in your browser');
    console.log('• Select different tools from the sidebar');
    console.log('• Try queries like "What is AOMA?" or "Search for authentication issues"');
    console.log('• Check the connection status indicator in the top-right');
}

// Run the tests
runTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
});
