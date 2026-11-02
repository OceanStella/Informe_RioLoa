import type { AppConfig } from '../types/config';
import type { Activity, ReportData } from '../types/report';
import {
  calculateActivityTruckM3,
  getWatermasterTotalM3,
  resolveActivityArea,
  resolveActivityType,
} from '../utils/calculations';
import { isRosterReady } from '../utils/roster';
import type { FlatValidationErrors } from '../utils/validation';

export type StepStatus = 'done' | 'warning' | 'idle';

export interface ReportOverview {
  generalFilled: number;
  generalTotal: number;
  rosterTotal: number;
  rosterReady: number;
  rosterTrucks: number;
  rosterMachinery: number;
  activityCount: number;
  activitiesReady: number;
  truckM3: number;
  watermasterM3: number;
  errorCount: number;
  progress: number;
  status: {
    general: StepStatus;
    roster: StepStatus;
    activities: StepStatus;
    generate: StepStatus;
  };
}

const hasErrorWithPrefix = (errors: FlatValidationErrors, prefix: string) =>
  Object.keys(errors).some((key) => key.startsWith(prefix));

const isFilled = (value: string | number | null | undefined) =>
  value !== undefined && value !== null && String(value).trim() !== '';

const hasTrips = (trips: string | undefined) => isFilled(trips) && Number(trips) > 0;

/** Progress heuristic for the sidebar only; the description and photos never block it. */
function isActivityReady(activity: Activity): boolean {
  if (!resolveActivityArea(activity) || !resolveActivityType(activity)) return false;
  if (activity.equipmentAssignments.length === 0) return false;

  const trucks = activity.equipmentAssignments.filter((item) => item.equipmentType === 'truck');
  if (!trucks.every((item) => hasTrips(item.trips))) return false;

  if (activity.kind === 'watermaster') {
    const wm = activity.watermaster;
    if (!wm) return false;
    return (
      isFilled(wm.sector) &&
      isFilled(wm.operator) &&
      wm.depth !== null &&
      wm.hardness !== null &&
      getWatermasterTotalM3(wm) !== null
    );
  }

  return true;
}

export function buildReportOverview(
  report: ReportData,
  config: AppConfig,
  errors: FlatValidationErrors,
): ReportOverview {
  const generalValues = [report.date, report.supervisor, report.area, report.apr];
  const generalFilled = generalValues.filter((value) => value.trim()).length;
  const generalTotal = generalValues.length;

  const rosterTotal = report.roster.length;
  const rosterReady = report.roster.filter((item) => isRosterReady(item)).length;
  const rosterTrucks = report.roster.filter((item) => item.equipmentType === 'truck').length;

  const activitiesReady = report.activities.filter(
    (activity) => isActivityReady(activity) && !hasErrorWithPrefix(errors, `activity.${activity.id}.`),
  ).length;

  const truckM3 = report.activities.reduce((sum, activity) => sum + calculateActivityTruckM3(activity, config), 0);
  const watermasterM3 = report.activities.reduce(
    (sum, activity) =>
      sum + (activity.kind === 'watermaster' ? getWatermasterTotalM3(activity.watermaster) ?? 0 : 0),
    0,
  );

  const generalRatio = generalFilled / generalTotal;
  const rosterRatio = rosterTotal ? rosterReady / rosterTotal : 0;
  const activitiesRatio = report.activities.length ? activitiesReady / report.activities.length : 0;
  const progress = Math.round(((generalRatio + rosterRatio + activitiesRatio) / 3) * 100);
  const errorCount = Object.keys(errors).length;

  const stepStatus = (complete: boolean, prefix: string): StepStatus => {
    if (hasErrorWithPrefix(errors, prefix)) return 'warning';
    return complete ? 'done' : 'idle';
  };

  return {
    generalFilled,
    generalTotal,
    rosterTotal,
    rosterReady,
    rosterTrucks,
    rosterMachinery: rosterTotal - rosterTrucks,
    activityCount: report.activities.length,
    activitiesReady,
    truckM3,
    watermasterM3,
    errorCount,
    progress,
    status: {
      general: stepStatus(generalFilled === generalTotal, 'general.'),
      roster: stepStatus(rosterTotal > 0 && rosterReady === rosterTotal, 'roster.'),
      activities: stepStatus(activitiesReady === report.activities.length, 'activity.'),
      generate: errorCount > 0 ? 'warning' : progress === 100 ? 'done' : 'idle',
    },
  };
}
