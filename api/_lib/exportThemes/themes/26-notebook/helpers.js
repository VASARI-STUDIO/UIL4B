// Theme 26, Notebook: shared helpers. A page is one open spread of an A5 dot-grid notebook (two leaves of 559 x 794 on a 1118 x 794 page).
// Every coordinate in the pages is leaf-local (x 0 to 559, y 0 to 794) and a whole number of 19 px units from a dot; the helpers add the
// 559 for the recto. Brand colour, type and copy come from ctx only: no colour id, hex, photo id or art is named in this theme.
import { plateImg } from '../../engine/plate.js';
import { esc } from '../../engine/brand.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

export const A = esc;
export const U = 19;                       // the unit: 5 mm drawn at 19 px
export const PAGE = { w: 1118, h: 794 };
export const LEAF = { w: 559, h: 794 };
export const row = (j) => 17 + U * j;      // y of dot row j (j 0 to 40)
export const colX = (i) => 23 + U * i;     // x of dot column i (i 0 to 27)
export const nearestRow = (y) => row(Math.round((y - 17) / U));
export const px = (n) => `${Math.round(n * 100) / 100}px`;

// ---- the notebook's own colours (spec 2.5), written as OKLCH and resolved once so every ratio is measured on the real hex ----
export function nb(ctx) {
  const f = (l, c, h) => ctx.C.fromOklch(l, c, h);
  const L = ctx.roles.light;
  const o = {
    paper: f(0.962, 0.004, 235), dot: f(0.74, 0.008, 240), fold: f(0.86, 0.005, 240),
    graphite: f(0.47, 0.012, 245), graphiteInk: f(0.29, 0.012, 245), unused: f(0.63, 0.010, 245),
    tape: L.action, tapeLabel: L.actionLabel, thread: L.text,
  };
  // brand text on paper: the brand's text colour when it passes 4.5:1, else the notebook's own ink
  o.text = ctx.ratio(L.text, o.paper) >= 4.5 ? L.text : o.graphiteInk;
  return o;
}
// colours of the brand's roles, found by role name, never by id
export function brandRoles(ctx) {
  const cs = ctx.brand.colours, by = (r) => cs.find((c) => c.role === r);
  const lum = (h) => ctx.C.luminance(h);
  const ground = by('ground') || [...cs].sort((a, b) => lum(b.hex) - lum(a.hex))[0];
  const text = by('text');
  const action = by('action');
  return { ground, text: text ? text.hex : ctx.roles.light.text, action: action ? action.hex : ctx.roles.light.action, actionName: action ? action.name : 'Action' };
}
// the first colour in the list that passes 4.5:1 on bg; the build stops when none does
export function readable(ctx, bg, list, what) {
  const hit = list.find((c) => c && ctx.ratio(c, bg) >= 4.5);
  if (!hit) throw new Error(`${what}: none of ${list.join(', ')} passes 4.5:1 on ${bg}`);
  return hit;
}
// does a fill sit this close to the paper that it needs a 1 px edge (spec: within 1.15:1)
export const nearPaper = (ctx, fill) => ctx.ratio(fill, nb(ctx).paper) < 1.15;

// ---- type: one table for the layout (what to measure) and the css (what to draw) ----
export const CHROME_STEMS = { 400: 'AtkinsonHyperlegibleNext-400', 600: 'AtkinsonHyperlegibleNext-600', mono: 'AtkinsonHyperlegibleMono-400' };
// slot edition: a brand string is a sentinel until it is written out, and prints as a compact placeholder (label and length). Measure what will
// print, not the sentinel. `PH` holds the placeholder entries once a slot ctx has gone through tokens(); showcase never sets it.
let PH = null;
const sentId = (g) => Number([...g].map((c) => c.charCodeAt(0) - 0xE010).join(''));
export const slotText = (s) => (PH ? String(s).replace(/([-]+)/g, (m, g) => { const e = PH[sentId(g)]; return e ? (e.sample || (e.bare ? e.label : `${e.label}, ${e.length}`)) : m; }) : s);
export const slotLabel = (ctx, s) => (ctx.edition === 'slot' && ctx.placeholders
  ? String(s).replace(/([-]+)/g, (m, g) => { const e = ctx.placeholders.entries[sentId(g)]; return e ? e.label : m; })
  : s);
export const slotLabelText = (s) => (PH ? String(s).replace(/([-]+)/g, (m, g) => { const e = PH[sentId(g)]; return e ? e.label : m; }) : s);
export const hasPh = (s) => //.test(String(s));
export function tokens(ctx) {
  PH = ctx.edition === 'slot' && ctx.placeholders ? ctx.placeholders.entries : null;
  const B = ctx.brand, W = ctx.weights;
  const face = (role, w) => { const f = ctx.faces.find((x) => x.role === role && x.style !== 'italic' && x.weight === w); if (!f) throw new Error(`no ${role} face at ${w}`); return f; };
  const dispW = W.heading, track = (t) => t;
  const T = {
    'c-head': { stem: CHROME_STEMS[400], size: 11, lh: 19, track: 0.01 },
    'c-label': { stem: CHROME_STEMS[600], size: 11, lh: 19, track: 0.01 },
    'c-label13': { stem: CHROME_STEMS[600], size: 13, lh: 19, track: 0.01 },
    'c-note': { stem: CHROME_STEMS[400], size: 13, lh: 19, track: 0 },
    'c-strong': { stem: CHROME_STEMS[600], size: 13, lh: 19, track: 0 },
    'c-mono': { stem: CHROME_STEMS.mono, size: 11, lh: 19, track: 0 },
    'b-title': { stem: face('display', dispW).stem, size: 26, lh: 38, track: 0 },
    'b-line': { stem: face('body', W.strong).stem, size: 16, lh: 19, track: 0 },
    'b-name': { stem: face('body', W.strong).stem, size: 13, lh: 19, track: 0 },
    'b-body': { stem: face('body', W.regular).stem, size: 13, lh: 19, track: 0 },
    'b-stack': { stem: face('body', W.regular).stem, size: 26, lh: 38, track: 0 },
    'b-small': { stem: face('body', W.regular).stem, size: 11, lh: 14, track: 0 },
  };
  const mono = ctx.faces.find((x) => x.role === 'mono');
  if (mono) T['m-hex'] = { stem: mono.stem, size: 13, lh: 19, track: 0 };
  T._displayStem = face('display', dispW).stem;
  return T;
}

// ---- measuring (glyph advances plus kerning, as the browser sets them) ----
// slot: a placeholder prints in its compact form (label and length, at most 20 px, with its own padding and dashed border): measure that
const PH_SENT = /([-]+)/;
export function advance(stem, size, text, track = 0) {
  if (!PH || !hasPh(text)) return advance0(stem, size, text, track);
  return String(text).split(PH_SENT).reduce((x, part) => x + (part.startsWith('') ? advance0(stem, Math.min(size, 20), slotText(part), track) + 0.6 * Math.min(size, 20) + 3 : part ? advance0(stem, size, part, track) : 0), 0);
}
// a control (button, choice, field value) prints the placeholder's label alone: measure that
export function advanceLabel(stem, size, text, track = 0) {
  if (!PH || !hasPh(text)) return advance0(stem, size, text, track);
  return String(text).split(PH_SENT).reduce((x, part) => x + (part.startsWith('') ? advance0(stem, size, slotLabelText(part), track) + 0.6 * size + 3 : part ? advance0(stem, size, part, track) : 0), 0);
}
function advance0(stem, size, text, track = 0) {
  const font = loadFont(stem);
  let x = 0, prev = null;
  for (const ch of String(text).replace(/ /g, ' ')) {   // a no-break space is as wide as a space
    const g = font.charToGlyph(ch);
    if (prev) { try { x += font.getKerningValue(prev, g) * size / font.unitsPerEm; } catch { /* no kerning table */ } }
    x += g.advanceWidth * size / font.unitsPerEm + track * size; prev = g;
  }
  return x;
}
// a number and its unit stay together: the space between them becomes a no-break space (so "18 px" never splits across two lines)
export const tie = (s) => String(s).replace(/(\d) (?=(?:px|pt|mm|cm|em|rem|ms|dots?|units?)(?![A-Za-z]))/g, '$1 ');
// greedy word wrap into explicit lines, so the line count laid out is the count that renders (only a plain space is a break)
export function wrap(stem, size, text, maxW, track = 0) {
  const words = tie(text).split(/[ \t\r\n]+/).filter(Boolean), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && advance(stem, size, t, track) > maxW + 0.01) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  if (!PH) return lines;
  // slot: a placeholder wider than the column wraps inside its own box, so it takes that many lines: hold them with empty entries (block() draws none of them)
  const out = [];
  for (const l of lines) { out.push(l); if (hasPh(l)) for (let i = 1, n = Math.ceil(advance(stem, size, l, track) / (maxW * 0.98)); i < n; i++) out.push(''); }
  return out;
}
// where a line box of height lh must start so its first baseline lands on `baseline` (the face's own metrics; calibrated in the build notes)
export function lineOffset(stem, size, lh) {
  const f = loadFont(stem), os2 = f.tables.os2, h = f.tables.hhea, upm = f.unitsPerEm;
  const typo = os2 && (os2.fsSelection & 128) ? { a: os2.sTypoAscender, d: -os2.sTypoDescender, g: os2.sTypoLineGap } : null;
  const m = typo || { a: h.ascender, d: -h.descender, g: h.lineGap };
  const A_ = m.a / upm * size, D_ = m.d / upm * size;
  return (lh - (A_ + D_)) / 2 + A_;
}
export const capRatio = (stem) => capHeight(loadFont(stem), 1);
export { outline, loadFont };

// ---- placing text ----
// The dots stop around every run of text set straight on the paper: the nearest dot that stays is at least one full dot pitch (19 px) from the
// text's end, on both sides, so no dot beside a short line can read as a full stop. Each line gets a paper-coloured box (class ko, under the
// prints and the tape, over the dots) whose edges sit midway between two dots, so no dot is ever cut in half. The text's width is measured
// from the font, with 1.5 px of room on the right for measuring error; a dot exactly one pitch to the left of a line's start stays.
function knockout(x0, x1, top, h) {
  const iL = Math.floor((x0 - U - 23) / U + 1e-6), iR = Math.ceil((x1 + U + 1.5 - 23) / U);
  const l = iL < 0 ? 0 : 23 + U * iL + U / 2, r = iR > 27 ? LEAF.w : 23 + U * iR - U / 2;
  return `<div class="ko" style="left:${px(l)};top:${px(top)};width:${px(r - l)};height:${px(h)}"></div>`;
}
// A block of explicit lines. Give `baseline` (the first baseline, an exact y) or `top` (the spec's box top; the first baseline is then
// snapped to the nearest dot row). knock: false for text inside a field or card (those have their own ground). A raw line (markup) needs
// its measured width in `widths`. Returns { html, height, baseline, lines }.
export function block(tk, { x, w, text, lines, top, baseline, align = 'left', cls = '', color = '', maxW = w, style = '', raw = false, knock = true, widths }) {
  const L = lines ? (raw ? lines : lines.map(tie)) : wrap(tk.stem, tk.size, text, maxW, tk.track);
  const off = lineOffset(tk.stem, tk.size, tk.lh);
  const bl = baseline ?? nearestRow(top + off);
  const t = bl - off;
  const col = color ? `color:${color};` : '';
  const ta = align === 'right' ? ' ta-r' : align === 'center' ? ' ta-c' : '';
  let ko = '';
  if (knock) {
    L.forEach((s, i) => {
      if (s === '') return;
      let lw = widths ? widths[i] : advance(tk.stem, tk.size, s, tk.track), nl = 1;
      if (lw > w && hasPh(s)) { while (L[i + nl] === '') nl++; lw = w; }   // slot: a wrapped placeholder fills the box's width over its lines
      if (nl > 1) { ko += knockout(x, x + w, t + i * tk.lh, nl * tk.lh); return; }
      const x0 = align === 'right' ? x + w - lw : align === 'center' ? x + (w - lw) / 2 : x;
      ko += knockout(x0, x0 + lw, t + i * tk.lh, tk.lh);
    });
  }
  const html = ko + `<div class="t${ta} ${cls}${L.some(hasPh) ? ' ph-tight' : ''}" style="left:${px(x)};top:${px(t)};width:${px(w)};text-align:${align};${col}${style}">`
    + L.filter((s) => s !== '').map((s, i, a) => `<span class="ln">${raw ? s : A(s)}${i < a.length - 1 ? ' ' : ''}</span>`).join('') + '</div>';
  return { html, height: L.length * tk.lh, baseline: bl, lines: L };
}
// one line, right-aligned so that its right edge is at x
export function rightText(tk, { x, text, baseline, cls = '', color = '', knock = true }) {
  const w = Math.ceil(advance(tk.stem, tk.size, text, tk.track)) + 2;
  return block(tk, { x: x - w, w, text, baseline, align: 'right', cls, color, lines: [text], knock });
}

// ---- display text that has to fit: the largest size that sets in few enough lines ----
export function fitLines(stem, text, w, sizes, maxLines, track) {
  for (const [size, lh] of sizes) {
    const lines = wrap(stem, size, text, w, track);
    if (lines.length <= maxLines && lines.every((l) => advance(stem, size, l, track) <= w + 0.5)) return { size, lh, lines };
  }
  const [size, lh] = sizes[sizes.length - 1];
  return { size, lh, lines: wrap(stem, size, text, w, track) };
}

// ---- the parts of the device ----
// the dot pattern for one leaf (a 19 x 19 cell, so exactly 28 x 41 dots), with paper-coloured rects over the dots a clear zone covers.
// clear: [{x, y, w, h}] in leaf-local px, corners on dots; only dots strictly inside are hidden, so the boundary dots stay.
export function dotsSvg(ctx, id, { recto, clear = [] }) {
  const N = nb(ctx), ox = recto ? 559 : 0;
  const pid = `dp-${id}-${recto ? 'r' : 'v'}`;
  const cover = clear.map((c) => `<rect x="${ox + c.x + 1}" y="${c.y + 1}" width="${c.w - 2}" height="${c.h - 2}" fill="${N.paper}"/>`).join('');
  return `<svg class="dots" width="${PAGE.w}" height="${PAGE.h}" viewBox="0 0 ${PAGE.w} ${PAGE.h}" aria-hidden="true"><defs>`
    + `<pattern id="${pid}" x="${ox + 13.5}" y="7.5" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="9.5" cy="9.5" r="1" fill="${N.dot}"/></pattern></defs>`
    + `<rect x="${ox + 13.5}" y="7.5" width="532" height="779" fill="url(#${pid})"/>${cover}</svg>`;
}
// the fold: a 1 px line at x 559, the thread (a running stitch, 11 on and 8 off so every stitch starts on a unit) and its three station
// holes (the cover shows the hinge only). The thread runs 11 px past the last hole so the last stitch is whole.
export function foldSvg(ctx, { thread = true }) {
  const N = nb(ctx);
  const t = thread ? `<line x1="559" y1="74" x2="559" y2="731" stroke="${N.thread}" stroke-width="1.5" stroke-dasharray="11 8"/>`
    + [74, 397, 720].map((y) => `<circle cx="559" cy="${y}" r="2" fill="${N.thread}"/>`).join('') : '';
  return `<svg class="fold" width="${PAGE.w}" height="${PAGE.h}" viewBox="0 0 ${PAGE.w} ${PAGE.h}" aria-hidden="true"><rect x="558.5" y="0" width="1" height="${PAGE.h}" fill="${N.fold}"/>${t}</svg>`;
}
// a short piece of tape across the top-left corner of a print: 5 units wide and 1 tall, its centre line on the print's top edge, one unit
// over the print's left side, square ends, 0 degrees. It is the same object as a card's tab, without the label. The caption sits under the
// print, on the dot row below its bottom edge (every print is a whole number of units tall), in the notebook's plain sans.
// x, y, w, h are the print's (leaf-local).
export function stick(T, { x, y, w, h, label }) {
  return `<div class="tape piece" style="left:${px(x - U)};top:${px(y - U / 2)};width:${5 * U}px;height:${U}px"></div>`
    + block(T['c-note'], { x, w, baseline: y + h + U, lines: [label], cls: 'c-note' }).html;
}
// a tab marking a card: 1 unit tall, as wide as its label plus 20, rounded up to whole units; its centre line sits on the card's top edge
export function tab(T, { x, y, label }) {
  const lw = advance(T['c-label'].stem, 11, slotLabelText(label), 0.01) + (hasPh(label) ? 0.6 * 11 + 3 : 0);   // a tab prints the placeholder's label alone
  const w = Math.ceil((lw + 20 + 1) / U) * U;
  return `<div class="tape tab c-label" style="left:${px(x)};top:${px(y - U / 2)};width:${w}px;height:${U}px">${A(label)}</div>`;
}
// the width of a strip with no print: label width plus 20, rounded up to whole units
export function labelStripW(T, key, label) {
  const t = T[key];
  return Math.ceil((advance(t.stem, t.size, label, t.track) + 20 + 1) / U) * U;
}

// ---- prints: the crop of a scene is centred on its quads and scaled so they fill 62% of the print's shorter side ----
// by 'w' sizes the quads against the print's width, not its shorter side (a tall print of a wide sign)
// scenes whose right edge must stay out of every crop: kerb-shelter-morning has a cyclist cut by the photo's own edge from about x 0.91
const CLEAR_X = { 'kerb-shelter-morning': 0.9 };
export function sceneCrop(scene, pw, ph, frac = 0.62, by = '') {
  const cx0 = CLEAR_X[scene.id] || 1;
  const pts = scene.quads.flatMap((q) => q.corners);
  const x1 = Math.min(...pts.map((p) => p[0])), x2 = Math.max(...pts.map((p) => p[0]));
  const y1 = Math.min(...pts.map((p) => p[1])), y2 = Math.max(...pts.map((p) => p[1]));
  const qw = x2 - x1, qh = y2 - y1, cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  let s = by === 'w' ? frac * pw / qw : pw <= ph ? frac * pw / qw : frac * ph / qh;
  s = Math.max(s, pw / (scene.w * cx0), ph / scene.h);      // the scene (up to its clear edge) must still cover the print
  const iw = scene.w * s, ih = scene.h * s;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { s, iw, ih, left: clamp(pw / 2 - cx * s, pw - iw * cx0, 0), top: clamp(ph / 2 - cy * s, ph - ih, 0), qw: qw * s, qh: qh * s };
}
export function printHtml({ x, y, w, h, inner, label }) {
  return `<div class="print stuck" style="left:${px(x)};top:${px(y)};width:${w}px;height:${h}px" role="img" aria-label="${A(label)}">${inner}</div>`;
}
export function sceneImg(src, crop, alt) {
  return plateImg(A(src), A(alt), `position:absolute;display:block;max-width:none;left:${px(crop.left)};top:${px(crop.top)};width:${px(crop.iw)};height:${px(crop.ih)}`);
}

// ---- words ----
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
export const numberWord = (n) => NUMBER_WORDS[n] || String(n);
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
export const weightName = (w) => WEIGHT_NAMES[w] || String(w);

// ---- the spread ----
// folio: three digits; n is ctx.pageNo(id) - 1, the verso is 2n - 1 and the recto 2n
export const folios = (ctx, id) => { const n = ctx.pageNo(id) - 1; return [String(2 * n - 1).padStart(3, '0'), String(2 * n).padStart(3, '0')]; };

// The spread: both leaves' dots, the leaf content (leaf-local markup), the fold, the running heads and the folios.
// chrome: false drops the head and the folios (the cover). versoField: true when the verso is a field that hides its dots.
export function spread(ctx, id, { verso = '', recto = '', clear = [], versoField = false, thread = true, chrome = true, rectoHead = {}, rectoFolio = {}, headText = '', rectoChrome = true }) {
  const T = tokens(ctx), p = ctx.pages.find((x) => x.id === id), B = ctx.brand;
  const [fv, fr] = folios(ctx, id);
  let vc = '', rc = '';
  if (chrome) {
    vc += block(T['c-head'], { x: 42, w: 300, baseline: 36, lines: [`${B.name} brand guidelines`], cls: 'c-head' }).html;
    vc += block(T['c-mono'], { x: 23, w: 60, baseline: 777, lines: [fv], cls: 'c-mono' }).html;
    const rt = headText || (p.section ? `${p.section.title}, ${p.title}` : p.title);
    if (rectoChrome) rc += rectoHead.left ? block(T['c-head'], { x: 42, w: 300, baseline: 36, lines: [rt], cls: 'c-head', color: rectoHead.color }).html
      : rightText(T['c-head'], { x: 517, text: rt, baseline: 36, cls: 'c-head', color: rectoHead.color }).html;
    if (rectoChrome) rc += rightText(T['c-mono'], { x: 536, text: fr, baseline: 777, cls: 'c-mono', color: rectoFolio.color }).html;
  }
  const dv = versoField ? '' : dotsSvg(ctx, id, { recto: false, clear: clear.filter((c) => !c.recto) });
  const dr = dotsSvg(ctx, id, { recto: true, clear: clear.filter((c) => c.recto) });
  return `<section class="pg" data-page="${id}">${dv}${dr}<div class="leaf v">${verso}${vc}</div><div class="leaf r">${recto}${rc}</div>${foldSvg(ctx, { thread })}</section>`;
}

// ---- 12 Nov fix round ----
// A tone's name can already carry its ground ("Quiet on White"). A pair is named "<text> on <ground>" from the tone's own name with that ground
// taken off, so it never reads "Quiet on White on White".
export function pairName(ctx, fg, bg) {
  const nm = (id) => (ctx.byId[id] || {}).name || id, g = nm(bg);
  let f = nm(fg);
  // a tone built for another ground ("Quiet on White" set on Concrete) keeps its whole name, so it never takes the name of that ground's own tone
  for (const c of ctx.colours || []) {
    const sfx = ` on ${c.name}`;
    if (!f.toLowerCase().endsWith(sfx.toLowerCase())) continue;
    if (c.name.toLowerCase() === g.toLowerCase()) f = f.slice(0, f.length - sfx.length); else return `${f}, on ${g}`;
    break;
  }
  return `${f} on ${g}`;
}
// where a shot's subject sits, from the shot's own `focus` ({ x, y } as percentages): the object-position of a frame that crops the photo
export function focusPos(shot) {
  const f = shot && shot.focus;
  return f ? `${f.x ?? 50}% ${f.y ?? 50}%` : '50% 50%';
}
// ctx.photo with the shot's own focus as the crop position (a caller's own pos still wins)
export function photoAt(ctx, id, o = {}) {
  return ctx.photo(id, { ...o, pos: o.pos || focusPos(ctx.shot(id)) });
}
// the photo credit for a page: nothing for a generated shot; a real credit once only (the caller passes the page's `seen` set)
export function creditOnce(shot, seen) {
  if (!shot || !shot.photo || shot.generated || !shot.credit || seen.has(shot.credit)) return '';
  seen.add(shot.credit);
  return shot.credit;
}
// the brand's own sign, from its applications.signage text: a poster ("Bus shelter poster, 1185 x 1750 mm: Bikes, not vans.") or a vehicle or
// hoarding panel. `line` is the brand line the spec names, else the primary line; `vehicle` is the scene the brand's sign is shown on.
export function signSpec(ctx) {
  const B = ctx.brand, sg = B.applications.signage || '';
  const line = [B.lines.primary, ...(B.lines.others || [])].find((l) => sg.includes(l)) || B.lines.primary;
  const poster = /poster|shelter/i.test(sg);
  return { poster, line, vehicle: poster ? 'kerb-shelter-morning' : 'kerb-ute-kerbside' };
}
