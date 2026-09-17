'use client'

// Accessibility preferences — persisted to settingsStore (localStorage) and
// applied to the document by SettingsEffects, so every switch has a real,
// immediate effect. Keyboard shortcuts are read by TopNavigation; reduced
// motion additionally by MarketChart. Nothing here reaches the engine.

import { useSettingsStore } from '@/store/settingsStore'
import type { AccessibilityPrefs } from '@/types/settings'
import { SettingRow, Toggle, SegmentedControl } from './controls'

const TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small'   },
  { value: 'md', label: 'Default' },
  { value: 'lg', label: 'Large'   },
] as const

export function AccessibilitySettings() {
  const p   = useSettingsStore((s) => s.accessibility)
  const set = useSettingsStore((s) => s.setAccessibility)
  const update = <K extends keyof AccessibilityPrefs>(k: K, v: AccessibilityPrefs[K]) => set({ [k]: v })

  return (
    <div className="flex flex-col">
      <SettingRow label="Reduce motion" description="Minimise animations and transitions across the dashboard, including the chart projection.">
        <Toggle checked={p.reduceMotion} onChange={(v) => update('reduceMotion', v)} label="Reduce motion" />
      </SettingRow>
      <SettingRow label="High contrast" description="Stronger borders and text against the background.">
        <Toggle checked={p.highContrast} onChange={(v) => update('highContrast', v)} label="High contrast" />
      </SettingRow>
      <SettingRow label="Text size" description="Scales every interface size from its base.">
        <SegmentedControl value={p.textSize} onChange={(v) => update('textSize', v)} options={TEXT_SIZE_OPTIONS} ariaLabel="Text size" />
      </SettingRow>
      <SettingRow label="Keyboard shortcuts" description="Global shortcuts such as ⌘K / Ctrl+K for the command palette.">
        <Toggle checked={p.keyboardShortcuts} onChange={(v) => update('keyboardShortcuts', v)} label="Keyboard shortcuts" />
      </SettingRow>
      <SettingRow label="Underline links" description="Always underline links, so they do not rely on colour alone.">
        <Toggle checked={p.underlineLinks} onChange={(v) => update('underlineLinks', v)} label="Underline links" />
      </SettingRow>
    </div>
  )
}
