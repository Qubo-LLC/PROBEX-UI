# PROBEX — Backend / Integration Contract Debt

**Opened:** 2026-09-10 (Stage 9)
**Purpose:** the backend- and contract-side items accumulated across Stages 5–9, recorded for the
deeper backend investigation that begins after the frontend freeze.

**Nothing in this document has been fixed in the backend.** No backend code, serialization or contract
was modified in any stage. Each item states what was observed, how it was measured, what the frontend
does about it today, and what a backend change would look like.

Numbering is `BC-n` so it cannot collide with the UI debt registers (`INDEPENDENT_DEBT_REGISTER.md`
uses `D-1…D-5`, and each stage report uses its own `D-n`).

---

## BC-1 · Naive ISO timestamps with no timezone offset — **highest value**

**Observed.** `/health` (and the same pattern across the API) serialises timestamps without a timezone
designator. Captured live against the running engine:

```
local now (ISO)        2026-09-09T22:24:44.201Z
payload timestamp      2026-09-09T22:24:43.012344     ← no Z, no offset
component checked_at   2026-09-09T22:24:43.012114     ← no Z, no offset
uptime_seconds         336
```

The values **are** UTC. But ECMAScript parses a date-*time* string with no offset as **local** time, so
`new Date(iso)` lands off by the viewer's UTC offset:

```
parsed as LOCAL → age 3.00 h      ← what the frontend's isoToMs does
parsed as UTC   → age 0.00 h      ← the truth
```

**How it surfaced.** Stage 8 displayed probe age for the first time (`checked_at`, a field that had been
mapped and never rendered). The System health panel showed **"3h ago" for a probe that had answered one
second earlier**, on a machine at UTC+3. It was caught before shipping.

**Blast radius in the frontend.** `isoToMs` feeds **58 fields**, including every frozen surface —
Overview, Live Feed, Markets, Market Detail, Positions, Portfolio, Execution.

**What the frontend does today.** A deliberately narrow fix: a `naiveUtcToMs` helper
(`src/lib/services/dto.ts`) appends `Z` when no offset is present, and it is applied to **`checked_at`
only** — the one field with no other consumer. Verified after: the cell reads "just now".
`isoToMs` itself is **unchanged**, so no frozen surface moved.

**Why the global frontend fix was not taken.** Correcting `isoToMs` is a one-line change and is the right
frontend fix, but it would shift displayed times on every frozen surface during a UI stage. Per the Stage
9 instruction it was explicitly left alone.

**Backend change that would resolve it.** Serialise with an offset — `2026-09-09T22:24:43.012114Z` (or
`+00:00`). That fixes all 58 frontend fields at once and removes the need for any frontend helper.
**Not done; no backend serialization was modified.**

**If the backend cannot change:** switch `isoToMs` to `naiveUtcToMs` as a single deliberate change, with
a verification sweep across the frozen surfaces.

---

## BC-2 · `/health.stats` does not declare its scope

**Observed.** The counter block resets with the engine process, but nothing in the payload says so. It
had to be established by catching a restart:

```
61s after a restart:   uptime_seconds 60.9 · health_checks 8 · warnings 0 · errors 0 · restarts 0
Stage 1, ~11h uptime:  health_checks 5,488 · warnings 5,482 · errors 0 · restarts 0
```

**Sharpest consequence.** `restarts: 0` **immediately after a restart** — the field does not count engine
restarts. It counts restarts the health monitor performed *inside* this process, which is close to the
opposite of its natural reading.

**Frontend today.** The counter group is captioned "since this engine process started", and `restarts`
carries a tooltip stating it is in-process component restarts, not engine restarts.

**Backend change.** A `stats_since` timestamp, or a `scope` discriminator, on the stats block.

---

## BC-3 · `/api/execution/status` does not declare its scope either

**Observed.** Process-scoped counters presented identically to persisted ones. Measured simultaneously:

| | `/api/execution/status` | `/api/portfolio` |
|---|---|---|
| balance | 100.00 | **13.13** |
| realized P&L | 0.00 | **−86.87** |
| total trades | 0 | **186** |

**Consequence found in Stage 6.** The Portfolio page printed "ACCOUNT VALUE $100.00" for an account
holding $13.13, and "REALIZED PERFORMANCE $0.00 — nothing has been realized" across an 85% drawdown.

**Frontend today.** Capital and realized P&L read `/api/portfolio` (persisted). The process-scoped figures
remain, in a panel named "This Engine Process", shown only when the two sources actually disagree.

**Backend change.** A `scope` field, or a `process_started_at`, so the distinction is machine-readable
rather than tribal knowledge.

---

## BC-4 · `/api/runtime.stats` is externally writable yet sits beside authoritative data

**Observed.** `runtime.stats` is writable via `POST /api/update-stats` and has held seeded test data, in
the same payload as the authoritative 14-component flag map.

**Frontend today.** The block is headed "Bot-reported counters · not accounting", the figure reads
"P&L as reported" rather than the previous "total P&L", and a note points at `/api/portfolio` for the
real ledger.

**Backend change.** Separate the writable telemetry from the authoritative runtime state, or mark it.

---

## BC-5 · `/api/positions` carries no position status and no market close time

**Observed.** Open-position rows carry `entry_price`, `current_price`, `size`, `pnl`,
`time_held_seconds`, `opened_at`, `direction`, `edge_pct`, `asset_category`, `asset_symbol`,
`duration_minutes` — but **no `status`** and **no `closes_at`**.

**Frontend today.** Market lifecycle is recovered by joining `market_id` against the markets catalogue.
The join legitimately misses (the engine caches only what it currently tracks), and those rows render a
dash rather than a guess. `duration_minutes` is deliberately **not** used to synthesise a close time — a
position can open anywhere inside its window, so `opened_at + duration_minutes` would be a
plausible-looking wrong answer.

**Backend change.** A `closes_at` or a resolved `status` on the position row removes the join and its
blind spot.

---

## BC-6 · Four edge thresholds, no documented composition — **Stage 9's central finding**

**Observed.** The contract publishes four edge-threshold numbers across two endpoints:

| Field | Endpoint | Value | Nature |
|---|---|---|---|
| `min_edge` | `/api/config` | 2 | static, base |
| `min_edge_yes` | `/api/config` | **4** | static, YES side |
| `min_edge_no` | `/api/config` | **3** | static, NO side |
| `min_edge_threshold` | `/api/survival` | **1.5** | live, survival-modulated |

**The gap.** Nothing documents how they combine — whether the live survival threshold overrides the
configured pair, floors it, or applies only to the symmetric `min_edge`. Note the live value (1.5) is
**below** the configured base (2) and well below both side thresholds.

**Consequence found.** Strategy showed one number and called it the gate: "edge must exceed 1.50%", with
the note "configured floor 2.00%" — a value presented as sitting below its own stated floor.

**Frontend today.** All four are shown with their source and marked live or configured; the asymmetry is
stated explicitly (4% to buy YES vs 3% to buy NO); and one sentence says the composition is undocumented.
**No composition rule was invented.**

**Backend change.** Document the precedence, or expose a single resolved `effective_min_edge_yes` /
`effective_min_edge_no` pair so the UI can state the real gate.

---

## BC-7 · Undocumented units and semantics on two config fields

**Observed, on `/api/config`:**

- **`min_alignment: -0.5`** — a name and a value, with nothing about what is being aligned or on what
  scale. **Deliberately not surfaced** in Strategy: a figure labelled "Min alignment −0.5" on an
  intelligence surface invites the reader to invent a meaning.
- **`early_exit_threshold: -70`** — plausibly a P&L percentage, but not documented. Surfaced **with its
  raw field name and an explicit "unit not documented" note** rather than rendered as "−70%".

**Backend change.** Document units, or suffix the field names (`_pct`).

---

## BC-8 · `/api/survival` emits a state outside its documented vocabulary, and two corrupted figures

**State.** `state: "THRIVING"` was observed live with capital at 149.9% of the starting bankroll.
`THRIVING` is not in the documented set (`HEALTHY | CAUTION | WOUNDED | DANGER | CRITICAL | DEAD`), so
the frontend's unknown-state fallback scored it `caution` and painted the engine's **best** state in the
**warning** colour — on Strategy, Survival and Overview.

**Frontend today.** `THRIVING` added to the known states above `HEALTHY`, scoring `ok`.

**Corrupted figures.** In an earlier capture the same endpoint returned `daily_pnl: -11462.77` and
`behind_target_pct: 7813674.8` against a $100 account, alongside a sound `weekly_pnl: -85.33`. **No
surface renders those two fields**; `daily_target` / `weekly_target`, which are sound, are the only
survival values shown.

**Backend change.** Publish the full state vocabulary; investigate the two derived figures.

---

## BC-9 · `/api/portfolio/summary.initial_value` is window-relative, not starting capital

**Observed.** `initial_value: 2298.14` with `total_return_pct: -99.36`, while the account's real starting
capital was **100** and its true return was **−85.3%**. `initial_value` is the first value in the
retained snapshot window — a retention boundary inflated by the stale-market-cache run-up the forensic
audit documented.

**Frontend today.** Left as reported and **not** reinterpreted as lifetime capital anywhere. Stage 8
additionally removed an Analytics subtitle that implied the series began at a session boundary
("since session start"), replacing it with the window derived from the data.

**Backend change.** Either rename to `window_initial_value`, or add a true `starting_capital`.

---

## BC-10 · No OpenAPI schema, so mutation routes cannot be verified without firing them

**Observed.** `/openapi.json`, `/docs/openapi.json` and `/api/openapi.json` all return 404.

**Consequence.** The eight mutation endpoints are marked `'confirmed'` in the frontend registry from
earlier work, but Stage 7 could not independently verify any of them: the only way to prove a POST route
exists is to call it, which would place an order or reset paper state. **It did not.**

**Backend change.** Serve a schema.

---

## BC-11 · Two paper counters disagree over the same concept

**Observed.** `/api/paper/status.completed_trades` and `/api/paper-stats.total_trades` report different
counts for the same session.

**Frontend today.** Both are shown, with the discrepancy flagged (`≠ N from paper-stats`) rather than
reconciled.

---

## BC-12 · No memory-limit field

**Observed.** `/api/system/metrics` exposes `memory.rss_mb` and `memory.vms_mb` but no ceiling. The 500MB
figure exists only inside the `memory` probe's free-text message
(`"Memory usage: 287.6MB / 500MB"`).

**Frontend today.** Memory is a figure with **no gauge**, because a gauge needs a domain and parsing
prose into one would be inventing a contract.

---

## BC-13 · Stale market cache — the root cause behind several UI symptoms

**Observed.** `api_access` probe: `"Market data stale (10498.6s old, 2 markets cached)"`. The forensic
audit traced the entire `$100 → $36,786` paper run-up to it: one market traded 37× in 13.88h at a
constant entry of 0.615, constant 38.5% edge, 37W/0L on a 15-minute market.

**Frontend today.** Positions against a market whose close time has passed are now *visibly* closed. That
is a UI fix to a data problem and must not be mistaken for a data fix.

---

## BC-14 · Availability

The engine returned **502 across all endpoints** for extended periods during Stages 7–8 and restarted at
least twice. It also moved from healthy → `survival: DEAD` → an upstream reset to $100 → `THRIVING` at
$149.87 within a single session. Carried as the long-standing **B-8** availability item.

---

## Suggested order for the post-freeze backend work

`BC-1` → `BC-6` → `BC-3` / `BC-2` → `BC-13` → `BC-5` → `BC-8` → the rest.

**BC-1 first**: one serialization change, fixes 58 frontend fields, and every future stage inherits the
bug otherwise. **BC-6 second**: it is the only item where the frontend currently cannot state the
engine's actual trading gate. **BC-3 and BC-2** next because they are what allowed a wrong balance to
reach a user. **BC-13** is the largest behavioural problem but is an engine fix, not a contract one.
