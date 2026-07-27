// Components and hooks import `services` and never touch mock data or fetch()
// directly:
//
//   components / hooks → services.engine.<method>() → live | mock | offline impl
//
// ─── Service selection ───────────────────────────────────────────────────────
// The implementation is chosen from the RUNTIME configuration resolved on the
// server (see config/runtime.ts and config/runtime.server.ts) — not from
// build-time constants, and never from whether Next is running under `next dev`
// or `next start`. That distinction was the root cause of a production incident
// in which a dev-server deploy silently served mock trading data.
//
// Three outcomes, all explicit:
//   live    — talk to the engine.
//   mock    — synthetic data. Chosen only when asked for explicitly, or by
//             `auto` in a non-production environment. Never silent: it is
//             announced on the console and banner-flagged in the UI.
//   offline — configured for real data, backend unreachable, environment is
//             production. Every read rejects so the UI shows an honest Engine
//             Offline state rather than fabricated positions and P&L.

import { readRuntimeConfig, isMockPermitted } from '@/config/runtime'
import { mockServices } from './mock'
import { LiveEngineService } from './live'
import { createOfflineEngineService } from './offline'
import type { ServiceRegistry } from './interfaces'
import { diagnostics } from '@/lib/diagnostics'

const runtime = readRuntimeConfig()

// Record mode and base URL as early as possible so the diagnostics panel can
// display accurate state even before the first request leaves the browser.
diagnostics.init(runtime.mode, runtime.baseUrl)

function resolveServices(): ServiceRegistry {
  if (runtime.mode === 'live') {
    diagnostics.setRegistry('LiveEngineService')
    if (runtime.environment === 'development') {
      console.info(`[LIVE] ServiceRegistry: LiveEngineService — ${runtime.reason}`)
    }
    return { engine: new LiveEngineService() }
  }

  if (runtime.mode === 'offline') {
    diagnostics.setRegistry('OfflineEngineService')
    // Always an error: production is configured for real data and cannot get it.
    console.error(
      `[OFFLINE] ServiceRegistry: engine unreachable — ${runtime.reason} ` +
      `(base: ${runtime.baseUrl}). Showing Engine Offline; mock data is ` +
      'deliberately NOT substituted in production.',
    )
    return { engine: createOfflineEngineService(runtime.reason) }
  }

  // Last line of defence. The server already refuses to boot an illegal
  // combination, and the injected config is frozen — but the mock registry is
  // the one place fabricated trading data can actually enter the app, so it
  // re-checks the policy itself rather than trusting that upstream held.
  // Anything reaching here without permission degrades to Offline, never mock.
  if (!isMockPermitted(runtime.deployment)) {
    diagnostics.setRegistry('OfflineEngineService')
    console.error(
      `[FATAL] ServiceRegistry: mock data requested under PROBEX_DEPLOYMENT=` +
      `"${runtime.deployment}", which forbids it. Refusing to initialise ` +
      'MockEngineService; showing Engine Offline instead. This deployment is ' +
      'misconfigured — see PROBEX_API_MODE / PROBEX_DEPLOYMENT.',
    )
    return {
      engine: createOfflineEngineService(
        `mock data is forbidden in ${runtime.deployment} deployments`,
      ),
    }
  }

  diagnostics.setRegistry('MockEngineService')
  // ALWAYS warn — deliberately not gated on environment. Mock renders a
  // fully-populated dashboard indistinguishable from a healthy live one, so a
  // deploy that lands here must never do so quietly.
  console.warn(
    `[MOCK] ServiceRegistry: MockEngineService active — serving FAKE data. ${runtime.reason} ` +
    `(requested: "${runtime.requestedMode}", environment: "${runtime.environment}", ` +
    `base: "${runtime.baseUrl}")`,
  )
  return mockServices
}

export const services: ServiceRegistry = resolveServices()

export * from './response'
export * from './interfaces'
