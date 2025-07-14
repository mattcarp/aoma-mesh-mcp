import { chromium } from 'playwright';
import fs from 'fs';

async function getAllDPSATickets() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        const allTickets = [];
        
        // Load initial data
        const initialTickets = JSON.parse(fs.readFileSync('dpsa-tickets-from-screenshot.json', 'utf8'));
        allTickets.push(...initialTickets);
        
        console.log(`Starting with ${initialTickets.length} tickets from screenshot`);
        
        // Get all tickets by processing pages
        let currentPage = 1;
        let hasMorePages = true;
        
        while (hasMorePages && currentPage <= 615) { // 30757 / 50 = ~615 pages
            const startIndex = (currentPage - 1) * 50;
            const pageUrl = `https://jira.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA&startIndex=${startIndex}`;
            
            console.log(`Processing page ${currentPage} (tickets ${startIndex + 1}-${startIndex + 50})`);
            
            await page.goto(pageUrl);
            await page.waitForTimeout(2000);
            
            const pageTickets = await page.evaluate(() => {
                const tickets = [];
                
                // Try multiple selectors
                const rows = document.querySelectorAll('tr[data-issuekey], .issue-row, .navigator-issue');
                
                rows.forEach(row => {
                    const key = row.getAttribute('data-issuekey') || 
                               row.querySelector('.issuekey')?.textContent?.trim() ||
                               row.querySelector('[data-issuekey]')?.getAttribute('data-issuekey');
                    
                    const summary = row.querySelector('.summary a, .issue-summary')?.textContent?.trim();
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
                hasMorePages = false;
            } else {
                allTickets.push(...pageTickets);
                console.log(`Found ${pageTickets.length} tickets on page ${currentPage}. Total: ${allTickets.length}`);
                
                // Save progress every 10 pages
                if (currentPage % 10 === 0) {
                    fs.writeFileSync('dpsa-tickets-progress.json', JSON.stringify(allTickets, null, 2));
                    console.log(`✅ Progress saved: ${allTickets.length} tickets`);
                }
            }
            
            currentPage++;
            
            // Respect rate limits
            await page.waitForTimeout(1000);
        }
        
        // Save final results
        fs.writeFileSync('all-dpsa-tickets-final.json', JSON.stringify(allTickets, null, 2));
        console.log(`✅ COMPLETE: Scraped ${allTickets.length} total tickets`);
        
        // Create summary
        const summary = {
            total: allTickets.length,
            openTickets: allTickets.filter(t => t.status === 'OPEN').length,
            closedTickets: allTickets.filter(t => t.status === 'CLOSED').length,
            inProgressTickets: allTickets.filter(t => t.status === 'IN PROGRESS').length,
            uniqueAssignees: [...new Set(allTickets.map(t => t.assignee))].length,
            uniqueReporters: [...new Set(allTickets.map(t => t.reporter))].length
        };
        
        console.log('\n📊 SUMMARY:');
        console.log(`Total tickets: ${summary.total}`);
        console.log(`Open: ${summary.openTickets}`);
        console.log(`Closed: ${summary.closedTickets}`);
        console.log(`In Progress: ${summary.inProgressTickets}`);
        console.log(`Unique Assignees: ${summary.uniqueAssignees}`);
        console.log(`Unique Reporters: ${summary.uniqueReporters}`);
        
        fs.writeFileSync('dpsa-summary.json', JSON.stringify(summary, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

getAllDPSATickets();
