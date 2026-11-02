import { Router, type Response } from 'express';
import { isAuthEnabled } from '../config/authConfig.js';
import { currentUser } from '../middleware/userSession.js';
import { guestUserId } from '../reports/guestIdentity.js';
import type { ReportDecision, ReportPerson, ReportRecord } from '../reports/reportTypes.js';
import { hashReviewToken, isReviewTokenFormat } from '../reports/reviewToken.js';
import { streamReportPdf } from '../reports/streamReportPdf.js';
import { decideReport, getReportByApprovalToken } from '../repositories/reportsRepository.js';
import { normalizeEmail } from '../utils/email.js';

const router = Router();

const INVALID_LINK_MESSAGE = 'Este enlace de revisión no es válido.';
const WRONG_ACCOUNT_MESSAGE = 'Este informe debe ser revisado con la cuenta a la que fue enviado.';
const WRONG_EMAIL_MESSAGE = 'El correo no coincide con el destinatario de este informe.';
const MAX_COMMENT_LENGTH = 5000;

function decidedMessage(status: ReportRecord['status']): string | null {
  if (status === 'APPROVED') return 'Este informe ya fue aprobado.';
  if (status === 'REJECTED') return 'Este informe ya fue rechazado.';
  return null;
}

/** Only a rejection carries a note; an empty one is stored as null. */
function rejectionComment(decision: ReportDecision, value: unknown): string | null {
  if (decision !== 'REJECTED' || typeof value !== 'string') return null;
  return value.trim().slice(0, MAX_COMMENT_LENGTH) || null;
}

function declaredEmail(value: unknown): string {
  return typeof value === 'string' ? normalizeEmail(value) : '';
}

/**
 * With auth on, the Entra account decides. With AUTH_ENABLED=false the email is only typed in, so
 * this avoids decisions from a forwarded link by mistake but does NOT prove who is reviewing.
 */
function isSupervisor(res: Response, report: ReportRecord, declared: string): boolean {
  const email = isAuthEnabled() ? currentUser(res)?.email ?? '' : declared;
  return Boolean(email) && normalizeEmail(email) === normalizeEmail(report.supervisorEmail);
}

function reviewerFor(res: Response, declared: string): ReportPerson {
  const user = currentUser(res);
  if (user) return { userId: user.id, email: user.email, displayName: user.displayName };
  return { userId: guestUserId(declared), email: declared, displayName: 'Correo declarado en el enlace (modo MVP)' };
}

function sendWrongIdentity(res: Response) {
  const message = isAuthEnabled() ? WRONG_ACCOUNT_MESSAGE : WRONG_EMAIL_MESSAGE;
  const code = isAuthEnabled() ? 'WRONG_ACCOUNT' : 'WRONG_EMAIL';
  return res.status(403).json({ ok: false, code, message });
}

function parseToken(res: Response, token: string): string | null {
  if (isReviewTokenFormat(token)) return hashReviewToken(token);
  res.status(404).json({ ok: false, code: 'INVALID_LINK', message: INVALID_LINK_MESSAGE });
  return null;
}

router.get('/:token', async (req, res) => {
  const tokenHash = parseToken(res, req.params.token);
  if (!tokenHash) return undefined;

  const declared = declaredEmail(req.get('x-review-email'));

  try {
    const report = await getReportByApprovalToken(tokenHash);
    if (!report) {
      return res.status(404).json({ ok: false, code: 'INVALID_LINK', message: INVALID_LINK_MESSAGE });
    }
    if (!isAuthEnabled() && !declared) {
      return res.json({ ok: true, emailRequired: true });
    }
    if (!isSupervisor(res, report, declared)) return sendWrongIdentity(res);

    return res.json({
      ok: true,
      review: {
        reportDate: report.reportDate,
        createdBy: report.createdBy.displayName || report.createdBy.email,
        supervisor: report.summary?.supervisorName || report.supervisorEmail,
        supervisorEmail: report.supervisorEmail,
        status: report.status,
        filename: report.storage.filename,
        decidedMessage: decidedMessage(report.status),
      },
    });
  } catch (error) {
    console.error('Failed to load review:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible cargar la revisión.' });
  }
});

/** The supervisor's own route to the PDF: /api/reports/:id/pdf stays behind the general gate. */
router.get('/:token/pdf', async (req, res) => {
  const tokenHash = parseToken(res, req.params.token);
  if (!tokenHash) return undefined;

  try {
    const report = await getReportByApprovalToken(tokenHash);
    if (!report) {
      return res.status(404).json({ ok: false, code: 'INVALID_LINK', message: INVALID_LINK_MESSAGE });
    }
    if (!isSupervisor(res, report, declaredEmail(req.get('x-review-email')))) return sendWrongIdentity(res);

    await streamReportPdf(res, report.storage, 'inline');
    return undefined;
  } catch (error) {
    console.error('Failed to load review PDF:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible obtener el PDF.' });
  }
});

router.post('/:token/decision', async (req, res) => {
  const tokenHash = parseToken(res, req.params.token);
  if (!tokenHash) return undefined;

  const decision = req.body?.decision as ReportDecision;
  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    return res.status(400).json({ ok: false, message: 'Decisión inválida.' });
  }

  const declared = declaredEmail(req.body?.supervisorEmail);

  try {
    const result = await decideReport({
      tokenHash,
      decision,
      comment: rejectionComment(decision, req.body?.comment),
      reviewer: reviewerFor(res, declared),
      isAuthorized: (current) => isSupervisor(res, current, declared),
    });

    switch (result.outcome) {
      case 'decided':
        return res.json({ ok: true, status: decision, decidedMessage: decidedMessage(decision) });
      case 'not_found':
        return res.status(404).json({ ok: false, code: 'INVALID_LINK', message: INVALID_LINK_MESSAGE });
      case 'forbidden':
        return sendWrongIdentity(res);
      case 'already_decided':
        return res.status(409).json({
          ok: false,
          code: 'ALREADY_DECIDED',
          status: result.status,
          message: decidedMessage(result.status),
        });
    }
  } catch (error) {
    console.error('Failed to record decision:', error);
    return res.status(500).json({ ok: false, message: 'No fue posible registrar la decisión.' });
  }
});

export default router;
