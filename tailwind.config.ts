import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme]'],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Synatra Design Tokens ────────────────────────────────────────────
      colors: {
        // Brand primitives
        "synatra-cyan":    "var(--synatra-primary)",
        "synatra-blue":    "#3B82F6",
        "synatra-purple":  "var(--synatra-secondary)",
        "synatra-green":   "#10B981",
        "synatra-red":     "#EF4444",
        "synatra-amber":   "#F59E0B",

        // Surface system (theme-reactive via CSS vars)
        "surface-0":      "var(--synatra-bg)",
        "surface-1":      "var(--synatra-surface)",
        "surface-2":      "var(--synatra-surface-2)",
        "surface-3":      "var(--synatra-surface-3)",
        // New steps. surface-lowest is the RECESSED plane (table headers,
        // input troughs, probe rows) that the ladder never had; surface-raised
        // is a name for the existing surface-2 value so call sites can migrate
        // gradually; surface-overlay is the modal/palette plane.
        "surface-lowest": "var(--synatra-surface-lowest)",
        "surface-raised": "var(--synatra-surface-raised)",
        "surface-overlay":"var(--synatra-surface-overlay)",

        // Border system
        "border-subtle":  "var(--synatra-border)",
        "border-default": "var(--synatra-border-default)",
        "border-strong":  "var(--synatra-border-strong)",
        "border-active":  "var(--synatra-border-active)",

        // Text system
        "text-primary":   "var(--synatra-text-primary)",
        "text-secondary": "var(--synatra-text-secondary)",
        "text-muted":     "var(--synatra-text-muted)",
        "text-disabled":  "var(--synatra-text-disabled)",

        // Semantic
        "yes":            "var(--synatra-yes)",
        "no":             "var(--synatra-no)",
        // Ink for text placed ON a filled accent. Per theme, because the
        // correct ink flips with the accent's luminance.
        "on-accent":      "var(--synatra-on-accent)",
        "on-yes":         "var(--synatra-on-yes)",
        "on-no":          "var(--synatra-on-no)",
        // The six data states must never collapse into one another, so each
        // gets its own token rather than borrowing positive/warning/muted.
        "status-live":      "var(--synatra-status-live)",
        "status-stale":     "var(--synatra-status-stale)",
        "status-degraded":  "var(--synatra-status-degraded)",
        "status-offline":   "var(--synatra-status-offline)",
        "status-synthetic": "var(--synatra-status-synthetic)",
        "positive":       "var(--synatra-positive)",
        "negative":       "var(--synatra-negative)",
        "warning":        "var(--synatra-warning)",

        // Consensus-specific
        "consensus-high":   "var(--synatra-consensus-high)",
        "consensus-med":    "var(--synatra-consensus-med)",
        "consensus-low":    "var(--synatra-consensus-low)",
      },

      // ─── Typography ──────────────────────────────────────────────────────
      // Both families resolve through the CSS variables declared on :root in
      // globals.css (see the TYPEFACES block there) — that file is the single
      // source of truth, and these entries only point at it. The trailing
      // generic is a safety net for the case where the stylesheet has not
      // applied yet; the full platform stack lives in the variable.
      //
      // `display` previously pointed at var(--font-display), which was never
      // defined anywhere — so `font-display` silently fell through to its
      // literal "Inter" fallback, matching only on machines that happened to
      // have Inter installed. It now aliases the sans stack.
      fontFamily: {
        sans:    ["var(--font-sans)", "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-sans)", "system-ui", "sans-serif"],
      },

      fontSize: {
        // 11px floor. Was 0.625rem/10px, and 231 call sites use it for
        // provenance, freshness, endpoint paths and circuit state — meaning
        // carried below the size at which it can be read reliably.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        xs:    ["0.75rem",  { lineHeight: "1rem" }],
        sm:    ["0.8125rem", { lineHeight: "1.25rem" }],
        base:  ["0.875rem", { lineHeight: "1.5rem" }],
        md:    ["0.9375rem", { lineHeight: "1.5rem" }],
        lg:    ["1rem",     { lineHeight: "1.5rem" }],
        xl:    ["1.125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.25rem",  { lineHeight: "1.75rem" }],
        "3xl": ["1.5rem",   { lineHeight: "2rem" }],
        "4xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "5xl": ["2.25rem",  { lineHeight: "2.5rem" }],
        "6xl": ["3rem",     { lineHeight: "1" }],
      },

      // ─── Spacing ─────────────────────────────────────────────────────────
      spacing: {
        "4.5":  "1.125rem",
        "13":   "3.25rem",
        "15":   "3.75rem",
        "18":   "4.5rem",
        "sidebar-expanded":  "200px",
        "sidebar-collapsed": "52px",
        "topnav-height":     "52px",
      },

      // ─── Border Radius ───────────────────────────────────────────────────
      // Three steps in use, seven declared. The keys are KEPT (removing them
      // would break 68 rounded-lg call sites for no gain) and re-valued onto
      // the three-step system instead: 4px sub-components, 6px panels and
      // chart frames, 8px modals and overlays, rounded-full for telemetry dots.
      borderRadius: {
        DEFAULT: "6px",   // panels, chart frames, table shells
        sm:      "4px",   // badges, chips, inputs, buttons
        md:      "8px",   // modals, palette, overlays
        lg:      "6px",   // was 10px -> panel step
        xl:      "8px",   // was 12px -> overlay step
        "2xl":   "8px",   // was 16px
        "3xl":   "8px",   // was 20px
      },

      // ─── Animation ───────────────────────────────────────────────────────
      // Canonical motion system (Phase 1 · T4). Each keyframe is defined
      // exactly once. Keyframes that back raw component classes live in
      // globals.css (`.live-dot` → live-pulse, `.skeleton` → shimmer, the
      // HeroCarousel progress bar → hero-progress). The only Tailwind
      // utility-backed motion is `animate-fade-in-up` (page/section entrance),
      // whose keyframe is also defined once — in globals.css — so no keyframe
      // is duplicated here. Dead animations (gauge-fill, bar-fill, slide-in-*,
      // count-up, ticker-scroll, fade-in) were removed as unused tokens.
      animation: {
        // Motion-language easing (--motion-ease): soft settle, never mechanical.
        "fade-in-up":  "fade-in-up 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
        // Brand mark on splash / loading surfaces.
        "brand-pulse": "brand-pulse 2.4s cubic-bezier(0.22, 1, 0.36, 1) infinite",
      },

      // ─── Box Shadow ──────────────────────────────────────────────────────
      // The elev-* scale is the canonical elevation vocabulary; each pairs a
      // drop shadow with an inset top highlight so surfaces read as milled
      // rather than blurred. Tokens live in styles/synatra-tokens.css.
      boxShadow: {
        // `surface` / `surface-lg` were removed here: they were a SECOND
        // elevation vocabulary competing with the canonical elev-* scale,
        // and elev-* is the one that pairs a drop shadow with an inset top
        // highlight (the milled-panel look). Do not reintroduce them.
        "elev-1": "var(--synatra-elev-1)",
        "elev-2": "var(--synatra-elev-2)",
        "elev-3": "var(--synatra-elev-3)",
        "elev-4": "var(--synatra-elev-4)",
      },

      // ─── Backdrop Blur ───────────────────────────────────────────────────
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
      },

      // ─── Z-Index Scale ───────────────────────────────────────────────────
      // Canonical stacking hierarchy (Phase 1 · T9). The shell consumes these
      // tokens instead of raw z-index literals; overlays mount above chrome per
      // this order. `backdrop` sits just below `sidebar` (drawer scrims);
      // `skiplink` sits above all chrome so the a11y skip link is always reachable.
      zIndex: {
        backdrop:        "30",
        sidebar:         "40",
        topnav:          "50",
        modal:           "60",
        toast:           "70",
        tooltip:         "80",
        skiplink:        "90",
      },

      // ─── Screen Breakpoints ──────────────────────────────────────────────
      screens: {
        sm:    "640px",
        md:    "768px",
        lg:    "1024px",
        xl:    "1280px",
        "2xl": "1440px",
        "3xl": "1920px",
        "4xl": "2560px",
      },
    },
  },
  plugins: [],
};

export default config;
