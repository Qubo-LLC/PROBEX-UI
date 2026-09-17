// Adapters for the quant surface: the five mathematical layers and the
// multi-asset / by-category performance endpoints.
//
// Kept separate from dto.ts because this is a distinct backend domain that
// arrived in one piece (see types/quant.ts for provenance), and dto.ts is
// already the largest module in the service layer.
//
// ─── The rule these adapters exist to enforce ────────────────────────────────
// Every one of these endpoints returns numerically complete, well-formed
// payloads even when the engine has learned nothing: zero-filled Shapley
// values, a Brier score of 0 labelled "excellent", Bayesian posteriors still
// sitting on their prior, and Kalman filters reporting a seed price thousands
// of dollars from spot. A naive mapping would hand all of that to the UI as
// measurement. So each adapter computes an explicit `has*` / `initialised`
// flag from the engine's own sample counters, and the domain types document
// that reading the numbers without checking the flag is a bug.

import type {
  KalmanAssetStateDTO, KalmanAssetState,
  KalmanLayerDTO, KalmanMultiAssetDTO, KalmanLayer,
  KellyKalmanLayerDTO, KellyKalmanLayer,
  BayesianLayerDTO, BayesianLayer,
  BrierLayerDTO, BrierLayer,
  ShapleyLayerDTO, ShapleyLayer, ShapleyAttribution,
  MathLayersStatusDTO, MathLayersStatus,
  MathRecommendationsDTO, MathRecommendationsEnvelope, MathRecommendations,
  AssetRegimeDTO, AssetRegime,
  PerformanceBucketDTO, PerformanceBucket,
  PerformanceByCategoryDTO, PerformanceByAssetDTO, PerformanceBuckets,
  MarketMakerMetricsDTO, MarketMakerMetrics,
} from '@/types/quant'
import { isKalmanInitialised, probabilitiesArePartition } from '@/types/quant'
import { naiveUtcToMs } from './dto'

/** win_rate is 0–100 on the wire everywhere; normalize to the 0–1 convention
 *  every domain type in this app uses. Mirrors dto.ts's helper. */
const pctToFraction = (pct: number): number => pct / 100

/** ISO 8601 → epoch ms via dto.ts's helper (the engine's naive strings are
 *  UTC — see naiveUtcToMs); NaN for absent values. */
function isoToMs(iso: string | undefined | null): number {
  if (!iso) return Number.NaN
  return naiveUtcToMs(iso)
}

// These are counts of events the filter has OBSERVED, and the block is declared
// required by the DTO and present on every captured asset. Zero here therefore
// means "none observed", which is a true statement — and the `initialised` gate
// on KalmanAssetState already tells consumers not to read a seed filter's
// numbers at all. So no `?? 0` defence: it would have quietly manufactured the
// same zeros for a genuinely absent block, which is a different fact.
function toMarketMaker(dto: MarketMakerMetricsDTO): MarketMakerMetrics {
  return {
    overreactionCount:          dto.overreaction_count,
    underreactionCount:         dto.underreaction_count,
    overreactionRatio:          dto.overreaction_ratio,
    underreactionRatio:         dto.underreaction_ratio,
    meanReversionOpportunities: dto.mean_reversion_opportunities,
  }
}

// ─── Kalman ──────────────────────────────────────────────────────────────────

export function toKalmanAssetState(symbol: string, dto: KalmanAssetStateDTO): KalmanAssetState {
  return {
    symbol,
    priceEstimate:            dto.price_estimate,
    priceUncertainty:         dto.price_uncertainty,
    velocityEstimate:         dto.velocity_estimate,
    velocityUncertainty:      dto.velocity_uncertainty,
    regime:                   dto.regime,
    probabilityYes:           dto.probability_yes,
    probabilityNo:            dto.probability_no,
    uncertainty:              dto.uncertainty,
    meanReversionOpportunity: dto.mean_reversion_opportunity,
    meanReversionStrength:    dto.mean_reversion_strength,
    marketMaker:              toMarketMaker(dto.market_maker_metrics),
    timestamp:                isoToMs(dto.timestamp),
    initialised:              isKalmanInitialised(dto.regime),
    // Computed here, once, so no consumer has to remember that these two do
    // not sum to 1 (live: 0.88 + 0.20 = 1.08). See the field docs on
    // KalmanAssetState.probabilityYes.
    probabilitiesArePartition: probabilitiesArePartition(dto.probability_yes, dto.probability_no),
  }
}

function toAssetList(assets: Record<string, KalmanAssetStateDTO> | undefined): KalmanAssetState[] {
  if (!assets) return []
  return Object.entries(assets).map(([symbol, state]) => toKalmanAssetState(symbol, state))
}

/** GET /api/math-layers/kalman */
export function toKalmanLayer(dto: KalmanLayerDTO): KalmanLayer {
  return {
    available:     dto.available,
    multiAsset:    dto.multi_asset,
    assets:        toAssetList(dto.assets),
    activeFilters: null,
    timestamp:     isoToMs(dto.timestamp),
  }
}

/** GET /api/performance/kalman-multi-asset — same states, different envelope. */
export function toKalmanMultiAsset(dto: KalmanMultiAssetDTO): KalmanLayer {
  const assets = toAssetList(dto.assets)
  return {
    available:     dto.available,
    // This route exists precisely because the filter bank is multi-asset.
    multiAsset:    assets.length > 1,
    assets,
    activeFilters: dto.active_filters,
    timestamp:     isoToMs(dto.timestamp),
  }
}

// ─── Kelly-Kalman ────────────────────────────────────────────────────────────

export function toKellyKalmanLayer(dto: KellyKalmanLayerDTO): KellyKalmanLayer {
  return {
    totalDecisions:        dto.total_decisions,
    avgPositionSize:       dto.avg_position_size,
    avgKellyFraction:      dto.avg_kelly_fraction,
    avgUncertaintyPenalty: dto.avg_uncertainty_penalty,
    minPositionSize:       dto.min_position_size,
    maxPositionSize:       dto.max_position_size,
    recentDecisions:       dto.recent_decisions ?? [],
    message:               dto.message ?? null,
    hasDecisions:          dto.total_decisions > 0,
  }
}

// ─── Bayesian ────────────────────────────────────────────────────────────────

export function toBayesianLayer(dto: BayesianLayerDTO): BayesianLayer {
  return {
    regimeProbs: dto.regime_probs === undefined ? null : {
      bull:     dto.regime_probs.bull,
      bear:     dto.regime_probs.bear,
      sideways: dto.regime_probs.sideways,
    },
    mostLikelyRegime:     dto.most_likely_regime,
    regimeUncertainty:    dto.regime_uncertainty,
    edgeThresholdMean:    dto.edge_threshold_mean,
    edgeThresholdStd:     dto.edge_threshold_std,
    positionSizeMean:     dto.position_size_mean,
    positionSizeStd:      dto.position_size_std,
    parameterUncertainty: dto.parameter_uncertainty,
    winRateMean:          dto.win_rate_mean,
    winRateStd:           dto.win_rate_std,
    totalTrades:          dto.total_trades,
    timestamp:            isoToMs(dto.timestamp),
    hasPosterior:         dto.total_trades > 0,
  }
}

// ─── Brier ───────────────────────────────────────────────────────────────────

export function toBrierLayer(dto: BrierLayerDTO): BrierLayer {
  return {
    brierScore:           dto.brier_score,
    brierSkillScore:      dto.brier_skill_score,
    calibrationStatus:    dto.calibration_status,
    totalPredictions:     dto.total_predictions,
    isOverconfident:      dto.is_overconfident,
    overconfidenceRatio:  dto.overconfidence_ratio,
    isUnderconfident:     dto.is_underconfident,
    underconfidenceRatio: dto.underconfidence_ratio,
    calibrationCurve:     dto.calibration_curve ?? [],
    timestamp:            isoToMs(dto.timestamp),
    hasPredictions:       dto.total_predictions > 0,
  }
}

// ─── Shapley ─────────────────────────────────────────────────────────────────

export function toShapleyLayer(dto: ShapleyLayerDTO): ShapleyLayer {
  const attributions: ShapleyAttribution[] = Object.entries(dto.all_attributions ?? {}).map(
    ([signal, a]) => ({
      signal,
      shapleyValue:  a.shapley_value,
      sampleSize:    a.sample_size,
      confidence:    a.confidence,
      isPositive:    a.is_positive,
      isSignificant: a.is_significant,
    }),
  )
  return {
    totalTrades:  dto.total_trades,
    totalSignals: dto.total_signals,
    bestSignals:  dto.best_signals ?? [],
    worstSignals: dto.worst_signals ?? [],
    recommendations: {
      keep:    dto.recommendations?.keep ?? [],
      remove:  dto.recommendations?.remove ?? [],
      monitor: dto.recommendations?.monitor ?? [],
    },
    attributions,
    timestamp:      isoToMs(dto.timestamp),
    hasAttribution: dto.total_trades > 0,
  }
}

// ─── /api/math-layers/status ─────────────────────────────────────────────────

export function toMathLayersStatus(dto: MathLayersStatusDTO): MathLayersStatus {
  const l = dto.layers
  const kalmanDto = l?.kalman_filter
  return {
    available: dto.available,
    message:   dto.message ?? null,
    kalman: kalmanDto === undefined ? null : {
      available:     kalmanDto.available,
      multiAsset:    kalmanDto.multi_asset,
      assets:        toAssetList(kalmanDto.assets),
      activeFilters: null,
      timestamp:     isoToMs(dto.timestamp),
    },
    kelly:    l?.kelly_kalman        === undefined ? null : toKellyKalmanLayer(l.kelly_kalman),
    bayesian: l?.bayesian_inference  === undefined ? null : toBayesianLayer(l.bayesian_inference),
    brier:    l?.brier_calibration   === undefined ? null : toBrierLayer(l.brier_calibration),
    shapley:  l?.shapley_attribution === undefined ? null : toShapleyLayer(l.shapley_attribution),
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── /api/math-layers/recommendations ────────────────────────────────────────

function toAssetRegime(symbol: string, dto: AssetRegimeDTO): AssetRegime {
  return {
    symbol,
    regime:           dto.regime,
    priceUncertainty: dto.price_uncertainty,
    velocityEstimate: dto.velocity_estimate,
    probabilityYes:   dto.probability_yes,
    probabilityNo:    dto.probability_no,
  }
}

export function toMathRecommendations(dto: MathRecommendationsDTO): MathRecommendationsEnvelope {
  const r = dto.recommendations
  const recommendations: MathRecommendations | null =
    !dto.available || r === undefined ? null : {
      currentBtcPrice: r.current_btc_price,
      assetRegimes: Object.entries(r.multi_asset_regimes ?? {}).map(
        ([symbol, regime]) => toAssetRegime(symbol, regime),
      ),
      marketRegime:          r.market_regime,
      priceUncertainty:      r.price_uncertainty,
      velocityEstimate:      r.velocity_estimate,
      kalmanProbYes:         r.kalman_prob_yes,
      kalmanProbNo:          r.kalman_prob_no,
      baseKellyFraction:     r.base_kelly_fraction,
      maxPositionPct:        r.max_position_pct,
      minPositionPct:        r.min_position_pct,
      bayesianWinRate:       r.bayesian_win_rate,
      bayesianEdgeThreshold: r.bayesian_edge_threshold,
      bayesianPositionSize:  r.bayesian_position_size,
      bayesianRegimeProbs: r.bayesian_regime_probs === undefined ? null : {
        bull:     r.bayesian_regime_probs.bull,
        bear:     r.bayesian_regime_probs.bear,
        sideways: r.bayesian_regime_probs.sideways,
      },
      brierScore:        r.brier_score,
      calibrationStatus: r.calibration_status,
      isOverconfident:   r.is_overconfident,
      isUnderconfident:  r.is_underconfident,
      bestSignals:       r.best_signals ?? [],
      worstSignals:      r.worst_signals ?? [],
      signalRecommendations: {
        keep:    r.signal_recommendations?.keep ?? [],
        remove:  r.signal_recommendations?.remove ?? [],
        monitor: r.signal_recommendations?.monitor ?? [],
      },
      overallRecommendation: r.overall_recommendation,
      confidence:            r.confidence,
    }

  return {
    available: dto.available,
    message:   dto.message ?? null,
    recommendations,
    timestamp: isoToMs(dto.timestamp),
  }
}

// ─── Performance buckets ─────────────────────────────────────────────────────

function toPerformanceBucket(key: string, dto: PerformanceBucketDTO): PerformanceBucket {
  // No `?? 0`: the engine only materialises a bucket once it exists, and every
  // captured bucket carries a full set of counts. Defaulting an absent count to
  // zero would report "nothing happened" for "we don't know", and `hasActivity`
  // — derived from exactly these two — would inherit the lie.
  const edges  = dto.edges_detected
  const trades = dto.trades_taken
  return {
    key,
    edgesDetected:   edges,
    tradesTaken:     trades,
    wins:            dto.wins,
    losses:          dto.losses,
    totalPnl:        dto.total_pnl,
    // 2026-09-07 CORRECTION. The comment that stood here claimed "the wire
    // already sends a 0–1 fraction (unlike /api/paper-stats) — confirmed
    // against the live payload, so no scaling". That confirmation was made
    // when every category bucket was empty, so every win_rate was 0 — a value
    // that is identical in both conventions and therefore confirms neither.
    //
    // The live payload now reads `categories.crypto.win_rate: 74.6`, matching
    // /api/paper-stats' 74.6 for the same trades. It is a percentage like every
    // other win_rate this backend sends, and rendering it unscaled would have
    // printed 7460%.
    //
    // Worth noting as a method point: a zero cannot confirm a unit. Fields were
    // re-derived against a populated payload rather than trusted to the earlier
    // note.
    winRate:         pctToFraction(dto.win_rate),
    avgEdgePct:      dto.avg_edge_pct,
    activePositions: dto.active_positions,
    closedPositions: dto.closed_positions,
    hasActivity:     edges > 0 || trades > 0,
  }
}

function toBuckets(
  record:    Record<string, PerformanceBucketDTO> | undefined,
  available: boolean,
  message:   string | undefined,
  timestamp: string,
): PerformanceBuckets {
  const buckets = Object.entries(record ?? {}).map(([key, b]) => toPerformanceBucket(key, b))
  return {
    available,
    message:     message ?? null,
    buckets,
    anyActivity: buckets.some((b) => b.hasActivity),
    timestamp:   isoToMs(timestamp),
  }
}

/** GET /api/performance/by-category — one bucket per market category. */
export function toPerformanceByCategory(dto: PerformanceByCategoryDTO): PerformanceBuckets {
  return toBuckets(dto.categories, dto.available, dto.message, dto.timestamp)
}

/** GET /api/performance/by-asset — one bucket per traded asset symbol.
 *  Observed as `{}`: the engine only materialises a bucket once an asset trades,
 *  so an empty result means "nothing traded yet", NOT "no assets supported". */
export function toPerformanceByAsset(dto: PerformanceByAssetDTO): PerformanceBuckets {
  return toBuckets(dto.assets, dto.available, dto.message, dto.timestamp)
}
