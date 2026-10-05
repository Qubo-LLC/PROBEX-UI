'use client'

// The controls a preference row uses. Only what Settings renders today: a row,
// a switch, a segmented radio group. The text field, select, "Save changes"
// bar and section card that used to live here served the removed profile,
// notification and workspace panels (2026-09-16) — preferences here apply the
// moment they change, so there is nothing to save.

import type { ReactNode } from 'react'

// ─── Setting row (label + control) ──────────────────────────────────────────

export function SettingRow({
  label, htmlFor, description, children,
}: {
  label:        string
  htmlFor?:     string
  description?: string
  children:     ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3" style={{ borderTop: '1px solid var(--synatra-border)' }}>
      <div className="flex-1 min-w-0">
        <label htmlFor={htmlFor} className="text-xs font-medium block" style={{ color: 'var(--synatra-text-primary)' }}>{label}</label>
        {description && <p className="t-helper m-0 mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0 w-full sm:w-auto sm:flex sm:justify-end">{children}</div>
    </div>
  )
}

// ─── Toggle switch ──────────────────────────────────────────────────────────

export function Toggle({
  checked, onChange, id, label,
}: {
  checked:  boolean
  onChange: (v: boolean) => void
  id?:      string
  label?:   string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="focus-ring relative inline-flex items-center rounded-full transition-colors duration-150 cursor-pointer flex-shrink-0"
      style={{ width: 38, height: 22, background: checked ? 'var(--synatra-primary)' : 'var(--synatra-border-default)' }}
    >
      <span
        className="rounded-full"
        style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 18, height: 18, background: '#fff', transition: 'left 0.15s ease', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      />
    </button>
  )
}

// ─── Segmented control (radio group) ────────────────────────────────────────

export function SegmentedControl<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value:      T
  onChange:   (v: T) => void
  options:    ReadonlyArray<{ value: T; label: string }>
  ariaLabel?: string
}) {
  return (
    <div className="flex rounded-md overflow-hidden w-full sm:w-auto" style={{ border: '1px solid var(--synatra-border-default)' }} role="radiogroup" aria-label={ariaLabel}>
      {options.map((o, i) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="focus-ring flex-1 sm:flex-none text-xs font-medium px-3 py-1.5 cursor-pointer transition-colors duration-100 whitespace-nowrap"
            style={{
              background:  active ? 'var(--synatra-primary-dim)' : 'transparent',
              color:       active ? 'var(--synatra-primary)' : 'var(--synatra-text-muted)',
              borderRight: i < options.length - 1 ? '1px solid var(--synatra-border-default)' : 'none',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
