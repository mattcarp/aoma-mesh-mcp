/**
 * Simple Jira Pattern Analysis
 * Uses direct Supabase connection to analyze ticket patterns
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kfxetwuuzljhybfgmpuc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeJiraPatterns() {
  console.log('🔍 ANALYZING JIRA TICKET PATTERNS');
  console.log('=' .repeat(50));
  
  try {
    // Get a sample of tickets for analysis
    console.log('📊 Fetching ticket data...');
    
    const { data: tickets, error } = await supabase
      .from('jira_ticket_embeddings')
      .select('ticket_key, summary, metadata')
      .limit(100);
    
    if (error) {
      console.error('❌ Error fetching tickets:', error);
      return;
    }
    
    if (!tickets || tickets.length === 0) {
      console.log('❌ No tickets found');
      return;
    }
    
    console.log(`✅ Analyzing ${tickets.length} tickets...\n`);
    
    // Initialize counters
    const patterns = {
      projects: {},
      keywords: {},
      summaryLengths: [],
      ticketTypes: {}
    };
    
    // Analyze each ticket
    tickets.forEach(ticket => {
      // Extract project from ticket key
      if (ticket.ticket_key) {
        const project = ticket.ticket_key.split('-')[0];
        patterns.projects[project] = (patterns.projects[project] || 0) + 1;
      }
      
      // Analyze summary for keywords and patterns
      if (ticket.summary) {
        patterns.summaryLengths.push(ticket.summary.length);
        
        // Extract meaningful keywords
        const words = ticket.summary.toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter(word => word.length > 3)
          .filter(word => !['with', 'from', 'that', 'this', 'have', 'been', 'will', 'when', 'where', 'they', 'were', 'what', 'would', 'could', 'should'].includes(word));
        
        words.forEach(word => {
          patterns.keywords[word] = (patterns.keywords[word] || 0) + 1;
        });
        
        // Identify ticket types based on keywords
        const summary = ticket.summary.toLowerCase();
        if (summary.includes('bug') || summary.includes('error') || summary.includes('issue') || summary.includes('problem')) {
          patterns.ticketTypes['Bug/Issue'] = (patterns.ticketTypes['Bug/Issue'] || 0) + 1;
        } else if (summary.includes('feature') || summary.includes('enhancement') || summary.includes('improvement')) {
          patterns.ticketTypes['Feature/Enhancement'] = (patterns.ticketTypes['Feature/Enhancement'] || 0) + 1;
        } else if (summary.includes('task') || summary.includes('update') || summary.includes('change')) {
          patterns.ticketTypes['Task/Update'] = (patterns.ticketTypes['Task/Update'] || 0) + 1;
        } else if (summary.includes('test') || summary.includes('testing')) {
          patterns.ticketTypes['Testing'] = (patterns.ticketTypes['Testing'] || 0) + 1;
        } else {
          patterns.ticketTypes['Other'] = (patterns.ticketTypes['Other'] || 0) + 1;
        }
      }
    });
    
    // Display analysis results
    console.log('📁 PROJECT DISTRIBUTION:');
    Object.entries(patterns.projects)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([project, count]) => {
        const percentage = ((count / tickets.length) * 100).toFixed(1);
        console.log(`   ${project}: ${count} tickets (${percentage}%)`);
      });
    
    console.log('\n🏷️  TICKET TYPE PATTERNS:');
    Object.entries(patterns.ticketTypes)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = ((count / tickets.length) * 100).toFixed(1);
        console.log(`   ${type}: ${count} tickets (${percentage}%)`);
      });
    
    console.log('\n🔍 TOP KEYWORDS (appearing in summaries):');
    Object.entries(patterns.keywords)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .forEach(([keyword, count]) => {
        console.log(`   "${keyword}": ${count} occurrences`);
      });
    
    // Summary statistics
    const avgSummaryLength = patterns.summaryLengths.reduce((a, b) => a + b, 0) / patterns.summaryLengths.length;
    const maxSummaryLength = Math.max(...patterns.summaryLengths);
    const minSummaryLength = Math.min(...patterns.summaryLengths);
    
    console.log('\n📏 SUMMARY LENGTH STATISTICS:');
    console.log(`   Average: ${avgSummaryLength.toFixed(1)} characters`);
    console.log(`   Range: ${minSummaryLength} - ${maxSummaryLength} characters`);
    
    // Pattern insights
    console.log('\n💡 KEY INSIGHTS:');
    
    const topProject = Object.entries(patterns.projects).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most active project: ${topProject[0]} (${topProject[1]} tickets)`);
    
    const topTicketType = Object.entries(patterns.ticketTypes).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most common ticket type: ${topTicketType[0]} (${topTicketType[1]} tickets)`);
    
    const topKeyword = Object.entries(patterns.keywords).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most frequent keyword: "${topKeyword[0]}" (${topKeyword[1]} occurrences)`);
    
    const projectCount = Object.keys(patterns.projects).length;
    console.log(`   • Active projects: ${projectCount} different projects`);
    
    // Specific pattern searches
    console.log('\n🔎 SPECIFIC PATTERN ANALYSIS:');
    
    // Authentication-related tickets
    const authTickets = tickets.filter(t => 
      t.summary && t.summary.toLowerCase().includes('auth')
    );
    console.log(`   • Authentication-related tickets: ${authTickets.length}`);
    
    // Error/Bug tickets
    const errorTickets = tickets.filter(t => 
      t.summary && (t.summary.toLowerCase().includes('error') || t.summary.toLowerCase().includes('bug'))
    );
    console.log(`   • Error/Bug tickets: ${errorTickets.length}`);
    
    // Performance tickets
    const perfTickets = tickets.filter(t => 
      t.summary && (t.summary.toLowerCase().includes('performance') || t.summary.toLowerCase().includes('slow'))
    );
    console.log(`   • Performance-related tickets: ${perfTickets.length}`);
    
    console.log('\n✅ Pattern analysis complete!');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeJiraPatterns();