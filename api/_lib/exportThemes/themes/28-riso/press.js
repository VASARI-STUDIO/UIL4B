// The press for theme 28 (Riso): which brand colours become drums, worked out by one fixed rule (spec section 3.1).
// Runs once per brand from ctx.colours only. Tones are never drums. Nothing here names a colour id or a brand.
import { hexToRgb, rgbToHex, toOklch, fromOklch, ratio } from '../../engine/color.js';

const OFFSET = fromOklch(0.962, 0.006, 95); // the theme stock used when a dark brand has no light colour of its own
const VISIBLE = 0.06, HIT_APART = 0.10;
// a screen of coverage n percent prints at 88% ink, so it lays down n x 0.88 of the drum (the tiles carry the 88% as alpha)
const SK = (n) => (n / 100) * 0.88;

const lab = (hex) => { const { L, C, H } = toOklch(hex); return [L, C * Math.cos((H * Math.PI) / 180), C * Math.sin((H * Math.PI) / 180)]; };
export const dE = (x, y) => { const a = lab(x), b = lab(y); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); };
// what the browser renders for multiply: channel-wise sRGB, x * y / 255
export const mul = (x, y) => { const a = hexToRgb(x), b = hexToRgb(y); return rgbToHex(a.map((v, i) => (v * b[i]) / 255)); };
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const l2s = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
// a k-coverage screen of x over `under`, averaged in linear light (what an eye sees across the fine screen)
export const scr = (x, k, under) => { const m = hexToRgb(mul(x, under)).map(s2l), u = hexToRgb(under).map(s2l); return rgbToHex(m.map((v, i) => l2s(k * v + (1 - k) * u[i]))); };

export function press(ctx) {
  const cols = ctx.colours.map((c, i) => ({ ...c, i, ...toOklch(c.hex) }));
  const L = ctx.roles.light;
  const byHex = (h) => cols.find((c) => c.hex.toUpperCase() === String(h).toUpperCase());
  // step 1: the paper
  const g = cols.find((c) => c.role === 'ground') || byHex(L.surface) || [...cols].sort((a, b) => b.share - a.share)[0];
  let P, dark = false, offset = false;
  if (g.L >= 0.80) P = g;
  else {
    dark = true;
    const light = cols.filter((c) => c.L >= 0.88 && c.C <= 0.04).sort((a, b) => b.L - a.L)[0];
    if (light) P = light; else { P = { id: 'offset', name: 'Offset', hex: OFFSET, role: 'stock', L: 0.962, C: 0.006, share: 0 }; offset = true; }
  }
  // step 2: the candidates
  const paperTints = [], cand = [];
  for (const c of cols) {
    if (c === P || c.hex.toUpperCase() === P.hex.toUpperCase()) continue;
    if (dE(c.hex, P.hex) < VISIBLE) { paperTints.push(c); continue; }
    if (cand.some((x) => x.hex.toUpperCase() === c.hex.toUpperCase())) continue;
    cand.push(c);
  }
  // step 3: the key drum
  const K = dark ? g : cand.find((c) => c.role === 'text') || [...cand].sort((a, b) => ratio(b.hex, P.hex) - ratio(a.hex, P.hex))[0];
  const keyText = ratio(K.hex, P.hex) >= 4.5 ? K.hex : L.text;
  // step 4: the chromatic pool
  let Q = cand.filter((c) => c !== K && c.C >= 0.025);
  if (!Q.length) Q = cand.filter((c) => c !== K && dE(c.hex, K.hex) >= 0.15);
  const byRole = (r) => (a, b) => (b.role === r) - (a.role === r) || b.share - a.share || b.C - a.C || a.i - b.i;
  // step 5: the plate drum
  let A, aScreen = 0;
  if (dark) A = K;
  else if (Q.length) A = Q.find((c) => c.role === 'accent') || Q.find((c) => c.role === 'action') || [...Q].sort((a, b) => b.share - a.share || b.C - a.C || a.i - b.i)[0];
  else { A = K; aScreen = 25; }
  // step 6: the pass drum
  const rest = Q.filter((c) => c !== A).sort(byRole('action'));
  let B = null, bScreen = 0;
  if (!Q.length) { B = K; bScreen = 55; }
  else {
    if (!dark) for (const b of rest) {
      const m = mul(A.hex, b.hex);
      if (Math.min(dE(m, A.hex), dE(m, b.hex)) >= VISIBLE) { B = b; break; }
    }
    if (!B && !dark && dE(scr(K.hex, SK(24), A.hex), A.hex) >= VISIBLE) { B = K; bScreen = 24; }
    if (!B) {
      // a dark plate: the lightest of the rest prints solid, faint where it crosses the flood
      const lightest = [...rest].sort((a, b) => b.L - a.L)[0];
      if (lightest) B = lightest; else { B = K; bScreen = 24; }
    }
  }
  // step 7: the hit drum
  let H;
  if (bScreen === 0 && Q.includes(B) && !dark) H = B;
  else {
    H = Q.filter((c) => c !== A && c !== B).sort(byRole('action')).find((c) => dE(c.hex, A.hex) >= HIT_APART);
    if (!H) H = bScreen === 0 ? B : K;
  }
  // step 8: the press
  const drums = [];
  for (const c of [K, A, B, H]) if (!drums.some((d) => d.hex.toUpperCase() === c.hex.toUpperCase())) drums.push(c);
  const spots = cand.filter((c) => !drums.some((d) => d.hex.toUpperCase() === c.hex.toUpperCase()));
  const num = (c) => drums.findIndex((d) => d.hex.toUpperCase() === c.hex.toUpperCase()) + 1;

  // the plate carries the screen when the brand has one ink only
  const plateHex = A.hex;
  // the pass off a neutral drum prints in a flat dark grey (oklch .26, 88%), not the drum's own black; a drum with some hue keeps its own ink
  const neutral = bScreen === 24 && !dark && toOklch(B.hex).C < 0.03;
  const passInk = neutral ? fromOklch(0.26, 0, 0) : B.hex;
  // where a screened pass crosses the plate the ink is the plate's own hue deepened (a raspberry on pink, a rust on orange), not black pepper:
  // the ink is chosen so that plate x ink = T, channel-wise, clamped to the paper (255)
  let passPlate = null;
  if (neutral) {
    const po = toOklch(plateHex), T = hexToRgb(fromOklch(0.34, Math.min(po.C * 1.6, 0.13), po.H)), pl = hexToRgb(plateHex);
    passPlate = rgbToHex(T.map((v, i) => Math.min(255, (v / Math.max(1, pl[i])) * 255)));
  }
  const passOnPlate = bScreen ? scr(passPlate || passInk, SK(bScreen), plateHex) : mul(plateHex, B.hex);
  const passOnPaper = bScreen ? scr(passInk, SK(bScreen), P.hex) : mul(P.hex, B.hex);
  const hitOnPlate = mul(H.hex, plateHex);
  // type on the plate: the key if it reads, else the paper, else off the plate
  const onPlate = ratio(K.hex, plateHex) >= 4.5 ? 'key' : ratio(P.hex, plateHex) >= 4.5 ? 'knock' : 'off';
  return {
    paper: P.hex, dark, offset, key: keyText, keyDrum: K, plate: plateHex, plateScreen: aScreen, plateDrum: A,
    pass: passInk, passPlate, passScreen: bScreen, passDrum: B, hit: H.hex, hitDrum: H, drums, spots, paperTints, num,
    passOnPlate, passOnPaper, hitOnPlate, onPlate, keyShort: ratio(K.hex, P.hex) < 4.5,
    textOnPlate: onPlate === 'key' ? keyText : onPlate === 'knock' ? P.hex : keyText,
  };
}

// the seeded misregistration of the pass and the hit (spec 3.3), per page
export function fnv1a(s) { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
export function misreg(pageId) {
  const h = fnv1a('28-riso:' + pageId);
  return {
    pass: { dx: [-2, 2][h & 1], rot: [-0.3, 0.3][(h >>> 17) & 1] },
    hit: { dx: [-3, -2, 2, 3][(h >> 3) & 3], dy: [-2, 2][(h >> 5) & 1] },
  };
}
