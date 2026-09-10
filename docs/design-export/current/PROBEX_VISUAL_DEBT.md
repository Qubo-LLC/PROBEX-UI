# PROBEX — Visual Debt Register

**Captured:** 2026-09-08, post Stage-A closeout

Observations about the **current** UI, grouped as requested. **Nothing here is solved or recommended** — this exists so the design tools and the product owner share a precise picture of what the interface currently does.

Each item notes where it can be seen in this export.

---

## INFORMATION HIERARCHY

1. **Panel is the only landmark.** Almost every surface is a bordered card with a title, a badge and a figure. Within a page, a critical number and an incidental one carry near-identical visual weight. *(any desktop capture)*
2. **The four-up instrument row is the product's best hierarchy and appears once** — only on Overview. Other pages present flatter panel grids. *(`overview-desktop-1440.png` vs `system-desktop-1440.png`)*
3. **Analytics is 3254px tall at 1440 width** — three named bands, no in-page navigation or anchoring. *(`analytics-desktop-1440-scroll1..3.png`)*
4. **The attention band competes with the hero.** On Overview the warning list sits above the BTC price, so the first thing read is a fault list, not the engine's state. *(`overview-desktop-1440.png`)*
5. **Page subtitles do real explanatory work** ("How the system has performed over time — edge quality, capital efficiency, and trading results") but are set at metadata weight.

---

## VISUAL LANGUAGE

6. **`--probex-yes` and `--probex-primary` are the same cyan** in the default theme. A YES position, a focus ring and a brand control are chromatically identical. *(`markets-desktop-1440.png`)*
7. **Two shadow vocabularies coexist** — `shadow-surface`/`shadow-surface-lg` and the canonical `elev-1…4`.
8. **Seven radius steps** for a product that predominantly uses one.
9. **`StatCard` and `Panel` overlap.** Both render a labelled figure with provenance; the split is historical.
10. **Six themes ship, one is used.** `midnight`, `quantum`, `emerald`, `institutional`, `ember` are maintained but largely unexercised.
11. **No webfont.** Type renders in Segoe UI Variable (Windows), SF (macOS), Roboto (Android). Every screenshot here is the Windows rendering; typographic colour is not controlled.
12. **10px (`2xs`) carries meaning** — provenance, freshness, endpoint paths and metadata all sit at the smallest step.

---

## DATA VISUALIZATION

13. **Y-axis leading digits are clipped.** Analytics → Drawdown shows `4%`, `5%`, `6%` where the values are `34%`, `35%`, `36%`. *(`analytics-desktop-1440.png`)*
14. **Kelly Utilization reads `150% UTILIZED`** with a fully-closed green ring — a gauge whose maximum the value exceeds. *(`analytics-desktop-1440.png`)*
15. **Flat series read as broken.** Capital Growth renders as a perfectly straight line because the value hasn't moved; it is indistinguishable from a rendering failure. *(`analytics-desktop-1440.png`)*
16. **Y-domains default to zero-based**, flattening series that live far from zero. `LiveChart` exposes a `yDomain` escape hatch; usage is inconsistent.
17. **"last 40 of 500" windowing note** appears inside the plot area as small grey text — an important caveat rendered as a footnote.
18. **Two chart libraries**: recharts everywhere, lightweight-charts on market detail only. Their axes, gridlines and tooltips do not match.
19. **Tooltips are hover-only** (recharts default). The underlying data is available as text on the Consensus surface (`Historical Snapshots`), but not on every chart.
20. **Sparkline vs full chart** have no visual distinction in framing.

---

## INTERACTION

21. **Live Feed's pause is the product's most interesting affordance** and is visually understated — it freezes the render while polling continues. *(`live-desktop-1440.png`)*
22. **Filter chips carry no result-count feedback.** Selecting `15m` changes the grid with no summary of what was excluded. *(`interactions/markets-filter-15m-desktop-1440.png`)*
23. **Grid ⇄ table toggle is icon-only** with no persisted preference visible in the UI. *(`interactions/markets-table-view-desktop-1440.png`)*
24. **Command palette is the primary navigation accelerator** but its trigger reads as a search field. *(`interactions/command-palette-desktop-1440.png`)*
25. **Sidebar collapse retains icons only** — no tooltips captured on the collapsed rail. *(`interactions/sidebar-collapsed-desktop-1440.png`)*
26. **Mutations are confirm-gated** (Execution → Paper), which is correct, but the gate's disabled reasoning is only in a `title` attribute.

---

## RESPONSIVE

27. **BTC price disappears from the header below ~640px.** The strip shrinks and the price is dropped rather than reflowed. It remains on the Overview hero, so no information is lost on that page — but it is lost on every other page. *(`overview-mobile-375.png`)*
28. **Header is dense at 375px** — hamburger, logo, search, status chip and action button in 375px. *(`overview-mobile-375.png`)*
29. **Wide tables scroll inside their containers** — correct, but there is no affordance indicating more columns exist off-screen. *(`positions-mobile-390-scroll1.png`)*
30. **Charts keep desktop proportions on mobile**, becoming short and wide with crowded x-axis labels. *(`system-mobile-390.png`)*
31. **The 768px tablet width is the tightest case** — it was the only viewport with header element collisions before the Stage-A fix, and remains the most compressed composition. *(`overview-tablet-768.png`)*
32. **Instrument panels at 2-up (tablet)** leave the fourth panel visually orphaned on a second row.

---

## ACCESSIBILITY

33. **25 touch targets below 44×44px.** Sidebar rows are 183×40; icon buttons 32×32; brand link 26×24. All pass WCAG 2.5.8 AA (24px) — none reach 2.5.5 AAA / mobile-HIG comfort.
34. **Charts are `role="img"` with real summaries** — e.g. *"Confidence Evolution. 40 observations, latest 55.2% at 11:12 PM."* This is genuinely good and worth preserving.
35. **Chart tooltips are hover-only**; keyboard users get the summary, not the point-by-point series.
36. **Status is colour-plus-word throughout** (`Degraded`, `THRIVING`, `NO FEED`), not colour alone — good.
37. **`--probex-text-muted` (0.62α) and `--probex-text-disabled` (0.50α)** are close enough that "de-emphasised" and "unavailable" can read alike.
38. **10px provenance/freshness text** is below common readability guidance and carries meaning.
39. **Focus ring exists** (`2px solid var(--probex-primary)`, offset 2px) and is applied via `.focus-ring` — but it is opt-in per component, not global.

---

## SYSTEM / ADMIN

40. **System is the most technical page** — snake_case component names (`clob_client`, `resolution_tracker`), RSS/VMS memory, per-endpoint circuit state. *(`system-desktop-1440-scroll1..2.png`)*
41. **Endpoint Diagnostics exposes the client's internal request ledger** to the operator. *(`interactions/system-diagnostics-desktop-1440.png`)*
42. **A UI note references `POST /api/update-stats`** — an API contract detail rendered as product copy.
43. **14 runtime component chips** are presented flat, with no grouping by importance.

---

## MICROCOPY

44. **Copy is unusually careful and is a product asset.** Examples: *"Whether the engine sees an edge right now is unknown — this panel shows nothing rather than assuming it is idle."* · *"Engine offline — Backend unreachable — no synthetic data is being substituted."* · *"The engine acts only above 1.5% edge. It prefers no trade to a weak one."*
45. **Voice varies by surface.** Overview explains; System states; Analytics lectures (a full explanatory paragraph inside the Kelly panel).
46. **Three "nothing here" phrasings** — "Awaiting the survival brain's first report", "Not yet computed", "No signal report" — deliberately distinct, but a reader must learn the distinction.
47. **Sentence case vs UPPERCASE labels** are mixed: panel titles uppercase, section headings sentence case.

---

## TECHNICAL TERMINOLOGY EXPOSED TO USERS

48. **Literal endpoint paths in ~40 badges** — `/api/price-history`, `/api/paper-stats`, `/health · /api/stats`. Deliberate provenance, but it is developer vocabulary in the product surface.
49. **The same endpoint carries two provenance labels** — Analytics shows `DERIVED · /api/portfolio/history` and `LIVE · /api/portfolio/history` on adjacent charts.
50. **Domain jargon unglossed:** `Kelly modifier`, `Brier`, `Shapley`, `Kalman`, `survival brain`, `edge bucket`, `CLOB`, `backoff`, `Kelly fraction`, `drawdown`.
51. **`unspecified` appears as a signal-source value** in Edge Quality — a null rendered as a label. *(`analytics-desktop-1440.png`)*
52. **Cent-denominated prices** (`0¢` / `100¢`) assume familiarity with prediction-market conventions.

---

## MOTION

53. **Motion is deliberately rationed** and documented as such — the provenance LIVE dot does **not** pulse; one top-bar indicator carries system liveness.
54. **Only two Tailwind animations survive** (`fade-in-up`, `brand-pulse`); dead keyframes were removed.
55. **`isAnimationActive={false}` on all recharts series** — a live series must not re-animate every poll.
56. **`--motion-ring` (620ms) value-change pulse** is the main "something happened" signal and is easy to miss on a dense page.
57. **`data-reduce-motion` disables everything** — a full escape hatch exists.

---

## Note on capture conditions

The engine was **healthy but intermittently slow** during capture — one `/api/health` probe measured **7.58s**, exceeding the frontend's 5s probe budget, which briefly resolved local dev to OFFLINE. This is the fail-safe behaving correctly, but it means a small number of capture attempts had to be retried and mode-verified before saving. Every screenshot in this export had its runtime mode asserted at capture time.

Market data was itself stale backend-side throughout (`api_access` probe failing, "Market data stale (37461s old)") — so `DEGRADED` in the header and the attention band is the engine's **real** state, not a staged one.
