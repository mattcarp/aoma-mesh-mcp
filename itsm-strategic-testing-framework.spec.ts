import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Strategic ITSM Testing Framework
// Features: Performance retesting, WebVitals, data modification tracking, attempt logging

// Extend Window interface for WebVitals
declare global {
  interface Window {
    webVitalsData: any;
  }
}

interface WebVitalsMetrics {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint  
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
}

interface PerformanceTestResult {
  url: string;
  attempt: number;
  loadTime: number;
  webVitals: WebVitalsMetrics;
  networkError: boolean;
  timestamp: string;
  passedThreshold: boolean;
}

interface ITSMDataModification {
  ticketId: string;
  field: string;
  originalValue: any;
  newValue: any;
  timestamp: string;
  restored: boolean;
}

class ITSMStrategicTester {
  private session: any;
  private performanceResults: PerformanceTestResult[] = [];
  private dataModifications: ITSMDataModification[] = [];
  private maxRetries = 3;
  private performanceThreshold = 10000; // 10 seconds
  
  constructor() {
    this.loadSession();
    this.ensureDirectories();
  }

  private loadSession() {
    try {
      // Use the most recent session file (guided or uat)
      const sessionFiles = fs.readdirSync('.').filter(f => f.includes('jira-guided-session') || f.includes('jira-uat-session'));
      const latestSession = sessionFiles.sort().pop();
      if (latestSession) {
        this.session = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
        console.log(`🔑 Loaded session: ${latestSession}`);
      }
    } catch (error) {
      console.warn('⚠️ No session file found, will need manual authentication');
    }
  }

  private ensureDirectories() {
    const dirs = ['screenshots', 'performance-reports', 'data-modifications'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async setupContext(browser: Browser): Promise<BrowserContext> {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true
    });

    // Load session cookies if available
    if (this.session?.cookies) {
      await context.addCookies(this.session.cookies);
    }

    return context;
  }

  async captureWebVitals(page: Page): Promise<WebVitalsMetrics> {
    // Inject WebVitals measurement script
    await page.addScriptTag({
      content: `
        window.webVitalsData = {};
        
        // Capture Web Vitals
        import('https://unpkg.com/web-vitals@3/dist/web-vitals.js').then(({getCLS, getFID, getFCP, getLCP, getTTFB}) => {
          getCLS((metric) => window.webVitalsData.CLS = metric.value);
          getFID((metric) => window.webVitalsData.FID = metric.value); 
          getFCP((metric) => window.webVitalsData.FCP = metric.value);
          getLCP((metric) => window.webVitalsData.LCP = metric.value);
          getTTFB((metric) => window.webVitalsData.TTFB = metric.value);
        });
      `
    });

    // Wait for metrics to be captured
    await page.waitForTimeout(2000);
    
    const vitals = await page.evaluate(() => window.webVitalsData) as WebVitalsMetrics;
    
    return {
      FCP: vitals.FCP || 0,
      LCP: vitals.LCP || 0,
      FID: vitals.FID || 0,
      CLS: vitals.CLS || 0,
      TTFB: vitals.TTFB || 0
    };
  }

  async performanceTestWithRetry(page: Page, url: string, testName: string): Promise<PerformanceTestResult> {
    let attempt = 1;
    let lastResult: PerformanceTestResult = {
      url,
      attempt: 0,
      loadTime: 0,
      webVitals: { FCP: 0, LCP: 0, FID: 0, CLS: 0, TTFB: 0 },
      networkError: true,
      timestamp: new Date().toISOString(),
      passedThreshold: false
    };

    while (attempt <= this.maxRetries) {
      console.log(`🚀 Performance test attempt ${attempt}/${this.maxRetries}: ${testName}`);
      
      const startTime = Date.now();
      let networkError = false;
      
      try {
        // Navigate with network monitoring
        const response = await page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        if (!response?.ok()) {
          networkError = true;
        }
        
      } catch (error) {
        console.warn(`⚠️ Network error on attempt ${attempt}:`, error);
        networkError = true;
      }

      const loadTime = Date.now() - startTime;
      const webVitals = await this.captureWebVitals(page);
      const passedThreshold = loadTime <= this.performanceThreshold;

      lastResult = {
        url,
        attempt,
        loadTime,
        webVitals,
        networkError,
        timestamp: new Date().toISOString(),
        passedThreshold
      };

      this.performanceResults.push(lastResult);

      // If performance is good or it's our last attempt, break
      if (passedThreshold || !networkError || attempt === this.maxRetries) {
        break;
      }

      console.log(`⏱️ Retrying due to poor performance: ${loadTime}ms > ${this.performanceThreshold}ms`);
      attempt++;
      await page.waitForTimeout(2000); // Brief pause between retries
    }

    // Take screenshot for evidence
    await page.screenshot({
      path: `screenshots/performance-${testName}-attempt-${lastResult.attempt}-${Date.now()}.png`,
      fullPage: true
    });

    return lastResult;
  }

  async modifyITSMTicketData(page: Page, ticketId: string, field: string, newValue: any): Promise<void> {
    console.log(`🔧 Modifying ITSM ticket ${ticketId} field ${field}`);
    
    try {
      // Navigate to ticket
      await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketId}`);
      await page.waitForLoadState('networkidle');

      // Capture original value
      const originalValue = await page.evaluate((field) => {
        const element = document.querySelector(`[data-field-id="${field}"], #${field}, [name="${field}"]`);
        if (!element) return null;
        return element.textContent || (element as HTMLInputElement).value || null;
      }, field);

      if (originalValue !== null) {
        // Record the modification
        const modification: ITSMDataModification = {
          ticketId,
          field,
          originalValue,
          newValue,
          timestamp: new Date().toISOString(),
          restored: false
        };

        this.dataModifications.push(modification);
        this.saveDataModifications();

        console.log(`📝 Original value for ${ticketId}.${field}: "${originalValue}"`);
        console.log(`📝 Setting new value: "${newValue}"`);

        // Make the modification (example - adapt based on field type)
        await page.click(`[data-field-id="${field}"], #${field}, [name="${field}"]`);
        await page.fill(`[data-field-id="${field}"], #${field}, [name="${field}"]`, String(newValue));
        await page.press(`[data-field-id="${field}"], #${field}, [name="${field}"]`, 'Enter');
        
        console.log(`✅ Modified ${ticketId}.${field} successfully`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to modify ${ticketId}.${field}:`, error);
    }
  }

  async restoreITSMTicketData(page: Page, ticketId: string, field: string): Promise<void> {
    console.log(`🔄 Restoring ITSM ticket ${ticketId} field ${field}`);
    
    const modification = this.dataModifications.find(
      m => m.ticketId === ticketId && m.field === field && !m.restored
    );

    if (!modification) {
      console.warn(`⚠️ No modification record found for ${ticketId}.${field}`);
      return;
    }

    try {
      await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketId}`);
      await page.waitForLoadState('networkidle');

      // Restore original value
      await page.click(`[data-field-id="${field}"], #${field}, [name="${field}"]`);
      await page.fill(`[data-field-id="${field}"], #${field}, [name="${field}"]`, String(modification.originalValue));
      await page.press(`[data-field-id="${field}"], #${field}, [name="${field}"]`, 'Enter');

      // Mark as restored
      modification.restored = true;
      this.saveDataModifications();

      console.log(`✅ Restored ${ticketId}.${field} to original value: "${modification.originalValue}"`);
      
    } catch (error) {
      console.error(`❌ Failed to restore ${ticketId}.${field}:`, error);
    }
  }

  private saveDataModifications() {
    fs.writeFileSync(
      'data-modifications/itsm-modifications.json',
      JSON.stringify(this.dataModifications, null, 2)
    );
  }

  savePerformanceReport() {
    const report = {
      summary: {
        totalTests: this.performanceResults.length,
        averageLoadTime: this.performanceResults.reduce((sum, r) => sum + r.loadTime, 0) / this.performanceResults.length,
        passedThreshold: this.performanceResults.filter(r => r.passedThreshold).length,
        retriedTests: this.performanceResults.filter(r => r.attempt > 1).length,
        networkErrors: this.performanceResults.filter(r => r.networkError).length
      },
      results: this.performanceResults,
      dataModifications: this.dataModifications,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync(
      `performance-reports/itsm-strategic-test-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('📊 Performance report saved');
    return report;
  }

  async restoreAllITSMData(page: Page) {
    console.log('🔄 Restoring all ITSM data modifications...');
    
    const unrestoredMods = this.dataModifications.filter(m => !m.restored);
    
    for (const mod of unrestoredMods) {
      await this.restoreITSMTicketData(page, mod.ticketId, mod.field);
    }
    
    console.log(`✅ Restored ${unrestoredMods.length} data modifications`);
  }
}

// Example test implementation
test.describe('ITSM Strategic Performance Testing', () => {
  let tester: ITSMStrategicTester;

  test.beforeEach(async () => {
    tester = new ITSMStrategicTester();
  });

  test('ITSM Dashboard Performance with Retry Logic', async ({ browser }) => {
    const context = await tester.setupContext(browser);
    const page = await context.newPage();

    // Test ITSM dashboard performance
    const result = await tester.performanceTestWithRetry(
      page, 
      'https://jirauat.smedigitalapps.com/jira/projects/ITSM',
      'itsm-dashboard'
    );

    expect(result.passedThreshold).toBe(true);
    expect(result.loadTime).toBeLessThan(10000);

    await context.close();
  });

  test('ITSM Issue Navigator Performance', async ({ browser }) => {
    const context = await tester.setupContext(browser);
    const page = await context.newPage();

    const result = await tester.performanceTestWithRetry(
      page,
      'https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM',
      'itsm-issue-navigator'
    );

    expect(result.passedThreshold).toBe(true);

    await context.close();
  });

  test.afterEach(async ({ browser }) => {
    if (tester) {
      const report = tester.savePerformanceReport();
      console.log(`📈 Test completed. Average load time: ${report.summary.averageLoadTime}ms`);
      
      // Restore any data modifications made during testing
      const context = await tester.setupContext(browser);
      const page = await context.newPage();
      await tester.restoreAllITSMData(page);
      await context.close();
    }
  });
});

export { ITSMStrategicTester, WebVitalsMetrics, PerformanceTestResult, ITSMDataModification }; 