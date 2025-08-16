// public/js/shared.js
window.api = {
  async getJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async postJSON(url, body) {
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(j));
    return j;
  },
  async del(url) {
    const res = await fetch(url, { method:'DELETE' });
    const j = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(j));
    return j;
  }
};
