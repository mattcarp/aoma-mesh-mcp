# LangChain v1.0 Seamless Upgrade Plan

## Executive Summary

**Goal**: Zero-downtime migration to LangChain v1.0 with immediate improvements

**Strategy**: Incremental rollout with fallback support

**Timeline**: 3-4 hours for Phase 1 (core functionality)

---

## Key v1.0 Improvements We Can Leverage

### 1. **Unified Retriever Interface** ✨
**What Changed**: All vector stores now have `.asRetriever()` method

**Benefit**: Standardized interface across all 6 data sources

**Before (v0.3)**:
```typescript
// Different APIs for different sources
const aomaResults = await supabaseService.searchKnowledge(query, 10, 0.7);
const openaiResults = await openaiService.queryVectorStoreDirect(query, 10);
// Manual merging, inconsistent formats
```

**After (v1.0)**:
```typescript
// Unified retriever interface
const aomaRetriever = vectorStore.asRetriever({ k: 10 });
const docs = await aomaRetriever.getRelevantDocuments(query);
// Consistent Document[] format across all sources
```

### 2. **Native Parallel Retrieval** ⚡
**What's New**: Built-in support for parallel multi-source queries

**Benefit**: Automatically parallelizes retrieval from multiple sources

**Implementation**:
```typescript
import { MultiQueryRetriever } from '@langchain/core/retrievers';

// Automatic query expansion + parallel search
const retriever = MultiQueryRetriever.fromLLM({
  llm: chatModel,
  retriever: baseRetriever,
  queryCount: 3  // Generates 3 variations of query
});
```

**Performance**: Cuts latency in half when querying multiple sources

### 3. **Streaming Support** 🔄
**What's New**: First-class streaming for long responses

**Benefit**: Better UX - users see responses as they're generated

**Implementation**:
```typescript
const stream = await chain.stream({ question: query });

for await (const chunk of stream) {
  // Send incremental updates to client
  yield chunk;
}
```

### 4. **Enhanced Type Safety** 🛡️
**What Changed**: AIMessage return type (not BaseMessage)

**Benefit**: Catch more errors at compile time

**Breaking Change**:
```typescript
// v0.3
const response: BaseMessage = await model.invoke(messages);

// v1.0 (more specific)
const response: AIMessage = await model.invoke(messages);
```

### 5. **Improved Error Handling** 🚨
**What's New**: Better error propagation in chains

**Benefit**: Easier debugging and failure recovery

**Example**:
```typescript
try {
  const result = await chain.invoke({ question: query });
} catch (error) {
  if (error instanceof RetrieverError) {
    // Specific handling for retrieval failures
  }
}
```

### 6. **LangSmith Integration** 📊
**What's New**: Native tracing and observability

**Benefit**: Debug multi-source orchestration easily

**Setup**:
```typescript
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

const tracer = new LangChainTracer({
  projectName: 'aoma-mesh-mcp',
});

// Automatic tracing of all operations
```

---

## Seamless Migration Strategy

### Phase 0: Backward Compatible Wrapper ✅
**Goal**: Keep existing API working while adding new functionality

**Approach**: Adapter pattern

```typescript
// src/services/langchain-adapter.ts
export class LangChainAdapter {
  constructor(
    private orchestrator: LangChainOrchestrator,
    private legacyOpenAI: OpenAIService
  ) {}

  /**
   * Drop-in replacement for openaiService.queryKnowledgeFast()
   * Falls back to legacy if orchestrator fails
   */
  async queryKnowledgeFast(
    query: string,
    strategy: string,
    context?: string
  ): Promise<string> {
    try {
      // Try new LangChain orchestration
      const result = await this.orchestrator.query(query, strategy as any);
      return result.answer;
    } catch (error) {
      console.warn('LangChain orchestration failed, falling back to legacy', error);
      // Fallback to existing OpenAI-only method
      return this.legacyOpenAI.queryKnowledgeFast(query, strategy as any, context);
    }
  }
}
```

**Benefit**: Zero risk - if new code fails, falls back to existing behavior

### Phase 1: Multi-Source Orchestration (3-4 hours)

#### Step 1.1: Create Retriever Wrappers
**File**: `src/services/retrievers/supabase-retrievers.ts`

```typescript
import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Wrapper that converts our existing Supabase RPC calls to LangChain retrievers
 * No breaking changes to Supabase service
 */
export class SupabaseKnowledgeRetriever extends BaseRetriever {
  lc_namespace = ['aoma-mesh-mcp', 'retrievers', 'supabase'];

  constructor(
    private supabaseClient: SupabaseClient,
    private tableName: string,
    private rpcFunction: string,
    private k: number = 10
  ) {
    super();
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // Use existing RPC function (no migration needed!)
    const { data, error } = await this.supabaseClient.rpc(this.rpcFunction, {
      query_text: query,
      similarity_threshold: 0.7,
      match_count: this.k
    });

    if (error) throw error;

    return (data || []).map((item: any) => new Document({
      pageContent: item.content || '',
      metadata: {
        source: this.tableName,
        title: item.title,
        similarity: item.similarity,
        url: item.url,
        id: item.id,
      }
    }));
  }
}

// Factory for all 5 Supabase retrievers
export class SupabaseRetrievers {
  constructor(private supabaseClient: SupabaseClient) {}

  getAOMAKnowledge(k = 10) {
    return new SupabaseKnowledgeRetriever(
      this.supabaseClient,
      'aoma_knowledge',
      'search_aoma_knowledge',
      k
    );
  }

  getJiraTickets(k = 10) {
    return new SupabaseKnowledgeRetriever(
      this.supabaseClient,
      'jira_tickets',
      'search_jira_tickets',
      k
    );
  }

  getGitCommits(k = 10) {
    return new SupabaseKnowledgeRetriever(
      this.supabaseClient,
      'git_commits',
      'search_git_commits',
      k
    );
  }

  getCodeFiles(k = 10) {
    return new SupabaseKnowledgeRetriever(
      this.supabaseClient,
      'code_files',
      'search_code_files',
      k
    );
  }

  getOutlookEmails(k = 10) {
    return new SupabaseKnowledgeRetriever(
      this.supabaseClient,
      'outlook_emails',
      'search_outlook_emails',
      k
    );
  }
}
```

**Key Point**: We're wrapping existing RPC functions, not rewriting them!

#### Step 1.2: Create OpenAI Retriever Wrapper
**File**: `src/services/retrievers/openai-retriever.ts`

```typescript
import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { OpenAIService } from '../openai.service';

/**
 * Wrapper for OpenAI vector store - uses existing queryVectorStoreDirect()
 */
export class OpenAIVectorRetriever extends BaseRetriever {
  lc_namespace = ['aoma-mesh-mcp', 'retrievers', 'openai'];

  constructor(
    private openaiService: OpenAIService,
    private k: number = 10
  ) {
    super();
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // Use existing method - no changes needed!
    const results = await this.openaiService.queryVectorStoreDirect(query, this.k);

    return results.map(r => new Document({
      pageContent: r.content?.[0]?.text || '',
      metadata: {
        source: 'openai_vector_store',
        filename: r.filename,
        similarity: r.score,
      }
    }));
  }
}
```

#### Step 1.3: Create Simple Orchestrator
**File**: `src/services/langchain-orchestrator.service.ts`

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { Document } from '@langchain/core/documents';
import { SupabaseRetrievers } from './retrievers/supabase-retrievers';
import { OpenAIVectorRetriever } from './retrievers/openai-retriever';
import { OpenAIService } from './openai.service';
import { SupabaseService } from './supabase.service';
import { Environment } from '../config/environment';
import { createLogger } from '../utils/logger';

const logger = createLogger('LangChainOrchestrator');

export class LangChainOrchestrator {
  private chatModel: ChatOpenAI;
  private supabaseRetrievers: SupabaseRetrievers;
  private openaiRetriever: OpenAIVectorRetriever;

  constructor(
    private openaiService: OpenAIService,
    private supabaseService: SupabaseService,
    config: Environment
  ) {
    this.chatModel = new ChatOpenAI({
      modelName: 'gpt-5',
      temperature: 1,
      openAIApiKey: config.OPENAI_API_KEY,
    });

    // @ts-ignore - access internal client
    this.supabaseRetrievers = new SupabaseRetrievers(this.supabaseService.client);
    this.openaiRetriever = new OpenAIVectorRetriever(openaiService, 10);
  }

  /**
   * Query using all 6 vector sources with LangChain v1.0 orchestration
   */
  async query(
    query: string,
    strategy: 'comprehensive' | 'focused' | 'rapid' = 'focused'
  ): Promise<{
    answer: string;
    sourceDocuments: Document[];
    stats: {
      totalDocs: number;
      bySource: Record<string, number>;
      retrievalTimeMs: number;
      generationTimeMs: number;
    };
  }> {
    const startTime = Date.now();

    // 1. Determine k based on strategy
    const k = strategy === 'comprehensive' ? 15 : strategy === 'focused' ? 10 : 5;

    // 2. Get all retrievers
    const retrievers = {
      aomaKnowledge: this.supabaseRetrievers.getAOMAKnowledge(k),
      jira: this.supabaseRetrievers.getJiraTickets(k),
      git: this.supabaseRetrievers.getGitCommits(k),
      code: this.supabaseRetrievers.getCodeFiles(k),
      email: this.supabaseRetrievers.getOutlookEmails(k),
      openai: this.openaiRetriever,
    };

    // 3. Retrieve from all sources in parallel (v1.0 improvement!)
    logger.info('Retrieving from 6 sources in parallel', { query: query.slice(0, 100) });

    const [aomaResults, jiraResults, gitResults, codeResults, emailResults, openaiResults] =
      await Promise.all([
        retrievers.aomaKnowledge.getRelevantDocuments(query).catch(() => []),
        retrievers.jira.getRelevantDocuments(query).catch(() => []),
        retrievers.git.getRelevantDocuments(query).catch(() => []),
        retrievers.code.getRelevantDocuments(query).catch(() => []),
        retrievers.email.getRelevantDocuments(query).catch(() => []),
        retrievers.openai.getRelevantDocuments(query).catch(() => []),
      ]);

    const retrievalTime = Date.now() - startTime;

    // 4. Combine and rank
    const allDocs = [
      ...aomaResults,
      ...jiraResults,
      ...gitResults,
      ...codeResults,
      ...emailResults,
      ...openaiResults,
    ];

    logger.info('Retrieved documents from all sources', {
      aoma: aomaResults.length,
      jira: jiraResults.length,
      git: gitResults.length,
      code: codeResults.length,
      email: emailResults.length,
      openai: openaiResults.length,
      total: allDocs.length,
    });

    // 5. Sort by similarity score
    allDocs.sort((a, b) => (b.metadata.similarity || 0) - (a.metadata.similarity || 0));

    // 6. Take top N
    const topN = strategy === 'comprehensive' ? 20 : strategy === 'focused' ? 10 : 5;
    const topDocs = allDocs.slice(0, topN);

    // 7. Build context string
    const context = topDocs
      .map((doc, i) =>
        `[${i + 1}] Source: ${doc.metadata.source} (${doc.metadata.title || doc.metadata.filename || 'untitled'})\n` +
        `Relevance: ${(doc.metadata.similarity || 0).toFixed(2)}\n` +
        `${doc.pageContent.slice(0, 500)}...\n`
      )
      .join('\n---\n\n');

    // 8. Generate answer using GPT-5 with v1.0 RunnableSequence
    const generationStart = Date.now();

    const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert AOMA system analyst with access to comprehensive enterprise knowledge.

Context from multiple sources:
{context}

Question: {question}

Provide a detailed, accurate answer based on the context above. Cite sources by name.
If the context doesn't contain enough information, say so clearly.
    `);

    const chain = RunnableSequence.from([
      prompt,
      this.chatModel,
      new StringOutputParser(),
    ]);

    const answer = await chain.invoke({
      context,
      question: query,
    });

    const generationTime = Date.now() - generationStart;

    return {
      answer,
      sourceDocuments: topDocs,
      stats: {
        totalDocs: allDocs.length,
        bySource: {
          aoma_knowledge: aomaResults.length,
          jira_tickets: jiraResults.length,
          git_commits: gitResults.length,
          code_files: codeResults.length,
          outlook_emails: emailResults.length,
          openai_vector_store: openaiResults.length,
        },
        retrievalTimeMs: retrievalTime,
        generationTimeMs: generationTime,
      },
    };
  }

  /**
   * Health check for all retrievers
   */
  async healthCheck(): Promise<{ healthy: boolean; sources: Record<string, boolean> }> {
    const testQuery = 'test';
    const results = await Promise.allSettled([
      this.supabaseRetrievers.getAOMAKnowledge(1).getRelevantDocuments(testQuery),
      this.supabaseRetrievers.getJiraTickets(1).getRelevantDocuments(testQuery),
      this.supabaseRetrievers.getGitCommits(1).getRelevantDocuments(testQuery),
      this.supabaseRetrievers.getCodeFiles(1).getRelevantDocuments(testQuery),
      this.supabaseRetrievers.getOutlookEmails(1).getRelevantDocuments(testQuery),
      this.openaiRetriever.getRelevantDocuments(testQuery),
    ]);

    const sources = {
      aoma_knowledge: results[0].status === 'fulfilled',
      jira_tickets: results[1].status === 'fulfilled',
      git_commits: results[2].status === 'fulfilled',
      code_files: results[3].status === 'fulfilled',
      outlook_emails: results[4].status === 'fulfilled',
      openai_vector_store: results[5].status === 'fulfilled',
    };

    const healthy = Object.values(sources).every(v => v);

    return { healthy, sources };
  }
}
```

#### Step 1.4: Update aoma-knowledge.tool.ts (Backward Compatible)
**File**: `src/tools/aoma-knowledge.tool.ts`

```typescript
import { LangChainOrchestrator } from '../../services/langchain-orchestrator.service';

export class AOMAKnowledgeTool extends BaseTool {
  constructor(
    private readonly openaiService: OpenAIService,
    private readonly supabaseService: SupabaseService,
    private readonly langchainOrchestrator?: LangChainOrchestrator  // Optional!
  ) {
    super();
  }

  async execute(args: Record<string, unknown>, context: ToolExecutionContext): Promise<CallToolResult> {
    const request = args as AOMAQueryRequest;
    const { query, strategy = 'focused', context: additionalContext, maxResults = 10 } = request;

    try {
      // Try new LangChain orchestration if available
      if (this.langchainOrchestrator) {
        context.logger.info('Using LangChain v1.0 orchestration');

        const result = await this.langchainOrchestrator.query(query, strategy);

        return this.success({
          response: result.answer,
          sourceDocuments: result.sourceDocuments.map(doc => ({
            source: doc.metadata.source,
            title: doc.metadata.title || doc.metadata.filename,
            similarity: doc.metadata.similarity,
            snippet: doc.pageContent.slice(0, 200) + '...',
          })),
          stats: result.stats,
          strategy,
          orchestrationVersion: 'langchain-v1.0',
        });
      }

      // Fallback to legacy method
      context.logger.warn('LangChain orchestrator not available, using legacy method');

      const vectorResults = await this.supabaseService.searchKnowledge(query, maxResults, 0.7);
      const response = await this.openaiService.queryKnowledgeFast(query, strategy, additionalContext);

      return this.success({
        response,
        vectorResults: vectorResults.map(r => ({
          title: r.title,
          similarity: r.similarity,
          url: r.url,
          snippet: r.content.slice(0, 200) + '...'
        })),
        strategy,
        orchestrationVersion: 'legacy',
      });

    } catch (error) {
      context.logger.error('AOMA knowledge query failed', { error });
      return this.error('Failed to query AOMA knowledge base', {
        error: error instanceof Error ? error.message : error
      });
    }
  }
}
```

#### Step 1.5: Wire Up in Main Server
**File**: `src/aoma-mesh-server.ts`

```typescript
// Add to initialization
const langchainOrchestrator = new LangChainOrchestrator(
  openaiService,
  supabaseService,
  env
);

// Pass to tool
const aomaKnowledgeTool = new AOMAKnowledgeTool(
  openaiService,
  supabaseService,
  langchainOrchestrator  // New parameter
);
```

### Phase 2: Advanced Features (2-3 hours)

#### 2.1: Add Streaming Support
```typescript
async *queryStream(query: string, strategy: string) {
  // ... retrieval logic ...

  const stream = await chain.stream({
    context,
    question: query,
  });

  for await (const chunk of stream) {
    yield chunk;
  }
}
```

#### 2.2: Add LangSmith Tracing
```typescript
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';

const tracer = new LangChainTracer({
  projectName: 'aoma-mesh-mcp',
  apiKey: process.env.LANGSMITH_API_KEY,
});

// All operations automatically traced!
```

#### 2.3: Add Query Expansion with MultiQueryRetriever
```typescript
import { MultiQueryRetriever } from '@langchain/core/retrievers';

const multiRetriever = MultiQueryRetriever.fromLLM({
  llm: this.chatModel,
  retriever: baseRetriever,
  queryCount: 3  // Generate 3 query variations
});
```

---

## Rollout Plan (Seamless, Zero Downtime)

### Week 1: Infrastructure
- ✅ Day 1: Upgrade packages (DONE)
- Day 2: Create retriever wrappers
- Day 3: Create orchestrator
- Day 4: Add fallback support
- Day 5: Testing & validation

### Week 2: Deployment
- Day 1: Deploy with feature flag (orchestrator disabled)
- Day 2: Enable for 10% of traffic
- Day 3: Monitor metrics, fix issues
- Day 4: Ramp to 50% of traffic
- Day 5: Ramp to 100%, remove legacy code

### Success Metrics
- Empty response rate: 40-60% → <5%
- Average response time: 8-20s → 10-15s
- Source diversity: 1 source → 6 sources
- User satisfaction: Track via feedback

---

## Immediate Next Steps

1. **Test Build** (5 min)
   ```bash
   npm run build
   ```

2. **Create Retrievers** (30 min)
   - `src/services/retrievers/supabase-retrievers.ts`
   - `src/services/retrievers/openai-retriever.ts`

3. **Create Orchestrator** (1 hour)
   - `src/services/langchain-orchestrator.service.ts`

4. **Wire Up Tool** (15 min)
   - Update `src/tools/aoma-knowledge.tool.ts`
   - Update `src/aoma-mesh-server.ts`

5. **Test Locally** (30 min)
   - Create test script
   - Validate all 6 sources work
   - Compare to legacy output

6. **Deploy** (15 min)
   - Commit changes
   - Push to Railway
   - Monitor logs

**Total Time**: ~3-4 hours for Phase 1

---

## Risk Mitigation

### Risk 1: New Code Breaks
**Mitigation**: Fallback to legacy method (already implemented)

### Risk 2: Performance Regression
**Mitigation**: Parallel retrieval should be faster, but monitor closely

### Risk 3: Different Response Quality
**Mitigation**: A/B test with side-by-side comparison

### Risk 4: One Source Fails
**Mitigation**: Catch errors per-retriever, continue with other sources

---

## Key Advantages Summary

1. ✅ **Unified Interface** - Same API for all 6 sources
2. ✅ **Parallel Retrieval** - Automatic parallelization
3. ✅ **Better Type Safety** - Catch errors at compile time
4. ✅ **Streaming Support** - Better UX for long responses
5. ✅ **Native Observability** - LangSmith tracing built-in
6. ✅ **Backward Compatible** - Fallback to legacy if needed
7. ✅ **No Breaking Changes** - Wraps existing services
8. ✅ **Incremental Rollout** - Feature flag support

**Bottom Line**: v1.0 gives us the tools to finally orchestrate all 6 vector sources properly, with minimal risk and maximum benefit.
