#!/usr/bin/env tsx
/* eslint-disable n/no-process-exit */

const BASE = process.env.RAILWAY_BASE_URL || 'https://luminous-dedication-production.up.railway.app';
const EXPECTED = [
  'get_system_health',
  'get_server_capabilities',
  'analyze_development_context',
  'query_aoma_knowledge',
  'search_code_files',
  'search_git_commits',
  'search_jira_tickets',
  'get_jira_ticket_count',
  'search_outlook_emails',
  'swarm_analyze_cross_vector'
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

    // The /rpc endpoint returns MCP CallToolResult with content[0].text containing JSON
    const capsText = json?.result?.content?.[0]?.text;
    if (typeof capsText !== 'string' || capsText.length === 0) {
      console.error('[remote-tools] Capabilities payload missing in result.content[0].text');
      // console.error(JSON.stringify(json, null, 2));
      process.exit(1);
    }

    let caps: any;
    try {
      caps = JSON.parse(capsText);
    } catch {
      console.error('[remote-tools] Capabilities text is not valid JSON');
      // console.error(capsText);
      process.exit(1);
    }

    // Support both shapes:
    // 1) { tools: { total: number, list: Tool[] } }
    // 2) { tools: Tool[] }
    const toolsArray = Array.isArray(caps?.tools)
      ? caps.tools
      : (Array.isArray(caps?.tools?.list) ? caps.tools.list : []);
    if (!Array.isArray(toolsArray) || toolsArray.length === 0) {
      console.error('[remote-tools] No tools found in capabilities');
      // console.error(JSON.stringify(caps, null, 2));
      process.exit(1);
    }

    const names = toolsArray.map((t: any) => t?.name).filter(Boolean);
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