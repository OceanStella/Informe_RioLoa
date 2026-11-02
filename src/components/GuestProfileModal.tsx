import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGuestProfile, type GuestProfile } from '../context/GuestProfileContext';
import { isValidEmailFormat, normalizeEmail } from '../utils/emailValidation';
import { ValidationMessage } from './ValidationMessage';
import { invalidFieldClass } from './fieldUtils';

interface GuestProfileFormProps {
  initial: GuestProfile | null;
  onSave: (profile: GuestProfile) => void;
  onCancel?: () => void;
}

function GuestProfileForm({ initial, onSave, onCancel }: GuestProfileFormProps) {
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [errors, setErrors] = useState<{ displayName?: string; email?: string }>({});

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const next: typeof errors = {};
    if (!displayName.trim()) next.displayName = 'Ingresa tu nombre.';
    if (!email.trim()) next.email = 'Ingresa un correo electrónico.';
    else if (!isValidEmailFormat(email)) next.email = 'Ingresa un correo electrónico válido.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({ displayName: displayName.trim(), email: normalizeEmail(email) });
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onCancel}>
      <form
        className="modal-card modal-card-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-profile-title"
        aria-describedby="guest-profile-description"
        noValidate
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="modal-header">
          <div>
            <h2 id="guest-profile-title" className="modal-title">Identifícate para continuar</h2>
            <p id="guest-profile-description" className="modal-text">
              Esta información se utilizará únicamente para identificar quién genera los informes durante la etapa de
              pruebas.
            </p>
          </div>
        </div>
        <div className="modal-body">
          <div className="form-field">
            <label className="field-label" htmlFor="guest-name">
              <span>Nombre<span className="required">*</span></span>
            </label>
            <input
              id="guest-name"
              autoFocus
              type="text"
              autoComplete="name"
              maxLength={200}
              className={invalidFieldClass(Boolean(errors.displayName))}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <ValidationMessage message={errors.displayName} />
          </div>
          <div className="form-field">
            <label className="field-label" htmlFor="guest-email">
              <span>Correo<span className="required">*</span></span>
            </label>
            <input
              id="guest-email"
              type="email"
              autoComplete="email"
              className={invalidFieldClass(Boolean(errors.email))}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <ValidationMessage message={errors.email} />
          </div>
        </div>
        <div className="modal-actions">
          {onCancel && (
            <button type="button" className="btn btn-ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
          <button type="submit" className="btn btn-primary">
            Guardar perfil
          </button>
        </div>
      </form>
    </div>
  );
}

/** Review links are exempt: a supervisor only confirms an email there and generates nothing. */
export function GuestProfileGate() {
  const { guestMode } = useAuth();
  const { profile, saveProfile, editing, setEditing } = useGuestProfile();
  const { pathname } = useLocation();

  if (!guestMode) return null;
  if (editing) {
    return <GuestProfileForm initial={profile} onSave={saveProfile} onCancel={() => setEditing(false)} />;
  }
  if (!profile && !pathname.startsWith('/review/')) {
    return <GuestProfileForm initial={null} onSave={saveProfile} />;
  }
  return null;
}
