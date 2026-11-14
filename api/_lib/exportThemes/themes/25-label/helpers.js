// Theme 25, Label: shared helpers. A page is a gallery wall: one object (or one group) hung on the sightline and the centre of the hang, wall text above the label, and the label fixed in one place.
// Every colour comes from the brand's roles and every size from its scale; no colour id, hex or brand name is written here.
import { esc } from '../../engine/brand.js';
import { loadFont } from '../../engine/nodeFont.js';
import { tie, lint, namesOf, NB } from './copy.js';

// ---- the fixed frame ----
export const PAGE = { w: 1000, h: 800 };
export const SIGHT = 384;                                 // the sightline: the vertical centre of every object, never drawn
export const HANG = { x0: 48, x1: 664, y0: 80, y1: 688 }; // where objects may sit
export const HANG_CX = (HANG.x0 + HANG.x1) / 2;           // 356: the centre of the hang; every object or group is hung on it
// The tallest object runs from OBJ_TOP to OBJ_BOTTOM (the wall title's first line starts at OBJ_TOP and the label's foot is OBJ_BOTTOM); the others hang shorter, all centred on SIGHT.
export const OBJ_TOP = 96, OBJ_BOTTOM = 672, OBJ_H = OBJ_BOTTOM - OBJ_TOP;
export const LABEL = { x: 712, y: OBJ_BOTTOM - 256, w: 240, h: 256, pad: 20 };
export const WALLTEXT = { x: 712, y: OBJ_TOP, w: 240, titleH: 64, gap: 12 };  // the page title and its one line, fixed on every page
export const CREDIT_BASELINE = LABEL.y + LABEL.h - 16;
// the hang heights, by what the object is: a sign at 70% of the tall one, panels at 400, the cover field at 480; typefaces take the full 576
export const H_SIGN = 400, H_PANELS = 400, H_FIELD = 480;
export const FOLIO_BASELINE = 760;
// an object whose fill sits this close to the wall (contrast ratio) gets a 1 px edge; no other edge exists in the theme
export const EDGE_BELOW = 1.3;
export const EDGE_MIX = 0.24;                             // the one edge colour: the wall drawn this far toward the ink
export const PAPER_L = 0.9725, PAPER_S = 0.28;            // a pure-white ground is drawn as the panel's hue at this lightness and saturation (Kerbside: #FAF9F6)

// The twelve pages of the Free guidelines, in book order. A folio is the position in this list, so the pages that are not built yet keep their numbers.
export const FREE_TWELVE = ['cover', 'personality', 'write-this', 'logo', 'clear-space', 'palette', 'contrast', 'typefaces', 'hierarchy', 'business-card', 'social', 'summary'];
export const folio = (id) => String(FREE_TWELVE.indexOf(id) + 1).padStart(3, '0');
const REF_NAME = { 'write-this': 'Voice', logo: 'Logo', 'clear-space': 'Clear space', contrast: 'Contrast', hierarchy: 'Hierarchy' };
export const seeAlso = (id) => `See also ${REF_NAME[id]}, page ${folio(id)}`;

export const A = esc;
export const px = (n) => `${Math.round(n * 100) / 100}px`;
export { NB, tie };

// ---- small text helpers (the rules for the words live in copy.js) ----
export const sentences = (s) => s.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g)?.map((x) => x.trim()) || [s];
export const firstSentence = (s) => sentences(s)[0];
// the first sentence of `s`; if it is longer than `max` characters it is cut at its colon or semicolon and closed with a full stop
export const lead = (s, max) => {
  let t = firstSentence(s);
  if (t.length > max) { const cut = t.split(/[:;]/)[0]; if (cut.length < t.length) t = cut.replace(/[.,]$/, '') + '.'; }
  return t;
};
// "We say what..." after a colon reads "we say what..."; a brand name or an acronym keeps its capital
export const lowerFirst = (s, brandName = '') => (/^[A-Z][a-z]/.test(s) && !s.startsWith(brandName) ? s[0].toLowerCase() + s.slice(1) : s);
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const numberWord = (n) => NUMBER_WORDS[n] || String(n);
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);
export const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
export const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// the size and line of one of the brand's own type tokens, as px
export const token = (ctx, name) => {
  const t = ctx.brand.type.scale.find((x) => x.token === name);
  if (!t) throw new Error(`brand.type.scale has no "${name}" token`);
  return { size: t.size, line: Math.round(t.size * t.line), weight: t.weight, face: t.face };
};

// ---- measuring text without a browser (glyph advances and kerning, as outline() does) ----
const faceFor = (ctx, role, weight) => {
  const fs = ctx.faces.filter((x) => x.role === role && x.style !== 'italic');
  return fs.find((f) => f.weight === weight) || fs.reduce((a, b) => (Math.abs(b.weight - weight) < Math.abs(a.weight - weight) ? b : a));
};
export const advance = (ctx, role, weight, text, size) => {
  const font = loadFont(faceFor(ctx, role, weight).stem), up = font.unitsPerEm;
  let x = 0, prev = null;
  for (const ch of text.replace(/\u00a0/g, ' ')) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / up; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / up; prev = g;
  }
  return x;
};
// greedy wrap, the way the browser breaks a line (only regular spaces break; a tied run stays whole)
export const wrapLines = (ctx, role, weight, size, text, width, stretch = 1) => {
  const lines = []; let cur = '';
  for (const w of text.split(' ')) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && advance(ctx, role, weight, t, size) * stretch * 1.04 > width) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  // a single unbreakable run wider than the box would spill out of it
  for (const l of lines) if (advance(ctx, role, weight, l, size) * stretch * 1.04 > width) throw new Error(`"${l}" is wider than its ${width} px box at ${size} px`);
  return lines;
};

// ---- colour roles ----
const mixHex = (ctx, a, b, t) => { const A_ = ctx.C.hexToRgb(a), B_ = ctx.C.hexToRgb(b); return ctx.C.rgbToHex(A_.map((v, i) => v + (B_[i] - v) * t)); };
// a colour with the hue of `hex` at lightness PAPER_L and saturation PAPER_S (HSL), as a hex; a grey panel gives a grey
const paper = (ctx, hex) => {
  const [r, g, b] = ctx.C.hexToRgb(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(mx + mn - 1));
    h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  }
  s = Math.min(PAPER_S, s * 2);
  // standard HSL to RGB, with h in sextants (so h * 2 is degrees / 30)
  const a = s * Math.min(PAPER_L, 1 - PAPER_L), ch = (n) => { const k = (n + h * 2) % 12; return PAPER_L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return ctx.C.rgbToHex([ch(0), ch(8), ch(4)].map((v) => v * 255));
};
export function roles(ctx) {
  const L = ctx.roles.light, cs = ctx.brand.colours;
  const by = (r) => cs.find((c) => c.role === r);
  const lum = (h) => ctx.C.luminance(h);
  const ground = by('ground') || [...cs].sort((a, b) => lum(b.hex) - lum(a.hex) || b.share - a.share)[0];
  const panel = by('panel');
  const ink = by('text');
  const quiet = by('quiet text') || ctx.byId.quiet;
  const action = by('action');
  // The wall is the brand's own ground colour, except a ground that is pure white (or near it): that is drawn as the panel colour's hue, very light, so the wall is warm paper and not a screen.
  const wall = panel && lum(ground.hex) > 0.93 ? paper(ctx, panel.hex) : ground.hex;
  const R = {
    wall, wallName: ground.name, groundHex: ground.hex, groundName: ground.name,
    panel: panel ? panel.hex : L.raised, panelName: panel ? panel.name : 'Panel',
    ink: ink ? ink.hex : L.text,
    quiet: quiet ? quiet.hex : L.quiet,
    action: action ? action.hex : L.action, actionName: action ? action.name : 'Action',
  };
  // the one edge in the theme: one opaque colour per brand (the wall drawn toward the ink), 1 px, on an object whose fill is close to the wall
  R.edge = mixHex(ctx, R.wall, R.ink, EDGE_MIX);
  R.nearWall = (fill) => ctx.ratio(fill, R.wall) < EDGE_BELOW;
  // The label card is the brand's panel colour, the same as the plates beside it. A brand with no panel gets the wall drawn 6% toward the ink.
  R.labelFill = panel ? panel.hex : mixHex(ctx, R.wall, R.ink, 0.06);
  // quiet text on a given ground: the brand's quiet colour when it passes 4.5:1, else the quiet colour made for a sunken surface, else ink
  R.quietOn = (bg) => [R.quiet, L.quiet, L.quietOnSunken, R.ink].find((c) => ctx.ratio(c, bg) >= 4.5);
  // text on a coloured object: ink, the panel colour or the wall, whichever has the higher ratio (and passes)
  R.onColour = (bg, size = 13, weight = 400) => {
    const best = [R.ink, R.panel, R.wall].reduce((a, b) => (ctx.ratio(b, bg) > ctx.ratio(a, bg) ? b : a));
    ctx.pair(best, bg, { size, weight, what: '(Label text on an object)' });
    return best;
  };
  // the logo colourway to use on a ground: one drawn on that ground, else the colourway whose name colour reads best on it
  R.colourwayOn = (bg) => {
    const cw = ctx.brand.logo.colourways, keys = Object.keys(cw);
    const same = keys.find((k) => cw[k].ground.toLowerCase() === bg.toLowerCase());
    return same || keys.reduce((a, b) => (ctx.ratio(cw[b].name, bg) > ctx.ratio(cw[a].name, bg) ? b : a));
  };
  return R;
}

// ---- placing things ----
// the top edge of an object of height h hung on the sightline; an odd height would land on a half pixel, so it is refused
export const hung = (h) => { if (h % 2) throw new Error(`Object height ${h} is odd and would sit half a pixel off the sightline`); return SIGHT - h / 2; };
// the left edge of an object (or group) of width w hung on the centre of the hang zone
export const hungX = (w) => { if (w % 2) throw new Error(`Object width ${w} is odd and would sit half a pixel off the centre of the hang`); return HANG_CX - w / 2; };
export const box = (x, y, w, h, cls, inner = '', extra = '') => `<div class="${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};${extra}">${inner}</div>`;
// A solid object: a flat face. It gets the theme's one 1 px edge when its fill is within EDGE_BELOW of the wall, and nothing else.
export const solid = (R, x, y, w, h, fillHex, inner = '', { extra = '' } = {}) =>
  `<div class="ob${R.nearWall(fillHex) ? ' edge' : ''}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)};background:${fillHex};${extra}">${inner}</div>`;
// a key numeral whose ink starts 8 px below an object's bottom-left corner: the one key position, on every page. The 12/16 chrome line puts its digits 3 px below the line box's top (measured), so the box starts 5 px down.
export const key = (n, x, bottom) => `<span class="key num" style="left:${px(x)};top:${px(bottom + 5)}">${n}</span>`;

// The width of an ink run set in a face, in px (glyph outlines, so no browser is needed)
export const inkWidth = (ctx, role, text, size) => {
  const f = ctx.faces.find((x) => x.role === role && x.style !== 'italic');
  const font = loadFont(f.stem);
  let x = 0, x1 = 1e9, x2 = -1e9, prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    const bb = g.getPath(x, 0, size).getBoundingBox();
    if (isFinite(bb.x1) && bb.x2 > bb.x1) { x1 = Math.min(x1, bb.x1); x2 = Math.max(x2, bb.x2); }
    x += g.advanceWidth * size / font.unitsPerEm; prev = g;
  }
  return { w: x2 - x1, x1 };
};
// descender depth and ascender height of a run (px below and above the baseline) at a size
const inkBox = (ctx, role, text, size) => {
  const f = ctx.faces.find((x) => x.role === role && x.style !== 'italic');
  const font = loadFont(f.stem);
  const bbs = [...text].map((ch) => font.charToGlyph(ch).getPath(0, 0, size).getBoundingBox()).filter((b) => isFinite(b.y1) && isFinite(b.y2));
  return { down: Math.max(0, ...bbs.map((b) => b.y2)), up: Math.max(0, ...bbs.map((b) => -b.y1)) };
};
export const descent = (ctx, role, text, size) => inkBox(ctx, role, text, size).down;
export const ascent = (ctx, role, text, size) => inkBox(ctx, role, text, size).up;
// where a line box must start so its first baseline lands on `baseline`, from the face's own metrics (the browser uses hhea)
export const lineTop = (ctx, role, size, line, baseline) => {
  const f = ctx.faces.find((x) => x.role === role && x.style !== 'italic');
  const font = loadFont(f.stem), h = font.tables.hhea, upm = font.unitsPerEm;
  const asc = h.ascender / upm * size, desc = -h.descender / upm * size;
  return baseline - ((line - (asc + desc)) / 2 + asc);
};

// ---- the page ----
// The wall, the running head, the folio, the object, the wall text and the label. `object` is markup already placed in page coordinates.
// The running head carries the brand and nothing on its right: the cover's label already gives the version, and saying it twice is a template slot.
export function page(ctx, id, { object, wall, label }) {
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg" data-page="${id}">${head}<div class="hang">${object}</div>${wallText(ctx, id, wall)}${labelCard(ctx, id, label)}<div class="fo num">${folio(id)}</div></section>`;
}

// Wall text: the page title (28/32 in the display face, two lines at most) fixed at x 712, y 96 on every page, and, only where the page has a fact the label does not,
// one 13/19 line under it. A page with no such fact has the title alone: a line that restates the label is a template slot.
export function wallText(ctx, id, { title, line }) {
  const names = namesOf(ctx);
  lint(title, `${id} wall title`); if (line) lint(line, `${id} wall line`);
  const t = tie(title, { tail: false, names, max: 14 }), l = line ? tie(line, { names }) : '';
  const n = wrapLines(ctx, 'display', ctx.weights.heading, 28, t, WALLTEXT.w).length;
  if (n > 2) throw new Error(`${id}: wall title "${title}" runs to ${n} lines at 28 px; the box holds two`);
  if (l) {
    const nl = wrapLines(ctx, 'body', ctx.weights.regular, 13, l, WALLTEXT.w).length;
    if (nl > 4) throw new Error(`${id}: wall line "${line}" runs to ${nl} lines; the box holds four`);
    if (l.split(/\s+/).length > 20) throw new Error(`${id}: wall line is over 20 words`);
  }
  return `<div class="wt" data-wall-text><h1 class="wt-t disp">${A(t)}</h1>${l ? `<p class="wt-l">${A(l)}</p>` : ''}</div>`;
}

// The label card: fixed box, a pale card (the brand's panel colour) with ink text in the brand's body face, set smaller and tighter than the objects (title 15/18 at 600,
// text 13/18 at 400); no rule inside it, 12 px between the title block and the text; the credit is pinned to the foot. Never resized: copy is checked to fit.
// keys: [{ n, text }] set as a list of their own, one row each (cols 1) or two columns (cols 2). paragraph is plain text. detail may hold "\n" for a line break on purpose.
// items: [{ term, text }] for named parts: mode 'inline' sets "Term: text" as a block each (4 px apart), mode 'table' sets one part to a line, the term in a column of its own.
export const TERM_COL = 68;
export function labelCard(ctx, id, { title, detail, paragraph, items = [], mode = 'inline', keys = [], cols = 1, credit }) {
  const W = ctx.weights, names = namesOf(ctx), inner = LABEL.w - 2 * LABEL.pad, room = LABEL.h - 2 * LABEL.pad - 16 - 12;
  for (const [what, s] of [['title', title], ['detail', detail], ['paragraph', paragraph], ['credit', credit], ...keys.map((k, i) => [`key ${i + 1}`, k.text]), ...items.map((k, i) => [`item ${i + 1}`, `${k.term} ${k.text}`])]) if (s) lint(s, `${id} label ${what}`);
  const R = roles(ctx);
  const t = tie(title, { tail: false, names, max: 20 });
  const dl = detail ? detail.split('\n').map((x) => tie(x, { names })) : [];
  const p = paragraph ? tie(paragraph, { names }) : '', c = tie(credit, { names });
  const nt = wrapLines(ctx, 'body', W.strong, 15, t, inner).length;
  const nd = dl.reduce((s, x) => s + wrapLines(ctx, 'body', W.regular, 13, x, inner).length, 0);
  const np = p ? wrapLines(ctx, 'body', W.regular, 13, p, inner).length : 0;
  const colW = cols === 2 ? (inner - 12) / 2 : inner;
  const keyed = keys.map((k) => ({ ...k, text: tie(k.text, { names }) }));
  const rowLines = (k) => wrapLines(ctx, 'body', W.regular, 13, k.text, colW - 18).length;
  if (cols === 2) for (const k of keyed) if (rowLines(k) > 1) throw new Error(`${id}: key "${k.text}" does not fit one line in a half-width column`);
  const rows = keyed.length ? (cols === 2 ? Math.ceil(keyed.length / 2) : keyed.reduce((s, k) => s + rowLines(k), 0)) : 0;
  // items: a term never leaves its text; in a table every text must fit one line beside its term
  const itemed = items.map((k) => (mode === 'table' ? { term: k.term, text: tie(k.text, { names }) } : { term: '', text: tie(`${k.term} ${k.text}`, { names }) }));
  const itemLines = itemed.map((k) => wrapLines(ctx, 'body', W.regular, 13, k.text, mode === 'table' ? inner - TERM_COL : inner).length);
  if (mode === 'table') itemed.forEach((k, i) => { if (itemLines[i] > 1) throw new Error(`${id}: "${k.text}" does not fit one line beside its term`); });
  // a value set in the mono face before its text (a hex): the pair must fit one line beside the term
  if (mode === 'table') items.forEach((k) => { if (k.mono) { const f = ctx.brand.fonts.mono, w = advance(ctx, 'mono', f.weights[0], k.mono, 13) + advance(ctx, 'body', W.regular, ` ${k.text}`, 13); if (w * 1.04 > inner - TERM_COL) throw new Error(`${id}: "${k.mono} ${k.text}" is ${Math.round(w)} px and the column holds ${inner - TERM_COL}`); } });
  const itemH = itemLines.reduce((s, n) => s + n * 18, 0) + (mode === 'inline' ? 4 * Math.max(0, items.length - 1) : 0);
  const body = np || rows || items.length;
  const h = nt * 18 + (nd ? 4 + nd * 17 : 0) + (body ? 12 : 0) + np * 18 + rows * 17 + itemH;
  // grow: brand copy printed whole may need more than the fixed card holds; the card then stands taller with its foot (and credit) where it always is, but never up into the wall title
  // (a project brand's words are not checked in advance, so any card may stand taller rather than fail the page)
  const extra = h > room ? Math.ceil((h - room) / 8) * 8 : 0, maxExtra = LABEL.y - (WALLTEXT.y + WALLTEXT.titleH + WALLTEXT.gap + 12);
  if (extra > maxExtra) throw new Error(`${id}: label text is ${h} px tall and the card holds ${room + maxExtra} (title ${nt}, detail ${nd}, paragraph ${np}, key rows ${rows}, items ${itemH})`);
  const list = keyed.length ? `<ol class="lb-k c${cols}">${keyed.map((k) => `<li><b class="num">${A(k.n)}</b><span>${A(k.text)}</span></li>`).join('')}</ol>` : '';
  const parts = !items.length ? '' : mode === 'table'
    ? `<dl class="lb-tb">${items.map((k, i) => `<dt>${A(k.term)}</dt><dd>${k.mono ? `<span class="mono">${A(k.mono)}</span> ` : ''}${A(itemed[i].text)}</dd>`).join('')}</dl>`
    : `<div class="lb-it">${items.map((k, i) => { const m = /^([^:]+:)(\s)(.*)$/s.exec(itemed[i].text); return m ? `<p><b>${A(m[1])}</b>${A(m[2] + m[3])}</p>` : `<p>${A(itemed[i].text)}</p>`; }).join('')}</div>`;
  const tall = extra ? ` style="top:${LABEL.y - extra}px;height:${LABEL.h + extra}px;--grow:${extra}px"` : '';
  return `<div class="lb${R.nearWall(R.labelFill) ? ' edge' : ''}"${tall} data-label><h2 class="lb-t">${A(t)}</h2>${dl.length ? `<p class="lb-d">${dl.map(A).join('<br>')}</p>` : ''}`
    + `${p ? `<p class="lb-p">${A(p)}</p>` : ''}${parts}${list}<p class="lb-c">${A(c)}</p></div>`;
}
