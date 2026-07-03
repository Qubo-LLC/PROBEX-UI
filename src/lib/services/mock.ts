// Mock engine service — backs mock mode (NEXT_PUBLIC_API_MODE=mock) and seeds
// the synchronous-first hooks via peek* so the UI never flashes a loading state.
// The live implementation swaps in behind the same registry (see index.ts).

import { ok, type ApiResult } from './response'
import type { IEngineService, ServiceRegistry } from './interfaces'
import {
  MOCK_ENGINE_HEALTH, MOCK_ENGINE_RUNTIME, MOCK_ENGINE_STATS,
  MOCK_ENGINE_CONFIG, MOCK_SURVIVAL_STATUS, MOCK_PRICE_HISTORY,
  MOCK_ENGINE_MARKETS, MOCK_ENGINE_POSITIONS, MOCK_ENGINE_EVENTS, MOCK_ENGINE_EDGES,
  MOCK_ENGINE_IDENTITY, MOCK_EXECUTION_STATUS,
} from '@/mock/engine'
import type {
  EngineHealth, EngineRuntime, EngineStats, EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus,
} from '@/types/engine'

class MockEngineService implements IEngineService {
  peekHealth():          EngineHealth    { return MOCK_ENGINE_HEALTH }
  peekRuntime():         EngineRuntime   { return MOCK_ENGINE_RUNTIME }
  peekStats():           EngineStats     { return MOCK_ENGINE_STATS }
  peekConfig():          EngineConfig    { return MOCK_ENGINE_CONFIG }
  peekSurvival():        SurvivalStatus  { return MOCK_SURVIVAL_STATUS }
  peekPriceHistory():    PriceHistory    { return MOCK_PRICE_HISTORY }
  peekMarkets():         EngineMarkets   { return MOCK_ENGINE_MARKETS }
  peekPositions():       EnginePositions { return MOCK_ENGINE_POSITIONS }
  peekEvents():          EngineEvents    { return MOCK_ENGINE_EVENTS }
  peekEdges():           EngineEdges     { return MOCK_ENGINE_EDGES }
  peekIdentity():        EngineIdentity  { return MOCK_ENGINE_IDENTITY }
  peekExecutionStatus(): ExecutionStatus { return MOCK_EXECUTION_STATUS }

  async getHealth():          Promise<ApiResult<EngineHealth>>    { return ok(MOCK_ENGINE_HEALTH) }
  async getRuntime():         Promise<ApiResult<EngineRuntime>>   { return ok(MOCK_ENGINE_RUNTIME) }
  async getStats():           Promise<ApiResult<EngineStats>>     { return ok(MOCK_ENGINE_STATS) }
  async getConfig():          Promise<ApiResult<EngineConfig>>    { return ok(MOCK_ENGINE_CONFIG) }
  async getSurvival():        Promise<ApiResult<SurvivalStatus>>  { return ok(MOCK_SURVIVAL_STATUS) }
  async getPriceHistory():    Promise<ApiResult<PriceHistory>>    { return ok(MOCK_PRICE_HISTORY) }
  async getMarkets():         Promise<ApiResult<EngineMarkets>>   { return ok(MOCK_ENGINE_MARKETS) }
  async getPositions():       Promise<ApiResult<EnginePositions>> { return ok(MOCK_ENGINE_POSITIONS) }
  async getEvents():          Promise<ApiResult<EngineEvents>>    { return ok(MOCK_ENGINE_EVENTS) }
  async getEdges():           Promise<ApiResult<EngineEdges>>     { return ok(MOCK_ENGINE_EDGES) }
  async getIdentity():        Promise<ApiResult<EngineIdentity>>  { return ok(MOCK_ENGINE_IDENTITY) }
  async getExecutionStatus(): Promise<ApiResult<ExecutionStatus>> { return ok(MOCK_EXECUTION_STATUS) }
}

export const mockServices: ServiceRegistry = {
  engine: new MockEngineService(),
}
