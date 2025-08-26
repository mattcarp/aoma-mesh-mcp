# 🚀 Render Deployment Guide for AOMA Mesh MCP

## Zero-Downtime Migration from Railway to Render

### Prerequisites
- Render account with payment method configured
- Access to environment variables from Railway deployment
- Client app already running on Render

---

## 📋 Deployment Steps

### 1. Connect GitHub Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your `aoma-mesh-mcp` GitHub repository
4. Render will detect the `render.yaml` file

### 2. Configure Environment Variables
Before deploying, set all secret environment variables in Render:

1. In Render Dashboard → your new service → "Environment"
2. Add these variables (copy values from Railway):

```bash
# Required API Keys
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
LANGCHAIN_API_KEY=ls-...

# AOMA/Jira/Outlook configs
AOMA_API_URL=https://...
AOMA_API_KEY=...
JIRA_BASE_URL=https://...
JIRA_EMAIL=...
JIRA_API_TOKEN=...
JIRA_PROJECT_KEY=...
OUTLOOK_CLIENT_ID=...
OUTLOOK_CLIENT_SECRET=...
OUTLOOK_TENANT_ID=...
OUTLOOK_USER_EMAIL=...
```

### 3. Deploy the Service
1. Click "Apply" to create the blueprint
2. Render will build and deploy automatically
3. Monitor logs for successful startup

### 4. Test Internal Connectivity
Since this is a **private service**, it's only accessible internally:

**Internal URL:** `http://aoma-mesh-mcp:10000`

Test from your client app:
```javascript
// In your client app on Render
const MCP_URL = process.env.NODE_ENV === 'production' 
  ? 'http://aoma-mesh-mcp:10000'  // Internal Render URL
  : 'http://localhost:3000';       // Local dev

// Test health endpoint
const health = await fetch(`${MCP_URL}/health`);
console.log(await health.json());
```

### 5. Gradual Migration
1. **Week 1:** Keep Railway as primary, test Render in parallel
2. **Week 2:** Switch 50% of traffic to Render (if using load balancer)
3. **Week 3:** Full switch to Render
4. **Week 4:** Decommission Railway

---

## 🔍 Validation Checklist

### Health Checks
```bash
# From within Render network (your client app)
curl http://aoma-mesh-mcp:10000/health
curl http://aoma-mesh-mcp:10000/rpc -X POST \
  -H "Content-Type: application/json" \
  -d '{"method":"get_server_capabilities","params":{}}'
```

### Expected Responses
- `/health`: `{"status":"healthy","version":"0.1.0"}`
- `/rpc` capabilities: List of 19+ tools

### Monitoring
- Check Render logs for errors
- Verify LangSmith traces appearing
- Monitor memory usage (should stay under 512MB)

---

## 🚨 Troubleshooting

### Common Issues

**1. Service won't start**
- Check all required env vars are set
- Verify Dockerfile builds locally
- Check logs for missing dependencies

**2. Client can't connect**
- Ensure both services are in same Render region
- Use `http://` not `https://` for internal URLs
- Service name must match exactly

**3. High memory usage**
- Normal: 200-300MB at idle
- If >450MB, check for memory leaks
- Consider upgrading to 1GB plan if needed

---

## 💰 Cost Breakdown

| Service | Type | Plan | Cost |
|---------|------|------|------|
| Your Client App | Web Service | Starter | $7/month |
| AOMA MCP Server | Private Service | Starter | $7/month |
| **Total** | | | **$14/month** |

### Savings vs Alternatives:
- Railway: $10-15/month (usage-based)
- AWS Fargate: $30-50/month
- Heroku: $25/month minimum

---

## 🔄 Rollback Plan

If issues arise, instantly rollback:

1. **Client Side:** Point back to Railway
   ```javascript
   const MCP_URL = 'https://aoma-mesh-mcp-production.up.railway.app';
   ```

2. **Keep Railway Running:** Don't delete until 30 days stable

3. **DNS Failover:** Consider using Cloudflare for instant switching

---

## 📊 Performance Benefits

### Latency Improvements (Same Region)
- **Before (Railway):** 20-50ms per call
- **After (Render Internal):** 1-2ms per call
- **10x faster** for multi-tool workflows

### Network Benefits
- Zero egress fees for internal traffic
- No public internet exposure
- No SSL/TLS overhead

---

## ✅ Success Metrics

After 1 week on Render, verify:
- [ ] Zero downtime during migration
- [ ] Response times <5ms for internal calls
- [ ] All 19 MCP tools functioning
- [ ] LangSmith traces working
- [ ] Memory usage stable <450MB
- [ ] No cold starts or spin-downs
- [ ] Client app performance improved

---

## 🎯 Next Steps

1. **Immediate:** Set environment variables in Render
2. **Today:** Deploy and test health endpoint
3. **This Week:** Update client to use internal URL
4. **Next Week:** Monitor and optimize
5. **Month End:** Decommission Railway if stable
