# WTI Dashboard

Live WTI Oil Trading Dashboard mit täglichem Signal, Backtest und X-Sentiment.

## Lokal starten
```bash
python3 -m http.server 8181
```
Dann http://localhost:8181 öffnen.

## Skripte
- `fetch_price.py` — holt aktuellen WTI-Preis von Stooq
- `signal_generator.py` — generiert Tagessignal (Entry/Stop/TP)
- `backtest.py` — Backtest + Parameter-Optimierung

## Auto-Updates
GitHub Actions (`.github/workflows/update.yml`) updatet alle 30 Min während US-Marktzeiten und committet `data.json`, `today_signal.json`, `backtest_results.json`.

## Deploy auf Cloudflare Pages
1. Repo zu GitHub pushen
2. cloudflare.com → Pages → "Connect to Git" → Repo wählen
3. Build settings: **leer lassen** (Static Site, root = `/`)
4. Deploy → erreichbar unter `xyz.pages.dev`
