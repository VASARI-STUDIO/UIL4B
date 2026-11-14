// Theme 22, Ticket: the light on the two photographed prints (signage page). Two kinds of layer, both built here and never in engine/:
//  - art-side: drawn inside the art before the engine warps it onto the sheet and multiplies the photo's own shade in (lamp falloff, the wall's relief, the bar's
//    pool of light), so the print is lit by the scene's lamp and not just darkened;
//  - page-side: an SVG over the photograph, in the scene's own pixels (its viewBox is the window of the scene the page shows), for what lies outside the
//    sheet or past the quad: the contact shadow, and the ticket's rolled end. Vectors and gradients only, plus feGaussianBlur on the shadows.
// All coordinates below were measured from engine/scenes/<id>/scene.jpg (scene pixels) and are fixed by those two photographs.
import { plateImg } from '../../engine/plate.js';
import { BRICK } from './brick.js';
import { px, roles } from './helpers.js';

const r1 = (n) => Math.round(n * 10) / 10;

// ---- scene geometry ----
export const POSTER_SCENE = 'poster-venue-night-2', TICKET_SCENE = 'ticket-bartop';
const LAMP = [510, 242];                       // the poster wall's pendant: centre of the bulb
const POOL = [320, 430];                       // the bar's hot reflection that crosses the ticket's left end
// the paper's silhouette in the bar-top scene, traced from the photo by thresholding the paper: straight along the long edges, then the lifted end
const CURL_X = 1050;                           // from here the sheet lifts
const TICKET_SIL = [[256.5, 486], [1060, 389.5], [1074, 388.5], [1098, 383], [1122, 376.5], [1150, 365.5], [1158, 361.5], [1166, 357.5], [1170, 358.2], [1174.5, 370], [1185.5, 390], [1195.5, 410],
  [1206.5, 430], [1217.5, 450], [1228.5, 470], [1239.5, 490], [1251.5, 510], [1256.5, 520], [1250.5, 526.5], [1242.5, 534.5], [1234.5, 541.5], [1226.5, 548.5], [1218.5, 553.5], [1210.5, 558.5],
  [1202.5, 562.5], [1194.5, 566.5], [1186.5, 569.5], [1178.5, 571.5], [1166, 575.5], [1150, 578.5], [289, 697.5]];

// ---- maths ----
// a point in the scene -> (u, v) in the unit square of a quad (tl, tr, br, bl): the inverse of the homography the engine warps the art with
function quadUV(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1, g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (x, y) => {
    const m11 = a - x * g, m12 = b - x * h, m21 = d - y * g, m22 = e - y * h, det = m11 * m22 - m12 * m21;
    return [((x - c) * m22 - m12 * (y - f)) / det, (m11 * (y - f) - m21 * (x - c)) / det];
  };
}
// the engine clips a paper art to its quad shrunk 1% about the centre
const shrunk = (q) => { const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4; return q.map((p) => [cx + (p[0] - cx) / 1.01, cy + (p[1] - cy) / 1.01]); };
const openPath = (pts) => `M${pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}`;
const pathOf = (pts) => `${openPath(pts)}Z`;

// ---- lamp falloff: brightness f(d) = 1 - fall x t^0.85, t from the nearest to the farthest distance on the sheet ----
export const fallOff = (d, d0, d1, fall) => 1 - fall * Math.pow(Math.min(1, Math.max(0, (d - d0) / (d1 - d0))), 0.85);
const radialDark = (cx, cy, d0, d1, fall, n = 10) => {
  const stops = Array.from({ length: n + 1 }, (_, i) => { const d = d0 + (d1 - d0) * i / n; return `rgba(0,0,0,${r1(1 - fallOff(d, d0, d1, fall)).toFixed(3)}) ${Math.round(d)}px`; });
  return `radial-gradient(circle ${Math.round(d1)}px at ${px(cx)} ${px(cy)}, rgba(0,0,0,0) 0, ${stops.join(',')})`;
};

// What the engine's shade does to a blank sheet is measured, not guessed: base / white of the photo, per channel, at the middle of each sheet
// (the 98th percentile of the photo under the sheet is its white). The art is made so that, after the art-side falloff and the shade, the middle of the
// print comes out at MID of the brand colour: the lamp then lights the top above it and leaves the foot below it.
// poster: measured on the clear margin strips measure-light.py reads (x 2.5-6% and 94-97.5% of the quad, y 45-55%), left and right averaged: the middle of the print is
// ink, so the strips are the only place the paper can be read; the centre column is a little brighter (0.94, 0.868, 0.83)
const SHADE_MID = { poster: [0.902, 0.846, 0.819], ticket: [0.963, 0.921, 0.917] };
// the poster sits lower (0.90): it hangs on a wall the lamp leaves in the dark, so it must not read as the brand colour at full strength
export const MID = { poster: 0.90, ticket: 0.94 };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (v) => '#' + v.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
export const litColour = (hex, shadeMid, fMid, mid) => rgbHex(hexRgb(hex).map((c, i) => c * mid / (shadeMid[i] * fMid)));

// the colour that multiplies into the photo's lifted end, so the end carries the print's colour at the right of the sheet and the photo's own light (the
// engine would divide the photo by its white, 0.922 here, on the flat part)
// CURL_K is measured: the lifted end of the photo is brighter than the flat paper (it faces the lamp), so with the plain factor the end came out 1.45 times the
// face beside it (143,208,178 against 99,146,121 on Encore at the fold); 0.7 puts the two level at the seam and the roll gradient then grades it
const CURL_K = 0.7;
const POSTER_FALL = 0.19;                      // the lamp falloff across the poster, top to foot (0.25 until run 8: the foot of the Kerbside print came out rust; 0.19 lifts it 8%)
// what the rim is multiplied by (top, middle, foot), as a share of the art's own print colour. Sampled: the first guess (the falloff over 0.9) printed the rim
// 1.2 times the print beside it at mid height and 1.38 times at the foot, so the shares are the falloff over those
const POSTER_EDGE = [[0, 0.99], [0.5, 0.80], [1, 0.66]];
const TICKET_FALL = 0.2;                      // the lamp falloff across the ticket (ticketLit): the straight edge is printed over in the colour it leaves
export const curlTint = (bg, endF) => rgbHex(hexRgb(bg).map((c) => c * endF * CURL_K / 0.922));

// ---- the poster: the lamp over a brick wall ----
export function posterLit(ctx, W, H) {
  const q = ctx.sceneInfo(POSTER_SCENE).quads[0].corners, sx = W / (q[1][0] - q[0][0]), sy = H / (q[2][1] - q[0][1]);
  const lamp = [(LAMP[0] - q[0][0]) * sx, (LAMP[1] - q[0][1]) * sy];
  const near = Math.abs(lamp[1]), d1 = Math.hypot(Math.max(lamp[0], W - lamp[0]), H - lamp[1]);
  const dMid = (Math.hypot(W * 0.0425 - lamp[0], H / 2 - lamp[1]) + Math.hypot(W * 0.9575 - lamp[0], H / 2 - lamp[1])) / 2, FALL = POSTER_FALL;
  return {
    mid: MID.poster, shadeMid: SHADE_MID.poster, fMid: fallOff(dMid, near, d1, FALL),
    // over everything: the wall's relief (multiply: the mortar shows through the paste, and through the ink), then the lamp's falloff
    layers: `${plateImg(`data:image/png;base64,${BRICK}`, ``, `position:absolute;left:0;top:0;width:${W}px;height:${H}px;mix-blend-mode:multiply`)}`
      + `<div style="position:absolute;inset:0;background:${radialDark(lamp[0], lamp[1], near, d1, FALL)}"></div>`,
  };
}

// ---- the ticket: the bar's pool of light at its left end, falling away to the right; the corner of the quad that hangs over the wood is put back ----
export function ticketLit(ctx, W, H) {
  const q = ctx.sceneInfo(TICKET_SCENE).quads[0].corners, uv = quadUV(q);
  const pool = uv(POOL[0], POOL[1]).map((v, i) => v * [W, H][i]);
  const near = 150, far = Math.hypot(W - pool[0], H / 2 - pool[1]), FALL = TICKET_FALL;
  const dMid = Math.hypot(W / 2 - pool[0], H / 2 - pool[1]);
  // everything of the quad that is not paper: white in the art comes out as the photo itself (the shade is 1 there)
  const sil = TICKET_SIL.map((p) => uv(p[0], p[1])).map((p) => [p[0] * W, p[1] * H]);
  const over = [[1140, 600], [1140, 579], [1150, 578.5], [1166, 575.5], [1178.5, 571.5], [1186.5, 569.5], [1194.5, 566.5], [1202.5, 562.5], [1210.5, 558.5], [1218.5, 553.5], [1226.5, 548.5], [1234.5, 541.5],
    [1242.5, 534.5], [1250.5, 526.5], [1256.5, 520], [1270, 520], [1270, 600]].map((p) => uv(p[0], p[1])).map((p) => [p[0] * W, p[1] * H]);
  // the quad's top right corner (shrunk 1%) sits a hair outside the paper's silhouette, where the sheet turns up into the curl: it printed a mint tab on the
  // wood. White there gives the photo back, from the silhouette's own edge outwards
  const tab = [[1169, 358], [1174.2, 370], [1185.2, 390], [1195.2, 410], [1212, 410], [1212, 340], [1169, 340]].map((p) => uv(p[0], p[1])).map((p) => [p[0] * W, p[1] * H]);
  return {
    mid: MID.ticket, shadeMid: SHADE_MID.ticket, fMid: fallOff(dMid, near, far, FALL), sil, over,
    layers: `<div style="position:absolute;inset:0;background:radial-gradient(ellipse ${Math.round(far * 0.55)}px ${Math.round(far * 0.3)}px at ${px(pool[0] - 30)} ${px(pool[1] + 10)},rgba(255,232,196,.17),rgba(255,232,196,0))"></div>`
      + `<div style="position:absolute;inset:0;background:${radialDark(pool[0], pool[1], near, far, FALL)}"></div>`
      + `<svg style="position:absolute;left:0;top:0" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${pathOf(over)}" fill="#fff"/><path d="${pathOf(tab)}" fill="#fff"/></svg>`,
    // the brightness the face has at the right end of the print, where the curl's tint must match it
    endF: fallOff(Math.hypot(W - pool[0], H / 2 - pool[1]), near, far, FALL),
  };
}

// ---- page-side layers: an SVG over the photograph, in the scene's own pixels ----
const svgOver = (win, w, h, inner) => `<svg class="a" style="left:0;top:0" width="${px(w)}" height="${px(h)}" viewBox="${win.x} ${win.y} ${win.w} ${win.h}" aria-hidden="true">${inner}</svg>`;
const big = (win) => `M${win.x - 50} ${win.y - 50}H${win.x + win.w + 50}V${win.y + win.h + 50}H${win.x - 50}Z`;

// the poster's contact shadow on the brick, and its edge: pasted card is thin, so the shadow is small and close
export function posterOver(ctx, win, w, h) {
  const q = ctx.sceneInfo(POSTER_SCENE).quads[0].corners, [x0, y0] = q[0], [x1, y1] = q[2], qw = x1 - x0, qh = y1 - y0;
  const rect = (dx, dy, op, f) => `<rect x="${r1(x0 + dx)}" y="${r1(y0 + dy)}" width="${r1(qw)}" height="${r1(qh)}" fill="#000" fill-opacity="${op}" filter="url(#${f})"/>`;
  const [cx, cy] = q[1];
  // the bare strip of the photo's paper between the quad and the art (it showed as a pale rim all round, which the old bevel stroke only greyed): printed over
  // with the sheet's colour, the brand colour at the lamp's falloff from the top edge to the foot
  const R = roles(ctx), pl = posterLit(ctx, 594, 841), bg = litColour(R.field, pl.shadeMid, pl.fMid, pl.mid), inner = shrunk(q);
  const edgeAt = (v) => rgbHex(hexRgb(bg).map((c) => c * v));
  const ring = `<clipPath id="po-ring"><path clip-rule="evenodd" d="${pathOf(q)}${pathOf(inner)}"/></clipPath>`
    + `<linearGradient id="po-edge" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(y0)}" x2="0" y2="${r1(y1)}">${POSTER_EDGE.map(([o, v]) => `<stop offset="${o}" stop-color="${edgeAt(v)}"/>`).join('')}</linearGradient>`;
  // a wrinkle across the sheet at fraction f of its height: a shallow S, dy1 and dy2 the bends and dy3 where it leaves; off moves it down
  const wr = (f, dy1, dy2, dy3, off = 0) => `M${r1(x0)} ${r1(y0 + qh * f + off)}C${r1(x0 + qw * 0.3)} ${r1(y0 + qh * f + dy1 + off)} ${r1(x0 + qw * 0.55)} ${r1(y0 + qh * f + dy2 + off)} ${r1(x1)} ${r1(y0 + qh * f + dy3 + off)}`;
  return svgOver(win, w, h, `<defs>${ring}<clipPath id="po-out"><path clip-rule="evenodd" d="${big(win)}${pathOf(q)}"/></clipPath><clipPath id="po-in"><path d="${pathOf(q)}"/></clipPath>`
    + `<filter id="po-b1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter><filter id="po-b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>`
    + `<filter id="po-b3" filterUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024"><feGaussianBlur stdDeviation="0.8"/></filter><filter id="po-b2s" filterUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024"><feGaussianBlur stdDeviation="1.6"/></filter></defs>`
    // shadow on all four edges (the sheet is paper, not a board: no bevel line), heavier below where it hangs from its top edge, and a short deeper one
    // where the top right corner has lifted off the wall
    + `<g clip-path="url(#po-out)">${rect(0, 12, 0.5, 'po-b2')}${rect(0, 2.5, 0.75, 'po-b1')}${rect(0, 0, 0.55, 'po-b1')}`
    + `<path d="M${r1(cx - 34)} ${r1(cy - 1)}L${r1(cx + 9)} ${r1(cy - 4)}L${r1(cx + 11)} ${r1(cy + 36)}Z" fill="#000" fill-opacity=".7" filter="url(#po-b1)"/></g>`
    + `<g clip-path="url(#po-ring)"><path d="${pathOf(q)}" fill="url(#po-edge)" style="mix-blend-mode:multiply"/></g>`
    + `<g clip-path="url(#po-in)">`
    // the lifted corner: a triangle that has curled toward the lamp (lighter), a crease along its base and a light hair on the rim of the two edges
    + `<path d="M${r1(cx - 30)} ${r1(cy)}L${r1(cx)} ${r1(cy)}L${r1(cx)} ${r1(cy + 30)}Z" fill="#fff3de" fill-opacity=".2"/>`
    + `<path d="M${r1(cx - 30)} ${r1(cy)}L${r1(cx)} ${r1(cy + 30)}" stroke="#000" stroke-opacity=".2" stroke-width="1" filter="url(#po-b3)" fill="none"/>`
    + `<path d="M${r1(cx - 28.8)} ${r1(cy + 1.2)}L${r1(cx - 1.2)} ${r1(cy + 28.8)}" stroke="#fff3de" stroke-opacity=".28" stroke-width="1" filter="url(#po-b3)" fill="none"/>`
    + `<path d="M${r1(cx - 48)} ${r1(cy)}L${r1(cx)} ${r1(cy)}L${r1(cx)} ${r1(cy + 48)}" stroke="#fff3de" stroke-opacity=".5" stroke-width="2.4" stroke-linejoin="miter" fill="none"/>`
    // a faint wrinkle band across the sheet, where the paste let go (a dark hair, a light one beside it) and a shorter one low on the left
    + `<path d="${wr(0.6, -10, 12, -6)}" stroke="#000" stroke-opacity=".10" stroke-width="1.5" filter="url(#po-b2s)" fill="none"/>`
    + `<path d="${wr(0.6, -10, 12, -6, 2.6)}" stroke="#fff3de" stroke-opacity=".07" stroke-width="3" filter="url(#po-b2s)" fill="none"/>`
    + `<path d="M${r1(x0)} ${r1(y0 + qh * 0.83)}Q${r1(x0 + qw * 0.22)} ${r1(y0 + qh * 0.812)} ${r1(x0 + qw * 0.4)} ${r1(y0 + qh * 0.836)}" stroke="#000" stroke-opacity=".11" stroke-width="1.3" filter="url(#po-b3)" fill="none"/>`
    + `</g>`);
}

// the ticket: its contact shadow, and the lifted end re-drawn as a rolled edge
export function ticketOver(ctx, win, w, h, tint) {
  const q = ctx.sceneInfo(TICKET_SCENE).quads[0].corners, inner = shrunk(q), sil = TICKET_SIL, curl = sil.filter((p) => p[0] >= CURL_X);
  const edge = sil.slice(2, 29);                                        // the lifted end's outer edge, from the top run round the tip to the bottom bulge
  const shift = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy]);
  const nx = 0.975, ny = -0.22, p0 = [1196, 470], len = 62;           // across the roll: from the fold to the tip, away from the table's edge
  const grad = (id, stops) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${p0[0]}" y1="${p0[1]}" x2="${r1(p0[0] + nx * len)}" y2="${r1(p0[1] + ny * len)}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</linearGradient>`;
  const ring = `<clipPath id="tk-ring"><path clip-rule="evenodd" d="${pathOf(sil)}${pathOf(inner)}"/></clipPath><clipPath id="tk-curlzone"><rect x="${CURL_X + 24}" y="340" width="260" height="260"/></clipPath><clipPath id="tk-sil"><path d="${pathOf(sil)}"/></clipPath>`;
  const out = `<clipPath id="tk-out"><path clip-rule="evenodd" d="${big(win)}${pathOf(sil)}"/></clipPath>`;
  const filters = `<filter id="tk-b1" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="1.8"/></filter><filter id="tk-b2" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>`
    + `<filter id="tk-b3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter><filter id="tk-b6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2"/></filter><filter id="tk-b5" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="0.9"/></filter>`;
  const defs = `<defs>${ring}${out}${filters}`
    + grad('tk-roll', [[0, '#000', 0.1], [0.2, '#fff1dc', 0.0], [0.42, '#fff1dc', 0.14], [0.62, '#000', 0.0], [0.8, '#000', 0.2], [1, '#000', 0.08]]) + '</defs>';
  const cast = `<g clip-path="url(#tk-out)">`
    + `<path d="${pathOf(shift(sil, 6, 11))}" fill="#000" fill-opacity=".42" filter="url(#tk-b2)"/>`
    + `<path d="${pathOf(shift(sil, 1.5, 3.5))}" fill="#000" fill-opacity=".62" filter="url(#tk-b1)"/>`
    // under the curl: a tight shadow 6 to 8 px wide where the lifted end hangs over the wood, and a longer one behind it
    + `<path d="${pathOf(shift(curl, 4, 8))}" fill="#000" fill-opacity=".72" filter="url(#tk-b6)"/>`
    + `<path d="${pathOf(shift(curl, 12, 16))}" fill="#000" fill-opacity=".5" filter="url(#tk-b3)"/></g>`;
  // the card's edge. The white line the whole length of the sheet was the photo's own paper edge, left bare between the silhouette and the art's quad: it is
  // printed over with the sheet's colour (the brand colour in the lamp's light, left to right), and only the upper long edge keeps a 1 px highlight, where
  // the lamp catches the card's thickness
  const edgeFill = (c) => rgbHex(hexRgb(c).map((v) => v / CURL_K));
  const edgeR = edgeFill(tint), edgeL = rgbHex(hexRgb(edgeR).map((v) => v / (1 - TICKET_FALL)));
  const defs2 = `<defs><linearGradient id="tk-edge" gradientUnits="userSpaceOnUse" x1="256" y1="0" x2="${CURL_X + 24}" y2="0"><stop offset="0" stop-color="${edgeL}"/><stop offset="1" stop-color="${edgeR}"/></linearGradient>`
    + `<clipPath id="tk-flat"><rect x="200" y="300" width="${CURL_X + 24 - 200}" height="460"/></clipPath>`
    + `<linearGradient id="tk-hi" gradientUnits="userSpaceOnUse" x1="256" y1="0" x2="1060" y2="0"><stop offset="0" stop-color="#fff1dc" stop-opacity=".78"/><stop offset="1" stop-color="#fff1dc" stop-opacity=".45"/></linearGradient></defs>`;
  const flatEdge = `<g clip-path="url(#tk-ring)"><g clip-path="url(#tk-flat)"><path d="${pathOf(sil)}" fill="url(#tk-edge)" style="mix-blend-mode:multiply"/></g></g>`
    + `<path d="${openPath(sil.slice(0, 2))}" fill="none" stroke="url(#tk-hi)" stroke-width="1.7" stroke-linecap="butt"/>`;
  // the fold: where the flat sheet turns up into the roll, along the art's right edge: a 0.5 px darker seam with a light hair beside it
  const seamA = inner[1], seamB = inner[2], sd = (dx) => `M${r1(seamA[0] + dx)} ${r1(seamA[1])}L${r1(seamB[0] + dx)} ${r1(seamB[1])}`;
  const seam = `<g clip-path="url(#tk-sil)"><path d="${sd(0)}" stroke="#000" stroke-opacity=".3" stroke-width="0.9" fill="none"/><path d="${sd(1.6)}" stroke="#fff1dc" stroke-opacity=".2" stroke-width="0.9" fill="none"/></g>`;
  // the lifted end: the print continues over it (the photo's own shade carries the light on it), a bright sheen on the roll, a core shadow where it turns away,
  // and the underside's edge: unprinted stock seen as a hair of rim, graded from a shaded cream at the crest to a lit one at the edge (8 and 4 scene px, half of
  // each inside the silhouette), so it reads as rolled card and not as a flat wedge
  const lip = (wd, c, a, f) => `<path d="${openPath(edge)}" fill="none" stroke="${c}" stroke-opacity="${a}" stroke-width="${wd}" stroke-linejoin="round" filter="url(#${f})"/>`;
  const curlLayers = `<g clip-path="url(#tk-curlzone)"><g clip-path="url(#tk-ring)">`
    + `<path d="${pathOf(sil)}" fill="${tint}" style="mix-blend-mode:multiply"/>`
    + `<path d="${pathOf(sil)}" fill="url(#tk-roll)"/>`
    + `<g clip-path="url(#tk-sil)">${lip(8, '#a8957f', 0.55, 'tk-b5')}${lip(4, '#efe3d2', 0.7, 'tk-b5')}</g>`
    + `</g>${`<path d="${openPath(edge)}" fill="none" stroke="#fff4e2" stroke-opacity=".6" stroke-width="1.3" stroke-linejoin="round"/>`}</g>`;
  return svgOver(win, w, h, defs + defs2 + cast + flatEdge + curlLayers + seam);
}
