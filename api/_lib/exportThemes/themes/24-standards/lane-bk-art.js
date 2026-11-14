// Theme 24, Standards, lane bk: the pieces the applications sheet draws and then shows made. One markup per piece serves both the small
// dimensioned drawing in the book and the flat art a scene's surface carries, so the drawing and the photograph are the same object.
// Scenes are the ones the library map gives theme 24: the wharf board (its anchor) for signage, the crossing phone for digital.
import { A, f2, roles, wrap, colourwayFor } from './helpers.js';
import { dfont, dispStyle, cwOn, fitSize } from './lane-bk-kit.js';
import { signScene, signLine, sceneClearX } from './scene-pick.js';

export const SCENES = { phone: 'kerb-crossing-phone' };

// the logo inside a piece: the real logo, or in the slot edition a dashed frame of the same size with no words (a drawing is too small to label)
function pieceLogo(ctx, id, hex, w, ink) {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  if (ctx.edition === 'slot') return `<span style="display:block;width:${f2(w)}px;height:${f2(h)}px;box-sizing:border-box;border:${Math.max(1, f2(w / 160))}px dashed ${ink}"></span>`;
  return ctx.logo.svg(id, { colourway: hex ? cwOn(ctx, hex) : colourwayFor(ctx, roles(ctx).ground), width: f2(w) });
}

// ---- the sign (spec 3.5, the frame): the field, the brand's line top-left at a fifteenth of the width in, the logo a third of the width at
// the foot. The size is the largest of 0.12, 0.10, 0.08 of the height that sets the line in two lines; the line itself is printed whole. ----
export function signFace(ctx, w, h) {
  const R = roles(ctx), B = ctx.brand, font = dfont(ctx), inset = w / 15, room = w - 2 * inset;
  let size = 0.08 * h;
  for (const k of [0.12, 0.10, 0.08]) { const l = wrap(font, signLine(ctx), k * h, room); if (l.length <= 2) { size = k * h; break; } }
  const lw = w / 3;
  return `<div class="sd-sign" style="position:relative;width:${f2(w)}px;height:${f2(h)}px;overflow:hidden;background:${R.field};color:${R.fieldInk}">`
    + `<p style="position:absolute;left:${f2(inset)}px;top:${f2(inset)}px;width:${f2(room)}px;margin:0;${dispStyle(ctx)};font-size:${f2(size)}px;line-height:${f2(size * 1.02)}px;letter-spacing:-0.01em">${A(signLine(ctx))}</p>`
    + `<div style="position:absolute;left:${f2(inset)}px;bottom:${f2(inset)}px;width:${f2(lw)}px;line-height:0">${pieceLogo(ctx, 'colour', R.field, lw, R.fieldInk)}</div></div>`;
}
export function signArt(ctx, w = 800, scene = signScene(ctx)) {
  const q = ctx.sceneInfo(scene).quads[0], h = Math.round(w / q.aspect);
  return { w, h, html: ctx.artPage(signFace(ctx, w, h), { w, h }) };
}
// the brand's own sign size when the brand gives one at the board's shape (within 5%), else null
export function signMm(ctx) {
  const q = ctx.sceneInfo(signScene(ctx)).quads[0], m = /(\d+)\s*[x×]\s*(\d+)\s*mm/.exec(ctx.brand.applications.signage || '');
  return m && Math.abs(m[1] / m[2] / q.aspect - 1) < 0.05 ? [+m[1], +m[2]] : null;
}

// ---- the phone screen, copied from guidelines.js (phone): the product as the UI kit builds it, 390 px wide ----
export function phone(ctx, h = 844, lift = 0) {
  const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui;
  return `<div class="ui ph" style="height:${h}px"><div class="ph-top"><span>${ctx.logo.html('horizontal', { width: 112, label: 'Logo' })}</span><span class="ph-time">${A(S.time)}</span></div>`
    + `<div class="ph-ans"><div class="ph-line">${ui.statusChip(S.deliveries[0].status, { label: S.status })}<span class="ph-ft">${A(S.from)} to ${A(S.to)}</span></div><p class="ui-display ph-eta">${A(S.eta)}</p><p class="ph-note">${A(S.pickup)}</p></div>`
    + `${ui.deliveryRows(5)}<div class="ph-btn"${lift ? ` style="bottom:${lift}px"` : ''}>${ui.btn(S.form.book, { block: true })}</div></div>`;
}
// the screen as photographed: a 24 px status row above the app so the logo clears the glass's rounded corner, the button lifted off the bezel
export function phoneArt(ctx) {
  const bars = [4, 7, 10, 13].map((hh, i) => `<rect x="${i * 5}" y="${13 - hh}" width="3" height="${hh}" fill="currentColor"/>`).join('');
  const inner = `<div class="ui" style="position:relative;width:390px;height:844px;overflow:hidden;background:var(--surface)"><div style="display:flex;justify-content:space-between;align-items:center;height:24px;padding:0 32px;box-sizing:border-box;font-size:12px;line-height:16px;font-weight:600;color:var(--text)"><span>9:41</span>`
    + `<svg width="44" height="13" viewBox="0 0 44 13" aria-hidden="true"><g>${bars}</g><rect x="26.5" y="1.5" width="16" height="10" rx="2.5" fill="none" stroke="currentColor"/><rect x="28" y="3" width="10" height="7" rx="1.2" fill="currentColor"/></svg></div>`
    + `<div style="position:absolute;left:0;top:24px;width:390px;height:820px;overflow:hidden">${phone(ctx, 820, 48)}</div></div>`;
  return { w: 390, h: 844, html: ctx.artPage(inner, { w: 390, h: 844 }) };
}

// ---- the business card, 90 x 55 mm, drawn at w px wide: the field with the logo; the ground with the person, the role and the contact ----
export function cardFace(ctx, side, w) {
  const R = roles(ctx), B = ctx.brand, c = B.applications.card, h = (w * 55) / 90, s = w / 270;
  if (side === 'front') {
    const lw = 156 * s;
    return `<div class="sd-card" style="width:${f2(w)}px;height:${f2(h)}px;background:${R.field};color:${R.fieldInk};padding:0 ${f2(24 * s)}px;display:flex;align-items:center">${pieceLogo(ctx, 'colour', R.field, lw, R.fieldInk)}</div>`;
  }
  const fs = (n) => `${f2(Math.max(n * s, 9))}px`;
  return `<div class="sd-card sd-card--back" style="width:${f2(w)}px;height:${f2(h)}px;background:${R.ground};color:${R.ink};padding:${f2(24 * s)}px">`
    + `<p class="sd-card__n" style="font-size:${fs(17)};line-height:1.2">${A(c.person)}</p><p style="font-size:${fs(12)};line-height:1.35">${A(c.role)}</p>`
    + `<p style="font-size:${fs(12)};line-height:1.35;margin-top:auto">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div>`;
}

// ---- a social post, square: one of the brand's lines on a field, the logo at the foot. Sizes per sheet are caps (the line prints whole). ----
export function post(ctx, text, i, sizes) {
  const R = roles(ctx), grounds = [[R.field, R.fieldInk], [R.dark, R.darkInk], [R.ground, R.ink]], [bg, ink] = grounds[i % 3], font = dfont(ctx);
  const fz = {}; for (const k of ['w', 'm', 'n']) { const w = sizes[k] - 2 * Math.round(sizes[k] * 0.08); fz[k] = fitSize(font, text, w, [40, 36, 32, 28, 24, 20, 18, 16, 14, 12, 11], 4).size; }
  const pad = (k) => Math.round(sizes[k] * 0.08);
  return `<li class="sd-post${bg === R.ground ? ' sd-post--gr' : ''}" style="background:${bg};color:${ink};--szw:${sizes.w}px;--szm:${sizes.m}px;--szn:${sizes.n}px;--pdw:${pad('w')}px;--pdm:${pad('m')}px;--pdn:${pad('n')}px;--fzw:${fz.w}px;--fzm:${fz.m}px;--fzn:${fz.n}px">`
    + `<p class="sd-post__t sd-fz" style="${dispStyle(ctx)}">${A(text)}</p><span class="sd-post__lg">${pieceLogo(ctx, 'colour', bg, 64, ink)}</span></li>`;
}

// ---- the crop of a scene in a box of aspect bw:bh, as percentages: scaled to cover, the surface filling `fill` of the box height ----
export function cropPct(ctx, sceneId, bw, bh, fill) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const qh = Math.max(...ys) - Math.min(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const sx = sceneClearX(sceneId), k = Math.max((fill * bh) / qh, bw / (sc.w * sx), bh / sc.h), cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const left = cl(bw / 2 - cx * k, bw - sc.w * k * sx, 0), top = cl(bh / 2 - cy * k, bh - sc.h * k, 0);
  return `--pw:${((sc.w * k) / bw * 100).toFixed(3)}%;--pl:${(left / bw * 100).toFixed(3)}%;--pt:${(top / bh * 100).toFixed(3)}%`;
}
