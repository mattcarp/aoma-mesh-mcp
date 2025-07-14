# Simple AOMA MCP Setup

## What You Actually Need

Just **2 simple scraping scripts**:

1. **JIRA Scraper** - Fetch tickets from Sony Music JIRA API
2. **Git Scraper** - Fetch commits from GitHub/GitLab APIs (no cloning!)

## Quick Setup

### 1. Add to .env:
```bash
# Required
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JIRA (Sony Music)
JIRA_USERNAME=your.email@sonymusic.com
JIRA_PASSWORD=your_password

# Git (Optional - for private repos)
GITHUB_TOKEN=ghp_...
```

### 2. Run Scripts:

**JIRA Scraping** (requires VPN + 2FA):
```bash
npx tsx jira-scraper.ts test           # Test connection
npx tsx jira-scraper.ts incremental    # Get new tickets
```

**Git Scraping** (no VPN needed):
```bash
npx tsx simple-git-scraper.ts microsoft TypeScript 500
npx tsx simple-git-scraper.ts facebook react 1000
```

### 3. Start MCP Server:
```bash
npx tsx start-mcp-server.ts
```

## That's It!

- JIRA scraper gets tickets from Sony Music JIRA API
- Git scraper gets commits from GitHub API  
- Both generate embeddings and store in Supabase
- MCP server provides semantic search across both

No repository cloning, no complex file processing - just simple API scraping!
