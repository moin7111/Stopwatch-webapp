(function(){
	function createEl(tag, attrs, children){
		const el = document.createElement(tag);
		if (attrs) Object.entries(attrs).forEach(([k,v]) => { if (k==='style' && typeof v==='object'){ Object.assign(el.style, v); } else if (k==='class') { el.className = v; } else { el.setAttribute(k, v); } });
		(children||[]).forEach(c => el.appendChild(typeof c==='string' ? document.createTextNode(c) : c));
		return el;
	}

	function open(stopwatch, api){
		const overlay = createEl('div', { class: 'mi-overlay' });
		const modal = createEl('div', { class: 'mi-modal' });
		const title = createEl('div', { class: 'mi-title' }, [document.createTextNode('Manual Force')]);
		const tabs = createEl('div', { class: 'mi-tabs' });
		const content = createEl('div', { class: 'mi-content' });
		const status = createEl('div', { class: 'mi-status' });
		const closeBtn = createEl('button', { class: 'mi-close' }, [document.createTextNode('Schließen')]);

		const modes = [
			{ key: 'ms', label: 'MS (Centisekunden)' },
			{ key: 's', label: 'S (Quersumme)' },
			{ key: 'ft', label: 'FT (SSCC)' }
		];
		let active = 'ms';

		function renderTabs(){
			tabs.innerHTML='';
			modes.forEach(m => {
				const btn = createEl('button', { class: 'mi-tab' + (active===m.key?' active':'') }, [m.label]);
				btn.addEventListener('click', () => { active = m.key; renderTabs(); renderContent(); });
				tabs.appendChild(btn);
			});
		}
		function renderContent(){
			content.innerHTML='';
			if (active === 'ms') {
				const input = createEl('input', { type: 'number', min: '0', max: '99', placeholder: '0-99' });
				content.appendChild(input);
				content.appendChild(createEl('div', { class: 'mi-help' }, [document.createTextNode('Setze Centisekunden (letzte zwei Ziffern)')]));
				modal._getValue = () => ({ mode: 'ms', target: Number(input.value) });
			}
			if (active === 's') {
				const input = createEl('input', { type: 'number', placeholder: 'Ziel-Quersumme' });
				content.appendChild(input);
				content.appendChild(createEl('div', { class: 'mi-help' }, [document.createTextNode('Manipuliert nur Centisekunden, um Summe zu erreichen')]));
				modal._getValue = () => ({ mode: 's', target: Number(input.value) });
			}
			if (active === 'ft') {
				const input = createEl('input', { type: 'text', placeholder: 'SSCC (z.B. 2443)', maxlength: '4' });
				content.appendChild(input);
				content.appendChild(createEl('div', { class: 'mi-help' }, [document.createTextNode('Setzt komplette Zeit (Sekunden/CS)')]));
				modal._getValue = () => ({ mode: 'ft', target: String(input.value || '').padStart(4,'0') });
			}
		}

		const actions = createEl('div', { class: 'mi-actions' });
		const submitBtn = createEl('button', { class: 'mi-submit' }, [document.createTextNode('Senden')]);
		actions.appendChild(submitBtn);

		closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
		submitBtn.addEventListener('click', async () => {
			const force = modal._getValue ? modal._getValue() : null;
			if (!force || !force.mode) { status.textContent = 'Ungültige Eingabe'; return; }
			// Validate ranges
			if (force.mode === 'ms' && (force.target < 0 || force.target > 99)) { status.textContent = 'MS 0-99'; return; }
			if (force.mode === 'ft' && !/^\d{4}$/.test(force.target)) { status.textContent = 'Format SSCC'; return; }
			if (api && typeof api.sendForce === 'function' && String(api.type).toLowerCase() === 'tempra') {
				const res = await api.sendForce({ mode: force.mode, target: force.target, trigger: 'egal', app: 'tempra' });
				status.textContent = res && res.ok ? 'Gesendet' : 'Fehler beim Senden';
				if (res && res.ok) setTimeout(() => { try { document.body.removeChild(overlay); } catch(e){} }, 300);
			} else {
				status.textContent = 'Readonly-Modus: Nur Tempra kann senden';
			}
		});

		renderTabs();
		renderContent();
		modal.appendChild(title);
		modal.appendChild(tabs);
		modal.appendChild(content);
		modal.appendChild(actions);
		modal.appendChild(status);
		modal.appendChild(closeBtn);
		overlay.appendChild(modal);
		document.body.appendChild(overlay);
	}

	// Basic styles (scoped)
	const style = document.createElement('style');
	style.textContent = `
	.mi-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:2000}
	.mi-modal{width:90%;max-width:420px;background:#111;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:16px;color:#fff}
	.mi-title{font-weight:700;font-size:18px;margin-bottom:10px}
	.mi-tabs{display:flex;gap:6px;margin-bottom:10px}
	.mi-tab{flex:1;padding:8px 10px;border-radius:10px;background:#1c1c1c;border:1px solid rgba(255,255,255,0.1);color:#fff;cursor:pointer}
	.mi-tab.active{background:#2a2a2a}
	.mi-content input{width:100%;padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:#1a1a1a;color:#fff}
	.mi-help{font-size:12px;opacity:0.7;margin-top:6px}
	.mi-actions{display:flex;justify-content:flex-end;margin-top:12px}
	.mi-submit{background:#2DD4BF;color:#000;border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}
	.mi-status{font-size:12px;margin-top:8px;color:#9BA1A6}
	.mi-close{margin-top:8px;background:#333;color:#fff;border:0;border-radius:10px;padding:8px 12px;cursor:pointer}
	`;
	document.head.appendChild(style);

	window.ManualInput = { open };
})();