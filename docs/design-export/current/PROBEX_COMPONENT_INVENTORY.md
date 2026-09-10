# PROBEX — Component Inventory (Current Implementation)

**Captured:** 2026-09-08, post Stage-A closeout

Descriptive only. Every entry is what exists in the repository today.

---

## Layout shell

| Component | File | Purpose | Variants | Visual role |
|---|---|---|---|---|
| **AppShell** | `layout/AppShell.tsx` | Composition root for the cockpit chrome | — | Wraps nav + main scroll region |
| **DashboardLayout** | `layout/DashboardLayout.tsx` | Mounts `ApplicationStateLoader`, `AuthGate`, nav, main | — | The frame every page renders inside |
| **TopNavigation** | `layout/TopNavigation.tsx` | Fixed 52px header, 3-column grid `[1fr auto 1fr]` | — | Brand · command palette · engine vitals |
| **Sidebar** | `layout/Sidebar.tsx` | Primary nav, 200px expanded / 52px collapsed | expanded, collapsed, mobile drawer | Grouped nav: OBSERVE · CAPITAL · INTELLIGENCE · ENGINE |
| **EngineStatusStrip** | `layout/EngineStatusStrip.tsx` | BTC price, survival chip, latency, system status | — | The header's live vitals cluster |
| **ProfileMenu** | `layout/ProfileMenu.tsx` | Session menu (no auth behind it) | — | Avatar-style trigger |
| **CommandPalette** | `layout/CommandPalette.tsx` | ⌘K route jump | — | Modal overlay list |
| **FooterTrust** | `layout/FooterTrust.tsx` | Provenance/mode disclosure strip | — | Bottom-of-shell honesty line |

---

## Surfaces & containers

| Component | File | Purpose | Variants | Visual role |
|---|---|---|---|---|
| **Card** | `ui/Card.tsx` | Base raised surface | default, `recessed` (dashed), `noPadding` | The single surface primitive |
| **Panel** | `ui/Panel.tsx` | Instrument container: title, subtitle, provenance, freshness, action slot, children | `density`: standard/dense/focal · `state`: live/idle/attention/unavailable · `recessed` · `updateKey` pulse · `slice` | The dominant composition unit; carries the left state-rail |
| **PageHeader** | `ui/PageHeader.tsx` | Page title + subtitle + actions | — | Top of every domain page |
| **SectionHeading** | `ui/SectionHeading.tsx` | Sub-section label with optional count + actions | — | Divides a page into named bands |
| **Tabs** | `ui/Tabs.tsx` | URL-driven tabs (`?view=`) | — | Domain sub-navigation |
| **Dialog** | `ui/Dialog.tsx` | Modal | — | Confirmations (mutations) |

### Panel sub-primitives (same file)

`Focal` (the one big figure) · `Row` / `RowGroup` (label→value lines) · `Meter` (3px progress) · `PanelPending` (withheld-value state)

---

## Data display

| Component | File | Purpose | Variants | Visual role |
|---|---|---|---|---|
| **StatCard** | `ui/StatCard.tsx` | Single metric tile | provenance, trend | Compact KPI |
| **DataTable** | `shared/DataTable.tsx` | `TableShell`/`Thead`/`Th`/`Tr`/`Td` | align, numeric | The only table system |
| **EdgeTable** | `shared/EdgeTable.tsx` | Edge/opportunity rows | — | Ranked opportunity list |
| **EventStream** | `shared/EventStream.tsx` | Engine activity log rows | — | Newest-first, deduped |
| **ProbabilityValue** | `shared/ProbabilityValue.tsx` | Probability/percentage rendering | — | Consistent probability typography |
| **PriceCard** | `shared/PriceCard.tsx` | BTC price + sparkline | — | Hero price surface |
| **TargetProgress** | `shared/TargetProgress.tsx` | Target vs actual | — | Daily/weekly goal bars |
| **DecisionPipeline** | `shared/DecisionPipeline.tsx` | Engine decision stages | — | Strategy pipeline visual |

---

## Charts

| Component | File | Purpose | Variants | Visual role |
|---|---|---|---|---|
| **ChartFrame** | `shared/ChartFrame.tsx` | Owns chart state + a11y wrapper | `loading`/`live`/`stale`/`idle`/`empty`/`unavailable`; `bare` | The single chart shell; `role="img"` + required summary; renders `StaleStrip` |
| **LiveChart** | `shared/LiveChart.tsx` | Line/area series over ChartFrame | `area`, `line`; windowed | Most charts in the product |
| **MarketChart** | `shared/MarketChart.tsx` | Market price/volume (lightweight-charts) | candles, line | Market detail |
| **PendingChart** | `shared/PendingChart.tsx` | Placeholder for an endpoint that doesn't exist | — | Awaiting-backend chart slot |
| **RadialGauge** | `shared/RadialGauge.tsx` | Circular gauge | — | Edge strength, consensus score |

---

## Status, provenance & state

| Component | File | Purpose | Variants | Visual role |
|---|---|---|---|---|
| **ProvenanceBadge** | `shared/ProvenanceBadge.tsx` | Where a number came from | live · derived · idle · awaiting · **stale** · synthetic · unreachable | The data-lineage grammar; auto-downgrades on mock/offline/stale |
| **FreshnessIndicator** | `shared/FreshnessIndicator.tsx` | How current a reading is | fresh / aging / stale / never; `StaleNotice` banner variant | Pairs with ProvenanceBadge |
| **StatusChip** | `ui/StatusChip.tsx` | Compact state pill | positive/warning/danger/info/neutral, optional live dot | Survival state, engine mode, backoff |
| **EdgeBadge** | `shared/EdgeBadge.tsx` | Edge magnitude + direction | YES/NO | Opportunity strength |
| **RecommendationBadge** | `shared/RecommendationBadge.tsx` | Engine verdict | — | Recommendation surfacing |
| **LiveHeartbeat** | `shared/LiveHeartbeat.tsx` | Time since last successful poll | — | Single top-nav liveness signal |
| **ValueFlash** | `shared/ValueFlash.tsx` | One-shot flash on change | — | Value-change affordance |
| **AwaitingValue** | `shared/AwaitingValue.tsx` | Placeholder for a not-yet-arrived figure | sm/lg | Withholds rather than printing 0 |
| **AwaitingBackend** | `shared/AwaitingBackend.tsx` | Whole-panel "no endpoint exists" | — | Honest capability placeholder |
| **IntelligenceModule** | `shared/IntelligenceModule.tsx` | Awaiting-backend intelligence slot | — | Same, for analysis surfaces |

---

## Empty / loading / error

| Component | File | Purpose | Visual role |
|---|---|---|---|
| **EmptyState** | `ui/EmptyState.tsx` | "Nothing here yet" | sm/md sizes, title + description |
| **ErrorState** | `ui/ErrorState.tsx` | "This failed" | fullPage or inline |
| **LoadingState** | `ui/LoadingState.tsx` | Skeletons (`Skeleton`) | Shimmer placeholders |

> These three are deliberately distinct. `unavailable` (source failed), `empty` (source answered with nothing) and `idle` (engine hasn't computed it yet) never collapse into one another.

---

## Controls

| Component | File | Purpose |
|---|---|---|
| **MutationButton** | `execution/MutationButton.tsx` | Confirm-gated engine mutation, write-gate aware |
| **WatchlistButton** | `shared/WatchlistButton.tsx` | Star toggle, persists to preferences |
| **MarketFilterBar** | `markets/MarketFilterBar.tsx` | Duration filters (All / 5m / 15m) + grid/table toggle |
| **Tooltip** | `ui/Tooltip.tsx` | Radix tooltip wrapper |
| **ProbexLogo** | `ui/ProbexLogo.tsx` | Brand mark | `lockup` / mark, `responsiveWordmark` |

---

## Observations on the inventory

- **Panel is doing a lot.** Title, subtitle, provenance, freshness, action slot, four states, three densities, a pulse key and a left rail. It is the most load-bearing visual primitive in the product.
- **Two chart libraries coexist**: recharts (`LiveChart`, most surfaces) and lightweight-charts (`MarketChart`, market detail only).
- **Three "nothing to show" families** — `EmptyState`, `AwaitingValue`/`AwaitingBackend`, `PanelPending` — with overlapping but deliberately distinct meanings.
- **StatCard and Panel overlap.** Both render a labelled figure with provenance; the split between them is historical rather than semantic.
