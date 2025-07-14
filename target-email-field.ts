import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function targetEmailField() {
    console.log('🎯 TARGETING EMAIL FIELD - someone@example.com');
    console.log('================================================================================');
    console.log('✅ Will specifically target the email field with placeholder someone@example.com');
    console.log('📧 Will enter: matt.carpenter.ext@sonymusic.com');
    console.log('🔐 Complete full login and extraction');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
    });
    
    const page = await browser.newPage();
    
    try {
        // Go directly to Microsoft login page (since you're already there)
        console.log('🔗 Navigating to Microsoft login page...');
        await page.goto('https://login.microsoftonline.com/f0aff3b7-91a5-4aae-af71-c63e1dda2049/saml2', {
            waitUntil: 'networkidle'
        });
        await page.waitForTimeout(3000);
        
        // Look specifically for the email field with someone@example.com placeholder
        console.log('\n📧 Looking for email field with someone@example.com placeholder...');
        
        const emailFieldFound = await page.evaluate(() => {
            // Look for input with the specific placeholder
            const emailField = document.querySelector('input[placeholder="someone@example.com"]');
            const anyEmailField = document.querySelector('input[type="email"]');
            const inputWithExample = Array.from(document.querySelectorAll('input')).find(input => 
                input.placeholder?.includes('example.com'));
            
            return {
                hasSpecificPlaceholder: !!emailField,
                hasEmailType: !!anyEmailField,
                hasExampleDomain: !!inputWithExample,
                placeholder: emailField?.placeholder || anyEmailField?.placeholder || inputWithExample?.placeholder,
                inputCount: document.querySelectorAll('input').length
            };
        });
        
        console.log(`   Found email field: ${emailFieldFound.hasSpecificPlaceholder ? '✅' : '❌'}`);
        console.log(`   Placeholder text: ${emailFieldFound.placeholder}`);
        console.log(`   Total inputs: ${emailFieldFound.inputCount}`);
        
        if (emailFieldFound.hasSpecificPlaceholder || emailFieldFound.hasExampleDomain) {
            console.log('   📧 Entering email in the correct field...');
            try {
                // Target the specific field with the placeholder
                await page.fill('input[placeholder*="example.com"]', 'matt.carpenter.ext@sonymusic.com');
                console.log('   ✅ Email entered: matt.carpenter.ext@sonymusic.com');
                
                // Click the Next button
                await page.click('button:has-text("Next"), input[value="Next"]');
                console.log('   ✅ Next button clicked');
                
                await page.waitForTimeout(5000);
                
            } catch (e) {
                console.log('   ❌ Error entering email:', e.message);
            }
        } else {
            console.log('   ❌ Could not find the email field');
            return;
        }
        
        // Continue with login flow
        let step = 1;
        let isLoggedIn = false;
        const maxSteps = 20;
        
        while (!isLoggedIn && step <= maxSteps) {
            console.log(`\n🔍 Login Step ${step}...`);
            
            await page.waitForTimeout(3000);
            
            const loginState = await page.evaluate(() => {
                const url = window.location.href;
                const title = document.title;
                const bodyText = document.body?.textContent?.toLowerCase() || '';
                
                // Check for different login states
                const passwordField = document.querySelector('input[type="password"]');
                const isJiraPage = url.includes('jirauat.smedigitalapps.com');
                const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content') !== null;
                
                const loggedIn = isJiraPage && hasJiraInterface && !bodyText.includes('sign in');
                
                return {
                    url,
                    title,
                    loggedIn,
                    needsPassword: !!passwordField,
                    is2FA: bodyText.includes('verification') || bodyText.includes('approve') || 
                           bodyText.includes('authenticator') || bodyText.includes('phone') ||
                           bodyText.includes('text'),
                    isJiraPage,
                    pagePreview: bodyText.substring(0, 150)
                };
            });
            
            console.log(`   URL: ${loginState.url.substring(0, 60)}...`);
            console.log(`   Logged in: ${loginState.loggedIn ? '✅ YES' : '❌ NO'}`);
            
            if (loginState.loggedIn) {
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
            if (loginState.needsPassword) {
                console.log('   🔒 Password field detected');
                console.log('   🔒 Entering password...');
                try {
                    await page.fill('input[type="password"]', 'Dooley1_Jude2');
                    await page.click('button:has-text("Sign in"), input[type="submit"]');
                    console.log('   ✅ Password entered and submitted');
                } catch (e) {
                    console.log('   ❌ Password entry failed');
                }
                
            } else if (loginState.is2FA) {
                console.log('   📱 2FA detected - please complete on your phone');
                console.log('   📱 Waiting 15 seconds...');
                await page.waitForTimeout(15000);
                
            } else {
                console.log('   ⏳ Waiting for next step...');
                console.log(`   Preview: ${loginState.pagePreview}`);
                await page.waitForTimeout(5000);
            }
            
            step++;
        }
        
        if (!isLoggedIn) {
            console.log('❌ Login timed out - may need manual completion');
            await page.waitForTimeout(30000);
            return;
        }
        
        // Extract UAT tickets
        console.log('\n🎯 Extracting UAT tickets...');
        
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        const ticketData = await page.evaluate(() => {
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
            
            const pagingInfo = document.querySelector('.showing')?.textContent || 'No tickets found';
            
            return {
                projects: Array.from(projectSet),
                tickets,
                pagingInfo
            };
        });
        
        console.log(`📊 Projects found: ${ticketData.projects.join(', ') || 'None'}`);
        console.log(`📊 ${ticketData.pagingInfo}`);
        console.log(`📦 Total tickets: ${ticketData.tickets.length}`);
        
        if (ticketData.tickets.length > 0) {
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-email-field-success-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_EMAIL_FIELD_SUCCESS',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: ticketData.projects,
                totalTickets: ticketData.tickets.length,
                tickets: ticketData.tickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const uatTickets = ticketData.tickets.map((ticket: any) => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING_EMAIL_FIELD_SUCCESS',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'email-field-scraper',
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
            
            console.log(`\n🎉 FINAL SUCCESS: ${ticketData.tickets.length} UAT tickets extracted!`);
            console.log('🏷️  All properly flagged as UAT temporary test data');
            
        } else {
            console.log('❌ No tickets found - UAT environment may be empty');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Keeping browser open for review...');
        await page.waitForTimeout(20000);
        await browser.close();
    }
}

targetEmailField();
