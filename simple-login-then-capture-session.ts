import { chromium } from 'playwright';
import fs from 'fs';

async function simpleLoginThenCaptureSession() {
    console.log('🎯 SIMPLE LOGIN DETECTION & SESSION CAPTURE');
    console.log('================================================================================');
    console.log('✅ I will check for "Log In" button every 10 seconds');
    console.log('✅ WHEN "Log In" button DISAPPEARS = you are logged in');
    console.log('✅ THEN I capture EVERYTHING and save session for future');
    console.log('⏳ I will wait FOREVER until you log in');
    console.log('================================================================================');

    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        console.log('🌐 Opening JIRA UAT...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { 
            waitUntil: 'networkidle',
            timeout: 60000 
        });
        
        console.log('✅ Browser is open - please log in when ready');
        console.log('');
        
        let checkCount = 0;
        let isLoggedIn = false;
        
        // Check FOREVER until logged in
        while (!isLoggedIn) {
            checkCount++;
            
            console.log(`🔍 Check #${checkCount}: Looking for "Log In" button...`);
            
            try {
                // The SIMPLEST check: is there a "Log In" button?
                const loginButtonExists = await page.evaluate(() => {
                    // Look for "Log In" text in buttons, links, or any clickable element
                    const logInElements = Array.from(document.querySelectorAll('*')).filter(el => {
                        const text = el.textContent?.trim() || '';
                        return text === 'Log In' || text === 'Log in' || text === 'LOGIN';
                    });
                    
                    const hasLoginButton = logInElements.length > 0;
                    const currentUrl = window.location.href;
                    const pageTitle = document.title;
                    
                    return {
                        hasLoginButton,
                        currentUrl,
                        pageTitle,
                        loginButtonCount: logInElements.length
                    };
                });
                
                if (loginButtonExists.hasLoginButton) {
                    console.log(`   ❌ Still see "Log In" button (${loginButtonExists.loginButtonCount} found)`);
                    console.log(`   ⏳ Waiting for you to complete login...`);
                    console.log(`   📍 Current URL: ${loginButtonExists.currentUrl}`);
                } else {
                    // NO "Log In" button = LOGGED IN!
                    console.log('');
                    console.log('🎉 NO "Log In" BUTTON FOUND = YOU ARE LOGGED IN!');
                    console.log(`   📍 Current URL: ${loginButtonExists.currentUrl}`);
                    console.log(`   📄 Page Title: ${loginButtonExists.pageTitle}`);
                    console.log('');
                    
                    isLoggedIn = true;
                    break;
                }
                
            } catch (error) {
                console.log(`   ⚠️ Page evaluation error (probably still navigating): ${error.message}`);
            }
            
            // Wait 10 seconds before next check
            console.log('   💤 Waiting 10 seconds before next check...');
            await page.waitForTimeout(10000);
            console.log('');
        }
        
        console.log('🚀 CAPTURING COMPLETE SESSION STATE');
        console.log('================================================================================');
        
        // Capture EVERYTHING
        const sessionData = await page.evaluate(() => {
            return {
                // All cookies as string
                cookieString: document.cookie,
                
                // Current URL and title
                url: window.location.href,
                title: document.title,
                
                // Local storage
                localStorage: Object.fromEntries(Object.entries(localStorage)),
                
                // Session storage  
                sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
                
                // Any JIRA-specific tokens or data
                jiraData: {
                    // Look for JIRA session tokens
                    atlToken: document.querySelector('meta[name="atlassian-token"]')?.getAttribute('content'),
                    
                    // Look for any data attributes that might contain session info
                    sessionInfo: Array.from(document.querySelectorAll('[data-session], [data-token], [data-user]'))
                        .map(el => ({
                            tag: el.tagName,
                            attributes: Array.from(el.attributes).map(attr => ({ name: attr.name, value: attr.value }))
                        })),
                    
                    // Check for user info
                    userInfo: document.querySelector('.user-avatar, .user-name, .user-profile')?.textContent?.trim()
                }
            };
        });
        
        // Get Playwright cookies (more detailed)
        const playwrightCookies = await context.cookies();
        
        // Combine everything
        const completeSession = {
            timestamp: new Date().toISOString(),
            capturedAt: sessionData.url,
            pageTitle: sessionData.title,
            
            // Browser session data
            cookies: playwrightCookies,
            cookieString: sessionData.cookieString,
            localStorage: sessionData.localStorage,
            sessionStorage: sessionData.sessionStorage,
            
            // JIRA-specific data
            jiraData: sessionData.jiraData,
            
            // Additional metadata
            userAgent: await page.evaluate(() => navigator.userAgent),
            viewport: await page.viewportSize()
        };
        
        // Save the complete session
        const sessionFilename = 'complete-jira-session.json';
        fs.writeFileSync(sessionFilename, JSON.stringify(completeSession, null, 2));
        
        console.log(`💾 COMPLETE SESSION SAVED: ${sessionFilename}`);
        console.log(`   📊 Cookies saved: ${playwrightCookies.length}`);
        console.log(`   🗄️ LocalStorage items: ${Object.keys(sessionData.localStorage).length}`);
        console.log(`   🗃️ SessionStorage items: ${Object.keys(sessionData.sessionStorage).length}`);
        console.log(`   🎯 JIRA Token: ${sessionData.jiraData.atlToken || 'Not found'}`);
        console.log(`   👤 User Info: ${sessionData.jiraData.userInfo || 'Not detected'}`);
        
        // Test the session by trying to access projects
        console.log('');
        console.log('🧪 TESTING SESSION BY CHECKING PROJECT ACCESS');
        console.log('================================================================================');
        
        // Test ITSM project
        console.log('📊 Testing ITSM project access...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/browse/ITSM', { waitUntil: 'networkidle' });
        
        const itsmTest = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || '';
            const hasError = bodyText.includes('does not exist') || bodyText.includes('not found');
            return { hasError, url: window.location.href };
        });
        
        console.log(`   ${!itsmTest.hasError ? '✅' : '❌'} ITSM Project: ${!itsmTest.hasError ? 'ACCESSIBLE' : 'NOT FOUND'}`);
        
        // Test DPSA project  
        console.log('📊 Testing DPSA project access...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/browse/DPSA', { waitUntil: 'networkidle' });
        
        const dpsaTest = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || '';
            const hasError = bodyText.includes('does not exist') || bodyText.includes('not found');
            return { hasError, url: window.location.href };
        });
        
        console.log(`   ${!dpsaTest.hasError ? '✅' : '❌'} DPSA Project: ${!dpsaTest.hasError ? 'ACCESSIBLE' : 'NOT FOUND'}`);
        
        // Test search
        console.log('📊 Testing search functionality...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/', { waitUntil: 'networkidle' });
        
        const searchTest = await page.evaluate(() => {
            const bodyText = document.body.textContent?.toLowerCase() || '';
            const hasResults = !bodyText.includes('try logging in to see more results');
            return { hasResults, url: window.location.href };
        });
        
        console.log(`   ${searchTest.hasResults ? '✅' : '❌'} Search Access: ${searchTest.hasResults ? 'WORKING' : 'REQUIRES LOGIN'}`);
        
        // Final summary
        console.log('');
        console.log('🎯 SESSION CAPTURE COMPLETE!');
        console.log('================================================================================');
        
        const projectsAccessible = !itsmTest.hasError && !dpsaTest.hasError;
        
        if (projectsAccessible && searchTest.hasResults) {
            console.log('🎉 SUCCESS! Session is fully functional:');
            console.log('   ✅ Authentication verified');
            console.log('   ✅ Projects accessible'); 
            console.log('   ✅ Search working');
            console.log('   💾 Session saved for future use');
            console.log('');
            console.log('🚀 Ready to run comprehensive tests with this session!');
        } else {
            console.log('⚠️ Session captured but some issues detected:');
            console.log(`   Projects accessible: ${projectsAccessible ? '✅' : '❌'}`);
            console.log(`   Search working: ${searchTest.hasResults ? '✅' : '❌'}`);
            console.log('   💾 Session saved anyway for debugging');
        }
        
        console.log('');
        console.log('⏳ Keeping browser open for 60 seconds for your review...');
        await page.waitForTimeout(60000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        await page.screenshot({ path: 'session-capture-error.png', fullPage: true });
        console.log('📸 Error screenshot saved: session-capture-error.png');
    } finally {
        await browser.close();
        console.log('✅ Browser closed - session capture complete!');
    }
}

// Run the session capture
simpleLoginThenCaptureSession().catch(console.error); 