// Theme 26, Notebook, lane u1: the UI kit's chrome and its foundation spreads (cover, contents, colour-light, colour-dark, type-scale,
// spacing, radii-borders, elevation). The kit is the same sewn dot-grid notebook as the guidelines, a second volume of it: the running head
// names the UI kit, and the product is stuck in as pieces cut from its own surfaces, light or dark. A piece holds the shipped components at
// 1:1 (ctx.ui and componentsCss, never restyled); the notebook draws only around them, on the dots, in graphite and tape.
//
// For lanes u2 and u3 (import these read-only; never edit them here):
//   kitSpread(ctx, id, { verso, recto, clear, versoField, thread, chrome, rectoChrome, headText })
//                                       the whole spread: dots, fold and thread, running heads ("<Brand> UI kit" and the page) and folios
//   piece(ctx, { x, y, w, h, mode, bg, inner, cls, style })
//                                       a .ui region cut from the product's ground (bg: a colour token, default surface) for a mode, placed
//                                       leaf-local; a fill as pale as the paper gets the notebook's 1 px fold edge. Children use ua()
//   ua(x, y, html, { cls, style, w })   an absolutely placed child inside a piece (piece-local px)
//   tapeLabel(T, x, y, text, big)       a label strip of tape with no print under it, 1 unit tall (2 when big)
//   stemOf(ctx, role, weight)           the font stem of a brand face at the nearest weight it loads, for measuring
//   ratioText(ctx, a, b), modeLabel(mode), kitColours(ctx, mode)   small pieces
// This lane's css() writes the kit tokens and componentsCss(ctx) once, for the UI kit only (ctx.kind === 'uikit'); the other kit lanes must
// not add them again. Every class here starts u1-.
import {
  A, U, row, px, nb, tokens, readable, nearPaper, block, rightText, advance, wrap, capRatio, fitLines, folios, tab, labelStripW,
  dotsSvg, foldSvg, lineOffset,
  hasPh,
} from './helpers.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';

// ---------------------------------------------------------------- chrome (exported for the other kit lanes)

const DOTS_X = (i) => 23 + U * i;
const upCol = (x) => DOTS_X(Math.ceil((x - 23) / U - 1e-6));
export const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))} : 1`;
export const modeLabel = (mode) => (mode === 'dark' ? 'Dark' : 'Light');
export const kitColours = (ctx, mode) => colourMap(ctx, mode);

// the stem of a brand face at a weight, or the nearest upright weight it loads (measuring only; the browser sets the real weight)
export function stemOf(ctx, role, weight) {
  const fs = ctx.faces.filter((f) => f.role === role && f.style !== 'italic');
  if (!fs.length) throw new Error(`no ${role} face`);
  return (fs.find((f) => f.weight === weight) || [...fs].sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0]).stem;
}

// a piece of label tape with no print under it, as on the guidelines spreads
export function tapeLabel(T, x, y, text, big = false) {
  const key = big ? 'c-label13' : 'c-label', w = labelStripW(T, key, text);
  return `<div class="tape ${big ? 'strip c-label13' : 'tab c-label'}${hasPh(text) ? ' ph-tight' : ''}" style="left:${px(x)};top:${px(y)};width:${w}px;height:${big ? 2 * U : U}px">${A(text)}</div>`;
}

// The spread: the guidelines' notebook with the kit named in the running head. A page whose title already has a comma ("Colour, light")
// prints its title alone on the recto, so the head never reads as a list of three.
export function kitSpread(ctx, id, { verso = '', recto = '', clear = [], versoField = false, thread = true, chrome = true, rectoChrome = true, headText = '' } = {}) {
  const T = tokens(ctx), p = ctx.pages.find((x) => x.id === id), B = ctx.brand;
  const [fv, fr] = folios(ctx, id);
  let vc = '', rc = '';
  if (chrome) {
    vc += block(T['c-head'], { x: 42, w: 300, baseline: 36, lines: [`${B.name} UI kit`], cls: 'c-head' }).html;
    vc += block(T['c-mono'], { x: 23, w: 60, baseline: 777, lines: [fv], cls: 'c-mono' }).html;
    const rt = headText || (p.section && !p.title.includes(',') ? `${p.section.title}, ${p.title}` : p.title);
    if (rectoChrome) {
      rc += rightText(T['c-head'], { x: 517, text: rt, baseline: 36, cls: 'c-head' }).html
        + rightText(T['c-mono'], { x: 536, text: fr, baseline: 777, cls: 'c-mono' }).html;
    }
  }
  const dv = versoField ? '' : dotsSvg(ctx, id, { recto: false, clear: clear.filter((c) => !c.recto) });
  const dr = dotsSvg(ctx, id, { recto: true, clear: clear.filter((c) => c.recto) });
  return `<section class="pg u1-kit" data-page="${id}">${dv}${dr}<div class="leaf v">${verso}${vc}</div><div class="leaf r">${recto}${rc}</div>${foldSvg(ctx, { thread })}</section>`;
}

// a piece cut from the product's own ground: a .ui region carrying the mode's tokens, so the components inside are exactly what ships
export function piece(ctx, { x, y, w, h, mode = 'light', bg = 'surface', inner = '', cls = '', style = '' }) {
  const fill = colourMap(ctx, mode)[bg];
  const edge = nearPaper(ctx, fill) ? ' u1-edge' : '';
  return `<div class="ui u1-piece${edge}${cls ? ' ' + cls : ''}"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:var(--${bg});${style}">${inner}</div>`;
}
export const ua = (x, y, html, { cls = '', style = '', w = null } = {}) => `<div class="u1-a${cls ? ' ' + cls : ''}${hasPh(html) ? ' ph-tight' : ''}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;

// the kit's tokens on every .ui region (light, and dark under data-theme), and the shipped component styles, unchanged
export function kitCss(ctx) {
  const g = tokenGroups(ctx), stretch = ctx.brand.fonts.display.stretch || 100;
  const decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}
.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}
${componentsCss(ctx).replace(/^\/\*[^\n]*\n/, '')}
.pg .ui .ui-display{font-stretch:${stretch}%}
.pg .ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}

export function css(ctx) {
  const kit = ctx.kind === 'uikit' ? kitCss(ctx) : '';
  return `${kit}
.pg .u1-piece{position:absolute;z-index:1;overflow:hidden;isolation:isolate}
.pg .u1-piece.u1-edge{border:1px solid var(--fold)}
.pg .u1-piece .u1-a{position:absolute}
.pg .u1-cap{font:600 11px/19px var(--chrome);letter-spacing:0.01em;color:var(--quiet);white-space:nowrap}
.pg .u1-mono{font:400 11px/19px 'Atkinson Hyperlegible Mono',monospace;color:var(--quiet);white-space:nowrap;font-variant-numeric:tabular-nums}
.pg .u1-nw{white-space:nowrap}
.pg .u1-row{border-top:1px solid var(--divider)}
.pg .u1-sw{z-index:2;box-sizing:border-box;white-space:nowrap;overflow:hidden}
.pg .u1-sw.edge{border:1px solid var(--fold)}
.pg .u1-sw .u1-swt{position:absolute;left:10px}
.pg .u1-sq{z-index:3}
.pg .u1-draw{z-index:1}
.pg .u1-mark{z-index:2}
.pg .u1-ink{color:var(--graphite-ink)}
`;
}

// ---------------------------------------------------------------- page pieces

const sc = (ctx) => ctx.brand.ui.screen.content;
const title = (ctx, id) => (ctx.pages.find((p) => p.id === id) || {}).title || '';
// the brand's display face at the largest listed size that sets text in maxLines across w
function hero(T, text, w, sizes, maxLines) {
  const f = fitLines(T._displayStem, text, w, sizes, maxLines, -0.02);
  return { ...f, tk: { stem: T._displayStem, size: f.size, lh: f.lh, track: -0.02 }, cap: capRatio(T._displayStem) * f.size };
}
const heroBlock = (h, o) => block(h.tk, { ...o, lines: h.lines, cls: 'b-hero', style: `font-size:${h.size}px;line-height:${h.lh}px;${o.style || ''}` });
// a note on the paper, wrapped, its last line on `last` (a dot row)
function noteUp(T, { x, w, last, text, cls = 'c-note' }) {
  const t = T[cls], ls = wrap(t.stem, t.size, text, w, t.track);
  return block(t, { x, w, baseline: last - U * (ls.length - 1), lines: ls, cls }).html;
}

// ---------------------------------------------------------------- colour (light and dark share one composition, so the two compare)
// Verso: one piece cut from the mode's surface, the product's live line set large on it in --text and every text role under it as a real
// line of the product in that ink, with its token and its ratio on the surface. Recto: every fill as a swatch cut from the product's ground,
// the words it carries printed on it, and its token, hex and ratio written beside it on the paper.
function colourPage(ctx, id, mode) {
  const T = tokens(ctx), M = colourMap(ctx, mode), S = sc(ctx), W = ctx.weights;
  const r = (a, b) => ratioText(ctx, a, b);
  const P = { x: 42, y: 112, w: 475 };
  // one line when the live line fits at 48 px or more, else two lines at the largest size that sets it
  const one = hero(T, S.eta, P.w - 38, [[76, 76], [64, 76], [57, 57], [48, 57]], 1);
  const h = one.lines.length === 1 && advance(T._displayStem, one.size, one.lines[0], -0.02) <= P.w - 38 ? one
    : hero(T, S.eta, P.w - 38, [[76, 76], [64, 76], [57, 57], [48, 57], [38, 38]], 2);
  let inner = ua(19, 38, h.lines.map((l) => `<span style="display:block">${A(l)}</span>`).join(''),
    { cls: 'ui-display u1-nw', style: `font-size:${h.size}px;line-height:${h.lh}px;letter-spacing:-0.02em;color:var(--text)` });
  const inks = [['text', S.rider, W.strong], ['text-soft', S.pickup, W.regular], ['quiet', S.deliverTo, W.regular]];
  const seen = new Set(inks.map((x) => x[0]));
  for (const s of ctx.status) {
    const t = statusText(ctx, mode, s), tok = t.token.slice(2);
    if (seen.has(tok)) continue; seen.add(tok);
    inks.push([tok, s.label, W.medium]);
  }
  const bodyStem = stemOf(ctx, 'body', W.regular);
  let y = 38 + h.lh * h.lines.length + U;
  for (const [tok, text, wt] of inks) {
    const lines = wrap(bodyStem, 15, text, 209);
    const rh = Math.max(2, lines.length + 1) * U;
    inner += `<div class="u1-a u1-row" style="left:19px;top:${y}px;width:${P.w - 38}px;height:${rh}px"></div>`
      + ua(19, y + 9, lines.map((l) => `<span style="display:block">${A(l)}</span>`).join(''), { cls: `u1-nw${lines.some(hasPh) ? ' ph-tight' : ''}`, style: `font-size:15px;line-height:19px;font-weight:${wt};color:var(--${tok})`, w: 209 })
      + ua(247, y + 9, A('--' + tok), { cls: 'u1-mono' })
      + ua(P.w - 19 - 95, y + 9, A(r(M[tok], M.surface)), { cls: 'u1-mono', style: 'text-align:right', w: 95 });
    y += rh;
  }
  P.h = Math.ceil((y + U) / U) * U;
  if (P.y + P.h > 663) throw new Error(`${id}: the ink piece runs to ${P.y + P.h}`);
  let vc = piece(ctx, { ...P, mode, inner }) + tab(T, { x: P.x + U, y: P.y, label: `Surface, ${modeLabel(mode).toLowerCase()}` });
  const say = mode === 'dark'
    ? 'Dark is the same markup under data-theme="dark". Components read roles such as --action, never a palette name.'
    : 'Light is the default, on :root. Components read roles such as --action, never a palette name.';
  vc += noteUp(T, { x: 42, w: 380, last: 739, text: say });

  // the fills
  const scrimInk = ctx.ratio(M.surface, M.scrim) >= ctx.ratio(M.text, M.scrim) ? 'surface' : 'text';
  const fills = [
    ['Surface', 'surface', 'text'], ['Raised', 'raised', 'text'], ['Sunken', 'sunken', 'text'],
    ['Action', 'action', 'action-label'], ['Action hover', 'action-hover', 'action-label'], ['Action pressed', 'action-pressed', 'action-label'],
    ['Disabled', 'disabled-bg', 'disabled-text'], ['Scrim', 'scrim', scrimInk],
    ['Control edge', 'edge', 'text', `inset 0 0 0 ${ctx.brand.ui.border}px ${M.edge}`],
    ['Divider', 'divider', 'text', `inset 0 -1px 0 ${M.divider}`],
    ['Focus ring', 'focus', 'text', `inset 0 0 0 2px ${M.focus}`],
  ];
  const nameStem = stemOf(ctx, 'body', W.medium), nOff = lineOffset(nameStem, 13, 19);
  let rc = '';
  fills.forEach(([name, tok, fg, line], i) => {
    const top = 74 + i * 3 * U, bl = top + U, bg = line ? M.surface : M[tok];
    const edge = nearPaper(ctx, bg) && !line ? ' edge' : '';
    const ratio = line ? r(M[tok], M.surface) : r(M[fg], bg);
    rc += `<div class="u1-sw${edge}" style="left:42px;top:${top}px;width:171px;height:38px;background:${bg};color:${M[fg]};${line ? `box-shadow:${line}` : ''}">`
      + `<span class="u1-swt" style="top:${px(U - nOff - (edge ? 1 : 0))};font:${W.medium} 13px/19px var(--body)">${A(name)}</span></div>`
      + block(T['c-mono'], { x: 232, w: 114, baseline: bl, lines: ['--' + tok], cls: 'c-mono' }).html
      + block(T['c-mono'], { x: 346, w: 76, baseline: bl, lines: [M[tok]], cls: 'c-mono' }).html
      + rightText(T['c-mono'], { x: 517, text: ratio, baseline: bl, cls: 'c-mono' }).html;
  });
  rc += noteUp(T, { x: 42, w: 380, last: 739, text: 'Each swatch is measured with the words it carries; each line against the surface. Text under 24 px needs 4.5 : 1, edges and the focus ring 3 : 1.' });
  return kitSpread(ctx, id, { verso: vc, recto: rc });
}

// ---------------------------------------------------------------- the pages

export const uikit = {
  // ---- cover: the kit's endpaper (the reversed ground, as the guidelines open) with "UI kit" at the extreme of the display face and the
  // logo small above it; the flyleaf carries the title, the version, and the product's primary button on a piece of each of its surfaces ----
  cover: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, rev = B.logo.colourways.reversed, F = sc(ctx).form || {};
    const g = ctx.logo.geos.reversed, lw = 171, lh = lw * g.h / g.w;
    const ink = readable(ctx, rev.ground, [rev.name, nb(ctx).paper], 'kit cover');
    const h = hero(T, 'UI kit', 475, [[190, 190], [171, 171], [152, 152], [133, 133], [114, 114], [95, 95], [76, 76]], 1);
    const vc = `<div class="field" style="left:0;top:0;width:559px;height:794px;background:${rev.ground}"></div>`
      + `<div style="left:42px;top:74px;width:${lw}px;height:${px(lh)};z-index:3">${ctx.logo.html('reversed', { width: lw, color: rev.name })}</div>`
      + heroBlock(h, { x: 42, w: 475, baseline: 739, knock: false, style: `color:${ink};` }).html;
    let rc = block(T['c-strong'], { x: 42, w: 300, baseline: 93, lines: [`${B.name} UI kit`], cls: 'c-strong' }).html
      + block(T['c-head'], { x: 42, w: 300, baseline: 112, lines: [ctx.versionLine], cls: 'c-head' }).html;
    const faces = [B.fonts.display.family, B.fonts.body.family].filter((f, i, a) => a.indexOf(f) === i).join(' and ');
    rc += block(T['c-note'], { x: 42, w: 475, baseline: 150, lines: [`Set in ${faces}. Light and dark.`], cls: 'c-note' }).html;
    for (const [i, mode] of ['light', 'dark'].entries()) {
      const x = 42 + i * 247, y = 570;
      const inner = ua(0, 0, ctx.ui.btn(F.book || sc(ctx).share), { style: 'width:100%;height:100%;display:flex;align-items:center;justify-content:center' });
      rc += piece(ctx, { x, y, w: 228, h: 114, mode, inner }) + tab(T, { x: x + U, y, label: modeLabel(mode) });
    }
    return kitSpread(ctx, 'cover', { verso: vc, recto: rc, chrome: false, versoField: true, thread: false });
  },

  // ---- contents: each part of the kit is a length of tape two units long for every page it holds, so the tapes are a bar of the kit's
  // weight; its pages are listed under it in two columns, each with the folio of its verso. The recto's foot says how the kit is kept ----
  contents: (ctx) => {
    const T = tokens(ctx), secs = ctx.sections;
    const part = (s, t) => {
      const label = `${s.n} ${s.title}`, w = Math.max(2 * U * s.pages.length, labelStripW(T, 'c-label', label));
      let out = `<div class="tape tab c-label" style="left:42px;top:${t}px;width:${Math.min(w, 475)}px;height:${U}px">${A(label)}</div>`;
      const rows = Math.ceil(s.pages.length / 2);
      s.pages.forEach((p, k) => {
        const col = Math.floor(k / rows), bl = t + 2 * U + (k % rows) * U, x = 42 + col * 247;
        out += block(T['c-note'], { x, w: 171, baseline: bl, lines: [p.title], cls: 'c-note u1-ink' }).html
          + rightText(T['c-mono'], { x: x + 228, text: folios(ctx, p.id)[0], baseline: bl, cls: 'c-mono' }).html;
      });
      return { html: out, next: t + U * rows + 4 * U };
    };
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'contents')], baseline: 93, cls: 'b-title' }).html;
    let rc = '', t = 150, split = 0;
    // the verso takes the parts that fit under its title; the recto the rest
    while (split < secs.length) {
      const need = U * Math.ceil(secs[split].pages.length / 2) + 2 * U;
      if (t + need > 739) break;
      const p = part(secs[split], t); vc += p.html; t = p.next; split++;
    }
    t = 74;
    for (const s of secs.slice(split)) { const p = part(s, t); rc += p.html; t = p.next; }
    // the key: what the three marks in this kit mean, each beside one of them
    const ky = 568;
    rc += block(T['c-strong'], { x: 42, w: 300, baseline: ky, lines: ['How this kit is kept'], cls: 'c-strong' }).html;
    rc += tapeLabel(T, 42, ky + U, 'Label') + block(T['c-note'], { x: 156, w: 361, baseline: ky + 2 * U, lines: ['Tape names a piece or a value.'], cls: 'c-note' }).html;
    rc += piece(ctx, { x: 42, y: ky + 3 * U, w: 95, h: 38, mode: 'light' }) + piece(ctx, { x: 42, y: ky + 6 * U, w: 95, h: 38, mode: 'dark' })
      + block(T['c-note'], { x: 156, w: 361, baseline: ky + 5 * U, lines: ['A piece of the light surface holds real components at 1:1.'], cls: 'c-note' }).html
      + block(T['c-note'], { x: 156, w: 361, baseline: ky + 8 * U, lines: ['A piece of the dark surface holds them in dark mode.'], cls: 'c-note' }).html;
    return kitSpread(ctx, 'contents', { verso: vc, recto: rc });
  },

  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),

  // ---- type scale: each size set on the paper at the size it ships, largest first, one real line of the product per size, every baseline
  // on a dot row. Across the fold, level with each line, its token on tape and its values, so the spread reads as one ruled table ----
  'type-scale': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {};
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': D.title, title: S.rider, headline: S.eta };
    const rows = [...ctx.uiType].sort((a, b) => b.size - a.size);
    const stretch = B.fonts.display.stretch || 100;
    let bl = 150, vc = '', rc = '';
    for (const t of rows) {
      const role = t.face === 'display' ? 'display' : 'body', stem = stemOf(ctx, role, t.weight);
      const track = role === 'display' ? -0.01 : 0, text = sample[t.token] || t.use;
      const lines = wrap(stem, t.size, text, 475, track);
      const face = role === 'display' ? `font-family:var(--display);font-stretch:${stretch}%;letter-spacing:-0.01em` : 'font-family:var(--body)';
      vc += block({ stem, size: t.size, lh: t.line, track }, { x: 42, w: 475, baseline: bl, lines, style: `${face};font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight};color:var(--ink)` }).html;
      // the spec, level with the first baseline: the token on tape, its size, line and weight, and what it is for
      rc += `<div class="tape tab c-label" style="left:42px;top:${px(bl - lineOffset(T['c-label'].stem, 11, 19))};width:${labelStripW(T, 'c-label', t.token)}px;height:${U}px">${A(t.token)}</div>`
        + block(T['c-mono'], { x: 156, w: 114, baseline: bl, lines: [`${t.size} / ${t.line} / ${t.weight}`], cls: 'c-mono' }).html;
      const use = wrap(T['c-note'].stem, 13, t.use, 247);
      rc += block(T['c-note'], { x: 270, w: 247, baseline: bl, lines: use, cls: 'c-note' }).html;
      const used = Math.max((lines.length - 1) * t.line, (use.length - 1) * U);
      bl = row(Math.ceil((bl + used - 17) / U)) + 4 * U;
    }
    if (bl - 4 * U > 663) throw new Error(`type-scale: the scale runs to ${bl - 4 * U}`);
    const min = Math.min(...ctx.uiType.map((t) => t.size)), d = B.fonts.display, b = B.fonts.body;
    vc += noteUp(T, { x: 42, w: 380, last: 739, text: `Every line is printed at its own size. Nothing on screen is smaller than ${min} px, and figures that change are tabular.` });
    rc += noteUp(T, { x: 42, w: 380, last: 739, text: `${d.family} sets titles and the live line; ${b.family} sets everything people read and press. Size, line height and weight are in px.` });
    return kitSpread(ctx, 'type-scale', { verso: vc, recto: rc });
  },

  // ---- spacing: every step cut as a square of tape at its true size and laid along a dot row, so the 19 px dot pitch is the ruler. Across
  // the fold, a form cut from the light surface at 1:1, its gaps marked with tape: smaller inside a group than between groups ----
  spacing: (ctx) => {
    const T = tokens(ctx), sp = ctx.space, base = ctx.brand.ui.spacingBase, S = sc(ctx), F = S.form || {};
    const allOn = sp.every((s) => s.px % base === 0);
    const head = `${sp.length} steps, ${sp[0].px} to ${sp[sp.length - 1].px} px`;
    const h = hero(T, head, 475, [[57, 57], [48, 57], [38, 38]], 2);
    let vc = heroBlock(h, { x: 42, w: 475, baseline: row(Math.round((74 + h.cap - 17) / U)) }).html;
    const lastHero = row(Math.round((74 + h.cap - 17) / U)) + h.lh * (h.lines.length - 1);
    if (allOn) vc += block(T['b-body'], { x: 42, w: 380, baseline: lastHero + 2 * U, lines: wrap(T['b-body'].stem, 13, `Every gap and padding in the product is one of these, each a multiple of ${base} px.`, 380), cls: 'b-body' }).html;
    // the squares stand on row 30 (y 587); their labels hang under them
    const foot = 587, mono = T['c-mono'];
    let x = 42;
    for (const s of sp) {
      const tok = `sp-${s.token.replace('space-', '')}`, lw = Math.max(advance(mono.stem, 11, tok), advance(mono.stem, 11, `${s.px} px`));
      vc += `<div class="tape piece u1-sq" style="left:${x}px;top:${foot - s.px}px;width:${s.px}px;height:${s.px}px"></div>`
        + block(mono, { x, w: Math.ceil(lw) + 4, baseline: foot + 2 * U, lines: [`${s.px} px`], cls: 'c-mono u1-ink' }).html
        + block(mono, { x, w: Math.ceil(lw) + 4, baseline: foot + 3 * U, lines: [tok], cls: 'c-mono' }).html;
      x = upCol(x + Math.max(s.px, lw) + 10);
    }
    if (x - 10 > 517 + U) throw new Error(`spacing: the squares run to ${x}`);
    vc += noteUp(T, { x: 42, w: 380, last: 739, text: 'Squares at true size. The dots are 19 px apart.' });

    // the form: two fields in one group, then the button; inside gap is step 3, the gap between groups step 6, the padding step 5
    const gIn = (sp[2] || sp[sp.length - 1]).px, gOut = (sp[5] || sp[sp.length - 1]).px, pad = (sp[4] || sp[sp.length - 1]).px;
    const fh = 68, bh = 44, P = { x: 42, y: 74, w: 361 };
    const y1 = pad, y2 = y1 + fh + gIn, y3 = y2 + fh + gOut;
    P.h = y3 + bh + pad;
    const fw = P.w - 2 * pad - 38;
    let inner = ua(pad, y1, ctx.ui.field({ id: 'u1-sp1', label: F.pickup || 'Name', value: F.pickupValue || '' }), { w: fw })
      + ua(pad, y2, ctx.ui.field({ id: 'u1-sp2', label: F.dropoff || 'Address', value: F.dropoffValue || '' }), { w: fw })
      + ua(pad, y3, ctx.ui.btn(F.book || S.share));
    // the marks: tape cut to each gap, on the piece's right side
    const mk = (y, hh) => `<div class="u1-a tape" style="left:${P.w - pad - 19}px;top:${y}px;width:19px;height:${hh}px"></div>`;
    inner += mk(0, pad) + mk(y1 + fh, gIn) + mk(y2 + fh, gOut);
    let rc = piece(ctx, { ...P, mode: 'light', inner }) + tab(T, { x: P.x + U, y: P.y, label: 'Form, at 1:1' });
    const label = (y, hh, v, what) => {
      const bl = row(Math.round((P.y + y + hh / 2 + 4 - 17) / U));
      return block(mono, { x: 422, w: 95, baseline: bl, lines: [`${v} px`], cls: 'c-mono u1-ink' }).html
        + block(T['c-note'], { x: 422, w: 95, baseline: bl + U, lines: [what], cls: 'c-note' }).html;
    };
    rc += label(0, pad, pad, 'padding') + label(y1 + fh, gIn, gIn, 'in a group') + label(y2 + fh, gOut, gOut, 'between');
    rc += noteUp(T, { x: 42, w: 380, last: 739, text: `The gap inside a group, ${gIn} px, is smaller than the gap between groups, ${gOut} px, so what belongs together reads together.` });
    return kitSpread(ctx, 'spacing', { verso: vc, recto: rc });
  },

  // ---- radii and borders: an input's corner drawn at one dot to the pixel (each 19 px dot pitch is 1 px on screen), with the focus ring and
  // its gap around it, so the three line widths and the radius are measured by the dots themselves. Across the fold, the real controls at 1:1 ----
  'radii-borders': (ctx) => {
    const T = tokens(ctx), M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, ui = ctx.ui, N = nb(ctx);
    // the ring is drawn by the shipped CSS as a 2 px gap of the ground and then the ring itself, --w-focus wide
    const R = ctx.radius.input, bw = ctx.brand.ui.border, [bh, bc, bf] = ctx.borders, ring = bf.px, gap = 2;
    const X0 = 42, Y0 = 131, X1 = 403, Y1 = 663;                  // the drawing's cut edges (whole units)
    const rr = (o, r) => { const x = X0 + o, y = Y0 + o, q = Math.max(r, 0); return `M${x} ${y + q}${q ? `A${q} ${q} 0 0 1 ${x + q} ${y}` : `L${x} ${y}`}H2000V2000H${x}Z`; };
    const band = (o1, r1, o2, r2, fill) => `<path fill="${fill}" fill-rule="evenodd" d="${rr(o1, r1)} ${rr(o2, r2)}"/>`;
    const oRing = 0, oGap = ring * U, oEdge = (ring + gap) * U, oIn = oEdge + bw * U, rEdge = R * U;
    const svg = `<svg class="u1-draw" style="left:0;top:0" width="559" height="794" viewBox="0 0 559 794" aria-hidden="true">`
      + `<clipPath id="u1-rc"><rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}"/></clipPath><g clip-path="url(#u1-rc)">`
      + band(oRing, rEdge + oEdge, oGap, rEdge + oEdge - oGap, M.focus)
      + band(oGap, rEdge + oEdge - oGap, oEdge, rEdge, M.surface)
      + band(oEdge, rEdge, oIn, rEdge - bw * U, M.edge)
      + `<path fill="${M.surface}" d="${rr(oIn, rEdge - bw * U)}"/></g>`
      // the cut edges, and the radius drawn from its centre to both tangents
      + `<g fill="${N.fold}"><rect x="${X1 - 1}" y="${Y0}" width="1" height="${Y1 - Y0}"/><rect x="${X0}" y="${Y1 - 1}" width="${X1 - X0}" height="1"/></g>`
      + `<g fill="${N.graphite}"><rect x="${X0 + oIn}" y="${Y0 + oEdge + rEdge}" width="${rEdge - bw * U}" height="1"/><rect x="${X0 + oEdge + rEdge}" y="${Y0 + oIn}" width="1" height="${rEdge - bw * U}"/>`
      + `<rect x="${X0 + oEdge + rEdge - 4}" y="${Y0 + oEdge + rEdge}" width="9" height="1"/><rect x="${X0 + oEdge + rEdge}" y="${Y0 + oEdge + rEdge - 4}" width="1" height="9"/>`
      // leaders from each band to its label beside the drawing
      + [oRing + ring * U / 2, oGap + gap * U / 2, oEdge + bw * U / 2].map((o) => `<rect x="${X1 + 2}" y="${px(Y0 + o)}" width="13" height="1"/>`).join('') + '</g></svg>';
    let vc = tapeLabel(T, 42, 74, "An input's corner, one dot to the pixel") + svg;
    const cy = Y0 + oEdge + rEdge;
    vc += block(T['c-mono'], { x: X0 + oIn + 10, w: 152, baseline: cy + U, lines: [`Radius ${R} px`], cls: 'c-mono u1-ink', knock: false }).html;
    // each band named beside the drawing: the name on the dot row nearest the band's middle, its width on the row under it
    const side = (mid, name, v) => {
      const bl = row(Math.round((Y0 + mid + 4 - 17) / U));
      return block(T['c-note'], { x: 422, w: 95, baseline: bl, lines: [name], cls: 'c-note' }).html
        + block(T['c-mono'], { x: 422, w: 95, baseline: bl + U, lines: [`${v} px`], cls: 'c-mono u1-ink' }).html;
    };
    vc += side(oRing + ring * U / 2, 'Focus ring', ring) + side(oGap + gap * U / 2, 'Gap', gap) + side(oEdge + bw * U / 2, 'Edge', bw);
    vc += noteUp(T, { x: 42, w: 475, last: 739, text: `Drawn at 19 times: the ring is ${ring} px on a ${gap} px gap of the ground, the edge ${bw} px, the corner ${R} px.` });

    // the controls at 1:1 on a piece of the light surface; each named beside it on the paper, level with it
    const P = { x: 42, y: 74, w: 228 }, cw = P.w - 38;
    const items = [
      [19, ui.field({ id: 'u1-rb1', label: F.pickup || 'Name', value: F.pickupValue || '', state: 'focus' }), 'Input, focused', `${ctx.radius.input} px, edge ${bc.px} px, ring ${bf.px} px`, 76],
      [114, ui.btn(F.book || S.share), 'Button', `${ctx.radius.button} px`, 57],
      [190, `<div style="display:flex;align-items:center;gap:16px"><span class="ui-avatar">${A(S.initials || '')}</span>${ui.switch(S.call || 'On', { checked: true })}</div>`, 'Round', 'Avatars and switches only', 57],
      [266, ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.riderNote }), 'Card', `${ctx.radius.card} px, divider ${bh.px} px`, 0],
    ];
    let inner = '', rc = '';
    for (const [y, html, name, val] of items) {
      inner += ua(19, y, html, { w: cw });
      const bl = row(Math.round((P.y + y + 13 - 17) / U));
      rc += block(T['c-strong'], { x: 289, w: 228, baseline: bl, lines: [name], cls: 'c-strong' }).html
        + block(T['c-mono'], { x: 289, w: 228, baseline: bl + U, lines: [val], cls: 'c-mono' }).html;
    }
    P.h = 456;
    rc = piece(ctx, { ...P, mode: 'light', inner }) + rc;
    rc += noteUp(T, { x: 42, w: 475, last: 739, text: `Controls take ${ctx.radius.control} px and cards ${ctx.radius.card} px. The notebook is square, so the product's corners show only where it ships.` });
    return kitSpread(ctx, 'radii-borders', { verso: vc, recto: rc });
  },

  // ---- elevation: the grounds as offcuts laid one on another, light on the verso and dark on the recto. A sunken well, a piece of the
  // surface on it holding a raised card, and the dialog floating across the surface's edge onto the paper, held up by its edge ----
  elevation: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, S = sc(ctx), D = S.dialog || {}, ui = ctx.ui;
    const shadow = tokenGroups(ctx).shadow['shadow-float'];
    const leaf = (mode, topText) => {
      const M = colourMap(ctx, mode);
      let out = noteUp(T, { x: 42, w: 380, last: 131, text: topText });
      const dlg = ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || 'Cancel' }).replace(/dlg-t/g, `u1-dlg-${mode}`);
      out += piece(ctx, { x: 42, y: 169, w: 361, h: 304, mode, bg: 'sunken', inner: ua(19, 19, 'Sunken', { cls: 'u1-cap', style: 'color:var(--quiet-sunken)' }) })
        + tab(T, { x: 61, y: 169, label: modeLabel(mode) });
      const card = ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true });
      out += piece(ctx, { x: 99, y: 226, w: 361, h: 304, mode, inner: ua(19, 19, 'Surface', { cls: 'u1-cap' }) + ua(19, 57, card, { w: 323 }) });
      out += `<div class="ui u1-piece u1-float${hasPh(dlg) ? ' ph-tight' : ''}"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:156px;top:416px;width:361px;background:transparent;overflow:visible">${dlg}</div>`;
      [['Sunken', '--sunken', M.sunken], ['Surface', '--surface', M.surface], ['Raised', '--raised', M.raised], ['Floating', `${B.ui.border} px edge`, '--text']].forEach(([n, t, v], i) => {
        const bl = 682 + i * U;
        out += block(T['c-note'], { x: 42, w: 95, baseline: bl, lines: [n], cls: 'c-note u1-ink' }).html
          + block(T['c-mono'], { x: 156, w: 133, baseline: bl, lines: [t], cls: 'c-mono' }).html
          + block(T['c-mono'], { x: 308, w: 95, baseline: bl, lines: [v], cls: 'c-mono' }).html;
      });
      return out;
    };
    const vc = leaf('light', B.ui.elevationNote || 'Grounds step from the surface; anything that floats has an edge.');
    const rc = leaf('dark', `The float shadow token, --shadow-float, is ${shadow}. Dark steps the same way, on the dark grounds.`);
    return kitSpread(ctx, 'elevation', { verso: vc, recto: rc });
  },
};
