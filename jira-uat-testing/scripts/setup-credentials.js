#!/usr/bin/env node

/**
 * 🔑 Jira UAT Credentials Setup
 * Helps configure credentials for accessing Irina's UAT environment
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class CredentialSetup {
  constructor() {
    this.envPath = path.join(process.cwd(), '.env');
    this.uatUrl = 'https://jirauat.smedigitalapps.com';
  }

  async setup() {
    console.log('🔑 Jira UAT Credentials Setup\n');
    console.log(`🎯 Target: ${this.uatUrl}`);
    console.log('📋 For Irina\'s upgrade testing environment\n');

    try {
      // Check existing .env file
      const existingEnv = await this.checkExistingCredentials();
      
      if (existingEnv.hasJiraCredentials) {
        console.log('✅ Found existing Jira credentials!');
        await this.testCredentials(existingEnv);
      } else {
        console.log('⚠️  No Jira credentials found in .env file');
        await this.promptForCredentials();
      }
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
    }
  }

  async checkExistingCredentials() {
    try {
      const envContent = fs.readFileSync(this.envPath, 'utf-8');
      const envVars = this.parseEnvFile(envContent);
      
      console.log('📄 Found .env file with variables:');
      Object.keys(envVars).forEach(key => {
        if (key.toLowerCase().includes('jira') || 
            key.toLowerCase().includes('user') || 
            key.toLowerCase().includes('pass') ||
            key.toLowerCase().includes('token')) {
          console.log(`   ${key}: ${envVars[key] ? '[SET]' : '[EMPTY]'}`);
        }
      });
      
      // Check for Jira-specific credentials
      const jiraUsername = envVars.JIRA_USERNAME || envVars.JIRA_USER || envVars.USERNAME;
      const jiraPassword = envVars.JIRA_PASSWORD || envVars.JIRA_PASS || envVars.PASSWORD;
      const jiraToken = envVars.JIRA_TOKEN || envVars.JIRA_API_TOKEN || envVars.API_TOKEN;
      
      return {
        hasJiraCredentials: !!(jiraUsername && (jiraPassword || jiraToken)),
        username: jiraUsername,
        password: jiraPassword,
        token: jiraToken,
        allVars: envVars
      };
      
    } catch (error) {
      console.log('📄 No .env file found, will create one');
      return { hasJiraCredentials: false, allVars: {} };
    }
  }

  parseEnvFile(content) {
    const vars = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
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
        console.log('\n🔍 Running environment detection...');
        require('./detect-environment.cjs');
        
      } else {
        console.log(`❌ Authentication failed: HTTP ${response.status}`);
        await this.promptForCredentials();
      }
      
    } catch (error) {
      console.log(`❌ Connection failed: ${error.message}`);
      await this.promptForCredentials();
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

  async promptForCredentials() {
    console.log('\n🔧 Setting up Jira UAT credentials...');
    console.log('💡 You\'ll need either:');
    console.log('   1. Username + Password for Jira UAT');
    console.log('   2. Username + API Token (more secure)');
    console.log('\n📞 Contact Irina for UAT environment access if needed');
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const username = await this.ask(rl, 'Jira Username: ');
    const authChoice = await this.ask(rl, 'Use (1) Password or (2) API Token? [1]: ');
    
    let authValue;
    if (authChoice === '2') {
      authValue = await this.ask(rl, 'API Token: ');
      await this.saveCredentials({ username, token: authValue });
    } else {
      authValue = await this.ask(rl, 'Password: ');
      await this.saveCredentials({ username, password: authValue });
    }
    
    rl.close();
    
    console.log('\n✅ Credentials saved to .env file');
    console.log('🔍 Testing connection...');
    
    // Test the new credentials
    const testCreds = authChoice === '2' 
      ? { username, token: authValue }
      : { username, password: authValue };
      
    await this.testCredentials(testCreds);
  }

  async ask(rl, question) {
    return new Promise(resolve => {
      rl.question(question, resolve);
    });
  }

  async saveCredentials(creds) {
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(this.envPath, 'utf-8');
    } catch (error) {
      // File doesn't exist, start fresh
    }
    
    // Add Jira credentials
    envContent += '\n# Jira UAT Environment Credentials\n';
    envContent += `JIRA_USERNAME=${creds.username}\n`;
    
    if (creds.password) {
      envContent += `JIRA_PASSWORD=${creds.password}\n`;
    }
    
    if (creds.token) {
      envContent += `JIRA_API_TOKEN=${creds.token}\n`;
    }
    
    fs.writeFileSync(this.envPath, envContent);
  }
}

// Execute setup
const setup = new CredentialSetup();
setup.setup().catch(console.error); 