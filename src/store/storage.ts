import { PRESET_LIBRARY } from '../data/presetLibrary';
import type { AppData, ComponentDef, Project } from '../types';

const STORAGE_KEY = 'electronics-planner.appData';
export const SCHEMA_VERSION = 1;

export function createInitialAppData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    projects: [],
    library: PRESET_LIBRARY.map((d) => ({ ...d })),
    theme: 'system',
  };
}

function migrate(data: Partial<AppData>): AppData {
  // Future schema changes get handled here, keyed off data.schemaVersion.
  return {
    schemaVersion: SCHEMA_VERSION,
    projects: Array.isArray(data.projects) ? data.projects : [],
    library: Array.isArray(data.library) && data.library.length > 0 ? data.library : PRESET_LIBRARY.map((d) => ({ ...d })),
    theme: data.theme ?? 'system',
  };
}

export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialAppData();
    return migrate(JSON.parse(raw));
  } catch (err) {
    console.error('Failed to load saved data — starting fresh.', err);
    return createInitialAppData();
  }
}

export function saveAppData(data: AppData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage.', err);
  }
}

function download(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const dateStamp = () => new Date().toISOString().slice(0, 10);

export function exportAppDataToFile(data: AppData) {
  download(`electronics-planner-backup-${dateStamp()}.json`, JSON.stringify(data, null, 2));
}

interface ProjectExportFile {
  kind: 'electronics-planner-project';
  schemaVersion: number;
  project: Project;
  library: ComponentDef[];
}

export function exportProjectToFile(project: Project, library: ComponentDef[]) {
  const usedDefIds = new Set(project.components.map((c) => c.defId));
  const payload: ProjectExportFile = {
    kind: 'electronics-planner-project',
    schemaVersion: SCHEMA_VERSION,
    project,
    library: library.filter((d) => usedDefIds.has(d.id)),
  };
  const safeName = project.name.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  download(`${safeName || 'project'}-${dateStamp()}.json`, JSON.stringify(payload, null, 2));
}

export async function parseAppDataFile(file: File): Promise<AppData> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.projects) || !Array.isArray(parsed.library)) {
    throw new Error("This file doesn't look like an Electronics Planner backup.");
  }
  return migrate(parsed);
}

export async function parseProjectFile(file: File): Promise<{ project: Project; library: ComponentDef[] }> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || parsed.kind !== 'electronics-planner-project' || !parsed.project) {
    throw new Error("This file doesn't look like an Electronics Planner project export.");
  }
  return { project: parsed.project as Project, library: Array.isArray(parsed.library) ? parsed.library : [] };
}
