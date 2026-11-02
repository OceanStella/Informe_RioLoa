import { Timestamp, type DocumentData, type DocumentSnapshot } from '@google-cloud/firestore';
import { FIRESTORE_COLLECTIONS } from '../firestore/collections.js';
import type {
  EmailDeliveryStatus,
  NewReport,
  ReportDecision,
  ReportPerson,
  ReportRecord,
  ReportReview,
} from '../reports/reportTypes.js';
import { getFirestore } from './firestore.js';

function reports() {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.reports);
}

function approvals() {
  return getFirestore().collection(FIRESTORE_COLLECTIONS.approvals);
}

function toIso(value: unknown): string {
  return value instanceof Timestamp ? value.toDate().toISOString() : '';
}

function toReportRecord(snapshot: DocumentSnapshot<DocumentData>): ReportRecord {
  const data = snapshot.data() as DocumentData;
  const review = data.review as (Omit<ReportReview, 'reviewedAt'> & { reviewedAt: unknown }) | null;
  // Reports whose email failed before SEND_FAILED existed were left as IN_REVIEW.
  const sendFailed = data.status === 'IN_REVIEW' && data.emailDelivery.status === 'FAILED';
  return {
    ...(data as Omit<ReportRecord, 'id'>),
    id: snapshot.id,
    status: sendFailed ? 'SEND_FAILED' : data.status,
    createdAt: toIso(data.createdAt),
    review: review ? { ...review, reviewedAt: toIso(review.reviewedAt) } : null,
    emailDelivery: {
      status: data.emailDelivery.status as EmailDeliveryStatus,
      sentAt: data.emailDelivery.sentAt ? toIso(data.emailDelivery.sentAt) : null,
    },
  };
}

export function newReportId(): string {
  return reports().doc().id;
}

/** Report and approval token are written atomically: a report is never left without its token. */
export async function createReportWithApproval(report: NewReport, tokenHash: string): Promise<void> {
  const { id, ...fields } = report;
  const now = Timestamp.now();
  const batch = getFirestore().batch();
  batch.create(reports().doc(id), {
    ...fields,
    createdAt: now,
    status: 'IN_REVIEW',
    review: null,
    emailDelivery: { sentAt: null, status: 'PENDING' },
  });
  batch.create(approvals().doc(tokenHash), {
    reportId: id,
    supervisorEmail: report.supervisorEmail,
    createdAt: now,
    usedAt: null,
  });
  await batch.commit();
}

export async function getReport(reportId: string): Promise<ReportRecord | null> {
  const snapshot = await reports().doc(reportId).get();
  return snapshot.exists ? toReportRecord(snapshot) : null;
}

/** A report only counts as under review once its link really left, for the address that received it. */
export async function recordEmailDelivered(reportId: string, supervisorEmail: string): Promise<void> {
  await reports()
    .doc(reportId)
    .update({
      status: 'IN_REVIEW',
      supervisorEmail,
      emailDelivery: { status: 'SENT', sentAt: Timestamp.now() },
    });
}

export async function recordEmailFailed(reportId: string): Promise<void> {
  await reports()
    .doc(reportId)
    .update({ status: 'SEND_FAILED', emailDelivery: { status: 'FAILED', sentAt: null } });
}

/** Ordering by the automatic single-field index on createdAt: no composite index needed. */
export async function listReports(limit: number, afterReportId?: string): Promise<ReportRecord[]> {
  let query = reports().orderBy('createdAt', 'desc').limit(limit);
  if (afterReportId) {
    const cursor = await reports().doc(afterReportId).get();
    if (cursor.exists) query = query.startAfter(cursor);
  }
  const snapshot = await query.get();
  return snapshot.docs.map(toReportRecord);
}

export async function listAllReports(): Promise<ReportRecord[]> {
  const snapshot = await reports().get();
  return snapshot.docs.map(toReportRecord);
}

export async function getReportByApprovalToken(tokenHash: string): Promise<ReportRecord | null> {
  const approval = await approvals().doc(tokenHash).get();
  if (!approval.exists) return null;
  return getReport(approval.get('reportId') as string);
}

/** The previous link stops working as soon as a new one is issued. */
export async function replaceApprovalToken(report: ReportRecord, tokenHash: string): Promise<void> {
  const previous = await approvals().where('reportId', '==', report.id).get();
  const batch = getFirestore().batch();
  previous.docs.forEach((doc) => batch.delete(doc.ref));
  batch.create(approvals().doc(tokenHash), {
    reportId: report.id,
    supervisorEmail: report.supervisorEmail,
    createdAt: Timestamp.now(),
    usedAt: null,
  });
  await batch.commit();
}

export type DecisionResult =
  | { outcome: 'decided' }
  | { outcome: 'not_found' }
  | { outcome: 'forbidden' }
  | { outcome: 'already_decided'; status: ReportRecord['status'] };

/**
 * Every check runs inside the transaction so two simultaneous clicks cannot both win:
 * Firestore retries the loser, which then sees `usedAt` already set.
 */
export async function decideReport(input: {
  tokenHash: string;
  decision: ReportDecision;
  comment: string | null;
  reviewer: ReportPerson;
  isAuthorized: (report: ReportRecord) => boolean;
}): Promise<DecisionResult> {
  const approvalRef = approvals().doc(input.tokenHash);

  return getFirestore().runTransaction(async (tx): Promise<DecisionResult> => {
    const approval = await tx.get(approvalRef);
    if (!approval.exists) return { outcome: 'not_found' };

    const reportRef = reports().doc(approval.get('reportId') as string);
    const reportSnapshot = await tx.get(reportRef);
    if (!reportSnapshot.exists) return { outcome: 'not_found' };

    const report = toReportRecord(reportSnapshot);
    if (!input.isAuthorized(report)) return { outcome: 'forbidden' };
    if (approval.get('usedAt') || report.status !== 'IN_REVIEW') {
      return { outcome: 'already_decided', status: report.status };
    }

    const now = Timestamp.now();
    tx.update(reportRef, {
      status: input.decision,
      review: {
        reviewedAt: now,
        reviewedByUserId: input.reviewer.userId,
        reviewedByEmail: input.reviewer.email,
        reviewedByName: input.reviewer.displayName,
        decision: input.decision,
        comment: input.comment,
      },
    });
    tx.update(approvalRef, { usedAt: now });
    return { outcome: 'decided' };
  });
}
