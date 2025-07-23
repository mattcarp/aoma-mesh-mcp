import { chromium } from 'playwright';
import fs from 'fs';

// CRITICAL BUG INVESTIGATION: Ticket Creation Timeouts
// This is potentially the MOST CRITICAL finding of our entire testing effort

interface TicketCreationAttempt {
  attemptNumber: number;
  startTime: string;
  duration: number;
  success: boolean;
  failurePoint: string;
  errorDetails: string;
  screenshots: string[];
  networkActivity: any[];
  browserLogs: string[];
}

interface CriticalTicketCreationReport {
  testType: 'CRITICAL-BUG-INVESTIGATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  summary: string;
  attempts: TicketCreationAttempt[];
  analysis: {
    consistentFailure: boolean;
    averageTimeoutDuration: number;
    suspectedCause: string;
    businessImpact: string;
    recommendedAction: string;
  };
  evidence: {
    screenshots: string[];
    networkLogs: any[];
    browserErrors: string[];
  };
}

class CriticalTicketCreationTester {
  private sessionData: any = null;
  private attempts: TicketCreationAttempt[] = [];

  async loadSession(): Promise<any> {
    try {
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

  async investigateCriticalTicketCreationBug(): Promise<CriticalTicketCreationReport> {
    console.log('🚨 CRITICAL BUG INVESTIGATION: TICKET CREATION TIMEOUTS');
    console.log('=========================================================');
    console.log('🎯 TESTING IF JIRA CORE FUNCTIONALITY IS BROKEN');
    console.log('⚠️  This could be a SYSTEM-BREAKING bug!');
    console.log('=========================================================');
    
    await this.loadSession();
    
    // Run multiple attempts to confirm consistency
    for (let i = 1; i <= 3; i++) {
      console.log(`\n🔍 ATTEMPT ${i}/3: Testing ticket creation`);
      await this.attemptTicketCreation(i);
      
      // Wait between attempts
      if (i < 3) {
        console.log('⏳ Waiting 30 seconds before next attempt...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    const report = this.generateCriticalBugReport();
    await this.saveCriticalReport(report);
    
    return report;
  }

  private async attemptTicketCreation(attemptNumber: number): Promise<void> {
    const attempt: TicketCreationAttempt = {
      attemptNumber,
      startTime: new Date().toISOString(),
      duration: 0,
      success: false,
      failurePoint: '',
      errorDetails: '',
      screenshots: [],
      networkActivity: [],
      browserLogs: []
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

      // Restore session
      if (this.sessionData.cookies) {
        await context.addCookies(this.sessionData.cookies);
      }

      const page = await context.newPage();

      // Capture console logs
      page.on('console', msg => {
        attempt.browserLogs.push(`${msg.type()}: ${msg.text()}`);
      });

      // Monitor network activity
      page.on('request', request => {
        attempt.networkActivity.push({
          type: 'request',
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      });

      page.on('response', response => {
        attempt.networkActivity.push({
          type: 'response',
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        });
      });

      console.log(`   📍 Step 1: Navigate to JIRA`);
      try {
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const screenshot1 = `critical-ticket-attempt-${attemptNumber}-step1-${Date.now()}.png`;
        await page.screenshot({ path: screenshot1, fullPage: true });
        attempt.screenshots.push(screenshot1);
        
      } catch (error) {
        attempt.failurePoint = 'Navigation to JIRA dashboard';
        attempt.errorDetails = error.message;
        throw error;
      }

      console.log(`   📍 Step 2: Click Create Button`);
      try {
        // Multiple strategies to find Create button
        const createSelectors = [
          'text=Create',
          '#create_link',
          '.aui-button[href*="CreateIssue"]',
          '[data-testid="create-button"]',
          'a[title="Create Issue"]'
        ];

                 let createButton: any = null;
         for (const selector of createSelectors) {
           try {
             console.log(`      🔍 Trying selector: ${selector}`);
             createButton = page.locator(selector).first();
             if (await createButton.isVisible({ timeout: 5000 })) {
               console.log(`      ✅ Found Create button with: ${selector}`);
               break;
             }
           } catch (e) {
             console.log(`      ❌ Selector failed: ${selector}`);
             createButton = null;
           }
         }

         if (!createButton || !await createButton.isVisible()) {
           throw new Error('Create button not found with any selector');
         }

         await createButton.click();
        console.log(`   ✅ Clicked Create button`);
        
        const screenshot2 = `critical-ticket-attempt-${attemptNumber}-step2-${Date.now()}.png`;
        await page.screenshot({ path: screenshot2, fullPage: true });
        attempt.screenshots.push(screenshot2);
        
      } catch (error) {
        attempt.failurePoint = 'Clicking Create button';
        attempt.errorDetails = error.message;
        throw error;
      }

      console.log(`   📍 Step 3: Wait for Create Dialog (60s timeout)`);
      try {
        // Wait for create dialog with extended timeout
        const dialogSelectors = [
          '#create-issue-dialog',
          '.aui-dialog',
          '#issue-create',
          '[data-testid="create-issue-modal"]',
          '.create-issue-form'
        ];

        let dialogFound = false;
        for (const selector of dialogSelectors) {
          try {
            console.log(`      🔍 Waiting for dialog: ${selector}`);
            await page.waitForSelector(selector, { timeout: 60000 });
            console.log(`      ✅ Create dialog appeared: ${selector}`);
            dialogFound = true;
            break;
          } catch (e) {
            console.log(`      ❌ Dialog selector timeout: ${selector}`);
          }
        }

        if (!dialogFound) {
          throw new Error('Create dialog never appeared - 60 second timeout');
        }
        
        const screenshot3 = `critical-ticket-attempt-${attemptNumber}-step3-${Date.now()}.png`;
        await page.screenshot({ path: screenshot3, fullPage: true });
        attempt.screenshots.push(screenshot3);
        
      } catch (error) {
        attempt.failurePoint = 'Create dialog timeout';
        attempt.errorDetails = error.message;
        throw error;
      }

      console.log(`   📍 Step 4: Fill Ticket Form`);
      try {
        // Fill the minimum required fields
        
        // Project selection (should default to ITSM)
        const projectField = page.locator('#project-field');
        if (await projectField.isVisible({ timeout: 5000 })) {
          console.log(`      📝 Project field found`);
        }

        // Issue Type
        const issueTypeField = page.locator('#issuetype-field');
        if (await issueTypeField.isVisible({ timeout: 5000 })) {
          await issueTypeField.click();
          await page.waitForTimeout(1000);
          
          // Try to select Task or Bug
          const taskOption = page.locator('text=Task').first();
          if (await taskOption.isVisible({ timeout: 5000 })) {
            await taskOption.click();
            console.log(`      ✅ Selected issue type: Task`);
          }
        }

        // Summary (Required)
        const summaryField = page.locator('#summary');
        if (await summaryField.isVisible({ timeout: 5000 })) {
          await summaryField.fill('CRITICAL BUG TEST - Ticket Creation Timeout Investigation');
          console.log(`      ✅ Filled summary field`);
        } else {
          throw new Error('Summary field not found or not visible');
        }

        const screenshot4 = `critical-ticket-attempt-${attemptNumber}-step4-${Date.now()}.png`;
        await page.screenshot({ path: screenshot4, fullPage: true });
        attempt.screenshots.push(screenshot4);
        
      } catch (error) {
        attempt.failurePoint = 'Filling ticket form';
        attempt.errorDetails = error.message;
        throw error;
      }

      console.log(`   📍 Step 5: Submit Ticket (60s timeout)`);
      try {
        const submitSelectors = [
          '#create-issue-submit',
          'button[type="submit"]',
          'input[type="submit"]',
          'text=Create',
          '.aui-button-primary'
        ];

                 let submitButton: any = null;
         for (const selector of submitSelectors) {
           try {
             submitButton = page.locator(selector).first();
             if (await submitButton.isVisible({ timeout: 5000 })) {
               console.log(`      ✅ Found submit button: ${selector}`);
               break;
             }
           } catch (e) {
             submitButton = null;
           }
         }

         if (!submitButton || !await submitButton.isVisible()) {
           throw new Error('Submit button not found');
         }

         console.log(`      🚀 Clicking submit button...`);
         await submitButton.click();
        
        // Wait for ticket creation with extended timeout
        console.log(`      ⏳ Waiting for ticket creation (60s timeout)...`);
        
        // Wait for either success or timeout
        try {
          await Promise.race([
            page.waitForURL(/\/browse\/ITSM-/, { timeout: 60000 }),
            page.waitForSelector('.issue-header', { timeout: 60000 }),
            page.waitForSelector('[data-testid="issue.views.issue-base.foundation.summary.heading"]', { timeout: 60000 })
          ]);
          
          console.log(`      🎉 TICKET CREATION SUCCESSFUL!`);
          attempt.success = true;
          
          const screenshot5 = `critical-ticket-attempt-${attemptNumber}-SUCCESS-${Date.now()}.png`;
          await page.screenshot({ path: screenshot5, fullPage: true });
          attempt.screenshots.push(screenshot5);
          
        } catch (timeoutError) {
          throw new Error(`Ticket creation timeout - 60 seconds exceeded: ${timeoutError.message}`);
        }
        
      } catch (error) {
        attempt.failurePoint = 'Ticket creation/submission';
        attempt.errorDetails = error.message;
        throw error;
      }

    } catch (error) {
      console.log(`   ❌ ATTEMPT ${attemptNumber} FAILED: ${error.message}`);
      attempt.errorDetails = error.message;
      
             // Take final screenshot of failure state
       try {
         const pages = await browser.contexts();
         if (pages.length > 0) {
           const pageList = await pages[0].pages();
           if (pageList.length > 0) {
             const failureScreenshot = `critical-ticket-attempt-${attemptNumber}-FAILURE-${Date.now()}.png`;
             await pageList[0].screenshot({ path: failureScreenshot, fullPage: true });
             attempt.screenshots.push(failureScreenshot);
           }
         }
       } catch (screenshotError) {
         console.log(`   ⚠️ Could not capture failure screenshot: ${screenshotError.message}`);
       }
      
    } finally {
      attempt.duration = Date.now() - startTime;
      this.attempts.push(attempt);
      await browser.close();
    }
  }

  private generateCriticalBugReport(): CriticalTicketCreationReport {
    const successfulAttempts = this.attempts.filter(a => a.success);
    const failedAttempts = this.attempts.filter(a => !a.success);
    const averageTimeoutDuration = failedAttempts.length > 0 
      ? failedAttempts.reduce((sum, a) => sum + a.duration, 0) / failedAttempts.length 
      : 0;

    let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'CRITICAL';
    let summary = '';
    let businessImpact = '';
    let recommendedAction = '';
    let suspectedCause = '';

    if (successfulAttempts.length === 0) {
      severity = 'CRITICAL';
      summary = `CRITICAL BUG: Ticket creation consistently fails with timeouts across ${this.attempts.length} attempts`;
      businessImpact = 'SYSTEM BREAKING: Users cannot create tickets - core JIRA functionality is non-functional';
      recommendedAction = 'IMMEDIATE ESCALATION: Do not proceed with JIRA upgrade until this is resolved';
      suspectedCause = 'Application performance degradation, database timeouts, or critical system component failure';
    } else if (successfulAttempts.length < this.attempts.length) {
      severity = 'HIGH';
      summary = `HIGH SEVERITY: Ticket creation intermittently fails (${successfulAttempts.length}/${this.attempts.length} success rate)`;
      businessImpact = 'MAJOR IMPACT: Unreliable ticket creation will severely impact user productivity';
      recommendedAction = 'URGENT INVESTIGATION: Identify root cause before upgrade deployment';
      suspectedCause = 'Performance bottlenecks or intermittent system issues affecting form submission';
    } else {
      severity = 'MEDIUM';
      summary = `Ticket creation successful but with concerning performance (average: ${Math.round(averageTimeoutDuration/1000)}s)`;
      businessImpact = 'MODERATE IMPACT: Slow ticket creation may affect user experience';
      recommendedAction = 'MONITOR: Performance optimization recommended';
      suspectedCause = 'Performance bottlenecks identified in earlier testing (9.8s page loads, 17s JS execution)';
    }

    const allScreenshots = this.attempts.flatMap(a => a.screenshots);
    const allNetworkLogs = this.attempts.flatMap(a => a.networkActivity);
    const allBrowserErrors = this.attempts.flatMap(a => a.browserLogs);

    return {
      testType: 'CRITICAL-BUG-INVESTIGATION',
      severity,
      summary,
      attempts: this.attempts,
      analysis: {
        consistentFailure: successfulAttempts.length === 0,
        averageTimeoutDuration,
        suspectedCause,
        businessImpact,
        recommendedAction
      },
      evidence: {
        screenshots: allScreenshots,
        networkLogs: allNetworkLogs,
        browserErrors: allBrowserErrors
      }
    };
  }

  private async saveCriticalReport(report: CriticalTicketCreationReport): Promise<void> {
    const reportPath = `CRITICAL-TICKET-CREATION-BUG-REPORT-${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n🚨 CRITICAL BUG REPORT SAVED: ${reportPath}`);

    // Also create a markdown summary for immediate reading
    const mdPath = `CRITICAL-TICKET-CREATION-BUG-SUMMARY-${Date.now()}.md`;
    const mdContent = `# 🚨 CRITICAL BUG INVESTIGATION: TICKET CREATION TIMEOUTS

## SEVERITY: ${report.severity}

## SUMMARY
${report.summary}

## BUSINESS IMPACT
${report.analysis.businessImpact}

## RECOMMENDED ACTION
${report.analysis.recommendedAction}

## TEST RESULTS
- **Total Attempts:** ${report.attempts.length}
- **Successful:** ${report.attempts.filter(a => a.success).length}
- **Failed:** ${report.attempts.filter(a => !a.success).length}
- **Average Timeout Duration:** ${Math.round(report.analysis.averageTimeoutDuration / 1000)}s

## FAILURE POINTS
${report.attempts.filter(a => !a.success).map(a => 
  `- **Attempt ${a.attemptNumber}:** ${a.failurePoint} - ${a.errorDetails}`
).join('\n')}

## EVIDENCE
- **Screenshots:** ${report.evidence.screenshots.length} captured
- **Network Logs:** ${report.evidence.networkLogs.length} entries
- **Browser Errors:** ${report.evidence.browserErrors.length} logged

## SUSPECTED CAUSE
${report.analysis.suspectedCause}

---
*This is a CRITICAL finding that could block the JIRA upgrade deployment.*
`;

    fs.writeFileSync(mdPath, mdContent);
    console.log(`📋 CRITICAL BUG SUMMARY: ${mdPath}`);
  }

  async printCriticalSummary(report: CriticalTicketCreationReport): Promise<void> {
    console.log('\n🚨 CRITICAL TICKET CREATION BUG INVESTIGATION COMPLETE');
    console.log('=======================================================');
    console.log(`🎯 SEVERITY: ${report.severity}`);
    console.log(`📊 SUCCESS RATE: ${report.attempts.filter(a => a.success).length}/${report.attempts.length}`);
    console.log(`⏱️ AVERAGE TIMEOUT: ${Math.round(report.analysis.averageTimeoutDuration / 1000)}s`);
    console.log(`🔍 CONSISTENT FAILURE: ${report.analysis.consistentFailure ? 'YES' : 'NO'}`);
    
    console.log('\n💥 BUSINESS IMPACT:');
    console.log(`   ${report.analysis.businessImpact}`);
    
    console.log('\n🎯 RECOMMENDED ACTION:');
    console.log(`   ${report.analysis.recommendedAction}`);
    
    console.log('\n📋 FAILURE BREAKDOWN:');
    report.attempts.forEach(attempt => {
      const status = attempt.success ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`   Attempt ${attempt.attemptNumber}: ${status} (${Math.round(attempt.duration/1000)}s)`);
      if (!attempt.success) {
        console.log(`      Failure Point: ${attempt.failurePoint}`);
        console.log(`      Error: ${attempt.errorDetails.substring(0, 100)}...`);
      }
    });
    
    console.log('=======================================================');
  }
}

// Main execution function
async function investigateCriticalTicketCreationBug() {
  const tester = new CriticalTicketCreationTester();
  
  try {
    console.log('🚨 STARTING CRITICAL BUG INVESTIGATION...');
    console.log('This could be the most important finding of our entire testing effort!');
    
    const report = await tester.investigateCriticalTicketCreationBug();
    await tester.printCriticalSummary(report);
    
    if (report.severity === 'CRITICAL') {
      console.log('\n💥 CRITICAL BUG CONFIRMED - ESCALATE IMMEDIATELY!');
      console.log('🚨 DO NOT PROCEED WITH JIRA UPGRADE UNTIL RESOLVED!');
    }
    
  } catch (error) {
    console.error('❌ Critical bug investigation failed:', error);
    process.exit(1);
  }
}

// Export for use as module
export { CriticalTicketCreationTester, CriticalTicketCreationReport };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  investigateCriticalTicketCreationBug();
} 