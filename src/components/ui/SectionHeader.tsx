import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Tone } from './KpiStrip';

interface SectionHeaderProps {
  title: string;
  step?: number;
  totalSteps?: number;
  icon?: LucideIcon;
  tone?: Tone;
  description?: ReactNode;
  actions?: ReactNode;
  titleId?: string;
}

export function SectionHeader({
  title,
  step,
  totalSteps = 5,
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
          {step != null && (
            <p className="section-eyebrow">
              Paso {step} de {totalSteps}
            </p>
          )}
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
