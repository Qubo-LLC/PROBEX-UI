export interface AccessibilityPrefs {
  reduceMotion:      boolean
  highContrast:      boolean
  textSize:          'sm' | 'md' | 'lg'
  keyboardShortcuts: boolean
  underlineLinks:    boolean
}

// ─── Locally-persisted preference groups (Settings Restoration) ───────────────
// These are REAL user preferences saved to localStorage via settingsStore — no
// backend. Delivery/enforcement that needs a server (notification push, auth)
// is surfaced honestly in the UI as "Available in a future release".

export interface NotificationPrefs {
  /** Master switch — off silences everything. */
  master:          boolean
  priceAlerts:     boolean
  edgeAlerts:      boolean
  survivalAlerts:  boolean
  executionAlerts: boolean
}

export interface ProfilePrefs {
  /** Local display name shown in the shell. */
  displayName: string
  /** Short self-description. */
  headline:    string
}

/** How the dashboard should emphasise the two trading modes (Autonomous AI +
 *  Manual). A real, saved workspace preference — it does not enable manual
 *  order placement (no such endpoint exists). */
export type TradingModeEmphasis = 'autonomous' | 'manual' | 'hybrid'

export interface WorkspacePrefs {
  tradingMode:        TradingModeEmphasis
  defaultMarketView:  'grid' | 'table'
  confirmManualTrade: boolean
  compactNumbers:     boolean
}
