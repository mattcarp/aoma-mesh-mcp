import { chromium, Browser, Page } from 'playwright';
import fs from 'fs';

interface TestAttempt {
    attempt: number;
    status: 'SUCCESS' | 'FAILED';
    project?: string;
    ticketNumber?: string;
    submissionTime?: number;
    totalTime: number;
    timestamp: string;
    reason?: string;
    error?: string;
}

interface TestResults {
    timestamp: string;
    testName: string;
    attempts: TestAttempt[];
    overallStatus: string;
    escalationRequired: boolean;
    error?: string;
}

async function criticalTicketCreationRetest(): Promise<TestResults> {
    console.log('🚨 CRITICAL TEST: JIRA Ticket Creation Verification');
    console.log('⏰ Start Time:', new Date().toISOString());
    
    const browser = await chromium.launch({ 
        headless: false, // Show browser so we can see what's happening
        slowMo: 1000 // Slow down actions for better debugging
    });
    
    const page = await browser.newPage();
    
    const results: TestResults = {
        timestamp: new Date().toISOString(),
        testName: 'CRITICAL_TICKET_CREATION_RETEST',
        attempts: [],
        overallStatus: 'UNKNOWN',
        escalationRequired: false
    };
    
    try {
        // Navigate to JIRA UAT
        console.log('🌐 Navigating to JIRA UAT...');
        await page.goto('https://jirauat.smedigitalapps.com');
        
        // Take screenshot of initial state
        await page.screenshot({ path: `critical-retest-step1-${Date.now()}.png` });
        
        // Wait for login or dashboard
        console.log('⏳ Waiting for page load...');
        await page.waitForLoadState('networkidle');
        
        // Check if we're logged in (look for dashboard elements)
        const isLoggedIn = await page.locator('h1:has-text("System Dashboard")').isVisible() || 
                          await page.locator('[data-test-id="global.header.user-menu"]').isVisible() ||
                          await page.locator('text=Create').first().isVisible();
        
        if (!isLoggedIn) {
            console.log('❌ Not logged in - need to authenticate first');
            results.attempts.push({
                attempt: 1,
                status: 'FAILED',
                reason: 'Authentication required',
                totalTime: 0,
                timestamp: new Date().toISOString()
            });
            results.overallStatus = 'AUTH_REQUIRED';
            return results;
        }
        
        console.log('✅ Already authenticated - proceeding with ticket creation test');
        
        // Attempt 1: Standard ticket creation
        console.log('\n🎫 ATTEMPT 1: Standard ITSM Ticket Creation');
        const attempt1 = await attemptTicketCreation(page, 1);
        results.attempts.push(attempt1);
        
        // Attempt 2: Different approach if first failed
        if (attempt1.status === 'FAILED') {
            console.log('\n🎫 ATTEMPT 2: Alternative approach');
            const attempt2 = await attemptTicketCreation(page, 2);
            results.attempts.push(attempt2);
        }
        
        // Attempt 3: DPSA project if others failed
        if (results.attempts.every(a => a.status === 'FAILED')) {
            console.log('\n🎫 ATTEMPT 3: DPSA Project test');
            const attempt3 = await attemptTicketCreation(page, 3, 'DPSA');
            results.attempts.push(attempt3);
        }
        
        // Determine overall status
        const successfulAttempts = results.attempts.filter(a => a.status === 'SUCCESS');
        const failedAttempts = results.attempts.filter(a => a.status === 'FAILED');
        
        if (successfulAttempts.length > 0) {
            results.overallStatus = 'WORKING';
            console.log('✅ TICKET CREATION IS WORKING');
        } else if (failedAttempts.length === results.attempts.length) {
            results.overallStatus = 'COMPLETELY_BROKEN';
            results.escalationRequired = true;
            console.log('🚨 CRITICAL: TICKET CREATION COMPLETELY BROKEN');
            console.log('🚨 ESCALATION REQUIRED: BLOCK PRODUCTION DEPLOYMENT');
        } else {
            results.overallStatus = 'INTERMITTENT';
            results.escalationRequired = true;
            console.log('⚠️ WARNING: INTERMITTENT TICKET CREATION ISSUES');
        }
        
    } catch (error) {
        console.error('💥 Test execution error:', error);
        results.overallStatus = 'ERROR';
        results.escalationRequired = true;
        results.error = error instanceof Error ? error.message : String(error);
    } finally {
        await browser.close();
    }
    
    // Save results
    const filename = `CRITICAL-TICKET-CREATION-RETEST-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(results, null, 2));
    
    console.log('\n📋 Test Complete');
    console.log('⏰ End Time:', new Date().toISOString());
    console.log('📁 Results saved to:', filename);
    
    if (results.escalationRequired) {
        console.log('\n🚨🚨🚨 CRITICAL ESCALATION REQUIRED 🚨🚨🚨');
        console.log('🚨 JIRA TICKET CREATION IS BROKEN');
        console.log('🚨 DO NOT DEPLOY TO PRODUCTION');
        console.log('🚨 CONTACT DEVELOPMENT TEAM IMMEDIATELY');
    }
    
    return results;
}

async function attemptTicketCreation(page: Page, attemptNumber: number, project: string = 'ITSM'): Promise<TestAttempt> {
    const startTime = Date.now();
    
    try {
        console.log(`   📝 Attempt ${attemptNumber}: Creating ${project} ticket...`);
        
        // Look for Create button
        const createButton = page.locator('text=Create').first();
        if (!(await createButton.isVisible())) {
            throw new Error('Create button not found');
        }
        
        // Click Create
        await createButton.click();
        console.log('   ✓ Clicked Create button');
        
        // Wait for create form
        await page.waitForSelector('[name="project"], #project-field', { timeout: 10000 });
        console.log('   ✓ Create form appeared');
        
        // Take screenshot of form
        await page.screenshot({ path: `critical-retest-attempt${attemptNumber}-form-${Date.now()}.png` });
        
        // Select project
        const projectField = page.locator('[name="project"], #project-field').first();
        await projectField.click();
        await page.locator(`text=${project}`).first().click();
        console.log(`   ✓ Selected ${project} project`);
        
        // Wait a moment for project to load
        await page.waitForTimeout(2000);
        
        // Select issue type (Task, Bug, whatever's available)
        const issueTypeField = page.locator('[name="issuetype"], #issuetype-field').first();
        if (await issueTypeField.isVisible()) {
            await issueTypeField.click();
            await page.locator('text=Task, text=Bug, text=Story').first().click();
            console.log('   ✓ Selected issue type');
        }
        
        // Fill summary
        const summaryField = page.locator('[name="summary"], #summary').first();
        const testSummary = `CRITICAL TEST: Ticket Creation Verification ${attemptNumber} - ${new Date().toISOString()}`;
        await summaryField.fill(testSummary);
        console.log('   ✓ Filled summary');
        
        // Fill description if present
        const descriptionField = page.locator('[name="description"], .mce-edit-area iframe').first();
        if (await descriptionField.isVisible()) {
            if (await page.locator('.mce-edit-area iframe').isVisible()) {
                // Rich text editor
                const frame = page.frameLocator('.mce-edit-area iframe');
                await frame.locator('body').fill('This is a critical test to verify ticket creation functionality is working.');
            } else {
                // Plain text
                await descriptionField.fill('This is a critical test to verify ticket creation functionality is working.');
            }
            console.log('   ✓ Filled description');
        }
        
        // Take screenshot before submission
        await page.screenshot({ path: `critical-retest-attempt${attemptNumber}-beforesubmit-${Date.now()}.png` });
        
        // Submit the ticket
        console.log('   🚀 Submitting ticket...');
        const submitButton = page.locator('text=Create, input[type="submit"], button[type="submit"]').first();
        await submitButton.click();
        
        // Wait for either success or timeout
        const submitStartTime = Date.now();
        const TIMEOUT_MS = 90000; // 90 seconds
        
        try {
            // Wait for navigation or success indicator
            await Promise.race([
                page.waitForURL(/\/browse\/.*/, { timeout: TIMEOUT_MS }),
                page.waitForSelector('.issue-header, .issue-key', { timeout: TIMEOUT_MS }),
                page.waitForSelector('text=has been created', { timeout: TIMEOUT_MS })
            ]);
            
            const submitTime = Date.now() - submitStartTime;
            console.log(`   ✅ SUCCESS: Ticket created in ${submitTime}ms`);
            
            // Try to get ticket number
            let ticketNumber = 'Unknown';
            try {
                const ticketKey = await page.locator('.issue-key, [data-issue-key]').first().textContent({ timeout: 5000 });
                if (ticketKey) {
                    ticketNumber = ticketKey.trim();
                }
            } catch (e) {
                // Couldn't get ticket number, but ticket was created
            }
            
            // Take success screenshot
            await page.screenshot({ path: `critical-retest-attempt${attemptNumber}-SUCCESS-${Date.now()}.png` });
            
            return {
                attempt: attemptNumber,
                status: 'SUCCESS',
                project: project,
                ticketNumber: ticketNumber,
                submissionTime: submitTime,
                totalTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };
            
        } catch (timeoutError) {
            const submitTime = Date.now() - submitStartTime;
            console.log(`   ❌ TIMEOUT: Ticket creation timed out after ${submitTime}ms`);
            
            // Take failure screenshot
            await page.screenshot({ path: `critical-retest-attempt${attemptNumber}-TIMEOUT-${Date.now()}.png` });
            
            return {
                attempt: attemptNumber,
                status: 'FAILED',
                project: project,
                reason: 'TIMEOUT',
                submissionTime: submitTime,
                totalTime: Date.now() - startTime,
                timestamp: new Date().toISOString(),
                error: `Timeout after ${submitTime}ms`
            };
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
        
        // Take error screenshot
        await page.screenshot({ path: `critical-retest-attempt${attemptNumber}-ERROR-${Date.now()}.png` });
        
        return {
            attempt: attemptNumber,
            status: 'FAILED',
            project: project,
            reason: 'ERROR',
            totalTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error)
        };
    }
}

// Run the test
criticalTicketCreationRetest()
    .then(results => {
        console.log('\n🎯 FINAL RESULTS:');
        console.log('Status:', results.overallStatus);
        console.log('Escalation Required:', results.escalationRequired);
        console.log('Attempts:', results.attempts.length);
        
        if (results.escalationRequired) {
            process.exit(1); // Exit with error code for automation
        }
    })
    .catch(error => {
        console.error('💥 Critical test failed:', error);
        process.exit(1);
    }); 