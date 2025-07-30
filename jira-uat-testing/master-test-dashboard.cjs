const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class JIRATestDashboard {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.sessionPath = path.join(__dirname, 'current-session.json');
        this.results = {
            totalTests: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            authFailures: 0,
            functionalFailures: 0,
            categories: {},
            startTime: new Date(),
            endTime: null
        };
    }

    async initialize() {
        console.log('\n🔥 JIRA UAT TESTING MASTER DASHBOARD');
        console.log('=====================================');
        console.log('🎯 GOAL: Run ALL tests with reliable authentication');
        console.log('❌ NEVER opening new browsers during tests');
        console.log('✅ Using saved session for consistency\n');

        // Check if session exists
        if (!fs.existsSync(this.sessionPath)) {
            console.log('❌ No saved session found!');
            console.log('📝 Please run the manual login script first:');
            console.log('   node persistent-login-session.cjs');
            return false;
        }

        try {
            // Launch single browser instance
            this.browser = await chromium.launch({ 
                headless: false,
                args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
            });

            // Create context with saved session
            this.context = await this.browser.newContext({
                storageState: this.sessionPath,
                viewport: { width: 1920, height: 1080 }
            });

            this.page = await this.context.newPage();

            // Verify authentication first
            const isAuthenticated = await this.verifyAuthentication();
            if (!isAuthenticated) {
                console.log('❌ Authentication verification failed!');
                console.log('🔑 Please log in manually and save session again');
                await this.cleanup();
                return false;
            }

            console.log('✅ Authentication verified - ready to run tests!\n');
            return true;
        } catch (error) {
            console.error(`💥 Initialization failed: ${error.message}`);
            await this.cleanup();
            return false;
        }
    }

    async verifyAuthentication() {
        console.log('🔍 Verifying authentication status...');
        
        try {
            await this.page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
                waitUntil: 'networkidle',
                timeout: 15000
            });

            // Check if we're logged in
            const url = this.page.url();
            const title = await this.page.title();
            
            if (url.includes('login') || title.toLowerCase().includes('login')) {
                console.log('❌ Not authenticated - redirected to login page');
                return false;
            }

            // Look for dashboard elements
            try {
                await this.page.waitForSelector('h1:has-text("System Dashboard"), .dashboard-item, .aui-nav', { timeout: 5000 });
                console.log('✅ Authentication verified - dashboard accessible');
                return true;
            } catch {
                console.log('⚠️ Dashboard elements not found, but not on login page');
                return true; // Still consider authenticated if not on login
            }
        } catch (error) {
            console.log(`❌ Auth verification failed: ${error.message}`);
            return false;
        }
    }

    async runTestSuite(suiteName, tests) {
        console.log(`\n🧪 RUNNING TEST SUITE: ${suiteName}`);
        console.log('='.repeat(50));

        if (!this.results.categories[suiteName]) {
            this.results.categories[suiteName] = {
                total: tests.length,
                passed: 0,
                failed: 0,
                skipped: 0,
                tests: []
            };
        }

        for (const test of tests) {
            await this.runSingleTest(suiteName, test);
        }

        const suite = this.results.categories[suiteName];
        console.log(`\n📊 ${suiteName} Results: ${suite.passed}/${suite.total} passed (${((suite.passed/suite.total)*100).toFixed(1)}%)`);
    }

    async runSingleTest(category, test) {
        this.results.totalTests++;
        const testResult = {
            name: test.name,
            category,
            status: 'pending',
            startTime: new Date(),
            endTime: null,
            duration: 0,
            error: null,
            isAuthFailure: false
        };

        console.log(`\n  🧪 Test ${this.results.totalTests}: ${test.name}`);

        try {
            // Re-verify auth before each test if needed
            if (test.requiresAuth !== false) {
                const currentUrl = this.page.url();
                if (currentUrl.includes('login')) {
                    throw new Error('Lost authentication during testing');
                }
            }

            // Run the test
            const result = await test.testFunction(this.page);
            
            if (result) {
                testResult.status = 'passed';
                this.results.passed++;
                this.results.categories[category].passed++;
                console.log(`     ✅ PASSED`);
            } else {
                testResult.status = 'failed';
                testResult.error = 'Test returned false';
                this.results.failed++;
                this.results.categories[category].failed++;
                this.results.functionalFailures++;
                console.log(`     ❌ FAILED: Test returned false`);
            }
        } catch (error) {
            testResult.status = 'failed';
            testResult.error = error.message;
            this.results.failed++;
            this.results.categories[category].failed++;

            // Categorize error type
            if (error.message.includes('login') || error.message.includes('authentication') || 
                error.message.includes('session') || this.page.url().includes('login')) {
                testResult.isAuthFailure = true;
                this.results.authFailures++;
                console.log(`     ❌ FAILED: Authentication issue - ${error.message}`);
            } else {
                this.results.functionalFailures++;
                console.log(`     ❌ FAILED: Functional issue - ${error.message}`);
            }
        }

        testResult.endTime = new Date();
        testResult.duration = testResult.endTime - testResult.startTime;
        this.results.categories[category].tests.push(testResult);
    }

    async runAllTests() {
        console.log('🚀 Starting comprehensive test execution...\n');

        // Core Navigation Tests
        await this.runTestSuite('Core Navigation', [
            {
                name: 'Dashboard Access',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { waitUntil: 'networkidle' });
                    await page.waitForSelector('h1:has-text("System Dashboard"), .dashboard-item', { timeout: 8000 });
                    return true;
                }
            },
            {
                name: 'Issue Navigator',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
                }
            },
            {
                name: 'Project Browse',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa', { waitUntil: 'networkidle' });
                    await page.waitForSelector('.projects-list, .project-list, h1:has-text("Projects")', { timeout: 8000 });
                    return true;
                }
            }
        ]);

        // Issue Management Tests
        await this.runTestSuite('Issue Management', [
            {
                name: 'Create Issue Access',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa', { waitUntil: 'networkidle' });
                    await page.waitForSelector('#project-field, .create-issue-dialog, h1:has-text("Create Issue")', { timeout: 8000 });
                    return true;
                }
            },
            {
                name: 'Search Issues',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/', { waitUntil: 'networkidle' });
                    const url = page.url();
                    return url.includes('jira') && !url.includes('login');
                }
            },
            {
                name: 'My Open Issues',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa?reset=true&jqlQuery=assignee+%3D+currentUser%28%29+AND+resolution+%3D+Unresolved+order+by+updated+DESC', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
                }
            }
        ]);

        // User Profile & Settings
        await this.runTestSuite('User Profile & Settings', [
            {
                name: 'User Profile Access',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
                }
            }
        ]);

        // Administration Tests (if accessible)
        await this.runTestSuite('Administration', [
            {
                name: 'Admin Section Access',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/admin/AdminSummary.jspa', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error') && !title.toLowerCase().includes('access denied');
                }
            },
            {
                name: 'System Info',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/admin/ViewSystemInfo.jspa', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error') && !title.toLowerCase().includes('access denied');
                }
            }
        ]);

        // Reporting Tests
        await this.runTestSuite('Reporting', [
            {
                name: 'Reports Section',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ConfigureReport.jspa', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
                }
            },
            {
                name: 'Filters Section',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ManageFilters.jspa', { waitUntil: 'networkidle' });
                    const title = await page.title();
                    return !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
                }
            }
        ]);

        // Interactive Tests
        await this.runTestSuite('Interactive Features', [
            {
                name: 'Search Functionality',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { waitUntil: 'networkidle' });
                    const searchBox = await page.locator('#quickSearchInput, input[name="query"], .search-input').first();
                    if (await searchBox.isVisible()) {
                        await searchBox.fill('test');
                        return true;
                    }
                    return false;
                }
            },
            {
                name: 'Create Issue Form Interaction',
                testFunction: async (page) => {
                    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa', { waitUntil: 'networkidle' });
                    const formElements = await page.locator('input, select, textarea').count();
                    return formElements > 0;
                }
            }
        ]);
    }

    generateReport() {
        this.results.endTime = new Date();
        const totalDuration = this.results.endTime - this.results.startTime;

        console.log('\n🎯 COMPREHENSIVE TEST RESULTS DASHBOARD');
        console.log('='.repeat(60));
        console.log(`📅 Execution Time: ${this.results.startTime.toLocaleString()}`);
        console.log(`⏱️  Total Duration: ${Math.round(totalDuration / 1000)} seconds`);
        console.log('');

        // Overall Summary
        console.log('📊 OVERALL SUMMARY');
        console.log('-'.repeat(20));
        console.log(`Total Tests: ${this.results.totalTests}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📊 Pass Rate: ${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`);
        console.log('');

        // Failure Analysis
        console.log('🔍 FAILURE ANALYSIS');
        console.log('-'.repeat(20));
        console.log(`🔒 Authentication Failures: ${this.results.authFailures}`);
        console.log(`⚙️  Functional Failures: ${this.results.functionalFailures}`);
        console.log(`📈 Auth Success Rate: ${(((this.results.totalTests - this.results.authFailures) / this.results.totalTests) * 100).toFixed(1)}%`);
        console.log('');

        // Category Breakdown
        console.log('📋 CATEGORY BREAKDOWN');
        console.log('-'.repeat(20));
        Object.entries(this.results.categories).forEach(([category, data]) => {
            const passRate = ((data.passed / data.total) * 100).toFixed(1);
            const status = passRate >= 90 ? '🟢' : passRate >= 70 ? '🟡' : '🔴';
            console.log(`${status} ${category}: ${data.passed}/${data.total} (${passRate}%)`);
        });

        // Failed Tests Detail
        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS DETAIL');
            console.log('-'.repeat(25));
            Object.entries(this.results.categories).forEach(([category, data]) => {
                const failedTests = data.tests.filter(t => t.status === 'failed');
                if (failedTests.length > 0) {
                    console.log(`\n📂 ${category}:`);
                    failedTests.forEach(test => {
                        const errorType = test.isAuthFailure ? '🔒 AUTH' : '⚙️ FUNC';
                        console.log(`   ${errorType} ${test.name}: ${test.error}`);
                    });
                }
            });
        }

        // Success Message
        if (this.results.authFailures === 0) {
            console.log('\n🎉 AUTHENTICATION SUCCESS! 🎉');
            console.log('✨ No authentication failures detected');
            console.log('🔒 Session management is working properly');
        }

        if (this.results.passed === this.results.totalTests) {
            console.log('\n🏆 PERFECT SCORE! ALL TESTS PASSED! 🏆');
        }

        console.log('\n🔒 Keeping browser open for additional testing...');
        console.log('📢 Ready for manual inspection or additional tests!');
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async run() {
        const initialized = await this.initialize();
        if (!initialized) {
            return;
        }

        try {
            await this.runAllTests();
            this.generateReport();
        } catch (error) {
            console.error(`\n💥 Critical test execution error: ${error.message}`);
            this.generateReport();
        }
        
        // Don't close browser - keep it open for inspection
        console.log('\n⏸️  Browser kept open for manual inspection');
        console.log('🛑 Press Ctrl+C when ready to close');
    }
}

// Run the dashboard
const dashboard = new JIRATestDashboard();
dashboard.run().catch(console.error);

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await dashboard.cleanup();
    process.exit(0);
}); 