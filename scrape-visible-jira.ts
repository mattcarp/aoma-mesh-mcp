import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function scrapeCurrentJiraView() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Go to the exact URL you're viewing
        await page.goto('https://jira.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA');
        await page.waitForTimeout(3000);
        
        // Extract all visible tickets
        const tickets = await page.evaluate(() => {
            const rows = document.querySelectorAll('tr[data-issuekey]');
            const results = [];
            
            rows.forEach(row => {
                const key = row.getAttribute('data-issuekey');
                const summary = row.querySelector('.summary a')?.textContent?.trim();
                const status = row.querySelector('.status')?.textContent?.trim();
                const assignee = row.querySelector('.assignee')?.textContent?.trim();
                const created = row.querySelector('.created')?.textContent?.trim();
                const updated = row.querySelector('.updated')?.textContent?.trim();
                const priority = row.querySelector('.priority')?.textContent?.trim();
                const reporter = row.querySelector('.reporter')?.textContent?.trim();
                
                if (key) {
                    results.push({
                        key,
                        summary,
                        status,
                        assignee,
                        created,
                        updated,
                        priority,
                        reporter
                    });
                }
            });
            
            return results;
        });
        
        console.log(`Found ${tickets.length} tickets`);
        
        // Store in Supabase
        if (tickets.length > 0) {
            const { error } = await supabase
                .from('jira_tickets')
                .upsert(tickets.map(t => ({
                    key: t.key,
                    summary: t.summary,
                    status: t.status,
                    assignee: t.assignee,
                    created: t.created,
                    updated: t.updated,
                    priority: t.priority,
                    reporter: t.reporter,
                    project: 'DPSA'
                })));
            
            if (error) {
                console.error('Supabase error:', error);
            } else {
                console.log(`✅ Stored ${tickets.length} tickets in Supabase`);
            }
        }
        
        // Save to file
        fs.writeFileSync('dpsa-tickets.json', JSON.stringify(tickets, null, 2));
        console.log(`✅ Saved ${tickets.length} tickets to dpsa-tickets.json`);
        
        // Get total count
        const totalCount = await page.evaluate(() => {
            const countText = document.querySelector('.showing')?.textContent;
            const match = countText?.match(/of (\d+)/);
            return match ? parseInt(match[1]) : 0;
        });
        
        console.log(`Total tickets in DPSA project: ${totalCount}`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeCurrentJiraView();
