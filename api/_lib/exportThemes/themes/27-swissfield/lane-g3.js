// Swiss Field, lane g3: the hierarchy page, lane g3's one page in this theme's Free twelve (FREE_PAGES in swiss.js). A contrast page is drafted below, not exported.
// The ruler measures real things here. On Contrast every text pair stands as a column as tall as its ratio, on a 0 to 21 : 1 scale cut like the strip,
// the columns set side by side, tallest first, as the strip runs widest first. On Hierarchy every type step is set at its true px, and a solid ink bar
// exactly as tall as the step's size stands beside it. Nothing rises on either page: both take the whole width.
// Nothing here names a colour id, a hex or a sample brand's words; brand copy is printed whole.
import { A, nb, M, PAGE_W, CHROME, at, box, page, model, textWidth, wrap, faceStem, titleHtml, spell, cap1, weightName } from './swiss.js';

const r2 = (n) => Math.round(n * 100) / 100;
const hair = (x, y, w, color = 'var(--hair)') => box(`left:${r2(x)}px;top:${r2(y)}px;width:${r2(w)}px;height:1px;background:${color}`);
const head = (t, color = 'var(--ink)') => `<div class="c-head" style="color:${color}">${A(t)}</div>`;
const note = (t, color = 'var(--quiet)') => `<div class="c-note" style="color:${color}">${nb(t)}</div>`;
const val = (t) => `<span class="c-value">${A(t)}</span>`;
const MOD = 256, col = (k) => M + MOD * k; // the theme's grid: 80, 336, 592, 848, 1104, 1360, 1616
const FLOOR = 944;

// Folios follow the Free twelve in swiss.js. A page that list does not number yet prints 000 there; that page takes its place in the engine's list instead.
const wrapPage = (ctx, id, opts) => page(ctx, id, opts).replace(/(<span class="c-head rl fo">)000(<\/span>)/, `$1${String(ctx.pageNo(id)).padStart(3, '0')}$2`);

export function css() {
  return `.pg .g3-h{font:500 17px/24px var(--chrome)}
.pg .g3-n{font:400 17px/24px var(--chrome);text-wrap:pretty}
.pg .g3-r{font:500 32px/36px var(--chrome);letter-spacing:-0.01em;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .g3-s{white-space:normal}
.pg .g3-r2{font:500 24px/32px var(--chrome);letter-spacing:-0.01em;font-variant-numeric:tabular-nums;white-space:nowrap}`;
}

// a colour or tone name by id (pairs can name a tone, such as a hover)
const nameOf = (ctx, id) => (ctx.byId[id] || ctx.tones.find((t) => t.id === id) || { name: id }).name;

// ---------------------------------------------------------------- contrast (drafted as columns, superseded by the bars below; not exported)
// The page is a chart on the theme's terms: the scale's ticks hang like the strip's, the columns abut like its segments, and each column is the pair itself,
// its ground as the fill and its ratio set top-left in its text colour. Two 1 px lines in that text colour cross every column at 3 and 4.5 : 1, so a column
// shows which mark it clears. The label (who, on what, where it lands) sits on the page just above each column.
function contrastColumns(ctx) {
  const m = model(ctx), C = m.C, up = (h) => h.toUpperCase();
  const pairs = ctx.pairs.map((p, i) => ({ p, i })).sort((a, b) => b.p.ratio - a.p.ratio || a.i - b.i).map((o) => o.p), n = pairs.length;
  const SCALE_MAX = 21, x0 = 176, cw = (PAGE_W - M - x0) / n, lw = cw - 24;
  const lines = (stem, t, s = 17) => wrap(stem, t, s, lw).length;
  const lab = pairs.map((p) => {
    const fg = nameOf(ctx, p.fg), bg = `on ${nameOf(ctx, p.bg)}`;
    const a = lines(CHROME[500], fg), b = lines(CHROME[400], bg), c = lines(CHROME[400], p.use);
    return { fg, bg, h: 24 * (a + b + c) };
  });
  // the scale is as tall as the room above the tallest column's label allows, at most 600: labels never rise past y 296, under the title
  const room = (k) => FLOOR - 296 - 12 - lab[k].h;
  const chartH = Math.min(600, ...pairs.map((p, k) => (room(k) * SCALE_MAX) / p.ratio));
  const yOf = (r) => FLOOR - (r / SCALE_MAX) * chartH;

  let cols = '', labels = '';
  pairs.forEach((p, k) => {
    const x = x0 + cw * k, h = (p.ratio / SCALE_MAX) * chartH, top = FLOOR - h, onGround = up(p.bgHex) === up(m.L.surface);
    // a column on the page's own ground keeps a hairline edge, as the ground's part of the strip does
    const edge = onGround ? box('left:0;top:0;width:100%;height:100%;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none') : '';
    const marks = [3, 4.5].filter((r) => r < p.ratio).map((r) => hair(0, h - (r / SCALE_MAX) * chartH, cw, p.fgHex)).join('');
    cols += box(`left:${r2(x)}px;top:${r2(top)}px;width:${r2(cw)}px;height:${r2(h)}px;background:${p.bgHex};color:${p.fgHex}`,
      edge + marks + at(12, 12, `<div class="g3-r">${A(p.ratioText)} : 1</div>`));
    const L = lab[k];
    labels += box(`left:${r2(x + 12)}px;bottom:${r2(1080 - (top - 12))}px;width:${r2(lw)}px`,
      `<div class="g3-h" style="color:var(--ink)">${A(L.fg)}</div><div class="g3-n" style="color:var(--quiet)">${A(L.bg)}</div><div class="g3-n" style="color:var(--ink)">${nb(p.use)}</div>`);
  });

  // the scale: a tick for every whole ratio, hanging left from the chart's edge; 0, 3, 4.5 and 21 printed beside it
  let scale = hair(x0 - 16, FLOOR, PAGE_W - M - x0 + 16, 'var(--ink)');
  for (let r = 0; r <= SCALE_MAX; r++) scale += box(`left:${x0 - 16}px;top:${r2(yOf(r))}px;width:8px;height:1px;background:var(--quiet)`);
  const mark = (r, t) => at(0, yOf(r) - 10, val(t), { style: `left:auto;right:${PAGE_W - (x0 - 24)}px;color:var(--quiet);text-align:right` });
  scale += mark(0, '0') + mark(3, '3') + mark(4.5, '4.5') + mark(SCALE_MAX, `${SCALE_MAX} : 1`);

  // the rule and the pairs not used for text, top right on the grid's fifth line
  const bx = col(4), bw = PAGE_W - M - bx;
  const unused = (ctx.unusedPairs || []).map((p) => `${nameOf(ctx, p.fg)} on ${nameOf(ctx, p.bg)} ${p.ratioText} : 1`);
  const rule = at(bx, 152, `<div class="c-body" style="color:var(--ink)">Text needs 4.5 : 1. Type 24 px and over needs 3 : 1. The two lines across each column mark both.</div>`
    + (unused.length ? `<div style="margin-top:16px">${head('Not used for text', 'var(--quiet)')}${note(unused.join(', ') + '.', 'var(--ink)')}</div>` : ''), { w: Math.min(560, bw) });
  const title = titleHtml(ctx, 'Contrast', [`${cap1(spell(n))} text pairs, each as tall as its ratio.`, `${cap1(spell(n))} pairs, each as tall as its ratio.`], { w: Math.min(960, bx - 64 - M) });
  void C;
  return wrapPage(ctx, 'contrast', { body: title + rule + scale + cols + labels });
}

// ---------------------------------------------------------------- contrast
// The strip's own idea, turned on its side: every pair is a bar on a 0 to 21 : 1 scale, as long as its ratio, filled with its ground and carrying its ratio in its text
// colour, so the bar is the pair as it will be seen. The pairs sit in groups, one group to a ground, and the ground is named once, in the group's head; a row then
// names only the text colour and its use. Two 1 px lines in the text colour cross every bar that reaches 3 and 4.5 : 1. Nothing is printed twice: the ratio is
// the bar's length and its label, and a pair that holds only for large type says so beside its bar.
function contrast(ctx) {
  const m = model(ctx), up = (h) => h.toUpperCase();
  const SCALE_MAX = 21, bx0 = 848, bw = PAGE_W - M - 80 - bx0, xOf = (r) => bx0 + (r / SCALE_MAX) * bw;
  const groups = [];
  for (const p of ctx.pairs) { let g = groups.find((x) => x.bg === p.bg); if (!g) groups.push(g = { bg: p.bg, bgHex: p.bgHex, pairs: [] }); g.pairs.push(p); }
  groups.forEach((g) => g.pairs.sort((a, b) => b.ratio - a.ratio));
  const n = ctx.pairs.length, top = 336;
  const rh = [44, 40, 36, 32].find((h) => (n + groups.length) * h <= FLOOR - top) ?? 32, bh = rh - 8, tx = (rh - 24) / 2;
  const useW = bx0 - 48 - col(1);

  // the scale: 0, 3, 4.5 and 21 printed above the chart, a tick hanging from each, a hairline down the chart from 3 and 4.5
  const chartH = (n + groups.length) * rh;
  let out = '';
  [[0, '0'], [3, '3'], [4.5, '4.5']].forEach(([r, t]) => {
    out += at(xOf(r), 296, val(t), { style: 'color:var(--quiet)' }) + box(`left:${r2(xOf(r))}px;top:${top - 8}px;width:1px;height:8px;background:var(--quiet)`);
    if (r) out += box(`left:${r2(xOf(r))}px;top:${top}px;width:1px;height:${chartH}px;background:var(--hair)`);
  });
  out += at(0, 296, val(`${SCALE_MAX}:1`), { style: `left:auto;right:${PAGE_W - xOf(SCALE_MAX) - 0}px;text-align:right;color:var(--quiet)` }) + box(`left:${r2(xOf(SCALE_MAX))}px;top:${top - 8}px;width:1px;height:8px;background:var(--quiet)`);

  let y = top;
  for (const g of groups) {
    out += hair(M, y, PAGE_W - 2 * M, 'var(--ink)') + at(M, y + tx, `<div class="g3-h nw" style="color:var(--ink)">On ${A(nameOf(ctx, g.bg))}</div>`) + at(col(1), y + tx + 2, `<span class="c-value" style="color:var(--quiet)">${A(up(g.bgHex.replace('#', '')))}</span>`);
    y += rh;
    for (const p of g.pairs) {
      const w = (p.ratio / SCALE_MAX) * bw, onGround = up(p.bgHex) === up(m.L.surface);
      const edge = onGround ? box('left:0;top:0;width:100%;height:100%;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none') : '';
      const marks = [3, 4.5].filter((r) => r < p.ratio).map((r) => box(`left:${r2((r / SCALE_MAX) * bw)}px;top:0;width:1px;height:100%;background:${p.fgHex}`)).join('');
      const label = `${p.ratioText}:1`;
      out += at(M, y + tx, `<div class="g3-h nw" style="color:var(--ink)">${A(nameOf(ctx, p.fg))}</div>`)
        + at(col(1), y + tx, `<div class="g3-n nw" style="color:var(--quiet)">${A(p.use)}</div>`, { w: useW })
        + box(`left:${bx0}px;top:${y + 4}px;width:${r2(w)}px;height:${bh}px;background:${p.bgHex};color:${p.fgHex}`, edge + marks + at(12, (bh - 32) / 2, `<div class="g3-r2">${A(label)}</div>`))
        + (p.large ? at(bx0 + w + 16, y + tx, `<div class="g3-n nw" style="color:var(--ink)">${A(p.minSize)} px and over</div>`) : '');
      y += rh;
    }
  }
  out += hair(M, y, PAGE_W - 2 * M);
  const rule = at(col(4), 152, `<div class="c-body" style="color:var(--ink)">Text needs 4.5:1. Type 24 px and over needs 3:1. The lines inside a bar mark both.</div>`, { w: Math.min(560, PAGE_W - M - col(4)) });
  const title = titleHtml(ctx, 'Contrast', [`${cap1(spell(n))} text pairs, each as long as its ratio.`, `${cap1(spell(n))} pairs, each as long as its ratio.`], { w: Math.min(960, col(4) - 64 - M) });
  return page(ctx, 'contrast', { body: title + rule + out });
}

// ---------------------------------------------------------------- hierarchy
// Every step is set at its true px and its true line, from the brand's own scale, largest first. Beside each, a solid ink bar stands exactly as tall as the
// step's size across its first line's em box, so the steps read as a measured run down the page. The step's name and values sit at the left margin.
function hierarchy(ctx) {
  const B = ctx.brand, S = (B.type && B.type.scale) || [], n = S.length, fonts = B.fonts;
  const content = (B.ui && B.ui.screen && B.ui.screen.content) || {};
  // each step's candidates, in order; a step takes the first one no earlier step has printed, so a brand whose headline is its first line shows two lines
  const smp = B.type.sample || {};
  const cands = {
    display: [B.name], headline: [smp.headline, B.lines.primary], title: [B.lines.primary, ...B.lines.others],
    body: [smp.paragraph], label: [content.form && content.form.book, ...B.lines.others], caption: [smp.caption],
  };
  const used = new Set(), sampleOf = {};
  for (const t of S) {
    const pick = (cands[t.token] || []).find((s) => s && !used.has(s)) || (cands[t.token] || []).find(Boolean);
    if (pick) { sampleOf[t.token] = pick; used.add(pick); }
  }
  // the step's name and size at the left margin, the bar and the sample from the grid's second line, its face and line at the right margin
  const metaX = M, metaW = 200, barX = col(1) - 32, sx = col(1), specW = 232, specX = PAGE_W - M - specW;
  const rows = S.map((t) => {
    const disp = t.face === 'display', stem = faceStem(ctx, disp ? 'display' : 'body', t.weight), track = disp ? -0.01 : 0;
    const text = sampleOf[t.token] || t.use;
    // reading steps keep a reading measure (about 65 characters); display steps run to the face and line column
    const w = disp ? specX - 48 - sx : Math.min(specX - 48 - sx, Math.round(textWidth(stem, 'abcdefghijklmnopqrstuvwxyz', t.size) * 2.5));
    const lh = t.size * t.line, nl = wrap(stem, text, t.size, w, track).length;
    const fam = fonts[t.face] ? fonts[t.face].family : '';
    const metaH = 24 * (1 + wrap(CHROME[400], t.use, 17, metaW).length);
    const specH = 24 * (wrap(CHROME[400], `${fam} ${weightName(t.weight)}`, 17, specW).length + 1);
    return { t, disp, text, w, lh, nl, fam, h: Math.max(nl * lh, metaH, specH) };
  });
  const pad = (p) => rows.reduce((s, r) => s + r.h + 2 * p, 0);
  const P = [24, 20, 16, 12].find((p) => FLOOR - pad(p) >= 304) ?? 12;
  let y = FLOOR - pad(P), out = '';
  for (const r of rows) {
    const { t } = r, ty = y + P;
    const face = r.disp
      ? `font-family:var(--display);font-stretch:${(fonts.display && fonts.display.stretch) || 100}%;letter-spacing:-0.01em;text-wrap:balance`
      : 'font-family:var(--body);text-wrap:pretty';
    const barTop = ty + (r.lh - t.size) / 2;
    out += hair(M, y, PAGE_W - 2 * M)
      + at(metaX, ty, `<div class="g3-h nw" style="color:var(--ink)">${A(cap1(t.token))} <span class="c-value" style="margin-left:8px">${t.size} px</span></div>`
        + `<div class="g3-n" style="color:var(--quiet)">${nb(t.use)}</div>`, { w: metaW })
      + box(`left:${barX}px;top:${r2(barTop)}px;width:8px;height:${t.size}px;background:var(--ink)`)
      + at(sx, ty, `<div class="g3-s" style="${face};font-weight:${t.weight};font-size:${t.size}px;line-height:${r2(r.lh)}px;color:var(--ink)">${A(r.text)}</div>`, { w: r.w })
      + at(specX, ty, `<div class="g3-n" style="text-align:right;color:var(--ink)">${A(r.fam)} ${A(weightName(t.weight))}</div>`
        + `<div class="g3-n nw" style="text-align:right;color:var(--quiet)">Line <span class="c-value">${t.line}</span></div>`, { w: specW });
    y += r.h + 2 * P;
  }
  const title = titleHtml(ctx, 'Hierarchy', [`${cap1(spell(n))} steps, each set at its true size. The bar beside each is as tall as the step.`, `${cap1(spell(n))} steps, each set at its true size.`]);
  return page(ctx, 'hierarchy', { body: title + out });
}

export const guidelines = { hierarchy, contrast };
void contrastColumns;
