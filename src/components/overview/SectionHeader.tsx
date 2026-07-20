'use client'

// SectionHeader — small section title/subtitle used by Overview's Featured
// and Trending sections (restored from V1's inline helper, git 0e3833a4).
// No "see all →" action yet: it would point at the Markets catalog, which
// still redirects until Phase 2 restores it — omitted rather than linking
// somewhere that doesn't match its label.

interface SectionHeaderProps {
  title:     string
  subtitle?: string
}

export function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--probex-text-primary)' }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--probex-text-muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
