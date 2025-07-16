import { chromium } from 'playwright';
import fs from 'fs';

async function manualLoginSessionCapture() {
    console.log('🎯 MANUAL LOGIN & SESSION CAPTURE FOR JIRA 10.3');
    console.log('================================================================================');
    console.log('✅ YOU log in manually, I detect completion and capture session');
    console.log('✅ Running HEADFUL so you can see everything');
    console.log('✅ I wait FOREVER until "Log In" button disappears');
    console.log('✅ Then I capture EVERYTHING for future tests');
    console.log('================================================================================');

    // Launch in HEADFUL mode (not headless!)
    const browser = await chromium.launch({ 
        headless: false,  // CRITICAL: So you can see what's happening
        args: [
            '--start-maximized',
            '--ignore-certificate-errors',
            '--ignore-ssl-errors'
        ]
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        // Navigate to JIRA UAT login
        console.log('🌐 Navigating to JIRA UAT login page...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('👋 PLEASE LOG IN MANUALLY NOW!');
        console.log('================================================================================');
        console.log('🔍 I will check every 10 seconds for login completion');
        console.log('🎯 When you reach JIRA dashboard = YOU ARE LOGGED IN');
        console.log('💾 Then I will capture your complete session');
        console.log('⏳ Take your time - I will wait forever...');
        console.log('================================================================================');
        
        // Wait for login completion by checking URL changes
        let loginAttempts = 0;
        let isLoggedIn = false;
        
        while (!isLoggedIn) {
            loginAttempts++;
            await page.waitForTimeout(10000); // Wait 10 seconds between checks
            
            try {
                const currentUrl = page.url();
                console.log(`⏳ Check #${loginAttempts} - URL: ${currentUrl.substring(0, 80)}...`);
                
                // Check if we're successfully logged into JIRA (reached dashboard or main JIRA pages)
                const isJiraAuthenticated = currentUrl.includes('jirauat.smedigitalapps.com') && 
                                          !currentUrl.includes('login.jsp') &&
                                          (currentUrl.includes('Dashboard.jspa') || 
                                           currentUrl.includes('/secure/') || 
                                           currentUrl.includes('/jira/') && !currentUrl.includes('login'));
                
                // Also check if we're on Microsoft login (still in progress)
                const onMicrosoftLogin = currentUrl.includes('microsoftonline.com') || 
                                        currentUrl.includes('login.microsoft');
                
                if (isJiraAuthenticated) {
                    console.log('✅ LOGIN DETECTED! Successfully authenticated to JIRA UAT');
                    isLoggedIn = true;
                    break;
                }
                
                if (onMicrosoftLogin) {
                    console.log('   🔄 Microsoft SSO in progress - please complete authentication');
                } else if (currentUrl.includes('login.jsp')) {
                    console.log('   ⏳ Still on JIRA login page - please log in');
                } else {
                    console.log('   🔄 Navigation in progress...');
                }
                
            } catch (error) {
                console.log(`   ⚠️ Check #${loginAttempts} failed (navigation in progress): ${error.message}`);
                // Continue checking - this is normal during navigation
            }
        }
        
        // Give it a moment for everything to fully load
        console.log('🔄 Waiting for page to fully load...');
        await page.waitForTimeout(5000);
        
        // Capture EVERYTHING
        console.log('💾 CAPTURING COMPLETE SESSION...');
        console.log('================================================================================');
        
        // Get Playwright cookies (most reliable)
        const cookies = await context.cookies();
        
        // Get storage data - wrapped in try/catch to handle any context issues
        let storageData = { 
            localStorage: {}, 
            sessionStorage: {}, 
            jiraData: { atlToken: null, userInfo: null } as any 
        };
        
        try {
            storageData = await page.evaluate(() => {
                // Local storage
                const localStorage = {};
                try {
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const key = window.localStorage.key(i);
                        if (key) {
                            localStorage[key] = window.localStorage.getItem(key);
                        }
                    }
                } catch (e) {
                    console.log('localStorage access error:', e);
                }
                
                // Session storage  
                const sessionStorage = {};
                try {
                    for (let i = 0; i < window.sessionStorage.length; i++) {
                        const key = window.sessionStorage.key(i);
                        if (key) {
                            sessionStorage[key] = window.sessionStorage.getItem(key);
                        }
                    }
                } catch (e) {
                    console.log('sessionStorage access error:', e);
                }
                
                // JIRA-specific tokens and data
                const jiraData = {
                    atlToken: document.querySelector('meta[name="atlassian-token"]')?.getAttribute('content'),
                    cookieString: document.cookie,
                    userInfo: document.querySelector('.user-avatar, .user-name, .aui-dropdown2-trigger-text')?.textContent?.trim(),
                    currentUrl: window.location.href,
                    pageTitle: document.title
                };
                
                return { localStorage, sessionStorage, jiraData };
            });
        } catch (evalError) {
            console.log('⚠️ Storage data capture error (continuing anyway):', evalError.message);
        }
        
        // Create complete session object
        const completeSession = {
            timestamp: new Date().toISOString(),
            environment: 'UAT_ONLY',
            domain: 'jirauat.smedigitalapps.com',
            capturedAt: page.url(),
            
            // Playwright cookies (most important for authentication)
            cookies: cookies,
            
            // Browser storage
            localStorage: storageData.localStorage,
            sessionStorage: storageData.sessionStorage,
            
            // JIRA-specific data
            jiraData: storageData.jiraData,
            
            // Metadata
            userAgent: await page.evaluate(() => navigator.userAgent).catch(() => 'Unknown'),
            viewport: await page.viewportSize()
        };
        
        // Save session
        const sessionFile = `jira-uat-session-${Date.now()}.json`;
        fs.writeFileSync(sessionFile, JSON.stringify(completeSession, null, 2));
        
        console.log('🎉 SESSION CAPTURED SUCCESSFULLY!');
        console.log('================================================================================');
        console.log(`📁 Saved to: ${sessionFile}`);
        console.log(`🍪 Cookies captured: ${cookies.length}`);
        console.log(`🗄️ LocalStorage items: ${Object.keys(storageData.localStorage).length}`);
        console.log(`🗃️ SessionStorage items: ${Object.keys(storageData.sessionStorage).length}`);
        console.log(`🎯 JIRA Token: ${storageData.jiraData?.atlToken || 'Not found'}`);
        console.log(`👤 User Info: ${storageData.jiraData?.userInfo || 'Not detected'}`);
        
        // Test the session immediately
        console.log('');
        console.log('🧪 TESTING CAPTURED SESSION...');
        console.log('================================================================================');
        
        // Test ITSM project access
        console.log('📊 Testing ITSM project access...');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/browse/ITSM', { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });
            
            await page.waitForTimeout(2000); // Give it a moment to load
            const itsmAccessible = !page.url().includes('login') && 
                                  !(await page.locator('text=does not exist').count().catch(() => 0));
            console.log(`   ITSM Project: ${itsmAccessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
        } catch (e) {
            console.log('   ITSM Project: ❌ ERROR -', e.message);
        }
        
        // Test DPSA project access
        console.log('📊 Testing DPSA project access...');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/browse/DPSA', { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });
            
            await page.waitForTimeout(2000); // Give it a moment to load
            const dpsaAccessible = !page.url().includes('login') && 
                                  !(await page.locator('text=does not exist').count().catch(() => 0));
            console.log(`   DPSA Project: ${dpsaAccessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
        } catch (e) {
            console.log('   DPSA Project: ❌ ERROR -', e.message);
        }
        
        // Test dashboard access
        console.log('📊 Testing dashboard access...');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });
            
            await page.waitForTimeout(2000); // Give it a moment to load
            const dashboardAccessible = !page.url().includes('login') && 
                                       (await page.locator('text=System Dashboard, text=Dashboard').count().catch(() => 0)) > 0;
            console.log(`   Dashboard: ${dashboardAccessible ? '✅ ACCESSIBLE' : '❌ NOT ACCESSIBLE'}`);
        } catch (e) {
            console.log('   Dashboard: ❌ ERROR -', e.message);
        }
        
        console.log('');
        console.log('✅ SESSION CAPTURE COMPLETE!');
        console.log('📄 You can now use this session file for automated testing');
        console.log(`🔄 Next step: npx tsx comprehensive-relentless-jira-testing.ts`);
        
        // Don't close automatically - let user see results
        console.log('');
        console.log('🎯 Browser will stay open for 30 seconds so you can verify everything looks correct');
        console.log('💻 Close the browser window when you\'re satisfied');
        
        // Wait for user to close browser
        await page.waitForTimeout(30000); // 30 seconds
        
    } catch (error) {
        console.log('❌ Error during session capture:', error);
    } finally {
        await browser.close();
    }
}

// Run the script
manualLoginSessionCapture().catch(console.error); 