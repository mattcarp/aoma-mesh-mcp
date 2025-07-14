import { Page } from 'playwright';

// =============================================================================
// MICROSOFT SSO HANDLER
// =============================================================================

interface MicrosoftSSOConfig {
    username: string;
    email: string;
    password: string;
    timeout: number;
    maxRetries: number;
}

interface SSOFlowState {
    step: 'initial' | 'username' | 'email' | 'password' | 'mfa' | 'consent' | 'redirect' | 'complete';
    isComplete: boolean;
    requiresAction: boolean;
    actionType?: 'input' | 'click' | 'wait' | 'approve';
    message: string;
    url: string;
    domain: string;
}

/**
 * Specialized Microsoft SSO Handler for JIRA Integration
 * 
 * This handler manages the complete Microsoft SSO flow including:
 * - Username entry
 * - Email verification
 * - Password input
 * - Multi-factor authentication (MFA)
 * - Consent screens
 * - Certificate handling
 * - Redirect handling
 */
export class MicrosoftSSOHandler {
    private page: Page;
    private config: MicrosoftSSOConfig;

    constructor(page: Page, config: MicrosoftSSOConfig) {
        this.page = page;
        this.config = config;
    }

    /**
     * Execute the complete Microsoft SSO flow
     */
    async executeSSO(): Promise<boolean> {
        console.log('🔐 Starting Microsoft SSO flow...');
        
        let currentStep = 0;
        const maxSteps = 20;
        let isComplete = false;

        while (!isComplete && currentStep < maxSteps) {
            currentStep++;
            console.log(`\n📋 SSO Step ${currentStep}/${maxSteps}: Processing...`);

            const flowState = await this.analyzeCurrentSSOState();
            
            console.log(`   🔍 Current step: ${flowState.step}`);
            console.log(`   📍 URL: ${flowState.url.substring(0, 60)}...`);
            console.log(`   💬 Message: ${flowState.message}`);
            console.log(`   ✅ Complete: ${flowState.isComplete ? 'YES' : 'NO'}`);

            if (flowState.isComplete) {
                isComplete = true;
                console.log('🎉 Microsoft SSO flow completed successfully!');
                break;
            }

            // Handle different SSO steps
            const stepSuccess = await this.handleSSOStep(flowState);
            
            if (!stepSuccess) {
                console.log(`   ⚠️ Step ${flowState.step} failed, retrying...`);
                await this.page.waitForTimeout(2000);
            }

            // Wait between steps
            await this.page.waitForTimeout(1500);
        }

        return isComplete;
    }

    /**
     * Analyze current SSO state and determine next action
     */
    private async analyzeCurrentSSOState(): Promise<SSOFlowState> {
        await this.page.waitForLoadState('domcontentloaded');
        
        const state = await this.page.evaluate(() => {
            const url = window.location.href;
            const domain = window.location.hostname;
            const title = document.title || '';
            const bodyText = document.body?.textContent?.toLowerCase() || '';

            // Microsoft SSO domain patterns
            const isMicrosoftDomain = domain.includes('login.microsoftonline.com') || 
                                    domain.includes('login.live.com') || 
                                    domain.includes('account.microsoft.com') ||
                                    domain.includes('login.windows.net');

            // Check for different SSO steps
            let step: string = 'initial';
            let isComplete = false;
            let requiresAction = false;
            let actionType: string | undefined;
            let message = '';

            // Check if we're back to the original application (SSO complete)
            if (!isMicrosoftDomain && !bodyText.includes('sign in') && !bodyText.includes('log in')) {
                step = 'complete';
                isComplete = true;
                message = 'Successfully redirected back to application';
            }
            // Username/email input step
            else if (document.querySelector('input[name="loginfmt"]') || 
                     document.querySelector('input[type="email"]') ||
                     bodyText.includes('enter your email')) {
                step = 'email';
                requiresAction = true;
                actionType = 'input';
                message = 'Email/username input required';
            }
            // Password input step
            else if (document.querySelector('input[name="passwd"]') ||
                     document.querySelector('input[type="password"]') ||
                     bodyText.includes('enter your password')) {
                step = 'password';
                requiresAction = true;
                actionType = 'input';
                message = 'Password input required';
            }
            // MFA step
            else if (bodyText.includes('verify your identity') ||
                     bodyText.includes('authenticator') ||
                     bodyText.includes('verification code') ||
                     bodyText.includes('approve') ||
                     bodyText.includes('phone')) {
                step = 'mfa';
                requiresAction = true;
                actionType = 'approve';
                message = 'Multi-factor authentication required';
            }
            // Consent step
            else if (bodyText.includes('permissions') ||
                     bodyText.includes('consent') ||
                     bodyText.includes('allow') ||
                     document.querySelector('button[type="submit"]')?.textContent?.toLowerCase().includes('accept')) {
                step = 'consent';
                requiresAction = true;
                actionType = 'click';
                message = 'Consent/permissions required';
            }
            // Redirect step
            else if (bodyText.includes('redirecting') ||
                     bodyText.includes('please wait') ||
                     bodyText.includes('loading')) {
                step = 'redirect';
                requiresAction = false;
                actionType = 'wait';
                message = 'Redirecting, please wait';
            }
            // Initial step
            else {
                step = 'initial';
                requiresAction = true;
                actionType = 'click';
                message = 'Looking for login initiation';
            }

            return {
                step,
                isComplete,
                requiresAction,
                actionType,
                message,
                url,
                domain
            };
        });

        return state as SSOFlowState;
    }

    /**
     * Handle specific SSO step based on current state
     */
    private async handleSSOStep(flowState: SSOFlowState): Promise<boolean> {
        try {
            switch (flowState.step) {
                case 'initial':
                    return await this.handleInitialStep();
                
                case 'email':
                    return await this.handleEmailStep();
                
                case 'password':
                    return await this.handlePasswordStep();
                
                case 'mfa':
                    return await this.handleMFAStep();
                
                case 'consent':
                    return await this.handleConsentStep();
                
                case 'redirect':
                    return await this.handleRedirectStep();
                
                default:
                    console.log(`   ⚠️ Unknown step: ${flowState.step}`);
                    return false;
            }
        } catch (error) {
            console.log(`   ❌ Error handling step ${flowState.step}: ${error.message}`);
            return false;
        }
    }

    /**
     * Handle initial login step
     */
    private async handleInitialStep(): Promise<boolean> {
        console.log('   🔘 Handling initial login step...');
        
        // Look for login button or link
        const loginSelectors = [
            'button:has-text("Sign in")',
            'a:has-text("Sign in")',
            'button:has-text("Log in")',
            'a:has-text("Log in")',
            'input[type="submit"][value*="Sign"]',
            'input[type="submit"][value*="Log"]'
        ];

        for (const selector of loginSelectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`   ✅ Found login element: ${selector}`);
                    await element.scrollIntoViewIfNeeded();
                    await element.click();
                    return true;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        return false;
    }

    /**
     * Handle email/username input step
     */
    private async handleEmailStep(): Promise<boolean> {
        console.log('   📧 Handling email input step...');
        
        const emailSelectors = [
            'input[name="loginfmt"]',
            'input[type="email"]',
            'input[placeholder*="email"]',
            'input[placeholder*="username"]'
        ];

        for (const selector of emailSelectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`   ✅ Found email field: ${selector}`);
                    
                    // Clear and fill email
                    await element.scrollIntoViewIfNeeded();
                    await element.clear();
                    await element.fill(this.config.email);
                    
                    // Look for next/submit button
                    const submitButtons = [
                        'button:has-text("Next")',
                        'button[type="submit"]',
                        'input[type="submit"]',
                        'button:has-text("Continue")'
                    ];

                    for (const buttonSelector of submitButtons) {
                        try {
                            const button = this.page.locator(buttonSelector);
                            if (await button.isVisible({ timeout: 1000 })) {
                                await button.click();
                                return true;
                            }
                        } catch (e) {
                            // Continue to next button
                        }
                    }
                    
                    // Fallback: press Enter
                    await element.press('Enter');
                    return true;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        return false;
    }

    /**
     * Handle password input step
     */
    private async handlePasswordStep(): Promise<boolean> {
        console.log('   🔒 Handling password input step...');
        
        const passwordSelectors = [
            'input[name="passwd"]',
            'input[type="password"]',
            'input[placeholder*="password"]'
        ];

        for (const selector of passwordSelectors) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`   ✅ Found password field: ${selector}`);
                    
                    // Clear and fill password
                    await element.scrollIntoViewIfNeeded();
                    await element.clear();
                    await element.fill(this.config.password);
                    
                    // Look for sign in button
                    const submitButtons = [
                        'button:has-text("Sign in")',
                        'button[type="submit"]',
                        'input[type="submit"]',
                        'button:has-text("Continue")'
                    ];

                    for (const buttonSelector of submitButtons) {
                        try {
                            const button = this.page.locator(buttonSelector);
                            if (await button.isVisible({ timeout: 1000 })) {
                                await button.click();
                                return true;
                            }
                        } catch (e) {
                            // Continue to next button
                        }
                    }
                    
                    // Fallback: press Enter
                    await element.press('Enter');
                    return true;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        return false;
    }

    /**
     * Handle MFA step
     */
    private async handleMFAStep(): Promise<boolean> {
        console.log('   📱 Handling MFA step...');
        console.log('   ⏳ Please complete MFA on your device...');
        
        // Wait for MFA completion
        const mfaTimeout = 60000; // 1 minute
        const startTime = Date.now();
        
        while (Date.now() - startTime < mfaTimeout) {
            // Check if MFA is complete by looking for redirect or next step
            const currentUrl = this.page.url();
            const bodyText = await this.page.evaluate(() => 
                document.body?.textContent?.toLowerCase() || ''
            );
            
            if (!bodyText.includes('verify your identity') && 
                !bodyText.includes('authenticator') &&
                !bodyText.includes('verification code')) {
                console.log('   ✅ MFA appears to be complete');
                return true;
            }
            
            await this.page.waitForTimeout(3000);
        }
        
        console.log('   ⚠️ MFA timeout reached');
        return false;
    }

    /**
     * Handle consent step
     */
    private async handleConsentStep(): Promise<boolean> {
        console.log('   ✅ Handling consent step...');
        
        const consentButtons = [
            'button:has-text("Accept")',
            'button:has-text("Allow")',
            'button:has-text("Continue")',
            'button:has-text("Yes")',
            'button[type="submit"]',
            'input[type="submit"][value*="Accept"]',
            'input[type="submit"][value*="Allow"]'
        ];

        for (const selector of consentButtons) {
            try {
                const element = this.page.locator(selector);
                if (await element.isVisible({ timeout: 2000 })) {
                    console.log(`   ✅ Found consent button: ${selector}`);
                    await element.scrollIntoViewIfNeeded();
                    await element.click();
                    return true;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        return false;
    }

    /**
     * Handle redirect step
     */
    private async handleRedirectStep(): Promise<boolean> {
        console.log('   🔄 Handling redirect step...');
        
        // Wait for redirect to complete
        try {
            await this.page.waitForLoadState('networkidle', { timeout: 10000 });
            console.log('   ✅ Redirect completed');
            return true;
        } catch (error) {
            console.log('   ⚠️ Redirect timeout, continuing...');
            return true; // Continue anyway
        }
    }

    /**
     * Validate if SSO flow is complete
     */
    async validateSSOCompletion(): Promise<boolean> {
        try {
            const currentUrl = this.page.url();
            const bodyText = await this.page.evaluate(() => 
                document.body?.textContent?.toLowerCase() || ''
            );

            // Check if we're back on the original application
            const isBackToApp = !currentUrl.includes('login.microsoftonline.com') &&
                              !currentUrl.includes('login.live.com') &&
                              !bodyText.includes('sign in') &&
                              !bodyText.includes('log in');

            // Check for JIRA interface elements
            const hasJiraInterface = await this.page.evaluate(() => {
                return document.querySelector('.aui-nav, #header, .navigator-content, .dashboard, .jira-header') !== null;
            });

            return isBackToApp && hasJiraInterface;
        } catch (error) {
            console.log('   ⚠️ Error validating SSO completion:', error.message);
            return false;
        }
    }

    /**
     * Get current SSO step for debugging
     */
    async getCurrentStep(): Promise<string> {
        const state = await this.analyzeCurrentSSOState();
        return state.step;
    }

    /**
     * Reset SSO flow (clear cookies, etc.)
     */
    async resetSSOFlow(): Promise<void> {
        console.log('🔄 Resetting SSO flow...');
        
        try {
            // Clear cookies for Microsoft domains
            const context = this.page.context();
            const cookies = await context.cookies();
            
            const microsoftCookies = cookies.filter(cookie => 
                cookie.domain.includes('microsoft') || 
                cookie.domain.includes('live.com') ||
                cookie.domain.includes('windows.net')
            );
            
            for (const cookie of microsoftCookies) {
                await context.clearCookies({ domain: cookie.domain });
            }
            
            console.log('✅ SSO flow reset complete');
        } catch (error) {
            console.log('⚠️ Error resetting SSO flow:', error.message);
        }
    }
}

// =============================================================================
// INTEGRATION WITH UNIFIED FRAMEWORK
// =============================================================================

export interface SSOIntegrationConfig {
    enabled: boolean;
    microsoftConfig: MicrosoftSSOConfig;
    fallbackToManual: boolean;
}

export const DEFAULT_SSO_CONFIG: SSOIntegrationConfig = {
    enabled: true,
    microsoftConfig: {
        username: 'mcarpent',
        email: 'matt.carpenter.ext@sonymusic.com',
        password: 'Dooley1_Jude2',
        timeout: 30000,
        maxRetries: 3
    },
    fallbackToManual: true
};

/**
 * Integration function to use with unified framework
 */
export async function integrateWithUnifiedFramework(
    page: Page, 
    config: SSOIntegrationConfig
): Promise<boolean> {
    console.log('🔗 Integrating Microsoft SSO with unified framework...');
    
    if (!config.enabled) {
        console.log('⚠️ SSO integration disabled');
        return false;
    }

    const ssoHandler = new MicrosoftSSOHandler(page, config.microsoftConfig);
    
    try {
        const success = await ssoHandler.executeSSO();
        
        if (success) {
            console.log('✅ Microsoft SSO integration successful');
            return true;
        } else if (config.fallbackToManual) {
            console.log('⚠️ SSO failed, falling back to manual process');
            return false;
        } else {
            console.log('❌ SSO failed and fallback disabled');
            return false;
        }
    } catch (error) {
        console.log('❌ SSO integration error:', error.message);
        return false;
    }
} 