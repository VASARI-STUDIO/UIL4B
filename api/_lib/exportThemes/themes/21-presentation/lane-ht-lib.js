// Lane ht, shared: what the two web parts (the guidelines site and the UI kit site) say in the same words. Colour by role, the ink
// and chrome tone that read on a field, measured display sizes, the deck's running head as a sticky bar, the next-slide field and
// the site CSS. Copied from lane-bk.js (which keeps them private) so the web parts and the brand book read as one deck.
import { esc as A } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export { A };
export const L = (ctx) => ctx.roles.light;
export const DK = (ctx) => ctx.roles.dark;
export const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
export const lower = (h) => String(h).toLowerCase();
export const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the deck's chrome rule: the quiet tone that reaches 4.5:1 on the field, else the best of text, ground and dark soft text
export const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, DK(ctx).quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, DK(ctx).textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
export const nameOfHex = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => lower(c.hex) === lower(hex))?.name || hex;
// the three fields of the deck, by role: the dark text field, the action field and the panel
export const darkF = (ctx) => byRole(ctx, 'text')?.hex || L(ctx).text;
export const actF = (ctx) => byRole(ctx, 'action')?.hex || L(ctx).action;
export const panelF = (ctx) => L(ctx).sunken;
// a field's colours as custom properties, the ink checked against it at the size it is used
export const fieldStyle = (ctx, hex, what, size = 15) => {
  const ink = inkOn(ctx, hex);
  ctx.pair(ink, hex, { size: Math.max(size, 15), what });
  return `background:${hex};color:${ink};--q:${chromeOn(ctx, hex)};--fi:${ink};--fb:${hex}`;
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
export const folio = (n) => String(n).padStart(3, '0');
export const words = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] || String(n);

// ---- the running head as the site bar: section ref and title left; the document name, the folio and the controls right ----
export function bar(ctx, { home, doc, ref, title, no, toggle, modeAttr = '' }) {
  return `<header class="ht-bar">
<a class="ht-home" href="${home}">${A(ctx.brand.name)}</a>
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
export function nextField(ctx, { next, prev, nextLabel = 'Next', prevLabel = 'Previous' }) {
  const act = actF(ctx);
  const n = next ? `<a class="ht-next__a" href="${next.href}" rel="next"><span class="ht-k">${nextLabel}${next.ref ? ` <b class="num">${A(next.ref)}</b>` : ''}</span><span class="ht-d ht-next__t" style="font-size:${fitSize(ctx, [next.title], 0.86, 120, 32)}">${A(next.title)}</span></a>` : '';
  const p = prev ? `<a class="ht-prev" href="${prev.href}" rel="prev"><span class="ht-k">${prevLabel}</span> ${prev.ref ? `<b class="num">${A(prev.ref)}</b> ` : ''}${A(prev.title)}</a>` : '';
  return `<nav class="ht-next" aria-label="Previous and next" style="${fieldStyle(ctx, act, 'site next field', 32)}">${n}${p}</nav>`;
}
