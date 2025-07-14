import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function checkLoginThenScrape() {
    console.log('🧪 UAT LOGIN CHECK + ITSM/DPSA SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🔐 Will check for login button in upper right');
    console.log('🎯 ONLY extracting ITSM and DPSA projects');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('🔗 Navigating to UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/');
        await page.waitForTimeout(5000);
        
        // Check for login status by looking for login button in upper right
        console.log('🔍 Checking login status...');
        const loginStatus = await page.evaluate(() => {
            // Look for login button in upper right
            const loginButton = document.querySelector('#header .aui-nav a[href*="login"], #header-details-user a[href*="login"], .login-link, a[href*="login.jsp"]');
            const loginText = document.body.textContent?.includes('Log In') || document.body.textContent?.includes('Log in');
            const hasLoginForm = document.querySelector('#login-form-username') !== null;
            
            // Look for user dropdown or profile indicator (means logged in)
            const userMenu = document.querySelector('#header-details-user-drop, .aui-dropdown2-trigger, #user-options');
            const userProfile = document.querySelector('#header-details-user');
            
            return {
                hasLoginButton: !!loginButton,
                hasLoginText: loginText,
                hasLoginForm: hasLoginForm,
                hasUserMenu: !!userMenu,
                hasUserProfile: !!userProfile,
                pageTitle: document.title,
                url: window.location.href,
                loginButtonText: loginButton?.textContent?.trim()
            };
        });
        
        console.log('📊 LOGIN STATUS CHECK:');
        console.log(`   Page title: ${loginStatus.pageTitle}`);
        console.log(`   Has login button: ${loginStatus.hasLoginButton ? '❌ Yes' : '✅ No'}`);
        console.log(`   Has login form: ${loginStatus.hasLoginForm ? '❌ Yes' : '✅ No'}`);
        console.log(`   Has user menu: ${loginStatus.hasUserMenu ? '✅ Yes' : '❌ No'}`);
        console.log(`   Has user profile: ${loginStatus.hasUserProfile ? '✅ Yes' : '❌ No'}`);
        
        if (loginStatus.loginButtonText) {
            console.log(`   Login button text: "${loginStatus.loginButtonText}"`);
        }
        
        const isLoggedIn = !loginStatus.hasLoginButton && !loginStatus.hasLoginForm && !loginStatus.hasLoginText && (loginStatus.hasUserMenu || loginStatus.hasUserProfile);
        
        if (!isLoggedIn) {
            console.log('\n❌ NOT LOGGED IN');
            console.log('🔐 Please log in manually in the browser window');
            console.log('⏳ Waiting 60 seconds for you to log in...');
            
            // Add login prompt banner
            await page.evaluate(() => {
                const banner = document.createElement('div');
                banner.style.cssText = `
                    position: fixed; top: 0; left: 0; right: 0; background: #f44336;
                    color: white; padding: 20px; text-align: center; font-weight: bold;
                    z-index: 9999; font-size: 20px; border-bottom: 3px solid #d32f2f;
                `;
                banner.textContent = '🔐 PLEASE LOG IN NOW - Scraper waiting for authentication';
                document.body.prepend(banner);
            });
            
            // Wait and check again
            await page.waitForTimeout(60000);
            
            // Recheck login status
            const recheckStatus = await page.evaluate(() => {
                const loginButton = document.querySelector('#header .aui-nav a[href*="login"], #header-details-user a[href*="login"], .login-link, a[href*="login.jsp"]');
                const userMenu = document.querySelector('#header-details-user-drop, .aui-dropdown2-trigger, #user-options');
                const userProfile = document.querySelector('#header-details-user');
                const hasLoginForm = document.querySelector('#login-form-username') !== null;
                
                return {
                    hasLoginButton: !!loginButton,
                    hasUserMenu: !!userMenu,
                    hasUserProfile: !!userProfile,
                    hasLoginForm: hasLoginForm
                };
            });
            
            const nowLoggedIn = !recheckStatus.hasLoginButton && !recheckStatus.hasLoginForm && (recheckStatus.hasUserMenu || recheckStatus.hasUserProfile);
            
            if (!nowLoggedIn) {
                console.log('❌ Still not logged in after 60 seconds. Exiting...');
                return;
            }
            
            console.log('✅ Login detected! Proceeding with scraping...');
        } else {
            console.log('\n✅ ALREADY LOGGED IN');
        }
        
        // Update banner for scraping
        await page.evaluate(() => {
            const banner = document.querySelector('div[style*="position: fixed"]') || document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; background: #4CAF50;
                color: white; padding: 15px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 18px;
            `;
            banner.textContent = '🧪 UAT SCRAPER RUNNING - EXTRACTING ITSM & DPSA TICKETS';
            if (!banner.parentNode) document.body.prepend(banner);
        });
        
        console.log('\n🎯 Starting ITSM and DPSA extraction...');
        
        const allTickets: any[] = [];
        const targetProjects = ['ITSM', 'DPSA'];
        
        for (const project of targetProjects) {
            console.log(`\n📊 Scraping ${project} project...`);
            
            const url = `https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
            await page.goto(url);
            await page.waitForTimeout(4000);
            
            const projectInfo = await page.evaluate(() => {
                // Check for project not found error
                const errorElement = document.querySelector('.error, .aui-message-error, .issue-navigator-results .error');
                const errorText = errorElement?.textContent?.trim();
                
                if (errorText && (errorText.includes('does not exist') || errorText.includes('not exist'))) {
                    return { error: errorText, tickets: [], total: 0 };
                }
                
                // Get ticket count
                const pagingElement = document.querySelector('.showing, .results-count-total, .navigator-title');
                const pagingText = pagingElement?.textContent || '';
                const totalMatch = pagingText.match(/of (\d+)/) || pagingText.match(/(\d+) total/) || pagingText.match(/(\d+) issues/);
                const total = totalMatch ? parseInt(totalMatch[1]) : 0;
                
                // Extract tickets
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
                
                return { tickets, total, pagingText, error: null };
            });
            
            if (projectInfo.error) {
                console.log(`   ❌ ${project}: ${projectInfo.error}`);
                continue;
            }
            
            console.log(`   ✅ ${project}: Found ${projectInfo.total} total tickets`);
            console.log(`   📦 Extracted ${projectInfo.tickets.length} tickets from page 1`);
            
            // Add to results
            projectInfo.tickets.forEach((ticket: any) => {
                ticket.project = project;
                allTickets.push(ticket);
            });
            
            // Get additional pages if needed
            const maxPages = Math.min(10, Math.ceil(Math.min(500, projectInfo.total) / 50));
            
            for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
                console.log(`   📄 Loading page ${pageNum}/${maxPages}...`);
                
                const pageUrl = `${url}&startIndex=${(pageNum - 1) * 50}`;
                await page.goto(pageUrl);
                await page.waitForTimeout(3000);
                
                const pageTickets = await page.evaluate(() => {
                    const tickets = [];
                    const rows = document.querySelectorAll('tr[data-issuekey]');
                    
                    rows.forEach(row => {
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
                    
                    return tickets;
                });
                
                pageTickets.forEach((ticket: any) => {
                    ticket.project = project;
                    allTickets.push(ticket);
                });
                
                console.log(`   📦 Added ${pageTickets.length} tickets from page ${pageNum}`);
                
                if (allTickets.filter(t => t.project === project).length >= 500) {
                    console.log(`   🎯 Reached 500 ticket limit for ${project}`);
                    break;
                }
            }
        }
        
        console.log(`\n📊 EXTRACTION COMPLETE: ${allTickets.length} tickets`);
        
        const itsmCount = allTickets.filter(t => t.project === 'ITSM').length;
        const dpsaCount = allTickets.filter(t => t.project === 'DPSA').length;
        
        console.log(`   ITSM: ${itsmCount} tickets`);
        console.log(`   DPSA: ${dpsaCount} tickets`);
        
        if (allTickets.length > 0) {
            // Save and store in Supabase
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-login-checked-tickets-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_LOGIN_CHECKED',
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
                    purpose: 'JIRA_UPGRADE_TESTING_LOGIN_CHECKED',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'login-checked-scraper',
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
            
            console.log(`\n🎉 SUCCESS: ${allTickets.length} UAT tickets stored`);
        } else {
            console.log('❌ No ITSM or DPSA tickets found in UAT environment');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for inspection...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

checkLoginThenScrape();
