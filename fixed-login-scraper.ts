import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SESSION_FILE = 'uat-jira-session.json';

async function fixedLoginAndScrape() {
    console.log('🧪 FIXED LOGIN + UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🎯 Fixed selectors to target correct login fields');
    console.log('📱 Will wait for 2FA completion');
    console.log('🎯 Target: ITSM and DPSA projects only');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Opening UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
        await page.waitForTimeout(3000);
        
        // Add small bottom banner
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; bottom: 0; left: 0; right: 0; background: #2196F3;
                color: white; padding: 4px; text-align: center; font-weight: bold;
                z-index: 10000; font-size: 10px;
            `;
            banner.textContent = '🤖 FIXED LOGIN SCRAPER';
            document.body.appendChild(banner);
        });
        
        let loginSteps = 0;
        const maxSteps = 15;
        
        while (loginSteps < maxSteps) {
            loginSteps++;
            console.log(`\n🔍 Step ${loginSteps}: Analyzing current screen...`);
            
            await page.waitForTimeout(2000);
            
            const screenInfo = await page.evaluate(() => {
                const pageText = document.body.textContent?.toLowerCase() || '';
                const pageTitle = document.title.toLowerCase();
                const url = window.location.href;
                
                // More specific detection of login fields
                const loginFormUsername = document.querySelector('input[placeholder="Username"], input[placeholder="username"]');
                const loginFormEmail = document.querySelector('input[type="email"]');
                const loginFormPassword = document.querySelector('input[type="password"]');
                const continueButton = document.querySelector('button:has-text("Continue"), .button:has-text("Continue")');
                const nextButton = document.querySelector('button:has-text("Next"), .button:has-text("Next")');
                
                // Check for successful login
                const isLoggedIn = (url.includes('Dashboard.jspa') || pageText.includes('dashboard')) &&
                                  !pageText.includes('log in') && !pageText.includes('sign in');
                
                // Determine screen type
                let screenType = 'unknown';
                let action = 'wait';
                
                if (isLoggedIn) {
                    screenType = 'logged_in';
                    action = 'complete';
                } else if (loginFormUsername && pageText.includes('enter your username')) {
                    screenType = 'jira_username';
                    action = 'enter_username';
                } else if (loginFormEmail || (pageText.includes('sign in') && pageText.includes('sony music'))) {
                    screenType = 'microsoft_email';
                    action = 'enter_email';
                } else if (loginFormPassword) {
                    screenType = 'password';
                    action = 'enter_password';
                } else if (pageText.includes('verification') || pageText.includes('approve') || pageText.includes('authenticator')) {
                    screenType = 'two_factor';
                    action = 'wait_for_2fa';
                } else if (pageText.includes('certificate') || pageText.includes('accept')) {
                    screenType = 'certificate';
                    action = 'accept_cert';
                }
                
                return {
                    screenType,
                    action,
                    pageTitle: document.title,
                    url,
                    hasUsernameField: !!loginFormUsername,
                    hasEmailField: !!loginFormEmail,
                    hasPasswordField: !!loginFormPassword,
                    hasContinueButton: !!continueButton,
                    hasNextButton: !!nextButton
                };
            });
            
            console.log(`   Screen: ${screenInfo.screenType}`);
            console.log(`   Action: ${screenInfo.action}`);
            console.log(`   Page: ${screenInfo.pageTitle}`);
            
            switch (screenInfo.action) {
                case 'enter_username':
                    console.log('   🔤 Entering username in login form...');
                    try {
                        // Clear search field first if it has our username
                        await page.evaluate(() => {
                            const searchField = document.querySelector('input[placeholder*="Search"], #quicksearch');
                            if (searchField && searchField.value === 'mcarpent') {
                                searchField.value = '';
                            }
                        });
                        
                        // Target the specific username field in login form
                        await page.fill('input[placeholder="Username"]', 'mcarpent');
                        console.log('   ✅ Username entered in correct field');
                        
                        // Click the Continue button
                        await page.click('button:has-text("Continue")');
                        console.log('   ✅ Continue button clicked');
                        
                    } catch (e) {
                        console.log('   ❌ Error with username entry:', e);
                    }
                    break;
                    
                case 'enter_email':
                    console.log('   📧 Entering email...');
                    try {
                        // Look for email field and clear any existing value
                        const emailField = await page.$('input[type="email"]');
                        if (emailField) {
                            await emailField.click();
                            await page.keyboard.selectAll();
                            await page.keyboard.type('matt.carpenter.ext@sonymusic.com');
                            await page.click('button:has-text("Next"), button:has-text("Continue")');
                            console.log('   ✅ Email entered and submitted');
                        }
                    } catch (e) {
                        console.log('   ❌ Error with email entry:', e);
                    }
                    break;
                    
                case 'enter_password':
                    console.log('   🔒 Entering password...');
                    try {
                        await page.fill('input[type="password"]', 'Dooley1_Jude2');
                        await page.click('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Submit")');
                        console.log('   ✅ Password entered and submitted');
                    } catch (e) {
                        console.log('   ❌ Error with password entry:', e);
                    }
                    break;
                    
                case 'wait_for_2fa':
                    console.log('   📱 Waiting for 2FA completion...');
                    await page.evaluate(() => {
                        const banner = document.querySelector('div[style*="position: fixed"]');
                        if (banner) {
                            banner.style.background = '#FF9800';
                            banner.textContent = '📱 Complete 2FA on your phone';
                        }
                    });
                    await page.waitForTimeout(10000);
                    break;
                    
                case 'accept_cert':
                    console.log('   🔐 Accepting certificate...');
                    try {
                        await page.click('button:has-text("Accept"), button:has-text("Continue"), button:has-text("Yes")');
                        console.log('   ✅ Certificate accepted');
                    } catch (e) {
                        console.log('   ❌ Error accepting certificate:', e);
                    }
                    break;
                    
                case 'complete':
                    console.log('   ✅ LOGIN SUCCESSFUL!');
                    
                    // Save session
                    const cookies = await page.context().cookies();
                    fs.writeFileSync(SESSION_FILE, JSON.stringify({
                        cookies,
                        timestamp: new Date().toISOString()
                    }, null, 2));
                    console.log('   💾 Session saved');
                    
                    loginSteps = maxSteps; // Exit loop
                    break;
                    
                default:
                    console.log('   ⏳ Unknown screen, waiting...');
                    await page.waitForTimeout(5000);
                    break;
            }
        }
        
        if (loginSteps >= maxSteps) {
            console.log('\n🎯 Proceeding to ticket extraction...');
            
            // Update banner
            await page.evaluate(() => {
                const banner = document.querySelector('div[style*="position: fixed"]');
                if (banner) {
                    banner.style.background = '#4CAF50';
                    banner.textContent = '🧪 EXTRACTING ITSM & DPSA TICKETS';
                }
            });
            
            const allTickets: any[] = [];
            const targetProjects = ['ITSM', 'DPSA'];
            
            for (const project of targetProjects) {
                console.log(`\n📊 Scraping ${project} project...`);
                
                const url = `https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
                await page.goto(url);
                await page.waitForTimeout(4000);
                
                const projectInfo = await page.evaluate(() => {
                    const errorElement = document.querySelector('.error, .aui-message-error');
                    const errorText = errorElement?.textContent?.trim();
                    
                    if (errorText && errorText.includes('does not exist')) {
                        return { error: errorText, tickets: [], total: 0 };
                    }
                    
                    const pagingElement = document.querySelector('.showing, .results-count-total');
                    const pagingText = pagingElement?.textContent || '';
                    const totalMatch = pagingText.match(/of (\d+)/) || pagingText.match(/(\d+) total/);
                    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
                    
                    const ticketRows = document.querySelectorAll('tr[data-issuekey]');
                    const tickets = [];
                    
                    ticketRows.forEach(row => {
                        const key = row.getAttribute('data-issuekey');
                        if (key) {
                            const summary = row.querySelector('.summary a')?.textContent?.trim();
                            const status = row.querySelector('.status')?.textContent?.trim();
                            const assignee = row.querySelector('.assignee')?.textContent?.trim();
                            const reporter = row.querySelector('.reporter')?.textContent?.trim();
                            const created = row.querySelector('.created')?.textContent?.trim();
                            const updated = row.querySelector('.updated')?.textContent?.trim();
                            const priority = row.querySelector('.priority')?.textContent?.trim();
                            
                            tickets.push({
                                key, summary, status, assignee, reporter, created, updated, priority
                            });
                        }
                    });
                    
                    return { tickets, total, pagingText };
                });
                
                if (projectInfo.error) {
                    console.log(`   ❌ ${project}: ${projectInfo.error}`);
                    continue;
                }
                
                console.log(`   ✅ ${project}: Found ${projectInfo.total} total tickets`);
                console.log(`   📦 Extracted ${projectInfo.tickets.length} tickets`);
                
                projectInfo.tickets.forEach((ticket: any) => {
                    ticket.project = project;
                    allTickets.push(ticket);
                });
            }
            
            console.log(`\n📊 FINAL RESULT: ${allTickets.length} tickets extracted`);
            
            if (allTickets.length > 0) {
                const itsmCount = allTickets.filter(t => t.project === 'ITSM').length;
                const dpsaCount = allTickets.filter(t => t.project === 'DPSA').length;
                
                console.log(`   ITSM: ${itsmCount} tickets`);
                console.log(`   DPSA: ${dpsaCount} tickets`);
                
                // Save and store
                const timestamp = new Date().toISOString().split('T')[0];
                const filename = `uat-fixed-login-tickets-${timestamp}.json`;
                
                fs.writeFileSync(filename, JSON.stringify({
                    environment: 'UAT_FIXED_LOGIN',
                    url: 'https://jirauat.smedigitalapps.com',
                    timestamp: new Date().toISOString(),
                    totalTickets: allTickets.length,
                    breakdown: { ITSM: itsmCount, DPSA: dpsaCount },
                    tickets: allTickets
                }, null, 2));
                
                console.log(`💾 Saved to: ${filename}`);
                
                // Store in Supabase
                const supabase = createClient(
                    'https://kfxetwuuzljhybfgmpuc.supabase.co',
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );
                
                const supabaseTickets = allTickets.map(ticket => ({
                    external_id: `UAT-${ticket.key}`,
                    title: `[UAT] ${ticket.summary}`,
                    status: ticket.status,
                    priority: ticket.priority,
                    metadata: {
                        environment: 'UAT',
                        purpose: 'JIRA_UPGRADE_TESTING_FIXED_LOGIN',
                        original_key: ticket.key,
                        project: ticket.project,
                        assignee: ticket.assignee,
                        reporter: ticket.reporter,
                        created: ticket.created,
                        updated: ticket.updated,
                        source: 'fixed-login-scraper',
                        is_temporary: true,
                        cleanup_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    }
                }));
                
                console.log('📤 Storing in Supabase...');
                
                for (let i = 0; i < supabaseTickets.length; i += 100) {
                    const batch = supabaseTickets.slice(i, i + 100);
                    const { error } = await supabase.from('jira_tickets').upsert(batch);
                    
                    if (error) {
                        console.error(`❌ Batch ${Math.floor(i/100) + 1} error:`, error);
                    } else {
                        console.log(`✅ Stored batch ${Math.floor(i/100) + 1}: ${batch.length} tickets`);
                    }
                }
                
                console.log(`\n🎉 SUCCESS: ${allTickets.length} UAT tickets extracted and stored!`);
                
            } else {
                console.log('❌ No ITSM or DPSA tickets found in UAT environment');
            }
        }
        
    } catch (error) {
        console.error('❌ Error during login:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

fixedLoginAndScrape();
