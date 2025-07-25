import { chromium } from 'playwright';
import * as fs from 'fs';

async function discoverPermissions() {
  console.log('🔍 DISCOVER USER PERMISSIONS & ACCESSIBLE DATA');
  console.log('=============================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200,
    args: ['--disable-web-security', '--auth-server-allowlist=*', '--no-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    extraHTTPHeaders: {
      'X-Atlassian-Token': 'no-check',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json'
    }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Authenticating...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    const dashTitle = await page.title();
    if (dashTitle.includes('Log')) {
      console.log('❌ Please log in first');
      return;
    }
    
    console.log('✅ Authenticated - Discovering accessible data...');
    
    // Comprehensive API discovery
    const apiDiscovery = await page.evaluate(async () => {
      const endpoints = [
        // User info
        '/jira/rest/auth/1/session',
        '/jira/rest/api/2/myself',
        '/jira/rest/api/2/user?username=currentUser',
        
        // Projects & permissions
        '/jira/rest/api/2/project',
        '/jira/rest/api/2/project?expand=description,lead,url',
        '/jira/rest/api/2/mypermissions',
        '/jira/rest/api/2/permissions',
        
        // Search variations
        '/jira/rest/api/2/search?jql=ORDER%20BY%20created%20DESC&maxResults=5',
        '/jira/rest/api/2/search?jql=assignee%20=%20currentUser()&maxResults=5',
        '/jira/rest/api/2/search?maxResults=5',
        '/jira/rest/api/2/search?jql=reporter%20=%20currentUser()&maxResults=5',
        
        // Issue types & statuses
        '/jira/rest/api/2/issuetype',
        '/jira/rest/api/2/status',
        '/jira/rest/api/2/priority',
        
        // Dashboards & filters
        '/jira/rest/api/2/dashboard',
        '/jira/rest/api/2/filter/favourite',
        '/jira/rest/api/2/filter/search',
        
        // Application info
        '/jira/rest/api/2/serverInfo',
        '/jira/rest/api/2/configuration',
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
          
                     let data: string | null = null;
           if (response.ok) {
             const text = await response.text();
             data = text.substring(0, 1000); // Limit data size
           }
          
          results.push({
            endpoint,
            status: response.status,
            success: response.ok,
            data
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
    
    console.log('\n📊 API DISCOVERY RESULTS:');
    console.log('=========================');
    
    const userInfo = apiDiscovery.filter(r => r.endpoint.includes('session') || r.endpoint.includes('myself'));
    const projectInfo = apiDiscovery.filter(r => r.endpoint.includes('project'));
    const searchInfo = apiDiscovery.filter(r => r.endpoint.includes('search'));
    const permissionInfo = apiDiscovery.filter(r => r.endpoint.includes('permission'));
    
    console.log('\n👤 USER INFORMATION:');
    userInfo.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.endpoint.split('/').pop()}`);
        console.log(`   Data: ${result.data?.substring(0, 200)}...`);
      } else {
        console.log(`❌ ${result.endpoint.split('/').pop()}: ${result.error || result.status}`);
      }
    });
    
    console.log('\n📁 PROJECT ACCESS:');
    projectInfo.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.endpoint}: ${result.data}`);
      } else {
        console.log(`❌ ${result.endpoint}: ${result.error || result.status}`);
      }
    });
    
    console.log('\n🔍 SEARCH CAPABILITIES:');
    searchInfo.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.endpoint.split('?')[1] || 'basic search'}`);
        const data = result.data ? JSON.parse(result.data) : {};
        console.log(`   Total results: ${data.total || 'unknown'}`);
        if (data.issues?.length > 0) {
          console.log(`   Found issues: ${data.issues.length}`);
        }
      } else {
        console.log(`❌ ${result.endpoint}: ${result.error || result.status}`);
      }
    });
    
    console.log('\n🔐 PERMISSIONS:');
    permissionInfo.forEach(result => {
      if (result.success) {
        console.log(`✅ ${result.endpoint.split('/').pop()}`);
        console.log(`   Data: ${result.data?.substring(0, 300)}...`);
      } else {
        console.log(`❌ ${result.endpoint.split('/').pop()}: ${result.error || result.status}`);
      }
    });
    
    // Try to access any working issues
    const workingSearches = searchInfo.filter(r => r.success);
    if (workingSearches.length > 0) {
      console.log('\n🎯 ACCESSIBLE ISSUE ANALYSIS:');
      for (const search of workingSearches) {
        try {
          const data = JSON.parse(search.data || '{}');
          if (data.issues && data.issues.length > 0) {
            console.log(`\n📋 Issues from: ${search.endpoint}`);
            data.issues.forEach((issue: any) => {
              console.log(`   ${issue.key}: ${issue.fields?.summary || 'No summary'}`);
              console.log(`   Project: ${issue.fields?.project?.key || 'Unknown'}`);
            });
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
    
    // Check server info for environment details
    const serverInfo = apiDiscovery.find(r => r.endpoint.includes('serverInfo'));
    if (serverInfo?.success) {
      console.log('\n🖥️  JIRA SERVER INFO:');
      try {
        const info = JSON.parse(serverInfo.data || '{}');
        console.log(`   Version: ${info.version}`);
        console.log(`   Build: ${info.buildNumber}`);
        console.log(`   Server Title: ${info.serverTitle}`);
        console.log(`   Base URL: ${info.baseUrl}`);
      } catch (e) {
        console.log(`   Raw: ${serverInfo.data?.substring(0, 200)}`);
      }
    }
    
    // Save comprehensive results
    const discoveryResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEndpoints: apiDiscovery.length,
        successfulEndpoints: apiDiscovery.filter(r => r.success).length,
        userCanAccessProjects: projectInfo.some(r => r.success && r.data !== '[]'),
        userCanSearch: searchInfo.some(r => r.success),
        userHasPermissions: permissionInfo.some(r => r.success)
      },
      apiResults: apiDiscovery
    };
    
    const resultsFile = `permission-discovery-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(discoveryResults, null, 2));
    
    console.log('\n🎉 PERMISSION DISCOVERY COMPLETE');
    console.log('=================================');
    console.log(`📄 Results saved: ${resultsFile}`);
    console.log(`✅ Working endpoints: ${discoveryResults.summary.successfulEndpoints}/${discoveryResults.summary.totalEndpoints}`);
    console.log(`📁 Project access: ${discoveryResults.summary.userCanAccessProjects ? 'YES' : 'NO'}`);
    console.log(`🔍 Search access: ${discoveryResults.summary.userCanSearch ? 'YES' : 'NO'}`);
    console.log(`🔐 Permission access: ${discoveryResults.summary.userHasPermissions ? 'YES' : 'NO'}`);
    
    if (!discoveryResults.summary.userCanAccessProjects) {
      console.log('\n🚨 CONCLUSION: USER ACCOUNT LACKS PROJECT ACCESS PERMISSIONS');
      console.log('This explains why ITSM testing fails - no project visibility!');
    }
    
  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for review...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

discoverPermissions().catch(console.error); 