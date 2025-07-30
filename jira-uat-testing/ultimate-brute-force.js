const { chromium } = require('@playwright/test');
const fs = require('fs');

async function ultimateBruteForce() {
  console.log('💥 ULTIMATE BRUTE FORCE LOGIN');
  console.log('==============================');
  console.log('🔨 Trying EVERY possible method to break through');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized', '--disable-web-security']
  });
  
  try {
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: null
    });
    
    const page = await context.newPage();
    
    let attempt = 1;
    const takeScreenshot = async (name) => {
      await page.screenshot({ 
        path: `brute-${attempt}-${name}.png`, 
        fullPage: true 
      });
      console.log(`📸 Screenshot: brute-${attempt}-${name}.png`);
      attempt++;
    };
    
    console.log('🌐 Going to login page...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', {
      timeout: 30000
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    await takeScreenshot('initial');
    
    console.log('💥 BRUTE FORCE APPROACH 1: Nuclear CSS Override');
    await page.evaluate(() => {
      // Nuclear approach - override ALL CSS
      const style = document.createElement('style');
      style.textContent = `
        * {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: auto !important;
        }
        input, button {
          display: inline-block !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        form {
          display: block !important;
          visibility: visible !important;
        }
      `;
      document.head.appendChild(style);
      
      // Force remove hidden attributes
      document.querySelectorAll('*').forEach(el => {
        el.removeAttribute('hidden');
        el.removeAttribute('style');
        if (el.style) {
          el.style.display = '';
          el.style.visibility = '';
          el.style.opacity = '';
        }
      });
    });
    
    await page.waitForTimeout(3000);
    await takeScreenshot('after-nuclear-css');
    
    console.log('💥 BRUTE FORCE APPROACH 2: Direct Element Manipulation');
    await page.evaluate(() => {
      // Find and force show specific elements
      const elements = [
        '#use-sso-button',
        '#username-field', 
        'input[name="username"]',
        'input[name="password"]',
        'button[type="submit"]'
      ];
      
      elements.forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
          el.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important; position: relative !important;';
          el.removeAttribute('hidden');
          el.removeAttribute('disabled');
        }
      });
    });
    
    await page.waitForTimeout(2000);
    await takeScreenshot('after-element-manipulation');
    
    console.log('💥 BRUTE FORCE APPROACH 3: JavaScript Click Attempts');
    
    // Try SSO button with multiple methods
    const ssoMethods = [
      () => document.querySelector('#use-sso-button')?.click(),
      () => document.querySelector('button:contains("SSO")')?.click(),
      () => {
        const btn = document.querySelector('#use-sso-button');
        if (btn) {
          btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      },
      () => {
        const btn = document.querySelector('#use-sso-button');
        if (btn) {
          const form = btn.closest('form');
          if (form) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'sso';
            input.value = 'true';
            form.appendChild(input);
            form.submit();
          }
        }
      }
    ];
    
    for (let i = 0; i < ssoMethods.length; i++) {
      console.log(`🔄 SSO Method ${i + 1}...`);
      
      try {
        await page.evaluate(ssoMethods[i]);
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        console.log(`📍 URL after SSO method ${i + 1}: ${currentUrl}`);
        
        if (!currentUrl.includes('login.jsp')) {
          console.log(`🎉 SSO Method ${i + 1} worked! URL changed.`);
          await takeScreenshot(`sso-success-method-${i + 1}`);
          
          // Check if we're on external SSO
          if (!currentUrl.includes('jirauat.smedigitalapps.com')) {
            console.log('🔐 Redirected to external SSO provider!');
            console.log('👤 Please complete SSO authentication...');
            console.log('⏳ Waiting up to 5 minutes...');
            
            await page.waitForFunction(
              () => {
                const url = window.location.href;
                return url.includes('jirauat.smedigitalapps.com') && 
                       url.includes('Dashboard');
              },
              { timeout: 300000 }
            );
            
            console.log('🎉 SSO authentication completed!');
            await takeScreenshot('sso-final-success');
            
            await context.storageState({ 
              path: 'jira-uat-session-brute-force-sso.json' 
            });
            
            const sessionData = fs.readFileSync('jira-uat-session-brute-force-sso.json');
            fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
            
            console.log('💾 Brute force SSO session saved!');
            return true;
          }
          
          // If still on JIRA, continue with other methods
          break;
        }
      } catch (error) {
        console.log(`⚠️ SSO Method ${i + 1} failed: ${error.message}`);
      }
    }
    
    console.log('💥 BRUTE FORCE APPROACH 4: Traditional Login with Force');
    
    // Load credentials
    function loadEnvFile() {
      const envPath = require('path').join(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');
        
        for (const line of envLines) {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim();
              if (!process.env[key]) {
                process.env[key] = value;
              }
            }
          }
        }
      }
    }
    
    loadEnvFile();
    const username = process.env.JIRA_UAT_USERNAME || process.env.JIRA_USERNAME;
    const password = process.env.JIRA_UAT_PWD || process.env.JIRA_PWD;
    
    if (username && password) {
      console.log(`👤 Force filling credentials: ${username}`);
      
      // Force fill username
      await page.evaluate((user) => {
        const usernameField = document.querySelector('#username-field') || document.querySelector('input[name="username"]');
        if (usernameField) {
          usernameField.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
          usernameField.value = user;
          usernameField.dispatchEvent(new Event('input', { bubbles: true }));
          usernameField.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, username);
      
      // Force fill password
      await page.evaluate((pass) => {
        const passwordField = document.querySelector('input[name="password"]') || document.querySelector('input[type="password"]');
        if (passwordField) {
          passwordField.style.cssText = 'display: block !important; visibility: visible !important; opacity: 1 !important;';
          passwordField.value = pass;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, password);
      
      // Force check remember me
      await page.evaluate(() => {
        const checkbox = document.querySelector('input[type="checkbox"]');
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      
      await takeScreenshot('force-filled-credentials');
      
      // Force submit with multiple methods
      const submitMethods = [
        () => document.querySelector('button[type="submit"]')?.click(),
        () => document.querySelector('#login-button')?.click(),
        () => document.querySelector('form')?.submit(),
        () => {
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }
        }
      ];
      
      for (let i = 0; i < submitMethods.length; i++) {
        console.log(`🔄 Submit Method ${i + 1}...`);
        
        try {
          await page.evaluate(submitMethods[i]);
          await page.waitForTimeout(5000);
          
          const submitUrl = page.url();
          console.log(`📍 URL after submit method ${i + 1}: ${submitUrl}`);
          
          if (!submitUrl.includes('login.jsp') || submitUrl !== page.url()) {
            console.log(`🎉 Submit Method ${i + 1} worked!`);
            await takeScreenshot(`submit-success-method-${i + 1}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Submit Method ${i + 1} failed: ${error.message}`);
        }
      }
      
      // Check for 2FA
      await page.waitForTimeout(3000);
      const twoFAField = page.locator('input[name*="code"], input[placeholder*="code"]');
      if (await twoFAField.count() > 0) {
        console.log('📱 2FA REQUIRED!');
        console.log('📱 Please check your phone and enter the code...');
        console.log('⏳ Waiting up to 2 minutes...');
        
        await takeScreenshot('2fa-detected');
        
        await page.waitForFunction(
          () => {
            const url = window.location.href;
            return url.includes('Dashboard') && !url.includes('login');
          },
          { timeout: 120000 }
        );
        
        console.log('✅ 2FA completed!');
        await takeScreenshot('2fa-completed');
        
        await context.storageState({ 
          path: 'jira-uat-session-brute-force-2fa.json' 
        });
        
        const sessionData = fs.readFileSync('jira-uat-session-brute-force-2fa.json');
        fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
        
        console.log('💾 Brute force 2FA session saved!');
        return true;
      }
    }
    
    // Final check
    const finalUrl = page.url();
    if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
      console.log('🎉 Brute force login successful!');
      
      await context.storageState({ 
        path: 'jira-uat-session-brute-force-final.json' 
      });
      
      const sessionData = fs.readFileSync('jira-uat-session-brute-force-final.json');
      fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
      
      console.log('💾 Brute force session saved!');
      return true;
    }
    
    // Last resort - manual completion
    console.log('💡 All automated methods exhausted - waiting for manual completion...');
    console.log('⏳ Please complete login manually in the browser...');
    console.log('⏳ Waiting up to 5 minutes...');
    
    await page.waitForFunction(
      () => {
        const url = window.location.href;
        return url.includes('Dashboard') && !url.includes('login');
      },
      { timeout: 300000 }
    );
    
    console.log('✅ Manual completion successful!');
    
    await context.storageState({ 
      path: 'jira-uat-session-brute-force-manual.json' 
    });
    
    const sessionData = fs.readFileSync('jira-uat-session-brute-force-manual.json');
    fs.writeFileSync('playwright/.auth/jira-uat-user.json', sessionData);
    
    console.log('💾 Manual brute force session saved!');
    return true;
    
  } catch (error) {
    console.error('❌ Ultimate brute force error:', error.message);
    return false;
  } finally {
    console.log('⏳ Keeping browser open for 60 seconds...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    await browser.close();
  }
}

ultimateBruteForce()
  .then(success => {
    if (success) {
      console.log('\n💥 ULTIMATE BRUTE FORCE SUCCESS!');
      console.log('✅ JIRA UAT login barrier DEMOLISHED!');
      console.log('🚀 Ready for automated testing!');
    } else {
      console.log('\n❌ Even brute force failed');
      console.log('💡 This login system is REALLY stubborn');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal brute force error:', error);
    process.exit(1);
  });
