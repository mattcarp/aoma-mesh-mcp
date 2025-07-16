import { chromium } from 'playwright';
import fs from 'fs';

async function captureUATSession() {
  console.log('🚀 CAPTURING UAT JIRA SESSION ONLY');
  console.log('===================================');
  console.log('✅ UAT URL: https://jirauat.smedigitalapps.com');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to UAT JIRA dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Successfully connected to UAT JIRA!');
    console.log('🔍 Current URL:', page.url());
    
    // Verify we're on UAT
    if (!page.url().includes('jirauat.smedigitalapps.com')) {
      throw new Error('❌ SAFETY VIOLATION: Not on UAT environment!');
    }
    
    // Capture cookies
    const cookies = await context.cookies();
    console.log(`🍪 Found ${cookies.length} cookies`);
    
    // Filter for JIRA-specific cookies
    const jiraCookies = cookies.filter(cookie => 
      cookie.name.includes('JSESSIONID') || 
      cookie.name.includes('XSRF') ||
      cookie.name.includes('atlassian') ||
      cookie.domain.includes('jirauat.smedigitalapps.com')
    );
    
    console.log('📋 UAT JIRA Session Cookies:');
    jiraCookies.forEach(cookie => {
      console.log(`  ${cookie.name}: ${cookie.value.substring(0, 50)}...`);
    });
    
    // Save session data
    const sessionData = {
      url: page.url(),
      timestamp: new Date().toISOString(),
      environment: 'UAT_ONLY',
      cookies: jiraCookies,
      userAgent: await page.evaluate(() => navigator.userAgent),
      domain: 'jirauat.smedigitalapps.com'
    };
    
    const filename = `jira-uat-session-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(sessionData, null, 2));
    
    console.log('💾 UAT Session saved to:', filename);
    console.log('🎯 Ready for UAT testing ONLY!');
    
    // Keep browser open for manual verification
    console.log('');
    console.log('🔍 Browser will stay open for verification.');
    console.log('📝 You can now run UAT tests with this session data.');
    console.log('⌨️  Press Ctrl+C when ready to close.');
    
    // Wait indefinitely until user closes
    await new Promise(() => {});
    
  } catch (error) {
    console.error('❌ Error capturing UAT session:', error);
  } finally {
    await browser.close();
  }
}

captureUATSession().catch(console.error); 