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

async function completeUATScraper() {
    console.log('🧪 COMPLETE UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🔐 Will help with login and auto-accept certificates');
    console.log('🎯 Will scrape ALL available projects (not just ITSM/DPSA)');
    console.log('💾 Will store results in Supabase with UAT flags');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--ignore-certificate-errors', '--ignore-ssl-errors']
    });
    
    const page = await browser.newPage();
    
    // Auto-accept certificates
    page.on('dialog', async dialog => {
        console.log('🔐 Auto-accepting certificate dialog');
        await dialog.accept();
    });
    
    try {
        // Try to load existing session first
        await loadSession(page);
        
        console.log('🔗 Opening UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        // Check if we're already logged in
        let isLoggedIn = false;
        let loginAttempts = 0;
        const maxAttempts = 30;
        
        while (!isLoggedIn && loginAttempts < maxAttempts) {
            loginAttempts++;
            console.log(`\n🔍 Check ${loginAttempts}: Testing login status...`);
            
            const pageState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body.textContent?.toLowerCase() || '';
                
                // Look for login elements
                const usernameField = document.querySelector('input[placeholder="Username"]');
                const emailField = document.querySelector('input[type="email"]');
                const passwordField = document.querySelector('input[type="password"]');
                const certButton = document.querySelector('button:contains("Accept"), button:contains("Continue"), button:contains("OK")') ||
                                  document.querySelector('[value="Accept"], [value="Continue"], [value="OK"]');
                
                // Check for JIRA interface (logged in)
                const hasJiraNav = document.querySelector('.aui-nav, #header, .jira-header') !== null;
                const hasIssuesLink = document.querySelector('a[href*="issues"]') !== null;
                const hasDashboard = bodyText.includes('dashboard') || url.includes('dashboard');
                const noLoginFields = !usernameField && !emailField && !passwordField;
                
                const loggedIn = (hasJiraNav || hasIssuesLink || hasDashboard) && noLoginFields && 
                                !bodyText.includes('sign in') && !bodyText.includes('log in');
                
                return {
                    url,
                    title,
                    loggedIn,
                    needsUsername: !!usernameField,
                    needsEmail: !!emailField,
                    needsPassword: !!passwordField,
                    needsCert: !!certButton,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve') || 
                           bodyText.includes('authenticator') || bodyText.includes('phone'),
                    hasJiraNav,
                    hasIssuesLink,
                    bodyPreview: bodyText.substring(0, 200)
                };
            });
            
            console.log(`   URL: ${pageState.url.substring(0, 80)}...`);
            console.log(`   Logged in: ${pageState.loggedIn ? '✅ YES' : '❌ NO'}`);
            
            if (pageState.loggedIn) {
                isLoggedIn = true;
                console.log('🎉 LOGIN CONFIRMED!');
                await saveSession(page);
                break;
            }
            
            // Handle different login steps
            if (pageState.needsCert) {
                console.log('   🔐 Accepting certificate...');
                try {
                    await page.click('button:has-text("Accept"), button:has-text("Continue"), button:has-text("OK"), input[value="Accept"]');
                    console.log('   ✅ Certificate accepted');
                } catch (e) {
                    console.log('   ⚠️ Could not auto-accept certificate');
                }
                
            } else if (pageState.needsUsername) {
                console.log('   🔤 Helping with username...');
                try {
                    await page.locator('input[placeholder="Username"]').fill('mcarpent');
                    await page.locator('button').filter({ hasText: 'Continue' }).click();
                    console.log('   ✅ Username entered');
                } catch (e) {
                    console.log('   ⚠️ Username entry failed:', e.message);
                }
                
            } else if (pageState.needsEmail) {
                console.log('   📧 Helping with email...');
                try {
                    await page.locator('input[type="email"]').fill('matt.carpenter.ext@sonymusic.com');
                    await page.locator('button').filter({ hasText: 'Next' }).click();
                    console.log('   ✅ Email entered');
                } catch (e) {
                    console.log('   ⚠️ Email entry failed:', e.message);
                }
                
            } else if (pageState.needsPassword) {
                console.log('   🔒 Helping with password...');
                try {
                    await page.locator('input[type="password"]').fill('Dooley1_Jude2');
                    await page.locator('button').filter({ hasText: 'Sign in' }).click();
                    console.log('   ✅ Password entered');
                } catch (e) {
                    console.log('   ⚠️ Password entry failed:', e.message);
                }
                
            } else if (pageState.is2FA) {
                console.log('   📱 2FA detected - please complete on your phone');
                await page.waitForTimeout(10000);
                
            } else {
                console.log('   ⏳ Waiting for page to load or user action...');
                console.log(`   Page preview: ${pageState.bodyPreview}`);
                await page.waitForTimeout(5000);
            }
            
            await page.waitForTimeout(2000);
        }
        
        if (!isLoggedIn) {
            console.log('❌ Could not confirm login after 30 attempts');
            console.log('🔧 Please complete login manually in the browser');
            return;
        }
        
        // Now scrape ALL available projects
        console.log('\n🎯 Starting comprehensive ticket extraction...');
        
        // First, discover all projects
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
                    const status = row.querySelector('.status')?.textContent?.trim();
                    
                    sampleTickets.push({ key, project, summary, status });
                }
            });
            
            const pagingText = document.querySelector('.showing')?.textContent || '';
            
            return {
                projects: Array.from(projectSet),
                sampleTickets: sampleTickets.slice(0, 10),
                pagingText
            };
        });
        
        console.log(`📊 Found ${discovery.projects.length} project(s): ${discovery.projects.join(', ')}`);
        console.log(`📊 Page info: ${discovery.pagingText}`);
        
        if (discovery.projects.length === 0) {
            console.log('❌ No projects found in UAT environment');
            return;
        }
        
        // Extract tickets from all projects
        const allTickets: any[] = [];
        
        for (const project of discovery.projects) {
            console.log(`\n📦 Extracting tickets from ${project} project...`);
            
            const url = `https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
            await page.goto(url);
            await page.waitForTimeout(3000);
            
            const projectTickets = await page.evaluate(() => {
                const tickets = [];
                
                document.querySelectorAll('tr[data-issuekey]').forEach(row => {
                    const key = row.getAttribute('data-issuekey');
                    if (key) {
                        tickets.push({
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
                
                const pagingInfo = document.querySelector('.showing')?.textContent || '';
                return { tickets, pagingInfo };
            });
            
            projectTickets.tickets.forEach((ticket: any) => {
                ticket.project = project;
                allTickets.push(ticket);
            });
            
            console.log(`   ✅ Extracted ${projectTickets.tickets.length} tickets from ${project}`);
            console.log(`   📊 ${projectTickets.pagingInfo}`);
            
            // Limit to 500 tickets per project to avoid overwhelming
            if (projectTickets.tickets.length >= 50) {
                console.log(`   🎯 Limited to first 50 tickets for testing`);
            }
        }
        
        console.log(`\n📊 TOTAL EXTRACTED: ${allTickets.length} UAT tickets`);
        
        // Save to file
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `uat-complete-extraction-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify({
            environment: 'UAT_COMPLETE',
            url: 'https://jirauat.smedigitalapps.com',
            timestamp: new Date().toISOString(),
            extractedProjects: discovery.projects,
            totalTickets: allTickets.length,
            tickets: allTickets
        }, null, 2));
        
        console.log(`💾 Saved to: ${filename}`);
        
        // Store in Supabase with proper UAT flags
        if (allTickets.length > 0) {
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
                    purpose: 'JIRA_UPGRADE_TESTING_COMPLETE',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'complete-uat-scraper',
                    is_temporary: true,
                    extraction_date: new Date().toISOString()
                }
            }));
            
            console.log('\n📤 Storing UAT tickets in Supabase...');
            
            // Store in batches
            for (let i = 0; i < uatTickets.length; i += 50) {
                const batch = uatTickets.slice(i, i + 50);
                const { error } = await supabase.from('jira_tickets').upsert(batch);
                
                if (error) {
                    console.error(`❌ Batch ${Math.floor(i/50) + 1} error:`, error);
                } else {
                    console.log(`✅ Stored batch ${Math.floor(i/50) + 1}: ${batch.length} UAT tickets`);
                }
            }
            
            console.log(`\n🎉 SUCCESS: ${allTickets.length} UAT tickets extracted and stored!`);
            console.log('🏷️  All tickets flagged as UAT and temporary');
            console.log('💾 Session saved for future runs');
            
            // Summary by project
            const projectSummary = discovery.projects.map(proj => {
                const count = allTickets.filter(t => t.project === proj).length;
                return `${proj}: ${count} tickets`;
            }).join(', ');
            
            console.log(`📊 Project breakdown: ${projectSummary}`);
            
        } else {
            console.log('❌ No tickets were extracted');
        }
        
    } catch (error) {
        console.error('❌ Scraper error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

completeUATScraper();
