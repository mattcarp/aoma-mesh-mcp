import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function quickUATScraper() {
    console.log('🚀 QUICK UAT SCRAPER WITH SESSION');
    console.log('================================================================================');
    console.log('🔐 Using saved session for fast login');
    console.log('📦 Extract ALL available UAT tickets');
    console.log('💾 Store in Supabase with UAT flags');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized'] 
    });
    
    const context = await browser.newContext();
    
    try {
        // Load saved session
        if (fs.existsSync('uat-jira-session.json')) {
            console.log('🔄 Loading saved session...');
            const sessionData = JSON.parse(fs.readFileSync('uat-jira-session.json', 'utf8'));
            if (sessionData.cookies) {
                await context.addCookies(sessionData.cookies);
                console.log('✅ Session cookies loaded');
            }
        }
        
        const page = await context.newPage();
        
        console.log('🔗 Testing session with UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(5000);
        
        // Check if logged in
        const isLoggedIn = await page.evaluate(() => {
            const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
            const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
            const bodyText = document.body?.textContent?.toLowerCase() || '';
            const noLoginElements = !document.querySelector('input[type="email"], input[type="password"]');
            
            return (hasJiraInterface || hasIssuesNav) && noLoginElements && 
                   !bodyText.includes('sign in') && !bodyText.includes('log in');
        });
        
        if (!isLoggedIn) {
            console.log('❌ Session expired or invalid - manual login required');
            console.log('🕰️ Waiting 30 seconds for manual login...');
            await page.waitForTimeout(30000);
            
            // Check again after manual login
            const finalCheck = await page.evaluate(() => {
                const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
                return hasJiraInterface;
            });
            
            if (!finalCheck) {
                console.log('❌ Still not logged in - stopping');
                return;
            }
            
            // Save new session
            const cookies = await context.cookies();
            fs.writeFileSync('uat-jira-session.json', JSON.stringify({
                cookies,
                timestamp: new Date().toISOString()
            }, null, 2));
            console.log('💾 New session saved');
        }
        
        console.log('🎉 Login successful!');
        
        // Extract tickets from UAT
        console.log('\n🎯 Starting UAT ticket extraction...');
        
        await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=ORDER%20BY%20created%20DESC');
        await page.waitForTimeout(4000);
        
        const extractionResults = await page.evaluate(() => {
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
        
        console.log(`📊 Found ${extractionResults.projects.length} project(s): ${extractionResults.projects.join(', ')}`);
        console.log(`📊 ${extractionResults.pagingInfo}`);
        console.log(`📦 Extracted ${extractionResults.tickets.length} tickets`);
        
        if (extractionResults.tickets.length > 0) {
            // Save to file
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `uat-quick-${timestamp}.json`;
            
            fs.writeFileSync(filename, JSON.stringify({
                environment: 'UAT_QUICK',
                url: 'https://jirauat.smedigitalapps.com',
                timestamp: new Date().toISOString(),
                projects: extractionResults.projects,
                totalTickets: extractionResults.tickets.length,
                tickets: extractionResults.tickets
            }, null, 2));
            
            console.log(`💾 Saved to: ${filename}`);
            
            // Store in Supabase with UAT flags
            const supabase = createClient(
                'https://kfxetwuuzljhybfgmpuc.supabase.co',
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            
            const uatTickets = extractionResults.tickets.map((ticket: any) => ({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                metadata: {
                    environment: 'UAT',
                    purpose: 'JIRA_UPGRADE_TESTING_QUICK',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'quick-uat-scraper',
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
            
            console.log(`\n🎉 SUCCESS: ${extractionResults.tickets.length} UAT tickets extracted and stored!`);
            console.log('🏷️  All tickets properly flagged as UAT temporary test data');
            
            // Show project breakdown
            const breakdown = extractionResults.projects.map(proj => {
                const count = extractionResults.tickets.filter((t: any) => t.project === proj).length;
                return `${proj}: ${count}`;
            }).join(', ');
            console.log(`📊 Project breakdown: ${breakdown}`);
            
        } else {
            console.log('❌ No tickets found in UAT environment');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Browser will close in 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

quickUATScraper();
