import type { BookingRequest } from "../types";

const DEFAULT_DURATION_MINUTES = 120;

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// Liefert den vermuteten Zeitrahmen in Minuten seit Mitternacht, oder null
// wenn gar keine Uhrzeit bekannt ist (dann gilt der ganze Tag als belegt).
// Fehlt nur die Endzeit, wird eine Standarddauer von 2 Stunden angenommen.
function getRange(time: string | null, endTime: string | null): [number, number] | null {
  if (!time) return null;
  const start = toMinutes(time);
  const end = endTime ? toMinutes(endTime) : start + DEFAULT_DURATION_MINUTES;
  return end > start ? [start, end] : [start, start + DEFAULT_DURATION_MINUTES];
}

export interface ConflictCheckInput {
  eventDate: string | null;
  eventTime: string | null;
  eventEndTime: string | null;
}

// Findet andere (nicht abgesagte) Anfragen am selben Datum, deren Zeitraum
// sich mit dem übergebenen überschneidet. Ist bei einer der beiden Seiten
// keine Uhrzeit bekannt, wird im Zweifel gewarnt statt die Anfrage zu
// übergehen.
export function findConflicts(
  input: ConflictCheckInput,
  requests: BookingRequest[],
  excludeId?: number
): BookingRequest[] {
  if (!input.eventDate) return [];
  const rangeA = getRange(input.eventTime, input.eventEndTime);

  return requests.filter((r) => {
    if (r.id === excludeId) return false;
    if (r.status === "declined") return false;
    if (r.eventDate !== input.eventDate) return false;

    const rangeB = getRange(r.eventTime, r.eventEndTime);
    if (!rangeA || !rangeB) return true;
    return rangeA[0] < rangeB[1] && rangeB[0] < rangeA[1];
  });
}
