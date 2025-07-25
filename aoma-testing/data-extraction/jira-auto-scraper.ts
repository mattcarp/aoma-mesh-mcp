#!/usr/bin/env tsx
/**
 * Comprehensive JIRA auto-scraper with all login methods
 */

import { chromium } from 'playwright';
import { config } from 'dotenv';

config();

async function comprehensiveJiraLogin() {
  console.log('🚀 Starting comprehensive JIRA login automation...');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const username = 'mcarpent';
  const password = 'Dooley1_Jude2';
  const baseUrl = 'https://jirauat.smedigitalapps.com/jira';
  
  try {
    // Method 1: Try direct login page
    console.log('\n🔄 Method 1: Direct login page...');
    await page.goto(`${baseUrl}/login.jsp`);
    await page.waitForTimeout(2000);
    
    if (await page.locator('#login-form-username').isVisible()) {
      console.log('✅ Found direct login form');
      await page.fill('#login-form-username', username);
      await page.fill('#login-form-password', password);
      await page.click('#loginMainButton');
      await page.waitForTimeout(3000);
      
      if (await testAPIAccess(page)) {
        console.log('🎉 Method 1 SUCCESS!');
        return await extractAndTest(page);
      }
    }
    
    // Method 2: Dashboard with hidden form
    console.log('\n🔄 Method 2: Dashboard login form...');
    await page.goto(`${baseUrl}/secure/Dashboard.jspa`);
    await page.waitForTimeout(2000);
    
    // Try workaccount field first
    if (await page.locator('#login-form-workaccount').isVisible()) {
      console.log('✅ Found workaccount field');
      await page.fill('#login-form-workaccount', username);
      await page.click('#loginMainButton');
      await page.waitForTimeout(2000);
    }
    
    // Now try regular fields
    if (await page.locator('#login-form-username').isVisible()) {
      console.log('✅ Found username/password fields');
      await page.fill('#login-form-username', username);
      await page.fill('#login-form-password', password);
      await page.click('#loginMainButton');
      await page.waitForTimeout(3000);
      
      if (await testAPIAccess(page)) {
        console.log('🎉 Method 2 SUCCESS!');
        return await extractAndTest(page);
      }
    }
    
    // Method 3: Try SSO/alternate login
    console.log('\n🔄 Method 3: SSO login...');
    await page.goto(`${baseUrl}/login.jsp?permissionViolation=true&os_destination=%2Fsecure%2FDashboard.jspa`);
    await page.waitForTimeout(3000);
    
    // Look for any visible username fields
    const usernameFields = await page.locator('input[type="text"], input[name*="user"], input[id*="user"]').all();
    const passwordFields = await page.locator('input[type="password"]').all();
    
    for (let i = 0; i < usernameFields.length; i++) {
      const userField = usernameFields[i];
      if (await userField.isVisible()) {
        console.log(`✅ Trying username field ${i}`);
        await userField.fill(username);
        
        if (i < passwordFields.length && await passwordFields[i].isVisible()) {
          await passwordFields[i].fill(password);
        }
        
        // Find submit button
        const submitButtons = await page.locator('button[type="submit"], input[type="submit"], button:has-text("Log"), button:has-text("Sign")').all();
        for (const btn of submitButtons) {
          if (await btn.isVisible()) {
            await btn.click();
            await page.waitForTimeout(3000);
            break;
          }
        }
        
        if (await testAPIAccess(page)) {
          console.log('🎉 Method 3 SUCCESS!');
          return await extractAndTest(page);
        }
      }
    }
    
    // Method 4: Check if already logged in
    console.log('\n🔄 Method 4: Check if already logged in...');
    await page.goto(baseUrl);
    await page.waitForTimeout(2000);
    
    if (await testAPIAccess(page)) {
      console.log('🎉 Already logged in!');
      return await extractAndTest(page);
    }
    
    // Method 5: Basic auth headers (last resort)
    console.log('\n🔄 Method 5: Basic auth API test...');
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/rest/api/2/search?jql=ORDER BY created DESC&maxResults=1`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('🎉 Basic auth works!');
      const data = await response.json();
      console.log(`Total tickets available: ${data.total}`);
      return { method: 'basic_auth', total: data.total };
    }
    
    console.log('❌ All login methods failed');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    // Keep browser open briefly for inspection
    console.log('\n📸 Taking final screenshot...');
    await page.screenshot({ path: 'jira-final-state.png' });
    
    setTimeout(async () => {
      await browser.close();
    }, 5000);
  }
}

async function testAPIAccess(page: any): Promise<boolean> {
  try {
    await page.goto('https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=1');
    const content = await page.content();
    return content.includes('"startAt"') || content.includes('"total"');
  } catch (e) {
    return false;
  }
}

async function extractAndTest(page: any) {
  console.log('🍪 Extracting cookies and testing API...');
  
  const cookies = await page.context().cookies();
  const jiraCookies = cookies.filter((c: any) => 
    c.domain.includes('smedigitalapps.com') ||
    c.name.includes('JSESSIONID') ||
    c.name.includes('atlassian')
  );
  
  const cookieHeader = jiraCookies.map((c: any) => `${c.name}=${c.value}`).join('; ');
  
  // Test full API call
  const response = await fetch('https://jirauat.smedigitalapps.com/jira/rest/api/2/search?jql=ORDER BY created DESC&maxResults=5&fields=key,summary,created', {
    headers: {
      'Cookie': cookieHeader,
      'Accept': 'application/json'
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    console.log(`🎉 SUCCESS! Found ${data.total} total tickets`);
    console.log('Recent tickets:');
    
    data.issues.forEach((ticket: any, i: number) => {
      console.log(`   ${i+1}. ${ticket.key}: ${ticket.fields.summary.slice(0, 50)}...`);
    });
    
    // Save cookies for reuse
    const fs = await import('fs');
    fs.writeFileSync('jira-session.json', JSON.stringify({
      cookies: jiraCookies,
      cookieHeader,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log('💾 Session saved to jira-session.json');
    return { method: 'session', total: data.total, cookies: cookieHeader };
  }
  
  return null;
}

comprehensiveJiraLogin().catch(console.error);
