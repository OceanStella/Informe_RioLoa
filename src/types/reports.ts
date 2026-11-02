export type ReportStatus = 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'SEND_FAILED';
export type ReportDecision = 'APPROVED' | 'REJECTED';

export interface ReportListItem {
  id: string;
  createdAt: string;
  reportDate: string;
  createdBy: string;
  supervisor: string;
  activitiesCount: number;
  truckM3: number;
  status: ReportStatus;
  rejectionComment: string | null;
  canEdit: boolean;
  revisedFromReportId: string | null;
}

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

export interface ReviewDetails {
  reportDate: string;
  createdBy: string;
  supervisor: string;
  supervisorEmail: string;
  status: ReportStatus;
  filename: string;
  decidedMessage: string | null;
}
