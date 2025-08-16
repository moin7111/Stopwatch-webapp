// public/js/magician.js
const Magician = (function(){
  async function init(){
    // check login
    const s = await fetch('/auth/status').then(r=>r.json());
    if (!s.loggedIn) {
      location.href = '/maintick/login.html';
      return;
    }
    // load tokens
    await refreshTokens();
  }

  async function refreshTokens() {
    try {
      const j = await api.getJSON('/api/tokens');
      const cont = document.getElementById('tokensList');
      cont.innerHTML = '';
      if (!j.tokens || j.tokens.length===0) { cont.textContent = 'keine Tokens vorhanden'; return; }
      j.tokens.forEach(t=>{
        const el = document.createElement('div');
        el.style.padding='8px'; el.style.borderBottom='1px solid rgba(255,255,255,0.06)';
        el.innerHTML = `<strong>${t.token}</strong> &nbsp; queued: ${t.queued} &nbsp; <button class="btnOpen">Öffnen</button> <button class="btnDel" style="margin-left:8px">Löschen</button>`;
        el.querySelector('.btnOpen').addEventListener('click', ()=> {
          window.open(`/maintick/stopwatch.html?token=${encodeURIComponent(t.token)}`, '_blank');
        });
        el.querySelector('.btnDel').addEventListener('click', async ()=> {
          if (!confirm('Token löschen?')) return;
          await api.del(`/api/token/${encodeURIComponent(t.token)}`);
          await refreshTokens();
        });
        cont.appendChild(el);
      });
    } catch(e) {
      console.error(e); document.getElementById('tokensList').textContent = 'Fehler beim Laden';
    }
  }

  async function createToken() {
    try {
      const j = await api.postJSON('/api/token', {});
      alert('Token: '+j.token);
      await refreshTokens();
    } catch(e){ alert('Fehler: '+e.message); }
  }

  async function logout(){
    await fetch('/auth/logout', { method:'POST' });
    location.href = '/maintick/login.html';
  }

  return { init, createToken, logout };
})();
