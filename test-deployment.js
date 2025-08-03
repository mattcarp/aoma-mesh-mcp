#!/usr/bin/env node

/**
 * Simple test script to verify AOMA Mesh MCP Server is working
 * Tests both local and Railway deployment endpoints
 */

import fetch from 'node-fetch';

async function testEndpoint(url, name) {
    console.log(`\n🧪 Testing ${name}: ${url}`);
    
    try {
        const response = await fetch(url, { 
            timeout: 10000,
            headers: {
                'User-Agent': 'AOMA-Test/1.0'
            }
        });
        
        console.log(`✅ Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const text = await response.text();
            console.log(`📄 Response preview: ${text.substring(0, 200)}...`);
        }
        
        return response.ok;
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        return false;
    }
}

async function testMCPEndpoints() {
    console.log('🚀 AOMA Mesh MCP Server Deployment Test\n');
    
    // Test Railway deployment
    const railwayUrl = 'https://luminous-dedication-production.up.railway.app';
    await testEndpoint(railwayUrl, 'Railway Production');
    await testEndpoint(`${railwayUrl}/health`, 'Railway Health Check');
    await testEndpoint(`${railwayUrl}/mcp`, 'Railway MCP Endpoint');
    
    console.log('\n✨ Test completed!');
}

testMCPEndpoints().catch(console.error);
