(function(){
	class StopwatchCore {
		constructor() {
			this.isRunning = false;
			this.startTimestampMs = 0;
			this.baseElapsedMs = 0; // accumulated when stopped
			this.timerId = null;
			this.ui = { timeDisplay: null, leftButton: null, rightButton: null, lapsContainer: null, statusText: null };
			this.laps = [];
			this.forceQueue = [];
			this.processedForceIds = new Set(this._loadProcessedIds());
			this._bindedTick = this._tick.bind(this);
			window.stopwatch = this;
		}

		initUI(refs){
			this.ui = refs;

			// Buttons
			if (this.ui.leftButton) this.ui.leftButton.addEventListener('click', () => this._handleLeft());
			if (this.ui.rightButton) this.ui.rightButton.addEventListener('click', () => this._handleRight());

			// Space toggles start/stop
			window.addEventListener('keydown', (e) => {
				if (e.key === ' ') { e.preventDefault(); this._handleRight(); }
			});

			// Triple click on time for manual input
			let tCount = 0; let tTimer = null;
			if (this.ui.timeDisplay) {
				this.ui.timeDisplay.addEventListener('click', () => {
					tCount++;
					if (tCount === 3) {
						if (window.ManualInput && window.ManualInput.open) {
							window.ManualInput.open(this, window.api);
						}
						tCount = 0;
					}
					clearTimeout(tTimer);
					tTimer = setTimeout(() => tCount = 0, 500);
				});
			}

			this._renderButtons();
			this._renderTime(0);
		}

		// Public API
		start(){
			if (this.isRunning) return;
			this.isRunning = true;
			this.startTimestampMs = Date.now();
			this.timerId = setInterval(this._bindedTick, 33);
			this._renderButtons();
			this.updateStatus('Gestartet');
		}

		stop(){
			if (!this.isRunning) return;
			this.isRunning = false;
			clearInterval(this.timerId); this.timerId = null;
			this.baseElapsedMs = this._currentElapsedMs();
			this._renderButtons();
			this.updateStatus('Gestoppt');
			this._processForces('stop');
		}

		resume(){
			if (this.isRunning) return;
			this.isRunning = true;
			this.startTimestampMs = Date.now();
			this.timerId = setInterval(this._bindedTick, 33);
			this._renderButtons();
			this.updateStatus('Weiter');
		}

		reset(){
			this.isRunning = false;
			if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
			this.baseElapsedMs = 0;
			this.laps = [];
			this._renderLaps();
			this._renderTime(0);
			this._renderButtons();
			this.updateStatus('Zurückgesetzt');
		}

		lap(){
			const ms = this._currentElapsedMs();
			this.laps.push(ms);
			this._renderLaps();
			this._processForces('lap');
		}

		updateStatus(text){
			try { if (this.ui.statusText) this.ui.statusText.textContent = text || '\u00A0'; } catch (e) {}
		}

		enqueueForce(item){
			if (!item || !item.id) return;
			if (this.processedForceIds.has(item.id)) return;
			// prevent duplicates in queue
			if (!this.forceQueue.find(f => f.id === item.id)) {
				this.forceQueue.push(item);
			}
		}

		// Private
		_tick(){
			this._renderTime(this._currentElapsedMs());
		}

		_currentElapsedMs(){
			if (!this.isRunning) return this.baseElapsedMs;
			const delta = Date.now() - this.startTimestampMs;
			return this.baseElapsedMs + delta;
		}

		_renderTime(totalMs){
			if (!this.ui.timeDisplay) return;
			const mm = Math.floor(totalMs / 60000);
			const ss = Math.floor((totalMs % 60000) / 1000);
			const cs = Math.floor((totalMs % 1000) / 10);
			const str = `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')},${String(cs).padStart(2,'0')}`;
			this.ui.timeDisplay.textContent = str;
		}

		_renderButtons(){
			if (!this.ui.leftButton || !this.ui.rightButton) return;
			if (!this.isRunning && this.baseElapsedMs === 0) {
				// initial
				this.ui.leftButton.textContent = 'Runde';
				this.ui.leftButton.className = 'control-button left left-idle';
				this.ui.leftButton.disabled = true;
				this.ui.rightButton.textContent = 'Start';
				this.ui.rightButton.className = 'control-button right right-start';
				return;
			}
			if (this.isRunning) {
				this.ui.leftButton.textContent = 'Runde';
				this.ui.leftButton.className = 'control-button left left-lap';
				this.ui.leftButton.disabled = false;
				this.ui.rightButton.textContent = 'Stop';
				this.ui.rightButton.className = 'control-button right right-stop';
				return;
			}
			// stopped with time
			this.ui.leftButton.textContent = 'Löschen';
			this.ui.leftButton.className = 'control-button left left-reset';
			this.ui.leftButton.disabled = false;
			this.ui.rightButton.textContent = 'Weiter';
			this.ui.rightButton.className = 'control-button right right-resume';
		}

		_renderLaps(){
			if (!this.ui.lapsContainer) return;
			this.ui.lapsContainer.innerHTML = '';
			this.laps.slice().reverse().forEach((ms, idx) => {
				const el = document.createElement('div');
				el.className = 'lap-item';
				el.innerHTML = `<div>#${this.laps.length - idx}</div><div>${this._formatMs(ms)}</div>`;
				this.ui.lapsContainer.appendChild(el);
			});
		}

		_handleLeft(){
			if (this.isRunning) {
				this.lap();
			} else {
				this.reset();
			}
		}

		_handleRight(){
			if (!this.isRunning) {
				if (this.baseElapsedMs === 0) this.start(); else this.resume();
			} else {
				this.stop();
			}
		}

		_formatMs(totalMs){
			const mm = Math.floor(totalMs / 60000);
			const ss = Math.floor((totalMs % 60000) / 1000);
			const cs = Math.floor((totalMs % 1000) / 10);
			return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')},${String(cs).padStart(2,'0')}`;
		}

		_processForces(trigger){
			if (!this.forceQueue.length) return;
			// Find first applicable force
			for (let i = 0; i < this.forceQueue.length; i++) {
				const item = this.forceQueue[i];
				const force = item.force || {};
				const trg = (force.trigger || 'egal').toLowerCase();
				if (trg === 'egal' || trg === trigger) {
					const applied = this._applyForce(force);
					if (applied) {
						this._markProcessed(item.id);
						this.forceQueue.splice(i, 1);
						if (window.api && typeof window.api.ack === 'function') {
							try { window.api.ack(item.id); } catch (e) {}
						}
						break;
					}
				}
			}
		}

		_applyForce(force){
			try {
				const mode = String(force.mode || force.force_type || '').toLowerCase();
				if (!mode) return false;
				if (mode === 'ms') {
					const target = Number(force.target ?? force.value);
					if (Number.isNaN(target) || target < 0 || target > 99) return false;
					const total = this._currentElapsedMs();
					const mm = Math.floor(total / 60000);
					const ss = Math.floor((total % 60000) / 1000);
					const cs = target;
					this.baseElapsedMs = mm * 60000 + ss * 1000 + cs * 10;
					this._renderTime(this.baseElapsedMs);
					return true;
				}
				if (mode === 'ft') {
					let v = String(force.target ?? force.value ?? '');
					if (!/^[0-9]{4}$/.test(v)) return false;
					const ss = Number(v.slice(0,2));
					const cs = Number(v.slice(2,4));
					if (ss < 0 || ss > 59 || cs < 0 || cs > 99) return false;
					this.baseElapsedMs = ss * 1000 + cs * 10; // minutes set to 0 per spec
					this._renderTime(this.baseElapsedMs);
					return true;
				}
				if (mode === 's') {
					const targetSum = Number(force.target ?? force.value);
					if (!Number.isFinite(targetSum)) return false;
					const total = this._currentElapsedMs();
					const mm = Math.floor(total / 60000);
					const ss = Math.floor((total % 60000) / 1000);
					const digitsSum = (n)=>String(n).split('').reduce((a,b)=>a+Number(b),0);
					const baseSum = digitsSum(mm) + digitsSum(ss);
					let found = null;
					for (let cs = 0; cs < 100; cs++) {
						if (baseSum + digitsSum(cs) === targetSum) { found = cs; break; }
					}
					if (found === null) return false;
					this.baseElapsedMs = mm * 60000 + ss * 1000 + found * 10;
					this._renderTime(this.baseElapsedMs);
					return true;
				}
				return false;
			} catch (e) { return false; }
		}

		_markProcessed(id){
			this.processedForceIds.add(id);
			this._saveProcessedIds();
		}
		_loadProcessedIds(){
			try {
				const raw = localStorage.getItem('stopwatch_processed_force_ids') || '[]';
				const arr = JSON.parse(raw);
				return Array.isArray(arr) ? arr : [];
			} catch (e) { return []; }
		}
		_saveProcessedIds(){
			try {
				const arr = Array.from(this.processedForceIds).slice(-200);
				localStorage.setItem('stopwatch_processed_force_ids', JSON.stringify(arr));
			} catch (e) {}
		}
	}

	window.StopwatchCore = StopwatchCore;
})();