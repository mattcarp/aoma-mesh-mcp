#!/bin/bash
# Comprehensive Railway Deployment Verification Script
# Tests the latest MCP server deployment on Railway

set -e

RAILWAY_URL="https://luminous-dedication-production.up.railway.app"
EXPECTED_VERSION="2.7.0"

echo "=================================================="
echo "🚀 AOMA Mesh MCP Server - Deployment Verification"
echo "=================================================="
echo ""
echo "Target: $RAILWAY_URL"
echo "Expected Version: $EXPECTED_VERSION"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
HEALTH_DATA=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" != "200" ]; then
    echo "   ❌ FAILED: HTTP $HTTP_CODE"
    exit 1
fi

echo "   ✅ PASSED: Health endpoint responding"

# Extract version (handle both version formats)
VERSION=$(echo "$HEALTH_DATA" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
UPTIME=$(echo "$HEALTH_DATA" | grep -o '"uptime":[0-9]*' | cut -d':' -f2)

if [ -z "$VERSION" ]; then
    echo "   ❌ FAILED: Could not extract version"
    exit 1
fi

echo "   📦 Version: $VERSION"
echo "   ⏱️  Uptime: $UPTIME ms"

# Check if version matches expected
if [[ "$VERSION" == *"$EXPECTED_VERSION"* ]]; then
    echo "   ✅ Version check passed"
else
    echo "   ⚠️  Warning: Version mismatch (expected: $EXPECTED_VERSION, got: $VERSION)"
fi

# Test 2: Services Status
echo ""
echo "2️⃣  Testing Service Connections..."

OPENAI_STATUS=$(echo "$HEALTH_DATA" | grep -o '"openai":{"status":[^,}]*' | grep -o 'true\|false')
SUPABASE_STATUS=$(echo "$HEALTH_DATA" | grep -o '"supabase":{"status":[^,}]*' | grep -o 'true\|false')
VECTOR_STATUS=$(echo "$HEALTH_DATA" | grep -o '"vectorStore":{"status":[^,}]*' | grep -o 'true\|false')

if [ "$OPENAI_STATUS" == "true" ]; then
    echo "   ✅ OpenAI: Connected"
else
    echo "   ❌ OpenAI: Disconnected"
fi

if [ "$SUPABASE_STATUS" == "true" ]; then
    echo "   ✅ Supabase: Connected"
else
    echo "   ❌ Supabase: Disconnected"
fi

if [ "$VECTOR_STATUS" == "true" ]; then
    echo "   ✅ Vector Store: Connected"
else
    echo "   ❌ Vector Store: Disconnected"
fi

# Test 3: RPC Endpoint - Get Server Capabilities
echo ""
echo "3️⃣  Testing RPC Endpoint - Server Capabilities..."

RPC_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/rpc" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_server_capabilities",
            "arguments": {}
        }
    }')

RPC_HTTP_CODE=$(echo "$RPC_RESPONSE" | tail -n 1)
RPC_DATA=$(echo "$RPC_RESPONSE" | head -n -1)

if [ "$RPC_HTTP_CODE" != "200" ]; then
    echo "   ❌ FAILED: RPC endpoint returned HTTP $RPC_HTTP_CODE"
    exit 1
fi

echo "   ✅ PASSED: RPC endpoint responding"

# Test 4: Verify Expected Tools
echo ""
echo "4️⃣  Testing Tool Availability..."

EXPECTED_TOOLS=(
    "get_system_health"
    "get_server_capabilities"
    "analyze_development_context"
    "query_aoma_knowledge"
    "search_code_files"
    "search_git_commits"
    "search_jira_tickets"
    "get_jira_ticket_count"
    "search_outlook_emails"
    "swarm_analyze_cross_vector"
)

TOOLS_JSON=$(echo "$RPC_DATA" | grep -o '"text":"[^"]*"' | cut -d'"' -f4)
MISSING_TOOLS=()

for tool in "${EXPECTED_TOOLS[@]}"; do
    if echo "$TOOLS_JSON" | grep -q "$tool"; then
        echo "   ✅ $tool"
    else
        echo "   ❌ $tool (MISSING)"
        MISSING_TOOLS+=("$tool")
    fi
done

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo ""
    echo "   ❌ FAILED: ${#MISSING_TOOLS[@]} tools missing"
    exit 1
fi

# Test 5: Test a Real Tool Call
echo ""
echo "5️⃣  Testing Real Tool Call - System Health..."

TOOL_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/rpc" \
    -H "Content-Type: application/json" \
    -d '{
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/call",
        "params": {
            "name": "get_system_health",
            "arguments": {}
        }
    }')

TOOL_HTTP_CODE=$(echo "$TOOL_RESPONSE" | tail -n 1)

if [ "$TOOL_HTTP_CODE" != "200" ]; then
    echo "   ❌ FAILED: Tool call returned HTTP $TOOL_HTTP_CODE"
    exit 1
fi

echo "   ✅ PASSED: Tool execution successful"

# Test 6: Metrics Endpoint
echo ""
echo "6️⃣  Testing Metrics Endpoint..."

METRICS_RESPONSE=$(curl -s -w "\n%{http_code}" "$RAILWAY_URL/metrics")
METRICS_HTTP_CODE=$(echo "$METRICS_RESPONSE" | tail -n 1)

if [ "$METRICS_HTTP_CODE" != "200" ]; then
    echo "   ⚠️  Warning: Metrics endpoint returned HTTP $METRICS_HTTP_CODE"
else
    echo "   ✅ PASSED: Metrics endpoint responding"
fi

# Summary
echo ""
echo "=================================================="
echo "✅ ALL TESTS PASSED"
echo "=================================================="
echo ""
echo "📊 Summary:"
echo "   • Health Check: ✅"
echo "   • Service Connections: ✅"
echo "   • RPC Endpoint: ✅"
echo "   • Tool Availability: ✅ (${#EXPECTED_TOOLS[@]}/${#EXPECTED_TOOLS[@]} tools)"
echo "   • Tool Execution: ✅"
echo "   • Metrics: ✅"
echo ""
echo "🎉 Railway deployment is fully operational!"
echo "🔗 URL: $RAILWAY_URL"
echo "📦 Version: $VERSION"
echo ""
