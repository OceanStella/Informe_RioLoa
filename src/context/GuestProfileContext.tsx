import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { isValidEmailFormat } from '../utils/emailValidation';
import { useAuth } from './AuthContext';

export interface GuestProfile {
  displayName: string;
  email: string;
}

const STORAGE_KEY = 'informeOctavioGuestProfile';

function readStoredProfile(): GuestProfile | null {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<GuestProfile> | null;
    if (!stored?.displayName?.trim() || !isValidEmailFormat(stored.email ?? '')) return null;
    return { displayName: stored.displayName, email: stored.email as string };
  } catch {
    return null;
  }
}

function writeStoredProfile(profile: GuestProfile | null): void {
  try {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Blocked storage: the profile still lasts for this visit.
  }
}

interface GuestProfileContextValue {
  /** Null whenever AUTH_ENABLED=true, even if an old profile remains in this browser. */
  profile: GuestProfile | null;
  saveProfile: (profile: GuestProfile) => void;
  clearProfile: () => void;
  editing: boolean;
  setEditing: (editing: boolean) => void;
}

const GuestProfileContext = createContext<GuestProfileContextValue | null>(null);

export function GuestProfileProvider({ children }: { children: ReactNode }) {
  const { guestMode } = useAuth();
  const [storedProfile, setStoredProfile] = useState<GuestProfile | null>(readStoredProfile);
  const [editing, setEditing] = useState(false);

  const saveProfile = useCallback((profile: GuestProfile) => {
    writeStoredProfile(profile);
    setStoredProfile(profile);
    setEditing(false);
  }, []);

  const clearProfile = useCallback(() => {
    writeStoredProfile(null);
    setStoredProfile(null);
    setEditing(false);
  }, []);

  const profile = guestMode ? storedProfile : null;

  const value = useMemo(
    () => ({ profile, saveProfile, clearProfile, editing, setEditing }),
    [profile, saveProfile, clearProfile, editing],
  );

  return <GuestProfileContext.Provider value={value}>{children}</GuestProfileContext.Provider>;
}

export function useGuestProfile(): GuestProfileContextValue {
  const ctx = useContext(GuestProfileContext);
  if (!ctx) throw new Error('useGuestProfile debe usarse dentro de GuestProfileProvider');
  return ctx;
}
