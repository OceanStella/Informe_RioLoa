import { Menu } from '@base-ui/react/menu';
import { ChevronDown, Lock, LogOut, Pencil, Settings, Trash2, UserRound } from 'lucide-react';
import { useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useGuestProfile } from '../../context/GuestProfileContext';
import { useShell } from '../../context/ShellContext';

export function UserMenu({ showAdmin }: { showAdmin: boolean }) {
  const { user, logout, mvpAccess, lockMvpAccess } = useAuth();
  const { profile, clearProfile, setEditing } = useGuestProfile();
  const { openAdmin } = useShell();
  // The closing menu hands focus back to its trigger: a modal opened any sooner would lose its field.
  const afterClose = useRef<(() => void) | null>(null);

  const identity = user ?? profile;
  if (!identity) return null;

  const label = identity.displayName || identity.email;

  return (
    // Non-modal: a modal menu locks the page scroll and the layout jumps by the scrollbar.
    <Menu.Root
      modal={false}
      onOpenChangeComplete={(open) => {
        const action = afterClose.current;
        if (open || !action) return;
        afterClose.current = null;
        requestAnimationFrame(action);
      }}
    >
      <Menu.Trigger className="btn btn-ghost btn-sm user-menu-trigger" aria-label={`Cuenta de ${label}`}>
        <UserRound size={15} aria-hidden="true" />
        <span className="user-menu-name">{label}</span>
        <ChevronDown size={14} className="user-menu-chevron" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="user-menu-positioner" align="end" sideOffset={8}>
          <Menu.Popup className="user-menu-panel">
            {showAdmin && (
              <>
                <Menu.Item
                  className="user-menu-item"
                  onClick={() => {
                    afterClose.current = () => void openAdmin();
                  }}
                >
                  <Settings size={14} aria-hidden="true" />
                  Administrar parámetros
                </Menu.Item>
                <Menu.Separator className="user-menu-separator" />
              </>
            )}
            {user ? (
              <Menu.Item className="user-menu-item" onClick={() => void logout()}>
                <LogOut size={14} aria-hidden="true" />
                Cerrar sesión
              </Menu.Item>
            ) : (
              <>
                <Menu.Item
                  className="user-menu-item"
                  onClick={() => {
                    afterClose.current = () => setEditing(true);
                  }}
                >
                  <Pencil size={14} aria-hidden="true" />
                  Cambiar perfil
                </Menu.Item>
                {mvpAccess.authenticated && (
                  <Menu.Item className="user-menu-item" onClick={() => void lockMvpAccess()}>
                    <Lock size={14} aria-hidden="true" />
                    Bloquear acceso
                  </Menu.Item>
                )}
                <Menu.Item className="user-menu-item is-danger" onClick={clearProfile}>
                  <Trash2 size={14} aria-hidden="true" />
                  Borrar perfil
                </Menu.Item>
              </>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
