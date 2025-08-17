/**
 * Manual Input Module - Ermöglicht schnelle Force-Eingabe über Triple-Click für Tempra
 */

class ManualInput {
    constructor() {
        this.modal = null;
        this.input = null;
        this.list = null;
        this.entries = [];
        this.stopwatch = null;
        this.createModal();
    }

    createModal() {
        // Modal Container
        this.modal = document.createElement('div');
        this.modal.className = 'manual-input-modal';
        this.modal.innerHTML = `
            <div class="manual-input-content">
                <h3>Manuelle Force-Eingabe</h3>
                <div class="manual-input-info">
                    <p style="font-size: 14px; opacity: 0.8; margin: 8px 0;">
                        Geben Sie Zahlen ein und drücken Sie Enter. 
                        Bei mehreren Zahlen werden diese nacheinander forciert.
                    </p>
                </div>
                <input type="text" id="manualInputField" placeholder="Zahl eingeben und Enter drücken..." />
                <div class="manual-input-list" id="manualInputList"></div>
                <div class="manual-input-buttons">
                    <button id="manualInputMS" style="background: #30D058;" title="Millisekunden Force (00-99)">MS-Force</button>
                    <button id="manualInputS" style="background: #30D058;" title="Summen Force (Quersumme)">S-Force</button>
                    <button id="manualInputFT" style="background: #30D058;" title="Full Time Force (MMSS)">FT-Force</button>
                    <button id="manualInputCancel" style="background: #FF453A;">Abbrechen</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Elements
        this.input = document.getElementById('manualInputField');
        this.list = document.getElementById('manualInputList');

        // Event Listeners
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.addEntry();
            }
        });

        document.getElementById('manualInputMS').addEventListener('click', () => this.startForce('ms'));
        document.getElementById('manualInputS').addEventListener('click', () => this.startForce('s'));
        document.getElementById('manualInputFT').addEventListener('click', () => this.startForce('ft'));
        document.getElementById('manualInputCancel').addEventListener('click', () => this.close());

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });
    }

    open(stopwatch, api = null) {
        this.stopwatch = stopwatch;
        this.api = api;
        this.entries = [];
        this.updateList();
        this.modal.classList.add('show');
        this.input.focus();
    }

    close() {
        this.modal.classList.remove('show');
        this.input.value = '';
        this.entries = [];
        this.updateList();
    }

    addEntry() {
        const value = this.input.value.trim();
        if (value) {
            this.entries.push(value);
            this.input.value = '';
            this.updateList();
            this.input.focus();
        }
    }

    updateList() {
        this.list.innerHTML = '';
        this.entries.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'manual-input-item';
            item.innerHTML = `
                <span>${index + 1}. ${entry}</span>
                <button onclick="window.ManualInput.instance.removeEntry(${index})" style="background: #FF453A; color: #fff; border: none; padding: 4px 8px; border-radius: 4px;">×</button>
            `;
            this.list.appendChild(item);
        });
    }

    removeEntry(index) {
        this.entries.splice(index, 1);
        this.updateList();
    }

    startForce(mode) {
        if (this.entries.length === 0) {
            alert('Bitte mindestens eine Zahl eingeben!');
            return;
        }

        if (!this.stopwatch) {
            this.close();
            return;
        }

        // Validiere Eingaben basierend auf Mode
        let validatedEntries = [];
        for (let entry of this.entries) {
            const validated = this.validateEntry(entry, mode);
            if (validated !== null) {
                validatedEntries.push(validated);
            }
        }

        if (validatedEntries.length === 0) {
            alert('Keine gültigen Eingaben für ' + mode.toUpperCase() + ' Force!');
            return;
        }

        // Erstelle Force-Objekt
        if (validatedEntries.length === 1) {
            // Einzelner Force
            const force = {
                mode: mode,
                target: validatedEntries[0],
                trigger: 'egal' // Bei Manual Input immer egal
            };
            this.addForceToStopwatch(force);
        } else {
            // Liste von Forces
            const forceList = validatedEntries.map(entry => ({
                mode: mode,
                target: entry
            }));
            const force = {
                mode: 'list',
                list: forceList,
                trigger: 'egal'
            };
            this.addForceToStopwatch(force);
        }

        this.stopwatch.updateStatus(`${validatedEntries.length} Force(s) (${mode.toUpperCase()}) aktiviert`);
        this.close();
    }

    validateEntry(entry, mode) {
        const cleaned = entry.replace(/[^0-9]/g, '');
        
        switch (mode) {
            case 'ms':
                // MS-Force: 00-99
                const ms = parseInt(cleaned, 10);
                if (!isNaN(ms) && ms >= 0 && ms <= 99) {
                    return ms;
                }
                break;
                
            case 's':
                // S-Force: Beliebige Quersumme
                const sum = parseInt(cleaned, 10);
                if (!isNaN(sum) && sum >= 0) {
                    return sum;
                }
                break;
                
            case 'ft':
                // FT-Force: MMSS Format
                if (cleaned.length === 4) {
                    const minutes = parseInt(cleaned.substring(0, 2), 10);
                    const seconds = parseInt(cleaned.substring(2, 4), 10);
                    if (!isNaN(minutes) && !isNaN(seconds) && seconds < 60) {
                        return cleaned;
                    }
                }
                break;
        }
        
        return null;
    }

    async addForceToStopwatch(force) {
        // Füge Force lokal hinzu
        this.stopwatch.addForce(force);
        
        // Sende auch via API wenn verfügbar
        if (this.api) {
            try {
                await this.api.sendManualForce(force);
            } catch (error) {
                console.warn('Failed to send manual force via API:', error);
            }
        }
    }
}

// Singleton Instance
ManualInput.instance = new ManualInput();
window.ManualInput = ManualInput.instance;