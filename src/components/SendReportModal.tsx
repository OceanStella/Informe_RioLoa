import { FileText, Plus, Send, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useGuestProfile } from '../context/GuestProfileContext';
import type { AppConfig } from '../types/config';
import type { ReportData } from '../types/report';
import { isValidEmailFormat, normalizeEmail } from '../utils/emailValidation';
import { getReportFileName } from '../utils/pdf';
import { ReportDeliveryError, resendReportEmail, submitReportForReview } from '../utils/reportSubmission';
import { ValidationMessage } from './ValidationMessage';
import { invalidFieldClass } from './fieldUtils';

interface SendReportModalProps {
  open: boolean;
  report: ReportData;
  config: AppConfig;
  onClose: () => void;
  onSuccess: (result: { ccDelivered: boolean }) => void;
  buildPdf: () => Promise<Blob>;
}

type FieldErrors = Record<string, string>;

export function SendReportModal({ open, report, config, onClose, onSuccess, buildPdf }: SendReportModalProps) {
  const { profile: guestProfile } = useGuestProfile();
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [failedDelivery, setFailedDelivery] = useState<{ reportId: string; form: ReportData } | null>(null);
  const sendingRef = useRef(false);

  // One id per form state: repeating the same request cannot create a second report.
  const submissionId = useMemo(() => (report ? crypto.randomUUID() : ''), [report]);

  // A retry only applies to the form that failed; after editing it, a new report is generated.
  const pendingReportId = failedDelivery?.form === report ? failedDelivery.reportId : null;

  useEffect(() => {
    if (!isSending) return undefined;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [isSending]);

  if (!open) return null;

  const validateEmails = (): FieldErrors => {
    const errors: FieldErrors = {};
    const normalizedPrimary = normalizeEmail(primaryEmail);

    if (!normalizedPrimary) {
      errors.primary = 'Ingresa un correo electrónico.';
    } else if (!isValidEmailFormat(normalizedPrimary)) {
      errors.primary = 'Ingresa un correo electrónico válido.';
    }

    const seen = new Set<string>();
    if (normalizedPrimary) seen.add(normalizedPrimary);

    additionalEmails.forEach((email, index) => {
      const trimmed = email.trim();
      if (!trimmed) return;
      const normalized = normalizeEmail(trimmed);
      if (!isValidEmailFormat(normalized)) {
        errors[`additional-${index}`] = 'Ingresa un correo electrónico válido.';
        return;
      }
      if (seen.has(normalized)) {
        errors[`additional-${index}`] = 'Este destinatario ya fue agregado.';
        return;
      }
      seen.add(normalized);
    });

    return errors;
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    const errors = validateEmails();
    setFieldErrors(errors);
    setSendError(null);
    if (Object.keys(errors).length > 0) return;

    const supervisorEmail = normalizeEmail(primaryEmail);
    const ccEmails = Array.from(new Set(additionalEmails.map((e) => normalizeEmail(e)).filter(Boolean)));

    sendingRef.current = true;
    setIsSending(true);
    try {
      const result = pendingReportId
        ? await resendReportEmail(pendingReportId, supervisorEmail)
        : await submitReportForReview({
            report,
            config,
            supervisorEmail,
            ccEmails,
            guestProfile,
            submissionId,
            pdfBlob: await buildPdf(),
          });
      onSuccess(result);
      onClose();
      setPrimaryEmail('');
      setAdditionalEmails([]);
      setFieldErrors({});
      setSendError(null);
      setFailedDelivery(null);
    } catch (err) {
      if (err instanceof ReportDeliveryError) {
        setFailedDelivery({ reportId: err.reportId, form: report });
        setSendError('El informe quedó guardado, pero no se pudo enviar el correo. Reintenta el envío.');
      } else {
        setSendError('No fue posible enviar el informe. Inténtalo nuevamente.');
      }
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const addRecipient = () => {
    setAdditionalEmails((prev) => [...prev, '']);
  };

  const updateAdditional = (index: number, value: string) => {
    setAdditionalEmails((prev) => prev.map((e, i) => (i === index ? value : e)));
    if (fieldErrors[`additional-${index}`]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`additional-${index}`];
        return next;
      });
    }
  };

  const removeAdditional = (index: number) => {
    setAdditionalEmails((prev) => prev.filter((_, i) => i !== index));
    setFieldErrors((prev) => {
      const next: FieldErrors = {};
      Object.entries(prev).forEach(([key, value]) => {
        if (!key.startsWith('additional-')) {
          next[key] = value;
          return;
        }
        const idx = Number(key.replace('additional-', ''));
        if (idx !== index) next[key] = value;
      });
      return next;
    });
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="send-report-title"
        aria-describedby="send-report-description"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="send-report-title" className="modal-title">Enviar Informe Diario de Operaciones</h2>
            <p id="send-report-description" className="modal-text">
              El supervisor recibirá el informe y un enlace para aprobarlo o rechazarlo.
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
          <p className="modal-file">
            <FileText size={16} aria-hidden="true" />
            <span>
              <span className="sr-only">Archivo: </span>
              {getReportFileName(report.date)}
            </span>
          </p>

          <div className="form-field" data-field="send.primaryEmail">
            <label className="field-label" htmlFor="primary-recipient">
              <span>Correo del supervisor<span className="required">*</span></span>
            </label>
            <input
              id="primary-recipient"
              type="email"
              className={invalidFieldClass(Boolean(fieldErrors.primary))}
              value={primaryEmail}
              onChange={(e) => {
                setPrimaryEmail(e.target.value);
                if (fieldErrors.primary) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.primary;
                    return next;
                  });
                }
              }}
              placeholder="supervisor@empresa.cl"
            />
            <ValidationMessage message={fieldErrors.primary} />
          </div>

          <div className="modal-group">
            {additionalEmails.length > 0 && <p className="modal-group-title">Destinatarios en copia (CC)</p>}
            {additionalEmails.map((email, index) => (
              <div key={index} className="additional-recipient-row" data-field={`send.additional-${index}`}>
                <div className="form-field additional-recipient-field">
                  <label className="sr-only" htmlFor={`additional-${index}`}>
                    Destinatario en copia {index + 1}
                  </label>
                  <input
                    id={`additional-${index}`}
                    type="email"
                    className={invalidFieldClass(Boolean(fieldErrors[`additional-${index}`]))}
                    value={email}
                    disabled={Boolean(pendingReportId)}
                    onChange={(e) => updateAdditional(index, e.target.value)}
                    placeholder="gerencia@empresa.cl"
                  />
                  <ValidationMessage message={fieldErrors[`additional-${index}`]} />
                </div>
                <button
                  type="button"
                  className="btn btn-danger-ghost btn-icon-only"
                  aria-label={`Eliminar destinatario en copia ${index + 1}`}
                  disabled={Boolean(pendingReportId)}
                  onClick={() => removeAdditional(index)}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-secondary btn-sm btn-add-recipient"
              onClick={addRecipient}
              disabled={Boolean(pendingReportId)}
            >
              <Plus size={15} aria-hidden="true" />
              Agregar destinatario en copia
            </button>
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
          <button type="button" className="btn btn-primary" onClick={handleSend} disabled={isSending}>
            <Send size={15} aria-hidden="true" />
            {isSending ? 'Enviando...' : pendingReportId ? 'Reintentar envío' : 'Enviar informe'}
          </button>
        </div>
      </div>
    </div>
  );
}
