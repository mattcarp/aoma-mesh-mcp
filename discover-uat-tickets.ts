import { chromium } from 'playwright';
import fs from 'fs';

async function discoverUATTickets() {
    console.log('🔍 UAT TICKET DISCOVERY TOOL');
    console.log('================================================================================');
    console.log('🎯 Will try multiple approaches to find UAT tickets');
    console.log('📋 Will inspect different pages and selectors');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
    });
    
    const context = await browser.newContext();
    
    try {
        // Load saved session
        if (fs.existsSync('uat-jira-session.json')) {
            console.log('🔄 Loading saved session...');
            const sessionData = JSON.parse(fs.readFileSync('uat-jira-session.json', 'utf8'));
            if (sessionData.cookies) {
                await context.addCookies(sessionData.cookies);
                console.log('✅ Session cookies loaded');
            }
        }
        
        const page = await context.newPage();
        
        console.log('🔗 Going to UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(5000);
        
        // Check if logged in
        const loginCheck = await page.evaluate(() => {
            const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
            const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
            const bodyText = document.body?.textContent?.toLowerCase() || '';
            
            return {
                hasJiraInterface,
                hasIssuesNav,
                bodyText: bodyText.substring(0, 200),
                title: document.title
            };
        });
        
        console.log('📊 Login status:', loginCheck);
        
        if (!loginCheck.hasJiraInterface) {
            console.log('❌ Not logged in - please login manually');
            console.log('🕰️ Waiting 30 seconds...');
            await page.waitForTimeout(30000);
        }
        
        // Try different ticket discovery approaches
        const approaches = [
            {
                name: 'Default Issues View',
                url: 'https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC'
            },
            {
                name: 'All Issues',
                url: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa?mode=hide&requestId=10000'
            },
            {
                name: 'Simple Search',
                url: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa'
            },
            {
                name: 'Dashboard Projects',
                url: 'https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa'
            }
        ];
        
        for (const approach of approaches) {
            console.log(`\n🔍 Trying: ${approach.name}`);
            console.log(`📋 URL: ${approach.url}`);
            
            await page.goto(approach.url);
            await page.waitForTimeout(3000);
            
            const pageAnalysis = await page.evaluate(() => {
                // Look for different ticket selectors
                const selectors = [
                    'tr[data-issuekey]',
                    '.issue-table tr',
                    '.navigator-issue-only',
                    '.issuetype',
                    '.issue-link',
                    '[data-issue-key]',
                    '.issue-container'
                ];
                
                const results = {};
                
                selectors.forEach(selector => {
                    const elements = document.querySelectorAll(selector);
                    results[selector] = {
                        count: elements.length,
                        samples: Array.from(elements).slice(0, 3).map(el => ({
                            tagName: el.tagName,
                            className: el.className,
                            textContent: el.textContent?.trim().substring(0, 100),
                            attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`)
                        }))
                    };
                });
                
                // Look for project links
                const projectLinks = Array.from(document.querySelectorAll('a[href*="browse/"]')).map(a => ({
                    href: a.href,
                    text: a.textContent?.trim()
                }));
                
                // Look for any elements containing issue keys (pattern: LETTERS-NUMBERS)
                const bodyText = document.body?.textContent || '';
                const issueKeyPattern = /[A-Z]{2,10}-\d+/g;
                const issueKeys = [...new Set(bodyText.match(issueKeyPattern) || [])];
                
                return {
                    selectors: results,
                    projectLinks: projectLinks.slice(0, 5),
                    issueKeys: issueKeys.slice(0, 10),
                    pageTitle: document.title,
                    url: window.location.href
                };
            });
            
            console.log(`   📊 Page: ${pageAnalysis.pageTitle}`);
            console.log(`   🔗 URL: ${pageAnalysis.url}`);
            console.log(`   🎫 Issue keys found: ${pageAnalysis.issueKeys.length}`);
            if (pageAnalysis.issueKeys.length > 0) {
                console.log(`   📋 Keys: ${pageAnalysis.issueKeys.slice(0, 5).join(', ')}`);
            }
            console.log(`   🏗️ Project links: ${pageAnalysis.projectLinks.length}`);
            
            // Show results for each selector
            Object.entries(pageAnalysis.selectors).forEach(([selector, data]: [string, any]) => {
                if (data.count > 0) {
                    console.log(`   ✅ ${selector}: ${data.count} elements`);
                    if (data.samples.length > 0) {
                        console.log(`      Sample: ${data.samples[0].textContent}`);
                    }
                }
            });
            
            // If we found issues, save this approach
            if (pageAnalysis.issueKeys.length > 0) {
                const filename = `uat-discovery-${approach.name.toLowerCase().replace(/\s+/g, '-')}.json`;
                fs.writeFileSync(filename, JSON.stringify({
                    approach: approach.name,
                    url: approach.url,
                    timestamp: new Date().toISOString(),
                    analysis: pageAnalysis
                }, null, 2));
                console.log(`   💾 Saved analysis to: ${filename}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Browser will close in 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        await browser.close();
    }
}

discoverUATTickets();
