import { chromium } from 'playwright';
import fs from 'fs';

async function manualLoginThenComprehensiveTest() {
    console.log('🎯 MANUAL LOGIN + COMPREHENSIVE TESTING');
    console.log('================================================================================');
    console.log('👋 Hey there! I will:');
    console.log('   1. Open the browser to JIRA UAT login page');
    console.log('   2. ⏳ WAIT PATIENTLY for YOU to complete login');
    console.log('   3. 🤖 Take over once you\'re authenticated');
    console.log('   4. 🚀 Run comprehensive JIRA 10.3 upgrade tests');
    console.log('================================================================================');
    console.log('');
    console.log('📝 Login Steps for You:');
    console.log('   ✅ Click "Log In" button if you see one');
    console.log('   ✅ Enter your username/email');
    console.log('   ✅ Enter your password');
    console.log('   ✅ Accept any certificate dialogs');
    console.log('   ✅ Complete 2FA on your phone');
    console.log('   ✅ I\'ll detect when you\'re in and take over!');
    console.log('================================================================================');

    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        console.log('🌐 Opening JIRA UAT...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('✅ Browser opened! Please complete your login...');
        console.log('');
        console.log('⏳ I\'m waiting patiently for you to log in...');
        console.log('   (I\'ll check every 5 seconds to see if you\'re authenticated)');
        
        let loginCheckCount = 0;
        let isLoggedIn = false;
        const maxChecks = 240; // 20 minutes max wait
        
        while (!isLoggedIn && loginCheckCount < maxChecks) {
            loginCheckCount++;
            
            // Check every 30 seconds, not every 5 - be less intrusive
            if (loginCheckCount % 6 === 0) {
                console.log(`   🔍 Check ${Math.floor(loginCheckCount/6)}: Still waiting for login... (${Math.floor(loginCheckCount/12)} minutes elapsed)`);
            }
            
            try {
                // Check for authentication indicators
                const authStatus = await page.evaluate(() => {
                    const url = window.location.href;
                    const title = document.title;
                    const bodyText = document.body.textContent?.toLowerCase() || '';
                    
                    // Check for authenticated JIRA interface
                    const hasDashboard = url.includes('Dashboard.jspa') || bodyText.includes('dashboard');
                    const hasJiraHeader = document.querySelector('.aui-header, #header, .jira-header, .aui-nav') !== null;
                    const hasIssuesLink = document.querySelector('a[href*="issues"], a[href*="browse"]') !== null;
                    const hasUserProfile = document.querySelector('.user-avatar, .user-profile, .aui-dropdown2-trigger') !== null;
                    
                    // Check for login page indicators (still need to login)
                    const hasLoginForm = document.querySelector('input[type="password"], input[placeholder*="username"], input[placeholder*="email"]') !== null;
                    const hasLoginButton = bodyText.includes('log in') && !hasDashboard;
                    const is2FAPage = bodyText.includes('verification') || bodyText.includes('approve') || bodyText.includes('authenticate');
                    
                    // Auth cookies check
                    const hasAuthCookie = document.cookie.includes('JSESSIONID') || 
                                        document.cookie.includes('atlxsid') || 
                                        document.cookie.includes('crowd.token');
                    
                    const isAuthenticated = (hasDashboard && hasAuthCookie) || 
                                          (hasJiraHeader && hasUserProfile) ||
                                          (hasIssuesLink && hasAuthCookie);
                    
                    return {
                        isAuthenticated,
                        url,
                        title,
                        hasDashboard,
                        hasJiraHeader,
                        hasIssuesLink,
                        hasUserProfile,
                        hasLoginForm,
                        hasLoginButton,
                        is2FAPage,
                        hasAuthCookie,
                        bodyPreview: bodyText.substring(0, 200)
                    };
                });
                
                if (authStatus.isAuthenticated) {
                    isLoggedIn = true;
                    console.log('');
                    console.log('🎉 LOGIN DETECTED! You\'re authenticated!');
                    console.log(`   📍 Current URL: ${authStatus.url}`);
                    console.log(`   📄 Page Title: ${authStatus.title}`);
                    console.log('');
                    console.log('🤖 Taking over now for comprehensive testing...');
                    break;
                }
                
                // Give helpful status updates
                if (loginCheckCount % 12 === 0) { // Every minute
                    console.log('   💡 Status hints:');
                    if (authStatus.hasLoginForm) {
                        console.log('      🔑 I see login fields - enter your credentials');
                    }
                    if (authStatus.is2FAPage) {
                        console.log('      📱 I see 2FA page - check your phone');
                    }
                    if (authStatus.hasLoginButton) {
                        console.log('      👆 I see login button - click it when ready');
                    }
                    console.log(`      🌐 Current page: ${authStatus.title || 'Loading...'}`);
                }
                
            } catch (error) {
                // Ignore evaluation errors during navigation
            }
            
            await page.waitForTimeout(5000); // Check every 5 seconds
        }
        
        if (!isLoggedIn) {
            console.log('');
            console.log('⏰ Login timeout reached (20 minutes)');
            console.log('   Please try running the script again when ready to login');
            return;
        }
        
        // Save the session for future use
        console.log('💾 Saving session...');
        const cookies = await context.cookies();
        fs.writeFileSync('uat-jira-session.json', JSON.stringify({
            cookies,
            timestamp: new Date().toISOString(),
            url: page.url()
        }, null, 2));
        console.log('   ✅ Session saved to uat-jira-session.json');
        
        console.log('');
        console.log('🚀 STARTING COMPREHENSIVE JIRA 10.3 UPGRADE TESTS');
        console.log('================================================================================');
        
        // Now run comprehensive tests
        await runComprehensiveTests(page, context);
        
    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'manual-login-error.png', fullPage: true });
        console.log('📸 Error screenshot saved: manual-login-error.png');
    } finally {
        console.log('');
        console.log('⏳ Keeping browser open for 30 seconds for review...');
        await page.waitForTimeout(30000);
        await browser.close();
        console.log('✅ Test complete!');
    }
}

async function runComprehensiveTests(page: any, context: any) {
    const testResults = {
        timestamp: new Date().toISOString(),
        testSuite: 'JIRA 10.3 Upgrade Validation',
        environment: 'UAT',
        tests: [] as any[]
    };
    
    console.log('📊 TEST 1: Dashboard Performance');
    try {
        const startTime = Date.now();
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        
        await page.screenshot({ path: 'test-dashboard.png' });
        
        testResults.tests.push({
            name: 'Dashboard Load Performance',
            status: loadTime < 10000 ? 'PASS' : 'WARN',
            loadTime: `${loadTime}ms`,
            threshold: '10000ms',
            screenshot: 'test-dashboard.png'
        });
        
        console.log(`   ✅ Dashboard loaded in ${loadTime}ms`);
    } catch (error) {
        console.log(`   ❌ Dashboard test failed: ${error}`);
        testResults.tests.push({
            name: 'Dashboard Load Performance',
            status: 'FAIL',
            error: error.toString()
        });
    }
    
    console.log('📊 TEST 2: Issue Navigator Performance');
    try {
        const startTime = Date.now();
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        
        await page.screenshot({ path: 'test-issue-navigator.png' });
        
        testResults.tests.push({
            name: 'Issue Navigator Performance',
            status: loadTime < 15000 ? 'PASS' : 'WARN',
            loadTime: `${loadTime}ms`,
            threshold: '15000ms',
            screenshot: 'test-issue-navigator.png'
        });
        
        console.log(`   ✅ Issue Navigator loaded in ${loadTime}ms`);
    } catch (error) {
        console.log(`   ❌ Issue Navigator test failed: ${error}`);
        testResults.tests.push({
            name: 'Issue Navigator Performance',
            status: 'FAIL',
            error: error.toString()
        });
    }
    
    console.log('📊 TEST 3: ITSM Project Access');
    try {
        await page.goto('https://jirauat.smedigitalapps.com/jira/browse/ITSM', { waitUntil: 'networkidle' });
        
        const projectStatus = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || '';
            const hasError = bodyText.includes('does not exist') || bodyText.includes('not found');
            const hasProject = bodyText.includes('itsm') || document.querySelector('[data-project-key="ITSM"]');
            return { hasError, hasProject, url: window.location.href };
        });
        
        await page.screenshot({ path: 'test-itsm-project.png' });
        
        testResults.tests.push({
            name: 'ITSM Project Access',
            status: !projectStatus.hasError ? 'PASS' : 'FAIL',
            accessible: !projectStatus.hasError,
            screenshot: 'test-itsm-project.png'
        });
        
        console.log(`   ${!projectStatus.hasError ? '✅' : '❌'} ITSM Project: ${!projectStatus.hasError ? 'Accessible' : 'Not Found'}`);
    } catch (error) {
        console.log(`   ❌ ITSM test failed: ${error}`);
        testResults.tests.push({
            name: 'ITSM Project Access',
            status: 'FAIL',
            error: error.toString()
        });
    }
    
    console.log('📊 TEST 4: DPSA Project Access');
    try {
        await page.goto('https://jirauat.smedigitalapps.com/jira/browse/DPSA', { waitUntil: 'networkidle' });
        
        const projectStatus = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || '';
            const hasError = bodyText.includes('does not exist') || bodyText.includes('not found');
            const hasProject = bodyText.includes('dpsa') || document.querySelector('[data-project-key="DPSA"]');
            return { hasError, hasProject, url: window.location.href };
        });
        
        await page.screenshot({ path: 'test-dpsa-project.png' });
        
        testResults.tests.push({
            name: 'DPSA Project Access',
            status: !projectStatus.hasError ? 'PASS' : 'FAIL',
            accessible: !projectStatus.hasError,
            screenshot: 'test-dpsa-project.png'
        });
        
        console.log(`   ${!projectStatus.hasError ? '✅' : '❌'} DPSA Project: ${!projectStatus.hasError ? 'Accessible' : 'Not Found'}`);
    } catch (error) {
        console.log(`   ❌ DPSA test failed: ${error}`);
        testResults.tests.push({
            name: 'DPSA Project Access',
            status: 'FAIL',
            error: error.toString()
        });
    }
    
    console.log('📊 TEST 5: Search Functionality');
    try {
        const startTime = Date.now();
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20in%20(ITSM%2C%20DPSA)%20ORDER%20BY%20created%20DESC', { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;
        
        const searchResults = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || '';
            const hasResults = bodyText.includes('issue') || bodyText.includes('ticket') || document.querySelector('.issue-table, .navigator-results');
            const resultCount = (bodyText.match(/\d+/g) || []).length;
            return { hasResults, resultCount, url: window.location.href };
        });
        
        await page.screenshot({ path: 'test-search-results.png' });
        
        testResults.tests.push({
            name: 'Cross-Project Search',
            status: searchResults.hasResults ? 'PASS' : 'WARN',
            loadTime: `${loadTime}ms`,
            hasResults: searchResults.hasResults,
            screenshot: 'test-search-results.png'
        });
        
        console.log(`   ${searchResults.hasResults ? '✅' : '⚠️'} Search: ${searchResults.hasResults ? 'Working' : 'No results'} (${loadTime}ms)`);
    } catch (error) {
        console.log(`   ❌ Search test failed: ${error}`);
        testResults.tests.push({
            name: 'Cross-Project Search',
            status: 'FAIL',
            error: error.toString()
        });
    }
    
    // Generate beautiful report
    console.log('');
    console.log('📋 GENERATING BEAUTIFUL UNIFIED REPORT');
    console.log('================================================================================');
    
    const reportContent = generateUnifiedReport(testResults);
    const reportFilename = `JIRA-10.3-Upgrade-Test-Report-${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
    
    fs.writeFileSync(reportFilename, reportContent);
    fs.writeFileSync('latest-test-results.json', JSON.stringify(testResults, null, 2));
    
    console.log(`📄 Beautiful report generated: ${reportFilename}`);
    console.log(`📊 Raw results saved: latest-test-results.json`);
    
    const passCount = testResults.tests.filter(t => t.status === 'PASS').length;
    const totalTests = testResults.tests.length;
    
    console.log('');
    console.log('🎯 FINAL RESULTS SUMMARY');
    console.log('================================================================================');
    console.log(`✅ Passed: ${passCount}/${totalTests} tests`);
    console.log(`📊 Success Rate: ${Math.round((passCount/totalTests) * 100)}%`);
    console.log(`📁 All screenshots and reports saved for Irina`);
    console.log('');
    console.log('🎉 Comprehensive testing complete! Great work on the login! 💪');
}

function generateUnifiedReport(results: any): string {
    const timestamp = new Date().toLocaleString();
    const passCount = results.tests.filter((t: any) => t.status === 'PASS').length;
    const warnCount = results.tests.filter((t: any) => t.status === 'WARN').length;
    const failCount = results.tests.filter((t: any) => t.status === 'FAIL').length;
    const totalTests = results.tests.length;
    
    return `# JIRA 10.3 Upgrade Test Report

## 📋 Executive Summary
**Date**: ${timestamp}  
**Environment**: JIRA UAT (https://jirauat.smedigitalapps.com)  
**Test Framework**: Playwright E2E + Manual Authentication  
**Total Tests**: ${totalTests}  
**Success Rate**: ${Math.round((passCount/totalTests) * 100)}%

## 🎯 Results Overview
- ✅ **Passed**: ${passCount} tests
- ⚠️ **Warnings**: ${warnCount} tests  
- ❌ **Failed**: ${failCount} tests

## 📊 Detailed Test Results

${results.tests.map((test: any, index: number) => `
### ${index + 1}. ${test.name}
**Status**: ${test.status === 'PASS' ? '✅ PASSED' : test.status === 'WARN' ? '⚠️ WARNING' : '❌ FAILED'}  
${test.loadTime ? `**Load Time**: ${test.loadTime}` : ''}  
${test.threshold ? `**Threshold**: ${test.threshold}` : ''}  
${test.accessible !== undefined ? `**Accessible**: ${test.accessible ? 'Yes' : 'No'}` : ''}  
${test.hasResults !== undefined ? `**Has Results**: ${test.hasResults ? 'Yes' : 'No'}` : ''}  
${test.screenshot ? `**Screenshot**: ${test.screenshot}` : ''}  
${test.error ? `**Error**: ${test.error}` : ''}
`).join('')}

## 🔧 Recommendations

${failCount > 0 ? '### Critical Issues\n' + results.tests.filter((t: any) => t.status === 'FAIL').map((t: any) => `- **${t.name}**: ${t.error || 'Investigation required'}`).join('\n') + '\n' : ''}

${warnCount > 0 ? '### Performance Concerns\n' + results.tests.filter((t: any) => t.status === 'WARN').map((t: any) => `- **${t.name}**: ${t.loadTime ? `Load time (${t.loadTime}) exceeds optimal threshold` : 'Review required'}`).join('\n') + '\n' : ''}

## ✅ Next Steps
1. Review all generated screenshots for visual validation
2. Address any failed tests before production deployment
3. Monitor performance metrics in production
4. Share this report with the team for review

---
*Report generated automatically by JIRA 10.3 Upgrade Testing Suite*  
*Contact: Development Team for technical questions*
`;
}

// Run the comprehensive test
manualLoginThenComprehensiveTest().catch(console.error); 