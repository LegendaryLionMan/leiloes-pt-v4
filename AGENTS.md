# Project Guidelines & Agent Instructions: Leilões Portugal

This file defines the project conventions, architecture, and operational guidelines for the **Leilões Portugal** application. These instructions are automatically loaded by the AI assistant on every turn.

---

## 1. Project Overview & Domain

**Leilões Portugal** is an analytics dashboard and real-time tracking tool for Portuguese judicial, tax, and insolvency public auctions (such as those from *e-leilões*).

### Key Domain Entities & Rules:
- **Territorial Scope**: 18 mainland districts (*Aveiro*, *Beja*, *Braga*, *Bragança*, *Castelo Branco*, *Coimbra*, *Évora*, *Faro*, *Guarda*, *Leiria*, *Lisboa*, *Portalegre*, *Porto*, *Santarém*, *Setúbal*, *Viana do Castelo*, *Vila Real*, *Viseu*) and 2 Autonomous Regions (*Açores*, *Madeira*).
- **Financial & Market Calculations**:
  - `valor_avaliacao` (Base evaluation value).
  - `valor_minimo` (Opening minimum bid, typically 85% of base value for judicial auctions).
  - `valor_mercado_estimado` (Estimated open-market benchmark).
  - `lance_atual` (Current top bid; 0 if no active bids).
  - `poupanca_potencial` ($\max(0, \text{market} - \max(\text{bid}, \text{min}))).
  - `poupanca_pct` (Potential discount percentage vs. market value).
- **Auction Lifecycle & Urgency**:
  - States: `Em curso` (Active), `Agendado` (Scheduled), `Terminado` (Ended), `Cancelado` (Canceled).
  - `novo_24h`: Flag indicating publication within the past 24 hours.
  - `dias_ate_encerramento`: Remaining days until auction closes.

---

## 2. Architecture & Runtime

- **Stack**: React 18, Vite, Express, TypeScript, Tailwind CSS, Lucide React icons.
- **Port Requirement**: The application serves all traffic on **Port 3000** (`0.0.0.0:3000`).
  - Development uses `tsx server.ts` where Express integrates Vite middleware.
  - Production builds bundle the backend via `esbuild` into `dist/server.cjs` and serve compiled static assets with SPA fallback.
- **Data Layer**:
  - Server endpoints live in `server.ts` and modular backend helpers in `/server/` (`data.ts`, `geo.ts`, `alerts.ts`).
  - Frontend communication uses `@tanstack/react-query` via `/src/lib/api.ts`.
- **Internationalization (i18n)**:
  - Both Portuguese (`pt-PT`) and English (`en`) are supported.
  - When introducing user-facing text, always update `/src/locales/pt-PT.json` and `/src/locales/en.json`.

---

## 3. UI & Frontend Conventions

- **Iframe Compatibility**:
  - The app runs in an iframe preview. **Never** use blocking browser primitives like `window.confirm()`, `window.alert()`, or `window.prompt()`.
  - Prefer in-place confirmations, toasts, or modal components.
- **Icons**:
  - Use `lucide-react` exclusively. Do not create inline custom SVGs.
- **Navigation & Layout**:
  - Keep layout consistent across screens: Topbar (logo, language switcher, theme toggle) + Sidebar / Mobile bottom navigation.
  - Ensure touch targets are at least 44px on mobile viewports.
- **Data Visualizations**:
  - Charts utilize `recharts` for timeline and category distribution.
  - Map interactions utilize `leaflet` / `react-leaflet`. District and municipality coordinates are maintained in `/server/geo.ts`.

---

## 4. Testing & Verification

- Run unit tests: `npm test -- --run` (Vitest).
- Run type checks: `npm run type-check`.
- Run linter: `npm run lint`.
- Run full compilation: verify build cleanliness before completing tasks.
