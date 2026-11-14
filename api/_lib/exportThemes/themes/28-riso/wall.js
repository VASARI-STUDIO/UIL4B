// Posters in their scenes (theme 28): what the photograph's own light would do around and over a printed sheet, drawn over the mockup as one SVG that
// multiplies into the photo (mix-blend-mode on the svg, so a shadow is the wall darkened, a falloff is the sheet darkened, and the ring below is the
// art's own colour lit by the same photo pixel the engine's shading uses). Three parts, all vector (no filters, so the PDF stays 1:1):
//   shadow  the wall just outside the sheet, in layers of falling strength, thrown the way the scene's light falls; never over the sheet
//   rim     the engine trims a paper quad inside the real sheet (it shrinks the fitted quad by CLIP), so a ring of bare photo paper shows round the art.
//           The ring is painted in the art's own edge colours (plate colour on the plate, paper colour on the paper) and multiplied by the photo
//   falloff the scene's light falling off over the sheet: a lamp over the night wall; a soft, one-sided daylight everywhere else
import { hexToRgb } from '../../engine/color.js';

const CLIP = 1.01; // engine/mockup.js: a paper quad is clipped to its corners scaled by 1/CLIP about their centre
const N = 9;       // shadow layers
// Per scene (measured from the blank photos, engine/scenes/<id>/scene.jpg):
//   dir     where the shadow falls, scene px        spread  how far it reaches, scene px       a  its strength at the sheet's edge
//   white   the engine's white for the blank sheet (98th percentile of its luminance, 0 to 1); the ring is brightened by it, as the engine's shading is
//   rim     how far the real sheet edge is outside the scene's quad, [top, right, bottom, left], scene px
//   light   falloff layers, multiplied over the sheet: radial {at: [x, y] in sheet widths and heights, r: in sheet heights, stops: [[r, f]]} or
//           linear {from: [x, y], to: [x, y], stops: [[t, f]]}; f is the light left (1 = untouched); warm dims the blue first
const LIGHT = {
  'poster-venue-night-2': {
    dir: [0, 5], spread: 12, a: 0.55, white: 0.96, edge: [0.95, 0.78], rim: [1.4, -0.2, 0.3, 0.9], warm: 0.6,
    light: [{ type: 'radial', at: [0.49, -0.32], r: 1.4, stops: [[0, 1], [0.3, 1], [0.7, 0.88], [1.4, 0.68]] }],
  },
  'poster-wall': {
    dir: [-1.5, 4], spread: 13, a: 0.3, white: 0.945, edge: [1, 1], rim: [-10.25, -9.25, -3.25, -4.75], lift: 0.77, warm: 0.2,
    light: [{ type: 'linear', from: [1, 0], to: [0, 1], stops: [[0, 1], [1, 0.93]] }, { type: 'radial', at: [0.5, 0.5], r: 0.8, stops: [[0, 1], [0.55, 1], [1, 0.97]] }],
  },
  'sheets-gallery-wall': {
    dir: [-1, 3.5], spread: 9, a: 0.34, white: 0.925, edge: [1, 1], rim: [-2, -2, -3, -1.3], warm: 0,
    light: [{ type: 'linear', from: [1, 0], to: [0, 1], stops: [[0, 1], [1, 0.95]] }, { type: 'radial', at: [0.5, 0.5], r: 0.8, stops: [[0, 1], [0.6, 1], [1, 0.975]] }],
  },
};
const FALLBACK = { dir: [-1, 3.5], spread: 9, a: 0.34, white: 0.93, edge: [1, 1], rim: [-2, -2, -3, -1.3], warm: 0, light: LIGHT['sheets-gallery-wall'].light };

const f1 = (n) => Math.round(n * 10) / 10;
const pts = (a) => a.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' ');
const dPoly = (a) => 'M' + a.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';

// the quad with each side moved outward by off = [top, right, bottom, left] (corners tl, tr, br, bl, clockwise in y-down px)
function offsetQuad(c, off) {
  // the four sides in clockwise order (top, right, bottom, left); the outward normal of a clockwise side a to b is (dy, -dx)
  const S = [[c[0], c[1]], [c[1], c[2]], [c[2], c[3]], [c[3], c[0]]].map(([a, b], i) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    return { p: [a[0] + (dy / l) * off[i], a[1] - (dx / l) * off[i]], d: [dx, dy] };
  });
  const hit = (s, t) => { const den = s.d[0] * t.d[1] - s.d[1] * t.d[0], u = ((t.p[0] - s.p[0]) * t.d[1] - (t.p[1] - s.p[1]) * t.d[0]) / den; return [s.p[0] + s.d[0] * u, s.p[1] + s.d[1] * u]; };
  return [hit(S[3], S[0]), hit(S[0], S[1]), hit(S[1], S[2]), hit(S[2], S[3])];
}

// map: scene px -> the crop's px. P: the press (paper and plate colours). frac: where the plate ends down the sheet (0 to 1; 0 if there is no plate)
export function wallLight(scene, qi, map, P, frac = 0) {
  const L = LIGHT[scene.id] || FALLBACK, id = `wl-${scene.id}-${qi}`;
  const C = scene.quads[qi].corners, cx = C.reduce((a, p) => a + p[0], 0) / 4, cy = C.reduce((a, p) => a + p[1], 0) / 4;
  const k = Math.hypot(...[map([1, 0])[0] - map([0, 0])[0], map([1, 0])[1] - map([0, 0])[1]]);
  // where the sheet's edge is: the photo's real edge (L.rim from the quad), but never inside the art's own trimmed edge: where the art overhangs the real
  // sheet (a quad drawn a little big) the art is what the eye takes for the sheet, so that is the edge the shadow is thrown from
  const dist = [[C[0], C[1]], [C[1], C[2]], [C[2], C[3]], [C[3], C[0]]].map(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1]; return Math.abs((cx - a[0]) * dy - (cy - a[1]) * dx) / Math.hypot(dx, dy); });
  const trim = dist.map((d) => -d * (1 - 1 / CLIP)); // each side of the engine's trimmed quad, from the quad
  const real = offsetQuad(C, L.rim.map((r, i) => Math.max(r, trim[i]))).map(map);
  const inner = offsetQuad(C, L.rim.map((r, i) => Math.min(r, trim[i]))).map(map); // the real sheet where it is inside the art
  const clip = C.map((p) => map([cx + (p[0] - cx) / CLIP, cy + (p[1] - cy) / CLIP]));
  const xs = real.map((p) => p[0]), ys = real.map((p) => p[1]), bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
  const big = 4000;
  let sd = '', sb = '', rd = '', rb = '', fd = '', fb = '';

  // shadow: the sheet's outline thrown by dir, widened by a stroke, a stack of them each fainter than the one inside; clipped to the wall (outside the sheet)
  sd += `<clipPath id="${id}-o"><path clip-rule="evenodd" d="M${-big} ${-big}H${big}V${big}H${-big}Z ${dPoly(real)}"/></clipPath>`;
  const sh = real.map((p) => [p[0] + L.dir[0] * k, p[1] + L.dir[1] * k]);
  const per = 1 - (1 - L.a) ** (1 / N);
  let g = '';
  for (let i = 0; i < N; i++) g += `<polygon points="${pts(sh)}" fill="#000" stroke="#000" stroke-width="${f1(2 * k * L.spread * ((i + 1) / N) ** 1.5 * 100) / 100}" stroke-linejoin="round" opacity="${per.toFixed(3)}"/>`;
  // the contact line: the narrow, dark edge where the sheet meets the wall
  g += `<polygon points="${pts(real.map((p) => [p[0] + L.dir[0] * k * 0.3, p[1] + L.dir[1] * k * 0.3]))}" fill="#000" stroke="#000" stroke-width="${f1(2 * k * 1.3 * 100) / 100}" stroke-linejoin="round" opacity="0.18"/>`;
  sb += `<g clip-path="url(#${id}-o)">${g}</g>`;

  // rim: between the real edge and the engine's trimmed quad, the art's own colours; upper half-plane the plate, lower the paper
  {
    // painted opaque (not multiplied): the ring has to cover the antialiased fringe of the trimmed edge, where the bare photo shows through. The colour is the art's
    // own, dimmed down the sheet as the engine's shading dims the art beside it (L.edge = the light left at the sheet's top and foot)
    const grad = (n, hex) => `<linearGradient id="${id}-${n}" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(by)}" x2="0" y2="${f1(by + bh)}">${L.edge.map((f, j) => `<stop offset="${j}" stop-color="rgb(${hexToRgb(hex).map((v) => Math.round(v * f)).join(',')})"/>`).join('')}</linearGradient>`;
    rd += grad('rp', P.plate) + grad('rq', P.paper);
    const ring = `${dPoly(real)} ${dPoly(clip.map((p) => { const m = map([cx, cy]); return [m[0] + (p[0] - m[0]) * 0.995, m[1] + (p[1] - m[1]) * 0.995]; }))}`;
    const mid = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const A = mid(real[0], real[3], frac), B = mid(real[1], real[2], frac);
    const ext = (a, b, t) => [a[0] + (a[0] - b[0]) * t, a[1] + (a[1] - b[1]) * t];
    const A2 = ext(A, B, 0.1), B2 = ext(B, A, 0.1);
    const half = (up) => dPoly([A2, B2, [B2[0], B2[1] + (up ? -big : big)], [A2[0], A2[1] + (up ? -big : big)]]);
    rd += `<clipPath id="${id}-u"><path d="${half(true)}"/></clipPath><clipPath id="${id}-l"><path d="${half(false)}"/></clipPath>`;
    rb += frac > 0
      ? `<path d="${ring}" fill-rule="evenodd" fill="url(#${id}-rp)" clip-path="url(#${id}-u)"/><path d="${ring}" fill-rule="evenodd" fill="url(#${id}-rq)" clip-path="url(#${id}-l)"/>`
      : `<path d="${ring}" fill-rule="evenodd" fill="url(#${id}-rq)"/>`;
  }

  // falloff: each layer a gradient of the light left, multiplied over the real sheet
  L.light.forEach((ly, i) => {
    const col = (f) => { const c = [f, f ** (1 + 0.07 * L.warm), f ** (1 + 0.18 * L.warm)].map((v) => Math.round(v * 255)); return `rgb(${c})`; };
    if (ly.type === 'radial') {
      const r = ly.r * bh, stops = ly.stops.map(([t, f]) => `<stop offset="${(t / ly.r).toFixed(3)}" stop-color="${col(f)}"/>`).join('');
      fd += `<radialGradient id="${id}-g${i}" gradientUnits="userSpaceOnUse" cx="${f1(bx + ly.at[0] * bw)}" cy="${f1(by + ly.at[1] * bh)}" r="${f1(r)}">${stops}</radialGradient>`;
    } else {
      const stops = ly.stops.map(([t, f]) => `<stop offset="${t}" stop-color="${col(f)}"/>`).join('');
      fd += `<linearGradient id="${id}-g${i}" gradientUnits="userSpaceOnUse" x1="${f1(bx + ly.from[0] * bw)}" y1="${f1(by + ly.from[1] * bh)}" x2="${f1(bx + ly.to[0] * bw)}" y2="${f1(by + ly.to[1] * bh)}">${stops}</linearGradient>`;
    }
    fb += `<polygon points="${pts(real)}" fill="url(#${id}-g${i})"/>`;
  });
  // overhang: where the art runs past the real sheet onto the wall, the engine shades it with the wall's luminance, which is darker than paper, so it reads as a
  // dark band. A colour-dodge by (1 - L.lift) divides that darkening back out (lift = the wall's luminance over the sheet's white, measured)
  const lift = L.lift ? `<path d="${dPoly(clip)} ${dPoly(inner)}" fill-rule="evenodd" fill="rgb(${Array(3).fill(Math.round((1 - L.lift) * 255))})"/>` : '';
  // each part is its own svg: inside one svg the parts would paint over one another, not multiply into one another
  return { layers: [['color-dodge', '', lift], ['normal', rd, rb], ['multiply', fd, fb], ['multiply', sd, sb]] };
}

// the svg that goes over a crop (dw x dh px): it multiplies into the photo underneath
export const wallSvg = (dw, dh, parts) => parts.flatMap((p) => p.layers).map(([mode, defs, body]) => (body ? svg(dw, dh, mode, `<defs>${defs}</defs>${body}`) : '')).join('');
const svg = (dw, dh, mode, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${f1(dw)}" height="${f1(dh)}" viewBox="0 0 ${f1(dw)} ${f1(dh)}" style="position:absolute;left:0;top:0;mix-blend-mode:${mode};pointer-events:none">${inner}</svg>`;
