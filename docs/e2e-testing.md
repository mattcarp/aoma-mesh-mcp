## E2E Testing Guide

This project uses Playwright for end-to-end tests. Tests are organized by functional areas and can be run independently.

### Structure

- `e2e/health.spec.ts`: Smoke health check and metrics basics
- `e2e/metrics.spec.ts`: JSON metrics and Prometheus compatibility
- `e2e/auth.spec.ts`: AuthN/AuthZ and security headers
- `e2e/http-endpoints.spec.ts`: REST endpoints coverage
- `e2e/tools.spec.ts`: Tool execution flows
- `e2e/sse-transport.spec.ts`: SSE MCP transport (gated by `ENABLE_SSE_TRANSPORT`)
- `e2e/cancellation.spec.ts`: Request abort and timeout behavior
- `e2e/prometheus-metrics.spec.ts`: Prometheus exposition (gated by `ENABLE_PROMETHEUS`)
- `e2e/taskmaster-integration.spec.ts`: TaskMaster MCP integration (gated by `TASKMASTER_MCP_ENABLED`)
- `e2e/utils/test-helpers.ts`: Shared helpers
- `e2e/config/test-env.ts`: Environment requirements matrix

### Environment

Create a `.env.local` for local testing, or set env in CI. Sensitive values should never be committed.

Common variables:

- `OPENAI_API_KEY` (tools)
- `AOMA_ASSISTANT_ID` (tools)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (health/tools)
- `MCP_SERVER_API_KEY` (auth)
- `ENABLE_SSE_TRANSPORT=true` (to enable SSE tests)
- `ENABLE_PROMETHEUS=true` (to enable Prometheus tests)
- `TASKMASTER_MCP_ENABLED=true` (to enable TaskMaster tests)

Use `e2e/config/test-env.ts` to see which tests require which env vars.

### Running tests

All tests:

```bash
pnpm run e2e
```

Specific projects:

```bash
pnpm run e2e:auth
pnpm run e2e:http
pnpm run e2e:tools
pnpm run e2e:sse
pnpm run e2e:metrics
pnpm run e2e:taskmaster
```

Debug/headed:

```bash
pnpm run e2e:headed
PWDEBUG=1 pnpm run e2e:debug
```

CI-friendly JUnit output:

```bash
pnpm run e2e:ci
```

### Notes

- Tests are tolerant of environment gating. If a feature is disabled, the corresponding suite will skip.
- Correlation IDs are passed via `x-correlation-id` and echoed by the server when enabled.
- Security headers are asserted only when `ENABLE_HELMET=true`.
- Rate limiting assertions only run when `ENABLE_RATE_LIMIT=true`.


