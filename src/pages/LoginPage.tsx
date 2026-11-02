import { CircleAlert, LogIn } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import logoUrl from '../assets/rioloa-logo.png';

export function LoginPage() {
  const { pathname, search } = useLocation();
  const params = new URLSearchParams(search);
  const failed = params.get('authError') === '1';
  params.delete('authError');
  const query = params.toString();
  const returnTo = `${pathname}${query ? `?${query}` : ''}`;

  return (
    <main className="login-page">
      <section className="panel login-card" aria-labelledby="login-title">
        <img src={logoUrl} alt="RIOLOA" className="login-logo" width={120} height={38} />
        <div className="login-heading">
          <h1 className="modal-title" id="login-title">Informe Diario de Operaciones</h1>
          <p className="modal-text">Área de Pozas · SQM</p>
        </div>
        {failed && (
          <div className="global-alert" role="alert">
            <CircleAlert size={16} aria-hidden="true" />
            No fue posible iniciar sesión. Inténtalo nuevamente.
          </div>
        )}
        <a className="btn btn-primary btn-lg login-button" href={`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`}>
          <LogIn size={16} aria-hidden="true" />
          Iniciar sesión o registrarse
        </a>
      </section>
    </main>
  );
}
