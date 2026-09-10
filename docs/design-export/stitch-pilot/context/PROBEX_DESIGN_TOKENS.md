# PROBEX — Design Tokens (Current Implementation)

**Captured:** 2026-09-08, post Stage-A closeout
**Sources:** `tailwind.config.ts`, `src/styles/probex-tokens.css`, `src/app/globals.css`

Every value below was **extracted from the repository**, not authored for this document. Where the implementation is inconsistent, that is recorded under *Known Design Debt* rather than smoothed over.

---

## 1 · Theming architecture

Tokens are CSS custom properties on `:root`, overridden by `[data-theme="<name>"]` on `<html>`. Tailwind's colour scale points at those variables rather than at literals, so a theme swap needs no class changes.

**Six themes ship:** `aurora` (default), `midnight`, `quantum`, `emerald`, `institutional`, `ember`.

Theme choice persists to `localStorage` (`probex-theme`) **and** a cookie of the same name, so the server can resolve it during SSR and avoid a flash. A blocking inline script in `<head>` reads it before first paint.

Three accessibility preference flags also live on `:root`: `data-reduce-motion`, `data-text-size` (`sm` 93.75% / `md` 100% / `lg` 112.5%), `data-high-contrast`, plus `data-underline-links` and `data-liveness="inert"`.

---

## 2 · Colour

### Surfaces — `aurora` (default)

| Token | Value | Role |
|---|---|---|
| `--probex-bg` | `#03050D` | App background, deepest layer |
| `--probex-surface` | `#0C1424` | Cards, panels — the default raised plane |
| `--probex-surface-2` | `#131E33` | Inset chips, table headers, nested wells |
| `--probex-surface-3` | `#1B2842` | Highest inset (hover states, active rows) |

A four-step ladder: background → surface → inset → highest inset. Every theme redefines all four.

### Brand

| Token | aurora | midnight |
|---|---|---|
| `--probex-primary` | `#00D4FF` (cyan) | `#3B82F6` (blue) |
| `--probex-secondary` | `#6D5EF7` (violet) | `#4F46E5` |

### Semantic

| Token | Value | Meaning |
|---|---|---|
| `--probex-yes` | `#00D4FF` | YES side of a binary market |
| `--probex-no` | `#8B5CF6` | NO side |
| `--probex-positive` | `#10B981` | Gain / healthy |
| `--probex-negative` | `#F87171` | Loss / danger |
| `--probex-warning` | `#F59E0B` | Degraded, stale, attention |
| `--probex-consensus-high/med/low` | — | Consensus strength banding |

> **Note the collision:** `--probex-yes` and `--probex-primary` are the *same* cyan in the default theme. A YES position and a brand-accented control are chromatically identical.

### Text

| Token | Value |
|---|---|
| `--probex-text-primary` | `#E8EEFF` |
| `--probex-text-secondary` | `rgba(232,238,255,0.72)` |
| `--probex-text-muted` | `rgba(232,238,255,0.62)` |
| `--probex-text-disabled` | `rgba(232,238,255,0.50)` |

Four steps, all alpha-derived from one base — so contrast tracks the surface beneath.

### Borders

| Token | Value | Role |
|---|---|---|
| `--probex-border` | `rgba(255,255,255,0.10)` | Default hairline |
| `--probex-border-default` | `rgba(255,255,255,0.14)` | Interactive resting |
| `--probex-border-strong` | `rgba(255,255,255,0.22)` | Emphasis |
| `--probex-border-active` | `rgba(0,212,255,0.40)` | Focus / active, brand-tinted |

---

## 3 · Typography

**No webfont is loaded.** Both families are platform stacks resolved from CSS variables:

```
--font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable Text",
             "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif
--font-mono: ui-monospace, SFMono-Regular, "SF Mono", "Cascadia Mono", "Segoe UI Mono",
             "Roboto Mono", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace
```

A comment in `globals.css` records that Inter and JetBrains Mono were previously pulled through `next/font` but resolved only to their fallbacks, so they were removed. **The design tools should not assume Inter.**

### Scale (`tailwind.config.ts`)

| Key | Size | Line height |
|---|---|---|
| `2xs` | 0.625rem / 10px | 1rem |
| `xs` | 0.75rem / 12px | 1rem |
| `sm` | 0.8125rem / 13px | 1.25rem |
| `base` | 0.875rem / **14px** | 1.5rem |
| `md` | 0.9375rem / 15px | 1.5rem |
| `lg` | 1rem / 16px | 1.5rem |
| `xl` → `6xl` | 1.125rem → 3rem | — |

Base is **14px**, not 16px — a density decision typical of trading interfaces.

### Semantic type utilities (`globals.css`)

The product composes text through named classes rather than ad-hoc sizes:

`.t-page-title` · `.t-page-subtitle` · `.t-section-title` · `.t-card-title` · `.t-label` · `.t-value` · `.t-metric` · `.t-metric-sm` · `.t-metric-lg` · `.t-unit` · `.t-helper` · `.t-metadata` · `.t-description`

`.t-metric*` carries `tabular-nums`; numeric columns use `tabular-nums` throughout so digits align.

---

## 4 · Spacing & layout

Tailwind's default scale plus named layout constants:

| Token | Value |
|---|---|
| `sidebar-expanded` | `200px` |
| `sidebar-collapsed` | `52px` |
| `topnav-height` | `52px` |
| custom steps | `4.5` (1.125rem), `13` (3.25rem), `15` (3.75rem), `18` (4.5rem) |

**Panel density** is a first-class prop, not ad-hoc padding: `standard` 16px · `dense` 12px · `focal` 20px.

### Breakpoints

| Name | Width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1440px |
| `3xl` | 1920px |
| `4xl` | 2560px |

> There is **no `xs` screen breakpoint.** The `xs` keys in the config are the *fontSize* and *borderRadius* scales. A `xs:` variant class silently does nothing.

---

## 5 · Radius

| Key | Value |
|---|---|
| `sm` | 4px |
| `DEFAULT` | 6px |
| `md` | 8px |
| `lg` | 10px |
| `xl` | 12px |
| `2xl` | 16px |
| `3xl` | 20px |

---

## 6 · Elevation & shadow

The `elev-*` scale is the canonical vocabulary. Each pairs a drop shadow with an **inset top highlight**, so surfaces read as milled metal rather than blurred cards.

| Token | Use |
|---|---|
| `--probex-elev-1` … `--probex-elev-4` | Canonical ladder |
| `shadow-surface` | `0 1px 3px rgba(0,0,0,0.4)` + 1px ring |
| `shadow-surface-lg` | `0 4px 24px rgba(0,0,0,0.5)` + 1px ring |

`backdropBlur`: `xs` 2px · `sm` 4px · `DEFAULT` 8px · `md` 12px · `lg` 16px.

---

## 7 · Z-index

A named scale; the shell consumes tokens rather than literals.

`backdrop` 30 · `sidebar` 40 · `topnav` 50 · `modal` 60 · `toast` 70 · `tooltip` 80 · `skiplink` 90

---

## 8 · Motion

| Token | Value | Role |
|---|---|---|
| `--motion-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | Soft settle — the house curve |
| `--motion-fast` | 150ms | Hover, colour, small transforms |
| `--motion-med` | 240ms | Component transitions |
| `--motion-shell` | 220ms | Sidebar collapse/expand |
| `--motion-ring` | 620ms | Value-change pulse ring |
| `--motion-pulse` | 2s | Live dot breath (symmetric easing, not the settle curve) |
| `--motion-ambient` | 9s | Ambient background drift |

Only two Tailwind animations survive — `fade-in-up` (entrance) and `brand-pulse` (splash). Dead keyframes were deliberately removed. `:root[data-reduce-motion]` disables all animation and transition.

**Motion is rationed by design:** the `ProvenanceBadge` LIVE dot deliberately does **not** pulse — a single top-bar indicator carries system liveness so six to eight panels don't breathe at once.

---

## 9 · Component conventions

| Element | Convention |
|---|---|
| **Card** | `--probex-surface`, 1px `--probex-border`, radius `lg` |
| **Panel** | Card + header (title, optional subtitle, provenance badge, freshness, action slot); `state` prop drives a left rail: `live` / `idle` / `attention` / `unavailable` |
| **StatusChip** | Pill, `2xs` uppercase, tone: `positive`/`warning`/`danger`/`info`/`neutral`; optional live dot |
| **ProvenanceBadge** | `2xs` uppercase + dot: Live / Derived / Not yet / Awaiting / **Stale** / Synthetic / No feed |
| **Buttons** | `.btn-primary` (brand gradient), `.btn-secondary` (surface + border) |
| **Tables** | `DataTable` primitives only (`TableShell`/`Thead`/`Th`/`Tr`/`Td`); a parallel table-CSS system was removed |
| **Focus** | `.focus-ring:focus-visible` → `2px solid var(--probex-primary)`, `outline-offset: 2px` |

### Chart styling

Charts are **recharts** wrapped in `ChartFrame`, which owns the six states — `loading` / `live` / `stale` / `idle` / `empty` / `unavailable` — and renders each differently. `unavailable` is never drawn as empty: "the source failed" and "the source answered with nothing" are distinct.

- Series colour comes from theme tokens, defaulting to `--probex-primary`
- `isAnimationActive={false}` throughout — a live series must not animate on every poll
- Windowed to the most recent 40 points by default
- Every plot is wrapped in `role="img"` with a **required** `aria-label` summary
- A `StaleStrip` renders over the plot when the slice is stale

---

## KNOWN DESIGN DEBT

Observations only — no changes recommended here.

1. **`--probex-yes` and `--probex-primary` are the same cyan** in the default theme. A YES position, a brand control and a focus ring are chromatically indistinguishable.
2. **No `xs` screen breakpoint** exists, but `xs` *does* exist in the fontSize and radius scales. This has already produced one live bug (`hidden xs:inline` would have hidden a label at every width).
3. **Two overlapping shadow vocabularies** — `shadow-surface` / `shadow-surface-lg` alongside the canonical `elev-1…4`. Both are in use.
4. **Radius scale is finer than its usage** — seven steps for a product that mostly uses `lg`.
5. **Font stacks are platform-dependent.** The UI renders in Segoe UI Variable on Windows, SF on macOS, Roboto on Android. Typographic colour is not controlled, and every screenshot in this export is the *Windows* rendering.
6. **`--probex-text-muted` (0.62α) and `--probex-text-disabled` (0.50α)** are close enough that "de-emphasised" and "unavailable" can read alike.
7. **Base 14px with a 10px `2xs`** used for badges, provenance and metadata — 10px is below most readability guidance and carries meaning (endpoint paths, freshness, provenance).
8. **Six themes are maintained** but the product ships one by default; the other five are largely unexercised by testing.
