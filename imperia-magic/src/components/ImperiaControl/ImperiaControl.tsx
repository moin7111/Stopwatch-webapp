import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LicenseEntry from './LicenseEntry';
import Login from './Login';
import Register from './Register';
import MainMenu from './MainMenu';
import Routines from './Routines';
import Instructions from './Instructions';
import Settings from './Settings';
import './ImperiaControl.css';

const ImperiaControl: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="imperia-control">
      <Routes>
        <Route path="/" element={
          isAuthenticated ? <Navigate to="/control/menu" replace /> : <Navigate to="/control/license" replace />
        } />
        <Route path="/license" element={
          isAuthenticated ? <Navigate to="/control/menu" replace /> : <LicenseEntry />
        } />
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/control/menu" replace /> : <Login />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/control/menu" replace /> : <Register />
        } />
        <Route path="/menu" element={
          isAuthenticated ? <MainMenu /> : <Navigate to="/control/license" replace />
        } />
        <Route path="/routines" element={
          isAuthenticated ? <Routines /> : <Navigate to="/control/license" replace />
        } />
        <Route path="/instructions" element={
          isAuthenticated ? <Instructions /> : <Navigate to="/control/license" replace />
        } />
        <Route path="/settings" element={
          isAuthenticated ? <Settings /> : <Navigate to="/control/license" replace />
        } />
      </Routes>
    </div>
  );
};

export default ImperiaControl;