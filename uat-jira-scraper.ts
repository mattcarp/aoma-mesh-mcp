import { chromium } from 'playwright';
import fs from 'fs';
import { requireVPNConnection } from './vpn-check';
import { createClient } from '@supabase/supabase-js';

async function uatJiraScraper() {
    console.log('🧪 UAT JIRA SCRAPER - UPGRADE TESTING');
    console.log('================================================================================');
    console.log('✅ SAFE: This accesses UAT/STAGING JIRA for upgrade testing');
    console.log('🔗 UAT URL: https://jirauat.smedigitalapps.com');
    console.log('⚠️  UAT tickets will be flagged as temporary test data in Supabase');
    console.log('================================================================================');
    
    // Check VPN
    const vpnOk = await requireVPNConnection();
    if (!vpnOk) {
        console.log('❌ VPN check failed - cannot access UAT JIRA');
        return;
    }
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Connecting to UAT JIRA for upgrade testing...');
        
        // ONLY use UAT URL - never production
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA');
        await page.waitForTimeout(5000);
        
        // Add UAT banner to browser
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #ff9800;
                color: white;
                padding: 10px;
                text-align: center;
                font-weight: bold;
                z-index: 9999;
                font-size: 16px;
            `;
            banner.textContent = '🧪 UAT ENVIRONMENT - JIRA UPGRADE TESTING';
            document.body.prepend(banner);
        });
        
        // Check if we're logged in
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('#login-form-username') && 
                   !document.body.textContent?.includes('Log in');
        });
        
        if (!isLoggedIn) {
            console.log('❌ Not logged in to UAT JIRA - please log in manually');
            console.log('⏳ Waiting 30 seconds for manual login...');
            await page.waitForTimeout(30000);
        }
        
        console.log('📊 Extracting UAT tickets for upgrade testing...');
        
        const tickets = await page.evaluate(() => {
            const results = [];
            
            // Extract ticket data from table rows
            const rows = document.querySelectorAll('tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 6) {
                    const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim());
                    
                    // Look for DPSA ticket key
                    const keyCell = cellTexts.find(text => text && text.match(/DPSA-\d+/));
                    if (keyCell) {
                        const key = keyCell.match(/DPSA-\d+/)?.[0];
                        if (key) {
                            results.push({
                                key,
                                summary: cellTexts[1] || '',
                                status: cellTexts[2] || '',
                                assignee: cellTexts[3] || '',
                                reporter: cellTexts[4] || '',
                                created: cellTexts[5] || '',
                                updated: cellTexts[6] || '',
                                priority: cellTexts[7] || ''
                            });
                        }
                    }
                }
            });
            
            return [...new Map(results.map(item => [item.key, item])).values()];
        });
        
        console.log(`📊 Found ${tickets.length} UAT tickets`);
        
        if (tickets.length > 0) {
            console.log('📝 Sample UAT tickets:');
            tickets.slice(0, 3).forEach(ticket => {
                console.log(`  UAT-${ticket.key}: ${ticket.summary?.substring(0, 50)}...`);
            });
            
            // Save to file with UAT prefix
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-upgrade-testing-tickets-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_UPGRADE_TESTING',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                purpose: 'JIRA upgrade testing - temporary test data',
                extractedCount: tickets.length,
                tickets
            }, null, 2));
            
            console.log(`💾 Saved UAT tickets to: ${filename}`);
            
            // Store in Supabase with UAT flags
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const { error } = await supabase
                .from('jira_tickets')
                .upsert(tickets.map(t => ({
                    external_id: `UAT-${t.key}`, // Prefix with UAT
                    title: `[UAT TESTING] ${t.summary}`, // Mark in title
                    status: t.status,
                    priority: t.priority,
                    metadata: {
                        environment: 'UAT',
                        purpose: 'JIRA_UPGRADE_TESTING',
                        original_key: t.key,
                        project: 'DPSA',
                        assignee: t.assignee,
                        reporter: t.reporter,
                        created: t.created,
                        updated: t.updated,
                        source: 'uat-jira-scraper',
                        is_temporary: true,
                        cleanup_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
                    }
                })));
            
            if (error) {
                console.error('❌ Supabase error:', error);
            } else {
                console.log(`✅ Stored ${tickets.length} UAT tickets in Supabase with UAT flags`);
                console.log('🏷️  All UAT tickets are prefixed with "UAT-" and marked as temporary');
            }
            
            // Create cleanup script
            const cleanupScript = `
-- SQL to clean up UAT tickets after testing
DELETE FROM jira_tickets 
WHERE metadata->>'environment' = 'UAT' 
  AND metadata->>'purpose' = 'JIRA_UPGRADE_TESTING'
  AND metadata->>'is_temporary' = 'true';

-- Count UAT tickets before cleanup
SELECT COUNT(*) as uat_ticket_count 
FROM jira_tickets 
WHERE metadata->>'environment' = 'UAT';
`;
            
            fs.writeFileSync('cleanup-uat-tickets.sql', cleanupScript);
            console.log('📄 Created cleanup script: cleanup-uat-tickets.sql');
            
        } else {
            console.log('❌ No UAT tickets found - check if logged in and on correct page');
        }
        
    } catch (error) {
        console.error('❌ Error during UAT scraping:', error);
    } finally {
        console.log('🔄 Keeping browser open for UAT testing...');
    }
}

uatJiraScraper();
