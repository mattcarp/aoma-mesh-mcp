const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAllTestsInExistingSession() {
    console.log('\n🔥 RUNNING ALL FUCKING TESTS WITH EXISTING SESSION!');
    console.log('===============================================');
    console.log('🔒 Using saved session - NO new logins needed');
    console.log('❌ NOT opening hundreds of new browsers\n');

    let browser;
    let context;
    let page;
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    const results = [];

    try {
        // Launch single browser instance
        browser = await chromium.launch({ 
            headless: false,
            args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        });

        // Create context with saved session
        const sessionPath = path.join(__dirname, 'current-session.json');
        if (!fs.existsSync(sessionPath)) {
            throw new Error(`Session file not found: ${sessionPath}`);
        }

        context = await browser.newContext({
            storageState: sessionPath,
            viewport: { width: 1920, height: 1080 }
        });

        page = await context.newPage();

        // Test 1: Dashboard Access
        await runTest('Dashboard Access', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { waitUntil: 'networkidle' });
            await page.waitForSelector('h1:has-text("System Dashboard")', { timeout: 10000 });
            return true;
        });

        // Test 2: User Profile Access  
        await runTest('User Profile Access', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa', { waitUntil: 'networkidle' });
            await page.waitForSelector('.user-profile, h1:has-text("User Profile")', { timeout: 10000 });
            return true;
        });

        // Test 3: Issue Creation Access
        await runTest('Issue Creation Access', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa', { waitUntil: 'networkidle' });
            await page.waitForSelector('#project-field, .create-issue-dialog, h1:has-text("Create Issue")', { timeout: 10000 });
            return true;
        });

        // Test 4: Issue Navigator
        await runTest('Issue Navigator', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa', { waitUntil: 'networkidle' });
            await page.waitForSelector('.navigator-content, .issue-navigator, h1:has-text("Issue Navigator")', { timeout: 10000 });
            return true;
        });

        // Test 5: Search Issues
        await runTest('Search Issues', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/issues/', { waitUntil: 'networkidle' });
            const url = page.url();
            return url.includes('jira') && !url.includes('login');
        });

        // Test 6: Project Browse
        await runTest('Project Browse', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa', { waitUntil: 'networkidle' });
            await page.waitForSelector('.projects-list, .project-list, h1:has-text("Projects")', { timeout: 10000 });
            return true;
        });

        // Test 7: Admin Section (if accessible)
        await runTest('Admin Section Access', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/admin/AdminSummary.jspa', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        // Test 8: Reports Section
        await runTest('Reports Section', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ConfigureReport.jspa', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        // Test 9: Filters & Dashboards
        await runTest('Filters Section', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ManageFilters.jspa', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        // Test 10: System Info (if accessible)
        await runTest('System Info', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/admin/ViewSystemInfo.jspa', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        // Test 11: Create Issue Form Interaction
        await runTest('Create Issue Form Interaction', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa', { waitUntil: 'networkidle' });
            
            // Try to interact with project field
            const projectField = await page.locator('#project-field, input[name="pid"]').first();
            if (await projectField.isVisible()) {
                await projectField.click();
                return true;
            }
            
            // Alternative: look for any form elements
            const formElements = await page.locator('input, select, textarea').count();
            return formElements > 0;
        });

        // Test 12: Search Functionality
        await runTest('Search Functionality', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { waitUntil: 'networkidle' });
            
            // Look for search box
            const searchBox = await page.locator('#quickSearchInput, input[name="query"], .search-input').first();
            if (await searchBox.isVisible()) {
                await searchBox.fill('test');
                return true;
            }
            return false;
        });

        // Test 13: My Open Issues
        await runTest('My Open Issues', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa?reset=true&jqlQuery=assignee+%3D+currentUser%28%29+AND+resolution+%3D+Unresolved+order+by+updated+DESC', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        // Test 14: Recently Created Issues
        await runTest('Recently Created Issues', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa?reset=true&jqlQuery=created+%3E%3D+-7d+order+by+created+DESC', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        // Test 15: Version Management (if accessible)
        await runTest('Version Management', async () => {
            await page.goto('https://jirauat.smedigitalapps.com/jira/plugins/servlet/project-config/TST/versions', { waitUntil: 'networkidle' });
            const title = await page.title();
            return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
        });

        console.log('\n🎯 FINAL TEST RESULTS');
        console.log('=====================');
        console.log(`Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`📊 Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (failedTests === 0) {
            console.log('\n🎉 FUCK YEAH! ALL TESTS PASSED! 🎉');
        } else {
            console.log('\n💔 Some tests failed:');
            results.filter(r => !r.passed).forEach(r => {
                console.log(`   ❌ ${r.name}: ${r.error}`);
            });
        }

        console.log('\n🔒 Keeping browser open for further testing...');
        console.log('📢 Ready for more commands!');

    } catch (error) {
        console.error(`\n💥 CRITICAL FAILURE: ${error.message}`);
        if (browser) {
            await browser.close();
        }
        process.exit(1);
    }

    async function runTest(testName, testFunction) {
        totalTests++;
        console.log(`\n🧪 Test ${totalTests}: ${testName}`);
        
        try {
            const result = await testFunction();
            if (result) {
                passedTests++;
                console.log(`✅ PASSED: ${testName}`);
                results.push({ name: testName, passed: true });
            } else {
                failedTests++;
                console.log(`❌ FAILED: ${testName} (returned false)`);
                results.push({ name: testName, passed: false, error: 'Test returned false' });
            }
        } catch (error) {
            failedTests++;
            console.log(`❌ FAILED: ${testName} - ${error.message}`);
            results.push({ name: testName, passed: false, error: error.message });
        }
    }
}

runAllTestsInExistingSession(); 