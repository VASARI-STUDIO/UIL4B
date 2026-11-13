// Theme 24, Standards, lane bk: the device for the web book. The manual's three marks (the x-ruler with its live extent, dimension lines
// with slash ticks, the thumb tab) rebuilt as HTML and CSS so they hold at any width. A sheet has three fixed sizes: 1152 px at 1280 and
// over, 768 px from 841 to 1279, and a phone sheet whose measured heroes are drawn at 312 px or less. Every label is computed for its own
// size and only that size's label shows, so the book never prints a measurement the screen does not have.
import { BOOK_SECTIONS } from '../../engine/book.js';
import { A, f2, half, xOf, roles, adv, wrap, displayFont, loadFont } from './helpers.js';

export const TIERS = ['w', 'm', 'n'];
export const CW = { w: 1152, m: 768, n: 312 };
export const NO = (id) => BOOK_SECTIONS.findIndex((s) => s.id === id) + 1;
export const TITLE = (id) => BOOK_SECTIONS.find((s) => s.id === id).title;
export const X = (ctx, px) => `${half(px / xOf(ctx))}x`;
// one value per sheet size: one element each, only the current size's shows
export const tri = (fn, tag = 'span') => TIERS.map((k) => `<${tag} class="sd-t sd-t${k}">${fn(k)}</${tag}>`).join('');
// sizes per sheet as custom properties: sv('hz', {w, m, n}) -> --hzw:..px;--hzm:..px;--hzn:..px (read by .sd-hz, .sd-vz, .sd-fz)
export const sv = (p, o) => TIERS.map((k) => `--${p}${k}:${f2(o[k])}px`).join(';');
export const topW = (f) => f.weights[f.weights.length - 1];
export const dispStyle = (ctx, w) => `font-family:var(--display);font-weight:${w || topW(ctx.brand.fonts.display)};font-stretch:${ctx.brand.fonts.display.stretch || 100}%`;

// the largest size in `sizes` at which the text sets in at most `lines` lines inside w, measured with the face's own glyphs
export function fitSize(font, text, w, sizes, lines) {
  for (const s of sizes) { const l = wrap(font, text, s, w); if (l.length <= lines && l.every((t) => adv(font, t, s) <= w)) return { size: s, lines: l }; }
  const s = sizes[sizes.length - 1]; return { size: s, lines: wrap(font, text, s, w) };
}
export const widest = (font, lines, size) => Math.max(...lines.map((l) => adv(font, l, size)));
export const dfont = (ctx) => displayFont(ctx, topW(ctx.brand.fonts.display));
export const bodyFont = (ctx, w) => {
  const fs = ctx.faces.filter((f) => f.role === 'body' && f.style !== 'italic');
  return loadFont(fs.reduce((b, f) => (Math.abs(f.weight - w) < Math.abs(b.weight - w) ? f : b)).stem);
};

// ---- dimension lines (spec 3.2): a horizontal one spans its box, label centred with the line broken 6 px either side, 45 degree
// slashes at the ends and quiet extension lines down to the object 16 px below. lab: {w, m, n} labels, one per sheet size ----
export const dimH = (lab, cls = '') => `<div class="sd-dh ${cls}" aria-hidden="true"><b></b><i></i><span class="sd-dl">${typeof lab === 'string' ? lab : tri((k) => lab[k])}</span><i></i><b></b></div>`;
// a vertical one: the line broken by its label, extension lines out to the object on its right
export const dimV = (lab, cls = '') => `<div class="sd-dv ${cls}" aria-hidden="true"><b></b><i></i><span class="sd-dl">${typeof lab === 'string' ? lab : tri((k) => lab[k])}</span><i></i><b></b></div>`;
// four 12 px L-marks, 6 px off the corners of a drawing
export const crop = () => '<span class="sd-crop" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';

// ---- the x-ruler (spec 3.1): ticks every x (hair), 4x (quiet), 16x (ink), labels every 16x. live: {w, m, n} -> [left, right] px from
// the sheet's left edge, the section's one hero: two ink marks, a 2 px run between them and their positions in x. Ordinary labels
// within 40 px of a live label are dropped. The line runs the sheet's width at every size; labels stop where the phone sheet can hold them.
export function ruler(ctx, uid, live, { draw = false } = {}) {
  const x = xOf(ctx), step = 16 * x, lw = (t, w) => adv(loadFont(`PublicSans-${w}`), t, 12);
  const ticks = Array.from({ length: 16 }, (_, i) => { const h = i === 0 ? 10 : i % 4 === 0 ? 6 : 3, c = i === 0 ? 'ink' : i % 4 === 0 ? 'qt' : 'hr'; return `<rect x="${i * x}" y="${15 - h}" width="1" height="${h}" style="fill:var(--${c})"/>`; }).join('');
  const svg = `<svg class="sd-rl__k" width="100%" height="16" focusable="false"><defs><pattern id="sdr-${uid}" width="${step}" height="16" patternUnits="userSpaceOnUse">${ticks}</pattern></defs><rect width="100%" height="15" fill="url(#sdr-${uid})"/><rect y="15" width="100%" height="1" style="fill:var(--ink)"/></svg>`;
  const group = (k) => {
    const lim = k === 'n' ? 300 : CW[k] - 24, L = live && live[k];
    const lives = L ? L.map((px, i) => {
      const t = px === 0 ? '0' : `${half(px / x)}x`, w = lw(t, 600), end = i === 1 && k !== 'n' && px >= CW[k] - 1, start = px === 0;
      const a = start ? 0 : end ? px - w : px - w / 2;
      return { px, t, a, c: a + w / 2, end, start };
    }) : [];
    let o = '';
    for (let p = 0; p <= lim; p += step) {
      const t = p === 0 ? '0' : String(Math.round(p / x));
      if (lives.some((l) => Math.abs(l.c - p) < 40)) continue;
      o += `<span class="sd-rl__n" style="left:${p}px${p === 0 ? '' : ';transform:translateX(-50%)'}">${t}</span>`;
    }
    for (const l of lives) o += `<i class="sd-rl__m${draw ? ' sd-draw' : ''}" style="left:${f2(l.end ? l.px - 1 : l.px)}px"></i><span class="sd-rl__n sd-rl__n--live" style="left:${f2(l.a)}px">${l.t}</span>`;
    if (lives.length === 2) o += `<i class="sd-rl__r${draw ? ' sd-draw' : ''}" style="left:${f2(lives[0].px)}px;width:${f2(lives[1].px - lives[0].px)}px"></i>`;
    return o;
  };
  return `<div class="sd-rl" aria-hidden="true">${svg}${tri(group)}${live ? "" : `<span class="sd-rl__n sd-rl__u">x</span>`}</div>`;
}

// ---- the thumb tab (spec 3.3): the section's numeral on a 24 x 66 tab in the cut edge, stepping down the edge by section ----
export const tab = (n) => `<div class="sd-tab" aria-hidden="true" style="--n:${n}">${n}</div>`;

// ---- logo on a ground: the colourway drawn for that ground, else the one whose name reads best on it ----
export function cwOn(ctx, hex) {
  const cws = ctx.brand.logo.colourways, ks = Object.keys(cws);
  return ks.find((k) => cws[k].ground.toLowerCase() === hex.toLowerCase()) || ks.slice().sort((a, b) => ctx.ratio(cws[b].name, hex) - ctx.ratio(cws[a].name, hex))[0];
}
// a logo that scales with its box (--ar keeps the slot frame at the logo's proportion)
export function logoOn(ctx, id, hex, w, label = 'Logo') {
  const k = cwOn(ctx, hex), cw = ctx.brand.logo.colourways[k], g = ctx.logo.geos[id];
  return `<span class="sd-lg" style="--ar:${f2(g.w)}/${f2(g.h)}">${ctx.logo.html(id, { width: w, colourway: k, color: cw.name, label })}</span>`;
}
// on the page ground the logo follows the preview: the light ground's colourway in light, the dark surface's in dark
export const logoMode = (ctx, id, w, label) => `<span class="sd-ml">${logoOn(ctx, id, roles(ctx).ground, w, label)}</span><span class="sd-md">${logoOn(ctx, id, ctx.roles.dark.surface, w, label)}</span>`;

// ---- controls ----
export const copyBtn = (text, value, what) => `<button type="button" class="bk-btn sd-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text)}, ${A(what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
export const valBtn = (kind, value, name) => `<button type="button" class="bk-btn sd-val" data-copy="${A(value)}" data-copy-label="${A(name)} ${A(kind)}" aria-label="Copy ${A(kind)} ${A(value)}, ${A(name)}"><span class="bk-btn__t">${A(value)}</span></button>`;
export const dl = (f, label, text) => (f ? `<a class="sd-dl-a" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');
