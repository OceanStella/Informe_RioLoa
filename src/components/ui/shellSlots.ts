import { useOutletContext } from 'react-router-dom';

/** Places in the persistent shell that a page can fill with a portal. */
export interface ShellSlots {
  panel: HTMLElement | null;
  progress: HTMLElement | null;
}

export function useShellSlots(): ShellSlots {
  return useOutletContext<ShellSlots>();
}
