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
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    restoreMocks: true,
  },
})
