import { chromium } from 'playwright';

async function loginDirectly() {
  console.log('🔐 DIRECT LOGIN ATTEMPT - USING ACTUAL CREDENTIALS');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down for debugging
  });
  const page = await browser.newPage();
  
  try {
    console.log('📍 Step 1: Navigate to JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Take screenshot of initial page
    await page.screenshot({ 
      path: 'jira-uat-testing/login-step1-initial.png',
      fullPage: true 
    });
    console.log('📸 Screenshot: login-step1-initial.png');
    
    const initialUrl = page.url();
    console.log(`🌐 Initial URL: ${initialUrl}`);
    
    // Look for username field
    console.log('🔍 Step 2: Looking for username field...');
    
    // Wait for any username input to appear
    await page.waitForSelector('input[type="text"], input[name*="user"], input[id*="user"], input[placeholder*="user"]', { timeout: 10000 });
    
    // Find the username field
    const usernameField = page.locator('input[type="text"], input[name*="user"], input[id*="user"], input[placeholder*="user"]').first();
    
    if (await usernameField.isVisible()) {
      console.log('✅ Found username field');
      await usernameField.fill('mcarpent');
      console.log('✅ Filled username: mcarpent');
      
      // Take screenshot after username
      await page.screenshot({ 
        path: 'jira-uat-testing/login-step2-username.png',
        fullPage: true 
      });
      console.log('📸 Screenshot: login-step2-username.png');
      
      // Look for Continue button or password field
      const continueButton = page.locator('button:has-text("Continue"), input[type="submit"], button[type="submit"]').first();
      
      if (await continueButton.isVisible({ timeout: 3000 })) {
        console.log('🔍 Found Continue button, clicking...');
        await continueButton.click();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        
        // Take screenshot after continue
        await page.screenshot({ 
          path: 'jira-uat-testing/login-step3-after-continue.png',
          fullPage: true 
        });
        console.log('📸 Screenshot: login-step3-after-continue.png');
      }
      
      // Now look for password field
      console.log('🔍 Step 3: Looking for password field...');
      await page.waitForSelector('input[type="password"], input[name*="pass"], input[id*="pass"]', { timeout: 10000 });
      
      const passwordField = page.locator('input[type="password"], input[name*="pass"], input[id*="pass"]').first();
      
      if (await passwordField.isVisible()) {
        console.log('✅ Found password field');
        await passwordField.fill('Dooley1_Jude2');
        console.log('✅ Filled password');
        
        // Take screenshot after password
        await page.screenshot({ 
          path: 'jira-uat-testing/login-step4-password.png',
          fullPage: true 
        });
        console.log('📸 Screenshot: login-step4-password.png');
        
        // Look for login/sign in button
        const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Login"), input[type="submit"], button[type="submit"]').first();
        
        if (await loginButton.isVisible({ timeout: 3000 })) {
          console.log('🔍 Found login button, clicking...');
          await loginButton.click();
          
          // Wait for navigation or 2FA prompt
          console.log('⏳ Waiting for login response...');
          await page.waitForTimeout(5000);
          
          // Take screenshot after login attempt
          await page.screenshot({ 
            path: 'jira-uat-testing/login-step5-after-login.png',
            fullPage: true 
          });
          console.log('📸 Screenshot: login-step5-after-login.png');
          
          const afterLoginUrl = page.url();
          console.log(`🌐 After login URL: ${afterLoginUrl}`);
          
          // Check if we need 2FA
          const needs2FA = await page.locator('input[name*="code"], input[placeholder*="code"], input[id*="code"]').isVisible({ timeout: 3000 });
          
          if (needs2FA) {
            console.log('📱 2FA REQUIRED - Please provide the code from your phone');
            console.log('⏳ Waiting 60 seconds for manual 2FA entry...');
            
            // Wait for user to enter 2FA
            await page.waitForTimeout(60000);
            
            // Take screenshot after 2FA wait
            await page.screenshot({ 
              path: 'jira-uat-testing/login-step6-after-2fa.png',
              fullPage: true 
            });
            console.log('📸 Screenshot: login-step6-after-2fa.png');
          }
          
          // Check final authentication status
          const finalUrl = page.url();
          console.log(`🌐 Final URL: ${finalUrl}`);
          
          if (finalUrl.includes('secure') || finalUrl.includes('dashboard')) {
            console.log('🎉 SUCCESS: Successfully logged in!');
            
            // Save the authenticated session
            await page.context().storageState({ 
              path: 'jira-uat-testing/playwright/.auth/jira-uat-user.json' 
            });
            console.log('💾 Saved authentication session');
            
            // Take final success screenshot
            await page.screenshot({ 
              path: 'jira-uat-testing/login-success-final.png',
              fullPage: true 
            });
            console.log('📸 Screenshot: login-success-final.png');
            
            return true;
          } else {
            console.log('❌ Login may have failed - check screenshots');
            return false;
          }
        } else {
          console.log('❌ Could not find login button');
          return false;
        }
      } else {
        console.log('❌ Could not find password field');
        return false;
      }
    } else {
      console.log('❌ Could not find username field');
      return false;
    }
    
  } catch (error) {
    console.error('❌ ERROR during login:', error);
    await page.screenshot({ 
      path: 'jira-uat-testing/login-error.png',
      fullPage: true 
    });
    return false;
  } finally {
    // Keep browser open for manual inspection
    console.log('🔍 Keeping browser open for 30 seconds...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

loginDirectly().then(success => {
  if (success) {
    console.log('🎉 LOGIN SUCCESSFUL - Session saved!');
  } else {
    console.log('💥 LOGIN FAILED - Check screenshots');
  }
}).catch(console.error);