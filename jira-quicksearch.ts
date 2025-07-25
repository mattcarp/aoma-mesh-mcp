import playwright from 'playwright';

async function scrapeJiraQuickSearch() {
    const browser = await playwright.chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Login first
        console.log('Logging in...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
        
        await page.fill('#login-form-username', process.env.JIRA_USERNAME || '');
        await page.fill('#login-form-password', process.env.JIRA_PASSWORD || '');
        await page.click('#login-form-submit');
        
        // Wait for redirect
        await page.waitForNavigation({ timeout: 10000 });
        
        // Navigate to the working QuickSearch URL
        console.log('Navigating to QuickSearch...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/QuickSearch.jspa?searchString=dpsa');
        
        // Wait for results to load
        await page.waitForSelector('body', { timeout: 10000 });
        
        // Extract all links and text content
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
            
            // Look for any table rows with issue data
            const tableRows = document.querySelectorAll('tr');
            tableRows.forEach(row => {
                const cells = row.querySelectorAll('td');
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
            
            return {
                results,
                pageTitle: document.title,
                bodyText: document.body.textContent?.substring(0, 1000)
            };
        });
        
        console.log('QuickSearch Results:', JSON.stringify(content, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeJiraQuickSearch();
