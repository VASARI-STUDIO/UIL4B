// Lane kt for theme 21 (the brand kit PDFs): readMe and sheets, in the round 1 slide language. Full-height fields in the brand's role colours meet
// at straight edges, one thing at display scale a slide, everything else at 12 to 15 px, and the one running head at y 28 with a three-digit folio.
// Colours come by role, never by id; every line is measured with the brand's own font files and set as explicit lines. Styles: kt- classes below.
//
// Icons. The engine ships the brand's icon set as SVG files in 04 Icons but prints no icon sheet: writeKitPdfs prints only the read-me, palette,
// typefaces and photography. So sheets() also returns `icons`, and until the engine prints `S.icons` (to `04 Icons/Icons.pdf`), the same icon
// pages are added to the end of the read-me so the kit's PDFs show the set. The sheet draws whatever set iconSet(ctx) gives (brand.json ui.icons,
// else the engine's default), at any count: the first page holds a grid beside one icon drawn large, further pages hold the rest.
import { plateImg } from '../../engine/plate.js';
import { onceRe } from './lane-g3-kit.js';
import { icon, iconSet, ICON_SET } from '../../engine/components.js';
import { A, W, H, M, px, dispW, textW, wrap, fitDisplay, lineHtml, para, L, inkOn, chromeOn, softOn, same, darkField, actionField, panelField, logoOn, box, page, head, fieldWidths } from './lane-kt-lib.js';

// does the engine print an icon sheet of its own? (it will once writeKitPdfs has an `S.icons` job)
const ENGINE_PRINTS_ICONS = true; // the export engine's package prints the icon pages itself; the read-me here does not repeat them

const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const familyCount = (ctx) => new Set(ctx.faces.map((f) => f.family)).size;
const t = (cls, color, inner) => `<p class="${cls}" style="color:${color}">${inner}</p>`;
const monoW = (ctx, s, size) => textW(ctx, 'mono', 400, s, size);

// ---- the read-me ------------------------------------------------------------------------------------------------------------------

function readMe1(ctx, no, iconPagesHere) {
  const B = ctx.brand, slot = ctx.edition === 'slot', g = L(ctx).surface, dark = darkField(ctx), onD = inkOn(ctx, dark), hair = L(ctx).divider;
  const real = B.imagery.shots.filter((s) => s.photo).length, briefs = B.imagery.shots.length - real;
  // the dark field: what the brand is, and the kit's name as the one big line at its foot
  const desc = para(ctx, B.description, 15, 400);
  const title = fitDisplay(ctx, `${B.name} brand kit`, 80, 40, 400, 2);
  let o = box(0, 0, 512, H, `background:${dark}`);
  o += box(M, 104, 400, null, '', t('kt-15', onD, lineHtml(desc)));
  o += box(M, 632 - title.lines.length * title.size, 400, null, '', `<p class="kt-d" style="color:${onD};font-size:${title.size}px;line-height:${title.size}px">${lineHtml(title.lines)}</p>`);
  o += box(M, 664, 400, null, '', t('kt-12', chromeOn(ctx, dark), A(ctx.versionLine)));
  // the five folders, one row each, with what is in them counted from the brand
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide on a clear ground.', slot ? 'Slot frame' : `${ctx.logo.versions.length} versions`],
    ['02 Colour', 'The palette for Adobe (ASE), CSS and JSON, and the swatch sheet.', `${ctx.colours.length} colours, ${ctx.tones.length} tones`],
    ['03 Type', 'The type specimen, and fonts.md with each face\'s link and licence.', `${familyCount(ctx)} faces`],
    ['04 Icons', iconPagesHere ? `One SVG per icon at 24 px, in the brand's stroke, with the Lucide licence. The sheet is page ${no + 2} of this read-me.` : 'One SVG per icon at 24 px, in the brand\'s stroke, with the Lucide licence, and the icon sheet.', `${iconSet(ctx).length} icons`],
    ['05 Imagery', real ? 'The photography direction and shot list, and the photos.' : 'The photography direction and the shot list.', [real && `${real} photos`, briefs && `${briefs} briefs`].filter(Boolean).join(', ')],
  ];
  const X = 568, DX = 728, DW = 344;
  let y = 104;
  for (const [name, what, count] of folders) {
    const lines = para(ctx, what, 15, DW);
    const h = Math.max(1, lines.length) * 24 + 32;
    o += box(X, y, W - M - X, h, `border-top:1px solid ${hair}`);
    o += box(X, y + 16, 152, null, '', t('kt-15 kt-w6', L(ctx).text, A(name)));
    o += box(DX, y + 16, DW, null, '', t('kt-15', softOn(ctx, g), lineHtml(lines)));
    o += box(W - M - 136, y + 20, 136, null, 'text-align:right', t('kt-12', chromeOn(ctx, g), A(count)));
    y += h;
  }
  o += box(X, y, W - M - X, 1, `background:${hair}`);
  // how to use it: three steps in three columns, at 15 px when they fit the room left, else at 12
  const how = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the full-colour version on light grounds and the reversed version on dark ones. The guidelines show every ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. Every face is under the SIL Open Font License, ' + (onceRe(ctx)?.test('free') ? 'which allows commercial use.' : 'free for commercial use.')],
  ];
  const top = y + 40, room = H - 40 - (top + 24), colW = 208;
  const set = [[15, 24, 'kt-15'], [12, 16, 'kt-12']].find(([s, lh]) => how.every(([a, b]) => (para(ctx, a, s, colW, 600).length + para(ctx, b, s, colW).length) * lh <= room)) || [12, 16, 'kt-12'];
  o += box(X, top, 300, null, '', t('kt-12 kt-w6', L(ctx).text, 'How to use it'));
  how.forEach(([a, b], i) => {
    o += box(X + i * 224, top + 24, colW, null, '', `<p class="${set[2]} kt-w6" style="color:${L(ctx).text}">${lineHtml(para(ctx, a, set[0], colW, 600))}</p><p class="${set[2]}" style="color:${softOn(ctx, g)}">${lineHtml(para(ctx, b, set[0], colW))}</p>`);
  });
  o += head(ctx, { folder: '00', title: 'Read me', left: dark, right: g, no });
  return page('read-me-1', o, g);
}

function readMe2(ctx, no) {
  const B = ctx.brand, g = L(ctx).surface, hair = L(ctx).divider, f = B.fonts;
  let o = '';
  // the logo is the one big thing, on the page ground
  const lg = ctx.logo.geos.colour, lw = Math.floor(Math.min(560, (176 * lg.w) / lg.h));
  o += box(M, 112, lw, null, '', ctx.logo.html(logoOn(ctx, g), { width: lw, label: 'Your logo goes here' }));
  // the faces, each named in itself
  const dw = dispW(ctx), dSize = [26, 24, 22, 20, 18].find((s) => textW(ctx, 'display', dw, f.display.family, s, -0.01) <= 280) || 18;
  const faceCap = (role, ws, extra = '') => `${role}. Weight${ws.length > 1 ? 's' : ''} ${ws.join(', ')}${extra}.`;
  o += box(M, 320, 280, null, '', `<p class="kt-d kt-ln" style="color:${L(ctx).text};font-size:${dSize}px;line-height:32px">${A(f.display.family)}</p>` + t('kt-12', chromeOn(ctx, g), A(faceCap('Display', f.display.weights, f.display.stretch ? `, width ${f.display.stretch}` : ''))));
  o += box(376, 320, 300, null, '', `<p class="kt-ln kt-w6" style="color:${L(ctx).text};font-size:22px;line-height:32px">${A(f.body.family)}</p>` + t('kt-12', chromeOn(ctx, g), A(faceCap('Body', f.body.weights))));
  o += box(M, 392, 620, null, '', t('kt-12', chromeOn(ctx, g), A(`${f.mono.family} is for a hex, a token or a code string only.`)));
  // the lines, and the three traits
  const RX = 746.7, RW = W - M - RX;
  const first = para(ctx, B.lines.primary, 22, RW, 500), others = B.lines.others.map((l) => para(ctx, l, 15, RW));
  o += box(RX, 112, RW, null, '', t('kt-22 kt-w5', L(ctx).text, lineHtml(first)) + others.map((ls) => `<p class="kt-15" style="color:${softOn(ctx, g)};margin-top:8px">${lineHtml(ls)}</p>`).join(''));
  if ((B.personality || []).length) {
    o += box(RX, 320, RW, null, '', t('kt-12', chromeOn(ctx, g), 'Personality') + t('kt-22 kt-w5', L(ctx).text, lineHtml(para(ctx, B.personality.map((p) => p.trait).join(', '), 22, RW, 500))));
  }
  // the palette as fields across the foot, in proportion to share, each wide enough for its name and value
  const cs = ctx.colours;
  const needs = cs.map((c) => Math.max(textW(ctx, 'body', 600, c.name, 15), monoW(ctx, c.hex, 12)) + 48);
  const ws = fieldWidths(cs.map((c) => c.share || 0.1), needs, W); ws[ws.length - 1] = W - ws.slice(0, -1).reduce((a, b) => a + b, 0);
  let x = 0;
  cs.forEach((c, i) => {
    const ink = inkOn(ctx, c.hex), edge = same(c.hex, g) ? `;box-shadow:inset 0 1px 0 ${hair}${i ? `, inset 1px 0 0 ${hair}` : ''}${i < cs.length - 1 ? `, inset -1px 0 0 ${hair}` : ''}` : '';
    o += box(x, 456, ws[i], H - 456, `background:${c.hex}${edge}`, `<p class="kt-15 kt-w6 kt-ln" style="position:absolute;left:24px;top:180px;color:${ink}">${A(c.name)}</p><p class="kt-12 kt-m kt-ln" style="position:absolute;left:24px;top:208px;color:${ink}">${A(c.hex)}</p>`);
    x += ws[i];
  });
  o += head(ctx, { folder: '00', title: 'The brand on one page', no });
  return page('read-me-2', o, g);
}

// ---- the icon sheet --------------------------------------------------------------------------------------------------------------

function iconPages(ctx, startNo, folder, docTitle) {
  const B = ctx.brand, g = L(ctx).surface, hair = L(ctx).divider, set = iconSet(ctx), s = ctx.iconStyle, n = set.length;
  const act = actionField(ctx), onA = inkOn(ctx, act);
  // the icon drawn large: the first one the brand added to the default set (its own subject), else the first in its set
  const hero = set.find((x) => !ICON_SET.includes(x)) || set[0];
  const joinWord = { miter: 'mitred', round: 'round', bevel: 'bevelled' }[s.join] || s.join;
  const intro = `${n} icons from Lucide, drawn in the ${B.name} stroke: ${s.stroke} px lines at 24 px, ${s.cap} ends and ${joinWord} corners.`;
  const cell = (name, x, y, w) => box(x, y, w, 88, `border-top:1px solid ${hair};color:${L(ctx).text}`, `<span class="kt-ic">${icon(ctx, name, 24)}</span><p class="kt-12 kt-m kt-ln" style="position:absolute;left:0;top:56px;color:${chromeOn(ctx, g)}">${A(name)}.svg</p>`);
  const pages = [];
  // first page: the action field with one icon drawn large, the grid beside it
  const X = 568, GW = W - M - X, cols = 4, cw = GW / cols;
  const introL = para(ctx, intro, 15, GW);
  const gTop = 104 + introL.length * 24 + 32, foot = 'Each icon is one SVG file in 04 Icons. It takes the colour of the text beside it (currentColor), so it never needs a colour of its own. The ISC licence is in LICENSE.txt.';
  const footL = para(ctx, foot, 12, GW), footTop = H - 40 - footL.length * 16;
  const rowsFit = Math.max(1, Math.floor((footTop - 24 - gTop) / 88)), first = set.slice(0, rowsFit * cols);
  let o = box(0, 0, 512, H, `background:${act}`);
  o += box(112, 168, 288, 288, `color:${onA}`, icon(ctx, hero, 288));
  o += box(M, 600, 400, null, '', `<p class="kt-12 kt-m kt-ln" style="color:${onA}">${A(hero)}.svg</p>` + t('kt-12', onA, 'The same file as the one in the grid, drawn at 288 px.'));
  o += box(X, 104, GW, null, '', t('kt-15', softOn(ctx, g), lineHtml(introL)));
  first.forEach((name, i) => { o += cell(name, X + (i % cols) * cw, gTop + Math.floor(i / cols) * 88, cw); });
  o += box(X, gTop + Math.ceil(first.length / cols) * 88, GW, 1, `background:${hair}`);
  o += box(X, footTop, GW, null, '', t('kt-12', chromeOn(ctx, g), lineHtml(footL)));
  o += head(ctx, { folder, title: docTitle, left: act, right: g, no: startNo });
  pages.push(page('icons-1', o, g));
  // further pages: the rest of the set, eight to a row across the page
  const rest = set.slice(first.length), wide = 8, ww = (W - 2 * M) / wide, perPage = wide * Math.floor((H - 40 - 104) / 88);
  for (let p = 0; p * perPage < rest.length; p++) {
    const chunk = rest.slice(p * perPage, (p + 1) * perPage);
    let q = '';
    chunk.forEach((name, i) => { q += cell(name, M + (i % wide) * ww, 104 + Math.floor(i / wide) * 88, ww); });
    q += box(M, 104 + Math.ceil(chunk.length / wide) * 88, W - 2 * M, 1, `background:${hair}`);
    q += head(ctx, { folder, title: `${docTitle}, continued`, no: startNo + 1 + p });
    pages.push(page(`icons-${p + 2}`, q, g));
  }
  return pages;
}

// slot edition: the pages whose brand words sit in measured rows take the compact placeholder form (ph-tight on the page; only where ctx.placeholders is on)
const PH_TIGHT = new Set(['read-me-2', 'typefaces', 'photography-1']);
const tight = (ctx, html) => (ctx.placeholders && PH_TIGHT.has((/data-page="([^"]*)"/.exec(html) || [])[1]) ? html.replace('<section class="', '<section class="ph-tight ') : html);

export function readMe(ctx) {
  const withIcons = !ENGINE_PRINTS_ICONS;
  const out = [readMe1(ctx, 1, withIcons), readMe2(ctx, 2)];
  if (withIcons) out.push(...iconPages(ctx, 3, '04', 'Icons'));
  return out.map((h) => tight(ctx, h));
}

// ---- the sheets ------------------------------------------------------------------------------------------------------------------

function paletteSheet(ctx) {
  const g = L(ctx).surface, hair = L(ctx).divider, cs = ctx.colours.slice().sort((a, b) => (b.share || 0) - (a.share || 0));
  const pct = (c) => `${Math.round((c.share || 0) * 100)}%`;
  // the table: value columns as wide as their widest value, the lands column takes what is left
  const hasK = cs.some((c) => c.cmyk), kOf = (c) => (c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join(' ') : '');
  const vals = [['Share', (c) => pct(c), false], ['HEX', (c) => c.hex, true], ['RGB', (c) => c.rgb, true], ['OKLCH', (c) => c.oklch, true], ...(hasK ? [['CMYK', kOf, true]] : [])];
  const vw = vals.map(([hd, f, mono]) => Math.ceil(Math.max(textW(ctx, 'body', 400, hd, 12), ...cs.map((c) => (mono ? monoW(ctx, f(c), 12) : textW(ctx, 'body', 400, f(c), 12))))));
  const NX = 96, NW = 152, LX = NX + NW + 16, gap = 24, valsW = vw.reduce((a, b) => a + b, 0) + gap * vw.length, LW = W - M - valsW - LX;
  const rows = cs.map((c) => ({ c, lands: para(ctx, c.lands || '', 12, LW) }));
  const rowH = rows.map((r) => Math.max(24, r.lands.length * 16) + 24);
  // the tones that ride along in the palette files, set as one run of chips
  const tones = ctx.tones.map((x) => ({ x, w: 12 + 8 + textW(ctx, 'body', 600, x.name, 12) + 8 + monoW(ctx, x.hex, 12) }));
  const lead = 'Tones in the palette files', leadW = textW(ctx, 'body', 400, lead, 12) + 24;
  const tLines = []; let cur = [], curW = leadW;
  for (const tt of tones) { if (cur.length && curW + tt.w > W - 2 * M) { tLines.push(cur); cur = []; curW = leadW; } cur.push(tt); curW += tt.w + 24; }
  if (cur.length) tLines.push(cur);
  const tonesH = tLines.length * 24;
  const tableH = 32 + rowH.reduce((a, b) => a + b, 0);
  const tonesTop = H - 40 - tonesH, tableTop = tonesTop - 24 - tableH, bandTop = 72, bandBot = tableTop - 32;
  // the band: every colour as a field in proportion to its share, the one big thing on the sheet
  const ws = fieldWidths(cs.map((c) => c.share || 0.05), cs.map((c) => textW(ctx, 'body', 500, pct(c), 15) + 40), W); ws[ws.length - 1] = W - ws.slice(0, -1).reduce((a, b) => a + b, 0);
  let o = '', x = 0;
  cs.forEach((c, i) => {
    const ink = inkOn(ctx, c.hex), edge = same(c.hex, g) ? `;box-shadow:inset 0 0 0 1px ${hair}` : '';
    o += box(x, bandTop, ws[i], bandBot - bandTop, `background:${c.hex}${edge}`, `<p class="kt-15 kt-w5 kt-ln num" style="position:absolute;left:${ws[i] >= 200 ? 24 : 20}px;bottom:20px;color:${ink}">${pct(c)}</p>`);
    x += ws[i];
  });
  // the table
  const head2 = (label, x0, w, right) => box(x0, tableTop, w, null, right ? 'text-align:right' : '', t('kt-12', chromeOn(ctx, g), label));
  o += head2('Colour', NX, NW) + head2('Where it lands', LX, LW);
  let vx = LX + LW + gap; const vxs = vw.map((w) => { const at = vx; vx += w + gap; return at; });
  vals.forEach(([hd], i) => { o += head2(hd, vxs[i], vw[i], i === 0); });
  let y = tableTop + 32;
  rows.forEach(({ c, lands }, i) => {
    const edge = same(c.hex, g) ? `;box-shadow:inset 0 0 0 1px ${hair}` : '';
    o += box(M, y, W - 2 * M, rowH[i], `border-top:1px solid ${hair}`);
    o += box(M, y + 12, 24, 24, `background:${c.hex}${edge}`);
    o += box(NX, y + 12, NW, null, '', t('kt-15 kt-w6 kt-ln', L(ctx).text, A(c.name)));
    o += box(LX, y + 16, LW, null, '', t('kt-12', softOn(ctx, g), lineHtml(lands)));
    vals.forEach(([, f, mono], k) => { o += box(vxs[k], y + 16, vw[k], null, k === 0 ? 'text-align:right' : '', `<p class="kt-12 kt-ln ${mono ? 'kt-m' : 'num'}" style="color:${L(ctx).text}">${A(f(c))}</p>`); });
    y += rowH[i];
  });
  o += box(M, y, W - 2 * M, 1, `background:${hair}`);
  tLines.forEach((line, li) => {
    const parts = line.map(({ x: tn }) => `<span class="kt-tone"><i style="background:${tn.hex}${same(tn.hex, g) ? `;box-shadow:inset 0 0 0 1px ${hair}` : ''}"></i><b style="color:${L(ctx).text}">${A(tn.name)}</b><span class="kt-m" style="color:${chromeOn(ctx, g)}">${A(tn.hex)}</span></span>`).join('');
    o += box(M, tonesTop + li * 24, W - 2 * M, 24, '', `<p class="kt-12 kt-tones" style="color:${chromeOn(ctx, g)}">${li ? '' : `<span class="kt-lead">${lead}</span>`}${parts}</p>`);
  });
  o += head(ctx, { folder: '02 Colour', title: 'Palette', no: 1 });
  return page('palette', o, g);
}

function typeSheet(ctx) {
  const B = ctx.brand, f = B.fonts, T = B.type, g = L(ctx).surface, panel = panelField(ctx), dark = darkField(ctx), onD = inkOn(ctx, dark), dw = dispW(ctx);
  const charset = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789'];
  // the mono field is as wide as the head's right part needs, and never less than 256
  const hr = textW(ctx, 'body', 400, `${B.name} brand kit`, 12) + 36, MX = Math.min(1024, W - M - hr - 24), BX = 560;
  let o = box(0, 0, BX, H, `background:${panel}`) + box(MX, 0, W - MX, H, `background:${dark}`);
  // display: the brand's sample headline, the one big thing; its alphabet at the foot
  const DW_ = BX - 2 * M, hl = fitDisplay(ctx, T.sample.headline, 96, 40, DW_, 3);
  o += box(M, 104, DW_, null, '', `<p class="kt-d" style="color:${inkOn(ctx, panel)};font-size:${hl.size}px;line-height:${hl.size}px">${lineHtml(hl.lines)}</p>`);
  const dcs = [26, 24, 22, 20, 18, 16].find((s) => charset.every((l) => textW(ctx, 'display', dw, l, s, -0.01) <= DW_)) || 16;
  o += box(M, 512, DW_, null, '', `<p class="kt-d" style="color:${inkOn(ctx, panel)};font-size:${dcs}px;line-height:32px">${lineHtml(charset)}</p>`);
  const dCap = `Display. Weight ${f.display.weights.join(', ')}${f.display.stretch ? `, width ${f.display.stretch}` : ''}${(f.display.italics || []).length ? `, italic ${f.display.italics.join(', ')}` : ''}. SIL OFL 1.1.`;
  o += box(M, 624, DW_, null, '', t('kt-15 kt-w6 kt-ln', inkOn(ctx, panel), A(f.display.family)) + t('kt-12', chromeOn(ctx, panel), lineHtml(para(ctx, dCap, 12, DW_))));
  // body: each weight named in itself, the sample paragraph at the brand's reading size, the alphabet
  const BW = MX - BX - 2 * 32, bx = BX + 32, tok = (T.scale || []).find((x) => x.token === 'body') || { size: 15, line: 1.6, use: 'Reading text' };
  const wl = f.body.weights.map((w) => `<p class="kt-22 kt-ln" style="font-weight:${w};color:${L(ctx).text}">${A(`${WEIGHT_NAMES[w] || w} ${w}`)}</p>`).join('');
  o += box(bx, 104, BW, null, '', wl);
  const pTop = 104 + f.body.weights.length * 28 + 32, pl = para(ctx, T.sample.paragraph, tok.size, BW), lh = Math.round(tok.size * tok.line);
  o += box(bx, pTop, BW, null, '', `<p style="font-size:${tok.size}px;line-height:${lh}px;color:${softOn(ctx, g)}">${lineHtml(pl)}</p>` + `<p class="kt-12" style="margin-top:12px;color:${chromeOn(ctx, g)}">${A(`${tok.size} px on ${lh} px. ${tok.use}.`)}</p>`);
  const bcs = [15, 14, 13, 12].find((s) => charset.every((l) => textW(ctx, 'body', 500, l, s) <= BW)) || 12;
  o += box(bx, 512, BW, null, '', `<p class="kt-w5" style="color:${L(ctx).text};font-size:${bcs}px;line-height:32px">${lineHtml(charset)}</p>`);
  o += box(bx, 624, BW, null, '', t('kt-15 kt-w6 kt-ln', L(ctx).text, A(f.body.family)) + t('kt-12', chromeOn(ctx, g), lineHtml(para(ctx, `Body. Weights ${f.body.weights.join(', ')}. SIL OFL 1.1.`, 12, BW))));
  // mono: only literal values, so the palette's own hex values are its specimen
  const MW = W - MX - 2 * 32, mx = MX + 32;
  const ms = [22, 18, 15, 12].find((s) => ctx.colours.every((c) => monoW(ctx, c.hex, s) <= MW)) || 12;
  o += box(mx, 104, MW, null, '', `<p class="kt-m" style="color:${onD};font-size:${ms}px;line-height:${Math.round(ms * 1.3)}px">${lineHtml(ctx.colours.map((c) => c.hex))}</p>`);
  const mcs = [15, 14, 13, 12, 11].find((s) => charset.every((l) => monoW(ctx, l, s) <= MW));
  if (mcs >= 12) o += box(mx, 512, MW, null, '', `<p class="kt-m" style="color:${onD};font-size:${mcs}px;line-height:32px">${lineHtml(charset)}</p>`);
  o += box(mx, 624, MW, null, '', t('kt-15 kt-w6 kt-ln', onD, A(f.mono.family)) + t('kt-12', chromeOn(ctx, dark), lineHtml(para(ctx, 'Mono. For a hex, a token or a code string only.', 12, MW))));
  o += head(ctx, { folder: '03 Type', title: 'Typefaces', left: panel, right: dark, no: 1 });
  return page('typefaces', o, g);
}

// natural size of a jpeg, read from its header
function jpegSize() { throw new Error('theme 21: photograph files are not read by the server export'); }
// a photograph cropped to the shot's safe box, filling a w x h box with nothing laid over it
function cropped(ctx, s, x, y, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) * (s.focus && s.focus.x != null ? s.focus.x / 100 : 0.5), oy = (h - c.h * k) / 2; // focus.x: where across the safe box a narrower frame sits (0 left, 100 right)
  return box(x, y, w, h, 'overflow:hidden', `${plateImg(`${A(ctx.photoUrl(s.photo))}`, `${A(s.alt)}`, `position:absolute;display:block;max-width:none;width:${px(n.w * k)}px;height:${px(n.h * k)}px;left:${px(ox - c.x * k)}px;top:${px(oy - c.y * k)}px`)}`);
}
// a shot with no photo yet: the panel holds its brief
// (the largest of lead, body and caption size at which the brief fits the panel)
function brief(ctx, s, x, y, w, h, padX, padY, big) {
  const panel = panelField(ctx), tw = w - 2 * padX;
  const sets = (big ? [[22, 28, 'kt-22 kt-w5', 500]] : []).concat([[15, 24, 'kt-15', 400], [12, 16, 'kt-12', 400]]);
  const [size, , cls, wt] = sets.find(([sz, lh, , wt2]) => para(ctx, s.slot, sz, tw, wt2).length * lh <= h - 2 * padY) || sets[sets.length - 1];
  return box(x, y, w, h, `background:${panel}`, `<p class="${cls}" style="position:absolute;left:${padX}px;top:${padY}px;color:${inkOn(ctx, panel)}">${lineHtml(para(ctx, s.slot, size, tw, wt))}</p>`);
}
const shotName = (ctx, s) => s.caption || ctx.cap(s.id);
// the shape of a shot's safe box (its crop, else the whole photo)
const aspectOf = (ctx, s) => { const c = s.crop || jpegSize(); return c.w / c.h; };

function photoSheets(ctx) {
  const B = ctx.brand, D = B.imagery.direction, g = L(ctx).surface, hair = L(ctx).divider, shots = B.imagery.shots;
  // direction: one photograph beside the five lines of direction. The photo whose safe box is closest in shape to the panel, so the crop keeps
  // its subject (a wide street shot cut to a tall panel loses the riders at both edges); with no photos, the first brief.
  const PW = 592, X = 648, TW = W - M - X, PA = PW / (H - 72);
  const photos = shots.filter((s) => s.photo).sort((a, b) => Math.abs(Math.log(aspectOf(ctx, a) / PA)) - Math.abs(Math.log(aspectOf(ctx, b) / PA)));
  const lead = photos[0] || shots[0];
  let o = lead.photo ? cropped(ctx, lead, 0, 72, PW, H - 72) : brief(ctx, lead, 0, 72, PW, H - 72, M, 32, true);
  const title = fitDisplay(ctx, 'Photography direction', 40, 26, TW, 1);
  o += box(X, 96, TW, null, '', `<p class="kt-d" style="color:${L(ctx).text};font-size:${title.size}px;line-height:${title.size + 8}px">${lineHtml(title.lines)}</p>`);
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  const cap = lead.photo ? `The photo: ${shotName(ctx, lead)}.${lead.generated ? '' : ` Photo: ${lead.credit}.`}` : `The panel: ${shotName(ctx, lead)}, a brief still to shoot.`;
  const capL = para(ctx, cap, 12, TW), capTop = H - 40 - capL.length * 16, top = 176, room = capTop - 24 - top;
  const KX = X + 120, KW = TW - 120;
  const set = [[15, 24, 'kt-15'], [13, 20, 'kt-13'], [12, 16, 'kt-12']].find(([s, lh]) => rows.reduce((a, [, v]) => a + para(ctx, v, s, KW).length * lh + 24, 0) <= room) || [12, 16, 'kt-12'];
  let y = top;
  for (const [k, v] of rows) {
    const ls = para(ctx, v, set[0], KW), h = ls.length * set[1] + 24;
    o += box(X, y, TW, h, `border-top:1px solid ${hair}`);
    o += box(X, y + 12 + (set[1] - 16) / 2, 112, null, '', t('kt-12 kt-w6', L(ctx).text, A(k)));
    o += box(KX, y + 12, KW, null, '', t(set[2], softOn(ctx, g), lineHtml(ls)));
    y += h;
  }
  o += box(X, y, TW, 1, `background:${hair}`);
  o += box(X, capTop, TW, null, '', t('kt-12', chromeOn(ctx, g), lineHtml(capL)));
  o += head(ctx, { folder: '05 Imagery', title: 'Photography direction', no: 1 });
  const out = [page('photography-1', o, g)];
  // the shot list: three shots across the full width, photo or brief edge to edge, each name and source under it; two rows, six to a page.
  // Three across keeps every picture landscape, the shape the street and room shots are taken in.
  for (let p = 0; p * 6 < shots.length; p++) {
    const chunk = shots.slice(p * 6, p * 6 + 6), rowsN = Math.ceil(chunk.length / 3), cw = (W - 2 * 2) / 3, ph = rowsN === 1 ? 432 : 216, rowH = ph + 104;
    let q = '';
    chunk.forEach((s, i) => {
      const x = (i % 3) * (cw + 2), y = 72 + Math.floor(i / 3) * rowH, tw = cw - 2 * M;
      q += s.photo ? cropped(ctx, s, x, y, cw, ph) : brief(ctx, s, x, y, cw, ph, M, 24, false);
      const sub = s.photo ? `${s.alt}.${s.generated ? '' : ` Photo: ${s.credit}.`}` : 'A brief, still to shoot.';
      q += box(x + M, y + ph + 12, tw, null, '', t('kt-15 kt-w6', L(ctx).text, lineHtml(para(ctx, shotName(ctx, s), 15, tw, 600))) + `<p class="kt-12" style="color:${chromeOn(ctx, g)}">${lineHtml(para(ctx, sub, 12, tw))}</p>`);
    });
    q += head(ctx, { folder: '05 Imagery', title: p ? 'Shot list, continued' : 'Shot list', no: 2 + p });
    out.push(page(`photography-${2 + p}`, q, g));
  }
  return out;
}

export function sheets(ctx) {
  return { palette: [paletteSheet(ctx)], typefaces: [tight(ctx, typeSheet(ctx))], photography: photoSheets(ctx).map((h) => tight(ctx, h)), icons: iconPages(ctx, 1, '04 Icons', 'Icon set') };
}

export function css(ctx) {
  const d = ctx.brand.fonts.display;
  return `
.pg.kt{font-family:var(--body);font-size:12px;line-height:16px;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.pg.kt :where(p,h1,h2,ul,ol,li){margin:0;padding:0;list-style:none}
.pg.kt .kt-a{position:absolute;box-sizing:border-box}
.pg.kt .kt-ln{display:block;white-space:nowrap}
.pg.kt .kt-hd{position:absolute;left:56px;right:56px;top:28px;height:16px;display:flex;justify-content:space-between;font:400 12px/16px var(--body);white-space:nowrap}
.pg.kt .kt-hd b{font-weight:400}
.pg.kt .kt-hd span:first-child b{margin-right:16px}
.pg.kt .kt-hd span:last-child b{display:inline-block;width:28px;margin-left:8px;text-align:right}
.pg.kt .kt-d{font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${dispW(ctx)};letter-spacing:-0.01em}
.pg.kt .kt-m{font-family:'${ctx.brand.fonts.mono.family}',monospace;font-weight:400}
.pg.kt .kt-12{font-size:12px;line-height:16px}
.pg.kt .kt-13{font-size:13px;line-height:20px}
.pg.kt .kt-15{font-size:15px;line-height:24px}
.pg.kt .kt-22{font-size:22px;line-height:28px}
.pg.kt .kt-w5{font-weight:500}
.pg.kt .kt-w6{font-weight:600}
.pg.kt .kt-ic{position:absolute;left:0;top:20px;display:block;width:24px;height:24px}
.pg.kt .kt-ic svg,.pg.kt .kt-a > svg{display:block}
.pg.kt .kt-tones{display:flex;align-items:center;gap:0 24px;height:24px;white-space:nowrap}
.pg.kt .kt-tone{display:inline-flex;align-items:center;gap:8px}
.pg.kt .kt-tone i{display:block;width:12px;height:12px}
.pg.kt .kt-tone b{font-weight:600}
`;
}
