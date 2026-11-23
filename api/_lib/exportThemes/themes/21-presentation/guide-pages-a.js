// Theme 21, Keynote: the style guide's first four pages (cover, logo, colour, proportion). Every fact comes from engine/styleguide.js; nothing here names a colour id, a hex or a brand.
import { colourFacts, logoFacts } from '../../engine/styleguide.js';
import { hook, hookAdd, drawWithFewer, SLOT_MIN_H } from '../../engine/guide-layout.js';
import { esc as A } from '../../engine/brand.js';
import { copyOf, copyRaw } from './guide-copy.js';
import { X0, XR, CW, COL, COLW, BOT, SUBH, CH, cap1, pad2, pct, numberWord, weightName, longDate, px, tw, nLines, uniqueColours, para, kit, art as logoArtK, slotH, drawnW, num, at, rect, hr, obj, sec, register, shell, title, flow, dimH, dimV, sum } from './guide-kit.js';

const xs = (n) => `${+(+n).toFixed(1)} x`;
const PW = 794, PH = 1123;

// ---------------------------------------------------------------- cover
// the cover is the reversed colourway all the way down: the logo, one statement in the display face, six facts in three columns, and the palette as whole fields to the foot of the page
export function cover(ctx) {
  const K = kit(ctx), B = ctx.brand, G = ctx.logo.geos.colour, F = uniqueColours(colourFacts(ctx)), { R, S } = K, slot = ctx.edition === 'slot';
  // the palette: the colours that carry a share (six at most) stand tall, and the rest of the palette, each hex once, runs as a thin second row under them
  let cols = F.filter((f) => (f.share ?? 0) >= 0.01).slice(0, 6);
  if (!cols.length) cols = F.slice(0, 6);
  const rest = F.filter((f) => !cols.includes(f)).slice(0, 12), ROW2 = rest.length ? 72 : 0, MAIN_H = 360;
  const lw = Math.min(CW, slot ? 320 : 240), lh = slot ? slotH(lw) : (lw * G.h) / G.w, logoY = 76;
  const logo = at(X0, logoY, logoArtK(ctx, 'colour', lw, { colourway: 'reversed', color: R.darkInk, ...(slot ? { h: lh } : {}) }));
  // the facts: three columns, each under a 2 px rule in the field's ink
  const d = B.fonts.display;
  const facts = [['Date', longDate(B.version.date)], ['Version', String(B.version.number)], ['Format', 'A4 portrait, 210 x 297 mm'], ['Display', `${d.family}, ${weightName(ctx.weights.heading)}`], ['Text', `${B.fonts.body.family}, ${weightName(ctx.weights.regular)} and ${weightName(ctx.weights.medium)}`], B.fonts.mono ? ['Mono', B.fonts.mono.family] : ['Scale', '1 : 1 at 96 dpi']];
  const gx = 24, fw = Math.floor((CW - 2 * gx) / 3), factH = facts.map(([, v]) => 2 + 10 + 16 + 4 + para(String(v), fw).h);
  const rowH = [Math.max(...factH.slice(0, 3)), Math.max(...factH.slice(3))], factsH = rowH[0] + 20 + rowH[1];
  // the statement is the largest size that sets in four lines and leaves the palette its tall row (360 px, else 200) and the thin row under it to stand in
  const line = B.lines.primary, stmtY = logoY + lh + 48;
  const room = (size, nl, lineH) => PH - (stmtY + nl * lineH + 40 + factsH + 40);
  let size = 28, lineH = Math.round(size * 1.08), nl = slot ? 0 : nLines(S.disp, line, size, CW, K.st);
  if (slot) { size = 40; lineH = 44; nl = 4; } else {
    for (const need of [MAIN_H + ROW2, 200 + ROW2]) {
      const s = [120, 104, 92, 80, 68, 58, 48, 40, 34, 28].find((z) => { const n = nLines(S.disp, line, z, CW, K.st); return n <= 4 && room(z, n, Math.round(z * 1.08)) >= need; });
      if (s) { size = s; lineH = Math.round(s * 1.08); nl = nLines(S.disp, line, s, CW, K.st); break; }
    }
  }
  const stmtB = stmtY + nl * lineH, factsY = stmtB + 40, avail = PH - (factsY + factsH + 40) - ROW2;
  if (avail < 200) throw new Error(`Keynote guide: the cover palette has ${avail} px to stand in`);
  // with a second row the tall row is held to 360 px, standing on the second row at the foot; a palette of six or fewer keeps the whole height
  const stripH = rest.length ? Math.min(MAIN_H, avail) : avail, stripY = PH - ROW2 - stripH;
  const stmt = at(X0, stmtY, A(line), { w: CW, cls: 'gk-d gk-cv', style: `font-size:${size}px;line-height:${lineH}px;color:${R.darkInk}` });
  const cells = facts.map(([k, v], i) => {
    const x = X0 + (i % 3) * (fw + gx), y = factsY + (i < 3 ? 0 : rowH[0] + 20);
    return rect(x, y, fw, 2, `background:${R.darkInk}`) + at(x, y + 10, `<div class="gk-hd" style="color:${R.darkInk}">${A(k)}</div><div class="gk-n" style="margin-top:4px;color:${R.darkInk}">${A(v)}</div>`, { w: fw });
  }).join('');
  // the tall row: equal fields that meet at straight edges, the label at the head of each
  const n = cols.length, edge = (i) => Math.round((i * PW) / n);
  const fields = cols.map((f, i) => {
    const x = edge(i), w = edge(i + 1) - x, ink = R.bestInk(f.hex, 12, 500), near = ctx.ratio(f.hex, R.dark) < 1.5;
    return rect(x, stripY, w, stripH, `background:${f.hex};${near ? `outline:1px solid ${R.darkInk};outline-offset:-1px` : ''}`,
      at(12, 14, `<div class="gk-m" style="font-weight:500;color:${ink}">${pad2(i + 1)}</div><div class="gk-hd gk-wrap" style="margin-top:6px;color:${ink};white-space:normal">${A(f.name)}</div><div class="gk-m" style="margin-top:4px;font-weight:500;color:${ink}">${A(f.hex.toUpperCase())}</div><div class="gk-m" style="margin-top:2px;font-weight:500;color:${ink}">${A(pct(f.share))}</div>`, { w: w - 24 }));
  }).join('');
  // the thin row: the rest of the palette, each field with its number and its hex (the hex only where it fits)
  const m = rest.length, edge2 = (i) => Math.round((i * PW) / m);
  const thin = rest.map((f, i) => {
    const x = edge2(i), w = edge2(i + 1) - x, ink = R.bestInk(f.hex, 12, 500), near = ctx.ratio(f.hex, R.dark) < 1.5, hex6 = f.hex.replace('#', '').toUpperCase();
    return rect(x, PH - ROW2, w, ROW2, `background:${f.hex};${near ? `outline:1px solid ${R.darkInk};outline-offset:-1px` : ''}`,
      at(8, 10, `<div class="gk-m" style="font-weight:500;color:${ink}">${pad2(n + i + 1)}</div>${tw(CH[400], hex6, 12) + 16 <= w ? `<div class="gk-m" style="margin-top:2px;font-weight:500;color:${ink}">${A(hex6)}</div>` : ''}`, { w: w - 16 }));
  }).join('');
  return shell(ctx, 'cover', logo + stmt + cells + fields + thin, '', { cover: true });
}

// ---------------------------------------------------------------- logo
export const logoPage = (ctx) => drawWithFewer((max) => logoDraw(ctx, max), 6);
function logoDraw(ctx, maxTiles) {
  const K = kit(ctx), { R } = K, L = ctx.logo, G = L.geos.colour, unit = num(L.geo.unit, 1) || 1, LF = logoFacts(ctx), slot = ctx.edition === 'slot', svg = [];
  const art = (id, w, o = {}) => logoArtK(ctx, id, w, o);
  const t = title(ctx, K, 'logo', [`Clear space is one x. Never set it under ${L.minSize.screenPx} px wide.`, 'One x clear on every side.']);

  // 01 clear space: the logo on its ground, one x clear on every side, drawn as solid squares and measured; the rule and its figures in the first column
  const xw = G.w / unit, xh = G.h / unit, fwX = xw + 2, fhX = xh + 2, plateX = COL[1] + 56, plateW = XR - plateX, DIMB = 32;
  const ruleText = 'x is the cap height of the name. Keep one x clear on every side: no text, edge or mark enters it.';
  const ruleH = para(ruleText, COLW).h;
  const kv = slot ? [['x', 'Cap height of the name'], ['Clear', 'One x on every side'], ['Minimum', `${L.minSize.screenPx} px, ${L.minSize.printMm} mm`]]
    : [['x', `${L.clearShare}% of logo height`], ['Logo', `${xw.toFixed(1)} × ${xh.toFixed(1)} x`], ['Minimum', `${L.minSize.screenPx} px, ${L.minSize.printMm} mm`]];
  const kvH = kv.map(([, v]) => Math.max(24, para(v, COLW - 80).h + 8));
  const sqFill = ctx.ratio(R.dark, R.ground) >= ctx.ratio(R.edge, R.ground) ? R.dark : R.edge;
  const gA = {};
  const drawA = (y) => {
    const { u, fw, fh, lw } = gA, py = y + SUBH + 8, px0 = plateX + Math.floor((plateW - fw) / 2);
    const sq = (x, yy) => rect(x, yy, u, u, `background:${sqFill}`, `<div class="gk-r" style="font-size:${Math.min(12, u - 2)}px;line-height:${u}px;text-align:center;color:${R.onColour(sqFill, 12, 500)}">x</div>`);
    const cx = px0 + (fw - u) / 2, cy = py + (fh - u) / 2;
    svg.push(dimV({ x: px0 - 16, y1: py, y2: py + fh, label: xs(fhX), obj: px0 }));
    svg.push(dimH({ x1: px0, x2: px0 + fw, y: py + fh + 18, label: xs(fwX), obj: py + fh }));
    return sec(K, X0, y, CW, '01', 'Clear space', 'one x on every side')
      + obj(K, px0, py, fw, fh, R.ground, '', { frame: true })
      + at(px0 + u, py + u, art('colour', lw, { frame: slot }))
      + sq(cx, py) + sq(cx, py + fh - u) + sq(px0, cy) + sq(px0 + fw - u, cy)
      + at(X0, py, `<div class="gk-n">${A(ruleText)}</div>`, { w: COLW })
      + register(K, X0, py + ruleH + 12, COLW, kv.map(([k, v], i) => [k, `<div class="gk-n">${A(v)}</div>`, kvH[i]]), { kw: 80 });
  };

  // 02 colourways, each on the ground it is drawn for, the tiles meeting at straight edges (one tile per drawing; the slot edition one per colourway)
  const groups = [];
  for (const g of LF.grounds) {
    const key = slot ? g.groundHex.toLowerCase() : JSON.stringify(g.cw);
    const f = groups.find((o) => o.key2 === key);
    if (f) f.labels.push(g.label); else groups.push({ ...g, key2: key, labels: [g.label] });
  }
  if (groups.length > maxTiles) groups.length = maxTiles;
  const lgw = Math.min(180, Math.max(116, Math.round((44 * G.w) / G.h))), lgh = slot ? 44 : (lgw * G.h) / G.w;
  let perRow = Math.min(3, groups.length);
  const tileW = (pr) => Math.floor(CW / pr);
  while (perRow > 1 && lgw + 24 > tileW(perRow)) perRow -= 1;
  if (lgw + 24 > tileW(perRow)) throw new Error(`Keynote guide: the colourway tile is ${tileW(perRow)} px wide and the logo needs ${lgw + 24}`);
  const TW = tileW(perRow), tileLab = (g) => (g.labels.length > 2 ? `${g.labels[0]}, ${g.labels[1]} and ${g.labels.length - 2} more` : g.labels.join(' and '));
  const labLines = Math.max(...groups.map((g) => nLines(CH[400], tileLab(g), 12, TW - 24)));
  const rowsN = Math.ceil(groups.length / perRow), th = Math.ceil(12 + lgh + 12 + 16 * labLines + 12);
  const B_h = SUBH + 8 + rowsN * th;
  const drawB = (y) => sec(K, X0, y, CW, '02', 'Colourways', 'each on the ground it is drawn for') + groups.map((g, i) => {
    const c = i % perRow, x0 = X0 + Math.round((c * CW) / perRow), x1 = X0 + Math.round(((c + 1) * CW) / perRow), ty = y + SUBH + 8 + Math.floor(i / perRow) * th, ink = R.onColour(g.groundHex, 12, 500);
    return obj(K, x0, ty, x1 - x0, th, g.groundHex, at(12, 12, art('colour', lgw, { colourway: g.key, color: ink, h: slot ? lgh : undefined })) + at(12, th - 12 - 16 * labLines, A(tileLab(g)), { w: x1 - x0 - 24, cls: 'gk-r', style: `color:${ink}` }));
  }).join('');

  // 03 the smallest size, drawn at the size it names, with the drawn width measured
  const mn = L.minSize, minW = num(mn.screenPx, 24), minH = slot ? slotH(minW) : (minW * G.h) / G.w, labelInside = !slot || minH >= SLOT_MIN_H, shownW = drawnW(ctx, 'colour', minW, { h: slot ? minH : undefined });
  const minText = `Never set the logo narrower than ${mn.screenPx} px on screen or ${mn.printMm} mm in print, so the name keeps reading.`;
  const mnPlateW = minW + 24, mnTextW = CW - mnPlateW - 24, mnTextH = para(minText, mnTextW).h;
  const mnPlateH = Math.ceil(minH) + 24 + (labelInside ? 0 : 20), C_h = SUBH + 8 + Math.max(mnPlateH + 28, mnTextH);
  if (mnTextW < COLW) throw new Error(`Keynote guide: the smallest size (${minW} px) leaves ${mnTextW} px for its text`);
  const minArt = art('colour', minW, { h: slot ? minH : undefined, frame: slot });
  const drawC = (y) => {
    const py = y + SUBH + 8;
    svg.push(dimH({ x1: X0 + 12, x2: X0 + 12 + shownW, y: py + mnPlateH + 18, label: `${+shownW.toFixed(1)} px`, obj: py + mnPlateH }));
    return sec(K, X0, y, CW, '03', 'Smallest size', `${mn.screenPx} px, ${mn.printMm} mm`)
      + obj(K, X0, py, mnPlateW, mnPlateH, R.ground, at(12, 12, minArt) + (labelInside ? '' : at(12, 12 + Math.ceil(minH) + 4, 'Logo', { cls: 'gk-r gk-q' })), { frame: true })
      + at(X0 + mnPlateW + 24, py, A(minText), { w: mnTextW, cls: 'gk-n' });
  };

  // 04 lockups: horizontal, stacked and symbol on plates that meet, each with the line that says when to use it (the slot edition carries neutral lines)
  const LK = [['horizontal', 'Horizontal'], ['stacked', 'Stacked'], ['symbol', 'Symbol']];
  const lkWhen = (id) => (slot ? { horizontal: 'Headers, signatures, wide spaces.', stacked: 'Squarer spaces, such as avatars.', symbol: 'App icon, favicon and stamp.' }[id] : ctx.brand.logo.when[id]);
  const lkTile = 64, lkMaxH = 36, lkMaxW = Math.floor(CW / 3) - 32;
  const lkW = (id) => { const g = L.geos[id]; const w = Math.min(lkMaxW, (lkMaxH * g.w) / g.h); return slot ? Math.max(w, 56) : w; };
  const lkCapW = Math.floor(CW / 3) - 16, lkCap = Math.max(...LK.map(([id]) => nLines(CH[400], lkWhen(id), 12, lkCapW) * 16));
  const D_h = SUBH + 8 + lkTile + 8 + 18 + 2 + lkCap;
  const drawD = (y) => sec(K, X0, y, CW, '04', 'Lockups') + LK.map(([id, name], i) => {
    const x0 = X0 + Math.round((i * CW) / 3), x1 = X0 + Math.round(((i + 1) * CW) / 3), pw = x1 - x0, ty = y + SUBH + 8, w = lkW(id), h0 = (w * L.geos[id].h) / L.geos[id].w, h = slot ? Math.min(44, Math.max(28, h0)) : h0;
    return obj(K, x0, ty, pw, lkTile, R.ground, at((pw - w) / 2, (lkTile - h) / 2, art(id, w, { h: slot ? h : undefined })), { frame: true })
      + at(x0, ty + lkTile + 8, A(name), { cls: 'gk-h' }) + at(x0, ty + lkTile + 8 + 18, A(lkWhen(id)), { w: lkCapW, cls: 'gk-r gk-q' });
  }).join('');

  // 05 never: four rules, in words, each under a rule
  const nev = [['Stretch', 'Never stretch or squash it.'], ['Recolour', 'Never recolour it outside its colourways.'], ['Crowd', 'Never crowd it inside its clear space.'], ['Rearrange', 'Never move or redraw its parts.']];
  const NW = Math.floor((CW - 3 * 12) / 4), nevH = 8 + 20 + Math.max(...nev.map(([, s]) => para(s, NW).h));
  const E_h = SUBH + 8 + nevH;
  const drawE = (y) => sec(K, X0, y, CW, '05', 'Never') + nev.map(([k, s], i) => {
    const x = X0 + i * (NW + 12), ny = y + SUBH + 8;
    return hr(x, ny, NW, R.edge) + at(x, ny + 8, `<div class="gk-h">${A(k)}</div><div class="gk-n">${A(s)}</div>`, { w: NW });
  }).join('');

  // the clear-space drawing takes what the other sections leave, as tall as the room, one x on every side
  const fixed = B_h + C_h + D_h + E_h + 4 * 16, room = BOT - t.top - fixed - SUBH - 8 - DIMB;
  const textH = ruleH + 12 + sum(kvH) + 1;
  const u = Math.floor(Math.min(plateW / fwX, room / fhX, 40));
  if (!(u >= 12)) {
    if (groups.length > perRow) return { fewer: perRow };
    throw new Error(`Keynote guide: the clear-space drawing gets ${Math.max(0, u || 0)} px for one x (it needs 12)`);
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
  const K = kit(ctx), { R } = K, F = uniqueColours(colourFacts(ctx));
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
  const runMax = (xs0) => xs0.reduce((o, v, i) => { o.push(Math.max(v, i ? o[i - 1] : 0)); return o; }, []);
  const inkMax = runMax(F.map((f) => Math.max(rowK, para(inkText(f), textW).h + 8))), nameMax = runMax(F.map((f) => nLines(CH[500], f.name, 14, nameW)));
  const roleMax = runMax(F.map((f) => nLines(CH[500], `${pct(f.share)}, ${f.role}`, 12, nameW)));
  const sizeOf = (k) => {
    const lastH = inkMax[k - 1], minPlate = Math.max(dense ? 48 : 64, 2 * pad + roleMax[k - 1] * 16 + nameMax[k - 1] * 20), rowH = minPlate + plateGap + 3 * rowK + lastH + 1, nRows = Math.ceil(k / cols);
    return { lastH, minPlate, rowH, nRows, h: nRows * rowH + (nRows - 1) * gy };
  };
  const room = BOT - t.top - (foot ? footH + 12 : 0) - 4;
  let shown = F.length;
  if (sizeOf(shown).h > room) {
    while (shown > cols && sizeOf(shown).h > room - noteH - 12) shown -= 1;
    if (shown > cols) shown -= shown % cols;
  }
  const cut = shown < F.length, { lastH, minPlate, nRows } = sizeOf(shown), regH = 3 * rowK + lastH + 1;
  const G = F.slice(0, shown);
  const note = cut ? `Showing the first ${shown} of ${F.length} colours, widest first. The markdown style guide and the kit's colour files list all of them.` : '';
  const gridH = sizeOf(shown).h;
  const draw = (y, extra) => {
    const ph = minPlate + Math.floor(extra / nRows);
    return G.map((f, i) => {
      const x = X0 + (i % cols) * (cw + gx), py = y + Math.floor(i / cols) * (ph + plateGap + regH + gy), [r, g, b] = f.rgb, ink = R.bestInk(f.hex, 13, 500);
      const cmyk = f.cmyk ? (Array.isArray(f.cmyk) ? f.cmyk.join(' ') : String(f.cmyk)) : `${cmykOf(f.rgb).join(' ')} *`;
      const mono = (v) => `<div class="gk-m">${A(v)}</div>`;
      const rows = [['HEX', mono(f.hex.replace('#', '').toUpperCase()), rowK], ['RGB', mono(`${r} ${g} ${b}`), rowK], ['CMYK', mono(cmyk), rowK], ['Set text in', `<div class="gk-n">${A(inkText(f))}</div>`, lastH]];
      return obj(K, x, py, cw, ph, f.hex, at(pad, pad, `<div class="gk-h gk-wrap" style="color:${ink}">${A(f.name)}</div><div class="gk-r" style="font-weight:500;color:${ink}">${A(pct(f.share))}, ${A(f.role)}</div>`, { w: nameW })
        + at(cw - pad - numW, pad, A(pad2(i + 1)), { w: numW, cls: 'gk-r', style: `text-align:right;font-weight:500;color:${ink}` }))
        + register(K, x, py + ph + plateGap, cw, rows, { kw: KW });
    }).join('');
  };
  const secs = [{ h: gridH, flex: 400, draw }];
  if (foot) secs.push({ h: footH, draw: (y) => at(X0, y, A(foot), { w: CW, cls: 'gk-r gk-q' }) });
  if (note) secs.push({ h: noteH, draw: (y) => at(X0, y, A(note), { w: CW, cls: 'gk-r gk-q' }) });
  return shell(ctx, 'colour', t.html + flow('colour', t.top, secs, { gap: 12, maxGap: 24 }));
}

// ---------------------------------------------------------------- proportion
export function rulerPage(ctx) {
  const K = kit(ctx), { R } = K, B = ctx.brand, F = uniqueColours(colourFacts(ctx)).sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const top0 = F[0];
  const t = title(ctx, K, 'ruler', copyOf(ctx, 'ruler', [top0 && typeof top0.share === 'number' ? `${top0.name} holds ${pct(top0.share)}. The rest is held back.` : 'How much of each colour a page carries.', 'How much of each colour a page carries.']));
  // the bar: widths by share, no segment under 6 px (the shortfall comes off the widest), rounded by largest remainder to the full width
  const MIN = 6, shares = F.map((f) => (typeof f.share === 'number' && Number.isFinite(f.share) ? f.share : 1 / F.length)), tot = sum(shares) || 1;
  let raw = shares.map((s) => (s / tot) * CW);
  const low = raw.map((w) => w < MIN), short = sum(raw.map((w, i) => (low[i] ? MIN - w : 0)));
  const wi = raw.indexOf(Math.max(...raw));
  raw = raw.map((w, i) => (low[i] ? MIN : i === wi ? w - short : w));
  const base = raw.map(Math.floor);
  const left = CW - sum(base);
  raw.map((w, i) => ({ i, f: w - Math.floor(w) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, Math.max(0, left)).forEach((o) => { base[o.i] += 1; });
  const BAR = 56;
  const barSec = { h: SUBH + 8 + BAR, flex: 184, draw: (y, extra = 0) => {
    let x = 0;
    const by = y + SUBH + 8, bh = BAR + extra;
    const segs = F.map((f, i) => {
      const lab = pct(f.share), s = rect(X0 + x, by, base[i], bh, `background:${f.hex}`, tw(CH[500], lab, 12) + 16 <= base[i] ? at(8, 8, A(lab), { cls: 'gk-r', style: `color:${R.onColour(f.hex, 12, 500)};font-weight:500` }) : '');
      x += base[i];
      return s;
    }).join('');
    return sec(K, X0, y, CW, '01', 'Proportion of a page', `${F.length} colour${F.length === 1 ? '' : 's'}, widest first`)
      + segs + rect(X0, by, CW, bh, `outline:1px solid ${R.edge};outline-offset:-1px`);
  } };
  // the register
  const rows = F.slice(0, 12), RH = 28;
  const tabSec = { h: SUBH + 8 + rows.length * RH + 1, flex: 8 * rows.length, draw: (y, extra = 0) => {
    const rh = RH + Math.floor(extra / rows.length);
    return sec(K, X0, y, CW, '02', 'Share by colour') + rows.map((f, i) => {
      const yy = y + SUBH + 8 + i * rh;
      return hr(X0, yy, CW, R.hair) + rect(X0, yy + Math.floor((rh - 14) / 2), 14, 14, `background:${f.hex};${K.R.near(f.hex) ? `outline:1px solid ${R.edge};outline-offset:-1px` : ''}`)
        + at(X0 + 28, yy + Math.floor((rh - 16) / 2), A(f.name), { w: 250, cls: 'gk-h gk-e' }) + at(COL[1] + 48, yy + Math.floor((rh - 16) / 2), A(f.role), { w: 220, cls: 'gk-r gk-q gk-e' })
        + at(XR - 80, yy + Math.floor((rh - 16) / 2), A(pct(f.share)), { w: 80, cls: 'gk-m', style: 'text-align:right' });
    }).join('') + hr(X0, y + SUBH + 8 + rows.length * rh, CW, R.hair);
  } };
  // the rules
  const markRules = copyRaw(ctx, 'markRules', []);
  const rules = ((B.guideB && B.guideB.rules) || []).filter((_, i) => !(ctx.edition === 'slot' && markRules.includes(i))).map((r) => (typeof r === 'string' ? { title: '', text: r } : { title: r.title || '', text: r.text || '' }));
  const secs = [barSec, tabSec];
  // the slot edition has no rules of its own to set (each would be a placeholder block of unmeasurable height), so the bar and the register take the room
  if (rules.length && ctx.edition !== 'slot') {
    const rc = Math.min(3, rules.length), RW = Math.floor((CW - 12 * (rc - 1)) / rc), rowsN = Math.ceil(rules.length / rc);
    const hs = rules.map((r) => 8 + (r.title ? 20 : 0) + para(r.text, RW).h);
    const rowH = Array.from({ length: rowsN }, (_, i) => Math.max(...hs.slice(i * rc, i * rc + rc)));
    secs.push({ h: SUBH + 8 + sum(rowH) + 12 * (rowsN - 1), draw: (y) => sec(K, X0, y, CW, '03', 'Rules') + rules.map((r, i) => {
      const cy = y + SUBH + 8 + sum(rowH.slice(0, Math.floor(i / rc))) + 12 * Math.floor(i / rc), x = X0 + (i % rc) * (RW + 12);
      return hr(x, cy, RW, R.edge) + at(x, cy + 8, (r.title ? `<div class="gk-h">${A(r.title)}</div>` : '') + `<div class="gk-n">${A(r.text)}</div>`, { w: RW });
    }).join('') });
  }
  return shell(ctx, 'ruler', t.html + flow('ruler', t.top, secs, { gap: 24, maxGap: 48 }));
}
