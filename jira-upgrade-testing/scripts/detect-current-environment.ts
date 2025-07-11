#!/usr/bin/env ts-node

/**
 * 🔍 Jira Environment Detection Script
 * 
 * This script connects to the UAT Jira environment to detect:
 * 1. Current Java version running Jira
 * 2. Current Jira version 
 * 3. Platform details
 * 4. System information for upgrade planning
 */

import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config();

interface JiraSystemInfo {
  version: string;
  versionNumbers: number[];
  deploymentType: string;
  buildNumber: string;
  buildDate: string;
  serverTime: string;
  scmInfo: string;
  serverTitle: string;
}

interface JiraEnvironmentInfo {
  javaVersion: string;
  javaVendor: string;
  javaHome: string;
  operatingSystem: string;
  systemUptime: string;
  memoryInfo: {
    total: string;
    free: string;
    used: string;
  };
  platformVersion: string;
}

class JiraEnvironmentDetector {
  private baseUrl: string;
  private credentials: { username?: string; password?: string; token?: string };

  constructor() {
    // Use Irina's UAT environment URL
    this.baseUrl = 'https://jirauat.smedigitalapps.com';
    
    // Load credentials from .env
    this.credentials = {
      username: process.env.JIRA_USERNAME || process.env.JIRA_USER,
      password: process.env.JIRA_PASSWORD || process.env.JIRA_PASS,
      token: process.env.JIRA_TOKEN || process.env.JIRA_API_TOKEN
    };
  }

  async detectEnvironment(): Promise<void> {
    console.log('🔍 Detecting Current Jira Environment...\n');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log(`🔑 Using credentials from .env file`);
    console.log('');

    try {
      // Get basic system info
      const systemInfo = await this.getSystemInfo();
      
      // Get detailed environment info (if admin access available)
      const envInfo = await this.getEnvironmentInfo();
      
      // Generate comprehensive report
      await this.generateEnvironmentReport(systemInfo, envInfo);
      
      console.log('✅ Environment detection completed!');
      console.log('📄 Report saved to: jira-upgrade-testing/reports/current-environment.json');
      
    } catch (error) {
      console.error('❌ Environment detection failed:', error);
      process.exit(1);
    }
  }

  private async getSystemInfo(): Promise<JiraSystemInfo> {
    console.log('📊 Fetching Jira system information...');
    
    try {
      const response = await this.makeJiraRequest('/rest/api/2/serverInfo');
      const data = await response.json();
      
      console.log(`✅ Jira Version: ${data.version}`);
      console.log(`✅ Build Number: ${data.buildNumber}`);
      console.log(`✅ Deployment Type: ${data.deploymentType}`);
      
      return data;
    } catch (error) {
      console.error('⚠️ Could not fetch server info via API');
      throw error;
    }
  }

  private async getEnvironmentInfo(): Promise<JiraEnvironmentInfo | null> {
    console.log('🔧 Attempting to fetch detailed environment info...');
    
    try {
      // Try to access system info (requires admin permissions)
      const response = await this.makeJiraRequest('/secure/admin/ViewSystemInfo.jspa');
      
      if (response.ok) {
        const html = await response.text();
        
        // Parse Java version from system info page
        const javaVersionMatch = html.match(/Java Version.*?<td[^>]*>([^<]+)/i);
        const javaVendorMatch = html.match(/Java Vendor.*?<td[^>]*>([^<]+)/i);
        const osMatch = html.match(/Operating System.*?<td[^>]*>([^<]+)/i);
        
        const envInfo: JiraEnvironmentInfo = {
          javaVersion: javaVersionMatch ? javaVersionMatch[1].trim() : 'Unknown',
          javaVendor: javaVendorMatch ? javaVendorMatch[1].trim() : 'Unknown',
          javaHome: 'Unknown',
          operatingSystem: osMatch ? osMatch[1].trim() : 'Unknown',
          systemUptime: 'Unknown',
          memoryInfo: {
            total: 'Unknown',
            free: 'Unknown',
            used: 'Unknown'
          },
          platformVersion: 'Unknown'
        };
        
        console.log(`✅ Java Version: ${envInfo.javaVersion}`);
        console.log(`✅ Java Vendor: ${envInfo.javaVendor}`);
        console.log(`✅ Operating System: ${envInfo.operatingSystem}`);
        
        return envInfo;
      } else {
        console.log('⚠️ Admin access required for detailed environment info');
        return null;
      }
    } catch (error) {
      console.log('⚠️ Could not access admin system info page');
      return null;
    }
  }

  private async makeJiraRequest(endpoint: string): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    let headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    // Use token auth if available, otherwise basic auth
    if (this.credentials.token) {
      headers['Authorization'] = `Bearer ${this.credentials.token}`;
    } else if (this.credentials.username && this.credentials.password) {
      const auth = Buffer.from(`${this.credentials.username}:${this.credentials.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else {
      throw new Error('No valid credentials found in .env file');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok && response.status !== 403) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  private async generateEnvironmentReport(systemInfo: JiraSystemInfo, envInfo: JiraEnvironmentInfo | null): Promise<void> {
    console.log('📝 Generating comprehensive environment report...');
    
    const currentJavaVersion = envInfo?.javaVersion || 'Unknown (requires admin access)';
    const isJava8 = currentJavaVersion.includes('1.8') || currentJavaVersion.includes('8.');
    const isJava11 = currentJavaVersion.includes('11.');
    const isJava17 = currentJavaVersion.includes('17.');
    
    const report = {
      detectionTimestamp: new Date().toISOString(),
      environment: {
        url: this.baseUrl,
        purpose: "UAT Environment for Jira 9.12 LTS → 10.3 LTS upgrade validation"
      },
      
      currentState: {
        jira: {
          version: systemInfo.version,
          versionNumbers: systemInfo.versionNumbers,
          buildNumber: systemInfo.buildNumber,
          buildDate: systemInfo.buildDate,
          deploymentType: systemInfo.deploymentType,
          serverTitle: systemInfo.serverTitle
        },
        java: {
          version: currentJavaVersion,
          vendor: envInfo?.javaVendor || 'Unknown',
          operatingSystem: envInfo?.operatingSystem || 'Unknown',
          upgradeRequired: isJava8 || isJava11,
          upgradeType: isJava8 ? 'Major (Java 8 → 17)' : isJava11 ? 'Major (Java 11 → 17)' : isJava17 ? 'None Required' : 'Unknown'
        }
      },
      
      upgradeAnalysis: {
        jiraUpgrade: {
          currentVersion: systemInfo.version,
          targetVersion: '10.3.x LTS',
          upgradeType: 'Major Platform Upgrade',
          platformChange: 'Platform 6/7 → Platform 7',
          breakingChanges: [
            'Java 17 requirement',
            'Async webhooks',
            'REST v2 migration',
            'Database schema updates',
            'Security annotation changes'
          ]
        },
        javaUpgrade: {
          current: currentJavaVersion,
          target: 'Java 17 LTS',
          impact: isJava8 ? 'High' : isJava11 ? 'Medium' : 'Unknown',
          considerations: [
            'Memory management changes',
            'Garbage collection improvements', 
            'Plugin compatibility validation',
            'Performance characteristics',
            'Security enhancements'
          ]
        }
      },
      
      testingRecommendations: {
        criticalTests: [
          'Java 17 runtime stability validation',
          'Memory usage pattern verification',
          'Plugin compatibility testing',
          'Performance baseline comparison',
          'Security feature validation'
        ],
        focusAreas: [
          'ITSM workflow continuity',
          'Async webhook performance',
          'Database query optimization',
          'User interface responsiveness',
          'Integration point stability'
        ]
      },
      
      riskAssessment: {
        high: isJava8 ? ['Major Java version jump', 'Potential plugin incompatibilities'] : [],
        medium: isJava11 ? ['Java 11 → 17 compatibility'] : ['Platform upgrade complexity'],
        low: ['UI theme changes', 'REST API enhancements'],
        mitigationStrategies: [
          'Comprehensive regression testing',
          'Plugin inventory and compatibility check',
          'Performance baseline establishment',
          'Rollback procedure validation'
        ]
      }
    };

    // Save comprehensive report
    const reportsDir = join(__dirname, '..', 'reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const reportPath = join(reportsDir, 'current-environment.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Update our environment config with real data
    await this.updateEnvironmentConfig(report);
    
    // Generate executive summary for Irina
    await this.generateExecutiveSummary(report);
    
    console.log('✅ Environment report generated');
  }

  private async updateEnvironmentConfig(report: any): Promise<void> {
    console.log('🔄 Updating environment configuration with detected values...');
    
    const configPath = join(__dirname, '..', 'config', 'uat-environment.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    
    // Update with real detected values
    config.environment.version.current = report.currentState.jira.version;
    config.environment.detectedJavaVersion = report.currentState.java.version;
    config.environment.upgradeRequired = report.currentState.java.upgradeRequired;
    config.environment.riskLevel = report.riskAssessment;
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    console.log('✅ Environment config updated with real data');
  }

  private async generateExecutiveSummary(report: any): Promise<void> {
    console.log('📋 Generating executive summary for Irina...');
    
    const currentJava = report.currentState.java.version;
    const upgradeRequired = report.currentState.java.upgradeRequired;
    const riskLevel = upgradeRequired ? 'Medium-High' : 'Medium';
    
    const summary = `
# 🎯 Executive Summary: Jira Upgrade Environment Analysis

**For: Irina (Jira/Confluence Support)**  
**Date: ${new Date().toLocaleDateString()}**  
**Environment: ${this.baseUrl}**

## 📊 Current Environment Status

### Jira Configuration
- **Current Version**: ${report.currentState.jira.version}
- **Target Version**: 10.3.x LTS
- **Build Date**: ${report.currentState.jira.buildDate}
- **Deployment Type**: ${report.currentState.jira.deploymentType}

### Java Runtime
- **Current Java**: ${currentJava}
- **Target Java**: Java 17 LTS
- **Upgrade Required**: ${upgradeRequired ? '✅ YES' : '❌ NO'}
- **Upgrade Type**: ${report.currentState.java.upgradeType}

## 🎯 Upgrade Impact Analysis

### Risk Level: **${riskLevel}**

#### High Priority Items
${report.riskAssessment.high.map((item: string) => `- ${item}`).join('\n')}

#### Medium Priority Items  
${report.riskAssessment.medium.map((item: string) => `- ${item}`).join('\n')}

## 🧪 Testing Strategy

Our comprehensive testing framework will validate:

1. **Platform Compatibility** - Java 17 + Platform 7 stability
2. **ITSM Workflows** - Service desk, incidents, changes
3. **Performance** - Response times and system health
4. **Security** - Enhanced authentication and permissions
5. **UI/UX** - Dark theme and interface changes

## 📅 Recommended Timeline

- **Week 1**: Platform validation and critical path testing
- **Week 2**: ITSM workflow comprehensive validation  
- **Week 3**: Performance and integration testing
- **Week 4**: Final validation and go-live recommendation

## ✅ Next Steps

1. **Immediate**: Begin platform compatibility testing
2. **This Week**: Execute ITSM workflow validation
3. **Ongoing**: Daily automated reports and monitoring

---

*This analysis was generated by our intelligent testing framework to support your Jira upgrade decision.*
`;

    const summaryPath = join(__dirname, '..', 'reports', 'executive-summary-for-irina.md');
    await fs.writeFile(summaryPath, summary);
    
    console.log('✅ Executive summary generated for Irina');
  }
}

// Execute detection if run directly
if (require.main === module) {
  const detector = new JiraEnvironmentDetector();
  detector.detectEnvironment().catch(console.error);
}

export { JiraEnvironmentDetector }; 