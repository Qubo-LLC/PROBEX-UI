'use client'

import { APP_META } from '@/lib/settings/appMeta'
import { SettingsSection, SettingRow, ReadOnlyValue } from './controls'

const LINKS = [
  { label: 'Documentation',  hint: 'Guides and API reference' },
  { label: 'Terms of Service', hint: 'Legal terms' },
  { label: 'Privacy Policy', hint: 'How we handle your data' },
  { label: 'System Status',  hint: 'Live platform status' },
]

export function AboutSettings() {
  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title="About Probex" description="Platform version and build information.">
        <div className="flex items-center gap-3 px-[18px] py-4" style={{ borderBottom: '1px solid var(--probex-border)' }}>
          <div className="flex items-center justify-center rounded-lg flex-shrink-0" style={{ width: 40, height: 40, background: 'var(--probex-gradient-brand)', color: '#fff', fontWeight: 800, fontSize: 18 }} aria-hidden="true">P</div>
          <div className="flex flex-col">
            <span className="text-sm font-bold" style={{ color: 'var(--probex-text-primary)' }}>Probex Terminal</span>
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
        <SettingRow label="System status" last>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--probex-positive)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--probex-positive)' }} aria-hidden="true" />
            All systems operational
          </span>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Resources" description="Help, legal, and platform status.">
        {LINKS.map((l, i) => (
          <SettingRow key={l.label} label={l.label} description={l.hint} last={i === LINKS.length - 1}>
            <button type="button" className="text-xs px-3 py-1.5 rounded-md cursor-pointer transition-colors duration-100" style={{ border: '1px solid var(--probex-border-default)', color: 'var(--probex-text-secondary)' }}>
              Open
            </button>
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
