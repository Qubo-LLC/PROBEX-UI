# PROBEX — Chart Fluidity Plan

**Date:** 2026-09-08 · **Phase:** audit only — no code modified
**Scope:** your §3. Primary live BTC/market chart first, then whether the treatment generalises.

---

## 0 · The headline finding

**The primary live BTC chart is already fluid, and the fluidity engine already exists in this repository.**

The Overview hero and Live Feed do **not** use Recharts. They use `MarketChart` (TradingView Lightweight Charts), which already runs a 60fps motion engine with velocity dead-reckoning and spring correction, is already incremental (`setData()` once, then `series.update()`), and is already gated on both data reality and user motion preference.

So the answer to "can we get Stitch's fluidity" is not "build it" — it is **"we have it on one chart; decide whether to extend it, and decide whether its truth model is the one you want."**

The real gap is the **seven Recharts surfaces**, which are deliberately frozen.

---

## 1 · Current chart architecture

Two rendering libraries, one shared outer state and accessibility language:

```
Recharts            → ChartFrame → Recharts plot       (LiveChart)      7 surfaces
Lightweight Charts  → ChartFrame → MarketChartCanvas   (MarketChart)    the live BTC curve
```

`ChartFrame` owns the six states — `loading` / `live` / `stale` / `idle` / `empty` / `unavailable` — plus `role="img"` and a required `aria-label` summary. Both stacks inherit it.

### 1.1 Stack A — `MarketChart` (lightweight-charts) — **the primary chart**

| | |
|---|---|
| Consumers | `PriceCard` (Overview hero), Live Feed, `MarketCharts`, `MarketDetailPage` |
| Data path | `/api/price-history` → `useEnginePriceChart` → `useMarketSeries` → `priceSeriesStore.ingest()` → accumulated session series |
| Poll cadence | **2s** (`FAST_MS`) |
| Update mechanism | **Incremental.** `setData()` runs exactly once; everything after is `series.update()`. No redraw flicker. |
| Motion | Full engine — see §1.2 |
| Dependency | `lightweight-charts@^5.2.0`, already installed, loaded via `next/dynamic({ ssr: false })` |

### 1.2 What Stack A already does

From the component's own header:

- **Velocity estimation** — the slope of recent *confirmed* samples gives a price velocity. Between backend updates the tip dead-reckons along that trajectory, decaying toward zero and hard-clamped to a tiny band around the last confirmed price.
- **Spring correction** — each new confirmed price becomes the new anchor; the displayed tip is pulled toward it by an exponential spring every frame. *"Backend updates are corrections, not animation triggers: no ease restarts, no snapping."*
- **History stays exact** — **only the single leading point animates.** When newer confirmed points arrive, the old tip is first written back to its **exact confirmed value**, then new points are appended. *"No projected value ever remains in history."*
- **Viewport** — scrolls continuously against wall-clock time, **capped when the feed goes stale** so the chart never scrolls into fabricated emptiness.
- **Two-party motion gate** — the motion needs a licence from **the data** (`[data-liveness]` — is this feed real?) and from **the user** (`data-reduce-motion` + OS `prefers-reduced-motion`). Without both, the tip is pinned to the confirmed observation and nothing drifts.

That last point matters: **under synthetic or unreachable data the motion stops entirely.** Fluidity is a property of a live feed, not a decoration.

### 1.3 Stack B — `LiveChart` (Recharts) — **frozen by design**

| | |
|---|---|
| Consumers (7) | `PerformanceAnalytics`, `ConfidenceEvolution`, `ConsensusHistoryChart`, `MarketCharts`, `PnLChart`, `PortfolioValueChart`, `WinRateChart` |
| Data path | Central store slice → prop |
| Poll cadence | 5s (MEDIUM) / 30s (SLOW) depending on the slice |
| Update mechanism | **Full reconstruction.** `data.slice(-windowSize)` re-derives the window every render; Recharts re-renders the whole series. |
| Curve shape | `type="monotone"` — **already a smooth spline**, not straight segments |
| Motion | `isAnimationActive={false}` on every series and on the tooltip |
| Arrival cue | A one-shot `pulse-ring`, re-keyed when `latest.tick` changes, gated by `data-liveness` |

### 1.4 Why Stack B is frozen — the existing rationale

`LiveChart.tsx:14-24` states it directly:

> *"The tempting fix for the window's jump is to animate the series, but Recharts animates by morphing each point's Y toward the value that lands in its slot — which draws a path between two observations that were never adjacent, at values the engine never reported. That is fabricated data rendered as measurement, and it is the one thing this product does not do."*

**This is exactly your §3 constraint, already reasoned through and already enforced.** Your `REAL A → fabricated intermediates → REAL B` diagram describes precisely the failure mode this comment rejects.

---

## 2 · Current limitations

| # | Limitation | Where | Severity |
|---|---|---|---|
| **L-1** | **Window pan is instantaneous.** On a new observation every point shifts one slot left with no transition. This is the "jump" — and it is a *camera* movement, not a data movement. | Stack B, all 7 | **The main gap** |
| **L-2** | Series reconstructed each render rather than appended | Stack B | Perf, not truth |
| **L-3** | Tooltip is hover-only | Both | a11y (debt #19, #35) |
| **L-4** | Y-domains default to zero-based, flattening series far from zero; `yDomain` escape hatch used inconsistently | Stack B | Legibility (debt #16, #38) |
| **L-5** | Y-axis leading digits clipped — Analytics Drawdown renders `34%` as `4%` (`width={40}`) | Stack B | **Actively misleading** (debt #13) |
| **L-6** | Two libraries whose axes, gridlines and tooltips do not match | Both | Consistency (debt #18) |
| **L-7** | Charts keep desktop proportions on mobile | Both | Responsive (debt #30) |

---

## 3 · Data-truth constraints

Fixed. Everything in §4 obeys these.

1. **No value the engine did not report may enter history.** Stack A already enforces write-back-before-append.
2. **Interpolation is a camera operation, never a measurement.** Animating *where the viewport looks* is honest. Animating *what a point's value is* is not.
3. **Motion requires a live feed.** Under stale, offline, mock or synthetic data, motion stops. `[data-liveness="inert"]` already carries this.
4. **Motion requires user consent.** `data-reduce-motion` and OS `prefers-reduced-motion` both disable it.
5. **Withholding motion must never withhold information.** A pinned chart shows the same numbers.
6. **Stitch's `status-synthetic` definition — "simulated paper-mode, backtesting, or interpolated feeds" — is rejected** (reconciliation R-3). Interpolated values are not a labellable data state.

### 3.1 One open question you should decide

Stack A's leading tip **does** display a projected value between confirmations — a dead-reckoned position that the backend has not reported, corrected on every confirmation and never written to history.

Your rule was: *"We may animate rendering between real observations, but must never imply that interpolated values were actually observed."*

The tip projection is defensible — it is bounded, decaying, hard-clamped to a tiny band, gated on a live feed, and never persisted. But it is the current price read-out moving on values the engine did not send. **It sits on the line your rule draws, and you should decide explicitly rather than inherit it.**

| Option | Consequence |
|---|---|
| **A · Keep as-is** | Maximum fluidity. Tip is a *projection*, corrected 2×/second. Already shipped and gated. |
| **B · Keep motion, pin the number** | Curve drifts; the numeric read-out only changes on confirmation. Removes any claim that a displayed *figure* was observed. **Recommended.** |
| **C · Pin both** | Maximum literalism, loses the fluidity Stitch is showing and you asked to preserve. |

Option B is a small change and resolves the ambiguity without losing the effect.

---

## 4 · Proposed approach

### 4.1 Primary chart (Stack A) — no rebuild

Already meets the brief. Work is limited to:

- **P-1** Decide §3.1 (recommend Option B).
- **P-2** Restyle to the new tokens — series colour, gridlines, crosshair, axis.
- **P-3** Reconcile axis/gridline/tooltip styling with Stack B so they read as one system (L-6).
- **P-4** Mobile height/aspect (L-7).

### 4.2 Recharts surfaces (Stack B) — animate the camera, not the data

**The mechanism.** Today the window is `data.slice(-windowSize)` and a new observation shifts every point one slot left instantly. Instead:

1. Render `windowSize + 1` points.
2. On arrival, apply a CSS `transform: translateX(...)` to the plot group, moving it left by exactly one slot width over ~`--motion-med` (240ms), using `--motion-ease`.
3. On completion, drop the oldest point and reset the transform.

**Why this is safe.** No point's `y` ever changes. No point is ever drawn at a value the engine did not report. The animation is a horizontal translation of an unchanged curve — geometrically identical to Stack A's continuous viewport scroll, which is already accepted in this codebase. It is the difference between panning a camera across a photograph and repainting the photograph.

**Why it is *not* Recharts' animation.** `isAnimationActive` morphs each point's `y` toward whatever value lands in its slot. That is the fabrication the code comment rejects, and it stays off.

**Constraints.**
- Gate on `[data-liveness]` and reduced motion, identically to Stack A.
- Skip the transition when more than one observation arrives at once (a catch-up after a stale period must not glide through positions the series never held) — snap instead.
- No transition when the underlying series is stale; `StaleStrip` already renders over the plot.
- Preserve the `pulse-ring` arrival cue — it marks the *event*; the pan carries the *continuity*.

**Honest limitation:** SVG-group transforms interact with Recharts' internal layout and the tooltip's coordinate mapping. This needs a spike on **one** chart before being generalised, and if it proves fragile the fallback is P-8 below, which costs nothing.

### 4.3 Fixes that should land regardless

| | |
|---|---|
| **P-8** | Widen the Y-axis (`width={40}` → measured) — **L-5 is actively misleading and is the highest-value chart fix in this document.** |
| **P-9** | Apply `yDomain={['dataMin','dataMax']}` consistently to non-zero-based series (L-4) |
| **P-10** | Keyboard-reachable data readout — extend the `HistoricalSnapshots` pattern (L-3) |
| **P-11** | Fix `RadialGauge` domain before restyling — it currently renders `150% UTILIZED` on a fully closed ring |

---

## 5 · Does the treatment generalise?

**No — and it should not.** Fluidity is only honest where observations are frequent and evenly spaced.

| Surface | Cadence | Pan animation? | Why |
|---|---|---|---|
| BTC hero / Live Feed | 2s | **Yes — already** | Dense, regular, live |
| Consensus history, Confidence evolution | 30s | **Yes, cautiously** | Regular, but a 240ms glide every 30s may read as decoration |
| Portfolio value, P&L, Win rate | 30s, historical | **No** | Not a live tape. Panning implies a stream that is not arriving. |
| Analytics performance/drawdown | derived | **No** | Derived aggregates; motion would imply measurement |
| Market detail candles | per market | **No** | Discrete OHLC — sliding candles misrepresents them |

**Rule:** animate the window only where a new observation genuinely arrives on a regular cadence *and* the series is a live tape. Everywhere else the arrival marker plus freshness indicator already tells the truth better than motion would.

---

## 6 · Implementation sequence

| Step | Work | Gate |
|---|---|---|
| **1** | Decide §3.1 (tip projection) | **Product decision — blocks 2** |
| **2** | Apply the decision to `MarketChart` | Visual + no history contamination |
| **3** | **P-8** Y-axis clipping | `34%` renders as `34%` |
| **4** | **P-9** y-domains; **P-11** gauge domain | No flat-line-looking real series; no >100% closed ring |
| **5** | Restyle both stacks to new tokens (P-2, P-3) | Axes/gridlines/tooltips match across libraries |
| **6** | **Spike** §4.2 pan on `ConfidenceEvolution` only | Tooltip coords intact; no `y` change; gates honoured |
| **7** | Generalise per §5, or abandon and keep P-8/P-9 | — |
| **8** | **P-10** keyboard readout; **P-4** mobile proportions | Axis labels legible at 375px |

Steps 3, 4 and 5 are worth doing **whatever** is decided about animation.

---

## 7 · Validation criteria

**Truth (must all hold):**
- [ ] No rendered point holds a value absent from the engine payload — assert by diffing rendered series against the store slice
- [ ] Under `[data-liveness="inert"]` (mock/offline/stale), no motion anywhere
- [ ] Under `data-reduce-motion` or OS reduced-motion, no motion anywhere
- [ ] With motion disabled, every number still visible and identical
- [ ] Multi-point catch-up after a stale period snaps; it does not glide
- [ ] Stack A: tip written back to its exact confirmed value before append (regression test on the existing behaviour)

**Correctness:**
- [ ] Analytics Drawdown y-axis shows `34%`, not `4%`
- [ ] Kelly gauge cannot render a closed ring above its maximum
- [ ] Flat real series remain distinguishable from a render failure
- [ ] Tooltip values match the store after a pan transition

**Perceptual:**
- [ ] No visible slot-jump on the primary chart at 2s cadence
- [ ] Axes, gridlines and tooltips read as one system across both libraries
- [ ] Chart labels legible at 375px

**Performance:**
- [ ] Stack A holds 60fps with the tab visible
- [ ] No animation work while the tab is hidden
- [ ] Stack B pan does not force a full series reconstruction per frame

---

## 8 · Risks

| # | Risk | Mitigation |
|---|---|---|
| **CR-1** | Pan transform breaks Recharts tooltip coordinate mapping | Spike on one chart (step 6); abandon cleanly if fragile |
| **CR-2** | Someone "simplifies" by setting `isAnimationActive={true}` | The rationale is already in the file header; add a test asserting it stays false |
| **CR-3** | Catch-up glide after an outage draws through positions never held | Snap on multi-point arrival — explicit criterion above |
| **CR-4** | Motion on 7 surfaces at once undoes the rationed-motion decision | §5 restricts it to live tapes; `--motion-ring` stays the value-change signal |
| **CR-5** | Tip projection extended to *other* charts as "consistency" | Stack A's engine is licensed by a 2s live feed; nothing else qualifies |
| **CR-6** | Restyling Stack A disturbs the create-once effect (`[height]` keying) | It is documented as fragile; token changes only, no structural edits |
