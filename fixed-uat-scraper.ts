import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SESSION_FILE = 'uat-jira-session.json';

async function loadSession(page: any): Promise<boolean> {
    if (!fs.existsSync(SESSION_FILE)) return false;
    
    try {
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        await page.context().addCookies(sessionData.cookies);
        console.log('✅ Loaded saved session');
        return true;
    } catch (e) {
        console.log('❌ Failed to load session');
        return false;
    }
}

async function saveSession(page: any) {
    const cookies = await page.context().cookies();
    fs.writeFileSync(SESSION_FILE, JSON.stringify({
        cookies,
        timestamp: new Date().toISOString()
    }, null, 2));
    console.log('💾 Session saved');
}

async function fixedUATScraper() {
    console.log('🧪 FIXED UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🔐 Will click initial Log in button first');
    console.log('🎯 Will scrape ALL available projects');
    console.log('💾 Will store results in Supabase with UAT flags');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    
    // Auto-accept dialogs
    page.on('dialog', async dialog => {
        console.log('🔐 Auto-accepting dialog:', dialog.message());
        await dialog.accept();
    });
    
    try {
        // Try to load existing session first
        await loadSession(page);
        
        console.log('🔗 Opening UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/', { 
            waitUntil: 'networkidle',
            timeout: 60000 
        });
        await page.waitForTimeout(3000);
        
        let isLoggedIn = false;
        let loginAttempts = 0;
        const maxAttempts = 25;
        
        while (!isLoggedIn && loginAttempts < maxAttempts) {
            loginAttempts++;
            console.log(`\n🔍 Step ${loginAttempts}: Checking page state...`);
            
            const pageState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body.textContent?.toLowerCase() || '';
                
                // Look for initial login button (on landing page)
                const initialLoginBtn = document.querySelector('a[href*="login"], button[href*="login"]') ||
                                       Array.from(document.querySelectorAll('a, button')).find(el => 
                                           el.textContent?.trim().toLowerCase() === 'log in');
                
                // Look for form fields
                const usernameField = document.querySelector('input[placeholder="Username"]');
                const emailField = document.querySelector('input[type="email"]');
                const passwordField = document.querySelector('input[type="password"]');
                
                // Look for certificate/accept buttons
                const acceptButtons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'))
                    .filter(btn => {
                        const text = btn.textContent?.toLowerCase() || btn.getAttribute('value')?.toLowerCase() || '';
                        return text.includes('accept') || text.includes('continue') || text.includes('ok');
                    });
                
                // Check for successful login (JIRA interface)
                const hasJiraInterface = document.querySelector('.aui-nav, #header, .navigator-content, .dashboard') !== null;
                const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
                const noLoginElements = !usernameField && !emailField && !passwordField && !initialLoginBtn;
                
                const loggedIn = (hasJiraInterface || hasIssuesNav) && noLoginElements && 
                                !bodyText.includes('sign in') && !bodyText.includes('log in');
                
                return {
                    url,
                    title,
                    loggedIn,
                    needsInitialLogin: !!initialLoginBtn,
                    needsUsername: !!usernameField,
                    needsEmail: !!emailField,
                    needsPassword: !!passwordField,
                    needsAccept: acceptButtons.length > 0,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve') || 
                           bodyText.includes('authenticator'),
                    bodyPreview: bodyText.substring(0, 300)
                };
            });
            
            console.log(`   URL: ${pageState.url.substring(0, 60)}...`);
            console.log(`   Title: ${pageState.title}`);
            console.log(`   Logged in: ${pageState.loggedIn ? '✅ YES' : '❌ NO'}`);
            
            if (pageState.loggedIn) {
                isLoggedIn = true;
                console.log('🎉 LOGIN CONFIRMED!');
                await saveSession(page);
                break;
            }
            
            // Handle different states
            if (pageState.needsInitialLogin) {
                console.log('   🔗 Clicking initial Log in button...');
                try {
                    // Click the main login button
                    await page.click('a[href*="login"], button[href*="login"]');
                    console.log('   ✅ Initial login button clicked');
                } catch (e) {
                    // Try clicking any element with "Log in" text
                    try {
                        await page.getByText('Log in').click();
                        console.log('   ✅ Found and clicked Log in text');
                    } catch (e2) {
                        console.log('   ⚠️ Could not find login button');
                    }
                }
                
            } else if (pageState.needsAccept) {
                console.log('   🔐 Accepting certificate/continue...');
                try {
                    await page.click('button:has-text("Accept"), button:has-text("Continue"), button:has-text("OK")');
                    console.log('   ✅ Accept button clicked');
                } catch (e) {
                    console.log('   ⚠️ Could not click accept button');
                }
                
            } else if (pageState.needsUsername) {
                console.log('   🔤 Entering username...');
                try {
                    await page.locator('input[placeholder="Username"]').fill('mcarpent');
                    await page.locator('button').filter({ hasText: 'Continue' }).click();
                    console.log('   ✅ Username entered');
                } catch (e) {
                    console.log('   ⚠️ Username entry failed');
                }
                
            } else if (pageState.needsEmail) {
                console.log('   📧 Entering email...');
                try {
                    await page.locator('input[type="email"]').fill('matt.carpenter.ext@sonymusic.com');
                    await page.locator('button').filter({ hasText: 'Next' }).click();
                    console.log('   ✅ Email entered');
                } catch (e) {
                    console.log('   ⚠️ Email entry failed');
                }
                
            } else if (pageState.needsPassword) {
                console.log('   🔒 Entering password...');
                try {
                    await page.locator('input[type="password"]').fill('Dooley1_Jude2');
                    await page.locator('button').filter({ hasText: 'Sign in' }).click();
                    console.log('   ✅ Password entered');
                } catch (e) {
                    console.log('   ⚠️ Password entry failed');
                }
                
            } else if (pageState.is2FA) {
                console.log('   📱 2FA detected - please complete on your phone');
                await page.waitForTimeout(10000);
                
            } else {
                console.log('   ⏳ Waiting for page to change...');
                console.log(`   Page preview: ${pageState.bodyPreview.substring(0, 100)}...`);
                await page.waitForTimeout(5000);
            }
            
            await page.waitForTimeout(2000);
        }
        
        if (!isLoggedIn) {
            console.log('❌ Could not confirm login - please complete manually');
            console.log('⏳ Keeping browser open for manual completion...');
            await page.waitForTimeout(30000);
            return;
        }
        
        // Now scrape available projects
        console.log('\n🎯 Starting ticket extraction...');
        
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(4000);
        
        const discovery = await page.evaluate(() => {
            const projectSet = new Set();
            const sampleTickets = [];
            
            document.querySelectorAll('tr[data-issuekey]').forEach(row => {
                const key = row.getAttribute('data-issuekey');
                if (key) {
                    const project = key.split('-')[0];
                    projectSet.add(project);
                    
                    const summary = row.querySelector('.summary a')?.textContent?.trim();
                    sampleTickets.push({ key, project, summary });
                }
            });
            
            const pagingText = document.querySelector('.showing')?.textContent || '';
            
            return {
                projects: Array.from(projectSet),
                sampleTickets: sampleTickets.slice(0, 5),
                pagingText
            };
        });
        
        console.log(`📊 Found ${discovery.projects.length} project(s): ${discovery.projects.join(', ')}`);
        console.log(`📊 ${discovery.pagingText}`);
        
        if (discovery.projects.length === 0) {
            console.log('❌ No projects found in UAT - environment may be empty');
            return;
        }
        
        // Extract from all projects
        const allTickets: any[] = [];
        
        for (const project of discovery.projects) {
            console.log(`\n📦 Extracting ${project} tickets...`);
            
            const url = `https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
            await page.goto(url);
            await page.waitForTimeout(3000);
            
            const tickets = await page.evaluate(() => {
                const results = [];
                
                document.querySelectorAll('tr[data-issuekey]').forEach(row => {
                    const key = row.getAttribute('data-issuekey');
                    if (key) {
                        results.push({
                            key,
                            summary: row.querySelector('.summary a')?.textContent?.trim() || '',
                            status: row.querySelector('.status')?.textContent?.trim() || '',
                            assignee: row.querySelector('.assignee')?.textContent?.trim() || '',
                            reporter: row.querySelector('.reporter')?.textContent?.trim() || '',
                            created: row.querySelector('.created')?.textContent?.trim() || '',
                            updated: row.querySelector('.updated')?.textContent?.trim() || '',
                            priority: row.querySelector('.priority')?.textContent?.trim() || ''
                        });
                    }
                });
                
                return results;
            });
            
            tickets.forEach((ticket: any) => {
                ticket.project = project;
                allTickets.push(ticket);
            });
            
            console.log(`   ✅ Extracted ${tickets.length} tickets from ${project}`);
        }
        
        console.log(`\n📊 TOTAL: ${allTickets.length} UAT tickets extracted`);
        
        if (allTickets.length > 0) {
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-fixed-extraction-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_FIXED',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: discovery.projects,
                totalTickets: allTickets.length,
                tickets: allTickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const uatTickets = allTickets.map(ticket => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING_FIXED',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'fixed-uat-scraper',
                    is_temporary: true,
                    extraction_date: new Date().toISOString()
                }
            }));
            
            console.log('\n📤 Storing in Supabase...');
            
            for (let i = 0; i < uatTickets.length; i += 50) {
                const batch = uatTickets.slice(i, i + 50);
                const { error } = await supabase.from('jira_tickets').upsert(batch);
                
                if (error) {
                    console.error(`❌ Batch ${Math.floor(i/50) + 1} error:`, error);
                } else {
                    console.log(`✅ Stored batch ${Math.floor(i/50) + 1}: ${batch.length} UAT tickets`);
                }
            }
            
            console.log(`\n🎉 SUCCESS: ${allTickets.length} UAT tickets stored!`);
            console.log('🏷️  All flagged as UAT temporary test data');
            
        } else {
            console.log('❌ No tickets extracted');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 15 seconds...');
        await page.waitForTimeout(15000);
        await browser.close();
    }
}

fixedUATScraper();
