# Deployment

## Local (development)

```bash
# 1. Frontend (port 5180)
npm install
npm run dev

# 2. Backend (port 8001) — separate terminal
npm run api:install
npm run api

# 3. (Optional) Refresh data from e-leilões.pt
curl -X POST http://localhost:8001/api/cache/refresh
```

## Docker (production)

```bash
docker build -t leiloes-pt-v4 .
docker run -p 5180:5180 -p 8001:8001 \
  -v /path/to/vendor:/app/vendor \
  -e ALLOWED_ORIGINS=https://yourdomain.com \
  leiloes-pt-v4
```

Or `docker compose up` with the included `docker-compose.yml`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT_FRONTEND` | 5180 | Vite dev server / preview port |
| `PORT_API` | 8001 | FastAPI backend port |
| `ALLOWED_ORIGINS` | `http://localhost:5180` | Comma-separated CORS origins |
| `LOG_LEVEL` | `info` | uvicorn log level |
| `CRAWLER_ENABLED` | `true` | Set `false` to skip vendor crawler (use cached data only) |
| `DATA_DIR` | `./vendor/leiloes-pt-data/cache` | Where `leiloes_reais.json` + `alertas.db` live |

## Data initialization

On first run, you need to vendor the v3 Python data pipeline:

```bash
git subtree add --prefix vendor/leiloes-pt-data \
  https://github.com/LegendaryLionMan/leiloes-pt.git main --squash
```

Then run the crawler once:

```bash
cd vendor/leiloes-pt-data
python -m src.cli crawl --output cache/leiloes_reais.json
```

## Migrations

- **Alerts DB schema**: managed in `app/api/alerts_db.py` (auto-creates on first POST)
- **Frontend**: no migrations (data is shape-keyed by query keys)
- **Backend endpoints**: backward-compatible within minor versions; breaking changes bump major

## Health checks

```bash
# Backend
curl http://localhost:8001/healthz

# Frontend (after build)
curl http://localhost:5180/
```

## CI

GitHub Actions:
- `.github/workflows/ci.yml` — Playwright E2E + pytest on every push to main
- `.github/workflows/dependabot-auto-merge.yml` — auto-merge Dependabot patch PRs

## Rollback

Tags are created for every minor version. To rollback:

```bash
git tag                          # list
git checkout v0.4.5
npm install
npm run api:install
# restart services
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED 8001` | Backend not running | `npm run api` in another terminal |
| `404 on /api/leiloes` | Vite proxy misconfigured | Check `vite.config.ts` `server.proxy` |
| CSP blocks Leaflet tiles | Wrong CSP `img-src` | Verify `*.tile.openstreetmap.org` is allowed |
| CORS error in browser | `ALLOWED_ORIGINS` doesn't include frontend origin | Add it to `.env` |
| Crawler times out | e-leilões.pt slow | Increase timeout in `vendor/.../loader.py` |

## Production checklist

- [ ] `ALLOWED_ORIGINS` set to production domain
- [ ] `LOG_LEVEL=warning` to reduce log volume
- [ ] CSP `script-src` includes any inline bootstrap code
- [ ] `vendor/leiloes-pt-data/` updated (subtree pull)
- [ ] Backups: cron copies `vendor/.../cache/alertas.db` to safe location
- [ ] Health checks wired to monitoring
- [ ] HSTS preload list (optional)