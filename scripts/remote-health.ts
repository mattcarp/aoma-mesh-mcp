#!/usr/bin/env tsx
/* eslint-disable n/no-process-exit */

const BASE = process.env.RAILWAY_BASE_URL || 'https://luminous-dedication-production.up.railway.app';

(async () => {
  const url = `${BASE}/health`;
  try {
    const res = await fetch(url, { method: 'GET' });
    const text = await res.text();

    if (!res.ok) {
      console.error(`[remote-health] HTTP ${res.status}\n${text}`);
      process.exit(1);
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[remote-health] Health payload not JSON');
      // console.error(text);
      process.exit(1);
    }

    const ok = json?.status === 'ok' || json?.status === 'healthy' || json?.ok === true;
    if (!ok) {
      console.error('[remote-health] Health status not ok:', JSON.stringify(json));
      process.exit(1);
    }

    const version = json?.version ?? json?.metrics?.version ?? json?.data?.version ?? 'unknown';
    const uptime = json?.uptime ?? json?.metrics?.uptime ?? json?.data?.uptime ?? 'unknown';
    console.log(`[remote-health] OK - ${url}`);
    console.log(`version=${version} uptime=${uptime}`);
    process.exit(0);
  } catch (e: any) {
    console.error(`[remote-health] Error: ${e?.message || String(e)}`);
    process.exit(1);
  }
})();