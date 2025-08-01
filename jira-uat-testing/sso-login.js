#!/usr/bin/env ts-node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const playwright_1 = require("playwright");
const dotenv_1 = require("dotenv");
const path = require("path");
const fs = require("fs");
(0, dotenv_1.config)({ path: path.join(__dirname, '../.env') });
async function ssoLogin() {
    console.log('🔐 SSO LOGIN FLOW');
    console.log('=================');
    const browser = await playwright_1.chromium.launch({
        headless: false,
        args: ['--start-maximized']
    });
    try {
        const context = await browser.newContext({
            ignoreHTTPSErrors: true,
            viewport: null
        });
        const page = await context.newPage();
        const username = process.env.JIRA_UAT_USERNAME;
        const password = process.env.JIRA_UAT_PWD;
        const email = process.env.JIRA_UAT_EMAIL;
        console.log(`Using username: ${username}`);
        console.log(`Using email: ${email}`);
        // Go to JIRA
        console.log('🌐 Going to JIRA UAT...');
        await page.goto('https://jirauat.smedigitalapps.com/jira/secure/Dashboard.jspa');
        await page.waitForLoadState('networkidle');
        // Click Log In
        console.log('🔗 Clicking Log In...');
        await page.locator('text="Log In"').click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'sso-1-login-form.png', fullPage: true });
        // Fill username in first form
        console.log('👤 Filling username...');
        await page.locator('input[placeholder="Username"]').fill(username);
        // Click Continue
        console.log('🔗 Clicking Continue...');
        await page.locator('button:has-text("Continue")').click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'sso-2-after-continue.png', fullPage: true });
        // Check if we're on Microsoft SSO page
        const currentUrl = page.url();
        if (currentUrl.includes('microsoft') || currentUrl.includes('login.microsoftonline')) {
            console.log('🔄 Detected Microsoft SSO flow');
            // Look for email field or Next button
            const nextButton = page.locator('input[type="submit"][value="Next"], button:has-text("Next")');
            if (await nextButton.isVisible()) {
                console.log('🔗 Clicking Next on SSO page...');
                await nextButton.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
                await page.screenshot({ path: 'sso-3-after-next.png', fullPage: true });
            }
            // Fill password if password field appears
            const passwordField = page.locator('input[type="password"]');
            if (await passwordField.isVisible()) {
                console.log('🔐 Filling password in SSO...');
                await passwordField.fill(password);
                await page.screenshot({ path: 'sso-4-password-filled.png', fullPage: true });
                // Click Sign in
                const signInButton = page.locator('input[type="submit"][value="Sign in"], button:has-text("Sign in")');
                if (await signInButton.isVisible()) {
                    console.log('🔗 Clicking Sign in...');
                    await signInButton.click();
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(5000);
                }
            }
        }
        else {
            // Regular password flow
            console.log('🔐 Regular password flow...');
            await page.locator('input[type="password"]').fill(password);
            await page.locator('button:has-text("Log in")').click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(5000);
        }
        await page.screenshot({ path: 'sso-5-final.png', fullPage: true });
        // Check final authentication state
        const finalUrl = page.url();
        const finalTitle = await page.title();
        console.log(`📍 Final URL: ${finalUrl}`);
        console.log(`📄 Final title: ${finalTitle}`);
        if (finalUrl.includes('Dashboard') && !finalUrl.includes('login')) {
            console.log('🎉 SUCCESS! SSO Authentication completed!');
            // Save authentication state
            const authDir = path.join(__dirname, 'playwright/.auth');
            if (!fs.existsSync(authDir)) {
                fs.mkdirSync(authDir, { recursive: true });
            }
            const storageState = await context.storageState();
            const authFile = path.join(authDir, 'jira-uat-user.json');
            fs.writeFileSync(authFile, JSON.stringify(storageState, null, 2));
            console.log('💾 Authentication state saved!');
            console.log('✅ Ready to run tests!');
        }
        else {
            console.log('❌ May need additional steps or 2FA');
        }
    }
    catch (error) {
        console.error('💥 Error:', error);
    }
    finally {
        await browser.close();
    }
}
ssoLogin();
