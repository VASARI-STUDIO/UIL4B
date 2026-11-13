// Theme 30, Fluted, lane kt: the brand kit PDFs (readMe and sheets). Same page as the guidelines (1080 x 1350, the kit has no page of its own): the running head and
// folio, one big thing above the band, the band y 768 to 1152 showing the page's behind-art (the palette in proportion, plus the page's one shape), and a key row under it.
// Nothing sits on the reeds: text is on the ground, or on a palette field painted as a div under the glass. Colours come from ctx roles and the brand's data only;
// brand copy is printed whole through esc(); the measuring below only sizes boxes and never changes what is printed.
//
// Icons: sheets() returns `icons`, which the engine prints to 04 Icons/Icons.pdf. They are not repeated in the read-me.
import { plateImg } from '../../engine/plate.js';
import { A, put, rect, tokens, fitSize, adv, paths, onFill, logoHtml, TXT, GX, PW, PH, FIELD_MIN } from './helpers.js';
import { paletteCols, paletteFields, glassBand, warpPath } from './glass.js';
import { icon, iconSet, ICON_SET } from '../../engine/components.js';

const TRACK = -0.02, KEY = 1184;
const lo = (h) => String(h).toLowerCase();

// ---- helpers ---------------------------------------------------------------------------------------------------------------------

// lines a paragraph takes at a size and width (a little generous, so a box is never short); only for laying boxes out, never for what is printed
function nLines(ctx, text, size, w, weight = ctx.weights.regular, role = 'body') {
  const sp = adv(ctx, role, ' ', size, 0, weight); let n = 1, cur = 0;
  for (const wd of String(text).split(' ')) { const a = adv(ctx, role, wd, size, 0, weight) * 1.04; if (cur && cur + sp + a > w) { n++; cur = a; } else cur += (cur ? sp : 0) + a; }
  return n;
}
const headline = (ctx, l1, l2, { y = 96, w = 777 } = {}) => {
  const s = Math.min(64, fitSize(ctx, 'display', l2 && l2.length > l1.length ? l2 : l1, 64, w / 1.03, TRACK, ctx.weights.heading, 36));
  return put(ctx, { x: 64, y, w, cls: 'disp', html: `<div style="font-size:${s}px;line-height:64px;color:var(--ink)">${A(l1)}</div>${l2 ? `<div style="font-size:${s}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` : ''}` });
};
const body = (ctx, x, y, w, html, style = '') => put(ctx, { x, y, w, cls: 'body', style: `white-space:normal;${style}`, html });
const key = (ctx, x, y, w, html, cls = 'k') => put(ctx, { x, y, w, cls, style: 'white-space:normal', html });
const hairAt = (x, y, w) => `<div class="hair" style="left:${x}px;top:${y}px;width:${w}px"></div>`;

// an arch (a window): straight sides on reed boundaries, a round top, standing through the glass to yEnd. Flat above and below the band, drawn once over the reeds with the smooth bend.
function arch(T, x0, x1, top, yEnd = 1000) {
  const R = (x1 - x0) / 2, cx = (x0 + x1) / 2, cy = top + R, d = `M${x0} ${yEnd} V${cy} A${R} ${R} 0 0 1 ${x1} ${cy} V${yEnd} Z`;
  const pts = [[x0, yEnd], [x0, cy]]; for (let a = 180; a <= 360; a += 0.5) pts.push([cx + R * Math.cos(a * Math.PI / 180), cy + R * Math.sin(a * Math.PI / 180)]); pts.push([x1, cy], [x1, yEnd]);
  const wd = warpPath(`M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L')}Z`, 0, 0, {});
  const flat = `<path d="${d}" fill="${T.strong}"/>`;
  return { flat, shape: wd ? '' : flat, over: wd ? `<path d="${wd}" fill="${T.strong}"/>` : '' };
}

// ---- the page: flat art, the glass over it, then the text, then the head and folio ------------------------------------------------
function chrome(ctx, T, { folder, title, no }) {
  const cells = [[GX[0], ctx.brand.name], [GX[3], folder], [GX[5], title]];
  let out = cells.map(([x, t], i) => put(ctx, { x, baseline: 52, w: (cells[i + 1] ? cells[i + 1][0] : PW - 64) - x - 16, cls: 'hd', role: 'chrome', size: TXT, line: 20, weight: 500, html: A(t), h: 20 })).join('');
  out += put(ctx, { x: 64, baseline: 1302, w: 800, cls: 'ft', role: 'chrome', size: TXT, line: 20, weight: 400, html: A(`${ctx.brand.name} brand kit, version ${ctx.brand.version.number}`), h: 20 });
  out += put(ctx, { x: 916, baseline: 1302, w: 100, cls: 'fo num', role: 'dm', size: TXT, line: 20, weight: 400, html: String(no).padStart(3, '0'), align: 'right', h: 20 });
  return out;
}
function kshell(ctx, id, T, { flat = '', under = '', shape = '', over = '', fields = true, omit = [], html = '', folder, title, no }) {
  const ground = `<rect x="-60" y="-10" width="${PW + 120}" height="${PH + 20}" fill="${T.ground}"/>`;
  const fl = fields ? paletteFields(ctx, { ground: T.ground, y: 768, h: 384, actionHex: T.strong, omit, minW: FIELD_MIN }) : '';
  const glass = glassBand(ctx, { id: `fx-${id}`, behind: ground + fl + shape, light: T.light, ground: T.ground, pitch: 12, accent: !T.light, over });
  return `<section class="pg" data-page="${id}"><svg class="a" style="left:0;top:0" width="${PW}" height="${PH}" viewBox="0 0 ${PW} ${PH}" aria-hidden="true">${flat}</svg>${under}${glass}${html}${chrome(ctx, T, { folder, title, no })}</section>`;
}

const familyCount = (ctx) => new Set(ctx.faces.map((f) => f.family)).size;
const faceCap = (role, ws, extra = '') => `${role}. Weight${ws.length > 1 ? 's' : ''} ${ws.join(', ')}${extra}.`;

// ---- 00 Read me ------------------------------------------------------------------------------------------------------------------

function readMe1(ctx) {
  const T = tokens(ctx), B = ctx.brand, slot = ctx.edition === 'slot';
  const real = B.imagery.shots.filter((s) => hasPhoto(ctx, s)).length, briefs = B.imagery.shots.length - real;
  const folders = [
    ['01 Logo', slot ? 'A labelled slot frame at the logo\'s proportion, and a note on where the approved files go.' : 'Every version as SVG and PDF, and PNG at 512, 1024 and 2048 px wide, transparent.', slot ? 'Slot frame' : `${ctx.logo.versions.length} versions`],
    ['02 Colour', 'The palette for Adobe (ASE), CSS and JSON, and the swatch sheet.', `${ctx.colours.length} colours, ${ctx.tones.length} tones`],
    ['03 Type', 'The type specimen, and fonts.md with each face\'s link and licence.', `${familyCount(ctx)} faces`],
    ['04 Icons', 'One SVG per icon at 24 px, in the brand\'s stroke, with the Lucide licence, and the icon sheet.', `${iconSet(ctx).length} icons`],
    ['05 Imagery', real ? 'The photography direction and shot list, and the photos.' : 'The photography direction and the shot list.', [real && `${real} photos`, briefs && `${briefs} briefs`].filter(Boolean).join(', ')],
  ];
  const hs = Math.min(64, fitSize(ctx, 'display', B.name, 64, 430 / 1.03, TRACK, ctx.weights.heading, 36));
  const head = put(ctx, { x: 64, y: 96, w: 450, cls: 'disp', html: `<div style="font-size:${hs}px;line-height:64px;color:var(--ink)">${A(B.name)}</div><div style="font-size:${hs}px;line-height:64px;color:var(--quiet)">brand kit</div>` });
  const lead = body(ctx, 548, 104, 468, A(B.description));
  const Y0 = 288, STEP = 88;
  const rows = folders.map(([name, what, count], i) => {
    const y = Y0 + i * STEP;
    if (nLines(ctx, what, 16, 520) > 2) console.warn(`30-fluted kt: read-me row "${name}" runs to ${nLines(ctx, what, 16, 520)} lines`);
    return hairAt(64, y - 8, 952)
      + put(ctx, { x: 64, y, w: 226, cls: 'disp', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(name)}</div>` })
      + body(ctx, 306, y, 520, A(what))
      + put(ctx, { x: 846, y: y + 2, w: 170, cls: 'k', align: 'right', html: A(count) });
  }).join('');
  const ver = put(ctx, { x: 64, y: KEY, w: 700, cls: 'k', html: A(ctx.versionLine) });
  const a = arch(T, 744, 1008, 744);
  return kshell(ctx, 'read-me-1', T, { flat: a.flat, shape: a.shape, over: a.over, omit: [T.strong], html: head + lead + rows + ver, folder: '00 Read me', title: 'The kit', no: 1 });
}

function readMe2(ctx) {
  const T = tokens(ctx), slot = ctx.edition === 'slot';
  const steps = [
    ['Start with the logo.', slot ? 'Drop the approved files into the three logo folders, then follow the clear space and minimum size in the guidelines.' : 'Use the version made for the ground it sits on. The guidelines show every version and every ground.'],
    ['Take colour from the files.', 'Open the ASE in Adobe, paste the CSS, or read the JSON. Never pick a colour from a screenshot.'],
    ['Install the faces.', 'The links in fonts.md go to Google Fonts. Every face is under the SIL Open Font License, free for commercial use.'],
  ];
  const rows = steps.map(([a, b], i) => {
    const y = 256 + i * 120;
    return hairAt(64, y - 16, 710)
      + put(ctx, { x: 64, y, w: 226, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(a)}</div>` })
      + body(ctx, 306, y, 468, A(b));
  }).join('');
  const a = arch(T, 276, 804, 640);
  const ver = put(ctx, { x: 64, y: KEY, w: 700, cls: 'k', html: A(ctx.versionLine) });
  return kshell(ctx, 'read-me-2', T, { flat: a.flat, shape: a.shape, over: a.over, omit: [T.strong], html: headline(ctx, 'How to use it', '') + rows + ver, folder: '00 Read me', title: 'How to use it', no: 2 });
}

function readMe3(ctx) {
  const T = tokens(ctx), B = ctx.brand, f = B.fonts, g = ctx.logo.geos.colour;
  const lw = Math.floor(Math.min(640, (200 * g.w) / g.h));
  const logo = `<div class="a" style="left:64px;top:120px">${logoHtml(ctx, T, 'colour', { width: lw })}</div>`;
  // the lines and the traits, two columns
  const pn = nLines(ctx, B.lines.primary, 28, 468, ctx.weights.heading, 'display'), oy = 400 + pn * 32 + 16;
  const lines = put(ctx, { x: 64, y: 400, w: 468, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(B.lines.primary)}</div>` })
    + B.lines.others.map((l, i) => body(ctx, 64, oy + i * 25, 468, A(l))).join('');
  const traits = (B.personality || []).slice(0, 3).map((p, i) => put(ctx, { x: 548, y: 400 + i * 40, w: 468, cls: 'disp', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(p.trait)}</div>` })).join('');
  // the faces, each named in itself
  const fam = [[f.display, 'display', 'Display', ctx.weights.heading]];
  if (f.body.family === f.display.family) fam[0][2] = 'Display and body'; else fam.push([f.body, 'body', 'Body', ctx.weights.regular]);
  if (f.mono) fam.push([f.mono, 'mono', 'Mono', 400]);
  const faces = fam.map(([x, role, label, w], i) => {
    const cx = [64, 427, 790][i], ws = x.weights.slice().sort((a, b) => a - b);
    const nm = `<div style="font-size:28px;line-height:32px;color:var(--ink);font-family:var(--${role});font-weight:${w};${role === 'display' ? `font-stretch:${x.stretch || 100}%;letter-spacing:-0.02em;` : ''}">${A(x.family)}</div>`;
    return hairAt(cx, 592, 226) + put(ctx, { x: cx, y: 608, w: 226, cls: 'a', html: nm }) + key(ctx, cx, 648, 226, A(faceCap(label, ws)));
  }).join('');
  const ver = put(ctx, { x: 64, y: KEY, w: 700, cls: 'k', html: A(ctx.versionLine) });
  return kshell(ctx, 'read-me-3', T, { html: logo + lines + traits + faces + ver, folder: '00 Read me', title: 'The brand on one page', no: 3 });
}

export function readMe(ctx) { return [readMe1(ctx), readMe2(ctx), readMe3(ctx)]; }

// ---- 02 Colour -------------------------------------------------------------------------------------------------------------------

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lch = (s) => { const [L, C, H] = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(s).slice(1, 4).map(Number), z = (v) => v.toFixed(2).replace(/^0./, ".");  return `${z(L)} ${z(C)} ${Math.round(H)}`; };
const pct = (c) => `${Math.round((c.share || 0) * 100)}%`;
const rect0 = (c, y, h, inner, extra = '') => `<div class="a" style="left:${c.x}px;top:${y}px;width:${c.w}px;height:${h}px;background:${c.hex};${extra}">${inner}</div>`;

function paletteSheet(ctx) {
  const T = tokens(ctx), cols = paletteCols(ctx, { ground: T.ground, actionHex: T.strong, minW: FIELD_MIN });
  const Y0 = 96, H = 1152 - Y0;
  // the fields run on under the glass; the strong field's copy in the glass starts 6 px left of its flat edge (the guidelines palette does the same)
  const fieldsSvg = cols.map((c) => { const s = lo(c.hex) === lo(T.strong) && c.x > 0 ? 6 : 0; return `<rect x="${c.x - s}" y="${Y0}" width="${c.w + s}" height="${H}" fill="${c.hex}"/>`; }).join('');
  const under = cols.map((c, i) => {
    const col = ctx.colours.find((k) => lo(k.hex) === lo(c.hex));
    if (!col) return rect0(c, Y0, H, '');
    const fg = onFill(ctx, T, c.hex, TXT, 400), pad = i === 0 ? 64 : 16, near = ctx.ratio(c.hex, T.ground) < 1.25;
    const vals = [`HEX ${col.hex.toUpperCase()}`, `RGB ${hexRgb(col.hex).join(' ')}`, `OKLCH ${lch(col.oklch)}`, ...(ctx.C.cmykParts(col) ? [`CMYK ${ctx.C.cmykParts(col).join(' ')}`] : [])];
    const need = Math.max(...vals.map((v) => adv(ctx, 'dm', v, TXT, 0, 400)), adv(ctx, 'body', col.name, 16, 0, ctx.weights.medium));
    if (pad + need + 16 > c.w) console.warn(`30-fluted kt palette: ${col.name} values need ${Math.ceil(need)} px, the field leaves ${c.w - pad - 16}`);
    // the share as the field's one big number, standing on the band's edge
    const ns = Math.min(64, fitSize(ctx, 'display', pct(col), 64, c.w - pad - 16, TRACK, ctx.weights.heading, 28));
    const inner = `<div style="position:absolute;left:${pad}px;top:16px;color:${fg};white-space:nowrap"><div style="font:${ctx.weights.medium} 16px/20px var(--body)">${A(col.name)}</div>`
      + `<div style="margin-top:8px;font:400 ${TXT}px/20px var(--dm)">${vals.map(A).join('<br>')}</div></div>`
      + `<div class="disp num" style="position:absolute;left:${pad}px;top:${736 - Y0 - 64 - 8}px;color:${fg};font-size:${ns}px;line-height:64px;white-space:nowrap">${A(pct(col))}</div>`;
    return rect0(c, Y0, H, inner, near ? 'box-shadow:inset 0 0 0 1px var(--hair);' : '');
  }).join('');
  const wrapN = (text, w) => nLines(ctx, text, TXT, w, 400, 'chrome');
  const keys = cols.filter((c) => ctx.colours.some((k) => lo(k.hex) === lo(c.hex))).slice(0, 5).map((c) => {
    const col = ctx.colours.find((k) => lo(k.hex) === lo(c.hex));
    const cx = c.x === 0 ? 64 : c.x + 16, cw = Math.min(c.x === 0 ? c.w - 64 - 16 : c.w - 32, 360), sentences = col.lands.split(/(?<=\.)\s+/);
    let land = sentences[0]; if (wrapN(land, cw) > 4 && land.includes(':')) land = `${land.split(':')[0]}.`;
    for (const s of sentences.slice(1)) { if (wrapN(`${land} ${s}`, cw) <= 4) land = `${land} ${s}`; else break; }
    return key(ctx, cx, 1176, cw, `<div class="kn">${A(col.name)}</div><div>${A(land)}</div>`);
  }).join('');
  return kshell(ctx, 'palette-1', T, { under, shape: fieldsSvg, fields: false, html: keys, folder: '02 Colour', title: 'Palette', no: 1 });
}

function toneSheets(ctx) {
  const T = tokens(ctx), tones = ctx.tones || [], out = [], PER = 6;
  for (let p = 0; p * PER < tones.length; p++) {
    const chunk = tones.slice(p * PER, (p + 1) * PER);
    let html = headline(ctx, 'Tones', '') + body(ctx, 548, 104, 468, 'The tones that come with the palette files, each with the job it does.');
    chunk.forEach((t, i) => {
      const y = 248 + i * 80, near = ctx.ratio(t.hex, T.ground) < 1.25;
      html += hairAt(64, y, 952)
        + `<div class="a" style="left:64px;top:${y + 20}px;width:40px;height:40px;background:${t.hex};${near ? 'box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></div>`
        + put(ctx, { x: 128, y: y + 16, w: 280, cls: 'kn', html: A(t.name) })
        + put(ctx, { x: 128, y: y + 38, w: 280, cls: 'v', role: 'dm', html: A(t.hex.toUpperCase()) })
        + key(ctx, 428, y + 16, 110, A(t.role || ''))
        + key(ctx, 548, y + 16, 468, A(t.lands || ''));
      if (nLines(ctx, t.lands || '', TXT, 468, 400, 'chrome') > 3) console.warn(`30-fluted kt tones: "${t.name}" lands runs past 3 lines`);
    });
    out.push(kshell(ctx, `palette-${2 + p}`, T, { html, folder: '02 Colour', title: p ? 'Tones, continued' : 'Tones', no: 2 + p }));
  }
  return out;
}

// ---- 03 Type ---------------------------------------------------------------------------------------------------------------------

// one page a family: its name in itself, its weights, the alphabet, a sample, and two glyphs standing in the glass
function typeSheets(ctx) {
  const T = tokens(ctx), B = ctx.brand, f = B.fonts, S = B.type.sample, scale = B.type.scale;
  const fams = [{ role: 'display', x: f.display, label: 'Display', w: ctx.weights.heading, pair: 'Ss' }];
  if (f.body.family === f.display.family) fams[0].label = 'Display and body'; else fams.push({ role: 'body', x: f.body, label: 'Body', w: ctx.weights.regular, pair: 'Gg' });
  if (f.mono) fams.push({ role: 'mono', x: f.mono, label: 'Mono', w: 400, pair: '08' });
  const mx = f.mono ? f.mono.weights[0] : 400;
  const out = fams.map((F, n) => {
    const { role, x } = F, ws = x.weights.slice().sort((a, b) => a - b), isDisp = role === 'display', own = `font-family:var(--${role});${isDisp ? `font-stretch:${x.stretch || 100}%;letter-spacing:-0.02em;` : ''}`;
    const trk = isDisp ? TRACK : 0, fw = role === 'mono' ? mx : F.w;
    const hs = Math.min(64, fitSize(ctx, role, x.family, 64, 777 / 1.03, trk, fw, 36));
    let html = put(ctx, { x: 64, y: 96, w: 777, cls: 'a', html: `<div style="font-size:${hs}px;line-height:64px;color:var(--ink);${own}font-weight:${fw}">${A(x.family)}</div>` });
    html += put(ctx, { x: 64, y: 176, w: 420, cls: 'a', style: 'white-space:pre', html: ws.map((w) => `<span style="font-size:28px;line-height:32px;color:var(--ink);${own}font-weight:${w}">${w}</span>`).join('<span style="display:inline-block;width:20px"></span>') });
    html += body(ctx, 64, 232, 420, A(`${F.label}. SIL Open Font License 1.1.`));
    const alpha = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789'];
    html += put(ctx, { x: 64, y: 304, w: 420, cls: 'a', style: 'white-space:pre', html: alpha.map((r) => `<div style="font-size:28px;line-height:32px;color:var(--soft);${own}font-weight:${fw};letter-spacing:0.06em">${r}</div>`).join('') });
    // the sample
    let sample = '', keyHtml = '';
    if (role === 'body') {
      const tk = scale.find((t) => t.token === 'body') || { size: 16, line: 1.55, use: 'Reading text' }, lh = Math.round(tk.size * tk.line);
      sample = put(ctx, { x: 64, y: 496, w: 420, cls: 'a', style: `white-space:normal;font:${tk.weight || 400} ${tk.size}px/${lh}px var(--body);color:var(--soft)`, html: A(S.paragraph) });
    } else if (isDisp) {
      sample = put(ctx, { x: 64, y: 496, w: 420, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(S.headline)}</div>` });
    } else {
      sample = put(ctx, { x: 64, y: 496, w: 420, cls: 'mono', style: `font-size:16px;line-height:24px;color:var(--soft);font-weight:${mx}`, html: ctx.colours.map((c) => A(c.hex.toUpperCase())).join('<br>') });
    }
    const toks = scale.filter((t) => (role === 'mono' ? false : (t.face === 'body') === (role === 'body'))).slice(0, 3);
    keyHtml = toks.length ? toks.map((t, i) => put(ctx, { x: GX[[0, 3, 6][i]], y: KEY, w: 300, cls: 'k', html: `${A(t.token[0].toUpperCase() + t.token.slice(1))} ${t.size} / ${Math.round(t.size * t.line)}, ${t.weight}` })).join('')
      : put(ctx, { x: 64, y: KEY, w: 600, cls: 'k', html: A(`${x.family} is for literal values: a hex, a token or a code string.`) });
    // the pair in the glass: round bowls only, right edge 1016, as large as fits right of the left column; flat above the band, bent by the reeds inside it
    const size = fitSize(ctx, role, F.pair, 560, 1016 - 496, trk, fw), pa = paths(ctx, role, F.pair, size, trk, fw), ax = 1016 - pa.x2, BASE = 868;
    const shape = `<path transform="translate(${ax} ${BASE})" d="${pa.d}" fill="${T.strong}"/>`, wp = warpPath(pa.d, ax, BASE, {});
    return kshell(ctx, `typefaces-${n + 1}`, T, { flat: shape, shape: wp ? '' : shape, over: wp ? `<path d="${wp}" fill="${T.strong}"/>` : '', omit: [T.strong], html: html + sample + keyHtml, folder: '03 Type', title: x.family, no: n + 1 });
  });
  return out;
}

// ---- 04 Icons --------------------------------------------------------------------------------------------------------------------

function iconSheets(ctx) {
  const T = tokens(ctx), B = ctx.brand, set = iconSet(ctx), s = ctx.iconStyle, n = set.length;
  const hero = set.find((x) => !ICON_SET.includes(x)) || set[0];
  const joinWord = { miter: 'mitred', round: 'round', bevel: 'bevelled' }[s.join] || s.join;
  const intro = `${n} icons from Lucide, drawn in the ${B.name} stroke: ${s.stroke} px lines at 24 px, ${s.cap} ends and ${joinWord} corners.`;
  const cell = (name, x, y) => `<div class="a" style="left:${x}px;top:${y}px;color:var(--ink)">${icon(ctx, name, 24)}</div>` + put(ctx, { x, y: y + 36, w: 200, cls: 'k', html: A(name) });
  const out = [];
  // first page: the hero icon, one of the set drawn at 544 px, standing through the glass; the grid at the right
  const nw = Math.max(...set.map((x) => adv(ctx, 'chrome', x, TXT, 0, 400))) + 24, cols = Math.max(1, Math.min(3, Math.floor(468 / nw))), cw = 468 / cols, perFirst = cols * 6;
  const first = set.slice(0, perFirst);
  const HS = 544, HX = 24, HY = 1152 - HS;
  const heroSvg = icon(ctx, hero, HS).replace(' class="ui-icon"', '').replace(/width="\d+" height="\d+"/, `x="${HX}" y="${HY}" width="${HS}" height="${HS}"`).replace('stroke="currentColor"', `stroke="${T.strong}"`);
  let html = headline(ctx, 'Icons', '') + body(ctx, 64, 176, 420, A(intro));
  first.forEach((name, i) => { html += cell(name, 548 + (i % cols) * cw, 232 + Math.floor(i / cols) * 72); });
  html += key(ctx, 64, KEY, 468, 'Each icon is one SVG file in 04 Icons. It takes the colour of the text beside it, so it never needs a colour of its own. The ISC licence is in LICENSE.txt.');
  html += key(ctx, 548, KEY, 468, `<div class="kn">${A(hero)}.svg</div><div>The same file as the one in the grid, drawn at ${HS} px.</div>`);
  out.push(kshell(ctx, 'icons-1', T, { flat: heroSvg, shape: heroSvg, omit: [T.strong], html, folder: '04 Icons', title: 'Icon set', no: 1 }));
  // further pages: the rest of the set, four to a row
  const rest = set.slice(first.length), per = 4 * 8;
  for (let p = 0; p * per < rest.length; p++) {
    const chunk = rest.slice(p * per, (p + 1) * per);
    let q = headline(ctx, 'Icons', 'continued');
    chunk.forEach((name, i) => { q += cell(name, 64 + (i % 4) * 238, 232 + Math.floor(i / 4) * 64); });
    out.push(kshell(ctx, `icons-${p + 2}`, T, { html: q, folder: '04 Icons', title: 'Icon set, continued', no: 2 + p }));
  }
  return out;
}

// ---- 05 Imagery ------------------------------------------------------------------------------------------------------------------

function jpegSize() { throw new Error('theme 30: photograph files are not read by the server export'); }
// a photograph cropped to the shot's safe box, filling a w x h box with nothing laid over it
// a photograph counts only where the brand has one and the edition shows it (the slot edition holds frames, never the sample brand's pictures)
const hasPhoto = (ctx, s) => !!s.photo && ctx.edition !== 'slot';
function cropped(ctx, s, x, y, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  // the crop is slid to the shot's focus (brand.json `focus`, fractions of the picture) when it has room to slide; centred when the brand gives none
  const k = Math.max(w / c.w, h / c.h), r = (v) => Math.round(v * 100) / 100, f = Array.isArray(s.focus) && s.focus.length === 2 ? s.focus : [0.5, 0.5];
  const slide = (full, view, fc, c0) => Math.min(Math.max(fc * full - view / 2, c0), c0 + full - view);
  const ox = c.w * k - w > 0.5 ? -slide(c.w * k, w, (f[0] * n.w - c.x) / c.w, 0) : (w - c.w * k) / 2, oy = c.h * k - h > 0.5 ? -slide(c.h * k, h, (f[1] * n.h - c.y) / c.h, 0) : (h - c.h * k) / 2;
  return `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden">${plateImg(`${A(ctx.photoUrl(s.photo))}`, `${A(s.alt)}`, `position:absolute;display:block;max-width:none;width:${r(n.w * k)}px;height:${r(n.h * k)}px;left:${r(ox - c.x * k)}px;top:${r(oy - c.y * k)}px`)}</div>`;
}
const shotName = (ctx, s) => s.caption || ctx.cap(s.id);

function photoSheets(ctx) {
  const T = tokens(ctx), B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots, out = [];
  // direction: the five lines of direction, one row each
  const rows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v);
  let y = 248, html = headline(ctx, 'Photography direction', '');
  for (const [k, v] of rows) {
    const h = Math.max(32, nLines(ctx, v, 16, 620) * 25) + 32;
    html += hairAt(64, y - 16, 862) + put(ctx, { x: 64, y, w: 226, cls: 'disp', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(k)}</div>` }) + body(ctx, 306, y, 620, A(v));
    y += h;
  }
  if (y - 16 > 736) console.warn(`30-fluted kt photography: direction rows run to y ${y}`);
  const a = arch(T, 744, 1008, 744);
  out.push(kshell(ctx, 'photography-1', T, { flat: a.flat, shape: a.shape, over: a.over, omit: [T.strong], html, folder: '05 Imagery', title: 'Photography direction', no: 1 }));
  // the shot list: a taken photograph a page at full width above the band, its name and what it shows in the key row (a generated photograph carries no credit;
  // a real photographer's credit prints once, on that photograph's page). The briefs still to shoot are set together, a row each, so no page is a lone empty box.
  const taken = shots.filter((s) => hasPhoto(ctx, s)), briefs = shots.filter((s) => !hasPhoto(ctx, s) && s.slot);
  taken.forEach((s, i) => {
    const sub = `${s.alt}.${s.credit && !s.generated ? ` Photo: ${s.credit}.` : ''}`;
    const label = put(ctx, { x: 64, y: KEY, w: 468, cls: 'k', style: 'white-space:normal', html: `<div class="kn">${A(shotName(ctx, s))}</div><div>${A(sub)}</div>` });
    out.push(kshell(ctx, `photography-${2 + i}`, T, { html: cropped(ctx, s, 64, 96, 952, 640) + label, folder: '05 Imagery', title: i ? 'Shot list, continued' : 'Shot list', no: 2 + i }));
  });
  const RW = 700, ROOM = 736;
  const briefOf = (s) => s.slot || '';
  const rowH = (s) => Math.max(32, nLines(ctx, briefOf(s), 16, RW) * 25) + 32;
  const pagesOf = []; let cur = [], used = 248;
  for (const s of briefs) { if (cur.length && used + rowH(s) - 16 > ROOM) { pagesOf.push(cur); cur = []; used = 248; } cur.push(s); used += rowH(s); }
  if (cur.length) pagesOf.push(cur);
  pagesOf.forEach((chunk, p) => {
    const head = taken.length || p ? ['Briefs', p ? 'to shoot, continued' : 'to shoot'] : ['Shot list', p ? 'continued' : ''];
    let html = headline(ctx, head[0], head[1]) + body(ctx, 548, 104, 468, `${briefs.length} ${briefs.length === 1 ? 'brief' : 'briefs'} still to shoot. Each says who, where and the light.`), y = 248;
    for (const s of chunk) {
      html += hairAt(64, y - 16, 952) + put(ctx, { x: 64, y, w: 226, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:28px;line-height:32px;color:var(--ink)">${A(shotName(ctx, s))}</div>` }) + body(ctx, 306, y, RW, A(briefOf(s)), 'color:var(--ink)');
      y += rowH(s);
    }
    out.push(kshell(ctx, `photography-${2 + taken.length + p}`, T, { html, folder: '05 Imagery', title: head[0], no: 2 + taken.length + p }));
  });
  return out;
}

export function sheets(ctx) {
  return { palette: [paletteSheet(ctx), ...toneSheets(ctx)], typefaces: typeSheets(ctx), photography: photoSheets(ctx), icons: iconSheets(ctx) };
}
