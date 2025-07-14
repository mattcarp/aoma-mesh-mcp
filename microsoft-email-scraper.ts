import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function microsoftEmailScraper() {
    console.log('🧪 MICROSOFT EMAIL UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ Will handle Microsoft login page with email field');
    console.log('📧 Will enter: matt.carpenter.ext@sonymusic.com');
    console.log('🔐 Continue through complete login flow');
    console.log('📦 Extract all UAT tickets');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
    });
    
    const page = await browser.newPage();
    
    try {
        // Start from UAT JIRA and click login
        console.log('🔗 Opening UAT JIRA and clicking login...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(3000);
        
        // Click the navigation login button
        try {
            await page.click('a.aui-nav-link.login-link[href*="login.jsp"]');
            console.log('✅ Login button clicked');
            await page.waitForTimeout(5000);
        } catch (e) {
            console.log('⚠️ Could not click login button, may already be redirected');
        }
        
        // Handle the complete login flow
        let step = 1;
        let isLoggedIn = false;
        const maxSteps = 25;
        
        while (!isLoggedIn && step <= maxSteps) {
            console.log(`\n🔍 Step ${step}: Analyzing current page...`);
            
            const pageState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body?.textContent?.toLowerCase() || '';
                
                // Detect Microsoft login page with email field
                const isMicrosoftLogin = url.includes('login.microsoftonline.com');
                const emailField = document.querySelector('input[type="email"], input[placeholder*="example.com"], input[name*="loginfmt"]');
                const passwordField = document.querySelector('input[type="password"]');
                const usernameField = document.querySelector('input[placeholder="Username"]');
                
                // Check for successful login to JIRA
                const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
                const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
                const isJiraPage = url.includes('jirauat.smedigitalapps.com') && !url.includes('login');
                
                const loggedIn = (hasJiraInterface || hasIssuesNav || isJiraPage) && 
                                !bodyText.includes('sign in') && !bodyText.includes('log in');
                
                return {
                    url,
                    title,
                    loggedIn,
                    isMicrosoftLogin,
                    needsEmail: !!emailField && isMicrosoftLogin,
                    needsPassword: !!passwordField,
                    needsUsername: !!usernameField,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve') || 
                           bodyText.includes('authenticator') || bodyText.includes('call') ||
                           bodyText.includes('text message'),
                    pagePreview: bodyText.substring(0, 200)
                };
            });
            
            console.log(`   URL: ${pageState.url.substring(0, 80)}...`);
            console.log(`   Page: ${pageState.title}`);
            console.log(`   Logged in: ${pageState.loggedIn ? '✅ YES' : '❌ NO'}`);
            
            if (pageState.loggedIn) {
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
            
            // Handle different login screens
            if (pageState.needsEmail) {
                console.log('   📧 Microsoft email page detected');
                console.log('   📧 Entering email: matt.carpenter.ext@sonymusic.com');
                try {
                    // Clear any existing text and enter email
                    const emailField = await page.$('input[type="email"], input[placeholder*="example.com"], input[name*="loginfmt"]');
                    if (emailField) {
                        await emailField.click();
                        await page.keyboard.selectAll();
                        await page.keyboard.type('matt.carpenter.ext@sonymusic.com');
                        console.log('   ✅ Email entered');
                        
                        // Click Next button
                        await page.click('button:has-text("Next"), input[type="submit"][value="Next"]');
                        console.log('   ✅ Next button clicked');
                    }
                } catch (e) {
                    console.log('   ❌ Email entry failed:', e.message);
                }
                
            } else if (pageState.needsUsername) {
                console.log('   🔤 Username page detected');
                console.log('   🔤 Entering username: mcarpent');
                try {
                    await page.locator('input[placeholder="Username"]').fill('mcarpent');
                    await page.locator('button').filter({ hasText: 'Continue' }).click();
                    console.log('   ✅ Username entered');
                } catch (e) {
                    console.log('   ❌ Username entry failed:', e.message);
                }
                
            } else if (pageState.needsPassword) {
                console.log('   🔒 Password page detected');
                console.log('   🔒 Entering password');
                try {
                    await page.locator('input[type="password"]').fill('Dooley1_Jude2');
                    await page.click('button:has-text("Sign in"), input[type="submit"]');
                    console.log('   ✅ Password entered');
                } catch (e) {
                    console.log('   ❌ Password entry failed:', e.message);
                }
                
            } else if (pageState.is2FA) {
                console.log('   📱 2FA detected - please complete on your phone');
                console.log('   📱 Waiting 15 seconds for 2FA completion...');
                await page.waitForTimeout(15000);
                
            } else {
                console.log('   ⏳ Unknown page state, waiting...');
                console.log(`   Preview: ${pageState.pagePreview.substring(0, 100)}...`);
                await page.waitForTimeout(5000);
            }
            
            step++;
            await page.waitForTimeout(3000);
        }
        
        if (!isLoggedIn) {
            console.log('❌ Login process timed out or failed');
            console.log('⏳ Keeping browser open for manual completion...');
            await page.waitForTimeout(60000);
            return;
        }
        
        // Extract UAT tickets
        console.log('\n🎯 Starting UAT ticket extraction...');
        
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        const extractionData = await page.evaluate(() => {
            const projectSet = new Set();
            const allTickets = [];
            
            document.querySelectorAll('tr[data-issuekey]').forEach(row => {
                const key = row.getAttribute('data-issuekey');
                if (key) {
                    const project = key.split('-')[0];
                    projectSet.add(project);
                    
                    allTickets.push({
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
            
            const pagingInfo = document.querySelector('.showing')?.textContent || 'No paging info';
            
            return {
                projects: Array.from(projectSet),
                tickets: allTickets,
                pagingInfo
            };
        });
        
        console.log(`📊 Found ${extractionData.projects.length} project(s): ${extractionData.projects.join(', ')}`);
        console.log(`📊 ${extractionData.pagingInfo}`);
        console.log(`📦 Extracted ${extractionData.tickets.length} tickets`);
        
        if (extractionData.tickets.length > 0) {
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-microsoft-email-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_MICROSOFT_EMAIL_SUCCESS',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: extractionData.projects,
                totalTickets: extractionData.tickets.length,
                tickets: extractionData.tickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase with UAT flags
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const uatTickets = extractionData.tickets.map((ticket: any) => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING_MICROSOFT_EMAIL',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'microsoft-email-scraper',
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
            
            console.log(`\n🎉 COMPLETE SUCCESS: ${extractionData.tickets.length} UAT tickets extracted and stored!`);
            console.log('🏷️  All tickets properly flagged as UAT temporary test data');
            console.log('💾 Session saved for future runs');
            
            // Project breakdown
            const breakdown = extractionData.projects.map(proj => {
                const count = extractionData.tickets.filter((t: any) => t.project === proj).length;
                return `${proj}: ${count}`;
            }).join(', ');
            console.log(`📊 Final breakdown: ${breakdown}`);
            
        } else {
            console.log('❌ No tickets found in UAT environment');
        }
        
    } catch (error) {
        console.error('❌ Scraper error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for inspection...');
        await page.waitForTimeout(20000);
        await browser.close();
    }
}

microsoftEmailScraper();
