# PROBEX — Stage 8 Implementation Report: System + Analytics Refinement

**Date:** 2026-09-10
**Scope:** `/system`, `/system?view=events`, `/analytics`
**Status:** Implemented and validated. Typecheck, tests and build clean. All runtime validation completed
against a healthy live backend.

**Boundary observed.** No backend change, no endpoint created, no contract invented. No strategy,
execution, trading control, live trading or risk-policy change. No data fabricated. Every backend call
was a GET. Overview, Live Feed, Markets, Market Detail, Positions, Portfolio, Execution, Settings and
`MarketChart.tsx` are unmodified — verified by modification time in §13.

---

# 1. SYSTEM + ANALYTICS AUDIT

### Current strengths

- **`SystemStatePanel`'s layered-truth model** — frontend → engine reachable → engine operating →
  execution mode, with simulated layers marked. It is the only panel that reports whether anything
  *answered*, and it correctly comes first.
- **`HealthPanel` per-probe truth.** One failing probe tints its own row and gets a 3px left rule; it
  never colours the whole panel. Latency is tiered (≥250ms amber, ≥1000ms bold red) so "healthy but
  answering in 8 seconds" is visible.
- **The engine's own raw messages survive** — `"Market data stale (10498.6s old, 2 markets cached)"` is
  shown verbatim rather than summarised away.
- **`ConfigPanel` states there is no write path** instead of showing disabled inputs.
- **`AnalyticsPage` is honest about what does not exist.** V1's ETF flows, institutional flow and
  on-chain intelligence were not rebuilt; `ConsensusAccuracyAnalytics` is wrapped in
  `IntelligenceModule` and says plainly that no endpoint joins edge direction to resolution outcome.
- **`SegmentPerformance` was repointed to a real source** (`/api/survival/patterns`) after the fictional
  Bitcoin-category taxonomy it assumed turned out never to exist.
- **`DiagnosticsPanel` already distinguishes "the engine stopped answering" from "the app stopped
  asking"** via the circuit-breaker readout.

### Visual debt

- **Six full-width `Card`s in one column** (Stage 1 finding S-1). Measured at 1440×900 with every panel
  populated: **2.6 screens of content**, `Health` at y=615 and `Runtime` at y=889 against an 848px fold.
  Answering "what is down?" required scrolling.
- **The 14 runtime components were a flat 5-column grid** (S-3). `telegram_alerter` — the only inactive
  one — was no easier to find than any of the other thirteen.
- **Health counters were a cramped right-aligned strip** (S-4), and `warnings` was mapped but never
  rendered at all. On the Stage 1 capture that hidden field read **5,482 warnings against 5,488
  checks**.
- Every System panel is `Card`, not `Panel` (S-6), so System cannot use the state rail or density modes
  the rest of the product has. **Not changed** — see D-2.

### Functional risks

- **`checked_at` was mapped and never displayed.** §10's "LAST SIGNAL" field existed all along.
- **Three of six System panels rendered *nothing* for up to 30 seconds after page load.** `RuntimePanel`,
  `SystemMetricsPanel` and `ConfigPanel` all did `return null` while their slices were empty, and all
  three poll on the 30s SLOW tier. Measured: a fresh load showed only System State + Endpoint
  Diagnostics, stable across a 24-second observation — I initially mistook this for four broken panels
  before a 20-second settle proved they render fine.
- **The System Events view had no provenance badge and no event count.** `EventLog` builds both, inside
  its `{!embedded && <PageHeader>}` branch — and `SystemDomain` always renders it embedded. Measured 0
  badges against Live Feed's 4. This is the identical defect Stage 5 found on Markets.

### Data / contract risks

- **`runtime.stats.totalPnl` was labelled "total P&L".** That field is writable from outside the app via
  `POST /api/update-stats` and has held seeded test data — its own source comment says so. The caveat was
  a footnote *below* the figure.
- **A timezone bug in `isoToMs`**, surfaced by displaying probe age for the first time. See §7.
- **`"Account equity curve since session start"`** on Analytics' Capital Growth chart. The series is
  `/api/portfolio/history`, the engine's *retained snapshot window* — the same window whose first value
  made `/api/portfolio/summary.initial_value` read 2298.14 against a real starting capital of 100. It is
  not a session boundary.

### Scope / semantics risks

- Health `checks` / `warnings` / `errors` / `restarts` carried no scope label.
- `RuntimePanel` gave **live** execution mode the **positive** (green) tone, while the Stage 7 Execution
  band gives LIVE `danger`. Two vocabularies for the state that risks real capital.
- `DiagnosticsPanel`'s gauges are **client-side** — they count what this browser tab requested. Rendered
  as rings beside genuine engine telemetry they read as backend truth, and the disclaimer was a
  paragraph *below* the gauges.

### Responsive problems

None found, before or after. Every route measured `ovfDoc 0 · ovfMain 0 · minFont 11px`, zero clipped
and zero sub-24px controls at all six viewports.

### Accessibility problems

None found on these two routes in the audit — focus rings, target sizes and reduced motion were already
clean. (Contrast with Stage 7, where the theme cards had no ring at all.)

### Components worth reusing

`Card`, `StatusChip` + `toneForStatus`, `RadialGauge`, `EventStream` + `severityColor` + `EVENT_TYPES`,
`ProvenanceBadge`, `ProvenanceScope`, `LiveChart` + `chartStateFromSlice`, `TableShell`,
`IntelligenceModule`, `EmptyState`/`ErrorState`, `formatUptime`, `normalizeHealthStatus`.

### Components that should NOT be duplicated

No new table, chart, gauge, event stream, dialog or provenance system was created. `EventStream` was
**reused, not duplicated** — §5 establishes that the events view is a filtered view of the same source.
The only new code units are two small local helpers (`formatSignalAge`, a `CLUSTERS` constant) and one
shared adapter function (`naiveUtcToMs`).

### Recommended Stage 8 scope

What was implemented: counter scope labels and the hidden `warnings` figure; probe last-signal; runtime
component clustering; the "total P&L" relabel; the live-mode tone; pending states for the three blank
panels; client-side diagnostics labelled at the top; a density pairing; the Events view's missing
lineage; Analytics' window claim, provenance scope and narrative order. Deliberately **not** in scope:
converting System's six `Card`s to `Panel`, and surfacing the nine further real-but-unmapped config
fields (both in §16).

---

# 2. DATA / CONTRACT INVENTORY

Captured live 2026-09-09/10. The engine restarted mid-stage, which produced the scope evidence in §4.

### `/health` — per-probe truth

| Field | Observed |
|---|---|
| `status` | `"healthy"` (wire word) → canonical `online` via `normalizeHealthStatus` |
| `components[]` | `price_feed`, `main_loop`, `api_access`, `memory` |
| `components[].healthy` | boolean per probe |
| `components[].message` | engine's own text, e.g. `"Memory usage: 287.6MB / 500MB"` |
| `components[].latency_ms` | nullable |
| **`components[].checked_at`** | **naive ISO — mapped, never displayed until now** |
| `uptime_seconds` | `60.9` immediately after the restart |
| `check_duration_ms` | `0.23` |
| `stats.health_checks / warnings / errors / restarts` | `8 / 0 / 0 / 0` after the restart |
| `stats.memory_cleanups` | `0` — **on the wire, absent from our DTO** |
| `stats.last_warning / last_error` | nullable strings |

### `/api/runtime`

`mode`, `initialized_at`, `components{}` (14 booleans), `stats.{edges_detected, orders_executed,
total_pnl, started_at}` — **externally writable via `POST /api/update-stats`**.

### `/api/system/metrics`

`uptime.formatted`, `memory.rss_mb`, `memory.vms_mb`, `cpu.percent`, `event_log_size`.
**No memory ceiling field** — the 500MB figure exists only inside the `memory` probe's free-text message.

### `/api/events` — 34,690 bytes, populated

`events[]` with `id`, `type`, `severity`, `title`, `message`, `timestamp`, `metadata{}`; `count`, `limit`.
Server-side `type` filtering; severity has no server parameter.

### Analytics sources

| Surface | Endpoint | State |
|---|---|---|
| Capital Growth | `/api/portfolio/history` | live, populated |
| Drawdown | derived from the same series | marked `provenance="derived"` |
| Pattern Performance | `/api/survival/patterns` | live |
| Edge Quality | `/api/edges` | live |
| Kelly Utilization | `/api/survival` + `/api/config` | live |
| Engine Status | `/api/analytics/*` | live |
| Signal Accuracy | — | **no endpoint exists**; stated as such |

---

# 3. SYSTEM DESIGN CHANGES

1. **`warnings` surfaced** alongside uptime/checks/errors/restarts, and the whole group captioned
   **"since this engine process started"** — one statement for the group rather than five bare nouns.
2. **A warning-rate line** appears when warnings ≥50% of checks: *"N of M checks raised a warning this
   process — X% of them."* On the Stage 1 data that would have read 5,482 of 5,488 — 99.9%. A healthy
   engine shows nothing extra.
3. **Probe rows gained a last-signal column** from `checked_at` (§10). The probe row now reads
   `price_feed | Connected and receiving data | just now | 496ms`. The exact timestamp is in the tooltip.
4. **The 14 runtime components are grouped into six clusters** — Core, Market Data, Execution,
   Intelligence, Accounting, Alerting — each with a `n/n` ratio that turns amber when incomplete.
   `Alerting 0/1` now makes the single inactive component findable at a glance. **The grouping is
   labelled on screen as a presentation choice derived from component names**, because the engine
   exposes a flat map with no topology.
5. **`runtime.stats.totalPnl` lost its "total P&L" claim.** The block is now headed
   *"Bot-reported counters · not accounting"*, the figure reads *"P&L as reported"*, and the note says
   it is externally writable and points at Portfolio for the real ledger.
6. **Live execution mode uses the `danger` tone**, matching Stage 7's Execution band, instead of
   `positive`.
7. **Pending states replace three blank panels.** Runtime, Process Metrics and Configuration each state
   which endpoint they are awaiting and that it polls every 30 seconds.
8. **`DiagnosticsPanel` declares its origin in the heading** — *"This browser session — not engine-side
   telemetry"* — rather than only in a paragraph below the gauges. Nothing was removed.
9. **Process Metrics and Configuration are paired side by side at `lg`.** Measured: total page height
   2474px instead of ~2734px.
10. **`Uptime` → `Process uptime`** on the metrics panel.

**§6 gauges:** no gauge gained motion, and none implies a maximum the backend does not define. The
`RadialGauge` rings in Diagnostics have a real 0–1 domain (success rate). Memory is shown as a figure
with no bar, because **no memory-limit field exists** — the 500MB ceiling lives only inside a
human-readable probe message, and parsing prose into a gauge domain would be inventing a contract.

---

# 4. SYSTEM COUNTER SCOPE

Every System counter, classified. The engine restarting mid-stage made this measurable rather than
inferred:

```
61 seconds after the restart:
  uptime_seconds 60.9 · health_checks 8 · warnings 0 · errors 0 · restarts 0

Stage 1 capture, same fields, ~11h uptime:
  health_checks 5,488 · warnings 5,482 · errors 0 · restarts 0
```

| Counter | Source | Scope | Evidence | Labelled as |
|---|---|---|---|---|
| uptime | `/health.uptime_seconds` | **process** | 60.9s after restart | "since this engine process started" |
| checks | `stats.health_checks` | **process** | 5,488 → 8 across a restart | same group caption |
| warnings | `stats.warnings` | **process** | 5,482 → 0 | same group caption |
| errors | `stats.errors` | **process** | reset with the process | same group caption |
| **restarts** | `stats.restarts` | **process, and NOT engine restarts** | **`0` immediately after a restart** | tooltip: "Component restarts performed by the health monitor inside this process — not a count of engine restarts" |
| memory_cleanups | `stats.memory_cleanups` | process (same block) | — | **not surfaced** (D-3) |
| Process uptime | `/api/system/metrics` | **process** | — | "Process uptime" |
| Memory RSS / VMS, CPU | `/api/system/metrics` | instantaneous | — | card titled "Process Metrics" |
| Event log size | `/api/system/metrics` | current retained | — | "Event log holding N entries" |
| edges detected / orders executed | `runtime.stats` | **process, and externally writable** | `POST /api/update-stats` | "Bot-reported counters · not accounting", with `since <started_at>` |
| total_pnl | `runtime.stats` | **untrusted** | has held seeded data | **"P&L as reported"** — no longer "total P&L" |
| Endpoint gauges | `lib/diagnostics.ts` | **this browser session** | client-side | "This browser session — not engine-side telemetry" |

**Nothing on System is labelled "total" or "lifetime".** The one counter that was — `total P&L` on the
least trustworthy field on the page — no longer is.

---

# 5. SYSTEM EVENTS

**What the architecture actually is:** `/system?view=events` renders `EventLog`, which reads the same
`/api/events` slice the Live Feed tails, through the same shared `EventStream` component. It is **a
filtered, deeper representation of one event source** — not a separate source and not a parallel console.
Verified by reading identical rows on both surfaces:

```
Live Feed     : EDGE / Edge detected / ×200 / Detected 2 market edge(s) / YES / 9.1% edge / 2 edges
System Events : EDGE / Edge detected / ×200 / Detected 2 market edge(s) / YES / 9.0% edge / 2 edges
```

The division of labour is real: Live Feed owns immediacy, `EventLog` owns filtering and depth (server-side
`type`, client-side `severity`, `limit` 200).

**`EventStream` was reused, not duplicated.** No event category was invented. Semantic separation holds:
severity drives the category chip, market side stays on `--probex-yes`/`--probex-no`, financial direction
stays on positive/negative, provenance stays on the badge.

**One fix:** the embedded view gained the lineage badge and depth readout it had never shown. Measured
after: `Data source: Live (/api/events)` and `200 events retained · limit 200`, where both were
previously absent.

---

# 6. ANALYTICS DESIGN CHANGES

1. **The false window claim is gone.** "Account equity curve since session start" is replaced by a label
   derived from the data itself — *"N snapshots over Xh Ym, from <first timestamp>"* — with a fallback
   naming the retained window rather than a session. Drawdown's subtitle now says it is measured *within
   that window*.
2. **Narrative order (§17).** The page opened on Edge & Sizing — a strategy *input*. Performance History
   now leads as the primary analytical view; **Edge Quality & Sizing** follows as the comparative detail,
   with a line saying it holds the inputs behind the curve above; Attribution is the supporting
   breakdown; Signal Accuracy stays last and honestly inactive.
3. **`ProvenanceScope detail="tooltip"`** — Analytics rendered 4 raw endpoint paths as body text.
   Measured after: **0**. This is the deliberate asymmetry §21 asks for: System may expose lineage,
   Analytics should not.

**Not duplicated from Portfolio:** Capital Growth does draw the same `/api/portfolio/history` series as
Portfolio's Portfolio Value chart. It is kept because Drawdown — unique to Analytics — is derived from
it and the two must share an axis to be comparable. Recorded as D-4 rather than silently left
unexplained.

**No timeframe control was added.** §16 says not to add timeframes the data does not already support;
`/api/portfolio/history` takes a `limit`, not a user-facing window, so the honest fix was to **state the
window** the charts actually cover rather than imply a selectable one.

---

# 7. ANALYTICS DATA TRUST

| Metric | Classification |
|---|---|
| Capital Growth series | **backend-provided** (`/api/portfolio/history.total_value`) |
| Drawdown | **frontend-derived** peak-to-trough, marked `provenance="derived"` |
| Chart window | **window-relative** — the engine's retained snapshot range, now stated |
| Pattern win rate | backend-provided, normalised 0–100 → 0–1 |
| Pattern avg P&L | backend-provided |
| Edge quality | backend-provided (`/api/edges`) |
| Kelly utilisation | derived from `/api/survival` + `/api/config`, both real |
| Signal accuracy | **unavailable** — no endpoint; stated as such |

**`/api/portfolio/summary.initial_value` was not reinterpreted.** It remains window-relative and is not
read as lifetime starting capital anywhere on Analytics. The only change was to stop a *different*
surface implying the same thing in prose.

**§14 — win/loss semantics verified independently, not assumed.** From a real
`/api/paper-stats.edge_buckets` capture:

```
"10%+": { wins: 1, losses: 2, win_rate: 33.33 }   →  1 / (1+2) = 33.3 %
```

`win_rate` is `wins / (wins + losses)`. **No inversion.** Colour usage is also correct and
non-duplicating: win rate uses positive/**warning** (a sub-50% rate is a caution, not a loss), avg P&L
uses positive/**negative** (financial direction), and market side keeps `--probex-yes`/`--probex-no`.

### A timezone bug this stage surfaced

Displaying probe age for the first time exposed a pre-existing data-correctness bug:

```
local now (ISO)      2026-09-09T22:24:44.201Z
payload timestamp    2026-09-09T22:24:43.012344   ← no timezone suffix
component checked_at 2026-09-09T22:24:43.012114   ← no timezone suffix
uptime_seconds       336

parsed as LOCAL → age 3.00 h     ← what isoToMs does
parsed as UTC   → age 0.00 h     ← the truth
```

The engine emits naive ISO strings that **are** UTC. `isoToMs` is `new Date(iso).getTime()`, and
ECMAScript parses an offset-less date-time string as **local** time — so every such value lands off by
the viewer's UTC offset. On this machine (UTC+3) the panel showed **"3h ago" for a probe that had
answered one second earlier**, and I nearly shipped it.

**Fix scoped deliberately.** `isoToMs` feeds **58 fields** across the product, including frozen surfaces.
A global correction is the right fix but would change displayed times on Overview, Markets, Positions,
Portfolio and Execution, which this stage must not touch. `checkedAt` is the one field with **no other
consumer** — mapped and never rendered until now — so a new `naiveUtcToMs` helper is applied to it alone.
Verified after: the cell reads **"just now"**. The global bug is D-1.

---

# 8. PROVENANCE

| Surface | Visible raw paths before | after | Badges |
|---|---|---|---|
| `/system` | 4 | 4 — **intentional** | 2 |
| `/system?view=events` | 0 | 0 | **0 → 1** |
| `/analytics` | 4 | **0** | 6 |

The asymmetry §21 asks for is now real. **System keeps its lineage visible on purpose**: a diagnostic
cockpit where the reader is asking which endpoint answered. Those four strings are the System State
panel's `runtime · /health · /` provenance line, the metrics badge, and two deliberate explanatory
notes — each placed, not leaked. **Analytics moved every path into tooltips and accessible names**,
because a reader there is asking what the history shows.

No parallel provenance system was created. The Events view's new badge is the existing
`ProvenanceBadge`, reading the same slice the rows came from.

---

# 9. RESPONSIVE VALIDATION

All six required viewports, aurora, real device-metrics emulation.

| View | Viewport | ovfDoc | ovfMain | Min font | Clipped | <24px |
|---|---|---|---|---|---|---|
| system | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0\* | 0 |
| system events | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0\* | 0 |
| analytics | 1440 / 1024 / 768 / 430 / 390 / 375 | 0 | 0 | 11px | 0\* | 0 |

Zero horizontal overflow on the document and on `main` independently at every width. Gauge rings stay
legible (fixed 64px, auto-fill grid from 108px). The clustered component tiles reflow 5 → 3 → 2 columns.
Probe rows keep the name column at a fixed width and let the message truncate, so latency and
last-signal stay aligned. Diagnostic tables remain usable at 375.

\* The probe's "10 clipped" at ≤768 is the off-canvas navigation drawer at `right: −9px` while `inert`
and `aria-hidden` — the same known false positive from Stages 3–7. **Genuine clipped controls: 0.**

**Density note:** System grew from **2.6 to 2.92 screens** of content at 1440×900, and `Runtime` moved
from y=889 to y=981. The cluster headers cost that height. The trade was taken deliberately — an
incomplete *area* is now findable, which is what an operator scanning this page wants, and Runtime was
already below the 848px fold beforehand. My own in-code comment initially claimed the pairing "lifts the
runtime matrix toward the fold"; the measurement contradicted it, so the comment was corrected rather
than the measurement ignored.

---

# 10. ACCESSIBILITY VALIDATION

Real dispatched `Input.dispatchKeyEvent` Tab traversal, 55 stops per route, after a 14-second settle so
every panel was present. Never programmatic `.focus()`.

| Check | system | system events | analytics |
|---|---|---|---|
| Focus ring | **50/50** | **52/52** | **44/44** |
| Controls <24px | 0 | 0 | 0 |
| Reduced motion (1ms threshold) | 3/82 → **0/0** | 4/42 → **0/0** | 1/31 → **0/0** |
| Live regions | 0 | 0 | 0 |
| Labelled graphics | **31** (`RadialGauge` aria-labels) | 0 | 0 |
| Unnamed progressbars | 0 | 0 | 0 |
| Status word present | ✓ | ✓ | n/a |
| Cluster ratios present | ✓ `n/n` | — | — |

**Chart accessibility:** every `RadialGauge` carries an `aria-label` naming its endpoint and percentage;
the bucket bars carry `role="progressbar"` with `aria-valuenow/min/max`. `LiveChart` was not modified.

**Colour-independent meaning** holds throughout: probe state has a dot *and* the engine's message, the
component tiles print `on`/`off` as text, cluster completeness prints `n/n`, and health status prints the
engine's own word. The new cluster ratio turns amber *and* reads `0/1`.

---

# 11. PERFORMANCE CHECK

Measured over 30 seconds on each route against a healthy backend:

| Route | Requests / 30s | Rate | Distinct endpoints |
|---|---|---|---|
| `/system` | 125 | 4.2/s | 31 |
| `/analytics` | 125 | 4.2/s | 31 |

Only `/api/stats` and `/api/price-history` exceed the 5s tier, at 15× in 30s — the declared FAST (2s)
tier, by design. **No endpoint is fetched twice at the same tier**, and Stage 8 added no request, poll,
slice or subscription. The charts read slices already polled.

**One timer noted, not changed:** `DiagnosticsPanel` runs `setInterval(read, 1000)` to poll its
non-reactive client-side singleton, re-rendering ~30 gauges every second while mounted. It is correctly
torn down on unmount and touches no network. Reducing it would change a working diagnostic's refresh
behaviour, so it is recorded as D-5 rather than adjusted here.

**Bundle:**

| Route | Size | First Load JS |
|---|---|---|
| `/system` | 12.6 kB | 172 kB |
| `/analytics` | 6.96 kB | 235 kB |
| shared by all | — | **102 kB** (baseline held) |

---

# 12. BEFORE / AFTER REVIEW

| Question a reader asks | Before | After |
|---|---|---|
| How fresh is this "healthy" reading? | not shown at all | `just now` per probe, timestamp in the tooltip |
| Is 8 checks a lifetime total? | bare label "checks" | "since this engine process started" |
| Does `restarts: 0` mean the engine never restarted? | implied yes | tooltip: in-process component restarts, not engine restarts |
| Are warnings a problem? | the field was never rendered | surfaced, plus a ratio line when ≥50% |
| Which area is degraded? | 14 identical tiles | six clusters with `n/n`; `Alerting 0/1` |
| Is this −$X the account's P&L? | labelled "total P&L" | "P&L as reported", under "not accounting" |
| Is live mode good? | green `positive` chip | `danger`, matching Execution |
| Why is half this page empty? | three panels returned `null` for up to 30s | each states the endpoint it awaits |
| Are these gauges engine telemetry? | caveat in a footnote below them | "This browser session" in the heading |
| Where did this event log come from? | no badge, no depth | `Live (/api/events)` · `200 events retained · limit 200` |
| What window does this equity curve cover? | "since session start" (wrong) | `N snapshots over Xh Ym, from <timestamp>` |
| Where did this analytic come from? | 4 raw paths as body text | 0 visible; tooltips and accessible names |

Evidence in `docs/design-export/evidence/stage-8/` (54 files): `before-*` and `after-*` for system,
system-events and analytics at 1440/1024/768/430/390/375 with scrolled frames at the headline sizes,
plus `after-system-populated-{1440,375}[-scroll].png` and
`after-system-events-populated-{1440,375}.png`. A genuine **degraded** capture was also taken while the
backend was returning 502 and the circuit breaker had opened — the `before-system-390` frame records
`stopped responding 3× in a row; retrying in 55s`, unfabricated.

---

# 13. FILES CHANGED

**Modified (9). No new files, no deletions.**

| File | Change |
|---|---|
| `src/components/system/HealthPanel.tsx` | `warnings` surfaced; counter group scope-captioned; warning-rate line; probe last-signal column; `formatSignalAge` |
| `src/components/system/RuntimePanel.tsx` | six derived clusters with `n/n`; live mode → `danger`; "total P&L" claim removed; pending state |
| `src/components/system/SystemMetricsPanel.tsx` | pending state; `Uptime` → `Process uptime` |
| `src/components/system/ConfigPanel.tsx` | pending state |
| `src/components/system/DiagnosticsPanel.tsx` | client-side origin stated in the heading |
| `src/components/system/SystemConsole.tsx` | Metrics + Config paired at `lg`; Diagnostics last; comment corrected to the measured effect |
| `src/components/events/EventLog.tsx` | embedded view gains its lineage badge and depth readout |
| `src/components/analytics/PerformanceAnalytics.tsx` | real data window derived and stated; two subtitles corrected |
| `src/components/analytics/AnalyticsPage.tsx` | `ProvenanceScope`; narrative re-order |
| `src/lib/services/dto.ts` | **additive** `naiveUtcToMs`; `checkedAt` parsed as UTC |

`dto.ts` is shared, so the change was kept additive: a new exported helper, plus one field
(`checkedAt`) whose only consumer is the System health panel. No frozen surface reads it — verified.

**Frozen surfaces verified unchanged** by modification time: `OverviewPage`, `LiveFeedConsole`,
`EventStream`, `MarketCard`, `MarketDetailPage`, `MarketChart`, `PositionsConsole`, `PortfolioMetrics`,
`ExecutionConsole`, `SettingsView`.

---

# 14. TYPECHECK / TEST / BUILD RESULTS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** — exit 0 |
| Tests | `npx vitest run` | **PASS** — **162 passed**, 13 files |
| Build | `npm run build` | **PASS** — 13.8s, **22/22 static pages**, **22 route rows**, **102 kB shared** |

Baseline held exactly, shared JS included. No dependency installed, no commit, no push.

### §26 regression check — all confirmed

| Check | Result |
|---|---|
| Overview / Live Feed / Markets / Market Detail / Positions / Portfolio / Execution / Settings | **unchanged** (mtime + structural probe: 0 overflow, 11px floor, all seven routes) |
| `MarketChart.tsx` | **unchanged** |
| **Q-5** | **PASS** — plot 4.3/s vs axis 1.5/s against a live runtime |
| **Populated Live Feed** | **PASS** — `EDGE / Edge detected / ×200 / … / YES / 9.1% edge`, 4 badges, repeat-collapsing intact |
| Positions / Portfolio / Capital still functional | **PASS** — 2 open + 9 settled rows, 0 visible paths, no render error |
| Fabricated endpoints / data | none |
| Backend modifications | none — all GETs |
| New dependencies | none |
| Unrelated files changed | none |

Pre-existing sub-24px inline text links remain on two frozen surfaces: Overview (4) and, now that the
feed is populated, Live Feed (13 market-question links). Both are inline text links on frozen routes and
were not introduced by this stage.

---

# 15. BACKEND CONTRACT GAPS

1. **Naive timestamps with no timezone offset.** `/health` sends `checked_at` and `timestamp` as
   `2026-09-09T22:24:43.012114` — UTC in fact, but unmarked, so any standards-compliant parser reads
   them as local. Appending `Z` (or an offset) server-side would fix 58 frontend fields at once. **The
   highest-value item here.**
2. **`/health.stats` does not declare its scope.** Nothing says these counters reset with the process;
   it had to be established by catching a restart. A `stats_since` timestamp would make it readable.
3. **`stats.restarts` is ambiguously named** — it counts in-process component restarts, not engine
   restarts, which is the opposite of the natural reading.
4. **No memory-limit field.** The 500MB ceiling exists only inside the `memory` probe's free-text
   message, so a memory gauge cannot be given a truthful domain without parsing prose.
5. **`/api/runtime.stats` is externally writable** via `POST /api/update-stats` and has held seeded test
   data, yet sits in the same payload as authoritative component flags.
6. **No endpoint joins edge direction to market resolution outcome**, so signal accuracy remains
   genuinely uncomputable — correctly shown as inactive rather than approximated.
7. **`/api/portfolio/summary.initial_value` remains window-relative** (carried from Stage 6).
8. **Availability.** The engine was returning 502 across all endpoints for part of this stage and
   restarted at least once. Carried forward as B-8.

---

# 16. REMAINING DEBT

- **D-1 — The global `isoToMs` timezone bug.** 58 fields still parse naive UTC strings as local time.
  The correct fix is a one-line change to `isoToMs`, but it would alter displayed times on every frozen
  surface, so it needs its own approved change. `naiveUtcToMs` already exists for it to adopt.
- **D-2 — System's six panels are `Card`, not `Panel`** (Stage 1 finding S-6), so System still cannot
  use the state rail, density modes or freshness treatment the rest of the product has. A contained but
  real refactor.
- **D-3 — Nine real fields remain unmapped**, all confirmed live on `/api/config` and `/health`:
  `min_edge_yes`, `min_edge_no`, `min_volume`, `min_alignment`, `blocked_hours`,
  `edge_confirmation_count`, `early_exit_threshold`, `low_liquidity_start_hour`/`end_hour`, and
  `stats.memory_cleanups`. Asymmetric YES/NO edge thresholds are a meaningful strategy parameter the
  product currently hides.
- **D-4 — Capital Growth duplicates Portfolio's Portfolio Value series.** Kept so Drawdown has a shared
  axis; worth an explicit decision.
- **D-5 — `DiagnosticsPanel`'s 1Hz interval** re-renders ~30 gauges per second while mounted.
- **D-6 — System is 2.92 screens tall** at 1440×900 and `Runtime` sits below the fold. Genuinely
  reducing that needs the `Panel` density work in D-2, not more composition tweaks.
- **D-7 — Carried forward:** Stage 7's D-1 (only 3 of 6 themes offered) and D-2 (`AppearanceSettings`
  hand-rolled); Stage 6's `/api/balance` redundancy, global 31-endpoint polling fan-out,
  `PortfolioOverview`'s hand-rolled cards, and Overview's 4 pre-existing sub-24px links.

---

# 17. RECOMMENDATION FOR STAGE 9

**Stage 8 is ready for review. Strategy was not started.**

**Stage 9 should be Strategy** — it is the last unrefined route, and it is now the right time for it:

- Strategy is where the engine's *reasoning* is presented, and this stage established the vocabulary it
  will need. Consensus, survival state, edge thresholds and Kelly sizing all appear there, and three of
  those are the fields D-3 says are currently hidden.
- The audit discipline that has paid off every stage applies especially here: Strategy is the most
  interpretive surface in the product and historically the most prone to presenting derived or
  decorative values as engine truth (V1's Analytics was the cautionary case, and
  `ConsensusAccuracyAnalytics` is the honest remnant of it). Expect the main findings to be
  *frontend-calculated values presented as engine conclusions*.

Two items are worth taking **before or alongside** it, and both are small:

1. **D-1, the `isoToMs` fix.** It is one line plus a verification sweep across the frozen surfaces, and
   every stage from here on inherits the bug otherwise.
2. **D-3, the nine unmapped fields.** Strategy is the surface that would actually use the asymmetric
   edge thresholds, so mapping them is a natural prerequisite rather than a detour.

Suggested shape, unchanged because it keeps working: audit with no code changes, then implement, then
report — with the audit asking of every number whether the engine computed it or the frontend did.

---

*No commit, no push, no branch, no dependency installed. All backend calls were GETs; paper/simulation
mode unchanged and not reset. Overview, Live Feed, Markets, Market Detail, Positions, Portfolio,
Execution, Settings and `MarketChart.tsx` unmodified. Stage 9 not begun.*
