// Core domain types for the electronics planner.
//
// A Project contains ComponentInstances (placed on a canvas) connected by
// CircuitEdges. Each ComponentInstance references a ComponentDef that lives
// in the shared library (presets + user-created parts). Instances may
// override individual spec fields without touching the shared library entry.

export type Chemistry = 'liion' | 'lipo' | 'nimh' | 'nicd' | 'alkaline' | 'lifepo4' | 'other';

export type ComponentCategory = 'battery' | 'converter' | 'load' | 'other';

export type ConverterKind = 'buck' | 'boost' | 'buck-boost' | 'ldo' | 'other';

export interface BatterySpec {
  /** Nominal voltage of a single cell/pack unit, in volts. */
  nominalVoltage: number;
  /** Rated capacity of a single cell/pack unit, in mAh. */
  capacityMah: number;
  chemistry: Chemistry;
  /** Cells wired in series (multiplies voltage). */
  seriesCount: number;
  /** Cells/packs wired in parallel (multiplies capacity). */
  parallelCount: number;
  /**
   * Fraction (0-1) of rated capacity considered usable before the pack is
   * "empty" for practical purposes (real cells sag and shouldn't be fully
   * discharged). Defaults applied per chemistry, editable.
   */
  usableFraction: number;
}

export interface ConverterSpec {
  kind: ConverterKind;
  inputVoltageMin: number;
  inputVoltageMax: number;
  /** Regulated output voltage in volts. */
  outputVoltage: number;
  maxOutputCurrentMa: number;
  /** 0-100 */
  efficiencyPercent: number;
}

export interface LoadSpec {
  voltageMin: number;
  voltageMax: number;
  activeCurrentMa: number;
  idleCurrentMa: number;
  /** 0-100, percentage of time spent drawing activeCurrentMa. */
  dutyCyclePercent: number;
}

export interface ComponentDef {
  id: string;
  name: string;
  category: ComponentCategory;
  /** Free-text descriptor, e.g. "Microcontroller board", "Temp sensor". */
  subtype?: string;
  notes?: string;
  battery?: BatterySpec;
  converter?: ConverterSpec;
  /** Used for category 'load', and optionally 'other' (extra current draw). */
  load?: LoadSpec;
  /** True for library entries seeded from the built-in preset set. */
  isPreset?: boolean;
  costUsd?: number;
}

export type SpecOverrides = Partial<Pick<ComponentDef, 'battery' | 'converter' | 'load'>>;

export interface ComponentInstance {
  instanceId: string;
  defId: string;
  /** Display label override, e.g. "Battery 1", "Main ESP32". */
  label?: string;
  position: { x: number; y: number };
  overrides?: SpecOverrides;
}

export type PowerHandle = 'power-in' | 'power-out' | 'ground' | 'signal';

export interface CircuitEdge {
  id: string;
  source: string;
  sourceHandle: PowerHandle;
  target: string;
  targetHandle: PowerHandle;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  components: ComponentInstance[];
  edges: CircuitEdge[];
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface AppData {
  schemaVersion: number;
  projects: Project[];
  library: ComponentDef[];
  theme: ThemePreference;
}
