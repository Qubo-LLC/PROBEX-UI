'use client'

// Trading & Workspace preferences — persisted locally. This is where Probex's
// dual identity lives: Autonomous AI trading (active today) + Manual trading
// (arriving in a future release). These are real saved workspace preferences;
// none of them place orders (no order endpoint exists in the backend contract).

import { useSettingsStore } from '@/store/settingsStore'
import type { WorkspacePrefs } from '@/types/settings'
import { SettingsSection, SettingRow, Toggle, SegmentedControl } from './controls'

const MODE_OPTIONS = [
  { value: 'autonomous', label: 'Autonomous' },
  { value: 'hybrid',     label: 'Hybrid'     },
  { value: 'manual',     label: 'Manual'     },
] as const

const VIEW_OPTIONS = [
  { value: 'grid',  label: 'Grid'  },
  { value: 'table', label: 'Table' },
] as const

export function TradingSettings() {
  const p   = useSettingsStore((s) => s.workspace)
  const set = useSettingsStore((s) => s.setWorkspace)
  const update = <K extends keyof WorkspacePrefs>(k: K, v: WorkspacePrefs[K]) => set({ [k]: v })

  return (
    <SettingsSection
      title="Trading & Workspace"
      description="Probex runs autonomous AI trading today; manual trading arrives in a future release. Set how the dashboard emphasises each mode and your default views."
    >
      <SettingRow label="Preferred mode" description="How the dashboard frames the AI + manual experience. Autonomous is active now; manual order placement arrives in a future release.">
        <SegmentedControl value={p.tradingMode} onChange={(v) => update('tradingMode', v)} options={MODE_OPTIONS} ariaLabel="Preferred trading mode" />
      </SettingRow>
      <SettingRow label="Default market view" description="Grid or table when browsing markets.">
        <SegmentedControl value={p.defaultMarketView} onChange={(v) => update('defaultMarketView', v)} options={VIEW_OPTIONS} ariaLabel="Default market view" />
      </SettingRow>
      <SettingRow label="Confirm manual trades" description="Require a confirmation step before a manual order (applies when manual trading is available).">
        <Toggle checked={p.confirmManualTrade} onChange={(v) => update('confirmManualTrade', v)} label="Confirm manual trades" />
      </SettingRow>
      <SettingRow label="Compact numbers" description="Abbreviate large values (e.g. $1.2M instead of $1,234,567)." last>
        <Toggle checked={p.compactNumbers} onChange={(v) => update('compactNumbers', v)} label="Compact numbers" />
      </SettingRow>
    </SettingsSection>
  )
}
