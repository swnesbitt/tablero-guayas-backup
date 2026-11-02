'use strict';
/* PNG downloads for the ensemble box: canton table, map, right-panel charts.
 * Each image is framed like the page: blue group band, title, run line, content, CliMAS source with logo. */
const PNG_LOGO = new Image(); PNG_LOGO.src = 'assets/climas-logo.png';
const PC = { bg: '#fbfbfa', panel: '#ffffff', ink: '#15150f', ink2: '#55554c', line: '#e3e3dc', ens: '#0b3d91',
  y25: '#f5d327', o50: '#f08a1c', r100: '#d7261e' };
const PFONT = '"Source Sans 3", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SC = 2;                                            // export at 2x for sharp text

function frame(body, title, file, opt = {}) {
  const band = opt.band || t('WRF ensemble').toUpperCase(), color = opt.color || PC.ens, stamp = opt.stamp || $('stamp').textContent;
  const pad = 18 * SC, top = 86 * SC, foot = 58 * SC;
  const m = document.createElement('canvas').getContext('2d');           // size the frame to its longest line
  m.font = `600 ${17 * SC}px ${PFONT}`; let need = m.measureText(title).width;
  m.font = `${12.5 * SC}px ${PFONT}`; need = Math.max(need, m.measureText(stamp).width);
  m.font = `${11 * SC}px ${PFONT}`;
  need = Math.max(need, m.measureText(t('Unofficial forecast') + ' · ' + t('Always check INAMHI') + ' · elnino-ec.climas.illinois.edu/tablero-guayas').width + 50 * SC);
  const W = Math.ceil(Math.max(body.width + 2 * pad, need + 2 * pad, 560 * SC)), H = top + body.height + foot;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = PC.bg; x.fillRect(0, 0, W, H);
  x.fillStyle = color; x.fillRect(0, 0, W, 5 * SC);
  x.textBaseline = 'top';
  x.fillStyle = color; x.font = `700 ${12 * SC}px ${PFONT}`; x.fillText(band, pad, 16 * SC);
  x.fillStyle = PC.ink; x.font = `600 ${17 * SC}px ${PFONT}`; x.fillText(title, pad, 34 * SC);
  x.fillStyle = PC.ink2; x.font = `${12.5 * SC}px ${PFONT}`; x.fillText(stamp, pad, 58 * SC);
  const bx = Math.round((W - body.width) / 2);
  x.drawImage(body, bx, top);
  x.strokeStyle = PC.line; x.lineWidth = SC; x.strokeRect(bx + 0.5, top + 0.5, body.width - 1, body.height - 1);
  const fy = top + body.height + 14 * SC, lh = 28 * SC;
  x.fillStyle = PC.line; x.fillRect(0, fy - 6 * SC, W, SC);
  let tx = pad;
  if (PNG_LOGO.complete && PNG_LOGO.naturalWidth) {
    const lw = lh * PNG_LOGO.naturalWidth / PNG_LOGO.naturalHeight;
    x.drawImage(PNG_LOGO, pad, fy + 4 * SC, lw, lh); tx = pad + lw + 10 * SC;
  }
  x.fillStyle = PC.ink; x.font = `600 ${12 * SC}px ${PFONT}`; x.fillText(t('Source: CliMAS, University of Illinois'), tx, fy + 6 * SC);
  x.fillStyle = PC.ink2; x.font = `${11 * SC}px ${PFONT}`;
  x.fillText(t('Unofficial forecast') + ' · ' + t('Always check INAMHI') + ' · elnino-ec.climas.illinois.edu/tablero-guayas', tx, fy + 21 * SC);
  c.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = file; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60e3);
  }, 'image/png');
}

const perTag = () => (S.period < 3 ? `d${S.period + 1}` : S.period === 3 ? 'total' : `12h${S.period - 3}`);
const perText = () => `${periodName(S.period)} (${periodLabel(S.period)})`;

/* (1) Canton table, drawn directly so the whole list fits regardless of the panel's scroll. */
function pngTable() {
  const rows = S.meta.cantons.slice().sort((a, b) => b.per[S.period][1] - a.per[S.period][1]);
  const rh = 26 * SC, head = 30 * SC, cw = [250 * SC, 100 * SC, 100 * SC], W = cw[0] + cw[1] + cw[2], H = head + rows.length * rh + 34 * SC;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = PC.panel; x.fillRect(0, 0, W, H);
  x.textBaseline = 'middle';
  x.fillStyle = PC.ink2; x.font = `600 ${11 * SC}px ${PFONT}`;
  x.fillText(t('Canton').toUpperCase(), 12 * SC, head / 2);
  x.textAlign = 'right';
  x.fillText(t('Median').toUpperCase(), cw[0] + cw[1] - 12 * SC, head / 2);
  x.fillText('P90', W - 12 * SC, head / 2);
  x.fillStyle = PC.line; x.fillRect(0, head - SC, W, SC);
  rows.forEach((r, i) => {
    const y = head + i * rh;
    x.textAlign = 'left'; x.fillStyle = PC.ink; x.font = `${13 * SC}px ${PFONT}`;
    x.fillText(r.name, 12 * SC, y + rh / 2);
    [r.per[S.period][0], r.per[S.period][1]].forEach((v, k) => {
      const right = (k === 0 ? cw[0] + cw[1] : W) - 12 * SC, bw = 60 * SC, bh = 18 * SC;
      const col = v >= 100 ? PC.r100 : v >= 50 ? PC.o50 : v >= 25 ? PC.y25 : null;
      if (col) { x.fillStyle = col; x.fillRect(right - bw, y + (rh - bh) / 2, bw, bh); }
      x.textAlign = 'right'; x.fillStyle = v >= 100 ? '#ffffff' : PC.ink; x.font = `${12.5 * SC}px ${PFONT}`;
      x.fillText(v.toFixed(1), right - 6 * SC, y + rh / 2);
    });
    x.fillStyle = PC.line; x.fillRect(0, y + rh - SC, W, SC);
  });
  // color key in place of a footnote, so nothing runs past the edge
  const ky = H - 23 * SC; let kx = 12 * SC;
  x.textAlign = 'left'; x.font = `${11 * SC}px ${PFONT}`;
  x.fillStyle = PC.ink2; x.fillText(t('Canton mean, mm:'), kx, ky); kx += x.measureText(t('Canton mean, mm:')).width + 10 * SC;
  for (const [col, lab] of [[PC.y25, '≥ 25'], [PC.o50, '≥ 50'], [PC.r100, '≥ 100']]) {
    x.fillStyle = col; x.fillRect(kx, ky - 7 * SC, 22 * SC, 14 * SC); kx += 26 * SC;
    x.fillStyle = PC.ink2; x.fillText(lab, kx, ky); kx += x.measureText(lab).width + 12 * SC;
  }
  frame(c, `${t('Canton rainfall (mm)')} · ${perText()}`, `climas_tablero_cantones_${S.cycle}_${perTag()}.png`);
}

const skip = (el) => el.classList && (el.classList.contains('help') || el.classList.contains('png') ||
  el.classList.contains('maplibregl-ctrl-top-left') || el.id === 'hint' || el.id === 'toast');

/* (2) Map, captured from the page without its floating legend; the legend is drawn below the map
 * so it never hides part of the province. */
function legendStrip(W) {
  const p = S.prod;
  let pal, unit = '', labels = null;
  if (p === 'p50' || p === 'p90') { pal = RAIN; unit = 'mm'; }
  else if (isProb(p)) { pal = PROB; unit = '%'; }
  else if (p === 'w50') { pal = WIND; unit = 'm/s'; }
  else if (p === 'flow') { pal = FLOW; unit = 'm³/s'; }
  else if (p === 'pct') { pal = PCT; labels = PCT.labels; }
  else { pal = RPC; unit = t('yr'); labels = RPC.labels; }
  const H = 64 * SC, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.fillStyle = PC.panel; x.fillRect(0, 0, W, H);
  x.textBaseline = 'top'; x.fillStyle = PC.ink; x.font = `600 ${12.5 * SC}px ${PFONT}`;
  x.fillText(`${prodLabel(p)} · ${periodName(S.period)}${unit ? ' (' + unit + ')' : ''}`, 14 * SC, 10 * SC);
  const n = pal.colors.length, sw = Math.min(56 * SC, (W - 28 * SC) / n), y0 = 32 * SC;
  pal.colors.forEach((col, i) => {
    x.fillStyle = col; x.fillRect(14 * SC + i * sw, y0, sw, 11 * SC);
    x.fillStyle = PC.ink2; x.font = `${11 * SC}px ${PFONT}`; x.textAlign = 'center';
    x.fillText(String(labels ? labels[i] : pal.levels[i]), 14 * SC + i * sw + sw / 2, y0 + 14 * SC);
  });
  x.textAlign = 'left';
  return c;
}

async function pngMap() {
  if (!S.map || !window.html2canvas) return;
  await new Promise((r) => { S.map.once('idle', r); S.map.triggerRepaint(); });
  const noLegend = (el) => skip(el) || el.id === 'legend';
  const map = await html2canvas(document.querySelector('#mid .mapwrap'), { scale: SC, useCORS: true, backgroundColor: PC.panel, ignoreElements: noLegend });
  const leg = legendStrip(map.width);
  const body = document.createElement('canvas'); body.width = map.width; body.height = map.height + leg.height;
  const bx = body.getContext('2d');
  bx.drawImage(map, 0, 0); bx.drawImage(leg, 0, map.height);
  bx.fillStyle = PC.line; bx.fillRect(0, map.height, map.width, SC);
  frame(body, `${prodLabel(S.prod)} · ${perText()}`, `climas_tablero_mapa_${S.prod}_${S.cycle}_${perTag()}.png`);
}

/* (3) Right-panel charts as shown. */
async function pngCharts() {
  if (!window.html2canvas) return;
  const el = $('detail');
  const body = await html2canvas(el, { scale: SC, backgroundColor: PC.panel, ignoreElements: skip,
    windowHeight: el.scrollHeight, height: el.scrollHeight });
  const where = (el.querySelector('h4') || {}).textContent || '';
  const slug = where.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'punto';
  frame(body, `${where} · ${prodLabel(S.prod)}`, `climas_tablero_${slug}_${S.prod}_${S.cycle}.png`);
}

/* (4) The 10-day global ensemble table (ens10.js) for the model on screen: key, every column
 * (the panel scrolls sideways on a phone), notes and attribution; light theme whatever the page shows. */
async function pngGlob() {
  if (!window.html2canvas || !document.querySelector('#g10 .g10t')) return;
  const host = $('g10'), tw = host.querySelector('.g10t').scrollWidth + 24;
  const body = await html2canvas(host, { scale: SC, backgroundColor: PC.panel, width: tw, windowWidth: Math.max(tw + 40, innerWidth),
    height: host.scrollHeight + 400,
    ignoreElements: (el) => skip(el) || (el.classList && el.classList.contains('g10bar')),
    onclone: (doc) => {
      doc.documentElement.removeAttribute('data-theme');
      const st = doc.createElement('style');                     // html2canvas splits letter-spaced text into gaps
      st.textContent = '#g10 *{letter-spacing:0!important;font-variant-numeric:normal!important;font-kerning:none!important;font-variant-ligatures:none!important} #g10 .g10key{white-space:nowrap}';
      doc.head.appendChild(st);
      const g = doc.getElementById('g10'); g.style.width = tw + 'px';
      doc.querySelector('.g10tw').style.overflow = 'visible';
      doc.querySelectorAll('.g10t .place').forEach((e) => (e.style.position = 'static'));
    } });
  const trim = document.createElement('canvas');                // drop the slack below the notes
  const h = Math.min(body.height, Math.ceil((host.scrollHeight - host.querySelector('.g10bar').offsetHeight) * SC) + 8 * SC);
  trim.width = body.width; trim.height = h; trim.getContext('2d').drawImage(body, 0, 0);
  const sel = (host.querySelector('.g10seg button.on') || {}).dataset || {};
  const stamp = (host.querySelector('.g10t th.place small') || {}).textContent || '';
  frame(trim, $('g10h').textContent, `climas_tablero_10dias_${sel.m || 'grand'}_${host.dataset.cycle || ''}.png`,
    { band: $('g10title').textContent.toUpperCase(), color: '#5b3f99', stamp });
}

READY.then(() => {
  const busy = (btn, fn) => async () => {
    const old = btn.textContent; btn.disabled = true; btn.textContent = '…';
    try { await fn(); } catch (e) { console.error(e); toast(t('Could not create the image.')); }
    btn.disabled = false; btn.textContent = old;
  };
  $('pngtable').onclick = busy($('pngtable'), pngTable);
  $('pngmap').onclick = busy($('pngmap'), pngMap);
  $('pngcharts').onclick = busy($('pngcharts'), pngCharts);
  if ($('pngg10')) $('pngg10').onclick = busy($('pngg10'), pngGlob);
});
