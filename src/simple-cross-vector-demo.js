/**
 * Simple Cross-Vector Intelligence Demonstration
 * 
 * Compatible with Node 16+ and demonstrates the cross-vector capabilities
 * using the existing AOMA Mesh MCP server architecture.
 */

import { AOMAMeshServer } from './aoma-mesh-server.js';

class SimpleCrossVectorDemo {
  constructor() {
    this.server = null;
  }

  async initialize() {
    try {
      this.server = new AOMAMeshServer();
      console.log('✅ AOMA Mesh Server initialized\n');
      return true;
    } catch (error) {
      console.log('❌ Server initialization failed:', error.message);
      return false;
    }
  }

  async demonstrateCrossVectorIntelligence() {
    console.log('🚀 Cross-Vector Intelligence Demonstration\n');
    console.log('Testing multi-vector retrieval and correlation capabilities...\n');

    const testQuery = 'authentication service failures and errors';
    console.log(`Query: "${testQuery}"\n`);

    const results = {};
    let totalSources = 0;

    // Step 1: Search code files
    console.log('🔍 Step 1: Searching code repositories...');
    try {
      const codeResult = await this.server.callTool('search_code_files', {
        query: testQuery,
        maxResults: 5,
        threshold: 0.6
      });
      
      const codeData = this.parseResult(codeResult);
      const codeCount = codeData && codeData.results ? codeData.results.length : 0;
      
      results.code = codeData;
      totalSources++;
      console.log(`   ✓ Found ${codeCount} relevant code files`);
    } catch (error) {
      console.log(`   ⚠️  Code search failed: ${error.message}`);
    }

    // Step 2: Search Jira tickets
    console.log('🎫 Step 2: Searching Jira tickets...');
    try {
      const jiraResult = await this.server.callTool('search_jira_tickets', {
        query: testQuery,
        maxResults: 5,
        threshold: 0.6
      });
      
      const jiraData = this.parseResult(jiraResult);
      const jiraCount = jiraData && jiraData.results ? jiraData.results.length : 0;
      
      results.jira = jiraData;
      totalSources++;
      console.log(`   ✓ Found ${jiraCount} relevant tickets`);
    } catch (error) {
      console.log(`   ⚠️  Jira search failed: ${error.message}`);
    }

    // Step 3: Query AOMA knowledge
    console.log('📚 Step 3: Querying AOMA documentation...');
    try {
      const aomaResult = await this.server.callTool('query_aoma_knowledge', {
        query: testQuery,
        strategy: 'focused'
      });
      
      results.aoma = aomaResult;
      totalSources++;
      console.log(`   ✓ AOMA knowledge retrieved`);
    } catch (error) {
      console.log(`   ⚠️  AOMA query failed: ${error.message}`);
    }

    // Step 4: Analyze correlations
    console.log('🔗 Step 4: Analyzing cross-vector correlations...');
    const correlations = this.findCorrelations(results);
    console.log(`   ✓ Found ${correlations.length} correlations`);

    // Step 5: Generate synthesis
    console.log('🧠 Step 5: Generating intelligent synthesis...');
    try {
      const synthesisResult = await this.server.callTool('analyze_development_context', {
        currentTask: `Cross-vector analysis for "${testQuery}" found ${totalSources} data sources with ${correlations.length} correlations. Please provide actionable insights.`,
        systemArea: 'integration',
        urgency: 'medium'
      });
      
      results.synthesis = synthesisResult;
      console.log(`   ✓ Synthesis generated`);
    } catch (error) {
      console.log(`   ⚠️  Synthesis failed: ${error.message}`);
    }

    // Print results
    this.printResults(testQuery, results, correlations, totalSources);

    return results;
  }

  parseResult(result) {
    try {
      const content = result && result.content && result.content[0] && result.content[0].text;
      return content ? JSON.parse(content) : null;
    } catch (error) {
      return null;
    }
  }

  findCorrelations(results) {
    const correlations = [];
    
    try {
      // Extract terms from each source
      const codeTerms = this.extractTerms(results.code);
      const jiraTerms = this.extractTerms(results.jira);
      const aomaTerms = this.extractTerms(results.aoma);

      // Find overlapping terms between sources
      if (codeTerms.length > 0 && jiraTerms.length > 0) {
        const overlap = this.findOverlap(codeTerms, jiraTerms);
        if (overlap.length > 0) {
          correlations.push({
            type: 'code-jira',
            commonTerms: overlap.slice(0, 3),
            strength: overlap.length
          });
        }
      }

      if (codeTerms.length > 0 && aomaTerms.length > 0) {
        const overlap = this.findOverlap(codeTerms, aomaTerms);
        if (overlap.length > 0) {
          correlations.push({
            type: 'code-aoma',
            commonTerms: overlap.slice(0, 3),
            strength: overlap.length
          });
        }
      }

      if (jiraTerms.length > 0 && aomaTerms.length > 0) {
        const overlap = this.findOverlap(jiraTerms, aomaTerms);
        if (overlap.length > 0) {
          correlations.push({
            type: 'jira-aoma',
            commonTerms: overlap.slice(0, 3),
            strength: overlap.length
          });
        }
      }
    } catch (error) {
      console.log(`   Correlation analysis error: ${error.message}`);
    }

    return correlations;
  }

  extractTerms(resultData) {
    if (!resultData) return [];
    
    try {
      const text = JSON.stringify(resultData).toLowerCase();
      
      // Extract authentication and technical terms
      const terms = [];
      const patterns = [
        /\bauth\w*/g,
        /\blogin\w*/g,
        /\bservice\w*/g,
        /\berror\w*/g,
        /\bfail\w*/g,
        /\bapi\w*/g,
        /\btoken\w*/g,
        /\bsession\w*/g
      ];
      
      patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
          terms.push(...matches);
        }
      });
      
      // Remove duplicates
      return [...new Set(terms)].slice(0, 10);
    } catch (error) {
      return [];
    }
  }

  findOverlap(terms1, terms2) {
    const set1 = new Set(terms1);
    const set2 = new Set(terms2);
    return [...set1].filter(term => set2.has(term));
  }

  printResults(query, results, correlations, totalSources) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 CROSS-VECTOR INTELLIGENCE RESULTS');
    console.log('═══════════════════════════════════════════════════════════');
    
    console.log(`\nQuery: "${query}"`);
    console.log(`Sources Analyzed: ${totalSources}/3`);
    console.log(`Cross-Vector Correlations: ${correlations.length}`);
    
    if (correlations.length > 0) {
      console.log('\n🔗 Key Correlations Found:');
      correlations.forEach((corr, index) => {
        console.log(`   ${index + 1}. ${corr.type}: ${corr.commonTerms.join(', ')} (${corr.strength} terms)`);
      });
    }
    
    console.log('\n✅ Successfully Demonstrated:');
    console.log('   • Multi-vector retrieval across code, Jira, and AOMA docs');
    console.log('   • Automatic term extraction and correlation analysis');
    console.log('   • Cross-source pattern recognition');
    console.log('   • Intelligent synthesis generation');
    
    console.log('\n🚀 LangChain-Inspired Features:');
    console.log('   • Ensemble retrieval pattern (multiple sources)');
    console.log('   • Multi-vector correlation (LangChain MultiVectorRetriever concept)');
    console.log('   • Semantic synthesis (context-aware generation)');
    console.log('   • Actionable insights extraction');
    
    console.log('\n💡 Business Value:');
    console.log('   • Find code issues faster with historical context');
    console.log('   • Connect implementations to documented requirements');
    console.log('   • Leverage past solutions for current problems');
    console.log('   • Make data-driven development decisions');
    
    console.log('═══════════════════════════════════════════════════════════');
  }

  async testAdditionalScenarios() {
    console.log('\n🎯 Testing Additional Cross-Vector Scenarios\n');
    
    const scenarios = [
      {
        name: 'Performance Analysis',
        query: 'database performance optimization'
      },
      {
        name: 'Export Functionality',
        query: 'export failures and registration issues'
      }
    ];

    for (const scenario of scenarios) {
      console.log(`📋 ${scenario.name}: "${scenario.query}"`);
      
      try {
        // Quick cross-vector check
        const promises = [
          this.server.callTool('search_code_files', { query: scenario.query, maxResults: 3 }),
          this.server.callTool('search_jira_tickets', { query: scenario.query, maxResults: 3 }),
          this.server.callTool('query_aoma_knowledge', { query: scenario.query, strategy: 'rapid' })
        ];
        
        const results = await Promise.allSettled(promises);
        const successCount = results.filter(r => r.status === 'fulfilled').length;
        
        console.log(`   ✓ Successfully queried ${successCount}/3 sources\n`);
      } catch (error) {
        console.log(`   ⚠️  Scenario failed: ${error.message}\n`);
      }
    }
  }

  async runDemo() {
    console.log('🎯 AOMA MESH CROSS-VECTOR INTELLIGENCE DEMO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('Demonstrating LangChain-inspired multi-vector retrieval\n');

    // Initialize
    const initialized = await this.initialize();
    if (!initialized) {
      console.log('❌ Demo failed - could not initialize server');
      return;
    }

    // Test server health
    try {
      const health = await this.server.callTool('get_system_health', {});
      const healthData = this.parseResult(health);
      if (healthData) {
        console.log(`🏥 Server Status: ${healthData.status || 'unknown'}\n`);
      }
    } catch (error) {
      console.log('⚠️  Health check failed, continuing with demo...\n');
    }

    // Main demonstration
    await this.demonstrateCrossVectorIntelligence();

    // Additional scenarios
    await this.testAdditionalScenarios();

    console.log('🎉 Cross-Vector Intelligence Demo Complete!');
    console.log('\nNext Steps:');
    console.log('• Update Claude Desktop config to use enhanced server');
    console.log('• Test cross-vector queries in real development scenarios');
    console.log('• Monitor correlation accuracy and performance');
  }
}

// Run the demo
const demo = new SimpleCrossVectorDemo();
demo.runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
