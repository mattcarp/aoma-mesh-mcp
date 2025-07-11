/**
 * Development Context Analysis Tool
 * 
 * Analyzes current development context and provides intelligent
 * recommendations based on code, system area, and urgency.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { OpenAIService } from '../../services/openai.service';
import { SupabaseService } from '../../services/supabase.service';
import { DevelopmentContextRequest } from '../../types/requests';

export class DevelopmentContextTool extends BaseTool {
  readonly definition: Tool = {
    name: 'analyze_development_context',
    description: 'Analyze current development context and provide intelligent recommendations',
    inputSchema: {
      type: 'object',
      properties: {
        currentTask: {
          type: 'string',
          description: 'Description of current development task or issue',
          minLength: 1,
          maxLength: 1000,
        },
        codeContext: {
          type: 'string',
          description: 'Relevant code, error messages, or technical details',
          maxLength: 5000,
        },
        systemArea: {
          type: 'string',
          enum: ['frontend', 'backend', 'database', 'infrastructure', 'integration', 'testing'],
          description: 'Primary system area being worked on',
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'critical'],
          description: 'Urgency level of the current task',
          default: 'medium',
        },
      },
      required: ['currentTask'],
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
    const request = args as DevelopmentContextRequest;
    const { currentTask, codeContext, systemArea, urgency = 'medium' } = request;

    context.logger.info('Analyzing development context', {
      task: currentTask.slice(0, 100),
      systemArea,
      urgency,
      hasCodeContext: !!codeContext
    });

    try {
      // Search for relevant knowledge and past issues
      const [knowledgeResults, jiraResults, codeResults] = await Promise.all([
        this.searchRelevantKnowledge(currentTask, systemArea),
        this.searchRelatedIssues(currentTask, systemArea),
        codeContext ? this.searchSimilarCode(codeContext, systemArea) : []
      ]);

      // Generate AI-powered analysis and recommendations
      const analysis = await this.generateContextAnalysis(
        currentTask,
        codeContext,
        systemArea,
        urgency,
        knowledgeResults,
        jiraResults,
        codeResults
      );

      const result = {
        task: {
          description: currentTask,
          systemArea: systemArea || 'General',
          urgency,
          timestamp: new Date().toISOString()
        },
        analysis,
        relatedResources: {
          knowledgeBase: knowledgeResults.slice(0, 3).map(k => ({
            title: k.title,
            relevance: k.similarity,
            url: k.url
          })),
          pastIssues: jiraResults.slice(0, 3).map(j => ({
            key: j.key,
            summary: j.summary,
            status: j.status,
            relevance: j.similarity
          })),
          similarCode: codeResults.slice(0, 3).map(c => ({
            path: c.file_path,
            repository: c.repository,
            relevance: c.similarity
          }))
        },
        recommendations: this.generateRecommendations(systemArea, urgency),
        nextSteps: this.generateNextSteps(currentTask, systemArea, urgency)
      };

      context.logger.info('Development context analysis completed', {
        knowledgeResults: knowledgeResults.length,
        jiraResults: jiraResults.length,
        codeResults: codeResults.length
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Development context analysis failed', { error });
      return this.error('Failed to analyze development context', { error: error instanceof Error ? error.message : error });
    }
  }

  private async searchRelevantKnowledge(task: string, systemArea?: string): Promise<any[]> {
    try {
      const query = systemArea ? `${task} ${systemArea}` : task;
      return await this.supabaseService.searchKnowledge(query, 5, 0.6);
    } catch (error) {
      return [];
    }
  }

  private async searchRelatedIssues(task: string, systemArea?: string): Promise<any[]> {
    try {
      const query = systemArea ? `${task} ${systemArea}` : task;
      return await this.supabaseService.searchJiraTickets(query, { maxResults: 5, threshold: 0.6 });
    } catch (error) {
      return [];
    }
  }

  private async searchSimilarCode(codeContext: string, systemArea?: string): Promise<any[]> {
    try {
      const filters: any = { maxResults: 5, threshold: 0.6 };
      if (systemArea === 'frontend') {
        filters.language = ['TypeScript', 'JavaScript', 'React'];
      } else if (systemArea === 'backend') {
        filters.language = ['TypeScript', 'JavaScript', 'Python'];
      }
      return await this.supabaseService.searchCodeFiles(codeContext, filters);
    } catch (error) {
      return [];
    }
  }

  private async generateContextAnalysis(
    task: string,
    codeContext?: string,
    systemArea?: string,
    urgency?: string,
    knowledge?: any[],
    issues?: any[],
    code?: any[]
  ): Promise<string> {
    try {
      const contextQuery = `
Development Task Analysis:
Task: ${task}
System Area: ${systemArea || 'Not specified'}
Urgency: ${urgency || 'medium'}
${codeContext ? `Code Context: ${codeContext.slice(0, 1000)}` : ''}

Related Knowledge: ${knowledge?.length || 0} items found
Related Issues: ${issues?.length || 0} items found
Similar Code: ${code?.length || 0} items found

Please provide a comprehensive analysis of this development task, including:
1. Problem assessment and complexity analysis
2. Potential risks and blockers
3. Technical approach recommendations
4. Resource requirements and timeline estimates
`;

      return await this.openaiService.queryKnowledge(contextQuery, 'focused');
    } catch (error) {
      return 'Analysis unavailable due to service error';
    }
  }

  private generateRecommendations(systemArea?: string, urgency?: string): string[] {
    const baseRecommendations = [
      'Review related documentation and past issues',
      'Consider breaking down complex tasks into smaller steps',
      'Ensure proper error handling and logging',
      'Write tests for critical functionality'
    ];

    const areaSpecificRecommendations: Record<string, string[]> = {
      frontend: ['Check browser compatibility', 'Optimize for performance', 'Ensure responsive design'],
      backend: ['Validate input data', 'Implement proper authentication', 'Consider scalability'],
      database: ['Review query performance', 'Check data integrity', 'Plan for migrations'],
      infrastructure: ['Monitor resource usage', 'Plan for rollback scenarios', 'Update documentation'],
      integration: ['Test API contracts', 'Handle network failures gracefully', 'Implement retries'],
      testing: ['Cover edge cases', 'Include integration tests', 'Automate test execution']
    };

    const urgencyRecommendations: Record<string, string[]> = {
      critical: ['Focus on immediate fixes', 'Have rollback plan ready', 'Get code review quickly'],
      high: ['Prioritize core functionality', 'Test thoroughly', 'Communicate progress'],
      medium: ['Follow standard process', 'Consider long-term maintainability'],
      low: ['Opportunity for refactoring', 'Document learnings', 'Consider automation']
    };

    return [
      ...baseRecommendations,
      ...(systemArea ? areaSpecificRecommendations[systemArea] || [] : []),
      ...(urgency ? urgencyRecommendations[urgency] || [] : [])
    ];
  }

  private generateNextSteps(task: string, systemArea?: string, urgency?: string): string[] {
    const baseSteps = [
      'Gather all relevant information and requirements',
      'Create or update task tracking (Jira ticket)',
      'Set up development environment and branch'
    ];

    if (urgency === 'critical' || urgency === 'high') {
      return [
        'Assess immediate impact and create hotfix plan',
        'Notify stakeholders of timeline and approach',
        'Implement minimal viable fix first',
        'Plan comprehensive solution for later'
      ];
    }

    return [
      ...baseSteps,
      'Design solution and get architectural review',
      'Implement solution with proper testing',
      'Submit for code review and deployment'
    ];
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
