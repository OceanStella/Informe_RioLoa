export function subtractMetrics(start: string | number, end: string | number): number | null {
  if (start === '' || end === '') return null;
  const s = Number(start);
  const e = Number(end);
  if (Number.isNaN(s) || Number.isNaN(e)) return null;
  return e - s;
}

export function calculateEffectiveHours(start: string | number, end: string | number): number | null {
  return subtractMetrics(start, end);
}

export function calculateTruckKm(kmStart: string | number, kmEnd: string | number): number | null {
  return subtractMetrics(kmStart, kmEnd);
}

export function calculateTruckOperationHours(start: string, end: string): number | null {
  return subtractMetrics(start, end);
}
