import { defaultLoadSpec } from '../lib/defaults';
import type { BatterySpec, Chemistry, ComponentCategory, ConverterKind, ConverterSpec, LoadSpec } from '../types';
import NumberField from './NumberField';

const CHEMISTRIES: Chemistry[] = ['liion', 'lipo', 'lifepo4', 'nimh', 'nicd', 'alkaline', 'other'];
const CONVERTER_KINDS: ConverterKind[] = ['buck', 'boost', 'buck-boost', 'ldo', 'other'];

interface Props {
  category: ComponentCategory;
  battery?: BatterySpec;
  converter?: ConverterSpec;
  load?: LoadSpec;
  onChangeBattery?: (b: BatterySpec) => void;
  onChangeConverter?: (c: ConverterSpec) => void;
  onChangeLoad?: (l: LoadSpec | undefined) => void;
  /** Show the load fields as an optional toggle (used for category 'other'). */
  loadOptional?: boolean;
}

export default function ComponentSpecFields({ category, battery, converter, load, onChangeBattery, onChangeConverter, onChangeLoad, loadOptional }: Props) {
  return (
    <div className="spec-fields">
      {category === 'battery' && battery && onChangeBattery && (
        <>
          <div className="field-grid">
            <NumberField label="Nominal voltage" value={battery.nominalVoltage} suffix="V" onChange={(v) => onChangeBattery({ ...battery, nominalVoltage: v })} />
            <NumberField label="Capacity" value={battery.capacityMah} suffix="mAh" onChange={(v) => onChangeBattery({ ...battery, capacityMah: v })} />
            <label className="field">
              <span className="field-label">Chemistry</span>
              <select value={battery.chemistry} onChange={(e) => onChangeBattery({ ...battery, chemistry: e.target.value as Chemistry })}>
                {CHEMISTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <NumberField label="Series count" value={battery.seriesCount} min={1} step={1} onChange={(v) => onChangeBattery({ ...battery, seriesCount: Math.max(1, Math.round(v)) })} hint="Cells wired in series (multiplies voltage)" />
            <NumberField label="Parallel count" value={battery.parallelCount} min={1} step={1} onChange={(v) => onChangeBattery({ ...battery, parallelCount: Math.max(1, Math.round(v)) })} hint="Cells wired in parallel (multiplies capacity)" />
            <NumberField label="Usable fraction" value={battery.usableFraction} min={0} max={1} step={0.05} onChange={(v) => onChangeBattery({ ...battery, usableFraction: v })} hint="Fraction of rated capacity treated as usable (0-1)" />
          </div>
          <p className="computed-line">
            Pack: {(battery.nominalVoltage * Math.max(1, battery.seriesCount)).toFixed(2)}V, {(battery.capacityMah * Math.max(1, battery.parallelCount)).toFixed(0)}mAh rated
          </p>
        </>
      )}

      {category === 'converter' && converter && onChangeConverter && (
        <div className="field-grid">
          <label className="field">
            <span className="field-label">Kind</span>
            <select value={converter.kind} onChange={(e) => onChangeConverter({ ...converter, kind: e.target.value as ConverterKind })}>
              {CONVERTER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <NumberField label="Input voltage min" value={converter.inputVoltageMin} suffix="V" onChange={(v) => onChangeConverter({ ...converter, inputVoltageMin: v })} />
          <NumberField label="Input voltage max" value={converter.inputVoltageMax} suffix="V" onChange={(v) => onChangeConverter({ ...converter, inputVoltageMax: v })} />
          <NumberField label="Output voltage" value={converter.outputVoltage} suffix="V" onChange={(v) => onChangeConverter({ ...converter, outputVoltage: v })} />
          <NumberField label="Max output current" value={converter.maxOutputCurrentMa} suffix="mA" onChange={(v) => onChangeConverter({ ...converter, maxOutputCurrentMa: v })} />
          <NumberField label="Efficiency" value={converter.efficiencyPercent} min={1} max={100} suffix="%" onChange={(v) => onChangeConverter({ ...converter, efficiencyPercent: v })} />
        </div>
      )}

      {category === 'load' && load && onChangeLoad && <LoadFields load={load} onChange={onChangeLoad as (l: LoadSpec) => void} />}

      {category === 'other' && loadOptional && onChangeLoad && (
        <div className="optional-load-block">
          <label className="checkbox-field">
            <input type="checkbox" checked={!!load} onChange={(e) => onChangeLoad(e.target.checked ? defaultLoadSpec() : undefined)} />
            This part also draws its own current
          </label>
          {load && <LoadFields load={load} onChange={onChangeLoad as (l: LoadSpec) => void} />}
        </div>
      )}
    </div>
  );
}

function LoadFields({ load, onChange }: { load: LoadSpec; onChange: (l: LoadSpec) => void }) {
  return (
    <div className="field-grid">
      <NumberField label="Voltage min" value={load.voltageMin} suffix="V" onChange={(v) => onChange({ ...load, voltageMin: v })} />
      <NumberField label="Voltage max" value={load.voltageMax} suffix="V" onChange={(v) => onChange({ ...load, voltageMax: v })} />
      <NumberField label="Active current" value={load.activeCurrentMa} suffix="mA" onChange={(v) => onChange({ ...load, activeCurrentMa: v })} />
      <NumberField label="Idle current" value={load.idleCurrentMa} suffix="mA" onChange={(v) => onChange({ ...load, idleCurrentMa: v })} />
      <NumberField label="Time active" value={load.dutyCyclePercent} min={0} max={100} suffix="%" onChange={(v) => onChange({ ...load, dutyCyclePercent: v })} hint="% of time spent at the active current; rest of the time uses idle current" />
    </div>
  );
}
