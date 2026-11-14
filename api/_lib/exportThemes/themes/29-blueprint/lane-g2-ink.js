// Theme 29 (Blueprint), lane g2: the logo's true artwork bounds, read from its own path data rather than its box. A brand's drawing can reach past
// the box its plugin declares (a plumb line hanging below the name, a kerb running past it), and a redline or a clear zone must measure the ink.
const TOK = /[MLHVQCZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

// the extremes of one coordinate along a quadratic or cubic segment (the end points plus any turning point inside it)
function quadExt(p0, p1, p2) { const den = p0 - 2 * p1 + p2, out = [p0, p2]; if (den) { const t = (p0 - p1) / den; if (t > 0 && t < 1) out.push((1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2); } return out; }
function cubicExt(p0, p1, p2, p3) {
  const a = -p0 + 3 * p1 - 3 * p2 + p3, b = 2 * (p0 - 2 * p1 + p2), c = p1 - p0, ts = [], out = [p0, p3];
  if (Math.abs(a) < 1e-9) { if (b) ts.push(-c / b); } else { const disc = b * b - 4 * a * c; if (disc >= 0) { const s = Math.sqrt(disc); ts.push((-b + s) / (2 * a), (-b - s) / (2 * a)); } }
  for (const t of ts) if (t > 0 && t < 1) { const u = 1 - t; out.push(u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3); }
  return out;
}

// bounds of one path in its own coordinates; absolute commands only, which is what outline() and the plugins write
function pathBox(d) {
  const t = String(d).match(TOK) || [];
  let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0;
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const addX = (v) => { b[0] = Math.min(b[0], v); b[2] = Math.max(b[2], v); };
  const addY = (v) => { b[1] = Math.min(b[1], v); b[3] = Math.max(b[3], v); };
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/[a-z]/i.test(t[i])) cmd = t[i++].toUpperCase();
    else if (!cmd || cmd === 'Z') { i++; continue; }
    if (cmd === 'Z') { x = sx; y = sy; continue; }
    if (cmd === 'M' || cmd === 'L') { x = n(); y = n(); if (cmd === 'M') { sx = x; sy = y; cmd = 'L'; } addX(x); addY(y); }
    else if (cmd === 'H') { x = n(); addX(x); addY(y); }
    else if (cmd === 'V') { y = n(); addX(x); addY(y); }
    else if (cmd === 'Q') { const x1 = n(), y1 = n(), x2 = n(), y2 = n(); quadExt(x, x1, x2).forEach(addX); quadExt(y, y1, y2).forEach(addY); x = x2; y = y2; }
    else if (cmd === 'C') { const x1 = n(), y1 = n(), x2 = n(), y2 = n(), x3 = n(), y3 = n(); cubicExt(x, x1, x2, x3).forEach(addX); cubicExt(y, y1, y2, y3).forEach(addY); x = x3; y = y3; }
    else i++;
  }
  return b;
}

// a part's transform (translate and scale only, as the plugins write them), applied right to left
function applyTf(tf, [x, y]) {
  const ops = [...String(tf || '').matchAll(/(translate|scale)\(([^)]*)\)/g)].map((m) => [m[1], m[2].trim().split(/[\s,]+/).map(Number)]);
  for (let k = ops.length - 1; k >= 0; k--) {
    const [op, a] = ops[k];
    if (op === 'translate') { x += a[0]; y += a[1] || 0; } else { x *= a[0]; y *= a.length > 1 ? a[1] : a[0]; }
  }
  return [x, y];
}

const cache = new WeakMap();
// the ink of a version, in the logo's own units: { x1, y1, x2, y2, w, h } plus how far it reaches past the declared box on each side
export function inkOf(ctx, id) {
  const g = ctx.logo.geos[id];
  if (cache.has(g)) return cache.get(g);
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const p of g.parts) {
    const b = pathBox(p.d);
    if (!isFinite(b[0])) continue;
    const a = applyTf(p.tf, [b[0], b[1]]), c = applyTf(p.tf, [b[2], b[3]]);
    x1 = Math.min(x1, a[0], c[0]); y1 = Math.min(y1, a[1], c[1]); x2 = Math.max(x2, a[0], c[0]); y2 = Math.max(y2, a[1], c[1]);
  }
  const r = { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1, past: { left: Math.max(0, -x1), top: Math.max(0, -y1), right: Math.max(0, x2 - g.w), bottom: Math.max(0, y2 - g.h) } };
  cache.set(g, r);
  return r;
}

// the ink in page px for a logo whose box is drawn at (x, y) and width w
export function inkAt(ctx, id, x, y, w) {
  const g = ctx.logo.geos[id], k = w / g.w, i = inkOf(ctx, id);
  return { x1: x + i.x1 * k, y1: y + i.y1 * k, x2: x + i.x2 * k, y2: y + i.y2 * k, w: i.w * k, h: i.h * k, k };
}
