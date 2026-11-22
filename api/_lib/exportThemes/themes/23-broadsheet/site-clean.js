// Theme 23, Broadsheet: what the published sites leave out of the slot edition. Theme 23 is not one of the themes whose placeholders carry the
// engine's sentinel, so the words the project has still to write are plain filler text from the brand data. A published site carries none of it:
// a line that is filler is not printed, a group left with nothing is dropped (the guide's keep() then drops the page), and where the logo would
// sit the name is set in the display face. The product screen and the type specimen are the theme's own sample story (story.js).
import { esc as A } from '../../engine/brand.js';
import { tint, ratio } from '../../engine/color.js';
import { servedFamily } from '../21-presentation/helpers.js';
import { accentSplit, accentOf, symbolOf } from '../21-presentation/lane-ht-clean.js';
import { story, SPECIMEN, SCREEN_TITLE } from './story.js';

const FILLER = new RegExp('^(?:'
  + 'Your (?:brand|city|name|title|headline here|screen|subject line)|Customer name|Brand team|brand\\.example|you@brand\\.example|brand@brand\\.example'
  + '|Your main line goes here\\.|A (?:second|third) line\\.|Write this in your own words\\.|Say where this version goes\\.'
  + '|(?:Trait|Writing rule|Write this|Not this|Brand rule|Social line|Left out of this document|Photo habit|Photo mistake|Type habit|Type mistake) \\d+\\.?'
  + '|Example \\d+, (?:do|not) this\\.|Sign, \\d+ x \\d+ mm: your line here\\.|A short (?:paragraph of ordinary copy|caption)\\.|Hi there,|10:44'
  + ')$');
/** true where a string is the engine's stand-in for something the project has not written */
export const isFiller = (s) => typeof s === 'string' && FILLER.test(s.trim());

const isPlain = (o) => o && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype;
const leaves = (v) => (typeof v === 'string' ? (v ? 1 : 0) : Array.isArray(v) ? v.reduce((n, x) => n + leaves(x), 0) : isPlain(v) ? Object.values(v).reduce((n, x) => n + leaves(x), 0) : 0);
const hadText = (v) => (typeof v === 'string' ? true : Array.isArray(v) ? v.some(hadText) : isPlain(v) ? Object.values(v).some(hadText) : false);
/** the data with every filler string emptied, and every list item or group left with nothing in it dropped */
export function cleaned(v) {
  if (typeof v === 'string') return isFiller(v) ? '' : v;
  if (Array.isArray(v)) return v.map((o) => [o, cleaned(o)]).filter(([o, x]) => !(typeof x === 'string' ? !x : isPlain(o) && hadText(o) && !leaves(x))).map(([, x]) => x);
  if (isPlain(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, cleaned(x)]));
  return v;
}

// the brand name as a mark: the display face, the version's own proportions. `width` is px; `share` sets it as a share of the container (a
// tile) and sizes the type in container units, so the mark keeps its size against the tile. The name sits in its own span so spaces are kept.
function wordmark(ctx, geos, id, { width = 200, color, share, colourway } = {}) {
  const name = String(ctx.brand.name || 'Your name');
  const g = geos[id] || geos.colour || Object.values(geos)[0], sym = id === 'symbol';
  const lay = id === 'horizontal' || id === 'stacked' ? id : '';
  const text = sym ? symbolOf(name) : name, h = (width * g.h) / g.w;
  const fs = Math.max(10, sym ? h * 0.6 : lay === 'horizontal' ? Math.min(h * 0.6, width / (text.length * 0.55 + 2.6)) : lay === 'stacked' ? Math.min(h * 0.3, width / (text.length * 0.55)) : Math.min(h * 0.8, width / (Math.max(text.length, 3) * 0.5)));
  // the size also follows the width of the .tb-logo box (cqw), so a mark in a narrow column shrinks with it instead of running past the edge
  const ink = color ? 'color:' + color + ';' : '';
  const size = share ? 'width:' + share * 100 + 'cqw;font-size:min(' + (fs * 2).toFixed(1) + 'px,' + ((fs / width) * share * 100).toFixed(2) + 'cqw)' : 'width:' + width + 'px;height:' + h.toFixed(1) + 'px;font-size:min(' + fs.toFixed(1) + 'px,' + ((fs / width) * 100).toFixed(2) + 'cqw)';
  const accent = !sym && colourway ? accentOf(ctx, colourway, color) : '';
  const [pre, post] = accent ? accentSplit(name) : [name, ''];
  const named = accent ? A(pre) + '<em class="hx-wm__a" style="color:' + accent + '">' + A(post) + '</em>' : A(text);
  const inner = lay ? '<b class="hx-wm__s">' + A(symbolOf(name)) + '</b><span>' + named + '</span>' : sym ? A(text) : '<span>' + named + '</span>';
  return '<span class="hx-wm disp' + (sym ? ' hx-wm--sym' : '') + (lay ? ' hx-wm--' + (lay === 'horizontal' ? 'h' : 'st') : '') + '" role="img" aria-label="' + A(name) + ' logo" style="' + ink + size + '">' + inner + '</span>';
}

const cache = new WeakMap();
/** the slot edition's context for a published site: no logo frame, no filler, the sample story; another edition is returned as it is */
export function siteCtx(ctx) {
  if (ctx.edition !== 'slot') return ctx;
  if (cache.has(ctx)) return cache.get(ctx);
  const base = ctx.logo, B = ctx.brand;
  const logo = {
    ...base,
    drawn: true,
    html: (id, o = {}) => wordmark(ctx, base.geos, id, o),
    forMisuse: (width, { fill, share } = {}) => wordmark(ctx, base.geos, 'colour', { width, color: fill, share }),
  };
  const real = cleaned({ ...B, name: undefined, ui: undefined, logo: undefined });
  const shots = ((B.imagery || {}).shots || []).filter((s) => !isFiller(s.slot) && s.slot);
  const brand = {
    ...B, ...real, name: B.name,
    imagery: { ...real.imagery, shots },
    logo: { ...cleaned(B.logo), showcase: { ...cleaned(B.logo.showcase), wordmark: B.logo.showcase.wordmark } },
    type: { ...real.type, sample: { ...SPECIMEN } },
    ui: { ...B.ui, screen: { ...B.ui.screen, title: SCREEN_TITLE, content: story(ctx) } },
  };
  const out = Object.create(ctx);
  Object.defineProperty(out, 'logo', { value: logo, enumerable: true });
  Object.defineProperty(out, 'brand', { value: brand, enumerable: true });
  Object.defineProperty(out, 'roles', { value: softRaised(ctx.roles), enumerable: true });
  cache.set(ctx, out);
  return out;
}

/** a role that is pure white is the house default, not the brand's: set it a step off white, in the surface's own hue, where it still reads */
const WHITE = (v) => String(v).toUpperCase() === '#FFFFFF';
function softRaised(roles) {
  const out = { ...roles };
  for (const mode of ['light', 'dark']) {
    const M = roles && roles[mode];
    if (!M) continue;
    const next = { ...M }, off = tint(M.surface, 0.985, 0.012);
    if (WHITE(M.raised) && ['text', 'textSoft', 'quiet'].every((k) => !M[k] || ratio(M[k], off) >= 4.5)) next.raised = off;
    if (WHITE(M.actionLabel) && ['action', 'actionHover', 'actionPressed'].every((k) => !M[k] || ratio(off, M[k]) >= 4.5)) next.actionLabel = off;
    out[mode] = next;
  }
  return out;
}

/** a face with no font files of its own is served by a stand-in: the site names the face it really loads */
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

/** the prepare hook of both sites */
export const prepare = (ctx) => siteCtx(servedCtx(ctx));
