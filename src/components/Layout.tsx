import { useRef, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { exportAppDataToFile, parseAppDataFile } from '../store/storage';
import type { AppData, ThemePreference } from '../types';

const THEME_CYCLE: ThemePreference[] = ['system', 'light', 'dark'];
const THEME_ICON: Record<ThemePreference, string> = { system: '🖥️', light: '☀️', dark: '🌙' };

export default function Layout() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const replaceAll = useAppStore((s) => s.replaceAll);
  // Selected as individual primitives (not a combined object literal) so the
  // store's snapshot stays referentially stable between renders — an inline
  // `(s) => ({...})` selector returns a new object every call, which trips
  // React's "too many re-renders" guard in useSyncExternalStore.
  const schemaVersion = useAppStore((s) => s.schemaVersion);
  const projects = useAppStore((s) => s.projects);
  const library = useAppStore((s) => s.library);
  const appData: AppData = { schemaVersion, projects, library, theme };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const cycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(theme);
    setTheme(THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Import a full backup? This replaces all projects and your library in this browser with the contents of the file.')) return;
    try {
      const data = await parseAppDataFile(file);
      replaceAll(data);
      setNotice({ kind: 'ok', text: 'Backup imported.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Import failed.' });
    }
    setTimeout(() => setNotice(null), 4000);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="brand">⚡ Electronics Planner</span>
          <nav className="main-nav">
            <NavLink to="/" end>
              Projects
            </NavLink>
            <NavLink to="/library">Library</NavLink>
          </nav>
        </div>
        <div className="app-header-right">
          {notice && <span className={`notice notice-${notice.kind}`}>{notice.text}</span>}
          <button type="button" className="btn btn-ghost" onClick={() => exportAppDataToFile(appData)} title="Download a full JSON backup of everything">
            Export backup
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleImportClick} title="Restore from a full JSON backup">
            Import backup
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImportFile} />
          <button type="button" className="btn btn-icon" onClick={cycleTheme} title={`Theme: ${theme}`}>
            {THEME_ICON[theme]}
          </button>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
