'use client'

// useLedgerPages — explicit, user-driven page loads for the Trade Ledger and
// position history (remediation phase 2). Not polled: a ledger that reshuffles
// under the reader is not an audit trail. "Refresh" reloads from the newest
// record; "Load older" walks the engine's cursor where it has one.

import { useCallback, useEffect, useRef, useState } from 'react'
import { services } from '@/lib/services'
import { appendOlderPage } from '@/lib/mappers/ledger'
import type { LedgerItem, LedgerPage, LedgerPageQuery } from '@/types/ledger'

export interface LedgerPagesState {
  status:      'loading' | 'ready' | 'error'
  items:       LedgerItem[]
  /** Metadata of the most recent response (paging, summary, scope). */
  page:        LedgerPage | null
  error:       string | null
  loadingMore: boolean
}

type Filters = Omit<LedgerPageQuery, 'limit' | 'beforeSeq'>

export function useLedgerPages(source: 'ledger' | 'history', pageSize: number, filters: Filters) {
  const [state, setState] = useState<LedgerPagesState>({ status: 'loading', items: [], page: null, error: null, loadingMore: false })
  const abortRef = useRef<AbortController | null>(null)
  const { status, direction } = filters

  const fetchPage = useCallback(async (query: LedgerPageQuery) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const result = await services.engine.getLedgerPage(source, query, controller.signal)
    return result.data
  }, [source])

  const loadFirst = useCallback(async (limit = pageSize) => {
    setState((s) => ({ ...s, status: s.items.length ? s.status : 'loading', error: null }))
    try {
      const page = await fetchPage({ limit, ...(status ? { status } : {}), ...(direction ? { direction } : {}) })
      setState({ status: 'ready', items: page.items, page, error: null, loadingMore: false })
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      setState((s) => ({ ...s, status: 'error', error: (e as { message?: string })?.message ?? 'The engine did not answer.', loadingMore: false }))
    }
  }, [fetchPage, pageSize, status, direction])

  const loadOlder = useCallback(async () => {
    const paging = state.page?.paging
    if (!paging || paging.kind !== 'cursor' || !paging.hasMore || paging.nextBeforeSeq === null) return
    setState((s) => ({ ...s, loadingMore: true }))
    try {
      const page = await fetchPage({
        limit: pageSize, beforeSeq: paging.nextBeforeSeq,
        // the engine returns open trades on the first (cursor-less) page only
        ...(status ? { status } : {}),
        ...(direction ? { direction } : {}),
      })
      setState((s) => ({ status: 'ready', items: appendOlderPage(s.items, page.items), page: { ...page, summary: s.page?.summary ?? page.summary, summaryScope: s.page?.summaryScope ?? page.summaryScope }, error: null, loadingMore: false }))
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return
      setState((s) => ({ ...s, error: (e as { message?: string })?.message ?? 'The engine did not answer.', loadingMore: false }))
    }
  }, [fetchPage, pageSize, state.page, status, direction])

  useEffect(() => {
    void loadFirst()
    return () => abortRef.current?.abort()
  }, [loadFirst])

  return { ...state, refresh: loadFirst, loadOlder }
}
