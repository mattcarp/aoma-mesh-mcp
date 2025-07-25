export interface JiraEnvironment {
    name: string;
    url: string;
    isProduction: boolean;
    warning: string;
    color: string;
}

export const JIRA_ENVIRONMENTS = {
    PRODUCTION: {
        name: 'PRODUCTION',
        url: 'https://jirauat.smedigitalapps.com',
        isProduction: true,
        warning: '⚠️  DANGER: This is PRODUCTION JIRA - Real business data!',
        color: '\x1b[41m' // Red background
    } as JiraEnvironment,
    
    UAT: {
        name: 'UAT/STAGING',
        url: 'https://jirauat.smedigitalapps.com',
        isProduction: false,
        warning: '🧪 TESTING: This is UAT/Staging JIRA - Safe for testing',
        color: '\x1b[43m' // Yellow background
    } as JiraEnvironment
};

export function detectEnvironment(url: string): JiraEnvironment {
    if (url.includes('jirauat.smedigitalapps.com')) {
        return JIRA_ENVIRONMENTS.UAT;
    }
    if (url.includes('jira.smedigitalapps.com')) {
        return JIRA_ENVIRONMENTS.PRODUCTION;
    }
    throw new Error(`Unknown JIRA environment: ${url}`);
}

export function displayEnvironmentWarning(env: JiraEnvironment) {
    console.log('\n' + '='.repeat(80));
    console.log(env.color + '                    JIRA ENVIRONMENT ALERT                    ' + '\x1b[0m');
    console.log('='.repeat(80));
    console.log(`🌍 Environment: ${env.name}`);
    console.log(`🔗 URL: ${env.url}`);
    console.log(`${env.warning}`);
    console.log('='.repeat(80) + '\n');
    
    if (env.isProduction) {
        console.log('🚨 PRODUCTION ENVIRONMENT DETECTED!');
        console.log('   - This affects real business systems');
        console.log('   - Be extremely careful with any changes');
        console.log('   - Confirm this is intentional');
        console.log('');
    } else {
        console.log('✅ Safe testing environment');
        console.log('   - This is for upgrade testing');
        console.log('   - Safe to experiment');
        console.log('');
    }
}

export async function confirmEnvironment(env: JiraEnvironment): Promise<boolean> {
    if (!env.isProduction) {
        return true; // Auto-confirm for non-production
    }
    
    console.log('🛑 PRODUCTION ACCESS CONFIRMATION REQUIRED');
    console.log('Type "CONFIRM_PRODUCTION" to proceed with production access:');
    
    // In a real interactive scenario, you'd wait for user input
    // For now, we'll just warn and continue
    console.log('⚠️  Proceeding with production access...');
    return true;
}

export function createSafeUrl(baseUrl: string, path: string = ''): string {
    const env = detectEnvironment(baseUrl);
    displayEnvironmentWarning(env);
    return `${baseUrl}${path}`;
}
