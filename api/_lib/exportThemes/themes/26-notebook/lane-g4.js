// Theme 26, Notebook, lane g4: imagery and layout (photo-direction, shot-list, imagery-rules, grid, layouts).
// The same notebook as the gate spreads: dot-grid leaves, the fold and its thread, and everything that is the brand stuck in. A photograph is a
// print held by a piece of the brand's tape; a shot the brand has not taken yet is the gap the print will fill: the dots stop over it, its edge
// is drawn in the dots' own grey and the brief is written inside it, and it carries no tape because nothing is stuck there yet. The brand's
// pages are cards cut to the page's proportion, and the grid's measures are lengths of tape cut at full size.
// Coordinates are leaf-local (see helpers.js); stuck objects land on dots and baselines on dot rows.
import {
  A, U, row, px, nb, tokens, brandRoles, readable, nearPaper, block, advance, hasPh, wrap, labelStripW, tab, spread, sceneCrop, sceneImg, photoAt, creditOnce,
} from './helpers.js';
import { artKit } from './art.js';

const upRow = (y) => row(Math.ceil((y - 17) / U - 1e-6));
const title = (ctx, id) => (ctx.pages.find((p) => p.id === id) || {}).title || '';
const shotsOf = (ctx) => ctx.brand.imagery.shots || [];
const num = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
const rgbA = (ctx, hex, a) => `rgb(${ctx.C.hexToRgb(hex).join(' ')} / ${a})`;

// a piece of label tape with no print under it (as lane g1's): 1 unit tall, as wide as its label plus 20, in whole units
function tapeLabel(T, x, y, text) {
  const w = labelStripW(T, 'c-label', text);
  return `<div class="tape tab c-label" style="left:${px(x)};top:${px(y)};width:${w}px;height:${U}px">${A(text)}</div>`;
}

// A photograph of the brand's: a real photo is a print stuck down by a piece of tape `piece` units wide across its top-left corner; a shot
// still to be taken is the slot ctx.photo returns, with the brief written inside it when it fits (note: true) and no tape.
function photoPrint(ctx, T, shot, P, { note = true, wash = '', piece = 5, pos } = {}) {
  const real = !!shot.photo;
  // the brief is written inside the slot only when every line fits above the slot's foot (c-note 13/19, 19 px in from each side)
  const fits = !real && note && (wrap(T['c-note'].stem, 13, shot.slot || '', P.w - 40).length * U + 2 * U <= P.h);
  const img = photoAt(ctx, shot.id, { cls: 'g4-ph', style: 'width:100%;height:100%', slotNote: fits, ...(pos ? { pos } : {}) });
  const wsh = wash ? `<div class="g4-wash" style="background:${wash}"></div>` : '';
  const box = `<div class="print ${real ? 'stuck' : 'g4-slot'}" style="left:${px(P.x)};top:${px(P.y)};width:${P.w}px;height:${P.h}px">${img}${wsh}</div>`;
  const tape = real ? `<div class="tape piece" style="left:${px(P.x - U)};top:${px(P.y - U / 2)};width:${piece * U}px;height:${U}px"></div>` : '';
  return box + tape;
}
// the caption on the dot row under a print, wrapped to the print's width
const captionUnder = (T, P, text, x = P.x, w = P.w) => block(T['c-note'], { x, w, baseline: P.y + P.h + U, lines: wrap(T['c-note'].stem, 13, text, w), cls: 'c-note' }).html;

// small marks drawn in graphite ink: a tick, a cross, an empty or ticked box (11 px, sitting on the text's baseline)
const mark = (x, bl, kind) => {
  const p = { tick: 'M1.5 6l3 3 5-7', cross: 'M2 2l7 7M9 2l-7 7' }[kind];
  return `<svg class="g4-mk" style="left:${px(x)};top:${px(bl - 10)}" width="11" height="11" viewBox="0 0 11 11" aria-hidden="true"><path d="${p}"/></svg>`;
};
const box = (x, bl, ticked) => `<div class="g4-box" style="left:${px(x)};top:${px(bl - 10)}"></div>${ticked ? mark(x, bl, 'tick') : ''}`;

// ---- the brand's pages, drawn at their own size in the brand's own type; a card shows them at a scale with zoom (so the text stays vector) ----
function brandType(ctx) {
  const B = ctx.brand, W = ctx.weights, T = tokens(ctx), d = B.fonts.display;
  const sc = (tk, size, line) => { const t = (B.type.scale || []).find((x) => x.token === tk); return t ? { size: t.size, line: t.line } : { size, line }; };
  return {
    dStem: T._displayStem, bStem: T['b-body'].stem, sStem: T['b-name'].stem,
    dFam: `font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;`,
    bFam: `font-family:var(--body);font-weight:${W.regular};`, sFam: `font-family:var(--body);font-weight:${W.strong};`,
    display: sc('display', 58, 1.1), headline: sc('headline', 44, 1.05), body: sc('body', 16, 1.5), caption: sc('caption', 12, 1.4),
  };
}
function gridOf(ctx, Wd, Hd) {
  const G = ctx.gridMeasures, w = Wd || G.page.w, h = Hd || G.page.h;
  const col = (w - 2 * G.margin - (G.columns - 1) * G.gutter) / G.columns;
  return { ...G, w, h, col, x: (i) => G.margin + i * (col + G.gutter), span: (n) => n * col + (n - 1) * G.gutter };
}
// explicit lines at an exact top, in the brand page's own px
const tx = (x, y, w, lines, fam, size, lh, color, extra = '') => `<div class="g4-tx${lines.some(hasPh) ? ' ph-tight' : ''}" style="left:${px(x)};top:${px(y)};width:${px(w)};${fam}font-size:${size}px;line-height:${px(lh)};color:${color};${extra}">${lines.map((s) => `<span class="ln">${A(s)}</span>`).join('')}</div>`;
// the largest of the sizes that sets text in at most maxLines inside w
function fit(stem, text, w, sizes, maxLines, track = 0) {
  for (const s of sizes) { const ls = wrap(stem, s, text, w, track); if (ls.length <= maxLines && ls.every((l) => advance(stem, s, l, track) <= w + 0.5)) return { size: s, lines: ls }; }
  const s = sizes[sizes.length - 1]; return { size: s, lines: wrap(stem, s, text, w, track) };
}
const photoIn = (ctx, shot, x, y, w, h) => (shot ? `<div class="g4-pa" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}">${photoAt(ctx, shot.id, { cls: 'g4-ph2', style: 'width:100%;height:100%', slotNote: false })}</div>` : '');

// Three layouts on the brand's grid. Each returns { html, spans } in the page's own px; spans say which columns each part takes.
function layout(ctx, kind, G, detail = false) {
  const B = ctx.brand, Y = brandType(ctx), R = brandRoles(ctx), sh = shotsOf(ctx);
  const ink = readable(ctx, R.ground.hex, [R.text, nb(ctx).graphiteInk], `layouts ${kind}`);
  const land = G.w > G.h, m = G.margin, n = G.columns;
  const cols = (k) => Math.max(1, Math.round(n * k));
  let html = '', spans = [];
  if (kind === 'cover') {
    const pc = land ? cols(7 / 12) : n, tc = land ? n - pc : cols(10 / 12);
    const ph = land ? G.h - 2 * m : Math.round((G.h - 2 * m) * 0.5 / G.base) * G.base;
    html += photoIn(ctx, sh[0], m, m, G.span(pc), ph);
    const tx0 = land ? G.x(pc) : m, ty = land ? m : m + ph + 10 * G.base, tw = G.span(tc);
    const f = fit(Y.dStem, B.lines.primary, tw, [Y.display.size, Y.headline.size, Math.round(Y.headline.size * 0.75)], land ? 4 : 3, -0.01);
    const lh = f.size * Math.min(Y.display.line, 1.1);
    html += tx(tx0, ty, tw, f.lines, Y.dFam, f.size, lh, ink, 'letter-spacing:-0.01em;');
    const lc = Math.min(tc, cols(4 / 12)), g = ctx.logo.geos.colour, lw = G.span(lc), lgh = lw * g.h / g.w;
    html += `<div class="g4-pa" style="left:${px(tx0)};top:${px(G.h - m - lgh)};width:${px(lw)}">${ctx.logo.html('colour', { width: lw })}</div>`;
    spans = [['the photograph', pc], ['the line', tc], ['the logo', lc]];
  } else if (kind === 'text') {
    const head = (B.lines.others || [])[0] || B.type.sample.headline;
    const hc = cols(land ? 6 / 12 : 9 / 12), pc = cols(5 / 12), fc = n - cols(7 / 12);
    const f = fit(Y.dStem, head, G.span(hc), [Y.headline.size, Y.display.size * 0.5], 3, -0.01);
    const hlh = f.size * Math.min(Y.headline.line, 1.1);
    html += tx(m, m, G.span(hc), f.lines, Y.dFam, f.size, hlh, ink, 'letter-spacing:-0.01em;');
    const top = m + f.lines.length * hlh + 8 * G.base, blh = Y.body.size * Y.body.line;
    const pl = wrap(Y.bStem, Y.body.size, B.type.sample.paragraph, G.span(pc));
    html += tx(m, top, G.span(pc), pl, Y.bFam, Y.body.size, blh, ink);
    const fx = G.x(n - fc), clh = Y.caption.size * Y.caption.line;
    const cl = wrap(Y.bStem, Y.caption.size, B.type.sample.caption, G.span(fc));
    const fh = land ? G.h - m - top - cl.length * clh - 3 * G.base : Math.round(G.span(fc) * 1.25);
    if (!detail) html += photoIn(ctx, sh[1] || sh[0], fx, top, G.span(fc), fh);
    if (!detail) html += tx(fx, top + fh + 3 * G.base, G.span(fc), cl, Y.bFam, Y.caption.size, clh, ink);
    if (top + pl.length * blh > G.h - m) throw new Error(`layouts text: the paragraph runs to ${top + pl.length * blh}`);
    spans = [['the headline', hc], ['the text', pc], ['the photograph', fc]];
  } else {
    // statement: the brand line across most of the page, three traits under it, each on a third of the columns
    const lc = cols(10 / 12), f = fit(Y.dStem, B.lines.primary, G.span(lc), [Math.round(Y.display.size * 1.5), Y.display.size, Y.headline.size], 2, -0.01);
    html += tx(m, m, G.span(lc), f.lines, Y.dFam, f.size, f.size * Math.min(Y.display.line, 1.05), ink, 'letter-spacing:-0.01em;');
    const per = Math.floor(n / 3), blh = Y.body.size * Y.body.line, items = B.personality.slice(0, 3);
    const tw = G.span(per) - G.gutter;
    const ls = items.map((t) => wrap(Y.bStem, Y.body.size, t.means, tw));
    const hmax = Math.max(...ls.map((l) => l.length)) + 1;
    const top = G.h - m - hmax * blh;
    items.forEach((t, i) => {
      const x = G.x(i * per);
      html += `<div class="g4-pa" style="left:${px(x)};top:${px(top - 4 * G.base)};width:${px(tw)};height:2px;background:${ink}"></div>`;
      html += tx(x, top, tw, [t.trait], Y.sFam, Y.body.size, blh, ink) + tx(x, top + blh, tw, ls[i], Y.bFam, Y.body.size, blh, ink);
    });
    spans = [['the line', lc], ['each trait', per]];
  }
  return { html, spans };
}
// a card cut to the brand page's proportion at (x, y), w wide; the page drawn inside at scale with zoom
function pageCard(ctx, G, inner, { x, y, w, h: ch, k: ck }) {
  const R = brandRoles(ctx), k = ck || w / G.w, h = ch || G.h * k;
  const lum = (c) => ctx.C.luminance(c.hex);
  const slot = [...ctx.brand.colours].filter((c) => c.hex !== R.ground.hex).sort((a, b) => lum(b) - lum(a))[0] || R.ground;
  return {
    h, k,
    html: `<div class="card stuck g4-card${nearPaper(ctx, R.ground.hex) ? ' edge' : ''}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${R.ground.hex};--g4-slot:${slot.hex}">`
      + `<div class="g4-page" style="width:${G.w}px;height:${G.h}px;zoom:${k}">${inner}</div></div>`,
  };
}
// "the photograph across 12 columns, the line across 10 and the logo across 4"
const spanWords = (spans) => spans.map(([what, c], i) => `${i === spans.length - 1 && i ? 'and ' : ''}${what} across ${c}${i ? '' : ' columns'}`).join(spans.length > 2 ? ', ' : ' ');

export const guidelines = {
  // ---- photo direction: the brand's first shot as a large print at the head of the verso, with the subject under it in the display face; the
  // other four lines of the direction run down the recto to its last row, each under its own label ----
  'photo-direction': (ctx) => {
    const T = tokens(ctx), D = ctx.brand.imagery.direction, s0 = shotsOf(ctx)[0];
    const P = { x: 42, y: 74, w: 456, h: 304 };
    let vc = photoPrint(ctx, T, s0, P) + (s0.photo ? captionUnder(T, P, s0.caption) : captionUnder(T, P, 'The first shot on the list, still to be taken'));
    const t = T['b-title'], sl = wrap(t.stem, t.size, D.subject, 475);
    vc += tapeLabel(T, 42, row(22), 'Subject') + block(t, { x: 42, w: 475, baseline: row(25), lines: sl, cls: 'b-title' }).html;
    if (row(25) + t.lh * (sl.length - 1) > 739) throw new Error(`photo-direction: the subject runs to ${row(25) + t.lh * (sl.length - 1)}`);
    // the recto: label at row r, text from row r + 2, the next label three rows under the last line; the whole list ends on row 38
    const items = [['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].map(([k, v]) => [k, wrap(T['b-body'].stem, 13, v, 285)]);
    let r = 0; const at = items.map(([, ls]) => { const a = r; r += ls.length + 4; return a; });
    const shift = 38 - (at[at.length - 1] + items[items.length - 1][1].length + 1);
    let rc = '';
    items.forEach(([k, ls], i) => {
      const r0 = at[i] + shift;
      rc += tapeLabel(T, 232, row(r0), k) + block(T['b-body'], { x: 232, w: 285, baseline: row(r0 + 2), lines: ls, cls: 'b-body' }).html;
    });
    if (at[0] + shift < 3) throw new Error('photo-direction: the recto list starts above the content box');
    return spread(ctx, 'photo-direction', { verso: vc, recto: rc });
  },

  // ---- shot list: the verso is the photographer's list, a box per shot, ticked where the brand already has the photograph; the recto holds the
  // shots themselves, the first as a large print and the rest as a strip of small ones, each under the number of its line ----
  'shot-list': (ctx) => {
    const T = tokens(ctx), S = shotsOf(ctx);
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'shot-list')], baseline: 93, cls: 'b-title' }).html;
    // a generated shot prints no credit; a real credit prints once on the page, not under every line
    const seen = new Set();
    const rows = S.map((s) => { const cr = creditOnce(s, seen); return { s, ls: wrap(T['b-body'].stem, 13, s.photo ? s.caption : s.slot, 418), st: s.photo ? (cr ? `Photo from ${cr}` : 'Photo in hand') : 'To be shot' }; });
    const lay = (gap) => { let r = 7; return rows.map((o) => { const a = r; r += o.ls.length + 1 + gap; return a; }); };
    let at = lay(1), last = at[at.length - 1] + rows[rows.length - 1].ls.length;
    if (last > 38) { at = lay(0); last = at[at.length - 1] + rows[rows.length - 1].ls.length; }
    if (last > 38) throw new Error(`shot-list: the list runs to row ${last}`);
    rows.forEach((o, i) => {
      const bl = row(at[i]);
      vc += block(T['c-mono'], { x: 42, w: 19, baseline: bl, lines: [String(i + 1)], cls: 'c-mono' }).html + box(61, bl, !!o.s.photo)
        + block(T['b-body'], { x: 99, w: 418, baseline: bl, lines: o.ls, cls: 'b-body' }).html
        + block(T['c-note'], { x: 99, w: 418, baseline: bl + U * o.ls.length, lines: [o.st], cls: 'c-note' }).html;
    });
    const P = { x: 42, y: 74, w: 456, h: 304 };
    let rc = photoPrint(ctx, T, S[0], P) + block(T['c-mono'], { x: 42, w: 19, baseline: P.y + P.h + U, lines: ['1'], cls: 'c-mono' }).html
      + (S[0].photo ? captionUnder(T, P, S[0].caption, 61, 437) : '');
    S.slice(1, 6).forEach((s, i) => {
      const Q = { x: 42 + 95 * i, y: row(22), w: 76, h: 114 };
      rc += photoPrint(ctx, T, s, Q, { note: false, piece: 2 }) + block(T['c-mono'], { x: Q.x, w: 19, baseline: Q.y + Q.h + U, lines: [String(i + 2)], cls: 'c-mono' }).html;
    });
    return spread(ctx, 'shot-list', { verso: vc, recto: rc });
  },

  // ---- imagery rules: the first shot twice, level across the fold: as shot on the verso, and under a wash of the brand's own colour on the
  // recto. Under them each rule's do and don't sit level with each other, a tick on the verso and a cross on the recto ----
  'imagery-rules': (ctx) => {
    const T = tokens(ctx), R = ctx.brand.imagery.rules, s0 = shotsOf(ctx)[0], N = nb(ctx);
    const P = { x: 42, y: 74, w: 456, h: 304 };
    const wash = rgbA(ctx, N.tape, 0.55);
    let vc, rc;
    if (s0.photo) {
      vc = photoPrint(ctx, T, s0, P) + captionUnder(T, P, s0.caption);
      rc = photoPrint(ctx, T, s0, P, { note: false, wash }) + captionUnder(T, P, 'The same shot under a wash of the brand colour');
    } else {
      // a brand with no photographs yet: the theme's anchor scene, a ute at the kerb with the brand's sign on its door, stands in as the example
      const sc = ctx.sceneInfo('kerb-ute-kerbside'), a = sc.quads[0].aspect, aw = 1200, ah = Math.round(aw / a);
      const url = ctx.mockup('kerb-ute-kerbside', [artKit(ctx).sign(aw, ah)]);
      const img = sceneImg(url, sceneCrop(sc, P.w, P.h, 0.5), 'The brand sign on a ute door, at the kerb');
      const pr = (inner) => `<div class="print stuck" style="left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px">${inner}</div>`
        + `<div class="tape piece" style="left:${P.x - U}px;top:${px(P.y - U / 2)};width:${5 * U}px;height:${U}px"></div>`;
      vc = pr(img) + captionUnder(T, P, 'The brand on a ute door, as photographed');
      rc = pr(img + `<div class="g4-wash" style="background:${wash}"></div>`) + captionUnder(T, P, 'The same photograph under a wash of the brand colour');
    }
    vc += tapeLabel(T, 42, row(22), 'Do'); rc += tapeLabel(T, 42, row(22), 'Don’t');
    const st = T['b-body'].stem, pairs = R.map((x) => ({ d: wrap(st, 13, x.do, 456), n: wrap(st, 13, x.dont, 456) }));
    let r = 25;
    for (const p of pairs) {
      const bl = row(r);
      vc += mark(42, bl, 'tick') + block(T['b-body'], { x: 61, w: 456, baseline: bl, lines: p.d, cls: 'b-body' }).html;
      rc += mark(42, bl, 'cross') + block(T['b-body'], { x: 61, w: 456, baseline: bl, lines: p.n, cls: 'b-body' }).html;
      r += Math.max(p.d.length, p.n.length) + 1;
    }
    if (r - 2 > 38) throw new Error(`imagery-rules: the rules run to row ${r - 2}`);
    return spread(ctx, 'imagery-rules', { verso: vc, recto: rc });
  },

  // ---- grid: the brand's page as a card on the verso with its columns drawn in, as large as the leaf allows; on the recto the same measures
  // as lengths of tape cut at full size (the columns) with the paper showing between them (the gutters), running off the fore-edge ----
  grid: (ctx) => {
    const T = tokens(ctx), G = gridOf(ctx), N = nb(ctx), land = G.w > G.h;
    const w = land ? 475 : 608 * G.w / G.h, y = 93;
    const k = w / G.w, h = G.h * k;
    const tint = rgbA(ctx, N.tape, 0.16);
    let bars = '';
    for (let i = 0; i < G.columns; i++) bars += `<div class="g4-gc" style="left:${px(G.x(i) * k)};top:${px(G.margin * k)};width:${px(G.col * k)};height:${px(G.h * k - 2 * G.margin * k)};background:${tint}"></div>`;
    const R = brandRoles(ctx);
    let vc = `<div class="card stuck g4-card${nearPaper(ctx, R.ground.hex) ? ' edge' : ''}" style="left:42px;top:${y}px;width:${px(w)};height:${px(h)};background:${R.ground.hex}">${bars}</div>`
      + tab(T, { x: 61, y, label: 'The page' });
    const capBl = upRow(y + h + U - 2);
    if (capBl > 739) throw new Error(`grid: the caption sits at ${capBl}`);
    vc += block(T['c-note'], { x: 42, w: 475, baseline: capBl, lines: [`${G.w} x ${G.h} px, drawn at ${Math.round(k * 100)}%`], cls: 'c-note' }).html;

    // the recto: a ruler of tape at full size from the left margin dot, cut off at the fore-edge
    let rc = tapeLabel(T, 42, 74, 'At full size');
    const top = 112, segs = [['m', G.margin]];
    for (let i = 0; i < G.columns; i++) { segs.push(['c', G.col]); if (i < G.columns - 1) segs.push(['g', G.gutter]); }
    segs.push(['m', G.margin]);
    let x = 42; const mono = T['c-mono'];
    for (const [t, len] of segs) {
      if (x >= 559) break;
      const vis = Math.min(len, 559 - x), whole = vis === len;
      if (t === 'c') rc += `<div class="g4-len" style="left:${px(x)};top:${top}px;width:${px(vis)};height:${2 * U}px"></div>`;
      if (t === 'm') rc += `<div class="g4-mg" style="left:${px(x)};top:${top}px;width:${px(vis)};height:${2 * U}px"></div>`;
      if (whole) {
        const v = `${num(len)}`, vw = advance(mono.stem, 11, v), bl = t === 'g' ? row(9) : row(8);
        const lx = x + len / 2 - vw / 2;
        if (x + len / 2 + vw / 2 < 517) rc += block(mono, { x: lx, w: Math.ceil(vw) + 2, baseline: bl, lines: [v], cls: 'c-mono', knock: false }).html;
      }
      x += len;
    }
    rc += `<div class="g4-ko" style="left:23px;top:${row(7) + U / 2}px;width:536px;height:${2 * U}px"></div>`;
    // the measures as a short table, then what they add up to
    const M = [['Page', `${G.w} x ${G.h} px`], ['Margin', `${num(G.margin)} px`], ['Columns', `${G.columns}, each ${num(G.col)} px`], ['Gutter', `${num(G.gutter)} px`], ['Base unit', `${num(G.base)} px`]];
    M.forEach(([a, b], i) => {
      const bl = row(14 + i);
      rc += block(T['c-note'], { x: 42, w: 114, baseline: bl, lines: [a], cls: 'c-note' }).html + block(mono, { x: 156, w: 228, baseline: bl, lines: [b], cls: 'c-mono' }).html;
    });
    const mult = (v) => Number.isInteger(v / G.base);
    const lead = `${G.columns} columns of ${num(G.col)} px, with ${num(G.gutter)} px between them and ${num(G.margin)} px of margin all round.`
      + (mult(G.margin) && mult(G.gutter) ? ` The margin and the gutter are both whole multiples of the ${num(G.base)} px base.` : '');
    rc += block(T['b-body'], { x: 42, w: 285, baseline: row(21), lines: wrap(T['b-body'].stem, 13, lead, 285), cls: 'b-body' }).html;
    return spread(ctx, 'grid', { verso: vc, recto: rc });
  },

  // ---- layouts: the brand's own pages on its grid, each a card cut to the page's proportion with a tab naming it. A tall page takes a whole
  // leaf (the cover on the verso, a text page on the recto); a wide page fits two to a leaf, so it adds a statement page under the cover ----
  layouts: (ctx) => {
    const T = tokens(ctx), G = gridOf(ctx), land = G.w > G.h;
    const place = (kind, name, x, y, w, cw = w) => {
      const L = layout(ctx, kind, G), c = pageCard(ctx, G, L.html, { x, y, w: cw });
      const cb = upRow(y + c.h + U - 2), text = `${name[0].toUpperCase()}${name.slice(1)}: ${spanWords(L.spans)}.`;
      const ls = wrap(T['c-note'].stem, 13, text, w);
      if (cb + U * (ls.length - 1) > 739) throw new Error(`layouts: the ${kind} caption runs to ${cb + U * (ls.length - 1)}`);
      return { end: cb + U * ls.length, html: c.html + tab(T, { x: x + U, y, label: name[0].toUpperCase() + name.slice(1) }) + block(T['c-note'], { x, w, baseline: cb, lines: ls, cls: 'c-note' }).html };
    };
    // a page drawn small cannot be read, so the text page is shown twice: whole (the layout), then its top left at 66% (the type as it prints)
    const detail = (y) => {
      const k = 0.66, h = Math.min(266, Math.floor((716 - y) / U) * U), L = layout(ctx, 'text', G, true), c = pageCard(ctx, G, L.html, { x: 42, y, w: 475, h, k });
      const cb = upRow(y + h + U - 2);
      return c.html + tab(T, { x: 42 + U, y, label: 'Text page, at 66%' }) + block(T['c-note'], { x: 42, w: 475, baseline: cb, lines: ['The headline and the first paragraph, at the size they print.'], cls: 'c-note' }).html;
    };
    let vc, rc;
    if (land) {
      vc = place('cover', 'cover', 42, 93, 475).html + place('statement', 'statement', 42, 435, 475).html;
      rc = place('text', 'text page', 42, 93, 475).html + detail(435);
    } else {
      const w = 608 * G.w / G.h;
      vc = place('cover', 'cover', 42, 93, w).html;
      rc = place('text', 'text page', 42, 93, w).html;
    }
    return spread(ctx, 'layouts', { verso: vc, recto: rc });
  },
};

export function css() {
  return `.pg .g4-slot{background:var(--paper)}
.pg .g4-slot .photo-slot.g4-ph{position:absolute;left:0;top:0;box-sizing:border-box;border:1px solid var(--dot);background:var(--paper)}
.pg .g4-slot .photo-slot.g4-ph>span{position:absolute;left:19px;right:19px;bottom:19px;display:block;font-family:var(--chrome);font-weight:400;font-size:13px;line-height:19px;color:var(--graphite);white-space:normal}
.pg .g4-wash{position:absolute;left:0;top:0;right:0;bottom:0}
.pg .g4-mk{z-index:4;fill:none;stroke:var(--graphite-ink);stroke-width:1.5;stroke-linecap:square}
.pg .g4-box{width:11px;height:11px;box-sizing:border-box;border:1px solid var(--graphite);background:var(--paper);z-index:3}
.pg .g4-card{overflow:hidden}
.pg .g4-gc{position:absolute}
.pg .g4-page{position:absolute;left:0;top:0}
.pg .g4-page .g4-tx{position:absolute;white-space:nowrap;font-kerning:normal}
.pg .g4-page .g4-pa{position:absolute;overflow:hidden}
.pg .g4-page .photo-slot.g4-ph2{display:block;background:var(--g4-slot)}
.pg .g4-len{background:var(--tape-a);z-index:3}
.pg .g4-mg{box-sizing:border-box;border:1px solid var(--graphite);border-right:0;z-index:3}
.pg .g4-ko{background:var(--paper);z-index:0}`;
}
