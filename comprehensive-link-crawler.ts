import { chromium } from 'playwright';
import fs from 'fs';

interface LinkTestResult {
  linkText: string;
  href: string;
  selector: string;
  isClickable: boolean;
  destinationStatus: 'SUCCESS' | 'ERROR' | '404' | 'TIMEOUT' | 'REDIRECT' | 'UNTESTED';
  destinationUrl?: string;
  responseTime?: number;
  errorMessage?: string;
  screenshot?: string;
}

interface PageCrawlResult {
  pageName: string;
  pageUrl: string;
  totalLinks: number;
  clickableLinks: number;
  brokenLinks: number;
  workingLinks: number;
  unresponsiveLinks: number;
  linkResults: LinkTestResult[];
  pageScreenshot?: string;
  crawlDuration: number;
}

interface ComprehensiveLinkReport {
  reportTime: string;
  totalPages: number;
  totalLinksFound: number;
  totalLinksTested: number;
  overallLinkHealth: string;
  pageResults: PageCrawlResult[];
  summary: {
    workingLinks: number;
    brokenLinks: number;
    unresponsiveLinks: number;
    nonClickableLinks: number;
  };
  criticalIssues: string[];
  recommendations: string[];
}

class ComprehensiveLinkCrawler {
  private sessionData: any = null;
  private pageResults: PageCrawlResult[] = [];
  private visitedUrls = new Set<string>();
  
  async loadSession(): Promise<boolean> {
    try {
      const sessionFiles = fs.readdirSync('.').filter(f => 
        f.startsWith('jira-uat-session-') && f.endsWith('.json')
      );

      if (sessionFiles.length === 0) {
        console.log('⚠️ No session files found - will test public pages only');
        return false;
      }

      const latestSession = sessionFiles.sort().pop()!;
      this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
      console.log(`📁 Loaded session: ${latestSession}`);
      return true;
    } catch (error) {
      console.log('⚠️ Session load failed - continuing without session');
      return false;
    }
  }

  async runComprehensiveLinkCrawl(): Promise<ComprehensiveLinkReport> {
    console.log('🕷️ COMPREHENSIVE LINK CRAWLER');
    console.log('==============================');
    console.log('🔗 Testing every clickable element across all JIRA screens');
    console.log('📊 Checking for 404s, broken links, and navigation health');
    console.log('🎯 Building complete functional coverage map');
    
    await this.loadSession();

    // Define key JIRA pages to crawl
    const pagesToCrawl = [
      { name: 'Login/Landing Page', url: 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa' },
      { name: 'Dashboard', url: 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa' },
      { name: 'Issue Navigator', url: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa' },
      { name: 'Create Issue', url: 'https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa' },
      { name: 'Projects', url: 'https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa' },
      { name: 'Admin Panel', url: 'https://jirauat.smedigitalapps.com/jira/secure/admin/ViewApplicationProperties.jspa' },
      { name: 'Profile', url: 'https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa' }
    ];

    for (const page of pagesToCrawl) {
      console.log(`\n🔍 CRAWLING: ${page.name}`);
      console.log('='.repeat(60));
      
      try {
        const result = await this.crawlPage(page.name, page.url);
        this.pageResults.push(result);
        this.printPageSummary(result);
        
        // Brief pause between pages
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.log(`❌ Failed to crawl ${page.name}: ${error.message}`);
        
        // Add error result
        this.pageResults.push({
          pageName: page.name,
          pageUrl: page.url,
          totalLinks: 0,
          clickableLinks: 0,
          brokenLinks: 0,
          workingLinks: 0,
          unresponsiveLinks: 0,
          linkResults: [],
          crawlDuration: 0
        });
      }
    }

    return this.generateComprehensiveReport();
  }

  private async crawlPage(pageName: string, pageUrl: string): Promise<PageCrawlResult> {
    const startTime = Date.now();
    const browser = await chromium.launch({ headless: false }); // Keep visible for debugging
    
    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      // Apply session if available
      if (this.sessionData?.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      console.log(`   📍 Loading page: ${pageUrl}`);
      await page.goto(pageUrl, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Take page screenshot
      const pageScreenshot = `page-${pageName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
      await page.screenshot({ path: pageScreenshot, fullPage: true });
      console.log(`   📸 Page screenshot: ${pageScreenshot}`);
      
      // Find all potentially clickable elements
      const linkSelectors = [
        'a[href]',                    // Regular links
        'button',                     // Buttons
        'input[type="button"]',       // Button inputs
        'input[type="submit"]',       // Submit buttons
        '[onclick]',                  // Elements with onclick
        '.aui-button',               // JIRA button class
        '.aui-nav-link',             // JIRA navigation links
        '[role="button"]',           // ARIA buttons
        '[tabindex="0"]',            // Focusable elements
        '.trigger-label',            // JIRA triggers
        'span[title]',               // Potentially clickable spans
        'div[title]'                 // Potentially clickable divs
      ];
      
      const allElements = await page.locator(linkSelectors.join(', ')).all();
      console.log(`   🔍 Found ${allElements.length} potentially clickable elements`);
      
      const linkResults: LinkTestResult[] = [];
      let clickableCount = 0;
      let workingCount = 0;
      let brokenCount = 0;
      let unresponsiveCount = 0;
      
      // Test each element
      for (let i = 0; i < Math.min(allElements.length, 50); i++) { // Limit to 50 to avoid overwhelming
        const element = allElements[i];
        
        try {
          console.log(`   🔗 Testing element ${i + 1}/${Math.min(allElements.length, 50)}`);
          
          const linkResult = await this.testLinkElement(page, element, i + 1);
          linkResults.push(linkResult);
          
          if (linkResult.isClickable) {
            clickableCount++;
            
            if (linkResult.destinationStatus === 'SUCCESS') {
              workingCount++;
            } else if (linkResult.destinationStatus === 'ERROR' || linkResult.destinationStatus === '404') {
              brokenCount++;
            } else if (linkResult.destinationStatus === 'TIMEOUT') {
              unresponsiveCount++;
            }
          }
          
          // Brief pause between link tests
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.log(`   ⚠️ Error testing element ${i + 1}: ${error.message}`);
          
          linkResults.push({
            linkText: 'Error during test',
            href: '',
            selector: 'unknown',
            isClickable: false,
            destinationStatus: 'ERROR',
            errorMessage: error.message
          });
        }
      }
      
      const crawlDuration = Date.now() - startTime;
      
      return {
        pageName,
        pageUrl,
        totalLinks: allElements.length,
        clickableLinks: clickableCount,
        brokenLinks: brokenCount,
        workingLinks: workingCount,
        unresponsiveLinks: unresponsiveCount,
        linkResults,
        pageScreenshot,
        crawlDuration
      };
      
    } finally {
      await browser.close();
    }
  }

  private async testLinkElement(page: any, element: any, elementIndex: number): Promise<LinkTestResult> {
    try {
      // Get element properties
      const tagName = await element.evaluate((el: any) => el.tagName.toLowerCase());
      const linkText = await element.textContent() || '';
      const href = await element.getAttribute('href') || '';
      const title = await element.getAttribute('title') || '';
      const onclick = await element.getAttribute('onclick') || '';
      
      const displayText = linkText.trim() || title.trim() || href || `${tagName}-element`;
      const selector = `${tagName}${href ? `[href="${href}"]` : ''}`;
      
      // Check if element is actually clickable
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      const hasClickHandler = href || onclick || tagName === 'button' || tagName === 'a';
      
      const isClickable = isVisible && isEnabled && hasClickHandler;
      
      console.log(`      📋 "${displayText.substring(0, 30)}..." - ${tagName} - Clickable: ${isClickable}`);
      
      if (!isClickable) {
        return {
          linkText: displayText,
          href,
          selector,
          isClickable: false,
          destinationStatus: 'UNTESTED'
        };
      }
      
      // Test the click action
      if (href && href.startsWith('http')) {
        // External or full URL - test with fetch
        return await this.testUrlDestination(displayText, href, selector);
      } else if (href || onclick) {
        // Internal link or JavaScript - test with click
        return await this.testClickAction(page, element, displayText, href, selector, elementIndex);
      } else {
        return {
          linkText: displayText,
          href,
          selector,
          isClickable: true,
          destinationStatus: 'UNTESTED'
        };
      }
      
    } catch (error) {
      return {
        linkText: 'Error',
        href: '',
        selector: 'unknown',
        isClickable: false,
        destinationStatus: 'ERROR',
        errorMessage: error.message
      };
    }
  }

  private async testUrlDestination(linkText: string, href: string, selector: string): Promise<LinkTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`        🌐 Testing URL: ${href}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(href, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      let destinationStatus: 'SUCCESS' | 'ERROR' | '404' | 'TIMEOUT' | 'REDIRECT';
      
      if (response.status === 404) {
        destinationStatus = '404';
      } else if (response.status >= 400) {
        destinationStatus = 'ERROR';
      } else if (response.status >= 300 && response.status < 400) {
        destinationStatus = 'REDIRECT';
      } else {
        destinationStatus = 'SUCCESS';
      }
      
      console.log(`        ✅ Response: ${response.status} (${responseTime}ms)`);
      
      return {
        linkText,
        href,
        selector,
        isClickable: true,
        destinationStatus,
        destinationUrl: response.url,
        responseTime
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        console.log(`        ⏰ Timeout after 10s`);
        return {
          linkText,
          href,
          selector,
          isClickable: true,
          destinationStatus: 'TIMEOUT',
          responseTime,
          errorMessage: 'Request timeout'
        };
      } else {
        console.log(`        ❌ Error: ${error.message}`);
        return {
          linkText,
          href,
          selector,
          isClickable: true,
          destinationStatus: 'ERROR',
          responseTime,
          errorMessage: error.message
        };
      }
    }
  }

  private async testClickAction(page: any, element: any, linkText: string, href: string, selector: string, elementIndex: number): Promise<LinkTestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`        🖱️ Testing click action`);
      
      // Get current URL before click
      const currentUrl = page.url();
      
      // Create a new page to test the click without affecting main page
      const newPage = await page.context().newPage();
      await newPage.goto(currentUrl);
      
      // Re-find the element on the new page
      const newElement = newPage.locator(selector).nth(0);
      
      if (await newElement.count() === 0) {
        throw new Error('Element not found on test page');
      }
      
      // Click and wait for navigation or response
      await Promise.race([
        newElement.click(),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
      
      // Wait a bit for any navigation to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalUrl = newPage.url();
      const responseTime = Date.now() - startTime;
      
      // Take screenshot of destination
      const screenshot = `link-destination-${elementIndex}-${Date.now()}.png`;
      await newPage.screenshot({ path: screenshot });
      
      await newPage.close();
      
      let destinationStatus: 'SUCCESS' | 'ERROR' | '404' | 'TIMEOUT' | 'REDIRECT';
      
      if (finalUrl === currentUrl) {
        // No navigation occurred - might be JavaScript action
        destinationStatus = 'SUCCESS';
      } else if (finalUrl.includes('error') || finalUrl.includes('404')) {
        destinationStatus = '404';
      } else {
        destinationStatus = 'SUCCESS';
      }
      
      console.log(`        ✅ Click result: ${finalUrl === currentUrl ? 'Same page' : 'Navigated'} (${responseTime}ms)`);
      
      return {
        linkText,
        href,
        selector,
        isClickable: true,
        destinationStatus,
        destinationUrl: finalUrl,
        responseTime,
        screenshot
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.log(`        ❌ Click failed: ${error.message}`);
      
      return {
        linkText,
        href,
        selector,
        isClickable: true,
        destinationStatus: 'ERROR',
        responseTime,
        errorMessage: error.message
      };
    }
  }

  private printPageSummary(result: PageCrawlResult): void {
    console.log(`   📊 PAGE SUMMARY: ${result.pageName}`);
    console.log(`      Total Elements: ${result.totalLinks}`);
    console.log(`      Clickable Links: ${result.clickableLinks}`);
    console.log(`      ✅ Working: ${result.workingLinks}`);
    console.log(`      🚫 Broken: ${result.brokenLinks}`);
    console.log(`      ⏰ Unresponsive: ${result.unresponsiveLinks}`);
    console.log(`      ⏱️ Crawl Time: ${Math.round(result.crawlDuration / 1000)}s`);
    
    // Highlight critical issues
    if (result.brokenLinks > 0) {
      console.log(`      🚨 CRITICAL: ${result.brokenLinks} broken links found!`);
    }
    
    if (result.unresponsiveLinks > 0) {
      console.log(`      ⚠️ WARNING: ${result.unresponsiveLinks} unresponsive links`);
    }
  }

  private generateComprehensiveReport(): ComprehensiveLinkReport {
    const totalPages = this.pageResults.length;
    const totalLinksFound = this.pageResults.reduce((sum, page) => sum + page.totalLinks, 0);
    const totalLinksTested = this.pageResults.reduce((sum, page) => sum + page.clickableLinks, 0);
    
    const workingLinks = this.pageResults.reduce((sum, page) => sum + page.workingLinks, 0);
    const brokenLinks = this.pageResults.reduce((sum, page) => sum + page.brokenLinks, 0);
    const unresponsiveLinks = this.pageResults.reduce((sum, page) => sum + page.unresponsiveLinks, 0);
    const nonClickableLinks = totalLinksFound - totalLinksTested;
    
    const successRate = totalLinksTested > 0 ? Math.round((workingLinks / totalLinksTested) * 100) : 0;
    
    let overallLinkHealth: string;
    if (successRate >= 90) {
      overallLinkHealth = `EXCELLENT (${successRate}%)`;
    } else if (successRate >= 75) {
      overallLinkHealth = `GOOD (${successRate}%)`;
    } else if (successRate >= 50) {
      overallLinkHealth = `POOR (${successRate}%)`;
    } else {
      overallLinkHealth = `CRITICAL (${successRate}%)`;
    }
    
    // Generate critical issues
    const criticalIssues: string[] = [];
    
    if (brokenLinks > 0) {
      criticalIssues.push(`${brokenLinks} broken links found across ${totalPages} pages`);
    }
    
    if (unresponsiveLinks > 0) {
      criticalIssues.push(`${unresponsiveLinks} unresponsive links (timeouts)`);
    }
    
    if (nonClickableLinks > totalLinksFound * 0.3) {
      criticalIssues.push(`${nonClickableLinks} non-clickable elements that appear to be links (UX issue)`);
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (brokenLinks > 0) {
      recommendations.push('Fix broken links - these create poor user experience and may block workflows');
    }
    
    if (unresponsiveLinks > 0) {
      recommendations.push('Investigate slow/unresponsive links - may indicate performance issues');
    }
    
    if (nonClickableLinks > 0) {
      recommendations.push('Review non-clickable elements that appear to be links - potential UX improvements');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Link ecosystem is healthy - continue monitoring');
    }
    
    return {
      reportTime: new Date().toISOString(),
      totalPages,
      totalLinksFound,
      totalLinksTested,
      overallLinkHealth,
      pageResults: this.pageResults,
      summary: {
        workingLinks,
        brokenLinks,
        unresponsiveLinks,
        nonClickableLinks
      },
      criticalIssues,
      recommendations
    };
  }

  async saveAndPrintReport(report: ComprehensiveLinkReport): Promise<void> {
    // Save detailed JSON report
    const reportPath = `COMPREHENSIVE-LINK-REPORT-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n🕷️ COMPREHENSIVE LINK CRAWL COMPLETE');
    console.log('====================================');
    console.log(`⏰ Report Time: ${new Date(report.reportTime).toLocaleString()}`);
    console.log(`🔗 Overall Link Health: ${report.overallLinkHealth}`);

    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`   Pages Crawled: ${report.totalPages}`);
    console.log(`   Links Found: ${report.totalLinksFound}`);
    console.log(`   Links Tested: ${report.totalLinksTested}`);
    console.log(`   ✅ Working Links: ${report.summary.workingLinks}`);
    console.log(`   🚫 Broken Links: ${report.summary.brokenLinks}`);
    console.log(`   ⏰ Unresponsive: ${report.summary.unresponsiveLinks}`);
    console.log(`   🔗 Non-Clickable: ${report.summary.nonClickableLinks}`);

    console.log('\n📋 PAGE-BY-PAGE RESULTS:');
    report.pageResults.forEach(page => {
      const healthIcon = page.brokenLinks > 0 ? '🚨' : 
                        page.unresponsiveLinks > 0 ? '⚠️' : '✅';
      
      console.log(`   ${healthIcon} ${page.pageName}: ${page.workingLinks}/${page.clickableLinks} working (${page.brokenLinks} broken)`);
    });

    if (report.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      report.criticalIssues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log(`\n💾 Detailed report saved: ${reportPath}`);
    console.log(`📸 Screenshots available for debugging broken links`);
    console.log(`📊 Ready for functional coverage analysis`);
  }
}

// Main execution
async function runComprehensiveLinkCrawl() {
  const crawler = new ComprehensiveLinkCrawler();
  
  try {
    console.log('🕷️ Starting comprehensive link crawl...');
    const report = await crawler.runComprehensiveLinkCrawl();
    await crawler.saveAndPrintReport(report);
    
  } catch (error) {
    console.error('❌ Comprehensive link crawl failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { ComprehensiveLinkCrawler };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runComprehensiveLinkCrawl();
} 