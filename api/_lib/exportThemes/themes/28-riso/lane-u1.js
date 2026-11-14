// Lane u1 for theme 28 (Riso): the UI kit's chrome and its foundation pages (cover, contents, colour-light, colour-dark, type-scale, spacing,
// radii-borders, elevation). A kit page is the same sheet off the brand's press as the guidelines: a plate, a pass and a hit. As on lane g1,
// the hit numeral is always a real count taken from ctx (tokens, pages, roles, steps), and the words on the plate say what it counts.
// The product itself is never printed with the press: a .ui panel is the product's own surface pasted clean onto the sheet, in register and
// unmottled, like a photograph, and the real components (ctx.ui, componentsCss) sit inside it unrestyled.
//
// For lanes u2 and u3 (import these read-only):
//   kitSheet(ctx, id, { hp, hit, tab }, inner)   the whole sheet: plate hp deep, pass, hit { text, x, base, size, maxW }, the kit's foot
//   panel(x, y, w, h, mode, inner, style)        a .ui region (the kit's tokens, light or dark) placed on the sheet; children may use .a
//   plateLabel(t, x), plateNote(html, x, y, w)    the label and the note printed on the plate, in the plate's text ink
//   label(x, y, t), note(x, y, w, html)           a c-label and a c-note on paper
//   hair(y, x, w)                                 a 0.5 px key rule
//   table(ctx, y, cols, rows, { rowH, head })     a ruled table on paper; cols [{ x, w, head, cls, right }], rows of cell html (null = a group gap)
//   swatch(ctx, x, y, hex, s)                     a clean chip, with a hairline edge where it would vanish into the paper
//   fit, nLines, word, Word, rt, sc               measuring and wording helpers (rt: "4.5 : 1"; sc: the brand's screen copy, as the book prints it)
// This lane's css() writes the kit tokens and componentsCss(ctx) once, for the UI kit document only (ctx.kind === 'uikit'); the other kit lanes
// must not add them again. Every class here starts u1-.
import { A, inkW, wrap, faceFor, faceCss, pressOf, logoOnPlate, val, X0, X1, W, inkLayers, fitW, longDate } from './sheet.js';
import { fnv1a } from './press.js';
import { bookBrand } from './copy.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

// ---------------------------------------------------------------- chrome (exported for the other kit lanes)

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty', 'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five',
  'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty'];
export const word = (n) => WORDS[n] || String(n);
export const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
export const rt = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))} : 1`;
export const sc = (ctx) => bookBrand(ctx).ui.screen.content;
const stem = (ctx, role, weight = 400) => faceFor(ctx, role, weight).stem;
// lines a text takes at this size: measured 12 px narrower than it is set, so the browser never wraps sooner than the count says
export const nLines = (st, t, size, w) => wrap(st, String(t || ''), size, w - 12).length;
// the largest [size, line] at which every text keeps to maxLines in width w (one line is also held to the measure by its ink width)
export const fit = (st, texts, sizes, w, maxLines) => sizes.find(([s]) => texts.every((t) => nLines(st, t, s, w) <= maxLines && (maxLines > 1 || inkW(st, String(t || ''), s) <= w - 12))) || sizes[sizes.length - 1];

export const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${t}</p>`;
export const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
export const label = (x, y, t) => `<p class="a c-label nw" style="left:${x}px;top:${y}px">${t}</p>`;
export const note = (x, y, w, t) => `<p class="a c-note" style="left:${x}px;top:${y}px;width:${w}px">${t}</p>`;
export const hair = (y, x = X0, w = X1 - X0) => `<i class="a u1-hr" style="left:${x}px;top:${y}px;width:${w}px"></i>`;
export function swatch(ctx, x, y, hex, s = 12) {
  const edge = ctx.ratio(hex, pressOf(ctx).paper) < 1.3 ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : '';
  return `<i class="a" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:${hex}${edge}"></i>`;
}

// the product's surface pasted onto the sheet; where it is as pale as the paper, a 0.5 px key edge shows where the screen stops
export function panel(x, y, w, h, mode, inner, style = '') {
  return `<div class="ui u1-pan"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}${style}">${inner}</div>`;
}

// a ruled table: a 0.5 px key rule over the head and over each group; a null row opens a new group
export function table(ctx, y, cols, rows, { rowH = 20, head = true, gap = 8 } = {}) {
  // every cell is one line box as tall as the row, so words and mono values share a baseline
  const cell = (c, html, top) => `<p class="a ${c.cls || 'c-note'} nw" style="${c.right ? `right:${W - c.x - c.w}px;text-align:right` : `left:${c.x}px`};top:${top}px;line-height:${rowH}px${c.w && !c.right ? `;width:${c.w}px` : ''}">${html}</p>`;
  let out = '', yy = y;
  if (head) { out += cols.map((c) => (c.head ? `<p class="a c-label nw" style="${c.right ? `right:${W - c.x - c.w}px` : `left:${c.x}px`};top:${yy}px">${c.head}</p>` : '')).join(''); yy += 20; }
  out += hair(yy); yy += 4;
  for (const r of rows) {
    if (!r) { yy += gap; out += hair(yy); yy += 4; continue; }
    out += r.map((h, i) => (h == null || h === '' ? '' : cell(cols[i], h, yy))).join('');
    yy += rowH;
  }
  return { html: out, y: yy };
}

// the kit's foot: the press's colour bar (each drum this sheet prints, then the overprints it shows), the part of the kit, and the folio
function kitFoot(ctx, id) {
  const P = pressOf(ctx), p = ctx.pages.find((x) => x.id === id);
  let x = X0, bar = '';
  for (const d of P.drums) { bar += `<i class="sq" style="left:${x}px;background:${d.hex}"></i>`; x += 12; }
  const ov = (under, over, screen) => `<span class="ov" style="left:${x}px"><i style="background:${under}"></i><i class="${screen ? 'mk' + screen : ''}" style="background:${over};mix-blend-mode:multiply"></i></span>`;
  const seen = new Set();
  for (const [u, o, s, res] of [[P.plate, P.passPlate || P.pass, P.passScreen, P.passOnPlate], [P.plate, P.hit, 0, P.hitOnPlate]]) {
    if (seen.has(res)) continue; seen.add(res); bar += ov(u, o, s); x += 12;
  }
  const title = id === 'cover' ? 'UI kit' : p.section ? p.section.title : p.title;
  const no = String(ctx.pageNo(id)).padStart(3, '0'), total = String(ctx.pages.length).padStart(3, '0');
  return `${bar}<span class="a c-foot" style="left:${x + 10}px;top:1078px;white-space:nowrap">${A(title)}</span>
<span class="a c-value" style="right:${W - X1}px;top:1078px;white-space:nowrap">${no} / ${total}</span>`;
}

// one kit sheet. The misregistration and the paper's grain are seeded by "ui:<id>", so a kit page never prints the same as the guidelines page of that id
export function kitSheet(ctx, id, { hp, hit, tab = '' }, inner) {
  const d = inkLayers(ctx, 'ui:' + id, { w: W, h: hp, plate: { x: 0, y: 0, w: W, h: hp }, pass: { x: 639, y: -8, w: 163, h: 1139 }, hit });
  const fh = fnv1a(ctx.brand.slug + ':ui:' + id + ':fibre');
  return `<section class="pg" data-page="${id}" style="--fx:${fh % 512}px;--fy:${(fh >>> 9) % 512}px">${d.html}${tab}<div class="lay" style="z-index:3">${inner}${kitFoot(ctx, id)}</div></section>`;
}

// the kit's tokens on every .ui region (light, and dark under data-theme), and the shipped component styles, unchanged
export function kitCss(ctx) {
  const g = tokenGroups(ctx);
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

export function css(ctx) {
  return `${ctx.kind === 'uikit' ? kitCss(ctx) : ''}
.pg .u1-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .u1-pan{position:absolute;isolation:isolate;overflow:hidden;outline:.5px solid var(--hair);outline-offset:0}
.pg .u1-pan .a{position:absolute}
.pg .u1-col{display:flex;flex-direction:column;align-items:flex-start}
.pg .u1-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.pg .u1-lg{position:absolute;display:flex;flex-direction:column}
.pg .u1-lg>div{display:flex}
.pg .u1-lg .u1-l{flex:none;width:188px;margin-right:12px;padding:16px 0;border-top:.5px solid var(--hair)}
.pg .u1-lg .u1-r{flex:none;width:378px;padding:20px;background:var(--surface)}
.pg .u1-lg>div:first-child .u1-r{border-top:.5px solid var(--hair)}
.pg .u1-lg>div:last-child .u1-r{border-bottom:.5px solid var(--hair)}
.pg .u1-lg .u1-r{border-left:.5px solid var(--hair);border-right:.5px solid var(--hair)}
.pg .u1-sk{display:flex;flex-direction:column;gap:10px}
.pg .u1-b{font-weight:600}
`;
}

// ---------------------------------------------------------------- page pieces

const screenFont = (ctx, t) => `font-family:var(--ff-${t.face === 'display' ? 'display' : 'body'});font-size:${t.size}px;line-height:${t.line}px;font-weight:${faceFor(ctx, t.face === 'display' ? 'display' : 'body', t.weight).weight}${t.face === 'display' && ctx.brand.fonts.display.stretch ? `;font-stretch:${ctx.brand.fonts.display.stretch}%` : ''}`;
const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[ctx.uiType.length - 1];

// ---- colour: light and dark share one composition, so the two sheets compare ----
function colourPage(ctx, id, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, ui = ctx.ui, isDark = mode === 'dark';
  const exempt = !!(ctx.brand.ui[mode] || {}).actionExempt;
  // every role a component reads, measured on the ground it prints on (grounds: the text that prints on them)
  const G = [
    [['Surface', 'surface', 'Text on it', M.text, M.surface, 4.5], ['Raised', 'raised', 'Text on it', M.text, M.raised, 4.5], ['Sunken', 'sunken', 'Quiet text on it', M['quiet-sunken'], M.sunken, 4.5]],
    [['Text', 'text', 'On surface', M.text, M.surface, 4.5], ['Soft text', 'text-soft', 'On surface', M['text-soft'], M.surface, 4.5], ['Quiet text', 'quiet', 'On surface', M.quiet, M.surface, 4.5]],
    [['Control edge', 'edge', 'On surface', M.edge, M.surface, 3], ['Divider', 'divider', 'On surface', M.divider, M.surface, 0], ['Focus ring', 'focus', 'On surface', M.focus, M.surface, 3]],
    [['Action', 'action', 'On surface', M.action, M.surface, exempt ? -1 : 3], ['Action hover', 'action-hover', 'Label on it', M['action-label'], M['action-hover'], 4.5],
      ['Action pressed', 'action-pressed', 'Label on it', M['action-label'], M['action-pressed'], 4.5], ['Action label', 'action-label', 'On action', M['action-label'], M.action, 4.5]],
    [['Disabled ground', 'disabled-bg', 'Disabled text on it', M['disabled-text'], M['disabled-bg'], 4.5], ['Scrim', 'scrim', 'Behind a dialog', null, null, 0]],
    ['success', 'warning', 'danger', 'info'].map((t) => [t[0].toUpperCase() + t.slice(1), t, 'On its own ground', M[t], M[t + '-bg'], 4.5]),
  ];
  const n = G.reduce((a, g) => a + g.length, 0);
  const need = (v) => (v > 0 ? val(`${v} : 1`) : v < 0 ? 'Exempt' : 'None');
  const cols = [{ x: 49, w: 12 }, { x: 69, w: 110, head: 'Role', cls: 'c-note u1-b' }, { x: 185, head: 'Token', cls: 'c-value' }, { x: 313, head: 'Value', cls: 'c-value' },
    { x: 377, w: 120, head: 'Measured' }, { x: 497, w: 52, head: 'Needs', right: true }, { x: 567, w: 60, head: 'Ratio', right: true, cls: 'c-value' }];
  const rows = [];
  G.forEach((g, gi) => {
    if (gi) rows.push(null);
    for (const [name, tok, how, fg, bg, nd] of g) rows.push(['', A(name), A('--' + tok), A(M[tok]), A(how), need(nd), fg ? A(rt(ctx, fg, bg)) : '']);
  });
  const ty = 560, T = table(ctx, ty, cols, rows, { rowH: 19, gap: 6 });
  // the chips in the table's first column, placed on each row's line
  let sw = '', yy = ty + 24;
  G.forEach((g, gi) => { if (gi) yy += 10; for (const r of g) { sw += swatch(ctx, 49, yy + 4, M[r[1]], 11); yy += 19; } });

  // the panel: the product's live line on its own surface, with its real buttons and every status in its words
  const hd = uiT(ctx, 'headline'), dst = stem(ctx, 'display', hd.weight);
  const es = [hd.size, 40, 36, 32, 30, 28, 26, 24].filter((s) => s <= hd.size).find((s) => inkW(dst, S.eta, s) <= 318) || 24;
  const left = `<div class="a u1-col ph-tight" style="left:24px;top:24px;width:330px;height:192px;justify-content:space-between">
<div class="u1-col" style="gap:6px"><p style="${screenFont(ctx, uiT(ctx, 'caption'))};color:var(--quiet)">${A(S.rider)}</p>
<p class="ui-display" style="font-size:${es}px;line-height:${Math.round(es * 1.14)}px;white-space:nowrap;color:var(--text)">${A(S.eta)}</p>
<p style="${screenFont(ctx, uiT(ctx, 'body'))};color:var(--text-soft)">${A(S.pickup)}</p></div>
<div class="u1-row">${ui.btn(F.book || S.share)}${ui.btn(S.call, { variant: 'secondary' })}</div></div>`;
  const right = `<div class="a u1-col" style="left:378px;top:24px;width:176px;gap:10px">${ctx.status.map((s) => ui.statusChip(s.id)).join('')}</div>`;
  const pan = panel(49, 288, 578, 240, mode, left + right);

  const inner = `${plateLabel(isDark ? 'Colour, dark' : 'Colour, light')}
${plateNote(`<b style="font-weight:600">${Word(n)} roles</b><br>a component reads in ${mode} mode, each measured on the ground it prints on.`, 403, 72, 224)}
${label(49, 264, isDark ? 'In use, on the dark surface' : 'In use, on the light surface')}${pan}${T.html}${sw}
${note(49, T.y + 12, 578, isDark ? `The same markup under ${val('data-theme="dark"')}. Components read the role, never a palette name.` : `The default, on ${val(':root')}. Components read the role, never a palette name.`)}`;
  return kitSheet(ctx, id, { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // Cover: the plate carries the kit's name and edition, and the hit is how many tokens the code package writes on :root.
  // The logo prints clean on the paper under it, with the kit's facts at the foot of the sheet.
  cover(ctx) {
    const B = ctx.brand, g = tokenGroups(ctx), pal = ctx.colours.length;
    const nTok = Object.keys(colourMap(ctx, 'light')).length + pal + ['space', 'radius', 'width', 'font', 'text', 'shadow'].reduce((a, k) => a + Object.keys(g[k]).length, 0);
    const nDark = Object.keys(colourMap(ctx, 'dark')).length;
    const lw = fitW(ctx, 'colour', 330, 150);
    const logo = `<div class="a" style="left:49px;top:664px;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div>`;
    const F = B.fonts, faces = [...new Set([F.display.family, F.body.family])];
    const fact = (x, w, l, v) => `${label(x, 948, l)}<p class="a c-body" style="left:${x}px;top:968px;width:${w}px">${v}</p>`;
    const inner = `<p class="a c-body" style="left:49px;top:48px;font-weight:600;color:var(--ptxt)">UI kit</p>
<p class="a c-body" style="left:49px;top:69px;color:var(--ptxt)">Edition <span class="v">${A(B.version.number)}</span>, ${A(longDate(B.version.date))}</p>
${plateNote(`<b style="font-weight:600">Tokens</b><br>in the code package, on ${val(':root')}. Dark mode changes ${nDark} of them.`, 403, 448, 224)}
${logo}
<p class="a c-body" style="left:403px;top:664px;width:224px">${A(B.product)}</p>
${hair(932)}${fact(49, 106, 'Version', val(B.version.number))}${fact(167, 224, 'Modes', 'Light and dark')}${fact(403, 224, 'Faces', faces.map(A).join(', '))}`;
    return kitSheet(ctx, 'cover', { hp: 600, hit: { text: String(nTok), x: 49, base: 552, size: 300, maxW: 330 } }, inner);
  },

  // Contents: the run, part by part. The hit is the number of pages in the kit; each part is a list of its pages with their folios,
  // set in two columns so the longest part stands alone on the right.
  contents(ctx) {
    const S = ctx.sections, np = ctx.pages.length, dst = stem(ctx, 'display', 500);
    const [ts] = fit(dst, S.map((s) => s.title), [[24], [22], [20], [18]], 220, 1);
    const longest = S.reduce((a, s, i) => (s.pages.length > S[a].pages.length ? i : a), 0);
    const colOf = (i) => (i === longest ? { x: 345, w: 282 } : { x: 49, w: 272 });
    const ys = { 49: 432, 345: 432 };
    let out = '';
    S.forEach((s, i) => {
      const c = colOf(i); let y = ys[c.x];
      out += `${hair(y, c.x, c.w)}<p class="a c-value" style="left:${c.x}px;top:${y + 14}px">${String(s.n).padStart(2, '0')}</p>
<p class="a nw" style="left:${c.x + 36}px;top:${y + 8}px;${faceCss(ctx, 'display', 500)};font-size:${ts}px;line-height:${ts + 6}px">${A(s.title)}</p>`;
      y += 24 + ts + 18;
      for (const p of s.pages) {
        out += `<p class="a c-body nw" style="left:${c.x + 36}px;top:${y}px">${A(p.title)}</p><p class="a c-value" style="right:${W - c.x - c.w}px;top:${y + 4}px">${String(ctx.pageNo(p.id)).padStart(3, '0')}</p>`;
        y += 24;
      }
      ys[c.x] = y + 36;
    });
    const inner = `${plateLabel('Contents', 49)}
${plateNote(`<b style="font-weight:600">${Word(np)} pages</b><br>in ${word(S.length)} parts, from the cover to the code package.`, 403, 290, 224)}${out}`;
    return kitSheet(ctx, 'contents', { hp: 380, hit: { text: String(np), x: 49, base: 332, size: 280, maxW: 330 } }, inner);
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // Type scale: each step printed at the size it ships, largest first, in a line of the product's own copy; its token and values beside it.
  'type-scale'(ctx) {
    const S = sc(ctx), F = S.form || {}, D = S.dialog || {}, n = ctx.uiType.length;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': D.title, title: S.rider, headline: S.eta };
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size);
    let y = 340, rows = '';
    for (const t of steps) {
      const role = t.face === 'display' ? 'display' : 'body', st = stem(ctx, role, t.weight);
      // the product's line for this step, else what the step is for: either is printed whole and wraps at the measure
      const text = [sample[t.token], t.use].find((x) => x && nLines(st, x, t.size, 392) <= 2) || t.use;
      const h = Math.max(nLines(st, text, t.size, 392) * t.line, 56);
      const fam = ctx.brand.fonts[role].family;
      rows += `${hair(y)}<p class="a" style="left:49px;top:${y + 16}px;width:392px;${faceCss(ctx, role, t.weight)};font-size:${t.size}px;line-height:${t.line}px">${A(text)}</p>
<p class="a c-label nw" style="left:461px;top:${y + 18}px">${A(t.token)}</p><p class="a c-value nw" style="left:461px;top:${y + 36}px">${t.size} / ${t.line} / ${t.weight}</p>
<p class="a c-note nw" style="left:461px;top:${y + 53}px">${A(fam)}</p>`;
      y += h + 32;
    }
    const min = Math.min(...ctx.uiType.map((t) => t.size));
    const inner = `${plateLabel('Type scale', 49)}
${plateNote(`<b style="font-weight:600">${Word(n)} steps</b><br>from the headline down to the caption, each set here at the size it ships.`, 49, 72, 272)}
${label(461, 316, 'Token, size / line / weight')}${rows}
${hair(y)}<p class="a c-note" style="left:49px;top:${y + 12}px;width:392px">Sizes and line heights in px. Nothing on screen is set smaller than ${val(min + ' px')}.</p>`;
    return kitSheet(ctx, 'type-scale', { hp: 284, hit: { text: String(n), x: 403, base: 240, size: 220, maxW: 224 } }, inner);
  },

  // Spacing: the scale printed as a step wedge in the plate's ink, each band as deep as its step, at true size.
  spacing(ctx) {
    const sp = ctx.space, n = sp.length, base = ctx.brand.ui.spacingBase;
    const allOn = base && sp.every((s) => s.px % base === 0);
    // the gap between bands grows to fill the sheet (the bands themselves stay at their true depth)
    const gap = Math.max(20, Math.min(64, Math.floor((1048 - 296 - 12 - 110 - sp.reduce((a, s) => a + Math.max(s.px, 14), 0)) / n)));
    let y = 296, out = '';
    for (const s of sp) {
      const h = Math.max(s.px, 14);
      out += `<p class="a c-value nw" style="left:49px;top:${y}px">--${A(s.token.replace('space-', 'sp-'))}</p><p class="a c-value nw" style="left:121px;top:${y}px">${s.px} px</p>
<i class="a" style="left:167px;top:${y}px;width:460px;height:${s.px}px;background:var(--plate)"></i>`;
      y += h + gap;
    }
    y += 12;
    const first = sp[0].token.replace('space-', 'sp-'), last = sp[n - 1].token.replace('space-', 'sp-');
    const inner = `${plateLabel('Spacing')}
${plateNote(`<b style="font-weight:600">${Word(n)} steps</b><br>for every gap and padding, from ${val(sp[0].px + ' px')} to ${val(sp[n - 1].px + ' px')}.`, 403, 72, 224)}
${label(49, 264, 'Each band is as deep as its step')}${out}
${hair(y)}${label(49, y + 16, allOn ? `A ${base} px base` : 'The steps')}${note(49, y + 36, 272, allOn ? `Every step is a whole number of ${val(base + ' px')} units, so edges land on the same lines across a screen.` : 'The steps are set by the brand, not by a single base.')}
${label(345, y + 16, 'In the code')}${note(345, y + 36, 282, `Written as ${val('--' + first)} to ${val('--' + last)} in tokens.css.`)}`;
    return kitSheet(ctx, 'spacing', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Radii and borders: one corner of an input drawn many times its size, beside the real components at 1:1, then every radius and line token.
  'radii-borders'(ctx) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, ui = ctx.ui, g = tokenGroups(ctx), R = ctx.radius;
    const rIn = R.input, bw = ctx.brand.ui.border;
    const k = Math.max(4, Math.min(24, Math.floor(160 / Math.max(rIn, 1)), Math.floor(32 / bw)));
    const ro = rIn * k, ri = Math.max(0, rIn - bw) * k, e = bw * k, bx = 145, by = 344, BW = 176, BH = 300;
    const rr = (x, y, w, h, rad) => `M${x + rad} ${y}H${x + w}V${y + h}H${x}V${y + rad}${rad ? `A${rad} ${rad} 0 0 1 ${x + rad} ${y}` : ''}Z`;
    const dimR = Math.max(ro, 12);
    const corner = `<svg class="a" aria-hidden="true" style="left:0;top:0" width="${W}" height="1123" viewBox="0 0 ${W} 1123">
<clipPath id="u1-cc"><rect x="${bx - 1}" y="${by - 1}" width="${BW + 1}" height="${BH + 1}"/></clipPath>
<path clip-path="url(#u1-cc)" fill="${M.edge}" fill-rule="evenodd" d="${rr(bx, by, 900, 900, ro)} ${rr(bx + e, by + e, 900, 900, ri)}"/>
<g fill="var(--key)"><rect x="${bx}" y="${by - 16}" width="${dimR}" height="1"/><rect x="${bx}" y="${by - 20}" width="1" height="9"/><rect x="${bx + dimR - 1}" y="${by - 20}" width="1" height="9"/>
<rect x="${bx - 16}" y="${by}" width="1" height="${e}"/><rect x="${bx - 20}" y="${by}" width="9" height="1"/><rect x="${bx - 20}" y="${by + e - 1}" width="9" height="1"/></g></svg>`;
    const cornerTxt = `${note(bx, by - 40, 220, `Radius ${val(rIn + ' px')}`)}<p class="a c-note nw" style="right:${W - bx + 28}px;top:${Math.round(by + e / 2 - 8)}px">Edge ${val(bw + ' px')}</p>`;
    const pan = panel(345, 288, 282, 392, 'light', `<div class="a u1-col" style="left:24px;top:24px;width:234px;gap:24px">
${ui.field({ id: 'u1-rb1', label: F.dropoff || S.deliverToLabel, value: F.dropoffValue || S.deliverTo, state: 'focus' })}
<div class="u1-row">${ui.btn(F.book || S.share)}<span class="ui-avatar">${A(S.initials || '')}</span></div>
${ui.switch(S.share, { checked: true })}
<div style="width:234px">${ui.card({ meta: S.deliverToLabel, title: S.rider, text: S.riderNote })}</div></div>`);
    const used = { 'r-control': 'Any control without its own', 'r-button': 'Buttons', 'r-input': 'Inputs and selects', 'r-chip': 'Chips', 'r-card': 'Cards and dialogs', 'r-round': 'Avatars and switches', 'w-hairline': 'Dividers and card edges', 'w-control': 'Control edges and dialog edges', 'w-focus': 'The focus ring' };
    const nR = Object.keys(g.radius).length;
    const cols = [{ x: 49, w: 150, head: 'Token', cls: 'c-value' }, { x: 199, w: 80, head: 'Value', cls: 'c-value' }, { x: 285, w: 342, head: 'Used on' }];
    const rows = [...Object.entries(g.radius).map(([t, v]) => [A('--' + t), A(t === 'r-round' ? 'round' : v), A(used[t])]), null, ...Object.entries(g.width).map(([t, v]) => [A('--' + t), A(v), A(used[t])])];
    const T = table(ctx, 744, cols, rows, { rowH: 22 });
    const square = ['control', 'button', 'input', 'chip', 'card'].every((x) => !R[x]);
    const inner = `${plateLabel('Radii and borders')}
${plateNote(`<b style="font-weight:600">${Word(nR)} radius tokens</b><br>${square ? 'Every control and card is square; only avatars and switches are round.' : `Controls take ${val(R.control + ' px')}, cards ${val(R.card + ' px')}.`}`, 403, 72, 224)}
${label(49, 264, `An input's corner, ${k} times its size`)}${corner}${cornerTxt}${label(345, 264, 'At true size')}${pan}${T.html}`;
    return kitSheet(ctx, 'radii-borders', { hp: 232, hit: { text: String(nR), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Elevation: a stack read top down. Each level has its ground's token, value and lightness on the left, and on the right the real
  // component that sits at that level, all on one strip of the product's light surface.
  elevation(ctx) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog || {}, ui = ctx.ui, sh = tokenGroups(ctx).shadow['shadow-float'];
    const L = (h) => ctx.C.toOklch(h).L.toFixed(2);
    const dlg = ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || S.call }).replace(/dlg-t/g, 'u1-dlg');
    const levels = [
      ['Floating', 'surface', sh === 'none' ? `A ${ctx.brand.ui.border} px edge in the text colour` : `${val('--shadow-float')}`, dlg],
      ['Raised', 'raised', 'A step up in the ground, no edge', ui.card({ meta: S.paidLabel, title: S.deliverTo, text: S.paid, raised: true })],
      ['Surface', 'surface', `A ${ctx.borders[0].px} px divider round the card`, ui.card({ meta: S.deliverToLabel, title: S.rider, text: S.riderNote })],
      ['Sunken', 'sunken', 'Skeletons and wells, while content loads', `<div class="u1-sk">${ui.skeleton('220px')}${ui.skeleton('160px')}${ui.skeleton('190px')}</div>`],
    ];
    const n = levels.length;
    const rows = levels.map(([name, tok, how, comp]) => `<div><div class="u1-l"><p class="c-body" style="font-weight:600">${A(name)}</p>
<p class="c-value" style="margin-top:4px">--${A(tok)} ${A(M[tok])}, L ${L(M[tok])}</p><p class="c-note" style="margin-top:6px">${how}</p></div>
<div class="ui u1-r">${comp}</div></div>`).join('');
    const st = stem(ctx, 'body', 400), note2 = ctx.brand.ui.elevationNote || '';
    const [ns, nl] = fit(st, [note2], [[14, 21], [13, 19], [12, 17]], 224, 6);
    const inner = `${plateLabel('Elevation')}
<p class="a" style="left:403px;top:72px;width:224px;${faceCss(ctx, 'body', 400)};font-size:${ns}px;line-height:${nl}px;color:var(--ptxt)"><b style="font-weight:600">${Word(n)} levels.</b> ${A(note2)}</p>
<div class="u1-lg" style="left:49px;top:264px">${rows}</div>`;
    return kitSheet(ctx, 'elevation', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },
};
