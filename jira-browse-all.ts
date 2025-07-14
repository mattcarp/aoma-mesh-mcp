import { chromium } from 'playwright';
import fs from 'fs';

async function browseAllIssues() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Go to all issues
        console.log('Going to all issues...');
        await page.goto('https://jira.smedigitalapps.com/jira/issues/');
        await page.waitForTimeout(3000);
        
        // Try different JQL queries
        const queries = [
            'project IS NOT EMPTY',
            'created >= -30d',
            'updated >= -7d',
            'text ~ "project"',
            'ORDER BY created DESC'
        ];
        
        for (const query of queries) {
            console.log(`Trying JQL: ${query}`);
            const url = `https://jira.smedigitalapps.com/jira/issues/?jql=${encodeURIComponent(query)}`;
            await page.goto(url);
            await page.waitForTimeout(2000);
            
            const issues = await page.evaluate(() => {
                const links = document.querySelectorAll('a[href*="/browse/"]');
                const results = [];
                links.forEach(link => {
                    const key = link.textContent?.trim();
                    if (key && key.match(/^[A-Z]+-\d+$/)) {
                        results.push(key);
                    }
                });
                return [...new Set(results)];
            });
            
            console.log(`Found ${issues.length} issues: ${issues.slice(0, 5).join(', ')}`);
            
            if (issues.length > 0) {
                // Save and scrape first few
                const issueData = [];
                for (const issueKey of issues.slice(0, 5)) {
                    console.log(`Scraping ${issueKey}...`);
                    await page.goto(`https://jira.smedigitalapps.com/jira/browse/${issueKey}`);
                    await page.waitForTimeout(2000);
                    
                    const details = await page.evaluate(() => ({
                        key: document.querySelector('#key-val')?.textContent?.trim() || document.title,
                        summary: document.querySelector('#summary-val')?.textContent?.trim(),
                        status: document.querySelector('#status-val')?.textContent?.trim(),
                        assignee: document.querySelector('#assignee-val')?.textContent?.trim(),
                        bodyText: document.body.textContent?.substring(0, 1000)
                    }));
                    
                    issueData.push(details);
                }
                
                fs.writeFileSync(`jira-${query.replace(/[^a-zA-Z0-9]/g, '_')}.json`, JSON.stringify(issueData, null, 2));
                break; // Found issues, stop trying other queries
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

browseAllIssues();
