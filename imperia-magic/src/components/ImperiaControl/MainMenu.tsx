import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './MainMenu.css';

const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/control/license');
  };

  return (
    <div className="main-menu">
      <div className="menu-header">
        <h1>Imperia Magic Control</h1>
        <p className="welcome-text">Willkommen, {user?.email}</p>
      </div>
      
      <div className="menu-grid">
        <button 
          className="menu-button routines"
          onClick={() => navigate('/control/routines')}
        >
          <div className="button-icon">🎭</div>
          <h2>Routinen</h2>
          <p>Verwalten Sie Ihre Zauber-Module</p>
        </button>
        
        <button 
          className="menu-button instructions"
          onClick={() => navigate('/control/instructions')}
        >
          <div className="button-icon">📖</div>
          <h2>Anleitungen</h2>
          <p>Erfahren Sie, wie das System funktioniert</p>
        </button>
        
        <button 
          className="menu-button settings"
          onClick={() => navigate('/control/settings')}
        >
          <div className="button-icon">⚙️</div>
          <h2>Einstellungen</h2>
          <p>Konfigurieren Sie Ihr System</p>
        </button>
      </div>
      
      <button className="logout-button" onClick={handleLogout}>
        Abmelden
      </button>
    </div>
  );
};

export default MainMenu;