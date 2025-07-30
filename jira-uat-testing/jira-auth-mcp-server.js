#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// JIRA Auth MCP Server - Eliminates login regressions!
class JiraAuthServer {
    constructor() {
        this.sessionPath = path.join(__dirname, 'current-session.json');
        this.jiraBaseUrl = 'https://jirauat.smedigitalapps.com';
        this.browser = null;
        this.context = null;
        this.page = null;
        
        this.server = new Server(
            {
                name: 'jira-auth-server',
                version: '1.0.0',
                description: 'JIRA Authentication Management Server - Eliminates login regressions'
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupHandlers();
    }

    setupHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'validate_jira_auth',
                        description: 'Validate current JIRA authentication status - returns detailed auth info',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                quick: {
                                    type: 'boolean',
                                    description: 'Quick validation (session check only) vs full validation (browser test)',
                                    default: true
                                }
                            }
                        }
                    },
                    {
                        name: 'refresh_jira_session',
                        description: 'Refresh JIRA session by opening browser and waiting for manual login',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                timeout: {
                                    type: 'number',
                                    description: 'Timeout in seconds to wait for manual login',
                                    default: 120
                                }
                            }
                        }
                    },
                    {
                        name: 'get_session_status',
                        description: 'Get detailed information about current session file and validity',
                        inputSchema: {
                            type: 'object',
                            properties: {}
                        }
                    },
                    {
                        name: 'test_jira_functionality',
                        description: 'Test specific JIRA functionality (dashboard, create issue, etc.)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                functionality: {
                                    type: 'string',
                                    enum: ['dashboard', 'create_issue', 'projects', 'navigator', 'all'],
                                    description: 'Which JIRA functionality to test',
                                    default: 'dashboard'
                                }
                            }
                        }
                    }
                ]
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                switch (name) {
                    case 'validate_jira_auth':
                        return await this.validateJiraAuth(args || {});
                    case 'refresh_jira_session':
                        return await this.refreshJiraSession(args || {});
                    case 'get_session_status':
                        return await this.getSessionStatus(args || {});
                    case 'test_jira_functionality':
                        return await this.testJiraFunctionality(args || {});
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `❌ Error in ${name}: ${error.message}\n\nStack: ${error.stack}`
                        }
                    ],
                    isError: true
                };
            }
        });
    }

    async validateJiraAuth(args) {
        const { quick = true } = args;
        
        console.error('🔍 Validating JIRA authentication...');
        
        const result = {
            isAuthenticated: false,
            sessionExists: false,
            sessionValid: false,
            sessionAge: null,
            lastValidated: new Date().toISOString(),
            authMethod: quick ? 'quick' : 'full',
            details: []
        };

        // Check if session file exists
        if (fs.existsSync(this.sessionPath)) {
            result.sessionExists = true;
            const stats = fs.statSync(this.sessionPath);
            result.sessionAge = Math.floor((Date.now() - stats.mtime.getTime()) / 1000 / 60); // minutes
            result.details.push(`✅ Session file exists (${result.sessionAge} minutes old)`);
        } else {
            result.details.push('❌ No session file found');
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
        }

        if (quick) {
            // Quick validation - just check session file age
            result.sessionValid = result.sessionAge < 60; // Valid if less than 1 hour old
            result.isAuthenticated = result.sessionValid;
            result.details.push(result.sessionValid ? 
                '✅ Quick validation: Session appears valid (< 1 hour old)' :
                '⚠️ Quick validation: Session may be stale (> 1 hour old)'
            );
        } else {
            // Full validation - test with browser
            try {
                await this.initializeBrowser();
                await this.page.goto(`${this.jiraBaseUrl}/jira/secure/Dashboard.jspa`, { 
                    waitUntil: 'networkidle',
                    timeout: 15000 
                });

                const url = this.page.url();
                const title = await this.page.title();

                if (url.includes('login') || title.toLowerCase().includes('login')) {
                    result.details.push('❌ Full validation: Redirected to login page');
                } else {
                    try {
                        await this.page.waitForSelector('h1:has-text("System Dashboard"), .dashboard-item, .aui-nav', { timeout: 5000 });
                        result.sessionValid = true;
                        result.isAuthenticated = true;
                        result.details.push('✅ Full validation: Dashboard accessible, auth confirmed');
                    } catch {
                        result.details.push('⚠️ Full validation: Page loaded but dashboard elements not found');
                        result.isAuthenticated = true; // Still consider authenticated if not on login
                    }
                }
            } catch (error) {
                result.details.push(`❌ Full validation failed: ${error.message}`);
            } finally {
                await this.cleanupBrowser();
            }
        }

        const statusText = result.isAuthenticated ? 
            '🎉 AUTHENTICATION SUCCESS' : 
            '💥 AUTHENTICATION FAILED';

        return {
            content: [
                {
                    type: 'text',
                    text: `${statusText}\n\n${JSON.stringify(result, null, 2)}`
                }
            ]
        };
    }

    async refreshJiraSession(args) {
        const { timeout = 120 } = args;
        
        console.error('🔄 Starting session refresh process...');
        
        try {
            await this.initializeBrowser();
            
            // Navigate to JIRA login
            await this.page.goto(`${this.jiraBaseUrl}/jira/login.jsp`, { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });

            console.error('🔑 Browser opened for manual login. Please log in manually...');
            console.error(`⏱️ Waiting up to ${timeout} seconds for login completion...`);

            // Wait for successful login (monitor for dashboard or non-login page)
            const startTime = Date.now();
            let loginDetected = false;

            while ((Date.now() - startTime) < timeout * 1000 && !loginDetected) {
                try {
                    const currentUrl = this.page.url();
                    const title = await this.page.title();

                    // Check if we're no longer on login page
                    if (!currentUrl.includes('login') && !title.toLowerCase().includes('login')) {
                        // Try to find dashboard elements
                        try {
                            await this.page.waitForSelector('h1:has-text("System Dashboard"), .dashboard-item, .aui-nav', { timeout: 2000 });
                            loginDetected = true;
                            console.error('✅ Login detected! Dashboard accessible.');
                        } catch {
                            // Still not on login page, might be authenticated
                            if (currentUrl.includes('jira')) {
                                loginDetected = true;
                                console.error('✅ Login detected! On JIRA page.');
                            }
                        }
                    }

                    if (!loginDetected) {
                        await this.page.waitForTimeout(2000); // Check every 2 seconds
                    }
                } catch (error) {
                    console.error(`⚠️ Error during login detection: ${error.message}`);
                    break;
                }
            }

            if (loginDetected) {
                // Save the session
                const storageState = await this.context.storageState();
                fs.writeFileSync(this.sessionPath, JSON.stringify(storageState, null, 2));
                console.error('💾 Session saved successfully!');

                return {
                    content: [
                        {
                            type: 'text',
                            text: `🎉 SESSION REFRESH SUCCESS!\n\n✅ Login detected and session saved\n📅 Session timestamp: ${new Date().toISOString()}\n🔒 Session file: ${this.sessionPath}`
                        }
                    ]
                };
            } else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `⏰ SESSION REFRESH TIMEOUT\n\n❌ No login detected within ${timeout} seconds\n🔧 Please ensure you complete the login process manually`
                        }
                    ]
                };
            }
        } catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `💥 SESSION REFRESH ERROR\n\n❌ Error: ${error.message}\n\nPlease try again or login manually`
                    }
                ]
            };
        } finally {
            // Don't cleanup browser - leave it open for user
            console.error('🔒 Browser kept open for additional testing...');
        }
    }

    async getSessionStatus(args) {
        const status = {
            sessionPath: this.sessionPath,
            exists: false,
            size: 0,
            lastModified: null,
            ageMinutes: null,
            isValidJson: false,
            cookieCount: 0,
            hasJiraCookies: false,
            sessionData: null
        };

        if (fs.existsSync(this.sessionPath)) {
            status.exists = true;
            const stats = fs.statSync(this.sessionPath);
            status.size = stats.size;
            status.lastModified = stats.mtime.toISOString();
            status.ageMinutes = Math.floor((Date.now() - stats.mtime.getTime()) / 1000 / 60);

            try {
                const sessionData = JSON.parse(fs.readFileSync(this.sessionPath, 'utf8'));
                status.isValidJson = true;
                status.sessionData = sessionData;
                
                if (sessionData.cookies) {
                    status.cookieCount = sessionData.cookies.length;
                    status.hasJiraCookies = sessionData.cookies.some(cookie => 
                        cookie.domain && cookie.domain.includes('jira') || 
                        cookie.name && (cookie.name.includes('JSESSION') || cookie.name.includes('atlassian'))
                    );
                }
            } catch (error) {
                status.parseError = error.message;
            }
        }

        return {
            content: [
                {
                    type: 'text',
                    text: `📊 SESSION STATUS REPORT\n\n${JSON.stringify(status, null, 2)}`
                }
            ]
        };
    }

    async testJiraFunctionality(args) {
        const { functionality = 'dashboard' } = args;
        
        const results = {
            functionality,
            timestamp: new Date().toISOString(),
            tests: [],
            overallSuccess: false
        };

        try {
            await this.initializeBrowser();

            if (functionality === 'all' || functionality === 'dashboard') {
                results.tests.push(await this.testDashboard());
            }
            if (functionality === 'all' || functionality === 'create_issue') {
                results.tests.push(await this.testCreateIssue());
            }
            if (functionality === 'all' || functionality === 'projects') {
                results.tests.push(await this.testProjects());
            }
            if (functionality === 'all' || functionality === 'navigator') {
                results.tests.push(await this.testNavigator());
            }

            results.overallSuccess = results.tests.every(test => test.success);

        } catch (error) {
            results.tests.push({
                name: 'Browser Setup',
                success: false,
                error: error.message
            });
        } finally {
            await this.cleanupBrowser();
        }

        const statusEmoji = results.overallSuccess ? '🎉' : '💥';
        const passedCount = results.tests.filter(t => t.success).length;
        const totalCount = results.tests.length;

        return {
            content: [
                {
                    type: 'text',
                    text: `${statusEmoji} JIRA FUNCTIONALITY TEST RESULTS\n\n📊 Overall: ${passedCount}/${totalCount} tests passed\n\n${JSON.stringify(results, null, 2)}`
                }
            ]
        };
    }

    async testDashboard() {
        try {
            await this.page.goto(`${this.jiraBaseUrl}/jira/secure/Dashboard.jspa`, { waitUntil: 'networkidle' });
            await this.page.waitForSelector('h1:has-text("System Dashboard"), .dashboard-item', { timeout: 8000 });
            return { name: 'Dashboard Access', success: true };
        } catch (error) {
            return { name: 'Dashboard Access', success: false, error: error.message };
        }
    }

    async testCreateIssue() {
        try {
            await this.page.goto(`${this.jiraBaseUrl}/jira/secure/CreateIssue.jspa`, { waitUntil: 'networkidle' });
            await this.page.waitForSelector('#project-field, .create-issue-dialog, h1:has-text("Create Issue")', { timeout: 8000 });
            return { name: 'Create Issue Access', success: true };
        } catch (error) {
            return { name: 'Create Issue Access', success: false, error: error.message };
        }
    }

    async testProjects() {
        try {
            await this.page.goto(`${this.jiraBaseUrl}/jira/secure/BrowseProjects.jspa`, { waitUntil: 'networkidle' });
            await this.page.waitForSelector('.projects-list, .project-list, h1:has-text("Projects")', { timeout: 8000 });
            return { name: 'Projects Browse', success: true };
        } catch (error) {
            return { name: 'Projects Browse', success: false, error: error.message };
        }
    }

    async testNavigator() {
        try {
            await this.page.goto(`${this.jiraBaseUrl}/jira/secure/IssueNavigator.jspa`, { waitUntil: 'networkidle' });
            const title = await this.page.title();
            const success = !title.toLowerCase().includes('login') && !title.toLowerCase().includes('error');
            return { name: 'Issue Navigator', success };
        } catch (error) {
            return { name: 'Issue Navigator', success: false, error: error.message };
        }
    }

    async initializeBrowser() {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: false });
        }

        if (fs.existsSync(this.sessionPath)) {
            this.context = await this.browser.newContext({
                storageState: this.sessionPath
            });
        } else {
            this.context = await this.browser.newContext();
        }

        this.page = await this.context.newPage();
    }

    async cleanupBrowser() {
        if (this.page) {
            await this.page.close();
            this.page = null;
        }
        if (this.context) {
            await this.context.close();
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('🔥 JIRA Auth MCP Server is running! Ready to eliminate login regressions!');
    }
}

// Start the server
const authServer = new JiraAuthServer();
authServer.run().catch(console.error); 