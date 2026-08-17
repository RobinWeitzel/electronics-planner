import { useState } from 'react';
import ComponentSpecFields from '../components/ComponentSpecFields';
import { newComponentDef } from '../lib/defaults';
import { summarizeSpec } from '../lib/resolve';
import { useAppStore } from '../store/useAppStore';
import type { ComponentCategory, ComponentDef } from '../types';

const CATEGORY_LABEL: Record<ComponentCategory, string> = { battery: 'Batteries', converter: 'Converters', load: 'Loads', other: 'Other / pass-through' };
const CATEGORIES: ComponentCategory[] = ['battery', 'converter', 'load', 'other'];

export default function LibraryManager() {
  const library = useAppStore((s) => s.library);
  const projects = useAppStore((s) => s.projects);
  const addLibraryDef = useAppStore((s) => s.addLibraryDef);
  const updateLibraryDef = useAppStore((s) => s.updateLibraryDef);
  const deleteLibraryDef = useAppStore((s) => s.deleteLibraryDef);

  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const filtered = q ? library.filter((d) => d.name.toLowerCase().includes(q) || (d.subtype ?? '').toLowerCase().includes(q)) : library;
  const grouped: Record<ComponentCategory, ComponentDef[]> = { battery: [], converter: [], load: [], other: [] };
  for (const d of filtered) grouped[d.category].push(d);

  const usageCount = (defId: string) => projects.reduce((sum, p) => sum + p.components.filter((c) => c.defId === defId).length, 0);

  const handleCreate = (category: ComponentCategory) => {
    const name = prompt('Part name?');
    if (!name) return;
    const def = newComponentDef(category, name);
    addLibraryDef(def);
    setExpandedId(def.id);
  };

  const handleDelete = (def: ComponentDef) => {
    const uses = usageCount(def.id);
    const msg = uses > 0 ? `"${def.name}" is used by ${uses} component instance${uses === 1 ? '' : 's'} across your projects. Deleting it will leave those as "missing part" until you remove or reassign them. Delete anyway?` : `Delete "${def.name}" from your library?`;
    if (confirm(msg)) deleteLibraryDef(def.id);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Component library</h1>
        <div className="page-header-actions">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" className="btn btn-ghost btn-sm" onClick={() => handleCreate(cat)}>
              + {cat}
            </button>
          ))}
        </div>
      </div>
      <input className="library-search" placeholder="Search your library…" value={search} onChange={(e) => setSearch(e.target.value)} />

      {CATEGORIES.map(
        (cat) =>
          grouped[cat].length > 0 && (
            <div key={cat} className="library-section">
              <h3>{CATEGORY_LABEL[cat]}</h3>
              <div className="instance-list">
                {grouped[cat].map((def) => {
                  const expanded = expandedId === def.id;
                  const uses = usageCount(def.id);
                  return (
                    <div key={def.id} className={`instance-card${expanded ? ' expanded' : ''}`}>
                      <div className="instance-card-header" onClick={() => setExpandedId(expanded ? null : def.id)}>
                        <span className={`badge badge-${def.category}`}>{def.category}</span>
                        <input
                          className="instance-label-input"
                          value={def.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateLibraryDef(def.id, { name: e.target.value })}
                        />
                        <span className="instance-summary muted">{summarizeSpec(def)}</span>
                        {def.isPreset && <span className="badge badge-muted">built-in</span>}
                        {uses > 0 && <span className="badge badge-muted">{uses} in use</span>}
                        <button type="button" className="btn btn-danger btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(def); }}>
                          Delete
                        </button>
                      </div>
                      {expanded && (
                        <div className="instance-card-body">
                          <label className="field">
                            <span className="field-label">Subtype</span>
                            <input value={def.subtype ?? ''} onChange={(e) => updateLibraryDef(def.id, { subtype: e.target.value })} placeholder="e.g. Sensor, Actuator, Microcontroller board" />
                          </label>
                          <label className="field">
                            <span className="field-label">Notes</span>
                            <textarea rows={2} value={def.notes ?? ''} onChange={(e) => updateLibraryDef(def.id, { notes: e.target.value })} placeholder="Datasheet quirks, gotchas, links…" />
                          </label>
                          <ComponentSpecFields
                            category={def.category}
                            battery={def.battery}
                            converter={def.converter}
                            load={def.load}
                            loadOptional={def.category === 'other'}
                            onChangeBattery={(b) => updateLibraryDef(def.id, { battery: b })}
                            onChangeConverter={(c) => updateLibraryDef(def.id, { converter: c })}
                            onChangeLoad={(l) => updateLibraryDef(def.id, { load: l })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ),
      )}
      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No parts match "{search}".</p>
        </div>
      )}
    </div>
  );
}
