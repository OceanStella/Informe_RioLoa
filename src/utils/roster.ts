import type { EquipmentType } from '../types/config';
import type { ActiveRosterAssignment, Activity, EquipmentAssignment, OperationalData } from '../types/report';
import { calculateEffectiveHours, calculateTruckKm } from './metrics';

export const MAX_HOURMETER_HOURS = 12;

export const HOURMETER_RANGE_MESSAGE =
  'La diferencia entre horómetros supera las 12 horas. Corrobora la información ingresada.';
export const HOURMETER_ORDER_MESSAGE = 'El horómetro final debe ser igual o mayor al inicial.';
export const ROSTER_INVALID_MESSAGE = 'Los datos de Dotación activa de este equipo contienen errores.';
export const ROSTER_MISSING_MESSAGE = 'Este equipo no tiene datos en Dotación activa.';

export function emptyOperationalData(type: EquipmentType): OperationalData {
  return {
    operator: '',
    hourmeterStart: '',
    hourmeterEnd: '',
    ...(type === 'truck' ? { kmStart: '', kmEnd: '' } : {}),
  };
}

export function getRosterAssignment(
  roster: ActiveRosterAssignment[],
  equipmentId: string,
): ActiveRosterAssignment | undefined {
  return roster.find((item) => item.equipmentId === equipmentId);
}

export function usesRosterData(roster: ActiveRosterAssignment[], equipmentId: string): boolean {
  return roster.some((item) => item.equipmentId === equipmentId);
}

export function resolveEquipmentOperationalData(
  assignment: EquipmentAssignment,
  roster: ActiveRosterAssignment[],
): OperationalData {
  const fromRoster = getRosterAssignment(roster, assignment.equipmentId);
  if (fromRoster) {
    return {
      operator: fromRoster.operator,
      hourmeterStart: fromRoster.hourmeterStart,
      hourmeterEnd: fromRoster.hourmeterEnd,
      kmStart: fromRoster.kmStart,
      kmEnd: fromRoster.kmEnd,
    };
  }
  return emptyOperationalData(assignment.equipmentType);
}

export function getHourmeterDifferenceError(start: string, end: string): string | null {
  if (!start.trim() || !end.trim()) return null;
  const diff = calculateEffectiveHours(start, end);
  if (diff === null) return null;
  if (diff < 0) return HOURMETER_ORDER_MESSAGE;
  if (diff > MAX_HOURMETER_HOURS) return HOURMETER_RANGE_MESSAGE;
  return null;
}

export function getKmDifferenceError(start: string | undefined, end: string | undefined): string | null {
  if (!start?.trim() || !end?.trim()) return null;
  const diff = calculateTruckKm(start, end);
  if (diff === null) return null;
  if (diff < 0) return 'El kilometraje final debe ser igual o mayor al inicial.';
  return null;
}

export function isRosterReady(item: ActiveRosterAssignment): boolean {
  if (!item.operator.trim()) return false;
  if (!item.hourmeterStart.trim() || !item.hourmeterEnd.trim()) return false;
  if (getHourmeterDifferenceError(item.hourmeterStart, item.hourmeterEnd)) return false;
  if (item.equipmentType === 'truck') {
    if (!item.kmStart?.trim() || !item.kmEnd?.trim()) return false;
    if (getKmDifferenceError(item.kmStart, item.kmEnd)) return false;
  }
  return true;
}

export function hasRosterOperationalData(item: ActiveRosterAssignment): boolean {
  return Boolean(
    item.operator.trim() ||
      item.hourmeterStart.trim() ||
      item.hourmeterEnd.trim() ||
      item.kmStart?.trim() ||
      item.kmEnd?.trim(),
  );
}

export function formatRosterTooltip(item: ActiveRosterAssignment): string {
  const lines = [item.equipmentCode, `Operador: ${item.operator.trim() || '—'}`];
  lines.push(`Horómetro: ${item.hourmeterStart.trim() || '—'} → ${item.hourmeterEnd.trim() || '—'}`);
  if (item.equipmentType === 'truck') {
    lines.push(`KM: ${item.kmStart?.trim() || '—'} → ${item.kmEnd?.trim() || '—'}`);
  }
  return lines.join('\n');
}

export function shouldIncludeWatermasterReport(hourmeterStart: string, hourmeterEnd: string): boolean {
  return Boolean(hourmeterStart.trim() && hourmeterEnd.trim());
}

export function isActivityEmptyForPdf(activity: Activity): boolean {
  if (activity.kind !== 'watermaster') return false;

  const wm = activity.watermaster;
  const hasWatermasterData = Boolean(
    wm &&
      (wm.sector.trim() ||
        wm.operator.trim() ||
        wm.hourmeterStart.trim() ||
        wm.hourmeterEnd.trim() ||
        wm.pumpHourmeterStart.trim() ||
        wm.pumpHourmeterEnd.trim() ||
        wm.depth !== null ||
        wm.hardness !== null ||
        wm.manufacturerPerformance.trim()),
  );

  return (
    !activity.area.trim() &&
    !activity.customArea?.trim() &&
    !activity.description.trim() &&
    !activity.supportEquipment?.trim() &&
    activity.equipmentAssignments.length === 0 &&
    !activity.beforePhoto &&
    !activity.afterPhoto &&
    !hasWatermasterData
  );
}
