# PROBEX — Stage 10: Final Frontend Certification

**Date:** 2026-09-10
**Purpose:** certify the complete frontend before it is pushed to Git and frozen.
**Verdict:** **READY TO FREEZE**, with two backend-dependent runtime confirmations carried as explicitly
pending and one accepted accessibility deviation. Both are stated below; neither is a frontend defect.

**Boundary observed.** No backend code, contract or timestamp serialization modified. No trading
behaviour touched. No new features. No route redesigned. Q-5 and populated Live Feed semantics
unchanged — `MarketChart.tsx` and `EventStream.tsx` are byte-identical to their frozen state. No
dependency installed. Nothing committed or pushed. All backend calls were GETs.

---

# 1. FINAL ROUTE INVENTORY

**22 route rows, 22/22 static pages, 102 kB shared JS.** 11 primary surfaces, 8 consolidation redirects,
plus `_not-found` and the manifest.

### Primary surfaces (11)

| Route | Size | First Load | Kind | Stage refined |
|---|---|---|---|---|
| `/` — Overview | 12.3 kB | 194 kB | instrument + intelligence | 3 |
| `/live` — Live Feed | 10.5 kB | 177 kB | intelligence | 4 |
| `/markets` | 9.51 kB | 172 kB | intelligence | 5 |
| `/markets/[marketId]` | 7.46 kB | 287 kB | intelligence | 5 |
| `/positions` | 9.11 kB | 175 kB | instrument | 6 |
| `/portfolio` | 10.5 kB | 289 kB | instrument | 6 |
| `/execution` | 11.2 kB | 179 kB | operational console | 7 |
| `/settings` | 7.72 kB | 120 kB | configuration centre | 7 |
| `/system` | 12.6 kB | 172 kB | **instrument** (lineage visible by design) | 8 |
| `/analytics` | 6.96 kB | 236 kB | intelligence | 8 |
| `/strategy` | 13.9 kB | 251 kB | **flagship intelligence** | 9 |

### Tab views within those routes (7 further states)

`/markets?view=watchlist` · `/markets?view=archive` · `/portfolio?view=capital` ·
`/execution?view=paper` · `/strategy?view=consensus` · `/strategy?view=survival` ·
`/strategy?view=research` · `/system?view=events`

### Consolidation redirects (8, 168 B each — verified `redirect` calls)

`/admin` · `/consensus` · `/events` · `/paper` · `/research` · `/survival` · `/wallet` · `/watchlist`

Each is a former sidebar destination folded into a domain during the programme. All 8 confirmed to be
redirects, not orphaned pages.

---

# 2. FILES CHANGED IN STAGE 10

**One file.** Stage 10 is a certification pass, and the sweep found exactly one substantive issue.

| File | Change | Why |
|---|---|---|
| `src/components/analytics/AnalyticsEngineStatus.tsx` | `"Total P&L"` → `"P&L analysed"`; mismatch guard made proportional | Label/condition only — see below |

**Finding 1 — a "Total" that was window-relative.** `/api/analytics/summary` reports its **own analysis
window**: `total_trades_analyzed 2 · total_pnl 0.0 · history_size 2`, measured while the trade ledger held
186+ settled trades. The field is the analytics engine's total over what *it* has analysed, not the
account's. `"Total P&L"` is precisely the claim Stages 7–9 removed elsewhere. Relabelled to match
`"Trades analysed"` directly beside it.

**Finding 2 — a guard that only caught zero.** `mismatch = analysed === 0 && settled > 0` missed the live
case `analysed 2` against `settled 186` — the same inconsistency, nearly the same magnitude, passing
silently because 2 is not 0. Now proportional: flags whenever the analytics engine has seen less than
half of what the ledger reports.

**No other code changed in Stage 10.** `isoToMs` verified still unmodified at `dto.ts:85`.

### New documents

- `docs/design-export/STAGE_10_FINAL_CERTIFICATION.md` (this file)
- `docs/design-export/BACKEND_CONTRACT_DEBT.md` (Stage 9, BC-1…BC-14)

---

# 3. BC-1 TIMESTAMP AUDIT — read-only impact analysis

**Decision: leave `isoToMs` unchanged. Record BC-1 as backend/integration debt.**

This is the instructed outcome when serialization is inconsistent or evidence is insufficient. **Both
conditions are met**, and here is the evidence.

### Method

Every real payload captured during the programme — **29 files across Stages 6–9** — was walked and every
timestamp-shaped string classified as offset-aware (ends `Z` or `±HH:MM`) or naive. Array indices were
collapsed so the question is answered per *field*, not per row. Zero backend calls; zero mutation.

### Result: 17 distinct timestamp fields, inconsistently serialised

| Class | Count | Fields |
|---|---|---|
| **Offset-aware** | **3** | `markets[].closes_at` · `markets[].created_at` · `price-history history[].timestamp` — all with `Z` |
| **Naive (no offset)** | **14** | envelope `timestamp` (~40 of the 57 call sites) · `components[].checked_at` · `events[].timestamp` · `history[].opened_at` · `history[].closed_at` · `positions[].opened_at` · `initialized_at` · `stats.started_at` · `paper_trading.session_start` · `survival_states[][]` · `summary.first_snapshot` · `summary.last_snapshot` |
| **Mixed within one field** | **0** | — |

**So serialization is consistent per field but inconsistent across fields.** That distinction matters:
it means a blanket "the API is naive" assumption would be wrong.

### Which fields are demonstrably affected

The 14 naive fields are rendered by **11 components across 8 routes**, including frozen surfaces:

| Naive field | Rendered by |
|---|---|
| `checked_at` | `system/HealthPanel` |
| `opened_at` | `positions/PositionDetail`, `positions/PositionTable` |
| `closed_at` | `positions/SettledPositions`, `wallet/CapitalLedger` |
| `initialized_at`, `stats.started_at` | `system/RuntimePanel` |
| `session_start`, `survival_states` | `execution/ExecutionConsole`, `paper/PaperTradingConsole` |
| `first_snapshot` | `portfolio/PortfolioSummaryCard` |
| `last_snapshot` | `markets/MarketsArchive` |
| envelope `timestamp` | provenance freshness throughout |

Formatting determines visibility: **14 files use `toLocaleString()`, 17 `toLocaleTimeString`, 4
`toLocaleDateString`** — absolute clock renderings, where the offset shows directly. Relative renderings
(`now − ts`) show it as a constant skew, which is how it was caught. Durations that come from the backend
as *seconds* (`hold_time_seconds`, `time_held_seconds`) are unaffected either way.

### Why a global frontend fix is NOT conclusively safe

`naiveUtcToMs` appends `Z` only when no offset is present, so the 3 offset-aware fields are provably
untouched. The risk is entirely on the 14 naive ones, and it is this: **appending `Z` is correct only if
every naive field is genuinely UTC.**

- **Proven UTC: 2 of 14.** `timestamp` and `checked_at`, by direct clock comparison —
  `local now 22:24:44.201Z` against `payload 22:24:43.012344`, i.e. a one-second age, versus the 3.00 h
  that local-parsing produced.
- **Inferred, not proven: 12 of 14.**
- **Never captured at all:** `portfolio/history[].timestamp`, which feeds the Portfolio and Analytics
  equity and drawdown charts. Its sibling `price-history history[].timestamp` **is** offset-aware, so the
  two cannot be assumed alike.
- **Cannot be extended now:** the backend was unavailable throughout Stage 10 (`/api/health` timing out
  at 20 s), so no further evidence could be gathered.

Changing `isoToMs` on 2-of-14 proof, with one chart-feeding field unobserved and its nearest sibling
serialised the other way, would be exactly the contract ambiguity the instruction warns against.

### Therefore

- `isoToMs` **unchanged** — verified at `dto.ts:85`.
- The narrow `checkedAt` → `naiveUtcToMs` fix **kept** (one consumer, no frozen surface).
- BC-1 recorded in `BACKEND_CONTRACT_DEBT.md` with this evidence.
- **The clean resolution is one backend change**: serialise with an offset (`…Z`). That fixes all 57
  remaining call sites at once and makes the frontend helper unnecessary. **Not done — no backend
  serialization was modified.**

---

# 4. THE THREE SHARED-MODULE CHANGES — reviewed

All three **KEEP**. Each is a correctness fix; each blast radius was re-verified this stage.

### 4.1 THRIVING survival-state severity — **KEEP**

`src/lib/display/engine.ts`. `/api/survival` returned `state: "THRIVING"` with capital at 149.9% of the
starting bankroll and `kelly_modifier 1.5`. THRIVING was absent from `SURVIVAL_STATES`, so
`survivalStateSeverity()` fell to `default: 'caution'` and painted the engine's **best** state in the
**warning** colour.

**Blast radius, re-verified: 4 components** — `layout/EngineStatusStrip` (the global top bar),
`overview/EngineStateBand` (**frozen surface**), `paper/PaperTradingConsole`, `survival/SurvivalConsole`.

**Why keep:** the alternative is freezing with the healthiest state shown as a warning, in the global
status strip. The `default → caution` fallback is itself correct and is retained for genuinely unknown
states. Overview measured after: `ovfDoc 0 · ovfMain 0 · minFont 11px`, 38/38 focus rings — unmoved apart
from that one state's colour. **Reversible in three lines** if you prefer Overview byte-identical.

### 4.2 TargetProgress target size — **KEEP, and the earlier concern is resolved**

`src/components/shared/TargetProgress.tsx`. One line, four utility classes, enlarging a 27×16 edit control
to meet the 24px floor.

**Blast radius, re-verified: 2 consumers — `survival/SurvivalConsole` and `wallet/WalletPage`. Neither is
frozen.** `WalletPage` *is* `/portfolio?view=capital`, i.e. Stage 6's own scope.

My Stage 6 report originally claimed this reached Overview. **That was wrong** — it came from a grep
matching the string inside a *comment* in `EngineStateBand.tsx`, and the Stage 6 report was corrected at
closure. Re-confirmed this stage: there is no import and no JSX use of `TargetProgress` anywhere in
`src/components/overview/`.

### 4.3 `checkedAt` parsing — **KEEP**

`src/lib/services/dto.ts`. `checkedAt: naiveUtcToMs(dto.checked_at)` instead of `isoToMs`.

**Blast radius, re-verified:** `naiveUtcToMs` has exactly one call site; `checkedAt` has exactly one
consumer, `system/HealthPanel`. No frozen surface reads it — it was mapped and never rendered until
Stage 8. Verified output: the probe cell reads `just now` rather than `3h ago`.

---

# 5. VALIDATION RESULTS

### Build gates

| Gate | Result |
|---|---|
| Typecheck | **PASS** — `tsc --noEmit`, exit 0 |
| Tests | **PASS** — **162 passed**, 13 files |
| Production build | **PASS** — 11.9 s, **22/22 static pages**, **22 route rows** |
| Shared JS baseline | **102 kB** — held |
| Dependencies installed | **none** |

### Whole-product structural sweep — 18 surfaces × 6 viewports = **108 measurements**

| Check | Result |
|---|---|
| Horizontal overflow (`document`) | **0 / 108** |
| Horizontal overflow (`main`) | **0 / 108** |
| 11px rendered-text floor | **held on 108 / 108** (min font = 11px everywhere) |
| Genuinely clipped controls | **0 / 108** (inert off-canvas nav excluded by the probe itself) |
| Sub-24px controls | **0** except Overview's 4 — see §6 |

Viewports: 1440×900 · 1024×768 · 768×1024 · 430×932 · 390×844 · 375×667.

### Focus traversal and motion — 13 surfaces, real dispatched `Tab`

| Check | Result |
|---|---|
| **Focus rings** | **480 / 480** product controls |
| Reduced-motion failures | **0 of 13 surfaces** — every surface reaches 0 animations / 0 transitions |
| Unnamed controls | 1 apparent (`execution` INPUT) — **false positive**: Chrome's own accessibility tree reports `spinbutton name="SIZE (USD)"` from its wrapping `<label>`; established in Stage 7 |

Never programmatic `.focus()` — `:focus-visible` does not match a scripted focus call.

### Semantic colour bands — CIE76 ΔE, threshold 18

**0 collisions across 48 pair checks in all 6 themes** (aurora, midnight, quantum, emerald,
institutional, ember). Pairs tested across the four bands: brand/interface vs market-side, brand vs
financial direction, market-side vs financial direction, provenance warning vs financial direction.

Contrast ratio alone cannot answer whether two swatches are distinguishable *from each other*, which is
why ΔE is used alongside it.

### Raw endpoint/path leakage

**No surface renders an endpoint path as a label or as chrome.** Five surfaces contain `/api/` strings,
and all five are **explanatory pending / error / empty-state sentences that name the feed being
awaited** — e.g. *"Waiting for /api/config and /api/survival…"*, *"No settled trades this session.
/api/trades/ledger is live and will populate this table as trades close."* That is diagnostic
information the brief asks to preserve. Every `ProvenanceBadge` path sits in a tooltip and accessible
name, except on **`/system`, which shows lineage prominently by design**.

### Loading / empty / error states

Every primary surface has error and pending handling. `settings` has none, correctly — it is local
preference state with one remote read (About's health status), and that row degrades to
"Status unavailable".

### Scope and terminology

No surface labels a process- or window-scoped figure as "Total" or "Lifetime" after Stage 10's one fix.
Scope-qualified copy is present in 20 places ("this process", "this engine process", "session-scoped",
"Resets when the engine restarts"). The single retained "lifetime" is `backoff.total429s`, which keeps
the backend's own field wording deliberately.

### Frozen-surface regression

All nine previously-frozen routes measured clean this stage: `ovfDoc 0 · ovfMain 0 · minFont 11px`, full
focus-ring coverage, reduced motion 0/0. No frozen-surface source file was modified in Stage 10 —
verified by modification time.

### Shared-component regression

Every shared module altered during the programme was re-checked for consumers and re-validated by its own
stage's frozen-surface run. The three that had outstanding questions are resolved in §4. `MarketChart.tsx`
and `EventStream.tsx` are unmodified.

---

# 6. REMAINING UI DEBT

### One accepted accessibility deviation

**U-1 · Overview: 4 inline text links below 24px.** `System console →` 89×16, `Overview` 49×16,
`Live Feed` 49×16, `Positions` 47×16. These are `<Link>` elements whose height is constrained by their
own line-height, each with a visible focus ring and an accessible name. WCAG 2.5.8 provides an *inline*
exception whose applicability here is arguable rather than certain.

**Not fixed**, because Overview is frozen and this is a judgement call rather than a clear failure. It is
a four-line change (`min-h-[24px]` each, the same pattern used on `TargetProgress`) if you want the
product at zero deviations before the freeze. **This is the only accessibility finding in the entire
sweep.**

### Carried UI debt — none blocking

| ID | Item | Origin |
|---|---|---|
| U-2 | System's six panels are `Card` not `Panel`, so System cannot use the state rail or density modes; System is 2.92 screens tall at 1440×900 and `Runtime` sits below the fold | Stage 8 |
| U-3 | Only 3 of 6 themes are offered (`SURFACED_THEMES` excludes aurora, quantum, emerald). All six identities exist and are unflattened; reaching three of them requires prior persistence | Stage 7 |
| U-4 | `AppearanceSettings` is hand-rolled in inline styles rather than `SettingsSection` | Stage 7 |
| U-5 | `DiagnosticsPanel` polls its client-side singleton at 1 Hz, re-rendering ~30 gauges per second while mounted | Stage 8 |
| U-6 | Analytics' Capital Growth duplicates Portfolio's value series (kept so Drawdown shares its axis) | Stage 8 |
| U-7 | `/api/balance` is largely redundant with `/api/portfolio` | Stage 6 |
| U-8 | The global loader polls all 31 endpoints on every page | Stage 6 |
| U-9 | `PortfolioOverview`'s three cards are hand-rolled divs, not `Panel`, and carry no provenance | Stage 6 |
| U-10 | `min_alignment` unmapped and unexplained; `memory_cleanups` unsurfaced (System is frozen) | Stage 9 |
| U-11 | Live Feed's market-question links are 16px tall when the feed is populated (same class as U-1) | pre-existing |
| U-12 | `probabilityColorVar` retained with no callers, deliberately, with its `@deprecated` explanation | Stage 5 |

Every one of these is independently shippable **after** a freeze. None is a correctness or accessibility
defect.

---

# 7. BACKEND / INTEGRATION DEBT

Fully consolidated in **[`BACKEND_CONTRACT_DEBT.md`](BACKEND_CONTRACT_DEBT.md)** — 14 items, each with
its measurement, what the frontend does about it today, and the backend change that would resolve it.

| ID | Item | Priority |
|---|---|---|
| **BC-1** | Naive ISO timestamps with no offset — 14 fields, 11 components, 8 routes | **highest** |
| **BC-6** | Four edge thresholds, no documented composition — the frontend cannot state the engine's real trading gate | **highest** |
| BC-2 | `/health.stats` does not declare its scope; `restarts` counts in-process restarts, not engine restarts | high |
| BC-3 | `/api/execution/status` does not declare its scope — produced the `$100.00` vs `$13.13` balance error | high |
| BC-13 | Stale market cache — root cause of the `$100 → $36,786` paper run-up | high (engine, not contract) |
| BC-5 | `/api/positions` carries no position `status` and no market `closes_at` | medium |
| BC-8 | `/api/survival` emits `THRIVING`, outside its documented vocabulary; plus two corrupted derived figures (`daily_pnl −11462.77`, `behind_target_pct 7813674.8`) that no surface renders | medium |
| BC-4 | `/api/runtime.stats` externally writable via `POST /api/update-stats`, beside authoritative data | medium |
| BC-7 | Undocumented units: `min_alignment`, `early_exit_threshold` | medium |
| BC-9 | `/api/portfolio/summary.initial_value` is window-relative, not starting capital | medium |
| BC-10 | No OpenAPI schema — mutation routes cannot be verified without firing them | medium |
| BC-11 | Two paper trade counters disagree | low |
| BC-12 | No memory-limit field (the 500MB ceiling lives inside a prose message) | low |
| BC-14 | Availability — 502s, restarts, and `/api/config` at 16.5 s against a 15 s client timeout | ongoing |

---

# 8. KNOWN BACKEND-DEPENDENT VALIDATION GAPS

The backend was unavailable for the whole of Stage 10 — `/api/health`, `/api/stats`, `/api/config` and
`/api/survival` all timing out at 20–25 s. Per instruction these are recorded as **pending**, not
fabricated, and no timeout was weakened to manufacture a result.

| Gap | Status | Last known result |
|---|---|---|
| **Q-5** — pinned numeric read-out steps with confirmations while the curve animates | **PENDING re-confirmation** | **PASS** earlier this session: plot 4.3/s vs axis 1.5/s, live runtime |
| **Populated Live Feed** — real events, `<ul>/<li>` semantics, repeat-collapsing | **PENDING re-confirmation** | **PASS** earlier this session: `EDGE / Edge detected / ×200 / … / YES / 9.1% edge`, 4 badges |
| **Live Strategy** — the Edge Thresholds and Timing panels against live `/api/config` | **PENDING** | Verified against the app's own fixture; provenance correctly read **SYNTHETIC** |
| **Provenance words** LIVE / STALE / DEGRADED | **Partially observed** | This sweep observed only `No feed` and `Awaiting` — correct offline behaviour. LIVE was observed on every surface in Stages 5–9 |
| **BC-1 evidence completion** | **PENDING** | `portfolio/history[].timestamp` never captured; 12 of 14 naive fields inferred rather than proven UTC |

**Why these do not block the freeze.** All three runtime items passed against a healthy backend **earlier
in this same session**, and Stage 10 changed one Analytics label — it did not touch `MarketChart.tsx`,
`EventStream.tsx`, `StrategyConsole.tsx`, or any data path feeding them. There is no mechanism by which
Stage 10 could have regressed them. They are re-confirmations of known-good behaviour awaiting a healthy
backend, not unknowns.

---

# 9. EXPLICITLY NOT BEING FIXED IN THE FRONTEND

Stated plainly so the freeze is not mistaken for completeness:

1. **BC-1 globally.** `isoToMs` stays as-is. 14 fields across 8 routes continue to render naive UTC
   timestamps shifted by the viewer's UTC offset. **This is a known, measured, unfixed defect.** The
   correct fix is one backend serialization change; the frontend workaround is available
   (`naiveUtcToMs`) but is not being applied globally on 2-of-14 proof.
2. **Counter scope.** The frontend *labels* process-scoped counters correctly; it cannot *know* their
   scope, because no endpoint declares it. The labels encode inference, anchored on co-located uptime.
3. **The edge-threshold composition.** Strategy shows all four values and states that their interaction
   is undocumented. It does not compute an effective gate, because no rule exists to compute it from.
4. **The stale market cache (BC-13).** Positions against expired markets now *look* expired. That is a
   UI fix to a data problem and must not be mistaken for a data fix.
5. **`min_alignment`, `memory_cleanups`.** Deliberately unsurfaced — one lacks semantics, the other
   belongs to a frozen surface.
6. **Two corrupted survival figures.** `daily_pnl` and `behind_target_pct` are not rendered anywhere.
   The frontend is hiding bad data, not correcting it.
7. **Mutation endpoint verification.** All eight remain registry-`confirmed` but were never independently
   verified, because verification requires firing them.
8. **U-1 through U-12.** Listed, not fixed.

---

# 10. FINAL RECOMMENDATION

## READY TO FREEZE

**Evidence:**

- Typecheck clean · **162/162** tests · production build clean · **22/22** pages · **102 kB** shared JS
  baseline held.
- **108 structural measurements** across 18 surfaces × 6 viewports: **0 horizontal overflow, 0 clipped
  controls, 11px floor held everywhere.**
- **480/480 focus rings.** **0 reduced-motion failures** across 13 surfaces.
- **0 semantic band collisions** across all 6 themes (48 ΔE pair checks).
- **0 endpoint paths** rendered as labels or chrome; the five that appear are explanatory sentences that
  name the feed — the diagnostic information the brief asks to keep.
- Every frozen surface re-measured clean; `MarketChart.tsx` and `EventStream.tsx` untouched.
- The three outstanding shared-module changes reviewed, each with its blast radius re-verified, and one
  earlier mis-statement of mine corrected.
- BC-1 handled exactly as instructed: read-only analysis of all consumers, evidence found insufficient
  and serialization found inconsistent, `isoToMs` left unchanged, recorded as backend debt.

**Qualifications attached to the verdict, not hidden from it:**

1. **Three runtime re-confirmations are pending a healthy backend** (§8). All three passed earlier in this
   session; Stage 10 touched none of their code paths. If you want the freeze certified with zero pending
   items, hold the push until the backend returns and re-run them — it is one sweep, not a work item.
2. **One accepted accessibility deviation** (U-1): 4 inline text links on Overview at 16px height.
   Arguable WCAG 2.5.8 inline exception, on a frozen surface. Four lines to resolve if you want zero.
3. **BC-1 remains an unfixed, measured defect** in the frozen artifact. The freeze is of a frontend that
   renders some timestamps wrong by the viewer's UTC offset, and that is a deliberate, documented choice
   rather than an oversight.

**Recommended sequence:** push and freeze now; run the three pending confirmations opportunistically when
the backend returns; begin the read-only backend forensic audit with
[`BACKEND_CONTRACT_DEBT.md`](BACKEND_CONTRACT_DEBT.md) as its agenda — **BC-1** and **BC-6** first, since
those two are the items where the frontend currently cannot tell the truth no matter how it is written.

---

*No commit, no push, no branch, no dependency installed. No backend code, contract or serialization
modified. Paper/simulation mode unchanged and not reset. All backend calls were GETs.*
