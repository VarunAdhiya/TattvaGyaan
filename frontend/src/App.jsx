import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SectionNavigation from './components/SectionNavigation';
import DevotionalCollection from './pages/DevotionalCollection';
import DevotionalDetail from './pages/DevotionalDetail';
import HinduCalendar from './pages/HinduCalendar';
import './devotionals.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <SectionNavigation />
          <main className="flex-1">
            <Routes>
              {['chalisa', 'bhajan', 'mantra'].map(category => <React.Fragment key={category}>
                <Route path={`/${category}s`} element={<DevotionalCollection key={category} category={category} />} />
                <Route path={`/${category}s/:slug`} element={<DevotionalDetail key={category} category={category} />} />
              </React.Fragment>)}
              <Route path="/calendar" element={<HinduCalendar />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/scripture/:scriptureId" element={<ProtectedRoute><ScriptureDetail /></ProtectedRoute>} />
              <Route path="/reader/:scriptureId/:editionId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
              <Route path="/reading-plans" element={<ProtectedRoute><ReadingPlansPage /></ProtectedRoute>} />
              <Route path="/reading-plan/:planId" element={<ProtectedRoute><PlanDetailPage /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
