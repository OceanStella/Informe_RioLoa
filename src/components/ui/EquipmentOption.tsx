import { RosterReadyBadge } from '../RosterReadyBadge';

interface EquipmentOptionProps {
  code: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  readyTooltip?: string;
}

export function EquipmentOption({ code, checked, onChange, readyTooltip }: EquipmentOptionProps) {
  return (
    <li>
      <label className={`equipment-option${checked ? ' is-selected' : ''}`}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="equipment-option-code">{code}</span>
        {readyTooltip && <RosterReadyBadge tooltip={readyTooltip} />}
      </label>
    </li>
  );
}
