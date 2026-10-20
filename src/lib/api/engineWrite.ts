// Every dashboard write to the engine goes through the dashboard's own server route
// (/dashboard/api/engine/<path>/), which checks the login session and signs a
// short-lived operator token server-side. The browser never holds a key or a token,
// and never POSTs to the engine's /api directly.

import { BASE_PATH } from '@/config/constants'

export class EngineWriteError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

/** POST an engine write route (path below /api, e.g. '/execution/emergency-stop'). */
export async function engineWrite<T>(enginePath: string, body?: unknown): Promise<T> {
  const path = enginePath.replace(/^\/+|\/+$/g, '')
  const res = await fetch(`${BASE_PATH}/api/engine/${path}/`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new EngineWriteError(res.status, (data && (data.detail || data.error)) || `engine write failed (${res.status})`)
  }
  return data as T
}
