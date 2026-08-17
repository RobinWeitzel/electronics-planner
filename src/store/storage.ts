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

/**
 * Backfills fields added after a def/spec may have already been saved to
 * localStorage (e.g. peakCurrentMa, maxDischargeCurrentMa), so old data opens
 * with sane values instead of blanks.
 */
function backfillComponentDef(def: ComponentDef): ComponentDef {
  const next = { ...def };
  if (next.load && typeof next.load.peakCurrentMa !== 'number') {
    next.load = { ...next.load, peakCurrentMa: next.load.activeCurrentMa };
  }
  if (next.battery && typeof next.battery.maxDischargeCurrentMa !== 'number') {
    next.battery = { ...next.battery, maxDischargeCurrentMa: 0 };
  }
  return next;
}

function backfillProject(project: Project): Project {
  return {
    ...project,
    components: project.components.map((c) =>
      c.overrides
        ? {
            ...c,
            overrides: {
              ...c.overrides,
              load: c.overrides.load && typeof c.overrides.load.peakCurrentMa !== 'number' ? { ...c.overrides.load, peakCurrentMa: c.overrides.load.activeCurrentMa } : c.overrides.load,
              battery: c.overrides.battery && typeof c.overrides.battery.maxDischargeCurrentMa !== 'number' ? { ...c.overrides.battery, maxDischargeCurrentMa: 0 } : c.overrides.battery,
            },
          }
        : c,
    ),
  };
}

function migrate(data: Partial<AppData>): AppData {
  // Future schema changes get handled here, keyed off data.schemaVersion.
  const library = Array.isArray(data.library) && data.library.length > 0 ? data.library : PRESET_LIBRARY.map((d) => ({ ...d }));
  const projects = Array.isArray(data.projects) ? data.projects : [];
  return {
    schemaVersion: SCHEMA_VERSION,
    projects: projects.map(backfillProject),
    library: library.map(backfillComponentDef),
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
