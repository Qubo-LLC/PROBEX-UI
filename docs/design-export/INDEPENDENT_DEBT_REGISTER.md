# PROBEX — Independent Debt Register

**Tracked separately from the redesign, by instruction.** Each item is a defect in the *current* build, correct to fix regardless of which visual direction ships. None depends on the Stitch direction, Q-1, or Q-5.

Fix them on their own merits, validate them on their own terms, and do not let them disappear into a redesign commit.

---

## D-1 · Analytics y-axis clipping

| | |
|---|---|
| **Severity** | **High — actively misleading** |
| **Symptom** | Analytics → Drawdown renders `34%`, `35%`, `36%` as `4%`, `5%`, `6%`. The leading digit is cut off. |
| **Location** | `src/components/shared/LiveChart.tsx` — `<YAxis … width={40} />` |
| **Cause** | Fixed 40px axis gutter; three-character labels overflow it. |
| **Fix** | Width derived from the formatted tick length, or a sufficient fixed minimum. Applies to every `LiveChart` consumer, not just Drawdown. |
| **Validation** | Drawdown axis reads `34%`. Sweep all 7 consumers for other clipped labels. |
| **Evidence** | `docs/design-export/current/screens/desktop/analytics-desktop-1440.png` · visual debt #13 |

> This one shows a wrong number to a user looking at a risk metric. It is the highest-value fix in this register.

---

## D-2 · RadialGauge domain / closed-ring overflow

| | |
|---|---|
| **Severity** | High |
| **Symptom** | Kelly Utilization reads `150% UTILIZED` with a **fully closed** green ring — a gauge whose maximum the value exceeds, rendered as if complete and healthy. |
| **Location** | `src/components/shared/RadialGauge.tsx`; consumers include `analytics/KellyUtilization.tsx`, `consensus/ConsensusScoreCard.tsx`, `EdgeStrengthGauge.tsx`, `overview/EngineFocusHero.tsx`, `system/DiagnosticsPanel.tsx` |
| **Fix** | Explicit domain. Over-maximum must be *visually distinct* from at-maximum — an overflow tint or marker, not a silently clamped full ring. A green closed ring currently means both "perfect" and "50% over limit". |
| **Validation** | Feed 0 / 50 / 100 / 150 and confirm four distinguishable renderings. |
| **Evidence** | Visual debt #14 |

> Must be fixed **before** any restyle of the gauge, or the restyle inherits the bug.

---

## D-3 · `--probex-on-accent` token (and a stale hex)

| | |
|---|---|
| **Severity** | Medium |
| **Symptom** | Text on filled YES/NO chips is hardcoded `#050816` or `#fff`. There is no token for ink on an accent surface. |
| **Location** | `portfolio/PortfolioAllocation.tsx:127` · `positions/PositionDetail.tsx:38` · `positions/SettledPositions.tsx:94` |
| **Compounding defect** | **`#050816` is stale.** It was the aurora background *before* the refinement pass; `--probex-bg` is now `#03050D`. This is a live inconsistency, not just a redesign artefact. |
| **Fix** | Add `--probex-on-accent` across all six themes; replace the three literals. |
| **Validation** | 3 hex literals removed; contrast measured on YES, NO and primary fills in every theme. |
| **Why now** | Any recolouring of YES/NO breaks contrast at three sites simultaneously. This must land **before** the palette changes. |

---

## D-4 · Duplicate shadow vocabulary

| | |
|---|---|
| **Severity** | Low — consistency |
| **Symptom** | Two elevation systems coexist: `shadow-surface` / `shadow-surface-lg` in `tailwind.config.ts`, and the canonical `--probex-elev-1…4`. Both in use. |
| **Fix** | Keep `elev-*` (drop shadow + inset top highlight — the milled-panel look). Migrate `shadow-surface*` consumers and delete the Tailwind entries. |
| **Validation** | Zero references to `shadow-surface`; no visual regression at panel edges. |
| **Evidence** | Visual debt #7 · token debt #3 |

---

## D-5 · Navigation touch targets

| | |
|---|---|
| **Severity** | Low — a11y comfort, not a violation |
| **Symptom** | 25 targets below 44×44px. Sidebar rows 183×40; icon buttons 32×32; brand link 26×24. All pass **WCAG 2.5.8 AA (24px)**; none reach **2.5.5 AAA / mobile HIG (44px)**. |
| **Prepared fix (Group A)** | `.nav-item` `py-2.5` → `py-3`. Central, ready, low risk. Groups B/C/D remain deferred. |
| **Validation** | Measure, do not estimate. Confirm no reflow in the collapsed 56px rail. |
| **Note** | The Stitch direction does **not** solve this — its 32px inputs and 22px badges stay under 44px. Do not assume the redesign absorbs it. |
| **Evidence** | Visual debt #33 |

---

## Suggested order

`D-3` → `D-1` → `D-2` → `D-4` → `D-5`

D-3 first because it must precede any palette change. D-1 and D-2 next because they are the two items that put a wrong number in front of a user. D-4 and D-5 are cleanup and can land any time.

Each is independently shippable and independently validatable.
