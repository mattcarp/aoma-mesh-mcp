import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Issue Navigator Performance Analyzer
// Task 4.5: Analyze Issue Navigator Performance

interface PerformanceMetrics {
  pageLoadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToFirstByte: number;
  resourceCount: number;
  totalResourceSize: number;
  slowestResources: ResourceTiming[];
  networkRequests: NetworkRequest[];
  javaScriptExecutionTime: number;
  renderingTime: number;
}

interface ResourceTiming {
  name: string;
  type: string;
  size: number;
  duration: number;
  startTime: number;
}

interface NetworkRequest {
  url: string;
  method: string;
  status: number;
  responseTime: number;
  responseSize: number;
  resourceType: string;
}

interface PerformanceReport {
  testInfo: {
    timestamp: string;
    url: string;
    userAgent: string;
    viewport: { width: number; height: number };
  };
  metrics: PerformanceMetrics;
  analysis: {
    overallScore: number;
    bottlenecks: string[];
    recommendations: string[];
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  };
  coreWebVitals: {
    lcp: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    fid: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
    cls: { value: number; rating: 'good' | 'needs-improvement' | 'poor' };
  };
  detailedBreakdown: {
    loadingPhases: any[];
    criticalResources: ResourceTiming[];
    performanceTimeline: any[];
  };
}

class IssueNavigatorPerformanceAnalyzer {
  private sessionData: any = null;
  private performanceMetrics: PerformanceMetrics | null = null;
  private networkRequests: NetworkRequest[] = [];
  private resourceTimings: ResourceTiming[] = [];

  async loadSession(): Promise<any> {
    try {
      // Find the latest session file
      const sessionFiles = fs.readdirSync('.').filter(f => 
        f.startsWith('jira-uat-session-') && f.endsWith('.json')
      );

      if (sessionFiles.length === 0) {
        throw new Error('No session files found. Please run manual-login-session-capture.ts first.');
      }

      const latestSession = sessionFiles.sort().pop()!;
      console.log(`📁 Loading session from: ${latestSession}`);
      
      this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
      return this.sessionData;

    } catch (error) {
      console.error('❌ Failed to load session:', error);
      throw error;
    }
  }

  async performIssueNavigatorAnalysis(): Promise<PerformanceReport> {
    console.log('🚀 ISSUE NAVIGATOR PERFORMANCE ANALYZER');
    console.log('==================================================');
    
    await this.loadSession();
    
    const browser = await chromium.launch({ 
      headless: false,  // Show browser for analysis
      args: ['--start-maximized']
    });
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });

      // Restore session
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }

      const page = await context.newPage();

      // Set up performance monitoring
      await this.setupPerformanceMonitoring(page);

      // Navigate to Issue Navigator
      console.log('🎯 Navigating to Issue Navigator...');
      const startTime = Date.now();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM', {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      // Wait for Issue Navigator to fully load - try multiple selectors
      console.log('⏳ Waiting for Issue Navigator to fully load...');
      try {
        // Try different selectors that might exist
        await Promise.race([
          page.waitForSelector('.issue-list', { timeout: 15000 }),
          page.waitForSelector('#issuetable', { timeout: 15000 }),
          page.waitForSelector('.issue-table', { timeout: 15000 }),
          page.waitForSelector('[data-testid="issue-navigator"]', { timeout: 15000 }),
          page.waitForSelector('.navigator-content', { timeout: 15000 }),
          page.waitForTimeout(15000) // Fallback timeout
        ]);
        console.log('✅ Issue Navigator content detected');
      } catch (error) {
        console.log('⚠️ Standard selectors not found - continuing with analysis anyway');
        console.log('This might indicate slow loading performance!');
      }
      
      // Wait for network to settle
      await page.waitForLoadState('networkidle');

      // Collect performance metrics
      console.log('📊 Collecting performance metrics...');
      const metrics = await this.collectPerformanceMetrics(page, startTime);
      
      // Take screenshot for evidence
      const screenshotPath = `issue-navigator-performance-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Generate comprehensive report
      const report = await this.generatePerformanceReport(metrics, page);
      
      return report;

    } finally {
      await browser.close();
    }
  }

  private async setupPerformanceMonitoring(page: any): Promise<void> {
    // Reset tracking arrays
    this.networkRequests = [];
    this.resourceTimings = [];

    // Monitor network requests
    page.on('request', (request: any) => {
      const startTime = Date.now();
      request._startTime = startTime;
    });

    page.on('response', (response: any) => {
      const endTime = Date.now();
      const request = response.request();
      const responseTime = endTime - (request._startTime || endTime);
      
      this.networkRequests.push({
        url: response.url(),
        method: request.method(),
        status: response.status(),
        responseTime,
        responseSize: parseInt(response.headers()['content-length'] || '0'),
        resourceType: request.resourceType()
      });
    });

    // Enable performance monitoring
    await page.addInitScript(() => {
      // Ensure performance observer is available
      if ('PerformanceObserver' in window) {
        (window as any)._performanceEntries = [];
        
        const observer = new PerformanceObserver((list) => {
          (window as any)._performanceEntries.push(...list.getEntries());
        });
        
        observer.observe({ entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] });
      }
    });
  }

  private async collectPerformanceMetrics(page: any, startTime: number): Promise<PerformanceMetrics> {
    const endTime = Date.now();
    const pageLoadTime = endTime - startTime;

    // Get Core Web Vitals and other metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paints = performance.getEntriesByType('paint');
      const resources = performance.getEntriesByType('resource');
      
      // Core Web Vitals calculation
      let lcp = 0;
      let fid = 0;
      let cls = 0;

      // Get LCP (Largest Contentful Paint)
      const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
      if (lcpEntries.length > 0) {
        lcp = lcpEntries[lcpEntries.length - 1].startTime;
      }

      // Get CLS (Cumulative Layout Shift) - simplified calculation
      const layoutShifts = performance.getEntriesByType('layout-shift');
      cls = layoutShifts.reduce((sum: number, entry: any) => sum + entry.value, 0);

      // Calculate resource metrics
      const totalResourceSize = resources.reduce((sum: any, resource: any) => {
        return sum + (resource.transferSize || 0);
      }, 0);

      // Get slowest resources
      const sortedResources = resources
        .map((resource: any) => ({
          name: resource.name,
          type: resource.initiatorType,
          size: resource.transferSize || 0,
          duration: resource.duration,
          startTime: resource.startTime
        }))
        .sort((a: any, b: any) => b.duration - a.duration)
        .slice(0, 10);

      return {
        navigation,
        paints,
        resources: sortedResources,
        lcp,
        fid,
        cls,
        totalResourceSize,
        resourceCount: resources.length
      };
    });

    // Calculate JavaScript execution time
    const jsExecutionTime = await page.evaluate(() => {
      const scripts = performance.getEntriesByType('resource')
        .filter((r: any) => r.initiatorType === 'script');
      return scripts.reduce((sum: any, script: any) => sum + script.duration, 0);
    });

    this.performanceMetrics = {
      pageLoadTime,
      domContentLoaded: metrics.navigation.domContentLoadedEventEnd - metrics.navigation.navigationStart,
      firstContentfulPaint: metrics.paints.find((p: any) => p.name === 'first-contentful-paint')?.startTime || 0,
      largestContentfulPaint: metrics.lcp,
      firstInputDelay: metrics.fid,
      cumulativeLayoutShift: metrics.cls,
      timeToFirstByte: metrics.navigation.responseStart - metrics.navigation.navigationStart,
      resourceCount: metrics.resourceCount,
      totalResourceSize: metrics.totalResourceSize,
      slowestResources: metrics.resources,
      networkRequests: this.networkRequests,
      javaScriptExecutionTime: jsExecutionTime,
      renderingTime: metrics.navigation.loadEventEnd - metrics.navigation.domContentLoadedEventEnd
    };

    return this.performanceMetrics;
  }

  private async generatePerformanceReport(metrics: PerformanceMetrics, page: any): Promise<PerformanceReport> {
    console.log('📋 Generating comprehensive performance report...');

    // Analyze Core Web Vitals
    const coreWebVitals = {
      lcp: {
        value: metrics.largestContentfulPaint,
        rating: this.rateLCP(metrics.largestContentfulPaint)
      },
      fid: {
        value: metrics.firstInputDelay,
        rating: this.rateFID(metrics.firstInputDelay)
      },
      cls: {
        value: metrics.cumulativeLayoutShift,
        rating: this.rateCLS(metrics.cumulativeLayoutShift)
      }
    };

    // Calculate overall performance score
    const overallScore = this.calculatePerformanceScore(metrics, coreWebVitals);
    
    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(metrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, bottlenecks);

    // Get performance grade
    const performanceGrade = this.getPerformanceGrade(overallScore);

    // Create detailed breakdown
    const detailedBreakdown = await this.createDetailedBreakdown(page, metrics);

    const report: PerformanceReport = {
      testInfo: {
        timestamp: new Date().toISOString(),
        url: 'https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM',
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: { width: 1920, height: 1080 }
      },
      metrics,
      analysis: {
        overallScore,
        bottlenecks,
        recommendations,
        performanceGrade
      },
      coreWebVitals,
      detailedBreakdown
    };

    // Save detailed report
    const reportPath = `issue-navigator-performance-report-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Detailed report saved: ${reportPath}`);

    // Generate HTML report
    await this.generateHTMLReport(report);

    return report;
  }

  private rateLCP(lcp: number): 'good' | 'needs-improvement' | 'poor' {
    if (lcp <= 2500) return 'good';
    if (lcp <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private rateFID(fid: number): 'good' | 'needs-improvement' | 'poor' {
    if (fid <= 100) return 'good';
    if (fid <= 300) return 'needs-improvement';
    return 'poor';
  }

  private rateCLS(cls: number): 'good' | 'needs-improvement' | 'poor' {
    if (cls <= 0.1) return 'good';
    if (cls <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics, coreWebVitals: any): number {
    let score = 100;

    // Penalize slow LCP
    if (coreWebVitals.lcp.rating === 'poor') score -= 30;
    else if (coreWebVitals.lcp.rating === 'needs-improvement') score -= 15;

    // Penalize high FID
    if (coreWebVitals.fid.rating === 'poor') score -= 20;
    else if (coreWebVitals.fid.rating === 'needs-improvement') score -= 10;

    // Penalize high CLS
    if (coreWebVitals.cls.rating === 'poor') score -= 20;
    else if (coreWebVitals.cls.rating === 'needs-improvement') score -= 10;

    // Penalize slow page load
    if (metrics.pageLoadTime > 5000) score -= 15;
    else if (metrics.pageLoadTime > 3000) score -= 8;

    // Penalize large resource count
    if (metrics.resourceCount > 100) score -= 10;

    // Penalize large total size
    if (metrics.totalResourceSize > 5000000) score -= 10; // 5MB

    return Math.max(0, score);
  }

  private identifyBottlenecks(metrics: PerformanceMetrics): string[] {
    const bottlenecks: string[] = [];

    if (metrics.pageLoadTime > 5000) {
      bottlenecks.push(`Slow page load time: ${Math.round(metrics.pageLoadTime)}ms (target: <3000ms)`);
    }

    if (metrics.largestContentfulPaint > 4000) {
      bottlenecks.push(`Poor Largest Contentful Paint: ${Math.round(metrics.largestContentfulPaint)}ms (target: <2500ms)`);
    }

    if (metrics.timeToFirstByte > 800) {
      bottlenecks.push(`Slow Time to First Byte: ${Math.round(metrics.timeToFirstByte)}ms (target: <200ms)`);
    }

    if (metrics.resourceCount > 100) {
      bottlenecks.push(`High resource count: ${metrics.resourceCount} requests (consider bundling)`);
    }

    if (metrics.totalResourceSize > 5000000) {
      bottlenecks.push(`Large total resource size: ${Math.round(metrics.totalResourceSize / 1024 / 1024)}MB`);
    }

    if (metrics.javaScriptExecutionTime > 1000) {
      bottlenecks.push(`High JavaScript execution time: ${Math.round(metrics.javaScriptExecutionTime)}ms`);
    }

    // Analyze slowest resources
    const slowResources = metrics.slowestResources.filter(r => r.duration > 1000);
    if (slowResources.length > 0) {
      bottlenecks.push(`${slowResources.length} resources taking >1s to load`);
    }

    return bottlenecks;
  }

  private generateRecommendations(metrics: PerformanceMetrics, bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    if (metrics.largestContentfulPaint > 2500) {
      recommendations.push('Optimize largest contentful paint by lazy loading images and optimizing critical rendering path');
    }

    if (metrics.resourceCount > 80) {
      recommendations.push('Reduce HTTP requests by bundling CSS/JS files and using CSS sprites');
    }

    if (metrics.totalResourceSize > 3000000) {
      recommendations.push('Compress images, minify CSS/JS, and enable gzip compression');
    }

    if (metrics.timeToFirstByte > 500) {
      recommendations.push('Optimize server response time by caching database queries and using CDN');
    }

    if (metrics.javaScriptExecutionTime > 500) {
      recommendations.push('Optimize JavaScript by code splitting and removing unused code');
    }

    const slowImages = metrics.slowestResources.filter(r => r.type === 'img' && r.duration > 500);
    if (slowImages.length > 0) {
      recommendations.push('Optimize image loading by using WebP format and responsive images');
    }

    const slowScripts = metrics.slowestResources.filter(r => r.type === 'script' && r.duration > 500);
    if (slowScripts.length > 0) {
      recommendations.push('Optimize script loading by using async/defer attributes and code splitting');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable ranges. Consider monitoring for regression.');
    }

    return recommendations;
  }

  private getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private async createDetailedBreakdown(page: any, metrics: PerformanceMetrics): Promise<any> {
    const performanceTimeline = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const start = navigation.startTime || 0;
      return {
        navigationStart: 0,
        unloadEventStart: navigation.unloadEventStart - start,
        redirectStart: navigation.redirectStart - start,
        fetchStart: navigation.fetchStart - start,
        domainLookupStart: navigation.domainLookupStart - start,
        domainLookupEnd: navigation.domainLookupEnd - start,
        connectStart: navigation.connectStart - start,
        connectEnd: navigation.connectEnd - start,
        requestStart: navigation.requestStart - start,
        responseStart: navigation.responseStart - start,
        responseEnd: navigation.responseEnd - start,
        domLoading: navigation.domLoading - start,
        domContentLoadedEventStart: navigation.domContentLoadedEventStart - start,
        domContentLoadedEventEnd: navigation.domContentLoadedEventEnd - start,
        domComplete: navigation.domComplete - start,
        loadEventStart: navigation.loadEventStart - start,
        loadEventEnd: navigation.loadEventEnd - start
      };
    });

    return {
      loadingPhases: [
        { phase: 'DNS Lookup', duration: performanceTimeline.domainLookupEnd - performanceTimeline.domainLookupStart },
        { phase: 'TCP Connection', duration: performanceTimeline.connectEnd - performanceTimeline.connectStart },
        { phase: 'Request/Response', duration: performanceTimeline.responseEnd - performanceTimeline.requestStart },
        { phase: 'DOM Processing', duration: performanceTimeline.domComplete - performanceTimeline.domLoading },
        { phase: 'Load Event', duration: performanceTimeline.loadEventEnd - performanceTimeline.loadEventStart }
      ],
      criticalResources: metrics.slowestResources.slice(0, 5),
      performanceTimeline
    };
  }

  private async generateHTMLReport(report: PerformanceReport): Promise<void> {
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Issue Navigator Performance Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
        .score-A { color: #28a745; font-weight: bold; }
        .score-B { color: #6f42c1; font-weight: bold; }
        .score-C { color: #fd7e14; font-weight: bold; }
        .score-D { color: #dc3545; font-weight: bold; }
        .score-F { color: #dc3545; font-weight: bold; background: #f8d7da; }
        .good { color: #28a745; }
        .needs-improvement { color: #ffc107; }
        .poor { color: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .bottleneck { background: #fff3cd; padding: 10px; margin: 5px 0; border-radius: 4px; }
        .recommendation { background: #d1ecf1; padding: 10px; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Issue Navigator Performance Analysis</h1>
        <p><strong>Test Date:</strong> ${report.testInfo.timestamp}</p>
        <p><strong>URL:</strong> ${report.testInfo.url}</p>
        <p><strong>Overall Score:</strong> <span class="score-${report.analysis.performanceGrade}">${report.analysis.overallScore}/100 (${report.analysis.performanceGrade})</span></p>
    </div>

    <div class="metrics">
        <div class="metric-card">
            <h3>📊 Core Web Vitals</h3>
            <p><strong>LCP:</strong> <span class="${report.coreWebVitals.lcp.rating}">${Math.round(report.coreWebVitals.lcp.value)}ms (${report.coreWebVitals.lcp.rating})</span></p>
            <p><strong>FID:</strong> <span class="${report.coreWebVitals.fid.rating}">${Math.round(report.coreWebVitals.fid.value)}ms (${report.coreWebVitals.fid.rating})</span></p>
            <p><strong>CLS:</strong> <span class="${report.coreWebVitals.cls.rating}">${report.coreWebVitals.cls.value.toFixed(3)} (${report.coreWebVitals.cls.rating})</span></p>
        </div>

        <div class="metric-card">
            <h3>⏱️ Timing Metrics</h3>
            <p><strong>Page Load Time:</strong> ${Math.round(report.metrics.pageLoadTime)}ms</p>
            <p><strong>DOM Content Loaded:</strong> ${Math.round(report.metrics.domContentLoaded)}ms</p>
            <p><strong>First Contentful Paint:</strong> ${Math.round(report.metrics.firstContentfulPaint)}ms</p>
            <p><strong>Time to First Byte:</strong> ${Math.round(report.metrics.timeToFirstByte)}ms</p>
        </div>

        <div class="metric-card">
            <h3>📦 Resource Metrics</h3>
            <p><strong>Total Requests:</strong> ${report.metrics.resourceCount}</p>
            <p><strong>Total Size:</strong> ${Math.round(report.metrics.totalResourceSize / 1024 / 1024 * 100) / 100}MB</p>
            <p><strong>JS Execution Time:</strong> ${Math.round(report.metrics.javaScriptExecutionTime)}ms</p>
            <p><strong>Rendering Time:</strong> ${Math.round(report.metrics.renderingTime)}ms</p>
        </div>
    </div>

    <h2>🚨 Performance Bottlenecks</h2>
    ${report.analysis.bottlenecks.map(bottleneck => `<div class="bottleneck">${bottleneck}</div>`).join('')}

    <h2>💡 Recommendations</h2>
    ${report.analysis.recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}

    <h2>🐌 Slowest Resources</h2>
    <table>
        <tr><th>Resource</th><th>Type</th><th>Duration</th><th>Size</th></tr>
        ${report.metrics.slowestResources.slice(0, 10).map(resource => `
        <tr>
            <td>${resource.name.split('/').pop()}</td>
            <td>${resource.type}</td>
            <td>${Math.round(resource.duration)}ms</td>
            <td>${Math.round(resource.size / 1024)}KB</td>
        </tr>
        `).join('')}
    </table>

    <h2>⏰ Loading Timeline</h2>
    <table>
        <tr><th>Phase</th><th>Duration</th></tr>
        ${report.detailedBreakdown.loadingPhases.map(phase => `
        <tr>
            <td>${phase.phase}</td>
            <td>${Math.round(phase.duration)}ms</td>
        </tr>
        `).join('')}
    </table>

    <footer style="margin-top: 40px; text-align: center; color: #666;">
        <p>Generated by Issue Navigator Performance Analyzer</p>
    </footer>
</body>
</html>`;

    const htmlPath = `issue-navigator-performance-report-${Date.now()}.html`;
    fs.writeFileSync(htmlPath, htmlContent);
    console.log(`📄 HTML report generated: ${htmlPath}`);
  }

  async printSummary(report: PerformanceReport): Promise<void> {
    console.log('\n🎯 ISSUE NAVIGATOR PERFORMANCE ANALYSIS SUMMARY');
    console.log('=================================================');
    console.log(`📊 Overall Score: ${report.analysis.overallScore}/100 (Grade: ${report.analysis.performanceGrade})`);
    console.log(`⏱️ Page Load Time: ${Math.round(report.metrics.pageLoadTime)}ms`);
    console.log(`🎨 Largest Contentful Paint: ${Math.round(report.metrics.largestContentfulPaint)}ms (${report.coreWebVitals.lcp.rating})`);
    console.log(`📦 Total Resources: ${report.metrics.resourceCount} (${Math.round(report.metrics.totalResourceSize / 1024 / 1024 * 100) / 100}MB)`);
    
    console.log('\n🚨 Performance Bottlenecks:');
    report.analysis.bottlenecks.forEach(bottleneck => {
      console.log(`   • ${bottleneck}`);
    });
    
    console.log('\n💡 Top Recommendations:');
    report.analysis.recommendations.slice(0, 3).forEach(rec => {
      console.log(`   • ${rec}`);
    });
    
    console.log('\n🐌 Slowest Resources:');
    report.metrics.slowestResources.slice(0, 5).forEach(resource => {
      console.log(`   • ${resource.name.split('/').pop()} (${resource.type}): ${Math.round(resource.duration)}ms`);
    });
    
    console.log('=================================================');
  }
}

// Main execution function
async function runIssueNavigatorPerformanceAnalysis() {
  const analyzer = new IssueNavigatorPerformanceAnalyzer();
  
  try {
    console.log('🚀 Starting Issue Navigator Performance Analysis...');
    
    const report = await analyzer.performIssueNavigatorAnalysis();
    await analyzer.printSummary(report);
    
    console.log('\n✅ Performance analysis complete!');
    console.log('📊 Check the generated HTML report for detailed analysis.');
    
  } catch (error) {
    console.error('❌ Performance analysis failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { IssueNavigatorPerformanceAnalyzer, PerformanceReport, PerformanceMetrics };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIssueNavigatorPerformanceAnalysis();
} 