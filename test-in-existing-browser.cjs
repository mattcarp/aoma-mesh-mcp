const { chromium } = require('playwright');

async function testInExistingBrowser() {
  console.log('🧪 TESTING IN YOUR EXISTING LOGGED-IN BROWSER');
  console.log('==============================================');
  console.log('🔒 Using the browser you are ALREADY logged into');
  console.log('❌ NOT opening new Chromium instances');
  
  // Use the saved session from your login
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    storageState: 'current-session.json'
  });
  const page = await context.newPage();
  
  let testCount = 0;
  let passCount = 0;
  let failCount = 0;
  
  async function runTest(testName, testFunction) {
    testCount++;
    console.log(`\n🧪 Test ${testCount}: ${testName}`);
    try {
      await testFunction(page);
      passCount++;
      console.log(`✅ PASSED: ${testName}`);
    } catch (error) {
      failCount++;
      console.log(`❌ FAILED: ${testName} - ${error.message}`);
    }
  }
  
  // Test 1: Dashboard Access
  await runTest('Dashboard Access', async (page) => {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(2000);
    const title = await page.title();
    if (!title.includes('Dashboard')) throw new Error('Not on dashboard');
  });
  
  // Test 2: Create Issue Access
  await runTest('Create Issue Access', async (page) => {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('login')) throw new Error('Redirected to login');
  });
  
  // Test 3: Issue Navigator
  await runTest('Issue Navigator', async (page) => {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa');
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('login')) throw new Error('Redirected to login');
  });
  
  // Test 4: Search Issues
  await runTest('Search Issues', async (page) => {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/QuickSearch.jspa');
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('login')) throw new Error('Redirected to login');
  });
  
  // Test 5: Project Browse
  await runTest('Project Browse', async (page) => {
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa');
    await page.waitForTimeout(2000);
    const url = page.url();
    if (url.includes('login')) throw new Error('Redirected to login');
  });
  
  console.log(`\n🎯 TEST SUMMARY`);
  console.log(`===============`);
  console.log(`Total Tests: ${testCount}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Pass Rate: ${((passCount/testCount)*100).toFixed(1)}%`);
  
  // Keep browser open
  console.log(`\n🔒 Keeping browser open...`);
  console.log(`📢 Tell me when to run more tests!`);
}

testInExistingBrowser(); 