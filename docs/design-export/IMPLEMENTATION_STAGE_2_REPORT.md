# PROBEX — Implementation Report · Stage 2 (decisions 1–3 + chart behaviour)

**Date:** 2026-09-08 · **Scope:** Decisions 1, 2, 3 · Q-5 · chart restyle and cross-stack reconciliation
**Nothing committed. Nothing pushed. No packages installed. `package.json` untouched. No backend or endpoint changes.**

Evidence: `docs/design-export/evidence/stage-2/`

---

## 0 · Result

| | |
|---|---|
| Typecheck | **pass** (exit 0) |
| Tests | **162 passed / 13 files** — unchanged |
| Build | **pass** — 22 routes, shared JS 102 kB unchanged |
| Files changed | **6** |
| Arbitrary Tailwind colours / palette classes | **0 / 0** |
| `shadow-surface` refs | **0** |
| Sub-11px literals | **0** |
| `isAnimationActive={true}` on any series | **0** (5 × `false` kept) |
| `lastValueVisible` / `priceLineVisible: true` | **0** |
| Route functionality changed | **none** |

### Files changed

```
src/styles/probex-tokens.css            Decision 2 — 4 themes' primary + derived tokens,
                                        institutional status-stale, aurora logo gradient
src/app/globals.css                     Decision 1 — .btn-primary
src/components/analytics/KellyUtilization.tsx   Decision 3 — over-limit cue
src/components/shared/MarketChart.tsx   Q-5 pinning + canonical grid/axis/crosshair
src/components/shared/LiveChart.tsx     canonical axis/grid/tooltip
src/components/shared/PendingChart.tsx  same treatment
```

---

## 1 · Decision 1 — primary CTA

The gradient is gone. `.btn-primary` is now a flat `--probex-primary` fill with `--probex-on-accent` ink.

```
background: var(--probex-primary);
color:      var(--probex-on-accent);
hover:      filter: brightness(1.08)      (was opacity 0.88 + translateY(-1px))
active:     filter: brightness(0.92)
focus:      2px solid var(--probex-primary), outline-offset 2px
disabled:   opacity 0.45, no filter, not-allowed
radius:     rounded-sm (4px — the direction's sub-component step)
```

Two deliberate choices worth stating:

- **Brightness, not opacity.** Fading opacity fades the ink *and* the fill together, so contrast dropped exactly when the pointer was on the control. Brightness keeps the pair intact.
- **The focus ring is offset, not inset.** A ring in `--probex-primary` drawn *on* a `--probex-primary` fill is invisible. `outline-offset: 2px` puts it on the surface behind the button — the same geometry as `.focus-ring`, so focus reads identically product-wide.

**Measured, all six themes:**

| Theme | Fill | Ink | Contrast |
|---|---|---|---|
| aurora | `#38BDF8` | `#03050D` | **9.50:1** |
| midnight | `#60A5FA` | `#010208` | **8.15:1** |
| quantum | `#22D3EE` | `#020A06` | **11.08:1** |
| emerald | `#5EEAD4` | `#031A10` | **12.25:1** |
| institutional | `#0369A1` | `#FFFFFF` | **5.93:1** |
| ember | `#F26419` | `#0B0705` | **6.32:1** |

**Worst case 5.93:1, was 1.77:1.**

Confirmed in the DOM: `background-image: none`, `background-color: rgb(56, 189, 248)`, `color: rgb(3, 5, 13)`, `border-radius: 4px`.

---

## 2 · Decision 2 — six identities, one architecture

I audited all six themes against the four semantic bands before changing anything. **The brand/YES collision was not an Aurora quirk — four more themes declared `--probex-primary` and `--probex-yes` as the *same hex*:**

| Theme | Was | dE |
|---|---|---|
| midnight | primary = yes = `#3B82F6` | **0.0** |
| quantum | primary = yes = `#00FF88` | **0.0** |
| emerald | primary = yes = `#10B981` | **0.0** |
| institutional | primary = yes = `#2563EB` | **0.0** |

Plus one defect **I introduced in Stage 0–1**: institutional's `status-stale` `#B45309` and `status-degraded` `#C2410C` measured dE 13.8 — below the threshold at which two swatches read as different colours.

### What changed

Only the **interface accent** moved. YES, NO, positive and negative were left alone — they carry market and financial meaning, not brand.

| Theme | primary | Reasoning |
|---|---|---|
| midnight | `#3B82F6` → **`#60A5FA`** | Lighter navy-blue; already declared as `--brand-blue-400` |
| quantum | `#00FF88` → **`#22D3EE`** | Cyan beside the neon-green YES |
| emerald | `#10B981` → **`#5EEAD4`** | Mint above the emerald YES |
| institutional | `#2563EB` → **`#0369A1`** | Deeper professional blue |
| institutional | `status-stale` `#B45309` → **`#854D0E`** | dE vs degraded 13.8 → **33.3**; contrast 5.02 → **6.85:1** |

Every derived token moved with its base — `primary-dim`, `border-active`, `sidebar-item-active-bg/border`, `chart-primary`, `gradient-brand` — with each theme's own alpha values read back rather than assumed (institutional uses weaker washes than the dark themes).

**A safety detail:** midnight's `--probex-yes` is the *same literal* `#3B82F6` as its primary. A blanket hex replace would have silently recoloured the market side. Every edit targets a declaration **by name** inside that theme's block, and the script aborts if `--probex-yes` moves.

Aurora's logo gradient also still started at the retired `#00D4FF`; it now starts at the current primary.

### Verification — all six themes, zero problems

Measured with contrast ratios **and** CIE76 ΔE, because contrast alone cannot answer "are these visually distinguishable": two hues can share a luminance and still look completely different.

| Check | Threshold | Result |
|---|---|---|
| primary vs YES | ΔE ≥ 18 | 23.7 – 69.6 · **all pass** |
| YES vs NO | ΔE ≥ 18 | 21.0 – 96.3 · **all pass** |
| positive vs negative | ΔE ≥ 18 | 104.2 – 150.9 · **all pass** |
| 5 data states, worst pair | ΔE ≥ 18 | 18.1 – 33.3 · **all pass** |
| text primary/secondary/muted on surface | ≥ 4.5:1 | 6.39 – 17.85:1 · **all pass** |
| status colours as text | ≥ 4.5:1 | 4.71 – 5.48:1 · **all pass** |
| on-yes / on-no / on-accent | ≥ 4.5:1 | 5.17 – 14.93:1 · **all pass** |

**Problems found: 0** (was 5). Alpha-composited text tokens were flattened against their own surface before measuring, so the numbers are what the eye actually receives.

Screenshots: `theme-{aurora,midnight,quantum,emerald,institutional,ember}-settings.png`.

---

## 3 · Decision 3 — Kelly over-limit

The gauge already showed the true value with an overflow lap from Stage 0–1. Stage 2 adds the **explicit cue** the decision requires:

- valid range keeps the positive treatment — the completed green ring is retained
- the excess is drawn in `--probex-warning`, with a tick at the maximum
- the sublabel switches **"Utilized" → "Over limit"** in the attention tone
- the accessible label becomes *"Kelly utilization: 150%, above the configured maximum"*

**No green anywhere claims the overflow state is healthy**, and the state survives greyscale because it is carried by a word as well as a colour.

Live confirmation (the engine is genuinely at survival modifier 1.50×):

```
aria: "Kelly utilization: 150%, above the configured maximum"
text: "150%" / "Over limit"
```

Four distinguishable states at 0 / 50 / 100 / 150 remain as validated in Stage 0–1 (`D-2-gauge-0-50-100-150.png`); the live 150% case is `D2-kelly-over-limit.png`.

---

## 4 · Q-5 — the number is pinned, the curve is not

**MarketChart was displaying an unconfirmed number, and the read-out was not the one I expected.**

The accessible summary was already correct — the component's own comments record that `display` is deliberately never read there. But the *visible* numeric read-out was the price-axis label, and the series was configured:

```
lastValueVisible: true,
priceLineVisible: true,
```

Both report the series' **last point** — which is `a.display`, the dead-reckoned tip. The price axis was therefore printing an extrapolated figure and repainting it at 60fps. A curve is read as motion; **a number on an axis is read as a measurement.**

### Fix

- `lastValueVisible: false`, `priceLineVisible: false` — the library no longer reports the tip
- a price line created via `createPriceLine({ price: last.value, axisLabelVisible: true })`, re-priced **only inside the confirmed-arrival effect**
- the handle is cleared on teardown, since it belongs to a series the chart disposes

Everything the rule protects is untouched: lightweight-charts, incremental `setData()`-once-then-`update()`, write-back-of-the-tip-before-append, the two-party motion gate, stale/offline behaviour, and history integrity.

### Verified at runtime

lightweight-charts paints its axis labels into a canvas, so no DOM query can read them. I measured the pixels instead — sampling the plot strip and the price-scale strip 40 times over 6 seconds and counting how often each **changed**:

```
plot strip   changed 20 times  (3.3/s)   <- the curve animates continuously
axis strip   changed  6 times  (1.0/s)   <- the numeric read-out
```

Before the fix both were driven by the same projected value and would change at the same rate. Full probe: `Q5-canvas-probe.txt`.

The headline price in `PriceCard` was independently sampled 60 times over 6s and showed **2 distinct values** — it reads `chart.currentPrice` from the mapper, not the animation, and was already correct.

> **Honest caveat:** the axis strip changes ~6 times rather than ~3. The price-scale canvas also repaints when the *scale range* shifts as the curve moves, even though the pinned label's **value** only changes on confirmation. The 3.3× gap against the plot is the meaningful signal.

---

## 5 · Chart visual language — one product, two libraries

The stacks had been styled independently and disagreed on every shared decision. Side by side on Analytics they read as two products.

| | recharts (was) | lightweight (was) | **both now** |
|---|---|---|---|
| Gridlines | horizontal only | **both directions** | horizontal only |
| Grid colour | `--probex-border` (0.10) | `--probex-chart-grid` (0.05) | `--probex-chart-grid` |
| Axis rule | hidden | **visible border** | hidden |
| Tick colour | `--probex-text-disabled` | `--probex-text-muted` | `--probex-text-muted` |
| Tick face | **inherited sans** | mono | **mono** |
| Tick size | 11px | 11px | 11px |
| Crosshair | dashed `border-strong` | library default | dashed `border-strong`, 1px |
| Tooltip surface | `surface-2` | — | `surface-overlay` |
| Tooltip border/shadow | `border-default` / elev-3 | — | `border-strong` / elev-4 |
| Tooltip value | sans | — | **mono** |

Two of these were substantive rather than cosmetic:

- **Tick colour.** `--probex-text-disabled` is deliberately near-invisible (0.35α) — correct for a disabled control, wrong for an axis, which *is* the scale.
- **Tooltip plane.** A tooltip on `--probex-surface-2` is the same colour as a hovered table row. It now sits on `--probex-surface-overlay`, the plane the direction reserves for floating surfaces.

`PendingChart` was given the same treatment so the placeholder does not diverge from the real charts.

**`isAnimationActive={false}` remains on every recharts series** (5 occurrences). No window-pan animation was introduced — the spike is Stage 2 item 6 in the plan and remains unstarted. Nothing historical, derived, stale, offline or synthetic animates.

---

## 6 · D-1 revalidated after the shared-axis change

Moving ticks to the mono face changes their advance width, so `AXIS_CHAR_PX` was recalibrated (6.2 → 6.8 in Stage 0–1 for the 11px size; mono is *more* predictable than proportional sans, so the estimate is now conservative rather than approximate).

Re-read from the rendered DOM:

| Chart | Font | Ticks |
|---|---|---|
| Drawdown | 11px ui-monospace | `-92% -91% -90% -89% -88%` |
| Capital Growth | 11px ui-monospace | `$0 $550 $1.1K $1.7K $2.2K` |
| Edge/confidence | 11px ui-monospace | `0% 25% 50% 75% 100%` |

No clipping. All 10 chart instances across Analytics, Portfolio, Consensus and Market Detail were exercised.

---

## 7 · Validation

| Check | Result |
|---|---|
| Typecheck | pass |
| Tests | 162/162, 13 files, unchanged |
| Build | pass, 22 routes, 102 kB shared |
| D-1 across affected instances | pass — tick text read from the DOM |
| D-2 at 0/50/100/150 | pass — four distinguishable + explicit cue |
| Q-5 numeric read-out | pass — pixel-diff probe, 3.3× gap |
| Live vs stale/offline/mock | unchanged — motion gate and `ChartFrame` states untouched |
| Reduced motion | **0 animations, 0 transitions** under the OS query (86 transitions when allowed) |
| Six themes | 0 problems across 42 measured constraints |
| Accessibility contrast | worst `.btn-primary` 5.93:1; worst token pair 4.47:1 |
| Arbitrary colours / palette classes | 0 / 0 |
| Type floor | smallest rendered font 11px |
| Backend / endpoints / functionality | no changes |

**Screenshots captured:** Overview hero (`Q5-overview-hero.png`), Analytics charts (`after-analytics-charts.png`), Portfolio charts (`after-portfolio-charts.png`), Kelly gauge (`D2-kelly-over-limit.png`), all six themes.

---

## 8 · Remaining concerns

| # | Item | Status |
|---|---|---|
| **S2-1** | **`emerald` declares `--probex-yes` and `--probex-positive` as the same `#10B981`.** A YES position and a gain are the same colour in that theme. Not in the required checklist, so I did not change it unasked — but MARKET SIDE and FINANCIAL DIRECTION are separate bands in the architecture. | **Your call** |
| **S2-2** | `.btn-yes` and `.btn-no` still use gradients. `.btn-no` also carries the *secondary* violet rather than `--probex-no`, so its ink cannot be tokenised without recolouring it. | Logged; belongs with the button/palette work |
| **S2-3** | The recharts window-pan spike (plan item 6) was **not started** — correctly, it is gated behind this stage. | Deferred |
| **S2-4** | Radius `lg` 10→6 and asymmetric density from Stage 0–1 remain **visible app-wide changes** that have not had a route-by-route eyeball. | Worth a pass before Stage 3 |
| **S2-5** | The Drawdown series renders as a near-flat line because the value genuinely is flat. Indistinguishable from a render failure — pre-existing debt (#15), untouched. | Pre-existing |
| **S2-6** | The theme picker exposes **3 of 6** themes. All six are now correct, but three are unreachable from the UI. | Pre-existing |
| **S2-7** | The Q-5 axis probe shows ~6 repaints vs ~3 confirmations, because the price scale also repaints on range shifts. The label's *value* is confirmed-only. | Explained above |

---

## 9 · Environment

Your dev server on :3000 was stopped for each `.next` rebuild and **restarted afterwards** — it is running.

---

## 10 · Stopping here

**The Overview redesign has not been started**, as instructed. Stage 2's scope is complete: decisions 1–3 implemented and measured, Q-5 in place and verified at runtime, both chart stacks restyled onto one language, D-1 and D-2 revalidated.

Awaiting your decision on **S2-1** (emerald YES = positive) and your go-ahead for Stage 3.
