// Lane kt for theme 28 (Riso): the brand kit PDFs. readMe (the read-me), and sheets { palette, typefaces, photography, icons }.
// Every page is one sheet off the press, as everywhere in this theme: a plate, a pass and a hit (sheet.js), with the colour bar and a folio in the foot.
// Here the foot names the kit folder the PDF lives in, and the folio counts the pages of that PDF.
// Truth: every number is read from ctx (colours, tones, faces, icons, shots) and the hit numeral on each page is a real count, named beside it.
// Brand copy is read from the brand (through bookBrand, which holds Long Room's own copy corrections) and printed whole through A().
// Text is measured only to choose a size or a row height; the browser wraps it. Mono (Sono Mono) is only ever a literal value: hex, rgb, oklch, a file name, a folio.
import { icon, iconSet, ICON_SET } from '../../engine/components.js';
import { A, wrap, inkW, faceFor, faceCss, pressOf, device, fitW, heaviest, displayStem, W, X0, X1 } from './sheet.js';
import { fnv1a } from './press.js';
import { bookBrand } from './copy.js';
import { plateImg } from '../../engine/plate.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] ?? String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const two = (n) => String(n).padStart(2, '0');
const three = (n) => String(n).padStart(3, '0');
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const bst = (ctx, w = 400) => faceFor(ctx, 'body', w).stem;
// lines a text takes at this size: measured 12 px narrower than it is set, so the browser never wraps sooner than the count says
const nL = (ctx, t, size, w, wt = 400) => Math.max(1, wrap(bst(ctx, wt), String(t || ''), size, w - 12).length);
const FLOOR = 1048;

// ---- the sheet: the device from sheet.js, with a foot that names the kit folder and counts this PDF's pages ----
function foot(ctx, name, no, of) {
  const P = pressOf(ctx);
  const sq = (x, bg) => `<i class="sq" style="left:${x}px;background:${bg}"></i>`;
  let x = X0, bar = '';
  for (const d of P.drums) { bar += sq(x, d.hex); x += 12; }
  const ov = (under, over, screen) => `<span class="ov" style="left:${x}px"><i style="background:${under}"></i><i class="${screen ? 'mk' + screen : ''}" style="background:${over};mix-blend-mode:multiply"></i></span>`;
  const seen = new Set();
  for (const [u, o, s, res] of [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]]) { if (seen.has(res)) continue; seen.add(res); bar += ov(u, o, s); x += 12; }
  return `${bar}<span class="a c-foot" style="left:${x - 2 + 12}px;top:1078px;white-space:nowrap">${A(name)}</span>
<span class="a c-value" style="right:${W - X1}px;top:1078px;white-space:nowrap">${three(no)} / ${three(of)}</span>`;
}
// tab: ink laid between the plate and the content (z-index 2, so its multiply meets the plate)
function kit(ctx, id, { hp, hit, tab = '', name, no, of }, inner) {
  const d = device(ctx, id, hp, hit);
  const fh = fnv1a(ctx.brand.slug + ':' + id + ':fibre');
  return `<section class="pg" data-page="${id}" style="--fx:${fh % 512}px;--fy:${(fh >>> 9) % 512}px">${d.html}${tab}<div class="lay${ctx.placeholders && ['palette', 'typefaces'].includes(id) || id.startsWith('photography') ? ' ph-tight' : ''}" style="z-index:3">${inner}${foot(ctx, name, no, of)}</div></section>`;
}
const numbered = (ctx, name, list) => list.map(([id, o, inner], i) => kit(ctx, id, { ...o, name, no: i + 1, of: list.length }, inner));

// ---- small pieces ----
const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${A(t)}</p>`;
const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
const hair = (y, x = X0, w = X1 - X0) => `<i class="a kt-hr" style="left:${x}px;top:${y}px;width:${w}px"></i>`;
const text = (cls, x, y, w, t, st = '') => `<p class="a ${cls}" style="left:${x}px;top:${y}px;${w ? `width:${w}px;` : ''}${st}">${t}</p>`;
const hit = (n, x, base, size, maxW = 330) => ({ text: two(n), x, base, size, maxW });
// a chip as light as the paper gets a hairline edge, so it still reads as a chip
const edge = (ctx, hex) => (ctx.ratio(hex, pressOf(ctx).paper) < 1.3 ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : '');
// the ink a word takes on a colour chip: the key, or the paper, whichever reads better
const inkOn = (ctx, hex) => { const P = pressOf(ctx); return ctx.ratio(hex, P.key) >= ctx.ratio(hex, P.paper) ? P.key : P.paper; };
const brandText = (ctx, role, weight, italic) => faceCss(ctx, role, weight, italic);
const familyCount = (ctx) => new Set(ctx.faces.map((f) => f.family)).size;

// a display line fitted to a width: the largest size from hi down to lo that sets in maxLines lines or fewer
function fitDisplay(ctx, t, hi, lo, maxW, maxLines) {
  const st = displayStem(ctx);
  for (let s = hi; s > lo; s -= 2) { const l = wrap(st, t, s, maxW - 12); if (l.length <= maxLines && l.every((x) => inkW(st, x, s) <= maxW - 12)) return { size: s, lines: l.length }; }
  return { size: lo, lines: wrap(st, t, lo, maxW - 12).length };
}

// ================================================================================== the read-me
function readMe1(ctx) {
  const B = bookBrand(ctx), slot = ctx.edition === 'slot';
  const real = B.imagery.shots.filter((s) => s.photo).length, briefs = B.imagery.shots.length - real;
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide on a clear ground.', slot ? 'Slot frame' : `${Word(ctx.logo.versions.length)} versions`],
    ['02 Colour', 'The palette for Adobe (ASE), CSS and JSON, and the swatch sheet.', `${Word(ctx.colours.length)} colours, ${word(ctx.tones.length)} tones`],
    ['03 Type', 'The type specimen, and fonts.md with each face\'s link and licence.', `${Word(familyCount(ctx))} faces`],
    ['04 Icons', 'One SVG per icon at 24 px, in the brand\'s stroke, with the Lucide licence, and the icon sheet.', `${Word(iconSet(ctx).length)} icons`],
    ['05 Imagery', real ? 'The photography direction and shot list, and the photos.' : 'The photography direction and the shot list.', [real && `${Word(real)} photos`, briefs && `${Word(briefs)} briefs`].filter(Boolean).join(', ')],
  ];
  const HP = 452;
  const one = fitDisplay(ctx, `${B.name} brand kit`, 64, 44, 578, 1), t = one.lines === 1 ? one : fitDisplay(ctx, `${B.name} brand kit`, 64, 40, 578, 2);
  let o = plateLabel('Read me', X0);
  o += `<p class="a" style="left:${X0}px;top:88px;width:578px;${brandText(ctx, 'display', heaviest(B.fonts.display))};font-size:${t.size}px;line-height:${Math.round(t.size * 1.06)}px;color:var(--ptxt)">${A(B.name)} brand kit</p>`;
  o += text('c-body', 403, 48, 224, A(ctx.versionLine), 'color:var(--ptxt)');
  // the kit's own words: what it is
  const desc = B.voice.boilerplate25 || B.description;
  let y = HP + 32;
  o += text('c-body', X0, y, 460, A(desc));
  y += nL(ctx, desc, 14, 460) * 21 + 40;
  // the five folders: name, what is in it, and how much, counted from the brand
  for (const [name, what, count] of folders) {
    const h = Math.max(nL(ctx, what, 12, 290) * 17, nL(ctx, count, 12, 132) * 17) + 28;
    o += hair(y);
    o += text('c-body', X0, y + 12, 128, A(name), 'font-weight:600');
    o += text('c-note', 185, y + 14, 290, A(what));
    o += text('c-note', 483, y + 14, 144, A(count), 'text-align:right');
    y += h;
  }
  o += hair(y);
  return ['read-me-1', { hp: HP, hit: hit(folders.length, X0, 416, 230) }, o];
}

function readMe2(ctx) {
  const B = bookBrand(ctx), f = B.fonts, slot = ctx.edition === 'slot', P = pressOf(ctx), HP = 232;
  const traits = (B.personality || []).map((p) => p.trait), n = traits.length || ctx.colours.length;
  let o = plateLabel(traits.length ? 'Personality' : 'Colour');
  o += plateNote(A(traits.length ? traits.join(', ') + '.' : ctx.colours.map((c) => c.name).join(', ') + '.'), 403, 72, 224);
  // the logo, the one big thing: at its own proportion, clean, in register
  const g = ctx.logo.geos.colour, lw = fitW(ctx, 'colour', 470, 150), lh = Math.round((g.h * lw) / g.w);
  let y = 272;
  o += `<div class="a" style="left:${X0}px;top:${y}px;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div>`;
  y += lh + 40;
  // the line, and the brand's other lines
  const first = B.lines.primary, ph = !!ctx.placeholders, ft = ph ? { size: 20, lines: 1 } : fitDisplay(ctx, first, 32, 24, 578, 2);   // slot: a placeholder prints compact on one fixed row, so rows are not measured from the sentinel
  o += `<p class="a${ph ? ' ph-tight' : ''}" style="left:${X0}px;top:${y}px;width:578px;${brandText(ctx, 'display', heaviest(f.display))};font-size:${ft.size}px;line-height:${Math.round(ft.size * 1.12)}px">${A(first)}</p>`;
  y += ft.lines * Math.round(ft.size * 1.12) + 8;
  for (const l of B.lines.others || []) { o += text(ph ? 'c-body ph-tight' : 'c-body', X0, y, 578, A(l)); y += ph ? 24 : nL(ctx, l, 14, 578) * 21; }
  y += 32;
  // the three faces, each named in itself
  const cols = [['Display', 'display', heaviest(f.display)], ['Body', 'body', 500], ['Mono', 'mono', 400]];
  cols.forEach(([role, key, w], i) => {
    const x = X0 + i * 196;
    o += text('c-label', x, y, 184, A(role));
    o += `<p class="a nw" style="left:${x}px;top:${y + 20}px;${brandText(ctx, key, w)};font-size:18px;line-height:24px">${A(f[key].family)}</p>`;
  });
  y += 24 + 24 + 40;
  // the palette as one run of chips, wider where the colour is used more, each wide enough to carry its name and value
  o += text('c-label', X0, y, 300, 'Palette');
  y += 24;
  const cs = ctx.colours, tot = cs.reduce((a, c) => a + (c.share || 0.05), 0);
  o += `<div class="a kt-run" style="left:${X0}px;top:${y}px;width:578px">${cs.map((c) => `<div class="kt-ru" style="flex:${Math.max(1, Math.round(((c.share || 0.05) / tot) * 100))} 1 0"><i style="background:${c.hex}${edge(ctx, c.hex)}"></i><b class="c-note nw">${A(c.name)}</b><span class="c-value nw">${A(c.hex)}</span></div>`).join('')}</div>`;
  y += 56 + 8 + 17 + 14 + 48;
  // how to use it, in three short steps
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. Every face is under the SIL Open Font License, free for commercial use.'],
  ];
  const hh = Math.max(...how.map(([a, b]) => nL(ctx, a, 12, 184, 600) * 17 + nL(ctx, b, 12, 184) * 17));
  y = Math.max(y, FLOOR - hh - 24 - 8);
  o += hair(y - 16);
  o += text('c-label', X0, y, 300, 'How to use it');
  how.forEach(([a, b], i) => {
    const x = X0 + i * 196;
    o += text('c-note', x, y + 24, 184, `<b style="font-weight:600">${A(a)}</b><br>${A(b)}`);
  });
  return ['read-me-2', { hp: HP, hit: hit(n, X0, 200, 200) }, o];
}

export function readMe(ctx) {
  return numbered(ctx, '00 Read me', [readMe1(ctx), readMe2(ctx)]);
}

// ================================================================================== the sheets
function paletteSheet(ctx) {
  const P = pressOf(ctx), cs = ctx.colours, HP = 232;
  const cmykOf = (c) => (c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join(' ') : '');
  const hasK = cs.some((c) => c.cmyk);
  const tonesH = ctx.tones.length ? 40 + ctx.tones.reduce((a, t) => a + nL(ctx, t.lands || '', 12, 300) * 17 + 16, 0) : 0;
  const GAP = 8;
  // the strips: each colour is a full-width chip with its values printed on it, in whichever ink reads
  const need = cs.map((c) => Math.max(92, 40 + nL(ctx, c.lands || '', 12, 250) * 17 + 16));
  let hs = need.slice(); const room = FLOOR - 272 - tonesH - (cs.length - 1) * GAP;
  while (hs.reduce((a, b) => a + b, 0) > room && hs.some((h) => h > 76)) hs = hs.map((h) => (h > 76 ? h - 2 : h));
  let o = plateLabel('Colour');
  o += plateNote(A(`${Word(cs.length)} colours${ctx.tones.length ? ` and ${word(ctx.tones.length)} tones` : ''}, as ASE, CSS and JSON.`), 403, 72, 224);
  let y = 272;
  cs.forEach((c, i) => {
    const ink = inkOn(ctx, c.hex), h = hs[i];
    const vals = [['HEX', c.hex, 276, 14], ['RGB', c.rgb, 356, 14], ['OKLCH', c.oklch, 276, 54], ...(hasK && cmykOf(c) ? [['CMYK', cmykOf(c), 444, 54]] : [])];
    let vh = '';
    for (const [k, v, vx, vy] of vals) vh += `<p class="a c-label" style="left:${vx}px;top:${vy}px;color:${ink}">${k}</p><p class="a c-value nw" style="left:${vx}px;top:${vy + 16}px;color:${ink}">${A(v)}</p>`;
    o += `<div class="a kt-chip" style="left:${X0}px;top:${y}px;width:578px;height:${h}px;background:${c.hex}${edge(ctx, c.hex)}">
<p class="a c-body" style="left:16px;top:12px;font-weight:600;color:${ink}">${A(c.name)}</p>
<p class="a c-note" style="left:16px;top:40px;width:250px;color:${ink}">${A(c.lands || '')}</p>${vh}</div>`;
    y += h + GAP;
  });
  y += 24;
  if (ctx.tones.length) {
    o += text('c-label', X0, y, 400, 'Tones in the palette files');
    y += 24;
    for (const t of ctx.tones) {
      const h = nL(ctx, t.lands || '', 12, 300) * 17 + 16;
      o += hair(y);
      o += `<i class="a" style="left:${X0}px;top:${y + 10}px;width:12px;height:12px;background:${t.hex}${edge(ctx, t.hex)}"></i>`;
      o += text('c-note nw', X0 + 24, y + 8, 160, A(t.name), 'font-weight:600');
      o += text('c-value nw', 227, y + 9, 80, A(t.hex));
      o += text('c-note', 327, y + 8, 300, A(t.lands || ''));
      y += h;
    }
    o += hair(y);
  }
  return [['palette', { hp: HP, hit: hit(cs.length, X0, 200, 200) }, o]];
}

function typeSheet(ctx) {
  const B = bookBrand(ctx), f = B.fonts, T = B.type, HP = 392;
  const charset = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'];
  const dw = heaviest(f.display);
  // plate: the sample headline, and the count of faces
  const hl = (() => { const st = displayStem(ctx); for (let s = 60; s > 36; s -= 2) { const l = wrap(st, T.sample.headline, s, 330); if (l.length <= 3 && l.every((x) => inkW(st, x, s) <= 330)) return { size: s, n: l.length }; } return { size: 36, n: wrap(displayStem(ctx), T.sample.headline, 36, 330).length }; })();
  let o = plateLabel('Type', X0);
  o += `<p class="a" style="left:${X0}px;top:96px;width:342px;${brandText(ctx, 'display', dw)};font-size:${hl.size}px;line-height:${Math.round(hl.size * 1.07)}px;color:var(--ptxt)">${A(T.sample.headline)}</p>`;
  const it = (face) => ((face.italics || []).length ? `, italic ${face.italics.join(', ')}` : '');
  const fit = (st, hi, lo, wmax) => { for (let s = hi; s >= lo; s--) if (charset.every((l) => inkW(st, l, s) <= wmax)) return s; return lo; };
  const rows = [];
  // display: the whole character set in the face
  { const s = fit(displayStem(ctx), 30, 12, f.display.stretch && f.display.stretch > 100 ? 200 : 270), lh = Math.round(s * 1.35);
    rows.push({ role: 'Display', key: 'display', w: dw, note: `Weights ${f.display.weights.join(', ')}${it(f.display)}${f.display.stretch ? `, width ${f.display.stretch}` : ''}.`,
      h: charset.length * lh, html: charset.map((l, i) => `<p class="a nw" style="left:285px;top:@Y+${i * lh}px;${brandText(ctx, 'display', dw)};font-size:${s}px;line-height:${lh}px">${l}</p>`).join('') }); }
  // body: the character set, then each weight named in itself
  { const s = fit(bst(ctx, 400), 20, 14, 330), lh = Math.round(s * 1.5), wl = f.body.weights;
    rows.push({ role: 'Body', key: 'body', w: 500, note: `Weights ${wl.join(', ')}${it(f.body)}.`,
      h: charset.length * lh + 16 + wl.length * 24,
      html: charset.map((l, i) => `<p class="a nw" style="left:285px;top:@Y+${i * lh}px;${brandText(ctx, 'body', 400)};font-size:${s}px;line-height:${lh}px">${l}</p>`).join('') +
        wl.map((w, i) => `<p class="a nw" style="left:285px;top:@Y+${charset.length * lh + 16 + i * 24}px;${brandText(ctx, 'body', w)};font-size:15px;line-height:24px">${A(`${WEIGHT_NAMES[w] || w} ${w}`)}</p>`).join('') }); }
  // mono: only literal values, so its specimen is the palette's own hex values and the digits
  { const hx = ctx.colours.map((c) => c.hex), lines = Math.ceil(hx.length / 3);
    rows.push({ role: 'Mono', key: 'mono', w: 400, note: 'For a hex, a token or a code string only.',
      h: lines * 24 + 16 + 28,
      html: hx.map((h, i) => `<p class="a nw" style="left:${285 + (i % 3) * 112}px;top:@Y+${Math.floor(i / 3) * 24}px;${brandText(ctx, 'mono', 400)};font-size:15px;line-height:24px">${A(h)}</p>`).join('') +
        `<p class="a nw" style="left:285px;top:@Y+${lines * 24 + 16}px;${brandText(ctx, 'mono', 400)};font-size:20px;line-height:28px">${charset[2]}</p>` }); }
  let y = HP + 32;
  for (const r of rows) {
    const faceNote = `${r.note}`, left = 14 + 8 + 30 + 8 + nL(ctx, faceNote, 12, 224) * 17 + 17;
    const h = Math.max(r.h, left);
    o += hair(y);
    o += text('c-label', X0, y + 20, 224, A(r.role));
    o += `<p class="a" style="left:${X0}px;top:${y + 42}px;width:224px;${brandText(ctx, r.key, r.w)};font-size:24px;line-height:30px">${A(f[r.key].family)}</p>`;
    o += text('c-note', X0, y + 80, 224, A(faceNote) + (r.key === 'mono' ? '' : ' ') + '<br>SIL Open Font License 1.1.');
    o += r.html.replace(/@Y\+(\d+)px/g, (_, d) => `${y + 20 + +d}px`);
    y += h + 40;
  }
  return [['typefaces', { hp: HP, hit: hit(familyCount(ctx), 403, 348, 180, 216) }, o]];
}

// natural size of a jpeg, read from its header
function jpegSize() { throw new Error('theme 28: photograph files are not read by the server export'); }
const aspectOf = (ctx, s) => { const c = s.crop || jpegSize(); return c.w / c.h; };
// a photograph cropped to the shot's safe box, filling a w x h box, clean, nothing laid over it
function cropped(ctx, s, x, y, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) / 2, oy = (h - c.h * k) / 2, r = (v) => Math.round(v * 100) / 100;
  return `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden">${plateImg(A(ctx.photoUrl(s.photo)), A(s.alt), `position:absolute;display:block;max-width:none;width:${r(n.w * k)}px;height:${r(n.h * k)}px;left:${r(ox - c.x * k)}px;top:${r(oy - c.y * k)}px`)}</div>`;
}
const shotName = (ctx, s) => s.caption || ctx.cap(s.id);

// a shot still to be taken is a plate waiting for it: the plate's ink with the brief set on it. Returns the ink (for the tab) and the words (for the sheet).
function brief(ctx, s, x, y, w, h, size, lh, display) {
  const ink = `<div class="dr mot" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:2;background:var(--plate)"></div>`;
  const words = `<p class="a" style="left:${x + 20}px;top:${y + 20}px;width:${w - 40}px;${display ? brandText(ctx, 'display', heaviest(ctx.brand.fonts.display)) : ''};font-size:${size}px;line-height:${lh}px;color:var(--ptxt)">${A(s.slot)}</p>`;
  return { ink, words };
}

function photoSheets(ctx) {
  const B = bookBrand(ctx), D = B.imagery.direction, shots = B.imagery.shots, HP = 232;
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  // direction: one picture, then the five lines of direction under it
  const photos = shots.filter((s) => s.photo), PA = 578 / 330;
  const lead = photos.slice().sort((a, b) => Math.abs(Math.log(aspectOf(ctx, a) / PA)) - Math.abs(Math.log(aspectOf(ctx, b) / PA)))[0] || shots[0];
  const rowH = rows.map(([, v]) => nL(ctx, v, 12, 458) * 17 + 24), rowsH = rowH.reduce((a, b) => a + b, 0);
  const PH = Math.max(150, Math.min(400, FLOOR - 272 - 32 - rowsH)), PY = 264;
  let o = plateLabel('Imagery');
  o += plateNote(A('Photography direction, and the shot list.'), 403, 72, 224);
  let tab = '';
  if (lead.photo) o += cropped(ctx, lead, X0, PY, 578, PH);
  else { const b = brief(ctx, lead, X0, PY, 578, PH, 22, 28, true); tab += b.ink; o += b.words; }
  let y = PY + PH + 32;
  rows.forEach(([k, v], i) => {
    o += hair(y);
    o += text('c-label', X0, y + 12, 112, A(k));
    o += text('c-note', 169, y + 12, 458, A(v));
    y += rowH[i];
  });
  o += hair(y);
  const first = ['photography-1', { hp: HP, hit: hit(rows.length, X0, 200, 200), tab }, o];
  // the shot list: two across, three down a page. Each shot is its photograph, or the plate waiting for it, with its name under it.
  const pages = [first];
  const CW = 283, GX = 12;
  for (let p = 0; p * 6 < shots.length; p++) {
    const chunk = shots.slice(p * 6, p * 6 + 6), nr = Math.ceil(chunk.length / 2);
    // a credit prints only for a real photographer (generated shots carry none), and once on the page, not under every shot
    const credited = chunk.find((s) => s.photo && s.credit && !s.generated);
    const sub = (s) => (s.photo ? `${s.alt}${s === credited ? `. Photo: ${s.credit}` : ''}.` : '');
    const txtH = [];
    for (let r = 0; r < nr; r++) txtH.push(Math.max(...chunk.slice(r * 2, r * 2 + 2).map((s) => nL(ctx, shotName(ctx, s), 14, CW, 600) * 21 + (sub(s) ? nL(ctx, sub(s), 12, CW) * 17 : 0))));
    const IH = Math.max(110, Math.min(176, Math.floor((FLOOR - 264 - txtH.reduce((a, b) => a + b + 12 + 28, 0)) / nr)));
    let q = plateLabel('Shot list', X0), tb = '', yy = 264;
    const shown = chunk.filter((s) => s.photo).length;
    q += plateNote(A(`${Word(chunk.length)} shots on this page, ${shown ? `${word(shown)} with a photo` : 'none with a photo'} so far.`), X0, 72, 224);
    for (let r = 0; r < nr; r++) {
      chunk.slice(r * 2, r * 2 + 2).forEach((s, c) => {
        const x = X0 + c * (CW + GX);
        if (s.photo) q += cropped(ctx, s, x, yy, CW, IH);
        else { const b = brief(ctx, s, x, yy, CW, IH, 12, 17, false); tb += b.ink; q += b.words; }
        q += text('c-body', x, yy + IH + 12, CW, A(shotName(ctx, s)), 'font-weight:600');
        if (sub(s)) q += text('c-note', x, yy + IH + 12 + nL(ctx, shotName(ctx, s), 14, CW, 600) * 21, CW, A(sub(s)));
      });
      yy += IH + 12 + txtH[r] + 28;
    }
    pages.push([`photography-${p + 2}`, { hp: HP, hit: hit(chunk.length, 403, 200, 200, 216), tab: tb }, q]);
  }
  return numbered(ctx, '05 Imagery', pages);
}

function iconSheet(ctx) {
  const B = ctx.brand, set = iconSet(ctx), s = ctx.iconStyle, n = set.length;
  const hero = set.find((x) => !ICON_SET.includes(x)) || set[0];
  const joinWord = { miter: 'mitred', round: 'round', bevel: 'bevelled' }[s.join] || s.join;
  const COLS = 4, CWD = 578 / COLS, RH = 104, SIZE = 40;
  const cell = (name, i, y0) => {
    const x = X0 + (i % COLS) * CWD, y = y0 + Math.floor(i / COLS) * RH;
    return `${hair(y, x, CWD - 12)}<span class="a kt-ic" style="left:${x}px;top:${y + 16}px;width:${SIZE}px;height:${SIZE}px">${icon(ctx, name, SIZE)}</span>${text('c-value nw', x, y + 70, CWD - 12, A(name) + '.svg')}`;
  };
    const pages = [];
  let o = plateLabel('Icons');
  o += plateNote(A(`${Word(n)} icons from Lucide, drawn in the ${B.name} stroke: ${s.stroke} px lines at 24 px, ${s.cap} ends and ${joinWord} corners.`), 403, 72, 224);
  o += `<span class="a kt-ic" style="left:${X0}px;top:288px;width:200px;height:200px">${icon(ctx, hero, 200)}</span>`;
  o += text('c-body', 285, 316, 342, A('Each icon is one SVG file in 04 Icons/svg. It takes the colour of the text beside it (currentColor), so it never needs a colour of its own. The ISC licence is in LICENSE.txt.'));
  o += text('c-note', 285, 316 + nL(ctx, 'Each icon is one SVG file in 04 Icons/svg. It takes the colour of the text beside it (currentColor), so it never needs a colour of its own. The ISC licence is in LICENSE.txt.', 14, 342) * 21 + 16, 342, A(`The large icon is ${hero}, drawn at 200 px; the file is 24 px.`));
  const firstGridTop = 528;
  o += set.slice(0, Math.min(n, Math.floor((FLOOR - firstGridTop) / RH) * COLS)).map((nm, i) => cell(nm, i, firstGridTop)).join('');
  const shown = Math.min(n, Math.floor((FLOOR - firstGridTop) / RH) * COLS);
  pages.push(['icons-1', { hp: 232, hit: hit(n, X0, 200, 200) }, o]);
  // further pages: the rest of the set, four across
  const perPage = Math.floor((FLOOR - 272) / RH) * COLS;
  for (let p = 0; shown + p * perPage < n; p++) {
    const chunk = set.slice(shown + p * perPage, shown + (p + 1) * perPage);
    let q = plateLabel('Icons', X0);
    q += plateNote(A('The rest of the set.'), 403, 72, 224);
    q += chunk.map((nm, i) => cell(nm, i, 272)).join('');
    pages.push([`icons-${p + 2}`, { hp: 232, hit: hit(chunk.length, 403, 200, 200, 216) }, q]);
  }
  return numbered(ctx, '04 Icons', pages);
}

export function sheets(ctx) {
  return { palette: numbered(ctx, '02 Colour', paletteSheet(ctx)), typefaces: numbered(ctx, '03 Type', typeSheet(ctx)), photography: photoSheets(ctx), icons: iconSheet(ctx) };
}

export function css() {
  return `.pg .kt-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .kt-chip{overflow:hidden}
.pg .kt-chip p{margin:0}
.pg .kt-ic{display:block;color:var(--key)}
.pg .kt-ic svg{display:block}
.pg .kt-run{display:flex}
.pg .kt-ru{display:flex;flex-direction:column;align-items:flex-start;min-width:auto}
.pg .kt-ru i{display:block;width:100%;height:56px;margin-bottom:8px}
.pg .kt-ru b{font-weight:600;padding-right:12px}
.pg .kt-ru span{padding-right:12px}
`;
}
