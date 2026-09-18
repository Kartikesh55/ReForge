import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './pages/Dashboard'
import { Workspace } from './pages/Workspace'
import { Archaeology } from './pages/Archaeology'
import { Migration } from './pages/Migration'
import { Verification } from './pages/Verification'
import { Modernization } from './pages/Modernization'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects/:id" element={<Workspace />} />
        <Route path="/projects/:id/archaeology" element={<Archaeology />} />
        <Route path="/projects/:id/migration" element={<Migration />} />
        <Route path="/projects/:id/verification" element={<Verification />} />
        <Route path="/projects/:id/modernization" element={<Modernization />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
