// Theme 31, Contact sheet, lane kt: the brand kit PDFs. readMe (two pages) and sheets (palette, typefaces, photography, and the icon proof sheet).
// Every page is a proof sheet from the kit roll: the strip with the page's own frame circled, the stage under it and the notes at x 996, as in the guidelines.
// The icon sheet is the one full contact sheet: every icon the brand ships, one per frame, the brand's chosen icon circled.
// The engine prints sheets().icons to 04 Icons/Icons.pdf. Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
import {
  A, tokens, palette, cwOn, put, adv, wrap, px, photoFrame, photoShot, loopPath, iconSet, icon, same, nameOf, listJoin, dispW, ICONS_PER_SHEET, chosenIcon,
  kitIds, frameNo, setupOf, logoKeys, ktPage, capHead, hl, label, para, dispBlock, notes, fieldWidths, iconStrips, iconLoopAt,
} from './lane-kt-lib.js';
import { fitLines } from './helpers.js';

const W_STAGE = 912;
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const nWord = (n) => NUM[n] || String(n);
const families = (ctx) => [...new Set(['display', 'body', 'mono'].map((r) => ctx.brand.fonts[r].family))];
const realShots = (ctx) => ctx.brand.imagery.shots.filter((s) => s.photo);

// ---- what the circled frame holds, in words: the theme names the frame, the brand fills it ----
function frameCap(ctx, id) {
  const B = ctx.brand, slot = ctx.edition === 'slot', s = setupOf(id), cw = B.logo.colourways, [k1, k2] = logoKeys(ctx);
  if (s[0] === 'logo') {
    const g = nameOf(ctx, cw[k1].ground);
    return slot ? { title: 'The logo slot', text: 'Where the approved logo goes. The slot frame and a note on the files are in 01 Logo.' }
      : { title: 'The logo', text: `The full-colour version${g ? ` on ${g}` : ''}. Every version is in 01 Logo.` };
  }
  if (s[0] === 'logo2') {
    const g = nameOf(ctx, cw[k2].ground), n = Object.keys(cw).length;
    return { title: g ? `The logo on ${g}` : 'The logo on a second ground', text: `One of ${n} colourways, each drawn for its own ground.` };
  }
  if (s[0] === 'colour') return { title: 'The palette', text: `${nWord(ctx.colours.length)} colours, each band as wide as its share of a layout.` };
  if (s[0] === 'type') return { title: B.fonts.display.family, text: `The display face at ${dispW(ctx)}. ${B.fonts.body.family} sets the reading text.` };
  if (s[0] === 'icons') return { title: 'The icon set', text: `${iconSet(ctx).length} icons from Lucide, in the brand's stroke.` };
  const shot = photoShot(ctx, s[1]);
  return shot ? { title: shot.caption || shot.alt, text: (shot.generated ? '' : `Photo: ${shot.credit || 'the studio'}.`) } : { title: 'Your photograph', text: 'This frame takes your own photograph, as shot.' };
}

// ---- read me 1: what is in the kit, and how to use it ----
function readMe1(ctx) {
  const B = ctx.brand, slot = ctx.edition === 'slot', id = 'read-me-1', nIcons = iconSet(ctx).length, fam = families(ctx);
  const t = fitLines(ctx, 'display', `${B.name} brand kit`, 96, W_STAGE - 12, 1, -0.01, ctx.weights.heading, 4, 40);
  const d = dispBlock(ctx, { x: 60, capTop: 332, w: W_STAGE, lines: t.lines, size: t.size, line: t.size });
  const desc = para(ctx, { x: 60, capTop: d.bottom + 36, w: 564, text: B.description, size: 16, line: 24 });
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide, transparent.'],
    ['02 Colour', 'The palette for Adobe (ASE), CSS and JSON, and the palette sheet.'],
    ['03 Type', 'The type specimen, and the faces with their links and licence.'],
    ['04 Icons', `${nIcons} interface icons as SVG (Lucide, ISC licence) in the brand's stroke. With a proof sheet, Icons.pdf.`],
    ['05 Imagery', realShots(ctx).length ? 'The photography direction, the shot list and the photos.' : 'The photography direction and the shot list.'],
  ];
  const RH = 64, y0 = 936 - folders.length * RH;
  let rows = '';
  folders.forEach(([n, txt], i) => {
    const y = y0 + i * RH;
    rows += hl(60, y, W_STAGE) + put(ctx, { x: 60, y: y + 16, w: 210, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(n) })
      + para(ctx, { x: 294, capTop: y + 16 + 7, w: 678, text: txt }).html;
  });
  const steps = [
    ['Start with the logo.', slot ? 'Put the approved files in 01 Logo, then follow the clear space and minimum size in the guidelines.' : 'Use the version whose ground matches the page under it. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', `The links in fonts.md go to Google Fonts. ${fam.length === 1 ? 'The face is' : `All ${nWord(fam.length).toLowerCase()} faces are`} under the SIL Open Font License 1.1.`],
  ];
  let how = label(ctx, 996, 512, 'How to use it'), y = 544;
  for (const [lead, txt] of steps) {
    how += put(ctx, { x: 996, y, w: 444, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(lead) });
    const p = para(ctx, { x: 996, capTop: y + 32, w: 444, text: txt });
    how += p.html; y = p.bottom + 28;
  }
  return ktPage(ctx, id, d.html + desc.html + rows + capHead(ctx, id, frameCap(ctx, id)) + how);
}

// ---- read me 2: the brand on one page ----
function readMe2(ctx) {
  const B = ctx.brand, T = tokens(ctx), slot = ctx.edition === 'slot', id = 'read-me-2', f = B.fonts;
  const geo = ctx.logo.geos.colour || ctx.logo.geos.primary, lw = Math.round(Math.min(400, 120 * geo.w / geo.h)), lh = lw * geo.h / geo.w;
  const logo = `<div class="a" style="left:60px;top:316px;width:${lw}px">${slot ? ctx.logo.html('colour', { width: lw, colourway: cwOn(ctx, T.ground), color: T.ink, label: 'Your logo goes here' }) : ctx.logo.html('colour', { width: lw, colourway: cwOn(ctx, T.ground) })}</div>`;
  const p = fitLines(ctx, 'display', B.lines.primary, 56, W_STAGE - 12, 2, -0.01, ctx.weights.heading, 4, 32);
  const d = dispBlock(ctx, { x: 60, capTop: 316 + lh + 64, w: W_STAGE, lines: p.lines, size: p.size, line: Math.round(p.size * 1.08) });
  let others = '', y = d.bottom + 28;
  for (const l of B.lines.others) { const o = para(ctx, { x: 60, capTop: y, w: W_STAGE, text: l, size: 16, line: 24 }); others += o.html; y = o.bottom + 14; }
  // the palette at its shares, each band wide enough for its name and value
  const cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
  const needs = cols.map((c) => Math.ceil(Math.max(adv(ctx, 'body', c.name, 14, 0, 500), adv(ctx, 'mono', c.hex, 12, 0, 400))) + 20);
  const ws = fieldWidths(cols.map((c) => c.share), needs, W_STAGE);
  let x = 60, band = '';
  cols.forEach((c, i) => {
    const edge = ctx.ratio(c.hex, T.ground) < 1.4 ? ';box-shadow:inset 0 0 0 1px var(--gate)' : '';
    band += `<div class="a" style="left:${x}px;top:808px;width:${ws[i]}px;height:56px;background:${c.hex}${edge}"></div>`
      + put(ctx, { x, y: 876, w: ws[i] - 12, h: 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink)', html: A(c.name) })
      + put(ctx, { x, y: 900, w: ws[i] - 12, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, weight: 400, html: A(c.hex) });
    x += ws[i];
  });
  // the faces, each set in itself
  const face = (yy, role, fam, words) => put(ctx, { x: 996, y: yy, w: 96, h: 64, role, size: 56, line: 64, weight: role === 'display' ? dispW(ctx) : ctx.weights.regular, cls: role === 'display' ? 'disp' : '', style: `font-size:56px;line-height:64px;${role === 'display' ? `font-weight:${dispW(ctx)}` : `font:${ctx.weights.regular} 56px/64px var(--body)`};color:var(--ink)`, html: 'Aa' })
    + put(ctx, { x: 1113, y: yy + 6, w: 327, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(fam) })
    + para(ctx, { x: 1113, capTop: yy + 6 + 32, w: 327, text: words }).html;
  const faces = label(ctx, 996, 512, 'Typefaces')
    + face(544, 'display', f.display.family, `Display, at ${listJoin(f.display.weights.map(String))}.`)
    + face(640, 'body', f.body.family, `Body, at ${listJoin(f.body.weights.map(String))}.`)
    + para(ctx, { x: 996, capTop: 752, w: 444, text: `${f.mono.family} sets literal values only: a hex, a token, a size.` }).html;
  return ktPage(ctx, id, logo + d.html + others + band + capHead(ctx, id, frameCap(ctx, id)) + faces);
}

// ---- the icon proof sheet(s): every icon in a frame, the chosen one circled ----
function iconSheets(ctx) {
  const B = ctx.brand, T = tokens(ctx), set = iconSet(ctx), ch = chosenIcon(ctx), slug = ctx.slug || B.slug, st = ctx.iconStyle, out = [];
  const ids = kitIds(ctx).filter((i) => i.startsWith('icons'));
  ids.forEach((id, s) => {
    const names = set.slice(s * ICONS_PER_SHEET, (s + 1) * ICONS_PER_SHEET), k = names.indexOf(ch.name), first = s * ICONS_PER_SHEET + 1;
    const loop = k >= 0 ? loopPath(slug, 'kt:' + id, ...iconLoopAt(k)) : null;
    // under the sheet: the chosen icon at the sizes the kit draws it, and what the files are
    const rows = Math.ceil(Math.max(names.length, 1) / 6), top = [48, 284, 520][rows - 1] + 220 + 36;
    let low = '';
    if (k >= 0) {
      const why = ch.why === 'row' ? `${B.name}'s row icon, the one beside every list row.` : ch.why === 'own' ? `The icon ${B.name} added to the standard set.` : 'The first icon in the set.';
      const sizes = [24, 20, 16];
      low += label(ctx, 60, top, 'At the sizes the kit draws it');
      sizes.forEach((z, i) => { low += `<span class="a kt-ic" style="left:${60 + i * 64}px;top:${top + 32 + 24 - z}px;color:var(--ink)">${icon(ctx, ch.name, z)}</span>` + put(ctx, { x: 60 + i * 64, y: top + 64, w: 56, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, weight: 400, html: `${z} px` }); });
      low += put(ctx, { x: 996, y: top - 4, w: 444, h: 40, cls: 'fno num', role: 'edge', size: 40, line: 40, weight: 600, html: String(first + k).padStart(2, '0') })
        + put(ctx, { x: 996, y: top + 48, w: 444, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(`${ch.name}.svg`) })
        + para(ctx, { x: 996, capTop: top + 48 + 32, w: 444, text: why }).html;
    }
    const files = `${set.length} icons in 04 Icons, one SVG each, from Lucide under the ISC licence. Stroke ${st.stroke} at 24 px, ${st.join} joins and ${st.cap} caps, set by ${B.name}'s control corner. Each draws in the colour of the text beside it.`;
    low += para(ctx, { x: 294, capTop: top + 6, w: 564, text: files }).html;
    out.push(ktPage(ctx, id, low, { strips: iconStrips(ctx, T, names, first, k), loop }));
  });
  return out;
}

// ---- palette: the colours at their shares, then the values ----
function paletteSheet(ctx) {
  const T = tokens(ctx), id = 'palette', cols = ctx.colours.slice().sort((a, b) => b.share - a.share);
  const ws = fieldWidths(cols.map((c) => c.share), cols.map(() => 24), W_STAGE);
  const flat = (c) => (ctx.ratio(c.hex, T.ground) < 1.4 ? ';box-shadow:inset 0 0 0 1px var(--gate)' : '');
  let x = 60, band = '';
  cols.forEach((c, i) => { band += `<div class="a" style="left:${x}px;top:316px;width:${ws[i]}px;height:248px;background:${c.hex}${flat(c)}"></div>`; x += ws[i]; });
  // the values: one row per colour, in the band's order
  const C = [[60, 'Colour', 210], [294, 'Hex', 93], [411, 'RGB', 210], [645, 'OKLCH', 210], [879, 'Share', 93]];
  let tab = C.map(([cx, t, w]) => put(ctx, { x: cx, y: 604, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, align: t === 'Share' ? 'right' : 'left', html: A(t) })).join('');
  cols.forEach((c, i) => {
    const y = 628 + i * 44, [r, g, b] = ctx.C.hexToRgb(c.hex), ok = c.oklch || ctx.C.oklchString(c.hex);
    // a colour with cmyk lifts its three values and sets the CMYK under RGB, inside the same 44 px row
    const km = ctx.C.cmykOf(c), mono = (cx, w, t, al, dy = km && cx !== 879 ? -9 : 0) => put(ctx, { x: cx, y: y + 14 + dy, w, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, weight: 400, align: al || 'left', html: A(t) });
    tab += hl(60, y, W_STAGE) + `<div class="a" style="left:60px;top:${y + 15}px;width:16px;height:16px;background:${c.hex}${flat(c)}"></div>`
      + put(ctx, { x: 88, y: y + 11, w: 182, h: 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink)', html: A(c.name) })
      + mono(294, 93, c.hex) + mono(411, 210, `rgb(${r}, ${g}, ${b})`) + mono(645, 210, ok) + (km ? mono(411, 400, km, 'left', 9) : '') + mono(879, 93, `${Math.round(c.share * 100)}%`, 'right');
  });
  // where each colour lands, in the notes
  let lands = label(ctx, 996, 512, 'Where each colour lands'), y = 544;
  for (const c of cols) {
    lands += put(ctx, { x: 996, y, w: 444, h: 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink)', html: A(c.name) });
    const p = para(ctx, { x: 996, capTop: y + 22 + 7, w: 444, text: c.lands }); lands += p.html; y = p.bottom + 18;
  }
  return [ktPage(ctx, id, band + tab + capHead(ctx, id, frameCap(ctx, id)) + lands)];
}

// ---- typefaces: the sample set in the faces, then each face ----
function typeSheet(ctx) {
  const B = ctx.brand, id = 'typefaces', f = B.fonts, S = B.type.sample;
  const h = fitLines(ctx, 'display', S.headline, 72, W_STAGE - 12, 2, -0.01, ctx.weights.heading, 4, 32);
  const d = dispBlock(ctx, { x: 60, capTop: 332, w: W_STAGE, lines: h.lines, size: h.size, line: Math.round(h.size * 1.08) });
  const p = para(ctx, { x: 60, capTop: d.bottom + 32, w: 600, text: S.paragraph, size: 16, line: 24 });
  const alpha = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'];
  const row = (y, role, fam, words, wt) => {
    // the alphabet at 20 px, smaller if a wide face would run past the stage
    const az = Math.min(20, Math.floor(20 * 440 / Math.max(...alpha.map((a) => adv(ctx, role, a, 20, 0, wt)))));
    const st = role === 'display' ? `font-family:var(--display);font-weight:${wt};font-stretch:${f.display.stretch || 100}%` : `font-family:var(--body);font-weight:${wt}`;
    return hl(60, y, W_STAGE)
      + put(ctx, { x: 60, y: y + 20, w: 210, h: 96, role, size: 88, line: 96, weight: wt, style: `${st};font-size:88px;line-height:96px;color:var(--ink)`, html: 'Aa' })
      + put(ctx, { x: 294, y: y + 24, w: 210, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(fam) })
      + para(ctx, { x: 294, capTop: y + 24 + 32, w: 210, text: words }).html
      + alpha.map((a, i) => put(ctx, { x: 528, y: y + 24 + i * 30, w: 444, h: 30, role, size: az, line: 30, weight: wt, style: `${st};font-size:${az}px;line-height:30px;color:var(--soft)`, html: a })).join('');
  };
  const faces = row(660, 'display', f.display.family, `Display, at ${listJoin(f.display.weights.map(String))}.`, dispW(ctx))
    + row(800, 'body', f.body.family, `Body, at ${listJoin(f.body.weights.map(String))}.`, ctx.weights.regular);
  // the scale, in the notes
  const sc = B.type.scale, RH = Math.min(28, Math.floor((900 - 544) / Math.max(sc.length, 1)));
  let scale = label(ctx, 996, 512, 'The type scale');
  sc.forEach((s, i) => {
    const y = 544 + i * RH;
    scale += put(ctx, { x: 996, y, w: 140, h: 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink)', html: A(s.token) })
      + put(ctx, { x: 1148, y: y + 2, w: 120, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, weight: 400, html: A(`${s.size} / ${Math.round(s.size * s.line)} px`) })
      + put(ctx, { x: 1280, y, w: 160, h: 22, role: 'body', size: 14, line: 22, weight: 400, style: 'font:400 14px/22px var(--body);color:var(--soft)', html: A(`${s.face === 'display' ? 'Display' : s.face === 'mono' ? 'Mono' : 'Body'}, ${s.weight}`) });
  });
  const mono = para(ctx, { x: 996, capTop: 544 + sc.length * RH + 24, w: 444, text: `${f.mono.family} sets a hex, a token or a code string, nothing else. Links and licences are in fonts.md.` });
  return [ktPage(ctx, id, d.html + p.html + faces + capHead(ctx, id, frameCap(ctx, id)) + scale + mono.html)];
}

// ---- photography: the direction beside the enlargement of the circled frame, then the shot list as prints ----
function photoSheets(ctx) {
  const B = ctx.brand, D = B.imagery.direction, slot = ctx.edition === 'slot';
  const id1 = 'photography-1', s0 = photoShot(ctx, 0);
  const print = `<div class="a fr" style="left:60px;top:316px;width:552px;height:368px">${photoFrame(ctx, 0, 552, 368)}</div>`;
  const cred = s0 ? put(ctx, { x: 60, y: 700, w: 552, h: 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink)', html: A(s0.caption || s0.alt) })
    + put(ctx, { x: 60, y: 722, w: 552, h: 22, cls: 'cx', html: A((s0.generated ? '' : `Photo: ${s0.credit || 'the studio'}.`)) }) : '';
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter((r) => r[1]);
  const dir = notes(ctx, { x: 645, y: 316, w: 327, rows, gap: 22 });
  const nShots = B.imagery.shots.length;
  const note = para(ctx, { x: 996, capTop: 512, w: 444, text: `Shoot to these ${nWord(rows.length).toLowerCase()} notes. The shot list is the next page${realShots(ctx).length && !slot ? ', and the photos are in 05 Imagery' : ''}.` });
  const page1 = ktPage(ctx, id1, print + cred + dir.html + capHead(ctx, id1, frameCap(ctx, id1)) + note.html);

  // the shot list: one print per shot on the frame grid, four across; a shot still to take is unexposed film
  const id2 = 'photography-2', shots = B.imagery.shots, X = [60, 294, 528, 762];
  const cell = (s, size, line) => {
    const has = s.photo && !slot, title = has ? (s.caption || s.alt) : s.caption || 'To shoot', text = has ? (s.generated ? '' : `Photo: ${s.credit || 'the studio'}.`) : (s.slot || 'Your photograph.');
    return { s, has, title, text, n: wrap(ctx, 'body', text, size, 208, 0, ctx.weights.regular).length, tn: wrap(ctx, 'body', title, 14, 208, 0, 500).length };
  };
  const lay = (size, line) => {
    const cells = shots.map((s) => cell(s, size, line)), rowsN = Math.ceil(cells.length / 4); let y = 316; const tops = [];
    for (let r = 0; r < rowsN; r++) { tops.push(y); const rc = cells.slice(r * 4, r * 4 + 4); y += 140 + 14 + Math.max(...rc.map((c) => c.tn * 22 + 4 + c.n * line)) + 32; }
    return { cells, tops, end: y - 32 };
  };
  let L = lay(14, 22), size = 14, line = 22;
  if (L.end > 936) { size = 12; line = 18; L = lay(12, 18); }
  let grid = '';
  L.cells.forEach((c, i) => {
    const x = X[i % 4], y = L.tops[Math.floor(i / 4)];
    const frame = c.has ? `<div class="a fr" style="left:${x}px;top:${y}px;width:210px;height:140px">${ctx.photo(c.s.id, { style: 'position:absolute;left:0;top:0;width:210px;height:140px' })}</div>`
      : `<div class="a fr fr--empty" style="left:${x}px;top:${y}px;width:210px;height:140px;background:var(--film)"></div>`;
    grid += frame + put(ctx, { x, y: y + 154, w: 210, h: c.tn * 22, role: 'body', size: 14, line: 22, weight: 500, style: 'font:500 14px/22px var(--body);color:var(--ink);white-space:normal', html: A(c.title) })
      + put(ctx, { x, y: y + 154 + c.tn * 22 + 4, w: 210, h: c.n * line, role: 'body', size, line, weight: ctx.weights.regular, style: `font:${ctx.weights.regular} ${size}px/${line}px var(--body);color:var(--soft);white-space:normal`, html: A(c.text) });
  });
  const m = slot ? 0 : realShots(ctx).length;
  const sum = para(ctx, { x: 996, capTop: 512, w: 444, text: m ? `${nWord(nShots)} shots on the list. ${nWord(m)} ${m === 1 ? 'is' : 'are'} photographed${m < nShots ? `, ${nWord(nShots - m).toLowerCase()} still to take` : ''}.` : `${nWord(nShots)} shots on the list, each waiting for your own photograph.` });
  const page2 = ktPage(ctx, id2, grid + capHead(ctx, id2, frameCap(ctx, id2)) + sum.html);
  return [page1, page2];
}

// ---- the lane exports ----
export function readMe(ctx) { return [readMe1(ctx), readMe2(ctx)]; }
export function sheets(ctx) { return { palette: paletteSheet(ctx), typefaces: typeSheet(ctx), photography: photoSheets(ctx), icons: iconSheets(ctx) }; }
export function css() {
  return `.pg.kt .kt-ic{display:block;line-height:0}
.pg.kt .kt-ic svg{display:block}
.pg.kt .kt-low{text-transform:none;letter-spacing:.02em}
`;
}
