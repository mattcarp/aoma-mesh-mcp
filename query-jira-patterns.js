#!/usr/bin/env node

/**
 * Query Jira Patterns via MCP Server
 * This script connects to the local MCP server and analyzes Jira ticket patterns
 */

import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

class JiraPatternAnalyzer {
  constructor() {
    this.mcpProcess = null;
    this.requestId = 1;
  }

  async startMCPServer() {
    console.log('🚀 Starting MCP server...');
    
    this.mcpProcess = spawn('npx', ['tsx', 'src/aoma-mesh-server.ts'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('✅ MCP server started');
  }

  async queryJiraTickets(query, maxResults = 20) {
    if (!this.mcpProcess) {
      throw new Error('MCP server not started');
    }

    const request = {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: 'search_jira_tickets',
        arguments: {
          query,
          maxResults
        }
      }
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 30000);

      this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      
      let responseData = '';
      const onData = (data) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData);
          if (response.id === request.id) {
            clearTimeout(timeout);
            this.mcpProcess.stdout.off('data', onData);
            resolve(response);
          }
        } catch (e) {
          // Continue collecting data
        }
      };

      this.mcpProcess.stdout.on('data', onData);
    });
  }

  analyzePatterns(tickets) {
    console.log('\n📊 ANALYZING JIRA TICKET PATTERNS:');
    console.log('=' .repeat(50));
    
    if (!tickets || tickets.length === 0) {
      console.log('❌ No tickets found for analysis');
      return;
    }

    // Status distribution
    const statusCounts = {};
    const priorityCounts = {};
    const projectCounts = {};
    const keywordCounts = {};
    
    tickets.forEach(ticket => {
      // Status analysis
      const status = ticket.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      
      // Priority analysis
      const priority = ticket.priority || 'Unknown';
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
      
      // Project analysis
      const project = ticket.ticket_key ? ticket.ticket_key.split('-')[0] : 'Unknown';
      projectCounts[project] = (projectCounts[project] || 0) + 1;
      
      // Keyword analysis from summary
      if (ticket.summary) {
        const words = ticket.summary.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 3)
          .filter(word => !['with', 'from', 'that', 'this', 'have', 'been', 'will', 'when', 'where'].includes(word));
        
        words.forEach(word => {
          keywordCounts[word] = (keywordCounts[word] || 0) + 1;
        });
      }
    });

    // Display results
    console.log(`\n📈 TOTAL TICKETS ANALYZED: ${tickets.length}`);
    
    console.log('\n🏷️  STATUS DISTRIBUTION:');
    Object.entries(statusCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([status, count]) => {
        const percentage = ((count / tickets.length) * 100).toFixed(1);
        console.log(`   ${status}: ${count} (${percentage}%)`);
      });
    
    console.log('\n⚡ PRIORITY DISTRIBUTION:');
    Object.entries(priorityCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([priority, count]) => {
        const percentage = ((count / tickets.length) * 100).toFixed(1);
        console.log(`   ${priority}: ${count} (${percentage}%)`);
      });
    
    console.log('\n📁 PROJECT DISTRIBUTION:');
    Object.entries(projectCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([project, count]) => {
        const percentage = ((count / tickets.length) * 100).toFixed(1);
        console.log(`   ${project}: ${count} (${percentage}%)`);
      });
    
    console.log('\n🔍 TOP KEYWORDS IN SUMMARIES:');
    Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([keyword, count]) => {
        console.log(`   ${keyword}: ${count} occurrences`);
      });
    
    // Pattern insights
    console.log('\n💡 PATTERN INSIGHTS:');
    
    const topStatus = Object.entries(statusCounts).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most common status: ${topStatus[0]} (${topStatus[1]} tickets)`);
    
    const topPriority = Object.entries(priorityCounts).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most common priority: ${topPriority[0]} (${topPriority[1]} tickets)`);
    
    const topProject = Object.entries(projectCounts).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most active project: ${topProject[0]} (${topProject[1]} tickets)`);
    
    const topKeyword = Object.entries(keywordCounts).sort(([,a], [,b]) => b - a)[0];
    console.log(`   • Most frequent keyword: "${topKeyword[0]}" (${topKeyword[1]} occurrences)`);
  }

  async runAnalysis() {
    try {
      await this.startMCPServer();
      
      console.log('🔍 Querying Jira tickets for pattern analysis...');
      
      // Query for a broad set of tickets to analyze patterns
      const response = await this.queryJiraTickets('status:Open OR status:Closed OR status:"In Progress" OR status:Done', 50);
      
      if (response.error) {
        console.error('❌ Error querying tickets:', response.error);
        return;
      }
      
      const result = JSON.parse(response.result.content[0].text);
      
      if (result.success && result.tickets) {
        this.analyzePatterns(result.tickets);
      } else {
        console.log('❌ No tickets returned or query failed:', result);
      }
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
    } finally {
      if (this.mcpProcess) {
        this.mcpProcess.kill();
        console.log('\n🛑 MCP server stopped');
      }
    }
  }
}

// Run the analysis
const analyzer = new JiraPatternAnalyzer();
analyzer.runAnalysis().catch(console.error);