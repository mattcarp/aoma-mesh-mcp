import { chromium } from 'playwright';

async function itsmUrlExplorer() {
  console.log('🔍 ITSM URL EXPLORER - FINDING THE RIGHT PATH');
  console.log('============================================');
  console.log('Since Dashboard authentication works, let\'s find the correct ITSM URLs!');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Step 1: Navigate to working Dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    const dashTitle = await page.title();
    console.log(`📝 Dashboard Title: ${dashTitle}`);
    
    if (dashTitle.includes('Log')) {
      console.log('❌ Please log in first and run this script again');
      return;
    }
    
    console.log('✅ Dashboard authentication confirmed!');
    
    // Test different ITSM-related URLs
    const itsmUrls = [
      'https://jirauat.smedigitalapps.com/jira/browse/ITSM',
      'https://jirauat.smedigitalapps.com/jira/issues/?jql=project=ITSM',
      'https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20in%20(ITSM)',
      'https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa',
      'https://jirauat.smedigitalapps.com/jira/secure/ViewProjects.jspa',
      'https://jirauat.smedigitalapps.com/jira/projects/browse',
      'https://jirauat.smedigitalapps.com/jira/secure/ManageProjects.jspa',
      'https://jirauat.smedigitalapps.com/jira/secure/BrowseProject.jspa?id=ITSM'
    ];
    
    const results: any[] = [];
    
    console.log('\n🎯 Testing different ITSM URLs...');
    
    for (let i = 0; i < itsmUrls.length; i++) {
      const url = itsmUrls[i];
      console.log(`\n📍 Test ${i + 1}: ${url}`);
      
      try {
        const startTime = Date.now();
        await page.goto(url, { timeout: 15000 });
        const loadTime = Date.now() - startTime;
        
        await page.waitForTimeout(3000);
        
        const title = await page.title();
        const currentUrl = page.url();
        const isAuthenticated = !title.includes('Log');
        
        console.log(`⏱️  Load Time: ${loadTime}ms`);
        console.log(`📝 Title: ${title}`);
        console.log(`🔗 Final URL: ${currentUrl}`);
        console.log(`✅ Authenticated: ${isAuthenticated}`);
        
        // Try to extract any ITSM-related content
        let contentFound = false;
        if (isAuthenticated) {
          const bodyText = await page.evaluate(() => {
            return document.body.innerText.toLowerCase();
          });
          
          if (bodyText.includes('itsm') || bodyText.includes('service management')) {
            contentFound = true;
            console.log('🎯 ITSM content detected!');
          }
        }
        
        results.push({
          url,
          title,
          finalUrl: currentUrl,
          loadTime,
          authenticated: isAuthenticated,
          contentFound
        });
        
        // Take screenshot if successful
        if (isAuthenticated) {
          await page.screenshot({ 
            path: `itsm-url-test-${i + 1}-${Date.now()}.png`,
            fullPage: true 
          });
          console.log('📸 Screenshot saved');
        }
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
        results.push({
          url,
          error: error.message,
          authenticated: false,
          contentFound: false
        });
      }
    }
    
    // Test project search functionality
    console.log('\n📍 Testing Project Search...');
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa');
      await page.waitForTimeout(3000);
      
      const searchTitle = await page.title();
      if (!searchTitle.includes('Log')) {
        console.log('✅ Project browser accessible!');
        
        // Look for ITSM in project list
        const projectInfo = await page.evaluate(() => {
          const text = document.body.innerText;
          const lines = text.split('\n');
          const itsmLines = lines.filter(line => 
            line.toLowerCase().includes('itsm') || 
            line.toLowerCase().includes('service management')
          );
          
          return {
            allText: text.substring(0, 1000),
            itsmReferences: itsmLines.slice(0, 10)
          };
        });
        
        console.log('🔍 ITSM references found:');
        projectInfo.itsmReferences.forEach(ref => console.log(`   ${ref}`));
        
        await page.screenshot({ 
          path: `project-browser-${Date.now()}.png`,
          fullPage: true 
        });
      }
    } catch (error) {
      console.log(`❌ Project search failed: ${error.message}`);
    }
    
    // Summary
    console.log('\n📊 ITSM URL EXPLORATION RESULTS');
    console.log('================================');
    
    const workingUrls = results.filter(r => r.authenticated);
    const itsmContentUrls = results.filter(r => r.contentFound);
    
    console.log(`✅ Working URLs: ${workingUrls.length}/${results.length}`);
    console.log(`🎯 URLs with ITSM content: ${itsmContentUrls.length}`);
    
    if (workingUrls.length > 0) {
      console.log('\n🎉 WORKING URLS FOUND:');
      workingUrls.forEach((result, i) => {
        console.log(`${i + 1}. ${result.url}`);
        console.log(`   Title: ${result.title}`);
        console.log(`   Load Time: ${result.loadTime}ms`);
        if (result.contentFound) console.log('   🎯 Contains ITSM content!');
      });
    }
    
    if (itsmContentUrls.length > 0) {
      console.log('\n🏆 BEST ITSM ACCESS URLS:');
      itsmContentUrls.forEach(result => {
        console.log(`   ${result.url} - ${result.title}`);
      });
    }
    
    // Save results
    const resultsFile = `itsm-url-exploration-${Date.now()}.json`;
    require('fs').writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`💾 Detailed results saved: ${resultsFile}`);
    
  } catch (error) {
    console.error('❌ ITSM exploration failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for review...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

itsmUrlExplorer().catch(console.error); 