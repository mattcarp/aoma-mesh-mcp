import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

async function waitForUserInput(message: string): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(message, () => {
            rl.close();
            resolve();
        });
    });
}

async function manualLoginThenScrape() {
    console.log('🧪 MANUAL LOGIN + UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🔐 Manual login required - browser will open for you');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
    });
    
    const page = await browser.newPage();
    
    try {
        console.log('🚀 Opening UAT JIRA login page...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp');
        await page.waitForTimeout(3000);
        
        // Add helpful banner
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; background: #FF5722;
                color: white; padding: 15px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 18px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            `;
            banner.textContent = '🔐 PLEASE LOG IN MANUALLY - Then return to terminal and press ENTER';
            document.body.prepend(banner);
        });
        
        console.log('\n🔐 MANUAL LOGIN INSTRUCTIONS:');
        console.log('1. Complete login in the browser window');
        console.log('2. Handle any 2FA if required');
        console.log('3. Wait until you see the JIRA dashboard');
        console.log('4. Return to this terminal');
        console.log('5. Press ENTER when ready to start scraping');
        
        await waitForUserInput('\n⏳ Press ENTER when you are logged in and ready to scrape...');
        
        console.log('\n✅ Starting scraper...');
        
        // Update banner
        await page.evaluate(() => {
            const banner = document.querySelector('div[style*="position: fixed"]');
            if (banner) {
                banner.style.background = '#4CAF50';
                banner.textContent = '🧪 UAT SCRAPER RUNNING - Extracting tickets...';
            }
        });
        
        // Verify login status
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(3000);
        
        const loginCheck = await page.evaluate(() => {
            const hasLoginForm = document.querySelector('#login-form-username') !== null;
            const hasLoginText = document.body.textContent?.includes('Log in');
            const pageTitle = document.title;
            
            return {
                isLoggedIn: !hasLoginForm && !hasLoginText,
                pageTitle
            };
        });
        
        if (!loginCheck.isLoggedIn) {
            console.log('❌ Still not logged in. Please check your login and try again.');
            await waitForUserInput('Press ENTER to retry...');
        }
        
        console.log(`✅ Login confirmed: ${loginCheck.pageTitle}`);
        
        // Start discovering what's available
        console.log('\n🔍 Discovering available tickets...');
        
        // Search for any tickets to see what exists
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(5000);
        
        const discovery = await page.evaluate(() => {
            const ticketRows = document.querySelectorAll('tr[data-issuekey]');
            const projects = new Set();
            const tickets = [];
            
            ticketRows.forEach(row => {
                const key = row.getAttribute('data-issuekey');
                if (key) {
                    const project = key.split('-')[0];
                    projects.add(project);
                    
                    const summary = row.querySelector('.summary a')?.textContent?.trim();
                    const status = row.querySelector('.status')?.textContent?.trim();
                    
                    tickets.push({ key, project, summary, status });
                }
            });
            
            const pagingInfo = document.querySelector('.showing')?.textContent || '';
            
            return {
                projects: Array.from(projects),
                sampleTickets: tickets.slice(0, 10),
                pagingInfo
            };
        });
        
        console.log('📊 DISCOVERY RESULTS:');
        console.log(`   Available projects: ${discovery.projects.join(', ') || 'None found'}`);
        console.log(`   Total tickets: ${discovery.pagingInfo}`);
        console.log(`   Sample tickets: ${discovery.sampleTickets.length}`);
        
        if (discovery.sampleTickets.length > 0) {
            console.log('\n📝 Sample tickets found:');
            discovery.sampleTickets.forEach(ticket => {
                console.log(`   ${ticket.key}: ${ticket.summary?.substring(0, 60)}...`);
            });
            
            console.log('\n🎯 Would you like to scrape these tickets?');
            await waitForUserInput('Press ENTER to continue with scraping, or Ctrl+C to stop...');
            
            // Proceed with scraping
            const allTickets: any[] = [];
            
            for (const project of discovery.projects) {
                console.log(`\n📊 Scraping ${project} project...`);
                
                await page.goto(`https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`);
                await page.waitForTimeout(3000);
                
                const projectTickets = await page.evaluate(() => {
                    const tickets = [];
                    const rows = document.querySelectorAll('tr[data-issuekey]');
                    
                    rows.forEach(row => {
                        const key = row.getAttribute('data-issuekey');
                        const summary = row.querySelector('.summary a')?.textContent?.trim();
                        const status = row.querySelector('.status')?.textContent?.trim();
                        const assignee = row.querySelector('.assignee')?.textContent?.trim();
                        const reporter = row.querySelector('.reporter')?.textContent?.trim();
                        const created = row.querySelector('.created')?.textContent?.trim();
                        const updated = row.querySelector('.updated')?.textContent?.trim();
                        const priority = row.querySelector('.priority')?.textContent?.trim();
                        
                        if (key) {
                            tickets.push({
                                key, summary, status, assignee, reporter, created, updated, priority
                            });
                        }
                    });
                    
                    return tickets;
                });
                
                projectTickets.forEach((ticket: any) => {
                    ticket.project = project;
                    allTickets.push(ticket);
                });
                
                console.log(`   Extracted ${projectTickets.length} tickets from ${project}`);
            }
            
            console.log(`\n📊 TOTAL EXTRACTED: ${allTickets.length} tickets`);
            
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-manual-login-tickets-${timestamp}.json`;
            
            const fs = require('fs');
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_MANUAL_LOGIN',
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
            
            const supabaseTickets = allTickets.map(ticket => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'manual-login-scraper',
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
            console.log('❌ No tickets found. UAT environment may be empty or have different projects.');
        }
        
        await waitForUserInput('\nPress ENTER to close browser...');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

manualLoginThenScrape();
