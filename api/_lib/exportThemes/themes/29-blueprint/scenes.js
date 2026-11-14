// Photo placement and the flat art for theme 29's photographed pages. Each art is drawn once as markup, then used twice: on the photographed surface
// (through ctx.mockup) and flat at scale on the elevations page. All words come from brand data; every size is parsed from the brand's own strings.
import { plateImg } from '../../engine/plate.js';
import { esc as A } from '../../engine/brand.js';
import { inkW, wrap, fitW, displayStem, baseline, inkEnd, bodyStem, nb } from './measure.js';
function jpegSize() { throw new Error('theme 29: photograph files are not read by the server export'); }

export const PX = 3.7795; // px per mm at 96 dpi
const r1 = (n) => Math.round(n * 10) / 10;
const parseMm = (s) => { const m = /(\d+)\s*[x×]\s*(\d+)\s*mm/.exec(s || ''); return m ? [+m[1], +m[2]] : null; };
const hexOf = (h) => String(h).toUpperCase();

// Place a scene's photo in a box: cover, or at a fixed scale, with the focus point (scene px) centred. Returns the markup and the maps that carry
// scene px (and the quad corners) to page px, so redlines can follow the object's own edges.
export function placePhoto(ctx, id, arts, box, { focus, scale, alignLeft = false, alt = '', shade } = {}) {
  const sc = ctx.sceneInfo(id), url = ctx.mockup(id, arts, shade ? { shade } : undefined);
  const s = scale || Math.max(box.w / sc.w, box.h / sc.h), iw = sc.w * s, ih = sc.h * s;
  const q0 = sc.quads[0].corners, f = focus || [(Math.min(...q0.map((p) => p[0])) + Math.max(...q0.map((p) => p[0]))) / 2, (Math.min(...q0.map((p) => p[1])) + Math.max(...q0.map((p) => p[1]))) / 2];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const ox = alignLeft ? box.x : iw >= box.w ? clamp(box.x + box.w / 2 - f[0] * s, box.x + box.w - iw, box.x) : box.x + (box.w - iw) / 2;
  const oy = ih >= box.h ? clamp(box.y + box.h / 2 - f[1] * s, box.y + box.h - ih, box.y) : box.y;
  const map = (p) => [ox + p[0] * s, oy + p[1] * s];
  // the engine shrinks a paper surface by 1/1.01 about its centroid, so the printed edge sits there
  const corners = (i = 0) => {
    const q = sc.quads[i], c = q.corners;
    if (q.kind !== 'paper') return c.map(map);
    const cx = c.reduce((a, p) => a + p[0], 0) / 4, cy = c.reduce((a, p) => a + p[1], 0) / 4;
    return c.map((p) => map([cx + (p[0] - cx) / 1.01, cy + (p[1] - cy) / 1.01]));
  };
  const html = `<div class="a" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;overflow:hidden">${plateImg(`${A(url)}`, `${A(alt)}`, `position:absolute;max-width:none;left:${r1(ox - box.x)}px;top:${r1(oy - box.y)}px;width:${r1(iw)}px;height:${r1(ih)}px`)}</div>`;
  return { html, corners, map, s, box: { x: box.x, y: box.y, w: Math.min(box.w, iw), h: Math.min(box.h, ih) } };
}

// ---- the arts: { inner, w, h, ground, grid: { cols, margin, label }, keys: [{ hex, x, y }] } in the art's own px ----
const lineOf = (ctx, size, lines) => lines.map((l) => A(l)).join('<br>');
function headline(ctx, text, sizes, maxW, { sentence = false } = {}) {
  const stem = displayStem(ctx);
  let size = sizes[sizes.length - 1], lines = [text];
  // with sentence on, a line that has one comma or full stop breaks there ("Your kitchen, / on the date we said."), at the largest size where both halves fit; only if none does is the greedy wrap used
  const parts = sentence ? text.split(/(?<=[.,])\s+/) : [];
  const fit = parts.length === 2 && sizes.find((s) => parts.every((t) => inkW(stem, t, s, -0.01) <= maxW));
  if (fit) return { size: fit, lines: parts, stem };
  for (const s of sizes) { lines = wrap(stem, text, s, maxW, -0.01); size = s; if (lines.length <= 2) break; }
  return { size, lines, stem };
}

// the scene's surface is 3.4 : 1; a brand whose signage line is another shape (a project brand's poster size) is drawn on the 3400 x 1000 mm hoarding instead
const hoardingMm = (ctx) => { const m = parseMm((ctx.real || String)(ctx.brand.applications.signage)); return m && Math.abs(m[0] / m[1] - 3.4) < 0.07 ? m : [3400, 1000]; };
function hoarding(ctx) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, mm = hoardingMm(ctx); 
  const W = mm[0] / 2, H = mm[1] / 2, M = 100; // 0.5 px to the millimetre
  const h = headline(ctx, B.lines.others[0], [120, 104, 88, 72, 64], Math.min(1300, W - 2 * M - 100), { sentence: true });
  const lw = fitW(ctx, 'horizontal', 400, 80), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  const urlTop = H - 70 - 36;
  const inner = `<div class="a" style="inset:0;background:${rev.ground}"></div>
<p class="a bd" style="left:${M}px;top:56px;font-size:${h.size}px;line-height:${h.size}px;color:${rev.name}">${lineOf(ctx, h.size, h.lines)}</p>
<div class="a" style="left:${M}px;top:${H - 70 - lh}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', label: 'Your logo goes here' })}</div>
<p class="a bn nw" style="right:${M}px;top:${urlTop}px;font-weight:500;font-size:32px;line-height:36px;color:${rev.name}">${A(B.applications.site.url)}</p>`;
  // key dots sit on plain ground, 12 page px clear of the glyph they point at (after: true), at the middle of the x-height
  const hy = 56 + baseline(h.stem, h.size, h.size) - h.size * 0.26, uy = urlTop + baseline(bodyStem(ctx, 500), 32, 36) - 32 * 0.26;
  return { inner, w: W, h: H, mm, ground: rev.ground, grid: { cols: 12, margin: M, label: `12 col, [${M * 2}] mm margin` },
    keys: [{ hex: rev.ground, x: W - 120, y: 240 }, { hex: rev.name, x: M + inkEnd(h.stem, h.lines[0], h.size, -0.01), y: hy, after: true }, { hex: rev.name, x: W - M, y: uy, after: true }] };
}

function doorSign(ctx) {
  const B = ctx.brand, L = ctx.roles.light, mm = parseMm((ctx.real || String)(B.applications.vehicle));
  const W = mm[0], H = mm[1], M = 48; // 1 px to the millimetre
  const h = headline(ctx, B.lines.primary, [56, 48, 40], 540, { sentence: true });
  const lw = fitW(ctx, 'horizontal', 340, 72);
  // a magnet sheet, not a printed rectangle: 8 px corners (about 4 px on the photograph), a 2 px light lip along the top edge and a faint dark edge all round
  const inner = `<div class="a" style="inset:0;background:${L.raised};border-radius:8px;box-shadow:inset 0 2px 0 rgba(255,255,255,.6),inset 0 0 0 1px rgba(26,26,26,.14)"></div>
<div class="a" style="left:${M}px;top:${M}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div>
<p class="a bd" style="left:${M}px;top:150px;font-size:${h.size}px;line-height:${h.size}px">${lineOf(ctx, h.size, h.lines)}</p>
<p class="a bn nw" style="left:${M}px;top:${H - M - 28}px;font-weight:500;font-size:24px;line-height:28px;color:var(--b-quiet)">${A(B.applications.site.url)}</p>`;
  const hy = 150 + baseline(h.stem, h.size, h.size) - h.size * 0.26;
  return { inner, w: W, h: H, mm, ground: L.raised, grid: { cols: 6, margin: M, label: `6 col, [${M}] mm margin` },
    keys: [{ hex: L.raised, x: W - 90, y: 90 }, { hex: L.text, x: M + inkEnd(h.stem, h.lines[0], h.size, -0.01), y: hy, after: true }] };
}

function balanced(stem, text, size, maxW) {
  const n = wrap(stem, text, size, maxW, 0).length; let w = maxW;
  while (w > maxW * 0.7 && wrap(stem, text, size, w - 6, 0).length === n) w -= 6;
  return wrap(stem, text, size, w, 0);
}
// An A4 letter in the brand's voice. The top CLIP px sit under the clipboard's jaw in the photograph, so the photo art is the sheet with that strip cut off.
export const CLIP = 68;
function letter(ctx) {
  const B = ctx.brand, L = ctx.roles.light, S = B.ui.screen.content, E = B.guideB.email, who = B.applications.email || {}, M = 72, TW = 650;
  const d = new Date(B.version.date + 'T00:00:00Z');
  const date = `${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  // type sized for the clipboard photograph, where the sheet is shown at about 0.44: 26 px body is 11.5 px on the page, and every line is set by hand so the stack below it is exact
  const b4 = bodyStem(ctx, 400), sub = headline(ctx, E.subject, [44], TW);
  const BS = 26, body = balanced(b4, nb(E.body[1]), BS, TW - 8);
  // the price is printed once, in the band; what the brand says about it ("held until 1 December") goes under its label
  const ex = B.voice.principles.map((p) => p.example), priced = ex.find((t) => t.includes(S.paid));
  const held = priced ? priced.slice(priced.indexOf(S.paid) + S.paid.length).replace(/^[,;]\s*/, '').replace(/\.$/, '') : '';
  const note = held ? held[0].toUpperCase() + held.slice(1) : '';
  // the details the letter is about: where, and any "Label: value" line the voice gives; a brand with none gets the rider and the time from its own track screen
  const rows = [[S.deliverToLabel, S.deliverTo], ...ex.filter((t) => !t.includes(S.paid)).map((t) => /^([^:.]{2,24}): (.+?)\.?$/.exec(t)).filter(Boolean).map((m) => [m[1], m[2]])];
  if (rows.length < 3) { const t = /^(.*?)\s+(\d{1,2}:\d{2})$/.exec(S.eta); rows.push(['Rider', S.rider]); if (t) rows.push([t[1], t[2]]); }
  const RH = 52, BH = 104, signTop = 936;
  const subTop = 290, bodyTop = subTop + sub.lines.length * 48 + 28, bodyEnd = bodyTop + body.length * 36;
  // spare height between the body and the sign-off is shared before the table and before the price band
  const need = 36 + rows.length * RH + 36 + BH, spare = Math.max(0, signTop - bodyEnd - need - 36), gap = Math.min(30, spare / 2);
  const rowsTop = Math.round(bodyEnd + 36 + gap), ruleTop = Math.round(rowsTop + rows.length * RH + 36 + gap);
  const lns = (a) => a.map((l) => A(l)).join('<br>');
  const tbl = rows.map(([k, v], i) => `<div class="a" style="left:${M}px;top:${rowsTop + i * RH}px;width:${TW}px;height:${RH}px;border-top:1px solid ${L.divider}${i === rows.length - 1 ? `;border-bottom:1px solid ${L.divider}` : ''}"></div>
<p class="a bn nw" style="left:${M}px;top:${rowsTop + i * RH + 8}px;font:400 22px/36px var(--body);color:var(--b-quiet)">${A(k)}</p><p class="a bn nw" style="left:${M + (ctx.placeholders ? 340 : 200)}px;top:${rowsTop + i * RH + 8}px;font:400 ${BS}px/36px var(--body);color:var(--b-text)">${A(v)}</p>`).join('\n');
  const inner = `<div class="a" style="inset:0;background:${L.surface}"></div>
<div class="a" style="left:${M}px;top:120px;width:220px">${ctx.logo.html('horizontal', { width: 220, colourway: 'colour', label: 'Your logo goes here' })}</div>
<p class="a bn nw" style="right:${794 - 722}px;top:126px;font:400 20px/28px var(--body);color:var(--b-quiet)">${A(date)}</p>
<p class="a bn nw" style="left:${M}px;top:232px;font:500 26px/32px var(--body);color:var(--b-text)">${A(E.to)}</p>
<p class="a bd" style="left:${M}px;top:${subTop}px;font-size:44px;line-height:48px">${lns(sub.lines)}</p>
<p class="a bn nw" style="left:${M}px;top:${bodyTop}px;font:400 ${BS}px/36px var(--body);color:var(--b-text)">${lns(body)}</p>
${tbl}
<div class="a" style="left:${M}px;top:${ruleTop}px;width:${TW}px;height:${BH}px;border-top:1px solid ${L.divider};border-bottom:1px solid ${L.divider}"></div>
<p class="a bn nw" style="left:${M}px;top:${ruleTop + (note ? 16 : 36)}px;font:500 ${BS}px/32px var(--body);color:var(--b-text)">${A(S.paidLabel)}</p>${note ? `
<p class="a bn nw" style="left:${M}px;top:${ruleTop + 52}px;font:400 22px/32px var(--body);color:var(--b-quiet)">${A(note)}</p>` : ''}
<p class="a bd" style="right:${794 - 722}px;top:${ruleTop + 22}px;font-size:56px;line-height:60px">${A(S.paid)}</p>
<p class="a bn nw" style="left:${M}px;top:${signTop}px;font:500 26px/34px var(--body);color:var(--b-text)">${A(who.person || '')}</p>
<p class="a bn nw" style="left:${M}px;top:${signTop + 34}px;font:400 22px/30px var(--body);color:var(--b-quiet)">${A(who.role || '')}</p>
<p class="a bn nw" style="left:${M}px;top:1040px;font:400 18px/26px var(--body);color:var(--b-quiet)">${A(B.voice.boilerplate25.split(/(?<=\.)\s/)[0])}</p>
<p class="a bn nw" style="right:${794 - 722}px;top:1040px;font:400 18px/26px var(--body);color:var(--b-quiet)">${A(B.applications.site.url)}</p>`;
  const py = ruleTop + 22 + baseline(displayStem(ctx), 56, 60) - 56 * 0.35;
  return { inner, w: 794, h: 1123, mm: [210, 297], ground: L.surface, grid: { cols: 12, margin: M, label: '12 col, [19] mm margin' },
    keys: [{ hex: L.surface, x: 690, y: 992 }, { hex: L.text, x: 722, y: py, after: true }] };
}

// The app's own track screen, drawn flat from the brand's tokens, for a brand with no vehicle. 1440 x 900 matches the laptop screen's shape (bench-laptop-shoulder, 1.6 : 1).
function trackScreen(ctx) {
  const B = ctx.brand, L = ctx.roles.light, S = B.ui.screen.content, W = 1440, H = 900, r = (ctx.radii[1] && ctx.radii[1].px) || 8;
  const lw = fitW(ctx, 'horizontal', 190, 40), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  const eta = headline(ctx, S.eta, [72], 480);
  const inner = `<div class="a" style="inset:0;background:${L.raised}"></div>
<div class="a" style="left:0;top:0;width:${W}px;height:72px;background:${L.surface};border-bottom:1px solid ${L.divider}"></div>
<div class="a" style="left:64px;top:${36 - lh / 2}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'colour', label: 'Logo' })}</div>
<p class="a bn nw" style="right:64px;top:24px;font:500 18px/24px var(--body);color:var(--b-quiet);font-variant-numeric:tabular-nums">${A(S.time)}</p>
<div class="a" style="left:64px;top:120px;width:560px;height:660px;background:${L.surface};border:1px solid ${L.divider};border-radius:${r}px"></div>
<span class="a bn nw" style="left:104px;top:160px;padding:6px 16px;background:${L.action};color:${L.actionLabel};font:500 18px/24px var(--body);border-radius:${Math.min(r, 12)}px">${A(S.status)}</span>
<p class="a bd" style="left:104px;top:232px;width:480px;font-size:72px;line-height:72px;white-space:normal">${A(S.eta)}</p>
<p class="a bn" style="left:104px;top:${232 + eta.lines.length * 72 + 24}px;width:480px;font:400 20px/30px var(--body);color:var(--b-quiet)">${A(S.pickup)}</p>
<div class="a" style="left:104px;top:520px;width:480px;height:8px;background:${L.divider};border-radius:4px"></div>
<div class="a" style="left:104px;top:520px;width:${Math.round(480 * S.progress)}px;height:8px;background:${L.action};border-radius:4px"></div>
<p class="a bn nw" style="left:104px;top:540px;font:400 16px/24px var(--body);color:var(--b-quiet)">${A(S.from)}</p>
<p class="a bn nw" style="right:${1440 - 584}px;top:540px;font:400 16px/24px var(--body);color:var(--b-quiet)">${A(S.to)}</p>
<span class="a bn" style="left:104px;top:612px;width:56px;height:56px;border-radius:28px;background:${L.text};color:${L.surface};font:500 18px/56px var(--body);text-align:center">${A(S.initials)}</span>
<p class="a bn nw" style="left:176px;top:616px;font:500 20px/28px var(--body);color:var(--b-text)">${A(S.rider)}</p>
<p class="a bn nw" style="left:176px;top:644px;font:400 16px/24px var(--body);color:var(--b-quiet)">${A(S.riderNote)}</p>
<p class="a bn nw" style="left:104px;top:712px;font:500 16px/24px var(--body);color:var(--b-quiet)">${A(S.paidLabel)}</p>
<p class="a bd" style="right:${1440 - 584}px;top:704px;font-size:32px;line-height:36px">${A(S.paid)}</p>
<div class="a" style="left:664px;top:120px;width:712px;height:660px;background:${L.sunken};border-radius:${r}px;overflow:hidden"><svg width="712" height="660" viewBox="0 0 712 660" fill="none" aria-hidden="true">
<g stroke="${L.surface}" stroke-width="18"><path d="M0 150H712M0 360H712M0 540H712M150 0V660M380 0V660M560 0V660"/></g>
<path d="M150 540V360H380V150H560" stroke="${L.action}" stroke-width="8" stroke-linejoin="round"/><circle cx="150" cy="540" r="12" fill="${L.text}"/><circle cx="560" cy="150" r="12" fill="${L.action}"/></svg></div>`;
  return { inner, w: W, h: H, mm: [W, H], unit: 'px', ground: L.raised, grid: { cols: 12, margin: 64, label: '12 col, [64] px margin' },
    keys: [{ hex: L.raised, x: 1400, y: 810 }, { hex: L.action, x: 1044, y: 375 }] }; // the second key sits on the route line in the map, a plain patch of the action colour
}

// The fascia board over a shopfront, for the cover: the reversed ground, the horizontal logo on the left and the primary line on the right, one line.
// 1720 x 250 matches the surface (6.88 : 1).
function fascia(ctx) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, W = 1720, H = 250, M = 80, stem = displayStem(ctx);
  const lw = fitW(ctx, 'horizontal', 520, 110), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  const line = B.lines.primary, room = W - 2 * M - lw - 120;
  const size = [72, 64, 56, 48, 40].find((s) => inkW(stem, line, s, -0.01) <= room) || 40;
  const inner = `<div class="a" style="inset:0;background:${rev.ground}"></div>
<div class="a" style="left:${M}px;top:${r1((H - lh) / 2)}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', label: 'Your logo goes here' })}</div>
<p class="a bd" style="right:${M}px;top:${r1((H - size) / 2)}px;font-size:${size}px;line-height:${size}px;color:${rev.name}">${A(line)}</p>`;
  return { inner, w: W, h: H, mm: [W, H], ground: rev.ground, grid: { cols: 12, margin: M, label: '' }, keys: [] };
}

// each art sets its own text colour from its ground, so a slot placeholder inside it stays legible
const ink = (a) => ({ ...a, inner: `<div class="a" style="inset:0;color:${a.text}">${a.inner}</div>` });
export const arts = {
  hoarding: (ctx) => ink({ ...hoarding(ctx), text: ctx.brand.logo.colourways.reversed.name }),
  doorSign: (ctx) => ink({ ...doorSign(ctx), text: ctx.roles.light.text }),
  letter: (ctx) => ink({ ...letter(ctx), text: ctx.roles.light.text }),
  trackScreen: (ctx) => ink({ ...trackScreen(ctx), text: ctx.roles.light.text }),
  fascia: (ctx) => ink({ ...fascia(ctx), text: ctx.brand.logo.colourways.reversed.name }),
};
// the doc the engine draws onto a surface; art w and h are CSS px, and the engine checks their shape against the surface
export const artDoc = (ctx, a, { top = 0, h } = {}) => {
  const hh = h || a.h;
  const html = top ? `<div class="a" style="left:0;top:${-top}px;width:${a.w}px;height:${a.h}px">${a.inner}</div>` : a.inner;
  return { html: ctx.artPage(html, { w: a.w, h: hh }), w: a.w, h: hh };
};
export { hexOf };

export function hoardingScene(ctx) {
  return isCourier(ctx)
    ? { id: 'billboard-underpass', surface: 'billboard', where: 'on an underpass wall', alt: `${ctx.brand.name}'s city hoarding on an underpass wall` }
    : { id: 'kerb-hoarding-footpath', surface: 'hoarding', where: 'on a plywood hoarding beside a footpath', alt: `${ctx.brand.name}'s site hoarding on a plywood hoarding beside a footpath` };
}

// a courier brand (the signage line opens "City ...", read from the real words in the slot edition: the layout follows the brand, not its placeholder) shows street scenes; the swap test keeps a shopfront, a kitchen bench or a joiner's bench off it
export const isCourier = (ctx) => /^city/i.test((ctx.real || String)(ctx.brand.applications.signage));

// the brand's own photograph filling a box, slid to the shot's `focus` (brand.json, fractions of the picture) so a rider is never cut at the frame
// edge. null when the brand has no photograph (or the slot edition), so the caller falls back to a scene.
export function photoFill(ctx, shot, box) {
  if (!shot || !shot.photo || ctx.edition === 'slot') return null;
  const n = jpegSize();
  if (!n) return null;
  const f = Array.isArray(shot.focus) && shot.focus.length === 2 ? shot.focus : [0.5, 0.5], k = Math.max(box.w / n.w, box.h / n.h), iw = n.w * k, ih = n.h * k;
  const slide = (full, view, fc) => Math.min(Math.max(fc * full - view / 2, 0), Math.max(0, full - view));
  const ox = iw > box.w ? slide(iw, box.w, f[0]) : 0, oy = ih > box.h ? slide(ih, box.h, f[1]) : 0;
  return `<div class="a" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px;overflow:hidden">${plateImg(`${A(ctx.photoUrl(shot.photo))}`, `${A(shot.alt)}`, `position:absolute;max-width:none;left:${r1(-ox)}px;top:${r1(-oy)}px;width:${r1(iw)}px;height:${r1(ih)}px`)}</div>`;
}
