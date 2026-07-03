// Live backend integration: fetch JSON DTOs via the shared API client, normalize
// via the dto.ts adapters, and return the standard ApiResult. Paths come from the
// central endpoint registry — entries with status other than 'confirmed' throw
// ENDPOINT_NOT_CONFIGURED until the backend confirms them.

import { ok, type ApiResult } from './response'
import type { IEngineService } from './interfaces'
import {
  toEngineHealth, toEngineRuntime, toEngineStats, toEngineConfig, toSurvivalStatus, toPriceHistory,
  toEngineMarkets, toEnginePositions, toEngineEvents, toEngineEdges,
  toEngineIdentity, toExecutionStatus,
} from './dto'
import { apiGet, apiGetHost } from '@/lib/api/client'
import { ENDPOINTS, endpointPath } from '@/lib/api/endpoints'
import type {
  EngineHealthDTO, EngineRuntimeDTO, EngineStatsDTO, EngineConfigDTO, SurvivalDTO, PriceHistoryDTO,
  EngineMarketsDTO, EnginePositionsDTO, EngineEventsDTO, EngineEdgesDTO,
  EngineIdentityDTO, ExecutionStatusDTO,
  EngineHealth, EngineRuntime, EngineStats, EngineConfig, SurvivalStatus, PriceHistory,
  EngineMarkets, EnginePositions, EngineEvents, EngineEdges,
  EngineIdentity, ExecutionStatus,
} from '@/types/engine'

export class LiveEngineService implements IEngineService {
  async getHealth(): Promise<ApiResult<EngineHealth>> {
    // /health lives at the host root, NOT under the /api prefix — must use apiGetHost.
    const dto = await apiGetHost<EngineHealthDTO>(endpointPath(ENDPOINTS.engine.health))
    return ok(toEngineHealth(dto))
  }

  async getRuntime(): Promise<ApiResult<EngineRuntime>> {
    const dto = await apiGet<EngineRuntimeDTO>(endpointPath(ENDPOINTS.engine.runtime))
    return ok(toEngineRuntime(dto))
  }

  async getStats(): Promise<ApiResult<EngineStats>> {
    const dto = await apiGet<EngineStatsDTO>(endpointPath(ENDPOINTS.engine.stats))
    return ok(toEngineStats(dto))
  }

  async getConfig(): Promise<ApiResult<EngineConfig>> {
    const dto = await apiGet<EngineConfigDTO>(endpointPath(ENDPOINTS.engine.variableConfig))
    return ok(toEngineConfig(dto))
  }

  async getSurvival(): Promise<ApiResult<SurvivalStatus>> {
    const dto = await apiGet<SurvivalDTO>(endpointPath(ENDPOINTS.engine.survivalStrategy))
    return ok(toSurvivalStatus(dto))
  }

  async getPriceHistory(): Promise<ApiResult<PriceHistory>> {
    const dto = await apiGet<PriceHistoryDTO>(endpointPath(ENDPOINTS.markets.history))
    return ok(toPriceHistory(dto))
  }

  async getMarkets(): Promise<ApiResult<EngineMarkets>> {
    const dto = await apiGet<EngineMarketsDTO>(endpointPath(ENDPOINTS.markets.list))
    return ok(toEngineMarkets(dto))
  }

  async getPositions(): Promise<ApiResult<EnginePositions>> {
    const dto = await apiGet<EnginePositionsDTO>(endpointPath(ENDPOINTS.positions.list))
    return ok(toEnginePositions(dto))
  }

  async getEvents(): Promise<ApiResult<EngineEvents>> {
    const dto = await apiGet<EngineEventsDTO>(endpointPath(ENDPOINTS.engine.events))
    return ok(toEngineEvents(dto))
  }

  async getEdges(): Promise<ApiResult<EngineEdges>> {
    const dto = await apiGet<EngineEdgesDTO>(endpointPath(ENDPOINTS.markets.edges))
    return ok(toEngineEdges(dto))
  }

  async getIdentity(): Promise<ApiResult<EngineIdentity>> {
    // API root lives at the bare host (like /health) — outside the /api prefix.
    const dto = await apiGetHost<EngineIdentityDTO>(endpointPath(ENDPOINTS.engine.apiRoot))
    return ok(toEngineIdentity(dto))
  }

  async getExecutionStatus(): Promise<ApiResult<ExecutionStatus>> {
    const dto = await apiGet<ExecutionStatusDTO>(endpointPath(ENDPOINTS.engine.executionStatus))
    return ok(toExecutionStatus(dto))
  }
}
