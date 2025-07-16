import { chromium, Page } from 'playwright';
import { promises as fs } from 'fs';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  duration: number;
  details: string;
  screenshot?: string;
  url?: string;
  metrics?: any;
}

class ITSMTestRunner {
  private results: TestResult[] = [];
  private reportId = `itsm-comprehensive-${Date.now()}`;

  async launchBrowserAndTest() {
    console.log('🦁 LAUNCHING BROWSER FOR MANUAL LOGIN + COMPREHENSIVE TESTING');
    console.log('===========================================================');

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
    
    console.log('🌐 Opening JIRA UAT - Please log in manually...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/');
    
    console.log('⏳ Waiting for you to complete login...');
    console.log('📝 Check the browser and log in, then press ENTER in this terminal when ready');
    
    // Wait for user input
    await this.waitForEnterKey();
    
    console.log('🚀 Starting comprehensive test execution...');
    
    try {
      // Test Suite 1: Authentication & Access Validation
      await this.testAuthenticationStatus(page);
      await this.testProjectAccess(page);
      
      // Test Suite 2: ITSM Core Functionality
      await this.testITSMDashboard(page);
      await this.testITSMIssueNavigator(page);
      await this.testITSMSearch(page);
      await this.testITSMProjectBrowser(page);
      
      // Test Suite 3: Performance Benchmarks
      await this.performanceValidation(page);
      
      // Test Suite 4: Critical ITSM Workflows
      await this.testTicketCreation(page);
      await this.testWorkflowTransitions(page);
      
      // Test Suite 5: Security Validation (OWASP adapted)
      await this.securityValidation(page);

      // Generate comprehensive reports
      await this.generateReports();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.addResult('CRITICAL_ERROR', 'FAIL', 0, `Critical error: ${error.message}`);
      await this.generateReports();
    } finally {
      console.log('\n🔄 Keeping browser open for review...');
      console.log('Press ENTER again to close browser and exit');
      await this.waitForEnterKey();
      await browser.close();
    }
  }

  private waitForEnterKey(): Promise<void> {
    return new Promise((resolve) => {
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.once('data', () => {
        resolve();
      });
    });
  }

  async testAuthenticationStatus(page: Page) {
    console.log('\n🔐 Testing Authentication Status...');
    const start = Date.now();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { timeout: 30000 });
      
      const title = await page.title();
      const isLoggedIn = !title.includes('Log in') && !title.includes('Sign in');
      
      if (isLoggedIn) {
        const screenshot = await this.captureScreenshot(page, 'auth-success');
        this.addResult('AUTH_STATUS', 'PASS', Date.now() - start, 
          `Successfully authenticated. Title: ${title}`, screenshot);
        console.log('✅ Authentication validated');
      } else {
        this.addResult('AUTH_STATUS', 'FAIL', Date.now() - start, 
          `Not properly authenticated. Title: ${title}`);
        console.log('❌ Authentication failed');
      }
    } catch (error) {
      this.addResult('AUTH_STATUS', 'FAIL', Date.now() - start, 
        `Authentication test failed: ${error.message}`);
    }
  }

  async testProjectAccess(page: Page) {
    console.log('\n📁 Testing Project Access...');
    const start = Date.now();
    
    try {
      // Test API access to projects
      const response = await page.request.get('https://jirauat.smedigitalapps.com/jira/rest/api/2/project');
      const projects = await response.json();
      
      const hasProjects = Array.isArray(projects) && projects.length > 0;
      const hasITSM = projects.some((p: any) => p.key === 'ITSM');
      
      this.addResult('PROJECT_ACCESS', hasProjects ? 'PASS' : 'FAIL', Date.now() - start,
        `Found ${projects.length} projects. ITSM access: ${hasITSM}`);
      
      console.log(`📊 Found ${projects.length} accessible projects`);
      if (hasITSM) console.log('✅ ITSM project access confirmed');
      
    } catch (error) {
      this.addResult('PROJECT_ACCESS', 'FAIL', Date.now() - start,
        `Project access test failed: ${error.message}`);
    }
  }

  async testITSMDashboard(page: Page) {
    console.log('\n📊 Testing ITSM Dashboard Performance...');
    const start = Date.now();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
        waitUntil: 'networkidle', timeout: 30000 
      });
      
      const loadTime = Date.now() - start;
      const screenshot = await this.captureScreenshot(page, 'itsm-dashboard');
      
      // Capture performance metrics
      const metrics = await page.evaluate(() => ({
        timing: performance.timing,
        navigation: performance.navigation
      }));
      
      const status: 'PASS' | 'WARN' = loadTime < 10000 ? 'PASS' : 'WARN';
      this.addResult('ITSM_DASHBOARD', status, loadTime,
        `Dashboard loaded in ${loadTime}ms`, screenshot, page.url(), metrics);
        
      console.log(`📈 Dashboard load time: ${loadTime}ms`);
      
    } catch (error) {
      this.addResult('ITSM_DASHBOARD', 'FAIL', Date.now() - start,
        `Dashboard test failed: ${error.message}`);
    }
  }

  async testITSMIssueNavigator(page: Page) {
    console.log('\n🔍 Testing ITSM Issue Navigator...');
    const start = Date.now();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa', { 
        waitUntil: 'networkidle', timeout: 30000 
      });
      
      const loadTime = Date.now() - start;
      const screenshot = await this.captureScreenshot(page, 'itsm-issue-navigator');
      
      const title = await page.title();
      const isWorking = !title.includes('Log in') && !title.includes('Error');
      
      const status: 'PASS' | 'WARN' = isWorking && loadTime < 15000 ? 'PASS' : 'WARN';
      this.addResult('ITSM_ISSUE_NAVIGATOR', status, loadTime,
        `Issue Navigator loaded in ${loadTime}ms. Title: ${title}`, screenshot);
        
      console.log(`🔍 Issue Navigator load time: ${loadTime}ms`);
      
    } catch (error) {
      this.addResult('ITSM_ISSUE_NAVIGATOR', 'FAIL', Date.now() - start,
        `Issue Navigator test failed: ${error.message}`);
    }
  }

  async testITSMSearch(page: Page) {
    console.log('\n🔎 Testing ITSM Search Functionality...');
    const start = Date.now();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM', { 
        waitUntil: 'networkidle', timeout: 30000 
      });
      
      const loadTime = Date.now() - start;
      const screenshot = await this.captureScreenshot(page, 'itsm-search');
      
      // Check for search results or error messages
      const hasResults = await page.locator('[data-testid="issue.views.issue-base.foundation.summary"]').count() > 0;
      const hasError = await page.locator('text="Sorry, you do not have permission"').count() > 0;
      
      let status: 'PASS' | 'FAIL' | 'WARN' = 'FAIL';
      let details = '';
      
      if (hasError) {
        status = 'FAIL';
        details = `Permission error accessing ITSM project search`;
      } else if (hasResults) {
        status = 'PASS';
        details = `ITSM search working, results found in ${loadTime}ms`;
      } else {
        status = 'WARN';
        details = `ITSM search accessible but no results found in ${loadTime}ms`;
      }
      
      this.addResult('ITSM_SEARCH', status, loadTime, details, screenshot);
      console.log(`🔎 ${details}`);
      
    } catch (error) {
      this.addResult('ITSM_SEARCH', 'FAIL', Date.now() - start,
        `ITSM search test failed: ${error.message}`);
    }
  }

  async testITSMProjectBrowser(page: Page) {
    console.log('\n📂 Testing ITSM Project Browser...');
    const start = Date.now();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa', { 
        waitUntil: 'networkidle', timeout: 30000 
      });
      
      const loadTime = Date.now() - start;
      const screenshot = await this.captureScreenshot(page, 'itsm-project-browser');
      
      // Look for ITSM project specifically
      const itsmVisible = await page.locator('text="ITSM"').count() > 0;
      const loginRequired = await page.locator('text="Log in"').count() > 0;
      
      let status: 'PASS' | 'FAIL' | 'WARN' = loginRequired ? 'FAIL' : (itsmVisible ? 'PASS' : 'WARN');
      let details = loginRequired ? 'Login required for project browser' : 
                   itsmVisible ? `ITSM project visible in browser (${loadTime}ms)` :
                   `Project browser accessible but ITSM not visible (${loadTime}ms)`;
      
      this.addResult('ITSM_PROJECT_BROWSER', status, loadTime, details, screenshot);
      console.log(`📂 ${details}`);
      
    } catch (error) {
      this.addResult('ITSM_PROJECT_BROWSER', 'FAIL', Date.now() - start,
        `Project browser test failed: ${error.message}`);
    }
  }

  async performanceValidation(page: Page) {
    console.log('\n⚡ Performance Validation Suite...');
    
    const testUrls = [
      'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
      'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa',
      'https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC',
      'https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa'
    ];
    
    for (const url of testUrls) {
      const start = Date.now();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        const loadTime = Date.now() - start;
        
        const urlName = url.split('/').pop()?.split('?')[0] || 'unknown';
        const status: 'PASS' | 'WARN' | 'FAIL' = loadTime < 5000 ? 'PASS' : loadTime < 10000 ? 'WARN' : 'FAIL';
        
        this.addResult('PERF_' + urlName.toUpperCase(), status, loadTime,
          `${urlName} performance: ${loadTime}ms`);
          
        console.log(`⚡ ${urlName}: ${loadTime}ms`);
        
      } catch (error) {
        this.addResult('PERF_ERROR', 'FAIL', Date.now() - start,
          `Performance test failed: ${error.message}`);
      }
    }
  }

  async testTicketCreation(page: Page) {
    console.log('\n🎫 Testing Ticket Creation Workflow...');
    const start = Date.now();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa', { 
        waitUntil: 'networkidle', timeout: 30000 
      });
      
      const loadTime = Date.now() - start;
      const screenshot = await this.captureScreenshot(page, 'ticket-creation');
      
      // Check if create issue form is accessible
      const hasCreateForm = await page.locator('#issue-create').count() > 0 ||
                           await page.locator('text="Create Issue"').count() > 0;
      const hasError = await page.locator('text="permission"').count() > 0;
      
      let status: 'PASS' | 'FAIL' | 'WARN' = hasError ? 'FAIL' : hasCreateForm ? 'PASS' : 'WARN';
      let details = hasError ? 'Permission error accessing ticket creation' :
                   hasCreateForm ? `Ticket creation form accessible (${loadTime}ms)` :
                   `Create issue page loaded but form not found (${loadTime}ms)`;
      
      this.addResult('TICKET_CREATION', status, loadTime, details, screenshot);
      console.log(`🎫 ${details}`);
      
    } catch (error) {
      this.addResult('TICKET_CREATION', 'FAIL', Date.now() - start,
        `Ticket creation test failed: ${error.message}`);
    }
  }

  async testWorkflowTransitions(page: Page) {
    console.log('\n🔄 Testing Workflow Transitions...');
    
    // Test basic workflow access by checking if we can access workflow schemes
    const start = Date.now();
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/admin/workflows/ListWorkflows.jspa', { 
        waitUntil: 'networkidle', timeout: 30000 
      });
      
      const loadTime = Date.now() - start;
      const isAdmin = await page.locator('text="Workflows"').count() > 0;
      const status: 'PASS' | 'WARN' = isAdmin ? 'PASS' : 'WARN';
      
      this.addResult('WORKFLOW_ACCESS', status, loadTime,
        isAdmin ? 'Workflow administration accessible' : 'Limited workflow access (non-admin)');
        
      console.log(`🔄 Workflow access: ${isAdmin ? 'Admin' : 'Limited'}`);
      
    } catch (error) {
      this.addResult('WORKFLOW_ACCESS', 'FAIL', Date.now() - start,
        `Workflow test failed: ${error.message}`);
    }
  }

  async securityValidation(page: Page) {
    console.log('\n🔒 OWASP Security Validation...');
    
    // Test for common security headers and HTTPS
    const start = Date.now();
    try {
      const response = await page.request.get('https://jirauat.smedigitalapps.com/jira/');
      const headers = response.headers();
      
      const securityChecks = {
        https: page.url().startsWith('https://'),
        xFrameOptions: !!headers['x-frame-options'],
        contentTypeOptions: !!headers['x-content-type-options'],
        xssProtection: !!headers['x-xss-protection'],
        hsts: !!headers['strict-transport-security']
      };
      
      const passedChecks = Object.values(securityChecks).filter(Boolean).length;
      const status: 'PASS' | 'WARN' | 'FAIL' = passedChecks >= 3 ? 'PASS' : passedChecks >= 2 ? 'WARN' : 'FAIL';
      
      this.addResult('SECURITY_HEADERS', status, Date.now() - start,
        `Security validation: ${passedChecks}/5 checks passed`);
        
      console.log(`🔒 Security score: ${passedChecks}/5 checks passed`);
      
    } catch (error) {
      this.addResult('SECURITY_HEADERS', 'FAIL', Date.now() - start,
        `Security validation failed: ${error.message}`);
    }
  }

  async captureScreenshot(page: Page, name: string): Promise<string> {
    try {
      const screenshotPath = `screenshots/${this.reportId}/${name}-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      return screenshotPath;
    } catch (error) {
      console.warn(`Screenshot failed for ${name}:`, error.message);
      return '';
    }
  }

  addResult(testName: string, status: TestResult['status'], duration: number, details: string, screenshot?: string, url?: string, metrics?: any) {
    this.results.push({
      testName,
      status,
      duration,
      details,
      screenshot,
      url,
      metrics
    });
  }

  async generateReports() {
    console.log('\n📊 Generating Comprehensive Reports...');
    
    const summary = {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      warnings: this.results.filter(r => r.status === 'WARN').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
      timestamp: new Date().toISOString(),
      reportId: this.reportId
    };

    // Save detailed JSON report
    const detailedReport = {
      summary,
      results: this.results,
      metadata: {
        jiraVersion: '10.3.x',
        testSuite: 'ITSM Comprehensive Validation',
        environment: 'UAT'
      }
    };

    await fs.writeFile(`reports/${this.reportId}-detailed.json`, JSON.stringify(detailedReport, null, 2));

    // Generate executive summary
    const executiveSummary = this.generateExecutiveSummary(summary);
    await fs.writeFile(`reports/${this.reportId}-executive-summary.md`, executiveSummary);

    console.log('✅ COMPREHENSIVE TEST EXECUTION COMPLETE!');
    console.log('==========================================');
    console.log(`📊 Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏱️  Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
    console.log(`📁 Reports saved to: reports/${this.reportId}-*`);
    
    return summary;
  }

  generateExecutiveSummary(summary: any): string {
    const successRate = ((summary.passed / summary.totalTests) * 100).toFixed(1);
    
    return `# JIRA 10.3 ITSM Comprehensive Test Report

## Executive Summary
**Test Execution Date:** ${new Date().toLocaleDateString()}  
**Report ID:** ${this.reportId}  
**Success Rate:** ${successRate}%

## Test Results Overview
- **Total Tests Executed:** ${summary.totalTests}
- **✅ Passed:** ${summary.passed}
- **⚠️ Warnings:** ${summary.warnings}  
- **❌ Failed:** ${summary.failed}
- **Total Execution Time:** ${(summary.totalDuration / 1000).toFixed(2)} seconds

## Key Findings
${this.results.map(r => `- **${r.testName}:** ${r.status} - ${r.details}`).join('\n')}

## Recommendations
${summary.failed > 0 ? '🚨 **IMMEDIATE ACTION REQUIRED:** Critical test failures detected.' : ''}
${summary.warnings > 0 ? '⚠️ **ATTENTION NEEDED:** Performance or access warnings identified.' : ''}
${summary.passed === summary.totalTests ? '🎉 **ALL SYSTEMS GO:** Complete test suite passed successfully!' : ''}

## Next Steps
1. Review detailed test results in ${this.reportId}-detailed.json
2. Address any critical failures before production deployment
3. Monitor performance metrics for optimization opportunities

---
*Generated by AOMA Mesh MCP JIRA 10.3 Testing Framework*
`;
  }
}

// Execute the comprehensive test suite
const runner = new ITSMTestRunner();
runner.launchBrowserAndTest().catch(console.error); 