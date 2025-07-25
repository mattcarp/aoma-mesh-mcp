import { test, expect } from '@playwright/test';
import fs from 'fs';

// JIRA 10.3 Upgrade Focused Test Suite
// Assumes user is already authenticated and focuses on upgrade-specific risks

interface TestResult {
  testName: string;
  category: string;
  status: 'pass' | 'fail';
  duration: number;
  error?: string;
  details?: string;
}

interface PerformanceMetrics {
  pageLoadTime: number;
  networkRequests: number;
  resourceSize: number;
  jsErrors: number;
}

const testResults: TestResult[] = [];
const performanceMetrics: { [key: string]: PerformanceMetrics } = {};

// Utility function to record test results
function recordTestResult(testName: string, category: string, status: 'pass' | 'fail', duration: number, error?: string, details?: string) {
  testResults.push({
    testName,
    category,
    status,
    duration,
    error,
    details
  });
}

// Utility function to measure page performance
async function measurePagePerformance(page: any, pageName: string): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as any;
    const resources = performance.getEntriesByType('resource');
    
    return {
      pageLoadTime: navigation ? navigation.loadEventEnd - navigation.navigationStart : 0,
      networkRequests: resources.length,
      resourceSize: resources.reduce((total: number, resource: any) => total + (resource.transferSize || 0), 0),
      jsErrors: 0 // Will be tracked separately
    };
  });
  
  performanceMetrics[pageName] = metrics;
  return metrics;
}

test.describe('JIRA 10.3 Upgrade Validation Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const pageName = page.url().split('/').pop() || 'unknown';
        if (performanceMetrics[pageName]) {
          performanceMetrics[pageName].jsErrors++;
        }
      }
    });
  });

  test('Dashboard - Core Functionality & Performance', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Navigate to dashboard
      await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Measure performance
      await measurePagePerformance(page, 'dashboard');
      
      // Test 1: Dashboard loads successfully
      await expect(page.locator('body')).toBeVisible();
      
      // Test 2: Key dashboard elements are present
      const hasProjects = await page.locator('[data-testid="project"], .project-item, .favourite-project').count() > 0 ||
                         await page.getByText(/project/i).isVisible();
      expect(hasProjects).toBeTruthy();
      
      // Test 3: Navigation menu is functional
      const navVisible = await page.locator('[role="navigation"], .aui-nav, .navigation').isVisible();
      expect(navVisible).toBeTruthy();
      
      // Test 4: No critical JavaScript errors (JIRA 10.3 specific)
      const jsErrorCount = performanceMetrics['dashboard']?.jsErrors || 0;
      expect(jsErrorCount).toBeLessThan(3);
      
      // Test 5: Performance benchmarks
      const loadTime = performanceMetrics['dashboard']?.pageLoadTime || 0;
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
      
      recordTestResult('Dashboard Core Functionality', 'Core Features', 'pass', Date.now() - startTime);
      
    } catch (error) {
      recordTestResult('Dashboard Core Functionality', 'Core Features', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('Issue Navigator - JIRA 10.3 Enhanced Search', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Navigate to Issue Navigator
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await measurePagePerformance(page, 'issue-navigator');
      
      // Test 1: Issue Navigator loads
      await expect(page.locator('body')).toBeVisible();
      
      // Test 2: Search functionality (JIRA 10.3 improvements)
      const searchBox = page.locator('#searcher-query, .aui-field-textareafield, [placeholder*="Search"], input[name="jql"]').first();
      if (await searchBox.isVisible()) {
        await searchBox.fill('project = ITSM');
        await page.keyboard.press('Enter');
        
        // Wait for results
        await page.waitForTimeout(5000);
        
        // Check for results or no results message
        const hasResults = await page.locator('.issue-table tr, .issue-row, .search-result').count() > 0 ||
                          await page.getByText(/no issues/i).isVisible();
        expect(hasResults).toBeTruthy();
      }
      
      // Test 3: Issue view functionality
      const issueLinks = await page.locator('a[href*="browse/"], .issue-link').count();
      if (issueLinks > 0) {
        // Test clicking on first issue if available
        const firstIssue = page.locator('a[href*="browse/"], .issue-link').first();
        await firstIssue.click();
        await page.waitForTimeout(3000);
        
        // Verify issue page loads
        await expect(page.locator('body')).toBeVisible();
      }
      
      // Performance check
      const loadTime = performanceMetrics['issue-navigator']?.pageLoadTime || 0;
      expect(loadTime).toBeLessThan(15000); // 15 seconds max for search
      
      recordTestResult('Issue Navigator & Search', 'Search & Navigation', 'pass', Date.now() - startTime);
      
    } catch (error) {
      recordTestResult('Issue Navigator & Search', 'Search & Navigation', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('Project Management - JIRA 10.3 Project Features', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Navigate to projects
      await page.goto('https://jirauat.smedigitalapps.com/jira/projects/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await measurePagePerformance(page, 'projects');
      
      // Test 1: Projects page loads
      await expect(page.locator('body')).toBeVisible();
      
      // Test 2: Project list displays
      const projectCount = await page.locator('.project-item, .project-card, [data-testid="project"]').count();
      expect(projectCount).toBeGreaterThan(0);
      
      // Test 3: Project navigation works
      const firstProject = page.locator('.project-item a, .project-card a, [data-testid="project"] a').first();
      if (await firstProject.isVisible()) {
        await firstProject.click();
        await page.waitForTimeout(3000);
        
        // Verify project details load
        await expect(page.locator('body')).toBeVisible();
      }
      
      recordTestResult('Project Management Features', 'Project Management', 'pass', Date.now() - startTime);
      
    } catch (error) {
      recordTestResult('Project Management Features', 'Project Management', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('Administration Panel - JIRA 10.3 Admin Changes', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Try to access admin panel
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/admin/ViewApplicationProperties.jspa', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await measurePagePerformance(page, 'admin');
      
      // Test 1: Admin panel accessibility
      const hasAccess = !await page.getByText(/permission/i).isVisible() && 
                       !await page.getByText(/not authorized/i).isVisible();
      
      if (hasAccess) {
        // Test 2: Admin interface loads
        await expect(page.locator('body')).toBeVisible();
        
        // Test 3: Key admin sections are accessible
        const adminSections = await page.locator('.aui-nav-item, .admin-menu-item, [data-testid="admin-section"]').count();
        expect(adminSections).toBeGreaterThan(0);
      }
      
      recordTestResult('Administration Panel Access', 'Administration', hasAccess ? 'pass' : 'fail', 
                      Date.now() - startTime, hasAccess ? undefined : 'No admin access (expected for regular users)');
      
    } catch (error) {
      recordTestResult('Administration Panel Access', 'Administration', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('Reports & Analytics - JIRA 10.3 Reporting Features', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Navigate to reports
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Look for reports link
      const reportsLink = page.locator('a[href*="reports"], a[href*="gadget"]').first();
      if (await reportsLink.isVisible()) {
        await reportsLink.click();
        await page.waitForTimeout(3000);
      }
      
      await measurePagePerformance(page, 'reports');
      
      // Test 1: Reports section loads
      await expect(page.locator('body')).toBeVisible();
      
      // Test 2: Dashboard gadgets functionality (JIRA 10.3 improvements)
      const gadgetCount = await page.locator('.gadget, .dashboard-item, [data-testid="gadget"]').count();
      
      // Test 3: No critical rendering issues
      const jsErrorCount = performanceMetrics['reports']?.jsErrors || 0;
      expect(jsErrorCount).toBeLessThan(5);
      
      recordTestResult('Reports & Dashboard Analytics', 'Reporting', 'pass', Date.now() - startTime, 
                      undefined, `Found ${gadgetCount} dashboard elements`);
      
    } catch (error) {
      recordTestResult('Reports & Dashboard Analytics', 'Reporting', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('User Profile & Settings - JIRA 10.3 User Experience', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Navigate to user profile
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      await measurePagePerformance(page, 'profile');
      
      // Test 1: Profile page loads
      await expect(page.locator('body')).toBeVisible();
      
      // Test 2: User information displays
      const hasUserInfo = await page.locator('.user-profile, .profile-section, [data-testid="user-info"]').isVisible() ||
                          await page.getByText(/profile/i).isVisible();
      expect(hasUserInfo).toBeTruthy();
      
      // Test 3: Settings accessibility
      const settingsLink = page.locator('a[href*="settings"], a[href*="preferences"]').first();
      if (await settingsLink.isVisible()) {
        await settingsLink.click();
        await page.waitForTimeout(2000);
        await expect(page.locator('body')).toBeVisible();
      }
      
      recordTestResult('User Profile & Settings', 'User Experience', 'pass', Date.now() - startTime);
      
    } catch (error) {
      recordTestResult('User Profile & Settings', 'User Experience', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('API Compatibility - JIRA 10.3 REST API', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Test basic API endpoint accessibility
      const response = await page.request.get('https://jirauat.smedigitalapps.com/jira/rest/api/2/myself');
      
      // Test 1: API endpoint responds
      expect([200, 401, 403]).toContain(response.status()); // 200 if logged in, 401/403 if not
      
      // Test 2: Response format is valid
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('name');
      }
      
      recordTestResult('REST API Compatibility', 'API Integration', 'pass', Date.now() - startTime, 
                      undefined, `API Status: ${response.status()}`);
      
    } catch (error) {
      recordTestResult('REST API Compatibility', 'API Integration', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test('Mobile Responsiveness - JIRA 10.3 Mobile Experience', async ({ page }) => {
    const startTime = Date.now();
    
    try {
      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667, name: 'iPhone SE' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 390, height: 844, name: 'iPhone 12' }
      ];
      
      let allViewportsWork = true;
      let failedViewports: string[] = [];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa', { 
          waitUntil: 'commit',
          timeout: 20000 
        });
        
        await page.waitForTimeout(2000);
        
        // Check if main content is visible and properly sized
        const bodyVisible = await page.locator('body').isVisible();
        const hasHorizontalScroll = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
        
        if (!bodyVisible || hasHorizontalScroll) {
          allViewportsWork = false;
          failedViewports.push(viewport.name);
        }
      }
      
      expect(allViewportsWork).toBeTruthy();
      
      recordTestResult('Mobile Responsiveness', 'User Experience', allViewportsWork ? 'pass' : 'fail', 
                      Date.now() - startTime, 
                      failedViewports.length > 0 ? `Failed viewports: ${failedViewports.join(', ')}` : undefined);
      
    } catch (error) {
      recordTestResult('Mobile Responsiveness', 'User Experience', 'fail', Date.now() - startTime, error?.toString());
      throw error;
    }
  });

  test.afterAll(async () => {
    // Generate comprehensive test report
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportData = {
      testSuite: 'JIRA 10.3 Upgrade Validation',
      timestamp,
      totalTests: testResults.length,
      passedTests: testResults.filter(t => t.status === 'pass').length,
      failedTests: testResults.filter(t => t.status === 'fail').length,
      testResults,
      performanceMetrics,
      summary: {
        coreFeatures: testResults.filter(t => t.category === 'Core Features'),
        searchNavigation: testResults.filter(t => t.category === 'Search & Navigation'),
        projectManagement: testResults.filter(t => t.category === 'Project Management'),
        administration: testResults.filter(t => t.category === 'Administration'),
        reporting: testResults.filter(t => t.category === 'Reporting'),
        userExperience: testResults.filter(t => t.category === 'User Experience'),
        apiIntegration: testResults.filter(t => t.category === 'API Integration')
      }
    };
    
    // Save detailed JSON report
    fs.writeFileSync(`jira-10.3-test-results-${timestamp}.json`, JSON.stringify(reportData, null, 2));
    
    console.log('📊 JIRA 10.3 Upgrade Test Results:');
    console.log(`✅ Passed: ${reportData.passedTests}/${reportData.totalTests}`);
    console.log(`❌ Failed: ${reportData.failedTests}/${reportData.totalTests}`);
    console.log(`📁 Report saved: jira-10.3-test-results-${timestamp}.json`);
  });
}); 