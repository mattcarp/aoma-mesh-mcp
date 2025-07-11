/**
 * Supabase Service
 * 
 * Manages Supabase database operations including vector searches,
 * queries, and health monitoring.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Environment } from '../config/environment.js';
import { VectorSearchResult } from '../types/common.js';
import { createLogger } from '../utils/logger.js';
import { withRetry, withTimeout } from '../utils/errors.js';

const logger = createLogger('SupabaseService');

export class SupabaseService {
  private readonly client: SupabaseClient;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: Environment) {
    this.client = createClient(
      config.NEXT_PUBLIC_SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { 'x-client-info': 'aoma-mesh-mcp/2.0.0' } },
      }
    );
    
    this.timeout = config.TIMEOUT_MS;
    this.maxRetries = config.MAX_RETRIES;
    
    logger.info('Supabase service initialized', {
      url: config.NEXT_PUBLIC_SUPABASE_URL,
      timeout: this.timeout,
      maxRetries: this.maxRetries
    });
  }

  /**
   * Perform vector search on AOMA knowledge base
   */
  async searchKnowledge(
    query: string,
    maxResults: number = 10,
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Searching AOMA knowledge', { query, maxResults, threshold });

        const { data, error } = await this.client.rpc('search_aoma_knowledge', {
          query_text: query,
          similarity_threshold: threshold,
          match_count: maxResults
        });

        if (error) {
          throw new Error(`Knowledge search failed: ${error.message}`);
        }

        const results = (data || []).map((item: any) => ({
          id: item.id,
          title: item.title || 'Untitled',
          content: item.content || '',
          similarity: item.similarity || 0,
          url: item.url,
          crawled_at: item.crawled_at,
          metadata: item.metadata || {}
        }));

        logger.info('Knowledge search completed', {
          query: query.slice(0, 50),
          resultCount: results.length
        });

        return results;
      }, this.maxRetries, 1000, 'Knowledge search'),
      this.timeout,
      'Knowledge search timeout'
    );
  }

  /**
   * Search Jira tickets using vector search
   */
  async searchJiraTickets(
    query: string,
    filters: {
      projectKey?: string;
      status?: string[];
      priority?: string[];
      maxResults?: number;
      threshold?: number;
    } = {}
  ): Promise<any[]> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Searching Jira tickets', { query, filters });

        const { data, error } = await this.client.rpc('search_jira_tickets', {
          query_text: query,
          project_key: filters.projectKey,
          status_filter: filters.status,
          priority_filter: filters.priority,
          similarity_threshold: filters.threshold || 0.6,
          match_count: filters.maxResults || 15
        });

        if (error) {
          throw new Error(`Jira search failed: ${error.message}`);
        }

        logger.info('Jira search completed', {
          query: query.slice(0, 50),
          resultCount: data?.length || 0
        });

        return data || [];
      }, this.maxRetries, 1000, 'Jira search'),
      this.timeout,
      'Jira search timeout'
    );
  }

  /**
   * Get Jira ticket count with filters
   */
  async getJiraTicketCount(filters: {
    projectKey?: string;
    status?: string[];
    priority?: string[];
  } = {}): Promise<number> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Getting Jira ticket count', { filters });

        const { data, error } = await this.client.rpc('get_jira_ticket_count', {
          project_key: filters.projectKey,
          status_filter: filters.status,
          priority_filter: filters.priority
        });

        if (error) {
          throw new Error(`Jira count failed: ${error.message}`);
        }

        const count = data || 0;
        logger.info('Jira count completed', { count, filters });

        return count;
      }, this.maxRetries, 1000, 'Jira count'),
      this.timeout,
      'Jira count timeout'
    );
  }

  /**
   * Search Git commits using vector search
   */
  async searchGitCommits(
    query: string,
    filters: {
      repository?: string[];
      author?: string[];
      dateFrom?: string;
      dateTo?: string;
      filePattern?: string;
      maxResults?: number;
      threshold?: number;
    } = {}
  ): Promise<any[]> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Searching Git commits', { query, filters });

        const { data, error } = await this.client.rpc('search_git_commits', {
          query_text: query,
          repository_filter: filters.repository,
          author_filter: filters.author,
          date_from: filters.dateFrom,
          date_to: filters.dateTo,
          file_pattern: filters.filePattern,
          similarity_threshold: filters.threshold || 0.6,
          match_count: filters.maxResults || 15
        });

        if (error) {
          throw new Error(`Git search failed: ${error.message}`);
        }

        logger.info('Git search completed', {
          query: query.slice(0, 50),
          resultCount: data?.length || 0
        });

        return data || [];
      }, this.maxRetries, 1000, 'Git search'),
      this.timeout,
      'Git search timeout'
    );
  }

  /**
   * Search code files using vector search
   */
  async searchCodeFiles(
    query: string,
    filters: {
      repository?: string[];
      language?: string[];
      fileExtension?: string[];
      maxResults?: number;
      threshold?: number;
    } = {}
  ): Promise<any[]> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Searching code files', { query, filters });

        const { data, error } = await this.client.rpc('search_code_files', {
          query_text: query,
          repository_filter: filters.repository,
          language_filter: filters.language,
          extension_filter: filters.fileExtension,
          similarity_threshold: filters.threshold || 0.6,
          match_count: filters.maxResults || 15
        });

        if (error) {
          throw new Error(`Code search failed: ${error.message}`);
        }

        logger.info('Code search completed', {
          query: query.slice(0, 50),
          resultCount: data?.length || 0
        });

        return data || [];
      }, this.maxRetries, 1000, 'Code search'),
      this.timeout,
      'Code search timeout'
    );
  }

  /**
   * Search Outlook emails using vector search
   */
  async searchOutlookEmails(
    query: string,
    filters: {
      dateFrom?: string;
      dateTo?: string;
      fromEmail?: string[];
      toEmail?: string[];
      subject?: string;
      hasAttachments?: boolean;
      priority?: string[];
      maxResults?: number;
      threshold?: number;
    } = {}
  ): Promise<any[]> {
    return withTimeout(
      () => withRetry(async () => {
        logger.debug('Searching Outlook emails', { query, filters });

        const { data, error } = await this.client.rpc('search_outlook_emails', {
          query_text: query,
          date_from: filters.dateFrom,
          date_to: filters.dateTo,
          from_email_filter: filters.fromEmail,
          to_email_filter: filters.toEmail,
          subject_filter: filters.subject,
          has_attachments: filters.hasAttachments,
          priority_filter: filters.priority,
          similarity_threshold: filters.threshold || 0.6,
          match_count: filters.maxResults || 15
        });

        if (error) {
          throw new Error(`Email search failed: ${error.message}`);
        }

        logger.info('Email search completed', {
          query: query.slice(0, 50),
          resultCount: data?.length || 0
        });

        return data || [];
      }, this.maxRetries, 1000, 'Email search'),
      this.timeout,
      'Email search timeout'
    );
  }

  /**
   * Check Supabase service health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const { error } = await withTimeout(
        () => this.client.from('aoma_knowledge').select('count').limit(1),
        5000,
        'Supabase health check'
      );

      if (error) {
        throw new Error(error.message);
      }
      
      const latency = Date.now() - startTime;
      logger.debug('Supabase health check passed', { latency });
      
      return { healthy: true, latency };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('Supabase health check failed', { error: errorMessage });
      
      return { 
        healthy: false, 
        error: errorMessage,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Execute custom RPC function
   */
  async executeRpc(functionName: string, params: Record<string, any> = {}): Promise<any> {
    return withTimeout(
      () => withRetry(async () => {
        const { data, error } = await this.client.rpc(functionName, params);

        if (error) {
          throw new Error(`RPC ${functionName} failed: ${error.message}`);
        }

        return data;
      }, this.maxRetries, 1000, `RPC ${functionName}`),
      this.timeout,
      `RPC ${functionName} timeout`
    );
  }
}
