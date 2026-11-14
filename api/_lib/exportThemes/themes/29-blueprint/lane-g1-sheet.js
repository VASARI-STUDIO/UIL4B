// Theme 29 (Blueprint), lane g1: the drawing sheet and redlines, copied from guidelines.js (which does not export them) so the brand and voice
// pages sit in the same frame as the round 1 sheets. Kept in step by hand: the frame, zones, centring marks and title block are the spec's 2.3 and 2.4.
import { esc as A } from '../../engine/brand.js';
import { inkW, fitW } from './measure.js';
import { phTight } from './ph.js';

export const PX = 3.7795; // px per mm at 96 dpi
export const ZX = Array.from({ length: 9 }, (_, k) => 40 + 188.375 * k);
export const ZY = Array.from({ length: 7 }, (_, j) => 40 + (1043 / 6) * j);
export const r1 = (n) => Math.round(n * 10) / 10;
const crisp = (v) => Math.round(v) + 0.5;
// words in the sheet's sans, with only a literal value in mono: [1:20] becomes a mono span (theme text only, never a brand string)
const mixed = (t) => A(t).replace(/\[(.+?)\]/g, '<span class="v">$1</span>');

// redlines: one list per page, drawn as one svg plus horizontal values
export function reds() {
  const lines = [], vals = [];
  const seg = (a, b, w) => lines.push(`<line x1="${r1(a[0])}" y1="${r1(a[1])}" x2="${r1(b[0])}" y2="${r1(b[1])}" stroke-width="${w}"/>`);
  const tick = (p, u, w) => { const c = Math.SQRT1_2, t = [u[0] * c - u[1] * c, u[0] * c + u[1] * c]; seg([p[0] - t[0] * 5, p[1] - t[1] * 5], [p[0] + t[0] * 5, p[1] + t[1] * 5], w); };
  return {
    // a dimension for the edge p1 to p2, offset d along the outward normal n. place: 'out' puts the value 12 px clear of the line, 'side' right of a vertical line, 'left' left of it
    dim(p1, p2, n, { d = 28, value, w = 1.5, place = 'out' } = {}) {
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), u = [(p2[0] - p1[0]) / len, (p2[1] - p1[1]) / len];
      const q1 = [p1[0] + n[0] * d, p1[1] + n[1] * d], q2 = [p2[0] + n[0] * d, p2[1] + n[1] * d];
      for (const [p, q] of [[p1, q1], [p2, q2]]) lines.push(`<line x1="${r1(p[0] + n[0] * 4)}" y1="${r1(p[1] + n[1] * 4)}" x2="${r1(q[0] + n[0] * 6)}" y2="${r1(q[1] + n[1] * 6)}" stroke-width="1"/>`);
      seg(q1, q2, w); tick(q1, u, w); tick(q2, u, w);
      const m = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];
      const style = place === 'side' ? `left:${r1(m[0] + 12)}px;top:${r1(m[1] - 6)}px` : place === 'left' ? `left:${r1(m[0] - 12)}px;top:${r1(m[1] - 6)}px;transform:translateX(-100%)` : `left:${r1(m[0] + n[0] * 12)}px;top:${r1(m[1] + n[1] * 12 - 6)}px;transform:translateX(-50%)`;
      vals.push(`<span class="rv" style="${style}">${A(value)}</span>`);
    },
    svg: () => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" stroke="var(--red)" aria-hidden="true">${lines.join('')}</svg>${vals.join('')}`,
  };
}

// the sheet: frame, zone references, centring marks, title block
export function sheet(ctx, id, { drawing, section, scale }, inner) {
  const B = ctx.brand, p = ctx.pages.find((x) => x.id === id), cell = (k, lab, val) => `<span class="tl" style="left:${ZX[k] + 24}px;top:987px">${A(lab)}</span>${val}`;
  const sec = section ?? (p.section ? `${String(p.section.n).padStart(2, '0')} ${p.section.title}` : 'Front matter');
  const d = new Date(B.version.date + 'T00:00:00Z');
  const rev = `${B.version.number}, ${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  const size = [22, 20, 18].find((s) => inkW('Chivo-500', drawing, s) <= 328) || 18;
  const no = String(ctx.pageNo(id)).padStart(3, '0'), total = String(ctx.pages.length).padStart(3, '0');
  const lw = fitW(ctx, 'horizontal', 140, 40), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  let svg = `<rect x="16" y="16" width="1555" height="1091" stroke="var(--quiet)" stroke-width=".75"/>`;
  for (let k = 0; k < 9; k++) { const x = crisp(ZX[k]); svg += `<path d="M${x} 16V40M${x} 1083V1107" stroke="var(--quiet)" stroke-width="1"/>`; }
  for (let j = 0; j < 7; j++) { const y = crisp(ZY[j]); svg += `<path d="M16 ${y}H40M1547 ${y}H1571" stroke="var(--quiet)" stroke-width="1"/>`; }
  svg += `<path d="M793.5 0V40M793.5 1083V1123M0 561.5H40M1547 561.5H1587" stroke="var(--ink)" stroke-width="1.5"/>`;
  svg += `<rect x="40" y="40" width="1507" height="1043" stroke="var(--ink)" stroke-width="1.5"/><path d="M40 971H1547" stroke="var(--ink)" stroke-width="1.5"/>`;
  for (const k of [2, 3, 4, 5, 6, 7]) svg += `<path d="M${crisp(ZX[k])} 972V1082" stroke="var(--hair)" stroke-width="1"/>`;
  const zw = 188.375;
  const nums = Array.from({ length: 8 }, (_, k) => [22, 1089].map((y) => `<span class="zr" style="left:${ZX[k]}px;width:${zw}px;top:${y}px">${k + 1}</span>`).join('')).join('');
  const lets = Array.from({ length: 6 }, (_, j) => [22, 1553].map((x) => `<span class="zr" style="left:${x}px;width:12px;top:${ZY[j] + 86.9 - 7}px">${'ABCDEF'[j]}</span>`).join('')).join('');
  const tb = [
    cell(0, 'Drawing', `<span class="tv t" style="left:${ZX[0] + 24}px;top:1007px;font-size:${size}px">${A(drawing)}</span>`),
    cell(2, 'Section', `<span class="tv" style="left:${ZX[2] + 24}px;top:1007px">${A(sec)}</span>`),
    cell(3, 'Scale', `<span class="tv nw" style="left:${ZX[3] + 24}px;top:1007px">${mixed(scale)}</span>`),
    cell(4, 'Revision', `<span class="tv" style="left:${ZX[4] + 24}px;top:1007px">${A(rev)}</span>`),
    cell(5, 'Project', `<span class="tv" style="left:${ZX[5] + 24}px;top:1007px;font-weight:500">${A(B.name)}</span><span class="tv c-quiet" style="left:${ZX[5] + 24}px;top:1025px;color:var(--quiet)">Brand guidelines</span>`),
    cell(6, 'Sheet', `<span class="sn" style="left:${ZX[6] + 24}px;top:1007px">${no}<small> of ${total}</small></span>`),
    `<span class="a" style="left:${ZX[7] + 24}px;top:${1027 - lh / 2}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, label: 'Logo' })}</span>`,
  ].join('');
  return `<section class="pg${phTight(ctx, id)}" data-page="${id}">${inner}<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${nums}${lets}${tb}</section>`;
}

// a revision cloud: the drafter's scalloped contour round a change, drawn clockwise so every arc bulges outward
export function cloud(x, y, w, h, bump = 9) {
  const nx = Math.max(2, Math.round(w / (bump * 2))), ny = Math.max(2, Math.round(h / (bump * 2)));
  const sx = w / nx, sy = h / ny, rx = sx / 2 + 0.5, ry = sy / 2 + 0.5;
  let d = `M${r1(x)} ${r1(y)}`;
  for (let i = 1; i <= nx; i++) d += `A${r1(rx)} ${r1(rx)} 0 0 1 ${r1(x + i * sx)} ${r1(y)}`;
  for (let i = 1; i <= ny; i++) d += `A${r1(ry)} ${r1(ry)} 0 0 1 ${r1(x + w)} ${r1(y + i * sy)}`;
  for (let i = 1; i <= nx; i++) d += `A${r1(rx)} ${r1(rx)} 0 0 1 ${r1(x + w - i * sx)} ${r1(y + h)}`;
  for (let i = 1; i <= ny; i++) d += `A${r1(ry)} ${r1(ry)} 0 0 1 ${r1(x)} ${r1(y + h - i * sy)}`;
  return d + 'Z';
}

// a detail tag: the drafter's numbered circle, the number centred in it
export const detailTag = (cx, cy, n, r = 14) => `<svg class="a" style="left:${r1(cx - r - 1)}px;top:${r1(cy - r - 1)}px" width="${2 * r + 2}" height="${2 * r + 2}" fill="none" stroke="var(--ink)" aria-hidden="true"><circle cx="${r + 1}" cy="${r + 1}" r="${r}" stroke-width="1"/></svg><span class="a c-mono" style="left:${r1(cx - r)}px;top:${r1(cy - 8)}px;width:${2 * r}px;text-align:center">${n}</span>`;
