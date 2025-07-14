#!/usr/bin/env tsx

import { chromium } from 'playwright';
import fs from 'fs';

interface PerformanceMetric {
  test: string;
  url: string;
  loadTime: number;
  domContentLoaded: number;
  networkRequests: number;
  status: 'success' | 'error';
  error?: string;
}

async function runJiraPerformanceBenchmarks() {
  console.log('🚀 JIRA 10.3 PERFORMANCE BENCHMARKING');
  console.log('=====================================');
  console.log('📊 Testing dashboard, search, and project performance');
  console.log('⏱️  Measuring load times, DOM ready, and network activity');
  console.log('=====================================\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable performance monitoring
  await page.addInitScript(() => {
    window.performance.mark('test-start');
  });

  const results: PerformanceMetric[] = [];
  
  try {
    // Test 1: Dashboard Performance
    console.log('📊 Test 1: Dashboard Performance');
    const dashboardResult = await measurePagePerformance(
      page, 
      'Dashboard', 
      'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa'
    );
    results.push(dashboardResult);
    
    // Test 2: Issue Navigator Performance
    console.log('🔍 Test 2: Issue Navigator Performance');
    const navigatorResult = await measurePagePerformance(
      page, 
      'Issue Navigator', 
      'https://jirauat.smedigitalapps.com/jira/issues/'
    );
    results.push(navigatorResult);
    
    // Test 3: ITSM Project Performance
    console.log('📋 Test 3: ITSM Project Performance');
    const itsmResult = await measurePagePerformance(
      page, 
      'ITSM Project', 
      'https://jirauat.smedigitalapps.com/jira/browse/ITSM'
    );
    results.push(itsmResult);
    
    // Test 4: DPSA Project Performance
    console.log('🔒 Test 4: DPSA Project Performance');
    const dpsaResult = await measurePagePerformance(
      page, 
      'DPSA Project', 
      'https://jirauat.smedigitalapps.com/jira/browse/DPSA'
    );
    results.push(dpsaResult);
    
    // Test 5: Search Performance
    console.log('🔎 Test 5: Search Performance');
    const searchResult = await measureSearchPerformance(page);
    results.push(searchResult);
    
    // Test 6: Ticket Creation Performance
    console.log('➕ Test 6: Create Issue Performance');
    const createResult = await measurePagePerformance(
      page, 
      'Create Issue', 
      'https://jirauat.smedigitalapps.com/jira/secure/CreateIssue.jspa'
    );
    results.push(createResult);
    
    // Generate Performance Report
    console.log('\n📈 PERFORMANCE BENCHMARK RESULTS');
    console.log('================================');
    
    const report = generatePerformanceReport(results);
    console.log(report);
    
    // Save detailed results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `jira-performance-report-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify({
      timestamp: new Date().toISOString(),
      jiraVersion: '10.3',
      environment: 'UAT',
      results,
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.status === 'success').length,
        averageLoadTime: results.reduce((sum, r) => sum + r.loadTime, 0) / results.length,
        averageDOMTime: results.reduce((sum, r) => sum + r.domContentLoaded, 0) / results.length
      }
    }, null, 2));
    
    console.log(`\n💾 Detailed results saved to: ${filename}`);
    console.log('📧 Report ready for Irina\'s team!');
    
  } catch (error) {
    console.error('❌ Benchmark error:', error);
  } finally {
    await browser.close();
  }
}

async function measurePagePerformance(page: any, testName: string, url: string): Promise<PerformanceMetric> {
  try {
    const startTime = Date.now();
    
    // Navigate and wait for network idle
    await page.goto(url, { waitUntil: 'networkidle' });
    
    const endTime = Date.now();
    const loadTime = endTime - startTime;
    
    // Get performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const resources = performance.getEntriesByType('resource');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        networkRequests: resources.length,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };
    });
    
    console.log(`   ✅ ${testName}: ${loadTime}ms (DOM: ${Math.round(metrics.domContentLoaded)}ms, Requests: ${metrics.networkRequests})`);
    
    return {
      test: testName,
      url,
      loadTime,
      domContentLoaded: metrics.domContentLoaded,
      networkRequests: metrics.networkRequests,
      status: 'success'
    };
    
  } catch (error) {
    console.log(`   ❌ ${testName}: FAILED - ${error.message}`);
    return {
      test: testName,
      url,
      loadTime: 0,
      domContentLoaded: 0,
      networkRequests: 0,
      status: 'error',
      error: error.message
    };
  }
}

async function measureSearchPerformance(page: any): Promise<PerformanceMetric> {
  try {
    const startTime = Date.now();
    
    // Navigate to search page
    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/');
    await page.waitForLoadState('networkidle');
    
    // Perform search
    const searchBox = page.locator('#quickSearchInput, .quick-search-input').first();
    await searchBox.fill('project in (ITSM, DPSA) ORDER BY created DESC');
    await searchBox.press('Enter');
    await page.waitForLoadState('networkidle');
    
    const endTime = Date.now();
    const searchTime = endTime - startTime;
    
    // Count results
    const resultCount = await page.evaluate(() => {
      const results = document.querySelectorAll('[data-issuekey], .issue-row');
      return results.length;
    });
    
    console.log(`   ✅ Search: ${searchTime}ms (${resultCount} results)`);
    
    return {
      test: 'Search Performance',
      url: 'https://jirauat.smedigitalapps.com/jira/issues/',
      loadTime: searchTime,
      domContentLoaded: searchTime,
      networkRequests: resultCount,
      status: 'success'
    };
    
  } catch (error) {
    console.log(`   ❌ Search: FAILED - ${error.message}`);
    return {
      test: 'Search Performance',
      url: 'https://jirauat.smedigitalapps.com/jira/issues/',
      loadTime: 0,
      domContentLoaded: 0,
      networkRequests: 0,
      status: 'error',
      error: error.message
    };
  }
}

function generatePerformanceReport(results: PerformanceMetric[]): string {
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status === 'error');
  
  let report = '';
  
  // Summary
  report += `📊 SUMMARY:\n`;
  report += `   Total Tests: ${results.length}\n`;
  report += `   Successful: ${successful.length}\n`;
  report += `   Failed: ${failed.length}\n`;
  report += `   Success Rate: ${Math.round((successful.length / results.length) * 100)}%\n\n`;
  
  // Performance Metrics
  if (successful.length > 0) {
    const avgLoad = successful.reduce((sum, r) => sum + r.loadTime, 0) / successful.length;
    const avgDOM = successful.reduce((sum, r) => sum + r.domContentLoaded, 0) / successful.length;
    
    report += `⚡ PERFORMANCE METRICS:\n`;
    report += `   Average Load Time: ${Math.round(avgLoad)}ms\n`;
    report += `   Average DOM Ready: ${Math.round(avgDOM)}ms\n`;
    report += `   Fastest Test: ${Math.min(...successful.map(r => r.loadTime))}ms\n`;
    report += `   Slowest Test: ${Math.max(...successful.map(r => r.loadTime))}ms\n\n`;
  }
  
  // Detailed Results
  report += `📋 DETAILED RESULTS:\n`;
  results.forEach(result => {
    const status = result.status === 'success' ? '✅' : '❌';
    report += `   ${status} ${result.test}: ${result.loadTime}ms\n`;
    if (result.error) {
      report += `      Error: ${result.error}\n`;
    }
  });
  
  // Performance Assessment
  report += `\n🎯 PERFORMANCE ASSESSMENT:\n`;
  const avgLoadTime = successful.length > 0 ? successful.reduce((sum, r) => sum + r.loadTime, 0) / successful.length : 0;
  
  if (avgLoadTime < 3000) {
    report += `   🟢 EXCELLENT: Average load time under 3 seconds\n`;
  } else if (avgLoadTime < 5000) {
    report += `   🟡 GOOD: Average load time under 5 seconds\n`;
  } else if (avgLoadTime < 8000) {
    report += `   🟠 ACCEPTABLE: Average load time under 8 seconds\n`;
  } else {
    report += `   🔴 NEEDS IMPROVEMENT: Average load time over 8 seconds\n`;
  }
  
  return report;
}

// Run the benchmarks
runJiraPerformanceBenchmarks().catch(console.error); 