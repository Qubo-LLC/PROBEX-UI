// Components and hooks import `services` and never touch mock data or fetch()
// directly. Flipping NEXT_PUBLIC_API_MODE (config/env.ts) between 'live' and
// 'mock' is the only change required to swap the engine implementation.
//
//   components / hooks → services.engine.<method>() → mock | live impl

import { env } from '@/config/env'
import { mockServices } from './mock'
import { LiveEngineService } from './live'
import type { ServiceRegistry } from './interfaces'
import { diagnostics } from '@/lib/diagnostics'

// Record mode and base URL as early as possible so the diagnostics panel can
// display accurate state even before the first request leaves the browser.
diagnostics.init(env.API_MODE, env.API_BASE_URL)

function resolveServices(): ServiceRegistry {
  if (env.API_MODE === 'live') {
    diagnostics.setRegistry('LiveEngineService')
    if (process.env.NODE_ENV === 'development') {
      console.info('[LIVE] ServiceRegistry: LiveEngineService instantiated')
    }
    return { engine: new LiveEngineService() }
  }
  diagnostics.setRegistry('MockEngineService')
  if (process.env.NODE_ENV === 'development') {
    console.info('[MOCK] ServiceRegistry: MockEngineService active')
  }
  return mockServices
}

export const services: ServiceRegistry = resolveServices()

export * from './response'
export * from './interfaces'
