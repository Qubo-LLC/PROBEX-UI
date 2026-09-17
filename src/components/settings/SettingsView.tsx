'use client'

// Settings — what this browser controls, and what the engine controls.
//
// ─── What was wrong (2026-09-16) ─────────────────────────────────────────────
// Eight sections behind a side nav. Four of them saved switches nothing read:
// five notification toggles with no delivery service and no consumer; a
// "Preferred mode — Autonomous / Hybrid / Manual" trading-mode switch that
// changed no behaviour anywhere; a "default market view" the Markets page
// never consulted; a "confirm manual trades" gate no order path checked; a
// display name "shown in the shell" that the shell never showed. Security and
// Sessions were rows of "Available in a future release" for an authentication
// service that does not exist. About declared, as constants, that this was a
// "Mock / Demo" build from 2026.06.26 — while the page beside it read the
// live engine. None of it was engine policy; all of it looked like control.
//
// ─── What this is ────────────────────────────────────────────────────────────
//   A  Preferences — kept in this browser, applied immediately: theme,
//      accessibility, and pointers to the two other browser-kept preferences
//      (starred markets, personal profit targets) that are set on their own
//      pages. USER PREFERENCE.
//   B  Engine policy — read-only. The engine publishes 24 parameters on
//      /api/config and an order policy on /api/execution/policy, and accepts
//      nothing back (405, allow: GET). The full ledgers live on Strategy,
//      Execution and System and are not repeated here; this indexes them.
//      ENGINE POLICY.
//   C  This deployment — dashboard version, data source, engine session,
//      health. Read at runtime, never typed by hand.

import { useMemo } from 'react'
import { stamp } from '@/lib/display/time'
import Link from 'next/link'
import { useApplicationStore } from '@/store/applicationStore'
import { usePreferencesStore } from '@/store/preferencesStore'
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider'
import { enginePosture, policyGroups, dataModeWord, type PolicyGroupId } from '@/lib/display/settings'
import { APP_VERSION } from '@/lib/settings/appMeta'
import { formatCurrency } from '@/lib/utils'
import { ROUTES } from '@/config/constants'
import { PageHeader } from '@/components/ui/PageHeader'
import { Popover, InfoButton, PopoverText, PopoverTitle } from '@/components/ui/Popover'
import { TableShell, Thead, Th, Tr, Td } from '@/components/shared/DataTable'
import { AppearanceSettings }    from './AppearanceSettings'
import { AccessibilitySettings } from './AccessibilitySettings'

/** Where each policy group is rendered in full. */
const READ_IN_FULL: Record<PolicyGroupId, { href: string; label: string }> = {
  thresholds: { href: `${ROUTES.STRATEGY}?view=pipeline`, label: 'Strategy › Mechanism' },
  sizing:     { href: `${ROUTES.STRATEGY}?view=pipeline`, label: 'Strategy › Mechanism' },
  execution:  { href: `${ROUTES.EXECUTION}?view=engine`,  label: 'Execution › Engine' },
  runtime:    { href: `${ROUTES.SYSTEM}?view=health`,     label: 'System › Health & Config' },
}

export function SettingsView() {
  const configSlice  = useApplicationStore((s) => s.engine.config)
  const policySlice  = useApplicationStore((s) => s.engine.executionPolicy)
  const runtimeSlice = useApplicationStore((s) => s.engine.runtime)
  const healthSlice  = useApplicationStore((s) => s.engine.health)
  const watchlist    = usePreferencesStore((s) => s.watchlist)
  const targets      = usePreferencesStore((s) => s.profitTargets)
  const runtimeCfg   = useRuntimeConfig()

  const config  = configSlice.data ?? null
  const policy  = policySlice.data ?? null
  const runtime = runtimeSlice.data ?? null
  const health  = healthSlice.data ?? null

  const posture = enginePosture(config, policy)
  const groups  = useMemo(() => policyGroups(config, policy), [config, policy])
  const watched = Object.keys(watchlist).length
  const mode    = dataModeWord(runtimeCfg.mode)

  const componentsUp = runtime ? Object.values(runtime.components).filter(Boolean).length : null
  const componentsAll = runtime ? Object.keys(runtime.components).length : null
  const unhealthy = health?.components.filter((c) => !c.healthy).map((c) => c.name) ?? []

  return (
    <div className="page-container flex flex-col gap-6 pb-8 animate-fade-in-up">
      <PageHeader
        title="Settings"
        subtitle="What this browser controls, and what the engine controls"
      />

      {/* ── A · preferences ─────────────────────────────────────────────── */}
      <section aria-labelledby="st-prefs" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="st-prefs" className="t-section-title">Preferences</h2>
            <span className="t-description">kept in this browser, applied the moment they change — nothing here reaches the engine</span>
            <Popover label="About preferences" trigger={(p) => <InfoButton what="preferences" {...p} />}>
              <PopoverTitle>Browser-local, and only that</PopoverTitle>
              <PopoverText>
                The theme and the accessibility switches are saved in this browser’s storage and
                applied to the page immediately. They survive reloads and restarts here, are not
                synced anywhere, and have no effect on what the engine scans, sizes or trades.
              </PopoverText>
              <PopoverText>
                Two more preferences of the same kind — the markets you have starred and any personal
                profit target — are set where they are used and listed below for completeness.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">localStorage</span>
        </div>

        <div className="flex flex-col gap-1">
          <h3 id="appearance" className="t-label scroll-mt-4">Theme</h3>
          <AppearanceSettings />
        </div>

        <div className="flex flex-col">
          <h3 id="accessibility" className="t-label mb-1 scroll-mt-4">Accessibility</h3>
          <AccessibilitySettings />
        </div>

        <div className="flex flex-col">
          <h3 className="t-label mb-1">Also kept in this browser</h3>
          <PrefPointer
            label="Starred markets"
            value={watched === 0 ? 'none starred' : `${watched} market${watched === 1 ? '' : 's'}`}
            note="the star on any market row, card or detail page; the engine keeps no watchlist"
            href={`${ROUTES.MARKETS}?view=watchlist`}
            where="Markets › Watchlist"
          />
          <PrefPointer
            label="Personal profit targets"
            value={targets.daily === null && targets.weekly === null
              ? 'engine’s own targets'
              : [targets.daily !== null ? `${formatCurrency(targets.daily)} / day` : null, targets.weekly !== null ? `${formatCurrency(targets.weekly)} / week` : null].filter(Boolean).join(' · ')}
            note="a display-only overlay on the survival target bars; the engine’s targets are unchanged"
            href={`${ROUTES.STRATEGY}?view=survival`}
            where="Strategy › Survival"
          />
        </div>
      </section>

      {/* ── B · engine policy ───────────────────────────────────────────── */}
      <section aria-labelledby="st-policy" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 flex-wrap">
            <h2 id="st-policy" className="t-section-title">Engine policy</h2>
            <span className="t-description">what the engine holds — PROBEX reads it and cannot write it</span>
            <Popover label="About engine policy" trigger={(p) => <InfoButton what="engine policy" {...p} />}>
              <PopoverTitle>Read-only, by the engine’s own contract</PopoverTitle>
              <PopoverText>
                /api/config publishes the engine’s parameters and accepts only GET — PUT, POST and
                PATCH answer 405. /api/execution/policy describes itself as read-only and never places
                orders. No endpoint writes configuration, so no control here pretends to.
              </PopoverText>
              <PopoverText>
                Each parameter is shown with its value, unit and meaning where the engine documents
                one, on the page that uses it. This table only says which parameters exist and where
                to read them.
              </PopoverText>
            </Popover>
          </span>
          <span className="t-metadata">
            /api/config · /api/execution/policy
            {config && configSlice.lastUpdatedAt !== null && ` · read ${stamp(configSlice.lastUpdatedAt)}`}
          </span>
        </div>

        <p className="t-helper m-0" style={posture.liveTradingEnabled === true ? { color: 'var(--probex-negative)' } : undefined}>
          {configSlice.status === 'error' && !config
            ? 'The engine’s configuration did not answer — its policy cannot be read right now.'
            : posture.sentence}
        </p>

        <TableShell label="Engine policy index">
          <Thead>
            <Th align="left" dense grow>Policy</Th>
            <Th align="right" dense>Reported</Th>
            <Th align="left" dense hideBelow="sm">Read in full</Th>
          </Thead>
          <tbody>
            {groups.map((g) => {
              const dest = READ_IN_FULL[g.id]
              return (
                <Tr key={g.id}>
                  <Td align="left" dense grow>
                    <span className="font-semibold block" style={{ color: 'var(--probex-text-primary)' }}>{g.label}</span>
                    <span className="t-metadata block">{g.source} · read-only</span>
                    {/* The wire names, wrapping in the elastic column, so the
                        reader can match them against the engine's own docs. */}
                    <span className="block font-mono text-2xs mt-0.5" style={{ color: 'var(--probex-text-muted)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{g.parameters.join(' · ')}</span>
                    <Link href={dest.href} className="sm:hidden focus-ring text-2xs font-semibold mt-1 inline-block" style={{ color: 'var(--probex-primary)' }}>{dest.label} →</Link>
                  </Td>
                  <Td align="right" dense>
                    <span className="font-mono tabular-nums text-xs" style={{ color: g.reported === 0 ? 'var(--probex-text-disabled)' : 'var(--probex-text-secondary)' }} title={g.reported === 0 ? 'The endpoint has not answered' : `${g.reported} of ${g.parameters.length} parameters carried a value`}>
                      {g.reported} / {g.parameters.length}
                    </span>
                  </Td>
                  <Td align="left" dense hideBelow="sm">
                    <Link href={dest.href} className="focus-ring text-2xs font-semibold whitespace-nowrap" style={{ color: 'var(--probex-primary)' }}>{dest.label} →</Link>
                  </Td>
                </Tr>
              )
            })}
          </tbody>
        </TableShell>
      </section>

      {/* ── C · this deployment ─────────────────────────────────────────── */}
      <section aria-labelledby="st-about" className="flex flex-col gap-3 pt-5" style={{ borderTop: '1px solid var(--probex-border)' }}>
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="flex items-baseline gap-2 flex-wrap">
            <h2 id="st-about" className="t-section-title">This deployment</h2>
            <span className="t-description">read at runtime, not typed by hand</span>
          </span>
          <Link href={`${ROUTES.SYSTEM}?view=health`} className="focus-ring text-2xs font-semibold" style={{ color: 'var(--probex-primary)' }}>System & diagnostics →</Link>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-3 m-0">
          <Fact label="Dashboard" value={`PROBEX ${APP_VERSION}`} note="package.json version" />
          <Fact
            label="Data source"
            value={mode.word}
            tone={mode.tone === 'positive' ? 'var(--probex-positive)' : mode.tone === 'warning' ? 'var(--probex-warning)' : 'var(--probex-negative)'}
            note={`${mode.meaning} · API base ${runtimeCfg.baseUrl}`}
            detail={runtimeCfg.reason}
          />
          <Fact
            label="Engine session"
            value={runtime ? `${runtime.mode.toUpperCase()} mode` : runtimeSlice.status === 'error' ? 'did not answer' : '—'}
            note={runtime
              ? `running since ${stamp(runtime.initializedAt)} · ${componentsUp} of ${componentsAll} components enabled`
              : 'waiting for /api/runtime'}
          />
          <Fact
            label="Engine health"
            value={health ? health.statusLabel : healthSlice.status === 'error' ? 'did not answer' : '—'}
            tone={health?.status === 'online' ? 'var(--probex-positive)' : health?.status === 'degraded' ? 'var(--probex-warning)' : health?.status === 'offline' ? 'var(--probex-negative)' : undefined}
            note={health
              ? unhealthy.length === 0 ? `${health.components.length} components reporting healthy` : `unhealthy: ${unhealthy.join(', ')}`
              : 'waiting for /api/health'}
          />
        </dl>

        <p className="t-metadata m-0">
          Market charts powered by{' '}
          <a href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener noreferrer" className="underline focus-ring">TradingView Lightweight Charts™</a>.
        </p>
      </section>
    </div>
  )
}

// ─── Pieces ───────────────────────────────────────────────────────────────────

function PrefPointer({ label, value, note, href, where }: { label: string; value: string; note: string; href: string; where: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3" style={{ borderTop: '1px solid var(--probex-border)' }}>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium block" style={{ color: 'var(--probex-text-primary)' }}>{label}</span>
        <span className="t-helper block mt-0.5">{note}</span>
      </div>
      <span className="flex items-baseline gap-3 flex-shrink-0">
        <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--probex-text-secondary)' }}>{value}</span>
        <Link href={href} className="focus-ring text-2xs font-semibold whitespace-nowrap" style={{ color: 'var(--probex-primary)' }}>{where} →</Link>
      </span>
    </div>
  )
}

function Fact({ label, value, note, detail, tone }: { label: string; value: string; note: string; detail?: string | undefined; tone?: string | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <dt className="t-metadata">{label}</dt>
      <dd className="m-0 flex flex-col min-w-0">
        <span className="text-xs font-semibold" style={{ color: tone ?? 'var(--probex-text-secondary)' }}>{value}</span>
        <span className="t-helper">{note}</span>
        {detail && <span className="t-metadata">{detail}</span>}
      </dd>
    </div>
  )
}
