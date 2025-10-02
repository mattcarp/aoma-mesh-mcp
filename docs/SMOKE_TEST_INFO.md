# Remote Smoke Test Information

## What Does It Do?

The smoke test checks if the Railway production deployment is healthy and responsive.

### Tests Performed

1. **Health Check** (`scripts/remote-health.ts`)
   - Hits `/health` endpoint on Railway
   - Verifies OpenAI, Supabase, and Vector Store are accessible
   - Checks response time metrics

2. **Tools Check** (`scripts/remote-tools.ts`)  
   - Verifies MCP tools are registered and callable
   - Tests basic tool functionality

### When It Runs

- ✅ **On push to main** - Verifies deployment didn't break anything
- ✅ **Manual trigger** - Can run via GitHub Actions UI
- ❌ **Hourly schedule** - **DISABLED** (was causing constant failures)

## Why Was Hourly Schedule Disabled?

### The Problem

The hourly smoke test was **failing constantly** because:

1. **Lockfile sync issues** - GitHub Actions cache had old workflow version
2. **Railway cold starts** - Free tier sleeps after inactivity, causing timeout failures
3. **Spam failure emails** - Sending failure emails every hour

### Failure Pattern

```
09:05 UTC - FAIL (frozen-lockfile)
08:06 UTC - FAIL (frozen-lockfile)  
07:05 UTC - FAIL (frozen-lockfile)
06:06 UTC - FAIL (frozen-lockfile)
...every hour
```

### Why It's Not Needed

**Railway has its own monitoring:**
- Health checks every few minutes
- Automatic restarts on failures
- Deployment status in dashboard

**We have better monitoring:**
- Push-triggered smoke tests (verify each deployment)
- Manual smoke tests (run on demand)
- Production `/health` endpoint (real-time status)

## Current Configuration

```yaml
on:
  workflow_dispatch:      # ✅ Manual trigger
  push:
    branches:
      - main             # ✅ Auto-run on deploy
  # schedule:            # ❌ DISABLED
  #   - cron: '0 * * * *'
```

## When To Use Smoke Tests

### ✅ Good Uses

1. **After deployment** - Verify Railway picked up changes
2. **Before announcing features** - Confirm production works
3. **Debugging** - Quick health check without Railway dashboard

### ❌ Bad Uses

1. **Continuous monitoring** - Use Railway's built-in monitoring
2. **Alerting** - Use proper monitoring service (not CI emails)
3. **Load testing** - Wrong tool for this

## How To Run Manually

### Via GitHub Actions UI

1. Go to: https://github.com/mattcarp/aoma-mesh-mcp/actions
2. Click "Remote Smoke Checks"
3. Click "Run workflow" → "Run workflow"

### Via CLI

```bash
cd ~/Documents/projects/aoma-mesh-mcp
gh workflow run remote-smoke.yml
```

### Via Local Scripts

```bash
cd ~/Documents/projects/aoma-mesh-mcp

# Health check only
pnpm run remote:health

# Tools check only  
pnpm run remote:tools

# Both
pnpm run smoke:remote
```

## What Success Looks Like

```
✓ Remote Health Check
  ✓ /health responds 200
  ✓ Services: openai ✓, supabase ✓, vectorStore ✓
  ✓ Response time: <2000ms

✓ Remote Tools Check
  ✓ Tools endpoint responds
  ✓ Expected tools present
  ✓ Tool schemas valid
```

## What Failure Looks Like

### Railway Down/Sleeping
```
✗ Remote Health Check
  Error: ECONNREFUSED or Timeout
  → Railway service is sleeping (cold start)
  → Wait 30s and retry
```

### Deployment Issue
```
✗ Remote Health Check
  ✓ /health responds 200
  ✗ Service: openai failed
  → Check Railway logs
  → Verify env vars set
```

## Re-enabling Hourly Schedule

If you want to re-enable hourly monitoring, fix these first:

1. **Use proper monitoring service** - Not GitHub Actions
2. **Configure alerts properly** - Not email spam
3. **Handle cold starts** - Retry logic with longer timeouts
4. **Fix lockfile issues** - Ensure CI cache is cleared

Then uncomment in `.github/workflows/remote-smoke.yml`:
```yaml
schedule:
  - cron: '0 * * * *'  # hourly
```

## Better Alternatives for Monitoring

### For Production Monitoring

1. **Uptime Robot** - Free tier, proper alerting
2. **Better Uptime** - Status pages + monitoring
3. **Railway Monitoring** - Built-in, already working

### For Deployment Verification

1. **Push-triggered smoke tests** - Already enabled ✅
2. **Railway deployment webhooks** - Notify on deploy
3. **Manual verification** - Quick health check after deploy

## Conclusion

**Hourly smoke tests were causing more problems than they solved.**

The push-triggered smoke test is sufficient to verify each deployment works. Railway's built-in monitoring handles ongoing health checks.

**Status: Disabled hourly schedule, keeping push and manual triggers only.**
