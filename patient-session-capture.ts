import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

const SESSION_FILE = 'jira-patient-session.json';
const JIRA_BASE_URL = 'https://jirauat.smedigitalapps.com';

async function capturePatientSession() {
    console.log('🚀 Opening browser for manual login...');
    console.log('💡 You have ALL THE TIME you need to log in!');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const context = await browser.newContext({
        viewport: null, // Use full screen
    });
    
    const page = await context.newPage();
    
    try {
        // Navigate to JIRA
        console.log('📡 Navigating to JIRA...');
        await page.goto(`${JIRA_BASE_URL}/jira/dashboard.jspa`);
        
        console.log('\n🎯 PLEASE LOG IN MANUALLY IN THE BROWSER WINDOW');
        console.log('✨ Take your time - no rush!');
        console.log('🔒 Complete any 2FA or SSO steps needed');
        console.log('🎉 When you see the dashboard, just wait - I\'ll detect it!');
        
        // Wait for successful login by checking for dashboard elements
        console.log('\n⏳ Waiting for you to complete login...');
        
        // Wait for either login form OR dashboard (in case already logged in)
        await page.waitForLoadState('networkidle');
        
        // Keep checking every 5 seconds if we're on the dashboard
        let attempts = 0;
        while (attempts < 120) { // 10 minutes max
            const currentUrl = page.url();
            const title = await page.title();
            
            console.log(`🔍 Checking... URL: ${currentUrl}`);
            
            // Check if we're successfully logged in
            if (currentUrl.includes('dashboard.jspa') && !currentUrl.includes('login')) {
                console.log('🎉 SUCCESS! Detected successful login!');
                break;
            }
            
            // If we're still on login page, keep waiting
            if (currentUrl.includes('login') || title.toLowerCase().includes('login')) {
                console.log('⏰ Still on login page - waiting patiently...');
            }
            
            await page.waitForTimeout(5000); // Wait 5 seconds
            attempts++;
        }
        
        if (attempts >= 120) {
            throw new Error('Timeout waiting for login - but that\'s okay, try again!');
        }
        
        // Save the session cookies
        console.log('💾 Saving session cookies...');
        const cookies = await context.cookies();
        const sessionData = {
            cookies,
            timestamp: new Date().toISOString(),
            url: page.url(),
            userAgent: await page.evaluate(() => navigator.userAgent)
        };
        
        fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
        console.log(`✅ Session saved to ${SESSION_FILE}`);
        
        // Quick test to make sure session works
        console.log('🧪 Testing saved session...');
        await page.goto(`${JIRA_BASE_URL}/jira/rest/api/2/myself`);
        await page.waitForTimeout(2000);
        
        const content = await page.textContent('body');
        if (content && content.includes('displayName')) {
            console.log('✅ Session test PASSED - you are logged in!');
            const userInfo = JSON.parse(content);
            console.log(`👋 Welcome, ${userInfo.displayName}!`);
        }
        
        console.log('\n🎉 Perfect! Your session is captured and ready to use.');
        console.log('💡 You can close this browser window when ready.');
        console.log('🚀 Now we can run tests without any popups!');
        
        // Keep browser open for a bit so user can see the success
        console.log('\n⏰ Keeping browser open for 30 seconds...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Error during session capture:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    capturePatientSession()
        .then(() => {
            console.log('\n🎊 Session capture complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Session capture failed:', error);
            process.exit(1);
        });
}

export { capturePatientSession }; 