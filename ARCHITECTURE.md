# AOMA Mesh MCP Server - Architecture

## Purpose: DATA SERVING LAYER

This MCP server is **read-only** and focused on fast, reliable access to enterprise data stored in Supabase.

### What This Server DOES

✅ **Serve data via MCP protocol**
- Query AOMA knowledge base (OpenAI Assistant API)
- Search JIRA tickets (vector & text search)
- Search Git commits (semantic search)
- Search code files (vector search)
- Analyze development context
- Cross-vector intelligence (swarm analysis)

✅ **Production deployment**
- Always-on Railway deployment
- Fast response times (<2s for queries, <30s for AI analysis)
- Health monitoring and metrics
- Horizontal scaling capability

✅ **Read-only Supabase access**
- Vector similarity search
- PostgreSQL queries
- No data mutation

### What This Server DOES NOT DO

❌ **Data collection/ingestion**
- NO Playwright scraping
- NO web crawling
- NO JIRA API calls
- NO Confluence scraping
- NO data ingestion

❌ **Heavy processing**
- NO embedding generation (use siam/betabase)
- NO long-running batch jobs
- NO scheduled tasks

❌ **Authentication for external services**
- NO Microsoft/SSO login handling
- NO VPN detection
- NO 2FA workflows

## Data Flow

```
┌──────────────────────┐
│   siam/betabase      │  ← Data Collection (Playwright, JQL, crawling)
│   (ETL Layer)        │
└──────────────────────┘
           │
           ├─ Scrape JIRA via Playwright
           ├─ Generate embeddings
           ├─ De-duplicate
           │
           ▼
┌──────────────────────┐
│   Supabase Postgres  │  ← Single Source of Truth
│   • jira_tickets     │
│   • jira_ticket_     │
│     embeddings       │
│   • git_commits      │
│   • code_files       │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  aoma-mesh-mcp       │  ← Data Serving (YOU ARE HERE)
│  (MCP Server)        │
│  Railway Deployment  │
└──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  Claude Desktop,     │
│  VS Code, Web Apps   │
└──────────────────────┘
```

## Key Principles

1. **Stateless**: No local state, all queries go to Supabase
2. **Fast**: Optimize for low-latency queries
3. **Reliable**: Production-grade error handling
4. **Lightweight**: Minimal dependencies, fast startup
5. **Read-only**: Never mutate data in Supabase

## Database Tables We Query

- `jira_tickets` - JIRA ticket data (6,554+ tickets)
- `jira_ticket_embeddings` - Vector embeddings for semantic search
- `git_commits` - Git commit history
- `git_file_embeddings` - Code file embeddings
- `code_files` - Source code files
- Various AOMA-specific tables

## For Data Collection

See: [siam/betabase](../siam/README.md) - All scraping, crawling, and data ingestion happens there.

## Deployment

- **Platform**: Railway
- **URL**: https://luminous-dedication-production.up.railway.app
- **Health**: `/health` endpoint
- **Version**: 2.7.0

## Performance Targets

- Simple queries: <2s
- AI-powered analysis: <30s
- Vector search: <1s
- Health check: <1s

---

**Remember**: This is a **query server**, not a **data collector**. Keep it lightweight and fast!
