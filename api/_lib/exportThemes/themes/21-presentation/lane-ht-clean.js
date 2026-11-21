// Lane ht, the published sites: what the slot edition leaves out. In the slot edition the words the user has still to write are
// placeholders (dashed boxes: guidance for an editor). A published site carries none of that. A line that holds a placeholder is
// not printed, a slide that holds one is not drawn, and where a logo would go the brand name stands in the display face. The test is
// the engine's own sentinel (a placeholder is the private-use mark U+E000 in the text), so nothing here reads copy.
import { esc as A } from '../../engine/brand.js';

const MARK = new RegExp(String.fromCharCode(0xe000));
/** true when the string (or markup) holds a placeholder */
export const hasPh = (s) => typeof s === 'string' && MARK.test(s);
/** the string, or '' where it is (or holds) a placeholder */
export const realOnly = (s) => (hasPh(s) ? '' : s);
/** the brand's name as words: '' while the project has not named it */
export const nameOf = (ctx) => (hasPh(ctx.brand.name) ? '' : String(ctx.brand.name || ''));
/** the document's own name: "<Name> guidelines", or "Brand guidelines" while the name is unwritten */
export const docOf = (ctx, what) => `${nameOf(ctx) || 'Brand'} ${what}`;

const initialsOf = (name) => {
  const w = name.split(/[\s&.,'-]+/).filter(Boolean);
  return (w.length > 1 ? w.slice(0, 2).map((x) => x[0]).join('') : name.slice(0, 2)).toUpperCase();
};

// the brand name as a mark: the display face, the version's own proportions. `width` is the logo's width in px; `share` instead sets it
// as a share of the container (a tile) and sizes the type in container units, so the mark keeps its size against the tile.
function wordmark(ctx, geos, id, { width = 200, color, share } = {}) {
  const name = nameOf(ctx);
  if (!name) return '';
  const g = geos[id] || geos.colour || Object.values(geos)[0], sym = id === 'symbol';
  const text = sym ? initialsOf(name) : name, h = (width * g.h) / g.w;
  const fs = Math.max(10, sym ? h * 0.6 : Math.min(h * 0.8, width / (Math.max(text.length, 3) * 0.5)));
  const ink = color ? `color:${color};` : '';
  const size = share ? `width:${share * 100}cqw;font-size:min(${(fs * 2).toFixed(1)}px,${((fs / width) * share * 100).toFixed(2)}cqw)` : `width:${width}px;height:${h.toFixed(1)}px;font-size:${fs.toFixed(1)}px`;
  return `<span class="ht-wm ht-d${sym ? ' ht-wm--sym' : ''}" role="img" aria-label="${A(name)} logo" style="${ink}${size}">${A(text)}</span>`;
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
  const out = Object.create(ctx);
  Object.defineProperty(out, 'logo', { value: logo, enumerable: true });
  Object.defineProperty(out, 'brand', { value: cleaned(ctx.brand), enumerable: true });
  cache.set(ctx, out);
  return out;
}

/** a page with nothing written yet: one quiet line */
export const NOT_WRITTEN = '<p class="ht-empty">Not written yet.</p>';
