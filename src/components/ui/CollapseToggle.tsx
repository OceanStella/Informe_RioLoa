import { ChevronDown } from 'lucide-react';

interface CollapseToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  subject?: string;
}

export function CollapseToggle({ collapsed, onToggle, subject }: CollapseToggleProps) {
  const label = collapsed ? 'Expandir' : 'Minimizar';
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm collapse-toggle"
      aria-expanded={!collapsed}
      aria-label={subject ? `${label} ${subject}` : label}
      onClick={onToggle}
    >
      <ChevronDown size={16} className="collapse-chevron" aria-hidden="true" />
      <span className="collapse-toggle-label">{label}</span>
    </button>
  );
}
