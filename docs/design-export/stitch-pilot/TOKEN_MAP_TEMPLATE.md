# PROBEX — Token Mapping Worksheet

**Left side extracted from `src/styles/probex-tokens.css` on 2026-09-08. Right side blank until Stitch output exists.**

The point of this file is that when Stitch returns a palette of literal hex values, mapping is **mechanical rather than interpretive**. Every proposed colour lands in one of three buckets:

1. **Maps to an existing token** → change the token's value, or change nothing. Cheapest possible outcome.
2. **Maps to a token that exists but is currently wrong** → a real fix (there are already two of these; see §4).
3. **Has no home** → a genuinely new token. Every one of these costs six theme definitions, so each must justify itself.

---

## 0 · The architecture a mapping must respect

`probex-tokens.css` declares three layers, and the file says so explicitly:

```
1. Brand primitives   --brand-*     never referenced directly in components
2. Semantic tokens    --probex-*    what components consume
3. Component tokens   --probex-*    scoped to one component (sidebar, chart, scrollbar)
```

Themes are applied as `[data-theme="<name>"]` on `<html>`. **Six themes** redefine the semantic layer: `aurora` (default), `midnight`, `quantum`, `emerald`, `institutional`, `ember`.

**The consequence that governs everything here:** a hex value pasted into a component bypasses all six themes at once and fails silently, because only `aurora` is exercised in normal use. This is why proposed colours must be mapped, never pasted.

---

## 1 · Surfaces

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-bg` | `#03050D` | App background, deepest layer | | |
| `--probex-surface` | `#0C1424` | Cards and panels — the default raised plane | | |
| `--probex-surface-2` | `#131E33` | Inset chips, table headers, nested wells | | |
| `--probex-surface-3` | `#1B2842` | Highest inset — hover states, active rows | | |
| `--probex-sidebar-bg` | `#0B1120` | Sidebar plate (component token) | | |

> The ladder is deliberately uneven — the `bg → surface` jump is the largest, because that is the step the eye uses to identify "this is a card". A redesign that evens out the ladder will make cards dissolve into the page again; the token file records that this exact regression was already fixed once.

## 2 · Brand & accent

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-primary` | `#00D4FF` | Brand accent, focus ring, primary control | | |
| `--probex-secondary` | `#6D5EF7` | Secondary accent | | |
| `--probex-primary-dim` | `rgba(0,212,255,0.12)` | Primary wash | | |
| `--probex-secondary-dim` | `rgba(109,94,247,0.12)` | Secondary wash | | |
| `--probex-gradient-brand` | `linear-gradient(135deg,#00D4FF,#6D5EF7)` | Logo and primary CTA only | | |

## 3 · Text ramp

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-text-primary` | `#E8EEFF` | Figures, titles | | |
| `--probex-text-secondary` | `rgba(232,238,255,0.72)` | Supporting copy | | |
| `--probex-text-muted` | `rgba(232,238,255,0.62)` | `.t-label`, `.t-description` — **real reading text, not decorative** | | |
| `--probex-text-disabled` | `rgba(232,238,255,0.50)` | Unavailable | | |

> Four tiers, each ~0.7× the alpha above it, all derived from one base so contrast tracks the surface beneath. `muted` and `disabled` are 0.62 vs 0.50 — close enough that "de-emphasised" and "unavailable" can read alike (visual debt #37). **If Stitch widens this gap, that is a fix worth taking.**

## 4 · Trading sides — *the known collision*

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-yes` | `#00D4FF` | YES side of a binary market | | |
| `--probex-yes-dim` | `rgba(0,212,255,0.10)` | YES wash | | |
| `--probex-yes-border` | `rgba(0,212,255,0.25)` | YES edge | | |
| `--probex-no` | `#8B5CF6` | NO side | | |
| `--probex-no-dim` | `rgba(139,92,246,0.10)` | NO wash | | |
| `--probex-no-border` | `rgba(139,92,246,0.25)` | NO edge | | |

> **`--probex-yes` and `--probex-primary` are the same cyan.** A YES position, a focus ring and a brand control are chromatically identical. This is bucket 2 — the token exists and is wrong. If Stitch separates them, take it. If Stitch *also* collides them, that is evidence it inferred the palette from the screenshot instead of reading the tokens document.

## 5 · Financial & status semantics

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-positive` | `#10B981` | Gain, healthy | | |
| `--probex-positive-dim` | `rgba(16,185,129,0.12)` | | | |
| `--probex-negative` | `#F87171` | Loss, danger | | |
| `--probex-negative-dim` | `rgba(239,68,68,0.10)` | | | |
| `--probex-negative-strong` | `#C81E1E` | High-contrast negative (ink under white) | | |
| `--probex-warning` | `#F59E0B` | Degraded, stale, attention | | |
| `--probex-warning-dim` | `rgba(245,158,11,0.10)` | | | |
| `--probex-consensus-high` | `#10B981` | Consensus banding | | |
| `--probex-consensus-med` | `#F59E0B` | | | |
| `--probex-consensus-low` | `#EF4444` | | | |

> Note `--probex-negative` (`#F87171`) and `--probex-consensus-low` (`#EF4444`) are different reds serving different jobs. Any proposal that unifies them must say what happens to consensus banding.
>
> **There is no dedicated token for OFFLINE, SYNTHETIC or STALE.** Those states are currently carried by `ProvenanceBadge` variants composed from `warning` / `muted` / `border` plus a required word. If Stitch proposes distinct colours for them, that is bucket 3 — new tokens, and probably justified ones.

## 6 · Borders, state, elevation

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-border` | `rgba(255,255,255,0.10)` | Default hairline | | |
| `--probex-border-default` | `rgba(255,255,255,0.14)` | Interactive resting | | |
| `--probex-border-strong` | `rgba(255,255,255,0.22)` | Emphasis | | |
| `--probex-border-active` | `rgba(0,212,255,0.40)` | Focus / active, brand-tinted | | |
| `--probex-state-hover` | `rgba(255,255,255,0.04)` | Hover wash | | |
| `--probex-state-active` | `rgba(255,255,255,0.07)` | Active wash | | |
| `--probex-state-selected` | `color-mix(primary 12%)` | Selected | | |
| `--probex-elev-1` … `-4` | composite | Canonical elevation: drop shadow **+ inset top highlight** | | |
| `--probex-shadow-sm` / `-lift` | `0 1px 2px` / `0 8px 24px` | Tokenised legacy shadows | | |

> Elevation pairs a drop shadow with an inset top highlight so surfaces read as milled metal rather than blurred cards. A proposal that replaces `elev-*` with plain drop shadows is a **downgrade** even if it looks cleaner in isolation. Separately, `shadow-surface` / `shadow-surface-lg` in the Tailwind config are a second, competing vocabulary (visual debt #7) — a redesign is the right moment to retire one.

## 7 · Charts

| Existing token | aurora value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--probex-chart-primary` | `#00D4FF` | Series 1 | | |
| `--probex-chart-secondary` | `#6D5EF7` | Series 2 | | |
| `--probex-chart-tertiary` | `#10B981` | Series 3 | | |
| `--probex-chart-grid` | `rgba(255,255,255,0.05)` | Gridlines | | |
| `--probex-chart-axis` | `rgba(255,255,255,0.20)` | Axis | | |

> Only three series colours exist. If a proposed chart treatment needs a fourth, that is a new token — and worth checking against the two-chart-library problem (recharts everywhere, lightweight-charts on market detail), whose axes and gridlines already do not match.

## 8 · Typography — the scale that must survive

| Key | Size | Line height | Stitch proposed | Verdict |
|---|---|---|---|---|
| `2xs` | 10px | 16px | | |
| `xs` | 12px | 16px | | |
| `sm` | 13px | 20px | | |
| `base` | **14px** | 24px | | |
| `md` | 15px | 24px | | |
| `lg` | 16px | 24px | | |
| `xl` → `6xl` | 18px → 48px | — | | |

Semantic classes that compose the scale: `.t-page-title` · `.t-page-subtitle` · `.t-section-title` · `.t-card-title` · `.t-label` · `.t-value` · `.t-metric` / `-sm` / `-lg` · `.t-unit` · `.t-helper` · `.t-metadata` · `.t-description`.

> **No webfont is loaded.** Both families are platform stacks; `globals.css` records that Inter and JetBrains Mono were removed because they resolved only to fallbacks. Every screenshot in the export is the **Windows** rendering. If Stitch proposes a typeface, adopting it is a real decision with a real cost — record it as a risk, not a token.

## 9 · Motion

| Existing token | Value | Role | Stitch proposed | Verdict |
|---|---|---|---|---|
| `--motion-ease` | `cubic-bezier(0.22,1,0.36,1)` | The house settle curve | | |
| `--motion-fast` | 150ms | Hover, colour, small transforms | | |
| `--motion-med` | 240ms | Component transitions | | |
| `--motion-shell` | 220ms | Sidebar collapse | | |
| `--motion-ring` | 620ms | Value-change pulse | | |
| `--motion-pulse` | 2s | Live dot breath (symmetric easing) | | |
| `--motion-ambient` | 9s | Ambient drift | | |

> Motion is rationed on purpose: the `ProvenanceBadge` LIVE dot deliberately does **not** pulse, so six to eight panels don't breathe at once. `data-reduce-motion` disables everything. A proposal that animates every live surface is a regression against a decision already made deliberately.

---

## 10 · Known token gaps — found while preparing this worksheet

These are real findings from the current codebase, independent of anything Stitch produces.

| # | Gap | Evidence | Consequence for a redesign |
|---|---|---|---|
| G-1 | **No "ink on accent" token.** Text placed on a filled YES/NO chip is hardcoded `#050816` or `#fff`. | `PortfolioAllocation.tsx:127`, `PositionDetail.tsx:38`, `SettledPositions.tsx:94` | Any redesign that recolours YES/NO breaks contrast on three surfaces at once. Needs `--probex-on-accent` (or a pair) before recolouring. |
| G-2 | **`#050816` is a stale literal.** It was the aurora background before the refinement pass; `--probex-bg` is now `#03050D`. | same three sites | Already a latent inconsistency. Fix it as part of G-1, not separately. |
| G-3 | No tokens for OFFLINE / SYNTHETIC / STALE as such. | `ProvenanceBadge.tsx` composes them | If Stitch gives these distinct colours, they are legitimately new tokens — but each costs six theme definitions. |
| G-4 | Two shadow vocabularies coexist. | `shadow-surface*` in `tailwind.config.ts` vs `--probex-elev-1…4` | Retire one during implementation; do not add a third. |

**Codebase readiness (measured, not estimated):**

- **0** arbitrary Tailwind colour values (`[#...]`) in `src/components` and `src/app`
- **0** raw Tailwind palette classes (`bg-slate-800`, `text-green-500`, …)
- **34** hex literals total across 10 files — and on inspection, all but the three in G-1 are legitimate: `MarketChart.tsx` uses the correct `v('--probex-*', fallback)` pattern because lightweight-charts requires literals; `global-error.tsx` renders outside the React tree where CSS variables are unavailable; `AppearanceSettings.tsx` shows theme swatches; `manifest.ts` and `layout.tsx` set browser chrome colour.

**This is an unusually clean starting position.** Re-theming PROBEX is close to a pure token-layer operation. That is the single strongest argument for insisting the reconciliation step happens before any component is touched — the cost of doing it properly is low, and the cost of pasting hex is six broken themes.
