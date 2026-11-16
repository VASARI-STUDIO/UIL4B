// Theme 31, Contact sheet, lane kt helpers: the kit roll, its strip and page shell, the frame art, the icon proof sheet's strips and the measured text blocks.
// The kit is the third roll (stock code K): one frame per kit page, in folder order, so the page's own frame sits under the loop at strip position 3, as in the
// guidelines and the UI kit. No export here is named like a lane export, so the loader merges nothing from this file.
// Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
import { A, tokens, palette, cwOn, put, adv, wrap, fontOf, frameLabel, loopPath, loopSvg, captionHead, px, GX } from './helpers.js';
import { photoFrame, photoShot } from './arts.js';
import { icon, iconSet, ICON_SET } from '../../engine/components.js';

export { A, tokens, palette, cwOn, put, adv, wrap, px, GX, photoFrame, photoShot, loopPath, loopSvg, iconSet, icon };

export const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
export const nameOf = (ctx, hex) => (ctx.colours.find((c) => same(c.hex, hex)) || {}).name;
export const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
export const monthYear = (ctx) => new Date(ctx.brand.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];

// ---- the icons: whatever set the brand ships (brand.json ui.icons, else the engine's standard set) ----
export const ICONS_PER_SHEET = 18;            // three strips of six, the most a 1500 x 1000 sheet holds with room for the notes
// The icon the sheet circles: the brand's own row icon if it names one in the set, else the first icon it added to the standard set, else its first icon.
export function chosenIcon(ctx) {
  const set = iconSet(ctx), row = ctx.brand.ui.rowIcon;
  if (row && set.includes(row)) return { name: row, why: 'row' };
  const own = set.find((n) => !ICON_SET.includes(n));
  return own ? { name: own, why: 'own' } : { name: set[0], why: 'first' };
}

// ---- the kit roll: frame n is kit page n ----
export function kitIds(ctx) {
  const nIcon = Math.max(1, Math.ceil(iconSet(ctx).length / ICONS_PER_SHEET));
  return ['read-me-1', 'read-me-2', 'palette', 'typefaces', ...Array.from({ length: nIcon }, (_, i) => (i ? `icons-${i + 1}` : 'icons')), 'photography-1', 'photography-2'];
}
export const frameNo = (ctx, id) => kitIds(ctx).indexOf(id) + 1;
// what each page's frame holds
export function setupOf(id) {
  if (id === 'read-me-1') return ['logo'];
  if (id === 'read-me-2') return ['logo2'];
  if (id === 'palette') return ['colour'];
  if (id === 'typefaces') return ['type'];
  if (id.startsWith('icons')) return ['icons'];
  return ['photo', id === 'photography-1' ? 0 : 1];
}
// the logo's two colourways on the roll: the full-colour version on its own ground, then the one drawn for the action colour (else the first other ground)
export function logoKeys(ctx) {
  const cw = ctx.brand.logo.colourways, keys = Object.keys(cw), k1 = cw.colour ? 'colour' : keys[0], P = palette(ctx);
  const k2 = keys.find((k) => same(cw[k].ground, P.action.hex) && k !== k1) || keys.find((k) => !same(cw[k].ground, cw[k1].ground)) || k1;
  return [k1, k2];
}

// ---- frame art: a 3:2 print drawn from the brand, filling the gate ----
export function frameArt(ctx, setup, w, h) {
  const P = palette(ctx), cw = ctx.brand.logo.colourways, slot = ctx.edition === 'slot';
  const fill = (bg, inner, st = '') => `<div class="a" style="left:0;top:0;width:${w}px;height:${h}px;background:${bg};display:flex;align-items:center;justify-content:center;${st}">${inner}</div>`;
  if (setup[0] === 'logo' || setup[0] === 'logo2') {
    const k = logoKeys(ctx)[setup[0] === 'logo' ? 0 : 1], g = cw[k].ground, geo = ctx.logo.geos.colour || ctx.logo.geos.primary, lw = Math.round(Math.min(w * 0.52, h * 0.42 * geo.w / geo.h));
    return fill(g, slot ? ctx.logo.html('colour', { width: lw, colourway: k, color: P.inkOn(g), label: '' }) : ctx.logo.html('colour', { width: lw, colourway: k }));
  }
  if (setup[0] === 'colour') {
    const cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
    return fill('transparent', cols.map((c) => `<i style="display:block;height:100%;flex:${c.share};background:${c.hex}"></i>`).join(''), 'justify-content:stretch');
  }
  if (setup[0] === 'type') return fill(P.light.hex, `<span class="disp" style="font-size:72px;line-height:72px;font-weight:${dispW(ctx)};color:${P.inkOn(P.light.hex)}">Aa</span>`);
  if (setup[0] === 'icons') {
    const ink = P.inkOn(P.light.hex), set = iconSet(ctx).slice(0, 6);
    return fill(P.light.hex, `<span style="display:grid;grid-template-columns:repeat(3,28px);gap:16px 28px;color:${ink}">${set.map((n) => `<span class="kt-ic">${icon(ctx, n, 28)}</span>`).join('')}</span>`);
  }
  return photoFrame(ctx, setup[1], w, h);
}

// ---- the strip (as helpers.strip, with the kit roll in its frames; the tail is unexposed film with a gate) ----
const HOLES = (() => { let s = ''; for (let j = 0; j < 48; j++) { const x = +(62.625 + 29.25 * j - 6 - 48).toFixed(2); s += `<rect x="${x}" y="6" width="12" height="17" rx="2.5"/><rect x="${x}" y="197" width="12" height="17" rx="2.5"/>`; } return s; })();
const film = (T, top, inner) => `<div class="a strip" style="left:48px;top:${top}px;width:1404px;height:220px;background:${T.film};overflow:hidden"><svg class="a" style="left:0;top:0" width="1404" height="220" viewBox="0 0 1404 220" aria-hidden="true" fill="${T.hole}">${HOLES}</svg>${inner}</div>`;
const edgeNo = (ctx, gx, f) => put(ctx, { x: gx + 105 - 40 - 48, baseline: 192, w: 80, h: 12, cls: 'edge', role: 'edge', size: 12, line: 12, weight: 600, align: 'center', html: frameLabel(f) + '<i class="tri"></i>' });
const edgeHd = (ctx, x, html) => put(ctx, { x: x - 48, baseline: 36, w: 196, h: 16, cls: 'edge', role: 'edge', size: 12, line: 16, weight: 600, style: 'line-height:16px;white-space:pre', html });

export function ktHead(ctx, id) {
  const B = ctx.brand, folder = id.startsWith('read') ? 'Read me' : id === 'palette' ? '02 Colour' : id === 'typefaces' ? '03 Type' : id.startsWith('icons') ? '04 Icons' : '05 Imagery';
  const title = { 'read-me-1': 'What is in the kit', 'read-me-2': 'The brand on one page', palette: 'Palette', typefaces: 'Typefaces', 'photography-1': 'Photography', 'photography-2': 'Shot list' }[id] || 'Icons';
  return [`${B.name}  BRAND KIT ${B.version.number}`, folder, title];
}
export function ktStrip(ctx, T, n, head) {
  const ids = kitIds(ctx); let frames = '', nums = '';
  GX.forEach((gx, i) => {
    const f = n - 3 + i + 1, lx = gx - 48;
    if (f < 1 || f > 36) return;                                    // the leader: plain film, no gate
    frames += f > ids.length ? `<div class="a fr fr--empty" style="left:${lx}px;top:40px;width:210px;height:140px"></div>`
      : `<div class="a fr" style="left:${lx}px;top:40px;width:210px;height:140px">${frameArt(ctx, setupOf(ids[f - 1]), 210, 140)}</div>`;
    nums += edgeNo(ctx, gx, f);
  });
  const stock = `${A(ctx.brand.name)} 400<i class="tri"></i>${String(n).padStart(2, '0')}K`;   // K: the kit roll
  return film(T, 48, frames + nums + edgeHd(ctx, 68, A(head[0])) + edgeHd(ctx, 302, stock) + edgeHd(ctx, 770, A(head[1])) + edgeHd(ctx, 1238, A(head[2])));
}

// ---- the icon proof sheet: up to three strips of six, each frame a print of one icon, its file name in the edge print above ----
export const ICON_TOPS = [48, 284, 520];
export function iconStrips(ctx, T, names, first, circled = -1) {
  const P = palette(ctx), bg = P.light.hex, ink = P.inkOn(bg);
  return ICON_TOPS.map((top, r) => {
    if (r * 6 >= Math.max(names.length, 1) && r > 0) return '';
    let inner = '';
    GX.forEach((gx, i) => {
      const k = r * 6 + i, f = first + k, lx = gx - 48, n = names[k];
      inner += n ? `<div class="a fr" style="left:${lx}px;top:40px;width:210px;height:140px"><div class="a" style="left:0;top:0;width:210px;height:140px;background:${bg};color:${ink};display:flex;align-items:center;justify-content:center"><span class="kt-ic">${icon(ctx, n, 48)}</span></div></div>`
        + (k === circled ? "" : edgeHd(ctx, gx + 8, `<span class="kt-low">${A(n)}.svg</span>`))   // nothing printed under the loop: the name is in the notes
        : `<div class="a fr fr--empty" style="left:${lx}px;top:40px;width:210px;height:140px"></div>`;
      inner += edgeNo(ctx, gx, f);
    });
    return film(T, top, inner);
  }).join('');
}
// the loop's centre on frame k of an icon sheet
export const iconLoopAt = (k) => [GX[k % 6] + 105, ICON_TOPS[Math.floor(k / 6)] + 110];

// ---- the page: strip (or the icon strips), loop, body, foot ----
export const ktFoot = (ctx) => put(ctx, { x: 60, baseline: 968, w: 700, h: 16, cls: 'ft', role: 'chrome', size: 12, line: 16, weight: 400, html: A(`${ctx.brand.name} brand kit, version ${ctx.brand.version.number}, ${monthYear(ctx)}`) });
// slot edition: kit pages whose brand copy sits in fixed rows take the compact placeholder form
const KT_TIGHT = /^(read-me|palette$|typefaces$|photography)/;
export function ktPage(ctx, id, body, { strips, loop } = {}) {
  const T = tokens(ctx), slug = ctx.slug || ctx.brand.slug;
  const s = strips ?? ktStrip(ctx, T, frameNo(ctx, id), ktHead(ctx, id));
  const l = loop === null ? '' : loopSvg(T, loop || loopPath(slug, 'kt:' + id));
  return `<section class="pg kt${ctx.placeholders && KT_TIGHT.test(id) ? ' ph-tight' : ''}" data-page="${id}">${s}${l}${body}${ktFoot(ctx)}</section>`;
}
// the caption column's head for the page's own frame, then the hairline at 488; the page's words start at 512
export const capHead = (ctx, id, c) => captionHead(ctx, { no: String(frameNo(ctx, id)).padStart(2, '0'), title: c.title, text: c.text, lines: 3 }) + hl(996, 488, 444);
export const hl = (x, y, w) => `<div class="a" style="left:${x}px;top:${Math.round(y)}px;width:${w}px;height:1px;background:var(--hair)"></div>`;
export const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });

// ---- measured text (copied from lane-g1.js, which keeps them private) ----
export const capOf = (ctx, role, weight) => { const f = fontOf(ctx, role, weight); return (f.tables.os2.sCapHeight || f.unitsPerEm * 0.7) / f.unitsPerEm; };
// a block of text whose first line's capitals start at `capTop`: the markup, its line count and its bottom edge
export function para(ctx, { x, capTop, w, text, size = 14, line = 22, weight, colour = 'var(--soft)', role = 'body' }) {
  const wt = weight ?? ctx.weights.regular, n = wrap(ctx, role, text, size, w - 2, 0, wt).length, base = capTop + capOf(ctx, role, wt) * size;
  const html = put(ctx, { x, baseline: base, w, h: n * line, role, size, line, weight: wt, style: `font:${wt} ${size}px/${line}px var(--${role});color:${colour};white-space:normal;text-wrap:pretty`, html: A(text) });
  return { html, n, bottom: base + (n - 1) * line + size * 0.3 };
}
// display lines, one div each, so the line count laid out is the count that renders
export function dispBlock(ctx, { x, capTop, w, lines, size, line, colour = 'var(--ink)' }) {
  const wt = ctx.weights.heading, base0 = capTop + capOf(ctx, 'display', wt) * size;
  const html = lines.map((l, i) => put(ctx, { x, baseline: base0 + i * line, w, h: line, cls: 'disp', role: 'display', size, line, weight: wt, style: `font-size:${size}px;line-height:${line}px;color:${colour}`, html: A(l) })).join('');
  return { html, base0, bottom: base0 + (lines.length - 1) * line + size * 0.25 };
}
// a stack of label-and-text notes from y; returns the markup and where it ends
export function notes(ctx, { x, y, w, rows, gap = 24, size = 14, line = 22 }) {
  let html = '', at = y;
  for (const [t, text] of rows) {
    html += label(ctx, x, at, t, w);
    const p = para(ctx, { x, capTop: at + 28, w, text, size, line });
    html += p.html; at = p.bottom + gap;
  }
  return { html, bottom: at - gap };
}
// Field widths across a run: each field gets at least the width its label needs; the rest is shared out in proportion to share.
export function fieldWidths(shares, needs, total) {
  const n = shares.length, w = new Array(n).fill(0), fixed = new Set();
  for (let pass = 0; pass <= n; pass++) {
    const left = total - [...fixed].reduce((s, i) => s + w[i], 0), free = shares.map((s, i) => (fixed.has(i) ? 0 : s)), sum = free.reduce((a, b) => a + b, 0) || 1;
    let moved = false;
    for (let i = 0; i < n; i++) if (!fixed.has(i)) { w[i] = (left * free[i]) / sum; if (w[i] < needs[i]) { w[i] = needs[i]; fixed.add(i); moved = true; } }
    if (!moved) break;
  }
  const r = w.map((x) => Math.floor(x)); r[n - 1] += total - r.reduce((a, b) => a + b, 0);
  return r;
}
