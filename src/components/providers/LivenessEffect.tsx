'use client'

// LivenessEffect — reflects the resolved system state onto <html> as
// `data-liveness`, so CSS can suppress "this is happening right now" motion
// whenever the data on screen is not actually live.
//
// ─── Why this is a document attribute and not a prop ─────────────────────────
// Pulsing dots are the product's liveness vocabulary and they are spread across
// fourteen call sites in twelve files — StatusChip's `live`, and the raw
// `.live-dot` class used directly by the hero, the heartbeat, Hot Markets,
// Portfolio Activity, the paper console, and others. Threading a "but is it
// really live?" prop through all of them would be fourteen chances to forget,
// and every new pulsing element added later would be a fifteenth.
//
// The guarantee we actually want is global: in synthetic or unreachable states,
// nothing in the product may animate as though the engine were doing something.
// Expressing that as one attribute + one CSS rule makes it true for every
// existing element and every future one, with no component aware of it.
//
// This follows the pattern SettingsEffects already established for
// accessibility preferences (data-reduce-motion, data-high-contrast).

import { useEffect } from 'react'
import { useSystemStatus } from '@/config/hooks/useSystemStatus'

export function LivenessEffect() {
  const { state, dataIsLive } = useSystemStatus()

  useEffect(() => {
    // 'live' is the permissive value; anything else suppresses pulse animation.
    // Derived from dataIsLive rather than from the state name so a future state
    // is safe by default: a new state that has not been considered here will
    // suppress motion rather than silently animate over synthetic numbers.
    document.documentElement.setAttribute('data-liveness', dataIsLive ? 'live' : 'inert')
    document.documentElement.setAttribute('data-system-state', state)
  }, [state, dataIsLive])

  return null
}
