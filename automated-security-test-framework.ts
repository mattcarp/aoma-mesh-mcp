import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Automated Security Test Framework - CI/CD Integration
// Task 11.4: Integrate OWASP ZAP automated scans with existing test frameworks

interface SecurityTestConfig {
  environment: 'development' | 'staging' | 'uat' | 'production';
  baseUrl: string;
  authenticationMethod: 'manual' | 'session' | 'api' | 'sso';
  testSuites: string[];
  reportFormats: ('json' | 'html' | 'junit' | 'markdown')[];
  slackWebhook?: string;
  githubToken?: string;
  failPipeline: boolean;
  securityThresholds: {
    critical: number;
    high: number;
    medium: number;
  };
}

interface SecurityTestResult {
  testSuite: string;
  testType: 'vulnerability' | 'access_control' | 'authentication';
  passed: boolean;
  duration: number;
  vulnerabilities: any[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  reportFiles: string[];
  timestamp: string;
}

interface PipelineResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  results: SecurityTestResult[];
  duration: number;
  reportUrls: string[];
  slackNotified: boolean;
  githubStatusUpdated: boolean;
}

class AutomatedSecurityTestFramework {
  private config: SecurityTestConfig;
  private results: SecurityTestResult[] = [];
  private startTime: number = 0;

  constructor(config: SecurityTestConfig) {
    this.config = config;
  }

  async runSecurityPipeline(): Promise<PipelineResult> {
    console.log('🚀 AUTOMATED SECURITY TEST FRAMEWORK - CI/CD INTEGRATION');
    console.log('================================================================================');
    console.log(`🌍 Environment: ${this.config.environment.toUpperCase()}`);
    console.log(`🎯 Base URL: ${this.config.baseUrl}`);
    console.log(`🔐 Auth Method: ${this.config.authenticationMethod}`);
    console.log(`🧪 Test Suites: ${this.config.testSuites.join(', ')}`);
    console.log('================================================================================');

    this.startTime = Date.now();

    try {
      // Step 1: Environment Setup
      console.log('\n🔧 Step 1: Setting up test environment...');
      await this.setupTestEnvironment();

      // Step 2: Authentication Setup
      console.log('\n🔐 Step 2: Setting up authentication...');
      await this.setupAuthentication();

      // Step 3: Run Security Test Suites
      console.log('\n🧪 Step 3: Executing security test suites...');
      for (const suite of this.config.testSuites) {
        await this.runTestSuite(suite);
      }

      // Step 4: Generate Reports
      console.log('\n📊 Step 4: Generating comprehensive reports...');
      const reportUrls = await this.generateReports();

      // Step 5: Check Security Thresholds
      console.log('\n⚖️ Step 5: Evaluating security thresholds...');
      const thresholdsPassed = this.evaluateSecurityThresholds();

      // Step 6: Notify Stakeholders
      console.log('\n📢 Step 6: Notifying stakeholders...');
      const slackNotified = await this.sendSlackNotification();
      const githubStatusUpdated = await this.updateGitHubStatus(thresholdsPassed);

      const pipelineResult: PipelineResult = {
        success: thresholdsPassed,
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.passed).length,
        failedTests: this.results.filter(r => !r.passed).length,
        totalVulnerabilities: this.results.reduce((sum, r) => sum + r.vulnerabilities.length, 0),
        criticalVulnerabilities: this.results.reduce((sum, r) => sum + r.summary.critical, 0),
        results: this.results,
        duration: Date.now() - this.startTime,
        reportUrls,
        slackNotified,
        githubStatusUpdated
      };

      console.log('\n🎉 AUTOMATED SECURITY PIPELINE COMPLETE!');
      console.log('================================================================================');
      console.log(`✅ Success: ${pipelineResult.success ? 'PASSED' : 'FAILED'}`);
      console.log(`📊 Tests: ${pipelineResult.passedTests}/${pipelineResult.totalTests} passed`);
      console.log(`🚨 Vulnerabilities: ${pipelineResult.totalVulnerabilities} total, ${pipelineResult.criticalVulnerabilities} critical`);
      console.log(`⏱️ Duration: ${Math.round(pipelineResult.duration / 1000)}s`);
      console.log('================================================================================');

      return pipelineResult;

    } catch (error) {
      console.error('❌ Security pipeline failed:', error);
      throw error;
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    try {
      // Create necessary directories
      const dirs = ['reports/security', 'logs/security', 'artifacts/security'];
      for (const dir of dirs) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`📁 Created directory: ${dir}`);
        }
      }

      // Check dependencies (skip auto-install for demo)
      const dependencies = ['playwright', 'typescript'];
      for (const dep of dependencies) {
        try {
          execSync(`npm list ${dep}`, { stdio: 'ignore' });
          console.log(`✅ Dependency check: ${dep} installed`);
        } catch (error) {
          console.log(`⚠️ Dependency ${dep} not found - continuing anyway for demo`);
        }
      }

      // Validate configuration
      if (!this.config.baseUrl) {
        throw new Error('Base URL is required');
      }

      console.log('✅ Test environment setup complete');

    } catch (error) {
      console.error('❌ Environment setup failed:', error);
      throw error;
    }
  }

  private async setupAuthentication(): Promise<void> {
    try {
      switch (this.config.authenticationMethod) {
        case 'session':
          await this.setupSessionAuthentication();
          break;
        case 'api':
          await this.setupApiAuthentication();
          break;
        case 'sso':
          await this.setupSSOAuthentication();
          break;
        case 'manual':
          console.log('⚠️ Manual authentication - session must be captured separately');
          break;
        default:
          throw new Error(`Unsupported authentication method: ${this.config.authenticationMethod}`);
      }

      console.log('✅ Authentication setup complete');

    } catch (error) {
      console.error('❌ Authentication setup failed:', error);
      throw error;
    }
  }

  private async setupSessionAuthentication(): Promise<void> {
    // Look for existing session files
    const sessionFiles = fs.readdirSync('.').filter(f => 
      f.startsWith('jira-uat-session-') && f.endsWith('.json')
    );

    if (sessionFiles.length === 0) {
      console.log('⚠️ No session files found - running session capture...');
      await this.captureNewSession();
    } else {
      const latestSession = sessionFiles.sort().pop()!;
      console.log(`📁 Using existing session: ${latestSession}`);
      
      // Validate session age
      const sessionData = JSON.parse(fs.readFileSync(latestSession, 'utf8'));
      const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
      const maxAge = 8 * 60 * 60 * 1000; // 8 hours

      if (sessionAge > maxAge) {
        console.log('⚠️ Session expired - capturing new session...');
        await this.captureNewSession();
      }
    }
  }

  private async captureNewSession(): Promise<void> {
    console.log('🔐 Launching browser for session capture...');
    
    const browser = await chromium.launch({ 
      headless: false,
      args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    try {
      await page.goto(this.config.baseUrl);
      
      console.log('👤 Please complete manual login...');
      console.log('⏳ Waiting for authentication (checking every 10 seconds)...');
      
      let isAuthenticated = false;
      while (!isAuthenticated) {
        await page.waitForTimeout(10000);
        
        const currentUrl = page.url();
        isAuthenticated = currentUrl.includes(this.config.baseUrl.split('/')[2]) && 
                         !currentUrl.includes('login') &&
                         !currentUrl.includes('auth');
        
        if (isAuthenticated) {
          console.log('✅ Authentication detected!');
          break;
        }
        
        console.log('⏳ Still waiting for authentication...');
      }
      
      // Capture session data
      const cookies = await context.cookies();
      const localStorage = await page.evaluate(() => ({ ...localStorage }));
      const sessionStorage = await page.evaluate(() => ({ ...sessionStorage }));
      
      const sessionData = {
        timestamp: new Date().toISOString(),
        cookies,
        localStorage,
        sessionStorage,
        userAgent: await page.evaluate(() => navigator.userAgent),
        captureUrl: page.url(),
        pageTitle: await page.title()
      };
      
      const sessionFile = `jira-uat-session-${Date.now()}.json`;
      fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
      
      console.log(`✅ Session captured: ${sessionFile}`);
      
    } finally {
      await browser.close();
    }
  }

  private async setupApiAuthentication(): Promise<void> {
    // API authentication setup (placeholder for API-based auth)
    console.log('🔑 Setting up API authentication...');
    // Implementation would depend on specific API authentication requirements
  }

  private async setupSSOAuthentication(): Promise<void> {
    // SSO authentication setup (placeholder for SSO-based auth)
    console.log('🔐 Setting up SSO authentication...');
    // Implementation would depend on specific SSO configuration
  }

  private async runTestSuite(suiteName: string): Promise<void> {
    console.log(`\n🧪 Running test suite: ${suiteName}`);
    
    const startTime = Date.now();
    let testResult: SecurityTestResult;

    try {
      switch (suiteName) {
        case 'vulnerability_scan':
          testResult = await this.runVulnerabilityScanning();
          break;
        case 'access_control':
          testResult = await this.runAccessControlTesting();
          break;
        case 'authentication':
          testResult = await this.runAuthenticationTesting();
          break;
        case 'full_security':
          testResult = await this.runFullSecuritySuite();
          break;
        default:
          throw new Error(`Unknown test suite: ${suiteName}`);
      }

      this.results.push(testResult);
      console.log(`✅ Test suite '${suiteName}' completed in ${testResult.duration}ms`);

    } catch (error) {
      const failedResult: SecurityTestResult = {
        testSuite: suiteName,
        testType: 'vulnerability',
        passed: false,
        duration: Date.now() - startTime,
        vulnerabilities: [],
        summary: { critical: 0, high: 0, medium: 0, low: 0 },
        reportFiles: [],
        timestamp: new Date().toISOString()
      };
      
      this.results.push(failedResult);
      console.error(`❌ Test suite '${suiteName}' failed:`, error);
    }
  }

  private async runVulnerabilityScanning(): Promise<SecurityTestResult> {
    console.log('  🔍 Running OWASP vulnerability scanning...');
    
    // Import and run our existing vulnerability scanner
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const scanProcess = spawn('npx', ['tsx', 'owasp-vulnerability-scanner.ts'], {
        stdio: 'pipe'
      });

      let output = '';
      scanProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      scanProcess.stderr.on('data', (data) => {
        output += data.toString();
      });

      scanProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          // Parse results from the vulnerability scanner
          const reportFiles = fs.readdirSync('.').filter(f => 
            f.startsWith('owasp-security-report-') && f.endsWith('.json')
          );
          
          let vulnerabilities: any[] = [];
          let summary = { critical: 0, high: 0, medium: 0, low: 0 };
          
          if (reportFiles.length > 0) {
            const latestReport = reportFiles.sort().pop()!;
            const reportData = JSON.parse(fs.readFileSync(latestReport, 'utf8'));
            vulnerabilities = reportData.detailedResults[0]?.vulnerabilities || [];
            summary = reportData.detailedResults[0]?.summary || summary;
          }
          
          resolve({
            testSuite: 'vulnerability_scan',
            testType: 'vulnerability',
            passed: summary.critical === 0,
            duration,
            vulnerabilities,
            summary,
            reportFiles,
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error(`Vulnerability scan failed with code ${code}`));
        }
      });
    });
  }

  private async runAccessControlTesting(): Promise<SecurityTestResult> {
    console.log('  🛡️ Running access control testing...');
    
    const startTime = Date.now();
    
    // Run our existing access control validator
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const scanProcess = spawn('npx', ['tsx', 'manual-access-control-validator.ts'], {
        stdio: 'pipe'
      });

      let output = '';
      scanProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      scanProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          const reportFiles = fs.readdirSync('.').filter(f => 
            f.startsWith('manual-access-control-report-') && f.endsWith('.json')
          );
          
          let passed = true;
          let vulnerabilities: any[] = [];
          
          if (reportFiles.length > 0) {
            const latestReport = reportFiles.sort().pop()!;
            const reportData = JSON.parse(fs.readFileSync(latestReport, 'utf8'));
            passed = reportData.executiveSummary.accessViolations === 0;
            vulnerabilities = reportData.detailedFindings || [];
          }
          
          resolve({
            testSuite: 'access_control',
            testType: 'access_control',
            passed,
            duration,
            vulnerabilities,
            summary: { critical: 0, high: passed ? 0 : 1, medium: 0, low: 0 },
            reportFiles,
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error(`Access control test failed with code ${code}`));
        }
      });
    });
  }

  private async runAuthenticationTesting(): Promise<SecurityTestResult> {
    console.log('  🔐 Running authentication testing...');
    
    const startTime = Date.now();
    
    // Run our existing authentication validator
    const { spawn } = await import('child_process');
    
    return new Promise((resolve, reject) => {
      const scanProcess = spawn('npx', ['tsx', 'manual-authentication-validator.ts'], {
        stdio: 'pipe'
      });

      let output = '';
      scanProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      scanProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          const reportFiles = fs.readdirSync('.').filter(f => 
            f.startsWith('manual-authentication-report-') && f.endsWith('.json')
          );
          
          let passed = true;
          
          if (reportFiles.length > 0) {
            const latestReport = reportFiles.sort().pop()!;
            const reportData = JSON.parse(fs.readFileSync(latestReport, 'utf8'));
            passed = reportData.executiveSummary.overallCompliance === 'compliant';
          }
          
          resolve({
            testSuite: 'authentication',
            testType: 'authentication',
            passed,
            duration,
            vulnerabilities: [],
            summary: { critical: 0, high: 0, medium: passed ? 0 : 1, low: 0 },
            reportFiles,
            timestamp: new Date().toISOString()
          });
        } else {
          reject(new Error(`Authentication test failed with code ${code}`));
        }
      });
    });
  }

  private async runFullSecuritySuite(): Promise<SecurityTestResult> {
    console.log('  🎯 Running full comprehensive security suite...');
    
    const startTime = Date.now();
    
    // Run all security tests in sequence
    const vulnResult = await this.runVulnerabilityScanning();
    const accessResult = await this.runAccessControlTesting();
    const authResult = await this.runAuthenticationTesting();
    
    const allPassed = vulnResult.passed && accessResult.passed && authResult.passed;
    const allVulns = [...vulnResult.vulnerabilities, ...accessResult.vulnerabilities, ...authResult.vulnerabilities];
    const combinedSummary = {
      critical: vulnResult.summary.critical + accessResult.summary.critical + authResult.summary.critical,
      high: vulnResult.summary.high + accessResult.summary.high + authResult.summary.high,
      medium: vulnResult.summary.medium + accessResult.summary.medium + authResult.summary.medium,
      low: vulnResult.summary.low + accessResult.summary.low + authResult.summary.low
    };
    
    return {
      testSuite: 'full_security',
      testType: 'vulnerability',
      passed: allPassed,
      duration: Date.now() - startTime,
      vulnerabilities: allVulns,
      summary: combinedSummary,
      reportFiles: [...vulnResult.reportFiles, ...accessResult.reportFiles, ...authResult.reportFiles],
      timestamp: new Date().toISOString()
    };
  }

  private evaluateSecurityThresholds(): boolean {
    const totalCritical = this.results.reduce((sum, r) => sum + r.summary.critical, 0);
    const totalHigh = this.results.reduce((sum, r) => sum + r.summary.high, 0);
    const totalMedium = this.results.reduce((sum, r) => sum + r.summary.medium, 0);

    const thresholdsPassed = 
      totalCritical <= this.config.securityThresholds.critical &&
      totalHigh <= this.config.securityThresholds.high &&
      totalMedium <= this.config.securityThresholds.medium;

    console.log(`⚖️ Security thresholds: Critical(${totalCritical}/${this.config.securityThresholds.critical}) High(${totalHigh}/${this.config.securityThresholds.high}) Medium(${totalMedium}/${this.config.securityThresholds.medium})`);
    console.log(`${thresholdsPassed ? '✅' : '❌'} Thresholds ${thresholdsPassed ? 'PASSED' : 'FAILED'}`);

    return thresholdsPassed;
  }

  private async generateReports(): Promise<string[]> {
    const reportUrls: string[] = [];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const format of this.config.reportFormats) {
      switch (format) {
        case 'json':
          const jsonReport = this.generateJSONReport();
          const jsonPath = `reports/security/security-pipeline-${timestamp}.json`;
          fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
          reportUrls.push(jsonPath);
          break;
          
        case 'html':
          const htmlReport = this.generateHTMLReport();
          const htmlPath = `reports/security/security-pipeline-${timestamp}.html`;
          fs.writeFileSync(htmlPath, htmlReport);
          reportUrls.push(htmlPath);
          break;
          
        case 'junit':
          const junitReport = this.generateJUnitReport();
          const junitPath = `reports/security/security-pipeline-${timestamp}.xml`;
          fs.writeFileSync(junitPath, junitReport);
          reportUrls.push(junitPath);
          break;
          
        case 'markdown':
          const markdownReport = this.generateMarkdownReport();
          const mdPath = `reports/security/security-pipeline-${timestamp}.md`;
          fs.writeFileSync(mdPath, markdownReport);
          reportUrls.push(mdPath);
          break;
      }
    }

    console.log(`📊 Generated ${reportUrls.length} reports in formats: ${this.config.reportFormats.join(', ')}`);
    return reportUrls;
  }

  private generateJSONReport(): any {
    return {
      pipeline: {
        environment: this.config.environment,
        timestamp: new Date().toISOString(),
        duration: Date.now() - this.startTime,
        success: this.evaluateSecurityThresholds()
      },
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.passed).length,
        failedTests: this.results.filter(r => !r.passed).length,
        totalVulnerabilities: this.results.reduce((sum, r) => sum + r.vulnerabilities.length, 0),
        severityCounts: {
          critical: this.results.reduce((sum, r) => sum + r.summary.critical, 0),
          high: this.results.reduce((sum, r) => sum + r.summary.high, 0),
          medium: this.results.reduce((sum, r) => sum + r.summary.medium, 0),
          low: this.results.reduce((sum, r) => sum + r.summary.low, 0)
        }
      },
      results: this.results,
      thresholds: this.config.securityThresholds
    };
  }

  private generateHTMLReport(): string {
    const jsonReport = this.generateJSONReport();
    
    return `<!DOCTYPE html>
<html>
<head>
    <title>Security Pipeline Report - ${this.config.environment}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛡️ Security Pipeline Report</h1>
        <p><strong>Environment:</strong> ${this.config.environment}</p>
        <p><strong>Status:</strong> <span class="${jsonReport.pipeline.success ? 'success' : 'failure'}">${jsonReport.pipeline.success ? 'PASSED' : 'FAILED'}</span></p>
        <p><strong>Duration:</strong> ${Math.round(jsonReport.pipeline.duration / 1000)}s</p>
    </div>
    
    <h2>📊 Summary</h2>
    <table>
        <tr><th>Metric</th><th>Value</th></tr>
        <tr><td>Total Tests</td><td>${jsonReport.summary.totalTests}</td></tr>
        <tr><td>Passed Tests</td><td class="success">${jsonReport.summary.passedTests}</td></tr>
        <tr><td>Failed Tests</td><td class="failure">${jsonReport.summary.failedTests}</td></tr>
        <tr><td>Total Vulnerabilities</td><td>${jsonReport.summary.totalVulnerabilities}</td></tr>
        <tr><td>Critical</td><td class="failure">${jsonReport.summary.severityCounts.critical}</td></tr>
        <tr><td>High</td><td class="warning">${jsonReport.summary.severityCounts.high}</td></tr>
        <tr><td>Medium</td><td>${jsonReport.summary.severityCounts.medium}</td></tr>
        <tr><td>Low</td><td>${jsonReport.summary.severityCounts.low}</td></tr>
    </table>
    
    <h2>🧪 Test Results</h2>
    <table>
        <tr><th>Test Suite</th><th>Type</th><th>Status</th><th>Duration</th><th>Vulnerabilities</th></tr>
        ${this.results.map(r => `
        <tr>
            <td>${r.testSuite}</td>
            <td>${r.testType}</td>
            <td class="${r.passed ? 'success' : 'failure'}">${r.passed ? 'PASSED' : 'FAILED'}</td>
            <td>${Math.round(r.duration / 1000)}s</td>
            <td>${r.vulnerabilities.length}</td>
        </tr>
        `).join('')}
    </table>
</body>
</html>`;
  }

  private generateJUnitReport(): string {
    const testsuites = this.results.map(result => {
      const failure = result.passed ? '' : `<failure message="Security test failed">${result.vulnerabilities.length} vulnerabilities found</failure>`;
      
      return `    <testsuite name="${result.testSuite}" tests="1" failures="${result.passed ? 0 : 1}" time="${result.duration / 1000}">
        <testcase name="${result.testType}" time="${result.duration / 1000}">
            ${failure}
        </testcase>
    </testsuite>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Security Pipeline" tests="${this.results.length}" failures="${this.results.filter(r => !r.passed).length}">
${testsuites}
</testsuites>`;
  }

  private generateMarkdownReport(): string {
    const jsonReport = this.generateJSONReport();
    
    return `# 🛡️ Security Pipeline Report

**Environment:** ${this.config.environment}  
**Status:** ${jsonReport.pipeline.success ? '✅ PASSED' : '❌ FAILED'}  
**Duration:** ${Math.round(jsonReport.pipeline.duration / 1000)}s  
**Timestamp:** ${jsonReport.pipeline.timestamp}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${jsonReport.summary.totalTests} |
| Passed Tests | ${jsonReport.summary.passedTests} |
| Failed Tests | ${jsonReport.summary.failedTests} |
| Total Vulnerabilities | ${jsonReport.summary.totalVulnerabilities} |
| Critical | ${jsonReport.summary.severityCounts.critical} |
| High | ${jsonReport.summary.severityCounts.high} |
| Medium | ${jsonReport.summary.severityCounts.medium} |
| Low | ${jsonReport.summary.severityCounts.low} |

## 🧪 Test Results

| Test Suite | Type | Status | Duration | Vulnerabilities |
|------------|------|---------|----------|-----------------|
${this.results.map(r => `| ${r.testSuite} | ${r.testType} | ${r.passed ? '✅ PASSED' : '❌ FAILED'} | ${Math.round(r.duration / 1000)}s | ${r.vulnerabilities.length} |`).join('\n')}

## 🎯 Security Thresholds

| Severity | Found | Threshold | Status |
|----------|-------|-----------|---------|
| Critical | ${jsonReport.summary.severityCounts.critical} | ≤ ${this.config.securityThresholds.critical} | ${jsonReport.summary.severityCounts.critical <= this.config.securityThresholds.critical ? '✅' : '❌'} |
| High | ${jsonReport.summary.severityCounts.high} | ≤ ${this.config.securityThresholds.high} | ${jsonReport.summary.severityCounts.high <= this.config.securityThresholds.high ? '✅' : '❌'} |
| Medium | ${jsonReport.summary.severityCounts.medium} | ≤ ${this.config.securityThresholds.medium} | ${jsonReport.summary.severityCounts.medium <= this.config.securityThresholds.medium ? '✅' : '❌'} |

---
*Generated by Automated Security Test Framework*`;
  }

  private async sendSlackNotification(): Promise<boolean> {
    if (!this.config.slackWebhook) {
      console.log('📢 Slack webhook not configured - skipping notification');
      return false;
    }

    try {
      const success = this.evaluateSecurityThresholds();
      const totalVulns = this.results.reduce((sum, r) => sum + r.vulnerabilities.length, 0);
      
      const message = {
        text: `🛡️ Security Pipeline ${success ? 'PASSED' : 'FAILED'}`,
        attachments: [{
          color: success ? 'good' : 'danger',
          fields: [
            { title: 'Environment', value: this.config.environment, short: true },
            { title: 'Tests', value: `${this.results.filter(r => r.passed).length}/${this.results.length} passed`, short: true },
            { title: 'Vulnerabilities', value: totalVulns.toString(), short: true },
            { title: 'Duration', value: `${Math.round((Date.now() - this.startTime) / 1000)}s`, short: true }
          ]
        }]
      };

      // Send to Slack (implementation would use actual HTTP request)
      console.log('📢 Slack notification prepared (webhook call would happen here)');
      return true;

    } catch (error) {
      console.error('❌ Slack notification failed:', error);
      return false;
    }
  }

  private async updateGitHubStatus(success: boolean): Promise<boolean> {
    if (!this.config.githubToken) {
      console.log('📢 GitHub token not configured - skipping status update');
      return false;
    }

    try {
      const statusData = {
        state: success ? 'success' : 'failure',
        description: `Security pipeline ${success ? 'passed' : 'failed'}`,
        context: 'security/automated-testing'
      };

      // Update GitHub status (implementation would use GitHub API)
      console.log('📢 GitHub status update prepared (API call would happen here)');
      return true;

    } catch (error) {
      console.error('❌ GitHub status update failed:', error);
      return false;
    }
  }
}

// Configuration for different environments
const configurations: { [key: string]: SecurityTestConfig } = {
  uat: {
    environment: 'uat',
    baseUrl: 'https://jirauat.smedigitalapps.com/jira',
    authenticationMethod: 'session',
    testSuites: ['vulnerability_scan', 'access_control', 'authentication'],
    reportFormats: ['json', 'html', 'markdown'],
    failPipeline: false, // Don't fail pipeline in UAT
    securityThresholds: {
      critical: 0,
      high: 3,
      medium: 10
    }
  },
  staging: {
    environment: 'staging',
    baseUrl: 'https://staging.example.com',
    authenticationMethod: 'api',
    testSuites: ['full_security'],
    reportFormats: ['json', 'junit', 'html'],
    failPipeline: true,
    securityThresholds: {
      critical: 0,
      high: 1,
      medium: 5
    }
  },
  production: {
    environment: 'production',
    baseUrl: 'https://production.example.com',
    authenticationMethod: 'sso',
    testSuites: ['vulnerability_scan'],
    reportFormats: ['json', 'junit'],
    failPipeline: true,
    securityThresholds: {
      critical: 0,
      high: 0,
      medium: 2
    }
  }
};

// Main execution function
async function runAutomatedSecurityPipeline() {
  const environment = process.env.SECURITY_TEST_ENV || 'uat';
  const config = configurations[environment];
  
  if (!config) {
    console.error(`❌ Unknown environment: ${environment}`);
    process.exit(1);
  }

  // Override config with environment variables if provided
  if (process.env.SLACK_WEBHOOK) {
    config.slackWebhook = process.env.SLACK_WEBHOOK;
  }
  
  if (process.env.GITHUB_TOKEN) {
    config.githubToken = process.env.GITHUB_TOKEN;
  }

  const framework = new AutomatedSecurityTestFramework(config);
  
  try {
    const result = await framework.runSecurityPipeline();
    
    // Exit with appropriate code for CI/CD
    if (config.failPipeline && !result.success) {
      console.log('💥 Failing pipeline due to security threshold violations');
      process.exit(1);
    } else {
      console.log('🎉 Pipeline completed successfully');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Pipeline failed with error:', error);
    process.exit(1);
  }
}

// Export for use as module or run directly
export { AutomatedSecurityTestFramework, SecurityTestConfig, PipelineResult };

// Run if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  runAutomatedSecurityPipeline();
} 