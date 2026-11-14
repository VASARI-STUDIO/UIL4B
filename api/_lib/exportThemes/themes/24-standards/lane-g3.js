// Theme 24, Standards, lane g3: the colour and type pages round 1 left out (proportion, contrast, colour-values, hierarchy, type-in-use,
// type-rules). palette and typefaces are round 1's and are not touched. Each page is a measured drawing in the manual's own language:
//   proportion     a sheet of this manual cut into a hundred squares, coloured by share, drawn to scale with its size in mm
//   contrast       one band per colour the brand sets text on; each reading is set in the pair's own colours, the colours kept off it listed
//   colour-values  one register row per colour: its values, then its ramp as an abutting colour bar with the colour's own step ruled
//   hierarchy      every step of the brand's scale at its true size, its line box dimensioned in x, the register beside it
//   type-in-use    a headline, paragraph and caption composed at the brand's sizes and dimensioned like a drawing
//   type-rules     the rules as a register (the wrong way struck through, as write-this does) beside one rule shown and measured
// Every number is computed from ctx; every string is brand data or a short template, printed whole through A(). No hex lives here.
import { ratio } from '../../engine/color.js';
import { A, G, f2, fx, roles, adv, wrap, displayFont, loadFont, blk, fill, dimH, dimV, cropTicks, ruler, tab, head, page, span } from './helpers.js';

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
const word = (n) => WORD[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const pg = (ctx, id) => ctx.pages.find((q) => q.id === id);
const chrome = (w) => loadFont(`PublicSans-${w}`);
const near = (ws, w) => ws.reduce((b, v) => (Math.abs(v - w) < Math.abs(b - w) ? v : b));
const topW = (f) => f.weights[f.weights.length - 1];
// the loaded face for a role and weight (the nearest weight the brand loads), as a font to measure with
const faceOf = (ctx, role, w) => {
  const F = ctx.brand.fonts[role], wt = near(F.weights, w);
  const f = ctx.faces.find((q) => q.role === role && q.weight === wt && q.style !== 'italic') || ctx.faces.find((q) => q.role === role);
  return { font: loadFont(f.stem), weight: wt, family: F.family, css: role === 'display' ? 'var(--display)' : role === 'mono' ? 'var(--mono)' : 'var(--body)' };
};
const nameOf = (ctx, id) => (ctx.byId[id] ? ctx.byId[id].name : id);
// a fill too close to the page to show its own edge gets a 1 px hairline inside it
const edge = (R, hex) => (ratio(hex, R.ground) < 1.15 ? `box-shadow:inset 0 0 0 1px ${R.hair};` : '');
const widest = (font, lines, size, track = 0) => Math.max(...lines.map((l) => adv(font, l, size, track)));
const title = (ctx, id, lead, w = 380) => blk(56, 88, w, 24, 'c-title', A(pg(ctx, id).title), `color:${roles(ctx).ink}`, 'h1')
  + blk(56, 120, w, 60, 'c-body', lead, `color:${roles(ctx).quiet}`, 'p');

export const css = () => `
.pg .g3-reg{display:flex;justify-content:space-between;white-space:nowrap}
.pg .g3-num{display:inline-block;width:92px;margin-left:16px;text-align:right}
.pg .g3-band{overflow:hidden}
.pg .g3-sq{display:inline-block;width:8px;height:8px;margin-right:6px;vertical-align:0}
.pg .g3-off{display:inline-block;margin-right:12px;white-space:nowrap}
.pg .g3-vals .val{display:block;line-height:16px;white-space:nowrap}
.pg .g3-spec{text-wrap:wrap}
.pg .g3-struck{text-decoration-line:line-through;text-decoration-thickness:1px}
`;

export const guidelines = {
  // ---- proportion: a page of this manual drawn to scale and cut into a hundred squares, coloured largest share first, so each colour
  // takes as many squares as it takes per cent of a page. The register beside it gives the share and the area that is on the sheet ----
  proportion(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'proportion'), sn = p.section.n, cols = B.colours;
    const has = cols.every((c) => c.share > 0), sum = cols.reduce((a, c) => a + (c.share || 0), 0);
    const list = cols.map((c) => ({ c, s: has ? c.share / sum : 1 / cols.length })).sort((a, b) => b.s - a.s);
    // a hundred squares shared by largest remainder, so the counts add to a hundred
    list.forEach((o) => { o.n = Math.floor(o.s * 100); });
    let left = 100 - list.reduce((a, o) => a + o.n, 0);
    [...list].sort((a, b) => (b.s * 100 - b.n) - (a.s * 100 - a.n)).forEach((o) => { if (left > 0) { o.n += 1; left -= 1; } });
    const mmW = Math.round((ctx.size.w * 25.4) / 96), mmH = Math.round((ctx.size.h * 25.4) / 96), k = 2;
    const SW = mmW * k, SH = mmH * k, SX = G.R - SW, SY = 232, gap = 4, cw = (SW - 9 * gap) / 10, ch = (SH - 9 * gap) / 10;
    let cells = '', i = 0;
    for (const o of list) {
      for (let j = 0; j < o.n; j++, i++) {
        const cx = SX + (i % 10) * (cw + gap), cy = SY + Math.floor(i / 10) * (ch + gap);
        const lab = j === 0 ? blk(6, 6, cw - 8, 16, 'c-head nw', `${o.n}%`, `color:${R.inkOn(o.c.hex)}`) : '';
        cells += `<div class="a" style="left:${f2(cx)}px;top:${f2(cy)}px;width:${f2(cw)}px;height:${f2(ch)}px;background:${o.c.hex};${edge(R, o.c.hex)}">${lab}</div>`;
      }
    }
    const area = (s) => `${Math.round((s * mmW * mmH) / 100)} cm²`;
    const rows = list.slice(0, 6), TW = 282 - 56;
    const reg = blk(56, SY + 6, TW, 20, 'c-head g3-reg', `<span>Colour</span><span>Share<span class="g3-num">On the sheet</span></span>`, `color:${R.ink}`)
      + rows.map((o, r) => {
        const y = SY + 32 + r * 32;
        return fill(56, y, TW, 1, r ? R.hair : R.ink) + fill(56, y + 10, 12, 12, o.c.hex, edge(R, o.c.hex) || `box-shadow:inset 0 0 0 1px ${R.hair}`)
          + blk(76, y + 6, TW - 20, 20, 'c-body g3-reg', `<span style="font-weight:600">${A(o.c.name)}</span><span>${Math.round(o.s * 100)}%<span class="g3-num">${area(o.s)}</span></span>`, `color:${R.ink}`);
      }).join('') + fill(56, SY + 32 + rows.length * 32, TW, 1, R.hair);
    const body = head(ctx, 'proportion')
      + title(ctx, 'proportion', `${Word(cols.length)} colours, counted in squares. The sheet is a page of this manual, ${mmW} × ${mmH} mm, cut into a hundred, so each square is one per cent of a page.`, 340)
      + reg + cells + tab(ctx, sn);
    const svg = cropTicks(SX, SY, SW, SH, R.ink)
      + dimH(ctx, { x1: SX, x2: SX + SW, y: SY - 20, label: `${mmW} mm`, col: R.ink, qcol: R.quiet })
      + dimV(ctx, { x: SX - 20, y1: SY, y2: SY + SH, label: `${mmH} mm`, col: R.ink, qcol: R.quiet, labelAt: SX - 26 })
      + ruler(ctx, { uid: 'g3p', live: [SX, SX + SW], edgeAnchor: true });
    return page(ctx, 'proportion', { bg: R.ground, body, svg });
  },

  // ---- contrast: a band for every colour the brand sets text on. Across it, each colour cleared to sit on it gives its reading, set in
  // its own colour on that band, so the band is the proof; the colours kept off it are listed at the band's left with their readings ----
  contrast(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'contrast'), sn = p.section.n, used = ctx.pairs, un = ctx.unusedPairs;
    const g = B.colours.find((c) => c.role === 'ground') || B.colours[0];
    const ids = [g.id, ...B.colours.filter((c) => c !== g).map((c) => c.id)];
    for (const q of used) if (!ids.includes(q.bg)) ids.push(q.bg);
    // each pair of colours is read once: the reverse reading (Deck on Hull after Hull on Deck) is the same ratio, so only the first band prints it
    const seen = new Set(), pk = (q) => [q.fg, q.bg].sort().join('|');
    const bands = ids.map((id) => ({ id, hex: ctx.byId[id].hex, on: used.filter((q) => q.bg === id), off: un.filter((q) => q.bg === id) }));
    for (const b of bands) b.on = b.on.filter((q) => { const k = pk(q); if (seen.has(k)) return false; seen.add(k); return true; });
    for (const b of bands) b.off = b.off.filter((q) => { const k = pk(q); if (seen.has(k)) return false; seen.add(k); return true; });
    for (let i = bands.length - 1; i >= 0; i--) if (!bands[i].on.length && !bands[i].off.length) bands.splice(i, 1);
    const nOn = bands.reduce((a, b) => a + b.on.length, 0), nOff = bands.reduce((a, b) => a + b.off.length, 0);
    const n = bands.length, BY = 216, BG = 8, BH = Math.min(112, Math.floor((G.bottom - BY - (n - 1) * BG) / n));
    const d = B.fonts.display, dw = topW(d), dfont = displayFont(ctx, dw), f600 = chrome(600);
    const SX = 258, SR = G.W - 16, gapS = 40;
    const lab = (q) => (q.large ? `${nameOf(ctx, q.fg)}, ${q.minSize} px and over` : nameOf(ctx, q.fg));
    const slot = (q, s) => Math.max(adv(dfont, `${q.ratioText}:1`, s), adv(f600, lab(q), 12));
    // one size for every reading on the page: the largest whose slots fit every band, never under 24 px (a large pair's floor)
    const minL = Math.max(24, ...used.filter((q) => q.large).map((q) => q.minSize || 24));
    const sizes = [48, 44, 40, 36, 32, 28, 24].filter((s) => s >= minL);
    const S = sizes.find((s) => s + 20 <= BH - 16 && bands.every((b) => b.on.reduce((a, q) => a + slot(q, s) + gapS, -gapS) <= SR - SX)) || minL;
    const html = bands.map((b, i) => {
      const y = BY + i * (BH + BG), ink = R.inkOn(b.hex), q2 = R.quietOn(b.hex);
      let x = SX, inner = blk(16, 12, 210, 16, 'c-head nw', A(nameOf(ctx, b.id)), `color:${ink}`, 'h2');
      const sy = Math.round((BH - S - 20) / 2);
      for (const q of b.on) {
        const w = slot(q, S);
        inner += blk(x, sy, Math.ceil(w) + 2, S, 'disp nw', `${A(q.ratioText)}:1`, `font-size:${S}px;line-height:${S}px;font-weight:${dw};color:${q.fgHex}`)
          + blk(x, sy + S + 4, Math.ceil(w) + 2, 16, 'c-head nw', A(lab(q)), `color:${q.large ? ink : q.fgHex}`);
        x += w + gapS;
      }
      if (b.off.length) {
        // as many as the band holds: two to a line under the label
        const lines = Math.max(1, Math.floor((BH - 36 - 8) / 16)), shown = b.off.slice(0, lines * 2), more = b.off.length - shown.length;
        inner += blk(16, 32, 226, BH - 36, 'c-micro', `<span style="font-weight:600">Not for text: </span>${shown.map((q) => `<span class="g3-off"><span class="g3-sq" style="background:${q.fgHex};${ratio(q.fgHex, b.hex) < 1.5 ? `box-shadow:inset 0 0 0 1px ${q2}` : ''}"></span>${A(nameOf(ctx, q.fg))} ${A(q.ratioText)}:1</span>`).join('')}${more ? `<span class="g3-off">and ${word(more)} more</span>` : ''}`, `color:${q2}`);
      }
      return `<div class="a g3-band" style="left:56px;top:${y}px;width:${G.W}px;height:${BH}px;background:${b.hex};${edge(R, b.hex)}">${inner}</div>`;
    }).join('');
    const body = head(ctx, 'contrast')
      + title(ctx, 'contrast', `Text needs 4.5:1 against what it sits on, and type ${minL} px and over needs 3:1. ${Word(nOn)} pairs clear that and carry text; ${word(nOff)} fall short and never do.`, 440)
      + html + tab(ctx, sn);
    const svg = ruler(ctx, { uid: 'g3c', live: [G.L, G.R], edgeAnchor: true });
    return page(ctx, 'contrast', { bg: R.ground, body, svg });
  },

  // ---- colour-values: a register row per colour, its hex, RGB and OKLCH, then its ramp from 50 to 900 as one abutting colour bar with
  // the colour's own step ruled under it. The tones and the print note close the page ----
  'colour-values'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'colour-values'), sn = p.section.n, cs = ctx.colours.slice(0, 6), steps = Object.keys(cs[0].ramp);
    const RX = G.col[4], RW = G.R - RX, pw = RW / steps.length, RY = 248, RH = cs.length <= 5 ? 72 : 64, PH = RH - 16;
    const stepHead = steps.map((s, j) => blk(f2(RX + j * pw), RY - 22, f2(pw), 16, 'c-micro nw', A(s), `text-align:center;color:${R.quiet}`)).join('');
    const rows = cs.map((c, i) => {
      const y = RY + i * RH;
      const patches = steps.map((s, j) => fill(f2(RX + j * pw), y + 8, f2(pw + 0.4), PH, c.ramp[s], edge(R, c.ramp[s]))).join('');
      const bj = steps.indexOf(String(c.rampBase));
      return fill(56, y, RX - 24 - 56, 1, i ? R.hair : R.ink)
        + blk(56, y + 8, 132, 20, 'c-name nw', A(c.name), `color:${R.ink}`, 'h2')
        + blk(56, y + 28, 132, 16, 'c-micro nw', A(cap1(c.role)), `color:${R.quiet}`)
        + (ctx.C.cmykParts(c) ? blk(56, y + 44, 132, 16, 'c-micro nw', `CMYK ${ctx.C.cmykParts(c).join(' ')}`, `color:${R.quiet}`) : '')
        + blk(196, y + 8, RX - 24 - 196, 48, 'g3-vals', `<span class="val">${A(c.hex)}</span><span class="val">${A(c.rgb)}</span><span class="val">${A(c.oklch)}</span>`, `color:${R.ink}`)
        + patches + (bj >= 0 ? fill(f2(RX + bj * pw), y + 8 + PH + 3, f2(pw), 2, R.ink) : '');
    }).join('');
    const TY = RY + cs.length * RH + 24, tones = ctx.tones.slice(0, 6);
    const toneReg = tones.length ? blk(56, TY, 400, 16, 'c-head nw', 'Tones, for text and rules', `color:${R.ink}`)
      + tones.map((t, i) => {
        const y = TY + 24 + i * 24;
        return fill(56, y + 6, 12, 12, t.hex, `box-shadow:inset 0 0 0 1px ${R.hair}`)
          + blk(76, y + 2, RX - 24 - 76, 20, 'c-body g3-reg', `<span style="font-weight:600">${A(t.name)}</span><span><span class="val">${A(t.hex)}</span><span class="g3-num" style="width:120px;color:${R.quiet}">${A(cap1(t.role))}</span></span>`, `color:${R.ink}`);
      }).join('') : '';
    const note = blk(RX, TY, span(6), 60, 'c-body', `Values are for screens. Print shifts colour, so ask your printer for a proof before a run; ${cs.some((c) => ctx.C.cmykParts(c)) ? 'CMYK is given only where the brand supplies it, and no Pantone values are given' : 'this manual gives no CMYK or Pantone values'}. The rule under a ramp marks the colour itself.`, `color:${R.ink}`, 'p');
    const body = head(ctx, 'colour-values')
      + title(ctx, 'colour-values', `${Word(cs.length)} colours by their numbers, each with the ten steps of its ramp, light to dark.`, 320)
      + stepHead + rows + toneReg + note + tab(ctx, sn);
    const svg = dimH(ctx, { x1: RX, x2: G.R, y: RY - 40, label: fx(ctx, RW), col: R.ink, qcol: R.quiet })
      + ruler(ctx, { uid: 'g3v', live: [RX, G.R], edgeAnchor: true });
    return page(ctx, 'colour-values', { bg: R.ground, body, svg });
  },

  // ---- hierarchy: the brand's scale, largest first, each step set at its true size in its own face with its line box dimensioned in x;
  // the register on the left names the step, its size and line, its face and its job ----
  hierarchy(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'hierarchy'), sn = p.section.n, T = B.type.sample;
    const TS = ctx.edition === 'slot' ? ' ph-tight' : '';   // slot: compact placeholders
    const scale = [...B.type.scale].sort((a, b) => b.size - a.size);
    const TX = 448, TW = G.R - TX, DX = 432, RW = 400 - 56 - 36;
    // a different line of the brand's for every step: the first not yet used that sets on one line at that size
    const pool = [B.name, T.headline, ...(B.lines.others || []), B.lines.primary, T.caption, ...B.voice.writeThis.map((w) => w.write)].filter(Boolean);
    const usedS = new Set();
    const steps = scale.map((t) => {
      const f = faceOf(ctx, t.face === 'display' ? 'display' : 'body', t.weight || 400), lh = Math.round(t.size * t.line);
      let text = pool.find((s) => !usedS.has(s) && adv(f.font, s, t.size) <= TW) || pool.find((s) => adv(f.font, s, t.size) <= TW) || B.name;
      usedS.add(text);
      const lines = wrap(f.font, text, t.size, TW);
      return { t, f, lh, text, lines, w: widest(f.font, lines, t.size), h: lines.length * lh };
    });
    const Y0 = 200, RMIN = 52;
    let gapR = 16;
    const total = () => steps.reduce((a, s) => a + Math.max(s.h, RMIN) + gapR, 0);
    while (total() > G.bottom - Y0 && gapR > 6) gapR -= 2;
    let y = Y0, body = '', svg = '';
    steps.forEach((s, i) => {
      const rh = Math.max(s.h, RMIN) + gapR, ty = y + Math.round(gapR / 2);
      body += fill(56, y, G.W, 1, i ? R.hair : R.ink)
        + blk(56, ty, RW, 20, 'c-body g3-reg', `<span style="font-weight:600">${A(cap1(s.t.token))}</span><span>${s.t.size} px on ${s.lh}</span>`, `color:${R.ink}`, 'h2')
        + blk(56, ty + 20, RW, 16, 'c-micro nw', `${A(s.f.family)} ${s.f.weight}`, `color:${R.ink}`)
        + blk(56, ty + 36, RW, 16, 'c-micro nw', A(s.t.use), `color:${R.quiet}`)
        + blk(TX, ty, TW + 2, s.h, `g3-spec${s.lines.length === 1 ? ' nw' : ''}${TS}`, A(s.text), `font-family:${s.f.css};font-weight:${s.f.weight};font-size:${s.t.size}px;line-height:${s.lh}px;color:${R.ink}`, 'p');
      svg += dimV(ctx, { x: DX, y1: ty, y2: ty + s.lh, label: fx(ctx, s.lh), col: R.ink, qcol: R.quiet, obj: TX, labelY: ty + s.lh / 2 + 4 });
      y += rh;
    });
    body += fill(56, y, G.W, 1, R.hair);
    const big = steps[0];
    body = head(ctx, 'hierarchy')
      + title(ctx, 'hierarchy', `${Word(steps.length)} steps, each set at its own size in its own face. The line box beside each is given in x.`, 340)
      + body + tab(ctx, sn);
    svg += ruler(ctx, { uid: 'g3h', live: [TX, TX + big.w] });
    return page(ctx, 'hierarchy', { bg: R.ground, body, svg });
  },

  // ---- type-in-use: a headline, a paragraph and a caption, composed at the brand's own sizes in its own words and dimensioned like a
  // drawing: the measure across the top, the line boxes and the gaps between the parts down the left. The register gives each part's setting ----
  'type-in-use'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'type-in-use'), sn = p.section.n, T = B.type.sample, S = B.type.scale;
    const TS = ctx.edition === 'slot' ? ' ph-tight' : '';   // slot: compact placeholders
    const tok = (n) => S.find((t) => t.token === n), disp = S.filter((t) => t.face === 'display').sort((a, b) => b.size - a.size);
    const hT = tok('headline') || disp[1] || disp[0], bT = tok('body') || S.find((t) => t.face !== 'display'), cT = tok('caption') || [...S].sort((a, b) => a.size - b.size)[0];
    const role = (t) => (t.face === 'display' ? 'display' : 'body');
    const hF = faceOf(ctx, role(hT), hT.weight || 700), bF = faceOf(ctx, role(bT), bT.weight || 400), cF = faceOf(ctx, role(cT), cT.weight || 400);
    const hl = Math.round(hT.size * hT.line), bl = Math.round(bT.size * bT.line), cl = Math.round(cT.size * cT.line);
    // the measure: about 64 characters of the body face, kept between 360 and 560 px
    const PX = 486, PW = Math.max(360, Math.min(560, Math.round(adv(bF.font, 'abcdefghijklmnopqrstuvwxyz', bT.size) / 26 * 64)));
    const hLines = wrap(hF.font, T.headline, hT.size, PW), bLines = wrap(bF.font, T.paragraph, bT.size, PW), cLines = wrap(cF.font, T.caption, cT.size, PW);
    const g1 = 6 * 4, g2 = 4 * 4;
    const hh = hLines.length * hl, bh = bLines.length * bl, chh = cLines.length * cl;
    const tot = hh + g1 + bh + g2 + chh, PY = Math.max(232, Math.round(232 + (G.bottom - 232 - tot) / 3));
    const y1 = PY + hh, y2 = y1 + g1, y3 = y2 + bh, y4 = y3 + g2;
    const set = (f, t, l, col) => `font-family:${f.css};font-weight:${f.weight};font-size:${t.size}px;line-height:${l}px;color:${col}`;
    const piece = blk(PX, PY, PW + 2, hh, 'g3-spec' + TS, A(T.headline), set(hF, hT, hl, R.ink), 'h2')
      + blk(PX, y2, PW + 2, bh, 'g3-spec' + TS, A(T.paragraph), set(bF, bT, bl, R.ink), 'p')
      + blk(PX, y4, PW + 2, chh, 'g3-spec' + TS, A(T.caption), set(cF, cT, cl, R.quiet), 'p');
    const parts = [['Headline', hT, hF, hl], ['Body', bT, bF, bl], ['Caption', cT, cF, cl]], TY = PY, TW = 340 - 56;
    const reg = parts.map(([n, t, f, l], i) => {
      const y = TY + i * 48;
      return fill(56, y, TW, 1, i ? R.hair : R.ink)
        + blk(56, y + 6, TW, 20, 'c-body g3-reg', `<span style="font-weight:600">${n}</span><span>${t.size} px on ${l}</span>`, `color:${R.ink}`)
        + blk(56, y + 26, TW, 16, 'c-micro nw', `${A(f.family)} ${f.weight}`, `color:${R.quiet}`);
    }).join('') + fill(56, TY + parts.length * 48, TW, 1, R.hair);
    const body = head(ctx, 'type-in-use')
      + title(ctx, 'type-in-use', 'A headline, a paragraph and a caption, set as the brand sets them and measured. Copy this spacing.', 284)
      + reg + piece + tab(ctx, sn);
    const DX = PX - 20, dv = (a, b, lab) => dimV(ctx, { x: DX, y1: a, y2: b, label: lab, col: R.ink, qcol: R.quiet, obj: PX, labelY: (a + b) / 2 + 4 });
    const svg = dimH(ctx, { x1: PX, x2: PX + PW, y: PY - 20, label: `${fx(ctx, PW)} measure`, col: R.ink, qcol: R.quiet, obj: PY - 4 })
      + dv(PY, PY + hl, fx(ctx, hl)) + dv(y1, y2, fx(ctx, g1)) + dv(y2, y2 + bl, fx(ctx, bl)) + dv(y3, y4, fx(ctx, g2)) + dv(y4, y4 + cl, fx(ctx, cl))
      + ruler(ctx, { uid: 'g3u', live: [PX, PX + PW] });
    return page(ctx, 'type-in-use', { bg: R.ground, body, svg });
  },

  // ---- type-rules: the rules as one register down the left, each written the right way with the wrong way struck under it (as the
  // corrections are marked on write-this). On the right, the rule that can be seen is shown: the line set right, then set wrong and struck,
  // each measured, so the cost of the wrong way is a number ----
  'type-rules'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'type-rules'), sn = p.section.n, rules = (B.type.rules || []).slice(0, 6), T = B.type.sample;
    const TS = ctx.edition === 'slot' ? ' ph-tight' : '';   // slot: compact placeholders
    const LW = span(6), f4 = chrome(400);
    const hRow = (r) => 10 + wrap(f4, r.do, 13, LW - 4).length * 20 + 4 + wrap(f4, r.dont, 13, LW - 4).length * 20 + 12;
    const RY = 216;
    let ry = RY;
    const reg = rules.map((r, i) => {
      const h = hRow(r), y = ry; ry += h;
      return fill(56, y, LW, 1, i ? R.hair : R.ink)
        + blk(56, y + 10, LW, h - 22, '', `<p class="c-body${TS}" style="color:${R.ink}">${A(r.do)}</p><p class="c-body g3-struck${TS}" style="margin-top:4px;color:${R.quiet};text-decoration-color:${R.quiet}">${A(r.dont)}</p>`, '');
    }).join('') + fill(56, ry, LW, 1, R.hair);
    // which wrong ways the brand's rules name that can be shown on a line of type
    const said = rules.map((r) => `${r.do} ${r.dont}`).join(' ');
    const kinds = [];
    if (/capital|upper ?case/i.test(said)) kinds.push('caps');
    if (/letter-?spac|tracking/i.test(said)) kinds.push('track');
    if (!kinds.length && /\bmono\b/i.test(said)) kinds.push('mono');
    const hT = B.type.scale.find((t) => t.token === 'headline') || [...B.type.scale].sort((a, b) => b.size - a.size)[0];
    const HX = G.col[7], HW = G.R - HX, text = T.headline;
    const dF = faceOf(ctx, 'display', hT.weight || topW(B.fonts.display)), mF = kinds.includes('mono') ? faceOf(ctx, 'mono', 400) : null;
    const tr = kinds.includes('track') ? 0.12 : 0, wFont = mF ? mF.font : dF.font, wText = kinds.includes('caps') ? text.toUpperCase() : text;
    let s = hT.size, cL, wL;
    for (; s >= 24; s -= 2) { cL = wrap(dF.font, text, s, HW); wL = wrap(wFont, wText, s, HW, tr); if (cL.length <= 2 && wL.length <= 2) break; }
    const lh = Math.round(s * Math.max(1, hT.line)), cw = widest(dF.font, cL, s), ww = widest(wFont, wL, s, tr);
    const more = adv(wFont, wText, s, tr) - adv(dF.font, text, s);
    const named = { caps: 'in capitals', track: 'letter-spaced', mono: 'in the mono face' };
    const Y1 = RY, S1 = Y1 + 48, Y2 = S1 + cL.length * lh + 40, S2 = Y2 + 48;
    const st = (f, extra) => `font-family:${f.css};font-weight:${f.weight};font-size:${s}px;line-height:${lh}px;color:${R.ink};${extra}`;
    let hero = blk(HX, Y1, HW, 16, 'c-head nw', 'Set it this way', `color:${R.ink}`)
      + blk(HX, S1, HW + 2, cL.length * lh, `g3-spec${cL.length === 1 ? ' nw' : ''}${TS}`, A(text), st(dF, ''), 'p');
    let svg = dimH(ctx, { x1: HX, x2: HX + cw, y: S1 - 16, label: fx(ctx, cw), col: R.ink, qcol: R.quiet, obj: S1 - 2 });
    if (kinds.length) {
      hero += blk(HX, Y2, HW, 16, 'c-head nw', `Not ${kinds.map((k) => named[k]).join(' or ')}`, `color:${R.ink}`)
        + blk(HX, S2, HW + 2, wL.length * lh, `g3-spec${wL.length === 1 ? ' nw' : ''}${TS}`, A(text), st(mF || dF, `${kinds.includes('caps') ? 'text-transform:uppercase;' : ''}${tr ? `letter-spacing:${tr}em;` : ''}`), 'p')
        + (more > 0 ? blk(HX, S2 + wL.length * lh + 16, HW, 16, 'c-micro nw', `Set this way the line runs ${fx(ctx, more)} longer.`, `color:${R.quiet}`) : '');
      svg += dimH(ctx, { x1: HX, x2: HX + ww, y: S2 - 16, label: fx(ctx, ww), col: R.ink, qcol: R.quiet, obj: S2 - 2 })
        + wL.map((l, i) => `<rect x="${HX}" y="${f2(S2 + i * lh + lh * 0.5 - 1)}" width="${f2(adv(wFont, l, s, tr))}" height="2" fill="${R.ink}"/>`).join('');
    }
    const body = head(ctx, 'type-rules')
      + title(ctx, 'type-rules', `${Word(rules.length)} rules for setting the brand's type. Write to the first line of each; the struck line is the mistake it prevents.`, 440)
      + reg + hero + tab(ctx, sn);
    svg += ruler(ctx, { uid: 'g3r', live: [HX, HX + Math.max(cw, kinds.length ? ww : 0)] });
    return page(ctx, 'type-rules', { bg: R.ground, body, svg });
  },
};
