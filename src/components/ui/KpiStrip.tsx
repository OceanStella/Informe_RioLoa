import type { LucideIcon } from 'lucide-react';

export type Tone = 'teal' | 'cyan' | 'aqua' | 'sand' | 'coral' | 'indigo';

export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon: LucideIcon;
  tone: Tone;
}

export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpi-strip">
      {items.map(({ label, value, unit, sub, icon: Icon, tone }) => (
        <div key={label} className={`kpi tone-${tone}`}>
          <span className="kpi-icon" aria-hidden="true">
            <Icon size={18} />
          </span>
          <div className="kpi-body">
            <p className="kpi-label">{label}</p>
            <p className="kpi-value">
              {value}
              {unit && <span className="kpi-unit">{unit}</span>}
            </p>
            {sub && <p className="kpi-sub">{sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
