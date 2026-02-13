import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CompanyLanding from './pages/CompanyLanding';
import GovLanding from './pages/GovLanding';
import PersonLanding from './pages/PersonLanding';
import Login from './pages/Login';
import Register from './pages/Register';
import CompanyDashboard from './components/CompanyDashboard';
import GovDashboard from './components/GovDashboard';
import PersonDashboard from './components/PersonDashboard';
import PublicVerify from './components/PublicVerify';
import './App.css';

// Protected Route wrapper
const ProtectedRoute = ({ children, requiredType }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" />;
  }

  if (requiredType && user.userType !== requiredType) {
    return <Navigate to="/" />;
  }

  return children;
};

function App() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Pages */}
        <Route path="/" element={
          user.userType === 'company' ? <CompanyLanding /> :
          user.userType === 'government' ? <GovLanding /> :
          user.userType === 'individual' ? <PersonLanding /> :
          <CompanyLanding />
        } />
        
        <Route path="/company" element={<CompanyLanding />} />
        <Route path="/government" element={<GovLanding />} />
        <Route path="/individual" element={<PersonLanding />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboards */}
        <Route path="/dashboard/company" element={
          <ProtectedRoute requiredType="company">
            <CompanyDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/government" element={
          <ProtectedRoute requiredType="government">
            <GovDashboard />
          </ProtectedRoute>
        } />
        <Route path="/dashboard/individual" element={
          <ProtectedRoute requiredType="individual">
            <PersonDashboard />
          </ProtectedRoute>
        } />

        {/* Public Verification */}
        <Route path="/verify/:certificateId" element={<PublicVerify />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;