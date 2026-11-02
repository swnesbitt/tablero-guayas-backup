'use strict';
/* Bottom row: observed GOES loop | simulated WRF-GFS clouds (IR) | simulated rain.
 * The three maps share one camera; the middle and right panels share one forecast hour. Uses app.js globals. */
const OBS_BOX = [[-82.5, -4.5], [-77.5, 0.5]];
const SAT_BASE = new URL('../sa-view/', document.baseURI).href;
const O = { goes: null, wrf: null, rain: null, sat: null, band: 'c13', gtimes: [], gi: 0, wi: 0,
  gplay: null, wplay: null, recording: false, syncing: false };

const GOLD = '#f2b33d', LAB_HALO = '#0b1f3a';
const SHORT = { 'General Villamil': 'Playas', 'Velasco Ibarra': 'El Empalme', 'Santa Lucía': 'Sta. Lucía',
  'San Jacinto de Yaguachi': 'Yaguachi', 'El Salitre': 'Salitre', 'Marcelino Maridueña': 'Marcelino Maridueña' };
const IR_RAMP = ['#ffffff', '#ff00ff', '#9600c8', '#c80000', '#ff7800', '#ffe600', '#00b450', '#0078c8',
  '#505050', '#797979', '#a2a2a2', '#cccccc', '#f5f5f5'];            /* goes-view ir_ramp, 180-300 K in 10 K steps */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const toLocal = (d) => new Date(d.getTime() + (S.meta ? S.meta.tz_h : -5) * 3600e3);
const satDate = (id) => new Date(Date.UTC(+id.slice(0, 4), +id.slice(4, 6) - 1, +id.slice(6, 8), +id.slice(9, 11), +id.slice(11, 13)));
const fmtL = (d) => fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(toLocal(d));

function webglOK() {
  const c = document.createElement('canvas');
  return !!(c.getContext('webgl2') || c.getContext('webgl'));
}

function darkStyle() {
  return { version: 8, glyphs: GLYPHS, transition: { duration: 0, delay: 0 }, sources: { base: { type: 'raster', tileSize: 256,
    tiles: [`https://basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png?key=${CK}`],
    attribution: '&copy; OpenStreetMap &copy; CARTO · GADM · NOAA GOES' } },
    layers: [{ id: 'base', type: 'raster', source: 'base' }] };
}

function obsMap(id) {
  const m = new maplibregl.Map({ container: id, style: darkStyle(), bounds: OBS_BOX, fitBoundsOptions: { padding: 4 },
    attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, preserveDrawingBuffer: true });
  m.touchZoomRotate.disableRotation();
  m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
  m.on('move', (e) => {                       // one camera for all three maps
    if (O.syncing || !e.originalEvent) return;
    O.syncing = true;
    const cam = { center: m.getCenter(), zoom: m.getZoom() };
    for (const o of [O.goes, O.wrf, O.rain]) if (o && o !== m) o.jumpTo(cam);
    O.syncing = false;
  });
  return m;
}

/* Boundaries styled like a broadcast map: faint canton lines, gold province edge, white labels on a navy halo. */
function addOverlays(m) {
  if (O.lines) {                               // Natural Earth coast and national borders, above the imagery
    m.addSource('o-coast', { type: 'geojson', data: O.lines.coast });
    m.addLayer({ id: 'o-coast', type: 'line', source: 'o-coast', paint: { 'line-color': '#c9d3df', 'line-width': 1, 'line-opacity': 0.85 } });
    m.addSource('o-bord', { type: 'geojson', data: O.lines.borders });
    m.addLayer({ id: 'o-bord', type: 'line', source: 'o-bord',
      paint: { 'line-color': '#e6e9ee', 'line-width': 1.2, 'line-dasharray': [3, 2], 'line-opacity': 0.9 } });
  }
  m.addSource('o-cant', { type: 'geojson', data: S.geo.cantons });
  m.addLayer({ id: 'o-cant', type: 'line', source: 'o-cant',
    paint: { 'line-color': GOLD, 'line-width': 0.6, 'line-opacity': 0.35 } });
  m.addSource('o-prov', { type: 'geojson', data: S.geo.province });
  m.addLayer({ id: 'o-prov-case', type: 'line', source: 'o-prov', layout: { 'line-join': 'round' },
    paint: { 'line-color': '#000000', 'line-width': 4.2, 'line-opacity': 0.35 } });
  m.addLayer({ id: 'o-prov', type: 'line', source: 'o-prov', layout: { 'line-join': 'round' },
    paint: { 'line-color': GOLD, 'line-width': 2.2 } });
  const seats = { type: 'FeatureCollection', features: S.geo.seats.features.map((f) => ({ ...f,
    properties: { ...f.properties, lab: SHORT[f.properties.name] || f.properties.name } })) };
  m.addSource('o-seats', { type: 'geojson', data: seats });
  const lab = (filter, size, halo) => ({ type: 'symbol', source: 'o-seats', filter, layout: {
    'text-field': ['get', 'lab'], 'text-font': ['Noto Sans Medium'], 'text-size': size, 'text-padding': 1 },
    paint: { 'text-color': '#ffffff', 'text-halo-color': LAB_HALO, 'text-halo-width': halo, 'text-halo-blur': 0.3 } });
  m.addLayer({ id: 'o-lab', ...lab(['!=', ['get', 'id'], 'Guayaquil'], 11, 2) });
  const g = lab(['==', ['get', 'id'], 'Guayaquil'], 13, 2.4);
  g.layout['text-allow-overlap'] = true; g.layout['text-ignore-placement'] = true;
  m.addLayer({ id: 'o-gye', ...g });
}

const firstOverlay = (m) => (m.getLayer('o-coast') ? 'o-coast' : 'o-cant');

function idle(m) {
  return new Promise((res) => { m.once('idle', res); m.triggerRepaint(); });
}

/* Play/pause + slider wiring. */
function loopControls(kind, n, show) {
  const play = $(kind + 'play'), sl = $(kind + 'slider');
  sl.max = Math.max(0, n - 1);
  sl.oninput = () => { stop(); show(+sl.value); };
  let timer = null;
  function stop() { if (timer) { clearInterval(timer); timer = null; } play.textContent = '▶'; }
  play.onclick = () => {
    if (timer) return stop();
    play.textContent = '❚❚';
    timer = setInterval(() => { const i = (+sl.value + 1) % n; sl.value = i; show(i); }, kind === 'goes' ? 220 : 350);
  };
  return { stop, set: (i) => { sl.value = i; show(i); } };
}

/* ---------------------------------------------------------------- GOES */
async function initGoes() {
  O.sat = await getJSON(SAT_BASE + 'sat.json');
  O.goes = obsMap('goesmap');
  O.goes.on('load', () => { addOverlays(O.goes); setBand(O.band); });
  document.querySelectorAll('#goesband button').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('#goesband button').forEach((x) => x.classList.toggle('on', x === b));
      setBand(b.dataset.b);
    };
  });
}

function setBand(band) {
  const m = O.goes, bd = O.sat.bands[band];
  if (O.gplay) O.gplay.stop();
  for (const t of O.gtimes) {
    const id = 'g-' + t;
    if (m.getLayer(id)) m.removeLayer(id);
    if (m.getSource(id)) m.removeSource(id);
  }
  O.band = band;
  O.gtimes = bd.times.slice(-48);
  O.gtimes.forEach((t, i) => {
    const id = 'g-' + t;
    m.addSource(id, { type: 'raster', tileSize: O.sat.tile || 256, bounds: O.sat.bounds, minzoom: bd.minzoom, maxzoom: bd.maxzoom,
      tiles: [SAT_BASE + O.sat.tiles.replace('{band}', band).replace('{id}', t).replace('{ext}', bd.ext)] });
    m.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': i === O.gtimes.length - 1 ? 1 : 0,
      'raster-fade-duration': 0, 'raster-resampling': 'linear' } }, firstOverlay(m));
  });
  O.gi = O.gtimes.length - 1;
  goesLegend();
  O.gplay = loopControls('goes', O.gtimes.length, showGoes);
  O.gplay.set(O.gi);
}

function showGoes(i) {
  const m = O.goes;
  if (m.getLayer('g-' + O.gtimes[O.gi])) m.setPaintProperty('g-' + O.gtimes[O.gi], 'raster-opacity', 0);
  O.gi = i;
  m.setPaintProperty('g-' + O.gtimes[i], 'raster-opacity', 1);
  $('goests').textContent = goesLabel(i);
}
const goesLabel = (i) => `GOES-East ${O.sat.bands[O.band].label} · ${fmtL(satDate(O.gtimes[i]))} (${i + 1}/${O.gtimes.length})`;

/* ---------------------------------------------------------------- WRF-GFS clouds + rain (one clock) */
function initWrf() {
  O.wrf = obsMap('wrfmap');
  O.rain = obsMap('rainmap');
  let n = 0;
  const ready = () => { if (++n === 2) { O.wready = true; obsCycle(); } };
  O.wrf.on('load', () => { addOverlays(O.wrf); ready(); });
  O.rain.on('load', () => { addOverlays(O.rain); ready(); });
  irLegend(); rainLegend();
}

window.obsCycle = function () {
  const L = S.meta && S.meta.wrfloop;
  if (!O.wready) return;
  if (O.wplay) O.wplay.stop();
  for (const [m, id] of [[O.wrf, 'w-ir'], [O.rain, 'w-rain']]) { if (m.getLayer(id)) m.removeLayer(id); if (m.getSource(id)) m.removeSource(id); }
  if (!L) { $('wrfts').textContent = t('No simulation loop for this cycle.'); return; }
  const base = `data/${S.cycle}/`;
  [...L.ir, ...L.rain].forEach((u) => { const im = new Image(); im.src = base + u; });   // preload
  O.wrf.addSource('w-ir', { type: 'image', url: base + L.ir[0], coordinates: L.corners });
  O.wrf.addLayer({ id: 'w-ir', type: 'raster', source: 'w-ir', paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0 } }, firstOverlay(O.wrf));
  O.rain.addSource('w-rain', { type: 'image', url: base + L.rain[0], coordinates: L.corners });
  O.rain.addLayer({ id: 'w-rain', type: 'raster', source: 'w-rain', paint: { 'raster-resampling': 'linear', 'raster-fade-duration': 0 } }, firstOverlay(O.rain));
  O.wplay = loopControls('wrf', L.times.length, showWrf);
  O.wplay.set(0);
};

function showWrf(i) {
  const L = S.meta.wrfloop, base = `data/${S.cycle}/`;
  O.wi = i;
  O.wrf.getSource('w-ir').updateImage({ url: base + L.ir[i], coordinates: L.corners });
  O.rain.getSource('w-rain').updateImage({ url: base + L.rain[i], coordinates: L.corners });
  $('wrfts').textContent = wrfLabel(i, 'Simulated IR');
  $('raints').textContent = wrfLabel(i, 'Hourly rain');
}
const wrfLabel = (i, what) => `WRF-GFS 3 km · ${t(what || 'Simulated IR')} · ${S.meta.init.slice(0, 10)} ${S.meta.init.slice(11, 13)}Z · +${i + 1} h · ${fmtL(new Date(S.meta.wrfloop.times[i]))}`;

function goesLegend() {
  const el = $('goesleg'); if (!el) return;
  if (O.band === 'c02') {
    el.innerHTML = `<div class="t">${t('Visible (reflectance)')}</div><div class="bar" style="background:linear-gradient(90deg,#000,#fff)"></div>` +
      `<div class="ticks"><span>${t('dark')}</span><span>${t('bright')}</span></div>`;
  } else {
    el.innerHTML = `<div class="t">IR 10.3 µm (K)</div><div class="bar" style="background:linear-gradient(90deg,${IR_RAMP.join(',')})"></div>` +
      `<div class="ticks"><span>180</span><span>210</span><span>240</span><span>270</span><span>300</span></div>`;
  }
}

function irLegend() {
  $('wrfleg').innerHTML = `<div class="t">${t('Simulated IR')} (K)</div><div class="bar" style="background:linear-gradient(90deg,${IR_RAMP.join(',')})"></div>` +
    `<div class="ticks"><span>180</span><span>210</span><span>240</span><span>270</span><span>300</span></div>`;
}
function rainLegend() {
  $('rainleg').innerHTML = `<div class="t">${t('Hourly rain')} (mm/h)</div><div class="row">` +
    RAIN.colors.map((c, i) => `<div><i class="sw" style="background:${c};display:block"></i><span>${RAIN.levels[i]}</span></div>`).join('') + '</div>';
}

/* ---------------------------------------------------------------- download */
/* Exported video frames are laid out like the page: group band, title, time, map, legend, source with logo. */
const LOGO = new Image(); LOGO.src = 'assets/climas-logo.png';
const EXP = { bg: '#fbfbfa', panel: '#ffffff', ink: '#15150f', ink2: '#55554c', line: '#e3e3dc', obs: '#0b6e4f', fc: '#9a5b00' };
const FONT = '"Source Sans 3", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function exportMeta(kind) {
  if (kind === 'goes') return { group: t('Observed'), gc: EXP.obs, title: t('Observed satellite') + ` · GOES-East ${O.sat.bands[O.band].label}`,
    time: fmtL(satDate(O.gtimes[O.gi])) + ` (${O.gi + 1}/${O.gtimes.length})`, legend: O.band === 'c02' ? 'vis' : 'ir' };
  const init = `${S.meta.init.slice(0, 10)} ${S.meta.init.slice(11, 13)}Z`;
  return { group: t('Forecast'), gc: EXP.fc,
    title: (kind === 'rain' ? t('Simulated rain (WRF-GFS)') : t('Simulated clouds (WRF-GFS IR)')) + ` · ${t('initialized')} ${init}`,
    time: `+${O.wi + 1} h · ${fmtL(new Date(S.meta.wrfloop.times[O.wi]))}`, legend: kind === 'rain' ? 'rain' : 'ir' };
}

function drawLegend(cx, kind, x, y, w, d) {
  cx.fillStyle = EXP.ink; cx.font = `600 ${12 * d}px ${FONT}`; cx.textBaseline = 'top';
  const lab = kind === 'rain' ? `${t('Hourly rain')} (mm/h)` : kind === 'vis' ? t('Visible (reflectance)') : 'IR (K)';
  cx.fillText(lab, x, y);
  const by = y + 18 * d, bh = 10 * d, bw = Math.min(w, 360 * d);
  cx.font = `${11 * d}px ${FONT}`; cx.fillStyle = EXP.ink2;
  if (kind === 'rain') {
    const n = RAIN.colors.length, sw = bw / n;
    RAIN.colors.forEach((c, i) => {
      cx.fillStyle = c; cx.fillRect(x + i * sw, by, sw, bh);
      cx.fillStyle = EXP.ink2; cx.textAlign = 'center'; cx.fillText(String(RAIN.levels[i]), x + i * sw + sw / 2, by + bh + 3 * d);
    });
  } else {
    const g = cx.createLinearGradient(x, 0, x + bw, 0);
    const stops = kind === 'vis' ? ['#000000', '#ffffff'] : IR_RAMP;
    stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
    cx.fillStyle = g; cx.fillRect(x, by, bw, bh);
    cx.fillStyle = EXP.ink2;
    const ticks = kind === 'vis' ? [[0, t('dark')], [1, t('bright')]] : [180, 210, 240, 270, 300].map((v) => [(v - 180) / 120, String(v)]);
    for (const [f, l] of ticks) { cx.textAlign = f === 0 ? 'left' : f === 1 ? 'right' : 'center'; cx.fillText(l, x + f * bw, by + bh + 3 * d); }
  }
  cx.textAlign = 'left';
}

function drawExport(cx, src, kind, L) {
  const { W, H, d, top, foot } = L, M = exportMeta(kind), pad = 14 * d;
  cx.fillStyle = EXP.bg; cx.fillRect(0, 0, W, top + H + foot);
  cx.fillStyle = M.gc; cx.fillRect(0, 0, W, 5 * d);                                   // group band
  cx.textBaseline = 'top'; cx.textAlign = 'left';
  cx.fillStyle = M.gc; cx.font = `700 ${12 * d}px ${FONT}`; cx.fillText(M.group.toUpperCase(), pad, 14 * d);
  cx.fillStyle = EXP.ink; cx.font = `600 ${16 * d}px ${FONT}`; cx.fillText(M.title, pad, 32 * d);
  cx.fillStyle = EXP.ink2; cx.font = `${13 * d}px ${FONT}`; cx.fillText(M.time, pad, 54 * d);
  cx.drawImage(src, 0, top);
  cx.strokeStyle = EXP.line; cx.lineWidth = d; cx.strokeRect(0.5, top + 0.5, W - 1, H - 1);
  const fy = top + H;
  cx.fillStyle = EXP.panel; cx.fillRect(0, fy, W, foot);
  drawLegend(cx, M.legend, pad, fy + 10 * d, W - 2 * pad, d);
  const ly = fy + 58 * d, lh = 26 * d;
  cx.fillStyle = EXP.line; cx.fillRect(0, ly - 8 * d, W, d);
  if (LOGO.complete && LOGO.naturalWidth) cx.drawImage(LOGO, pad, ly, lh * LOGO.naturalWidth / LOGO.naturalHeight, lh);
  cx.fillStyle = EXP.ink; cx.font = `600 ${12 * d}px ${FONT}`; cx.textBaseline = 'top';
  const tx = pad + lh * (LOGO.naturalWidth ? LOGO.naturalWidth / LOGO.naturalHeight : 0) + 10 * d;
  cx.fillText(t('Source: CliMAS, University of Illinois'), tx, ly + 1 * d);
  cx.fillStyle = EXP.ink2; cx.font = `${11 * d}px ${FONT}`;
  cx.fillText(t('Unofficial forecast') + ' · elnino-ec.climas.illinois.edu/tablero-guayas', tx, ly + 15 * d);
}

async function record(kind) {
  if (O.recording) return;
  const m = kind === 'goes' ? O.goes : kind === 'rain' ? O.rain : O.wrf, btn = $(kind + 'dl');
  const n = kind === 'goes' ? O.gtimes.length : (S.meta.wrfloop ? S.meta.wrfloop.times.length : 0);
  if (!m || !n) return;
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { toast(t('Your browser cannot record video.')); return; }
  const mime = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((x) => MediaRecorder.isTypeSupported(x));
  if (!mime) { toast(t('Your browser cannot record video.')); return; }
  O.recording = true;
  const ctl = kind === 'goes' ? O.gplay : O.wplay; ctl.stop();
  const src = m.getCanvas(), d = window.devicePixelRatio || 1;
  const L = { W: src.width, H: src.height, d, top: Math.round(76 * d), foot: Math.round(100 * d) };
  const comp = document.createElement('canvas');
  comp.width = L.W; comp.height = (L.top + L.H + L.foot) + ((L.top + L.H + L.foot) % 2);   // even height for H.264
  const cx = comp.getContext('2d');
  const stream = comp.captureStream(0), track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 });
  const chunks = []; rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const done = new Promise((r) => { rec.onstop = r; });
  const old = btn.textContent;
  const draw = () => { drawExport(cx, src, kind, L); if (track.requestFrame) track.requestFrame(); };
  rec.start();
  try {
    for (let i = 0; i < n; i++) {
      btn.textContent = t('Recording {i}/{n}', { i: i + 1, n });
      ctl.set(i);
      await idle(m);
      draw();
      await sleep(kind === 'goes' ? 180 : 300);
    }
    for (let k = 0; k < 4; k++) { draw(); await sleep(250); }
  } finally {
    rec.stop(); await done;
    btn.textContent = old; O.recording = false;
  }
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const name = kind === 'goes' ? `climas_goes_${O.band}_guayas_${O.gtimes[0]}_${O.gtimes[n - 1]}.${ext}`
    : `climas_wrf-gfs_${kind === 'rain' ? 'lluvia' : 'nubes'}_guayas_${S.cycle}.${ext}`;
  const url = URL.createObjectURL(new Blob(chunks, { type: mime.split(';')[0] }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60e3);
}

/* ---------------------------------------------------------------- boot */
window.obsText = function () {
  if (O.sat && O.gtimes.length) $('goests').textContent = goesLabel(O.gi);
  if (O.wrf && S.meta && S.meta.wrfloop && O.wrf.getSource && O.wrf.getSource('w-ir')) $('wrfts').textContent = wrfLabel(O.wi, 'Simulated IR');
  if ($('wrfleg')) irLegend();
  if (O.sat) goesLegend();
  if ($('rainleg')) rainLegend();
  if (O.rain && S.meta && S.meta.wrfloop && O.rain.getSource('w-rain')) $('raints').textContent = wrfLabel(O.wi, 'Hourly rain');
};

READY.then(async () => {
  if (!S.geo || !S.meta) return;
  if (!webglOK()) {
    for (const id of ['goesmap', 'wrfmap', 'rainmap']) {
      $(id).innerHTML = `<div class="err">${t('Your browser could not start the map (WebGL is unavailable). Try another browser or disable fingerprinting protection for this site.')}</div>`;
    }
    return;
  }
  try { O.lines = await getJSON('data/static/lines.json'); } catch (e) { O.lines = null; }
  $('goesdl').onclick = () => record('goes');
  $('wrfdl').onclick = () => record('wrf');
  $('raindl').onclick = () => record('rain');
  initGoes().catch((e) => { console.error(e); $('goests').textContent = t('Satellite imagery is not available right now.'); });
  initWrf();
});
