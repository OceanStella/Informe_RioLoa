import { LogIn } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import logoUrl from '../assets/rioloa-logo.png';
import { invalidFieldClass } from '../components/fieldUtils';
import { ValidationMessage } from '../components/ValidationMessage';
import { useAuth, type MvpUnlockResult } from '../context/AuthContext';

const FAILURE_MESSAGES: Record<Exclude<MvpUnlockResult, 'ok'>, string> = {
  invalid: 'Código incorrecto.',
  limited: 'Demasiados intentos. Intenta más tarde.',
  unavailable: 'No fue posible validar el código.',
};

interface MvpAccessPageProps {
  /** Covers the app without unmounting it, so an expired cookie does not lose a report in progress. */
  overlay: boolean;
}

export function MvpAccessPage({ overlay }: MvpAccessPageProps) {
  const { unlockMvpAccess } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await unlockMvpAccess(code);
    setIsSubmitting(false);
    if (result !== 'ok') setError(FAILURE_MESSAGES[result]);
    setCode('');
  };

  return (
    <main className={`login-page${overlay ? ' is-overlay' : ''}`}>
      <form className="panel login-card" aria-labelledby="mvp-access-title" onSubmit={handleSubmit}>
        <img src={logoUrl} alt="RIOLOA" className="login-logo" width={120} height={38} />
        <div className="login-heading">
          <h1 className="modal-title" id="mvp-access-title">Acceso al sistema</h1>
          <p className="modal-text">Ingresa el código de acceso para continuar.</p>
        </div>
        <div className="form-field login-field">
          <label className="field-label" htmlFor="mvp-access-code">Código de acceso</label>
          <input
            id="mvp-access-code"
            type="password"
            autoComplete="off"
            className={invalidFieldClass(Boolean(error))}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <ValidationMessage message={error ?? undefined} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg login-button" disabled={isSubmitting || !code.trim()}>
          <LogIn size={16} aria-hidden="true" />
          {isSubmitting ? 'Validando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
