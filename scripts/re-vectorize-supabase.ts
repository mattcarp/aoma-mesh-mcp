/**
 * Re-Vectorize Supabase Embeddings
 *
 * Re-generates embeddings for all Supabase vectors using the correct
 * OpenAI model (text-embedding-ada-002) to fix the embedding mismatch.
 *
 * Processes:
 * 1. aoma_unified_vectors (knowledge + jira + git)
 * 2. git_file_embeddings (legacy table)
 *
 * Usage:
 *   npx tsx scripts/re-vectorize-supabase.ts [--dry-run] [--table=TABLE] [--batch-size=50]
 */

import { validateAndLoadEnvironment } from '../src/config/environment.js';
import { SupabaseService } from '../src/services/supabase.service.js';
import { OpenAIEmbeddings } from '@langchain/openai';

const config = validateAndLoadEnvironment();
const supabase = new SupabaseService(config);

// Create embeddings service with correct model
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: config.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const tableArg = args.find(arg => arg.startsWith('--table='));
const targetTable = tableArg ? tableArg.split('=')[1] : 'all';
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 50;

console.log('='.repeat(80));
console.log('SUPABASE RE-VECTORIZATION');
console.log('='.repeat(80));
console.log(`Model: text-embedding-ada-002`);
console.log(`Batch size: ${batchSize}`);
console.log(`Target table: ${targetTable}`);
console.log(`Dry run: ${isDryRun}`);
console.log(`Date: ${new Date().toISOString()}\n`);

interface ReVectorizeStats {
  table: string;
  totalRows: number;
  processed: number;
  updated: number;
  failed: number;
  avgSimilarityBefore: number;
  avgSimilarityAfter: number;
  startTime: Date;
  endTime?: Date;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Re-vectorize unified table (knowledge + jira + git)
 */
async function reVectorizeUnified(): Promise<ReVectorizeStats> {
  console.log('\n' + '-'.repeat(80));
  console.log('TABLE: aoma_unified_vectors');
  console.log('-'.repeat(80));

  const stats: ReVectorizeStats = {
    table: 'aoma_unified_vectors',
    totalRows: 0,
    processed: 0,
    updated: 0,
    failed: 0,
    avgSimilarityBefore: 0,
    avgSimilarityAfter: 0,
    startTime: new Date(),
    errors: []
  };

  // Get total count
  const { count } = await supabase.client
    .from('aoma_unified_vectors')
    .select('*', { count: 'exact', head: true });

  stats.totalRows = count || 0;
  console.log(`Total rows: ${stats.totalRows}`);

  if (stats.totalRows === 0) {
    console.log('⚠️  No rows to process');
    stats.endTime = new Date();
    return stats;
  }

  // Process in batches
  let offset = 0;
  while (offset < stats.totalRows) {
    console.log(`\nProcessing batch: ${offset + 1}-${Math.min(offset + batchSize, stats.totalRows)}`);

    // Fetch batch
    const { data: rows, error: fetchError } = await supabase.client
      .from('aoma_unified_vectors')
      .select('id, content, source_type, source_id')
      .range(offset, offset + batchSize - 1);

    if (fetchError || !rows) {
      console.error(`❌ Failed to fetch batch: ${fetchError?.message}`);
      stats.failed += batchSize;
      offset += batchSize;
      continue;
    }

    // Process each row
    for (const row of rows) {
      try {
        if (!row.content || row.content.trim().length === 0) {
          console.log(`  Skipping ${row.id}: empty content`);
          continue;
        }

        // Generate new embedding
        if (!isDryRun) {
          const newEmbedding = await embeddings.embedQuery(row.content);

          // Update row
          const { error: updateError } = await supabase.client
            .from('aoma_unified_vectors')
            .update({ embedding: newEmbedding as any })
            .eq('id', row.id);

          if (updateError) {
            console.error(`  ❌ Failed to update ${row.id}: ${updateError.message}`);
            stats.failed++;
            stats.errors.push({ id: row.id, error: updateError.message });
          } else {
            stats.updated++;
            if (stats.updated % 10 === 0) {
              console.log(`  ✅ Updated ${stats.updated}/${stats.totalRows}`);
            }
          }
        } else {
          console.log(`  [DRY RUN] Would update ${row.id}: [${row.source_type}] ${row.source_id.slice(0, 60)}...`);
          stats.updated++;
        }

        stats.processed++;
      } catch (error: any) {
        console.error(`  ❌ Error processing ${row.id}: ${error.message}`);
        stats.failed++;
        stats.errors.push({ id: row.id, error: error.message });
      }
    }

    offset += batchSize;

    // Rate limiting: wait 1s between batches to avoid OpenAI rate limits
    if (offset < stats.totalRows && !isDryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  stats.endTime = new Date();
  const elapsedMs = stats.endTime.getTime() - stats.startTime.getTime();
  const elapsedSec = elapsedMs / 1000;

  console.log(`\n✅ Completed in ${elapsedSec.toFixed(1)}s`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Updated: ${stats.updated}`);
  console.log(`   Failed: ${stats.failed}`);

  return stats;
}

/**
 * Re-vectorize git files table
 */
async function reVectorizeGitFiles(): Promise<ReVectorizeStats> {
  console.log('\n' + '-'.repeat(80));
  console.log('TABLE: git_file_embeddings');
  console.log('-'.repeat(80));

  const stats: ReVectorizeStats = {
    table: 'git_file_embeddings',
    totalRows: 0,
    processed: 0,
    updated: 0,
    failed: 0,
    avgSimilarityBefore: 0,
    avgSimilarityAfter: 0,
    startTime: new Date(),
    errors: []
  };

  // Get total count
  const { count } = await supabase.client
    .from('git_file_embeddings')
    .select('*', { count: 'exact', head: true });

  stats.totalRows = count || 0;
  console.log(`Total rows: ${stats.totalRows}`);

  if (stats.totalRows === 0) {
    console.log('⚠️  No rows to process');
    stats.endTime = new Date();
    return stats;
  }

  // Process in batches
  let offset = 0;
  while (offset < stats.totalRows) {
    console.log(`\nProcessing batch: ${offset + 1}-${Math.min(offset + batchSize, stats.totalRows)}`);

    // Fetch batch
    const { data: rows, error: fetchError } = await supabase.client
      .from('git_file_embeddings')
      .select('id, content, repo_path, file_path')
      .range(offset, offset + batchSize - 1);

    if (fetchError || !rows) {
      console.error(`❌ Failed to fetch batch: ${fetchError?.message}`);
      stats.failed += batchSize;
      offset += batchSize;
      continue;
    }

    // Process each row
    for (const row of rows) {
      try {
        if (!row.content || row.content.trim().length === 0) {
          console.log(`  Skipping ${row.file_path}: empty content`);
          continue;
        }

        // Generate new embedding
        if (!isDryRun) {
          const newEmbedding = await embeddings.embedQuery(row.content);

          // Update row
          const { error: updateError } = await supabase.client
            .from('git_file_embeddings')
            .update({ embedding: newEmbedding as any })
            .eq('id', row.id);

          if (updateError) {
            console.error(`  ❌ Failed to update ${row.file_path}: ${updateError.message}`);
            stats.failed++;
            stats.errors.push({ id: row.id, error: updateError.message });
          } else {
            stats.updated++;
            if (stats.updated % 50 === 0) {
              console.log(`  ✅ Updated ${stats.updated}/${stats.totalRows}`);
            }
          }
        } else {
          console.log(`  [DRY RUN] Would update: ${row.file_path}`);
          stats.updated++;
        }

        stats.processed++;
      } catch (error: any) {
        console.error(`  ❌ Error processing ${row.file_path}: ${error.message}`);
        stats.failed++;
        stats.errors.push({ id: row.id, error: error.message });
      }
    }

    offset += batchSize;

    // Rate limiting: wait 1s between batches
    if (offset < stats.totalRows && !isDryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  stats.endTime = new Date();
  const elapsedMs = stats.endTime.getTime() - stats.startTime.getTime();
  const elapsedSec = elapsedMs / 1000;

  console.log(`\n✅ Completed in ${elapsedSec.toFixed(1)}s`);
  console.log(`   Processed: ${stats.processed}`);
  console.log(`   Updated: ${stats.updated}`);
  console.log(`   Failed: ${stats.failed}`);

  return stats;
}

/**
 * Main execution
 */
async function main() {
  const allStats: ReVectorizeStats[] = [];

  try {
    if (targetTable === 'all' || targetTable === 'unified') {
      const unifiedStats = await reVectorizeUnified();
      allStats.push(unifiedStats);
    }

    if (targetTable === 'all' || targetTable === 'git') {
      const gitStats = await reVectorizeGitFiles();
      allStats.push(gitStats);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    for (const stats of allStats) {
      const duration = stats.endTime
        ? ((stats.endTime.getTime() - stats.startTime.getTime()) / 1000).toFixed(1)
        : '0';

      console.log(`\n${stats.table}:`);
      console.log(`  Total rows: ${stats.totalRows}`);
      console.log(`  Processed: ${stats.processed}`);
      console.log(`  Updated: ${stats.updated}`);
      console.log(`  Failed: ${stats.failed}`);
      console.log(`  Duration: ${duration}s`);

      if (stats.errors.length > 0) {
        console.log(`  Errors (first 5):`);
        stats.errors.slice(0, 5).forEach(e => {
          console.log(`    - ${e.id}: ${e.error}`);
        });
      }
    }

    const totalProcessed = allStats.reduce((sum, s) => sum + s.processed, 0);
    const totalUpdated = allStats.reduce((sum, s) => sum + s.updated, 0);
    const totalFailed = allStats.reduce((sum, s) => sum + s.failed, 0);

    console.log(`\nOverall:`);
    console.log(`  Total processed: ${totalProcessed}`);
    console.log(`  Total updated: ${totalUpdated}`);
    console.log(`  Total failed: ${totalFailed}`);
    console.log(`  Success rate: ${((totalUpdated / totalProcessed) * 100).toFixed(1)}%`);

    if (!isDryRun) {
      console.log(`\n✅ Re-vectorization complete!`);
      console.log(`\nNext step: Run measure-embedding-quality.ts to verify improvement`);
    } else {
      console.log(`\n✅ Dry run complete! Use without --dry-run to actually update.`);
    }

  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run
main().then(() => process.exit(0));
