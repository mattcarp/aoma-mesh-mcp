#!/bin/bash

echo "🔍 JIRA UAT NETWORK DIAGNOSTIC"
echo "=============================="
echo ""

echo "1. Testing basic connectivity to JIRA UAT..."
echo "ping -c 3 jirauat.smedigitalapps.com"
ping -c 3 jirauat.smedigitalapps.com

echo ""
echo "2. Testing HTTPS connectivity..."
echo "curl -I --connect-timeout 10 https://jirauat.smedigitalapps.com"
curl -I --connect-timeout 10 https://jirauat.smedigitalapps.com

echo ""
echo "3. Testing DNS resolution..."
echo "nslookup jirauat.smedigitalapps.com"
nslookup jirauat.smedigitalapps.com

echo ""
echo "4. Testing with different timeout..."
echo "curl -I --connect-timeout 5 --max-time 10 https://jirauat.smedigitalapps.com/jira/"
curl -I --connect-timeout 5 --max-time 10 https://jirauat.smedigitalapps.com/jira/

echo ""
echo "5. Checking if VPN is required..."
echo "   - If all above tests fail, you likely need to connect to a VPN"
echo "   - If DNS fails, the domain might not exist or be internal-only"
echo "   - If ping works but HTTPS fails, there might be firewall rules"

echo ""
echo "🔧 NEXT STEPS:"
echo "   1. If you need VPN: Connect to your company VPN first"
echo "   2. If domain doesn't exist: Verify the correct JIRA UAT URL"
echo "   3. If firewall issues: Check with your IT team"
echo "   4. Once network works: Run 'node test-auth-after-network-fix.js'"
