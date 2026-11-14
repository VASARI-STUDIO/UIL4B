// Theme 27, Swiss Field, lane g2: the logo pages that belong to the Free twelve (clear-space, logo-versions).
// The ruler measures real things, so here it measures the logo in x, the cap height of the name (the brand's clear-space unit):
// on clear-space the clear zone stands on the share ruler as a field does, with a scale in x hanging from its top edge;
// on logo-versions the four shapes stand on one baseline, one x the same length under each, each with its own scale in x.
// Every length is computed from ctx.logo; nothing names a colour id, a hex or a brand.
import { A, nb, M, PAGE_W, RULER_Y, CHROME, at, box, page as swissPage, folio, wrap, titleHtml } from './swiss.js';

const r2 = (n) => Math.round(n * 100) / 100;
const fx = (n) => n.toFixed(1); // one decimal always, so a column of sizes reads as one kind of number
const hline = (x, y, w, c) => box(`left:${r2(x)}px;top:${r2(y)}px;width:${r2(w)}px;height:1px;background:${c}`);
const vline = (x, y, h, c) => box(`left:${r2(x)}px;top:${r2(y)}px;width:1px;height:${r2(h)}px;background:${c}`);
const head = (t, c = 'var(--ink)') => `<div class="c-head" style="color:${c}">${A(t)}</div>`;
const note = (t, c = 'var(--quiet)') => `<div class="c-note" style="color:${c}">${A(t)}</div>`;
// the logo, with a short label on a slot frame too small to hold the engine's own
const art = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: r2(w), ...o, ...(ctx.edition === 'slot' && w < 160 ? { label: 'Logo' } : {}) });

// The page, as swiss.js builds it. Folios follow the theme's Free twelve; an id outside that list gets no folio rather than a wrong one.
function page(ctx, id, opts) {
  const html = swissPage(ctx, id, opts);
  return folio(id) === '000' ? html.replace(/(<span class="c-head rl fo">)000(<\/span>)/, '$1$2') : html;
}

// A scale in x: a 1 px line with a tick hanging from it every x, the whole ones numbered above (every 1, 2 or 5, at least 40 px apart),
// and the full length printed at its right end. `len` is in x; `u` is px per x.
function xScale(x0, y, len, u, color, labels = true) {
  const step = [1, 2, 5, 10].find((s) => s * u >= 40) || 10;
  let h = hline(x0, y, len * u, color);
  for (let k = 0; k <= Math.floor(len + 1e-6); k++) h += vline(x0 + k * u, y, k === 0 ? 14 : 8, color);
  h += vline(x0 + len * u - 1, y, 14, color);
  if (!labels) return h;
  const endW = 64, endX = x0 + len * u;
  for (let k = 0; k <= Math.floor(len + 1e-6); k += step) {
    if (k > 0 && endX - (x0 + k * u) < 48) continue;
    h += at(x0 + k * u - 20, y - 24, `<div class="c-value" style="text-align:center">${k}</div>`, { w: 40, style: `color:${color}` });
  }
  return h + at(endX - endW, y - 24, `<div class="c-value" style="text-align:right">${fx(len)} x</div>`, { w: endW, style: `color:${color}` });
}

// ---------------------------------------------------------------- clear-space
// The primary logo, as large as the page allows, with one x of clear space drawn round it. The clear zone stands on the ruler like a risen field
// (its foot is the strip's top edge), a scale in x hangs from its top edge, and a dimension of one x sits in each of its four bands.
function clearSpace(ctx) {
  const g = ctx.logo.geos.colour, unit = ctx.logo.geo.unit;
  const xw = g.w / unit, xh = g.h / unit, fwX = xw + 2, fhX = xh + 2;
  // px per x: the frame no wider than 1180 and no taller than the room from y 320 to the ruler
  const u = Math.floor(Math.min(1180 / fwX, (RULER_Y - 320) / fhX));
  const lw = xw * u, lh = xh * u, fw = fwX * u, fh = fhX * u, x0 = M, y0 = RULER_Y - fh;
  const t2 = 'var(--tone2)';
  const frame = box(`left:${x0}px;top:${r2(y0)}px;width:${r2(fw)}px;height:${r2(fh)}px;border:1px solid ${t2};border-bottom:0;box-sizing:border-box`)
    + box(`left:${x0 + u}px;top:${r2(y0 + u)}px;width:${r2(lw)}px;height:${r2(lh)}px;border:1px solid var(--hair);box-sizing:border-box`)
    + at(x0 + u, y0 + u, art(ctx, 'colour', lw));
  // one x in each band: across the side bands at the logo's middle, down the top and bottom bands at its centre
  const midY = y0 + u + lh / 2, midX = x0 + u + lw / 2;
  const across = (x) => hline(x, midY, u, t2) + vline(x, midY - 6, 13, t2) + vline(x + u - 1, midY - 6, 13, t2)
    + at(x, midY - 30, '<div class="c-note" style="text-align:center">x</div>', { w: u, style: 'color:var(--quiet)' });
  const down = (y) => vline(midX, y, u, t2) + hline(midX - 6, y, 13, t2) + hline(midX - 6, y + u - 1, 13, t2)
    + at(midX + 12, y + u / 2 - 12, '<div class="c-note">x</div>', { style: 'color:var(--quiet)' });
  const dims = across(x0) + across(x0 + u + lw) + down(y0) + down(y0 + u + lh);
  const scale = xScale(x0, y0, fwX, u, 'var(--quiet)');

  // notes: the rule, then what x comes to at the sizes the brand names, on the right of the zone
  const nx = x0 + fw + 64, nw = PAGE_W - M - nx;
  const minPx = ctx.logo.minSize.screenPx, minMm = ctx.logo.minSize.printMm;
  const rule = 'x is the cap height of the name. Keep one x clear on every side of the logo: no text, no edge and no other mark enters it.';
  const rLines = wrap(CHROME[400], rule, 20, nw).length;
  const rows = [
    ['x', `${ctx.logo.clearShare}% of the logo height`],
    ['The logo', `${fx(xw)} × ${fx(xh)} x`],
    ['With its clear space', `${fx(fwX)} × ${fx(fhX)} x`],
    [`At ${minPx} px wide`, `x = ${fx((minPx * unit) / g.w)} px`],
    [`At ${minMm} mm wide`, `x = ${fx((minMm * unit) / g.w)} mm`],
    ['In this drawing', `x = ${u} px`],
  ];
  const ty = 304 + 30 * rLines + 48, labW = Math.min(240, nw - 160);
  const table = rows.map(([k, v], i) => {
    const y = ty + 48 * i;
    return hline(nx, y, nw, 'var(--hair)') + at(nx, y + 12, note(k)) + at(nx + labW, y + 12, `<div class="c-value" style="color:var(--ink);line-height:24px">${A(v)}</div>`);
  }).join('') + hline(nx, ty + 48 * rows.length, nw, 'var(--hair)');
  const ruleHtml = at(nx, 304, `<div class="c-body" style="color:var(--ink)">${nb(rule)}</div>`, { w: nw });
  const title = titleHtml(ctx, 'Clear space', ['One x on every side, measured off the logo itself.', 'One x on every side.']);
  return page(ctx, 'clear-space', { body: title + frame + dims + scale + ruleHtml + table });
}

// ---------------------------------------------------------------- logo-versions
// The four shapes of the logo stand on one baseline at one size of x, so their proportions compare directly. Under each, a scale in x
// measures its width, then its name, its size in x and when to use it (the brand's own when lines).
function logoVersions(ctx) {
  const L = ctx.brand.logo, unit = ctx.logo.geo.unit, G = ctx.logo.geos;
  const ids = ['colour', 'horizontal', 'stacked', 'symbol'];
  const name = { colour: 'Primary', horizontal: ctx.logo.labels.horizontal, stacked: ctx.logo.labels.stacked, symbol: ctx.logo.labels.symbol };
  const MINCOL = 232, GAP = 64, AVAIL = PAGE_W - 2 * M - GAP * 3;
  const occ = (id, u) => Math.max((G[id].w / unit) * u, MINCOL);
  // the largest whole px per x at which the row fits the page and the tallest shape stays under 320 (clear of the note above)
  let u = 96;
  while (u > 8 && (ids.reduce((t, id) => t + occ(id, u), 0) > AVAIL || Math.max(...ids.map((id) => (G[id].h / unit) * u)) > 320)) u -= 1;
  const B = 720; // the baseline every shape stands on
  // share the room left over between the gaps, so the row runs margin to margin
  const spare = AVAIL - ids.reduce((t, id) => t + occ(id, u), 0), gap = GAP + spare / 3;
  let x = M;
  const cols = ids.map((id) => {
    const wX = G[id].w / unit, hX = G[id].h / unit, w = wX * u, h = hX * u, cw = occ(id, u), x0 = x; x += cw + gap;
    const when = L.when[id] || '';
    return at(x0, B - h, art(ctx, id, w))
      + xScale(x0, B + 40, wX, u, 'var(--quiet)', false)
      + at(x0, B + 72, `${head(name[id])}<div class="c-value" style="color:var(--quiet);line-height:24px">${fx(wX)} × ${fx(hX)} x</div>`, { w: cw })
      + (when ? at(x0, B + 136, note(when, 'var(--ink)'), { w: cw }) : '');
  }).join('');
  const title = titleHtml(ctx, 'Logo versions', [`Four shapes, all drawn here at ${u} px to the x.`, 'Four shapes, drawn at one x.']);
  const xNote = at(M, 304, `<div class="c-body" style="color:var(--ink)">${nb('x is the cap height of the name. Each scale below counts the shape across in x.')}</div>`, { w: 640 });
  return page(ctx, 'logo-versions', { body: title + xNote + cols });
}

export const guidelines = { 'clear-space': clearSpace, 'logo-versions': logoVersions };
