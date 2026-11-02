import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type Tone = 'teal' | 'cyan' | 'aqua' | 'sand' | 'coral' | 'indigo';

interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  tone?: Tone;
  description?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
}

export function SectionHeader({
  title,
  icon: Icon,
  tone = 'teal',
  description,
  actions,
  titleId,
}: SectionHeaderProps) {
  return (
    <div className="section-header">
      <div className="section-heading">
        {Icon && (
          <span className={`section-icon tone-${tone}`} aria-hidden="true">
            <Icon size={20} />
          </span>
        )}
        <div className="section-heading-text">
          <h2 className="section-title" id={titleId}>
            {title}
          </h2>
          {description && <p className="section-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="section-actions">{actions}</div>}
    </div>
  );
}
