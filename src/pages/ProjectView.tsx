import { lazy, Suspense, useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { exportProjectToFile } from '../store/storage';
import ComponentsTab from './project-tabs/ComponentsTab';

// The graph editor (React Flow) and power budget (Recharts) tabs pull in the
// two heaviest dependencies — split them out of the main bundle so the
// dashboard and component list load fast.
const GraphTab = lazy(() => import('./project-tabs/GraphTab'));
const PowerBudgetTab = lazy(() => import('./project-tabs/PowerBudgetTab'));

export default function ProjectView() {
  const { projectId, tab } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.id === projectId));
  const library = useAppStore((s) => s.library);
  const updateProjectMeta = useAppStore((s) => s.updateProjectMeta);
  const [editingName, setEditingName] = useState(false);

  if (!project) return <Navigate to="/" replace />;

  const activeTab = tab ?? 'components';

  return (
    <div className="page project-page">
      <div className="page-header">
        <div>
          {editingName ? (
            <input
              className="project-name-input"
              autoFocus
              defaultValue={project.name}
              onBlur={(e) => {
                updateProjectMeta(project.id, { name: e.target.value.trim() || project.name });
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
          ) : (
            <h1 onClick={() => setEditingName(true)} title="Click to rename" className="editable-title">
              {project.name}
            </h1>
          )}
          <textarea
            className="project-description-input"
            placeholder="Add a short description of this project…"
            defaultValue={project.description ?? ''}
            onBlur={(e) => updateProjectMeta(project.id, { description: e.target.value })}
            rows={1}
          />
        </div>
        <div className="page-header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => exportProjectToFile(project, library)}>
            Export project…
          </button>
        </div>
      </div>

      <nav className="tab-nav">
        <NavLink to={`/project/${project.id}/components`} className={() => (activeTab === 'components' ? 'active' : '')}>
          Components
        </NavLink>
        <NavLink to={`/project/${project.id}/graph`} className={() => (activeTab === 'graph' ? 'active' : '')}>
          Graph
        </NavLink>
        <NavLink to={`/project/${project.id}/power`} className={() => (activeTab === 'power' ? 'active' : '')}>
          Power budget
        </NavLink>
      </nav>

      <div className="tab-content">
        {activeTab === 'components' && <ComponentsTab project={project} />}
        <Suspense fallback={<p className="muted">Loading…</p>}>
          {activeTab === 'graph' && <GraphTab project={project} />}
          {activeTab === 'power' && <PowerBudgetTab project={project} />}
        </Suspense>
      </div>
    </div>
  );
}
