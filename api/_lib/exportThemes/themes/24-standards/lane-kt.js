// Theme 24, Standards, lane kt: the brand kit PDFs (readMe and sheets), in the manual's own language. Every sheet carries the same three marks as the
// guidelines: the x-ruler along the foot (its live extent names the sheet's one big thing), dimension lines with slash ticks, and one thumb tab cut into
// the right edge. The kit's folders are numbered 00 to 05 as they are on disk, so the tab on a sheet is its folder's number and the cover of the read-me
// shows all six. Nothing is drawn on a photograph; the ruler runs underneath one. Every number is computed from ctx, every brand string is printed whole
// through A(), and no hex lives here: colours come by role from roles(ctx).
//
//   readMe           3 pages: the read-me (kit title at scale, the six folders as tabs), what is in the kit, the brand on one page
//   sheets.palette   fields at the shares the colours take, then every value and the tones that ride along in the palette files
//   sheets.typefaces the sample headline at scale on the dark band, then each face named in itself
//   sheets.photography  the direction beside one photograph (or brief), then the shot list as framed pictures with crop ticks
//   sheets.icons     one icon drawn on the unit grid, then the set. The engine prints this as 04 Icons/Icons.pdf, never in the read-me.
import { ratio } from '../../engine/color.js';
import { cropOf } from './photo-focus.js';
import { icon, iconSet, ICON_SET } from '../../engine/components.js';
import { A, G, f2, xOf, fx, roles, adv, wrap, loadFont, displayFont, blk, fill, dimH, dimV, cropTicks, ruler, pad3, colourwayFor } from './helpers.js';

const WN = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const Word = (n) => { const w = WORD[n] || String(n); return w[0].toUpperCase() + w.slice(1); };
const pl = (n, s) => `${n} ${n === 1 ? s : `${s}s`}`;
const cap1 = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// ---- measuring ----
const C4 = () => loadFont('PublicSans-400'), C6 = () => loadFont('PublicSans-600');
const topW = (ctx, role) => { const w = ctx.brand.fonts[role].weights; return w[w.length - 1]; };
const nearW = (ws, w) => ws.reduce((b, v) => (Math.abs(v - w) < Math.abs(b - w) ? v : b));
const fontOf = (ctx, role, w) => { const f = ctx.faces.find((q) => q.role === role && q.weight === w && q.style !== 'italic') || ctx.faces.find((q) => q.role === role && q.style !== 'italic'); return loadFont(f.stem); };
const widest = (font, lines, size) => Math.max(...lines.map((l) => adv(font, l, size)));
// the same line count as greedy, with the lines as even as they can be
function balanced(font, text, size, maxW) {
  const n = wrap(font, text, size, maxW).length;
  if (n === 1) return [text];
  let lo = Math.max(...text.split(/\s+/).map((w) => adv(font, w, size))), hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (wrap(font, text, size, mid).length <= n) hi = mid; else lo = mid; }
  return wrap(font, text, size, hi);
}
// field widths across a run: each field gets at least the width its label needs; the rest is shared in proportion to share
function fieldWidths(shares, needs, total) {
  const n = shares.length, w = new Array(n).fill(0), fixed = new Set();
  for (let pass = 0; pass <= n; pass++) {
    const left = total - [...fixed].reduce((s, i) => s + w[i], 0), free = shares.map((s, i) => (fixed.has(i) ? 0 : s)), sum = free.reduce((a, b) => a + b, 0) || 1;
    let moved = false;
    for (let i = 0; i < n; i++) if (!fixed.has(i)) { w[i] = (left * free[i]) / sum; if (w[i] < needs[i]) { w[i] = needs[i]; fixed.add(i); moved = true; } }
    if (!moved) break;
  }
  return w.map((x) => Math.round(x));
}

// ---- html bits ----
// explicit lines, so the lines laid out are the lines that render
const T = (x, y, w, arr, lh, cls, st = '', tag = 'p') => blk(x, y, w, arr.length * lh, cls + (arr.some((l) => //.test(l)) ? ' ph-tight' : ''), arr.map((l) => `<span class="kt24-ln">${A(l)}</span>`).join(''), `line-height:${lh}px;${st}`, tag);   // a placeholder in the lines (slot) prints compact
// chrome text in a column: { n, h, html } (13 px body 20, 12 px micro 16, or 600 weight)
const P = (x, y, w, text, col, { size = 13, lh = 20, wt = 400, cls = 'kt24-b', st = '' } = {}) => {
  const arr = wrap(wt === 600 ? C6() : C4(), text, size, w * 0.98);
  return { n: arr.length, h: arr.length * lh, html: T(x, y, w, arr, lh, cls, `color:${col};${st}`) };
};
const edge = (R, hex) => (ratio(hex, R.ground) < 1.15 ? `box-shadow:inset 0 0 0 1px ${R.hair};` : '');
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

// the running head: brand kit at c1, the kit folder at c4, the sheet's title at c7, the folio at the right edge of the last part
function kHead(ctx, { label, title, no, parts }) {
  const R = roles(ctx);
  parts = parts || [{ x1: G.L, x2: G.R, col: R.ink, slots: [[G.col[0], `${ctx.brand.name} brand kit`], [G.col[3], label], [G.col[6], title]] }];
  return parts.map((q, i) => fill(q.x1, 56, q.x2 - q.x1, 1, q.col)
    + q.slots.map(([sx, t]) => blk(sx, 32, 0, 16, 'c-head nw', A(t), `color:${q.col}`)).join('')
    + (i === parts.length - 1 ? blk(q.x2 - 60, 32, 60, 16, 'c-micro nw', pad3(no), `text-align:right;font-weight:600;color:${q.col}`) : '')).join('');
}
// the thumb tab: the kit folder's number (00 to 05), n steps down the edge from 88
function ktab(ctx, n, inverted = false) {
  const R = roles(ctx), bg = inverted ? R.ground : R.dark, fg = inverted ? R.ink : R.darkInk;
  return `<div class="a tab" style="left:${G.tabX}px;top:${G.top + n * G.tabPitch}px;width:${G.tabW}px;height:${G.tabH}px;background:${bg};color:${fg}">${n}</div>`;
}
const kpage = (ctx, id, { bg, body, svg = '', over = '' }) => `<section class="pg pg24 kt24" data-page="${id}" style="background:${bg}">${body}<svg class="ov" width="1123" height="794" viewBox="0 0 1123 794" aria-hidden="true">${svg}</svg>${over}</section>`;

// the brand's logo at a width: the slot frame in the slot edition
function logoAt(ctx, w, x, y, cwHex) {
  const R = roles(ctx), g = ctx.logo.geos.colour, h = (w * g.h) / g.w;
  const inner = ctx.edition === 'slot'
    ? `<div class="slot-box c-micro" style="width:${f2(w)}px;height:${f2(h)}px;color:${R.ink}">Logo, ${fx(ctx, w)} wide</div>`
    : `<div class="logo-box">${ctx.logo.svg('colour', { colourway: colourwayFor(ctx, cwHex), width: f2(w) })}</div>`;
  return { h, html: blk(x, y, w, h, '', inner, `color:${R.ink}`) };
}

// ---- what the kit holds, counted from the brand ----
function folders(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', shots = B.imagery.shots, real = shots.filter((s) => s.photo).length, briefs = shots.length - real;
  const faceN = new Set(ctx.faces.map((f) => f.family)).size;
  return [
    ['Read me', 'This read-me, and the brand on one page.', pl(3, 'page')],
    ['Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide on a clear ground.', slot ? 'Slot frame' : pl(ctx.logo.versions.length, 'version')],
    ['Colour', 'The palette for Adobe (ASE), CSS and JSON, and the swatch sheet.', `${pl(ctx.colours.length, 'colour')}, ${pl(ctx.tones.length, 'tone')}`],
    ['Type', 'The type specimen, and fonts.md with each face\'s link and licence.', pl(faceN, 'face')],
    ['Icons', 'One SVG per icon at 24 px, in the brand\'s stroke, with the Lucide licence, and the icon sheet.', pl(iconSet(ctx).length, 'icon')],
    ['Imagery', real ? 'The photography direction and shot list, and the photos.' : 'The photography direction and the shot list.', [real && pl(real, 'photo'), briefs && pl(briefs, 'brief')].filter(Boolean).join(', ')],
  ];
}

// ======================================================================= the read-me
// page 1: the field, the kit's title at scale with its width in x, the six folders as tabs with an index line beside each
function readMe1(ctx) {
  const R = roles(ctx), B = ctx.brand, F = folders(ctx), dw = topW(ctx, 'display'), dfont = displayFont(ctx, dw);
  const lines = [B.name, 'brand kit'];
  const size = [136, 120, 104, 88, 72, 64, 56].find((s) => widest(dfont, lines, s) * 1.02 <= 780 && 2 * Math.round(s * 0.92) <= 300) || 56;
  const wid = Math.ceil(widest(dfont, lines, size) * 1.02), lh = Math.round(size * 0.92), top = 642 - 2 * lh;
  let body = blk(56, 48, 400, 24, 'c-title', 'Read me', `color:${R.fieldInk}`, 'h1')
    + P(56, 76, 440, `${ctx.versionLine}.`, R.fieldInk).html
    + T(56, top, wid + 8, lines, lh, 'kt24-d', `font-size:${size}px;font-weight:${dw};color:${R.fieldInk}`, 'h2')
    + P(56, 676, 440, `Sizes on these sheets are given in x. One x is ${xOf(ctx)} px on screen, the step of the spacing scale.`, R.fieldInk).html;
  F.forEach(([name, , count], i) => {
    const y = G.top + i * G.tabPitch + 9;  // the index line's centre sits on the tab number's
    body += ktab(ctx, i)
      + blk(880, y, 100, 16, 'c-head nw', A(name), `color:${R.fieldInk}`)
      + blk(960, y, 123, 16, 'c-micro nw', A(count), `text-align:right;color:${R.fieldInk}`);
  });
  const svg = dimH(ctx, { x1: 56, x2: 56 + wid, y: top - 24, label: fx(ctx, wid), col: R.fieldInk, qcol: R.fieldQuiet, obj: top })
    + ruler(ctx, { uid: 'kr1', pieces: [{ x1: G.L, x2: G.R, ink: R.fieldInk, quiet: R.fieldQuiet, hair: R.fieldQuiet }], live: [56, 56 + wid] });
  return kpage(ctx, 'read-me-1', { bg: R.field, body, svg });
}

// page 2: the six folders as one register, then how to start in three steps
function readMe2(ctx) {
  const R = roles(ctx), F = folders(ctx), slot = ctx.edition === 'slot', TX = 314, TW = G.R - TX, DX = 458, CW = 150, DW = G.R - CW - 16 - DX;
  let body = kHead(ctx, { label: 'Read me', title: 'What is in the kit', no: 2 })
    + blk(56, 88, 234, 24, 'c-title', 'What is in the kit', `color:${R.ink}`, 'h1')
    + P(56, 120, 226, `${Word(F.length)} parts, numbered as they are in the kit. Each line says what it holds.`, R.quiet).html;
  let y = G.top;
  F.forEach(([name, what, count], i) => {
    const d = P(DX, y + 10, DW, what, R.quiet), h = Math.max(1, d.n) * 20 + 24;
    body += fill(TX, y, TW, 1, i ? R.hair : R.ink)
      + blk(TX, y + 10, 130, 20, 'kt24-n nw', `${String(i).padStart(2, '0')} ${A(name)}`, `color:${R.ink}`)
      + d.html
      + blk(G.R - CW, y + 10, CW, 20, 'kt24-b nw', A(count), `text-align:right;color:${R.ink}`);
    y += h;
  });
  body += fill(TX, y, TW, 1, R.hair);
  const how = [
    ['Start with the logo.', slot ? 'Put the approved logo files in 01 Logo, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. Every face is under the SIL Open Font License, free for commercial use.'],
  ];
  const hy = y + 48, colW = 232;
  body += fill(TX, hy, TW, 1, R.ink) + blk(TX, hy + 8, 300, 16, 'c-head nw', 'How to start', `color:${R.ink}`);
  how.forEach(([a, b], i) => {
    const x = TX + i * 256, ta = P(x, hy + 40, colW, a, R.ink, { wt: 600, cls: 'kt24-n' }), tb = P(x, hy + 40 + ta.h + 4, colW, b, R.quiet);
    body += ta.html + tb.html;
  });
  const svg = ruler(ctx, { uid: 'kr2', live: [TX, G.R] });
  return kpage(ctx, 'read-me-2', { bg: R.ground, body: body + ktab(ctx, 0), svg });
}

// page 3: the brand on one page. The logo is the one big thing, measured; the line, faces and personality beside it; the colours as one measured bar
function readMe3(ctx) {
  const R = roles(ctx), B = ctx.brand, d = B.fonts.display, b = B.fonts.body, dw = topW(ctx, 'display'), dfont = displayFont(ctx, dw);
  const g = ctx.logo.geos.colour, lw = Math.floor(Math.min(560, (176 * g.w) / g.h)), LY = 232;
  const lg = logoAt(ctx, lw, 56, LY, R.ground);
  const lead = P(56, 120, 440, B.description, R.quiet);
  let body = kHead(ctx, { label: 'Read me', title: 'The brand on one page', no: 3 }) + blk(56, 88, 440, 24, 'c-title', 'The brand on one page', `color:${R.ink}`, 'h1') + lead.html + lg.html;
  // right column: the line, the faces, the personality, each group 32 apart. It starts level with the lead; the line takes the largest size that keeps the column clear of the colour bar's dimension line
  const RX = G.col[8], RW = G.R - RX, RY0 = 120, BY = 636, LIM = BY - 52;
  const oth = (B.lines.others || [])[0], traits = (B.personality || []).map((p) => p.trait);
  const othP = oth ? P(RX, 0, RW, oth, R.quiet) : null, trP = traits.length ? P(RX, 0, RW, traits.join(', '), R.ink) : null;
  const colH = (n, ls) => 24 + n * Math.round(ls * 1.05) + (othP ? 8 + othP.h : 0) + 32 + 88 + (trP ? 32 + 24 + trP.h : 0);
  const ls = [56, 48, 40, 36, 32, 28, 24].find((s) => { const n = balanced(dfont, B.lines.primary, s, RW * 0.98).length; return n <= 3 && RY0 + colH(n, s) <= LIM; }) || 24, ll = balanced(dfont, B.lines.primary, ls, RW * 0.98), lH = Math.round(ls * 1.05);
  let y = RY0;
  body += blk(RX, y, RW, 16, 'c-micro nw', 'The line', `color:${R.quiet}`);
  body += T(RX, y + 24, RW, ll, lH, 'kt24-d', `font-size:${ls}px;font-weight:${dw};color:${R.ink}`);
  y += 24 + ll.length * lH;
  if (oth) { const o = P(RX, y + 8, RW, oth, R.quiet); body += o.html; y += 8 + o.h; }
  y += 32;
  body += blk(RX, y, RW, 16, 'c-micro nw', 'Faces', `color:${R.quiet}`)
    + blk(RX, y + 24, RW, 32, 'kt24-d nw', A(d.family), `font-size:28px;line-height:32px;font-weight:${dw};color:${R.ink}`)
    + blk(RX, y + 60, RW, 28, 'nw', A(b.family), `font-family:var(--body);font-size:22px;line-height:28px;font-weight:${nearW(b.weights, 400)};color:${R.ink}`);
  y += 88 + 32;
  if (traits.length) {
    const t = P(RX, y + 24, RW, traits.join(', '), R.ink, { size: 13, lh: 20 });
    body += blk(RX, y, RW, 16, 'c-micro nw', 'Personality', `color:${R.quiet}`) + t.html;
  }
  // the colours as one bar of 252x, each field as wide as its share allows, each wide enough for its name and value
  const cs = ctx.colours, BH = 78, mono = fontOf(ctx, 'mono', 400);
  const needs = cs.map((c) => Math.max(adv(C6(), c.name, 12), adv(mono, c.hex, 12)) + 24);
  const ws = fieldWidths(cs.map((c) => c.share || 0.1), needs, G.W); ws[ws.length - 1] = G.W - ws.slice(0, -1).reduce((a, v) => a + v, 0);
  let x = G.L;
  cs.forEach((c, i) => {
    const ink = R.inkOn(c.hex), shown = c.share ? `${Math.round(c.share * 100)}%` : '';
    body += `<div class="a" style="left:${x}px;top:${BY}px;width:${ws[i]}px;height:${BH}px;background:${c.hex};${edge(R, c.hex)}">`
      + blk(12, 8, ws[i] - 12, 16, 'c-head nw', A(c.name), `color:${ink}`) + blk(12, 24, ws[i] - 12, 16, 'val nw', A(c.hex), `color:${ink}`) + blk(12, 44, ws[i] - 12, 16, 'c-micro nw', A(shown), `color:${ink}`) + '</div>';
    x += ws[i];
  });
  const svg = dimV(ctx, { x: 40, y1: LY, y2: LY + lg.h, label: fx(ctx, lg.h), col: R.ink, qcol: R.quiet, labelAt: 34 })
    + dimH(ctx, { x1: 56, x2: 56 + lw, y: LY - 24, label: fx(ctx, lw), col: R.ink, qcol: R.quiet, obj: LY })
    + dimH(ctx, { x1: G.L, x2: G.R, y: BY - 16, label: fx(ctx, G.W), col: R.ink, qcol: R.quiet, obj: BY })
    + ruler(ctx, { uid: 'kr3', live: [56, 56 + lw] });
  return kpage(ctx, 'read-me-3', { bg: R.ground, body: body + ktab(ctx, 0), svg });
}

export function readMe(ctx) { return [readMe1(ctx), readMe2(ctx), readMe3(ctx)]; }

// ======================================================================= sheets
// palette: fields across the top at the shares the colours take (never narrower than their name and hex), the head over the ground field,
// then the register of every value and the tones that ride along in the palette files
function paletteSheet(ctx) {
  const R = roles(ctx), B = ctx.brand, all = ctx.colours, gi = all.findIndex((c) => same(c.hex, R.ground));
  const cs = [...(gi >= 0 ? [all[gi]] : []), ...all.filter((_, i) => i !== gi).sort((a, b) => (b.share || 0) - (a.share || 0))];
  const has = cs.every((c) => c.share > 0), sum = cs.reduce((a, c) => a + (c.share || 0), 0) || 1, shr = (c) => (has ? c.share / sum : 1 / cs.length);
  const mono = fontOf(ctx, 'mono', 400), FH = 300, W = 1123;
  const needs = cs.map((c) => Math.max(adv(C6(), c.name, 12), adv(mono, c.hex, 12)) + 24);
  const ws = fieldWidths(cs.map(shr), needs, W); ws[0] += W - ws.reduce((a, v) => a + v, 0);
  let x = 0, body = '';
  cs.forEach((c, i) => {
    const ink = R.inkOn(c.hex), q = R.quietOn(c.hex), px = i === 0 ? G.L : x + 12;
    body += `<div class="a" style="left:${x}px;top:0;width:${ws[i]}px;height:${FH}px;background:${c.hex};${i ? edge(R, c.hex).replace('inset 0 0 0 1px', 'inset 1px 0 0 0') : ''}"></div>`
      + blk(px, 88, ws[i] - (px - x) - 8, 16, 'c-head nw', A(c.name), `color:${ink}`)
      + (c.role ? blk(px, 104, ws[i] - (px - x) - 8, 16, 'c-micro nw', A(cap1(c.role)), `color:${q}`) : '')
      + blk(px, 128, ws[i] - (px - x) - 8, 16, 'val nw', A(c.hex), `color:${ink}`);
    x += ws[i];
  });
  const lastOnDark = ratio(R.dark, cs[cs.length - 1].hex) < 3;
  // the register
  const hasK = cs.some((c) => c.cmyk), kOf = (c) => (c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join(' ') : '');
  const vals = [['Share', (c) => `${Math.round(shr(c) * 100)}%`, false], ['HEX', (c) => c.hex, true], ['RGB', (c) => c.rgb, true], ['OKLCH', (c) => c.oklch, true], ...(hasK ? [['CMYK', kOf, true]] : [])];
  const vw = vals.map(([hd, f, m]) => Math.ceil(Math.max(adv(C4(), hd, 12), ...cs.map((c) => adv(m ? mono : C4(), f(c), 12)))));
  const TX = 372, NX = TX + 24, VX0 = TX + 168, GAP = 24;
  let vx = VX0; const vxs = vw.map((w) => { const at = vx; vx += w + GAP; return at; });
  const tones = (ctx.tones || []).slice(0, 5), n = cs.length + tones.length;
  const HY = 340, rh = Math.max(24, Math.min(28, Math.floor((714 - HY - 24 - 48 - 24) / Math.max(1, n))));
  body += blk(56, HY, 280, 24, 'c-title', 'Palette', `color:${R.ink}`, 'h1')
    + P(56, HY + 32, 234, `${Word(cs.length)} colours, each drawn at the share of a page it takes. The values below are what the palette files hold.`, R.quiet).html;
  vals.forEach(([hd], i) => { body += blk(vxs[i], HY, vw[i], 16, 'c-micro nw', hd, `color:${R.quiet};${i === 0 ? '' : ''}`); });
  body += blk(NX, HY, 120, 16, 'c-micro nw', 'Colour', `color:${R.quiet}`);
  let y = HY + 24;
  cs.forEach((c, i) => {
    body += fill(TX, y, G.R - TX, 1, i ? R.hair : R.ink) + fill(TX, y + (rh - 12) / 2, 12, 12, c.hex, edge(R, c.hex) || `box-shadow:inset 0 0 0 1px ${R.hair}`)
      + blk(NX, y + (rh - 20) / 2, 130, 20, 'kt24-n nw', A(c.name), `color:${R.ink}`);
    vals.forEach(([, f, m], k) => { body += blk(vxs[k], y + (rh - 20) / 2, vw[k] + 8, 20, `nw ${m ? 'val' : 'kt24-b'}`, A(f(c)), `color:${R.ink};line-height:20px`); });
    y += rh;
  });
  body += fill(TX, y, G.R - TX, 1, R.hair);
  if (tones.length) {
    y += 24;
    body += blk(TX, y, 300, 16, 'c-head nw', 'Tones in the palette files', `color:${R.ink}`);
    y += 24;
    const LX = vxs[Math.min(2, vxs.length - 1)], LW = G.R - LX;
    tones.forEach((t, i) => {
      body += fill(TX, y, G.R - TX, 1, i ? R.hair : R.ink) + fill(TX, y + (rh - 12) / 2, 12, 12, t.hex, edge(R, t.hex) || `box-shadow:inset 0 0 0 1px ${R.hair}`)
        + blk(NX, y + (rh - 20) / 2, 130, 20, 'kt24-n nw', A(t.name), `color:${R.ink}`)
        + blk(vxs[1], y + (rh - 20) / 2, vw[1] + 8, 20, 'val nw', A(t.hex), `color:${R.ink};line-height:20px`)
        + (t.lands && LW > 100 ? P(LX, y + (rh - 16) / 2, LW, t.lands, R.quiet, { size: 12, lh: 16, cls: 'c-micro' }).html : '');
      y += rh;
    });
    body += fill(TX, y, G.R - TX, 1, R.hair);
  }
  const head = kHead(ctx, { label: '2 Colour', title: 'Palette', no: 1, parts: [{ x1: G.L, x2: ws[0] - 24, col: R.inkOn(cs[0].hex), slots: [[G.L, `${B.name} brand kit`], [G.col[2], '2 Colour'], [G.col[4], 'Palette']] }] });
  const svg = ruler(ctx, { uid: 'kpal', live: [G.L, ws[0]], endAnchor: true });
  return kpage(ctx, 'palette', { bg: R.ground, body: head + body + ktab(ctx, 2, lastOnDark), svg });
}

// typefaces: the sample headline at scale on the dark band, with its width in x; below it each face named in itself
function typeSheet(ctx) {
  const R = roles(ctx), B = ctx.brand, f = B.fonts, T0 = B.type.sample, dw = topW(ctx, 'display'), dfont = displayFont(ctx, dw), BAND = 464;
  const d = ctx.brand.fonts.display, mono = fontOf(ctx, 'mono', 400);
  const lead = `Two faces do the work: ${f.display.family} for the line you read first, ${f.body.family} for everything after it.${f.mono ? ` A third, ${f.mono.family}, sets values.` : ''}`;
  const ld = P(56, 120, 440, lead, R.darkQuiet);
  const HT = 208, MAXH = 192, MAXW = 960;
  const size = [96, 88, 80, 72, 64, 56, 48].find((s) => { const l = balanced(dfont, T0.headline, s, MAXW * 0.98); return l.length * Math.round(s * 1.04) <= MAXH && widest(dfont, l, s) * 1.02 <= MAXW; }) || 48;
  const hl = balanced(dfont, T0.headline, size, MAXW * 0.98), hlh = Math.round(size * 1.04), hw = Math.max(ctx.edition === 'slot' ? 420 : 0, Math.ceil(widest(dfont, hl, size) * 1.02));   // slot: wide enough for the compact placeholder
  let body = fill(0, 0, 1123, BAND, R.dark)
    + kHead(ctx, { label: '3 Type', title: 'Typefaces', no: 1, parts: [{ x1: G.L, x2: G.R, col: R.darkInk, slots: [[G.col[0], `${B.name} brand kit`], [G.col[3], '3 Type'], [G.col[6], 'Typefaces']] }] })
    + blk(56, 88, 400, 24, 'c-title', 'Typefaces', `color:${R.darkInk}`, 'h1') + ld.html
    + T(56, HT, hw + 8, hl, hlh, 'kt24-d', `font-size:${size}px;font-weight:${dw};color:${R.darkInk}`, 'h2');
  // the three faces
  const blocks = [
    ['Display', 'display', f.display, 'kt24-d', `font-weight:${dw};`, dfont],
    ['Body', 'body', f.body, 'kt24-bd', `font-weight:${nearW(f.body.weights, 400)};`, fontOf(ctx, 'body', nearW(f.body.weights, 400))],
    ...(f.mono ? [['Mono', 'mono', f.mono, 'kt24-mo', 'font-weight:400;', mono]] : []),
  ];
  blocks.forEach(([role, key, fam, cls, wst, font], i) => {
    const x = G.col[i * 4], BW = span4;
    const ns = [28, 24, 20, 18].find((s) => adv(font, fam.family, s) * 1.02 <= BW) || 18;
    body += blk(x, 496, BW, 16, 'c-micro nw', role, `color:${R.quiet}`)
      + blk(x, 520, BW, 36, `${cls} nw`, A(fam.family), `font-size:${ns}px;line-height:36px;${wst}color:${R.ink}`);
    // weights as words, each in its own weight
    const ws = key === 'mono' ? [400] : fam.weights;
    const fs = [20, 18, 16, 14].find((s) => ws.reduce((a, w) => a + adv(fontOf(ctx, key, w), WN[w] || String(w), s) * 1.02 + 16, -16) <= BW) || 14;
    body += blk(x, 568, BW, 28, 'nw', ws.map((w) => `<span style="font-weight:${w};margin-right:16px">${A(WN[w] || String(w))}</span>`).join(''), `font-family:var(--${key === 'display' ? 'display' : key === 'body' ? 'body' : 'mono'});font-size:${fs}px;line-height:28px;color:${R.ink}`);
    const cap = key === 'mono' ? 'For a hex, a token or a code string only. SIL Open Font License 1.1.' : `${fam.stretch ? `Width ${fam.stretch}. ` : ''}SIL Open Font License 1.1. Free for commercial use.`;
    body += P(x, 612, BW, cap, R.quiet, { size: 12, lh: 16, cls: 'c-micro' }).html;
  });
  const svg = dimH(ctx, { x1: 56, x2: 56 + hw, y: HT + hl.length * hlh + 20, label: fx(ctx, hw), col: R.darkInk, qcol: R.darkQuiet, obj: HT + hl.length * hlh })
    + ruler(ctx, { uid: 'kty', live: [56, 56 + hw] });
  return kpage(ctx, 'typefaces', { bg: R.ground, body: body + ktab(ctx, 3, true), svg });
}
const span4 = 320;

// ---- photographs ----
// The app's brands carry no photograph files (a shot has a slot, never a photo), so no photograph is measured here; a shot that did name one is refused rather than guessed.
function jpegSize() { throw new Error('theme 24: photograph files are not read by the server export'); }
// a photograph cropped to the shot's safe box, filling a w x h box, with nothing laid over it
function photoAt(ctx, s, x, y, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  const f = s.crop ? null : cropOf(s, w, h);     // a shot with subject boxes is framed round its riders (photo-focus.js), a cropped one by its own crop
  if (f) { const k = Math.max(w / n.w, h / n.h); return blk(x, y, w, h, '', `<img src="${A(ctx.photoUrl(s.photo))}" alt="${A(s.alt)}" style="position:absolute;display:block;max-width:none;width:${f2(n.w * k)}px;height:${f2(n.h * k)}px;left:${f2(-f.left * n.w * k)}px;top:${f2(-f.top * n.h * k)}px">`, 'overflow:hidden'); }
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) / 2, oy = (h - c.h * k) / 2;
  return blk(x, y, w, h, '', `<img src="${A(ctx.photoUrl(s.photo))}" alt="${A(s.alt)}" style="position:absolute;display:block;max-width:none;width:${f2(n.w * k)}px;height:${f2(n.h * k)}px;left:${f2(ox - c.x * k)}px;top:${f2(oy - c.y * k)}px">`, 'overflow:hidden');
}
// a real photographer's credit prints; a generated photo has none to give
const credit = (s) => (s.generated || !s.credit ? '' : ` Photo: ${s.credit}.`);
const shotName = (ctx, s) => s.caption || ctx.cap(s.id);
const aspectOf = (ctx, s) => { const c = s.crop || jpegSize(); return c.w / c.h; };
// a shot with no photo yet: its name and its brief, set in the brand's body face on the dark field (the page's own ink on it, 4.5:1 or more)
function briefAt(ctx, s, x, y, w, h, pad, big) {
  const R = roles(ctx), bw = nearW(ctx.brand.fonts.body.weights, 400), font = fontOf(ctx, 'body', bw), tw = w - 2 * pad;
  // the big panel is the page's one picture: its brief is set large and named above; the small frames carry the name in the caption beneath, so it is not printed twice
  const sets = (big ? [[40, 48], [32, 40], [26, 34], [22, 30], [18, 26]] : []).concat([[15, 22], [13, 20]]);
  const top = big ? 28 : 0, room = h - 2 * pad - top;
  const [sz, lh] = sets.find(([a, b]) => wrap(font, s.slot, a, tw * 0.98).length * b <= (big ? Math.min(room, 360) : room)) || sets[sets.length - 1];
  const arr = wrap(font, s.slot, sz, tw * 0.98);
  return blk(x, y, w, h, '', (big ? blk(pad, pad, tw, 16, 'c-head nw', A(shotName(ctx, s)), `color:${R.darkInk}`) : '') + T(pad, pad + top, tw, arr, lh, 'kt24-bd', `font-size:${sz}px;font-weight:${bw};color:${R.darkInk}`), `background:${R.dark}`);
}

function photoSheets(ctx) {
  const R = roles(ctx), B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, out = [];
  // page 1: the direction on the ground, one photograph (or brief) bleeding off the right edge; the ruler runs underneath it
  const PX = 560, PW = 1123 - PX, PA = PW / 794;
  const photos = shots.filter((s) => s.photo).sort((a, b) => Math.abs(Math.log(aspectOf(ctx, a) / PA)) - Math.abs(Math.log(aspectOf(ctx, b) / PA)));
  const lead = photos[0] || shots[0];
  const pic = lead.photo ? photoAt(ctx, lead, PX, 0, PW, 794) : briefAt(ctx, lead, PX, 0, PW, 794, 48, true);
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  const capText = lead.photo ? `The photo: ${shotName(ctx, lead)}.${credit(lead)}` : `The panel: ${shotName(ctx, lead)}, a brief still to shoot. The shot list carries the other briefs.`;
  const TXW = 358, TXX = 142, capP = P(56, 0, 444, capText, R.quiet, { size: 12, lh: 16, cls: 'c-micro' }), capY = 714 - capP.h, RY = 152, room = capY - 32 - RY;
  const set = [[13, 20, 'kt24-b'], [12, 16, 'c-micro']].find(([s, l]) => rows.reduce((a, [, v]) => a + wrap(C4(), v, s, TXW * 0.98).length * l + 24, 0) <= room) || [12, 16, 'c-micro'];
  let body = kHead(ctx, { label: '5 Imagery', title: 'Photography direction', no: 1, parts: [{ x1: G.L, x2: PX - 24, col: R.ink, slots: [[G.L, `${B.name} brand kit`], [G.col[2], '5 Imagery'], [330, 'Photography direction']] }] })
    + blk(56, 88, 440, 24, 'c-title', 'Photography direction', `color:${R.ink}`, 'h1');
  let y = RY;
  rows.forEach(([k, v], i) => {
    const t = P(TXX, y + 10, TXW, v, R.ink, { size: set[0], lh: set[1], cls: set[2] }), h = t.n * set[1] + 24;
    body += fill(56, y, 444, 1, i ? R.hair : R.ink) + blk(56, y + 12, 80, 16, 'c-head nw', k, `color:${R.ink}`) + t.html;
    y += h;
  });
  body += fill(56, y, 444, 1, R.hair) + P(56, capY, 444, capText, R.quiet, { size: 12, lh: 16, cls: 'c-micro' }).html;
  out.push(kpage(ctx, 'photography-1', { bg: R.ground, body, svg: ruler(ctx, { uid: 'kph1', pieces: [{ x1: G.L, x2: PX - 12, ink: R.ink, quiet: R.quiet, hair: R.hair }], live: [56, 500], edgeAnchor: true }), over: pic + ktab(ctx, 5, true) }));
  // the shot list: three across, two rows, six to a page; each picture framed by four crop ticks outside it, its name and source beneath
  const FW = 320, FH = 180, GAPX = 24;
  // a brief shown as page 1's panel is not printed again here
  const listed = lead.photo ? shots : shots.filter((s) => s !== lead);
  for (let p = 0; p * 6 < listed.length; p++) {
    const chunk = listed.slice(p * 6, p * 6 + 6), no = 2 + p;
    let q = kHead(ctx, { label: '5 Imagery', title: p ? 'Shot list, continued' : 'Shot list', no }) + blk(56, 88, 440, 24, 'c-title', p ? 'Shot list, continued' : 'Shot list', `color:${R.ink}`, 'h1');
    // one line says it for the page, so the frames beneath do not each repeat it
    if (chunk.some((s) => !s.photo)) q += blk(56, 124, 440, 16, 'c-micro', chunk.every((s) => !s.photo) ? 'Every frame here is a brief: the shot is still to be taken.' : 'A frame with no photo is a brief: the shot is still to be taken.', `color:${R.quiet}`);
    let ticks = '';
    chunk.forEach((s, i) => {
      const x = G.L + (i % 3) * (FW + GAPX), y0 = 168 + Math.floor(i / 3) * 272;
      q += s.photo ? photoAt(ctx, s, x, y0, FW, FH) : briefAt(ctx, s, x, y0, FW, FH, 20, false);
      ticks += cropTicks(x, y0, FW, FH, R.ink);
      const sub = s.photo ? `${s.alt}.${credit(s)}` : '';
      const a = P(x, y0 + FH + 14, FW, shotName(ctx, s), R.ink, { wt: 600, cls: 'kt24-n' }), b = sub ? P(x, y0 + FH + 14 + a.h, FW, sub, R.quiet, { size: 12, lh: 16, cls: 'c-micro' }) : { html: '' };
      q += a.html + b.html;
    });
    out.push(kpage(ctx, `photography-${no}`, { bg: R.ground, body: q + ktab(ctx, 5), svg: ticks + ruler(ctx, { uid: `kph${no}`, live: [G.L, G.R], edgeAnchor: true }) }));
  }
  return out;
}

// icons: one icon drawn on the unit grid beside the grid of the set, then the rest of the set across the full width
function iconPages(ctx) {
  const R = roles(ctx), B = ctx.brand, set = iconSet(ctx), s = ctx.iconStyle, n = set.length, x1 = xOf(ctx), mono = fontOf(ctx, 'mono', 400);
  const hero = set.find((v) => !ICON_SET.includes(v)) || set[0], SZ = 288, FWD = 560, HX = 136, HY = 252, k = SZ / 24;
  const joinWord = { miter: 'mitred', round: 'round', bevel: 'bevelled' }[s.join] || s.join;
  const intro = `${n} icons from Lucide, drawn in the ${B.name} stroke: ${s.stroke} px lines at 24 px, ${s.cap} ends and ${joinWord} corners.`;
  const nameW = (name) => adv(mono, name, 12) * 1.02;
  const widestName = Math.max(...set.map(nameW));
  const GX = 572, GW = G.R - GX, cols = [4, 3, 2].find((c) => widestName <= GW / c - 12) || 2, cw = GW / cols, RH = 88;
  const ld = P(GX, 120, 380, intro, R.quiet);
  const gTop = 232, foot = 'Each icon is one SVG file in 04 Icons. It takes the colour of the text beside it (currentColor), so it never needs a colour of its own. The ISC licence is in LICENSE.txt.';
  const fp0 = P(GX, 0, GW, foot, R.quiet, { size: 12, lh: 16, cls: 'c-micro' }), footY = 714 - fp0.h, fp = P(GX, footY, GW, foot, R.quiet, { size: 12, lh: 16, cls: 'c-micro' });
  const rowsFit = Math.max(1, Math.floor((footY - 24 - gTop) / RH)), first = set.slice(0, rowsFit * cols);
  const cell = (name, x, y, w) => `<div class="a" style="left:${f2(x)}px;top:${y}px;width:${f2(w)}px;height:${RH}px;color:${R.ink}"><span class="kt24-ic">${icon(ctx, name, 24)}</span>${blk(0, 56, w - 8, 16, 'val nw', A(name), `color:${R.ink}`)}</div>`;
  const grid = (list, c0, cw0, top, x0) => list.map((name, i) => fill(x0 + (i % c0) * cw0, top + Math.floor(i / c0) * RH, cw0 - 12, 1, R.hair) + cell(name, x0 + (i % c0) * cw0, top + Math.floor(i / c0) * RH, cw0 - 12)).join('');
  // the grid cells: the icon square is one x of the unit grid when 24 px is a whole number of x
  const cells = 24 % x1 === 0 ? 24 / x1 : 0, step = cells ? SZ / cells : 0;
  let gridSvg = '';
  for (let i = 1; i < cells; i++) gridSvg += `<path d="M${f2(HX + i * step + 0.5)} ${HY}v${SZ}M${HX} ${f2(HY + i * step + 0.5)}h${SZ}" stroke="${R.fieldQuiet}" stroke-width="1" fill="none"/>`;
  const heroSvg = `<rect x="${HX + 0.5}" y="${HY + 0.5}" width="${SZ - 1}" height="${SZ - 1}" fill="none" stroke="${R.fieldInk}" stroke-width="1"/>` + gridSvg + `<g style="color:${R.fieldInk}" transform="translate(${HX} ${HY})">${icon(ctx, hero, SZ)}</g>`;
  const heroCap = P(HX, 582, SZ, `Drawn at ${SZ} px. ${cells ? `Each square is one x, ${x1} px at actual size.` : ''}`, R.fieldInk, { size: 12, lh: 16, cls: 'c-micro' });
  let body = fill(0, 0, FWD, 794, R.field)
    + kHead(ctx, { title: 'Icon set', no: 1, parts: [{ x1: G.L, x2: 504, col: R.fieldInk, slots: [[G.L, `${B.name} brand kit`], [G.col[2], '4 Icons']] }, { x1: 572, x2: G.R, col: R.ink, slots: [[572, 'Icon set']] }] })
    + blk(HX, 558, SZ, 16, 'c-micro nw', `<span class="val">${A(hero)}</span>`, `color:${R.fieldInk}`) + heroCap.html
    + blk(GX, 88, GW, 24, 'c-title', 'Icon set', `color:${R.ink}`, 'h1') + ld.html + grid(first, cols, cw, gTop, GX) + fill(GX, gTop + Math.ceil(first.length / cols) * RH, GW - 12, 1, R.hair)
    + fp.html;
  const svg = cropTicks(HX, HY, SZ, SZ, R.fieldInk) + heroSvg
    + dimH(ctx, { x1: HX, x2: HX + SZ, y: HY - 28, label: fx(ctx, SZ), col: R.fieldInk, qcol: R.fieldQuiet, obj: HY })
    + dimV(ctx, { x: HX - 28, y1: HY, y2: HY + SZ, label: fx(ctx, SZ), col: R.fieldInk, qcol: R.fieldQuiet, obj: HY + 0, labelAt: HX - 34 })
    + ruler(ctx, { uid: 'kic1', pieces: [{ x1: G.L, x2: FWD - 12, ink: R.fieldInk, quiet: R.fieldQuiet, hair: R.fieldQuiet }, { x1: 572, x2: G.R, ink: R.ink, quiet: R.quiet, hair: R.hair }], live: [HX, HX + SZ] });
  const pages = [kpage(ctx, 'icons-1', { bg: R.ground, body: body + ktab(ctx, 4), svg })];
  // the rest of the set: eight across the full width (fewer if the longest name needs the room)
  const rest = set.slice(first.length), wide = [8, 6, 4].find((c) => widestName <= G.W / c - 12) || 4, ww = G.W / wide, perPage = wide * Math.floor((714 - 112) / RH);
  for (let p = 0; p * perPage < rest.length; p++) {
    const chunk = rest.slice(p * perPage, (p + 1) * perPage), no = 2 + p;
    const q = kHead(ctx, { label: '4 Icons', title: 'Icon set, continued', no }) + blk(56, 88, 440, 24, 'c-title', 'Icon set, continued', `color:${R.ink}`, 'h1')
      + grid(chunk, wide, ww, 152, G.L) + fill(G.L, 152 + Math.ceil(chunk.length / wide) * RH, G.W - 12, 1, R.hair) + ktab(ctx, 4);
    pages.push(kpage(ctx, `icons-${no}`, { bg: R.ground, body: q, svg: ruler(ctx, { uid: `kic${no}`, live: [G.L, G.R], edgeAnchor: true }) }));
  }
  return pages;
}

export function sheets(ctx) {
  return { palette: [paletteSheet(ctx)], typefaces: [typeSheet(ctx)], photography: photoSheets(ctx), icons: iconPages(ctx) };
}

export function css(ctx) {
  const d = ctx.brand.fonts.display;
  return `
.pg.kt24 .kt24-ln{display:block;white-space:nowrap}
.pg.kt24 .kt24-b{font-size:13px;line-height:20px;font-weight:400}
.pg.kt24 .kt24-n{font-size:13px;line-height:20px;font-weight:600}
.pg.kt24 .kt24-d{font-family:var(--display);font-stretch:${d.stretch || 100}%;letter-spacing:0}
.pg.kt24 .kt24-bd{font-family:var(--body)}
.pg.kt24 .kt24-mo{font-family:var(--mono)}
.pg.kt24 .kt24-ic{position:absolute;left:0;top:20px;display:block;width:24px;height:24px}
.pg.kt24 .kt24-ic svg{display:block}
`;
}
