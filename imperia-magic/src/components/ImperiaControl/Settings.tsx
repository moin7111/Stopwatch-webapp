import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Settings.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user, generateRemoteToken } = useAuth();
  const [copied, setCopied] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState('');

  useEffect(() => {
    if (user?.remoteToken) {
      const baseUrl = window.location.origin;
      setRemoteUrl(`${baseUrl}/remote/${user.remoteToken}`);
    }
  }, [user]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(remoteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateNewToken = () => {
    const newToken = generateRemoteToken();
    if (user) {
      // Update user in localStorage
      const users = JSON.parse(localStorage.getItem('imperiaUsers') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, remoteToken: newToken } : u
      );
      localStorage.setItem('imperiaUsers', JSON.stringify(updatedUsers));
      
      // Update current user
      const updatedUser = { ...user, remoteToken: newToken };
      localStorage.setItem('imperiaUser', JSON.stringify(updatedUser));
      window.location.reload(); // Reload to update the context
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <button className="back-button" onClick={() => navigate('/control/menu')}>
          ← Zurück
        </button>
        <h1>Einstellungen</h1>
      </div>
      
      <div className="settings-content">
        <section className="settings-section">
          <h2>👤 Kontoinformationen</h2>
          <div className="info-item">
            <label>E-Mail:</label>
            <span>{user?.email}</span>
          </div>
          <div className="info-item">
            <label>Lizenz:</label>
            <span>{user?.licenseCode}</span>
          </div>
        </section>
        
        <section className="settings-section">
          <h2>🔗 Remote-Zugang</h2>
          <p>Teilen Sie diesen Link mit dem Zuschauer-Gerät:</p>
          <div className="remote-link-container">
            <input 
              type="text" 
              value={remoteUrl} 
              readOnly 
              className="remote-link-input"
            />
            <button 
              className="copy-button"
              onClick={handleCopyLink}
            >
              {copied ? '✓ Kopiert!' : '📋 Kopieren'}
            </button>
          </div>
          <button 
            className="generate-button"
            onClick={handleGenerateNewToken}
          >
            🔄 Neuen Link generieren
          </button>
          <p className="warning-text">
            ⚠️ Achtung: Ein neuer Link macht den alten ungültig!
          </p>
        </section>
        
        <section className="settings-section">
          <h2>🎨 Erscheinungsbild</h2>
          <div className="theme-selector">
            <label>
              <input type="radio" name="theme" value="dark" defaultChecked />
              Dunkles Theme
            </label>
            <label>
              <input type="radio" name="theme" value="light" />
              Helles Theme
            </label>
          </div>
        </section>
        
        <section className="settings-section">
          <h2>🔔 Benachrichtigungen</h2>
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            Remote-Verbindung anzeigen
          </label>
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            Modul-Aktivierung bestätigen
          </label>
        </section>
      </div>
    </div>
  );
};

export default Settings;