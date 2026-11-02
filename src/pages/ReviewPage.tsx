import { Check, CircleAlert, CircleCheck, ClipboardCheck, Eye, FileText, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { invalidFieldClass } from '../components/fieldUtils';
import { AppShell } from '../components/ui/AppShell';
import { ReportStatusChip } from '../components/ui/ReportStatusChip';
import { SectionHeader } from '../components/ui/SectionHeader';
import { TopBar } from '../components/ui/TopBar';
import { ValidationMessage } from '../components/ValidationMessage';
import type { ReportDecision, ReviewDetails } from '../types/reports';
import { formatShortDate } from '../utils/dates';
import { isValidEmailFormat, normalizeEmail } from '../utils/emailValidation';
import { downloadBlob } from '../utils/pdf';

const CONFIRM_QUESTION: Record<ReportDecision, string> = {
  APPROVED: '¿Confirmas la aprobación de este informe?',
  REJECTED: '¿Confirmas el rechazo de este informe?',
};

function ReviewDetailList({ review }: { review: ReviewDetails }) {
  return (
    <dl className="detail-list">
      <div><dt>Fecha</dt><dd className="num">{formatShortDate(review.reportDate)}</dd></div>
      <div><dt>Creado por</dt><dd>{review.createdBy}</dd></div>
      <div><dt>Supervisor</dt><dd>{review.supervisor}</dd></div>
      <div><dt>Estado</dt><dd><ReportStatusChip status={review.status} /></dd></div>
    </dl>
  );
}

function PreviewButton({ review, onPreview }: { review: ReviewDetails; onPreview: () => void }) {
  return (
    <div className="review-preview">
      <p className="modal-file">
        <FileText size={16} aria-hidden="true" />
        <span>{review.filename}</span>
      </p>
      <button type="button" className="btn btn-secondary btn-sm" onClick={onPreview}>
        <Eye size={14} aria-hidden="true" />
        Vista previa
      </button>
    </div>
  );
}

/**
 * A plain link cannot send the declared email, and a query string would leave it in the access
 * logs. The tab opens first, while the click still allows it, and receives the PDF afterwards.
 */
async function openReviewPdf(token: string, email: string, filename: string): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const response = await fetch(`/api/review/${encodeURIComponent(token)}/pdf`, {
      credentials: 'include',
      headers: email ? { 'X-Review-Email': email } : undefined,
    });
    if (!response.ok) throw new Error(`PDF ${response.status}`);
    const blob = await response.blob();
    if (!tab) {
      downloadBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    tab.location.href = url;
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (error) {
    tab?.close();
    throw error;
  }
}

interface ReviewModalProps {
  review: ReviewDetails;
  onClose: () => void;
  onDecide: (decision: ReportDecision, comment: string) => Promise<void>;
  onPreview: () => void;
  submitting: boolean;
  error: string | null;
}

function ReviewModal({ review, onClose, onDecide, onPreview, submitting, error }: ReviewModalProps) {
  const [pending, setPending] = useState<ReportDecision | null>(null);
  const [comment, setComment] = useState('');

  const dismiss = () => {
    if (submitting) return;
    if (pending) setPending(null);
    else onClose();
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={dismiss}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="review-title" className="modal-title">Revisión del informe</h2>
            <p className="modal-text">
              {pending ? CONFIRM_QUESTION[pending] : '¿Desea aprobar o rechazar este informe?'}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={submitting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="modal-body">
          <ReviewDetailList review={review} />
          <PreviewButton review={review} onPreview={onPreview} />
          {pending === 'REJECTED' && (
            <div className="form-field">
              <label className="field-label" htmlFor="rejection-comment">Comentarios (opcional)</label>
              <textarea
                id="rejection-comment"
                className="rejection-comment"
                rows={6}
                maxLength={5000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={submitting}
              />
            </div>
          )}
          {error && (
            <div className="global-alert modal-send-error" role="alert">
              {error}
            </div>
          )}
        </div>

        {pending ? (
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setPending(null)} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="button"
              className={`btn ${pending === 'APPROVED' ? 'btn-primary' : 'btn-danger'}`}
              onClick={() => void onDecide(pending, comment)}
              disabled={submitting}
            >
              {submitting ? 'Guardando...' : pending === 'APPROVED' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
            </button>
          </div>
        ) : (
          <div className="modal-actions">
            <button type="button" className="btn btn-danger" onClick={() => setPending('REJECTED')}>
              <X size={15} aria-hidden="true" />
              Rechazar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setPending('APPROVED')}>
              <Check size={15} aria-hidden="true" />
              Aprobar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** MVP only (AUTH_ENABLED=false). Prevents accidents with forwarded links; it does not verify identity. */
function ReviewEmailForm({ onSubmit, error }: { onSubmit: (email: string) => void; error: string | null }) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmailFormat(email)) {
      setFieldError('Ingresa un correo electrónico válido.');
      return;
    }
    setFieldError(null);
    onSubmit(normalizeEmail(email));
  };

  const message = fieldError ?? error ?? undefined;

  return (
    <form className="panel review-panel" onSubmit={handleSubmit} noValidate>
      <div className="global-alert global-alert-warning" role="status">
        Para verificar tu identidad ingresa el correo en donde recibiste el informe
      </div>
      <div className="form-field">
        <label className="field-label" htmlFor="review-email">
          <span>Correo del supervisor<span className="required">*</span></span>
        </label>
        <input
          id="review-email"
          type="email"
          autoComplete="email"
          className={invalidFieldClass(Boolean(message))}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ValidationMessage message={message} />
      </div>
      <div className="review-panel-actions">
        <button type="submit" className="btn btn-primary">Continuar</button>
      </div>
    </form>
  );
}

export function ReviewPage() {
  const { token = '' } = useParams();
  const [review, setReview] = useState<ReviewDetails | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [emailRequired, setEmailRequired] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [reviewEmail, setReviewEmail] = useState('');
  const [modalOpen, setModalOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const loadReview = useCallback(
    async (email = '') => {
      try {
        const response = await fetch(`/api/review/${encodeURIComponent(token)}`, {
          credentials: 'include',
          headers: email ? { 'X-Review-Email': email } : undefined,
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          review?: ReviewDetails;
          emailRequired?: boolean;
          code?: string;
          message?: string;
        };
        if (payload.emailRequired) {
          setEmailRequired(true);
          return;
        }
        if (payload.code === 'WRONG_EMAIL') {
          setEmailError(payload.message ?? null);
          return;
        }
        if (!response.ok || !payload.ok || !payload.review) {
          setReview(null);
          setBlockedMessage(payload.message || 'No fue posible cargar la revisión.');
          return;
        }
        setEmailRequired(false);
        setEmailError(null);
        setReviewEmail(email);
        setReview(payload.review);
      } catch {
        setBlockedMessage('No fue posible cargar la revisión.');
      }
    },
    [token],
  );

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const decide = async (decision: ReportDecision, comment: string) => {
    setSubmitting(true);
    setDecisionError(null);
    try {
      const response = await fetch(`/api/review/${encodeURIComponent(token)}/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ decision, supervisorEmail: reviewEmail, comment }),
      });
      const payload = (await response.json()) as { message?: string };
      if (response.ok || response.status === 409) {
        await loadReview(reviewEmail);
        return;
      }
      setDecisionError(payload.message || 'No fue posible registrar la decisión.');
    } catch {
      setDecisionError('No fue posible registrar la decisión.');
    } finally {
      setSubmitting(false);
    }
  };

  const preview = () => {
    if (!review) return;
    setPreviewError(null);
    openReviewPdf(token, reviewEmail, review.filename).catch(() => {
      setPreviewError('No fue posible abrir el PDF.');
    });
  };

  const decidedMessage = review?.decidedMessage ?? null;

  return (
    <AppShell>
      <div className="topbar-sticky">
        <TopBar eyebrow="Operaciones · Área de Pozas" title="Revisión del informe" />
      </div>

      <main className="app-main">
        <section className="report-section" aria-labelledby="review-section-title">
          <SectionHeader
            icon={ClipboardCheck}
            tone="teal"
            title="Informe Diario de Operaciones"
            titleId="review-section-title"
          />

          {blockedMessage && (
            <div className="global-alert" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              {blockedMessage}
            </div>
          )}

          {decidedMessage && (
            <div className="global-alert global-alert-success" role="status">
              <CircleCheck size={16} aria-hidden="true" />
              {decidedMessage}
            </div>
          )}

          {review && (
            <div className="panel review-panel">
              <ReviewDetailList review={review} />
              <PreviewButton review={review} onPreview={preview} />
              {review.status === 'IN_REVIEW' && (
                <div className="review-panel-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
                    Revisar informe
                  </button>
                </div>
              )}
            </div>
          )}

          {previewError && (
            <div className="global-alert" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              {previewError}
            </div>
          )}

          {emailRequired && !review && !blockedMessage && (
            <ReviewEmailForm onSubmit={(email) => void loadReview(email)} error={emailError} />
          )}

          {!review && !blockedMessage && !emailRequired && <p className="page-note">Cargando…</p>}
        </section>
      </main>

      {review?.status === 'IN_REVIEW' && modalOpen && (
        <ReviewModal
          review={review}
          onClose={() => setModalOpen(false)}
          onDecide={decide}
          onPreview={preview}
          submitting={submitting}
          error={decisionError ?? previewError}
        />
      )}
    </AppShell>
  );
}
