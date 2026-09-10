# PROBEX — Stage 6 Implementation Report: Positions + Portfolio Refinement

**Date:** 2026-09-09
**Scope:** `/positions`, `/portfolio`, `/portfolio?view=capital`
**Status:** Implemented and validated. Typecheck, tests and build clean.

**Constraints observed:** no commit, no push, no branch; no dependency installed; no backend code or
contract modified; **every backend call this stage made was a GET**. Paper/simulation mode unchanged —
no order placed, no live mode, no execution-mode change, **no simulation reset issued by me** (see §6
for an upstream reset that occurred during the stage). Overview, Live Feed, Markets, Market Detail and
`MarketChart.tsx` were treated as frozen — see §12 for the one shared primitive that required
disclosure.

---

# 1. POSITIONS + PORTFOLIO AUDIT

The audit ran before any code changed, against live endpoints and the components that consume them.
Eleven findings. The first is the most serious defect found in this programme so far.

### P-1 — The Portfolio page reported a balance that was wrong by a factor of seven

Measured on screen at 1440, before any change:

| Panel | Printed | Source |
|---|---|---|
| **ACCOUNT VALUE** | **$100.00** | `/api/execution/status` |
| **REALIZED PERFORMANCE** | **$0.00** — *"No closed trades yet — nothing has been realized."* | `/api/execution/status` |
| SNAPSHOT HISTORY | $13.13 | `/api/portfolio/summary` |

At that same moment `/api/portfolio` reported `balance.current 13.13`, `pnl.realized −85.33`,
`performance.total_trades 186`, and `survival.state CRITICAL`.

So the capital page's headline figure was **$100.00 for an account holding $13.13**, and directly
beneath it the page asserted that *nothing had been realized* across an **85% drawdown**. A lower
panel showed the correct $13.13 — the page contradicted itself, and the wrong number had the larger
type.

The cause is not a bug in either endpoint. `/api/execution/status` is scoped to the current engine
**process** and was reset by the restart the forensic audit identified; `/api/portfolio` is the
persisted ledger. The frontend read the process-scoped one for a question only the persisted one can
answer.

### P-2 — Positions contradicted itself on the same screen

`PositionsConsole`'s **Realized** panel printed **$0.00** (same source, same fault) while its own
**Settled Positions** table, three sections lower and reading `/api/positions/history`, printed
**−$86.87**. Two panels, one page, disagreeing by the entire loss.

### P-3 — "No position has resolved yet this session"

True of the engine process, false of the account (186 resolved). The panel was not wrong about its
subject; it simply never said what its subject was.

### P-4 — `PositionRow.segment` was hardcoded `null`, silently disabling two controls

The mapper carried `segment: null, // not on the wire`. Downstream:

- **Portfolio → "Top Exposure"** grouped by `segment`, so every position fell into one bucket and the
  card always rendered a single **"Unknown segment · 100%"** row.
- **Positions → segment filter** offered eight `BITCOIN_SEGMENTS` pills (`price-targets`,
  `volatility`, …). The positions wire's segment field is `asset_category`, whose live value is
  `crypto`. **The two vocabularies never intersected**, so every segment pill filtered the table to
  zero rows.

Both were dead controls occupying real estate, not cosmetic gaps.

### P-5 — Three confirmed wire fields were never mapped

Live capture of `/api/positions` and `/api/positions/history` shows every item carrying
`asset_category`, `asset_symbol` and `duration_minutes`. Neither DTO declared them.

### P-6 — RUNTIME was on the wire and displayed nowhere

`time_held_seconds` has always been in the contract and in `PositionRow.timeHeldSeconds`. Neither the
table nor the detail panel showed it. The table's last column was `Opened` — a wall-clock time, when
the operational question on a 15-minute market is *how long has this been open*.

### P-7 — The settled blotter had no market identity

`/api/positions/history` carries no `question`, so `SettledPositions` printed
`0x7ac7615f27…` — a truncated condition id as the Market column, for every row.

### P-8 — A chart titled for two series drew one, in the wrong band

`PnLChart` was titled **"Daily & Cumulative P&L"** and plotted a single series (`realizedPnl`). It was
hardcoded `color="var(--probex-positive)"` — drawing an **−$85 loss as a green line**. Financial
direction is a semantic band; a fixed positive colour on a signed series discards it.

### P-9 — A market-side token on a win-rate chart

`WinRateChart` used `color="var(--probex-yes)"`. A win rate is not a YES. Same class as Stage 5's M-1
and M-8.

### P-10 — Endpoint paths as body text

Measured visible raw `/api/…` strings: **Portfolio 8, Positions 4, Capital 1**, at every viewport.
Neither page declared a `ProvenanceScope`, so every badge rendered its path inline.

### P-11 — Two controls below the 24px target floor

Capital view: `Edit daily target` and `Edit weekly target`, both **27×16**.

---

# 2. DATA / CONTRACT INVENTORY

Classification as the brief requires. Everything below was verified against live responses captured
2026-09-09, not inferred from types.

### 1 · Directly provided by the backend

| Field | Endpoint | Note |
|---|---|---|
| entry price | `/api/positions` `entry_price` | 0–1 → cents |
| current price | `/api/positions` `current_price` | nullable until marked |
| stake / cost basis | `size` | USD, **not** a contract count |
| unrealized P&L | `pnl`, `pnl_percent` | signed |
| **runtime** | **`time_held_seconds`** | **present all along, displayed nowhere** |
| opened_at | `opened_at` | ISO 8601 |
| market side | `direction` | YES / NO |
| edge at entry | `edge_pct` | distinct from the live edge |
| BTC at entry / now | `entry_btc_price`, `current_btc_price` | |
| **asset category** | **`asset_category`** | **on the wire, was unmapped** |
| **asset symbol** | **`asset_symbol`** | **on the wire, was unmapped** |
| **market duration** | **`duration_minutes`** | **length of window, NOT time remaining** |
| balance (persisted) | `/api/portfolio` `balance.current` | |
| realized / unrealized / total P&L | `/api/portfolio` `pnl.*` | |
| trades, wins, losses, win rate | `/api/portfolio` `performance.*` | |
| survival state + capital % | `/api/portfolio` `survival.*` | |
| settled: exit price, won, hold time, closed_at | `/api/positions/history` | fully populated |
| daily / weekly targets | `/api/survival` | already wired, untouched |

### 2 · Safely derivable from existing fields

| Derived | From | Note |
|---|---|---|
| contracts | `size ÷ entry_price` | pre-existing |
| current value | `size + pnl` | pre-existing |
| **market close state** | position `market_id` ⋈ `/api/markets` `closes_at` | **join; misses legitimately** |
| **market identity** | `asset_symbol` + `duration_minutes` | → "BTC 15m" |
| **underlying move** | `(current_btc − entry_btc) / entry_btc` | |
| exposure by underlying | group rows by `asset_symbol` | |
| filter vocabulary | distinct `segment` across current rows | cannot drift from the data |

### 3 · Frontend-only presentation

Runtime formatting, lifecycle wording, tooltip placement of endpoints, panel hierarchy, colour band
assignment, the 24px target floor.

### 4 · Unavailable — requires a backend contract decision

| Wanted | Status |
|---|---|
| **position `status`** | **Not on the wire.** No open/closing/closed/settling field on `/api/positions`. |
| **market `closes_at` on the position row** | **Not on the wire.** Only obtainable by joining the markets catalogue, which holds just the markets the engine currently tracks — so it resolves for recent positions and is genuinely unknown for older ones. |
| **time to resolution, independently** | Follows from the above. |
| settled-row market question | `/api/positions/history` has no `question`. |

**`duration_minutes` is deliberately NOT used to synthesise a close time.** A position can be opened at
any point inside its window, so `opened_at + duration_minutes` is not the market's end. That
arithmetic would produce a plausible-looking number that is wrong, which is exactly the failure mode
the brief forbids.

---

# 3. ACTIVE POSITION INFORMATION

**No contract gap for active P&L, runtime or current price** — all three are directly provided, so
none of the "cannot be represented truthfully" declarations were required. The gap is narrower and
specific:

> **Backend contract gap — position status and market close time are not carried on `/api/positions`.**
> Close state is recovered by joining the markets catalogue; where the join misses, the UI states
> nothing rather than guessing.

The conceptual row in the brief — MARKET · SIDE · ENTRY · CURRENT · ACTIVE P&L · RUNTIME · EXPOSURE ·
STATUS — is now fully backed, with STATUS qualified as above. Captured against a real open position:

```
Bitcoin Up or Down - September 9, 2:45PM-3:00PM ET │ YES │ 47.5¢ → 45.5¢ │
$18.00 / $17.24 │ No active edge │ −$0.76 (−4.2%) │ 2m 20s │ ● Open · closes 7m
```

`2m 20s` and `Open · closes 7m` are both new; the first is a field that was always present, the second
is the join. Evidence: `after-positions-active-{1440,375}.png`.

The detail drill-down already existed, so per §5 it was **improved rather than replaced**. It now
carries `Runtime`, `Edge at Entry`, `Underlying` and a `Market State` section alongside the existing
Contracts / Entry / Current / Stake / Current Value / Unrealized P&L / Return / Opened. Confirmed
rendering:

```
sections: Position Summary · Market · Market State · Edge Alignment · Current Performance · Manual Control
metrics : Contracts, Entry Price, Current Price, Stake, Current Value, Unrealized P&L,
          Return, Runtime, Opened, Edge at Entry, Underlying
```

No trade reasoning, confidence, or execution narrative was invented. `Edge at Entry` is the wire's
`edge_pct`; the live edge remains separately labelled in Edge Alignment.

---

# 4. POSITIONS DESIGN CHANGES

- **Realized** now reads the persisted ledger (`/api/portfolio`). It agrees with Settled Positions.
- **Resolution Record** keeps `/api/execution/status` — the resolution tracker genuinely *is* a
  per-process subsystem — and gains the subtitle **"This engine process"**, so its
  "no position has resolved yet this session" is a scoped statement rather than a claim about the
  account.
- **"Closed this session"** carries a tooltip naming its scope.
- **Table**: `Opened` → **`Runtime`** (the opened timestamp moves to that cell's tooltip), plus a new
  **`Market State`** column — dot **and word** (`Open` / `Closing` / `Closed`) plus the relative close
  time, or a dash when the market is not in the engine's cache.
- **Settled blotter**: market identity from `asset_symbol` + `duration_minutes` ("BTC 15m"), condition
  id moved to the tooltip.
- **Filters**: the segment row is now derived from the positions actually present, and **hides itself
  when there is only one category** — one category is not a filter. Pills gained `min-h-[24px]`. The
  Clear button's hardcoded `rgba(239,68,68,0.15)` became `--probex-negative-border`. The segment
  pill's active border left `--probex-yes-border` (market-side band) for `--probex-border-active`.
- **`ProvenanceScope detail="tooltip"`** wraps the console.

Search, side filter, P&L filter, the row→detail interaction, and the Close Position mutation are
unchanged in behaviour.

---

# 5. PORTFOLIO DESIGN CHANGES

Hierarchy per §8 — current capital first, then performance, then exposure, then history:

1. **Account Value** — persisted balance, with a survival caption when the state is
   `WOUNDED`/`DANGER`/`CRITICAL`/`DEAD`, and a `Capital remaining %` row that turns amber below 60%
   and negative below 25%.
2. **Realized Performance** — persisted realized P&L, win-rate meter, W/L split. When the win rate is
   ≥50% while realized P&L is negative, the panel says so in one line rather than leaving two numbers
   looking mutually contradictory.
3. **Open Exposure** — unchanged source (`/api/positions`); `Combined P&L` now uses the ledger's
   reported `pnl.total` instead of a frontend addition of two differently-scoped numbers.
4. **This Engine Process** — a fourth panel that appears **only when the process-scoped figures
   actually disagree with the ledger**, stating the divergence in words. Verified to appear on
   divergence and disappear on agreement.
5. **Top Exposure** now groups by **underlying asset** (BTC / ETH) rather than by the always-null
   segment, and shows dollars as well as share.
6. **Charts**: `PnLChart` retitled **"Realized P&L"** (it draws one series, not two) with a
   **direction-aware** colour that follows the sign of the series; `WinRateChart` moved off
   `--probex-yes` to `--probex-primary`.
7. **`ProvenanceScope detail="tooltip"`** on `PortfolioDomain`, covering both tabs.

**Profit targets untouched** (§9): `WalletPage` → `TargetProgress` → `/api/survival` `dailyTarget` /
`weeklyTarget` remains the single source, with the existing editable-override workflow intact. No
competing target source was introduced and nothing was hardcoded.

---

# 6. ACCOUNTING SOURCE ANALYSIS

The audit the brief asks for, per surface, with the backend problem left **unfixed** as instructed.

| Endpoint | Scope | Resets on engine restart? | Now used for |
|---|---|---|---|
| `/api/portfolio` | **Persisted ledger** | No | Account Value, Realized Performance, Combined P&L, Positions' Realized panel |
| `/api/execution/status` | **Process-scoped** | **Yes** | Resolution Record, "Closed this session", the divergence panel — all explicitly labelled |
| `/api/positions` | Live open positions | n/a | Open exposure, position rows |
| `/api/positions/history` | Persisted settled ledger | No | Settled blotter |
| `/api/portfolio/summary` | Snapshot series | No, but see below | Snapshot History card |
| `/api/trades/ledger` | Persisted | No | Capital ledger, W/L chips |

**Refresh behaviour:** `/api/portfolio` polls at the MEDIUM tier (5s), alongside `/api/balance` and
`/api/execution/status`. **After an engine restart**, the process-scoped counters return to zero while
the persisted ones continue — which is precisely the state that produced P-1/P-2/P-3.

**Two surfaces can still legitimately show different numbers, and this is now visible rather than
hidden:**

1. **Ledger vs process** — the divergence panel names it explicitly.
2. **`/api/portfolio/summary` "Total Return" is not the account's return.** Its `initial_value` is the
   first snapshot in the retained window, which was `2298.14` — a value inflated by the stale-market-
   cache run-up the forensic audit documented. It therefore reported `total_return_pct −99.36%` while
   the account's real return from its $100 starting capital was `−85.3%`. **Both are arithmetically
   correct about different baselines.** This is left as-is and recorded as debt D-1 rather than
   silently reconciled, because concealing it through a frontend transformation is exactly what the
   brief prohibits.

**An upstream reset occurred during this stage.** Mid-implementation the account moved
100 → 14.67 → 13.13 → 9.41 with `survival.state` reaching `DEAD`, and then returned to `balance 100.0`
with an empty trade history and `survival HEALTHY`. **I did not cause this** — every backend request
this stage issued was a GET, and no mutation control was invoked. It is recorded here because it
changes what the later screenshots show.

---

# 7. PROVENANCE

| Surface | Visible raw paths before | after | Badges |
|---|---|---|---|
| `/positions` | 4 | **0** | 4 |
| `/portfolio` | 8 | **0** | 9 |
| `/portfolio?view=capital` | 1 | **0** | 1 |

Accessible names retain the lineage:

```
Data source: Live (/api/portfolio)
Data source: Live (/api/positions)
Data source: Live (/api/execution/status)
Data source: Live (/api/positions/history)
```

Diagnostic detail is preserved, not removed — it moved to the tooltip and the accessible name, so a
screen-reader user still receives it. Per-endpoint lineage is retained: each panel's badge tracks the
slice it actually reads, so the new `/api/portfolio` panels carry their own state and a
portfolio-only outage cannot sit under a badge fed by a different request.

No fabricated balances, P&L or positions. Unavailable data renders `PanelPending` / `AwaitingValue` /
a dash — never a synthetic number.

---

# 8. RESPONSIVE VALIDATION

All six required viewports, aurora, real device-metrics emulation.

| View | Viewport | ovfDoc | ovfMain | Min font | Visible paths | Clipped | <24px |
|---|---|---|---|---|---|---|---|
| positions | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0 | 0\* | 0 |
| portfolio | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0 | 0\* | 0 |
| capital | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0 | 0\* | 0 |

Zero horizontal overflow on the document and on `main` independently, at every width. No clipped
controls, no overlap, 11px type floor held.

\* The raw probe reports "10 clipped" at ≤768 on every route in the product. All ten are the
off-canvas navigation drawer parked at `right: −9px` while `inert` and `aria-hidden` — the same known
false positive identified in Stages 3, 4 and 5. **Genuine clipped controls: 0.**

Mobile is not a compressed desktop: the position tables are replaced by the card treatment rather than
scrolled, the metric panels stack to one column, and `BottomNav` remains compatible at 56px targets.
Long currency values stay `tabular-nums` and readable at 375.

---

# 9. ACCESSIBILITY VALIDATION

| Check | Method | positions | portfolio | capital |
|---|---|---|---|---|
| Focus ring | real `Input.dispatchKeyEvent` Tab traversal, 40 stops | **35/35** | **37/37** | **37/37** |
| Touch targets <24px | computed rects | **0** | **0** | **0** (was 2) |
| Reduced motion | emulated media, 1ms threshold | 4/61 → **0/0** | 6/37 → **0/0** | 5/60 → **0/0** |
| Semantic tables | `thead`/`th`/`tbody`/`tr` | ✓ 8 headers | n/a | ✓ 8 headers |
| Type floor | computed font-size | 11px | 11px | 11px |

Focus was tested with **dispatched keyboard events**, never programmatic `.focus()` — `:focus-visible`
does not match a scripted focus call. The reduced-motion probe uses a **1ms** threshold because the
reset sets `0.01ms` rather than `0s`.

**Colour is never the sole carrier.** YES/NO render as words; `WON`/`LOST` as words; market state as
`Open`/`Closing`/`Closed` beside its dot; process scope as the words "This engine process" and "Since
the engine last started". Every band retains a textual carrier.

Chart accessibility is unchanged — the shared `LiveChart` primitive was not modified.

---

# 10. PERFORMANCE CHECK

Measured over a 30-second window on each page, counting real resource timings:

| Page | API requests / 30s | Rate |
|---|---|---|
| `/positions` | 125 | 4.2/s |
| `/portfolio` | 125 | 4.2/s |

`/api/portfolio` appears **6× in 30s — exactly one poll per 5s**, the MEDIUM tier it was assigned. **No
endpoint is requested twice at the same tier**, so the change introduced no duplicate requests. Table
keys are stable (`p.id` = `market_id`; settled rows key on `marketId + closedAt`). The new derivations
(`segmentOptions`, `closesAtByMarketId`, exposure grouping) are all inside `useMemo` keyed on the
slice they read. Chart update frequency is unchanged.

**Bundle:**

| Route | Size | First Load JS |
|---|---|---|
| `/positions` | 8.61 kB | 175 kB |
| `/portfolio` | 10.5 kB | 288 kB |
| shared by all | — | 102 kB |

**Observed but deliberately not fixed:** the global loader polls **all 31 endpoints on every page**,
so `/portfolio` fetches `/api/consensus`, `/api/research/reports` and others it never renders. That is
an application-wide polling-architecture characteristic, and §15 explicitly excludes an
application-wide refactor. Recorded as debt D-4.

---

# 11. BEFORE / AFTER REVIEW

| Question | Before | After |
|---|---|---|
| What is this account worth? | **$100.00** (actual: $13.13) | **$9.41** — the persisted balance, measured live |
| Has any trading happened? | *"No closed trades yet — nothing has been realized."* over 186 trades | **−$90.59** realized over 192 trades |
| Do the two panels agree? | Realized $0.00 vs Settled −$86.87 | both **−$90.59** |
| Why do the numbers differ? | unexplained | a panel that names the process/ledger split, shown only when they diverge |
| How long has this position been open? | not shown | **`2m 20s`** |
| Has its market already closed? | not shown | **`Open · closes 7m`**, or an honest dash |
| What did I trade? (settled) | `0x7ac7615f27…` | **`BTC 15m`** |
| What is my exposure split? | "Unknown segment · 100%" | by underlying, with dollars and share |
| Is this loss green? | yes — fixed positive colour | colour follows the sign |
| Where did this come from? | 13 raw `/api/…` strings as body text | 0 visible; all in tooltips + accessible names |

Evidence in `docs/design-export/evidence/stage-6/` (54 files): `before-*` and `after-*` for all three
views at 1440/1024/768/430/390/375, scrolled frames at the headline sizes, plus
`after-positions-active-{1440,375}.png`, `after-position-detail-1440.png`, and
`regression-{overview,live,markets}-1440.png`.

---

# 12. FILES CHANGED

**New (1):**

| File | Purpose |
|---|---|
| `src/lib/display/positionDisplay.ts` | runtime formatting, market identity, underlying move, close-state join — each returning a null/unknown rather than a guess |

**Modified (18):**

| File | Change |
|---|---|
| `src/store/applicationStore.ts` | `portfolio` slice |
| `src/config/hooks/useServices.ts` | `useEnginePortfolio` |
| `src/components/providers/ApplicationStateLoader.tsx` | poll `/api/portfolio` at MEDIUM + sync effect |
| `src/lib/mappers/positions.ts` | three confirmed fields typed; `segment` reads `asset_category` |
| `src/types/engine.ts` | `SettledTradeDTO` / `SettledTrade` gain the same three |
| `src/lib/services/dto.ts` | `toSettledTrade` maps them defensively |
| `src/components/portfolio/PortfolioMetrics.tsx` | persisted accounting; survival caption; divergence panel |
| `src/components/portfolio/PortfolioOverview.tsx` | exposure by underlying, with dollars |
| `src/components/portfolio/PortfolioDomain.tsx` | `ProvenanceScope` |
| `src/components/portfolio/PortfolioPage.tsx` | panel title matches its chart |
| `src/components/portfolio/charts/PnLChart.tsx` | truthful title + direction-aware colour |
| `src/components/portfolio/charts/WinRateChart.tsx` | off the market-side band |
| `src/components/positions/PositionsConsole.tsx` | persisted Realized; scope labels; join map; `ProvenanceScope` |
| `src/components/positions/PositionTable.tsx` | Runtime + Market State columns |
| `src/components/positions/PositionDetail.tsx` | Runtime, Edge at Entry, Underlying, Market State |
| `src/components/positions/SettledPositions.tsx` | readable market identity |
| `src/components/positions/PositionFilters.tsx` | data-derived segments; tokens; 24px floor |
| `src/components/shared/TargetProgress.tsx` | edit control meets the 24px floor — **see disclosure below** |

*(`git diff --stat` against the baseline commit shows more files and larger counts because it is
cumulative across Stages 2–6; the list above is Stage 6 alone, established by modification time
against the Stage 5 report.)*

### Correction — the shared primitive does NOT reach a frozen surface

**This section previously stated that `TargetProgress` is rendered by `EngineStateBand` on
Overview. That was wrong, and the closure review corrected it.** The earlier claim came from a
`grep` that matched the string "TargetProgress" inside a *comment* in `EngineStateBand.tsx` —
prose, not a render. The comment in fact says the opposite:

```
// Absorbs the old Capital StatCard and the entire Profit Targets card. The
// personal-target override that lived in TargetProgress stays available on
// Survival and Wallet, where editing a target is a task rather than a glance;
// Overview shows the engine's own targets and gets out of the way.
```

`TargetProgress` has exactly two consumers, neither of them frozen:

| Consumer | Surface | Frozen? |
|---|---|---|
| `src/components/wallet/WalletPage.tsx` | `/portfolio?view=capital` | No — **this is Stage 6 scope** |
| `src/components/survival/SurvivalConsole.tsx` | Survival | No — not in the frozen set |

Confirmed at runtime: the Profit Targets card is present **only** on the capital view —

```
overview  (frozen)  profitTargetsCard false
live      (frozen)  profitTargetsCard false
markets   (frozen)  profitTargetsCard false
positions (stage 6) profitTargetsCard false
portfolio (stage 6) profitTargetsCard false
capital   (stage 6) profitTargetsCard TRUE
```

So the one-line change (`inline-flex items-center justify-center min-h-[24px] min-w-[24px]`) reaches
no frozen surface at all. It is what took the capital view from two 27×16 controls to zero sub-24px
controls, measured — `Edit daily target` and `Edit weekly target` are now 27×24, `meets24: true`.
Reverting it would reintroduce a Stage 6 accessibility failure for no benefit. **Kept.**

Overview's four remaining sub-24px items are pre-existing inline text links
(`System console →`, `Overview`, `Live Feed`, `Positions`), unrelated to this change.

---

# 13. TYPECHECK / TEST / BUILD RESULTS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** — exit 0, no diagnostics |
| Tests | `npx vitest run` | **PASS** — **162 passed**, 13 files |
| Build | `npm run build` | **PASS** — compiled in 38.6s, **22/22 static pages**, **22 route rows**, 102 kB shared |

Matches the expected baseline exactly: 162/162, 22 routes, clean typecheck, successful production
build. No dependency installed, no commit, no push. No code changed after the build was taken.

---

# 14. BACKEND CONTRACT GAPS

1. **`/api/positions` carries no position `status`.** Open/closing/closed/settling is not on the wire.
   The UI derives market lifecycle from a catalogue join and says nothing when the join misses.
2. **`/api/positions` carries no market `closes_at`.** `duration_minutes` is the window's *length*, not
   its end, and cannot substitute. A `closes_at` (or a resolved `status`) on the position row would
   remove the join and its blind spot entirely — **the cleanest single addition arising from this
   stage.**
3. **`/api/positions/history` carries no `question`.** Identity is reconstructed from `asset_symbol` +
   `duration_minutes`; the original market text is unavailable for settled rows.
4. **`/api/execution/status` does not declare its own scope.** Nothing in the payload says these
   counters are process-scoped; the frontend has to know. A `scope` discriminator would make the
   distinction machine-readable instead of tribal knowledge.
5. **`/api/portfolio/summary.initial_value` is window-relative, not the account's starting capital** —
   the source of the −99.36% vs −85.3% divergence in §6.
6. **`/api/survival` returns corrupted derived figures** in the observed state: `daily_pnl −11462.77`
   and `behind_target_pct 7813674.8` against a $100 account. **Nothing in this stage renders those two
   fields**; `daily_target` / `weekly_target`, which are sound, remain the only survival values shown.
   Flagged for the backend rather than worked around.
7. The stale market cache from the forensic audit remains the root cause behind positions being held
   against markets whose close time has passed. Unfixed here by instruction; now at least *visible*.

---

# 15. REMAINING DEBT

- **D-1 — `/api/portfolio/summary` "Total Return" is baseline-relative.** Shown as-is; see §6.
  Resolving it needs a backend decision (item 5 above), not a frontend transform.
- **D-2 — `/api/balance` is now largely redundant** with `/api/portfolio`, which carries the same
  balance. `PortfolioSummaryCard` still reads it, so the poll stays. Removing one of the two is a
  small, separate cleanup.
- **D-3 — Stage 4 `--probex-warning-border` (carried forward, still open).** Six per-theme literals in
  `probex-tokens.css` (lines 139, 323, 389, 453, 517, 595) are inert dead code overridden by the
  derived `color-mix` in `globals.css:20`; the institutional one also encodes the wrong colour.
  Reverting them is a zero-visual-change cleanup and remains yours to approve.
- **D-4 — Global polling fans out to all 31 endpoints on every page.** Out of scope by §15; worth its
  own stage.
- **D-5 — Overview retains 4 sub-24px inline text links.** Pre-existing, frozen surface, not touched.
- **D-6 — `PortfolioOverview`'s three cards are hand-rolled `rounded-lg` divs**, not `Panel`, and carry
  no provenance — the same inconsistency `PortfolioPage`'s own comment criticises elsewhere.
  Deliberately left: converting them is a visual change to panels this stage had no data reason to
  touch.

---

# 16. RECOMMENDATION FOR STAGE 7

**Stage 6 is ready for review. Execution, Strategy, Analytics, System and Settings were not started.**

Two decisions would be useful before Stage 7:

1. **D-3** — approve reverting the six dead token literals (carried since Stage 4).
2. **§12 disclosure** — confirm the shared `TargetProgress` fix may stand, given it alters a frozen
   surface's hit area.

For Stage 7 I recommend **Execution + Settings together**, and deliberately *not* folding them into a
general sweep:

- They are the only remaining surfaces carrying **mutation controls**. In a paper environment those
  deserve a stage whose explicit job is to state what is wired, what is gated, and what each control
  would actually do — the same treatment `MutationButton`'s confirm flow already gestures at.
- §14 item 4 lands here: `/api/execution/*` is the process-scoped subsystem, and Execution is the one
  page where process-scoped counters are the *correct* subject. It is the natural place to finish the
  scope vocabulary this stage started.
- Analytics and Strategy are read-only intelligence surfaces and would pair better with each other
  afterwards; System was already validated during the Stage 1 design work and is the least urgent.

Suggested shape, matching the rhythm that has worked: audit with no code changes, then implement, then
report — with the audit paying particular attention to whether any control can reach a live-trading
path, and whether any displayed counter is process-scoped without saying so.

---

*No commit, no push, no branch, no dependency installed. All backend calls were GETs; paper/simulation
mode unchanged and not reset by me. Overview, Live Feed, Markets, Market Detail and `MarketChart.tsx`
unmodified apart from the disclosed shared-primitive change. Stage 7 not begun.*
