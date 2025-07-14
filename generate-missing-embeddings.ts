#!/usr/bin/env tsx
/**
 * Generate embeddings for JIRA tickets that don't have them
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateMissingEmbeddings() {
  console.log('🔄 Generating embeddings for missing JIRA tickets...\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Missing Supabase credentials');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ Missing OpenAI API key');
    return;
  }

  const client = createClient(supabaseUrl, supabaseKey);

  try {
    // Find tickets that don't have embeddings
    console.log('1. Finding tickets without embeddings...');
    
    const { data: ticketsWithoutEmbeddings, error: findError } = await client
      .from('jira_tickets')
      .select('external_id, title, description, status, priority, created_at, updated_at, metadata')
      .not('external_id', 'in', `(SELECT ticket_key FROM jira_ticket_embeddings)`);

    if (findError) {
      console.log('❌ Error finding tickets without embeddings:', findError.message);
      return;
    }

    const missingCount = ticketsWithoutEmbeddings?.length || 0;
    console.log(`✅ Found ${missingCount} tickets without embeddings\n`);

    if (missingCount === 0) {
      console.log('🎉 All tickets already have embeddings!');
      return;
    }

    // Process in batches of 10
    const batchSize = 10;
    let processed = 0;

    for (let i = 0; i < missingCount; i += batchSize) {
      const batch = ticketsWithoutEmbeddings.slice(i, i + batchSize);
      
      console.log(`\n2. Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingCount / batchSize)} (${batch.length} tickets)...`);

      for (const ticket of batch) {
        try {
          // Create text for embedding
          const textForEmbedding = `${ticket.title || ''} ${ticket.description || ''}`.trim();
          
          if (!textForEmbedding) {
            console.log(`⚠️  Skipping ${ticket.external_id} - no text content`);
            continue;
          }

          // Generate embedding
          const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: textForEmbedding,
            encoding_format: 'float'
          });

          const embedding = embeddingResponse.data[0].embedding;

          // Insert into jira_ticket_embeddings table
          const { error: insertError } = await client
            .from('jira_ticket_embeddings')
            .insert({
              ticket_key: ticket.external_id,
              summary: ticket.title,
              embedding: embedding,
              metadata: {
                ...ticket.metadata,
                description: ticket.description, // Store description in metadata
                status: ticket.status,
                priority: ticket.priority,
                embedding_generated_at: new Date().toISOString()
              },
              created_at: ticket.created_at,
              updated_at: ticket.updated_at
            });

          if (insertError) {
            console.log(`❌ Error inserting embedding for ${ticket.external_id}:`, insertError.message);
          } else {
            console.log(`✅ Generated embedding for ${ticket.external_id}`);
            processed++;
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.log(`❌ Error processing ${ticket.external_id}:`, error.message);
        }
      }
    }

    console.log(`\n🎉 Successfully generated embeddings for ${processed}/${missingCount} tickets!`);

    // Verify final counts
    const { count: finalEmbeddingsCount } = await client
      .from('jira_ticket_embeddings')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Final embedding count: ${finalEmbeddingsCount}`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

generateMissingEmbeddings().catch(console.error);
