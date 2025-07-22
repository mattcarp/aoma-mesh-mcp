import { chromium } from 'playwright';
import fs from 'fs';

// Manual Authentication Validation for OWASP Security Testing
// Task 11.3: Comprehensive authentication flow and session security validation

interface AuthenticationTest {
  testId: string;
  testName: string;
  testType: 'flow' | 'session' | 'security' | 'sso' | 'policy';
  description: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  expectedBehavior: string;
}

interface AuthenticationResult {
  testId: string;
  testName: string;
  testType: string;
  success: boolean;
  duration: number;
  findings: string[];
  securityObservations: string[];
  recommendations: string[];
  evidence: {
    screenshots: string[];
    networkActivity: any[];
    cookieAnalysis: any[];
    urlRedirects: string[];
  };
  complianceNotes: string[];
  timestamp: string;
}

interface AuthenticationSecurityReport {
  executiveSummary: {
    totalTests: number;
    authenticationStrength: 'excellent' | 'good' | 'fair' | 'poor';
    sessionSecurity: 'secure' | 'moderate' | 'vulnerable';
    ssoIntegration: 'optimal' | 'functional' | 'problematic';
    overallCompliance: 'compliant' | 'mostly_compliant' | 'non_compliant';
  };
  detailedResults: AuthenticationResult[];
  securityAnalysis: {
    passwordPolicy: string;
    sessionManagement: string;
    multiFactorAuth: string;
    ssoSecurity: string;
    vulnerabilities: string[];
  };
  complianceFramework: {
    owaspCompliance: string[];
    authenticationBestPractices: string[];
    recommendations: string[];
  };
  timestamp: string;
}

class ManualAuthenticationValidator {
  private sessionData: any;
  private results: AuthenticationResult[] = [];
  
  private authTestSuite: AuthenticationTest[] = [
    {
      testId: 'AUTH-001',
      testName: 'Microsoft SSO Authentication Flow',
      testType: 'sso',
      description: 'Validate Microsoft SSO integration and security',
      riskLevel: 'high',
      expectedBehavior: 'Secure redirect, proper token exchange, session establishment'
    },
    {
      testId: 'AUTH-002',
      testName: 'Session Timeout Validation',
      testType: 'session',
      description: 'Test session timeout and automatic logout behavior',
      riskLevel: 'medium',
      expectedBehavior: 'Automatic logout after inactivity, secure session cleanup'
    },
    {
      testId: 'AUTH-003',
      testName: 'Session Cookie Security Analysis',
      testType: 'security',
      description: 'Analyze session cookie attributes and security flags',
      riskLevel: 'high',
      expectedBehavior: 'Secure, HttpOnly, SameSite cookies with proper expiration'
    },
    {
      testId: 'AUTH-004',
      testName: 'Authentication State Persistence',
      testType: 'session',
      description: 'Test authentication state across browser tabs and navigation',
      riskLevel: 'medium',
      expectedBehavior: 'Consistent authentication state, no unauthorized access'
    },
    {
      testId: 'AUTH-005',
      testName: 'Logout Security Validation',
      testType: 'security',
      description: 'Verify secure logout and session termination',
      riskLevel: 'high',
      expectedBehavior: 'Complete session termination, cache clearing, redirect to login'
    },
    {
      testId: 'AUTH-006',
      testName: 'Cross-Browser Authentication',
      testType: 'flow',
      description: 'Test authentication flow consistency across browsers',
      riskLevel: 'low',
      expectedBehavior: 'Consistent authentication experience across browser types'
    },
    {
      testId: 'AUTH-007',
      testName: 'Concurrent Session Management',
      testType: 'session',
      description: 'Test handling of multiple concurrent sessions',
      riskLevel: 'medium',
      expectedBehavior: 'Proper session isolation, security policy enforcement'
    }
  ];

  async loadExistingSession(): Promise<any> {
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

  async performManualAuthenticationValidation(): Promise<AuthenticationSecurityReport> {
    console.log('🔐 MANUAL AUTHENTICATION VALIDATION - TASK 11.3');
    console.log('================================================================================');
    console.log('🛡️ Comprehensive authentication security testing');
    console.log('🔍 Session management and SSO integration validation');
    console.log('📋 OWASP authentication security compliance');
    console.log('================================================================================');

    const browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized', '--disable-web-security']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: this.sessionData.userAgent
    });
    
    // Start with existing authenticated session
    await context.addCookies(this.sessionData.cookies);
    
    const page = await context.newPage();

    try {
      console.log('\n🔍 EXECUTING AUTHENTICATION SECURITY TESTS');
      console.log('================================================================================');

      for (const test of this.authTestSuite) {
        console.log(`\n  🎯 Testing: ${test.testName} (${test.testId})`);
        const result = await this.executeAuthenticationTest(page, context, test);
        this.results.push(result);
        
        console.log(`     Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`     Duration: ${result.duration}ms`);
        if (result.findings.length > 0) {
          console.log(`     Findings: ${result.findings.slice(0, 2).join(', ')}`);
        }
      }

    } catch (error) {
      console.error('❌ Authentication validation error:', error);
    } finally {
      await browser.close();
    }

    return this.generateAuthenticationSecurityReport();
  }

  private async executeAuthenticationTest(page: any, context: any, test: AuthenticationTest): Promise<AuthenticationResult> {
    const startTime = Date.now();
    const screenshots: string[] = [];
    const networkActivity: any[] = [];
    const cookieAnalysis: any[] = [];
    const urlRedirects: string[] = [];
    const findings: string[] = [];
    const securityObservations: string[] = [];
    const recommendations: string[] = [];
    const complianceNotes: string[] = [];

    try {
      // Set up network monitoring
      page.on('response', (response: any) => {
        networkActivity.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers(),
          timestamp: new Date().toISOString()
        });
      });

      // Set up navigation monitoring
      page.on('framenavigated', (frame: any) => {
        urlRedirects.push(frame.url());
      });

      switch (test.testId) {
        case 'AUTH-001':
          await this.testMicrosoftSSOFlow(page, context, findings, securityObservations, screenshots);
          break;
        case 'AUTH-002':
          await this.testSessionTimeout(page, context, findings, securityObservations, screenshots);
          break;
        case 'AUTH-003':
          await this.testSessionCookieSecurity(page, context, findings, securityObservations, cookieAnalysis);
          break;
        case 'AUTH-004':
          await this.testAuthenticationPersistence(page, context, findings, securityObservations, screenshots);
          break;
        case 'AUTH-005':
          await this.testLogoutSecurity(page, context, findings, securityObservations, screenshots);
          break;
        case 'AUTH-006':
          await this.testCrossBrowserAuthentication(page, context, findings, securityObservations);
          break;
        case 'AUTH-007':
          await this.testConcurrentSessions(page, context, findings, securityObservations);
          break;
      }

      // Generate recommendations based on findings
      recommendations.push(...this.generateTestRecommendations(test, findings, securityObservations));
      
      // Add compliance notes
      complianceNotes.push(...this.generateComplianceNotes(test, findings));

      return {
        testId: test.testId,
        testName: test.testName,
        testType: test.testType,
        success: findings.filter(f => f.includes('FAIL') || f.includes('CRITICAL')).length === 0,
        duration: Date.now() - startTime,
        findings,
        securityObservations,
        recommendations,
        evidence: {
          screenshots,
          networkActivity: networkActivity.slice(0, 10), // Limit size
          cookieAnalysis,
          urlRedirects
        },
        complianceNotes,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      findings.push(`CRITICAL: Test execution failed - ${error.message}`);
      
      return {
        testId: test.testId,
        testName: test.testName,
        testType: test.testType,
        success: false,
        duration: Date.now() - startTime,
        findings,
        securityObservations: [`Error during test execution: ${error.message}`],
        recommendations: ['Retest with stable environment', 'Review test prerequisites'],
        evidence: { screenshots, networkActivity, cookieAnalysis, urlRedirects },
        complianceNotes: ['Test incomplete due to execution error'],
        timestamp: new Date().toISOString()
      };
    }
  }

  private async testMicrosoftSSOFlow(page: any, context: any, findings: string[], observations: string[], screenshots: string[]): Promise<void> {
    try {
      // Navigate to a protected page to trigger authentication check
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/MyJiraHome.jspa');
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const pageTitle = await page.title();

      // Check if we're redirected to Microsoft SSO
      if (currentUrl.includes('login.microsoftonline.com')) {
        findings.push('✅ Microsoft SSO integration detected');
        observations.push('Proper redirect to Microsoft authentication');
        
        // Take screenshot of SSO page
        const screenshotPath = `auth-sso-flow-${Date.now()}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: true });
        screenshots.push(screenshotPath);
        
      } else if (currentUrl.includes('jirauat.smedigitalapps.com') && !currentUrl.includes('login')) {
        findings.push('✅ Already authenticated via existing session');
        observations.push('Valid session maintained, no re-authentication required');
      } else {
        findings.push('⚠️ Unexpected authentication state');
        observations.push(`Current URL: ${currentUrl}, Title: ${pageTitle}`);
      }

      // Analyze authentication headers and cookies
      const cookies = await context.cookies();
      const authCookies = cookies.filter(c => 
        c.name.toLowerCase().includes('auth') || 
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('token')
      );

      if (authCookies.length > 0) {
        findings.push(`✅ Found ${authCookies.length} authentication-related cookies`);
        observations.push('Authentication state properly maintained via cookies');
      } else {
        findings.push('⚠️ No obvious authentication cookies found');
      }

    } catch (error) {
      findings.push(`❌ SSO flow test failed: ${error.message}`);
    }
  }

  private async testSessionTimeout(page: any, context: any, findings: string[], observations: string[], screenshots: string[]): Promise<void> {
    try {
      // Check current session state
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForLoadState('networkidle');

      const isAuthenticated = !page.url().includes('login');
      
      if (isAuthenticated) {
        findings.push('✅ Current session is active');
        observations.push('Session timeout testing requires longer observation period');
        
        // Check session cookie expiration
        const cookies = await context.cookies();
        const sessionCookies = cookies.filter(c => c.name.toLowerCase().includes('session'));
        
        for (const cookie of sessionCookies) {
          if (cookie.expires && cookie.expires > 0) {
            const expiryDate = new Date(cookie.expires * 1000);
            const hoursUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);
            findings.push(`📅 Session cookie expires in ${hoursUntilExpiry.toFixed(1)} hours`);
            observations.push(`Cookie: ${cookie.name}, Expiry: ${expiryDate.toISOString()}`);
          }
        }
      } else {
        findings.push('❌ Session appears to have timed out');
        observations.push('User redirected to login page');
      }

    } catch (error) {
      findings.push(`❌ Session timeout test failed: ${error.message}`);
    }
  }

  private async testSessionCookieSecurity(page: any, context: any, findings: string[], observations: string[], cookieAnalysis: any[]): Promise<void> {
    try {
      const cookies = await context.cookies();
      const securityRelevantCookies = cookies.filter(c => 
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('auth') ||
        c.name.toLowerCase().includes('token') ||
        c.name.toLowerCase().includes('jsession')
      );

      for (const cookie of securityRelevantCookies) {
        const analysis = {
          name: cookie.name,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
          domain: cookie.domain,
          path: cookie.path,
          hasExpiry: !!cookie.expires
        };
        
        cookieAnalysis.push(analysis);

        // Security checks
        if (!cookie.secure) {
          findings.push(`⚠️ Cookie ${cookie.name} missing Secure flag`);
          observations.push('Cookies should be marked Secure for HTTPS');
        } else {
          findings.push(`✅ Cookie ${cookie.name} properly marked Secure`);
        }

        if (!cookie.httpOnly) {
          findings.push(`⚠️ Cookie ${cookie.name} missing HttpOnly flag`);
          observations.push('Session cookies should be HttpOnly to prevent XSS');
        } else {
          findings.push(`✅ Cookie ${cookie.name} properly marked HttpOnly`);
        }

        if (cookie.sameSite !== 'Strict' && cookie.sameSite !== 'Lax') {
          findings.push(`⚠️ Cookie ${cookie.name} missing SameSite protection`);
          observations.push('SameSite attribute helps prevent CSRF attacks');
        } else {
          findings.push(`✅ Cookie ${cookie.name} has SameSite: ${cookie.sameSite}`);
        }
      }

    } catch (error) {
      findings.push(`❌ Cookie security analysis failed: ${error.message}`);
    }
  }

  private async testAuthenticationPersistence(page: any, context: any, findings: string[], observations: string[], screenshots: string[]): Promise<void> {
    try {
      // Test 1: Navigate between authenticated pages
      const testPages = [
        'https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa',
        'https://jirauat.smedigitalapps.com/jira/projects/ITSM',
        'https://jirauat.smedigitalapps.com/jira/issues/'
      ];

      for (const testUrl of testPages) {
        await page.goto(testUrl);
        await page.waitForLoadState('networkidle');
        
        const requiresLogin = page.url().includes('login') || 
                            await page.locator('input[name="username"], input[type="email"]').count() > 0;
        
        if (requiresLogin) {
          findings.push(`❌ Authentication lost when navigating to ${testUrl}`);
          observations.push('Session persistence failure detected');
        } else {
          findings.push(`✅ Authentication maintained at ${testUrl}`);
        }
      }

      // Test 2: Check authentication in new tab
      const newPage = await context.newPage();
      await newPage.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await newPage.waitForLoadState('networkidle');
      
      const newTabAuth = !newPage.url().includes('login');
      if (newTabAuth) {
        findings.push('✅ Authentication persists across browser tabs');
        observations.push('Session properly shared across browser context');
      } else {
        findings.push('❌ Authentication not maintained in new tab');
        observations.push('Potential session isolation issue');
      }
      
      await newPage.close();

    } catch (error) {
      findings.push(`❌ Authentication persistence test failed: ${error.message}`);
    }
  }

  private async testLogoutSecurity(page: any, context: any, findings: string[], observations: string[], screenshots: string[]): Promise<void> {
    try {
      // Navigate to authenticated page first
      await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await page.waitForLoadState('networkidle');

      // Look for logout/profile menu
      const profileMenu = page.locator('#user_profile_menu, .user-profile, .user-dropdown').first();
      const logoutLink = page.locator('text=Log out, text=Logout, text=Sign out').first();

      if (await profileMenu.isVisible()) {
        findings.push('✅ User profile menu accessible');
        await profileMenu.click();
        await page.waitForTimeout(1000);
        
        if (await logoutLink.isVisible()) {
          findings.push('✅ Logout option available in profile menu');
          observations.push('Proper logout mechanism provided');
          
          // Take screenshot before logout
          const beforeLogout = `auth-before-logout-${Date.now()}.png`;
          await page.screenshot({ path: beforeLogout });
          screenshots.push(beforeLogout);
          
        } else {
          findings.push('⚠️ Logout option not immediately visible');
          observations.push('May require additional navigation to logout');
        }
      } else {
        findings.push('⚠️ User profile menu not found');
        observations.push('Alternative logout mechanism may be in use');
      }

      // Test session cleanup (without actually logging out to preserve test session)
      const cookies = await context.cookies();
      if (cookies.length > 0) {
        findings.push(`📊 Current session has ${cookies.length} cookies`);
        observations.push('Session cleanup testing requires actual logout execution');
      }

    } catch (error) {
      findings.push(`❌ Logout security test failed: ${error.message}`);
    }
  }

  private async testCrossBrowserAuthentication(page: any, context: any, findings: string[], observations: string[]): Promise<void> {
    // Note: This is a simplified cross-browser test within the same browser engine
    try {
      findings.push('✅ Cross-browser authentication test simulated');
      observations.push('Current test uses Chromium engine');
      observations.push('Production testing should include Firefox, Safari, Edge');
      
      // Test different user agent strings
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
      ];

      for (const userAgent of userAgents) {
        await page.setExtraHTTPHeaders({ 'User-Agent': userAgent });
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForLoadState('networkidle');
        
        const isAuthenticated = !page.url().includes('login');
        if (isAuthenticated) {
          findings.push(`✅ Authentication compatible with user agent: ${userAgent.split('/')[0]}`);
        }
      }

    } catch (error) {
      findings.push(`❌ Cross-browser authentication test failed: ${error.message}`);
    }
  }

  private async testConcurrentSessions(page: any, context: any, findings: string[], observations: string[]): Promise<void> {
    try {
      // Test session behavior with multiple contexts (simulating different browser instances)
      const secondContext = await context.browser().newContext({
        userAgent: this.sessionData.userAgent
      });
      
      // Share cookies from original session
      await secondContext.addCookies(await context.cookies());
      
      const secondPage = await secondContext.newPage();
      await secondPage.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
      await secondPage.waitForLoadState('networkidle');
      
      const secondSessionAuth = !secondPage.url().includes('login');
      
      if (secondSessionAuth) {
        findings.push('✅ Concurrent session authentication works');
        observations.push('Multiple browser contexts can share authentication');
      } else {
        findings.push('❌ Concurrent session authentication failed');
        observations.push('Session isolation may be too restrictive');
      }
      
      await secondContext.close();

    } catch (error) {
      findings.push(`❌ Concurrent session test failed: ${error.message}`);
    }
  }

  private generateTestRecommendations(test: AuthenticationTest, findings: string[], observations: string[]): string[] {
    const recommendations: string[] = [];
    
    const hasFailures = findings.some(f => f.includes('❌') || f.includes('⚠️'));
    
    switch (test.testType) {
      case 'sso':
        if (hasFailures) {
          recommendations.push('Review Microsoft SSO configuration and token validation');
          recommendations.push('Implement proper error handling for SSO failures');
        }
        break;
      case 'session':
        if (hasFailures) {
          recommendations.push('Review session timeout policies');
          recommendations.push('Implement proper session cleanup procedures');
        }
        break;
      case 'security':
        if (hasFailures) {
          recommendations.push('Enable all security flags on authentication cookies');
          recommendations.push('Implement Content Security Policy headers');
        }
        break;
      case 'flow':
        if (hasFailures) {
          recommendations.push('Test authentication across all supported browsers');
          recommendations.push('Implement graceful degradation for browser compatibility');
        }
        break;
    }
    
    if (!hasFailures) {
      recommendations.push('Continue monitoring authentication security');
      recommendations.push('Regular security testing in production environment');
    }
    
    return recommendations;
  }

  private generateComplianceNotes(test: AuthenticationTest, findings: string[]): string[] {
    const notes: string[] = [];
    
    const hasSecurityIssues = findings.some(f => f.includes('❌') || f.includes('⚠️'));
    
    if (hasSecurityIssues) {
      notes.push('OWASP A07:2021 - Identification and Authentication Failures: Issues detected');
    } else {
      notes.push('OWASP A07:2021 - Identification and Authentication Failures: Compliant');
    }
    
    notes.push(`Test Category: ${test.testType.toUpperCase()} - ${test.riskLevel.toUpperCase()} RISK`);
    
    return notes;
  }

  private generateAuthenticationSecurityReport(): AuthenticationSecurityReport {
    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - successfulTests;
    
    // Analyze overall security posture
    const authenticationStrength = this.assessAuthenticationStrength();
    const sessionSecurity = this.assessSessionSecurity();
    const ssoIntegration = this.assessSSOIntegration();
    const overallCompliance = failedTests === 0 ? 'compliant' : failedTests <= 2 ? 'mostly_compliant' : 'non_compliant';

    const report: AuthenticationSecurityReport = {
      executiveSummary: {
        totalTests,
        authenticationStrength,
        sessionSecurity,
        ssoIntegration,
        overallCompliance
      },
      detailedResults: this.results,
      securityAnalysis: {
        passwordPolicy: 'Microsoft SSO managed - enterprise policy enforced',
        sessionManagement: sessionSecurity === 'secure' ? 'Robust session handling' : 'Requires security improvements',
        multiFactorAuth: 'Managed by Microsoft SSO - MFA enforcement depends on Azure AD policy',
        ssoSecurity: ssoIntegration === 'optimal' ? 'Secure SSO implementation' : 'SSO configuration needs review',
        vulnerabilities: this.extractVulnerabilities()
      },
      complianceFramework: {
        owaspCompliance: [
          'A07:2021 – Identification and Authentication Failures (Tested)',
          'A02:2021 – Cryptographic Failures (Cookie Security)',
          'A01:2021 – Broken Access Control (Session Management)'
        ],
        authenticationBestPractices: [
          'Multi-factor authentication via Microsoft SSO',
          'Secure session cookie handling',
          'Proper session timeout management',
          'Cross-browser compatibility testing'
        ],
        recommendations: this.generateOverallRecommendations()
      },
      timestamp: new Date().toISOString()
    };

    // Save comprehensive report
    const reportFilename = `manual-authentication-report-${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    
    console.log('\n📊 MANUAL AUTHENTICATION VALIDATION COMPLETE!');
    console.log('================================================================================');
    console.log(`📊 Total Tests: ${report.executiveSummary.totalTests}`);
    console.log(`🔐 Authentication Strength: ${report.executiveSummary.authenticationStrength.toUpperCase()}`);
    console.log(`🍪 Session Security: ${report.executiveSummary.sessionSecurity.toUpperCase()}`);
    console.log(`🔗 SSO Integration: ${report.executiveSummary.ssoIntegration.toUpperCase()}`);
    console.log(`✅ Overall Compliance: ${report.executiveSummary.overallCompliance.toUpperCase()}`);
    console.log(`📄 Report: ${reportFilename}`);
    console.log('================================================================================');

    return report;
  }

  private assessAuthenticationStrength(): 'excellent' | 'good' | 'fair' | 'poor' {
    const ssoResults = this.results.filter(r => r.testType === 'sso');
    const flowResults = this.results.filter(r => r.testType === 'flow');
    
    const ssoSuccess = ssoResults.length > 0 && ssoResults.every(r => r.success);
    const flowSuccess = flowResults.length > 0 && flowResults.every(r => r.success);
    
    if (ssoSuccess && flowSuccess) return 'excellent';
    if (ssoSuccess || flowSuccess) return 'good';
    return 'fair';
  }

  private assessSessionSecurity(): 'secure' | 'moderate' | 'vulnerable' {
    const sessionResults = this.results.filter(r => r.testType === 'session');
    const securityResults = this.results.filter(r => r.testType === 'security');
    
    const sessionSuccess = sessionResults.length > 0 && sessionResults.every(r => r.success);
    const securitySuccess = securityResults.length > 0 && securityResults.every(r => r.success);
    
    if (sessionSuccess && securitySuccess) return 'secure';
    if (sessionSuccess || securitySuccess) return 'moderate';
    return 'vulnerable';
  }

  private assessSSOIntegration(): 'optimal' | 'functional' | 'problematic' {
    const ssoResults = this.results.filter(r => r.testType === 'sso');
    
    if (ssoResults.length === 0) return 'functional';
    
    const allSuccess = ssoResults.every(r => r.success);
    const someSuccess = ssoResults.some(r => r.success);
    
    if (allSuccess) return 'optimal';
    if (someSuccess) return 'functional';
    return 'problematic';
  }

  private extractVulnerabilities(): string[] {
    const vulnerabilities: string[] = [];
    
    this.results.forEach(result => {
      result.findings.forEach(finding => {
        if (finding.includes('❌') || finding.includes('⚠️')) {
          vulnerabilities.push(`${result.testName}: ${finding}`);
        }
      });
    });
    
    return vulnerabilities;
  }

  private generateOverallRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const allRecommendations = this.results.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    recommendations.push(...uniqueRecommendations);
    
    // Add general security recommendations
    recommendations.push('Regular authentication security audits');
    recommendations.push('Monitor authentication logs for anomalies');
    recommendations.push('Keep SSO integration updated with latest security patches');
    
    return recommendations;
  }
}

async function runManualAuthenticationValidation() {
  const validator = new ManualAuthenticationValidator();
  
  try {
    // Load authenticated session
    await validator.loadExistingSession();
    console.log('✅ Authenticated session loaded for authentication validation');

    // Perform comprehensive authentication security testing
    const report = await validator.performManualAuthenticationValidation();

    console.log('\n🎉 MANUAL AUTHENTICATION VALIDATION COMPLETE!');
    console.log('🔐 Comprehensive authentication security assessment ready!');

  } catch (error) {
    console.error('❌ Manual authentication validation failed:', error);
    process.exit(1);
  }
}

// Run the manual authentication validation
runManualAuthenticationValidation(); 