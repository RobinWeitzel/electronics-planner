import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeProject } from '../lib/calc';
import { useAppStore } from '../store/useAppStore';
import { parseProjectFile } from '../store/storage';

export default function Dashboard() {
  const projects = useAppStore((s) => s.projects);
  const library = useAppStore((s) => s.library);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const duplicateProject = useAppStore((s) => s.duplicateProject);
  const importProject = useAppStore((s) => s.importProject);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    const name = prompt('Project name?', 'New project');
    if (name === null) return;
    const id = createProject(name);
    navigate(`/project/${id}/components`);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const { project, library: importedLib } = await parseProjectFile(file);
      const id = importProject(project, importedLib);
      navigate(`/project/${id}/components`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
      setTimeout(() => setError(null), 4000);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Your projects</h1>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost" onClick={handleImportClick}>
            Import project…
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            + New project
          </button>
        </div>
      </div>
      {error && <p className="notice notice-error">{error}</p>}

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects yet. Create one to start planning components, wiring, and power budget.</p>
          <button type="button" className="btn btn-primary" onClick={handleCreate}>
            + New project
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {projects.map((p) => {
            const analysis = analyzeProject(p, library);
            const circuitCount = analysis.circuits.filter((c) => c.batteries.length > 0 || c.memberInstanceIds.length > 1).length;
            const errorCount = analysis.warnings.filter((w) => w.severity === 'error').length;
            const warnCount = analysis.warnings.filter((w) => w.severity === 'warning').length;
            return (
              <div key={p.id} className="card project-card" onClick={() => navigate(`/project/${p.id}/components`)}>
                <h2>{p.name}</h2>
                {p.description && <p className="muted">{p.description}</p>}
                <div className="project-card-stats">
                  <span>{p.components.length} components</span>
                  <span>{circuitCount} circuit{circuitCount === 1 ? '' : 's'}</span>
                  {(errorCount > 0 || warnCount > 0) && (
                    <span className="badge badge-warning">
                      {errorCount > 0 ? `${errorCount} error${errorCount === 1 ? '' : 's'}` : `${warnCount} warning${warnCount === 1 ? '' : 's'}`}
                    </span>
                  )}
                </div>
                <div className="card-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const id = duplicateProject(p.id);
                      if (id) navigate(`/project/${id}/components`);
                    }}
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm(`Delete "${p.name}"? This can't be undone.`)) deleteProject(p.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
