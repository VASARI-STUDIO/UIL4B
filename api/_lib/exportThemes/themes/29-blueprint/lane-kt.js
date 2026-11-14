// Theme 29 (Blueprint), lane kt: the brand kit PDFs (readMe and sheets), as drawing sheets. Every page is the same A3 sheet as the guidelines: the ruled
// frame with zone references, centring marks and the title block at the foot, whose Sheet cell counts the pages of that one PDF (001 of 00n).
// Redlines print only a true size: the wordmark in mm on the read-me, the share of each colour on the palette sheet, the cap height of the display
// face on the type sheet, and the icon's own 24 px on the icon sheet (drawn at 20:1, so the scale says so). Chrome is Chivo and Chivo Mono; brand
// type is only ever the brand's own art. Brand copy is printed whole through esc(); measuring only counts lines, it never cuts a string.
// Icons: the engine prints sheets().icons as 04 Icons/Icons.pdf, so it is returned there and never put inside the read-me.
import { plateImg } from '../../engine/plate.js';
import { esc as A } from '../../engine/brand.js';
import { capHeight, outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { icon, iconSet, ICON_SET } from '../../engine/components.js';
import { inkW, wrap, fitW, baseline, bodyStem, displayStem, heaviest, shown } from './measure.js';
import { WEIGHT_NAMES } from './weights.js';
import { ZX, ZY, r1, PX, reds } from './lane-g1-sheet.js';
import { phTight } from "./ph.js";

const INK = '#1F2A33', FILM = '#EEF1F2', HAIR = '#C3CBD0';
const pad3 = (n) => String(n).padStart(3, '0');
const T = (cls, x, y, w, html, st = '') => `<p class="a ${cls}" style="left:${r1(x)}px;top:${r1(y)}px;${w ? `width:${r1(w)}px;` : ''}${st}">${html}</p>`;
const rule = (x, y, w) => `<span class="hl" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px"></span>`;
// the number of lines a run of sheet text sets in at a size and width (a little narrower than the box, so the browser never sets one more)
const nLines = (text, size, w, stem = 'Chivo-400') => wrap(stem, String(text), size, w - 8).length;
const bodyLines = (ctx, text, size, w, weight = 400) => wrap(bodyStem(ctx, weight), String(text), size, w - 8).length;
// a hanging number and its note, in the drawing's general-notes manner
const note = (x, y, w, n, html) => `<span class="a c-mono" style="left:${x}px;top:${y}px;line-height:20px">${n}</span>${T('c-note', x + 24, y, w - 24, html)}`;
const joinList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);

// ---- the sheet: frame, zones, centring marks and the title block, with this PDF's own sheet count ---------------------------------------
function kSheet(ctx, id, { drawing, section, scale, no, total }, inner) {
  const B = ctx.brand, cell = (k, lab, val) => `<span class="tl" style="left:${ZX[k] + 24}px;top:987px">${A(lab)}</span>${val}`;
  const d = new Date(B.version.date + 'T00:00:00Z');
  const rev = `${B.version.number}, ${d.getUTCDate()} ${d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
  const size = [22, 20, 18].find((s) => inkW('Chivo-500', drawing, s) <= 328) || 18;
  const lw = fitW(ctx, 'horizontal', 140, 40), lh = (lw * ctx.logo.geos.horizontal.h) / ctx.logo.geos.horizontal.w;
  const crisp = (v) => Math.round(v) + 0.5;
  let svg = `<rect x="16" y="16" width="1555" height="1091" stroke="var(--quiet)" stroke-width=".75"/>`;
  for (let k = 0; k < 9; k++) { const x = crisp(ZX[k]); svg += `<path d="M${x} 16V40M${x} 1083V1107" stroke="var(--quiet)" stroke-width="1"/>`; }
  for (let j = 0; j < 7; j++) { const y = crisp(ZY[j]); svg += `<path d="M16 ${y}H40M1547 ${y}H1571" stroke="var(--quiet)" stroke-width="1"/>`; }
  svg += `<path d="M793.5 0V40M793.5 1083V1123M0 561.5H40M1547 561.5H1587" stroke="var(--ink)" stroke-width="1.5"/>`;
  svg += `<rect x="40" y="40" width="1507" height="1043" stroke="var(--ink)" stroke-width="1.5"/><path d="M40 971H1547" stroke="var(--ink)" stroke-width="1.5"/>`;
  for (const k of [2, 3, 4, 5, 6, 7]) svg += `<path d="M${crisp(ZX[k])} 972V1082" stroke="var(--hair)" stroke-width="1"/>`;
  const zw = 188.375;
  const nums = Array.from({ length: 8 }, (_, k) => [22, 1089].map((y) => `<span class="zr" style="left:${ZX[k]}px;width:${zw}px;top:${y}px">${k + 1}</span>`).join('')).join('');
  const lets = Array.from({ length: 6 }, (_, j) => [22, 1553].map((x) => `<span class="zr" style="left:${x}px;width:12px;top:${ZY[j] + 86.9 - 7}px">${'ABCDEF'[j]}</span>`).join('')).join('');
  const tb = [
    cell(0, 'Drawing', `<span class="tv t" style="left:${ZX[0] + 24}px;top:1007px;font-size:${size}px">${A(drawing)}</span>`),
    cell(2, 'Section', `<span class="tv" style="left:${ZX[2] + 24}px;top:1007px">${A(section)}</span>`),
    cell(3, 'Scale', `<span class="tv nw" style="left:${ZX[3] + 24}px;top:1007px">${A(scale)}</span>`),
    cell(4, 'Revision', `<span class="tv" style="left:${ZX[4] + 24}px;top:1007px">${A(rev)}</span>`),
    cell(5, 'Project', `<span class="tv" style="left:${ZX[5] + 24}px;top:1007px;font-weight:500">${A(B.name)}</span><span class="tv c-quiet" style="left:${ZX[5] + 24}px;top:1025px;color:var(--quiet)">Brand kit</span>`),
    cell(6, 'Sheet', `<span class="sn" style="left:${ZX[6] + 24}px;top:1007px">${pad3(no)}<small> of ${pad3(total)}</small></span>`),
    `<span class="a" style="left:${ZX[7] + 24}px;top:${1027 - lh / 2}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, label: 'Logo' })}</span>`,
  ].join('');
  return `<section class="pg${phTight(ctx, id)}" data-page="${id}">${inner}<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" aria-hidden="true">${svg}</svg>${nums}${lets}${tb}</section>`;
}

// ---- colour fields ----------------------------------------------------------------------------------------------------------------------
// the text colour on a field: the brand's own pair for that background if it holds 4.5 : 1, else ink or white by ratio
function onField(ctx, hex) {
  const own = ctx.pairs.filter((p) => p.bgHex.toUpperCase() === hex.toUpperCase()).sort((a, b) => b.ratio - a.ratio)[0];
  if (own && own.ratio >= 4.5) return own.fgHex;
  return ctx.ratio('#FFFFFF', hex) >= ctx.ratio(INK, hex) ? '#FFFFFF' : INK;
}
// every colour as a field in proportion to its share, touching, from the frame's left to its right; none under 48, the shortfall taken off the widest
function fieldRun(ctx, y0, h) {
  const cs = ctx.colours, n = cs.length;
  let w = cs.map((c) => (c.share || 1 / n) * 1507), short = 0;
  w = w.map((x) => { if (x < 48) { short += 48 - x; return 48; } return x; });
  w[w.indexOf(Math.max(...w))] -= short;
  w = w.map((x) => Math.round(x * 10) / 10); w[n - 1] = Math.round((1507 - w.slice(0, -1).reduce((a, b) => a + b, 0)) * 10) / 10;
  let x = 40, html = ''; const edges = [40];
  cs.forEach((c, i) => {
    const ink = onField(ctx, c.hex), faint = ctx.ratio(c.hex, FILM) < 1.3;
    let lab = '';
    if (w[i] >= 160) lab = `<span class="a c-mono" style="left:16px;top:16px;color:${ink}">C${i + 1}</span><span class="a bn nw" style="left:16px;top:34px;font:600 15px/20px var(--body);color:${ink}">${A(c.name)}</span><span class="a c-mono" style="left:16px;top:56px;color:${ink}">${A(c.hex)}</span>`;
    else if (w[i] >= 40) lab = `<span class="a c-mono" style="left:12px;top:16px;color:${ink}">C${i + 1}</span>`;
    html += `<div class="fld" style="left:${r1(x)}px;top:${y0}px;width:${w[i]}px;height:${h}px;background:${c.hex}${faint ? ';box-shadow:inset 1px 0 0 var(--hair),inset -1px 0 0 var(--hair),inset 0 -1px 0 var(--hair)' : ''}">${lab}</div>`;
    x += w[i]; edges.push(r1(x));
  });
  return { html, edges, w };
}
// the share, drawn as a chain dimension under the fields: one segment per field, the oblique ticks shared at the edges
function chain(ctx, edges, yField, yLine) {
  let svg = '', vals = '';
  edges.forEach((x, i) => {
    if (i && i < edges.length - 1) svg += `<line x1="${x}" y1="${yField + 4}" x2="${x}" y2="${yLine + 6}" stroke-width="1"/>`;
    svg += `<line x1="${r1(x - 3.5)}" y1="${yLine + 3.5}" x2="${r1(x + 3.5)}" y2="${yLine - 3.5}" stroke-width="1.5"/>`;
  });
  svg = `<line x1="${edges[0]}" y1="${yLine}" x2="${edges[edges.length - 1]}" y2="${yLine}" stroke-width="1.5"/>` + svg;
  ctx.colours.forEach((c, i) => { vals += `<span class="rv" style="left:${r1((edges[i] + edges[i + 1]) / 2)}px;top:${yLine + 10}px;transform:translateX(-50%)">${Math.round((c.share || 0) * 100)}%</span>`; });
  return `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" stroke="var(--red)" aria-hidden="true">${svg}</svg>${vals}`;
}

// ---- the read-me ------------------------------------------------------------------------------------------------------------------------
const familyCount = (ctx) => new Set(ctx.faces.map((f) => f.family)).size;

function readMe1(ctx, total) {
  const B = ctx.brand, slot = ctx.edition === 'slot', R = reds();
  const real = B.imagery.shots.filter((s) => s.photo).length, briefs = B.imagery.shots.length - real;
  // the wordmark at sheet size, with its true width and height in mm
  const g = ctx.logo.geos.colour, lw = Math.floor(Math.min(620, (200 * g.w) / g.h)), lh = (lw * g.h) / g.w, X = ZX[0] + 24, Y = 136;
  let o = `<div class="a" style="left:${X}px;top:${Y}px;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div>`;
  R.dim([X, Y], [X + lw, Y], [0, -1], { d: 28, value: String(Math.round(lw / PX)) });
  R.dim([X + lw, Y], [X + lw, Y + lh], [1, 0], { d: 28, value: String(Math.round(lh / PX)), place: 'side' });
  o += T('c-note', X, Y + lh + 56, 440, A(B.description));
  // the five folders: a register, one row each, with what is in it counted from the brand
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide on a clear ground.', slot ? 'Slot frame' : `${ctx.logo.versions.length} versions`],
    ['02 Colour', 'The palette for Adobe (ASE), CSS and JSON, and the finishes schedule.', `${ctx.colours.length} colours, ${ctx.tones.length} tones`],
    ['03 Type', 'The lettering sheet, and fonts.md with each face\'s link and licence.', `${familyCount(ctx)} faces`],
    ['04 Icons', 'One SVG per icon at 24 px, in the brand\'s stroke, with the Lucide licence, and the icon sheet.', `${iconSet(ctx).length} icons`],
    ['05 Imagery', real ? 'The photography direction and shot list, and the photos.' : 'The photography direction and the shot list.', [real && `${real} photos`, briefs && `${briefs} briefs`].filter(Boolean).join(', ')],
  ];
  const RX = ZX[4] + 24, RW = 1523 - RX, WX = RX + 128, WW = 384;
  o += T('c-head', RX, 64, 400, 'Folders in this kit');
  o += T('c-label', RX, 100, 120, 'Folder') + T('c-label', WX, 100, 200, 'What is in it') + T('c-label', 1523 - 140, 100, 140, 'Count', 'text-align:right');
  let y = 124;
  for (const [name, what, count] of folders) {
    const h = Math.max(1, nLines(what, 13, WW)) * 20 + 28;
    o += rule(RX, y, RW);
    o += T('c-mono', RX, y + 14, 120, A(name), 'line-height:20px') + T('c-note', WX, y + 14, WW, A(what)) + T('c-label', 1523 - 140, y + 16, 140, A(count), 'text-align:right');
    y += h;
  }
  o += rule(RX, y, RW);
  // how to use it, as general notes
  const how = [
    slot ? 'Drop the approved logo files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour logo on light grounds and the reversed logo on dark ones. The guidelines show every ground.',
    'Take colour from the files: open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.',
    'Install the faces. The links in fonts.md go to Google Fonts, and every face is under the SIL Open Font Licence, free for commercial use.',
  ];
  let ny = y + 56;
  o += T('c-head', RX, ny, 400, 'How to use it'); ny += 38;
  how.forEach((t, i) => { o += note(RX, ny, 480, i + 1, A(t)); ny += nLines(t, 13, 456) * 20 + 16; });
  return kSheet(ctx, 'read-me-1', { drawing: 'Read me', section: '00 Kit', scale: 'Not to scale, sizes in mm', no: 1, total }, o + R.svg());
}

function readMe2(ctx, total) {
  const B = ctx.brand, f = B.fonts, T3 = [ZX[0] + 24, ZX[3] + 24, ZX[6] + 24], Wc = [517, 517, 329];
  const F = fieldRun(ctx, 40, 540), LY = 584, CY = 616;
  let o = F.html;
  // under the fields: the logo, the faces each named in itself, the lines
  const lw = fitW(ctx, 'horizontal', 400, 96);
  o += T('c-label', T3[0], LY, 200, 'Logo') + `<div class="a" style="left:${T3[0]}px;top:${CY}px;width:${lw}px">${ctx.logo.html('horizontal', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div>`;
  const dsz = [40, 36, 32, 28].find((s) => inkW(displayStem(ctx), f.display.family, s, -0.01) <= Wc[1]) || 28;
  o += T('c-label', T3[1], LY, 200, 'Type');
  o += T('bd', T3[1], CY, null, A(f.display.family), `font-size:${dsz}px;line-height:${dsz + 8}px`);
  const same = f.display.family === f.body.family;
  let by = CY + dsz + 8 + 16;
  if (!same) { o += T('bn nw', T3[1], by, null, A(f.body.family), 'font-weight:500;font-size:22px;line-height:28px;color:var(--b-text)'); by += 44; }
  const caps = `Display ${f.display.weights.join(', ')}${f.display.stretch ? `, width ${f.display.stretch}` : ''}${same ? ' and body' : '. Body'} ${f.body.weights.join(', ')}.${f.mono ? ` ${f.mono.family} for a hex, a token or a code string only.` : ''}`;
  o += T('c-note c-quiet', T3[1], by, Wc[1], A(caps));
  o += T('c-label', T3[2], LY, 200, 'Lines');
  const first = B.lines.primary, fl = bodyLines(ctx, first, 22, Wc[2], 500);
  o += T('bn', T3[2], CY, Wc[2], A(first), 'font-weight:500;font-size:22px;line-height:28px;color:var(--b-text)');
  let ly = CY + fl * 28 + 12;
  for (const l of B.lines.others) { o += T('bn', T3[2], ly, Wc[2], A(l), 'font-size:15px;line-height:24px;color:var(--b-text)'); ly += bodyLines(ctx, l, 15, Wc[2]) * 24 + 4; }
  if ((B.personality || []).length) { ly += 20; o += T('c-label', T3[2], ly, 200, 'Personality') + T('c-note', T3[2], ly + 20, Wc[2], A(B.personality.map((p) => p.trait).join(', '))); }
  return kSheet(ctx, 'read-me-2', { drawing: 'The brand on one page', section: '00 Kit', scale: 'Share of a page', no: 2, total }, o);
}

export function readMe(ctx) { return [readMe1(ctx, 2), readMe2(ctx, 2)]; }

// ---- the palette sheet: the finishes schedule -----------------------------------------------------------------------------------------
function paletteSheet(ctx) {
  const cs = ctx.colours, n = cs.length, total = 1;
  const fh = Math.max(380, 580 - Math.max(0, n - 5) * 36), F = fieldRun(ctx, 40, fh);
  let o = F.html + chain(ctx, F.edges, 40 + fh, 40 + fh + 28);
  // the schedule: value columns hang from the right, as wide as their widest value
  const hasK = cs.some((c) => c.cmyk), kOf = (c) => (c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join(' ') : '');
  const vals = [['HEX', (c) => c.hex], ['RGB', (c) => c.rgb], ['OKLCH', (c) => c.oklch], ...(hasK ? [['CMYK', kOf]] : [])];
  const mw = (s) => inkW('ChivoMono-400', String(s), 12);
  const vw = vals.map(([h, f]) => Math.ceil(Math.max(inkW('Chivo-400', h, 12), ...cs.map((c) => mw(f(c))))));
  let vx = 1523; const vxs = []; for (let i = vals.length - 1; i >= 0; i--) { vx -= vw[i]; vxs[i] = vx; vx -= 32; }
  const LX = 440.8, LW = vx + 32 - 24 - LX;
  const top = 40 + fh + 28 + 52;
  o += T('c-label', 64, top, 80, 'Finish') + T('c-label', 300, top, 120, 'Role') + T('c-label', LX, top, 200, 'Where it lands');
  vals.forEach(([h], i) => { o += T('c-label', vxs[i], top, vw[i], h); });
  let y = top + 24;
  cs.forEach((c, i) => {
    o += rule(64, y, 1459) + `<span class="a" style="left:64px;top:${y + 12}px;width:12px;height:12px;background:${c.hex};box-shadow:inset 0 0 0 1px var(--hair)"></span>`;
    o += T('c-mono', 84, y + 8, 32, `C${i + 1}`, 'line-height:20px');
    o += T('bn nw', 124, y + 8, 168, A(c.name), 'font:600 15px/20px var(--body);color:var(--b-text)');
    o += T('c-note', 300, y + 8, 120, A(c.role), 'line-height:20px') + T('c-note', LX, y + 8, LW, A(c.lands || ''), 'line-height:18px');
    vals.forEach(([, f], k) => { o += T('c-mono', vxs[k], y + 8, vw[k] + 8, A(f(c)), 'line-height:20px'); });
    y += 36 + (nLines(c.lands || '', 13, LW) > 1 ? 16 : 0);
  });
  o += rule(64, y, 1459);
  // the tones that ride along in the palette files
  if (ctx.tones.length) {
    let tx = 64; o += T('c-label', tx, y + 20, 200, 'Tones in the palette files');
    tx += inkW('Chivo-400', 'Tones in the palette files', 12) + 40;
    ctx.tones.forEach((t) => {
      const tnw = inkW('Chivo-500', shown(ctx, t.name), 13) + (ctx.placeholders ? 10 : 0); // slot: the printed placeholder, not the sentinel
      const w = 12 + 8 + tnw + 8 + mw(t.hex);
      o += `<span class="a" style="left:${r1(tx)}px;top:${y + 25}px;width:12px;height:12px;background:${t.hex};box-shadow:inset 0 0 0 1px var(--hair)"></span>`;
      o += T('c-note nw', tx + 20, y + 18, null, `<span style="font-weight:500">${A(t.name)}</span>`) + T('c-mono nw', tx + 28 + tnw, y + 18, null, A(t.hex), 'line-height:20px');
      tx += w + 32;
    });
  }
  return kSheet(ctx, 'palette', { drawing: 'Finishes schedule', section: '02 Colour', scale: 'Share of a page', no: 1, total }, o);
}

// ---- the lettering sheet --------------------------------------------------------------------------------------------------------------
function typeSheet(ctx) {
  const B = ctx.brand, f = B.fonts, Ty = B.type, ds = displayStem(ctx), total = 1;
  const font = loadFont(ds), SX = 64, SW = 800;
  // the specimen: the brand's sample headline at the largest size that sets in two lines, else three
  const sample = Ty.sample.headline;
  let size = [120, 112, 104, 96, 88, 80, 72].find((s) => wrap(ds, sample, s, SW, -0.01).length <= 2) || [88, 80, 72, 64, 56].find((s) => wrap(ds, sample, s, SW, -0.01).length <= 3) || 56;
  const ls = wrap(ds, sample, size, SW, -0.01), top = 88, base = top + baseline(ds, size, size), cap = capHeight(font, size);
  const widest = Math.ceil(Math.max(...ls.map((l) => inkW(ds, l, size, -0.01)))) + 8;
  let o = T('bd', SX, top, widest, A(sample), `font-size:${size}px;line-height:${size}px;white-space:normal;text-wrap:balance`);
  // the lettering lines on line 1 and the cap height as a redline
  for (const [lab, yy] of [['Cap height', base - cap], ['Baseline', base]]) o += rule(40, r1(yy), 941.9) + T('c-label', 760, r1(yy) - 20, 197, lab, 'text-align:right');
  const RXL = 880;
  o += `<svg class="a" style="left:0;top:0" width="1587" height="1123" viewBox="0 0 1587 1123" fill="none" stroke="var(--red)" aria-hidden="true"><line x1="${RXL}" y1="${r1(base - cap)}" x2="${RXL}" y2="${r1(base)}" stroke-width="1.5"/>${[base - cap, base].map((yy) => `<line x1="${RXL - 3.5}" y1="${r1(yy + 3.5)}" x2="${RXL + 3.5}" y2="${r1(yy - 3.5)}" stroke-width="1.5"/>`).join('')}</svg>`;
  o += `<span class="rv" style="left:${RXL + 12}px;top:${r1(base - cap / 2 - 6)}px">${(cap).toFixed(1)} px</span>`;
  // the display alphabet, each line in itself
  const charset = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'];
  const asz = [44, 40, 36, 32, 28, 24].find((s) => charset.every((l) => inkW(ds, l, s, -0.01) <= SW)) || 24;
  let ay = Math.max(top + ls.length * size + 72, 440);
  charset.forEach((l, i) => { o += T('bd', SX, ay + i * (asz + 12), null, A(l), `font-size:${asz}px;line-height:${asz + 12}px;font-weight:${heaviest(f.display)}`); });
  ay += 3 * (asz + 12) + 16;
  o += T('c-note c-quiet', SX, ay, SW, A(`Display, ${f.display.family}. Weight ${f.display.weights.join(', ')}${f.display.stretch ? `, width ${f.display.stretch}` : ''}. SIL Open Font Licence.`));
  // the body weights, each named in itself
  const names = f.body.weights.map((w) => `${WEIGHT_NAMES[w] || w} ${w}`);
  let wsz = 28; const rowW = (s) => names.reduce((a, t, i) => a + inkW(bodyStem(ctx, f.body.weights[i]), t, s) + 32, -32);
  while (wsz > 18 && rowW(wsz) > 880) wsz -= 2;
  let wy = ay + 72, wx = SX;
  o += T('c-label', SX, wy - 28, 300, `Body, ${f.body.family}`);
  names.forEach((t, i) => { o += `<span class="a bn nw" style="left:${r1(wx)}px;top:${wy}px;font-weight:${f.body.weights[i]};font-size:${wsz}px;line-height:${wsz + 4}px;color:var(--b-text)">${A(t)}</span>`; wx += inkW(bodyStem(ctx, f.body.weights[i]), t, wsz) + 32; });
  // right: the body paragraph at the brand's reading size, then the literal values in the mono, then the licence
  const RX = ZX[5] + 24, RW = 517, tok = (Ty.scale || []).find((x) => x.token === 'body') || { size: 16, line: 1.5 };
  const lhp = Math.round(tok.size * tok.line);
  o += T('c-head', RX, 64, RW, A(f.body.family)) + T('c-label', RX, 88, RW, `Body, weights ${f.body.weights.join(' ')}`);
  o += T('bn', RX, 124, RW, A(Ty.sample.paragraph), `font-size:${tok.size}px;line-height:${lhp}px;color:var(--b-text)`);
  let my = 124 + bodyLines(ctx, Ty.sample.paragraph, tok.size, RW) * lhp + 56;
  const act = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
  if (f.mono) {
    o += T('c-head', RX, my, RW, A(f.mono.family)) + T('c-label', RX, my + 24, RW, 'Values only');
    o += T('', RX, my + 60, RW, [A(act.hex), `rgb(${[1, 3, 5].map((i) => parseInt(act.hex.slice(i, i + 2), 16)).join(' ')})`, A(act.oklch)].map((s) => `<span style="display:block;white-space:nowrap">${s}</span>`).join(''), 'font:400 16px/24px var(--bmono);color:var(--b-text)');
  }
  const fams = [...new Set([f.display.family, f.body.family, f.mono && f.mono.family].filter(Boolean))];
  const lic = `${joinList(fams)} ${fams.length > 1 ? 'are' : 'is'} under the SIL Open Font Licence, free in print and on screen. Download ${fams.length > 1 ? 'them' : 'it'} from Google Fonts.`;
  const ll = nLines(lic, 13, RW);
  o += T('c-note c-quiet', RX, 947 - ll * 20, RW, A(lic));
  return kSheet(ctx, 'typefaces', { drawing: 'Lettering', section: '03 Type', scale: '1:1, sizes in px', no: 1, total }, o);
}

// ---- photography ------------------------------------------------------------------------------------------------------------------------
function jpegSize() { throw new Error('theme 29: photograph files are not read by the server export'); }
const aspectOf = (ctx, s) => { const c = s.crop || jpegSize(); return c.w / c.h; };
// a photograph cropped to the shot's safe box, filling a w x h box with nothing laid over it
function cropped(ctx, s, x, y, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  // the crop is slid to the shot's focus (brand.json `focus`, fractions of the picture) when it has room, so a rider is never cut at the frame edge
  const k = Math.max(w / c.w, h / c.h), f = Array.isArray(s.focus) && s.focus.length === 2 ? s.focus : [0.5, 0.5];
  const slide = (full, view, fc) => Math.min(Math.max(fc * full - view / 2, 0), full - view);
  const ox = c.w * k - w > 0.5 ? -slide(c.w * k, w, (f[0] * n.w - c.x) / c.w) : (w - c.w * k) / 2, oy = c.h * k - h > 0.5 ? -slide(c.h * k, h, (f[1] * n.h - c.y) / c.h) : (h - c.h * k) / 2;
  return `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;overflow:hidden">${plateImg(`${A(ctx.photoUrl(s.photo))}`, `${A(s.alt)}`, `position:absolute;display:block;max-width:none;width:${r1(n.w * k)}px;height:${r1(n.h * k)}px;left:${r1(ox - c.x * k)}px;top:${r1(oy - c.y * k)}px`)}</div>`;
}
// a shot with no photo yet: its brief fills the frame, on film
function brief(ctx, s, x, y, w, h, size, lh, padX, padY) {
  // the drafter's cross for a void, with the brief on a film tab so no line runs through the words
  const cross = `<svg class="a" style="left:0;top:0" width="${r1(w)}" height="${r1(h)}" fill="none" stroke="var(--hair)" stroke-width="1" aria-hidden="true"><path d="M0 0L${r1(w)} ${r1(h)}M${r1(w)} 0L0 ${r1(h)}"/></svg>`;
  return `<div class="a" style="left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:${r1(h)}px;background:var(--film2)">${cross}</div>` + T('c-note kt-tab', x + padX, y + padY, Math.min(w - 2 * padX, 520), A(s.slot), `font-size:${size}px;line-height:${lh}px`);
}
const tag = (x, y, n) => `<span class="a kt-tag" style="left:${r1(x)}px;top:${r1(y)}px">${n}</span>`;
const shotName = (ctx, s) => s.caption || ctx.cap(s.id);

function photoSheets(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, total = 1 + Math.ceil(shots.length / 6);
  const PW = 1130.3, PH = 931, PA = PW / PH;
  const photos = shots.filter((s) => s.photo).sort((a, b) => Math.abs(Math.log(aspectOf(ctx, a) / PA)) - Math.abs(Math.log(aspectOf(ctx, b) / PA)));
  const lead = photos[0] || shots[0], li = shots.indexOf(lead) + 1;
  let o = lead.photo ? cropped(ctx, lead, 40, 40, PW, PH) : brief(ctx, lead, 40, 40, PW, PH, 22, 32, 48, 64);
  o += tag(40, 40, li);
  const RX = 1194.3, RW = 329, rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  o += T('c-head', RX, 64, RW, 'Direction');
  let y = 102;
  rows.forEach(([k, v], i) => { o += `<span class="a c-mono" style="left:${RX}px;top:${y + 2}px;line-height:16px">${i + 1}</span>` + T('c-label', RX + 24, y + 2, RW - 24, k) + T('c-note', RX + 24, y + 22, RW - 24, A(v)); y += 22 + nLines(v, 13, RW - 24 - 6) * 20 + 20; });
  const cap = lead.photo ? `${li}  ${shotName(ctx, lead)}.${lead.generated || !lead.credit ? '' : ` Photo: ${lead.credit}.`}` : `${li}  ${shotName(ctx, lead)}, a brief still to shoot.`;
  const cl = nLines(cap, 13, RW);
  o += T('c-note c-quiet', RX, 947 - cl * 20, RW, A(cap));
  const out = [kSheet(ctx, 'photography-1', { drawing: 'Photography direction', section: '05 Imagery', scale: 'Not to scale', no: 1, total }, o)];
  // the shot list: six to a sheet, three across and two down, photo or brief with its detail number, the name and source under it
  const cw = (1507 - 48) / 3, ph = 340, rowH = 465.5;
  for (let p = 0; p * 6 < shots.length; p++) {
    const seenCr = new Set();   // a real photographer's credit prints once on a sheet, not under every tile
    const chunk = shots.slice(p * 6, p * 6 + 6); let q = '';
    chunk.forEach((s, i) => {
      const x = 40 + (i % 3) * (cw + 24), yy = 40 + Math.floor(i / 3) * (rowH + 0), n = p * 6 + i + 1;
      q += s.photo ? cropped(ctx, s, x, yy, cw, ph) : brief(ctx, s, x, yy, cw, ph, 15, 24, 24, 56);
      q += tag(x, yy, n);
      const sub = s.photo ? `${s.alt}.${s.generated || !s.credit || seenCr.has(s.credit) ? '' : (seenCr.add(s.credit), ` Photo: ${s.credit}.`)}` : 'A brief, still to shoot.';
      q += T('c-head', x + 24, yy + ph + 16, cw - 48, A(shotName(ctx, s))) + T('c-note c-quiet', x + 24, yy + ph + 42, cw - 48, A(sub));
    });
    out.push(kSheet(ctx, `photography-${p + 2}`, { drawing: p ? 'Shot list, continued' : 'Shot list', section: '05 Imagery', scale: 'Not to scale', no: 2 + p, total }, q));
  }
  return out;
}

// ---- the icon sheet ---------------------------------------------------------------------------------------------------------------------
function iconPages(ctx) {
  const B = ctx.brand, set = iconSet(ctx), s = ctx.iconStyle, n = set.length, R = reds();
  const hero = set.find((x) => !ICON_SET.includes(x)) || set[0];
  const joinWord = { miter: 'mitred', round: 'round', bevel: 'bevelled' }[s.join] || s.join;
  const intro = `${n} icons from Lucide, drawn in the ${B.name} stroke: ${s.stroke} px lines at 24 px, ${s.cap} ends and ${joinWord} corners.`;
  const foot = 'Each icon is one SVG file in 04 Icons. It takes the colour of the text beside it (currentColor), so it never needs a colour of its own. The ISC licence is in LICENSE.txt.';
  const cell = (name, x, y, w) => `<span class="a" style="left:${r1(x)}px;top:${y}px;width:${r1(w)}px;height:1px;background:var(--hair)"></span><span class="a kt-ic" style="left:${r1(x + 24)}px;top:${y + 20}px">${icon(ctx, name, 24)}</span>${T('c-mono nw', x + 24, y + 56, w - 24, `${A(name)}.svg`)}`;
  const GX = ZX[4], cols = 4, cw = (1547 - GX) / cols, rowsFit = Math.floor((947 - 64) / 88), firstN = Math.min(n, rowsFit * cols);
  const rest = set.slice(firstN), wide = 8, perPage = wide * Math.floor((947 - 64) / 88), pageCount = 1 + Math.ceil(rest.length / perPage), total = pageCount;
  // the hero drawn at 20:1 on its 24 unit grid, with the file's own 24 px dimensioned
  const HS = 480, HX = ZX[0] + 24, HY = 160;
  let grid = `<rect x=".5" y=".5" width="${HS - 1}" height="${HS - 1}" stroke="var(--ink)" stroke-width="1"/>`;
  for (let k = 1; k < 24; k++) grid += `<path d="M${k * 20 + .5} 1V${HS - 1}M1 ${k * 20 + .5}H${HS - 1}" stroke="var(--hair)" stroke-width="1"/>`;
  let o = `<div class="a" style="left:${HX}px;top:${HY}px;width:${HS}px;height:${HS}px"><svg class="a" style="left:0;top:0" width="${HS}" height="${HS}" fill="none" aria-hidden="true">${grid}</svg><div class="a" style="left:0;top:0;color:var(--ink)">${icon(ctx, hero, HS)}</div></div>`;
  R.dim([HX, HY], [HX + HS, HY], [0, -1], { d: 28, value: '24 px' });
  R.dim([HX + HS, HY], [HX + HS, HY + HS], [1, 0], { d: 28, value: '24 px', place: 'side' });
  o += T('c-mono', HX, HY + HS + 24, HS, `${A(hero)}.svg`, 'line-height:20px');
  o += T('c-note', HX, HY + HS + 48, HS, 'The file drawn at 20:1 on its grid. It is the same file as the one in the schedule, which is drawn at 1:1.');
  // the schedule beside it
  o += T('c-note', GX + 24, 64, 700, A(intro));
  const gTop = 64 + nLines(intro, 13, 700) * 20 + 32;
  const rowsHere = Math.floor((947 - gTop) / 88);
  const firstShown = set.slice(0, Math.min(firstN, rowsHere * cols));
  firstShown.forEach((name, i) => { o += cell(name, GX + (i % cols) * cw, gTop + Math.floor(i / cols) * 88, cw); });
  o += rule(GX, gTop + Math.ceil(firstShown.length / cols) * 88, 1547 - GX);
  const fl = nLines(foot, 13, 520);
  o += T('c-note c-quiet', GX + 24, 947 - fl * 20, 520, A(foot));
  const pages = [kSheet(ctx, 'icons-1', { drawing: 'Icon set', section: '04 Icons', scale: '20:1 hero, 1:1 schedule', no: 1, total }, o + R.svg())];
  // the rest of the set, eight to a row across the frame
  const rest2 = set.slice(firstShown.length), ww = 1507 / wide, per2 = wide * Math.floor((947 - 64) / 88);
  for (let p = 0; p * per2 < rest2.length; p++) {
    const chunk = rest2.slice(p * per2, (p + 1) * per2); let q = '';
    chunk.forEach((name, i) => { q += cell(name, 40 + (i % wide) * ww, 64 + Math.floor(i / wide) * 88, ww); });
    q += rule(40, 64 + Math.ceil(chunk.length / wide) * 88, 1507);
    pages.push(kSheet(ctx, `icons-${p + 2}`, { drawing: 'Icon set, continued', section: '04 Icons', scale: '1:1', no: p + 2, total }, q));
  }
  // the title block counts every page of this PDF, so the total must be the real count
  if (pages.length !== total) return pages.map((pg) => pg.replace(/(<small> of )\d+(<\/small>)/, `$1${pad3(pages.length)}$2`));
  return pages;
}

export function sheets(ctx) {
  return { palette: [paletteSheet(ctx)], typefaces: [typeSheet(ctx)], photography: photoSheets(ctx), icons: iconPages(ctx) };
}

export function css() {
  return `
.pg .kt-ic{display:block;width:24px;height:24px;color:var(--ink)}
.pg .kt-ic svg{display:block}
.pg .kt-tab{background:var(--film);padding:8px 12px;margin:-8px 0 0 -12px;box-sizing:content-box}
.pg .kt-tag{display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:var(--film);font:400 12px/16px var(--cmono);color:var(--ink)}
`;
}
