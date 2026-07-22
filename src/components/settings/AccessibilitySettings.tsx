'use client'

// Accessibility preferences — persisted to settingsStore (localStorage) and
// applied to the document by SettingsEffects, so every toggle has a real,
// immediate effect (no fake "saved" state).

import { useSettingsStore } from '@/store/settingsStore'
import type { AccessibilityPrefs } from '@/types/settings'
import { SettingsSection, SettingRow, Toggle, SegmentedControl } from './controls'

const TEXT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Small'  },
  { value: 'md', label: 'Default' },
  { value: 'lg', label: 'Large'  },
] as const

export function AccessibilitySettings() {
  const p   = useSettingsStore((s) => s.accessibility)
  const set = useSettingsStore((s) => s.setAccessibility)

  const update = <K extends keyof AccessibilityPrefs>(k: K, v: AccessibilityPrefs[K]) => set({ [k]: v })

  return (
    <SettingsSection
      title="Accessibility"
      description="Adjust motion, contrast, and readability. Changes apply instantly and persist on this device."
    >
      <SettingRow label="Reduce motion" description="Minimize animations and transitions.">
        <Toggle checked={p.reduceMotion} onChange={(v) => update('reduceMotion', v)} label="Reduce motion" />
      </SettingRow>
      <SettingRow label="High contrast" description="Increase contrast for borders and text.">
        <Toggle checked={p.highContrast} onChange={(v) => update('highContrast', v)} label="High contrast" />
      </SettingRow>
      <SettingRow label="Text size" description="Scale interface text.">
        <SegmentedControl value={p.textSize} onChange={(v) => update('textSize', v)} options={TEXT_SIZE_OPTIONS} ariaLabel="Text size" />
      </SettingRow>
      <SettingRow label="Keyboard shortcuts" description="Enable global keyboard navigation shortcuts (⌘K opens the command palette).">
        <Toggle checked={p.keyboardShortcuts} onChange={(v) => update('keyboardShortcuts', v)} label="Keyboard shortcuts" />
      </SettingRow>
      <SettingRow label="Underline links" description="Always underline links for clarity." last>
        <Toggle checked={p.underlineLinks} onChange={(v) => update('underlineLinks', v)} label="Underline links" />
      </SettingRow>
    </SettingsSection>
  )
}
