# PROBEX — Stitch Pilot Evaluation Scorecard

**Status: UNFILLED.** No Stitch output exists yet. Every verdict below is blank by design — filling any of it in before the pilot runs would be fabrication.

This is a **pre-registered** rubric: the questions and the pass criteria are fixed *before* seeing the output, so a visually impressive result cannot retroactively lower the bar.

---

## How to score

Each question gets **PASS / PARTIAL / FAIL** plus one sentence of evidence citing a specific screen or quote. No score without evidence.

**Gate rule:** C and H are non-negotiable. A FAIL on either means the direction is rejected regardless of how good it looks, because both represent the tool having misunderstood what the product *is*.

---

## A · Did Stitch preserve the existing information architecture?

*Pass criteria:* ten domain pages intact; sidebar groups unchanged (OBSERVE / CAPITAL / INTELLIGENCE / ENGINE); no invented routes; Overview's section order recognisable as the same page.

| | |
|---|---|
| Verdict | |
| Evidence | |

---

## B · Did it understand that technical endpoint information should not dominate the normal UI?

*Context:* literal endpoint paths appear in roughly 40 badges (`LIVE · /api/price-history`). That is deliberate provenance, but it is developer vocabulary on a user-facing surface.

*Pass criteria:* endpoint provenance is **de-emphasised or progressively disclosed on trading surfaces**, while remaining present and fully legible on System. A tool that deletes it fails. A tool that leaves it at equal weight to the figures has not engaged with the problem.

| | |
|---|---|
| Verdict | |
| Evidence | |

---

## C · Did it preserve live / stale / offline / synthetic semantics? **(GATE)**

*Pass criteria:* all six states — LIVE, STALE, OFFLINE, SYNTHETIC, DEGRADED, HEALTHY — remain visually distinguishable from each other, and distinguishable **without relying on colour alone**. The current build already achieves this (status is colour-plus-word throughout); losing it is a regression.

| | |
|---|---|
| Verdict | |
| Evidence | |
| Six states individually confirmed? | LIVE ☐ · STALE ☐ · OFFLINE ☐ · SYNTHETIC ☐ · DEGRADED ☐ · HEALTHY ☐ |

---

## D · Did it improve hierarchy rather than add decoration?

*Pass criteria:* the three-tier answer from Prompt 3 is coherent and defensible, and the regenerated screen visibly reflects it. Watch for the common failure: hierarchy asserted in prose, but every panel still rendered at one weight with a gradient added.

| | |
|---|---|
| Verdict | |
| Evidence | |
| Primary figure chosen per panel — Capital / Exposure / Performance / System | |

---

## E · Coherent visual language across desktop and mobile?

*Pass criteria:* mobile reads as the same system at a narrower width — same type ramp, same panel treatment, same status grammar — not a separately-styled app.

| | |
|---|---|
| Verdict | |
| Evidence | |
| Did it drop information at 375px? If so, what, and was it declared? | |

---

## F · Is System improved without becoming a generic admin dashboard?

*Pass criteria:* reads as instrumentation. The fourteen runtime chips are grouped by importance rather than presented flat. Operator vocabulary (`clob_client`, `resolution_tracker`, RSS/VMS) is retained and made scannable rather than renamed or hidden.

| | |
|---|---|
| Verdict | |
| Evidence | |

---

## G · Reusable component patterns, or one-off page decoration?

*Pass criteria:* the same panel/badge/figure treatments recur across all three screens with consistent rules. If Overview and System solve the same problem two different ways, the output is a mood board, not a system.

| | |
|---|---|
| Verdict | |
| Evidence | |
| Patterns that recurred across all 3 screens | |

---

## H · Did it avoid inventing functionality? **(GATE)**

*Pass criteria:* no new controls, filters, actions, metrics, routes or data that the product does not have. This is the failure mode most likely to look like success — invented UI is often the prettiest part of an AI redesign, and it is unimplementable.

| | |
|---|---|
| Verdict | |
| Evidence | |
| Invented elements found (list every one) | |

---

## I · Realistically implementable in the existing Next.js / Tailwind architecture?

*Pass criteria:* expressible as Tailwind utilities over CSS custom properties, without a new chart library, without a webfont we have not decided to adopt, and without layout that fights the fixed 52px top bar / 200px sidebar shell.

| | |
|---|---|
| Verdict | |
| Evidence | |
| New dependencies implied (should be none) | |
| Webfont proposed? | |

---

## Overall

| | |
|---|---|
| Gates C and H both passed? | |
| PASS count (of 9) | |
| Verdict | ☐ Proceed to Phase 2 · ☐ Re-prompt and retry · ☐ Switch to UX Pilot |

**Decision rule, fixed in advance:**

- **Proceed** — both gates pass and ≥6 of 9 are PASS.
- **Re-prompt** — gates pass but hierarchy (D) or coherence (E) is PARTIAL. Usually a prompting problem, not a tool problem; one retry with a sharper Prompt 3.
- **Switch tools** — either gate FAILs, or Prompt 6 (Analytics) was answered by deleting content.
