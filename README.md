# Elektro Scanner

Produkterkennung per Foto/Barcode für Elektroinstallateure auf der Baustelle.
Erkennt Hersteller, Produkttyp und Verwendungszweck von Elektromaterial
(Steckdosen, Schalter, Sicherungsautomaten, Kabel, Verteiler, …) per Foto,
später auch per Barcode/QR-Scan.

## Status: MVP 2

**Barcode/QR-Scan (bevorzugt) + Foto-Fallback + lokale Produkt-DB.** Barcode-
Treffer sind zuverlässiger als Bilderkennung, deshalb: zuerst Barcode/QR
scannen und mit der lokalen SQLite-Datenbank abgleichen. Kein Treffer? Dann
automatisch Foto-KI-Fallback anbieten – und das Ergebnis für dieses Barcode
speichern, damit der nächste Scan (auch von Kollegen, sobald Team-Sync in
MVP 4 kommt) sofort einen Treffer liefert. Noch kein Login/Team, keine
Grossisten-Anbindung.

## Etappenplan

| MVP | Umfang |
| --- | --- |
| **MVP 1** ✅ | Foto → Claude Vision → Anzeige (Hersteller, Typ, Verwendung). Keine DB, kein Team. |
| **MVP 2** ✅ | + Barcode/QR-Scan (html5-qrcode), lokale Produkt-DB (SQLite), EAN-Abgleich mit Fallback auf Foto-KI, Speichern für künftige Scans. |
| **MVP 3** | + Grossisten-Logik: Elektro-Material AG (EM) als Standard, automatischer Sonepar-Fallback falls bei EM nicht gelistet, Eldas-Nummern-Referenztabelle (CSV-Import), echte Ersatzprodukte statt nur Such-Kriterien. |
| **MVP 4** | + Team-Funktion (Organisationen, Rollen Admin/Mitglied via Clerk), geteilte Scan-Historie, Migration SQLite → Postgres für Mehrbenutzer, Priorisierung bereits erfasster/korrigierter Produkte, CSV/PDF-Export von Scan-Listen. |

Das Referenz-Datenmodell für MVP 4 (Postgres, Team-fähig) liegt bereits
(noch ungenutzt) in [`db/schema.sql`](./db/schema.sql). Die aktuelle
MVP-2-Datenbank (`data/products.db`, SQLite) ist bewusst einfacher gehalten,
da Team-Mehrbenutzer erst in MVP 4 gebraucht wird.

## Architektur (MVP 2)

```
src/                       React + Vite Frontend (PWA)
  components/
    CameraCapture.tsx      Foto-Aufnahme (Datei-Input mit Kamera-Capture)
    BarcodeScanner.tsx     Live-Kamera-Scan für Barcode/QR (html5-qrcode)
    ProductCard.tsx        Ergebnis-Anzeige inkl. Quelle (DB vs. KI)
  lib/api.ts                Ruft Backend-API auf
server/                    Node/Express Backend
  claude.ts                Anthropic Claude Vision Aufruf (strukturiertes JSON via Tool-Use)
  db.ts                    Lokale SQLite-Produkt-DB (Node built-in node:sqlite)
  index.ts                 Express-Server: /api/recognize, /api/products/by-ean/:ean, /api/products
db/schema.sql               Referenz-Datenmodell für MVP 4 (Postgres, noch nicht aktiv)
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

Für MVP 3 (Eldas-Nummern, EM/Sonepar-Anbindung, echte Ersatzprodukte) wird
eine CSV-Datenquelle für Eldas-Nummern bzw. Produktdaten benötigt, da keine
offene EM/Sonepar-API bekannt ist.
