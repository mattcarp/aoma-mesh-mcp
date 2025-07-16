import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import readline from 'readline';

const SESSION_FILE = 'jira-manual-session.json';
const JIRA_BASE_URL = 'https://jirauat.smedigitalapps.com';

async function waitForManualLogin() {
    console.log('🚀 Opening browser for you to log in manually...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        viewport: null,
    });
    
    const page = await context.newPage();
    
    // Create readline interface for user input
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    try {
        // Just open the main JIRA URL and let user handle it
        console.log('📡 Opening JIRA in browser...');
        await page.goto(`${JIRA_BASE_URL}/jira/`);
        
        console.log('\n🎯 MANUAL LOGIN INSTRUCTIONS:');
        console.log('✨ In the browser window that just opened:');
        console.log('1. Navigate to wherever you need to log in');
        console.log('2. Complete your login process (SSO, 2FA, whatever)');
        console.log('3. Get to the main dashboard or any authenticated page');
        console.log('4. When you\'re successfully logged in, come back here');
        console.log('5. Press ENTER in this terminal when ready');
        
        // Wait for user confirmation
        await new Promise<void>((resolve) => {
            rl.question('\n🔥 Press ENTER when you are logged in and ready to capture session: ', () => {
                resolve();
            });
        });
        
        console.log('\n💾 Capturing your session now...');
        
        // Test current authentication status
        const currentUrl = page.url();
        console.log(`📍 Current URL: ${currentUrl}`);
        
        // Try to access the dashboard to verify login
        await page.goto(`${JIRA_BASE_URL}/jira/dashboard.jspa`);
        await page.waitForTimeout(3000);
        
        const finalUrl = page.url();
        console.log(`📍 Final URL: ${finalUrl}`);
        
        if (finalUrl.includes('login') || finalUrl.includes('permissionViolation')) {
            console.log('⚠️  Still seems to be on login page. Let me try the API endpoint...');
            
            // Try API endpoint instead
            await page.goto(`${JIRA_BASE_URL}/jira/rest/api/2/myself`);
            await page.waitForTimeout(2000);
            
            const apiContent = await page.textContent('body');
            if (apiContent && apiContent.includes('displayName')) {
                console.log('✅ API access works! You are authenticated.');
            } else {
                console.log('❌ API access failed. You might not be logged in properly.');
                console.log('Content:', apiContent?.substring(0, 200));
            }
        } else {
            console.log('✅ Dashboard access works! You are authenticated.');
        }
        
        // Save the session cookies regardless
        console.log('💾 Saving session cookies...');
        const cookies = await context.cookies();
        const sessionData = {
            cookies,
            timestamp: new Date().toISOString(),
            url: page.url(),
            userAgent: await page.evaluate(() => navigator.userAgent),
            finalUrl: finalUrl
        };
        
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
        console.log(`✅ Session saved to ${SESSION_FILE}`);
        console.log(`📊 Saved ${cookies.length} cookies`);
        
        // Show some cookie info for debugging
        const relevantCookies = cookies.filter(c => 
            c.name.includes('session') || 
            c.name.includes('JSESSION') || 
            c.name.includes('auth') ||
            c.name.includes('login')
        );
        
        if (relevantCookies.length > 0) {
            console.log('🔑 Found authentication cookies:');
            relevantCookies.forEach(cookie => {
                console.log(`   - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
            });
        } else {
            console.log('⚠️  No obvious authentication cookies found, but saved all cookies anyway');
        }
        
        console.log('\n🎉 Session capture complete!');
        console.log('💡 You can close the browser when ready.');
        console.log('🚀 Now we can use this session for testing!');
        
    } catch (error) {
        console.error('❌ Error during session capture:', error);
        throw error;
    } finally {
        rl.close();
        // Keep browser open for user to verify
        console.log('\n⏰ Keeping browser open for 10 seconds for you to verify...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    waitForManualLogin()
        .then(() => {
            console.log('\n🎊 Manual session capture complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Manual session capture failed:', error);
            process.exit(1);
        });
}

export { waitForManualLogin }; 