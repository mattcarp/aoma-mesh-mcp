#!/usr/bin/env npx tsx

/**
 * JIRA UAT Testing Execution Script
 * 
 * This script runs comprehensive AI-assisted testing for JIRA 10.3.6 upgrade
 * 
 * Usage:
 *   npx tsx run-jira-uat-tests.ts [options]
 * 
 * Options:
 *   --quick              Run quick test suite only
 *   --full               Run comprehensive test suite  
 *   --theme-only         Test only theme compatibility
 *   --performance-only   Test only performance metrics
 *   --generate-report    Generate PDF report after testing
 *   --help               Show this help message
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

interface TestConfig {
  environment: 'UAT' | 'PROD';
  jiraVersion: string;
  testSuites: string[];
  themes: string[];
  generateReport: boolean;
  s3Config: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

class JIRAUATTester {
  private config: TestConfig;
  private testRunId: string;
  private supabase: any;
  private openai: OpenAI;

  constructor(config: TestConfig) {
    this.config = config;
    this.testRunId = uuidv4();
    
    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!
    });
  }

  async execute(): Promise<void> {
    console.log('🎯 JIRA 10.3.6 UAT Testing Framework');
    console.log('================================================================================');
    console.log(`📋 Test Run ID: ${this.testRunId}`);
    console.log(`🌍 Environment: ${this.config.environment}`);
    console.log(`📦 JIRA Version: ${this.config.jiraVersion}`);
    console.log(`🎨 Themes: ${this.config.themes.join(', ')}`);
    console.log(`🧪 Test Suites: ${this.config.testSuites.join(', ')}`);
    console.log('================================================================================');

    try {
      // Create test run record
      await this.createTestRun();

      // Load UAT session and tickets
      const uatTickets = await this.loadUATTickets();
      console.log(`📊 Loaded ${uatTickets.length} UAT tickets for testing`);

      // Launch browser
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

        // Execute test suites
        for (const suite of this.config.testSuites) {
          console.log(`\n🧪 Running ${suite} tests...`);
          
          switch (suite) {
            case 'theme':
              await this.runThemeTests(page, uatTickets);
              break;
            case 'performance':
              await this.runPerformanceTests(page, uatTickets);
              break;
            case 'functional':
              await this.runFunctionalTests(page, uatTickets);
              break;
            case 'visual':
              await this.runVisualRegressionTests(page, uatTickets);
              break;
          }
        }

        // AI Analysis
        console.log('\n🧠 Running AI analysis...');
        await this.runAIAnalysis();

        // Generate report if requested
        if (this.config.generateReport) {
          console.log('\n📄 Generating PDF report...');
          await this.generateReport();
        }

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
    const { error } = await this.supabase
      .from('test_runs')
      .insert({
        id: this.testRunId,
        run_name: `JIRA-${this.config.jiraVersion}-UAT-${new Date().toISOString().split('T')[0]}`,
        jira_version: this.config.jiraVersion,
        test_suite: this.config.testSuites.join(','),
        environment: this.config.environment,
        status: 'running',
        browser_info: {
          name: 'chromium',
          version: 'latest',
          viewport: { width: 1920, height: 1080 }
        },
        test_config: this.config
      });

    if (error) {
      throw new Error(`Failed to create test run: ${error.message}`);
    }

    console.log('✅ Test run created in database');
  }

  private async loadUATTickets(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('jira_tickets')
      .select('*')
      .eq('metadata->>environment', 'UAT')
      .eq('metadata->>is_uat', true)
      .limit(20); // Sample for testing

    if (error) {
      console.warn('⚠️ Could not load UAT tickets:', error.message);
      return [];
    }

    return data || [];
  }

  private async runThemeTests(page: any, tickets: any[]): Promise<void> {
    let testsRun = 0;
    let testsPassed = 0;

    for (const theme of this.config.themes) {
      console.log(`  🎨 Testing ${theme} theme...`);
      
      // Navigate to JIRA
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForTimeout(3000);

      // Apply theme
      await page.evaluate(`
        document.documentElement.setAttribute('data-color-mode', '${theme}');
        document.body.setAttribute('data-theme', '${theme}');
      `);

      // Test key components
      const components = ['dashboard', 'itsm-queue', 'portal'];
      
      for (const component of components) {
        testsRun++;
        
        try {
          // Navigate to component
          await this.navigateToComponent(page, component);
          
          // Capture screenshot
          const screenshotUrl = await this.captureScreenshot(
            page, 
            `${component}-${theme}-theme`,
            { component, theme, testType: 'theme' }
          );

          // Check for rendering issues
          const renderingIssues = await page.evaluate(() => {
            const issues = [];
            
            // Check for invisible text
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
              const style = window.getComputedStyle(el);
              if (style.color === style.backgroundColor && el.textContent?.trim()) {
                issues.push(`Invisible text detected: ${el.textContent.substring(0, 50)}`);
              }
            }
            
            return issues;
          });

          // Store results
          await this.storeComponentTest({
            componentName: component,
            testScenario: `${theme}_theme_compatibility`,
            status: renderingIssues.length === 0 ? 'pass' : 'warning',
            beforeScreenshotS3Url: screenshotUrl,
            errorMessage: renderingIssues.length > 0 ? renderingIssues.join('; ') : null
          });

          if (renderingIssues.length === 0) {
            testsPassed++;
          }

          console.log(`    ✅ ${component} - ${renderingIssues.length === 0 ? 'PASS' : 'ISSUES FOUND'}`);

        } catch (error) {
          console.log(`    ❌ ${component} - FAILED: ${error.message}`);
          
          await this.storeComponentTest({
            componentName: component,
            testScenario: `${theme}_theme_compatibility`,
            status: 'fail',
            errorMessage: error.message
          });
        }
      }
    }

    await this.updateTestRunStats(testsRun, testsPassed);
  }

  private async runPerformanceTests(page: any, tickets: any[]): Promise<void> {
    console.log('  📊 Collecting performance metrics...');
    
    // Add performance monitoring
    await page.addInitScript(() => {
      window.performanceMetrics = {
        navigationStart: performance.now(),
        metrics: []
      };
      
      // Collect Core Web Vitals
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.performanceMetrics.metrics.push({
            name: entry.name,
            entryType: entry.entryType,
            startTime: entry.startTime,
            duration: entry.duration
          });
        }
      }).observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    });

    const testUrls = [
      'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
      'https://jirauat.smedigitalapps.com/jira/issues/',
      'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa'
    ];

    for (const url of testUrls) {
      console.log(`    📈 Testing ${url.split('/').pop()}...`);
      
      const startTime = Date.now();
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Collect metrics
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
      const screenshotUrl = await this.captureScreenshot(
        page,
        `performance-${url.split('/').pop()}`,
        { url, testType: 'performance' }
      );

      // Store performance data
      await this.storePerformanceMetrics({
        pageUrl: url,
        testType: 'performance',
        pageLoadTime: metrics.loadTime,
        domContentLoaded: metrics.domContentLoaded,
        ttfbScore: metrics.ttfb,
        fcpScore: metrics.fcp,
        networkRequestsCount: metrics.networkRequests,
        totalPageSizeKb: metrics.pageSize / 1024,
        screenshotS3Url: screenshotUrl
      });

      console.log(`      Load Time: ${Math.round(metrics.loadTime)}ms`);
      console.log(`      TTFB: ${Math.round(metrics.ttfb)}ms`);
      console.log(`      Requests: ${metrics.networkRequests}`);
    }
  }

  private async runFunctionalTests(page: any, tickets: any[]): Promise<void> {
    console.log('  🔧 Testing functional workflows...');

    // Test with sample UAT tickets
    const sampleTickets = tickets.slice(0, 5);
    
    for (const ticket of sampleTickets) {
      console.log(`    🎫 Testing with ticket ${ticket.external_id}...`);
      
      try {
        // Navigate to ticket
        const ticketKey = ticket.external_id.replace('UAT-', '');
        await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`);
        await page.waitForTimeout(3000);

        // Check if ticket loads
        const ticketLoaded = await page.locator('#key-val').isVisible();
        
        if (ticketLoaded) {
          // Capture screenshot
          const screenshotUrl = await this.captureScreenshot(
            page,
            `ticket-${ticketKey}`,
            { ticketKey, testType: 'functional' }
          );

          await this.storeComponentTest({
            componentName: 'ticket-view',
            testScenario: 'view_ticket',
            ticketKey: ticket.external_id,
            status: 'pass',
            afterScreenshotS3Url: screenshotUrl
          });

          console.log(`      ✅ ${ticketKey} loaded successfully`);
        } else {
          throw new Error('Ticket did not load');
        }

      } catch (error) {
        console.log(`      ❌ ${ticket.external_id} failed: ${error.message}`);
        
        await this.storeComponentTest({
          componentName: 'ticket-view',
          testScenario: 'view_ticket',
          ticketKey: ticket.external_id,
          status: 'fail',
          errorMessage: error.message
        });
      }
    }
  }

  private async runVisualRegressionTests(page: any, tickets: any[]): Promise<void> {
    console.log('  👁️ Running visual regression tests...');
    
    // This would compare against baseline screenshots
    // For now, just capture current state
    
    const components = ['dashboard', 'issue-navigator', 'portal'];
    
    for (const component of components) {
      await this.navigateToComponent(page, component);
      
      const screenshotUrl = await this.captureScreenshot(
        page,
        `visual-baseline-${component}`,
        { component, testType: 'visual' }
      );

      console.log(`    📸 Captured ${component} baseline`);
    }
  }

  private async navigateToComponent(page: any, component: string): Promise<void> {
    const urls = {
      'dashboard': 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
      'itsm-queue': 'https://jirauat.smedigitalapps.com/jira/issues/?jql=project=ITSM',
      'portal': 'https://jirauat.smedigitalapps.com/jira/servicedesk/customer/portals',
      'issue-navigator': 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa'
    };

    await page.goto(urls[component] || urls.dashboard);
    await page.waitForTimeout(2000);
  }

  private async captureScreenshot(page: any, name: string, metadata: any): Promise<string> {
    // Capture screenshot
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    });

    // For now, just save locally (would upload to S3 in full implementation)
    const filename = `screenshots/${this.testRunId}-${name}-${Date.now()}.png`;
    const dir = 'screenshots';
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filename, screenshot);
    
    // Return mock S3 URL
    return `s3://${this.config.s3Config.bucket}/${filename}`;
  }

  private async storeComponentTest(test: any): Promise<void> {
    const { error } = await this.supabase
      .from('jira_component_tests')
      .insert({
        ...test,
        id: uuidv4(),
        test_run_id: this.testRunId,
        timestamp: new Date().toISOString(),
        retries_attempted: 0
      });

    if (error) {
      console.warn('Warning: Could not store component test:', error.message);
    }
  }

  private async storePerformanceMetrics(metrics: any): Promise<void> {
    const { error } = await this.supabase
      .from('jira_performance_metrics')
      .insert({
        ...metrics,
        id: uuidv4(),
        test_run_id: this.testRunId,
        browser_info: { name: 'chromium', version: 'latest' },
        viewport_size: { width: 1920, height: 1080 },
        user_agent: 'Playwright Test',
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.warn('Warning: Could not store performance metrics:', error.message);
    }
  }

  private async updateTestRunStats(testsRun: number, testsPassed: number): Promise<void> {
    const { error } = await this.supabase
      .from('test_runs')
      .update({
        total_tests: testsRun,
        passed_tests: testsPassed,
        failed_tests: testsRun - testsPassed
      })
      .eq('id', this.testRunId);

    if (error) {
      console.warn('Warning: Could not update test stats:', error.message);
    }
  }

  private async runAIAnalysis(): Promise<void> {
    try {
      // Get test results
      const { data: testData } = await this.supabase
        .from('test_runs')
        .select(`
          *,
          jira_performance_metrics(*),
          jira_component_tests(*)
        `)
        .eq('id', this.testRunId)
        .single();

      if (!testData) return;

      // Generate AI summary
      const prompt = `
        Analyze this JIRA UAT test run for version ${testData.jira_version}:
        - Total tests: ${testData.total_tests}
        - Passed: ${testData.passed_tests}
        - Failed: ${testData.failed_tests}
        - Performance metrics: ${testData.jira_performance_metrics?.length || 0} collected
        - Component tests: ${testData.jira_component_tests?.length || 0} executed
        
        Provide a brief summary, risk assessment (0-100), and top 3 recommendations.
        Focus on upgrade readiness for JIRA 10.3.6.
      `;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500
      });

      const aiSummary = response.choices[0]?.message?.content || 'AI analysis failed';
      
      // Calculate risk score based on test results
      const passRate = testData.total_tests > 0 ? (testData.passed_tests / testData.total_tests) * 100 : 0;
      const riskScore = Math.max(0, 100 - passRate);

      // Update test run with AI analysis
      await this.supabase
        .from('test_runs')
        .update({
          ai_summary: aiSummary,
          risk_score: riskScore,
          overall_score: passRate
        })
        .eq('id', this.testRunId);

      console.log('✅ AI analysis completed');
      console.log(`📊 Overall Score: ${Math.round(passRate)}%`);
      console.log(`⚠️ Risk Score: ${Math.round(riskScore)}`);

    } catch (error) {
      console.warn('Warning: AI analysis failed:', error.message);
    }
  }

  private async generateReport(): Promise<void> {
    // Placeholder for PDF report generation
    console.log('📄 Report generation would create beautiful PDF for Irina');
    console.log(`📋 Test Run ID: ${this.testRunId}`);
    console.log('📊 Report would include:');
    console.log('  - Executive summary with scores and risks');
    console.log('  - Theme compatibility results with screenshots');
    console.log('  - Performance metrics and trends');
    console.log('  - Functional test results');
    console.log('  - AI insights and recommendations');
    console.log('  - Visual evidence from S3');
  }

  private async completeTestRun(): Promise<void> {
    await this.supabase
      .from('test_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', this.testRunId);

    console.log('\n🎉 Test run completed successfully!');
    console.log(`📋 Test Run ID: ${this.testRunId}`);
  }

  private async failTestRun(errorMessage: string): Promise<void> {
    await this.supabase
      .from('test_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        metadata: { error: errorMessage }
      })
      .eq('id', this.testRunId);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
JIRA UAT Testing Framework

Usage: npx tsx run-jira-uat-tests.ts [options]

Options:
  --quick              Run quick test suite only
  --full               Run comprehensive test suite  
  --theme-only         Test only theme compatibility
  --performance-only   Test only performance metrics
  --generate-report    Generate PDF report after testing
  --help               Show this help message

Environment Variables Required:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  OPENAI_API_KEY
  S3_BUCKET
  S3_ACCESS_KEY_ID
  S3_SECRET_ACCESS_KEY
    `);
    return;
  }

  // Parse arguments
  const config: TestConfig = {
    environment: 'UAT',
    jiraVersion: '10.3.6',
    testSuites: [],
    themes: ['light', 'dark'],
    generateReport: args.includes('--generate-report'),
    s3Config: {
      bucket: process.env.S3_BUCKET || 'jira-uat-screenshots',
      region: process.env.S3_REGION || 'us-east-1',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
    }
  };

  // Determine test suites
  if (args.includes('--theme-only')) {
    config.testSuites = ['theme'];
  } else if (args.includes('--performance-only')) {
    config.testSuites = ['performance'];
  } else if (args.includes('--quick')) {
    config.testSuites = ['theme', 'performance'];
  } else {
    config.testSuites = ['theme', 'performance', 'functional', 'visual'];
  }

  // Validate environment
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required Supabase environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing required OpenAI API key');
    console.error('Please set OPENAI_API_KEY');
    process.exit(1);
  }

  // Run tests
  const tester = new JIRAUATTester(config);
  await tester.execute();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { JIRAUATTester };
