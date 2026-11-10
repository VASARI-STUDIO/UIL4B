// Shared page helpers for theme 04 (Standards). Pages are 1123 x 794: a ruled running head, a 250 px column for the title and numbered clauses, and the work to its right.
import { esc } from '../../engine/brand.js';
export const A = esc;
export const ratioText = (t) => `${t} : 1`;
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
// clauses are numbered from the page reference (3.2 -> 3.2.1) so they stay unique across a section
export const clauses = (ref, items) => `<ul class="rules">${items.map((t, i) => `<li><span>${ref ? `${ref}.${i + 1}` : i + 1}</span><div>${t}</div></li>`).join('')}</ul>`;
// the standard page: running head with folio, title column (title, one paragraph, clauses), work area
export function std(ctx, id, { lead, rules = [], work, cls = '' }) {
  const p = ctx.pages.find((x) => x.id === id), sec = p.section ? `${p.section.n} ${p.section.title}` : p.title;
  return `<section class="pg pg--std ${cls}" data-page="${id}"><div class="hd"><span>${A(ctx.brand.name)} graphic standards</span><span>${A(sec)}</span><span class="fo num">${ctx.pageNo(id)}</span></div>
<div class="side"><h2>${A(p.title)}</h2><p class="lead">${lead}</p>${rules.length ? clauses(p.ref, rules) : ''}</div><div class="work">${work}</div></section>`;
}
// a wide page: the running head, a title strip (title and one paragraph), then the work across the whole page
export function wide(ctx, id, { lead, work, cls = '' }) {
  const p = ctx.pages.find((x) => x.id === id), sec = p.section ? `${p.section.n} ${p.section.title}` : p.title;
  return `<section class="pg pg--std pg--wide ${cls}" data-page="${id}"><div class="hd"><span>${A(ctx.brand.name)} graphic standards</span><span>${A(sec)}</span><span class="fo num">${ctx.pageNo(id)}</span></div>
<div class="dr-tl"><h2>${A(p.title)}</h2><p class="lead">${lead}</p></div><div class="dr-wk">${work}</div></section>`;
}

// ---- The drawings. No photograph is licensed yet, so every picture in the manual is drawn in its own line style. ----
// Everything is drawn in x: the waterline is y = 0, heights above it are negative. The ferry is a small double-ended river ferry,
// 160x long with its left end at x = 0: a Hull hull with the name on the topsides, the wake along the waterline in Buoy,
// a cabin with its windows, a wheelhouse at the middle with a mast, open ends with rails, and a lifebuoy at each end.
// Lines are 1 px at any scale (vector-effect); fills scale with the drawing. Styles are the dr- block in index.js.
const n2 = (v) => +(+v).toFixed(2);
export const FERRY = { L: 160, sheer: 10, draft: 4, cabin: [36, 124, 18], roof: 19.2, wheel: [66, 94, 26], mast: 33, buoys: [21, 139], ends: [36, 124] };

// the wake device: a ribbon x thick swinging x and repeating every 6x, cut square at both ends: the logo's own construction, at x = X
export function wakeD(w, y0, x0 = 0, X = 1) {
  const half = 3 * X, a = X / 2, N = 12, pts = [];
  for (let k = -2; k * half <= w + 2 * half; k++) for (let i = 0; i < N; i++) {
    const t = i / N, px = (k + t) * half, s = k % 2 === 0 ? 1 : -1;
    pts.push([px, s * 4 * a * t * (1 - t), s * 4 * a * (1 - 2 * t)]);
  }
  const up = [], dn = [];
  for (const [px, py, sl] of pts) { const h = Math.hypot(1, sl), nx = -sl / h, ny = 1 / h; up.push([px - (nx * X) / 2, py - (ny * X) / 2]); dn.push([px + (nx * X) / 2, py + (ny * X) / 2]); }
  const clip = (p, inside, cut) => { const o = []; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length], iq = inside(q), ir = inside(r); if (iq) o.push(q); if (iq !== ir) o.push(cut(q, r)); } return o; };
  const at = (xv) => (q, r) => { const t = (xv - q[0]) / (r[0] - q[0]); return [xv, q[1] + t * (r[1] - q[1])]; };
  let c = clip([...up, ...dn.reverse()], (p) => p[0] >= 0, at(0)); c = clip(c, (p) => p[0] <= w, at(w));
  return 'M' + c.map((p) => `${n2(p[0] + x0)} ${n2(p[1] + y0)}`).join(' L') + ' Z';
}

// the logo set into a drawing at height h (in drawing units): the real logo in the showcase edition, the slot frame in the slot edition
export function drawnLogo(ctx, id, x, y, h, { colourway, fill, frame = 'var(--dark-ink)', transform = '', filter = '' } = {}) {
  const g = ctx.logo.geos[id], w = (h * g.w) / g.h, tf = transform ? ` transform="${transform}"` : '', fl = filter ? ` style="filter:${filter}"` : '';
  if (ctx.edition === 'slot') return `<g${tf}${fl}><rect class="dr-slot" x="${n2(x)}" y="${n2(y)}" width="${n2(w)}" height="${n2(h)}" style="stroke:${frame}"/></g>`;
  return `<g${tf}${fl}>${ctx.logo.svg(id, { colourway, width: n2(w), fill }).replace('<svg ', `<svg x="${n2(x)}" y="${n2(y)}" `)}</g>`;
}

const ring = (cx, cy, r, ri) => `M${n2(cx - r)} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0ZM${n2(cx - ri)} ${cy}a${ri} ${ri} 0 1 0 ${2 * ri} 0a${ri} ${ri} 0 1 0 ${-2 * ri} 0Z`;

// the ferry in side elevation, its left end at x0. logo: the version set on the topsides; logoFill recolours it (the misuse sheet)
export function ferryArt(ctx, { x0 = 0, logo = 'reversed', logoH = 5, logoFill, logoTf = '' } = {}) {
  const F = FERRY, L = F.L, X = (v) => n2(x0 + v), s = -F.sheer;
  const hull = `<path class="dr-hull" d="M${X(0)} ${s}H${X(L)}C${X(L - 2)} -6 ${X(L - 4)} -2 ${X(L - 6)} 0H${X(6)}C${X(4)} -2 ${X(2)} -6 ${X(0)} ${s}Z"/>`;
  const under = `<path class="dr-ld" d="M${X(6)} 0C${X(8)} 2.5 ${X(10)} ${F.draft} ${X(14)} ${F.draft}H${X(L - 14)}C${X(L - 10)} ${F.draft} ${X(L - 8)} 2.5 ${X(L - 6)} 0"/>`;
  const wake = `<path class="dr-buoy" d="${wakeD(L - 20, -2, x0 + 10)}"/>`;
  // rails at the open ends, a stanchion every 6x (one repeat of the wake)
  let rail = `M${X(2)} -15H${X(F.ends[0])}M${X(F.ends[1])} -15H${X(L - 2)}`;
  for (let k = 6; k <= 30; k += 6) rail += `M${X(k)} ${s}V-15M${X(L - k)} ${s}V-15`;
  const [c0, c1, ct] = F.cabin, [w0, w1, wt] = F.wheel;
  let win = '';
  for (let k = 0; k < 7; k++) win += `<rect class="dr-hull" x="${X(c0 + 4 + k * 12)}" y="-16.5" width="8" height="4"/>`;
  for (let k = 0; k < 3; k++) win += `<rect class="dr-hull" x="${X(w0 + 3 + k * 8)}" y="-24.6" width="6" height="3"/>`;
  const cabin = `<rect class="dr-box" x="${X(c0)}" y="${-ct}" width="${c1 - c0}" height="${ct - F.sheer}"/><rect class="dr-hull" x="${X(c0 - 3)}" y="${-F.roof}" width="${c1 - c0 + 6}" height="${n2(F.roof - ct)}"/>`;
  const wheel = `<rect class="dr-box" x="${X(w0)}" y="${-wt}" width="${w1 - w0}" height="${n2(wt - F.roof)}"/><rect class="dr-hull" x="${X(w0 - 2)}" y="${-wt - 1}" width="${w1 - w0 + 4}" height="1"/><path class="dr-l" d="M${X(L / 2)} ${-wt - 1}V${-F.mast}"/><circle class="dr-box" cx="${X(L / 2)}" cy="${-F.mast - 0.7}" r="0.7"/>`;
  // the starboard sidelights at each end of the wheelhouse: the green that the success colour is named for
  const lights = `<rect class="dr-go" x="${X(w0 - 1.6)}" y="-24.2" width="1.6" height="1.8"/><rect class="dr-go" x="${X(w1)}" y="-24.2" width="1.6" height="1.8"/>`;
  const buoys = F.buoys.map((b) => `<path class="dr-buoy dr-ring" fill-rule="evenodd" d="${ring(x0 + b, -12.6, 2.2, 1.2)}"/>`).join('');
  const g = ctx.logo.geos[logo], lw = (logoH * g.w) / g.h;
  const name = logo ? drawnLogo(ctx, logo, x0 + (L - lw) / 2, -3.2 - logoH - 0.6, logoH, { fill: logoFill, transform: logoTf, ...(logoFill ? { frame: logoFill } : {}) }) : '';
  return `${under}${hull}${wake}${name}<path class="dr-l" d="${rail}"/>${cabin}${win}${wheel}${lights}${buoys}`;
}

// Queens Wharf in elevation, to the left of x = 0: the deck on piles, the departures sign on its post, and the gangway onto the ferry
export function wharfArt(x1 = -3) {
  const x0 = x1 - 64;
  let piles = '', under = '';
  for (let x = x1 - 4; x > x0; x -= 6) { piles += `M${n2(x)} -4.6V0`; under += `M${n2(x)} 0V5`; }
  return `<rect class="dr-hull" x="${x0}" y="-6" width="${x1 - x0}" height="1.4"/><path class="dr-l" d="${piles}"/><path class="dr-ld" d="${under}"/>
<path class="dr-l" d="M${x1 - 26} -6V-12"/><rect class="dr-hull" x="${x1 - 34}" y="-19" width="16" height="7"/><rect class="dr-buoy" x="${x1 - 34}" y="-16.4" width="16" height="1.4"/>
<path class="dr-l" d="M${x1 - 2} -6L${x1 + 8} -10M${x1 - 2} -9.5L${x1 + 8} -13.5M${x1 - 2} -6V-9.5M${x1 + 8} -10V-13.5"/>`;
}

// the far shore, the river and the low sun: the same world wherever a drawing is cropped, so every crop lines up with the hull sheet
const SHORE = [[-120, -96, 2.5], [-70, -58, 3.5], [-30, -14, 2], [176, 196, 2.8], [204, 212, 4.4], [232, 256, 2.2], [280, 292, 3.2]];
export function worldArt({ x0 = -140, x1 = 320, sun = true, sunX = 226 } = {}) {
  let sh = `M${x0} -3`;
  for (const [a, b, h] of SHORE) if (b > x0 && a < x1) sh += `H${Math.max(a, x0)}V${n2(-3 - h)}H${Math.min(b, x1)}V-3`;
  sh += `H${x1}`;
  return `<path class="dr-q" d="${sh}"/>${sun ? `<path class="dr-q" d="M${sunX - 6} -3a6 6 0 0 1 12 0"/>` : ''}<path class="dr-l" d="M${x0} 0H${x1}"/>`;
}

// one crop of the world: [x, y, w, h] in x, cut to the frame it is set in (slice), the way a photograph would be cropped
export function crop(ctx, vb, { label = 'Drawing', wharf = false, ferry = {}, extra = '', tilt = 0, cls = '', sunX } = {}) {
  const [x, y, w, h] = vb, cx = x + w / 2, cy = y + h / 2;
  const art = `${worldArt({ sunX })}${wharf ? wharfArt() : ''}${ferryArt(ctx, ferry)}${extra}`;
  return `<svg class="dr ${cls}" viewBox="${n2(x)} ${n2(y)} ${n2(w)} ${n2(h)}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${A(label)}"><g${tilt ? ` transform="rotate(${tilt} ${n2(cx)} ${n2(cy)})"` : ''}>${art}</g></svg>`;
}
// the crops the manual uses, named for the shots they stand in for
export const VIEWS = {
  crossing: [-14, -40, 214, 50], wide: [-40, -46, 260, 56], boarding: [-30, -24, 52, 30], deck: [0, -22, 42, 26],
  stockton: [148, -22, 90, 26], gangway: [-40, -36, 50, 52], wheel: [56, -36, 48, 24], topsides: [40, -16, 80, 18], busy: [34, -22, 60, 14],
};

// a wharf panel in elevation, 100 x 60 with its top left at 0 0, on two posts: dark is the flat Hull departures panel
// (the boarding row in Buoy, the other rows as rules), light is the timetable poster on the ground with a hairline edge. inner is drawn on the panel
export function wharfPanel(ctx, inner = '', { dark = true, label = 'Drawing' } = {}) {
  let rows = ''; for (let k = 0; k < 3; k++) rows += `M8 ${40 + k * 7}H92`;
  const face = dark ? `<rect class="dr-hull" x="0" y="0" width="100" height="60"/><rect class="dr-buoy" x="0" y="29" width="100" height="6"/><path class="dr-pl" d="${rows}"/>` : `<rect class="dr-box" x="0" y="0" width="100" height="60"/><path class="dr-q" d="${rows}"/>`;
  return `<svg class="dr" viewBox="-14 -10 128 90" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${A(label)}"><path class="dr-l" d="M20 60V78M80 60V78M-14 78H114"/>${face}${inner}</svg>`;
}

// the wake from the stern, in plan: the end of the hull at the top, the wake straight down the middle in Rope, the two arms of the wash either side
export function wakePlan(ctx, { label = 'Drawing' } = {}) {
  const hull = '<path class="dr-box" d="M-26 -60V-14C-26 -4 -14 0 0 0C14 0 26 -4 26 -14V-60"/><rect class="dr-box" x="-19" y="-60" width="38" height="44"/>';
  const wk = `<g transform="rotate(90)"><path class="dr-rope" d="${wakeD(96, 0, 2)}"/></g>`;
  return `<svg class="dr" viewBox="-70 -40 140 140" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${A(label)}">${hull}${wk}<path class="dr-qd" d="M-24 -6L-66 100M24 -6L66 100"/></svg>`;
}

// the wharf in plan, for where the camera stands: the wharf edge, the rail, the departures sign, a passenger (a circle) and the camera with its field of view
export function wharfPlan(ctx, { behind = true, label = 'Drawing' } = {}) {
  const P = behind ? [0, -16] : [0, -6], Cm = behind ? [0, -4] : [0, -30], dir = behind ? -1 : 1;
  const fov = `M${Cm[0]} ${Cm[1]}L-16 ${Cm[1] + dir * 34}M${Cm[0]} ${Cm[1]}L16 ${Cm[1] + dir * 34}`;
  const cam = `<path class="dr-hull" d="M${Cm[0]} ${Cm[1]}L-3 ${Cm[1] - dir * 4}H3Z"/>`;
  const face = behind ? `M0 ${P[1] - 3}V${P[1] - 5.5}` : `M0 ${P[1] - 3}V${P[1] - 5.5}`;
  return `<svg class="dr" viewBox="-40 -40 80 44" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${A(label)}"><rect class="dr-hull" x="-40" y="-0.6" width="80" height="1.2"/><path class="dr-ld" d="M-40 -2.4H40"/><rect class="dr-hull" x="-12" y="-33" width="24" height="2.4"/><path class="dr-qd" d="${fov}"/><circle class="dr-box" cx="${P[0]}" cy="${P[1]}" r="3"/><path class="dr-l" d="${face}"/>${cam}</svg>`;
}
