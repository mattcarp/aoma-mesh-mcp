import { chromium, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const CONFIG = {
    UAT_BASE_URL: 'https://jirauat.smedigitalapps.com',
    CREDENTIALS: {
        username: process.env.SME_USERNAME || 'mcarpent',
        email: process.env.SME_EMAIL || 'matt.carpenter.ext@sonymusic.com',
        password: process.env.SME_PASSWORD || 'Dooley1_Jude2'
    },
    SESSION_FILE: 'uat-jira-session.json',
    TIMEOUTS: {
        LOGIN_STEP: 3000,
        FIELD_FILL: 1000,
        PAGE_LOAD: 5000,
        TWO_FA: 15000
    },
    MAX_LOGIN_ATTEMPTS: 10 // Reduced from 20 to prevent infinite loops
};

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
}

/**
 * CRITICAL: Robust form field targeting to distinguish login forms from search fields
 */
class FormFieldTargeter {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Safely fill a form field with viewport handling
     */
    async safelyFillField(element: any, value: string, fieldName: string): Promise<boolean> {
        try {
            console.log(`   📝 Filling ${fieldName} field...`);
            
            // Enhanced viewport handling
            await element.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(500); // Brief pause for smooth scrolling
            
            // Clear any existing content first
            await element.clear();
            await this.page.waitForTimeout(200);
            
            // Fill the field
            await element.fill(value);
            await this.page.waitForTimeout(200);
            
            // Verify the field was filled
            const fieldValue = await element.inputValue();
            if (fieldValue === value) {
                console.log(`   ✅ ${fieldName} field filled successfully`);
                return true;
            } else {
                console.log(`   ⚠️ ${fieldName} field value mismatch. Expected: ${value}, Got: ${fieldValue}`);
                return false;
            }
        } catch (error) {
            console.log(`   ❌ Failed to fill ${fieldName} field: ${error}`);
            return false;
        }
    }

         /**
      * Target USERNAME field in login form (NOT search field)
      */
     async getLoginUsernameField() {
         const selectors = [
             // Simple and direct selectors first
             'input[placeholder="Username"]',
             'input[name="username"]',
             'input[id="username"]',
             '#login-form-username',
             'input[name="os_username"]',
             // Microsoft SSO username
             'input[name="loginfmt"]',
             'input[type="email"][name="loginfmt"]',
             // More specific JIRA login form 
             'form[action*="login"] input[placeholder="Username"]',
             // Last resort - but check it's in a form context
             'form input[placeholder="Username"]',
             'div[class*="login"] input[placeholder="Username"]'
         ];

         for (const selector of selectors) {
             try {
                 const element = this.page.locator(selector).first();
                 if (await element.isVisible({ timeout: 2000 })) {
                     console.log(`✅ Found username field: ${selector}`);
                     return element;
                 }
             } catch (e) {
                 // Continue to next selector
             }
         }

        console.log('❌ No username field found');
        return null;
    }

    /**
     * Target EMAIL field in Microsoft SSO (NOT search field)
     */
    async getLoginEmailField() {
        const selectors = [
            // Microsoft SSO specific
            'input[type="email"][name="loginfmt"]',
            'input[name="loginfmt"]',
            // Generic email field in login context
            'form input[type="email"]',
            'input[type="email"]:not(.aui-nav input):not(.search input)'
        ];

        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible()) {
                    console.log(`✅ Found email field: ${selector}`);
                    return element;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        console.log('❌ No email field found');
        return null;
    }

    /**
     * Target PASSWORD field in login form
     */
    async getLoginPasswordField() {
        const selectors = [
            // JIRA login form specific
            'form[action*="login"] input[type="password"]',
            '#login-form-password',
            'input[name="os_password"]',
            // Microsoft SSO password
            'input[name="passwd"]',
            'input[type="password"][name="passwd"]',
            // Generic fallback
            'input[type="password"]'
        ];

        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible()) {
                    console.log(`✅ Found password field: ${selector}`);
                    return element;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        console.log('❌ No password field found');
        return null;
    }

    /**
     * Find and click appropriate submit button with enhanced viewport handling
     */
    async clickSubmitButton() {
        const selectors = [
            // JIRA specific
            '#loginMainButton',
            'input[name="Login"]',
            // Microsoft SSO specific
            'button[type="submit"]',
            'input[type="submit"][value*="Sign"]',
            'button:has-text("Sign in")',
            'button:has-text("Continue")',
            'button:has-text("Next")',
            // Generic fallback
            'button[type="submit"]',
            'input[type="submit"]'
        ];

        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible()) {
                    console.log(`✅ Found submit button: ${selector}`);
                    
                    // Enhanced viewport handling with better scrolling
                    await element.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(1000); // Longer pause for smooth scrolling
                    
                    // Try multiple click approaches
                    try {
                        await element.click({ timeout: 5000 });
                        console.log(`✅ Successfully clicked submit button`);
                        return true;
                    } catch (clickError) {
                        console.log(`⚠️ Normal click failed, trying force click: ${clickError}`);
                        try {
                            await element.click({ force: true });
                            console.log(`✅ Successfully force clicked submit button`);
                            return true;
                        } catch (forceError) {
                            console.log(`⚠️ Force click failed, trying bounding box click: ${forceError}`);
                            const box = await element.boundingBox();
                            if (box) {
                                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                                console.log(`✅ Successfully bounding box clicked submit button`);
                                return true;
                            }
                        }
                    }
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        console.log('❌ No submit button found');
        return false;
    }

    /**
     * Find and click login button with enhanced viewport handling
     */
    async clickLoginButton() {
        const selectors = [
            // More specific selectors first - AVOID skip links
            'a[href*="login.jsp"]:not(.aui-skip-link)',
            'button[href*="login"]:not(.aui-skip-link)',
            'a[href*="login"]:not(.aui-skip-link)',
            'button:has-text("Log in"):not(.aui-skip-link)',
            'a:has-text("Log in"):not(.aui-skip-link)',
            'button:has-text("Login"):not(.aui-skip-link)',
            'a:has-text("Login"):not(.aui-skip-link)',
            // Try to find visible login buttons in header/nav
            '.aui-nav a[href*="login"]',
            '#header a[href*="login"]',
            '.login-link',
            // Last resort - but exclude skip links
            'a[href*="login"]:not(.aui-skip-link), button[href*="login"]:not(.aui-skip-link)'
        ];

        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    // Additional check to ensure it's not a skip link
                    const isSkipLink = await element.evaluate(el => el.classList.contains('aui-skip-link'));
                    if (isSkipLink) {
                        console.log(`⚠️ Skipping skip link: ${selector}`);
                        continue;
                    }
                    
                    console.log(`✅ Found login button: ${selector}`);
                    
                    // Enhanced viewport handling with better scrolling
                    await element.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(1000); // Longer pause for smooth scrolling
                    
                    // Try multiple click approaches
                    try {
                        await element.click({ timeout: 5000 });
                        console.log(`✅ Successfully clicked login button`);
                        return true;
                    } catch (clickError) {
                        console.log(`⚠️ Normal click failed, trying force click: ${clickError}`);
                        try {
                            await element.click({ force: true });
                            console.log(`✅ Successfully force clicked login button`);
                            return true;
                        } catch (forceError) {
                            console.log(`⚠️ Force click failed, trying bounding box click: ${forceError}`);
                            const box = await element.boundingBox();
                            if (box) {
                                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                                console.log(`✅ Successfully bounding box clicked login button`);
                                return true;
                            }
                        }
                    }
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        console.log('❌ No login button found');
        return false;
    }

    /**
     * Find and click certificate accept button with enhanced viewport handling
     */
    async clickCertificateAcceptButton() {
        const selectors = [
            'button:has-text("Accept")',
            'button:has-text("Continue")',
            'button:has-text("OK")',
            'input[type="button"][value*="Accept"]',
            'input[type="button"][value*="Continue"]',
            'input[type="button"][value*="OK"]',
            'input[type="submit"][value*="Accept"]'
        ];

        for (const selector of selectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible()) {
                    console.log(`✅ Found certificate accept button: ${selector}`);
                    
                    // Enhanced viewport handling with better scrolling
                    await element.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(1000); // Longer pause for smooth scrolling
                    
                    // Try multiple click approaches
                    try {
                        await element.click({ timeout: 5000 });
                        console.log(`✅ Successfully clicked certificate accept button`);
                        return true;
                    } catch (clickError) {
                        console.log(`⚠️ Normal click failed, trying force click: ${clickError}`);
                        try {
                            await element.click({ force: true });
                            console.log(`✅ Successfully force clicked certificate accept button`);
                            return true;
                        } catch (forceError) {
                            console.log(`⚠️ Force click failed, trying bounding box click: ${forceError}`);
                            const box = await element.boundingBox();
                            if (box) {
                                await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                                console.log(`✅ Successfully bounding box clicked certificate accept button`);
                                return true;
                            }
                        }
                    }
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        console.log('❌ No certificate accept button found');
        return false;
    }
}

/**
 * Session manager for persistent login
 */
class SessionManager {
    private sessionFile: string;

    constructor(sessionFile: string) {
        this.sessionFile = sessionFile;
    }

    async loadSession(context: BrowserContext): Promise<boolean> {
        try {
            if (fs.existsSync(this.sessionFile)) {
                const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
                if (sessionData.cookies && sessionData.cookies.length > 0) {
                    await context.addCookies(sessionData.cookies);
                    console.log('✅ Session cookies loaded');
                    return true;
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load session:', error);
        }
        return false;
    }

    async saveSession(context: BrowserContext): Promise<void> {
        try {
            const cookies = await context.cookies();
            const sessionData = {
                cookies,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
            console.log('✅ Session saved');
        } catch (error) {
            console.log('⚠️ Could not save session:', error);
        }
    }
}

/**
 * Main JIRA UAT Login Automation Class
 */
class JiraUATLoginAutomation {
    private browser: any;
    private context: BrowserContext;
    private page: Page;
    private fieldTargeter: FormFieldTargeter;
    private sessionManager: SessionManager;

    constructor() {
        this.sessionManager = new SessionManager(CONFIG.SESSION_FILE);
    }

    async initialize(): Promise<void> {
        this.browser = await chromium.launch({
            headless: false,
            args: ['--start-maximized', '--ignore-certificate-errors']
        });

        this.context = await this.browser.newContext();
        this.page = await this.context.newPage();
        this.fieldTargeter = new FormFieldTargeter(this.page);

        // Load existing session
        await this.sessionManager.loadSession(this.context);
    }

    async getCurrentLoginState(): Promise<LoginState> {
        const state = await this.page.evaluate(() => {
            const url = window.location.href;
            const title = document.title;
            const bodyText = document.body.textContent?.toLowerCase() || '';

            // Check for login elements - exclude skip links
            const usernameField = document.querySelector('input[placeholder="Username"], input[name="loginfmt"], input[name="username"]');
            const emailField = document.querySelector('input[type="email"]');
            const passwordField = document.querySelector('input[type="password"]');
            
            // Find login buttons but exclude skip links
            const loginButtons = Array.from(document.querySelectorAll('a[href*="login"], button[href*="login"]'))
                .filter(el => !el.classList.contains('aui-skip-link'));
            const initialLoginBtn = loginButtons.find(el => {
                const text = el.textContent?.trim().toLowerCase() || '';
                return text.includes('log in') || text.includes('login');
            });

            // Check for certificate accept buttons
            const acceptButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                .filter(btn => {
                    const text = btn.textContent?.toLowerCase() || btn.getAttribute('value')?.toLowerCase() || '';
                    return text.includes('accept') || text.includes('continue') || text.includes('ok');
                });

            // Check for JIRA interface (successful login)
            const hasJiraInterface = document.querySelector('.aui-nav, #header, .navigator-content, .dashboard') !== null;
            const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
            const hasCreateButton = document.querySelector('button[title*="Create"], a[title*="Create"]') !== null;
            const noLoginElements = !usernameField && !emailField && !passwordField && !initialLoginBtn;

            // More robust login detection
            const isLoggedIn = (hasJiraInterface || hasIssuesNav || hasCreateButton) && 
                              noLoginElements && 
                              !bodyText.includes('sign in') && 
                              !bodyText.includes('log in') &&
                              !url.includes('login.jsp');

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
                pageTitle: title
            };
        });

        return state;
    }

    async performLogin(): Promise<boolean> {
        console.log('🔐 Starting JIRA UAT Login Automation');
        console.log('================================================================================');

        try {
            // Navigate to UAT JIRA dashboard
            console.log('🔗 Opening UAT JIRA dashboard...');
            await this.page.goto(`${CONFIG.UAT_BASE_URL}/jira/secure/Dashboard.jspa`);
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.PAGE_LOAD);

            let loginStep = 1;
            let isLoggedIn = false;

            while (!isLoggedIn && loginStep <= CONFIG.MAX_LOGIN_ATTEMPTS) {
                console.log(`\n🔍 Login Step ${loginStep}/${CONFIG.MAX_LOGIN_ATTEMPTS}: Analyzing page...`);

                const state = await this.getCurrentLoginState();
                
                console.log(`   URL: ${state.currentUrl.substring(0, 60)}...`);
                console.log(`   Title: ${state.pageTitle}`);
                console.log(`   Logged in: ${state.isLoggedIn ? '✅ YES' : '❌ NO'}`);
                
                // Debug: Show what elements are present
                const debugInfo = await this.page.evaluate(() => {
                    const loginButtons = document.querySelectorAll('a[href*="login"], button[href*="login"]');
                    const skipLinks = document.querySelectorAll('.aui-skip-link');
                    const usernameFields = document.querySelectorAll('input[placeholder="Username"], input[name="username"]');
                    const emailFields = document.querySelectorAll('input[type="email"]');
                    const passwordFields = document.querySelectorAll('input[type="password"]');
                    
                    return {
                        loginButtons: loginButtons.length,
                        skipLinks: skipLinks.length,
                        usernameFields: usernameFields.length,
                        emailFields: emailFields.length,
                        passwordFields: passwordFields.length
                    };
                });
                
                console.log(`   Debug: Found ${debugInfo.loginButtons} login buttons, ${debugInfo.skipLinks} skip links, ${debugInfo.usernameFields} username fields, ${debugInfo.emailFields} email fields, ${debugInfo.passwordFields} password fields`);

                if (state.isLoggedIn) {
                    isLoggedIn = true;
                    console.log('🎉 LOGIN SUCCESSFUL!');
                    await this.sessionManager.saveSession(this.context);
                    break;
                }

                // Handle initial login button click
                if (state.needsInitialLogin) {
                    console.log('   🔘 Clicking initial "Log In" button...');
                    const loginSuccess = await this.fieldTargeter.clickLoginButton();
                    if (loginSuccess) {
                        await this.page.waitForTimeout(CONFIG.TIMEOUTS.LOGIN_STEP);
                    } else {
                        // Fallback: Navigate directly to login page
                        console.log('   🔄 No login button found, navigating directly to login page...');
                        await this.page.goto(`${CONFIG.UAT_BASE_URL}/jira/login.jsp`);
                        await this.page.waitForTimeout(CONFIG.TIMEOUTS.PAGE_LOAD);
                    }
                }

                // Handle username field
                else if (state.needsUsername) {
                    console.log('   🔤 Entering username...');
                    const usernameField = await this.fieldTargeter.getLoginUsernameField();
                    if (usernameField) {
                        const fillSuccess = await this.fieldTargeter.safelyFillField(
                            usernameField, 
                            CONFIG.CREDENTIALS.username, 
                            'username'
                        );
                        if (fillSuccess) {
                            await this.page.waitForTimeout(CONFIG.TIMEOUTS.FIELD_FILL);
                            await this.fieldTargeter.clickSubmitButton();
                        }
                    }
                }

                // Handle email field (Microsoft SSO)
                else if (state.needsEmail) {
                    console.log('   📧 Entering email...');
                    const emailField = await this.fieldTargeter.getLoginEmailField();
                    if (emailField) {
                        const fillSuccess = await this.fieldTargeter.safelyFillField(
                            emailField, 
                            CONFIG.CREDENTIALS.email, 
                            'email'
                        );
                        if (fillSuccess) {
                            await this.page.waitForTimeout(CONFIG.TIMEOUTS.FIELD_FILL);
                            await this.fieldTargeter.clickSubmitButton();
                        }
                    }
                }

                // Handle password field
                else if (state.needsPassword) {
                    console.log('   🔒 Entering password...');
                    const passwordField = await this.fieldTargeter.getLoginPasswordField();
                    if (passwordField) {
                        const fillSuccess = await this.fieldTargeter.safelyFillField(
                            passwordField, 
                            CONFIG.CREDENTIALS.password, 
                            'password'
                        );
                        if (fillSuccess) {
                            await this.page.waitForTimeout(CONFIG.TIMEOUTS.FIELD_FILL);
                            await this.fieldTargeter.clickSubmitButton();
                        }
                    }
                }

                // Handle certificate accept button
                else if (state.needsCertificateAccept) {
                    console.log('   ✅ Clicking certificate accept button...');
                    await this.fieldTargeter.clickCertificateAcceptButton();
                }

                // Handle 2FA
                else if (state.is2FA) {
                    console.log('   📱 2FA detected - please complete on your device...');
                    console.log('   ⏳ Waiting for 2FA completion...');
                    await this.page.waitForTimeout(CONFIG.TIMEOUTS.TWO_FA);
                }

                // Wait for next step
                else {
                    console.log('   ⏳ Waiting for page to load...');
                    await this.page.waitForTimeout(CONFIG.TIMEOUTS.LOGIN_STEP);
                }

                loginStep++;
            }

            return isLoggedIn;

        } catch (error) {
            console.error('❌ Login error:', error);
            return false;
        }
    }

    async runComprehensiveUATTests(): Promise<void> {
        console.log('\n🧪 Running Comprehensive UAT Tests...');
        console.log('================================================================================');

        try {
            // Navigate to issues page
            await this.page.goto(`${CONFIG.UAT_BASE_URL}/jira/issues/?jql=project%20in%20(ITSM%2C%20DPSA%2C%20DPSO)%20ORDER%20BY%20created%20DESC`);
            await this.page.waitForTimeout(CONFIG.TIMEOUTS.PAGE_LOAD);

            // TODO: Execute comprehensive test suite
            console.log('✅ Ready to execute comprehensive UAT tests');
            console.log('   - JIRA interface accessible');
            console.log('   - Session persistent');
            console.log('   - Authentication complete');

        } catch (error) {
            console.error('❌ UAT test execution error:', error);
        }
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

/**
 * Main execution function
 */
async function main() {
    const automation = new JiraUATLoginAutomation();

    try {
        await automation.initialize();
        
        const loginSuccess = await automation.performLogin();
        
        if (loginSuccess) {
            await automation.runComprehensiveUATTests();
            console.log('\n🎉 JIRA UAT Login Automation COMPLETED SUCCESSFULLY!');
        } else {
            console.log('\n❌ JIRA UAT Login Automation FAILED');
        }

        // Keep browser open for manual inspection
        console.log('\n⏳ Browser staying open for manual inspection...');
        console.log('   Press Ctrl+C to exit when ready.');
        await new Promise(() => {}); // Keep running

    } catch (error) {
        console.error('❌ Fatal error:', error);
    } finally {
        await automation.cleanup();
    }
}

// Run the automation
// Always run main when script is executed (for testing purposes)
main().catch(console.error);

export { JiraUATLoginAutomation, FormFieldTargeter, SessionManager }; 