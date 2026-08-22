# Changelog

## v0.4.6 — 2026-08-22 — Drill-down donut ↔ URL sync

### Added
- `useSearchParams()` in `src/routes/Visualizacoes.tsx` syncs drill state with `?cat=X`
- Bookmarkable shareable drill state
- Visual chip with × button when drill active
- 3 E2E tests (46 total): click shows chip + URL, reload restores drill, × clears

### Changed
- Donut chart click handler now also updates URL via `setSearchParams(..., { replace: true })`

---

## v0.4.5 — 2026-08-22 — Internationalization (D)

### Added
- `src/i18n.ts`: react-i18next + LanguageDetector
- `src/locales/pt-PT.json`: ~80 keys (default)
- `src/locales/en.json`: ~80 keys
- `src/components/LanguageSwitcher.tsx`: PT/EN toggle (aria-pressed, role=group)
- 5 KPI labels in `Lista.tsx` use `t()` with fallback
- 3 E2E tests (43 total): persist, fallback, a11y

### Changed
- `src/main.tsx` imports `./i18n` to initialize on app start
- `src/App.tsx` adds `<LanguageSwitcher />` to topbar

---

## v0.4.4 — 2026-08-22 — Performance: cursor pagination

### Added
- `/api/leiloes?cursor=N` — cursor-based pagination (filter `id > cursor`)
- `next_cursor` in response body (id of last item when page full)
- 2 E2E tests (39 total): valid cursor filters, invalid cursor ignored

### Trade-off
- Items with same `data_encerramento` may repeat across pages (non-deterministic ordering); works best with `?ordenar_por=id`

---

## v0.4.3 — 2026-08-22 — UX + Accessibility

### Added
- `src/hooks/useKeyboardNav.ts`: j/k/Arrow/Enter/Esc/Home/End (ignores inputs)
- `src/hooks/useFocusTrap.ts`: Tab/Shift+Tab confined, restore focus on close
- `src/components/Toast.tsx`: emitToast() global event bus, aria-live regions (polite/assertive), success=5s / error=8s

### Fixed
- `DetailDrawer` in `Lista.tsx` now uses `useFocusTrap`
- `CriarAlerta.tsx`: added `concelho` to AlertSchema, defaultValues, and POST payload
- Removed unused `useState` import in CriarAlerta

### Changed
- Replaced local `Toaster` with global `ToastContainer` + `emitToast()`

### Tests
- 3 E2E tests (41 total): focus trap confina Tab, aria-live presente, ESC fecha drawer

---

## v0.4.2 — 2026-08-22 — Data quality + race condition hardening

### Added
- `VALOR_SUSPEITO_RATIO_Nx` heuristic in `vendor/leiloes-pt-data/.../loader.py`
  - Detects bugs upstream where `valorBase` comes in cêntimos (e.g. Tábua imóvel 240.000M€)
  - Flags items with ratio `lance/min > 10x` with reason

### Changed
- `_alert_conn()` in alerts DB: `timeout=5.0s`, `busy_timeout=5000ms`, `synchronous=NORMAL`
- Race condition hardening for 5 concurrent POST /alertas

### Tests
- 2 E2E tests (39 total): items flagged present in Coimbra/Imóvel, 5 concurrent POSTs all 200

---

## v0.4.1 — 2026-08-22 — Security headers + CI

### Added
- `Dockerfile` (multi-stage: Node 20 alpine → Python 3.11 slim)
- `.dockerignore`
- `.github/workflows/ci.yml`: Playwright E2E on every push
- `.github/workflows/dependabot-auto-merge.yml`: auto-merge Dependabot patches
- `.github/dependabot.yml`: weekly npm + pip updates
- `SecurityHeadersMiddleware` (pure ASGI):
  - `Content-Security-Policy` (frame-ancestors 'none', script-src 'self')
  - `Strict-Transport-Security: max-age=31536000`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation/microphone/camera=()`

### Tests
- 3 E2E tests (37 total): CSP+HSTS present, CSP doesn't block SPA, infra files

---

## v0.3.5 — earlier — Drawer, photo, navegação

### Added
- Drawer with full leilao detail (referência, praça, modalidade, fonte, abrir e-leilões.pt)
- Photo column (apartamento Tavira com varandas)
- Mobile responsive (cards instead of table)
- `/api/leiloes?incluir_passados=false` (default)

---

## v0.3.x — earlier — Initial v4 scaffold

- Migrated from v3 Streamlit to React+Vite+Tailwind+FastAPI+SQLite
- 22 endpoints, 8 routes
- Original SPA shell + theme toggle + TanStack Query cache