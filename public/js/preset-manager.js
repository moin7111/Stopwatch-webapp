(function(){
	class PresetManager {
		constructor(){ this._overlay = null; }

		open(stopwatch, api){ this._render(true); }
		openReadOnly(stopwatch, api){ this._render(false); }

		_render(editable){
			if (this._overlay) this._close();
			const overlay = document.createElement('div');
			overlay.className = 'pm-overlay';
			const modal = document.createElement('div');
			modal.className = 'pm-modal';
			modal.innerHTML = `
				<div class="pm-title">Preset Manager ${editable ? '' : '(Nur Ansicht)'}</div>
				<div class="pm-content">
					<p style="opacity:.8">Diese Vorschau zeigt Preset-Funktionen. Vollständige Bearbeitung folgt.</p>
					<ul class="pm-list">
						<li>Lotterie-Vorhersage (ms:43, s:20, ft:2443)</li>
					</ul>
				</div>
				<div class="pm-actions">
					<button class="pm-close">Schließen</button>
				</div>
			`;
			const close = ()=>{ this._close(); };
			modal.querySelector('.pm-close').addEventListener('click', close);
			overlay.addEventListener('click', (e)=>{ if (e.target===overlay) close(); });
			overlay.appendChild(modal);
			document.body.appendChild(overlay);
			this._overlay = overlay;
		}

		_close(){ try { document.body.removeChild(this._overlay); } catch(e){} this._overlay = null; }
	}

	const style = document.createElement('style');
	style.textContent = `
	.pm-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1800}
	.pm-modal{width:92%;max-width:520px;background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px;color:#fff}
	.pm-title{font-size:18px;font-weight:700;margin-bottom:10px}
	.pm-content{font-size:14px}
	.pm-list{margin:10px 0 0 18px}
	.pm-actions{display:flex;justify-content:flex-end;margin-top:12px}
	.pm-actions .pm-close{background:#333;color:#fff;border:0;border-radius:10px;padding:8px 12px;cursor:pointer}
	`;
	document.head.appendChild(style);

	window.PresetManager = new PresetManager();
})();