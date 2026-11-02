import { isValidEmail, normalizeEmail } from '../utils/email.js';
import { parseGuestProfile, type GuestProfile } from './guestIdentity.js';
import type { ReportMetrics, ReportSummary } from './reportTypes.js';

const MAX_TEXT_LENGTH = 200;
const MAX_LIST_ITEMS = 200;
const MAX_SNAPSHOT_LENGTH = 256 * 1024;

export interface ReportSubmission {
  reportDate: string;
  supervisorEmail: string;
  ccEmails: string[];
  metrics: ReportMetrics;
  summary: ReportSummary;
  guestProfile: GuestProfile | null;
  submissionId: string | null;
  formSnapshot: string | null;
  revisedFromReportId: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEXT_LENGTH) : '';
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function parseMetrics(value: unknown): ReportMetrics | null {
  const record = asRecord(value);
  if (!record) return null;
  const keys: (keyof ReportMetrics)[] = [
    'activitiesCount',
    'activeEquipmentCount',
    'trucksCount',
    'machineryCount',
    'truckM3',
    'watermasterM3',
  ];
  const metrics = {} as ReportMetrics;
  for (const key of keys) {
    const metric = record[key];
    if (typeof metric !== 'number' || !Number.isFinite(metric) || metric < 0) return null;
    metrics[key] = metric;
  }
  return metrics;
}

function parseSummary(value: unknown): ReportSummary {
  const record = asRecord(value) ?? {};
  const activities = Array.isArray(record.activities) ? record.activities : [];
  const equipment = Array.isArray(record.equipment) ? record.equipment : [];
  const performance = record.watermasterHourlyPerformance;

  return {
    area: asText(record.area),
    supervisorName: asText(record.supervisorName),
    activities: activities.slice(0, MAX_LIST_ITEMS).map((item) => {
      const activity = asRecord(item) ?? {};
      return { area: asText(activity.area), type: asText(activity.type) };
    }),
    equipment: equipment.slice(0, MAX_LIST_ITEMS).flatMap((item) => {
      const entry = asRecord(item) ?? {};
      const code = asText(entry.code);
      const activityCount = entry.activities;
      if (!code || (entry.type !== 'truck' && entry.type !== 'machinery')) return [];
      if (typeof activityCount !== 'number' || !Number.isInteger(activityCount) || activityCount < 0) return [];
      return [{ code, type: entry.type, activities: activityCount }];
    }),
    watermasterHourlyPerformance:
      typeof performance === 'number' && Number.isFinite(performance) && performance > 0 ? performance : null,
  };
}

function parseFormSnapshot(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > MAX_SNAPSHOT_LENGTH) return null;
  try {
    const snapshot = asRecord(JSON.parse(value));
    return snapshot && Array.isArray(snapshot.roster) && Array.isArray(snapshot.activities) ? value : null;
  } catch {
    return null;
  }
}

function parseIdentifier(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value) ? value : null;
}

export function parseReportSubmission(raw: unknown): ReportSubmission | null {
  if (typeof raw !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const record = asRecord(parsed);
  if (!record || !isIsoDate(record.reportDate) || typeof record.supervisorEmail !== 'string') return null;

  const supervisorEmail = normalizeEmail(record.supervisorEmail);
  if (!isValidEmail(supervisorEmail)) return null;

  const rawCc: unknown[] = Array.isArray(record.ccEmails) ? record.ccEmails : [];
  const cc = rawCc.filter((item): item is string => typeof item === 'string').map(normalizeEmail);
  if (!cc.every(isValidEmail) || cc.length > 20) return null;

  const metrics = parseMetrics(record.metrics);
  if (!metrics) return null;

  return {
    reportDate: record.reportDate,
    supervisorEmail,
    ccEmails: [...new Set(cc)].filter((email) => email !== supervisorEmail),
    metrics,
    summary: parseSummary(record.summary),
    guestProfile: parseGuestProfile(record.guestProfile),
    submissionId: parseIdentifier(record.submissionId),
    formSnapshot: parseFormSnapshot(record.formSnapshot),
    revisedFromReportId: parseIdentifier(record.revisedFromReportId),
  };
}
