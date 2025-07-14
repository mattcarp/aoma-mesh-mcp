import { chromium } from 'playwright';

async function simpleUATScraper() {
    console.log('🧪 SIMPLE UAT SCRAPER - VISIBLE PROGRESS');
    console.log('================================================================================');
    
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 // Slow down for visibility
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Navigating to UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/');
        
        console.log('⏳ Waiting for page to load...');
        await page.waitForTimeout(5000);
        
        // Add visible banner
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; background: #ff9800;
                color: white; padding: 15px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 18px; border-bottom: 3px solid #f57c00;
            `;
            banner.textContent = '🧪 UAT JIRA SCRAPER RUNNING - UPGRADE TESTING MODE';
            document.body.prepend(banner);
        });
        
        console.log('🔍 Checking login status...');
        const pageTitle = await page.title();
        const pageUrl = page.url();
        
        console.log(`   Page title: ${pageTitle}`);
        console.log(`   Page URL: ${pageUrl}`);
        
        const isLoggedIn = await page.evaluate(() => {
            const hasLoginForm = document.querySelector('#login-form-username') !== null;
            const hasLoginText = document.body.textContent?.includes('Log in') || false;
            return !hasLoginForm && !hasLoginText;
        });
        
        console.log(`   Logged in: ${isLoggedIn ? '✅ Yes' : '❌ No'}`);
        
        if (!isLoggedIn) {
            console.log('🔐 Please log in manually...');
            console.log('⏳ Waiting 30 seconds for manual login...');
            await page.waitForTimeout(30000);
        }
        
        // Navigate to ITSM project
        console.log('📊 Navigating to ITSM project...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20ITSM%20ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        console.log('🔍 Extracting ticket count...');
        const ticketInfo = await page.evaluate(() => {
            // Look for pagination info
            const pagingInfo = document.querySelector('.showing')?.textContent || '';
            const totalMatch = pagingInfo.match(/of (\d+)/);
            const total = totalMatch ? parseInt(totalMatch[1]) : 0;
            
            // Count visible tickets
            const visibleTickets = document.querySelectorAll('tr[data-issuekey], .issue-row').length;
            
            return {
                totalTickets: total,
                visibleTickets: visibleTickets,
                pagingText: pagingInfo
            };
        });
        
        console.log(`📊 ITSM Project Status:`);
        console.log(`   Total tickets: ${ticketInfo.totalTickets}`);
        console.log(`   Visible on page: ${ticketInfo.visibleTickets}`);
        console.log(`   Paging info: ${ticketInfo.pagingText}`);
        
        // Try DPSA project
        console.log('\n📊 Navigating to DPSA project...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA%20ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        const dpsaInfo = await page.evaluate(() => {
            const pagingInfo = document.querySelector('.showing')?.textContent || '';
            const totalMatch = pagingInfo.match(/of (\d+)/);
            const total = totalMatch ? parseInt(totalMatch[1]) : 0;
            const visibleTickets = document.querySelectorAll('tr[data-issuekey], .issue-row').length;
            
            return {
                totalTickets: total,
                visibleTickets: visibleTickets,
                pagingText: pagingInfo
            };
        });
        
        console.log(`📊 DPSA Project Status:`);
        console.log(`   Total tickets: ${dpsaInfo.totalTickets}`);
        console.log(`   Visible on page: ${dpsaInfo.visibleTickets}`);
        console.log(`   Paging info: ${dpsaInfo.pagingText}`);
        
        console.log('\n🎯 UAT ENVIRONMENT CONFIRMED');
        console.log('✅ Browser is visible and running');
        console.log('✅ Connected to UAT JIRA successfully');
        console.log(`✅ Found ${ticketInfo.totalTickets} ITSM tickets`);
        console.log(`✅ Found ${dpsaInfo.totalTickets} DPSA tickets`);
        
        console.log('\n⏳ Keeping browser open for inspection...');
        console.log('Press Ctrl+C to stop the scraper');
        
        // Keep browser open
        await new Promise(() => {}); // Wait indefinitely
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        // Don't close browser automatically
        console.log('🔄 Browser will remain open');
    }
}

simpleUATScraper();
