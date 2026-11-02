import { Pencil, Send, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReportListItem } from '../types/reports';
import { formatShortDate } from '../utils/dates';
import { isValidEmailFormat, normalizeEmail } from '../utils/emailValidation';
import { resendReportEmail } from '../utils/reportSubmission';
import { ValidationMessage } from './ValidationMessage';
import { invalidFieldClass } from './fieldUtils';

interface ResendReportModalProps {
  report: ReportListItem;
  onClose: () => void;
  onSent: () => void;
}

export function ResendReportModal({ report, onClose, onSent }: ResendReportModalProps) {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!email.trim()) {
      setFieldError('Ingresa un correo electrónico.');
      return;
    }
    if (!isValidEmailFormat(email)) {
      setFieldError('Ingresa un correo electrónico válido.');
      return;
    }

    setFieldError(null);
    setSendError(null);
    sendingRef.current = true;
    setIsSending(true);
    try {
      await resendReportEmail(report.id, normalizeEmail(email));
      onSent();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'No fue posible enviar el informe.');
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !isSending && onClose()}>
      <div
        className="modal-card modal-card-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="resend-report-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="resend-report-title" className="modal-title">Reenviar informe</h2>
            <p className="modal-text">
              Se enviará el mismo informe del {formatShortDate(report.reportDate)}, sin crear uno nuevo.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={isSending}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label className="field-label" htmlFor="resend-email">
              <span>Correo del supervisor<span className="required">*</span></span>
            </label>
            <input
              id="resend-email"
              type="email"
              className={invalidFieldClass(Boolean(fieldError))}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="supervisor@empresa.cl"
            />
            <ValidationMessage message={fieldError ?? undefined} />
          </div>
          {sendError && (
            <div className="global-alert modal-send-error" role="alert">
              {sendError}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSending}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleSend()} disabled={isSending}>
            <Send size={15} aria-hidden="true" />
            {isSending ? 'Enviando...' : 'Reenviar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface CommentModalProps {
  report: ReportListItem;
  onClose: () => void;
}

export function CommentModal({ report, onClose }: CommentModalProps) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-comment-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="report-comment-title" className="modal-title">Comentario del supervisor</h2>
            <p className="modal-text">Informe rechazado del {formatShortDate(report.reportDate)}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-icon-only" aria-label="Cerrar" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <p className="comment-text modal-comment">{report.rejectionComment}</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditRejectedModalProps {
  report: ReportListItem;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function EditRejectedModal({ report, onCancel, onConfirm }: EditRejectedModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible cargar el informe.');
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={() => !isLoading && onCancel()}>
      <div
        className="modal-card modal-card-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-rejected-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="edit-rejected-title" className="modal-title">Volver a editar</h2>
            <p className="modal-text">
              Se usará el informe rechazado del {formatShortDate(report.reportDate)} como base para crear uno corregido.
            </p>
          </div>
        </div>
        <div className="modal-body">
          <p className="modal-text">
            El informe rechazado no cambiará. Lo que tengas en el formulario de generación será reemplazado.
          </p>
          {error && (
            <div className="global-alert modal-send-error" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void handleConfirm()} disabled={isLoading}>
            <Pencil size={15} aria-hidden="true" />
            {isLoading ? 'Cargando...' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
