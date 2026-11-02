import type { AppConfig } from '../types/config';
import type { ActiveRosterAssignment, Activity, EquipmentAssignment, WatermasterData } from '../types/report';
import {
  calculateEffectiveHours,
  calculateTruckKm,
  calculateTruckOperationHours,
  subtractMetrics,
} from './metrics';
import { resolveEquipmentOperationalData } from './roster';

export const FALLBACK_TRUCK_M3_PER_TRIP = 18;

export {
  calculateEffectiveHours,
  calculateTruckKm,
  calculateTruckOperationHours,
  subtractMetrics,
};

export function calculatePumpHours(start: string | number, end: string | number): number | null {
  return subtractMetrics(start, end);
}

export function calculateWatermasterM3(
  performance: string | number,
  effectiveHours: string | number | null,
): number | null {
  if (performance === '' || effectiveHours === null || effectiveHours === '') return null;
  const p = Number(performance);
  const h = Number(effectiveHours);
  if (Number.isNaN(p) || Number.isNaN(h) || h <= 0) return null;
  return p * h;
}

export function calculateHourlyPerformance(totalM3: number | null, effectiveHours: number | null): number | null {
  if (totalM3 === null || effectiveHours === null || effectiveHours <= 0) return null;
  return totalM3 / effectiveHours;
}

export function getWatermasterEffectiveHours(wm: WatermasterData | undefined): number | null {
  if (!wm) return null;
  return calculateEffectiveHours(wm.hourmeterStart, wm.hourmeterEnd);
}

export function getWatermasterPumpHours(wm: WatermasterData | undefined): number | null {
  if (!wm) return null;
  return calculatePumpHours(wm.pumpHourmeterStart, wm.pumpHourmeterEnd);
}

export function getWatermasterTotalM3(wm: WatermasterData | undefined): number | null {
  if (!wm) return null;
  const hours = getWatermasterEffectiveHours(wm);
  return calculateWatermasterM3(wm.manufacturerPerformance, hours);
}

export function getWatermasterHourlyPerformance(wm: WatermasterData | undefined): number | null {
  const total = getWatermasterTotalM3(wm);
  const hours = getWatermasterEffectiveHours(wm);
  return calculateHourlyPerformance(total, hours);
}

export function calculateTruckM3(trips: string | number, capacityM3PerTrip: number): number | null {
  if (trips === '') return null;
  const t = Number(trips);
  if (Number.isNaN(t) || t < 0) return null;
  return t * capacityM3PerTrip;
}

export function getTruckCapacity(equipmentId: string, config: AppConfig): number {
  const eq = config.equipment.find((item) => item.id === equipmentId);
  if (eq?.type === 'truck' && eq.capacityM3 != null && eq.capacityM3 > 0) {
    return eq.capacityM3;
  }
  return FALLBACK_TRUCK_M3_PER_TRIP;
}

export function calculateAssignmentTruckM3(assignment: EquipmentAssignment, config: AppConfig): number | null {
  if (assignment.equipmentType !== 'truck') return null;
  return calculateTruckM3(assignment.trips ?? '', getTruckCapacity(assignment.equipmentId, config));
}

export function calculateActivityTruckM3(activity: Activity, config: AppConfig): number {
  return activity.equipmentAssignments
    .filter((a) => a.equipmentType === 'truck')
    .reduce((sum, a) => {
      const m3 = calculateAssignmentTruckM3(a, config);
      return sum + (m3 ?? 0);
    }, 0);
}

export function countActivityMachinery(activity: Activity): number {
  return activity.equipmentAssignments.filter((a) => a.equipmentType === 'machinery').length;
}

/** Truck M³ of the activity split equally among machinery assigned to it. */
export function calculateMachineryShareM3(activity: Activity, config: AppConfig): number | null {
  const total = calculateActivityTruckM3(activity, config);
  const machineryCount = countActivityMachinery(activity);
  if (total <= 0 || machineryCount <= 0) return null;
  return total / machineryCount;
}

export function getActivityEquipmentCodes(activity: Activity): string[] {
  return activity.equipmentAssignments.map((a) => a.equipmentCode);
}

export function resolveActivityArea(activity: Activity): string {
  if (activity.area === 'Otro' && activity.customArea?.trim()) {
    return activity.customArea.trim();
  }
  return activity.area;
}

export function resolveActivityType(activity: Activity): string {
  if (activity.kind === 'watermaster') return 'Draga Watermaster';
  if (activity.type === 'Otro' && activity.customType?.trim()) {
    return activity.customType.trim();
  }
  return activity.type;
}

export function formatMetric(value: number | null, maxDecimals = 2): string {
  if (value === null || Number.isNaN(value)) return '-';
  const rounded = Number(value.toFixed(maxDecimals));
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

export interface TruckParticipationRow {
  activityId: string;
  assignment: EquipmentAssignment;
  operator: string;
  hourmeterStart: string;
  hourmeterEnd: string;
  kmStart: string;
  kmEnd: string;
  zone: string;
  totalM3: number | null;
}

export function collectTruckParticipations(
  activities: Activity[],
  roster: ActiveRosterAssignment[],
  config: AppConfig,
): TruckParticipationRow[] {
  const rows: TruckParticipationRow[] = [];
  for (const activity of activities) {
    const zone = resolveActivityArea(activity);
    for (const assignment of activity.equipmentAssignments) {
      if (assignment.equipmentType !== 'truck') continue;
      const ops = resolveEquipmentOperationalData(assignment, roster);
      rows.push({
        activityId: activity.id,
        assignment,
        operator: ops.operator,
        hourmeterStart: ops.hourmeterStart,
        hourmeterEnd: ops.hourmeterEnd,
        kmStart: ops.kmStart ?? '',
        kmEnd: ops.kmEnd ?? '',
        zone,
        totalM3: calculateAssignmentTruckM3(assignment, config),
      });
    }
  }
  return rows;
}

export interface TruckM3TotalRow {
  equipmentId: string;
  code: string;
  totalM3: number;
}

export function collectTruckM3ByCode(activities: Activity[], config: AppConfig): TruckM3TotalRow[] {
  const totals = new Map<string, TruckM3TotalRow>();
  for (const activity of activities) {
    for (const assignment of activity.equipmentAssignments) {
      if (assignment.equipmentType !== 'truck') continue;
      const m3 = calculateAssignmentTruckM3(assignment, config) ?? 0;
      const current = totals.get(assignment.equipmentId) ?? {
        equipmentId: assignment.equipmentId,
        code: assignment.equipmentCode,
        totalM3: 0,
      };
      current.totalM3 += m3;
      totals.set(assignment.equipmentId, current);
    }
  }
  return [...totals.values()].filter((row) => row.totalM3 > 0);
}
