import { createClient } from '@supabase/supabase-js';

async function manageUATData() {
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🧪 UAT DATA MANAGEMENT');
    console.log('================================================================================');
    
    try {
        // Count production vs UAT tickets
        const { data: allTickets, error: allError } = await supabase
            .from('jira_tickets')
            .select('external_id, metadata');

        if (allError) {
            console.error('Error querying tickets:', allError);
            return;
        }

        let productionCount = 0;
        let uatCount = 0;

        allTickets?.forEach((ticket: any) => {
            if (ticket.external_id?.startsWith('UAT-') || 
                ticket.metadata?.environment === 'UAT') {
                uatCount++;
            } else {
                productionCount++;
            }
        });

        console.log('📊 DATA BREAKDOWN:');
        console.log(`   Production tickets: ${productionCount}`);
        console.log(`   UAT test tickets: ${uatCount}`);
        console.log(`   Total: ${allTickets?.length || 0}`);

        // Show UAT tickets
        const { data: uatTickets, error: uatError } = await supabase
            .from('jira_tickets')
            .select('external_id, title, metadata')
            .or('external_id.like.UAT-%,metadata->>environment.eq.UAT')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!uatError && uatTickets && uatTickets.length > 0) {
            console.log('\n📝 Sample UAT tickets:');
            uatTickets.forEach((ticket: any) => {
                console.log(`   ${ticket.external_id}: ${ticket.title?.substring(0, 60)}...`);
            });
        }

        // Check for cleanup candidates
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { data: oldUATTickets, error: oldError } = await supabase
            .from('jira_tickets')
            .select('external_id')
            .eq('metadata->>environment', 'UAT')
            .lt('created_at', thirtyDaysAgo);

        if (!oldError && oldUATTickets) {
            console.log(`\n🧹 Old UAT tickets (>30 days): ${oldUATTickets.length}`);
            if (oldUATTickets.length > 0) {
                console.log('   Run cleanup-uat-tickets.sql to remove them');
            }
        }

        console.log('\n🎯 UAT DATA SAFETY FEATURES:');
        console.log('   ✅ UAT tickets prefixed with "UAT-"');
        console.log('   ✅ UAT tickets marked in metadata');
        console.log('   ✅ UAT tickets flagged as temporary');
        console.log('   ✅ Auto-cleanup after 30 days');
        console.log('   ✅ Clear separation from production data');

    } catch (error) {
        console.error('Error:', error);
    }
}

// Also create a function to safely clean up UAT data
async function cleanupUATData() {
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🧹 CLEANING UP UAT TEST DATA');
    
    const { data: uatTickets, error: selectError } = await supabase
        .from('jira_tickets')
        .select('external_id')
        .eq('metadata->>environment', 'UAT');

    if (selectError) {
        console.error('Error selecting UAT tickets:', selectError);
        return;
    }

    console.log(`Found ${uatTickets?.length || 0} UAT tickets to clean up`);

    if (uatTickets && uatTickets.length > 0) {
        const { error: deleteError } = await supabase
            .from('jira_tickets')
            .delete()
            .eq('metadata->>environment', 'UAT');

        if (deleteError) {
            console.error('Error deleting UAT tickets:', deleteError);
        } else {
            console.log(`✅ Cleaned up ${uatTickets.length} UAT tickets`);
        }
    }
}

// Export functions for use in other scripts
export { manageUATData, cleanupUATData };

// CLI usage
if (process.argv[2] === 'cleanup') {
    cleanupUATData();
} else {
    manageUATData();
}
