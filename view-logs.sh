#!/bin/bash

# AOMA MCP Log Viewer
# View the latest MCP server logs

LOGS_DIR="/Users/matt/Documents/projects/aoma-mesh-mcp/logs"

if [ ! -d "$LOGS_DIR" ]; then
    echo "❌ No logs directory found at $LOGS_DIR"
    echo "Make sure MCP_LOGGING=true is set and the server has been run at least once."
    exit 1
fi

# Find the most recent log file
LATEST_LOG=$(ls -t "$LOGS_DIR"/*.log 2>/dev/null | head -n 1)

if [ -z "$LATEST_LOG" ]; then
    echo "❌ No log files found in $LOGS_DIR"
    exit 1
fi

echo "📄 Viewing: $LATEST_LOG"
echo "============================================"
echo ""

# Use tail -f for live viewing, or cat for full view
if [ "$1" == "--follow" ] || [ "$1" == "-f" ]; then
    echo "Following log file (Ctrl+C to stop)..."
    tail -f "$LATEST_LOG"
elif [ "$1" == "--all" ] || [ "$1" == "-a" ]; then
    cat "$LATEST_LOG"
else
    # Show last 50 lines by default
    echo "Showing last 50 lines (use -f to follow, -a for all):"
    echo ""
    tail -n 50 "$LATEST_LOG"
fi
