// Theme 33, Flyleaf: the mockup warp (mockups-must-be-realistic). It places real page art inside a measured print or screen area of a photograph:
//   1. a CSS matrix3d computed from the four measured corners (a square-to-quad homography, Heckbert), the art drawn at the area's own aspect;
//   2. the art is clipped to the quad (paper: inset by 0.4 px so nothing crosses the edge; glass: the clip and the art run 6 photo px past the edge and the light layer
//      blacks the bezel, the rounded corners and the notch);
//   3. the photo's own light is laid on top: light-<photo>-<area>.jpg with multiply (the stock's tone, shading and fibre), and for glass glare-<photo>-<area>.jpg with screen.
// The layers come from 02_harness/make_light_layers.py and cover the area's bounding box plus 16 photo px; the numbers below are the same as in that script.
// Quads are from 06_flyleaf/07_images/quads.json (corners tl, tr, br, bl in photo px). The book is the measured quad inset from its spine and page edge, as the script does.
import { frameOf, layerUri, PHOTOS } from './photos.js';

export const QUADS = {
  'IMG-05': {
    book: [[296, 504], [484, 503], [485, 848], [301, 848]],
    bookmark: [[570.8, 475.0], [661.0, 475.0], [661.0, 856.0], [572.7, 856.0]],
    sheet: [[778.2, 44.0], [1383.3, 44.1], [1384.4, 894.5], [780.6, 895.8]],
  },
  'IMG-06': { screen: [[479.5, 201.0], [1190.2, 201.0], [1186.7, 635.0], [480.2, 634.2]] },
  'IMG-07': {
    sheet: [[228.0, 91.0], [863.2, 91.0], [865.5, 989.0], [228.0, 989.0]],
    'card-a': [[955.0, 379.7], [1223.0, 377.3], [1223.0, 556.0], [955.0, 556.0]],
    'card-b': [[955.0, 601.7], [1223.0, 599.7], [1223.0, 777.9], [955.0, 778.2]],
  },
  'IMG-09': { screen: [[445.0, 71.3], [938.2, 207.1], [766.2, 1271.1], [273.8, 1196.8]] },
};
// the warp quad where a zoom check at 3x found the measured corner short of the real edge (IMG-09: the screen's right edge, read from the photo's bright pixels, runs from
// (943.4, 207) to (766.6, 1271)); the light layers keep the measured box
const FIT = { 'IMG-09/screen': [[445.0, 71.3], [943.4, 207.1], [766.6, 1271.1], [273.8, 1196.8]] };
const PHOTO_OF ={ 'IMG-05': 'flatlay', 'IMG-06': 'laptop', 'IMG-07': 'stationery', 'IMG-09': 'phone' };
const PAD = 16, OVER = 6;
const f5 = (n) => Math.round(n * 1e5) / 1e5;

// the square (0,0) (1,0) (1,1) (0,1) to the quad p0..p3 as a, b, c, d, e, f, g, h
export function homography(p) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = p;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2, sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return { a: x1 - x0 + g * x1, b: x3 - x0 + h * x3, c: x0, d: y1 - y0 + g * y1, e: y3 - y0 + h * y3, f: y0, g, h };
}
// the matrix3d that draws an element of aw x ah (origin 0 0) onto the quad
export function matrix3d(p, aw, ah) {
  const H = homography(p);
  const v = [H.a / aw, H.d / aw, 0, H.g / aw, H.b / ah, H.e / ah, 0, H.h / ah, 0, 0, 1, 0, H.c, H.f, 0, 1];
  return `matrix3d(${v.map(f5).join(',')})`;
}
// the quad moved out (d > 0) or in (d < 0) by d px on every edge
export function offsetQuad(p, d) {
  const lines = p.map((a, i) => {
    const b = p[(i + 1) % 4], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    return { p: [a[0] + (dy / len) * d, a[1] - (dx / len) * d], d: [dx, dy] }; // outward normal of a clockwise quad (y down) is (dy, -dx)
  });
  return p.map((_, i) => {
    const A = lines[(i + 3) % 4], B = lines[i], det = A.d[0] * B.d[1] - A.d[1] * B.d[0];
    const t = ((B.p[0] - A.p[0]) * B.d[1] - (B.p[1] - A.p[1]) * B.d[0]) / det;
    return [A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t];
  });
}
const poly = (q) => `polygon(${q.map(([x, y]) => `${f5(x)}px ${f5(y)}px`).join(',')})`;

// where an area's quad lands on the page: the frame is the photograph's box on the page (left, top, w, h, fx, fy, zoom)
export function areaOnPage(ctx, id, area, frame) {
  const fr = frameOf(ctx, PHOTO_OF[id] ? PHOTO_OF[id] : id, frame);
  return { fr, quad: (FIT[`${id}/${area}`] || QUADS[id][area]).map(([x, y]) => [frame.left + fr.ox + x * fr.s, frame.top + fr.oy + y * fr.s]) };
}

// The warped art for one area, as one absolute wrapper over the page (the caller draws the photograph first).
// art: { html, w, h } at the size it is drawn at (draw it at the area's real aspect and at least as large as it lands).
export function warp(ctx, id, area, frame, art, { glass = false } = {}) {
  const { fr, quad } = areaOnPage(ctx, id, area, frame);
  const q = glass ? offsetQuad(quad, OVER * fr.s) : offsetQuad(quad, 0.6), clip = glass ? q : offsetQuad(quad, -0.4);
  const pts = QUADS[id][area], xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), [iw, ih] = PHOTOS[PHOTO_OF[id]].slice(1);
  const x0 = Math.floor(Math.max(0, Math.min(...xs) - PAD)), y0 = Math.floor(Math.max(0, Math.min(...ys) - PAD));
  const x1 = Math.floor(Math.min(iw, Math.max(...xs) + PAD + 1)), y1 = Math.floor(Math.min(ih, Math.max(...ys) + PAD + 1));
  const box = `left:${f5(frame.left + fr.ox + x0 * fr.s)}px;top:${f5(frame.top + fr.oy + y0 * fr.s)}px;width:${f5((x1 - x0) * fr.s)}px;height:${f5((y1 - y0) * fr.s)}px`;
  const layer = (file, mode) => `<div style="position:absolute;${box};background:url(${layerUri(file)}) 0 0/100% 100% no-repeat;mix-blend-mode:${mode}"></div>`;
  return `<div class="a" data-warp="${id}-${area}" style="left:0;top:0;width:${ctx.size.w}px;height:${ctx.size.h}px;clip-path:${poly(clip)};isolation:isolate;pointer-events:none">`
    + `<div style="position:absolute;left:0;top:0;width:${art.w}px;height:${art.h}px;transform-origin:0 0;transform:${matrix3d(q, art.w, art.h)};overflow:hidden">${art.html}</div>`
    + layer(`light-${id}-${area}.jpg`, 'multiply') + (glass ? layer(`glare-${id}-${area}.jpg`, 'screen') : '') + '</div>';
}

// the art flat: scaled to w across (its height follows), at x, y
export function flat(art, x, y, w, style = '') {
  const k = w / art.w, h = art.h * k;
  return { h, html: `<div class="a" style="left:${f5(x)}px;top:${f5(y)}px;width:${f5(w)}px;height:${f5(h)}px;overflow:hidden;${style}"><div style="width:${art.w}px;height:${art.h}px;transform:scale(${f5(k)});transform-origin:0 0">${art.html}</div></div>` };
}
