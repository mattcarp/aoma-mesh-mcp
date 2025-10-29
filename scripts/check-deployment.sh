#!/bin/bash

# Check Railway Deployment Status
# This script verifies if the new code has been deployed

echo "🔍 Checking Railway deployment status..."
echo ""

# Get the latest git commit
LATEST_COMMIT=$(git log --format="%h %s" -1)
echo "📝 Latest Git Commit:"
echo "   $LATEST_COMMIT"
echo ""

# Get the deployed version
echo "🚀 Deployed Version:"
DEPLOYED_VERSION=$(curl -s https://luminous-dedication-production.up.railway.app/health | jq -r '.metrics.version')
DEPLOYED_UPTIME=$(curl -s https://luminous-dedication-production.up.railway.app/health | jq -r '.metrics.uptime')
DEPLOYED_AVG_TIME=$(curl -s https://luminous-dedication-production.up.railway.app/health | jq -r '.metrics.averageResponseTime')

echo "   Version: $DEPLOYED_VERSION"
echo "   Uptime: $((DEPLOYED_UPTIME / 1000 / 60)) minutes"
echo "   Avg Response: ${DEPLOYED_AVG_TIME}ms"
echo ""

# Check if it's the new version
if [[ "$DEPLOYED_VERSION" == *"20251028"* ]]; then
    echo "❌ OLD VERSION STILL DEPLOYED (Oct 28)"
    echo ""
    echo "🔧 To manually trigger Railway deployment:"
    echo ""
    echo "Option 1 - Railway Dashboard:"
    echo "   1. Go to https://railway.app"
    echo "   2. Select 'aoma-mesh-mcp' project"
    echo "   3. Click 'Deployments' tab"
    echo "   4. Click 'Deploy' button"
    echo ""
    echo "Option 2 - Railway CLI:"
    echo "   cd /Users/mcarpent/Documents/projects/aoma-mesh-mcp"
    echo "   railway up"
    echo ""
    echo "Option 3 - Check GitHub Actions:"
    echo "   https://github.com/mattcarp/aoma-mesh-mcp/actions"
    echo ""
    exit 1
elif [[ "$DEPLOYED_VERSION" == *"20251029"* ]]; then
    echo "✅ NEW VERSION DEPLOYED (Oct 29)"
    echo ""
    echo "🧪 Testing performance improvement..."
    echo ""

    # Test query performance
    START_TIME=$(date +%s%3N)
    RESPONSE=$(curl -s -X POST https://luminous-dedication-production.up.railway.app/rpc \
      -H 'Content-Type: application/json' \
      -d '{
        "jsonrpc":"2.0",
        "id":"test",
        "method":"tools/call",
        "params":{
          "name":"query_aoma_knowledge",
          "arguments":{
            "query":"How do I submit assets?",
            "strategy":"rapid"
          }
        }
      }')
    END_TIME=$(date +%s%3N)
    DURATION=$((END_TIME - START_TIME))

    # Extract performance metrics from response
    METHOD=$(echo "$RESPONSE" | jq -r '.result.metadata.method // "unknown"')
    TOTAL_MS=$(echo "$RESPONSE" | jq -r '.result.metadata.performance.totalDuration // "N/A"')
    VECTOR_MS=$(echo "$RESPONSE" | jq -r '.result.metadata.performance.vectorSearchDuration // "N/A"')
    COMPLETION_MS=$(echo "$RESPONSE" | jq -r '.result.metadata.performance.completionDuration // "N/A"')

    echo "   Method: $METHOD"
    echo "   Total Duration: ${DURATION}ms (measured) | $TOTAL_MS (reported)"
    echo "   Vector Search: $VECTOR_MS"
    echo "   Completion: $COMPLETION_MS"
    echo ""

    if [[ "$METHOD" == "vector-search + chat-completions" ]]; then
        echo "✅ NEW FAST PATH CONFIRMED!"
        echo ""
        if [ "$DURATION" -lt 12000 ]; then
            echo "✅ PERFORMANCE TARGET MET: ${DURATION}ms < 12s"
        else
            echo "⚠️  Slower than expected: ${DURATION}ms > 12s"
        fi
    else
        echo "⚠️  Method doesn't match expected 'vector-search + chat-completions'"
    fi

    exit 0
else
    echo "⚠️  Unknown version: $DEPLOYED_VERSION"
    exit 1
fi
