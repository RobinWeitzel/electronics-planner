import type { ComponentDef, ComponentInstance } from '../types';

/** Merge a library ComponentDef with an instance's per-instance overrides. */
export function resolveComponentSpec(def: ComponentDef, instance: ComponentInstance): ComponentDef {
  if (!instance.overrides) return def;
  return {
    ...def,
    battery: instance.overrides.battery ? { ...def.battery, ...instance.overrides.battery } : def.battery,
    converter: instance.overrides.converter ? { ...def.converter, ...instance.overrides.converter } : def.converter,
    load: instance.overrides.load ? { ...def.load, ...instance.overrides.load } : def.load,
  } as ComponentDef;
}

export function instanceLabel(def: ComponentDef | undefined, instance: ComponentInstance): string {
  return instance.label?.trim() || def?.name || 'Unknown part';
}

/** Short one-line human summary of a resolved component's key specs. */
export function summarizeSpec(spec: ComponentDef): string {
  if (spec.category === 'battery' && spec.battery) {
    const b = spec.battery;
    return `${batteryPackVoltage(b.nominalVoltage, b.seriesCount).toFixed(2)}V · ${batteryPackCapacityMah(b.capacityMah, b.parallelCount).toFixed(0)}mAh · ${b.chemistry}`;
  }
  if (spec.category === 'converter' && spec.converter) {
    const c = spec.converter;
    return `${c.kind} · ${c.inputVoltageMin}–${c.inputVoltageMax}V in → ${c.outputVoltage}V out · ${c.efficiencyPercent}% eff.`;
  }
  if (spec.load) {
    const l = spec.load;
    return `${l.voltageMin}–${l.voltageMax}V · ${l.activeCurrentMa}mA active / ${l.idleCurrentMa}mA idle @ ${l.dutyCyclePercent}%`;
  }
  return 'Pass-through, no power draw';
}

/** Effective pack voltage accounting for series-connected cells. */
export function batteryPackVoltage(nominalVoltage: number, seriesCount: number): number {
  return nominalVoltage * Math.max(1, seriesCount);
}

/** Effective pack capacity accounting for parallel-connected cells. */
export function batteryPackCapacityMah(capacityMah: number, parallelCount: number): number {
  return capacityMah * Math.max(1, parallelCount);
}
