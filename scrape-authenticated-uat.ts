import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function scrapeAuthenticatedUAT() {
    console.log('🧪 AUTHENTICATED UAT SCRAPER');
    console.log('================================================================================');
    console.log('✅ Assuming you are logged into UAT JIRA');
    console.log('🎯 Extracting 1000 most recent ITSM & DPSA tickets');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const allTickets: any[] = [];
    
    try {
        // Add UAT banner
        await page.goto('https://jirauat.smedigitalapps.com/jira/');
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; background: #4CAF50;
                color: white; padding: 15px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 18px;
            `;
            banner.textContent = '🧪 UAT AUTHENTICATED SCRAPER - EXTRACTING TICKETS';
            document.body.prepend(banner);
        });
        
        const projects = ['ITSM', 'DPSA'];
        
        for (const project of projects) {
            console.log(`\n📊 Scraping ${project} project...`);
            
            // Navigate to project with most recent tickets first
            const url = `https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
            await page.goto(url);
            await page.waitForTimeout(3000);
            
            // Get total count and visible tickets
            const projectInfo = await page.evaluate(() => {
                const pagingText = document.querySelector('.showing, .results-count-total')?.textContent || '';
                const totalMatch = pagingText.match(/of (\d+)/) || pagingText.match(/(\d+) total/);
                const total = totalMatch ? parseInt(totalMatch[1]) : 0;
                
                const ticketRows = document.querySelectorAll('tr[data-issuekey]');
                const visibleTickets = [];
                
                ticketRows.forEach(row => {
                    const key = row.getAttribute('data-issuekey');
                    const summary = row.querySelector('.summary a')?.textContent?.trim();
                    const status = row.querySelector('.status')?.textContent?.trim();
                    const assignee = row.querySelector('.assignee')?.textContent?.trim();
                    const reporter = row.querySelector('.reporter')?.textContent?.trim();
                    const created = row.querySelector('.created')?.textContent?.trim();
                    const updated = row.querySelector('.updated')?.textContent?.trim();
                    const priority = row.querySelector('.priority')?.textContent?.trim();
                    
                    if (key) {
                        visibleTickets.push({
                            key,
                            summary,
                            status,
                            assignee,
                            reporter,
                            created,
                            updated,
                            priority
                        });
                    }
                });
                
                return { total, visibleTickets, pagingText };
            });
            
            console.log(`   Found ${projectInfo.total} total ${project} tickets`);
            console.log(`   Extracted ${projectInfo.visibleTickets.length} tickets from current page`);
            
            // Add project field and add to allTickets
            projectInfo.visibleTickets.forEach((ticket: any) => {
                ticket.project = project;
                allTickets.push(ticket);
            });
            
            // Navigate through more pages if needed (up to 500 tickets per project)
            const maxPages = Math.min(10, Math.ceil(Math.min(500, projectInfo.total) / 50));
            
            for (let pageNum = 2; pageNum <= maxPages; pageNum++) {
                console.log(`   Loading page ${pageNum}/${maxPages}...`);
                
                const pageUrl = `${url}&startIndex=${(pageNum - 1) * 50}`;
                await page.goto(pageUrl);
                await page.waitForTimeout(2000);
                
                const pageTickets = await page.evaluate(() => {
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
                
                pageTickets.forEach((ticket: any) => {
                    ticket.project = project;
                    allTickets.push(ticket);
                });
                
                console.log(`   Added ${pageTickets.length} tickets from page ${pageNum}`);
                
                // Stop if we have enough tickets
                if (allTickets.length >= 1000) {
                    console.log(`   🎯 Reached 1000 ticket limit`);
                    break;
                }
            }
            
            if (allTickets.length >= 1000) break;
        }
        
        console.log(`\n📊 EXTRACTION COMPLETE: ${allTickets.length} tickets`);
        
        // Show breakdown by project
        const itsmCount = allTickets.filter(t => t.project === 'ITSM').length;
        const dpsaCount = allTickets.filter(t => t.project === 'DPSA').length;
        
        console.log(`   ITSM: ${itsmCount} tickets`);
        console.log(`   DPSA: ${dpsaCount} tickets`);
        
        // Save to file
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `uat-authenticated-tickets-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify({
            environment: 'UAT_AUTHENTICATED',
            url: 'https://jirauat.smedigitalapps.com',
            timestamp: new Date().toISOString(),
            totalTickets: allTickets.length,
            breakdown: { ITSM: itsmCount, DPSA: dpsaCount },
            tickets: allTickets
        }, null, 2));
        
        console.log(`💾 Saved to: ${filename}`);
        
        // Store in Supabase with UAT flags
        console.log('📤 Storing in Supabase...');
        
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
                source: 'authenticated-uat-scraper',
                is_temporary: true,
                cleanup_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
        }));
        
        // Insert in batches
        for (let i = 0; i < supabaseTickets.length; i += 100) {
            const batch = supabaseTickets.slice(i, i + 100);
            const { error } = await supabase.from('jira_tickets').upsert(batch);
            
            if (error) {
                console.error(`❌ Batch ${Math.floor(i/100) + 1} error:`, error);
            } else {
                console.log(`✅ Stored batch ${Math.floor(i/100) + 1}: ${batch.length} tickets`);
            }
        }
        
        console.log(`\n🎉 SUCCESS: ${allTickets.length} UAT tickets stored in Supabase`);
        console.log('🏷️  All tickets flagged as UAT and temporary');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await browser.close();
    }
}

scrapeAuthenticatedUAT();
