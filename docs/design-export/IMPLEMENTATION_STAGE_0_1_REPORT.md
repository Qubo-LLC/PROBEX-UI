# PROBEX — Implementation Report · Stage 0–1 (debt + token foundation)

**Date:** 2026-09-08 · **Scope:** D-3, D-1, D-2, D-4, and the design-token foundation
**Nothing committed. Nothing pushed. No packages installed. `package.json` untouched.**

Evidence: `docs/design-export/evidence/stage-0-1/`

---

## 0 · Result

| | |
|---|---|
| Typecheck | **pass** (`tsc --noEmit`, exit 0) |
| Tests | **162 passed / 13 files** — unchanged from baseline |
| Build | **pass** — 22 routes, shared JS 102 kB (unchanged) |
| Files changed | **14** (all in `src/` + `tailwind.config.ts`) |
| Arbitrary Tailwind colours | **0** (baseline held) |
| Raw Tailwind palette classes | **0** (baseline held) |
| `shadow-surface` references | **0** |
| Targeted `#050816` literals | **0** |
| Sub-11px font declarations | **0** |
| Route functionality changed | **none** |

Four contrast failures and one wrong number were fixed. Two additional defects of the same class were found during validation and are reported rather than silently absorbed.

### Files changed

```
src/styles/probex-tokens.css              tokens: on-accent/on-yes/on-no, surface steps,
                                          status colours, aurora re-value
tailwind.config.ts                        11px floor, radius collapse, token bindings,
                                          shadow-surface removal
src/app/globals.css                       --font-display seam, .btn-yes ink, .chip floor,
                                          annotations on .btn-primary / .btn-no
src/app/global-error.tsx                  stale canvas literal
src/components/ui/Panel.tsx               asymmetric density
src/components/shared/LiveChart.tsx       D-1 axis gutter + 11px ticks
src/components/shared/RadialGauge.tsx     D-2 overflow lap + tick + aria
src/components/shared/PendingChart.tsx    11px ticks, 34px gutter widened
src/components/shared/MarketChart.tsx     11px chart text
src/components/layout/SidebarItem.tsx     D-4 shadow migration
src/components/portfolio/PortfolioAllocation.tsx   D-3 ink token
src/components/positions/PositionDetail.tsx        D-3 ink token
src/components/positions/SettledPositions.tsx      D-3 ink token
src/components/settings/AppearanceSettings.tsx     11px, ACTIVE badge ink token
```

---

## 1 · D-3 — `--probex-on-accent` · **the defect was worse than logged**

The register described a missing token and a stale hex. Measuring the actual contrast found something more serious: **the hardcoded `isYes ? '#050816' : '#fff'` produced four WCAG AA failures**, because it assumes every YES is bright and every NO is dark. That is false in three dark themes, and inverted in the light theme.

| Theme / role | Ink today | Measured | Verdict |
|---|---|---|---|
| aurora / NO | white on `#8B5CF6` | **4.23:1** | fail |
| quantum / NO | white on `#0D9488` | **3.74:1** | fail |
| emerald / NO | white on `#84CC16` | **1.98:1** | **severe** |
| institutional / YES | dark on `#2563EB` | **3.86:1** | fail (light theme) |

At the 10–11px these chips are set in, 4.5:1 applies. All four fail.

**Fix — three tokens, declared per theme:** `--probex-on-accent` (primary fills), `--probex-on-yes`, `--probex-on-no`. Three tokens rather than one because a single ink cannot serve both a bright YES and a dark NO; per-theme because the correct ink flips with the accent's luminance. The component still chooses *which* chip it is drawing — it no longer chooses the *colour*.

**Verified — all 18 combinations now pass, worst 4.81:1.** Token resolution read back from the running app in all six themes:

```
aurora         yes #00f2fe  on-yes #03050d | no #c084fc  on-no #03050d | primary #38bdf8  on-accent #03050d
midnight       yes #3b82f6  on-yes #010208 | no #4f46e5  on-no #ffffff | primary #3b82f6  on-accent #010208
quantum        yes #00ff88  on-yes #020a06 | no #0d9488  on-no #020a06 | primary #00ff88  on-accent #020a06
emerald        yes #10b981  on-yes #031a10 | no #84cc16  on-no #031a10 | primary #10b981  on-accent #031a10
institutional  yes #2563eb  on-yes #ffffff | no #4f46e5  on-no #ffffff | primary #2563eb  on-accent #ffffff
ember          yes #fbbf24  on-yes #0b0705 | no #c2410c  on-no #ffffff | primary #f26419  on-accent #0b0705
```

Visually confirmed in `theme-institutional.png`: YES chips render **white on blue** where they were previously near-black on blue.

**The stale `#050816`:** removed from all three component sites, and corrected in `global-error.tsx` (which renders outside the React tree, so it keeps a literal — but now the *current* canvas colour, `#03050D`).

**Also fixed, same defect class:** `AppearanceSettings`' ACTIVE badge decided its ink with `meta.isDark ? '#000' : '#fff'` on a `--probex-primary` fill. Now `--probex-on-accent`.

**`.btn-yes`** re-pointed from `--probex-bg` to `--probex-on-yes` — same value, correct reason.

### ⚠️ Found during validation, NOT fixed — needs your decision

**`.btn-primary` sets `color: #ffffff` over `--probex-gradient-brand`. White on the cyan end (`#00D4FF`) measures 1.77:1.** That is a live WCAG failure on the product's primary call-to-action, and it is the same class of defect as the three in the register.

I did not change it. `--probex-on-accent` would give 11.50:1 / 4.45:1 across the gradient and is the correct ink, but swapping it restyles **every primary button in the product** — a visible redesign inside a batch you scoped as foundation. The approved direction replaces this gradient with a flat `--probex-primary` fill plus `--probex-on-accent` ink, which fixes it deliberately rather than as a side effect. Both the button and `--probex-gradient-brand` carry inline notes explaining why they were left.

**`.btn-no` was deliberately left with a literal white** and is annotated: it is painted with `--probex-gradient-no` (the *secondary* violet), not `--probex-no`, so the market-NO ink token does not describe it — pointing it at the token would be a 4.45/3.24 regression. The gradient/token mismatch is real and logged.

---

## 2 · D-1 — LiveChart Y-axis · **two causes, not one**

The register named `width={40}`. Reproducing it found a second, larger cause: **`margin={{ left: -16 }}`** on the same chart. 40 − 16 leaves ~24px of visible gutter, which is why labels lost their *leading* characters instead of overflowing visibly.

**Fix — derived, not a constant.** `axisGutter()` measures the widest label *this series' formatter* will actually produce, sampling the data's min/max plus three interior points and any explicit numeric `yDomain`, clamped to 40–92px. A formatter that throws is skipped rather than breaking the chart. `margin.left` is now `0`.

No single constant would have worked: the seven consumers' formatters range from `34%` to `-$1.2K` to `$142000`.

**Verified by reading the rendered tick text, not by eye.** Before/after on the same page:

| Chart | Rendered ticks now |
|---|---|
| Analytics Drawdown | `-91%` `-90%` `-89%` `-89%` `-88%` |
| Analytics Capital Growth | `$0` `$550` `$1.1K` `$1.7K` `$2.2K` |
| Analytics Kelly/edge | `0%` `25%` `50%` `75%` `100%` |
| Portfolio Value / P&L | `$0` `$550` `$1.1K` `$1.7K` `$2.2K` |
| Portfolio Rolling Win Rate | `0%` `20%` `40%` `60%` `80%` |
| Consensus Confidence Evolution | `0%` `15%` `30%` `45%` `60%` |
| Consensus History | `-0.2` `-0.2` `-0.2` `-0.1` `-0.1` |

**Eight of the ten chart instances were previously at risk** (any label needing more than ~24px). Drawdown now renders four-character negative percentages complete, including the minus sign — see `after-Analytics-0.png`.

`PendingChart` had the same defect in a narrower form (`width={34}` with a `100%` formatter); widened to 44px.

---

## 3 · D-2 — RadialGauge domain

`Math.min(1, value)` clamped silently: 100% and 150% drew the identical closed ring, and the `aria-label` reported **both as "Gauge at 100%"**.

**Fix.** The arc cannot physically exceed 270°, so the excess is drawn as a **second lap over the completed ring** in `--probex-warning` (caller-overridable via a new `overflowColor` prop), plus a **tick at the maximum** so the crossing point stays locatable. The clamp remains — it has to — but is no longer silent. The `aria-label` now reports the true value and appends *"exceeding maximum"*.

**Verified at 0 / 50 / 100 / 150** — `D-2-gauge-0-50-100-150.png` renders the before and after side by side using the component's own maths, copied verbatim so the harness cannot drift from the implementation.

| Value | Before | After |
|---|---|---|
| 0 | empty track · aria "0%" | unchanged |
| 50 | half arc · aria "50%" | unchanged |
| 100 | closed ring · aria "100%" | unchanged |
| **150** | **closed ring · aria "100%"** | **closed ring + half overflow lap + max tick · aria "150%, exceeding maximum"** |

Also confirmed against the **real live value**: Analytics currently reads `150% UTILIZED` (survival modifier 1.50×) and now renders with the amber overflow lap — see `after-Analytics-0.png`.

**Consumers checked:** `KellyUtilization`, `ConsensusScoreCard`, `EdgeStrengthGauge`, `EngineFocusHero`, `DiagnosticsPanel`. Four already clamp their input to ≤1 before passing it, so only `KellyUtilization` can exceed the maximum today — which is exactly where the bug was visible.

> **Left for you:** `KellyUtilization` colours the gauge with `utilization >= 1 ? positive : ...`, so **150% is still green**. The ring now says "past maximum" factually; whether over-allocation should also read as *good* is a domain question I should not answer. Flagged, not changed.

---

## 4 · D-4 — duplicate shadow vocabulary

One consumer: `SidebarItem`'s collapsed-rail tooltip used `shadow-surface-lg`. Migrated to `shadow-elev-3` (the canonical overlay level). `shadow-surface` / `shadow-surface-lg` removed from `tailwind.config.ts`, with a note recording why they must not return.

`shadow-surface-lg` also carried `0 0 0 1px var(--probex-border)` — a ring the element was already drawing with its own explicit border. Dropping it removes a doubled edge rather than losing one.

**Verified:** zero references remain in `src/` and `tailwind.config.ts`.

---

## 5 · Token foundation

**Surfaces.** Added `--probex-surface-lowest` (the recessed plane the ladder never had — table headers, input troughs, probe rows) and `--probex-surface-overlay` (modals, palette). `--probex-surface-raised` is introduced as a **name** for the existing `surface-2` value, not a new colour: renaming `surface-2` outright would touch 73 call sites across 48 files, which is route work.

**The five data-state colours.** `live` / `stale` / `degraded` / `offline` / `synthetic` had **no tokens at all** — `ProvenanceBadge` composed them from `positive`/`warning`/`muted`, which is why DEGRADED and STALE were the same amber. Each now has a token, in all six themes, tuned per theme against that theme's own surface:

- emerald's offline is lifted to `#FB7185` because the standard crimson measures **4.01:1** on emerald's lighter surface
- institutional takes a darkened set (`#047857`, `#B45309`, `#C2410C`, `#BE123C`, `#4338CA`) for contrast on white

Every combination measures ≥ 4.47:1. All 11 new tokens confirmed present in all 6 themes and resolving correctly in the running app.

**Aurora semantic re-value — the brand/YES collision.** `--probex-primary` and `--probex-yes` were the same cyan, so a focus ring, a brand control and a YES position were chromatically identical:

```
primary  #00D4FF -> #38BDF8    yes  #00D4FF -> #00F2FE    no  #8B5CF6 -> #C084FC
```

13 declarations moved together — base colours plus every derived `-dim`, `-border`, `border-active`, sidebar active state, `chart-primary` and `gradient-yes`. Leaving `--probex-yes-dim` at the old cyan would be the kind of half-migration that stops a token system being one.

> **Scope decision, flagged for review: applied to AURORA ONLY.** The other five themes are alternate identities with their own hues, and the approved direction defines one palette. Re-valuing midnight's primary to Electric Sky would erase midnight rather than implement anything. Extending it is a decision, not an oversight.

**Typography — the 11px floor.** `2xs` raised 10px → 11px, reaching 231 call sites. But validation by *measuring the smallest rendered font* rather than reading the config found five more sub-11px sources the token could not reach:

- `LiveChart` / `PendingChart` recharts axis ticks (inline SVG attributes) — 10px
- `MarketChart` lightweight-charts text — 10px
- `.chip` in `globals.css`, which declared its own `0.625rem` — 10px
- `AppearanceSettings` "LIGHT" tag and ACTIVE badge — **9px**

All raised. `AXIS_CHAR_PX` recalibrated 6.2 → 6.8 for the larger ticks. **Measured result: zero elements below 11px on a rendered page.**

**Density.** `Panel` moved to asymmetric padding — `dense` 6/10, `standard` 12/16, `focal` 20. Measured from the DOM: panel padding is now **12px / 16px** (was 16/16).

**Radius.** Seven declared steps collapsed onto the three in use. Keys are **kept** (removing `lg` would break 68 call sites) and re-valued: `sm` 4px, `DEFAULT`/`lg` 6px, `md`/`xl`/`2xl`/`3xl` 8px. Measured from the DOM: panel border-radius is now **6px** (was 10px).

**Elevation.** `elev-1…4` is now the only vocabulary (see D-4).

---

## 6 · Font status — **blocked, as instructed**

I checked before doing anything: **no font binaries exist anywhere in the repository** (`*.woff2`, `*.woff`, `*.ttf`, `*.otf` — zero results), and the `geist` package is not installed. Per your condition I stopped the font portion and installed nothing.

**Required to complete Q-1** — self-hosted, `next/font/local`, never `fonts.googleapis.com`:

| Family | Weights | Files |
|---|---|---|
| **Geist** | 400, 500, 600, 700 | 4 × `.woff2` (latin subset sufficient) |
| **JetBrains Mono** | 400, 500, 600 | 3 × `.woff2` |

Suggested location `src/assets/fonts/`. Both are OFL-licensed and can be vendored directly; Geist also ships in the `geist` npm package if you would rather take the dependency.

**What I did instead, so the swap is one line later:** declared `--font-display` in `globals.css`, aliasing the sans stack today. When the binaries land, that single declaration changes. All other token work proceeded, as instructed.

---

## 7 · Validation

| # | Check | Result |
|---|---|---|
| 1 | Typecheck | pass, exit 0 |
| 2 | Build | pass, 22 routes, shared JS 102 kB unchanged |
| 3 | Tests | 162/162, 13 files — unchanged |
| 4 | Six themes | all render; tokens resolve correctly in each (read from the running app) |
| 5 | D-1 across consumers | all 10 chart instances; tick text read from the DOM |
| 6 | D-2 at 0/50/100/150 | four distinguishable renderings + truthful aria |
| 7 | Targeted accent literals | 0 |
| 8 | `shadow-surface` | 0 |
| 9 | Arbitrary colours / palette classes | 0 / 0 |
| 10 | Reduced motion | **both gates verified** |
| 11 | Data-state semantics | unchanged — no provenance/freshness code touched |
| 12 | Route functionality | unchanged — no logic, data or contract edits |

**On check 10:** my first probe reported 795 elements still transitioning under reduced motion. That was **my probe being wrong, not the app**. The reduced-motion rules set `duration: 0.01ms` (the standard idiom — `0s` can break `transitionend` listeners), so a naive `> 0` test counts everything. Re-measured with a 1ms threshold:

```
motion allowed  : 3 animations (max 2000ms), 86 transitions (max 500ms)
OS reduce       : 0 animations,               0 transitions
Settings toggle : 0 animations,               0 transitions
```

Both gates work.

---

## 8 · Remaining risks and things needing review

| # | Item | Status |
|---|---|---|
| **R-1** | **`.btn-primary` white-on-cyan at 1.77:1** — live WCAG failure on the primary CTA | **Needs your call.** Deferred to the button restyle by design; annotated in place |
| **R-2** | **Aurora-only re-value.** The other five themes keep their old primary/yes/no | **Needs your call.** Flagged as a scope decision |
| **R-3** | **`KellyUtilization` colours 150% green.** The ring now says "past maximum"; the colour still says "healthy" | **Needs your call** — domain question |
| **R-4** | Radius `lg` 10px → 6px and asymmetric density are **visible app-wide changes** | Intended by the direction; worth an eyeball across routes |
| **R-5** | NO-chip ink verified by token resolution and measurement, **not by screenshot** — the live engine currently holds no NO-side positions, so no NO chip renders | Honest limitation; re-check when NO data appears |
| **R-6** | `RadialGauge.tsx` has **mixed CRLF/LF line endings** (94 CRLF, 3 LF), pre-existing | Left alone — normalising would bury the semantic diff |
| **R-7** | `--probex-gradient-brand` still uses the old cyan | Deliberate; moves with R-1 |
| **R-8** | The `.btn-no` gradient/token mismatch (painted with the *secondary* violet, not `--probex-no`) | Logged for the palette stage |

### One process note

The first attempt at the D-1 edit corrupted `LiveChart.tsx`: a `$'` sequence inside a comment was interpreted by `String.replace` as "everything after the match", splicing the file's remainder back in and duplicating the component. Typecheck caught it immediately; the file was restored from HEAD and redone with function-form replacements. No other file was affected — verified by typecheck, tests and build. Worth knowing because it is the second time in this project that shell/regex escaping has silently mangled a generated script.

---

## 9 · Environment

You had a dev server on port 3000. I stopped it before each `.next` rebuild (per the standing instruction) and **restarted it afterwards** — it is running again.

---

## 10 · Stopping here

Foundation is validated. **No page redesign was started**, as instructed. Overview, System, Markets, Positions and the rest are untouched beyond what the token layer changes for every surface at once.

Awaiting your decisions on R-1, R-2 and R-3 before Stage 2 (chart behaviour, including the approved Q-5 numeric pinning).
