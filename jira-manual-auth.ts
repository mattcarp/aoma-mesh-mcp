import playwright from 'playwright';
import fs from 'fs';

async function manualAuthAndSearch() {
    const browser = await playwright.chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('Opening JIRA login page...');
        await page.goto('https://jira.smedigitalapps.com/jira/login.jsp');
        
        // Wait for manual login
        console.log('Please log in manually in the browser...');
        console.log('Then navigate to: https://jira.smedigitalapps.com/jira/secure/QuickSearch.jspa?searchString=dpsa');
        console.log('Press Enter in this terminal when you see the search results...');
        
        // Wait for user to press Enter
        await new Promise(resolve => {
            const stdin = process.stdin;
            stdin.setRawMode(true);
            stdin.resume();
            stdin.on('data', key => {
                if (key.toString() === '\r' || key.toString() === '\n') {
                    stdin.setRawMode(false);
                    stdin.pause();
                    resolve(null);
                }
            });
        });
        
        // Save cookies after manual login
        const cookies = await page.context().cookies();
        fs.writeFileSync('jira-cookies.json', JSON.stringify(cookies, null, 2));
        console.log('Cookies saved!');
        
        // Extract current page data
        const content = await page.evaluate(() => {
            const results = [];
            
            // Look for issue links
            const issueLinks = document.querySelectorAll('a[href*="/browse/"]');
            issueLinks.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                if (href && text) {
                    results.push({
                        type: 'issue_link',
                        key: text,
                        href: href.startsWith('/') ? `https://jira.smedigitalapps.com${href}` : href
                    });
                }
            });
            
            // Look for table rows
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length > 0) {
                        const rowData = Array.from(cells).map(cell => cell.textContent?.trim());
                        results.push({
                            type: 'table_row',
                            data: rowData
                        });
                    }
                });
            });
            
            // Search for DPSA patterns
            const allText = document.body.textContent || '';
            const dpsaMatches = allText.match(/DPSA-\d+/gi) || [];
            
            return {
                results,
                dpsaMatches: [...new Set(dpsaMatches)],
                pageTitle: document.title,
                url: window.location.href,
                totalResults: results.length,
                bodyText: allText.substring(0, 3000)
            };
        });
        
        console.log('Search Results:', JSON.stringify(content, null, 2));
        
        // Now try different search terms
        const searchTerms = ['project', 'bug', 'feature', 'task', 'story'];
        
        for (const term of searchTerms) {
            console.log(`\n--- Searching for: ${term} ---`);
            await page.goto(`https://jira.smedigitalapps.com/jira/secure/QuickSearch.jspa?searchString=${term}`);
            await page.waitForTimeout(2000);
            
            const termResults = await page.evaluate(() => {
                const issueLinks = document.querySelectorAll('a[href*="/browse/"]');
                const issues = [];
                issueLinks.forEach(link => {
                    const href = link.getAttribute('href');
                    const text = link.textContent?.trim();
                    if (href && text) {
                        issues.push({
                            key: text,
                            href: href.startsWith('/') ? `https://jira.smedigitalapps.com${href}` : href
                        });
                    }
                });
                return issues.slice(0, 5); // First 5 results
            });
            
            console.log(`Found ${termResults.length} results for "${term}":`, termResults);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        // Don't close browser automatically
        console.log('Browser left open for manual inspection');
    }
}

manualAuthAndSearch();
