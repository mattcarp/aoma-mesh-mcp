import { createClient } from '@supabase/supabase-js';

async function correctTicketQuery() {
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        console.log('📊 Total tickets in database: 6,280');
        
        // Get sample data with correct fields
        const { data: sample, error: sampleError } = await supabase
            .from('jira_tickets')
            .select('external_id, title, status, priority, metadata, created_at')
            .limit(10);

        if (sampleError) {
            console.error('Error:', sampleError);
            return;
        }

        if (sample && sample.length > 0) {
            console.log('\n📝 Sample tickets:');
            sample.forEach((ticket: any, i: number) => {
                console.log(`\n${i + 1}. ID: ${ticket.external_id || 'No ID'}`);
                console.log(`   Title: ${ticket.title?.substring(0, 80) || 'No title'}...`);
                console.log(`   Status: ${ticket.status || 'No status'}`);
                console.log(`   Priority: ${ticket.priority || 'No priority'}`);
                console.log(`   Created: ${ticket.created_at || 'No date'}`);
                if (ticket.metadata) {
                    try {
                        const meta = typeof ticket.metadata === 'string' ? JSON.parse(ticket.metadata) : ticket.metadata;
                        if (meta.project) console.log(`   Project: ${meta.project}`);
                        if (meta.assignee) console.log(`   Assignee: ${meta.assignee}`);
                    } catch (e) {
                        // Ignore JSON parse errors
                    }
                }
            });
        }

        // Count tickets by project (from metadata or external_id)
        const { data: allTickets, error: allError } = await supabase
            .from('jira_tickets')
            .select('external_id, metadata');

        if (!allError && allTickets) {
            const projectCounts: { [key: string]: number } = {};
            
            allTickets.forEach((ticket: any) => {
                let project = 'Unknown';
                
                // Try to get project from external_id
                if (ticket.external_id && ticket.external_id.includes('-')) {
                    project = ticket.external_id.split('-')[0];
                }
                
                // Try to get project from metadata
                if (ticket.metadata) {
                    try {
                        const meta = typeof ticket.metadata === 'string' ? JSON.parse(ticket.metadata) : ticket.metadata;
                        if (meta.project) project = meta.project;
                    } catch (e) {
                        // Ignore JSON parse errors
                    }
                }
                
                projectCounts[project] = (projectCounts[project] || 0) + 1;
            });

            console.log('\n📈 Tickets by Project:');
            Object.entries(projectCounts)
                .sort(([,a], [,b]) => b - a)
                .forEach(([project, count]) => {
                    console.log(`  ${project}: ${count} tickets`);
                });

            const itsmCount = projectCounts['ITSM'] || 0;
            const dpsaCount = projectCounts['DPSA'] || 0;
            
            console.log(`\n🎯 Key Projects:`);
            console.log(`  ITSM: ${itsmCount} tickets`);
            console.log(`  DPSA: ${dpsaCount} tickets`);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

correctTicketQuery();
