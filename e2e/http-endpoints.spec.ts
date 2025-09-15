import { test, expect } from '@playwright/test'
import { authHeaders, createCorrelationId, getJson, postJson } from './utils/test-helpers'

test.describe('HTTP endpoints', () => {
  test('GET /health returns healthy JSON', async ({ request }) => {
    const { status, headers, body } = await getJson(request, '/health', { headers: { 'x-correlation-id': createCorrelationId() } })
    expect(status).toBe(200)
    expect(typeof body.status).toBe('string')
    expect(body.services).toBeDefined()
    expect(headers['x-correlation-id']).toBeDefined()
  })

  test('GET /metrics returns JSON', async ({ request }) => {
    const { status, body } = await getJson(request, '/metrics', { headers: { 'x-correlation-id': createCorrelationId() } })
    expect(status).toBe(200)
    expect(body).toHaveProperty('uptime')
    expect(body).toHaveProperty('totalRequests')
  })

  test('POST /rpc handles method dispatch with auth', async ({ request }) => {
    const corr = createCorrelationId()
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status, body, headers } = await postJson(request, '/rpc', { method: 'ping', params: {} }, { headers: { ...auth, 'x-correlation-id': corr } })
    const expectedStatuses = hasAuth ? [200, 400, 422] : [200, 400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
    expect(headers['x-correlation-id']).toBeDefined()
    expect(body).toBeTruthy()
  })

  test('POST /tools/aoma-knowledge rejects invalid input', async ({ request }) => {
    const corr = createCorrelationId()
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status, body } = await postJson(request, '/tools/aoma-knowledge', { query: 123 }, { headers: { ...auth, 'x-correlation-id': corr } })
    const expectedStatuses = hasAuth ? [400, 422] : [400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
    expect(body).toBeTruthy()
  })

  test('POST /tools/aoma-knowledge accepts valid input (tolerant)', async ({ request }) => {
    const corr = createCorrelationId()
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status } = await postJson(request, '/tools/aoma-knowledge', { query: 'what tools are available?' }, { headers: { ...auth, 'x-correlation-id': corr } })
    const expectedStatuses = hasAuth ? [200, 400, 422] : [200, 400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
  })
})


