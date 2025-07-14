#!/usr/bin/env npx tsx

/**
 * Simplified JIRA UAT Testing Framework
 * 
 * This version works with the existing Supabase schema and focuses on:
 * - Testing UAT tickets with existing login session
 * - Capturing screenshots and storing in metadata  
 * - AI analysis using AOMA-MESH-MCP
 * - Simple report generation
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

interface TestResult {
  testId: string;
  testName: string;
  ticketKey: string;
  component: string;
  theme: string;
  status: 'pass' | 'fail' | 'warning';
  duration: number;
  screenshots: string[];
  performanceMetrics: any;
  errors: string[];
  metadata: any;
}

class SimplifiedUATTester {
  private testRunId: string;
  private supabase: any;
  private openai: OpenAI;
  private testResults: TestResult[] = [];

  constructor() {
    this.testRunId = uuidv4();
    
    // Initialize Supabase with existing pattern
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
    console.log('🎯 SIMPLIFIED JIRA 10.3.6 UAT TESTING');
    console.log('================================================================================');
    console.log(`📋 Test Run ID: ${this.testRunId}`);
    console.log(`📊 Using existing Supabase schema`);
    console.log('================================================================================');

    try {
      // Create test run record using existing schema
      await this.createTestRun();

      // Load UAT tickets
      const uatTickets = await this.loadUATTickets();
      console.log(`📊 Loaded ${uatTickets.length} UAT tickets for testing`);

      // Launch browser with saved session
      const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
      });

      try {
        const context = await browser.newContext();
        
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

        // Test Suite 1: Theme Compatibility
        console.log('\n🎨 Testing Theme Compatibility...');
        await this.testThemeCompatibility(page, uatTickets.slice(0, 10));

        // Test Suite 2: Performance Metrics
        console.log('\n📊 Testing Performance Metrics...');
        await this.testPerformanceMetrics(page, uatTickets.slice(0, 5));

        // Test Suite 3: Functional Testing
        console.log('\n🔧 Testing Functional Workflows...');
        await this.testFunctionalWorkflows(page, uatTickets.slice(0, 10));

        // AI Analysis
        console.log('\n🧠 Running AI Analysis...');
        await this.runAIAnalysis();

        // Generate Simple Report
        console.log('\n📄 Generating Report...');
        await this.generateSimpleReport();

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
    // Skip database insertion for now, just track in memory
    // The existing test_runs table has foreign key constraints we don't want to break
    console.log('✅ Test run initialized (tracking in memory)');
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

  private async testThemeCompatibility(page: any, tickets: any[]): Promise<void> {
    const themes = ['light', 'dark'];
    const components = ['dashboard', 'ticket-view', 'search'];

    for (const theme of themes) {
      console.log(`  🎨 Testing ${theme} theme...`);
      
      // Navigate to dashboard
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForTimeout(3000);

      // Apply theme (simulate theme switching)
      await page.evaluate(`
        document.documentElement.setAttribute('data-theme', '${theme}');
        document.body.classList.add('theme-${theme}');
      `);

      for (const component of components) {
        const testId = uuidv4();
        const startTime = Date.now();
        
        try {
          await this.navigateToComponent(page, component);
          
          // Capture screenshot
          const screenshotPath = `screenshots/theme-${theme}-${component}-${Date.now()}.png`;
          await this.ensureScreenshotDir();
          
          const screenshot = await page.screenshot({
            path: screenshotPath,
            fullPage: true,
            type: 'png'
          });

          // Check for rendering issues
          const hasRenderingIssues = await page.evaluate(() => {
            // Simple check for invisible text or broken layouts
            const elements = document.querySelectorAll('*');
            let issues = 0;
            
            for (const el of elements) {
              const style = window.getComputedStyle(el);
              if (style.color === style.backgroundColor && el.textContent?.trim()) {
                issues++;
              }
            }
            
            return issues > 0;
          });

          const duration = Date.now() - startTime;
          const status = hasRenderingIssues ? 'warning' : 'pass';

          this.testResults.push({
            testId,
            testName: `Theme Compatibility - ${theme} - ${component}`,
            ticketKey: '',
            component,
            theme,
            status,
            duration,
            screenshots: [screenshotPath],
            performanceMetrics: {},
            errors: hasRenderingIssues ? ['Potential invisible text detected'] : [],
            metadata: {
              testType: 'theme',
              theme,
              component,
              hasRenderingIssues
            }
          });

          console.log(`    ${status === 'pass' ? '✅' : '⚠️'} ${component} - ${status.toUpperCase()}`);

        } catch (error) {
          const duration = Date.now() - startTime;
          
          this.testResults.push({
            testId,
            testName: `Theme Compatibility - ${theme} - ${component}`,
            ticketKey: '',
            component,
            theme,
            status: 'fail',
            duration,
            screenshots: [],
            performanceMetrics: {},
            errors: [error.message],
            metadata: {
              testType: 'theme',
              theme,
              component,
              error: error.message
            }
          });

          console.log(`    ❌ ${component} - FAILED: ${error.message}`);
        }
      }
    }
  }

  private async testPerformanceMetrics(page: any, tickets: any[]): Promise<void> {
    const testUrls = [
      'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
      'https://jirauat.smedigitalapps.com/jira/issues/',
      'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa'
    ];

    for (const url of testUrls) {
      const testId = uuidv4();
      const startTime = Date.now();
      
      console.log(`  📊 Testing ${url.split('/').pop()}...`);
      
      try {
        // Add performance monitoring
        await page.addInitScript(() => {
          window.performanceData = {
            navigationStart: performance.now(),
            marks: []
          };
        });

        await page.goto(url);
        await page.waitForLoadState('networkidle');
        
        // Collect performance metrics
        const metrics = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByType('paint');
          
          return {
            loadTime: nav.loadEventEnd - nav.navigationStart,
            domContentLoaded: nav.domContentLoadedEventEnd - nav.navigationStart,
            ttfb: nav.responseStart - nav.navigationStart,
            fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            networkRequests: performance.getEntriesByType('resource').length,
            pageSize: document.documentElement.innerHTML.length
          };
        });

        // Capture screenshot
        const screenshotPath = `screenshots/performance-${url.split('/').pop()}-${Date.now()}.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: 'png'
        });

        const duration = Date.now() - startTime;
        const status = metrics.loadTime < 5000 ? 'pass' : 'warning';

        this.testResults.push({
          testId,
          testName: `Performance - ${url.split('/').pop()}`,
          ticketKey: '',
          component: 'performance',
          theme: 'default',
          status,
          duration,
          screenshots: [screenshotPath],
          performanceMetrics: metrics,
          errors: [],
          metadata: {
            testType: 'performance',
            url,
            metrics
          }
        });

        console.log(`    ✅ Load Time: ${Math.round(metrics.loadTime)}ms`);
        console.log(`    📊 TTFB: ${Math.round(metrics.ttfb)}ms`);
        console.log(`    🌐 Requests: ${metrics.networkRequests}`);

      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.testResults.push({
          testId,
          testName: `Performance - ${url.split('/').pop()}`,
          ticketKey: '',
          component: 'performance',
          theme: 'default',
          status: 'fail',
          duration,
          screenshots: [],
          performanceMetrics: {},
          errors: [error.message],
          metadata: {
            testType: 'performance',
            url,
            error: error.message
          }
        });

        console.log(`    ❌ Failed: ${error.message}`);
      }
    }
  }

  private async testFunctionalWorkflows(page: any, tickets: any[]): Promise<void> {
    for (const ticket of tickets) {
      const testId = uuidv4();
      const startTime = Date.now();
      
      console.log(`  🎫 Testing ticket ${ticket.external_id}...`);
      
      try {
        // Navigate to ticket
        const ticketKey = ticket.external_id.replace('UAT-', '');
        await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`);
        await page.waitForTimeout(3000);

        // Check if ticket loads
        const ticketLoaded = await page.evaluate(() => {
          return document.querySelector('#key-val, .issue-header, .issue-content') !== null;
        });

        // Capture screenshot
        const screenshotPath = `screenshots/ticket-${ticketKey}-${Date.now()}.png`;
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          type: 'png'
        });

        const duration = Date.now() - startTime;
        const status = ticketLoaded ? 'pass' : 'fail';

        this.testResults.push({
          testId,
          testName: `Ticket View - ${ticketKey}`,
          ticketKey: ticket.external_id,
          component: 'ticket-view',
          theme: 'default',
          status,
          duration,
          screenshots: [screenshotPath],
          performanceMetrics: {},
          errors: ticketLoaded ? [] : ['Ticket did not load properly'],
          metadata: {
            testType: 'functional',
            ticketKey,
            ticketLoaded,
            ticketTitle: ticket.title
          }
        });

        console.log(`    ${status === 'pass' ? '✅' : '❌'} ${ticketKey} - ${status.toUpperCase()}`);

      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.testResults.push({
          testId,
          testName: `Ticket View - ${ticket.external_id}`,
          ticketKey: ticket.external_id,
          component: 'ticket-view',
          theme: 'default',
          status: 'fail',
          duration,
          screenshots: [],
          performanceMetrics: {},
          errors: [error.message],
          metadata: {
            testType: 'functional',
            ticketKey: ticket.external_id,
            error: error.message
          }
        });

        console.log(`    ❌ ${ticket.external_id} - FAILED: ${error.message}`);
      }
    }
  }

  private async navigateToComponent(page: any, component: string): Promise<void> {
    const urls = {
      'dashboard': 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
      'search': 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa',
      'ticket-view': 'https://jirauat.smedigitalapps.com/jira/issues/'
    };

    await page.goto(urls[component] || urls.dashboard);
    await page.waitForTimeout(2000);
  }

  private async ensureScreenshotDir(): Promise<void> {
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }
  }

  private async runAIAnalysis(): Promise<void> {
    try {
      const totalTests = this.testResults.length;
      const passedTests = this.testResults.filter(r => r.status === 'pass').length;
      const failedTests = this.testResults.filter(r => r.status === 'fail').length;
      const warningTests = this.testResults.filter(r => r.status === 'warning').length;

      const prompt = `
        Analyze this JIRA 10.3.6 UAT test run:
        
        RESULTS:
        - Total tests: ${totalTests}
        - Passed: ${passedTests}
        - Failed: ${failedTests}
        - Warnings: ${warningTests}
        
        TEST BREAKDOWN:
        - Theme tests: ${this.testResults.filter(r => r.metadata.testType === 'theme').length}
        - Performance tests: ${this.testResults.filter(r => r.metadata.testType === 'performance').length}
        - Functional tests: ${this.testResults.filter(r => r.metadata.testType === 'functional').length}
        
        ERRORS FOUND:
        ${this.testResults.filter(r => r.errors.length > 0).map(r => `- ${r.testName}: ${r.errors.join(', ')}`).join('\n')}
        
        Provide:
        1. Overall upgrade readiness assessment (0-100%)
        2. Top 3 risks for JIRA 10.3.6 upgrade
        3. Top 3 recommendations
        4. Summary for executive report
        
        Keep response concise and actionable.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600
      });

      const aiAnalysis = response.choices[0]?.message?.content || 'AI analysis failed';
      
      // Store AI analysis in a test result
      this.testResults.push({
        testId: uuidv4(),
        testName: 'AI Analysis',
        ticketKey: '',
        component: 'ai-analysis',
        theme: 'default',
        status: 'pass',
        duration: 0,
        screenshots: [],
        performanceMetrics: {},
        errors: [],
        metadata: {
          testType: 'ai-analysis',
          analysis: aiAnalysis,
          testSummary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            warnings: warningTests
          }
        }
      });

      console.log('✅ AI analysis completed');
      console.log(`📊 Pass Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

    } catch (error) {
      console.warn('Warning: AI analysis failed:', error.message);
    }
  }

  private async generateSimpleReport(): Promise<void> {
    const reportData = {
      testRunId: this.testRunId,
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'pass').length,
        failed: this.testResults.filter(r => r.status === 'fail').length,
        warnings: this.testResults.filter(r => r.status === 'warning').length
      },
      testResults: this.testResults,
      aiAnalysis: this.testResults.find(r => r.metadata.testType === 'ai-analysis')?.metadata.analysis || 'No AI analysis available'
    };

    // Save report as JSON
    const reportPath = `reports/uat-test-report-${this.testRunId}.json`;
    
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports', { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    // Generate simple HTML report
    const htmlReport = this.generateHTMLReport(reportData);
    const htmlPath = `reports/uat-test-report-${this.testRunId}.html`;
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`📄 Report generated: ${htmlPath}`);
    console.log(`📊 JSON data: ${reportPath}`);
  }

  private generateHTMLReport(data: any): string {
    const passRate = Math.round((data.summary.passed / data.summary.total) * 100);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>JIRA 10.3.6 UAT Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e7f3ff; padding: 15px; border-radius: 5px; text-align: center; }
        .pass { background: #e7f9e7; }
        .fail { background: #ffe7e7; }
        .warning { background: #fff3e0; }
        .test-result { margin: 10px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .ai-analysis { background: #f9f9f9; padding: 20px; border-radius: 5px; white-space: pre-wrap; }
        .screenshots { margin: 10px 0; }
        .screenshot { max-width: 300px; margin: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>JIRA 10.3.6 UAT Test Report</h1>
        <p><strong>Test Run ID:</strong> ${data.testRunId}</p>
        <p><strong>Generated:</strong> ${new Date(data.timestamp).toLocaleString()}</p>
        <p><strong>Pass Rate:</strong> ${passRate}%</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>${data.summary.total}</h3>
            <p>Total Tests</p>
        </div>
        <div class="metric pass">
            <h3>${data.summary.passed}</h3>
            <p>Passed</p>
        </div>
        <div class="metric fail">
            <h3>${data.summary.failed}</h3>
            <p>Failed</p>
        </div>
        <div class="metric warning">
            <h3>${data.summary.warnings}</h3>
            <p>Warnings</p>
        </div>
    </div>

    <h2>AI Analysis</h2>
    <div class="ai-analysis">${data.aiAnalysis}</div>

    <h2>Test Results</h2>
    ${data.testResults.map(result => `
        <div class="test-result ${result.status}">
            <h3>${result.testName} - ${result.status.toUpperCase()}</h3>
            <p><strong>Component:</strong> ${result.component}</p>
            <p><strong>Duration:</strong> ${result.duration}ms</p>
            ${result.errors.length > 0 ? `<p><strong>Errors:</strong> ${result.errors.join(', ')}</p>` : ''}
            ${result.screenshots.length > 0 ? `
                <div class="screenshots">
                    <strong>Screenshots:</strong><br>
                    ${result.screenshots.map(path => `<img src="${path}" class="screenshot" alt="Screenshot">`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('')}

    <footer>
        <p><em>Generated by JIRA UAT Testing Framework</em></p>
    </footer>
</body>
</html>
    `;
  }

  private async completeTestRun(): Promise<void> {
    const status = this.testResults.some(r => r.status === 'fail') ? 'failed' : 'passed';

    console.log('\n🎉 Test run completed successfully!');
    console.log(`📋 Test Run ID: ${this.testRunId}`);
    console.log(`📊 Status: ${status}`);
    console.log(`📊 Results stored in reports/ directory`);
  }

  private async failTestRun(errorMessage: string): Promise<void> {
    console.log(`❌ Test run failed: ${errorMessage}`);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Simplified JIRA UAT Testing Framework

Usage: npx tsx run-simplified-uat-tests.ts

This version works with existing Supabase schema and provides:
- Theme compatibility testing
- Performance metrics collection  
- Functional workflow testing
- AI-powered analysis
- Simple HTML report generation

Environment Variables Required:
  NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY

Output:
  - screenshots/ directory with captured images
  - reports/ directory with HTML and JSON reports
    `);
    return;
  }

  // Validate environment
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required Supabase environment variables');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing required OpenAI API key');
    console.error('Please set OPENAI_API_KEY');
    process.exit(1);
  }

  // Run tests
  const tester = new SimplifiedUATTester();
  await tester.execute();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { SimplifiedUATTester };
