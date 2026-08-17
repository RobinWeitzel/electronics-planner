import { create } from 'zustand';
import { newComponentDef } from '../lib/defaults';
import type { AppData, CircuitEdge, ComponentDef, ComponentInstance, Project, ThemePreference } from '../types';
import { createInitialAppData, loadAppData, saveAppData } from './storage';

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave(data: AppData) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveAppData(data), 250);
}

export function nowIso() {
  return new Date().toISOString();
}

interface AppStore extends AppData {
  replaceAll: (data: AppData) => void;

  createProject: (name: string) => string;
  renameProject: (projectId: string, name: string) => void;
  updateProjectMeta: (projectId: string, patch: Partial<Pick<Project, 'name' | 'description'>>) => void;
  deleteProject: (projectId: string) => void;
  duplicateProject: (projectId: string) => string | null;
  importProject: (project: Project, library: ComponentDef[]) => string;

  addComponentInstance: (projectId: string, defId: string, position?: { x: number; y: number }) => string;
  updateComponentInstance: (projectId: string, instanceId: string, patch: Partial<ComponentInstance>) => void;
  removeComponentInstance: (projectId: string, instanceId: string) => void;

  addEdge: (projectId: string, edge: Omit<CircuitEdge, 'id'>) => void;
  removeEdge: (projectId: string, edgeId: string) => void;

  addLibraryDef: (def: ComponentDef) => void;
  updateLibraryDef: (defId: string, patch: Partial<ComponentDef>) => void;
  deleteLibraryDef: (defId: string) => void;

  setTheme: (theme: ThemePreference) => void;
}

function touch(project: Project): Project {
  return { ...project, updatedAt: nowIso() };
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...loadAppData(),

  replaceAll: (data) => {
    set({ ...data });
    saveAppData(data);
  },

  createProject: (name) => {
    const id = crypto.randomUUID();
    const project: Project = {
      id,
      name: name.trim() || 'Untitled project',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      components: [],
      edges: [],
    };
    set((s) => {
      const next = { ...s, projects: [...s.projects, project] };
      scheduleSave(next);
      return next;
    });
    return id;
  },

  renameProject: (projectId, name) => {
    get().updateProjectMeta(projectId, { name });
  },

  updateProjectMeta: (projectId, patch) => {
    set((s) => {
      const projects = s.projects.map((p) => (p.id === projectId ? touch({ ...p, ...patch }) : p));
      const next = { ...s, projects };
      scheduleSave(next);
      return next;
    });
  },

  deleteProject: (projectId) => {
    set((s) => {
      const next = { ...s, projects: s.projects.filter((p) => p.id !== projectId) };
      scheduleSave(next);
      return next;
    });
  },

  duplicateProject: (projectId) => {
    const source = get().projects.find((p) => p.id === projectId);
    if (!source) return null;
    const idMap = new Map<string, string>();
    const newId = crypto.randomUUID();
    const components = source.components.map((c) => {
      const newInstanceId = crypto.randomUUID();
      idMap.set(c.instanceId, newInstanceId);
      return { ...c, instanceId: newInstanceId };
    });
    const edges = source.edges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));
    const copy: Project = {
      ...source,
      id: newId,
      name: `${source.name} (copy)`,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      components,
      edges,
    };
    set((s) => {
      const next = { ...s, projects: [...s.projects, copy] };
      scheduleSave(next);
      return next;
    });
    return newId;
  },

  importProject: (project, library) => {
    const newId = crypto.randomUUID();
    const idMap = new Map<string, string>();
    const defIdRemap = new Map<string, string>();
    set((s) => {
      let mergedLibrary = s.library;
      for (const def of library) {
        const existing = mergedLibrary.find((d) => d.id === def.id);
        if (!existing) {
          mergedLibrary = [...mergedLibrary, def];
        } else if (JSON.stringify({ ...existing, id: '' }) !== JSON.stringify({ ...def, id: '' })) {
          // Same id, different contents — avoid clobbering the user's library entry.
          const newDefId = crypto.randomUUID();
          defIdRemap.set(def.id, newDefId);
          mergedLibrary = [...mergedLibrary, { ...def, id: newDefId, name: `${def.name} (imported)` }];
        }
      }
      const components = project.components.map((c) => {
        const newInstanceId = crypto.randomUUID();
        idMap.set(c.instanceId, newInstanceId);
        return { ...c, instanceId: newInstanceId, defId: defIdRemap.get(c.defId) ?? c.defId };
      });
      const edges = project.edges.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      }));
      const imported: Project = {
        ...project,
        id: newId,
        name: `${project.name} (imported)`,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        components,
        edges,
      };
      const next = { ...s, library: mergedLibrary, projects: [...s.projects, imported] };
      scheduleSave(next);
      return next;
    });
    return newId;
  },

  addComponentInstance: (projectId, defId, position) => {
    const instanceId = crypto.randomUUID();
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const instance: ComponentInstance = {
          instanceId,
          defId,
          position: position ?? { x: 80 + Math.random() * 200, y: 80 + Math.random() * 200 },
        };
        return touch({ ...p, components: [...p.components, instance] });
      });
      const next = { ...s, projects };
      scheduleSave(next);
      return next;
    });
    return instanceId;
  },

  updateComponentInstance: (projectId, instanceId, patch) => {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const components = p.components.map((c) => (c.instanceId === instanceId ? { ...c, ...patch } : c));
        return touch({ ...p, components });
      });
      const next = { ...s, projects };
      scheduleSave(next);
      return next;
    });
  },

  removeComponentInstance: (projectId, instanceId) => {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return touch({
          ...p,
          components: p.components.filter((c) => c.instanceId !== instanceId),
          edges: p.edges.filter((e) => e.source !== instanceId && e.target !== instanceId),
        });
      });
      const next = { ...s, projects };
      scheduleSave(next);
      return next;
    });
  },

  addEdge: (projectId, edge) => {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const newEdge: CircuitEdge = { ...edge, id: crypto.randomUUID() };
        return touch({ ...p, edges: [...p.edges, newEdge] });
      });
      const next = { ...s, projects };
      scheduleSave(next);
      return next;
    });
  },

  removeEdge: (projectId, edgeId) => {
    set((s) => {
      const projects = s.projects.map((p) => {
        if (p.id !== projectId) return p;
        return touch({ ...p, edges: p.edges.filter((e) => e.id !== edgeId) });
      });
      const next = { ...s, projects };
      scheduleSave(next);
      return next;
    });
  },

  addLibraryDef: (def) => {
    set((s) => {
      const next = { ...s, library: [...s.library, def] };
      scheduleSave(next);
      return next;
    });
  },

  updateLibraryDef: (defId, patch) => {
    set((s) => {
      const library = s.library.map((d) => (d.id === defId ? { ...d, ...patch } : d));
      const next = { ...s, library };
      scheduleSave(next);
      return next;
    });
  },

  deleteLibraryDef: (defId) => {
    set((s) => {
      const next = { ...s, library: s.library.filter((d) => d.id !== defId) };
      scheduleSave(next);
      return next;
    });
  },

  setTheme: (theme) => {
    set((s) => {
      const next = { ...s, theme };
      scheduleSave(next);
      return next;
    });
  },
}));

export function makeNewLibraryDef(category: Parameters<typeof newComponentDef>[0], name?: string) {
  return newComponentDef(category, name);
}

export const initialAppData = createInitialAppData;
