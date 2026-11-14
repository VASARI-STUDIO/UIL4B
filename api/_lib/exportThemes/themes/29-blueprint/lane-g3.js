// Theme 29 (Blueprint), lane g3: the colour and type pages round 1 left out (proportion, contrast, colour-values, hierarchy, type-in-use, type-rules).
// palette and typefaces are round 1's own sheets and stay as they are. Each page here is a drawing doing a drafter's job: an area take-off, a test
// schedule, a values schedule with datum marks, a section of type levels, an elevation with callouts and a set of lettering rules.
// Redlines print only true sizes (the A3 and A5 sheets, a line box); every other mark is a drafting mark carrying structure.
import { esc as A } from '../../engine/brand.js';
import { inkW, wrap, inkEnd, displayStem, baseline, specimen } from './measure.js';
import { sheet, reds, detailTag, PX, ZX, r1 } from './lane-g1-sheet.js';

const INK = '#1F2A33';
const svgAll = (s) => `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${s}</svg>`;
const lineOf = (t) => Math.round(t.line < 4 ? t.line * t.size : t.line);
const stemFor = (ctx, t) => (t.face === 'display' ? displayStem(ctx) : (ctx.faces.find((f) => f.role === 'body' && f.weight === t.weight && f.style !== 'italic') || ctx.faces.find((f) => f.role === 'body')).stem);
// the CSS font a scale token sets in: the display face through .bd (its tracking is -0.01 em), the body face at the token's own weight
const fontOf = (t) => (t.face === 'display' ? { cls: 'bd', style: `font-size:${t.size}px;line-height:${lineOf(t)}px`, track: -0.01 } : { cls: 'bn', style: `font:${t.weight} ${t.size}px/${lineOf(t)}px var(--body);color:var(--b-text)`, track: 0 });
const words = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];
const count = (n) => words[n] || String(n);
const nameOf = (ctx, id) => (ctx.byId[id] ? ctx.byId[id].name : id);
// text on a colour field: the brand's own pair for that ground when one holds 4.5 : 1, else ink or white by ratio (as the palette sheet does)
function onField(ctx, hex) {
  const own = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === hex.toUpperCase() && !p.large).sort((a, b) => b.ratio - a.ratio)[0];
  if (own && own.ratio >= 4.5) return own.fgHex;
  return ctx.ratio('#FFFFFF', hex) >= ctx.ratio(INK, hex) ? '#FFFFFF' : INK;
}
const note = (n, html) => `<div style="display:grid;grid-template-columns:24px 1fr"><span class="c-mono" style="line-height:20px">${n}</span><p class="c-note">${html}</p></div>`;
const flow = (x, y, w, items, gap = 16) => `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${w}px;display:flex;flex-direction:column;gap:${gap}px">${items.join('')}</div>`;
const fmt1 = (n) => (Math.round(n * 10) / 10).toFixed(1);

export const guidelines = {
  // 015: the area take-off. An A3 sheet drawn at 1:2 and divided into rooms, one per colour, each as large as the colour's share of a page.
  // Every room carries its name, hex and share; a room too small for them takes a leader out to the side.
  proportion(ctx) {
    const cols = ctx.colours, K = 2, PW = (420 / K) * PX, PH = (297 / K) * PX, X = 112, Y = 192;
    // slice the plan from the largest share down: each colour takes its share of what is left, cut across the longer side
    const order = cols.map((c, i) => ({ c, i })).sort((a, b) => b.c.share - a.c.share);
    const total = order.reduce((a, o) => a + o.c.share, 0), rooms = [];
    let rect = { x: X, y: Y, w: PW, h: PH }, left = total;
    order.forEach((o, k) => {
      if (k === order.length - 1) { rooms.push({ ...o, ...rect }); return; }
      const f = o.c.share / left;
      if (rect.w >= rect.h) { const w = rect.w * f; rooms.push({ ...o, x: rect.x, y: rect.y, w, h: rect.h }); rect = { x: rect.x + w, y: rect.y, w: rect.w - w, h: rect.h }; }
      else { const h = rect.h * f; rooms.push({ ...o, x: rect.x, y: rect.y, w: rect.w, h }); rect = { x: rect.x, y: rect.y + h, w: rect.w, h: rect.h - h }; }
      left -= o.c.share;
    });
    let html = '', svg = '', outside = [];
    const NM = (c) => inkW(stemFor(ctx, { face: 'body', weight: 600 }), c.name, 15), HX = (c) => inkW('ChivoMono-400', c.hex, 12);
    rooms.forEach((r) => {
      const fg = onField(ctx, r.c.hex), need = Math.max(NM(r.c), HX(r.c), 40) + 32;
      html += `<div class="fld" style="left:${r1(r.x)}px;top:${r1(r.y)}px;width:${r1(r.w)}px;height:${r1(r.h)}px;background:${r.c.hex}"></div>`;
      // the walls between rooms: 1 px ink, the plan's outline 1.5 px over them
      svg += `<rect x="${r1(r.x) + 0.5}" y="${r1(r.y) + 0.5}" width="${r1(r.w) - 1}" height="${r1(r.h) - 1}" stroke="var(--ink)" stroke-width="1"/>`;
      const pct = `${Math.round(r.c.share * 100)}%`;
      if (r.w >= need && r.h >= 116) {
        html += `<span class="a c-mono" style="left:${r1(r.x + 16)}px;top:${r1(r.y + 16)}px;color:${fg}">C${r.i + 1}</span><span class="a nw" style="left:${r1(r.x + 16)}px;top:${r1(r.y + 34)}px;font:600 15px/20px var(--body);color:${fg}">${A(r.c.name)}</span><span class="a c-mono nw" style="left:${r1(r.x + 16)}px;top:${r1(r.y + 56)}px;color:${fg}">${A(r.c.hex)}</span>`;
        html += `<span class="a nw" style="left:${r1(r.x + 16)}px;top:${r1(r.y + r.h - 36)}px;font:400 15px/20px var(--chrome);color:${fg}">${pct}</span>`;
      } else outside.push({ r, pct, fg });
    });
    svg += `<rect x="${X}" y="${Y}" width="${r1(PW)}" height="${r1(PH)}" stroke="var(--ink)" stroke-width="1.5"/>`;
    // rooms too small to hold their label: a dot in the room, a leader out past the plan's right wall, the label beside its end
    const LX = X + PW + 40;
    let prev = -99;
    outside.sort((a, b) => a.r.y - b.r.y).forEach(({ r, pct }) => {
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2, ty = Math.max(cy, prev + 64); prev = ty;
      const dot = onField(ctx, r.c.hex);
      svg += `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="2.5" fill="${dot}" stroke="none"/><path d="M${r1(cx)} ${r1(cy)}H${r1(X + PW + 12)}L${r1(LX - 8)} ${r1(ty)}" stroke="var(--ink)" stroke-width="1"/>`;
      html += `<span class="a c-mono" style="left:${r1(LX)}px;top:${r1(ty - 30)}px">C${r.i + 1}</span><span class="a nw" style="left:${r1(LX)}px;top:${r1(ty - 12)}px;font:600 15px/20px var(--body);color:var(--b-text)">${A(r.c.name)}</span><span class="a c-mono nw" style="left:${r1(LX)}px;top:${r1(ty + 10)}px">${A(r.c.hex)}</span><span class="a c-note nw" style="left:${r1(LX + 72)}px;top:${r1(ty + 8)}px">${pct}</span>`;
    });
    // the sheet's own size, dimensioned true at 1:2
    const R = reds();
    R.dim([X, Y], [X + PW, Y], [0, -1], { d: 32, value: '420' });
    R.dim([X, Y], [X, Y + PH], [-1, 0], { d: 32, value: '297', place: 'left' });
    // a graphic scale under the plan: 0 to 100 mm at 1:2, alternate 10 mm blocks filled
    const SY = Y + PH + 40, u = (10 / K) * PX;
    for (let k = 0; k < 10; k++) svg += `<rect x="${r1(X + k * u)}" y="${SY}" width="${r1(u)}" height="6" stroke="var(--ink)" stroke-width="1"${k % 2 ? '' : ' fill="var(--ink)"'}/>`;
    html += [0, 50, 100].map((v) => `<span class="a c-mono" style="left:${r1(X + (v / 10) * u)}px;top:${SY + 12}px;transform:translateX(-50%)">${v}</span>`).join('') + `<span class="a c-label nw" style="left:${r1(X + 10 * u + 16)}px;top:${SY - 4}px">mm at 1:2</span>`;
    // the area schedule: each colour's share and the area it covers on a sheet this size, in cm²
    const TX = ZX[6] + 24, TW = 1523 - TX, A3 = 42 * 29.7, C = { key: TX, name: TX + 40, share: TX + 214, area: TX + TW };
    html += `<h3 class="a c-head" style="left:${TX}px;top:${Y - 8}px">Area schedule</h3>`;
    const hy = Y + 32;
    html += `<span class="a c-label" style="left:${C.key}px;top:${hy}px">Key</span><span class="a c-label" style="left:${C.name}px;top:${hy}px">Finish</span><span class="a c-label" style="left:${C.share}px;top:${hy}px;width:60px;text-align:right;transform:translateX(-60px)">Share</span><span class="a c-label" style="left:${C.area - 90}px;top:${hy}px;width:90px;text-align:right">Area, cm²</span>`;
    cols.forEach((c, i) => {
      const y = hy + 24 + i * 32;
      html += `<div class="hl" style="left:${TX}px;top:${y}px;width:${TW}px"></div><span class="sw" style="left:${TX}px;top:${y + 10}px;background:${c.hex}"></span><span class="a c-mono" style="left:${TX + 18}px;top:${y + 8}px">C${i + 1}</span>`
        + `<span class="a nw" style="left:${C.name}px;top:${y + 6}px;font:600 15px/20px var(--body);color:var(--b-text)">${A(c.name)}</span>`
        + `<span class="a c-note" style="left:${C.share - 60}px;top:${y + 6}px;width:60px;text-align:right">${Math.round(c.share * 100)}%</span><span class="a c-note" style="left:${C.area - 90}px;top:${y + 6}px;width:90px;text-align:right">${fmt1(c.share * A3)}</span>`;
    });
    const ey = hy + 24 + cols.length * 32;
    html += `<div class="a" style="left:${TX}px;top:${ey}px;width:${TW}px;height:1.5px;background:var(--ink)"></div><span class="a c-head" style="left:${C.name}px;top:${ey + 6}px">Sheet</span><span class="a c-note" style="left:${C.share - 60}px;top:${ey + 6}px;width:60px;text-align:right">${Math.round(total * 100)}%</span><span class="a c-note" style="left:${C.area - 90}px;top:${ey + 6}px;width:90px;text-align:right">${fmt1(total * A3)}</span>`;
    const big = order[0].c, small = order[order.length - 1].c;
    const notes = [
      `Each room is drawn as large as its colour's share of a page. The plan is an A3 sheet at 1:2.`,
      `${A(big.name)} is the ground at ${Math.round(big.share * 100)}%. ${A(small.name)} is the smallest finish at ${Math.round(small.share * 100)}%: keep it that small.`,
    ];
    html += `<h3 class="a c-head" style="left:${TX}px;top:${ey + 72}px">General notes</h3>` + flow(TX, ey + 110, TW, notes.map((t, i) => note(i + 1, t)));
    return sheet(ctx, 'proportion', { drawing: 'Area take-off', scale: '[1:2], sizes in mm' }, `${html}${svgAll(svg)}${R.svg()}`);
  },

  // 016: the test schedule. Every text colour against every ground, as a drafter's matrix: a pair the brand uses is set in its colours,
  // a pair under 4.5 : 1 is drawn with bars instead of letters and is never used for text, and the rest stay blank.
  contrast(ctx) {
    const B = ctx.brand, order = [...B.colours, ...(B.tones || [])].map((c) => c.id), rank = (id) => order.indexOf(id);
    const used = new Map(ctx.pairs.map((p) => [p.fg + '>' + p.bg, p])), fail = new Map(ctx.unusedPairs.map((p) => [p.fg + '>' + p.bg, p]));
    const fgs = [...new Set([...ctx.pairs, ...ctx.unusedPairs].map((p) => p.fg))].sort((a, b) => rank(a) - rank(b));
    const bgs = [...new Set([...ctx.pairs, ...ctx.unusedPairs].map((p) => p.bg))].sort((a, b) => rank(a) - rank(b));
    const MX = 248, MR = 1130, MY = 128, MB = 947, CW = (MR - MX) / bgs.length, CH = Math.min(124, (MB - MY) / fgs.length), G = 8;
    const disp = displayStem(ctx);
    let html = '', svg = '';
    // column heads: the ground's name over a strip of it; row heads: the text colour's name beside a chip of it
    html += `<span class="a c-label" style="left:${MX}px;top:${MY - 72}px">Ground</span><span class="a c-label" style="left:64px;top:${MY - 24}px">Text</span>`;
    bgs.forEach((id, j) => {
      const x = MX + j * CW;
      html += `<span class="a nw" style="left:${r1(x)}px;top:${MY - 48}px;font:600 15px/20px var(--body);color:var(--b-text)">${A(nameOf(ctx, id))}</span>`;
      svg += `<path d="M${r1(x)} ${MY - 16.5}H${r1(x + CW - G)}" stroke="var(--ink)" stroke-width="1.5"/>`;
    });
    fgs.forEach((fid, i) => {
      const y = MY + i * CH, fh = ctx.hex(fid);
      html += `<span class="sw" style="left:64px;top:${r1(y + 14)}px;background:${fh}"></span><span class="a nw" style="left:84px;top:${r1(y + 10)}px;font:600 15px/20px var(--body);color:var(--b-text)">${A(nameOf(ctx, fid))}</span>`;
      bgs.forEach((bid, j) => {
        const x = MX + j * CW, w = CW - G, h = CH - G, sh = h - 28, bh = ctx.hex(bid), key = fid + '>' + bid;
        const p = used.get(key), f = fail.get(key);
        if (p) {
          // the pair at work: letters in its own colours, at 32 px or the pair's own floor if that is larger
          const s = Math.max(32, p.minSize || 0), bo = baseline(disp, s, s);
          html += `<div class="fld" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(sh)}px;background:${bh}"></div><span class="a bd" style="left:${r1(x + 12)}px;top:${r1(y + sh - 12 - bo - 2)}px;font-size:${s}px;line-height:${s}px;color:${p.fgHex}">Aa</span>`;
          if (ctx.ratio(bh, '#EEF1F2') < 1.3) svg += `<rect x="${r1(x) + 0.5}" y="${r1(y) + 0.5}" width="${r1(w) - 1}" height="${r1(sh) - 1}" stroke="var(--hair)" stroke-width="1"/>`;
          html += `<span class="a c-mono nw" style="left:${r1(x)}px;top:${r1(y + sh + 6)}px">${p.ratioText} : 1</span>${p.large ? `<span class="a c-note nw" style="left:${r1(x + 72)}px;top:${r1(y + sh + 4)}px">${p.minSize} px and over</span>` : ''}`;
        } else if (f) {
          // a failing pair: bars where the letters would be, a drafter's cross through the cell, and the ratio in the quiet tone
          html += `<div class="fld" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(sh)}px;background:${bh}"></div>`;
          html += `<div class="a" style="left:${r1(x + 12)}px;top:${r1(y + sh - 36)}px;width:${r1(w * 0.5)}px;height:8px;background:${f.fgHex}"></div><div class="a" style="left:${r1(x + 12)}px;top:${r1(y + sh - 20)}px;width:${r1(w * 0.32)}px;height:8px;background:${f.fgHex}"></div>`;
          if (ctx.ratio(bh, '#EEF1F2') < 1.3) svg += `<rect x="${r1(x) + 0.5}" y="${r1(y) + 0.5}" width="${r1(w) - 1}" height="${r1(sh) - 1}" stroke="var(--hair)" stroke-width="1"/>`;
          svg += `<path d="M${r1(x + w - 22)} ${r1(y + 10)}l12 12m0 -12l-12 12" stroke="${onField(ctx, bh)}" stroke-width="1.5"/>`;
          html += `<span class="a c-mono c-quiet nw" style="left:${r1(x)}px;top:${r1(y + sh + 6)}px;color:var(--quiet)">${f.ratioText} : 1</span>`;
        } else if (fid !== bid) {
          // not a pair the brand sets: an empty outline, so the matrix still reads as complete
          svg += `<rect x="${r1(x) + 0.5}" y="${r1(y) + 0.5}" width="${r1(w) - 1}" height="${r1(sh) - 1}" stroke="var(--hair)" stroke-width="1" stroke-dasharray="4 4"/>`;
        }
      });
    });
    // the right column: the rule, the count, and every pair in use with what it is for
    const RX = ZX[6] + 24, RW = 1523 - RX, nU = ctx.pairs.length, nF = ctx.unusedPairs.length;
    html += `<h3 class="a c-head" style="left:${RX}px;top:56px">The rule</h3>` + flow(RX, 88, RW, [
      note(1, 'Text needs 4.5 : 1 on its ground. Type at 24 px and over, or bold at 18.7 px and over, needs 3 : 1.'),
      note(2, `${count(nU)} pairs are in use and set in their colours. ${count(nF)} fall short and carry bars and a cross: never set text in them. A dashed cell is not a pair the brand uses.`),
    ], 12);
    // each pair's ratio is printed once, in the grid; this list names the pair and what it is for. A tone already named for its ground ("Quiet on White") is not given the ground twice.
    const pairName = (p) => { const f = nameOf(ctx, p.fg), g = nameOf(ctx, p.bg); return f.endsWith(` on ${g}`) ? f : `${f} on ${g}`; };
    const items = ctx.pairs.map((p) => `<div style="border-top:1px solid var(--hair);padding-top:6px"><p class="c-note" style="font-weight:500">${A(pairName(p))}</p><p class="c-note c-quiet" style="color:var(--quiet)">${A(p.use)}</p></div>`);
    html += `<h3 class="a c-head" style="left:${RX}px;top:296px">In use</h3>` + flow(RX, 328, RW, items, 6);
    return sheet(ctx, 'contrast', { drawing: 'Contrast schedule', scale: 'Not to scale' }, `${html}${svgAll(svg)}`);
  },

  // 017: the values schedule. Each colour's codes beside its ramp, the ramp drawn as a run of steps with the colour's own step marked by a datum.
  'colour-values'(ctx) {
    const B = ctx.brand, cols = ctx.colours, n = cols.length, steps = Object.keys(cols[0].ramp).map(Number).sort((a, b) => a - b);
    const RX0 = 629.1, RX1 = 1523, SW = (RX1 - RX0) / steps.length, Y0 = 120, RH = Math.min(136, (720 - Y0) / n), CH = Math.min(72, RH - 40);
    let html = '', svg = '';
    html += `<span class="a c-label" style="left:64px;top:${Y0 - 32}px">Key and finish</span><span class="a c-label" style="left:296px;top:${Y0 - 32}px">Values</span><span class="a c-label" style="left:${RX0}px;top:${Y0 - 56}px">Ramp, by step</span>`;
    html += steps.map((s, k) => `<span class="a c-mono" style="left:${r1(RX0 + k * SW)}px;top:${Y0 - 32}px">${s}</span>`).join('');
    svg += `<path d="M64 ${Y0 - 8.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    cols.forEach((c, i) => {
      const y = Y0 + i * RH;
      if (i) svg += `<path d="M64 ${r1(y - 8) + 0.5}H1523" stroke="var(--hair)" stroke-width="1"/>`;
      html += `<span class="sw" style="left:64px;top:${r1(y + 12)}px;background:${c.hex}"></span><span class="a c-mono" style="left:84px;top:${r1(y + 10)}px">C${i + 1}</span><span class="a nw" style="left:112px;top:${r1(y + 8)}px;font:600 15px/20px var(--body);color:var(--b-text)">${A(c.name)}</span><span class="a c-note c-quiet nw" style="left:112px;top:${r1(y + 30)}px;color:var(--quiet)">${A(ctx.cap(c.role))}</span>`;
      html += [['HEX', c.hex], ['RGB', c.rgb], ['OKLCH', c.oklch], ...(ctx.C.cmykOf(c) ? [['CMYK', ctx.C.cmykOf(c)]] : [])].map(([k, v], j) => `<span class="a c-label" style="left:296px;top:${r1(y + 10 + j * 22)}px">${k}</span><span class="a c-mono nw" style="left:360px;top:${r1(y + 10 + j * 22)}px">${A(v)}</span>`).join('');
      steps.forEach((s, k) => {
        const x = RX0 + k * SW, hex = c.ramp[s];
        html += `<div class="fld" style="left:${r1(x)}px;top:${r1(y + 8)}px;width:${r1(SW)}px;height:${CH}px;background:${hex}"></div>`;
      });
      // the colour's own step: outlined in ink, with a datum triangle under it pointing up at the step
      const k = steps.indexOf(c.rampBase), bx = RX0 + Math.max(0, k) * SW;
      svg += `<rect x="${r1(bx) + 0.75}" y="${r1(y + 8) + 0.75}" width="${r1(SW) - 1.5}" height="${CH - 1.5}" stroke="var(--ink)" stroke-width="1.5"/>`;
      svg += `<path d="M${r1(bx + SW / 2)} ${r1(y + 8 + CH + 4)}l6 9h-12z" fill="var(--ink)"/>`;
    });
    // the run of steps sits on one outline so a pale step still reads as part of it
    svg += cols.map((c, i) => `<rect x="${RX0 + 0.5}" y="${r1(Y0 + i * RH + 8) + 0.5}" width="${r1(RX1 - RX0) - 1}" height="${CH - 1}" stroke="var(--hair)" stroke-width="1"/>`).join('');
    // tones and print, along the foot
    const FY = Y0 + n * RH + 16, tones = B.tones || [];
    svg += `<path d="M64 ${r1(FY) + 0.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    if (tones.length) {
      html += `<h3 class="a c-head" style="left:64px;top:${r1(FY + 16)}px">Tones</h3>`;
      const per = Math.ceil(tones.length / 2);
      tones.forEach((t, i) => {
        const cx = i < per ? 64 : 520, y = FY + 52 + (i % per) * 28;
        html += `<span class="sw" style="left:${cx}px;top:${r1(y + 4)}px;background:${t.hex}"></span><span class="a nw" style="left:${cx + 20}px;top:${r1(y)}px;font:600 15px/20px var(--body);color:var(--b-text)">${A(t.name)}</span><span class="a c-mono nw" style="left:${cx + 176}px;top:${r1(y + 2)}px">${A(t.hex)}</span><span class="a c-note c-quiet nw" style="left:${cx + 256}px;top:${r1(y)}px;color:var(--quiet)">${A(ctx.cap(t.role))}</span>`;
      });
    }
    html += `<h3 class="a c-head" style="left:${ZX[5] + 24}px;top:${r1(FY + 16)}px">In print</h3>` + flow(ZX[5] + 24, FY + 52, 517, [
      note(1, 'HEX and RGB are for screens. OKLCH is the colour as the eye sees it, and the ramps are stepped in it.'),
      note(2, cols.some((c) => ctx.C.cmykParts(c)) ? 'CMYK is given only where the brand supplies it; no Pantone values are given. Match print to a proof: ask your printer for one before a run.' : 'This set gives no CMYK or Pantone values. Match print to a proof: ask your printer for one before a run.'),
    ], 12);
    return sheet(ctx, 'colour-values', { drawing: 'Colour values', scale: 'Not to scale' }, `${html}${svgAll(svg)}`);
  },

  // 019: a section through the type scale. Each token is a level, its baseline a datum line with the drafter's level mark, its line box dimensioned true.
  hierarchy(ctx) {
    const B = ctx.brand, S = B.type.scale, n = S.length, SX = 296, SR = 1100, body = S.find((t) => t.token === 'body');
    const V = B.voice || {}, cands = [...new Set([B.name, specimen(ctx), B.type.sample.caption, ...(V.principles || []).map((p) => p.example), ...(V.writeThis || []).map((w) => w.write)].filter(Boolean))], spent = new Set();
    // each level sets the longest of the brand's lines that fits at the token's true size; reading text sets the sample paragraph at a measure
    const rows = S.map((t) => {
      const f = fontOf(t), stem = stemFor(ctx, t), lh = lineOf(t);
      if (t === body) { const ls = wrap(stem, B.type.sample.paragraph, t.size, 600 - 8, 0); return { t, f, stem, lh, text: B.type.sample.paragraph, lines: ls.length, w: 600 }; }
      // a line no other level has used yet, so no two levels repeat one another
      const fit = cands.filter((s) => inkW(stem, s, t.size, f.track) <= SR - SX - 16).sort((a, b) => b.length - a.length), fresh = fit.filter((s) => ![...spent].some((u) => s.includes(u) || u.includes(s)));
      const text = t.face === 'display' && t.size >= 80 && fit.includes(B.name) ? B.name : fresh[0] || fit[0] || B.name;
      spent.add(text);
      return { t, f, stem, lh, text, lines: 1 };
    });
    const tot = rows.reduce((a, r) => a + r.lines * r.lh, 0), G = Math.max(28, Math.min(112, (947 - 96 - 24 - tot) / (n - 1)));
    let y = 96, html = '', svg = '';
    const R = reds();
    html += `<span class="a c-label" style="left:64px;top:56px">Token</span><span class="a c-label" style="left:${SX}px;top:56px">Set at its size</span><span class="a c-label" style="left:${ZX[6] + 24}px;top:56px">Use</span>`;
    rows.forEach((r) => {
      const bo = baseline(r.stem, r.t.size, r.lh), base = y + bo;
      // the datum: a hairline at the baseline, the level mark (a filled triangle on it) at the token column
      svg += `<path d="M64 ${r1(base) + 0.5}H${SR + 24}" stroke="var(--hair)" stroke-width="1"/><path d="M${232} ${r1(base) + 0.5}l-7 -10h14z" fill="var(--ink)"/>`;
      html += `<span class="a c-mono" style="left:64px;top:${r1(base - 20)}px">${A(r.t.token)}</span><span class="a c-note nw" style="left:64px;top:${r1(base + 4)}px">${r.t.size} / ${r.lh} px</span>`;
      html += r.lines === 1
        ? `<p class="a ${r.f.cls} nw" style="left:${SX}px;top:${r1(y)}px;${r.f.style}">${A(r.text)}</p>`
        : `<p class="a ${r.f.cls}" style="left:${SX}px;top:${r1(y)}px;width:${r.w}px;${r.f.style}">${A(r.text)}</p>`;
      // the first line box, dimensioned at its true height
      R.dim([SR, y], [SR, y + r.lh], [1, 0], { d: 24, value: `${r.lh}`, place: 'side' });
      html += `<p class="a c-note" style="left:${ZX[6] + 24}px;top:${r1(base - 16)}px;width:${1523 - ZX[6] - 24}px">${A(r.t.use)}</p>`;
      html += `<span class="a c-label nw" style="left:${ZX[6] + 24}px;top:${r1(base + 6)}px">${A(B.fonts[r.t.face].family)} ${r.t.weight}</span>`;
      y += r.lines * r.lh + G;
    });
    return sheet(ctx, 'hierarchy', { drawing: 'Type levels', scale: '[1:1], line boxes in px' }, `${svgAll(svg)}${html}${R.svg()}`);
  },

  // 020: an elevation of a piece the brand would print, an A5 flyer at 1:1, composed only from the type scale, each setting called out to its token.
  'type-in-use'(ctx) {
    const B = ctx.brand, S = B.type.scale, L = ctx.roles.light, FW = (148 * PX), FH = (210 * PX), X = 128, Y = 104, PAD = 40, IW = FW - 2 * PAD;
    const tok = (k) => S.find((t) => t.token === k);
    const body = tok('body') || S.find((t) => t.face === 'body'), cap = tok('caption') || S.filter((t) => t.face === 'body').at(-1);
    // the headline: the headline token when the sample sets in four lines or fewer at it, else the next display size down
    const disp = S.filter((t) => t.face === 'display' && t.size < 90).sort((a, b) => b.size - a.size);
    const hl = disp.find((t) => wrap(stemFor(ctx, t), specimen(ctx), t.size, IW - 8, -0.01).length <= 4) || disp.at(-1);
    // the lead: the largest body size above reading text, else the smallest display size
    const lead = S.filter((t) => t.face === 'body' && t.size > body.size).sort((a, b) => b.size - a.size)[0] || disp.at(-1);
    const parts = [
      { t: hl, text: specimen(ctx), colour: L.text },
      { t: lead, text: specimen(ctx, 1), colour: L.text },
      { t: body, text: B.type.sample.paragraph, colour: L.textSoft },
      { t: cap, text: B.type.sample.caption, colour: L.quiet },
    ];
    const g = ctx.logo.geos.horizontal, LW = Math.floor(Math.min(180, (40 * g.w) / g.h)), LH = (LW * g.h) / g.w;
    let html = `<div class="a" style="left:${X}px;top:${Y}px;width:${r1(FW)}px;height:${r1(FH)}px;background:var(--b-ground)"></div>`;
    html += `<div class="a" style="left:${X + PAD}px;top:${Y + PAD}px;width:${LW}px">${ctx.logo.html('horizontal', { width: LW, label: 'Logo' })}</div>`;
    let svg = `<rect x="${X}" y="${Y}" width="${r1(FW)}" height="${r1(FH)}" stroke="var(--ink)" stroke-width="1"/>`;
    // the headline and lead hang from the logo; the paragraph and caption stand on the flyer's foot
    let y = Y + PAD + LH + 64;
    const placed = parts.map((p) => {
      const f = fontOf(p.t), stem = stemFor(ctx, p.t), lh = lineOf(p.t), ls = wrap(stem, p.text, p.t.size, IW - 8, f.track);
      return { ...p, f, stem, lh, ls, h: ls.length * lh };
    });
    placed[0].y = y; y += placed[0].h + 24; placed[1].y = y;
    placed[3].y = Y + FH - PAD - placed[3].h; placed[2].y = placed[3].y - 32 - placed[2].h;
    svg += `<path d="M${X + PAD} ${r1(placed[3].y - 16) + 0.5}H${r1(X + FW - PAD)}" stroke="${L.divider}" stroke-width="1"/>`;
    placed.forEach((p) => {
      const st = p.f.cls === 'bd' ? `${p.f.style};color:${p.colour}` : p.f.style.replace('color:var(--b-text)', `color:${p.colour}`);
      // the browser wraps the copy whole at the measure; the measured line count only places it
      html += `<p class="a ${p.f.cls}" style="left:${X + PAD}px;top:${r1(p.y)}px;width:${r1(IW)}px;white-space:normal;${st}">${A(p.text)}</p>`;
    });
    // callouts: from the end of each setting's first line out past the flyer's right edge to a numbered tag, the setting written beside it
    const TX = X + FW + 72, NX = TX + 32;
    let prev = -99;
    placed.forEach((p, i) => {
      const mid = p.y + baseline(p.stem, p.t.size, p.lh) - p.t.size * 0.3, end = X + PAD + inkEnd(p.stem, p.ls[0], p.t.size, p.f.track) + 12;
      const ty = Math.max(mid, prev + 96); prev = ty;
      svg += `<circle cx="${r1(end)}" cy="${r1(mid)}" r="2.5" fill="var(--ink)"/><path d="M${r1(end)} ${r1(mid) + 0.5}H${r1(X + FW + 16)}L${r1(TX - 14)} ${r1(ty)}" stroke="var(--ink)" stroke-width="1"/>`;
      html += detailTag(TX, ty, i + 1);
      html += `<p class="a c-head nw" style="left:${r1(NX)}px;top:${r1(ty - 11)}px">${A(ctx.cap(p.t.token))}, ${A(B.fonts[p.t.face].family)} ${p.t.weight}</p><p class="a c-note" style="left:${r1(NX)}px;top:${r1(ty + 13)}px;width:300px"><span class="v">${p.t.size} / ${p.lh} px</span>. ${A(p.t.use)}</p>`;
    });
    const R = reds();
    R.dim([X, Y], [X + FW, Y], [0, -1], { d: 32, value: '148' });
    R.dim([X, Y], [X, Y + FH], [-1, 0], { d: 32, value: '210', place: 'left' });
    const used = new Set(placed.map((p) => p.t.token)).size;
    html += `<h3 class="a c-head" style="left:${ZX[6] + 24}px;top:64px">General notes</h3>` + flow(ZX[6] + 24, 102, 329, [
      note(1, `An A5 flyer drawn at 1:1, set from ${count(used).toLowerCase()} tokens of the type scale and nothing else.`),
      note(2, `Copy in ${A(B.fonts.body.family)} takes the text colour for lines and the softer one for reading. The caption is in the quiet tone, under a rule.`),
    ]);
    return sheet(ctx, 'type-in-use', { drawing: 'Type in use', scale: '[1:1], sizes in mm' }, `${html}${svgAll(svg)}${R.svg()}`);
  },

  // 021: the lettering rules. The headline set right, across the sheet at the display size, then each rule as a numbered note: what to do, and what never to.
  'type-rules'(ctx) {
    const B = ctx.brand, S = B.type.scale, rules = B.type.rules, stem = displayStem(ctx), text = specimen(ctx);
    const disp = S.filter((t) => t.face === 'display').sort((a, b) => b.size - a.size);
    const t = disp.find((x) => wrap(stem, text, x.size, 1280, -0.01).length <= 2) || disp.at(-1), lh = lineOf(t), ls = wrap(stem, text, t.size, 1280, -0.01);
    let html = `<p class="a bd" style="left:64px;top:72px;width:1288px;white-space:normal;font-size:${t.size}px;line-height:${lh}px">${A(text)}</p>`;
    let svg = '';
    // one callout off the last line's end: the setting the headline is in
    const bo = baseline(stem, t.size, lh), my = 72 + (ls.length - 1) * lh + bo - t.size * 0.35, ex = 64 + inkEnd(stem, ls.at(-1), t.size, -0.01) + 16, tx = Math.max(ex + 64, 1000);
    svg += `<circle cx="${r1(ex)}" cy="${r1(my)}" r="2.5" fill="var(--ink)"/><path d="M${r1(ex)} ${r1(my) + 0.5}H${r1(tx - 14)}" stroke="var(--ink)" stroke-width="1"/>`;
    html += detailTag(tx, my, 'A') + `<p class="a c-head nw" style="left:${r1(tx + 26)}px;top:${r1(my - 11)}px">${A(ctx.cap(t.token))}, ${A(B.fonts.display.family)} ${t.weight}</p><p class="a c-note nw" style="left:${r1(tx + 26)}px;top:${r1(my + 13)}px"><span class="v">${t.size} / ${lh} px</span>, tracking <span class="v">-0.01 em</span>, sentence case</p>`;
    // the rules: a head rule, then one row each, the do in ink, the never beside a drafted cross
    const top = Math.max(72 + ls.length * lh + 72, 400), C = { n: 64, do: 112, no: ZX[4] + 24, cross: ZX[4] };
    const rowH = (r) => Math.max(wrap('Chivo-500', r.do, 15, 600).length * 22, wrap('Chivo-400', r.dont, 13, 600).length * 20) + 24;
    html += `<span class="a c-label" style="left:${C.do}px;top:${top - 24}px">Do</span><span class="a c-label" style="left:${C.no}px;top:${top - 24}px">Never</span>`;
    svg += `<path d="M64 ${top - 0.5}H1523" stroke="var(--ink)" stroke-width="1.5"/>`;
    let y = top;
    rules.forEach((r, i) => {
      html += `<span class="a c-mono" style="left:${C.n}px;top:${y + 14}px">${i + 1}</span><p class="a c-head" style="left:${C.do}px;top:${y + 12}px;width:620px">${A(r.do)}</p><p class="a c-note" style="left:${C.no}px;top:${y + 13}px;width:620px">${A(r.dont)}</p>`;
      svg += `<path d="M${C.cross} ${y + 19}l9 9m0 -9l-9 9" stroke="var(--ink)" stroke-width="1.25"/>`;
      y += rowH(r);
      svg += `<path d="M64 ${y + 0.5}H1523" stroke="var(--hair)" stroke-width="1"/>`;
    });
    // the scale as a rule: every size in it ticked on a px rule, the band under the smallest size hatched
    const sizes = [...new Set(S.map((x) => x.size))].sort((a, b) => a - b), min = sizes[0], max = sizes.at(-1);
    const RY = Math.max(y + 72, 860), RX0 = 112, RW = 1411, k = RW / max;
    let hatch = '';
    for (let hx = 0; hx < min * k + 14; hx += 6) hatch += `M${r1(RX0 + hx)} ${RY}l-14 14`;
    svg += `<clipPath id="g3-cl"><rect x="${RX0}" y="${RY}" width="${r1(min * k)}" height="14"/></clipPath><path d="${hatch}" stroke="var(--quiet)" stroke-width="1" clip-path="url(#g3-cl)"/>`;
    svg += `<path d="M${RX0} ${RY + 14.5}H${RX0 + RW}" stroke="var(--ink)" stroke-width="1"/>`;
    for (let v = 0; v <= max; v += 10) svg += `<path d="M${r1(RX0 + v * k) + 0.5} ${RY + 14}v${v % 50 ? 4 : 8}" stroke="var(--ink)" stroke-width="1"/>`;
    sizes.forEach((s) => { svg += `<path d="M${r1(RX0 + s * k) + 0.5} ${RY + 14}l-5 -8h10z" fill="var(--ink)"/>`; });
    html += `<span class="a c-label nw" style="left:64px;top:${RY}px">px</span>`;
    let last = -99;
    sizes.forEach((s) => { const x = RX0 + s * k; if (x - last < 28) return; last = x; html += `<span class="a c-mono" style="left:${r1(x)}px;top:${RY + 24}px;transform:translateX(-50%)">${s}</span>`; });
    html += `<p class="a c-note nw" style="right:${1587 - RX0 - RW}px;top:${RY - 32}px;text-align:right">Every size in the scale, ticked. Nothing is set in the hatched band under <span class="v">${min} px</span>.</p>`;
    return sheet(ctx, 'type-rules', { drawing: 'Lettering rules', scale: '[1:1], sizes in px' }, `${svgAll(svg)}${html}`);
  },
};

export function css() {
  return '';
}
