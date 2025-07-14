import { chromium } from 'playwright';
import fs from 'fs';

async function scrapeJiraNow() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Go directly to search - you're already logged in
        console.log('Going to search...');
        await page.goto('https://jira.smedigitalapps.com/jira/secure/QuickSearch.jspa?searchString=dpsa');
        await page.waitForTimeout(3000);
        
        // Extract all issues
        const issues = await page.evaluate(() => {
            const results = [];
            
            // Get all issue links
            const links = document.querySelectorAll('a[href*="/browse/"]');
            links.forEach(link => {
                const key = link.textContent?.trim();
                const href = link.getAttribute('href');
                if (key && href) {
                    results.push({
                        key,
                        url: href.startsWith('/') ? `https://jira.smedigitalapps.com${href}` : href
                    });
                }
            });
            
            return results;
        });
        
        console.log(`Found ${issues.length} issues:`, issues);
        
        // Scrape each issue
        const allIssues = [];
        for (const issue of issues.slice(0, 10)) { // First 10 issues
            console.log(`Scraping ${issue.key}...`);
            
            await page.goto(issue.url);
            await page.waitForTimeout(2000);
            
            const details = await page.evaluate(() => ({
                key: document.querySelector('#key-val')?.textContent?.trim(),
                summary: document.querySelector('#summary-val')?.textContent?.trim(),
                description: document.querySelector('#description-val')?.textContent?.trim(),
                status: document.querySelector('#status-val')?.textContent?.trim(),
                priority: document.querySelector('#priority-val')?.textContent?.trim(),
                assignee: document.querySelector('#assignee-val')?.textContent?.trim(),
                reporter: document.querySelector('#reporter-val')?.textContent?.trim(),
                created: document.querySelector('#created-val')?.textContent?.trim(),
                updated: document.querySelector('#updated-val')?.textContent?.trim(),
                project: document.querySelector('#project-name-val')?.textContent?.trim(),
                type: document.querySelector('#type-val')?.textContent?.trim()
            }));
            
            allIssues.push(details);
        }
        
        // Save to file
        fs.writeFileSync('jira-issues.json', JSON.stringify(allIssues, null, 2));
        console.log(`Scraped ${allIssues.length} issues to jira-issues.json`);
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeJiraNow();
