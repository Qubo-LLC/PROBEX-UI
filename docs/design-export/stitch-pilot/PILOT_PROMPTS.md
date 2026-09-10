# PROBEX — Stitch Pilot Prompts

**Run these in order, in the Stitch web UI at `stitch.withgoogle.com`.**
Image upload requires **Experimental mode** (Gemini 2.5 Pro). Standard mode is text-only.

Do not skip Prompt 0. It is the guardrail against the single most likely failure of this exercise: a beautiful generic dark dashboard that has quietly deleted the provenance grammar.

---

## Prompt 0 — Framing (send alone, before any image)

> I am going to ask you to redesign the visual layer of an existing production application. I am **not** asking for a new product.
>
> The application is PROBEX: a trading cockpit for a prediction-market engine. It has ten domain pages, a 200px grouped sidebar, and a 52px top bar. That information architecture is fixed and is not part of what I want you to change.
>
> Six rules that cannot be broken:
>
> 1. **Provenance is the product.** Every panel states which API endpoint its number came from and how fresh that reading is. Redesign how that looks. Never remove it, and never merge it into a single generic "status" badge.
> 2. **Six data states are distinct and must stay visually distinct:** LIVE, STALE, OFFLINE, SYNTHETIC (mock data), DEGRADED, HEALTHY. Collapsing any two of these into one treatment is a failure, not a simplification.
> 3. **A withheld value renders as an em dash, never as a zero.** "The source failed", "the source returned nothing" and "the engine has not computed it yet" are three different things and read differently on screen today.
> 4. **Base font size is 14px, not 16px.** This is a deliberate density decision for a trading interface. Do not inflate the type scale to a marketing-site rhythm.
> 5. **Dark theme only.** All colour must be expressible as semantic tokens. Do not introduce arbitrary neon accents.
> 6. **Financial semantics are not decoration.** Positive, negative, neutral, target and actual each carry meaning. Colour must never be applied for visual interest alone.
>
> What I *do* want you to change: information hierarchy, visual scanning, typography, spacing and density, component consistency, chart presentation, status communication, responsive behaviour, and the distinction between controls and information.
>
> What I want to avoid: heavy glassmorphism, gradient washes, decorative elements competing with data, oversized generic cards, and the standard AI-generated dashboard look. This should read as a professional financial workstation with its own identity.
>
> Confirm you have understood these six rules before I send anything.

---

## Prompt 1 — Context load (attach the two markdown files)

Attach `context/PROBEX_DESIGN_TOKENS.md` and `context/PROBEX_VISUAL_DEBT.md`, then:

> These two documents describe the current implementation. The tokens file is extracted from the codebase, not aspirational. The visual debt file is a list of observations about the current UI — none of it is solved and none of it is a recommendation.
>
> Read both. Then tell me, in your own words and before generating anything:
>
> - which three items in the visual debt register you consider the most damaging to a user trying to read this interface quickly, and why;
> - which parts of the current design you would deliberately **keep**.
>
> If your answer to the second question is "nothing", you have misread the brief.

**This is a gate.** If Stitch cannot name anything worth keeping, stop and try UX Pilot instead.

---

## Prompt 2 — Overview, desktop (attach `upload/01-overview-desktop-1440.png`)

> This is the Overview page at 1440×900. Reading order top to bottom: an attention band listing engine warnings, then a BTC price hero with the engine's current focus, then a four-panel instrument row (Capital, Exposure, Performance, System), then markets.
>
> Redesign it at 1440×900. Keep every piece of information and keep the logical grouping.
>
> Specific problems on this screen, quoted from our own register:
>
> - "Panel is the only landmark. Almost every surface is a bordered card with a title, a badge and a figure. Within a page, a critical number and an incidental one carry near-identical visual weight."
> - "The attention band competes with the hero. The warning list sits above the BTC price, so the first thing read is a fault list, not the engine's state."
> - "`--probex-yes` and `--probex-primary` are the same cyan. A YES position, a focus ring and a brand control are chromatically identical."
> - "Page subtitles do real explanatory work but are set at metadata weight."
> - "10px type carries meaning — provenance, freshness, endpoint paths and metadata all sit at the smallest step."
>
> The four-up instrument row is currently the best hierarchy in the product. Treat it as an asset to build on rather than something to replace.
>
> Do not: add features, remove provenance badges, change the navigation, or switch to a light theme.

---

## Prompt 3 — The hierarchy question (same screen, follow-up)

> On this screen roughly forty numbers currently carry near-identical visual weight.
>
> Propose an explicit **three-tier** hierarchy: one primary figure per panel, secondary supporting figures, and tertiary metadata. Regenerate the screen under that hierarchy.
>
> Then tell me in text which figure you chose as primary for each of the four instrument panels, and why that one.

This prompt does more for the redesign than any styling instruction. Keep the text answer — it goes in the reconciliation report.

---

## Prompt 4 — System, desktop (attach `upload/02-system-desktop-1440.png`)

> This is the System page at 1440×900 — the most technical surface in the product, intended for an operator rather than a trader. It shows runtime mode and health, a probe list (price_feed, main_loop, api_access, memory) with pass/fail, a grid of fourteen ON/OFF runtime component chips, process metrics (uptime, RSS, VMS, CPU), and per-endpoint request counts, latencies and circuit-breaker state.
>
> Redesign it at 1440×900. This page should read as **instrumentation** — a cockpit or a rack-mounted panel — not as a generic admin dashboard with cards.
>
> Specific problems:
>
> - "Fourteen runtime component chips are presented flat, with no grouping by importance."
> - "System is the most technical page — snake_case component names (`clob_client`, `resolution_tracker`), RSS/VMS memory, per-endpoint circuit state."
> - "Endpoint Diagnostics exposes the client's internal request ledger to the operator."
> - "Other pages present flatter panel grids" than Overview's instrument row.
>
> Two constraints specific to this page:
>
> - The technical identifiers are correct here. This is the one page where operator vocabulary belongs. Do not replace `clob_client` with a friendly label. **Do** propose how to make it scannable.
> - `DEGRADED` in this screenshot is the engine's real state during capture, not a mock. Treat health warnings as live fault surfaces, not as decorative accents.

---

## Prompt 5 — Overview, mobile (attach `upload/03-overview-mobile-375.png`)

> This is the same Overview page at 375×667, the narrowest viewport we support.
>
> Redesign it at 375×667 using the same visual language you established for desktop. The point of this prompt is coherence: I want to see the same system at a different width, not a different design.
>
> Specific problems:
>
> - "The BTC price disappears from the header below ~640px. The strip shrinks and the price is dropped rather than reflowed."
> - "Header is dense at 375px — hamburger, logo, search, status chip and action button in 375px."
> - "Charts keep desktop proportions on mobile, becoming short and wide with crowded x-axis labels."
> - Touch targets: sidebar rows are 40px tall and icon buttons are 32×32. These pass WCAG 2.5.8 AA but none reach 44px.
>
> Do not solve density by deleting information. If you believe something must be dropped at this width, say so explicitly in text and explain what the user loses.

---

## Prompt 6 — The Analytics stress test (text only, no image)

Run this **before** committing to Stitch for the wider exploration.

> One page in this product is 3254px tall at 1440 width. It has three named bands — Edge & Sizing, Performance History, Attribution — and no in-page navigation or anchoring. It contains four figure tiles, a confidence distribution bar, a by-signal-source breakdown, a radial gauge with four term tiles and an explanatory paragraph, two time-series charts, and a segment/signal/hourly attribution panel.
>
> Propose a structure that makes it navigable and scannable **without** splitting it into separate routes and **without** removing content.
>
> If your proposal removes any information, list exactly what and say why.

**Scoring this one:** a tool that answers by deleting content, or by inventing a new sub-navigation scheme that does not exist in the product, has failed the brief. Note the answer and move to UX Pilot.

---

## Prompt 7 — Token extraction (run last)

> Export the complete design token set for this direction as a flat markdown table with three columns: token name, value, and the semantic role it serves.
>
> Cover: every colour, the type scale with sizes and line heights, the spacing scale, radii, elevation, and motion durations.
>
> Give me markdown, not CSS.
>
> Separately, list every colour you introduced that has **no** equivalent in the tokens document I gave you earlier, and say what job each one does.

Markdown rather than CSS is deliberate. It forces a mapping step instead of a paste, and the "what has no equivalent" list is exactly section 9 of the reconciliation report.

---

## Prompt 8 — DESIGN.md export

> Export this project's `DESIGN.md`.

Save it to `output/DESIGN.md`. This is the highest-value single artifact to bring back — it is a token contract rather than a picture.

---

## What to bring back

Into `docs/design-export/stitch-pilot/output/`:

| File | From |
|---|---|
| `01-overview-desktop-REDESIGN.png` | Prompt 2 / 3 |
| `02-system-desktop-REDESIGN.png` | Prompt 4 |
| `03-overview-mobile-REDESIGN.png` | Prompt 5 |
| `DESIGN.md` | Prompt 8 |
| `token-table.md` | Prompt 7 |
| `stitch-transcript.md` | the text answers to Prompts 1, 3, 5, 6 — paste them raw |

The **text answers matter as much as the images.** They are how we tell whether Stitch understood the product or just restyled a screenshot.

If Stitch also offers the generated HTML for a screen, save it as `NN-*.html`. It is not implementable as-is, but it makes the spacing and type scale readable exactly rather than by eye.
