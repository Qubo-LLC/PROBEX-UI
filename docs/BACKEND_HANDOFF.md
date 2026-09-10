# Backend handoff — findings for Jake

**Date:** 2026-09-07
**Probed against:** `https://qubo-probex.duckdns.org/api` (nginx → engine)
**Engine state at probe time:** `mode: paper`, uptime ~6.8h, 13/14 components up, 59 paper trades, +$22.38

---

## Summary

The engine is **healthy and fast**. 44 of 47 GET routes answered 200 with a median of ~265 ms, and all 8 POST mutation routes are registered. The "engine wedges under trivial read load" and "markets / research intermittently stall" behaviour that shaped the frontend's polling tiers and circuit breaker **did not reproduce once** across ~60 requests.

Five issues are below. Only the first blocks anything; the rest are correctness and observability problems that the frontend cannot fix from its side without fabricating data.

---

## B-1 · Three `/api/math-layers/*` routes return a deterministic 500 — **P1**

| Route | Status | Attempts |
|---|---|---|
| `GET /api/math-layers/status` | **500** | 3/3 |
| `GET /api/math-layers/recommendations` | **500** | 3/3 |
| `GET /api/math-layers/brier` | **500** | 3/3 |
| `GET /api/math-layers/kalman` | 200 | 3/3 |
| `GET /api/math-layers/bayesian` | 200 | 3/3 |
| `GET /api/math-layers/shapley` | 200 | 3/3 |

**Response:** `Internal Server Error` (plain text, not the usual JSON `{"detail": ...}` — so this is an unhandled exception escaping the handler, not a raised `HTTPException`).

**Timing:** 0.81–1.48 s, i.e. it fails *after* doing work, not at routing.

**Hypothesis:** Brier is the common dependency. `/status` composes all five layers and `/recommendations` consumes the calibration; `brier` alone also fails, while the three routes that do **not** touch Brier all succeed. One broken calibration layer plausibly takes down all three.

**Frontend dependency:** None, as of this pass. A store-slice consumer audit found **zero** components reading `mathLayersStatus` or `mathRecommendations`. The frontend was polling two of these every 60 s into a guaranteed 500; those polls have been removed and the three routes demoted to `backend-error` in the endpoint registry so they cannot be called.

**Impact:** No user-visible breakage today. It does mean the entire five-layer quant surface is unavailable to build against.

**Requested investigation:** The traceback from `/api/math-layers/brier`. If Brier is the root cause, fixing it likely restores all three.

**Explicitly NOT done on the frontend:** no fallback, no default, no zero-filling. A failed calibration read must never become `brier_score: 0` — that reads as *perfect* calibration rather than as *no measurement*.

---

## B-2 · The analytics engine records every trade as a loss — **P1**

`GET /api/analytics/*` and `GET /api/paper-stats` describe the same trades and disagree completely:

| | `/api/analytics/segments` | `/api/analytics/summary` | `/api/paper-stats` | `/api/trades/ledger` |
|---|---|---|---|---|
| trades | 62 | 62 | 59 | — |
| wins | **0** | — | **44** | 4 of last 5 |
| losses | **62** | — | 15 | 1 of last 5 |
| win rate | **0** | **0** | **74.6** | **80** |
| total P&L | **0** | **0** | **22.38** | 11.797 (last 5) |

Every `/api/analytics` segment — `category:crypto`, `edge_bucket:10%+`, `confidence:high` — reports `wins: 0`, `losses: <all>`, `total_pnl: 0`, while carrying a plausible `avg_edge_pct` and `avg_confidence`. So the analytics engine is ingesting the trades and computing edge/confidence correctly, but the **outcome** field is arriving as a loss (or never being set) and P&L as zero.

`/api/analytics/signals` shows the same: all 7 signals at `accuracy: 0`, `avg_edge_when_correct: 0`.

**Requested investigation:** How the analytics engine receives trade resolution. The paper trader and the resolution tracker both have the correct outcome (`positions/history` items carry `won: true`), so the defect is likely in the hand-off to `analytics_engine`, not in the resolution itself.

**Impact:** `/api/analytics/*` is currently unusable as a performance source. The frontend does not present it as one.

---

## B-3 · `/api/stats` disagrees with `/api/positions` and `/api/portfolio` — **P2**

| Field | `/api/stats` | Contradicted by |
|---|---|---|
| `active_positions: 0` | | `/api/positions` → `count: 3` |
| `total_pnl: 0` | | `/api/portfolio` → `pnl.total: 22.3763` |
| `unrealized_pnl: 0`, `realized_pnl: 0` | | `/api/portfolio` → `realized: 22.3763` |
| `orders_executed: 62` | | `/api/execution/status` → `total_trades: 0` |

`/api/stats` appears to be reporting the **live execution engine's** counters (correctly all-zero in paper mode) alongside `orders_executed: 62`, which is counting paper orders. That mixture is the problem: within a single response, some counters describe live order flow and one describes the paper session.

**Requested clarification:** Which surface is `/api/stats` intended to describe? If it is a live-execution summary, `orders_executed` should be 0 in paper mode. If it is a mode-aware summary, `active_positions` and `total_pnl` should follow the paper trader.

**Frontend handling:** `/api/stats` is used for price feed, uptime and component health only. Performance is now selected by engine mode — paper mode reads `/api/paper-stats`, live mode reads `/api/execution/status` — and the two are never merged. See `src/lib/display/performanceSource.ts`.

---

## B-4 · Market data is ~7 h stale and no market endpoint says so — **P2**

`/api/health` knows:

```json
{ "name": "api_access", "healthy": false,
  "message": "Market data stale (24623.7s old, 10 markets cached)" }
```

But `/api/markets`, `/api/markets/:id` and `/api/markets/history/summary` all return those cached markets with **HTTP 200 and no staleness field**. Every market in the current `/api/markets` response has a `closes_at` in the past (e.g. `2026-09-07T13:25:00Z`, returned at `20:11Z`).

The engine is meanwhile opening positions against them — `/api/positions` shows a position opened at `20:02Z` on an Ethereum market whose window was `9:15AM-9:30AM ET`.

**Requested change:** expose freshness metadata on the market endpoints themselves, e.g.

```json
{ "markets": [...], "count": 10,
  "cache_age_seconds": 24623.7,
  "is_stale": true,
  "last_refreshed": "2026-09-07T13:21:20Z",
  "timestamp": "2026-09-07T20:11:49Z" }
```

`/api/balance` already does exactly this with `cache_age_sec` / `cache_fresh` — the same shape on markets would be ideal and needs no new vocabulary.

**Requested investigation, separately:** why the market fetcher stopped refreshing while `main_loop` reports a 0.0 s heartbeat and `market_fetcher: true`.

**Frontend handling (interim):** market expiry is derived from `closes_at`, which is a confirmed wire field, and a closed market now renders an explicit "This market has closed" notice. This is a derivation from confirmed data, not an inference — but it only catches *expired*, not *stale-but-unexpired*, so it is not a substitute for the metadata above.

---

## B-5 · `/api/execution/status` `win_rate` unit — **P3, confirmation only**

Every other `win_rate` the engine sends is a **percentage** (0–100): `/api/paper-stats` → 74.6, `/api/trades/ledger` → 80, `/api/survival/patterns` → 100, `/api/performance/by-category` → 74.6, `/api/portfolio` → 74.6.

`/api/execution/status` has only ever been observed at `win_rate: 0`, which is identical under both conventions, so it could not be confirmed by observation. The frontend now treats it as a percentage, consistent with every sibling.

**Please confirm** it is 0–100 there too. If it is a 0–1 fraction, say so and we will special-case it — but a single field using the opposite convention to every other field in the same API is worth avoiding regardless.

---

## Routes confirmed working (no action needed)

All of these returned 200 with a well-formed payload:

`/api/health` · `/api/stats` · `/api/runtime` · `/api/config` · `/api/positions` · `/api/positions/history` · `/api/markets` · **`/api/markets/:market_id`** · `/api/markets/:market_id/history` · `/api/markets/history/summary` · `/api/price-history` · `/api/edges` · `/api/events` (incl. `?type=` filtering) · `/api/survival` · `/api/survival/patterns` · `/api/consensus` · `/api/consensus/bias` · `/api/consensus/history` · `/api/research/reports` · `/api/paper-stats` · `/api/paper/status` · `/api/execution/status` · `/api/execution/policy` · `/api/execution/trades` · `/api/execution/orders` (+ `/:id`, `/active/:id`, `/closed/:id`) · `/api/portfolio` · `/api/portfolio/summary` · `/api/portfolio/history` · `/api/portfolio/performance` · `/api/balance` · `/api/analytics/{segments,signals,summary,top-segments,hourly}` · `/api/trades/ledger` · `/api/system/metrics` · `/api/math-layers/{kalman,bayesian,shapley}` · `/api/performance/{by-category,by-asset,kalman-multi-asset}`

All 8 POST routes are registered (verified by GET → 405, no mutation executed):
`/api/paper/{start,stop,reset,resolve}` · `/api/execution/{create,emergency-stop,close/:id,cancel/:id}`

### Worth calling out as newly useful

**`GET /api/markets/:market_id` works.** It was marked broken in our registry on 2026-07-25 ("hangs with no response") and now returns 200 on 4/4 attempts, ~1.2 s, 32.7 KB — the market **plus 100 history points in one call**. It is now the market detail page's primary source. Thank you; if that was a deliberate fix it went unnoticed on our side for six weeks, which is on us.

---

## Two small requests

1. **An OpenAPI schema.** `/openapi.json`, `/docs` and `/redoc` all 404. FastAPI generates this for free; without it we cannot tell whether a route has been added or removed except by guessing paths, and "did the contract change?" is unanswerable rather than merely unanswered. This would have shortened this audit considerably.

2. **A note when routes change.** Both of the biggest findings this pass — a route that started working and three that started failing — were drift we caught only by re-probing every endpoint by hand.

---

## Kalman probabilities — observation, not a defect report

`/api/math-layers/kalman` and `/api/performance/kalman-multi-asset` report, for BTC and ETH:

```json
{ "probability_yes": 0.88, "probability_no": 0.20 }
```

These sum to 1.08. We have assumed this is **intentional** — two independently-estimated directional confidences rather than a distribution over a partition — and the frontend now carries an explicit `probabilitiesArePartition` flag so no UI can render them as two halves of one bar or derive one from the other.

If they *are* meant to be complementary, this is a bug worth knowing about. Either way a one-line confirmation would let us document it properly.
