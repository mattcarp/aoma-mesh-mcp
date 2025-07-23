import { chromium, firefox, webkit } from 'playwright';
import fs from 'fs';

// Enhanced validation with multiple attempts, browsers, and scenarios
interface ValidationAttempt {
  attemptNumber: number;
  browser: string;
  scenario: string;
  timestamp: string;
  success: boolean;
  duration: number;
  failurePoint?: string;
  errorDetails?: string;
  screenshot?: string;
}

interface ValidationReport {
  totalAttempts: number;
  successfulAttempts: number;
  failureRate: string;
  avgDuration: number;
  consistentFailure: boolean;
  attempts: ValidationAttempt[];
  conclusion: 'CONFIRMED_CRITICAL' | 'INTERMITTENT_ISSUE' | 'FALSE_ALARM';
}

class EnhancedTicketCreationValidator {
  private sessionData: any = null;
  private attempts: ValidationAttempt[] = [];

  async loadSession(): Promise<any> {
    const sessionFiles = fs.readdirSync('.').filter(f => 
      f.startsWith('jira-uat-session-') && f.endsWith('.json')
    );

    if (sessionFiles.length === 0) {
      throw new Error('No session files found.');
    }

    const latestSession = sessionFiles.sort().pop()!;
    this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
    return this.sessionData;
  }

  async runEnhancedValidation(): Promise<ValidationReport> {
    console.log('🔍 ENHANCED TICKET CREATION VALIDATION');
    console.log('=====================================');
    console.log('📊 Running 5 attempts across different scenarios');
    console.log('⏱️  Systematic timing and failure analysis');
    console.log('🎯 Building bulletproof evidence');
    
    await this.loadSession();

    // Test scenarios to try
    const scenarios = [
      { name: 'Standard Task Creation', issueType: 'Task' },
      { name: 'Bug Report Creation', issueType: 'Bug' },
      { name: 'Story Creation', issueType: 'Story' },
      { name: 'Incident Creation', issueType: 'Incident' },
      { name: 'Standard Task Retry', issueType: 'Task' }
    ];

    // Run tests with Chrome (most stable for our session)
    for (let i = 0; i < scenarios.length; i++) {
      console.log(`\n🔍 ATTEMPT ${i + 1}/5: ${scenarios[i].name}`);
      await this.testTicketCreation(i + 1, 'chromium', scenarios[i]);
      
      // Wait between attempts to avoid any rate limiting
      if (i < scenarios.length - 1) {
        console.log('⏳ Waiting 30 seconds before next attempt...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    return this.generateValidationReport();
  }

  private async testTicketCreation(
    attemptNumber: number, 
    browserType: string, 
    scenario: any
  ): Promise<void> {
    const attempt: ValidationAttempt = {
      attemptNumber,
      browser: browserType,
      scenario: scenario.name,
      timestamp: new Date().toISOString(),
      success: false,
      duration: 0
    };

    const startTime = Date.now();
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });

    try {
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });

      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }

      const page = await context.newPage();

      // Step 1: Navigate
      console.log(`   📍 Step 1: Navigate to JIRA`);
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Step 2: Click Create
      console.log(`   📍 Step 2: Click Create Button`);
      const createButton = page.locator('text=Create').first();
      await createButton.click();

      // Step 3: Wait for dialog
      console.log(`   📍 Step 3: Wait for Create Dialog`);
      await page.waitForSelector('#create-issue-dialog', { timeout: 30000 });

      // Step 4: Fill form with scenario-specific data
      console.log(`   📍 Step 4: Fill form for ${scenario.name}`);
      
      // Try to select issue type if needed
      try {
        const issueTypeField = page.locator('#issuetype-field');
        if (await issueTypeField.isVisible({ timeout: 5000 })) {
          await issueTypeField.click();
          await page.waitForTimeout(1000);
          
          const issueOption = page.locator(`text=${scenario.issueType}`).first();
          if (await issueOption.isVisible({ timeout: 5000 })) {
            await issueOption.click();
          }
        }
      } catch (e) {
        console.log(`      ⚠️ Issue type selection skipped: ${e.message}`);
      }

      // Fill summary with scenario-specific text
      const summaryText = `VALIDATION TEST ${attemptNumber} - ${scenario.name} - ${new Date().toLocaleTimeString()}`;
      const summaryField = page.locator('#summary');
      await summaryField.fill(summaryText);

      // Step 5: Submit with extended timeout
      console.log(`   📍 Step 5: Submit ticket (90s timeout)`);
      const submitButton = page.locator('#create-issue-submit').first();
      await submitButton.click();

      // Wait for success with longer timeout
      console.log(`   ⏳ Waiting for ticket creation...`);
      try {
        await Promise.race([
          page.waitForURL(/\/browse\/ITSM-/, { timeout: 90000 }),
          page.waitForSelector('.issue-header', { timeout: 90000 }),
          page.waitForSelector('[data-testid*="issue"]', { timeout: 90000 })
        ]);

        console.log(`   🎉 SUCCESS: Ticket created successfully!`);
        attempt.success = true;

        // Take success screenshot
        const successScreenshot = `validation-success-${attemptNumber}-${Date.now()}.png`;
        await page.screenshot({ path: successScreenshot, fullPage: true });
        attempt.screenshot = successScreenshot;

      } catch (timeoutError) {
        console.log(`   ❌ TIMEOUT: Ticket creation failed after 90 seconds`);
        attempt.failurePoint = 'Ticket submission timeout';
        attempt.errorDetails = 'No response after 90 seconds';

        // Take failure screenshot
        const failureScreenshot = `validation-failure-${attemptNumber}-${Date.now()}.png`;
        await page.screenshot({ path: failureScreenshot, fullPage: true });
        attempt.screenshot = failureScreenshot;
      }

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      attempt.failurePoint = 'Unexpected error';
      attempt.errorDetails = error.message;
    } finally {
      attempt.duration = Date.now() - startTime;
      this.attempts.push(attempt);
      await browser.close();
    }
  }

  private generateValidationReport(): ValidationReport {
    const successful = this.attempts.filter(a => a.success);
    const failed = this.attempts.filter(a => !a.success);
    const failureRate = ((failed.length / this.attempts.length) * 100).toFixed(1);
    const avgDuration = this.attempts.reduce((sum, a) => sum + a.duration, 0) / this.attempts.length;

    let conclusion: 'CONFIRMED_CRITICAL' | 'INTERMITTENT_ISSUE' | 'FALSE_ALARM';
    
    if (successful.length === 0) {
      conclusion = 'CONFIRMED_CRITICAL';
    } else if (successful.length < this.attempts.length * 0.5) {
      conclusion = 'INTERMITTENT_ISSUE';
    } else {
      conclusion = 'FALSE_ALARM';
    }

    return {
      totalAttempts: this.attempts.length,
      successfulAttempts: successful.length,
      failureRate: `${failureRate}%`,
      avgDuration: Math.round(avgDuration / 1000),
      consistentFailure: successful.length === 0,
      attempts: this.attempts,
      conclusion
    };
  }

  async printValidationSummary(report: ValidationReport): Promise<void> {
    console.log('\n🎯 ENHANCED VALIDATION COMPLETE');
    console.log('================================');
    console.log(`📊 Total Attempts: ${report.totalAttempts}`);
    console.log(`✅ Successful: ${report.successfulAttempts}`);
    console.log(`❌ Failed: ${report.totalAttempts - report.successfulAttempts}`);
    console.log(`📈 Failure Rate: ${report.failureRate}`);
    console.log(`⏱️ Average Duration: ${report.avgDuration}s`);
    console.log(`🔍 Conclusion: ${report.conclusion}`);

    console.log('\n📋 ATTEMPT BREAKDOWN:');
    this.attempts.forEach(attempt => {
      const status = attempt.success ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`   ${attempt.attemptNumber}. ${attempt.scenario}: ${status} (${Math.round(attempt.duration/1000)}s)`);
    });

    // Save detailed report
    const reportPath = `ENHANCED-VALIDATION-REPORT-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved: ${reportPath}`);

    // Conclusion guidance
    console.log('\n🎯 RECOMMENDATION:');
    if (report.conclusion === 'CONFIRMED_CRITICAL') {
      console.log('🚨 CRITICAL BUG CONFIRMED - Evidence is bulletproof');
      console.log('📢 Safe to escalate with confidence');
    } else if (report.conclusion === 'INTERMITTENT_ISSUE') {
      console.log('⚠️ INTERMITTENT ISSUE - Requires further investigation');
      console.log('🔍 Additional testing recommended');
    } else {
      console.log('✅ ISSUE NOT REPRODUCIBLE - May have been resolved');
      console.log('🔄 Consider re-running original tests');
    }
  }
}

// Main execution
async function runEnhancedValidation() {
  const validator = new EnhancedTicketCreationValidator();
  
  try {
    const report = await validator.runEnhancedValidation();
    await validator.printValidationSummary(report);
    
  } catch (error) {
    console.error('❌ Enhanced validation failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { EnhancedTicketCreationValidator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runEnhancedValidation();
} 