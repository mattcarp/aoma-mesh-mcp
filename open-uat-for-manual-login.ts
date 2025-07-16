import { chromium } from 'playwright';

async function openUATForManualLogin() {
  console.log('🌐 Opening JIRA UAT for manual login...');
  
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-web-security',
      '--auth-server-allowlist=*',
      '--no-sandbox'
    ]
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true
  });

  const page = await context.newPage();
  
  console.log('📍 Navigating to JIRA UAT...');
  await page.goto('https://jirauat.smedigitalapps.com/jira/');
  
  console.log('✅ JIRA UAT is open - please log in manually');
  console.log('🔄 Browser will stay open - tell me "GO" when ready for testing!');
  
  // Keep the browser open indefinitely
  return new Promise(() => {
    // This promise never resolves, keeping the browser open
  });
}

openUATForManualLogin().catch(console.error); 