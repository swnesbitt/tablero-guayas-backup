/* Sponsor and coordinator credits, shared by every Tablero de Guayas page and the data portal
 * (/wrf-datos/ carries a copy). Mirrors the "Con el auspicio de / Coordinado por" block on the
 * site landing page. Renders just above #copy and follows <html lang>; call renderPartners()
 * again after a language switch (renderCopy does it). */
(function () {
  const S = document.currentScript && document.currentScript.dataset.assets || 'assets/';
  const L = {
    es: { spon: 'Con el auspicio de', coord: 'Coordinado por', prov: 'Provincia del Guayas, Ecuador',
          climas: 'Clima, Meteorología y Ciencias Atmosféricas', clacs: 'Centro de Estudios Latinoamericanos y del Caribe' },
    en: { spon: 'Supported by', coord: 'Coordinated by', prov: 'Province of Guayas, Ecuador',
          climas: 'Climate, Meteorology & Atmospheric Sciences', clacs: 'Center for Latin American & Caribbean Studies' },
  };
  const css = `
  .ptn{margin:18px 14px 0;padding:16px 2px 4px;border-top:1px solid var(--line);display:grid;gap:14px;
       grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}
  .ptn h2{margin:0 0 9px;padding:0;border:0;font-size:11.5px;font-weight:650;text-transform:uppercase;letter-spacing:.11em;color:var(--muted)}
  .ptn ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center}
  .ptn li,.ptn li a{display:flex;align-items:center;gap:9px;color:var(--ink);text-decoration:none;font-size:13.5px;font-weight:600;line-height:1.25}
  .ptn li a:hover span{text-decoration:underline}
  .ptn li a:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
  .ptn img{height:28px;width:auto;flex:none;display:block;background:#fff;border-radius:3px}
  .ptn img.flag{border:1px solid var(--line);border-radius:0}
  .ptn small{display:block;font-size:12px;font-weight:400;color:var(--muted)}`;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  const esc = (s) => s.replace(/&/g, '&amp;');
  const link = (href, img, name) =>
    `<li><a href="${href}" target="_blank" rel="noopener noreferrer"><img src="${S}${img}" alt="" aria-hidden="true" onerror="this.remove()"><span>${esc(name)}</span></a></li>`;

  window.renderPartners = function () {
    const lang = (document.documentElement.lang || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
    const t = L[lang];
    let el = document.getElementById('partners');
    if (!el) {
      el = document.createElement('section');
      el.id = 'partners';
      el.className = 'ptn';
      const copy = document.getElementById('copy');
      if (copy) copy.before(el); else document.body.appendChild(el);
    }
    el.setAttribute('aria-label', `${t.spon} · ${t.coord}`);
    el.innerHTML =
      `<div><h2>${t.spon}</h2><ul>` +
        `<li><img class="flag" src="${S}guayas-flag.svg" alt="" aria-hidden="true" onerror="this.remove()"><span>Prefectura del Guayas<small>${t.prov}</small></span></li>` +
        `<li><span>Fundación Santiago de Guayaquil<small>Guayaquil, Ecuador</small></span></li>` +
      `</ul></div>` +
      `<div><h2>${t.coord}</h2><ul>` +
        link('https://climas.illinois.edu', 'climas-logo.png', t.climas) +
        link('https://clacs.illinois.edu/', 'clacs-logo.png', t.clacs) +
        link('https://iin.uillinois.edu/', 'iin-logo.png', 'Illinois Innovation Network') +
      `</ul></div>`;
  };
  renderPartners();
})();
