import { describe, expect, it } from 'vitest';
import { analyzeProject, isValidPowerHandlePair } from './calc';
import { defaultBatterySpec, defaultConverterSpec, defaultLoadSpec } from './defaults';
import type { ComponentDef, ComponentInstance, Project } from '../types';

function battery(id: string, overrides: Partial<ReturnType<typeof defaultBatterySpec>> = {}): ComponentDef {
  return { id, name: id, category: 'battery', battery: { ...defaultBatterySpec(), ...overrides } };
}
function converter(id: string, overrides: Partial<ReturnType<typeof defaultConverterSpec>> = {}): ComponentDef {
  return { id, name: id, category: 'converter', converter: { ...defaultConverterSpec(), ...overrides } };
}
function load(id: string, overrides: Partial<ReturnType<typeof defaultLoadSpec>> = {}): ComponentDef {
  return { id, name: id, category: 'load', load: { ...defaultLoadSpec(), ...overrides } };
}
function other(id: string): ComponentDef {
  return { id, name: id, category: 'other' };
}

function inst(instanceId: string, defId: string): ComponentInstance {
  return { instanceId, defId, position: { x: 0, y: 0 } };
}

function edge(id: string, source: string, sourceHandle: 'power-out' | 'power-in' | 'ground' | 'signal', target: string, targetHandle: 'power-out' | 'power-in' | 'ground' | 'signal') {
  return { id, source, sourceHandle, target, targetHandle };
}

function makeProject(components: ComponentInstance[], edges: ReturnType<typeof edge>[]): Project {
  return { id: 'p1', name: 'Test project', createdAt: '', updatedAt: '', components, edges };
}

describe('analyzeProject', () => {
  it('computes duty-cycle-weighted current for a load wired directly to a battery', () => {
    const library = [battery('bat'), load('ld', { activeCurrentMa: 100, idleCurrentMa: 10, dutyCyclePercent: 50, voltageMin: 3, voltageMax: 4 })];
    const project = makeProject(
      [inst('b1', 'bat'), inst('l1', 'ld')],
      [edge('e1', 'b1', 'power-out', 'l1', 'power-in'), edge('e2', 'b1', 'ground', 'l1', 'ground')],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits).toHaveLength(1);
    const battery0 = circuits[0].batteries[0];
    expect(battery0.totalCurrentMa).toBeCloseTo(55, 5); // 100*0.5 + 10*0.5
    const expectedUsable = 2000 * 0.85; // default liion usable fraction
    expect(battery0.usableCapacityMah).toBeCloseTo(expectedUsable, 5);
    expect(battery0.runtimeHours).toBeCloseTo(expectedUsable / 55, 5);
    expect(circuits[0].warnings.filter((w) => w.severity === 'error')).toHaveLength(0);
  });

  it('applies converter efficiency and voltage step-down when computing upstream current', () => {
    const library = [
      battery('bat', { nominalVoltage: 5, capacityMah: 1000, seriesCount: 1, parallelCount: 1, usableFraction: 1 }),
      converter('conv', { inputVoltageMin: 4.5, inputVoltageMax: 12, outputVoltage: 3.3, efficiencyPercent: 80, maxOutputCurrentMa: 500 }),
      load('ld', { activeCurrentMa: 100, idleCurrentMa: 100, dutyCyclePercent: 100, voltageMin: 3, voltageMax: 3.6 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('c1', 'conv'), inst('l1', 'ld')],
      [
        edge('e1', 'b1', 'power-out', 'c1', 'power-in'),
        edge('e2', 'c1', 'power-out', 'l1', 'power-in'),
        edge('e3', 'b1', 'ground', 'c1', 'ground'),
        edge('e4', 'c1', 'ground', 'l1', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    const battery0 = circuits[0].batteries[0];
    // Pout = 3.3V * 100mA = 330mW; Pin = 330/0.8 = 412.5mW; Iin = 412.5/5V = 82.5mA
    expect(battery0.totalCurrentMa).toBeCloseTo(82.5, 5);
    expect(battery0.runtimeHours).toBeCloseTo(1000 / 82.5, 5);
    // Breakdown: one load entry (330mW) + one converter loss entry (82.5mW)
    const loadEntry = battery0.breakdown.find((b) => b.instanceId === 'l1');
    const convEntry = battery0.breakdown.find((b) => b.instanceId === 'c1');
    expect(loadEntry?.powerMw).toBeCloseTo(330, 5);
    expect(convEntry?.powerMw).toBeCloseTo(82.5, 5);
  });

  it('sums current from multiple loads fanned out off one converter', () => {
    const library = [
      battery('bat', { nominalVoltage: 5, capacityMah: 1000, usableFraction: 1 }),
      converter('conv', { outputVoltage: 5, efficiencyPercent: 100, inputVoltageMin: 1, inputVoltageMax: 12 }),
      load('ld', { activeCurrentMa: 50, idleCurrentMa: 50, dutyCyclePercent: 100, voltageMin: 4, voltageMax: 5.5 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('c1', 'conv'), inst('l1', 'ld'), inst('l2', 'ld')],
      [
        edge('e1', 'b1', 'power-out', 'c1', 'power-in'),
        edge('e2', 'c1', 'power-out', 'l1', 'power-in'),
        edge('e3', 'c1', 'power-out', 'l2', 'power-in'),
        edge('g1', 'b1', 'ground', 'c1', 'ground'),
        edge('g2', 'c1', 'ground', 'l1', 'ground'),
        edge('g3', 'c1', 'ground', 'l2', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].batteries[0].totalCurrentMa).toBeCloseTo(100, 5); // 2x 50mA, 100% efficient conversion
  });

  it('flags a load whose voltage range does not cover the supplied domain voltage', () => {
    const library = [battery('bat', { nominalVoltage: 9 }), load('ld', { voltageMin: 3, voltageMax: 5.5 })];
    const project = makeProject(
      [inst('b1', 'bat'), inst('l1', 'ld')],
      [edge('e1', 'b1', 'power-out', 'l1', 'power-in'), edge('e2', 'b1', 'ground', 'l1', 'ground')],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].warnings.some((w) => w.message.includes('accepts'))).toBe(true);
  });

  it('flags a missing ground return path', () => {
    const library = [battery('bat'), load('ld')];
    const project = makeProject([inst('b1', 'bat'), inst('l1', 'ld')], [edge('e1', 'b1', 'power-out', 'l1', 'power-in')]);
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].warnings.some((w) => w.message.includes('ground'))).toBe(true);
  });

  it('flags a circuit with no battery', () => {
    const library = [converter('conv'), load('ld')];
    const project = makeProject(
      [inst('c1', 'conv'), inst('l1', 'ld')],
      [edge('e1', 'c1', 'power-out', 'l1', 'power-in'), edge('e2', 'c1', 'ground', 'l1', 'ground')],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].warnings.some((w) => w.severity === 'error' && w.message.includes('no battery'))).toBe(true);
  });

  it('treats an unconnected component as its own circuit with a warning', () => {
    const library = [load('ld')];
    const project = makeProject([inst('l1', 'ld')], []);
    const { circuits } = analyzeProject(project, library);
    expect(circuits).toHaveLength(1);
    expect(circuits[0].warnings[0].message).toContain("isn't connected");
  });

  it('keeps two circuits independent when a project has multiple disconnected sub-circuits', () => {
    const library = [battery('bat'), load('ld', { activeCurrentMa: 20, idleCurrentMa: 20, dutyCyclePercent: 100, voltageMin: 0, voltageMax: 10 })];
    const project = makeProject(
      [inst('b1', 'bat'), inst('l1', 'ld'), inst('b2', 'bat'), inst('l2', 'ld')],
      [
        edge('e1', 'b1', 'power-out', 'l1', 'power-in'),
        edge('g1', 'b1', 'ground', 'l1', 'ground'),
        edge('e2', 'b2', 'power-out', 'l2', 'power-in'),
        edge('g2', 'b2', 'ground', 'l2', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits).toHaveLength(2);
    for (const c of circuits) {
      expect(c.batteries[0].totalCurrentMa).toBeCloseTo(20, 5);
    }
  });

  it('warns and keeps only the first edge when two sources feed one power-in', () => {
    const library = [battery('bat'), other('junction')];
    const project = makeProject(
      [inst('b1', 'bat'), inst('b2', 'bat'), inst('j1', 'junction')],
      [edge('e1', 'b1', 'power-out', 'j1', 'power-in'), edge('e2', 'b2', 'power-out', 'j1', 'power-in')],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].warnings.some((w) => w.message.includes('more than one power source'))).toBe(true);
  });

  it('lets an "other" pass-through node carry both power and its own extra draw', () => {
    const library: ComponentDef[] = [
      battery('bat', { nominalVoltage: 5, capacityMah: 1000, usableFraction: 1 }),
      { id: 'sw', name: 'switch-with-led', category: 'other', load: { voltageMin: 0, voltageMax: 10, activeCurrentMa: 5, idleCurrentMa: 5, peakCurrentMa: 5, dutyCyclePercent: 100 } },
      load('ld', { activeCurrentMa: 20, idleCurrentMa: 20, dutyCyclePercent: 100, voltageMin: 0, voltageMax: 10 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('s1', 'sw'), inst('l1', 'ld')],
      [
        edge('e1', 'b1', 'power-out', 's1', 'power-in'),
        edge('e2', 's1', 'power-out', 'l1', 'power-in'),
        edge('g1', 'b1', 'ground', 's1', 'ground'),
        edge('g2', 's1', 'ground', 'l1', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].batteries[0].totalCurrentMa).toBeCloseTo(25, 5); // 5mA (switch LED) + 20mA (load), passed straight through
  });

  it('flags a converter that is fine on average but overloaded at peak (stepper-like low-duty spike)', () => {
    // A stepper-ish load: low duty cycle keeps the average current modest, but
    // the peak (stall/high-torque) current alone exceeds the converter's rating.
    const library = [
      battery('bat', { nominalVoltage: 12, capacityMah: 2000, usableFraction: 1 }),
      converter('conv', { inputVoltageMin: 6, inputVoltageMax: 24, outputVoltage: 12, efficiencyPercent: 100, maxOutputCurrentMa: 500 }),
      load('stepper', { idleCurrentMa: 10, activeCurrentMa: 100, peakCurrentMa: 800, dutyCyclePercent: 10, voltageMin: 8, voltageMax: 24 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('c1', 'conv'), inst('m1', 'stepper')],
      [
        edge('e1', 'b1', 'power-out', 'c1', 'power-in'),
        edge('e2', 'c1', 'power-out', 'm1', 'power-in'),
        edge('g1', 'b1', 'ground', 'c1', 'ground'),
        edge('g2', 'c1', 'ground', 'm1', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    const battery0 = circuits[0].batteries[0];
    // Average: 100*0.1 + 10*0.9 = 19mA — comfortably under the 500mA converter rating.
    expect(battery0.totalCurrentMa).toBeCloseTo(19, 5);
    // Peak: 800mA — well over the 500mA converter rating, even though the average looked fine.
    expect(battery0.peakCurrentMa).toBeCloseTo(800, 5);
    expect(
      circuits[0].warnings.some((w) => w.message.includes('fine on average') && w.message.includes('peak draw under load')),
    ).toBe(true);
    const converterNode = circuits[0].nodes.find((n) => n.instanceId === 'c1');
    expect(converterNode?.overloaded).toBe(true);
  });

  it('flags a converter whose average draw alone already exceeds its rating (sustained overload)', () => {
    const library = [
      battery('bat', { nominalVoltage: 12, capacityMah: 2000, usableFraction: 1 }),
      converter('conv', { inputVoltageMin: 6, inputVoltageMax: 24, outputVoltage: 12, efficiencyPercent: 100, maxOutputCurrentMa: 100 }),
      load('ld', { idleCurrentMa: 200, activeCurrentMa: 200, peakCurrentMa: 200, dutyCyclePercent: 100, voltageMin: 8, voltageMax: 24 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('c1', 'conv'), inst('l1', 'ld')],
      [
        edge('e1', 'b1', 'power-out', 'c1', 'power-in'),
        edge('e2', 'c1', 'power-out', 'l1', 'power-in'),
        edge('g1', 'b1', 'ground', 'c1', 'ground'),
        edge('g2', 'c1', 'ground', 'l1', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].warnings.some((w) => w.message.includes("average draw") && w.message.includes('exceeds its 100mA rating'))).toBe(true);
  });

  it('flags a battery whose peak draw exceeds its max discharge rating even though average is fine', () => {
    const library = [
      battery('bat', { nominalVoltage: 9, capacityMah: 550, usableFraction: 1, maxDischargeCurrentMa: 400 }),
      load('servo', { idleCurrentMa: 10, activeCurrentMa: 100, peakCurrentMa: 650, dutyCyclePercent: 20, voltageMin: 4.8, voltageMax: 9 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('s1', 'servo')],
      [edge('e1', 'b1', 'power-out', 's1', 'power-in'), edge('g1', 'b1', 'ground', 's1', 'ground')],
    );
    const { circuits } = analyzeProject(project, library);
    const battery0 = circuits[0].batteries[0];
    expect(battery0.totalCurrentMa).toBeCloseTo(28, 5); // 100*0.2 + 10*0.8
    expect(battery0.peakCurrentMa).toBeCloseTo(650, 5);
    expect(
      circuits[0].warnings.some((w) => w.message.includes('max discharge rating') && w.message.includes('fine on average')),
    ).toBe(true);
    const batteryNode = circuits[0].nodes.find((n) => n.instanceId === 'b1');
    expect(batteryNode?.overloaded).toBe(true);
  });

  it('skips the overload check when maxOutputCurrentMa/maxDischargeCurrentMa is left at 0 (unspecified)', () => {
    const library = [
      battery('bat', { nominalVoltage: 5, capacityMah: 1000, usableFraction: 1, maxDischargeCurrentMa: 0 }),
      converter('conv', { inputVoltageMin: 4, inputVoltageMax: 12, outputVoltage: 5, efficiencyPercent: 100, maxOutputCurrentMa: 0 }),
      load('ld', { idleCurrentMa: 5000, activeCurrentMa: 5000, peakCurrentMa: 5000, dutyCyclePercent: 100, voltageMin: 0, voltageMax: 10 }),
    ];
    const project = makeProject(
      [inst('b1', 'bat'), inst('c1', 'conv'), inst('l1', 'ld')],
      [
        edge('e1', 'b1', 'power-out', 'c1', 'power-in'),
        edge('e2', 'c1', 'power-out', 'l1', 'power-in'),
        edge('g1', 'b1', 'ground', 'c1', 'ground'),
        edge('g2', 'c1', 'ground', 'l1', 'ground'),
      ],
    );
    const { circuits } = analyzeProject(project, library);
    expect(circuits[0].warnings.some((w) => w.message.includes('rating') || w.message.includes('overload'))).toBe(false);
    expect(circuits[0].nodes.every((n) => !n.overloaded)).toBe(true);
  });
});

describe('isValidPowerHandlePair', () => {
  it('allows matching power/ground/signal pairs', () => {
    expect(isValidPowerHandlePair('power-out', 'power-in')).toBe(true);
    expect(isValidPowerHandlePair('power-in', 'power-out')).toBe(true);
    expect(isValidPowerHandlePair('ground', 'ground')).toBe(true);
    expect(isValidPowerHandlePair('signal', 'signal')).toBe(true);
  });

  it('rejects mismatched pairs', () => {
    expect(isValidPowerHandlePair('power-out', 'ground')).toBe(false);
    expect(isValidPowerHandlePair('power-out', 'power-out')).toBe(false);
    expect(isValidPowerHandlePair('signal', 'ground')).toBe(false);
  });
});
