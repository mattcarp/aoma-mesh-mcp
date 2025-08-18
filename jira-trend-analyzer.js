/**
 * Jira Trend Analyzer - Proactive Issue Detection
 * Identifies patterns and suggests preventive actions
 */

class JiraTrendAnalyzer {
  constructor() {
    this.patterns = {
      recurring: new Map(),
      escalation: [],
      hotspots: new Map(),
      velocity: { daily: 0, weekly: 0 }
    };
  }

  analyzeTicketTrends(tickets) {
    const analysis = {
      timestamp: new Date().toISOString(),
      totalTickets: tickets.length,
      patterns: {},
      recommendations: {
        management: [],
        development: []
      }
    };

    // Categorize by type
    const categories = this.categorizeTickets(tickets);
    
    // Identify patterns
    analysis.patterns = {
      topIssueTypes: this.getTopIssues(categories),
      recurringProblems: this.findRecurringProblems(tickets),
      velocityTrend: this.calculateVelocity(tickets),
      riskAreas: this.identifyRiskAreas(tickets)
    };

    // Generate recommendations
    analysis.recommendations = this.generateRecommendations(analysis.patterns);
    
    return analysis;
  }
  categorizeTickets(tickets) {
    const categories = {
      bug: [],
      feature: [],
      performance: [],
      security: [],
      integration: []
    };

    tickets.forEach(ticket => {
      const type = this.detectTicketType(ticket);
      if (categories[type]) {
        categories[type].push(ticket);
      }
    });

    return categories;
  }

  detectTicketType(ticket) {
    const title = (ticket.title || '').toLowerCase();
    const description = (ticket.description || '').toLowerCase();
    const combined = title + ' ' + description;

    if (combined.includes('error') || combined.includes('bug') || combined.includes('fix')) {
      return 'bug';
    }
    if (combined.includes('slow') || combined.includes('performance') || combined.includes('timeout')) {
      return 'performance';
    }
    if (combined.includes('security') || combined.includes('vulnerability') || combined.includes('auth')) {
      return 'security';
    }
    if (combined.includes('integration') || combined.includes('api') || combined.includes('connection')) {
      return 'integration';
    }
    return 'feature';
  }
  findRecurringProblems(tickets) {
    const problemPatterns = new Map();
    
    tickets.forEach(ticket => {
      // Extract key phrases
      const keywords = this.extractKeywords(ticket.title + ' ' + ticket.description);
      
      keywords.forEach(keyword => {
        if (!problemPatterns.has(keyword)) {
          problemPatterns.set(keyword, { count: 0, tickets: [] });
        }
        const pattern = problemPatterns.get(keyword);
        pattern.count++;
        pattern.tickets.push(ticket.id);
      });
    });

    // Filter to only recurring issues (3+ occurrences)
    return Array.from(problemPatterns.entries())
      .filter(([_, data]) => data.count >= 3)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
  }

  extractKeywords(text) {
    // Simple keyword extraction - in production, use NLP
    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an']);
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
  }
  generateRecommendations(patterns) {
    const recommendations = {
      management: [],
      development: []
    };

    // Management recommendations based on patterns
    if (patterns.recurringProblems.length > 5) {
      recommendations.management.push({
        priority: 'HIGH',
        action: 'Conduct Root Cause Analysis',
        reason: `${patterns.recurringProblems.length} recurring issues detected`,
        specifics: patterns.recurringProblems.slice(0, 3).map(p => p[0])
      });
    }

    if (patterns.velocityTrend && patterns.velocityTrend.increasing) {
      recommendations.management.push({
        priority: 'MEDIUM',
        action: 'Scale Support Resources',
        reason: 'Ticket velocity increasing by ' + patterns.velocityTrend.rate + '% weekly'
      });
    }

    // Development recommendations
    patterns.topIssueTypes.forEach(issueType => {
      if (issueType.type === 'performance' && issueType.count > 10) {
        recommendations.development.push({
          priority: 'HIGH',
          action: 'Implement Performance Monitoring',
          code: `
// Add APM instrumentation
import { trace } from '@opentelemetry/api';
const tracer = trace.getTracer('aoma-performance');

async function tracedOperation(name, fn) {
  const span = tracer.startSpan(name);
  try {
    const result = await fn();
    span.setStatus({ code: 1 });
    return result;
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: 2, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}`
        });
      }

      if (issueType.type === 'integration' && issueType.count > 5) {
        recommendations.development.push({
          priority: 'HIGH',
          action: 'Implement Circuit Breaker Pattern',
          reason: 'Multiple integration failures detected',
          code: `
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}`
        });
      }
    });

    return recommendations;
  }

  getTopIssues(categories) {
    return Object.entries(categories)
      .map(([type, tickets]) => ({ type, count: tickets.length }))
      .sort((a, b) => b.count - a.count);
  }

  calculateVelocity(tickets) {
    // Calculate ticket creation velocity
    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 604800000;

    const dailyTickets = tickets.filter(t => new Date(t.created) > dayAgo).length;
    const weeklyTickets = tickets.filter(t => new Date(t.created) > weekAgo).length;

    return {
      daily: dailyTickets,
      weekly: weeklyTickets,
      increasing: weeklyTickets > tickets.length * 0.3
    };
  }

  identifyRiskAreas(tickets) {
    const riskAreas = [];
    
    // Check for security issues
    const securityTickets = tickets.filter(t => 
      t.priority === 'Critical' && 
      (t.title.toLowerCase().includes('security') || t.title.toLowerCase().includes('vulnerability'))
    );
    
    if (securityTickets.length > 0) {
      riskAreas.push({
        area: 'Security',
        level: 'CRITICAL',
        tickets: securityTickets.map(t => t.id)
      });
    }

    return riskAreas;
  }
}

module.exports = JiraTrendAnalyzer;