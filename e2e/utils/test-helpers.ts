import { APIRequestContext, expect, test } from '@playwright/test'
import { v4 as uuidv4 } from 'uuid'

export function createCorrelationId(): string {
  return `e2e-${uuidv4()}`
}

export function missingEnv(keys: string[]): string[] {
  return keys.filter((k) => !process.env[k] || String(process.env[k]).trim() === '')
}

export function skipIfMissingEnv(keys: string[], reason?: string) {
  const missing = missingEnv(keys)
  if (missing.length) {
    test.skip(true, reason || `Missing required env vars: ${missing.join(', ')}`)
  }
}

export function authHeaders(valid = true): Record<string, string> {
  // Flexible: try multiple common env keys; never hardcode secrets
  const key = process.env.AOMA_API_KEY || process.env.API_KEY || process.env.MCP_SERVER_API_KEY || ''
  const headerName = process.env.API_KEY_HEADER || 'x-api-key'
  if (!valid) return { [headerName]: 'invalid-test-key' }
  return key ? { [headerName]: key } : {}
}

export async function getJson<T = any>(
  request: APIRequestContext,
  path: string,
  init: Parameters<APIRequestContext['get']>[1] = {}
): Promise<{ status: number; headers: Record<string, string>; body: T }>
{
  const res = await request.get(path, init)
  const headers = res.headers()
  const status = res.status()
  let body: any
  try {
    body = await res.json()
  } catch {
    body = {} as T
  }
  return { status, headers, body }
}

export async function postJson<T = any>(
  request: APIRequestContext,
  path: string,
  data: any,
  init: Parameters<APIRequestContext['post']>[1] = {}
): Promise<{ status: number; headers: Record<string, string>; body: T }>
{
  const res = await request.post(path, {
    ...init,
    data,
    headers: {
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const headers = res.headers()
  const status = res.status()
  let body: any
  try {
    body = await res.json()
  } catch {
    body = {} as T
  }
  return { status, headers, body }
}

export function expectSecurityHeaders(headers: Record<string, string>) {
  // Only assert when helmet is enabled; tolerate absence otherwise
  if (String(process.env.ENABLE_HELMET || '').toLowerCase() === 'true') {
    expect(headers['x-dns-prefetch-control']).toBeDefined()
    expect(headers['x-frame-options']).toBeDefined()
    expect(headers['x-content-type-options']).toBeDefined()
    // Content-Security-Policy may vary; do not over-constrain
  }
}

export function parsePrometheus(text: string): Record<string, number> {
  const metrics: Record<string, number> = {}
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    const parts = line.split(' ')
    const nameAndLabels = parts[0]
    const valueStr = parts[1]
    const value = Number(valueStr)
    if (!Number.isNaN(value)) metrics[nameAndLabels] = value
  }
  return metrics
}

export async function preflight(
  request: APIRequestContext,
  url: string,
  origin = 'https://example.com'
) {
  const res = await request.fetch(url, {
    method: 'OPTIONS',
    headers: {
      'access-control-request-method': 'POST',
      origin,
    },
  })
  return res
}

export function sseEnabled(): boolean {
  return String(process.env.ENABLE_SSE_TRANSPORT || '').toLowerCase() === 'true'
}

export function prometheusEnabled(): boolean {
  return String(process.env.ENABLE_PROMETHEUS || '').toLowerCase() === 'true'
}

export function rateLimitEnabled(): boolean {
  return String(process.env.ENABLE_RATE_LIMIT || '').toLowerCase() === 'true'
}


