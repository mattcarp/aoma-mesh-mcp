#!/usr/bin/env tsx
/**
 * JIRA connection test with VPN and 2FA checks
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';

config();

async function checkVPNConnection(): Promise<boolean> {
  console.log('🔍 Checking VPN connection...');
  
  try {
    // Check for Palo Alto Networks Global Protect process
    const processes = execSync('ps aux | grep -i "globalprotect\\|palo" | grep -v grep', { encoding: 'utf8' });
    
    if (processes.trim()) {
      console.log('✅ Palo Alto Networks Global Protect VPN detected');
      
      // Additional check - try to resolve Sony Music internal domains
      try {
        const nslookup = execSync('nslookup jira.smedigitalapps.com', { encoding: 'utf8', timeout: 5000 });
        if (nslookup.includes('Address:')) {
          console.log('✅ Can resolve Sony Music internal domains');
          return true;
        }
      } catch (error) {
        console.log('⚠️  VPN process running but cannot resolve internal domains');
        return false;
      }
    }
    
    console.log('❌ Palo Alto Networks Global Protect VPN not detected');
    console.log('   Please connect to Sony Music VPN first');
    return false;
  } catch (error) {
    console.log('❌ Cannot check VPN status:', error.message);
    return false;
  }
}

async function prompt2FA(): Promise<void> {
  console.log('\n📱 2FA Required:');
  console.log('   1. Check your phone for Sony Music 2FA notification');
  console.log('   2. Approve the authentication request');
  console.log('   3. Wait for confirmation before proceeding');
  
  // Give user time to complete 2FA
  console.log('\n⏳ Waiting 30 seconds for 2FA completion...');
  await new Promise(resolve => setTimeout(resolve, 30000));
}

async function testJiraConnection(skipVPN = false): Promise<boolean> {
  console.log('🧪 Testing JIRA connection...\n');

  // Check credentials
  const username = process.env.JIRA_USERNAME || process.env.JIRA_EMAIL;
  const password = process.env.JIRA_PASSWORD;
  const baseUrl = process.env.JIRA_BASE_URL || 'https://jira.smedigitalapps.com';

  if (!username || !password) {
    console.log('❌ Missing JIRA credentials in .env file');
    console.log('Need: JIRA_USERNAME and JIRA_PASSWORD');
    return false;
  }

  // Check VPN connection first
  if (!skipVPN) {
    const vpnConnected = await checkVPNConnection();
    if (!vpnConnected) {
      return false;
    }
  }

  console.log(`\n📍 JIRA URL: ${baseUrl}`);
  console.log(`👤 Username: ${username}`);

  // Test connection
  try {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/rest/api/2/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (response.ok) {
      const user = await response.json();
      console.log('\n✅ JIRA connection successful!');
      console.log(`   Logged in as: ${user.displayName}`);
      console.log(`   Email: ${user.emailAddress}`);
      return true;
    } else {
      console.log(`\n❌ JIRA connection failed: ${response.status} ${response.statusText}`);
      if (response.status === 401) {
        console.log('   Authentication failed - need 2FA?');
        await prompt2FA();
        console.log('\n🔄 Retrying after 2FA...');
        return testJiraConnection(true); // Skip VPN check on retry
      }
      return false;
    }
  } catch (error) {
    console.log('\n❌ Connection error:', error.message);
    if (error.name === 'TimeoutError') {
      console.log('   Connection timed out - check VPN status');
    }
    return false;
  }
}

async function heartbeatCheck(): Promise<void> {
  console.log('\n💓 Starting heartbeat check (press Ctrl+C to stop)...');
  
  let checkCount = 0;
  const interval = setInterval(async () => {
    checkCount++;
    console.log(`\n💓 Heartbeat ${checkCount} - ${new Date().toLocaleTimeString()}`);
    
    const success = await testJiraConnection(true); // Skip VPN check in heartbeat
    
    if (!success) {
      console.log('💔 Heartbeat failed - connection lost');
      console.log('   You may need to reconnect VPN or redo 2FA');
    } else {
      console.log('💚 Heartbeat successful - connection active');
    }
  }, 60000); // Check every minute

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping heartbeat check...');
    clearInterval(interval);
    process.exit(0);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';

  if (command === 'heartbeat') {
    // First do a full test, then start heartbeat
    const success = await testJiraConnection();
    if (success) {
      await heartbeatCheck();
    } else {
      console.log('❌ Initial connection failed - fix issues before starting heartbeat');
    }
  } else {
    await testJiraConnection();
  }
}

main().catch(console.error);
