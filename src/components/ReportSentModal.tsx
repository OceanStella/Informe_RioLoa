import { CircleCheck, TriangleAlert } from 'lucide-react';

interface ReportSentModalProps {
  ccDelivered: boolean;
  onClose: () => void;
}

export function ReportSentModal({ ccDelivered, onClose }: ReportSentModalProps) {
  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-card-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-sent-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="report-sent-title" className="modal-title">¡Informe enviado correctamente!</h2>
            <p className="modal-text">El supervisor recibió el informe y el enlace para revisarlo.</p>
          </div>
        </div>
        <div className="modal-body">
          <div className="global-alert global-alert-success" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            Puedes consultarlo en el historial. El formulario quedó listo para un informe nuevo.
          </div>
          {!ccDelivered && (
            <div className="global-alert global-alert-warning" role="status">
              <TriangleAlert size={16} aria-hidden="true" />
              No se pudo entregar la copia a los demás destinatarios.
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
