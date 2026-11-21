// Lane ht, shared: what the two web parts (the guidelines site and the UI kit site) say in the same words. Colour by role, the ink
// and chrome tone that read on a field, measured display sizes, the deck's running head as a sticky bar, the next-slide field and
// the site CSS. Copied from lane-bk.js (which keeps them private) so the web parts and the brand book read as one deck.
import { esc as A } from '../../engine/brand.js';
import { outline, capHeight, plainLogo } from '../../engine/logo.js';
import { cssIdent } from '../../engine/escape.js';
import { loadFont } from '../../engine/nodeFont.js';
import { softOnDark } from './helpers.js';
import { nameOf, nameFor, accentOf, accentSplit } from './lane-ht-clean.js';

export { A };
export const L = (ctx) => ctx.roles.light;
export const DK = (ctx) => ctx.roles.dark;
export const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
export const lower = (h) => String(h).toLowerCase();
export const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the deck's chrome rule: the quiet tone that reaches 4.5:1 on the field, else the best of text, ground and dark soft text
export const chromeOn = (ctx, hex) => {
  const soft = softOnDark(ctx, hex);
  if (soft) return soft;
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, DK(ctx).quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, DK(ctx).textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
export const nameOfHex = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => lower(c.hex) === lower(hex))?.name || hex;
// the three fields of the deck, by role: the dark text field, the action field and the panel
export const darkF = (ctx) => byRole(ctx, 'text')?.hex || L(ctx).text;
export const actF = (ctx) => byRole(ctx, 'action')?.hex || L(ctx).action;
export const panelF = (ctx) => L(ctx).sunken;
// a colour as the palette token the page's CSS declares for it (the brand's own colours); a tone that is not one stays as its value
const tokenOf = (ctx, hex) => { const c = ctx.colours.find((x) => lower(x.hex) === lower(hex)); return c ? `var(--palette-${cssIdent(c.id)})` : hex; };
// a field's colours as custom properties, the ink checked against it at the size it is used
export const fieldStyle = (ctx, hex, what, size = 15) => {
  const ink = inkOn(ctx, hex), t = tokenOf(ctx, hex);
  ctx.pair(ink, hex, { size: Math.max(size, 15), what });
  return `background:${t};color:${ink};--q:${chromeOn(ctx, hex)};--fi:${ink};--fb:${t}`;
};
// the logo colourway the brand draws for a ground, else the one-colour version in the field's ink
export const cwFor = (ctx, hex) => {
  const own = Object.entries(ctx.brand.logo.colourways).filter(([, v]) => lower(v.ground) === lower(hex)).sort(([a], [b]) => a.startsWith('mono') - b.startsWith('mono'))[0]?.[0];
  return own || (lower(inkOn(ctx, hex)) === lower(L(ctx).text) ? 'mono-dark' : 'mono-light');
};

// ---- measured display type: the widest word of a text fits a share of its container (cqw), with a cap in px ----
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
export const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const advance = (ctx, text) => { const o = outline(loadFont(face(ctx, 'display', dispW(ctx)).stem), text, 100, -0.01); return ((o.x2 - Math.min(0, o.x1)) / 100) * 1.04; };
export function fitSize(ctx, texts, share, cap, floor = 24) {
  const widest = Math.max(...texts.flatMap((t) => String(t).split(/\s+/)).filter(Boolean).map((x) => advance(ctx, x)));
  return `clamp(${floor}px, ${((share * 100) / widest).toFixed(3)}cqw, ${cap}px)`;
}
// ---- the logo drawn to its ink: the name outlined in the display face, in an SVG whose box is the ink and nothing else (the wordmark in
// the pages is live text, whose box carries line height and side bearing). The clear-space zone and the smallest-size logo measure from this. ----
const TRACK = -0.01, SZ = 100;
const inkFont = (ctx) => loadFont(face(ctx, 'display', dispW(ctx)).stem);
const advanceOf = (font, text) => { let x = 0, prev = null; for (const ch of text) { const g = font.charToGlyph(ch); if (prev) { try { x += font.getKerningValue(prev, g) * SZ / font.unitsPerEm; } catch { /* no kerning table */ } } x += g.advanceWidth * SZ / font.unitsPerEm + TRACK * SZ; prev = g; } return x; };
// the name as one or two parts (the second in the accent where the colourway sets one), each as path data on its own origin
const nameGeo = (ctx, split) => {
  const font = inkFont(ctx), name = nameFor(ctx), [pre, post] = split ? accentSplit(name) : [name, ''];
  const a = outline(font, pre, SZ, TRACK);
  if (!post) return { w: a.x2 - a.x1, h: a.y2 - a.y1, parts: [{ d: a.d, tf: `translate(${(-a.x1).toFixed(2)} ${(-a.y1).toFixed(2)})` }] };
  const b = outline(font, post, SZ, TRACK), dx = advanceOf(font, pre), x1 = Math.min(a.x1, dx + b.x1), x2 = Math.max(a.x2, dx + b.x2), y1 = Math.min(a.y1, b.y1), y2 = Math.max(a.y2, b.y2);
  return { w: x2 - x1, h: y2 - y1, parts: [{ d: a.d, tf: `translate(${(-x1).toFixed(2)} ${(-y1).toFixed(2)})` }, { d: b.d, accent: true, tf: `translate(${(dx - x1).toFixed(2)} ${(-y1).toFixed(2)})` }] };
};
// a logo version on a ground as ink: { w, h } its ink box in drawing units, svg(width) the drawing at that width in px (no width: it fills its box)
export function inkMark(ctx, hex, id = 'colour') {
  const cw = ctx.brand.logo.colourways, k = cwFor(ctx, hex), own = cw[k] && lower(cw[k].ground) === lower(hex);
  const color = id === 'mono-dark' ? L(ctx).text : own ? cw[k].name : inkOn(ctx, hex);
  const primary = ['colour', 'mono-dark', 'mono-light', 'reversed'].includes(id);
  let geo;
  if (primary) {
    const acc = own && id !== 'mono-dark' ? accentOf(ctx, k, color) : '';
    geo = nameGeo(ctx, !!acc); geo.accent = acc;
  } else {
    const made = plainLogo({ brand: { name: nameFor(ctx), logo: { showcase: {} } }, font: inkFont(ctx), outline, capHeight });
    const g = made[id];
    geo = { w: g.w, h: g.h, parts: g.parts.map((p) => ({ d: p.d, tf: p.tf })), accent: '' };
    // the stacked lockup draws its symbol flush left over the name: centre it on the name's width (the symbol is the first part, drawn at 1.6x)
    if (id === 'stacked' && made.symbol && geo.parts.length > 1) geo.parts[0].tf = geo.parts[0].tf.replace(/^translate\(0\.00 0\.00\)/, `translate(${((g.w - made.symbol.w * 1.6) / 2).toFixed(2)} 0.00)`);
  }
  const label = `${nameFor(ctx)} logo`;
  return { w: geo.w, h: geo.h, svg: (width) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${geo.w.toFixed(2)} ${geo.h.toFixed(2)}"${width ? ` width="${width}" height="${((width * geo.h) / geo.w).toFixed(2)}"` : ''} role="img" aria-label="${A(label)}">${geo.parts.map((p) => `<path d="${p.d}" fill="${p.accent ? geo.accent : color}" transform="${p.tf}"/>`).join('')}</svg>` };
}
export const folio = (n) => String(n).padStart(3, '0');
export const words = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] || String(n);

// ---- the running head as the site bar: section ref and title left; the document name, the folio and the controls right ----
export function bar(ctx, { home, doc, ref, title, no, toggle, modeAttr = '' }) {
  return `<header class="ht-bar">
<a class="ht-home" href="${home}">${A(nameOf(ctx) || 'Home')}</a>
<p class="ht-run">${ref ? `<b class="num">${A(ref)}</b> ` : ''}<span>${A(title)}</span></p>
<p class="ht-doc"><span>${A(doc)}</span> <b class="num">${folio(no)}</b></p>
${toggle}
<div class="ht-mode" role="group" aria-label="Colour mode"${modeAttr}><button type="button" data-mode="light" aria-pressed="true">Light</button><button type="button" data-mode="dark" aria-pressed="false">Dark</button></div>
</header>`;
}
// the contents panel: every section as a stripe of the deck's colours, its pages listed in it
export function tocPanel(ctx, { id, sections, href, current, front }) {
  const grounds = [darkF(ctx), actF(ctx), panelF(ctx)];
  const rows = sections.map((s, i) => {
    const hex = grounds[i % 3];
    return `<li class="ht-toc__s" style="${fieldStyle(ctx, hex, 'site contents stripe')}"><p class="ht-toc__n"><b class="num">${s.n}</b> ${A(s.title)}</p><ol>${s.pages.map((p) => `<li><a href="${href(p.id)}"${p.id === current ? ' aria-current="page"' : ''}><span class="num">${p.ref}</span> ${A(p.title)}</a></li>`).join('')}</ol></li>`;
  }).join('');
  return `<nav class="ht-toc" id="${id}" aria-label="Contents" data-open="false"><a class="ht-toc__f" href="index.html">${A(front)}</a><ol class="ht-toc__l">${rows}</ol></nav>`;
}
// the next slide as a field: the action colour, the next title at display size; the previous one small beside it
export function nextField(ctx, { next, prev, nextLabel = 'Next', prevLabel = 'Previous', cover }) {
  const act = actF(ctx);
  // the last page has nothing after it: its band sends the reader back to the cover (cover = that page's href)
  const n = !next && cover ? `<a class="ht-next__a" href="${cover}"><span class="ht-k">Start again</span><span class="ht-d ht-next__t" style="font-size:${fitSize(ctx, ['Back to the cover'], 0.86, (ctx.brand.type.scale.find((x) => x.token === 'headline') || {}).size || 36, 32)}">Back to the cover</span></a>` : next ? `<a class="ht-next__a" href="${next.href}" rel="next"><span class="ht-k">${nextLabel}${next.ref ? ` <b class="num">${A(next.ref)}</b>` : ''}</span><span class="ht-d ht-next__t" style="font-size:${fitSize(ctx, [next.title], 0.86, (ctx.brand.type.scale.find((x) => x.token === 'headline') || {}).size || 36, 32)}">${A(next.title)}</span></a>` : '';
  const p = prev ? `<a class="ht-prev" href="${prev.href}" rel="prev"><span class="ht-k">${prevLabel}</span> ${prev.ref ? `<b class="num">${A(prev.ref)}</b> ` : ''}${A(prev.title)}</a>` : '';
  return `<nav class="ht-next" aria-label="Previous and next" style="${fieldStyle(ctx, act, 'site next field', 32)}">${n}${p}</nav>`;
}

// the skip link every page opens with: the first tab stop, jumps over the bar and the contents to the page itself
export const skipLink = () => '<a class="ht-skip" href="#ht-main">Skip to the content</a>';
// the contents as one spread: a row to a section, in three columns (its number, its title with the page count, its pages as links). One ground, hairlines between rows;
// nothing alternates. A section of one page is a row of one link.
// `brief` lists the sections alone, each title a link to the section's own `href` (for a front page that sits above a full contents page)
export function contentsGrid(ctx, sections, { label = 'Contents', brief = false } = {}) {
  const hs = fitSize(ctx, sections.map((s) => s.title), 0.9, 44, 28);
  const count = (s) => (s.pages.length === 1 ? '1 page' : `${s.pages.length} pages, ${A(s.pages[0].ref)} to ${A(s.pages[s.pages.length - 1].ref)}`);
  const rows = sections.map((s) => `<li class="ht-cx__r"><p class="ht-cx__n num">${A(s.n)}</p><div class="ht-cx__h"><h2 class="ht-d ht-cx__t" style="--bs:${hs}">${brief ? `<a href="${s.href}">${A(s.title)}</a>` : A(s.title)}</h2><p class="ht-cx__c num">${count(s)}</p></div>${brief ? '' : `<ol class="ht-cx__p">${s.pages.map((u) => `<li><a href="${u.href}"><span class="num">${A(u.ref)}</span><span>${A(u.title)}</span></a></li>`).join('')}</ol>`}</li>`).join('');
  return `<section class="ht-cx${brief ? ' ht-cx--brief' : ''}" id="contents" aria-label="${A(label)}"><ol>${rows}</ol></section>`;
}
