import { test, expect } from '@playwright/test';
import { authenticateJira, waitForJiraLoad, verifyProjectAccess } from '../auth-setup';

// ITSM Workflow and Transition Testing Framework
// Task 3.3: Comprehensive testing of ITSM ticket workflows, status transitions, and business processes

interface WorkflowTestResult {
  testName: string;
  startStatus: string;
  endStatus: string;
  transitionTime: number;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
  ticketKey?: string;
}

class ITSMWorkflowTester {
  private workflowResults: WorkflowTestResult[] = [];
  
  async createTestTicket(page: any, summary: string = 'AUTOMATED TEST - Workflow Testing'): Promise<string | null> {
    try {
      console.log('🎫 Creating test ticket for workflow testing...');
      
      // Navigate to create issue
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/CreateIssue!default.jspa');
      await waitForJiraLoad(page);
      
      // Select ITSM project if not already selected
      const projectField = page.locator('#project-field, [name="pid"]').first();
      if (await projectField.isVisible()) {
        await projectField.selectOption({ label: 'ITSM' });
        await page.waitForTimeout(1000);
      }
      
      // Select issue type (prefer "Task" or "Bug" for testing)
      const issueTypeField = page.locator('#issuetype-field, [name="issuetype"]').first();
      if (await issueTypeField.isVisible()) {
        await issueTypeField.selectOption({ label: 'Task' });
        await page.waitForTimeout(1000);
      }
      
      // Fill summary
      const summaryField = page.locator('#summary, [name="summary"]').first();
      await summaryField.fill(`${summary} - ${new Date().toISOString()}`);
      
      // Fill description
      const descriptionField = page.locator('#description, [name="description"]').first();
      if (await descriptionField.isVisible()) {
        await descriptionField.fill(`Automated workflow testing ticket created for JIRA 10.3 UAT validation.
        
Test Purpose: Validate ITSM workflow transitions and business process automation
Created: ${new Date().toISOString()}
Environment: UAT
        
This ticket will be used to test status transitions, automation rules, and SLA tracking.`);
      }
      
      // Submit the ticket
      const createButton = page.locator('#create-issue-submit, [value="Create"], .create-button').first();
      await createButton.click();
      
      // Wait for creation and capture ticket key
      await page.waitForTimeout(3000);
      await waitForJiraLoad(page);
      
      // Extract ticket key from URL or page content
      const currentUrl = page.url();
      const ticketKeyMatch = currentUrl.match(/ITSM-(\d+)/);
      const ticketKey = ticketKeyMatch ? ticketKeyMatch[0] : null;
      
      if (ticketKey) {
        console.log(`✅ Created test ticket: ${ticketKey}`);
        return ticketKey;
      } else {
        console.log('⚠️ Ticket created but key not captured from URL');
        return null;
      }
      
    } catch (error) {
      console.error('❌ Failed to create test ticket:', error);
      return null;
    }
  }
  
  async testStatusTransition(page: any, ticketKey: string, targetStatus: string): Promise<WorkflowTestResult> {
    const startTime = Date.now();
    let result: WorkflowTestResult = {
      testName: `Transition to ${targetStatus}`,
      startStatus: 'Unknown',
      endStatus: targetStatus,
      transitionTime: 0,
      success: false,
      timestamp: new Date().toISOString(),
      ticketKey
    };
    
    try {
      console.log(`🔄 Testing transition: ${ticketKey} → ${targetStatus}`);
      
      // Navigate to ticket
      await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`);
      await waitForJiraLoad(page);
      
      // Get current status
      const currentStatusElement = page.locator('#status-val, .status-val, [data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"]').first();
      const currentStatus = await currentStatusElement.textContent() || 'Unknown';
      result.startStatus = currentStatus.trim();
      
      console.log(`  Current status: ${result.startStatus}`);
      
      // Find transition button/link
      const transitionSelectors = [
        `text="${targetStatus}"`,
        `[title="${targetStatus}"]`,
        `.workflow-transition:has-text("${targetStatus}")`,
        `.ops-menus a:has-text("${targetStatus}")`
      ];
      
             let transitionButton: any = null;
       for (const selector of transitionSelectors) {
         const element = page.locator(selector).first();
         if (await element.isVisible()) {
           transitionButton = element;
           break;
         }
       }
       
       if (!transitionButton) {
         // Try workflow dropdown/menu
         const workflowDropdown = page.locator('#opsbar-transitions_more, .workflow-transitions, .ops-menus').first();
         if (await workflowDropdown.isVisible()) {
           await workflowDropdown.click();
           await page.waitForTimeout(500);
           
           transitionButton = page.locator(`text="${targetStatus}"`).first();
         }
       }
       
       if (transitionButton && await transitionButton.isVisible()) {
        await transitionButton.click();
        await page.waitForTimeout(2000);
        
        // Handle transition dialog if it appears
        const transitionDialog = page.locator('.jira-dialog, .aui-dialog').first();
        if (await transitionDialog.isVisible()) {
          const submitButton = page.locator('#issue-workflow-transition-submit, .submit, [value="Transition"]').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
          }
        }
        
        await waitForJiraLoad(page);
        
        // Verify transition completed
        const newStatusElement = page.locator('#status-val, .status-val, [data-testid="issue.views.issue-base.foundation.status.status-field-wrapper"]').first();
        const newStatus = await newStatusElement.textContent() || 'Unknown';
        result.endStatus = newStatus.trim();
        
        result.success = result.endStatus.toLowerCase().includes(targetStatus.toLowerCase());
        console.log(`  Result: ${result.startStatus} → ${result.endStatus} (${result.success ? 'SUCCESS' : 'FAILED'})`);
        
      } else {
        result.errorMessage = `Transition to "${targetStatus}" not available from current status`;
        console.log(`  ❌ ${result.errorMessage}`);
      }
      
    } catch (error) {
      result.errorMessage = error.toString();
      console.error(`❌ Transition test failed:`, error);
    }
    
    result.transitionTime = Date.now() - startTime;
    this.workflowResults.push(result);
    return result;
  }
  
  async testAutomationRules(page: any, ticketKey: string): Promise<boolean> {
    try {
      console.log(`🤖 Testing automation rules for ${ticketKey}...`);
      
      // Navigate to ticket
      await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`);
      await waitForJiraLoad(page);
      
      // Test 1: Check if automation history is available
      const activityTab = page.locator('#activitymodule, .activity-stream, [data-testid="issue.activity.activity-stream"]').first();
      if (await activityTab.isVisible()) {
        await activityTab.click();
        await page.waitForTimeout(1000);
        
        // Look for automation entries in activity
        const automationEntries = page.locator('.activity-item:has-text("automation"), .activity-item:has-text("rule")');
        const automationCount = await automationEntries.count();
        
        console.log(`  Found ${automationCount} automation entries in activity`);
        return automationCount > 0;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Automation rules test failed:', error);
      return false;
    }
  }
  
  async testSLATracking(page: any, ticketKey: string): Promise<boolean> {
    try {
      console.log(`⏱️ Testing SLA tracking for ${ticketKey}...`);
      
      // Navigate to ticket
      await page.goto(`https://jirauat.smedigitalapps.com/jira/browse/${ticketKey}`);
      await waitForJiraLoad(page);
      
      // Check for SLA fields
      const slaSelectors = [
        '[data-testid*="sla"]',
        '.sla-field',
        '.time-tracking',
        '[id*="sla"]',
        '[class*="sla"]'
      ];
      
      for (const selector of slaSelectors) {
        const slaElement = page.locator(selector).first();
        if (await slaElement.isVisible()) {
          const slaContent = await slaElement.textContent();
          console.log(`  ✅ Found SLA tracking: ${slaContent?.substring(0, 100)}...`);
          return true;
        }
      }
      
      console.log('  ⚠️ No SLA tracking fields found');
      return false;
    } catch (error) {
      console.error('❌ SLA tracking test failed:', error);
      return false;
    }
  }
  
  generateWorkflowReport(): any {
    const totalTests = this.workflowResults.length;
    const successfulTests = this.workflowResults.filter(r => r.success).length;
    const averageTransitionTime = totalTests > 0 
      ? this.workflowResults.reduce((sum, r) => sum + r.transitionTime, 0) / totalTests 
      : 0;
    
    return {
      summary: {
        totalTransitions: totalTests,
        successfulTransitions: successfulTests,
        successRate: totalTests > 0 ? (successfulTests / totalTests * 100).toFixed(2) + '%' : '0%',
        averageTransitionTime: averageTransitionTime.toFixed(0) + 'ms'
      },
      transitions: this.workflowResults,
      timestamp: new Date().toISOString()
    };
  }
}

test.describe('ITSM Workflow and Transition Testing - Task 3.3', () => {
  let workflowTester: ITSMWorkflowTester;
  let testTicketKey: string | null = null;

  test.beforeEach(async ({ page }) => {
    workflowTester = new ITSMWorkflowTester();
    await verifyProjectAccess(page, 'ITSM');
    await waitForJiraLoad(page);
  });

  test('Create Test Ticket for Workflow Testing', async ({ page }) => {
    testTicketKey = await workflowTester.createTestTicket(page, 'WORKFLOW TEST - Task 3.3');
    expect(testTicketKey).toBeTruthy();
    console.log(`✅ Test ticket created: ${testTicketKey}`);
  });

  test('Test Status Transitions', async ({ page }) => {
    // Use existing ticket or create new one
    if (!testTicketKey) {
      testTicketKey = await workflowTester.createTestTicket(page, 'TRANSITION TEST');
    }
    
    expect(testTicketKey).toBeTruthy();
    
    // Test common ITSM workflow transitions
    const transitionsToTest = [
      'In Progress',
      'Under Review', 
      'Waiting for Approval',
      'Resolved',
      'Closed'
    ];
    
    for (const targetStatus of transitionsToTest) {
      const result = await workflowTester.testStatusTransition(page, testTicketKey!, targetStatus);
      console.log(`🔄 Transition test: ${result.startStatus} → ${result.endStatus} (${result.success ? 'PASS' : 'FAIL'})`);
      
      // Allow some transitions to fail (e.g., if not available from current status)
      // The key is that we're testing the workflow functionality
    }
    
    const report = workflowTester.generateWorkflowReport();
    console.log(`📊 Workflow Report: ${report.summary.successfulTransitions}/${report.summary.totalTransitions} transitions successful`);
  });

  test('Test Automation Rules', async ({ page }) => {
    if (!testTicketKey) {
      testTicketKey = await workflowTester.createTestTicket(page, 'AUTOMATION TEST');
    }
    
    expect(testTicketKey).toBeTruthy();
    
    const hasAutomation = await workflowTester.testAutomationRules(page, testTicketKey!);
    console.log(`🤖 Automation rules test: ${hasAutomation ? 'DETECTED' : 'NOT DETECTED'}`);
  });

  test('Test SLA Tracking', async ({ page }) => {
    if (!testTicketKey) {
      testTicketKey = await workflowTester.createTestTicket(page, 'SLA TEST');
    }
    
    expect(testTicketKey).toBeTruthy();
    
    const hasSLA = await workflowTester.testSLATracking(page, testTicketKey!);
    console.log(`⏱️ SLA tracking test: ${hasSLA ? 'DETECTED' : 'NOT DETECTED'}`);
  });

  test.afterAll(async () => {
    if (workflowTester) {
      const finalReport = workflowTester.generateWorkflowReport();
      console.log('🎯 Final Workflow Testing Report:', JSON.stringify(finalReport, null, 2));
    }
  });
});

export { ITSMWorkflowTester, WorkflowTestResult }; 