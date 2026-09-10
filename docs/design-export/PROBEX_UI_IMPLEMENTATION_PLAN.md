# PROBEX — UI Implementation Plan

**Date:** 2026-09-08 · **Status: NOT APPROVED — plan only. No code has been modified.**
**Inputs:** `STITCH_RECONCILIATION.md` · `CHART_FLUIDITY_PLAN.md` · `stitch-pilot/TOKEN_MAP_TEMPLATE.md` · `design-export/current/`

---

## Governing rules

Applied to every stage below; not restated per stage.

1. **The §4 reconciliation table is the gate.** Nothing marked **D** (invented functionality) or **E** (invented data) is implemented. The `Stake` button is rejected outright.
2. **Token layer before component layer.** The repo currently has **0** arbitrary Tailwind colour values and **0** raw palette classes. That is the regression baseline.
3. **Stitch supplied Overview only.** No System screen was rendered. Its visual language is inferred from `DESIGN.md` prose, and Stage 7 carries that caveat.
4. **Per-route purpose is preserved.** Positions stays positions-shaped; Analytics stays analytics-shaped. One design system, not one layout.
5. **No dependency installs** without an explicit decision (Q-1 fonts, Q-2 icons).
6. **Existing safety model is untouchable** — write gate, confirm gate, paper-mode blocking, `available:false` two-shape handling, `—`-not-`0`, the six data states.

### Blocking decisions

| | Question | Blocks |
|---|---|---|
| **Q-1** | Adopt Geist + JetBrains Mono? If yes, `next/font/local` + vendored woff2 only — never `fonts.googleapis.com` | Stage 1 (partially), Stage 8 |
| **Q-2** | Material Symbols, or keep inline SVG? | Stage 4 |
| **Q-3** | Should Overview indicate a *custom* profit target is in force? | Stage 3 |
| **Q-4** | Sidebar auto-collapse 1024–1439 vs. persisted user preference | Stage 6 |
| **Q-5** | Chart tip projection — keep / pin the number / pin both | Stage 2 |
| **Q-6** | Which 5 of 10 routes get bottom-nav tabs | Stage 6 |

**Q-1 and Q-5 are the two that genuinely change the work.** The rest can default: Q-2 keep SVG, Q-3 show the marker, Q-4 preference wins, Q-6 the current five.

---

## Stage 1 — Design tokens & primitives

*The single highest-leverage stage. Everything downstream is cheap or expensive depending on how completely this lands.*

**Files**
- `src/styles/probex-tokens.css` — **all six themes**
- `tailwind.config.ts` — fontSize floor, radius, shadow vocabulary, spacing
- `src/app/globals.css` — `.t-*` semantic classes
- `src/components/ui/Panel.tsx`, `Card.tsx`, `StatusChip.tsx`
- `src/components/shared/ProvenanceBadge.tsx`, `FreshnessIndicator.tsx`

**Work**
1. Re-value 8 existing tokens (primary, yes, no, text ×3, border ×2)
2. Add 6 new tokens × 6 themes = **36 declarations**: `surface-lowest`, `surface-overlay`, `status-offline`, `status-synthetic`, `status-degraded`, `on-accent`
3. **Fix G-1/G-2** — replace hardcoded `#050816`/`#fff` at `PortfolioAllocation.tsx:127`, `PositionDetail.tsx:38`, `SettledPositions.tsx:94` with `--probex-on-accent`. `#050816` is a *stale* background value; this is a live inconsistency, not just a redesign artefact.
4. Raise the type floor 10px → 11px; retire or repurpose `2xs`
5. Asymmetric density: dense `6/10`, standard `12/16`, focal `20`
6. Radius → 4 / 6 / 8; delete unused steps
7. **Retire one shadow vocabulary** — keep `elev-1…4`, drop `shadow-surface*` (debt #7)
8. Q-1: if yes, `next/font/local` + vendored woff2 and a `--font-display` variable

**Depends on:** Q-1 only for step 8. Steps 1–7 can proceed now.

**Risks:** a missed theme ships a broken palette on five unexercised themes (RK-5) — define all 36 in one commit · the 11px floor increases the footprint of every badge, which may reflow dense headers · re-valuing `--probex-primary` touches every focus ring.

**Must remain untouched:** `--probex-bg` `#03050D` and `--probex-surface` `#0C1424` (Stitch adopted ours) · the uneven surface ladder — the `bg → surface` jump is deliberately largest and evening it out re-breaks card definition · motion tokens · z-index scale · `Panel`'s left rail, which already implements Stitch's proposal.

**Validation:** all six themes render every surface · **0 arbitrary colour values still** · no text below 11px · greyscale screenshot still distinguishes all six data states · contrast measured for `text-muted` on `surface` and `on-accent` on YES/NO/primary · `data-high-contrast` and `data-text-size` still work.

---

## Stage 2 — Chart behaviour

*Per `CHART_FLUIDITY_PLAN.md`. Ordered so the honest fixes land before the optional one.*

**Files:** `shared/MarketChart.tsx`, `shared/LiveChart.tsx`, `shared/ChartFrame.tsx`, `shared/RadialGauge.tsx`, the 7 LiveChart consumers

**Work (in order)**
1. **P-8 — Y-axis clipping.** `width={40}` clips leading digits; Analytics Drawdown renders `34%` as `4%`. **Actively misleading; do this first.**
2. **P-11 — `RadialGauge` domain.** Cannot render a closed ring above maximum (`150% UTILIZED`)
3. **P-9 — y-domains** applied consistently to non-zero-based series
4. Restyle both stacks to Stage 1 tokens; reconcile axes/gridlines/tooltips across the two libraries
5. Q-5 decision applied to `MarketChart`'s tip
6. **Spike only** — window-pan transform on `ConfidenceEvolution`. Generalise per §5 of the chart plan, or abandon

**Depends on:** Stage 1 tokens; Q-5 for step 5.

**Risks:** CR-1 pan breaks Recharts tooltip coordinates — spike first, abandon cleanly · CR-6 `MarketChart`'s create-once effect is documented as fragile under `[height]` re-keying — **token changes only, no structural edits** · CR-2 someone flips `isAnimationActive` to true.

**Must remain untouched:** `isAnimationActive={false}` on Recharts series · write-back-before-append in `MarketChart` · the two-party motion gate · `ChartFrame`'s six states and required `aria-label` · `StaleStrip`.

**Validation:** full checklist in `CHART_FLUIDITY_PLAN.md` §7. Non-negotiable: no rendered point holds a value absent from the payload; no motion under inert liveness or reduced motion; multi-point catch-up snaps.

---

## Stage 3 — Overview

**Files:** `overview/EngineStateBand.tsx`, `EngineFocusHero.tsx`, `GlobalConsensusBar.tsx`, `shared/PriceCard.tsx`, `shared/TargetProgress.tsx`, `app/dashboard/page.tsx`

**Work**
1. Adopt two-thirds chart / one-third Engine Focus
2. **Reuse the 4-up instrument rail as-is** — it is already Stitch's "primary anchor"
3. Apply the three-tier hierarchy (one primary figure per panel)
4. Move the attention band so it no longer outranks the engine's own state (debt #4)
5. **Provenance badges → semantic labels** (`LIVE` / `DERIVED` / `STALE` / `SYNTHETIC`); endpoint path moves to the tooltip. **Your §6, and the largest single user-facing improvement in the export.**
6. **Strip every E-row** from §4.2–4.6: no 24H high/low/volume, no volatility band, no momentum vector, no EV, no Kelly dollar allocation, no "8 market feeds", no "Strong Yes"
7. Q-3: custom-target marker
8. Verify `PAPER` and `SYNTHETIC` render as **independent** chips (R-2)

**Depends on:** Stages 1–2, Q-3.

**Risks:** RK-1 invented metrics slip in because they look authoritative · RK-6 PAPER/SYNTHETIC collapse · removing endpoint paths from badges must not remove them from the DOM entirely — they are diagnostic value, so tooltip/`title`, not deletion.

**Must remain untouched:** `selectPerformanceSource` mode-aware provenance · `selectExposureSource` (positions authoritative, **no** stats fallback) · `—` for withheld values · freshness per panel · the attention band's real warning content.

**Validation:** every figure traceable to a real field · LIVE/MOCK/OFFLINE/STALE captures re-run and compared against `current/screens/states/` · no new endpoint calls · no `Stake`-like control anywhere.

---

## Stage 4 — Shared market/event components

**Files:** new `shared/MarketCard.tsx` and `shared/ExpiryRow.tsx`; `markets/MarketFilterBar.tsx`, `shared/EdgeTable.tsx`, `shared/EventStream.tsx`, `shared/DataTable.tsx`; **retire** `ui/StatCard.tsx`

**Work**
1. Promote the market card and edge/expiry row to shared primitives (currently composed ad hoc on Overview and Markets)
2. Filter chips using the **engine's real `asset_category` vocabulary** — `crypto`, `macro`, `politics`, `sports`, `entertainment`, `science_tech`. **Not** Stitch's `ESPORTS`.
3. Add result-count feedback to filters (debt #22)
4. `DataTable`: header on `surface-lowest`, mono right-aligned numerics, hover-only (no striping)
5. **Fold `StatCard` into `Panel density="dense"`** (debt #9)
6. Q-2 icons
7. *Optional:* join `closes_at` from the market onto the edge row to enable "closing in" (§4.6 — real data, currently unjoined)

**Depends on:** Stages 1, 3; Q-2.

**Risks:** `openInterest`, `liquidity`, `sentiment`, `tags`, `status` are **explicitly null — "not on the wire"**. A shared card must render them as absent, never as `0` or a placeholder figure · `volume24h` is real but tiny (~`744.59`) — the design must not assume Stitch's `$642,810` magnitude · retiring `StatCard` touches every consumer.

**Must remain untouched:** `mappers/markets.ts` and `mappers/edges.ts` parse-or-report guards · `{ kind: 'unrecognized' }` handling · `parseVolume` accepting both string and number.

**Validation:** null fields render as absent · unrecognised rows still degrade · table horizontal scroll intact · zero new fields invented.

---

## Stage 5 — Remaining desktop pages

*Apply the language per route. Do not force the Overview composition onto anything.*

| Route | Keeps being | Main work |
|---|---|---|
| Live Feed | activity/feed | Stream density; preserve the pause affordance (debt #21) |
| Positions | positions | Table treatment; direction filters |
| Portfolio | portfolio | Chart restyle; `PerformanceWindow` |
| Execution | execution | **Mutation controls untouched** — restyle only |
| Strategy | intelligence | Densest surface; consensus components |
| Markets | discovery | Stage 4 primitives; grid/table toggle |
| Market Detail | single market | lightweight-charts reconciliation |
| Analytics | analytics | **§10 special case — see below** |
| Settings | configuration | Theme picker must preview all six re-valued themes |

**Analytics (your §10).** 3254px at 1440 with three bands and no in-page navigation. **Density must not be solved by deleting content.** Approach: in-page anchor navigation for the three bands; sticky band headers; grouping within bands; `PendingChart`/`AwaitingBackend` slots unchanged. **If any proposal requires removing meaningful information, it stops and is raised — not done silently.** Note Stitch's Prompt 6 (the Analytics stress test) was never run, so there is no external input here.

**Depends on:** Stages 1–4.

**Risks:** RK-7 route homogenisation · Strategy/Consensus is the densest surface and the real test of whether the system holds · Execution restyle must not touch write-gate or confirm-gate logic.

**Must remain untouched:** all mutation gating · `available:false` two-shape handling · `EmptyState` / `AwaitingValue` / `PanelPending` remaining three *distinct* families · Consensus `assetPrice` null-branch (the crash site).

**Validation:** each route keeps its IA and every current figure · no route gains a control it lacks today · Strategy/Consensus renders under both available and unavailable consensus.

---

## Stage 6 — Responsive & mobile

**Files:** `layout/Sidebar.tsx`, `TopNavigation.tsx`, `EngineStatusStrip.tsx`, `DashboardLayout.tsx`; new `layout/BottomNav.tsx`

**Work**
1. **Bottom navigation** below `md` — new component, real routes only. Q-6 decides the five; the other five stay reachable (drawer or "More")
2. **Fix the mobile ticker (debt #27)** — BTC price is currently *dropped* below ~640px rather than reflowed. Stitch condenses it to price + health pill. Real improvement.
3. Compact header at 375px (debt #28)
4. Scroll-affordance fade rails on horizontally scrollable tables (debt #29)
5. Chart proportions at mobile widths (debt #30)
6. Sidebar 200→216px; Q-4 auto-collapse rule
7. 768px tablet — still the tightest composition (debt #31); Stitch's drilldown drawer for secondary diagnostics addresses it
8. Touch targets: **Stitch does not solve this.** Its 32px inputs and 22px badges remain below 44px. The prepared Group A change (`.nav-item` `py-2.5` → `py-3`) is ready and independent.

**Depends on:** Stages 1, 3, 4; Q-4, Q-6.

**Risks:** bottom nav + existing drawer = two mobile navigation systems; one must clearly win · auto-collapse overriding an explicit user preference is a real annoyance (Q-4) · bottom nav must not obscure content or fight iOS safe-area insets.

**Must remain untouched:** drawer focus trap and focus-return in `DashboardLayout.tsx` (documented, previously buggy) · zero document-level horizontal overflow at all eight viewports · tables scrolling inside their own containers.

**Validation:** re-capture all eight viewports and diff against `current/screens/` · zero horizontal overflow · focus trap intact · every one of the ten routes reachable on mobile · touch targets measured, not estimated.

---

## Stage 7 — System & diagnostics

*Highest uncertainty: **Stitch never rendered this page.***

**Files:** `system/SystemStatePanel.tsx`, `SystemMetricsPanel.tsx`, `DiagnosticsPanel.tsx`, `events/EventLog.tsx`

**Work**
1. **Group the 14 flat runtime chips by importance** (debt #43) — using the **real** component names (`clob_client`, `resolution_tracker`, `price_feed`, `main_loop`, `api_access`, `memory`, …). **Stitch's "Core Execution / Oracle Feeds / Risk Engine" cluster names are invented** and must not be adopted as-is.
2. Dense density mode throughout
3. Circuit states as explicit `CLOSED` / `HALF-OPEN` / `TRIPPED`
4. Memory metrics with unit bounds
5. **This is the one page where raw endpoint paths stay fully visible** — operator vocabulary belongs here
6. Keep the honest `POST /api/update-stats` note (debt #42) — decide whether it is product copy or a diagnostic

**Depends on:** Stages 1, 4.

**Risks:** RK-7 — extrapolating a cockpit language from a page Stitch never drew · a real grouping taxonomy requires reading the actual component list, not guessing · System's `DEGRADED` is a **live fault surface**, not a decorative accent.

**Must remain untouched:** health probe pass/fail semantics · per-endpoint circuit state · layered truth in `SystemStatePanel` (runtime mode / health / identity) · Endpoint Diagnostics as the operator's real request ledger.

**Validation:** every current diagnostic still present · grouping derived from real names · degraded state visually unmistakable · **strongly recommend running the System prompt in Stitch before this stage.**

---

## Stage 8 — Visual & accessibility regression

**Work**
1. Re-run the full 118-screenshot capture harness; diff against `current/`
2. Contrast audit — every new token pair measured
3. Greyscale audit — all six data states distinguishable without colour
4. Keyboard walk of all ten routes; focus ring is **2px** (Stitch's 1px is a downgrade)
5. Reduced-motion and `data-liveness="inert"` — no motion anywhere
6. All six themes on the Settings picker
7. Eight viewports; zero horizontal overflow
8. Q-1 assertion: if fonts adopted, verify `document.fonts` lists the **real** faces, not `"<Family> Fallback"` — this is exactly how the previous webfont setup failed silently
9. Full `vitest` suite (currently 162 passing) + typecheck + production build
10. Screen-reader pass on chart summaries and status announcements

**Depends on:** all stages.

**Risks:** RK-3 silent font fallback · capture harness assumes the current shell geometry and may need updating for bottom nav · a full re-capture takes hours and needs a healthy backend — during the last export the engine became fully unresponsive.

**Validation:** no regression against the `current/` baseline except intended changes · every intended change traceable to a reconciliation row.

---

## Sequencing summary

```
Q-1 Q-5 ──┐
          ▼
Stage 1 tokens ──► Stage 2 charts ──► Stage 3 Overview ──► Stage 4 primitives
                                                                  │
                          ┌───────────────────────────────────────┤
                          ▼                                       ▼
                   Stage 5 desktop                        Stage 6 responsive
                          └───────────────┬───────────────────────┘
                                          ▼
                                   Stage 7 System ──► Stage 8 regression
```

Stages 5 and 6 can run in parallel. **Stage 7 should wait for a Stitch System pass.**

---

## What could be done first, at lowest risk

If you want visible progress before answering Q-1/Q-5, these are self-contained, close documented debt, and do not depend on any Stitch decision:

1. **Stage 2 step 1** — Y-axis clipping. `34%` currently renders as `4%`. **Actively misleading and the single highest-value fix here.**
2. **Stage 2 step 2** — `RadialGauge` domain (`150% UTILIZED` on a closed ring)
3. **Stage 1 step 3** — `--probex-on-accent`; removes three hardcoded hex values, one of which is a stale background colour
4. **Stage 1 step 7** — retire the duplicate shadow vocabulary
5. **Stage 6 step 8** — the prepared `.nav-item` touch-target change

Each is small, independently validatable, and correct regardless of which visual direction is ultimately approved.
