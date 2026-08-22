# VERSION_HISTORY.md — leiloes-pt-v4

| Versão | Commit | Data | Mudança principal | md5 (src.zip) |
|---|---|---|---|---|
| v0.3.9 | `046dcb0` | 2026-08-22 | Lente 5 — Performance + hardening: GZipMiddleware (-88% payload), Cache-Control headers | tbd |
| v0.3.8 | `72b1c80` | 2026-08-22 | Lente 4 — A11y: viewport user zoom livre, 3 botões 44x44, alt descritivo | tbd |
| v0.3.7 | `8773f73` | 2026-08-22 | Lente 3 — Edge cases API: scatter min_desconto_pct validation + 4 tests | tbd |
| v0.3.6 | `69ddec7` | 2026-08-22 | Lente 2 — Data quality: foto via CDN, _df_active() helper em 11 endpoints, /api/leiloes?incluir_passados opt-out | tbd |
| v0.3.5 | `61eba76` | 2026-08-22 | Track 3 — audit deep dive: 5 endpoints novos, Visualizacoes.tsx + Mapa.tsx reescritos, StaleCacheBanner | tbd |
| v0.3.4 | `e3f211d` | 2026-08-21 | Bug fixes (audit): poupança slider 0-15%, drawer URL canonical, dead Drizzle removido | tbd |
| v0.3.3 | `77fef8f` | 2026-08-20 | Sidebar cleanup: Top route absorvido em Lista | tbd |
| v0.3.2 | `15d3281` | 2026-08-17 | Critical fix: poupanca_pct sintético→lance_atual/valor_minimo (Δ Lance) | tbd |
| v0.3.0 | `1c15d23` | 2026-08-17 | 22 endpoints / 8 routes + Leaflet mapa | tbd |
| v0.2.0 | `0667088` | 2026-08-17 | 20 endpoints / 7 routes, full stack | tbd |

## md5 history (snapshots)
<!-- Adicionar com: md5sum dist/src-v0.X.zip -->
- v0.3.9: pending
- v0.3.8: pending
- v0.3.7: pending

## Test count per version
| Versão | Tests | Δ |
|---|---|---|
| v0.3.0 | 19/19 | baseline |
| v0.3.1 | 19/19 | +meticulous |
| v0.3.4 | 20/20 | +URL canónica |
| v0.3.5 | 20/20 | (refactor Visualizacoes) |
| v0.3.6 | 23/23 | +foto + passados filter |
| v0.3.7 | 27/27 | +edge cases API |
| v0.3.8 | 31/31 | +a11y |
| v0.3.9 | 35/35 | +perf + hardening |
| **v0.4.0** (proposed) | **36/36** | +empty states test |
