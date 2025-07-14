import { createClient } from '@supabase/supabase-js';

async function queryJiraTickets() {
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        console.log('🔍 Querying Supabase database...');
        console.log('Database: https://kfxetwuuzljhybfgmpuc.supabase.co (Production)');
        
        // Get total ticket count
        const { count: totalCount, error: totalError } = await supabase
            .from('jira_tickets')
            .select('*', { count: 'exact', head: true });
        
        if (totalError) {
            console.error('Error getting total count:', totalError);
            return;
        }
        
        console.log(`\n📊 Total JIRA tickets in database: ${totalCount}`);
        
        // Get count by project
        const { data: projectCounts, error: projectError } = await supabase
            .from('jira_tickets')
            .select('project')
            .then(async ({ data, error }) => {
                if (error) return { data: null, error };
                
                const counts: { [key: string]: number } = {};
                data?.forEach(ticket => {
                    const project = ticket.project || 'Unknown';
                    counts[project] = (counts[project] || 0) + 1;
                });
                
                return { data: Object.entries(counts).map(([project, count]) => ({ project, count })), error: null };
            });
        
        if (projectError) {
            console.error('Error getting project counts:', projectError);
            return;
        }
        
        console.log('\n📈 Tickets by Project:');
        projectCounts?.forEach(({ project, count }) => {
            console.log(`  ${project}: ${count} tickets`);
        });
        
        // Get ITSM specific count
        const { count: itsmCount, error: itsmError } = await supabase
            .from('jira_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('project', 'ITSM');
        
        if (!itsmError) {
            console.log(`\n🎯 ITSM Project: ${itsmCount} tickets`);
        }
        
        // Get DPSA specific count
        const { count: dpsaCount, error: dpsaError } = await supabase
            .from('jira_tickets')
            .select('*', { count: 'exact', head: true })
            .eq('project', 'DPSA');
        
        if (!dpsaError) {
            console.log(`🎯 DPSA Project: ${dpsaCount} tickets`);
        }
        
        // Sample tickets
        const { data: sampleTickets, error: sampleError } = await supabase
            .from('jira_tickets')
            .select('key, project, summary, status')
            .limit(5);
        
        if (!sampleError && sampleTickets) {
            console.log('\n📝 Sample tickets:');
            sampleTickets.forEach(ticket => {
                console.log(`  ${ticket.key} (${ticket.project}): ${ticket.summary?.substring(0, 50)}...`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

queryJiraTickets();
