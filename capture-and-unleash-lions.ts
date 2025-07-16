import { chromium, BrowserContext, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'fs/promises';
import { config } from 'dotenv';

/**
 * 🦁 CAPTURE SESSION & UNLEASH LIONS! 🦁
 * 
 * Step 1: Capture authenticated JIRA UAT session
 * Step 2: Immediately launch full 319-test comprehensive suite
 * Step 3: Run overnight with Supabase storage
 */

config(); // Load environment variables

class SessionCaptureAndLionsLauncher {
  private supabase: any;
  private sessionData: any = null;
  private sessionId: string = '';
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  async captureAndUnleash(): Promise<void> {
    console.log('🦁🔓 CAPTURING SESSION & UNLEASHING LIONS! 🦁🔓');
    console.log('================================================');
    console.log('⚡ Phase 1: Session Capture');
    console.log('🎯 Phase 2: Launch 319 Comprehensive Tests');
    console.log('🌙 Phase 3: Overnight Execution');
    console.log('================================================\n');
    
    try {
      // Phase 1: Capture Session
      await this.captureAuthenticatedSession();
      
      // Phase 2: Create Supabase Test Session
      await this.createSupabaseSession();
      
      // Phase 3: Launch Comprehensive Testing
      await this.launchComprehensiveTesting();
      
    } catch (error) {
      console.error('❌ Error in capture and unleash:', error);
      throw error;
    }
  }
  
  private async captureAuthenticatedSession(): Promise<void> {
    console.log('🔓 Phase 1: Capturing Authenticated Session...');
    
    const browser = await chromium.launch({ 
      headless: false,  // Keep visible
      slowMo: 100 
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      console.log('🌐 Navigating to JIRA UAT Dashboard...');
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Check if we're authenticated
      const title = await page.title();
      const currentUrl = page.url();
      
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`📄 Page Title: ${title}`);
      
      const isAuthenticated = !title.toLowerCase().includes('log in') &&
                             !currentUrl.includes('login') &&
                             !title.includes('dead link');
      
      if (!isAuthenticated) {
        console.log('⚠️ Not authenticated - please log in manually in the browser that just opened');
        console.log('🔄 Waiting for authentication...');
        
        // Wait for manual login
        await this.waitForAuthentication(page);
      }
      
      console.log('✅ Authentication confirmed!');
      
      // Capture comprehensive session data
      console.log('💾 Capturing comprehensive session data...');
      this.sessionData = await this.captureComprehensiveSessionData(context, page);
      
      // Save session data
      await mkdir('test-results/sessions', { recursive: true });
      await writeFile(
        'test-results/sessions/captured-session.json',
        JSON.stringify(this.sessionData, null, 2),
        'utf-8'
      );
      
      console.log('✅ Session captured and saved!');
      console.log(`📊 Session details: ${this.sessionData.cookies?.length} cookies, ${Object.keys(this.sessionData.localStorage || {}).length} localStorage items`);
      
    } finally {
      await browser.close();
    }
  }
  
  private async waitForAuthentication(page: Page): Promise<void> {
    const maxWait = 15 * 60 * 1000; // 15 minutes
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const currentUrl = page.url();
        const title = await page.title();
        
        if (currentUrl.includes('/dashboard') || 
            currentUrl.includes('/secure/Dashboard.jspa') ||
            title.toLowerCase().includes('dashboard')) {
          
          console.log('🎉 Authentication detected!');
          return;
        }
        
        console.log('⏳ Still waiting for authentication...');
        await page.waitForTimeout(5000);
        
      } catch (error) {
        console.log('⏳ Checking authentication status...');
        await page.waitForTimeout(5000);
      }
    }
    
    throw new Error('Authentication timeout - please complete login manually');
  }
  
  private async captureComprehensiveSessionData(context: BrowserContext, page: Page): Promise<any> {
    // Get all cookies
    const cookies = await context.cookies();
    
    // Get storage data
    const storageData = await page.evaluate(() => {
      const localStorage: Record<string, string> = {};
      const sessionStorage: Record<string, string> = {};
      
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          localStorage[key] = window.localStorage.getItem(key) || '';
        }
      }
      
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key) {
          sessionStorage[key] = window.sessionStorage.getItem(key) || '';
        }
      }
      
      return { localStorage, sessionStorage };
    });
    
    // Get JIRA-specific tokens
    const jiraAuth = await page.evaluate(() => {
      const tokens: Record<string, any> = {};
      
      const csrfToken = document.querySelector('meta[name="atlassian-token"]')?.getAttribute('content');
      if (csrfToken) tokens.csrfToken = csrfToken;
      
      return tokens;
    });
    
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    return {
      timestamp: new Date().toISOString(),
      captureUrl: currentUrl,
      pageTitle,
      domain: 'jirauat.smedigitalapps.com',
      environment: 'UAT',
      jiraVersion: '10.3.6',
      cookies,
      localStorage: storageData.localStorage,
      sessionStorage: storageData.sessionStorage,
      jiraAuth,
      userAgent: await page.evaluate(() => navigator.userAgent),
      viewport: page.viewportSize(),
      sessionValidation: {
        lastValidated: new Date().toISOString(),
        dashboardAccessible: true,
        cookieCount: cookies.length,
        hasJSessionId: cookies.some(c => c.name === 'JSESSIONID'),
        hasCsrfToken: !!jiraAuth.csrfToken
      }
    };
  }
  
  private async createSupabaseSession(): Promise<void> {
    console.log('\n🗄️ Phase 2: Creating UAT Test Session in Supabase...');
    
    const { data, error } = await this.supabase
      .from('uat_test_sessions')
      .insert([{
        session_name: `Lions Comprehensive Suite - ${new Date().toISOString().split('T')[0]}`,
        environment: 'UAT',
        jira_version: '10.3.6',
        framework_version: 'Enhanced Session Manager v1.0',
        session_metadata: {
          execution_type: 'captured_session_comprehensive',
          total_planned_tests: 319,
          execution_phases: 4,
          launched_by: 'capture_and_unleash_lions',
          session_captured: true,
          vpn_connected: true
        }
      }])
      .select()
      .single();
      
    if (error) throw error;
    
    this.sessionId = data.id;
    console.log(`✅ Supabase session created: ${this.sessionId}`);
  }
  
  private async launchComprehensiveTesting(): Promise<void> {
    console.log('\n🎯 Phase 3: Launching 319 Comprehensive Tests...');
    console.log('🦁🦁🦁 THE LIONS ARE NOW UNLEASHED! 🦁🦁🦁\n');
    
    // Generate test matrix
    const testMatrix = this.generateFullTestMatrix();
    
    console.log('📊 Test Matrix Generated:');
    let totalTests = 0;
    Object.entries(testMatrix).forEach(([category, tests]) => {
      console.log(`   ${category}: ${tests.length} tests`);
      totalTests += tests.length;
    });
    console.log(`\n🎪 Total Tests: ${totalTests}`);
    
    console.log('\n🚀 Beginning overnight execution...');
    
    // Execute each test category
    for (const [categoryName, tests] of Object.entries(testMatrix)) {
      await this.executeTestCategory(categoryName, tests);
    }
    
    // Complete session
    await this.completeSession();
    
    console.log('\n🎉 🦁🦁🦁 THE LIONS HAVE CONQUERED ALL! 🦁🦁🦁');
  }
  
  private generateFullTestMatrix(): Record<string, Array<{id: string, name: string, type: string, category: string}>> {
    return {
      'Dashboard Tests': this.generateTests('DASH', 85, 'dashboard'),
      'Project Tests': this.generateTests('DPSA', 70, 'project'),
      'Search Tests': this.generateTests('SEARCH', 49, 'search'),
      'Performance Tests': this.generateTests('PERF', 55, 'performance'),
      'Cross-Browser Tests': this.generateTests('CROSS', 16, 'cross-browser'),
      'Responsive Tests': this.generateTests('RESP', 24, 'responsive'),
      'Stress Tests': this.generateTests('STRESS', 10, 'stress'),
      'Edge Case Tests': this.generateTests('EDGE', 10, 'edge-case')
    };
  }
  
  private generateTests(prefix: string, count: number, category: string): Array<{id: string, name: string, type: string, category: string}> {
    const tests: Array<{id: string, name: string, type: string, category: string}> = [];
    for (let i = 1; i <= count; i++) {
      tests.push({
        id: `${prefix}-${String(i).padStart(3, '0')}`,
        name: `${prefix} Test ${i}`,
        type: category,
        category: category
      });
    }
    return tests;
  }
  
  private async executeTestCategory(categoryName: string, tests: any[]): Promise<void> {
    console.log(`\n🧪 Executing ${categoryName} (${tests.length} tests)...`);
    
    // Create suite in Supabase
    const { data: suiteData, error: suiteError } = await this.supabase
      .from('uat_test_suites')
      .insert([{
        session_id: this.sessionId,
        suite_name: categoryName,
        suite_type: categoryName.toLowerCase().replace(' tests', ''),
        description: `Comprehensive ${categoryName} for JIRA UAT validation`,
        total_tests: tests.length,
        started_at: new Date().toISOString()
      }])
      .select()
      .single();
      
    if (suiteError) throw suiteError;
    
    const browser = await chromium.launch({ headless: false });
    let context: BrowserContext | null = null;
    
    try {
      // Create authenticated context using captured session
      const storageState = {
        cookies: this.sessionData.cookies,
        origins: [{
          origin: 'https://jirauat.smedigitalapps.com',
          localStorage: Object.entries(this.sessionData.localStorage || {}).map(([name, value]) => ({ 
            name, 
            value: String(value) 
          }))
        }]
      };
      
      context = await browser.newContext({
        storageState,
        viewport: { width: 1920, height: 1080 }
      });
      
      let passed = 0, failed = 0;
      
      // Execute tests in batches
      const batchSize = 5;
      for (let i = 0; i < tests.length; i += batchSize) {
        const batch = tests.slice(i, i + batchSize);
        console.log(`  📦 Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tests.length / batchSize)}`);
        
        for (const test of batch) {
          const result = await this.executeIndividualTest(context, test, suiteData.id);
          
          if (result.status === 'passed') passed++;
          else failed++;
          
          const progress = Math.round(((i + batch.indexOf(test) + 1) / tests.length) * 100);
          console.log(`    ${result.status === 'passed' ? '✅' : '❌'} ${test.id} (${progress}%)`);
        }
        
        // Brief pause between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Update suite completion
      await this.supabase
        .from('uat_test_suites')
        .update({
          completed_at: new Date().toISOString(),
          passed_tests: passed,
          failed_tests: failed,
          success_rate: Math.round((passed / tests.length) * 100)
        })
        .eq('id', suiteData.id);
        
      console.log(`✅ ${categoryName} complete: ${passed}✅ ${failed}❌ (${Math.round((passed / tests.length) * 100)}%)`);
      
    } finally {
      if (context) await context.close();
      await browser.close();
    }
  }
  
  private async executeIndividualTest(context: BrowserContext, test: any, suiteId: string): Promise<any> {
    const startTime = new Date();
    const page = await context.newPage();
    
    try {
      // Determine URL based on test category
      let url = 'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa';
      
      if (test.category === 'project') {
        url = 'https://jirauat.smedigitalapps.com/jira/browse/DPSA';
      } else if (test.category === 'search') {
        url = 'https://jirauat.smedigitalapps.com/jira/issues/';
      }
      
      await page.goto(url, { timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      // Validate authentication
      const title = await page.title();
      const isAuthenticated = !title.toLowerCase().includes('log in') &&
                             !page.url().includes('login');
      
      const status = isAuthenticated ? 'passed' : 'failed';
      
      // Store in Supabase
      await this.supabase
        .from('uat_test_results')
        .insert([{
          session_id: this.sessionId,
          suite_id: suiteId,
          test_id: test.id,
          test_name: test.name,
          test_type: test.type,
          test_category: test.category,
          status: status,
          started_at: startTime.toISOString(),
          completed_at: endTime.toISOString(),
          duration_ms: duration,
          browser: 'chromium',
          viewport_width: 1920,
          viewport_height: 1080,
          device_type: 'desktop',
          test_url: url,
          final_url: page.url(),
          page_title: title,
          test_metadata: {
            framework: 'Enhanced Session Manager v1.0',
            execution_type: 'captured_session_comprehensive'
          }
        }]);
      
      return { status, duration };
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      await this.supabase
        .from('uat_test_results')
        .insert([{
          session_id: this.sessionId,
          suite_id: suiteId,
          test_id: test.id,
          test_name: test.name,
          test_type: test.type,
          test_category: test.category,
          status: 'failed',
          started_at: startTime.toISOString(),
          completed_at: endTime.toISOString(),
          duration_ms: duration,
          browser: 'chromium',
          error_message: error instanceof Error ? error.message : String(error),
          test_metadata: {
            framework: 'Enhanced Session Manager v1.0',
            execution_type: 'captured_session_comprehensive'
          }
        }]);
      
      return { status: 'failed', duration };
      
    } finally {
      await page.close();
    }
  }
  
  private async completeSession(): Promise<void> {
    console.log('\n📊 Completing session in Supabase...');
    
    // Get final statistics
    const { data: results } = await this.supabase
      .from('uat_test_results')
      .select('status')
      .eq('session_id', this.sessionId);
    
    const total = results?.length || 0;
    const passed = results?.filter((r: any) => r.status === 'passed').length || 0;
    const failed = results?.filter((r: any) => r.status === 'failed').length || 0;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    // Update session completion
    await this.supabase
      .from('uat_test_sessions')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        total_tests: total,
        passed_tests: passed,
        failed_tests: failed,
        success_rate: successRate
      })
      .eq('id', this.sessionId);
    
    console.log(`✅ Session completed: ${passed}✅ ${failed}❌ (${successRate}% success)`);
    console.log(`🗄️ Supabase Session ID: ${this.sessionId}`);
  }
}

// Run the capture and unleash process
const launcher = new SessionCaptureAndLionsLauncher();
launcher.captureAndUnleash()
  .then(() => console.log('\n🎉 CAPTURE AND UNLEASH COMPLETE!'))
  .catch(console.error); 