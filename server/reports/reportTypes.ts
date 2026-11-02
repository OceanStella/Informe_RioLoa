export type ReportStatus = 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'SEND_FAILED';
export type ReportDecision = 'APPROVED' | 'REJECTED';
export type EmailDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface ReportMetrics {
  activitiesCount: number;
  activeEquipmentCount: number;
  trucksCount: number;
  machineryCount: number;
  truckM3: number;
  watermasterM3: number;
}

export interface ReportSummary {
  area: string;
  supervisorName: string;
  activities: { area: string; type: string }[];
  equipment: { code: string; type: 'truck' | 'machinery'; activities: number }[];
  watermasterHourlyPerformance: number | null;
}

export interface ReportPerson {
  userId: string;
  email: string;
  displayName: string;
}

export interface ReportReview {
  reviewedAt: string;
  reviewedByUserId: string;
  reviewedByEmail: string;
  reviewedByName: string;
  decision: ReportDecision;
  /** Supervisor's optional note on a rejection. Absent on reports decided before this field existed. */
  comment?: string | null;
}

export interface StoredPdfLocation {
  bucket: string;
  path: string;
  filename: string;
}

export interface StoredFormPhoto {
  activityId: string;
  which: 'before' | 'after';
  path: string;
  contentType: string;
}

export interface ReportRecord {
  id: string;
  createdAt: string;
  reportDate: string;
  createdBy: ReportPerson;
  supervisorEmail: string;
  ccEmails: string[];
  status: ReportStatus;
  storage: StoredPdfLocation;
  metrics: ReportMetrics;
  summary: ReportSummary;
  review: ReportReview | null;
  emailDelivery: { sentAt: string | null; status: EmailDeliveryStatus };
  /** JSON of the form, to rebuild it from a rejected report. Absent on older reports. */
  formSnapshot?: string | null;
  formPhotos?: StoredFormPhoto[];
  revisedFromReportId?: string | null;
}

export type NewReport = Omit<ReportRecord, 'createdAt' | 'status' | 'review' | 'emailDelivery'>;
