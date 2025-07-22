import { Page, expect } from '@playwright/test';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SESSION_FILE = 'uat-jira-session.json';

export async function authenticateJira(page: Page) {
  console.log('🔐 Starting JIRA authentication...');
  
  // Try to load existing session first
  if (fs.existsSync(SESSION_FILE)) {
    try {
      const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      if (sessionData.cookies) {
        await page.context().addCookies(sessionData.cookies);
        console.log('   💾 Loaded saved session');
        
        // Test if session is still valid
        await page.goto('/jira/dashboard.jspa');
        await page.waitForLoadState('networkidle');

        // Check for presence of login indicators
        const needsLogin = await page.evaluate(() => {
          const loginButton = document.querySelector('button, a, input[type="submit"]');
          if (loginButton && loginButton.textContent && loginButton.textContent.match(/log in|sign in/i)) {
            return true;
          }
          const usernameField = document.querySelector('input[placeholder*="username" i], input[placeholder*="email" i]');
          const passwordField = document.querySelector('input[placeholder*="password" i], input[type="password"]');
          // If any login form fields are present, require login
          if (usernameField || passwordField) {
            return true;
          }
          // Otherwise, assume session is valid
          return false;
        });

        if (!needsLogin) {
          console.log('   ✅ Session is valid (no login indicators found)!');
          return;
        }

        console.log('   ⚠️ Session expired or login required, proceeding with fresh login...');
      }
    } catch (error) {
      console.log('   ⚠️ Could not load session, proceeding with fresh login...');
    }
  }
  
  // Fresh login flow
  await page.goto('/jira/login.jsp');
  await page.waitForLoadState('networkidle');
  
  let loginSteps = 0;
  const maxSteps = 8;
  
  while (loginSteps < maxSteps) {
    loginSteps++;
    console.log(`🔍 Login Step ${loginSteps}: Checking current page...`);
    
    await page.waitForTimeout(2000);
    
    const pageInfo = await page.evaluate(() => {
      const url = window.location.href;
      const title = document.title;
      
      // Check for different login scenarios
      const usernameField = document.querySelector('input[placeholder="Username"]');
      const passwordField = document.querySelector('input[type="password"]');
      const emailField = document.querySelector('#i0116');
      const msPasswordField = document.querySelector('#i0118');
      const hasAuthCookie = document.cookie.includes('JSESSIONID') || document.cookie.includes('atlxsid');
      
      let screenType = 'unknown';
      if (hasAuthCookie && url.includes('Dashboard')) {
        screenType = 'logged_in';
      } else if (usernameField && passwordField) {
        screenType = 'jira_login_form';
      } else if (emailField) {
        screenType = 'email';
      } else if (msPasswordField) {
        screenType = 'ms_password';
      } else if (title.includes('verification') || title.includes('approve')) {
        screenType = 'two_factor';
      }
      
      return { screenType, title, url };
    });
    
    console.log(`   Screen: ${pageInfo.screenType}`);
    console.log(`   JIRA_EMAIL from env: ${process.env.JIRA_EMAIL ? 'SET' : 'NOT SET'}`);
    console.log(`   JIRA_PWD from env: ${process.env.JIRA_PWD ? 'SET' : 'NOT SET'}`);
    
    switch (pageInfo.screenType) {
      case 'jira_login_form':
        console.log('   🔑 JIRA login form detected - filling both fields...');
        
        // Fill username
        await page.waitForSelector('input[placeholder="Username"]', { state: 'visible', timeout: 5000 });
        const usernameValue = process.env.JIRA_EMAIL || '';
        console.log(`   Using username: ${usernameValue ? usernameValue.substring(0, 3) + '***' : 'EMPTY'}`);
        await page.fill('input[placeholder="Username"]', usernameValue);
        
        // Fill password
        await page.waitForSelector('input[type="password"]', { state: 'visible', timeout: 5000 });
        const passwordValue = process.env.JIRA_PWD || '';
        console.log(`   Using password: ${passwordValue ? '***' : 'EMPTY'}`);
        await page.fill('input[type="password"]', passwordValue);
        
        // Click login button
        await page.click('button:has-text("Log in"), input[type="submit"]');
        console.log('   ✅ Login form submitted');
        break;
        
      case 'email':
        console.log('   📧 Microsoft email form...');
        await page.waitForSelector('#i0116', { state: 'visible', timeout: 10000 });
        const emailValue = process.env.JIRA_EMAIL || '';
        console.log(`   Using email: ${emailValue ? emailValue.substring(0, 3) + '***' : 'EMPTY'}`);
        await page.fill('#i0116', emailValue);
        await page.click('#idSIButton9');
        console.log('   ✅ Email entered');
        break;
        
      case 'ms_password':
        console.log('   🔒 Microsoft password form...');
        await page.waitForSelector('#i0118', { state: 'visible', timeout: 10000 });
        const msPasswordValue = process.env.JIRA_PWD || '';
        console.log(`   Using password: ${msPasswordValue ? '***' : 'EMPTY'}`);
        await page.fill('#i0118', msPasswordValue);
        await page.click('#idSIButton9');
        console.log('   ✅ Password entered');
        break;
        
      case 'two_factor':
        console.log('   📱 2FA detected - waiting for manual completion...');
        console.log('   ⏳ Please complete 2FA on your device...');
        await page.waitForTimeout(15000);
        break;
        
      case 'logged_in':
        console.log('   ✅ LOGIN SUCCESSFUL!');
        
        // Save session
        const cookies = await page.context().cookies();
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
          cookies,
          timestamp: new Date().toISOString()
        }, null, 2));
        console.log('   💾 Session saved');
        
        return;
        
      default:
        console.log(`   ⏳ Unknown screen (${pageInfo.screenType}), waiting...`);
        await page.waitForTimeout(3000);
        break;
    }
  }
  
  throw new Error('Login failed after maximum attempts');
}

// Helper to wait for JIRA page to load
export async function waitForJiraLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// Helper to verify we're on the correct project
export async function verifyProjectAccess(page: Page, projectKey: string) {
  await page.goto(`/browse/${projectKey}`);
  await waitForJiraLoad(page);
  
  const projectExists = await page.evaluate((key) => {
    const errorElement = document.querySelector('.error, .aui-message-error');
    if (errorElement && errorElement.textContent?.includes('does not exist')) {
      return false;
    }
    return !window.location.href.includes('error');
  }, projectKey);
  
  if (!projectExists) {
    throw new Error(`Project ${projectKey} does not exist or is not accessible`);
  }
} 