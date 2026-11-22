// Theme 26, Notebook, the published sites: what the slot edition leaves out. In the slot edition every line the project has still to write is
// generic filler ("Write this in your own words.", "Trait 1", "Your main line goes here."): guidance for an editor, and a published site carries
// none. This theme is not in the placeholder swap, so the filler is plain text, and the sites are drawn from a cleaned context (theme 21's
// helpers, read only): the filler is emptied and what is left with nothing in it is dropped, the sample screens carry the one story (story.js),
// the brand's name is typeset in the display face where the dashed logo frame would go (and fitted to the logo's box when the logo is the outlined
// name), and the font a stand-in serves is named as itself. `raw` keeps the context before the filler went, so `keep` can see what is real.
import { siteCtx, servedCtx, cleaned, nameFor } from '../21-presentation/lane-ht-clean.js';
import { advance, stemOf } from './helpers.js';
import { screenContent } from './story.js';

// the engine's filler strings, matched whole: a drift test builds the empty brand and fails when a string here no longer matches what the engine writes
export const GENERIC = [
  /^Write this in your own words\.$/, /^Your main line goes here\.$/, /^A (second|third) line\.$/, /^Your city$/, /^Trait \d+$/,
  /^Writing rule \d+$/, /^(Write|Not) this \d+$/, /^Photo (habit|mistake) \d+\.$/, /^Type (habit|mistake) \d+\.$/,
  /^Your (name|title|subject line|headline here)$/, /^(you|brand)@brand\.example$/, /^brand\.example$/, /^Sign, .* your line here\.$/,
  /^Social line \d+\.$/, /^Example \d+, (do|not) this\.$/, /^Brand rule \d+$/, /^Left out of this document \d+\.$/, /^Customer name$/,
  /^Hi there,$/, /^Brand team$/, /^Say where this version goes\.$/, /^A short (paragraph of ordinary copy|caption)\.$/,
];
export const isGeneric = (s) => typeof s === 'string' && GENERIC.some((re) => re.test(s));

// where each logo version goes: the engine leaves this blank for the project to write, and the versions page is unreadable without it
export const WHEN = {
  colour: 'The full colour logo, on paper and on any light ground.',
  'mono-dark': 'The one-colour dark logo, where colour cannot be printed: a stamp, a fax, a newspaper.',
  'mono-light': 'The one-colour light logo, on a dark ground or a photograph.',
  reversed: 'The reversed logo, on the brand colour and on dark grounds.',
  horizontal: 'The horizontal logo, where there is more width than height: a header, a strip, a signature.',
  stacked: 'The stacked logo, where the space is squarer: a sign, a cover, a social image.',
  symbol: 'The symbol alone, where the name is already there or the space is small: an app icon, an avatar.',
};
// the type page's specimen copy: pangrams, which show the faces and which nobody mistakes for the brand's own copy
export const SPECIMEN = {
  headline: 'Pack my box with five dozen liquor jugs',
  paragraph: 'How vexingly quick daft zebras jump. The job requires extra pluck and zeal from every young wage earner, and the five boxing wizards jump quickly.',
  caption: 'Figure 1. Sphinx of black quartz, judge my vow.',
};

// the keys left as they are: the name and the logo are handled apart, the rest hold the project's own design
const KEEP = new Set(['name', 'logo', 'fonts', 'colours', 'pairs', 'theme', 'edition', 'version', 'slug', 'ui']);
const isPlain = (o) => o && typeof o === 'object' && Object.getPrototypeOf(o) === Object.prototype;
const blank = (v) => (typeof v === 'string' ? (isGeneric(v) ? '' : v) : Array.isArray(v) ? v.map(blank) : isPlain(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : v);

// the brand with the filler gone and the story in: what the project really wrote, and the sample screens' words
function realBrand(ctx) {
  const B = ctx.brand, out = { ...B };
  for (const [k, v] of Object.entries(B)) if (!KEEP.has(k)) out[k] = cleaned(blank(v));
  if (out.type) out.type = { ...out.type, sample: { ...SPECIMEN } };
  const when = { ...((B.logo || {}).when || {}) };
  for (const id of Object.keys(WHEN)) if (!when[id] || isGeneric(when[id])) when[id] = WHEN[id];
  out.logo = { ...B.logo, idea: blank(B.logo.idea), showcase: { ...B.logo.showcase, symbolNote: blank(B.logo.showcase.symbolNote) }, when };
  out.ui = { ...B.ui, screen: { ...B.ui.screen, title: 'Orders', content: screenContent(ctx) } };
  return out;
}

// The logo's box is drawn to the outlined name's own proportions and a dimension line spans that box, so the typeset name is set to fill it edge to
// edge (measured in the display face): the line then measures what the eye sees. The versions with a symbol keep their shapes.
function fitName(ctx, html, o) {
  const name = nameFor(ctx), w = o.width || 200;
  const fs = w / (advance(stemOf(ctx, 'display', ctx.weights.heading), 100, name, -0.01) / 100);
  const size = o.share ? `font-size:min(${(fs * 2).toFixed(1)}px,${((fs / w) * o.share * 100).toFixed(2)}cqw)` : `font-size:${fs.toFixed(1)}px`;
  return html.replace(/font-size:[^;"]+/, size);
}

const made = new WeakMap();
export function prepareSite(ctx0) {
  const served = servedCtx(ctx0);
  if (served.edition !== 'slot') return served;
  if (made.has(served)) return made.get(served);
  const real = Object.create(served);
  Object.defineProperty(real, 'brand', { value: realBrand(served), enumerable: true });
  const clean = siteCtx(real), base = clean.logo, plain = (id) => id !== 'horizontal' && id !== 'stacked' && id !== 'symbol';
  const logo = {
    ...base,
    html: (id, o = {}) => (plain(id) ? fitName(clean, base.html(id, o), o) : base.html(id, o)),
    forMisuse: (width, o = {}) => fitName(clean, base.forMisuse(width, o), { width, share: o.share }),
  };
  const out = Object.create(clean);
  Object.defineProperty(out, 'logo', { value: logo, enumerable: true });
  Object.defineProperty(out, 'raw', { value: served, enumerable: false });
  made.set(served, out);
  return out;
}
export const rawOf = (ctx) => ctx.raw || ctx;

// the typeset mark (theme 21's wordmark markup) in this theme's own face and weight: the display face, the version's shapes
export const wordmarkCss = (ctx) => {
  const d = ctx.brand.fonts.display;
  return `
.ht-d{font-family:'${d.family}',sans-serif;font-weight:${ctx.weights.heading};font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;line-height:1.02}
.ht-wm{display:inline-flex;align-items:center;justify-content:center;max-width:100%;white-space:nowrap;line-height:1.1;letter-spacing:-0.01em;overflow:visible}
.ht-wm--sym{letter-spacing:0}
.ht-wm--h{gap:.45em}
.ht-wm--h .ht-wm__s{font-size:1em;padding-right:.45em;border-right:.08em solid currentColor;line-height:1.1}
.ht-wm--st{flex-direction:column;gap:.15em}
.ht-wm--st .ht-wm__s{font-size:1.9em;line-height:1}
.ht-wm--st span{font-size:.55em;letter-spacing:.04em;text-transform:uppercase}
.ht-wm__s{font-weight:inherit}
.ht-wm__a{font-style:normal}
`;
};
