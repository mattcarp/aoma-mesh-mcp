import { chromium } from 'playwright';
import fs from 'fs';

async function authenticateAndSearch() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('Navigating to JIRA login...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
        
        // Wait for the username field to be visible
        await page.waitForSelector('input[type="text"]', { timeout: 10000 });
        
        // Fill username
        console.log('Filling username...');
        await page.fill('input[type="text"]', process.env.JIRA_USERNAME || '');
        
        // Click Next
        await page.click('text=Next');
        
        // Wait for password field (assuming SSO flow)
        await page.waitForSelector('input[type="password"]', { timeout: 10000 });
        
        // Fill password
        console.log('Filling password...');
        await page.fill('input[type="password"]', process.env.JIRA_PASSWORD || '');
        
        // Submit form (look for submit button)
        const submitButton = await page.locator('button[type="submit"], input[type="submit"], text="Sign in", text="Log in"').first();
        await submitButton.click();
        
        // Wait for successful login (redirect or dashboard)
        await page.waitForNavigation({ timeout: 15000 });
        
        // Save cookies
        const cookies = await page.context().cookies();
        fs.writeFileSync('jira-cookies.json', JSON.stringify(cookies, null, 2));
        console.log('Cookies saved!');
        
        // Navigate to the search URL
        console.log('Navigating to search...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/QuickSearch.jspa?searchString=dpsa');
        
        // Wait for search results
        await page.waitForTimeout(3000);
        
        // Extract search results
        const results = await page.evaluate(() => {
            const issues = [];
            
            // Look for issue links
            const issueLinks = document.querySelectorAll('a[href*="/browse/"]');
            issueLinks.forEach(link => {
                const href = link.getAttribute('href');
                const text = link.textContent?.trim();
                if (href && text) {
                    issues.push({
                        key: text,
                        href: href.startsWith('/') ? `https://jirauat.smedigitalapps.com${href}` : href
                    });
                }
            });
            
            // Look for table content
            const tables = document.querySelectorAll('table');
            const tableData = [];
            tables.forEach(table => {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length > 0) {
                        const rowData = Array.from(cells).map(cell => cell.textContent?.trim());
                        tableData.push(rowData);
                    }
                });
            });
            
            return {
                issues,
                tableData,
                url: window.location.href,
                title: document.title,
                bodyText: document.body.textContent?.substring(0, 2000)
            };
        });
        
        console.log('Search Results:', JSON.stringify(results, null, 2));
        
        // If we found issues, let's grab one for detailed scraping
        if (results.issues.length > 0) {
            const firstIssue = results.issues[0];
            console.log(`\nScraping details for: ${firstIssue.key}`);
            
            await page.goto(firstIssue.href);
            await page.waitForTimeout(2000);
            
            const issueDetails = await page.evaluate(() => {
                return {
                    title: document.title,
                    summary: document.querySelector('#summary-val')?.textContent?.trim(),
                    description: document.querySelector('#description-val')?.textContent?.trim(),
                    status: document.querySelector('#status-val')?.textContent?.trim(),
                    priority: document.querySelector('#priority-val')?.textContent?.trim(),
                    assignee: document.querySelector('#assignee-val')?.textContent?.trim(),
                    reporter: document.querySelector('#reporter-val')?.textContent?.trim(),
                    bodyText: document.body.textContent?.substring(0, 3000)
                };
            });
            
            console.log('Issue Details:', JSON.stringify(issueDetails, null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error);
        // Take screenshot for debugging
        await page.screenshot({ path: 'jira-error.png' });
    } finally {
        await browser.close();
    }
}

authenticateAndSearch();
