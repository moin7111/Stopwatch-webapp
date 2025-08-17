import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const success = await login(email, password);
    if (success) {
      navigate('/control/menu');
    } else {
      setError('Ungültige E-Mail oder Passwort');
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <h1>Imperia Magic</h1>
        <h2>Anmelden</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">E-Mail:</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ihre@email.de"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Passwort:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" className="submit-button">
            Anmelden
          </button>
        </form>
        
        <div className="auth-links">
          <button onClick={() => navigate('/control/register')} className="link-button">
            Noch kein Konto? Registrieren
          </button>
          <button onClick={() => navigate('/control/license')} className="link-button">
            Zurück zur Lizenz-Eingabe
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;