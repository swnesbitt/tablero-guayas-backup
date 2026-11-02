/* Copyright and license line, shared by every Tablero de Guayas page. */
window.renderCopy = function () {
  const lang = (document.documentElement.lang || 'es').slice(0, 2);
  const yr = new Date().getFullYear();
  const lic = '<a href="https://creativecommons.org/licenses/by-nc/4.0/' + (lang === 'es' ? 'deed.es' : '') + '" target="_blank" rel="license noopener">CC BY-NC 4.0</a>';
  const txt = lang === 'es'
    ? `© ${yr} Board of Trustees of the University of Illinois. Bajo licencia ${lic} (uso no comercial). <a href="aviso-legal.html#licencia">Aviso legal</a>.`
    : `© ${yr} Board of Trustees of the University of Illinois. Licensed under ${lic} (non-commercial use). <a href="aviso-legal.html#license">Legal notice</a>.`;
  let el = document.getElementById('copy');
  if (!el) { el = document.createElement('div'); el.id = 'copy'; el.className = 'copy'; document.body.appendChild(el); }
  el.innerHTML = txt;
  if (window.renderPartners) renderPartners();
};
renderCopy();
