import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ScientificCalculator } from './components/tools/ScientificCalculator';
import { FormulaVaultDrawer } from './components/tools/FormulaVaultDrawer';
import ErrorBoundary from './components/ErrorBoundary';

import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardPage } from './pages/DashboardPage';
import { PracticePage } from './pages/PracticePage';
import { ExamPage } from './pages/ExamPage';
import { QuizPage } from './pages/QuizPage';
import { HistoryPage } from './pages/HistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';

const App: React.FC = () => {
  const [vaultOpen, setVaultOpen] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <BrowserRouter>
            <div className="min-h-screen flex flex-col bg-[#FAFBFF] dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors">

              {/* Global Navbar */}
              <Navbar onOpenFormulaVault={() => setVaultOpen(true)} />

              {/* Main Viewport */}
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/auth" element={<AuthPage />} />

                  <Route
                    path="/onboarding"
                    element={
                      <ProtectedRoute requireOnboarding={false}>
                        <OnboardingPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/practice"
                    element={
                      <ProtectedRoute>
                        <PracticePage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/exam"
                    element={
                      <ProtectedRoute>
                        <ExamPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/quiz"
                    element={
                      <ProtectedRoute>
                        <QuizPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/history"
                    element={
                      <ProtectedRoute>
                        <HistoryPage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfilePage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute requireOnboarding={false}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/questions"
                    element={
                      <ProtectedRoute requireOnboarding={false}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/questions/upload"
                    element={
                      <ProtectedRoute requireOnboarding={false}>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch-all redirect */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>

              {/* Global Footer */}
              <Footer />

              {/* Interactive Floating Tools */}
              <ScientificCalculator />
              <FormulaVaultDrawer
                isOpen={vaultOpen}
                onClose={() => setVaultOpen(false)}
              />
            </div>
          </BrowserRouter>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;