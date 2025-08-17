import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Routines.css';

interface Module {
  id: string;
  name: string;
  description: string;
  icon: string;
  active: boolean;
}

const Routines: React.FC = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<Module[]>([
    {
      id: '1',
      name: 'Karten Vorhersage',
      description: 'Sagen Sie die gewählte Karte voraus',
      icon: '🃏',
      active: false
    },
    {
      id: '2',
      name: 'Gedankenlesen',
      description: 'Lesen Sie die Gedanken Ihrer Zuschauer',
      icon: '🧠',
      active: false
    },
    {
      id: '3',
      name: 'Zahlen Magie',
      description: 'Erstaunliche Berechnungen und Vorhersagen',
      icon: '🔢',
      active: false
    },
    {
      id: '4',
      name: 'Farben Illusion',
      description: 'Verwandeln Sie Farben vor den Augen der Zuschauer',
      icon: '🎨',
      active: false
    }
  ]);

  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  const toggleModule = (moduleId: string) => {
    setModules(prevModules => 
      prevModules.map(module => ({
        ...module,
        active: module.id === moduleId ? !module.active : false
      }))
    );
    
    setActiveModuleId(prev => prev === moduleId ? null : moduleId);
    
    // Hier würde die Kommunikation mit der Remote App stattfinden
    console.log(`Module ${moduleId} ist jetzt ${activeModuleId === moduleId ? 'inaktiv' : 'aktiv'}`);
  };

  return (
    <div className="routines">
      <div className="routines-header">
        <button className="back-button" onClick={() => navigate('/control/menu')}>
          ← Zurück
        </button>
        <h1>Zauber-Routinen</h1>
      </div>
      
      <div className="modules-grid">
        {modules.map(module => (
          <div 
            key={module.id} 
            className={`module-card ${module.active ? 'active' : ''}`}
            onClick={() => toggleModule(module.id)}
          >
            <div className="module-icon">{module.icon}</div>
            <h3>{module.name}</h3>
            <p>{module.description}</p>
            <div className="module-status">
              {module.active ? 'Aktiv' : 'Inaktiv'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="add-module">
        <button className="add-button">
          + Neues Modul hinzufügen
        </button>
      </div>
      
      {activeModuleId && (
        <div className="active-module-info">
          <p>Aktives Modul: {modules.find(m => m.id === activeModuleId)?.name}</p>
          <p className="remote-hint">Die Remote-App zeigt jetzt dieses Modul an</p>
        </div>
      )}
    </div>
  );
};

export default Routines;