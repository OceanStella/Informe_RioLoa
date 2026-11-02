import type { ReportRecord } from '../reports/reportTypes.js';

const MAX_DATES = 30;
const MAX_EQUIPMENT = 10;

export interface DashboardSummary {
  totals: {
    reports: number;
    inReview: number;
    sendFailed: number;
    approved: number;
    rejected: number;
    truckM3: number;
    watermasterM3: number;
    activities: number;
  };
  approvalRate: number | null;
  watermasterHourlyAverage: number | null;
  byDate: { date: string; reports: number; truckM3: number }[];
  equipmentUsage: { code: string; type: 'truck' | 'machinery'; participations: number }[];
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function buildDashboardSummary(reports: ReportRecord[]): DashboardSummary {
  const countStatus = (status: ReportRecord['status']) => reports.filter((item) => item.status === status).length;
  const approved = countStatus('APPROVED');
  const rejected = countStatus('REJECTED');

  const dates = new Map<string, { date: string; reports: number; truckM3: number }>();
  const equipment = new Map<string, DashboardSummary['equipmentUsage'][number]>();

  for (const report of reports) {
    const dateEntry = dates.get(report.reportDate) ?? { date: report.reportDate, reports: 0, truckM3: 0 };
    dateEntry.reports += 1;
    dateEntry.truckM3 += report.metrics.truckM3;
    dates.set(report.reportDate, dateEntry);

    for (const item of report.summary?.equipment ?? []) {
      const entry = equipment.get(item.code) ?? { code: item.code, type: item.type, participations: 0 };
      entry.participations += item.activities;
      equipment.set(item.code, entry);
    }
  }

  const hourly = reports
    .map((report) => report.summary?.watermasterHourlyPerformance ?? null)
    .filter((value): value is number => value !== null);

  return {
    totals: {
      reports: reports.length,
      inReview: countStatus('IN_REVIEW'),
      sendFailed: countStatus('SEND_FAILED'),
      approved,
      rejected,
      truckM3: sum(reports.map((report) => report.metrics.truckM3)),
      watermasterM3: sum(reports.map((report) => report.metrics.watermasterM3)),
      activities: sum(reports.map((report) => report.metrics.activitiesCount)),
    },
    approvalRate: approved + rejected > 0 ? approved / (approved + rejected) : null,
    watermasterHourlyAverage: hourly.length > 0 ? sum(hourly) / hourly.length : null,
    byDate: [...dates.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-MAX_DATES),
    equipmentUsage: [...equipment.values()]
      .sort((a, b) => b.participations - a.participations || a.code.localeCompare(b.code))
      .slice(0, MAX_EQUIPMENT),
  };
}
