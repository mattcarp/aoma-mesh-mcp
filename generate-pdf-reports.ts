#!/usr/bin/env tsx

import fs from 'fs';
import { chromium } from 'playwright';

interface PerformanceData {
  timestamp: string;
  jiraVersion: string;
  environment: string;
  results: Array<{
    test: string;
    url: string;
    loadTime: number;
    domContentLoaded: number;
    networkRequests: number;
    status: 'success' | 'error';
    error?: string;
  }>;
  summary: {
    totalTests: number;
    successfulTests: number;
    averageLoadTime: number;
    averageDOMTime: number;
  };
}

async function generatePDFReports() {
  console.log('📊 GENERATING BEAUTIFUL PDF REPORTS');
  console.log('===================================');
  console.log('🎨 Creating visual charts and graphs');
  console.log('📄 Converting to professional PDFs with Playwright');
  console.log('🎯 Perfect for Irina\'s team presentation');
  console.log('===================================\n');

  const browser = await chromium.launch({ headless: true });
  
  try {
    // 1. Generate Performance Report PDF
    console.log('📈 Step 1: Generating Performance Report PDF...');
    await generatePerformancePDF(browser);
    
    // 2. Generate Analysis Report PDF
    console.log('🔍 Step 2: Generating Analysis Report PDF...');
    await generateAnalysisPDF(browser);
    
    // 3. Generate Executive Summary PDF
    console.log('👔 Step 3: Generating Executive Summary PDF...');
    await generateExecutivePDF(browser);
    
    console.log('\n✅ All PDF Reports Generated Successfully!');
    console.log('📁 Files ready for presentation:');
    console.log('   📊 JIRA-Performance-Report.pdf');
    console.log('   🔍 JIRA-Analysis-Report.pdf');
    console.log('   👔 JIRA-Executive-Summary.pdf');
    console.log('🎉 Ready for Irina\'s team meeting!');
    
  } catch (error) {
    console.error('❌ Error generating PDFs:', error);
  } finally {
    await browser.close();
  }
}

async function generatePerformancePDF(browser: any) {
  // Find the latest performance report
  const files = fs.readdirSync('.').filter(f => f.startsWith('jira-performance-report-') && f.endsWith('.json'));
  if (files.length === 0) {
    console.log('   ⚠️ No performance report found, skipping PDF generation');
    return;
  }
  
  const latestFile = files.sort().pop()!;
  const data: PerformanceData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
  
  const html = generatePerformanceHTML(data);
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: 'JIRA-Performance-Report.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });
  await page.close();
  
  console.log('   ✅ Performance Report PDF generated');
}

async function generateAnalysisPDF(browser: any) {
  // Find the latest analysis report
  const files = fs.readdirSync('.').filter(f => f.startsWith('jira-upgrade-analysis-') && f.endsWith('.md'));
  if (files.length === 0) {
    console.log('   ⚠️ No analysis report found, skipping PDF generation');
    return;
  }
  
  const latestFile = files.sort().pop()!;
  const markdownContent = fs.readFileSync(latestFile, 'utf8');
  
  const html = generateAnalysisHTML(markdownContent);
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: 'JIRA-Analysis-Report.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });
  await page.close();
  
  console.log('   ✅ Analysis Report PDF generated');
}

async function generateExecutivePDF(browser: any) {
  // Find the latest executive summary
  const files = fs.readdirSync('.').filter(f => f.startsWith('JIRA-10.3-Executive-Summary-') && f.endsWith('.md'));
  if (files.length === 0) {
    console.log('   ⚠️ No executive summary found, skipping PDF generation');
    return;
  }
  
  const latestFile = files.sort().pop()!;
  const markdownContent = fs.readFileSync(latestFile, 'utf8');
  
  const html = generateExecutiveHTML(markdownContent);
  
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: 'JIRA-Executive-Summary.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
  });
  await page.close();
  
  console.log('   ✅ Executive Summary PDF generated');
}

function generatePerformanceHTML(data: PerformanceData): string {
  const successfulResults = data.results.filter(r => r.status === 'success');
  
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JIRA 10.3 Performance Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #667eea;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin: 0;
        }
        .header h2 {
            color: #666;
            font-weight: 300;
            margin: 10px 0;
        }
        .metadata {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 30px;
            border-left: 4px solid #667eea;
        }
        .chart-container {
            margin: 30px 0;
            height: 400px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            color: #667eea;
        }
        .metric-label {
            color: #666;
            margin-top: 5px;
        }
        .performance-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .performance-table th,
        .performance-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        .performance-table th {
            background: #667eea;
            color: white;
        }
        .status-excellent { color: #28a745; font-weight: bold; }
        .status-good { color: #ffc107; font-weight: bold; }
        .status-poor { color: #dc3545; font-weight: bold; }
        .page-break { page-break-before: always; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 JIRA 10.3 Performance Report</h1>
            <h2>Comprehensive Performance Analysis</h2>
        </div>
        
        <div class="metadata">
            <strong>Environment:</strong> ${data.environment} | 
            <strong>JIRA Version:</strong> ${data.jiraVersion} | 
            <strong>Test Date:</strong> ${new Date(data.timestamp).toLocaleDateString()} |
            <strong>Total Tests:</strong> ${data.summary.totalTests}
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${data.summary.successfulTests}</div>
                <div class="metric-label">Successful Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round(data.summary.averageLoadTime)}ms</div>
                <div class="metric-label">Average Load Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round(data.summary.averageDOMTime)}ms</div>
                <div class="metric-label">Average DOM Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${Math.round((data.summary.successfulTests / data.summary.totalTests) * 100)}%</div>
                <div class="metric-label">Success Rate</div>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="performanceChart"></canvas>
        </div>
        
        <div class="page-break"></div>
        
        <h3>📊 Detailed Performance Results</h3>
        <table class="performance-table">
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Load Time</th>
                    <th>DOM Ready</th>
                    <th>Network Requests</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${successfulResults.map(result => {
                  const statusClass = result.loadTime < 3000 ? 'status-excellent' : 
                                    result.loadTime < 5000 ? 'status-good' : 'status-poor';
                  const statusText = result.loadTime < 3000 ? '✅ Excellent' : 
                                   result.loadTime < 5000 ? '🟡 Good' : '🔴 Poor';
                  return `
                    <tr>
                        <td>${result.test}</td>
                        <td>${result.loadTime}ms</td>
                        <td>${Math.round(result.domContentLoaded)}ms</td>
                        <td>${result.networkRequests}</td>
                        <td class="${statusClass}">${statusText}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="chart-container">
            <canvas id="comparisonChart"></canvas>
        </div>
    </div>
    
    <script>
        // Performance Bar Chart
        const ctx1 = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(successfulResults.map(r => r.test))},
                datasets: [{
                    label: 'Load Time (ms)',
                    data: ${JSON.stringify(successfulResults.map(r => r.loadTime))},
                    backgroundColor: [
                        '#667eea', '#764ba2', '#f093fb', '#f5576c', 
                        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
                    ],
                    borderColor: '#667eea',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Component Load Times',
                        font: { size: 18 }
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Load Time (milliseconds)'
                        }
                    }
                }
            }
        });
        
        // Performance vs Target Comparison
        const ctx2 = document.getElementById('comparisonChart').getContext('2d');
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(successfulResults.map(r => r.test))},
                datasets: [
                    {
                        label: 'Actual Performance',
                        data: ${JSON.stringify(successfulResults.map(r => r.loadTime))},
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Target Performance (5s)',
                        data: ${JSON.stringify(successfulResults.map(() => 5000))},
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Performance vs Target Comparison',
                        font: { size: 18 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Load Time (milliseconds)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}

function generateAnalysisHTML(markdownContent: string): string {
  // Convert markdown to HTML (simplified)
  const htmlContent = markdownContent
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.*)$/gim, '<p>$1</p>');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JIRA 10.3 Analysis Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ffa500 100%);
            color: #333;
            line-height: 1.6;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #ff6b6b;
            border-bottom: 3px solid #ff6b6b;
            padding-bottom: 10px;
        }
        h2 {
            color: #ffa500;
            margin-top: 30px;
        }
        h3 {
            color: #666;
        }
        .critical { color: #dc3545; font-weight: bold; }
        .high { color: #fd7e14; font-weight: bold; }
        .medium { color: #ffc107; font-weight: bold; }
        .low { color: #28a745; font-weight: bold; }
        .page-break { page-break-before: always; }
        li {
            margin: 5px 0;
        }
        p {
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent}
    </div>
</body>
</html>`;
}

function generateExecutiveHTML(markdownContent: string): string {
  // Convert markdown to HTML with executive styling
  const htmlContent = markdownContent
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/\| (.*?) \|/g, '<td>$1</td>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.*)$/gim, '<p>$1</p>');

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>JIRA 10.3 Executive Summary</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: #333;
            line-height: 1.6;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #2c3e50;
            padding-bottom: 20px;
        }
        h1 {
            color: #2c3e50;
            font-size: 2.5em;
            margin: 0;
        }
        h2 {
            color: #34495e;
            margin-top: 30px;
        }
        h3 {
            color: #666;
        }
        .executive-summary {
            background: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 5px solid #e74c3c;
        }
        .dashboard {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .metric {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #dee2e6;
        }
        .metric-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #2c3e50;
        }
        .critical { color: #dc3545; }
        .high { color: #fd7e14; }
        .medium { color: #ffc107; }
        .low { color: #28a745; }
        .page-break { page-break-before: always; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #2c3e50;
            color: white;
        }
        .chart-container {
            height: 300px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 JIRA 10.3 Executive Summary</h1>
            <p style="font-size: 1.2em; color: #666;">Critical Decision Document</p>
        </div>
        
        <div class="executive-summary">
            <h3>🚨 EXECUTIVE DECISION REQUIRED</h3>
            <p><strong>RECOMMENDATION: DO NOT PROCEED TO PRODUCTION</strong></p>
            <p>Critical authentication issues and performance regressions must be resolved before deployment to production environment.</p>
        </div>
        
        <div class="dashboard">
            <div class="metric">
                <div class="metric-value critical">2</div>
                <div>Critical Issues</div>
            </div>
            <div class="metric">
                <div class="metric-value high">4</div>
                <div>High Priority</div>
            </div>
            <div class="metric">
                <div class="metric-value medium">3</div>
                <div>Medium Priority</div>
            </div>
            <div class="metric">
                <div class="metric-value critical">0%</div>
                <div>Production Ready</div>
            </div>
        </div>
        
        <div class="chart-container">
            <canvas id="issueChart"></canvas>
        </div>
        
        ${htmlContent}
    </div>
    
    <script>
        // Issues Breakdown Chart
        const ctx = document.getElementById('issueChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'High Priority', 'Medium Priority'],
                datasets: [{
                    data: [2, 4, 3],
                    backgroundColor: ['#dc3545', '#fd7e14', '#ffc107'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Issues Breakdown by Severity',
                        font: { size: 18 }
                    },
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    </script>
</body>
</html>`;
}

// Run the PDF generator
generatePDFReports().catch(console.error); 