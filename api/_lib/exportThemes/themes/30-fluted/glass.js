// The Fluted glass: one SVG band of vertical reeds. Each reed is clipped to its own 12 px column and shows the page's behind-art mirrored and
// magnified about the reed's centre (the refraction). Over that, every reed carries the same cylindrical profile, one smooth gradient across its width:
// a lit side, a thin specular line near the lit edge, a soft core, a shadow side, and a 1 px dark seam where it meets the next reed (run 9; the earlier
// 3 px lit and shade strips were flat tones and read as a stripe). The profile is tinted from the page's own ground (an off-white and a deep tone of its hue),
// never a grey line laid across colour. No filter, no blur, no mask, so it prints as vector (linear gradients with alpha stops, drawn in the reed's own rect).
//
// behind: SVG markup in PAGE coordinates (0 0 1080 1350), flat hex fills and strokes only. It must paint its own ground, so every reed is fully covered.
// over: SVG markup in page coordinates drawn on the reeds, not mirrored (a shape the page wants refracted smoothly, see warpPath), under the reed profile.
// id: unique per page, because every page sits in one document and clipPath ids are global.

// The profile: [offset across the reed, 'l' lit or 'd' shade, opacity]. Two weights: a dark page (the shade side needs depth, the lit side is bright)
// and a light page (the lit side only shows over a coloured field; the shade carries it). GLASS_K scales every opacity.
const PROFILE = {
  // run 10: a wider lit body (it holds to about 70% of the reed) and a deeper shade side, so a reed on navy, Dusk or asphalt reads as a lit half beside a dark half, not as one pale hairline
  dark: [[0, 'l', 0.08], [0.14, 'l', 0.22], [0.3, 'l', 0.15], [0.5, 'l', 0.08], [0.7, 'l', 0.02], [0.76, 'd', 0], [0.88, 'd', 0.34], [0.94, 'd', 0.5], [0.94, 'd', 0.62], [1, 'd', 0.62]],
  light: [[0, 'l', 0.4], [0.18, 'l', 0.7], [0.32, 'l', 0.35], [0.5, 'l', 0], [0.56, 'd', 0], [0.8, 'd', 0.08], [0.94, 'd', 0.16], [0.94, 'd', 0.24], [1, 'd', 0.24]],
};
const K = 1;
const ACCENT_LIT = 1.7;  // the accent reed (one in six on a dark page): its lit side and specular line are this much stronger
// the two overlay colours, taken from a page's ground: lit an off-white of its hue, shade a deep tone of its hue
export function glassInks(ctx, ground) {
  const o = ctx.C.toOklch(ground);
  return { l: ctx.C.fromOklch(0.97, Math.min(o.C, 0.02), o.H), d: ctx.C.fromOklch(Math.min(0.1, o.L * 0.4), Math.min(o.C, 0.04), o.H) };
}
const mix = (a, b, t) => { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
// the ground as it lands at the lit peak (dir +1, the specular line) or the shade peak (dir -1, the seam), for the contrast of text that sits in the glass; dir 2 is the accent reed's specular line
export function glassTone(ctx, hex, dir) {
  const pr = PROFILE[ctx.C.toOklch(hex).L >= 0.4 ? 'light' : 'dark'], ink = glassInks(ctx, hex);
  const top = (k) => Math.max(...pr.filter((q) => q[1] === k).map((q) => q[2])) * K;
  return mix(hex, dir > 0 ? ink.l : ink.d, Math.min(1, dir === 2 ? top('l') * ACCENT_LIT : top(dir > 0 ? 'l' : 'd')));
}

export function glassBand(ctx, { id, behind, light = false, pitch = 12, x0 = 0, w = 1080, y0 = 768, h = 384, mag = 1.35, edges = false, noFacets = null, accent = false, ground = null, over = '', photo = false }) {
  // noFacets: a rect {x,y,w,h}, or a list of them, where the profile is left off (text sits there)
  const n = Math.round(w / pitch);
  const cutList = noFacets ? [].concat(noFacets) : [];
  const ink = glassInks(ctx, ground || (light ? ctx.roles.light.surface : ctx.roles.dark.surface)), pr = PROFILE[light ? 'light' : 'dark'];
  const stops = (ml, ms = 1) => pr.map(([o, k, a]) => `<stop offset="${o}" stop-color="${ink[k]}" stop-opacity="${Math.min(1, +(a * K * (k === 'l' ? ml : ms)).toFixed(3))}"/>`).join('');
  // real glass is never uniform: five strengths of the same profile (lit, shade) are dealt to the reeds by a fixed hash, so the band has no barcode regularity
  const VAR = [[1, 1], [0.85, 1.1], [1.15, 0.9], [0.9, 0.9], [1.1, 1.1]], deal = (i) => (Math.imul(i + 11, 2654435761) >>> 28) % VAR.length;
  // the colour under a reed's centre, from the top-level rects of the behind-art (the last one painted over the band's middle wins): the profile is weakened where it would shout.
  // On a light page the lit side over a near-black field is a loud white stripe ('dk': lit x0.4); on a dark page the shade over a near-white field is a loud black one ('lt': shade x0.5).
  const rects = [...behind.matchAll(/<rect x="(-?[\d.]+)" y="(-?[\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="(#[0-9a-fA-F]{6})"/g)].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], hex: m[5] }));
  const my = y0 + h / 2, fieldAt = (cx) => { let f = ground || null; for (const r of rects) if (cx >= r.x && cx < r.x + r.w && my >= r.y && my < r.y + r.h) f = r.hex; return f; };
  const cls = (cx) => { if (photo && light) return 'ph'; const f = fieldAt(cx);  // photo: the behind-art is a photograph, dark under a light page's ground, so the lit side is held right down (run 10: at full strength it washed the photo to a white film)
     if (!f) return 'n'; const L = ctx.C.toOklch(f).L; return light ? (L < 0.4 ? 'dk' : 'n') : (L > 0.85 ? 'lt' : 'n'); };
  const grads = new Map();
  const grad = (c, v) => { const key = `${c}${v}`; if (!grads.has(key)) { const [ml, ms] = v === 'A' ? [ACCENT_LIT, 1] : VAR[v]; grads.set(key, `<linearGradient id="${id}-P${key}" x1="0" y1="0" x2="1" y2="0">${stops(ml * (c === 'dk' ? 0.4 : c === 'ph' ? 0.15 : 1), ms * (c === 'lt' ? 0.5 : 1))}</linearGradient>`); } return `${id}-P${key}`; };
  const clips = [], reeds = [], shades = [];
  // the y runs of a reed that no cut rect covers
  const runs = (sx, sw) => {
    const cuts = cutList.filter((c) => sx < c.x + c.w && sx + sw > c.x).map((c) => [Math.max(y0, c.y), Math.min(y0 + h, c.y + c.h)]).sort((a, b) => a[0] - b[0]);
    const out = []; let at = y0;
    for (const [a, b] of cuts) { if (a > at) out.push([at, a]); at = Math.max(at, b); }
    if (at < y0 + h) out.push([at, y0 + h]);
    return out;
  };
  for (let i = 0; i < n; i++) {
    const x = x0 + i * pitch, cx = x + pitch / 2, tf = `translate(${cx} 0) scale(-${mag} 1) translate(${-cx} 0)`;
    clips.push(`<clipPath id="${id}-c${i}"><rect x="${x}" y="${y0}" width="${pitch}" height="${h}"/></clipPath>`);
    reeds.push(`<g clip-path="url(#${id}-c${i})"><use href="#${id}-B" transform="${tf}"/></g>`);
    const prof = grad(cls(cx), accent && i % 6 === 2 ? 'A' : deal(i));  // on a dark page one reed in six has a brighter lit side and specular line, so the band has a rhythm
    shades.push(runs(x, pitch).map(([a, b]) => `<rect x="${x}" y="${a}" width="${pitch}" height="${b - a}" fill="url(#${prof})"/>`).join(''));
  }
  const edge = edges ? [y0, y0 + h].map((y) => `<rect x="${x0}" y="${y - 0.5}" width="${w}" height="1" fill="${light ? ctx.roles.light.text : ctx.roles.dark.text}" fill-opacity="0.18"/>`).join('') : '';
  return `<svg class="glass" xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${w} ${h}" width="${w}" height="${h}" style="position:absolute;left:${x0}px;top:${y0}px" aria-hidden="true"><defs>`
    + `<g id="${id}-B">${behind}</g>${[...grads.values()].join('')}${clips.join('')}</defs>${reeds.join('')}${over}${shades.join('')}${edge}</svg>`;
}

// The palette as vertical fields by share, over the given y range. Every interior edge sits half a reed (snap / 2) off a multiple of the pitch, i.e. on a reed's
// centre, so one reed holds each edge and shows it mirrored: a one-reed fringe, the refraction. (On a reed boundary no reed ever sees the edge and the band reads as
// corduroy.) The last field takes the remainder.
// Two-hue rule: when fewer than two colours differ from the ground by OKLCH lightness 0.25, steps 300 and 700 of the action colour's ramp
// are added as two extra fields of 10% each, taken from the ground's share.
// omit: colours whose field is painted as the ground instead, so a shape in that colour is never lost against its own field.
export function paletteFields(ctx, { ground, y = 0, h = 1350, W = 1080, actionHex, omit = [], snap = 12, minW = 0 }) {
  return paletteCols(ctx, { ground, W, actionHex, snap, minW }).map((c) => `<rect x="${c.x}" y="${y}" width="${c.w}" height="${h}" fill="${omit.some((o) => o.toLowerCase() === c.hex.toLowerCase()) ? ground : c.hex}"/>`).join('');
}

// The field list itself: {hex, share, x, w}, in share order (a colour from ctx.colours, or a ramp step added by the two-hue rule)
export function paletteCols(ctx, { ground, W = 1080, actionHex, snap = 12, minW = 0 }) {
  const C = ctx.C, gL = C.toOklch(ground).L;
  let cols = ctx.colours.map((c) => ({ hex: c.hex, share: c.share })).sort((a, b) => b.share - a.share);
  if (cols.filter((c) => Math.abs(C.toOklch(c.hex).L - gL) >= 0.25).length < 2) {
    const strong = ctx.colours.find((c) => c.hex.toLowerCase() === actionHex.toLowerCase()) || ctx.colours[0];
    const gi = cols.findIndex((c) => c.hex.toLowerCase() === ground.toLowerCase());
    if (gi >= 0) cols[gi] = { ...cols[gi], share: Math.max(0, cols[gi].share - 0.2) };
    cols = [...cols, { hex: strong.ramp[300], share: 0.1 }, { hex: strong.ramp[700], share: 0.1 }];
  }
  let cum = 0, x = 0;
  const out = cols.map((c, i) => {
    cum += W * c.share;
    const last = i === cols.length - 1, edge = last ? W : Math.min(W - snap * (cols.length - 1 - i), Math.max(x + snap, Math.round(cum / snap) * snap));
    const r = { ...c, w: edge - x }; x = edge; return r;
  });
  // minW: a field that carries text never narrower than this; the shortfall comes off the widest field
  const real = (c) => ctx.colours.some((k) => k.hex.toLowerCase() === c.hex.toLowerCase());
  if (minW) for (const c of out) { if (c.w < minW && real(c)) { const big = out.reduce((a, b) => (b.w > a.w ? b : a)); big.w -= minW - c.w; c.w = minW; } }
  // the minimum may have moved an edge off a reed's centre: put every interior edge back on one, never narrower than minW
  let at = 0;
  out.forEach((c, i) => { let e = at + c.w; if (i < out.length - 1) { e = Math.round((e - snap / 2) / snap) * snap + snap / 2; if (minW && e - at < minW) e += snap; c.w = e - at; } else c.w = W - at; c.x = at; at = e; });
  // the last field is the remainder, so it too is held to minW (its edge steps left a reed at a time, taking the width from the field before it)
  const L = out[out.length - 1], P = out[out.length - 2];
  if (minW && P && real(L)) while (L.w < minW) { L.x -= snap; L.w += snap; P.w -= snap; }
  return out;
}

// A glyph path (absolute M, L, Q, C, Z; local coordinates, placed at page (tx, ty)) as a dense polygon in page coordinates, every point moved sideways by a smooth displacement
// x + amp * sin(2 pi x / pitch): zero on every reed boundary and every reed centre, so a vertical edge on a boundary stays put and a curve bends gently across each reed with no step.
// (A per-reed mirror of the same curve steps 28 px from reed to reed, and that reads as sawteeth.) Returns a path d, or null if the path has other commands.
// Run 11: amp 1.0 (was 1.8: near the fold limit of 1.91 the curve piled up into stair-steps), the polyline sampled every 1 px along its length, then one light smoothing pass along the outline
// (a gaussian of sigma `smooth` px) so the 12 px bend reads as a soft arc and not as a torn edge. Corners of 40 to 100 degrees (a stem's foot, a flag's end) are held; spikes sharper than
// that (the B's waist) are rounded, which is the cheap softening of that notch.
export const WARP_AMP = 1.0, WARP_SMOOTH = 3, WARP_BLUNT = 8;
// a needle (a turn of over 100 degrees across 4 px, the B's waist) is cut where its two sides are `w` px apart and ended with a half circle of that width: a 25 px sliver reads as a notch of the
// glyph's own at 1x and as a spike at 3x
function blunt(P, closed, w) {
  const n = P.length, at = (i) => P[((i % n) + n) % n], turn = (i) => { const a = at(i - 2), b = at(i), c = at(i + 2), ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1], m = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return m < 1e-9 ? 0 : Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / m))) * 180 / Math.PI; };
  if (!closed || n < 40) return P;
  const T = P.map((_, i) => turn(i)), cuts = [];
  for (let i = 0; i < n; i++) { if (T[i] <= 100) continue; let top = true; for (let k = -6; k <= 6; k++) if (T[((i + k) % n + n) % n] > T[i] || (T[((i + k) % n + n) % n] === T[i] && k < 0)) top = false; if (!top) continue;
    let k = 1; while (k < 40 && Math.hypot(at(i + k)[0] - at(i - k)[0], at(i + k)[1] - at(i - k)[1]) < w) k++; if (k >= 40) continue; cuts.push([i, k]); }
  if (!cuts.length) return P;
  const drop = new Set(), arcs = new Map();
  for (const [i, k] of cuts) { const A = at(i - k), B = at(i + k), tip = at(i), mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, ex = (B[0] - A[0]) / w, ey = (B[1] - A[1]) / w;
    let ux = tip[0] - mx, uy = tip[1] - my; const um = Math.hypot(ux, uy) || 1; ux /= um; uy /= um;
    for (let j = -k + 1; j <= k - 1; j++) drop.add(((i + j) % n + n) % n);
    arcs.set(((i - k) % n + n) % n, Array.from({ length: 9 }, (_, q) => { const ph = Math.PI * (1 - (q + 1) / 10); return [mx + (w / 2) * (Math.cos(ph) * ex + Math.sin(ph) * ux), my + (w / 2) * (Math.cos(ph) * ey + Math.sin(ph) * uy)]; })); }
  const out = []; for (let i = 0; i < n; i++) { if (drop.has(i)) continue; out.push(P[i]); if (arcs.has(i)) out.push(...arcs.get(i)); }
  return out;
}
function smoothRing(P, closed, sigma) {
  const n = P.length, SP = sigma * 5, R = Math.ceil(SP * 3), at = (i) => (closed ? P[((i % n) + n) % n] : P[Math.min(n - 1, Math.max(0, i))]);
  const turn = (i) => { const a = at(i - 2), b = at(i), c = at(i + 2), ux = b[0] - a[0], uy = b[1] - a[1], vx = c[0] - b[0], vy = c[1] - b[1], m = Math.hypot(ux, uy) * Math.hypot(vx, vy);
    return m < 1e-9 ? 0 : Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy) / m))) * 180 / Math.PI; };
  const T = P.map((_, i) => turn(i)), spike = T.map((t) => t > 100);
  const dist = (flag, max) => P.map((_, i) => { for (let k = 0; k < max; k++) { if (flag[((i + k) % n + n) % n] || flag[((i - k) % n + n) % n]) return k; } return 99; });
  const ds = dist(spike, 20), corner = T.map((t, i) => t >= 40 && t <= 100 && ds[i] > 6), dc = dist(corner, 8);  // the flanks of a spike also turn 40 to 100: they are not corners
  return P.map((p, i) => {
    const s = Math.min(1, dc[i] / 5); if (s === 0) return p;
    const sg = sigma + (SP - sigma) * Math.max(0, 1 - ds[i] / 20), r = Math.ceil(sg * 3);  // near a spike (a notch) the pass is wider: it rounds the tip
    let sx = 0, sy = 0, sw = 0;
    for (let k = -r; k <= r; k++) { if (!closed && (i + k < 0 || i + k >= n)) continue; const q = at(i + k), g = Math.exp(-(k * k) / (2 * sg * sg)); sx += q[0] * g; sy += q[1] * g; sw += g; }
    return [p[0] + (sx / sw - p[0]) * s, p[1] + (sy / sw - p[1]) * s];
  });
}
export function warpPath(d, tx, ty, { amp = WARP_AMP, pitch = 12, step = 1, smooth = WARP_SMOOTH } = {}) {
  const cmds = []; for (const t of d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) || []) { if (/[A-Za-z]/.test(t)) cmds.push({ c: t, n: [] }); else cmds[cmds.length - 1].n.push(Number(t)); }
  if (cmds.some((k) => !'MLQCZ'.includes(k.c))) return null;
  const w = (x, y) => [x + tx + amp * Math.sin(2 * Math.PI * (x + tx) / pitch), y + ty];
  let cx = 0, cy = 0; const subs = []; let cur = null;
  for (const { c, n } of cmds) {
    if (c === 'M') { cx = n[0]; cy = n[1]; cur = { pts: [w(cx, cy)], closed: true }; subs.push(cur); } else if (c === "Z") { /* a fill closes every subpath, with or without Z (the glyph paths have none) */ }
    else if (c === 'L') { const k = Math.max(1, Math.ceil(Math.hypot(n[0] - cx, n[1] - cy) / step)); for (let i = 1; i <= k; i++) cur.pts.push(w(cx + (n[0] - cx) * i / k, cy + (n[1] - cy) * i / k)); cx = n[0]; cy = n[1]; }
    else {
      const P = [[cx, cy], ...Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]])];
      const len = P.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - P[i][0], q[1] - P[i][1]), 0), k = Math.max(4, Math.ceil(len / step));
      for (let i = 1; i <= k; i++) { const t = i / k, u = 1 - t; let q;
        if (c === 'Q') q = [0, 1].map((j) => u * u * P[0][j] + 2 * u * t * P[1][j] + t * t * P[2][j]);
        else q = [0, 1].map((j) => u * u * u * P[0][j] + 3 * u * u * t * P[1][j] + 3 * u * t * t * P[2][j] + t * t * t * P[3][j]);
        cur.pts.push(w(q[0], q[1])); }
      cx = n[n.length - 2]; cy = n[n.length - 1];
    }
  }
  // a fill closes every subpath with a straight line from the last point to the first: it is sampled like the others, or the smoothing pass (which counts points, not pixels) pulls the
  // two corners it joins toward each other and leaves a barb at each (the arch's base, run 12)
  for (const s of subs) { const a = s.pts[s.pts.length - 1], b = s.pts[0], k = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step); for (let i = 1; i < k; i++) s.pts.push([a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k]); }
  return subs.map(({ pts, closed }) => { const q = smooth > 0 && pts.length > 12 ? blunt(smoothRing(pts, closed, smooth), closed, WARP_BLUNT) : pts;
    return `M${q.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}${closed ? 'Z' : ''}`; }).join('');
}
