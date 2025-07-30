import { chromium } from 'playwright';
import * as fs from 'fs';

async function testJiraAuth() {
  console.log('🚀 STANDALONE JIRA UAT AUTHENTICATION TEST');
  console.log('==========================================');
  
  const browser = await chromium.launch({ headless: false });
  
  try {
    // Load the saved authentication state
    const authFile = 'playwright/.auth/jira-uat-user.json';
    
    if (!fs.existsSync(authFile)) {
      console.log('❌ Authentication file not found:', authFile);
      return;
    }
    
    console.log('✅ Found authentication file');
    
    // Create context with saved authentication
    const context = await browser.newContext({
      storageState: authFile,
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    console.log('🔍 Testing dashboard access...');
    
    // Navigate to JIRA UAT dashboard
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const currentUrl = page.url();
    const title = await page.title();
    
    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`📄 Page title: ${title}`);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'standalone-auth-proof.png', 
      fullPage: true 
    });
    
    // Check if we're authenticated
    const isAuthenticated = !currentUrl.includes('login') && 
                           !currentUrl.includes('auth') && 
                           !currentUrl.includes('saml');
    
    if (isAuthenticated) {
      console.log('🎉 SUCCESS: JIRA UAT authentication is working!');
      console.log('✅ Dashboard accessible without login redirect');
      console.log('✅ Session-based authentication functioning perfectly');
      
      // Test create issue access
      console.log('🎯 Testing create issue access...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      const createUrl = page.url();
      console.log(`📍 Create Issue URL: ${createUrl}`);
      
      const canCreateIssue = !createUrl.includes('login') && !createUrl.includes('auth');
      
      if (canCreateIssue) {
        console.log('🎯 SUCCESS: Can access issue creation!');
      } else {
        console.log('⚠️  WARNING: Cannot access issue creation');
      }
      
    } else {
      console.log('❌ FAILED: Redirected to login/auth page');
      console.log('💡 Session may have expired - need to re-authenticate');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testJiraAuth().catch(console.error);
