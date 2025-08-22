(function(){
	class StopwatchAPI {
		constructor(token, type){
			this.token = token;
			this.type = type || 'tempra';
			this._pollId = null;
			this._lastQueueTs = 0;
			StopwatchAPI.instance = this;
		}

		startPolling(stopwatch){
			if (this._pollId) return;
			const intervalMs = 400;
			this._pollId = setInterval(async () => {
				try {
					const res = await fetch(`/api/data/${encodeURIComponent(this.token)}`, { headers: { 'Accept': 'application/json' } });
					if (!res.ok) return;
					const data = await res.json();
					const queue = Array.isArray(data.queue) ? data.queue : [];
					for (const item of queue) {
						stopwatch.enqueueForce(item);
					}
				} catch (e) {
					// swallow polling errors
				}
			}, intervalMs);
		}

		stopPolling(){ if (this._pollId) { clearInterval(this._pollId); this._pollId = null; } }

		async sendForce(force){
			const payload = { ...(force || {}), app: String(this.type || 'tempral') };
			const res = await fetch(`/api/data/${encodeURIComponent(this.token)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});
			try { return await res.json(); } catch (e) { return { ok: false }; }
		}

		async ack(forceId){
			try {
				await fetch(`/api/ack/${encodeURIComponent(this.token)}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ forceId })
				});
			} catch (e) {}
		}
	}

	window.StopwatchAPI = StopwatchAPI;
})();