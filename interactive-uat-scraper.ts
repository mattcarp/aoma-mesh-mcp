import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function interactiveUATScraper() {
    console.log('🎯 INTERACTIVE UAT SCRAPER - USER GUIDED');
    console.log('================================================================================');
    console.log('🤝 You can guide the login process manually');
    console.log('🔍 Will provide detailed debugging of what we find');
    console.log('📦 Extract ALL available UAT tickets');
    console.log('💾 Store in Supabase with UAT flags');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'],
        slowMo: 1000  // Slow down for easier observation
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        console.log('🔗 Opening UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(3000);
        
        console.log('\n🎯 MANUAL LOGIN PHASE');
        console.log('================================================================================');
        console.log('📝 Please complete the login manually in the browser');
        console.log('✅ I will wait and detect when you are logged in');
        console.log('⏰ I will check every 5 seconds...');
        console.log('================================================================================');
        
        let loginAttempts = 0;
        let isLoggedIn = false;
        const maxAttempts = 24; // 2 minutes
        
        while (!isLoggedIn && loginAttempts < maxAttempts) {
            loginAttempts++;
            console.log(`\n🔍 Login Check ${loginAttempts}/${maxAttempts}...`);
            
            const pageState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body?.textContent?.toLowerCase() || '';
                
                // More comprehensive login detection
                const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header, .aui-header') !== null;
                const hasIssuesNav = document.querySelector('a[href*="issues"], a[href*="browse"]') !== null;
                const hasDashboard = document.querySelector('#dashboard, .dashboard, .gadget') !== null;
                const noLoginElements = !document.querySelector('input[type="email"], input[type="password"], input[name="loginfmt"], input[name="passwd"]');
                
                const isLoggedIn = (hasJiraInterface || hasIssuesNav || hasDashboard) && 
                                  noLoginElements && 
                                  !bodyText.includes('sign in') && 
                                  !bodyText.includes('log in') &&
                                  !url.includes('login');
                
                return {
                    url: url.substring(0, 80) + '...',
                    title,
                    isLoggedIn,
                    hasJiraInterface,
                    hasIssuesNav,
                    hasDashboard,
                    noLoginElements,
                    bodyTextLength: bodyText.length,
                    containsLogin: bodyText.includes('sign in') || bodyText.includes('log in')
                };
            });
            
            console.log(`   📍 URL: ${pageState.url}`);
            console.log(`   📋 Title: ${pageState.title}`);
            console.log(`   🏠 Has JIRA Interface: ${pageState.hasJiraInterface ? '✅' : '❌'}`);
            console.log(`   🔗 Has Issues Nav: ${pageState.hasIssuesNav ? '✅' : '❌'}`);
            console.log(`   📊 Has Dashboard: ${pageState.hasDashboard ? '✅' : '❌'}`);
            console.log(`   🚫 No Login Elements: ${pageState.noLoginElements ? '✅' : '❌'}`);
            console.log(`   🔐 Login Status: ${pageState.isLoggedIn ? '✅ LOGGED IN' : '❌ NOT LOGGED IN'}`);
            
            if (pageState.isLoggedIn) {
                isLoggedIn = true;
                console.log('\n🎉 LOGIN DETECTED! Proceeding with ticket extraction...');
                
                // Save session
                const cookies = await context.cookies();
                fs.writeFileSync('uat-jira-session.json', JSON.stringify({
                    cookies,
                    timestamp: new Date().toISOString()
                }, null, 2));
                console.log('💾 Session saved for future use');
                break;
            }
            
            await page.waitForTimeout(5000);
        }
        
        if (!isLoggedIn) {
            console.log('\n❌ Login timeout - please try again');
            return;
        }
        
        console.log('\n🎯 TICKET EXTRACTION PHASE');
        console.log('================================================================================');
        
        // Try multiple approaches to find tickets
        const ticketSearchApproaches = [
            {
                name: 'Recent Issues JQL',
                url: 'https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC'
            },
            {
                name: 'All Issues JQL',
                url: 'https://jirauat.smedigitalapps.com/jira/issues/?jql='
            },
            {
                name: 'Issue Navigator',
                url: 'https://jirauat.smedigitalapps.com/jira/secure/IssueNavigator.jspa'
            },
            {
                name: 'Updated Recently',
                url: 'https://jirauat.smedigitalapps.com/jira/issues/?jql=updated%20%3E%3D%20-30d%20ORDER%20BY%20updated%20DESC'
            }
        ];
        
        let allTickets = [];
        let allProjects = new Set();
        
        for (const approach of ticketSearchApproaches) {
            console.log(`\n🔍 Trying: ${approach.name}`);
            console.log(`   📋 URL: ${approach.url}`);
            
            await page.goto(approach.url);
            await page.waitForTimeout(4000);
            
            const extractionResult = await page.evaluate(() => {
                // Multiple selectors to try
                const ticketSelectors = [
                    'tr[data-issuekey]',
                    '.issue-table tbody tr',
                    '.navigator-issue-only',
                    '.issue-list .issue',
                    '[data-issue-key]'
                ];
                
                let tickets = [];
                let usedSelector = '';
                
                // Try each selector until we find tickets
                for (const selector of ticketSelectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        usedSelector = selector;
                        console.log(`Found ${elements.length} elements with selector: ${selector}`);
                        
                        elements.forEach(element => {
                            // Try different ways to get the ticket key
                            let key = element.getAttribute('data-issuekey') || 
                                     element.getAttribute('data-issue-key') ||
                                     element.querySelector('.issuekey, .issue-link')?.textContent?.trim();
                            
                            if (key) {
                                const ticket = {
                                    key,
                                    project: key.split('-')[0],
                                    summary: element.querySelector('.summary a, .issue-link-summary, h3 a')?.textContent?.trim() || '',
                                    status: element.querySelector('.status span, .issue-status')?.textContent?.trim() || '',
                                    assignee: element.querySelector('.assignee, .issue-assignee')?.textContent?.trim() || '',
                                    reporter: element.querySelector('.reporter, .issue-reporter')?.textContent?.trim() || '',
                                    created: element.querySelector('.created, .issue-created')?.textContent?.trim() || '',
                                    updated: element.querySelector('.updated, .issue-updated')?.textContent?.trim() || '',
                                    priority: element.querySelector('.priority, .issue-priority')?.textContent?.trim() || ''
                                };
                                
                                tickets.push(ticket);
                            }
                        });
                        break;
                    }
                }
                
                // Also look for any issue keys in the page text
                const bodyText = document.body?.textContent || '';
                const issueKeyPattern = /[A-Z]{2,10}-\d+/g;
                const issueKeysInText = [...new Set(bodyText.match(issueKeyPattern) || [])];
                
                // Get page info
                const pagingInfo = document.querySelector('.results-count, .showing, .search-results-count')?.textContent?.trim() || '';
                const pageTitle = document.title;
                const currentUrl = window.location.href;
                
                return {
                    tickets,
                    usedSelector,
                    selectorResults: ticketSelectors.map(sel => ({
                        selector: sel,
                        count: document.querySelectorAll(sel).length
                    })),
                    issueKeysInText: issueKeysInText.slice(0, 10),
                    pagingInfo,
                    pageTitle,
                    currentUrl
                };
            });
            
            console.log(`   📊 Page Title: ${extractionResult.pageTitle}`);
            console.log(`   📊 Paging Info: ${extractionResult.pagingInfo || 'None'}`);
            console.log(`   📦 Tickets Found: ${extractionResult.tickets.length}`);
            console.log(`   🎯 Used Selector: ${extractionResult.usedSelector || 'None'}`);
            
            if (extractionResult.issueKeysInText.length > 0) {
                console.log(`   🔍 Issue Keys in Text: ${extractionResult.issueKeysInText.join(', ')}`);
            }
            
            // Show selector results for debugging
            console.log('   🔧 Selector Results:');
            extractionResult.selectorResults.forEach(result => {
                if (result.count > 0) {
                    console.log(`      ${result.selector}: ${result.count} elements`);
                }
            });
            
            if (extractionResult.tickets.length > 0) {
                console.log('   ✅ SUCCESS - Found tickets with this approach!');
                allTickets.push(...extractionResult.tickets);
                extractionResult.tickets.forEach(ticket => allProjects.add(ticket.project));
                
                // Show sample tickets
                console.log('   📋 Sample tickets:');
                extractionResult.tickets.slice(0, 3).forEach(ticket => {
                    console.log(`      - ${ticket.key}: ${ticket.summary.substring(0, 60)}...`);
                });
            } else {
                console.log('   ❌ No tickets found with this approach');
            }
        }
        
        console.log('\n📊 FINAL RESULTS:');
        console.log(`   🎫 Total Tickets: ${allTickets.length}`);
        console.log(`   🏗️ Projects: ${Array.from(allProjects).join(', ')}`);
        
        if (allTickets.length > 0) {
            // Remove duplicates
            const uniqueTickets = allTickets.filter((ticket, index, self) => 
                index === self.findIndex(t => t.key === ticket.key)
            );
            
            console.log(`   🔄 Unique Tickets: ${uniqueTickets.length}`);
            
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-interactive-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_INTERACTIVE',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: Array.from(allProjects),
                totalTickets: uniqueTickets.length,
                tickets: uniqueTickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase
            if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
                console.log('\n📤 Storing in Supabase...');
                
                const supabase = createClient(
                    'https://kfxetwuuzljhybfgmpuc.supabase.co',
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                
                const uatTickets = uniqueTickets.map(ticket => ({
                    external_id: `UAT-${ticket.key}`,
                    title: `[UAT] ${ticket.summary}`,
                    status: ticket.status,
                    priority: ticket.priority,
                    metadata: {
                        environment: 'UAT',
                        purpose: 'JIRA_UPGRADE_TESTING_INTERACTIVE',
                        original_key: ticket.key,
                        project: ticket.project,
                        assignee: ticket.assignee,
                        reporter: ticket.reporter,
                        created: ticket.created,
                        updated: ticket.updated,
                        source: 'interactive-uat-scraper',
                        is_temporary: true,
                        extraction_date: new Date().toISOString()
                    }
                }));
                
                for (let i = 0; i < uatTickets.length; i += 50) {
                    const batch = uatTickets.slice(i, i + 50);
                    const { error } = await supabase.from('jira_tickets').upsert(batch);
                    
                    if (error) {
                        console.error(`❌ Batch ${Math.floor(i/50) + 1} error:`, error);
                    } else {
                        console.log(`✅ Stored batch ${Math.floor(i/50) + 1}: ${batch.length} tickets`);
                    }
                }
                
                console.log(`🎉 Successfully stored ${uniqueTickets.length} UAT tickets!`);
            } else {
                console.log('⚠️  No Supabase key - skipping database storage');
            }
            
        } else {
            console.log('\n❌ No tickets found in UAT environment');
            console.log('💡 This could mean:');
            console.log('   - Different page structure than expected');
            console.log('   - Need to search specific projects');
            console.log('   - Permission issues');
            console.log('   - Different ticket display format');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Browser will stay open for 30 seconds for inspection...');
        await page.waitForTimeout(30000);
        await browser.close();
    }
}

interactiveUATScraper();
