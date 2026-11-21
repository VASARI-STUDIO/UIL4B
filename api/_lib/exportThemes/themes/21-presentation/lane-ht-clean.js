// Lane ht, the published sites: what the slot edition leaves out. In the slot edition the words the user has still to write are
// placeholders (dashed boxes: guidance for an editor). A published site carries none of that. A line that holds a placeholder is
// not printed, a slide that holds one is not drawn, and where a logo would go the brand name stands in the display face. The test is
// the engine's own sentinel (a placeholder is the private-use mark U+E000 in the text), so nothing here reads copy.
import { esc as A } from '../../engine/brand.js';
import { servedFamily } from './helpers.js';

const MARK = new RegExp(String.fromCharCode(0xe000));
/** true when the string (or markup) holds a placeholder */
export const hasPh = (s) => typeof s === 'string' && MARK.test(s);
/** the string, or '' where it is (or holds) a placeholder */
export const realOnly = (s) => (hasPh(s) ? '' : s);
/** the brand's name as words: '' while the project has not named it */
export const nameOf = (ctx) => (hasPh(ctx.brand.name) ? '' : String(ctx.brand.name || ''));
/** the document's own name: "<Name> guidelines", or "Brand guidelines" while the name is unwritten */
export const docOf = (ctx, what) => `${nameOf(ctx) || 'Brand'} ${what}`;

// While the project has not named the brand, a typeset stand-in goes where its logo would sit, so no page shows an empty tile
export const PLACEHOLDER_NAME = 'Your name';
const nameFor = (ctx) => nameOf(ctx) || PLACEHOLDER_NAME;
// the one symbol every page uses: the first letter of the name, as the engine's own outlined fallback draws it
export const symbolOf = (name) => ([...String(name).trim()][0] || '').toUpperCase();
// the part of a name set in the version's brand colour: from the "&" on, else the last word, else the rest after the first letter
const accentSplit = (name) => {
  const i = name.indexOf('&');
  if (i > 0) return [name.slice(0, i), name.slice(i)];
  const w = name.trim().split(/\s+/);
  if (w.length > 1) { const last = w[w.length - 1]; return [name.slice(0, name.length - last.length), last]; }
  const c = [...name];
  return [c[0], c.slice(1).join('')];
};
// the colour a version sets its accent in: the colourway's own mark colour, where it differs from the name's and shows on the ground
const accentOf = (ctx, colourway, ink) => {
  const cw = ctx.brand.logo.colourways[colourway];
  if (!cw || !cw.sign || String(cw.sign).toLowerCase() === String(ink || cw.name).toLowerCase()) return '';
  return ctx.ratio(cw.sign, cw.ground) >= 3 ? cw.sign : '';
};

// the brand name as a mark: the display face, the version's own proportions. `width` is the logo's width in px; `share` instead sets it
// as a share of the container (a tile) and sizes the type in container units, so the mark keeps its size against the tile.
function wordmark(ctx, geos, id, { width = 200, color, share, colourway } = {}) {
  const name = nameFor(ctx);
  const g = geos[id] || geos.colour || Object.values(geos)[0], sym = id === 'symbol';
  // the three shapes differ as the plugin's geometries do: the name alone, the initial beside the name, the initial over the name
  const lay = id === 'horizontal' || id === 'stacked' ? id : '';
  const text = sym ? symbolOf(name) : name, h = (width * g.h) / g.w;
  const fs = Math.max(10, sym ? h * 0.6 : lay === 'horizontal' ? Math.min(h * 0.6, width / (text.length * 0.55 + 2.6)) : lay === 'stacked' ? Math.min(h * 0.3, width / (text.length * 0.55)) : Math.min(h * 0.8, width / (Math.max(text.length, 3) * 0.5)));
  const ink = color ? `color:${color};` : '';
  const size = share ? `width:${share * 100}cqw;font-size:min(${(fs * 2).toFixed(1)}px,${((fs / width) * share * 100).toFixed(2)}cqw)` : `width:${width}px;height:${h.toFixed(1)}px;font-size:${fs.toFixed(1)}px`;
  const accent = !sym && colourway ? accentOf(ctx, colourway, color) : '';
  const [pre, post] = accent ? accentSplit(name) : [name, ''];
  const named = accent ? `${A(pre)}<em class="ht-wm__a" style="color:${accent}">${A(post)}</em>` : A(text);
  // the name sits in its own span in every shape: the wordmark is a flex box, and a bare text run beside the accent <em> loses its space
  const inner = lay ? `<b class="ht-wm__s">${A(symbolOf(name))}</b><span>${named}</span>` : sym ? A(text) : `<span>${named}</span>`;
  return `<span class="ht-wm ht-d${sym ? ' ht-wm--sym' : ''}${lay ? ` ht-wm--${lay === 'horizontal' ? 'h' : 'st'}` : ''}" role="img" aria-label="${A(name)} logo" style="${ink}${size}">${inner}</span>`;
}

// the brand's data with every placeholder string emptied, and the lists and groups left with nothing in them dropped. What is left is
// what the project really wrote: the notes read it as they read any brand's, and an empty value is a line they do not print.
const isPlain = (o) => o && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype;
const leaves = (v) => (typeof v === 'string' ? (v ? 1 : 0) : Array.isArray(v) ? v.reduce((n, x) => n + leaves(x), 0) : isPlain(v) ? Object.values(v).reduce((n, x) => n + leaves(x), 0) : 0);
const hadText = (v) => (typeof v === 'string' ? true : Array.isArray(v) ? v.some(hadText) : isPlain(v) ? Object.values(v).some(hadText) : false);
export function cleaned(v) {
  if (typeof v === 'string') return hasPh(v) ? '' : v;
  if (Array.isArray(v)) return v.map((o) => [o, cleaned(o)]).filter(([o, x]) => !(typeof x === 'string' ? !x : isPlain(o) && hadText(o) && !leaves(x))).map(([, x]) => x);
  if (isPlain(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleaned(x)]));
  return v;
}

const cache = new WeakMap();
/**
 * The context the published pages are drawn from: the same, but where the slot edition would draw its dashed logo frame the brand name
 * is set in the display face. Only the slot edition changes; every other edition is returned as it is.
 */
export function siteCtx(ctx) {
  if (ctx.edition !== 'slot') return ctx;
  if (cache.has(ctx)) return cache.get(ctx);
  const base = ctx.logo;
  const logo = {
    ...base,
    drawn: true, // the theme's own slot-frame helpers read this: the name is set, so they draw the mark, not the frame
    html: (id, o = {}) => wordmark(ctx, base.geos, id, o),
    forMisuse: (width, { fill, share } = {}) => wordmark(ctx, base.geos, 'colour', { width, color: fill, share }),
  };
  // a brand with no name has no outlined logo to draw either: the slides get the same typeset stand-in
  if (!nameOf(ctx)) {
    logo.svg = (id, { colourway, width, height, fill } = {}) => {
      const g = base.geos[id] || base.geos.colour, cwk = colourway || base.colourwayOf(id);
      return wordmark(ctx, base.geos, id, { width: width || (height * g.w) / g.h, color: fill || ctx.brand.logo.colourways[cwk].name, colourway: cwk });
    };
  }
  const out = Object.create(ctx);
  Object.defineProperty(out, 'logo', { value: logo, enumerable: true });
  Object.defineProperty(out, 'brand', { value: cleaned(ctx.brand), enumerable: true });
  cache.set(ctx, out);
  return out;
}

/**
 * The context the published sites are built from: a face with no font files of its own is served by a stand-in, so the site names the
 * face it really loads (the font-face rule, the specimens and every label), not the design's family it only stands in for.
 */
export function servedCtx(ctx) {
  const F = ctx.brand.fonts || {}, to = {};
  for (const f of Object.values(F)) if (f && f.standIn && servedFamily(f) !== f.family) to[f.family] = servedFamily(f);
  if (!Object.keys(to).length) return ctx;
  const fonts = Object.fromEntries(Object.entries(F).map(([r, f]) => [r, f && to[f.family] ? { ...f, family: to[f.family], standIn: false } : f]));
  const out = Object.create(ctx);
  Object.defineProperty(out, 'brand', { value: { ...ctx.brand, fonts }, enumerable: true });
  Object.defineProperty(out, 'faces', { value: (ctx.faces || []).map((x) => (to[x.family] ? { ...x, family: to[x.family] } : x)), enumerable: true });
  return out;
}
