/**
 * Manual Input Module - Ermöglicht schnelle Force-Eingabe über Triple-Click
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
                <input type="text" id="manualInputField" placeholder="Zahl eingeben..." />
                <div class="manual-input-list" id="manualInputList"></div>
                <div class="manual-input-buttons">
                    <button id="manualInputMS" style="background: #30D058;">MS-Force</button>
                    <button id="manualInputS" style="background: #30D058;">S-Force</button>
                    <button id="manualInputFT" style="background: #30D058;">FT-Force</button>
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

    open(stopwatch) {
        this.stopwatch = stopwatch;
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

        // Erstelle Force-Objekt
        if (this.entries.length === 1) {
            // Einzelner Force
            const force = {
                mode: mode,
                target: this.entries[0],
                trigger: 'egal' // Bei Manual Input immer egal
            };
            this.stopwatch.addForce(force);
        } else {
            // Liste von Forces
            const forceList = this.entries.map(entry => ({
                mode: mode,
                target: entry
            }));
            const force = {
                mode: 'list',
                list: forceList,
                trigger: 'egal'
            };
            this.stopwatch.addForce(force);
        }

        this.stopwatch.updateStatus(`${this.entries.length} Force(s) (${mode.toUpperCase()}) aktiviert`);
        this.close();
    }
}

// Singleton Instance
ManualInput.instance = new ManualInput();
window.ManualInput = ManualInput.instance;