# PROBEX — System Page Design Validation

**Date:** 2026-09-08 · **Phase:** validation only — no application code modified
**Reference produced:** `stitch-pilot/output/SYSTEM-reference-desktop-1440.{png,html}` (1440×900, captured at `deviceScaleFactor: 2`)

---

## 0 · How this reference was made

Stitch never rendered a System page, so there was nothing to evaluate. I built the reference myself, against the **real** System implementation and **live engine data**.

Every value in it was read from the running engine at **2026-09-08 18:26–18:27 UTC**:

```
/api/health          status degraded · 4 probes · check_duration 0.15ms
                     stats: 5488 checks · 5482 warnings · 0 errors · 0 restarts
                     · 133 memory_cleanups · last_warning "stale_market_data"
/api/system/metrics  uptime 11h 8m 14s · rss 411.82MB · vms 790.17MB · cpu 0.0%
                     · event_log_size 200
/api/runtime         mode paper · initialized 07:18:17 · 13/14 components active
/api/config          paper · bankroll $100 · max_bet 20% · min_edge 2.0/4.0/3.0
                     · kelly 0.5 · max_latency 100ms
/api/stats           BTC $78,714.10 · feed_latency 673.35ms
```

**One panel is explicitly marked `ILLUSTRATIVE` in the reference itself** — Endpoint Diagnostics. Its counters are client-side and only exist once the app has been running, so no honest server-side value exists to show. The panel's *shape* is real; its numbers are placeholders and are labelled as such on the artifact, not just in this document.

The reference renders in platform fonts. **Q-1 (Geist + JetBrains Mono, self-hosted) is approved but not implemented**, so the typographic colour here is the Windows fallback, exactly as with the original export.

---

## 1 · What the current System page actually does wrong

Grounded in `current/screens/desktop/system-desktop-1440.png`.

| # | Observation | Consequence |
|---|---|---|
| **S-1** | **Six full-width panels in a single vertical stack.** `SystemConsole.tsx` renders `SystemState → Health → Runtime → Metrics → Diagnostics → Config` as one column. | Only **two** panels fit in 900px. The operator scrolls to answer "is anything wrong?" |
| **S-2** | **Rows span the full 1600px content width** — label at x≈380, value at x≈590, detail at x≈1890. | ~1300px of dead space per row. The eye traverses the whole screen to pair a label with its value. It reads as a settings form, not an instrument. |
| **S-3** | **No grouping of the 14 runtime components.** | Documented debt #43. `telegram_alerter: false` is the only inactive one and there is nothing to make it findable. |
| **S-4** | **Health counters are a right-aligned strip** (`10h 27m · 8,730 · 0 · 0`) competing with the DEGRADED chip on the same line. | The most operationally interesting number here — **5,482 warnings against 5,488 checks** — is invisible. |
| **S-5** | **Memory appears three times**, in three different framings: a health probe message, RSS, and VMS. | No single answer to "is memory a problem?" |
| **S-6** | Every panel is `Card`, not `Panel`. | System cannot use the state rail, density modes or freshness that the rest of the product has. |

**What is already excellent and must survive:** the layered-truth model in `SystemStatePanel` (frontend → reachable → operating → mode, with simulated layers marked); per-probe truth where one failing probe colours only its own row; the engine's own raw messages (`"Market data stale (40101.9s old, 7 markets cached)"`); honest provenance (`LIVE · runtime · /health · /`); and `ConfigPanel` stating there is no write path rather than showing disabled inputs.

---

## 2 · What works from the Stitch cockpit direction

| Concept | Verdict | Applied as |
|---|---|---|
| **Milled-panel elevation** (inset top highlight + drop shadow) | **Works** | Every panel in the reference. Reads as hardware, not as a floating card. |
| **2px left status rail** | **Works — already ours** | System State carries a `degraded` rail. `Panel.tsx` already implements this. |
| **`label-caps` — 11px mono, 0.06em tracking** | **Works well** | Panel titles and metric labels. Gives the technical register without neon. |
| **Mono for all numerics** | **Works** | Latencies, memory, counters, config values all align in columns. |
| **Four-tier surface stratification** | **Works** | `surface #0C1424` panels on `bg #03050D`, with `lowest #060A14` for recessed probe rows and table headers. **`surface-lowest` is what makes rows read as inset instrument slots** — this is the single most valuable new token for System. |
| **Dense density (6/10)** | **Works** | Six panels now fit in 900px where two did. |
| **4/6px radii** | **Works** | Mechanical, not soft. |
| **Grouped diagnostics** | **Works — with our own taxonomy** | See §4. |
| **Restrained motion** | **Works** | Nothing animates. Two LEDs carry a soft glow; that is the entire decorative budget. |

---

## 3 · What does not work

| # | Concept | Why it fails here |
|---|---|---|
| **SD-1** | **`CLOSED / HALF-OPEN / TRIPPED` circuit display** | **Not representable.** `circuitBreaker.ts:78-80` is explicit: *"Zeroing here rather than tracking a separate half-open"* state. `circuitSnapshot()` returns `{ key, open, cooldownSeconds, consecutiveFailures }` — a **binary**. Showing three states would require either inventing one or changing the breaker. **Flagged, not fabricated.** The reference shows `CLOSED` only. |
| **SD-2** | **Stitch's cluster names** — "Core Execution / Oracle Feeds / Risk Engine" | Invented. None maps to a real component. Replaced with a taxonomy derived from the actual 14 names (§4). |
| **SD-3** | **`ORACLE SYNTH` provenance label** | There is no oracle-synthesis provenance in this product. Our seven `ProvenanceBadge` variants are the vocabulary. |
| **SD-4** | **"Diagnostic logs with inline copy buttons"** | A new control. Defensible later, but it is not in the current implementation and this pass does not add controls. |
| **SD-5** | **"Memory metrics with physical unit bounds"** — as a general rule | Only **RSS** has a bound (500MB, from the probe message). **VMS has no configured ceiling**, so it gets a figure and no bar. Drawing a bar for an unbounded metric invents a limit. |
| **SD-6** | **`backdrop-filter: blur(12px)` on overlays** | Contradicts the brief's "no excessive glassmorphism" and costs compositing on a page that already polls at 2s. Use `surface-overlay #182744` and a border. |
| **SD-7** | **`status-synthetic` = "paper mode"** | Already rejected (reconciliation R-2). System is where this matters most: the reference shows `PAPER` as its own chip and reserves Indigo for mock/offline data. |

---

## 4 · Runtime topology grouping — derived, not invented

The 14 real flags, grouped by function using **only their own names**:

| Cluster | Components | Live |
|---|---|---|
| **CORE** | `bot`, `health_monitor` | 2/2 |
| **MARKET DATA** | `clob_client`, `market_fetcher`, `market_history` | 3/3 |
| **EXECUTION** | `execution_engine`, `paper_trader`, `resolution_tracker` | 3/3 |
| **INTELLIGENCE** | `consensus_engine`, `survival_brain`, `analytics_engine` | 3/3 |
| **ACCOUNTING** | `pnl_calculator`, `portfolio_tracker` | 2/2 |
| **ALERTING** | `telegram_alerter` | **0/1** |

Six clusters, 14 components, one row, all visible. `telegram_alerter` being the sole inactive component is now immediately findable.

> **This grouping is a frontend presentation choice, not engine truth.** The engine exposes a flat boolean map with no dependency information. Worth confirming with Jake that the clustering matches the real topology — added to the backend handoff as a **question**, not an assumption.

---

## 5 · Real data mapping

Every element in the reference, and its source.

| Element | Source | Field |
|---|---|---|
| Layer: Frontend | `runtimeConfig` | deployment + policy |
| Layer: Engine reachable | `runtimeConfig` | `apiBaseUrl` + probe |
| Layer: Engine operating | `/api/health` | `status` + healthy count |
| Layer: Execution mode | `/api/runtime` | `mode` |
| Probe rows ×4 | `/api/health` | `components[].name/healthy/message/latency_ms` |
| Check duration | `/api/health` | `check_duration_ms` |
| Last warning / error | `/api/health` | `stats.last_warning` / `last_error` |
| Uptime | `/api/system/metrics` | `uptime.formatted` |
| Memory RSS + bar | `/api/system/metrics` + probe message | `memory.rss_mb`; 500MB ceiling from the `memory` probe text |
| Memory VMS | `/api/system/metrics` | `memory.vms_mb` — **no bar, no ceiling exists** |
| CPU | `/api/system/metrics` | `cpu.percent` |
| Counters ×5 | `/api/health` | `stats.health_checks / warnings / errors / restarts / memory_cleanups` |
| Event log | `/api/system/metrics` | `event_log_size` |
| Topology 14 chips | `/api/runtime` | `components{}` |
| Mode · up since | `/api/runtime` | `mode`, `initialized_at` |
| Config rows | `/api/config` | `environment`, `initial_bankroll`, `max_bet_percent`, `min_edge*`, `kelly_fraction` |
| Header BTC · feed | `/api/stats` | `current_price`, `feed_latency_ms` |
| Endpoint diagnostics | `lib/diagnostics.ts` + `circuitBreaker.ts` | shape real · **values illustrative, labelled on the artifact** |

**Nothing else is shown. There is no invented latency, memory, feed, daemon state, control, endpoint or action.**

### 5.1 Real fields the frontend does not currently surface

Found while probing. All confirmed live on `/api/config` and `/api/health`, all absent from our DTOs:

`min_edge_yes` (4.0) · `min_edge_no` (3.0) · `min_volume` (5.0) · `min_alignment` (−0.5) · `blocked_hours` (`[]`) · `edge_confirmation_count` (1) · `early_exit_threshold` (−70.0) · `low_liquidity_start_hour` / `low_liquidity_end_hour` (0/0) · `stats.memory_cleanups` (133)

This is **genuinely new real content** for System — asymmetric YES/NO edge thresholds are a meaningful strategy parameter we currently hide. The reference surfaces `min_edge · YES · NO` and `memory_cleanups`. Adding the DTO fields is a small, safe, separately-trackable change.

### 5.2 One finding worth raising with Jake

**5,482 warnings against 5,488 health checks — 99.9%.** `last_warning` is `stale_market_data`, and `api_access` has been failing with market data ~40,000s (11h) stale, i.e. since the process started. This is not a display problem; the reference surfaces it rather than averaging it away. Backend item.

---

## 6 · Component reuse

| Reference element | Existing component | Change |
|---|---|---|
| Every panel | `ui/Panel.tsx` | **Migrate System off `Card` onto `Panel`** — unlocks the state rail, density modes, provenance slot and freshness that System currently cannot use (S-6). Largest structural win, no new component. |
| Layer tiles ×4 | `SystemStatePanel` | Same four layers, same model — recomposed from stacked rows into a 4-column grid |
| Probe rows | `HealthPanel` | Row → recessed instrument slot on `surface-lowest`; grid becomes `led · name · message · latency` |
| Counters | `HealthPanel` right strip | Promoted to its own panel using `Row`/`RowGroup` |
| Process metrics | `SystemMetricsPanel` | Keep the Bloomberg readout order (label · figure · unit). Add `Meter` for RSS only |
| Topology | `RuntimePanel` | Add clustering; `COMPONENT_LABELS` already exists (reference shows raw snake_case — see §8) |
| Endpoint table | `DiagnosticsPanel` | **Replace 1 `RadialGauge` per endpoint with a `DataTable`.** Gauges cost enormous space for one number each and are the main reason Diagnostics is unscannable |
| Config | `ConfigPanel` | Keep the read-only statement; add §5.1 fields |
| Status pills | `ui/StatusChip.tsx` | New `degraded` tone |
| Provenance | `shared/ProvenanceBadge.tsx` | **System keeps the literal endpoint path** — this is the one page where it belongs |

**New components: none.** The `led`, `cluster` and `probe row` treatments are compositions of existing primitives.

---

## 7 · Token implications

The reference validates the approved set and adds no colour beyond it.

**Load-bearing here:**
- `--probex-surface-lowest #060A14` — recessed probe rows, cluster wells, table headers. **System is the strongest argument for this token.**
- `--probex-status-degraded #FB923C` — must be distinguishable from `--probex-status-stale #F59E0B`. On System they can appear together (a degraded engine serving stale data), so this pair needs the most scrutiny in the contrast audit.
- `--probex-status-offline #F43F5E` — failing probes
- `--probex-status-synthetic #818CF8` — `PAPER` chip; **mock/offline data only**, never paper mode (SD-7)

**Confirmed unchanged:** `--probex-bg #03050D`, `--probex-surface #0C1424`.

**Refinement:** the reference uses a soft LED glow (`box-shadow: 0 0 6px`) on probe status dots. It reads as instrumentation rather than decoration, but it is **not** in the token system. If adopted, it needs a token (`--probex-led-glow`) and must be gated by `data-liveness` like every other liveness cue. Otherwise drop it — the dot plus colour plus row tint already carry the state.

---

## 8 · Accessibility

**Verified in the reference:**
- Every state is **colour + word + position**. `2 LAYERS DEGRADED`, `0/1`, `CLOSED`, `Degraded` all read without colour.
- Failing probes carry three redundant cues: red LED, red-tinted background, and border colour.
- No text below 11px.
- The DEGRADED left rail is a shape cue that survives greyscale.

**Open risks:**
- `--probex-text-disabled #334155` on `--probex-surface-lowest #060A14` is used for layer detail text (`development build · dev policy`). **Very low contrast.** Acceptable only because those strings are supplementary; must be contrast-measured, and anything load-bearing moved up to `text-muted`.
- `status-degraded` vs `status-stale` — adjacent oranges. Never let colour alone distinguish them.
- The topology chips are 11px mono at ~18px row height — below any touch target guidance. Fine for a desktop operator surface; needs review if System becomes usable on tablet.
- **The reference shows raw `snake_case` component names.** `COMPONENT_LABELS` already maps these to human labels ("CLOB Client", "Resolution Tracker"). Raw identifiers are correct for an operator and match today's page, but **the choice should be deliberate** — possibly label with the identifier as a tooltip.

---

## 9 · Responsive

The reference is desktop-only, as scoped. Implications:

| Width | Behaviour |
|---|---|
| **1440+** | As shown. Six panels, no scroll. |
| **1024–1439** | Instrument row 3-col → 2-col; topology 6 → 3 clusters per row. Config drops below diagnostics. |
| **768–1023** | Layer tiles 4 → 2×2. Probe rows keep `led · name · message · latency` — the message truncates before the latency is dropped, because the latency is the number an operator scans for. |
| **< 768** | Single column. **Endpoint diagnostics scrolls horizontally inside its container** with the fade rails from the Overview direction. Topology becomes 2 clusters per row. |

**Recommendation: System is a desktop-first operator surface.** It should degrade correctly and remain usable on mobile, but it should not be optimised for it at the cost of desktop density. That is a different posture from Overview, and it is deliberate.

---

## 10 · Verdict

**The cockpit half of the visual language validates.** The same tokens, the same panel construction and the same status grammar that produce Overview's calm intelligence surface produce a genuinely instrument-like System page — with six panels in one screen instead of two, and no invented data anywhere.

The differences that make it feel technical are **compositional, not chromatic**: denser padding, mono-dominant typography, recessed row wells on `surface-lowest`, tabular alignment, and grouping. Not more colour, not neon, not glass.

**One item is blocked on a real constraint:** SD-1, the three-state circuit display, is not representable from the current breaker. It is flagged rather than fabricated, and the reference shows only what exists.
