import { Check, TriangleAlert } from 'lucide-react';
import type { StepStatus } from '../reportOverview';
import { useActiveSection } from './useActiveSection';

export interface StepNavChild {
  id: string;
  label: string;
}

export interface StepNavItem {
  id: string;
  label: string;
  meta?: string;
  status?: StepStatus;
  children?: StepNavChild[];
}

interface StepNavProps {
  title: string;
  items: StepNavItem[];
  numbered?: boolean;
}

export function StepNav({ title, items, numbered = true }: StepNavProps) {
  const activeId = useActiveSection(items.map((item) => item.id));
  const activeChildId = useActiveSection(items.flatMap((item) => item.children ?? []).map((child) => child.id));

  return (
    <nav className="step-nav" aria-label={title}>
      <p className="sidebar-label">{title}</p>
      <ol className={`step-list${numbered ? '' : ' is-plain'}`}>
        {items.map((item, index) => {
          const status = item.status ?? 'idle';
          const active = activeId === item.id;
          return (
            <li key={item.id} className={`step-item is-${status}${active ? ' is-active' : ''}`}>
              <a href={`#${item.id}`} className="step-link" aria-current={active ? 'location' : undefined}>
                <span className="step-marker" aria-hidden="true">
                  {status === 'done' ? (
                    <Check size={13} strokeWidth={3} />
                  ) : status === 'warning' ? (
                    <TriangleAlert size={12} strokeWidth={2.5} />
                  ) : numbered ? (
                    index + 1
                  ) : null}
                </span>
                <span className="step-text">
                  <span className="step-label">{item.label}</span>
                  {item.meta && <span className="step-meta">{item.meta}</span>}
                </span>
              </a>
              {item.children && (
                <ul className="step-sublist">
                  {item.children.map((child) => {
                    const childActive = active && activeChildId === child.id;
                    return (
                      <li key={child.id}>
                        <a
                          href={`#${child.id}`}
                          className={`step-sublink${childActive ? ' is-active' : ''}`}
                          aria-current={childActive ? 'location' : undefined}
                        >
                          {child.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
