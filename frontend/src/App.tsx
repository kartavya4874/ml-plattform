import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from './store/store'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import DataExplorer from './pages/DataExplorer'
import TrainingStudio from './pages/TrainingStudio'
import ModelHub from './pages/ModelHub'
import ModelDetail from './pages/ModelDetail'
import TestingPlayground from './pages/TestingPlayground'
import DeploymentHub from './pages/DeploymentHub'
import ExplainabilityLab from './pages/ExplainabilityLab'

/** Guard: redirects to /login if no access token */
function RequireAuth() {
  const token = useSelector((s: RootState) => s.auth.accessToken)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — auth guard first, then layout shell */}
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/data" element={<DataExplorer />} />
          <Route path="/train" element={<TrainingStudio />} />
          <Route path="/models" element={<ModelHub />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/test/:id" element={<TestingPlayground />} />
          <Route path="/deploy/:id" element={<DeploymentHub />} />
          <Route path="/explain/:id" element={<ExplainabilityLab />} />
          <Route path="/model-hub" element={<Navigate to="/models" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
