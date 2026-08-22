# 2026-08-22 — _df_active() helper for filtering past auctions

## Context
Lente 2 found 196 items (6.3%) had data_encerramento < agora but were counted as active:
- /api/kpis.total = 3098 (should be 2902)
- /api/agregados/distrito totals = 3098
- /api/mapa/distritos totals = 3098
- /api/kpis/estados = {Em curso: 3098, ...}

## Decision
Added `_df_active(df)` helper in app/api/main.py. Applied to 11 aggregation endpoints.
analytics.kpis_gerais() gains excluir_passados=True default.
/api/leiloes keeps its own incluir_passados: bool = Query(False) param.

## Why a helper
- DRY across 11 endpoints
- Single source of truth
- Future endpoints opt in by calling _df_active(df)

## Trade-offs
- Filters past items BEFORE aggregations — counts reflect "active now"
- Frontend can still see past items via ?incluir_passados=true
- encerram_prox_7d already excluded past via existing H-26 fix
