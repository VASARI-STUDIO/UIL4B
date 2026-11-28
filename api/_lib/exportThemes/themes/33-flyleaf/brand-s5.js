// Theme 33, Flyleaf, slice 5: the studio's review fixes that need a page of their own (16 Values with tall proportional colour bars) and, below, the A4 portrait edition.
import { hexToRgb } from '../../engine/color.js';
import { tones, geo, own, at, hr, mono, page, textCol, groundsOf, hslOf, n1 } from './kit.js';
import { guidelines as A, colours, edged } from './brand-a.js';

const wide = (id, fn) => (ctx) => (geo(ctx).portrait ? A[id](ctx) : fn(ctx));

export const guidelines = {
  // 3.4 Values (Horizon 07): the table narrowed, and the palette as tall bars on the right, each as wide as its share of the page (a floor so a small colour still shows)
  values: wide('values', (ctx) => {
    const K = geo(ctx), cs = colours(ctx), E = ctx.esc, hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
    const e = { x: K.ex.x, y: K.ex.y, w: 500, h: K.ex.h };
    const widths = [230, 120, 100, 150, 130]; if (hasCmyk) widths.push(110);
    const sum = widths.reduce((a, b) => a + b, 0), f = e.w / sum, cw = widths.map((w) => w * f);
    const xs = cw.reduce((a, w, i) => (a.push(i ? a[i - 1] + cw[i - 1] : e.x), a), []);
    const heads = ['Name', 'Role', 'HEX', 'RGB', 'HSL', 'CMYK'].slice(0, widths.length);
    const head = heads.map((h, i) => at(xs[i] + (i === 0 ? 40 : 0), e.y, cw[i], 14, mono(h))).join('') + hr(e.x, e.y + 26, e.w);
    const rh = Math.min(64, Math.floor((e.h - 40) / cs.length));
    const hair = tones(ctx, ctx.roles.light.surface).hair;
    const rows = cs.map((c, i) => {
      const y = e.y + 26 + i * rh, v = [own(ctx, c.name), own(ctx, c.roleText), c.hex.toUpperCase(), hexToRgb(c.hex).join(' '), hslOf(c.hex).join(' '), hasCmyk && Array.isArray(c.cmyk) ? c.cmyk.join(' ') : ''];
      return at(e.x, y + rh / 2 - 12, 28, 24, '', { style: `background:${c.hex};border:.5px solid ${hair}` })
        + v.slice(0, widths.length).map((s, j) => at(xs[j] + (j === 0 ? 40 : 0), y + rh / 2 - 9, cw[j] - (j === 0 ? 44 : 8), 18, j === 0 ? `<span class="b" style="font-size:${K.body + 1}px;white-space:nowrap">${s}</span>` : `<span class="m${j === 2 ? ' i' : ''}">${s}</span>`)).join('')
        + hr(e.x, y + rh, e.w);
    }).join('');
    const bx = e.x + e.w + 40, bwid = K.W - K.R - bx, top = K.y0 + 4, bh = K.y1 - top;
    const tot = cs.reduce((a, c) => a + (c.share || 1), 0), fl = cs.map((c) => Math.max((c.share || 1) / tot, 0.2)), ft = fl.reduce((a, b) => a + b, 0);
    let px = bx;
    const bars = cs.map((c, i) => { const w = bwid * fl[i] / ft, o = at(px, top, w + 0.5, bh, '', { style: `background:${c.hex};${edged(ctx, c.hex)}` }); px += w; return o; }).join('');
    return page(ctx, 'values', { body: textCol(ctx, 'values', 'Every colour with the values to build it. HSL is in degrees and percent. The bars show how much of a page each one takes.') + head + rows + bars });
  }),
};
void n1;
