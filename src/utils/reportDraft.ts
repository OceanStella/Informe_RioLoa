import type { Activity, ReportData } from '../types/report';

const DRAFT_KEY = 'informeOctavioReportDraft';

interface StoredDraft {
  form: ReportData;
  photos: number;
}

/** Everything needed to rebuild the form. Photos are files, so they never fit in here. */
export function serializeForm(report: ReportData): string {
  const excluded = new Set(['beforePhoto', 'afterPhoto', 'revisedFrom', 'carriedFrom']);
  return JSON.stringify(report, (key, value: unknown) => (excluded.has(key) ? undefined : value));
}

function hasActivityContent(activity: Activity): boolean {
  const { watermaster: wm } = activity;
  return Boolean(
    activity.area ||
      activity.description.trim() ||
      activity.supportEquipment.trim() ||
      activity.equipmentAssignments.length ||
      (activity.kind === 'generic' && activity.type) ||
      wm?.sector.trim() ||
      wm?.operator.trim() ||
      wm?.hourmeterStart ||
      wm?.hourmeterEnd ||
      wm?.pumpHourmeterStart ||
      wm?.pumpHourmeterEnd ||
      wm?.manufacturerPerformance,
  );
}

/** A form nobody has touched is not a draft, whatever date it was opened on. */
export function hasReportContent(report: ReportData): boolean {
  return Boolean(
    report.supervisor.trim() ||
      report.area ||
      report.apr.trim() ||
      report.roster.length ||
      report.activities.length > 1 ||
      report.activities.some(hasActivityContent),
  );
}

export function countPhotos(report: ReportData): number {
  return report.activities.reduce(
    (total, activity) => total + Number(Boolean(activity.beforePhoto)) + Number(Boolean(activity.afterPhoto)),
    0,
  );
}

/** Storage can be full or blocked: the form must keep working, only without the safety net. */
export function saveDraft(report: ReportData): void {
  try {
    localStorage.setItem(DRAFT_KEY, `{"form":${serializeForm(report)},"photos":${countPhotos(report)}}`);
  } catch {
    // Nothing to do: the report is still in memory.
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do.
  }
}

export function readDraft(): StoredDraft | null {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;
    const draft = JSON.parse(stored) as StoredDraft;
    return Array.isArray(draft.form?.activities) && Array.isArray(draft.form.roster) ? draft : null;
  } catch {
    return null;
  }
}
