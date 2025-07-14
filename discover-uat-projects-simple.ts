import { chromium } from 'playwright';

async function discoverUATProjects() {
    console.log('🔍 SIMPLE UAT PROJECT DISCOVERY');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // Load saved session if it exists
        const fs = require('fs');
        if (fs.existsSync('uat-jira-session.json')) {
            const sessionData = JSON.parse(fs.readFileSync('uat-jira-session.json', 'utf8'));
            await page.context().addCookies(sessionData.cookies);
            console.log('✅ Loaded saved session');
        }
        
        // Go to UAT JIRA
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(5000);
        
        // Check if we're actually logged in
        const loginStatus = await page.evaluate(() => {
            const hasLoginButton = document.querySelector('a[href*="login"]') !== null;
            const hasLoginForm = document.querySelector('#login-form-username') !== null;
            const pageTitle = document.title;
            const bodyText = document.body.textContent?.substring(0, 500);
            
            return {
                needsLogin: hasLoginButton || hasLoginForm,
                pageTitle,
                bodyText
            };
        });
        
        console.log(`📊 Login Status: ${loginStatus.needsLogin ? '❌ Need to log in' : '✅ Logged in'}`);
        console.log(`📄 Page: ${loginStatus.pageTitle}`);
        
        if (loginStatus.needsLogin) {
            console.log('❌ Not properly logged in to UAT');
            console.log('📝 Body text preview:', loginStatus.bodyText);
            return;
        }
        
        // Try to find what projects exist
        console.log('\n🔍 Searching for available projects...');
        
        // Try a broad search
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        const discoveryResults = await page.evaluate(() => {
            // Look for any tickets
            const ticketRows = document.querySelectorAll('tr[data-issuekey]');
            const foundProjects = new Set();
            const sampleTickets = [];
            
            ticketRows.forEach(row => {
                const key = row.getAttribute('data-issuekey');
                if (key) {
                    const project = key.split('-')[0];
                    foundProjects.add(project);
                    
                    const summary = row.querySelector('.summary a')?.textContent?.trim();
                    sampleTickets.push({ key, project, summary });
                }
            });
            
            // Get page info
            const pagingText = document.querySelector('.showing, .results-count-total')?.textContent || '';
            const errorText = document.querySelector('.error, .aui-message-error')?.textContent || '';
            
            return {
                projects: Array.from(foundProjects),
                sampleTickets: sampleTickets.slice(0, 10),
                pagingText,
                errorText,
                totalRows: ticketRows.length
            };
        });
        
        console.log('\n📊 DISCOVERY RESULTS:');
        console.log(`   Available projects: ${discoveryResults.projects.join(', ') || 'None found'}`);
        console.log(`   Sample tickets found: ${discoveryResults.sampleTickets.length}`);
        console.log(`   Page info: ${discoveryResults.pagingText}`);
        console.log(`   Table rows: ${discoveryResults.totalRows}`);
        
        if (discoveryResults.errorText) {
            console.log(`   Error message: ${discoveryResults.errorText}`);
        }
        
        if (discoveryResults.sampleTickets.length > 0) {
            console.log('\n📝 Sample tickets:');
            discoveryResults.sampleTickets.forEach(ticket => {
                console.log(`   ${ticket.key}: ${ticket.summary?.substring(0, 60)}...`);
            });
        }
        
        // Try to browse projects page
        console.log('\n🔍 Checking projects page...');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/BrowseProjects.jspa');
            await page.waitForTimeout(3000);
            
            const projectsPage = await page.evaluate(() => {
                const projectLinks = document.querySelectorAll('a[href*="browse/"]');
                const projects = [];
                
                projectLinks.forEach(link => {
                    const text = link.textContent?.trim();
                    const href = link.getAttribute('href');
                    if (text && href) {
                        projects.push({ name: text, href });
                    }
                });
                
                return {
                    projects: projects.slice(0, 20),
                    pageTitle: document.title
                };
            });
            
            console.log(`   Projects page: ${projectsPage.pageTitle}`);
            if (projectsPage.projects.length > 0) {
                console.log('   Available projects:');
                projectsPage.projects.forEach(proj => {
                    console.log(`     ${proj.name}`);
                });
            }
            
        } catch (e) {
            console.log('   ❌ Could not access projects page');
        }
        
        console.log('\n💡 SUMMARY:');
        if (discoveryResults.projects.length > 0) {
            console.log(`✅ Found ${discoveryResults.projects.length} project(s): ${discoveryResults.projects.join(', ')}`);
            console.log('🎯 We can extract tickets from these projects instead of ITSM/DPSA');
        } else {
            console.log('❌ No projects found - UAT environment may be empty or login failed');
        }
        
    } catch (error) {
        console.error('❌ Discovery error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for inspection...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

discoverUATProjects();
