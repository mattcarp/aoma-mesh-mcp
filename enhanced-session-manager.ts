import { chromium, BrowserContext, Page } from 'playwright';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Enhanced Session Manager for JIRA UAT Testing
 * 
 * FIXES:
 * - Session cookies properly maintained between browser contexts
 * - No manual login required for each test session
 * - Persistent session state across test runs
 * - Automatic session refresh when expired
 * - Cross-browser context session sharing
 */

export class EnhancedSessionManager {
  private static readonly SESSION_FILE = 'test-results/sessions/enhanced-jira-session.json';
  private static readonly SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
  
  private sessionData: any = null;
  private isSessionValid: boolean = false;
  
  async initialize(): Promise<void> {
    console.log('🔧 Initializing Enhanced Session Manager...');
    
    // Ensure session directory exists
    await mkdir('test-results/sessions', { recursive: true });
    
    // Try to load existing session
    await this.loadExistingSession();
    
    console.log(`✅ Session Manager initialized: ${this.isSessionValid ? 'Valid session found' : 'Session capture needed'}`);
  }
  
  private async loadExistingSession(): Promise<void> {
    try {
      if (!existsSync(EnhancedSessionManager.SESSION_FILE)) {
        console.log('📂 No existing session file found');
        this.isSessionValid = false;
        return;
      }
      
      const sessionContent = await readFile(EnhancedSessionManager.SESSION_FILE, 'utf-8');
      this.sessionData = JSON.parse(sessionContent);
      
      // Check if session is still valid
      const sessionAge = Date.now() - new Date(this.sessionData.timestamp).getTime();
      
      if (sessionAge > EnhancedSessionManager.SESSION_TIMEOUT) {
        console.log('⏰ Session expired (older than 8 hours)');
        this.isSessionValid = false;
        return;
      }
      
      // Quick validation - test if session actually works
      const isWorking = await this.validateSessionWithQuickTest();
      
      if (isWorking) {
        console.log(`✅ Valid session loaded: ${this.sessionData.cookies?.length || 0} cookies`);
        this.isSessionValid = true;
      } else {
        console.log('❌ Session file exists but cookies are invalid');
        this.isSessionValid = false;
      }
      
    } catch (error) {
      console.warn('⚠️ Could not load existing session:', error);
      this.isSessionValid = false;
    }
  }
  
  private async validateSessionWithQuickTest(): Promise<boolean> {
    if (!this.sessionData) return false;
    
    try {
      const browser = await chromium.launch({ headless: true });
      const context = await this.createAuthenticatedContext(browser);
      const page = await context.newPage();
      
      // Quick test - try to load dashboard
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { timeout: 15000 });
      await page.waitForLoadState('domcontentloaded');
      
      const title = await page.title();
      const isAuthenticated = !title.toLowerCase().includes('log in') && 
                             !page.url().includes('login') &&
                             !title.includes('dead link');
      
      await browser.close();
      
      return isAuthenticated;
      
    } catch (error) {
      console.warn('⚠️ Session validation failed:', error);
      return false;
    }
  }
  
  async ensureValidSession(): Promise<void> {
    if (this.isSessionValid) {
      console.log('✅ Session is valid, proceeding with tests');
      return;
    }
    
    console.log('🔐 Session invalid or missing - capturing new session...');
    await this.captureNewSession();
  }
  
  private async captureNewSession(): Promise<void> {
    console.log('🔐 Starting enhanced session capture...');
    
    const browser = await chromium.launch({ 
      headless: false, // Headful for manual login
      slowMo: 100
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate to JIRA login
      console.log('🌐 Navigating to JIRA UAT login...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
      
      // Wait for login completion
      console.log('👤 Please complete manual login...');
      console.log('💡 Will detect when you reach the dashboard');
      
      await this.waitForLoginCompletion(page);
      
      // Capture comprehensive session data
      console.log('💾 Capturing enhanced session state...');
      const sessionData = await this.captureComprehensiveSessionData(context, page);
      
      // Save session data
      await this.saveEnhancedSessionData(sessionData);
      
      this.sessionData = sessionData;
      this.isSessionValid = true;
      
      console.log('✅ Enhanced session captured and saved!');
      
    } catch (error) {
      console.error('❌ Enhanced session capture failed:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
  
  private async waitForLoginCompletion(page: Page): Promise<void> {
    const maxWaitTime = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const currentUrl = page.url();
        
        // Check for dashboard or authenticated state
        if (currentUrl.includes('/dashboard') || 
            currentUrl.includes('/secure/Dashboard.jspa') ||
            (currentUrl.includes('jirauat.smedigitalapps.com') && !currentUrl.includes('login'))) {
          
          // Verify we're actually authenticated
          const title = await page.title();
          const isAuthenticated = title.toLowerCase().includes('dashboard') &&
                                 !title.toLowerCase().includes('log in');
          
          if (isAuthenticated) {
            console.log('✅ Login completed - authenticated dashboard detected');
            return;
          }
        }
        
        // Wait before checking again
        await page.waitForTimeout(3000);
        
      } catch (error) {
        console.log('⏳ Waiting for login completion...');
        await page.waitForTimeout(3000);
      }
    }
    
    throw new Error('Login timeout - manual login was not completed within 15 minutes');
  }
  
  private async captureComprehensiveSessionData(context: BrowserContext, page: Page) {
    // Get all cookies with enhanced metadata
    const cookies = await context.cookies();
    
    // Get enhanced storage data
    const storageData = await page.evaluate(() => {
      const localStorage: Record<string, string> = {};
      const sessionStorage: Record<string, string> = {};
      
      // Capture all localStorage
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }
      
      // Capture all sessionStorage
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }
      
      return { localStorage, sessionStorage };
    });
    
    // Get JIRA-specific authentication tokens
    const jiraAuth = await page.evaluate(() => {
      const tokens: Record<string, any> = {};
      
      // CSRF token
      const csrfToken = document.querySelector('meta[name="atlassian-token"]')?.getAttribute('content');
      if (csrfToken) tokens.csrfToken = csrfToken;
      
      // Other JIRA tokens from scripts
      const scripts = Array.from(document.scripts);
      for (const script of scripts) {
        const content = script.textContent || '';
        
        // Look for user context
        if (content.includes('AJS.Meta.set')) {
          // Extract user information if available
          const userMatch = content.match(/user['"]\s*:\s*{[^}]+}/);
          if (userMatch) {
            try {
              tokens.userContext = userMatch[0];
            } catch {}
          }
        }
      }
      
      return tokens;
    });
    
    // Get current page info
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    const enhancedSessionData = {
      timestamp: new Date().toISOString(),
      captureUrl: currentUrl,
      pageTitle,
      domain: 'jirauat.smedigitalapps.com',
      environment: 'UAT',
      jiraVersion: '10.3.6',
      cookies,
      localStorage: storageData.localStorage,
      sessionStorage: storageData.sessionStorage,
      jiraAuth,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: page.viewportSize(),
      
      // Session validation metadata
      sessionValidation: {
        lastValidated: new Date().toISOString(),
        dashboardAccessible: true,
        cookieCount: cookies.length,
        hasJSessionId: cookies.some(c => c.name === 'JSESSIONID'),
        hasCsrfToken: !!jiraAuth.csrfToken
      }
    };
    
    return enhancedSessionData;
  }
  
  private async saveEnhancedSessionData(sessionData: any): Promise<void> {
    try {
      await writeFile(
        EnhancedSessionManager.SESSION_FILE,
        JSON.stringify(sessionData, null, 2),
        'utf-8'
      );
      
      console.log(`💾 Enhanced session data saved to ${EnhancedSessionManager.SESSION_FILE}`);
      
    } catch (error) {
      console.error('❌ Failed to save enhanced session data:', error);
      throw error;
    }
  }
  
  async createAuthenticatedContext(browser?: any): Promise<BrowserContext> {
    if (!this.sessionData) {
      throw new Error('No session data available. Call ensureValidSession() first.');
    }
    
    // Use provided browser or create new one
    const targetBrowser = browser || await chromium.launch({ headless: false });
    
    // Convert session data to Playwright storageState format
    const storageState = {
      cookies: this.sessionData.cookies,
      origins: [{
        origin: 'https://jirauat.smedigitalapps.com',
        localStorage: Object.entries(this.sessionData.localStorage || {}).map(([name, value]) => ({ 
          name, 
          value: String(value) 
        }))
      }]
    };
    
    // Create context with session data
    const context = await targetBrowser.newContext({
      storageState,
      viewport: { width: 1920, height: 1080 },
      userAgent: this.sessionData.userAgent || 'JIRA-Enterprise-Testing/1.0 (Playwright)',
      
      // Additional context options for better session persistence
      extraHTTPHeaders: {
        'X-Testing-Framework': 'Enhanced-Session-Manager',
        'X-Session-ID': this.sessionData.sessionValidation?.lastValidated || new Date().toISOString()
      }
    });
    
    return context;
  }
  
  async createMultipleContexts(count: number = 3): Promise<BrowserContext[]> {
    console.log(`🔄 Creating ${count} authenticated browser contexts...`);
    
    await this.ensureValidSession();
    
    const browser = await chromium.launch({ headless: false });
    const contexts: BrowserContext[] = [];
    
    for (let i = 0; i < count; i++) {
      const context = await this.createAuthenticatedContext(browser);
      contexts.push(context);
      console.log(`✅ Context ${i + 1}/${count} created with shared session`);
    }
    
    return contexts;
  }
  
  async refreshSessionIfNeeded(): Promise<boolean> {
    if (!this.sessionData) {
      return false;
    }
    
    // Check if session is approaching expiration (within 1 hour)
    const sessionAge = Date.now() - new Date(this.sessionData.timestamp).getTime();
    const oneHour = 60 * 60 * 1000;
    
    if (sessionAge > (EnhancedSessionManager.SESSION_TIMEOUT - oneHour)) {
      console.log('🔄 Session approaching expiration, refreshing...');
      
      try {
        // Quick validation
        const isStillValid = await this.validateSessionWithQuickTest();
        
        if (!isStillValid) {
          console.log('🔐 Session invalid, need to recapture');
          this.isSessionValid = false;
          await this.ensureValidSession();
          return true;
        } else {
          console.log('✅ Session still valid, updating timestamp');
          this.sessionData.timestamp = new Date().toISOString();
          await this.saveEnhancedSessionData(this.sessionData);
          return true;
        }
        
      } catch (error) {
        console.warn('⚠️ Session refresh failed:', error);
        return false;
      }
    }
    
    return false; // No refresh needed
  }
  
  getSessionMetrics(): any {
    if (!this.sessionData) {
      return null;
    }
    
    const sessionAge = Date.now() - new Date(this.sessionData.timestamp).getTime();
    
    return {
      isValid: this.isSessionValid,
      ageMinutes: Math.floor(sessionAge / (60 * 1000)),
      cookieCount: this.sessionData.cookies?.length || 0,
      hasJSessionId: this.sessionData.sessionValidation?.hasJSessionId || false,
      hasCsrfToken: this.sessionData.sessionValidation?.hasCsrfToken || false,
      environment: this.sessionData.environment,
      lastValidated: this.sessionData.sessionValidation?.lastValidated
    };
  }
} 