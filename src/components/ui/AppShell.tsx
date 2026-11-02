import { Suspense, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useShell } from '../../context/ShellContext';
import { AdminPanel } from '../AdminPanel';
import { AppSidebar } from './AppSidebar';
import { NAV_ITEMS } from './navItems';
import type { ShellSlots } from './shellSlots';
import { PageSkeleton } from './Skeletons';
import { TopBar } from './TopBar';

/** The top bar holds these links from 861px up; on a phone they live in the drawer. */
function DrawerNav() {
  const { adminOpen, closeAdmin } = useShell();
  const { pathname } = useLocation();

  return (
    <nav className="step-nav drawer-nav" aria-label="Navegación principal">
      <ol className="step-list is-plain">
        {NAV_ITEMS.map((item) => {
          const active = !adminOpen && pathname === item.to;
          return (
            <li key={item.to} className={`step-item is-idle${active ? ' is-active' : ''}`}>
              <Link
                to={item.to}
                className="step-link"
                aria-current={active ? 'page' : undefined}
                onClick={closeAdmin}
              >
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

/** The layout route: it stays mounted across navigation, only the page inside it changes. */
export function AppShell() {
  const { adminOpen, closeAdmin } = useShell();
  const { pathname } = useLocation();
  const [panel, setPanel] = useState<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState<HTMLDivElement | null>(null);
  const slots = useMemo<ShellSlots>(() => ({ panel, progress }), [panel, progress]);

  // The supervisor arrives from the email: the app around the review is not theirs.
  const navigation = !pathname.startsWith('/review/');
  const hasPanel = pathname === '/report' && !adminOpen;

  return (
    <div className={`app-shell${hasPanel ? ' has-sidebar' : ''}`}>
      {navigation && (
        <AppSidebar>
          <DrawerNav />
          <div className="sidebar-slot" ref={setPanel} />
        </AppSidebar>
      )}
      <div className="topbar-sticky">
        <TopBar navigation={navigation} />
        <div ref={setProgress} />
      </div>
      <div className="workspace">
        {adminOpen ? (
          <AdminPanel onBack={closeAdmin} backLabel={pathname === '/report' ? 'Volver al informe' : 'Volver'} />
        ) : (
          <Suspense fallback={<PageSkeleton />}>
            <Outlet context={slots} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
