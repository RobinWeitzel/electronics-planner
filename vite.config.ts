import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from /<repo-name>/, so all built asset
  // URLs need that prefix. Using HashRouter for client-side routing means we
  // don't need any extra SPA-fallback trick on top of this.
  base: '/electronics-planner/',
});
