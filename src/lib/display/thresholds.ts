// Edge-requirement wording (remediation phase 2, §12).
//
// The only edge requirement the engine REPORTS is the survival brain's
// `min_edge_threshold` (/api/survival). It is a floor: the brain refuses edges
// below it. The edge detector applies its own per-market-tier threshold, which
// no endpoint reports, and the engine does not document how the two combine
// (engine code, not the API, is where the detector's value lives). So the
// reported figure is never presented as "the" threshold or as what an entry
// "requires": it is labelled as the survival floor, and the detector's value is
// stated as not reported rather than guessed.

export const SURVIVAL_FLOOR_LABEL = 'Survival floor'

export const DETECTOR_THRESHOLD_UNREPORTED =
  'the edge detector’s own threshold is not reported by the engine'
