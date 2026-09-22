# Elektro Scanner

Produkterkennung per Foto/Barcode für Elektroinstallateure auf der Baustelle,
im Team nutzbar. Erkennt Hersteller, Produkttyp und Verwendungszweck von
Elektromaterial (Steckdosen, Schalter, Sicherungsautomaten, Kabel,
Verteiler, …) per Foto oder Barcode/QR-Scan, gleicht mit Elektro-Material AG
(EM) / Sonepar und Eldas-Nummern ab, und teilt Scans im ganzen Team.

## Status: MVP 4

**+ Team-Funktion: Organisationen, Rollen, geteilte Scan-Historie, Postgres.**
Anmeldung über Clerk, ein Team = eine Clerk-Organisation. Jeder Scan/jede
Produkt-Zuordnung ist team-weit (org-weit) sichtbar: Hat ein Kollege ein
Produkt schon erfasst oder korrigiert, wird das beim nächsten Barcode-Scan
sofort priorisiert angezeigt ("🧑‍🔧 erfasst von Anna" / "✅ korrigiert von
Bob"). Rollen: **Admin** kann Produktdaten korrigieren, **Mitglied** kann
nur scannen (und neue Barcode-Treffer speichern). Alle Scans landen in einer
gemeinsamen, filterbaren Historie mit CSV-/PDF-Export.

⚠️ **Zum Testen wird ein eigener Clerk-Account samt API-Keys benötigt** –
genau wie beim Anthropic-Key kann ich das nicht für dich einrichten, siehe
„Clerk einrichten" unten.

## Etappenplan

| MVP | Umfang |
| --- | --- |
| **MVP 1** ✅ | Foto → Claude Vision → Anzeige (Hersteller, Typ, Verwendung). Keine DB, kein Team. |
| **MVP 2** ✅ | + Barcode/QR-Scan (html5-qrcode), lokale Produkt-DB, EAN-Abgleich mit Fallback auf Foto-KI, Speichern für künftige Scans. |
| **MVP 3** ✅ | + Grossisten-Logik: EM als Standard, automatischer Sonepar-Fallback falls bei EM nicht verfügbar, Eldas-Nummern + Katalog-CSV-Import, Produktkarte zeigt Grossist-Badge/Preis/Verfügbarkeit/Link. |
| **MVP 4** ✅ | + Team-Auth (Clerk, Organisationen, Rollen Admin/Mitglied), Postgres statt SQLite (Mehrbenutzer-fähig, org-isoliert), Team-Priorisierung bereits erfasster/korrigierter Produkte, Admin-Korrektur-Formular, geteilte Scan-Historie mit Filtern + CSV/PDF-Export. |

Offen für später: automatische Ersatzprodukt-Vorschläge über die
`alternatives`-Tabelle im Referenz-Datenmodell ([`db/schema.sql`](./db/schema.sql)) –
aktuell zeigt die App nur Such-Kriterien fürs manuelle Suchen an, siehe MVP 3.

## Architektur (MVP 4)

```
src/                        React + Vite Frontend (PWA)
  components/
    TeamHeader.tsx           OrganizationSwitcher + UserButton + Rollen-Badge (Clerk)
    ScannerView.tsx           Scan-Flow (Foto/Barcode), Projekt-Tag, Speichern
    HistoryView.tsx           Geteilte Scan-Historie, Filter, CSV/PDF-Export
    CameraCapture.tsx         Foto-Aufnahme (Datei-Input mit Kamera-Capture)
    BarcodeScanner.tsx        Live-Kamera-Scan für Barcode/QR (html5-qrcode)
    ProductCard.tsx           Ergebnis-Anzeige inkl. Grossist-Badge, Team-Attribution
    CorrectionForm.tsx        Admin-only Korrektur-Formular
  lib/api.ts                  Ruft Backend-API auf
server/                      Node/Express Backend
  auth.ts                     Clerk-Middleware: Org + Rolle (org:admin -> Admin) an req.appAuth
  claude.ts                   Anthropic Claude Vision Aufruf (strukturiertes JSON via Tool-Use)
  db.ts                       Postgres (pg): products (org-isoliert), catalog_products,
                               supplier_listings, scans – inkl. findCatalogMatch() (EM/Sonepar)
  export.ts                   CSV-/PDF-Generierung für die Scan-Historie
  migrations/001_init.sql     Postgres-Schema
  scripts/migrate.ts          Migration ausführen
  scripts/import-catalog.ts   CSV-Import fürs Befüllen des Grossisten-Katalogs
  index.ts                    Express-Server, alle /api/*-Routen ausser /api/health erfordern Login
db/schema.sql                 Vollständiges Referenz-Datenmodell (inkl. `alternatives`, noch nicht genutzt)
db/catalog-example.csv        CSV-Formatvorlage mit fiktiven Beispieldaten (kein Import per Default)
```

Organisationen und Benutzer werden **von Clerk verwaltet** – es gibt bewusst
keine lokalen `organizations`/`users`-Tabellen, die Postgres-Tabellen
speichern nur Clerk-IDs (`org_id`, `user_id`) als Referenz. Der Claude- und
Clerk-Secret-Key liegen **nur auf dem Backend** (`.env`), niemals im
Browser-Code.

## Setup

### 1. Voraussetzungen

- Node.js ≥ 20 (nutzt das eingebaute `node:sqlite`-Modul nicht mehr, aber `node:crypto` u.a.)
- Postgres ≥ 13 (lokal oder gehostet, z.B. Neon/Supabase/Railway)
- Ein Anthropic API-Key
- Ein Clerk-Account mit aktivierten Organisationen

### 2. Anthropic API Key erstellen

1. Gehe auf [console.anthropic.com](https://console.anthropic.com) und logge dich ein / erstelle einen Account.
2. Links im Menü auf **API Keys** klicken.
3. **Create Key** klicken, einen Namen vergeben (z.B. "elektro-scanner-dev").
4. Den angezeigten Key (`sk-ant-...`) sofort kopieren – er wird nur einmal angezeigt.
5. Unter **Billing** ein kleines Guthaben hinterlegen (Vision-Aufrufe sind pro Bild sehr günstig, im Cent-Bereich).

### 3. Postgres einrichten

Lokal (Beispiel Ubuntu/Debian):

```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE ROLE elektro_scanner LOGIN PASSWORD 'dein-passwort';"
sudo -u postgres psql -c "CREATE DATABASE elektro_scanner OWNER elektro_scanner;"
```

Alternativ: kostenlose gehostete Postgres-DB bei [Neon](https://neon.tech) oder [Supabase](https://supabase.com) anlegen und die Connection-URL kopieren.

`DATABASE_URL` in `.env` eintragen, dann Schema anlegen:

```bash
npm run migrate
```

### 4. Clerk einrichten

1. Auf [dashboard.clerk.com](https://dashboard.clerk.com) einloggen / Account erstellen.
2. **Create application**, einen Namen vergeben (z.B. "Elektro Scanner").
3. **Organizations** in den Einstellungen aktivieren (Sidebar → *Organizations* → *Enable organizations*) – wird für die Team-Funktion gebraucht.
4. Unter **API Keys**: `Publishable key` (`pk_test_...`) und `Secret key` (`sk_test_...`) kopieren.
5. In `.env` eintragen (der Publishable Key kommt **zweimal** rein, siehe Kommentar in `.env.example`):
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
6. Erster Start (siehe unten) → im Browser registrieren/anmelden → über den Team-Umschalter oben eine Organisation erstellen. Das erste Mitglied einer Organisation wird von Clerk automatisch zum **Admin**; weitere Personen lädst du über den Organisations-Umschalter ein.

### 5. Projekt einrichten

```bash
npm install
cp .env.example .env
# .env öffnen: ANTHROPIC_API_KEY, DATABASE_URL, CLERK_* eintragen
npm run migrate
```

### 6. Lokal starten

```bash
npm run dev
```

Startet gleichzeitig:
- Vite-Dev-Server (Frontend) auf `http://localhost:5173`
- Express-Backend auf `http://localhost:8787`

Das Frontend proxied `/api/*`-Aufrufe automatisch zum Backend (inkl.
Clerk-Session-Cookie, da beides im Dev-Modus als eine Origin erscheint).

Auf dem Handy: gleiches WLAN, `http://<rechner-ip>:5173` öffnen, "Zum
Homescreen hinzufügen" für die installierbare PWA. Kameraaufnahme nutzt den
Datei-Input mit `capture="environment"` (Rückkamera). Für den
Barcode/QR-Live-Scan (`getUserMedia`) wird auf dem Handy **HTTPS oder
localhost** benötigt – im reinen `http://<ip>`-WLAN-Test blockt der Browser
das ggf.

### 7. Katalog befüllen (Eldas-Nummern + Grossisten)

Es gibt keine offene EM/Sonepar-API – der Katalog wird per CSV importiert.
Spalten (eine Zeile = ein Grossisten-Eintrag für ein Produkt):

```
hersteller,bezeichnung,typ,kategorie,eldas_nummer,ean_barcode,beschreibung,grossist,prioritaet,shop_url,verfuegbar,preis_chf
```

- `eldas_nummer` ist Pflicht und identifiziert das Produkt eindeutig (auch über mehrere Grossisten-Zeilen hinweg).
- `grossist` muss `EM`, `Sonepar`, `Otto Fischer` oder `Bugnard` sein.
- `prioritaet` optional – ohne Angabe wird automatisch EM=10, Sonepar=20, Otto Fischer=30, Bugnard=40 gesetzt (niedriger = bevorzugt). Die EM-vor-Sonepar-Logik ergibt sich automatisch daraus.
- Erneuter Import derselben `eldas_nummer`+`grossist`-Kombination aktualisiert den bestehenden Eintrag (z.B. für Preis-/Verfügbarkeits-Updates). Der Katalog ist bewusst **nicht** team-spezifisch, sondern eine gemeinsame Referenztabelle für alle Teams.

```bash
npm run import:catalog -- pfad/zu/deiner-datei.csv
```

Formatvorlage mit **rein fiktiven** Beispieldaten: [`db/catalog-example.csv`](./db/catalog-example.csv)
(zeigt auch den EM-nicht-verfügbar → Sonepar-Fallback-Fall).

### 8. Build

```bash
npm run build     # Frontend-Build nach dist/
npm run typecheck # Typprüfung Frontend + Backend
```

## Rollen & Team-Funktion im Detail

- **Mitglied**: kann scannen (Foto + Barcode), neue Barcode-Treffer speichern, Scan-Historie einsehen/exportieren.
- **Admin**: zusätzlich das Recht, bestehende Produkteinträge zu korrigieren (Button "✏️ Korrigieren" auf der Produktkarte, nur bei bereits gespeicherten Barcode-Treffern sichtbar). Die erste Person, die eine Clerk-Organisation erstellt, ist automatisch Admin.
- Alle Daten (gespeicherte Produkte, Scan-Historie) sind strikt nach Organisation getrennt (`org_id`-Spalte) – ein Team sieht nie Daten eines anderen Teams.
- Der Produktkatalog (Eldas/Grossisten, MVP 3) ist bewusst **team-übergreifend gemeinsam**, da es eine objektive Referenzdatenquelle ist, keine team-spezifische Korrektur.

## Nächste Schritte

Automatische Ersatzprodukt-Vorschläge über die `alternatives`-Tabelle im
Referenz-Datenmodell (kompatible Alternativen anderer Hersteller
vorschlagen, nicht nur Such-Kriterien anzeigen).
