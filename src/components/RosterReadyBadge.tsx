import { Check, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface RosterReadyBadgeProps {
  tooltip: string;
}

export function RosterReadyBadge({ tooltip }: RosterReadyBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.top, left: rect.left + rect.width / 2 });
    setOpen(true);
  };

  return (
    <>
      <span
        ref={ref}
        className="roster-ready-badge"
        tabIndex={0}
        role="img"
        aria-label={`Datos completos en Dotación activa. ${tooltip}`}
        onMouseEnter={show}
        onMouseLeave={() => setOpen(false)}
        onFocus={show}
        onBlur={() => setOpen(false)}
        onPointerUp={(event) => {
          if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
          event.preventDefault();
          if (open) setOpen(false);
          else show();
        }}
      >
        <Info size={18} className="roster-ready-info" aria-hidden="true" />
        <span className="roster-ready-check" aria-hidden="true">
          <Check size={9} strokeWidth={4} />
        </span>
      </span>
      {open &&
        createPortal(
          <span className="roster-ready-tooltip" role="tooltip" style={{ top: pos.top, left: pos.left }}>
            {tooltip}
          </span>,
          document.body,
        )}
    </>
  );
}
