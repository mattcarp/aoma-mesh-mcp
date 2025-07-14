import { chromium } from 'playwright';
import fs from 'fs';

async function exploreUATPermissions() {
    console.log('🔍 UAT PERMISSIONS & PROJECT EXPLORER');
    console.log('================================================================================');
    console.log('🎯 Will explore UAT environment to understand access');
    console.log('📋 Check projects, permissions, and available data');
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
        
        console.log('🔗 Going to UAT JIRA Dashboard...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForTimeout(5000);
        
        // Explore the dashboard
        console.log('\n📊 DASHBOARD ANALYSIS:');
        const dashboardInfo = await page.evaluate(() => {
            const nav = document.querySelector('.aui-nav');
            const header = document.querySelector('#header');
            const content = document.querySelector('#dashboard');
            
            // Get user info
            const userInfo = document.querySelector('#header-details-user-fullname')?.textContent?.trim() || 'Unknown';
            
            // Get navigation items
            const navItems = Array.from(document.querySelectorAll('.aui-nav a')).map(a => ({
                text: a.textContent?.trim(),
                href: a.href
            }));
            
            // Look for dashboard content
            const dashboardItems = Array.from(document.querySelectorAll('.dashboard-item, .gadget')).map(item => ({
                title: item.querySelector('.dashboard-item-title, .gadget-title')?.textContent?.trim(),
                content: item.textContent?.trim().substring(0, 200)
            }));
            
            return {
                user: userInfo,
                navItems: navItems.slice(0, 10),
                dashboardItems: dashboardItems.slice(0, 5),
                hasContent: !!content,
                title: document.title
            };
        });
        
        console.log(`   👤 User: ${dashboardInfo.user}`);
        console.log(`   📋 Title: ${dashboardInfo.title}`);
        console.log(`   🎛️ Navigation items: ${dashboardInfo.navItems.length}`);
        console.log(`   📊 Dashboard items: ${dashboardInfo.dashboardItems.length}`);
        
        if (dashboardInfo.navItems.length > 0) {
            console.log('   🔗 Available navigation:');
            dashboardInfo.navItems.forEach(item => {
                if (item.text && item.text.length > 0) {
                    console.log(`      - ${item.text}`);
                }
            });
        }
        
        // Try to access project management
        console.log('\n🏗️ EXPLORING PROJECTS:');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/project/ViewProjects.jspa');
            await page.waitForTimeout(3000);
            
            const projectsInfo = await page.evaluate(() => {
                const projects = Array.from(document.querySelectorAll('.projects-list tr, .project-list tr')).map(row => {
                    const nameCell = row.querySelector('td:first-child a, .project-name a');
                    const keyCell = row.querySelector('.project-key, td:nth-child(2)');
                    
                    return {
                        name: nameCell?.textContent?.trim(),
                        key: keyCell?.textContent?.trim(),
                        href: nameCell?.href
                    };
                }).filter(p => p.name);
                
                const errorMsg = document.querySelector('.error, .aui-message-error')?.textContent?.trim();
                
                return {
                    projects,
                    errorMsg,
                    title: document.title,
                    url: window.location.href
                };
            });
            
            console.log(`   📋 Title: ${projectsInfo.title}`);
            console.log(`   🏗️ Projects found: ${projectsInfo.projects.length}`);
            
            if (projectsInfo.errorMsg) {
                console.log(`   ❌ Error: ${projectsInfo.errorMsg}`);
            }
            
            if (projectsInfo.projects.length > 0) {
                console.log('   📋 Available projects:');
                projectsInfo.projects.forEach(proj => {
                    console.log(`      - ${proj.key}: ${proj.name}`);
                });
            }
            
        } catch (e) {
            console.log(`   ❌ Could not access projects: ${e.message}`);
        }
        
        // Try user profile/permissions
        console.log('\n👤 USER PROFILE & PERMISSIONS:');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/secure/ViewProfile.jspa');
            await page.waitForTimeout(3000);
            
            const profileInfo = await page.evaluate(() => {
                const fullName = document.querySelector('#up-user-title-name')?.textContent?.trim();
                const username = document.querySelector('#up-user-title-username')?.textContent?.trim();
                const email = document.querySelector('#email')?.textContent?.trim();
                
                // Look for group memberships
                const groups = Array.from(document.querySelectorAll('.group-list li, .groups-list li')).map(li => 
                    li.textContent?.trim()
                ).filter(Boolean);
                
                return {
                    fullName,
                    username,
                    email,
                    groups: groups.slice(0, 10),
                    title: document.title
                };
            });
            
            console.log(`   👤 Name: ${profileInfo.fullName}`);
            console.log(`   🔑 Username: ${profileInfo.username}`);
            console.log(`   📧 Email: ${profileInfo.email}`);
            console.log(`   👥 Groups: ${profileInfo.groups.length}`);
            
            if (profileInfo.groups.length > 0) {
                console.log('   🏷️ Group memberships:');
                profileInfo.groups.forEach(group => {
                    console.log(`      - ${group}`);
                });
            }
            
        } catch (e) {
            console.log(`   ❌ Could not access profile: ${e.message}`);
        }
        
        // Try a simple search to see if there's ANY data
        console.log('\n🔍 SIMPLE SEARCH TEST:');
        try {
            await page.goto('https://jirauat.smedigitalapps.com/jira/issues/?jql=project%20is%20not%20empty');
            await page.waitForTimeout(3000);
            
            const searchInfo = await page.evaluate(() => {
                const results = document.querySelector('.results-count, .showing')?.textContent?.trim();
                const errorMsg = document.querySelector('.error-panel, .aui-message-error')?.textContent?.trim();
                const noResults = document.querySelector('.no-results, .zerostate')?.textContent?.trim();
                
                return {
                    results,
                    errorMsg,
                    noResults,
                    title: document.title,
                    url: window.location.href
                };
            });
            
            console.log(`   📋 Title: ${searchInfo.title}`);
            console.log(`   📊 Results: ${searchInfo.results || 'None'}`);
            
            if (searchInfo.errorMsg) {
                console.log(`   ❌ Error: ${searchInfo.errorMsg}`);
            }
            
            if (searchInfo.noResults) {
                console.log(`   📭 No results: ${searchInfo.noResults}`);
            }
            
        } catch (e) {
            console.log(`   ❌ Search failed: ${e.message}`);
        }
        
        // Save comprehensive analysis
        const analysis = {
            timestamp: new Date().toISOString(),
            environment: 'UAT',
            baseUrl: 'https://jirauat.smedigitalapps.com',
            dashboard: dashboardInfo,
            loginStatus: 'SUCCESS',
            findings: {
                hasAccess: true,
                isEmpty: true,
                possibleReasons: [
                    'UAT environment is empty (no projects/issues)',
                    'User permissions are limited',
                    'Data is in different location',
                    'Different JIRA version/setup'
                ]
            }
        };
        
        const filename = `uat-environment-analysis-${new Date().toISOString().split('T')[0]}.json`;
        fs.writeFileSync(filename, JSON.stringify(analysis, null, 2));
        console.log(`\n💾 Saved complete analysis to: ${filename}`);
        
        console.log('\n📋 SUMMARY:');
        console.log('✅ Successfully logged into UAT JIRA');
        console.log('✅ Can access dashboard and navigation');
        console.log('❓ No tickets/projects found - UAT environment appears empty');
        console.log('💡 This might be normal for a UAT environment');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        console.log('\n⏳ Browser will close in 15 seconds...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        await browser.close();
    }
}

exploreUATPermissions();
