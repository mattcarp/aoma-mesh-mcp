import { chromium } from 'playwright';
import fs from 'fs';

async function scrapeDPSATickets() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://jira.smedigitalapps.com/jira/issues/?jql=project%20%3D%20DPSA');
        await page.waitForTimeout(5000);
        
        // Get all table content
        const content = await page.evaluate(() => {
            const tickets = [];
            
            // Try different selectors
            const rows = document.querySelectorAll('table tbody tr, .issue-table tr, .navigator-content tr');
            
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                const rowData = Array.from(cells).map(cell => cell.textContent?.trim()).filter(Boolean);
                
                if (rowData.length > 0 && rowData.some(cell => cell.includes('DPSA'))) {
                    tickets.push(rowData);
                }
            });
            
            // Also try to find links
            const links = document.querySelectorAll('a[href*="DPSA"]');
            const linkData = Array.from(links).map(link => ({
                text: link.textContent?.trim(),
                href: link.getAttribute('href')
            }));
            
            return {
                tickets,
                links: linkData,
                pageContent: document.body.textContent?.substring(0, 5000)
            };
        });
        
        console.log('Scraped content:', JSON.stringify(content, null, 2));
        fs.writeFileSync('dpsa-raw-content.json', JSON.stringify(content, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeDPSATickets();
