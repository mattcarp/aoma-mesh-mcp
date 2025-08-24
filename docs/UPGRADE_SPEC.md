# AOMA MCP Server – Upgrade Spec (Railway, Reference Quality)

## Goals

- **PRIMARY: Deliver immediate user value through enhanced agentic capabilities**
- Enable low-friction deployment on Railway with proven stability
- Keep improvements incremental and measurable with clear success metrics
- Defer complexity (LangChain) until native mode proves insufficient
- Prioritize features that users can experience within 24-48 hours

## Phase 1 — Immediate Value + Stability (Day 0-1)

### 1.1 Basic Native Planner (4 hours) 🎯 USER VALUE

Create a simple planner that:
- Reads available tools from server_capabilities
- Takes user request → breaks into 2-3 tool calls
- Executes sequentially with basic error handling
- No complex orchestration; just chain-of-tools

**Success Metric**: Users can say "analyze this repo and find authentication bugs" and it works.

### 1.2 Railway Deployment Fix (2 hours)

- Fix `tsconfig.railway.json` to include all needed source files
- Add remote health check script: `scripts/remote-health.ts`
- Verify PORT binding and Dockerfile.railway CMD

**Success Metric**: Zero 502 errors; `/health` returns 200 within 500ms.

### 1.3 Simple Session Memory (2 hours) 🎯 USER VALUE

- In-memory conversation buffer (last 10 turns)
- Inject into planner context for continuity
- No persistence yet; just session coherence

**Success Metric**: Follow-up questions retain context ("now search for those bugs in JIRA").

### 1.4 Request Tracing (1 hour)

- Add REQUEST_ID to all logs
- Log tool inputs/outputs in debug mode only
- Basic timing metrics per tool call

**Success Metric**: Can trace a full request from entry to completion.

## Phase 2 — Enhanced Intelligence (Day 2-3)

### 2.1 Persistent Session Memory (3 hours) 🎯 USER VALUE

- Upgrade Phase 1 memory to use Supabase
- Store conversation summaries with session_id
- Auto-retrieve last session on reconnect
- Simple key-value, no vectors yet

**Success Metric**: Users can disconnect/reconnect and bot remembers context.

### 2.2 Smarter Planner v2 (4 hours) 🎯 USER VALUE

Enhance the planner to:
- Generate multi-step plans (up to 5 tools)
- Support conditional execution ("if no JIRA results, try code search")
- Basic rollback on failure
- Still synchronous execution

**Success Metric**: Complex queries like "find all auth bugs, check if they're fixed in code, generate test plan for unfixed ones" work reliably.

### 2.3 Unified Search Interface (3 hours)

Create a single `unified_search` tool that:
- Routes to appropriate backend (JIRA, code, git, AOMA KB)
- Based on simple keyword matching initially
- Returns normalized results format

**Success Metric**: Users don't need to specify which search to use; system figures it out.

### 2.4 Tool Verification Suite (2 hours)

- `scripts/remote-tools.ts` to verify all tools work
- Integration test: "plan → execute → verify" flow
- Basic performance benchmarks

**Success Metric**: CI catches tool breakage before deploy.

## Phase 3 — Production Hardening (Day 4-5)

### 3.1 Vector Memory Search (4 hours)

- Add embeddings to session memory
- Enable semantic search across past conversations
- "What did we discuss about authentication last week?"

**Success Metric**: Memory retrieval accuracy > 80% on test queries.

### 3.2 Parallel Tool Execution (4 hours)

- Upgrade planner to identify independent steps
- Execute non-dependent tools in parallel
- Add timeout handling per tool

**Success Metric**: 40% reduction in multi-tool request latency.

### 3.3 Smart Caching Layer (3 hours)

- LRU cache for expensive operations (AOMA KB, health checks)
- 60-second TTL on read-heavy tools
- Cache invalidation on writes

**Success Metric**: 50% reduction in OpenAI API calls for repeated queries.

### 3.4 Error Recovery & Retry (3 hours)

- Exponential backoff on transient failures
- Fallback strategies (e.g., if JIRA fails, note it and continue)
- User-friendly error messages

**Success Metric**: 95% of requests complete even with one service down.

## Phase 4 — Quality & Developer Experience (Day 6-7)

### 4.1 Comprehensive Test Suite (4 hours)

- Unit tests for planner, memory, cache
- Integration test: full user journey
- Load test: 10 concurrent requests

**Success Metric**: 90% code coverage on critical paths.

### 4.2 Type Safety Everywhere (3 hours)

- Strict Zod schemas on all tool inputs/outputs
- Unified error types with McpError class
- Runtime validation with clear error messages

**Success Metric**: Zero runtime type errors in production.

### 4.3 Documentation & Architecture Diagram (2 hours)

- ARCHITECTURE.md with Mermaid diagrams
- Tool usage examples for each tool
- Troubleshooting guide

**Success Metric**: New developer can understand system in < 30 minutes.

### 4.4 CI/CD Pipeline (3 hours)

- Pre-commit hooks: lint, typecheck
- CI: test → build → remote health check
- Auto-deploy to Railway on main branch

**Success Metric**: Zero broken deployments reach production.

## Phase 5 — Advanced Features (Optional, After Validation)

### 5.1 LangChain Mode (Only if native mode hits limits)

**Decision Gate**: Implement ONLY if native planner can't handle >5 tool orchestrations

- LangChain tool adapter with feature flag
- ReAct agent as alternative to native planner
- LangSmith tracing for debugging

**Success Metric**: Justify 30% additional complexity with 50% capability increase.

### 5.2 Long-term Episodic Memory

- Separate table for cross-session insights
- Background job to extract key learnings
- Proactive suggestion based on past patterns

**Success Metric**: Bot proactively suggests solutions based on historical patterns.

### 5.3 Multi-Agent Coordination

- Specialist agents (Researcher, Validator, Executor)
- Message passing between agents
- Consensus mechanisms for decisions

**Success Metric**: Complex multi-domain tasks complete without user intervention.

## Revised Timeline

### Week 1: User Value Sprint
- **Day 1**: Phase 1 (Planner + Railway fix + Session memory) → **Users see immediate value**
- **Days 2-3**: Phase 2 (Persistent memory + Smart planner + Unified search)
- **Days 4-5**: Phase 3 (Vector memory + Parallel execution + Caching)

### Week 2: Production Ready
- **Days 6-7**: Phase 4 (Tests + Types + Docs + CI/CD)
- **Days 8+**: Evaluate native mode performance, decide on Phase 5

## Environment Flags Summary

```bash
# Core
MCP_DIAGNOSTICS = on | off          # Enable debug logging
MCP_ORCHESTRATOR = native           # Keep native by default

# Future (Phase 5 only if needed)
MCP_ORCHESTRATOR = langchain        # Only if native insufficient
LANGCHAIN_TRACING_V2 = true         # Only with LangChain
LANGCHAIN_API_KEY = <key>           # Only with LangChain
```

## Key Implementation Files

### Phase 1 (Immediate)
- `src/planner/native.ts` - Simple tool chaining
- `src/memory/session.ts` - In-memory buffer
- `scripts/remote-health.ts` - Railway health check

### Phase 2-3 (Core Features)
- `src/memory/persistent.ts` - Supabase-backed memory
- `src/planner/v2.ts` - Conditional execution
- `src/search/unified.ts` - Multi-source router
- `src/cache/lru.ts` - Performance optimization

### Phase 5 (Only if needed)
- `src/orchestrators/langchain-adapter.ts` - Deferred complexity

## Success Criteria

✅ **Phase 1 Success**: Users can chain tools and see immediate value within 24 hours
✅ **Phase 2 Success**: System maintains context and handles complex queries
✅ **Phase 3 Success**: Production-ready with <500ms response time
✅ **Phase 4 Success**: 90% test coverage, zero type errors
❓ **Phase 5 Gate**: Only proceed if native mode demonstrably insufficient

This approach delivers value fast, defers complexity, and keeps the system maintainable.
1