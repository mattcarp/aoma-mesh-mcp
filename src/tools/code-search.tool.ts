/**
 * Code Search Tool
 * 
 * Searches code files using semantic vector search
 * across all repositories with language and extension filtering.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { SupabaseService } from '../../services/supabase.service';
import { CodeSearchRequest } from '../../types/requests';

export class CodeSearchTool extends BaseTool {
  readonly definition: Tool = {
    name: 'search_code_files',
    description: 'Search code files using semantic vector search across all repositories',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query for code files',
          minLength: 1,
          maxLength: 500,
        },
        repository: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by specific repositories (e.g., ["mc-tk", "aoma-ui"])',
        },
        language: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by programming language (e.g., ["TypeScript", "JavaScript"])',
        },
        fileExtension: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by file extension (e.g., ["ts", "js", "py"])',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum files to return',
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
    const request = args as CodeSearchRequest;
    const { 
      query, 
      repository, 
      language, 
      fileExtension, 
      maxResults = 15, 
      threshold = 0.6 
    } = request;

    context.logger.info('Executing code file search', {
      query: query.slice(0, 100),
      repository,
      language,
      fileExtension,
      maxResults,
      threshold
    });

    try {
      const codeFiles = await this.supabaseService.searchCodeFiles(query, {
        repository,
        language,
        fileExtension,
        maxResults,
        threshold
      });

      // Format results for better readability
      const formattedResults = codeFiles.map(file => ({
        filePath: file.file_path,
        repository: file.repository,
        language: file.language,
        extension: file.file_extension,
        similarity: Number(file.similarity?.toFixed(3)) || 0,
        lineCount: file.line_count || 0,
        size: file.file_size || 0,
        lastModified: file.last_modified,
        excerpt: file.content_excerpt ? 
          (file.content_excerpt.length > 300 ? file.content_excerpt.slice(0, 300) + '...' : file.content_excerpt) : 
          null,
        url: file.url
      }));

      const result = {
        query,
        filters: {
          repository: repository || ['All Repositories'],
          language: language || ['All Languages'],
          fileExtension: fileExtension || ['All Extensions'],
          threshold
        },
        results: formattedResults,
        metadata: {
          totalResults: formattedResults.length,
          maxResults,
          avgSimilarity: formattedResults.length > 0 
            ? (formattedResults.reduce((sum, f) => sum + f.similarity, 0) / formattedResults.length).toFixed(3)
            : 0,
          languages: [...new Set(formattedResults.map(f => f.language).filter(Boolean))],
          repositories: [...new Set(formattedResults.map(f => f.repository))],
          extensions: [...new Set(formattedResults.map(f => f.extension))],
          totalLines: formattedResults.reduce((sum, f) => sum + f.lineCount, 0),
          searchTimestamp: new Date().toISOString()
        }
      };

      context.logger.info('Code search completed successfully', {
        resultCount: formattedResults.length,
        avgSimilarity: result.metadata.avgSimilarity,
        languagesFound: result.metadata.languages.length,
        repositoriesFound: result.metadata.repositories.length
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Code search failed', { error });
      return this.error('Failed to search code files', { error: error instanceof Error ? error.message : error });
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
