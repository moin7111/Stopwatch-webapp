/**
 * Preset Manager Module - Verwaltung von Force-Voreinstellungen
 */

class PresetManager {
    constructor() {
        this.modal = null;
        this.createModal = null;
        this.stopwatch = null;
        this.api = null;
        this.presets = [];
        this.currentSequence = [];
        this.createUI();
    }

    createUI() {
        // Hauptmodal für Presets
        this.modal = document.createElement('div');
        this.modal.className = 'preset-modal';
        this.modal.innerHTML = `
            <div class="preset-content">
                <h3>Voreinstellungen</h3>
                <button id="createPresetBtn" style="width: 100%; padding: 12px; background: #30D058; border: none; border-radius: 8px; color: #000; font-weight: 600; margin-bottom: 16px;">
                    Neue Voreinstellung erstellen
                </button>
                <div id="presetsList" style="max-height: 400px; overflow: auto;"></div>
                <button id="closePresetsBtn" style="width: 100%; padding: 12px; background: #FF453A; border: none; border-radius: 8px; color: #fff; font-weight: 600; margin-top: 16px;">
                    Schließen
                </button>
            </div>
        `;

        // Erstellungsmodal
        this.createModal = document.createElement('div');
        this.createModal.className = 'preset-modal';
        this.createModal.innerHTML = `
            <div class="preset-content">
                <h3>Neue Voreinstellung</h3>
                
                <input type="text" id="presetName" placeholder="Name (z.B. Lotterie-Vorhersage)" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #2C2C2E; border: 1px solid #3C3C3E; border-radius: 8px; color: #fff;">
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; opacity: 0.8;">Force-Typ:</label>
                    <div style="display: flex; gap: 8px;">
                        <button class="force-type-btn" data-type="ms" style="flex: 1; padding: 8px; background: #30D058; border: none; border-radius: 6px; color: #000;">MS</button>
                        <button class="force-type-btn" data-type="s" style="flex: 1; padding: 8px; background: #2C2C2E; border: none; border-radius: 6px; color: #fff;">Summe</button>
                        <button class="force-type-btn" data-type="ft" style="flex: 1; padding: 8px; background: #2C2C2E; border: none; border-radius: 6px; color: #fff;">FT</button>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; opacity: 0.8;">Werte (Enter für nächsten):</label>
                    <input type="text" id="presetValueInput" placeholder="Wert eingeben..." style="width: 100%; padding: 12px; background: #2C2C2E; border: 1px solid #3C3C3E; border-radius: 8px; color: #fff;">
                    <div id="presetSequenceList" style="max-height: 150px; overflow: auto; margin-top: 8px;"></div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; opacity: 0.8;">Bedingungen:</label>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="number" id="conditionValue" placeholder="Anzahl" style="flex: 1; padding: 8px; background: #2C2C2E; border: 1px solid #3C3C3E; border-radius: 6px; color: #fff;">
                        <select id="conditionType" style="flex: 2; padding: 8px; background: #2C2C2E; border: 1px solid #3C3C3E; border-radius: 6px; color: #fff;">
                            <option value="none">Keine Bedingung</option>
                            <option value="seconds">Sekunden</option>
                            <option value="stops">mal Stoppen</option>
                            <option value="laps">Runden</option>
                        </select>
                    </div>
                    
                    <label style="display: block; margin-bottom: 8px; opacity: 0.8;">Trigger:</label>
                    <select id="triggerType" style="width: 100%; padding: 8px; background: #2C2C2E; border: 1px solid #3C3C3E; border-radius: 6px; color: #fff;">
                        <option value="egal">Egal (Stop oder Runde)</option>
                        <option value="stop">Nur bei Stop</option>
                        <option value="lap">Nur bei Runde</option>
                    </select>
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <button id="savePresetBtn" style="flex: 1; padding: 12px; background: #30D058; border: none; border-radius: 8px; color: #000; font-weight: 600;">Speichern</button>
                    <button id="cancelPresetBtn" style="flex: 1; padding: 12px; background: #FF453A; border: none; border-radius: 8px; color: #fff; font-weight: 600;">Abbrechen</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);
        document.body.appendChild(this.createModal);

        // Event Listeners
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Hauptmodal
        document.getElementById('createPresetBtn').addEventListener('click', () => this.showCreateModal());
        document.getElementById('closePresetsBtn').addEventListener('click', () => this.close());

        // Erstellungsmodal
        document.getElementById('savePresetBtn').addEventListener('click', () => this.savePreset());
        document.getElementById('cancelPresetBtn').addEventListener('click', () => this.hideCreateModal());

        // Force-Typ Buttons
        this.createModal.querySelectorAll('.force-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.createModal.querySelectorAll('.force-type-btn').forEach(b => {
                    b.style.background = '#2C2C2E';
                    b.style.color = '#fff';
                });
                e.target.style.background = '#30D058';
                e.target.style.color = '#000';
            });
        });

        // Wert-Eingabe
        document.getElementById('presetValueInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addValueToSequence();
            }
        });

        // Modal schließen bei Klick außerhalb
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
        this.createModal.addEventListener('click', (e) => {
            if (e.target === this.createModal) this.hideCreateModal();
        });
    }

    async open(stopwatch, api) {
        this.stopwatch = stopwatch;
        this.api = api;
        
        // Lade Presets
        await this.loadPresets();
        
        this.modal.classList.add('show');
    }

    close() {
        this.modal.classList.remove('show');
    }

    showCreateModal() {
        // Reset Form
        document.getElementById('presetName').value = '';
        document.getElementById('presetValueInput').value = '';
        document.getElementById('conditionValue').value = '';
        document.getElementById('conditionType').value = 'none';
        document.getElementById('triggerType').value = 'egal';
        this.currentSequence = [];
        this.updateSequenceDisplay();
        
        // Reset Force-Typ
        this.createModal.querySelectorAll('.force-type-btn').forEach((b, i) => {
            b.style.background = i === 0 ? '#30D058' : '#2C2C2E';
            b.style.color = i === 0 ? '#000' : '#fff';
        });
        
        this.createModal.classList.add('show');
    }

    hideCreateModal() {
        this.createModal.classList.remove('show');
    }

    addValueToSequence() {
        const input = document.getElementById('presetValueInput');
        const value = input.value.trim();
        
        if (value) {
            this.currentSequence.push(value);
            input.value = '';
            this.updateSequenceDisplay();
        }
    }

    updateSequenceDisplay() {
        const list = document.getElementById('presetSequenceList');
        
        if (this.currentSequence.length === 0) {
            list.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 8px;">Keine Werte eingegeben</p>';
        } else {
            list.innerHTML = this.currentSequence.map((value, index) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: #2C2C2E; margin-bottom: 4px; border-radius: 6px;">
                    <span>${index + 1}. ${value}</span>
                    <button onclick="window.PresetManager.instance.removeValue(${index})" style="background: #FF453A; color: #fff; border: none; padding: 4px 8px; border-radius: 4px;">×</button>
                </div>
            `).join('');
        }
    }

    removeValue(index) {
        this.currentSequence.splice(index, 1);
        this.updateSequenceDisplay();
    }

    async savePreset() {
        const name = document.getElementById('presetName').value.trim();
        const forceType = this.createModal.querySelector('.force-type-btn[style*="30D058"]').dataset.type;
        const conditionValue = document.getElementById('conditionValue').value;
        const conditionType = document.getElementById('conditionType').value;
        const triggerType = document.getElementById('triggerType').value;
        
        if (!name || this.currentSequence.length === 0) {
            alert('Bitte Name und mindestens einen Wert eingeben!');
            return;
        }
        
        // Erstelle Forces
        const forces = this.currentSequence.map(value => ({
            mode: forceType,
            target: value,
            trigger: triggerType
        }));
        
        // Bedingungen
        const conditions = conditionType !== 'none' && conditionValue ? {
            type: conditionType,
            value: parseInt(conditionValue)
        } : null;
        
        // Wenn Bedingungen vorhanden, füge sie dem ersten Force hinzu
        if (conditions && forces.length > 0) {
            if (conditions.type === 'seconds') {
                forces[0].minDurationMs = conditions.value * 1000;
            } else if (conditions.type === 'stops') {
                forces[0].minPressCount = conditions.value;
            } else if (conditions.type === 'laps') {
                forces[0].minPressCount = conditions.value;
            }
        }
        
        // Speichere Preset
        if (this.api) {
            const success = await this.api.savePreset(name, forces, conditions);
            if (success) {
                this.stopwatch.updateStatus(`Preset "${name}" gespeichert`);
                this.hideCreateModal();
                await this.loadPresets();
            } else {
                alert('Fehler beim Speichern des Presets');
            }
        } else {
            // Lokale Speicherung für Tests
            const presets = JSON.parse(localStorage.getItem('stopwatchPresets') || '[]');
            presets.push({ name, forces, conditions });
            localStorage.setItem('stopwatchPresets', JSON.stringify(presets));
            
            this.stopwatch.updateStatus(`Preset "${name}" lokal gespeichert`);
            this.hideCreateModal();
            await this.loadPresets();
        }
    }

    async loadPresets() {
        if (this.api) {
            this.presets = await this.api.getPresets();
        } else {
            // Lokale Presets für Tests
            this.presets = JSON.parse(localStorage.getItem('stopwatchPresets') || '[]');
        }
        
        this.displayPresets();
    }

    displayPresets() {
        const list = document.getElementById('presetsList');
        
        if (this.presets.length === 0) {
            list.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">Keine Voreinstellungen vorhanden</p>';
        } else {
            list.innerHTML = this.presets.map((preset, index) => `
                <div style="background: #2C2C2E; padding: 16px; margin-bottom: 8px; border-radius: 8px; cursor: pointer;" 
                     onclick="window.PresetManager.instance.activatePreset(${index})">
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${preset.name}</div>
                    <div style="font-size: 14px; opacity: 0.7;">
                        ${preset.forces.length} Force(s)
                        ${preset.conditions ? ` - Bedingung: ${preset.conditions.value} ${preset.conditions.type}` : ''}
                    </div>
                </div>
            `).join('');
        }
    }

    activatePreset(index) {
        const preset = this.presets[index];
        if (!preset || !this.stopwatch) return;
        
        // Füge alle Forces zur Queue hinzu
        preset.forces.forEach(force => {
            this.stopwatch.addForce(force);
        });
        
        this.stopwatch.updateStatus(`Preset "${preset.name}" aktiviert`);
        this.close();
    }
}

// Singleton Instance
PresetManager.instance = new PresetManager();
window.PresetManager = PresetManager.instance;