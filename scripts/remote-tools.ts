#!/usr/bin/env tsx
/* eslint-disable n/no-process-exit */
import fetch from 'node-fetch';

const BASE = process.env.RAILWAY_BASE_URL || 'https://luminous-dedication-production.up.railway.app';
const EXPECTED = [
  'get_system_health',
  'get_server_capabilities',
  'development_context',
  'aoma_knowledge',
  'code_search',
  'git_search',
  'jira_search',
  'jira_count',
  'outlook_search',
  'swarm_analysis'
];

(async () => {
  const url = `${BASE}/rpc`;
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'get_server_capabilities', arguments: {} }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await res.text();

    if (!res.ok) {
      console.error(`[remote-tools] HTTP ${res.status}\n${text}`);
      process.exit(1);
    }

    let json: any;
    try {
      json = JSON.parse(text);
    } catch {
      console.error('[remote-tools] RPC payload not JSON');
      // console.error(text);
      process.exit(1);
    }

    const tools = json?.result?.tools ?? json?.result?.capabilities?.tools ?? json?.result?.data?.tools ?? [];
    if (!Array.isArray(tools) || tools.length === 0) {
      console.error('[remote-tools] No tools found in response');
      // console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }

    const names = tools.map((t: any) => t?.name).filter(Boolean);
    const missing = EXPECTED.filter(n => !names.includes(n));

    console.log(`[remote-tools] available=${names.length}`);
    console.log(names.sort().join(', '));

    if (missing.length > 0) {
      console.error(`[remote-tools] Missing expected tools: ${missing.join(', ')}`);
      process.exit(1);
    }

    console.log('[remote-tools] OK - expected tool set present');
    process.exit(0);
  } catch (e: any) {
    console.error(`[remote-tools] Error: ${e?.message || String(e)}`);
    process.exit(1);
  }
})();