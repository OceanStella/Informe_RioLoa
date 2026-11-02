import { buildReportOverview } from '../components/reportOverview';
import type { GuestProfile } from '../context/GuestProfileContext';
import type { AppConfig } from '../types/config';
import type { Activity, ReportData } from '../types/report';
import { getWatermasterHourlyPerformance, resolveActivityArea, resolveActivityType } from './calculations';
import { localIsoDate } from './dates';
import { createPhotoFromFile } from './images';
import { getReportFileName } from './pdf';
import { serializeForm } from './reportDraft';
import { carryOverShift } from './shiftCarryOver';

/** The report is already stored; only the email failed, so a retry must not create it again. */
export class ReportDeliveryError extends Error {
  readonly reportId: string;

  constructor(message: string, reportId: string) {
    super(message);
    this.reportId = reportId;
  }
}

interface SubmitResponse {
  ok?: boolean;
  message?: string;
  reportId?: string;
  ccDelivered?: boolean;
}

function buildEquipmentSummary(report: ReportData) {
  const equipment = new Map<string, { code: string; type: 'truck' | 'machinery'; activities: number }>();
  for (const activity of report.activities) {
    for (const assignment of activity.equipmentAssignments) {
      const entry = equipment.get(assignment.equipmentId) ?? {
        code: assignment.equipmentCode,
        type: assignment.equipmentType,
        activities: 0,
      };
      entry.activities += 1;
      equipment.set(assignment.equipmentId, entry);
    }
  }
  return [...equipment.values()];
}

function appendFormPhotos(data: FormData, report: ReportData): void {
  for (const activity of report.activities) {
    if (activity.beforePhoto) data.append('photos', activity.beforePhoto.file, `${activity.id}.before`);
    if (activity.afterPhoto) data.append('photos', activity.afterPhoto.file, `${activity.id}.after`);
  }
}

function buildSubmission(
  report: ReportData,
  config: AppConfig,
  supervisorEmail: string,
  ccEmails: string[],
  guestProfile: GuestProfile | null,
  submissionId: string,
) {
  const overview = buildReportOverview(report, config, {});
  const hourlyPerformance = report.activities
    .map((activity) => (activity.kind === 'watermaster' ? getWatermasterHourlyPerformance(activity.watermaster) : null))
    .find((value) => value !== null);

  return {
    reportDate: report.date,
    supervisorEmail,
    ccEmails,
    guestProfile,
    submissionId,
    formSnapshot: serializeForm(report),
    revisedFromReportId: report.revisedFrom?.reportId ?? null,
    metrics: {
      activitiesCount: overview.activityCount,
      activeEquipmentCount: overview.rosterTotal,
      trucksCount: overview.rosterTrucks,
      machineryCount: overview.rosterMachinery,
      truckM3: overview.truckM3,
      watermasterM3: overview.watermasterM3,
    },
    summary: {
      area: report.area,
      supervisorName: report.supervisor.trim(),
      activities: report.activities.map((activity) => ({
        area: resolveActivityArea(activity),
        type: resolveActivityType(activity),
      })),
      equipment: buildEquipmentSummary(report),
      watermasterHourlyPerformance: hourlyPerformance ?? null,
    },
  };
}

async function readResult(response: Response): Promise<SubmitResponse> {
  let payload: SubmitResponse = {};
  try {
    payload = (await response.json()) as SubmitResponse;
  } catch {
    payload = { ok: false, message: 'No fue posible enviar el informe.' };
  }

  if (!response.ok || !payload.ok) {
    const message = payload.message || 'No fue posible enviar el informe.';
    if (payload.reportId) throw new ReportDeliveryError(message, payload.reportId);
    throw new Error(message);
  }
  return payload;
}

export async function submitReportForReview(input: {
  report: ReportData;
  config: AppConfig;
  supervisorEmail: string;
  ccEmails: string[];
  guestProfile: GuestProfile | null;
  submissionId: string;
  pdfBlob: Blob;
}): Promise<{ ccDelivered: boolean }> {
  const { report, config, supervisorEmail, ccEmails, guestProfile, submissionId, pdfBlob } = input;
  const data = new FormData();
  data.append(
    'payload',
    JSON.stringify(buildSubmission(report, config, supervisorEmail, ccEmails, guestProfile, submissionId)),
  );
  data.append('pdf', pdfBlob, getReportFileName(report.date));
  appendFormPhotos(data, report);

  const response = await fetch('/api/reports', { method: 'POST', body: data, credentials: 'include' });
  const result = await readResult(response);
  return { ccDelivered: result.ccDelivered !== false };
}

export async function resendReportEmail(reportId: string, supervisorEmail: string): Promise<{ ccDelivered: boolean }> {
  const response = await fetch(`/api/reports/${reportId}/resend-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ supervisorEmail }),
  });
  const result = await readResult(response);
  return { ccDelivered: result.ccDelivered !== false };
}

interface ReportEditData {
  ok?: boolean;
  message?: string;
  reportDate: string;
  comment: string | null;
  formSnapshot: string;
  photos: { activityId: string; which: 'before' | 'after'; contentType: string }[];
}

async function restorePhotos(reportId: string, activity: Activity, photos: ReportEditData['photos']): Promise<Activity> {
  const restored = { ...activity };
  for (const { which, contentType } of photos.filter((photo) => photo.activityId === activity.id)) {
    const response = await fetch(`/api/reports/${reportId}/photos/${activity.id}/${which}`, { credentials: 'include' });
    if (!response.ok) throw new Error('No fue posible recuperar las fotografías del informe.');
    const file = new File([await response.blob()], `${which}-${activity.id}`, { type: contentType });
    restored[which === 'before' ? 'beforePhoto' : 'afterPhoto'] = createPhotoFromFile(file);
  }
  return restored;
}

/** Starts today's report from the latest one sent, so the shift only types what changed. */
export async function loadReportFromLast(config: AppConfig): Promise<ReportData> {
  const response = await fetch('/api/reports/latest-form', { credentials: 'include' });
  const payload = (await response.json()) as { ok?: boolean; message?: string; reportDate: string; formSnapshot: string };
  if (!response.ok || !payload.ok) throw new Error(payload.message || 'No fue posible cargar el último informe.');

  const previous = JSON.parse(payload.formSnapshot) as ReportData;
  const equipmentIds = config.equipment.map((item) => item.id);
  return { ...carryOverShift(previous, payload.reportDate, equipmentIds), date: localIsoDate() };
}

/** Rebuilds the whole form from a rejected report, ready to correct and send as a new one. */
export async function loadRejectedReport(reportId: string): Promise<ReportData> {
  const response = await fetch(`/api/reports/${reportId}/edit-data`, { credentials: 'include' });
  const payload = (await response.json()) as ReportEditData;
  if (!response.ok || !payload.ok) throw new Error(payload.message || 'No fue posible cargar el informe.');

  const form = JSON.parse(payload.formSnapshot) as ReportData;
  const activities = await Promise.all(
    form.activities.map((activity) => restorePhotos(reportId, activity, payload.photos)),
  );
  return {
    ...form,
    activities,
    revisedFrom: { reportId, reportDate: payload.reportDate, comment: payload.comment },
  };
}
