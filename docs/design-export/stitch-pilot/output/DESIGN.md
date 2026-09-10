---
name: Obsidian Cockpit Precision
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#bdc2ff'
  on-secondary: '#131e8c'
  secondary-container: '#2f3aa3'
  on-secondary-container: '#a8afff'
  tertiary: '#4ee6aa'
  on-tertiary: '#003825'
  tertiary-container: '#22c990'
  on-tertiary-container: '#004e35'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#e0e0ff'
  secondary-fixed-dim: '#bdc2ff'
  on-secondary-fixed: '#000767'
  on-secondary-fixed-variant: '#2f3aa3'
  tertiary-fixed: '#68fcbf'
  tertiary-fixed-dim: '#45dfa4'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
  market-yes: '#00F2FE'
  market-no: '#C084FC'
  status-live: '#10B981'
  status-stale: '#F59E0B'
  status-degraded: '#FB923C'
  status-offline: '#F43F5E'
  status-synthetic: '#818CF8'
  bg-base: '#03050D'
  bg-surface-lowest: '#060A14'
  bg-surface: '#0C1424'
  bg-surface-raised: '#121D33'
  bg-surface-overlay: '#182744'
  text-primary: '#F1F5F9'
  text-secondary: '#94A3B8'
  text-muted: '#64748B'
  text-disabled: '#334155'
  border-hairline: rgba(255, 255, 255, 0.07)
  border-subtle: rgba(255, 255, 255, 0.12)
  border-interactive: rgba(255, 255, 255, 0.20)
  border-focus: '#38BDF8'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.03em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-panel:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.01em
  headline-sub:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.005em
  metric-xl:
    fontFamily: JetBrains Mono
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  metric-md:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  metric-sm:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0em
  body-default:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-compact:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.06em
  metadata-code:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  density-dense-y: 0.375rem
  density-dense-x: 0.625rem
  density-standard-y: 0.75rem
  density-standard-x: 1rem
  density-focal-y: 1.25rem
  density-focal-x: 1.5rem
  layout-header-height: 3.25rem
  layout-sidebar-expanded: 13.5rem
  layout-sidebar-collapsed: 3.5rem
  gap-cockpit-grid: 0.75rem
  gutter-canvas: 1rem
---

## Brand & Style

This design system establishes an autonomous financial intelligence workstation engineered for prediction markets, algorithmic edge detection, and high-frequency trading diagnostics. The visual philosophy balances extreme data density with institutional calm, deliberate restraint, and surgical clarity.

### Personality & Emotional Response
- **Authoritative & Institutional:** Operates like high-tier avionics or an institutional terminal. It never uses frivolous decoration, noisy gamification, or consumer-grade candy gradients.
- **Surgical Precision:** Every pixel, hairline separator, and numeric tabular digit communicates certainty. Information is treated with mission-critical reverence.
- **Restrained Liveness:** Motion and chromatic highlights are rationed tools. Surfaces are deep, calm obsidian planes that allow anomalies, market shifts, and risk degradation to emerge without cognitive fatigue.

### Movement & Visual Form
The style fuses **Modern High-Density Cockpit UI** with **Precision Milled-Metal Depth**:
- **Tonal Obsidian Geometry:** Layered deep oceanic voids (`#03050D`, `#070C18`, `#0C1424`) replace flat grey canvases.
- **Milled Top-Edge Highlights:** Instead of aggressive elevation drops or flat wireframes, structural containers carry subtle top-edge hairline highlights (`rgba(255, 255, 255, 0.08)`) simulating chamfered hardware instrument panels.
- **Disaggregated Semantic Chromatics:** System brand identity, market position sides (YES/NO), telemetry health, and engine consensus are assigned distinct, non-overlapping spectral bands.

## Colors

### Disaggregation Architecture
This design system resolves chromatic collisions in the core UI:
1. **Brand Control vs. Market Side (YES):** 
   - `--probex-primary` is anchored to **Electric Sky (`#38BDF8`)** for interface focal actions, active nav states, and focus rings.
   - Prediction market **YES** outcomes are assigned **High-Frequency Aqua (`#00F2FE`)**.
   - Prediction market **NO** outcomes are assigned **Orchid Purple (`#C084FC`)**.
   Brand interactive controls and market outcome bets are never chromatically identical.

2. **Telemetry & System Status Spectrum:**
   - `status-live`: `#10B981` (Emerald). Indicates real-time, active socket connectivity.
   - `status-stale`: `#F59E0B` (Amber). Signifies delayed heartbeat or lagged market data without socket fault.
   - `status-degraded`: `#FB923C` (Orange). Probe failure, high latency threshold breach, or memory cap warnings.
   - `status-offline`: `#F43F5E` (Crimson). Disconnected backend or dead worker thread.
   - `status-synthetic`: `#818CF8` (Indigo). Simulated paper-mode, backtesting, or interpolated feeds.

3. **Surface Stratification:**
   Deep multi-tier dark mode avoids flat grey washouts:
   - Base canvas: `#03050D`
   - Recessed/Trough background: `#060A14`
   - Resting Panel Surface: `#0C1424`
   - Active/Hover Panel Surface: `#121D33`
   - Floating Modals/Popovers: `#182744`

## Typography

Typography balances rapid scanning with dense metric comprehension.

### Typeface Roles
- **Primary Interface (`Geist`):** Delivers clean optical kerning, neutral geometry, and superior rendering across OS platforms. Used for structural hierarchy, operational labels, and continuous prose.
- **Telemetry & Numerical Data (`JetBrains Mono`):** Applied to all market prices, probabilities, edge percentages, memory allocations, and timestamps. Strict tabular spacing (`tabular-nums`) ensures columns remain anchored during high-frequency data streams.

### Readability Floor
- **Elimination of 10px type debt:** Sub-11px typography is banned. All provenance badges, timestamps, circuit states, and metadata tags are anchored at a minimum floor of **11px** with high-legibility uppercase tracking (`0.06em`) or strict 12px monospace figures.
- **Distinction between secondary text and disabled states:** Secondary text operates at `rgba(241, 245, 249, 0.70)` (`#94A3B8`), while disabled/offline text sits at `rgba(241, 245, 249, 0.35)` (`#334155`), preventing visual ambiguity between unselected and dead feeds.

## Layout & Spacing

The workstation layout operates on an uncompromising 4px/8px modular telemetry grid engineered for zero wasted space and complete screen utilization.

### Grid & Density Modes
1. **Instrument Layout:** The main view is a multi-tier CSS Grid cockpit utilizing fluid columns with rigid row anchors:
   - **Primary Overview Anchor:** Top-tier primary telemetry is structured in an explicit 4-column balanced card rail at desktop resolutions (`minmax(240px, 1fr)`).
   - **Focal Chart Grid:** Two-thirds chart stage with a persistent one-third Engine Focus telemetry panel.
2. **Density Standards:**
   - **Dense (System, Logs, Orderbook):** `6px` vertical padding, `10px` horizontal padding. Compact line heights minimize vertical scrolling.
   - **Standard (Market Rows, Position Grids):** `12px` vertical padding, `16px` horizontal padding.
   - **Focal (Overview Cards, Primary Gauges):** `20px` internal padding with structured gutters.

### Adaptive Breakpoint Behavior
- **Desktop (1440px+):** Full 13.5rem (216px) fixed navigation rail, 4-up instrument panels, persistent status telemetry bar.
- **Compact Desktop / Tablet Landscape (1024px – 1439px):** Sidebar automatically collapses to 3.5rem (56px) icon-only mode with floating tooltips. Primary instrument grid scales to 2x2.
- **Tablet Portrait (768px – 1023px):** Header moves secondary diagnostics behind a drilldown drawer. Market charts switch to simplified interval buckets.
- **Mobile (375px – 767px):** Single-column stacked deck. Ticker header condenses to BTC price and high-level health pill. Horizontal table containers expose subtle gradient fade rails indicating overflow swipeability.

## Elevation & Depth

This system avoids floating drop shadows and blur gimmicks, adopting **Milled-Panel Inset Elevation**. Every surface tier is defined by its background luminance and a micro-fine inset specular top highlight.

### Elevation Hierarchy
- **Level 0 (App Canvas `#03050D`):** The structural bedrock. Ground level for viewport framing.
- **Level 1 (Recessed Wells & Trays `#060A14`):** Inset containers, table body scroll areas, and input wells. Framed by a subtle inset shadow: `inset 0 1px 2px rgba(0, 0, 0, 0.6)`.
- **Level 2 (Standard Instrument Panel `#0C1424`):** Primary panel containers. Defined by a 1px border (`rgba(255, 255, 255, 0.07)`) and a crisp top highlight: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.4)`.
- **Level 3 (Focal Attention Panels & Hovered Rows `#121D33`):** Critical alerts, active modals, and hovered table records. Features a distinct top rim: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.16), 0 8px 24px rgba(0, 0, 0, 0.6)`.
- **Level 4 (Floating Cockpit Overlays & Palettes `#182744`):** Command palette, context menus, and precision inspectors. Framed with high-contrast perimeter hairline: `border: 1px solid rgba(255, 255, 255, 0.18)` plus backdrop filter `blur(12px)`.

### Left-Rail Status Accents
Panels communicate runtime engine condition via an integrated 2px left border rail:
- **Nominal / Live:** Subtle resting state (no rail or low-contrast brand tone).
- **Attention / Degraded:** Continuous 2px `status-degraded` (`#FB923C`) rail.
- **Critical / Fault:** Continuous 2px `status-offline` (`#F43F5E`) rail.

## Shapes

The interface embraces a tight, industrial **Soft/Chiseled Geometry** (`roundedness: 1`). Soft 4px to 6px radii reinforce mechanical density and maximize internal data real estate.

### Corner Radius Standards
- **Sub-components & Badges (`4px` / `rounded-sm`):** Status chips, market outcome pills, input boxes, buttons, and inline tags.
- **Panels & Cockpit Cards (`6px` / `rounded-md`):** Main instrument frames, chart containers, table shells.
- **Modals & Overlays (`8px` / `rounded-lg`):** Command palette, slide-out diagnostic logs, and confirmation sheets.
- **Pill Shapes (`9999px`):** Reserved exclusively for live binary telemetry status indicators (e.g. system heartbeat dot containers).

## Components

### Buttons & Interactive Controls
- **Primary Engine Button:** High-density fill with `primary_color_hex` (`#38BDF8`), text set in dark contrast (`#03050D`) at `12px font-weight: 600`. Hover state triggers brightness increase without scale bounce.
- **Secondary / Surface Button:** Background `#121D33`, hairline border `rgba(255, 255, 255, 0.12)`, inset top highlight `rgba(255, 255, 255, 0.06)`. Hover transitions border to `rgba(255, 255, 255, 0.24)`.
- **Destructive / Override Button:** `#F43F5E` muted background with high-contrast crimson text and border.

### Telemetry Badges & Chips
- **Provenance Badges:** Height 22px, padding `0 8px`, border-radius 4px. Set in `JetBrains Mono` 11px uppercase with `0.06em` letter spacing. Displays concise semantic origin labels (e.g., `DERIVED`, `LIVE TICK`, `ORACLE SYNTH`) instead of raw `/api/...` endpoints. Technical endpoints are isolated to interactive tooltips or System logs.
- **Outcome Chips (YES / NO):** 
  - `YES`: Surface tinted `rgba(0, 242, 254, 0.12)`, text `#00F2FE`, border `rgba(0, 242, 254, 0.28)`.
  - `NO`: Surface tinted `rgba(192, 132, 252, 0.12)`, text `#C084FC`, border `rgba(192, 132, 252, 0.28)`.

### Instrument Panels & Data Cards
- Panels consist of an explicit 36px header zone: title set in `headline-panel`, right-aligned provenance badge, and optional freshness indicator.
- Internal padding matches density tokens (`density-standard` or `density-dense`).
- Milled top-highlight is applied consistently across all card containers.

### Data Tables & Monospace Grids
- **Header (`Thead`):** Surface `#060A14`, text `label-caps` (`#64748B`), 1px hairline bottom border.
- **Rows (`Tr`):** Resting transparent, alternating row striping forbidden. Hover state applies `#121D33` with immediate 0ms transition.
- **Cells (`Td`):** Numeric figures use `JetBrains Mono` with `.tabular-nums` aligned strictly to the right. Text labels align left.

### Form Inputs & Filters
- Background `#060A14`, border `1px solid rgba(255, 255, 255, 0.10)`. Focus transitions border to `#38BDF8` with a non-blurring `0 0 0 1px #38BDF8` ring. Height fixed at 32px for compact workstation workflows.

### System Diagnostics Cockpit
- Multi-probe component monitors group snake_case endpoints into human-operable clusters: Core Execution, Oracle Feeds, Risk Engine.
- Diagnostic logs feature inline copy buttons, memory metrics with physical unit bounds, and explicit circuit states (`CLOSED`, `HALF-OPEN`, `TRIPPED`).