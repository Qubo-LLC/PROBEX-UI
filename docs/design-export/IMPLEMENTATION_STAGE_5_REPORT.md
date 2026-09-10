# PROBEX — Stage 5 Implementation Report: Markets Refinement

**Date:** 2026-09-09
**Scope:** `/markets`, `/markets?view=watchlist`, `/markets?view=archive`, `/markets/{marketId}`
**Status:** Implemented and validated. Typecheck, tests and build clean. Awaiting review.

**Constraints observed:** no commit, no push, no branch; no dependency installed; no backend code or
contract touched; paper/simulation mode unchanged — no order placed, no live mode, no execution-mode
change, no simulation reset. Overview, Live Feed, `MarketChart.tsx` and the Stage 2 Q-5 implementation
were treated as frozen and are unmodified by this stage.

---

# 1. MARKETS AUDIT

The audit ran before any code changed. Nine findings, ordered by how wrong the screen was rather than
by how hard each was to fix.

### M-1 — Market side was rendered on the financial-direction band (the stage's central defect)

`MarketCard`'s `ProbBars` coloured both the YES and NO bar by calling `probabilityColorVar()`. That
helper maps a probability onto `--probex-positive` / `--probex-warning` / `--probex-negative` — the
**financial-direction** band. The consequence is a category error, not a palette preference: a YES
priced at 18¢ was painted in the loss colour, and a YES priced at 82¢ in the profit colour. A cheap
YES is not a loss. It is a cheap YES, and it may be the best buy on the screen.

The same substitution appeared in the list variant's YES price and in `EngineThesisPanel`'s
"YES Price" metric on Market Detail. Three callers, one wrong band.

This is the fourth instance of the band-collision class the programme has been tracking since Stage 2,
and the first where the collision was not between two token *values* but between two *meanings* sharing
one helper.

### M-2 — The catalogue had no lifecycle state at all

`/api/markets` carries no `status` field. It carries `closes_at`, and the markets mapper already says
so in a comment: *"the wire has no `status` field, but `closes_at` makes expiry a fact"*.
`marketDetailToRow` acts on that and derives status from `hasClosed`. **The list path never did.**

So a market that closed thirty minutes ago rendered in the catalogue as an ordinary row — same weight,
same hover, same cursor, same click target — as one still open. The forensic audit of the same date
found the engine serving exactly that: an expired market presented as actionable. A closed market must
not look clickable.

### M-3 — Close time printed as a calendar date on minute-scale markets

`MarketCard` printed `closesAt` via `toLocaleDateString()`. These are 5- and 15-minute Bitcoin markets.
Every single one closes today, so every card printed the same string, and the field answered nothing.
`MarketHeader` on the detail page had the same problem with a long-form date.

### M-4 — "Resolves In 0d"

`EngineThesisPanel` computed `Math.ceil((closesAt - Date.now()) / 86_400_000)` — day granularity. On a
15-minute market that reads `0d` from the moment it opens until long after it closes. It was not a
rounding artifact; it was a countdown in the wrong unit that also had no terminal state.

### M-5 — Markets rendered zero provenance badges

`MarketsPage` constructs two `ProvenanceBadge`s — but inside its `{!embedded && …}` `PageHeader`
branch. `MarketsDomain` always renders the page **embedded**. The badges therefore never appeared on
the `/markets` route in any of its three views: a live-data surface with no lineage marker, while every
other route in the product carries one. This had presumably been true since the domain wrapper was
introduced, and no visual review had caught it because the code that builds the badges is present and
correct — it is simply unreachable.

### M-6 — A dead table column

`MarketTable`'s header row declared `Market | Edge | Signal | Probability | Volume | Watch`. The
`Signal` column had no corresponding cell content worth the width it occupied.

### M-7 — `:focus { outline: none }` removed the focus ring from every text input in the product

Found via the Markets search field, but the rule is global:

```css
.input-base:focus { outline: none; border-color: var(--probex-border-active); }
```

A border-colour change is not a focus indicator — it is a 1px shift in a low-contrast chrome colour,
and it is the *only* thing a keyboard user got. Scope is product-wide, not Markets-only.

### M-8 — A market-side token doing interface duty

The category tag on `MarketCard` used `--probex-yes-border` as its border. The tag describes a segment
("event", "crypto"), which has nothing to do with the YES side. A reader who has learned that green
edging means YES was being taught the opposite.

### M-9 — A raw endpoint path printed as visible caption on Market Detail

`MarketCharts` printed `{n} snapshots · /api/markets/:id/history` as body text. Market Detail is an
intelligence surface; under the Stage 3 provenance policy its endpoint paths belong in tooltips. Every
`ProvenanceBadge` on the page honours that. This hand-written caption did not, so the one raw path
left on the route was the one the scope could not reach.

---

# 2. DESIGN CHANGES

### New: `src/lib/display/marketLifecycle.ts`

One module, no component logic, nothing invented. Every state is a comparison between `closesAt` and
the current time; when `closesAt` is `null` the answer is `unknown` rather than a guess.

```ts
export type MarketLifecycle = 'open' | 'closing' | 'closed' | 'unknown'
export const CLOSING_SOON_MS = 2 * 60 * 1000

marketLifecycle(closesAt, now?)  // 'closed' when closesAt <= now; 'closing' inside the window
formatCloseTime(closesAt, now?)  // "closes 4m" | "closes 2h 10m" | "closed 31m ago" | "—"
closeTimestamp(closesAt)         // wall-clock string for a tooltip
lifecycleTone(l)                 // 'positive' | 'warning' | 'neutral'
lifecycleLabel(l)                // 'Open' | 'Closing' | 'Closed' | 'Unknown'
```

`closed` is **neutral**, not negative. An expired market is a fact about the clock, not a fault and not
a loss — giving it the negative colour would put it on the financial-direction band, which is the exact
error this stage set out to remove.

### Market side restored to its own band

`ProbBars` was rewritten as `SideBar`, with YES drawn in `--probex-yes` and NO in `--probex-no` — the
market-side band, for both sides, at all prices. The list variant's YES price and `EngineThesisPanel`'s
YES Price metric follow the same rule.

`probabilityColorVar()` is **kept, not deleted**, and annotated `@deprecated for MARKET-SIDE values`
with the reason and the names of its three former callers. Mapping a probability to a confidence tone
is still a legitimate operation for a surface genuinely about likelihood; it simply has no callers
today. Deleting it would lose the explanation of why it must not come back for a side.

### Lifecycle made visible

- **Card:** a `CLOSED` marker; closed cards lose `card-interactive` (no hover lift, no pointer
  affordance); close time shows time remaining or time elapsed instead of a date.
- **Table:** a `Status` column carrying a dot **and the word** — `Open` / `Closing` / `Closed` — plus
  the relative time. Closed rows drop to secondary text weight.
- **Detail:** the `Resolves In {d}d` metric became a real time-to-close, and its **label flips to
  `Closed`** once the market is over, with the value dimmed to `--probex-text-muted`.

The word is always present alongside the colour, so the state survives a greyscale print or a
red-green colour deficiency.

### Chrome tokens for chrome

Category tag border `--probex-yes-border` → `--probex-border-active`.

### Provenance reached the page

The two `ProvenanceBadge`s moved from `MarketsPage`'s unreachable branch into `MarketsDomain`'s
`actions` slot, which `DomainPage` forwards to `PageHeader`. One declaration now covers all three
views. Lineage is tracked **per endpoint**, not per app: `/api/markets` reports `unreachable` when its
own slice errors, so a markets-only outage cannot sit under a green LIVE badge fed by a different
request.

### Focus restored

```css
.input-base:focus        { border-color: var(--probex-border-active); }   /* kept */
.input-base:focus-visible { outline: 2px solid var(--probex-primary); outline-offset: 2px; }
```

`:focus-visible` rather than `:focus`, so a mouse click on an input does not draw a keyboard ring.
`outline-offset` keeps the ring clear of the field's own border.

### Endpoint path moved to lineage position

`MarketCharts`' caption keeps the snapshot **count** visible — that is the fact a reader needs — and
moves the path to `title` plus an `aria-label` that carries both, exactly where the badges put theirs.

---

# 3. MARKET TABLE

| | Before | After |
|---|---|---|
| Columns | `Market · Edge · Signal · Probability · Volume · Watch` | `Market · Edge · YES · Volume · Status · Watch` |
| Dead width | `Signal` | removed |
| Side colour | probability → positive/warning/negative | `--probex-yes` |
| Lifecycle | absent | `Status`: dot + word + relative time |
| Closed rows | identical to open | secondary text weight |

`Probability` was renamed `YES` because that is what the number is. "Probability" invites the reader to
treat it as the engine's belief; it is the market's YES price.

The table keeps its `TableShell` / `Thead` / `Th` / `Tr` / `Td` primitives and its `dense` prop
untouched — no bespoke table markup was introduced.

---

# 4. MARKET DETAIL

- `ProvenanceScope detail="tooltip"` wraps the page (`MarketDetailPage.tsx:151–195`).
- `EngineThesisPanel`: YES Price → `--probex-yes`; `Resolves In {d}d` → real time-to-close with a
  `Closed` terminal state.
- `MarketHeader`: close time gained a time of day (`Sep 9, 10:15 AM`), same slot, same weight.
- `MarketCharts`: endpoint path moved from visible caption to tooltip + accessible name.

Runtime read-back on a live market confirms the intended strings render together:
`"Resolves Sep 9, 10:15 AM"`, `"CLOSED"`, and the prose `"closed. Its scheduled close time has…"`.

`MarketChart.tsx` — frozen since Stage 2 — was not touched. Its Q-5 behaviour was re-confirmed at
runtime this stage (§10).

---

# 5. WATCHLIST / ARCHIVE

Both are views of the same `MarketsDomain`, so every change above applies to them without duplication,
including the provenance badges. Measured at 1440 and 375:

| View | Badges | `ovfDoc` | `ovfMain` | Min font |
|---|---|---|---|---|
| `?view=watchlist` @1440 | 2 | 0 | 0 | 11px |
| `?view=watchlist` @375 | 2 | 0 | 0 | 11px |
| `?view=archive` @1440 | 3 | 0 | 0 | 11px |
| `?view=archive` @375 | 3 | 0 | 0 | 11px |

Archive carries a third badge because it reads a third endpoint. That is correct per-endpoint lineage,
not a duplicate.

The archive is the one view where closed markets are the *expected* content rather than a hazard. The
lifecycle treatment still applies — the rows are legitimately non-interactive there, and now look it.

---

# 6. FUNCTIONAL PRESERVATION

Nothing was removed. Verified present and working after the changes:

- Grid ↔ table view toggle (`aria-label="table view"` driven in the probe; columns read back as
  `["Market","Edge","YES","Volume","Status","Watch"]`).
- Watchlist star toggle, in both card and table.
- Market search field (and it now has a focus ring it did not have before).
- Three-view tab navigation via `?view=`.
- Navigation into `/markets/{marketId}`, and the detail page's full panel set.
- `dense` prop on the table; `variant` prop on the card.

No route, prop, store selector or endpoint was added, renamed or removed. `probabilityColorVar` is
retained (deprecated for side values only).

---

# 7. PROVENANCE

| Surface | Badges | Scope | Visible raw paths |
|---|---|---|---|
| `/markets` (all 3 views) | 2–3, **new this stage** | `tooltip` | 0 |
| `/markets/{marketId}` | 0 — see debt D-3 | `tooltip` | 0 (was 1) |

Accessible names read back from the live page:

```
Data source: Live (/api/markets)
Data source: Live (/api/edges)
```

The word ("Live") is the visible content; the path lives in the accessible name and the tooltip. A
screen-reader user gets *more* lineage detail than a sighted one, not less — which is the right way
round, because the path is exactly the kind of detail that is hard to discover without one.

Measured visible endpoint paths: **0** across all three Markets views at all six viewports, and 0 on
Market Detail after the `MarketCharts` fix (confirmed: `tooltipPaths: 1`, `visible paths: 0`).

---

# 8. RESPONSIVE VALIDATION

`/markets`, aurora, dev server, real device-metrics emulation:

| Viewport | `ovfDoc` | `ovfMain` | Min font | Visible paths | Clipped | Controls <24px | Badges |
|---|---|---|---|---|---|---|---|
| 1440 | 0 | 0 | 11px | 0 | 0 | 0 | 2 |
| 1024 | 0 | 0 | 11px | 0 | 0 | 0 | 2 |
| 768 | 0 | 0 | 11px | 0 | 0\* | 0 | 2 |
| 430 | 0 | 0 | 11px | 0 | 0\* | 0 | 2 |
| 390 | 0 | 0 | 11px | 0 | 0\* | 0 | 2 |
| 375 | 0 | 0 | 11px | 0 | 0\* | 0 | 2 |

Zero horizontal overflow at every width, on the document and on `main` independently.

\* The raw probe reports "10 clipped" at ≤768. All ten are the off-canvas navigation drawer
(`Overview`, `Live Feed`, `Markets`, `Positions`, …) parked at `right: −9px` while `inert` and
`aria-hidden`. This is the same known false positive identified in Stage 3 and Stage 4 — the probe
measures geometry and cannot see `inert`. **Genuine clipped controls: 0.**

Mobile is not a compressed desktop: the card grid reflows to a single column, the table is replaced
rather than scrolled, and `BottomNav` carries navigation at 56px targets.

---

# 9. ACCESSIBILITY VALIDATION

| Check | Method | Result |
|---|---|---|
| Keyboard focus ring | real `Input.dispatchKeyEvent` Tab traversal, 30 stops | **27/27 product controls** (was 26/27 — `Search markets` had none) |
| Colour-independent state | text content | `YES`, `NO`, `CLOSED` all present as words |
| Reduced motion | `Emulation.setEmulatedMedia`, 1ms threshold | 3 anim / 47 trans → **0 / 0** |
| Type floor | computed `font-size`, all viewports | 11px, no smaller |
| Semantic table | `TableShell` primitives | `thead`/`th`/`tr`/`td` intact |
| Provenance names | `aria-label` | path included for assistive tech |

Focus was tested with **dispatched keyboard events**, not programmatic `.focus()` — `:focus-visible`
does not match a scripted focus call, which is what produced the misleading 2/20 reading in an earlier
stage.

The reduced-motion probe uses a **1ms** threshold, because the reset sets `0.01ms` rather than `0s`; a
`> 0` test counts every transition as still active and reports a false failure.

One sub-24px control remains: the `Markets` breadcrumb on the detail page, 58×16. It is inline
breadcrumb text, which WCAG 2.5.8 exempts. Recorded as debt D-4 rather than silently accepted.

---

# 10. PERFORMANCE CHECK

**Q-5 runtime confirmation — carried forward from Stage 3 — now PASS.**

This was blocked by the backend outage. With the backend healthy, the canvas-differencing probe ran
against a live runtime (`runtime: live`):

```
chart canvas 576x156
over 6s (40 samples, 150ms apart):
  plot strip changed  25 times  (4.2/s)   <- the curve is animating
  axis strip changed   3 times  (0.5/s)   <- the numeric read-out
  distinct axis renderings: 4 of 40
verdict: PASS
```

The curve moves continuously while the pinned numeric read-out steps only when a confirmed observation
lands — an 8:1 separation. Before the Q-5 fix both were driven by the dead-reckoned tip and changed at
the same rate. The probe samples the **separate price-scale canvas**, not the right edge of the plot
pane; lightweight-charts uses multiple canvases, and sampling the wrong one is what produced an earlier
incorrect reading.

**Stage 4 populated Live Feed verification — carried forward — now PASS.**

```
runtime: live
event stream <ul class="flex flex-col gap-1.5 list-none m-0 p-0">  →  2 <li>
first row: "EDGE / Edge detected / ×199 / Detected 2 market edge(s) / YES / 22.2%"
badges: /api/stats, /api/events, /api/price-history, /api/edges — all Live
semantic list: true (ul → li) at 1440 and at 375
```

The stream renders real events, the `<ul>`/`<li>` semantics introduced in Stage 4 hold with live data,
repeat-collapsing works (199 occurrences folded into one row with a count), and all four provenance
badges resolve LIVE. Evidence captured as `after-live-populated-{1440,1440-t20,375}.png`.

**Bundle — no regression:**

| Route | Size | First Load JS |
|---|---|---|
| `/markets` | 9.23 kB | 172 kB |
| `/markets/[marketId]` | 8.78 kB | 287 kB |
| shared by all | — | 102 kB |

`/markets/[marketId]` moved 8.75 → 8.78 kB (+0.03 kB) for the lifecycle helpers and the caption
attributes. `/markets` is unchanged at 9.23 kB. `marketLifecycle.ts` is pure functions over two
numbers — no new dependency, no new runtime work per frame.

---

# 11. BEFORE / AFTER REVIEW

| Question a reader asks | Before | After |
|---|---|---|
| Is this market still tradeable? | unanswerable — closed and open rows were identical | `CLOSED` marker, word + dot, non-interactive card |
| When does it resolve? | a date, identical on every card | `closes 4m` / `closed 31m ago` |
| Is a cheap YES bad news? | the colour said yes | the colour says "YES side", at every price |
| Where did this data come from? | no badge at all | per-endpoint badge, path in tooltip |
| Which input has focus? | a 1px border tint | a 2px offset ring |
| Can I read it at 375px? | — | no overflow, 11px floor, single column, 56px nav |

Evidence in `docs/design-export/evidence/stage-5/`:

```
after-markets-{1440,1024,768,430,390,375}.png
after-markets-table-1440.png
after-watchlist-{1440,375}.png
after-archive-{1440,375}.png
after-market-detail-{1440,375}.png
```

---

# 12. FILES CHANGED

**New (1):**

| File | Purpose |
|---|---|
| `src/lib/display/marketLifecycle.ts` | lifecycle derivation + formatting, 4 exported helpers |

**Modified (9):**

| File | Change |
|---|---|
| `src/components/markets/MarketCard.tsx` | `ProbBars` → `SideBar` on the market-side band; `CLOSED` marker; closed cards lose `card-interactive`; relative close time; category border → `--probex-border-active`; list YES price → `--probex-yes` |
| `src/components/markets/MarketTable.tsx` | `Signal` removed, `Probability` → `YES`, `Status` column added; closed rows at secondary weight |
| `src/components/markets/MarketsDomain.tsx` | `ProvenanceScope detail="tooltip"`; provenance badges into `actions` |
| `src/components/markets/MarketsPage.tsx` | standalone path left working after the badge move |
| `src/components/market-detail/MarketDetailPage.tsx` | `ProvenanceScope detail="tooltip"` |
| `src/components/market-detail/EngineThesisPanel.tsx` | YES Price → `--probex-yes`; day countdown → real time-to-close with `Closed` state |
| `src/components/market-detail/MarketHeader.tsx` | close time gained time of day |
| `src/components/market-detail/MarketCharts.tsx` | endpoint path → tooltip + accessible name |
| `src/lib/utils.ts` | `probabilityColorVar` annotated `@deprecated for MARKET-SIDE values` |
| `src/app/globals.css` | `.input-base:focus` no longer `outline: none`; new `:focus-visible` ring |

(`globals.css` is listed among the nine; its cumulative diff against the baseline commit also contains
Stage 2–4 work, so the line counts in `git diff --stat` are not Stage-5-only.)

No backend file, no contract, no dependency, no config, no route.

---

# 13. TYPECHECK / TEST / BUILD RESULTS

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** — exit 0, no diagnostics |
| Tests | `npx vitest run` | **PASS** — 162 passed, 13 files, 8.24s |
| Build | `npm run build` | **PASS** — compiled in 23.2s, 22/22 static pages, 22 route rows, 102 kB shared |

162/13 matches the baseline exactly — no test was added, removed, skipped or broken.

Two notes on measurement honesty:

1. An earlier run of this report's build printed `route rows: 0`. That was my grep, not the build:
   `grep -P` on box-drawing characters fails in this shell's locale (*"-P supports only unibyte and
   UTF-8 locales"*) and returned empty. Re-measured correctly: **22 rows**, consistent with
   `22/22` static pages and exit 0.
2. A `next build` was at one point run while a dev server still held the port, which corrupted that
   server's `.next` and made it serve 500s. The build itself was unaffected; the stale process was
   terminated and the final build and all runtime measurements above were taken on clean processes.

---

# 14. BACKEND DEPENDENCIES / VALIDATION GAPS

**No backend change was made or requested.** The market-data problems from the forensic audit are
untouched, per the brief.

### Still depends on the backend

- **The stale market cache remains the root cause** of the forensic audit's findings. Stage 5 makes an
  expired market *look* expired; it does not stop the engine serving it. A market that has closed is
  now visibly closed, which is a UI fix to a data problem and should not be mistaken for a data fix.
- `/api/markets` still has **no `status` field**. Lifecycle is derived from `closes_at`. If a market
  ever closes early or is cancelled, `closes_at` will not say so and the UI will read `open` until the
  timestamp passes. A real `status` field would remove the inference entirely — this is the cleanest
  backend ask arising from this stage.

### Gaps in what I could validate

- **Closed-market rendering was validated against whatever the catalogue happened to contain**, not
  against a constructed expired market. I did not inject or mutate data. The code path is covered by
  the helper's logic and the detail page did read back `CLOSED`; a catalogue with a known mix of open,
  closing and closed markets would validate the three card treatments side by side.
- **The `closing` (≤2 min) state was not observed directly** — it requires catching a market inside a
  two-minute window. Its logic is a single comparison and is exercised by the same helper.
- Colour contrast was checked by token, not by per-theme ΔE sweep across the new lifecycle states.
  `closed` uses existing neutral tokens, which were swept in Stage 2.
- Measurements were taken on the **dev** server. The production server (`next start`) would not render
  the Overview charts in this environment and `/dashboard/overview/` returned 500 there; that is a
  local-process issue, not a finding about the build, which compiled and prerendered cleanly. Worth
  noting because it means the runtime numbers above are dev-server numbers.

### Both carried-forward validations are now cleared

Stage 3 Q-5 and Stage 4 populated-feed verification both ran against a healthy live backend this stage
and both **PASS** (§10). Nothing remains carried forward.

---

# 15. REMAINING DEBT

### D-1 — A Stage 4 error of mine, found during this stage's audit, and not previously reported

In Stage 4 I needed `--probex-warning-border`. I grepped **only** `probex-tokens.css`, found nothing,
concluded the token was undeclared, and added six per-theme literals. It was already declared — in
`src/app/globals.css:20`:

```css
:root {
  --probex-positive-border: color-mix(in srgb, var(--probex-positive) 25%, transparent);
  --probex-negative-border: color-mix(in srgb, var(--probex-negative) 28%, transparent);
  --probex-warning-border:  color-mix(in srgb, var(--probex-warning) 30%, transparent);
}
```

— in the block whose own comment says these are *"defined once via color-mix over the per-theme base
vars, so they adapt automatically"*, and which exists specifically to **replace hardcoded rgba
literals**. I reintroduced exactly what it had removed.

I recorded this as "my literals override the derived token". **That was wrong, and I verified it rather
than reasoning about cascade order.** Measured computed values on the running app:

| Theme | `--probex-warning-border` resolves to | my literal said |
|---|---|---|
| aurora | `color-mix(in srgb,#F59E0B 30%,transparent)` | `rgba(245,158,11,0.28)` |
| midnight | `color-mix(in srgb,#F59E0B 30%,transparent)` | `rgba(245,158,11,0.28)` |
| quantum | `color-mix(in srgb,#FFBB00 30%,transparent)` | `rgba(255,187,0,0.28)` |
| emerald | `color-mix(in srgb,#F59E0B 30%,transparent)` | `rgba(245,158,11,0.28)` |
| institutional | `color-mix(in srgb,#B45309 30%,transparent)` | `rgba(217,119,6,0.28)` ← **wrong colour** |
| ember | `color-mix(in srgb,#F59E0B 30%,transparent)` | `rgba(245,158,11,0.28)` |

The derived declaration wins in **all six** themes. My six literals are **inert dead code** — no
rendered colour is affected. But the institutional literal encodes `#D97706` where that theme's actual
warning colour is `#B45309`: already drifted, and invisible only by luck of the cascade. That drift is
precisely what the derived token exists to prevent.

**Recommended remedy:** revert the six added declarations in `probex-tokens.css`
(lines 139, 323, 389, 453, 517, 595). Zero visual change; removes six dead lines and restores
"defined once". I have **not** made this change — it is in frozen Stage 4 territory and is yours to
approve.

### D-2 — `probabilityColorVar` has no callers

Retained deliberately, with a `@deprecated` note explaining which band it belongs to and why it must
not be used for a side. Delete it only together with that explanation, or the next person re-derives
the mistake.

### D-3 — Market Detail renders no provenance badge

The page declares `ProvenanceScope detail="tooltip"`, but there is no `ProvenanceBadge` on it for the
scope to govern — measured: 0. Unlike M-5 this is not unreachable code; the badges were never written.
Adding them is new surface rather than a refinement, so I left it for an explicit decision.

### D-4 — One sub-24px control

`Markets` breadcrumb on the detail page, 58×16. WCAG 2.5.8 exempts inline text links. Recorded, not
fixed.

### D-5 — Backend handoff (unchanged by this stage)

B-7 cold-connection latency >5s; B-8 availability; and the forensic audit's nine recommendations, of
which the stale market cache is the root cause.

---

# 16. RECOMMENDATION FOR STAGE 6

**Stage 5 is ready for review.** Stage 6 has not been started.

Before Stage 6 begins, two small decisions are worth taking:

1. **D-1** — approve reverting the six dead `--probex-warning-border` literals. Small, zero-risk, and
   it closes an error I introduced.
2. **D-3** — decide whether Market Detail should carry provenance badges.

For Stage 6 itself, the remaining domains are Positions, Portfolio, Execution, Strategy, Analytics,
System and Settings. My recommendation is to take **Positions and Portfolio together as Stage 6**,
rather than sweeping all seven:

- They are the two surfaces where the **financial-direction** band is genuinely load-bearing — real
  P&L, real gains and losses. Every prior stage has found a band collision; these are where a collision
  would be most costly, and where `--probex-positive` / `--probex-negative` should finally be doing
  exactly the job they were defined for.
- They are the surfaces the forensic audit touched most directly. The audit found six accounting
  surfaces reconciling exactly and two process-scoped counters disagreeing because a restart reset
  them. A reader of Positions and Portfolio currently has no way to tell a process-scoped counter from
  a persistent one — that is a provenance problem in the same family as M-5, and worth solving while
  the audit's findings are fresh.
- Execution and Settings carry mutation controls. In a paper environment they deserve their own stage
  with its own explicit confirmation of what is and is not wired, rather than being folded into a
  visual refinement pass.

Suggested Stage 6 shape, matching the rhythm that has worked: audit first with no code changes, then
implement, then report — with the audit paying specific attention to whether any gain/loss figure is
rendered on a band other than financial direction, and whether any counter is presented as
authoritative when it is process-scoped.

---

*No commit, no push, no branch, no dependency installed. Paper/simulation mode unchanged. Overview,
Live Feed and `MarketChart.tsx` unmodified. Stage 6 not begun.*
