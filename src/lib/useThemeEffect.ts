import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useThemeEffect() {
  const theme = useAppStore((s) => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
}
