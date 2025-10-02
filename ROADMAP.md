# AOMA Mesh MCP - Roadmap

## Current State

**Status:** ✅ Working with GPT-5 Assistant API  
**Performance:** 30-35s per query (acceptable)  
**Quality:** Excellent (full document access)

---

## 🚀 Long-Term Architecture Plan (HIGH PRIORITY)

### Problem with Current Approach
- **Locked into OpenAI ecosystem** (Assistant API + Vector Store)
- **Limited control** over document chunking and retrieval
- **Cost concerns** - OpenAI vector store + Assistant API pricing
- **Performance ceiling** - 30-35s is acceptable but not great
- **No flexibility** to swap LLMs or optimize retrieval

### Target Architecture

#### 1. **Migrate Vector Store: OpenAI → Supabase**

**Why:**
- Full control over document chunking (500-1000 token chunks)
- Better cost management (PostgreSQL + pgvector)
- Already using Supabase for other data
- Can optimize chunk size for performance vs quality

**Migration Steps:**
```
1. Export OpenAI vector store documents
2. Implement chunking strategy:
   - Split large documents into 500-1000 token chunks
   - Maintain document context/metadata
   - Generate embeddings with OpenAI text-embedding-3-large
3. Store in Supabase:
   - Table: aoma_document_chunks
   - Columns: id, document_id, chunk_text, embedding, metadata, chunk_index
4. Create vector similarity search function
5. Test retrieval quality vs OpenAI vector store
6. Gradual cutover (feature flag)
```

**Expected Benefits:**
- 60-80% cost reduction
- Faster retrieval (local PostgreSQL vs API call)
- Better control over relevance ranking

#### 2. **Replace Assistant API with LangGraph**

**Why:**
- **Flexibility:** Multi-step reasoning and conditional logic
- **Control:** Full visibility into each step
- **Optimization:** Can tune each stage independently
- **Model agnostic:** Easy to swap LLMs (GPT-5, Claude 3.5 Sonnet, etc.)

**LangGraph Pipeline:**
```
1. Query Analysis
   ├─> Extract intent
   ├─> Identify query type (workflow, technical, integration)
   └─> Determine strategy

2. Vector Retrieval
   ├─> Generate query embedding
   ├─> Search Supabase vector store
   ├─> Get top 10-20 chunks
   └─> Re-rank by relevance

3. Context Assembly
   ├─> Group chunks by document
   ├─> Deduplicate overlapping content
   ├─> Build focused context (max 8K tokens)
   └─> Add metadata and citations

4. LLM Generation
   ├─> Choose best LLM (GPT-5, Claude 3.5, etc.)
   ├─> Generate response with streaming
   ├─> Validate citations
   └─> Format output

5. Post-processing
   ├─> Check quality
   ├─> Add source links
   └─> Log metrics
```

**Expected Benefits:**
- **10-15s response time** (3x faster than current 30-35s)
- **Better quality:** Targeted retrieval + re-ranking
- **Streaming:** Start showing results immediately
- **Transparency:** See each step's performance

#### 3. **LLM Selection Strategy**

**Options to evaluate:**

| Model | Speed | Quality | Cost | Use Case |
|-------|-------|---------|------|----------|
| **GPT-4o** | Fast (5-7s) | Good | $$ | Rapid queries, simple Q&A |
| **GPT-5** | Medium (15-20s) | Excellent | $$$$ | Complex workflows, critical info |
| **Claude 3.5 Sonnet** | Fast (6-8s) | Excellent | $$$ | General purpose, best balance |
| **GPT-4o-mini** | Very Fast (3-4s) | Decent | $ | Cache warming, previews |

**Recommendation:** Start with Claude 3.5 Sonnet
- Best speed/quality tradeoff
- Excellent at following citations
- 200K context window (can handle large contexts if needed)
- Easy to switch if needed

---

## 📋 Implementation Roadmap

### Phase 1: Foundation (2-3 weeks)
- [ ] Set up Supabase document chunking table
- [ ] Implement document ingestion pipeline
- [ ] Generate embeddings for all AOMA documents
- [ ] Create vector similarity search SQL functions
- [ ] Build retrieval quality tests (compare vs OpenAI)

**Success Criteria:** Supabase retrieval quality >= OpenAI vector store

### Phase 2: LangGraph Integration (2 weeks)
- [ ] Install LangGraph and dependencies
- [ ] Implement basic query → retrieval → generation pipeline
- [ ] Add streaming support
- [ ] Build monitoring and logging
- [ ] A/B test vs current Assistant API

**Success Criteria:** 10-15s response time with equal or better quality

### Phase 3: Multi-Model Support (1 week)
- [ ] Add Claude 3.5 Sonnet integration
- [ ] Implement model routing based on query type
- [ ] Add cost tracking per model
- [ ] Performance comparison dashboard

**Success Criteria:** Can route queries to best model automatically

### Phase 4: Optimization (2 weeks)
- [ ] Implement re-ranking algorithm
- [ ] Add query caching for common questions
- [ ] Optimize chunk size (test 500, 750, 1000 tokens)
- [ ] Add semantic caching (similar queries)
- [ ] Tune retrieval thresholds

**Success Criteria:** Sub-10s response time for 80% of queries

### Phase 5: Advanced Features (3 weeks)
- [ ] Multi-hop reasoning for complex queries
- [ ] Conversation history integration
- [ ] Query decomposition for complex questions
- [ ] Source confidence scoring
- [ ] Answer verification step

**Success Criteria:** Handle multi-part questions, maintain conversation context

---

## 🎯 Quick Wins (Can Do Now)

### 1. Add Query Caching (1 day)
```typescript
// Cache common queries in Redis/memory
const cachedResponse = await cache.get(queryHash);
if (cachedResponse) return cachedResponse;
```
**Expected:** Instant response for repeated queries

### 2. Implement Streaming (2 days)
```typescript
// Start streaming response immediately
return streamResponse(async function* () {
  yield "Searching knowledge base...\n";
  const chunks = await vectorSearch(query);
  yield "Generating response...\n";
  for await (const token of llm.stream(chunks)) {
    yield token;
  }
});
```
**Expected:** Better perceived performance

### 3. Add Performance Monitoring (1 day)
```typescript
logger.info('Query performance breakdown', {
  vectorSearchMs: timing.vectorSearch,
  llmGenerationMs: timing.llmGeneration,
  totalMs: timing.total,
  model: 'gpt-5',
  queryType: 'workflow'
});
```
**Expected:** Identify slow steps

---

## 📊 Success Metrics

### Performance Targets
- **P50 (median):** < 12s
- **P95:** < 20s  
- **P99:** < 30s
- **Outliers (> 30s):** < 1%

### Quality Targets
- **Accuracy:** > 95% (correct answers)
- **Citation Quality:** > 90% (valid source references)
- **Completeness:** > 85% (answers all aspects of question)

### Cost Targets
- **Per Query Cost:** < $0.05 (down from ~$0.10 with Assistant API)
- **Monthly Cost:** < $500 for 10K queries

---

## 🔄 Migration Strategy

### Parallel Running (Safe Cutover)
```typescript
// Feature flag approach
const USE_NEW_PIPELINE = process.env.LANGGRAPH_ENABLED === 'true';

if (USE_NEW_PIPELINE) {
  return await langGraphQuery(query, strategy);
} else {
  return await assistantApiQuery(query, strategy);
}
```

### Gradual Rollout
1. **Week 1:** 5% of traffic → new pipeline
2. **Week 2:** 25% of traffic (if metrics good)
3. **Week 3:** 50% of traffic
4. **Week 4:** 100% cutover, deprecate Assistant API

### Rollback Plan
- Keep Assistant API code for 1 month after cutover
- Monitor error rates and quality metrics
- Can instantly switch back if issues arise

---

## 💰 Cost Analysis

### Current (OpenAI Assistant API)
- Vector Store: ~$100/month
- Assistant API: ~$300/month (includes GPT-5 usage)
- **Total:** ~$400/month

### Future (Supabase + LangGraph + Claude)
- Supabase Storage: ~$20/month
- Embeddings: ~$30/month (one-time + updates)
- Claude 3.5: ~$150/month
- Infrastructure: ~$50/month
- **Total:** ~$250/month

**Savings:** $150/month (37.5% reduction)

---

## 🚨 Risks & Mitigations

### Risk 1: Quality Degradation
**Mitigation:** 
- Extensive A/B testing before cutover
- Keep gold standard test queries
- Quality regression tests in CI/CD

### Risk 2: Latency Regression
**Mitigation:**
- Performance benchmarks at each step
- Rollback plan if P95 > 25s
- Optimize hot path first

### Risk 3: Cost Overrun
**Mitigation:**
- Set spending limits on LLM APIs
- Implement caching aggressively
- Monitor cost per query continuously

---

## 🎓 Learning Goals

Along the way, document:
- Vector store best practices
- LangGraph patterns and anti-patterns
- LLM routing strategies
- Prompt engineering techniques
- Performance optimization tips

**Create guides:**
- `docs/VECTOR_STORE_MIGRATION.md`
- `docs/LANGGRAPH_ARCHITECTURE.md`
- `docs/LLM_SELECTION_GUIDE.md`
- `docs/PERFORMANCE_OPTIMIZATION.md`

---

## Next Steps

**Immediate (This Week):**
1. Test current Assistant API performance for 24 hours
2. Collect baseline metrics (P50, P95, P99, costs)
3. Set up Supabase chunking table schema

**Short Term (This Month):**
1. Begin document chunking pipeline
2. Research LangGraph best practices
3. Prototype basic retrieval pipeline

**Long Term (Next Quarter):**
1. Full migration to Supabase + LangGraph
2. Multi-model support with routing
3. Advanced optimization and features

---

**Last Updated:** October 2, 2025  
**Owner:** Engineering Team  
**Status:** Planning → Implementation Starting
