import type { BatterySpec, Chemistry, ComponentCategory, ComponentDef, ConverterSpec, LoadSpec } from '../types';

/** Reasonable "before you know better" usable-capacity fraction per chemistry. */
export const USABLE_FRACTION_BY_CHEMISTRY: Record<Chemistry, number> = {
  liion: 0.85,
  lipo: 0.85,
  lifepo4: 0.9,
  nimh: 0.9,
  nicd: 0.9,
  alkaline: 0.7,
  other: 0.8,
};

export function defaultBatterySpec(chemistry: Chemistry = 'liion'): BatterySpec {
  return {
    nominalVoltage: 3.7,
    capacityMah: 2000,
    chemistry,
    seriesCount: 1,
    parallelCount: 1,
    usableFraction: USABLE_FRACTION_BY_CHEMISTRY[chemistry],
  };
}

export function defaultConverterSpec(): ConverterSpec {
  return {
    kind: 'buck',
    inputVoltageMin: 4.5,
    inputVoltageMax: 12,
    outputVoltage: 5,
    maxOutputCurrentMa: 1000,
    efficiencyPercent: 90,
  };
}

export function defaultLoadSpec(): LoadSpec {
  return {
    voltageMin: 3,
    voltageMax: 5.5,
    activeCurrentMa: 50,
    idleCurrentMa: 5,
    dutyCyclePercent: 100,
  };
}

export function newComponentDef(category: ComponentCategory, name = 'New part'): ComponentDef {
  const base: ComponentDef = { id: crypto.randomUUID(), name, category };
  if (category === 'battery') base.battery = defaultBatterySpec();
  if (category === 'converter') base.converter = defaultConverterSpec();
  if (category === 'load') base.load = defaultLoadSpec();
  return base;
}
