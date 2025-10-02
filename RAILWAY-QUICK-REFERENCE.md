# 🚀 Railway Deployment - Quick Reference Card

## Current Status

✅ **HEALTHY** | Version: 2.7.0 | URL: https://luminous-dedication-production.up.railway.app

---

## Quick Commands

### Health Checks
```bash
# Full smoke test
pnpm run smoke:remote

# Just health
pnpm run remote:health

# Just tools
pnpm run remote:tools

# Direct curl
curl https://luminous-dedication-production.up.railway.app/health
```

### Deploy Latest Code
```bash
# Interactive helper (recommended)
./trigger-railway-deploy.sh

# Manual trigger
git commit --allow-empty -m "chore: trigger deployment"
git push origin main
```

### After Deployment
```bash
# Wait 2-3 minutes, then:
pnpm run smoke:remote
```

---

## Test Results

| Check | Status | Notes |
|-------|--------|-------|
| Health | ✅ PASS | All services connected |
| RPC | ✅ PASS | JSON-RPC working |
| Tools | ✅ PASS | 19/19 available |
| Services | ✅ PASS | OpenAI, Supabase, Vector |
| Performance | ✅ PASS | 0 failures, 100% success |

---

## Available Tools (19)

**Enterprise Intelligence**: query_aoma_knowledge, search_jira_tickets, get_jira_ticket_count, search_outlook_emails

**Code & Dev**: search_git_commits, search_code_files, analyze_development_context

**Swarm**: swarm_analyze_cross_vector, swarm_agent_handoff, swarm_context_engineering

**Analytics**: generate_failure_heatmap, analyze_performance_metrics, build_predictive_model

**Observability**: get_langsmith_metrics, get_trace_data, configure_tracing, get_system_health, get_server_capabilities, get_server_introspection

---

## URLs

- **Production**: https://luminous-dedication-production.up.railway.app
- **Health**: /health
- **RPC**: /rpc
- **Metrics**: /metrics

---

## Performance

- Uptime: ~9.4 days
- Success Rate: 100%
- Avg Response: 9.7s
- OpenAI: 754ms
- Supabase: 93ms

---

## Recent Changes (Not Deployed Yet)

⭐ **Performance**: Direct vector store API (2-5x faster)  
🔧 **CI/CD**: Improved smoke tests  
📝 **Docs**: Updated smoke test info

---

## Files

- `DEPLOYMENT-TEST-REPORT.md` - Full test results
- `DEPLOYMENT-SUMMARY.md` - Summary & recommendations
- `TEST-AND-DEPLOY-COMPLETE.md` - Complete overview
- `verify-latest-deployment.sh` - Test script
- `trigger-railway-deploy.sh` - Deploy helper

---

## Help

**Issue?** Check `/health` endpoint first  
**Deploy?** Run `./trigger-railway-deploy.sh`  
**Verify?** Run `pnpm run smoke:remote`  

---

✅ All systems operational | Last tested: Oct 2, 2025
