// Theme 24, Standards, lane g4: the imagery and layout pages (photo-direction, shot-list, imagery-rules, grid, layouts).
// The device stays the theme's own: one hero a page, measured in x by dimension lines that sit on the page and never on a
// photograph, crop ticks round every drawing, and the x-ruler lighting up the hero. Photographs bleed under the ruler, which
// stops at their edge. Photos come only from ctx.photo (a real photo, or the engine's art-directed slot); brand strings are
// printed whole through A() and only measured, never cut. Sizes in a drawing of the brand's page are the page's own, in x.
import { framed } from './photo-focus.js';
import { A, G, f2, xOf, fx, roles, adv, wrap, displayFont, loadFont, blk, fill, dimH, dimV, cropTicks, ruler, tab, head, page, colourwayFor, span } from './helpers.js';

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORD[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const pg = (ctx, id) => ctx.pages.find((q) => q.id === id);
const chrome = (w) => loadFont(`PublicSans-${w}`);
const topW = (f) => f.weights[f.weights.length - 1];
const bodyFace = (ctx, w) => loadFont((ctx.faces.find((f) => f.role === 'body' && f.weight === w && f.style !== 'italic') || ctx.faces.find((f) => f.role === 'body' && f.style !== 'italic')).stem);
// lines a text sets in at a size and width (2 px of slack, so the browser's own break never adds a line we did not plan for)
const nLines = (font, text, size, w) => wrap(font, text, size, w - 2).length;
// the largest size at which text sets in at most maxLines lines
function fit(font, text, w, sizes, maxLines) {
  for (const s of sizes) { const n = nLines(font, text, s, w); if (n <= maxLines) return { size: s, n }; }
  const s = sizes[sizes.length - 1]; return { size: s, n: nLines(font, text, s, w) };
}
const nameOfHex = (ctx, hex) => (ctx.brand.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || { name: '' }).name;
// shots with a real photograph first, then the briefs still to shoot, so a page that needs one picture gets a real one if any exists
// a real photographer's credit; a generated sample photo prints none
const creditOf = (s) => (s.generated || !s.credit ? '' : ` Photo: ${A(s.credit)}.`);
const byPhoto = (shots) => [...shots.filter((s) => s.photo), ...shots.filter((s) => !s.photo)];

export const css = () => `
.pg.g4-p .photo-slot{box-sizing:border-box;border:1px dashed var(--quiet);background:var(--ground);display:flex;align-items:flex-end;padding:16px}
.pg.g4-p .photo-slot span{font-size:13px;line-height:20px;color:var(--ink);max-width:46ch;text-wrap:pretty}
.pg.g4-p .g4-hero .photo-slot{padding:32px 48px 40px 32px}
.pg.g4-p .g4-hero .photo-slot span{font-size:15px;line-height:24px;max-width:36ch}
.pg.g4-p .g4-t{font-size:13px;line-height:20px;font-weight:400;text-wrap:pretty}
.pg.g4-p .g4-rule{font-family:var(--body);text-wrap:pretty}
.pg.g4-p .g4-cap{font-size:12px;line-height:16px;font-weight:400;text-wrap:pretty}
.pg.g4-p .g4-cap b{font-weight:600}
.pg.g4-p .g4-reg{display:grid;grid-template-columns:1fr 64px 72px;align-items:center;height:32px;white-space:nowrap}
.pg.g4-p .g4-reg>span:nth-child(n+2){text-align:right}
.pg.g4-p .g4-sheet{position:absolute;overflow:hidden}
.pg.g4-p .g4-sheet>div{position:relative;overflow:hidden}
.pg.g4-p .g4-lay .photo-slot{padding:32px}
.pg.g4-p .g4-lay .photo-slot span{font-size:24px;line-height:32px;max-width:28ch}
.pg.g4-p .g4-disp{font-family:var(--display);margin:0}
.pg.g4-p .g4-bod{font-family:var(--body);margin:0}
`;

export const guidelines = {
  // ---- photo-direction: one frame of the brand's photography, inset and measured from the page around it (its 3:2 crop in x),
  // with the five lines of direction as a register beside it ----
  'photo-direction'(ctx) {
    const R = roles(ctx), B = ctx.brand, D = B.imagery.direction, p = pg(ctx, 'photo-direction'), sn = p.section.n, shots = B.imagery.shots;
    const s = byPhoto(shots).find((q) => q !== shots[0]) || shots[0];
    const PX = G.L, PY = 216, PW = span(7), PH = Math.round((PW * 2) / 3);
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
    const LX = G.col[7], TX = G.col[8], TW = G.R - TX, f = chrome(400);
    const hs = items.map(([, v]) => nLines(f, v, 13, TW) * 20);
    // the rows share whatever height is left, between 16 and 32 px of air each, so the register runs level with the photo's top
    const gap = Math.max(16, Math.min(32, Math.floor((G.bottom - PY - hs.reduce((a, b) => a + b, 0)) / items.length)));
    let y = PY, rows = '';
    items.forEach(([k, v], i) => {
      rows += fill(LX, y, G.R - LX, 1, i ? R.hair : R.ink)
        + blk(LX, y + 8, TX - LX - 8, 20, 'c-name nw', k, `color:${R.ink}`, 'h2')
        + blk(TX, y + 8, TW, hs[i], 'g4-t' + (ctx.edition === 'slot' ? ' ph-tight' : ''), A(v), `color:${R.ink}`, 'p');
      y += hs[i] + gap;
    });
    const cap = s.photo
      ? `${A(s.caption || s.alt)}.${creditOf(s)}`
      : 'A brief to shoot to: the subject, the crop and the light are written in the frame.';
    const body = head(ctx, 'photo-direction')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `What the photographs show and how they are lit, cropped and coloured. ${Word(items.length)} lines brief every shot; the frame here is cropped 3:2.`, `color:${R.quiet}`, 'p')
      + blk(PX, PY, PW, PH, '', framed(ctx, s.id, PW, PH, { style: `width:${PW}px;height:${PH}px` }))
      + blk(PX, PY + PH + 12, PW, 32, 'g4-cap', cap, `color:${R.quiet}`, 'p')
      + rows + tab(ctx, sn);
    const svg = dimH(ctx, { x1: PX, x2: PX + PW, y: PY - 16, label: fx(ctx, PW), col: R.ink, qcol: R.quiet, obj: PY })
      + dimV(ctx, { x: 40, y1: PY, y2: PY + PH, label: fx(ctx, PH), col: R.ink, qcol: R.quiet, obj: PX, labelAt: 34 })
      + ruler(ctx, { uid: 'g4d', live: [PX, PX + PW] });
    return page(ctx, 'photo-direction', { bg: R.ground, body, svg, cls: 'g4-p' });
  },

  // ---- shot-list: the schedule of shots, run down the page as a register with every frame at one measured size, so a
  // photographed shot and a brief still to shoot read side by side. The first is shown large, bled off the top right at 3:2 ----
  'shot-list'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'shot-list'), sn = p.section.n, shots = B.imagery.shots.slice(0, 6), hero = shots[0];
    const HX = G.col[7], GR = HX - 24, TW0 = 108, TH0 = 72, TX = G.L + TW0 + 24, TW = GR - TX;
    const n = shots.length, k = shots.filter((s) => s.photo).length;
    let credited = false;
    const txt = (s) => (s.photo
      ? `<span style="font-weight:600;color:${R.ink}">${A(s.caption || s.alt)}</span><br><span style="color:${R.quiet}">${A(s.alt)}.${credited || s.generated || !s.credit ? '' : (credited = true, creditOf(s))}</span>`
      : `<span style="color:${R.ink}">${A(s.slot)}</span>`);
    // the register runs to the foot of the content area, its rows sharing the height
    const HY = 92, RY = 120, RH = Math.min(120, Math.floor((G.bottom - RY) / n));
    const rows = shots.map((s, i) => {
      const y = RY + i * RH;
      return (i ? fill(G.L, y, GR - G.L, 1, R.hair) : '')
        + blk(G.L, y + 8, TW0, TH0, '', framed(ctx, s.id, TW0, TH0, { slotNote: false, style: `width:${TW0}px;height:${TH0}px` }))
        + blk(TX, y + 8, TW, RH - 12, 'g4-t', txt(s), '', 'p');
    }).join('');
    const lead = k === n ? `${Word(n)} shots, all photographed. The first is shown large, above.`
      : k ? `${Word(n)} shots: ${word(k)} photographed and ${word(n - k)} still briefs to shoot to. The first is shown large, above.`
        : `${Word(n)} shots, each a brief to shoot to. The first is shown large, above.`;
    const PW = ctx.size.w - HX, PH = Math.round((PW * 2) / 3);
    const body = blk(HX, -1, PW + 1, PH + 1, 'g4-hero', framed(ctx, hero.id, PW + 1, PH + 1, { style: `width:${PW + 1}px;height:${PH + 1}px` }))
      + head(ctx, 'shot-list', [{ x1: G.L, x2: GR, col: R.ink, slots: [[G.col[0], `${B.name} brand standards`], [G.col[3], `${sn} ${p.section.title}`]] }])
      + blk(HX, PH + 32, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(HX, PH + 64, 380, 60, 'c-body', lead, `color:${R.quiet}`, 'p')
      + blk(TX, HY, TW, 16, 'c-head nw', 'The shot, its crop and its light', `color:${R.ink}`)
      + fill(G.L, RY - 1, GR - G.L, 1, R.ink) + rows + fill(G.L, RY + n * RH, GR - G.L, 1, R.hair)
      + tab(ctx, sn);
    const svg = dimH(ctx, { x1: G.L, x2: G.L + TW0, y: HY + 8, label: fx(ctx, TW0), col: R.ink, qcol: R.quiet, obj: RY + 8 })
      + dimV(ctx, { x: 40, y1: RY + 8, y2: RY + 8 + TH0, label: fx(ctx, TH0), col: R.ink, qcol: R.quiet, obj: G.L, labelAt: 34 })
      + ruler(ctx, { uid: 'g4s', live: [G.L, G.L + TW0] });
    return page(ctx, 'shot-list', { bg: R.ground, body, svg, cls: 'g4-p' });
  },

  // ---- imagery-rules: the rules as one correction sheet. What to do is set in the brand's own text face on the ground; what
  // never happens sits level with it on the dark field that takes the right of the page ----
  'imagery-rules'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'imagery-rules'), sn = p.section.n, rules = B.imagery.rules.slice(0, 6), n = rules.length;
    const FX = G.col[7] - 58, DX = FX + 24, DW = G.R - DX, CW = FX - 24 - G.L, HY = 216, RY = 248;
    const bw = B.fonts.body.weights, dw = bw.includes(500) ? 500 : bw[0], fD = bodyFace(ctx, dw), fN = bodyFace(ctx, bw[0]);
    // the largest text size at which every pair of rules fits the sheet, each row as tall as its longer side
    let S = 17, LH = 24, hs = [];
    for (const [s, lh] of [[26, 32], [24, 32], [22, 28], [20, 28], [17, 24]]) {
      const h = rules.map((r) => Math.max(nLines(fD, r.do, s, CW), nLines(fN, r.dont, s, DW)) * lh);
      if (h.reduce((a, b) => a + b, 0) + n * 40 <= G.bottom - RY) { S = s; LH = lh; hs = h; break; }
    }
    if (!hs.length) hs = rules.map((r) => Math.max(nLines(fD, r.do, S, CW), nLines(fN, r.dont, S, DW)) * LH);
    const gap = Math.floor((G.bottom - RY - hs.reduce((a, b) => a + b, 0)) / n);
    let y = RY, rows = '';
    rules.forEach((r, i) => {
      rows += fill(G.L, y, CW, 1, i ? R.hair : R.ink) + fill(DX, y, DW, 1, i ? R.darkQuiet : R.darkInk)
        + blk(G.L, y + 12, CW, hs[i], 'g4-rule', A(r.do), `font-size:${S}px;line-height:${LH}px;font-weight:${dw};color:${R.ink}`, 'p')
        + blk(DX, y + 12, DW, hs[i], 'g4-rule', A(r.dont), `font-size:${S}px;line-height:${LH}px;font-weight:${bw[0]};color:${R.darkInk}`, 'p');
      y += hs[i] + gap;
    });
    const body = fill(FX, 0, ctx.size.w - FX, ctx.size.h, R.dark)
      + head(ctx, 'imagery-rules', [
        { x1: G.L, x2: FX - 24, col: R.ink, slots: [[G.L, `${B.name} brand standards`], [G.col[3], `${sn} ${p.section.title}`]] },
        { x1: DX, x2: G.R, col: R.darkInk, slots: [[DX, p.title]] }])
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `${Word(n)} rules for every photograph. Each line on the left has its opposite level with it on the right.`, `color:${R.quiet}`, 'p')
      + blk(G.L, HY, 200, 16, 'c-head nw', 'Do', `color:${R.ink}`)
      + blk(DX, HY, 200, 16, 'c-head nw', "Don't", `color:${R.darkInk}`)
      + rows + tab(ctx, sn, { inverted: true });
    const svg = dimH(ctx, { x1: G.L, x2: G.L + CW, y: HY - 20, label: `${fx(ctx, CW)} measure`, col: R.ink, qcol: R.quiet, obj: HY - 4 })
      + ruler(ctx, { uid: 'g4r', pieces: [{ x1: G.L, x2: FX - 12, ink: R.ink, quiet: R.quiet, hair: R.hair }, { x1: FX + 12, x2: G.R, ink: R.darkInk, quiet: R.darkQuiet, hair: R.darkQuiet }], live: [G.L, G.L + CW], endAnchor: false });
    return page(ctx, 'imagery-rules', { bg: R.ground, body, svg, cls: 'g4-p' });
  },

  // ---- grid: the brand's page drawn to scale with its columns filled in the highlight colour, measured in x round its edges
  // (the page, a margin, a column, a gutter); the same measures as a register, in x and in the px they come from ----
  grid(ctx) {
    const R = roles(ctx), B = ctx.brand, gm = ctx.gridMeasures, P = gm.page, p = pg(ctx, 'grid'), sn = p.section.n;
    const { margin: m, columns: c, gutter: g, col, base } = gm;
    const k = Math.min(span(8) / P.w, 440 / P.h), DW = f2(P.w * k), DH = f2(P.h * k), DX = G.L, DY = 216;
    const cx = (i) => DX + (m + i * (col + g)) * k;
    let bands = '';
    for (let i = 0; i < c; i++) bands += fill(f2(cx(i)), f2(DY + m * k), f2(col * k), f2((P.h - 2 * m) * k), R.field);
    const sheet = `<div class="a" style="left:${DX}px;top:${DY}px;width:${DW}px;height:${DH}px;box-shadow:inset 0 0 0 1px ${R.hair}"></div>`;
    const TX = G.col[9], TW = G.R - TX, whole = [m, g].every((v) => v % base === 0);
    const reg = [['Margin', fx(ctx, m), `${m} px`], ['Columns', String(c), ''], ['Column', fx(ctx, col), `${ctx.fmt(col)} px`], ['Gutter', fx(ctx, g), `${g} px`], ['Base unit', fx(ctx, base), `${base} px`]];
    const table = blk(TX, DY - 28, TW, 16, 'c-head nw', 'The grid in x, and in px', `color:${R.ink}`)
      + reg.map(([a, v, q], i) => fill(TX, DY + i * 32, TW, 1, i ? R.hair : R.ink)
        + blk(TX, DY + i * 32, TW, 32, 'c-body g4-reg', `<span>${a}</span><span style="font-weight:600">${A(v)}</span><span style="color:${R.quiet}">${A(q)}</span>`, `color:${R.ink}`)).join('')
      + fill(TX, DY + reg.length * 32, TW, 1, R.hair)
      + blk(TX, DY + reg.length * 32 + 16, TW, 40, 'g4-cap', `The bands are the columns, in ${A(nameOfHex(ctx, R.field))}. Type and pictures start and stop on their edges.`, `color:${R.quiet}`, 'p');
    const lead = `${Word(c)} columns on a ${P.w} by ${P.h} px page, with ${m} px margins all round and ${g} px gutters${whole ? `, each a whole number of ${base} px steps` : ''}.`;
    const body = head(ctx, 'grid')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', lead, `color:${R.quiet}`, 'p')
      + sheet + bands + table + tab(ctx, sn);
    // the bottom dimensions: the left margin and the last column on one line, the gutter before that column on the next
    const B1 = DY + DH + 16, B2 = B1 + 16, mw = m * k, c12 = cx(c - 1), mlab = fx(ctx, m), mtw = adv(chrome(600), mlab, 12);
    const svg = cropTicks(DX, DY, DW, DH, R.ink)
      + dimH(ctx, { x1: DX, x2: DX + DW, y: DY - 16, label: fx(ctx, P.w), col: R.ink, qcol: R.quiet, obj: DY })
      + dimV(ctx, { x: DX + DW + 16, y1: DY, y2: DY + DH, label: fx(ctx, P.h), col: R.ink, qcol: R.quiet, obj: DX + DW, right: true })
      + dimV(ctx, { x: 40, y1: DY, y2: DY + mw, label: mlab, col: R.ink, qcol: R.quiet, obj: DX, labelAt: 34 })
      + dimH(ctx, { x1: DX, x2: DX + mw, y: B1, label: mlab, col: R.ink, qcol: R.quiet, obj: DY + DH, outside: true, labelAt: DX - 8 - mtw })
      + dimH(ctx, { x1: c12, x2: c12 + col * k, y: B1, label: fx(ctx, col), col: R.ink, qcol: R.quiet, obj: DY + DH, outside: true })
      + dimH(ctx, { x1: c12 - g * k, x2: c12, y: B2, label: fx(ctx, g), col: R.ink, qcol: R.quiet, obj: DY + DH, outside: true })
      + ruler(ctx, { uid: 'g4g', live: [DX, DX + DW] });
    return page(ctx, 'grid', { bg: R.ground, body, svg, cls: 'g4-p' });
  },

  // ---- layouts: three pages built on that grid, drawn to scale. The poster is the hero, measured in x by its two parts;
  // the notice and the statement sit beside it, smaller, each with the columns it takes written under it ----
  layouts(ctx) {
    const R = roles(ctx), B = ctx.brand, gm = ctx.gridMeasures, P = gm.page, p = pg(ctx, 'layouts'), sn = p.section.n;
    const { margin: m, columns: c, gutter: g, col } = gm, W = P.w, H = P.h;
    const colX = (i) => m + i * (col + g), sw = (nn) => nn * col + (nn - 1) * g;
    const d = B.fonts.display, dw = topW(d), lw = d.weights[0], dF = displayFont(ctx, dw), lF = displayFont(ctx, lw), bF = bodyFace(ctx, B.fonts.body.weights[0]);
    const order = byPhoto(B.imagery.shots), others = (B.lines.others || []).slice(0, 3);
    const fieldName = A(nameOfHex(ctx, R.field)), cw = colourwayFor(ctx, R.field);
    const geo = ctx.logo.geos.colour;
    const box = (x, y, w, h, inner, st = '') => `<div style="position:absolute;left:${f2(x)}px;top:${f2(y)}px;width:${f2(w)}px;height:${f2(h)}px;${st}">${inner}</div>`;
    const disp = (x, y, w, text, size, weight, colr, n) => box(x, y, w, n * size + 8, `<p class="g4-disp" style="font-size:${size}px;line-height:${size}px;font-weight:${weight};color:${colr}">${A(text)}</p>`);

    // the poster: a photo across two thirds of the columns, bled off three edges; the line and the logo on the field
    const pc = Math.round((c * 2) / 3), E = colX(pc) - g / 2, FW = W - E, fc = c - pc;
    const pl = fit(dF, B.lines.primary, sw(fc), [144, 128, 112, 96, 88, 80, 72, 64, 56, 48, 40], 4);
    let LW = sw(fc) * 0.8, LH = (LW * geo.h) / geo.w;
    if (LH > H / 5) { LH = H / 5; LW = (LH * geo.w) / geo.h; }
    const poster = (note) => box(0, 0, E, H, framed(ctx, order[0].id, E, H, { slotNote: note, style: `width:${f2(E)}px;height:${H}px` }))
      + box(E, 0, FW, H, disp(colX(pc) - E, m, sw(fc), B.lines.primary, pl.size, dw, R.fieldInk, pl.n)
        + box(colX(pc) - E, H - m - LH, LW, LH, ctx.logo.html('colour', { width: f2(LW), colourway: cw, color: R.fieldInk, label: 'Logo' })), `background:${R.field}`);

    // the notice: a headline on five columns, the short boilerplate on four, a photo on the last six
    const nh = others[0] || B.lines.primary, hl = fit(dF, nh, sw(5), [112, 96, 88, 80, 72, 64, 56, 48], 3);
    const bp = B.voice.boilerplate25, bs = fit(bF, bp, sw(4), [32, 28, 24, 20], 6);
    const nph = order[1] || order[0], ny = m + hl.n * hl.size + 48;
    const notice = disp(colX(0), m, sw(5), nh, hl.size, dw, R.ink, hl.n)
      // the text is drawn as grey bars, one a line: at the thumbnail's scale its real words would set in about 4 px
      + Array.from({ length: bs.n }, (_, i) => { const lh = Math.round(bs.size * 1.4), last = i === bs.n - 1 && bs.n > 1; return box(colX(0), ny + i * lh + Math.round((lh - bs.size * 0.5) / 2), sw(4) * (last ? 0.6 : 1), Math.round(bs.size * 0.5), '', `background:${R.quiet};opacity:.35`); }).join('')
      + box(colX(c - 6), m, sw(6), H - 2 * m, framed(ctx, nph.id, sw(6), H - 2 * m, { slotNote: false, style: `width:${f2(sw(6))}px;height:${H - 2 * m}px` }));

    // the statement: the line across three quarters of the columns, the other lines under it on equal shares, each under a rule
    const sc = Math.round((c * 3) / 4), st = fit(dF, B.lines.primary, sw(sc), [160, 144, 128, 112, 96, 80, 72, 64], 2);
    const per = others.length ? Math.floor(c / Math.max(3, others.length)) : 0;
    const os = others.length ? Math.min(...others.map((t) => fit(lF, t, sw(per), [64, 56, 48, 40, 32, 28, 24], 2).size)) : 0;
    const oh = 2 * os + 8, oy = H - m - oh;
    const statement = disp(colX(0), m, sw(sc), B.lines.primary, st.size, dw, R.ink, st.n)
      + others.map((t, i) => box(colX(i * per), oy - 24, sw(per), 4, '', `background:${R.ink}`)
        + disp(colX(i * per), oy, sw(per), t, os, lw, R.ink, 2)).join('');

    // a page at scale: the full-size layout zoomed into its slot (zoom, not transform, so the PDF stays 1:1), on a hairline sheet
    const sheet = (x, y, w, inner) => {
      const z = w / W, h = f2(H * z);
      return { h, html: `<div class="g4-sheet g4-lay" style="left:${x}px;top:${y}px;width:${f2(w)}px;height:${h}px;box-shadow:inset 0 0 0 1px ${R.hair}"><div style="zoom:${z};width:${W}px;height:${H}px;background:${R.ground}">${inner}</div></div>` };
    };
    const HX = G.L, HY = 232, HW = span(7), SX = G.col[8], SW = G.R - SX;
    const s1 = sheet(HX, HY, HW, poster(true)), s2 = sheet(SX, 88, SW, notice), s3y = 88 + s2.h + 88, s3 = sheet(SX, s3y, SW, statement);
    const capB = (x, y, w, name, text) => blk(x, y, w, 40, 'g4-cap', `<b style="color:${R.ink}">${name}.</b> ${text}`, `color:${R.quiet}`, 'p');
    const z1 = HW / W;
    const body = head(ctx, 'layouts')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', `Three pages built on the ${word(c)} columns of the grid, drawn to scale. The sizes on the poster are the page's own, in x.`, `color:${R.quiet}`, 'p')
      + s1.html + s2.html + s3.html
      + capB(HX, HY + s1.h + 16, HW, 'Poster', `The photo across ${word(pc)} of ${word(c)} columns, bled off three edges; the line and the logo on ${fieldName} across the other ${word(fc)}.`)
      + capB(SX, 88 + s2.h + 12, SW, 'Notice', `The headline on five columns, the text on four and the photo on the last six.`)
      + capB(SX, s3y + s3.h + 12, SW, 'Statement', `The line across ${word(sc)} columns${others.length ? `; ${others.length === 1 ? 'the other line takes' : `each of the other ${word(others.length)} lines takes`} ${word(per)} under it` : ''}.`)
      + tab(ctx, sn);
    const svg = cropTicks(HX, HY, HW, s1.h, R.ink) + cropTicks(SX, 88, SW, s2.h, R.ink) + cropTicks(SX, s3y, SW, s3.h, R.ink)
      + dimH(ctx, { x1: HX, x2: HX + E * z1, y: HY - 16, label: fx(ctx, E), col: R.ink, qcol: R.quiet, obj: HY })
      + dimH(ctx, { x1: HX + E * z1, x2: HX + HW, y: HY - 16, label: fx(ctx, FW), col: R.ink, qcol: R.quiet, obj: HY })
      + dimV(ctx, { x: HX + HW + 16, y1: HY, y2: HY + s1.h, label: fx(ctx, H), col: R.ink, qcol: R.quiet, obj: HX + HW, right: true })
      + ruler(ctx, { uid: 'g4l', live: [HX, HX + HW] });
    return page(ctx, 'layouts', { bg: R.ground, body, svg, cls: 'g4-p' });
  },
};
