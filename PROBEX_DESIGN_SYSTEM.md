# PROBEX Design System

**Version 1.0 · 2026-07-03 · Established during M6 (Institutional Quality pass)**

> Companion to `PROBEX_PRODUCT_SPEC.md`. The spec defines *what* the product is;
> this document defines *how it looks, moves, and behaves*. All rules below are
> implemented in the codebase — nothing here is aspirational.

---

## 1. Visual Language

PROBEX is an **operator cockpit for a quantitative trading engine**. The visual
language follows from that:

- **Dense but calm.** High information density with generous internal card
  padding; the operator scans, they do not read.
- **Dark-first.** Four dark themes + one light (Institutional). Deep, desaturated
  backgrounds; color is reserved for *meaning*.
- **Color = semantics, never decoration.** Green/red/amber communicate state
  (positive/negative/warning); cyan (primary) marks the engine's own signals
  (edges, thresholds, filters). Neutral data is monochrome.
- **Truth-first rendering** (spec §6.1): missing data hides the element; empty
  data gets a designed empty state; nothing renders a fake zero.

## 2. Color System

All color flows through CSS custom properties defined per-theme in
`src/styles/probex-tokens.css`. **Components never hardcode color values** —
the M6 pass removed the last rgba literals.

### Token families

| Family | Tokens | Use |
|---|---|---|
| Surfaces | `--probex-bg`, `--probex-surface`, `--probex-surface-2`, `--probex-surface-3` | Page → card → inset → raised |
| Borders | `--probex-border`, `-default`, `-strong`, `-active` | Hairlines → interactive |
| Brand | `--probex-primary`, `--probex-secondary` (+ `-dim`) | Engine signals, active nav, links |
| Text | `--probex-text-primary`, `-secondary`, `-muted`, `-disabled` | 4-step hierarchy |
| Direction | `--probex-yes` / `--probex-no` (+ `-dim`, `-border`) | YES/NO position sides |
| Tone | `--probex-positive` / `-negative` / `-warning` (+ `-dim`, `-border`) | P&L, health, alerts |
| Charts | `--probex-chart-*` | Recharts strokes/grids |

### Derived tone borders (M6)

Border-strength tone variants are derived **once** in `globals.css` via
`color-mix` over the themed base vars, so they adapt to all five themes
automatically:

```css
--probex-positive-border: color-mix(in srgb, var(--probex-positive) 25%, transparent);
--probex-negative-border: color-mix(in srgb, var(--probex-negative) 28%, transparent);
--probex-warning-border:  color-mix(in srgb, var(--probex-warning) 30%, transparent);
```

**Rule:** a tinted panel is always `background: var(--tone-dim)` +
`border: 1px solid var(--tone-border)` + `color: var(--tone)`.

### The five themes

Probex Aurora (default, cyan/purple) · Midnight (blue on near-black) ·
Quantum (neon green) · Emerald (dark green) · Institutional (light, TradFi).
Any component that follows the token rules works in all five with no
per-theme code.

## 3. Typography

- **UI face:** Inter (variable), with `cv11/ss01/ss03` features enabled.
- **Data face:** JetBrains Mono via `font-data` where raw identifiers appear
  (error digests, endpoint paths).
- **Base size 14px.** Scale in practice:

| Class | Size | Role |
|---|---|---|
| `text-2xs` (10px) | uppercase-tracked | Card labels, chips, table headers, meta |
| `text-xs` (12px) | body | Table cells, descriptions, settings |
| `text-sm` (14px) | emphasized body | Section `h2`s (bold) |
| `text-lg`–`text-xl` | data/page titles | StatCard values (`text-2xl`), page `h1` |
| `text-3xl` | hero number | Live BTC price |

- **Every number is `tabular-nums`.** No exceptions — columns must not shimmy
  as values tick.
- Uppercase micro-labels always carry `tracking-wider` + `font-semibold` +
  muted color; they label, they never compete with data.

## 4. Spacing & Layout

- **Page container:** `page-container` (px-5 py-5, max-w 1920px) + vertical
  `flex flex-col gap-4 pb-8` on every console root.
- **Rhythm:** 4px base grid. `gap-3` (12px) between cards in a grid; `gap-4`
  (16px) between page sections; `gap-1.5`–`gap-2` inside components.
- **Cards:** `rounded-xl`, surface background, hairline border, internal
  padding from the `Card` primitive. Insets one surface step up (`surface-2`).
- **Grids:** mobile-first — `grid-cols-2 sm:grid-cols-3/4 xl:grid-cols-5/6`
  for vitals rows; `lg:grid-cols-2` for paired panels; tables scroll
  horizontally inside `TableShell` rather than crushing columns.
- **Shell:** fixed TopNavigation (engine status strip), 200px sidebar
  (52px collapsed, overlay drawer < lg), only `main` scrolls.

## 5. Motion System

Motion is **informational, minimal, and escapable**:

| Motion | Spec | Where |
|---|---|---|
| Page enter | `fade-in-up` 0.3s ease-out (6px rise) | Every console root |
| State transitions | `transition-colors duration-100` | Rows, chips, nav, buttons |
| Progress | `transition-[width] duration-500` | Target/gauge bars |
| Live pulse | `live-pulse` / `probex-pulse` keyframes | Status dots only |
| Charts | `isAnimationActive={false}` | Polling data must not re-animate |

**Reduced motion:** a global `prefers-reduced-motion` block collapses all
animation/transition durations to 0.01ms. No component needs its own check.

## 6. Interaction Principles

- **Hover reveals, never hides.** Table rows tint to `--probex-surface`;
  buttons brighten border/color. Nothing appears on hover that keyboard users
  can't reach.
- **Focus:** global `:focus-visible` outline in `--probex-primary` (+
  `.focus-ring` utility for custom controls). Skip-to-content link is first
  in the tab order.
- **Toggle semantics:** filter chips use `aria-pressed`; nav links use
  `aria-current="page"`; tabs/sections deep-link via URL hash.
- **Touch/mobile:** sidebar becomes an overlay drawer; selecting a
  destination dismisses it; status strip degrades gracefully (survival chip
  hides < sm, feed latency hides < md, price + mode always visible).

## 7. Accessibility Standards

- Landmarks: `banner` (top nav), `complementary` (nav rail), `main`
  (scroll region), one `h1` per page (PageHeader or IdentityStrip).
- Live regions: AttentionBanner `role="alert" aria-live="assertive"`;
  EngineStatusStrip `role="status"`; section swaps `aria-live="polite"`.
- Tables: real `<table>` semantics with `aria-label`, `scope="col"` headers.
- Progress bars: `role="progressbar"` + `aria-valuenow/min/max` + label.
- Decorative dots/icons: `aria-hidden="true"`; meaning is always carried by
  adjacent text, never by color alone (state chips carry words).
- Keyboard: every interactive element is a real `<button>`/`<a>`;
  Escape/hash/tab behaviors preserved; no hover-only functionality.

## 8. Component Rules

Primitives live in `components/ui/`; cockpit-shared pieces in
`components/shared/`; console-specific pieces stay in their console folder.

| Component | Rule |
|---|---|
| `Card` | The only panel container. Never hand-roll a bordered div for panel content. |
| `StatCard` | The only KPI display. Label + value (+ optional delta). `isLoading` renders a **labelled skeleton** — loading grids pass real labels so layout never shifts. |
| `PageHeader` | Every page's title block (Overview uses IdentityStrip — its identity IS the title). |
| `TableShell/Thead/Th/Tr/Td` | The only way to build a data table. Row hover built in. |
| `EdgeTable` | Renders `ParseResult<EdgeRow>` — reused by Strategy and Live Feed. |
| `EmptyState` | `size="sm"` for section-level, default for page-level. Copy must say *why* it's empty and *what makes it fill*. |
| `ErrorState` | `fullPage={false}` inline within consoles; includes the backend's own error message. |
| `PriceCard`, `TargetProgress` | Shared between Overview and Live Feed / Survival. |

**Empty/error/loading copy voice:** factual, engine-centric, forward-pointing
("Edges appear here the moment one clears the threshold"), never apologetic,
never blaming the user.

## 9. Financial Formatting Conventions

All formatting flows through `src/lib/utils.ts` + `lib/mappers/priceHistory.ts`:

| Value | Function | Example |
|---|---|---|
| Money (neutral) | `formatCurrency` | `$100.00` |
| **P&L (signed)** | `formatSignedCurrency` | `+$3.15` / `-$1.20` / `$0.00` |
| Percent (0–1) | `formatPercent` | `62%` |
| Delta (signed %) | `formatDelta` | `+2.4%` / `-1.1%` |
| BTC price | `formatBtcPrice` | `$61,462` (no decimals) |
| Price change | `formatPriceChangePct` | `+0.02%` (2dp) |
| Contract price | cents inline | `67¢ / 33¢` |
| Latency | rounded ms | `144ms` / `5,810ms` |
| Uptime | `formatUptime` | `2h 18m` |
| Kelly / multipliers | 2dp + `×` | `0.50×` |
| Unknown cell value | em-dash | `—` (never 0) |

**Sign convention:** every P&L figure is signed (`formatSignedCurrency`);
positive P&L is green, negative red, zero neutral (uncolored). Sign + color
together — color never carries the sign alone.

## 10. Data-State Contract (the four states)

Every data surface renders exactly one of:

1. **Loading** — labelled skeletons (vitals) or a one-line "waiting for
   /api/x…" note (sections with known-slow endpoints).
2. **Error** — inline `ErrorState` with the backend's message.
3. **Empty** — designed `EmptyState` explaining why and what fills it.
4. **Data** — rows/values; collection items additionally pass the
   parse-or-report guard (`ParseResult`): unrecognized items produce a
   truthful notice, never guessed fields.

This contract is what makes PROBEX feel institutional: the operator can always
tell the difference between "nothing happened", "we don't know", and "the
dashboard is broken".
