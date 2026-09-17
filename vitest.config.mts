import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Test runner configuration.
//
// Scope is deliberately narrow: this covers the PURE contract, state-derivation
// and request-lifecycle logic that QUB-48 names, plus the write gate that
// QUB-49 requires. It does NOT stand up a fake engine. Every assertion here is
// about code this repository owns — no recorded backend payloads, no invented
// endpoint shapes, nothing that would quietly become a specification for a
// backend still being reworked.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Component tests render TSX. Vitest 5 transforms with oxc, which needs the
  // JSX runtime named explicitly; without this a .test.tsx file fails on its
  // first element. Kept minimal — no plugin, no React refresh.
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    restoreMocks: true,
    // The first test in a component file pays the cold transform of the
    // component tree (PerceptionArc pulls RadialGauge, Figure, the store).
    // Measured at 5–9s on a loaded Windows machine, against the 5s default —
    // a timeout on a test that passes on the next run is noise, not signal.
    testTimeout: 15_000,
  },
})
