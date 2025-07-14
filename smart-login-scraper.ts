import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SESSION_FILE = 'uat-jira-session.json';

async function smartLoginAndScrape() {
    console.log('🧪 SMART LOGIN + UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🧠 Smart detection of different login screens');
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
        
        // Add non-intrusive bottom banner
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; bottom: 0; left: 0; right: 0; background: #2196F3;
                color: white; padding: 6px; text-align: center; font-weight: bold;
                z-index: 10000; font-size: 11px; border-top: 1px solid #1976D2;
            `;
            banner.textContent = '🤖 SMART LOGIN IN PROGRESS';
            document.body.appendChild(banner);
        });
        
        // Smart login flow - detect and handle different screens
        let loginSteps = 0;
        const maxSteps = 10;
        
        while (loginSteps < maxSteps) {
            loginSteps++;
            console.log(`\n🔍 Login Step ${loginSteps}: Analyzing current screen...`);
            
            await page.waitForTimeout(2000);
            
            const screenAnalysis = await page.evaluate(() => {
                const pageText = document.body.textContent?.toLowerCase() || '';
                const pageTitle = document.title.toLowerCase();
                
                // Detect screen type based on unique elements and text
                const screenTypes = {
                    // Screen 1: Initial username entry (simple JIRA login)
                    jiraUsername: {
                        detected: document.querySelector('input[placeholder*="Username" i], #login-form-username') !== null &&
                                 pageText.includes('enter your username'),
                        action: 'enter_username'
                    },
                    
                    // Screen 2: Microsoft/Azure AD email entry 
                    msftEmail: {
                        detected: (pageText.includes('sign in') && 
                                  (pageText.includes('sony music') || pageText.includes('someone@example.com'))) ||
                                 document.querySelector('input[type="email"], input[name*="email"]') !== null,
                        action: 'enter_email'
                    },
                    
                    // Screen 3: Password entry
                    password: {
                        detected: document.querySelector('input[type="password"]') !== null &&
                                 (pageText.includes('password') || pageText.includes('enter your password')),
                        action: 'enter_password'
                    },
                    
                    // Screen 4: 2FA/MFA
                    twoFA: {
                        detected: pageText.includes('verification') || pageText.includes('authenticator') ||
                                 pageText.includes('approve') || pageText.includes('phone') ||
                                 pageText.includes('text message') || pageText.includes('call'),
                        action: 'wait_for_2fa'
                    },
                    
                    // Screen 5: Certificate acceptance
                    certificate: {
                        detected: pageText.includes('certificate') || pageText.includes('security') ||
                                 pageText.includes('trust') || pageText.includes('accept'),
                        action: 'accept_certificate'
                    },
                    
                    // Screen 6: Successfully logged in
                    loggedIn: {
                        detected: (pageText.includes('dashboard') || pageTitle.includes('dashboard') ||
                                  document.querySelector('.dashboard, #dashboard') !== null ||
                                  window.location.href.includes('Dashboard.jspa')) &&
                                 document.querySelector('a[href*="login"]') === null,
                        action: 'complete'
                    }
                };
                
                // Find which screen we're on
                for (const [screenName, screen] of Object.entries(screenTypes)) {
                    if (screen.detected) {
                        return {
                            screenType: screenName,
                            action: screen.action,
                            pageTitle: document.title,
                            url: window.location.href
                        };
                    }
                }
                
                return {
                    screenType: 'unknown',
                    action: 'wait',
                    pageTitle: document.title,
                    url: window.location.href
                };
            });
            
            console.log(`   Screen Type: ${screenAnalysis.screenType}`);
            console.log(`   Action: ${screenAnalysis.action}`);
            console.log(`   Page: ${screenAnalysis.pageTitle}`);
            
            // Perform action based on detected screen
            switch (screenAnalysis.action) {
                case 'enter_username':
                    console.log('   🔤 Entering username: mcarpent');
                    try {
                        await page.fill('input[placeholder*="Username" i], #login-form-username, input[name*="user"], input[type="text"]', 'mcarpent');
                        await page.click('button:has-text("Continue"), button:has-text("Next"), input[type="submit"], button[type="submit"]');
                        console.log('   ✅ Username entered and submitted');
                    } catch (e) {
                        console.log('   ❌ Error entering username:', e);
                    }
                    break;
                    
                case 'enter_email':
                    console.log('   📧 Entering email: matt.carpenter.ext@sonymusic.com');
                    try {
                        // Clear any existing text first
                        await page.click('input[type="email"], input[name*="email"], input[placeholder*="example.com"], input[value*="someone@"]');
                        await page.keyboard.selectAll();
                        await page.keyboard.type('matt.carpenter.ext@sonymusic.com');
                        await page.click('button:has-text("Next"), button:has-text("Continue"), input[type="submit"]');
                        console.log('   ✅ Email entered and submitted');
                    } catch (e) {
                        console.log('   ❌ Error entering email:', e);
                    }
                    break;
                    
                case 'enter_password':
                    console.log('   🔒 Entering password');
                    try {
                        await page.fill('input[type="password"]', 'Dooley1_Jude2');
                        await page.click('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Submit"), input[type="submit"]');
                        console.log('   ✅ Password entered and submitted');
                    } catch (e) {
                        console.log('   ❌ Error entering password:', e);
                    }
                    break;
                    
                case 'wait_for_2fa':
                    console.log('   📱 2FA detected - please complete on your phone');
                    await page.evaluate(() => {
                        const banner = document.querySelector('div[style*="position: fixed"]');
                        if (banner) {
                            banner.style.background = '#FF9800';
                            banner.textContent = '📱 Please complete 2FA on your phone';
                        }
                    });
                    await page.waitForTimeout(10000); // Wait 10 seconds and check again
                    break;
                    
                case 'accept_certificate':
                    console.log('   🔐 Accepting certificate');
                    try {
                        await page.click('button:has-text("Accept"), button:has-text("Continue"), button:has-text("Yes"), input[type="submit"]');
                        console.log('   ✅ Certificate accepted');
                    } catch (e) {
                        console.log('   ❌ Error accepting certificate:', e);
                    }
                    break;
                    
                case 'complete':
                    console.log('   ✅ LOGIN SUCCESSFUL!');
                    
                    // Save session
                    const cookies = await page.context().cookies();
                    const sessionData = {
                        cookies,
                        timestamp: new Date().toISOString()
                    };
                    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
                    console.log('   💾 Session saved');
                    
                    // Exit login loop
                    loginSteps = maxSteps;
                    break;
                    
                default:
                    console.log('   ⏳ Waiting for next screen...');
                    await page.waitForTimeout(5000);
                    break;
            }
            
            if (loginSteps >= maxSteps) break;
        }
        
        // Update banner for scraping
        await page.evaluate(() => {
            const banner = document.querySelector('div[style*="position: fixed"]');
            if (banner) {
                banner.style.background = '#4CAF50';
                banner.textContent = '🧪 SCRAPING UAT TICKETS - ITSM & DPSA';
            }
        });
        
        console.log('\n🎯 Starting ITSM and DPSA ticket extraction...');
        
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
        
        console.log(`\n📊 EXTRACTION COMPLETE: ${allTickets.length} tickets`);
        
        if (allTickets.length > 0) {
            const itsmCount = allTickets.filter(t => t.project === 'ITSM').length;
            const dpsaCount = allTickets.filter(t => t.project === 'DPSA').length;
            
            console.log(`   ITSM: ${itsmCount} tickets`);
            console.log(`   DPSA: ${dpsaCount} tickets`);
            
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-smart-login-tickets-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_SMART_LOGIN',
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
                    purpose: 'JIRA_UPGRADE_TESTING_SMART_LOGIN',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'smart-login-scraper',
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
        
    } catch (error) {
        console.error('❌ Error during smart login:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 15 seconds for inspection...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

smartLoginAndScrape();
