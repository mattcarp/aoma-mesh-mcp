#!/usr/bin/env node

/**
 * 🔑 Jira UAT Credentials Setup - CommonJS version
 */

const fs = require('fs');
const path = require('path');

class CredentialSetup {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
    this.uatUrl = 'https://jirauat.smedigitalapps.com';
  }

  async setup() {
    console.log('🔑 Jira UAT Credentials Setup\n');
    console.log(`🎯 Target: ${this.uatUrl}`);
    console.log('📋 For Irina\'s upgrade testing environment\n');

    // Check existing .env file
    const existingEnv = this.checkExistingCredentials();
    
    if (existingEnv.hasJiraCredentials) {
      console.log('✅ Found existing Jira credentials!');
      await this.testCredentials(existingEnv);
    } else {
      console.log('⚠️  No Jira credentials found in .env file');
      console.log('\n💡 Quick Setup Options:');
      console.log('1. Add manually to .env file:');
      console.log('   JIRA_USERNAME=your-username');
      console.log('   JIRA_PASSWORD=your-password');
      console.log('   # OR use API token (more secure):');
      console.log('   JIRA_API_TOKEN=your-api-token');
      console.log('\n2. Contact Irina for UAT environment access');
      console.log('\n📞 UAT Environment: https://jirauat.smedigitalapps.com/');
      
      // Show current .env variables for context
      console.log('\n📄 Current .env variables:');
      Object.keys(existingEnv.allVars).forEach(key => {
        console.log(`   ${key}: [SET]`);
      });
    }
  }

  checkExistingCredentials() {
    try {
      const envContent = fs.readFileSync(this.envPath, 'utf-8');
      const envVars = this.parseEnvFile(envContent);
      
      // Check for Jira-specific credentials
      const jiraUsername = envVars.JIRA_USERNAME || envVars.JIRA_USER;
      const jiraPassword = envVars.JIRA_PASSWORD || envVars.JIRA_PASS;
      const jiraToken = envVars.JIRA_TOKEN || envVars.JIRA_API_TOKEN;
      
      return {
        hasJiraCredentials: !!(jiraUsername && (jiraPassword || jiraToken)),
        username: jiraUsername,
        password: jiraPassword,
        token: jiraToken,
        allVars: envVars
      };
      
    } catch (error) {
      console.log('📄 No .env file found');
      return { hasJiraCredentials: false, allVars: {} };
    }
  }

  parseEnvFile(content) {
    const vars = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (match) {
        vars[match[1]] = match[2].replace(/^["']|["']$/g, ''); // Remove quotes
      }
    });
    return vars;
  }

  async testCredentials(creds) {
    console.log('\n🧪 Testing credentials against UAT environment...');
    
    try {
      const headers = this.buildAuthHeaders(creds);
      const response = await fetch(`${this.uatUrl}/rest/api/2/serverInfo`, { headers });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Credentials work! Successfully connected to Jira UAT');
        console.log(`✅ Jira Version: ${data.version}`);
        console.log(`✅ Build Date: ${data.buildDate}`);
        
        // Now run our environment detection
        console.log('\n🔍 Running full environment detection...');
        const { QuickJiraDetector } = require('./detect-environment-module.cjs');
        const detector = new QuickJiraDetector();
        await detector.detect();
        
      } else {
        console.log(`❌ Authentication failed: HTTP ${response.status}`);
        console.log('💡 Please check credentials and try again');
      }
      
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      console.log('💡 Check network connectivity and credentials');
    }
  }

  buildAuthHeaders(creds) {
    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (creds.token) {
      headers['Authorization'] = `Bearer ${creds.token}`;
    } else if (creds.username && creds.password) {
      const auth = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    return headers;
  }
}

// Execute setup
const setup = new CredentialSetup();
setup.setup().catch(console.error); 