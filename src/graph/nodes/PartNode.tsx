import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ComponentCategory } from '../../types';

export interface PartNodeAnalysis {
  domainVoltage?: number;
  currentMa?: number;
  isPowered: boolean;
  groundOk: boolean;
}

export interface PartNodeData {
  label: string;
  category: ComponentCategory;
  summary: string;
  analysis?: PartNodeAnalysis;
  [key: string]: unknown;
}

interface HandleSpec {
  id: string;
  position: Position;
  type: 'source' | 'target';
  title: string;
  cls: string;
}

const HANDLES: Record<ComponentCategory, HandleSpec[]> = {
  battery: [
    { id: 'power-out', position: Position.Right, type: 'source', title: 'Power out', cls: 'power' },
    { id: 'ground', position: Position.Bottom, type: 'source', title: 'Ground', cls: 'ground' },
  ],
  converter: [
    { id: 'power-in', position: Position.Left, type: 'target', title: 'Power in', cls: 'power' },
    { id: 'power-out', position: Position.Right, type: 'source', title: 'Power out', cls: 'power' },
    { id: 'ground', position: Position.Bottom, type: 'source', title: 'Ground', cls: 'ground' },
  ],
  load: [
    { id: 'power-in', position: Position.Left, type: 'target', title: 'Power in', cls: 'power' },
    { id: 'ground', position: Position.Bottom, type: 'source', title: 'Ground', cls: 'ground' },
    { id: 'signal', position: Position.Top, type: 'source', title: 'Signal / data', cls: 'signal' },
  ],
  other: [
    { id: 'power-in', position: Position.Left, type: 'target', title: 'Power in', cls: 'power' },
    { id: 'power-out', position: Position.Right, type: 'source', title: 'Power out', cls: 'power' },
    { id: 'ground', position: Position.Bottom, type: 'source', title: 'Ground', cls: 'ground' },
    { id: 'signal', position: Position.Top, type: 'source', title: 'Signal / data', cls: 'signal' },
  ],
};

export default function PartNode({ data, selected }: NodeProps) {
  const d = data as unknown as PartNodeData;
  const handles = HANDLES[d.category] ?? HANDLES.other;
  const showWarning = !!d.analysis && d.category !== 'battery' && (!d.analysis.isPowered || !d.analysis.groundOk);

  return (
    <div className={`part-node part-node-${d.category}${selected ? ' selected' : ''}${showWarning ? ' has-warning' : ''}`}>
      {handles.map((h) => (
        <Handle key={h.id} id={h.id} type={h.type} position={h.position} title={h.title} className={`rf-handle rf-handle-${h.cls}`} />
      ))}
      <div className="part-node-label">{d.label}</div>
      <div className="part-node-summary">{d.summary}</div>
      {d.analysis && (
        <div className="part-node-analysis">
          {d.analysis.isPowered && d.analysis.domainVoltage !== undefined && <span>{d.analysis.domainVoltage.toFixed(2)}V</span>}
          {d.analysis.isPowered && d.analysis.currentMa !== undefined && d.category !== 'battery' && <span>{d.analysis.currentMa.toFixed(1)}mA</span>}
          {d.category !== 'battery' && !d.analysis.isPowered && <span className="warn-pill">not powered</span>}
          {d.analysis.isPowered && !d.analysis.groundOk && <span className="warn-pill">no ground</span>}
        </div>
      )}
    </div>
  );
}
