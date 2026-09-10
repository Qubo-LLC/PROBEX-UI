'use client'

import { APP_META } from '@/lib/settings/appMeta'
import { useApplicationStore } from '@/store/applicationStore'
import { SettingsSection, SettingRow, ReadOnlyValue } from './controls'

// These four destinations do not exist yet. They previously rendered as four
// enabled "Open" buttons that did nothing when clicked — a control that looks
// operational and is not. Stated honestly instead, and the one that IS reachable
// in-product points at the System page.
const LINKS = [
  { label: 'Documentation',    hint: 'Guides and API reference' },
  { label: 'Terms of Service', hint: 'Legal terms' },
  { label: 'Privacy Policy',   hint: 'How we handle your data' },
]

export function AboutSettings() {
  // Real platform status, not an assertion.
  //
  // The canonical vocabulary is normalizeHealthStatus()'s 'online' | 'degraded'
  // | 'offline' — the wire's own word ("healthy") is mapped onto it, and an
  // unrecognised value normalises to null rather than being guessed at. null is
  // rendered as "unavailable", never as "fine": this row previously asserted
  // "All systems operational" unconditionally, with nothing behind it, while
  // /api/health was reporting degraded.
  const healthSlice = useApplicationStore((s) => s.engine.health)
  const health = healthSlice.status === 'success' ? healthSlice.data : null
  const statusWord = health?.status ?? null
  const statusTone =
    statusWord === null ? 'var(--probex-text-muted)'
    : statusWord === 'online' ? 'var(--probex-positive)'
    : statusWord === 'degraded' ? 'var(--probex-warning)'
    : 'var(--probex-negative)'
  const statusLabel =
    statusWord === null ? 'Status unavailable'
    : statusWord === 'online' ? 'All systems operational'
    : statusWord === 'degraded' ? 'Degraded — some components unhealthy'
    : 'Offline'

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title="About Probex" description="Platform version and build information.">
        <div className="flex items-center gap-3 px-[18px] py-4" style={{ borderBottom: '1px solid var(--probex-border)' }}>
          <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 40, height: 40, background: 'var(--probex-gradient-brand)', color: '#fff', fontWeight: 800, fontSize: 18 }} aria-hidden="true">P</div>
          <div className="flex flex-col">
            <span className="t-section-title">Probex Terminal</span>
            <span className="text-2xs" style={{ color: 'var(--probex-text-muted)' }}>Bitcoin prediction-market intelligence</span>
          </div>
          <span className="ml-auto text-2xs font-semibold px-2 py-0.5 rounded" style={{ background: 'var(--probex-primary-dim)', color: 'var(--probex-primary)' }}>
            {APP_META.channel}
          </span>
        </div>

        <SettingRow label="Version"><ReadOnlyValue mono>{APP_META.version}</ReadOnlyValue></SettingRow>
        <SettingRow label="Build"><ReadOnlyValue mono>{APP_META.build}</ReadOnlyValue></SettingRow>
        <SettingRow label="Environment">
          <span className="text-xs font-medium" style={{ color: 'var(--probex-warning)' }}>{APP_META.environment}</span>
        </SettingRow>
        <SettingRow label="System status" description="Reported by the engine's own health check." last>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: statusTone }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusTone }} aria-hidden="true" />
            {statusLabel}
            {health !== null && health.components.some((c) => !c.healthy) && (
              <span style={{ color: 'var(--probex-text-muted)', fontWeight: 400 }}>
                {' · '}
                {health.components.filter((c) => !c.healthy).map((c) => c.name).join(', ')}
              </span>
            )}
          </span>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Resources" description="Help, legal, and platform status.">
        {LINKS.map((l, i) => (
          <SettingRow key={l.label} label={l.label} description={l.hint} last={i === LINKS.length - 1}>
            <ReadOnlyValue>Available in a future release</ReadOnlyValue>
          </SettingRow>
        ))}
      </SettingsSection>

      <p className="text-2xs text-center" style={{ color: 'var(--probex-text-disabled)' }}>
        © 2026 Probex · QUBO Consensus Engine. All rights reserved.
      </p>
      <p className="text-2xs text-center" style={{ color: 'var(--probex-text-disabled)' }}>
        Market charts powered by{' '}
        <a href="https://www.tradingview.com/lightweight-charts/" target="_blank" rel="noopener noreferrer" className="underline">
          TradingView Lightweight Charts™
        </a>
        .
      </p>
    </div>
  )
}
