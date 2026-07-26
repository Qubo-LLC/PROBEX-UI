// Shared wrapper class for views that render BOTH as a standalone route and as
// a tab inside a consolidated domain page.
//
// The IA consolidation (16 routes → 9 domain pages) absorbed several pages into
// tabs. Rather than fork each one, they take an `embedded` flag: standalone
// they keep the page container, bottom padding, entrance animation and their
// own PageHeader; embedded they drop all of that, because the host page already
// provides the container and header and a nested one would double the padding
// and stack two titles.

/** Props for a view that can render standalone or inside a tab. */
export interface EmbeddableProps {
  /** True when rendered inside a host page's tab panel. */
  embedded?: boolean | undefined
}

/**
 * Outer class for an embeddable view.
 *
 * @param gap Tailwind gap token the view uses between its sections.
 */
export function pageShell(embedded: boolean, gap: 'gap-3' | 'gap-4' | 'gap-5' = 'gap-4'): string {
  return embedded
    ? `flex flex-col ${gap}`
    : `page-container flex flex-col ${gap} pb-8 animate-fade-in-up`
}
