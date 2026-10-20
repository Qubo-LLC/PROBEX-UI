#!/usr/bin/env node
// Fails the build if signing code, a secret's NAME, or a configured secret's VALUE
// reaches a client bundle (.next/static). Runs as `postbuild`. Never prints a value.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = join(process.cwd(), '.next', 'static')
if (!existsSync(root)) { console.error('check-client-bundle: no .next/static (run next build first)'); process.exit(1) }

const NAMES = ['qubo-engine-signing-v1', 'QUBO_JWT_KEYS', 'DASHBOARD_SESSION_SECRET', 'DASHBOARD_USERS', 'scryptSync', 'mintEngineToken']
// configured secret values (present when building on the VM), never printed
const values = []
for (const v of [process.env.DASHBOARD_SESSION_SECRET, ...(process.env.QUBO_JWT_KEYS ?? '').split(',').map((p) => p.split(':')[1])]) {
  if (v && v.length >= 16) values.push(v)
}

function files(dir) {
  return readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? files(p) : [p] })
}
const hits = []
for (const f of files(root).filter((f) => /\.(js|mjs|css|html|json)$/.test(f))) {
  const text = readFileSync(f, 'utf8')
  for (const n of NAMES) if (text.includes(n)) hits.push(`${f.slice(root.length + 1)}: ${n}`)
  if (values.some((v) => text.includes(v))) hits.push(`${f.slice(root.length + 1)}: a configured secret value`)
}
if (hits.length) {
  console.error('check-client-bundle: server-only material in client bundles:\n  ' + hits.join('\n  '))
  process.exit(1)
}
console.log(`check-client-bundle: ok (${files(root).length} client files scanned)`)
