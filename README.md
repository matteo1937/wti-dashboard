# Elektro Scanner

Produkterkennung per Foto/Barcode für Elektroinstallateure auf der Baustelle.
Erkennt Hersteller, Produkttyp und Verwendungszweck von Elektromaterial
(Steckdosen, Schalter, Sicherungsautomaten, Kabel, Verteiler, …) per Foto,
später auch per Barcode/QR-Scan.

## Status: MVP 3

**+ Grossisten-Logik (EM Standard, Sonepar-Fallback) und Eldas-Nummern.**
Zu jedem erkannten Produkt (per Barcode oder Foto) wird zusätzlich im
lokalen Produktkatalog nachgeschaut: Elektro-Material AG (EM) ist immer der
bevorzugte Grossist; ist das Produkt bei EM nicht verfügbar, wird
automatisch der Sonepar-Eintrag angezeigt. Die Produktkarte zeigt klar per
Badge, welcher Grossist gerade angezeigt wird, plus Eldas-Nummer, Preis,
Verfügbarkeit und Link.

⚠️ **Wichtig:** Es liegen noch **keine echten EM/Sonepar/Eldas-Daten** vor
(siehe „Katalog befüllen" unten). Der Katalog ist standardmässig leer, bis
du echte Daten importierst – bis dahin zeigt die App ehrlich „Kein
Katalogtreffer" an, statt etwas zu erfinden. Eine Formatvorlage mit klar
fiktiven Beispieldaten liegt in [`db/catalog-example.csv`](./db/catalog-example.csv).

## Etappenplan

| MVP | Umfang |
| --- | --- |
| **MVP 1** ✅ | Foto → Claude Vision → Anzeige (Hersteller, Typ, Verwendung). Keine DB, kein Team. |
| **MVP 2** ✅ | + Barcode/QR-Scan (html5-qrcode), lokale Produkt-DB (SQLite), EAN-Abgleich mit Fallback auf Foto-KI, Speichern für künftige Scans. |
| **MVP 3** ✅ | + Grossisten-Logik: EM als Standard, automatischer Sonepar-Fallback falls bei EM nicht verfügbar, Eldas-Nummern + Katalog-CSV-Import, Produktkarte zeigt Grossist-Badge/Preis/Verfügbarkeit/Link. |
| **MVP 4** | + Team-Funktion (Organisationen, Rollen Admin/Mitglied via Clerk), geteilte Scan-Historie, Migration SQLite → Postgres für Mehrbenutzer, Priorisierung bereits erfasster/korrigierter Produkte, automatische Ersatzprodukt-Vorschläge (alternatives-Tabelle), CSV/PDF-Export von Scan-Listen. |

Das Referenz-Datenmodell für MVP 4 (Postgres, Team-fähig) liegt bereits
(noch ungenutzt) in [`db/schema.sql`](./db/schema.sql). Die aktuelle
Datenbank (`data/products.db`, SQLite) ist bewusst einfacher gehalten, da
Team-Mehrbenutzer erst in MVP 4 gebraucht wird.

## Architektur (MVP 3)

```
src/                       React + Vite Frontend (PWA)
  components/
    CameraCapture.tsx      Foto-Aufnahme (Datei-Input mit Kamera-Capture)
    BarcodeScanner.tsx     Live-Kamera-Scan für Barcode/QR (html5-qrcode)
    ProductCard.tsx        Ergebnis-Anzeige inkl. Quelle, Grossist-Badge, Eldas-Nr.
  lib/api.ts                Ruft Backend-API auf
server/                    Node/Express Backend
  claude.ts                Anthropic Claude Vision Aufruf (strukturiertes JSON via Tool-Use)
  db.ts                    SQLite: Scan-Cache (products) + Katalog (catalog_products,
                            supplier_listings) inkl. findCatalogMatch() mit EM/Sonepar-Logik
  scripts/import-catalog.ts CSV-Import fürs Befüllen des Katalogs
  index.ts                 Express-Server: /api/recognize, /api/products/by-ean/:ean, /api/products
db/schema.sql               Referenz-Datenmodell für MVP 4 (Postgres, noch nicht aktiv)
db/catalog-example.csv      CSV-Formatvorlage mit fiktiven Beispieldaten (kein Import per Default)
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

### 5. Katalog befüllen (Eldas-Nummern + Grossisten)

Es gibt keine offene EM/Sonepar-API – der Katalog wird per CSV importiert.
Spalten (eine Zeile = ein Grossisten-Eintrag für ein Produkt):

```
hersteller,bezeichnung,typ,kategorie,eldas_nummer,ean_barcode,beschreibung,grossist,prioritaet,shop_url,verfuegbar,preis_chf
```

- `eldas_nummer` ist Pflicht und identifiziert das Produkt eindeutig (auch über mehrere Grossisten-Zeilen hinweg).
- `grossist` muss `EM`, `Sonepar`, `Otto Fischer` oder `Bugnard` sein.
- `prioritaet` optional – ohne Angabe wird automatisch EM=10, Sonepar=20, Otto Fischer=30, Bugnard=40 gesetzt (niedriger = bevorzugt). Die EM-vor-Sonepar-Logik ergibt sich automatisch daraus.
- Erneuter Import derselben `eldas_nummer`+`grossist`-Kombination aktualisiert den bestehenden Eintrag (z.B. für Preis-/Verfügbarkeits-Updates).

```bash
npm run import:catalog -- pfad/zu/deiner-datei.csv
```

Formatvorlage mit **rein fiktiven** Beispieldaten: [`db/catalog-example.csv`](./db/catalog-example.csv)
(zeigt auch den EM-nicht-verfügbar → Sonepar-Fallback-Fall).

### 6. Build

```bash
npm run build     # Frontend-Build nach dist/
npm run typecheck # Typprüfung Frontend + Backend
```

## Nächste Schritte

MVP 4: Team-Funktion (Organisationen, Rollen, geteilte Scan-Historie),
Migration der lokalen SQLite-DB auf Postgres für echten Mehrbenutzer-Betrieb,
automatische Ersatzprodukt-Vorschläge über die `alternatives`-Tabelle im
Referenz-Datenmodell, CSV/PDF-Export von Scan-Listen.
