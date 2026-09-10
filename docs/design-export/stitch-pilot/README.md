# PROBEX — Stitch Pilot

**Prepared 2026-09-08. Nothing has been sent to Stitch. No application code was touched.**

---

## Status: manual pilot required

Stitch **cannot be driven from this session**, and the reason matters more than the fact.

| | |
|---|---|
| Stitch connector in this environment | **Not present.** MCP registry search returns no Stitch connector. |
| Official remote MCP | Exists — `https://stitch.googleapis.com/mcp` |
| Auth required | `STITCH_API_KEY`, **or** `STITCH_ACCESS_TOKEN` + `GOOGLE_CLOUD_PROJECT` |
| Can this session authorise it? | **No.** Non-interactive session; no OAuth flow available here. |
| **Would the MCP help even if connected?** | **No — and this is the decisive point.** |

The official Stitch SDK and MCP surface is **text-in, design-out**. Its tools are `create_project`, `generate_screen_from_text`, `get_screen`. `screen.getImage()` returns a screenshot as *output*. There is **no image-input tool** in the programmatic surface.

Our entire premise is feeding Stitch the existing PROBEX screens. **That only works in the Stitch web UI**, and only in Experimental mode (Gemini 2.5 Pro). Standard mode is text-only.

So the MCP is not a shortcut we are missing. Wiring it up would let an agent *generate* screens from prompts — it would not let it *see* PROBEX.

### ⚠️ Supply-chain warning

Several 2026 blog posts instruct you to run `npx -y @google/stitch-mcp` or `npx -y stitch-mcp`.

**`@google/stitch-mcp` does not exist on npm** (verified: HTTP 404). Every `stitch-mcp`-shaped package on npm is published by an unrelated individual, not Google:

- `stitch-mcp` — Aakash Kargathara
- `stitch-mcp-auto`, `stitch-mcp-stdio`, `stitch-mcp-server`, `google-stitch-mcp` — various individuals

There is a legitimate helper CLI, `@_davideast/stitch-mcp`, published under a personal scope. The genuinely official artifacts are the remote MCP endpoint above and the SDK at `github.com/google-labs-code/stitch-sdk`.

Do not run any of these from guides. Nothing in this pilot needs them.

---

## What is here

```
stitch-pilot/
├── README.md                  ← this file
├── PILOT_PROMPTS.md           ← 9 prompts, in order. Start at Prompt 0.
├── EVALUATION_SCORECARD.md    ← pre-registered A–I rubric, deliberately blank
├── TOKEN_MAP_TEMPLATE.md      ← every current --probex-* token, ready to map against
├── upload/                    ← 3 PNGs, renamed 01/02/03 for drag-and-drop order
│   ├── 01-overview-desktop-1440.png    (646 KB)
│   ├── 02-system-desktop-1440.png      (316 KB)
│   └── 03-overview-mobile-375.png      (230 KB)
├── context/                   ← the two markdown files to attach
│   ├── PROBEX_DESIGN_TOKENS.md
│   └── PROBEX_VISUAL_DEBT.md
└── output/                    ← empty. Stitch results go here.
```

`upload/` and `context/` are **copies**. `docs/design-export/current/` remains the frozen baseline and was not modified.

---

## How to run it

1. Open `stitch.withgoogle.com`, sign in, **switch to Experimental mode** (image upload does not work in Standard).
2. Send **Prompt 0** alone. Wait for confirmation of the six rules.
3. Send **Prompt 1** with both files from `context/`. **This is a gate** — if Stitch cannot name anything in the current design worth keeping, stop and use UX Pilot instead.
4. Prompts 2 → 5, attaching `upload/01`, `02`, `03` in turn.
5. **Prompt 6 (Analytics) is the real test.** Text only, no image. If it answers by deleting content, the tool has failed the brief.
6. Prompts 7 and 8 extract the token table and `DESIGN.md`.
7. Drop everything into `output/` — **including the text answers**, pasted raw into `output/stitch-transcript.md`.

Expect this to cost well under Stitch's free daily allowance. If limits bite, Prompts 2, 4 and 5 are the ones that must complete.

---

## Then come back

Tell me the output is in `output/` and I will produce the **Design Reconciliation Report** — scoring the pre-registered rubric, and mapping every proposed colour against `TOKEN_MAP_TEMPLATE.md`.

I will not modify a single component before you have read that report and approved a direction.

---

## Two things to watch for while you run it

**The failure mode is a beautiful generic dashboard.** These models are trained overwhelmingly on marketing sites and consumer apps. The most likely bad outcome is not an ugly result — it is an attractive one that has quietly deleted the provenance badges, merged STALE into OFFLINE, and replaced the em-dash-for-withheld-value rule with zeros. Prompt 0 exists to make that harder, and questions C and H in the scorecard exist to catch it.

**The System screenshot shows a real fault.** `DEGRADED` in the header and the attention band was the engine's genuine state at capture time — market data was stale backend-side. If Stitch styles that band as a decorative accent, it has misread a live fault surface as design flourish. Say so and re-prompt.
