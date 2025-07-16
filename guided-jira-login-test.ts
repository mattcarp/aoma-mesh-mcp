import { chromium, Browser, BrowserContext, Page } from 'playwright';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function askForGuidance(message: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`🤔 ${message}\nYour guidance: `, (answer) => {
      resolve(answer);
    });
  });
}

async function waitForUserConfirmation(message: string): Promise<void> {
  return new Promise((resolve) => {
    rl.question(`⏱️ ${message}\nPress ENTER when ready...`, () => {
      resolve();
    });
  });
}

class GuidedJiraLogin {
  private browser!: Browser;
  private context!: BrowserContext;
  private page!: Page;
  
  async setup() {
    console.log('🚀 Setting up browser with VPN access...');
    
    this.browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized'],
      timeout: 60000
    });
    
    this.context = await this.browser.newContext({
      viewport: null,
      ignoreHTTPSErrors: true
    });
    
    this.page = await this.context.newPage();
    
    console.log('✅ Browser ready! Now on VPN and ready to attempt login');
  }

  async attemptLogin() {
    console.log('🔐 Starting guided JIRA UAT login process...');
    
    // Navigate to JIRA UAT
    console.log('📡 Navigating to JIRA UAT...');
    try {
      await this.page.goto('https://jirauat.smedigitalapps.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      console.log('✅ Successfully reached JIRA UAT (VPN working!)');
    } catch (error) {
      console.error('❌ Failed to reach JIRA UAT:', error);
      const guidance = await askForGuidance('Cannot reach JIRA UAT. Should I try a different URL or approach?');
      console.log(`📝 User guidance: ${guidance}`);
      return false;
    }

    // Take screenshot of current state
    await this.page.screenshot({ 
      path: `screenshots/guided-login-step-1-${Date.now()}.png`,
      fullPage: true 
    });

    // Check what we see
    const currentUrl = this.page.url();
    const title = await this.page.title();
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${title}`);

    // Look for login elements
    const loginButtonVisible = await this.page.isVisible('input[type="submit"]') || 
                              await this.page.isVisible('button[type="submit"]') ||
                              await this.page.isVisible('.login-button') ||
                              await this.page.isVisible('#login-submit');

    const usernameFieldVisible = await this.page.isVisible('input[name="username"]') ||
                                await this.page.isVisible('input[name="email"]') ||
                                await this.page.isVisible('#username') ||
                                await this.page.isVisible('#email');

    console.log(`🔍 Login button visible: ${loginButtonVisible}`);
    console.log(`🔍 Username field visible: ${usernameFieldVisible}`);

    if (!usernameFieldVisible && !loginButtonVisible) {
      const guidance = await askForGuidance('No obvious login form detected. What do you see on the page? Should I click something specific?');
      console.log(`📝 User guidance: ${guidance}`);
      
      // Allow manual intervention
      await waitForUserConfirmation('Please manually navigate to the login form if needed. I\'ll wait...');
    }

    // Try to fill credentials if we can find the form
    try {
      console.log('🔤 Attempting to fill login credentials...');
      
      // Try different username field selectors
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]', 
        '#username',
        '#email',
        'input[type="email"]',
        'input[type="text"]'
      ];

      let usernameField: string | null = null;
      for (const selector of usernameSelectors) {
        if (await this.page.isVisible(selector)) {
          usernameField = selector;
          break;
        }
      }

      if (usernameField) {
        console.log(`📧 Found username field: ${usernameField}`);
        const username = process.env.JIRA_USERNAME || process.env.JIRA_EMAIL;
        if (username) {
          await this.page.fill(usernameField, username);
          console.log(`✅ Filled username: ${username.slice(0, 3)}***`);
        }
      }

      // Try to find password field
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]',
        '#password'
      ];

      let passwordField: string | null = null;
      for (const selector of passwordSelectors) {
        if (await this.page.isVisible(selector)) {
          passwordField = selector;
          break;
        }
      }

      if (passwordField) {
        console.log(`🔒 Found password field: ${passwordField}`);
        const password = process.env.JIRA_PASSWORD;
        if (password) {
          await this.page.fill(passwordField, password);
          console.log('✅ Filled password');
        }
      }

      // Take screenshot after filling
      await this.page.screenshot({ 
        path: `screenshots/guided-login-step-2-filled-${Date.now()}.png`,
        fullPage: true 
      });

      const guidance = await askForGuidance('I\'ve attempted to fill the login form. What do you see? Should I click submit, or do you need to handle 2FA/SSO?');
      console.log(`📝 User guidance: ${guidance}`);

      if (guidance.toLowerCase().includes('submit') || guidance.toLowerCase().includes('click')) {
        // Try to submit
        const submitSelectors = [
          'input[type="submit"]',
          'button[type="submit"]',
          '.login-button',
          '#login-submit',
          'button:has-text("Sign in")',
          'button:has-text("Log in")'
        ];

                 let submitButton: string | null = null;
        for (const selector of submitSelectors) {
          if (await this.page.isVisible(selector)) {
            submitButton = selector;
            break;
          }
        }

        if (submitButton) {
          console.log(`🖱️ Clicking submit button: ${submitButton}`);
          await this.page.click(submitButton);
          
          // Wait for navigation or changes
          await this.page.waitForTimeout(3000);
          
          const newUrl = this.page.url();
          console.log(`📍 After submit - URL: ${newUrl}`);
          
          await this.page.screenshot({ 
            path: `screenshots/guided-login-step-3-after-submit-${Date.now()}.png`,
            fullPage: true 
          });
        }
      }

      await waitForUserConfirmation('Please complete any additional authentication steps (2FA, SSO, etc.) manually. I\'ll wait for you to get logged in...');

      // Check if we're logged in
      const finalUrl = this.page.url();
      const finalTitle = await this.page.title();
      console.log(`📍 Final URL: ${finalUrl}`);
      console.log(`📄 Final title: ${finalTitle}`);

      const isLoggedIn = !finalUrl.includes('login') && 
                        !finalUrl.includes('auth') && 
                        (finalUrl.includes('Dashboard') || finalUrl.includes('projects') || finalTitle.includes('JIRA'));

      if (isLoggedIn) {
        console.log('🎉 Login appears successful!');
        
        // Save session
        const cookies = await this.context.cookies();
        const sessionData = {
          cookies,
          url: finalUrl,
          timestamp: new Date().toISOString()
        };
        
        const sessionFile = `jira-guided-session-${Date.now()}.json`;
        await import('fs').then(fs => fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2)));
        console.log(`💾 Saved session to: ${sessionFile}`);
        
        return true;
      } else {
        console.log('❌ Login may not have completed successfully');
        return false;
      }

    } catch (error) {
      console.error('❌ Error during login process:', error);
      const guidance = await askForGuidance('Error occurred during login. What should I try next?');
      console.log(`📝 User guidance: ${guidance}`);
      return false;
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up...');
    rl.close();
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const loginTest = new GuidedJiraLogin();
  
  try {
    await loginTest.setup();
    const success = await loginTest.attemptLogin();
    
    if (success) {
      console.log('✅ Guided login completed successfully!');
      console.log('🎯 Ready to proceed with ITSM testing!');
    } else {
      console.log('❌ Login guidance session completed, but authentication may need more work');
    }
    
  } catch (error) {
    console.error('💥 Error in guided login:', error);
  } finally {
    await loginTest.cleanup();
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => {
      console.log('🏁 Guided login session finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Guided login failed:', error);
      process.exit(1);
    });
}

export { GuidedJiraLogin }; 