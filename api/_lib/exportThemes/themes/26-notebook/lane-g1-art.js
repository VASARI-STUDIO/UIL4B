// Theme 26, Notebook, lane g1: the one new piece of brand art this lane photographs, the billboard on the messaging spread.
// Like art.js, every colour, face, size and word comes from the brand's data; the theme draws nothing of its own.
import { A, tokens, wrap, advance } from './helpers.js';

// A billboard in the reversed colourway: the brand's last other line (the one the book prints least), the horizontal logo and the site
// address. The line is set at the largest size that fits two lines in the room the logo leaves.
export function billboard(ctx, w, h) {
  const B = ctx.brand, W = ctx.weights, d = B.fonts.display, b = B.fonts.body, rev = B.logo.colourways.reversed;
  const dStem = tokens(ctx)._displayStem, others = B.lines.others || [];
  const line = others.length ? others[others.length - 1] : B.lines.primary;
  const mg = 56, lw = 280, g = ctx.logo.geos.horizontal, lh = lw * g.h / g.w;
  const tw = w - 2 * mg, room = h - 2 * mg - lh - 32;
  let size = 160, ls = wrap(dStem, size, line, tw, 0);
  for (; size > 40; size -= 4) {
    ls = wrap(dStem, size, line, tw, 0);
    if (ls.length <= 2 && ls.length * size <= room && ls.every((x) => advance(dStem, size, x, 0) <= tw + 0.5)) break;
  }
  const stretch = d.stretch ? `font-stretch:${d.stretch}%;` : '';
  const abs = (style, inner) => `<div style="position:absolute;${style}">${inner}</div>`;
  const inner = `<div style="position:absolute;inset:0;background:${rev.ground}">`
    + abs(`left:${mg}px;top:${mg}px;font-family:'${d.family}',sans-serif;font-weight:${W.heading};${stretch}font-size:${size}px;line-height:${size}px;letter-spacing:-0.01em;color:${rev.name}`,
      ls.map((s) => `<span style="display:block;white-space:nowrap">${A(s)}</span>`).join(''))
    + abs(`left:${mg}px;bottom:${mg}px`, ctx.logo.html('horizontal', { width: lw, colourway: 'reversed' }))
    + abs(`right:${mg}px;bottom:${mg}px;font-family:'${b.family}',sans-serif;font-weight:${W.strong};font-size:26px;line-height:32px;color:${rev.name}`, A(B.applications.site.url))
    + '</div>';
  return { html: ctx.artPage(inner, { w, h }), w, h };
}
