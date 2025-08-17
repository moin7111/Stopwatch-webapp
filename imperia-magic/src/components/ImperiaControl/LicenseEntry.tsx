import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LicenseEntry.css';

const LicenseEntry: React.FC = () => {
  const navigate = useNavigate();
  const [licenseCode, setLicenseCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Hier würde normalerweise eine Lizenz-Validierung stattfinden
    navigate('/control/register');
  };

  return (
    <div className="license-entry">
      <div className="license-card">
        <h1>Imperia Magic</h1>
        <h2>Willkommen zum Zauber-System</h2>
        
        <form onSubmit={handleSubmit} className="license-form">
          <div className="form-group">
            <label htmlFor="license">Lizenz-Code eingeben:</label>
            <input
              type="text"
              id="license"
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              className="license-input"
              required
            />
          </div>
          
          <button type="submit" className="submit-button">
            Weiter zur Registrierung
          </button>
        </form>
        
        <div className="auth-links">
          <p>Bereits ein Konto?</p>
          <button onClick={() => navigate('/control/login')} className="link-button">
            Zum Login
          </button>
        </div>
        
        <div className="demo-info">
          <p>Demo-Lizenzcodes:</p>
          <code>MAGIC-2024-DEMO</code>
          <code>IMPERIA-PRO-123</code>
          <code>ZAUBER-PREMIUM</code>
        </div>
      </div>
    </div>
  );
};

export default LicenseEntry;