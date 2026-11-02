import { Menu } from 'lucide-react';
import type { ReactNode } from 'react';
import logoUrl from '../../assets/rioloa-logo.png';
import { useShell } from '../../context/ShellContext';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}

export function TopBar({ eyebrow, title, actions }: TopBarProps) {
  const { drawerOpen, setDrawerOpen } = useShell();

  return (
    <header className="topbar">
      <div className="topbar-inner">
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
        <img src={logoUrl} alt="RIOLOA" className="topbar-logo" width={66} height={20} />
        <div className="topbar-heading">
          <p className="topbar-eyebrow">{eyebrow}</p>
          <h1 className="topbar-title">{title}</h1>
        </div>
        {actions && <div className="topbar-actions">{actions}</div>}
        <UserMenu />
      </div>
    </header>
  );
}
