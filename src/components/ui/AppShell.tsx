import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useReport } from '../../context/ReportContext';
import { useShell } from '../../context/ShellContext';
import { AdminPanel } from '../AdminPanel';
import { formatReportDate } from '../reportOverview';
import { AppSidebar } from './AppSidebar';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'Historial' },
  { to: '/report', label: 'Generar informe' },
];

function TurnCard() {
  const { report } = useReport();
  return (
    <div className="sidebar-card turn-card">
      <p className="sidebar-label">Turno</p>
      <p className="turn-date">{formatReportDate(report.date)}</p>
      <dl className="turn-meta">
        <div>
          <dt>Área</dt>
          <dd>{report.area || '—'}</dd>
        </div>
        <div>
          <dt>Supervisor</dt>
          <dd>{report.supervisor.trim() || '—'}</dd>
        </div>
        <div>
          <dt>APR</dt>
          <dd>{report.apr.trim() || '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function AppNav() {
  const { pathname } = useLocation();

  return (
    <nav className="step-nav" aria-label="Navegación principal">
      <p className="sidebar-label">Navegación</p>
      <ol className="step-list is-plain">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to;
          return (
            <li key={item.to} className={`step-item is-idle${active ? ' is-active' : ''}`}>
              <Link to={item.to} className="step-link" aria-current={active ? 'page' : undefined}>
                <span className="step-marker" aria-hidden="true" />
                <span className="step-text">
                  <span className="step-label">{item.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface AppShellProps {
  /** Rendered between the turn card and the navigation; only the report uses it. */
  sidebarCards?: ReactNode;
  /** Rendered under the navigation; only the report uses it. */
  sidebarSteps?: ReactNode;
  children: ReactNode;
}

export function AppShell({ sidebarCards, sidebarSteps, children }: AppShellProps) {
  const { adminOpen, closeAdmin, openAdmin } = useShell();
  const { pathname } = useLocation();

  if (adminOpen) {
    return <AdminPanel onBack={closeAdmin} backLabel={pathname === '/report' ? 'Volver al informe' : 'Volver'} />;
  }

  return (
    <div className="app-shell has-sidebar">
      <AppSidebar
        context="Área de Pozas · SQM"
        footer={
          <button type="button" className="sidebar-admin" onClick={() => void openAdmin()}>
            <Settings size={16} aria-hidden="true" />
            Administrar parámetros
          </button>
        }
      >
        <TurnCard />
        {sidebarCards}
        <AppNav />
        {sidebarSteps}
      </AppSidebar>
      <div className="workspace">{children}</div>
    </div>
  );
}
