#!/bin/bash

# 🔥 Daily JIRA Testing with MCP Inspector
# No more fucking login regressions!

set -e

echo "🚀 JIRA UAT Daily Testing with MCP Inspector"
echo "============================================="
echo "📅 $(date)"
echo ""

# Configuration
MCP_CLI="/usr/local/bin/npx @modelcontextprotocol/inspector"
CONFIG="--config jira-auth-config.json --server jira-auth"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Quick Auth Check
log_info "Step 1: Checking JIRA authentication status..."
if $MCP_CLI --cli $CONFIG --method tools/call --tool-name validate_jira_auth --tool-arg quick=true | grep -q '"isAuthenticated": true'; then
    log_success "Authentication is valid - ready to test!"
else
    log_warning "Authentication is stale or invalid"
    log_info "Starting session refresh process..."
    
    # Try to refresh session
    if $MCP_CLI --cli $CONFIG --method tools/call --tool-name refresh_jira_session --tool-arg timeout=60 | grep -q "SESSION REFRESH SUCCESS"; then
        log_success "Session refreshed successfully!"
    else
        log_error "Session refresh failed - manual login required"
        log_info "Please run the following command and login manually:"
        echo "  $MCP_CLI --cli $CONFIG --method tools/call --tool-name refresh_jira_session --tool-arg timeout=120"
        exit 1
    fi
fi

# Step 2: Full Validation
log_info "Step 2: Full authentication validation..."
if $MCP_CLI --cli $CONFIG --method tools/call --tool-name validate_jira_auth --tool-arg quick=false | grep -q '"isAuthenticated": true'; then
    log_success "Full authentication validated!"
else
    log_error "Full validation failed - check session"
    exit 1
fi

# Step 3: Test Core Functionality
log_info "Step 3: Testing core JIRA functionality..."
FUNC_RESULT=$($MCP_CLI --cli $CONFIG --method tools/call --tool-name test_jira_functionality --tool-arg functionality=all)

# Parse results
PASSED=$(echo "$FUNC_RESULT" | grep -o '"success": true' | wc -l | tr -d ' ')
TOTAL=$(echo "$FUNC_RESULT" | grep -o '"name":' | wc -l | tr -d ' ')

if [ "$PASSED" -eq "$TOTAL" ]; then
    log_success "All functionality tests passed! ($PASSED/$TOTAL)"
elif [ "$PASSED" -gt 0 ]; then
    log_warning "Partial success: $PASSED/$TOTAL tests passed"
    echo "$FUNC_RESULT" | jq '.content[0].text' | jq -r '.' | grep -A 20 "FAILED TESTS"
else
    log_error "All functionality tests failed!"
    echo "$FUNC_RESULT"
    exit 1
fi

# Step 4: Run Comprehensive Test Suite (Optional)
read -p "🧪 Run comprehensive test suite? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Step 4: Running comprehensive test suite..."
    node master-test-dashboard.cjs
else
    log_info "Skipping comprehensive test suite"
fi

# Step 5: Session Status Report
log_info "Final session status:"
$MCP_CLI --cli $CONFIG --method tools/call --tool-name get_session_status | jq '.content[0].text' | jq -r '.' | head -20

echo ""
log_success "Daily JIRA testing complete!"
log_info "MCP Inspector UI available at: http://localhost:6274"
log_info "For visual debugging, visit the MCP Inspector interface"

# Create timestamp file for tracking
echo "$(date): Daily testing completed - Auth: ✅, Functionality: $PASSED/$TOTAL" >> .daily-test-log

echo ""
echo "🎉 No more login regressions! Professional testing FTW! 🎉" 