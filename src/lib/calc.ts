// Power-budget calculation engine.
//
// Pure functions only — no React, no storage — so this can be unit tested
// in isolation. Given a project's component instances + edges (plus the
// library they reference), this works out:
//   - which components form independent circuits (connected subgraphs)
//   - for each circuit, the power path from battery -> converters -> loads
//   - total current draw and estimated runtime per battery
//   - correctness warnings (missing ground, voltage mismatches, etc.)
//
// Modeling notes (deliberate simplifications for a hobbyist tool, not a
// SPICE replacement):
//   - Each component instance exposes named handles: 'power-in',
//     'power-out', 'ground', 'signal'. Electrical direction is derived from
//     *which handle* an edge touches, not from React Flow's source/target.
//   - A node's 'power-in' handle may only be usefully fed by ONE upstream
//     edge; multiple parallel cells/packs should be modeled with a single
//     Battery component's series/parallel fields instead of wiring two
//     battery nodes together. If a user does wire two sources into one
//     input, we flag it and use the first (by edge id) deterministically.
//   - 'signal' edges (e.g. I2C/SPI/GPIO wires) are ignored for power calc.

import type { CircuitEdge, ComponentDef, Project } from '../types';
import { batteryPackCapacityMah, batteryPackVoltage, effectiveMaxDischargeCurrentMa, effectivePeakCurrentMa, instanceLabel, resolveComponentSpec } from './resolve';

export interface Warning {
  severity: 'warning' | 'error';
  message: string;
  instanceIds?: string[];
}

export interface NodeResult {
  instanceId: string;
  label: string;
  category: ComponentDef['category'];
  isPowered: boolean;
  /** Voltage domain this node is operating at, if powered. */
  domainVoltage?: number;
  /** This node's own duty-cycle-weighted average current draw (loads/other), mA. */
  ownCurrentMa: number;
  /** Total current this node pulls from its upstream parent, mA (includes downstream + own draw, and converter step-up in the parent's domain). */
  drawFromParentMa: number;
  /** Same as drawFromParentMa, but worst-case: everything downstream assumed to hit its peak current at once. */
  peakDrawFromParentMa: number;
  groundOk: boolean;
  /** True for a converter/battery whose rated output/discharge current is exceeded (by average or peak draw). */
  overloaded: boolean;
  parentInstanceId?: string;
}

export interface PowerBreakdownEntry {
  instanceId: string;
  label: string;
  category: ComponentDef['category'];
  /** For a converter this is its conversion loss only, not downstream draw. */
  powerMw: number;
}

export interface BatteryResult {
  instanceId: string;
  label: string;
  packVoltage: number;
  packCapacityMah: number;
  usableCapacityMah: number;
  /** Duty-cycle-weighted average current — what the runtime estimate is based on. */
  totalCurrentMa: number;
  /** Worst case: everything downstream assumed to hit its peak current at the same moment. Not used for runtime — only for the discharge-limit check. */
  peakCurrentMa: number;
  runtimeHours: number | null;
  /** Where this battery's power goes: each real load's draw + each converter's conversion loss. Sums to packVoltage * totalCurrentMa. */
  breakdown: PowerBreakdownEntry[];
}

export interface CircuitResult {
  circuitId: string;
  memberInstanceIds: string[];
  batteries: BatteryResult[];
  nodes: NodeResult[];
  warnings: Warning[];
}

export interface ProjectAnalysis {
  circuits: CircuitResult[];
  warnings: Warning[];
}

function dutyWeightedCurrentMa(load: { activeCurrentMa: number; idleCurrentMa: number; dutyCyclePercent: number }): number {
  const duty = Math.min(100, Math.max(0, load.dutyCyclePercent)) / 100;
  return load.activeCurrentMa * duty + load.idleCurrentMa * (1 - duty);
}

class UnionFind {
  private parent = new Map<string, string>();
  add(id: string) {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }
  find(id: string): string {
    const p = this.parent.get(id) ?? id;
    if (p === id) return id;
    const root = this.find(p);
    this.parent.set(id, root);
    return root;
  }
  union(a: string, b: string) {
    this.add(a);
    this.add(b);
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
  connected(a: string, b: string): boolean {
    if (!this.parent.has(a) || !this.parent.has(b)) return false;
    return this.find(a) === this.find(b);
  }
}

export function analyzeProject(project: Project, library: ComponentDef[]): ProjectAnalysis {
  const defById = new Map(library.map((d) => [d.id, d]));
  const specByInstance = new Map<string, ComponentDef>();
  for (const inst of project.components) {
    const def = defById.get(inst.defId);
    if (def) specByInstance.set(inst.instanceId, resolveComponentSpec(def, inst));
  }
  const instanceById = new Map(project.components.map((i) => [i.instanceId, i]));
  const labelOf = (id: string) => instanceLabel(specByInstance.get(id), instanceById.get(id)!);

  const globalWarnings: Warning[] = [];

  // ---- 1. Connectivity (all edges) -> circuits ----
  const uf = new UnionFind();
  for (const inst of project.components) uf.add(inst.instanceId);
  for (const edge of project.edges) uf.union(edge.source, edge.target);

  const groups = new Map<string, string[]>();
  for (const inst of project.components) {
    const root = uf.find(inst.instanceId);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(inst.instanceId);
  }

  // ---- 2. Ground connectivity (ground-role edges only) ----
  const groundUf = new UnionFind();
  for (const inst of project.components) groundUf.add(inst.instanceId);
  for (const edge of project.edges) {
    if (edge.sourceHandle === 'ground' && edge.targetHandle === 'ground') {
      groundUf.union(edge.source, edge.target);
    }
  }

  const circuits: CircuitResult[] = [];
  let circuitIndex = 0;

  for (const [, memberIds] of groups) {
    circuitIndex += 1;
    const circuitId = `circuit-${circuitIndex}`;
    const warnings: Warning[] = [];
    const memberSet = new Set(memberIds);

    if (memberIds.length === 1 && project.edges.every((e) => e.source !== memberIds[0] && e.target !== memberIds[0])) {
      warnings.push({
        severity: 'warning',
        message: `${labelOf(memberIds[0])} isn't connected to anything yet.`,
        instanceIds: memberIds,
      });
      circuits.push({ circuitId, memberInstanceIds: memberIds, batteries: [], nodes: [], warnings });
      continue;
    }

    // Directed power edges within this circuit: parent[target] = { source, edgeId }
    const parentOf = new Map<string, { source: string; edgeId: string }>();
    const childrenOf = new Map<string, string[]>();
    const powerEdgesSorted = project.edges
      .filter((e) => memberSet.has(e.source) && memberSet.has(e.target))
      .filter((e) => (e.sourceHandle === 'power-out' && e.targetHandle === 'power-in') || (e.sourceHandle === 'power-in' && e.targetHandle === 'power-out'))
      .sort((a, b) => a.id.localeCompare(b.id));

    for (const edge of powerEdgesSorted) {
      const from = edge.sourceHandle === 'power-out' ? edge.source : edge.target;
      const to = edge.sourceHandle === 'power-out' ? edge.target : edge.source;
      const existing = parentOf.get(to);
      if (existing && existing.source !== from) {
        warnings.push({
          severity: 'warning',
          message: `${labelOf(to)} has more than one power source feeding it (${labelOf(existing.source)} and ${labelOf(from)}). Only the first connection is used — model paralleled cells with one Battery's series/parallel fields instead.`,
          instanceIds: [to, existing.source, from],
        });
        continue;
      }
      if (!existing) {
        parentOf.set(to, { source: from, edgeId: edge.id });
        if (!childrenOf.has(from)) childrenOf.set(from, []);
        childrenOf.get(from)!.push(to);
      }
    }

    const batteryIds = memberIds.filter((id) => specByInstance.get(id)?.category === 'battery');
    if (batteryIds.length === 0) {
      warnings.push({ severity: 'error', message: 'This circuit has no battery or power source.' });
    }

    // ---- 3. Voltage domain propagation (top-down from each battery) ----
    // domainVoltage: the voltage this node presents downstream (its own rail —
    // pack voltage for a battery, output voltage for a converter, pass-through
    // for everything else). inputVoltage: the voltage actually feeding this
    // node from its parent — only differs from domainVoltage for converters,
    // and is what their Iin calculation needs.
    const domainVoltage = new Map<string, number>();
    const inputVoltage = new Map<string, number>();
    const poweredBy = new Map<string, string>(); // instanceId -> battery instanceId
    const visitOrder: string[] = [];

    for (const batteryId of batteryIds) {
      const spec = specByInstance.get(batteryId)!;
      const battery = spec.battery!;
      const vPack = batteryPackVoltage(battery.nominalVoltage, battery.seriesCount);
      const queue: string[] = [batteryId];
      domainVoltage.set(batteryId, vPack);
      poweredBy.set(batteryId, batteryId);
      while (queue.length) {
        const current = queue.shift()!;
        visitOrder.push(current);
        const vHere = domainVoltage.get(current)!;
        for (const childId of childrenOf.get(current) ?? []) {
          if (domainVoltage.has(childId)) continue; // already reached (shouldn't happen given single-parent constraint)
          const childSpec = specByInstance.get(childId);
          if (!childSpec) continue;
          let vOut = vHere;
          if (childSpec.category === 'converter' && childSpec.converter) {
            const conv = childSpec.converter;
            if (vHere < conv.inputVoltageMin || vHere > conv.inputVoltageMax) {
              warnings.push({
                severity: 'warning',
                message: `${labelOf(childId)} expects ${conv.inputVoltageMin}–${conv.inputVoltageMax}V in, but is fed ${vHere.toFixed(2)}V from ${labelOf(current)}.`,
                instanceIds: [childId, current],
              });
            }
            vOut = conv.outputVoltage;
          } else if (childSpec.category === 'load' && childSpec.load) {
            const load = childSpec.load;
            if (vHere < load.voltageMin || vHere > load.voltageMax) {
              warnings.push({
                severity: 'warning',
                message: `${labelOf(childId)} accepts ${load.voltageMin}–${load.voltageMax}V, but is fed ${vHere.toFixed(2)}V from ${labelOf(current)}.`,
                instanceIds: [childId, current],
              });
            }
          }
          domainVoltage.set(childId, vOut);
          inputVoltage.set(childId, vHere);
          poweredBy.set(childId, batteryId);
          queue.push(childId);
        }
      }
    }

    // ---- 4. Bottom-up current computation ----
    // Two parallel passes: "average" (duty-cycle-weighted — what the runtime
    // estimate uses) and "peak" (everything downstream assumed to hit its
    // worst-case current at the same instant — what the overload checks use).
    // A part can look perfectly fine on average and still brown out a
    // converter or sag a battery the moment something like a stepper motor
    // actually kicks in, so ratings are checked against the peak figure too.
    const ownCurrentCache = new Map<string, number>();
    const peakOwnCurrentCache = new Map<string, number>();
    const drawFromParentCache = new Map<string, number>();
    const peakDrawFromParentCache = new Map<string, number>();

    function ownCurrentMa(id: string): number {
      if (ownCurrentCache.has(id)) return ownCurrentCache.get(id)!;
      const spec = specByInstance.get(id);
      let value = 0;
      if ((spec?.category === 'load' || spec?.category === 'other') && spec.load) value = dutyWeightedCurrentMa(spec.load);
      ownCurrentCache.set(id, value);
      return value;
    }

    function peakOwnCurrentMa(id: string): number {
      if (peakOwnCurrentCache.has(id)) return peakOwnCurrentCache.get(id)!;
      const spec = specByInstance.get(id);
      let value = 0;
      if ((spec?.category === 'load' || spec?.category === 'other') && spec.load) value = effectivePeakCurrentMa(spec.load);
      peakOwnCurrentCache.set(id, value);
      return value;
    }

    function converterInputCurrent(id: string, outputCurrent: number): number {
      const spec = specByInstance.get(id)!;
      const conv = spec.converter!;
      const vIn = inputVoltage.get(id) ?? conv.inputVoltageMin;
      const pOut = conv.outputVoltage * outputCurrent;
      const eff = Math.max(0.01, conv.efficiencyPercent / 100);
      const pIn = pOut / eff;
      return vIn > 0 ? pIn / vIn : 0;
    }

    function drawFromParent(id: string): number {
      if (drawFromParentCache.has(id)) return drawFromParentCache.get(id)!;
      const spec = specByInstance.get(id);
      const kids = childrenOf.get(id) ?? [];
      const downstream = kids.reduce((sum, kid) => sum + drawFromParent(kid), 0);
      const result = spec?.category === 'converter' && spec.converter ? converterInputCurrent(id, downstream) : ownCurrentMa(id) + downstream;
      drawFromParentCache.set(id, result);
      return result;
    }

    function peakDrawFromParent(id: string): number {
      if (peakDrawFromParentCache.has(id)) return peakDrawFromParentCache.get(id)!;
      const spec = specByInstance.get(id);
      const kids = childrenOf.get(id) ?? [];
      const downstream = kids.reduce((sum, kid) => sum + peakDrawFromParent(kid), 0);
      const result = spec?.category === 'converter' && spec.converter ? converterInputCurrent(id, downstream) : peakOwnCurrentMa(id) + downstream;
      peakDrawFromParentCache.set(id, result);
      return result;
    }

    // ---- 5. Overload checks (converter/battery ratings vs average + peak draw) ----
    const overloadedIds = new Set<string>();

    for (const id of memberIds) {
      const spec = specByInstance.get(id);
      if (!spec?.converter || !domainVoltage.has(id)) continue;
      const rated = spec.converter.maxOutputCurrentMa;
      if (!(rated > 0)) continue;
      const kids = childrenOf.get(id) ?? [];
      const avgOut = kids.reduce((sum, kid) => sum + drawFromParent(kid), 0);
      const peakOut = kids.reduce((sum, kid) => sum + peakDrawFromParent(kid), 0);
      if (avgOut > rated) {
        overloadedIds.add(id);
        warnings.push({
          severity: 'warning',
          message: `${labelOf(id)}'s average draw of ${avgOut.toFixed(0)}mA exceeds its ${rated}mA rating — expect overheating, brownout, or shutdown under sustained use.`,
          instanceIds: [id],
        });
      } else if (peakOut > rated) {
        overloadedIds.add(id);
        warnings.push({
          severity: 'warning',
          message: `${labelOf(id)} looks fine on average (${avgOut.toFixed(0)}mA) but peak draw under load could reach ${peakOut.toFixed(0)}mA — above its ${rated}mA rating. That's enough to brown out or reset everything on this rail when it kicks in.`,
          instanceIds: [id],
        });
      }
    }

    for (const batteryId of batteryIds) {
      const battery = specByInstance.get(batteryId)?.battery;
      if (!battery) continue;
      const maxDischarge = effectiveMaxDischargeCurrentMa(battery);
      if (!(maxDischarge > 0)) continue;
      const kids = childrenOf.get(batteryId) ?? [];
      const avgOut = kids.reduce((sum, kid) => sum + drawFromParent(kid), 0);
      const peakOut = kids.reduce((sum, kid) => sum + peakDrawFromParent(kid), 0);
      if (avgOut > maxDischarge) {
        overloadedIds.add(batteryId);
        warnings.push({
          severity: 'warning',
          message: `${labelOf(batteryId)}'s average draw of ${avgOut.toFixed(0)}mA exceeds its ${maxDischarge}mA max discharge rating — expect voltage sag, shutdown, or cell damage under sustained use.`,
          instanceIds: [batteryId],
        });
      } else if (peakOut > maxDischarge) {
        overloadedIds.add(batteryId);
        warnings.push({
          severity: 'warning',
          message: `${labelOf(batteryId)} looks fine on average (${avgOut.toFixed(0)}mA) but peak draw under load could reach ${peakOut.toFixed(0)}mA — above its ${maxDischarge}mA max discharge rating. Expect the voltage to sag hard (or the pack to cut out) the moment everything kicks in at once.`,
          instanceIds: [batteryId],
        });
      }
    }

    // ---- 6. Ground check ----
    function checkGround(id: string, batteryId: string): boolean {
      const spec = specByInstance.get(id);
      if (!spec || spec.category === 'other') return true; // pass-through/no explicit ground pin requirement
      return groundUf.connected(id, batteryId);
    }

    const nodes: NodeResult[] = memberIds.map((id) => {
      const spec = specByInstance.get(id);
      const isPowered = domainVoltage.has(id);
      const batteryId = poweredBy.get(id);
      const groundOk = spec?.category === 'battery' ? true : isPowered && batteryId ? checkGround(id, batteryId) : true;
      if (isPowered && batteryId && spec?.category !== 'battery' && !groundOk) {
        warnings.push({
          severity: 'warning',
          message: `${labelOf(id)} has no ground return path back to ${labelOf(batteryId)} — the circuit is incomplete.`,
          instanceIds: [id, batteryId],
        });
      }
      const spec2 = spec;
      const needsPower = spec2 && (spec2.category === 'load' || spec2.category === 'converter');
      if (needsPower && !isPowered) {
        warnings.push({
          severity: 'warning',
          message: `${labelOf(id)} isn't connected to a power source.`,
          instanceIds: [id],
        });
      }
      return {
        instanceId: id,
        label: labelOf(id),
        category: spec?.category ?? 'other',
        isPowered,
        domainVoltage: domainVoltage.get(id),
        ownCurrentMa: ownCurrentMa(id),
        drawFromParentMa: isPowered && spec?.category !== 'battery' ? drawFromParent(id) : 0,
        peakDrawFromParentMa: isPowered && spec?.category !== 'battery' ? peakDrawFromParent(id) : 0,
        groundOk,
        overloaded: overloadedIds.has(id),
        parentInstanceId: parentOf.get(id)?.source,
      };
    });

    function collectBreakdown(id: string, acc: PowerBreakdownEntry[]) {
      const spec = specByInstance.get(id);
      const kids = childrenOf.get(id) ?? [];
      if (spec?.category === 'converter' && spec.converter) {
        const outputCurrent = kids.reduce((sum, kid) => sum + drawFromParent(kid), 0);
        const pOut = spec.converter.outputVoltage * outputCurrent;
        const pIn = drawFromParent(id) * (inputVoltage.get(id) ?? 0);
        const loss = Math.max(0, pIn - pOut);
        if (loss > 0) acc.push({ instanceId: id, label: labelOf(id), category: 'converter', powerMw: loss });
      } else {
        const own = ownCurrentMa(id);
        if (own > 0) acc.push({ instanceId: id, label: labelOf(id), category: spec?.category ?? 'other', powerMw: own * (domainVoltage.get(id) ?? 0) });
      }
      for (const k of kids) collectBreakdown(k, acc);
    }

    const batteries: BatteryResult[] = batteryIds.map((id) => {
      const spec = specByInstance.get(id)!.battery!;
      const packVoltage = batteryPackVoltage(spec.nominalVoltage, spec.seriesCount);
      const packCapacityMah = batteryPackCapacityMah(spec.capacityMah, spec.parallelCount);
      const usableCapacityMah = packCapacityMah * Math.min(1, Math.max(0, spec.usableFraction));
      const kids = childrenOf.get(id) ?? [];
      const totalCurrentMa = kids.reduce((sum, kid) => sum + drawFromParent(kid), 0);
      const peakCurrentMa = kids.reduce((sum, kid) => sum + peakDrawFromParent(kid), 0);
      const runtimeHours = totalCurrentMa > 0 ? usableCapacityMah / totalCurrentMa : null;
      const breakdown: PowerBreakdownEntry[] = [];
      for (const kid of kids) collectBreakdown(kid, breakdown);
      return {
        instanceId: id,
        label: labelOf(id),
        packVoltage,
        packCapacityMah,
        usableCapacityMah,
        totalCurrentMa,
        peakCurrentMa,
        runtimeHours,
        breakdown,
      };
    });

    circuits.push({ circuitId, memberInstanceIds: memberIds, batteries, nodes, warnings });
    globalWarnings.push(...warnings);
  }

  return { circuits, warnings: globalWarnings };
}

/** Convenience: is this a valid connection for the graph editor to allow? */
export function isValidPowerHandlePair(a: CircuitEdge['sourceHandle'], b: CircuitEdge['targetHandle']): boolean {
  const pairs = new Set(['power-out|power-in', 'power-in|power-out', 'ground|ground', 'signal|signal']);
  return pairs.has(`${a}|${b}`);
}
