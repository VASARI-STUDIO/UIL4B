// Lane g3 helpers (colour and type pages). Copies of the round 1 helpers in guidelines-r1.js, which does not export them, plus a running head
// that can sit across more than one field. Nothing here is named guidelines, uikit or css, so the lane loader merges nothing from this file.
import { A } from './helpers.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export { A, loadFont, outline, capHeight };
export const face = (ctx, role, weight, italic = false) => ctx.faces.find((f) => f.role === role && (f.style === 'italic') === italic && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
export const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
// width of one line of text in px, from the font file (letter-spacing in em)
export const textW = (ctx, role, weight, text, size, track = 0, italic = false) => { const o = outline(loadFont(face(ctx, role, weight, italic).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
// the left side bearing of a text's first glyph, so a big line can sit optically on the margin
export const lsb = (ctx, role, weight, text, size) => outline(loadFont(face(ctx, role, weight).stem), text[0], size, 0).x1;
export const capH = (ctx, role, weight, size) => capHeight(loadFont(face(ctx, role, weight).stem), size);
// top of a text box so that its first baseline lands on y
export const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };
// the largest size from hi down to lo at which every text sets on one line of maxW
export const fitOne = (ctx, role, weight, texts, hi, lo, maxW, track = -0.01) => { for (let s = hi; s > lo; s--) if (texts.every((t) => textW(ctx, role, weight, t, s, track) <= maxW)) return s; return lo; };

// greedy wrap of a text at maxW, as explicit lines so the lines laid out are the lines that render
export function wrap(ctx, role, weight, text, size, maxW, track = 0) {
  const out = []; let cur = '';
  for (const w of String(text).split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
// the same line count as greedy, the lines as even as they can be
export function balance(ctx, role, weight, text, size, maxW, track = 0) {
  const words = String(text).split(' '), n = wrap(ctx, role, weight, text, size, maxW, track).length;
  if (n === 1) return [text];
  let lo = Math.max(...words.map((w) => textW(ctx, role, weight, w, size, track))), hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(ctx, role, weight, text, size, mid, track).length <= n) hi = mid; else lo = mid; }
  return wrap(ctx, role, weight, text, size, hi, track);
}
export const lineHtml = (lines) => lines.map((l) => `<span class="r-ln">${A(l)}</span>`).join('');

// colour roles
export const L = (ctx) => ctx.roles.light;
export const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
export const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// chrome rule (spec 2.3): the brand's quiet tone that reaches 4.5:1 on every ground the text crosses; else the best of the text colour, the page ground and the dark soft text
export const chromeOn = (ctx, ...hexes) => {
  const ok = (c) => hexes.every((h) => ctx.ratio(c, h) >= 4.5), worst = (c) => Math.min(...hexes.map((h) => ctx.ratio(c, h)));
  return [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find(ok) || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => worst(b) - worst(a))[0];
};
// a colour or tone's name; a text tone by its role ("Quiet text"), so "Quiet text on Concrete" never reads "Quiet on White on Concrete"
export const nameOfHex = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => c.hex.toLowerCase() === String(hex).toLowerCase())?.name || hex;
export const px = (n) => +(+n).toFixed(2);
export const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
// the 12-column grid of the 1280 page (spec 2.1)
export const colX = (n) => 56 + n * 98.667;
export const span = (k) => k * 82.667 + (k - 1) * 16;

// The one running head (spec 2.5): section number and title left, document name and a three-digit folio right. Each part takes a chrome colour that
// passes on every field it crosses: `left` and `right` are lists of the grounds under each part.
export function head(ctx, id, { left = [], right = [], title } = {}) {
  const p = ctx.pages.find((x) => x.id === id), g = L(ctx).surface;
  const lg = left.length ? left : [g], rg = right.length ? right : lg;
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${chromeOn(ctx, ...lg)}">${p.ref ? `<b>${p.ref}</b>` : ''}${A(title || p.title)}</span><span class="r-hr num" style="color:${chromeOn(ctx, ...rg)}"><i>${A(ctx.brand.name)} brand guidelines</i><b>${folio}</b></span></div>`;
}
// the width of the head's right part, to know which fields it crosses
export const headRightW = (ctx) => textW(ctx, 'body', 400, `${ctx.brand.name} brand guidelines`, 12) + 36;
export const page = (id, cls, inner, bg) => `<section class="pg pg--r g3 ${cls}" data-page="${id}" style="background:${bg}">${inner}</section>`;

// A brand rule "Say <word> once" (Long Room: "Say free once"): that word prints on the cover and nowhere else, so these pages drop the sentences that carry it.
export const onceRe = (ctx) => { const m = ctx.brand.voice.principles.map((v) => /^say (\w+) once$/i.exec(v.title)).find(Boolean); return m ? new RegExp(String.raw`\b${m[1]}\b`, 'i') : null; };
export const sentences = (s) => (s || '').split(/(?<=[.!?]) /).map((x) => x.trim()).filter(Boolean);
export const sayOnce = (ctx, text) => { const re = onceRe(ctx); return re ? sentences(text).filter((s) => !re.test(s)).join(' ') : text; };
export const allowed = (ctx, t) => { const re = onceRe(ctx); return !!t && !(re && re.test(t)); };
// the first candidate the brand allows here, else the first one
export const pick = (ctx, list) => list.find((t) => allowed(ctx, t)) || list.find(Boolean) || '';
