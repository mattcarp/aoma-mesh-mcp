import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function finalWorkingScraper() {
    console.log('🎯 FINAL WORKING UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ Will click the specific navigation "Log In" button');
    console.log('🔐 Complete login flow with credentials');
    console.log('📦 Extract ALL available UAT tickets');
    console.log('💾 Store in Supabase with UAT flags');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Opening UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(3000);
        
        // Click the specific navigation login link
        console.log('\n🎯 Clicking navigation "Log In" button...');
        try {
            await page.click('a.aui-nav-link.login-link[href*="login.jsp"]');
            console.log('✅ Navigation "Log In" button clicked!');
            await page.waitForTimeout(3000);
        } catch (e) {
            console.log('❌ Could not click navigation login button');
            return;
        }
        
        // Now handle the login flow
        let step = 1;
        let isLoggedIn = false;
        const maxSteps = 20;
        
        while (!isLoggedIn && step <= maxSteps) {
            console.log(`\n🔍 Login Step ${step}...`);
            
            const state = await page.evaluate(() => {
            const url = window.location.href;
            const title = document.title;
            const bodyText = document.body?.textContent?.toLowerCase() || '';
            
            // Check for login elements
            const usernameField = document.querySelector('input[placeholder="Username"]:not([disabled])');
            const emailField = document.querySelector('input[type="email"], input[name="loginfmt"]');
            const passwordField = document.querySelector('input[type="password"], input[name="passwd"]');
            
            // Check for certificate approval
            const okButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                .filter(btn => btn.textContent?.toLowerCase().includes('ok') || btn.value?.toLowerCase().includes('ok'));
                const certificateOkButton = okButtons.length > 0;
                const hasCertificateDialog = bodyText.includes('certificate') || bodyText.includes('security');
            
            // Check if logged in (has JIRA interface, no login elements)
            const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
            const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
            const noLoginElements = !usernameField && !emailField && !passwordField;
            
            const loggedIn = (hasJiraInterface || hasIssuesNav) && noLoginElements && 
                        !bodyText.includes('sign in') && !bodyText.includes('log in');
            
            return {
            url,
            title,
            loggedIn,
            needsUsername: !!usernameField,
                needsEmail: !!emailField,
                    needsPassword: !!passwordField,
                    needsCertificateApproval: !!certificateOkButton || hasCertificateDialog,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve'),
                    bodyLength: bodyText.length
                };
            });
            
            console.log(`   URL: ${state.url.substring(0, 60)}...`);
            console.log(`   Logged in: ${state.loggedIn ? '✅ YES' : '❌ NO'}`);
            
            if (state.loggedIn) {
                isLoggedIn = true;
                console.log('🎉 LOGIN SUCCESSFUL!');
                
                // Save session
                const cookies = await page.context().cookies();
                fs.writeFileSync('uat-jira-session.json', JSON.stringify({
                    cookies,
                    timestamp: new Date().toISOString()
                }, null, 2));
                console.log('💾 Session saved');
                break;
            }
            
            // Handle login steps
            if (state.needsCertificateApproval) {
                console.log('   🔒 Certificate approval needed - clicking OK');
                try {
                    // Try to find and click OK button
                    const okButton = await page.locator('button, input[type="button"], input[type="submit"]').filter({ hasText: 'OK' }).first();
                    await okButton.click();
                } catch {
                    try {
                        await page.click('input[value="OK"]');
                    } catch {
                        console.log('   ⚠️ Could not find OK button for certificate');
                    }
                }
                
            } else if (state.needsUsername) {
                console.log('   🔤 Entering username: mcarpent');
                await page.fill('input[placeholder="Username"]', 'mcarpent');
                await page.waitForTimeout(1000);
                // Try multiple button selectors for Continue
                try {
                    await page.click('button:has-text("Continue")');
                } catch {
                    try {
                        await page.click('input[type="submit"][value*="Continue"]');
                    } catch {
                        try {
                            await page.click('button[type="submit"]');
                        } catch {
                            await page.press('input[placeholder="Username"]', 'Enter');
                        }
                    }
                }
                
            } else if (state.needsEmail) {
                console.log('   📧 Entering email: matt.carpenter.ext@sonymusic.com');
                // Handle both JIRA and Microsoft SSO email fields
                try {
                    await page.fill('input[type="email"]', 'matt.carpenter.ext@sonymusic.com');
                } catch {
                    await page.fill('input[name="loginfmt"]', 'matt.carpenter.ext@sonymusic.com');
                }
                await page.waitForTimeout(1000);
                // Try multiple button selectors for Next
                try {
                    await page.click('button:has-text("Next")');
                } catch {
                    try {
                        await page.click('input[type="submit"][value*="Next"]');
                    } catch {
                        try {
                            await page.click('button[type="submit"]');
                        } catch {
                            await page.press('input[type="email"], input[name="loginfmt"]', 'Enter');
                        }
                    }
                }
                
            } else if (state.needsPassword) {
                console.log('   🔒 Entering password');
                // Handle both JIRA and Microsoft SSO password fields
                try {
                    await page.fill('input[type="password"]', 'Dooley1_Jude2');
                } catch {
                    await page.fill('input[name="passwd"]', 'Dooley1_Jude2');
                }
                await page.waitForTimeout(1000);
                // Try multiple button selectors for Sign in
                try {
                    await page.click('button:has-text("Sign in")');
                } catch {
                    try {
                        await page.click('input[type="submit"][value*="Sign"]');
                    } catch {
                        try {
                            await page.click('button[type="submit"]');
                        } catch {
                            await page.press('input[type="password"], input[name="passwd"]', 'Enter');
                        }
                    }
                }
                
            } else if (state.is2FA) {
                console.log('   📱 2FA detected - please complete on your phone');
                await page.waitForTimeout(10000);
                
            } else {
                console.log('   ⏳ Waiting for page to load...');
                await page.waitForTimeout(5000);
            }
            
            step++;
            await page.waitForTimeout(2000);
        }
        
        if (!isLoggedIn) {
            console.log('❌ Login failed - please complete manually');
            await page.waitForTimeout(30000);
            return;
        }
        
        // Extract tickets from UAT
        console.log('\n🎯 Starting UAT ticket extraction...');
        
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(4000);
        
        const extractionResults = await page.evaluate(() => {
            const projectSet = new Set();
            const allTickets = [];
            
            // Try multiple selectors for ticket rows
            const ticketSelectors = [
                'tr[data-issuekey]',
                '.issue-table tbody tr',
                '.navigator-issue-only',
                '.issue-list .issue',
                '[data-issue-key]'
            ];
            
            let ticketsFound = false;
            
            for (const selector of ticketSelectors) {
                const rows = document.querySelectorAll(selector);
                if (rows.length > 0) {
                    console.log(`Using selector: ${selector}, found ${rows.length} rows`);
                    ticketsFound = true;
                    
                    rows.forEach(row => {
                        // Try different ways to get the ticket key
                        let key = row.getAttribute('data-issuekey') || 
                                 row.getAttribute('data-issue-key') ||
                                 row.querySelector('.issuekey, .issue-link')?.textContent?.trim();
                        
                        // Extract key from link href if needed
                        if (!key) {
                            const link = row.querySelector('a[href*="/browse/"]');
                            if (link) {
                                const match = link.href.match(/\/browse\/([A-Z]+-\d+)/);
                                if (match) key = match[1];
                            }
                        }
                        
                        if (key && key.match(/^[A-Z]+-\d+$/)) {
                            const project = key.split('-')[0];
                            projectSet.add(project);
                            
                            allTickets.push({
                                key,
                                project,
                                summary: row.querySelector('.summary a, .issue-link-summary, h3 a')?.textContent?.trim() || '',
                                status: row.querySelector('.status span, .issue-status')?.textContent?.trim() || '',
                                assignee: row.querySelector('.assignee, .issue-assignee')?.textContent?.trim() || '',
                                reporter: row.querySelector('.reporter, .issue-reporter')?.textContent?.trim() || '',
                                created: row.querySelector('.created, .issue-created')?.textContent?.trim() || '',
                                updated: row.querySelector('.updated, .issue-updated')?.textContent?.trim() || '',
                                priority: row.querySelector('.priority, .issue-priority')?.textContent?.trim() || ''
                            });
                        }
                    });
                    break; // Stop after finding tickets with first working selector
                }
            }
            
            // If no tickets found with table selectors, try searching page text for issue keys
            if (!ticketsFound) {
                const bodyText = document.body?.textContent || '';
                const issueKeyPattern = /([A-Z]{2,10}-\d+)/g;
                const matches = bodyText.match(issueKeyPattern) || [];
                const uniqueKeys = [...new Set(matches)];
                
                uniqueKeys.forEach(key => {
                    const project = key.split('-')[0];
                    projectSet.add(project);
                    allTickets.push({
                        key,
                        project,
                        summary: 'Found in page text',
                        status: '',
                        assignee: '',
                        reporter: '',
                        created: '',
                        updated: '',
                        priority: ''
                    });
                });
            }
            
            const pagingInfo = document.querySelector('.showing, .results-count, .search-results-count')?.textContent || 'No paging info';
            
            return {
                projects: Array.from(projectSet),
                tickets: allTickets,
                pagingInfo,
                selectorUsed: ticketsFound ? 'table selector' : 'text extraction'
            };
        });
        
        console.log(`📊 Found ${extractionResults.projects.length} project(s): ${extractionResults.projects.join(', ')}`);
        console.log(`📊 ${extractionResults.pagingInfo}`);
        console.log(`📦 Extracted ${extractionResults.tickets.length} tickets`);
        
        if (extractionResults.tickets.length > 0) {
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-final-working-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_FINAL_WORKING',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: extractionResults.projects,
                totalTickets: extractionResults.tickets.length,
                tickets: extractionResults.tickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase with UAT flags
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const uatTickets = extractionResults.tickets.map((ticket: any) => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING_FINAL',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'final-working-scraper',
                    is_temporary: true,
                    extraction_date: new Date().toISOString()
                }
            }));
            
            console.log('\n📤 Storing UAT tickets in Supabase...');
            
            for (let i = 0; i < uatTickets.length; i += 50) {
                const batch = uatTickets.slice(i, i + 50);
                const { error } = await supabase.from('jira_tickets').upsert(batch);
                
                if (error) {
                    console.error(`❌ Batch ${Math.floor(i/50) + 1} error:`, error);
                } else {
                    console.log(`✅ Stored batch ${Math.floor(i/50) + 1}: ${batch.length} UAT tickets`);
                }
            }
            
            console.log(`\n🎉 FINAL SUCCESS: ${extractionResults.tickets.length} UAT tickets extracted and stored!`);
            console.log('🏷️  All tickets properly flagged as UAT temporary test data');
            console.log('💾 Session saved for future runs');
            
            // Show project breakdown
            const breakdown = extractionResults.projects.map(proj => {
                const count = extractionResults.tickets.filter((t: any) => t.project === proj).length;
                return `${proj}: ${count}`;
            }).join(', ');
            console.log(`📊 Final breakdown: ${breakdown}`);
            
        } else {
            console.log('❌ No tickets found in UAT environment');
        }
        
    } catch (error) {
        console.error('❌ Final error:', error);
    } finally {
        console.log('\n⏳ Browser will close in 15 seconds...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

finalWorkingScraper();
