import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Dashboard from './pages/Dashboard';
import ScriptureDetail from './pages/ScriptureDetail';
import ReaderPage from './pages/ReaderPage';
import ReadingPlansPage from './pages/ReadingPlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/scripture/:scriptureId" element={<ProtectedRoute><ScriptureDetail /></ProtectedRoute>} />
              <Route path="/reader/:scriptureId/:editionId" element={<ProtectedRoute><ReaderPage /></ProtectedRoute>} />
              <Route path="/reading-plans" element={<ProtectedRoute><ReadingPlansPage /></ProtectedRoute>} />
              <Route path="/reading-plan/:planId" element={<ProtectedRoute><PlanDetailPage /></ProtectedRoute>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
