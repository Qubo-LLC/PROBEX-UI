// Quant-layer contract — the engine's five mathematical layers and its
// multi-asset performance surface.
//
// ─── Provenance ──────────────────────────────────────────────────────────────
// Every shape here was derived from a REAL captured response against
// https://qubo-probex.duckdns.org on 2026-08-20, not from documentation. These
// endpoints appear in the attached `postman_collection.json` (folders
// "5 Mathematical Layers" and "Performance Monitoring by Category") but NOT in
// the collection published to the Postman workspace, which is the older
// artifact — see docs/BACKEND_CONTRACT_2026-08-20.md.
//
// ─── The uninitialised-filter trap ───────────────────────────────────────────
// The Kalman filters answer with a full, well-formed state even when they have
// never been fed a price: BTC reported `price_estimate: 64000` while
// /api/stats reported an actual spot of 72616.8, with `regime: "unknown"` and
// `velocity_estimate: 0`. Those are SEED values, not estimates. Rendering them
// as "the engine's view of price" would be a fabricated claim dressed in a real
// payload — the most dangerous kind, because nothing about the response looks
// wrong. `KalmanAssetState.initialised` is the discriminator, and
// `isKalmanInitialised()` below is the only sanctioned way to compute it.

// ─── Shared ──────────────────────────────────────────────────────────────────

/** Regime label reported by the Kalman layer. 'unknown' means NOT YET FITTED. */
export type MarketRegime = 'bull' | 'bear' | 'sideways' | 'unknown' | (string & {})

export interface MarketMakerMetricsDTO {
  overreaction_count:           number
  underreaction_count:          number
  overreaction_ratio:           number
  underreaction_ratio:          number
  mean_reversion_opportunities: number
}

export interface MarketMakerMetrics {
  overreactionCount:          number
  underreactionCount:         number
  overreactionRatio:          number
  underreactionRatio:         number
  meanReversionOpportunities: number
}

// ─── Layer 1 — Kalman filter (multi-asset) ───────────────────────────────────

export interface KalmanAssetStateDTO {
  price_estimate:             number
  price_uncertainty:          number
  velocity_estimate:          number
  velocity_uncertainty:       number
  regime:                     string
  probability_yes:            number
  probability_no:             number
  uncertainty:                number
  mean_reversion_opportunity: boolean
  mean_reversion_strength:    number
  market_maker_metrics:       MarketMakerMetricsDTO
  timestamp:                  string  // ISO 8601
}

export interface KalmanAssetState {
  /** Asset symbol this state belongs to (BTC / ETH / SOL observed). */
  symbol:                   string
  priceEstimate:            number
  priceUncertainty:         number
  velocityEstimate:         number
  velocityUncertainty:      number
  regime:                   MarketRegime
  /**
   * The filter's YES probability, exactly as reported.
   *
   * ⚠️ `probabilityYes` and `probabilityNo` are NOT complementary and must
   * never be rendered as two halves of one bar, nor one derived from the other.
   * Live capture 2026-09-07: BTC and ETH both report `yes 0.88 / no 0.20`,
   * summing to 1.08. These are two independently-estimated directional
   * confidences from the filter bank, not a probability distribution over a
   * partition, so `1 - probabilityYes` is not `probabilityNo` and the pair does
   * not normalise. `probabilitiesArePartition` below is the sanctioned check.
   */
  probabilityYes:           number
  /** See `probabilityYes` — independently estimated, not `1 - yes`. */
  probabilityNo:            number
  uncertainty:              number
  meanReversionOpportunity: boolean
  meanReversionStrength:    number
  marketMaker:              MarketMakerMetrics
  timestamp:                number  // epoch ms
  /** False while the filter is still holding its seed values — see file header.
   *  A UI must not present `priceEstimate` as an estimate when this is false. */
  initialised:              boolean
  /**
   * True only when the two probabilities actually sum to 1 within tolerance.
   *
   * Derived at adapter time so a consumer cannot forget to check. When false —
   * which is the live case today — the pair may only be shown as two separate
   * readings; any stacked bar, donut, or "% YES vs % NO" split would assert a
   * partition the engine did not report.
   */
  probabilitiesArePartition: boolean
}

/**
 * Do a Kalman asset's YES/NO probabilities form a partition?
 *
 * Tolerance is 0.01 — wide enough for float noise and the engine's own
 * rounding, far too narrow to admit the observed 1.08.
 */
export function probabilitiesArePartition(yes: number, no: number): boolean {
  if (!Number.isFinite(yes) || !Number.isFinite(no)) return false
  return Math.abs(yes + no - 1) <= 0.01
}

/** GET /api/math-layers/kalman — { available, multi_asset, assets, timestamp }. */
export interface KalmanLayerDTO {
  available:   boolean
  multi_asset: boolean
  assets:      Record<string, KalmanAssetStateDTO>
  timestamp:   string
}

/** GET /api/performance/kalman-multi-asset — adds `active_filters`, no `multi_asset`. */
export interface KalmanMultiAssetDTO {
  available:      boolean
  active_filters: number
  assets:         Record<string, KalmanAssetStateDTO>
  timestamp:      string
}

export interface KalmanLayer {
  available:     boolean
  multiAsset:    boolean
  /** One entry per tracked asset, in the order the engine returned them. */
  assets:        KalmanAssetState[]
  /** Number of filters the engine says are active (multi-asset route only). */
  activeFilters: number | null
  timestamp:     number
}

// ─── Layer 2 — Kelly-Kalman sizing ───────────────────────────────────────────

export interface KellyKalmanLayerDTO {
  total_decisions:         number
  avg_position_size:       number
  avg_kelly_fraction:      number
  avg_uncertainty_penalty: number
  min_position_size:       number
  max_position_size:       number
  recent_decisions:        unknown[]
  /** Present instead of meaningful numbers when no sizing has happened yet. */
  message?:                string
}

export interface KellyKalmanLayer {
  totalDecisions:        number
  avgPositionSize:       number
  avgKellyFraction:      number
  avgUncertaintyPenalty: number
  minPositionSize:       number
  maxPositionSize:       number
  /** Item schema unconfirmed — no non-empty sample has been observed. */
  recentDecisions:       unknown[]
  message:               string | null
  /** False when `total_decisions` is 0 — every average is a placeholder zero. */
  hasDecisions:          boolean
}

// ─── Layer 3 — Bayesian inference ────────────────────────────────────────────

export interface RegimeProbsDTO { bull: number; bear: number; sideways: number }
export interface RegimeProbs    { bull: number; bear: number; sideways: number }

export interface BayesianLayerDTO {
  regime_probs:          RegimeProbsDTO
  most_likely_regime:    string
  regime_uncertainty:    number
  edge_threshold_mean:   number
  edge_threshold_std:    number
  position_size_mean:    number
  position_size_std:     number
  parameter_uncertainty: number
  win_rate_mean:         number
  win_rate_std:          number
  total_trades:          number
  timestamp:             string
}

export interface BayesianLayer {
  /** null when the engine omitted the block. NOT zero-filled: probabilities
   *  over a partition must sum to 1, so `{bull:0,bear:0,sideways:0}` is not a
   *  low reading — it is a contradiction, and would render as one. */
  regimeProbs:          RegimeProbs | null
  mostLikelyRegime:     MarketRegime
  regimeUncertainty:    number
  edgeThresholdMean:    number
  edgeThresholdStd:     number
  positionSizeMean:     number
  positionSizeStd:      number
  parameterUncertainty: number
  winRateMean:          number
  winRateStd:           number
  totalTrades:          number
  timestamp:            number
  /** False while `total_trades` is 0: the posteriors are still the PRIOR.
   *  `winRateMean: 0.5` then means "no information", not "measured 50%". */
  hasPosterior:         boolean
}

// ─── Layer 4 — Brier calibration ─────────────────────────────────────────────

export interface BrierLayerDTO {
  brier_score:           number
  brier_skill_score:     number
  calibration_status:    string
  total_predictions:     number
  is_overconfident:      boolean
  overconfidence_ratio:  number
  is_underconfident:     boolean
  underconfidence_ratio: number
  calibration_curve:     unknown[]
  timestamp:             string
}

export interface BrierLayer {
  brierScore:           number
  brierSkillScore:      number
  /** Engine's own label. NOTE: reads "excellent" at zero predictions — that is
   *  a default, not an assessment. Gate any display on `hasPredictions`. */
  calibrationStatus:    string
  totalPredictions:     number
  isOverconfident:      boolean
  overconfidenceRatio:  number
  isUnderconfident:     boolean
  underconfidenceRatio: number
  /** Item schema unconfirmed — no non-empty sample has been observed. */
  calibrationCurve:     unknown[]
  timestamp:            number
  /** False when `total_predictions` is 0 — every score above is meaningless. */
  hasPredictions:       boolean
}

// ─── Layer 5 — Shapley attribution ───────────────────────────────────────────

export interface ShapleyAttributionDTO {
  shapley_value:  number
  sample_size:    number
  confidence:     number
  is_positive:    boolean
  is_significant: boolean
}

export interface ShapleyAttribution {
  signal:        string
  shapleyValue:  number
  sampleSize:    number
  confidence:    number
  isPositive:    boolean
  isSignificant: boolean
}

export interface SignalRecommendationsDTO {
  keep:    string[]
  remove:  string[]
  monitor: string[]
}

export interface SignalRecommendations {
  keep:    string[]
  remove:  string[]
  monitor: string[]
}

export interface ShapleyLayerDTO {
  total_trades:      number
  total_signals:     number
  best_signals:      unknown[]
  worst_signals:     unknown[]
  recommendations:   SignalRecommendationsDTO
  all_attributions:  Record<string, ShapleyAttributionDTO>
  timestamp:         string
}

export interface ShapleyLayer {
  totalTrades:     number
  totalSignals:    number
  bestSignals:     unknown[]
  worstSignals:    unknown[]
  recommendations: SignalRecommendations
  /** One entry per signal the engine tracks, in returned order. */
  attributions:    ShapleyAttribution[]
  timestamp:       number
  /** False when `total_trades` is 0 — every Shapley value is an unfitted zero. */
  hasAttribution:  boolean
}

// ─── GET /api/math-layers/status ─────────────────────────────────────────────

export interface MathLayersStatusDTO {
  available: boolean
  layers?: {
    kalman_filter?:       { available: boolean; multi_asset: boolean; assets: Record<string, KalmanAssetStateDTO> }
    kelly_kalman?:        KellyKalmanLayerDTO
    bayesian_inference?:  BayesianLayerDTO
    brier_calibration?:   BrierLayerDTO
    shapley_attribution?: ShapleyLayerDTO
  }
  message?:  string
  timestamp: string
}

export interface MathLayersStatus {
  available: boolean
  message:   string | null
  /** Each layer is null when the engine omitted it — never a zero-filled stub. */
  kalman:    KalmanLayer      | null
  kelly:     KellyKalmanLayer | null
  bayesian:  BayesianLayer    | null
  brier:     BrierLayer       | null
  shapley:   ShapleyLayer     | null
  timestamp: number
}

// ─── GET /api/math-layers/recommendations ────────────────────────────────────

export interface AssetRegimeDTO {
  regime:            string
  price_uncertainty: number
  velocity_estimate: number
  probability_yes:   number
  probability_no:    number
}

export interface AssetRegime {
  symbol:           string
  regime:           MarketRegime
  priceUncertainty: number
  velocityEstimate: number
  probabilityYes:   number
  probabilityNo:    number
}

export interface MathRecommendationsInnerDTO {
  current_btc_price:       number
  multi_asset_regimes:     Record<string, AssetRegimeDTO>
  market_regime:           string
  price_uncertainty:       number
  velocity_estimate:       number
  kalman_prob_yes:         number
  kalman_prob_no:          number
  base_kelly_fraction:     number
  max_position_pct:        number
  min_position_pct:        number
  bayesian_win_rate:       number
  bayesian_edge_threshold: number
  bayesian_position_size:  number
  bayesian_regime_probs:   RegimeProbsDTO
  brier_score:             number
  calibration_status:      string
  is_overconfident:        boolean
  is_underconfident:       boolean
  best_signals:            unknown[]
  worst_signals:           unknown[]
  signal_recommendations:  SignalRecommendationsDTO
  overall_recommendation:  string
  confidence:              string
}

export interface MathRecommendationsDTO {
  available:        boolean
  recommendations?: MathRecommendationsInnerDTO
  message?:         string
  timestamp:        string
}

export interface MathRecommendations {
  currentBtcPrice:       number
  /** Per-asset regime view — the multi-asset spine of this payload. */
  assetRegimes:          AssetRegime[]
  marketRegime:          MarketRegime
  priceUncertainty:      number
  velocityEstimate:      number
  kalmanProbYes:         number
  kalmanProbNo:          number
  baseKellyFraction:     number
  maxPositionPct:        number
  minPositionPct:        number
  bayesianWinRate:       number
  bayesianEdgeThreshold: number
  bayesianPositionSize:  number
  /** null when omitted — see BayesianLayer.regimeProbs for why not zeros. */
  bayesianRegimeProbs:   RegimeProbs | null
  brierScore:            number
  calibrationStatus:     string
  isOverconfident:       boolean
  isUnderconfident:      boolean
  bestSignals:           unknown[]
  worstSignals:          unknown[]
  signalRecommendations: SignalRecommendations
  /** e.g. "SKIP" — the engine's own verdict string. */
  overallRecommendation: string
  /** e.g. "low" — the engine's own confidence label. */
  confidence:            string
}

export interface MathRecommendationsEnvelope {
  available:       boolean
  message:         string | null
  /** null when the engine has no recommendation to give. */
  recommendations: MathRecommendations | null
  timestamp:       number
}

// ─── GET /api/performance/by-category and /by-asset ──────────────────────────

export interface PerformanceBucketDTO {
  edges_detected:   number
  trades_taken:     number
  wins:             number
  losses:           number
  total_pnl:        number
  win_rate:         number
  avg_edge_pct:     number
  active_positions: number
  closed_positions: number
}

export interface PerformanceBucket {
  /** Category name (crypto/macro/politics/sports/entertainment/science_tech)
   *  or asset symbol, depending on which endpoint produced it. */
  key:             string
  edgesDetected:   number
  tradesTaken:     number
  wins:            number
  losses:          number
  totalPnl:        number
  /** 0–1. The wire sends 0 both for "no trades" and for "all losses" —
   *  `hasActivity` is the only safe way to tell those apart. */
  winRate:         number
  avgEdgePct:      number
  activePositions: number
  closedPositions: number
  /** False when the bucket has seen no edges AND no trades. */
  hasActivity:     boolean
}

export interface PerformanceByCategoryDTO {
  available:         boolean
  categories:        Record<string, PerformanceBucketDTO>
  total_categories?: number
  message?:          string
  timestamp:         string
}

/** /by-asset returns the same bucket shape keyed by symbol. Observed empty
 *  (`assets: {}`) — the engine only creates a bucket once an asset trades. */
export interface PerformanceByAssetDTO {
  available: boolean
  assets:    Record<string, PerformanceBucketDTO>
  message?:  string
  timestamp: string
}

export interface PerformanceBuckets {
  available:   boolean
  message:     string | null
  buckets:     PerformanceBucket[]
  /** True when at least one bucket has recorded any edge or trade. */
  anyActivity: boolean
  timestamp:   number
}

// ─── Guards ──────────────────────────────────────────────────────────────────

/**
 * A Kalman filter is only meaningful once it has actually tracked a price.
 * Until then it reports its seed (`regime: "unknown"`, `velocity_estimate: 0`)
 * and a `price_estimate` that can be tens of thousands of dollars away from
 * spot. Treat that as "no estimate", never as an estimate.
 */
export function isKalmanInitialised(regime: string): boolean {
  return regime !== 'unknown' && regime !== ''
}
