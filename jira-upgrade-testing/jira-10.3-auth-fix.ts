import { chromium } from 'playwright';
import * as fs from 'fs';

// JIRA 10.3.x Essential Headers
const JIRA_HEADERS = {
  'X-Atlassian-Token': 'no-check', // Disable XSRF protection
  'X-Requested-With': 'XMLHttpRequest',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};

async function jira103AuthFix() {
  console.log('🔧 JIRA 10.3.x AUTHENTICATION FIX');
  console.log('=================================');
  console.log('Using JIRA 10.3.x compatible authentication approach!');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
    // JIRA 10.3.x Browser launch arguments
    args: [
      '--disable-web-security',
      '--auth-server-allowlist=*',
      '--no-sandbox'
    ]
  });
  
  // JIRA 10.3.x Context configuration
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    extraHTTPHeaders: JIRA_HEADERS,
    recordVideo: {
      dir: './videos/',
      size: { width: 1280, height: 720 }
    }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('📍 Step 1: Navigate to JIRA UAT...');
    await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
    await page.waitForTimeout(3000);
    
    console.log('👀 Please complete manual login (including 2FA if required)...');
    console.log('⏳ I will detect authentication and validate session properly...');
    
    let authenticated = false;
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes
    
    while (!authenticated && attempts < maxAttempts) {
      attempts++;
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      const url = page.url();
      
      if (!title.includes('Log') && url.includes('Dashboard.jspa')) {
        console.log('🎯 Dashboard authentication detected! Validating session...');
        
        // JIRA 10.3.x Session validation using API
        try {
          const sessionValidation = await page.evaluate(async () => {
            const response = await fetch('/jira/rest/auth/1/session', {
              method: 'GET',
              headers: {
                'X-Atlassian-Token': 'no-check',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const sessionData = await response.json();
              return {
                valid: true,
                session: sessionData
              };
            } else {
              return { valid: false, status: response.status };
            }
          });
          
          if (sessionValidation.valid) {
            console.log('✅ Session validation successful!');
            console.log(`🔑 Session details:`, sessionValidation.session);
            
            // Test ITSM access with proper session
            console.log('🎯 Testing ITSM access with validated session...');
            
            // Use the Issue Navigator instead of direct project URL
            const itsmUrls = [
              'https://jirauat.smedigitalapps.com/jira/issues/?jql=project=ITSM',
              'https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa',
              'https://jirauat.smedigitalapps.com/jira/browse/ITSM-1'
            ];
            
            let itsmAccessible = false;
            for (const testUrl of itsmUrls) {
              try {
                console.log(`📍 Testing: ${testUrl}`);
                await page.goto(testUrl, { timeout: 20000 });
                await page.waitForTimeout(5000);
                
                const testTitle = await page.title();
                if (!testTitle.includes('Log')) {
                  console.log(`✅ ITSM accessible via: ${testUrl}`);
                  console.log(`📝 Title: ${testTitle}`);
                  itsmAccessible = true;
                  
                  await page.screenshot({ 
                    path: `itsm-success-${Date.now()}.png`,
                    fullPage: true 
                  });
                  break;
                } else {
                  console.log(`❌ ${testUrl} still requires login`);
                }
              } catch (error) {
                console.log(`⚠️ ${testUrl} failed: ${error.message}`);
              }
            }
            
            if (itsmAccessible) {
              authenticated = true;
              
              // Save enhanced storage state with JIRA 10.3.x compatibility
              const storageState = await context.storageState();
              const enhancedState = {
                ...storageState,
                timestamp: Date.now(),
                expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
                jiraVersion: '10.3.x',
                sessionValidated: true,
                itsmAccessible: true
              };
              
              const authFile = `jira-10.3-auth-${Date.now()}.json`;
              fs.writeFileSync(authFile, JSON.stringify(enhancedState, null, 2));
              console.log(`💾 JIRA 10.3.x auth state saved: ${authFile}`);
              
              break;
            } else {
              console.log('⚠️ Session valid but ITSM not accessible, continuing...');
            }
          } else {
            console.log(`⚠️ Session validation failed: ${sessionValidation.status}`);
          }
        } catch (error) {
          console.log(`⚠️ Session validation error: ${error.message}`);
        }
      }
      
      if (attempts % 15 === 0) {
        console.log(`⏳ Waiting for authentication... ${attempts}/${maxAttempts}`);
      }
    }
    
    if (!authenticated) {
      console.log('❌ Authentication timeout');
      
      // Try alternative 2SV authentication endpoint
      console.log('🔄 Attempting 2SV authentication endpoint...');
      try {
        const tsvResult = await page.evaluate(async () => {
          const response = await fetch('/jira/rest/tsv/latest/authenticate', {
            method: 'POST',
            headers: {
              'X-Atlassian-Token': 'no-check',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              username: 'your-username', // You'll need to provide this
              password: 'your-password'  // You'll need to provide this
            })
          });
          
          return {
            status: response.status,
            ok: response.ok,
            text: await response.text()
          };
        });
        
        console.log('🔐 2SV Authentication result:', tsvResult);
      } catch (error) {
        console.log(`❌ 2SV authentication failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 JIRA 10.3.x AUTHENTICATION ANALYSIS COMPLETE');
    console.log('===============================================');
    if (authenticated) {
      console.log('✅ Full authentication and ITSM access achieved!');
    } else {
      console.log('⚠️ Check video and logs for debugging information');
    }
    
  } catch (error) {
    console.error('❌ JIRA 10.3.x auth fix failed:', error.message);
  } finally {
    console.log('\n⏳ Keeping browser open for review...');
    await page.waitForTimeout(15000);
    await browser.close();
  }
}

jira103AuthFix().catch(console.error); 