import { createClient } from '@supabase/supabase-js';

async function checkTableStructure() {
    const supabase = createClient(
        'https://kfxetwuuzljhybfgmpuc.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // Get table structure
        const { data: columns, error: structError } = await supabase.rpc('sql', {
            query: `
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'jira_tickets' 
                ORDER BY ordinal_position;
            `
        });

        if (structError) {
            console.error('Error getting structure:', structError);
            return;
        }

        console.log('📋 Table structure:');
        columns?.forEach((col: any) => {
            console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'required'})`);
        });

        // Get sample data
        const { data: sample, error: sampleError } = await supabase
            .from('jira_tickets')
            .select('*')
            .limit(3);

        if (!sampleError && sample) {
            console.log('\n📝 Sample tickets:');
            sample.forEach((ticket: any) => {
                console.log(`  Key: ${ticket.key || 'N/A'}`);
                console.log(`  Summary: ${ticket.summary?.substring(0, 80)}...`);
                console.log(`  Status: ${ticket.status || 'N/A'}`);
                console.log('  ---');
            });
        }

        // Check for ITSM tickets
        const { data: itsmTickets, error: itsmError } = await supabase
            .from('jira_tickets')
            .select('key')
            .ilike('key', 'ITSM%')
            .limit(10);

        if (!itsmError) {
            console.log(`\n🎯 ITSM tickets found: ${itsmTickets?.length || 0}`);
            itsmTickets?.forEach((ticket: any) => {
                console.log(`  ${ticket.key}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkTableStructure();
