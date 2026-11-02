interface ComputedFieldProps {
  label: string;
  displayValue: string;
  highlight?: boolean;
  variant?: 'calculated' | 'inherited';
}

export function ComputedField({ label, displayValue, highlight, variant = 'calculated' }: ComputedFieldProps) {
  const inherited = variant === 'inherited';
  return (
    <div className="form-field computed-field">
      <span className="field-label">
        <span className="field-label-text">{label}</span>
        {!inherited && <span className="field-tag">Calculado</span>}
      </span>
      <div
        className={`computed-input${inherited ? ' inherited' : ''}${highlight ? ' highlight' : ''}`}
        aria-readonly="true"
        role="textbox"
        aria-label={label}
        title={displayValue}
      >
        {displayValue}
      </div>
    </div>
  );
}
