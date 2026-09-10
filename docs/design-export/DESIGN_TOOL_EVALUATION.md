# PROBEX — AI Design Tool Evaluation

**Researched:** 2026-09-08 · **Scope:** tools that can ingest `docs/design-export/current/` and return redesign concepts we can implement in Next.js 15 + Tailwind 3.4.

**Constraint that drives everything below:** we are *not* generating a new application. We are asking a tool to look at 19 existing screens of a dense financial cockpit and propose a better-looking version of *the same information architecture*. Most AI UI tools are built for the opposite job.

---

## 0 · What our export actually is (the practical constraint)

| Asset | Size | Upload reality |
|---|---|---|
| `PROBEX_CURRENT_DESIGN_EXPORT.pdf` | **27.6 MB**, 118 pages | Exceeds the common 10–25 MB upload cap on most of these tools. Treat as a human reference, not a machine input. |
| `screens/` | 118 PNGs, 34 MB total | Individually 94–646 KB — every tool accepts these. |
| 5 markdown/JSON docs | 6–10 KB each | Small enough to paste as prompt context. This is our highest-value input. |

**No tool in this survey ingests 118 screens.** Every realistic workflow uploads **8–16 screens**. The selection matters more than the tool.

---

## 1 · Evaluation matrix

Legend: ● full · ◐ partial/paid · ○ none

| Tool | Screenshot in | PDF in | Redesign vs generate | Editable out | Multi-screen | Responsive | Free tier | Hand back to Claude |
|---|---|---|---|---|---|---|---|---|
| **Google Stitch 2.0** | ● (experimental mode) | ○ | ● explicit redesign credits | ● code + paste-to-Figma | ● infinite canvas | ● mobile + desktop on one canvas | ● free, no paid plan exists | ● **MCP server + `DESIGN.md`** |
| **UX Pilot** | ● reference image-to-design (on free) | ◐ document-to-design | ● "AI Website Redesigner" is the product | ◐ export is Pro-only | ● screen flows | ● | ● 80 credits/day, ~13 screens/day, 1 project | ◐ screenshots on free; Figma + code at $19/mo |
| **Figma (Make + Design)** | ● attach image or frame | ○ | ◐ Make rewrites rather than edits | ● best-in-class | ● | ● | ◐ 150 credits/day, 500/mo — a Make prompt costs 30–100+ | ● **Figma MCP already configured in this session** |
| **Subframe** | ○ | ○ | ○ builds, doesn't redesign | ● real React + Tailwind, no AI in the exporter | ● 10 pages free | ● | ● 1 project / 10 pages / limited AI | ● **MCP + Agent Skill for Claude Code** |
| **Magic Patterns** | ● | ○ | ◐ | ● React/Vue/Tailwind + Figma snapshot | ● | ● | ◐ 100 credits/mo, watermarked preview | ● code, MCP on paid |
| **v0** | ● | ○ | ◐ regenerates | ● shadcn/Tailwind | ◐ | ● | ◐ $5 credits, 7 messages/day | ● code |
| **Onlook** | ○ | ○ | n/a — edits our real code | ● *is* our code | ● | ● | ● open source | ● direct file edits |
| **Uizard** | ● Screenshot Scanner | ○ | ◐ low fidelity | ◐ handoff is Pro-only | ● | ● | ○ **3 AI generations/month** | ○ |
| **Relume** | ○ | ○ | ○ sitemap-first, marketing sites | ● Figma/Webflow/React | ● | ● | ◐ 30 components | ◐ |
| **Motiff** | ◐ | ○ | ◐ | ◐ | ● | ● | ◐ 3 files | ○ |
| **Galileo AI** | — | — | — | — | — | — | — | **Product no longer exists** |

---

## 2 · Ranked, most to least useful for our exact workflow

### 1 — Google Stitch 2.0 · *primary*

Free through Google Labs with no paid tier announced. Accepts images, text and code as canvas context. Stitch 2.0 (March 2026) added an infinite canvas, multi-screen generation, a design agent, and **`DESIGN.md`** — an agent-readable markdown file encoding colours, typography, spacing and component behaviour, exportable from one project and importable into another or into a coding agent.

**Why it wins for us:** `DESIGN.md` is the exact artifact I need. Rather than reading pictures and guessing hex values, I get a token contract I can diff against `probex-tokens.css`. It also ships an MCP server and a public SDK, so the loop can be closed without manual copy-paste.

**Caveats:** still beta. Image upload is reported to work only in the experimental (Gemini 2.5 Pro) mode. Published credit limits are third-party reports (~400 daily design / 15 daily redesign credits), not a Google-documented figure — verify in-product. Its house style leans consumer/mobile; a 3254px-tall quant analytics page is not its native territory.

### 2 — UX Pilot · *secondary*

Free tier is unusually generous and, critically, **feature-complete**: "every design feature" including *reference image-to-design*, section edit, design review, predictive heatmap and screen flows — 80 credits/day, up to 13 screens/day, 1 project. Its marketed use cases include an AI Website Redesigner and Website-to-Figma.

**The catch:** *Export to Figma* and *Export to code* are Pro-only ($19/user/mo billed annually, 750 credits/mo, 125 screens, 5 projects). On free you can generate freely but only get pictures out.

**That is still workable** — I can read screenshots of its output. And if any single paid month is worth buying in this project, it is this one.

### 3 — Figma (Figma Make + Figma Design + a screenshot→layers plugin)

The only option that produces a durable, editable, versioned design source rather than a disposable generation. Make accepts attached designs and images, can copy its preview back into Figma Design as layers, and can export code. **And the Figma MCP server is already configured in this session** (`get_design_context`, `get_variable_defs`, `get_screenshot`) — it just needs authorising — which makes handback the cleanest of any tool here.

**The catch is the free tier.** Starter gets 150 AI credits/day and 500/month; a single Make prompt costs **30–100+ credits**. That is roughly one to four Make prompts a day and perhaps 5–16 a month. Real use means Professional at **$16/seat/mo** (3,000 credits). Getting our screenshots *into* Figma as editable layers also needs a plugin — Codia or image.to.design (the `html.to.design` family), both credit-metered with free allowances.

Ranked third only because criterion 6 was a genuinely free tier. On capability alone it is first.

### 4 — Subframe · *implementation-side, not exploration*

Not a redesign generator — it is a design tool whose output *is* production React + Tailwind, exported deterministically ("without the use of AI"), synced via `npx @subframe/cli sync`. It ships an **Agent Skill for Claude Code** (`npx skills add SubframeApp/subframe`) plus MCP, so I can pull components and page code directly from my side.

Free: 1 project, 10 pages, 2 prototypes, unlimited members, limited AI, 24h history. Pro $29/editor/mo.

**Use it if** the redesign converges on a rebuilt component library (a real possibility given the `StatCard`/`Panel` overlap and two shadow vocabularies). **Don't use it** to explore visual directions — it has no screenshot ingest.

### 5 — Magic Patterns

Screenshots and live captures → editable UI with React/Vue/Tailwind code, plus a Figma export (a *static snapshot* — layout, styling and structure survive; interactivity does not). Free is **100 credits/month with a watermark on preview**; Starter $17/seat/mo annual (1,000 credits, watermark removed, GitHub sync, MCP); Business $85. Overflow at $0.02/credit.

Good tool, wrong economics for exploring 19 screens on the free tier.

### 6 — v0

Excellent at image → shadcn/Tailwind React, and the closest of any tool to our actual stack. But it *regenerates* rather than *redesigns*, and its idiom is shadcn defaults — which would flatten the provenance/freshness grammar that is PROBEX's most distinctive asset. Free is $5 of credits and 7 messages/day; Plus $30/user/mo.

Useful as a **component-level** sandbox (one panel, one chart frame), not for the system.

### 7 — Onlook

Open-source visual editor that runs against a real Next.js + Tailwind codebase with bidirectional sync — edits in the canvas write to files, edits in files update the canvas.

**Not a research tool** — it cannot propose a redesign from screenshots. Its place is *after* a direction is chosen, if you want to nudge spacing and hierarchy visually rather than describing changes to me. Note it edits the live repo, which cuts against the current "don't modify the application" posture.

### 8 — Uizard

Screenshot Scanner does exactly what the category promises, but the free plan allows **3 AI generations per month** across all AI features, and developer handoff is Pro-only ($12/mo annual). Output fidelity is wireframe-grade. For a product whose problems are 10px type, colour collisions and chart axis clipping, wireframe-grade output tells us nothing.

### 9 — Relume

Free-forever tier, exports to Figma/Webflow/React, 30 components free and 1,000+ paid. But it is a **sitemap → wireframe → marketing-site** pipeline. No screenshot ingest, no concept of a data-dense application shell. Wrong shape of product.

### 10 — Motiff

Repositioned in 2026 as a Figma-first design-system partner after discontinuing its standalone editor mid-2025. Free tier is 3 Motiff files. Not worth the setup cost for a one-off exploration.

### 11 — Galileo AI — **do not attempt**

Acquired by Google in 2025 and folded into Stitch. The standalone product and domain are shut down. Any article recommending it is stale.

---

## 3 · Tools to avoid for this workflow

| Tool | Why |
|---|---|
| **Galileo AI** | Does not exist. Superseded by Stitch. |
| **Uizard** | 3 AI generations/month is not an experimentation budget; wireframe fidelity answers none of our questions. |
| **Relume** | Marketing-site generator. No screenshot input, no app-shell concept. |
| **Lovable / Bolt.new** and similar prompt-to-app builders | They generate *new applications*. Pointed at PROBEX they would reinvent the IA, the data layer and the provenance model — the exact opposite of the brief. |
| **Any "point it at the repo and let it rewrite" agent** | We have a working `ServiceState` / provenance / freshness architecture that took a full stabilisation pass to get right. It must not be regenerated as a side effect of a visual change. |
| **The 27 MB PDF as a tool input** | Over most upload caps, and 118 pages will blow any context window. Human reference only. |

---

## 4 · Exact files to upload

Upload **PNGs, not the PDF**. Two tiers.

### Tier 1 — the 12-screen core set (upload these to every tool)

```
screens/desktop/overview-desktop-1440.png            ← the product's best hierarchy
screens/desktop/analytics-desktop-1440.png           ← worst density + clipped-axis and 150%-gauge bugs
screens/desktop/analytics-desktop-1440-scroll2.png   ← proves the 3254px scroll problem
screens/desktop/system-desktop-1440.png              ← most technical surface
screens/desktop/strategy-consensus-desktop-1440.png  ← most component-dense surface
screens/desktop/markets-desktop-1440.png             ← card grid + filter chips
screens/desktop/positions-desktop-1440.png           ← widest table
screens/desktop/live-desktop-1440.png                ← the stream + pause affordance
screens/tablet/overview-tablet-768.png               ← tightest viewport in the product
screens/mobile/overview-mobile-375.png               ← densest header
screens/mobile/positions-mobile-390-scroll1.png      ← table overflow with no affordance
screens/states/STALE-overview-desktop-1440.png       ← the freshness grammar, which must survive
```

### Tier 2 — add only if the tool accepts more

```
screens/states/OFFLINE-overview-desktop-1440.png     ← honest degradation, must not become a spinner
screens/states/MOCK-overview-desktop-1440.png        ← SYNTHETIC labelling must stay unmistakable
screens/interactions/command-palette-desktop-1440.png
screens/interactions/sidebar-collapsed-desktop-1440.png
screens/interactions/markets-table-view-desktop-1440.png
screens/desktop/execution-paper-desktop-1440.png     ← confirm-gated mutations
```

### Always paste as text context

`PROBEX_DESIGN_TOKENS.md` and `PROBEX_VISUAL_DEBT.md`. These two do more work than any five extra screenshots — they tell the tool what our constraints *are* rather than making it infer them from pixels.

**Do not upload:** the 27 MB PDF; scroll frames beyond the two named above; the 375/390/430 mobile triplicates (one mobile width is enough to establish a direction).

---

## 5 · Recommended workflow

```
① FREEZE      docs/design-export/current/ is the immutable baseline. Nothing in it changes.

② PREP        Copy Tier-1 into a flat upload folder. Paste DESIGN_TOKENS + VISUAL_DEBT as context.
              ~10 minutes. No repo changes.

③ EXPLORE     Stitch 2.0, free. Overview + Analytics + System first — if a tool can't handle
              Analytics it can't handle PROBEX. Produce 3 distinct directions, not 3 variations
              of one. Export DESIGN.md from each.

④ TRIAGE      You pick ONE direction. Not me. This is a taste decision and it is yours.
              Rejected directions still yield salvageable individual ideas — keep them.

⑤ DEEPEN      Take the chosen direction into UX Pilot (or Figma, if you buy a Professional seat)
              and push it across the remaining screens + tablet/mobile + the STALE/OFFLINE/MOCK
              states. Consistency across screens is where free tiers break; budget for it.

⑥ HANDBACK    Give me: the generated screens, the DESIGN.md (or Figma file URL / token export),
              and a one-paragraph statement of intent per screen. If you use Figma, authorise the
              Figma MCP connector and I read the file directly — no screenshots needed.

⑦ RECONCILE   I produce a written mapping: new value → existing token, per screen, before any
              code changes. You approve that mapping. This is the step that prevents an AI
              redesign from silently hardcoding hex values across six themes.

⑧ IMPLEMENT   Token layer first (probex-tokens.css), then primitives (Panel, Card, StatCard,
              ChartFrame), then pages. Each stage independently reviewable and revertable.
```

**Step ⑦ is the one that must not be skipped.** Every tool here outputs literal colours. PROBEX resolves colour through CSS custom properties across six themes. A direct paste of generated CSS would break five themes silently.

---

## 6 · Prompts

### 6.1 The framing prompt (send once, before any screens)

> This is an existing production trading cockpit called PROBEX. I am asking you to **redesign its visual layer, not its structure**. Do not propose new features, new pages, or a different navigation model.
>
> Rules that cannot be broken:
> 1. Every panel displays where its number came from (a literal API endpoint) and how fresh it is. This provenance-and-freshness grammar is the product's core value. Redesign how it looks; never remove it.
> 2. A withheld value renders as an em dash, never as a zero. "Source failed", "source returned nothing" and "engine hasn't computed it yet" are three distinct states and must stay visually distinct.
> 3. Base font size is 14px, not 16px. This is a deliberate density decision for a trading interface. Do not inflate it to a marketing-site scale.
> 4. Dark theme only. Six themes exist; all colour must come from tokens, never hardcoded.
> 5. The information architecture is fixed: 10 domain pages, a 200px grouped sidebar, a 52px top bar.
>
> I will send screens next. Confirm you understand before generating.

### 6.2 The per-screen redesign prompt

> Redesign this screen at 1440×900. Keep every piece of information present and in the same logical grouping. Improve: visual hierarchy between critical and incidental numbers; the fact that every surface is currently an identical bordered card; and the density of small metadata text.
>
> Specific problems to solve on this screen: `<paste the numbered items from PROBEX_VISUAL_DEBT.md that cite this screenshot>`
>
> Do not: add features, remove provenance badges, change the navigation, or use a light theme.

### 6.3 The hierarchy prompt (the single most valuable one)

> On this screen, roughly forty numbers currently carry near-identical visual weight. Propose a **three-tier** hierarchy: one primary figure per panel, secondary supporting figures, and tertiary metadata. Show the same screen redesigned under that hierarchy. Tell me which figure you chose as primary for each panel and why.

### 6.4 The Analytics stress test (run this before committing to a tool)

> This page is 3254px tall at 1440 width with three named bands and no in-page navigation. Propose a structure that makes it navigable without splitting it into separate routes. Keep all content.

*If a tool answers this by deleting content or by inventing a new sub-navigation scheme, it has failed the brief — try the next tool.*

### 6.5 The token-extraction prompt (run last, before handback)

> Export the complete design token set for this direction: every colour with its semantic role, the type scale with sizes and line heights, the spacing scale, radii, elevation and motion durations. Give it to me as a flat markdown table of `token name → value → role`. Do not give me CSS.

*Markdown, not CSS, is deliberate — it forces a mapping step instead of a paste.*

### 6.6 The handback prompt to me

> Here is the chosen direction: `<screens + DESIGN.md / token table>`. Before changing any code, produce a reconciliation table mapping every new token to an existing `--probex-*` variable, flagging any new value that has no home in the current token set, and any change that would break one of the six themes.

---

## 7 · Limitations and risks

**Fidelity / substance**

- **Generic-dashboard drift.** These tools are trained on marketing sites and consumer apps. The likely failure mode is a beautiful, generic dashboard that has quietly discarded provenance badges, freshness indicators and the em-dash-not-zero rule. Watch for this specifically — it is the single biggest risk in the whole exercise.
- **Density collapse.** Our 14px base and 10px metadata will read as "too small" to a tool tuned for 16px marketing typography. If it returns comfortable spacing, it has misread the product.
- **Chart bugs will be reproduced, not fixed.** The clipped y-axis digits and the 150% gauge are *code* defects. A tool redrawing the screenshot will faithfully redraw the bug. These stay on the engineering list regardless of direction.

**Consistency**

- Cross-screen consistency is where every free tier fails. Nineteen screens generated across many sessions will drift in spacing and colour. `DESIGN.md` (Stitch) or a Figma library is the mitigation; plain screenshot generation has none.

**Typography**

- Every screenshot in the export is the **Windows** rendering (Segoe UI Variable). No webfont is loaded. If a tool proposes a specific typeface, adopting it is a real decision with a real cost (`next/font`, a load-time budget, and the note in `globals.css` that Inter was previously removed because it resolved only to fallbacks).

**Handback**

- UX Pilot free **cannot export**. Figma Make on Starter is roughly 5–16 prompts a month. Magic Patterns free watermarks previews. Budget for one paid month somewhere, or accept screenshot-only handback.
- Anything a tool generates as code targets *its* idiom, not ours. Treat generated code as a **description of intent**, never as a patch.

**Process**

- The design export is a snapshot of a **degraded backend** — `DEGRADED` in the header and the attention band are real engine state, and market data was genuinely stale. A tool may read the warning band as a design flourish rather than a live fault surface. Say so in the framing prompt if it starts styling warnings decoratively.
- The Next.js dev overlay pill appears bottom-left in several captures. It is not product UI. If a tool reproduces it, that tells you it is tracing rather than redesigning.

**Commercial / privacy**

- Screenshots contain live market values and real position data. All of these tools upload to third-party infrastructure. Stitch is a Google Labs beta. Subframe states designs are not used to train on your data; Magic Patterns holds SOC 2 and ISO 27001. Read the terms before uploading anything you would not publish.
- Pricing and free-tier limits here were checked on **2026-09-08** and move frequently. Stitch's credit figures in particular are third-party reports, not Google-documented.
