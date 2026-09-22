# Tal-Echo — Auftrittsanfragen

Web-App zur Verwaltung von Auftrittsanfragen für das Ländlertrio **Tal-Echo**
(3 feste Mitglieder). Anfragen werden zentral erfasst, von allen drei
Mitgliedern abgestimmt und bei einstimmigem Ja automatisch in den
gemeinsamen Kalender übernommen.

## Funktionen

- **Anfrage erfassen** — Datum/Uhrzeit, Ort/Veranstaltung, Auftraggeber,
  Notizen (Honorar, Dauer, Wünsche) und Quelle (E-Mail-Screenshot,
  Telefonanruf, Direkteingabe).
- **Automatische Datumserkennung aus Screenshots** — Beim Hochladen eines
  Fotos/Screenshots einer E-Mail extrahiert die App per OCR (Tesseract.js,
  läuft im Browser) automatisch Datum, Uhrzeit, Ort und Absender als
  Vorschlag. Die Felder bleiben vor dem Speichern bearbeitbar.
- **Abstimmung** — Jedes der 3 Mitglieder stimmt mit 👍 Ja / 🤷 Unsicher /
  👎 Nein ab. Sobald alle drei mit Ja gestimmt haben, wechselt die Anfrage
  automatisch von „In Abstimmung" zu „Bestätigt" und erscheint im Kalender.
- **Kalenderansicht** — Monatsansicht und Listenansicht aller bestätigten
  Termine, getrennt von der Liste offener/in Abstimmung befindlicher
  Anfragen.
- **Hinweise** — Ein Badge in der Navigation zeigt jedem Mitglied direkt an,
  bei wie vielen offenen Anfragen die eigene Stimme noch fehlt.

## Architektur

```
src/                       React + Vite Frontend (PWA, mobile-first)
  context/
    AuthContext.tsx         Login-Status (3 feste Mitglieder)
    RequestsContext.tsx      Zentraler Anfragen-Cache für Badges/Listen
  lib/
    api.ts                   Fetch-Wrapper fürs Backend
    ocr.ts                   Tesseract.js-Aufruf + Heuristiken (Datum/Zeit/
                              Ort/Absender aus E-Mail-Text erkennen)
  pages/
    Login.tsx                Profil wählen + gemeinsamer Zugangscode
    OpenRequests.tsx          Offene Anfragen, getrennt nach "wartet auf
                              dich" / "wartet auf die anderen"
    NewRequest.tsx            Anfrage erfassen inkl. Foto-Upload + OCR
    RequestDetail.tsx         Details, Abstimmung, Bearbeiten, Absagen
    Calendar.tsx               Monats-/Listenansicht bestätigter Termine
  components/                Navbar, VoteButtons, RequestCard, StatusBadge, …
server/                     Node/Express Backend
  db.ts                      SQLite (node:sqlite) — members, requests, votes
  auth.ts                    Login per Name + gemeinsamem Zugangscode,
                              Sitzung als signiertes JWT-Cookie
  index.ts                   Express-Routen (Auth, Requests, Votes, Uploads)
```

Die SQLite-Datenbank (`data/trio.db`) und hochgeladene Screenshots
(`data/uploads/`) werden dauerhaft auf dem Server gespeichert (nicht nur im
Browser) — Grundlage für Mehrbenutzer-Betrieb der 3 Accounts.

### Warum kein externer OCR-Dienst?

Die Texterkennung läuft komplett im Browser via
[Tesseract.js](https://github.com/naptha/tesseract.js) — kein API-Key, keine
Kosten pro Bild. Die deutsche Spracherkennung wird beim ersten Einsatz
einmalig nachgeladen (Internetverbindung nötig) und danach vom Browser
zwischengespeichert. Die Erkennung ist heuristisch (Regex für Datum, Uhrzeit,
PLZ+Ort, „Von:"/„Betreff:"-Zeilen) und dient bewusst nur als **Vorschlag** —
alle Felder bleiben vor dem Speichern editierbar.

## Setup

### 1. Voraussetzungen

- Node.js ≥ 22.5 (nutzt das eingebaute `node:sqlite`, kein separates
  Datenbank-Programm nötig)

### 2. Projekt einrichten

```bash
npm install
cp .env.example .env
```

In `.env` anpassen:

- `MEMBER_NAMES` — die 3 Vornamen der Trio-Mitglieder (kommagetrennt)
- `APP_PASSCODE` — gemeinsamer Zugangscode für die App (unbedingt ändern!)
- `JWT_SECRET` — zufällige, lange Zeichenfolge zum Signieren der Sitzung

### 3. Lokal starten

```bash
npm run dev
```

Startet gleichzeitig:
- Vite-Dev-Server (Frontend) auf `http://localhost:5173`
- Express-Backend auf `http://localhost:8787`

Auf dem Handy: gleiches WLAN, `http://<rechner-ip>:5173` öffnen, "Zum
Homescreen hinzufügen" für die installierbare PWA.

### 4. Produktion

```bash
npm run build
npm start
```

Der Node-Prozess liefert dann sowohl die API als auch das gebaute Frontend
über denselben Port aus (siehe `PORT` in `.env`) — ein einzelner
Hosting-Service reicht.

### 5. Build/Typecheck prüfen

```bash
npm run typecheck
npm run build
```

## Bekannte Einschränkungen / nächste Schritte

- **Login** ist bewusst simpel gehalten (Name wählen + ein gemeinsamer
  Zugangscode) statt individueller Passwörter — passend für 3 vertraute
  Mitglieder ohne öffentlichen Zugriff. Für mehr Sicherheit könnte jedes
  Mitglied stattdessen ein eigenes Passwort erhalten.
  Diese Umgebung nutzt zudem Node's `node:sqlite` (Stand: experimentell,
  Warnung beim Start ist normal) statt eines externen DB-Servers, damit
  keine zusätzliche Infrastruktur nötig ist.
- **Push/E-Mail-Benachrichtigungen** sind nicht implementiert (nur
  In-App-Badge wie gefordert); könnten über einen Web-Push-Dienst oder
  einen E-Mail-Versand (z.B. Resend/SMTP) ergänzt werden.
- Zwei Dev-Abhängigkeiten (`vite`, `react-router-dom`) haben laut
  `npm audit` bekannte, aber für dieses interne 3-Personen-Setup
  risikoarme Advisories (Dev-Server-Exposition bzw. SSR-spezifisch, hier
  nicht genutzt). Ein Upgrade auf die jeweils nächste Major-Version ist
  möglich, aber nicht Teil dieses Umbaus.
