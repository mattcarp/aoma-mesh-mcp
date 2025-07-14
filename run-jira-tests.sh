#!/bin/bash

echo "🚀 JIRA 10.3 UPGRADE TESTING SUITE"
echo "======================================"
echo "Environment: UAT (https://jirauat.smedigitalapps.com)"
echo "Target Projects: ITSM, DPSA"
echo "For: Irina's JIRA/Confluence Support Team"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    echo "Please create .env file with:"
    echo "JIRA_EMAIL=your-email@company.com"
    echo "JIRA_PWD=your-password"
    echo "SUPABASE_URL=your-supabase-url"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-supabase-key"
    exit 1
fi

print_status ".env file found"

# Menu options
echo ""
echo "Select test option:"
echo "1. 🎯 Smart Data Extraction (Recommended)"
echo "2. 🧪 Playwright E2E Tests"
echo "3. 📊 Generate Reports Only"
echo "4. 🔄 Full Test Suite"
echo "5. 🚨 Quick Validation Check"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        print_info "Running Smart JIRA Data Extraction..."
        npx tsx final-login-scraper.ts
        ;;
    2)
        print_info "Running Playwright E2E Tests..."
        echo "Available test suites:"
        echo "  a) Direct validation (assumes already logged in)"
        echo "  b) Comprehensive upgrade test"
        echo "  c) Simple login test"
        read -p "Select test suite (a/b/c): " suite
        
        case $suite in
            a)
                npx playwright test --config playwright.jira-upgrade.config.ts direct-validation-test.spec.ts --headed
                ;;
            b)
                npx playwright test --config playwright.jira-upgrade.config.ts comprehensive-upgrade-test.spec.ts --headed
                ;;
            c)
                npx playwright test --config playwright.jira-upgrade.config.ts simple-login-test.spec.ts --headed
                ;;
            *)
                print_error "Invalid selection"
                exit 1
                ;;
        esac
        ;;
    3)
        print_info "Generating reports from existing data..."
        echo "📋 Available reports:"
        ls -la jira-upgrade-validation-*.json 2>/dev/null || echo "No validation reports found"
        ls -la uat-final-tickets-*.json 2>/dev/null || echo "No ticket extractions found"
        echo ""
        echo "📊 Comprehensive report:"
        if [ -f "jira-upgrade-testing/reports/comprehensive-validation-report.md" ]; then
            print_status "Comprehensive validation report available"
            echo "Location: jira-upgrade-testing/reports/comprehensive-validation-report.md"
        else
            print_warning "Comprehensive report not found"
        fi
        ;;
    4)
        print_info "Running Full Test Suite..."
        echo "🔄 Step 1: Smart Data Extraction"
        npx tsx final-login-scraper.ts
        
        echo ""
        echo "🔄 Step 2: Playwright Validation"
        npx playwright test --config playwright.jira-upgrade.config.ts direct-validation-test.spec.ts --headed
        
        echo ""
        echo "🔄 Step 3: Report Generation"
        print_status "Full test suite complete!"
        ;;
    5)
        print_info "Running Quick Validation Check..."
        echo "🔍 Checking session file..."
        if [ -f "uat-jira-session.json" ]; then
            print_status "Session file exists"
            SESSION_AGE=$((($(date +%s) - $(date -r uat-jira-session.json +%s)) / 3600))
            if [ $SESSION_AGE -lt 24 ]; then
                print_status "Session is recent (${SESSION_AGE} hours old)"
            else
                print_warning "Session is old (${SESSION_AGE} hours) - may need refresh"
            fi
        else
            print_warning "No session file found"
        fi
        
        echo ""
        echo "🔍 Checking environment variables..."
        if grep -q "JIRA_EMAIL" .env; then
            print_status "JIRA_EMAIL configured"
        else
            print_error "JIRA_EMAIL missing"
        fi
        
        if grep -q "JIRA_PWD" .env; then
            print_status "JIRA_PWD configured"
        else
            print_error "JIRA_PWD missing"
        fi
        
        echo ""
        echo "🔍 Running quick network test..."
        if ping -c 1 jirauat.smedigitalapps.com > /dev/null 2>&1; then
            print_status "JIRA UAT reachable"
        else
            print_error "JIRA UAT not reachable - check VPN"
        fi
        
        echo ""
        echo "🎯 Quick browser test..."
        npx playwright test --config playwright.jira-upgrade.config.ts direct-validation-test.spec.ts --headed --timeout=30000
        ;;
    *)
        print_error "Invalid choice"
        exit 1
        ;;
esac

echo ""
print_status "Test execution complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Review generated reports"
echo "2. Check jira-upgrade-testing/reports/ directory"
echo "3. Share results with Irina's team"
echo "4. Document any issues found"
echo ""
echo "🎉 JIRA 10.3 Upgrade Testing Complete!" 