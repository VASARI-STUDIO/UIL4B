// Theme 29 (Blueprint), lane bk: the flat art the book's photographed pieces carry. Each art is drawn at the shape of its surface in scene.json
// (the card at 90 x 55 mm, the phone screen, the laptop screen, the hoarding, the envelope), from brand data only, in the theme's art classes
// (`a`, `bd`, `bn`, var(--body)) that ctx.artPage gives through the theme's css. Every string is printed whole.
import { esc as A } from '../../engine/brand.js';
import { arts as sceneArts, artDoc as sceneDoc, CLIP, isCourier, hoardingScene } from './scenes.js';

export { isCourier };
import { fitW, wrap, inkW, displayStem } from './measure.js';

const r1 = (n) => Math.round(n * 10) / 10;
const doc = (ctx, w, h, inner) => ({ w, h, html: ctx.artPage(`<div class="a" style="left:0;top:0;width:${w}px;height:${h}px;overflow:hidden">${inner}</div>`, { w, h }) });
const fitLines = (ctx, text, sizes, maxW, lines) => {
  const stem = displayStem(ctx);
  for (const s of sizes) { const L = wrap(stem, String(text), s, maxW, -0.01); if (L.length <= lines && L.every((l) => inkW(stem, l, s, -0.01) <= maxW)) return { s, L }; }
  const s = sizes[sizes.length - 1]; return { s, L: wrap(stem, String(text), s, maxW, -0.01) };
};
const lns = (L) => L.map(A).join('<br>');
const logoW = (ctx, id, maxW, maxH) => fitW(ctx, id, maxW, maxH);
const logoH = (ctx, id, w) => (w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w;

// ---- the business card, 90 x 55 mm. `k` px to the mm: 3.7795 is true size at 96 dpi, 7.559 the photograph's art. ----
export function cardFront(ctx, w, h) {
  const rev = ctx.brand.logo.colourways.reversed, s = w / 340, lw = logoW(ctx, 'horizontal', 200 * s, 44 * s), M = 24 * s;
  return {
    ground: rev.ground, ink: rev.name,
    inner: `<div class="a" style="inset:0;background:${rev.ground}"></div>
<div class="a" style="left:${r1(M)}px;top:${r1(M)}px;width:${r1(lw)}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', label: 'Logo' })}</div>
<p class="a bn nw" style="left:${r1(M)}px;bottom:${r1(M)}px;font:500 ${r1(13 * s)}px/${r1(18 * s)}px var(--body);color:${rev.name}">${A(ctx.brand.lines.primary)}</p>`,
  };
}
export function cardBack(ctx, w, h) {
  const L = ctx.roles.light, C = ctx.brand.applications.card, url = ctx.brand.applications.site.url, s = w / 340, M = 24 * s;
  return {
    ground: L.raised, ink: L.text,
    inner: `<div class="a" style="inset:0;background:${L.raised}"></div>
<p class="a bd nw" style="left:${r1(M)}px;top:${r1(M)}px;font-size:${r1(20 * s)}px;line-height:${r1(24 * s)}px;color:${L.text}">${A(C.person)}</p>
<p class="a bn nw" style="left:${r1(M)}px;top:${r1(M + 28 * s)}px;font:400 ${r1(12 * s)}px/${r1(16 * s)}px var(--body);color:${L.quiet}">${A(C.role)}</p>
<p class="a bn nw" style="left:${r1(M)}px;bottom:${r1(M + 18 * s)}px;font:400 ${r1(12 * s)}px/${r1(16 * s)}px var(--body);color:${L.text}">${A(C.contact)}</p>
<p class="a bn nw" style="left:${r1(M)}px;bottom:${r1(M)}px;font:400 ${r1(12 * s)}px/${r1(16 * s)}px var(--body);color:${L.text}">${A(url)}</p>`,
  };
}
export function cardArts(ctx, aspect) {
  const w = 680, h = Math.round(w / aspect);
  return { 'card-front': doc(ctx, w, h, cardFront(ctx, w, h).inner), 'card-back': doc(ctx, w, h, cardBack(ctx, w, h).inner) };
}

// ---- the phone: the brand's post in a feed, a line in the display face on the reversed ground ----
export function phoneArt(ctx, aspect) {
  const B = ctx.brand, L = ctx.roles.light, rev = B.logo.colourways.reversed, w = 390, h = Math.round(w / aspect), M = 20;
  const line = B.applications.social[0], cap = B.applications.social[1] || B.lines.primary;
  const t = fitLines(ctx, line, [44, 40, 36, 32, 28], w - 2 * M - 24, 4);
  const sw = logoW(ctx, 'horizontal', 112, 24), lw = logoW(ctx, 'horizontal', 150, 32);
  const postTop = 112, post = w;
  const capL = wrap(`${B.fonts.body.file}-${B.fonts.body.weights[0]}`, String(cap), 15, w - 2 * M);
  return doc(ctx, w, h, `<div class="a" style="inset:0;background:${L.surface}"></div>
<div class="a" style="left:${M}px;top:60px;width:${r1(sw)}px">${ctx.logo.html('horizontal', { width: sw, colourway: 'colour', label: 'Logo' })}</div>
<p class="a bn nw" style="right:${M}px;top:62px;font:400 13px/20px var(--body);color:${L.quiet}">${A(B.applications.site.url)}</p>
<div class="a" style="left:0;top:${postTop}px;width:${post}px;height:${post}px;background:${rev.ground}"></div>
<p class="a bd" style="left:${M + 12}px;top:${postTop + 32}px;font-size:${t.s}px;line-height:${Math.round(t.s * 1.05)}px;color:${rev.name}">${lns(t.L)}</p>
<div class="a" style="left:${M + 12}px;top:${r1(postTop + post - 32 - logoH(ctx, 'horizontal', lw))}px;width:${r1(lw)}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', label: 'Logo' })}</div>
<p class="a bn" style="left:${M}px;top:${postTop + post + 20}px;width:${w - 2 * M}px;font:400 15px/22px var(--body);color:${L.text}">${lns(capL)}</p>`);
}

// ---- the laptop: the brand's email, open, with its signature ----
export function laptopArt(ctx, aspect) {
  const B = ctx.brand, L = ctx.roles.light, E = B.guideB.email, who = B.applications.email, w = 1440, h = Math.round(w / aspect);
  const lw = logoW(ctx, 'horizontal', 180, 40), sx = 400, bw = 760;
  const sub = fitLines(ctx, E.subject, [40, 36, 32], bw, 2);
  const bstem = `${B.fonts.body.file}-${B.fonts.body.weights[0]}`;
  let y = 120 + sub.L.length * Math.round(sub.s * 1.15) + 40, body = '';
  for (const p of E.body) { const ls = wrap(bstem, String(p), 20, bw); body += `<p class="a bn" style="left:${sx}px;top:${y}px;width:${bw}px;font:400 20px/30px var(--body);color:${L.text}">${lns(ls)}</p>`; y += ls.length * 30 + 20; }
  y += 24;
  const sig = `<div class="a" style="left:${sx}px;top:${y}px;width:${bw}px;height:1px;background:${L.divider}"></div>
<p class="a bn nw" style="left:${sx}px;top:${y + 24}px;font:600 18px/26px var(--body);color:${L.text}">${A(who.person)}</p>
<p class="a bn nw" style="left:${sx}px;top:${y + 50}px;font:400 16px/24px var(--body);color:${L.quiet}">${A(who.role)}, ${A(B.name)}</p>
<p class="a bn nw" style="left:${sx}px;top:${y + 76}px;font:400 16px/24px var(--body);color:${L.text}">${A(B.applications.card.contact)}  ·  ${A(B.applications.site.url)}</p>
<div class="a" style="left:${sx}px;top:${y + 120}px;width:${r1(lw)}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'colour', label: 'Logo' })}</div>`;
  return doc(ctx, w, h, `<div class="a" style="inset:0;background:${L.surface}"></div>
<div class="a" style="left:0;top:0;width:320px;height:${h}px;background:${L.raised};border-right:1px solid ${L.divider}"></div>
<p class="a bn nw" style="left:40px;top:48px;font:600 18px/24px var(--body);color:${L.text}">${A(E.to)}</p>
<p class="a bn nw" style="left:40px;top:76px;font:400 16px/24px var(--body);color:${L.quiet}">${A(E.time)}</p>
<p class="a bn nw" style="left:${sx}px;top:48px;font:400 16px/24px var(--body);color:${L.quiet}">${A(who.person)}, ${A(E.time)}</p>
<p class="a bd" style="left:${sx}px;top:96px;font-size:${sub.s}px;line-height:${Math.round(sub.s * 1.15)}px;color:${L.text}">${lns(sub.L)}</p>
${body}${sig}`);
}

// ---- the hoarding: the reversed ground, the brand's line and the logo, at the hoarding's shape ----
export function hoardingArt(ctx, aspect) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, w = 1700, h = Math.round(w / aspect), M = 64;
  const line = B.lines.others[0] || B.lines.primary, t = fitLines(ctx, line, [120, 104, 96, 88, 80, 72], w - 2 * M - 120, 2);
  const lw = logoW(ctx, 'horizontal', 300, 64);
  return doc(ctx, w, h, `<div class="a" style="inset:0;background:${rev.ground}"></div>
<p class="a bd" style="left:${M}px;top:${M}px;font-size:${t.s}px;line-height:${Math.round(t.s * 1.02)}px;color:${rev.name}">${lns(t.L)}</p>
<div class="a" style="left:${M}px;top:${r1(h - M - logoH(ctx, 'horizontal', lw))}px;width:${r1(lw)}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', label: 'Logo' })}</div>
<p class="a bn nw" style="right:${M}px;bottom:${M}px;font:500 26px/32px var(--body);color:${rev.name}">${A(B.applications.site.url)}</p>`);
}

// ---- the letterhead and its envelope: the letter is the theme's own (scenes.js); the envelope carries the logo and the address line ----
export function letterArts(ctx, envAspect) {
  const L = ctx.roles.light, B = ctx.brand, w = 880, h = Math.round(w / envAspect), lw = logoW(ctx, 'horizontal', 220, 48);
  return {
    letterhead: sceneDoc(ctx, sceneArts.letter(ctx)),
    envelope: doc(ctx, w, h, `<div class="a" style="inset:0;background:${L.surface}"></div>
<div class="a" style="left:56px;top:48px;width:${r1(lw)}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'colour', label: 'Logo' })}</div>
<p class="a bn nw" style="left:56px;bottom:48px;font:400 20px/28px var(--body);color:${L.quiet}">${A(B.applications.site.url)}</p>`),
  };
}
// the brand's own size for a piece, parsed from its own string ("..., 3400 x 1000 mm: ..."), or null
// a courier brand's pieces are photographed on its own streets: the letter on the library's clipboard (no bench), the post on the phone at the crossing,
// the hoarding in the scene that fits its own sign (the underpass billboard for a 2300 x 1000 face). A bench or a kitchen never stands for it.
export function clipLetter(ctx) { const a = sceneArts.letter(ctx); return sceneDoc(ctx, a, { top: CLIP, h: a.h - CLIP }); }
export const courierSign = (ctx) => hoardingScene(ctx);
export const mmOf = (s) => { const m = /(\d+)\s*[x×]\s*(\d+)\s*mm/.exec(s || ''); return m ? [+m[1], +m[2]] : null; };
