/**
 * Minimal verification script for AOMA Mesh MCP HTTP endpoints
 * - Checks /health and /metrics
 * - Exits with non-zero code if any check fails
 *
 * Usage:
 *   AOMA_URL=http://localhost:3337 pnpm exec tsx scripts/verify-aoma-health.ts
 *   # or just: pnpm run verify:aoma (after we add a package.json script)
 */

const baseUrl = process.env.AOMA_URL || `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || '3337'}`;

function log(title: string, obj: unknown) {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${title} ===`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(obj, null, 2));
}

async function checkHealth(): Promise<boolean> {
  const res = await fetch(`${baseUrl}/health`, { method: 'GET' });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`/health returned HTTP ${res.status}`);
    return false;
  }
  const json: any = await res.json();
  log('Health', json);
  return json && json.status === 'healthy';
}

async function checkMetrics(): Promise<boolean> {
  const res = await fetch(`${baseUrl}/metrics`, { method: 'GET' });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`/metrics returned HTTP ${res.status}`);
    return false;
  }
  const json: any = await res.json();
  log('Metrics', json);
  return typeof json?.uptime === 'number' && typeof json?.totalRequests === 'number';
}

(async () => {
  // eslint-disable-next-line no-console
  console.log(`Verifying AOMA Mesh MCP at ${baseUrl}`);
  const okHealth = await checkHealth();
  const okMetrics = await checkMetrics();

  if (!okHealth || !okMetrics) {
    // eslint-disable-next-line no-console
    console.error('Verification FAILED');
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log('Verification OK');
})();
