import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AdminPasswordModal } from '../components/AdminPasswordModal';

interface ShellContextValue {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  adminOpen: boolean;
  openAdmin: () => Promise<void>;
  closeAdmin: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [drawerOpen]);

  const openAdmin = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/session', { credentials: 'include' });
      const payload = (await response.json()) as { authenticated?: boolean };
      if (payload.authenticated) {
        setAdminOpen(true);
        return;
      }
    } catch {
      // Fall through to password modal.
    }
    setPasswordOpen(true);
  }, []);

  const closeAdmin = useCallback(() => setAdminOpen(false), []);

  const value = useMemo(
    () => ({ drawerOpen, setDrawerOpen, adminOpen, openAdmin, closeAdmin }),
    [drawerOpen, adminOpen, openAdmin, closeAdmin],
  );

  return (
    <ShellContext.Provider value={value}>
      {children}
      <AdminPasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        onSuccess={() => {
          setPasswordOpen(false);
          setAdminOpen(true);
        }}
      />
    </ShellContext.Provider>
  );
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell debe usarse dentro de ShellProvider');
  return ctx;
}
