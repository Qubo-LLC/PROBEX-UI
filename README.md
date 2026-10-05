<div align="center">

<img src="public/synatra-icon.svg" alt="Synatra" width="96" height="96" />

# Synatra

### Prediction Intelligence Platform

**Bitcoin prediction markets, powered by the QUBO Consensus Engine.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149ECA?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-Proprietary-lightgrey)](#license)

</div>

---

## Overview

**Synatra** (QUBO Synatra) is an institutional-grade frontend for a Bitcoin prediction-markets platform. Rather than presenting markets as a simple order book, Synatra layers a **Consensus Engine** on top — a proprietary intelligence signal that aggregates market sentiment, confidence, and structure into a single readable score that updates in real time.

The application is a **Next.js 15 App Router** project written in **strict TypeScript**. It is built "mock-first": every data domain is served today by an in-repo mock layer behind a clean service interface, so the UI is fully interactive without a backend. Switching to live infrastructure is a configuration change (`NEXT_PUBLIC_API_MODE=live`) — no component rewrites — which makes this repository the front end of an in-progress full-stack product.

> **Status:** Frontend feature-complete. Backend, real-time streaming, and on-chain settlement integrate against the existing service interfaces. The build is not indexed by search engines yet (`robots: noindex`) while in MVP.

---

## Features

- **🧠 Consensus Engine** — A first-class intelligence signal (score, confidence, bias, signal strength, market structure) rendered across the dashboard, market detail, and a dedicated Consensus page. Backed by a swappable `IConsensusService` (mock ⇄ live).
- **📈 Prediction Markets** — Browse, sort, and filter Bitcoin markets; deep market-detail pages with probability charts, order context, and a simulated trading drawer (YES/NO).
- **⚡ Live Mode** — A streaming layer (`StreamClient` + provider) pushes probability ticks, consensus updates, and an activity feed at sub-second to multi-second intervals, with connection-status awareness.
- **💼 Portfolio & Positions** — Portfolio insights, position tracking, and performance views built on dedicated stores and mock analytics.
- **🔬 Research Terminal** — Structured, machine-readable research reports (outlooks, signal briefs, ETF monitors, macro & consensus reports) with a custom lightweight Markdown renderer, filtering, and bookmarks.
- **📊 Analytics** — Consensus accuracy, ETF flows, on-chain metrics, institutional activity, and market-structure dashboards via Recharts.
- **👛 Wallet (Web3-ready)** — A Polygon-oriented wallet layer (chain config for Polygon Mainnet `137` / Amoy `80002`, contract address registry, balance/address formatting) wired for WalletConnect-style integration.
- **🎨 Five Themes** — `aurora` (default), `midnight`, `quantum`, `emerald`, and `institutional`, resolved **server-side from a cookie** to eliminate theme flash on first paint.
- **⌘ Command Palette & Shortcuts** — Keyboard-driven navigation (`⌘K`) and global shortcuts.
- **🛡️ Admin Console** — Role-aware admin area (role hierarchy + permission checks in the auth layer).
- **🔐 Auth Flows** — Login, signup, email verification, and password reset screens with `react-hook-form` + `zod` validation.

---

## Tech Stack

| Area | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Turbopack dev) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) — `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` |
| **UI runtime** | [React 19](https://react.dev/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + custom CSS design tokens (`synatra-tokens.css`), PostCSS, Autoprefixer |
| **Components** | [Radix UI](https://www.radix-ui.com/) primitives, [lucide-react](https://lucide.dev/) icons, `class-variance-authority`, `tailwind-merge`, `clsx` |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) (per-domain stores, persisted theme) |
| **Server state** | [TanStack Query](https://tanstack.com/query) |
| **Forms & validation** | [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Animation** | [Framer Motion](https://www.framer.com/motion/) |
| **Virtualization** | [@tanstack/react-virtual](https://tanstack.com/virtual) |
| **Theming** | [next-themes](https://github.com/pacocoursey/next-themes) + cookie-based SSR resolution |
| **Web3** | Polygon chain config + contract address registry (integration-ready) |

---

## Project Structure

```
SYNATRA/
├── public/                     # Favicons, PWA icons, brand SVG
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout (fonts, theme SSR, providers)
│   │   ├── page.tsx            # Redirects → /dashboard
│   │   ├── auth/               # login · signup · verify · forgot/reset password
│   │   └── dashboard/          # App shell + 13 feature routes
│   │       ├── markets/[marketId]/   # Dynamic market detail
│   │       ├── live/ · consensus/ · analytics/ · research/
│   │       ├── portfolio/ · positions/ · watchlist/ · wallet/
│   │       └── settings/ · admin/
│   ├── components/             # Feature-grouped UI (markets, consensus, trading,
│   │                           #   research, analytics, wallet, layout, ui, …)
│   ├── lib/
│   │   ├── consensus/          # Consensus Engine: service interface, scoring,
│   │   │                       #   adapters, transformers (mock ⇄ live)
│   │   ├── realtime/           # StreamClient, mock stream provider, selectors
│   │   ├── web3/               # Polygon chain config, contracts, wallet utils
│   │   ├── services/           # Service interfaces, DTOs, mock & live impls
│   │   ├── api/                # Market service / API client
│   │   └── validation/         # Zod schemas
│   ├── store/                  # Zustand stores (market, portfolio, wallet,
│   │                           #   research, auth, theme, ui, sidebar, live…)
│   ├── hooks/                  # useMarketStream, useConsensus, useWatchlist, …
│   ├── providers/              # Query · Store · Realtime · Theme providers
│   ├── mock/                   # Rich mock datasets for every domain
│   ├── types/                  # Domain types + branded IDs (barrel: types/index.ts)
│   ├── config/                 # App constants & routes
│   └── styles/                 # synatra-tokens.css (design tokens)
├── tailwind.config.ts
├── postcss.config.mjs          # Required — wires Tailwind into the build
├── next-env.d.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18.18 (LTS 20+ recommended)
- **npm** (the repo ships a `package-lock.json`)

### Installation

```bash
# 1. Clone
git clone <your-repo-url> synatra
cd synatra

# 2. Install dependencies
npm install

# 3. Configure environment (optional for mock mode — see below)
cp .env.example .env.local   # if present; otherwise create .env.local

# 4. Start the dev server (Turbopack)
npm run dev
```

Open **http://localhost:3000** — the root route redirects to `/dashboard`. The app runs fully in **mock mode** out of the box; no backend or API keys are required to explore it.

### Environment Variables

All variables are optional in mock mode. They are read where the app integrates with real infrastructure:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_MODE` | `mock` (default) or `live` — selects mock vs. live service implementations |
| `NEXT_PUBLIC_API_BASE_URL` | **Canonical** backend base URL (single source of truth). Includes the `/api` prefix; consumed by the shared API client and endpoint registry. |
| `NEXT_PUBLIC_CONSENSUS_API_URL` | Consensus Engine endpoint |
| `NEXT_PUBLIC_WS_URL` | Real-time stream (WebSocket) URL |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (Open Graph / metadata) |
| `NEXT_PUBLIC_CHAIN_ID` | Target chain (`137` Polygon Mainnet · `80002` Amoy testnet) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project id |
| `NEXT_PUBLIC_CONTRACT_*` | Market / Token / USDC / Vault contract addresses |
| `NEXT_PUBLIC_DEBUG` | Enables verbose debug output |

> Server-only secrets (`DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `INTERNAL_API_SECRET`, `KYC_API_KEY`) are referenced by the integration layer and belong only in server environments — never expose them with the `NEXT_PUBLIC_` prefix.

### Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server with **Turbopack** |
| `npm run dev:standard` | Start the dev server with the default (webpack) compiler |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run type-check` | `tsc --noEmit` against the strict config |
| `npm run lint` | Run ESLint (`next lint`) |
| `npm run lint:fix` | Lint and auto-fix |

---

## Development Setup

- **Path aliases** — Import via `@/` (e.g. `@/components/...`, `@/lib/...`, `@/store/...`). Aliases are defined in `tsconfig.json`.
- **Strict TypeScript** — The project enables `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. Keep optional props honest (`prop?: T | undefined`) and narrow array access. Run `npm run type-check` before pushing.
- **Styling** — Tailwind utilities + the `synatra-tokens.css` design-token system. **`postcss.config.mjs` is required** — it wires Tailwind/Autoprefixer into the build; removing it silently disables all Tailwind processing.
- **Themes** — Add or edit themes in `src/types/theme.ts` (`THEME_NAMES` / `THEME_META`); the active theme is persisted to a cookie and resolved server-side in `app/layout.tsx`.
- **Mock vs. live** — Components consume **hooks and service interfaces**, never concrete implementations. To integrate a backend, implement the `live` counterpart of a service (e.g. `LiveConsensusService`) and set `NEXT_PUBLIC_API_MODE=live`.
- **Editor** — VS Code with the workspace TypeScript version is recommended for accurate strict-mode diagnostics.

---

## Roadmap

The mock-first architecture defines the integration path. Indicative milestones (derived from in-code service interfaces and TODO markers):

- [ ] **Live Consensus Engine** — implement `LiveConsensusService` against `IConsensusService` and flip `NEXT_PUBLIC_API_MODE=live`.
- [ ] **Real-time backend** — replace `MockStreamProvider` with a live WebSocket provider (`NEXT_PUBLIC_WS_URL`).
- [ ] **REST/data API** — back markets, portfolio, research, and analytics with live services.
- [ ] **On-chain settlement** — connect the Polygon wallet layer and contract registry for real trading/settlement.
- [ ] **Auth & KYC** — wire session/JWT auth and KYC flows to server infrastructure.
- [ ] **Multi-asset support** — generalize beyond the MVP `ACTIVE_ASSET_CLASS = 'bitcoin'`.
- [ ] **Search indexing** — lift `robots: noindex` once out of MVP.

---

## Contributing

Contributions are welcome. To keep the codebase consistent:

1. **Branch** from `main`: `git checkout -b feat/<short-description>`.
2. **Match the conventions** — feature-grouped components, `@/` imports, Zustand for client state, TanStack Query for server state, and the `synatra-tokens.css` design tokens for styling.
3. **Respect the type contract** — do not relax `tsconfig.json`. Prefer correcting prop/interface types over casting; avoid `any`, `@ts-ignore`, and `eslint-disable`.
4. **Verify before pushing:**
   ```bash
   npm run type-check
   npm run lint
   npm run build
   ```
5. **Keep the mock/live boundary clean** — components should depend on hooks and service interfaces, never concrete implementations.
6. **Open a PR** with a clear description and screenshots for any UI change.

---

## License

Proprietary — © QUBO. All rights reserved. (Update this section if an open-source license is adopted.)

<div align="center">

**Synatra** · QUBO Prediction Intelligence

</div>
