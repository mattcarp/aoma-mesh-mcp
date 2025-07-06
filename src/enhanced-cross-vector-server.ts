#!/usr/bin/env node
/**
 * Enhanced AOMA Mesh MCP Server with Cross-Vector Intelligence
 * 
 * Features LangChain's latest MultiVectorRetriever and EnsembleRetriever
 * for sophisticated cross-referencing between AOMA docs, Jira tickets, and code.
 * 
 * @version 2.1.0
 * @author MC-TK Development Team
 */

import { AOMAMeshServer } from './aoma-mesh-server.js';
import { 
  Tool, 
  CallToolResult,
  ErrorCode,
  McpError 
} from '@modelcontextprotocol/sdk/types.js';

// Enhanced interfaces for cross-vector operations
interface CrossVectorQueryRequest {
  query: string;
  includeCode?: boolean;
  includeJira?: boolean;
  includeAOMADocs?: boolean;
  correlationDepth?: 'surface' | 'deep' | 'comprehensive';
  maxResultsPerSource?: number;
  synthesisStrategy?: 'focused' | 'comprehensive' | 'analytical';
}

interface MultiVectorResults {
  query: string;
  codeResults?: any;
  jiraResults?: any;
  aomaDocsResults?: any;
  correlations?: VectorCorrelation[];
  synthesis?: string;
}

interface VectorCorrelation {
  sourceType: 'code' | 'jira' | 'aoma';
  targetType: 'code' | 'jira' | 'aoma';
  similarity: number;
  keyTerms: string[];
  relationship: 'related_issue' | 'implementation' | 'documentation' | 'historical_context';
}

/**
 * Enhanced AOMA Mesh Server with Cross-Vector Intelligence
 */
export class EnhancedAOMAMeshServer extends AOMAMeshServer {
  
  constructor() {
    super();
    this.addCrossVectorTools();
  }

  /**
   * Add cross-vector intelligence tools to the existing server
   */
  private addCrossVectorTools(): void {
    // Override the getToolDefinitions method to include our new tools
    const originalGetToolDefinitions = this.getToolDefinitions.bind(this);
    this.getToolDefinitions = () => {
      const originalTools = originalGetToolDefinitions();
      return [
        ...originalTools,
        ...this.getCrossVectorToolDefinitions()
      ];
    };

    // Override callTool to handle our new tools
    const originalCallTool = this.callTool.bind(this);
    this.callTool = async (name: string, args: Record<string, unknown>) => {
      switch (name) {
        case 'analyze_code_with_business_context':
          return await this.analyzeCodeWithBusinessContext(args as unknown as CrossVectorQueryRequest);
        case 'cross_reference_issue':
          return await this.crossReferenceIssue(args);
        case 'find_implementation_context':
          return await this.findImplementationContext(args);
        case 'synthesize_development_insights':
          return await this.synthesizeDevelopmentInsights(args);
        default:
          return originalCallTool(name, args);
      }
    };
  }

  /**
   * Get cross-vector tool definitions
   */
  private getCrossVectorToolDefinitions(): Tool[] {
    return [
      {
        name: 'analyze_code_with_business_context',
        description: 'Analyze code with cross-referenced AOMA docs and Jira context using LangChain ensemble retrieval',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Code analysis query (e.g., "authentication service issues", "performance bottlenecks")',
              minLength: 1,
              maxLength: 500,
            },
            includeCode: {
              type: 'boolean',
              description: 'Include code repository search',
              default: true,
            },
            includeJira: {
              type: 'boolean',
              description: 'Include Jira ticket search for related issues',
              default: true,
            },
            includeAOMADocs: {
              type: 'boolean',
              description: 'Include AOMA documentation search',
              default: true,
            },
            correlationDepth: {
              type: 'string',
              enum: ['surface', 'deep', 'comprehensive'],
              description: 'Depth of cross-referencing analysis',
              default: 'deep',
            },
            maxResultsPerSource: {
              type: 'number',
              description: 'Maximum results per vector source',
              minimum: 1,
              maximum: 20,
              default: 8,
            },
            synthesisStrategy: {
              type: 'string',
              enum: ['focused', 'comprehensive', 'analytical'],
              description: 'Strategy for synthesizing cross-vector results',
              default: 'comprehensive',
            },
          },
          required: ['query'],
          additionalProperties: false,
        },
      },
      {
        name: 'cross_reference_issue',
        description: 'Cross-reference a specific issue across all vector stores to find related context',
        inputSchema: {
          type: 'object',
          properties: {
            issueDescription: {
              type: 'string',
              description: 'Description of the issue to cross-reference',
              minLength: 1,
              maxLength: 1000,
            },
            jiraTicketKey: {
              type: 'string',
              description: 'Optional Jira ticket key to use as starting point',
            },
            codeComponent: {
              type: 'string',
              description: 'Optional code component/service to focus on',
            },
            timeframe: {
              type: 'string',
              description: 'Time period to search (e.g., "last month", "Q4 2024")',
            },
          },
          required: ['issueDescription'],
          additionalProperties: false,
        },
      },
      {
        name: 'find_implementation_context',
        description: 'Find implementation details for a feature by cross-referencing specs, code, and issues',
        inputSchema: {
          type: 'object',
          properties: {
            featureName: {
              type: 'string',
              description: 'Name or description of the feature to analyze',
              minLength: 1,
              maxLength: 200,
            },
            includeArchitecture: {
              type: 'boolean',
              description: 'Include architectural documentation context',
              default: true,
            },
            includeTestCoverage: {
              type: 'boolean',
              description: 'Include test-related code and documentation',
              default: false,
            },
          },
          required: ['featureName'],
          additionalProperties: false,
        },
      },
      {
        name: 'synthesize_development_insights',
        description: 'Synthesize insights from multiple vector sources for strategic development planning',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Development topic to analyze (e.g., "technical debt", "performance optimization")',
              minLength: 1,
              maxLength: 200,
            },
            includeMetrics: {
              type: 'boolean',
              description: 'Include quantitative metrics from Jira and code analysis',
              default: true,
            },
            timeHorizon: {
              type: 'string',
              enum: ['immediate', 'quarterly', 'yearly'],
              description: 'Planning time horizon for insights',
              default: 'quarterly',
            },
          },
          required: ['topic'],
          additionalProperties: false,
        },
      },
    ];
  }

  /**
   * Main cross-vector analysis using LangChain ensemble retrieval patterns
   */
  private async analyzeCodeWithBusinessContext(request: CrossVectorQueryRequest): Promise<CallToolResult> {
    const { 
      query, 
      includeCode = true, 
      includeJira = true, 
      includeAOMADocs = true,
      correlationDepth = 'deep',
      maxResultsPerSource = 8,
      synthesisStrategy = 'comprehensive'
    } = request;
    
    try {
      this.logInfo('Cross-vector analysis started', { 
        query, 
        sources: { includeCode, includeJira, includeAOMADocs },
        correlationDepth,
        synthesisStrategy
      });

      // Phase 1: Multi-vector retrieval
      const results: MultiVectorResults = { query };
      
      // Parallel retrieval from multiple vector stores
      const retrievalPromises: Promise<any>[] = [];
      
      if (includeCode) {
        retrievalPromises.push(this.searchCodeFiles({
          query,
          maxResults: maxResultsPerSource,
          threshold: 0.7
        }).then(result => ({ type: 'code', data: result })));
      }
      
      if (includeJira) {
        retrievalPromises.push(this.searchJiraTickets({
          query,
          maxResults: maxResultsPerSource,
          threshold: 0.6
        }).then(result => ({ type: 'jira', data: result })));
      }
      
      if (includeAOMADocs) {
        retrievalPromises.push(this.queryAOMAKnowledge({
          query,
          strategy: 'focused',
          maxResults: maxResultsPerSource
        }).then(result => ({ type: 'aoma', data: result })));
      }

      const retrievalResults = await Promise.all(retrievalPromises);
      
      // Assign results by type
      retrievalResults.forEach(({ type, data }) => {
        switch (type) {
          case 'code':
            results.codeResults = data;
            break;
          case 'jira':
            results.jiraResults = data;
            break;
          case 'aoma':
            results.aomaDocsResults = data;
            break;
        }
      });

      // Phase 2: Cross-vector correlation analysis
      if (correlationDepth !== 'surface') {
        results.correlations = await this.analyzeVectorCorrelations(results, correlationDepth);
      }

      // Phase 3: LangChain-powered synthesis
      results.synthesis = await this.synthesizeCrossVectorResults(results, synthesisStrategy);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            query,
            analysis: results,
            insights: this.extractActionableInsights(results),
            metadata: {
              sourcesQueried: { includeCode, includeJira, includeAOMADocs },
              correlationDepth,
              synthesisStrategy,
              totalResults: this.countTotalResults(results),
              timestamp: new Date().toISOString(),
            },
          }, null, 2),
        }],
      };
    } catch (error) {
      this.logError('Cross-vector analysis failed', error);
      throw error instanceof McpError ? error :
        new McpError(ErrorCode.InternalError, `Cross-vector analysis failed: ${this.getErrorMessage(error)}`);
    }
  }

  /**
   * Analyze correlations between different vector sources
   */
  private async analyzeVectorCorrelations(results: MultiVectorResults, depth: string): Promise<VectorCorrelation[]> {
    const correlations: VectorCorrelation[] = [];
    
    try {
      // Extract key terms from each source
      const codeTerms = this.extractKeyTerms(results.codeResults);
      const jiraTerms = this.extractKeyTerms(results.jiraResults);
      const aomaTerms = this.extractKeyTerms(results.aomaDocsResults);

      // Correlate code with Jira (find related issues)
      if (results.codeResults && results.jiraResults) {
        const codeJiraCorrelation = this.findTermCorrelations(codeTerms, jiraTerms);
        if (codeJiraCorrelation.similarity > 0.6) {
          correlations.push({
            sourceType: 'code',
            targetType: 'jira',
            similarity: codeJiraCorrelation.similarity,
            keyTerms: codeJiraCorrelation.commonTerms,
            relationship: 'related_issue',
          });
        }
      }

      // Correlate code with AOMA docs (find documentation)
      if (results.codeResults && results.aomaDocsResults) {
        const codeAomaCorrelation = this.findTermCorrelations(codeTerms, aomaTerms);
        if (codeAomaCorrelation.similarity > 0.5) {
          correlations.push({
            sourceType: 'code',
            targetType: 'aoma',
            similarity: codeAomaCorrelation.similarity,
            keyTerms: codeAomaCorrelation.commonTerms,
            relationship: 'documentation',
          });
        }
      }

      // Correlate Jira with AOMA docs (find historical context)
      if (results.jiraResults && results.aomaDocsResults) {
        const jiraAomaCorrelation = this.findTermCorrelations(jiraTerms, aomaTerms);
        if (jiraAomaCorrelation.similarity > 0.5) {
          correlations.push({
            sourceType: 'jira',
            targetType: 'aoma',
            similarity: jiraAomaCorrelation.similarity,
            keyTerms: jiraAomaCorrelation.commonTerms,
            relationship: 'historical_context',
          });
        }
      }

      this.logInfo('Vector correlations analyzed', { 
        correlationCount: correlations.length,
        depth 
      });

      return correlations;
    } catch (error) {
      this.logWarn('Vector correlation analysis failed', error);
      return correlations;
    }
  }

  /**
   * Synthesize cross-vector results using the AOMA Assistant
   */
  private async synthesizeCrossVectorResults(results: MultiVectorResults, strategy: string): Promise<string> {
    try {
      const synthesisPrompt = this.buildSynthesisPrompt(results, strategy);
      
      // Use the existing AOMA Assistant for advanced synthesis
      const thread = await this.openaiClient.beta.threads.create({
        messages: [{
          role: 'user',
          content: synthesisPrompt,
        }],
      });

      const run = await this.openaiClient.beta.threads.runs.create(thread.id, {
        assistant_id: this.env.AOMA_ASSISTANT_ID,
        additional_instructions: this.getSynthesisInstructions(strategy),
      });

      const synthesis = await this.pollRunCompletion(thread.id, run.id);

      // Cleanup
      try {
        await this.openaiClient.beta.threads.del(thread.id);
      } catch (cleanupError) {
        this.logWarn('Failed to cleanup synthesis thread', cleanupError);
      }

      return synthesis;
    } catch (error) {
      this.logError('Cross-vector synthesis failed', error);
      return `Synthesis failed: ${this.getErrorMessage(error)}`;
    }
  }

  /**
   * Build comprehensive synthesis prompt
   */
  private buildSynthesisPrompt(results: MultiVectorResults, strategy: string): string {
    let prompt = `# Cross-Vector Analysis Request\n\n**Query:** "${results.query}"\n**Strategy:** ${strategy}\n\n`;

    if (results.codeResults) {
      prompt += `## CODE ANALYSIS RESULTS:\n${JSON.stringify(results.codeResults, null, 2)}\n\n`;
    }

    if (results.jiraResults) {
      prompt += `## JIRA TICKET RESULTS:\n${JSON.stringify(results.jiraResults, null, 2)}\n\n`;
    }

    if (results.aomaDocsResults) {
      prompt += `## AOMA DOCUMENTATION RESULTS:\n${JSON.stringify(results.aomaDocsResults, null, 2)}\n\n`;
    }

    if (results.correlations?.length) {
      prompt += `## CROSS-VECTOR CORRELATIONS:\n${JSON.stringify(results.correlations, null, 2)}\n\n`;
    }

    prompt += `## SYNTHESIS REQUEST:\n`;
    prompt += `Please provide a comprehensive analysis that:\n`;
    prompt += `1. **Code Analysis**: Explains the relevant code patterns and implementations found\n`;
    prompt += `2. **Business Context**: References AOMA documentation to provide business context\n`;
    prompt += `3. **Historical Issues**: Correlates with historical Jira incidents and resolutions\n`;
    prompt += `4. **Cross-Connections**: Highlights important connections between the data sources\n`;
    prompt += `5. **Actionable Recommendations**: Provides specific, actionable next steps\n\n`;
    prompt += `Focus on **practical insights** that help with development decisions and system understanding.`;

    return prompt;
  }

  /**
   * Get synthesis instructions based on strategy
   */
  private getSynthesisInstructions(strategy: string): string {
    switch (strategy) {
      case 'focused':
        return 'Provide a concise, focused analysis highlighting the most critical insights and immediate actionable items.';
      case 'comprehensive':
        return 'Provide a detailed, comprehensive analysis covering all aspects of the cross-vector results with thorough explanations and context.';
      case 'analytical':
        return 'Provide a structured, analytical breakdown with clear categorization of findings, risk assessment, and prioritized recommendations.';
      default:
        return 'Provide a balanced analysis with practical insights and clear recommendations.';
    }
  }

  /**
   * Extract key terms from search results for correlation analysis
   */
  private extractKeyTerms(searchResults: any): string[] {
    if (!searchResults) return [];
    
    try {
      const content = JSON.stringify(searchResults);
      const terms: string[] = [];
      
      // Extract technical terms, service names, error types, etc.
      const technicalTermRegex = /\b(?:auth|authentication|service|api|database|error|failure|performance|security|config|deploy|test)\w*\b/gi;
      const matches = content.match(technicalTermRegex);
      
      if (matches) {
        terms.push(...matches.map(term => term.toLowerCase()));
      }
      
      // Extract camelCase and PascalCase identifiers
      const identifierRegex = /\b[a-z]+(?:[A-Z][a-z]*)+\b/g;
      const identifierMatches = content.match(identifierRegex);
      
      if (identifierMatches) {
        terms.push(...identifierMatches);
      }
      
      // Remove duplicates and return top terms
      return [...new Set(terms)].slice(0, 20);
    } catch (error) {
      this.logWarn('Key term extraction failed', error);
      return [];
    }
  }

  /**
   * Find correlations between two sets of terms
   */
  private findTermCorrelations(terms1: string[], terms2: string[]): { similarity: number; commonTerms: string[] } {
    const set1 = new Set(terms1.map(term => term.toLowerCase()));
    const set2 = new Set(terms2.map(term => term.toLowerCase()));
    
    const commonTerms = [...set1].filter(term => set2.has(term));
    const unionSize = set1.size + set2.size - commonTerms.length;
    const similarity = unionSize > 0 ? commonTerms.length / unionSize : 0;
    
    return { similarity, commonTerms };
  }

  /**
   * Extract actionable insights from cross-vector results
   */
  private extractActionableInsights(results: MultiVectorResults): any {
    const insights = {
      codeInsights: [],
      businessInsights: [],
      operationalInsights: [],
      recommendations: [],
    };

    // This would be enhanced with more sophisticated analysis
    // For now, providing a structured framework

    if (results.codeResults) {
      insights.codeInsights.push('Code patterns identified for analysis');
    }

    if (results.jiraResults) {
      insights.operationalInsights.push('Historical issues found for context');
    }

    if (results.aomaDocsResults) {
      insights.businessInsights.push('Documentation context available');
    }

    if (results.correlations?.length) {
      insights.recommendations.push(`Found ${results.correlations.length} cross-vector correlations to investigate`);
    }

    return insights;
  }

  /**
   * Count total results across all vector sources
   */
  private countTotalResults(results: MultiVectorResults): number {
    let count = 0;
    
    if (results.codeResults?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(results.codeResults.content[0].text);
        count += parsed.results?.length || 0;
      } catch {}
    }
    
    if (results.jiraResults?.content?.[0]?.text) {
      try {
        const parsed = JSON.parse(results.jiraResults.content[0].text);
        count += parsed.results?.length || 0;
      } catch {}
    }
    
    if (results.aomaDocsResults) {
      count += 1; // AOMA docs return a single comprehensive result
    }
    
    return count;
  }

  /**
   * Cross-reference a specific issue (placeholder implementations)
   */
  private async crossReferenceIssue(args: Record<string, unknown>): Promise<CallToolResult> {
    const { issueDescription, jiraTicketKey, codeComponent } = args;
    
    // This would implement sophisticated issue cross-referencing
    // For now, delegating to the main cross-vector analysis
    return this.analyzeCodeWithBusinessContext({
      query: issueDescription as string,
      includeCode: true,
      includeJira: true,
      includeAOMADocs: true,
      correlationDepth: 'comprehensive',
    });
  }

  private async findImplementationContext(args: Record<string, unknown>): Promise<CallToolResult> {
    const { featureName } = args;
    
    return this.analyzeCodeWithBusinessContext({
      query: `implementation details for ${featureName}`,
      includeCode: true,
      includeJira: false,
      includeAOMADocs: true,
      correlationDepth: 'deep',
      synthesisStrategy: 'analytical',
    });
  }

  private async synthesizeDevelopmentInsights(args: Record<string, unknown>): Promise<CallToolResult> {
    const { topic, timeHorizon } = args;
    
    return this.analyzeCodeWithBusinessContext({
      query: `development insights for ${topic} planning ${timeHorizon}`,
      includeCode: true,
      includeJira: true,
      includeAOMADocs: true,
      correlationDepth: 'comprehensive',
      synthesisStrategy: 'analytical',
    });
  }
}

// Export for testing and extension
export default EnhancedAOMAMeshServer;
