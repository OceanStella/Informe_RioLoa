import crypto from 'crypto';
import { Router, type Response } from 'express';
import multer from 'multer';
import { pipeline } from 'stream/promises';
import { isAuthEnabled } from '../config/authConfig.js';
import { getAppPublicUrl } from '../config/emailConfig.js';
import { currentUser } from '../middleware/userSession.js';
import { guestUserId, type GuestProfile } from '../reports/guestIdentity.js';
import { parseReportSubmission } from '../reports/reportSubmission.js';
import type {
  NewReport,
  ReportPerson,
  ReportRecord,
  StoredFormPhoto,
  StoredPdfLocation,
} from '../reports/reportTypes.js';
import { createReviewToken, hashReviewToken } from '../reports/reviewToken.js';
import { streamReportPdf } from '../reports/streamReportPdf.js';
import {
  buildFormPhotoPath,
  buildReportPdfLocation,
  deleteStoredFile,
  openStoredFile,
  readPdf,
  saveFormPhoto,
  savePdf,
} from '../repositories/pdfStorage.js';
import {
  createReportWithApproval,
  getReport,
  listReports,
  newReportId,
  recordEmailDelivered,
  recordEmailFailed,
  replaceApprovalToken,
} from '../repositories/reportsRepository.js';
import { sendCopyEmail, sendReviewEmail } from '../services/emailService.js';
import { isValidEmail, normalizeEmail } from '../utils/email.js';

const MAX_PHOTO_FILES = 100;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

const SEND_FAILED_MESSAGE = 'No fue posible enviar el informe.';
const EMAIL_FAILED_MESSAGE = 'El informe quedó guardado, pero no fue posible enviar el correo.';
const NOT_FOUND_MESSAGE = 'Informe no encontrado.';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

function isReportId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** The Entra session is the only identity with auth on; a guest profile is ignored there. */
function reportAuthor(res: Response, guest: GuestProfile | null): ReportPerson | null {
  if (isAuthEnabled()) {
    const user = currentUser(res);
    return user && { userId: user.id, email: user.email, displayName: user.displayName };
  }
  return guest && { userId: guestUserId(guest.email), email: guest.email, displayName: guest.displayName };
}

function toListItem(report: ReportRecord) {
  return {
    id: report.id,
    createdAt: report.createdAt,
    reportDate: report.reportDate,
    createdBy: report.createdBy.displayName || report.createdBy.email,
    supervisor: report.summary?.supervisorName || '—',
    activitiesCount: report.metrics.activitiesCount,
    truckM3: report.metrics.truckM3,
    status: report.status,
    rejectionComment: report.review?.comment ?? null,
    canEdit: report.status === 'REJECTED' && Boolean(report.formSnapshot),
    revisedFromReportId: report.revisedFromReportId ?? null,
  };
}

/** The same form sent twice maps to the same report, so a repeated request cannot duplicate it. */
function reportIdFromSubmission(submissionId: string): string {
  return crypto.createHash('sha256').update(submissionId).digest('hex').slice(0, 32);
}

/** Codes for "already exists" in GCS, the local fallback and Firestore. */
function isAlreadyStored(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 412 || code === 'EEXIST' || code === 6;
}

function sendExistingReport(res: Response, report: ReportRecord) {
  if (report.status === 'SEND_FAILED') {
    return res.status(502).json({ ok: false, reportId: report.id, message: EMAIL_FAILED_MESSAGE });
  }
  return res.json({ ok: true, reportId: report.id, ccDelivered: true });
}

async function sendDuplicate(res: Response, reportId: string) {
  const report = await getReport(reportId);
  if (report) return sendExistingReport(res, report);
  return res.status(409).json({ ok: false, message: 'Este informe ya se está enviando.' });
}

async function saveFormPhotos(
  storage: StoredPdfLocation,
  files: Express.Multer.File[],
  saved: StoredFormPhoto[],
): Promise<void> {
  for (const file of files) {
    const match = /^([A-Za-z0-9-]{1,64})\.(before|after)$/.exec(file.originalname);
    const photoPath = match && buildFormPhotoPath(storage.path, match[1] ?? '', match[2] ?? '', file.mimetype);
    if (!match || !photoPath) continue;

    await saveFormPhoto({ bucket: storage.bucket, path: photoPath }, file.buffer, file.mimetype);
    saved.push({
      activityId: match[1] ?? '',
      which: match[2] === 'before' ? 'before' : 'after',
      path: photoPath,
      contentType: file.mimetype,
    });
  }
}

async function removeStoredFiles(storage: StoredPdfLocation, photos: StoredFormPhoto[]): Promise<void> {
  const paths = [storage.path, ...photos.map((photo) => photo.path)];
  await Promise.all(
    paths.map((filePath) =>
      deleteStoredFile({ bucket: storage.bucket, path: filePath }).catch((error) =>
        console.error('Failed to remove orphan file:', error),
      ),
    ),
  );
}

/** The supervisor email is what the report's fate depends on, so only its result is reported as failure. */
async function deliverReport(report: NewReport, pdf: Buffer, token: string): Promise<{ sent: boolean; ccDelivered: boolean }> {
  const attachment = { date: report.reportDate, pdfBuffer: pdf, pdfFilename: report.storage.filename };

  try {
    await sendReviewEmail({
      ...attachment,
      supervisorEmail: report.supervisorEmail,
      reviewUrl: `${getAppPublicUrl()}/review/${token}`,
    });
  } catch (error) {
    console.error('Failed to send review email:', error instanceof Error ? error.message : error);
    await recordEmailFailed(report.id).catch((err) => console.error('Failed to record delivery:', err));
    return { sent: false, ccDelivered: false };
  }

  await recordEmailDelivered(report.id, report.supervisorEmail).catch((err) =>
    console.error('Failed to record delivery:', err),
  );

  if (report.ccEmails.length === 0) return { sent: true, ccDelivered: true };
  try {
    await sendCopyEmail({ ...attachment, recipients: report.ccEmails });
    return { sent: true, ccDelivered: true };
  } catch (error) {
    console.error('Failed to send report copy:', error instanceof Error ? error.message : error);
    return { sent: true, ccDelivered: false };
  }
}

const reportFiles = upload.fields([
  { name: 'pdf', maxCount: 1 },
  { name: 'photos', maxCount: MAX_PHOTO_FILES },
]);

router.post('/', reportFiles, async (req, res) => {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const submission = parseReportSubmission(req.body.payload);
  const file = files?.pdf?.[0];

  if (!submission || !file || file.mimetype !== 'application/pdf' || !isPdf(file.buffer)) {
    return res.status(400).json({ ok: false, message: SEND_FAILED_MESSAGE });
  }

  const { guestProfile, submissionId, ...reportFields } = submission;
  const createdBy = reportAuthor(res, guestProfile);
  if (!createdBy) {
    return res.status(400).json({ ok: false, message: 'Indica tu nombre y correo para generar el informe.' });
  }
  if (!getAppPublicUrl()) {
    console.error('APP_PUBLIC_URL is not configured');
    return res.status(500).json({ ok: false, message: SEND_FAILED_MESSAGE });
  }

  const reportId = submissionId ? reportIdFromSubmission(submissionId) : newReportId();
  const photos: StoredFormPhoto[] = [];
  const storage = buildReportPdfLocation(reportId, submission.reportDate);
  const token = createReviewToken();

  try {
    const existing = submissionId ? await getReport(reportId) : null;
    if (existing) return sendExistingReport(res, existing);

    if (reportFields.revisedFromReportId) {
      const original = await getReport(reportFields.revisedFromReportId);
      if (original?.status !== 'REJECTED') {
        return res.status(400).json({ ok: false, message: 'El informe rechazado de origen no es válido.' });
      }
    }

    await savePdf(storage, file.buffer);
  } catch (error) {
    if (isAlreadyStored(error)) return sendDuplicate(res, reportId);
    console.error('Failed to store report PDF:', error);
    return res.status(500).json({ ok: false, message: SEND_FAILED_MESSAGE });
  }

  const report: NewReport = { ...reportFields, id: reportId, createdBy, storage, formPhotos: photos };

  try {
    await saveFormPhotos(storage, files?.photos ?? [], photos);
    await createReportWithApproval(report, hashReviewToken(token));
  } catch (error) {
    if (isAlreadyStored(error)) return sendDuplicate(res, reportId);
    console.error('Failed to create report:', error);
    await removeStoredFiles(storage, photos);
    return res.status(500).json({ ok: false, message: SEND_FAILED_MESSAGE });
  }

  const delivery = await deliverReport(report, file.buffer, token);
  if (!delivery.sent) {
    return res.status(502).json({ ok: false, reportId, message: EMAIL_FAILED_MESSAGE });
  }
  return res.status(201).json({ ok: true, reportId, ccDelivered: delivery.ccDelivered });
});

/**
 * Retries a failed delivery with the stored PDF and a fresh link, on the same report. The PDF is
 * immutable, so if it were missing it is not regenerated: the report stays in SEND_FAILED.
 */
router.post('/:id/resend-email', async (req, res) => {
  const { id } = req.params;
  if (!isReportId(id)) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });

  const supervisorEmail = normalizeEmail(typeof req.body?.supervisorEmail === 'string' ? req.body.supervisorEmail : '');
  if (!isValidEmail(supervisorEmail)) {
    return res.status(400).json({ ok: false, message: 'Ingresa un correo electrónico válido.' });
  }

  try {
    const report = await getReport(id);
    if (!report) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });
    if (report.status !== 'SEND_FAILED') {
      return res.status(409).json({ ok: false, message: 'Este informe ya fue enviado.' });
    }

    let pdf: Buffer;
    try {
      pdf = await readPdf(report.storage);
    } catch (error) {
      console.error('Stored report PDF is not available:', error);
      return res.status(502).json({ ok: false, reportId: id, message: 'No se encontró el PDF almacenado de este informe.' });
    }

    const retried = { ...report, supervisorEmail };
    const token = createReviewToken();
    await replaceApprovalToken(retried, hashReviewToken(token));

    const delivery = await deliverReport(retried, pdf, token);
    if (!delivery.sent) {
      return res.status(502).json({ ok: false, reportId: id, message: EMAIL_FAILED_MESSAGE });
    }
    return res.json({ ok: true, reportId: id, ccDelivered: delivery.ccDelivered });
  } catch (error) {
    console.error('Failed to resend report email:', error);
    return res.status(502).json({ ok: false, reportId: id, message: EMAIL_FAILED_MESSAGE });
  }
});

router.get('/', async (req, res) => {
  const requested = Number(req.query.limit);
  const limit = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;
  const cursor = typeof req.query.cursor === 'string' && isReportId(req.query.cursor) ? req.query.cursor : undefined;

  try {
    const page = await listReports(limit + 1, cursor);
    const reports = page.slice(0, limit);
    return res.json({
      ok: true,
      reports: reports.map(toListItem),
      nextCursor: page.length > limit ? reports[reports.length - 1]?.id : null,
    });
  } catch (error) {
    console.error('Failed to list reports:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible cargar el historial.' });
  }
});

router.get('/:id/pdf', async (req, res) => {
  const { id } = req.params;
  if (!isReportId(id)) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });

  try {
    const report = await getReport(id);
    if (!report) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });

    await streamReportPdf(res, report.storage, req.query.download === 'true' ? 'attachment' : 'inline');
    return undefined;
  } catch (error) {
    console.error('Failed to load report:', error);
    return res.status(502).json({ ok: false, message: 'No fue posible obtener el PDF.' });
  }
});

/** Read-only: rebuilding the form from a rejected report never touches that report. */
router.get('/:id/edit-data', async (req, res) => {
  const { id } = req.params;
  if (!isReportId(id)) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });

  try {
    const report = await getReport(id);
    if (!report) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });
    if (report.status !== 'REJECTED' || !report.formSnapshot) {
      return res.status(409).json({ ok: false, message: 'Este informe no se puede volver a editar.' });
    }
    return res.json({
      ok: true,
      reportDate: report.reportDate,
      comment: report.review?.comment ?? null,
      formSnapshot: report.formSnapshot,
      photos: (report.formPhotos ?? []).map(({ activityId, which, contentType }) => ({ activityId, which, contentType })),
    });
  } catch (error) {
    console.error('Failed to load report edit data:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible cargar el informe.' });
  }
});

router.get('/:id/photos/:activityId/:which', async (req, res) => {
  const { id, activityId, which } = req.params;
  if (!isReportId(id)) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });

  try {
    const report = await getReport(id);
    const photo = report?.formPhotos?.find((item) => item.activityId === activityId && item.which === which);
    if (!report || !photo) return res.status(404).json({ ok: false, message: NOT_FOUND_MESSAGE });

    res.setHeader('Content-Type', photo.contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    await pipeline(openStoredFile({ bucket: report.storage.bucket, path: photo.path }), res);
    return undefined;
  } catch (error) {
    console.error('Failed to stream report photo:', error);
    if (res.headersSent) {
      res.destroy();
      return undefined;
    }
    return res.status(502).json({ ok: false, message: 'No fue posible obtener la foto.' });
  }
});

export default router;
