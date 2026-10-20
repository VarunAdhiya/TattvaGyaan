import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import ScriptureDetail from './pages/ScriptureDetail';
import ReaderPage from './pages/ReaderPage';
import ReadingPlansPage from './pages/ReadingPlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import ProfilePage from './pages/ProfilePage';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SectionNavigation from './components/SectionNavigation';
import DevotionalCollection from './pages/DevotionalCollection';
import DevotionalDetail from './pages/DevotionalDetail';
import HinduCalendar from './pages/HinduCalendar';
import LandingPage from './pages/LandingPage';
const DivineJourneys = React.lazy(() => import('./pages/DivineJourneys'));
import './devotionals.css';
import './sacred-theme.css';

function SiteNavigation() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  if (user && pathname === '/journeys/ganesha' && new URLSearchParams(search).has('level')) return null;
  return pathname === '/dashboard' && user ? null : <><Navbar /><SectionNavigation /></>;
}

function SiteFooter() {
  const { pathname, search } = useLocation();
  return pathname === '/journeys/ganesha' && new URLSearchParams(search).has('level') ? null : <Footer />;
}

function EntryRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="sacred-loading" role="status">Opening TattvaGyaan…</div>;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="sacred-loading" role="status">Opening TattvaGyaan?</div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="sacred-app flex flex-col min-h-screen">
          <SiteNavigation />
          <main className="flex-1">
            <Routes>
              {['chalisa', 'bhajan', 'mantra'].map(category => <React.Fragment key={category}>
                <Route path={`/${category}s`} element={<ProtectedRoute><DevotionalCollection key={category} category={category} /></ProtectedRoute>} />
                <Route path={`/${category}s/:slug`} element={<ProtectedRoute><DevotionalDetail key={category} category={category} /></ProtectedRoute>} />
              </React.Fragment>)}
              <Route path="/calendar" element={<ProtectedRoute><HinduCalendar /></ProtectedRoute>} />
              <Route path="/journeys" element={<ProtectedRoute><Navigate to="/journeys/ganesha" replace /></ProtectedRoute>} />
              <Route path="/journeys/:deityId" element={<ProtectedRoute><React.Suspense fallback={<div className="sacred-loading" role="status">Opening the sacred world…</div>}><DivineJourneys /></React.Suspense></ProtectedRoute>} />
              <Route path="/" element={<EntryRoute />} />
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><LandingPage /></ProtectedRoute>} />
              <Route path="/library" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/scripture/:scriptureId" element={<ProtectedRoute><ScriptureDetail /></ProtectedRoute>} />
              <Route path="/reader/:scriptureId/:editionId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
              <Route path="/reading-plans" element={<ProtectedRoute><ReadingPlansPage /></ProtectedRoute>} />
              <Route path="/reading-plan/:planId" element={<ProtectedRoute><PlanDetailPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Routes>
          </main>
          <SiteFooter />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
