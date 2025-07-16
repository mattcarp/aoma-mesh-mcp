import { chromium } from 'playwright';
import * as fs from 'fs';

// JIRA 10.3.x Headers
const JIRA_HEADERS = {
  'X-Atlassian-Token': 'no-check',
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function pushThroughITSM() {
  console.log('🚀 PUSH THROUGH ITSM - EXHAUSTIVE APPROACH');
  console.log('=========================================');
  console.log('Trying every possible method to get ITSM data!');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300,
    args: ['--disable-web-security', '--auth-server-allowlist=*', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    extraHTTPHeaders: JIRA_HEADERS
  });
  
  const page = await context.newPage();
  const results = {
    timestamp: new Date().toISOString(),
    approaches: [] as any[]
  };
  
  try {
    // Step 1: Get authenticated on Dashboard
    console.log('📍 Step 1: Authenticate on Dashboard...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(5000);
    
    const dashTitle = await page.title();
    if (dashTitle.includes('Log')) {
      console.log('❌ Please log in first and run this script again');
      return;
    }
    
    console.log('✅ Dashboard authenticated');
    
    // Approach 1: Direct API calls from authenticated context
    console.log('\n🎯 Approach 1: Direct API calls...');
    try {
      const apiResults = await page.evaluate(async () => {
        const endpoints = [
          '/jira/rest/api/2/search?jql=project=ITSM&maxResults=1',
          '/jira/rest/api/2/project/ITSM',
          '/jira/rest/api/2/project',
          '/jira/rest/api/2/search?jql=project%20in%20(ITSM)&maxResults=1',
          '/jira/rest/api/2/issue/ITSM-1',
          '/jira/rest/api/2/project/ITSM/components',
          '/jira/rest/api/2/search?jql=key=ITSM-1'
        ];
        
                 const results: any[] = [];
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              headers: {
                'X-Atlassian-Token': 'no-check',
                'Accept': 'application/json'
              }
            });
            
            const data = response.ok ? await response.json() : null;
            results.push({
              endpoint,
              status: response.status,
              success: response.ok,
              data: data ? JSON.stringify(data).substring(0, 500) : null
            });
          } catch (error) {
            results.push({
              endpoint,
              error: error.message,
              success: false
            });
          }
        }
        return results;
      });
      
      console.log('📊 API Results:');
      apiResults.forEach(result => {
        if (result.success) {
          console.log(`✅ ${result.endpoint} - Status: ${result.status}`);
          if (result.data) console.log(`   Data: ${result.data.substring(0, 100)}...`);
        } else {
          console.log(`❌ ${result.endpoint} - ${result.error || `Status: ${result.status}`}`);
        }
      });
      
      results.approaches.push({
        name: 'Direct API calls',
        success: apiResults.some(r => r.success),
        results: apiResults
      });
      
    } catch (error) {
      console.log(`❌ API approach failed: ${error.message}`);
    }
    
    // Approach 2: Issue Navigator variations
    console.log('\n🎯 Approach 2: Issue Navigator variations...');
    const navUrls = [
      'https://jirauat.smedigitalapps.com/jira/issues/',
      'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa',
      'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa?mode=hide',
      'https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC',
      'https://jirauat.smedigitalapps.com/jira/issues/?jql=assignee%20%3D%20currentUser()',
      'https://jirauat.smedigitalapps.com/jira/secure/QuickSearch.jspa',
    ];
    
    for (const url of navUrls) {
      try {
        console.log(`📍 Testing: ${url.split('/').pop()}`);
        await page.goto(url, { timeout: 15000 });
        await page.waitForTimeout(3000);
        
        const title = await page.title();
        const isAuth = !title.includes('Log');
        
        if (isAuth) {
          console.log(`✅ ${url} - Accessible: ${title}`);
          
          // Try to search for ITSM from here
          try {
            await page.fill('input[name="jqlQuery"], #jqltext, .search-input', 'project = ITSM');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(5000);
            
            const searchTitle = await page.title();
            const searchAuth = !searchTitle.includes('Log');
            
            if (searchAuth) {
              console.log(`🎯 ITSM search successful from ${url.split('/').pop()}`);
              await page.screenshot({ path: `itsm-search-success-${Date.now()}.png` });
              
              // Extract results
              const searchResults = await page.evaluate(() => {
                const text = document.body.innerText;
                const lines = text.split('\n');
                const itsmLines = lines.filter(line => 
                  line.toLowerCase().includes('itsm') || 
                  /\d+.*of.*\d+/.test(line) ||
                  /showing.*\d+/.test(line)
                );
                return itsmLines.slice(0, 10);
              });
              
              console.log('📋 Search results found:');
              searchResults.forEach(result => console.log(`   ${result}`));
              
              results.approaches.push({
                name: `Issue Navigator - ${url.split('/').pop()}`,
                success: true,
                url,
                title: searchTitle,
                results: searchResults
              });
              
            } else {
              console.log(`❌ Search failed from ${url.split('/').pop()}`);
            }
          } catch (searchError) {
            console.log(`⚠️ Search attempt failed: ${searchError.message}`);
          }
        } else {
          console.log(`❌ ${url} - Not accessible: ${title}`);
        }
      } catch (error) {
        console.log(`❌ ${url} failed: ${error.message}`);
      }
    }
    
    // Approach 3: Project browsing
    console.log('\n🎯 Approach 3: Project browsing...');
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa');
      await page.waitForTimeout(5000);
      
      const projectTitle = await page.title();
      if (!projectTitle.includes('Log')) {
        console.log('✅ Project browser accessible');
        
        // Look for ITSM project
        const projectData = await page.evaluate(() => {
          const text = document.body.innerText;
          const lines = text.split('\n');
          
          // Look for project links and ITSM references
          const projectLines = lines.filter(line => 
            line.toLowerCase().includes('itsm') ||
            line.toLowerCase().includes('service management') ||
            line.toLowerCase().includes('project')
          );
          
          // Try to find clickable project elements
          const projectLinks = Array.from(document.querySelectorAll('a')).filter(a => 
            a.textContent?.toLowerCase().includes('itsm') ||
            a.href?.toLowerCase().includes('itsm')
          ).map(a => ({
            text: a.textContent,
            href: a.href
          }));
          
          return {
            projectLines: projectLines.slice(0, 10),
            projectLinks: projectLinks.slice(0, 5),
            allProjects: lines.filter(line => line.match(/^[A-Z]{2,10}$/)).slice(0, 20)
          };
        });
        
        console.log('📊 Project browser data:');
        console.log('ITSM references:', projectData.projectLines);
        console.log('ITSM links:', projectData.projectLinks);
        console.log('All projects found:', projectData.allProjects);
        
        await page.screenshot({ path: `project-browser-${Date.now()}.png`, fullPage: true });
        
        results.approaches.push({
          name: 'Project Browser',
          success: true,
          data: projectData
        });
        
        // Try clicking ITSM links if found
        if (projectData.projectLinks.length > 0) {
          for (const link of projectData.projectLinks) {
            try {
              console.log(`🔗 Clicking ITSM link: ${link.text}`);
              await page.click(`text="${link.text}"`);
              await page.waitForTimeout(5000);
              
              const linkTitle = await page.title();
              if (!linkTitle.includes('Log')) {
                console.log(`✅ ITSM link successful: ${linkTitle}`);
                await page.screenshot({ path: `itsm-link-success-${Date.now()}.png` });
                break;
              }
            } catch (linkError) {
              console.log(`⚠️ ITSM link failed: ${linkError.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`❌ Project browsing failed: ${error.message}`);
    }
    
    // Approach 4: Quick Search
    console.log('\n🎯 Approach 4: Quick Search...');
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/QuickSearch.jspa');
      await page.waitForTimeout(3000);
      
      const quickTitle = await page.title();
      if (!quickTitle.includes('Log')) {
        console.log('✅ Quick Search accessible');
        
        // Try searching for ITSM
        await page.fill('input[name="searchString"], #quickSearchInput', 'ITSM');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
        
        const searchTitle = await page.title();
        if (!searchTitle.includes('Log')) {
          console.log('✅ Quick Search for ITSM successful');
          await page.screenshot({ path: `quick-search-itsm-${Date.now()}.png`, fullPage: true });
          
          const quickResults = await page.evaluate(() => {
            return document.body.innerText.substring(0, 1000);
          });
          
          results.approaches.push({
            name: 'Quick Search',
            success: true,
            results: quickResults
          });
        }
      }
    } catch (error) {
      console.log(`❌ Quick Search failed: ${error.message}`);
    }
    
    // Final Summary
    console.log('\n🎉 PUSH THROUGH RESULTS');
    console.log('=======================');
    
    const successfulApproaches = results.approaches.filter(a => a.success);
    console.log(`✅ Successful approaches: ${successfulApproaches.length}/${results.approaches.length}`);
    
    if (successfulApproaches.length > 0) {
      console.log('\n🏆 WORKING METHODS:');
      successfulApproaches.forEach((approach, i) => {
        console.log(`${i + 1}. ${approach.name}`);
        if (approach.results) {
          console.log(`   Results: ${JSON.stringify(approach.results).substring(0, 200)}...`);
        }
      });
    }
    
    // Save comprehensive results
    const resultsFile = `push-through-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`💾 Complete results saved: ${resultsFile}`);
    
    if (successfulApproaches.length > 0) {
      console.log('\n🎯 BREAKTHROUGH: Found working methods for ITSM access!');
    } else {
      console.log('\n⚠️ All approaches blocked - JIRA 10.3.x session validation issue confirmed');
    }
    
  } catch (error) {
    console.error('❌ Push through failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for review...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

pushThroughITSM().catch(console.error); 