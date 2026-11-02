/* Los próximos 10 días: daily rain at the 25 canton seats from the global ensembles.
 *
 * Reads the ensemble viewer's city summary (ens-view, streams/guayas_cities.json) straight
 * from the same site, so it follows that export hourly without touching the Tablero build.
 * Only 00Z and 12Z cycles are used: the 06/18Z ones carry fewer models, and a "grand
 * ensemble" that silently loses two systems between refreshes would mislead.
 *
 * Days run 12-12 UTC = 07-07 Ecuador time (the gauges' rain day). A day already over when
 * the page loads is dropped, and ten are shown. The first three overlap the 3 km WRF
 * ensemble above and are marked so; WRF is the better guide there, and the two can
 * differ a lot at foothill cantons, so the two sources are never blended.
 */
(function () {
  const ENS = '../ens-view/';
  const ND = 10, WRF_DAYS = 3, LATE = 5;
  const CUTS = [1, 10, 25, 50, 100];          // <1, 1-10, 10-25, 25-50, 50-100, >=100 mm/day
  const ORDER = ['grand', 'ifs_ens', 'aifs_ens', 'gefs_p25', 'aigefs_ens', 'icon_eps'];
  const G = { doc: null, cycle: null, model: 'grand', sort: 'def', err: null };

  const TX = {
    es: { title: 'Ensambles globales · Próximos 10 días', link: 'Abrir el visor de ensambles globales',
      sub: '5 modelos, unos 200 miembros', head: 'Lluvia diaria por cabecera cantonal (07:00 a 07:00, hora de Ecuador)',
      how: 'mediana · P90 (mm en el día)', place: 'Cabecera cantonal', canton: 'cantón',
      grand: 'Gran ensamble', mem: 'miemb.', members: 'miembros', nodata: 'sin datos',
      wrf: 'Días 1–3 · vea el ensamble WRF arriba', mid: 'Días 4–5', late: 'Días 6–10 · menor habilidad',
      sort: 'Ordenar', sdef: 'Ciudades principales primero', swet: 'Más lluvia (P90)', sabc: 'Alfabético',
      init: 'ciclo', loading: 'Cargando los ensambles globales…',
      fail: 'Los ensambles globales no están disponibles en este momento.',
      tip: (a, b, c) => `Mediana ${a} mm · P90 ${b} mm` + (c == null ? '' : ` · ${c}% de los miembros ≥ 25 mm`),
      note: 'El valor de cada ciudad es la celda de unos 28 km que la contiene, no una estación. ' +
            'ICON-EPS llega a 7 días y GEFS a 10: el gran ensamble usa los miembros disponibles cada día (el número bajo cada fecha).',
      click: 'Haga clic en una ciudad para ver todos los miembros',
      pdaily: 'Diario', paccum: 'Acumulado', close: 'Cerrar', pgrand: 'Gran ensamble (P10, mediana, P90)',
      pwrf: 'Ensamble WRF UIUC 3 km (P10, mediana, P90)', pmem: 'miembros', pload: 'Cargando los miembros…',
      pfail: 'No se pudieron cargar los miembros.', pmm: 'mm en el día', pmmacc: 'mm acumulados',
      pnote: 'Cada ensamble se resume como el WRF: la línea es la mediana y la franja va del P10 al P90 de sus miembros. Negro: gran ensamble (todos los modelos juntos); azul: ensamble WRF de la Universidad de Illinois, promediado sobre la misma celda de unos 28 km que los ensambles globales. Días de 07:00 a 07:00, hora de Ecuador.',
      pread: (d, g, w) => `${d}: ${/^[0-9–]/.test(g) ? 'gran ensamble ' : ''}${g}` + (w ? ` · WRF UIUC ${w}` : ''),
      pfocus: 'Haga clic en un ensamble de la leyenda para destacarlo.', punfocus: 'Haga clic de nuevo para ver todos.',
      days: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
      mon: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] },
    en: { title: 'Global ensembles · Next 10 days', link: 'Open the global ensemble viewer',
      sub: '5 models, about 200 members', head: 'Daily rain by canton seat (07:00 to 07:00 Ecuador time)',
      how: 'median · P90 (mm in the day)', place: 'Canton seat', canton: 'canton',
      grand: 'Grand ensemble', mem: 'mem.', members: 'members', nodata: 'no data',
      wrf: 'Days 1–3 · see the WRF ensemble above', mid: 'Days 4–5', late: 'Days 6–10 · lower skill',
      sort: 'Sort', sdef: 'Main cities first', swet: 'Wettest (P90)', sabc: 'Alphabetical',
      init: 'cycle', loading: 'Loading the global ensembles…',
      fail: 'The global ensembles are not available right now.',
      tip: (a, b, c) => `Median ${a} mm · P90 ${b} mm` + (c == null ? '' : ` · ${c}% of members ≥ 25 mm`),
      note: "Each city's value is the roughly 28 km cell that contains it, not a station. " +
            'ICON-EPS reaches 7 days and GEFS 10: the grand ensemble uses whichever members exist each day (the count under each date).',
      click: 'Click a city to see every member',
      pdaily: 'Daily', paccum: 'Accumulated', close: 'Close', pgrand: 'Grand ensemble (P10, median, P90)',
      pwrf: 'UIUC 3 km WRF ensemble (P10, median, P90)', pmem: 'members', pload: 'Loading the members…',
      pfail: 'The members could not be loaded.', pmm: 'mm in the day', pmmacc: 'mm accumulated',
      pnote: "Each ensemble is summarized like the WRF: the line is the median and the band runs from P10 to P90 of its members. Black: grand ensemble (all models pooled); blue: University of Illinois WRF ensemble, averaged over the same ~28 km cell as the global ensembles. Days run 07:00 to 07:00 Ecuador time.",
      pread: (d, g, w) => `${d}: ${/^[0-9–]/.test(g) ? 'grand ensemble ' : ''}${g}` + (w ? ` · UIUC WRF ${w}` : ''),
      pfocus: 'Click an ensemble in the legend to highlight it.', punfocus: 'Click it again to show all.',
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      mon: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] },
  };
  const lang = () => (typeof S !== 'undefined' && S.lang === 'en') ? 'en' : 'es';
  const T = (k) => TX[lang()][k];
  const cls = (v) => { let k = 0; for (const c of CUTS) if (v >= c) k++; return k; };
  const fmt = (v) => (v < 1 ? '0' : String(Math.round(v)));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const helpBtn = (k) => `<button class="help" data-help="${k}" aria-label="?" aria-expanded="false">?</button>`;

  async function load() {
    try {
      const m = await (await fetch(`${ENS}manifest.json?t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' })).json();
      const c = (m.cycles || []).find((x) => /^\d{8}(00|12)$/.test(x.cycle) && x.cities_summary);
      if (!c) throw new Error('no 00/12Z cycle with city data');
      G.doc = await (await fetch(`${ENS}data/${c.cycle}/streams/${c.cities_summary}`)).json();
      G.cycle = c.cycle;
    } catch (e) { G.err = String(e); }
    render();
    // #g10-<place id>[:<ensemble>] opens that city's chart, optionally with one ensemble highlighted
    const h = decodeURIComponent(location.hash.slice(1));
    if (G.doc && h.startsWith('g10-')) {
      const [id, f] = h.slice(4).split(':');
      const i = G.doc.places.findIndex((p) => p.id === id);
      if (f && (f === 'grand' || f === 'wrf' || ORDER.includes(f))) P.focus = f;
      if (i >= 0) openPop(i);
    }
  }

  function pill(a, b, c) {
    if (a == null || b == null) return `<span class="g10na">${T('nodata')}</span>`;
    return `<span class="g10pill" title="${esc(T('tip')(fmt(a), fmt(b), c))}"><span class="k${cls(a)}">${fmt(a)}</span><span class="k${cls(b)}">${fmt(b)}</span></span>`;
  }

  function render() {
    const host = document.getElementById('g10');
    if (!host) return;
    document.getElementById('g10title').textContent = T('title');
    document.getElementById('g10sub').textContent = T('sub');
    document.getElementById('g10h').textContent = T('head');
    document.getElementById('g10link').textContent = T('link');
    if (!G.doc) { host.innerHTML = `<p class="g10msg">${G.err ? T('fail') : T('loading')}</p>`; return; }
    const d = G.doc, now = Date.now();
    // days not yet over, at most ten
    const keep = d.days.map((x, i) => ({ i, s: Date.parse(x.start), e: Date.parse(x.end) }))
      .filter((x) => x.e > now).slice(0, ND);
    const models = ORDER.filter((k) => d.models[k]);
    if (!d.models[G.model]) G.model = models[0];
    const m = d.models[G.model];
    const btns = models.map((k) => `<button type="button" data-m="${k}" class="${k === G.model ? 'on' : ''}" aria-pressed="${k === G.model}">${k === 'grand' ? T('grand') : esc(d.models[k].label)}<span class="n">${d.models[k].members}</span></button>`).join('');
    const band = (j) => (j < WRF_DAYS ? 'wrf' : j >= LATE ? 'late' : '');
    const lt = (ms) => new Date(ms - 5 * 3600e3);          // Ecuador time, UTC-5, no DST
    const dh = keep.map((x, j) => {
      const dd = lt(x.s + 12 * 3600e3), n = m.n[x.i];     // a 07-07 day is named for the date it mostly covers
      return `<th class="${band(j)}"><span class="dw">${T('days')[dd.getUTCDay()]} ${dd.getUTCDate()}</span>${T('mon')[dd.getUTCMonth()]}<span class="nm${n && n < m.members ? ' short' : ''}">${n ? n + ' ' + T('mem') : T('nodata')}</span></th>`;
    }).join('');
    const nw = keep.filter((_, j) => j < WRF_DAYS).length, nm = keep.filter((_, j) => j >= WRF_DAYS && j < LATE).length;
    const nl = keep.length - nw - nm;
    let rows = d.places.map((p, i) => ({ p, i, wet: keep.reduce((s, x) => s + (m.p90[i][x.i] || 0), 0) }));
    if (G.sort === 'wet') rows.sort((a, b) => b.wet - a.wet);
    if (G.sort === 'abc') rows.sort((a, b) => a.p.seat.localeCompare(b.p.seat, 'es'));
    const body = rows.map(({ p, i }) => `<tr data-p="${i}" tabindex="0" title="${esc(T('click'))}"><td class="place">${esc(p.seat)}${p.seat === p.canton ? '' : `<small>${T('canton')} ${esc(p.canton)}</small>`}</td>` +
      keep.map((x, j) => `<td class="${band(j)}">${pill(m.p50[i][x.i], m.p90[i][x.i], m.pge25[i][x.i])}</td>`).join('') + '</tr>').join('');
    host.dataset.cycle = G.cycle;                          // png.js names the export by it
    const cyc = `${G.cycle.slice(6, 8)}/${G.cycle.slice(4, 6)} ${G.cycle.slice(8)}Z`;
    const attrib = [d.models.grand && d.models.grand.attribution, d.provenance].filter(Boolean).join(' · ');
    host.innerHTML =
      `<div class="g10bar"><div class="seg g10seg" role="group" aria-label="ensemble">${btns}</div>` +
      `<label class="g10sort"><span>${T('sort')}</span><select id="g10sortsel">` +
      [['def', 'sdef'], ['wet', 'swet'], ['abc', 'sabc']].map(([v, k]) => `<option value="${v}"${v === G.sort ? ' selected' : ''}>${T(k)}</option>`).join('') +
      `</select></label></div>` +
      `<div class="g10key"><span class="g10pill" aria-hidden="true"><span class="k2">12</span><span class="k3">31</span></span> <span>${T('how')}</span>${helpBtn('g10pill')}` +
      `<span class="g10scale">${['< 1', '1–10', '10–25', '25–50', '50–100', '≥ 100'].map((s, k) => `<span class="k${k}">${s}</span>`).join('')}</span></div>` +
      `<div class="g10tw"><table class="g10t"><thead>` +
      `<tr class="band"><th class="place"></th>${nw ? `<th colspan="${nw}" class="wrf">${T('wrf')}</th>` : ''}${nm ? `<th colspan="${nm}">${T('mid')}</th>` : ''}${nl ? `<th colspan="${nl}" class="late">${T('late')}${helpBtn('g10late')}</th>` : ''}</tr>` +
      `<tr><th class="place">${T('place')}<small>${G.model === 'grand' ? T('grand') : esc(m.label)} · ${m.members} ${T('members')} · ${T('init')} ${cyc}</small></th>${dh}</tr>` +
      `</thead><tbody>${body}</tbody></table></div>` +
      `<p class="g10note">${T('note')}</p><p class="g10note g10src">${esc(attrib)}</p>`;
    host.querySelectorAll('.g10seg button').forEach((b) => (b.onclick = () => { G.model = b.dataset.m; render(); }));
    document.getElementById('g10sortsel').onchange = (e) => { G.sort = e.target.value; render(); };
    host.querySelectorAll('tbody tr[data-p]').forEach((tr) => {
      tr.onclick = () => openPop(+tr.dataset.p);
      tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPop(+tr.dataset.p); } };
    });
    if (P.open != null) renderPop();
  }

  /* ---------------- city popup: every global member, the grand ensemble, and the UIUC WRF ensemble ----------------
   * Global members: ens-view's per-model city CSVs (one column per member). WRF: the Tablero's own seats10.json
   * for the cycle on screen, members on the same 12-12 UTC days. Days are matched by their UTC start, and both
   * are accumulated from the first day shown, so the two sources share an origin. */
  // focus: null, 'grand', 'wrf' or a model key; clicking its legend entry fades the rest
  const P = { open: null, mode: 'daily', cache: {}, wrf: {}, hover: null, focus: null };
  const MCOL = { ifs_ens: '#e07b24', aifs_ens: '#2f9e6a', gefs_p25: '#8c6d3f', aigefs_ens: '#8a55c9', icon_eps: '#d0435f' };

  function parseCSV(txt) {
    const L = txt.trim().split(/\r?\n/), h = L[0].split(','), m0 = h.findIndex((x) => /^m\d+$/.test(x));
    const out = {};                                   // place -> start -> [members]
    for (let k = 1; k < L.length; k++) {
      const c = L[k].split(','), pl = c[h.indexOf('place')], st = c[0];
      (out[pl] = out[pl] || {})[st] = c.slice(m0).map((v) => (v === '' ? NaN : +v));
    }
    return out;
  }
  async function globalMembers() {
    if (P.cache[G.cycle]) return P.cache[G.cycle];
    const man = await (await fetch(`${ENS}manifest.json?t=${Math.floor(Date.now() / 60000)}`)).json();
    const c = man.cycles.find((x) => x.cycle === G.cycle) || {};
    const out = {};
    await Promise.all(Object.entries(c.cities || {}).map(async ([k, v]) => {
      out[k] = parseCSV(await (await fetch(`${ENS}data/${G.cycle}/streams/${v.csv}`)).text());
    }));
    return (P.cache[G.cycle] = out);
  }
  async function wrfMembers() {
    // The page may still be loading its own cycle (a #g10- link opens this first): wait for it.
    for (let k = 0; k < 60 && !(typeof S !== 'undefined' && S.cycle); k++) await new Promise((r) => setTimeout(r, 250));
    const c = (typeof S !== 'undefined' && S.cycle) || null;
    if (!c) return null;
    if (!(c in P.wrf)) P.wrf[c] = await fetch(`data/${c}/seats10.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    return P.wrf[c];
  }
  const pct = (a, p) => { const v = a.filter((x) => isFinite(x)).sort((x, y) => x - y); if (!v.length) return NaN;
    const k = (v.length - 1) * p, f = Math.floor(k), c = Math.min(f + 1, v.length - 1); return v[f] + (v[c] - v[f]) * (k - f); };

  async function openPop(i) {
    P.open = i; P.hover = null; P.data = null;
    ensureModal(); renderPop();
    try {
      const [gm, wr] = await Promise.all([globalMembers(), wrfMembers()]);
      if (P.open !== i) return;
      P.data = { gm, wr }; renderPop();
    } catch (e) { P.data = { err: String(e) }; renderPop(); }
  }
  function closePop() { P.open = null; const m = document.getElementById('g10modal'); if (m) m.hidden = true; }
  function ensureModal() {
    let m = document.getElementById('g10modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'g10modal'; m.hidden = true;
      m.innerHTML = '<div class="g10dlg" role="dialog" aria-modal="true" aria-labelledby="g10ptitle"></div>';
      m.addEventListener('click', (e) => { if (e.target === m) closePop(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && P.open != null) closePop(); });
      document.body.appendChild(m);
    }
    m.hidden = false;
  }

  function renderPop() {
    const m = document.getElementById('g10modal'); if (!m || P.open == null || !G.doc) return;
    const dlg = m.querySelector('.g10dlg'), d = G.doc, pl = d.places[P.open], now = Date.now();
    const keep = d.days.map((x, i) => ({ i, st: x.start, s: Date.parse(x.start), e: Date.parse(x.end) })).filter((x) => x.e > now).slice(0, ND);
    const lt = (ms) => new Date(ms - 5 * 3600e3);
    const lab = (x) => { const dd = lt(x.s + 12 * 3600e3); return `${T('days')[dd.getUTCDay()]} ${dd.getUTCDate()}`; };
    const head = `<div class="g10ph"><h3 id="g10ptitle">${esc(pl.seat)}${pl.seat === pl.canton ? '' : ` <small>${T('canton')} ${esc(pl.canton)}</small>`}</h3>` +
      `<div class="seg g10mode" role="group" aria-label="mode"><button type="button" data-v="daily" class="${P.mode === 'daily' ? 'on' : ''}" aria-pressed="${P.mode === 'daily'}">${T('pdaily')}</button>` +
      `<button type="button" data-v="accum" class="${P.mode === 'accum' ? 'on' : ''}" aria-pressed="${P.mode === 'accum'}">${T('paccum')}</button></div>` +
      `<button type="button" class="g10x" aria-label="${T('close')}">×</button></div>`;
    let chart = '', legend = '', read = '';
    if (!P.data) chart = `<p class="g10msg">${T('pload')}</p>`;
    else if (P.data.err || !P.data.gm) chart = `<p class="g10msg">${T('pfail')}</p>`;
    else {
      const acc = P.mode === 'accum';
      // global members per model: series over the kept days (NaN where the model has ended)
      const series = [];
      for (const k of ORDER.slice(1)) {
        const t = P.data.gm[k] && P.data.gm[k][pl.id]; if (!t) continue;
        const nmem = Math.max(...Object.values(t).map((a) => a.length));
        for (let j = 0; j < nmem; j++) {
          let run = 0, dead = false;
          series.push({ k, v: keep.map((x) => { const a = t[x.st]; const val = a ? a[j] : NaN;
            if (!isFinite(val)) { dead = true; return NaN; } if (dead) return NaN; run += val; return acc ? run : val; }) });
        }
      }
      const g = keep.map((_, jx) => { const col = series.map((s) => s.v[jx]); return [pct(col, 0.1), pct(col, 0.5), pct(col, 0.9)]; });
      // WRF members on the same days (matched by start), accumulated from the first kept day
      let w = null;
      const wr = P.data.wr;
      if (wr && wr.seats && wr.seats[pl.id]) {
        const byStart = {}; wr.days.forEach((x, k) => (byStart[x.start] = wr.seats[pl.id][k]));
        const nm = wr.members.length, mem = [];
        for (let j = 0; j < nm; j++) {
          let run = 0, dead = false;
          mem.push(keep.map((x) => { const a = byStart[x.st]; if (!a || dead) { dead = true; return NaN; } run += a[j]; return acc ? run : a[j]; }));
        }
        w = keep.map((_, jx) => { const col = mem.map((r) => r[jx]); return col.some(isFinite) ? [pct(col, 0.1), pct(col, 0.5), pct(col, 0.9)] : null; });
        if (!w.some(Boolean)) w = null;
      }
      // each model summarized like the WRF ensemble: P10, median, P90 per day (null once it has ended)
      const ms = {};
      for (const k of ORDER.slice(1)) {
        const ss = series.filter((s2) => s2.k === k); if (!ss.length) continue;
        ms[k] = keep.map((_, jx) => { const col = ss.map((s2) => s2.v[jx]).filter(isFinite);
          return col.length >= 2 ? [pct(col, 0.1), pct(col, 0.5), pct(col, 0.9)] : null; });
      }
      const top = Math.max(...Object.values(ms).flatMap((a) => a.filter(Boolean).map((x) => x[2])), ...g.map((x) => x[2]).filter(isFinite),
                           ...(w ? w.filter(Boolean).map((x) => x[2]) : []), 5) * 1.08;
      const step = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find((s) => top / s <= 6) || 1000, ymax = Math.ceil(top / step) * step;
      const W0 = 760, H0 = 340, L = 46, R = 14, Tm = 12, B = 34, pw = W0 - L - R, ph = H0 - Tm - B, n = keep.length;
      const X = (j) => L + (n > 1 ? (j * pw) / (n - 1) : pw / 2), Y = (v) => Tm + ph - (Math.min(v, ymax) / ymax) * ph;
      const path = (v) => { let s2 = '', on = false; v.forEach((y, j) => { if (!isFinite(y)) { on = false; return; } s2 += `${on ? 'L' : 'M'}${X(j).toFixed(1)},${Y(y).toFixed(1)}`; on = true; }); return s2; };
      let svg = `<svg viewBox="0 0 ${W0} ${H0}" class="g10svg" role="img" aria-label="${esc(pl.seat)}"><defs><clipPath id="g10clip"><rect x="${L}" y="${Tm - 2}" width="${pw}" height="${ph + 2}"/></clipPath></defs>`;
      for (let t = 0; t <= ymax + 1e-6; t += step) svg += `<line x1="${L}" x2="${W0 - R}" y1="${Y(t)}" y2="${Y(t)}" class="g10grid"/><text x="${L - 6}" y="${Y(t) + 4}" class="g10ax" text-anchor="end">${t}</text>`;
      keep.forEach((x, j) => (svg += `<text x="${X(j)}" y="${H0 - 12}" class="g10ax" text-anchor="middle">${lab(x)}</text>`));
      svg += `<text x="12" y="${Tm + ph / 2}" class="g10ax" transform="rotate(-90 12 ${Tm + ph / 2})" text-anchor="middle">${acc ? T('pmmacc') : T('pmm')}</text><g clip-path="url(#g10clip)">`;
      const F = P.focus, dim = (x) => (F && F !== x ? ' dim' : '');
      // band from P10 to P90 over the days that have one, and the median line
      const bandPath = (st) => { const ok = st.map((x, j) => (x && isFinite(x[0]) ? j : -1)).filter((j) => j >= 0);
        return ok.length > 1 ? `M${ok.map((j) => `${X(j)},${Y(st[j][2])}`).join('L')}L${ok.slice().reverse().map((j) => `${X(j)},${Y(st[j][0])}`).join('L')}Z` : ''; };
      const summary = (st, cls, col) => { const b = bandPath(st), ok = st.map((x, j) => (x && isFinite(x[1]) ? j : -1)).filter((j) => j >= 0);
        return (b ? `<path d="${b}" class="${cls}band"${col ? ` style="fill:${col}"` : ''}/>` : '') +
          `<path d="${path(st.map((x) => (x ? x[1] : NaN)))}" class="${cls}line"${col ? ` style="stroke:${col}"` : ''}/>` +
          ok.map((j) => `<circle cx="${X(j)}" cy="${Y(st[j][1])}" r="${cls === 'g10m' ? 2.6 : 3.5}" class="${cls}dot"${col ? ` style="fill:${col}"` : ''}/>`).join(''); };
      // the focused model drawn last so it sits above the faded ones
      const korder = ORDER.slice(1).filter((k) => k !== F).concat(ORDER.includes(F) && F !== 'grand' ? [F] : []);
      for (const k of korder) if (ms[k]) svg += `<g class="g10mg${dim(k)}${F === k ? ' hi' : ''}">${summary(ms[k], 'g10m', MCOL[k])}</g>`;
      if (w) svg += `<g class="g10w${dim('wrf')}">${summary(w, 'g10w')}</g>`;
      svg += `<g class="g10g${dim('grand')}">${summary(g, 'g10g')}</g></g>`;
      const hx = P.hover;
      if (hx != null) svg += `<line x1="${X(hx)}" x2="${X(hx)}" y1="${Tm}" y2="${Tm + ph}" class="g10hl"/>`;
      keep.forEach((_, j) => (svg += `<rect x="${X(j) - pw / (2 * Math.max(n - 1, 1))}" y="${Tm}" width="${pw / Math.max(n - 1, 1)}" height="${ph}" class="g10hit" data-j="${j}"/>`));
      chart = svg + '</svg>';
      const f = (t) => (isFinite(t) ? Math.round(t) : '–'), trip = (t) => (t ? `${f(t[0])} · ${f(t[1])} · ${f(t[2])} mm` : '');
      const jj = hx != null ? hx : 0;
      let gtxt = trip(g[jj]);
      if (P.focus && ORDER.slice(1).includes(P.focus)) {
        const col = series.filter((s2) => s2.k === P.focus).map((s2) => s2.v[jj]);
        gtxt = `${esc(d.models[P.focus].label)} ${trip([pct(col, 0.1), pct(col, 0.5), pct(col, 0.9)])}`;
      }
      read = `<p class="g10read">${T('pread')(lab(keep[jj]), gtxt, w && w[jj] ? trip(w[jj]) : '')}</p>`;
      const used = ORDER.slice(1).filter((k) => series.some((s2) => s2.k === k));
      const lb = (f, sw, txt) => `<button type="button" class="g10lb${P.focus && P.focus !== f ? ' off' : ''}" data-f="${f}" aria-pressed="${P.focus === f}">${sw}${txt}</button>`;
      legend = `<div class="g10leg" role="group" aria-label="${T('pfocus')}">` + lb('grand', '<i class="lk" style="background:var(--g10k)"></i>', T('pgrand')) +
        (w ? lb('wrf', '<i class="lk" style="background:var(--ens)"></i>', T('pwrf')) : '') +
        used.map((k) => lb(k, `<i class="lm" style="background:${MCOL[k]}"></i>`, `${esc(d.models[k].label)} · ${d.models[k].members} ${T('pmem')}`)).join('') + '</div>' +
        `<p class="g10hint">${P.focus ? T('punfocus') : T('pfocus')}</p>`;
    }
    dlg.innerHTML = head + read + chart + legend + `<p class="g10note">${T('pnote')}</p>`;
    dlg.querySelector('.g10x').onclick = closePop;
    dlg.querySelectorAll('.g10mode button').forEach((b) => (b.onclick = () => { P.mode = b.dataset.v; renderPop(); }));
    dlg.querySelectorAll('.g10lb').forEach((b) => (b.onclick = () => { P.focus = P.focus === b.dataset.f ? null : b.dataset.f; renderPop(); }));
    dlg.querySelectorAll('.g10hit').forEach((r) => (r.onmouseenter = () => { if (P.hover !== +r.dataset.j) { P.hover = +r.dataset.j; renderPop(); } }));
    if (!dlg.contains(document.activeElement)) dlg.querySelector('.g10x').focus({ preventScroll: true });
  }

  window.renderEns10 = render;
  render();
  load();
})();
