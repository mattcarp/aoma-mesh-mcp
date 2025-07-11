#!/usr/bin/env node

/**
 * 🔍 Quick Jira Environment Detection
 * Detects current Java version and Jira details from UAT environment
 */

const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

class QuickJiraDetector {
  constructor() {
    this.baseUrl = 'https://jirauat.smedigitalapps.com';
    
    // Try multiple credential patterns from .env
    this.credentials = {
      username: process.env.JIRA_USERNAME || process.env.JIRA_USER || process.env.USERNAME,
      password: process.env.JIRA_PASSWORD || process.env.JIRA_PASS || process.env.PASSWORD,
      token: process.env.JIRA_TOKEN || process.env.JIRA_API_TOKEN || process.env.API_TOKEN
    };
  }

  async detect() {
    console.log('🔍 Detecting Current Jira Environment...\n');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`🔑 Credentials: ${this.credentials.username ? '✅ Username found' : '❌ No username'}`);
    console.log(`🔑 Auth method: ${this.credentials.token ? 'API Token' : 'Username/Password'}`);
    console.log('');

    try {
      // Get system info via API
      const systemInfo = await this.getSystemInfo();
      
      // Try to get Java version (may require admin access)
      const javaInfo = await this.getJavaInfo();
      
      // Generate report
      await this.generateReport(systemInfo, javaInfo);
      
    } catch (error) {
      console.error('❌ Detection failed:', error.message);
      console.log('\n💡 Troubleshooting:');
      console.log('1. Check .env file has correct Jira credentials');
      console.log('2. Verify UAT environment is accessible');
      console.log('3. Ensure user has API access permissions');
    }
  }

  async getSystemInfo() {
    console.log('📊 Fetching Jira system information...');
    
    const url = `${this.baseUrl}/rest/api/2/serverInfo`;
    const headers = this.getAuthHeaders();
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ Jira Version: ${data.version}`);
    console.log(`✅ Build Number: ${data.buildNumber}`);
    console.log(`✅ Deployment Type: ${data.deploymentType}`);
    console.log(`✅ Build Date: ${data.buildDate}`);
    
    return data;
  }

  async getJavaInfo() {
    console.log('☕ Attempting to detect Java version...');
    
    try {
      const url = `${this.baseUrl}/secure/admin/ViewSystemInfo.jspa`;
      const headers = { ...this.getAuthHeaders(), 'Accept': 'text/html' };
      
      const response = await fetch(url, { headers });
      
      if (response.ok) {
        const html = await response.text();
        
        // Parse Java version from system info page
        const javaVersionMatch = html.match(/Java Version.*?<td[^>]*>([^<]+)/i);
        const javaVendorMatch = html.match(/Java Vendor.*?<td[^>]*>([^<]+)/i);
        
        if (javaVersionMatch) {
          const javaVersion = javaVersionMatch[1].trim();
          const javaVendor = javaVendorMatch ? javaVendorMatch[1].trim() : 'Unknown';
          
          console.log(`✅ Java Version: ${javaVersion}`);
          console.log(`✅ Java Vendor: ${javaVendor}`);
          
          return { version: javaVersion, vendor: javaVendor };
        }
      } else {
        console.log('⚠️ Admin access required for Java version detection');
      }
    } catch (error) {
      console.log('⚠️ Could not access system info page');
    }
    
    return null;
  }

  getAuthHeaders() {
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (this.credentials.token) {
      headers['Authorization'] = `Bearer ${this.credentials.token}`;
    } else if (this.credentials.username && this.credentials.password) {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else {
      throw new Error('No valid credentials found in .env file');
    }

    return headers;
  }

  async generateReport(systemInfo, javaInfo) {
    console.log('\n📝 Generating upgrade analysis report...');
    
    const currentJava = javaInfo?.version || 'Unknown (requires admin access)';
    const isJava8 = currentJava.includes('1.8') || currentJava.includes('8.');
    const isJava11 = currentJava.includes('11.');
    const isJava17 = currentJava.includes('17.');
    
    const report = {
      detectedAt: new Date().toISOString(),
      environment: {
        url: this.baseUrl,
        purpose: "Pre-UAT validation for Jira upgrade"
      },
      current: {
        jiraVersion: systemInfo.version,
        buildNumber: systemInfo.buildNumber,
        buildDate: systemInfo.buildDate,
        javaVersion: currentJava,
        javaVendor: javaInfo?.vendor || 'Unknown'
      },
      upgrade: {
        targetJira: '10.3.x LTS',
        targetJava: 'Java 17 LTS',
        javaUpgradeRequired: isJava8 || isJava11,
        riskLevel: isJava8 ? 'HIGH' : isJava11 ? 'MEDIUM' : 'LOW'
      }
    };

    // Save to reports directory
    const reportsDir = path.join(__dirname, '..', 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = path.join(reportsDir, 'environment-detection.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate summary
    console.log('\n🎯 UPGRADE ANALYSIS SUMMARY');
    console.log('================================');
    console.log(`Current Jira: ${systemInfo.version}`);
    console.log(`Target Jira:  10.3.x LTS`);
    console.log(`Current Java: ${currentJava}`);
    console.log(`Target Java:  Java 17 LTS`);
    console.log(`Java Upgrade: ${isJava8 || isJava11 ? '✅ REQUIRED' : '❌ NOT REQUIRED'}`);
    console.log(`Risk Level:   ${report.upgrade.riskLevel}`);
    
    if (isJava8) {
      console.log('\n⚠️  HIGH RISK: Java 8 → 17 is a major jump');
      console.log('   - Extensive testing required');
      console.log('   - Plugin compatibility critical');
      console.log('   - Performance validation essential');
    } else if (isJava11) {
      console.log('\n⚠️  MEDIUM RISK: Java 11 → 17 upgrade');
      console.log('   - Standard compatibility testing');
      console.log('   - Performance validation recommended');
    }
    
    console.log('\n✅ Report saved to: jira-upgrade-testing/reports/environment-detection.json');
    console.log('\n🚀 Next step: npm run jira:test:platform-validation');
  }
}

// Execute detection
const detector = new QuickJiraDetector();
detector.detect().catch(console.error); 