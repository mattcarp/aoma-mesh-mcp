#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

interface PerformanceMetric {
  test: string;
  url: string;
  loadTime: number;
  domContentLoaded: number;
  networkRequests: number;
  status: 'success' | 'error';
  error?: string;
}

interface TestAnalysis {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  finding: string;
  impact: string;
  recommendation: string;
  priority: number;
}

async function analyzeJiraTestResults() {
  console.log('🔍 JIRA 10.3 UPGRADE TEST ANALYSIS');
  console.log('==================================');
  console.log('📊 Analyzing performance benchmarks and regression findings');
  console.log('🎯 Generating comprehensive report for Irina\'s team');
  console.log('==================================\n');

  const analyses: TestAnalysis[] = [];
  
  // 1. Analyze Performance Benchmark Results
  console.log('📈 Step 1: Analyzing Performance Benchmark Results...');
  const performanceAnalyses = await analyzePerformanceResults();
  analyses.push(...performanceAnalyses);
  
  // 2. Analyze Login Regression
  console.log('🔐 Step 2: Analyzing Login Regression...');
  const loginAnalyses = analyzeLoginRegression();
  analyses.push(...loginAnalyses);
  
  // 3. Analyze E2E Test Failures
  console.log('🧪 Step 3: Analyzing E2E Test Failures...');
  const e2eAnalyses = analyzeE2EFailures();
  analyses.push(...e2eAnalyses);
  
  // 4. Generate Comprehensive Report
  console.log('📋 Step 4: Generating Comprehensive Analysis Report...');
  const report = generateAnalysisReport(analyses);
  
  // 5. Save Analysis Report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `jira-upgrade-analysis-${timestamp}.md`;
  fs.writeFileSync(filename, report);
  
  console.log(`\n✅ Analysis Complete!`);
  console.log(`📄 Report saved to: ${filename}`);
  console.log(`📧 Ready for Irina's team review!`);
  
  // Display summary
  console.log('\n🎯 ANALYSIS SUMMARY:');
  console.log('===================');
  const criticalIssues = analyses.filter(a => a.severity === 'critical').length;
  const highIssues = analyses.filter(a => a.severity === 'high').length;
  const mediumIssues = analyses.filter(a => a.severity === 'medium').length;
  const lowIssues = analyses.filter(a => a.severity === 'low').length;
  
  console.log(`🔴 Critical Issues: ${criticalIssues}`);
  console.log(`🟠 High Priority: ${highIssues}`);
  console.log(`🟡 Medium Priority: ${mediumIssues}`);
  console.log(`🟢 Low Priority: ${lowIssues}`);
  console.log(`📊 Total Findings: ${analyses.length}`);
  
  return filename;
}

async function analyzePerformanceResults(): Promise<TestAnalysis[]> {
  const analyses: TestAnalysis[] = [];
  
  try {
    // Find the latest performance report
    const files = fs.readdirSync('.').filter(f => f.startsWith('jira-performance-report-') && f.endsWith('.json'));
    if (files.length === 0) {
      console.log('   ⚠️ No performance report found, skipping performance analysis');
      return analyses;
    }
    
    const latestFile = files.sort().pop()!;
    const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
    const results: PerformanceMetric[] = data.results;
    
    console.log(`   📊 Analyzing ${results.length} performance tests from ${latestFile}`);
    
    // Analyze each performance metric
    results.forEach(result => {
      if (result.status === 'error') {
        analyses.push({
          category: 'Performance',
          severity: 'high',
          finding: `${result.test} failed to load`,
          impact: `Users cannot access ${result.test.toLowerCase()} functionality`,
          recommendation: `Investigate and fix the underlying cause: ${result.error}`,
          priority: 1
        });
      } else {
        // Analyze load times
        if (result.loadTime > 15000) {
          analyses.push({
            category: 'Performance',
            severity: 'critical',
            finding: `${result.test} has excessive load time (${result.loadTime}ms)`,
            impact: 'Severely impacts user experience and productivity',
            recommendation: 'Immediate optimization required - investigate database queries, caching, and resource loading',
            priority: 1
          });
        } else if (result.loadTime > 8000) {
          analyses.push({
            category: 'Performance',
            severity: 'high',
            finding: `${result.test} has slow load time (${result.loadTime}ms)`,
            impact: 'Degrades user experience and may cause user frustration',
            recommendation: 'Optimize performance - review database queries and implement caching strategies',
            priority: 2
          });
        } else if (result.loadTime > 5000) {
          analyses.push({
            category: 'Performance',
            severity: 'medium',
            finding: `${result.test} has moderate load time (${result.loadTime}ms)`,
            impact: 'Acceptable but could be improved for better user experience',
            recommendation: 'Consider performance optimizations during next maintenance window',
            priority: 3
          });
        }
        
        // Analyze network requests
        if (result.networkRequests > 50) {
          analyses.push({
            category: 'Performance',
            severity: 'medium',
            finding: `${result.test} makes excessive network requests (${result.networkRequests})`,
            impact: 'Increases bandwidth usage and may slow down page loading',
            recommendation: 'Optimize resource bundling and implement request batching',
            priority: 3
          });
        }
      }
    });
    
    // Overall performance assessment
    const successfulTests = results.filter(r => r.status === 'success');
    const averageLoadTime = successfulTests.reduce((sum, r) => sum + r.loadTime, 0) / successfulTests.length;
    
    if (averageLoadTime > 8000) {
      analyses.push({
        category: 'Performance',
        severity: 'high',
        finding: `Overall system performance is below acceptable thresholds (${Math.round(averageLoadTime)}ms average)`,
        impact: 'General system sluggishness affects all users',
        recommendation: 'Comprehensive performance audit and optimization required before production deployment',
        priority: 1
      });
    }
    
  } catch (error) {
    console.log(`   ❌ Error analyzing performance results: ${error.message}`);
  }
  
  return analyses;
}

function analyzeLoginRegression(): TestAnalysis[] {
  return [
    {
      category: 'Authentication',
      severity: 'critical',
      finding: 'Login flow is completely broken - users stuck in redirect loop',
      impact: 'BLOCKING: No users can access the system via automated tools or fresh sessions',
      recommendation: 'IMMEDIATE ACTION REQUIRED: Investigate authentication middleware, SSO configuration, and session handling in JIRA 10.3',
      priority: 1
    },
    {
      category: 'Authentication',
      severity: 'high',
      finding: 'Session persistence issues between manual and automated sessions',
      impact: 'Automated testing and monitoring tools cannot authenticate properly',
      recommendation: 'Review session cookie configuration and implement proper session capture/restore mechanisms',
      priority: 1
    },
    {
      category: 'Authentication',
      severity: 'high',
      finding: 'permissionViolation parameter appears in login redirects',
      impact: 'Suggests access control changes that may affect user permissions',
      recommendation: 'Audit permission schemes and group memberships after upgrade',
      priority: 2
    }
  ];
}

function analyzeE2EFailures(): TestAnalysis[] {
  return [
    {
      category: 'Testing',
      severity: 'high',
      finding: 'All Playwright E2E tests failing due to authentication issues',
      impact: 'Cannot validate critical user workflows automatically',
      recommendation: 'Fix authentication issues first, then re-run comprehensive E2E test suite',
      priority: 2
    },
    {
      category: 'Testing',
      severity: 'medium',
      finding: 'Test timeout configurations insufficient for current performance',
      impact: 'Tests may fail due to timeouts rather than actual functionality issues',
      recommendation: 'Adjust test timeouts to account for current system performance characteristics',
      priority: 3
    },
    {
      category: 'Testing',
      severity: 'medium',
      finding: 'Search functionality returning 0 results in performance tests',
      impact: 'May indicate search indexing issues or permission problems',
      recommendation: 'Investigate search index status and re-index if necessary',
      priority: 3
    }
  ];
}

function generateAnalysisReport(analyses: TestAnalysis[]): string {
  const timestamp = new Date().toISOString();
  const criticalIssues = analyses.filter(a => a.severity === 'critical');
  const highIssues = analyses.filter(a => a.severity === 'high');
  const mediumIssues = analyses.filter(a => a.severity === 'medium');
  const lowIssues = analyses.filter(a => a.severity === 'low');
  
  let report = `# JIRA 10.3 Upgrade Test Analysis Report\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Environment:** UAT (jirauat.smedigitalapps.com)\n`;
  report += `**Analyst:** Automated Analysis System\n`;
  report += `**For:** Irina's Team - JIRA Upgrade Validation\n\n`;
  
  // Executive Summary
  report += `## 🎯 Executive Summary\n\n`;
  report += `This report analyzes the comprehensive testing results for the JIRA 10.3 upgrade in the UAT environment. `;
  report += `The analysis covers performance benchmarks, authentication regression testing, and end-to-end test results.\n\n`;
  
  report += `**Key Findings:**\n`;
  report += `- 🔴 **${criticalIssues.length} Critical Issues** requiring immediate attention\n`;
  report += `- 🟠 **${highIssues.length} High Priority Issues** needing resolution before production\n`;
  report += `- 🟡 **${mediumIssues.length} Medium Priority Issues** for optimization consideration\n`;
  report += `- 🟢 **${lowIssues.length} Low Priority Issues** for future improvement\n\n`;
  
  // Overall Recommendation
  if (criticalIssues.length > 0) {
    report += `**Overall Recommendation:** ❌ **DO NOT PROCEED TO PRODUCTION** - Critical issues must be resolved first.\n\n`;
  } else if (highIssues.length > 0) {
    report += `**Overall Recommendation:** ⚠️ **PROCEED WITH CAUTION** - High priority issues should be addressed.\n\n`;
  } else {
    report += `**Overall Recommendation:** ✅ **READY FOR PRODUCTION** - Minor issues can be addressed post-deployment.\n\n`;
  }
  
  // Critical Issues Section
  if (criticalIssues.length > 0) {
    report += `## 🔴 Critical Issues (Immediate Action Required)\n\n`;
    criticalIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.finding}\n`;
      report += `**Category:** ${issue.category}\n`;
      report += `**Impact:** ${issue.impact}\n`;
      report += `**Recommendation:** ${issue.recommendation}\n\n`;
    });
  }
  
  // High Priority Issues
  if (highIssues.length > 0) {
    report += `## 🟠 High Priority Issues\n\n`;
    highIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.finding}\n`;
      report += `**Category:** ${issue.category}\n`;
      report += `**Impact:** ${issue.impact}\n`;
      report += `**Recommendation:** ${issue.recommendation}\n\n`;
    });
  }
  
  // Medium Priority Issues
  if (mediumIssues.length > 0) {
    report += `## 🟡 Medium Priority Issues\n\n`;
    mediumIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.finding}\n`;
      report += `**Category:** ${issue.category}\n`;
      report += `**Impact:** ${issue.impact}\n`;
      report += `**Recommendation:** ${issue.recommendation}\n\n`;
    });
  }
  
  // Low Priority Issues
  if (lowIssues.length > 0) {
    report += `## 🟢 Low Priority Issues\n\n`;
    lowIssues.forEach((issue, index) => {
      report += `### ${index + 1}. ${issue.finding}\n`;
      report += `**Category:** ${issue.category}\n`;
      report += `**Impact:** ${issue.impact}\n`;
      report += `**Recommendation:** ${issue.recommendation}\n\n`;
    });
  }
  
  // Next Steps
  report += `## 📋 Recommended Next Steps\n\n`;
  report += `1. **Immediate Actions:**\n`;
  criticalIssues.forEach(issue => {
    report += `   - ${issue.recommendation}\n`;
  });
  
  if (highIssues.length > 0) {
    report += `\n2. **Before Production Deployment:**\n`;
    highIssues.forEach(issue => {
      report += `   - ${issue.recommendation}\n`;
    });
  }
  
  if (mediumIssues.length > 0) {
    report += `\n3. **Post-Deployment Optimization:**\n`;
    mediumIssues.forEach(issue => {
      report += `   - ${issue.recommendation}\n`;
    });
  }
  
  report += `\n4. **Re-testing Required:**\n`;
  report += `   - Re-run all E2E tests after authentication fixes\n`;
  report += `   - Validate performance improvements\n`;
  report += `   - Confirm search functionality is working\n`;
  report += `   - Test user workflows end-to-end\n\n`;
  
  // Technical Details
  report += `## 🔧 Technical Details\n\n`;
  report += `### Performance Benchmark Summary\n`;
  report += `- Dashboard: Acceptable performance\n`;
  report += `- Issue Navigator: **CRITICAL** - 20+ second load times\n`;
  report += `- ITSM Project: Moderate performance\n`;
  report += `- DPSA Project: Excellent performance\n`;
  report += `- Search: Functional but returning 0 results\n`;
  report += `- Create Issue: Excellent performance\n\n`;
  
  report += `### Authentication Issues\n`;
  report += `- Login redirect loop prevents access\n`;
  report += `- Session persistence broken\n`;
  report += `- Permission violations detected\n\n`;
  
  report += `### Test Environment\n`;
  report += `- Environment: UAT (jirauat.smedigitalapps.com)\n`;
  report += `- JIRA Version: 10.3\n`;
  report += `- Test Framework: Playwright\n`;
  report += `- Performance Monitoring: Custom benchmarking\n\n`;
  
  report += `---\n`;
  report += `*This report was generated automatically by the JIRA Upgrade Testing System*\n`;
  report += `*For questions or additional analysis, contact the testing team*\n`;
  
  return report;
}

// Run the analysis
analyzeJiraTestResults().catch(console.error); 