import { chromium } from 'playwright';
import fs from 'fs';
import { requireVPNConnection } from './vpn-check';
import { createClient } from '@supabase/supabase-js';

interface FullTicket {
    key: string;
    summary: string;
    description: string;
    status: string;
    priority: string;
    assignee: string;
    reporter: string;
    created: string;
    updated: string;
    resolved: string;
    project: string;
    issueType: string;
    components: string[];
    labels: string[];
    fixVersions: string[];
    affectedVersions: string[];
    environment: string;
    customFields: Record<string, any>;
    comments: Array<{
        author: string;
        created: string;
        body: string;
    }>;
    attachments: Array<{
        name: string;
        size: string;
        created: string;
        author: string;
    }>;
    worklog: Array<{
        author: string;
        timeSpent: string;
        comment: string;
        started: string;
    }>;
}

async function uatFullTicketScraper() {
    console.log('🧪 UAT FULL TICKET SCRAPER - ITSM & DPSA PROJECTS');
    console.log('================================================================================');
    console.log('✅ SAFE: UAT environment only - https://jirauat.smedigitalapps.com');
    console.log('🎯 Target: 1000 most recent tickets from ITSM and DPSA projects');
    console.log('📦 Full ticket data extraction (all fields, comments, attachments)');
    console.log('🏷️  All tickets flagged as UAT for later cleanup');
    console.log('================================================================================');
    
    // Check VPN
    const vpnOk = await requireVPNConnection();
    if (!vpnOk) {
        console.log('❌ VPN check failed - cannot access UAT JIRA');
        return;
    }
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    const allTickets: FullTicket[] = [];
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    try {
        console.log('🔗 Connecting to UAT JIRA...');
        
        // UAT URL ONLY - never production
        const baseUrl = 'https://jirauat.smedigitalapps.com';
        
        // Add UAT environment banner
        await page.goto(`${baseUrl}/jira/`);
        await page.waitForTimeout(3000);
        
        await page.evaluate(() => {
            const banner = document.createElement('div');
            banner.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; background: #ff9800;
                color: white; padding: 10px; text-align: center; font-weight: bold;
                z-index: 9999; font-size: 16px;
            `;
            banner.textContent = '🧪 UAT ENVIRONMENT - FULL TICKET EXTRACTION';
            document.body.prepend(banner);
        });
        
        // Search for ITSM and DPSA projects - 1000 most recent
        const projects = ['ITSM', 'DPSA'];
        
        for (const project of projects) {
            console.log(`\n📊 Processing ${project} project...`);
            
            // Go to project tickets ordered by created date
            const searchUrl = `${baseUrl}/jira/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
            await page.goto(searchUrl);
            await page.waitForTimeout(3000);
            
            // Get ticket keys from the list (up to 500 per project)
            const ticketKeys = await page.evaluate(() => {
                const keys = [];
                const rows = document.querySelectorAll('tr[data-issuekey], .issue-row');
                
                rows.forEach(row => {
                    const key = row.getAttribute('data-issuekey') || 
                               row.querySelector('.issuekey')?.textContent?.trim() ||
                               row.querySelector('a[href*="/browse/"]')?.textContent?.trim();
                    
                    if (key && (key.startsWith('ITSM-') || key.startsWith('DPSA-'))) {
                        keys.push(key);
                    }
                });
                
                return [...new Set(keys)].slice(0, 500); // Max 500 per project
            });
            
            console.log(`   Found ${ticketKeys.length} ${project} tickets`);
            
            // Extract full details for each ticket
            for (let i = 0; i < Math.min(ticketKeys.length, 500); i++) {
                const key = ticketKeys[i];
                console.log(`   Processing ${key} (${i + 1}/${Math.min(ticketKeys.length, 500)})`);
                
                try {
                    await page.goto(`${baseUrl}/jira/browse/${key}`);
                    await page.waitForTimeout(2000);
                    
                    const fullTicket = await page.evaluate(() => {
                        const getTextContent = (selector: string) => 
                            document.querySelector(selector)?.textContent?.trim() || '';
                        
                        const getMultipleTextContent = (selector: string) => 
                            Array.from(document.querySelectorAll(selector))
                                .map(el => el.textContent?.trim())
                                .filter(Boolean);
                        
                        // Extract all ticket data
                        const ticket: any = {
                            key: getTextContent('#key-val') || document.title.split(' - ')[0],
                            summary: getTextContent('#summary-val'),
                            description: getTextContent('#description-val'),
                            status: getTextContent('#status-val'),
                            priority: getTextContent('#priority-val'),
                            assignee: getTextContent('#assignee-val'),
                            reporter: getTextContent('#reporter-val'),
                            created: getTextContent('#created-val'),
                            updated: getTextContent('#updated-val'),
                            resolved: getTextContent('#resolved-val'),
                            project: getTextContent('#project-name-val'),
                            issueType: getTextContent('#type-val'),
                            environment: getTextContent('#environment-val'),
                            components: getMultipleTextContent('#components-val .value'),
                            labels: getMultipleTextContent('#labels-val .value'),
                            fixVersions: getMultipleTextContent('#fixfor-val .value'),
                            affectedVersions: getMultipleTextContent('#versions-val .value'),
                            customFields: {},
                            comments: [],
                            attachments: [],
                            worklog: []
                        };
                        
                        // Extract custom fields
                        document.querySelectorAll('.custom-field').forEach(field => {
                            const label = field.querySelector('.fieldlabel')?.textContent?.trim();
                            const value = field.querySelector('.fieldvalue')?.textContent?.trim();
                            if (label && value) {
                                ticket.customFields[label] = value;
                            }
                        });
                        
                        // Extract comments
                        document.querySelectorAll('.comment').forEach(comment => {
                            const author = comment.querySelector('.comment-author')?.textContent?.trim();
                            const created = comment.querySelector('.comment-date')?.textContent?.trim();
                            const body = comment.querySelector('.comment-body')?.textContent?.trim();
                            
                            if (author && body) {
                                ticket.comments.push({ author, created, body });
                            }
                        });
                        
                        // Extract attachments
                        document.querySelectorAll('.attachment-item').forEach(attachment => {
                            const name = attachment.querySelector('.attachment-title')?.textContent?.trim();
                            const size = attachment.querySelector('.attachment-size')?.textContent?.trim();
                            const created = attachment.querySelector('.attachment-date')?.textContent?.trim();
                            const author = attachment.querySelector('.attachment-author')?.textContent?.trim();
                            
                            if (name) {
                                ticket.attachments.push({ name, size, created, author });
                            }
                        });
                        
                        // Extract worklog
                        document.querySelectorAll('.worklog-item').forEach(work => {
                            const author = work.querySelector('.worklog-author')?.textContent?.trim();
                            const timeSpent = work.querySelector('.worklog-time')?.textContent?.trim();
                            const comment = work.querySelector('.worklog-comment')?.textContent?.trim();
                            const started = work.querySelector('.worklog-started')?.textContent?.trim();
                            
                            if (author && timeSpent) {
                                ticket.worklog.push({ author, timeSpent, comment, started });
                            }
                        });
                        
                        return ticket;
                    });
                    
                    allTickets.push(fullTicket);
                    
                    // Save progress every 50 tickets
                    if (allTickets.length % 50 === 0) {
                        console.log(`   💾 Progress: ${allTickets.length} tickets extracted`);
                    }
                    
                } catch (error) {
                    console.error(`   ❌ Error processing ${key}:`, error);
                }
                
                // Stop if we reach 1000 total tickets
                if (allTickets.length >= 1000) {
                    console.log('   🎯 Reached 1000 ticket limit');
                    break;
                }
            }
            
            if (allTickets.length >= 1000) break;
        }
        
        console.log(`\n📊 EXTRACTION COMPLETE: ${allTickets.length} full tickets`);
        
        // Save to file
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `uat-full-tickets-${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify({
            environment: 'UAT_UPGRADE_TESTING',
            url: 'https://jirauat.smedigitalapps.com',
            timestamp: new Date().toISOString(),
            purpose: 'JIRA upgrade testing - full ticket extraction',
            totalTickets: allTickets.length,
            projects: ['ITSM', 'DPSA'],
            tickets: allTickets
        }, null, 2));
        
        console.log(`💾 Saved full tickets to: ${filename}`);
        
        // Store in Supabase with full data and UAT flags
        console.log('📤 Storing in Supabase...');
        
        const supabaseTickets = allTickets.map(ticket => ({
            external_id: `UAT-FULL-${ticket.key}`,
            title: `[UAT FULL] ${ticket.summary}`,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            metadata: {
                environment: 'UAT',
                purpose: 'JIRA_UPGRADE_TESTING_FULL',
                extraction_type: 'COMPLETE_TICKET',
                original_key: ticket.key,
                project: ticket.project,
                assignee: ticket.assignee,
                reporter: ticket.reporter,
                created: ticket.created,
                updated: ticket.updated,
                resolved: ticket.resolved,
                issueType: ticket.issueType,
                components: ticket.components,
                labels: ticket.labels,
                fixVersions: ticket.fixVersions,
                affectedVersions: ticket.affectedVersions,
                environment_field: ticket.environment,
                customFields: ticket.customFields,
                comments: ticket.comments,
                attachments: ticket.attachments,
                worklog: ticket.worklog,
                source: 'uat-full-ticket-scraper',
                is_temporary: true,
                cleanup_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }
        }));
        
        // Insert in batches of 100
        for (let i = 0; i < supabaseTickets.length; i += 100) {
            const batch = supabaseTickets.slice(i, i + 100);
            const { error } = await supabase.from('jira_tickets').upsert(batch);
            
            if (error) {
                console.error(`❌ Batch ${Math.floor(i/100) + 1} error:`, error);
            } else {
                console.log(`✅ Stored batch ${Math.floor(i/100) + 1}: ${batch.length} tickets`);
            }
        }
        
        console.log(`\n🎉 SUCCESS: ${allTickets.length} full tickets stored in Supabase`);
        console.log('🏷️  All tickets flagged as UAT and temporary');
        console.log('🧹 Use cleanup script to remove when testing complete');
        
    } catch (error) {
        console.error('❌ Error during extraction:', error);
    } finally {
        console.log('🔄 Keeping browser open for inspection...');
    }
}

uatFullTicketScraper();
