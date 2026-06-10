import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import TopNav from './components/TopNav';
import Verify from './pages/Verify';
import Result from './pages/Result';
import Request from './pages/Request'; 
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Status from './pages/Status';

export default function App() {
  return (
    <AuthProvider>
      {/* 1. Added Future Flags to completely silence the console warnings in the log */}
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <TopNav />
        <Routes>
          {/* Public Verification Gateway Node */}
          <Route path="/" element={<Verify />} />
          <Route path="/result" element={<Result />} />
          
          {/* Public Request Filing Node */}
          <Route path="/request" element={<Request />} />
          
          {/* 2. Changed from "/login" to "/admin-login" to match your system context redirection path calls */}
          <Route path="/admin-login" element={<AdminLogin />} />
          
          <Route path="/status" element={<Status />} />
          
          {/* Redirect /dashboard to /admin */}
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          
          {/* Protected Operator Console Node */}
          <Route 
            path="/admin" 
            element = {
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }             
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}