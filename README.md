# ⚖️ Painel de Leilões Judiciais e Fiscais — Portugal

Dashboard **Streamlit** que agrega leilões portugueses (judiciais e fiscais) com filtros, poupança potencial estimada, novos últimas 24h, gráficos interativos e sistema de alertas.

---

## 🚀 Quick start

### Windows
```cmd
run.cmd
```

(O `run.cmd` instala deps se preciso e arranca com `--server.address 0.0.0.0` para acesso remoto.)

Ou manual:
```cmd
pip install -r requirements.txt
streamlit run app.py
```

### macOS / Linux
```bash
pip install -r requirements.txt
streamlit run app.py
```

Abrir [http://localhost:8501](http://localhost:8501).

> **Nota:** se tiver múltiplos Python instalados, use `python3 -m streamlit run app.py` para garantir a versão correta.

---

## 📱 Acesso no telemóvel via NordVPN Meshnet

O painel expõe-se em **todas as interfaces de rede** (`0.0.0.0:8501`) e o NordVPN Meshnet cria uma rede privada entre os teus dispositivos. Funciona assim:

### Setup (uma vez)
1. No PC, abre NordVPN → **Meshnet** → ativa. Anota o nome deste dispositivo (ex: `braincube`).
2. No telemóvel, abre NordVPN → **Meshnet** → ativa e aceita a ligação ao PC.
3. No PC, corre `run.cmd` (ou `streamlit run app.py --server.address 0.0.0.0 --server.enableCORS false --server.enableXsrfProtection false`).

### Uso
1. Abre o painel no PC → na **sidebar** aparece o URL mesh (ex: `http://braincube.mesh:8501`).
2. No telemóvel, abre esse URL no browser (Safari/Chrome).
3. Pronto — tens o painel completo no telemóvel, com os mesmos filtros e KPIs.

### Autenticação (opcional mas recomendado)
Se ativares password, o painel pede autenticação no primeiro acesso:
- **Variável de ambiente:** `set LEILOES_PT_PASSWORD=a_tua_password` antes de correr `run.cmd`.
- **Ficheiro `~/.streamlit/secrets.toml`:**
  ```toml
  [password]
  value = "a_tua_password"
  ```
Sem password definida, o painel é público dentro da mesh (ok para uso pessoal).

---

## 🎯 Filtros pré-criados (sidebar)

| Botão | Efeito |
|---|---|
| 🏖️ **Tavira — Imóveis + Terrenos (inclui Cabanas)** | Aplica distrito=Faro, concelho=Tavira, categoria=Imóvel (a API não filtra por freguesia; abrange Cabanas de Tavira, Santa Maria da Feira, Luz de Tavira, etc.) |
| 🆕 **Só novos 24h** | Mostra apenas publicações das últimas 24 horas |
| 🔥 **Encerram ≤30d** | Filtra para encerramentos nos próximos 30 dias |
| 🔄 **Limpar tudo** | Remove todos os filtros |

---

## 📊 Funcionalidades

### Indicadores (KPIs no topo)
- Total de leilões filtrados
- Novos das últimas 24h
- Valor mínimo de venda total
- **Poupança potencial total** vs preço de mercado estimado (com desconto médio %)
- Distritos cobertos
- Encerramentos nos próximos 7 dias

### Filtros
- **Distrito** (20 disponíveis + regiões autónomas)
- **Concelho** (dinâmico, depende de distrito)
- **Categoria:** Imóvel · Terreno · Veículo · Recheio
- **Estado do leilão:** 1ª Praça · 2ª Praça · Venda Particular
- **Natureza:** Judicial · Fiscal
- **Faixa de valor mínimo de venda**
- **Pesquisa livre** (descrição, subtipo, concelho)
- **Ordenação** por qualquer coluna (asc/desc)

### Novos últimas 24h
Secção destacada com cards expansíveis mostrando:
- Categoria + subtipo + descrição curta
- Valor mínimo + avaliação
- Poupança potencial + %
- Dias até encerrar + link direto

### Visualizações (Plotly)
- Distribuição por categoria (barras + cor = poupança total)
- Top 15 distritos (barras horizontais + cor = desconto médio)
- Box plot de poupança % por categoria
- Linha temporal de encerramentos próximos (60 dias) + poupança diária
- Scatter valor mínimo × poupança (log-scale, tamanho = área m²)

### Top Oportunidades
- Ordenado por poupança absoluta
- Filtrado para ≥ 20% de desconto vs mercado
- Export CSV dedicado

### Alertas (sistema completo)
- Criar por **distrito + concelho + categoria + valor + desconto mínimo**
- Toggle "só novos 24h"
- Campos opcionais email/Telegram (V2)
- Persistência local em `cache/alertas.json`
- Ativar/pausar/eliminar alertas
- Tab "Matches ativos" mostra resultados em tempo real
- Export CSV por alerta

### Export
- CSV da vista atual (botão em cada tab)
- CSV do top oportunidades
- CSV por alerta

---

## 🗂️ Estrutura do projeto

```
leiloes-pt/
├── app.py                       # UI Streamlit completa
├── requirements.txt
├── run.cmd                      # atalho Windows
├── README.md                    # este ficheiro
├── .streamlit/
│   └── config.toml              # tema (verde-teal) + headless
├── data/
│   ├── __init__.py
│   ├── analytics.py             # KPIs, filtros, agregações
│   ├── loader.py                # abstrator + cache JSON (apenas dados REAIS)
│   ├── leiloes_reais.py         # schema + normalização do e-leilões.pt
│   ├── crawler_eleiloes.py      # descarrega API → cache/leiloes_reais.json
│   ├── dashboards.py            # gráficos Plotly (donut, gauge, bar, timeline)
│   ├── geo_portugal.py          # mapa coropletas (coord_concelho)
│   ├── heatmap.py               # heatmap calendário de encerramentos
│   ├── theme.py                 # tema Linear (dark/light) + CSS
│   ├── alertas.py               # sistema de alertas + CSV export
│   ├── test_smoke.py            # 4 testes de fumo
│   ├── test_mobile.py           # 26 testes mobile/responsivo
│   ├── test_comprehensive.py    # 75 testes completos
│   └── source_configs.json      # inventário de fontes reais
└── cache/                       # gitignored — gerado pelo crawler
    ├── leiloes_reais.json       # cache real (~3MB, 3.091 items, TTL ~24h)
    ├── alertas.json             # alertas guardados
    └── leiloes_export_*.csv     # exports temporários
```

---

## 🧪 Testes

```bash
python -m data.test_smoke
```

Saída esperada:
```
OK básico: 3091 leilões, poupança total 154,950,566€
OK Tavira (Faro+Imóvel): 3 imóveis no concelho
OK filtros: vazio=0, tudo=3091, novos_24h=103
OK agregados: {'Imóvel': 964, 'Direito': 1198, 'Veículo': 341, 'Equipamento': 230, 'Mobiliário': 332, 'Máquina': 26}

✅ Todos os smoke tests passaram.
```

---

## 📦 Dependências

- `streamlit>=1.30` — UI
- `pandas>=2.0` — dados tabulares
- `plotly>=5.18` — gráficos interativos
- `requests>=2.31` — preparado para scrapers reais (V2)
- `beautifulsoup4>=4.12` — preparado para scrapers reais (V2)

---

## 🔌 Roadmap para dados reais (V2)

As fontes oficiais portuguesas têm **proteções anti-bot** e/ou **não expõem API pública estruturada**:

| Fonte | Status | Notas |
|---|---|---|
| [e-leilões.pt](https://www.e-leiloes.pt) | 🛡️ Cloudflare | Scraping massivo viola ToS |
| [LeiloSoc](https://www.leilosoc.com) | 🛡️ Cloudflare | — |
| [Expresso Leilões](https://www.expressoleiloes.pt) | 🛡️ Cloudflare | — |
| [AT/IGCP](https://www.portaldasfinancas.gov.pt) | ❌ Sem API pública | — |
| [CITIUS](https://www.citius.mj.pt) | 📜 Dados oficiais | Apenas processos, não listagem de penhores |

**Para V2:** implementar scrapers com **Playwright headless + stealth + rate limiting** em `data/scrapers/`, respeitar **robots.txt** e **ToS**, e adicionar proxy rotation se necessário. O loader abstrato em `data/loader.py` aceita trocar implementação sem refactor do painel.

---

## 💾 Backup e recovery (GitHub)

O projeto está versionado em **repo privado**: https://github.com/LegendaryLionMan/leiloes-pt

### Criar um backup (save estável)

```cmd
backup.bat
```

O script:
1. Verifica se há alterações desde o último commit (se não houver, sai sem fazer nada)
2. Corre os 105 testes
3. Se passarem: pede o nome da versão, faz `commit` + `tag` + `push`
4. Se algum teste falhar: **avisa e não faz backup** (preserva o último estado bom)

Exemplo de nomes de versão: `v3.0-real-data`, `v3.1-match-detalhes`, `v4.0-fiscal`.

### Reverter para uma versão anterior

```cmd
cd C:\Users\lion_\projetos\leiloes-pt

:: Ver todas as tags disponíveis
git tag

:: Voltar para uma tag específica (o código volta ao estado dessa versão)
git reset --hard v3.0-real-data

:: Ver histórico de commits (com hash + mensagem)
git log --oneline

:: Voltar para um commit específico pelo hash
git reset --hard abc1234
```

⚠️ **`git reset --hard` apaga alterações não commitadas.** Se só quiseres ver o que mudou sem perder nada:
```cmd
git diff v3.0-real-data
```

### Versões guardadas

| Tag | Significado |
|---|---|
| `v3.0-real-data` | Estado inicial estável: 3.091 items reais, 105/105 testes, error handling (B23) corrigido |
| `backup-2026-06-21-v3-stable` | Cópia idêntica ao `v3.0-real-data` (safety net) |

### Porquê backup manual (não automático)?

Tu disseste que esperas que a solução fique **estável sem alterações**. Backups automáticos diários correriam sempre com o mesmo conteúdo (desnecessário). Cada release estável (quando há uma mudança grande) merece um save manual com nome descritivo.

---

## 🛡️ Política de dados (v3.1)

A partir de v3.1, o painel **NÃO usa dados sintéticos** — em nenhuma circunstância.

- **Cache válida (qualquer idade)** → usa os dados reais mais recentes
- **Cache inválida / inexistente** → painel mostra erro claro com instruções para correr o crawler
- **API do e-leilões.pt falhar ao refrescar** → mantém a cache anterior (dados ficam "stale") + avisa no rodapé

Para refrescar os dados manualmente:
```
PYTHONPATH="" py -3.13 data\crawler_eleiloes.py
```

---

## ⚖️ Disclaimer

O painel usa **apenas dados reais** do e-leilões.pt (Autoridade Tributária e Aduaneira — AT). Cache em `cache/leiloes_reais.json` é refrescado por cron job diário.

Para decisões de investimento, **consultar sempre as fontes oficiais** (CITIUS, e-leilões.pt, AT) e verificar:
- Estado real do processo (1ª/2ª praça, venda particular)
- Ônus e encargos sobre o bem
- Visita prévia ao imóvel (sempre recomendada)
- Capacidade financeira para cobrir o valor + custos (IMT, registos, etc.)

O `data/leiloes_sinteticos.py` é mantido como fallback apenas se a cache real não existir (não acontece em produção porque o cron diário mantém a cache fresca).

---

## 📜 Licença

O painel usa **apenas dados reais** (e-leilões.pt / AT). Para uso comercial, verificar licenças das fontes oficiais.
