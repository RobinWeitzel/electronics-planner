import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  type Connection,
  type Edge,
  type IsValidConnection,
  type Node,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ComponentPicker from '../../components/ComponentPicker';
import PartNode, { type PartNodeData } from '../../graph/nodes/PartNode';
import { analyzeProject, isValidPowerHandlePair } from '../../lib/calc';
import { newComponentDef } from '../../lib/defaults';
import { instanceLabel, resolveComponentSpec, summarizeSpec } from '../../lib/resolve';
import { useAppStore } from '../../store/useAppStore';
import type { ComponentCategory, PowerHandle, Project } from '../../types';

const nodeTypes = { part: PartNode };

function edgeRole(handle?: string | null): 'power' | 'ground' | 'signal' {
  if (handle === 'ground') return 'ground';
  if (handle === 'signal') return 'signal';
  return 'power';
}

const EDGE_COLOR: Record<'power' | 'ground' | 'signal', string> = {
  power: '#e2762d',
  ground: '#6b7280',
  signal: '#3b82f6',
};

export default function GraphTab({ project }: { project: Project }) {
  const library = useAppStore((s) => s.library);
  const addComponentInstance = useAppStore((s) => s.addComponentInstance);
  const updateComponentInstance = useAppStore((s) => s.updateComponentInstance);
  const removeComponentInstance = useAppStore((s) => s.removeComponentInstance);
  const addProjectEdge = useAppStore((s) => s.addEdge);
  const removeProjectEdge = useAppStore((s) => s.removeEdge);
  const addLibraryDef = useAppStore((s) => s.addLibraryDef);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const analysis = useMemo(() => analyzeProject(project, library), [project, library]);
  const nodeResultById = useMemo(() => {
    const map = new Map<string, { domainVoltage?: number; currentMa: number; isPowered: boolean; groundOk: boolean }>();
    for (const circuit of analysis.circuits) {
      for (const n of circuit.nodes) {
        map.set(n.instanceId, { domainVoltage: n.domainVoltage, currentMa: n.drawFromParentMa, isPowered: n.isPowered, groundOk: n.groundOk });
      }
      for (const b of circuit.batteries) {
        map.set(b.instanceId, { domainVoltage: b.packVoltage, currentMa: b.totalCurrentMa, isPowered: true, groundOk: true });
      }
    }
    return map;
  }, [analysis]);

  // Rebuild nodes/edges whenever the underlying project data changes (component
  // added/removed, spec edited, edge added/removed). Position dragging is kept
  // purely local until drag-stop so it stays smooth.
  useEffect(() => {
    setNodes(
      project.components.map((inst) => {
        const def = library.find((d) => d.id === inst.defId);
        const spec = def ? resolveComponentSpec(def, inst) : undefined;
        const result = nodeResultById.get(inst.instanceId);
        const data: PartNodeData = {
          label: def ? instanceLabel(def, inst) : 'Missing part',
          category: spec?.category ?? 'other',
          summary: spec ? summarizeSpec(spec) : 'Library part was deleted',
          analysis: result,
        };
        return {
          id: inst.instanceId,
          type: 'part',
          position: inst.position,
          data: data as unknown as Record<string, unknown>,
        };
      }),
    );
    setEdges(
      project.edges.map((e) => {
        const role = edgeRole(e.sourceHandle);
        return {
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: e.targetHandle,
          style: { stroke: EDGE_COLOR[role], strokeWidth: role === 'power' ? 2.5 : 1.5, strokeDasharray: role === 'signal' ? '4 3' : undefined },
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.components, project.edges, library]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      updateComponentInstance(project.id, node.id, { position: node.position });
    },
    [project.id, updateComponentInstance],
  );

  const isValidConnection: IsValidConnection = useCallback((conn) => {
    if (!conn.source || !conn.target || conn.source === conn.target) return false;
    if (!conn.sourceHandle || !conn.targetHandle) return false;
    return isValidPowerHandlePair(conn.sourceHandle as PowerHandle, conn.targetHandle as PowerHandle);
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.sourceHandle || !connection.targetHandle) return;
      addProjectEdge(project.id, {
        source: connection.source,
        sourceHandle: connection.sourceHandle as PowerHandle,
        target: connection.target,
        targetHandle: connection.targetHandle as PowerHandle,
      });
    },
    [project.id, addProjectEdge],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((e) => removeProjectEdge(project.id, e.id));
    },
    [project.id, removeProjectEdge],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((n) => removeComponentInstance(project.id, n.id));
    },
    [project.id, removeComponentInstance],
  );

  const handleAdd = (defId: string) => {
    addComponentInstance(project.id, defId);
    setPickerOpen(false);
  };

  const handleCreateCustom = (category: ComponentCategory) => {
    const name = prompt('Part name?');
    if (!name) return;
    const def = newComponentDef(category, name);
    addLibraryDef(def);
    handleAdd(def.id);
  };

  return (
    <div className="graph-tab">
      <div className="tab-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setPickerOpen((o) => !o)}>
          + Add component
        </button>
        <div className="graph-legend">
          <span>
            <i className="legend-swatch" style={{ background: EDGE_COLOR.power }} /> power
          </span>
          <span>
            <i className="legend-swatch" style={{ background: EDGE_COLOR.ground }} /> ground
          </span>
          <span>
            <i className="legend-swatch" style={{ background: EDGE_COLOR.signal }} /> signal
          </span>
          <span className="muted">Drag from a dot to wire; select + Backspace to delete.</span>
        </div>
      </div>

      {pickerOpen && <ComponentPicker onSelect={handleAdd} onCreateCustom={handleCreateCustom} />}

      <div className="graph-canvas">
        {project.components.length === 0 ? (
          <div className="empty-state">
            <p>Add components, then drag between the little dots on each node to wire power, ground, and signal connections.</p>
          </div>
        ) : (
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStop={onNodeDragStop}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onEdgesDelete={onEdgesDelete}
              onNodesDelete={onNodesDelete}
              connectionMode={ConnectionMode.Loose}
              deleteKeyCode={['Backspace', 'Delete']}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
