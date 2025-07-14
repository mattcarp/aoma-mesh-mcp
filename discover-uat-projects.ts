import { chromium } from 'playwright';

async function discoverUATProjects() {
    console.log('🔍 UAT PROJECT DISCOVERY');
    console.log('================================================================================');
    console.log('🎯 Finding available projects and tickets in UAT environment');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        await page.goto('https://jirauat.smedigitalapps.com/jira/');
        await page.waitForTimeout(3000);
        
        // Add discovery banner
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; background: #2196F3;
                color: white; padding: 15px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 18px;
            `;
            banner.textContent = '🔍 UAT PROJECT DISCOVERY - FINDING AVAILABLE DATA';
            document.body.prepend(banner);
        });
        
        console.log('🔍 Checking authentication status...');
        const authStatus = await page.evaluate(() => {
            const isLoggedIn = !document.querySelector('#login-form-username') && 
                              !document.body.textContent?.includes('Log in');
            return {
                loggedIn: isLoggedIn,
                pageTitle: document.title,
                url: window.location.href
            };
        });
        
        console.log(`   Status: ${authStatus.loggedIn ? '✅ Logged in' : '❌ Not logged in'}`);
        console.log(`   Page: ${authStatus.pageTitle}`);
        
        if (!authStatus.loggedIn) {
            console.log('⚠️  Please log in manually and wait...');
            await page.waitForTimeout(30000);
        }
        
        // Navigate to all issues to see what projects exist
        console.log('🔍 Discovering available projects...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/');
        await page.waitForTimeout(5000);
        
        // Try a broad search to see any tickets
        console.log('🔍 Searching for any recent tickets...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        const discoveryResults = await page.evaluate(() => {
            // Get any visible tickets
            const ticketRows = document.querySelectorAll('tr[data-issuekey], .issue-row');
            const foundTickets = [];
            const projects = new Set();
            
            ticketRows.forEach(row => {
                const key = row.getAttribute('data-issuekey') || 
                           row.querySelector('a[href*="/browse/"]')?.textContent?.trim();
                
                if (key) {
                    const project = key.split('-')[0];
                    projects.add(project);
                    
                    const summary = row.querySelector('.summary a, .issue-summary')?.textContent?.trim();
                    const status = row.querySelector('.status')?.textContent?.trim();
                    
                    foundTickets.push({ key, project, summary, status });
                }
            });
            
            // Get pagination info
            const pagingInfo = document.querySelector('.showing, .results-count-total, .navigator-title')?.textContent || '';
            
            // Check for any project dropdown or navigation
            const projectLinks = Array.from(document.querySelectorAll('a[href*="project"]'))
                .map(link => link.textContent?.trim())
                .filter(Boolean);
            
            return {
                foundTickets: foundTickets.slice(0, 10), // First 10 tickets
                projects: Array.from(projects),
                totalTicketsText: pagingInfo,
                projectLinks: [...new Set(projectLinks)].slice(0, 10),
                pageContent: document.body.textContent?.substring(0, 1000)
            };
        });
        
        console.log('📊 DISCOVERY RESULTS:');
        console.log(`   Found projects: ${discoveryResults.projects.join(', ') || 'None found'}`);
        console.log(`   Total tickets info: ${discoveryResults.totalTicketsText}`);
        console.log(`   Sample tickets found: ${discoveryResults.foundTickets.length}`);
        
        if (discoveryResults.foundTickets.length > 0) {
            console.log('\n📝 Sample tickets:');
            discoveryResults.foundTickets.forEach(ticket => {
                console.log(`   ${ticket.key} (${ticket.project}): ${ticket.summary?.substring(0, 50)}...`);
            });
        }
        
        if (discoveryResults.projectLinks.length > 0) {
            console.log('\n🔗 Project links found:');
            discoveryResults.projectLinks.forEach(link => {
                console.log(`   ${link}`);
            });
        }
        
        // Try searching for specific projects
        const testProjects = ['ITSM', 'DPSA', 'TEST', 'UAT', 'DEV'];
        
        for (const project of testProjects) {
            console.log(`\n🔍 Testing project: ${project}`);
            try {
                await page.goto(`https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}`);
                await page.waitForTimeout(3000);
                
                const projectResult = await page.evaluate(() => {
                    const errorMsg = document.querySelector('.error, .aui-message-error')?.textContent;
                    const pagingInfo = document.querySelector('.showing, .results-count-total')?.textContent || '';
                    const ticketCount = document.querySelectorAll('tr[data-issuekey]').length;
                    
                    return {
                        hasError: !!errorMsg,
                        errorMessage: errorMsg,
                        pagingInfo,
                        visibleTickets: ticketCount
                    };
                });
                
                if (projectResult.hasError) {
                    console.log(`   ❌ ${project}: ${projectResult.errorMessage}`);
                } else {
                    console.log(`   ✅ ${project}: ${projectResult.pagingInfo} (${projectResult.visibleTickets} visible)`);
                }
            } catch (error) {
                console.log(`   ❌ ${project}: Error accessing`);
            }
        }
        
        console.log('\n📄 Keeping browser open for manual inspection...');
        console.log('   Check what projects and tickets are available');
        console.log('   Look for any project selector or navigation');
        
        // Keep browser open
        await new Promise(() => {});
        
    } catch (error) {
        console.error('❌ Discovery error:', error);
    }
}

discoverUATProjects();
