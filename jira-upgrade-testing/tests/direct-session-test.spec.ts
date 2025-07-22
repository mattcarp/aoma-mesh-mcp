import { test, expect } from '@playwright/test';

test.describe('Direct Session Test', () => {
  test('should work with current browser session', async ({ page }) => {
    console.log('🚀 Testing with direct session...');
    
    // Try different dashboard URLs to find what works
    const dashboardUrls = [
      '/secure/Dashboard.jspa',
      '/dashboard',
      '/secure/Dashboard.jsp',
      '/',
      '/secure/'
    ];
    
    let workingUrl = '';
    let isAuthenticated = false;
    
    for (const url of dashboardUrls) {
      try {
        console.log(`🔍 Trying URL: ${url}`);
        await page.goto(url, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        // Check if we got a 404 or login page
        const pageText = await page.textContent('body');
        const hasError = pageText.includes('HTTP Status 404') || 
                        pageText.includes('Not Found') || 
                        pageText.includes('Apache Tomcat');
        
        const hasLogin = pageText.includes('log in') || 
                        pageText.includes('sign in') ||
                        page.url().includes('login');
        
        if (!hasError && !hasLogin) {
          workingUrl = url;
          isAuthenticated = true;
          console.log(`✅ Found working URL: ${url}`);
          break;
        } else {
          console.log(`❌ URL ${url} failed: ${hasError ? '404 error' : 'login required'}`);
        }
      } catch (error) {
        console.log(`❌ URL ${url} failed with error: ${error.message}`);
      }
    }
    
    if (!isAuthenticated) {
      console.log('❌ No working authenticated URLs found');
      // Take a screenshot of what we're seeing
      await page.screenshot({ path: 'session-debug.png', fullPage: true });
      throw new Error('Could not find any working authenticated JIRA URLs');
    }
    
    console.log(`🎉 Successfully authenticated at: ${workingUrl}`);
    
    // Take a screenshot of the working page
    await page.screenshot({ path: 'working-jira-page.png', fullPage: true });
    
    // Try to discover available projects or navigation
    const navigation = await page.evaluate(() => {
      const navLinks = Array.from(document.querySelectorAll('a[href*="project"], a[href*="browse"], a[href*="issues"]'));
      return navLinks.map(link => ({
        text: link.textContent?.trim(),
        href: link.getAttribute('href')
      })).filter(item => item.text && item.href);
    });
    
    console.log('🔗 Found navigation links:', navigation);
    
    // Try to find project links specifically
    const projectLinks = navigation.filter(link => 
      link.href?.includes('browse/') || 
      link.href?.includes('project') ||
      link.text?.match(/^[A-Z]{2,10}$/) // Project keys are usually uppercase
    );
    
    console.log('📋 Found potential project links:', projectLinks);
    
    expect(isAuthenticated).toBe(true);
  });
});
