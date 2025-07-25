import playwright from 'playwright';
import fs from 'fs';

async function scrapeJiraQuickSearchWithCookies() {
    const browser = await playwright.chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Load existing cookies
        const cookiesFile = 'jira-cookies.json';
        if (fs.existsSync(cookiesFile)) {
            const cookies = JSON.parse(fs.readFileSync(cookiesFile, 'utf8'));
            await page.context().addCookies(cookies);
            console.log('Loaded existing cookies');
        }
        
        // Navigate to the working QuickSearch URL
        console.log('Navigating to QuickSearch...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/QuickSearch.jspa?searchString=dpsa');
        
        // Wait for results to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Screenshot for debugging
        await page.screenshot({ path: 'quicksearch-results.png' });
        
        // Extract all content
        const content = await page.evaluate(() => {
            const results = [];
            
            // Look for issue links
            const issueLinks = document.querySelectorAll('a[href*="/browse/"]');
            issueLinks.forEach(link => {
                results.push({
                    type: 'issue_link',
                    text: link.textContent?.trim(),
                    href: link.getAttribute('href')
                });
            });
            
            // Look for any DPSA references
            const allLinks = document.querySelectorAll('a');
            allLinks.forEach(link => {
                const text = link.textContent?.trim();
                if (text && (text.includes('DPSA') || text.includes('dpsa'))) {
                    results.push({
                        type: 'dpsa_link',
                        text: text,
                        href: link.getAttribute('href')
                    });
                }
            });
            
            // Look for table content
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length > 0) {
                        const rowData = Array.from(cells).map(cell => cell.textContent?.trim());
                        if (rowData.some(cell => cell?.includes('DPSA') || cell?.includes('dpsa'))) {
                            results.push({
                                type: 'table_row',
                                data: rowData
                            });
                        }
                    }
                });
            });
            
            return {
                results,
                pageTitle: document.title,
                url: window.location.href,
                bodyText: document.body.textContent?.substring(0, 2000)
            };
        });
        
        console.log('QuickSearch Results:', JSON.stringify(content, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeJiraQuickSearchWithCookies();
