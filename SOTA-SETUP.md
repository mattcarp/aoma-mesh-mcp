# SOTA AOMA Mesh MCP Server Setup

## 🚀 Complete Production Setup

### 1. Environment Variables (.env file)
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...

# Sony Music JIRA 
JIRA_BASE_URL=https://jira.smedigitalapps.com
JIRA_USERNAME=your.email@sonymusic.com
JIRA_PASSWORD=your_password

# Optional: Git Authentication for Private Repos
GITHUB_TOKEN=ghp_...
```

### 2. Database Setup
Run this SQL in Supabase SQL Editor:
```bash
# Copy and paste contents of setup-database-schema.sql
```

### 3. Start MCP Server
```bash
# Test environment setup
npx tsx start-mcp-server.ts

# The server will check credentials and start
```

### 4. JIRA Scraping (Requires VPN + 2FA)
```bash
# Test JIRA connection (do this first on VPN)
npx tsx jira-scraper.ts test

# Run incremental scrape (gets tickets newer than ITSM-55362)
npx tsx jira-scraper.ts incremental 500

# Full scrape (careful - lots of tickets!)
npx tsx jira-scraper.ts full 1000
```

### 5. Git Repository Scraping
```bash
# Single repository
npx tsx git-scraper.ts https://github.com/user/repo.git repo-name

# Batch repositories (edit repos-config.json first)
npx tsx git-scraper.ts batch repos-config.json

# Example: Scrape this project
npx tsx git-scraper.ts https://github.com/mattcarp/aoma-mesh-mcp.git aoma-mesh-mcp
```

## 🎯 Current Data Status

- **JIRA Tickets**: 6,280 tickets, 6,040 with embeddings
- **Latest Ticket**: ITSM-55362 (July 3, 2025)
- **Git Repos**: Ready for scraping (schema created)

## 📡 MCP Tools Available

1. **search_aoma_knowledge** - Sony Music AOMA docs (1000+ documents)
2. **search_jira_tickets** - Semantic JIRA search (6280+ tickets)
3. **search_git_commits** - Git commit semantic search (after scraping)
4. **search_git_files** - Source code semantic search (after scraping)
5. **health_check** - System status

## 🔧 Production Features

- **Deduplication**: Automatic upsert prevents duplicates
- **Rate Limiting**: Prevents API throttling
- **Vector Search**: Semantic similarity with embeddings
- **Error Handling**: Graceful failure recovery
- **Incremental Updates**: Only fetch new data
- **Multi-repo Support**: Batch Git repository processing

## ⚡ Quick Start Commands

```bash
# 1. Start MCP server
npx tsx start-mcp-server.ts

# 2. Test JIRA (on VPN)
npx tsx jira-scraper.ts test

# 3. Scrape new JIRA tickets
npx tsx jira-scraper.ts incremental

# 4. Scrape Git repos
npx tsx git-scraper.ts batch repos-config.json
```

## 🔍 Testing Search Functions

After scraping, test the semantic search:

```typescript
// Test JIRA search
const jiraResults = await supabase.rpc('match_jira_tickets', {
  query_embedding: embedding,
  match_threshold: 0.7,
  match_count: 5
});

// Test Git commit search  
const commitResults = await supabase.rpc('search_git_commits_semantic', {
  query_embedding: embedding,
  repository_filter: 'aoma-mesh-mcp',
  match_threshold: 0.7,
  match_count: 5
});
```

## 📊 Expected Results

- **JIRA Scraping**: 100-500 new tickets per run (incremental)
- **Git Scraping**: 1000+ commits + source files per repository
- **Embeddings**: Generated for all content using OpenAI text-embedding-3-small
- **Search Quality**: 0.7+ similarity scores for relevant results

Ready for production SOTA semantic search across JIRA tickets, Git commits, and source code! 🚀
