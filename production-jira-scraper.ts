import { chromium } from 'playwright';
import fs from 'fs';
import { requireVPNConnection } from './vpn-check';
import { createClient } from '@supabase/supabase-js';

async function productionJiraScraper() {
    console.log('🚨 PRODUCTION JIRA SCRAPER');
    console.log('================================================================================');
    console.log('⚠️ DANGER: This will access PRODUCTION JIRA - Real business data!');
    console.log('🔗 URL: https://jira.smedigitalapps.com');
    console.log('================================================================================');
    
    // Check VPN
    const vpnOk = await requireVPNConnection();
    if (!vpnOk) {
        console.log('❌ VPN check failed - cannot access JIRA');
        return;
    }
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Connecting to production JIRA...');
        
        // Go to the DPSA project tickets (from your screenshot)
        await page.goto('https://jira.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA');
        await page.waitForTimeout(5000);
        
        // Check if we're logged in
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('#login-form-username') && 
                   !document.body.textContent?.includes('Log in');
        });
        
        if (!isLoggedIn) {
            console.log('❌ Not logged in to JIRA - please log in manually');
            console.log('⏳ Waiting 30 seconds for manual login...');
            await page.waitForTimeout(30000);
        }
        
        // Extract tickets from current page
        console.log('📊 Extracting tickets from current page...');
        
        const tickets = await page.evaluate(() => {
            const results = [];
            
            // Look for table rows with ticket data
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
                                created: cellTexts[2] || '',
                                assignee: cellTexts[3] || '',
                                reporter: cellTexts[4] || '',
                                priority: cellTexts[5] || '',
                                status: cellTexts[6] || '',
                                updated: cellTexts[7] || ''
                            });
                        }
                    }
                }
            });
            
            // Also look for issue links
            const issueLinks = document.querySelectorAll('a[href*="/browse/DPSA"]');
            issueLinks.forEach(link => {
                const key = link.textContent?.trim();
                if (key && key.startsWith('DPSA-')) {
                    const row = link.closest('tr');
                    if (row) {
                        const cells = row.querySelectorAll('td');
                        const cellTexts = Array.from(cells).map(cell => cell.textContent?.trim());
                        
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
            });
            
            return [...new Map(results.map(item => [item.key, item])).values()];
        });
        
        console.log(`📊 Found ${tickets.length} tickets on current page`);
        
        if (tickets.length > 0) {
            console.log('📝 Sample tickets:');
            tickets.slice(0, 3).forEach(ticket => {
                console.log(`  ${ticket.key}: ${ticket.summary?.substring(0, 50)}...`);
            });
            
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `production-dpsa-tickets-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'PRODUCTION',
                url: 'https://jira.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                extractedCount: tickets.length,
                tickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const { error } = await supabase
                .from('jira_tickets')
                .upsert(tickets.map(t => ({
                    external_id: t.key,
                    title: t.summary,
                    status: t.status,
                    priority: t.priority,
                    metadata: {
                        project: 'DPSA',
                        assignee: t.assignee,
                        reporter: t.reporter,
                        created: t.created,
                        updated: t.updated,
                        source: 'production-jira-scraper'
                    }
                })));
            
            if (error) {
                console.error('❌ Supabase error:', error);
            } else {
                console.log(`✅ Stored ${tickets.length} tickets in Supabase`);
            }
        } else {
            console.log('❌ No tickets found - check if logged in and on correct page');
        }
        
    } catch (error) {
        console.error('❌ Error during scraping:', error);
    } finally {
        console.log('🔄 Keeping browser open for manual inspection...');
        // Don't close browser automatically
    }
}

productionJiraScraper();
