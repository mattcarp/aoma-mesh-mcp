import { chromium } from 'playwright';
import fs from 'fs';

async function useSavedSessionForTesting() {
    console.log('🚀 COMPREHENSIVE JIRA 10.3 TESTING WITH SAVED SESSION');
    console.log('================================================================================');
    console.log('💾 Loading saved session from: complete-jira-session.json');
    console.log('🧪 Running comprehensive upgrade validation tests');
    console.log('📊 Generating beautiful unified report for Irina');
    console.log('================================================================================');

    // Check if session file exists
    if (!fs.existsSync('complete-jira-session.json')) {
        console.log('❌ No saved session found!');
        console.log('   Please run: npx tsx simple-login-then-capture-session.ts first');
        return;
    }

    // Load saved session
    const sessionData = JSON.parse(fs.readFileSync('complete-jira-session.json', 'utf8'));
    console.log(`✅ Session loaded from: ${sessionData.timestamp}`);
    console.log(`   📊 Cookies: ${sessionData.cookies.length}`);
    console.log(`   🎯 JIRA Token: ${sessionData.jiraData.atlToken?.substring(0, 20)}...`);

    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        userAgent: sessionData.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Restore cookies
    if (sessionData.cookies && sessionData.cookies.length > 0) {
        await context.addCookies(sessionData.cookies);
        console.log('🍪 Session cookies restored');
    }

    const page = await context.newPage();

    try {
        console.log('');
        console.log('🧪 STARTING COMPREHENSIVE TEST SUITE');
        console.log('================================================================================');

        const testResults = {
            timestamp: new Date().toISOString(),
            testSuite: 'JIRA 10.3 Upgrade Validation with Saved Session',
            environment: 'UAT (jirauat.smedigitalapps.com)',
            sessionUsed: sessionData.timestamp,
            tests: [] as any[]
        };

        // Test 1: Dashboard Access & Performance
        console.log('📊 TEST 1: Dashboard Access & Performance');
        try {
            const startTime = Date.now();
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            const loadTime = Date.now() - startTime;

            // Check for login requirement
            const dashboardStatus = await page.evaluate(() => {
                const hasLoginButton = document.querySelector('*')?.textContent?.includes('Log In');
                const hasUserProfile = document.querySelector('.user-avatar, .user-name, .user-profile') !== null;
                const title = document.title;
                const url = window.location.href;
                return { hasLoginButton, hasUserProfile, title, url };
            });

            await page.screenshot({ path: 'test-1-dashboard.png', fullPage: true });

            const isAuthenticated = !dashboardStatus.hasLoginButton;
            testResults.tests.push({
                testId: 'TEST-001',
                name: 'Dashboard Access & Performance',
                status: isAuthenticated && loadTime < 15000 ? 'PASS' : isAuthenticated ? 'WARN' : 'FAIL',
                loadTime: `${loadTime}ms`,
                threshold: '15000ms',
                authenticated: isAuthenticated,
                pageTitle: dashboardStatus.title,
                screenshot: 'test-1-dashboard.png',
                details: isAuthenticated ? 'Successfully authenticated' : 'Login required'
            });

            console.log(`   ${isAuthenticated ? '✅' : '❌'} Authentication: ${isAuthenticated ? 'SUCCESS' : 'FAILED'}`);
            console.log(`   ${loadTime < 15000 ? '✅' : '⚠️'} Load Time: ${loadTime}ms`);

            if (!isAuthenticated) {
                console.log('   ⚠️ Session expired or incomplete - may need fresh login');
            }

        } catch (error) {
            console.log(`   ❌ Dashboard test failed: ${error}`);
            testResults.tests.push({
                testId: 'TEST-001',
                name: 'Dashboard Access & Performance',
                status: 'FAIL',
                error: error.toString()
            });
        }

        // Test 2: ITSM Project Access
        console.log('📊 TEST 2: ITSM Project Access');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/browse/ITSM', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            const itsmStatus = await page.evaluate(() => {
                const bodyText = document.body.textContent?.toLowerCase() || '';
                const hasError = bodyText.includes('does not exist') || bodyText.includes('not found') || bodyText.includes('permission');
                const hasProject = bodyText.includes('itsm') || document.querySelector('[data-project-key="ITSM"]');
                const title = document.title;
                return { hasError, hasProject, title, bodyPreview: bodyText.substring(0, 300) };
            });

            await page.screenshot({ path: 'test-2-itsm-project.png', fullPage: true });

            testResults.tests.push({
                testId: 'TEST-002',
                name: 'ITSM Project Access',
                status: !itsmStatus.hasError ? 'PASS' : 'FAIL',
                accessible: !itsmStatus.hasError,
                hasProject: itsmStatus.hasProject,
                pageTitle: itsmStatus.title,
                screenshot: 'test-2-itsm-project.png'
            });

            console.log(`   ${!itsmStatus.hasError ? '✅' : '❌'} ITSM Project: ${!itsmStatus.hasError ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);

        } catch (error) {
            console.log(`   ❌ ITSM test failed: ${error}`);
            testResults.tests.push({
                testId: 'TEST-002',
                name: 'ITSM Project Access',
                status: 'FAIL',
                error: error.toString()
            });
        }

        // Test 3: DPSA Project Access  
        console.log('📊 TEST 3: DPSA Project Access');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/browse/DPSA', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            const dpsaStatus = await page.evaluate(() => {
                const bodyText = document.body.textContent?.toLowerCase() || '';
                const hasError = bodyText.includes('does not exist') || bodyText.includes('not found') || bodyText.includes('permission');
                const hasProject = bodyText.includes('dpsa') || document.querySelector('[data-project-key="DPSA"]');
                const title = document.title;
                return { hasError, hasProject, title };
            });

            await page.screenshot({ path: 'test-3-dpsa-project.png', fullPage: true });

            testResults.tests.push({
                testId: 'TEST-003',
                name: 'DPSA Project Access',
                status: !dpsaStatus.hasError ? 'PASS' : 'FAIL',
                accessible: !dpsaStatus.hasError,
                hasProject: dpsaStatus.hasProject,
                pageTitle: dpsaStatus.title,
                screenshot: 'test-3-dpsa-project.png'
            });

            console.log(`   ${!dpsaStatus.hasError ? '✅' : '❌'} DPSA Project: ${!dpsaStatus.hasError ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'}`);

        } catch (error) {
            console.log(`   ❌ DPSA test failed: ${error}`);
            testResults.tests.push({
                testId: 'TEST-003',
                name: 'DPSA Project Access',
                status: 'FAIL',
                error: error.toString()
            });
        }

        // Test 4: Issue Navigator Performance
        console.log('📊 TEST 4: Issue Navigator Performance');
        try {
            const startTime = Date.now();
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa', { 
                waitUntil: 'networkidle',
                timeout: 45000 
            });
            const loadTime = Date.now() - startTime;

            await page.screenshot({ path: 'test-4-issue-navigator.png', fullPage: true });

            testResults.tests.push({
                testId: 'TEST-004',
                name: 'Issue Navigator Performance',
                status: loadTime < 20000 ? 'PASS' : 'WARN',
                loadTime: `${loadTime}ms`,
                threshold: '20000ms',
                screenshot: 'test-4-issue-navigator.png',
                notes: loadTime > 20000 ? 'Exceeds optimal performance threshold' : 'Within acceptable limits'
            });

            console.log(`   ${loadTime < 20000 ? '✅' : '⚠️'} Issue Navigator: ${loadTime}ms ${loadTime > 20000 ? '(SLOW)' : ''}`);

        } catch (error) {
            console.log(`   ❌ Issue Navigator test failed: ${error}`);
            testResults.tests.push({
                testId: 'TEST-004',
                name: 'Issue Navigator Performance',
                status: 'FAIL',
                error: error.toString()
            });
        }

        // Test 5: Cross-Project Search
        console.log('📊 TEST 5: Cross-Project Search Functionality');
        try {
            const startTime = Date.now();
            await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20in%20(ITSM%2C%20DPSA)%20ORDER%20BY%20created%20DESC', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });
            const loadTime = Date.now() - startTime;

            const searchStatus = await page.evaluate(() => {
                const bodyText = document.body.textContent?.toLowerCase() || '';
                const needsLogin = bodyText.includes('try logging in to see more results');
                const hasResults = bodyText.includes('issue') || bodyText.includes('ticket') || document.querySelector('.issue-table, .navigator-results');
                const hasError = bodyText.includes('does not exist for the field');
                const title = document.title;
                return { needsLogin, hasResults, hasError, title, bodyPreview: bodyText.substring(0, 400) };
            });

            await page.screenshot({ path: 'test-5-search-results.png', fullPage: true });

            let status = 'FAIL';
            if (!searchStatus.needsLogin && !searchStatus.hasError) {
                status = 'PASS';
            } else if (!searchStatus.hasError) {
                status = 'WARN';
            }

            testResults.tests.push({
                testId: 'TEST-005',
                name: 'Cross-Project Search',
                status: status,
                loadTime: `${loadTime}ms`,
                needsLogin: searchStatus.needsLogin,
                hasResults: searchStatus.hasResults,
                hasError: searchStatus.hasError,
                pageTitle: searchStatus.title,
                screenshot: 'test-5-search-results.png'
            });

            console.log(`   ${status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌'} Search: ${searchStatus.needsLogin ? 'Needs Login' : searchStatus.hasError ? 'Project Error' : 'Working'}`);

        } catch (error) {
            console.log(`   ❌ Search test failed: ${error}`);
            testResults.tests.push({
                testId: 'TEST-005',
                name: 'Cross-Project Search',
                status: 'FAIL',
                error: error.toString()
            });
        }

        // Generate Beautiful Unified Report
        console.log('');
        console.log('📋 GENERATING BEAUTIFUL UNIFIED REPORT');
        console.log('================================================================================');

        const reportContent = generateUnifiedReport(testResults);
        const reportFilename = `JIRA-10.3-Upgrade-Test-Report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;

        fs.writeFileSync(reportFilename, reportContent);
        fs.writeFileSync('latest-test-results.json', JSON.stringify(testResults, null, 2));

        const passCount = testResults.tests.filter(t => t.status === 'PASS').length;
        const warnCount = testResults.tests.filter(t => t.status === 'WARN').length;
        const failCount = testResults.tests.filter(t => t.status === 'FAIL').length;
        const totalTests = testResults.tests.length;

        console.log(`📄 Beautiful report: ${reportFilename}`);
        console.log(`📊 Test results: latest-test-results.json`);
        console.log(`📸 Screenshots: test-1-dashboard.png, test-2-itsm-project.png, etc.`);
        console.log('');
        console.log('🎯 FINAL RESULTS SUMMARY');
        console.log('================================================================================');
        console.log(`✅ Passed: ${passCount}/${totalTests} tests`);
        console.log(`⚠️ Warnings: ${warnCount}/${totalTests} tests`);
        console.log(`❌ Failed: ${failCount}/${totalTests} tests`);
        console.log(`📊 Success Rate: ${Math.round((passCount/totalTests) * 100)}%`);
        console.log('');

        if (passCount === totalTests) {
            console.log('🎉 ALL TESTS PASSED! JIRA 10.3 upgrade validation successful!');
        } else if (failCount === 0) {
            console.log('😊 Tests completed with warnings - review performance concerns');
        } else {
            console.log('⚠️ Some tests failed - review and address issues before production');
        }

        console.log('');
        console.log('📁 Ready to share with Irina! All files generated for review.');

    } catch (error) {
        console.error('❌ Testing error:', error);
        await page.screenshot({ path: 'testing-error.png', fullPage: true });
    } finally {
        console.log('');
        console.log('⏳ Keeping browser open for 30 seconds for review...');
        await page.waitForTimeout(30000);
        await browser.close();
        console.log('✅ Testing complete!');
    }
}

function generateUnifiedReport(results: any): string {
    const timestamp = new Date().toLocaleString();
    const passCount = results.tests.filter((t: any) => t.status === 'PASS').length;
    const warnCount = results.tests.filter((t: any) => t.status === 'WARN').length;
    const failCount = results.tests.filter((t: any) => t.status === 'FAIL').length;
    const totalTests = results.tests.length;
    const successRate = Math.round((passCount/totalTests) * 100);

    return `# JIRA 10.3 Upgrade Test Report

## 📋 Executive Summary
**Date**: ${timestamp}  
**Environment**: JIRA UAT (https://jirauat.smedigitalapps.com)  
**Test Framework**: Playwright E2E with Saved Session Authentication  
**Session Used**: ${results.sessionUsed}  
**Total Tests**: ${totalTests}  
**Success Rate**: ${successRate}%

## 🎯 Results Overview
- ✅ **Passed**: ${passCount} tests
- ⚠️ **Warnings**: ${warnCount} tests  
- ❌ **Failed**: ${failCount} tests

## 📊 Detailed Test Results

${results.tests.map((test: any, index: number) => `
### ${test.testId}: ${test.name}
**Status**: ${test.status === 'PASS' ? '✅ PASSED' : test.status === 'WARN' ? '⚠️ WARNING' : '❌ FAILED'}  
${test.loadTime ? `**Load Time**: ${test.loadTime}  ` : ''}${test.threshold ? `**Threshold**: ${test.threshold}  ` : ''}${test.authenticated !== undefined ? `**Authenticated**: ${test.authenticated ? 'Yes' : 'No'}  ` : ''}${test.accessible !== undefined ? `**Accessible**: ${test.accessible ? 'Yes' : 'No'}  ` : ''}${test.hasResults !== undefined ? `**Has Results**: ${test.hasResults ? 'Yes' : 'No'}  ` : ''}${test.needsLogin !== undefined ? `**Needs Login**: ${test.needsLogin ? 'Yes' : 'No'}  ` : ''}${test.pageTitle ? `**Page Title**: ${test.pageTitle}  ` : ''}${test.screenshot ? `**Screenshot**: ${test.screenshot}  ` : ''}${test.notes ? `**Notes**: ${test.notes}  ` : ''}${test.details ? `**Details**: ${test.details}  ` : ''}${test.error ? `**Error**: ${test.error}  ` : ''}
`).join('')}

## 🔧 Analysis & Recommendations

### Authentication Status
${results.tests.find((t: any) => t.testId === 'TEST-001')?.authenticated ? 
'✅ **Session Authentication**: Working correctly with saved session data' : 
'❌ **Session Authentication**: Failed - saved session may be expired or incomplete'}

### Project Access
${results.tests.filter((t: any) => t.testId.includes('TEST-002') || t.testId.includes('TEST-003')).every((t: any) => t.accessible) ?
'✅ **Project Access**: Both ITSM and DPSA projects are accessible' :
'⚠️ **Project Access**: Issues detected with project accessibility'}

### Performance Analysis
${results.tests.filter((t: any) => t.loadTime).map((t: any) => `- **${t.name}**: ${t.loadTime} ${parseInt(t.loadTime) > parseInt(t.threshold || '30000') ? '(Exceeds threshold)' : '(Acceptable)'}`).join('\n')}

${failCount > 0 ? `### Critical Issues
${results.tests.filter((t: any) => t.status === 'FAIL').map((t: any) => `- **${t.name}**: ${t.error || 'Review required'}`).join('\n')}` : ''}

${warnCount > 0 ? `### Performance Concerns  
${results.tests.filter((t: any) => t.status === 'WARN').map((t: any) => `- **${t.name}**: ${t.notes || 'Review performance metrics'}`).join('\n')}` : ''}

## ✅ Next Steps
1. **Review Screenshots**: Check all generated screenshots for visual validation
2. **Address Failed Tests**: Investigate and resolve any failed test cases
3. **Performance Optimization**: Review warnings for performance improvements
4. **Production Readiness**: Ensure all critical tests pass before deployment
5. **Session Management**: Update session capture if authentication issues persist

## 🔐 Session Management Notes
- **Session File**: ${results.sessionUsed}
- **Authentication Method**: Saved browser session with JSESSIONID and CSRF tokens
- **Recommendation**: Refresh session capture if tests show authentication failures

---
*Report generated automatically by JIRA 10.3 Upgrade Testing Suite*  
*All screenshots and test artifacts included for comprehensive review*  
*Contact: Development Team for technical questions*
`;
}

// Run the comprehensive test with saved session
useSavedSessionForTesting().catch(console.error); 