import { createClient } from '@supabase/supabase-js';

async function checkStageEnvironment() {
    console.log('🔄 SWITCHING TO JIRA UPGRADE TESTING ENVIRONMENT');
    console.log('');
    console.log('❌ Production JIRA: https://jira.smedigitalapps.com');
    console.log('✅ UAT/Stage JIRA: https://jirauat.smedigitalapps.com');
    console.log('');
    
    // Check if we're using the correct Supabase database for testing
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Check current ticket count
        const { count: currentCount, error } = await supabase
            .from('jira_tickets')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('Database error:', error);
            return;
        }

        console.log(`📊 Current database: ${currentCount} tickets`);
        console.log('');
        console.log('🔍 ENVIRONMENT CHECK:');
        console.log('   - Are these from PRODUCTION or UAT/staging?');
        console.log('   - Should we create a separate staging database?');
        console.log('   - Or are we testing upgrades on production data?');
        console.log('');
        console.log('🎯 NEXT ACTIONS:');
        console.log('   1. Confirm which environment to use');
        console.log('   2. Update all scripts to use UAT URL: https://jirauat.smedigitalapps.com');
        console.log('   3. Test JIRA upgrade scenarios on staging');

        // Get sample data to see which environment
        const { data: sample, error: sampleError } = await supabase
            .from('jira_tickets')
            .select('external_id, title, metadata')
            .limit(3);

        if (!sampleError && sample) {
            console.log('');
            console.log('📝 Sample tickets (to identify environment):');
            sample.forEach((ticket: any, i: number) => {
                console.log(`${i + 1}. ID: ${ticket.external_id || 'N/A'}`);
                console.log(`   Title: ${ticket.title?.substring(0, 60) || 'N/A'}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkStageEnvironment();
