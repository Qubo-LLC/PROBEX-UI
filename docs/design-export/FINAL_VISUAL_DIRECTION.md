# PROBEX — Final Visual Direction

**Date:** 2026-09-08 · **Status:** canonical reference for implementation, pending approval
**Name:** Obsidian Cockpit Precision
**Validated against:** Stitch Overview (desktop + mobile) · PROBEX System reference (1440×900, live data)

---

## 0 · The one-paragraph statement

PROBEX is an autonomous trading engine that reports on itself. The interface has one job: **make what the engine knows, and how well it knows it, legible at a glance.** The visual language is deep obsidian surfaces, hairline structure, mono numerics and rationed colour — an instrument, not a dashboard. Colour is never decorative: every chromatic decision encodes market side, financial direction, or data provenance. Motion is licensed by live data and by user consent, and withdrawn the moment either is absent.

---

## 1 · Two personalities, one system

The product has two audiences that are often the same person in different modes.

| | **A · Intelligence** | **B · Instrument** |
|---|---|---|
| Routes | Overview, Live Feed, Markets, Market Detail, Positions, Portfolio, Strategy, Analytics | System, Event Log, Endpoint Diagnostics, Execution's operational panels |
| Question | *"What is happening, and should I care?"* | *"What is running, and is it healthy?"* |
| Reader | trader / operator scanning | operator diagnosing |
| Density | `standard` 12/16 · `focal` 20 | `dense` 6/10 |
| Type | Geist-led; mono for figures | mono-led; sans only for prose |
| Hierarchy | one dominant figure per panel | flat, scannable, columnar |
| Vocabulary | plain language — "Market data is stale" | operator vocabulary — `api_access`, RSS/VMS, `stale_market_data` |
| Provenance | **semantic label** — `LIVE`, `DERIVED`, `STALE` | **literal endpoint** — `LIVE · /api/health` |
| Colour | market semantics dominate (YES/NO, ±P&L) | status semantics dominate (live/stale/degraded/offline) |
| Motion | live chart tip and value-change ring | **none** |

### What they share — non-negotiable

The same tokens. The same `Panel` primitive, state rail, elevation ladder, radius scale, focus ring, status grammar, `—`-for-withheld rule, and the same six data states. **A user moving from Overview to System must recognise the same product**, not a settings area bolted onto an app.

### The rule that separates them

> **Intelligence surfaces answer "what is happening". Instrument surfaces answer "which mechanism produced it".**

That single line decides every borderline case. An endpoint path is *how*, not *what* — so it lives in a tooltip on Overview and in plain sight on System. A `snake_case` component name is a mechanism — System only. A stale market warning is *what is happening* — it belongs on both, phrased differently.

---

## 2 · Colour

### 2.1 Surfaces — four tiers plus a trough

| Token | Value | Role |
|---|---|---|
| `--probex-bg` | `#03050D` | App canvas |
| `--probex-surface-lowest` | `#060A14` | **New.** Recessed wells: table headers, probe rows, input troughs, cluster interiors |
| `--probex-surface` | `#0C1424` | Panels — the default raised plane |
| `--probex-surface-raised` (`surface-2`) | `#121D33` | Hover, active rows, secondary buttons |
| `--probex-surface-overlay` | `#182744` | **New.** Modals, command palette, context menus |

The ladder is deliberately uneven — the `bg → surface` step is the largest, because that is the step the eye uses to identify "this is a card". **Do not even it out.** `surface-lowest` is what makes a row read as an inset instrument slot rather than a list item; it is the token that does most of the work on System.

**No `backdrop-filter` blur.** Overlays use `surface-overlay` plus a border.

### 2.2 Disaggregated chromatics — the central discipline

Four independent semantic bands that must never collide:

| Band | Tokens |
|---|---|
| **Brand / interface** | `--probex-primary #38BDF8` (Electric Sky) · `--probex-secondary #6D5EF7` |
| **Market side** | `--probex-yes #00F2FE` (Aqua) · `--probex-no #C084FC` (Orchid) |
| **Financial direction** | `--probex-positive #10B981` · `--probex-negative #F87171` |
| **Data provenance** | `live #10B981` · `stale #F59E0B` · `degraded #FB923C` · `offline #F43F5E` · `synthetic #818CF8` |

> **The collision this fixes:** `--probex-primary` and `--probex-yes` are the *same* cyan today. A focus ring, a brand button and a YES position are chromatically identical. Separating them is the single most valuable colour change in this direction.

**Two overlaps are intentional and must be understood, not "fixed":** `positive` and `status-live` are both `#10B981`; `negative` and `status-offline` are adjacent reds. A gain and a healthy feed are both "good"; the *context* disambiguates, and both always carry a word.

**The pair needing the most care:** `stale #F59E0B` vs `degraded #FB923C`. They can appear together on System (a degraded engine serving stale data). **Colour must never be the only thing separating them** — the word is mandatory.

### 2.3 Text

| Token | Value | Role |
|---|---|---|
| `--probex-text-primary` | `#F1F5F9` | Figures, titles |
| `--probex-text-secondary` | `#94A3B8` | Supporting copy, probe messages |
| `--probex-text-muted` | `#64748B` | Labels — **real reading text, not decoration** |
| `--probex-text-disabled` | `#334155` | Unavailable, inactive |

Widening `muted`/`disabled` from 0.62/0.50α to roughly 0.70/0.35α is what stops "de-emphasised" and "unavailable" reading alike. **`text-disabled` is deliberately near-invisible — nothing load-bearing may be set in it.**

### 2.4 Ink on accent

`--probex-on-accent #03050D` — text on any filled YES/NO/primary surface. Currently hardcoded as `#050816` at three sites, which is a *stale* background value. See the debt register.

---

## 3 · Typography

**Geist** (interface) + **JetBrains Mono** (all numerics), **self-hosted** via `next/font/local` with vendored `.woff2`.

> **Never `fonts.googleapis.com`.** That mechanism was removed deliberately: it made typography a network-dependent build input that degraded *silently* — `document.fonts` listed only `"Inter Fallback"` while the product appeared fine. Two builds of one commit could ship different type. Q-1 is approved on the explicit condition that the fonts are vendored.

| Role | Family | Size / LH | Notes |
|---|---|---|---|
| `display-hero` | Geist 600 | 32/38, −0.03em | Overview hero only |
| `headline-panel` | Geist 600 | 16/22 | Panel titles (Intelligence) |
| `body-default` | Geist 400 | 13/18 | Prose |
| `body-compact` | Geist 400 | 12/16 | Dense rows |
| `metric-xl` | JetBrains Mono 600 | 28/32 | Focal figure |
| `metric-md` | JetBrains Mono 600 | 18/24 | Panel figures |
| `metric-sm` | JetBrains Mono 500 | 14/18 | Table numerics |
| `label-caps` | JetBrains Mono 600 | 11/14, 0.06em | **Panel titles on Instrument surfaces**, all metric labels |
| `metadata-code` | JetBrains Mono 400 | 11/14 | Endpoint paths, identifiers, timestamps |

**11px floor. Nothing smaller, anywhere.** Our current 10px `2xs` carries provenance, freshness, endpoint paths and circuit state — meaning at a size below readability guidance.

**Base stays 13–14px, not 16px.** This is a density decision for a trading interface and it is not up for revision.

`tabular-nums` on every figure. Right-align numerics in tables; left-align labels.

**`label-caps` in mono is what carries the technical register** — more than any colour choice. It is why the System reference reads as instrumentation without a single neon accent.

---

## 4 · Structure

### 4.1 Elevation — milled panels, not floating cards

Every surface pairs a drop shadow with an **inset top specular highlight**, so panels read as chamfered hardware.

```
Level 1 (well)     inset 0 1px 2px rgba(0,0,0,.6)                       surface-lowest
Level 2 (panel)    inset 0 1px 0 rgba(255,255,255,.08), 0 2px 8px …4    surface
Level 3 (focal)    inset 0 1px 0 rgba(255,255,255,.16), 0 8px 24px …6   surface-raised
Level 4 (overlay)  1px solid rgba(255,255,255,.18)                      surface-overlay
```

**One vocabulary.** `elev-1…4` survives; `shadow-surface` / `shadow-surface-lg` is retired.

### 4.2 The left status rail

2px, on the panel's left edge: nominal (none) · attention `degraded` · fault `offline`.

**Already implemented**, and documented in `Panel.tsx` as "a shape cue that survives greyscale, colour-blindness". Stitch converged on it independently. Keep it exactly as it is.

### 4.3 Density

| Mode | Padding | Used by |
|---|---|---|
| `dense` | 6px / 10px | System, tables, logs, orderbook |
| `standard` | 12px / 16px | Market rows, position grids |
| `focal` | 20px | Overview cards, primary gauges |

Horizontal padding exceeds vertical. This is correct for label→value rows and is a change from today's symmetric `p-3/p-4/p-5`.

### 4.4 Radius

`4px` badges, chips, buttons, inputs · `6px` panels, chart frames, tables · `8px` modals · `9999px` **only** for live binary telemetry dots.

Three values in use. The current seven-step scale collapses.

### 4.5 Grid

- Header **52px** · sidebar **216px** expanded / **56px** collapsed
- Panel gutters 12px; canvas padding 16px
- **Intelligence:** two-thirds focal chart + one-third telemetry, above a 4-up instrument rail at `minmax(240px, 1fr)`
- **Instrument:** columnar. Full-width rows spanning 1600px are the current System's core failure — an operator should never traverse the screen to pair a label with a value.

---

## 5 · Components

**Panel** — the universal container. 30–36px header: title (`label-caps` on Instrument, `headline-panel` on Intelligence) · provenance right-aligned · optional freshness · optional action. Four states drive the rail. Three densities.

**Provenance badge** — 11px mono caps + dot.
- *Intelligence:* semantic label (`LIVE`, `DERIVED`, `STALE`, `SYNTHETIC`, `NO FEED`), endpoint in the tooltip
- *Instrument:* `LIVE · /api/health` in full

**Status chip** — 4px radius pill, 11px mono caps, always **colour + word**.

**Outcome chips** — YES `rgba(0,242,254,.12)` bg / `#00F2FE` text / `.28` border; NO the same with `#C084FC`.

**Tables** — header on `surface-lowest` in `label-caps`; rows transparent at rest; hover `surface-raised` at 0ms; **no striping**; numerics mono, right-aligned; horizontal scroll inside the container with fade rails.

**Buttons** — primary: `#38BDF8` fill, `on-accent` text, 12px 600, brightness on hover, no scale bounce. Secondary: `surface-raised`, hairline border, inset top highlight. Destructive: muted `offline`.

**Withheld values** — `—`, never `0`. `unavailable` (source failed), `empty` (source returned nothing) and `idle` (not yet computed) stay three distinct treatments.

---

## 6 · Motion

| Token | Value | Use |
|---|---|---|
| `--motion-ease` | `cubic-bezier(.22,1,.36,1)` | The house settle curve |
| `--motion-fast` | 150ms | Hover, colour |
| `--motion-med` | 240ms | Component transitions, chart window pan |
| `--motion-shell` | 220ms | Sidebar |
| `--motion-ring` | 620ms | Value-change pulse |
| `--motion-pulse` | 2s | Live dot breath (symmetric easing) |

**Motion is rationed and licensed.** It requires a live feed (`[data-liveness]`) *and* user consent (`data-reduce-motion` + OS preference). Under mock, offline or stale data, nothing moves. The `ProvenanceBadge` LIVE dot deliberately does **not** pulse — a single top-bar indicator carries system liveness so six panels don't breathe at once.

**Instrument surfaces have no motion at all.**

**Withholding motion never withholds information.**

---

## 7 · Charts (Q-5 approved)

**`MarketChart` / lightweight-charts remains the primary live-chart implementation.** Its truth constraints are preserved verbatim:

- Only the single leading point animates
- The tip is written back to its **exact confirmed value** before new points append — no projected value ever remains in history
- Viewport scroll caps when the feed goes stale
- Two-party motion gate
- `setData()` once, then `series.update()`

**Q-5 applied:** the curve keeps its fluid motion; **the displayed numeric read-out is pinned to the last confirmed observation.** The line may move continuously; the number changes only when the engine says so. This resolves the one ambiguity in the existing engine — a drifting tip *value* could read as an observation.

**Recharts surfaces:** `isAnimationActive` stays **false**, permanently. Where a smooth window is wanted, animate the **viewport translation** — a horizontal transform of an unchanged curve — never the values. Only for live tapes on a regular cadence; never for historical or derived series.

**Never fabricate a market observation.** Interpolation is a camera operation, not a measurement, and it is not a labellable data state.

---

## 8 · Six states that must never collapse

| State | Colour | Word | Meaning |
|---|---|---|---|
| **LIVE** | `#10B981` | LIVE | Current reading from the engine |
| **STALE** | `#F59E0B` | STALE | A refresh failed; last good value shown |
| **DEGRADED** | `#FB923C` | DEGRADED | Engine running with failing probes |
| **OFFLINE** | `#F43F5E` | NO FEED | Backend unreachable; **nothing substituted** |
| **SYNTHETIC** | `#818CF8` | SYNTHETIC | Mock data. **Never paper mode.** |
| **HEALTHY** | `#10B981` | HEALTHY | All probes passing |

Every one carries a word. None is ever distinguished by colour alone.

**PAPER is not one of these.** Paper mode = the real engine trading simulated money against real market data. It is a separate `PAPER` chip and must render independently of any provenance state.

---

## 9 · What this direction refuses

Glassmorphism and backdrop blur · gradient washes (the brand gradient is logo and primary CTA only) · neon accents · decorative elements competing with data · oversized generic cards · alternating table stripes · animation on historical series · colour without a word · sub-11px type · a 1px focus ring (2px with 2px offset stays) · pulsing every live surface · invented metrics · any value the engine did not report.

---

## 10 · The test

A screen is right when:

1. Every number is traceable to a real field
2. Every state reads correctly **in greyscale**
3. The most important figure is unambiguous within one second
4. Nothing moves that isn't licensed by live data and user consent
5. An Intelligence screen and an Instrument screen are recognisably the same product with different jobs
6. Removing all colour loses aesthetics but **no information**
