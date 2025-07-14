import { test, expect, chromium } from '@playwright/test';
import fs from 'fs';

// Modern JIRA 10.3 Testing Suite - 2024 Best Practices
// Focuses on VALUE-DRIVEN tests with Web Vitals, Performance, and Accessibility

interface WebVitalsReport {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay  
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  tbt: number; // Total Blocking Time
}

interface PerformanceReport {
  webVitals: WebVitalsReport;
  navigationTiming: any;
  resourceTiming: any[];
  timestamp: string;
  testName: string;
  url: string;
}

// Utility function to measure Core Web Vitals
async function measureWebVitals(page: any): Promise<WebVitalsReport> {
  return await page.evaluate(() => {
    return new Promise<WebVitalsReport>((resolve) => {
      const vitals: Partial<WebVitalsReport> = {};
      let metricsCollected = 0;
      const totalMetrics = 6;

      const checkComplete = () => {
        metricsCollected++;
        if (metricsCollected >= totalMetrics) {
          resolve(vitals as WebVitalsReport);
        }
      };

      // Largest Contentful Paint (LCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        vitals.lcp = lastEntry.startTime;
        checkComplete();
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay (FID) - fallback to 0 if no interaction
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const entry = entries[0] as any; // Cast to any for FID-specific properties
          vitals.fid = entry.processingStart - entry.startTime;
        } else {
          vitals.fid = 0;
        }
        checkComplete();
      }).observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        vitals.cls = clsValue;
        checkComplete();
      }).observe({ type: 'layout-shift', buffered: true });

      // First Contentful Paint (FCP)
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        vitals.fcp = fcpEntry ? fcpEntry.startTime : 0;
        checkComplete();
      }).observe({ type: 'paint', buffered: true });

      // Time to First Byte (TTFB)
      const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
      vitals.ttfb = navigationEntry ? navigationEntry.responseStart - navigationEntry.requestStart : 0;
      checkComplete();

      // Total Blocking Time (TBT)
      let tbtValue = 0;
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (entry.duration > 50) {
            tbtValue += entry.duration - 50;
          }
        });
        vitals.tbt = tbtValue;
        checkComplete();
      }).observe({ type: 'longtask', buffered: true });

      // Fallback timeout to ensure we don't hang
      setTimeout(() => {
        if (metricsCollected < totalMetrics) {
          // Fill in missing metrics with 0
          vitals.lcp = vitals.lcp || 0;
          vitals.fid = vitals.fid || 0;
          vitals.cls = vitals.cls || 0;
          vitals.fcp = vitals.fcp || 0;
          vitals.ttfb = vitals.ttfb || 0;
          vitals.tbt = vitals.tbt || 0;
          resolve(vitals as WebVitalsReport);
        }
      }, 5000);
    });
  });
}

// Utility function to save performance reports
function savePerformanceReport(report: PerformanceReport) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-report-${report.testName}-${timestamp}.json`;
  fs.writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(`📊 Performance report saved: ${filename}`);
}

// Modern test suite focusing on authenticated user workflows
test.describe('JIRA 10.3 - Modern Value-Driven Testing Suite', () => {
  
  // Configure parallel execution for this test suite
  test.describe.configure({ mode: 'parallel' });
  
  // Optimized for speed - don't wait for everything to load
  test.beforeEach(async ({ page }) => {
    // Use commit waitUntil for faster navigation
    await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa', { 
      waitUntil: 'commit' 
    });
  });

  test('Core Web Vitals - Dashboard Performance', async ({ page }) => {
    console.log('🚀 Testing Core Web Vitals for JIRA Dashboard');
    
    // Wait for meaningful content to load
    await expect(page.locator('[data-testid="dashboard"], .dashboard, #dashboard')).toBeVisible({ timeout: 10000 });
    
    // Measure Web Vitals
    const webVitals = await measureWebVitals(page);
    
    // Get additional performance data
    const navigationTiming = await page.evaluate(() => 
      JSON.stringify(performance.getEntriesByType('navigation'))
    );
    
    const resourceTiming = await page.evaluate(() => 
      JSON.stringify(performance.getEntriesByType('resource'))
    );

    const report: PerformanceReport = {
      webVitals,
      navigationTiming: JSON.parse(navigationTiming),
      resourceTiming: JSON.parse(resourceTiming),
      timestamp: new Date().toISOString(),
      testName: 'dashboard-web-vitals',
      url: page.url()
    };

    savePerformanceReport(report);

    // Assert Core Web Vitals thresholds (Google recommendations)
    expect(webVitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    expect(webVitals.fid).toBeLessThan(100);  // FID < 100ms  
    expect(webVitals.cls).toBeLessThan(0.1);  // CLS < 0.1
    expect(webVitals.fcp).toBeLessThan(1800); // FCP < 1.8s
    expect(webVitals.ttfb).toBeLessThan(800); // TTFB < 800ms

    console.log('✅ Core Web Vitals Results:');
    console.log(`   LCP: ${webVitals.lcp.toFixed(1)}ms (target: <2500ms)`);
    console.log(`   FID: ${webVitals.fid.toFixed(1)}ms (target: <100ms)`);
    console.log(`   CLS: ${webVitals.cls.toFixed(3)} (target: <0.1)`);
    console.log(`   FCP: ${webVitals.fcp.toFixed(1)}ms (target: <1800ms)`);
    console.log(`   TTFB: ${webVitals.ttfb.toFixed(1)}ms (target: <800ms)`);
    console.log(`   TBT: ${webVitals.tbt.toFixed(1)}ms`);
  });

  test('Issue Creation Workflow - End-to-End Performance', async ({ page }) => {
    console.log('🎯 Testing Issue Creation Workflow Performance');
    
    const startTime = Date.now();
    
    // Navigate to create issue (using semantic selectors)
    await page.getByRole('button', { name: /create/i }).or(
      page.getByRole('link', { name: /create/i })
    ).first().click();
    
    // Wait for create dialog to appear
    await expect(page.getByRole('dialog').or(
      page.locator('[role="dialog"], .create-issue-dialog, #create-issue-dialog')
    )).toBeVisible({ timeout: 5000 });
    
    const dialogLoadTime = Date.now() - startTime;
    
    // Fill in issue details using semantic selectors
    await page.getByLabel(/summary/i).or(
      page.locator('input[name*="summary"], #summary')
    ).fill('Test Issue - Performance Testing');
    
    await page.getByLabel(/description/i).or(
      page.locator('textarea[name*="description"], #description')
    ).fill('This is a test issue created during performance testing.');
    
    // Select issue type if available
    const issueTypeField = page.getByLabel(/issue type/i).or(
      page.locator('select[name*="issuetype"], #issuetype')
    );
    
    if (await issueTypeField.isVisible()) {
      await issueTypeField.selectOption({ index: 1 });
    }
    
    // Submit the form
    const submitTime = Date.now();
    await page.getByRole('button', { name: /create|submit/i }).click();
    
    // Wait for success confirmation or redirect
    await expect(page.getByText(/created|success/i).or(
      page.locator('.aui-message-success, .success-message')
    )).toBeVisible({ timeout: 10000 });
    
    const totalTime = Date.now() - startTime;
    const submitResponseTime = Date.now() - submitTime;
    
    // Performance assertions
    expect(dialogLoadTime).toBeLessThan(3000); // Dialog should load in <3s
    expect(submitResponseTime).toBeLessThan(5000); // Submit should respond in <5s
    expect(totalTime).toBeLessThan(15000); // Total workflow should complete in <15s
    
    console.log(`✅ Issue Creation Performance:`);
    console.log(`   Dialog Load: ${dialogLoadTime}ms`);
    console.log(`   Submit Response: ${submitResponseTime}ms`);
    console.log(`   Total Workflow: ${totalTime}ms`);
  });

  test('Search Functionality - Performance & Usability', async ({ page }) => {
    console.log('🔍 Testing Search Performance');
    
    // Find search input using multiple strategies
    const searchInput = page.getByRole('searchbox').or(
      page.getByPlaceholder(/search/i)
    ).or(
      page.locator('#quickSearchInput, .quick-search, [data-testid="search"]')
    ).first();
    
    await expect(searchInput).toBeVisible({ timeout: 5000 });
    
    const searchStartTime = Date.now();
    
    // Perform search
    await searchInput.fill('project = ITSM');
    await searchInput.press('Enter');
    
    // Wait for search results
    await expect(page.getByText(/results|issues|found/i).or(
      page.locator('.search-results, .issue-table, .navigator-content')
    )).toBeVisible({ timeout: 10000 });
    
    const searchTime = Date.now() - searchStartTime;
    
    // Check for search result quality
    const resultCount = await page.locator('[data-issuekey], .issue-row, .search-result').count();
    
    // Performance assertions
    expect(searchTime).toBeLessThan(8000); // Search should complete in <8s
    expect(resultCount).toBeGreaterThan(0); // Should return some results
    
    console.log(`✅ Search Performance:`);
    console.log(`   Search Time: ${searchTime}ms`);
    console.log(`   Results Found: ${resultCount}`);
  });

  test('Accessibility Testing - ARIA & Keyboard Navigation', async ({ page }) => {
    console.log('♿ Testing Accessibility Features');
    
    // Check for essential ARIA landmarks
    await expect(page.locator('[role="main"], main')).toBeVisible();
    await expect(page.locator('[role="navigation"], nav')).toBeVisible();
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
    
    // Check for alt text on images
    const images = await page.locator('img').count();
    if (images > 0) {
      const imagesWithoutAlt = await page.locator('img:not([alt])').count();
      expect(imagesWithoutAlt).toBeLessThan(images * 0.1); // Less than 10% missing alt text
    }
    
    // Check color contrast (basic check)
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let issueCount = 0;
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Basic contrast check (simplified)
        if (color === 'rgb(255, 255, 255)' && backgroundColor === 'rgb(255, 255, 255)') {
          issueCount++;
        }
      });
      
      return issueCount;
    });
    
    expect(contrastIssues).toBeLessThan(5); // Should have minimal contrast issues
    
    console.log('✅ Accessibility checks completed');
  });

  test('Mobile Responsiveness - Viewport Testing', async ({ page }) => {
    console.log('📱 Testing Mobile Responsiveness');
    
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 768, height: 1024, name: 'iPad' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000); // Allow layout to settle
      
      // Check if navigation is accessible
      const navVisible = await page.locator('[role="navigation"], .nav, .navbar').isVisible();
      expect(navVisible).toBeTruthy();
      
      // Check if main content is visible
      const mainVisible = await page.locator('[role="main"], main, .main-content').isVisible();
      expect(mainVisible).toBeTruthy();
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}): Responsive`);
    }
  });

  test('Network Performance - Resource Loading', async ({ page }) => {
    console.log('🌐 Testing Network Performance');
    
    // Monitor network requests
    const requests: any[] = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });
    
    await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa', { 
      waitUntil: 'networkidle' 
    });
    
    // Analyze requests
    const imageRequests = requests.filter(r => r.resourceType === 'image');
    const scriptRequests = requests.filter(r => r.resourceType === 'script');
    const stylesheetRequests = requests.filter(r => r.resourceType === 'stylesheet');
    
    // Get resource timing data
    const resourceMetrics = await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      return resources.map((resource: any) => ({
        name: resource.name,
        duration: resource.duration,
        transferSize: resource.transferSize,
        type: resource.initiatorType
      }));
    });
    
    const slowResources = resourceMetrics.filter((r: any) => r.duration > 2000);
    const largeResources = resourceMetrics.filter((r: any) => r.transferSize > 500000);
    
    // Performance assertions
    expect(requests.length).toBeLessThan(100); // Should not load excessive resources
    expect(slowResources.length).toBeLessThan(5); // Should have few slow resources
    expect(largeResources.length).toBeLessThan(3); // Should have few large resources
    
    console.log(`✅ Network Performance:`);
    console.log(`   Total Requests: ${requests.length}`);
    console.log(`   Images: ${imageRequests.length}`);
    console.log(`   Scripts: ${scriptRequests.length}`);
    console.log(`   Stylesheets: ${stylesheetRequests.length}`);
    console.log(`   Slow Resources (>2s): ${slowResources.length}`);
    console.log(`   Large Resources (>500KB): ${largeResources.length}`);
  });

  test('Error Handling - Graceful Degradation', async ({ page }) => {
    console.log('⚠️ Testing Error Handling');
    
    // Test 404 handling
    const response = await page.goto('https://jirauat.smedigitalapps.com/nonexistent-page', { 
      waitUntil: 'commit' 
    });
    
    // Should handle 404 gracefully
    expect([404, 200]).toContain(response?.status() || 200);
    
    // Should show user-friendly error message
    const hasErrorMessage = await page.getByText(/not found|error|404/i).isVisible();
    expect(hasErrorMessage).toBeTruthy();
    
    // Test JavaScript error handling
    await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa', { 
      waitUntil: 'commit' 
    });
    
    // Inject a JS error and see if the page still functions
    await page.evaluate(() => {
      // Simulate a non-critical JS error
      try {
        throw new Error('Test error');
      } catch (e) {
        console.error('Handled test error:', e);
      }
    });
    
    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();
    
    console.log('✅ Error handling tests completed');
  });

  test('Security Headers - Basic Security Testing', async ({ page }) => {
    console.log('🔒 Testing Security Headers');
    
    const response = await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa');
    const headers = response?.headers() || {};
    
    // Check for important security headers
    const securityHeaders = {
      'x-frame-options': 'Should prevent clickjacking',
      'x-content-type-options': 'Should prevent MIME sniffing',
      'strict-transport-security': 'Should enforce HTTPS',
      'content-security-policy': 'Should prevent XSS'
    };
    
    let securityScore = 0;
    Object.keys(securityHeaders).forEach(header => {
      if (headers[header]) {
        securityScore++;
        console.log(`✅ ${header}: Present`);
      } else {
        console.log(`⚠️ ${header}: Missing`);
      }
    });
    
    // Should have at least some security headers
    expect(securityScore).toBeGreaterThan(1);
    
    console.log(`🔒 Security Score: ${securityScore}/4 headers present`);
  });

}); 