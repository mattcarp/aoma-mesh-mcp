#!/usr/bin/env tsx
/**
 * JIRA scraper using Playwright for session-based authentication
 */

import { chromium, Browser, Page } from 'playwright';
import { config } from 'dotenv';

config();

class JiraSessionScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private cookies: any[] = [];

  async init() {
    console.log('🚀 Starting browser...');
    this.browser = await chromium.launch({ headless: false }); // Visible for debugging
    this.page = await this.browser.newPage();
  }

  async login() {
    if (!this.page) throw new Error('Browser not initialized');

    const username = process.env.JIRA_USERNAME;
    const password = process.env.JIRA_PASSWORD;
    const baseUrl = 'https://jira.smedigitalapps.com/jira';

    console.log('🔐 Logging into JIRA...');
    
    // Go to JIRA login page
    await this.page.goto(`${baseUrl}/login.jsp`);
    
    // Wait for login form
    await this.page.waitForSelector('#login-form', { timeout: 30000 });
    
    // Fill in credentials
    await this.page.fill('#username', username!);
    await this.page.fill('#password', password!);
    
    // Submit login
    await this.page.click('#login');
    
    // Wait for successful login (dashboard or 2FA page)
    try {
      await this.page.waitForURL('**/secure/Dashboard.jspa', { timeout: 60000 });
      console.log('✅ Login successful!');
    } catch (error) {
      // Check if we're on 2FA page
      const currentUrl = this.page.url();
      if (currentUrl.includes('mfa') || currentUrl.includes('2fa') || currentUrl.includes('verification')) {
        console.log('📱 2FA required - please complete on your device');
        console.log('⏳ Waiting up to 2 minutes for 2FA completion...');
        
        try {
          await this.page.waitForURL('**/secure/Dashboard.jspa', { timeout: 120000 });
          console.log('✅ 2FA completed successfully!');
        } catch (e) {
          throw new Error('2FA timeout - please complete 2FA faster');
        }
      } else {
        throw new Error('Login failed - check credentials');
      }
    }

    // Capture cookies
    this.cookies = await this.page.context().cookies();
    console.log(`📝 Captured ${this.cookies.length} session cookies`);
  }

  async testAPIAccess() {
    if (!this.page) throw new Error('Browser not initialized');

    console.log('🧪 Testing API access with session...');
    
    const testUrl = 'https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=key=ITSM-55362&maxResults=1';
    
    try {
      const response = await this.page.goto(testUrl);
      
      if (response?.ok()) {
        const content = await this.page.content();
        
        // Check if it's JSON (API response) or HTML (login redirect)
        if (content.trim().startsWith('{')) {
          console.log('✅ API access successful!');
          const data = JSON.parse(content);
          console.log('Response:', JSON.stringify(data, null, 2));
          return true;
        } else {
          console.log('❌ Redirected to login page - session expired');
          return false;
        }
      } else {
        console.log(`❌ API request failed: ${response?.status()}`);
        return false;
      }
    } catch (error) {
      console.log('❌ API test error:', error.message);
      return false;
    }
  }

  async fetchTickets(jql: string = 'ORDER BY created DESC', maxResults: number = 10) {
    if (!this.page) throw new Error('Browser not initialized');

    console.log(`🎫 Fetching tickets with JQL: ${jql}`);
    
    const url = `https://jira.smedigitalapps.com/jira/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=key,summary,created,status,priority,description`;
    
    try {
      const response = await this.page.goto(url);
      
      if (response?.ok()) {
        const content = await this.page.content();
        
        if (content.trim().startsWith('{')) {
          const data = JSON.parse(content);
          
          console.log(`✅ Found ${data.issues.length} tickets:`);
          data.issues.forEach((ticket: any, i: number) => {
            console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 60)}...`);
            console.log(`      Status: ${ticket.fields.status.name} | Created: ${ticket.fields.created.slice(0, 10)}`);
          });
          
          return data.issues;
        } else {
          console.log('❌ Not JSON response - session may have expired');
          return [];
        }
      } else {
        console.log(`❌ Request failed: ${response?.status()}`);
        return [];
      }
    } catch (error) {
      console.log('❌ Fetch error:', error.message);
      return [];
    }
  }

  async getCookiesForAPI() {
    return this.cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test';
  
  const scraper = new JiraSessionScraper();
  
  try {
    await scraper.init();
    await scraper.login();
    
    if (command === 'test') {
      await scraper.testAPIAccess();
    } else if (command === 'fetch') {
      const maxResults = parseInt(args[1]) || 10;
      await scraper.fetchTickets('ORDER BY created DESC', maxResults);
    } else if (command === 'cookies') {
      const cookieHeader = await scraper.getCookiesForAPI();
      console.log('Cookie header for API calls:');
      console.log(cookieHeader);
    } else {
      console.log('Usage:');
      console.log('  npx tsx jira-session-scraper.ts test');
      console.log('  npx tsx jira-session-scraper.ts fetch [count]');
      console.log('  npx tsx jira-session-scraper.ts cookies');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);
