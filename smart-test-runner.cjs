const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execAsync = promisify(exec);

class SmartTestRunner {
  constructor() {
    this.results = {
      startTime: new Date().toISOString(),
      testSuites: [],
      totalTests: 0,
      passed: 0,
      failed: 0,
      authFailures: 0,
      functionalFailures: 0,
      retries: 0,
      screenshots: []
    };
    
    this.authErrorPatterns = [
      'locator.click: Timeout',
      'waiting for locator',
      'Page not found',
      'Login',
      'Authentication',
      'Access denied',
      'Unauthorized',
      'Session',
      'JSESSIONID'
    ];
    
    this.testSuites = [
      'tests/comprehensive-ui-coverage.spec.ts',
      'tests/enterprise-comprehensive-test-suite.spec.ts',
      'tests/owasp-security-comprehensive.spec.ts',
      'tests/web-essentials-comprehensive.spec.ts',
      'tests/jira-10.3-upgrade-focused-tests.spec.ts',
      'tests/modern-jira-testing-suite.spec.ts',
      'tests/session-based-comprehensive-test.spec.ts',
      'tests/comprehensive-upgrade-test.spec.ts',
      'tests/itsm.spec.ts'
    ];
  }

  isAuthFailure(errorOutput) {
    return this.authErrorPatterns.some(pattern => 
      errorOutput.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  async checkAuthStatus() {
    try {
      // Quick auth check by looking for current session
      if (!fs.existsSync('current-session.json')) {
        console.log('❌ No session file found - potential auth issue');
        return false;
      }
      
      const sessionData = JSON.parse(fs.readFileSync('current-session.json', 'utf8'));
      const isValid = sessionData.cookies && sessionData.cookies.length > 0;
      
      if (!isValid) {
        console.log('❌ Invalid session data - auth issue detected');
        return false;
      }
      
      console.log('✅ Session appears valid');
      return true;
    } catch (error) {
      console.log('❌ Auth check failed:', error.message);
      return false;
    }
  }

  async collectScreenshots(testResultsDir) {
    const screenshots = [];
    
    if (fs.existsSync(testResultsDir)) {
      const files = fs.readdirSync(testResultsDir, { recursive: true });
      
      for (const file of files) {
        if (file.endsWith('.png')) {
          const fullPath = path.join(testResultsDir, file);
          const stats = fs.statSync(fullPath);
          
          screenshots.push({
            filename: file,
            path: fullPath,
            size: stats.size,
            timestamp: stats.mtime.toISOString()
          });
        }
      }
    }
    
    return screenshots;
  }

  async runTestSuite(testFile, maxRetries = 2) {
    const suiteName = path.basename(testFile, '.spec.ts');
    console.log(`\n🚀 Running ${suiteName}...`);
    
    const suiteResult = {
      name: suiteName,
      file: testFile,
      startTime: new Date().toISOString(),
      attempts: [],
      finalStatus: 'pending'
    };

    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      console.log(`\n🔄 Attempt ${attempt}/${maxRetries + 1} for ${suiteName}`);
      
      const attemptResult = await this.runSingleAttempt(testFile, attempt);
      suiteResult.attempts.push(attemptResult);
      
      // If successful, break
      if (attemptResult.exitCode === 0) {
        suiteResult.finalStatus = 'passed';
        console.log(`✅ ${suiteName} PASSED on attempt ${attempt}!`);
        break;
      }
      
      // Analyze failure type
      const isAuth = this.isAuthFailure(attemptResult.stderr + attemptResult.stdout);
      
      if (isAuth) {
        console.log(`🔐 AUTH FAILURE detected in ${suiteName} - checking session...`);
        this.results.authFailures++;
        
        const authOk = await this.checkAuthStatus();
        if (!authOk && attempt < maxRetries + 1) {
          console.log(`⚠️  Will retry ${suiteName} after auth check...`);
          await this.sleep(5000); // Wait 5 seconds before retry
          continue;
        }
      } else {
        console.log(`🐛 FUNCTIONAL FAILURE in ${suiteName}`);
        this.results.functionalFailures++;
      }
      
      // If this was the last attempt, mark as failed
      if (attempt === maxRetries + 1) {
        suiteResult.finalStatus = 'failed';
        console.log(`❌ ${suiteName} FAILED after ${attempt} attempts`);
      } else {
        this.results.retries++;
        console.log(`🔄 Retrying ${suiteName} in 3 seconds...`);
        await this.sleep(3000);
      }
    }
    
    suiteResult.endTime = new Date().toISOString();
    this.results.testSuites.push(suiteResult);
    
    // Collect screenshots from this test run
    const screenshots = await this.collectScreenshots('test-results');
    this.results.screenshots.push(...screenshots);
    
    return suiteResult;
  }

  async runSingleAttempt(testFile, attemptNumber) {
    const startTime = Date.now();
    
    try {
      const command = `npx playwright test "${testFile}" --headed --max-failures=10 --reporter=json`;
      console.log(`🎯 Executing: ${command}`);
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 600000, // 10 minute timeout per suite
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      return {
        attemptNumber,
        exitCode: 0,
        duration: Date.now() - startTime,
        stdout,
        stderr,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        attemptNumber,
        exitCode: error.code || 1,
        duration: Date.now() - startTime,
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async saveResults() {
    this.results.endTime = new Date().toISOString();
    this.results.totalDuration = new Date(this.results.endTime) - new Date(this.results.startTime);
    
    // Create comprehensive results file
    const resultsFile = `test-results/smart-runner-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results', { recursive: true });
    }
    
    fs.writeFileSync(resultsFile, JSON.stringify(this.results, null, 2));
    
    // Create summary report
    const summary = this.generateSummary();
    const summaryFile = `test-results/summary-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`;
    fs.writeFileSync(summaryFile, summary);
    
    console.log(`\n📊 Results saved to: ${resultsFile}`);
    console.log(`📋 Summary saved to: ${summaryFile}`);
    
    return { resultsFile, summaryFile };
  }

  generateSummary() {
    const passedSuites = this.results.testSuites.filter(s => s.finalStatus === 'passed').length;
    const failedSuites = this.results.testSuites.filter(s => s.finalStatus === 'failed').length;
    
    return `# 🎯 JIRA UAT Testing - Smart Runner Results

## 📊 Executive Summary

- **Start Time**: ${this.results.startTime}
- **End Time**: ${this.results.endTime}
- **Total Duration**: ${Math.round(this.results.totalDuration / 1000 / 60)} minutes

## 🏆 Test Suite Results

- **Total Suites**: ${this.results.testSuites.length}
- **Passed Suites**: ${passedSuites} ✅
- **Failed Suites**: ${failedSuites} ❌
- **Success Rate**: ${Math.round((passedSuites / this.results.testSuites.length) * 100)}%

## 🔍 Failure Analysis

- **Authentication Failures**: ${this.results.authFailures} 🔐
- **Functional Failures**: ${this.results.functionalFailures} 🐛
- **Total Retries**: ${this.results.retries} 🔄

## 📸 Screenshots Captured

- **Total Screenshots**: ${this.results.screenshots.length}
- **Total Size**: ${Math.round(this.results.screenshots.reduce((sum, s) => sum + s.size, 0) / 1024 / 1024)} MB

## 📋 Detailed Results

${this.results.testSuites.map(suite => `
### ${suite.name} - ${suite.finalStatus.toUpperCase()}

- **File**: ${suite.file}
- **Attempts**: ${suite.attempts.length}
- **Duration**: ${suite.endTime ? Math.round((new Date(suite.endTime) - new Date(suite.startTime)) / 1000) : 'N/A'} seconds

${suite.attempts.map((attempt, i) => `
**Attempt ${attempt.attemptNumber}**: ${attempt.exitCode === 0 ? '✅ PASSED' : '❌ FAILED'} (${Math.round(attempt.duration / 1000)}s)
`).join('')}
`).join('')}

---
Generated by Smart Test Runner 🤖
`;
  }

  async runAllTests() {
    console.log('🚀 SMART TEST RUNNER INITIATED!');
    console.log(`📋 Running ${this.testSuites.length} test suites with retry logic...`);
    
    // Initial auth check
    await this.checkAuthStatus();
    
    for (const testFile of this.testSuites) {
      if (fs.existsSync(testFile)) {
        await this.runTestSuite(testFile);
      } else {
        console.log(`⚠️  Test file not found: ${testFile}`);
      }
      
      // Brief pause between suites
      await this.sleep(2000);
    }
    
    const { resultsFile, summaryFile } = await this.saveResults();
    
    console.log('\n🎉 SMART TEST RUNNER COMPLETE!');
    console.log(`📊 Check results: ${resultsFile}`);
    console.log(`📋 Summary: ${summaryFile}`);
    
    return this.results;
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new SmartTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = SmartTestRunner; 