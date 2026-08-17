import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { useThemeEffect } from './lib/useThemeEffect';
import Dashboard from './pages/Dashboard';
import LibraryManager from './pages/LibraryManager';
import ProjectView from './pages/ProjectView';

export default function App() {
  useThemeEffect();

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/library" element={<LibraryManager />} />
        <Route path="/project/:projectId/:tab?" element={<ProjectView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
