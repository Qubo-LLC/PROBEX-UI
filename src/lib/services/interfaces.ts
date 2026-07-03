// Service interface + registry. After the M5 consolidation the cockpit consumes
// exactly one backend domain — the Quant Engine — so the registry holds a single
// service. Each method is async (the backend contract); each read also exposes an
// optional synchronous `peek*` that returns an immediate snapshot when one is
// available (the mock returns data; the live impl returns null → drives loading).

import type { ApiResult } from './response'

import type {
  EngineHealth, EngineRuntime, EngineStats, EngineConfig,
  SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus,
} from '@/types/engine'

// ─── Engine ────────────────────────────────────────────────────────────────────
// Operational endpoints confirmed against the Postman collection.
// /health and / are served at the host root (not under /api) — their live
// implementations use apiGetHost(); all others use apiGet() against the /api base.

export interface IEngineService {
  getHealth():             Promise<ApiResult<EngineHealth>>
  getRuntime():            Promise<ApiResult<EngineRuntime>>
  getStats():              Promise<ApiResult<EngineStats>>
  getConfig():             Promise<ApiResult<EngineConfig>>
  getSurvival():           Promise<ApiResult<SurvivalStatus>>
  getPriceHistory():       Promise<ApiResult<PriceHistory>>
  getMarkets():            Promise<ApiResult<EngineMarkets>>
  getPositions():          Promise<ApiResult<EnginePositions>>
  getEvents():             Promise<ApiResult<EngineEvents>>
  getEdges():              Promise<ApiResult<EngineEdges>>
  getIdentity():           Promise<ApiResult<EngineIdentity>>
  getExecutionStatus():    Promise<ApiResult<ExecutionStatus>>
  peekHealth?():           EngineHealth | null
  peekRuntime?():          EngineRuntime | null
  peekStats?():            EngineStats | null
  peekConfig?():           EngineConfig | null
  peekSurvival?():         SurvivalStatus | null
  peekPriceHistory?():     PriceHistory | null
  peekMarkets?():          EngineMarkets | null
  peekPositions?():        EnginePositions | null
  peekEvents?():           EngineEvents | null
  peekEdges?():            EngineEdges | null
  peekIdentity?():         EngineIdentity | null
  peekExecutionStatus?():  ExecutionStatus | null
}

// ─── Registry shape ────────────────────────────────────────────────────────────

export interface ServiceRegistry {
  engine: IEngineService
}
