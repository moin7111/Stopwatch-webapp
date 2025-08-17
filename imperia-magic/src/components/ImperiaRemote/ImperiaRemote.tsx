import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import './ImperiaRemote.css';

const ImperiaRemote: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);

  useEffect(() => {
    // Validiere Token
    if (token) {
      const users = JSON.parse(localStorage.getItem('imperiaUsers') || '[]');
      const validUser = users.find((u: any) => u.remoteToken === token);
      setIsValidToken(!!validUser);
    } else {
      setIsValidToken(false);
    }
  }, [token]);

  if (isValidToken === null) {
    return (
      <div className="imperia-remote loading">
        <div className="loader">Verbindung wird hergestellt...</div>
      </div>
    );
  }

  if (!isValidToken) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="imperia-remote">
      <div className="remote-header">
        <h1>Imperia Remote</h1>
        <div className="connection-status">
          <span className="status-dot"></span>
          Verbunden
        </div>
      </div>
      
      <div className="remote-content">
        {!activeModule ? (
          <div className="waiting-screen">
            <div className="magic-icon">✨</div>
            <h2>Bereit für Magie</h2>
            <p>Warten auf Anweisungen vom Zauberer...</p>
            <div className="pulse-animation"></div>
          </div>
        ) : (
          <div className="active-module">
            {/* Hier würden die verschiedenen Module angezeigt werden */}
            <h2>Modul aktiv: {activeModule}</h2>
            <p>Modul-Inhalt wird hier angezeigt</p>
          </div>
        )}
      </div>
      
      <div className="remote-footer">
        <p>Powered by Imperia Magic</p>
      </div>
    </div>
  );
};

export default ImperiaRemote;