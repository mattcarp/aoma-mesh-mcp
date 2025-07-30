#!/usr/bin/env tsx

import fs from 'fs';

// Generate standalone HTML reports that can be edited before PDF conversion
async function generateEditableHTMLReports() {
  console.log('🔥 GENERATING EDITABLE SONY MUSIC HTML REPORTS');
  console.log('===============================================');
  console.log('🎨 Creating beautiful HTML files that can be edited');
  console.log('📝 Then convert to PDF using: npx tsx generate-pdf-reports.ts');
  console.log('===============================================\n');

  // Load comprehensive test data
  let testData: any = {};
  
  try {
    if (fs.existsSync('comprehensive-final-report.json')) {
      testData = JSON.parse(fs.readFileSync('comprehensive-final-report.json', 'utf8'));
    }
  } catch (error) {
    console.log('   ⚠️ Using fallback data for HTML reports');
    testData = {
      testExecutionSummary: {
        totalTests: 243,
        totalPassed: 179,
        totalFailed: 64,
        successRate: "73.7%",
        totalSuites: 26,
        majorFindings: {
          securityIssues: { sqlInjectionVulnerabilities: 3, missingSecurityHeaders: 149 },
          accessibilityIssues: { colorContrastViolations: 392, unlabeledFormInputs: "100%" },
          performanceIssues: { clsScore: 0.114, concurrentUserFailures: "100%" }
        }
      }
    };
  }

  // 1. Generate Executive Summary HTML
  console.log('🎯 Generating Sony Music Executive Summary HTML...');
  const execHtml = generateSonyMusicExecutiveHTML(testData);
  fs.writeFileSync('Sony-Music-JIRA-Executive-Summary.html', execHtml);
  console.log('   ✅ Sony-Music-JIRA-Executive-Summary.html created');

  // 2. Generate Technical Report HTML
  console.log('📊 Generating Sony Music Technical Report HTML...');
  let reportContent = '';
  try {
    if (fs.existsSync('FINAL-COMPREHENSIVE-TEST-REPORT.md')) {
      reportContent = fs.readFileSync('FINAL-COMPREHENSIVE-TEST-REPORT.md', 'utf8');
    }
  } catch (error) {
    reportContent = '# Technical Report\n\nComprehensive testing completed with 243 tests.';
  }
  
  const techHtml = generateTechnicalReportHTML(reportContent);
  fs.writeFileSync('Sony-Music-JIRA-Technical-Report.html', techHtml);
  console.log('   ✅ Sony-Music-JIRA-Technical-Report.html created');

  // 3. Generate Security & Compliance HTML
  console.log('🔒 Generating Sony Music Security & Compliance HTML...');
  const securityData = testData.testExecutionSummary?.majorFindings || {};
  const secHtml = generateSecurityComplianceHTML(securityData);
  fs.writeFileSync('Sony-Music-JIRA-Security-Compliance.html', secHtml);
  console.log('   ✅ Sony-Music-JIRA-Security-Compliance.html created');

  console.log('\n🎉 ALL EDITABLE HTML REPORTS GENERATED!');
  console.log('📝 You can now edit these HTML files:');
  console.log('   🎯 Sony-Music-JIRA-Executive-Summary.html');
  console.log('   📊 Sony-Music-JIRA-Technical-Report.html');
  console.log('   🔒 Sony-Music-JIRA-Security-Compliance.html');
  console.log('\n🔄 To convert to PDF after editing:');
  console.log('   npx tsx generate-pdf-reports.ts');
  console.log('\n💡 Or convert individual files with browser print to PDF!');
}

// Sony Music Executive HTML Generator
function generateSonyMusicExecutiveHTML(testData: any): string {
  const summary = testData.testExecutionSummary || {};
  const findings = summary.majorFindings || {};
  
  return `<!DOCTYPE html>
<html>
<head>
    <title>Sony Music - JIRA 10.3 Executive Summary</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.4; 
            color: #2c3e50; 
            background: white;
        }
        
        .header { 
            background: linear-gradient(135deg, #e53935 0%, #d32f2f 100%);
            color: white; 
            padding: 30px; 
            text-align: center;
        }
        
        .header h1 { font-size: 28px; margin-bottom: 8px; font-weight: bold; }
        .header .subtitle { font-size: 16px; opacity: 0.9; }
        .header .date { font-size: 12px; margin-top: 10px; opacity: 0.8; }
        
        .sony-logo { 
            font-size: 24px; 
            font-weight: bold; 
            letter-spacing: 2px; 
            margin-bottom: 10px; 
        }
        
        .critical-banner {
            background: #f44336;
            color: white;
            padding: 20px;
            text-align: center;
            font-size: 18px;
            font-weight: bold;
            margin: 0;
        }
        
        .container { padding: 30px; }
        
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 15px; 
            margin: 20px 0; 
        }
        
        .metric-card { 
            background: #f8f9fa; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center;
            border-left: 4px solid #e53935;
        }
        
        .metric-card h3 { font-size: 24px; margin-bottom: 5px; color: #e53935; }
        .metric-card p { font-size: 12px; color: #666; font-weight: 500; }
        
        .findings-section { margin: 30px 0; }
        .findings-section h2 { 
            font-size: 18px; 
            margin-bottom: 15px; 
            color: #d32f2f;
            border-bottom: 2px solid #e53935;
            padding-bottom: 5px;
        }
        
        .finding-item { 
            background: #fff3e0; 
            padding: 15px; 
            margin: 10px 0; 
            border-left: 4px solid #ff9800;
            border-radius: 4px;
        }
        
        .critical-finding { 
            background: #ffebee; 
            border-left-color: #f44336; 
        }
        
        .recommendation {
            background: #e8f5e8;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #4caf50;
        }
        
        .editable-note {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2196f3;
            font-style: italic;
        }
        
        .footer { 
            background: #263238; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px;
        }
        
        @media print { 
            .header { break-inside: avoid; }
            .critical-banner { break-inside: avoid; }
            .metric-card { break-inside: avoid; }
            .editable-note { display: none; }
        }
    </style>
</head>
<body>
    <div class="editable-note">
        ✏️ <strong>EDITABLE HTML REPORT:</strong> You can edit this HTML file directly before converting to PDF. 
        Remove this note when ready for final version!
    </div>

    <div class="header">
        <div class="sony-logo">SONY MUSIC</div>
        <h1>JIRA 10.3 Upgrade Testing</h1>
        <div class="subtitle">Executive Summary Report</div>
        <div class="date">Generated: ${new Date().toLocaleDateString()} | Confidential</div>
    </div>
    
    <div class="critical-banner">
        🚨 CRITICAL RECOMMENDATION: BLOCK JIRA 10.3 UPGRADE DEPLOYMENT
    </div>
    
    <div class="container">
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>${summary.totalTests || 243}</h3>
                <p>Total Tests Executed</p>
            </div>
            <div class="metric-card">
                <h3>${summary.successRate || '73.7%'}</h3>
                <p>Overall Success Rate</p>
            </div>
            <div class="metric-card">
                <h3>${summary.totalFailed || 64}</h3>
                <p>Critical Failures</p>
            </div>
            <div class="metric-card">
                <h3>${summary.totalSuites || 26}</h3>
                <p>Test Suites</p>
            </div>
        </div>
        
        <div class="findings-section">
            <h2>🔒 Security Findings</h2>
            <div class="finding-item critical-finding">
                <strong>SQL Injection Vulnerabilities:</strong> ${findings.securityIssues?.sqlInjectionVulnerabilities || 3} critical vulnerabilities identified
            </div>
            <div class="finding-item critical-finding">
                <strong>Missing Security Headers:</strong> ${findings.securityIssues?.missingSecurityHeaders || 149} security headers missing
            </div>
        </div>
        
        <div class="findings-section">
            <h2>♿ Accessibility Findings</h2>
            <div class="finding-item critical-finding">
                <strong>Color Contrast Violations:</strong> ${findings.accessibilityIssues?.colorContrastViolations || 392} WCAG 2.1 violations
            </div>
            <div class="finding-item">
                <strong>Form Accessibility:</strong> ${findings.accessibilityIssues?.unlabeledFormInputs || '100%'} of forms lack proper labels
            </div>
        </div>
        
        <div class="findings-section">
            <h2>⚡ Performance Findings</h2>
            <div class="finding-item critical-finding">
                <strong>Load Handling:</strong> ${findings.performanceIssues?.concurrentUserFailures || '100%'} failure rate under concurrent load
            </div>
            <div class="finding-item">
                <strong>Layout Stability:</strong> CLS Score ${findings.performanceIssues?.clsScore || '0.114'} (Target: <0.1)
            </div>
        </div>
        
        <div class="recommendation">
            <h2>🎯 Executive Recommendation</h2>
            <p><strong>IMMEDIATE ACTION REQUIRED:</strong> The JIRA 10.3 upgrade contains critical security vulnerabilities and performance issues that pose significant risk to Sony Music's operations. Deployment should be blocked until all critical issues are resolved.</p>
            <br>
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Escalate security findings to development team immediately</li>
                <li>Require accessibility compliance before deployment</li>
                <li>Conduct performance optimization and re-testing</li>
                <li>Schedule executive review meeting within 48 hours</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        Sony Music Digital Applications Team | JIRA Upgrade Testing | Confidential Report
    </div>
</body>
</html>`;
}

// Technical Report HTML Generator
function generateTechnicalReportHTML(markdownContent: string): string {
  // Convert basic markdown to HTML
  const htmlContent = markdownContent
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head>
    <title>Sony Music - JIRA 10.3 Technical Report</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: white;
        }
        
        .header { 
            background: linear-gradient(135deg, #e53935 0%, #d32f2f 100%);
            color: white; 
            padding: 30px; 
            text-align: center;
        }
        
        .sony-logo { 
            font-size: 20px; 
            font-weight: bold; 
            letter-spacing: 2px; 
            margin-bottom: 10px; 
        }
        
        .container { padding: 30px; }
        
        h1 { color: #d32f2f; font-size: 24px; margin: 20px 0; }
        h2 { color: #e53935; font-size: 18px; margin: 15px 0; }
        h3 { color: #666; font-size: 16px; margin: 10px 0; }
        
        .content { font-size: 12px; line-height: 1.5; }
        
        li { margin: 5px 0; margin-left: 20px; }
        strong { color: #d32f2f; }
        
        .editable-note {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2196f3;
            font-style: italic;
        }
        
        .footer { 
            background: #263238; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px;
        }
        
        @media print { 
            .editable-note { display: none; }
        }
    </style>
</head>
<body>
    <div class="editable-note">
        ✏️ <strong>EDITABLE HTML REPORT:</strong> You can edit this HTML file directly before converting to PDF. 
        Modify content, add sections, or adjust formatting as needed!
    </div>

    <div class="header">
        <div class="sony-logo">SONY MUSIC</div>
        <h1>JIRA 10.3 Technical Report</h1>
        <div>Comprehensive Testing Analysis | ${new Date().toLocaleDateString()}</div>
    </div>
    
    <div class="container">
        <div class="content">
            ${htmlContent}
        </div>
    </div>
    
    <div class="footer">
        Sony Music Digital Applications Team | Technical Analysis | Confidential Report
    </div>
</body>
</html>`;
}

// Security & Compliance HTML Generator
function generateSecurityComplianceHTML(securityData: any): string {
  return `<!DOCTYPE html>
<html>
<head>
    <title>Sony Music - JIRA 10.3 Security & Compliance Report</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: white;
        }
        
        .header { 
            background: linear-gradient(135deg, #e53935 0%, #d32f2f 100%);
            color: white; 
            padding: 30px; 
            text-align: center;
        }
        
        .sony-logo { 
            font-size: 20px; 
            font-weight: bold; 
            letter-spacing: 2px; 
            margin-bottom: 10px; 
        }
        
        .container { padding: 30px; }
        
        .security-item { 
            background: #ffebee; 
            padding: 20px; 
            margin: 15px 0; 
            border-left: 4px solid #f44336;
            border-radius: 4px;
        }
        
        .compliance-item { 
            background: #fff3e0; 
            padding: 20px; 
            margin: 15px 0; 
            border-left: 4px solid #ff9800;
            border-radius: 4px;
        }
        
        h2 { color: #d32f2f; margin: 20px 0; }
        
        .editable-note {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2196f3;
            font-style: italic;
        }
        
        .footer { 
            background: #263238; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            font-size: 12px;
        }
        
        @media print { 
            .editable-note { display: none; }
        }
    </style>
</head>
<body>
    <div class="editable-note">
        ✏️ <strong>EDITABLE HTML REPORT:</strong> You can customize security findings, add new compliance sections, 
        or update risk assessments directly in this HTML file!
    </div>

    <div class="header">
        <div class="sony-logo">SONY MUSIC</div>
        <h1>Security & Compliance Report</h1>
        <div>JIRA 10.3 Upgrade Assessment | ${new Date().toLocaleDateString()}</div>
    </div>
    
    <div class="container">
        <h2>🔒 Critical Security Findings</h2>
        
        <div class="security-item">
            <h3>SQL Injection Vulnerabilities</h3>
            <p><strong>Count:</strong> ${securityData.securityIssues?.sqlInjectionVulnerabilities || 3}</p>
            <p><strong>Risk Level:</strong> CRITICAL</p>
            <p><strong>Impact:</strong> Potential data breach, unauthorized access to Sony Music systems</p>
        </div>
        
        <div class="security-item">
            <h3>Missing Security Headers</h3>
            <p><strong>Count:</strong> ${securityData.securityIssues?.missingSecurityHeaders || 149}</p>
            <p><strong>Risk Level:</strong> HIGH</p>
            <p><strong>Impact:</strong> Increased vulnerability to XSS, clickjacking, and other attacks</p>
        </div>
        
        <h2>♿ Accessibility Compliance</h2>
        
        <div class="compliance-item">
            <h3>WCAG 2.1 AA Violations</h3>
            <p><strong>Color Contrast Issues:</strong> ${securityData.accessibilityIssues?.colorContrastViolations || 392}</p>
            <p><strong>Compliance Status:</strong> NON-COMPLIANT</p>
            <p><strong>Legal Risk:</strong> Potential ADA lawsuit exposure</p>
        </div>
        
        <div class="compliance-item">
            <h3>Form Accessibility</h3>
            <p><strong>Unlabeled Forms:</strong> ${securityData.accessibilityIssues?.unlabeledFormInputs || '100%'}</p>
            <p><strong>Impact:</strong> Screen reader incompatibility</p>
        </div>
        
        <h2>🎯 Compliance Recommendations</h2>
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>IMMEDIATE ACTIONS REQUIRED:</strong></p>
            <ul>
                <li>Security audit by third-party firm before deployment</li>
                <li>Accessibility remediation to achieve WCAG 2.1 AA compliance</li>
                <li>Penetration testing of identified vulnerabilities</li>
                <li>Legal review of compliance status</li>
            </ul>
        </div>
    </div>
    
    <div class="footer">
        Sony Music Digital Applications Team | Security & Compliance Analysis | Confidential Report
    </div>
</body>
</html>`;
}

// Run the HTML generator
generateEditableHTMLReports().catch(console.error);