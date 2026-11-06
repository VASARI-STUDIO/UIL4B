// Shared page helpers for theme 09 (Blueprint). Pages are 794 x 1123 and drawn like a drawing sheet: a running head, a title,
// Brick redlines with end ticks, and a title block. Every number a redline prints is the length it draws (px at 1x, or mm where a page says so).
import { esc } from '../../engine/brand.js';

export const A = esc;
export const ratioText = (t) => `${t} : 1`;
export const nameOf = (ctx, id) => { const c = ctx.byId[id]; return ctx.tones.some((t) => t.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
// width that fits a logo version inside a box
export const fit = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };

// Redlines. Each draws one measurement; `n` is the printed value and must equal the drawn length (callers pass the same number).
// Horizontal: a line `w` px long from (x, y) with end ticks. Vertical: `h` px long. Labels sit beside, never over, the line.
export const hline = (x, y, w, n, { label = n, dx = 0, dy = -16 } = {}) => `<i class="rl h" style="left:${x}px;top:${y}px;width:${w}px"></i><b class="rn" style="left:${x + w / 2 + dx}px;top:${y + dy}px;transform:translateX(-50%)">${A(label)}</b>`;
export const vline = (x, y, h, n, { label = n, dx = 8, dy = 0 } = {}) => `<i class="rl v" style="left:${x}px;top:${y}px;height:${h}px"></i><b class="rn" style="left:${x + dx}px;top:${y + h / 2 - 6 + dy}px">${A(label)}</b>`;

// the standard sheet: running head, title, body, folio
export function std(ctx, id, inner, cls = '') {
  const p = ctx.pages.find((x) => x.id === id);
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand guidelines, blueprint</span><span class="num">${ctx.pageNo(id)}</span></div>`;
  return `<section class="pg pg--std ${cls}" data-page="${id}">${head}<h1 class="ttl">${A(p.title)}</h1>${inner}</section>`;
}
// the title block: a ruled grid of labelled cells, as on a drawing sheet
export const cell = (k, v, big = false) => `<div class="cell"><span class="k">${A(k)}</span>${big ? `<span class="big">${A(v)}</span>` : A(v)}</div>`;
