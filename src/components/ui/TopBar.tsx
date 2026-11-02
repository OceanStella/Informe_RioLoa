import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import logoUrl from '../../assets/rioloa-logo.png';
import { useShell } from '../../context/ShellContext';
import { NAV_ITEMS } from './navItems';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  /** False on the supervisor's review link, where the app around it is not theirs to use. */
  navigation: boolean;
}

export function TopBar({ navigation }: TopBarProps) {
  const { adminOpen, closeAdmin, drawerOpen, setDrawerOpen } = useShell();
  const { pathname } = useLocation();
  const logo = <img src={logoUrl} alt="RIOLOA" className="topbar-logo" width={75} height={24} />;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="topbar-start">
          {navigation ? (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-icon-only topbar-menu"
                aria-label="Abrir menú"
                aria-expanded={drawerOpen}
                aria-controls="app-sidebar"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <Link to="/dashboard" className="topbar-home" onClick={closeAdmin}>
                {logo}
              </Link>
            </>
          ) : (
            logo
          )}
        </div>

        {navigation && (
          <nav className="topnav" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="topnav-link"
                aria-current={!adminOpen && pathname === item.to ? 'page' : undefined}
                onClick={closeAdmin}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="topbar-end">
          <UserMenu showAdmin={navigation} />
        </div>
      </div>
    </header>
  );
}
