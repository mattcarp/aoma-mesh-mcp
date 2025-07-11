/**
 * Outlook Email Search Tool
 * 
 * Searches corporate Outlook emails using semantic vector search
 * for zeitgeist analysis with comprehensive filtering.
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { BaseTool, ToolExecutionContext } from '../base/tool.interface';
import { SupabaseService } from '../../services/supabase.service';
import { OutlookEmailSearchRequest } from '../../types/requests';

export class OutlookSearchTool extends BaseTool {
  readonly definition: Tool = {
    name: 'search_outlook_emails',
    description: 'Search corporate Outlook emails using semantic vector search for zeitgeist analysis',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query for corporate emails',
          minLength: 1,
          maxLength: 500,
        },
        dateFrom: {
          type: 'string',
          description: 'Filter emails from this date (ISO 8601 format)',
        },
        dateTo: {
          type: 'string',
          description: 'Filter emails to this date (ISO 8601 format)',
        },
        fromEmail: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by sender email addresses',
        },
        toEmail: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by recipient email addresses',
        },
        subject: {
          type: 'string',
          description: 'Filter by subject line keywords',
        },
        hasAttachments: {
          type: 'boolean',
          description: 'Filter emails with/without attachments',
        },
        priority: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by email priority (High, Normal, Low)',
        },
        maxResults: {
          type: 'number',
          description: 'Maximum emails to return',
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
    const request = args as OutlookEmailSearchRequest;
    const { 
      query, 
      dateFrom, 
      dateTo, 
      fromEmail, 
      toEmail, 
      subject, 
      hasAttachments, 
      priority, 
      maxResults = 15, 
      threshold = 0.6 
    } = request;

    context.logger.info('Executing Outlook email search', {
      query: query.slice(0, 100),
      dateFrom,
      dateTo,
      fromEmail,
      toEmail,
      subject,
      hasAttachments,
      priority,
      maxResults,
      threshold
    });

    try {
      const emails = await this.supabaseService.searchOutlookEmails(query, {
        dateFrom,
        dateTo,
        fromEmail,
        toEmail,
        subject,
        hasAttachments,
        priority,
        maxResults,
        threshold
      });

      // Format results for better readability
      const formattedResults = emails.map(email => ({
        messageId: email.message_id,
        subject: email.subject,
        from: email.from_email,
        to: email.to_emails || [],
        cc: email.cc_emails || [],
        date: email.date_sent,
        priority: email.priority || 'Normal',
        similarity: Number(email.similarity?.toFixed(3)) || 0,
        hasAttachments: email.has_attachments || false,
        attachmentCount: email.attachment_count || 0,
        bodyPreview: email.body_preview ? 
          (email.body_preview.length > 200 ? email.body_preview.slice(0, 200) + '...' : email.body_preview) : 
          null,
        conversationId: email.conversation_id,
        isRead: email.is_read,
        folder: email.folder || 'Inbox'
      }));

      const result = {
        query,
        filters: {
          dateFrom: dateFrom || 'No start date',
          dateTo: dateTo || 'No end date',
          fromEmail: fromEmail || ['All senders'],
          toEmail: toEmail || ['All recipients'],
          subject: subject || 'All subjects',
          hasAttachments: hasAttachments !== undefined ? hasAttachments : 'Any',
          priority: priority || ['All priorities'],
          threshold
        },
        results: formattedResults,
        metadata: {
          totalResults: formattedResults.length,
          maxResults,
          avgSimilarity: formattedResults.length > 0 
            ? (formattedResults.reduce((sum, e) => sum + e.similarity, 0) / formattedResults.length).toFixed(3)
            : 0,
          senders: [...new Set(formattedResults.map(e => e.from))],
          priorities: [...new Set(formattedResults.map(e => e.priority))],
          withAttachments: formattedResults.filter(e => e.hasAttachments).length,
          dateRange: {
            earliest: formattedResults.length > 0 ? Math.min(...formattedResults.map(e => new Date(e.date).getTime())) : null,
            latest: formattedResults.length > 0 ? Math.max(...formattedResults.map(e => new Date(e.date).getTime())) : null
          },
          searchTimestamp: new Date().toISOString()
        }
      };

      context.logger.info('Outlook search completed successfully', {
        resultCount: formattedResults.length,
        avgSimilarity: result.metadata.avgSimilarity,
        sendersFound: result.metadata.senders.length,
        withAttachments: result.metadata.withAttachments
      });

      return this.success(result);
    } catch (error) {
      context.logger.error('Outlook search failed', { error });
      return this.error('Failed to search Outlook emails', { error: error instanceof Error ? error.message : error });
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
