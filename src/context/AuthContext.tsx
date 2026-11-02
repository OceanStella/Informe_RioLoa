import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export type MvpUnlockResult = 'ok' | 'invalid' | 'limited' | 'unavailable';

interface MvpAccess {
  required: boolean;
  authenticated: boolean;
}

interface AuthContextValue {
  loading: boolean;
  authEnabled: boolean;
  /** True only when the server confirmed AUTH_ENABLED=false: a failed request never enables guest mode. */
  guestMode: boolean;
  user: AuthUser | null;
  mvpAccess: MvpAccess;
  unlockMvpAccess: (code: string) => Promise<MvpUnlockResult>;
  lockMvpAccess: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// The cookie lasts 12 hours and a shift may outlast it: this brings the gate back without a reload.
const MVP_ACCESS_RECHECK_MS = 60_000;

async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  const payload = (await response.json()) as { logoutUrl?: string };
  window.location.assign(payload.logoutUrl || '/');
}

async function fetchMvpAccess(): Promise<MvpAccess> {
  const response = await fetch('/api/mvp-access/status', { credentials: 'include' });
  const payload = (await response.json()) as Partial<MvpAccess>;
  return { required: Boolean(payload.required), authenticated: Boolean(payload.authenticated) };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [guestMode, setGuestMode] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mvpAccess, setMvpAccess] = useState<MvpAccess>({ required: false, authenticated: false });

  useEffect(() => {
    const load = async () => {
      try {
        const [response, access] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetchMvpAccess(),
        ]);
        const payload = (await response.json()) as { authEnabled?: boolean; user?: AuthUser };
        setAuthEnabled(Boolean(payload.authEnabled));
        setGuestMode(payload.authEnabled === false);
        setUser(payload.user ?? null);
        setMvpAccess(access);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const mvpUnlocked = mvpAccess.required && mvpAccess.authenticated;

  useEffect(() => {
    if (!mvpUnlocked) return undefined;
    const recheck = () => {
      fetchMvpAccess().then(setMvpAccess).catch(() => undefined);
    };
    const timer = window.setInterval(recheck, MVP_ACCESS_RECHECK_MS);
    window.addEventListener('focus', recheck);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', recheck);
    };
  }, [mvpUnlocked]);

  const unlockMvpAccess = useCallback(async (code: string): Promise<MvpUnlockResult> => {
    try {
      const response = await fetch('/api/mvp-access/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      });
      if (response.ok) {
        setMvpAccess({ required: true, authenticated: true });
        return 'ok';
      }
      if (response.status === 401) return 'invalid';
      if (response.status === 429) return 'limited';
      return 'unavailable';
    } catch {
      return 'unavailable';
    }
  }, []);

  const lockMvpAccess = useCallback(async () => {
    await fetch('/api/mvp-access/logout', { method: 'POST', credentials: 'include' });
    setMvpAccess({ required: true, authenticated: false });
  }, []);

  const value = useMemo(
    () => ({ loading, authEnabled, guestMode, user, mvpAccess, unlockMvpAccess, lockMvpAccess, logout }),
    [loading, authEnabled, guestMode, user, mvpAccess, unlockMvpAccess, lockMvpAccess],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
