interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  hint?: string;
}

export default function NumberField({ label, value, onChange, min, max, step = 'any' as unknown as number, suffix, hint }: Props) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="field-input-row">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const v = e.target.valueAsNumber;
            onChange(Number.isNaN(v) ? 0 : v);
          }}
        />
        {suffix && <span className="field-suffix">{suffix}</span>}
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
