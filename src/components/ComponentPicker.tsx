import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ComponentCategory, ComponentDef } from '../types';

const CATEGORY_LABEL: Record<ComponentCategory, string> = { battery: 'Battery', converter: 'Converter', load: 'Load', other: 'Other' };
const CATEGORIES: ComponentCategory[] = ['battery', 'converter', 'load', 'other'];

interface Props {
  onSelect: (defId: string) => void;
  onCreateCustom: (category: ComponentCategory) => void;
}

export default function ComponentPicker({ onSelect, onCreateCustom }: Props) {
  const library = useAppStore((s) => s.library);
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = q ? library.filter((d) => d.name.toLowerCase().includes(q) || (d.subtype ?? '').toLowerCase().includes(q)) : library;
  const grouped: Record<ComponentCategory, ComponentDef[]> = { battery: [], converter: [], load: [], other: [] };
  for (const d of filtered) grouped[d.category].push(d);

  return (
    <div className="picker-panel">
      <input autoFocus placeholder="Search library…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="picker-groups">
        {CATEGORIES.map(
          (cat) =>
            grouped[cat].length > 0 && (
              <div key={cat} className="picker-group">
                <h4>{CATEGORY_LABEL[cat]}</h4>
                <div className="picker-items">
                  {grouped[cat].map((d) => (
                    <button key={d.id} type="button" className="picker-item" onClick={() => onSelect(d.id)}>
                      <span>{d.name}</span>
                      {d.subtype && <span className="muted">{d.subtype}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ),
        )}
        {filtered.length === 0 && <p className="muted small">No parts match "{search}".</p>}
      </div>
      <div className="picker-create-row">
        <span className="muted">Create custom:</span>
        {CATEGORIES.map((cat) => (
          <button key={cat} type="button" className="btn btn-ghost btn-sm" onClick={() => onCreateCustom(cat)}>
            + {CATEGORY_LABEL[cat]}
          </button>
        ))}
      </div>
    </div>
  );
}
