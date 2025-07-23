import { chromium } from 'playwright';
import fs from 'fs';

interface AuthStatus {
  isAuthenticated: boolean;
  username?: string;
  sessionValid: boolean;
  authMethod: 'SESSION' | 'MANUAL' | 'FAILED';
  authTime?: string;
}

interface LinkTestResult {
  linkText: string;
  href: string;
  selector: string;
  isClickable: boolean;
  destinationStatus: 'SUCCESS' | 'ERROR' | '404' | 'TIMEOUT' | 'REDIRECT' | 'UNTESTED' | 'AUTH_REQUIRED';
  destinationUrl?: string;
  responseTime?: number;
  errorMessage?: string;
  screenshot?: string;
}

interface PageCrawlResult {
  pageName: string;
  pageUrl: string;
  authRequired: boolean;
  totalLinks: number;
  clickableLinks: number;
  brokenLinks: number;
  workingLinks: number;
  unresponsiveLinks: number;
  authBlockedLinks: number;
  linkResults: LinkTestResult[];
  pageScreenshot?: string;
  crawlDuration: number;
}

interface ComprehensiveLinkReport {
  reportTime: string;
  authStatus: AuthStatus;
  totalPages: number;
  totalLinksFound: number;
  totalLinksTested: number;
  overallLinkHealth: string;
  pageResults: PageCrawlResult[];
  summary: {
    workingLinks: number;
    brokenLinks: number;
    unresponsiveLinks: number;
    nonClickableLinks: number;
    authBlockedLinks: number;
  };
  criticalIssues: string[];
  recommendations: string[];
}

class AuthAwareLinkCrawler {
  private sessionData: any = null;
  private authStatus: AuthStatus = {
    isAuthenticated: false,
    sessionValid: false,
    authMethod: 'FAILED'
  };
  private pageResults: PageCrawlResult[] = [];
  
  async loadSession(): Promise<boolean> {
    try {
      const sessionFiles = fs.readdirSync('.').filter(f => 
        f.startsWith('jira-guided-session-') && f.endsWith('.json')
      );

      if (sessionFiles.length === 0) {
        console.log('⚠️ No guided session files found - checking other session files...');
        
        const altSessionFiles = fs.readdirSync('.').filter(f => 
          (f.includes('session') || f.includes('Session')) && f.endsWith('.json')
        );
        
        if (altSessionFiles.length === 0) {
          console.log('❌ No session files found at all');
          return false;
        }

        const latestSession = altSessionFiles.sort().pop()!;
        this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
        console.log(`📁 Loaded fallback session: ${latestSession}`);
        return true;
      }

      const latestSession = sessionFiles.sort().pop()!;
      this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
      console.log(`📁 Loaded guided session: ${latestSession}`);
      return true;
    } catch (error) {
      console.log(`⚠️ Session load failed: ${error.message}`);
      return false;
    }
  }

  async verifyAuthentication(): Promise<AuthStatus> {
    console.log('🔐 VERIFYING AUTHENTICATION STATUS');
    console.log('=================================');
    
    const browser = await chromium.launch({ headless: false });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      // Apply session if available
      if (this.sessionData?.cookies) {
        console.log('   🍪 Applying session cookies...');
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      console.log('   📍 Testing authentication with Dashboard...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Take screenshot to see current state
      const authScreenshot = `auth-verification-${Date.now()}.png`;
      await page.screenshot({ path: authScreenshot, fullPage: true });
      console.log(`   📸 Auth verification screenshot: ${authScreenshot}`);
      
      // Check for authentication indicators
      const currentUrl = page.url();
      const pageContent = await page.content();
      
      // Look for login indicators
      const notLoggedInText = await page.locator('text="You\'re not logged in"').count();
      const loginForm = await page.locator('form[name="loginform"]').count();
      const logInButton = await page.locator('text="Log In"').count();
      
      // Look for authenticated indicators  
      const dashboard = await page.locator('.dashboard').count();
      const userMenu = await page.locator('#header-details-user-fullname').count();
      const logoutLink = await page.locator('text="Log Out"').count();
      
      console.log('   🔍 Authentication indicators:');
      console.log(`      "Not logged in" text: ${notLoggedInText}`);
      console.log(`      Login form: ${loginForm}`);
      console.log(`      Log In button: ${logInButton}`);
      console.log(`      Dashboard: ${dashboard}`);
      console.log(`      User menu: ${userMenu}`);
      console.log(`      Logout link: ${logoutLink}`);
      console.log(`      Current URL: ${currentUrl}`);
      
      let authStatus: AuthStatus;
      
      if (notLoggedInText > 0 || loginForm > 0 || currentUrl.includes('login')) {
        console.log('   ❌ NOT AUTHENTICATED - Login required');
        authStatus = {
          isAuthenticated: false,
          sessionValid: false,
          authMethod: 'FAILED',
          authTime: new Date().toISOString()
        };
      } else if (dashboard > 0 || userMenu > 0 || logoutLink > 0) {
        console.log('   ✅ AUTHENTICATED - Session is valid');
        
        // Try to get username
        let username = 'Unknown';
        try {
          const userElement = await page.locator('#header-details-user-fullname').first();
          if (await userElement.count() > 0) {
            username = await userElement.textContent() || 'Unknown';
          }
        } catch (error) {
          console.log('   ⚠️ Could not extract username');
        }
        
        authStatus = {
          isAuthenticated: true,
          username: username.trim(),
          sessionValid: true,
          authMethod: 'SESSION',
          authTime: new Date().toISOString()
        };
      } else {
        console.log('   ⚠️ UNCERTAIN - Cannot determine auth status clearly');
        authStatus = {
          isAuthenticated: false,
          sessionValid: false,
          authMethod: 'FAILED',
          authTime: new Date().toISOString()
        };
      }
      
      this.authStatus = authStatus;
      return authStatus;
      
    } finally {
      await browser.close();
    }
  }

  async performManualLogin(): Promise<AuthStatus> {
    console.log('🔑 ATTEMPTING MANUAL LOGIN');
    console.log('==========================');
    console.log('   This will open a browser for manual authentication');
    console.log('   Please log in manually and the crawler will continue...');
    
    const browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000 // Slow down for manual interaction
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      const page = await context.newPage();
      
      // Go to login page
      console.log('   📍 Opening login page...');
      await page.goto('https://jirauat.smedigitalapps.com/jira', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      console.log('   ⏳ Please log in manually in the browser...');
      console.log('   ⏳ Waiting up to 2 minutes for manual login...');
      
      // Wait for either dashboard or timeout
      try {
        await page.waitForURL('**/Dashboard.jspa', { timeout: 120000 });
        console.log('   ✅ Login successful! Dashboard detected.');
      } catch (error) {
        console.log('   ⏰ Timeout waiting for login - checking current state...');
      }
      
      // Capture current state
      const authScreenshot = `manual-auth-result-${Date.now()}.png`;
      await page.screenshot({ path: authScreenshot, fullPage: true });
      
      // Save new session if successful
      const currentUrl = page.url();
      const dashboard = await page.locator('.dashboard').count();
      
      if (dashboard > 0 || currentUrl.includes('Dashboard')) {
        console.log('   💾 Saving new session data...');
        
        const cookies = await context.cookies();
        const newSessionData = {
          cookies,
          timestamp: new Date().toISOString(),
          url: currentUrl,
          method: 'manual-login'
        };
        
        const sessionPath = `jira-manual-session-${Date.now()}.json`;
        fs.writeFileSync(sessionPath, JSON.stringify(newSessionData, null, 2));
        console.log(`   📁 Session saved: ${sessionPath}`);
        
        this.sessionData = newSessionData;
        
        const authStatus: AuthStatus = {
          isAuthenticated: true,
          sessionValid: true,
          authMethod: 'MANUAL',
          authTime: new Date().toISOString()
        };
        
        this.authStatus = authStatus;
        return authStatus;
      } else {
        console.log('   ❌ Manual login appears to have failed');
        
        const authStatus: AuthStatus = {
          isAuthenticated: false,
          sessionValid: false,
          authMethod: 'FAILED',
          authTime: new Date().toISOString()
        };
        
        this.authStatus = authStatus;
        return authStatus;
      }
      
    } finally {
      await browser.close();
    }
  }

  async runAuthAwareLinkCrawl(): Promise<ComprehensiveLinkReport> {
    console.log('🕷️ AUTH-AWARE COMPREHENSIVE LINK CRAWLER');
    console.log('========================================');
    console.log('🔐 Ensuring proper authentication before testing links');
    console.log('🔗 Testing every clickable element with auth context');
    console.log('📊 Comprehensive functional coverage with auth awareness');
    
    // Step 1: Load session data
    console.log('\n🔄 STEP 1: Loading session data...');
    await this.loadSession();
    
    // Step 2: Verify authentication
    console.log('\n🔄 STEP 2: Verifying authentication...');
    let authStatus = await this.verifyAuthentication();
    
    // Step 3: Handle authentication if needed
    if (!authStatus.isAuthenticated) {
      console.log('\n🔄 STEP 3: Authentication required - attempting manual login...');
      authStatus = await this.performManualLogin();
      
      if (!authStatus.isAuthenticated) {
        console.log('\n❌ CRITICAL: Cannot proceed without authentication');
        console.log('   Link testing requires valid JIRA session');
        console.log('   Please ensure VPN connection and valid credentials');
        
        return {
          reportTime: new Date().toISOString(),
          authStatus,
          totalPages: 0,
          totalLinksFound: 0,
          totalLinksTested: 0,
          overallLinkHealth: 'BLOCKED - Authentication Required',
          pageResults: [],
          summary: {
            workingLinks: 0,
            brokenLinks: 0,
            unresponsiveLinks: 0,
            nonClickableLinks: 0,
            authBlockedLinks: 0
          },
          criticalIssues: ['Authentication failed - cannot test links without valid session'],
          recommendations: ['Establish valid JIRA session before running link tests', 'Verify VPN connection and credentials']
        };
      }
    }
    
    console.log('\n🔄 STEP 4: Proceeding with authenticated link testing...');
    console.log(`   ✅ Authenticated as: ${authStatus.username || 'Unknown User'}`);
    console.log(`   🔐 Auth method: ${authStatus.authMethod}`);
    
    // Define key JIRA pages to crawl (now with auth)
    const pagesToCrawl = [
      { name: 'Dashboard', url: 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', authRequired: true },
      { name: 'Issue Navigator', url: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa', authRequired: true },
      { name: 'Create Issue', url: 'https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa', authRequired: true },
      { name: 'Projects', url: 'https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa', authRequired: true },
      { name: 'Profile', url: 'https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa', authRequired: true },
      { name: 'Public Pages', url: 'https://jirauat.smedigitalapps.com/jira', authRequired: false }
    ];

    for (const page of pagesToCrawl) {
      console.log(`\n🔍 CRAWLING: ${page.name} ${page.authRequired ? '🔐' : '🌐'}`);
      console.log('='.repeat(60));
      
      try {
        const result = await this.crawlAuthAwarePage(page.name, page.url, page.authRequired);
        this.pageResults.push(result);
        this.printAuthAwarePageSummary(result);
        
        // Brief pause between pages
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`❌ Failed to crawl ${page.name}: ${error.message}`);
        
        // Add error result
        this.pageResults.push({
          pageName: page.name,
          pageUrl: page.url,
          authRequired: page.authRequired,
          totalLinks: 0,
          clickableLinks: 0,
          brokenLinks: 0,
          workingLinks: 0,
          unresponsiveLinks: 0,
          authBlockedLinks: 0,
          linkResults: [],
          crawlDuration: 0
        });
      }
    }

    return this.generateAuthAwareReport();
  }

  private async crawlAuthAwarePage(pageName: string, pageUrl: string, authRequired: boolean): Promise<PageCrawlResult> {
    const startTime = Date.now();
    const browser = await chromium.launch({ headless: false });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      // Apply session if available and auth required
      if (authRequired && this.sessionData?.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      console.log(`   📍 Loading page: ${pageUrl}`);
      await page.goto(pageUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Check if we hit an auth wall
      const notLoggedIn = await page.locator('text="You\'re not logged in"').count();
      if (authRequired && notLoggedIn > 0) {
        console.log(`   🚫 Authentication wall detected on ${pageName}`);
        
        return {
          pageName,
          pageUrl,
          authRequired,
          totalLinks: 0,
          clickableLinks: 0,
          brokenLinks: 0,
          workingLinks: 0,
          unresponsiveLinks: 0,
          authBlockedLinks: 1,
          linkResults: [{
            linkText: 'Page blocked by authentication',
            href: pageUrl,
            selector: 'page',
            isClickable: false,
            destinationStatus: 'AUTH_REQUIRED'
          }],
          crawlDuration: Date.now() - startTime
        };
      }
      
      // Take page screenshot
      const pageScreenshot = `auth-page-${pageName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      await page.screenshot({ path: pageScreenshot, fullPage: true });
      console.log(`   📸 Page screenshot: ${pageScreenshot}`);
      
      // Find all potentially clickable elements (same as before)
      const linkSelectors = [
        'a[href]', 'button', 'input[type="button"]', 'input[type="submit"]',
        '[onclick]', '.aui-button', '.aui-nav-link', '[role="button"]',
        '[tabindex="0"]', '.trigger-label', 'span[title]', 'div[title]'
      ];
      
      const allElements = await page.locator(linkSelectors.join(', ')).all();
      console.log(`   🔍 Found ${allElements.length} potentially clickable elements`);
      
      const linkResults: LinkTestResult[] = [];
      let clickableCount = 0;
      let workingCount = 0;
      let brokenCount = 0;
      let unresponsiveCount = 0;
      let authBlockedCount = 0;
      
      // Test each element (limit to 30 for authenticated pages)
      const testLimit = authRequired ? 30 : 50;
      for (let i = 0; i < Math.min(allElements.length, testLimit); i++) {
        const element = allElements[i];
        
        try {
          console.log(`   🔗 Testing element ${i + 1}/${Math.min(allElements.length, testLimit)}`);
          
          const linkResult = await this.testAuthAwareLinkElement(page, element, i + 1, authRequired);
          linkResults.push(linkResult);
          
          if (linkResult.isClickable) {
            clickableCount++;
            
            switch (linkResult.destinationStatus) {
              case 'SUCCESS':
                workingCount++;
                break;
              case 'ERROR':
              case '404':
                brokenCount++;
                break;
              case 'TIMEOUT':
                unresponsiveCount++;
                break;
              case 'AUTH_REQUIRED':
                authBlockedCount++;
                break;
            }
          }
          
          // Brief pause between link tests
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.log(`   ⚠️ Error testing element ${i + 1}: ${error.message}`);
          
          linkResults.push({
            linkText: 'Error during test',
            href: '',
            selector: 'unknown',
            isClickable: false,
            destinationStatus: 'ERROR',
            errorMessage: error.message
          });
        }
      }
      
      const crawlDuration = Date.now() - startTime;
      
      return {
        pageName,
        pageUrl,
        authRequired,
        totalLinks: allElements.length,
        clickableLinks: clickableCount,
        brokenLinks: brokenCount,
        workingLinks: workingCount,
        unresponsiveLinks: unresponsiveCount,
        authBlockedLinks: authBlockedCount,
        linkResults,
        pageScreenshot,
        crawlDuration
      };
      
    } finally {
      await browser.close();
    }
  }

  private async testAuthAwareLinkElement(page: any, element: any, elementIndex: number, pageAuthRequired: boolean): Promise<LinkTestResult> {
    try {
      // Get element properties (same as before)
      const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
      const linkText = await element.textContent() || '';
      const href = await element.getAttribute('href') || '';
      const title = await element.getAttribute('title') || '';
      const onclick = await element.getAttribute('onclick') || '';
      
      const displayText = linkText.trim() || title.trim() || href || `${tagName}-element`;
      const selector = `${tagName}${href ? `[href="${href}"]` : ''}`;
      
      // Check if element is actually clickable
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      const hasClickHandler = href || onclick || tagName === 'button' || tagName === 'a';
      
      const isClickable = isVisible && isEnabled && hasClickHandler;
      
      console.log(`      📋 "${displayText.substring(0, 30)}..." - ${tagName} - Clickable: ${isClickable}`);
      
      if (!isClickable) {
        return {
          linkText: displayText,
          href,
          selector,
          isClickable: false,
          destinationStatus: 'UNTESTED'
        };
      }
      
      // Test the click action with auth awareness
      if (href && href.startsWith('http')) {
        // External or full URL - test with auth context
        return await this.testAuthAwareUrlDestination(displayText, href, selector, pageAuthRequired);
      } else if (href || onclick) {
        // Internal link or JavaScript - test with click
        return await this.testAuthAwareClickAction(page, element, displayText, href, selector, elementIndex, pageAuthRequired);
      } else {
        return {
          linkText: displayText,
          href,
          selector,
          isClickable: true,
          destinationStatus: 'UNTESTED'
        };
      }
      
    } catch (error) {
      return {
        linkText: 'Error',
        href: '',
        selector: 'unknown',
        isClickable: false,
        destinationStatus: 'ERROR',
        errorMessage: error.message
      };
    }
  }

  private async testAuthAwareUrlDestination(linkText: string, href: string, selector: string, authRequired: boolean): Promise<LinkTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`        🌐 Testing URL with auth context: ${href}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      // Build headers with auth if available
      const headers: any = {};
      if (authRequired && this.sessionData?.cookies) {
        const cookieString = this.sessionData.cookies
          .map((c: any) => `${c.name}=${c.value}`)
          .join('; ');
        headers['Cookie'] = cookieString;
      }
      
      const response = await fetch(href, {
        method: 'HEAD',
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      let destinationStatus: 'SUCCESS' | 'ERROR' | '404' | 'TIMEOUT' | 'REDIRECT' | 'AUTH_REQUIRED';
      
      if (response.status === 401 || response.status === 403) {
        destinationStatus = 'AUTH_REQUIRED';
      } else if (response.status === 404) {
        destinationStatus = '404';
      } else if (response.status >= 400) {
        destinationStatus = 'ERROR';
      } else if (response.status >= 300 && response.status < 400) {
        destinationStatus = 'REDIRECT';
      } else {
        destinationStatus = 'SUCCESS';
      }
      
      console.log(`        ✅ Response: ${response.status} (${responseTime}ms) ${destinationStatus}`);
      
      return {
        linkText,
        href,
        selector,
        isClickable: true,
        destinationStatus,
        destinationUrl: response.url,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        console.log(`        ⏰ Timeout after 10s`);
        return {
          linkText,
          href,
          selector,
          isClickable: true,
          destinationStatus: 'TIMEOUT',
          responseTime,
          errorMessage: 'Request timeout'
        };
      } else {
        console.log(`        ❌ Error: ${error.message}`);
        return {
          linkText,
          href,
          selector,
          isClickable: true,
          destinationStatus: 'ERROR',
          responseTime,
          errorMessage: error.message
        };
      }
    }
  }

  private async testAuthAwareClickAction(page: any, element: any, linkText: string, href: string, selector: string, elementIndex: number, authRequired: boolean): Promise<LinkTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`        🖱️ Testing auth-aware click action`);
      
      // Get current URL before click
      const currentUrl = page.url();
      
      // Create a new page to test the click without affecting main page
      const newPage = await page.context().newPage();
      await newPage.goto(currentUrl);
      
      // Re-find the element on the new page
      const newElement = newPage.locator(selector).nth(0);
      
      if (await newElement.count() === 0) {
        throw new Error('Element not found on test page');
      }
      
      // Click and wait for navigation or response
      await Promise.race([
        newElement.click(),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
      
      // Wait a bit for any navigation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalUrl = newPage.url();
      const responseTime = Date.now() - startTime;
      
      // Check for auth blocks
      const notLoggedIn = await newPage.locator('text="You\'re not logged in"').count();
      const loginForm = await newPage.locator('form[name="loginform"]').count();
      
      // Take screenshot of destination
      const screenshot = `auth-link-destination-${elementIndex}-${Date.now()}.png`;
      await newPage.screenshot({ path: screenshot });
      
      await newPage.close();
      
      let destinationStatus: 'SUCCESS' | 'ERROR' | '404' | 'TIMEOUT' | 'REDIRECT' | 'AUTH_REQUIRED';
      
      if (notLoggedIn > 0 || loginForm > 0) {
        destinationStatus = 'AUTH_REQUIRED';
      } else if (finalUrl === currentUrl) {
        // No navigation occurred - might be JavaScript action
        destinationStatus = 'SUCCESS';
      } else if (finalUrl.includes('error') || finalUrl.includes('404')) {
        destinationStatus = '404';
      } else {
        destinationStatus = 'SUCCESS';
      }
      
      console.log(`        ✅ Click result: ${finalUrl === currentUrl ? 'Same page' : 'Navigated'} (${responseTime}ms) ${destinationStatus}`);
      
      return {
        linkText,
        href,
        selector,
        isClickable: true,
        destinationStatus,
        destinationUrl: finalUrl,
        responseTime,
        screenshot
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.log(`        ❌ Click failed: ${error.message}`);
      
      return {
        linkText,
        href,
        selector,
        isClickable: true,
        destinationStatus: 'ERROR',
        responseTime,
        errorMessage: error.message
      };
    }
  }

  private printAuthAwarePageSummary(result: PageCrawlResult): void {
    console.log(`   📊 PAGE SUMMARY: ${result.pageName} ${result.authRequired ? '🔐' : '🌐'}`);
    console.log(`      Total Elements: ${result.totalLinks}`);
    console.log(`      Clickable Links: ${result.clickableLinks}`);
    console.log(`      ✅ Working: ${result.workingLinks}`);
    console.log(`      🚫 Broken: ${result.brokenLinks}`);
    console.log(`      ⏰ Unresponsive: ${result.unresponsiveLinks}`);
    console.log(`      🔐 Auth Blocked: ${result.authBlockedLinks}`);
    console.log(`      ⏱️ Crawl Time: ${Math.round(result.crawlDuration / 1000)}s`);
    
    // Highlight critical issues
    if (result.brokenLinks > 0) {
      console.log(`      🚨 CRITICAL: ${result.brokenLinks} broken links found!`);
    }
    
    if (result.authBlockedLinks > 0 && !result.authRequired) {
      console.log(`      🚨 AUTH ISSUE: ${result.authBlockedLinks} unexpected auth blocks on public page!`);
    }
  }

  private generateAuthAwareReport(): ComprehensiveLinkReport {
    const totalPages = this.pageResults.length;
    const totalLinksFound = this.pageResults.reduce((sum, page) => sum + page.totalLinks, 0);
    const totalLinksTested = this.pageResults.reduce((sum, page) => sum + page.clickableLinks, 0);
    
    const workingLinks = this.pageResults.reduce((sum, page) => sum + page.workingLinks, 0);
    const brokenLinks = this.pageResults.reduce((sum, page) => sum + page.brokenLinks, 0);
    const unresponsiveLinks = this.pageResults.reduce((sum, page) => sum + page.unresponsiveLinks, 0);
    const authBlockedLinks = this.pageResults.reduce((sum, page) => sum + page.authBlockedLinks, 0);
    const nonClickableLinks = totalLinksFound - totalLinksTested;
    
    const successRate = totalLinksTested > 0 ? Math.round((workingLinks / totalLinksTested) * 100) : 0;
    
    let overallLinkHealth: string;
    if (!this.authStatus.isAuthenticated) {
      overallLinkHealth = 'BLOCKED - Authentication Required';
    } else if (successRate >= 90) {
      overallLinkHealth = `EXCELLENT (${successRate}%)`;
    } else if (successRate >= 75) {
      overallLinkHealth = `GOOD (${successRate}%)`;
    } else if (successRate >= 50) {
      overallLinkHealth = `POOR (${successRate}%)`;
    } else {
      overallLinkHealth = `CRITICAL (${successRate}%)`;
    }
    
    // Generate critical issues with auth awareness
    const criticalIssues: string[] = [];
    
    if (!this.authStatus.isAuthenticated) {
      criticalIssues.push('Authentication failed - comprehensive link testing blocked');
    }
    
    if (brokenLinks > 0) {
      criticalIssues.push(`${brokenLinks} broken links found across ${totalPages} pages`);
    }
    
    if (authBlockedLinks > 0) {
      criticalIssues.push(`${authBlockedLinks} links blocked by authentication issues`);
    }
    
    if (unresponsiveLinks > 0) {
      criticalIssues.push(`${unresponsiveLinks} unresponsive links (timeouts)`);
    }
    
    // Generate recommendations with auth awareness
    const recommendations: string[] = [];
    
    if (!this.authStatus.isAuthenticated) {
      recommendations.push('Establish valid JIRA authentication before running comprehensive link tests');
      recommendations.push('Verify VPN connection and user credentials');
    }
    
    if (brokenLinks > 0) {
      recommendations.push('Fix broken links - these create poor user experience and may block workflows');
    }
    
    if (authBlockedLinks > 0) {
      recommendations.push('Review authentication requirements for blocked links');
    }
    
    if (unresponsiveLinks > 0) {
      recommendations.push('Investigate slow/unresponsive links - may indicate performance issues');
    }
    
    if (nonClickableLinks > 0) {
      recommendations.push('Review non-clickable elements that appear to be links - potential UX improvements');
    }
    
    if (recommendations.length === 0 && this.authStatus.isAuthenticated) {
      recommendations.push('Link ecosystem is healthy - continue monitoring');
    }
    
    return {
      reportTime: new Date().toISOString(),
      authStatus: this.authStatus,
      totalPages,
      totalLinksFound,
      totalLinksTested,
      overallLinkHealth,
      pageResults: this.pageResults,
      summary: {
        workingLinks,
        brokenLinks,
        unresponsiveLinks,
        nonClickableLinks,
        authBlockedLinks
      },
      criticalIssues,
      recommendations
    };
  }

  async saveAndPrintAuthAwareReport(report: ComprehensiveLinkReport): Promise<void> {
    // Save detailed JSON report
    const reportPath = `AUTH-AWARE-LINK-REPORT-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n🕷️ AUTH-AWARE COMPREHENSIVE LINK CRAWL COMPLETE');
    console.log('===============================================');
    console.log(`⏰ Report Time: ${new Date(report.reportTime).toLocaleString()}`);
    console.log(`🔐 Auth Status: ${report.authStatus.isAuthenticated ? '✅ AUTHENTICATED' : '❌ NOT AUTHENTICATED'}`);
    if (report.authStatus.username) {
      console.log(`👤 User: ${report.authStatus.username}`);
    }
    console.log(`🔗 Overall Link Health: ${report.overallLinkHealth}`);

    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`   Pages Crawled: ${report.totalPages}`);
    console.log(`   Links Found: ${report.totalLinksFound}`);
    console.log(`   Links Tested: ${report.totalLinksTested}`);
    console.log(`   ✅ Working Links: ${report.summary.workingLinks}`);
    console.log(`   🚫 Broken Links: ${report.summary.brokenLinks}`);
    console.log(`   ⏰ Unresponsive: ${report.summary.unresponsiveLinks}`);
    console.log(`   🔐 Auth Blocked: ${report.summary.authBlockedLinks}`);
    console.log(`   🔗 Non-Clickable: ${report.summary.nonClickableLinks}`);

    console.log('\n📋 PAGE-BY-PAGE RESULTS:');
    report.pageResults.forEach(page => {
      const authIcon = page.authRequired ? '🔐' : '🌐';
      const healthIcon = page.brokenLinks > 0 ? '🚨' : 
                        page.authBlockedLinks > 0 ? '🔐' :
                        page.unresponsiveLinks > 0 ? '⚠️' : '✅';
      
      console.log(`   ${healthIcon} ${authIcon} ${page.pageName}: ${page.workingLinks}/${page.clickableLinks} working (${page.brokenLinks} broken, ${page.authBlockedLinks} auth blocked)`);
    });

    if (report.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      report.criticalIssues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log(`\n💾 Detailed report saved: ${reportPath}`);
    console.log(`📸 Screenshots available for debugging broken links`);
    console.log(`🔐 Auth-aware functional coverage analysis complete`);
  }
}

// Main execution
async function runAuthAwareLinkCrawl() {
  const crawler = new AuthAwareLinkCrawler();
  
  try {
    console.log('🕷️ Starting auth-aware comprehensive link crawl...');
    const report = await crawler.runAuthAwareLinkCrawl();
    await crawler.saveAndPrintAuthAwareReport(report);
    
  } catch (error) {
    console.error('❌ Auth-aware link crawl failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { AuthAwareLinkCrawler };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAuthAwareLinkCrawl();
} 