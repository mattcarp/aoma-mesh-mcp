import playwright from 'playwright';
import fs from 'fs';

async function scrapeJiraIssueNavigator() {
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
        
        // Navigate to the JQL search URL
        console.log('Navigating to Issue Navigator...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=text%20~%20%22dpsa%22');
        
        // Wait for results to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Wait a bit more for dynamic content
        await page.waitForTimeout(3000);
        
        // Screenshot for debugging
        await page.screenshot({ path: 'issue-navigator.png' });
        
        // Extract issue data
        const content = await page.evaluate(() => {
            const results = [];
            
            // Look for issue rows in the navigator
            const issueRows = document.querySelectorAll('tr[data-issuekey], .issue-row, .navigator-issue');
            issueRows.forEach(row => {
                const key = row.getAttribute('data-issuekey') || 
                           row.querySelector('[data-issuekey]')?.getAttribute('data-issuekey');
                const summary = row.querySelector('.summary')?.textContent?.trim() ||
                               row.querySelector('.issue-summary')?.textContent?.trim();
                const status = row.querySelector('.status')?.textContent?.trim();
                const priority = row.querySelector('.priority')?.textContent?.trim();
                
                if (key || summary) {
                    results.push({
                        type: 'issue_row',
                        key,
                        summary,
                        status,
                        priority
                    });
                }
            });
            
            // Look for any issue links
            const issueLinks = document.querySelectorAll('a[href*="/browse/"]');
            issueLinks.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                if (href && text) {
                    results.push({
                        type: 'issue_link',
                        key: text,
                        href: href.startsWith('/') ? `https://jirauat.smedigitalapps.com${href}` : href
                    });
                }
            });
            
            // Look for table data
            const tables = document.querySelectorAll('table');
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length > 0) {
                        const rowData = Array.from(cells).map(cell => cell.textContent?.trim());
                        if (rowData.some(cell => cell && (cell.includes('DPSA') || cell.includes('dpsa')))) {
                            results.push({
                                type: 'table_row',
                                data: rowData
                            });
                        }
                    }
                });
            });
            
            // Search for any DPSA text
            const allText = document.body.textContent || '';
            const dpsaMatches = allText.match(/DPSA-\d+/gi) || [];
            
            return {
                results,
                dpsaMatches: [...new Set(dpsaMatches)],
                pageTitle: document.title,
                url: window.location.href,
                hasLogin: document.querySelector('#login-form-username') !== null,
                bodyText: allText.substring(0, 2000)
            };
        });
        
        console.log('Issue Navigator Results:', JSON.stringify(content, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeJiraIssueNavigator();
