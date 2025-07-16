import { chromium } from 'playwright';

async function verifyUATAccess() {
  console.log('🔍 VERIFYING UAT ACCESS');
  console.log('======================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Testing UAT connectivity...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    
    const title = await page.title();
    const url = page.url();
    
    console.log(`📝 Page Title: ${title}`);
    console.log(`🔗 Current URL: ${url}`);
    
    if (title.toLowerCase().includes('log') || title.toLowerCase().includes('sign')) {
      console.log('✅ UAT login page accessible - ready for authentication setup!');
    } else {
      console.log('🎉 Already authenticated to UAT!');
    }
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('❌ UAT access failed:', error.message);
    console.log('🔧 Verify VPN connection and UAT URL');
  } finally {
    await browser.close();
  }
}

verifyUATAccess().catch(console.error);
