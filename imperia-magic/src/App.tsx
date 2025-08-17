import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ImperiaControl from './components/ImperiaControl/ImperiaControl';
import ImperiaRemote from './components/ImperiaRemote/ImperiaRemote';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/control" replace />} />
            <Route path="/control/*" element={<ImperiaControl />} />
            <Route path="/remote/:token" element={<ImperiaRemote />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
