import { Lock, LogOut, Pencil, Trash2, UserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGuestProfile } from '../../context/GuestProfileContext';

export function UserMenu() {
  const { user, logout, mvpAccess, lockMvpAccess } = useAuth();
  const { profile, clearProfile, setEditing } = useGuestProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const identity = user ?? profile;
  if (!identity) return null;

  const label = identity.displayName || identity.email;

  return (
    <div className="user-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm user-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Cuenta de ${label}`}
        onClick={() => setOpen((current) => !current)}
      >
        <UserRound size={15} aria-hidden="true" />
        <span className="user-menu-name">{label}</span>
      </button>
      {open && (
        <div className="user-menu-panel" role="menu">
          {user ? (
            <button type="button" className="btn btn-ghost btn-sm" role="menuitem" onClick={() => void logout()}>
              <LogOut size={14} aria-hidden="true" />
              Cerrar sesión
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setEditing(true);
                }}
              >
                <Pencil size={14} aria-hidden="true" />
                Cambiar perfil
              </button>
              <button
                type="button"
                className="btn btn-danger-ghost btn-sm"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  clearProfile();
                }}
              >
                <Trash2 size={14} aria-hidden="true" />
                Borrar perfil
              </button>
              {mvpAccess.authenticated && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    void lockMvpAccess();
                  }}
                >
                  <Lock size={14} aria-hidden="true" />
                  Bloquear acceso
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
