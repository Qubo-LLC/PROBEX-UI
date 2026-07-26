'use client'

// DomainPage — the shell every consolidated domain page uses.
//
// The IA consolidation collapsed 16 sidebar destinations into 9 domain pages,
// each aligned to a backend API group. This provides the one thing they all
// share: a single page header, a URL-synced tab strip, and exactly one page
// container — so the absorbed views (which render standalone elsewhere) don't
// each contribute their own padding and title.
//
// Tab content is rendered lazily by the caller passing a render function per
// tab, so an inactive tab's component tree is never mounted. That matters here:
// several absorbed pages read large store slices and would otherwise all
// subscribe on every visit to the domain.

import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, useActiveTab, type TabDef } from '@/components/ui/Tabs'
import type { ReactNode } from 'react'

interface DomainPageProps {
  title:     string
  subtitle:  string
  tabs:      readonly TabDef[]
  /** Maps a tab id to its content. Only the active tab's function is called. */
  render:    (activeTabId: string) => ReactNode
  /** Query-param name; defaults to `view`. */
  param?:    string | undefined
  /** Optional header-right slot (status pills, etc). */
  actions?:  ReactNode | undefined
}

export function DomainPage({ title, subtitle, tabs, render, param = 'view', actions }: DomainPageProps) {
  const active = useActiveTab(tabs, param)

  return (
    <div className="page-container flex flex-col gap-4 pb-8 animate-fade-in-up">
      <PageHeader title={title} subtitle={subtitle} {...(actions !== undefined ? { actions } : {})} />
      <Tabs tabs={tabs} param={param} label={`${title} sections`} />
      {render(active)}
    </div>
  )
}
