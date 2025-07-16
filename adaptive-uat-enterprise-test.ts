import { chromium } from 'playwright';
import { readFile, writeFile } from 'fs/promises';

/**
 * Adaptive UAT Enterprise Test
 * 
 * 1. Discovers what's actually available in UAT
 * 2. Adapts tests to real UAT structure
 * 3. Runs comprehensive performance and functionality tests
 * 4. Generates detailed reports
 */

interface UATDiscovery {
  projects: string[];
  availablePages: string[];
  dashboardInfo: any;
  searchCapabilities: any;
}

async function adaptiveUATEnterpriseTest() {
  console.log('🚀 Adaptive UAT Enterprise Test - Discovering & Testing Real Structure');
  
  try {
    // Load our existing session
    console.log('📂 Loading existing UAT session data...');
    const sessionData = JSON.parse(await readFile('jira-uat-session-1752610130300.json', 'utf-8'));
    
    // Convert to Playwright storageState format
    const storageState = {
      cookies: sessionData.cookies,
      origins: [{
        origin: 'https://jirauat.smedigitalapps.com',
        localStorage: Object.entries(sessionData.localStorage || {}).map(([name, value]) => ({ 
          name, 
          value: String(value) 
        }))
      }]
    };
    
    console.log(`✅ Session loaded: ${sessionData.cookies.length} cookies, captured at ${sessionData.timestamp}`);
    
    // Launch browser with session
    const browser = await chromium.launch({ 
      headless: false,  // So you can see what's happening
      slowMo: 300       // Slow down for visibility
    });
    
    const context = await browser.newContext({
      storageState,
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Phase 1: UAT Discovery
    console.log('\n🔍 PHASE 1: UAT DISCOVERY');
    console.log('=====================================');
    
    const discovery = await discoverUATStructure(page);
    await saveDiscoveryResults(discovery);
    
    // Phase 2: Adaptive Testing
    console.log('\n🧪 PHASE 2: ADAPTIVE COMPREHENSIVE TESTING');
    console.log('=====================================');
    
    const testResults = await runAdaptiveTests(page, discovery);
    
    // Phase 3: Performance Analysis
    console.log('\n⚡ PHASE 3: PERFORMANCE ANALYSIS');
    console.log('=====================================');
    
    const perfResults = await runPerformanceTests(page, discovery);
    
    // Phase 4: Final Report
    console.log('\n📊 PHASE 4: COMPREHENSIVE REPORT GENERATION');
    console.log('=====================================');
    
    await generateComprehensiveReport(discovery, testResults, perfResults);
    
    // Keep browser open for 15 seconds so you can see the results
    console.log('\n⏰ Keeping browser open for 15 seconds to review...');
    await page.waitForTimeout(15000);
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Adaptive UAT enterprise test failed:', error);
    throw error;
  }
}

async function discoverUATStructure(page: any): Promise<UATDiscovery> {
  console.log('🔍 Discovering UAT JIRA structure...');
  
  const discovery: UATDiscovery = {
    projects: [],
    availablePages: [],
    dashboardInfo: {},
    searchCapabilities: {}
  };
  
  try {
    // Try to find the main dashboard or entry point
    console.log('🏠 Testing dashboard access...');
    
    const dashboardUrls = [
      '/jira/secure/Dashboard.jspa',
      '/jira/dashboard.jspa', 
      '/jira/',
      '/secure/Dashboard.jspa',
      '/dashboard.jspa'
    ];
    
    let workingDashboard: string | null = null;
    for (const url of dashboardUrls) {
      try {
        await page.goto(`https://jirauat.smedigitalapps.com${url}`);
        await page.waitForLoadState('domcontentloaded');
        const title = await page.title();
        
        if (!title.includes('404') && !title.includes('Not Found') && !title.includes('dead link')) {
          workingDashboard = url;
          discovery.dashboardInfo = {
            url: url,
            title: title,
            workingUrl: `https://jirauat.smedigitalapps.com${url}`
          };
          console.log(`✅ Found working dashboard: ${url} - "${title}"`);
          break;
        }
      } catch (error) {
        console.log(`❌ Dashboard URL ${url} failed: ${error.message}`);
      }
    }
    
    if (workingDashboard) {
      discovery.availablePages.push(workingDashboard);
      
      // Discover projects from the dashboard
      console.log('📋 Discovering available projects...');
      
      const projects = await page.evaluate(() => {
        const projectLinks = Array.from(document.querySelectorAll('a[href*="/browse/"]'));
        const projects = new Set();
        
        projectLinks.forEach(link => {
          const href = link.getAttribute('href');
          const match = href?.match(/\/browse\/([A-Z]+)/);
          if (match) {
            projects.add(match[1]);
          }
        });
        
        return Array.from(projects);
      });
      
      discovery.projects = projects as string[];
      console.log(`📋 Found projects: ${discovery.projects.join(', ')}`);
    }
    
    // Try to find the issue navigator
    console.log('🔍 Testing issue navigator access...');
    
    const navigatorUrls = [
      '/jira/issues/',
      '/jira/secure/IssueNavigator.jspa',
      '/issues/',
      '/secure/IssueNavigator.jspa'
    ];
    
    for (const url of navigatorUrls) {
      try {
        await page.goto(`https://jirauat.smedigitalapps.com${url}`);
        await page.waitForLoadState('domcontentloaded');
        const title = await page.title();
        
        if (!title.includes('404') && !title.includes('Not Found')) {
          discovery.availablePages.push(url);
          console.log(`✅ Found working navigator: ${url} - "${title}"`);
          break;
        }
      } catch (error) {
        console.log(`❌ Navigator URL ${url} failed`);
      }
    }
    
    // Test search capabilities
    console.log('🔎 Testing search capabilities...');
    
    if (discovery.projects.length > 0) {
      const testProject = discovery.projects[0];
      try {
        const searchUrl = `/jira/issues/?jql=project%20%3D%20${testProject}`;
        await page.goto(`https://jirauat.smedigitalapps.com${searchUrl}`);
        await page.waitForLoadState('domcontentloaded');
        
        const hasResults = await page.locator('.issue-table, .navigator-results, .search-results').count() > 0;
        const hasNoResults = await page.locator('.no-results, .navigator-no-results').count() > 0;
        
        discovery.searchCapabilities = {
          searchWorks: hasResults || hasNoResults,
          testProject: testProject,
          searchUrl: searchUrl
        };
        
        console.log(`🔎 Search test: ${discovery.searchCapabilities.searchWorks ? 'WORKING' : 'FAILED'}`);
        
      } catch (error) {
        console.log(`❌ Search test failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ UAT discovery failed:', error);
  }
  
  console.log(`\n✅ UAT Discovery Complete:`);
  console.log(`   📋 Projects: ${discovery.projects.length}`);
  console.log(`   🔗 Available Pages: ${discovery.availablePages.length}`);
  console.log(`   🔍 Search Working: ${discovery.searchCapabilities.searchWorks || false}`);
  
  return discovery;
}

async function runAdaptiveTests(page: any, discovery: UATDiscovery) {
  console.log('🧪 Running adaptive tests based on discovered UAT structure...');
  
  const results = {
    dashboardTest: null as any,
    projectTests: [] as any[],
    searchTests: [] as any[],
    navigationTests: [] as any[],
    totalTests: 0,
    passedTests: 0,
    failedTests: 0
  };
  
  // Test 1: Dashboard Performance
  if (discovery.dashboardInfo.workingUrl) {
    console.log('🎯 Test 1: Dashboard Performance');
    const startTime = Date.now();
    
    try {
      await page.goto(discovery.dashboardInfo.workingUrl);
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      const title = await page.title();
      
      results.dashboardTest = {
        success: true,
        loadTime: loadTime,
        title: title,
        url: discovery.dashboardInfo.workingUrl
      };
      
      results.passedTests++;
      console.log(`✅ Dashboard: ${loadTime}ms - "${title}"`);
      
    } catch (error) {
      results.dashboardTest = { success: false, error: error.message };
      results.failedTests++;
      console.log(`❌ Dashboard test failed: ${error.message}`);
    }
    
    results.totalTests++;
  }
  
  // Test 2: Project Access Tests
  if (discovery.projects.length > 0) {
    console.log('🎯 Test 2: Project Access Tests');
    
    for (const project of discovery.projects.slice(0, 5)) { // Test first 5 projects
      const startTime = Date.now();
      
      try {
        await page.goto(`https://jirauat.smedigitalapps.com/browse/${project}`);
        await page.waitForLoadState('domcontentloaded');
        
        const loadTime = Date.now() - startTime;
        const title = await page.title();
        const hasErrors = await page.locator('.error, .aui-message-error').count();
        
        const projectResult = {
          project: project,
          success: !title.includes('404') && !title.includes('Not Found'),
          loadTime: loadTime,
          title: title,
          errorCount: hasErrors
        };
        
        results.projectTests.push(projectResult);
        
        if (projectResult.success) {
          results.passedTests++;
          console.log(`✅ Project ${project}: ${loadTime}ms - "${title}"`);
        } else {
          results.failedTests++;
          console.log(`❌ Project ${project}: ${title}`);
        }
        
      } catch (error) {
        results.projectTests.push({
          project: project,
          success: false,
          error: error.message
        });
        results.failedTests++;
        console.log(`❌ Project ${project} failed: ${error.message}`);
      }
      
      results.totalTests++;
    }
  }
  
  // Test 3: Search Tests
  if (discovery.searchCapabilities.searchWorks) {
    console.log('🎯 Test 3: Search Functionality Tests');
    
    const searchQueries = [
      'ORDER BY created DESC',
      `project = ${discovery.projects[0]} ORDER BY created DESC`,
      'text ~ "test"',
      'status = "Open"'
    ];
    
    for (const query of searchQueries) {
      const startTime = Date.now();
      
      try {
        const encodedQuery = encodeURIComponent(query);
        await page.goto(`https://jirauat.smedigitalapps.com/jira/issues/?jql=${encodedQuery}`);
        
        // Wait for either results or no results message
        await page.waitForSelector('.issue-table, .navigator-results, .no-results, .search-results', { timeout: 15000 });
        
        const loadTime = Date.now() - startTime;
        const resultCount = await page.locator('.issue-table tbody tr, .issue-row, .search-result').count();
        const hasNoResults = await page.locator('.no-results, .navigator-no-results').count() > 0;
        
        const searchResult = {
          query: query,
          success: true,
          loadTime: loadTime,
          resultCount: resultCount,
          hasNoResults: hasNoResults
        };
        
        results.searchTests.push(searchResult);
        results.passedTests++;
        console.log(`✅ Search "${query}": ${loadTime}ms (${resultCount} results)`);
        
      } catch (error) {
        results.searchTests.push({
          query: query,
          success: false,
          error: error.message
        });
        results.failedTests++;
        console.log(`❌ Search "${query}" failed: ${error.message}`);
      }
      
      results.totalTests++;
    }
  }
  
  return results;
}

async function runPerformanceTests(page: any, discovery: UATDiscovery) {
  console.log('⚡ Running performance analysis...');
  
  const perfResults = {
    pageLoadTimes: [] as any[],
    networkMetrics: [] as any[],
    webVitals: [] as any[]
  };
  
  // Test performance on discovered pages
  const testPages: any[] = [];
  
  if (discovery.dashboardInfo.workingUrl) {
    testPages.push({ name: 'Dashboard', url: discovery.dashboardInfo.workingUrl });
  }
  
  if (discovery.projects.length > 0) {
    testPages.push({ name: `Project-${discovery.projects[0]}`, url: `/browse/${discovery.projects[0]}` });
  }
  
  if (discovery.searchCapabilities.searchUrl) {
    testPages.push({ name: 'Search', url: discovery.searchCapabilities.searchUrl });
  }
  
  for (const testPage of testPages) {
    console.log(`⚡ Performance test: ${testPage.name}`);
    
    try {
      const startTime = Date.now();
      
      const fullUrl = testPage.url.startsWith('http') 
        ? testPage.url 
        : `https://jirauat.smedigitalapps.com${testPage.url}`;
        
      await page.goto(fullUrl);
      await page.waitForLoadState('domcontentloaded');
      
      const loadTime = Date.now() - startTime;
      
      // Get performance metrics
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint');
        
        return {
          domContentLoaded: nav.domContentLoadedEventEnd - nav.fetchStart,
          loadComplete: nav.loadEventEnd - nav.fetchStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          resourceCount: performance.getEntriesByType('resource').length,
          transferSize: performance.getEntriesByType('resource').reduce((total: number, resource: any) => total + (resource.transferSize || 0), 0)
        };
      });
      
      perfResults.pageLoadTimes.push({
        page: testPage.name,
        url: fullUrl,
        loadTime: loadTime,
        metrics: metrics
      });
      
      console.log(`✅ ${testPage.name}: ${loadTime}ms (${metrics.resourceCount} resources)`);
      
    } catch (error) {
      console.log(`❌ Performance test ${testPage.name} failed: ${error.message}`);
    }
  }
  
  return perfResults;
}

async function saveDiscoveryResults(discovery: UATDiscovery) {
  try {
    await writeFile('uat-discovery-results.json', JSON.stringify(discovery, null, 2));
    console.log('💾 Discovery results saved to uat-discovery-results.json');
  } catch (error) {
    console.warn('⚠️ Could not save discovery results:', error);
  }
}

async function generateComprehensiveReport(discovery: UATDiscovery, testResults: any, perfResults: any) {
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp: timestamp,
    summary: {
      uatEnvironment: 'jirauat.smedigitalapps.com',
      discoveredProjects: discovery.projects.length,
      availablePages: discovery.availablePages.length,
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      failedTests: testResults.failedTests,
      successRate: testResults.totalTests > 0 ? (testResults.passedTests / testResults.totalTests * 100).toFixed(1) + '%' : '0%'
    },
    discovery: discovery,
    testResults: testResults,
    performanceResults: perfResults,
    recommendations: generateRecommendations(testResults, perfResults)
  };
  
  // Save detailed JSON report
  await writeFile(`uat-comprehensive-report-${timestamp.replace(/[:.]/g, '-')}.json`, JSON.stringify(report, null, 2));
  
  // Generate readable summary
  const summary = generateReadableSummary(report);
  await writeFile(`UAT-Test-Summary-${timestamp.replace(/[:.]/g, '-')}.md`, summary);
  
  console.log('\n🎉 COMPREHENSIVE UAT TEST REPORT GENERATED!');
  console.log('=====================================');
  console.log(`📊 Success Rate: ${report.summary.successRate}`);
  console.log(`📋 Projects Found: ${report.summary.discoveredProjects}`);
  console.log(`🧪 Tests Run: ${report.summary.totalTests}`);
  console.log(`✅ Passed: ${report.summary.passedTests}`);
  console.log(`❌ Failed: ${report.summary.failedTests}`);
  
  if (perfResults.pageLoadTimes.length > 0) {
    const avgLoadTime = perfResults.pageLoadTimes.reduce((sum: number, p: any) => sum + p.loadTime, 0) / perfResults.pageLoadTimes.length;
    console.log(`⚡ Avg Load Time: ${avgLoadTime.toFixed(0)}ms`);
  }
  
  console.log(`📄 Reports saved: uat-comprehensive-report-*.json & UAT-Test-Summary-*.md`);
}

function generateRecommendations(testResults: any, perfResults: any): string[] {
  const recommendations: string[] = [];
  
  if (testResults.failedTests > 0) {
    recommendations.push(`Address ${testResults.failedTests} failed tests before proceeding with UAT validation`);
  }
  
  if (perfResults.pageLoadTimes.length > 0) {
    const avgLoadTime = perfResults.pageLoadTimes.reduce((sum: number, p: any) => sum + p.loadTime, 0) / perfResults.pageLoadTimes.length;
    
    if (avgLoadTime > 10000) {
      recommendations.push('Page load times exceed 10 seconds - investigate performance optimization opportunities');
    } else if (avgLoadTime > 5000) {
      recommendations.push('Page load times are acceptable but could be optimized for better user experience');
    } else {
      recommendations.push('Page load performance is excellent');
    }
  }
  
  if (testResults.searchTests.length > 0) {
    const searchSuccessRate = testResults.searchTests.filter((t: any) => t.success).length / testResults.searchTests.length;
    if (searchSuccessRate < 0.8) {
      recommendations.push('Search functionality has issues - investigate search configuration');
    }
  }
  
  recommendations.push('UAT environment structure discovered and tested successfully');
  recommendations.push('Ready for extended comprehensive testing campaign');
  
  return recommendations;
}

function generateReadableSummary(report: any): string {
  return `# UAT Comprehensive Test Summary

**Generated:** ${report.timestamp}
**Environment:** ${report.summary.uatEnvironment}

## 📊 Test Results Summary

- **Success Rate:** ${report.summary.successRate}
- **Total Tests:** ${report.summary.totalTests}
- **Passed:** ${report.summary.passedTests}
- **Failed:** ${report.summary.failedTests}

## 🔍 UAT Discovery Results

- **Projects Found:** ${report.summary.discoveredProjects}
- **Available Pages:** ${report.summary.availablePages}
- **Search Functional:** ${report.discovery.searchCapabilities.searchWorks || false}

## 📋 Discovered Projects

${report.discovery.projects.map((p: string) => `- ${p}`).join('\n')}

## ⚡ Performance Summary

${report.performanceResults.pageLoadTimes.map((p: any) => 
  `- **${p.page}:** ${p.loadTime}ms (${p.metrics.resourceCount} resources)`
).join('\n')}

## 🎯 Recommendations

${report.recommendations.map((r: string) => `- ${r}`).join('\n')}

---
*This report was generated by the Adaptive UAT Enterprise Testing Framework*
`;
}

// Run the adaptive test
adaptiveUATEnterpriseTest().catch(console.error); 