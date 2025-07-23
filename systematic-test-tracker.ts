import { chromium } from 'playwright';
import fs from 'fs';

interface TestResult {
  testName: string;
  category: string;
  timestamp: string;
  passed: boolean;
  duration: number;
  errorMessage?: string;
  details?: string;
}

interface TestCategory {
  name: string;
  totalAttempts: number;
  passed: number;
  failed: number;
  successRate: string;
  lastTested: string;
  status: 'PASS' | 'FAIL' | 'CRITICAL_FAIL' | 'UNTESTED';
}

interface SystemHealthReport {
  reportTime: string;
  overallHealth: string;
  categories: TestCategory[];
  recentTests: TestResult[];
  recommendations: string[];
}

class SystematicTestTracker {
  private results: TestResult[] = [];
  private sessionData: any = null;

  async loadSession(): Promise<boolean> {
    try {
      const sessionFiles = fs.readdirSync('.').filter(f => 
        f.startsWith('jira-uat-session-') && f.endsWith('.json')
      );

      if (sessionFiles.length === 0) {
        console.log('⚠️ No session files found - will attempt without session');
        return false;
      }

      const latestSession = sessionFiles.sort().pop()!;
      this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
      return true;
    } catch (error) {
      console.log('⚠️ Session load failed - continuing without session');
      return false;
    }
  }

  async runSystematicValidation(): Promise<SystemHealthReport> {
    console.log('🔍 SYSTEMATIC TEST VALIDATION');
    console.log('=============================');
    console.log('📊 Testing multiple categories with pass/fail tracking');
    
    await this.loadSession();

    // Run tests in order of criticality
    await this.testConnectivity();
    await this.testBasicAccess();
    await this.testAuthentication();
    await this.testNavigation();
    await this.testTicketCreation();

    return this.generateHealthReport();
  }

  private async testConnectivity(): Promise<void> {
    console.log('\n🌐 CONNECTIVITY TEST');
    console.log('-------------------');
    
    const startTime = Date.now();
    let passed = false;
    let errorMessage = '';

    try {
      console.log('   📡 Testing network connectivity...');
      
      // Simple connectivity test
      const response = await fetch('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        method: 'HEAD',
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.status === 200 || response.status === 302 || response.status === 401) {
        // Any response is better than timeout
        passed = true;
        console.log(`   ✅ CONNECTIVITY: Server responding (${response.status})`);
      } else {
        errorMessage = `Server returned ${response.status}`;
        console.log(`   ⚠️ CONNECTIVITY: Unexpected status ${response.status}`);
      }
      
    } catch (error) {
      errorMessage = error.message;
      console.log(`   ❌ CONNECTIVITY: ${error.message}`);
    }

    this.logResult('Network Connectivity', 'Connectivity', passed, Date.now() - startTime, errorMessage);
  }

  private async testBasicAccess(): Promise<void> {
    console.log('\n🏠 BASIC ACCESS TEST');
    console.log('-------------------');
    
    const startTime = Date.now();
    let passed = false;
    let errorMessage = '';

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });

    try {
      console.log('   🌐 Attempting to load JIRA homepage...');
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      const page = await context.newPage();
      
      // Try to load the page with reduced timeout
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      // Check if we get any recognizable JIRA content
      const title = await page.title();
      if (title.toLowerCase().includes('jira') || title.toLowerCase().includes('login')) {
        passed = true;
        console.log(`   ✅ BASIC ACCESS: Page loaded successfully (${title})`);
      } else {
        errorMessage = `Unexpected page title: ${title}`;
        console.log(`   ⚠️ BASIC ACCESS: Unexpected content (${title})`);
      }
      
    } catch (error) {
      errorMessage = error.message;
      console.log(`   ❌ BASIC ACCESS: ${error.message}`);
    } finally {
      await browser.close();
    }

    this.logResult('Basic Page Access', 'Access', passed, Date.now() - startTime, errorMessage);
  }

  private async testAuthentication(): Promise<void> {
    console.log('\n🔐 AUTHENTICATION TEST');
    console.log('---------------------');
    
    const startTime = Date.now();
    let passed = false;
    let errorMessage = '';

    if (!this.sessionData) {
      console.log('   ⚠️ AUTHENTICATION: No session data - skipping auth test');
      this.logResult('Session Authentication', 'Authentication', false, Date.now() - startTime, 'No session data available');
      return;
    }

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });

    try {
      console.log('   🍪 Testing session-based authentication...');
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      // Apply session cookies
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      // Check for authenticated state (dashboard vs login page)
      const url = page.url();
      if (url.includes('Dashboard.jspa') && !url.includes('login')) {
        passed = true;
        console.log('   ✅ AUTHENTICATION: Session valid - authenticated access');
      } else {
        errorMessage = 'Redirected to login - session expired';
        console.log('   ⚠️ AUTHENTICATION: Session expired - redirected to login');
      }
      
    } catch (error) {
      errorMessage = error.message;
      console.log(`   ❌ AUTHENTICATION: ${error.message}`);
    } finally {
      await browser.close();
    }

    this.logResult('Session Authentication', 'Authentication', passed, Date.now() - startTime, errorMessage);
  }

  private async testNavigation(): Promise<void> {
    console.log('\n🧭 NAVIGATION TEST');
    console.log('-----------------');
    
    const startTime = Date.now();
    let passed = false;
    let errorMessage = '';

    if (!this.sessionData) {
      console.log('   ⚠️ NAVIGATION: No session data - skipping navigation test');
      this.logResult('Dashboard Navigation', 'Navigation', false, Date.now() - startTime, 'No session data available');
      return;
    }

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });

    try {
      console.log('   🏠 Testing dashboard navigation...');
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Look for key dashboard elements
      const hasNavigationElements = await page.locator('text=Create, text=Issues, text=Projects').count() > 0;
      
      if (hasNavigationElements) {
        passed = true;
        console.log('   ✅ NAVIGATION: Dashboard elements loaded successfully');
      } else {
        errorMessage = 'Dashboard elements not found';
        console.log('   ⚠️ NAVIGATION: Dashboard elements missing');
      }
      
    } catch (error) {
      errorMessage = error.message;
      console.log(`   ❌ NAVIGATION: ${error.message}`);
    } finally {
      await browser.close();
    }

    this.logResult('Dashboard Navigation', 'Navigation', passed, Date.now() - startTime, errorMessage);
  }

  private async testTicketCreation(): Promise<void> {
    console.log('\n🎫 TICKET CREATION TEST');
    console.log('----------------------');
    
    const startTime = Date.now();
    let passed = false;
    let errorMessage = '';

    if (!this.sessionData) {
      console.log('   ⚠️ TICKET CREATION: No session data - skipping creation test');
      this.logResult('Ticket Creation', 'Core Functionality', false, Date.now() - startTime, 'No session data available');
      return;
    }

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox']
    });

    try {
      console.log('   🎯 Testing core ticket creation functionality...');
      
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }
      
      const page = await context.newPage();
      
      // Navigate to dashboard
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      // Try to click Create button
      console.log('      🖱️ Clicking Create button...');
      const createButton = page.locator('text=Create').first();
      await createButton.click();
      
      // Wait for create dialog
      console.log('      ⏳ Waiting for create dialog...');
      await page.waitForSelector('#create-issue-dialog', { timeout: 30000 });
      
      // Fill basic form
      console.log('      📝 Filling ticket form...');
      const summaryField = page.locator('#summary');
      await summaryField.fill('SYSTEMATIC TEST - Quick Validation');
      
      // Try submission with timeout
      console.log('      🚀 Testing submission...');
      const submitButton = page.locator('#create-issue-submit').first();
      await submitButton.click();
      
      // Wait for success or timeout (shorter timeout for systematic testing)
      await Promise.race([
        page.waitForURL(/\/browse\/ITSM-/, { timeout: 45000 }),
        page.waitForSelector('.issue-header', { timeout: 45000 })
      ]);
      
      passed = true;
      console.log('   ✅ TICKET CREATION: Successfully created ticket');
      
    } catch (error) {
      errorMessage = error.message;
      if (error.message.includes('Timeout')) {
        console.log('   ❌ TICKET CREATION: Timeout during submission (45s)');
      } else {
        console.log(`   ❌ TICKET CREATION: ${error.message}`);
      }
    } finally {
      await browser.close();
    }

    this.logResult('Ticket Creation', 'Core Functionality', passed, Date.now() - startTime, errorMessage);
  }

  private logResult(testName: string, category: string, passed: boolean, duration: number, errorMessage?: string): void {
    const result: TestResult = {
      testName,
      category,
      timestamp: new Date().toISOString(),
      passed,
      duration,
      errorMessage,
      details: passed ? 'Test completed successfully' : errorMessage
    };

    this.results.push(result);

    const status = passed ? '✅ PASS' : '❌ FAIL';
    const time = Math.round(duration / 1000);
    console.log(`   📊 RESULT: ${status} (${time}s)`);
  }

  private generateHealthReport(): SystemHealthReport {
    // Group results by category
    const categoryMap = new Map<string, TestResult[]>();
    
    this.results.forEach(result => {
      if (!categoryMap.has(result.category)) {
        categoryMap.set(result.category, []);
      }
      categoryMap.get(result.category)!.push(result);
    });

    // Generate category summaries
    const categories: TestCategory[] = [];
    categoryMap.forEach((results, categoryName) => {
      const passed = results.filter(r => r.passed).length;
      const failed = results.filter(r => !r.passed).length;
      const total = passed + failed;
      const successRate = total > 0 ? `${Math.round((passed / total) * 100)}%` : '0%';
      
      let status: 'PASS' | 'FAIL' | 'CRITICAL_FAIL' | 'UNTESTED';
      if (total === 0) {
        status = 'UNTESTED';
      } else if (passed === total) {
        status = 'PASS';
      } else if (passed === 0) {
        status = 'CRITICAL_FAIL';
      } else {
        status = 'FAIL';
      }

      categories.push({
        name: categoryName,
        totalAttempts: total,
        passed,
        failed,
        successRate,
        lastTested: results[results.length - 1].timestamp,
        status
      });
    });

    // Calculate overall health
    const totalPassed = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const overallSuccessRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    let overallHealth: string;
    if (overallSuccessRate >= 80) {
      overallHealth = `HEALTHY (${overallSuccessRate}%)`;
    } else if (overallSuccessRate >= 50) {
      overallHealth = `DEGRADED (${overallSuccessRate}%)`;
    } else if (overallSuccessRate > 0) {
      overallHealth = `CRITICAL (${overallSuccessRate}%)`;
    } else {
      overallHealth = `COMPLETE FAILURE (0%)`;
    }

    // Generate recommendations
    const recommendations: string[] = [];
    categories.forEach(cat => {
      if (cat.status === 'CRITICAL_FAIL') {
        recommendations.push(`URGENT: ${cat.name} completely non-functional - immediate attention required`);
      } else if (cat.status === 'FAIL') {
        recommendations.push(`HIGH: ${cat.name} partially failing - investigation needed`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring - all systems operational');
    }

    return {
      reportTime: new Date().toISOString(),
      overallHealth,
      categories,
      recentTests: this.results.slice(-10), // Last 10 tests
      recommendations
    };
  }

  async saveAndPrintReport(report: SystemHealthReport): Promise<void> {
    // Save detailed JSON report
    const reportPath = `SYSTEMATIC-TEST-REPORT-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 SYSTEMATIC TEST SUMMARY');
    console.log('==========================');
    console.log(`🎯 Overall System Health: ${report.overallHealth}`);
    console.log(`⏰ Report Time: ${new Date(report.reportTime).toLocaleString()}`);

    console.log('\n📋 CATEGORY BREAKDOWN:');
    report.categories.forEach(cat => {
      const statusIcon = cat.status === 'PASS' ? '✅' : 
                        cat.status === 'FAIL' ? '⚠️' : 
                        cat.status === 'CRITICAL_FAIL' ? '🚨' : '❓';
      
      console.log(`   ${statusIcon} ${cat.name}: ${cat.passed}/${cat.totalAttempts} (${cat.successRate}) - ${cat.status}`);
    });

    console.log('\n🎯 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => {
      console.log(`   • ${rec}`);
    });

    console.log(`\n💾 Detailed report saved: ${reportPath}`);
  }
}

// Main execution
async function runSystematicTesting() {
  const tracker = new SystematicTestTracker();
  
  try {
    const report = await tracker.runSystematicValidation();
    await tracker.saveAndPrintReport(report);
    
  } catch (error) {
    console.error('❌ Systematic testing failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { SystematicTestTracker };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSystematicTesting();
} 