// Theme 30, Fluted, lane bk: the reeded band for the web book. The guidelines' glass (glass.js) is drawn for one page in one edition; the book shows
// both modes and two widths, so this builds one SVG per width whose ground and role colours are CSS variables (the reeds refract whatever the mode
// paints) and whose reed profile is drawn twice, once per mode, with the mode not in use hidden by CSS. The optics are the theme's: a 12 px reed,
// the page's shapes mirrored and magnified 1.35 about each reed's centre, and the same lit and shade profile, tinted from the mode's ground.
// What sits behind is always the section's own data, as windows: a column with a round head whose width is the value (the language of lane-g1).
import { glassInks, warpPath } from './glass.js';

// role variables a shape may be painted in; each resolves to a hex per mode, so the profile can be weakened over a pale or a dark field
const ROLE = { g: 'surface', ink: 'text', soft: 'textSoft', quiet: 'quiet', hair: 'divider', edge: 'border', panel: 'raised', strong: 'action' };
export const hexIn = (ctx, mode, p) => {
  if (p.startsWith('#')) return p;
  const r = ctx.roles[mode === 'd' ? 'dark' : 'light'];
  if (p.startsWith('t-')) return r[p.slice(2)].fg;
  return r[ROLE[p]];
};
// a paint as an SVG attribute: a hex as fill, a role as a CSS variable (presentation attributes do not take var())
export const paint = (p, prop = 'fill') => (p.startsWith('#') ? `${prop}="${p}"` : `style="${prop}:var(--${p})"`);

// the profile (copied from glass.js, which does not export it): [offset across the reed, lit or dark, opacity]
const PROFILE = {
  dark: [[0, 'l', 0.08], [0.14, 'l', 0.22], [0.3, 'l', 0.15], [0.5, 'l', 0.08], [0.7, 'l', 0.02], [0.76, 'd', 0], [0.88, 'd', 0.34], [0.94, 'd', 0.5], [0.94, 'd', 0.62], [1, 'd', 0.62]],
  light: [[0, 'l', 0.4], [0.18, 'l', 0.7], [0.32, 'l', 0.35], [0.5, 'l', 0], [0.56, 'd', 0], [0.8, 'd', 0.08], [0.94, 'd', 0.16], [0.94, 'd', 0.24], [1, 'd', 0.24]],
};
const VAR = [[1, 1], [0.85, 1.1], [1.15, 0.9], [0.9, 0.9], [1.1, 1.1]], deal = (i) => (Math.imul(i + 11, 2654435761) >>> 28) % VAR.length;

// Windows laid out across the band by value: the reeds between the margins are shared out by largest remainder (each window at least `min` reeds),
// and each window gives one reed to the gap after it. Sides fall on reed boundaries, where the bend is zero, so they stay straight in the glass.
export function layoutWindows(values, { W, P = 12, margin = 48, min = 2 }) {
  const R = Math.floor((W - 2 * margin) / P), tot = values.reduce((a, b) => a + b, 0) || 1;
  const spare = R - values.length * min, raw = values.map((v) => (v / tot) * Math.max(0, spare)), n = raw.map(Math.floor);
  raw.map((r, i) => [r - n[i], i]).sort((a, b) => b[0] - a[0]).slice(0, Math.max(0, spare) - n.reduce((a, b) => a + b, 0)).forEach(([, i]) => { n[i]++; });
  let x = Math.round((W - R * P) / 2 / P) * P;
  return n.map((k) => { const w = (k + min - 1) * P, o = { x, w }; x += (k + min) * P; return o; });
}

// the outline of one window: straight sides from the foot up to a round head centred at cy. A head whose centre is below the foot is the cap of the circle.
function windowD(x, w, cy, foot, ins = 0) {
  const r = w / 2 - ins, cx = x + w / 2, pts = [];
  if (cy <= foot) {
    pts.push([x + ins, foot], [x + ins, cy]);
    for (let a = 180; a <= 360; a += 0.5) pts.push([cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)]);
    pts.push([x + w - ins, cy], [x + w - ins, foot]);
  } else {
    const s = Math.min(1, (cy - foot) / r), a0 = 180 + Math.asin(s) * 180 / Math.PI, a1 = 540 - a0;
    for (let a = a0; a <= a1 + 0.01; a += 0.5) pts.push([cx + r * Math.cos(a * Math.PI / 180), Math.min(foot, cy + r * Math.sin(a * Math.PI / 180))]);
  }
  return `M${pts.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join('L')}`;
}

// One band. W x (lift + H) design units; the band is y lift to lift + H, the flat zone above it. items: windows {x, w, fill?, stroke?} (fill a hex or a role);
// fields: flat vertical rects {x, w, fill} inside the band only (the palette by share). settle: the book's one moment (the reeds settle to 1.35 on load).
export function band(ctx, { id, W, H, lift = 48, P = 12, mag = 1.35, items = [], fields = [], settle = false, cls = '' }) {
  const y0 = lift, foot = lift + H, rmax = Math.max(0, ...items.map((t) => t.w / 2)), cy = Math.min(rmax, foot);
  const flat = [], over = [], body = [];
  for (const t of items) {
    const ins = t.stroke ? 1 : 0, d = windowD(t.x, t.w, cy, foot, ins), dz = t.fill ? d + (cy <= foot ? 'Z' : 'Z') : d;
    const pt = t.fill ? `${paint(t.fill)}` : `fill="none" ${paint(t.stroke, 'stroke')} stroke-width="2"`;
    const ol = t.fill && t.edge ? ` ${paint(t.edge, 'stroke')} stroke-width="1.5"` : '';
    flat.push(`<path d="${dz}" ${pt}${ol}/>`);
    const wd = warpPath(dz, 0, 0, { pitch: P });
    over.push(`<path d="${wd || dz}" ${pt}${ol}/>`);
    if (t.fill && cy < foot) body.push({ x: t.x, y: cy, w: t.w, h: foot - cy, fill: t.fill });
  }
  const rects = [...fields.map((f) => ({ x: f.x, y: y0, w: f.w, h: H, fill: f.fill })), ...body];
  const B = `<rect x="-${P * 2}" y="${y0 - 1}" width="${W + P * 4}" height="${H + 2}" style="fill:var(--g)"/>` + rects.map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" ${paint(r.fill)}/>`).join('');
  // the colour under each reed's centre at mid-band, per mode, to weaken the profile where it would shout (as glass.js does)
  const n = Math.round(W / P), my = y0 + H / 2;
  const under = (cx, m) => { let f = hexIn(ctx, m, 'g'); for (const r of rects) if (cx >= r.x && cx < r.x + r.w && my >= r.y && my < r.y + r.h) f = hexIn(ctx, m, r.fill); return f; };
  const defs = [], clips = [], reeds = [], fx = { l: [], d: [] };
  const grads = new Set();
  for (const m of ['l', 'd']) {
    const ground = hexIn(ctx, m, 'g'), light = ctx.C.toOklch(ground).L >= 0.4, pr = PROFILE[light ? 'light' : 'dark'], ink = glassInks(ctx, ground);
    for (let i = 0; i < n; i++) {
      const L = ctx.C.toOklch(under(i * P + P / 2, m)).L, c = light ? (L < 0.4 ? 'dk' : 'n') : (L > 0.85 ? 'lt' : 'n'), v = deal(i), key = `${m}${c}${v}`;
      if (!grads.has(key)) {
        grads.add(key);
        const [ml, ms] = VAR[v], kl = ml * (c === 'dk' ? 0.4 : 1), ks = ms * (c === 'lt' ? 0.5 : 1);
        defs.push(`<linearGradient id="${id}-${key}" x1="0" y1="0" x2="1" y2="0">${pr.map(([o, k, a]) => `<stop offset="${o}" stop-color="${ink[k]}" stop-opacity="${Math.min(1, +(a * (k === 'l' ? kl : ks)).toFixed(3))}"/>`).join('')}</linearGradient>`);
      }
      fx[m].push(`<rect x="${i * P}" y="${y0}" width="${P}" height="${H}" fill="url(#${id}-${key})"/>`);
    }
  }
  for (let i = 0; i < n; i++) {
    const x = i * P, cx = x + P / 2;
    clips.push(`<clipPath id="${id}-c${i}"><rect x="${x}" y="${y0}" width="${P}" height="${H}"/></clipPath>`);
    const tf = settle ? `style="transform-origin:${cx}px 0;transform:scale(-${mag},1)"` : `transform="translate(${cx} 0) scale(-${mag} 1) translate(${-cx} 0)"`;
    reeds.push(`<g clip-path="url(#${id}-c${i})"><use href="#${id}-B" ${tf}/></g>`);
  }
  return `<svg class="fl-svg ${cls}" viewBox="0 0 ${W} ${foot}" width="${W}" height="${foot}" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">`
    + `<defs><g id="${id}-B">${B}</g><clipPath id="${id}-bc"><rect x="0" y="${y0}" width="${W}" height="${H}"/></clipPath>${defs.join('')}${clips.join('')}</defs>`
    + `<g class="fl-flat">${flat.join('')}</g>`
    + `<g class="${settle ? 'fl-settle' : ''}">${reeds.join('')}</g>`
    + `<g clip-path="url(#${id}-bc)">${over.join('')}</g>`
    + `<g class="fl-fx fl-fx--l">${fx.l.join('')}</g><g class="fl-fx fl-fx--d">${fx.d.join('')}</g>`
    + `<rect x="0" y="${y0 - 0.5}" width="${W}" height="1" style="fill:var(--ink)" fill-opacity="0.18"/><rect x="0" y="${foot - 0.5}" width="${W}" height="1" style="fill:var(--ink)" fill-opacity="0.18"/></svg>`;
}

// the palette as vertical fields by share across W, each interior edge on a reed's centre (one reed holds the edge, mirrored: the fringe)
export function shareFields(ctx, W, P = 12) {
  const cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
  let cum = 0, x = 0;
  return cols.map((c, i) => {
    cum += W * c.share;
    const e = i === cols.length - 1 ? W : Math.max(x + P, Math.round((cum - P / 2) / P) * P + P / 2);
    const f = { x, w: e - x, fill: c.hex, c }; x = e; return f;
  });
}
