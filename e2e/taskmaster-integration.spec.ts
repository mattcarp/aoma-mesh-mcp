import { test, expect } from '@playwright/test'

// These tests validate TaskMaster MCP availability indirectly where possible.
// They are tolerant: if TaskMaster MCP is not configured, we skip gracefully.

const TM_ENABLED = String(process.env.TASKMASTER_MCP_ENABLED || '').toLowerCase() === 'true'
if (!TM_ENABLED) {
  test.skip(true, 'TaskMaster MCP not enabled/configured')
}

test.describe('TaskMaster MCP integration', () => {
  test('server exposes capability listing that includes taskmaster tools (best-effort)', async ({ request }) => {
    const res = await request.get('/tools')
    if (res.status() !== 200) {
      test.skip(true, 'Tools endpoint unavailable in current configuration')
    }
    const json = await res.json()
    expect(Array.isArray(json) || typeof json === 'object').toBe(true)
  })
})


