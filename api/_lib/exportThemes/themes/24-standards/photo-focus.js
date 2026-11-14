// Theme 24, Standards: where each sample photograph's subject sits, so a crop keeps every rider whole (12 Nov fix round).
// ctx.photo() centres a crop by default, which cut riders at the frame edge. Here each photo lists the boxes that must stay whole
// (x0, y0, x1, y1 as fractions of the image), best first: both riders, then the orange-jacket rider alone when the frame is too
// narrow for both. `lean` is the share of the spare room put before the box (0.5 centres it; a low value pushes the frame's
// left edge close to the box so a neighbour does not leak in). A brand may also give a shot a `focus` ("x% y%"), which wins.
// Nothing here prints; it only returns an object-position or a crop.
import { signScene } from './scene-pick.js';
import { signArt } from './lane-bk-art.js';
const SUBJECTS = {
  riders: { ar: 2319 / 1466, boxes: [{ x0: 0.485, y0: 0.24, x1: 0.865, y1: 0.93, lean: 0.5 }, { x0: 0.605, y0: 0.24, x1: 0.875, y1: 0.93, lean: 0.08 }] },
  evening: { ar: 1.5, boxes: [{ x0: 0.1, y0: 0.33, x1: 0.3, y1: 0.9, lean: 0.5 }] },
  busstop: { ar: 1.5, pos: '74% 52%' },
};
const key = (s) => ((s && s.photo) || '').split('/').pop().replace(/\.\w+$/, '');
const clamp = (v) => Math.min(1, Math.max(0, v));

// the crop a frame of w x h shows of the shot: { px, py } (object-position, 0 to 1), { vx, vy } (the share of the image shown),
// and `whole` (whether the chosen box is whole in it)
export function cropOf(s, w, h) {
  const S = SUBJECTS[key(s)];
  if (!S || !S.boxes) return null;
  const fr = w / h, vx = fr >= S.ar ? 1 : fr / S.ar, vy = fr >= S.ar ? S.ar / fr : 1;
  let pick = null;
  for (const b of S.boxes) if (b.x1 - b.x0 <= vx * 0.98 && b.y1 - b.y0 <= vy * 0.98) { pick = b; break; }
  const b = pick || S.boxes[S.boxes.length - 1];
  const place = (lo, hi, v, lean) => { if (v >= 1) return { p: 0.5, left: 0 }; const left = Math.min(1 - v, Math.max(0, lo - (v - (hi - lo)) * lean)); return { p: clamp(left / (1 - v)), left }; };
  const X = place(b.x0, b.x1, vx, b.lean), Y = place(b.y0, b.y1, vy, 0.5);
  return { px: X.p, py: Y.p, vx, vy, left: X.left, top: Y.left, whole: !!pick, box: b };
}

// an object-position for a frame of w x h
export function photoPos(s, w, h) {
  if (s && s.focus) return s.focus;
  const S = SUBJECTS[key(s)];
  if (S && S.pos) return S.pos;
  const c = cropOf(s, w, h);
  return c ? `${(c.px * 100).toFixed(1)}% ${(c.py * 100).toFixed(1)}%` : '50% 50%';
}

// ctx.photo() with the crop set from the subject, for a frame of w x h
export const framed = (ctx, id, w, h, o = {}) => ctx.photo(id, { ...o, pos: photoPos(ctx.shot(id), w, h) });

// ---- a quiet part of a photograph, for a logo laid on it ("never on a busy part of the image"). The region is the empty road, with
// no rider, tram or sign in it, cropped to fill a frame of w x h ----
const QUIET = { riders: { x0: 0.02, x1: 0.47, y0: 0.6, y1: 0.78 }, evening: { x0: 0.5, x1: 1, y0: 0.56, y1: 0.8 } };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function quietImg(ctx, s, w, h) {
  const S = SUBJECTS[key(s)], q = QUIET[key(s)];
  if (!s || !s.photo || !S || !q) return ctx.photo(s.id, { slotNote: false });
  const iw = Math.max(w / (q.x1 - q.x0), (h * S.ar) / (q.y1 - q.y0)), ih = iw / S.ar;
  const left = Math.min(0, Math.max(w - iw, w / 2 - ((q.x0 + q.x1) / 2) * iw)), top = Math.min(0, Math.max(h - ih, h / 2 - ((q.y0 + q.y1) / 2) * ih));
  const f = (v) => Math.round(v * 100) / 100;
  return `<svg role="img" aria-label="${esc(s.alt)}" style="position:absolute;display:block;max-width:none;width:${f(iw)}px;height:${f(ih)}px;left:${f(left)}px;top:${f(top)}px"><image href="${esc(ctx.photoUrl(s.photo))}" width="100%" height="100%" preserveAspectRatio="none"/></svg>`;
}

// ---- a shot's frame on a page. A shot with a photo is cropped round its riders. A shot with none is filled from the scene photos the brand
// already has (the sign on its own board, for a shot of that sign or for the lead frame); a shot nothing covers becomes a "To shoot" tile that
// carries the brief, never an empty dashed box. `compact` (a thumbnail) prints the label only: its row already carries the brief. ----
const SIGN_SHOT = /^(wharf|sign|board)/i;
// The sign scene stands in only for the shot whose brief is the sign itself, and only on a page's lead frame (`lead`), so it appears once
// per page and only under a caption that names it (see leadShot). Every other shot is a "To shoot" tile with its own brief.
export const leadShot = (ctx) => { const sh = ctx.brand.imagery.shots; return sh[0].photo ? sh[0] : sh.find((x) => SIGN_SHOT.test(x.id)) || sh[0]; };
// the caption of a lead frame that has no photo of its own, naming the sign scene and the row of the shot list that holds its brief
export const leadCaption = (ctx, s) => s.caption || `The sign in place, standing in until this shot is taken. Its brief is the ${ctx.cap(s.id)} row of the shot list.`;
export function shotHtml(ctx, s, { lead = false, compact = false, w = 3, h = 2, style = 'width:100%;height:100%' } = {}) {
  if (s.photo) return ctx.photo(s.id, { style: `${style};object-fit:cover`, pos: photoPos(s, w, h), slotNote: false });
  if (lead && SIGN_SHOT.test(s.id)) {
    const scene = (ctx.brand.applications.scenes && ctx.brand.applications.scenes.signage) || signScene(ctx);
    const url = (ctx._shotScene = ctx._shotScene || ctx.mockup(scene, [signArt(ctx, 800, scene)])), sc = ctx.sceneInfo(scene), q = sc.quads[0].corners;
    const cx = (Math.min(...q.map((c) => c[0])) + Math.max(...q.map((c) => c[0]))) / 2, cy = (Math.min(...q.map((c) => c[1])) + Math.max(...q.map((c) => c[1]))) / 2;
    return `<svg role="img" aria-label="${esc(`${ctx.brand.name} sign in place, a stand-in until this shot is taken`)}" style="${style};object-fit:cover;object-position:${(cx / sc.w * 100).toFixed(1)}% ${(cy / sc.h * 100).toFixed(1)}%;display:block"><image href="${esc(url)}" width="100%" height="100%" preserveAspectRatio="none"/></svg>`;
  }
  return `<div class="to-shoot" role="img" aria-label="${esc('To shoot. ' + s.slot)}" style="${style}"><b>To shoot</b>${compact ? '' : `<span>${esc(s.slot)}</span>`}</div>`;
}
