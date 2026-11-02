import { Select as BaseSelect } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { invalidFieldClass } from '../fieldUtils';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  /** Goes on the trigger, so a field label opens the list. */
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  invalid?: boolean;
}

const PLACEHOLDER = { value: null, label: 'Seleccionar...' };

export function Select({ id, value, options, onChange, invalid = false }: SelectProps) {
  const items = [PLACEHOLDER, ...options];

  return (
    // Non-modal: a modal list locks the page scroll and the layout jumps by the scrollbar.
    <BaseSelect.Root items={items} value={value || null} modal={false} onValueChange={(next) => onChange(next ?? '')}>
      <BaseSelect.Trigger id={id} className={`select-trigger ${invalidFieldClass(invalid)}`}>
        <BaseSelect.Value className="select-value" />
        <BaseSelect.Icon className="select-icon">
          <ChevronDown size={16} aria-hidden="true" />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className="select-positioner" alignItemWithTrigger={false} sideOffset={4}>
          <BaseSelect.Popup className="select-popup">
            <BaseSelect.List>
              {items.map((item) => (
                <BaseSelect.Item
                  key={item.label}
                  value={item.value}
                  className={`select-item${item.value === null ? ' is-placeholder' : ''}`}
                >
                  <BaseSelect.ItemText>{item.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="select-check">
                    <Check size={14} aria-hidden="true" />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
