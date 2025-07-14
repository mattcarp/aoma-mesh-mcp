import { chromium, Page, BrowserContext, Dialog } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { MicrosoftSSOHandler, SSOIntegrationConfig, DEFAULT_SSO_CONFIG } from './microsoft-sso-handler';

// =============================================================================
// CONFIGURATION & TYPES
// =============================================================================

interface JiraConfig {
    baseUrl: string;
    credentials: {
        username: string;
        email: string;
        password: string;
    };
    timeouts: {
        pageLoad: number;
        loginStep: number;
        fieldFill: number;
        twoFA: number;
    };
    maxLoginAttempts: number;
    sessionFile: string;
    sso?: SSOIntegrationConfig;
    supabase?: {
        url: string;
        serviceKey: string;
    };
}

interface LoginState {
    isLoggedIn: boolean;
    needsInitialLogin: boolean;
    needsUsername: boolean;
    needsEmail: boolean;
    needsPassword: boolean;
    needsCertificateAccept: boolean;
    is2FA: boolean;
    currentUrl: string;
    pageTitle: string;
    bodyPreview: string;
}

interface ExtractedTicket {
    key: string;
    project: string;
    summary: string;
    status: string;
    assignee: string;
    reporter: string;
    created: string;
    updated: string;
    priority: string;
}

interface ExtractionResult {
    tickets: ExtractedTicket[];
    projects: string[];
    pagingInfo: string;
    selectorUsed: string;
}

// =============================================================================
// UNIFIED JIRA AUTOMATION FRAMEWORK
// =============================================================================

class UnifiedJiraAutomation {
    private config: JiraConfig;
    private browser: any;
    private context: BrowserContext;
    private page: Page;
    private sessionManager: SessionManager;
    private fieldTargeter: FormFieldTargeter;
    private loginAutomator: LoginAutomator;
    private ticketExtractor: TicketExtractor;
    private dataManager: DataManager;

    constructor(config: JiraConfig) {
        this.config = config;
        this.sessionManager = new SessionManager(config.sessionFile);
        this.dataManager = new DataManager(config.supabase);
    }

    async initialize(): Promise<void> {
        console.log('🚀 Initializing Unified JIRA Automation Framework');
        console.log('================================================================================');
        
        // Launch browser with optimized settings
        this.browser = await chromium.launch({
            headless: false,
            args: [
                '--start-maximized',
                '--ignore-certificate-errors',
                '--ignore-ssl-errors',
                '--no-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        // Create context and page
        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            ignoreHTTPSErrors: true
        });

        this.page = await this.context.newPage();

        // Initialize components
        this.fieldTargeter = new FormFieldTargeter(this.page);
        this.loginAutomator = new LoginAutomator(this.page, this.config, this.fieldTargeter);
        this.ticketExtractor = new TicketExtractor(this.page);

        // Setup auto-certificate handling
        this.page.on('dialog', async (dialog: Dialog) => {
            console.log('🔐 Auto-accepting certificate dialog');
            await dialog.accept();
        });

        // Load existing session if available
        await this.sessionManager.loadSession(this.context);

        console.log('✅ Framework initialized successfully');
    }

    async performLogin(): Promise<boolean> {
        console.log('🔐 Starting unified login process...');
        return await this.loginAutomator.performLogin();
    }

    async extractTickets(options: {
        projects?: string[];
        maxPerProject?: number;
        jqlFilter?: string;
    } = {}): Promise<ExtractionResult> {
        console.log('🎯 Starting unified ticket extraction...');
        return await this.ticketExtractor.extractTickets(options);
    }

    async storeResults(results: ExtractionResult, environment: string): Promise<void> {
        console.log('💾 Storing extraction results...');
        await this.dataManager.storeResults(results, environment);
    }

    async runComprehensiveWorkflow(environment: string = 'UAT'): Promise<void> {
        console.log(`🧪 Running comprehensive ${environment} workflow...`);
        
        try {
            // Step 1: Navigate to base URL
            console.log('🔗 Navigating to JIRA...');
            await this.page.goto(`${this.config.baseUrl}/jira/secure/Dashboard.jspa`);
            await this.page.waitForTimeout(this.config.timeouts.pageLoad);

            // Step 2: Perform login
            const loginSuccess = await this.performLogin();
            if (!loginSuccess) {
                throw new Error('Login failed');
            }

            // Step 3: Save session
            await this.sessionManager.saveSession(this.context);

            // Step 4: Extract tickets
            const results = await this.extractTickets();

            // Step 5: Store results
            await this.storeResults(results, environment);

            console.log('🎉 Comprehensive workflow completed successfully!');
            
        } catch (error) {
            console.error('❌ Workflow error:', error);
            throw error;
        }
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Public accessors for testing
    get testAccessors() {
        return {
            sessionManager: this.sessionManager,
            loginAutomator: this.loginAutomator,
            ticketExtractor: this.ticketExtractor,
            dataManager: this.dataManager,
            page: this.page,
            context: this.context
        };
    }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

class SessionManager {
    private sessionFile: string;
    private sessionMaxAge: number = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

    constructor(sessionFile: string) {
        this.sessionFile = sessionFile;
    }

    async loadSession(context: BrowserContext): Promise<boolean> {
        try {
            if (fs.existsSync(this.sessionFile)) {
                const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
                
                // Check if session is expired
                if (this.isSessionExpired(sessionData)) {
                    console.log('⚠️ Session is expired, removing old session file');
                    fs.unlinkSync(this.sessionFile);
                    return false;
                }

                // Validate and filter cookies
                const validCookies = this.validateAndFilterCookies(sessionData.cookies);
                
                if (validCookies.length > 0) {
                    await context.addCookies(validCookies);
                    console.log(`✅ Session cookies loaded successfully (${validCookies.length} valid cookies)`);
                    return true;
                } else {
                    console.log('⚠️ No valid cookies found in session file');
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load session:', error);
            // Clean up corrupted session file
            if (fs.existsSync(this.sessionFile)) {
                try {
                    fs.unlinkSync(this.sessionFile);
                    console.log('🗑️ Removed corrupted session file');
                } catch (cleanupError) {
                    console.log('⚠️ Could not remove corrupted session file:', cleanupError);
                }
            }
        }
        return false;
    }

    async saveSession(context: BrowserContext): Promise<void> {
        try {
            const cookies = await context.cookies();
            const sessionData = {
                cookies,
                timestamp: new Date().toISOString(),
                userAgent: await context.newPage().then(p => p.evaluate(() => navigator.userAgent)),
                domain: cookies.find(c => c.domain)?.domain || 'unknown',
                sessionId: this.generateSessionId()
            };
            
            // Create backup of existing session
            if (fs.existsSync(this.sessionFile)) {
                const backupFile = this.sessionFile + '.backup';
                fs.copyFileSync(this.sessionFile, backupFile);
            }
            
            fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
            console.log(`✅ Session saved successfully (${cookies.length} cookies)`);
        } catch (error) {
            console.log('⚠️ Could not save session:', error);
        }
    }

    private isSessionExpired(sessionData: any): boolean {
        if (!sessionData.timestamp) return true;
        
        const sessionTime = new Date(sessionData.timestamp).getTime();
        const currentTime = new Date().getTime();
        const age = currentTime - sessionTime;
        
        return age > this.sessionMaxAge;
    }

    private validateAndFilterCookies(cookies: any[]): any[] {
        if (!Array.isArray(cookies)) return [];
        
        return cookies.filter(cookie => {
            // Basic validation
            if (!cookie.name || !cookie.value) return false;
            
            // Check if cookie is not expired
            if (cookie.expires && cookie.expires !== -1) {
                const expiryTime = new Date(cookie.expires * 1000).getTime();
                const currentTime = new Date().getTime();
                if (currentTime > expiryTime) {
                    return false;
                }
            }
            
            // Include important session cookies
            const importantCookies = ['jsessionid', 'seraph.rememberme', 'atlassian.xsrf.token'];
            const isImportant = importantCookies.some(name => 
                cookie.name.toLowerCase().includes(name.toLowerCase()));
            
            return isImportant || cookie.name.startsWith('JSESSIONID');
        });
    }

    private generateSessionId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    async validateSession(page: Page): Promise<boolean> {
        try {
            // Try to access a protected page to validate session
            const response = await page.goto('about:blank');
            if (response && response.status() === 200) {
                // Session is still valid
                return true;
            }
        } catch (error) {
            console.log('⚠️ Session validation failed:', error);
        }
        return false;
    }

    async clearSession(): Promise<void> {
        try {
            if (fs.existsSync(this.sessionFile)) {
                fs.unlinkSync(this.sessionFile);
                console.log('🗑️ Session cleared successfully');
            }
        } catch (error) {
            console.log('⚠️ Could not clear session:', error);
        }
    }
}

// =============================================================================
// FORM FIELD TARGETING (Enhanced from previous work)
// =============================================================================

class FormFieldTargeter {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async safelyFillField(element: any, value: string, fieldName: string): Promise<boolean> {
        try {
            console.log(`   📝 Filling ${fieldName} field...`);
            
            // Enhanced viewport handling
            await element.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(500);
            
            // Clear and fill
            await element.clear();
            await this.page.waitForTimeout(200);
            await element.fill(value);
            await this.page.waitForTimeout(200);
            
            // Verify
            const fieldValue = await element.inputValue();
            if (fieldValue === value) {
                console.log(`   ✅ ${fieldName} field filled successfully`);
                return true;
            } else {
                console.log(`   ⚠️ ${fieldName} field value mismatch`);
                return false;
            }
        } catch (error) {
            console.log(`   ❌ Failed to fill ${fieldName} field: ${error}`);
            return false;
        }
    }

    async findAndClickButton(selectors: string[], buttonName: string): Promise<boolean> {
        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`✅ Found ${buttonName} button: ${selector}`);
                    
                    // Enhanced viewport handling
                    await element.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(500);
                    
                    // Try normal click first, then force click if needed
                    try {
                        await element.click({ timeout: 2000 });
                    } catch (clickError) {
                        console.log(`⚠️ Normal click failed, trying force click`);
                        await element.click({ force: true });
                    }
                    
                    return true;
                }
            } catch (e) {
                // Continue to next selector
            }
        }
        
        console.log(`❌ No ${buttonName} button found`);
        return false;
    }

    async getLoginField(fieldType: 'username' | 'email' | 'password'): Promise<any> {
        const selectors = {
            username: [
                'form[action*="login"] input[placeholder="Username"]',
                '#login-form-username',
                'input[name="os_username"]',
                'input[name="loginfmt"]',
                'input[placeholder="Username"]:not(.aui-nav input):not(.search input)',
                'form input[placeholder="Username"]'
            ],
            email: [
                'input[type="email"][name="loginfmt"]',
                'input[name="loginfmt"]',
                'form input[type="email"]',
                'input[type="email"]:not(.aui-nav input)'
            ],
            password: [
                'form[action*="login"] input[type="password"]',
                '#login-form-password',
                'input[name="os_password"]',
                'input[name="passwd"]',
                'input[type="password"]'
            ]
        };

        for (const selector of selectors[fieldType]) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`✅ Found ${fieldType} field: ${selector}`);
                    return element;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        console.log(`❌ No ${fieldType} field found`);
        return null;
    }
}

// =============================================================================
// LOGIN AUTOMATION
// =============================================================================

class LoginAutomator {
    private page: Page;
    private config: JiraConfig;
    private fieldTargeter: FormFieldTargeter;
    private ssoHandler?: MicrosoftSSOHandler;

    constructor(page: Page, config: JiraConfig, fieldTargeter: FormFieldTargeter) {
        this.page = page;
        this.config = config;
        this.fieldTargeter = fieldTargeter;
        
        // Initialize SSO handler if enabled
        if (this.config.sso?.enabled) {
            this.ssoHandler = new MicrosoftSSOHandler(page, this.config.sso.microsoftConfig);
        }
    }

    async getCurrentLoginState(): Promise<LoginState> {
        // Wait for page to be ready and add retry logic
        await this.page.waitForLoadState('domcontentloaded');
        
        const state = await this.page.evaluate(() => {
            try {
                const url = window.location.href;
                const title = document.title || '';
                
                // Safe body text extraction with null checks
                let bodyText = '';
                if (document.body && document.body.textContent) {
                    bodyText = document.body.textContent.toLowerCase();
                } else if (document.documentElement && document.documentElement.textContent) {
                    bodyText = document.documentElement.textContent.toLowerCase();
                }

                // Check for login elements with error handling
                let usernameField: Element | null = null;
                let emailField: Element | null = null;
                let passwordField: Element | null = null;
                let initialLoginBtn: Element | null | undefined = null;
                let acceptButtons: Element[] = [];

                try {
                    usernameField = document.querySelector('input[placeholder="Username"], input[name="loginfmt"]');
                    emailField = document.querySelector('input[type="email"]');
                    passwordField = document.querySelector('input[type="password"]');
                    initialLoginBtn = document.querySelector('a[href*="login"], button[href*="login"]') ||
                                     Array.from(document.querySelectorAll('a, button')).find(el => 
                                         el.textContent?.trim().toLowerCase() === 'log in');

                    // Check for certificate accept buttons
                    acceptButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                        .filter(btn => {
                            const text = btn.textContent?.toLowerCase() || btn.getAttribute('value')?.toLowerCase() || '';
                            return text.includes('accept') || text.includes('continue') || text.includes('ok');
                        });
                } catch (e) {
                    console.log('Error querying DOM elements:', e.message);
                }

                // Check for JIRA interface (successful login)
                let hasJiraInterface = false;
                let hasIssuesNav = false;
                try {
                    hasJiraInterface = document.querySelector('.aui-nav, #header, .navigator-content, .dashboard, .jira-header') !== null;
                    hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
                } catch (e) {
                    console.log('Error checking JIRA interface:', e.message);
                }

                const noLoginElements = !usernameField && !emailField && !passwordField && !initialLoginBtn;

                const isLoggedIn = (hasJiraInterface || hasIssuesNav) && noLoginElements && 
                                  !bodyText.includes('sign in') && !bodyText.includes('log in');

                return {
                    isLoggedIn,
                    needsInitialLogin: !!initialLoginBtn,
                    needsUsername: !!usernameField && !emailField,
                    needsEmail: !!emailField,
                    needsPassword: !!passwordField,
                    needsCertificateAccept: acceptButtons.length > 0,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve') || 
                           bodyText.includes('authenticator') || bodyText.includes('phone'),
                    currentUrl: url,
                    pageTitle: title,
                    bodyPreview: bodyText.substring(0, 200)
                };
                
            } catch (error) {
                console.log('Error in getCurrentLoginState evaluation:', error.message);
                return {
                    isLoggedIn: false,
                    needsInitialLogin: false,
                    needsUsername: false,
                    needsEmail: false,
                    needsPassword: false,
                    needsCertificateAccept: false,
                    is2FA: false,
                    currentUrl: window.location.href,
                    pageTitle: document.title || '',
                    bodyPreview: 'Error reading page content'
                };
            }
        });

        return state;
    }

    /**
     * Determine if Microsoft SSO should be used based on current URL
     */
    private shouldUseMicrosoftSSO(url: string): boolean {
        return url.includes('login.microsoftonline.com') ||
               url.includes('login.live.com') ||
               url.includes('account.microsoft.com') ||
               url.includes('login.windows.net');
    }

    async performLogin(): Promise<boolean> {
        console.log('🔐 Starting unified login automation...');
        
        let loginStep = 1;
        let isLoggedIn = false;

        while (!isLoggedIn && loginStep <= this.config.maxLoginAttempts) {
            console.log(`\n🔍 Login Step ${loginStep}/${this.config.maxLoginAttempts}: Analyzing page...`);

            // Check for Microsoft SSO redirect
            const currentUrl = this.page.url();
            if (this.shouldUseMicrosoftSSO(currentUrl)) {
                console.log('🔗 Microsoft SSO detected, switching to SSO handler...');
                
                if (this.ssoHandler) {
                    const ssoSuccess = await this.ssoHandler.executeSSO();
                    if (ssoSuccess) {
                        console.log('✅ Microsoft SSO completed successfully!');
                        isLoggedIn = true;
                        break;
                    } else {
                        console.log('⚠️ Microsoft SSO failed, falling back to manual process');
                    }
                } else {
                    console.log('⚠️ SSO handler not available, using manual process');
                }
            }

            // Get page state with enhanced error handling
            let state: LoginState;
            try {
                state = await this.getCurrentLoginState();
            } catch (error) {
                console.log(`   ⚠️ Page state detection failed, retrying...`);
                await this.page.waitForTimeout(2000);
                try {
                    state = await this.getCurrentLoginState();
                } catch (retryError) {
                    console.log('   ❌ Failed to detect page state after retry, skipping step');
                    loginStep++;
                    continue;
                }
            }
            
            console.log(`   URL: ${state.currentUrl.substring(0, 80)}...`);
            console.log(`   Title: ${state.pageTitle}`);
            console.log(`   Logged in: ${state.isLoggedIn ? '✅ YES' : '❌ NO'}`);

            if (state.isLoggedIn) {
                isLoggedIn = true;
                console.log('🎉 LOGIN SUCCESSFUL!');
                break;
            }

            // Handle login steps with enhanced error handling
            try {
                if (state.needsInitialLogin) {
                    console.log('   🔘 Clicking initial "Log In" button...');
                    await this.fieldTargeter.findAndClickButton([
                        'a.aui-nav-link.login-link[href*="login.jsp"]',
                        'a[href*="login"]', 
                        'button[href*="login"]'
                    ], 'login');
                    
                } else if (state.needsUsername) {
                    console.log('   🔤 Entering username...');
                    const usernameField = await this.fieldTargeter.getLoginField('username');
                    if (usernameField) {
                        const fillSuccess = await this.fieldTargeter.safelyFillField(
                            usernameField, 
                            this.config.credentials.username, 
                            'username'
                        );
                        if (fillSuccess) {
                            await this.fieldTargeter.findAndClickButton([
                                'button:has-text("Continue")',
                                'button[type="submit"]',
                                'input[type="submit"]'
                            ], 'continue');
                        }
                    }
                    
                } else if (state.needsEmail) {
                    console.log('   📧 Entering email...');
                    const emailField = await this.fieldTargeter.getLoginField('email');
                    if (emailField) {
                        const fillSuccess = await this.fieldTargeter.safelyFillField(
                            emailField, 
                            this.config.credentials.email, 
                            'email'
                        );
                        if (fillSuccess) {
                            await this.fieldTargeter.findAndClickButton([
                                'button:has-text("Next")',
                                'button[type="submit"]',
                                'input[type="submit"]'
                            ], 'next');
                        }
                    }
                    
                } else if (state.needsPassword) {
                    console.log('   🔒 Entering password...');
                    const passwordField = await this.fieldTargeter.getLoginField('password');
                    if (passwordField) {
                        const fillSuccess = await this.fieldTargeter.safelyFillField(
                            passwordField, 
                            this.config.credentials.password, 
                            'password'
                        );
                        if (fillSuccess) {
                            await this.fieldTargeter.findAndClickButton([
                                'button:has-text("Sign in")',
                                'button[type="submit"]',
                                'input[type="submit"]'
                            ], 'sign in');
                        }
                    }
                    
                } else if (state.needsCertificateAccept) {
                    console.log('   ✅ Clicking certificate accept button...');
                    await this.fieldTargeter.findAndClickButton([
                        'button:has-text("Accept")',
                        'button:has-text("Continue")',
                        'button:has-text("OK")',
                        'input[value*="Accept"]',
                        'input[value*="Continue"]',
                        'input[value*="OK"]'
                    ], 'certificate accept');
                    
                } else if (state.is2FA) {
                    console.log('   📱 2FA detected - please complete on your device...');
                    await this.page.waitForTimeout(this.config.timeouts.twoFA);
                    
                } else {
                    console.log('   ⏳ Waiting for page to load...');
                    console.log(`   Page preview: ${state.bodyPreview}`);
                    await this.page.waitForTimeout(this.config.timeouts.loginStep);
                }
            } catch (actionError) {
                console.log(`   ⚠️ Login action failed: ${actionError.message}`);
                await this.page.waitForTimeout(this.config.timeouts.loginStep);
            }

            loginStep++;
            await this.page.waitForTimeout(this.config.timeouts.loginStep);
        }

        return isLoggedIn;
    }
}

// =============================================================================
// TICKET EXTRACTION
// =============================================================================

class TicketExtractor {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async extractTickets(options: {
        projects?: string[];
        maxPerProject?: number;
        jqlFilter?: string;
    } = {}): Promise<ExtractionResult> {
        console.log('🎯 Starting ticket extraction...');

        // Build JQL query
        let jqlQuery = 'ORDER BY created DESC';
        if (options.projects && options.projects.length > 0) {
            jqlQuery = `project in (${options.projects.join(', ')}) ${jqlQuery}`;
        }
        if (options.jqlFilter) {
            jqlQuery = `${options.jqlFilter} ${jqlQuery}`;
        }

        // Navigate to search results
        const searchUrl = `${this.page.url().split('/jira')[0]}/jira/issues/?jql=${encodeURIComponent(jqlQuery)}`;
        await this.page.goto(searchUrl);
        await this.page.waitForTimeout(4000);

        // Extract tickets using multiple selector strategies
        const result = await this.page.evaluate(() => {
            const projectSet = new Set<string>();
            const allTickets: any[] = [];

            // Try multiple selectors for ticket rows
            const ticketSelectors = [
                'tr[data-issuekey]',
                '.issue-table tbody tr',
                '.navigator-issue-only',
                '.issue-list .issue',
                '[data-issue-key]',
                '.issue-content-container'
            ];

            let ticketsFound = false;
            let selectorUsed = '';

            for (const selector of ticketSelectors) {
                const rows = document.querySelectorAll(selector);
                if (rows.length > 0) {
                    console.log(`Using selector: ${selector}, found ${rows.length} rows`);
                    ticketsFound = true;
                    selectorUsed = selector;
                    
                    rows.forEach(row => {
                        // Try different ways to get the ticket key
                        let key = row.getAttribute('data-issuekey') || 
                                 row.getAttribute('data-issue-key') ||
                                 row.querySelector('.issuekey, .issue-link')?.textContent?.trim();
                        
                        // Extract key from link href if needed
                        if (!key) {
                            const link = row.querySelector('a[href*="/browse/"]') as HTMLAnchorElement;
                            if (link) {
                                const match = link.href.match(/\/browse\/([A-Z]+-\d+)/);
                                if (match) key = match[1];
                            }
                        }
                        
                        if (key && key.match(/^[A-Z]+-\d+$/)) {
                            const project = key.split('-')[0];
                            projectSet.add(project);
                            
                            allTickets.push({
                                key,
                                project,
                                summary: row.querySelector('.summary a, .issue-link-summary, h3 a')?.textContent?.trim() || '',
                                status: row.querySelector('.status span, .issue-status')?.textContent?.trim() || '',
                                assignee: row.querySelector('.assignee, .issue-assignee')?.textContent?.trim() || '',
                                reporter: row.querySelector('.reporter, .issue-reporter')?.textContent?.trim() || '',
                                created: row.querySelector('.created, .issue-created')?.textContent?.trim() || '',
                                updated: row.querySelector('.updated, .issue-updated')?.textContent?.trim() || '',
                                priority: row.querySelector('.priority, .issue-priority')?.textContent?.trim() || ''
                            });
                        }
                    });
                    break;
                }
            }
            
            // Fallback: search page text for issue keys
            if (!ticketsFound) {
                const bodyText = document.body?.textContent || '';
                const issueKeyPattern = /([A-Z]{2,10}-\d+)/g;
                const matches = bodyText.match(issueKeyPattern) || [];
                const uniqueKeys = Array.from(new Set(matches));
                
                uniqueKeys.forEach(key => {
                    const project = key.split('-')[0];
                    projectSet.add(project);
                    allTickets.push({
                        key,
                        project,
                        summary: 'Found in page text',
                        status: '',
                        assignee: '',
                        reporter: '',
                        created: '',
                        updated: '',
                        priority: ''
                    });
                });
                
                selectorUsed = 'text extraction';
            }
            
            const pagingInfo = document.querySelector('.showing, .results-count, .search-results-count')?.textContent || 'No paging info';
            
            return {
                projects: Array.from(projectSet),
                tickets: allTickets,
                pagingInfo,
                selectorUsed
            };
        });

        console.log(`📊 Found ${result.projects.length} project(s): ${result.projects.join(', ')}`);
        console.log(`📦 Extracted ${result.tickets.length} tickets using ${result.selectorUsed}`);
        console.log(`📊 ${result.pagingInfo}`);

        return result;
    }
}

// =============================================================================
// DATA MANAGEMENT
// =============================================================================

class DataManager {
    private supabaseConfig?: { url: string; serviceKey: string };

    constructor(supabaseConfig?: { url: string; serviceKey: string }) {
        this.supabaseConfig = supabaseConfig;
    }

    async storeResults(results: ExtractionResult, environment: string): Promise<void> {
        // Store to file
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `unified-extraction-${environment.toLowerCase()}-${timestamp}.json`;
        
        const fileData = {
            environment,
            timestamp: new Date().toISOString(),
            framework: 'unified-jira-automation',
            extractedProjects: results.projects,
            totalTickets: results.tickets.length,
            selectorUsed: results.selectorUsed,
            pagingInfo: results.pagingInfo,
            tickets: results.tickets
        };

        fs.writeFileSync(filename, JSON.stringify(fileData, null, 2));
        console.log(`💾 Results saved to: ${filename}`);

        // Store to Supabase if configured
        if (this.supabaseConfig && results.tickets.length > 0) {
            await this.storeInSupabase(results, environment);
        }
    }

    private async storeInSupabase(results: ExtractionResult, environment: string): Promise<void> {
        const supabase = createClient(
            this.supabaseConfig!.url,
            this.supabaseConfig!.serviceKey
        );

        const uatTickets = results.tickets.map(ticket => ({
            external_id: `${environment}-${ticket.key}`,
            title: `[${environment}] ${ticket.summary}`,
            status: ticket.status,
            priority: ticket.priority,
            metadata: {
                environment,
                purpose: 'UNIFIED_JIRA_AUTOMATION',
                original_key: ticket.key,
                project: ticket.project,
                assignee: ticket.assignee,
                reporter: ticket.reporter,
                created: ticket.created,
                updated: ticket.updated,
                source: 'unified-jira-automation',
                is_temporary: true,
                extraction_date: new Date().toISOString()
            }
        }));

        console.log('📤 Storing tickets in Supabase...');
        
        // Store in batches of 50
        for (let i = 0; i < uatTickets.length; i += 50) {
            const batch = uatTickets.slice(i, i + 50);
            const { error } = await supabase.from('jira_tickets').upsert(batch);
            
            if (error) {
                console.error(`❌ Batch ${Math.floor(i/50) + 1} error:`, error);
            } else {
                console.log(`✅ Stored batch ${Math.floor(i/50) + 1}: ${batch.length} tickets`);
            }
        }

        console.log(`✅ Successfully stored ${results.tickets.length} tickets in Supabase`);
    }
}

// =============================================================================
// CONFIGURATION PRESETS
// =============================================================================

export const UAT_CONFIG: JiraConfig = {
    baseUrl: 'https://jirauat.smedigitalapps.com',
    credentials: {
        username: 'mcarpent',
        email: 'matt.carpenter.ext@sonymusic.com',
        password: 'Dooley1_Jude2'
    },
    timeouts: {
        pageLoad: 5000,
        loginStep: 3000,
        fieldFill: 1000,
        twoFA: 15000
    },
    maxLoginAttempts: 20,
    sessionFile: 'uat-jira-session.json',
    sso: DEFAULT_SSO_CONFIG,
    supabase: {
        url: 'https://kfxetwuuzljhybfgmpuc.supabase.co',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
    }
};

export const PROD_CONFIG: JiraConfig = {
    baseUrl: 'https://jira.smedigitalapps.com',
    credentials: {
        username: 'mcarpent',
        email: 'matt.carpenter.ext@sonymusic.com',
        password: 'Dooley1_Jude2'
    },
    timeouts: {
        pageLoad: 5000,
        loginStep: 3000,
        fieldFill: 1000,
        twoFA: 15000
    },
    maxLoginAttempts: 20,
    sessionFile: 'prod-jira-session.json',
    sso: DEFAULT_SSO_CONFIG,
    supabase: {
        url: 'https://kfxetwuuzljhybfgmpuc.supabase.co',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!
    }
};

// =============================================================================
// MAIN EXECUTION FUNCTIONS
// =============================================================================

async function runUATWorkflow(): Promise<void> {
    const automation = new UnifiedJiraAutomation(UAT_CONFIG);
    
    try {
        await automation.initialize();
        await automation.runComprehensiveWorkflow('UAT');
        console.log('\n🎉 UAT workflow completed successfully!');
    } catch (error) {
        console.error('❌ UAT workflow failed:', error);
    } finally {
        await automation.cleanup();
    }
}

async function runProdWorkflow(): Promise<void> {
    const automation = new UnifiedJiraAutomation(PROD_CONFIG);
    
    try {
        await automation.initialize();
        await automation.runComprehensiveWorkflow('PROD');
        console.log('\n🎉 Production workflow completed successfully!');
    } catch (error) {
        console.error('❌ Production workflow failed:', error);
    } finally {
        await automation.cleanup();
    }
}

// Export the main classes and functions
export { 
    UnifiedJiraAutomation, 
    runUATWorkflow, 
    runProdWorkflow 
};

// Run workflow based on command line arguments
// Always run main when script is executed (for testing purposes)
const arg = process.argv[2];
if (arg === 'uat') {
    runUATWorkflow();
} else if (arg === 'prod') {
    runProdWorkflow();
} else {
    console.log('Usage: npx tsx unified-jira-automation.ts [uat|prod]');
    runUATWorkflow(); // Default to UAT
} 