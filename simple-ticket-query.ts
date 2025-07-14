import { createClient } from '@supabase/supabase-js';

async function simpleTicketQuery() {
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Get sample data to see structure
        const { data: sample, error: sampleError } = await supabase
            .from('jira_tickets')
            .select('*')
            .limit(5);

        if (sampleError) {
            console.error('Error:', sampleError);
            return;
        }

        console.log('📊 Total tickets: 6,280');
        console.log('\n📋 Sample ticket structure:');
        if (sample && sample.length > 0) {
            console.log('Available fields:', Object.keys(sample[0]));
            
            console.log('\n📝 Sample tickets:');
            sample.forEach((ticket: any, i: number) => {
                console.log(`\n${i + 1}. ${ticket.key || 'No key'}`);
                console.log(`   Summary: ${ticket.summary?.substring(0, 80) || 'No summary'}...`);
                console.log(`   Status: ${ticket.status || 'No status'}`);
                if (ticket.assignee) console.log(`   Assignee: ${ticket.assignee}`);
                if (ticket.created) console.log(`   Created: ${ticket.created}`);
            });
        }

        // Count tickets by key prefix
        const { data: allTickets, error: allError } = await supabase
            .from('jira_tickets')
            .select('key');

        if (!allError && allTickets) {
            const projectCounts: { [key: string]: number } = {};
            
            allTickets.forEach((ticket: any) => {
                if (ticket.key) {
                    const project = ticket.key.split('-')[0];
                    projectCounts[project] = (projectCounts[project] || 0) + 1;
                }
            });

            console.log('\n📈 Tickets by Project:');
            Object.entries(projectCounts)
                .sort(([,a], [,b]) => b - a)
                .forEach(([project, count]) => {
                    console.log(`  ${project}: ${count} tickets`);
                });

            const itsmCount = projectCounts['ITSM'] || 0;
            console.log(`\n🎯 ITSM tickets: ${itsmCount}`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

simpleTicketQuery();
