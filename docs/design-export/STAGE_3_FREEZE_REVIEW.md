# PROBEX — Stage 3 Freeze Review (Overview)

**Date:** 2026-09-09 · **Type:** evidence, regression and freeze pass · **No new design changes were made.**
Evidence: `docs/design-export/evidence/stage-3/`

---

## 1 · STAGE 3 VERDICT

# PASS — Q-5 RUNTIME CONFIRMATION PENDING

Every frontend check passes. The single outstanding item is a **backend availability problem**, not a frontend defect: `qubo-probex.duckdns.org` is returning `502` on `/api/*` and timing out entirely on `/` and `/dashboard/`, so a live runtime confirmation of Q-5 cannot be performed. `MarketChart.tsx` is byte-unchanged since the Stage 2 report, so the Stage 2 pixel-diff evidence remains valid.

No new UI changes, refactors or route edits were made during this pass. One working artifact (`peek-desktop.png`, an intermediate capture) was deleted from the evidence folder.

---

## 2 · BEFORE / AFTER REVIEW

Compared `BEFORE-overview-desktop-1440.png` (frozen export) against `after-overview-desktop-1440.png`, plus mobile 375 and the 1024 intermediate width.

| Dimension | Before | After | Verdict |
|---|---|---|---|
| **Hierarchy** | Attention band first — a fault list outranked the engine's state on every load | Hero first; attention second; rail third | **Improved** — closes visual debt #4 |
| **Engine Focus prominence** | 84px gauge left, market title at 13px right, `YES` as plain text, `62% conf` | Market question **first at 16px**, 72px gauge below, `YES` as a filled chip with per-theme ink, `62% confidence` | **Improved** — answers "what" before "how much" |
| **Endpoint exposure** | `/api/price-history`, `/api/edges`, `/api/survival`, `/api/positions`, `/api/paper-stats`, `/health · /api/stats` visible | **0 paths** | **Resolved** |
| **Attention band** | Raw probe text: `Market data stale (37461.0s old, 10 markets cached)`, `High memory usage: 588.4MB (limit: 500MB)` | Plain statements + **System console →**; raw reading moved to `title` | **Improved** |
| **Chart prominence** | Vertical + horizontal gridlines, sans axis ticks | Horizontal only, mono ticks, pinned confirmed price label | **Improved** |
| **Instrument rail** | `gap-3`, standard density | `gap-2.5`, dense — reads as secondary | **Improved** |
| **Density** | ~690px before the first market | Same real estate, tighter rail, more above the fold | **Improved** |
| **Typography** | 10px badges, mixed faces on axes | 11px floor throughout, mono numerics | **Improved** |
| **Semantic colour** | primary == yes (same cyan) | Disaggregated; YES chip uses `--probex-on-yes` | **Improved** |
| **Market/intelligence feel** | Endpoint-annotated panels | Named subject, real category tags, cent prices | **Improved** |
| **Navigation** | Hamburger drawer only below `lg` | Drawer **plus** a 5-slot bottom rail below `md` | **Improved** |
| **Mobile usability** | Header dense; status chip could overrun | Compact status word below `sm`; 56px targets | **Improved** |

**Intermediate width (1024×768):** transitions deliberately — sidebar stays expanded, hero keeps its two-column split, the rail drops 4-up → 2-up. No regression.

**LIVE state:** all six `after-overview-*` captures asserted `runtime.mode === 'live'` before saving; the harness refuses to write a mislabelled screenshot.

**OFFLINE state:** captured at all six widths in this pass (`review-offline-*.png`) plus `OFFLINE-overview-desktop-1440.png` / `-mobile-375.png`. The state renders honestly — "No signal report / The engine did not answer", em dashes throughout, nothing fabricated.

**No regressions found. No changes made.**

---

## 3 · RESPONSIVE VALIDATION

Measured in-browser at every required width (runtime `offline`; all these properties are shell properties, independent of the feed):

| Width | Overflow doc | Overflow main | Min font | Endpoint paths | Header clipped | Header overlaps | Bottom rail | Rail target | Drawer links |
|---|---|---|---|---|---|---|---|---|---|
| 1440 | **0** | **0** | 11px | 0 | 0 | 0 | hidden | — | 10 |
| 1024 | **0** | **0** | 11px | 0 | 0 | 0 | hidden | — | 10 |
| 768 | **0** | **0** | 11px | 0 | 0 | 0 | hidden | — | 10 |
| 430 | **0** | **0** | 11px | 0 | 0 | 0 | shown | 86×56 | 10 |
| 390 | **0** | **0** | 11px | 0 | 0 | 0 | shown | 78×56 | 10 |
| 375 | **0** | **0** | 11px | 0 | 0 | 0 | shown | 75×56 | 10 |

- **No clipped header/session controls** at any width (measured against the viewport edge, not by eye).
- **No overlapping controls** — every pair of header controls was tested for rectangle intersection.
- **No truncated status meaning.** ≥768 renders `ENGINE UNREACHABLE`; <768 renders the short form `NO FEED`. Neither is an ellipsis, and `scrollWidth > clientWidth` was checked to confirm no CSS truncation. The accessible name carries the full sentence at **every** width: *"System status: Engine unreachable. No response from the engine — development never substitutes generated data."*
- **Bottom rail usable** — 56px tall, past the 44px comfort threshold.
- **Drawer remains the complete index** — 10 route links present at every viewport.

---

## 4 · ACCESSIBILITY VALIDATION

**Keyboard focus — real `Input.dispatchKeyEvent` Tab traversal, not `.focus()`:**

```
product controls: 27/27 show a focus indicator
ring spec:        solid 2px, offset 2px
dev-overlay stops (nextjs-portal): 6 — excluded, not product UI
```

Every product control passes. The six stops without a ring are all inside `<nextjs-portal>`, the Next.js development overlay; they are absent from production builds and are reported separately rather than counted as failures.

**Other checks:**

| Check | Result |
|---|---|
| Touch targets (rail) | 75–86 × **56px** |
| Colour-only meaning | 7 provenance badges, **0** without a word |
| Accessible names | `Data source: No feed`; title `The engine could not be reached — no value is being shown` |
| Minimum rendered font | **11px** at all six widths |
| Reduced motion | 7 animations / 34 transitions → **0 / 0** |
| Semantic contrast | All six themes pass nine constraint families — `evidence/stage-3/theme-audit.txt`, 0 problems |

---

## 5 · ENDPOINT PRESENTATION

**Ordinary Overview UI exposes 0 raw endpoint paths**, measured at all six viewports by scanning every leaf text node for `/api/` or `/health`. Before: ~10.

Diagnostic meaning is preserved, verified in source at `ProvenanceBadge.tsx:150-151`:

```tsx
title={shownDetail ? `${c.label} — ${shownDetail}` : c.title}
aria-label={`Data source: ${c.label}${shownDetail ? ` (${shownDetail})` : ''}`}
```

Both read `shownDetail`, **not** the scope-gated `inlineDetail` — so when a request was actually made, the endpoint is in the tooltip and the accessible name regardless of the register a route declares. Only the *printed* text is demoted.

One nuance, pre-existing and unchanged: under `unreachable` or `synthetic`, `shownDetail` is deliberately `undefined` — *"the endpoint id is only meaningful when a request was actually made to it"* — so the title falls back to a plain-language reason. That is why this pass, run against a 502 backend, shows the reason rather than the path.

**System is untouched.** `ProvenanceScope` defaults to `inline`; a surface that declares nothing keeps the printed endpoint, so System and Diagnostics cannot be changed by accident from elsewhere.

---

## 6 · FILES CHANGED

Stage 3 changed **11 files** (2 new). Route integrity: **no `page.tsx` or `layout.tsx` route file was modified**, `basePath: "/dashboard"` is intact, and the Overview route entry is unchanged.

| File | Why |
|---|---|
| `shared/ProvenanceScope.tsx` **(new)** | Lets a route declare its provenance register once, instead of threading a prop through `Panel`/`StatCard`/`ChartFrame` |
| `layout/BottomNav.tsx` **(new)** | Mobile navigation rail, 5 slots + More; real routes only |
| `overview/OverviewPage.tsx` | Declares the register; hero → attention → rail order |
| `overview/EngineFocusHero.tsx` | `EdgeFound` recomposed — subject first, filled side chip; `Detected` counter grouped |
| `overview/EngineAttention.tsx` | Moved below the hero; raw probe text → `title`; System console link |
| `overview/EngineStateBand.tsx` | `density="dense"` ×4 and `gap-3` → `gap-2.5` — the compact rail |
| `shared/ProvenanceBadge.tsx` | Reads the register; prints the endpoint only when `inline` |
| `layout/DashboardLayout.tsx` | Mounts the rail; reserves its height below `md` |
| `system/SystemStatusIndicator.tsx` | Renders the short status word below `sm` |
| `lib/display/systemStatus.ts` | `shortLabel` — additive field, one per state |
| `styles/probex-tokens.css` | **4 declarations only**: emerald and quantum `positive` + `positive-dim` |

> `git diff --numstat` against HEAD shows larger counts for `EngineStateBand.tsx` (+132/−34) and `probex-tokens.css` (+198/−47) because those totals are **cumulative across the whole session** (Stages 0–1, 2 and 3), not Stage 3 alone. Stage 3's contribution to each is the two lines above.

**Not changed:** `MarketChart.tsx`, `LiveChart.tsx`, `ChartFrame.tsx`, `Panel.tsx`, any hook, any mapper, any service, any endpoint definition, any route file.

---

## 7 · VALIDATION RESULTS

| | Expected | Actual |
|---|---|---|
| Typecheck | PASS | **PASS** (`tsc --noEmit`, exit 0) |
| Tests | 162/162 | **162 passed / 13 files** |
| Build | PASS, 22 routes | **PASS** — `✓ Compiled successfully in 34.0s`, `✓ Generating static pages (22/22)`, 21 route-table rows, shared JS **102 kB** unchanged |

Nothing differed from baseline. No unrelated code was touched.

---

## 8 · Q-5 STATUS

**Structurally intact — runtime confirmation PENDING BACKEND STABILITY.**

`MarketChart.tsx` is **unchanged since the Stage 2 report** (verified by mtime and by the Stage 3 file list). Invariants re-read in source:

| Invariant | Line | State |
|---|---|---|
| Library no longer reports the animated tip | 235–236 | `lastValueVisible: false`, `priceLineVisible: false` |
| Pinned label created from the confirmed value | 382 | `createPriceLine({ price: last.value, … })` |
| Re-priced **only** on confirmed arrival | 391 | `applyOptions({ price: last.value })`, inside the `[points, up]` effect |
| Tip written back before append | 361 | `s.update({ time: a.tipTime, value: a.anchorV })` |
| `a.display` never drives the read-out | 367 | appears only in series `update()` — the curve |

`a.display` (the dead-reckoned projection) reaches the **curve** and nothing else. The numeric read-out is bound to `last.value` / `a.anchorV`.

**Not done, and not faked:** a live runtime re-confirmation. The backend is unavailable. Per instruction I did **not** weaken the probe timeout, did **not** fabricate a result, and did **not** modify `MarketChart.tsx`. The Stage 2 pixel-diff evidence (plot strip 3.3 changes/s vs axis strip 1.0/s) stands, because the code it measured has not changed.

---

## 9 · BACKEND OBSERVATION

Recorded separately from the frontend assessment. **Not compensated for in the frontend.**

```
/api/health   502  ×8 consecutive   (0.71 – 1.78s)
/api/stats    502                   (0.74s)
/api/runtime  502                   (0.80s)
/             000  timeout          (20.0s)
/dashboard/   000  timeout          (20.0s)
```

Earlier in the same session, degrading in sequence: `0.71s` → `1.39s` → `7.44s` → `7.56s` → `24.14s` → `502` → host timeout.

**Assessment:** this is a backend/deployment failure. `/api/*` returning 502 means the nginx bridge is up but the engine behind it is not answering; `/` and `/dashboard/` timing out means the host itself is now degrading, which is broader than the engine process.

Two items for the backend handoff:

- **B-7 · Cold-connection latency.** A first request on a cold connection has repeatedly measured ~7.5s, exceeding the frontend's 5s probe budget, so local dev resolves OFFLINE on a cold start. That is the fail-safe working correctly and must not be "fixed" by raising the budget.
- **B-8 · Availability.** Sustained 502s and host-level timeouts.

---

## 10 · REMAINING DEBT

| # | Item | Origin | Status |
|---|---|---|---|
| **D-1** | Q-5 runtime re-confirmation owed once the backend is stable | Stage 3 | Pending |
| **D-2** | BTC price truncates to `$78,…` in the header at 1024px — the strip competes with the command palette for width. `EngineStatusStrip` was not touched in Stage 3; the `truncate` is pre-existing. | Pre-existing | Logged |
| **D-3** | Attention band lists **"Survival state: Thriving"** as needing attention — a healthy state flagged as a warning. Lives in `lib/mappers/overview`. | Pre-existing | Logged |
| **D-4** | lightweight-charts price axis renders 2 decimals (`78519.10`) — noisy at $78k and ~130px of a 375px screen | Pre-existing | Deferred |
| **D-5** | Engine Focus column has vertical dead space between the side chip and the signal ledger at desktop | Stage 3, cosmetic | Minor |
| **D-6** | Only Overview declares `detail="tooltip"`; seven other routes still print endpoint paths | By design | Their stages |
| **D-7** | Independent register `D-1…D-5` (y-axis, gauge, on-accent, shadows, touch targets) — all closed in Stages 0–2 except Group B/C/D touch targets | Earlier | Partly open |

---

## 11 · RECOMMENDATION FOR STAGE 4

**Freeze Overview.** The route is structurally and visually complete, measured rather than asserted, with no open frontend defects.

Two conditions to carry forward rather than block on:

1. **Re-run the Q-5 runtime probe** as the first action of the next session in which the backend is healthy. It is a 90-second check (`plot strip vs axis strip` change rate) and needs no code change.
2. **Raise B-7 and B-8 with Jake** before the next stage's validation, because every subsequent stage's LIVE capture depends on backend availability, and this pass has already lost one confirmation to it.

**Suggested Stage 4 target: Live Feed.** It shares Overview's register (an intelligence surface), reuses `MarketChart` and `EventStream`, and its pause affordance is the most interesting untouched interaction in the product — a small, well-bounded route that will exercise the new language without the density risk of Strategy or Analytics.
