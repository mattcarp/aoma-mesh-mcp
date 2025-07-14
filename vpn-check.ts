import { execSync } from 'child_process';
import fetch from 'node-fetch';

interface VPNStatus {
    connected: boolean;
    provider: string | null;
    message: string;
    canReachJira: boolean;
}

export async function checkVPNConnection(): Promise<VPNStatus> {
    console.log('🔍 Checking VPN connectivity...');
    
    const status: VPNStatus = {
        connected: false,
        provider: null,
        message: '',
        canReachJira: false
    };
    
    try {
        // Check for Palo Alto GlobalProtect
        try {
            const gpResult = execSync('ps aux | grep -i globalprotect | grep -v grep', { 
                encoding: 'utf8', 
                timeout: 5000 
            });
            
            if (gpResult.includes('GlobalProtect')) {
                status.provider = 'Palo Alto GlobalProtect';
                console.log('✅ Palo Alto GlobalProtect process detected');
            }
        } catch (e) {
            // GlobalProtect not running
        }
        
        // Check network interfaces for VPN
        try {
            const ifconfigResult = execSync('ifconfig | grep -E "(utun|tun|ppp|gpd)"', { 
                encoding: 'utf8', 
                timeout: 5000 
            });
            
            if (ifconfigResult.trim()) {
                status.connected = true;
                console.log('✅ VPN network interface detected');
                console.log(`   Interfaces: ${ifconfigResult.split('\n')[0].split(':')[0]}`);
            }
        } catch (e) {
            // No VPN interfaces found
        }
        
        // Test connectivity to JIRA servers
        console.log('🌐 Testing connectivity to JIRA servers...');
        
        const jiraTests = [
            { name: 'Production JIRA', url: 'https://jira.smedigitalapps.com' },
            { name: 'UAT JIRA', url: 'https://jirauat.smedigitalapps.com' }
        ];
        
        for (const test of jiraTests) {
            try {
                console.log(`   Testing ${test.name}...`);
                const response = await fetch(test.url, { 
                    timeout: 10000,
                    method: 'HEAD'
                });
                
                if (response.ok || response.status === 401 || response.status === 403) {
                    // 401/403 means server is reachable, just need auth
                    console.log(`   ✅ ${test.name}: Reachable (${response.status})`);
                    status.canReachJira = true;
                } else {
                    console.log(`   ❌ ${test.name}: HTTP ${response.status}`);
                }
            } catch (error: any) {
                console.log(`   ❌ ${test.name}: ${error.message}`);
            }
        }
        
        // DNS check for internal domains
        try {
            const dnsResult = execSync('nslookup jira.smedigitalapps.com', { 
                encoding: 'utf8', 
                timeout: 5000 
            });
            
            if (dnsResult.includes('Address:')) {
                console.log('✅ DNS resolution working for JIRA domains');
            }
        } catch (e) {
            console.log('❌ DNS resolution failed for JIRA domains');
        }
        
    } catch (error) {
        console.error('Error during VPN check:', error);
    }
    
    // Determine status message
    if (status.canReachJira) {
        status.message = '✅ VPN connected and JIRA servers reachable';
    } else if (status.connected || status.provider) {
        status.message = '⚠️ VPN detected but JIRA servers not reachable';
    } else {
        status.message = '❌ No VPN connection detected - JIRA servers not accessible';
    }
    
    return status;
}

export function displayVPNStatus(status: VPNStatus) {
    console.log('\n' + '='.repeat(60));
    console.log('🔒 VPN CONNECTION STATUS');
    console.log('='.repeat(60));
    console.log(status.message);
    
    if (status.provider) {
        console.log(`🔧 VPN Provider: ${status.provider}`);
    }
    
    console.log(`🌐 JIRA Reachable: ${status.canReachJira ? '✅ Yes' : '❌ No'}`);
    
    if (!status.canReachJira) {
        console.log('\n🚨 REQUIRED ACTIONS:');
        console.log('1. Connect to Palo Alto Networks GlobalProtect VPN');
        console.log('2. Verify you have access to Sony Music internal network');
        console.log('3. Test access: https://jira.smedigitalapps.com');
        console.log('4. Contact IT if connection issues persist');
    }
    
    console.log('='.repeat(60) + '\n');
}

export async function requireVPNConnection(): Promise<boolean> {
    const status = await checkVPNConnection();
    displayVPNStatus(status);
    
    if (!status.canReachJira) {
        console.log('❌ Cannot proceed without VPN connection to JIRA servers');
        return false;
    }
    
    return true;
}

// CLI usage
checkVPNConnection().then(status => {
    displayVPNStatus(status);
    process.exit(status.canReachJira ? 0 : 1);
});
