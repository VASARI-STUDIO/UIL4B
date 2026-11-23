// Theme 28, Print Shop: the kit under the A4 style guide. Each page is a proof sheet pulled on the shop's own press: the plate colour runs as a band across the head with the
// page's number knocked out of it (the numeral's hole is cut a little out of register and the hit ink sits in it), a narrow pass runs down the right margin, and the foot carries
// the drum squares and the overprints the press made, the page's name and its place in the set. The fibre, the mottle and the misregistration are sheet.js's own (inkLayers), so the
// guide prints the way the book does. Text is the key ink on the paper (never on a screen of ink) and the plate's own text colour on the band; every swatch carries inkFor's ink.
// Text is measured with the fonts' own metrics, so a page that cannot hold its content throws and the route leaves it out with a warning.
import { PAGE, stacker, headLabel, inkFor, logoArt, slotW } from '../../engine/guide-layout.js';
import { A, r1, inkW, wrap, faceFor, faceCss, inkLayers, pressOf, logoOnPlate } from './sheet.js';
import { fnv1a } from './press.js';
import { toOklch, ratio } from '../../engine/color.js';

export const { W, X0, XR, CW, COL, COLW } = PAGE;
// the lowest y content reaches, a section header's height, and the foot's top
export const BOT = 1034, SUBH = 34, FOOT_Y = 1078;
export const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
export const pad2 = (n) => String(n).padStart(2, '0');
export const pct = (s) => `${+((Number.isFinite(+s) ? +s : 0) * 100).toFixed(1)}%`;
export const MONO = 'SonoMono-400';
export { A, r1, pressOf, logoOnPlate, faceCss, faceFor };

// ---- measuring: the chrome (the brand's body face) at its two weights, the display face at the heading weight ----
export const stems = (ctx) => ({ b4: faceFor(ctx, 'body', 400).stem, b6: faceFor(ctx, 'body', 600).stem, d: faceFor(ctx, 'display', ctx.weights.heading).stem });
const SAFE = 0.97;
// the lines a text takes in a box: the browser's own breaks, and a single word wider than the box folds (overflow-wrap:anywhere), so no text can overflow unmeasured
export function nl(st, text, size, w, track = 0) {
  const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (!s) return 0;
  const room = Math.max(8, w * SAFE);
  return wrap(st, s, size, room, track).reduce((n, l) => n + Math.max(1, Math.ceil(inkW(st, l, size, track) / room)), 0);
}
// a text cut to at most `max` lines: the whole text when it sets, else the words that do, ending in an ellipsis
export function clamp(st, text, size, w, max, track = 0) {
  const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
  if (nl(st, s, size, w, track) <= max) return s;
  const words = s.split(' ');
  let n = words.length;
  while (n > 1 && nl(st, `${words.slice(0, n).join(' ').replace(/[,;:\s]+$/, '')}…`, size, w, track) > max) n--;
  let out = words.slice(0, n).join(' ').replace(/[,;:\s]+$/, '');
  while (out.length > 1 && nl(st, `${out}…`, size, w, track) > max) out = out.slice(0, -1);
  return `${out}…`;
}
// a text cut to one line of `w` px, for a cell that never wraps
export const one = (st, text, size, w, track = 0) => clamp(st, text, size, w, 1, track);
export const mono = (text, size = 11) => inkW(MONO, String(text), size);

// ---- the brand's own words: the skeleton a brand starts from carries stand-in lines ("Your headline here"), and a page never prints one as a sample ----
const FILLER = /your (main line goes here|headline here|subject line|name\b|title\b|line here)|^a (second|third) line\b|write this in your own words|^social line \d|^a short (paragraph of ordinary copy|caption)\b|brand\.example|^hi there,?$/i;
// the text when it is the brand's own, else ''
export const real = (text) => { const s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim(); return s && !FILLER.test(s) ? s : ''; };
// the brand's own lines, the main one first; the brand's name when it has no other
export const realLines = (ctx) => {
  const B = ctx.brand, L = B.lines || {}, seen = new Set(), out = [];
  for (const t of [L.primary, ...(Array.isArray(L.others) ? L.others : [])]) { const r = real(t); if (r && !seen.has(r.toLowerCase())) { seen.add(r.toLowerCase()); out.push(r); } }
  return out.length ? out : [B.name];
};

// ---- placing ----
export const at = (x, y, html, { w, cls = '', style = '' } = {}) => `<div class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w ? `width:${r1(w)}px;` : ''}${style}">${html}</div>`;
export const rect = (x, y, w, h, style = '', inner = '') => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
export const hr = (x, y, w, c = 'var(--key)', t = 1) => rect(x, y, w, t, `background:${c}`);
// a swatch: the colour itself with a key edge, so a light ink still shows on the paper
export const chip = (x, y, w, h, hex, inner = '', style = '') => rect(x, y, w, h, `background:${hex};border:1px solid var(--key);${style}`, inner);
// a line of one-line chrome (label, note or mono) placed at x, its width clamped by the caller
export const line = (x, y, text, cls, style = '', w) => at(x, y, A(text), { cls: `${cls} nw`, style, w });
// a wrapped paragraph in the page's chrome: the html and the height it takes. `max` is the most lines it may take.
export function para(st, x, y, w, text, { size = 14, lh, max = 99, cls, style = '' } = {}) {
  const lead = lh || (size >= 14 ? Math.round(size * 1.5) : Math.round(size * 1.42));
  const s = clamp(st, text, size, w, max);
  const n = nl(st, s, size, w);
  return { html: n ? at(x, y, A(s), { w, cls: `g-t ${cls || (size >= 14 ? 'c-body' : 'c-note')}`, style: `${size !== 14 && size !== 12 ? `font-size:${size}px;line-height:${lead}px;` : ''}${style}` }) : '', h: n * lead, n };
}
// a section header: a key rule, the plate colour as a small chip on it, the section's name, and an optional note at the right
export const sub = (st, x, y, w, label, note = '') => hr(x, y, w)
  + rect(x, y + 10, 10, 10, 'background:var(--plate);border:1px solid var(--key)')
  + line(x + 18, y + 8, label, 'c-label')
  + (note ? line(x + w - 320, y + 8, one(st.b4, note, 12, 280), 'c-note', 'text-align:right', 320) : '');
// a registration mark: a ring cut by a cross
export const reg = (x, y, r = 6) => `<svg class="a" style="left:${r1(x - r - 3)}px;top:${r1(y - r - 3)}px" width="${2 * r + 6}" height="${2 * r + 6}" viewBox="${-r - 3} ${-r - 3} ${2 * r + 6} ${2 * r + 6}" fill="none" stroke="var(--key)" stroke-width="1" aria-hidden="true"><circle r="${r}"/><path d="M${-r - 3} 0H${r + 3}M0 ${-r - 3}V${r + 3}"/></svg>`;
// the brand's own ink on a ground when it reads at 4.5, else the guide's own pick (inkFor)
export const safeInk = (ctx, bg, want, o) => (want && ctx.ratio(want, bg) >= 4.5 ? want : inkFor(ctx, bg, o));

// ---- the page ----
// which pages draw for this brand decides the folio ("n / total"): lane-guide.js works it out once up front (ctx._g28ids)
export const isSlot = (ctx) => ctx.edition === 'slot';
export function folio(ctx, id) {
  const ids = ctx._g28ids;
  if (ids && ids.includes(id)) return { no: ids.indexOf(id) + 1, total: ids.length };
  return { no: (typeof ctx.pageNo === 'function' && ctx.pageNo(id)) || 1, total: ids ? ids.length : 9 };
}
function foot(ctx, id) {
  const P = pressOf(ctx), f = folio(ctx, id);
  let x = X0, bar = '';
  for (const d of P.drums) { bar += `<i class="sq" style="left:${x}px;background:${d.hex}"></i>`; x += 12; }
  const ov = (under, over, screen) => `<span class="ov" style="left:${x}px"><i style="background:${under}"></i><i class="${screen ? `mk${screen}` : ''}" style="background:${over};mix-blend-mode:multiply"></i></span>`;
  const seen = new Set();
  for (const [u, o, s, res] of [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]]) { if (seen.has(res)) continue; seen.add(res); bar += ov(u, o, s); x += 12; }
  return `${bar}<span class="a c-foot nw" style="left:${x + 12}px;top:${FOOT_Y}px">${A(NAME[id])}</span><span class="a c-value nw" style="right:${W - XR}px;top:${FOOT_Y}px">${pad2(f.no)} / ${pad2(f.total)}</span>${reg(24, 1087)}${reg(770, 1087)}`;
}
// the whole page: the plate band of height `plateH` (full width), the pass, the hit numeral, and `head` and `body` inside the page's layer
// a plate with no hue (a grey brand) prints a mid-grey band that the page's type and numeral cannot stand apart from: the darkest ink runs as the band instead, with the paper on it
function neutralBand(ctx) {
  if (ctx._g28band !== undefined) return ctx._g28band;
  const P = pressOf(ctx);
  let out = '';
  if (!P.plateScreen && toOklch(P.plate).C < 0.03 && ratio(P.textOnPlate, P.plate) < 7) {
    const dark = ctx.colours.map((c) => c.hex).sort((a, b) => ratio(a, '#000000') - ratio(b, '#000000'))[0];
    if (dark && ratio(P.paper, dark) >= 7) out = `--plate:${dark};--ptxt:${P.paper};`;
  }
  return (ctx._g28band = out);
}
function sheetOf(ctx, id, plateH, head, body, hit) {
  const B = ctx.brand, f = folio(ctx, id);
  const L = inkLayers(ctx, id, { w: W, h: plateH, plate: { x: 0, y: 0, w: W, h: plateH }, pass: { x: 756, y: -8, w: 46, h: 1139 }, hit: { text: pad2(f.no), x: 556, base: plateH - 30, size: 120, maxW: 190, ...(hit || {}) } });
  const fh = fnv1a(`${B.slug}:${id}:fibre`);
  return `<section class="pg" data-page="${id}" style="${neutralBand(ctx)}--fx:${fh % 512}px;--fy:${(fh >>> 9) % 512}px">${L.html}<div class="lay" style="z-index:3">${head}${body}${foot(ctx, id)}</div></section>`;
}
// a page: the head (the running line, the page's name and one sentence, all on the plate), then `draw(top)` for the content under it.
// `sentences` are candidates, longest first; the first that sets in two lines wins.
export function page(ctx, id, sentences, draw) {
  const S = stems(ctx), B = ctx.brand;
  const NW = 470, name = NAME[id];
  const cands = [].concat(sentences).filter(Boolean);
  const sentence = cands.find((s) => nl(S.b4, s, 14, NW) <= 2) || clamp(S.b4, cands[cands.length - 1] || '', 14, NW, 2);
  let size = 44; while (size > 30 && inkW(S.d, name, size, -0.01) > NW * SAFE) size -= 4;
  const left = headLabel(B.name, (t) => inkW(S.b6, t, 11) <= NW * SAFE);
  const sn = nl(S.b4, sentence, 14, NW), titleY = 62, sentY = titleY + Math.round(size * 1.1) + 10;
  const plateH = Math.max(sentY + sn * 21 + 34, 190);
  const head = line(X0, 36, left, 'c-label', 'color:var(--ptxt)')
    + at(X0, titleY, A(name), { cls: 'g-ti nw', style: `${faceCss(ctx, 'display', ctx.weights.heading)};font-size:${size}px;line-height:${Math.round(size * 1.1)}px;letter-spacing:-.01em;color:var(--ptxt)` })
    + (sn ? at(X0, sentY, A(sentence), { w: NW, cls: 'c-body g-t', style: 'color:var(--ptxt)' }) : '');
  return sheetOf(ctx, id, plateH, head, draw(plateH + 36));
}
// the cover: its own plate height, head and numeral
export const coverSheet = (ctx, plateH, head, body, hit) => sheetOf(ctx, 'cover', plateH, head, body, hit);

export const flow = stacker({ theme: 'Print Shop', bottom: BOT });
// the first of several section lists that fits: a page that cannot hold everything gives up what it can one step at a time, and throws only when none fits.
// `make(option)` returns the sections for one option; options run from the fullest to the barest.
export function flowTry(id, top, options, make, opts) {
  let last;
  for (const o of options) {
    try { return flow(id, top, make(o).filter(Boolean), opts); } catch (err) { if (!(err && err.code === 'too_tall')) throw err; last = err; }
  }
  throw last;
}

// the logo as wide as asked (the slot edition's frame is never under its minimum height); returns the markup and its box
// `solid` prints the slot edition's placeholder mark in full ink: the engine draws it as a quiet watermark at low opacity, which on a dark or mid ground
// is a mark about as dark as the ground (and reads backwards on a near-black one). On a proof sheet it prints solid, in the ink that reads on its ground.
const solidMark = (html) => html.replace(/(<svg\b[^>]*\baria-hidden="true"[^>]*style="[^"]*?)opacity:[\d.]+/, '$1opacity:1');
export function logoBox(ctx, w, o = {}) {
  const { solid, ...rest } = o, G = ctx.logo.geos.colour, slot = isSlot(ctx), ww = slot ? slotW(ctx, w) : w, h = (ww * G.h) / G.w;
  const html = logoArt(ctx, 'colour', ww, { ...rest, ...(slot ? { h: r1(h) } : {}) });
  return { html: slot && solid ? solidMark(html) : html, w: ww, h };
}
// the logo as wide as `maxW` and as tall as `maxH` allow
export function logoFit(ctx, maxW, maxH, o) {
  const G = ctx.logo.geos.colour;
  return logoBox(ctx, Math.floor(Math.min(maxW, (maxH * G.w) / G.h)), o);
}
// the ground the cover's plate band prints (neutralBand may swap a grey plate for the darkest ink)
export function coverGround(ctx) {
  const m = /--plate:(#[0-9a-f]{6})/i.exec(neutralBand(ctx));
  return m ? m[1] : pressOf(ctx).plate;
}
// the cover's mark: left on the margin, 160 px wide (never over 120 tall, so it stays clear of the title under it) and in the solid ink that reads on the plate.
// The showcase edition draws the brand's own colourway (mono-light on a swapped band); the slot edition draws the placeholder mark alone, not centred in a frame.
export function coverLogo(ctx, colourway) {
  const ground = coverGround(ctx), swapped = ground !== pressOf(ctx).plate, ink = inkFor(ctx, ground);
  const lg = logoFit(ctx, 160, 120, { colourway: swapped ? 'mono-light' : colourway, color: ink, solid: true });
  if (!isSlot(ctx)) return lg;
  const m = /<svg\b[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/svg>/.exec(lg.html);
  if (!m) return lg;
  const w = Math.min(160, Math.floor((120 * m[1]) / m[2])), h = r1((w * m[2]) / m[1]);
  const svg = m[0].replace(/ width="[^"]*"/, ` width="${w}"`).replace(/ height="[^"]*"/, ` height="${h}"`);
  return { html: `<div class="logo-slot" role="img" aria-label="Logo placeholder" style="width:${w}px;height:${h}px;color:${ink}">${svg}</div>`, w, h };
}

// the guide's css: the book's own c-* classes carry the type; these add wrapping and the mono figures
export function guideCss() {
  return `/* Print Shop style guide: A4 portrait. Type is the book's own chrome (the c-* classes); these add wrapping and the mono figures. */
.pg .g-t{text-wrap:pretty;overflow-wrap:anywhere}
.pg .g-ti{font-kerning:normal}
.pg .g-s{font:400 11px/14px var(--cmono);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .g-m{font:400 12px/16px var(--cmono);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .g-clip{overflow:hidden}
`;
}
