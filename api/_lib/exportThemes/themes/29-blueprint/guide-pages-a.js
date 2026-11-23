// Theme 29, Drawing Sheet: the style guide's first four pages (cover, logo, colour, proportion). Every fact comes from engine/styleguide.js; nothing here names a colour id, a hex or a brand.
import { colourFacts, logoFacts } from '../../engine/styleguide.js';
import { hook, hookAdd, drawWithFewer, SLOT_MIN_H } from '../../engine/guide-layout.js';
import { esc as A } from '../../engine/brand.js';
import { copyOf, copyRaw } from './guide-copy.js';
import { X0, XR, CW, COL, COLW, BOT, SUBH, CH, cap1, pad2, pct, numberWord, weightName, longDate, px, tw, nLines, para, kit, art as logoArtK, at, rect, hr, obj, sec, register, shell, title, flow, dimH, dimV, cloud, sum } from './guide-kit.js';

const xs = (n) => `${+(+n).toFixed(1)} x`;

// ---------------------------------------------------------------- cover
export function cover(ctx) {
  const K = kit(ctx), B = ctx.brand, G = ctx.logo.geos.colour, F = colourFacts(ctx), { R, S } = K, svg = [], slot = ctx.edition === 'slot';
  const lw = Math.min(CW, 280), lh = slot ? 88 : (lw * G.h) / G.w, logoY = 76;
  const logo = at(X0, logoY, logoArtK(ctx, 'colour', lw, slot ? { h: lh, frame: true } : {}));
  svg.push(dimH({ x1: X0, x2: X0 + lw, y: logoY + lh + 22, label: px(lw), obj: logoY + lh }));
  // the brand's one line, as large as sets in three lines
  const line = B.lines.primary, d = B.fonts.display;
  const size = slot ? 24 : [64, 56, 48, 40, 34, 28].find((s) => nLines(S.disp, line, s, CW, K.st) <= 3) || 28, lineH = Math.round(size * 1.08), nl = slot ? 0 : nLines(S.disp, line, size, CW, K.st);
  const stmtY = logoY + lh + 22 + 36, stmtB = stmtY + (slot ? 96 : nl * lineH);
  const stmt = at(X0, stmtY, A(line), { w: CW, cls: 'ga-d', style: `font-size:${size}px;line-height:${lineH}px;color:var(--ink)` });
  // the facts register at the foot, two columns
  const facts = [['Date', longDate(B.version.date)], ['Version', B.version.number], ['Display', `${d.family}, ${weightName(ctx.weights.heading)}`], ['Text', `${B.fonts.body.family}, ${weightName(ctx.weights.regular)} and ${weightName(ctx.weights.medium)}`]];
  if (B.fonts.mono) facts.push(['Mono', B.fonts.mono.family]); else facts.push(['Format', 'A4 portrait, 210 x 297 mm']);
  facts.push(['Scale', '1 : 1 at 96 dpi']);
  const colW = Math.floor((CW - 24) / 2), kw = 72, vW = colW - kw, nRows = facts.length / 2;
  const rowH = Array.from({ length: nRows }, (_, i) => Math.max(24, ...[facts[i * 2], facts[i * 2 + 1]].map(([, v]) => para(String(v), vW).h + 8)));
  const regTop = BOT - sum(rowH) - 1;
  const cell = ([, v]) => `<div class="ga-n">${A(v)}</div>`;
  const facts2 = register(K, X0, regTop, colW, rowH.map((h, i) => [facts[i * 2][0], cell(facts[i * 2]), h]), { kw })
    + register(K, X0 + colW + 24, regTop, colW, rowH.map((h, i) => [facts[i * 2 + 1][0], cell(facts[i * 2 + 1]), h]), { kw });
  // the revision cloud: the drafter's mark round the version, the one thing a reader should check against their own copy
  svg.push(cloud(X0 + kw - 6, regTop + rowH[0] + 1, 54, rowH[1] - 3, 6));
  // the palette: the colours that carry a share, equal plates, each with its number and name beneath
  let cols = F.filter((f) => (f.share ?? 0) >= 0.01).slice(0, 6);
  if (!cols.length) cols = F.slice(0, 6);
  const n = cols.length, gap = 12, pw = n === 1 ? Math.min(CW, 346) : Math.floor((CW - gap * (n - 1)) / n);
  const labH = 20 + 16 * Math.max(...cols.map((f) => nLines(CH[500], f.name, 12, pw))), top = stmtB + 40, ph = Math.min(slot ? 480 : 420, regTop - 32 - labH - top);
  if (ph < 96) throw new Error(`Drawing Sheet guide: the cover palette has ${ph} px to sit in`);
  const plates = cols.map((f, i) => {
    const x = X0 + i * (pw + gap);
    return obj(K, x, top, pw, ph, f.hex, at(8, 8, A(pct(f.share)), { cls: 'ga-r', style: `color:${R.onColour(f.hex, 12, 500)};font-weight:500` }))
      + at(x, top + ph + 8, `<div class="ga-r ga-q">${pad2(i + 1)}</div><div class="ga-r ga-wrap" style="font-weight:500">${A(f.name)}</div>`, { w: pw });
  }).join('');
  return shell(ctx, 'cover', logo + stmt + plates + facts2, svg.join(''));
}

// ---------------------------------------------------------------- logo
export const logoPage = (ctx) => drawWithFewer((max) => logoDraw(ctx, max), 6);
function logoDraw(ctx, maxTiles) {
  const K = kit(ctx), { R } = K, L = ctx.logo, G = L.geos.colour, unit = L.geo.unit, LF = logoFacts(ctx), slot = ctx.edition === 'slot', svg = [];
  const art = (id, w, o = {}) => logoArtK(ctx, id, w, o);
  const t = title(ctx, K, 'logo', [`Clear space is one x. Never set it under ${L.minSize.screenPx} px wide.`, 'One x clear on every side.']);

  // 1 clear space: the logo on its ground, one x clear on every side, drawn as solid squares, measured with dimension lines; the rule and its figures in the first column
  const xw = G.w / unit, xh = G.h / unit, fwX = xw + 2, fhX = xh + 2, plateX = COL[1] + 56, plateW = XR - plateX, DIMB = 32;
  const ruleText = 'x is the cap height of the name. Keep one x clear on every side: no text, edge or mark enters it.';
  const ruleH = para(ruleText, COLW).h;
  const kv = slot ? [['x', 'Cap height of the name'], ['Clear', 'One x on every side'], ['Minimum', `${L.minSize.screenPx} px, ${L.minSize.printMm} mm`]]
    : [['x', `${L.clearShare}% of logo height`], ['Logo', `${xw.toFixed(1)} × ${xh.toFixed(1)} x`], ['Minimum', `${L.minSize.screenPx} px, ${L.minSize.printMm} mm`]];
  const kvH = kv.map(([, v]) => Math.max(24, para(v, COLW - 80).h + 8));
  const gA = {};
  const drawA = (y) => {
    const { u, fw, fh, lw } = gA, py = y + SUBH + 8, px0 = plateX + Math.floor((plateW - fw) / 2);
    const sq = (x, yy) => rect(x, yy, u, u, `background:${R.edge}`, `<div class="ga-r" style="font-size:${Math.min(12, u - 2)}px;line-height:${u}px;text-align:center;color:${R.onColour(R.edge, 12, 500)}">x</div>`);
    const cx = px0 + (fw - u) / 2, cy = py + (fh - u) / 2;
    svg.push(dimV({ x: px0 - 16, y1: py, y2: py + fh, label: xs(fhX), obj: px0 }));
    svg.push(dimH({ x1: px0, x2: px0 + fw, y: py + fh + 18, label: xs(fwX), obj: py + fh }));
    return sec(K, X0, y, CW, '01', 'Clear space', 'one x on every side')
      + obj(K, px0, py, fw, fh, R.ground, '', { frame: true })
      + at(px0 + u, py + u, art('colour', lw, { frame: slot }))
      + sq(cx, py) + sq(cx, py + fh - u) + sq(px0, cy) + sq(px0 + fw - u, cy)
      + at(X0, py, `<div class="ga-n">${A(ruleText)}</div>`, { w: COLW })
      + register(K, X0, py + ruleH + 12, COLW, kv.map(([k, v], i) => [k, `<div class="ga-n">${A(v)}</div>`, kvH[i]]), { kw: 80 });
  };

  // 2 colourways, each on the ground it is drawn for (one tile per drawing; the slot edition one per colourway, as it draws one frame whatever the drawing)
  const groups = [];
  for (const g of LF.grounds) {
    const key = slot ? g.groundHex.toLowerCase() : JSON.stringify(g.cw);
    const f = groups.find((o) => o.key2 === key);
    if (f) f.labels.push(g.label); else groups.push({ ...g, key2: key, labels: [g.label] });
  }
  if (groups.length > maxTiles) groups.length = maxTiles;
  const lgw = Math.min(180, Math.max(116, Math.round((44 * G.w) / G.h))), lgh = slot ? 48 : (lgw * G.h) / G.w;
  let perRow = Math.min(3, groups.length);
  const tileW = (pr) => Math.floor((CW - 12 * (pr - 1)) / pr);
  while (perRow > 1 && lgw + 24 > tileW(perRow)) perRow -= 1;
  if (lgw + 24 > tileW(perRow)) throw new Error(`Drawing Sheet guide: the colourway tile is ${tileW(perRow)} px wide and the logo needs ${lgw + 24}`);
  const TW = tileW(perRow), tileLab = (g) => (g.labels.length > 2 ? `${g.labels[0]}, ${g.labels[1]} and ${g.labels.length - 2} more` : g.labels.join(' and '));
  const labLines = Math.max(...groups.map((g) => nLines(CH[400], tileLab(g), 12, TW - 24)));
  const rowsN = Math.ceil(groups.length / perRow), th = Math.ceil(12 + lgh + 12 + 16 * labLines + 12);
  const B_h = SUBH + 8 + rowsN * th + (rowsN - 1) * 12;
  const drawB = (y) => sec(K, X0, y, CW, '02', 'Colourways', 'each on the ground it is drawn for') + groups.map((g, i) => {
    const x = X0 + (i % perRow) * (TW + 12), ty = y + SUBH + 8 + Math.floor(i / perRow) * (th + 12), ink = R.onColour(g.groundHex, 12, 500);
    return obj(K, x, ty, TW, th, g.groundHex, at(12, 12, art('colour', lgw, { colourway: g.key, color: ink, h: slot ? lgh : undefined })) + at(12, th - 12 - 16 * labLines, A(tileLab(g)), { w: TW - 24, cls: 'ga-r', style: `color:${ink}` }));
  }).join('');

  // 3 the smallest size, drawn at the size it names, with its width measured
  const mn = L.minSize, minW = mn.screenPx, minH = slot ? 32 : (minW * G.h) / G.w, labelInside = !slot || minH >= SLOT_MIN_H;
  const minText = `Never set the logo narrower than ${mn.screenPx} px on screen or ${mn.printMm} mm in print, so the name keeps reading.`;
  const mnPlateW = minW + 24, mnTextW = CW - mnPlateW - 24, mnTextH = para(minText, mnTextW).h;
  const mnPlateH = Math.ceil(minH) + 24 + (labelInside ? 0 : 20), C_h = SUBH + 8 + Math.max(mnPlateH + 28, mnTextH);
  if (mnTextW < COLW) throw new Error(`Drawing Sheet guide: the smallest size (${minW} px) leaves ${mnTextW} px for its text`);
  const minArt = art('colour', minW, { h: slot ? minH : undefined, frame: slot });
  const drawC = (y) => {
    const py = y + SUBH + 8;
    svg.push(dimH({ x1: X0 + 12, x2: X0 + 12 + minW, y: py + mnPlateH + 18, label: `${minW} px`, obj: py + mnPlateH }));
    return sec(K, X0, y, CW, '03', 'Smallest size', `${mn.screenPx} px, ${mn.printMm} mm`)
      + obj(K, X0, py, mnPlateW, mnPlateH, R.ground, at(12, 12, minArt) + (labelInside ? '' : at(12, 12 + Math.ceil(minH) + 4, 'Logo', { cls: 'ga-r ga-q' })), { frame: true })
      + at(X0 + mnPlateW + 24, py, A(minText), { w: mnTextW, cls: 'ga-n' });
  };

  // 4 lockups: horizontal, stacked and symbol, each with the line that says when to use it (the slot edition carries neutral lines)
  const LK = [['horizontal', 'Horizontal'], ['stacked', 'Stacked'], ['symbol', 'Symbol']];
  const lkWhen = (id) => (slot ? { horizontal: 'Headers, signatures, wide spaces.', stacked: 'Squarer spaces, such as avatars.', symbol: 'App icon, favicon and stamp.' }[id] : ctx.brand.logo.when[id]);
  const lkTile = 56, lkMaxH = 32, lkMaxW = COLW - 32;
  const lkW = (id) => { const g = L.geos[id]; const w = Math.min(lkMaxW, (lkMaxH * g.w) / g.h); return slot ? Math.max(w, 56) : w; };
  const lkCap = Math.max(...LK.map(([id]) => nLines(CH[400], lkWhen(id), 12, COLW) * 16));
  const D_h = SUBH + 8 + lkTile + 8 + 16 + 2 + lkCap;
  const drawD = (y) => sec(K, X0, y, CW, '04', 'Lockups') + LK.map(([id, name], i) => {
    const x = COL[i], ty = y + SUBH + 8, w = lkW(id), h0 = (w * L.geos[id].h) / L.geos[id].w, h = slot ? Math.min(44, Math.max(28, h0)) : h0;
    return obj(K, x, ty, COLW, lkTile, R.ground, at((COLW - w) / 2, (lkTile - h) / 2, art(id, w, { h: slot ? h : undefined })), { frame: true })
      + at(x, ty + lkTile + 8, A(name), { cls: 'ga-h' }) + at(x, ty + lkTile + 8 + 18, A(lkWhen(id)), { w: COLW, cls: 'ga-r ga-q' });
  }).join('');

  // 5 never: four rules, in words, each under a rule
  const nev = [['Stretch', 'Never stretch or squash it.'], ['Recolour', 'Never recolour it outside its colourways.'], ['Crowd', 'Never crowd it inside its clear space.'], ['Rearrange', 'Never move or redraw its parts.']];
  const NW = Math.floor((CW - 3 * 12) / 4), nevH = 8 + 20 + Math.max(...nev.map(([, s]) => para(s, NW).h));
  const E_h = SUBH + 8 + nevH;
  const drawE = (y) => sec(K, X0, y, CW, '05', 'Never') + nev.map(([k, s], i) => {
    const x = X0 + i * (NW + 12), ny = y + SUBH + 8;
    return hr(x, ny, NW, R.edge) + at(x, ny + 8, `<div class="ga-h">${A(k)}</div><div class="ga-n">${A(s)}</div>`, { w: NW });
  }).join('');

  // the clear-space drawing takes what the other sections leave, as tall as the room, one x on every side
  const fixed = B_h + C_h + D_h + E_h + 4 * 16, room = BOT - t.top - fixed - SUBH - 8 - DIMB;
  const textH = ruleH + 12 + sum(kvH) + 1;
  const u = Math.floor(Math.min(plateW / fwX, room / fhX, 40));
  if (u < 12) {
    if (groups.length > perRow) return { fewer: perRow };
    throw new Error(`Drawing Sheet guide: the clear-space drawing gets ${Math.max(0, u)} px for one x (it needs 12)`);
  }
  Object.assign(gA, { u, fw: fwX * u, fh: fhX * u, lw: xw * u, lh: xh * u });
  gA.h = SUBH + 8 + Math.max(fhX * u + DIMB, textH);
  if (gA.h + fixed > BOT - t.top && groups.length > perRow) return { fewer: perRow };
  ctx.logoShown = groups.flatMap((g) => g.labels.map((label, i) => ({ key: i ? LF.grounds.find((o) => o.label === label).key : g.key, label })));
  hook(ctx, { lockups: LK.map(([id, name]) => [name, lkWhen(id)]) });
  if (slot) hookAdd(ctx, 'supply', [['Logo', 'Horizontal, stacked and symbol, SVG']]);
  const body = flow('logo', t.top, [{ h: gA.h, draw: drawA }, { h: B_h, draw: drawB }, { h: C_h, draw: drawC }, { h: D_h, draw: drawD }, { h: E_h, draw: drawE }], { gap: 16, maxGap: 40 });
  return shell(ctx, 'logo', t.html + body, svg.join(''));
}

// ---------------------------------------------------------------- colour
export function colourPage(ctx) {
  const K = kit(ctx), { R } = K, F = colourFacts(ctx);
  const t = title(ctx, K, 'colour', copyOf(ctx, 'colour', [F.length > 1 ? `${cap1(numberWord(F.length))} colours, widest first.` : 'The colour and how to write it down.', 'The palette and its values.']));
  const cmykOf = ([r, g, b]) => { const k = 1 - Math.max(r, g, b) / 255; return k >= 1 ? [0, 0, 0, 100] : [r, g, b].map((v) => ((1 - v / 255 - k) / (1 - k)) * 100).concat(k * 100).map(Math.round); };
  const computed = F.some((f) => !f.cmyk);
  const foot = computed ? 'CMYK * is computed from the hex: proof before print.' : '';
  // 1 to 6 colours: two columns, a roomy plate and a four-row register. From 7 the sheet goes denser (three columns, a tighter plate and rows) so the page is never dropped for palette size;
  // a palette too big even for that draws the first colours that fit and says how many it shows (the markdown guide and the kit's colour files list them all)
  const dense = F.length > 6;
  const cols = F.length > 1 ? (dense ? 3 : 2) : 1, gx = dense ? 16 : 24, cw = Math.floor((CW - gx * (cols - 1)) / cols);
  const KW = dense ? 72 : 88, rowK = dense ? 20 : 24, pad = dense ? 8 : 12, numW = dense ? 32 : 56, gy = dense ? 12 : 20, plateGap = dense ? 6 : 8;
  const textW = cw - KW;
  const inkText = (f) => `${f.ink.name} ${f.ink.ratioText}:1 ${f.ink.grade}`;
  const nameW = cw - 2 * pad - numW - 4, footH = foot ? 20 : 0, noteH = 20;
  // the size of the first k colours' grid: the last register row and the plate follow the tallest text among them
  const runMax = (xs) => xs.reduce((o, v, i) => { o.push(Math.max(v, i ? o[i - 1] : 0)); return o; }, []);
  const inkMax = runMax(F.map((f) => Math.max(rowK, para(inkText(f), textW).h + 8))), nameMax = runMax(F.map((f) => nLines(CH[500], f.name, 14, nameW)));
  const sizeOf = (k) => {
    const lastH = inkMax[k - 1], minPlate = dense ? Math.max(48, 2 * pad + 16 + nameMax[k - 1] * 20) : 64, rowH = minPlate + plateGap + 3 * rowK + lastH + 1, nRows = Math.ceil(k / cols);
    return { lastH, minPlate, rowH, nRows, h: nRows * rowH + (nRows - 1) * gy };
  };
  // what the grid may take: the page body less the title and the foot line, each with the flow's 12 px; a note line, when the palette is cut, takes its own 20 and 12
  const room = BOT - t.top - (foot ? footH + 12 : 0) - 4;
  let shown = F.length;
  if (sizeOf(shown).h > room) {
    while (shown > cols && sizeOf(shown).h > room - noteH - 12) shown -= 1;
    if (shown > cols) shown -= shown % cols;
  }
  const cut = shown < F.length, { lastH, minPlate, rowH, nRows } = sizeOf(shown), regH = 3 * rowK + lastH + 1;
  const G = F.slice(0, shown);
  const note = cut ? `Showing the first ${shown} of ${F.length} colours, widest first. The markdown style guide and the kit's colour files list all of them.` : '';
  const gridH = sizeOf(shown).h;
  const draw = (y, extra) => {
    const ph = minPlate + Math.floor(extra / nRows);
    return G.map((f, i) => {
      const x = X0 + (i % cols) * (cw + gx), py = y + Math.floor(i / cols) * (ph + plateGap + regH + gy), [r, g, b] = f.rgb, ink = R.onColour(f.hex, 13, 500);
      const cmyk = f.cmyk ? (Array.isArray(f.cmyk) ? f.cmyk.join(' ') : String(f.cmyk)) : `${cmykOf(f.rgb).join(' ')} *`;
      const mono = (v) => `<div class="ga-m">${A(v)}</div>`;
      const rows = [['HEX', mono(f.hex.replace('#', '').toUpperCase()), rowK], ['RGB', mono(`${r} ${g} ${b}`), rowK], ['CMYK', mono(cmyk), rowK], ['Set text in', `<div class="ga-n">${A(inkText(f))}</div>`, lastH]];
      return obj(K, x, py, cw, ph, f.hex, at(pad, pad, `<div class="ga-h ga-wrap" style="color:${ink}">${A(f.name)}</div><div class="ga-r" style="color:${ink}">${A(pct(f.share))}, ${A(f.role)}</div>`, { w: nameW })
        + at(cw - pad - numW, pad, A(pad2(i + 1)), { w: numW, cls: 'ga-r', style: `text-align:right;color:${ink}` }))
        + register(K, x, py + ph + plateGap, cw, rows, { kw: KW });
    }).join('');
  };
  const secs = [{ h: gridH, flex: 400, draw }];
  if (foot) secs.push({ h: footH, draw: (y) => at(X0, y, A(foot), { w: CW, cls: 'ga-r ga-q' }) });
  if (note) secs.push({ h: noteH, draw: (y) => at(X0, y, A(note), { w: CW, cls: 'ga-r ga-q' }) });
  return shell(ctx, 'colour', t.html + flow('colour', t.top, secs, { gap: 12, maxGap: 24 }));
}

// ---------------------------------------------------------------- proportion
export function rulerPage(ctx) {
  const K = kit(ctx), { R } = K, B = ctx.brand, F = colourFacts(ctx).slice().sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const top0 = F[0];
  const t = title(ctx, K, 'ruler', copyOf(ctx, 'ruler', [top0 && typeof top0.share === 'number' ? `${top0.name} holds ${pct(top0.share)}. The rest is held back.` : 'How much of each colour a page carries.', 'How much of each colour a page carries.']));
  // the bar: widths by share inside a 1 px keyline, no segment under 6 px (the shortfall comes off the widest), rounded by largest remainder to the inner width
  const MIN = 6, shares = F.map((f) => (typeof f.share === 'number' && Number.isFinite(f.share) ? f.share : 1 / F.length)), tot = sum(shares) || 1;
  let raw = shares.map((s) => (s / tot) * CW);
  const low = raw.map((w) => w < MIN), short = sum(raw.map((w, i) => (low[i] ? MIN - w : 0)));
  const wi = raw.indexOf(Math.max(...raw));
  raw = raw.map((w, i) => (low[i] ? MIN : i === wi ? w - short : w));
  const base = raw.map(Math.floor);
  const left = CW - sum(base);
  raw.map((w, i) => ({ i, f: w - Math.floor(w) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach((o) => { base[o.i] += 1; });
  const BAR = 56;
  const barSec = { h: SUBH + 8 + BAR, flex: 460, draw: (y, extra = 0) => {
    let x = 0;
    const by = y + SUBH + 8, bh = BAR + extra;
    const segs = F.map((f, i) => {
      const lab = pct(f.share), s = rect(X0 + x, by, base[i], bh, `background:${f.hex}`, tw(CH[500], lab, 12) + 16 <= base[i] ? at(8, 8, A(lab), { cls: 'ga-r', style: `color:${R.onColour(f.hex, 12, 500)};font-weight:500` }) : '');
      x += base[i];
      return s;
    }).join('');
    return sec(K, X0, y, CW, '01', 'Proportion of a sheet', `${F.length} colour${F.length === 1 ? '' : 's'}, widest first`)
      + segs + rect(X0, by, CW, bh, `outline:1px solid ${R.edge};outline-offset:-1px`);
  } };
  // the register
  const rows = F.slice(0, 8), RH = 28;
  const tabSec = { h: SUBH + 8 + rows.length * RH + 1, flex: 8 * rows.length, draw: (y, extra = 0) => {
    const rh = RH + Math.floor(extra / rows.length);
    return sec(K, X0, y, CW, '02', 'Share by colour') + rows.map((f, i) => {
      const yy = y + SUBH + 8 + i * rh;
      return hr(X0, yy, CW, R.hair) + rect(X0, yy + Math.floor((rh - 14) / 2), 14, 14, `background:${f.hex};${K.R.near(f.hex) ? `outline:1px solid ${R.edge};outline-offset:-1px` : ''}`)
        + at(X0 + 28, yy + Math.floor((rh - 16) / 2), A(f.name), { w: 250, cls: 'ga-h ga-e' }) + at(COL[1] + 48, yy + Math.floor((rh - 16) / 2), A(f.role), { w: 220, cls: 'ga-r ga-q ga-e' })
        + at(XR - 80, yy + Math.floor((rh - 16) / 2), A(pct(f.share)), { w: 80, cls: 'ga-m', style: 'text-align:right' });
    }).join('') + hr(X0, y + SUBH + 8 + rows.length * rh, CW, R.hair);
  } };
  // the rules
  const markRules = copyRaw(ctx, 'markRules', []);
  const rules = ((B.guideB && B.guideB.rules) || []).filter((_, i) => !(ctx.edition === 'slot' && markRules.includes(i))).map((r) => (typeof r === 'string' ? { title: '', text: r } : { title: r.title || '', text: r.text || '' }));
  const secs = [barSec, tabSec];
  // the slot edition has no rules of its own to set (each would be a placeholder block of unmeasurable height), so the bars and the register take the room
  if (rules.length && ctx.edition !== 'slot') {
    const rc = Math.min(3, rules.length), RW = Math.floor((CW - 12 * (rc - 1)) / rc), rowsN = Math.ceil(rules.length / rc);
    const hs = rules.map((r) => 8 + (r.title ? 20 : 0) + para(r.text, RW).h);
    const rowH = Array.from({ length: rowsN }, (_, i) => Math.max(...hs.slice(i * rc, i * rc + rc)));
    secs.push({ h: SUBH + 8 + sum(rowH) + 12 * (rowsN - 1), draw: (y) => sec(K, X0, y, CW, '03', 'Rules') + rules.map((r, i) => {
      const cy = y + SUBH + 8 + sum(rowH.slice(0, Math.floor(i / rc))) + 12 * Math.floor(i / rc), x = X0 + (i % rc) * (RW + 12);
      return hr(x, cy, RW, R.edge) + at(x, cy + 8, (r.title ? `<div class="ga-h">${A(r.title)}</div>` : '') + `<div class="ga-n">${A(r.text)}</div>`, { w: RW });
    }).join('') });
  }
  return shell(ctx, 'ruler', t.html + flow('ruler', t.top, secs, { gap: 24, maxGap: 48 }));
}
