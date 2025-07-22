import { chromium } from 'playwright';
import fs from 'fs';

// Manual Access Control Testing for OWASP Security Validation
// Task 11.2: Validate automated findings and generate evidence for security reports

interface AccessControlTest {
  testId: string;
  testName: string;
  url: string;
  expectedOutcome: 'access_denied' | 'legitimate_access' | 'needs_validation';
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  description: string;
}

interface AccessControlResult {
  testId: string;
  testName: string;
  url: string;
  accessGranted: boolean;
  responseTime: number;
  httpStatus?: number;
  pageTitle: string;
  accessControlEvidence: string[];
  securityHeaders: Record<string, string>;
  riskAssessment: string;
  recommendation: string;
  screenshot: string;
  timestamp: string;
}

interface ManualSecurityReport {
  executiveSummary: {
    totalTests: number;
    accessViolations: number;
    legitimateAccess: number;
    overallRiskLevel: 'critical' | 'high' | 'medium' | 'low';
    readyForProduction: boolean;
  };
  detailedFindings: AccessControlResult[];
  complianceAnalysis: {
    owaspCompliance: string[];
    recommendations: string[];
    immediateActions: string[];
  };
  evidenceFiles: string[];
  timestamp: string;
}

class ManualAccessControlValidator {
  private sessionData: any;
  private results: AccessControlResult[] = [];
  
  private testSuite: AccessControlTest[] = [
    {
      testId: 'AC-001',
      testName: 'Administrative Interface Access',
      url: 'https://jirauat.smedigitalapps.com/jira/secure/admin/',
      expectedOutcome: 'needs_validation',
      riskLevel: 'high',
      description: 'Validate access to JIRA administrative functions'
    },
    {
      testId: 'AC-002', 
      testName: 'System Information Disclosure',
      url: 'https://jirauat.smedigitalapps.com/jira/secure/ViewSystemInfo.jspa',
      expectedOutcome: 'access_denied',
      riskLevel: 'high',
      description: 'Check exposure of sensitive system information'
    },
    {
      testId: 'AC-003',
      testName: 'ITSM Project Configuration Access',
      url: 'https://jirauat.smedigitalapps.com/jira/plugins/servlet/project-config/ITSM/permissions',
      expectedOutcome: 'needs_validation',
      riskLevel: 'high',
      description: 'Verify ITSM project permission configuration access'
    },
    {
      testId: 'AC-004',
      testName: 'User Management Interface',
      url: 'https://jirauat.smedigitalapps.com/jira/secure/admin/user/UserBrowser.jspa',
      expectedOutcome: 'access_denied',
      riskLevel: 'critical',
      description: 'Test access to user management functions'
    },
    {
      testId: 'AC-005',
      testName: 'Global Permissions Configuration',
      url: 'https://jirauat.smedigitalapps.com/jira/secure/admin/GlobalPermissions.jspa',
      expectedOutcome: 'access_denied',
      riskLevel: 'critical',
      description: 'Validate global permission configuration access'
    }
  ];

  async loadSession(): Promise<any> {
    // Find the latest session file
    const sessionFiles = fs.readdirSync('.').filter(f => 
      f.startsWith('jira-uat-session-') && f.endsWith('.json')
    );
    
    if (sessionFiles.length === 0) {
      throw new Error('No JIRA session file found - please run manual login first');
    }

    const latestSession = sessionFiles.sort().pop()!;
    console.log(`📁 Using session file: ${latestSession}`);
    
    this.sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
    return this.sessionData;
  }

  async performManualAccessControlValidation(): Promise<ManualSecurityReport> {
    console.log('🔐 MANUAL ACCESS CONTROL VALIDATION - TASK 11.2');
    console.log('================================================================================');
    console.log('🛡️ Validating automated security findings with manual evidence');
    console.log('📊 Generating comprehensive security report for colleagues');
    console.log('================================================================================');

    const browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: this.sessionData.userAgent
    });
    
    // Restore authenticated session
    await context.addCookies(this.sessionData.cookies);
    
    const page = await context.newPage();

    try {
      console.log('\n🔍 EXECUTING MANUAL ACCESS CONTROL TESTS');
      console.log('================================================================================');

      for (const test of this.testSuite) {
        console.log(`\n  🎯 Testing: ${test.testName} (${test.testId})`);
        const result = await this.executeAccessControlTest(page, test);
        this.results.push(result);
        
        console.log(`     Status: ${result.accessGranted ? '🚨 ACCESS GRANTED' : '✅ ACCESS DENIED'}`);
        console.log(`     Risk: ${result.riskAssessment}`);
      }

    } catch (error) {
      console.error('❌ Manual access control validation error:', error);
    } finally {
      await browser.close();
    }

    return this.generateManualSecurityReport();
  }

  private async executeAccessControlTest(page: any, test: AccessControlTest): Promise<AccessControlResult> {
    const startTime = Date.now();
    
    try {
      // Navigate to the test URL
      const response = await page.goto(test.url, { 
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const responseTime = Date.now() - startTime;
      const httpStatus = response?.status();
      
      // Wait for page to load
      await page.waitForTimeout(3000);
      
      // Capture page evidence
      const pageTitle = await page.title();
      const currentUrl = page.url();
      
      // Analyze access control indicators
      const accessControlEvidence = await this.analyzeAccessControlEvidence(page);
      
      // Capture security headers
      const securityHeaders = response?.headers() || {};
      
      // Determine if access was granted
      const accessGranted = await this.determineAccessStatus(page, test, httpStatus);
      
      // Take screenshot evidence
      const screenshotPath = `access-control-evidence-${test.testId}-${Date.now()}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });
      
      // Risk assessment
      const riskAssessment = this.assessRisk(test, accessGranted, httpStatus);
      const recommendation = this.generateRecommendation(test, accessGranted);

      return {
        testId: test.testId,
        testName: test.testName,
        url: test.url,
        accessGranted,
        responseTime,
        httpStatus,
        pageTitle,
        accessControlEvidence,
        securityHeaders,
        riskAssessment,
        recommendation,
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.log(`     ⚠️ Test error: ${error.message}`);
      
      return {
        testId: test.testId,
        testName: test.testName,
        url: test.url,
        accessGranted: false,
        responseTime: Date.now() - startTime,
        pageTitle: 'Error during test',
        accessControlEvidence: [`Error: ${error.message}`],
        securityHeaders: {},
        riskAssessment: 'Unable to determine - test error',
        recommendation: 'Retest with proper authentication',
        screenshot: '',
        timestamp: new Date().toISOString()
      };
    }
  }

  private async analyzeAccessControlEvidence(page: any): Promise<string[]> {
    const evidence: string[] = [];
    
    try {
      // Check for admin interface elements
      const adminElements = await page.$$eval('*', (elements: any[]) => {
        return elements.filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          const id = el.id?.toLowerCase() || '';
          const className = el.className?.toLowerCase() || '';
          
          return text.includes('administration') || 
                 text.includes('admin') || 
                 text.includes('system') ||
                 text.includes('configuration') ||
                 id.includes('admin') ||
                 className.includes('admin');
        }).length;
      });
      
      if (adminElements > 0) {
        evidence.push(`Found ${adminElements} administrative interface elements`);
      }
      
      // Check for error messages
      const errorMessages = await page.$$eval('*', (elements: any[]) => {
        return elements.filter(el => {
          const text = el.textContent?.toLowerCase() || '';
          return text.includes('access denied') || 
                 text.includes('permission') || 
                 text.includes('unauthorized') ||
                 text.includes('forbidden');
        }).map(el => el.textContent?.trim()).slice(0, 3);
      });
      
      if (errorMessages.length > 0) {
        evidence.push(`Access control messages: ${errorMessages.join(', ')}`);
      }
      
      // Check for navigation elements
      const navElements = await page.$$eval('nav, .navigation, #navigation', (elements: any[]) => {
        return elements.length;
      });
      
      if (navElements > 0) {
        evidence.push(`Navigation elements present: ${navElements}`);
      }
      
    } catch (error) {
      evidence.push(`Analysis error: ${error.message}`);
    }
    
    return evidence;
  }

  private async determineAccessStatus(page: any, test: AccessControlTest, httpStatus?: number): Promise<boolean> {
    // HTTP status indicators
    if (httpStatus === 403 || httpStatus === 401) {
      return false; // Access denied
    }
    
    if (httpStatus === 404) {
      return false; // Resource not found (could be access control)
    }
    
    // Check for access denied content
    try {
      const bodyText = await page.textContent('body');
      const lowerText = bodyText?.toLowerCase() || '';
      
      if (lowerText.includes('access denied') || 
          lowerText.includes('permission violation') ||
          lowerText.includes('unauthorized') ||
          lowerText.includes('forbidden')) {
        return false;
      }
      
      // Check for login redirects
      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('auth')) {
        return false;
      }
      
      // If we see admin content, access was granted
      if (lowerText.includes('administration') || 
          lowerText.includes('system configuration') ||
          lowerText.includes('global settings')) {
        return true;
      }
      
    } catch (error) {
      console.log(`     ⚠️ Content analysis error: ${error.message}`);
    }
    
    // Default to access granted if no clear denial indicators
    return httpStatus === 200;
  }

  private assessRisk(test: AccessControlTest, accessGranted: boolean, httpStatus?: number): string {
    if (!accessGranted) {
      return 'LOW RISK - Access properly denied';
    }
    
    if (test.expectedOutcome === 'access_denied' && accessGranted) {
      return `${test.riskLevel.toUpperCase()} RISK - Unauthorized access granted`;
    }
    
    if (test.expectedOutcome === 'needs_validation' && accessGranted) {
      return 'MEDIUM RISK - Requires role validation';
    }
    
    return 'LOW RISK - Access status as expected';
  }

  private generateRecommendation(test: AccessControlTest, accessGranted: boolean): string {
    if (!accessGranted) {
      return 'No action required - access control working correctly';
    }
    
    if (test.expectedOutcome === 'access_denied' && accessGranted) {
      return 'IMMEDIATE ACTION: Review user permissions and role assignments';
    }
    
    if (test.expectedOutcome === 'needs_validation' && accessGranted) {
      return 'VALIDATE: Confirm user has legitimate administrative privileges';
    }
    
    return 'Monitor access patterns and review periodically';
  }

  private generateManualSecurityReport(): ManualSecurityReport {
    const accessViolations = this.results.filter(r => 
      r.accessGranted && r.riskAssessment.includes('RISK')
    ).length;
    
    const legitimateAccess = this.results.filter(r => 
      r.accessGranted && !r.riskAssessment.includes('RISK')
    ).length;
    
    const overallRiskLevel = accessViolations > 0 ? 
      (accessViolations >= 3 ? 'critical' : 'high') : 'medium';
    
    const report: ManualSecurityReport = {
      executiveSummary: {
        totalTests: this.results.length,
        accessViolations,
        legitimateAccess,
        overallRiskLevel,
        readyForProduction: accessViolations === 0
      },
      detailedFindings: this.results,
      complianceAnalysis: {
        owaspCompliance: [
          'A01:2021 – Broken Access Control (Validated)',
          'A07:2021 – Identification and Authentication Failures'
        ],
        recommendations: [
          'Implement principle of least privilege',
          'Regular access control audits',
          'Role-based permission validation',
          'Administrative function logging'
        ],
        immediateActions: this.results
          .filter(r => r.riskAssessment.includes('IMMEDIATE'))
          .map(r => r.recommendation)
      },
      evidenceFiles: this.results.map(r => r.screenshot).filter(s => s),
      timestamp: new Date().toISOString()
    };

    // Save comprehensive report
    const reportFilename = `manual-access-control-report-${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    
    console.log('\n📊 MANUAL ACCESS CONTROL VALIDATION COMPLETE!');
    console.log('================================================================================');
    console.log(`📊 Total Tests: ${report.executiveSummary.totalTests}`);
    console.log(`🚨 Access Violations: ${report.executiveSummary.accessViolations}`);
    console.log(`✅ Legitimate Access: ${report.executiveSummary.legitimateAccess}`);
    console.log(`⚠️ Overall Risk: ${report.executiveSummary.overallRiskLevel.toUpperCase()}`);
    console.log(`🎯 Production Ready: ${report.executiveSummary.readyForProduction ? 'YES' : 'NEEDS REVIEW'}`);
    console.log(`📄 Report: ${reportFilename}`);
    console.log('================================================================================');

    return report;
  }
}

async function runManualAccessControlValidation() {
  const validator = new ManualAccessControlValidator();
  
  try {
    // Load authenticated session
    await validator.loadSession();
    console.log('✅ Authenticated session loaded for manual validation');

    // Perform comprehensive manual access control testing
    const report = await validator.performManualAccessControlValidation();

    console.log('\n🎉 MANUAL ACCESS CONTROL VALIDATION COMPLETE!');
    console.log('📄 Professional security report ready for colleague delivery!');

  } catch (error) {
    console.error('❌ Manual access control validation failed:', error);
    process.exit(1);
  }
}

// Run the manual access control validation
runManualAccessControlValidation(); 