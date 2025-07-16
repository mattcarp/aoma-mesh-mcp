import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const JIRA_BASE_URL = 'https://jirauat.smedigitalapps.com';
const SESSION_FILE = 'jira-uat-session-1752610130300.json'; // Use existing session

// Supabase setup
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase not configured - will save locally only');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface DiscoveryResult {
    url: string;
    title: string;
    type: 'project' | 'dashboard' | 'search' | 'admin' | 'user' | 'workflow' | 'screen' | 'report' | 'unknown';
    accessible: boolean;
    loadTime: number;
    elementCount: number;
    links: string[];
    forms: string[];
    data: any;
    timestamp: string;
}

interface ProjectInfo {
    key: string;
    name: string;
    type: string;
    lead: string;
    ticketCount: number;
    workflows: string[];
    issueTypes: string[];
    customFields: string[];
}

class JiraExplorer {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;
    private page: Page | null = null;
    private discoveries: DiscoveryResult[] = [];
    private projects: ProjectInfo[] = [];
    private exploredUrls = new Set<string>();

    async initialize() {
        console.log('🚀 Initializing JIRA Explorer...');
        
        // Load saved session
        if (!fs.existsSync(SESSION_FILE)) {
            throw new Error(`Session file ${SESSION_FILE} not found. Run manual-login-wait.ts first!`);
        }
        
        const sessionData = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
        console.log(`📁 Loaded session from ${sessionData.timestamp}`);
        
        this.browser = await chromium.launch({ 
            headless: false, // Keep visible for debugging
            args: ['--start-maximized']
        });
        
        this.context = await this.browser.newContext({
            viewport: null,
            userAgent: sessionData.userAgent
        });
        
        // Restore session cookies
        await this.context.addCookies(sessionData.cookies);
        this.page = await this.context.newPage();
        
        console.log('✅ Session restored successfully');
    }

    async discoverProjects(): Promise<ProjectInfo[]> {
        console.log('\n🔍 PHASE 1: Discovering all projects...');
        
        if (!this.page) throw new Error('Page not initialized');
        
        const projects: ProjectInfo[] = [];
        
        // Try multiple approaches to find projects
        const projectDiscoveryUrls = [
            '/jira/secure/BrowseProjects.jspa',
            '/jira/projects',
            '/jira/browse',
            '/jira/rest/api/2/project',
            '/jira/secure/project/ViewProjects.jspa'
        ];
        
        for (const url of projectDiscoveryUrls) {
            try {
                console.log(`🔍 Checking: ${url}`);
                await this.page.goto(`${JIRA_BASE_URL}${url}`);
                await this.page.waitForTimeout(2000);
                
                const currentUrl = this.page.url();
                if (currentUrl.includes('login') || currentUrl.includes('permissionViolation')) {
                    console.log('⚠️  Authentication issue, skipping...');
                    continue;
                }
                
                // API endpoint - parse JSON
                if (url.includes('/rest/api/')) {
                    const content = await this.page.textContent('body');
                    if (content && content.trim().startsWith('[')) {
                        const projectsData = JSON.parse(content);
                        for (const proj of projectsData) {
                            projects.push({
                                key: proj.key,
                                name: proj.name,
                                type: proj.projectTypeKey || 'unknown',
                                lead: proj.lead?.displayName || 'unknown',
                                ticketCount: 0, // Will discover later
                                workflows: [],
                                issueTypes: [],
                                customFields: []
                            });
                        }
                        console.log(`✅ API discovered ${projectsData.length} projects`);
                        break;
                    }
                } else {
                    // HTML page - scrape project links
                    const projectLinks = await this.page.$$eval('a[href*="/browse/"]', links => 
                        links.map(link => ({
                            href: link.getAttribute('href'),
                            text: link.textContent?.trim()
                        })).filter(link => link.href && link.href.match(/\/browse\/[A-Z]+$/))
                    );
                    
                    for (const link of projectLinks) {
                        const match = link.href?.match(/\/browse\/([A-Z]+)$/);
                        if (match) {
                            const projectKey = match[1];
                            if (!projects.find(p => p.key === projectKey)) {
                                projects.push({
                                    key: projectKey,
                                    name: link.text || projectKey,
                                    type: 'unknown',
                                    lead: 'unknown',
                                    ticketCount: 0,
                                    workflows: [],
                                    issueTypes: [],
                                    customFields: []
                                });
                            }
                        }
                    }
                    
                    if (projectLinks.length > 0) {
                        console.log(`✅ HTML scraping found ${projectLinks.length} project links`);
                    }
                }
                
            } catch (error) {
                console.log(`❌ Failed to access ${url}:`, error.message);
            }
        }
        
        // Also check for projects mentioned in existing ticket data
        const ticketFiles = ['dpsa-tickets.json', 'all-dpsa-tickets.json', 'jira-issues.json'];
        for (const file of ticketFiles) {
            if (fs.existsSync(file)) {
                try {
                    const ticketData = JSON.parse(fs.readFileSync(file, 'utf8'));
                    const tickets = Array.isArray(ticketData) ? ticketData : ticketData.issues || [];
                    
                    for (const ticket of tickets) {
                        const projectKey = ticket.key?.split('-')[0] || ticket.project?.key;
                        if (projectKey && !projects.find(p => p.key === projectKey)) {
                            projects.push({
                                key: projectKey,
                                name: ticket.project?.name || projectKey,
                                type: 'discovered-from-tickets',
                                lead: 'unknown',
                                ticketCount: 0,
                                workflows: [],
                                issueTypes: [],
                                customFields: []
                            });
                        }
                    }
                    console.log(`📄 Found additional projects in ${file}`);
                } catch (error) {
                    console.log(`⚠️  Could not parse ${file}`);
                }
            }
        }
        
        this.projects = projects;
        console.log(`\n🎯 DISCOVERED ${projects.length} PROJECTS:`);
        projects.forEach(p => console.log(`   - ${p.key}: ${p.name}`));
        
        return projects;
    }

    async exploreProject(project: ProjectInfo): Promise<void> {
        console.log(`\n🔍 EXPLORING PROJECT: ${project.key} (${project.name})`);
        
        if (!this.page) throw new Error('Page not initialized');
        
        const projectUrls = [
            `/jira/browse/${project.key}`,
            `/jira/projects/${project.key}`,
            `/jira/secure/project/ViewProject.jspa?pid=${project.key}`,
            `/jira/issues/?jql=project=${project.key}`,
            `/jira/rest/api/2/project/${project.key}`,
            `/jira/rest/api/2/search?jql=project=${project.key}&maxResults=1`
        ];
        
        for (const url of projectUrls) {
            await this.exploreUrl(url, 'project');
        }
        
        // Try to get ticket count
        try {
            await this.page.goto(`${JIRA_BASE_URL}/jira/rest/api/2/search?jql=project=${project.key}&maxResults=1`);
            const content = await this.page.textContent('body');
            if (content && content.includes('"total"')) {
                const searchResult = JSON.parse(content);
                project.ticketCount = searchResult.total || 0;
                console.log(`📊 ${project.key} has ${project.ticketCount} tickets`);
            }
        } catch (error) {
            console.log(`⚠️  Could not get ticket count for ${project.key}`);
        }
    }

    async exploreUrl(url: string, type: DiscoveryResult['type'] = 'unknown'): Promise<DiscoveryResult | null> {
        if (this.exploredUrls.has(url) || !this.page) {
            return null;
        }
        
        this.exploredUrls.add(url);
        
        try {
            const startTime = Date.now();
            await this.page.goto(`${JIRA_BASE_URL}${url}`, { timeout: 30000 });
            await this.page.waitForLoadState('networkidle', { timeout: 10000 });
            const loadTime = Date.now() - startTime;
            
            const currentUrl = this.page.url();
            if (currentUrl.includes('login') || currentUrl.includes('permissionViolation')) {
                console.log(`🚫 Access denied: ${url}`);
                return null;
            }
            
            const title = await this.page.title();
            const elementCount = await this.page.$$eval('*', elements => elements.length);
            
            // Find all links
            const links = await this.page.$$eval('a[href]', anchors => 
                anchors.map(a => a.getAttribute('href')).filter(href => href).slice(0, 50)
            );
            
            // Find all forms
            const forms = await this.page.$$eval('form', forms => 
                forms.map(form => form.getAttribute('action') || form.id || 'unnamed').slice(0, 20)
            );
            
            // Extract specific data based on page type
            let data: any = {};
            
            if (url.includes('/rest/api/')) {
                // API endpoint - capture JSON
                const content = await this.page.textContent('body');
                try {
                    data = JSON.parse(content || '{}');
                } catch {
                    data = { rawContent: content?.substring(0, 1000) };
                }
            } else if (title.toLowerCase().includes('dashboard')) {
                // Dashboard - capture gadgets/widgets
                data.gadgets = await this.page.$$eval('[id*="gadget"], .dashboard-item, .portlet', elements => 
                    elements.map(el => el.textContent?.trim().substring(0, 100)).filter(Boolean)
                );
            } else if (url.includes('/issues/') || title.toLowerCase().includes('search')) {
                // Search results - capture issue count
                const issueLinks = await this.page.$$eval('a[href*="/browse/"]', links => 
                    links.map(link => link.textContent?.trim()).filter(Boolean).slice(0, 10)
                );
                data.issues = issueLinks;
                data.issueCount = issueLinks.length;
            }
            
            const result: DiscoveryResult = {
                url,
                title,
                type,
                accessible: true,
                loadTime,
                elementCount,
                links: links as string[],
                forms,
                data,
                timestamp: new Date().toISOString()
            };
            
            this.discoveries.push(result);
            console.log(`✅ ${url} (${loadTime}ms, ${elementCount} elements)`);
            
            return result;
            
        } catch (error) {
            console.log(`❌ Failed to explore ${url}:`, error.message);
            return null;
        }
    }

    async discoverSystemAreas(): Promise<void> {
        console.log('\n🔍 PHASE 2: Discovering system areas...');
        
        const systemUrls = [
            // Main areas
            { url: '/jira/secure/Dashboard.jspa', type: 'dashboard' as const },
            { url: '/jira/issues/', type: 'search' as const },
            { url: '/jira/secure/IssueNavigator.jspa', type: 'search' as const },
            
            // User areas
            { url: '/jira/secure/ViewProfile.jspa', type: 'user' as const },
            { url: '/jira/secure/ViewPersonalSettings.jspa', type: 'user' as const },
            
            // Admin areas (might not have access)
            { url: '/jira/secure/admin/ViewApplicationConfiguration.jspa', type: 'admin' as const },
            { url: '/jira/secure/project/ViewProjects.jspa', type: 'admin' as const },
            { url: '/jira/secure/admin/user/UserBrowser.jspa', type: 'admin' as const },
            
            // Reports
            { url: '/jira/secure/ConfigureReport.jspa', type: 'report' as const },
            { url: '/jira/plugins/servlet/project-config', type: 'report' as const },
            
            // Workflows
            { url: '/jira/secure/admin/workflows/ListWorkflows.jspa', type: 'workflow' as const },
            { url: '/jira/secure/admin/screens/ViewScreens.jspa', type: 'screen' as const }
        ];
        
        for (const item of systemUrls) {
            await this.exploreUrl(item.url, item.type);
        }
    }

    async saveToSupabase(): Promise<void> {
        console.log('\n💾 Saving discoveries to Supabase...');
        
        if (!supabase) {
            console.log('📄 Supabase not available - saving locally only');
            fs.writeFileSync('jira-projects-discovery.json', JSON.stringify(this.projects, null, 2));
            fs.writeFileSync('jira-urls-discovery.json', JSON.stringify(this.discoveries, null, 2));
            return;
        }
        
        try {
            // Save project discoveries
            const { error: projectError } = await supabase
                .from('jira_uat_projects')
                .upsert(this.projects.map(p => ({
                    project_key: p.key,
                    project_name: p.name,
                    project_type: p.type,
                    project_lead: p.lead,
                    ticket_count: p.ticketCount,
                    workflows: p.workflows,
                    issue_types: p.issueTypes,
                    custom_fields: p.customFields,
                    discovered_at: new Date().toISOString()
                })), { onConflict: 'project_key' });
            
            if (projectError) {
                console.log('⚠️  Project save error:', projectError);
            } else {
                console.log(`✅ Saved ${this.projects.length} projects to Supabase`);
            }
            
            // Save URL discoveries  
            const { error: discoveryError } = await supabase
                .from('jira_uat_discoveries')
                .insert(this.discoveries.map(d => ({
                    url: d.url,
                    title: d.title,
                    type: d.type,
                    accessible: d.accessible,
                    load_time: d.loadTime,
                    element_count: d.elementCount,
                    links: d.links,
                    forms: d.forms,
                    data: d.data,
                    discovered_at: d.timestamp
                })));
                
            if (discoveryError) {
                console.log('⚠️  Discovery save error:', discoveryError);
            } else {
                console.log(`✅ Saved ${this.discoveries.length} discoveries to Supabase`);
            }
            
        } catch (error) {
            console.log('❌ Supabase save failed:', error);
        }
    }

    async generateTestPlan(): Promise<void> {
        console.log('\n🎯 GENERATING INTELLIGENT TEST PLAN...');
        
        const accessibleProjects = this.projects.filter(p => p.ticketCount > 0);
        const accessibleUrls = this.discoveries.filter(d => d.accessible);
        
        const testPlan = {
            summary: {
                totalProjects: this.projects.length,
                accessibleProjects: accessibleProjects.length,
                totalUrls: this.discoveries.length,
                accessibleUrls: accessibleUrls.length,
                avgLoadTime: Math.round(accessibleUrls.reduce((sum, d) => sum + d.loadTime, 0) / accessibleUrls.length)
            },
            projectTests: accessibleProjects.map(p => ({
                projectKey: p.key,
                projectName: p.name,
                ticketCount: p.ticketCount,
                recommendedTests: [
                    `Browse ${p.key} project page`,
                    `Search for ${p.key} tickets`,
                    `Load random ${p.key} ticket`,
                    `Test ${p.key} ticket creation form`,
                    p.ticketCount > 100 ? `Performance test with large ${p.key} dataset` : null
                ].filter(Boolean)
            })),
            functionalTests: [
                'Dashboard load and gadget functionality',
                'Issue Navigator search capabilities',
                'Cross-project search performance',
                'User profile and settings access',
                'Report generation capabilities'
            ],
            performanceTests: accessibleUrls
                .filter(d => d.loadTime > 5000)
                .map(d => `Optimize ${d.url} (currently ${d.loadTime}ms)`),
            securityTests: [
                'Verify authentication requirements',
                'Test unauthorized access prevention',
                'Validate session management'
            ]
        };
        
        // Save test plan
        fs.writeFileSync('intelligent-test-plan.json', JSON.stringify(testPlan, null, 2));
        console.log('📄 Test plan saved to intelligent-test-plan.json');
        
        // Display summary
        console.log('\n📊 DISCOVERY SUMMARY:');
        console.log(`🎯 Found ${accessibleProjects.length} accessible projects with tickets`);
        console.log(`🔗 Explored ${accessibleUrls.length} working URLs`);
        console.log(`⚡ Average load time: ${testPlan.summary.avgLoadTime}ms`);
        console.log(`🐌 Slow pages (>5s): ${testPlan.performanceTests.length}`);
        
        console.log('\n🎯 TOP PROJECTS BY TICKET COUNT:');
        accessibleProjects
            .sort((a, b) => b.ticketCount - a.ticketCount)
            .slice(0, 5)
            .forEach(p => console.log(`   ${p.key}: ${p.ticketCount} tickets`));
    }

    async cleanup(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function runIntelligentExploration() {
    const explorer = new JiraExplorer();
    
    try {
        await explorer.initialize();
        
        // Phase 1: Discover all projects
        const projects = await explorer.discoverProjects();
        
        // Phase 2: Explore each project in detail
        for (const project of projects) {
            await explorer.exploreProject(project);
        }
        
        // Phase 3: Discover system areas
        await explorer.discoverSystemAreas();
        
        // Phase 4: Save to Supabase
        await explorer.saveToSupabase();
        
        // Phase 5: Generate intelligent test plan
        await explorer.generateTestPlan();
        
        console.log('\n🎉 INTELLIGENT EXPLORATION COMPLETE!');
        console.log('📋 Check intelligent-test-plan.json for your custom test strategy');
        
    } catch (error) {
        console.error('💥 Exploration failed:', error);
    } finally {
        await explorer.cleanup();
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIntelligentExploration();
}

export { JiraExplorer, runIntelligentExploration }; 