import { chromium } from 'playwright';
import fs from 'fs';

async function diagnoseLoginIssue() {
    console.log('🔍 JIRA 10.3 LOGIN DIAGNOSTIC TOOL');
    console.log('================================================================================');
    console.log('🎯 Goal: Identify exactly what is causing the login redirect loop issue');
    console.log('🚨 Issue: Users stuck with permissionViolation=true parameter');
    console.log('================================================================================');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--start-maximized', '--disable-web-security', '--disable-features=VizDisplayCompositor'] 
    });
    
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        console.log('\n📊 STEP 1: BASELINE CONNECTIVITY TEST');
        console.log('================================================================================');
        
        // Test basic connectivity to UAT JIRA
        console.log('🔗 Testing basic connectivity to UAT JIRA...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/', { waitUntil: 'networkidle', timeout: 30000 });
        
        const initialUrl = page.url();
        const initialTitle = await page.title();
        console.log(`   📍 Initial URL: ${initialUrl}`);
        console.log(`   📄 Initial Title: ${initialTitle}`);
        
        // Take initial screenshot
        await page.screenshot({ path: 'diagnostic-step-1-initial.png', fullPage: true });
        console.log('   📸 Screenshot saved: diagnostic-step-1-initial.png');
        
        console.log('\n📊 STEP 2: DIRECT LOGIN PAGE ACCESS');
        console.log('================================================================================');
        
        // Try direct login page access
        console.log('🔗 Attempting direct login page access...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/login.jsp', { waitUntil: 'networkidle', timeout: 30000 });
        
        const loginUrl = page.url();
        const loginTitle = await page.title();
        console.log(`   📍 Login URL: ${loginUrl}`);
        console.log(`   📄 Login Title: ${loginTitle}`);
        
        // Check for permissionViolation parameter
        const hasPermissionViolation = loginUrl.includes('permissionViolation=true');
        console.log(`   🚨 Permission Violation: ${hasPermissionViolation ? '❌ YES - FOUND THE ISSUE!' : '✅ NO'}`);
        
        // Take login page screenshot
        await page.screenshot({ path: 'diagnostic-step-2-login-page.png', fullPage: true });
        console.log('   📸 Screenshot saved: diagnostic-step-2-login-page.png');
        
        console.log('\n📊 STEP 3: DOM ANALYSIS');
        console.log('================================================================================');
        
        // Analyze the page DOM
        const pageAnalysis = await page.evaluate(() => {
            const body = document.body;
            const bodyText = body.textContent || '';
            
            // Look for login form elements
            const usernameField = document.querySelector('input[placeholder="Username"], input[name="username"], input[id*="user"]');
            const passwordField = document.querySelector('input[type="password"]');
            const emailField = document.querySelector('input[type="email"]');
            const loginButton = document.querySelector('button[type="submit"], input[type="submit"], button[class*="login"], button[id*="login"]');
            
            // Look for error messages
            const errorMessages = Array.from(document.querySelectorAll('.error, .alert, .warning, [class*="error"], [class*="alert"]'))
                .map(el => el.textContent?.trim()).filter(text => text);
            
            // Look for redirect indicators
            const redirectIndicators = Array.from(document.querySelectorAll('meta[http-equiv="refresh"], script'))
                .map(el => el.outerHTML).filter(html => html.includes('redirect') || html.includes('location'));
            
            // Look for SSO/OAuth indicators
            const ssoIndicators = bodyText.includes('Microsoft') || bodyText.includes('OAuth') || bodyText.includes('SSO');
            
            return {
                hasUsernameField: !!usernameField,
                hasPasswordField: !!passwordField,
                hasEmailField: !!emailField,
                hasLoginButton: !!loginButton,
                errorMessages,
                redirectIndicators,
                ssoIndicators,
                bodyTextPreview: bodyText.substring(0, 500),
                formElements: Array.from(document.querySelectorAll('form')).length,
                inputElements: Array.from(document.querySelectorAll('input')).length
            };
        });
        
        console.log('   🔍 Page Analysis Results:');
        console.log(`      Username Field: ${pageAnalysis.hasUsernameField ? '✅' : '❌'}`);
        console.log(`      Password Field: ${pageAnalysis.hasPasswordField ? '✅' : '❌'}`);
        console.log(`      Email Field: ${pageAnalysis.hasEmailField ? '✅' : '❌'}`);
        console.log(`      Login Button: ${pageAnalysis.hasLoginButton ? '✅' : '❌'}`);
        console.log(`      Form Elements: ${pageAnalysis.formElements}`);
        console.log(`      Input Elements: ${pageAnalysis.inputElements}`);
        console.log(`      SSO Indicators: ${pageAnalysis.ssoIndicators ? '✅' : '❌'}`);
        
        if (pageAnalysis.errorMessages.length > 0) {
            console.log(`      🚨 Error Messages Found:`);
            pageAnalysis.errorMessages.forEach((msg, i) => {
                console.log(`         ${i + 1}. ${msg}`);
            });
        }
        
        console.log(`      📝 Body Preview: ${pageAnalysis.bodyTextPreview.substring(0, 200)}...`);
        
        console.log('\n📊 STEP 4: NETWORK ANALYSIS');
        console.log('================================================================================');
        
        // Monitor network requests for redirects
        const networkLogs: any[] = [];
        page.on('response', response => {
            if (response.status() >= 300 && response.status() < 400) {
                networkLogs.push({
                    url: response.url(),
                    status: response.status(),
                    location: response.headers()['location'] || 'N/A'
                });
            }
        });
        
        // Try to access dashboard directly
        console.log('🔗 Testing direct dashboard access...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa', { waitUntil: 'networkidle', timeout: 30000 });
        
        const dashboardUrl = page.url();
        console.log(`   📍 Dashboard URL: ${dashboardUrl}`);
        
        // Take dashboard screenshot
        await page.screenshot({ path: 'diagnostic-step-4-dashboard.png', fullPage: true });
        console.log('   📸 Screenshot saved: diagnostic-step-4-dashboard.png');
        
        if (networkLogs.length > 0) {
            console.log('   🔄 Redirect History:');
            networkLogs.forEach((log, i) => {
                console.log(`      ${i + 1}. ${log.status} ${log.url} → ${log.location}`);
            });
        }
        
        console.log('\n📊 STEP 5: AUTHENTICATION FLOW MAPPING');
        console.log('================================================================================');
        
        // Try clicking on any visible login elements
        const clickableElements = await page.evaluate(() => {
            const elements = Array.from(document.querySelectorAll('a, button'))
                .filter(el => {
                    const text = el.textContent?.toLowerCase() || '';
                    return text.includes('log') || text.includes('sign') || text.includes('auth');
                })
                .map(el => ({
                    text: el.textContent?.trim(),
                    href: el.getAttribute('href'),
                    tag: el.tagName
                }));
            return elements;
        });
        
        console.log('   🔗 Found clickable auth elements:');
        clickableElements.forEach((el, i) => {
            console.log(`      ${i + 1}. ${el.tag}: "${el.text}" → ${el.href}`);
        });
        
        console.log('\n📊 STEP 6: COOKIE ANALYSIS');
        console.log('================================================================================');
        
        const cookies = await context.cookies();
        console.log(`   🍪 Total cookies: ${cookies.length}`);
        
        const authCookies = cookies.filter(cookie => 
            cookie.name.includes('session') || 
            cookie.name.includes('auth') || 
            cookie.name.includes('login') ||
            cookie.name.includes('JSESSIONID') ||
            cookie.name.includes('atlxsid')
        );
        
        console.log(`   🔐 Auth-related cookies: ${authCookies.length}`);
        authCookies.forEach(cookie => {
            console.log(`      ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
        });
        
        console.log('\n📊 DIAGNOSTIC SUMMARY');
        console.log('================================================================================');
        console.log(`🔍 Permission Violation Issue: ${hasPermissionViolation ? '❌ CONFIRMED' : '✅ NOT DETECTED'}`);
        console.log(`📋 Login Form Elements: ${pageAnalysis.hasUsernameField && pageAnalysis.hasPasswordField ? '✅ PRESENT' : '❌ MISSING'}`);
        console.log(`🔄 Redirect Count: ${networkLogs.length}`);
        console.log(`🍪 Auth Cookies: ${authCookies.length}`);
        console.log(`🔗 Current URL: ${page.url()}`);
        
        // Save diagnostic report
        const diagnosticReport = {
            timestamp: new Date().toISOString(),
            initialUrl,
            loginUrl,
            dashboardUrl,
            hasPermissionViolation,
            pageAnalysis,
            networkLogs,
            clickableElements,
            cookies: cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path })),
            recommendations: [] as string[]
        };
        
        // Generate recommendations
        if (hasPermissionViolation) {
            diagnosticReport.recommendations.push('CRITICAL: Fix permissionViolation=true parameter in login URL');
        }
        
        if (!pageAnalysis.hasUsernameField || !pageAnalysis.hasPasswordField) {
            diagnosticReport.recommendations.push('LOGIN FORM: Missing login form elements - check for SSO redirect');
        }
        
        if (networkLogs.length > 3) {
            diagnosticReport.recommendations.push('REDIRECT LOOP: Too many redirects detected - check middleware');
        }
        
        fs.writeFileSync('jira-login-diagnostic-report.json', JSON.stringify(diagnosticReport, null, 2));
        console.log('\n💾 Diagnostic report saved: jira-login-diagnostic-report.json');
        
        console.log('\n🎯 NEXT STEPS RECOMMENDATION:');
        if (hasPermissionViolation) {
            console.log('❌ CRITICAL ISSUE CONFIRMED: permissionViolation=true in login URL');
            console.log('   This suggests a server-side configuration or middleware issue');
            console.log('   Recommend checking JIRA 10.3 authentication middleware settings');
        } else {
            console.log('✅ No obvious redirect loop detected in this session');
            console.log('   Issue may be intermittent or environment-specific');
        }
        
        console.log('\n⏳ Keeping browser open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Diagnostic error:', error);
        await page.screenshot({ path: 'diagnostic-error.png', fullPage: true });
    } finally {
        await browser.close();
        console.log('\n✅ Diagnostic complete!');
    }
}

// Run the diagnostic
diagnoseLoginIssue().catch(console.error); 