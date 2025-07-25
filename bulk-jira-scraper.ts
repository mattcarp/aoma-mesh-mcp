import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kfxetwuuzljhybfgmpuc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function bulkScrapeDPSA() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        const allTickets = [];
        const startUrl = 'https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA';
        
        // Load initial data we extracted
        const initialTickets = JSON.parse(fs.readFileSync('dpsa-tickets-from-screenshot.json', 'utf8'));
        allTickets.push(...initialTickets);
        
        console.log(`Starting with ${initialTickets.length} tickets from screenshot`);
        
        // Store initial batch
        const { error } = await supabase
            .from('jira_tickets')
            .upsert(initialTickets.map(t => ({
                key: t.key,
                summary: t.summary,
                status: t.status,
                assignee: t.assignee,
                reporter: t.reporter,
                created: t.created,
                updated: t.updated,
                priority: t.priority,
                resolution: t.resolution,
                project: 'DPSA'
            })));
        
        if (error) {
            console.error('Supabase error:', error);
        } else {
            console.log(`✅ Stored ${initialTickets.length} tickets in Supabase`);
        }
        
        // Process more pages if needed
        const maxPages = 50; // Limit to prevent infinite loop
        for (let page_num = 2; page_num <= maxPages; page_num++) {
            const pageUrl = `${startUrl}&startIndex=${(page_num - 1) * 50}`;
            console.log(`Processing page ${page_num}: ${pageUrl}`);
            
            await page.goto(pageUrl);
            await page.waitForTimeout(3000);
            
            const pageTickets = await page.evaluate(() => {
                const tickets = [];
                const rows = document.querySelectorAll('tr[data-issuekey]');
                
                rows.forEach(row => {
                    const key = row.getAttribute('data-issuekey');
                    const summary = row.querySelector('.summary a')?.textContent?.trim();
                    const status = row.querySelector('.status')?.textContent?.trim();
                    const assignee = row.querySelector('.assignee')?.textContent?.trim();
                    const reporter = row.querySelector('.reporter')?.textContent?.trim();
                    const created = row.querySelector('.created')?.textContent?.trim();
                    const updated = row.querySelector('.updated')?.textContent?.trim();
                    const priority = row.querySelector('.priority')?.textContent?.trim();
                    
                    if (key && key.startsWith('DPSA')) {
                        tickets.push({
                            key,
                            summary,
                            status,
                            assignee,
                            reporter,
                            created,
                            updated,
                            priority,
                            resolution: status === 'CLOSED' ? 'Fixed' : 'Unresolved'
                        });
                    }
                });
                
                return tickets;
            });
            
            if (pageTickets.length === 0) {
                console.log('No more tickets found, stopping');
                break;
            }
            
            allTickets.push(...pageTickets);
            console.log(`Found ${pageTickets.length} tickets on page ${page_num}`);
            
            // Store in Supabase
            const { error: pageError } = await supabase
                .from('jira_tickets')
                .upsert(pageTickets.map(t => ({
                    key: t.key,
                    summary: t.summary,
                    status: t.status,
                    assignee: t.assignee,
                    reporter: t.reporter,
                    created: t.created,
                    updated: t.updated,
                    priority: t.priority,
                    resolution: t.resolution,
                    project: 'DPSA'
                })));
            
            if (pageError) {
                console.error('Supabase error on page', page_num, pageError);
            }
        }
        
        // Save final results
        fs.writeFileSync('all-dpsa-tickets.json', JSON.stringify(allTickets, null, 2));
        console.log(`✅ Total tickets scraped: ${allTickets.length}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

bulkScrapeDPSA();
