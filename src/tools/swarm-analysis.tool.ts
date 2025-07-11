/**
 * Swarm Analysis Tool
 * 
 * Advanced multi-agent cross-vector analysis with dynamic handoffs.
 * This is a simplified implementation of the 2025 LangGraph Swarm pattern.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { OpenAIService } from '../../services/openai.service';
import { SupabaseService } from '../../services/supabase.service';
import { SwarmAnalysisRequest } from '../../types/requests';

export class SwarmAnalysisTool extends BaseTool {
  readonly definition: Tool = {
    name: 'swarm_analyze_cross_vector',
    description: '🚀 2025 LangGraph Swarm: Advanced multi-agent cross-vector analysis with dynamic handoffs',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Complex query requiring multiple agent specializations',
          minLength: 1,
          maxLength: 1000,
        },
        primaryAgent: {
          type: 'string',
          enum: ['code_specialist', 'jira_analyst', 'aoma_researcher', 'synthesis_coordinator'],
          description: 'Initial agent to handle the query (2025 swarm pattern)',
          default: 'synthesis_coordinator',
        },
        contextStrategy: {
          type: 'string',
          enum: ['isolated', 'shared', 'selective_handoff'],
          description: 'Context sharing strategy between agents (2025 memory patterns)',
          default: 'selective_handoff',
        },
        maxAgentHops: {
          type: 'number',
          description: 'Maximum agent handoffs allowed (prevents infinite loops)',
          minimum: 1,
          maximum: 10,
          default: 5,
        },
        enableMemoryPersistence: {
          type: 'boolean',
          description: 'Enable cross-session memory for agents',
          default: false,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  };

  constructor(
    private readonly openaiService: OpenAIService,
    private readonly supabaseService: SupabaseService
  ) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as SwarmAnalysisRequest;
    const { 
      query, 
      primaryAgent = 'synthesis_coordinator', 
      contextStrategy = 'selective_handoff', 
      maxAgentHops = 5,
      enableMemoryPersistence = false 
    } = request;

    context.logger.info('Executing swarm analysis', {
      query: query.slice(0, 100),
      primaryAgent,
      contextStrategy,
      maxAgentHops,
      enableMemoryPersistence
    });

    try {
      // Simplified swarm analysis - in production this would involve complex orchestration
      const analysisSteps = [];
      let currentAgent = primaryAgent;
      let hops = 0;

      // Gather cross-vector data
      const [codeData, jiraData, aomaData] = await Promise.all([
        this.gatherCodeContext(query),
        this.gatherJiraContext(query),
        this.gatherAOMAContext(query)
      ]);

      // Simulate agent handoffs
      while (hops < maxAgentHops) {
        const agentResult = await this.executeAgentStep(
          currentAgent,
          query,
          { codeData, jiraData, aomaData },
          analysisSteps,
          contextStrategy
        );

        analysisSteps.push(agentResult);

        // Determine if handoff is needed
        const nextAgent = this.determineNextAgent(currentAgent, agentResult, query);
        if (!nextAgent || nextAgent === currentAgent) {
          break;
        }

        currentAgent = nextAgent;
        hops++;
      }

      // Synthesize final result
      const synthesis = await this.synthesizeResults(query, analysisSteps, contextStrategy);

      const result = {
        query,
        configuration: {
          primaryAgent,
          contextStrategy,
          maxAgentHops,
          enableMemoryPersistence
        },
        execution: {
          agentHops: hops,
          agentsInvolved: [...new Set(analysisSteps.map(s => s.agent))],
          totalSteps: analysisSteps.length
        },
        agentSteps: analysisSteps,
        synthesis,
        metadata: {
          crossVectorData: {
            codeResults: codeData.length,
            jiraResults: jiraData.length,
            aomaResults: aomaData.length
          },
          timestamp: new Date().toISOString(),
          swarmVersion: '2025.1'
        }
      };

      context.logger.info('Swarm analysis completed', {
        agentHops: hops,
        agentsInvolved: result.execution.agentsInvolved.length,
        totalSteps: analysisSteps.length
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Swarm analysis failed', { error });
      return this.error('Failed to execute swarm analysis', { error: error instanceof Error ? error.message : error });
    }
  }

  private async gatherCodeContext(query: string): Promise<any[]> {
    try {
      return await this.supabaseService.searchCodeFiles(query, { maxResults: 5, threshold: 0.6 });
    } catch (error) {
      return [];
    }
  }

  private async gatherJiraContext(query: string): Promise<any[]> {
    try {
      return await this.supabaseService.searchJiraTickets(query, { maxResults: 5, threshold: 0.6 });
    } catch (error) {
      return [];
    }
  }

  private async gatherAOMAContext(query: string): Promise<any[]> {
    try {
      return await this.supabaseService.searchKnowledge(query, 5, 0.6);
    } catch (error) {
      return [];
    }
  }

  private async executeAgentStep(
    agent: string,
    query: string,
    crossVectorData: any,
    previousSteps: any[],
    contextStrategy: string
  ): Promise<any> {
    const agentPrompt = this.buildAgentPrompt(agent, query, crossVectorData, previousSteps, contextStrategy);
    
    try {
      const response = await this.openaiService.queryKnowledge(agentPrompt, 'focused');
      
      return {
        agent,
        step: previousSteps.length + 1,
        focus: this.getAgentFocus(agent),
        analysis: response,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        agent,
        step: previousSteps.length + 1,
        focus: this.getAgentFocus(agent),
        analysis: 'Agent analysis unavailable due to service error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private buildAgentPrompt(agent: string, query: string, data: any, previousSteps: any[], contextStrategy: string): string {
    const agentInstructions = {
      code_specialist: 'Focus on technical implementation, code patterns, and architectural concerns',
      jira_analyst: 'Emphasize issues, bugs, features, and historical problem resolution',
      aoma_researcher: 'Prioritize business context, requirements, and documentation',
      synthesis_coordinator: 'Consider all aspects for comprehensive analysis and coordination'
    };

    const contextData = contextStrategy === 'shared' 
      ? JSON.stringify({ codeData: data.codeData.slice(0, 2), jiraData: data.jiraData.slice(0, 2), aomaData: data.aomaData.slice(0, 2) })
      : 'Limited context due to isolation strategy';

    return `
You are a ${agent} in a multi-agent swarm analysis system.

Your role: ${agentInstructions[agent as keyof typeof agentInstructions]}

Query: ${query}

Previous agent analyses: ${previousSteps.map(s => `${s.agent}: ${s.analysis.slice(0, 200)}...`).join('\n')}

Cross-vector data available: ${contextData}

Provide your specialized analysis focusing on your domain expertise.
`;
  }

  private getAgentFocus(agent: string): string {
    const focuses = {
      code_specialist: 'Technical Analysis & Architecture',
      jira_analyst: 'Issue Tracking & Historical Context',
      aoma_researcher: 'Business Requirements & Documentation',
      synthesis_coordinator: 'Multi-Vector Synthesis & Coordination'
    };
    return focuses[agent as keyof typeof focuses] || 'General Analysis';
  }

  private determineNextAgent(currentAgent: string, result: any, query: string): string | null {
    // Simplified handoff logic - in production this would be more sophisticated
    const handoffRules = {
      synthesis_coordinator: 'code_specialist',
      code_specialist: 'jira_analyst',
      jira_analyst: 'aoma_researcher',
      aoma_researcher: null
    };

    return handoffRules[currentAgent as keyof typeof handoffRules] || null;
  }

  private async synthesizeResults(query: string, steps: any[], contextStrategy: string): Promise<string> {
    try {
      const synthesisPrompt = `
Based on the multi-agent swarm analysis below, provide a comprehensive synthesis:

Query: ${query}
Context Strategy: ${contextStrategy}

Agent Analyses:
${steps.map(s => `${s.agent} (${s.focus}): ${s.analysis}`).join('\n\n')}

Provide a unified, actionable synthesis that combines insights from all agents.
`;

      return await this.openaiService.queryKnowledge(synthesisPrompt, 'comprehensive');
    } catch (error) {
      return 'Synthesis unavailable due to service error';
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const [openaiHealth, supabaseHealth] = await Promise.all([
        this.openaiService.healthCheck(),
        this.supabaseService.healthCheck()
      ]);

      if (!openaiHealth.healthy) {
        return { healthy: false, error: `OpenAI service unhealthy: ${openaiHealth.error}` };
      }

      if (!supabaseHealth.healthy) {
        return { healthy: false, error: `Supabase service unhealthy: ${supabaseHealth.error}` };
      }

      return { healthy: true };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown health check error' 
      };
    }
  }
}
