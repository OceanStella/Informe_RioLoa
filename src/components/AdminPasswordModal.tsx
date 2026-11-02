import { X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ValidationMessage } from './ValidationMessage';
import { invalidFieldClass } from './fieldUtils';

interface AdminPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminPasswordModal({ open, onClose, onSuccess }: AdminPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.message || 'Contraseña incorrecta.');
        return;
      }
      setPassword('');
      onSuccess();
    } catch {
      setError('No fue posible validar la contraseña.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <form
        className="modal-card modal-card-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-password-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-header">
          <div>
            <h2 id="admin-password-title" className="modal-title">Administrar parámetros</h2>
            <p className="modal-text">Ingresa la contraseña de administración.</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only"
            aria-label="Cerrar"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label className="field-label" htmlFor="admin-password">Contraseña</label>
            <input
              id="admin-password"
              autoFocus
              type="password"
              autoComplete="current-password"
              className={invalidFieldClass(Boolean(error))}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <ValidationMessage message={error ?? undefined} />
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !password.trim()}>
            {isSubmitting ? 'Validando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
