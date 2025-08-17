import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Register.css';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [licenseCode, setLicenseCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein');
      return;
    }
    
    const success = await register(email, password, licenseCode);
    if (success) {
      navigate('/control/menu');
    } else {
      setError('Registrierung fehlgeschlagen. Überprüfen Sie Ihre Eingaben und den Lizenzcode.');
    }
  };

  return (
    <div className="register">
      <div className="register-card">
        <h1>Imperia Magic</h1>
        <h2>Konto erstellen</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="register-form">
          <div className="form-group">
            <label htmlFor="licenseCode">Lizenz-Code:</label>
            <input
              type="text"
              id="licenseCode"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              required
            />
          </div>
          
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
          
          <div className="form-group">
            <label htmlFor="confirmPassword">Passwort bestätigen:</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <button type="submit" className="submit-button">
            Registrieren
          </button>
        </form>
        
        <div className="auth-links">
          <button onClick={() => navigate('/control/login')} className="link-button">
            Bereits ein Konto? Anmelden
          </button>
          <button onClick={() => navigate('/control/license')} className="link-button">
            Zurück zur Lizenz-Eingabe
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;