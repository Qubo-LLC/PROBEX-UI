# PROBEX — Stitch Design Reconciliation

**Date:** 2026-09-08 · **Phase:** audit only — no application code modified
**References:** `stitch-pilot/output/` — `DESIGN.md`, `STITCH-overview-desktop.{png,html}`, `STITCH-overview-mobile.{png,html}`

> **Provenance note.** Two Stitch export folders were supplied. Their `DESIGN.md` files are **byte-identical**; the screenshots differ (1485×1600 desktop, 330×1600 mobile). They are two viewports of one design, not two alternatives. **No System-page redesign was produced**, so every statement about System below is inferred from `DESIGN.md` prose, not from a rendered screen.

---

## 1 · Verdict

**The direction is strong enough to become the implementation target.** `DESIGN.md` is a serious token contract, not a mood board — it independently identified and fixed three items from our own visual-debt register, and its structural vocabulary (milled top-edge highlights, 2px left status rail, four-tier surface ladder) matches what PROBEX already implements.

Two things must be stripped before implementation:

1. **An invented execution control.** The mobile and desktop screens both render a **`Stake` button** on edge cards. PROBEX has no one-click order placement. This is not a styling question — it is a trading affordance that does not exist and must not be built.
2. **Roughly a dozen invented metrics** presented with the same authority as real ones (Oracle Spread, Kelly EV, Momentum Vector, Open Interest, 24H High/Low/Volume). In a product whose entire discipline is "never render a number the engine did not report", these are the highest-risk items in the export.

Everything else is either directly implementable or a bounded decision.

---

## 2 · Concepts worth keeping

### 2.1 Adopt as specified — Stitch is right and we are wrong today

| Concept | Why it wins | Debt it closes |
|---|---|---|
| **Brand / YES disaggregation** | `--probex-primary` → Electric Sky `#38BDF8`; YES → High-Frequency Aqua `#00F2FE`; NO → Orchid Purple `#C084FC`. A focus ring and a YES position stop being the same colour. | Visual debt #6, token debt #1 |
| **11px readability floor** | Bans sub-11px type. Our `2xs` is 10px and carries provenance, freshness, endpoint paths and circuit state. | Visual debt #12, #38 |
| **Secondary/disabled separation** | `#94A3B8` (~0.70α) vs `#334155` (~0.35α). Ours are 0.62 vs 0.50 — "de-emphasised" and "unavailable" currently read alike. | Visual debt #37 |
| **Five explicit status colours** | `live` Emerald · `stale` Amber · `degraded` Orange · `offline` Crimson · `synthetic` Indigo. We have no dedicated tokens for offline/synthetic/stale — `ProvenanceBadge` composes them from warning/muted/border. | Token gap G-3 |
| **Semantic provenance labels** | `LIVE TICK` / `DERIVED` / `ORACLE SYNTH` in the badge; raw `/api/...` moved to tooltip and System. Exactly your §6. | Visual debt #48 |
| **Asymmetric density tokens** | dense `6/10`, standard `12/16`, focal `20`. Ours are symmetric `p-3/p-4/p-5`. Horizontal-heavier padding is correct for label→value rows. | — |
| **Milled-panel elevation** | Inset top specular highlight + drop shadow, explicitly *replacing* floating shadows and blur. | Visual debt #7 (two shadow vocabularies) |
| **Tighter radius scale** | 4px badges / 6px panels / 8px overlays. Collapses our seven steps to three in-use values. | Visual debt #8 |
| **Left status rail** | 2px rail: nominal / degraded / fault. | **Already implemented** — `Panel.tsx:137` documents it as "a shape cue that survives greyscale, colour-blindness". Stitch converged on our existing solution. |

### 2.2 Adopt with adaptation

| Concept | Adaptation required |
|---|---|
| **Mobile bottom navigation** | Directionally right; five tabs (Overview · Feed · Markets · Positions · System) against ten routes means Portfolio, Execution, Strategy, Analytics and Settings need a reachable home. New component, but **not** invented functionality — same routes. |
| **Two-thirds chart / one-third Engine Focus** | Better than today's stacked hero. Must survive the 4-panel instrument row below it. |
| **Sidebar auto-collapse 1024–1439px** | We have `lg` 1024 / `xl` 1280 / `2xl` 1440. Implementable, but auto-collapse overrides a user preference that currently persists — needs a rule for which wins. |
| **Sidebar 216px / header 52px** | Header already 52px (`3.25rem` matches). Sidebar 200px → 216px is a 16px change; cheap, but verify the 768px tablet case, still our tightest composition. |
| **Grouped System probes** ("Core Execution / Oracle Feeds / Risk Engine") | Directly answers visual debt #43 (14 flat chips). **But those three cluster names are invented.** The real components are `clob_client`, `resolution_tracker`, `price_feed`, `main_loop`, `api_access`, `memory` and eight others. Grouping is right; the taxonomy must be derived from the real component list, not from Stitch's guess. |
| **Category filter chips** | `asset_category` is real: `crypto`, `macro`, `politics`, `sports`, `entertainment`, `science_tech`. Stitch shows `CRYPTO` (real), `FOMC & MACRO` (real, relabelled), **`ESPORTS` (not in the vocabulary — `sports` is)**, and `FAST CLOSES` (derivable from real `duration_minutes`). Keep the pattern, use the engine's own vocabulary. |

### 2.3 Concepts requiring product clarification

| # | Question | Why it is not mine to decide |
|---|---|---|
| **Q-1** | **Adopt Geist + JetBrains Mono as real webfonts?** | The Stitch HTML loads both from `fonts.googleapis.com` — **precisely the mechanism this repo deliberately removed**. `globals.css:30-62` records why: `next/font/google` made typography a network-dependent build input that degraded *silently* (`document.fonts` listed only "Inter Fallback"), so two builds of the same commit could ship different typography. Self-hosting via `next/font/local` with vendored `.woff2` files solves the original problem properly — but it means adding font binaries and the `geist` package. That is a dependency decision, and you have not authorised installs. **This is the single largest visual delta in the export.** |
| **Q-2** | **Material Symbols icons?** | Stitch's HTML pulls a Google icon webfont. We ship **zero** icon dependencies — every icon is inline SVG. Adopting Material Symbols adds a network font *and* a second icon vocabulary. Recommend: keep inline SVG, borrow the visual weight. |
| **Q-3** | **Which target is authoritative on Overview?** | Already resolved architecturally (see §6) — confirming the existing rule is deliberate, not accidental. |
| **Q-4** | **Sidebar auto-collapse vs. user preference** | Below 1440px, does viewport width override a user who explicitly expanded the sidebar? |

---

## 3 · Concepts to reject

| # | Item | Reason |
|---|---|---|
| **R-1** | **`Stake` button on edge cards** | **Invented execution control.** PROBEX places no orders from Overview. Mutations exist only on Execution → Paper, are confirm-gated, and are write-gate blocked unless paper mode is confirmed. A one-tap stake affordance on the dashboard inverts that entire safety model. Reject outright. |
| **R-2** | **`status-synthetic` defined as "simulated paper-mode, backtesting, or interpolated feeds"** | **Collapses two states you explicitly required kept apart.** PAPER MODE = the real engine trading simulated money against real market data. SYNTHETIC = mock data with no backend at all. Stitch's desktop header shows `SYNTHETIC SIM` *and* `PAPER MODE` simultaneously — visibly conflating them. Keep the Indigo token; **narrow its definition to mock/offline-substituted data only**. Paper mode stays a separate `PAPER` chip. |
| **R-3** | **"or interpolated feeds" as a labellable data state** | Implies fabricated intermediate values are acceptable if badged. They are not. See `CHART_FLUIDITY_PLAN.md`. |
| **R-4** | **1M / 5M / 15M / 1H / 24H interval selector on the price chart** | `/api/price-history` returns one series with no interval parameter. The control implies server-side re-aggregation that does not exist. |
| **R-5** | **`#051424` / Material-3 palette block** in `DESIGN.md` frontmatter | The frontmatter carries **two competing systems**: a Material-3 `surface-container-*` / `on-primary-container` set built on `#051424`, and a PROBEX-specific `bg-*` set built on `#03050D`. Only the second is ours. Importing both is exactly the "third competing visual vocabulary" your §9 forbids. Take `bg-base`…`bg-surface-overlay`, `market-*`, `status-*`, `text-*`, `border-*`; discard the Material-3 block entirely. |
| **R-6** | **"Consensus: Strong Yes"** | `interpretation` has exactly one observed value on the live wire: `"NEUTRAL"`. Inventing a richer vocabulary implies engine behaviour we have not seen. |
| **R-7** | **"8 Integrated Market Feeds"** | `signal_count` is real, but the five signals are *indicators* (edge direction, edge confidence, RSI momentum, MACD trend, price momentum) — not market feeds. Wrong noun, misrepresents the architecture. |

---

## 4 · Real vs invented — reconciliation table

Categories: **A** existing real data · **B** existing, needs visual restructuring · **C** existing data represented differently · **D** invented functionality · **E** invented data.

### 4.1 Header / global chrome

| Stitch element | Cat | Backing |
|---|---|---|
| `BTC $67,428.50 +2.41%` | A | `EngineStats.currentPrice` |
| `285ms` feed latency | A | `EngineStats.feedLatencyMs` |
| `2/4 PROBES HEALTHY · DEGRADED` | B | `healthComponents[]` pass/fail + `healthStatus` |
| `PAPER MODE` | A | `ExecutionPolicy.mode` |
| `synced just now` | A | `LiveHeartbeat` |
| `Jump to page… ⌘K` | A | `CommandPalette` |
| **`12ms Feed Pulse`** | **E** | A *second* latency figure beside the real 285ms. No such field. |
| **`SYNTHETIC SIM` badge** | **D** | Shown while `PAPER MODE` is also shown — see R-2. |

### 4.2 Price / chart panel

| Stitch element | Cat | Backing |
|---|---|---|
| Price line series | A | `PriceHistory.history[{ts, price}]` |
| `LIVE 5s STREAM` badge | C | Real, but the tier is 2s (`FAST_MS`), not 5s |
| **`24H HIGH` / `24H LOW`** | **E** | Not on the wire. Derivable only if the window is genuinely 24h — it is not (40 points). |
| **`VOLUME: $1.48B`** | **E** | No volume field on `/api/price-history` at all. |
| **`Volatility Band: ±$148.50`** | **E** | Computable as stddev, but rendered as an engine measurement. |
| **`Momentum Vector: +1.84 m/s`** | **E** | No such field. Units are physically meaningless for price. |
| **`1M 5M 15M 1H 24H`** | **D** | See R-4. |

### 4.3 Engine focus / consensus

| Stitch element | Cat | Backing |
|---|---|---|
| `+47.9% EDGE` gauge | A | `EdgeRow.edgePct` |
| `Calculated Confidence 62.4%` | A | `ConsensusReading.confidence` |
| `YES PROBABILITY 72.8% / NO 27.2%` | A | `market_yes_price` / `market_no_price` |
| `Opportunity Scan: 3 under review` | A | `EngineEdges.count` |
| `(1.5% min edge)` | A | `SurvivalStatus.minEdgeThreshold` |
| `Inspect Opportunity →` | A | Navigation only |
| **`Expected Value (EV) +14.2¢/share`** | **E** | No EV field on consensus or edges. |
| **`Kelly Allocation 0.8x ($42.00)`** | **C/E** | `kelly_fraction` and `kellyModifier` are real; the **dollar allocation is computed nowhere**. Multiplier real, dollars invented. |
| **`8 Integrated Market Feeds`** | **E** | See R-7. |
| **`Consensus: Strong Yes`** | **E** | See R-6. |

### 4.4 Instrument rail

| Stitch element | Cat | Backing |
|---|---|---|
| `CAPITAL RUNWAY $356.91` | A | `SurvivalStatus.currentCapital` |
| `Session P&L +$256.91` | A | `dailyPnl` |
| `(Session target met)` | A | `dailyTarget` comparison |
| `3 / 10 Slots` | A | `positions.count` / `maxConcurrentPositions` |
| `30% Active Pool` | C | Derivable from `maxBetPercent` |
| `WIN HIT RATE 76.0%` | A | `PaperStats.winRate` (already unit-corrected via `pctToFraction`) |
| `82 Won / 26 Lost` | A | `PaperStats` wins/losses |
| `108 Filled Orders` | A | `EngineStats.ordersExecuted` |
| `ENGINE RUNTIME 10h 24m` | A | `EngineStats.uptimeSeconds` |
| `Degraded 2/4` | A | `healthComponents` |
| **`Max Slot Size $50.00`** | **C** | `minimum_order_size_usd` is real; a *maximum* is not. Derivable from `maxBetPercent × capital` — label must match what is computed. |
| **`Unassigned: $206.91`** | **C** | Derivable (capital − allocated); not a wire field. |
| **`0 unsettled`** | **E** | No unsettled counter exists. |

### 4.5 Market discovery

| Stitch element | Cat | Backing |
|---|---|---|
| Market title, YES/NO cents | A | `MarketRow.title`, `yesPrice`, `noPrice` |
| `Vol: $642,810` | A | `MarketRow.volume24h` — **field real, magnitude fictional** (live values are ~`744.59`) |
| `5M SPEED` / `HOURLY` badges | A | `durationMinutes` |
| `MACRO` / `CRYPTO` tags | A | `asset_category` |
| `Inspect` button | A | Navigation to market detail |
| **`Open Interest: $189.4K`** | **E** | `MarketRow.openInterest` is **explicitly `null` — "not on the wire"**. |
| **`Spread: 0.5¢ tight`** | **E** | No spread field. |
| **`Confidence: 71.2%`** on a *market* card | **E** | Confidence exists on **edges**, not markets. Would require a join that does not exist. |
| **`ESPORTS` / `LPL FINALS`** | **E** | Not in the engine's category vocabulary. |

### 4.6 Imminent expirations

| Stitch element | Cat | Backing |
|---|---|---|
| `EDGE +48.2%` | A | `EdgeRow.edgePct` |
| `YES @ 42¢` | A | `market_yes_price` |
| `Review All 14 Detected Edges` | A | `EngineEdges.count` |
| **`CLOSING IN 4m 12s`** | **B** | Real data, **not currently joined**: `closes_at` lives on the market, edges carry only `market_id`. Implementable; requires a market lookup. |
| **`Oracle Spread: 0.1¢`** | **E** | No such field anywhere. |
| **`Kelly EV: +$18.40`** | **E** | `kellySize` is `null` — "not on the wire". |
| **`Stake` button** | **D** | **R-1. Reject.** |

### 4.7 Mobile-specific

| Stitch element | Cat | Backing |
|---|---|---|
| Bottom nav (5 tabs) | B | Real routes, new navigation component |
| Compact header, BTC + health pill | B | Fixes visual debt #27 (price currently *dropped* below 640px) |
| Single-column stack | B | Already the behaviour |
| `Inspect Active Opportunity →` | A | Navigation |
| `Diagnostics →` | A | Navigation to System |
| **`2/4 Probes` pill in header** | A | Real |

**Summary: 11 invented data points (E), 3 invented controls/behaviours (D), 1 of which (R-1 `Stake`) is a safety-relevant trading affordance.**

---

## 5 · Component reuse map

| Stitch construct | Existing component | Change required |
|---|---|---|
| Instrument panel + milled highlight | `ui/Panel.tsx` | Token-level only — rail, density, states, provenance slot already exist |
| Left status rail | `Panel` `state` prop | **None** — already implemented |
| Provenance badge (semantic label) | `shared/ProvenanceBadge.tsx` | Label vocabulary + tooltip for the endpoint; 7 variants already exist |
| Freshness | `shared/FreshnessIndicator.tsx` | Type-size change only |
| Status pills | `ui/StatusChip.tsx` | New tones for `offline` / `synthetic` |
| Focal metric | `Panel.Focal` + `.t-metric*` | Mono family + size |
| 4-up instrument rail | `overview/EngineStateBand.tsx` | **Reuse as-is** — this is Stitch's "primary anchor", and it is already ours |
| Price chart | `shared/LiveChart.tsx` + `ChartFrame` | See `CHART_FLUIDITY_PLAN.md` |
| Radial gauge | `shared/RadialGauge.tsx` | Restyle; **fix the 150% overflow first** |
| Market cards | `markets/*` + `mappers/markets.ts` | Composition change; drop invented fields |
| Edge rows | `shared/EdgeTable.tsx`, `mappers/edges.ts` | Add market join for `closes_at`; **no Stake control** |
| Tables | `shared/DataTable.tsx` | Header surface, mono numerics, hover — no striping |
| Filter chips | `markets/MarketFilterBar.tsx` | Extend with real `asset_category` values |
| Sidebar | `layout/Sidebar.tsx` | Width, auto-collapse rule |
| Bottom nav | **none** | New component |
| Command palette | `layout/CommandPalette.tsx` | Overlay elevation token |
| System probe grouping | `system/SystemStatePanel.tsx` | Grouping logic from real component names |

**Retire:** `ui/StatCard.tsx` — Stitch's system has exactly one figure container, and `StatCard`/`Panel` overlap is documented debt (#9). Fold into `Panel density="dense"`.
**Promote to shared primitives:** the market card and the edge/expiry row — both appear on Overview and Markets/Positions and are currently composed ad hoc.

---

## 6 · Targets vs actuals (your §8)

**Already correct. No change needed, and no hardcoded goals exist.**

- Source of truth: `/api/survival` → `daily_target`, `weekly_target`, `daily_pnl`, `weekly_pnl`, `behind_target_pct`.
- Single override store: `preferencesStore.profitTargets` (`daily` / `weekly`, nullable). `TargetProgress.tsx` documents it: *"measures against a personal target (preferencesStore) when set, else the engine's own target from `/api/survival`. The override is display-only — it never changes engine behaviour."*
- `EngineStateBand.tsx:58-62` records the deliberate split: Overview shows the **engine's** targets and gets out of the way; editing lives on Survival and Wallet "where editing a target is a task rather than a glance".

Stitch's `(Session target met)` is compatible. Keep the existing ownership; the only open question is Q-3 — whether Overview should indicate that a *custom* target is in force (today the `custom` marker appears only where editing happens).

---

## 7 · Token implications

Full worksheet: `stitch-pilot/TOKEN_MAP_TEMPLATE.md`. Summary:

**Value changes to existing tokens (no new tokens):**

| Token | Now | Proposed |
|---|---|---|
| `--probex-primary` | `#00D4FF` | `#38BDF8` |
| `--probex-yes` | `#00D4FF` | `#00F2FE` |
| `--probex-no` | `#8B5CF6` | `#C084FC` |
| `--probex-text-primary` | `#E8EEFF` | `#F1F5F9` |
| `--probex-text-secondary` | 0.72α | `#94A3B8` (~0.70α) |
| `--probex-text-disabled` | 0.50α | `#334155` (~0.35α) |
| `--probex-border` | 0.10 | 0.07 |
| `--probex-border-active` | cyan 0.40 | `#38BDF8` |

`--probex-bg` `#03050D` and `--probex-surface` `#0C1424` are **unchanged** — Stitch adopted our existing values verbatim.

**Genuinely new tokens required:**

| Token | Value | Justification |
|---|---|---|
| `--probex-surface-lowest` | `#060A14` | Recessed wells, table headers, input troughs. Fills a real gap. |
| `--probex-surface-overlay` | `#182744` | Modals/palette. Currently reuses `surface-3`. |
| `--probex-status-offline` | `#F43F5E` | Closes G-3 |
| `--probex-status-synthetic` | `#818CF8` | Closes G-3 — **narrowed definition per R-2** |
| `--probex-status-degraded` | `#FB923C` | Separates DEGRADED from STALE (both are `warning` today) |
| `--probex-on-accent` | `#03050D` | **Closes G-1/G-2** — ink on filled YES/NO/primary chips, currently hardcoded `#050816` (a stale value) at three sites |

Six new tokens × six themes = **36 theme declarations**. Non-trivial but bounded.

**Reject:** the Material-3 frontmatter block (R-5) and the `rounded.sm: 0.125rem` (2px) step — no use case, and it would make our radius scale *longer*, not shorter.

**Cost note:** the codebase carries **0** arbitrary Tailwind colour values and **0** raw palette classes. Re-theming is close to a pure token-layer operation.

---

## 8 · Responsive implications

| Breakpoint | Stitch | Ours | Gap |
|---|---|---|---|
| 1440+ | 216px rail, 4-up, persistent telemetry | 200px, 4-up | Width only |
| 1024–1439 | **auto-collapse to 56px**, 2×2 grid | user-controlled, 52px collapsed | Q-4 |
| 768–1023 | secondary diagnostics behind drawer | full header | Real improvement — 768px is our tightest case (debt #31) |
| 375–767 | bottom nav, condensed ticker, **fade rails on scrollable tables** | hamburger drawer, **BTC price dropped** | Bottom nav is new; fade rails close debt #29; ticker fix closes debt #27 |

**Not addressed by Stitch, still open:** Analytics at 3254px (Prompt 6 was not run), chart proportions on mobile (debt #30), and touch targets — Stitch's 32px inputs and 22px badges stay below 44px, so 2.5.5 AAA remains unmet. Its 11px floor does improve legibility.

---

## 9 · Accessibility implications

**Gains:** 11px floor; secondary/disabled separation; brand/YES separation (a real colour-blind hazard today); left rail already survives greyscale; "no alternating stripes, hover only" is cleaner for screen magnification.

**Risks to verify before adopting:**
- `text-muted` `#64748B` on `bg-surface` `#0C1424` — needs a measured contrast check; it may fail 4.5:1 for the label text it carries.
- `text-disabled` `#334155` on `#03050D` is **deliberately** very low contrast. Acceptable only if nothing meaningful is ever set in it.
- Focus ring changes to `0 0 0 1px #38BDF8` — a 1px non-blurring ring. Ours is 2px with 2px offset. **1px is a downgrade**; keep 2px.
- Status colours must keep their words. `DEGRADED` orange vs `STALE` amber are close in hue; colour alone must never carry that distinction.

---

## 10 · Chart fluidity — summary

Full analysis in `CHART_FLUIDITY_PLAN.md`. Headline:

**The perceived jump is the window panning, not the values changing.** `LiveChart` already uses `type="monotone"` (so the curve is already smooth in shape) and already sets `isAnimationActive={false}` — with a documented rationale that matches your constraint exactly: Recharts animates by morphing each point's Y toward whatever value lands in its slot, drawing a path between observations that were never adjacent, at values the engine never reported.

Animating the **viewport translation** rather than the **values** gives Stitch's fluidity with zero fabrication. That distinction is the whole plan.

---

## 11 · Risks

| # | Risk | Mitigation |
|---|---|---|
| **RK-1** | Invented metrics get implemented because they look authoritative | §4 table is the gate; every E/D item is named |
| **RK-2** | `Stake` button reappears via "just make it navigate" | Reject the affordance, not its handler |
| **RK-3** | Webfont regression (Q-1) — silent fallback shipping again | If adopted: `next/font/local` + vendored woff2 only. Never `fonts.googleapis.com`. Assert `document.fonts` in validation. |
| **RK-4** | Hex pasted into components, bypassing five themes | Token layer first; the 0-arbitrary-value baseline is the regression test |
| **RK-5** | Six new tokens × six themes drift | Define all 36 in one commit |
| **RK-6** | PAPER/SYNTHETIC collapse (R-2) reaches production | Assert both chips render independently in the MOCK-mode capture |
| **RK-7** | Overview composition forced onto Positions/Analytics/Strategy | Stitch supplied Overview only; **no System screen exists**. Apply the language per route |
| **RK-8** | Type-scale inflation breaks the 14px density decision | Stitch's body is 13px and metrics are mono — density is preserved. Watch `display-hero` 32px against our current hero |
| **RK-9** | `RadialGauge` restyled while still rendering `150% UTILIZED` on a closed ring | Fix the domain before restyling |

---

## 12 · Answers to the closing questions

**1 · Safe to implement now**
Token-layer changes (§7) including the six new tokens; `--probex-on-accent` and the `#050816` fix; 11px floor; secondary/disabled separation; brand/YES/NO disaggregation; asymmetric density; radius consolidation; retiring one of the two shadow vocabularies; semantic provenance labels with endpoint in tooltip; chart viewport animation; table header/hover treatment; market-card and edge-row promotion to shared primitives; System probe grouping using **real** component names; mobile ticker fix and table fade rails; `StatCard` retirement.

**2 · Requires product clarification**
Q-1 webfonts (largest visual delta, needs a dependency decision) · Q-2 icons · Q-3 custom-target indication on Overview · Q-4 sidebar auto-collapse vs preference · bottom-nav tab selection (5 of 10 routes).

**3 · Requires backend clarification**
Nothing is *required*. But every E-row is a latent feature request, and three are worth putting to Jake: **open interest** and **spread** on `/api/markets`; **`closes_at` on `/api/edges`** (would remove the client-side join for "closing in"); and a **24h high/low/volume** summary on `/api/price-history`. Add to `BACKEND_HANDOFF.md` as B-7…B-9 — **as requests, never as assumptions.**

**4 · Must not be implemented**
R-1 `Stake` · R-2 PAPER/SYNTHETIC collapse · R-3 interpolated feeds as a state · R-4 interval selector · R-5 Material-3 palette · R-6 consensus vocabulary · R-7 "market feeds" · every E-row in §4 · the 1px focus ring.

**5 · Recommended order**
Per `PROBEX_UI_IMPLEMENTATION_PLAN.md`: tokens → chart → Overview → shared primitives → remaining desktop → responsive → System → regression.

**6 · Is the direction strong enough?**
**Yes**, with the §3 rejections applied and Q-1 answered. `DESIGN.md` is a genuine token contract that converged independently on our existing structural decisions (left rail, milled elevation, four-tier surfaces, rationed motion) while fixing three documented debts we had not resolved. The invented data is a containable problem *because* it is enumerable — §4 enumerates it.

**One caveat worth stating plainly:** we are extrapolating a whole design system from **one page at two viewports**. The System page — which carries half the visual language per your own framing — was never rendered. Before Stage 5 propagates this across ten routes, run the System prompt.
