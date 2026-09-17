// Preferences kept in this browser (settingsStore → localStorage).
//
// Only what has a consumer lives here. Every field below is applied to the
// document by SettingsEffects or read by a component, so no switch on the
// Settings page is a no-op. The notification, "trading & workspace" and
// profile groups that used to sit beside it were removed 2026-09-16: nothing
// read them — no delivery service, no consumer of the "preferred mode", the
// display name never appeared anywhere — so their toggles saved a value that
// changed nothing. See lib/display/settings.ts.

export interface AccessibilityPrefs {
  reduceMotion:      boolean
  highContrast:      boolean
  textSize:          'sm' | 'md' | 'lg'
  keyboardShortcuts: boolean
  underlineLinks:    boolean
}
