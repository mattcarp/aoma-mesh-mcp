import fs from 'fs';

interface CleanTestReport {
  reportTime: string;
  scope: string;
  infrastructure: {
    vpnConnectivity: string;
    networkAccess: string;
    baselineConnectivity: string;
  };
  functionalTesting: {
    totalLinksFound: number;
    totalLinksTested: number;
    workingLinks: number;
    brokenLinks: number;
    unresponsiveLinks: number;
    linkSuccessRate: string;
    pagesCrawled: string[];
  };
  criticalFindings: {
    brokenNavigationLinks: number;
    nonFunctionalUIElements: number;
    timeoutIssues: number;
    accessibilityIssues: number;
  };
  detailedFindings: {
    brokenLinkDetails: any[];
    uiIssues: string[];
    performanceIssues: string[];
  };
  testLimitations: string[];
  recommendations: string[];
  raw_data_files: string[];
}

async function generateFactualReport(): Promise<void> {
  console.log('📋 GENERATING FACTUAL TESTING REPORT');
  console.log('===================================');
  console.log('📊 Just the facts - no drama, no speculation');
  console.log('🔍 Removing unreliable session validation claims');
  console.log('📝 Dragnet-style reporting: facts only');

  // Read available test reports
  const reportFiles = fs.readdirSync('.').filter(f => 
    f.includes('REPORT') && f.endsWith('.json')
  ).sort();

  console.log(`\n📂 Found ${reportFiles.length} report files to analyze`);

  // Read the most recent reports
  const vpnAwareReport = reportFiles.find(f => f.includes('VPN-AWARE')) 
    ? JSON.parse(fs.readFileSync(reportFiles.find(f => f.includes('VPN-AWARE'))!, 'utf8'))
    : null;

  const linkReport = reportFiles.find(f => f.includes('AUTH-AWARE-LINK')) 
    ? JSON.parse(fs.readFileSync(reportFiles.find(f => f.includes('AUTH-AWARE-LINK'))!, 'utf8'))
    : null;

  const enhancedReport = reportFiles.find(f => f.includes('ENHANCED-TEST')) 
    ? JSON.parse(fs.readFileSync(reportFiles.find(f => f.includes('ENHANCED-TEST'))!, 'utf8'))
    : null;

  // Extract factual data without speculation
  const factualReport: CleanTestReport = {
    reportTime: new Date().toISOString(),
    scope: 'JIRA UAT Environment Functional Testing',
    
    infrastructure: {
      vpnConnectivity: vpnAwareReport?.vpnStatus?.connected ? 'Connected (Cisco Global Protect)' : 'Status unknown',
      networkAccess: vpnAwareReport?.testResults?.find((t: any) => t.testName === 'Network Connectivity')?.conclusion || 'Not tested',
      baselineConnectivity: vpnAwareReport?.testResults?.find((t: any) => t.testName === 'Basic Page Access')?.conclusion || 'Not tested'
    },

    functionalTesting: {
      totalLinksFound: linkReport?.totalLinksFound || 0,
      totalLinksTested: linkReport?.totalLinksTested || 0,
      workingLinks: linkReport?.summary?.workingLinks || 0,
      brokenLinks: linkReport?.summary?.brokenLinks || 0,
      unresponsiveLinks: linkReport?.summary?.unresponsiveLinks || 0,
      linkSuccessRate: linkReport ? `${Math.round((linkReport.summary.workingLinks / linkReport.totalLinksTested) * 100)}%` : 'Not calculated',
      pagesCrawled: linkReport?.pageResults?.map((p: any) => p.pageName) || []
    },

    criticalFindings: {
      brokenNavigationLinks: linkReport?.summary?.brokenLinks || 0,
      nonFunctionalUIElements: linkReport?.summary?.nonClickableLinks || 0,
      timeoutIssues: linkReport?.summary?.unresponsiveLinks || 0,
      accessibilityIssues: 0  // Would need specific accessibility testing
    },

    detailedFindings: {
      brokenLinkDetails: extractBrokenLinks(linkReport),
      uiIssues: extractUIIssues(linkReport),
      performanceIssues: extractPerformanceIssues(linkReport, vpnAwareReport)
    },

    testLimitations: [
      'Authentication testing was inconsistent and excluded from this report',
      'Session validation produced unreliable results and was removed',
      'Test coverage limited to public and accessible pages only',
      'Results depend on VPN connectivity and network conditions',
      'Automated testing may miss complex user interaction patterns'
    ],

    recommendations: [
      'Fix identified broken navigation links before production deployment',
      'Review non-functional UI elements that appear clickable to users',
      'Establish reliable authentication testing methodology',
      'Implement consistent session management validation',
      'Add accessibility testing to test suite'
    ],

    raw_data_files: reportFiles
  };

  // Save the factual report
  const reportPath = `FACTUAL-JIRA-TESTING-REPORT-${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(factualReport, null, 2));

  // Generate markdown version
  const markdownReport = generateMarkdownReport(factualReport);
  const markdownPath = `FACTUAL-JIRA-TESTING-REPORT-${Date.now()}.md`;
  fs.writeFileSync(markdownPath, markdownReport);

  console.log('\n📋 FACTUAL TESTING REPORT COMPLETE');
  console.log('=================================');
  console.log(`📊 Infrastructure Health: ${factualReport.infrastructure.networkAccess}`);
  console.log(`🔗 Link Testing: ${factualReport.functionalTesting.linkSuccessRate} success rate`);
  console.log(`🚨 Critical Issues: ${factualReport.criticalFindings.brokenNavigationLinks} broken links`);
  console.log(`⚠️ UI Issues: ${factualReport.criticalFindings.nonFunctionalUIElements} non-functional elements`);

  console.log('\n📋 KEY FINDINGS (FACTUAL):');
  if (factualReport.criticalFindings.brokenNavigationLinks > 0) {
    console.log(`   • ${factualReport.criticalFindings.brokenNavigationLinks} broken navigation links identified`);
  }
  if (factualReport.criticalFindings.nonFunctionalUIElements > 0) {
    console.log(`   • ${factualReport.criticalFindings.nonFunctionalUIElements} UI elements appear clickable but are non-functional`);
  }
  if (factualReport.criticalFindings.timeoutIssues > 0) {
    console.log(`   • ${factualReport.criticalFindings.timeoutIssues} links experienced timeout issues`);
  }

  console.log('\n🚨 EXCLUDED FROM REPORT:');
  console.log('   • Authentication testing (unreliable results)');
  console.log('   • Session validation claims (inconsistent behavior)');
  console.log('   • User access level testing (requires proper auth)');

  console.log(`\n💾 Reports saved:`);
  console.log(`   JSON: ${reportPath}`);
  console.log(`   Markdown: ${markdownPath}`);
  console.log(`📊 Ready for review - factual data only, no speculation`);
}

function extractBrokenLinks(linkReport: any): any[] {
  if (!linkReport?.pageResults) return [];
  
  const brokenLinks: any[] = [];
  
  linkReport.pageResults.forEach((page: any) => {
    if (page.linkResults) {
      page.linkResults.forEach((link: any) => {
        if (link.destinationStatus === 'ERROR' || link.destinationStatus === '404') {
          brokenLinks.push({
            page: page.pageName,
            linkText: link.linkText,
            href: link.href,
            error: link.destinationStatus,
            errorMessage: link.errorMessage
          });
        }
      });
    }
  });
  
  return brokenLinks;
}

function extractUIIssues(linkReport: any): string[] {
  const issues: string[] = [];
  
  if (linkReport?.summary?.nonClickableLinks > 0) {
    issues.push(`${linkReport.summary.nonClickableLinks} elements appear clickable but are non-functional`);
  }
  
  if (linkReport?.pageResults) {
    linkReport.pageResults.forEach((page: any) => {
      if (page.linkResults) {
        const nonClickable = page.linkResults.filter((link: any) => !link.isClickable).length;
        if (nonClickable > 0) {
          issues.push(`${page.pageName}: ${nonClickable} non-functional elements that appear to be links`);
        }
      }
    });
  }
  
  return issues;
}

function extractPerformanceIssues(linkReport: any, vpnReport: any): string[] {
  const issues: string[] = [];
  
  if (linkReport?.summary?.unresponsiveLinks > 0) {
    issues.push(`${linkReport.summary.unresponsiveLinks} links experienced timeout issues`);
  }
  
  if (vpnReport?.testResults) {
    const slowTests = vpnReport.testResults.filter((test: any) => 
      test.attempts?.some((attempt: any) => attempt.duration > 10000)
    );
    
    if (slowTests.length > 0) {
      issues.push(`${slowTests.length} tests experienced slow response times (>10 seconds)`);
    }
  }
  
  return issues;
}

function generateMarkdownReport(report: CleanTestReport): string {
  return `# JIRA UAT Environment - Functional Testing Report

**Generated:** ${new Date(report.reportTime).toLocaleString()}  
**Scope:** ${report.scope}

## Executive Summary

This report presents factual findings from automated functional testing of the JIRA UAT environment. Authentication and session validation results have been excluded due to inconsistent behavior.

### Key Metrics
- **Links Tested:** ${report.functionalTesting.totalLinksTested} of ${report.functionalTesting.totalLinksFound} found
- **Success Rate:** ${report.functionalTesting.linkSuccessRate}
- **Broken Links:** ${report.criticalFindings.brokenNavigationLinks}
- **UI Issues:** ${report.criticalFindings.nonFunctionalUIElements} non-functional elements

## Infrastructure Status

| Component | Status |
|-----------|--------|
| VPN Connectivity | ${report.infrastructure.vpnConnectivity} |
| Network Access | ${report.infrastructure.networkAccess} |
| Basic Page Access | ${report.infrastructure.baselineConnectivity} |

## Functional Testing Results

### Pages Tested
${report.functionalTesting.pagesCrawled.map(page => `- ${page}`).join('\n')}

### Critical Findings

${report.criticalFindings.brokenNavigationLinks > 0 ? `**🚨 Broken Navigation Links: ${report.criticalFindings.brokenNavigationLinks}**` : '✅ No broken navigation links found'}

${report.criticalFindings.nonFunctionalUIElements > 0 ? `**⚠️ Non-Functional UI Elements: ${report.criticalFindings.nonFunctionalUIElements}**` : '✅ All tested UI elements functional'}

${report.criticalFindings.timeoutIssues > 0 ? `**⏰ Timeout Issues: ${report.criticalFindings.timeoutIssues}**` : '✅ No timeout issues detected'}

### Detailed Findings

${report.detailedFindings.brokenLinkDetails.length > 0 ? 
`#### Broken Links
${report.detailedFindings.brokenLinkDetails.map(link => `- **${link.page}**: "${link.linkText}" (${link.href}) - ${link.error}`).join('\n')}` : 
'No broken links detected.'}

${report.detailedFindings.uiIssues.length > 0 ? 
`#### UI Issues
${report.detailedFindings.uiIssues.map(issue => `- ${issue}`).join('\n')}` : 
'No UI issues detected.'}

${report.detailedFindings.performanceIssues.length > 0 ? 
`#### Performance Issues
${report.detailedFindings.performanceIssues.map(issue => `- ${issue}`).join('\n')}` : 
'No performance issues detected.'}

## Test Limitations

${report.testLimitations.map(limitation => `- ${limitation}`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Supporting Data

Raw test data available in:
${report.raw_data_files.map(file => `- ${file}`).join('\n')}

---
*This report contains factual test results only. Speculative or unverified claims have been excluded.*`;
}

// Run the report generation
generateFactualReport().catch(console.error); 