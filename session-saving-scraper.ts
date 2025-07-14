import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SESSION_FILE = 'uat-jira-session.json';

async function saveSession(page: any) {
    const cookies = await page.context().cookies();
    const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
    const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
    
    const sessionData = {
        cookies,
        localStorage,
        sessionStorage,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
    console.log('💾 Session saved successfully');
}

async function loadSession(page: any): Promise<boolean> {
    if (!fs.existsSync(SESSION_FILE)) {
        console.log('📂 No saved session found');
        return false;
    }
    
    try {
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        
        // Check if session is too old (more than 24 hours)
        const sessionAge = Date.now() - new Date(sessionData.timestamp).getTime();
        if (sessionAge > 24 * 60 * 60 * 1000) {
            console.log('⏰ Saved session is too old (>24h), will need fresh login');
            return false;
        }
        
        // Load cookies
        await page.context().addCookies(sessionData.cookies);
        
        // Load storage
        await page.evaluate((data) => {
            if (data.localStorage) {
                const ls = JSON.parse(data.localStorage);
                for (const [key, value] of Object.entries(ls)) {
                    localStorage.setItem(key, value as string);
                }
            }
            if (data.sessionStorage) {
                const ss = JSON.parse(data.sessionStorage);
                for (const [key, value] of Object.entries(ss)) {
                    sessionStorage.setItem(key, value as string);
                }
            }
        }, sessionData);
        
        console.log('✅ Session loaded successfully');
        return true;
    } catch (error) {
        console.log('❌ Failed to load session:', error);
        return false;
    }
}

async function sessionSavingScraper() {
    console.log('🧪 SESSION-SAVING UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('💾 Will save login session for reuse');
    console.log('🎯 ONLY extracting ITSM and DPSA projects');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        // Try to load existing session
        console.log('🔄 Attempting to load saved session...');
        const sessionLoaded = await loadSession(page);
        
        // Navigate to JIRA
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(5000);
        
        // Check if we're logged in
        const loginCheck = await page.evaluate(() => {
            const loginButton = document.querySelector('a[href*="login"], .login-link');
            const hasLoginForm = document.querySelector('#login-form-username') !== null;
            const userDropdown = document.querySelector('#header-details-user-drop, .aui-dropdown2-trigger');
            const welcomeText = document.body.textContent?.includes('Welcome') || false;
            
            return {
                hasLoginButton: !!loginButton,
                hasLoginForm: hasLoginForm,
                hasUserDropdown: !!userDropdown,
                welcomeText: welcomeText,
                pageTitle: document.title,
                isLoggedIn: !loginButton && !hasLoginForm && (userDropdown || welcomeText)
            };
        });
        
        console.log(`📊 Login Status: ${loginCheck.isLoggedIn ? '✅ Logged in' : '❌ Not logged in'}`);
        console.log(`   Page: ${loginCheck.pageTitle}`);
        
        if (!loginCheck.isLoggedIn) {
            console.log('\n🔐 Login required - opening login page...');
            await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
            await page.waitForTimeout(3000);
            
            // Add non-intrusive banner (bottom of screen)
            await page.evaluate(() => {
                const banner = document.createElement('div');
                banner.style.cssText = `
                    position: fixed; bottom: 0; left: 0; right: 0; background: #FF5722;
                    color: white; padding: 10px; text-align: center; font-weight: bold;
                    z-index: 9999; font-size: 14px; box-shadow: 0 -2px 5px rgba(0,0,0,0.3);
                `;
                banner.textContent = '🔐 Please complete login - Session will be saved for future use';
                document.body.appendChild(banner);
            });
            
            console.log('⏳ Please complete login in browser...');
            console.log('   - Enter username and password');
            console.log('   - Complete 2FA if required');
            console.log('   - Wait for dashboard to load');
            console.log('   - Session will be automatically saved');
            
            // Wait for successful login (check every 10 seconds)
            let loginAttempts = 0;
            const maxAttempts = 18; // 3 minutes total
            
            while (loginAttempts < maxAttempts) {
                await page.waitForTimeout(10000); // Wait 10 seconds
                loginAttempts++;
                
                // Check if we're now logged in
                const recheckLogin = await page.evaluate(() => {
                    const loginButton = document.querySelector('a[href*="login"], .login-link');
                    const hasLoginForm = document.querySelector('#login-form-username') !== null;
                    const userDropdown = document.querySelector('#header-details-user-drop, .aui-dropdown2-trigger');
                    const dashboardContent = document.querySelector('.dashboard, #dashboard');
                    
                    return {
                        isLoggedIn: !loginButton && !hasLoginForm && (userDropdown || dashboardContent),
                        currentUrl: window.location.href,
                        pageTitle: document.title
                    };
                });
                
                if (recheckLogin.isLoggedIn) {
                    console.log(`✅ Login successful after ${loginAttempts * 10} seconds`);
                    
                    // Save the session
                    await saveSession(page);
                    break;
                } else {
                    console.log(`⏳ Still waiting for login... (${loginAttempts}/${maxAttempts})`);
                }
            }
            
            if (loginAttempts >= maxAttempts) {
                console.log('❌ Login timeout after 3 minutes');
                return;
            }
        } else {
            console.log('✅ Already logged in with saved session');
        }
        
        // Update banner for scraping
        await page.evaluate(() => {
            const banner = document.querySelector('div[style*="position: fixed"]');
            if (banner) {
                banner.style.cssText = `
                    position: fixed; bottom: 0; left: 0; right: 0; background: #4CAF50;
                    color: white; padding: 10px; text-align: center; font-weight: bold;
                    z-index: 9999; font-size: 14px;
                `;
                banner.textContent = '🧪 UAT SCRAPER RUNNING - Extracting ITSM & DPSA tickets';
            }
        });
        
        console.log('\n🎯 Starting ticket extraction...');
        
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
            
            // Get more pages if available
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
        
        if (allTickets.length > 0) {
            const itsmCount = allTickets.filter(t => t.project === 'ITSM').length;
            const dpsaCount = allTickets.filter(t => t.project === 'DPSA').length;
            
            console.log(`   ITSM: ${itsmCount} tickets`);
            console.log(`   DPSA: ${dpsaCount} tickets`);
            
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-session-saved-tickets-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_SESSION_SAVED',
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
                    purpose: 'JIRA_UPGRADE_TESTING_SESSION_SAVED',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'session-saving-scraper',
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
            console.log('💾 Session saved for future runs - no need to login again for 24 hours');
        } else {
            console.log('❌ No ITSM or DPSA tickets found in UAT environment');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

sessionSavingScraper();
