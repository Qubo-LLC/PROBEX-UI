// MarketChart tip projection — the motion engine's arithmetic, as pure
// functions.
//
// ─── Why this is its own module ──────────────────────────────────────────────
// The maths used to live inline inside the rAF closure in MarketChart, where it
// could not be evaluated without a browser, a canvas and a live feed. That is
// how a convergence bug survived in it: the comment above the code described
// behaviour ("velocity decays → target settles back onto the confirmed anchor")
// that the code did not have, and there was no way to check the claim short of
// watching a chart for a minute.
//
// Extracting it changes no behaviour — the frame loop calls these and does
// exactly what it did before — but it makes the projection something that can
// be evaluated at t = 0, 1, 2, 4, 6 and beyond and checked against its stated
// intent.
//
// No React, no lightweight-charts, no DOM: this file is deliberately importable
// on its own.

/**
 * How far past the last confirmed sample the VIEWPORT clock may lead, in
 * seconds.
 *
 * This is a viewport bound, not a projection bound. Its job is to stop a dead
 * feed from scrolling the visible range off into empty space — the chart must
 * not pan into a region where no observations exist. It deliberately does NOT
 * bound the projected value; see `projectTip`.
 */
export const MAX_LEAD_SEC = 6

/** Velocity decay time constant (seconds). Larger = the extrapolated trend
 *  persists longer before the tip returns to the confirmed anchor. */
export const VEL_DECAY_SEC = 4

/** Spring pull toward the projected target, per second. */
export const CORRECT_RATE = 4

/** Hard clamp on how far the projected tip may sit from the confirmed anchor:
 *  ±0.05% of price. The projection is a continuation of an observed trend, not
 *  a forecast, and this is what keeps it from ever looking like one. */
export const MAX_DEV_FRAC = 0.0005

export interface TipProjection {
  /** Seconds since the confirmed anchor arrived (unbounded). */
  elapsed: number
  /** Viewport lead — `elapsed` bounded by MAX_LEAD_SEC. */
  lead: number
  /** Velocity after decay, in price units per second. */
  decayedVel: number
  /** Signed distance of the projected tip from the confirmed anchor, after the
   *  MAX_DEV_FRAC clamp. */
  offset: number
  /** The value the tip springs toward. */
  projected: number
}

/**
 * Dead-reckons the tip from the last confirmed observation.
 *
 * The tip continues along the recently observed velocity, that velocity decays,
 * and the resulting offset is clamped to a tight honest band around the anchor.
 * With no fresh data the decay runs the offset back to zero, so the drawn tip
 * returns to the confirmed value rather than resting beside it.
 */
export function projectTip(anchorV: number, velocity: number, elapsedSec: number): TipProjection {
  // Elapsed time cannot be negative. It never is in practice — `performance.now()`
  // is monotonic and the anchor timestamp comes from it — but the floor keeps a
  // bad clock from driving the viewport backwards or inverting the decay into
  // exponential growth.
  const elapsed = elapsedSec > 0 ? elapsedSec : 0

  // The viewport's bound. Kept exactly as it was — a silent feed must not
  // scroll the visible range past the data that exists.
  const lead = Math.min(elapsed, MAX_LEAD_SEC)

  // ─── The projection runs on UNBOUNDED elapsed time ─────────────────────────
  // Both terms below use `elapsed`, not `lead`. Feeding the bounded lead into
  // the decay was the convergence bug: past MAX_LEAD_SEC the input froze, so
  // `exp(-lead/VEL_DECAY_SEC) * lead` froze with it and the tip parked at a
  // fixed offset from the anchor for as long as the feed stayed silent. The
  // offset was bounded, so nothing drifted — but it never came back either, and
  // the drawn tip permanently disagreed with the confirmed value.
  //
  // On unbounded elapsed the product `t·e^(−t/τ)` peaks at t = τ and decays to
  // zero, which is the behaviour the model was always described as having. The
  // viewport bound stays where it belongs, on the viewport.
  const decayedVel = velocity * Math.exp(-elapsed / VEL_DECAY_SEC)
  const maxDev = Math.abs(anchorV) * MAX_DEV_FRAC
  const raw = decayedVel * elapsed

  // A projection that cannot be computed is not projected. `raw` goes
  // non-finite only on absurd input — a NaN velocity from a malformed sample,
  // or the 0 x Infinity the decay now produces at an infinite elapsed — and in
  // both cases the honest tip is the confirmed observation itself, not a
  // fabricated one and not a NaN handed to the renderer.
  const offset = Number.isFinite(raw) ? Math.max(-maxDev, Math.min(maxDev, raw)) : 0

  return { elapsed, lead, decayedVel, offset, projected: anchorV + offset }
}

/**
 * One exponential spring step toward `target`. Frame-rate independent, no
 * overshoot: at any dt the display moves a fixed FRACTION of the remaining
 * distance, so it converges on the target and never past it.
 */
export function springStep(display: number, target: number, dt: number): number {
  return display + (target - display) * (1 - Math.exp(-dt * CORRECT_RATE))
}
