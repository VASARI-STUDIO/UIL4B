// Theme 22, Stub: the style guide's cover. The plate is the ticket's face: the logo and the guide's name across the head, one statement in the display face, six facts in three columns
// under dotted rules, and the palette as whole fields that meet at a dotted seam and run down to the perforation. Every fact comes from engine/styleguide.js.
import { colourFacts } from '../../engine/styleguide.js';
import { esc as A } from '../../engine/brand.js';
import { PL, PR, PERF, X0, XR, CW, CH, pad2, pct, weightName, longDate, tw, nLines, uniqueColours, para, kit, art, slotH, at, rect, hr, shell } from './guide-kit.js';

export function cover(ctx) {
  const K = kit(ctx), B = ctx.brand, G = ctx.logo.geos.colour, F = uniqueColours(colourFacts(ctx)), { R, S } = K, slot = ctx.edition === 'slot';
  // the palette: the colours that carry a share (six at most) stand tall, and the rest of the palette, each hex once, runs as a thin second row under them
  let cols = F.filter((f) => (f.share ?? 0) >= 0.01).slice(0, 6);
  if (!cols.length) cols = F.slice(0, 6);
  const rest = F.filter((f) => !cols.includes(f)).slice(0, 12), ROW2 = rest.length ? 56 : 0, MAIN_H = 300;
  const lw = Math.min(CW - 220, slot ? 104 : 232), lh = slot ? slotH(lw) : (lw * G.h) / G.w, logoY = 56;
  const logo = at(X0, logoY, art(ctx, 'colour', lw, { colourway: R.colourwayOn(R.paper), color: R.ink, ...(slot ? { h: lh } : {}) }))
    + at(XR - 190, logoY, `<div class="tk-h" style="text-align:right">Brand style guide</div><div class="tk-m tk-q" style="text-align:right;margin-top:4px">Version ${A(String(B.version.number))}</div>`, { w: 190 });
  const ruleY = logoY + Math.max(lh, 40) + 24, rule = hr(X0, ruleY, CW, R.ink);
  const d = B.fonts.display;
  const facts = [['Date', longDate(B.version.date)], ['Version', String(B.version.number)], ['Format', 'A4 portrait, 210 x 297 mm'], ['Display', `${d.family}, ${weightName(ctx.weights.heading)}`], ['Text', `${B.fonts.body.family}, ${weightName(ctx.weights.regular)} and ${weightName(ctx.weights.medium)}`], B.fonts.mono ? ['Mono', B.fonts.mono.family] : ['Scale', '1 : 1 at 96 dpi']];
  const gx = 24, fw = Math.floor((CW - 2 * gx) / 3), factH = facts.map(([, v]) => 2 + 10 + 16 + 4 + para(String(v), fw).h);
  const rowH = [Math.max(...factH.slice(0, 3)), Math.max(...factH.slice(3))], factsH = rowH[0] + 20 + rowH[1];
  // the statement is the largest size that sets in four lines and leaves the palette its tall row (300 px, else 160) and the thin row under it to stand in
  const line = B.lines.primary, stmtY = ruleY + 36;
  const room = (nl, lineH) => PERF - (stmtY + nl * lineH + 40 + factsH + 40);
  let size = 28, lineH = Math.round(size * 1.08), nl = nLines(S.disp, line, size, CW, K.st);
  {
    for (const need of [MAIN_H + ROW2, 160 + ROW2]) {
      const s = [144, 128, 112, 96, 84, 72, 64, 56, 48, 40, 34, 28].find((z) => { const n = nLines(S.disp, line, z, CW, K.st); return n <= 4 && room(n, Math.round(z * 1.08)) >= need; });
      if (s) { size = s; lineH = Math.round(s * 1.08); nl = nLines(S.disp, line, s, CW, K.st); break; }
    }
  }
  const stmtB = stmtY + nl * lineH, factsY = stmtB + 40, avail = PERF - (factsY + factsH + 40) - ROW2;
  if (avail < 160) throw new Error(`Stub guide: the cover palette has ${avail} px to stand in`);
  const stripH = Math.min(avail, 420), slack = avail - stripH, stripY = PERF - ROW2 - stripH, up = Math.floor(slack * 0.4), down = Math.floor(slack * 0.6);
  const stmt = at(X0, stmtY + up, A(line), { w: CW, cls: 'tk-d tk-cv', style: `font-size:${size}px;line-height:${lineH}px;white-space:normal` });
  const cells = facts.map(([k, v], i) => {
    const x = X0 + (i % 3) * (fw + gx), y = factsY + up + down + (i < 3 ? 0 : rowH[0] + 20);
    return rect(x, y, fw, 2, `border-top:2px dotted ${R.ink}`) + at(x, y + 10, `<div class="tk-hd tk-q">${A(k)}</div><div class="tk-n" style="margin-top:4px;color:var(--ink)">${A(v)}</div>`, { w: fw });
  }).join('');
  const W = PR - PL, seam = `border-left:2px dotted ${R.paper};`;
  // the tall row: equal fields, the label at the head of each; the thin row under it: the rest of the palette, the hex only where it fits
  const n = cols.length, edge = (i) => PL + Math.round((i * W) / n);
  const fields = cols.map((f, i) => {
    const x = edge(i), w = edge(i + 1) - x, ink = R.bestInk(f.hex, 12, 500);
    return rect(x, stripY, w, stripH, `background:${f.hex};${R.near(f.hex) ? `outline:1px solid ${R.edge};outline-offset:-1px;` : ''}${i ? seam : ''}`,
      at(12, 14, `<div class="tk-m" style="font-weight:500;color:${ink}">${pad2(i + 1)}</div><div class="tk-hd tk-wrap" style="margin-top:6px;color:${ink};white-space:normal">${A(f.name)}</div><div class="tk-m" style="margin-top:4px;font-weight:500;color:${ink}">${A(f.hex.toUpperCase())}</div><div class="tk-m" style="margin-top:2px;font-weight:500;color:${ink}">${A(pct(f.share))}</div>`, { w: w - 24 }));
  }).join('');
  const m = rest.length, edge2 = (i) => PL + Math.round((i * W) / m);
  const thin = rest.map((f, i) => {
    const x = edge2(i), w = edge2(i + 1) - x, ink = R.bestInk(f.hex, 12, 500), hex6 = f.hex.replace('#', '').toUpperCase();
    return rect(x, PERF - ROW2, w, ROW2, `background:${f.hex};${R.near(f.hex) ? `outline:1px solid ${R.edge};outline-offset:-1px;` : ''}${i ? seam : ''}`,
      at(8, 10, `<div class="tk-m" style="font-weight:500;color:${ink}">${pad2(n + i + 1)}</div>${tw(CH[400], hex6, 12) + 16 <= w ? `<div class="tk-m" style="margin-top:2px;font-weight:500;color:${ink}">${A(hex6)}</div>` : ''}`, { w: w - 16 }));
  }).join('');
  return shell(ctx, 'cover', logo + rule + stmt + cells + fields + thin, '', { cover: true });
}
