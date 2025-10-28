# LangChain v1.0 Migration Plan for aoma-mesh-mcp

## Current vs Target Versions

### BEFORE (What We Had)
```json
{
  "@langchain/community": "^0.3.57",
  "@langchain/core": "^0.3.79",
  "@langchain/langgraph": "^0.4.9",
  "@langchain/openai": "^0.6.16"
}
```

### AFTER (What We Just Upgraded To) ✅
```json
{
  "@langchain/community": "^1.0.0",
  "@langchain/core": "^1.0.2",
  "@langchain/langgraph": "^1.0.1",
  "@langchain/openai": "^1.0.0"
}
```

**Status**: ✅ **UPGRADE COMPLETE** (Installed in this session)

## Current Problem: LangChain Installed But NOT Used

### The Issue
We have LangChain 1.0.x installed, but **ZERO imports or usage** in our codebase:

```bash
$ grep -r "import.*@langchain" src/
# Returns: NO RESULTS

$ grep -r "from '@langchain" src/
# Returns: NO RESULTS
```

### What We're Missing
- 6 vector sources available (5 Supabase + 1 OpenAI)
- Supabase results searched but **never passed to OpenAI**
- No multi-source orchestration
- 40-60% empty response rate

## LangChain v1.0 Key Changes (Relevant to Us)

### 1. **Retrievers** - Core Pattern for Multi-Source RAG

**JavaScript/TypeScript Path**:
```typescript
import { VectorStoreRetriever } from '@langchain/core/retrievers';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
```

**What Changed in v1.0**:
- Retrievers are now first-class citizens with standardized interface
- `asRetriever()` method on all vector stores
- Better async/streaming support
- Improved type safety

### 2. **Vector Stores** - Supabase Integration

**v1.0 Supabase Pattern**:
```typescript
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';

const vectorStore = await SupabaseVectorStore.fromExistingIndex(
  new OpenAIEmbeddings(),
  {
    client: supabaseClient,
    tableName: 'aoma_knowledge',
    queryName: 'search_aoma_knowledge', // Our custom RPC function
  }
);

const retriever = vectorStore.asRetriever({ k: 10 });
```

### 3. **Chains** - Simplified in v1.0

**OLD Way (v0.3)**:
```typescript
import { ConversationalRetrievalQAChain } from 'langchain/chains';
```

**NEW Way (v1.0)**:
```typescript
import { createRetrievalChain } from '@langchain/chains/retrieval';
import { createStuffDocumentsChain } from '@langchain/chains/combine_documents';
```

More modular, composable approach.

### 4. **Chat Models** - Return Type Fixed

**v1.0 Change**:
```typescript
// Now returns AIMessage (not BaseMessage)
const response: AIMessage = await chatModel.invoke(messages);
```

This is a breaking change but improves type safety.

## Migration Plan: 3 Phases

### Phase 1: Basic Multi-Retriever Setup (2-3 hours)

**Goal**: Get all 6 vector sources working with LangChain retrievers

**Files to Create**:

#### 1.1 `src/services/retrievers/supabase-retrievers.ts`
```typescript
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';
import { VectorStoreRetriever } from '@langchain/core/retrievers';
import { SupabaseService } from '../supabase.service';

export class SupabaseRetrievers {
  private embeddings: OpenAIEmbeddings;

  constructor(
    private supabaseService: SupabaseService,
    openaiApiKey: string
  ) {
    this.embeddings = new OpenAIEmbeddings({ openAIApiKey: openaiApiKey });
  }

  // Create retriever for aoma_knowledge table
  async getAOMAKnowledgeRetriever(k: number = 10): Promise<VectorStoreRetriever> {
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      this.embeddings,
      {
        client: this.supabaseService.client,
        tableName: 'aoma_knowledge',
        queryName: 'search_aoma_knowledge',
      }
    );

    return vectorStore.asRetriever({ k });
  }

  // Create retriever for jira_tickets table
  async getJiraRetriever(k: number = 10): Promise<VectorStoreRetriever> {
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      this.embeddings,
      {
        client: this.supabaseService.client,
        tableName: 'jira_tickets',
        queryName: 'search_jira_tickets',
      }
    );

    return vectorStore.asRetriever({ k });
  }

  // Similar for: git_commits, code_files, outlook_emails
  // ... (3 more methods)
}
```

#### 1.2 `src/services/retrievers/openai-retriever.ts`
```typescript
import { BaseRetriever } from '@langchain/core/retrievers';
import { Document } from '@langchain/core/documents';
import { OpenAIService } from '../openai.service';

/**
 * Custom retriever that wraps OpenAI Assistant vector store
 */
export class OpenAIVectorRetriever extends BaseRetriever {
  lc_namespace = ['aoma-mesh-mcp', 'retrievers'];

  constructor(
    private openaiService: OpenAIService,
    private maxResults: number = 10
  ) {
    super();
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // Use our existing direct vector store search
    const results = await this.openaiService.queryVectorStoreDirect(query, this.maxResults);

    return results.map(r => new Document({
      pageContent: r.content?.[0]?.text || '',
      metadata: {
        source: 'openai_vector_store',
        filename: r.filename,
        score: r.score,
      }
    }));
  }
}
```

#### 1.3 `src/services/langchain-orchestrator.service.ts`
```typescript
import { ChatOpenAI } from '@langchain/openai';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { VectorStoreRetriever } from '@langchain/core/retrievers';
import { SupabaseRetrievers } from './retrievers/supabase-retrievers';
import { OpenAIVectorRetriever } from './retrievers/openai-retriever';

export class LangChainOrchestrator {
  private chatModel: ChatOpenAI;
  private supabaseRetrievers: SupabaseRetrievers;
  private openaiRetriever: OpenAIVectorRetriever;

  constructor(
    private openaiService: OpenAIService,
    private supabaseService: SupabaseService,
    private config: Environment
  ) {
    this.chatModel = new ChatOpenAI({
      modelName: 'gpt-5',
      temperature: 1,
      openAIApiKey: config.OPENAI_API_KEY,
    });

    this.supabaseRetrievers = new SupabaseRetrievers(
      supabaseService,
      config.OPENAI_API_KEY
    );

    this.openaiRetriever = new OpenAIVectorRetriever(openaiService, 10);
  }

  /**
   * Query using ALL 6 vector sources with proper orchestration
   */
  async query(
    query: string,
    strategy: 'comprehensive' | 'focused' | 'rapid' = 'focused'
  ): Promise<{
    answer: string;
    sourceDocuments: any[];
    retrievalStats: Record<string, number>;
  }> {
    // 1. Get all retrievers
    const retrievers = await this.getAllRetrievers(strategy);

    // 2. Retrieve from all sources in parallel
    const allDocs = await this.retrieveFromAll(query, retrievers);

    // 3. Rerank by relevance (simple score-based for now)
    const rankedDocs = this.rerank(allDocs, strategy);

    // 4. Build prompt with context
    const prompt = ChatPromptTemplate.fromTemplate(`
You are an expert AOMA system analyst with access to comprehensive knowledge.

Context from multiple sources:
{context}

Question: {question}

Provide a detailed answer citing sources by name.
    `);

    // 5. Create chain
    const combineDocsChain = await createStuffDocumentsChain({
      llm: this.chatModel,
      prompt,
    });

    // 6. Execute
    const answer = await combineDocsChain.invoke({
      context: rankedDocs,
      question: query,
    });

    return {
      answer,
      sourceDocuments: rankedDocs,
      retrievalStats: this.calculateStats(allDocs),
    };
  }

  private async getAllRetrievers(strategy: string) {
    const k = strategy === 'comprehensive' ? 15 : strategy === 'focused' ? 10 : 5;

    return {
      aomaKnowledge: await this.supabaseRetrievers.getAOMAKnowledgeRetriever(k),
      jira: await this.supabaseRetrievers.getJiraRetriever(k),
      git: await this.supabaseRetrievers.getGitRetriever(k),
      code: await this.supabaseRetrievers.getCodeRetriever(k),
      email: await this.supabaseRetrievers.getEmailRetriever(k),
      openai: this.openaiRetriever,
    };
  }

  private async retrieveFromAll(query: string, retrievers: any) {
    const results = await Promise.all([
      retrievers.aomaKnowledge.getRelevantDocuments(query),
      retrievers.jira.getRelevantDocuments(query),
      retrievers.git.getRelevantDocuments(query),
      retrievers.code.getRelevantDocuments(query),
      retrievers.email.getRelevantDocuments(query),
      retrievers.openai.getRelevantDocuments(query),
    ]);

    return {
      aomaKnowledge: results[0],
      jira: results[1],
      git: results[2],
      code: results[3],
      email: results[4],
      openai: results[5],
    };
  }

  private rerank(allDocs: any, strategy: string) {
    // Combine all documents
    const combined = [
      ...allDocs.aomaKnowledge,
      ...allDocs.jira,
      ...allDocs.git,
      ...allDocs.code,
      ...allDocs.email,
      ...allDocs.openai,
    ];

    // Sort by metadata.score (descending)
    combined.sort((a, b) => (b.metadata.score || 0) - (a.metadata.score || 0));

    // Return top N based on strategy
    const topN = strategy === 'comprehensive' ? 20 : strategy === 'focused' ? 10 : 5;
    return combined.slice(0, topN);
  }

  private calculateStats(allDocs: any): Record<string, number> {
    return {
      aomaKnowledge: allDocs.aomaKnowledge.length,
      jira: allDocs.jira.length,
      git: allDocs.git.length,
      code: allDocs.code.length,
      email: allDocs.email.length,
      openai: allDocs.openai.length,
      total: Object.values(allDocs).reduce((sum: number, docs: any) => sum + docs.length, 0),
    };
  }
}
```

**Files to Modify**:

#### 1.4 Update `src/tools/aoma-knowledge.tool.ts`
```typescript
// BEFORE (lines 83-86)
const response = await this.openaiService.queryKnowledge(query, strategy, additionalContext);

// AFTER
const response = await this.langchainOrchestrator.query(query, strategy);
```

**Testing Phase 1**:
```bash
npx tsx test-langchain-orchestration.ts
```

Expected: All 6 sources return results, combined response has no empty responses

---

### Phase 2: Advanced Reranking (2-3 hours)

**Goal**: Add intelligent reranking using Cohere or cross-encoder

#### 2.1 Install Cohere (Optional)
```bash
npm install @langchain/cohere
```

#### 2.2 Add Reranking
```typescript
import { CohereRerank } from '@langchain/cohere';

// In LangChainOrchestrator constructor
this.reranker = new CohereRerank({
  apiKey: config.COHERE_API_KEY,
  topN: 10,
  model: 'rerank-english-v3.0',
});

// In rerank() method
private async rerank(allDocs: any, strategy: string, query: string) {
  const combined = [...]; // Same as before

  // Use Cohere reranking
  const reranked = await this.reranker.compressDocuments(combined, query);

  return reranked.slice(0, topN);
}
```

**Alternative**: Use LangChain's built-in contextual compression without Cohere

---

### Phase 3: Query Routing & Optimization (2-3 hours)

**Goal**: Route queries to optimal source combinations

#### 3.1 Query Classifier
```typescript
async classifyQuery(query: string): Promise<{
  type: 'technical' | 'procedural' | 'troubleshooting' | 'historical';
  sources: string[];
  priority: string[];
}> {
  // Use GPT-5 to classify
  const classification = await this.chatModel.invoke([
    {
      role: 'system',
      content: 'Classify the following query type and suggest best data sources...'
    },
    { role: 'user', content: query }
  ]);

  return JSON.parse(classification.content);
}
```

#### 3.2 Dynamic Source Selection
```typescript
// Only query relevant sources based on classification
const selectedRetrievers = await this.selectRetrievers(classification);
```

---

## Breaking Changes to Watch For

### 1. Supabase Vector Store Constructor
**v0.3**:
```typescript
new SupabaseVectorStore(embeddings, { client, tableName })
```

**v1.0**:
```typescript
await SupabaseVectorStore.fromExistingIndex(embeddings, { client, tableName })
```

### 2. Chat Model Return Types
```typescript
// Must update type annotations
const response: AIMessage = await model.invoke(messages); // Not BaseMessage
```

### 3. Import Paths
Some imports moved in v1.0:
```typescript
// OLD
import { RetrievalQAChain } from 'langchain/chains';

// NEW
import { createRetrievalChain } from 'langchain/chains/retrieval';
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('LangChainOrchestrator', () => {
  it('retrieves from all 6 sources', async () => {
    const result = await orchestrator.query('test query');
    expect(result.retrievalStats.total).toBeGreaterThan(0);
  });

  it('reranks by relevance', async () => {
    const docs = await orchestrator.retrieveFromAll('query', retrievers);
    const ranked = orchestrator.rerank(docs, 'focused');
    expect(ranked[0].metadata.score).toBeGreaterThanOrEqual(ranked[1].metadata.score);
  });
});
```

### Integration Tests
```typescript
describe('End-to-End', () => {
  it('returns comprehensive answers', async () => {
    const result = await orchestrator.query('How do I manage QC providers?');
    expect(result.answer).not.toBe('');
    expect(result.sourceDocuments.length).toBeGreaterThan(0);
  });
});
```

---

## Expected Performance Improvements

### Before LangChain Orchestration
- ❌ Single source (OpenAI only)
- ❌ 40-60% empty response rate
- ❌ No source diversity
- ⏱️ 8-20s query time

### After LangChain v1.0 Orchestration
- ✅ 6 parallel sources
- ✅ <5% empty response rate
- ✅ Rich source attribution
- ⏱️ 10-15s query time (parallel retrieval)

---

## Rollout Plan

1. ✅ **Phase 0**: Upgrade packages (DONE THIS SESSION)
2. **Phase 1**: Basic multi-retriever (2-3 hours)
   - Implement `SupabaseRetrievers`
   - Implement `OpenAIVectorRetriever`
   - Implement `LangChainOrchestrator`
   - Update `aoma-knowledge.tool.ts`
   - Test locally
3. **Phase 2**: Advanced reranking (2-3 hours)
   - Add Cohere or contextual compression
   - Optimize relevance scoring
4. **Phase 3**: Query routing (2-3 hours)
   - Add query classification
   - Dynamic source selection
5. **Deploy**: Push to Railway
6. **Monitor**: LangSmith tracing for observability

---

## Next Immediate Steps

1. Create `src/services/retrievers/` directory
2. Implement `supabase-retrievers.ts`
3. Implement `openai-retriever.ts`
4. Implement `langchain-orchestrator.service.ts`
5. Update `aoma-knowledge.tool.ts` to use orchestrator
6. Create test script
7. Validate all 6 sources return results

**Estimated Total Time**: 6-9 hours for full implementation
**Priority**: HIGH - This fixes the empty response issue

---

## References

- LangChain v1 Docs: https://docs.langchain.com/oss/javascript/releases-v1
- Supabase Vector Store: https://docs.langchain.com/oss/javascript/integrations/vectorstores/supabase
- Retrievers Guide: https://docs.langchain.com/oss/javascript/langchain-retrieval
- Migration Guide: https://docs.langchain.com/oss/python/migrate/langchain-v1
