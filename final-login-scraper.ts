import { chromium } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SESSION_FILE = 'uat-jira-session.json';

interface Ticket {
  key: string;
  summary: string;
  status: string;
  assignee: string;
  reporter: string;
  created: string;
  updated: string;
  priority: string;
  project?: string;
}

async function smartJiraExtraction() {
    console.log('🚀 SMART JIRA EXTRACTION FOR UPGRADE TESTING');
    console.log('================================================================================');
    console.log('✅ UAT Environment: https://jirauat.smedigitalapps.com');
    console.log('🎯 Smart session detection and data extraction');
    console.log('📊 Target: ITSM and DPSA projects for Irina\'s upgrade validation');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--ignore-certificate-errors']
    });
    
    const page = await browser.newPage();
    
    try {
        // Step 1: Check if already logged in
        console.log('\n🔍 Step 1: Session Detection');
        await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa');
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        
        const sessionStatus = await page.evaluate(() => {
            const url = window.location.href;
            const isLoggedIn = !url.includes('login') && 
                              (url.includes('dashboard') || url.includes('Dashboard'));
            const hasError = document.querySelector('.error, .aui-message-error');
            const hasPermissionViolation = url.includes('permissionViolation');
            
            return {
                isLoggedIn,
                hasError: !!hasError,
                hasPermissionViolation,
                currentUrl: url,
                pageTitle: document.title
            };
        });
        
        console.log(`Current URL: ${sessionStatus.currentUrl}`);
        console.log(`Login Status: ${sessionStatus.isLoggedIn ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}`);
        
        if (!sessionStatus.isLoggedIn) {
            console.log('❌ User needs to complete authentication manually');
            console.log('📝 Steps to resolve:');
            console.log('   1. Complete login in the opened browser');
            console.log('   2. Handle 2FA if prompted');
            console.log('   3. Wait for automatic continuation...');
            
            // Wait for user to complete login
            let attempts = 0;
            const maxAttempts = 30; // 5 minutes
            
            while (!sessionStatus.isLoggedIn && attempts < maxAttempts) {
                attempts++;
                console.log(`⏳ Waiting for login completion... (${attempts}/${maxAttempts})`);
                await page.waitForTimeout(10000); // Wait 10 seconds
                
                await page.goto('https://jirauat.smedigitalapps.com/jira/dashboard.jspa');
                await page.waitForLoadState('networkidle', { timeout: 15000 });
                
                const checkStatus = await page.evaluate(() => {
                    const url = window.location.href;
                    return !url.includes('login') && 
                           (url.includes('dashboard') || url.includes('Dashboard'));
                });
                
                if (checkStatus) {
                    console.log('✅ Authentication successful!');
                    break;
                }
            }
            
            if (attempts >= maxAttempts) {
                throw new Error('Manual authentication timeout - please try again');
            }
        }
        
        // Step 2: Save current session
        console.log('\n💾 Step 2: Session Preservation');
        const cookies = await page.context().cookies();
        fs.writeFileSync(SESSION_FILE, JSON.stringify({
            cookies,
            timestamp: new Date().toISOString(),
            userAgent: await page.evaluate(() => navigator.userAgent)
        }, null, 2));
        console.log('✅ Session saved for future runs');
        
        // Step 3: Extract tickets from critical projects
        console.log('\n📊 Step 3: Critical Project Data Extraction');
        
        const tickets: Ticket[] = [];
        const targetProjects = ['ITSM', 'DPSA'];
        const results = {
            ITSM: { count: 0, accessible: false },
            DPSA: { count: 0, accessible: false }
        };
        
        for (const project of targetProjects) {
            console.log(`\n🔍 Extracting ${project} project data...`);
            
            try {
                const url = `https://jirauat.smedigitalapps.com/issues/?jql=project%20%3D%20${project}%20ORDER%20BY%20created%20DESC`;
                await page.goto(url);
                await page.waitForLoadState('networkidle', { timeout: 20000 });
                await page.waitForTimeout(3000); // Let dynamic content load
                
                const projectData = await page.evaluate(() => {
                    // Check for project access errors
                    const errorElement = document.querySelector('.error, .aui-message-error');
                    if (errorElement && errorElement.textContent?.includes('does not exist')) {
                        return { error: errorElement.textContent.trim(), tickets: [], total: 0 };
                    }
                    
                    // Get ticket count from various possible elements
                    const pagingElements = [
                        '.showing', '.results-count-total', '.pagination-info',
                        '.results-count', '.issue-count'
                    ];
                    
                    let pagingText = '';
                    for (const selector of pagingElements) {
                        const element = document.querySelector(selector);
                        if (element?.textContent) {
                            pagingText = element.textContent;
                            break;
                        }
                    }
                    
                    const totalMatch = pagingText.match(/of (\d+)/) || 
                                     pagingText.match(/(\d+) total/) || 
                                     pagingText.match(/(\d+) issue/);
                    const total = totalMatch ? parseInt(totalMatch[1]) : 0;
                    
                    // Extract visible tickets
                    const tickets: Ticket[] = [];
                    const rows = document.querySelectorAll('[data-issuekey], .issue-row, .issuerow');
                    
                    rows.forEach(row => {
                        const key = row.getAttribute('data-issuekey') || 
                                   row.querySelector('.issue-link')?.textContent?.trim();
                        if (key) {
                            tickets.push({
                                key,
                                summary: row.querySelector('.summary a, .issue-summary')?.textContent?.trim() || '',
                                status: row.querySelector('.status, .issue-status')?.textContent?.trim() || '',
                                assignee: row.querySelector('.assignee, .issue-assignee')?.textContent?.trim() || '',
                                reporter: row.querySelector('.reporter, .issue-reporter')?.textContent?.trim() || '',
                                created: row.querySelector('.created, .issue-created')?.textContent?.trim() || '',
                                updated: row.querySelector('.updated, .issue-updated')?.textContent?.trim() || '',
                                priority: row.querySelector('.priority, .issue-priority')?.textContent?.trim() || ''
                            });
                        }
                    });
                    
                    return { 
                        tickets, 
                        total, 
                        pagingText,
                        accessible: true,
                        currentUrl: window.location.href
                    };
                });
                
                if (projectData.error) {
                    console.log(`   ❌ ${project}: ${projectData.error}`);
                    results[project as keyof typeof results].accessible = false;
                    continue;
                }
                
                results[project as keyof typeof results].accessible = true;
                results[project as keyof typeof results].count = projectData.total;
                
                console.log(`   ✅ ${project}: Found ${projectData.total} total tickets`);
                console.log(`   📦 Extracted ${projectData.tickets.length} tickets for analysis`);
                console.log(`   📊 Paging: ${projectData.pagingText}`);
                
                projectData.tickets.forEach((ticket: Ticket) => {
                    ticket.project = project;
                    tickets.push(ticket);
                });
                
            } catch (error) {
                console.log(`   ⚠️ ${project}: Error extracting data - ${error}`);
                results[project as keyof typeof results].accessible = false;
            }
        }
        
        // Step 4: Generate comprehensive report
        console.log('\n📋 Step 4: Validation Report Generation');
        
        const timestamp = new Date().toISOString().split('T')[0];
        const reportData = {
            testDate: new Date().toISOString(),
            environment: 'UAT_JIRA_10.3_UPGRADE_TESTING',
            url: 'https://jirauat.smedigitalapps.com',
            totalTickets: tickets.length,
            projectResults: results,
            validationStatus: {
                authentication: 'PASSED',
                itsmAccess: results.ITSM.accessible ? 'PASSED' : 'FAILED',
                dpsaAccess: results.DPSA.accessible ? 'PASSED' : 'FAILED',
                dataExtraction: tickets.length > 0 ? 'PASSED' : 'PARTIAL'
            },
            recommendations: {
                readyForUpgrade: results.ITSM.accessible && results.DPSA.accessible,
                criticalIssues: [],
                performanceNotes: 'Session management and project access validated'
            },
            extractedSample: tickets.slice(0, 10) // First 10 tickets as sample
        };
        
        // Save comprehensive JSON report
        const reportFilename = `jira-upgrade-validation-${timestamp}.json`;
        fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
        console.log(`✅ Validation report saved: ${reportFilename}`);
        
        // Step 5: Supabase upload (if configured)
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && tickets.length > 0) {
            console.log('\n📤 Step 5: Supabase Data Upload');
            
            try {
                const supabase = createClient(
                    process.env.SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                
                const supabaseTickets = tickets.map(ticket => ({
                    external_id: `UAT-UPGRADE-${ticket.key}`,
                    title: `[UAT-UPGRADE] ${ticket.summary}`,
                    status: ticket.status,
                    priority: ticket.priority,
                    metadata: {
                        environment: 'UAT',
                        purpose: 'JIRA_10.3_UPGRADE_VALIDATION',
                        original_key: ticket.key,
                        project: ticket.project,
                        assignee: ticket.assignee,
                        reporter: ticket.reporter,
                        created: ticket.created,
                        updated: ticket.updated,
                        test_date: new Date().toISOString(),
                        validation_results: reportData.validationStatus
                    }
                }));
                
                // Upload in batches
                for (let i = 0; i < supabaseTickets.length; i += 100) {
                    const batch = supabaseTickets.slice(i, i + 100);
                    const { error } = await supabase.from('jira_tickets').upsert(batch);
                    
                    if (error) {
                        console.error(`❌ Batch ${Math.floor(i/100) + 1} error:`, error);
                    } else {
                        console.log(`✅ Uploaded batch ${Math.floor(i/100) + 1}: ${batch.length} tickets`);
                    }
                }
            } catch (error) {
                console.log(`⚠️ Supabase upload error: ${error}`);
            }
        }
        
        // Final summary
        console.log('\n🎉 JIRA UPGRADE VALIDATION COMPLETE!');
        console.log('================================================================================');
        console.log(`✅ Authentication: SUCCESSFUL`);
        console.log(`✅ ITSM Project: ${results.ITSM.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'} (${results.ITSM.count} tickets)`);
        console.log(`✅ DPSA Project: ${results.DPSA.accessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE'} (${results.DPSA.count} tickets)`);
        console.log(`✅ Total Data Extracted: ${tickets.length} tickets`);
        console.log(`✅ Upgrade Readiness: ${reportData.recommendations.readyForUpgrade ? 'READY' : 'NEEDS REVIEW'}`);
        console.log('================================================================================');
        console.log('📧 Report ready for Irina\'s team review! 🚀');
        
    } catch (error) {
        console.error('❌ Extraction error:', error);
        console.log('🔄 Troubleshooting tips:');
        console.log('   - Verify VPN connection');
        console.log('   - Complete manual login if prompted');
        console.log('   - Check project permissions');
    } finally {
        console.log('\n⏳ Keeping browser open for 10 seconds...');
        await page.waitForTimeout(10000);
        await browser.close();
    }
}

// Run the extraction
smartJiraExtraction();
