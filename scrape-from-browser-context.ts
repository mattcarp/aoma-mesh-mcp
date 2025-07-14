import { chromium } from 'playwright';
import fs from 'fs';

async function scrapeWithContext() {
    // Connect to an existing browser instance
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
        console.log('No browser contexts found');
        return;
    }
    
    const context = contexts[0];
    const pages = context.pages();
    
    // Find a page with JIRA
    let jiraPage = pages.find(p => p.url().includes('jira.smedigitalapps.com'));
    
    if (!jiraPage) {
        // Open new page in existing context
        jiraPage = await context.newPage();
        await jiraPage.goto('https://jira.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA');
    }
    
    await jiraPage.waitForTimeout(3000);
    
    // Extract ticket data
    const tickets = await jiraPage.evaluate(() => {
        const results = [];
        
        // Look for table rows with issue keys
        const rows = document.querySelectorAll('tr');
        rows.forEach(row => {
            const keyCell = row.querySelector('td.issuekey, .issue-key, [data-issuekey]');
            if (keyCell) {
                const key = keyCell.textContent?.trim() || row.getAttribute('data-issuekey');
                const summary = row.querySelector('.summary a, .issue-summary')?.textContent?.trim();
                const status = row.querySelector('.status')?.textContent?.trim();
                
                if (key && key.startsWith('DPSA')) {
                    results.push({ key, summary, status });
                }
            }
        });
        
        return results;
    });
    
    console.log(`Found ${tickets.length} tickets:`, tickets);
    fs.writeFileSync('jira-tickets-final.json', JSON.stringify(tickets, null, 2));
}

scrapeWithContext().catch(console.error);
