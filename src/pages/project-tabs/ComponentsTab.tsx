import { useState } from 'react';
import ComponentPicker from '../../components/ComponentPicker';
import ComponentSpecFields from '../../components/ComponentSpecFields';
import { newComponentDef } from '../../lib/defaults';
import { instanceLabel, resolveComponentSpec, summarizeSpec } from '../../lib/resolve';
import { useAppStore } from '../../store/useAppStore';
import type { ComponentCategory, Project } from '../../types';

const CATEGORY_LABEL: Record<ComponentCategory, string> = { battery: 'Battery', converter: 'Converter', load: 'Load', other: 'Other' };

export default function ComponentsTab({ project }: { project: Project }) {
  const library = useAppStore((s) => s.library);
  const addComponentInstance = useAppStore((s) => s.addComponentInstance);
  const updateComponentInstance = useAppStore((s) => s.updateComponentInstance);
  const removeComponentInstance = useAppStore((s) => s.removeComponentInstance);
  const addLibraryDef = useAppStore((s) => s.addLibraryDef);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleAdd = (defId: string) => {
    const instanceId = addComponentInstance(project.id, defId);
    setPickerOpen(false);
    setExpandedId(instanceId);
  };

  const handleCreateCustom = (category: ComponentCategory) => {
    const name = prompt('Part name?');
    if (!name) return;
    const def = newComponentDef(category, name);
    addLibraryDef(def);
    handleAdd(def.id);
  };

  return (
    <div className="components-tab">
      <div className="tab-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setPickerOpen((o) => !o)}>
          + Add component
        </button>
      </div>

      {pickerOpen && <ComponentPicker onSelect={handleAdd} onCreateCustom={handleCreateCustom} />}

      {project.components.length === 0 ? (
        <div className="empty-state">
          <p>No components yet. Add batteries, converters, and loads, then wire them up in the Graph tab.</p>
        </div>
      ) : (
        <div className="instance-list">
          {project.components.map((inst) => {
            const def = library.find((d) => d.id === inst.defId);
            if (!def) {
              return (
                <div key={inst.instanceId} className="instance-card instance-missing">
                  <span>Missing library part (was it deleted from the library?)</span>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeComponentInstance(project.id, inst.instanceId)}>
                    Remove
                  </button>
                </div>
              );
            }
            const spec = resolveComponentSpec(def, inst);
            const expanded = expandedId === inst.instanceId;
            const hasOverrides = !!inst.overrides && Object.keys(inst.overrides).length > 0;
            return (
              <div key={inst.instanceId} className={`instance-card${expanded ? ' expanded' : ''}`}>
                <div className="instance-card-header" onClick={() => setExpandedId(expanded ? null : inst.instanceId)}>
                  <span className={`badge badge-${spec.category}`}>{CATEGORY_LABEL[spec.category]}</span>
                  <input
                    className="instance-label-input"
                    value={inst.label ?? ''}
                    placeholder={def.name}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateComponentInstance(project.id, inst.instanceId, { label: e.target.value })}
                  />
                  <span className="instance-summary muted">{summarizeSpec(spec)}</span>
                  {hasOverrides && <span className="badge badge-muted">customized</span>}
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Remove ${instanceLabel(def, inst)} from this project?`)) removeComponentInstance(project.id, inst.instanceId);
                    }}
                  >
                    Remove
                  </button>
                </div>
                {expanded && (
                  <div className="instance-card-body">
                    <p className="muted small">From library: {def.name}. Editing here only affects this instance in this project — the library entry stays untouched.</p>
                    <ComponentSpecFields
                      category={spec.category}
                      battery={spec.battery}
                      converter={spec.converter}
                      load={spec.load}
                      loadOptional={spec.category === 'other'}
                      onChangeBattery={(b) => updateComponentInstance(project.id, inst.instanceId, { overrides: { ...inst.overrides, battery: b } })}
                      onChangeConverter={(c) => updateComponentInstance(project.id, inst.instanceId, { overrides: { ...inst.overrides, converter: c } })}
                      onChangeLoad={(l) => updateComponentInstance(project.id, inst.instanceId, { overrides: { ...inst.overrides, load: l } })}
                    />
                    {hasOverrides && (
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => updateComponentInstance(project.id, inst.instanceId, { overrides: undefined })}>
                        Reset to library defaults
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
