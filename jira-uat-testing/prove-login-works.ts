import { chromium } from 'playwright';

async function proveLoginWorks() {
  console.log('🔍 PROVING LOGIN WORKS - TAKING SCREENSHOTS');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'playwright/.auth/jira-uat-user.json'
  });
  const page = await context.newPage();
  
  try {
    console.log('📸 Step 1: Navigate to JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/proof-step1-dashboard.png',
      fullPage: true 
    });
    
    const url1 = page.url();
    const title1 = await page.title();
    console.log(`📄 Dashboard URL: ${url1}`);
    console.log(`📄 Dashboard Title: ${title1}`);
    
    if (url1.includes('login')) {
      console.log('❌ FAILED: Redirected to login page');
      return false;
    }
    
    console.log('📸 Step 2: Try to access ticket creation...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/proof-step2-create-issue.png',
      fullPage: true 
    });
    
    const url2 = page.url();
    const title2 = await page.title();
    console.log(`📄 Create Issue URL: ${url2}`);
    console.log(`📄 Create Issue Title: ${title2}`);
    
    if (url2.includes('login')) {
      console.log('❌ FAILED: Redirected to login page on create issue');
      return false;
    }
    
    console.log('📸 Step 3: Look for authenticated elements...');
    
    // Look for user menu or authenticated indicators
    const userElements = await page.locator('[data-testid="user-menu"], .aui-nav-link, .user-menu, #user-menu-link').count();
    console.log(`🔍 Found ${userElements} user menu elements`);
    
    // Look for create button
    const createElements = await page.locator('button:has-text("Create"), a:has-text("Create"), #create_link').count();
    console.log(`🔍 Found ${createElements} create button elements`);
    
    // Get page content to check for authentication
    const pageText = await page.textContent('body');
    const hasAuthenticatedContent = !pageText.includes('log in') && !pageText.includes('sign in');
    console.log(`🔍 Page has authenticated content: ${hasAuthenticatedContent}`);
    
    if (hasAuthenticatedContent && !url1.includes('login') && !url2.includes('login')) {
      console.log('✅ SUCCESS: Authentication is working!');
      console.log('📸 Screenshots saved:');
      console.log('  - proof-step1-dashboard.png');
      console.log('  - proof-step2-create-issue.png');
      return true;
    } else {
      console.log('❌ FAILED: Authentication not working properly');
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    await page.screenshot({ 
      path: 'jira-uat-testing/screenshots/proof-error.png',
      fullPage: true 
    });
    return false;
  } finally {
    await browser.close();
  }
}

proveLoginWorks().then(success => {
  if (success) {
    console.log('🎉 PROOF COMPLETE: Login authentication works!');
  } else {
    console.log('💥 PROOF FAILED: Authentication not working');
  }
}).catch(console.error);