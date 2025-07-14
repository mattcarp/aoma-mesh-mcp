import { chromium } from 'playwright';
import { detectEnvironment, displayEnvironmentWarning, confirmEnvironment, JIRA_ENVIRONMENTS } from './environment-safety';
import { requireVPNConnection } from './vpn-check';

async function safeJiraScraper() {
    // First check VPN connectivity
    console.log('🔒 Checking VPN connection...');
    const vpnOk = await requireVPNConnection();
    if (!vpnOk) {
        console.log('❌ Exiting due to VPN connectivity issues');
        return;
    }
    // Configuration - CHANGE THIS TO SWITCH ENVIRONMENTS
    const TARGET_ENVIRONMENT = process.env.JIRA_ENVIRONMENT || 'UAT'; // 'PRODUCTION' or 'UAT'
    
    const env = TARGET_ENVIRONMENT === 'PRODUCTION' 
        ? JIRA_ENVIRONMENTS.PRODUCTION 
        : JIRA_ENVIRONMENTS.UAT;
    
    // Display clear warning
    displayEnvironmentWarning(env);
    
    // Confirm if production
    const confirmed = await confirmEnvironment(env);
    if (!confirmed) {
        console.log('❌ Environment access denied');
        return;
    }
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log(`🔗 Connecting to: ${env.url}`);
        
        // Navigate with clear environment indication
        await page.goto(`${env.url}/jira/issues/?jql=project%20%3D%20DPSA`);
        await page.waitForTimeout(3000);
        
        // Add environment indicator to page
        await page.evaluate((envName) => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: ${envName === 'PRODUCTION' ? '#ff0000' : '#ffaa00'};
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                z-index: 9999;
                font-size: 16px;
            `;
            banner.textContent = `🌍 JIRA ENVIRONMENT: ${envName}`;
            document.body.prepend(banner);
        }, env.name);
        
        // Extract tickets with environment logging
        const tickets = await page.evaluate(() => {
            const results = [];
            const rows = document.querySelectorAll('tr[data-issuekey]');
            
            rows.forEach(row => {
                const key = row.getAttribute('data-issuekey');
                const summary = row.querySelector('.summary a')?.textContent?.trim();
                if (key) {
                    results.push({ key, summary });
                }
            });
            
            return results;
        });
        
        console.log(`\n📊 Results from ${env.name}:`);
        console.log(`Found ${tickets.length} tickets`);
        
        if (tickets.length > 0) {
            console.log('\n📝 Sample tickets:');
            tickets.slice(0, 3).forEach(ticket => {
                console.log(`  ${ticket.key}: ${ticket.summary?.substring(0, 50)}...`);
            });
        }
        
        // Save with environment prefix
        const filename = `${env.name.toLowerCase()}-tickets-${new Date().toISOString().split('T')[0]}.json`;
        const fs = require('fs');
        fs.writeFileSync(filename, JSON.stringify({
            environment: env.name,
            url: env.url,
            timestamp: new Date().toISOString(),
            tickets
        }, null, 2));
        
        console.log(`\n💾 Saved to: ${filename}`);
        
    } catch (error) {
        console.error(`❌ Error in ${env.name} environment:`, error);
    } finally {
        console.log(`\n🔄 Disconnecting from ${env.name} environment`);
        await browser.close();
    }
}

// Example usage with environment variables
console.log('🚀 Safe JIRA Scraper');
console.log('Environment options:');
console.log('  JIRA_ENVIRONMENT=UAT npx tsx safe-jira-scraper.ts');
console.log('  JIRA_ENVIRONMENT=PRODUCTION npx tsx safe-jira-scraper.ts');
console.log('');

safeJiraScraper();
