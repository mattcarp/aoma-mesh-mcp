import { chromium } from 'playwright';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VPNStatus {
  connected: boolean;
  vpnType?: string;
  details: string;
}

interface TestAttempt {
  attemptNumber: number;
  timestamp: string;
  passed: boolean;
  duration: number;
  errorMessage?: string;
  details?: string;
}

interface EnhancedTestResult {
  testName: string;
  category: string;
  totalAttempts: number;
  passed: number;
  failed: number;
  successRate: string;
  isFlaky: boolean;
  isConsistentFail: boolean;
  attempts: TestAttempt[];
  conclusion: 'CONSISTENT_PASS' | 'CONSISTENT_FAIL' | 'FLAKY' | 'NEEDS_MORE_DATA';
}

interface ComprehensiveTestReport {
  reportTime: string;
  vpnStatus: VPNStatus;
  overallStats: {
    totalTests: number;
    consistentPasses: number;
    consistentFails: number;
    flakyTests: number;
    overallHealth: string;
  };
  testResults: EnhancedTestResult[];
  recommendations: string[];
  nextActions: string[];
}

class VPNAwareSystematicTester {
  private results: EnhancedTestResult[] = [];
  private sessionData: any = null;
  private readonly RETRY_COUNT = 3;

  async checkVPNStatus(): Promise<VPNStatus> {
    console.log('🔍 CHECKING VPN STATUS');
    console.log('---------------------');
    
    try {
      // Check for Cisco Global Protect (macOS)
      console.log('   📡 Checking Cisco Global Protect...');
      
      try {
        const { stdout: psOutput } = await execAsync('ps aux | grep -i "globalprotect\\|cisco" | grep -v grep');
        if (psOutput.trim()) {
          console.log('   ✅ Cisco Global Protect process detected');
          
          // Try to get more details about the connection
          try {
            const { stdout: ifconfigOutput } = await execAsync('ifconfig | grep -A 5 "utun\\|tun"');
            if (ifconfigOutput.includes('inet ')) {
              const vpnStatus: VPNStatus = {
                connected: true,
                vpnType: 'Cisco Global Protect',
                details: 'VPN tunnel interface active with IP assignment'
              };
              console.log('   🎯 VPN Status: CONNECTED via Cisco Global Protect');
              return vpnStatus;
            }
          } catch (ifconfigError) {
            console.log('   ⚠️ Could not verify tunnel interface');
          }
        }
      } catch (psError) {
        console.log('   ❌ Cisco Global Protect not detected in processes');
      }

      // Check for any VPN interfaces
      try {
        const { stdout: ifconfigOutput } = await execAsync('ifconfig');
        const vpnInterfaces = ifconfigOutput.match(/utun\d+|tun\d+|ppp\d+/g);
        
        if (vpnInterfaces && vpnInterfaces.length > 0) {
          console.log(`   ✅ VPN interfaces detected: ${vpnInterfaces.join(', ')}`);
          
          // Check if any have IP assignments
          const activeVPN = ifconfigOutput.includes('inet ') && 
            (ifconfigOutput.includes('utun') || ifconfigOutput.includes('tun') || ifconfigOutput.includes('ppp'));
          
          if (activeVPN) {
            const vpnStatus: VPNStatus = {
              connected: true,
              vpnType: 'Unknown VPN',
              details: `Active VPN interfaces: ${vpnInterfaces.join(', ')}`
            };
            console.log('   🎯 VPN Status: CONNECTED (Generic VPN detected)');
            return vpnStatus;
          }
        }
      } catch (error) {
        console.log('   ⚠️ Could not check network interfaces');
      }

      // No VPN detected
      const vpnStatus: VPNStatus = {
        connected: false,
        details: 'No VPN connection detected - this may explain connectivity issues'
      };
      console.log('   ❌ VPN Status: NOT CONNECTED');
      return vpnStatus;
      
    } catch (error) {
      console.log(`   ❌ VPN check failed: ${error.message}`);
      return {
        connected: false,
        details: `VPN check error: ${error.message}`
      };
    }
  }

  async loadSession(): Promise<boolean> {
    try {
      const sessionFiles = fs.readdirSync('.').filter(f => 
        f.startsWith('jira-uat-session-') && f.endsWith('.json')
      );

      if (sessionFiles.length === 0) {
        console.log('⚠️ No session files found - will test without authentication');
        return false;
      }

      const latestSession = sessionFiles.sort().pop()!;
      this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
      console.log(`📁 Loaded session: ${latestSession}`);
      return true;
    } catch (error) {
      console.log('⚠️ Session load failed - continuing without session');
      return false;
    }
  }

  async runVPNAwareValidation(): Promise<ComprehensiveTestReport> {
    console.log('🚀 VPN-AWARE SYSTEMATIC TESTING');
    console.log('================================');
    console.log('🔄 Will retry failed tests 3x to detect flaky vs consistent failures');
    console.log('🌐 VPN connectivity awareness for enterprise environments');
    console.log('🎯 Building bulletproof evidence for real issues vs network problems');
    
    // Check VPN status first
    const vpnStatus = await this.checkVPNStatus();
    
    if (!vpnStatus.connected) {
      console.log('\n⚠️  WARNING: No VPN detected!');
      console.log('   Corporate JIRA may require VPN connection');
      console.log('   Test failures may be due to network restrictions');
      console.log('   Consider connecting to Cisco Global Protect VPN\n');
    } else {
      console.log(`\n✅ VPN Connected: ${vpnStatus.vpnType}`);
      console.log('   Ready for enterprise network testing\n');
    }

    await this.loadSession();

    // Define all our tests
    const tests = [
      { name: 'Network Connectivity', category: 'Infrastructure', testFn: () => this.testConnectivity() },
      { name: 'Basic Page Access', category: 'Infrastructure', testFn: () => this.testBasicAccess() },
      { name: 'Login Page Elements', category: 'UI/UX', testFn: () => this.testLoginPageElements() },
      { name: 'Can\'t Log In Clickability', category: 'UI/UX', testFn: () => this.testCantLoginClickability() },
      { name: 'Session Authentication', category: 'Authentication', testFn: () => this.testAuthentication() },
      { name: 'Dashboard Navigation', category: 'Navigation', testFn: () => this.testNavigation() },
      { name: 'Create Button Accessibility', category: 'Core Functions', testFn: () => this.testCreateButtonAccess() },
      { name: 'Ticket Creation Form', category: 'Core Functions', testFn: () => this.testTicketCreationForm() },
      { name: 'Ticket Submission', category: 'Core Functions', testFn: () => this.testTicketSubmission() }
    ];

    // Run each test with retry logic
    for (const test of tests) {
      console.log(`\n🔍 TESTING: ${test.name}`);
      console.log('='.repeat(50));
      
      const result = await this.runTestWithRetries(test.name, test.category, test.testFn);
      this.results.push(result);
      
      // Show immediate results
      this.printTestSummary(result);
      
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return this.generateComprehensiveReport(vpnStatus);
  }

  private async runTestWithRetries(
    testName: string, 
    category: string, 
    testFunction: () => Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }>
  ): Promise<EnhancedTestResult> {
    
    const attempts: TestAttempt[] = [];
    
    for (let i = 1; i <= this.RETRY_COUNT; i++) {
      console.log(`   📋 Attempt ${i}/${this.RETRY_COUNT}:`);
      
      const startTime = Date.now();
      try {
        const testResult = await testFunction();
        
        const attempt: TestAttempt = {
          attemptNumber: i,
          timestamp: new Date().toISOString(),
          passed: testResult.passed,
          duration: testResult.duration,
          errorMessage: testResult.errorMessage,
          details: testResult.details
        };
        
        attempts.push(attempt);
        
        const status = testResult.passed ? '✅ PASS' : '❌ FAIL';
        const time = Math.round(testResult.duration / 1000);
        console.log(`      Result: ${status} (${time}s)`);
        
        if (testResult.errorMessage && !testResult.passed) {
          console.log(`      Error: ${testResult.errorMessage.substring(0, 100)}...`);
        }
        
        // If test passes, we can stop retrying
        if (testResult.passed && i === 1) {
          console.log(`   🎯 Test passed on first attempt - no retries needed`);
          break;
        }
        
        // Wait between retries
        if (i < this.RETRY_COUNT) {
          console.log(`   ⏳ Waiting 10 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
      } catch (error) {
        const attempt: TestAttempt = {
          attemptNumber: i,
          timestamp: new Date().toISOString(),
          passed: false,
          duration: Date.now() - startTime,
          errorMessage: error.message,
          details: 'Unexpected error during test execution'
        };
        
        attempts.push(attempt);
        console.log(`      Result: ❌ ERROR (${Math.round((Date.now() - startTime) / 1000)}s)`);
        console.log(`      Error: ${error.message.substring(0, 100)}...`);
        
        if (i < this.RETRY_COUNT) {
          console.log(`   ⏳ Waiting 10 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    // Analyze the attempts
    const passed = attempts.filter(a => a.passed).length;
    const failed = attempts.filter(a => !a.passed).length;
    const total = attempts.length;
    const successRate = `${Math.round((passed / total) * 100)}%`;

    // Determine if test is flaky or consistently failing
    const isFlaky = passed > 0 && failed > 0;
    const isConsistentFail = passed === 0;
    
    let conclusion: 'CONSISTENT_PASS' | 'CONSISTENT_FAIL' | 'FLAKY' | 'NEEDS_MORE_DATA';
    if (passed === total) {
      conclusion = 'CONSISTENT_PASS';
    } else if (passed === 0) {
      conclusion = 'CONSISTENT_FAIL';
    } else {
      conclusion = 'FLAKY';
    }

    return {
      testName,
      category,
      totalAttempts: total,
      passed,
      failed,
      successRate,
      isFlaky,
      isConsistentFail,
      attempts,
      conclusion
    };
  }

  private async testConnectivity(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const passed = response.status < 500; // Any response under 500 is connectivity success
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Server responded with status ${response.status}`,
        errorMessage: passed ? undefined : `Server error: ${response.status}`
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Network connectivity test failed'
      };
    }
  }

  private async testBasicAccess(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      const title = await page.title();
      const passed = title.toLowerCase().includes('jira') || title.toLowerCase().includes('login') || title.toLowerCase().includes('dashboard');
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Page title: "${title}"`,
        errorMessage: passed ? undefined : `Unexpected page content: ${title}`
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Failed to load basic JIRA page'
      };
    } finally {
      await browser.close();
    }
  }

  private async testLoginPageElements(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      // Check for login form elements
      const usernameField = await page.locator('#username, input[name="username"], #login-form-username').count();
      const passwordField = await page.locator('#password, input[name="password"], #login-form-password').count();
      const loginButton = await page.locator('input[type="submit"], button[type="submit"], #login-form-submit').count();
      
      const hasLoginElements = usernameField > 0 && passwordField > 0 && loginButton > 0;
      
      return {
        passed: hasLoginElements,
        duration: Date.now() - startTime,
        details: `Found: ${usernameField} username fields, ${passwordField} password fields, ${loginButton} submit buttons`,
        errorMessage: hasLoginElements ? undefined : 'Login form elements not found'
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Failed to analyze login page elements'
      };
    } finally {
      await browser.close();
    }
  }

  private async testCantLoginClickability(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    const browser = await chromium.launch({ headless: false }); // Keep visible to debug this specific test
    
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      // Take a screenshot to debug the page content
      const screenshotPath = `cant-login-test-debug-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`      📸 Debug screenshot: ${screenshotPath}`);
      
      // Look for "Can't Log In" or similar text - expanded search
      const cantLoginSelectors = [
        'text="Can\'t Log In"',
        'text="Cannot Log In"',
        'text="Forgot Password"',
        'text="Help"',
        'text="Can\'t log in"',
        'text="cannot log in"',
        'text="forgot password"',
        'text="help"',
        'a[href*="help"]',
        'a[href*="forgot"]',
        'a[href*="password"]',
        'a[href*="support"]',
        '*:has-text("can\'t")',
        '*:has-text("cannot")',
        '*:has-text("forgot")',
        '*:has-text("help")'
      ];
      
      let foundElement = null;
      let elementText = '';
      let isClickable = false;
      let selector = '';
      
      for (const sel of cantLoginSelectors) {
        try {
          const element = page.locator(sel).first();
          if (await element.count() > 0) {
            foundElement = element;
            elementText = await element.textContent() || '';
            selector = sel;
            
            // Check if it's clickable (has href, onclick, or is a button)
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            const hasHref = await element.evaluate(el => el.hasAttribute('href'));
            const hasOnClick = await element.evaluate(el => el.hasAttribute('onclick') || el.onclick !== null);
            
            isClickable = tagName === 'a' || tagName === 'button' || hasHref || hasOnClick;
            
            console.log(`      🔍 Found "${elementText.trim()}" via ${sel}`);
            console.log(`      📋 Tag: ${tagName}, Href: ${hasHref}, Clickable: ${isClickable}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }
      
      if (!foundElement) {
        // Get page content for debugging
        const pageContent = await page.content();
        const hasLoginForm = pageContent.includes('username') || pageContent.includes('password') || pageContent.includes('login');
        
        return {
          passed: false,
          duration: Date.now() - startTime,
          errorMessage: 'No "Can\'t Log In" or help text found on page',
          details: `Page appears to be ${hasLoginForm ? 'login page' : 'unknown page'}. Screenshot: ${screenshotPath}`
        };
      }
      
      // Test passes if element is found AND is clickable, fails if found but not clickable
      const passed = isClickable;
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Found "${elementText.trim()}" via selector "${selector}" - ${isClickable ? 'IS clickable' : 'NOT clickable'}. Screenshot: ${screenshotPath}`,
        errorMessage: passed ? undefined : `"${elementText.trim()}" text exists but is not clickable - UX ISSUE CONFIRMED`
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Failed to test Can\'t Log In clickability'
      };
    } finally {
      await browser.close();
    }
  }

  // [Additional test methods remain the same as before - testAuthentication, testNavigation, etc.]
  private async testAuthentication(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    
    if (!this.sessionData) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: 'No session data available',
        details: 'Cannot test authentication without session cookies'
      };
    }

    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      const url = page.url();
      const passed = url.includes('Dashboard.jspa') && !url.includes('login');
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Final URL: ${url}`,
        errorMessage: passed ? undefined : 'Session expired - redirected to login'
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Authentication test failed'
      };
    } finally {
      await browser.close();
    }
  }

  private async testNavigation(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    
    if (!this.sessionData) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: 'No session data available',
        details: 'Cannot test navigation without authentication'
      };
    }

    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Check for key navigation elements
      const createButton = await page.locator('text=Create').count();
      const issuesMenu = await page.locator('text=Issues').count();
      const projectsMenu = await page.locator('text=Projects').count();
      
      const navigationScore = createButton + issuesMenu + projectsMenu;
      const passed = navigationScore >= 2; // At least 2 out of 3 key elements
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Found ${navigationScore}/3 key navigation elements (Create: ${createButton}, Issues: ${issuesMenu}, Projects: ${projectsMenu})`,
        errorMessage: passed ? undefined : 'Key navigation elements missing from dashboard'
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Navigation test failed'
      };
    } finally {
      await browser.close();
    }
  }

  private async testCreateButtonAccess(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    
    if (!this.sessionData) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: 'No session data available',
        details: 'Cannot test Create button without authentication'
      };
    }

    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Find and test Create button
      const createButton = page.locator('text=Create').first();
      const buttonExists = await createButton.count() > 0;
      
      if (!buttonExists) {
        return {
          passed: false,
          duration: Date.now() - startTime,
          errorMessage: 'Create button not found',
          details: 'Create button is not visible on dashboard'
        };
      }
      
      // Test if button is clickable
      const isVisible = await createButton.isVisible();
      const isEnabled = await createButton.isEnabled();
      
      const passed = buttonExists && isVisible && isEnabled;
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Create button - Exists: ${buttonExists}, Visible: ${isVisible}, Enabled: ${isEnabled}`,
        errorMessage: passed ? undefined : 'Create button exists but is not accessible'
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Create button access test failed'
      };
    } finally {
      await browser.close();
    }
  }

  private async testTicketCreationForm(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    
    if (!this.sessionData) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: 'No session data available',
        details: 'Cannot test ticket creation form without authentication'
      };
    }

    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Click Create button
      const createButton = page.locator('text=Create').first();
      await createButton.click();
      
      // Wait for create dialog
      await page.waitForSelector('#create-issue-dialog', { timeout: 30000 });
      
      // Check for key form elements
      const projectField = await page.locator('#project-field').count();
      const issueTypeField = await page.locator('#issuetype-field').count();
      const summaryField = await page.locator('#summary').count();
      const submitButton = await page.locator('#create-issue-submit').count();
      
      const formScore = projectField + issueTypeField + summaryField + submitButton;
      const passed = formScore >= 3; // At least 3 out of 4 key form elements
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: `Form elements found: Project(${projectField}), IssueType(${issueTypeField}), Summary(${summaryField}), Submit(${submitButton}) - Score: ${formScore}/4`,
        errorMessage: passed ? undefined : 'Essential form elements missing from ticket creation dialog'
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Ticket creation form test failed'
      };
    } finally {
      await browser.close();
    }
  }

  private async testTicketSubmission(): Promise<{ passed: boolean; duration: number; errorMessage?: string; details?: string }> {
    const startTime = Date.now();
    
    if (!this.sessionData) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: 'No session data available',
        details: 'Cannot test ticket submission without authentication'
      };
    }

    const browser = await chromium.launch({ headless: true });
    
    try {
      const context = await browser.newContext();
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Click Create button
      const createButton = page.locator('text=Create').first();
      await createButton.click();
      
      // Wait for create dialog
      await page.waitForSelector('#create-issue-dialog', { timeout: 30000 });
      
      // Fill summary field
      const summaryField = page.locator('#summary');
      await summaryField.fill('VPN-AWARE TEST - Submission Validation');
      
      // Click submit and test response
      const submitButton = page.locator('#create-issue-submit').first();
      await submitButton.click();
      
      // Wait for either success or timeout (45 second limit for this test)
      const submissionResult = await Promise.race([
        page.waitForURL(/\/browse\/ITSM-/, { timeout: 45000 }).then(() => 'success'),
        page.waitForSelector('.issue-header', { timeout: 45000 }).then(() => 'success'),
        new Promise(resolve => setTimeout(() => resolve('timeout'), 45000))
      ]);
      
      const passed = submissionResult === 'success';
      
      return {
        passed,
        duration: Date.now() - startTime,
        details: passed ? 'Ticket submitted successfully' : 'Ticket submission timed out after 45 seconds',
        errorMessage: passed ? undefined : 'Ticket submission failed - timeout after 45 seconds'
      };
      
    } catch (error) {
      return {
        passed: false,
        duration: Date.now() - startTime,
        errorMessage: error.message,
        details: 'Ticket submission test failed'
      };
    } finally {
      await browser.close();
    }
  }

  private printTestSummary(result: EnhancedTestResult): void {
    console.log(`   📊 SUMMARY: ${result.testName}`);
    console.log(`      Success Rate: ${result.successRate} (${result.passed}/${result.totalAttempts})`);
    console.log(`      Conclusion: ${result.conclusion}`);
    
    if (result.isFlaky) {
      console.log(`      🔄 FLAKY TEST DETECTED - inconsistent results across attempts`);
    } else if (result.isConsistentFail) {
      console.log(`      🚨 CONSISTENT FAILURE - reliable reproduction`);
    } else {
      console.log(`      ✅ CONSISTENT BEHAVIOR`);
    }
  }

  private generateComprehensiveReport(vpnStatus: VPNStatus): ComprehensiveTestReport {
    const consistentPasses = this.results.filter(r => r.conclusion === 'CONSISTENT_PASS').length;
    const consistentFails = this.results.filter(r => r.conclusion === 'CONSISTENT_FAIL').length;
    const flakyTests = this.results.filter(r => r.conclusion === 'FLAKY').length;
    const totalTests = this.results.length;
    
    const totalPassed = this.results.reduce((sum, r) => sum + r.passed, 0);
    const totalAttempts = this.results.reduce((sum, r) => sum + r.totalAttempts, 0);
    const overallSuccessRate = Math.round((totalPassed / totalAttempts) * 100);
    
    let overallHealth: string;
    if (overallSuccessRate >= 80) {
      overallHealth = `HEALTHY (${overallSuccessRate}%)`;
    } else if (overallSuccessRate >= 50) {
      overallHealth = `DEGRADED (${overallSuccessRate}%)`;
    } else if (overallSuccessRate > 0) {
      overallHealth = `CRITICAL (${overallSuccessRate}%)`;
    } else {
      overallHealth = `COMPLETE FAILURE (0%)`;
    }

    // Generate actionable recommendations
    const recommendations: string[] = [];
    const nextActions: string[] = [];

    // VPN-specific recommendations
    if (!vpnStatus.connected && consistentFails > 0) {
      recommendations.push('NETWORK: Test failures may be due to missing VPN connection - verify Cisco Global Protect');
    }

    // Analyze consistent failures
    const criticalFails = this.results.filter(r => r.conclusion === 'CONSISTENT_FAIL');
    if (criticalFails.length > 0) {
      recommendations.push(`CRITICAL: ${criticalFails.length} tests show consistent failure - investigate if real issues or network problems`);
      criticalFails.forEach(test => {
        nextActions.push(`Investigate: ${test.testName} (${test.category}) - consistent failure across ${test.totalAttempts} attempts`);
      });
    }

    // Analyze flaky tests
    if (flakyTests > 0) {
      recommendations.push(`WARNING: ${flakyTests} flaky tests detected - investigate for timing or environmental issues`);
      this.results.filter(r => r.isFlaky).forEach(test => {
        nextActions.push(`Debug: ${test.testName} - flaky behavior (${test.successRate} success rate)`);
      });
    }

    // Infrastructure vs application issues
    const infraFailures = this.results.filter(r => r.category === 'Infrastructure' && r.conclusion === 'CONSISTENT_FAIL').length;
    if (infraFailures > 0) {
      recommendations.push(`INFRASTRUCTURE: ${infraFailures} infrastructure issues detected - check network, VPN, servers`);
    }

    const uiFailures = this.results.filter(r => r.category === 'UI/UX' && r.conclusion === 'CONSISTENT_FAIL').length;
    if (uiFailures > 0) {
      recommendations.push(`UX ISSUES: ${uiFailures} user interface problems found - needs development attention`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests showing expected behavior - continue monitoring');
      nextActions.push('Monitor system health and run periodic validation');
    }

    return {
      reportTime: new Date().toISOString(),
      vpnStatus,
      overallStats: {
        totalTests,
        consistentPasses,
        consistentFails,
        flakyTests,
        overallHealth
      },
      testResults: this.results,
      recommendations,
      nextActions
    };
  }

  async saveAndPrintReport(report: ComprehensiveTestReport): Promise<void> {
    // Save detailed JSON report
    const reportPath = `VPN-AWARE-TEST-REPORT-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n🎯 VPN-AWARE SYSTEMATIC TEST RESULTS');
    console.log('====================================');
    console.log(`⏰ Report Time: ${new Date(report.reportTime).toLocaleString()}`);
    console.log(`🌐 VPN Status: ${report.vpnStatus.connected ? '✅ Connected' : '❌ Not Connected'} - ${report.vpnStatus.details}`);
    console.log(`🎯 Overall System Health: ${report.overallStats.overallHealth}`);

    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`   Total Tests: ${report.overallStats.totalTests}`);
    console.log(`   ✅ Consistent Passes: ${report.overallStats.consistentPasses}`);
    console.log(`   🚨 Consistent Failures: ${report.overallStats.consistentFails}`);
    console.log(`   🔄 Flaky Tests: ${report.overallStats.flakyTests}`);

    console.log('\n📋 DETAILED TEST RESULTS:');
    report.testResults.forEach(test => {
      const statusIcon = test.conclusion === 'CONSISTENT_PASS' ? '✅' : 
                        test.conclusion === 'CONSISTENT_FAIL' ? '🚨' : 
                        test.conclusion === 'FLAKY' ? '🔄' : '❓';
      
      console.log(`   ${statusIcon} ${test.testName} (${test.category}): ${test.successRate} - ${test.conclusion}`);
    });

    console.log('\n🎯 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log('\n📋 NEXT ACTIONS:');
    report.nextActions.forEach(action => {
      console.log(`   → ${action}`);
    });

    console.log(`\n💾 Detailed report saved: ${reportPath}`);
    console.log(`📊 Ready for stakeholder review and action planning`);
  }
}

// Main execution
async function runVPNAwareSystematicTesting() {
  const tester = new VPNAwareSystematicTester();
  
  try {
    console.log('🚀 Starting VPN-aware systematic testing...');
    const report = await tester.runVPNAwareValidation();
    await tester.saveAndPrintReport(report);
    
  } catch (error) {
    console.error('❌ VPN-aware systematic testing failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { VPNAwareSystematicTester };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runVPNAwareSystematicTesting();
} 