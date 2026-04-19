import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from './store/store'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import Dashboard from './pages/Dashboard'
import DataExplorer from './pages/DataExplorer'
import TrainingStudio from './pages/TrainingStudio'
import ModelHub from './pages/ModelHub'
import ModelDetail from './pages/ModelDetail'
import TestingPlayground from './pages/TestingPlayground'
import DeploymentHub from './pages/DeploymentHub'
import ExplainabilityLab from './pages/ExplainabilityLab'
import PricingPage from './pages/PricingPage'
import DataPrepStudio from './pages/DataPrepStudio'
import ManageProfilePage from './pages/ManageProfilePage'
import ManageBillingPage from './pages/ManageBillingPage'
import ExplorePage from './pages/ExplorePage'
import DiscussionsPage from './pages/DiscussionsPage'
import NotebooksPage from './pages/NotebooksPage'
import NotebookEditor from './pages/NotebookEditor'
import CompetitionsPage from './pages/CompetitionsPage'
import LeaderboardPage from './pages/LeaderboardPage'
import UserProfilePage from './pages/UserProfilePage'
import AdminPage from './pages/AdminPage'
import ModelComparison from './pages/ModelComparison'
import ApiKeysPage from './pages/ApiKeysPage'
import NotFoundPage from './pages/NotFoundPage'
import LandingPage from './pages/LandingPage'
import OrganizationManagementPage from './pages/OrganizationManagementPage'
import JoinOrgPage from './pages/JoinOrgPage'
import DocumentationPage from './pages/DocumentationPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import TermsOfServicePage from './pages/TermsOfServicePage'
import RefundPolicyPage from './pages/RefundPolicyPage'
import ContactUsPage from './pages/ContactUsPage'
import ApiReferencePage from './pages/ApiReferencePage'
import CommandPalette from './components/CommandPalette'
import ChatWidget from './components/ChatWidget'
import ErrorBoundary from './components/ErrorBoundary'
import SessionExpiredModal from './components/SessionExpiredModal'
import PublicLayout from './components/PublicLayout'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

/** Global hooks wrapper that needs to be inside Router context */
function GlobalHooks() {
  useKeyboardShortcuts()
  return (
    <>
      <CommandPalette />
      <SessionExpiredModal />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </>
  )
}

/** Guard: redirects to /login if no access token */
function RequireAuth() {
  const token = useSelector((s: RootState) => s.auth.accessToken)
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

/** Root route: landing page if unauthenticated, dashboard if authenticated */
function RootRoute() {
  const token = useSelector((s: RootState) => s.auth.accessToken)
  return token ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

export default function App() {
  return (
    <>
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<RootRoute />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route element={<PublicLayout />}>
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/contact" element={<ContactUsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/docs" element={<DocumentationPage />} />
        <Route path="/api-docs" element={<ApiReferencePage />} />
      </Route>

      {/* Protected routes — auth guard first, then layout shell */}
      <Route element={<RequireAuth />}>
        <Route element={<GlobalHooks />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/data" element={<DataExplorer />} />
            <Route path="/data/:id" element={<DataPrepStudio />} />
            <Route path="/train" element={<TrainingStudio />} />
          <Route path="/models" element={<ModelHub />} />
          <Route path="/models/compare" element={<ModelComparison />} />
          <Route path="/models/:id" element={<ModelDetail />} />
          <Route path="/test/:id" element={<TestingPlayground />} />
          <Route path="/deploy/:id" element={<DeploymentHub />} />
          <Route path="/explain/:id" element={<ExplainabilityLab />} />

          {/* Community */}
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/discussions" element={<DiscussionsPage />} />
          <Route path="/notebooks" element={<NotebooksPage />} />
          <Route path="/notebooks/:id" element={<NotebookEditor />} />
          <Route path="/competitions" element={<CompetitionsPage />} />
          <Route path="/competitions/:id" element={<LeaderboardPage />} />
          <Route path="/u/:username" element={<UserProfilePage />} />

          {/* Settings */}
          <Route path="/billing" element={<ManageBillingPage />} />
          <Route path="/profile" element={<ManageProfilePage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/organizations" element={<OrganizationManagementPage />} />
          <Route path="/join/:token" element={<JoinOrgPage />} />

          <Route path="/model-hub" element={<Navigate to="/models" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        </Route>
      </Route>
    </Routes>
    <ChatWidget />
    </>
  )
}
