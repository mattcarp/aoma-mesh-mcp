# LangChain Orchestration Architecture

## Current State (BROKEN)

```
User Query
    ↓
┌───────────────────────────────────┐
│  aoma-knowledge.tool.ts           │
├───────────────────────────────────┤
│ 1. Search Supabase               │ ← Gets results
│    - aoma_knowledge table         │
│    - Returns 10 vector matches    │
│                                   │
│ 2. Build contextual query         │ ← NEVER USED!
│    - Formats Supabase results     │
│    - Combines with context        │
│                                   │
│ 3. Query OpenAI                   │ ← IGNORES SUPABASE!
│    - Only uses original query     │
│    - Only searches OpenAI vectors │
│    - Returns empty if no match    │
└───────────────────────────────────┘
    ↓
Empty or partial response ❌
```

**Problem**: Line 86 calls `queryKnowledge(query, strategy, additionalContext)` but NEVER passes the `contextualQuery` built on line 81!

## What We SHOULD Be Doing (LangChain RAG)

### Multi-Source RAG Chain

```
                    User Query
                         ↓
        ┌────────────────┴────────────────┐
        │   LangChain Query Router        │
        │  (Classifies query intent)      │
        └────────┬────────────────┬───────┘
                 │                │
     ┌───────────┴─────┐    ┌────┴──────────────┐
     │ Source Selector │    │  Parallel Retrieval│
     │ (Multi-query)   │    │      Agent         │
     └────────┬────────┘    └─────┬─────────────┘
              │                    │
    ┌─────────┴─────────────────┐ │
    │ Parallel Vector Search    │ │
    ├───────────────────────────┤ │
    │ 1. Supabase Vectors       │◄┘
    │    - aoma_knowledge       │
    │    - jira_tickets         │
    │    - git_commits          │
    │    - code_files           │
    │    - outlook_emails       │
    │                           │
    │ 2. OpenAI Vector Store    │
    │    - 150+ AOMA docs       │
    │    - File search tool     │
    └────────┬──────────────────┘
             │
    ┌────────┴──────────────────┐
    │ Context Fusion            │
    │ (Rerank & Deduplicate)    │
    └────────┬──────────────────┘
             │
    ┌────────┴──────────────────┐
    │ GPT-5 Synthesis           │
    │ (Generate final response) │
    └────────┬──────────────────┘
             ↓
       Complete Answer ✅
```

## LangChain Components We Need

### 1. **MultiQueryRetriever** (Query Expansion)
```typescript
import { MultiQueryRetriever } from '@langchain/core/retrievers/multi_query';

// Expands "How do I add QC providers?" into:
// - "Adding quality control providers to AOMA"
// - "QC provider configuration process"
// - "Steps to register new QC vendors"
```

### 2. **VectorStoreRetriever** (For Each Source)
```typescript
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';

// 5 Supabase vector stores
const aomaRetriever = SupabaseVectorStore.fromExistingIndex(
  new OpenAIEmbeddings(),
  { client: supabase, tableName: 'aoma_knowledge' }
).asRetriever();

const jiraRetriever = SupabaseVectorStore.fromExistingIndex(
  new OpenAIEmbeddings(),
  { client: supabase, tableName: 'jira_tickets' }
).asRetriever();

// ... git, code, email retrievers
```

### 3. **EnsembleRetriever** (Combine Multiple Sources)
```typescript
import { EnsembleRetriever } from '@langchain/core/retrievers';

const ensembleRetriever = new EnsembleRetriever({
  retrievers: [
    aomaRetriever,
    jiraRetriever,
    gitRetriever,
    codeRetriever,
    emailRetriever,
    openaiVectorRetriever
  ],
  weights: [0.3, 0.2, 0.15, 0.15, 0.1, 0.1] // AOMA docs weighted highest
});
```

### 4. **ContextualCompressionRetriever** (Rerank Results)
```typescript
import { ContextualCompressionRetriever } from '@langchain/core/retrievers';
import { CohereRerank } from '@langchain/cohere';

const compressor = new CohereRerank({
  apiKey: process.env.COHERE_API_KEY,
  topN: 10,
  model: 'rerank-english-v2.0'
});

const compressionRetriever = new ContextualCompressionRetriever({
  baseRetriever: ensembleRetriever,
  baseCompressor: compressor
});
```

### 5. **ConversationalRetrievalQAChain** (Final Synthesis)
```typescript
import { ConversationalRetrievalQAChain } from '@langchain/chains';
import { ChatOpenAI } from '@langchain/openai';

const chain = ConversationalRetrievalQAChain.fromLLM(
  new ChatOpenAI({
    modelName: 'gpt-5',
    temperature: 1
  }),
  compressionRetriever,
  {
    returnSourceDocuments: true,
    qaChainOptions: {
      type: 'stuff', // Or 'map_reduce' for very large contexts
    }
  }
);
```

## Data Flow with LangChain

### Example: "How do I manage QC providers in AOMA?"

**Step 1: Query Router** (Optional but recommended)
```typescript
// Classify query type and determine sources
{
  queryType: 'configuration',
  sources: ['aoma_knowledge', 'jira_tickets'],
  complexity: 'medium'
}
```

**Step 2: Parallel Vector Search**
```typescript
// Search all 6 sources simultaneously
Promise.all([
  aomaRetriever.getRelevantDocuments(query),      // 10 results
  jiraRetriever.getRelevantDocuments(query),      // 5 results
  gitRetriever.getRelevantDocuments(query),       // 2 results
  codeRetriever.getRelevantDocuments(query),      // 0 results
  emailRetriever.getRelevantDocuments(query),     // 1 result
  openaiVectorRetriever.getRelevantDocuments(query) // 8 results
])
```

**Step 3: Ensemble & Rerank**
```typescript
// Total: 26 documents
// After deduplication: 23 documents
// After reranking: Top 10 documents with scores:
[
  { source: 'aoma_knowledge', score: 0.93, content: '...' },
  { source: 'openai_vector', score: 0.89, content: '...' },
  { source: 'jira_tickets', score: 0.84, content: '...' },
  // ...
]
```

**Step 4: Context Fusion**
```typescript
// Build unified context for GPT-5
const context = `
Based on the following sources:

[AOMA Documentation - Score: 0.93]
QC Provider Management allows administrators to configure...

[OpenAI Vector Store - Score: 0.89]
To add a new QC provider, navigate to Admin > QC Providers...

[JIRA Ticket AOMA-1234 - Score: 0.84]
Bug: QC provider dropdown not showing after adding new provider...
`;
```

**Step 5: GPT-5 Synthesis**
```typescript
// Send to GPT-5 with full context
const response = await chain.call({
  question: query,
  chat_history: []
});

// Returns:
{
  text: "To manage QC providers in AOMA...",
  sourceDocuments: [
    { source: 'aoma_knowledge', page: 42 },
    { source: 'jira_tickets', id: 'AOMA-1234' }
  ]
}
```

## Why This Fixes Empty Responses

### Current Problem
- Only searches OpenAI vector store
- If OpenAI doesn't have good match, returns empty
- Supabase has 5 tables of data that are NEVER used

### LangChain Solution
- Searches ALL 6 sources in parallel
- Combines results using ensemble weights
- Reranks by relevance across all sources
- GPT-5 gets comprehensive context from multiple sources
- Much lower chance of empty response

## Implementation Priority

### Phase 1: Basic Multi-Source RAG (2-3 hours)
```typescript
// src/services/langchain-orchestrator.service.ts
1. Create SupabaseVectorStore retrievers for 5 tables
2. Create OpenAI assistant retriever wrapper
3. Combine with EnsembleRetriever
4. Pass to GPT-5 via ConversationalRetrievalQAChain
```

### Phase 2: Advanced Features (4-6 hours)
```typescript
1. Add query routing (classification)
2. Add reranking (Cohere or LangChain built-in)
3. Add conversation memory
4. Add source attribution
```

### Phase 3: Optimization (2-4 hours)
```typescript
1. Cache frequently accessed documents
2. Optimize ensemble weights based on query type
3. Add LangSmith tracing for debugging
4. Tune chunk sizes and overlap
```

## Files to Modify

### New Files
- `src/services/langchain-orchestrator.service.ts` - Main orchestration logic
- `src/services/retrievers/supabase-retriever.ts` - Supabase vector store wrappers
- `src/services/retrievers/openai-retriever.ts` - OpenAI assistant retriever wrapper
- `src/services/retrievers/ensemble-retriever.ts` - Combine all retrievers

### Modified Files
- `src/tools/aoma-knowledge.tool.ts` - Use LangChainOrchestrator instead of direct queries
- `src/services/openai.service.ts` - Add retriever interface method

## Testing Strategy

### Unit Tests
```typescript
describe('LangChainOrchestrator', () => {
  it('should retrieve from all 6 sources', async () => {
    const results = await orchestrator.retrieve(query);
    expect(results).toHaveProperty('aoma_knowledge');
    expect(results).toHaveProperty('openai_vector');
  });

  it('should rerank and deduplicate', async () => {
    const ranked = await orchestrator.rerank(results);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
});
```

### Integration Tests
```typescript
describe('End-to-End Query', () => {
  it('should return comprehensive response', async () => {
    const response = await orchestrator.query('How do I manage QC providers?');
    expect(response.text).not.toBe('');
    expect(response.sourceDocuments.length).toBeGreaterThan(0);
  });
});
```

## Performance Expectations

### Before (Current State)
- Single source (OpenAI vector store only)
- 8-20s query time
- 40-60% empty response rate
- No source diversity

### After (LangChain Multi-Source)
- 6 parallel sources
- 10-15s query time (parallel retrieval)
- <5% empty response rate
- Rich source attribution

## Next Steps

1. **Create LangChainOrchestratorService** with basic EnsembleRetriever
2. **Wire up all 6 vector sources** (5 Supabase + 1 OpenAI)
3. **Update aoma-knowledge.tool.ts** to use orchestrator
4. **Test with sample queries** and validate response quality
5. **Add LangSmith tracing** for observability
6. **Deploy to Railway** and monitor production performance

---

**Bottom Line**: We have all the pieces (LangChain installed, 6 vector sources available, GPT-5 ready), but we're NOT connecting them together. LangChain is designed exactly for this multi-source RAG orchestration use case.
