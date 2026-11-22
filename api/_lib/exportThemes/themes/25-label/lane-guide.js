// Theme 25, Label: the A4 style guide. The wall is the brand's own ground; every object hangs on it with a label beneath, set in the same pale card as the 1000 x 800 pages.
// A page is a run of numbered works (catalogue numbers 03.1, 03.2 ...), no rules between them, a 1 px edge only on an object that is close to the wall in tone, no shadow, no radius,
// no photograph. The foot is a label card: the page's number, its name and the version. Every fact comes from engine/styleguide.js; nothing here names a colour id, a hex or a
// brand. Pages place everything with absolute coordinates and measure text with the fonts' own metrics, so a page that cannot hold its content throws and the route leaves it out.
import { loadFont } from '../../engine/nodeFont.js';
import { colourFacts, typeLadder, contrastFacts, logoFacts, tokenGroups, usageFacts, GRADE_NOTE } from '../../engine/styleguide.js';
import { PAGE, PAGE_IDS, r1, sum, hook, hookAdd, withHooks, pageSection, makeGuide, stacker, headLabel, drawWithFewer, SLOT_MIN_H, slotW, logoArt } from '../../engine/guide-layout.js';
import { A, roles, longDate, weightName, listAnd, numberWord } from './helpers.js';
import { copyOf, copyRaw } from './guide-copy.js';

const { X0, XR, CW, COL, COLW } = PAGE;
// the label strip at the foot (its top and height), the lowest y content reaches, and a section header's height
const FY = 1059, FH = 32, BOT = 1019, SUBH = 24;
const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };
const CHROME = { 400: 'SchibstedGrotesk-400', 500: 'SchibstedGrotesk-500' };
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const pad2 = (n) => String(n || 0).padStart(2, '0');
const pct = (s) => `${+((s ?? 0) * 100).toFixed(1)}%`;

// ---- measuring (the fonts' own advances and kerning, the way the browser sets a line) ----
function tw(stem, text, size, track = 0) {
  const font = loadFont(stem);
  let x = 0, prev = null;
  for (const ch of String(text).replace(/\u00a0/g, ' ')) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += (font.getKerningValue(prev, g) * size) / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += (g.advanceWidth * size) / font.unitsPerEm + track * size;
    prev = g;
  }
  return x;
}
// the lines a text takes in a box: greedy at the browser's own breaks, and a single run wider than the box counts the lines it will fold into (overflow-wrap:anywhere), so no text throws
function nLines(stem, text, size, w, st = 1) {
  const wide = (s) => tw(stem, s, size) * st * 1.04;
  const fold = (s) => Math.max(0, Math.ceil(wide(s) / w) - 1);
  let n = 1, cur = '';
  for (const word of String(text).split(' ')) {
    const t = cur ? `${cur} ${word}` : word;
    if (cur && wide(t) > w) { n += fold(cur); n += 1; cur = word; } else cur = t;
  }
  return n + fold(cur);
}
const stemOf = (ctx, role, weight) => {
  const fs = ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
  const f = fs.find((x) => x.weight === weight) || fs.reduce((a, b) => (a && Math.abs(a.weight - weight) <= Math.abs(b.weight - weight) ? a : b), null);
  return f ? f.stem : CHROME[400];
};
function kit(ctx) {
  const B = ctx.brand, d = B.fonts.display, R = roles(ctx);
  return {
    B, R, d, st: (d.stretch || 100) / 100,
    S: { disp: stemOf(ctx, 'display', ctx.weights.heading), body: stemOf(ctx, 'body', 400), mono: B.fonts.mono ? stemOf(ctx, 'mono', 400) : CHROME[400] },
  };
}

// ---- placing things ----
const at = (x, y, html, { w, cls = '', style = '' } = {}) => `<div class="lg-a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w != null ? `width:${r1(w)}px;` : ''}${style}">${html}</div>`;
const rect = (x, y, w, h, style = '', inner = '', cls = '') => `<div class="lg-a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;${style}">${inner}</div>`;
// an object on the wall: its fill, and the 1 px edge only when the fill is close to the wall in tone
const obj = (K, x, y, w, h, hex, inner = '', style = '') => rect(x, y, w, h, `background:${hex};${style}`, inner, K.R.nearWall(hex) ? 'edge' : '');
// a label card: the pale card the 1000 x 800 pages hang beside every object
const card = (K, x, y, w, h, inner = '', style = '') => rect(x, y, w, h, `background:var(--label);color:var(--label-ink);${style}`, inner, K.R.nearWall(K.R.labelFill) ? 'edge' : '');
// a section header: the catalogue number, the name, and a note at the right
function sec(K, x, y, w, no, name, note = '') {
  const nameW = 40 + tw(CHROME[500], name, 12);
  const room = w - nameW - 24;
  return at(x, y, `<span class="lg-no">${A(no)}</span>${A(name)}`, { cls: 'lg-c' })
    + (note && room > 40 ? at(x + w - room, y, A(note), { w: room, cls: 'lg-c lg-q lg-e', style: 'font-weight:400;text-align:right' }) : '');
}
const catNo = (ctx, id, i) => `${pad2(ctx.pageNo(id))}.${i}`;

// ---- the page ----
function shell(ctx, id, body) {
  const K = kit(ctx), B = ctx.brand, sec1 = NAME[id], no = String(ctx.pageNo(id) || 0).padStart(3, '0');
  const left = headLabel(B.name, (s) => tw(CHROME[500], s, 12) + 16 <= CW - 140, 'style guide');
  const head = at(X0, 28, A(left), { cls: 'lg-c' }) + at(X0, 28, A(sec1), { w: CW, cls: 'lg-c lg-q', style: 'text-align:right;font-weight:400' });
  const ver = /^\d/.test(B.version.number) ? `Version ${B.version.number}` : String(B.version.number);
  const nameW = 12 + tw(CHROME[500], `No. ${no}`, 12) + 12 + tw(CHROME[400], sec1, 12);
  const right = [`${ver}, ${longDate(B.version.date)}`, ver].find((s) => 16 + nameW + 24 + tw(CHROME[400], s, 12) + 16 <= CW) || '';
  const foot = card(K, X0, FY, CW, FH, at(16, 8, `<span class="lg-b5">No. ${no}</span><span class="lg-ql" style="margin-left:12px;font-weight:400">${A(sec1)}</span>`, { cls: 'lg-c' })
    + (right ? at(0, 8, A(right), { w: CW - 16, cls: 'lg-c lg-ql', style: 'text-align:right;font-weight:400' }) : ''));
  return pageSection(id, head + body + foot);
}
// the page title (the page's name in the display face) and one quiet sentence under it: the first candidate that sets in two lines, else the last
function title(ctx, K, id, cands) {
  const list = Array.isArray(cands) ? cands : [cands], W = 560;
  const pick = list.find((s) => nLines(K.S.body, s, 15, W) <= 2) ?? list[list.length - 1], n = nLines(K.S.body, pick, 15, W);
  return {
    html: at(X0, 52, A(NAME[id]), { cls: 'lg-t' }) + at(X0, 92, A(pick), { w: W, cls: 'lg-b lg-q' }),
    top: 92 + n * 22 + 28,
  };
}
const flow = stacker({ theme: 'Label', bottom: BOT, gapStretch: 1.5 });
const withFaces = (fn) => (ctx) => withHooks(ctx, () => fn(ctx));
// the lines of a quiet sentence in a box, as text and height
const para = (K, text, w, { size = 13, lh = 18, stem = K.S.body } = {}) => ({ n: nLines(stem, text, size, w), h: nLines(stem, text, size, w) * lh });

// ---------------------------------------------------------------- cover
function cover(ctx) {
  const K = kit(ctx), B = ctx.brand, G = ctx.logo.geos.colour, F = colourFacts(ctx), { R, S } = K;
  const lw = Math.min(CW, ctx.edition === 'slot' ? slotW(ctx, 300) : 300), lh = (lw * G.h) / G.w, logoY = 84;
  const logo = at(X0, logoY, logoArt(ctx, 'colour', lw));
  // the brand's one line, as large as sets in three lines
  const line = B.lines.primary, d = B.fonts.display;
  const size = [64, 56, 48, 40, 34, 28].find((s) => nLines(S.disp, line, s, CW, K.st) <= 3) || 28, lineH = Math.round(size * 1.08), nl = nLines(S.disp, line, size, CW, K.st);
  const stmtY = logoY + lh + 48, stmtB = stmtY + nl * lineH;
  const stmt = at(X0, stmtY, A(line), { w: CW, cls: 'lg-d', style: `font-size:${size}px;line-height:${lineH}px;color:var(--ink)` });
  // the facts card at the foot
  const facts = [['Date', longDate(B.version.date)], ['Version', B.version.number], ['Display', `${d.family}, ${weightName(ctx.weights.heading)}`], ['Text', `${B.fonts.body.family}, ${weightName(ctx.weights.regular)} and ${weightName(ctx.weights.medium)}`]];
  if (B.fonts.mono) facts.push(['Mono', B.fonts.mono.family]);
  const cw3 = Math.floor((CW - 32 - 2 * 16) / 3), rows = [];
  for (let i = 0; i < facts.length; i += 3) rows.push(facts.slice(i, i + 3));
  const rowH = rows.map((r) => 16 + 2 + Math.max(...r.map(([, v]) => para(K, v, cw3).h)));
  const cardH = 32 + sum(rowH) + 12 * (rows.length - 1), cardY = BOT - cardH;
  let ry = cardY + 16;
  const factsCard = card(K, X0, cardY, CW, cardH, rows.map((r, j) => {
    const y0 = ry; ry += rowH[j] + 12;
    return r.map(([k, v], i) => at(16 + i * (cw3 + 16), y0 - cardY, `<div class="lg-c lg-ql" style="font-weight:400">${A(k)}</div><div class="lg-n" style="margin-top:2px">${A(v)}</div>`, { w: cw3 })).join('');
  }).join(''));
  // the palette, hung: the colours that carry a share, equal panels, each with its catalogue number and name beneath
  let cols = F.filter((f) => (f.share ?? 0) >= 0.01).slice(0, 6);
  if (!cols.length) cols = F.slice(0, 6);
  const n = cols.length, gap = 12, pw = n === 1 ? Math.min(CW, 346) : Math.floor((CW - gap * (n - 1)) / n);
  const labH = 16 + 16 * Math.max(...cols.map((f) => nLines(CHROME[500], f.name, 12, pw))), top = stmtB + 40, ph = cardY - 28 - labH - top;
  if (ph < 96) throw new Error(`Label guide: the cover palette has ${ph} px to hang in`);
  const panels = cols.map((f, i) => {
    const x = X0 + i * (pw + gap);
    return obj(K, x, top, pw, ph, f.hex, at(12, 12, A(pct(f.share)), { cls: 'lg-c', style: `color:${R.onColour(f.hex, 12, 500)}` }))
      + at(x, top + ph + 10, `<div class="lg-c lg-q" style="font-weight:400">${pad2(i + 1)}</div><div class="lg-c lg-wrap">${A(f.name)}</div>`, { w: pw });
  }).join('');
  return shell(ctx, 'cover', logo + stmt + panels + factsCard);
}

// ---------------------------------------------------------------- logo
const logoPage = (ctx) => drawWithFewer((max) => logoDraw(ctx, max), 6);
function logoDraw(ctx, maxTiles) {
  const K = kit(ctx), { R, S } = K, L = ctx.logo, G = L.geos.colour, unit = L.geo.unit, LF = logoFacts(ctx), slot = ctx.edition === 'slot';
  const art = (id, w, o = {}) => logoArt(ctx, id, w, o);
  const t = title(ctx, K, 'logo', [`Clear space is one x. Never set it under ${L.minSize.screenPx} px wide.`, 'One x clear on every side.']);

  // 1 clear space: the logo on its ground, one x clear on every side, drawn as solid squares; the rule in the first column
  const xw = G.w / unit, xh = G.h / unit, fwX = xw + 2, fhX = xh + 2, plateX = COL[1], plateW = XR - plateX;
  const ruleText = 'x is the cap height of the name. Keep one x clear on every side: no text, edge or mark enters it.';
  const ruleH = para(K, ruleText, COLW).h;
  const kv = slot ? [['x', 'Cap height of the name'], ['Clear space', 'One x on every side'], ['Minimum', `${L.minSize.screenPx} px, ${L.minSize.printMm} mm`]]
    : [['x', `${L.clearShare}% of logo height`], ['Logo', `${xw.toFixed(1)} × ${xh.toFixed(1)} x`], ['Minimum', `${L.minSize.screenPx} px, ${L.minSize.printMm} mm`]];
  const gA = {};
  const drawA = (y) => {
    const { u, fw, fh, lw, lh } = gA, py = y + SUBH + 12, px0 = plateX + Math.floor((plateW - fw) / 2);
    const sq = (x, yy) => rect(x, yy, u, u, `background:${R.edge}`, `<div class="lg-c" style="font-size:${Math.min(12, u - 2)}px;line-height:${u}px;text-align:center;color:${R.onColour(R.edge, 12, 500)}">x</div>`);
    const cx = px0 + (fw - u) / 2, cy = py + (fh - u) / 2;
    return sec(K, X0, y, CW, catNo(ctx, 'logo', 1), 'Clear space', 'one x on every side')
      + obj(K, px0, py, fw, fh, R.groundHex, '', `outline:0`)
      + rect(px0 + u, py + u, lw, lh, `box-shadow:none;border:1px solid ${R.edge}`)
      + at(px0 + u, py + u, art('colour', lw))
      + sq(cx, py) + sq(cx, py + fh - u) + sq(px0, cy) + sq(px0 + fw - u, cy)
      + card(K, X0, py, COLW, gA.h - SUBH - 12, at(16, 14, `<div class="lg-n">${A(ruleText)}</div>`, { w: COLW - 32 })
        + kv.map(([k, v], i) => at(16, 14 + ruleH + 14 + i * 48, `<div class="lg-c lg-ql" style="font-weight:400">${A(k)}</div><div class="lg-n">${A(v)}</div>`, { w: COLW - 32 })).join(''));
  };

  // 2 colourways, each on the ground it is drawn for (one tile per drawing; the slot edition one per colourway, as it draws one frame whatever the drawing)
  const groups = [];
  for (const g of LF.grounds) {
    const key = slot ? `${g.groundHex.toLowerCase()}|${g.label}` : JSON.stringify(g.cw);
    const f = groups.find((o) => o.key2 === key);
    if (f) f.labels.push(g.label); else groups.push({ ...g, key2: key, labels: [g.label] });
  }
  if (groups.length > maxTiles) groups.length = maxTiles;
  const lgw0 = Math.min(180, Math.max(116, Math.round((44 * G.w) / G.h))), lgw = slot ? Math.min(CW - 24, slotW(ctx, lgw0)) : lgw0, lgh = (lgw * G.h) / G.w;
  let perRow = Math.min(3, groups.length);
  const tileW = (pr) => Math.floor((CW - 12 * (pr - 1)) / pr);
  while (perRow > 1 && lgw + 24 > tileW(perRow)) perRow -= 1;
  if (lgw + 24 > tileW(perRow)) throw new Error(`Label guide: the colourway tile is ${tileW(perRow)} px wide and the logo needs ${lgw + 24}`);
  const rowsN = Math.ceil(groups.length / perRow), th = Math.ceil(12 + lgh + 12 + 16 + 12), TW = tileW(perRow);
  const B_h = SUBH + 12 + rowsN * th + (rowsN - 1) * 12;
  const drawB = (y) => sec(K, X0, y, CW, catNo(ctx, 'logo', 2), 'Colourways', 'each on the ground it is drawn for') + groups.map((g, i) => {
    const x = X0 + (i % perRow) * (TW + 12), ty = y + SUBH + 12 + Math.floor(i / perRow) * (th + 12), ink = R.onColour(g.groundHex, 12, 500);
    return obj(K, x, ty, TW, th, g.groundHex, at(12, 12, art('colour', lgw, { colourway: g.key, color: ink })) + at(12, th - 28, A(g.labels.join(' and ')), { w: TW - 24, cls: 'lg-c lg-e', style: `color:${ink}` }));
  }).join('');

  // 3 the smallest size, drawn at the size it names
  const mn = L.minSize, minW = mn.screenPx, minH = (minW * G.h) / G.w, labelInside = !slot || minH >= SLOT_MIN_H;
  const minText = `Never set the logo narrower than ${mn.screenPx} px on screen or ${mn.printMm} mm in print, so the name keeps reading.`;
  const mnPlateW = minW + 24, mnTextW = CW - mnPlateW - 24, mnTextH = para(K, minText, mnTextW).h;
  const mnPlateH = Math.ceil(minH) + 24 + (labelInside ? 0 : 20), C_h = SUBH + 12 + Math.max(mnPlateH, mnTextH);
  if (mnTextW < COLW) throw new Error(`Label guide: the smallest size (${minW} px) leaves ${mnTextW} px for its text`);
  const minArt = slot ? ctx.logo.html('colour', { width: minW, label: labelInside ? 'Logo' : '' }) : art('colour', minW);
  const drawC = (y) => sec(K, X0, y, CW, catNo(ctx, 'logo', 3), 'Smallest size', `${mn.screenPx} px, ${mn.printMm} mm`)
    + obj(K, X0, y + SUBH + 12, mnPlateW, mnPlateH, R.groundHex, at(12, 12, minArt) + (labelInside ? '' : at(12, 12 + Math.ceil(minH) + 4, 'Logo', { cls: 'lg-c lg-q', style: 'font-weight:400' })))
    + at(X0 + mnPlateW + 24, y + SUBH + 12, A(minText), { w: mnTextW, cls: 'lg-n' });

  // 4 lockups: horizontal, stacked and symbol, each with the line that says when to use it (the slot edition carries neutral lines)
  const LK = [['horizontal', 'Horizontal'], ['stacked', 'Stacked'], ['symbol', 'Symbol']];
  const lkWhen = (id) => (slot ? { horizontal: 'Headers, signatures, wide spaces.', stacked: 'Squarer spaces, such as avatars.', symbol: 'App icon, favicon and stamp.' }[id] : ctx.brand.logo.when[id]);
  const lkTile = 56, lkMaxH = 32, lkMaxW = COLW - 32;
  const lkW = (id) => { const g = L.geos[id], w = Math.min(lkMaxW, (lkMaxH * g.w) / g.h); return slot ? Math.min(lkMaxW, Math.max(w, Math.ceil((SLOT_MIN_H * g.w) / g.h))) : w; };
  const lkCap = Math.max(...LK.map(([id]) => nLines(S.body, lkWhen(id), 12, COLW) * 16));
  const D_h = SUBH + 12 + lkTile + 8 + 16 + 2 + lkCap;
  const drawD = (y) => sec(K, X0, y, CW, catNo(ctx, 'logo', 4), 'Lockups') + LK.map(([id, name], i) => {
    const x = COL[i], ty = y + SUBH + 12, w = lkW(id), h = (w * L.geos[id].h) / L.geos[id].w;
    return obj(K, x, ty, COLW, lkTile, R.groundHex, at((COLW - w) / 2, (lkTile - h) / 2, art(id, w)))
      + at(x, ty + lkTile + 8, A(name), { cls: 'lg-c' }) + at(x, ty + lkTile + 8 + 18, A(lkWhen(id)), { w: COLW, cls: 'lg-r lg-q' });
  }).join('');

  // 5 never: four label cards of rule text (the rule, in words, as the card on the wall says it)
  const nev = [['Stretch', 'Never stretch or squash it.'], ['Recolour', 'Never recolour it outside its colourways.'], ['Crowd', 'Never crowd it inside its clear space.'], ['Rearrange', 'Never move or redraw its parts.']];
  const NW = Math.floor((CW - 3 * 12) / 4), nevH = 16 + 16 + 4 + Math.max(...nev.map(([, s]) => para(K, s, NW - 24).h)) + 16;
  const E_h = SUBH + 12 + nevH;
  const drawE = (y) => sec(K, X0, y, CW, catNo(ctx, 'logo', 5), 'Never') + nev.map(([k, s], i) => card(K, X0 + i * (NW + 12), y + SUBH + 12, NW, nevH, at(12, 16, `<div class="lg-c">${A(k)}</div><div class="lg-n" style="margin-top:4px">${A(s)}</div>`, { w: NW - 24 }))).join('');

  // the clear-space drawing takes what the other sections leave, as tall as the room, one x on every side
  const fixed = B_h + C_h + D_h + E_h + 4 * 16, room = BOT - t.top - fixed - SUBH - 12;
  const textH = ruleH + 14 + kv.length * 48 + 14 + 16;
  const u = Math.floor(Math.min(plateW / fwX, room / fhX, 40));
  if (u < 12) {
    if (groups.length > perRow) return { fewer: perRow };
    throw new Error(`Label guide: the clear-space drawing gets ${Math.max(0, u)} px for one x (it needs 12)`);
  }
  Object.assign(gA, { u, fw: fwX * u, fh: fhX * u, lw: xw * u, lh: xh * u });
  gA.h = SUBH + 12 + Math.max(fhX * u, textH);
  if (gA.h + fixed > BOT - t.top && groups.length > perRow) return { fewer: perRow };
  ctx.logoShown = groups.flatMap((g) => g.labels.map((label, i) => ({ key: i ? LF.grounds.find((o) => o.label === label).key : g.key, label })));
  hook(ctx, { lockups: LK.map(([id, name]) => [name, lkWhen(id)]) });
  if (slot) hookAdd(ctx, 'supply', [['Logo', 'Horizontal, stacked and symbol, SVG']]);
  return shell(ctx, 'logo', t.html + flow('logo', t.top, [{ h: gA.h, draw: drawA }, { h: B_h, draw: drawB }, { h: C_h, draw: drawC }, { h: D_h, draw: drawD }, { h: E_h, draw: drawE }], { gap: 16, maxGap: 40 }));
}

// ---------------------------------------------------------------- colour
function colourPage(ctx) {
  const K = kit(ctx), { R, S } = K, F = colourFacts(ctx);
  const t = title(ctx, K, 'colour', copyOf(ctx, 'colour', [F.length > 1 ? `${cap1(numberWord(F.length))} colours, widest first.` : 'The colour and how to write it down.', 'The palette and its values.']));
  const cmykOf = ([r, g, b]) => { const k = 1 - Math.max(r, g, b) / 255; return k >= 1 ? [0, 0, 0, 100] : [r, g, b].map((v) => ((1 - v / 255 - k) / (1 - k)) * 100).concat(k * 100).map(Math.round); };
  const computed = F.some((f) => !f.cmyk);
  const foot = computed ? 'CMYK * is computed from the hex: proof before print.' : '';
  const cols = F.length > 1 ? 2 : 1, gx = 16, cw = Math.floor((CW - gx * (cols - 1)) / cols), nRows = Math.ceil(F.length / cols);
  const textW = cw - 32 - 76;
  const inkText = (f) => `${f.ink.name} ${f.ink.ratioText}:1 ${f.ink.grade}`;
  const cardH = 20 + 3 * 20 + Math.max(...F.map((f) => para(K, inkText(f), textW).h)) + 12;
  const minPlate = 64, gy = 14, footH = foot ? 18 : 0;
  const gridH = nRows * (minPlate + 8 + cardH) + (nRows - 1) * gy;
  const draw = (y, extra) => {
    const ph = minPlate + Math.floor(extra / nRows);
    return F.map((f, i) => {
      const x = X0 + (i % cols) * (cw + gx), py = y + Math.floor(i / cols) * (ph + 8 + cardH + gy), [r, g, b] = f.rgb, ink = R.onColour(f.hex, 13, 500);
      const cmyk = f.cmyk ? (Array.isArray(f.cmyk) ? f.cmyk.join(' ') : String(f.cmyk)) : `${cmykOf(f.rgb).join(' ')} *`;
      const kv = [['HEX', f.hex.replace('#', '').toUpperCase()], ['RGB', `${r} ${g} ${b}`], ['CMYK', cmyk]];
      return obj(K, x, py, cw, ph, f.hex, at(12, 12, `<div class="lg-c lg-wrap" style="color:${ink}">${A(f.name)}</div><div class="lg-c" style="font-weight:400;color:${ink}">${A(pct(f.share))}, ${A(f.role)}</div>`, { w: cw - 24 })
        + at(cw - 12 - 40, 12, A(catNo(ctx, 'colour', i + 1)), { w: 40, cls: 'lg-c', style: `text-align:right;font-weight:400;color:${ink}` }), ctx.ratio(f.hex, R.labelFill) < 1.5 ? `border:1px solid ${R.edge}` : '')
        + card(K, x, py + ph + 8, cw, cardH, kv.map(([k, v], j) => at(16, 14 + j * 20, A(k), { cls: 'lg-c lg-ql', style: 'font-weight:400' }) + at(92, 14 + j * 20, A(v), { cls: 'lg-m' })).join('')
          + at(16, 14 + 60 + 4, A('Set text in'), { cls: 'lg-c lg-ql', style: 'font-weight:400' }) + at(92, 14 + 60 + 2, A(inkText(f)), { w: textW, cls: 'lg-n', style: 'line-height:18px' }));
    }).join('');
  };
  const secs = [{ h: gridH, flex: 400, draw }];
  if (foot) secs.push({ h: footH, draw: (y) => at(X0, y, A(foot), { w: CW, cls: 'lg-r lg-q' }) });
  return shell(ctx, 'colour', t.html + flow('colour', t.top, secs, { gap: 12, maxGap: 24 }));
}

// ---------------------------------------------------------------- proportion
function rulerPage(ctx) {
  const K = kit(ctx), { R } = K, B = ctx.brand, F = colourFacts(ctx).slice().sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
  const top0 = F[0];
  const t = title(ctx, K, 'ruler', copyOf(ctx, 'ruler', [top0 && typeof top0.share === 'number' ? `${top0.name} holds ${pct(top0.share)}. The rest is held back.` : 'How much of each colour a page carries.', 'How much of each colour a page carries.']));
  // the bar: widths by share inside a 1 px keyline, no segment under 6 px (the shortfall comes off the widest), rounded by largest remainder to the inner width
  const inner = CW, MIN = 6, shares = F.map((f) => (typeof f.share === 'number' ? f.share : 1 / F.length)), tot = sum(shares) || 1;
  let raw = shares.map((s) => (s / tot) * inner);
  const low = raw.map((w) => w < MIN), short = sum(raw.map((w, i) => (low[i] ? MIN - w : 0)));
  const wi = raw.indexOf(Math.max(...raw));
  raw = raw.map((w, i) => (low[i] ? MIN : i === wi ? w - short : w));
  const base = raw.map(Math.floor);
  let left = inner - sum(base);
  raw.map((w, i) => ({ i, f: w - Math.floor(w) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach((o) => { base[o.i] += 1; });
  const BAR = 56, barSec = { h: SUBH + 12 + BAR, flex: 300, draw: (y, extra = 0) => {
    let x = 0;
    const by = y + SUBH + 12, bh = BAR + extra;
    // the segments tile the full width; the 1 px keyline is drawn over them, so a segment as pale as the wall still has a visible end
    const segs = F.map((f, i) => {
      const lab = pct(f.share), s = rect(X0 + x, by, base[i], bh, `background:${f.hex}`, tw(CHROME[500], lab, 12) + 16 <= base[i] ? at(8, 8, A(lab), { cls: 'lg-c', style: `color:${R.onColour(f.hex, 12, 500)}` }) : '');
      x += base[i];
      return s;
    }).join('');
    return sec(K, X0, y, CW, catNo(ctx, 'ruler', 1), 'Proportion of a page', `${F.length} colour${F.length === 1 ? '' : 's'}, widest first`)
      + segs + rect(X0, by, CW, bh, `border:1px solid ${R.edge}`);
  } };
  // the table
  const rows = F.slice(0, 8), RH = 24;
  const tabSec = { h: SUBH + 12 + 20 + rows.length * RH, flex: 8 * rows.length, draw: (y, extra = 0) => {
    // the extra goes to the card as even padding above the first row and below the last
    const tH = 20 + rows.length * RH + extra, padTop = 14 + Math.floor(extra / 2);
    return sec(K, X0, y, CW, catNo(ctx, 'ruler', 2), 'Share by colour')
    + card(K, X0, y + SUBH + 12, CW, tH, rows.map((f, i) => {
      const yy = padTop + i * RH;
      // a swatch on the card gets the edge when it is close to the card's own colour
      return rect(16, yy + 1, 14, 14, `background:${f.hex};${ctx.ratio(f.hex, R.labelFill) < 1.5 ? `border:1px solid ${R.edge}` : ''}`)
        + at(44, yy, A(f.name), { w: 250, cls: 'lg-c lg-e' }) + at(310, yy, A(f.role), { w: 260, cls: 'lg-r lg-ql lg-e' })
        + at(CW - 16 - 80, yy, A(pct(f.share)), { w: 80, cls: 'lg-m', style: 'text-align:right' });
    }).join(''));
  } };
  // the rules
  const markRules = copyRaw(ctx, 'markRules', []);
  const rules = ((B.guideB && B.guideB.rules) || []).filter((_, i) => !(ctx.edition === 'slot' && markRules.includes(i))).map((r) => (typeof r === 'string' ? { title: '', text: r } : { title: r.title || '', text: r.text || '' }));
  const secs = [barSec, tabSec];
  if (rules.length) {
    const rc = Math.min(3, rules.length), RW = Math.floor((CW - 12 * (rc - 1)) / rc), rowsN = Math.ceil(rules.length / rc);
    const hs = rules.map((r) => 16 + (r.title ? 20 : 0) + para(K, r.text, RW - 32).h + 16);
    const rowH = Array.from({ length: rowsN }, (_, i) => Math.max(...hs.slice(i * rc, i * rc + rc)));
    secs.push({ h: SUBH + 12 + sum(rowH) + 12 * (rowsN - 1), draw: (y) => sec(K, X0, y, CW, catNo(ctx, 'ruler', 3), 'Rules') + rules.map((r, i) => {
      const cy = y + SUBH + 12 + sum(rowH.slice(0, Math.floor(i / rc))) + 12 * Math.floor(i / rc);
      return card(K, X0 + (i % rc) * (RW + 12), cy, RW, rowH[Math.floor(i / rc)], at(16, 16, (r.title ? `<div class="lg-c" style="margin-bottom:4px">${A(r.title)}</div>` : '') + `<div class="lg-n">${A(r.text)}</div>`, { w: RW - 32 }));
    }).join('') });
  }
  return shell(ctx, 'ruler', t.html + flow('ruler', t.top, secs, { gap: 24, maxGap: 48 }));
}

// ---------------------------------------------------------------- applied
function appliedPage(ctx) {
  const K = kit(ctx), { R, S } = K, B = ctx.brand, G = ctx.logo.geos.colour, app = B.applications || {}, st = K.st;
  const t = title(ctx, K, 'applied', copyOf(ctx, 'applied', ['The brand in use, on its own surfaces.', 'The brand in use.']));
  const m = /^(.+?), ([\d.]+) x ([\d.]+) mm: (.+)$/.exec(app.signage || '');
  const sg = m ? { name: m[1], mm: `${m[2]} x ${m[3]} mm`, w: +m[2], h: +m[3], line: m[4] } : { name: 'Sign', mm: '', w: 594, h: 841, line: app.signage || B.lines.primary };
  const OH = 340, sw = Math.max(120, Math.min(250, Math.round((OH * sg.w) / sg.h))), cdW = 256, cdH = 168;
  const so = { x: X0, w: sw }, co = { x: X0 + sw + 24, w: cdW }, sx = co.x + cdW + 24, soW = XR - sx;
  // the caption cards under the objects: the name and the size
  const cap = (name, detail, w) => ({ w, h: 12 + 16 + (detail ? 2 + para(K, detail, w - 24, { size: 12, lh: 16 }).h : 0) + 12, name, detail });
  const card0 = app.card || {}, caps = [cap(sg.name, sg.mm, sw), cap('Business card', '85 x 54 mm', cdW)];
  const capH = Math.max(...caps.map((c) => c.h));
  const capCard = (x, y, c) => card(K, x, y, c.w, capH, at(12, 12, `<div class="lg-c">${A(c.name)}</div>${c.detail ? `<div class="lg-r lg-ql" style="margin-top:2px">${A(c.detail)}</div>` : ''}`, { w: c.w - 24 }));
  // the sign: a printed board, its line in the display face, as large as the board holds
  // the sign is printed in the action colour, its logo in the colourway drawn for that ground
  const sInk = R.onColour(R.action, 13, 500), swCw = R.colourwayOn(R.action), lw0 = Math.min(sw - 32, ctx.edition === 'slot' ? slotW(ctx, 110) : 110), lh0 = (lw0 * G.h) / G.w;
  const sRoom = OH - 32 - lh0 - 16;
  const sSize = [26, 22, 18, 16, 14].find((s) => nLines(S.disp, sg.line, s, sw - 32, st) * Math.round(s * 1.15) <= sRoom) || 14;
  const sign = (y0) => obj(K, so.x, y0, sw, OH, R.action, at(16, 16, logoArt(ctx, 'colour', Math.min(sw - 32, lw0), { colourway: swCw, color: sInk }), {}) + at(16, 16 + lh0 + 16, A(sg.line), { w: sw - 32, cls: 'lg-d', style: `font-size:${sSize}px;line-height:${Math.round(sSize * 1.15)}px;color:${sInk}` }), 'overflow:hidden');
  const cLw = Math.min(cdW - 32, ctx.edition === 'slot' ? slotW(ctx, 96) : 96);
  const cInk = R.onColour(R.groundHex, 13, 500);
  const bizcard = (y0) => obj(K, co.x, y0, cdW, cdH, R.groundHex,
    at(16, 16, logoArt(ctx, 'colour', cLw)) + at(16, cdH - 16 - 50, `<div class="lg-n" style="font-weight:500;line-height:18px;color:${cInk}">${A(card0.person || '')}</div><div class="lg-r" style="color:${cInk}">${A(card0.role || '')}</div><div class="lg-m" style="color:${cInk}">${A(card0.contact || '')}</div>`, { w: cdW - 32 }), 'overflow:hidden');
  const social = (app.social || []).slice(0, 3), sH = 16 + 16 + social.reduce((a, s) => a + para(K, s, soW - 32).h + 8, 0) + 8;
  const rowH = OH + 8 + capH;
  const rowSec = { h: SUBH + 12 + rowH, draw: (y) => {
    // the sign and the social card share a top line; the sign and the card share a foot, 8 px above their caption cards
    const y0 = y + SUBH + 12, cy = y0 + OH - cdH;
    return sec(K, X0, y, CW, catNo(ctx, 'applied', 1), 'Sign, card and social', 'each drawn to its own scale')
      + sign(y0) + capCard(so.x, y0 + OH + 8, caps[0])
      + bizcard(cy) + capCard(co.x, y0 + OH + 8, caps[1])
      + (social.length && sH <= OH ? card(K, sx, y0, soW, sH, at(16, 16, `<div class="lg-c lg-ql">Social</div>` + social.map((s) => `<div class="lg-n" style="margin-top:8px">${A(s)}</div>`).join(''), { w: soW - 32 })) : '');
  } };
  // the order email, across the page
  const em = (B.guideB && B.guideB.email) || {}, emBody = (Array.isArray(em.body) ? em.body.reduce((s, p) => (s && /,$/.test(s) ? s + ' ' + p.charAt(0).toLowerCase() + p.slice(1) : s ? s + ' ' + p : p), '') : em.body) || '', pad = 24, tW = CW - 2 * pad;
  const subject = em.subject || '', subjLines = nLines(S.disp, subject, 22, tW, st), bp = para(K, emBody, tW);
  const BK = buttonKit(ctx, K);
  const EH = pad + 20 + 14 + subjLines * 26 + 12 + bp.h + 20 + BK.bh + pad;
  const emSec = { h: SUBH + 12 + EH, flex: 40, draw: (y, extra = 0) => {
    const ey = y + SUBH + 12, ink = R.onColour(R.groundHex, 13, 500), by = pad + 34 + subjLines * 26 + 12 + bp.h + 20;
    return sec(K, X0, y, CW, catNo(ctx, 'applied', 2), 'Order email')
      + obj(K, X0, ey, CW, EH + extra, R.groundHex, at(pad, pad, `<span class="lg-c">${A(em.to ? `To ${em.to}` : (card0.person || ''))}</span>`, { w: tW - 80, style: `color:${ink}` })
        + at(CW - pad - 80, pad, A(em.time || ''), { w: 80, cls: 'lg-m', style: `text-align:right;color:${ink}` })
        + at(pad, pad + 34, A(subject), { w: tW, cls: 'lg-d', style: `font-size:22px;line-height:26px;color:${ink}` })
        + at(pad, pad + 34 + subjLines * 26 + 12, A(emBody), { w: tW, cls: 'lg-n', style: `color:${ink}` })
        + rect(pad, by, BK.w1, BK.bh, `background:${BK.bt.fill};color:${BK.bt.label};${BK.bstyle}`, A(BK.vPrimary)));
  } };
  return shell(ctx, 'applied', t.html + flow('applied', t.top, [rowSec, emSec], { gap: 24, maxGap: 60 }));
}

// ---------------------------------------------------------------- type
function typePage(ctx) {
  const K = kit(ctx), B = ctx.brand, LAD = typeLadder(ctx), d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono;
  const fams = [...new Set([d.family, b.family])];
  const t = title(ctx, K, 'type', copyOf(ctx, 'type', [`${cap1(numberWord(LAD.length))} steps, set in ${listAnd(fams)}.`, 'The scale, step by step.']));
  const sp = copyRaw(ctx, 'typeSpecimens', {}), lines0 = [B.lines.primary, ...(B.lines.others || [])].filter(Boolean);
  const specimen = (s) => {
    const own = (sp[s.token] || [])[0] || (s.token === 'display' && sp.display && sp.display[0]);
    return own || (s.face === 'display' ? lines0[0] : (lines0.find((l) => l.length > 18) || lines0[0] || s.name));
  };
  // faces: three plates (the display face, the text face, the mono face when there is one)
  const plates = [[d.family, `${weightName(ctx.weights.heading)}`, 'display'], [b.family, `${weightName(ctx.weights.regular)} and ${weightName(ctx.weights.medium)}`, 'body']];
  if (mo) plates.push([mo.family, weightName(400), 'mono']);
  const pw = Math.floor((CW - 12 * (plates.length - 1)) / plates.length), PH = 96;
  const facesSec = { h: SUBH + 12 + PH, flex: 60, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'type', 1), 'Faces') + plates.map(([fam, wt, role], i) => {
    const x = X0 + i * (pw + 12), w = role === 'display' ? ctx.weights.heading : 400, fam2 = role === 'display' ? 'var(--display)' : role === 'mono' ? 'var(--mono)' : 'var(--body)';
    return card(K, x, y + SUBH + 12, pw, PH + extra, at(16, 10 + Math.floor(extra / 2), `<span style="font-family:${fam2};font-weight:${w};font-size:40px;line-height:44px">Aa</span>`, { cls: 'lg-nw' })
      + at(16, 60 + extra,`<div class="lg-c lg-e" style="width:${pw - 32}px">${A(fam)}</div><div class="lg-r lg-ql lg-e" style="width:${pw - 32}px">${A(wt)}</div>`));
  }).join('') };
  // the ladder: each step at its own size (a display step over 56 px is shown at 56 and says so), with its name and numbers in the first column
  const CAP = 56, LW = 168, SX = X0 + LW + 16, SW = XR - SX;
  // each step is set on one line: a step too wide for the column is drawn smaller (its numbers beside it stay the real ones)
  const rowsD = LAD.map((s) => {
    const stem = stemOf(ctx, s.face, s.weight), word = specimen(s), mult = s.face === 'display' ? K.st : 1;
    let sz = Math.min(s.size, CAP);
    while (sz > 14 && tw(stem, word, sz) * mult * 1.03 > SW) sz -= 2;
    const lh = Math.max(Math.round((s.line / s.size) * sz), Math.ceil(sz * 1.2), 20);
    return { s, sz, lh, h: Math.max(lh, 34), shrunk: sz < s.size };
  });
  const lH = sum(rowsD.map((r) => r.h)) + 14 * (rowsD.length - 1);
  const ladSec = { h: SUBH + 12 + lH, flex: 44 * rowsD.length, draw: (y, extra = 0) => {
    const add = Math.floor(extra / rowsD.length);
    let yy = y + SUBH + 12;
    return sec(K, X0, y, CW, catNo(ctx, 'type', 2), 'Scale', `${LAD.length} steps`) + rowsD.map((r) => {
      const { s } = r, fam = s.face === 'display' ? 'var(--display)' : s.face === 'mono' ? 'var(--mono)' : 'var(--body)', h = r.h + add;
      const out = at(X0, yy, `<div class="lg-c">${A(s.name)}</div><div class="lg-m lg-q" style="font-family:var(--chrome);font-variant-numeric:normal">${s.size} / ${s.line}, ${A(weightName(s.weight))}</div>${r.shrunk ? `<div class="lg-m lg-q" style="font-family:var(--chrome);font-variant-numeric:normal">shown at ${r.sz}</div>` : ''}`, { w: LW })
        + at(SX, yy + Math.floor((h - r.lh) / 2), A(specimen(s)), { w: SW, cls: 'lg-spec', style: `font-family:${fam};font-weight:${s.weight};font-size:${r.sz}px;line-height:${r.lh}px;${s.face === 'display' ? `font-stretch:${d.stretch || 100}%;` : ''}height:${r.lh}px` });
      yy += h + 14;
      return out;
    }).join('');
  } };
  return shell(ctx, 'type', t.html + flow('type', t.top, [facesSec, ladSec], { gap: 24, maxGap: 48 }));
}

// ---------------------------------------------------------------- contrast
function contrastPage(ctx) {
  const K = kit(ctx), { R } = K, F = contrastFacts(ctx), P = F.pairs;
  const t = title(ctx, K, 'contrast', copyOf(ctx, 'contrast', [`${cap1(numberWord(P.length))} pairs the interface uses, each measured.`, 'Every pair the interface uses, measured.']));
  const RH = 36, AX = 360, AW = 170;
  const pairs = { h: SUBH + 12 + P.length * RH, flex: P.length * 72, draw: (y, extra = 0) => {
    const rh = RH + Math.floor(extra / Math.max(1, P.length)), sh = Math.max(28, Math.min(56, rh - 12));
    return sec(K, X0, y, CW, catNo(ctx, 'contrast', 1), 'Pairs', 'ratio of text to ground, out of 21') + P.map((p, i) => {
      const yy = y + SUBH + 12 + i * rh, fam = p.sample && p.sample.face === 'display' ? 'var(--display)' : 'var(--body)', sz = Math.min((p.sample || {}).size || 15, 20);
      return obj(K, X0, yy + Math.floor((rh - sh) / 2), 56, sh, p.bgHex, at(0, 0, `<div style="width:56px;height:${sh}px;display:flex;align-items:center;justify-content:center;font-family:${fam};font-weight:${(p.sample || {}).weight || 400};font-size:${sz}px;line-height:1;color:${p.fgHex}">Aa</div>`))
        + at(X0 + 72, yy + Math.floor((rh - 34) / 2), `<div class="lg-c lg-e" style="width:${AX - X0 - 88}px">${A(p.label)}</div><div class="lg-r lg-q lg-e" style="width:${AX - X0 - 88}px">${A(p.use || '')}</div>`)
        + rect(AX, yy + Math.floor(rh / 2) - 3, r1((Math.min(p.ratio, 21) / 21) * AW), 6, 'background:var(--ink)')
        + at(AX + AW + 16, yy + Math.floor((rh - 16) / 2), A(`${p.ratioText}:1`), { w: 60, cls: 'lg-m' })
        + at(AX + AW + 16 + 60, yy + Math.floor((rh - 16) / 2), A(p.grade), { w: XR - (AX + AW + 76), cls: 'lg-c lg-q lg-e', style: 'font-weight:400' });
    }).join('');
  } };
  // the tones the guide draws that the palette does not carry
  const brandTone = (hex) => (ctx.brand.tones || []).find((o) => o.hex.toLowerCase() === hex.toLowerCase());
  const tones = [...F.tones, ...F.interfaceTones].map((tn) => ({ ...tn, name: (brandTone(tn.hex) || {}).name || tn.name }));
  hook(ctx, { tones: tones.map((tn) => ({ name: tn.name, hex: tn.hex.toUpperCase(), use: cap1(tn.role) })) });
  const tc = tones.length <= 3 ? 1 : 3, TWd = Math.floor((CW - 12 * (tc - 1)) / tc), trows = Math.ceil(tones.length / tc);
  const tonesSec = tones.length ? { h: SUBH + 12 + trows * 30, flex: trows * 24, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'contrast', 2), 'Tones', 'in use, not on the palette') + tones.map((tn, i) => {
    const x = X0 + (i % tc) * (TWd + 12), yy = y + SUBH + 12 + Math.floor(i / tc) * (30 + Math.floor(extra / trows));
    return rect(x, yy + 2, 22, 22, `background:${tn.hex}`, '', R.nearWall(tn.hex) ? 'edge' : '') + at(x + 32, yy, `<div class="lg-c lg-e" style="width:${TWd - 40}px">${A(tn.name)}</div><div class="lg-m lg-q" style="font-size:11px;line-height:14px">${A(tn.hex.replace('#', '').toUpperCase())}</div>`);
  }).join('') } : null;
  // the pairs the interface leaves out, by the palette's own names, the six nearest to passing
  const palName = (id) => { const c = ctx.byId[id]; return !c ? String(id) : ctx.tones.some((tn) => tn.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
  const unused = (ctx.unusedPairs || []).slice().sort((a, b) => parseFloat(b.ratioText) - parseFloat(a.ratioText)).slice(0, 6);
  const note = `${GRADE_NOTE}${unused.length ? ` Not used: ${unused.map((u) => `${palName(u.fg)} on ${palName(u.bg)} (${u.ratioText}:1)`).join(', ')}.` : ''}`;
  const noteH = para(K, note, CW - 32, { size: 12, lh: 16, stem: K.S.body }).h;
  const noteSec = { h: noteH + 24, draw: (y) => card(K, X0, y, CW, noteH + 24, at(16, 12, A(note), { w: CW - 32, cls: 'lg-r' })) };
  // the grades: four cells, each the least ratio that earns it, drawn on the same bar as the pairs
  const GR = [['Fail', 'under 3:1', 0], ['AA Large', '3:1 and over', 3], ['AA', '4.5:1 and over', 4.5], ['AAA', '7:1 and over', 7]], GW = Math.floor((CW - 12 * 3) / 4), GH = 76;
  const gradesSec = { h: SUBH + 12 + GH, draw: (y) => sec(K, X0, y, CW, catNo(ctx, 'contrast', tones.length ? 3 : 2), 'Grades', 'least ratio for each, out of 21') + GR.map(([n, r, min], i) => card(K, X0 + i * (GW + 12), y + SUBH + 12, GW, GH,
    at(16, 14, `<div class="lg-c">${A(n)}</div><div class="lg-r lg-ql">${A(r)}</div>`, { w: GW - 32 }) + rect(16, GH - 20, GW - 32, 6, 'background:var(--label-ink);opacity:.15') + rect(16 + r1((min / 21) * (GW - 32)), GH - 20, Math.max(3, r1(((i < 3 ? GR[i + 1][2] : 21) - min) / 21 * (GW - 32))), 6, 'background:var(--label-ink)'))).join('') };
  return shell(ctx, 'contrast', t.html + flow('contrast', t.top, [pairs, tonesSec, gradesSec, noteSec].filter(Boolean), { gap: 20, maxGap: 40 }));
}

// ---------------------------------------------------------------- tokens
function tokensPage(ctx) {
  const K = kit(ctx), { R } = K, T = tokenGroups(ctx), L = ctx.roles.light;
  const t = title(ctx, K, 'tokens', copyOf(ctx, 'tokens', ['Spacing, corners and edges, as set.', 'The spacing, corners and edges.']));
  const maxPx = Math.max(...T.space.map((s) => s.px), 1), BW = 200;
  const spRow = 28;
  const spaceSec = { h: SUBH + 12 + T.space.length * spRow, flex: T.space.length * 20, draw: (y, extra = 0) => {
    const rh = spRow + Math.floor(extra / Math.max(1, T.space.length));
    return sec(K, X0, y, CW, catNo(ctx, 'tokens', 1), 'Spacing', `base ${Math.min(...T.space.map((s) => s.px)) || 4} px`) + T.space.map((s, i) => {
      const yy = y + SUBH + 12 + i * rh;
      return at(X0, yy + Math.floor((rh - 16) / 2), A(s.token), { w: 90, cls: 'lg-m lg-e' }) + at(X0 + 96, yy + Math.floor((rh - 16) / 2), `${s.px} px`, { w: 52, cls: 'lg-m' })
        + rect(X0 + 160, yy + Math.floor((rh - 12) / 2), Math.max(1, Math.round((s.px / maxPx) * BW)), 12, 'background:var(--ink)')
        + at(X0 + 160 + BW + 16, yy + Math.floor((rh - 16) / 2), A(s.use || ''), { w: XR - (X0 + 160 + BW + 16), cls: 'lg-r lg-q lg-e' });
    }).join('');
  } };
  // corners: drawn at the largest whole multiple that leaves the biggest one a true corner (the section says so)
  const radii = T.radii, sq = 96, maxR = Math.max(...radii.filter((r) => r.px < 999).map((r) => r.px), 1), scale = Math.max(1, Math.min(4, Math.floor((sq / 2 - 1) / maxR)));
  const rc = Math.max(1, Math.min(radii.length, 3)), RWd = Math.floor((CW - 12 * (rc - 1)) / rc), rrows = Math.ceil(radii.length / rc);
  const radiiSec = radii.length ? { h: SUBH + 12 + rrows * (sq + 12) - 12, flex: 0, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'tokens', 2), 'Corners', scale > 1 ? `drawn at ${scale}x` : '') + radii.map((r, i) => {
    const x = X0 + (i % rc) * (RWd + 12), yy = y + SUBH + 12 + Math.floor(i / rc) * (sq + 12 + Math.floor(extra / rrows)), rad = Math.min(r.px * scale, sq / 2);
    return rect(x, yy, sq, sq, `border:1px solid ${R.edge};background:var(--panel);border-radius:${rad}px`)
      + at(x + sq + 12, yy, `<div class="lg-c">${r.px >= 999 ? 'Round' : `${r.px} px`}</div>` + r.tokens.map((tk) => `<div class="lg-m lg-q" style="font-size:11px;line-height:14px">${A(tk)}</div>`).join(''), { w: RWd - sq - 12 });
  }).join('') } : null;
  // borders at their real width and colour; the focus ring in the focus colour, at the control border's width
  const ctl0 = ctx.borders.find((b) => b.token === 'border-control'), fc = L.focus, fcName = (ctx.colours.find((c) => c.hex.toLowerCase() === fc.toLowerCase()) || {}).name || '';
  const bord = [...T.borders.map((b) => ({ ...b, tokens: b.tokens.filter((tk) => tk !== 'border-focus') })).filter((b) => b.tokens.length), ...(ctl0 ? [{ tokens: ['Focus ring'], px: ctl0.px, focus: true }] : [])];
  const bordCol = (b) => (b.focus ? L.focus : b.tokens.includes('border-control') ? L.border : L.divider);
  const bordText = (b) => [...(b.uses || []), ...(b.focus ? [`${fcName ? `${fcName} ` : ''}${fc.replace('#', '').toUpperCase()} at border-control`] : [])].join(', ');
  const BR = 44, uW = XR - (X0 + 402);
  const bordSec = { h: SUBH + 12 + bord.length * BR, flex: bord.length * 40, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'tokens', 3), 'Borders', 'at their real width and colour') + bord.map((b, i) => {
    const br = BR + Math.floor(extra / bord.length), yy = y + SUBH + 12 + i * br;
    return at(X0, yy + Math.floor((br - 16 * b.tokens.length) / 2), b.tokens.map((tk) => `<div class="lg-m lg-e">${A(tk)}</div>`).join(''), { w: 130 }) + at(X0 + 136, yy + Math.floor((br - 16) / 2), `${b.px} px`, { w: 44, cls: 'lg-m' })
      + rect(X0 + 186, yy + Math.floor(br / 2) - b.px / 2, 200, b.px, `background:${bordCol(b)}`)
      + at(X0 + 402, yy + Math.floor((br - 16) / 2), A(bordText(b)), { w: uW, cls: 'lg-r lg-q lg-e' });
  }).join('') };
  hook(ctx, { borders: bord.map((b) => (b.focus ? ['Focus ring', `${fcName ? `${fcName} ` : ''}\`#${fc.replace('#', '').toUpperCase()}\` at \`border-control\` ${b.px} px`] : [b.tokens.map((tk) => `\`${tk}\``).join(', '), `${b.px} px`])) });
  return shell(ctx, 'tokens', t.html + flow('tokens', t.top, [spaceSec, radiiSec, bordSec].filter(Boolean), { gap: 24, maxGap: 48 }));
}

// ---------------------------------------------------------------- usage
// the button as the engine reports it, its label set in the scale's own Label step
const buttonOf = (ctx) => { const bt = usageFacts(ctx).button, lab = typeLadder(ctx).find((t) => t.token === 'label'); return lab && bt.type.token !== 'control' ? { ...bt, type: { ...bt.type, ...lab } } : bt; };
// the brand's primary button: its measured size and the style that draws it (the usage page and the order email share it)
function buttonKit(ctx, K) {
  const bt = buttonOf(ctx), d = ctx.brand.fonts.display;
  const fam = (tk) => (tk.face === 'display' ? 'var(--display)' : 'var(--body)');
  const font = (tk) => `font:${tk.weight} ${tk.size}px/${tk.line}px ${fam(tk)};${tk.face === 'display' ? `font-stretch:${d.stretch || 100}%;` : ''}`;
  const V = copyRaw(ctx, 'verbs', {}), vPrimary = V.primary || bt.primary;
  const padY = bt.padY.px, padX = bt.padX.px, bh = padY * 2 + bt.type.line;
  const btnW = (s) => Math.ceil(tw(stemOf(ctx, bt.type.face, bt.type.weight), s, bt.type.size) * (bt.type.face === 'display' ? K.st : 1)) + 2 * padX;
  const w1 = btnW(vPrimary), bstyle = `display:flex;align-items:center;justify-content:center;height:${bh}px;box-sizing:border-box;border-radius:${bt.radius.px}px;${font(bt.type)}white-space:nowrap`;
  return { bt, font, vPrimary, bh, btnW, w1, bstyle };
}
function usagePage(ctx) {
  const K = kit(ctx), { R, S } = K, B = ctx.brand, U = usageFacts(ctx), cd = U.card, lk = U.link, L = ctx.roles.light;
  const { bt, font, vPrimary, bh, w1, bstyle } = buttonKit(ctx, K);
  const t = title(ctx, K, 'usage', copyOf(ctx, 'usage', ['The button, the link and the card, built from the tokens.', 'Built from the tokens.']));
  const SPW = 346, PLX = X0 + SPW + 16, PLW = XR - PLX;
  // a spec card: key, value rows
  // mono values are measured in the mono face at 12px, the rest in the body face at 13px
  const rowN = (v, mono) => Math.max(1, mono ? nLines(S.mono, v, 12, SPW - 104) : nLines(S.body, v, 13, SPW - 104));
  const specH = (rows) => 28 + sum(rows.map(([, v, mono]) => rowN(v, mono) * 18 + 4));
  const specCard = (x, y, rows, h) => { let yy = 14; return card(K, x, y, SPW, h, rows.map(([k, v, mono]) => { const n = rowN(v, mono), out = at(16, yy, A(k), { cls: 'lg-c lg-ql', style: 'font-weight:400;line-height:18px' }) + at(88, yy, A(v), { w: SPW - 104, cls: mono ? 'lg-m' : 'lg-n', style: mono ? 'white-space:normal;line-height:18px' : '' }); yy += n * 18 + 4; return out; }).join('')); };
  const bspec = [['Fill', bt.fillName], ['Label', bt.labelName], ['Radius', `${bt.radius.token}, ${bt.radius.px} px`, 1], ['Type', `${bt.type.name}, ${bt.type.size} / ${bt.type.line}`, 1], ['Padding', `${bt.padY.token} by ${bt.padX.token}`, 1]];
  const bH = Math.max(specH(bspec), bh + 48);
  const buttonSec = { h: SUBH + 12 + bH, draw: (y) => {
    const by = y + SUBH + 12;
    return sec(K, X0, y, CW, catNo(ctx, 'usage', 1), 'Button') + specCard(X0, by, bspec, bH)
      + obj(K, PLX, by, PLW, bH, R.groundHex, rect(Math.floor((PLW - w1) / 2), Math.floor((bH - bh) / 2), w1, bh, `background:${bt.fill};color:${bt.label};${bstyle}`, A(vPrimary)));
  } };
  // the states
  const states = [['Rest', `background:${bt.fill};color:${bt.label}`], ['Hover', `background:${L.actionHover};color:${bt.label}`], ...(L.actionPressed ? [['Pressed', `background:${L.actionPressed};color:${bt.label}`]] : []), ['Focus', `background:${bt.fill};color:${bt.label};outline:${bt.border ? bt.border.px : 1.5}px solid ${L.focus};outline-offset:2px`], ['Disabled', `background:${L.disabledBg};color:${L.disabledText}`]];
  const nSt = states.length, perRow = Math.floor((CW - 48 - nSt * w1) / (nSt - 1)) >= 12 ? nSt : Math.ceil(nSt / 2), stRows = Math.ceil(nSt / perRow), stGap = perRow > 1 ? Math.min(32, Math.floor((CW - 48 - perRow * w1) / (perRow - 1))) : 0;
  const stRowH = bh + 8 + 16 + 16, sH = 24 + stRows * stRowH - 16 + 8;
  const statesSec = { h: SUBH + 12 + sH, draw: (y) => sec(K, X0, y, CW, catNo(ctx, 'usage', 2), 'States', 'the button, each way it shows') + obj(K, X0, y + SUBH + 12, CW, sH, R.groundHex, states.map(([n, css], i) => {
    const x = 24 + (i % perRow) * (w1 + stGap), by = 24 + Math.floor(i / perRow) * stRowH;
    return rect(x, by, w1, bh, `${css};${bstyle}`, A(vPrimary)) + at(x, by + bh + 8, A(n), { cls: 'lg-c lg-q', style: 'font-weight:400' });
  }).join('')) };
  // the link
  // the link's colour is the foreground of the contrast pair the interface labels "Links"; failing that, the ink, named by its own name
  const lkPair = contrastFacts(ctx).pairs.find((p) => /^links?$/i.test(String(p.label).trim()) || /^links?$/i.test(String(p.use).trim()));
  const lkHexName = (hex) => ([...ctx.colours, ...ctx.tones].find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name;
  const lkCol = lkPair ? { hex: lkPair.fgHex, name: lkPair.fgName } : { hex: R.ink, name: lkHexName(R.ink) || R.ink.replace('#', '').toUpperCase() };
  const lspec = [['Type', `${lk.type.name}, ${lk.type.size} / ${lk.type.line}`, 1], ['Colour', lkCol.name], ['Line', lk.border ? `${lk.border.token}, ${lk.border.px} px` : 'none', 1]];
  const lH = Math.max(specH(lspec), lk.type.line + 48);
  const linkSec = { h: SUBH + 12 + lH, draw: (y) => {
    const by = y + SUBH + 12;
    return sec(K, X0, y, CW, catNo(ctx, 'usage', 3), 'Link') + specCard(X0, by, lspec, lH)
      + obj(K, PLX, by, PLW, lH, R.groundHex, at(24, Math.floor((lH - lk.type.line) / 2), A(lk.text), { style: `${font(lk.type)}color:${lkCol.hex};text-decoration:underline;text-decoration-thickness:${lk.border ? lk.border.px : 1.5}px;text-underline-offset:3px;white-space:nowrap` }));
  } };
  hook(ctx, { usage: {
    button: `${bt.fillName} fill, ${bt.labelName} label, \`${bt.radius.token}\` ${bt.radius.px} px, ${bt.type.name} ${bt.type.size}/${bt.type.line} px at ${bt.type.weight}, \`${bt.padY.token}\` over and \`${bt.padX.token}\` across`,
    link: `${lk.type.name} ${lk.type.size}/${lk.type.line} px at ${lk.type.weight}, ${lkCol.name}, underlined at \`${lk.border.token}\` ${lk.border.px} px`,
  } });
  // the card, drawn as its spec says
  const cspec = [['Fill', cd.fillName], ['Edge', `${cd.edge.token}, ${cd.edge.px} px ${cd.edgeName}`, 1], ['Radius', `${cd.radius.token}, ${cd.radius.px} px`, 1], ['Padding', cd.pad.token, 1], ['Title', `${cd.title.name}, ${cd.title.size} / ${cd.title.line}`, 1], ['Text', `${cd.body.name}, ${cd.body.size} / ${cd.body.line}`, 1]];
  const pad = cd.pad.px, edgePx = cd.edge.px, cardW = Math.min(PLW - 48, 300), tx = cardW - 2 * pad - 2 * edgePx;
  const tSt = cd.title.face === 'display' ? K.st : 1, tStem = stemOf(ctx, cd.title.face, cd.title.weight), bStem = stemOf(ctx, cd.body.face, cd.body.weight);
  const ctH = nLines(tStem, cd.titleText, cd.title.size, tx, tSt) * cd.title.line, cbH = nLines(bStem, cd.bodyText, cd.body.size, tx) * cd.body.line, cardH = 2 * edgePx + 2 * pad + ctH + 8 + cbH;
  const cH = Math.max(specH(cspec), cardH + 48);
  const cardSec = { h: SUBH + 12 + cH, flex: 80, draw: (y, extra = 0) => {
    // the spec card keeps its own height; the extra goes to the preview frame
    const by = y + SUBH + 12, hh = cH + extra;
    return sec(K, X0, y, CW, catNo(ctx, 'usage', 4), 'Card') + specCard(X0, by, cspec, specH(cspec))
      + obj(K, PLX, by, PLW, hh, R.groundHex, rect(Math.floor((PLW - cardW) / 2), Math.floor((hh - cardH) / 2), cardW, cardH, `background:${cd.fill};border:${edgePx}px solid ${cd.edgeColour};padding:${pad}px;border-radius:${cd.radius.px}px`,
        `<div style="${font(cd.title)}color:${L.text}">${A(cd.titleText)}</div><div style="margin-top:8px;${font(cd.body)}color:${L.text}">${A(cd.bodyText)}</div>`));
  } };
  return shell(ctx, 'usage', t.html + flow('usage', t.top, [buttonSec, statesSec, linkSec, cardSec], { gap: 20, maxGap: 40 }));
}

export const guide = makeGuide({
  cover: withFaces(cover), logo: withFaces(logoPage), colour: withFaces(colourPage), ruler: withFaces(rulerPage), applied: withFaces(appliedPage),
  type: withFaces(typePage), contrast: withFaces(contrastPage), tokens: withFaces(tokensPage), usage: withFaces(usagePage),
}, { order: PAGE_IDS, extra: ['ruler', 'applied'] });

export function guideCss(ctx) {
  const W = ctx.weights, d = ctx.brand.fonts.display, m = ctx.brand.fonts.mono;
  return `/* Label style guide: A4 portrait. The wall, label cards and catalogue numbers of the 1000 x 800 pages at page scale. */
.pg .lg-a{position:absolute;box-sizing:border-box}
.pg .lg-c{font:500 12px/16px var(--chrome);white-space:nowrap}
.pg .lg-b5{font-weight:500}
.pg .lg-r{font:400 12px/16px var(--chrome);text-wrap:pretty}
.pg .lg-n{font:${W.regular} 13px/18px var(--body);overflow-wrap:anywhere;text-wrap:pretty}
.pg .lg-b{font:${W.regular} 15px/22px var(--body);overflow-wrap:anywhere;text-wrap:pretty}
.pg .lg-m{font-family:var(--mono);font-weight:${m ? m.weights[0] : 400};font-size:12px;line-height:16px;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .lg-t{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;font-size:28px;line-height:32px;white-space:nowrap;color:var(--ink)}
.pg .lg-d{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;overflow-wrap:anywhere;text-wrap:balance}
.pg .lg-q{color:var(--quiet)}
.pg .lg-ql{color:var(--quiet-label)}
.pg .lg-e{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pg .lg-wrap{white-space:normal;overflow-wrap:anywhere}
.pg .lg-no{display:inline-block;width:40px;color:var(--quiet);font-weight:400}
.pg .lg-spec{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)}
.pg .lg-nw{white-space:nowrap}
`;
}
