import { chromium, BrowserContext, Page } from '@playwright/test';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

/**
 * Enterprise Session Manager for JIRA 10.3.6 Testing
 * 
 * Handles:
 * - Manual login session capture
 * - Session persistence and reuse
 * - Microsoft SSO and 2FA handling
 * - Session validation and refresh
 */

export class SessionManager {
  private static readonly SESSION_FILE = 'test-results/sessions/jira-enterprise-session.json';
  private static readonly SESSION_TIMEOUT = 4 * 60 * 60 * 1000; // 4 hours
  
  async captureAuthenticatedSession(): Promise<void> {
    console.log('🔐 Starting manual session capture for JIRA 10.3.6...');
    
    // Check if we already have a valid session
    if (await this.isSessionValid()) {
      console.log('✅ Valid session already exists, skipping capture');
      return;
    }
    
    const browser = await chromium.launch({ 
      headless: false, // MUST be headful for manual login
      slowMo: 100
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      // Navigate to JIRA login
      console.log('🌐 Navigating to JIRA login page...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
        waitUntil: 'domcontentloaded'
      });
      
      // Wait for login to be completed manually
      console.log('👤 Please complete manual login (including 2FA if required)...');
      console.log('💡 The script will detect when you reach the dashboard');
      
      // Smart waiting for login completion
      await this.waitForLoginCompletion(page);
      
      // Capture the session state
      console.log('💾 Capturing session state...');
      const sessionData = await this.captureSessionData(context, page);
      
      // Save session data
      await this.saveSessionData(sessionData);
      
      console.log('✅ Session captured successfully!');
      
    } catch (error) {
      console.error('❌ Session capture failed:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }
  
  private async waitForLoginCompletion(page: Page): Promise<void> {
    const maxWaitTime = 10 * 60 * 1000; // 10 minutes for manual login
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        // Check for dashboard indicators
        const currentUrl = page.url();
        
        // Check if we're on dashboard or main JIRA page
        if (currentUrl.includes('/dashboard') || 
            currentUrl.includes('/secure/Dashboard.jspa') ||
            (currentUrl.includes('jirauat.smedigitalapps.com') && !currentUrl.includes('login'))) {
          
          // Additional verification - check for JIRA main elements
          const isDashboard = await page.evaluate(() => {
            return document.title.toLowerCase().includes('dashboard') ||
                   document.body.getAttribute('data-aui-page')?.includes('dashboard') ||
                   document.querySelector('#dashboard') !== null ||
                   document.querySelector('.dashboard') !== null;
          });
          
          if (isDashboard) {
            console.log('✅ Login completed - dashboard detected');
            return;
          }
        }
        
        // Check if login form is still visible (means not logged in yet)
        const loginFormExists = await page.locator('form#login-form, form[name="loginform"], input[name="username"], #login').count() > 0;
        
        if (!loginFormExists && !currentUrl.includes('login')) {
          // No login form and not on login page - likely authenticated
          console.log('✅ Login completed - no login form detected');
          return;
        }
        
        // Wait a bit before checking again
        await page.waitForTimeout(5000);
        
      } catch (error) {
        // Continue waiting if there's an error
        console.log('⏳ Waiting for login completion...');
        await page.waitForTimeout(5000);
      }
    }
    
    throw new Error('Login timeout - manual login was not completed within 10 minutes');
  }
  
  private async captureSessionData(context: BrowserContext, page: Page) {
    // Get all cookies
    const cookies = await context.cookies();
    
    // Get local storage and session storage
    const storageData = await page.evaluate(() => {
      const localStorage: Record<string, string> = {};
      const sessionStorage: Record<string, string> = {};
      
      // Capture localStorage
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }
      
      // Capture sessionStorage
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }
      
      return { localStorage, sessionStorage };
    });
    
    // Get current page info
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    // Find JIRA-specific tokens
    const jiraTokens = await page.evaluate(() => {
      const tokens: Record<string, any> = {};
      
      // Look for CSRF tokens
      const csrfToken = document.querySelector('meta[name="atlassian-token"]')?.getAttribute('content');
      if (csrfToken) tokens.csrfToken = csrfToken;
      
      // Look for session info in scripts or data attributes
      const scripts = Array.from(document.scripts);
      for (const script of scripts) {
        if (script.textContent?.includes('JSESSIONID') || script.textContent?.includes('session')) {
          // Extract relevant session info if found
        }
      }
      
      return tokens;
    });
    
    const sessionData = {
      timestamp: new Date().toISOString(),
      captureUrl: currentUrl,
      pageTitle,
      cookies,
      localStorage: storageData.localStorage,
      sessionStorage: storageData.sessionStorage,
      jiraTokens,
      userAgent: await page.evaluate(() => navigator.userAgent),
      environment: 'UAT',
      jiraVersion: '10.3.6'
    };
    
    return sessionData;
  }
  
  private async saveSessionData(sessionData: any): Promise<void> {
    try {
      // Ensure directory exists
      await mkdir('test-results/sessions', { recursive: true });
      
      // Save the session data
      await writeFile(
        SessionManager.SESSION_FILE,
        JSON.stringify(sessionData, null, 2),
        'utf-8'
      );
      
      console.log(`💾 Session data saved to ${SessionManager.SESSION_FILE}`);
      
    } catch (error) {
      console.error('❌ Failed to save session data:', error);
      throw error;
    }
  }
  
  async isSessionValid(): Promise<boolean> {
    try {
      if (!existsSync(SessionManager.SESSION_FILE)) {
        return false;
      }
      
      const sessionData = JSON.parse(await readFile(SessionManager.SESSION_FILE, 'utf-8'));
      const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
      
      // Check if session is not too old
      if (sessionAge > SessionManager.SESSION_TIMEOUT) {
        console.log('⚠️ Session expired (older than 4 hours)');
        return false;
      }
      
      // TODO: Add validation by testing the session with a quick API call
      
      return true;
      
    } catch (error) {
      console.warn('⚠️ Could not validate session:', error);
      return false;
    }
  }
  
  async getSessionState(): Promise<any> {
    try {
      if (!existsSync(SessionManager.SESSION_FILE)) {
        throw new Error('No session file found. Run session capture first.');
      }
      
      const sessionData = JSON.parse(await readFile(SessionManager.SESSION_FILE, 'utf-8'));
      
      // Return Playwright-compatible storage state
      return {
        cookies: sessionData.cookies,
        origins: [{
          origin: 'https://jirauat.smedigitalapps.com',
          localStorage: Object.entries(sessionData.localStorage || {}).map(([name, value]) => ({ name, value })),
          sessionStorage: Object.entries(sessionData.sessionStorage || {}).map(([name, value]) => ({ name, value }))
        }]
      };
      
    } catch (error) {
      console.error('❌ Failed to get session state:', error);
      throw error;
    }
  }
  
  async createAuthenticatedContext(): Promise<BrowserContext> {
    const browser = await chromium.launch({ headless: false });
    const storageState = await this.getSessionState();
    
    const context = await browser.newContext({
      storageState,
      viewport: { width: 1920, height: 1080 }
    });
    
    return context;
  }
} 