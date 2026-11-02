import { X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import logoUrl from '../../assets/rioloa-logo.png';
import { useShell } from '../../context/ShellContext';

interface AppSidebarProps {
  context: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AppSidebar({ context, children, footer }: AppSidebarProps) {
  const { drawerOpen, setDrawerOpen } = useShell();

  const closeAfterNavigation = (event: MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) setDrawerOpen(false);
  };

  return (
    <>
      {drawerOpen && <div className="sidebar-scrim" role="presentation" onClick={() => setDrawerOpen(false)} />}
      <aside id="app-sidebar" className={`sidebar${drawerOpen ? ' is-open' : ''}`} onClick={closeAfterNavigation}>
        <div className="sidebar-brand">
          <div className="logo-plate">
            <img src={logoUrl} alt="RIOLOA" className="logo-plate-img" width={80} height={24} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-app">Operaciones</span>
            <span className="sidebar-context">{context}</span>
          </div>
          <button type="button" className="sidebar-close" aria-label="Cerrar menú">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sidebar-body">{children}</div>
        {footer && <div className="sidebar-footer">{footer}</div>}
      </aside>
    </>
  );
}
