import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function uatITSMDPSAScraper() {
    console.log('🎯 UAT ITSM & DPSA FOCUSED SCRAPER');
    console.log('================================================================================');
    console.log('🔐 Using saved session (no re-login needed)');
    console.log('🎫 ONLY extracting ITSM and DPSA tickets');
    console.log('💾 Store in Supabase with UAT flags');
    console.log('🧠 Vectorize for search');
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
                console.log('✅ Session cookies loaded - no login required!');
            }
        }
        
        const page = await context.newPage();
        
        console.log('🔗 Starting to collect 1000 tickets per project...');
        
        // We'll collect tickets for each project separately to ensure we get 1000 from each
        const targetProjects = ['ITSM', 'DPSA', 'DPSO']; // Include DPSO in case DPSA is actually DPSO
        let allTickets = [];
        
        for (const project of targetProjects) {
            console.log(`\n🎯 Collecting up to 1000 ${project} tickets...`);
            
            // Use pagination to get more tickets - JIRA typically shows 50 per page
            for (let startAt = 0; startAt < 1000; startAt += 50) {
                console.log(`   📄 Page ${Math.floor(startAt/50) + 1}: tickets ${startAt + 1}-${Math.min(startAt + 50, 1000)}`);
                
                const jqlQuery = `project=${project}&startAt=${startAt}&maxResults=50`;
                const url = `https://jirauat.smedigitalapps.com/jira/issues/?jql=${encodeURIComponent(`project = ${project} ORDER BY created DESC`)}&startAt=${startAt}`;
                
                await page.goto(url);
                await page.waitForTimeout(3000);
                
                const pageTickets = await page.evaluate(() => {
                    const tickets = [];
                    
                    // Try multiple selectors
                    const ticketSelectors = [
                        'tr[data-issuekey]',
                        '.issue-table tbody tr',
                        '.navigator-issue-only',
                        '.issue-list .issue'
                    ];
                    
                    for (const selector of ticketSelectors) {
                        const rows = document.querySelectorAll(selector);
                        if (rows.length > 0) {
                            rows.forEach(row => {
                                let key = row.getAttribute('data-issuekey') || 
                                         row.getAttribute('data-issue-key') ||
                                         row.querySelector('.issuekey, .issue-link')?.textContent?.trim();
                                
                                if (!key) {
                                    const link = row.querySelector('a[href*="/browse/"]') as HTMLAnchorElement;
                                    if (link) {
                                        const match = link.href.match(/\/browse\/([A-Z]+-\d+)/);
                                        if (match) key = match[1];
                                    }
                                }
                                
                                if (key && key.match(/^[A-Z]+-\d+$/)) {
                                    tickets.push({
                                        key,
                                        project: key.split('-')[0],
                                        summary: row.querySelector('.summary a, .issue-link-summary, h3 a')?.textContent?.trim() || '',
                                        status: row.querySelector('.status span, .issue-status')?.textContent?.trim() || '',
                                        assignee: row.querySelector('.assignee, .issue-assignee')?.textContent?.trim() || '',
                                        reporter: row.querySelector('.reporter, .issue-reporter')?.textContent?.trim() || '',
                                        created: row.querySelector('.created, .issue-created')?.textContent?.trim() || '',
                                        updated: row.querySelector('.updated, .issue-updated')?.textContent?.trim() || '',
                                        priority: row.querySelector('.priority, .issue-priority')?.textContent?.trim() || '',
                                        description: row.querySelector('.description, .issue-description')?.textContent?.trim() || ''
                                    });
                                }
                            });
                            break;
                        }
                    }
                    
                    return tickets;
                });
                
                // Filter to only include current project tickets
                const projectTickets = pageTickets.filter(ticket => ticket.project === project);
                allTickets.push(...projectTickets);
                
                console.log(`   ✅ Found ${projectTickets.length} ${project} tickets on this page`);
                
                // If we got less than 50 tickets, we've reached the end
                if (projectTickets.length < 50) {
                    console.log(`   📋 Reached end of ${project} tickets (${projectTickets.length} < 50)`);
                    break;
                }
                
                // If we have 1000+ tickets for this project, stop
                const currentProjectCount = allTickets.filter(t => t.project === project).length;
                if (currentProjectCount >= 1000) {
                    console.log(`   🎯 Collected 1000+ ${project} tickets, moving to next project`);
                    break;
                }
            }
            
            const finalProjectCount = allTickets.filter(t => t.project === project).length;
            console.log(`📊 Total ${project} tickets collected: ${finalProjectCount}`);
        }
        
        // Check if we're still logged in
        const loginCheck = await page.evaluate(() => {
            const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
            const hasLoginForm = document.querySelector('input[type="email"], input[type="password"]') !== null;
            return !hasLoginForm && hasJiraInterface;
        });
        
        if (!loginCheck) {
            console.log('❌ Session expired - running full login...');
            
            // Go to login page
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
            await page.waitForTimeout(3000);
            
            // Click login button
            await page.click('a.aui-nav-link.login-link[href*="login.jsp"]');
            await page.waitForTimeout(3000);
            
            // Auto login flow
            let step = 1;
            let isLoggedIn = false;
            const maxSteps = 15;
            
            while (!isLoggedIn && step <= maxSteps) {
                console.log(`🔍 Login Step ${step}...`);
                
                const state = await page.evaluate(() => {
                    const bodyText = document.body?.textContent?.toLowerCase() || '';
                    const usernameField = document.querySelector('input[placeholder="Username"]:not([disabled])');
                    const emailField = document.querySelector('input[type="email"], input[name="loginfmt"]');
                    const passwordField = document.querySelector('input[type="password"], input[name="passwd"]');
                    
                    const hasJiraInterface = document.querySelector('.aui-nav, .navigator-content, #header') !== null;
                    const hasIssuesNav = document.querySelector('a[href*="issues"]') !== null;
                    const noLoginElements = !usernameField && !emailField && !passwordField;
                    
                    return {
                        loggedIn: (hasJiraInterface || hasIssuesNav) && noLoginElements,
                        needsUsername: !!usernameField,
                        needsEmail: !!emailField,
                        needsPassword: !!passwordField,
                        is2FA: bodyText.includes('verification') || bodyText.includes('approve')
                    };
                });
                
                if (state.loggedIn) {
                    isLoggedIn = true;
                    console.log('✅ LOGIN SUCCESS!');
                    
                    // Save new session
                    const cookies = await context.cookies();
                    fs.writeFileSync('uat-jira-session.json', JSON.stringify({
                        cookies,
                        timestamp: new Date().toISOString()
                    }, null, 2));
                    console.log('💾 Session saved');
                    break;
                }
                
                if (state.needsUsername) {
                    console.log('   🔤 Username: mcarpent');
                    await page.fill('input[placeholder="Username"]', 'mcarpent');
                    await page.waitForTimeout(1000);
                    await page.press('input[placeholder="Username"]', 'Enter');
                    
                } else if (state.needsEmail) {
                    console.log('   📧 Email: matt.carpenter.ext@sonymusic.com');
                    try {
                        await page.fill('input[type="email"]', 'matt.carpenter.ext@sonymusic.com');
                    } catch {
                        await page.fill('input[name="loginfmt"]', 'matt.carpenter.ext@sonymusic.com');
                    }
                    await page.waitForTimeout(1000);
                    await page.press('input[type="email"], input[name="loginfmt"]', 'Enter');
                    
                } else if (state.needsPassword) {
                    console.log('   🔒 Password');
                    try {
                        await page.fill('input[type="password"]', 'Dooley1_Jude2');
                    } catch {
                        await page.fill('input[name="passwd"]', 'Dooley1_Jude2');
                    }
                    await page.waitForTimeout(1000);
                    await page.press('input[type="password"], input[name="passwd"]', 'Enter');
                    
                } else if (state.is2FA) {
                    console.log('   📱 2FA - please approve on phone');
                    await page.waitForTimeout(10000);
                    
                } else {
                    console.log('   ⏳ Waiting...');
                    await page.waitForTimeout(3000);
                }
                
                step++;
                await page.waitForTimeout(2000);
            }
            
            if (!isLoggedIn) {
                console.log('❌ Login failed');
                return;
            }
            
            // Navigate to filtered tickets
            await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20in%20(ITSM%2C%20DPSA%2C%20DPSO)%20ORDER%20BY%20created%20DESC');
            await page.waitForTimeout(4000);
        }
        
        console.log('\n📊 DEDUPLICATING AND FINALIZING TICKETS...');
        
        // Deduplicate tickets by key
        const ticketMap = new Map();
        allTickets.forEach(ticket => {
            if (!ticketMap.has(ticket.key)) {
                ticketMap.set(ticket.key, ticket);
            }
        });
        
        const uniqueTickets = Array.from(ticketMap.values());
        const projects = [...new Set(uniqueTickets.map(t => t.project))];
        
        console.log(`📊 COLLECTION RESULTS:`);
        console.log(`   🏗️ Projects found: ${projects.join(', ')}`);
        console.log(`   📦 Total tickets collected: ${allTickets.length}`);
        console.log(`   ✅ Unique tickets after deduplication: ${uniqueTickets.length}`);
        
        // Show breakdown by project
        projects.forEach(project => {
            const count = uniqueTickets.filter(t => t.project === project).length;
            console.log(`   📊 ${project}: ${count} tickets`);
        });
        
        if (uniqueTickets.length === 0) {
            console.log('❌ No tickets found');
            return;
        }

        
        // Save filtered results
        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `uat-itsm-dpsa-${timestamp}.json`;
        
        const filteredData = {
            environment: 'UAT',
            purpose: 'ITSM_DPSA_1000_EACH',
            url: 'https://jirauat.smedigitalapps.com',
            timestamp: new Date().toISOString(),
            projects: projects,
            totalTickets: uniqueTickets.length,
            tickets: uniqueTickets
        };
        
        fs.writeFileSync(filename, JSON.stringify(filteredData, null, 2));
        console.log(`💾 Saved filtered data: ${filename}`);
        
        // Store in Supabase with UAT marking and vectorization
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.log('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
            console.log('📝 Please add it to your .env file');
            return;
        }
        
        console.log('\n📤 STORING IN SUPABASE WITH UAT MARKING...');
        
        const supabase = createClient(
            'https://kfxetwuuzljhybfgmpuc.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        // Initialize OpenAI for vectorization
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        
        const uatTickets = [];
        
        for (const ticket of uniqueTickets) {
            console.log(`🧠 Vectorizing: ${ticket.key}`);
            
            // Create text for vectorization
            const ticketText = `${ticket.summary} ${ticket.description} ${ticket.status} ${ticket.priority}`.trim();
            
            let embedding = null;
            try {
                const response = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: ticketText
                });
                embedding = response.data[0].embedding;
            } catch (error) {
                console.log(`   ⚠️ Vectorization failed for ${ticket.key}: ${error.message}`);
            }
            
            uatTickets.push({
                external_id: `UAT-${ticket.key}`,
                title: `[UAT] ${ticket.summary}`,
                status: ticket.status,
                priority: ticket.priority,
                embedding,
                metadata: {
                    environment: 'UAT',
                    purpose: 'ITSM_DPSA_FOCUSED_EXTRACTION',
                    original_key: ticket.key,
                    project: ticket.project,
                    assignee: ticket.assignee,
                    reporter: ticket.reporter,
                    created: ticket.created,
                    updated: ticket.updated,
                    source: 'uat-itsm-dpsa-scraper',
                    is_temporary: true,
                    is_uat: true,
                    extraction_date: new Date().toISOString(),
                    vectorized: !!embedding,
                    full_content: ticketText,
                    description: ticket.description
                }
            });
        }
        
        console.log('\n📦 BATCH UPLOADING TO SUPABASE...');
        
        for (let i = 0; i < uatTickets.length; i += 25) {
            const batch = uatTickets.slice(i, i + 25);
            const { error } = await supabase.from('jira_tickets').upsert(batch);
            
            if (error) {
                console.error(`❌ Batch ${Math.floor(i/25) + 1} error:`, error);
            } else {
                console.log(`✅ Batch ${Math.floor(i/25) + 1}: ${batch.length} UAT tickets stored`);
            }
        }
        
        const vectorizedCount = uatTickets.filter(t => t.embedding).length;
        
        console.log('\n🎉 SUCCESS SUMMARY:');
        console.log(`   🎫 ITSM & DPSA tickets extracted: ${uniqueTickets.length}`);
        console.log(`   🧠 Vectorized: ${vectorizedCount}/${uniqueTickets.length}`);
        console.log(`   💾 Stored in Supabase with UAT flags`);
        console.log(`   🏷️ All marked as environment: UAT, is_uat: true`);
        console.log(`   💾 Session saved for next run`);
        
        // Project breakdown  
        const breakdown = projects.map(proj => {
            const count = uniqueTickets.filter(t => t.project === proj).length;
            return `${proj}: ${count}`;
        }).join(', ');
        console.log(`   📊 Breakdown: ${breakdown}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Browser will close in 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        await browser.close();
    }
}

uatITSMDPSAScraper();
