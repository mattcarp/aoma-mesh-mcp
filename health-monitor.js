#!/usr/bin/env node
/**
 * AOMA Mesh Health Monitor & Auto-Recovery Script
 * Proactive monitoring and self-healing for critical services
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs').promises;

class AOMAPHealthMonitor {
  constructor() {
    this.services = {
      openai: {
        url: 'https://api.openai.com/v1/models',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        critical: true,
        lastCheck: null,
        status: 'unknown'
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/',
        headers: { 'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY },
        critical: true,
        lastCheck: null,
        status: 'unknown'
      }
    };
    
    this.alerts = [];
    this.recoveryAttempts = {};
  }

  async checkService(name, config) {
    try {
      const startTime = Date.now();
      const response = await this.httpRequest(config.url, config.headers);
      const latency = Date.now() - startTime;
      
      return {
        status: response.statusCode < 400 ? 'healthy' : 'degraded',
        latency,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  httpRequest(url, headers) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      }).on('error', reject);
    });
  }

  async attemptRecovery(service) {
    const attempts = this.recoveryAttempts[service] || 0;
    
    if (attempts >= 3) {
      this.createAlert('CRITICAL', `Service ${service} failed after 3 recovery attempts`);
      return false;
    }

    this.recoveryAttempts[service] = attempts + 1;
    
    // Recovery strategies
    const strategies = {
      openai: async () => {
        // Try alternate API key from env
        if (process.env.OPENAI_API_KEY_BACKUP) {
          process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY_BACKUP;
          return true;
        }
        return false;
      },
      supabase: async () => {
        // Restart connection pool
        exec('npm run reset-supabase-connection', (error) => {
          if (!error) return true;
        });
        return false;
      }
    };

    if (strategies[service]) {
      const recovered = await strategies[service]();
      if (recovered) {
        this.createAlert('INFO', `Service ${service} recovered`);
        this.recoveryAttempts[service] = 0;
      }
      return recovered;
    }
  }

  createAlert(level, message) {
    const alert = {
      level,
      message,
      timestamp: new Date().toISOString()
    };
    
    this.alerts.push(alert);
    console.log(`[${level}] ${message}`);
    
    // Send to monitoring service
    if (level === 'CRITICAL') {
      this.sendToSlack(alert);
      this.createJiraTicket(alert);
    }
  }

  async sendToSlack(alert) {
    // Implement Slack webhook notification
    console.log('Would send to Slack:', alert);
  }

  async createJiraTicket(alert) {
    // Auto-create Jira ticket for critical issues
    console.log('Would create Jira ticket:', alert);
  }

  async generateHealthReport() {
    const report = {
      timestamp: new Date().toISOString(),
      services: {},
      alerts: this.alerts.slice(-10),
      recommendations: []
    };

    for (const [name, config] of Object.entries(this.services)) {
      const health = await this.checkService(name, config);
      report.services[name] = health;
      
      if (health.status === 'failed' && config.critical) {
        report.recommendations.push({
          service: name,
          action: 'immediate',
          suggestion: `Investigate ${name} connectivity issues`,
          autoRecovery: await this.attemptRecovery(name)
        });
      }
    }

    return report;
  }

  async start(intervalMs = 60000) {
    console.log('Starting AOMA Health Monitor...');
    
    // Initial check
    const report = await this.generateHealthReport();
    await fs.writeFile('health-report.json', JSON.stringify(report, null, 2));
    
    // Continuous monitoring
    setInterval(async () => {
      const report = await this.generateHealthReport();
      await fs.writeFile('health-report.json', JSON.stringify(report, null, 2));
      
      // Check for degradation patterns
      this.analyzePatterns(report);
    }, intervalMs);
  }

  analyzePatterns(report) {
    // Detect patterns that might indicate upcoming failures
    const patterns = {
      increasingLatency: false,
      intermittentFailures: false,
      degradationTrend: false
    };

    // Implement pattern detection logic here
    // This would analyze historical data to predict failures

    if (Object.values(patterns).some(p => p)) {
      this.createAlert('WARNING', 'Degradation pattern detected - preemptive action recommended');
    }
  }
}

// Start the monitor
const monitor = new AOMAPHealthMonitor();
monitor.start();

module.exports = AOMAPHealthMonitor;
