import { useEffect, useState } from 'react';

export function useActiveSection(sectionIds: string[]): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(sectionIds[0]);
  const key = sectionIds.join('|');

  useEffect(() => {
    const ids = key.split('|');
    const update = () => {
      const offset = 140;
      let current = ids[0];
      let currentTop = -Infinity;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        // Sections laid out side by side share a top edge; keep the first one.
        if (top - offset <= 0 && top > currentTop + 1) {
          current = id;
          currentTop = top;
        }
      }
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActiveId(atBottom ? ids[ids.length - 1] : current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [key]);

  return activeId;
}
