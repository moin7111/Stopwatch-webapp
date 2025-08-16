/**
 * Stopwatch API Module - Kommunikation zwischen MainTick, ModulTick und Server
 */

class StopwatchAPI {
    constructor(token, type = 'modultick') {
        this.token = token;
        this.type = type; // 'maintick' oder 'modultick'
        this.polling = false;
        this.pollInterval = 400;
        this.apiBase = '';
    }

    /**
     * Startet das Polling für neue Forces
     */
    startPolling(stopwatch) {
        if (this.polling) return;
        
        this.polling = true;
        this.poll(stopwatch);
    }

    /**
     * Stoppt das Polling
     */
    stopPolling() {
        this.polling = false;
    }

    /**
     * Pollt den Server nach neuen Forces
     */
    async poll(stopwatch) {
        if (!this.polling) return;

        try {
            const url = `${this.apiBase}/api/stopwatch/${this.type}/data/${encodeURIComponent(this.token)}`;
            const response = await fetch(url, { cache: 'no-store' });
            
            if (response.ok) {
                const data = await response.json();
                
                // Verarbeite neue Forces
                if (data.forces && Array.isArray(data.forces)) {
                    for (const force of data.forces) {
                        if (!this.isForceProcessed(force.id)) {
                            stopwatch.addForce(force);
                            await this.acknowledgeForce(force.id);
                        }
                    }
                }
                
                // Verarbeite Presets
                if (data.activePreset) {
                    await this.loadPreset(data.activePreset, stopwatch);
                }
            }
        } catch (error) {
            console.warn('Polling error:', error);
        } finally {
            setTimeout(() => this.poll(stopwatch), this.pollInterval);
        }
    }

    /**
     * Prüft ob Force bereits verarbeitet wurde
     */
    isForceProcessed(forceId) {
        const processed = JSON.parse(localStorage.getItem('processedForces') || '[]');
        return processed.includes(forceId);
    }

    /**
     * Markiert Force als verarbeitet
     */
    async acknowledgeForce(forceId) {
        try {
            await fetch(`${this.apiBase}/api/stopwatch/${this.type}/ack/${encodeURIComponent(this.token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forceId })
            });
            
            // Speichere lokal
            const processed = JSON.parse(localStorage.getItem('processedForces') || '[]');
            processed.push(forceId);
            if (processed.length > 100) processed.shift(); // Limitiere Größe
            localStorage.setItem('processedForces', JSON.stringify(processed));
        } catch (error) {
            console.warn('Acknowledge error:', error);
        }
    }

    /**
     * Sendet Force an Server (nur MainTick)
     */
    async sendForce(force) {
        if (this.type !== 'maintick') return;

        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/maintick/force/${encodeURIComponent(this.token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Send force error:', error);
            return false;
        }
    }

    /**
     * Sendet Manual Force an Server
     */
    async sendManualForce(force) {
        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/${this.type}/manual-force/${encodeURIComponent(this.token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Send manual force error:', error);
            return false;
        }
    }

    /**
     * Lädt Preset vom Server
     */
    async loadPreset(presetName, stopwatch) {
        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/preset/${encodeURIComponent(presetName)}`);
            
            if (response.ok) {
                const preset = await response.json();
                
                // Wende Preset-Forces an
                if (preset.forces && Array.isArray(preset.forces)) {
                    for (const force of preset.forces) {
                        stopwatch.addForce(force);
                    }
                }
                
                stopwatch.updateStatus(`Preset "${presetName}" geladen`);
            }
        } catch (error) {
            console.error('Load preset error:', error);
        }
    }

    /**
     * Speichert Preset (nur MainTick)
     */
    async savePreset(preset) {
        if (this.type !== 'maintick') return false;

        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/preset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...preset,
                    token: this.token
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Save preset error:', error);
            return false;
        }
    }

    /**
     * Holt alle verfügbaren Presets
     */
    async getPresets() {
        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/presets/${encodeURIComponent(this.token)}`);
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Get presets error:', error);
        }
        
        return [];
    }

    /**
     * Verbindet MainTick mit ModulTick
     */
    async connectToModulTick(modulTickToken) {
        if (this.type !== 'maintick') return;

        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mainTickToken: this.token,
                    modulTickToken: modulTickToken
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Connect error:', error);
            return false;
        }
    }

    /**
     * Sendet aktuelle Stopwatch-Status an Server
     */
    async sendStatus(status) {
        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/${this.type}/status/${encodeURIComponent(this.token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Send status error:', error);
            return false;
        }
    }

    /**
     * Aktiviert Preset per API (für ModulTick)
     */
    async activatePreset(presetName) {
        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/${this.type}/activate-preset/${encodeURIComponent(this.token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presetName })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Activate preset error:', error);
            return false;
        }
    }

    /**
     * Sendet manuellen Force direkt
     */
    async sendManualForce(force) {
        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/${this.type}/manual-force/${encodeURIComponent(this.token)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    force: {
                        ...force,
                        id: Date.now().toString() // Generiere eindeutige ID
                    }
                })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Send manual force error:', error);
            return false;
        }
    }

    /**
     * Löscht ein Preset
     */
    async deletePreset(presetName) {
        if (this.type !== 'maintick') return false;

        try {
            const response = await fetch(`${this.apiBase}/api/stopwatch/preset/${encodeURIComponent(presetName)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.token })
            });
            
            return response.ok;
        } catch (error) {
            console.error('Delete preset error:', error);
            return false;
        }
    }
}

// Export für globale Nutzung
window.StopwatchAPI = StopwatchAPI;