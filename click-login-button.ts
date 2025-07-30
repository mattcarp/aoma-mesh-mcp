import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function clickLoginButton() {
    console.log('🎯 TARGETING LOGIN BUTTON IN UPPER RIGHT');
    console.log('================================================================================');
    console.log('✅ Will specifically click the "Log In" button in top navigation');
    console.log('🔐 Then complete full login flow');
    console.log('📦 Then scrape all available projects');
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
        
        // FIRST: Click the "Log In" button in the upper right
        console.log('\n🎯 Step 1: Looking for "Log In" button in upper right...');
        
        const loginButtonFound = await page.evaluate(() => {
            // Look specifically in the header/navigation area for "Log In"
            const headerArea = document.querySelector('#header, .aui-header, .jira-header, nav') || document;
            
            // Find "Log In" text in the header area
            const loginElements = Array.from(headerArea.querySelectorAll('a, button, span')).filter(el => {
                const text = el.textContent?.trim();
                return text === 'Log In' || text === 'Log in';
            });
            
            return {
                found: loginElements.length > 0,
                count: loginElements.length,
                texts: loginElements.map(el => el.textContent?.trim())
            };
        });
        
        console.log(`   Found ${loginButtonFound.count} "Log In" elements: ${loginButtonFound.texts.join(', ')}`);
        
        if (loginButtonFound.found) {
            console.log('   🔗 Clicking specific navigation "Log In" button...');
            try {
                // Target the specific navigation login link (not the skip link)
                await page.click('a.aui-nav-link.login-link[href*="login.jsp"]');
                console.log('   ✅ Navigation "Log In" button clicked!');
                await page.waitForTimeout(3000);
            } catch (e) {
                console.log('   ❌ Could not click navigation "Log In" button:', e.message);
            }
        } else {
            console.log('   ❌ "Log In" button not found in header');
        }
        
        // Now continue with login flow
        let loginStep = 2;
        let isLoggedIn = false;
        const maxSteps = 20;
        
        while (!isLoggedIn && loginStep <= maxSteps) {
            console.log(`\n🔍 Step ${loginStep}: Checking login progress...`);
            
            // Wait for page to stabilize after navigation
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
            
            const currentState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body?.textContent?.toLowerCase() || '';
                
                // Check for login form elements
                const usernameField = document.querySelector('input[placeholder="Username"]:not([disabled])');
                const emailField = document.querySelector('input[type="email"]:not([disabled]), input[name="loginfmt"]:not([disabled]), input[placeholder*="example.com"]:not([disabled])');
                const passwordField = document.querySelector('input[type="password"]:not([disabled])');
                
                // Check for successful login
                const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content') !== null;
                const hasIssuesLink = document.querySelector('a[href*="issues"]') !== null;
                const noLoginButton = !Array.from(document.querySelectorAll('a, button')).some(el => 
                    el.textContent?.trim() === 'Log In');
                
                const loggedIn = (hasJiraInterface || hasIssuesLink) && noLoginButton && 
                                !bodyText.includes('sign in') && !bodyText.includes('log in');
                
                return {
                    url,
                    title,
                    loggedIn,
                    needsUsername: !!usernameField,
                    needsEmail: !!emailField,
                    needsPassword: !!passwordField,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve'),
                    pagePreview: bodyText.substring(0, 200)
                };
            });
            
            console.log(`   Current URL: ${currentState.url.substring(0, 60)}...`);
            console.log(`   Logged in: ${currentState.loggedIn ? '✅ YES' : '❌ NO'}`);
            
            if (currentState.loggedIn) {
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
            
            // Handle login steps - prioritize email fields for Microsoft SSO
            if (currentState.needsEmail) {
                console.log('   📧 Entering email...');
                await page.locator('input[type="email"], input[name="loginfmt"], input[placeholder*="example.com"]').first().fill('matt.carpenter.ext@sonymusic.com');
                await page.locator('button').filter({ hasText: 'Next' }).click();
                
            } else if (currentState.needsUsername) {
                console.log('   🔤 Entering username...');
                await page.locator('input[placeholder="Username"]').fill('mcarpent');
                await page.locator('button').filter({ hasText: 'Continue' }).click();
                
            } else if (currentState.needsPassword) {
                console.log('   🔒 Entering password...');
                await page.locator('input[type="password"]').fill('Dooley1_Jude2');
                await page.locator('button').filter({ hasText: 'Sign in' }).click();
                
            } else if (currentState.is2FA) {
                console.log('   📱 2FA - please complete on your phone');
                await page.waitForTimeout(10000);
                
            } else {
                console.log('   ⏳ Waiting for next step...');
                console.log(`   Page preview: ${currentState.pagePreview.substring(0, 100)}...`);
                await page.waitForTimeout(5000);
            }
            
            loginStep++;
            await page.waitForTimeout(2000);
        }
        
        if (!isLoggedIn) {
            console.log('❌ Login failed or timed out');
            return;
        }
        
        // Now scrape projects
        console.log('\n🎯 Starting project discovery and extraction...');
        
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(4000);
        
        const projectData = await page.evaluate(() => {
            const projectSet = new Set();
            const tickets = [];
            
            document.querySelectorAll('tr[data-issuekey]').forEach(row => {
                const key = row.getAttribute('data-issuekey');
                if (key) {
                    const project = key.split('-')[0];
                    projectSet.add(project);
                    
                    tickets.push({
                        key,
                        project,
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
            
            const pagingText = document.querySelector('.showing')?.textContent || '';
            
            return {
                projects: Array.from(projectSet),
                tickets,
                pagingText
            };
        });
        
        console.log(`📊 Found ${projectData.projects.length} project(s): ${projectData.projects.join(', ')}`);
        console.log(`📊 ${projectData.pagingText}`);
        console.log(`📦 Extracted ${projectData.tickets.length} tickets total`);
        
        if (projectData.tickets.length > 0) {
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-login-button-extraction-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_LOGIN_BUTTON_SUCCESS',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: projectData.projects,
                totalTickets: projectData.tickets.length,
                tickets: projectData.tickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const uatTickets = projectData.tickets.map((ticket: any) => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING_LOGIN_BUTTON_SUCCESS',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'login-button-scraper',
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
            
            console.log(`\n🎉 SUCCESS: ${projectData.tickets.length} UAT tickets extracted and stored!`);
            console.log('🏷️  All tickets flagged as UAT temporary test data');
            
            // Project breakdown
            const breakdown = projectData.projects.map(proj => {
                const count = projectData.tickets.filter((t: any) => t.project === proj).length;
                return `${proj}: ${count}`;
            }).join(', ');
            console.log(`📊 Project breakdown: ${breakdown}`);
            
        } else {
            console.log('❌ No tickets found - UAT environment may be empty');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

clickLoginButton();
