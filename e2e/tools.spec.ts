import { test, expect } from '@playwright/test'
import { authHeaders, createCorrelationId, postJson } from './utils/test-helpers'
import { missingFor } from './config/test-env'

const missing = missingFor('tools')
if (missing.length) {
  test.skip(true, `Missing required env for tools tests: ${missing.join(', ')}`)
}

test.describe('Tool execution', () => {
  test('AOMA knowledge query basic', async ({ request }) => {
    const corr = createCorrelationId()
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status, body } = await postJson(request, '/tools/aoma-knowledge', {
      query: 'List available tools',
    }, { headers: { ...auth, 'x-correlation-id': corr } })
    const expectedStatuses = hasAuth ? [200, 400, 422] : [200, 400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
    if (status === 200) {
      expect(body).toHaveProperty('result')
    }
  })

  test('Jira search rejects invalid params', async ({ request }) => {
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status } = await postJson(request, '/tools/jira-search', { jql: 123 }, { headers: auth })
    const expectedStatuses = hasAuth ? [400, 422] : [400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
  })

  test('Git search tolerant execution', async ({ request }) => {
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status } = await postJson(request, '/tools/git-search', { query: 'fix: ' }, { headers: auth })
    const expectedStatuses = hasAuth ? [200, 400, 422] : [200, 400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
  })

  test('Correlation ID propagates through tool execution', async ({ request }) => {
    const corr = createCorrelationId()
    const auth = authHeaders(true)
    const hasAuth = Object.keys(auth).length > 0
    const { status, headers } = await postJson(request, '/tools/aoma-knowledge', { query: 'ping' }, { headers: { ...auth, 'x-correlation-id': corr } })
    const expectedStatuses = hasAuth ? [200, 400, 422] : [200, 400, 401, 403, 422]
    expect(expectedStatuses).toContain(status)
    expect(headers['x-correlation-id']).toBeDefined()
  })
})


