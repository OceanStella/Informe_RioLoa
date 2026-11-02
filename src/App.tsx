import { lazy, useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GuestProfileGate } from './components/GuestProfileModal';
import { AppShell } from './components/ui/AppShell';
import { PageSkeleton } from './components/ui/Skeletons';
import { ConfigProvider } from './context/ConfigContext';
import { GuestProfileProvider } from './context/GuestProfileContext';
import { ReportProvider } from './context/ReportContext';
import { ShellProvider } from './context/ShellContext';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { MvpAccessPage } from './pages/MvpAccessPage';
import { ReportPage } from './pages/ReportPage';
import { ReviewPage } from './pages/ReviewPage';
import logoUrl from './assets/rioloa-logo.png';
import './App.css';

// Recharts only loads with this view.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

/** Before the session is known, so before there is a shell to render. */
function AppLoading() {
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <img src={logoUrl} alt="RIOLOA" className="topbar-logo" width={75} height={24} />
        </div>
      </header>
      <PageSkeleton />
    </>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

function AuthGate({ children }: { children: ReactNode }) {
  const { loading, authEnabled, user, mvpAccess } = useAuth();
  const { pathname, search } = useLocation();
  const needsLogin = authEnabled && !user;
  const isReviewLink = pathname.startsWith('/review/');
  const mvpLocked = mvpAccess.required && !mvpAccess.authenticated && !isReviewLink;
  const [appEntered, setAppEntered] = useState(false);

  useEffect(() => {
    if (!loading && needsLogin && isReviewLink) {
      window.location.assign(`/api/auth/login?returnTo=${encodeURIComponent(pathname + search)}`);
    }
  }, [loading, needsLogin, isReviewLink, pathname, search]);

  useEffect(() => {
    if (!loading && !mvpLocked && !isReviewLink) setAppEntered(true);
  }, [loading, mvpLocked, isReviewLink]);

  if (loading || (needsLogin && isReviewLink)) return <AppLoading />;
  if (needsLogin) return <LoginPage />;

  return (
    <>
      {(!mvpLocked || appEntered) && children}
      {mvpLocked && <MvpAccessPage overlay={appEntered} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate>
          <GuestProfileProvider>
            <ConfigProvider>
              <ReportProvider>
                <ShellProvider>
                  <ScrollToTop />
                  <GuestProfileGate />
                  <Routes>
                    <Route element={<AppShell />}>
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/history" element={<HistoryPage />} />
                      <Route path="/report" element={<ReportPage />} />
                      <Route path="/review/:token" element={<ReviewPage />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </ShellProvider>
              </ReportProvider>
            </ConfigProvider>
          </GuestProfileProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  );
}
