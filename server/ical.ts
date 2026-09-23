import type { BookingRequest } from "./types";

const DEFAULT_DURATION_MINUTES = 120;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function parseLocal(date: string, time?: string): Date {
  const [h, m] = (time ?? "00:00").split(":").map(Number);
  const d = new Date(`${date}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatIcsDateTime(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function formatIcsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Erzeugt für alle bestätigten Anfragen mit Datum ein VEVENT. Anfragen ohne
// Datum können nicht sinnvoll ins Kalenderformat übernommen werden und
// werden übersprungen. Fehlt die Uhrzeit, wird ein ganztägiges Ereignis
// erzeugt; fehlt nur die Endzeit, wird eine Standarddauer von 2 Stunden
// angenommen. Geht die Endzeit über Mitternacht (z.B. 20:00–02:00), wird
// automatisch ein Tag addiert.
export function buildIcs(requests: BookingRequest[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tal-Echo//Auftritte//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tal-Echo Auftritte"
  ];

  const stamp = `${formatIcsDateTime(new Date())}Z`;

  for (const r of requests) {
    if (!r.eventDate) continue;

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:talecho-request-${r.id}@tal-echo`);
    lines.push(`DTSTAMP:${stamp}`);

    if (r.eventTime) {
      const start = parseLocal(r.eventDate, r.eventTime);
      let end: Date;
      if (r.eventEndTime) {
        end = parseLocal(r.eventDate, r.eventEndTime);
        if (end <= start) end.setDate(end.getDate() + 1);
      } else {
        end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60000);
      }
      lines.push(`DTSTART:${formatIcsDateTime(start)}`);
      lines.push(`DTEND:${formatIcsDateTime(end)}`);
    } else {
      const start = parseLocal(r.eventDate);
      const end = new Date(start.getTime() + 24 * 60 * 60000);
      lines.push(`DTSTART;VALUE=DATE:${formatIcsDate(start)}`);
      lines.push(`DTEND;VALUE=DATE:${formatIcsDate(end)}`);
    }

    lines.push(`SUMMARY:${escapeText(r.title)}`);
    if (r.location) lines.push(`LOCATION:${escapeText(r.location)}`);

    const descriptionParts: string[] = [];
    if (r.client) descriptionParts.push(`Auftraggeber: ${r.client}`);
    if (r.contact) descriptionParts.push(`Kontakt: ${r.contact}`);
    if (r.notes) descriptionParts.push(r.notes);
    if (descriptionParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeText(descriptionParts.join("\n"))}`);
    }

    lines.push("STATUS:CONFIRMED");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
