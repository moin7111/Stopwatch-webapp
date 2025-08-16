/**
 * Stoppuhr Core - Kern-Funktionalität für MainTick und ModulTick
 */

class StopwatchCore {
    constructor() {
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerInterval = null;
        this.isRunning = false;
        this.lapCounter = 0;
        this.laps = [];
        this.currentLapStartTime = 0;
        
        // Force queue und Einstellungen
        this.forceQueue = [];
        this.pressCounts = { stop: 0, lap: 0 };
        this.resetCount = 0;
        
        // UI Elements
        this.timeDisplay = null;
        this.leftButton = null;
        this.rightButton = null;
        this.lapsContainer = null;
        this.statusText = null;
    }

    /**
     * Initialisiert die UI-Elemente
     */
    initUI(elements) {
        this.timeDisplay = elements.timeDisplay;
        this.leftButton = elements.leftButton;
        this.rightButton = elements.rightButton;
        this.lapsContainer = elements.lapsContainer;
        this.statusText = elements.statusText;
        
        // Event Listeners
        this.rightButton.addEventListener('click', () => this.handleRightButton());
        this.leftButton.addEventListener('click', () => this.handleLeftButton());
        
        // Triple-click für Stoppuhr (Manual Input)
        let clickCount = 0;
        let clickTimer = null;
        this.timeDisplay.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 3) {
                this.openManualInput();
                clickCount = 0;
            }
            clearTimeout(clickTimer);
            clickTimer = setTimeout(() => clickCount = 0, 500);
        });
        
        // Initial state
        this.leftButton.disabled = true;
        this.setRightButtonStyle('Start');
        this.updateDisplay();
    }

    /**
     * Formatiert Millisekunden zu MM:SS,CC
     */
    formatTime(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const centiseconds = Math.floor((milliseconds % 1000) / 10);
        return `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')},${centiseconds.toString().padStart(2,'0')}`;
    }

    /**
     * Konvertiert Zeit-String zu Millisekunden
     */
    timeStringToMs(timeString) {
        const parts = timeString.split(':');
        const minutes = parseInt(parts[0], 10) || 0;
        const secondsParts = (parts[1] || '00').split(',');
        const seconds = parseInt(secondsParts[0], 10) || 0;
        const centiseconds = parseInt(secondsParts[1], 10) || 0;
        return (minutes * 60 + seconds) * 1000 + centiseconds * 10;
    }

    /**
     * Berechnet Quersumme der formatierten Zeit
     */
    digitSumOfFormatted(ms) {
        const s = this.formatTime(ms);
        return s.replace(/[^0-9]/g, '').split('').reduce((a, c) => a + parseInt(c, 10), 0);
    }

    /**
     * Findet nächste Zeit mit bestimmter Quersumme
     */
    findNearestWithDigitSum(startMs, targetSum, maxForward = 5000) {
        const step = 10;
        const maxSteps = Math.floor(maxForward / step);
        for (let i = 0; i <= maxSteps; i++) {
            const candidate = startMs + i * step;
            if (this.digitSumOfFormatted(candidate) === targetSum) return candidate;
        }
        return null;
    }

    /**
     * Berechnet Force-Zeit basierend auf Mode
     */
    computeForcedTime(realMs, force) {
        if (!force) return null;
        
        // MS-Force: Millisekunden werden forciert
        if (force.mode === 'ms') {
            const target = Number(force.target);
            if (isNaN(target) || target < 0 || target > 99) return null;
            
            // Extrahiere aktuelle Zeit-Komponenten
            const totalSeconds = Math.floor(realMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            // Setze neue Millisekunden
            return minutes * 60000 + seconds * 1000 + target * 10;
        }
        
        // S-Force: Quersumme wird forciert
        if (force.mode === 's') {
            const target = Number(force.target);
            if (isNaN(target)) return null;
            
            // Berechne aktuelle Quersumme
            const currentSum = this.digitSumOfFormatted(realMs);
            if (currentSum === target) return realMs; // Bereits richtig
            
            // Versuche durch Änderung der Millisekunden die Ziel-Quersumme zu erreichen
            const totalSeconds = Math.floor(realMs / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            
            // Probiere verschiedene Millisekunden-Werte
            for (let ms = 0; ms <= 99; ms++) {
                const testMs = minutes * 60000 + seconds * 1000 + ms * 10;
                if (this.digitSumOfFormatted(testMs) === target) {
                    return testMs;
                }
            }
            
            // Wenn keine passende Millisekunde gefunden wurde, kein Force
            return null;
        }
        
        // FT-Force: Volle Zeit wird forciert (SSCC Format)
        if (force.mode === 'ft') {
            const target = force.target.toString().replace(/[^0-9]/g, '');
            if (target.length !== 4) return null;
            
            // Beispiel: 2443 -> 00:24.43 (24 Sekunden, 43 Centisekunden)
            const seconds = parseInt(target.substring(0, 2), 10);
            const centiseconds = parseInt(target.substring(2, 4), 10);
            
            if (seconds >= 60 || centiseconds >= 100) return null; // Ungültige Werte
            
            // Berechne die forcierte Zeit in Millisekunden
            const forcedMs = seconds * 1000 + centiseconds * 10;
            
            return forcedMs;
        }
        
        return null;
    }

    /**
     * Wendet Force an wenn Bedingungen erfüllt sind
     */
    async applyIfTriggered(eventType, realMs) {
        if (!this.pressCounts[eventType]) this.pressCounts[eventType] = 0;
        this.pressCounts[eventType]++;

        if (this.forceQueue.length === 0) return null;

        const entry = this.forceQueue[0];
        const f = entry.force || {};
        
        // Prüfe Trigger (stop, lap oder egal)
        if (f.trigger && f.trigger !== eventType && f.trigger !== 'egal') return null;
        
        // Prüfe Bedingungen
        if (f.condition) {
            const conditionMet = this.checkCondition(f.condition, eventType, realMs);
            if (!conditionMet) return null;
        }

        // Bei Listen-Force
        if (f.mode === 'list' && Array.isArray(f.list) && f.list.length > 0) {
            const sub = f.list.shift();
            if (f.list.length === 0) {
                this.forceQueue.shift();
            } else {
                this.forceQueue[0].force = f;
            }
            const computed = this.computeForcedTime(realMs, sub);
            return computed;
        }

        // Normaler Force
        const computed = this.computeForcedTime(realMs, f);
        if (computed !== null) {
            this.forceQueue.shift();
            return computed;
        }

        return null;
    }

    /**
     * Prüft ob eine Bedingung erfüllt ist
     */
    checkCondition(condition, eventType, realMs) {
        if (!condition || !condition.type || !condition.value) return true;
        
        const value = Number(condition.value);
        if (isNaN(value)) return true;
        
        switch (condition.type) {
            case 'sekunden':
                // Nach X Sekunden
                const seconds = Math.floor(realMs / 1000);
                return seconds >= value;
                
            case 'stops':
                // Nach X Stops
                return this.pressCounts.stop >= value;
                
            case 'runden':
                // Nach X Runden
                return this.lapCounter >= value;
                
            case 'loeschen':
                // Nach X mal Löschen
                if (!this.resetCount) this.resetCount = 0;
                return this.resetCount >= value;
                
            default:
                return true;
        }
    }

    /**
     * Aktualisiert die Anzeige
     */
    updateDisplay() {
        const now = Date.now();
        const total = this.elapsedTime + (this.isRunning ? (now - this.startTime) : 0);
        this.timeDisplay.textContent = this.formatTime(total);

        if (this.laps.length > 0 && this.laps[0].isCurrent) {
            let currentLapElapsed;
            if (this.isRunning) {
                currentLapElapsed = now - this.currentLapStartTime;
            } else {
                currentLapElapsed = this.timeStringToMs(this.laps[0].time);
            }
            this.laps[0].time = this.formatTime(currentLapElapsed);
            this.updateLapsDisplay();
        }
    }

    /**
     * Aktualisiert die Runden-Anzeige
     */
    updateLapsDisplay() {
        this.lapsContainer.innerHTML = '';
        const completedLaps = this.laps.filter(l => !l.isCurrent);
        let fastest = null, slowest = null, fastestIdx = -1, slowestIdx = -1;
        
        if (completedLaps.length >= 2) {
            completedLaps.forEach(lap => {
                const ms = this.timeStringToMs(lap.time);
                if (fastest === null || ms < fastest) {
                    fastest = ms;
                    fastestIdx = this.laps.indexOf(lap);
                }
                if (slowest === null || ms > slowest) {
                    slowest = ms;
                    slowestIdx = this.laps.indexOf(lap);
                }
            });
        }
        
        this.laps.forEach((lap, idx) => {
            const el = document.createElement('div');
            let cls = 'lap-item';
            if (!lap.isCurrent && completedLaps.length >= 2) {
                if (idx === fastestIdx) cls += ' fastest';
                else if (idx === slowestIdx) cls += ' slowest';
            }
            el.className = cls;
            el.innerHTML = `<span class="lap-number">Runde ${lap.number}</span><span class="lap-time">${lap.time}</span>`;
            this.lapsContainer.appendChild(el);
        });
    }

    /**
     * Setzt den Stil des rechten Buttons
     */
    setRightButtonStyle(text) {
        this.rightButton.classList.remove('right-start', 'right-running', 'right-continue');
        if (text === 'Start') {
            this.rightButton.classList.add('right-start');
            this.rightButton.textContent = 'Start';
        } else if (text === 'Stopp') {
            this.rightButton.classList.add('right-running');
            this.rightButton.textContent = 'Stopp';
        } else if (text === 'Weiter') {
            this.rightButton.classList.add('right-continue');
            this.rightButton.textContent = 'Weiter';
        } else {
            this.rightButton.classList.add('right-start');
            this.rightButton.textContent = text;
        }
    }

    /**
     * Startet die Stoppuhr
     */
    startStopwatch() {
        this.isRunning = true;
        this.startTime = Date.now();

        if (this.lapCounter === 0) {
            // Erste Mal starten
            this.currentLapStartTime = this.startTime;
            this.lapCounter = 1;
            this.laps.unshift({ number: this.lapCounter, time: '00:00,00', isCurrent: true });
            this.updateLapsDisplay();
        } else {
            // Resume - aktuelle Runde Zeit beibehalten
            if (this.laps.length > 0 && this.laps[0].isCurrent) {
                // Berechne wie lange die aktuelle Runde vor dem Stop gelaufen ist
                const currentLapMs = this.timeStringToMs(this.laps[0].time);
                // Setze neue Start-Zeit für die aktuelle Runde
                this.currentLapStartTime = this.startTime - currentLapMs;
            }
        }

        this.timerInterval = setInterval(() => this.updateDisplay(), 10);

        this.setRightButtonStyle('Stopp');
        this.leftButton.textContent = 'Runde';
        this.leftButton.className = 'control-button left left-running';
        this.leftButton.disabled = false;

        this.resetCounters();
    }

    /**
     * Stoppt die Stoppuhr
     */
    async stopStopwatch() {
        this.isRunning = false;
        const now = Date.now();
        const realTotal = this.elapsedTime + (now - this.startTime);
        clearInterval(this.timerInterval);

        let forcedMs = await this.applyIfTriggered('stop', realTotal);
        const finalMs = (typeof forcedMs === 'number' && !isNaN(forcedMs)) ? forcedMs : realTotal;
        this.elapsedTime = finalMs;

        if (this.laps.length > 0 && this.laps[0].isCurrent) {
            // Bei Force in der Runde
            if (forcedMs !== null) {
                // Berechne die Differenz und passe die Rundenzeit an
                const lapDuration = now - this.currentLapStartTime;
                const adjustment = forcedMs - realTotal;
                const adjustedLapTime = lapDuration + adjustment;
                this.laps[0].time = this.formatTime(adjustedLapTime);
            } else {
                this.laps[0].time = this.formatTime(now - this.currentLapStartTime);
            }
            this.laps[0].isCurrent = false;
            this.updateLapsDisplay();
        }

        this.timeDisplay.textContent = this.formatTime(finalMs);
        this.setRightButtonStyle('Weiter');
        this.leftButton.textContent = 'Löschen';
        this.leftButton.className = 'control-button left left-stopped';
    }

    /**
     * Setzt die Stoppuhr zurück
     */
    resetStopwatch() {
        this.isRunning = false;
        this.elapsedTime = 0;
        this.lapCounter = 0;
        this.laps = [];
        this.currentLapStartTime = 0;
        clearInterval(this.timerInterval);
        this.timeDisplay.textContent = '00:00,00';

        this.setRightButtonStyle('Start');
        this.leftButton.textContent = 'Runde';
        this.leftButton.className = 'control-button left left-idle';
        this.leftButton.disabled = true;

        this.updateLapsDisplay();
        
        // Erhöhe Reset Counter für Bedingungen
        this.resetCount++;
    }

    /**
     * Zeichnet eine neue Runde auf
     */
    async recordLap() {
        const now = Date.now();
        const realTotal = this.elapsedTime + (now - this.startTime);

        // Prüfe ob Force für Runde
        let forcedMs = await this.applyIfTriggered('lap', realTotal);

        if (this.laps.length > 0 && this.laps[0].isCurrent) {
            if (forcedMs !== null) {
                // Force wird auf die alte Runde angewendet
                const lapDuration = now - this.currentLapStartTime;
                this.laps[0].time = this.formatTime(forcedMs);
            }
            this.laps[0].isCurrent = false;
        }

        this.lapCounter++;
        this.currentLapStartTime = now;
        this.laps.unshift({ number: this.lapCounter, time: '00:00,00', isCurrent: true });
        this.updateLapsDisplay();
    }

    /**
     * Handler für rechten Button
     */
    handleRightButton() {
        const txt = this.rightButton.textContent.trim();
        if (txt === 'Start' || (txt === 'Weiter' && !this.isRunning)) {
            this.startStopwatch();
        } else if (txt === 'Stopp' && this.isRunning) {
            this.stopStopwatch();
        }
    }

    /**
     * Handler für linken Button
     */
    handleLeftButton() {
        if (this.isRunning) {
            this.recordLap();
        } else if (this.elapsedTime > 0) {
            this.resetStopwatch();
        }
    }

    /**
     * Setzt Zähler zurück
     */
    resetCounters() {
        this.pressCounts = { stop: 0, lap: 0 };
    }

    /**
     * Fügt Force zur Queue hinzu
     */
    addForce(force) {
        this.forceQueue.push({ force, id: Date.now() });
    }

    /**
     * Öffnet Manual Input Dialog
     */
    openManualInput() {
        if (window.ManualInput && window.ManualInput.instance) {
            // Finde API-Instanz aus dem globalen Scope
            const api = window.api || null;
            window.ManualInput.open(this, api);
        } else {
            console.error('ManualInput not found');
            this.updateStatus('Manual Input nicht verfügbar');
        }
    }

    /**
     * Aktualisiert Status-Text
     */
    updateStatus(text) {
        if (this.statusText) {
            this.statusText.textContent = text;
        }
    }
}

// Export für globale Nutzung
window.StopwatchCore = StopwatchCore;