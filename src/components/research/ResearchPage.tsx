'use client'

// ResearchPage — V3 Phase 5 assembly root, restoring V1's Research concept
// (git 0e3833a4) but honest about what exists today: Opportunity Notes are
// real (built from live /api/edges); the long-form Research Library is a
// complete, richly-styled AwaitingBackend experience, never a blank page.
// V1's Reader/Bookmarks detail-view components are intentionally not
// restored — with zero real articles to read or save, rebuilding that
// interaction shell would be decorative complexity with nothing behind it;
// revisit once research.get exists (see Phase 5 report).

import { PageHeader } from '@/components/ui/PageHeader'
import { OpportunityNotes } from './OpportunityNotes'
import { ResearchLibrary } from './ResearchLibrary'

export function ResearchPage() {
  return (
    <div className="page-container flex flex-col gap-5 pb-8 animate-fade-in-up">
      <PageHeader
        title="Research"
        subtitle="Engine reasoning, opportunity summaries, and market intelligence"
      />

      <OpportunityNotes />
      <ResearchLibrary />
    </div>
  )
}
