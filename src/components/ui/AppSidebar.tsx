import { X } from 'lucide-react';
import type { MouseEvent, ReactNode } from 'react';
import logoUrl from '../../assets/rioloa-logo.png';
import { useShell } from '../../context/ShellContext';

export function AppSidebar({ children }: { children: ReactNode }) {
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
          <button type="button" className="sidebar-close" aria-label="Cerrar menú">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="sidebar-body">{children}</div>
      </aside>
    </>
  );
}
