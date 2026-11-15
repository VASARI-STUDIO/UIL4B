// Theme 23, Broadsheet, lane u1: the UI kit's chrome, shared read-only with lanes u2 and u3.
// The kit is a supplement to the paper: the same folio, grid and rules as the guidelines, and the product itself set into the columns as a display ad
// (a .ui region on the brand's own surface, edged with a 1 px ink rule). Components are never restyled; the page is styled around them.
// No export here is named like a lane export, so nothing in this file is merged by the loader: lane-u1.js imports it.
// Colours come from ctx roles and brand data; no brand colour id or hex is written here.
import { A, E, G, px, folio, copyGuard, fitLines, headLines, linesIn } from './helpers.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

// ---- numbers as words, for headlines that count ("Twenty-five pages") ----
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export const word = (n) => (n < 20 ? ONES[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '') : String(n));
export const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };

// ---- literal values ----
export const mono = (s) => `<span class="u1-m">${A(s)}</span>`;
export const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}:1`;

// ---- the page: a section with the folio line, checked by the copy guard ----
export const kitPage = (ctx, id, inner, { folio: withFolio = true } = {}) =>
  copyGuard(ctx, id, `<section class="pg u1-pg" data-page="${id}">${withFolio ? folio(ctx, id) : ''}${inner}</section>`);

// a headline in the display face, fitted to its measure: { html, h, bottom, size }
export function kitHead(ctx, text, { x = G.left, y = G.top, w = 1000, max = 64, min = 48, maxLines = 2, cls = 'b-head' } = {}) {
  const hd = fitLines(ctx, text, { w, max, min, maxLines });
  const lh = Math.round(hd.size * 68 / 64), h = hd.lines.length * lh;
  return { html: E(x, y, 'story', headLines(hd.lines, hd.size, lh, cls), { w }), h, bottom: y + h, size: hd.size };
}
// the deck under a headline, in the body face at 24/32: { html, h }
export function kitDeck(ctx, text, x, y, w = 488) {
  const h = linesIn(ctx, 'body', text, 24, w, 500) * 32;
  return { html: E(x, y, 'b-deck', A(text), { w }), h };
}

// The display ad: the product on the surface it ships on, set into the columns with a 1 px ink rule round it.
// Place it by top (y) or hang it from a bottom edge (bottom, in page px); h fixes its height, else the content sets it.
export function adBox(ctx, x, y, w, inner, { dark = false, pad = 32, h = null, bottom = null, cls = '' } = {}) {
  const pos = bottom != null ? `bottom:${px(ctx.size.h - bottom)}` : `top:${px(y)}`;
  return `<div class="a ui u1-ad ${cls}"${dark ? ' data-theme="dark"' : ''} style="left:${px(x)};${pos};width:${px(w)};${h != null ? `height:${px(h)};` : ''}padding:${pad}px"><!--art-->${inner}<!--/art--></div>`;
}

// Which components read a token: the first .ui- class of every components rule whose body uses var(--name). Read from the CSS the code ships.
export function usedBy(ctx, name) {
  const css = componentsCss(ctx), out = new Set(), re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (!new RegExp(`var\\(--${name}[,)]`).test(m[2])) continue;
    for (const sel of m[1].split(',')) { const c = /\.ui-[a-z]+(?:__[a-z]+)?/.exec(sel); if (c) out.add(c[0]); }
  }
  return [...out];
}

// The kit's tokens and components, for the UI kit document only. componentsCss is nested under .pg (CSS nesting), so every component rule is scoped
// to the page; @keyframes cannot nest and are lifted out unchanged.
export function kitCss(ctx) {
  const g = tokenGroups(ctx), stretch = ctx.brand.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  const keyframes = [];
  const comp = componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, (k) => { keyframes.push(k); return ''; });
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
.pg{${comp}}
${keyframes.join('\n')}
.pg .ui .ui-display{font-stretch:${stretch}%}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

// the lane's own chrome classes (written by lane-u1.js css(), so u2 and u3 get them whenever they use adBox or mono)
export const chromeCss = () => `
.pg .u1-ad{box-sizing:border-box;border:1px solid var(--ink);overflow:hidden;isolation:isolate}
.pg .u1-ad .a{position:absolute}
.pg .u1-m{font:400 15px/22px 'Fragment Mono',monospace;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .u1-sh{font:700 28px/32px 'Sofia Sans Condensed',sans-serif;letter-spacing:0}
.pg .u1-flag{font:700 160px/144px 'Sofia Sans Condensed',sans-serif;letter-spacing:-.01em;text-align:right;white-space:nowrap}
`;
