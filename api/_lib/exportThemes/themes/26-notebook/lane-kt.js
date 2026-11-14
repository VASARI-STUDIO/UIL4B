// Theme 26, Notebook, lane kt: the brand kit PDFs (read-me, palette, typefaces, photography, icons), each a few open spreads of the same dot-grid
// notebook as the guidelines. Every document has its own running head (the kit's name on the verso, the folder and page on the recto) and its own
// folios, numbered from 001 within the document. Coordinates are leaf-local (see helpers.js); every edge lands on a dot, every baseline on a dot row.
// What is stuck in is the brand's own: its photographs on tape pieces, cards cut from its grounds, its colours as lengths of tape (stood up on the
// read-me, laid across on the palette sheet), its icons on paper.
// The kit documents are not wired for scene mockups, so nothing here calls ctx.mockup.
import { icon, iconSet, ICON_SET } from '../../engine/components.js';
import {
  A, U, row, px, nb, tokens, brandRoles, readable, nearPaper, block, rightText, advance, wrap, capRatio, fitLines, dotsSvg, foldSvg,
  tab, numberWord, weightName, sceneImg, printHtml, creditOnce,
} from './helpers.js';

const ceilU = (v) => Math.ceil((v - 1e-6) / U) * U;
const nearRow = (y) => row(Math.round((y - 17) / U));
const pad3 = (n) => String(n).padStart(3, '0');
const tapePiece = (x, y) => `<div class="tape piece" style="left:${px(x - U)};top:${px(y - U / 2)};width:${5 * U}px;height:${U}px"></div>`;

// the brand's display face at the largest listed size that sets the text in maxLines across w
function hero(T, text, w, sizes, maxLines) {
  const f = fitLines(T._displayStem, text, w, sizes, maxLines, -0.02);
  return { ...f, tk: { stem: T._displayStem, size: f.size, lh: f.lh, track: -0.02 }, cap: capRatio(T._displayStem) * f.size };
}
const heroBlock = (h, o) => block(h.tk, { ...o, lines: h.lines, cls: 'b-hero', style: `font-size:${h.size}px;line-height:${h.lh}px;` });
const heroBase = (h, top) => row(Math.round((top + h.cap - 17) / U));

// whole units for a run of shares: each at least `floor`, the whole run `total`, what is left over (or short) taken from the largest
function unitsFor(shares, total, floor) {
  const u = shares.map((s) => Math.max(floor, Math.round(s * total)));
  const big = shares.indexOf(Math.max(...shares));
  let diff = total - u.reduce((a, b) => a + b, 0);
  u[big] += diff;
  if (u[big] < floor) throw new Error('kit: shares do not fit the run');
  return u;
}

// ---- the spread of a kit document ----
// doc: { id, folder }. o: verso / recto markup (leaf-local), title (the page's), clear (dot clear zones), headInk / folioInk (the colour of the
// recto's running head and folio when a field sits under them), versoHeadText (default: the kit's name).
function kspread(ctx, doc, n, o) {
  const T = tokens(ctx), B = ctx.brand, id = `kt-${doc.id}-${n}`;
  const fv = pad3(2 * n - 1), fr = pad3(2 * n);
  const rt = o.headText || (doc.folder ? `${doc.folder}, ${o.title}` : o.title);
  let vc = (o.verso || '') + block(T['c-head'], { x: 42, w: 300, baseline: 36, lines: [`${B.name} brand kit`], cls: 'c-head' }).html
    + block(T['c-mono'], { x: 23, w: 60, baseline: 777, lines: [fv], cls: 'c-mono' }).html;
  let rc = (o.recto || '');
  const ink = o.headInk, fink = o.folioInk;
  rc += rightText(T['c-head'], { x: 517, text: rt, baseline: 36, cls: 'c-head', color: ink, knock: !ink }).html;
  rc += rightText(T['c-mono'], { x: 536, text: fr, baseline: 777, cls: 'c-mono', color: fink, knock: !fink }).html;
  const clear = o.clear || [];
  const dv = dotsSvg(ctx, id, { recto: false, clear: clear.filter((c) => !c.recto) });
  const dr = dotsSvg(ctx, id, { recto: true, clear: clear.filter((c) => c.recto) });
  return `<section class="pg" data-page="${id}">${dv}${dr}<div class="leaf v">${vc}</div><div class="leaf r">${rc}</div>${foldSvg(ctx, { thread: true })}</section>`;
}

const familyCount = (ctx) => new Set(['display', 'body', 'mono'].map((r) => ctx.brand.fonts[r] && ctx.brand.fonts[r].family).filter(Boolean)).size;

// ---- the read-me ----------------------------------------------------------------------------------------------------------------

function readMe1(ctx) {
  const T = tokens(ctx), B = ctx.brand, slot = ctx.edition === 'slot', doc = { id: 'readme', folder: '' };
  const real = B.imagery.shots.filter((s) => s.photo).length, briefs = B.imagery.shots.length - real;
  // verso: the kit's name at display scale (the one big thing), the version, and how to use the kit
  const h = hero(T, `${B.name} brand kit`, 475, [[76, 76], [64, 76], [57, 57], [48, 57], [38, 38]], 3);
  const hb = heroBase(h, 74), hl = hb + (h.lines.length - 1) * h.lh;
  let vc = heroBlock(h, { x: 42, w: 475, baseline: hb }).html;
  vc += block(T['c-head'], { x: 42, w: 475, baseline: hl + 57, lines: [ctx.versionLine], cls: 'c-head' }).html;
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. Every face is under the SIL Open Font License, free for commercial use.'],
  ];
  let y = hl + 57 + 95;
  how.forEach(([a, b]) => {
    const bl = wrap(T['b-body'].stem, 13, b, 380);
    vc += block(T['b-name'], { x: 42, w: 380, baseline: y, lines: [a], cls: 'b-name' }).html + block(T['b-body'], { x: 42, w: 380, baseline: y + U, lines: bl, cls: 'b-body' }).html;
    y += U * (bl.length + 1) + U;
  });
  if (y - U > 739 + U) throw new Error(`read-me: the steps run to ${y}`);

  // recto: the five folders, each a tab of tape with what is in it and a count taken from the brand
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide on a clear ground.', slot ? 'Slot frame' : `${ctx.logo.versions.length} versions`],
    ['02 Colour', 'The palette for Adobe (ASE), CSS and JSON, and the swatch sheet.', `${ctx.colours.length} colours, ${ctx.tones.length} tones`],
    ['03 Type', 'The type specimen, and fonts.md with each face\'s link and licence.', `${familyCount(ctx)} faces`],
    ['04 Icons', 'One SVG per icon at 24 px, in the brand\'s stroke, with the Lucide licence, and the icon sheet.', `${iconSet(ctx).length} icons`],
    ['05 Imagery', real ? 'The photography direction and shot list, and the photos.' : 'The photography direction and the shot list.', [real && `${real} photos`, briefs && `${briefs} briefs`].filter(Boolean).join(', ')],
  ];
  let rc = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: ['What is in the kit'], cls: 'b-title' }).html;
  let ry = 131;
  for (const [name, what, count] of folders) {
    const dl = wrap(T['b-body'].stem, 13, what, 300);
    rc += tab(T, { x: 42, y: ry + U / 2, label: name });
    rc += block(T['b-body'], { x: 175, w: 300, baseline: ry + U, lines: dl, cls: 'b-body' }).html;
    rc += block(T['c-mono'], { x: 42, w: 100, baseline: ry + 38, lines: [count], cls: 'c-mono' }).html;
    ry += U * Math.max(dl.length, 2) + U;
  }
  if (ry - U > 739 + U) throw new Error(`read-me: the folders run to ${ry}`);
  return kspread(ctx, doc, 1, { verso: vc, recto: rc, title: 'Read me', headText: 'Read me' });
}

function readMe2(ctx) {
  const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), N = nb(ctx), lg = ctx.logo, geo = lg.geos.colour, f = B.fonts, doc = { id: 'readme', folder: '' };
  // verso: the logo with its clear space as missing dots, the brand's line at display scale, the personality in three words
  const lx = 42, lbot = row(10), lw = 285, lh = lw * geo.h / geo.w, share = lg.geo.unit / geo.h, pad = share * lh;
  const x0 = 23 + U * Math.floor((lx - pad - 23) / U), x1 = 23 + U * Math.ceil((lx + lw + pad - 23) / U);
  const y0 = 17 + U * Math.floor((lbot - lh - pad - 17) / U), y1 = 17 + U * Math.ceil((lbot + pad - 17) / U);
  let vc = `<div style="left:${lx}px;top:${px(lbot - lh)};width:${lw}px;z-index:1">${lg.html('colour', { width: lw, color: N.text, label: 'Your logo goes here' })}</div>`;
  const hh = hero(T, B.lines.primary, 475, [[48, 57], [38, 38], [32, 38], [26, 38]], 3);
  const top = Math.max(y1 + 38, 322), hb = heroBase(hh, top), hl = hb + (hh.lines.length - 1) * hh.lh;
  vc += heroBlock(hh, { x: 42, w: 475, baseline: hb }).html;
  let oy = hl + 57;
  for (const l of B.lines.others) {
    const ol = wrap(T['b-name'].stem, 13, l, 380);
    vc += block(T['b-name'], { x: 42, w: 380, baseline: oy, lines: ol, cls: 'b-name' }).html; oy += U * ol.length;
  }
  if ((B.personality || []).length) {
    const names = B.personality.map((p) => p.trait).join(', ');
    vc += block(T['c-note'], { x: 42, w: 475, baseline: 703, lines: ['Personality'], cls: 'c-note' }).html + block(T['b-line'], { x: 42, w: 475, baseline: 722, lines: [names], cls: 'b-line' }).html;
    if (oy > 703 - 38) throw new Error('read-me: the lines run into the personality');
  }
  // recto: the faces, each named in itself, and the palette stood up as lengths of tape across the foot, as wide as their share
  const dCap = `Display. Weight${f.display.weights.length > 1 ? 's' : ''} ${f.display.weights.join(', ')}${f.display.stretch ? `, width ${f.display.stretch}` : ''}.`;
  const bCap = `Body. Weight${f.body.weights.length > 1 ? 's' : ''} ${f.body.weights.join(', ')}.`;
  let rc = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: [f.display.family], cls: 'b-title' }).html
    + block(T['c-note'], { x: 42, w: 475, baseline: 112, lines: [dCap], cls: 'c-note' }).html
    + block(T['b-stack'], { x: 42, w: 475, baseline: 169, lines: [f.body.family], cls: 'b-stack', style: 'color:var(--ink);' }).html
    + block(T['c-note'], { x: 42, w: 475, baseline: 188, lines: [bCap], cls: 'c-note' }).html;
  if (f.mono) rc += block(T['c-note'], { x: 42, w: 475, baseline: 245, lines: [`${f.mono.family} is for a hex, a token or a code string only.`], cls: 'c-note' }).html;
  const cs = ctx.colours.slice().sort((a, b) => (b.share || 0) - (a.share || 0)), un = unitsFor(cs.map((c) => c.share || 0.1), 27, 4);
  const wl = wrap(T['c-note'].stem, 13, 'Widths follow each colour\'s share of a page. The narrowest are held at four dots so their names fit.', 475);
  rc += block(T['c-note'], { x: 42, w: 475, baseline: 474 - U * (wl.length - 1), lines: wl, cls: 'c-note' }).html;
  let fx = 23, lastInk = '';
  cs.forEach((c, i) => {
    const w = un[i] * U, ink = readable(ctx, c.hex, [R.text, R.ground.hex], `read-me field ${c.name}`);
    const inner = block(T['b-name'], { x: 10, w: w - 20, baseline: 38, lines: [c.name], cls: 'b-name', color: ink, knock: false }).html
      + block(T['c-mono'], { x: 10, w: w - 20, baseline: 57, lines: [c.hex.toUpperCase()], cls: 'c-mono', color: ink, knock: false }).html;
    rc += `<div class="field${nearPaper(ctx, c.hex) ? ' edge' : ''}" style="left:${fx}px;top:492px;width:${w}px;height:302px;box-sizing:border-box;background:${c.hex}">${inner}</div>`;
    fx += w; lastInk = ink;
  });
  return kspread(ctx, doc, 2, { verso: vc, recto: rc, title: 'The brand on one page', headText: 'The brand on one page', folioInk: lastInk, clear: [{ x: x0 - 1, y: y0 - 1, w: x1 - x0 + 2, h: y1 - y0 + 2 }] });
}

export function readMe(ctx) { return [readMe1(ctx), readMe2(ctx)]; }

// ---- the palette sheet: values and where each lands on the verso, the colours laid across the recto as tape, as high as their share ----------

function paletteSheet(ctx) {
  const T = tokens(ctx), R = brandRoles(ctx), doc = { id: 'palette', folder: 'Colour' };
  const cs = ctx.colours.slice().sort((a, b) => (b.share || 0) - (a.share || 0)), pct = (c) => `${Math.round((c.share || 0) * 100)}%`;
  const kOf = (c) => (c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join(' ') : '');
  const vals = (c) => [['HEX', c.hex.toUpperCase()], ['RGB', c.rgb], ['OKLCH', c.oklch], ...(c.cmyk ? [['CMYK', kOf(c)]] : [])];
  let vc = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: ['Palette'], cls: 'b-title' }).html;
  vc += block(T['b-body'], { x: 42, w: 285, top: 131, text: `${numberWord(cs.length)} colours. Each length of tape across the page is as high as the share of a page that colour takes.`, cls: 'b-body' }).html;
  let y = 207;
  for (const c of cs) {
    const v = vals(c), ll = wrap(T['b-body'].stem, 13, c.lands || '', 228), lines = Math.max(1 + v.length, ll.length);
    const chip = `<div class="card${nearPaper(ctx, c.hex) ? ' edge' : ''}" style="left:42px;top:${y}px;width:${2 * U}px;height:${U}px;box-sizing:border-box;background:${c.hex}"></div>`;
    vc += chip + block(T['b-name'], { x: 99, w: 120, baseline: y + U, lines: [c.name], cls: 'b-name' }).html
      + block(T['c-mono'], { x: 219, w: 57, baseline: y + U, lines: [pct(c)], cls: 'c-mono' }).html;
    v.forEach(([k, val], i) => {
      vc += block(T['c-note'], { x: 99, w: 57, baseline: y + U + U * (i + 1), lines: [k], cls: 'c-note', style: 'font-size:11px;' }).html
        + block(T['c-mono'], { x: 156, w: 133, baseline: y + U + U * (i + 1), lines: [val], cls: 'c-mono' }).html;
    });
    vc += block(T['b-body'], { x: 289, w: 228, baseline: y + U, lines: ll, cls: 'b-body' }).html;
    y += U * lines + (cs.some((k) => k.cmyk) ? U : 2 * U); // each colour with cmyk takes one more row, so the gap closes by one to keep the tones on the leaf
  }
  // the tones that ride along in the palette files, two or three to a row
  const tones = ctx.tones;
  if (tones.length) {
    const cols = tones.length > 8 ? 3 : 2, cw = Math.floor(475 / cols), rows = Math.ceil(tones.length / cols);
    const tTop = Math.max(y, 570);
    vc += block(T['c-note'], { x: 42, w: 475, baseline: tTop + U, lines: ['Tones in the palette files'], cls: 'c-note' }).html;
    tones.forEach((t, i) => {
      const cx = 42 + (i % cols) * cw, by = tTop + U + U * (1 + Math.floor(i / cols));
      vc += `<div class="card${nearPaper(ctx, t.hex) ? ' edge' : ''}" style="left:${cx}px;top:${by - U}px;width:${U}px;height:${U}px;box-sizing:border-box;background:${t.hex}"></div>`
        + block(T['c-note'], { x: cx + 28, w: cw - 28 - 80, baseline: by, lines: [t.name], cls: 'c-note', style: 'font-size:11px;' }).html
        + block(T['c-mono'], { x: cx + cw - 80, w: 70, baseline: by, lines: [t.hex.toUpperCase()], cls: 'c-mono' }).html;
    });
    if (tTop + U + U * (1 + rows) > 739 + U) throw new Error(`palette sheet: the tones run to ${tTop + U + U * (1 + rows)}`);
  } else if (y > 739 + U) throw new Error('palette sheet: the rows run off the leaf');
  if (y - 2 * U > 739) throw new Error(`palette sheet: the rows run to ${y}`);

  // recto: lengths of tape from the fold to the fore-edge, stacked head to foot, heights in whole units (42 units is the page and its bleed)
  const un = unitsFor(cs.map((c) => c.share || 0.05), 42, 4);
  let rc = '', top = 0, headInk = '', folioInk = '';
  cs.forEach((c, i) => {
    const h = un[i] * U, ink = readable(ctx, c.hex, [R.text, R.ground.hex], `palette band ${c.name}`);
    const t1 = i === 0 ? 55 : 36;
    const inner = block(T['b-name'], { x: 42, w: 100, baseline: t1, lines: [c.name], cls: 'b-name', color: ink, knock: false }).html
      + block(T['c-mono'], { x: 156, w: 100, baseline: t1, lines: [pct(c)], cls: 'c-mono', color: ink, knock: false }).html
      + block(T['c-mono'], { x: 42, w: 100, baseline: t1 + U, lines: [c.hex.toUpperCase()], cls: 'c-mono', color: ink, knock: false }).html
      + block(T['c-mono'], { x: 156, w: 120, baseline: t1 + U, lines: [c.rgb], cls: 'c-mono', color: ink, knock: false }).html;
    rc += `<div class="field" style="left:0;top:${top}px;width:559px;height:${h}px;box-sizing:border-box;background:${c.hex}${nearPaper(ctx, c.hex) ? ';border-top:1px solid var(--fold);border-bottom:1px solid var(--fold)' : ''}">${inner}</div>`;
    if (i === 0) headInk = ink;
    folioInk = ink; top += h;
  });
  return [kspread(ctx, doc, 1, { verso: vc, recto: rc, title: 'Palette', headInk, folioInk })];
}

// ---- the type sheet ------------------------------------------------------------------------------------------------------------------

function typeSheet(ctx) {
  const T = tokens(ctx), B = ctx.brand, f = B.fonts, TY = B.type, W = ctx.weights, doc = { id: 'type', folder: 'Type' };
  // verso: the brand's sample headline at display scale, the whole alphabet in the display face, the face named
  const h = hero(T, TY.sample.headline, 475, [[76, 76], [64, 76], [57, 57], [48, 57], [38, 38]], 3);
  const hb = heroBase(h, 74);
  let vc = heroBlock(h, { x: 42, w: 475, baseline: hb }).html;
  const set = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789'];
  const dStem = T._displayStem, size = [26, 24, 22, 20, 18].find((s) => set.every((l) => advance(dStem, s, l, 0) <= 475)) || 18;
  vc += block({ stem: dStem, size, lh: 38, track: 0 }, { x: 42, w: 475, baseline: 435, lines: set, cls: 'b-title', style: `font-size:${size}px;` }).html;
  vc += block(T['b-title'], { x: 42, w: 475, baseline: 663, lines: [f.display.family], cls: 'b-title' }).html;
  const dCap = `Display. Weight${f.display.weights.length > 1 ? 's' : ''} ${f.display.weights.join(', ')}${f.display.stretch ? `, width ${f.display.stretch}` : ''}${(f.display.italics || []).length ? `, italic ${f.display.italics.join(', ')}` : ''}. SIL OFL 1.1.`;
  vc += block(T['c-note'], { x: 42, w: 475, baseline: 701, lines: [dCap], cls: 'c-note' }).html;
  if ((hb + (h.lines.length - 1) * h.lh) > 435 - 76 - 38) throw new Error('type sheet: the headline runs into the alphabet');

  // recto: the body face, then the brand's own type scale, each token as an "Aa" at its real size with its numbers and its use
  let rc = block(T['b-stack'], { x: 42, w: 475, baseline: 93, lines: [f.body.family], cls: 'b-stack', style: 'color:var(--ink);' }).html;
  let y = 131;
  const toks = (TY.scale || []).map((tok) => {
    const role = tok.face === 'display' ? 'display' : 'body';
    const wanted = ctx.faces.find((x) => x.role === role && x.style !== 'italic' && x.weight === tok.weight) || ctx.faces.find((x) => x.role === role && x.style !== 'italic' && x.weight === (role === 'display' ? W.heading : W.regular));
    return { tok, role, wanted, spW: advance(wanted.stem, tok.size, 'Aa', 0) };
  });
  // the "Aa" column is as wide as the widest "Aa" needs, in whole units; the token name and numbers sit after it, then the use
  const nameX = 42 + ceilU(Math.max(...toks.map((t) => t.spW)) + 4) + U, useX = nameX + 6 * U, useW = 517 - useX;
  for (const { tok, role, wanted, spW } of toks) {
    const px_ = tok.size, lhpx = Math.round(tok.size * tok.line), cap = capRatio(wanted.stem) * px_;
    const ul = wrap(T['c-note'].stem, 13, tok.use, useW);
    const rowH = Math.max(ceilU(cap), 2 * U, U * ul.length), bl = nearRow(y + cap);
    rc += block({ stem: wanted.stem, size: px_, lh: Math.max(ceilU(lhpx), U), track: 0 }, { x: 42, w: nameX - 42, baseline: bl, lines: ['Aa'], widths: [spW], cls: 'b-body', style: `font-family:var(--${role});font-weight:${wanted.weight};font-size:${px_}px;line-height:${Math.max(ceilU(lhpx), U)}px;font-stretch:${role === 'display' ? f.display.stretch || 100 : 100}%;` }).html;
    rc += block(T['b-name'], { x: nameX, w: 6 * U, baseline: y + U, lines: [tok.token], cls: 'b-name' }).html;
    rc += block(T['c-mono'], { x: nameX, w: 6 * U, baseline: y + 2 * U, lines: [`${px_} / ${lhpx} px`], cls: 'c-mono' }).html;
    rc += block(T['c-note'], { x: useX, w: useW, baseline: y + U, lines: ul, cls: 'c-note' }).html;
    y += rowH + U;
  }
  if (f.mono) {
    const hexes = ctx.colours.map((c) => c.hex.toUpperCase()).join(' '), ml = wrap(T['m-hex'].stem, 13, hexes, 475);
    y += U;
    rc += block(T['c-note'], { x: 42, w: 475, baseline: y + U, lines: [`${f.mono.family}, for values only`], cls: 'c-note' }).html
      + block(T['m-hex'], { x: 42, w: 475, baseline: y + U + U, lines: ml, cls: 'b-hex' }).html;
    y += U * (ml.length + 1);
  }
  if (y > 739) throw new Error(`type sheet: the recto runs to ${y}`);
  rc += block(T['c-note'], { x: 42, w: 475, baseline: 739, lines: [`${familyCount(ctx) === 1 ? 'The face is' : `All ${numberWord(familyCount(ctx)).toLowerCase()} faces are`} under the SIL Open Font Licence.`], cls: 'c-note' }).html;
  return [kspread(ctx, doc, 1, { verso: vc, recto: rc, title: 'Typefaces' })];
}

// ---- photography: the direction, then the shot list ------------------------------------------------------------------------------------

function jpegSize() { throw new Error('theme 26: photograph files are not read by the server export'); }
// a photograph cropped to the shot's safe box and filling a w x h print, with nothing laid over it
function photoInner(ctx, s, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  const f = s.focus || {}, k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) * ((f.x ?? 50) / 100), oy = (h - c.h * k) * ((f.y ?? 50) / 100);
  return sceneImg(ctx.photoUrl(s.photo), { left: ox - c.x * k, top: oy - c.y * k, iw: n.w * k, ih: n.h * k }, s.alt);
}
const aspectOf = (ctx, s) => { const c = s.crop || jpegSize(); return c.w / c.h; };
const shotName = (ctx, s) => s.caption || ctx.cap(s.id);
// a shot with no photo yet: a card cut from the brand's sunken ground, tabbed, with the shot's name on it
function briefCard(ctx, T, s, x, y, w, h) {
  const g = ctx.roles.light.sunken, ink = readable(ctx, g, [ctx.roles.light.text, ctx.roles.light.surface], `brief card ${s.id}`);
  return `<div class="card stuck${nearPaper(ctx, g) ? ' edge' : ''}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;background:${g}">`
    + block(T['b-name'], { x: 12, w: w - 24, baseline: 33, lines: [shotName(ctx, s)], cls: 'b-name', color: ink, knock: false }).html + (w >= 400 ? block(T['b-body'], { x: 12, w: w - 24, baseline: 71, lines: wrap(T['b-body'].stem, 13, s.slot, w - 24), cls: 'b-body', color: ink, knock: false }).html : '') + '</div>' + tab(T, { x, y, label: 'Brief, to shoot' });
}

function photoSheets(ctx) {
  const T = tokens(ctx), B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, doc = { id: 'photo', folder: 'Imagery' };
  // spread one: the direction. The lead print is the photo whose safe box is nearest 3:2, else the first brief.
  const photos = shots.filter((s) => s.photo).sort((a, b) => Math.abs(Math.log(aspectOf(ctx, a) / 1.5)) - Math.abs(Math.log(aspectOf(ctx, b) / 1.5)));
  const creditSeen = new Set();
  const lead = photos[0] || shots[0], P = { x: 42, y: 169, w: 456, h: 304 };
  let vc = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: ['Photography direction'], cls: 'b-title' }).html;
  if (lead.photo) vc += printHtml({ ...P, inner: photoInner(ctx, lead, P.w, P.h), label: lead.alt }) + tapePiece(P.x, P.y);
  else vc += briefCard(ctx, T, lead, P.x, P.y, P.w, P.h);
  const leadCredit = creditOnce(lead, creditSeen), cap = lead.photo ? (leadCredit ? `${shotName(ctx, lead)}. Photo: ${leadCredit}.` : `${shotName(ctx, lead)}.`) : `${shotName(ctx, lead)}, a brief still to shoot.`;
  vc += block(T['c-note'], { x: 42, w: 456, baseline: P.y + P.h + U, lines: wrap(T['c-note'].stem, 13, cap, 456), cls: 'c-note' }).html;
  let rc = '', ry = 131;
  for (const [k, v] of [['subject', D.subject], ['light', D.light], ['crop', D.crop], ['colour', D.colour], ['people', D.people]].filter(([, v]) => v)) {
    const ls = wrap(T['b-body'].stem, 13, v, 380);
    rc += block(T['b-name'], { x: 42, w: 76, baseline: ry + U, lines: [k[0].toUpperCase() + k.slice(1)], cls: 'b-name' }).html + block(T['b-body'], { x: 137, w: 380, baseline: ry + U, lines: ls, cls: 'b-body' }).html;
    ry += U * ls.length + U;
  }
  if (ry - U > 739 + U) throw new Error(`photography: the direction runs to ${ry}`);
  const out = [kspread(ctx, doc, 1, { verso: vc, recto: rc, title: 'Photography direction' })];

  // the shot list: six a spread, three down each leaf, each print or brief on the left with its name, what it shows and its source beside it
  const leaf = (list) => {
    const creditSeen = new Set();
    let o = '';
    list.forEach((s, i) => {
      const y = 131 + i * 11 * U, p = { x: 42, y, w: 228, h: 152 };
      if (s.photo) o += printHtml({ ...p, inner: photoInner(ctx, s, p.w, p.h), label: s.alt }) + tapePiece(p.x, p.y);
      else o += briefCard(ctx, T, s, p.x, p.y, p.w, p.h);
      const nl = wrap(T['b-name'].stem, 13, shotName(ctx, s), 228), bl = wrap(T['b-body'].stem, 13, s.photo ? s.alt : s.slot, 228), cr = creditOnce(s, creditSeen), sub = s.photo ? (cr ? `Photo: ${cr}.` : "Photo on file.") : "A brief, still to shoot.";
      const base = y + U;
      o += block(T['b-name'], { x: 289, w: 228, baseline: base, lines: nl, cls: 'b-name' }).html
        + block(T['b-body'], { x: 289, w: 228, baseline: base + U * nl.length, lines: bl, cls: 'b-body' }).html
        + block(T['c-note'], { x: 289, w: 228, baseline: base + U * (nl.length + bl.length), lines: [sub], cls: 'c-note' }).html;
      if (U * (nl.length + bl.length + 1) > 11 * U - U) throw new Error(`photography: shot ${s.id} text is too long`);
    });
    return o;
  };
  for (let p = 0; p * 6 < shots.length; p++) {
    const chunk = shots.slice(p * 6, p * 6 + 6);
    const title = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: [p ? 'Shot list, continued' : 'Shot list'], cls: 'b-title' }).html;
    out.push(kspread(ctx, doc, 2 + p, { verso: title + leaf(chunk.slice(0, 3)), recto: leaf(chunk.slice(3)), title: p ? 'Shot list, continued' : 'Shot list' }));
  }
  return out;
}

// ---- the icon sheet ------------------------------------------------------------------------------------------------------------------

function iconSheet(ctx) {
  const T = tokens(ctx), B = ctx.brand, N = nb(ctx), set = iconSet(ctx), s = ctx.iconStyle, n = set.length, doc = { id: 'icons', folder: 'Icons' };
  const hero_ = set.find((x) => !ICON_SET.includes(x)) || set[0];
  const joinWord = { miter: 'mitred', round: 'round', bevel: 'bevelled' }[s.join] || s.join;
  const intro = `${n} icons from Lucide, drawn in the ${B.name} stroke: ${s.stroke} px lines at 24 px, ${s.cap} ends and ${joinWord} corners.`;
  const foot = 'Each icon is one SVG file in 04 Icons. It takes the colour of the text beside it (currentColor), so it never needs a colour of its own. The ISC licence is in LICENSE.txt.';
  // verso one: one icon drawn at 15 units, in a clear zone of missing dots
  const il = wrap(T['b-body'].stem, 13, intro, 285), fl = wrap(T['c-note'].stem, 13, foot, 380);
  const fFirst = 739 - U * (fl.length - 1), iLast = fFirst - 2 * U, iFirst = iLast - U * (il.length - 1);
  if (iFirst < 454 + 2 * U) throw new Error('icon sheet: the notes run into the icon');
  let vc = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: ['Icon set'], cls: 'b-title' }).html;
  vc += `<div class="ktn-ic" style="left:42px;top:131px;width:285px;height:285px;color:${N.text}">${icon(ctx, hero_, 285)}</div>`;
  vc += block(T['c-mono'], { x: 42, w: 285, baseline: 454, lines: [hero_], cls: 'c-mono' }).html;
  vc += block(T['b-body'], { x: 42, w: 285, baseline: iFirst, lines: il, cls: 'b-body' }).html + block(T['c-note'], { x: 42, w: 380, baseline: fFirst, lines: fl, cls: 'c-note' }).html;
  // the grid: an icon on a knocked-out paper square, its file name under it. Four across at six units, or three at eight when a name is long.
  const longest = Math.max(...set.map((x) => advance('AtkinsonHyperlegibleMono-400', 11, x, 0)));
  const cols = longest <= 108 ? 4 : 3, cw = (cols === 4 ? 6 : 8) * U, perLeaf = cols * 8;
  const grid = (list, top) => {
    let o = '';
    list.forEach((name, i) => {
      const x = 42 + (i % cols) * cw, y = top + Math.floor(i / cols) * 4 * U;
      o += `<div class="ko" style="left:${px(x - U / 2)};top:${px(y - U / 2)};width:${3 * U}px;height:${3 * U}px"></div>`
        + `<div class="ktn-ic" style="left:${x + 7}px;top:${y + 7}px;width:24px;height:24px;color:${N.text}">${icon(ctx, name, 24)}</div>`
        + block(T['c-mono'], { x, w: cw - 8, baseline: y + 3 * U, lines: [name], cls: 'c-mono' }).html;
    });
    return o;
  };
  const out = []; let at = 0, no = 1;
  let rc = grid(set.slice(at, at + perLeaf), 131); at += perLeaf;
  out.push(kspread(ctx, doc, no++, { verso: vc, recto: rc, title: 'Icon set', clear: [{ x: 23, y: 112, w: 323, h: 323 }] }));
  while (at < n) {
    const title = block(T['b-title'], { x: 42, w: 475, baseline: 93, lines: ['Icon set, continued'], cls: 'b-title' }).html;
    const a = grid(set.slice(at, at + perLeaf), 131); at += perLeaf;
    const b = grid(set.slice(at, at + perLeaf), 131); at += perLeaf;
    out.push(kspread(ctx, doc, no++, { verso: title + a, recto: b, title: 'Icon set, continued' }));
  }
  return out;
}

export function sheets(ctx) {
  return { palette: paletteSheet(ctx), typefaces: typeSheet(ctx), photography: photoSheets(ctx), icons: iconSheet(ctx) };
}

export function css() {
  return `
.pg .ktn-ic{position:absolute;z-index:1;display:block}
.pg .ktn-ic svg{display:block}
`;
}
