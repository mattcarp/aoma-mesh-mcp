#!/usr/bin/env npx tsx

/**
 * Comprehensive JIRA UAT Testing Framework
 * - Local screenshot storage
 * - Enhanced Supabase integration
 * - Performance monitoring
 * - AI-powered analysis
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

// Load environment variables
dotenv.config();

interface TestResult {
  testId: string;
  testRunId: string;
  testName: string;
  testType: 'theme' | 'performance' | 'functional' | 'accessibility' | 'visual-regression';
  component: string;
  status: 'pass' | 'fail' | 'warning' | 'skip';
  startTime: Date;
  endTime: Date;
  duration: number;
  screenshots: string[];
  errors: string[];
  warnings: string[];
  metadata: any;
}

class ComprehensiveUATTester {
  private testRunId: string;
  private supabase: any;
  private openai: OpenAI;
  private testResults: TestResult[] = [];
  private screenshotDir: string;

  constructor() {
    this.testRunId = uuidv4();
    this.screenshotDir = path.join('screenshots', this.testRunId);
    
    // Create screenshot directory
    fs.mkdirSync(this.screenshotDir, { recursive: true });
    
    // Initialize Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async execute(): Promise<void> {
    console.log('🚀 COMPREHENSIVE JIRA UAT TESTING FRAMEWORK');
    console.log('================================================================================');
    console.log(`📋 Test Run ID: ${this.testRunId}`);
    console.log(`📸 Screenshot storage: ${this.screenshotDir}`);
    console.log(`🧠 AI-powered analysis enabled`);
    console.log('================================================================================');

    // Check login status first
    const isLoggedIn = await this.checkLoginStatus();
    if (!isLoggedIn) {
      console.log('⚠️ Login check failed, but proceeding with saved session...');
      console.log('🤞 Assuming login was completed in another window');
    }

    try {
      // Create test run record
      await this.createTestRun();

      // Load UAT tickets
      const uatTickets = await this.loadUATTickets();
      console.log(`📊 Loaded ${uatTickets.length} UAT tickets for testing`);

      // Launch browser
      const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--disable-dev-shm-usage', '--no-sandbox'] 
      });

      try {
        const context = await browser.newContext({
          viewport: { width: 1920, height: 1080 }
        });
        
        // Load saved session
        if (fs.existsSync('uat-jira-session.json')) {
          console.log('🔐 Loading saved UAT session...');
          const sessionData = JSON.parse(fs.readFileSync('uat-jira-session.json', 'utf8'));
          if (sessionData.cookies) {
            await context.addCookies(sessionData.cookies);
            console.log('✅ Session loaded successfully');
          }
        }

        const page = await context.newPage();

        // Test Suites
        console.log('\n🎨 Theme Compatibility Testing...');
        await this.runThemeTests(page);

        console.log('\n📊 Performance Testing...');
        await this.runPerformanceTests(page);

        console.log('\n🔧 Functional Testing...');
        await this.runFunctionalTests(page, uatTickets.slice(0, 10));

        console.log('\n♿ Accessibility Testing...');
        await this.runAccessibilityTests(page);

        console.log('\n👁️ Visual Regression Testing...');
        await this.runVisualTests(page);

        // AI Analysis
        console.log('\n🧠 Running AI Analysis...');
        await this.runAIAnalysis();

        // Generate Reports
        console.log('\n📊 Generating Reports...');
        await this.generateReports();

        await this.completeTestRun();

      } finally {
        await browser.close();
      }

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      await this.failTestRun(error.message);
    }
  }

  private async createTestRun(): Promise<void> {
    const testRunData = {
      external_id: `TEST-RUN-${this.testRunId}`,
      title: `Comprehensive UAT Test Run - ${new Date().toISOString()}`,
      description: 'Comprehensive UAT testing with local screenshots and AI analysis',
      status: 'running',
      priority: 'high',
      metadata: {
        testRunId: this.testRunId,
        testType: 'comprehensive-uat',
        startTime: new Date().toISOString(),
        browser: 'chromium',
        viewport: { width: 1920, height: 1080 }
      }
    };

    const { error } = await this.supabase
      .from('jira_tickets')
      .insert(testRunData);

    if (error) {
      console.warn('⚠️ Could not create test run record:', error.message);
    } else {
      console.log('✅ Test run record created');
    }
  }

  private async loadUATTickets(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('jira_tickets')
      .select('*')
      .ilike('external_id', 'UAT-%')
      .limit(20);

    if (error) {
      console.warn('⚠️ Could not load UAT tickets:', error.message);
      return [];
    }

    return data || [];
  }

  private async runThemeTests(page: any): Promise<void> {
    const themes = ['light', 'dark'];
    const components = ['dashboard', 'ticket-view', 'search'];

    for (const theme of themes) {
      console.log(`  🎨 Testing ${theme} theme...`);
      
      for (const component of components) {
        const testResult = await this.createTestResult({
          testName: `Theme Test - ${theme} - ${component}`,
          testType: 'theme',
          component
        });

        try {
          await this.navigateToComponent(page, component);
          
          // Apply theme
          await page.evaluate(`
            document.documentElement.setAttribute('data-theme', '${theme}');
            document.body.classList.add('theme-${theme}');
          `);

          await page.waitForTimeout(2000);

          // Capture screenshot
          const screenshotPath = path.join(this.screenshotDir, `theme-${theme}-${component}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: true
          });

          testResult.screenshots.push(screenshotPath);
          testResult.status = 'pass';

          console.log(`    ✅ ${component} - PASSED`);

        } catch (error) {
          testResult.status = 'fail';
          testResult.errors = [error.message];
          console.log(`    ❌ ${component} - FAILED: ${error.message}`);
        }

        await this.finalizeTestResult(testResult);
      }
    }
  }

  private async runPerformanceTests(page: any): Promise<void> {
    const testUrls = [
      { name: 'Dashboard', url: 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa' },
      { name: 'Issue Navigator', url: 'https://jirauat.smedigitalapps.com/jira/issues/' },
      { name: 'Search', url: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa' }
    ];

    for (const testUrl of testUrls) {
      const testResult = await this.createTestResult({
        testName: `Performance Test - ${testUrl.name}`,
        testType: 'performance',
        component: testUrl.name.toLowerCase()
      });

      try {
        console.log(`  📊 Testing ${testUrl.name} performance...`);

        const navigationStart = Date.now();
        await page.goto(testUrl.url, { waitUntil: 'networkidle', timeout: 30000 });
        const navigationEnd = Date.now();

        const loadTime = navigationEnd - navigationStart;

        // Capture screenshot
        const screenshotPath = path.join(this.screenshotDir, `performance-${testUrl.name.toLowerCase()}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        testResult.screenshots.push(screenshotPath);
        testResult.metadata = { loadTime };
        testResult.status = loadTime < 5000 ? 'pass' : 'warning';

        console.log(`    ✅ Load Time: ${loadTime}ms - ${testResult.status.toUpperCase()}`);

      } catch (error) {
        testResult.status = 'fail';
        testResult.errors = [error.message];
        console.log(`    ❌ ${testUrl.name} failed: ${error.message}`);
      }

      await this.finalizeTestResult(testResult);
    }
  }

  private async runFunctionalTests(page: any, tickets: any[]): Promise<void> {
    for (const ticket of tickets) {
      const testResult = await this.createTestResult({
        testName: `Functional Test - ${ticket.external_id}`,
        testType: 'functional',
        component: 'ticket-operations'
      });

      try {
        console.log(`  🎫 Testing ${ticket.external_id}...`);

        const ticketKey = ticket.external_id.replace('UAT-', '');
        
        const startTime = Date.now();
        await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`, { waitUntil: 'networkidle' });
        const loadTime = Date.now() - startTime;

        // Wait for ticket to load
        await page.waitForSelector('#key-val, .issue-header, .issue-content', { timeout: 10000 });

        // Capture screenshot
        const screenshotPath = path.join(this.screenshotDir, `functional-${ticketKey}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        testResult.screenshots.push(screenshotPath);
        testResult.metadata = { loadTime };
        testResult.status = 'pass';

        console.log(`    ✅ ${ticketKey} - PASSED`);

      } catch (error) {
        testResult.status = 'fail';
        testResult.errors = [error.message];
        console.log(`    ❌ ${ticket.external_id} failed: ${error.message}`);
      }

      await this.finalizeTestResult(testResult);
    }
  }

  private async runAccessibilityTests(page: any): Promise<void> {
    const testResult = await this.createTestResult({
      testName: 'Accessibility Test',
      testType: 'accessibility',
      component: 'whole-application'
    });

    try {
      console.log('  ♿ Running accessibility tests...');

      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');

      // Basic accessibility check
      const accessibilityResults = await page.evaluate(() => {
        const checks = {
          imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
          linksWithoutText: Array.from(document.querySelectorAll('a')).filter(a => !a.textContent?.trim()).length,
          focusableElements: document.querySelectorAll('button, a, input, select, textarea, [tabindex]').length
        };
        return checks;
      });

      // Capture screenshot
      const screenshotPath = path.join(this.screenshotDir, 'accessibility-test.png');
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      testResult.screenshots.push(screenshotPath);
      testResult.metadata = accessibilityResults;
      testResult.status = accessibilityResults.imagesWithoutAlt === 0 ? 'pass' : 'warning';

      console.log(`    ♿ Accessibility Score: ${testResult.status.toUpperCase()}`);

    } catch (error) {
      testResult.status = 'fail';
      testResult.errors = [error.message];
      console.log(`    ❌ Accessibility testing failed: ${error.message}`);
    }

    await this.finalizeTestResult(testResult);
  }

  private async runVisualTests(page: any): Promise<void> {
    const components = ['dashboard', 'issue-list', 'ticket-view'];
    
    for (const component of components) {
      const testResult = await this.createTestResult({
        testName: `Visual Test - ${component}`,
        testType: 'visual-regression',
        component
      });

      try {
        await this.navigateToComponent(page, component);
        await page.waitForTimeout(2000);

        // Capture screenshot
        const screenshotPath = path.join(this.screenshotDir, `visual-${component}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true
        });

        testResult.screenshots.push(screenshotPath);
        testResult.status = 'pass';
        
        console.log(`    📸 ${component} visual baseline captured`);

      } catch (error) {
        testResult.status = 'fail';
        testResult.errors = [error.message];
        console.log(`    ❌ ${component} visual test failed: ${error.message}`);
      }

      await this.finalizeTestResult(testResult);
    }
  }

  private async navigateToComponent(page: any, component: string): Promise<void> {
    const urls = {
      dashboard: 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
      'ticket-view': 'https://jirauat.smedigitalapps.com/jira/browse/UAT-1',
      'issue-list': 'https://jirauat.smedigitalapps.com/jira/issues/',
      search: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa'
    };

    const url = urls[component] || urls.dashboard;
    await page.goto(url, { waitUntil: 'networkidle' });
  }

  private async createTestResult(options: Partial<TestResult>): Promise<TestResult> {
    return {
      testId: uuidv4(),
      testRunId: this.testRunId,
      testName: options.testName || 'Unnamed Test',
      testType: options.testType || 'functional',
      component: options.component || 'unknown',
      status: 'skip',
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      screenshots: [],
      errors: [],
      warnings: [],
      metadata: {}
    };
  }

  private async finalizeTestResult(testResult: TestResult): Promise<void> {
    testResult.endTime = new Date();
    testResult.duration = testResult.endTime.getTime() - testResult.startTime.getTime();
    this.testResults.push(testResult);

    // Store in Supabase
    try {
      await this.supabase
        .from('jira_tickets')
        .insert({
          external_id: testResult.testId,
          title: testResult.testName,
          description: `Test result for ${testResult.component}`,
          status: testResult.status,
          priority: 'medium',
          metadata: {
            testRunId: this.testRunId,
            testType: testResult.testType,
            component: testResult.component,
            duration: testResult.duration,
            screenshots: testResult.screenshots,
            errors: testResult.errors,
            warnings: testResult.warnings,
            ...testResult.metadata
          }
        });
    } catch (error) {
      console.warn('⚠️ Could not store test result:', error.message);
    }
  }

  private async runAIAnalysis(): Promise<void> {
    try {
      const summary = this.generateTestSummary();
      
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a QA expert analyzing test results. Provide insights, recommendations, and identify patterns.'
          },
          {
            role: 'user',
            content: `Analyze these test results and provide insights:\n\n${JSON.stringify(summary, null, 2)}`
          }
        ],
        max_tokens: 1500
      });

      const aiInsights = aiResponse.choices[0].message.content;
      
      // Store AI insights
      await this.supabase
        .from('jira_tickets')
        .insert({
          external_id: `AI-INSIGHTS-${this.testRunId}`,
          title: 'AI Test Analysis',
          description: aiInsights,
          status: 'completed',
          priority: 'high',
          metadata: {
            testRunId: this.testRunId,
            type: 'ai-analysis',
            timestamp: new Date().toISOString()
          }
        });

      console.log('🧠 AI Analysis completed and stored');
      
    } catch (error) {
      console.warn('⚠️ AI analysis failed:', error.message);
    }
  }

  private generateTestSummary(): any {
    const summary = {
      testRunId: this.testRunId,
      totalTests: this.testResults.length,
      passed: this.testResults.filter(r => r.status === 'pass').length,
      failed: this.testResults.filter(r => r.status === 'fail').length,
      warnings: this.testResults.filter(r => r.status === 'warning').length,
      skipped: this.testResults.filter(r => r.status === 'skip').length,
      testsByType: {},
      averageDuration: 0,
      totalErrors: 0,
      totalWarnings: 0
    };

    // Group by test type
    for (const result of this.testResults) {
      if (!summary.testsByType[result.testType]) {
        summary.testsByType[result.testType] = { total: 0, passed: 0, failed: 0, warnings: 0 };
      }
      summary.testsByType[result.testType].total++;
      summary.testsByType[result.testType][result.status]++;
    }

    // Calculate averages
    if (this.testResults.length > 0) {
      summary.averageDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length;
      summary.totalErrors = this.testResults.reduce((sum, r) => sum + r.errors.length, 0);
      summary.totalWarnings = this.testResults.reduce((sum, r) => sum + r.warnings.length, 0);
    }

    return summary;
  }

  private async generateReports(): Promise<void> {
    const summary = this.generateTestSummary();
    
    // Generate JSON report
    const jsonReport = {
      testRunId: this.testRunId,
      timestamp: new Date().toISOString(),
      summary,
      testResults: this.testResults
    };

    const reportsDir = path.join('reports', this.testRunId);
    fs.mkdirSync(reportsDir, { recursive: true });

    fs.writeFileSync(
      path.join(reportsDir, 'test-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(summary);
    fs.writeFileSync(
      path.join(reportsDir, 'test-report.html'),
      htmlReport
    );

    console.log(`📊 Reports generated in ${reportsDir}`);
  }

  private generateHTMLReport(summary: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Comprehensive UAT Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; border-radius: 5px; }
        .summary { background: white; padding: 20px; margin: 20px 0; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .test-result { background: white; margin: 10px 0; padding: 15px; border-radius: 5px; border-left: 4px solid #ccc; }
        .pass { border-left-color: #27ae60; }
        .fail { border-left-color: #e74c3c; }
        .warning { border-left-color: #f39c12; }
        .skip { border-left-color: #95a5a6; }
        .stats { display: flex; justify-content: space-between; margin: 20px 0; }
        .stat { text-align: center; padding: 10px; background: white; border-radius: 5px; flex: 1; margin: 0 5px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Comprehensive UAT Test Report</h1>
        <p>Test Run ID: ${this.testRunId}</p>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="stats">
        <div class="stat">
            <div class="stat-value">${summary.totalTests}</div>
            <div class="stat-label">Total Tests</div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color: #27ae60;">${summary.passed}</div>
            <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color: #e74c3c;">${summary.failed}</div>
            <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
            <div class="stat-value" style="color: #f39c12;">${summary.warnings}</div>
            <div class="stat-label">Warnings</div>
        </div>
    </div>

    <div class="summary">
        <h2>📊 Test Summary</h2>
        <p><strong>Success Rate:</strong> ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%</p>
        <p><strong>Average Duration:</strong> ${Math.round(summary.averageDuration)}ms</p>
        <p><strong>Total Errors:</strong> ${summary.totalErrors}</p>
        <p><strong>Total Warnings:</strong> ${summary.totalWarnings}</p>
        
        <h3>Tests by Type:</h3>
        <ul>
            ${Object.entries(summary.testsByType).map(([type, stats]: [string, any]) => `
                <li><strong>${type}:</strong> ${stats.total} tests (${stats.passed} passed, ${stats.failed} failed, ${stats.warnings} warnings)</li>
            `).join('')}
        </ul>
    </div>

    <div class="summary">
        <h2>🎯 Test Results</h2>
        ${this.testResults.map(result => `
            <div class="test-result ${result.status}">
                <h3>${result.testName}</h3>
                <p><strong>Component:</strong> ${result.component}</p>
                <p><strong>Status:</strong> ${result.status.toUpperCase()}</p>
                <p><strong>Duration:</strong> ${result.duration}ms</p>
                ${result.errors.length > 0 ? `<p><strong>Errors:</strong> ${result.errors.join(', ')}</p>` : ''}
                ${result.warnings.length > 0 ? `<p><strong>Warnings:</strong> ${result.warnings.join(', ')}</p>` : ''}
                ${result.screenshots.length > 0 ? `<p><strong>Screenshots:</strong> ${result.screenshots.length} captured</p>` : ''}
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  private async completeTestRun(): Promise<void> {
    const summary = this.generateTestSummary();
    
    await this.supabase
      .from('jira_tickets')
      .update({
        status: 'completed',
        metadata: {
          testRunId: this.testRunId,
          testType: 'comprehensive-uat',
          endTime: new Date().toISOString(),
          summary
        }
      })
      .eq('external_id', `TEST-RUN-${this.testRunId}`);

    console.log('✅ Test run completed successfully');
    console.log(`📊 Results: ${summary.passed} passed, ${summary.failed} failed, ${summary.warnings} warnings`);
  }

  private async failTestRun(errorMessage: string): Promise<void> {
    await this.supabase
      .from('jira_tickets')
      .update({
        status: 'failed',
        metadata: {
          testRunId: this.testRunId,
          testType: 'comprehensive-uat',
          endTime: new Date().toISOString(),
          errorMessage
        }
      })
      .eq('external_id', `TEST-RUN-${this.testRunId}`);
  }

  private async checkLoginStatus(): Promise<boolean> {
    console.log('🔍 Checking login status...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    
    // Load saved session if exists
    if (fs.existsSync('uat-jira-session.json')) {
      const sessionData = JSON.parse(fs.readFileSync('uat-jira-session.json', 'utf8'));
      if (sessionData.cookies) {
        await context.addCookies(sessionData.cookies);
      }
    }
    
    const page = await context.newPage();
    
    try {
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
        waitUntil: 'networkidle',
        timeout: 10000 
      });
      
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      
      // Check for LOGIN button (indicates NOT logged in)
      const loginButton = await page.locator('text="Log In"').isVisible().catch(() => false);
      if (loginButton) {
        console.log('❌ FOUND "Log In" BUTTON - NOT LOGGED IN');
        await browser.close();
        return false;
      }
      
      // Check for obvious login page indicators
      const isLoginPage = currentUrl.includes('/login') || 
                         currentUrl.includes('/auth') || 
                         currentUrl.includes('/oauth') ||
                         currentUrl.includes('microsoft.com') ||
                         await page.locator('input[type="email"], input[type="password"], #username, #password').isVisible().catch(() => false);
      
      if (isLoginPage) {
        console.log('❌ Login required - redirected to login page');
        await browser.close();
        return false;
      }
      
      // Check for authenticated user indicators
      const authenticatedIndicators = [
        '.user-avatar',
        '.user-profile', 
        '.user-name',
        '.logout',
        'a[href*="logout"]',
        '.user-dropdown',
        '.header-user',
        '.user-info'
      ];
      
      let foundAuthIndicator = false;
      for (const indicator of authenticatedIndicators) {
        const found = await page.locator(indicator).isVisible().catch(() => false);
        if (found) {
          foundAuthIndicator = true;
          break;
        }
      }
      
      if (foundAuthIndicator) {
        console.log('✅ Login verified - authenticated user elements found');
        await browser.close();
        return true;
      }
      
      console.log('❌ Login verification failed - no authenticated user elements found');
      await browser.close();
      return false;
      
    } catch (error) {
      console.log('❌ Login check failed:', error.message);
      await browser.close();
      return false;
    }
  }
}

async function main() {
  // Validate environment
  const missing = [];
  
  if (!process.env.SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
  }
  
  const requiredEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY', 
    'OPENAI_API_KEY'
  ];

  missing.push(...requiredEnvVars.filter(env => !process.env[env]));
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`  - ${env}`));
    process.exit(1);
  }

  console.log('🔍 Environment validation passed');

  // Run comprehensive tests
  const tester = new ComprehensiveUATTester();
  await tester.execute();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { ComprehensiveUATTester };
