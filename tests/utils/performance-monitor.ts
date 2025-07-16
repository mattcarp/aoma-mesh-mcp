import { Page } from '@playwright/test';
import { writeFile, mkdir } from 'fs/promises';

/**
 * Enterprise Performance Monitor for JIRA 10.3.6 Testing
 * 
 * Features:
 * - Core Web Vitals monitoring (LCP, CLS, FID)
 * - Playwright performance metrics
 * - Custom JIRA-specific performance tracking
 * - Performance regression detection
 * - Detailed performance reporting
 */

export interface WebVitalsMetrics {
  lcp: number; // Largest Contentful Paint
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

export interface PlaywrightMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  requestCount: number;
  transferSize: number;
  memoryUsage?: number;
}

export interface JiraPerformanceMetrics {
  pageType: string;
  actionType: string;
  duration: number;
  webVitals: WebVitalsMetrics;
  playwrightMetrics: PlaywrightMetrics;
  customMetrics: Record<string, number>;
  timestamp: string;
  userAgent: string;
  viewport: string;
}

export class PerformanceMonitor {
  private static readonly PERFORMANCE_DIR = 'test-results/performance';
  private performanceData: JiraPerformanceMetrics[] = [];
  
  async initialize(): Promise<void> {
    console.log('⚡ Initializing enterprise performance monitoring...');
    
    try {
      // Ensure performance directory exists
      await mkdir(PerformanceMonitor.PERFORMANCE_DIR, { recursive: true });
      
      console.log('✅ Performance monitoring initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize performance monitoring:', error);
      throw error;
    }
  }
  
  async measurePagePerformance(page: Page, pageType: string, actionType: string = 'load'): Promise<JiraPerformanceMetrics> {
    console.log(`📊 Measuring performance for ${pageType} (${actionType})`);
    
    try {
      // Inject Web Vitals measurement script
      await this.injectWebVitalsScript(page);
      
      // Get Playwright performance metrics
      const playwrightMetrics = await this.getPlaywrightMetrics(page);
      
      // Get Web Vitals metrics
      const webVitals = await this.getWebVitalsMetrics(page);
      
      // Get custom JIRA metrics
      const customMetrics = await this.getJiraCustomMetrics(page, pageType);
      
      const performanceData: JiraPerformanceMetrics = {
        pageType,
        actionType,
        duration: playwrightMetrics.loadComplete - playwrightMetrics.navigationStart,
        webVitals,
        playwrightMetrics,
        customMetrics,
        timestamp: new Date().toISOString(),
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: JSON.stringify(page.viewportSize())
      };
      
      // Store the measurement
      this.performanceData.push(performanceData);
      
      // Log key metrics
      console.log(`⚡ Performance Results for ${pageType}:`);
      console.log(`   📋 Load Duration: ${performanceData.duration}ms`);
      console.log(`   🎨 LCP: ${webVitals.lcp}ms`);
      console.log(`   📐 CLS: ${webVitals.cls}`);
      console.log(`   🖱️ FID: ${webVitals.fid}ms`);
      console.log(`   🌐 Network Requests: ${playwrightMetrics.requestCount}`);
      
      return performanceData;
      
    } catch (error) {
      console.error(`❌ Failed to measure performance for ${pageType}:`, error);
      throw error;
    }
  }
  
  private async injectWebVitalsScript(page: Page): Promise<void> {
    // Inject web-vitals library and measurement script
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3/dist/web-vitals.umd.js'
    });
    
    // Initialize Web Vitals measurement
    await page.evaluate(() => {
      // @ts-ignore
      window.webVitalsData = {};
      
      // @ts-ignore
      if (window.webVitals) {
        // @ts-ignore
        window.webVitals.onCLS((metric) => {
          // @ts-ignore
          window.webVitalsData.cls = metric.value;
        });
        
        // @ts-ignore
        window.webVitals.onFID((metric) => {
          // @ts-ignore
          window.webVitalsData.fid = metric.value;
        });
        
        // @ts-ignore
        window.webVitals.onLCP((metric) => {
          // @ts-ignore
          window.webVitalsData.lcp = metric.value;
        });
        
        // @ts-ignore
        window.webVitals.onFCP((metric) => {
          // @ts-ignore
          window.webVitalsData.fcp = metric.value;
        });
        
        // @ts-ignore
        window.webVitals.onTTFB((metric) => {
          // @ts-ignore
          window.webVitalsData.ttfb = metric.value;
        });
      }
    });
    
    // Wait a bit for metrics to be collected
    await page.waitForTimeout(1000);
  }
  
  private async getWebVitalsMetrics(page: Page): Promise<WebVitalsMetrics> {
    const webVitals = await page.evaluate(() => {
      // @ts-ignore
      return window.webVitalsData || {};
    });
    
    return {
      lcp: webVitals.lcp || 0,
      cls: webVitals.cls || 0,
      fid: webVitals.fid || 0,
      fcp: webVitals.fcp || 0,
      ttfb: webVitals.ttfb || 0
    };
  }
  
  private async getPlaywrightMetrics(page: Page): Promise<PlaywrightMetrics> {
    const performanceEntries = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      
      return {
        navigationStart: navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        requestCount: performance.getEntriesByType('resource').length,
        transferSize: performance.getEntriesByType('resource')
          .reduce((total, resource: any) => total + (resource.transferSize || 0), 0)
      };
    });
    
    // Get memory usage if available
    const memoryUsage = await page.evaluate(() => {
      // @ts-ignore
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    return {
      ...performanceEntries,
      memoryUsage
    };
  }
  
  private async getJiraCustomMetrics(page: Page, pageType: string): Promise<Record<string, number>> {
    const customMetrics: Record<string, number> = {};
    
    try {
      // JIRA-specific performance measurements
      switch (pageType.toLowerCase()) {
        case 'dashboard':
          customMetrics.gadgetCount = await page.locator('.gadget').count();
          customMetrics.gadgetLoadTime = await this.measureGadgetLoadTime(page);
          break;
          
        case 'issue-navigator':
          customMetrics.issueCount = await page.locator('.issue-row, tr.issuerow').count();
          customMetrics.paginationPresent = await page.locator('.pagination').count();
          customMetrics.filterLoadTime = await this.measureFilterLoadTime(page);
          break;
          
        case 'issue-view':
          customMetrics.commentCount = await page.locator('.comment').count();
          customMetrics.attachmentCount = await page.locator('.attachment-item').count();
          customMetrics.fieldCount = await page.locator('.field-group').count();
          break;
          
        case 'search':
          customMetrics.resultCount = await page.locator('.search-result').count();
          customMetrics.facetCount = await page.locator('.facet').count();
          break;
      }
      
      // General JIRA metrics
      customMetrics.auiElementCount = await page.locator('[class*="aui-"]').count();
      customMetrics.jiraElementCount = await page.locator('[id*="jira"], [class*="jira"]').count();
      customMetrics.formCount = await page.locator('form').count();
      customMetrics.dialogCount = await page.locator('.aui-dialog').count();
      
      // Check for performance indicators
      customMetrics.loadingIndicators = await page.locator('.loading, .spinner, .throbber').count();
      customMetrics.errorMessages = await page.locator('.error, .aui-message-error').count();
      
    } catch (error) {
      console.warn('⚠️ Could not collect all custom metrics:', error);
    }
    
    return customMetrics;
  }
  
  private async measureGadgetLoadTime(page: Page): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Wait for gadgets to finish loading
      await page.waitForFunction(() => {
        const gadgets = document.querySelectorAll('.gadget');
        return Array.from(gadgets).every(gadget => 
          !gadget.querySelector('.loading') && !gadget.classList.contains('loading')
        );
      }, { timeout: 10000 });
      
      return Date.now() - startTime;
    } catch {
      return Date.now() - startTime; // Return elapsed time even if timeout
    }
  }
  
  private async measureFilterLoadTime(page: Page): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Wait for issue list to be populated
      await page.waitForSelector('.issue-table tbody tr, .navigator-results .issue-row', { timeout: 15000 });
      
      // Wait for any loading indicators to disappear
      await page.waitForFunction(() => {
        return !document.querySelector('.loading-indicator, .loading');
      }, { timeout: 5000 });
      
      return Date.now() - startTime;
    } catch {
      return Date.now() - startTime;
    }
  }
  
  async generatePerformanceReport(): Promise<void> {
    console.log('📊 Generating comprehensive performance report...');
    
    try {
      // Calculate aggregate statistics
      const stats = this.calculatePerformanceStats();
      
      // Generate detailed report
      const report = {
        summary: stats,
        testRuns: this.performanceData,
        generatedAt: new Date().toISOString(),
        totalMeasurements: this.performanceData.length
      };
      
      // Save performance report
      await writeFile(
        `${PerformanceMonitor.PERFORMANCE_DIR}/performance-report.json`,
        JSON.stringify(report, null, 2),
        'utf-8'
      );
      
      // Generate CSV for easier analysis
      await this.generatePerformanceCSV();
      
      console.log('✅ Performance report generated successfully');
      
    } catch (error) {
      console.error('❌ Failed to generate performance report:', error);
    }
  }
  
  private calculatePerformanceStats() {
    if (this.performanceData.length === 0) return null;
    
    const stats: any = {
      pageTypes: {},
      overall: {
        avgDuration: 0,
        avgLCP: 0,
        avgCLS: 0,
        avgFID: 0,
        totalRequests: 0,
        totalTransferSize: 0
      }
    };
    
    // Group by page type
    const pageTypeGroups: Record<string, JiraPerformanceMetrics[]> = {};
    for (const data of this.performanceData) {
      if (!pageTypeGroups[data.pageType]) {
        pageTypeGroups[data.pageType] = [];
      }
      pageTypeGroups[data.pageType].push(data);
    }
    
    // Calculate stats for each page type
    for (const [pageType, measurements] of Object.entries(pageTypeGroups)) {
      stats.pageTypes[pageType] = {
        count: measurements.length,
        avgDuration: measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length,
        avgLCP: measurements.reduce((sum, m) => sum + m.webVitals.lcp, 0) / measurements.length,
        avgCLS: measurements.reduce((sum, m) => sum + m.webVitals.cls, 0) / measurements.length,
        avgFID: measurements.reduce((sum, m) => sum + m.webVitals.fid, 0) / measurements.length,
        minDuration: Math.min(...measurements.map(m => m.duration)),
        maxDuration: Math.max(...measurements.map(m => m.duration))
      };
    }
    
    // Calculate overall stats
    stats.overall.avgDuration = this.performanceData.reduce((sum, m) => sum + m.duration, 0) / this.performanceData.length;
    stats.overall.avgLCP = this.performanceData.reduce((sum, m) => sum + m.webVitals.lcp, 0) / this.performanceData.length;
    stats.overall.avgCLS = this.performanceData.reduce((sum, m) => sum + m.webVitals.cls, 0) / this.performanceData.length;
    stats.overall.avgFID = this.performanceData.reduce((sum, m) => sum + m.webVitals.fid, 0) / this.performanceData.length;
    
    return stats;
  }
  
  private async generatePerformanceCSV(): Promise<void> {
    if (this.performanceData.length === 0) return;
    
    const headers = [
      'timestamp', 'pageType', 'actionType', 'duration', 'lcp', 'cls', 'fid', 'fcp', 'ttfb',
      'domContentLoaded', 'requestCount', 'transferSize', 'memoryUsage'
    ];
    
    const rows = this.performanceData.map(data => [
      data.timestamp,
      data.pageType,
      data.actionType,
      data.duration,
      data.webVitals.lcp,
      data.webVitals.cls,
      data.webVitals.fid,
      data.webVitals.fcp,
      data.webVitals.ttfb,
      data.playwrightMetrics.domContentLoaded,
      data.playwrightMetrics.requestCount,
      data.playwrightMetrics.transferSize,
      data.playwrightMetrics.memoryUsage || 0
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    await writeFile(
      `${PerformanceMonitor.PERFORMANCE_DIR}/performance-data.csv`,
      csvContent,
      'utf-8'
    );
  }
  
  // Performance assertion helpers
  assertPerformanceThresholds(metrics: JiraPerformanceMetrics, thresholds: {
    maxDuration?: number;
    maxLCP?: number;
    maxCLS?: number;
    maxFID?: number;
  }): void {
    const failures: string[] = [];
    
    if (thresholds.maxDuration && metrics.duration > thresholds.maxDuration) {
      failures.push(`Duration ${metrics.duration}ms exceeds threshold ${thresholds.maxDuration}ms`);
    }
    
    if (thresholds.maxLCP && metrics.webVitals.lcp > thresholds.maxLCP) {
      failures.push(`LCP ${metrics.webVitals.lcp}ms exceeds threshold ${thresholds.maxLCP}ms`);
    }
    
    if (thresholds.maxCLS && metrics.webVitals.cls > thresholds.maxCLS) {
      failures.push(`CLS ${metrics.webVitals.cls} exceeds threshold ${thresholds.maxCLS}`);
    }
    
    if (thresholds.maxFID && metrics.webVitals.fid > thresholds.maxFID) {
      failures.push(`FID ${metrics.webVitals.fid}ms exceeds threshold ${thresholds.maxFID}ms`);
    }
    
    if (failures.length > 0) {
      throw new Error(`Performance thresholds exceeded:\n${failures.join('\n')}`);
    }
  }
} 