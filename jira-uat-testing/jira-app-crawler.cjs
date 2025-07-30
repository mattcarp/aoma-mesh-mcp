const { chromium } = require('playwright');
const fs = require('fs');

class JiraCrawler {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.baseUrl = 'https://jirauat.smedigitalapps.com/jira';
        this.discoveredUrls = new Set();
        this.discoveredComponents = new Map();
        this.securitySurfaces = [];
        this.apiEndpoints = [];
        this.forms = [];
        this.interactiveElements = [];
        this.accessibilityIssues = [];
        this.performanceMetrics = {};
    }

    async initialize() {
        console.log('🕷️ INITIALIZING JIRA APPLICATION CRAWLER');
        console.log('=========================================');
        
        this.browser = await chromium.launch({ 
            headless: false,
            args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
        });
        this.context = await this.browser.newContext();
        
        // Load existing session
        const sessionData = JSON.parse(fs.readFileSync('current-session.json', 'utf8'));
        await this.context.addCookies(sessionData.cookies);
        
        this.page = await this.context.newPage();
        
        // Set up network monitoring for API discovery
        this.page.on('request', request => {
            const url = request.url();
            if (url.includes('/rest/') || url.includes('/api/')) {
                this.apiEndpoints.push({
                    method: request.method(),
                    url: url,
                    headers: request.headers(),
                    postData: request.postData()
                });
            }
        });
        
        // Set up security monitoring
        this.page.on('response', response => {
            this.analyzeSecurityHeaders(response);
        });
        
        await this.page.goto(`${this.baseUrl}/secure/Dashboard.jspa`);
        console.log('✅ Crawler initialized and authenticated');
    }

    async crawlEntireApplication() {
        console.log('\n🔍 STARTING COMPREHENSIVE APPLICATION CRAWL');
        console.log('=============================================');
        
        const startTime = Date.now();
        
        // 1. Discover all navigation endpoints
        await this.discoverNavigation();
        
        // 2. Crawl every admin section
        await this.crawlAdministration();
        
        // 3. Discover all project types and workflows
        await this.crawlProjects();
        
        // 4. Map all issue types and their forms
        await this.crawlIssueManagement();
        
        // 5. Discover all user management areas
        await this.crawlUserManagement();
        
        // 6. Map all reporting and dashboards
        await this.crawlReporting();
        
        // 7. Discover all configuration screens
        await this.crawlConfiguration();
        
        // 8. Find all search and filter interfaces
        await this.crawlSearchFeatures();
        
        // 9. Map all agile/scrum boards
        await this.crawlAgileFeatures();
        
        // 10. Discover all plugin/add-on interfaces
        await this.crawlPlugins();
        
        const totalTime = Date.now() - startTime;
        console.log(`\n🎯 CRAWL COMPLETE: ${totalTime}ms`);
        
        return this.generateTestPlan();
    }

    async discoverNavigation() {
        console.log('\n📍 DISCOVERING NAVIGATION STRUCTURE');
        
        // Find all top-level menu items
        const topMenus = await this.page.$$eval('#header .aui-nav > li > a', links => 
            links.map(link => ({ text: link.textContent.trim(), href: link.href }))
        );
        
        for (const menu of topMenus) {
            console.log(`   📁 Menu: ${menu.text} → ${menu.href}`);
            this.discoveredUrls.add(menu.href);
        }
        
        // Find all dropdown menus
        await this.page.hover('#create_link');
        await this.page.waitForTimeout(500);
        
        const createMenuItems = await this.page.$$eval('.aui-dropdown2-section a', links =>
            links.map(link => ({ text: link.textContent.trim(), href: link.href }))
        );
        
        for (const item of createMenuItems) {
            console.log(`   ➕ Create: ${item.text} → ${item.href}`);
            this.discoveredUrls.add(item.href);
        }
        
        // Find all user menu items
        await this.page.click('.aui-dropdown2-trigger-arrowless');
        await this.page.waitForTimeout(500);
        
        const userMenuItems = await this.page.$$eval('.aui-dropdown2-section a', links =>
            links.map(link => ({ text: link.textContent.trim(), href: link.href }))
        );
        
        for (const item of userMenuItems) {
            console.log(`   👤 User: ${item.text} → ${item.href}`);
            this.discoveredUrls.add(item.href);
        }
    }

    async crawlAdministration() {
        console.log('\n⚙️ CRAWLING ADMINISTRATION SECTIONS');
        
        const adminUrls = [
            '/secure/admin/AdminSummary.jspa',
            '/secure/admin/ViewSystemInfo.jspa',
            '/secure/admin/ViewLicense.jspa',
            '/secure/admin/ViewApplications.jspa',
            '/secure/admin/user/UserBrowser.jspa',
            '/secure/admin/group/GroupBrowser.jspa',
            '/secure/admin/roles/ViewProjectRoles.jspa',
            '/secure/admin/permissionschemes/PermissionSchemes.jspa',
            '/secure/admin/notificationschemes/NotificationSchemes.jspa',
            '/secure/admin/mailservers/MailServers.jspa',
            '/secure/admin/workflows/ListWorkflows.jspa',
            '/secure/admin/issuetypes/ViewIssueTypes.jspa',
            '/secure/admin/priorities/ViewPriorities.jspa',
            '/secure/admin/statuses/ViewStatuses.jspa',
            '/secure/admin/resolutions/ViewResolutions.jspa',
            '/secure/admin/issuesecurity/ViewIssueSecuritySchemes.jspa',
            '/secure/admin/jira/GeneralConfiguration.jspa',
            '/secure/admin/jira/IndexAdmin.jspa',
            '/secure/admin/lookandfeel/EditLookAndFeel.jspa'
        ];
        
        for (const url of adminUrls) {
            try {
                await this.crawlPage(`${this.baseUrl}${url}`);
            } catch (error) {
                console.log(`   ❌ Admin page failed: ${url} - ${error.message}`);
            }
        }
    }

    async crawlProjects() {
        console.log('\n🗂️ CRAWLING PROJECT STRUCTURES');
        
        await this.page.goto(`${this.baseUrl}/secure/BrowseProjects.jspa`);
        
        // Find all project links
        const projectLinks = await this.page.$$eval('a[href*="/browse/"]', links =>
            links.map(link => ({ text: link.textContent.trim(), href: link.href }))
        );
        
        for (const project of projectLinks.slice(0, 5)) { // Limit to first 5 projects
            console.log(`   📁 Project: ${project.text}`);
            await this.crawlProject(project.href);
        }
    }

    async crawlProject(projectUrl) {
        await this.page.goto(projectUrl);
        
        // Discover project tabs and sections
        const projectTabs = await this.page.$$eval('.project-nav a', links =>
            links.map(link => ({ text: link.textContent.trim(), href: link.href }))
        );
        
        for (const tab of projectTabs) {
            this.discoveredUrls.add(tab.href);
            console.log(`     📋 Tab: ${tab.text} → ${tab.href}`);
        }
    }

    async crawlIssueManagement() {
        console.log('\n🎫 CRAWLING ISSUE MANAGEMENT');
        
        // Create Issue forms for each project
        const issueTypeUrls = [
            '/secure/CreateIssue.jspa',
            '/secure/CreateIssueDetails.jspa',
            '/secure/IssueNavigator.jspa',
            '/secure/QuickSearch.jspa'
        ];
        
        for (const url of issueTypeUrls) {
            await this.crawlPage(`${this.baseUrl}${url}`);
        }
        
        // Discover all issue types and their forms
        await this.discoverIssueForms();
    }

    async discoverIssueForms() {
        await this.page.goto(`${this.baseUrl}/secure/CreateIssue.jspa`);
        
        try {
            // Find all project options
            await this.page.waitForSelector('#project-field', { timeout: 5000 });
            
            const projects = await this.page.$$eval('#project-field option', options =>
                options.map(opt => ({ value: opt.value, text: opt.textContent }))
            );
            
            for (const project of projects.slice(0, 3)) { // Limit to first 3
                if (!project.value) continue;
                
                await this.page.selectOption('#project-field', project.value);
                await this.page.waitForTimeout(1000);
                
                // Get issue types for this project
                const issueTypes = await this.page.$$eval('#issuetype-field option', options =>
                    options.map(opt => ({ value: opt.value, text: opt.textContent }))
                );
                
                for (const issueType of issueTypes) {
                    if (!issueType.value) continue;
                    
                    this.forms.push({
                        type: 'issue_creation',
                        project: project.text,
                        issueType: issueType.text,
                        url: this.page.url()
                    });
                }
            }
        } catch (error) {
            console.log(`   ❌ Form discovery failed: ${error.message}`);
        }
    }

    async crawlPage(url) {
        try {
            await this.page.goto(url, { timeout: 10000 });
            this.discoveredUrls.add(url);
            
            // Analyze page for components
            await this.analyzePageComponents();
            
            // Check for forms
            await this.analyzeForms();
            
            // Check for interactive elements
            await this.analyzeInteractiveElements();
            
            // Run accessibility scan
            await this.scanAccessibility();
            
            console.log(`   ✅ Crawled: ${url}`);
            
        } catch (error) {
            console.log(`   ❌ Failed to crawl: ${url} - ${error.message}`);
        }
    }

    async analyzePageComponents() {
        const components = await this.page.evaluate(() => {
            const elements = [];
            
            // Find all unique component types
            document.querySelectorAll('*[class*="aui-"], *[class*="jira-"], *[data-*]').forEach(el => {
                const classes = Array.from(el.classList);
                const dataAttrs = Array.from(el.attributes).filter(attr => attr.name.startsWith('data-'));
                
                elements.push({
                    tagName: el.tagName,
                    classes: classes,
                    dataAttributes: dataAttrs.map(attr => ({ name: attr.name, value: attr.value })),
                    id: el.id,
                    type: el.type
                });
            });
            
            return elements;
        });
        
        const pageName = this.page.url().split('/').pop();
        this.discoveredComponents.set(pageName, components);
    }

    async analyzeForms() {
        const forms = await this.page.$$eval('form', forms => 
            forms.map(form => ({
                action: form.action,
                method: form.method,
                id: form.id,
                classes: Array.from(form.classList),
                fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
                    name: field.name,
                    type: field.type,
                    id: field.id,
                    required: field.required
                }))
            }))
        );
        
        this.forms.push(...forms.map(form => ({
            ...form,
            url: this.page.url(),
            discoveredAt: new Date().toISOString()
        })));
    }

    async analyzeInteractiveElements() {
        const interactive = await this.page.$$eval('button, a, input, select, textarea', elements =>
            elements.map(el => ({
                tagName: el.tagName,
                type: el.type,
                text: el.textContent?.trim().substring(0, 50),
                href: el.href,
                id: el.id,
                classes: Array.from(el.classList)
            }))
        );
        
        this.interactiveElements.push({
            url: this.page.url(),
            elements: interactive
        });
    }

    async scanAccessibility() {
        // Basic accessibility checks
        const a11yIssues = await this.page.evaluate(() => {
            const issues = [];
            
            // Check for missing alt text
            document.querySelectorAll('img:not([alt])').forEach(img => {
                issues.push({ type: 'missing_alt', element: img.src });
            });
            
            // Check for missing form labels
            document.querySelectorAll('input:not([type="hidden"]):not([aria-label]):not([id])').forEach(input => {
                const hasLabel = document.querySelector(`label[for="${input.id}"]`);
                if (!hasLabel) {
                    issues.push({ type: 'missing_label', element: input.name || input.type });
                }
            });
            
            // Check for missing headings structure
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
            if (headings.length === 0) {
                issues.push({ type: 'no_headings', element: 'page' });
            }
            
            return issues;
        });
        
        if (a11yIssues.length > 0) {
            this.accessibilityIssues.push({
                url: this.page.url(),
                issues: a11yIssues
            });
        }
    }

    async analyzeSecurityHeaders(response) {
        const headers = response.headers();
        const securityHeaders = [
            'content-security-policy',
            'x-frame-options',
            'x-content-type-options',
            'strict-transport-security',
            'x-xss-protection'
        ];
        
        const missingHeaders = securityHeaders.filter(header => !headers[header]);
        
        if (missingHeaders.length > 0) {
            this.securitySurfaces.push({
                url: response.url(),
                type: 'missing_security_headers',
                details: missingHeaders
            });
        }
    }

    async crawlUserManagement() {
        console.log('\n👥 CRAWLING USER MANAGEMENT');
        // Implementation for user management crawl
    }

    async crawlReporting() {
        console.log('\n📊 CRAWLING REPORTING FEATURES');
        // Implementation for reporting crawl
    }

    async crawlConfiguration() {
        console.log('\n⚙️ CRAWLING CONFIGURATION SCREENS');
        // Implementation for configuration crawl
    }

    async crawlSearchFeatures() {
        console.log('\n🔍 CRAWLING SEARCH FEATURES');
        // Implementation for search features crawl
    }

    async crawlAgileFeatures() {
        console.log('\n🏃 CRAWLING AGILE FEATURES');
        // Implementation for agile features crawl
    }

    async crawlPlugins() {
        console.log('\n🔌 CRAWLING PLUGINS AND ADD-ONS');
        // Implementation for plugins crawl
    }

    generateTestPlan() {
        const plan = {
            discoveryComplete: new Date().toISOString(),
            totalUrls: this.discoveredUrls.size,
            totalComponents: Array.from(this.discoveredComponents.values()).flat().length,
            totalForms: this.forms.length,
            totalApiEndpoints: this.apiEndpoints.length,
            securityIssues: this.securitySurfaces.length,
            accessibilityIssues: this.accessibilityIssues.length,
            
            testCategories: {
                navigation: Array.from(this.discoveredUrls),
                forms: this.forms,
                components: Object.fromEntries(this.discoveredComponents),
                api: this.apiEndpoints,
                security: this.securitySurfaces,
                accessibility: this.accessibilityIssues,
                interactive: this.interactiveElements
            },
            
            recommendedTests: this.generateTestRecommendations()
        };
        
        // Save comprehensive discovery report
        fs.writeFileSync('jira-discovery-report.json', JSON.stringify(plan, null, 2));
        
        console.log('\n🎯 COMPREHENSIVE DISCOVERY REPORT');
        console.log('==================================');
        console.log(`📊 Total URLs discovered: ${plan.totalUrls}`);
        console.log(`🧩 Total components: ${plan.totalComponents}`);
        console.log(`📝 Total forms: ${plan.totalForms}`);
        console.log(`🔌 Total API endpoints: ${plan.totalApiEndpoints}`);
        console.log(`🔒 Security issues: ${plan.securityIssues}`);
        console.log(`♿ Accessibility issues: ${plan.accessibilityIssues}`);
        
        return plan;
    }

    generateTestRecommendations() {
        const recommendations = [];
        
        // Navigation tests
        this.discoveredUrls.forEach(url => {
            recommendations.push({
                type: 'navigation',
                test: `should navigate to ${url}`,
                priority: 'high',
                category: 'smoke'
            });
        });
        
        // Form tests
        this.forms.forEach(form => {
            recommendations.push({
                type: 'form',
                test: `should validate form ${form.id || form.action}`,
                priority: 'critical',
                category: 'functional'
            });
        });
        
        // Security tests
        this.securitySurfaces.forEach(issue => {
            recommendations.push({
                type: 'security',
                test: `should test ${issue.type} on ${issue.url}`,
                priority: 'critical',
                category: 'security'
            });
        });
        
        return recommendations;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

async function main() {
    const crawler = new JiraCrawler();
    
    try {
        await crawler.initialize();
        const testPlan = await crawler.crawlEntireApplication();
        
        console.log('\n✅ CRAWL COMPLETE - TEST PLAN GENERATED');
        console.log('Report saved to: jira-discovery-report.json');
        
        return testPlan;
    } catch (error) {
        console.error('❌ Crawler failed:', error);
        throw error;
    } finally {
        await crawler.cleanup();
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { JiraCrawler }; 