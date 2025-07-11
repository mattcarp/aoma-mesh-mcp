/**
 * Git Search Tool
 * 
 * Searches Git commit history using semantic vector search
 * across all repositories with advanced filtering.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { SupabaseService } from '../../services/supabase.service';
import { GitSearchRequest } from '../../types/requests';

export class GitSearchTool extends BaseTool {
  readonly definition: Tool = {
    name: 'search_git_commits',
    description: 'Search Git commit history using semantic vector search across all repositories',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query for Git commits',
          minLength: 1,
          maxLength: 500,
        },
        repository: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by specific repositories (e.g., ["mc-tk", "aoma-ui"])',
        },
        author: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by commit author names',
        },
        dateFrom: {
          type: 'string',
          description: 'Filter commits from this date (ISO 8601 format)',
        },
        dateTo: {
          type: 'string',
          description: 'Filter commits to this date (ISO 8601 format)',
        },
        filePattern: {
          type: 'string',
          description: 'Filter by file path pattern (e.g., "*.ts", "auth", "api/")',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum commits to return',
          minimum: 1,
          maximum: 50,
          default: 15,
        },
        threshold: {
          type: 'number',
          description: 'Semantic similarity threshold (0-1)',
          minimum: 0,
          maximum: 1,
          default: 0.6,
        },
      },
      required: ['query'],
      additionalProperties: false,
    },
  };

  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as GitSearchRequest;
    const { 
      query, 
      repository, 
      author, 
      dateFrom, 
      dateTo, 
      filePattern, 
      maxResults = 15, 
      threshold = 0.6 
    } = request;

    context.logger.info('Executing Git commit search', {
      query: query.slice(0, 100),
      repository,
      author,
      dateFrom,
      dateTo,
      filePattern,
      maxResults,
      threshold
    });

    try {
      const commits = await this.supabaseService.searchGitCommits(query, {
        repository,
        author,
        dateFrom,
        dateTo,
        filePattern,
        maxResults,
        threshold
      });

      // Format results for better readability
      const formattedResults = commits.map(commit => ({
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        date: commit.date,
        repository: commit.repository,
        branch: commit.branch,
        similarity: Number(commit.similarity?.toFixed(3)) || 0,
        filesChanged: commit.files_changed || [],
        additions: commit.additions || 0,
        deletions: commit.deletions || 0,
        url: commit.url
      }));

      const result = {
        query,
        filters: {
          repository: repository || ['All Repositories'],
          author: author || ['All Authors'],
          dateFrom: dateFrom || 'No start date',
          dateTo: dateTo || 'No end date',
          filePattern: filePattern || 'All files',
          threshold
        },
        results: formattedResults,
        metadata: {
          totalResults: formattedResults.length,
          maxResults,
          avgSimilarity: formattedResults.length > 0 
            ? (formattedResults.reduce((sum, c) => sum + c.similarity, 0) / formattedResults.length).toFixed(3)
            : 0,
          repositories: [...new Set(formattedResults.map(c => c.repository))],
          searchTimestamp: new Date().toISOString()
        }
      };

      context.logger.info('Git search completed successfully', {
        resultCount: formattedResults.length,
        avgSimilarity: result.metadata.avgSimilarity,
        repositoriesFound: result.metadata.repositories.length
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Git search failed', { error });
      return this.error('Failed to search Git commits', { error: error instanceof Error ? error.message : error });
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const health = await this.supabaseService.healthCheck();
      return {
        healthy: health.healthy,
        error: health.error
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown health check error'
      };
    }
  }
}
