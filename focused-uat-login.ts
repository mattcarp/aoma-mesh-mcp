import { chromium } from 'playwright';

async function focusedUATLogin() {
    console.log('🔐 FOCUSED UAT LOGIN');
    console.log('================================================================================');
    console.log('🎯 Goal: Get properly logged into UAT JIRA');
    console.log('✅ Will use your credentials and wait for 2FA');
    console.log('🔍 Will then check what projects actually exist');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Opening UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
        await page.waitForTimeout(3000);
        
        let step = 1;
        let maxSteps = 20;
        
        while (step <= maxSteps) {
            console.log(`\n🔍 Step ${step}: Analyzing page...`);
            
            const pageState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body.textContent?.toLowerCase() || '';
                
                // Look for specific login elements
                const usernameField = document.querySelector('input[placeholder="Username"]');
                const emailField = document.querySelector('input[type="email"]');
                const passwordField = document.querySelector('input[type="password"]');
                
                // Check if we're logged in by looking for JIRA interface elements
                const hasJiraInterface = document.querySelector('.aui-header, #header, .navigator-content') !== null;
                const hasUserMenu = document.querySelector('#header-details-user') !== null;
                const noLoginElements = !document.querySelector('input[placeholder="Username"]') && 
                                       !document.querySelector('input[type="email"]') && 
                                       !document.querySelector('input[type="password"]');
                
                const isLoggedIn = hasJiraInterface && noLoginElements && !bodyText.includes('sign in');
                
                return {
                    url,
                    title,
                    isLoggedIn,
                    needsUsername: !!usernameField,
                    needsEmail: !!emailField,
                    needsPassword: !!passwordField,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve') || bodyText.includes('authenticator'),
                    hasJiraInterface,
                    hasUserMenu
                };
            });
            
            console.log(`   URL: ${pageState.url}`);
            console.log(`   Title: ${pageState.title}`);
            console.log(`   Logged in: ${pageState.isLoggedIn ? '✅' : '❌'}`);
            
            if (pageState.isLoggedIn) {
                console.log('\n🎉 SUCCESSFULLY LOGGED INTO UAT JIRA!');
                
                // Save session
                const cookies = await page.context().cookies();
                const fs = require('fs');
                fs.writeFileSync('uat-jira-session.json', JSON.stringify({
                    cookies,
                    timestamp: new Date().toISOString(),
                    url: pageState.url
                }, null, 2));
                console.log('💾 Session saved to uat-jira-session.json');
                
                // Now discover what projects exist
                console.log('\n🔍 Discovering available projects...');
                
                await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
                await page.waitForTimeout(3000);
                
                const projects = await page.evaluate(() => {
                    const tickets = [];
                    const projectSet = new Set();
                    
                    document.querySelectorAll('tr[data-issuekey]').forEach(row => {
                        const key = row.getAttribute('data-issuekey');
                        if (key) {
                            const project = key.split('-')[0];
                            projectSet.add(project);
                            
                            const summary = row.querySelector('.summary a')?.textContent?.trim();
                            tickets.push({ key, project, summary });
                        }
                    });
                    
                    const pagingText = document.querySelector('.showing')?.textContent || '';
                    
                    return {
                        projects: Array.from(projectSet),
                        sampleTickets: tickets.slice(0, 5),
                        pagingText
                    };
                });
                
                console.log(`📊 Found projects: ${projects.projects.join(', ') || 'None'}`);
                console.log(`📊 Page info: ${projects.pagingText}`);
                
                if (projects.sampleTickets.length > 0) {
                    console.log('📝 Sample tickets:');
                    projects.sampleTickets.forEach(ticket => {
                        console.log(`   ${ticket.key}: ${ticket.summary?.substring(0, 50)}...`);
                    });
                }
                
                if (projects.projects.length > 0) {
                    console.log(`\n✅ SUCCESS: Found ${projects.projects.length} project(s) in UAT`);
                    console.log('🎯 Ready to scrape these projects for upgrade testing');
                } else {
                    console.log('\n⚠️ No projects found - UAT environment may be empty');
                }
                
                break;
            }
            
            // Handle different login screens
            if (pageState.needsUsername) {
                console.log('   🔤 Entering username...');
                await page.locator('input[placeholder="Username"]').fill('mcarpent');
                await page.locator('button').filter({ hasText: 'Continue' }).click();
                
            } else if (pageState.needsEmail) {
                console.log('   📧 Entering email...');
                await page.locator('input[type="email"]').fill('matt.carpenter.ext@sonymusic.com');
                await page.locator('button').filter({ hasText: 'Next' }).click();
                
            } else if (pageState.needsPassword) {
                console.log('   🔒 Entering password...');
                await page.locator('input[type="password"]').fill('Dooley1_Jude2');
                await page.locator('button').filter({ hasText: 'Sign in' }).click();
                
            } else if (pageState.is2FA) {
                console.log('   📱 2FA detected - please complete on your phone');
                await page.waitForTimeout(10000);
                
            } else {
                console.log('   ⏳ Unknown state - waiting...');
                await page.waitForTimeout(5000);
            }
            
            step++;
            await page.waitForTimeout(2000);
        }
        
        if (step > maxSteps) {
            console.log('\n❌ Login timeout - please check browser manually');
        }
        
    } catch (error) {
        console.error('❌ Login error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for manual inspection...');
        console.log('Press Ctrl+C when done');
        await new Promise(() => {}); // Keep open indefinitely
    }
}

focusedUATLogin();
