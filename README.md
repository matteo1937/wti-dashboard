# Elektro Scanner

Produkterkennung per Foto/Barcode für Elektroinstallateure auf der Baustelle.
Erkennt Hersteller, Produkttyp und Verwendungszweck von Elektromaterial
(Steckdosen, Schalter, Sicherungsautomaten, Kabel, Verteiler, …) per Foto,
später auch per Barcode/QR-Scan.

## Status: MVP 1

**Foto → Claude Vision → Anzeige.** Kein Login, keine Datenbank, keine
Grossisten-Anbindung. Das ist bewusst der einfachste End-to-End-Durchstich:
ein Foto aufnehmen, an Claude (Vision) schicken, strukturiertes Ergebnis
anzeigen.

## Etappenplan

| MVP | Umfang |
| --- | --- |
| **MVP 1** ✅ | Foto → Claude Vision → Anzeige (Hersteller, Typ, Verwendung). Keine DB, kein Team. |
| **MVP 2** | + Barcode/QR-Scan (html5-qrcode/ZXing), lokale Produkt-DB (Postgres), EAN-Abgleich mit Fallback auf Foto-KI. |
| **MVP 3** | + Grossisten-Logik: Elektro-Material AG (EM) als Standard, automatischer Sonepar-Fallback falls bei EM nicht gelistet, Eldas-Nummern-Referenztabelle (CSV-Import). |
| **MVP 4** | + Team-Funktion (Organisationen, Rollen Admin/Mitglied via Clerk), geteilte Scan-Historie, Priorisierung bereits erfasster/korrigierter Produkte, CSV/PDF-Export von Scan-Listen. |

Das Referenz-Datenmodell für MVP 2+ liegt bereits (noch ungenutzt) in
[`db/schema.sql`](./db/schema.sql).

## Architektur (MVP 1)

```
src/            React + Vite Frontend (PWA)
  components/   CameraCapture, ProductCard
  lib/api.ts    Ruft Backend-API auf
server/         Node/Express Backend
  claude.ts     Anthropic Claude Vision Aufruf (strukturiertes JSON via Tool-Use)
  index.ts      Express-Server, Endpoint POST /api/recognize
db/schema.sql   Referenz-Datenmodell für spätere MVPs (noch nicht aktiv)
```

Der Claude API-Key liegt **nur auf dem Backend** (server/.env), niemals im
Browser-Code – sonst könnte ihn jeder aus dem Frontend auslesen.

## Setup

### 1. Voraussetzungen

- Node.js ≥ 20
- Ein Anthropic API-Key (siehe unten)

### 2. Anthropic API Key erstellen

1. Gehe auf [console.anthropic.com](https://console.anthropic.com) und logge dich ein / erstelle einen Account.
2. Links im Menü auf **API Keys** klicken.
3. **Create Key** klicken, einen Namen vergeben (z.B. "elektro-scanner-dev").
4. Den angezeigten Key (`sk-ant-...`) sofort kopieren – er wird nur einmal angezeigt.
5. Unter **Billing** ein kleines Guthaben hinterlegen (Vision-Aufrufe sind pro Bild sehr günstig, im Cent-Bereich).

### 3. Projekt einrichten

```bash
npm install
cp .env.example .env
# .env öffnen und ANTHROPIC_API_KEY=sk-ant-... eintragen
```

### 4. Lokal starten

```bash
npm run dev
```

Startet gleichzeitig:
- Vite-Dev-Server (Frontend) auf `http://localhost:5173`
- Express-Backend auf `http://localhost:8787`

Das Frontend proxied `/api/*`-Aufrufe automatisch zum Backend.

Auf dem Handy: gleiches WLAN, `http://<rechner-ip>:5173` öffnen, "Zum
Homescreen hinzufügen" für die installierbare PWA. Kameraaufnahme nutzt den
Datei-Input mit `capture="environment"` (Rückkamera) – funktioniert ohne
zusätzliche Berechtigungsdialoge zuverlässig auf iOS und Android.

### 5. Build

```bash
npm run build     # Frontend-Build nach dist/
npm run typecheck # Typprüfung Frontend + Backend
```

## Nächste Schritte

MVP 2 (Barcode/QR-Scan + lokale Produkt-DB) folgt, sobald MVP 1 auf der
Baustelle getestet wurde. Für MVP 3 (Eldas-Nummern, EM/Sonepar-Anbindung)
wird eine CSV-Datenquelle für Eldas-Nummern bzw. Produktdaten benötigt, da
keine offene EM/Sonepar-API bekannt ist.
