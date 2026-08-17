import { useMemo } from 'react';
import PowerBreakdownChart from '../../components/PowerBreakdownChart';
import { analyzeProject, type CircuitResult } from '../../lib/calc';
import { formatCurrentMa, formatRuntime, formatVoltage } from '../../lib/format';
import { useAppStore } from '../../store/useAppStore';
import type { Project } from '../../types';

function circuitTitle(circuit: CircuitResult, index: number): string {
  if (circuit.batteries.length === 1) return `Circuit ${index + 1} — powered by ${circuit.batteries[0].label}`;
  if (circuit.batteries.length > 1) return `Circuit ${index + 1} — ${circuit.batteries.length} power sources`;
  return `Circuit ${index + 1} — no power source`;
}

export default function PowerBudgetTab({ project }: { project: Project }) {
  const library = useAppStore((s) => s.library);
  const analysis = useMemo(() => analyzeProject(project, library), [project, library]);

  const meaningfulCircuits = analysis.circuits.filter((c) => c.memberInstanceIds.length > 1 || c.batteries.length > 0);
  const strayComponents = analysis.circuits.filter((c) => c.memberInstanceIds.length === 1 && c.batteries.length === 0);

  if (project.components.length === 0) {
    return (
      <div className="empty-state">
        <p>Add components and wire them up to see the power budget here.</p>
      </div>
    );
  }

  return (
    <div className="power-budget-tab">
      {meaningfulCircuits.length === 0 && (
        <div className="empty-state">
          <p>No wired circuits yet — head to the Graph tab and connect your components.</p>
        </div>
      )}

      {meaningfulCircuits.map((circuit, i) => (
        <section key={circuit.circuitId} className="circuit-card card">
          <h2>{circuitTitle(circuit, i)}</h2>

          {circuit.warnings.length > 0 && (
            <ul className="warning-list">
              {circuit.warnings.map((w, idx) => (
                <li key={idx} className={`warning-item warning-${w.severity}`}>
                  {w.severity === 'error' ? '⛔' : '⚠️'} {w.message}
                </li>
              ))}
            </ul>
          )}

          {circuit.batteries.map((battery) => {
            const overloaded = circuit.nodes.find((n) => n.instanceId === battery.instanceId)?.overloaded ?? false;
            return (
              <div key={battery.instanceId} className="battery-summary">
                <div className="battery-stat-row">
                  <div className="stat-tile">
                    <span className="stat-label">Runtime</span>
                    <span className="stat-value stat-value-lg">{formatRuntime(battery.runtimeHours)}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-label">Average draw</span>
                    <span className="stat-value">{formatCurrentMa(battery.totalCurrentMa)}</span>
                  </div>
                  <div className={`stat-tile${overloaded ? ' stat-tile-warning' : ''}`}>
                    <span className="stat-label">Peak draw</span>
                    <span className="stat-value">{formatCurrentMa(battery.peakCurrentMa)}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-label">Pack voltage</span>
                    <span className="stat-value">{formatVoltage(battery.packVoltage)}</span>
                  </div>
                  <div className="stat-tile">
                    <span className="stat-label">Usable capacity</span>
                    <span className="stat-value">{battery.usableCapacityMah.toFixed(0)} mAh</span>
                  </div>
                </div>
                <PowerBreakdownChart items={battery.breakdown.map((b) => ({ id: b.instanceId, label: b.label, category: b.category, valueMw: b.powerMw }))} />
              </div>
            );
          })}

          {circuit.batteries.length === 0 && <p className="muted">Add a battery to this circuit to get a runtime estimate.</p>}
        </section>
      ))}

      {strayComponents.length > 0 && (
        <section className="circuit-card card muted-card">
          <h2>Not connected to anything</h2>
          <p className="muted small">These components are in the project but not wired up yet — they aren't included in any calculation.</p>
          <ul className="stray-list">
            {strayComponents.map((c) => (
              <li key={c.circuitId}>{c.warnings[0]?.message ?? 'Unconnected component'}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
