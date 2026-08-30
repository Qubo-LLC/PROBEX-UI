// Next.js startup hook. `register()` runs ONCE per server process, before any
// request is handled — the only place in a Next app where a configuration error
// can genuinely abort startup rather than degrade a page render.
//
// ─── Why this file is a thin shim ────────────────────────────────────────────
// Next compiles the instrumentation hook for BOTH server runtimes, so this
// module lands in the Edge bundle as well as the Node one. Turbopack scans the
// *original source* of every module in the Edge graph for Node-only APIs
// (warnForEdgeRuntime) and does so before any dead-code elimination — so a
// `process.env.NEXT_RUNTIME` guard around the call does NOT exempt it. A
// runtime guard skips execution, not parsing.
//
// With `process.exit` inlined here, `next dev --turbopack` reported it on every
// Edge compile, and `next build --turbopack` reported it too (both verified).
// The webpack builder happened to minify the dead branch away before the scan
// and stayed silent — which made this look like a dev-only annoyance right up
// until Next 16 makes Turbopack the default builder. Correctness here should
// not rest on a minifier incidentally reaching the code first.
//
// The enforcement lives in ./instrumentation.node.ts instead, reached only
// through the conditional dynamic import below. Next replaces
// `process.env.NEXT_RUNTIME` with a per-compilation literal (build/define-env),
// so the Edge build folds this to `'edge' === 'nodejs'` and drops the whole
// block — import included — leaving `register()` genuinely empty there
// (verified: .next/server/edge-instrumentation.js compiles to `async(){}`).
// The positive `=== 'nodejs'` form is what enables that fold; an early `return`
// on the negative case leaves the import statement reachable to the bundler.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { enforceDeploymentPolicy } = await import('./instrumentation.node')
    enforceDeploymentPolicy()
  }
}
