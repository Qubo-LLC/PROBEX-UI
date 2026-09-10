# PROBEX — Implementation Report · Stage 4 (Live Feed)

**Date:** 2026-09-09 · **Route:** `/live` only
**Nothing committed. Nothing pushed. No packages installed. `package.json` untouched. No backend or contract changes.**
Evidence: `docs/design-export/evidence/stage-4/`

---

## 1 · LIVE FEED AUDIT

### Current strengths

- **`EventStream` is already the best component on the route.** Severity accent rail + category badge (colour **and** glyph **and** label) + headline + description + metadata chips + timestamp is a real hierarchy, not a log line.
- **`metaChips` never fabricates.** Every metadata field is optional and skipped when absent.
- **Repeat collapsing** (`×200`) with a tooltip explaining it, so a noisy engine does not flood the view.
- **Unknown event types still render**, falling back to neutral rather than being hidden or recoloured as something they are not.
- **Pause is an honest display-freeze** — it stops this view adopting new snapshots; `ApplicationStateLoader` keeps polling, and the code says so.
- **The vitals strip already refuses to lie**: `Feed live · 366ms` becomes `Feed simulated · …` under synthetic data.
- Every section declares provenance; empty / error / unrecognised-schema are three distinct treatments.

### Visual debt

- **Endpoint paths printed throughout** — `/api/stats`, `/api/events`, `/api/price-history`, `/api/edges`. On mobile they consume a significant share of a 375px line.
- **Stream state split across two places** — a Pause button in the page header and an unrelated `View frozen` string in the vitals strip, several hundred pixels apart. What pausing *does* was only in a `title`.
- **Category colours borrowed from three other semantic bands** (see §5 below).
- Page reads as four stacked sections; the stream is first, which is right, but nothing marks it as the spine.

### Functional risks

- **`--probex-warning-border` is declared in no theme.** `LivePauseControl` used it for the paused-state border, so an unresolvable `var()` invalidated the whole border declaration. A real defect, live for as long as the component has existed.
- **`parseEdgeRows` ran twice per poll** — once for the table, once for the map — on a route polling every 8s.
- **`src/lib/mappers/events.ts` was classified as a *binary* file.** Two literal NUL bytes are used as delimiters in the dedupe key. The choice is sound; writing them as raw bytes meant git and grep treated the file as binary and **silently skipped it in every repo-wide text search**.

### Data / provenance risks

- **The footnote counted rows and called them events.** With repeats collapsed, one row can represent 200 occurrences — "Showing the 1 most recent" described a 200-event stream as a single event.
- No route-level provenance register, so paths were printed rather than demoted.

### Responsive problems

- Measured: **0px horizontal overflow at every width**, before and after. The wide `MarketTable` scrolls inside its own container correctly.
- The four sort controls were **20px tall — under the WCAG 2.5.8 AA 24px minimum**.

### Accessibility problems

- The stream was a `div` of `div`s: a screen reader announced a run-on block with no count and no way to step through entries.
- Sort controls under the AA target size.
- No live region — **correct**, and left alone: a feed that re-announces on every poll is unusable, and the brief warns against exactly that.

### Components worth reusing

`EventStream` / `EventRowItem` (shared with System › Event Log), `ProvenanceBadge`, `ProvenanceScope`, `PriceCard`, `MarketTable`, `EdgeTable`, `SectionHeading`, `EmptyState`, `ErrorState`, `Card`, the `live-dot` / liveness-gate mechanism.

### Components that should NOT be duplicated

`EventRowItem` — System and Live Feed must keep rendering activity identically; any divergence here re-creates the pre-V3 split. `PriceCard` — already shared with Overview's hero. `MarketTable` — shared with Markets. No new stream, row, or chart component was created.

---

## 2 · DESIGN CHANGES

Six files. Every change is either a defect fix or an application of an already-established Stage 0–3 decision.

| Change | Rationale |
|---|---|
| **`ProvenanceScope detail="tooltip"`** on the route | Same register as Overview. Endpoint paths: **4 → 0**; each badge keeps its word, the path moves to `title` + accessible name |
| **Stream state unified into `LivePauseControl`** | `LIVE` / `VIEW FROZEN` + a plain-language explanation now sit beside the button; the duplicate chip in the vitals strip is gone |
| **Category colours off other bands** | `trade` `positive` → `secondary`; `resolution` **`yes`** → `text-secondary`; `health` `positive` → `text-secondary` |
| **`.event-arrive`** | One-shot 240ms entrance for genuinely new rows, added to the liveness allowlist |
| **`<ul>` / `<li>` stream semantics** | Screen readers get a count and can step through entries |
| **Honest footnote** | "N activity groups · repeats collapsed" instead of counting rows as events |
| **`--probex-warning-border`** added to all 6 themes | Fixes the invalid border declaration |
| **Sort controls 20px → 28px** | WCAG 2.5.8 AA |
| **`edgeMap` derived from `edgeRows`** | One parse per poll instead of two |
| **`events.ts` NUL bytes escaped** | File is text again and greppable; runtime key byte-identical |

### On category colour (§5)

The category badge was borrowing from three bands the token architecture keeps separate:

- `resolution` used **`--probex-yes`** — the *market-side* colour, on a category with nothing to do with which side of a market was taken. A resolution row and a YES position were the same cyan. **This is the case the brief names explicitly.**
- `trade` and `health` both used **`--probex-positive`** — the *financial-direction* green. A trade is not a gain, and a health event is as often a probe failing as recovering, so a permanently green badge told the operator the opposite half the time.

All three moved to identity-only colours. **Valence is carried by the severity rail**, which reads the engine's own `severity` field. `edge` keeps `--probex-primary` (interface accent for the engine's own signal), `survival` keeps `--probex-warning` (attention band, correct), `error` keeps `--probex-negative` (a fault genuinely is negative, and severity agrees).

No category was added, removed, renamed or recoloured beyond these three. The eight types are the ones `/api/events` documents.

---

## 3 · FUNCTIONAL PRESERVATION

- **No endpoint, hook, mapper contract, or polling behaviour changed.**
- Every control that existed still exists: pause/resume, the four sort controls, market row selection, watchlist stars, the Event Log link.
- No filter, control, category, event type or metric was added or removed.
- `STREAM_ROWS = 14`, dedupe, sort order and the empty/error/unrecognised branches are untouched.
- `parseEventRows`, `dedupeEventRows`, `parseEdgeRows`, `toEdgeRowMap` unchanged — `events.ts`'s only edit was escaping two delimiter bytes, producing an identical runtime key.

---

## 4 · LIVE / PAUSE BEHAVIOUR

**Behaviour unchanged. Presentation unified.** Verified by driving the real control:

```
live   : aria-label "Pause live view"   aria-pressed=false
         "LIVE  Updating as the engine reports  Pause"
paused : aria-label "Resume live view"  aria-pressed=true
         "VIEW FROZEN  Engine still polling — new activity is arriving  Resume"
```

All three things the brief asks for are now on screen rather than in a tooltip: **current state** (LIVE / VIEW FROZEN, word + dot), **what clicking does** (Pause / Resume), and **whether events are accumulating while paused** ("Engine still polling — new activity is arriving").

**No unread counter was invented.** The events endpoint is a rolling log that saturates at its `limit`, so a count-delta would silently undercount once saturated; and with repeats collapsed the visible effect is a growing `×N` rather than new rows. Stating that activity is still arriving is true without implying a number the data cannot support.

**Arrival motion** is one-shot, 240ms, on genuinely new rows only — seeded on first render so a page load does not animate the whole stream. Verified under the liveness gate:

```
data-liveness="live"  -> animation: fade-in-up 0.24s
data-liveness="inert" -> animation: none
```

---

## 5 · PROVENANCE

- **0 endpoint paths** rendered as text at all six viewports (was 4).
- 4 badges, **0 without a word**.
- Offline: all read `No feed`, accessible name `Data source: No feed`.
- **Synthetic verified explicitly** — under mock mode all four badges read `Synthetic`, accessible name `Data source: Synthetic`. §8's requirement that mock data stay labelled holds.
- No skeleton hides a backend failure: `error`, `empty`, `unrecognised-schema` and `loading` remain four distinct treatments.

---

## 6 · RESPONSIVE VALIDATION

| Width | Overflow doc | Overflow main | Min font | Endpoint paths | Controls <24px | Pause control |
|---|---|---|---|---|---|---|
| 1440 | **0** | **0** | 11px | 0 | **0** | 71×26 |
| 1024 | **0** | **0** | 11px | 0 | **0** | 71×26 |
| 768 | **0** | **0** | 11px | 0 | **0** | 71×26 |
| 430 | **0** | **0** | 11px | 0 | **0** | 71×26 |
| 390 | **0** | **0** | 11px | 0 | **0** | 71×26 |
| 375 | **0** | **0** | 11px | 0 | **0** | 71×26 |

Sort controls after the fix: **63×28, 70×28, 59×28, 53×28** — all past AA.

> **Two probe artifacts I caught and did not report as defects.** My first pass flagged "10 clipped controls" below 768px and "4 overlapping rows" on mobile. The first is the **off-canvas navigation drawer** (right edge at −9px — deliberately parked, `inert` and `aria-hidden`). The second is the **BottomNav**, a horizontal `ul > li` that my vertical-overlap test mis-scored. Both were confirmed false positives before writing anything down.

---

## 7 · ACCESSIBILITY VALIDATION

Real `Input.dispatchKeyEvent` Tab traversal, never `.focus()`:

```
product controls: 23/23 show a focus indicator
dev-overlay stops (nextjs-portal): 6 — excluded, not product UI
```

| Check | Result |
|---|---|
| Touch targets | All ≥24px AA; sort controls 28px, pause 26px |
| Colour-independent meaning | 4 provenance badges, 0 without a word; LIVE/VIEW FROZEN both worded; category = colour **+ glyph + label** |
| Pause announcement | `aria-pressed` toggles; `aria-label` changes Pause ⇄ Resume |
| Feed semantics | `div` → `<ul>`/`<li>` |
| Live region | **None added, deliberately.** A feed polling every 5s with a live region would announce continuously. The brief warns against exactly this |
| Reduced motion | 1 animation / 32 transitions → **0 / 0** |

---

## 8 · PERFORMANCE CHECK

| Looked for | Found | Action |
|---|---|---|
| Duplicate parse per poll | `parseEdgeRows` ran twice on every edges change | **Fixed** — `edgeMap` derives from `edgeRows` |
| Unstable keys | `key={row.id}` — stable | None |
| Whole-feed re-render on arrival | Rows are pure; the new `arriving` set only marks fresh ids | None |
| Animation restarts | Seeded on first render, so history never re-animates; ids only enter the seen-set once | By design |
| Uncontrolled DOM growth | Capped at `STREAM_ROWS = 14` | None |
| Duplicate polling / subscriptions | Route owns none — `ApplicationStateLoader` is global | None |
| Timers running while paused | Pause is a render freeze; no timer is owned here | None |
| Stale subscriptions after unmount | No subscriptions in the route | None |

No broad refactor was performed.

---

## 9 · BEFORE / AFTER REVIEW

| | Before | After |
|---|---|---|
| Endpoint paths | 4 printed, prominent on mobile | **0** |
| Stream state | Split: header button + distant "View frozen" chip | One control: dot + word + explanation + action |
| What pause does | `title` only | On screen |
| `resolution` badge | `--probex-yes` (market-side colour) | Identity-only |
| `trade` / `health` badges | `--probex-positive` (financial green) | Identity-only; severity carries valence |
| Arrival cue | None | One-shot 240ms, liveness-gated |
| Stream semantics | `div` of `div`s | `<ul>` / `<li>` |
| Footnote | "Showing the 1 most recent" for 200 events | "1 activity group · repeats collapsed" |
| Sort controls | 20px (AA fail) | 28px |
| Paused border | Invalid `var()` | Real token, 6 themes |

Captures: `after-live-{1440,1024,768,430,390,375}.png` (+ `-scroll1`), `after-live-1440-LIVE-state.png`, `after-live-1440-PAUSED-state.png`, `SYNTHETIC-live-{1440,375}.png`.

**Limitation, recorded rather than worked around:** all captures are **OFFLINE** or **SYNTHETIC**. The engine returned 502s and then timed out entirely for the whole of this stage, so a healthy LIVE capture was not possible. The `before` set is the frozen export (`current/screens/*/live-*`), which was taken while the engine was healthy.

---

## 10 · FILES CHANGED

Six files. No new components.

| File | Why |
|---|---|
| `live-feed/LiveFeedConsole.tsx` | ProvenanceScope; removed the duplicate frozen chip; `edgeMap` derived; honest footnote; sort-control target size |
| `live-feed/LivePauseControl.tsx` | Owns the stream's state — dot, word, explanation, action |
| `shared/EventStream.tsx` | `<ul>`/`<li>`; `arriving` flag; three category colours off other bands |
| `app/globals.css` | `.event-arrive` keyframe + its place in the liveness allowlist |
| `styles/probex-tokens.css` | `--probex-warning-border` × 6 themes |
| `lib/mappers/events.ts` | Two literal NUL delimiter bytes escaped — file is text and greppable again |

---

## 11 · TYPECHECK / TEST / BUILD RESULTS

| | Expected | Actual |
|---|---|---|
| Typecheck | PASS | **PASS** (`tsc --noEmit`, exit 0) |
| Tests | 162/162 | **162 passed / 13 files** |
| Build | 22 routes | **PASS** — compiled 23.8s, `✓ Generating static pages (22/22)`, shared JS **102 kB** unchanged |

### Regression check

| | |
|---|---|
| Overview frozen | `OverviewPage`, `EngineFocusHero`, `EngineStateBand`, `EngineAttention` — **all unchanged** since the Stage 3 freeze |
| `MarketChart.tsx` | **unchanged** — Q-5 intact |
| New endpoints/contracts | none |
| Dependencies installed | none; `package.json` / `package-lock.json` unchanged |
| Backend changes | none |
| Unrelated files | none — six files, all Live Feed or its shared dependencies |

`EventStream.tsx` is shared with System › Event Log. The change is additive (`arriving` defaults to `false`) and both surfaces continue to render activity identically, which is the property that component exists to guarantee.

---

## 12 · REMAINING DEBT

| # | Item | Status |
|---|---|---|
| **S4-1** | **The `<ul>` stream could not be exercised with rows.** The engine is down, and the mock fixture declares `events: []` by design. Markup verified in source; runtime verification of a populated stream is **owed**. | **Honest gap** |
| **S4-2** | Q-5 runtime re-confirmation still owed (carried from Stage 3) — same backend cause. | Carried |
| **S4-3** | **Backend down for the whole stage**: `/api/*` 502, then host timeout. Items **B-7** (cold-connection latency >5s) and **B-8** (availability) stand for Jake. | Backend |
| **S4-4** | With the engine emitting one repeated event type, dedupe collapses the stream to a single `×N` row. Correct behaviour, but the page's spine renders as one line. Worth raising as a **backend event-vocabulary** question rather than a frontend fix. | Product/backend |
| **S4-5** | `Price Stream` on Live Feed duplicates Overview's hero `PriceCard`. Defensible (different question), but worth a composition decision later. | Deferred |
| **S4-6** | Timestamps are absolute `toLocaleTimeString()` with no date, so an event from a previous day looks like today. Not changed — inventing relative time would imply precision the payload does not guarantee. | Deferred |
| **S4-7** | Five other routes still print endpoint paths (Markets, Positions, Portfolio, Execution, Strategy, Analytics). By design; they flip in their stages. | By design |

---

## 13 · NEXT-STAGE RECOMMENDATION

**Do not start the next route until the backend is back.** Two verifications are now owed (S4-1, S4-2) and both need a healthy engine; adding a third stage's worth of unverified work compounds the debt rather than reducing it.

When it is healthy, the first actions should be:

1. Re-run the Q-5 pixel-diff probe (~90 seconds, no code change).
2. Capture a populated Live Feed stream to close S4-1.

**Then Stage 5: Markets.** It shares Live Feed's `MarketTable` and the market-card work already promoted in Stage 3, has a well-understood data contract, and its three tabs (Live / Watchlist / Archive) exercise the tab language before the denser Strategy and Analytics surfaces. Positions is the natural follow-on, since it shares the same table system.
