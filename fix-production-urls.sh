#!/bin/bash

# 🚨 CRITICAL SAFETY SCRIPT: Replace ALL production JIRA URLs with UAT URLs
# This prevents accidentally running tests against production with thousands of users

echo "🚨 CRITICAL SAFETY FIX: Replacing production URLs with UAT URLs..."
echo "This prevents accidentally testing against production JIRA!"

# Find and replace all production URLs with UAT URLs
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' 's/https:\/\/jira\.smedigitalapps\.com/https:\/\/jirauat.smedigitalapps.com/g' {} \;

find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" -o -name "*.md" \) \
  -not -path "./node_modules/*" \
  -not -path "./.git/*" \
  -exec sed -i '' 's/jira\.smedigitalapps\.com/jirauat.smedigitalapps.com/g' {} \;

echo "✅ Fixed all production URLs to use UAT environment"
echo "🔍 Checking for any remaining production URLs..."

# Check if any production URLs remain
REMAINING=$(grep -r "jira\.smedigitalapps\.com" . --include="*.ts" --include="*.js" --include="*.json" --include="*.md" --exclude-dir=node_modules --exclude-dir=.git | grep -v "jirauat" | wc -l)

if [ "$REMAINING" -gt 0 ]; then
    echo "⚠️  WARNING: Found $REMAINING remaining production URLs:"
    grep -r "jira\.smedigitalapps\.com" . --include="*.ts" --include="*.js" --include="*.json" --include="*.md" --exclude-dir=node_modules --exclude-dir=.git | grep -v "jirauat"
else
    echo "✅ SUCCESS: All production URLs have been replaced with UAT URLs"
fi

echo ""
echo "🎯 SAFETY CHECK COMPLETE"
echo "All JIRA testing will now use UAT environment: https://jirauat.smedigitalapps.com"
echo "This prevents accidentally disrupting production with thousands of users!"
