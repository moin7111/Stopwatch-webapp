import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Instructions.css';

const Instructions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="instructions">
      <div className="instructions-header">
        <button className="back-button" onClick={() => navigate('/control/menu')}>
          ← Zurück
        </button>
        <h1>Anleitungen</h1>
      </div>
      
      <div className="instructions-content">
        <section className="instruction-section">
          <h2>🚀 Erste Schritte</h2>
          <ol>
            <li>Registrieren Sie sich mit Ihrem Lizenzcode</li>
            <li>Melden Sie sich mit Ihren Zugangsdaten an</li>
            <li>Wählen Sie im Hauptmenü "Routinen"</li>
            <li>Aktivieren Sie das gewünschte Zauber-Modul</li>
          </ol>
        </section>
        
        <section className="instruction-section">
          <h2>📱 Remote App einrichten</h2>
          <ol>
            <li>Gehen Sie zu den Einstellungen</li>
            <li>Kopieren Sie Ihren persönlichen Remote-Link</li>
            <li>Öffnen Sie den Link auf dem Zuschauer-Gerät</li>
            <li>Die Remote App verbindet sich automatisch</li>
          </ol>
        </section>
        
        <section className="instruction-section">
          <h2>🎭 Module verwenden</h2>
          <p>Jedes Modul hat spezielle Funktionen:</p>
          <ul>
            <li><strong>Karten Vorhersage:</strong> Zeigt dem Zuschauer Karten zur Auswahl</li>
            <li><strong>Gedankenlesen:</strong> Sammelt Informationen vom Zuschauer</li>
            <li><strong>Zahlen Magie:</strong> Führt mathematische Tricks durch</li>
            <li><strong>Farben Illusion:</strong> Verändert Farben auf dem Remote-Gerät</li>
          </ul>
        </section>
        
        <section className="instruction-section">
          <h2>💡 Tipps & Tricks</h2>
          <ul>
            <li>Üben Sie die Routinen vor der Aufführung</li>
            <li>Stellen Sie sicher, dass beide Geräte online sind</li>
            <li>Halten Sie Ihre Remote-URL geheim</li>
            <li>Testen Sie neue Module zuerst selbst</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Instructions;