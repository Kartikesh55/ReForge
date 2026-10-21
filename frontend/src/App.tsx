import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Projects from './pages/Projects';
import MainLayout from './layouts/MainLayout';
import ProjectDetail from './pages/ProjectDetail';
import Architecture from './pages/Architecture';
import CodeExplorer from './pages/CodeExplorer';
import Chat from './pages/Chat';
import ImpactAnalysis from './pages/ImpactAnalysis';
import MigrationWorkspace from './pages/MigrationWorkspace';
import Verification from './pages/Verification';
import Report from './pages/Report';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
      <Route path="/projects" element={<Projects />} />
      
      <Route path="/projects/:id" element={<MainLayout />}>
        <Route index element={<ProjectDetail />} />
        <Route path="architecture" element={<Architecture />} />
        <Route path="code" element={<CodeExplorer />} />
        <Route path="chat" element={<Chat />} />
        <Route path="impact" element={<ImpactAnalysis />} />
        <Route path="migration" element={<MigrationWorkspace />} />
        <Route path="verification" element={<Verification />} />
        <Route path="report" element={<Report />} />
        
        {/* Legacy aliases */}
        <Route path="archaeologist" element={<Navigate to="architecture" replace />} />
        <Route path="flow" element={<Navigate to="architecture" replace />} />
        <Route path="modernization" element={<Navigate to="migration" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
