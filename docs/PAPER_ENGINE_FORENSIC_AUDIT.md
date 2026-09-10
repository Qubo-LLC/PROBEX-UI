# PAPER ENGINE FORENSIC AUDIT

**Date:** 2026-09-09, 07:37–07:47 UTC · **Method:** read-only HTTP GETs against the live engine
**No code changed. No state reset. No mode changed. No orders placed. Nothing committed.**

Raw captures: `/tmp/audit/*.json` (16 endpoints + a 163-row full ledger).

---

## 1. Current State

Captured 07:38–07:47 UTC, all HTTP 200.

| Field | Value | Source |
|---|---|---|
| Simulated capital | **$8,387.36** | `/api/survival`, `/api/balance`, `/api/portfolio` |
| Initial capital | **$100.00** | `/api/survival`, `/api/paper-stats` |
| Realized P&L | **$8,287.36** | `/api/portfolio` (`8287.3619`), `/api/paper-stats` |
| Unrealized P&L | **$0.00** | `/api/portfolio`, `/api/positions` |
| Open positions | **0** | `/api/positions` (`count: 0`) |
| Settled trades | **163** | `/api/paper-stats`, `/api/portfolio`, ledger `count` |
| Wins / Losses | **129 / 34** (79.1%) | all surfaces agree |
| Engine mode | **paper**, `live_trading_enabled: false` | `/api/runtime`, `/api/execution/policy` |
| Session start | **2026-09-07T13:21:12** | `/api/paper-stats` |
| **Process start** | **2026-09-09T07:05:57.919** | `/api/runtime` `initialized_at` |
| Uptime | 41 min at last sample | `/api/stats` |
| Health | **degraded** — `api_access` failing | `/api/health` |
| Health counters | 555 checks, **549 warnings**, 0 errors, **restarts: 0** | `/api/health` |
| Largest win / loss | **+$4,093.31 / −$7,357.33** | `/api/paper-stats` |
| Avg win / avg loss | +$289.63 / −$855.15 | `/api/paper-stats` |

**The engine is not currently trading.** Since restart: 65,383 edges detected, **0 orders executed**, 0 active positions, ledger unchanged at 163. Last trade closed 07:05:58.

---

## 2. Balance Trajectory

**Fully reconstructable.** The default ledger response caps at 100 rows, but `/api/trades/ledger?limit=500` returns **all 163**. Walking `pnl` in close order from `initial_capital = $100`:

```
reconstructed final balance : $8,387.36
backend current_capital     : $8,387.36     ← exact match
sum of pnl over 163 trades  : $8,287.36
backend realized_pnl        : $8,287.3619   ← exact match
```

| Milestone | Value | Timestamp |
|---|---|---|
| Start | $100.00 | 2026-09-07T13:21:12 |
| Earliest settled trade | — | 2026-09-07T13:27:45 |
| Balance before the loss cluster | **$29,055.51** | 2026-09-08T21:09:30 |
| **Peak** | **$36,786.67** | **2026-09-08T21:27:40** |
| After loss 1 | $29,429.34 | 21:44:40 |
| After loss 2 | $22,072.00 | 21:44:40 |
| After loss 3 | $15,450.40 | 21:49:12 |
| After loss 4 | $11,477.44 | 22:05:59 |
| After loss 5 | **$8,387.36** | 2026-09-09T07:05:58 |

**The remembered "≈$29,055" is a real balance** — it is the value at 21:09:30, immediately before the final two wins. The actual peak was **$36,786.67**, higher than recalled.

---

## 3. Position Sizing

Configured limits (`/api/execution/policy`): `max_bet_percent: 20`, `kelly_fraction: 0.5`, `max_concurrent_positions: 10`, `minimum_order_size_usd: 10`.

- **Sizing scales with balance.** The compounding chain is unambiguous: 93.58 → 105.29 → 118.48 → 133.31 → … → 6,538.67, each ≈1.125× the last.
- **Largest stake: $7,357.33** — exactly **20.0%** of the peak $36,786.67. The per-position cap was applied.
- **15 of 163 trades exceeded 20% of the running balance**, up to **30.0%**.
- **No aggregate exposure cap.** Two $7,357.33 positions were opened **in the same second** (21:28:05.259 and 21:28:05.804) — each 20% of balance, **40% combined**. `max_concurrent_positions: 10` never bound (max observed concurrency: 3), so nothing constrained total exposure.
- **No leverage or multiplier** is present. $100 → $7,357 is pure compounding of a 20%-of-balance rule over a long winning streak.

The mechanics are legitimate. **The inputs are not** — see §8.

---

## 4. Large-Loss Reconstruction

| Closed | Asset | Stake | Entry | Exit | P&L | Hold | Market dur | Edge |
|---|---|---|---|---|---|---|---|---|
| 09-08 21:44:40 | ETH YES | $7,357.33 | 0.24 | **null** | −$7,357.34 | 995s | 15m | 67.5% |
| 09-08 21:44:40 | SOL YES | $7,357.33 | 0.335 | **null** | −$7,357.34 | 995s | 15m | 58.0% |
| 09-08 21:49:12 | BTC YES | $6,621.60 | 0.435 | **null** | −$6,621.60 | 991s | 15m | 44.5% |
| 09-08 22:05:59 | BTC YES | $3,972.96 | 0.435 | **null** | −$3,972.96 | 1,136s | 15m | 44.5% |
| **09-09 07:05:58** | **SOL YES** | **$3,090.08** | **0.0005** | **null** | **−$3,090.08** | **32,715s (9.09h)** | **15m** | **79.95%** |

**Is −100% mathematically consistent?** **Yes.** A losing binary position is worth 0 at resolution, so the entire stake is lost. Verified across all 163 rows: `pnl == size × pnl_percent/100` with **0 inconsistencies**, and `won` agrees with the sign of `pnl` in **163/163** rows. Winners settle at `exit_price: 1` and their payoff matches `(1/entry − 1)` in **129/129** cases.

**The first four are normal settlements** — 16–19 minute holds on 15-minute markets is ordinary settlement lag.

**The fifth is not.** Opened 09-08 22:00:43, held **9.09 hours** on a 15-minute market, entry price **0.0005** (a 20:1 outlier against every other entry in the dataset: 0.24–0.725), and closed at **07:05:58.615** — **0.7 seconds after the engine process started at 07:05:57.919**.

**Data-model asymmetry:** all 34 losses record `exit_price: null`; all 129 wins record `exit_price: 1`. A losing binary resolves at **0**, not null. The P&L is right; the record is incomplete.

---

## 5. Server/Restart Correlation

- **Current process started 2026-09-09T07:05:57.919.**
- The ledger shows a **540-minute gap** in settlements: 09-08T22:05:59 → 09-09T07:05:58.
- **Exactly one position spanned that gap**, and it settled 0.7s after the process came up.
- `health.stats.restarts: 0` — but that counter is **per-process** and was itself reset, so it cannot evidence cross-process restarts. Uptime (41 min) is the reliable signal.
- **`survival_states` contains a single entry**, timestamped `2026-09-09T07:05:58.615` — the survival-state history was wiped and re-seeded at restart.
- `/api/execution/status` reports `total_trades: 0, balance: 100.0` — per-process counters, reset.
- **Trade history and balance survived** (163 trades, $8,387.36) — persisted state is intact.

**Classification for the four losses of 21:44–22:05: A — likely unrelated to outage.** They settled ~9 hours before the restart, with normal hold times.

**Classification for the fifth loss: C — strong evidence outage/restart affected behaviour.** A 15-minute market held 9.09 hours and force-settled 0.7s after process start is a restart-time orphan sweep, not a market outcome.

---

## 6. Duplication/Replay Check

| Check | Result |
|---|---|
| Exact duplicate records (market + opened + closed + size) | **0** |
| Duplicate settlements of the same position | **0** |
| Overlapping trades on the same `market_id` | **0** |
| Same-second opens on one market | **0** |
| Same-second opens across markets | 27 occurrences, max 3 — consistent with a polling cycle firing multiple entries |
| Ledger totals vs `count` | 163 = 163 |

**No duplication or replay was found.** The repetition present is of a different kind — see §8.

---

## 7. Accounting Reconciliation

| Surface | Trades | W/L | Realized | Balance |
|---|---|---|---|---|
| `/api/paper-stats` | 163 | 129/34 | $8,287.36 | $8,387.36 |
| `/api/portfolio` | 163 | 129/34 | $8,287.3619 | $8,387.36 |
| `/api/paper/status` | 163 | — (79.1%) | $8,287.36 | — |
| `/api/survival` | — | — | — | $8,387.36 |
| `/api/balance` | — | — | — | $8,387.36 |
| Ledger (163 rows) | 163 | 129/34 | $8,287.3619 | reconstructs to $8,387.36 |
| **`/api/execution/status`** | **0** | **0/0** | **$0.00** | **$100.00** |
| **`/api/runtime.stats`** | — | — | **total_pnl: 0** | — |

**Six surfaces agree exactly. Two do not** — and both disagreeing surfaces are **per-process counters reset by the 07:05:57 restart**, not contradictory ledgers. This is the previously-logged B-3 "three disagreeing accounting surfaces" issue reproducing, with its cause now identified: **process-scoped vs persisted state**.

Checks passed: win/loss classification correct (163/163) · P&L signs correct · balance reconciles to the cent · position history agrees with portfolio totals · paper-stats agrees with the ledger.

**Prior concern B-2 (analytics win/loss inversion) did not reproduce** in any of these endpoints.

---

## 8. $100 → $29,055 Verdict

# LIKELY SIMULATION/ENGINE BUG

The **arithmetic is impeccable** — every surface reconciles to the cent and all 163 rows are internally consistent. **The trades that produced it are not credible.**

One market, `0x6295297b965bb8b7bf8e…`, produced **$36,318.78 of the $36,686 run-up** across **37 trades in 13.88 hours**:

- **Entry price constant at 0.615 on every one of the 37 trades**
- **Edge constant at 38.5% on every one**
- **Exit price 1 on every one — 37 wins, 0 losses**
- Each entry opens at the instant the previous closes, compounding 93.58 → 6,538.67
- The market's own `duration_minutes` is **15**

A 15-minute binary market resolves **once**. It cannot be entered and settled 37 times over 13.9 hours at an unchanging price with an unchanging outcome.

**The same signature appears on every repeated market:**

| Trades | Asset | Duration | Span | Entry price | W/L | Net |
|---|---|---|---|---|---|---|
| 66 | BTC | 5m | 11.1h | **constant 0.725** | 65/1 | +$588 |
| 37 | BTC | 15m | 13.9h | **constant 0.615** | 37/0 | **+$36,319** |
| 27 | ETH | 15m | 10.9h | **constant 0.415** | **0/27** | −$640 |
| 27 | BTC | 15m | 10.9h | 2 distinct | 26/1 | +$388 |

A live market's price moves. **A constant entry price across 11–14 hours means the engine is re-reading a frozen snapshot**, and each market has a fixed outcome it repeats (37/37 win, 0/27 loss).

**The mechanism is visible right now.** `/api/health` has reported `api_access: false — "Market data stale"` continuously (549 warnings in 555 checks; `last_warning: stale_market_data`). At the time of writing, `/api/markets` returns **2 markets, one of which closed at 07:15:00Z — over 30 minutes ago** — and the engine still holds it as current, having detected 65,383 "edges" against it.

**The run-up is an artifact of trading a stale market cache, not trading performance.**

---

## 9. Large-Loss Verdict

# PLAUSIBLE

For the **four losses of 21:44–22:05**: mechanically and arithmetically sound. −100% is correct for a losing binary; hold times of 16–19 minutes on 15-minute markets are normal settlement lag; the stakes follow deterministically from the 20%-of-balance rule. They are large **only because the balance they were sized against was inflated** by §8.

**The fifth loss requires a separate verdict, and I am not going to hide it inside the group one:**

### Fifth loss (SOL, −$3,090.08) — LIKELY ENGINE/STATE BUG

Held 9.09 hours on a 15-minute market, entry price 0.0005 (20× below any other entry in the dataset), `exit_price: null`, and force-settled **0.7 seconds after the engine process started**. This is an orphaned position swept at restart, not a market outcome.

---

## 10. Risk-Sizing Assessment

| Question | Finding |
|---|---|
| Maximum observed stake | **$7,357.33** |
| Max stake ÷ balance | **20.0%** of the peak (at cap); but **30.0%** of the running balance on the $6,621.60 trade |
| Hard cap | **No** |
| Configurable cap | **Yes** — `max_bet_percent: 20` in `/api/config` and `/api/execution/policy` |
| Trades exceeding 20% of running balance | **15 of 163** |
| Aggregate portfolio-exposure cap | **None found** |
| Did a risk guard prevent these trades? | **No** |

**Two guard failures to flag:**

1. **The per-position cap is not enforced against a common reference.** 15 trades exceeded 20% of the reconstructed running balance, one reaching 30%. This is consistent with sizing against a balance snapshot taken before concurrent positions settled — the cap is computed, but against a stale denominator.
2. **There is no aggregate exposure limit.** Two positions of 20% each opened **in the same second**, putting 40% of capital at risk simultaneously. `max_concurrent_positions: 10` is the only concurrency control and never bound (peak concurrency: 3). Ten positions at 20% each would permit 200% of capital.

**Not judged:** whether 20% per position is an appropriate policy. That is a strategy question, and it was configured deliberately.

---

## 11. Frontend vs Backend Trust

**The screenshot is trustworthy as evidence.** Every headline figure traces to a backend field:

| Screenshot value | Origin | Verdict |
|---|---|---|
| 129W / 34L | `/api/paper-stats`, `/api/portfolio` | **Backend, verified** |
| +$8,287.36 realized | `/api/portfolio.pnl.realized` = 8287.3619 | **Backend, verified** |
| 0 open positions | `/api/positions.count` | **Backend, verified** |
| The five loss rows and stakes | `/api/positions/history` + `/api/trades/ledger` | **Backend, verified** |
| −100% | Backend `pnl_percent` | **Backend, verified** |

**Frontend-computed or mapped:** currency and percentage formatting; `pctToFraction` on win-rate units; the settled-positions table composition.

**One frontend-side caveat, not an error:** `PositionsConsole` sources its **Resolution Record** and **Realized** panels from `/api/execution/status` — the per-process endpoint that currently reports zeros. Those two panels will read 0 after any restart while the rest of the page reads persisted values. That is the B-3 split surfacing in the UI, and it is a **display consequence of the backend split**, not a frontend bug.

**Potentially stale:** nothing material. The frontend polls at 2–30s and the values matched my direct captures.

---

## 12. Current Backend Health

**Stable.** 30 requests across 6 rounds, 4 seconds apart:

| Endpoint | Result | Latency range |
|---|---|---|
| `/api/health` | 6/6 × 200 | 0.73 – 1.06s |
| `/api/stats` | 6/6 × 200 | 0.75 – 0.84s |
| `/api/runtime` | 6/6 × 200 | 0.74 – 1.36s |
| `/api/positions` | 6/6 × 200 | 0.74 – 0.84s |
| `/api/trades/ledger` | 6/6 × 200 | 0.98 – 1.79s |

**0 failures, 0 timeouts, 0 502s.** The instability of the previous 12 hours has cleared.

**But the engine is still degraded**: `api_access` is failing, the market cache is 1,927s stale with 2 markets (one already closed), and 65,383 edges have been detected against it with 0 orders executed.

---

## 13. Findings Classified

### CONFIRMED

1. **Accounting reconciles exactly** — $100 + $8,287.36 = $8,387.36 across six independent surfaces; 163/163 rows internally consistent; 163/163 win-flags correct.
2. **The peak was $36,786.67 at 09-08T21:27:40**, not $29,055 (which was the balance at 21:09:30).
3. **One market produced $36,318.78 across 37 trades at a constant entry price of 0.615 and a constant 38.5% edge, winning 37/37 over 13.88 hours on a 15-minute market.**
4. **Every repeated market has a constant entry price** across 10–14 hours with a fixed outcome.
5. **The market cache is stale and is stale right now** — 549 stale-data warnings in 555 health checks; `/api/markets` currently serves a market that closed 30+ minutes ago.
6. **The engine process restarted at 07:05:57.919**, and the fifth large loss settled at 07:05:58.615 — 0.7s later.
7. **No duplication or replay** — 0 exact duplicates, 0 overlapping same-market trades, 0 repeated settlements.
8. **No aggregate exposure cap exists**; two 20% positions opened in the same second.
9. **15 of 163 trades exceeded the configured 20% cap**, reaching 30%.
10. **`/api/execution/status` and `/api/runtime.stats` are process-scoped** and reset on restart — the mechanical cause of B-3.
11. **All 34 losses record `exit_price: null`; all 129 wins record `exit_price: 1`.**
12. **Backend is currently stable** — 30/30 at 200.

### LIKELY

13. The **$100 → $36,786 run-up is an artifact of the stale market cache**, not trading performance (§8).
14. The **fifth loss is a restart-time orphan sweep** (§4, §5).
15. The **20% cap is computed against a stale balance denominator**, allowing the 30% outlier.

### POSSIBLE

16. The four losses of 21:44–22:05 were the cache **partially refreshing** and settling accumulated positions against reality. Timing is consistent; direct evidence is absent.
17. The `entry_price: 0.0005` on the fifth loss is a sentinel or a division artifact rather than a real quoted price.

### UNCONFIRMED

18. Whether the engine restarted more than once during the outage — `restarts: 0` is process-scoped and cannot answer this.
19. What the market cache contained at 21:44 — no historical snapshot is exposed.
20. Whether the four losses would have occurred with fresh market data.

---

## 14. Recommended Backend Investigation

**Evidence-driven, in priority order. All are backend-side; none is a frontend change.**

1. **Why does `market_fetcher` never refresh?** `api_access` has failed for essentially the entire session (549/555 checks). The engine is trading a frozen snapshot. **This is the root cause of §8 and should be fixed before any result from this simulation is used.**
2. **Why does the engine trade an expired market?** `/api/markets` is currently serving a market that closed at 07:15:00Z. Add a `closes_at` guard so an expired market cannot be entered.
3. **Why can one market be entered 37 times?** Add an idempotency guard: one open position per `market_id` per resolution.
4. **Add an aggregate exposure cap.** Per-position 20% with `max_concurrent_positions: 10` permits 200% of capital.
5. **Fix the sizing denominator** so the 20% cap is evaluated against capital net of open exposure.
6. **Record `exit_price: 0` for losing resolutions** rather than `null`.
7. **Make restart-time position handling explicit.** Orphaned positions are currently force-settled at −100%; decide whether that is intended and log it as a distinct event.
8. **Separate persisted from process-scoped accounting** in `/api/execution/status` and `/api/runtime.stats`, or label them as session counters — this is B-3's root cause.
9. **Expose a restart counter that survives restarts**, so outage correlation does not depend on inference.

### Hypotheses, explicitly not established

- That the outage *caused* the four large losses. Timing is consistent; **evidence is insufficient** and I am not asserting it.
- That the strategy is or is not profitable. **No conclusion is possible from this dataset**, because the inputs were not real market prices.

---

## Safety confirmation

Paper mode throughout (`mode: paper`, `live_trading_enabled: false`). No orders placed, no mutations issued, no mode changed, no state reset, no code modified, nothing committed or pushed. Every request in this audit was a GET.
