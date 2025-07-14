import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SESSION_FILE = 'uat-jira-session.json';

async function autoLoginAndScrape() {
    console.log('🧪 AUTOMATIC LOGIN + UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🔐 Will automatically handle login process');
    console.log('📱 Will wait for 2FA completion');
    console.log('🎯 Target: ITSM and DPSA projects only');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    
    // Accept any certificates automatically
    page.on('response', async response => {
        if (response.status() === 401 || response.url().includes('certificate')) {
            console.log('🔐 Certificate prompt detected - attempting to accept');
        }
    });
    
    try {
        console.log('🔗 Opening UAT JIRA login...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
        await page.waitForTimeout(3000);
        
        // Add bottom banner (non-intrusive)
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; bottom: 0; left: 0; right: 0; background: #2196F3;
                color: white; padding: 8px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 12px;
            `;
            banner.textContent = '🤖 AUTO-LOGIN IN PROGRESS - Please wait...';
            document.body.appendChild(banner);
        });
        
        console.log('🔍 Looking for username field...');
        
        // Wait for username field and fill it
        try {
            await page.waitForSelector('input[type="text"], input[name*="user"], input[placeholder*="username" i], input[placeholder*="Username" i]', { timeout: 10000 });
            
            // Try different username field selectors
            const usernameSelectors = [
                'input[placeholder*="Username" i]',
                'input[name*="user"]', 
                'input[type="text"]',
                '#username',
                '#login-form-username'
            ];
            
            let usernameEntered = false;
            for (const selector of usernameSelectors) {
                try {
                    const field = await page.$(selector);
                    if (field) {
                        console.log(`✅ Found username field: ${selector}`);
                        await field.fill('mcarpent');
                        console.log('✅ Username entered: mcarpent');
                        usernameEntered = true;
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            if (!usernameEntered) {
                console.log('❌ Could not find username field');
                return;
            }
            
            // Click Continue/Next button
            const continueSelectors = [
                'button:has-text("Continue")',
                'button:has-text("Next")',
                'input[type="submit"]',
                'button[type="submit"]',
                '.button-primary'
            ];
            
            let buttonClicked = false;
            for (const selector of continueSelectors) {
                try {
                    const button = await page.$(selector);
                    if (button) {
                        console.log(`✅ Clicking: ${selector}`);
                        await button.click();
                        buttonClicked = true;
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            if (!buttonClicked) {
                console.log('⚠️ Could not find Continue button, pressing Enter');
                await page.keyboard.press('Enter');
            }
            
            await page.waitForTimeout(3000);
            
        } catch (error) {
            console.log('❌ Error with username step:', error);
        }
        
        // Look for email field (might be next step)
        console.log('🔍 Looking for email or password field...');
        await page.waitForTimeout(2000);
        
        try {
            // Check if email field appears
            const emailField = await page.$('input[type="email"], input[name*="email"], input[placeholder*="email" i]');
            if (emailField) {
                console.log('✅ Found email field');
                await emailField.fill('matt.carpenter.ext@sonymusic.com');
                console.log('✅ Email entered');
                
                // Click continue
                await page.click('button:has-text("Continue"), button:has-text("Next"), input[type="submit"]');
                await page.waitForTimeout(3000);
            }
        } catch (e) {
            console.log('📧 No email field found, proceeding...');
        }
        
        // Look for password field
        try {
            const passwordField = await page.$('input[type="password"], input[name*="password"], input[placeholder*="password" i]');
            if (passwordField) {
                console.log('✅ Found password field');
                await passwordField.fill('Dooley1_Jude2');
                console.log('✅ Password entered');
                
                // Submit password
                await page.click('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Continue"), input[type="submit"]');
                await page.waitForTimeout(3000);
            }
        } catch (e) {
            console.log('🔒 No password field found yet...');
        }
        
        // Update banner for 2FA
        await page.evaluate(() => {
            const banner = document.querySelector('div[style*="position: fixed"]');
            if (banner) {
                banner.style.background = '#FF9800';
                banner.textContent = '📱 Please complete 2FA on your phone - Waiting...';
            }
        });
        
        console.log('\n📱 2FA REQUIRED');
        console.log('   Please check your phone for 2FA prompt');
        console.log('   Complete the authentication');
        console.log('   Accept any certificate prompts');
        console.log('   Waiting for successful login...');
        
        // Wait for successful login (check every 5 seconds for up to 5 minutes)
        let loginAttempts = 0;
        const maxAttempts = 60; // 5 minutes
        
        while (loginAttempts < maxAttempts) {
            await page.waitForTimeout(5000);
            loginAttempts++;
            
            // Check if we're logged in by looking for JIRA dashboard elements
            const loginCheck = await page.evaluate(() => {
                const isDashboard = window.location.href.includes('Dashboard.jspa') || 
                                 document.title.includes('Dashboard') ||
                                 document.querySelector('.dashboard, #dashboard') !== null;
                
                const hasUserMenu = document.querySelector('#header-details-user-drop, .aui-dropdown2-trigger') !== null;
                const noLoginButton = document.querySelector('a[href*="login"]') === null;
                const noLoginForm = document.querySelector('#login-form-username') === null;
                
                return {
                    isLoggedIn: (isDashboard || hasUserMenu) && noLoginButton && noLoginForm,
                    currentUrl: window.location.href,
                    pageTitle: document.title
                };
            });
            
            if (loginCheck.isLoggedIn) {
                console.log(`\n✅ LOGIN SUCCESSFUL after ${loginAttempts * 5} seconds!`);
                console.log(`   Current page: ${loginCheck.pageTitle}`);
                
                // Save session
                const cookies = await page.context().cookies();
                const sessionData = {
                    cookies,
                    timestamp: new Date().toISOString()
                };
                
                fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
                console.log('💾 Session saved for future use');
                
                break;
            } else {
                console.log(`⏳ Still waiting for login completion... (${loginAttempts}/${maxAttempts})`);
                console.log(`   Current page: ${loginCheck.pageTitle}`);
            }
        }
        
        if (loginAttempts >= maxAttempts) {
            console.log('❌ Login timeout after 5 minutes');
            return;
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
            console.log(`   📦 Extracted ${projectInfo.tickets.length} tickets from page 1`);
            
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
            const filename = `uat-auto-login-tickets-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_AUTO_LOGIN',
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
                    purpose: 'JIRA_UPGRADE_TESTING_AUTO_LOGIN',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'auto-login-scraper',
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
            console.log('💾 Session saved - future runs will be faster');
            
        } else {
            console.log('❌ No ITSM or DPSA tickets found in UAT environment');
        }
        
    } catch (error) {
        console.error('❌ Error during auto-login:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 15 seconds for inspection...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

autoLoginAndScrape();
