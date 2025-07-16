#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

interface TestResult {
  testName: string;
  category: string;
  status: 'pass' | 'fail';
  duration: number;
  error?: string;
  details?: string;
}

interface TestReport {
  testSuite: string;
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  testResults: TestResult[];
  performanceMetrics: any;
  summary: any;
}

function generateExecutiveReport(reportPath: string) {
  console.log('📊 GENERATING EXECUTIVE REPORT FOR IRINA');
  console.log('========================================');
  
  // Read the test results
  const reportData: TestReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  
  const passRate = ((reportData.passedTests / reportData.totalTests) * 100).toFixed(1);
  const failRate = ((reportData.failedTests / reportData.totalTests) * 100).toFixed(1);
  
  // Group results by category
  const categoryStats = Object.entries(reportData.summary).map(([category, tests]: [string, any]) => {
    const passed = tests.filter((t: TestResult) => t.status === 'pass').length;
    const failed = tests.filter((t: TestResult) => t.status === 'fail').length;
    const total = tests.length;
    const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
    
    return {
      category: category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      passed,
      failed,
      total,
      passRate: parseFloat(passRate)
    };
  });
  
  // Generate the executive report
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportContent = `
# JIRA 10.3 UPGRADE VALIDATION REPORT
## Executive Summary for Production Release Readiness

---

**Report Generated:** ${new Date(reportData.timestamp).toLocaleString()}  
**Test Suite:** ${reportData.testSuite}  
**Environment:** JIRA UAT (jirauat.smedigitalapps.com)  
**Scope:** Post-upgrade functionality validation and performance assessment

---

## 📋 EXECUTIVE SUMMARY

### Overall Test Results
- **Total Tests Executed:** ${reportData.totalTests}
- **Passed:** ${reportData.passedTests} (${passRate}%)
- **Failed:** ${reportData.failedTests} (${failRate}%)
- **Overall System Health:** ${passRate >= '80' ? '🟢 HEALTHY' : passRate >= '60' ? '🟡 CONCERNING' : '🔴 CRITICAL'}

### Key Findings
${reportData.failedTests === 0 
  ? '✅ **All tests passed successfully** - JIRA 10.3 upgrade shows excellent stability and functionality.'
  : reportData.failedTests <= 2 
    ? `⚠️ **${reportData.failedTests} minor issues identified** - System is generally stable with minor issues that should be addressed before production.`
    : `🚨 **${reportData.failedTests} issues require attention** - Multiple areas need investigation before production deployment.`
}

### Production Readiness Assessment
${passRate >= '90' 
  ? '🟢 **RECOMMENDED FOR PRODUCTION** - System demonstrates high reliability and performance.'
  : passRate >= '75' 
    ? '🟡 **CONDITIONAL APPROVAL** - Address identified issues before production deployment.'
    : '🔴 **NOT RECOMMENDED** - Significant issues require resolution before production release.'
}

---

## 📊 TEST CATEGORIES & PASS/FAIL RATES

| Category | Tests | Passed | Failed | Pass Rate | Status |
|----------|-------|--------|--------|-----------|---------|
${categoryStats.map(cat => 
  `| ${cat.category} | ${cat.total} | ${cat.passed} | ${cat.failed} | ${cat.passRate}% | ${cat.passRate >= 90 ? '✅' : cat.passRate >= 70 ? '⚠️' : '❌'} |`
).join('\n')}

### Category Performance Analysis
${categoryStats.map(cat => {
  const status = cat.passRate >= 90 ? 'Excellent' : cat.passRate >= 70 ? 'Good' : cat.passRate >= 50 ? 'Needs Attention' : 'Critical';
  return `- **${cat.category}**: ${status} (${cat.passRate}% pass rate)`;
}).join('\n')}

---

## 🧪 AUTOMATED TEST RESULTS

<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">

### Test Execution Summary
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
<thead style="background-color: #e9ecef;">
<tr style="border-bottom: 2px solid #dee2e6;">
<th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Test Name</th>
<th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Category</th>
<th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Status</th>
<th style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">Duration</th>
<th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Details</th>
</tr>
</thead>
<tbody>
${reportData.testResults.map(test => `
<tr style="border-bottom: 1px solid #dee2e6; ${test.status === 'fail' ? 'background-color: #fff5f5;' : ''}">
<td style="padding: 12px; border: 1px solid #dee2e6; font-weight: ${test.status === 'fail' ? 'bold' : 'normal'};">${test.testName}</td>
<td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${test.category}</td>
<td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">
  <span style="padding: 4px 8px; border-radius: 4px; color: white; background-color: ${test.status === 'pass' ? '#28a745' : '#dc3545'};">
    ${test.status === 'pass' ? '✅ PASS' : '❌ FAIL'}
  </span>
</td>
<td style="padding: 12px; text-align: center; border: 1px solid #dee2e6;">${(test.duration / 1000).toFixed(1)}s</td>
<td style="padding: 12px; border: 1px solid #dee2e6; font-size: 0.9em;">${test.details || test.error?.substring(0, 100) || 'No additional details'}</td>
</tr>`).join('')}
</tbody>
</table>

### Summary Statistics
<div style="display: flex; justify-content: space-around; margin: 20px 0;">
<div style="text-align: center; padding: 15px; background-color: #d4edda; border-radius: 8px; border: 1px solid #c3e6cb;">
<h4 style="margin: 0; color: #155724;">✅ Passed Tests</h4>
<div style="font-size: 2em; font-weight: bold; color: #155724;">${reportData.passedTests}</div>
<div style="color: #155724;">out of ${reportData.totalTests} total</div>
</div>
<div style="text-align: center; padding: 15px; background-color: ${reportData.failedTests > 0 ? '#f8d7da' : '#d4edda'}; border-radius: 8px; border: 1px solid ${reportData.failedTests > 0 ? '#f5c6cb' : '#c3e6cb'};">
<h4 style="margin: 0; color: ${reportData.failedTests > 0 ? '#721c24' : '#155724'};">${reportData.failedTests > 0 ? '❌' : '✅'} Failed Tests</h4>
<div style="font-size: 2em; font-weight: bold; color: ${reportData.failedTests > 0 ? '#721c24' : '#155724'};">${reportData.failedTests}</div>
<div style="color: ${reportData.failedTests > 0 ? '#721c24' : '#155724'};">${failRate}% failure rate</div>
</div>
</div>

</div>

---

## 📝 ADDENDUM: FAILED TEST ANALYSIS

${reportData.failedTests === 0 
  ? '🎉 **No failed tests to report!** All automated tests passed successfully, indicating excellent system stability and functionality after the JIRA 10.3 upgrade.'
  : `### Human-Readable Scripts for Failed Tests

The following tests failed during execution. Each entry includes the test purpose, what went wrong, and recommended actions:

${reportData.testResults
  .filter(test => test.status === 'fail')
  .map((test, index) => `
#### ${index + 1}. ${test.testName}

**Purpose:** ${getTestPurpose(test.testName)}

**What Happened:** ${test.error ? formatError(test.error) : 'Test failed without specific error details.'}

**Impact:** ${getTestImpact(test.category, test.testName)}

**Recommended Action:** ${getRecommendedAction(test.testName, test.category)}

**Technical Details:**
\`\`\`
Test Category: ${test.category}
Duration: ${(test.duration / 1000).toFixed(1)} seconds
Error Details: ${test.error || 'No specific error captured'}
Additional Info: ${test.details || 'No additional details available'}
\`\`\`

---`).join('')}

### Priority Recommendations

${generatePriorityRecommendations(reportData.testResults.filter(test => test.status === 'fail'))}
`}

---

## 🚀 NEXT STEPS & RECOMMENDATIONS

### Immediate Actions Required
${reportData.failedTests === 0 
  ? '✅ **No immediate actions required** - System is ready for production deployment.'
  : generateImmediateActions(reportData.testResults.filter(test => test.status === 'fail'))
}

### Performance Optimization Opportunities
${generatePerformanceRecommendations(reportData.performanceMetrics)}

### Long-term Monitoring
- Set up automated monitoring for key JIRA 10.3 features
- Establish performance baselines based on current test results
- Schedule regular regression testing post-deployment
- Monitor user feedback for any unreported issues

---

**Report prepared by:** Automated Testing Suite  
**Review recommended by:** Technical Team  
**For questions contact:** Development Team

---

*This report was automatically generated based on comprehensive testing of the JIRA 10.3 upgrade environment. All test results are based on actual system behavior and performance metrics.*
`;

  // Save the executive report
  const reportFileName = `JIRA-10.3-Executive-Report-${timestamp}.md`;
  fs.writeFileSync(reportFileName, reportContent);
  
  console.log(`✅ Executive Report Generated: ${reportFileName}`);
  console.log(`📊 Summary: ${reportData.passedTests}/${reportData.totalTests} tests passed (${passRate}%)`);
  
  return reportFileName;
}

function getTestPurpose(testName: string): string {
  const purposes: { [key: string]: string } = {
    'Dashboard Core Functionality': 'Verify that the main JIRA dashboard loads correctly and displays essential elements like projects and navigation after the 10.3 upgrade.',
    'Issue Navigator & Search': 'Test the enhanced search capabilities and issue navigation features introduced in JIRA 10.3.',
    'Project Management Features': 'Validate that project listing, navigation, and management functions work properly in the upgraded environment.',
    'Administration Panel Access': 'Check accessibility and functionality of administrative features, ensuring proper permission handling.',
    'Reports & Dashboard Analytics': 'Verify that reporting features and dashboard analytics function correctly with the new JIRA version.',
    'User Profile & Settings': 'Test user profile management and settings functionality to ensure user experience remains intact.',
    'REST API Compatibility': 'Validate that JIRA\'s REST API endpoints maintain compatibility after the upgrade.',
    'Mobile Responsiveness': 'Ensure that JIRA maintains proper functionality and display across different mobile device sizes.'
  };
  return purposes[testName] || 'Validate system functionality after JIRA 10.3 upgrade.';
}

function formatError(error: string): string {
  if (error.includes('timeout')) {
    return 'The test timed out, indicating the system took longer than expected to respond or load.';
  }
  if (error.includes('not visible') || error.includes('not found')) {
    return 'Expected page elements were not found or not visible, suggesting UI changes or loading issues.';
  }
  if (error.includes('network')) {
    return 'Network connectivity issues were encountered during the test execution.';
  }
  if (error.includes('permission') || error.includes('unauthorized')) {
    return 'Access permission issues were encountered, which may be expected for certain administrative functions.';
  }
  return error.length > 200 ? error.substring(0, 200) + '...' : error;
}

function getTestImpact(category: string, testName: string): string {
  if (category === 'Core Features') {
    return 'HIGH - Core functionality issues affect primary user workflows and system usability.';
  }
  if (category === 'Search & Navigation') {
    return 'HIGH - Search and navigation are critical for user productivity and task completion.';
  }
  if (category === 'Administration') {
    return 'MEDIUM - Administrative functions impact system management but not end-user experience.';
  }
  if (category === 'User Experience') {
    return 'MEDIUM - User experience issues affect satisfaction but may not block core functionality.';
  }
  if (category === 'API Integration') {
    return 'MEDIUM - API issues may affect integrations and automated tools but not direct user access.';
  }
  return 'MEDIUM - Issue requires investigation to determine full impact scope.';
}

function getRecommendedAction(testName: string, category: string): string {
  if (testName.includes('Dashboard')) {
    return 'Investigate dashboard loading performance and verify all required elements are properly configured in JIRA 10.3.';
  }
  if (testName.includes('Search') || testName.includes('Navigator')) {
    return 'Check search indexing and ensure JIRA 10.3 search enhancements are properly configured and functional.';
  }
  if (testName.includes('Project')) {
    return 'Verify project permissions and configurations are correctly migrated to JIRA 10.3 structure.';
  }
  if (testName.includes('Admin')) {
    return 'Review administrative access permissions and ensure proper role-based access control in the upgraded system.';
  }
  if (testName.includes('API')) {
    return 'Test API endpoints manually and check for any breaking changes in JIRA 10.3 REST API specification.';
  }
  if (testName.includes('Mobile')) {
    return 'Review responsive design implementation and test on actual mobile devices to confirm proper functionality.';
  }
  return 'Conduct manual testing to reproduce the issue and identify specific areas requiring attention.';
}

function generatePriorityRecommendations(failedTests: TestResult[]): string {
  if (failedTests.length === 0) return 'No priority recommendations - all tests passed successfully.';
  
  const coreFeatureFailures = failedTests.filter(t => t.category === 'Core Features');
  const searchFailures = failedTests.filter(t => t.category === 'Search & Navigation');
  
  const recommendations: string[] = [];
  
  if (coreFeatureFailures.length > 0) {
    recommendations.push('🔴 **CRITICAL**: Address core feature failures immediately as they impact primary user workflows.');
  }
  
  if (searchFailures.length > 0) {
    recommendations.push('🟡 **HIGH**: Resolve search and navigation issues to maintain user productivity.');
  }
  
  if (failedTests.length > 3) {
    recommendations.push('⚠️ **REVIEW**: Multiple failures suggest need for comprehensive system review before production.');
  }
  
  return recommendations.join('\n');
}

function generateImmediateActions(failedTests: TestResult[]): string {
  if (failedTests.length === 0) return '';
  
  const actions = [
    '1. **Immediate Investigation**: Reproduce failed tests manually to understand root causes',
    '2. **Impact Assessment**: Determine if failures are test environment specific or actual issues',
    '3. **Fix Implementation**: Address identified issues based on priority and impact',
    '4. **Re-testing**: Run tests again after fixes to confirm resolution',
    '5. **Documentation**: Update any configuration or process documentation as needed'
  ];
  
  return actions.join('\n');
}

function generatePerformanceRecommendations(performanceMetrics: any): string {
  const recommendations: string[] = [];
  
  Object.entries(performanceMetrics).forEach(([page, metrics]: [string, any]) => {
    if (metrics.pageLoadTime > 8000) {
      recommendations.push(`- **${page}**: Page load time (${(metrics.pageLoadTime / 1000).toFixed(1)}s) exceeds recommended 8-second threshold`);
    }
    if (metrics.jsErrors > 0) {
      recommendations.push(`- **${page}**: ${metrics.jsErrors} JavaScript errors detected - investigate console logs`);
    }
  });
  
  if (recommendations.length === 0) {
    return '✅ No performance issues identified - all pages meet acceptable performance criteria.';
  }
  
  return recommendations.join('\n');
}

// Main execution
async function main() {
  let testResultsPath = '';
  
  // Check if file path provided as argument
  if (process.argv.length > 2) {
    testResultsPath = process.argv[2];
    if (!fs.existsSync(testResultsPath)) {
      console.log(`❌ Test results file not found: ${testResultsPath}`);
      process.exit(1);
    }
  } else {
    // Find the most recent test results file in current directory
    const files = fs.readdirSync('.').filter(f => f.startsWith('jira-10.3-test-results-') && f.endsWith('.json'));
    
    if (files.length === 0) {
      console.log('❌ No test results found. Please run the test suite first.');
      console.log('💡 Run: npx playwright test jira-upgrade-testing/tests/jira-10.3-upgrade-focused-tests.spec.ts');
      process.exit(1);
    }
    
    // Sort by modification time and get the most recent
    const mostRecent = files
      .map(f => ({ name: f, time: fs.statSync(f).mtime }))
      .sort((a, b) => b.time.getTime() - a.time.getTime())[0];
    
    testResultsPath = mostRecent.name;
  }
  
  console.log(`📊 Using test results: ${testResultsPath}`);
  
  const reportFile = generateExecutiveReport(testResultsPath);
  
  console.log('\n🎉 EXECUTIVE REPORT READY FOR IRINA!');
  console.log('=====================================');
  console.log(`📄 Report File: ${reportFile}`);
  console.log('📋 Includes: Executive Summary, Test Results, Failed Test Analysis');
  console.log('💼 Ready for presentation and decision making');
  
  return reportFile;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { generateExecutiveReport }; 