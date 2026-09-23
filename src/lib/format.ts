export function formatTimeRange(start: string | null, end: string | null): string | null {
  if (start && end) return `${start}–${end} Uhr`;
  if (start) return `ab ${start} Uhr`;
  if (end) return `bis ${end} Uhr`;
  return null;
}
