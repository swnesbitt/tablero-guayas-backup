'use strict';
const CK = (typeof CARTO_KEY === 'string') ? CARTO_KEY : '';
const GLYPHS = new URL('assets/fonts/', document.baseURI).href + '{fontstack}/{range}.pbf';
const $ = (id) => document.getElementById(id);
const help = (k) => `<button class="help" data-help="${k}" aria-label="?" aria-expanded="false">?</button>`;
const PROD_HELP = { p50: 'p50', p90: 'p90map', pe025: 'prob', pe050: 'prob', pe100: 'prob', w50: 'wind', flow: 'flow', pct: 'pct', rp: 'rp' };
function openHelp(btn) {
  const pop = $('pop'), k = btn.dataset.help, h = HELP[k];
  document.querySelectorAll('.help[aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  if (!h || (!pop.hidden && pop.dataset.k === k && pop.dataset.src === String(btn.getBoundingClientRect().top))) { pop.hidden = true; pop.dataset.k = ''; return; }
  pop.textContent = h[S.lang] || h.en; pop.dataset.k = k; pop.dataset.src = String(btn.getBoundingClientRect().top);
  pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  const r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), innerWidth - pw - 12);
  let y = r.bottom + 6; if (y + ph > innerHeight - 8) y = Math.max(8, r.top - ph - 6);
  pop.style.left = x + 'px'; pop.style.top = y + 'px';
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('.help');
  if (b) { e.preventDefault(); e.stopPropagation(); openHelp(b); return; }
  if (!e.target.closest('#pop')) { $('pop').hidden = true; $('pop').dataset.k = ''; }
}, true);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('pop').hidden = true; });
addEventListener('scroll', () => { $('pop').hidden = true; }, true);
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const S = { lang: 'es', period: 0, prod: 'p50', cycle: null, meta: null, fields: null, rivers: null,
  geo: null, riverGeo: null, blocks: {}, sel: null, canton: null, map: null, marker: null };

/* ---------------------------------------------------------------- palettes */
const RAIN = { levels: [1, 2.5, 5, 10, 15, 20, 25, 50, 100],
  colors: ['#e3f0fb', '#c6dff5', '#9ec9ec', '#6fabdf', '#4a8fd1', '#2f74bf', '#f5d327', '#f08a1c', '#d7261e'] };
const PROB = { levels: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  colors: ['#efe9f6', '#ddd1ec', '#c7b5e0', '#b099d3', '#9a7dc6', '#8462b8', '#6e48a8', '#583194', '#431d7c', '#2f0e62'] };
const WIND = { levels: [4, 6, 8, 10, 12, 15, 18, 22],
  colors: ['#e0f3f0', '#b2e0d6', '#7cc8b8', '#4aa99a', '#2a8a8a', '#26667f', '#3b4a8a', '#5b2f87'] };
const FLOW = { levels: [1, 5, 20, 50, 100, 300, 1000, 3000],
  colors: ['#cfe3f3', '#a6cbe9', '#79afdc', '#4f92cc', '#2f75b8', '#1f589c', '#173e7d', '#0f2858'] };
const GYOR = ['#3a9a4a', '#f5d327', '#f08a1c', '#d7261e'];
const PCT = { levels: [0, 75, 90, 99], colors: GYOR, labels: ['< P75', 'P75–90', 'P90–99', '≥ P99'] };
const RPC = { levels: [0, 1, 2, 3], colors: GYOR, labels: ['< 2', '2–5', '5–10', '≥ 10'] };
const rpColor = (c) => GYOR[c <= 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3];      /* c = classes passed: 1 = 2 yr, 2 = 5 yr, 3+ = 10 yr+ */

const PRODUCTS = [
  { grp: 'Rain', items: [['p50', 'Median'], ['p90', 'P90']] },
  { grp: 'Likelihood', items: [['pe025', '≥ 25 mm'], ['pe050', '≥ 50 mm'], ['pe100', '≥ 100 mm']] },
  { grp: 'Wind', items: [['w50', 'Max 10 m wind']] },
  { grp: 'Rivers', items: [['flow', 'Streamflow'], ['pct', 'Percentile'], ['rp', 'Return period']] },
];
const isRiver = (p) => p === 'flow' || p === 'pct' || p === 'rp';
const isProb = (p) => p.startsWith('pe');

function classColor(pal, v) {
  let c = null;
  for (let i = 0; i < pal.levels.length; i++) if (v >= pal.levels[i]) c = pal.colors[i];
  return c;
}
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }

/* ---------------------------------------------------------------- data */
async function getBytes(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(url + ' ' + r.status);
  const b = new Uint8Array(await r.arrayBuffer());
  if (b[0] === 0x1f && b[1] === 0x8b) {
    const s = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  return b;
}
const getJSON = async (url) => JSON.parse(new TextDecoder().decode(await getBytes(url)));
const u16 = (b) => new Uint16Array(b.buffer, b.byteOffset, b.byteLength / 2);

async function loadCycle(c) {
  S.cycle = c;
  const base = `data/${c}/`;
  const [meta, fb] = await Promise.all([getJSON(base + 'meta.json'), getBytes(base + 'fields.bin.gz')]);
  S.meta = meta; S.fields = u16(fb); S.blocks = {};
  S.rivers = meta.rivers ? await getJSON(base + 'rivers.json').catch(() => null) : null;
  S.cser = await getJSON(base + 'cantons.json').catch(() => null);      // canton-mean series (newer cycles only)
  mergeRivers();
}

function fieldIndex(name, k) {
  return S.meta.fields.findIndex((f) => f[0] === name && f[1] === k);
}
function fieldAt(name, k, j, i) {
  const g = S.meta.grid, f = fieldIndex(name, k);
  return S.fields[f * g.ny * g.nx + j * g.nx + i] / S.meta.fields[f][2];
}

const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360));
function cellOf(lng, lat) {
  const g = S.meta.grid;
  const i = Math.round((lng - g.lon0) / (g.lon1 - g.lon0) * (g.nx - 1));
  const j = Math.round((mercY(lat) - mercY(g.lat0)) / (mercY(g.lat1) - mercY(g.lat0)) * (g.ny - 1));
  return (i < 0 || j < 0 || i >= g.nx || j >= g.ny) ? null : { i, j };
}

async function pointSeries(j, i) {
  const g = S.meta.grid, B = g.blk, by = Math.floor(j / B), bx = Math.floor(i / B);
  const key = by + '_' + bx;
  if (!S.blocks[key]) S.blocks[key] = getBytes(`data/${S.cycle}/pt_${key}.bin.gz`).then(u16);
  const a = await S.blocks[key];
  const w = Math.min(B, g.nx - bx * B), yy = j - by * B, xx = i - bx * B;
  const NT = S.meta.nh;
  const off = (yy * w + xx) * 9 * NT;
  const out = {};
  S.meta.series.forEach((n, s) => {
    out[n] = Array.from(a.subarray(off + s * NT, off + (s + 1) * NT), (v) => v / 10);
  });
  return out;
}

/* ---------------------------------------------------------------- time */
const fmt = (opts) => new Intl.DateTimeFormat(S.lang === 'es' ? 'es-EC' : 'en-US', Object.assign({ timeZone: 'UTC', hour12: false }, opts));
const localDate = (s) => new Date(s + ':00Z');                     // naive local strings, formatted as UTC
function initLocal() { return new Date(Date.parse(S.meta.init) + S.meta.tz_h * 3600e3); }
function hourLocal(h) { return new Date(initLocal().getTime() + h * 3600e3); }
function periodName(k) {
  const p = S.meta.periods[k], n = p.hours != null ? p.hours : p.h1 - p.h0;
  if (k === 3) return t('Total {n} h', { n });
  if (k > 3) {                                              // 12-hour window, e.g. "mié 05–17"
    const d = localDate(p.start_local), e = localDate(p.end_local);
    const wd = fmt({ weekday: 'short' }).format(d), hr = (x) => String(x.getUTCHours()).padStart(2, '0');
    return `${wd} ${hr(d)}–${hr(e)}` + (n === 12 ? '' : ` (${n} h)`);
  }
  return t('Day') + ' ' + (k + 1) + (n === 24 ? '' : ` · ${n} h`);
}
/* Compact two-line button text: [title, range]. Full dates stay in periodLabel (tooltips, exports). */
function periodShort(k) {
  const p = S.meta.periods[k], d = localDate(p.start_local), e = localDate(p.end_local);
  const wd = (x) => fmt({ weekday: 'short' }).format(x), hm = (x) => String(x.getUTCHours()).padStart(2, '0') + ':00';
  if (k > 3) {
    const n = p.hours != null ? p.hours : p.h1 - p.h0;
    return [fmt({ weekday: 'short', day: 'numeric' }).format(d), `${hm(d)} → ${hm(e)}` + (n === 12 ? '' : ` (${n} h)`)];
  }
  return [periodName(k), `${wd(d)} ${hm(d)} → ${wd(e)} ${hm(e)}`];
}
function periodLabel(k) {
  const p = S.meta.periods[k], f = fmt({ weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  return f.format(localDate(p.start_local)) + ' → ' + f.format(localDate(p.end_local));
}

/* ---------------------------------------------------------------- i18n */
function applyLang() {
  LANG = S.lang;
  document.documentElement.lang = S.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
  document.querySelectorAll('[data-i18n-alt]').forEach((el) => { el.alt = t(el.dataset.i18nAlt); });
  document.title = t('Guayas Dashboard');
  $('lang').textContent = S.lang === 'es' ? 'EN' : 'ES';
  if (window.renderCopy) renderCopy();
  if (window.renderEns10) renderEns10();
}

/* ---------------------------------------------------------------- UI: header, summary */
function renderHeader() {
  const f = fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  // The WRF group header already names the ensemble, resolution and members; the stamp keeps the run time.
  $('stamp').textContent = `${t('WRF run initialized')} ${f.format(initLocal())} (${S.meta.init.slice(11, 13)}Z)`;
}
function renderSummary() {
  $('disc').innerHTML = t('disclaimer');
  const el = $('sumtxt'), s = S.meta.summary;
  el.innerHTML = '';
  if (!s || !s[S.lang] || !s[S.lang].length) {
    el.innerHTML = `<p class="none">${t('Automatic summary not available for this cycle.')}</p>`;
    return;
  }
  const paras = s[S.lang].filter((x, i, a) => !(i === a.length - 1 && i > 0 && x.length < 260 && /oficial|official/i.test(x)));
  for (const para of paras) { const p = document.createElement('p'); p.textContent = para; el.appendChild(p); }
}

/* ---------------------------------------------------------------- UI: left */
function renderDays() {
  const el = $('days'); el.innerHTML = '';
  const pick = (k) => () => { S.period = k; renderDays(); renderTable(); drawField(); refreshDetail(); };
  const h0 = String(localDate(S.meta.periods[0].start_local).getUTCHours()).padStart(2, '0');
  const dh = document.createElement('div'); dh.className = 'halfh first';
  dh.textContent = t('24-hour periods ({h}–{h})').replace(/\{h\}/g, h0);
  el.appendChild(dh);
  S.meta.periods.slice(0, 4).forEach((p, k) => {
    const b = document.createElement('button');
    b.className = k === S.period ? 'on' : '';
    b.setAttribute('aria-pressed', k === S.period);
    const [t1, t2] = periodShort(k);
    b.title = periodLabel(k);
    b.innerHTML = `<b>${t1}</b><span>${t2}</span>`;
    b.onclick = pick(k);
    el.appendChild(b);
  });
  if (S.meta.periods.length > 4) {
    const h = document.createElement('div'); h.className = 'halfh'; h.textContent = t('12-hour periods (05–17, 17–05)');
    el.appendChild(h);
    const row = document.createElement('div'); row.className = 'halves';
    S.meta.periods.forEach((p, k) => {
      if (k < 4) return;
      const b = document.createElement('button');
      b.className = k === S.period ? 'on' : '';
      b.setAttribute('aria-pressed', k === S.period);
      const [t1, t2] = periodShort(k);
      b.title = periodLabel(k);
      b.innerHTML = `<b>${t1}</b><span>${t2}</span>`;
      b.onclick = pick(k);
      row.appendChild(b);
    });
    el.appendChild(row);
  }
}
// The canton table draws median and P90 as one split pill, the same object as the 10-day
// section below (ens10.js), so the two read alike: six classes, 25/50/100 mm warm colors.
const PILL_CUTS = [1, 10, 25, 50, 100];
const pillCls = (v) => PILL_CUTS.reduce((k, c) => k + (v >= c ? 1 : 0), 0);
const pillNum = (v) => (v < 1 ? '0' : String(Math.round(v)));
function pill(a, b) {
  return `<span class="g10pill" title="${t('Median')} ${a.toFixed(1)} mm · P90 ${b.toFixed(1)} mm">` +
    `<span class="k${pillCls(a)}">${pillNum(a)}</span><span class="k${pillCls(b)}">${pillNum(b)}</span></span>`;
}
function renderTable() {
  const rows = S.meta.cantons.slice().sort((a, b) => b.per[S.period][1] - a.per[S.period][1]);
  const tb = $('ctab'); tb.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    tr.tabIndex = 0;
    if (r.id === S.canton) tr.className = 'sel';
    tr.innerHTML = `<td>${r.name}</td><td class="pp">${pill(r.per[S.period][0], r.per[S.period][1])}</td>`;
    const pick = () => {
      S.canton = S.canton === r.id ? null : r.id;
      renderTable(); highlightCanton();
      if (isRiver(S.prod)) return;                       // rivers: the canton is only outlined
      if (S.canton && S.cser && S.cser[r.id]) { S.sel = { kind: 'canton', id: r.id, name: r.name }; if (S.marker) S.marker.remove(); }
      else if (!S.canton && S.sel && S.sel.kind === 'canton') S.sel = null;
      refreshDetail();
    };
    tr.onclick = pick;
    tr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    tb.appendChild(tr);
  }
}

/* ---------------------------------------------------------------- UI: products */
function prodLabel(p) {
  if (p === 'p50') return t('Median rain');
  if (p === 'p90') return t('P90 rain');
  if (isProb(p)) return t('Chance of ≥ {t} mm', { t: +p.slice(2) });
  if (p === 'w50') return t('Max 10 m wind (median)');
  return t({ flow: 'Streamflow', pct: 'Percentile', rp: 'Return period' }[p]);
}
function renderProds() {
  const el = $('prods'); el.innerHTML = '';
  for (const g of PRODUCTS) {
    const d = document.createElement('div'); d.className = 'grp';
    d.innerHTML = `<small>${t(g.grp)}</small>`;
    const seg = document.createElement('div'); seg.className = 'seg';
    for (const [k, lab] of g.items) {
      const b = document.createElement('button');
      b.textContent = t(lab); b.className = k === S.prod ? 'on' : '';
      b.setAttribute('aria-pressed', k === S.prod);
      b.onclick = () => {
        const wasRiver = isRiver(S.prod);
        S.prod = k; renderProds(); drawField(); renderLegend();
        if (wasRiver !== isRiver(k)) { S.sel = isRiver(k) ? null : S.sel; }
        refreshDetail();
      };
      seg.appendChild(b);
    }
    d.appendChild(seg); el.appendChild(d);
  }
  $('hint').textContent = isRiver(S.prod) ? t('Click a river for its hydrograph') : t('Click the map for a time series');
}
function renderLegend() {
  const p = S.prod;
  let pal, unit, labels;
  if (p === 'p50' || p === 'p90') { pal = RAIN; unit = 'mm'; }
  else if (isProb(p)) { pal = PROB; unit = '%'; }
  else if (p === 'w50') { pal = WIND; unit = 'm/s'; }
  else if (p === 'flow') { pal = FLOW; unit = 'm³/s'; }
  else if (p === 'pct') { pal = PCT; unit = ''; labels = PCT.labels; }
  else { pal = RPC; unit = t('yr'); labels = RPC.labels; }
  const per = periodName(S.period);
  const cells = pal.colors.map((c, i) => `<div><i class="sw" style="background:${c}"></i><span>${labels ? labels[i] : pal.levels[i]}</span></div>`).join('');
  $('legend').innerHTML = `<div class="t">${prodLabel(p)} · ${per}${unit ? ' (' + unit + ')' : ''}${help(PROD_HELP[p])}</div><div class="row">${cells}</div>`;
  $('legend').querySelectorAll('i.sw').forEach((x) => { x.style.display = 'block'; });
}

/* ---------------------------------------------------------------- map */
function baseStyle() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const s = dark ? 'dark_nolabels' : 'light_nolabels';
  return { version: 8, glyphs: GLYPHS, transition: { duration: 0, delay: 0 }, sources: { base: { type: 'raster', tileSize: 256,
    tiles: [`https://basemaps.cartocdn.com/${s}/{z}/{x}/{y}{r}.png?key=${CK}`],
    attribution: '&copy; OpenStreetMap &copy; CARTO · GADM · GEOGLOWS · HydroBASINS' } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }] };
}

function fieldCanvas() {
  const g = S.meta.grid, cv = document.createElement('canvas');
  cv.width = g.nx; cv.height = g.ny;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(g.nx, g.ny);
  const p = S.prod, pal = (p === 'p50' || p === 'p90') ? RAIN : isProb(p) ? PROB : WIND;
  const f = fieldIndex(p, S.period), sc = S.meta.fields[f][2], off = f * g.ny * g.nx;
  const lut = pal.colors.map(hex);
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
    const v = S.fields[off + j * g.nx + i] / sc;
    let c = -1;
    for (let q = 0; q < pal.levels.length; q++) if (v >= pal.levels[q]) c = q;
    const o = ((g.ny - 1 - j) * g.nx + i) * 4;
    if (c < 0) { img.data[o + 3] = 0; continue; }
    const inside = g.inprov[j * g.nx + i] === '1' || (g.inbasin && g.inbasin[j * g.nx + i] === '1');
    img.data[o] = lut[c][0]; img.data[o + 1] = lut[c][1]; img.data[o + 2] = lut[c][2];
    img.data[o + 3] = inside ? 225 : 70;
  }
  ctx.putImageData(img, 0, 0);
  return cv.toDataURL();
}

function drawField() {
  const m = S.map; if (!m || !m.getSource('fld')) return;
  const river = isRiver(S.prod);
  m.setLayoutProperty('fld', 'visibility', river ? 'none' : 'visible');
  if (!river) m.getSource('fld').updateImage({ url: fieldCanvas(), coordinates: S.meta.grid.corners });
  styleRivers();
  renderLegend();
}

function mergeRivers() {
  if (!S.riverGeo) return;
  const R = S.rivers ? S.rivers.reaches : {};
  for (const f of S.riverGeo.features) {
    const r = R[f.properties.id], pr = f.properties;
    const np_ = S.meta ? S.meta.periods.length : 4;
    for (let k = 0; k < np_; k++) {
      const pk = r && r.per[k];
      pr['v' + k] = pk && pk[0] != null ? pk[0] : -1;
      pr['p' + k] = pk && pk[1] != null ? pk[1] : -1;
      pr['r' + k] = pk && pk[2] != null ? pk[2] : -1;
    }
  }
  if (S.map && S.map.getSource('riv')) S.map.getSource('riv').setData(S.riverGeo);
}

function stepExpr(prop, pal) {
  const e = ['step', ['get', prop], '#9a9a90'];
  pal.levels.forEach((l, i) => { e.push(l, pal.colors[i]); });
  return e;
}
function styleRivers() {
  const m = S.map; if (!m.getLayer('riv')) return;
  const k = S.period, p = S.prod;
  const width = ['interpolate', ['linear'], ['get', 'ord'], 1, 0.6, 3, 1.4, 5, 2.6, 7, 4.2, 9, 6];
  if (!isRiver(p)) {
    m.setPaintProperty('riv', 'line-color', '#4f92cc');
    m.setPaintProperty('riv', 'line-opacity', 0.5);
    m.setPaintProperty('riv', 'line-width', ['interpolate', ['linear'], ['get', 'ord'], 1, 0.3, 5, 1, 9, 2.4]);
    return;
  }
  const expr = p === 'flow' ? stepExpr('v' + k, FLOW)
    : p === 'pct' ? ['case', ['<', ['get', 'p' + k], 0], '#9a9a90', stepExpr('p' + k, PCT)]
    : ['case', ['<', ['get', 'r' + k], 0], '#9a9a90',
      ['step', ['get', 'r' + k], GYOR[0], 1, GYOR[1], 2, GYOR[2], 3, GYOR[3]]];
  m.setPaintProperty('riv', 'line-color', expr);
  m.setPaintProperty('riv', 'line-opacity', 1);
  m.setPaintProperty('riv', 'line-width', width);
}

function highlightCanton() {
  if (S.map && S.map.getLayer('cant-sel')) S.map.setFilter('cant-sel', ['==', ['get', 'id'], S.canton || '']);
}

function addLayers() {
  const m = S.map, g = S.meta.grid;
  m.addSource('fld', { type: 'image', url: fieldCanvas(), coordinates: g.corners });
  m.addLayer({ id: 'fld', type: 'raster', source: 'fld', paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 } });
  m.addSource('cant', { type: 'geojson', data: S.geo.cantons });
  m.addLayer({ id: 'cant', type: 'line', source: 'cant', paint: { 'line-color': css('--ink2'), 'line-width': 0.7, 'line-opacity': 0.7 } });
  if (S.geo.basin) {                    // Guayas basin (HydroBASINS), a thin blue line under the province outline
    m.addSource('basin', { type: 'geojson', data: S.geo.basin });
    m.addLayer({ id: 'basin', type: 'line', source: 'basin', paint: { 'line-color': css('--basin'), 'line-width': 1.2, 'line-opacity': 0.9 } });
  }
  m.addSource('prov', { type: 'geojson', data: S.geo.province });
  m.addLayer({ id: 'prov', type: 'line', source: 'prov', paint: { 'line-color': css('--ink'), 'line-width': 1.8 } });
  m.addSource('riv', { type: 'geojson', data: S.riverGeo || { type: 'FeatureCollection', features: [] } });
  m.addLayer({ id: 'riv', type: 'line', source: 'riv', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {} });
  m.addLayer({ id: 'riv-hit', type: 'line', source: 'riv', paint: { 'line-width': 12, 'line-opacity': 0 } });
  m.addLayer({ id: 'cant-sel', type: 'line', source: 'cant', filter: ['==', ['get', 'id'], ''],
    paint: { 'line-color': css('--accent'), 'line-width': 3.2 } });
  m.addSource('seats', { type: 'geojson', data: S.geo.seats });
  m.addLayer({ id: 'seats', type: 'circle', source: 'seats', paint: {
    'circle-radius': ['case', ['==', ['get', 'id'], 'Guayaquil'], 5, 3],
    'circle-color': css('--panel'), 'circle-stroke-color': css('--ink'), 'circle-stroke-width': 1.4 } });
  /* Short names where the seat's official name is not what people call the town. */
  const lab = ['match', ['get', 'name'], 'General Villamil', 'Playas', 'Velasco Ibarra', 'El Empalme',
    'Marcelino Maridueña', 'Maridueña', 'San Jacinto de Yaguachi', 'Yaguachi', 'El Salitre', 'Salitre', ['get', 'name']];
  m.addLayer({ id: 'seat-lab', type: 'symbol', source: 'seats', filter: ['!=', ['get', 'id'], 'Guayaquil'], layout: {
    'text-field': lab, 'text-font': ['Noto Sans Medium'], 'text-size': 11, 'text-padding': 3,
    'text-variable-anchor': ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
    'text-radial-offset': 0.55, 'text-justify': 'auto' },
    paint: { 'text-color': css('--ink'), 'text-halo-color': css('--panel'), 'text-halo-width': 1.6 } });
  // Guayaquil sits above the other labels: always drawn, and the others are placed around it.
  m.addLayer({ id: 'gye-lab', type: 'symbol', source: 'seats', filter: ['==', ['get', 'id'], 'Guayaquil'], layout: {
    'text-field': ['get', 'name'], 'text-font': ['Noto Sans Medium'], 'text-size': 15, 'text-padding': 3,
    'text-variable-anchor': ['left', 'bottom-left', 'top-left', 'top'], 'text-radial-offset': 0.6,
    'text-allow-overlap': true, 'text-ignore-placement': false },
    paint: { 'text-color': css('--ink'), 'text-halo-color': css('--panel'), 'text-halo-width': 2 } });
  styleRivers(); highlightCanton();
}

function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2200);
}

function cantonAt(lng, lat) {
  const inRing = (r) => {
    let c = false;
    for (let a = 0, b = r.length - 1; a < r.length; b = a++) {
      const [xa, ya] = r[a], [xb, yb] = r[b];
      if ((ya > lat) !== (yb > lat) && lng < (xb - xa) * (lat - ya) / (yb - ya) + xa) c = !c;
    }
    return c;
  };
  for (const f of S.geo.cantons.features) {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    if (polys.some((p) => inRing(p[0]) && !p.slice(1).some(inRing))) return f.properties.name;
  }
  return null;
}

function setMarker(lnglat) {
  if (S.marker) S.marker.remove();
  S.marker = new maplibregl.Marker({ color: css('--accent'), scale: 0.7 }).setLngLat(lnglat).addTo(S.map);
}

function onClick(e) {
  if (isRiver(S.prod)) {
    const b = 6, pt = e.point;
    const hits = S.map.queryRenderedFeatures([[pt.x - b, pt.y - b], [pt.x + b, pt.y + b]], { layers: ['riv-hit'] });
    if (!hits.length) { toast(t('Click on a river, not between them')); return; }
    hits.sort((a, c) => (c.properties.ord || 0) - (a.properties.ord || 0));
    S.sel = { kind: 'river', id: hits[0].properties.id, lnglat: [e.lngLat.lng, e.lngLat.lat] };
    setMarker(e.lngLat); refreshDetail();
    return;
  }
  const c = cellOf(e.lngLat.lng, e.lngLat.lat);
  if (!c) { toast(t('Outside the forecast area')); return; }
  S.sel = { kind: 'point', lnglat: [e.lngLat.lng, e.lngLat.lat], cell: c, name: null };
  if (S.canton) { S.canton = null; renderTable(); highlightCanton(); }
  setMarker(e.lngLat); refreshDetail();
}

/* ---------------------------------------------------------------- charts */
const W = 380, H = 150, ML = 36, MR = 10, MT = 10, MB = 22;
function axes(xmax, ymax, opts = {}) {
  const x = (h) => ML + (W - ML - MR) * h / xmax;
  const y = (v) => H - MB - (H - MT - MB) * Math.min(v, ymax) / ymax;
  let s = '';
  const k = S.period;
  if (opts.time) {
    const p = S.meta.periods[k];
    s += `<rect x="${x(p.h0)}" y="${MT}" width="${x(p.h1) - x(p.h0)}" height="${H - MT - MB}" fill="${css('--soft')}"/>`;
    for (const d of [24, 48]) s += `<line x1="${x(d)}" x2="${x(d)}" y1="${MT}" y2="${H - MB}" stroke="${css('--line')}"/>`;
    const l0 = initLocal().getUTCHours();
    for (let h = 0; h <= xmax; h++) {
      if ((l0 + h) % 12 !== 0) continue;
      const d = hourLocal(h);
      const lab = (l0 + h) % 24 === 0 ? fmt({ weekday: 'short', day: 'numeric' }).format(d) : '12h';
      s += `<line x1="${x(h)}" x2="${x(h)}" y1="${H - MB}" y2="${H - MB + 3}" stroke="${css('--muted')}"/>`;
      s += `<text x="${x(h)}" y="${H - 6}" text-anchor="middle">${lab}</text>`;
    }
  }
  const step = niceStep(ymax);
  for (let v = 0; v <= ymax + 1e-9; v += step) {
    s += `<line x1="${ML}" x2="${W - MR}" y1="${y(v)}" y2="${y(v)}" stroke="${css('--line')}" stroke-width="${v ? 0.6 : 1}"/>`;
    s += `<text x="${ML - 5}" y="${y(v) + 3}" text-anchor="end">${+v.toFixed(1)}</text>`;
  }
  return { x, y, s };
}
function niceStep(m) {
  const raw = m / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
function niceMax(v, floor) { const m = Math.max(v, floor); const s = niceStep(m * 1.08); return Math.ceil(m * 1.08 / s) * s; }
function pathOf(xs, ys, x, y) { return xs.map((h, i) => (i ? 'L' : 'M') + x(h).toFixed(1) + ',' + y(ys[i]).toFixed(1)).join(''); }
function bandOf(xs, lo, hi, x, y) {
  return pathOf(xs, hi, x, y) + xs.slice().reverse().map((h, i) => 'L' + x(h).toFixed(1) + ',' + y(lo[lo.length - 1 - i]).toFixed(1)).join('') + 'Z';
}

/* A band (p10–p90) + median line chart with a hover readout. */
function bandChart(title, xs, lo, mid, hi, opt = {}) {
  const ymax = niceMax(Math.max(...hi, ...(opt.extra || [0])), opt.floor || 1);
  const A = axes(opt.xmax || S.meta.nh, ymax, { time: true });
  let s = A.s;
  for (const th of opt.thresholds || []) {
    if (th.v > ymax) continue;
    s += `<line x1="${ML}" x2="${W - MR}" y1="${A.y(th.v)}" y2="${A.y(th.v)}" stroke="${th.c}" stroke-width="1.6" stroke-dasharray="${th.dash || ''}"/>`;
    s += `<text x="${W - MR - 2}" y="${A.y(th.v) - 3}" text-anchor="end" style="fill:${th.tc || th.c}">${th.label}</text>`;
  }
  s += `<path d="${bandOf(xs, lo, hi, A.x, A.y)}" fill="${css('--band')}" stroke="none"/>`;
  if (opt.det) s += `<path d="${pathOf(xs, opt.det, A.x, A.y)}" fill="none" stroke="${css('--ink2')}" stroke-width="1.3" stroke-dasharray="4 3"/>`;
  s += `<path d="${pathOf(xs, mid, A.x, A.y)}" fill="none" stroke="${css('--accent')}" stroke-width="2"/>`;
  s += `<line class="xh" x1="0" x2="0" y1="${MT}" y2="${H - MB}" stroke="${css('--ink2')}" stroke-width="1" visibility="hidden"/>`;
  s += `<circle class="xd" r="3.5" fill="${css('--accent')}" stroke="${css('--panel')}" stroke-width="2" visibility="hidden"/>`;
  const div = document.createElement('div'); div.className = 'chart';
  div.innerHTML = `<div class="ct">${title}${opt.help ? help(opt.help) : ''}</div><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}">${s}</svg><div class="ro"></div>`;
  const svg = div.querySelector('svg'), ro = div.querySelector('.ro'), xh = svg.querySelector('.xh'), xd = svg.querySelector('.xd');
  const unit = opt.unit || '';
  const f = fmt({ weekday: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) * W / r.width;
    let best = 0;
    xs.forEach((h, i) => { if (Math.abs(A.x(h) - px) < Math.abs(A.x(xs[best]) - px)) best = i; });
    const X = A.x(xs[best]);
    xh.setAttribute('x1', X); xh.setAttribute('x2', X); xh.setAttribute('visibility', 'visible');
    xd.setAttribute('cx', X); xd.setAttribute('cy', A.y(mid[best])); xd.setAttribute('visibility', 'visible');
    const d = opt.det ? ` · det ${opt.det[best].toFixed(1)}` : '';
    ro.textContent = `${f.format(hourLocal(xs[best]))} · p10 ${lo[best].toFixed(1)} · p50 ${mid[best].toFixed(1)} · p90 ${hi[best].toFixed(1)}${d} ${unit}`;
  };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', () => { xh.setAttribute('visibility', 'hidden'); xd.setAttribute('visibility', 'hidden'); ro.textContent = ''; });
  return div;
}

function probChart(vals) {               // vals[day][thr] in %
  const A = axes(3, 100);
  const cols = [css('--y25'), css('--o50'), css('--r100')];
  let s = A.s.replace(/>(\d+)<\/text>/g, '>$1%</text>');
  const gw = (W - ML - MR) / 3, bw = gw / 4.6;
  vals.forEach((d, k) => {
    const gx = ML + gw * k;
    if (k === S.period) s += `<rect x="${gx + 2}" y="${MT}" width="${gw - 4}" height="${H - MT - MB}" fill="${css('--soft')}"/>`;
    d.forEach((v, q) => {
      const x0 = gx + gw / 2 - 1.5 * bw - 2 + q * (bw + 2), y0 = A.y(v), h = H - MB - y0;
      if (h > 0) s += `<path d="M${x0},${H - MB}V${y0 + Math.min(4, h)}q0,-4 4,-4h${bw - 8}q4,0 4,4V${H - MB}Z" fill="${cols[q]}"/>`;
      s += `<text x="${x0 + bw / 2}" y="${y0 - 3}" text-anchor="middle" style="fill:${css('--ink')}">${Math.round(v)}</text>`;
    });
    s += `<text x="${gx + gw / 2}" y="${H - 6}" text-anchor="middle">${t('Day')} ${k + 1}</text>`;
  });
  const div = document.createElement('div'); div.className = 'chart';
  div.innerHTML = `<div class="ct">${t('Share of members reaching each amount')}${help('probbars')}</div>
    <div class="key">${S.meta.thresholds.map((th, q) => `<span><i style="background:${cols[q]}"></i>≥ ${th} mm</span>`).join('')}</div>
    <svg viewBox="0 0 ${W} ${H}" role="img">${s}</svg>`;
  return div;
}

/* ---------------------------------------------------------------- right panel */
async function refreshDetail() {
  const el = $('detail');
  if (!S.sel) {
    if (isRiver(S.prod)) {
      S.sel = { kind: 'river', id: 670063921, label: t('Guayas River at Guayaquil') };
    } else {
      const g = S.geo.seats.features.find((f) => f.properties.id === 'Guayaquil').geometry.coordinates;
      S.sel = { kind: 'point', lnglat: g, cell: cellOf(g[0], g[1]), name: 'Guayaquil' };
    }
  }
  if (S.sel.kind === 'river' && !isRiver(S.prod)) { S.sel = null; return refreshDetail(); }
  if ((S.sel.kind === 'point' || S.sel.kind === 'canton') && isRiver(S.prod)) { S.sel = null; return refreshDetail(); }
  if (S.sel.kind === 'canton' && !(S.cser && S.cser[S.sel.id])) { S.sel = null; return refreshDetail(); }
  el.innerHTML = `<p class="sub">${t('Loading…')}</p>`;
  if (S.sel.kind === 'river') return riverDetail(el);
  let ser, probVals;
  if (S.sel.kind === 'canton') {
    ser = S.cser[S.sel.id];
    const row = S.meta.cantons.find((c) => c.id === S.sel.id);
    probVals = [0, 1, 2].map((k) => row.per[k].slice(2, 5));
    el.innerHTML = `<h4>${t('canton')} ${S.sel.name}</h4><div class="sub">${t('Canton average')} · ${prodLabel(S.prod)}</div>` +
      `<p class="cnote">${t('cantonavg note')}</p>`;
  } else {
    const { lnglat, cell } = S.sel;
    ser = await pointSeries(cell.j, cell.i);
    probVals = [0, 1, 2].map((k) => S.meta.thresholds.map((th) => fieldAt('pe' + String(th).padStart(3, '0'), k, cell.j, cell.i)));
    const cant = cantonAt(lnglat[0], lnglat[1]);
    const where = S.sel.name || (cant ? `${t('canton')} ${cant}` : '');
    el.innerHTML = `<h4>${where || t('Rain')}</h4><div class="sub">${t('Point forecast')} · ${lnglat[1].toFixed(3)}°, ${lnglat[0].toFixed(3)}° · ${prodLabel(S.prod)}</div>` +
      `<p class="cnote">${t('point note')}</p>`;
  }
  const xs = Array.from({ length: S.meta.nh }, (_, h) => h + 1);
  const key = `<div class="key"><span><i style="background:${css('--accent')}"></i>${t('median')}</span><span><i style="background:${css('--band')}"></i>${t('p10–p90 range')}</span></div>`;
  if (S.prod === 'w50') {
    el.insertAdjacentHTML('beforeend', key);
    el.appendChild(bandChart(t('Hourly max 10 m wind (m/s)'), xs, ser.w10, ser.w50, ser.w90, { floor: 5, unit: 'm/s', help: 'windts' }));
    el.insertAdjacentHTML('beforeend', `<p class="note">${t('wind note')}</p>`);
  } else if (isProb(S.prod)) {
    el.appendChild(probChart(probVals));
    el.insertAdjacentHTML('beforeend', `<p class="note">${t('likelihood note')}</p>`);
  } else {
    el.insertAdjacentHTML('beforeend', key);
    el.appendChild(bandChart(t('Hourly rain (mm)'), xs, ser.r10, ser.r50, ser.r90, { floor: 2, unit: 'mm', help: 'hourly' }));
    const th = [[25, '--y25'], [50, '--o50'], [100, '--r100']].map(([v, c]) => ({ v, c: css(c), tc: css('--ink2'), label: v + ' mm' }));
    el.appendChild(bandChart(t('Accumulated rain (mm)'), xs, ser.a10, ser.a50, ser.a90, { floor: 10, unit: 'mm', thresholds: th, help: 'accum' }));
  }
}

function riverDetail(el) {
  const id = S.sel.id, f = S.riverGeo.features.find((x) => x.properties.id === id);
  const r = S.rivers && S.rivers.reaches[id];
  const label = S.sel.label || `${t('Reach')} ${id}`;
  const area = f && f.properties.km2 ? ` · ${t('drainage area')} ${Math.round(f.properties.km2).toLocaleString()} km²` : '';
  el.innerHTML = `<h4>${label}</h4><div class="sub">GEOGLOWS ${S.rivers ? S.rivers.cycle.slice(0, 8) + ' 00Z' : ''}${area}</div>`;
  if (!r) { el.insertAdjacentHTML('beforeend', `<p class="sub">${t('no data')}</p>`); return; }
  const rpT = S.meta.rp_years;
  const badge = (k) => {
    const [v, p, c] = r.per[k];
    const rp = c == null ? t('no data') : c === 0 ? t('below 2 yr') : `≥ ${rpT[c - 1]} ${t('yr')}`;
    return `<div class="badge">${t('Day')} ${k + 1}<b>P${p == null ? '–' : Math.round(p)}</b>${rp}</div>`;
  };
  el.insertAdjacentHTML('beforeend', `<div class="ct" style="font-size:12px;font-weight:600;color:var(--ink2)">${t('Peak daily flow')}${help('badges')}</div><div class="badges">${[0, 1, 2].map(badge).join('')}</div>`);
  const xs = r.p50.map((_, i) => i * S.rivers.step_h);
  const rpv = f && f.properties.rp ? f.properties.rp : [];
  const det = r.det && r.det.every((v) => v != null) ? r.det : null;
  const dmax = Math.max(...r.p90, ...(det || []));
  const th = rpv.map((v, i) => ({ v, c: rpColor(i + 1), tc: css('--ink2'), label: `${rpT[i]} ${t('yr')}`, dash: '5 3' }))
    .filter((x) => x.v <= dmax * 2.5);
  el.insertAdjacentHTML('beforeend', `<div class="key"><span><i style="background:${css('--accent')}"></i>${t('ensemble median')}</span><span><i style="background:${css('--band')}"></i>${t('p10–p90 range')}</span><span><i style="background:${css('--ink2')}"></i>${t('deterministic (HRES)')}</span></div>`);
  el.appendChild(bandChart(t('Discharge (m³/s)'), xs, r.p10, r.p50, r.p90,
    { floor: 1, unit: 'm³/s', det, help: 'hydro', thresholds: th, extra: th.map((x) => x.v) }));
  el.insertAdjacentHTML('beforeend', `<p class="note">${t('river note')}</p>`);
}

/* ---------------------------------------------------------------- boot */
function renderAll() {
  if (window.obsText) window.obsText();
  applyLang(); renderHeader(); renderSummary(); renderDays(); renderTable(); renderProds(); renderLegend();
}

async function init() {
  try { S.lang = localStorage.getItem('tg.lang') || 'es'; } catch (e) { /* storage blocked */ }
  const qp = new URLSearchParams(location.search);
  if (qp.get('lang') === 'en' || qp.get('lang') === 'es') S.lang = qp.get('lang');
  if (PRODUCTS.some((g) => g.items.some((i) => i[0] === qp.get('prod')))) S.prod = qp.get('prod');
  if (/^[1-4]$/.test(qp.get('day') || '')) S.period = +qp.get('day') - 1;
  LANG = S.lang;
  let latest;
  try {
    latest = await getJSON('data/latest.json');
    [S.geo, S.riverGeo] = await Promise.all([getJSON('data/static/geo.json'), getJSON('data/static/rivers.json')]);
    await loadCycle(latest.cycle);
  } catch (e) {
    console.error(e);
    document.querySelector('main').innerHTML = `<div class="err">${t('Could not load the forecast data. Reload the page in a few minutes.')}</div>`;
    return;
  }
  const sel = $('cycle');
  for (const c of latest.cycles) {
    const o = document.createElement('option'); o.value = c;
    o.textContent = `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)} ${c.slice(8)}Z`; sel.appendChild(o);
  }
  sel.value = latest.cycle;
  sel.onchange = async () => { await loadCycle(sel.value); S.sel = null; renderAll(); drawField(); refreshDetail(); if (window.obsCycle) window.obsCycle(); };
  $('lang').onclick = () => {
    S.lang = S.lang === 'es' ? 'en' : 'es';
    try { localStorage.setItem('tg.lang', S.lang); } catch (e) { /* ignore */ }
    if (S.sel && S.sel.label) S.sel.label = t('Guayas River at Guayaquil');
    renderAll(); refreshDetail();
  };
  $('theme').onclick = () => {
    const r = document.documentElement;
    r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark';
    if (S.map) { const c = S.map.getCenter(), z = S.map.getZoom(); S.map.setStyle(baseStyle()); S.map.once('styledata', () => { addLayers(); S.map.jumpTo({ center: c, zoom: z }); }); }
    refreshDetail();
  };
  renderAll();
  refreshDetail();

  const probe = document.createElement('canvas');
  if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) {
    $('map').innerHTML = `<div class="err">${t('Your browser could not start the map (WebGL is unavailable). Try another browser or disable fingerprinting protection for this site.')}</div>`;
    return;
  }
  const b = turfBounds(S.geo.basin ? { coordinates: [S.geo.province.geometry.coordinates, S.geo.basin.geometry.coordinates] } : S.geo.province.geometry);
  S.map = new maplibregl.Map({ container: 'map', style: baseStyle(), bounds: b, fitBoundsOptions: { padding: { top: 20, right: 20, left: 20, bottom: 96 } }, preserveDrawingBuffer: true,
    attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
  S.map.touchZoomRotate.disableRotation();
  S.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  S.map.on('load', () => { addLayers(); });
  S.map.on('click', onClick);
  S.map.on('mousemove', (e) => {
    const river = isRiver(S.prod) && S.map.getLayer('riv-hit') &&
      S.map.queryRenderedFeatures([[e.point.x - 6, e.point.y - 6], [e.point.x + 6, e.point.y + 6]], { layers: ['riv-hit'] }).length;
    S.map.getCanvas().style.cursor = (!isRiver(S.prod) || river) ? 'pointer' : '';
  });
}
function turfBounds(g) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const walk = (c) => { if (typeof c[0] === 'number') { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else c.forEach(walk); };
  walk(g.coordinates);
  return [[x0, y0], [x1, y1]];
}
const READY = init();
