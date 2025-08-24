# AOMA Mesh MCP Verification for SIAM

Minimal, reusable health verification you can call from the SIAM project.

## What it checks
- **/health** returns 200 and `{ status: "healthy" }`.
- **/metrics** returns 200 and includes numeric `uptime` and `totalRequests`.

## Prereqs
- AOMA Mesh MCP server running (defaults to `PORT=3337`).
- Node 22+ and pnpm.

## One‑liner (from SIAM repo)
Run this from `~/Documents/projects/siam` (adjust path if needed):

```bash
AOMA_URL=http://127.0.0.1:3337 pnpm --prefix ../aoma-mesh-mcp run verify:aoma
```

- Exit **0** = OK
- Exit **1** = verification failed

## Alternative: direct tsx call
```bash
AOMA_URL=http://127.0.0.1:3337 pnpm dlx tsx ../aoma-mesh-mcp/scripts/verify-aoma-health.ts
```

## Curl checks (quick manual)
```bash
curl -fsS http://127.0.0.1:3337/health | jq .
curl -fsS http://127.0.0.1:3337/metrics | jq .
```

## Makefile target example (SIAM)
In SIAM's `Makefile`:
```make
verify-aoma:
	AOMA_URL?=http://127.0.0.1:3337 \
	pnpm --prefix ../aoma-mesh-mcp run verify:aoma
```

Then:
```bash
make verify-aoma
```

## CI usage (GitHub Actions)
```yaml
- name: Verify AOMA Mesh MCP
  env:
    AOMA_URL: http://127.0.0.1:3337
  run: pnpm --prefix ../aoma-mesh-mcp run verify:aoma
```

## Notes
- Endpoint implementations live in `src/aoma-mesh-server.ts` (`setupHttpEndpoints()` defines `/health` and `/metrics`).
- You can override host/port by exporting `AOMA_URL`.
- Does not require OpenAI; server uses lazy OpenAI init, so health check is fast and robust.
