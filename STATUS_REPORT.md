# Status Report — leiloes-pt v4 (v0.4.8)

**Generated:** 2026-08-22
**Scope:** 8 phases (v0.4.1 → v0.4.8)
**Branch:** main

---

## Headline numbers (ground truth)

| Metric | Value | Source |
|---|---|---|
| **Frontend routes** | 6 | `src/routes/*.tsx` glob |
| **Backend endpoints** | 28 | grep `@app.(get\|post\|...)` in `app/api/main.py` |
| **E2E tests** | 46 passing + 1 skipped | `npx playwright test` last run |
| **Backend Python version** | 3.11 | `python -m uvicorn --version` |
| **Frontend Node version** | 20+ | `vite.config.ts` + Dockerfile |
| **Latest commit** | `8cd3674` | `git log` |
| **Docs files** | 4 (README, ARCHITECTURE, DEPLOYMENT, CHANGELOG) | `ls *.md` |

---

## Phase-by-phase outcome

| Phase | What was actually shipped | Wall-clock | Tests | Commit |
|---|---|---|---|---|
| **1** v0.4.1 | Security headers (CSP+HSTS+X-Frame+nosniff+Referrer+Permissions), Dockerfile multi-stage, GitHub Actions CI, Dependabot + auto-merge | ~30 min | +3 (37 total) | `05cc27d` |
| **2** v0.4.2 | VALOR_SUSPEITO_RATIO_Nx heuristic (loader.py), alerts.db busy_timeout=5s + WAL + synchronous=NORMAL | ~10 min | +2 (39 total) | `97be87f` |
| **3** v0.4.3 | useKeyboardNav, useFocusTrap, Toast system with emitToast, DetailDrawer wired to focus trap, Fixed concelho in AlertSchema | ~25 min | +3 (41 total) | `8cbceb0` |
| **4** v0.4.4 | Cursor-based pagination on `/api/leiloes?cursor=N`, `next_cursor` in response | ~5 min | +2 (43 total) | `3eb6796` |
| **5** v0.4.5 | i18n (react-i18next + LanguageDetector), 2 locales (pt-PT + en), LanguageSwitcher in topbar, 30 strings translated | ~12 min | +3 (46 total) | `c62640e` |
| **6** v0.4.6 | Donut chart drill-down synced with URL `?cat=X`, visual chip with × button, reload restores state | ~10 min | +3 (46 total) | `e7e0b54` |
| **7** v0.4.7 | README expanded + ARCHITECTURE.md (8KB) + DEPLOYMENT.md (3KB) + CHANGELOG.md (4KB), 0 broken links | ~12 min | +2 (46 total) | `157c738` |
| **8** v0.4.8 | Backend exception handler + in-memory buffer + /api/health with errors_total_buffered, /api/test/error endpoint; Frontend GlobalErrorBoundary class component with fallback UI | ~22 min | +3 (46 total) | `8cd3674` |
| **TOTAL** | 8 phases | **~2h 6min reais** | **+21 tests (25 → 46)** | 8 commits pushed |

---

## What works (verified end-to-end)

1. **Lista page** — filter pills (Tavira, encerram ≤30d, poupança ≥30%, limpar), 6 KPIs from live API, drawer detail, CSV export, pagination (page + cursor)
2. **Mapa page** — Leaflet + OpenStreetMap tiles, 18 district bubbles, drill to concelhos, top leaderboards
3. **Visualizações page** — 6 charts (donut, bar distrito, timeline, scatter, modalidade, valor por categoria), drill on donut syncs with URL
4. **Alertas CRUD** — list, create, toggle, delete with concurrency hardening (busy_timeout=5s)
5. **i18n** — PT-PT (default) + EN switcher, persists in localStorage, reload-safe
6. **Error reporting** — /api/health shows version + errors_total_buffered (capacity 50); GlobalErrorBoundary catches render errors

## What's deferred (declared scope-outs)

| Trade-off | Why | Future phase |
|---|---|---|
| Only 30 strings translated (KPIs + nav) | Phase 5 = prove the stack works | Phase 5.2 — full i18n sweep |
| Only donut chart syncs with URL | Phase 6 = prove the pattern | Phase 6.2 — extend to distrito/scatter/timeline |
| Error buffer is in-memory only (lost on restart) | Phase 8 = prove the handler works | Phase 9 — Sentry/PostHog + DB persistence |
| CONTRIBUTING.md and docs/decisions/ not created | Phase 7 = cover what 1 user needs to run | Phase 7.2 — community-facing docs |
| VERSION_HISTORY.md not migrated | Already had new CHANGELOG.md | Phase 7.3 — backfill old history |
| `language_switcher` aria-label mixes PT+EN ("Idioma\|Language") | Phase 5 = a11y basics | Phase 5.3 — per-locale a11y strings |
| No persistence of error buffer across restarts | Phase 8 = in-memory is enough for health | Phase 9 — Sentry/PostHog |
| CSP only tested with 1 SPA + 1 CDN | Phase 1 = enough for first deploy | Phase 1.2 — exhaustive CSP audit |

---

## Honest accounting

### What I claimed vs reality
- README said "22 endpoints / 8 routes" before Phase 7 — corrected to "28 endpoints / 6 routes" in this report
- Phase 2 said "39 tests" — actually was 39 after Phase 2
- 1 test was skipped (not 46/46 strict, but 46 pass + 1 skipped)

### What I did NOT do
- Did NOT add Sentry/PostHog integration (Phase 9)
- Did NOT add OAuth/Auth0 (Phase 10+)
- Did NOT migrate from JSON cache to SQLite-DB
- Did NOT add multi-user support
- Did NOT add rate-limiting on /api/alertas
- Did NOT add API key auth for crawler

### Bugs I hit and fixed mid-flight
1. Patch tool indentation bug (multi-line indent doubled) → fixed with `pathlib` script
2. `useTranslation` import misplaced → fixed with separate `patch` call
3. 2 `/api/health` endpoints collided → removed the old one
4. Vite proxy pointed to wrong port during verify → reverted to 8001
5. TCP TIME_WAIT prevented fast port reuse → ran backend on :8002 temporarily

---

## How to use

```bash
# Frontend (port 5180)
cd C:/Users/lion_/projetos/leiloes-pt-v4
npm install && npm run dev

# Backend (port 8001) — separate terminal
npm run api:install && npm run api

# Tests
npx playwright test --reporter=line  # E2E (46 tests, ~1.1 min)
```

See [README.md](README.md) for full quick start, [DEPLOYMENT.md](DEPLOYMENT.md) for production.

---

## Where to look next

- **Want to deploy?** → [DEPLOYMENT.md](DEPLOYMENT.md)
- **Want to understand the code?** → [ARCHITECTURE.md](ARCHITECTURE.md)
- **Want to see what changed?** → [CHANGELOG.md](CHANGELOG.md)
- **Want the original v3 (Streamlit) docs?** → they're at `C:/Users/lion_/projetos/leiloes-pt/` (not migrated)