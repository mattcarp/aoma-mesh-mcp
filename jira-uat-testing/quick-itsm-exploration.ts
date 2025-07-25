import { chromium } from 'playwright';
import * as fs from 'fs';

async function quickITSMExploration() {
  console.log('🎯 QUICK ITSM EXPLORATION');
  console.log('========================');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  
  // Load our working session
  const sessionData = JSON.parse(fs.readFileSync('jira-uat-session-working.json', 'utf8'));
  await context.addCookies(sessionData.cookies);
  
  const page = await context.newPage();
  
  try {
    // Navigate to ITSM project
    console.log('📍 Navigating to ITSM project...');
    const startTime = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/projects/ITSM');
    const loadTime = Date.now() - startTime;
    console.log(`⏱️  ITSM Project load time: ${loadTime}ms`);
    
    // Check if we're authenticated
    const title = await page.title();
    console.log(`📝 Page title: ${title}`);
    
    if (title.includes('Log')) {
      console.log('❌ Session expired, need re-authentication');
      return;
    }
    
    // Get ITSM project stats
    await page.waitForTimeout(2000);
    
    // Try to find ticket counts
    const projectStats = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const stats: string[] = [];
      
      elements.forEach(el => {
        const text = el.textContent || '';
        if (text.match(/\d{1,3}(,\d{3})*\s+(issues?|tickets?)/i)) {
          stats.push(text.trim());
        }
      });
      
      return stats;
    });
    
    console.log('📊 Found project statistics:');
    projectStats.forEach(stat => console.log(`   ${stat}`));
    
    // Navigate to Issue Navigator for ITSM
    console.log('🔍 Navigating to ITSM Issue Navigator...');
    const searchStartTime = Date.now();
    await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM');
    const searchLoadTime = Date.now() - searchStartTime;
    console.log(`⏱️  ITSM Issue Navigator load time: ${searchLoadTime}ms`);
    
    await page.waitForTimeout(3000);
    
    // Get search results count
    const resultsInfo = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let resultsText = '';
      
      elements.forEach(el => {
        const text = el.textContent || '';
        if (text.match(/\d+.*of.*\d+/i) || text.match(/showing.*\d+.*issues?/i)) {
          resultsText = text.trim();
        }
      });
      
      return resultsText;
    });
    
    console.log(`📋 Search results: ${resultsInfo}`);
    
    // Take a screenshot of results
    await page.screenshot({ 
      path: `itsm-exploration-${Date.now()}.png`, 
      fullPage: true 
    });
    console.log('📸 Screenshot saved');
    
    // Summary
    console.log('\n🎯 ITSM EXPLORATION SUMMARY');
    console.log('============================');
    console.log(`✅ ITSM Project accessible: ${loadTime}ms`);
    console.log(`✅ Issue Navigator accessible: ${searchLoadTime}ms`);
    console.log(`📊 Results found: ${resultsInfo}`);
    console.log(`🔐 Authentication: Working`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

quickITSMExploration().catch(console.error); 