import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

function systemPrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Resolves the 'system' theme preference down to an actual 'light' | 'dark'. */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useAppStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemDark(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  if (theme === 'system') return systemDark ? 'dark' : 'light';
  return theme;
}
