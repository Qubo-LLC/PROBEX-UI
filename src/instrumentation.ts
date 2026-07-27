// Next.js startup hook. `register()` runs ONCE per server process, before any
// request is handled — the only place in a Next app where a configuration error
// can genuinely abort startup rather than degrade a page render.
//
// Its single job: refuse to boot a deployment whose declared policy forbids the
// requested engine mode. A dashboard that fabricates balances and trades is
// worse than a dashboard that is down, so an invalid configuration is fatal, not
// a warning.

import { assertDeploymentPolicy, readDeploymentPolicy } from '@/config/runtime.server'
import { normalizeApiMode, isKnownDeployment } from '@/config/runtime'

export async function register(): Promise<void> {
  // Only the Node.js server runtime resolves configuration; the edge runtime
  // never renders the root layout, so it has nothing to validate.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const raw        = process.env.PROBEX_DEPLOYMENT
  const deployment = readDeploymentPolicy()
  const mode       = normalizeApiMode(process.env.PROBEX_API_MODE ?? process.env.NEXT_PUBLIC_API_MODE)

  // A typo ('prod', 'dev') silently becomes the strict default. That is safe,
  // but silence would hide the mistake — so say so.
  if (raw !== undefined && raw.trim() !== '' && !isKnownDeployment(raw)) {
    console.warn(
      `[Probex] Unrecognised PROBEX_DEPLOYMENT="${raw}" — falling back to the ` +
      'strictest policy "production". Valid values: development, test, staging, production.',
    )
  }

  // On an illegal combination, exit the process explicitly rather than letting
  // the error merely propagate. Next absorbs a throw here: the server never
  // binds its port but the process stays alive — which PM2 and Kubernetes read
  // as "running", so nothing restarts and nothing alerts. A non-zero exit is
  // the only unambiguous signal to an orchestrator that this deploy is invalid.
  try {
    assertDeploymentPolicy()
  } catch (error) {
    console.error(`\n[Probex] FATAL CONFIGURATION ERROR\n\n${(error as Error).message}\n`)
    process.exit(1)
  }

  console.info(
    `[Probex] Deployment policy "${deployment}", engine mode "${mode}" — configuration valid.`,
  )
}
