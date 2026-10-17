import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { Sidebar } from './components/Sidebar.js';
import { DemoBanner } from './components/DemoBanner.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';

// Lazy-loaded pages for code splitting — reduces initial bundle by ~60%
const LandingPage = React.lazy(() => import('./pages/LandingPage.js').then(m => ({ default: m.LandingPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage.js').then(m => ({ default: m.AuthPage })));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage.js').then(m => ({ default: m.OnboardingPage })));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.js').then(m => ({ default: m.DashboardPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage.js').then(m => ({ default: m.ProfilePage })));
const CareerSelectionPage = React.lazy(() => import('./pages/CareerSelectionPage.js').then(m => ({ default: m.CareerSelectionPage })));
const GapAnalysisPage = React.lazy(() => import('./pages/GapAnalysisPage.js').then(m => ({ default: m.GapAnalysisPage })));
const JdAnalyzerPage = React.lazy(() => import('./pages/JdAnalyzerPage.js').then(m => ({ default: m.JdAnalyzerPage })));
const RoadmapPage = React.lazy(() => import('./pages/RoadmapPage.js').then(m => ({ default: m.RoadmapPage })));
const WeeklyPlannerPage = React.lazy(() => import('./pages/WeeklyPlannerPage.js').then(m => ({ default: m.WeeklyPlannerPage })));
const AiCoachPage = React.lazy(() => import('./pages/AiCoachPage.js').then(m => ({ default: m.AiCoachPage })));
const ProjectsPage = React.lazy(() => import('./pages/ProjectsPage.js').then(m => ({ default: m.ProjectsPage })));
const AssessmentsPage = React.lazy(() => import('./pages/AssessmentsPage.js').then(m => ({ default: m.AssessmentsPage })));
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage.js').then(m => ({ default: m.AnalyticsPage })));
const ReadinessReportPage = React.lazy(() => import('./pages/ReadinessReportPage.js').then(m => ({ default: m.ReadinessReportPage })));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage.js').then(m => ({ default: m.SettingsPage })));

const PageLoader: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <div role="status" aria-live="polite" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
      <div className="spin" aria-hidden="true" style={{ width: 36, height: 36, border: '3px solid rgba(211, 138, 25, 0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 1rem' }} />
      <div>Loading module...</div>
    </div>
  </div>
);


const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <DemoBanner />
        <main className="page-body">
          {children}
        </main>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />

        {/* Protected Onboarding */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Protected App Pages */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Path aliases */}
        <Route path="/gap-analysis" element={<Navigate to="/analysis" replace />} />
        <Route path="/readiness-report" element={<Navigate to="/report" replace />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/careers"
          element={
            <ProtectedRoute>
              <AppLayout>
                <CareerSelectionPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analysis"
          element={
            <ProtectedRoute>
              <AppLayout>
                <GapAnalysisPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/jd-analyzer"
          element={
            <ProtectedRoute>
              <AppLayout>
                <JdAnalyzerPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/roadmap"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RoadmapPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/weekly-planner"
          element={
            <ProtectedRoute>
              <AppLayout>
                <WeeklyPlannerPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-coach"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AiCoachPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProjectsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/assessments"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AssessmentsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ReadinessReportPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
            <AppRoutes />
          </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
