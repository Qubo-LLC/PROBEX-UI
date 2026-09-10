# PROBEX — Stage 7 Implementation Report: Execution + Settings Refinement

**Date:** 2026-09-10
**Scope:** `/execution`, `/execution?view=paper`, `/settings`
**Status:** Implemented and validated. Typecheck, tests and build clean. Two runtime captures pending a
backend recovery (§9, §11) — stated explicitly rather than fabricated.

**Safety boundary observed.** No order-placement functionality added. No new strategies, live-trading
capability, leverage control, execution mechanism, mutation endpoint or backend contract. No gate
bypassed or broadened. Live trading not enabled, no order placed, execution mode unaltered, paper state
not reset. **Every backend request this stage made was a GET**, and no POST endpoint was invoked — which
is also why §4 reports what could and could not be verified about them.

---

# 1. EXECUTION + SETTINGS AUDIT

### Current strengths

These are genuinely good and were left alone:

- **`MutationButton` is the right abstraction.** One control for all eight writes: confirmation for
  anything destructive, in-flight disable, the engine's own response surfaced verbatim rather than a
  generic "Done", the target endpoint shown beside the outcome, and an `aria-live` result line. A
  per-action button would have drifted.
- **`deriveWriteGate` is fail-safe, not fail-open.** Unknown resolves to BLOCKED. Its own source
  explains why: "a cockpit that has not yet been told whether the engine is risking real capital must
  not offer to spend it". It checks the two *definite* blocks before the "cannot say" case so the
  operator is told the specific reason.
- **`EmergencyStopPanel` distinguishes zero from unknown.** It withholds the blast-radius figures when
  position state is unavailable, rather than reporting "0 open · $0.00 at risk" — which its source
  correctly calls "a confident all-clear derived from having no information at all".
- **`ExecutionPolicyCard` is already truthful and complete** — real risk limits, the ten-stage order
  flow, and the engine's own `known_limitations`, including "This endpoint is read-only and never places
  orders."
- **`PaperTradingControls` separates reversible from destructive.** Reset sits below a rule, is styled
  destructive, and its confirmation names the exact number of trades that will be lost. Everything
  disables while engine state is unknown.
- **Settings does not fake capability.** Unbacked rows say "Available in a future release" rather than
  presenting dead toggles.
- **`/api/execution/policy` self-documents**, and `/api/paper-stats` carries an explicit
  `session_start` — real, machine-readable scope information.

### Visual debt

- `AppearanceSettings` hand-rolls its own card shape in inline styles while every sibling panel uses
  `SettingsSection`; `SettingsView` special-cases it by wrapping it in a bare `<Card>`.
- A hardcoded `#10B981` / `#059669` swatch literal and a hardcoded `rgba(128,128,128,0.15)` border in
  the theme previews.
- Execution's mode answer was scattered across three places at three weights, none of them first.

### Functional risks

- **The mutation panels were the first thing on the Execution page**, above all telemetry, with a
  comment arguing for exactly that. §4 of this brief asks for the opposite ordering.
- **`AboutSettings` asserted "All systems operational"** with a green dot and nothing behind it. At
  audit time `/api/health` reported `degraded`. A status line that cannot be wrong is not a status line.
- **Four "Open" buttons in About → Resources did nothing.** Enabled controls with no handler.

### Mutation / gating risks

- Paper mutations (`start`/`stop`/`reset`/`resolve`) do **not** pass through `useWriteGate` — unlike
  `createOrder`/`closePosition`/`cancelOrder`. In practice they are protected by `!stateKnown`, which
  disables all four when the engine has not reported, and they only affect simulated state. Documented,
  not changed: adding a gate would change existing gating behaviour, which this stage must not do.
- `useEmergencyStop` also bypasses the write gate. **This is correct** — a halt must remain available
  in live mode, which is precisely when the gate blocks order flow — and is left exactly as found.
- `ENDPOINTS.engine.updateStats` is registered `('POST', null, 'placeholder')`: a contract-pending
  mutation with a null path. **It has no consumer**, so no contract-pending mutation reaches the UI.

### Data / contract risks

- **`/api/execution/status` counters are process-scoped**, and the file header described the endpoint as
  "the SOURCE OF TRADING TRUTH". The Stage 6 forensic work disproved that. See §7.
- **`Focal unit="total P&L"`** on that process counter — the precise mislabel §8 of the brief forbids.
  Measured: it read `$0.00` over `0` trades while `/api/paper-stats` reported **3 trades and −$17.52**
  in the same session.

### Responsive problems

None found. Execution, Paper and Settings measured `ovfDoc 0 · ovfMain 0 · minFont 11px` with zero
clipped and zero sub-24px controls at all six viewports, before any change.

### Accessibility problems

- **The three theme cards had no focus ring.** Measured 39/42 on `/settings`; the three misses were
  exactly the theme cards, each reporting `outlineStyle: 'none'` against `outlineWidth: 3` — an inline
  `outline: 'none'` defeating `.focus-ring`. The control that changes the entire interface was the one a
  keyboard user could not locate.
- **`aria-live="polite"` wrapped the whole settings panel** — measured at **233 characters**, so every
  nav click read the entire section aloud. §15 names this as a thing not to do.

### Settings IA problems

- Of eight nav entries, **Security and Sessions & Devices contain no working control at all**, and both
  sat in the **first** group — where a configuration centre puts what matters most. The panels were
  honest; the nav was not.
- The default landing section was `appearance`, in the *second* group, so the nav's first group was never
  where the user started.

### Components worth reusing

`MutationButton`, `useWriteGate`/`deriveWriteGate`, `Panel`/`Focal`/`Row`/`RowGroup`/`Meter`,
`StatusChip`, `ProvenanceBadge`, `ProvenanceScope`, `SettingsSection`/`SettingRow`/`Toggle`/
`SegmentedControl`/`TextField`/`ReadOnlyValue`, `ConfirmDialog`, `TableShell`, `TargetProgress`.

### Components that should NOT be duplicated

No new table, chart, dialog, button, toggle or provenance system was created. The one new component is
`ExecutionModeBand`, a local function inside `ExecutionConsole.tsx` composed entirely from `StatusChip`
and existing tokens — not a new primitive, and not exported.

### Recommended implementation scope

Exactly what was implemented: reorder Execution so state precedes overrides; state paper/live in words;
correct the scope labels on process counters; restore the theme-card focus ring; make About's status
real; narrow the live region; stop offering dead controls; re-rank the Settings nav and mark unbacked
sections. No capability added, no gating changed.

---

# 2. DATA / CONTRACT INVENTORY

Verified against live responses captured 2026-09-09/10, not inferred from types.

### `/api/execution/policy` — read-only, every §9 example is a real field

| Field | Value observed |
|---|---|
| `mode` | `"paper"` |
| `live_trading_enabled` | `false` |
| `risk_limits.max_concurrent_positions` | `10` |
| `risk_limits.max_bet_percent` | `20` |
| `risk_limits.kelly_fraction` | `0.5` |
| `risk_limits.minimum_order_size_usd` | `10` |
| `risk_limits.max_latency_ms` | `100` |
| `order_flow` | 10 stages, `survival_brain_approval` → `position_tracking` |
| `order_template` | side, order type, price buffer, token selection |
| `known_limitations` | 3 strings, incl. "This endpoint is read-only and never places orders." |

**Not present, therefore not displayed:** blocked hours, confirmation thresholds, edge thresholds.
(`min_edge_threshold` exists on `/api/survival`, a different surface — not borrowed into this one.)

### `/api/execution/status` — process-scoped

`total_trades`, `wins`, `losses`, `win_rate`, `total_pnl`, `active_positions`, `closed_positions`,
`balance`, `balance_cache_age_sec`, `avg/fastest/slowest_execution_ms`, `retry_stats{…}`,
`rate_limiting.buckets{market,price,order}`, `backoff{…}`, `resolution_stats{…}`. **Carries no scope
discriminator** — see §15.

### `/api/paper-stats` — session-scoped, and says so

`session_start` (**explicit scope information**), `initial_capital`, `current_capital`, `total_trades`,
`wins`, `losses`, `pushes`, `pending`, `total_pnl`, `win_rate`, `avg_win`, `avg_loss`, `largest_win`,
`largest_loss`, `survival_states[]`, `edge_buckets{}`, `hourly_performance{}`.

### `/api/paper/status`, `/api/execution/orders`, `/api/execution/trades`

`enabled`, `pending_trades`, `completed_trades`, `total_pnl`, `win_rate` · `active_orders[]`,
`closed_orders[]`, counts · `active_positions[]`, `closed_positions[]`.

### Settings — backing store per section

| Section | Backed by | Real today |
|---|---|---|
| Appearance | `themeStore` (localStorage) | Yes — 3 of 6 themes offered (see D-1) |
| Trading & Workspace | `settingsStore` | Yes — 4 workspace preferences |
| Accessibility | `settingsStore` + `SettingsEffects` | Yes — applied to the document |
| Notifications | `settingsStore` | Choices yes; delivery is a future service (stated) |
| Profile | `settingsStore` | Partly — name/headline yes; email/avatar future |
| Security | — | **No working control** |
| Sessions & Devices | — | **No working control** |
| About | `APP_META` + **now `/api/health`** | Yes |
| Profit Targets | `/api/survival` + `preferencesStore` override | Yes — **untouched** |

---

# 3. EXECUTION STATE

A new `ExecutionModeBand` is the first element on the page. Every value is real: `policy.mode`,
`policy.live_trading_enabled`, `executionStatus.available`, and the write gate's own `reason` — the same
authority the order buttons obey, so the page and the controls cannot disagree.

Five states, each a **sentence with an explicit mode word**; the chip tone only reinforces it:

| State | Word | Sentence |
|---|---|---|
| engine unreachable | `UNAVAILABLE` | "The execution engine is unreachable. No execution state can be confirmed and no order can be sent." |
| mode/policy unread | `UNCONFIRMED` | "The engine has not yet reported its execution mode. Nothing below is confirmed until it does." |
| live mode or live trading on | `LIVE` | "The engine is configured for LIVE trading — orders it places risk real capital." |
| paper, subsystem unavailable | `PAPER · ENGINE DISABLED` | "…live trading is disabled, but the execution subsystem reports itself unavailable — figures below are its last known state." |
| paper, healthy | `PAPER` | "The engine is in PAPER mode and live trading is disabled. Every order below is simulated; no real capital is at risk." |

**Unknown is never rendered as paper.** When policy has not been read the band says `UNCONFIRMED`.

Captured against a genuinely unavailable backend (502, `runtime: offline`):

```
EXECUTION MODE | UNAVAILABLE | The execution engine is unreachable. No execution
state can be confirmed and no order can be sent. | Manual order flow: The engine
is unreachable — no order can be sent, and none should appear to be.
```

Evidence: `after-execution-degraded-{1440,375}.png`. No live-activation workflow was added and no live
control was made more prominent.

---

# 4. MUTATION / GATING INVENTORY

All eight existing mutations. **No new mutation hook, endpoint or capability was added**, and nothing
here had its gating changed.

| Mutation | Owner component | Endpoint | Registered | Write gate | Confirm | Disabled when |
|---|---|---|---|---|---|---|
| Emergency Stop | `EmergencyStopPanel` | `POST /api/execution/emergency-stop` | confirmed | **bypassed, by design** | Yes — names live blast radius | only when 0 open positions |
| Create Order | `ManualOrderPanel` | `POST /api/execution/create` | confirmed | Yes | Yes (Preview is unconfirmed) | no market / invalid size / over max bet / gate |
| Close Position | `PositionDetail` | `POST /api/execution/close/:market_id` | confirmed | Yes | Yes | no market id / gate |
| Cancel Order | `OrdersTable` | `POST /api/execution/cancel/:order_id` | confirmed | Yes | Yes | gate |
| Start Paper | `PaperTradingControls` | `POST /api/paper/start` | confirmed | No | skipped (reversible) | state unknown / already running |
| Stop Paper | `PaperTradingControls` | `POST /api/paper/stop` | confirmed | No | skipped (reversible) | state unknown / already stopped |
| Resolve Pending | `PaperTradingControls` | `POST /api/paper/resolve` | confirmed | No | skipped (safe nudge) | state unknown / nothing pending |
| **Reset Session** | `PaperTradingControls` | `POST /api/paper/reset` | confirmed | No | **Yes — names the trade count** | state unknown |

**On failure:** `MutationButton` renders the engine's own error verbatim alongside the endpoint, inside
an `aria-live="polite"` region, and clears any prior outcome before a fresh attempt.

**Can a control appear when the backend is unavailable?**

- Paper controls: **no** — all four disable on `!stateKnown`. Verified.
- Order flow: **no** — the gate returns `engine-unreachable` and blocks.
- **Emergency Stop: yes, deliberately.** Verified against the live 502: present and **enabled**, with
  its blast-radius figures withheld. This is the designed behaviour — the halt must be reachable
  precisely when the status endpoint is the broken thing.

**What could not be verified, and why.** The backend exposes no OpenAPI schema (`/openapi.json`,
`/docs/openapi.json`, `/api/openapi.json` all 404), so the only way to prove a POST route exists is to
call it — which would place an order or reset paper state. **I did not.** All eight are marked
`'confirmed'` in the registry from earlier work; this stage treats that as the authority and records the
limitation rather than asserting verification it did not perform.

---

# 5. EXECUTION DESIGN CHANGES

1. **`ExecutionModeBand` added at the top** (§3). First thing the page says.
2. **Mutation panels moved to the bottom**, into a labelled `Manual Intervention` section introduced as
   "Operator overrides… everything below acts against [the engine]", carrying the gate's own sentence
   when order flow is blocked. **Behaviour, gating and confirmation copy are untouched** — only rank.
3. **`Trading Record` → `Engine Process Record`**, subtitled "Resets when the engine restarts";
   `unit="total P&L"` → `"P&L this process"`; `Trades` → `Trades this process` with a scope tooltip;
   balance unit → "paper balance, this process". The zero-state now points the reader at where the real
   history lives instead of implying none exists.
4. **`ProvenanceScope detail="tooltip"`** — 7 raw endpoint paths were rendering as body text.
5. **Header comment corrected** — the "SOURCE OF TRADING TRUTH" claim is replaced with the measured
   truth about process scope.

Unchanged: latency, reliability, rate limiters, resolution tracker, paper session card, policy card,
`OrdersTable`, `EmergencyStopPanel`, `ManualOrderPanel`, all eight mutations.

### A regression I introduced, and fixed

Moving the panels to the bottom also moved them **inside** the `{ex && (…)}` guard, so when
`/api/execution/status` was unavailable the Emergency Stop **vanished entirely**. An AFTER capture taken
while the backend happened to be returning 502 exposed it: badges 6 → 0 and the mutation list went
empty. That is the opposite of the panel's documented intent. The section now sits **outside** the
guard; re-verified against the same 502 — halt present, enabled, figures withheld.

---

# 6. SETTINGS DESIGN CHANGES

1. **Theme cards gained the shared focus treatment.** Inline `outline: 'none'` removed, `className="focus-ring"` and `aria-pressed` added. 39/42 → **43/43**.
2. **Swatches use tokens.** The hardcoded emerald literal became `--probex-positive`, so the preview
   shows the theme's own palette; the hardcoded grey border became `--probex-border`.
3. **About's system status is real.** It now reads `/api/health`, mapping the canonical
   `online | degraded | offline` vocabulary (the wire's "healthy" is normalised to `online`) and naming
   the unhealthy components. **An unread slice renders "Status unavailable", never "operational".**
4. **Dead Resource buttons removed.** Four non-functional "Open" buttons became
   "Available in a future release", matching how the rest of Settings states the same thing. The
   "System Status" row was dropped from that list — the product has a System page, so a dead external
   link for it was noise.
5. **Live region narrowed.** `aria-live="polite"` (233 chars) replaced with `aria-labelledby` + an
   `sr-only` heading naming the active section, plus a `key` so the panel remounts cleanly. Settings
   live regions: 1 → **0**.
6. **Nav re-ranked and annotated.** `Preferences` now leads (it holds everything that works and is where
   the page already landed by default). `Security` and `Sessions & Devices` carry a **"Soon"** badge —
   a word, not a colour. `Profile` is *not* badged, because name and headline genuinely persist. Nav
   buttons also gained `focus-ring`.
7. **Subtitle made accurate** — "Appearance, workspace preferences, accessibility, and platform
   information" instead of promising profile and platform configuration management.

**Profit targets untouched** (§11 of the brief): `WalletPage` → `TargetProgress` → `/api/survival`
remains the sole source, with the existing display-only override intact. No second target source, no
hardcoded value.

**Themes preserved** (§12): all six identities remain in the token layer, unflattened; the semantic
bands are unchanged. No palette was altered.

---

# 7. ACCOUNTING / COUNTER SCOPE

Every Execution metric, classified as the brief requires:

| Metric | Source | Actual scope | Labelled as |
|---|---|---|---|
| P&L | `execution/status.total_pnl` | **current process** | "P&L this process" + "Resets when the engine restarts" |
| Trades | `execution/status.total_trades` | **current process** | "Trades this process" + tooltip |
| Wins / losses / win rate | `execution/status` | **current process** | inside the process-scoped panel |
| Balance | `execution/status.balance` | **current process** | "paper balance, this process" |
| Open / closed positions | `execution/status` | current process | inside the same panel |
| Latency (avg/fastest/slowest) | `execution/status` | **current process** | "No executions yet this session…" |
| Retries, network/balance/invalid-order errors | `retry_stats` | **current process** | "…this session" |
| Rate-limiter requests, wait rate | `rate_limiting.buckets` | **current process** | counters, no total claim |
| 429 backoff | `backoff.total429s` | labelled "lifetime" by the backend | left as the backend words it |
| Resolution stats | `resolution_stats` | **current process** | panel subtitled "This engine process" (Stage 6) |
| Paper capital / P&L / trades / win rate | `paper-stats` | **session**, with `session_start` | "Paper Session", start time shown |
| Paper pending / completed | `paper/status` | session | shown beside the paper-stats count |
| Uptime | `health.uptimeSeconds` | process | not surfaced on these two routes |

**Nothing is labelled "total" or "lifetime" unless the backend guarantees it.** The one case where it
does — `backoff.total429s` — keeps the backend's own wording.

The existing `≠ N from paper-stats` warning, which fires when `/api/paper/status.completed_trades`
disagrees with `/api/paper-stats.total_trades`, was already present and is retained: two distinct
backend counters, surfaced rather than reconciled.

---

# 8. PROVENANCE

| Surface | Visible raw paths before | after | Badges |
|---|---|---|---|
| `/execution` | **7** | **0** | 6 |
| `/execution?view=paper` | 4 | 1\* | 4 |
| `/settings` | 0 | 0 | 0 → 1 (About's real health status) |

\* The one remaining string on the paper tab is inside a sentence, not a label:
*"No trades have settled this session. /api/trades/ledger is live and will populate this table as
trades close."* That is an explanatory empty state telling the reader which feed will fill the table —
diagnostic information the brief asks to preserve, not chrome clutter. Left as-is.

`ProvenanceScope detail="tooltip"` now wraps `ExecutionConsole`, so badges keep their word
(`Live`) and move the path to the tooltip and the accessible name. No parallel provenance system was
created. Settings is mostly local preference state and correctly carries no feed badges; the one
genuinely remote value on it — platform health — now has real lineage instead of a hardcoded claim.

---

# 9. RESPONSIVE VALIDATION

All six viewports, aurora, real device-metrics emulation.

| View | Viewport | ovfDoc | ovfMain | Min font | Clipped | <24px |
|---|---|---|---|---|---|---|
| execution | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0\* | 0 |
| paper | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0\* | 0 |
| settings | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0\* | 0 |

Zero horizontal overflow on the document and on `main` independently, at every width. Theme selector,
segmented controls, toggles and the settings nav all usable at 375; the nav scrolls horizontally on
mobile and switches to a sticky column at `md`. `BottomNav` unaffected.

\* The probe's "10 clipped" at ≤768 is the off-canvas navigation drawer at `right: −9px` while `inert`
and `aria-hidden` — the same known false positive from Stages 3–6. **Genuine clipped controls: 0.**

**Pending:** the AFTER responsive sweep was captured while the backend was returning 502, so those
frames show Execution's empty/degraded states rather than a populated paper session. The BEFORE sweep
has the populated state, and the degraded state is captured deliberately. A populated AFTER sweep is
**outstanding pending backend recovery** and is not fabricated here.

---

# 10. ACCESSIBILITY VALIDATION

Real dispatched `Input.dispatchKeyEvent` Tab traversal, 50 stops per route — never programmatic
`.focus()`.

| Check | execution | paper | settings |
|---|---|---|---|
| Focus ring | **43/43** | **39/39** | **43/43** (was 39/42) |
| Controls <24px | 0 | 0 | 0 |
| Disabled controls reachable by Tab | 0 | 0 | 0 |
| Reduced motion (1ms threshold) | 1/38 → **0/0** | 1/42 → **0/0** | 1/42 → **0/0** |
| Live regions | 3 small (mutation outcomes, 0–79 chars) | 4 small (same) | **0** (was 1 × 233 chars) |
| Colour-independent mode word | ✓ `PAPER`/`LIVE`/`UNAVAILABLE`/`UNCONFIRMED` | ✓ | n/a |

**Form controls are all named.** Chrome's own accessibility tree reports
`combobox name="MARKET"` and `spinbutton name="SIZE (USD)"` — both from wrapping `<label>` elements. An
earlier attribute-only heuristic of mine reported these as unnamed; the accessibility tree is the
authority and they are correct.

The remaining live regions are `MutationButton` outcome lines — announcing the result of an action that
otherwise only changes remote state. That is the appropriate use, and they are small. No new live region
was added; one was removed.

The "Soon" badge is a word, and is uppercased by CSS rather than by content, so it survives greyscale
and colour-vision deficiency.

---

# 11. PERFORMANCE CHECK

**Outstanding pending backend recovery.** A 30-second resource-timing measurement on both routes
returned **0 API requests**, because the backend was returning 502 and the runtime had resolved to
`offline` — the loader correctly stops polling rather than hammering a dead endpoint. That is a useful
observation but not the measurement §16 asks for, so the polling figures are **not reported as if
measured**.

What *was* established without the network:

- **No new request, poll, timer or interval was introduced.** Stage 7 touched four presentational files
  and added no hook, no store slice and no fetch. `ExecutionConsole` now reads `useWriteGate()`, which
  is a pure `useMemo` over slices already in the store.
- **No duplicate subscription.** `ExecutionConsole` already subscribed to `executionStatus`,
  `executionPolicy`, `paperStats` and `paperStatus`; the gate reads `identity` and `executionPolicy`
  from the same store rather than re-fetching.
- **Mutation state cleanup is unchanged** — `MutationButton` resets a stale outcome before each new
  attempt, and `PerformanceWindow`'s abort-controller pattern (the one direct fetcher) was not touched.
- **Bundle:**

| Route | Size | First Load JS |
|---|---|---|
| `/execution` | 11.1 kB | 179 kB |
| `/settings` | 7.72 kB | 120 kB |
| shared by all | — | 102 kB |

---

# 12. BEFORE / AFTER REVIEW

| Question a reader asks | Before | After |
|---|---|---|
| Is this engine paper or live? | a small chip in the header, a bare mode word, and "LIVE TRADING OFF" at the bottom of the page | a band at the top stating it in a sentence, with five explicit states |
| What is the first thing this page offers me? | an Emergency Stop button | the engine's execution posture |
| Is this $0.00 my P&L? | "total P&L" — on a counter that resets with the process | "P&L this process", subtitled "Resets when the engine restarts" |
| Where did this figure come from? | 7 raw `/api/…` strings as body text | 0 visible; all in tooltips and accessible names |
| Can I see which theme card I'm on? | no — no focus ring at all | yes, 43/43 |
| Are all systems operational? | asserted unconditionally, while health said degraded | read from `/api/health`, with the unhealthy components named |
| Does this "Open" button work? | no, four of them did nothing | "Available in a future release" |
| Is there anything for me in Security? | indistinguishable from working sections | marked "Soon" in the nav |
| Can I still halt the engine if it's unreachable? | yes | **yes** — preserved, and re-verified after I briefly broke it |

Evidence in `docs/design-export/evidence/stage-7/`: `before-*` and `after-*` for execution, paper and
settings at 1440/1024/768/430/390/375 with scrolled frames at the headline sizes, plus
`after-execution-degraded-{1440,375}.png`.

---

# 13. FILES CHANGED

**Modified (4). No new files, no deletions.**

| File | Change |
|---|---|
| `src/components/execution/ExecutionConsole.tsx` | `ExecutionModeBand` added; mutations moved to a labelled intervention section **outside** the status guard; process-scope labels; `ProvenanceScope`; header comment corrected |
| `src/components/settings/AppearanceSettings.tsx` | focus ring restored (`outline:'none'` removed); `aria-pressed`; swatch literals → tokens |
| `src/components/settings/AboutSettings.tsx` | system status reads `/api/health`; dead resource buttons declared honestly |
| `src/components/settings/SettingsView.tsx` | nav re-ranked; unbacked sections marked "Soon"; live region narrowed to a labelled region; `focus-ring` on nav; accurate subtitle |

No backend file, no contract, no dependency, no route, no store slice, no new hook. No frozen-surface
file touched — verified by modification time against Overview, Live Feed, Markets, Market Detail,
`MarketChart.tsx`, Positions and Portfolio, all **unchanged**.

---

# 14. TYPECHECK / TEST / BUILD RESULTS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** — exit 0, no diagnostics |
| Tests | `npx vitest run` | **PASS** — **162 passed**, 13 files |
| Build | `npm run build` | **PASS** — compiled in 9.9s, **22/22 static pages**, **22 route rows**, 102 kB shared |

Matches the expected baseline exactly. No dependency installed, no commit, no push.

Two typecheck failures were caught and fixed during implementation rather than worked around: a
duplicated `'use client'` directive, and a comparison against `'healthy'` when the canonical
`EngineHealthStatus` vocabulary is `'online' | 'degraded' | 'offline'`.

---

# 15. BACKEND CONTRACT GAPS

1. **`/api/execution/status` does not declare its own scope.** Nothing in the payload says these
   counters are process-scoped; the frontend has to know it out of band, which is how the "total P&L"
   mislabel survived. A `scope` discriminator (or a `process_started_at`, as `/api/paper-stats` already
   does with `session_start`) would make it machine-readable. **The single most useful addition from
   this stage.**
2. **No OpenAPI schema is served.** `/openapi.json`, `/docs/openapi.json` and `/api/openapi.json` all
   404, so no mutation route can be verified without invoking it. A schema would let the cockpit prove
   an endpoint exists before offering a control that targets it.
3. **`/api/paper/status.completed_trades` and `/api/paper-stats.total_trades` disagree.** Two counters
   over the same concept; the UI shows both and flags the difference.
4. **Paper mutations have no declared gating semantics.** The contract does not say whether
   `POST /api/paper/reset` is rejected in live mode, so the frontend cannot gate on anything but its own
   read state.
5. **Backend availability.** During this stage the engine moved from healthy → `survival: DEAD` →
   upstream reset → **502 across all endpoints**, which is what left §9 and §11 incomplete. Carried
   forward from the B-8 availability item.
6. `ENDPOINTS.engine.updateStats` is a registered `POST` with a `null` path and `'placeholder'` status —
   harmless today (no consumer), but it is a contract stub sitting in the registry.

---

# 16. REMAINING DEBT

- **D-1 — Only 3 of 6 themes are offered.** `SURFACED_THEMES` excludes aurora, quantum and emerald
  ("demoted… they are just not offered"), so a user cannot reach three palettes that the Stage 2 work
  fully maintained. All six identities are preserved in tokens and unflattened, so §12 of the brief is
  satisfied — but which themes are *offered* is a product decision that was taken deliberately, and
  this stage does not overturn it. **Flagged for your decision, not changed.**
- **D-2 — `AppearanceSettings` is still hand-rolled** in inline styles rather than `SettingsSection`,
  and `SettingsView` still special-cases it with a bare `<Card>`. Converting it is a visual refactor of
  a working panel; I fixed its accessibility defect and left its shape alone.
- **D-3 — Security and Sessions & Devices remain empty.** Now marked, not removed — removing nav entries
  is a roadmap decision.
- **D-4 — `/api/execution/status` scope is handled by labelling, not by data.** If the backend ever adds
  a scope field, these labels should read it instead of asserting it.
- **D-5 — Carried from Stage 6:** `/api/portfolio/summary` baseline-relative return; `/api/balance`
  redundancy; global polling fan-out to all 31 endpoints on every page; Overview's 4 pre-existing
  sub-24px inline text links; `PortfolioOverview`'s three hand-rolled cards.
- **D-6 — Two Stage 7 runtime measurements outstanding** pending backend recovery: a populated AFTER
  responsive sweep (§9) and the polling/duplicate-request measurement (§11).

---

# 17. RECOMMENDATION FOR STAGE 8

**Stage 7 is ready for review. Strategy, Analytics and System were not started.**

I recommend **System + Analytics** as Stage 8, in that order of emphasis:

- **System is the natural successor to this stage.** §15's headline gap — that process-scoped counters
  do not declare their scope — lands hardest on System, which is where `/api/health`,
  `/api/system/metrics`, uptime and the runtime components live. It is also the one route that already
  had a design validation pass (the Stage 1 `SYSTEM_DESIGN_VALIDATION.md`) whose conclusions have never
  been implemented, so there is a written brief waiting for it.
- **About now links conceptually to System** — this stage pointed platform health at `/api/health` and
  dropped a dead "System Status" link because the product has a real System page. Those two surfaces
  should agree on vocabulary, and doing them adjacently is how that happens.
- **Analytics pairs with it** as the other read-only intelligence surface, and its segment/signal/hourly
  endpoints are already wired and polled but thinly presented.
- **Strategy last.** It is the most interpretive surface, and it will benefit from the scope vocabulary
  System settles.

Suggested shape, matching the rhythm that has worked: audit with no code changes, then implement, then
report — with the audit checking specifically whether any health or metric value is asserted rather than
read, which is the defect class this stage found twice.

---

*No commit, no push, no branch, no dependency installed. All backend calls were GETs; no POST invoked;
paper/simulation mode unchanged and not reset by me. Overview, Live Feed, Markets, Market Detail,
Positions, Portfolio and `MarketChart.tsx` unmodified. Stage 8 not begun.*
