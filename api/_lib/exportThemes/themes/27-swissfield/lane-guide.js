// Theme 27, Swiss Field: the A4 style guide. The same language as the 1920 book, drawn on a 794 x 1123 page: a 48 px ruler strip at the foot, cut by the brand's share
// (the ground held to 45-70%, no colour under 32 px), a field that may rise from its segment, ticks every 10%, a running head of brand / section / version, a two-tone title
// (the page name in ink, one sentence in the second tone), hairline rows and mono for every literal value. Every fact comes from engine/styleguide.js; nothing here names a
// colour id, a hex or a brand. The pages place everything with absolute coordinates and measure text with the fonts' own metrics: a page that does not fit throws.
import { A, nb, nbu, textWidth, wrapU as wrap, faceStem, model, fmtShare, hexOf, cap1, spell, weightName, longDate, twoTone, firstSentence, box, at } from './swiss.js';
import { colourFacts, typeLadder, contrastFacts, logoFacts, tokenGroups, usageFacts, GRADE_NOTE } from '../../engine/styleguide.js';
import { PAGE, PAGE_IDS, r1, sum, hook, hookAdd, withHooks, pageSection, makeGuide, stacker, headLabel, drawWithFewer, SLOT_MIN_H, slotW, logoArt } from '../../engine/guide-layout.js';
import { copyOf, copyRaw } from './guide-copy.js';

// The guide speaks in the brand's own faces: its text face (Medium and Regular) for titles, labels and notes, its mono face for literal values. These are the stems the
// pages measure with; each page sets them from the brand before it draws (the 1920 book keeps its own chrome faces in swiss.js).
const CHROME = { 400: '', 500: '' };
let MONO = '';
const useFaces = (ctx) => { CHROME[400] = faceStem(ctx, 'body', 400); CHROME[500] = faceStem(ctx, 'body', 500); MONO = faceStem(ctx, 'mono', 400); };

const { W, H, X0, XR, CW, COL, COLW } = PAGE;
// the foot strip (its top and height), the lowest y content reaches, and a section header's height
const SY = 1075, SH = 48, BOT = 1022, SUBH = 32;
// a literal figure inside a sentence is set in the mono face
const fig = (s) => `<span class="sg-i">${A(s)}</span>`;
const NAME = { cover: 'Cover', logo: 'Logo', colour: 'Colour', ruler: 'Proportion', applied: 'Applied', type: 'Type', contrast: 'Contrast', tokens: 'Tokens', usage: 'Usage' };

const hl = (x, y, w, c = 'var(--hair)') => box(`left:${r1(x)}px;top:${r1(y)}px;width:${r1(w)}px;height:1px;background:${c}`);
const vl = (x, y, h, c = 'var(--hair)') => box(`left:${r1(x)}px;top:${r1(y)}px;width:1px;height:${r1(h)}px;background:${c}`);
// a section header: an ink rule, the name under it, and an optional note at the right
// (a note given as {html} is set as written, for a note that carries a figure in mono)
const sub = (x, y, w, t, note = '') => hl(x, y, w, 'var(--ink)') + at(x, y + 8, A(t), { cls: 'sg-h' }) + (note ? at(x, y + 8, note.html ?? A(note), { cls: 'sg-n', w, style: 'text-align:right;color:var(--quiet)' }) : '');
// wrapped body text; reports the height it takes so the caller can place what follows
function para(x, y, w, s, { size = 13, lh = 18, weight = 400, style = '' } = {}) {
  const lines = wrap(CHROME[weight], s, size, w).length;
  return { html: at(x, y, nbu(s), { w, cls: size >= 15 ? 'sg-b' : 'sg-n', style: (weight === 500 ? 'font-weight:500;' : '') + style }), h: lines * lh, lines };
}
// the button as the engine reports it, with its label set in the scale's own label step (the engine looks the step up by a name the scale may not have, and falls to Body)
// the brand's own Control step (ui.type) when it has one; else the ladder's Label
const buttonOf = (ctx) => { const bt = usageFacts(ctx).button, lab = typeLadder(ctx).find((t) => t.token === 'label'); return lab && bt.type.token !== 'control' ? { ...bt, type: { ...bt.type, ...lab } } : bt; };
const mono = (x, y, s, { w, size = 12, style = '' } = {}) => at(x, y, A(s), { w, cls: size <= 11 ? 'sg-s' : 'sg-m', style });
// a dashed box that says what photograph goes in it, in the data's own words (the slot edition's photograph, and any shot a brand has no file for)
const briefBox = (x, y, w, h, text, pad = 16) => box(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;border:1px dashed var(--quiet);padding:${pad}px;overflow:hidden`, `<div class="sg-n" style="color:var(--quiet)">Photograph</div><div class="sg-n" style="margin-top:4px;color:var(--ink)">${A(text || '')}</div>`);
// the action colour is never a fill on these pages (both brands' own rule), so wherever its share is drawn it is a neutral hatch, 1 px lines at a 7 px pitch; the real colour is on the Colour page and the buttons
const hatch = (ctx) => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='7' height='7'><path d='M0 7L7 0M-1 1L1 -1M6 8L8 6' stroke='${ctx.roles.light.quiet}' stroke-width='1' fill='none'/></svg>`;
  return `background-image:url('data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}');background-size:7px 7px;`;
};
// a measurement in a caption: the words in the sans, the size in the mono face, with the x of "2400 x 710" set as a multiplication sign
const sizeFig = (s) => fig(String(s).replace(/ x /g, ' × '));
// the display face's weights as the scale sets them, largest step first (Northern: Black for the 96 px display, Bold for the headline and title)
// every display step is set at the heading weight: a brand that keeps its heaviest weight for the wordmark (Northern's 900) never sets a headline in it
const dispWeight = (ctx) => ctx.weights.heading;
const dispWeights = (ctx) => [...new Set(typeLadder(ctx).filter((t) => t.face === 'display').map((t) => dispWeight(ctx, t.weight)))];
// every weight the display face is drawn in, wordmark first: Northern's Black 900 is the wordmark's, Bold 700 sets the lines
const dispNames = (ctx) => [...new Set([ctx.weights.logo, ...dispWeights(ctx)])].sort((a, z) => z - a).map(weightName).join(' and ');
// the display face as its Google family and the width axis it is drawn at ("Archivo, wdth 125"): the engine's "Archivo Expanded" is no family a reader can install
const dispFace = (f) => (f.stretch && f.stretch !== 100 ? `${f.family}, wdth ${f.stretch}` : f.family);
const inkOn = (ctx, hex) => { const L = ctx.roles.light; return ctx.C.ratio(L.text, hex) >= ctx.C.ratio(L.surface, hex) ? L.text : L.surface; };

// ---- the portrait ruler: the model's cut, redone for a page of `total` px ----
function cutRuler(ctx, total, min) {
  const m = model(ctx), g = m.ground, others = m.others;
  const gShare = typeof g.share === 'number' ? g.share : 0.5;
  let wG = gShare * total;
  let wc = others.every((c) => typeof c.share === 'number') ? others.map((c) => c.share * total) : others.map(() => ((1 - gShare) * total) / others.length);
  if (wG < 0.45 * total || wG > 0.7 * total) { wG = Math.min(0.7 * total, Math.max(0.45 * total, wG)); const rest = total - wG, s = sum(wc); wc = wc.map((w) => (w * rest) / s); }
  wc = wc.map((w) => Math.max(min, w));
  wG = total - sum(wc);
  const raw = [wG, ...wc], base = raw.map(Math.floor);
  const left = total - sum(base);
  raw.map((w, i) => ({ i, f: w - Math.floor(w) })).sort((a, b) => b.f - a.f || a.i - b.i).slice(0, left).forEach((o) => { base[o.i] += 1; });
  let x = 0;
  const segs = [g, ...others].map((c, i) => { const s = { c, x, w: base[i], isGround: i === 0 }; x += base[i]; return s; });
  return { segs, groundW: segs[0].w };
}
const pageRuler = (() => { const cache = new WeakMap(); return (ctx) => { if (!cache.has(ctx)) cache.set(ctx, cutRuler(ctx, W, 32)); return cache.get(ctx); }; })();

// The strip's labels keep 24 px (6 mm) clear of the page edge (the trim)
const TRIM = 24;
// a cell's label room: its left pad and the room for text; the cell at the page's right edge keeps the trim clear on that side
const cellRoom = (s) => { const padL = s.w < 70 ? 6 : 10, padR = Math.max(padL, s.x + s.w >= W ? TRIM : 0); return { padL, avail: s.w - padL - padR }; };
// a segment's label by tiers: name and share if they fit, else the share alone, else nothing; the hex line only if it fits too.
// The action colour's hatch gets its label on a chip of the ground, so no hatch line runs through a letter
function tierLabel(ctx, s, { nameSz = 12, monoSz = 11, y = 8, color, chip = false } = {}) {
  const m = model(ctx), c = s.c, ink = color || m.label[c.id];
  const { padL, avail } = cellRoom(s), share = fmtShare(c.share ?? 0), hex = hexOf(c), both = `${c.name} ${share}`;
  let h = '';
  if (textWidth(CHROME[500], both, nameSz) <= avail) h += `<div class="sg-h" style="font-size:${nameSz}px;line-height:${nameSz + 2}px">${A(both)}</div>`;
  else if (textWidth(MONO, share, monoSz) <= avail) h += `<div class="sg-s" style="font-size:${monoSz}px">${share}</div>`;
  else return '';
  if (textWidth(MONO, hex, monoSz) <= avail) h += `<div class="sg-s" style="font-size:${monoSz}px">${hex}</div>`;
  return chip ? at(padL - 3, y - 2, h, { style: `color:${ink};background:var(--ground);padding:2px 3px` }) : at(padL, y, h, { style: `color:${ink}` });
}
// a risen field's label, top left: name, share and hex stacked. The text is never turned: a field too narrow for it has no label of its own, and the cover's table carries it (see fieldFits)
const FIELD_PAD = 12;
function fieldLabel(ctx, s) {
  const m = model(ctx), c = s.c, isAct = c.id === m.action.id, ink = isAct ? 'var(--ink)' : m.label[c.id], share = fmtShare(c.share ?? 0), hex = hexOf(c);
  if (!fieldFits(ctx, s, true)) return '';
  return at(FIELD_PAD - (isAct ? 3 : 0), 36 - (isAct ? 2 : 0), `<div class="sg-h sg-l12">${A(c.name)}</div><div class="sg-s">${share}</div><div class="sg-s">${hex}</div>`, { style: `color:${ink}${isAct ? ';background:var(--ground);padding:2px 3px' : ''}` });
}
// does a field carry its own name, share and hex? (a risen field up the page, or a segment's cell at the foot)
function fieldFits(ctx, s, rise) {
  const c = s.c, hex = hexOf(c);
  if (rise) { const avail = s.w - 2 * FIELD_PAD; return textWidth(CHROME[500], c.name, 12) <= avail && textWidth(MONO, hex, 11) <= avail; }
  const { avail } = cellRoom(s);
  return textWidth(CHROME[500], `${c.name} ${fmtShare(c.share ?? 0)}`, 12) <= avail && textWidth(MONO, hex, 11) <= avail;
}

// the foot of every page: the ruler strip and its ticks; `rise` lifts every field to the full page height.
// The action colour is never a band or a ground (both brands' own rule), so its segment is a neutral hatch, never the colour, and it rises like any other field on the cover.
// A cell too narrow to hold its own name, share and hex says them on a leader line above the strip, so every tile on every page is named.
function strip(ctx, id, rise) {
  const m = model(ctx), R = pageRuler(ctx), segs = R.segs, g = segs[0];
  const isAct = (s) => s.c.id === m.action.id;
  let h = '', outside = '';
  const narrow = [];
  for (const s of segs.slice(1)) {
    const ink = isAct(s) ? 'var(--ink)' : m.label[s.c.id], paint = isAct(s) ? `background-color:var(--ground);${hatch(ctx)}` : `background:${s.c.hex};`;
    const inner = rise ? fieldLabel(ctx, s) + box(`left:0;top:${SY}px;width:100%;height:1px;background:var(--ground)`) : tierLabel(ctx, s, { color: ink, chip: isAct(s) });
    h += box(`left:${s.x}px;top:${rise ? 0 : SY}px;width:${s.w}px;height:${rise ? H : SH}px;${paint}color:${ink}${isAct(s) ? ';box-sizing:border-box;border-left:1px solid var(--hair)' : ''}`, inner);
    if (!rise && !fieldFits(ctx, s, false)) narrow.push(s);
  }
  // one leader line above the strip names the narrow fields, left to right as they lie; two or more share one line, so they say name and share
  // (the hex is on the colour page) and never print over each other
  if (narrow.length) {
    const ly = SY - 14, cxs = narrow.map((s) => Math.round(s.x + s.w / 2)), x1 = Math.min(Math.min(...cxs), XR - 8);
    const text = narrow.map((s) => narrow.length > 1 ? A(`${s.c.name} ${fmtShare(s.c.share ?? 0)}`) : `<span class="sg-h sg-l12">${A(`${s.c.name} ${fmtShare(s.c.share ?? 0)}`)}</span> <span class="sg-i" style="font-size:11px">${hexOf(s.c)}</span>`).join('<span style="color:var(--quiet)"> · </span>');
    outside += hl(x1, ly, XR - 8 - x1 + 1, 'var(--quiet)') + cxs.map((cx) => vl(cx, ly, SY - ly, 'var(--quiet)')).join('')
      + at(0, ly - 18, narrow.length > 1 ? `<span class="sg-h sg-l12">${text}</span>` : text, { style: `left:auto;right:${W - XR}px;color:var(--ink);white-space:nowrap;line-height:14px` });
  }
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  h += box(`left:0;top:${SY}px;width:${g.w}px;height:${SH}px;background:var(--ground)`,
    box('left:0;top:0;width:100%;height:1px;background:var(--hair)')
    + at(X0, 9, `<div class="sg-h sg-l12" style="line-height:14px">${A(`${m.ground.name} ${fmtShare(m.ground.share ?? 0)}`)}</div><div class="sg-s" style="color:var(--quiet)">${hexOf(m.ground)}</div>`)
    + at(0, 9, `<span class="sg-h sg-l12 sg-fo" style="line-height:14px">${folio}</span>`, { style: 'left:auto;right:16px;color:var(--quiet)' }));
  const last = segs[segs.length - 1];
  const tickInk = (x) => { const s = segs.find((o) => x >= o.x && x < o.x + o.w) || last; return x < g.w || isAct(s) ? 'var(--quiet)' : m.label[s.c.id]; };
  for (let k = 0; k <= 10; k++) {
    const x = Math.min(W - 1, (W / 10) * k);
    h += box(`left:${x}px;top:${SY}px;width:1px;height:4px;background:${tickInk(x)}`);
  }
  return h + outside;
}

// the running head: brand, section, version
function head(ctx, id, CR) {
  const B = ctx.brand, sec = NAME[id], ver = B.version.number;
  const midX = Math.round(X0 + (CR - X0) / 2), sw = textWidth(CHROME[400], sec, 13), vw = textWidth(CHROME[400], ver, 13);
  // the left of the head takes the first wording that fits before the middle: the full title, the name alone, then the name cut short
  const left = headLabel(B.name, (str) => X0 + textWidth(CHROME[500], str, 13) + 16 <= midX);
  if (midX + sw + 16 > CR - vw) throw new Error(`Swiss Field guide: the running head does not fit in ${CR - X0} px on ${id}`);
  return at(X0, 36, A(left), { cls: 'sg-h' }) + at(midX, 36, A(sec), { cls: 'sg-n', style: 'color:var(--quiet)' }) + at(0, 36, A(ver), { cls: 'sg-n', style: `left:auto;right:${W - CR}px;color:var(--quiet)` });
}

// the page title: the name in ink, then one sentence in the second tone, set at the scale's own Title step in the display face at its heading weight; the first candidate that sets within `maxLines` wins
function title(ctx, id, sentences, w, maxLines = 2) {
  const name = NAME[id], cands = [...(Array.isArray(sentences) ? sentences : [sentences])];
  const tk = typeLadder(ctx).find((t) => t.token === 'title') || typeLadder(ctx).filter((t) => t.face === 'display').pop(), d = ctx.brand.fonts.display, st = (d.stretch || 100) / 100;
  const stem = faceStem(ctx, 'display', dispWeight(ctx)), lines = (s) => wrap(stem, `${name}. ${s}`, tk.size, w / st, -0.01).length;
  const pick = cands.find((s) => lines(s) <= maxLines);
  if (pick === undefined) throw new Error(`Swiss Field guide: no title sentence for ${id} sets within ${maxLines} lines at ${w} px`);
  const bottom = 84 + lines(pick) * tk.line;
  return { html: at(X0, 84, `<h1 class="sg-t disp" style="color:var(--ink);font-size:${tk.size}px;line-height:${tk.line}px"><span>${A(name)}.</span> <span style="color:var(--quiet)">${A(pick)}</span></h1>`, { w }), top: bottom + 28 };
}

function shell(ctx, id, { rise = false, body = '' } = {}) {
  const CR = rise ? pageRuler(ctx).groundW - 24 : XR;
  return pageSection(id, `${strip(ctx, id, rise)}${head(ctx, id, CR)}${body}`);
}

// Content fills the page: sections stack from `top`; spare height goes to the sections that can grow, then to the gaps (engine/guide-layout.js)
const flow = stacker({ theme: 'Swiss Field', bottom: BOT });

// ---------------------------------------------------------------- cover
function cover(ctx) {
  const B = ctx.brand, m = model(ctx), R = pageRuler(ctx), G = ctx.logo.geos.colour;
  const CR = R.groundW - 24, cw = CR - X0, lw = Math.min(cw, 360), lh = (lw * G.h) / G.w;
  const logoY = 112;
  const logo = at(X0, logoY, ctx.logo.html('colour', { width: lw }));
  const d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono;
  // the version is in the running head, so the table has the date, the faces, and any colour whose field is too narrow to carry its own label (name, share and hex): [key, value, html?]
  const facts = [['Date', longDate(B.version.date)], ['Display', `${dispFace(d)}, ${dispNames(ctx)}`], ['Text', `${b.family}, ${weightName(400)} and ${weightName(500)}`]];
  if (mo) facts.push(['Mono', mo.family]);
  // the hatch is on the strip from this page on: say once what it is
  facts.push(['Hatched', [`${m.action.name}, kept for the one action`, `${m.action.name}, the one action`, m.action.name]]);
  for (const s of R.segs.slice(1)) {
    if (!fieldFits(ctx, s, true)) facts.push([s.c.name, `${fig(fmtShare(s.c.share ?? 0))}<span style="margin-inline-start:12px">${fig(hexOf(s.c))}</span>`, true]);
  }
  // the logo alone at the top; the line and the facts grouped at the foot, the facts last, so one white field separates them
  const rowH = 30, fy = 1010 - facts.length * rowH - 1;
  // the key column is as wide as the longest name needs (never under 80 px), so a brand's own colour names fit
  const kw = Math.min(160, Math.max(80, Math.ceil(Math.max(...facts.map(([k]) => textWidth(CHROME[500], k, 13)))) + 8));
  const rows = facts.map(([k, v0, raw], i) => {
    const v = Array.isArray(v0) ? (v0.find((o) => textWidth(CHROME[400], o, 13) <= cw - kw) ?? v0[v0.length - 1]) : v0;
    if (textWidth(CHROME[500], k, 13) > kw - 8) throw new Error(`Swiss Field guide: the cover fact name "${k}" does not fit`);
    if (!raw && textWidth(CHROME[400], v, 13) > cw - kw) throw new Error(`Swiss Field guide: the cover fact "${v}" does not fit`);
    return hl(X0, fy + i * rowH, cw, i === 0 ? 'var(--ink)' : 'var(--hair)') + at(X0, fy + i * rowH + 7, A(k), { cls: 'sg-n', style: 'color:var(--quiet)' }) + at(X0 + kw, fy + i * rowH + 7, raw ? v : A(v), { cls: 'sg-n' });
  }).join('') + hl(X0, fy + facts.length * rowH, cw);
  // the line: both sentences in the text colour, one to a line, at the heading weight. A brand with photographs sets each sentence on one line (a display of one or two lines)
  // and puts a photograph in the field under it; a brand without sets the line as large as the column holds
  const shot = (B.imagery.shots || []).filter((o) => o.photo).find((o) => o.id !== 'busstop');
  // the display spends its emphasis once: with a photograph under it the two sentences sit one to a line; without, the primary line alone, in two or three lines
  const tt0 = twoTone(ctx, B.lines.primary, (B.lines.others || [])[0]), tt = shot ? tt0 : { t1: tt0.t1, t2: '' };
  const cw0 = dispWeights(ctx)[0], stem = faceStem(ctx, 'display', cw0), st = (d.stretch || 100) / 100;
  const parts = [tt.t1, tt.t2].filter(Boolean);
  const count = (s) => sum(parts.map((t) => wrap(stem, t, s, cw / st, -0.01).length));
  // a size that leaves no short word alone on a line ("by" under "There")
  const orphan = (s) => parts.some((t) => wrap(stem, t, s, cw / st, -0.01).some((l, _, all) => all.length > 1 && !l.includes(' ') && l.length <= 3));
  // the line is set at one of the scale's own display steps (its size and its line height), the largest that sets as asked
  const dl = typeLadder(ctx).filter((t) => t.face === 'display'), room = (fy - 36) - (Math.round((logoY + lh + 44) / 4) * 4);
  const stp = (shot ? dl.find((t) => count(t.size) <= parts.length) : dl.find((t) => count(t.size) <= 3 && count(t.size) * t.line <= room && !orphan(t.size))) || dl[dl.length - 1];
  const size = stp.size, lineH = stp.line, headH = Math.ceil(count(size) * lineH);
  // the line and the field under it sit together at the foot, over the facts; the top is on the 4 px base
  const phH = shot ? Math.round((cw * 2) / 3) : 0, py = fy - 32 - phH, top = Math.round(((shot ? py - 32 : fy - 40) - headH) / 4) * 4;
  const stmt = box(`left:${X0}px;top:${top}px;width:${cw}px;font-size:${size}px;line-height:${lineH}px`,
    `<div class="disp" style="color:var(--ink);font-weight:${cw0}">${A(tt.t1)}</div>${tt.t2 ? `<div class="disp" style="color:var(--ink);font-weight:${cw0}">${A(tt.t2)}</div>` : ''}`);
  // the field under the line: the brand's photograph cropped wide, 3 : 2, as its crop rule says (the slot edition, the brief for it), down to the facts
  if (top < logoY + lh + 24) throw new Error('Swiss Field guide: the cover line does not fit above its field');
  const field = shot ? (ctx.edition === 'slot' ? briefBox(X0, py, cw, phH, (B.imagery.direction || {}).crop || shot.alt)
    : box(`left:${X0}px;top:${py}px;width:${cw}px;height:${phH}px;overflow:hidden`, ctx.photo(shot.id, { pos: copyRaw(ctx, 'photoPos', {})[shot.id] || '50% 50%', style: 'width:100%;height:100%' }))) : '';
  return shell(ctx, 'cover', { rise: true, body: logo + rows + stmt + field });
}

// ---------------------------------------------------------------- logo
// A scale in x: a 1 px line with a tick every x, the whole ones numbered, and the full length at its right end
function xScale(x0, y, len, u, color, bare = false) {
  const endX = x0 + len * u;
  // the numbered step is the finest that leaves every number clear of the full-length label at the end ("12" would sit on "13.2 x"), so no number is dropped
  const clear = (s) => { for (let k = s; k <= len + 1e-6; k += s) if (endX - (x0 + k * u) < 52) return false; return true; };
  const step = [1, 2, 5, 10].find((s) => s * u >= 30 && clear(s)) || 10;
  let h = hl(x0, y, len * u, color);
  for (let k = 0; k <= Math.floor(len + 1e-6); k++) h += vl(x0 + k * u, y, k === 0 ? 10 : 6, color);
  h += vl(endX - 1, y, 10, color);
  if (bare) return h;
  for (let k = 0; k <= Math.floor(len + 1e-6); k += step) {
    if (k > 0 && endX - (x0 + k * u) < 44) continue;
    h += at(x0 + k * u - 12, y - 20, String(k), { cls: 'sg-s', w: 24, style: `text-align:center;color:${color}` });
  }
  return h + at(endX - 44, y - 20, `${len.toFixed(1)} x`, { cls: 'sg-s', w: 44, style: `text-align:right;color:${color}` });
}
const logoPage = (ctx) => drawWithFewer((max) => logoDraw(ctx, max), 6);
function logoDraw(ctx, maxTiles) {
  const L = ctx.logo, G = L.geos.colour, unit = L.geo.unit, LF = logoFacts(ctx), m = model(ctx);
  const slot = ctx.edition === 'slot';
  const t = title(ctx, 'logo', [`One x clear on every side. Never under ${L.minSize.screenPx} px wide.`, 'One x clear on every side.'], CW);
  const art = (id, w, o = {}) => logoArt(ctx, id, w, o);

  // A: clear space, drawn across the second and third columns, the rule and its numbers in the first.
  // The drawing takes the height the other three sections leave (see gA, set once they are sized), as large as the columns hold
  const xw = G.w / unit, xh = G.h / unit, fwX = xw + 2, fhX = xh + 2;
  // the slot edition has no mark to measure: it says the rule in words and leaves the numbers to the supplied artwork
  const ruleText = 'x is the cap height of the name. Keep one x clear on every side: no text, edge or mark enters it.';
  // [label, value as set]: words are set in the sans, a figure in the mono face (fig)
  const kv = slot ? [['x', 'Cap height of the name'], ['Clear space', 'One x on every side'], ['Minimum size', () => fig(`${L.minSize.screenPx} px · ${L.minSize.printMm} mm`)]]
    : [['x', `${fig(`${L.clearShare}%`)} of logo height`], ['Logo', fig(`${xw.toFixed(1)} × ${xh.toFixed(1)} x`)], ['In this drawing', () => fig(`x = ${gA.u} px`)]];
  const rule = para(X0, 0, COLW, ruleText);
  const gA = {};
  const drawA = (y) => {
    const { u, fw, fh, lw, lh } = gA;
    const x0 = COL[1], y0 = y + SUBH + 28, t2 = 'var(--quiet)';
    const frame = box(`left:${x0}px;top:${r1(y0)}px;width:${r1(fw)}px;height:${r1(fh)}px;border:1px solid ${t2};box-sizing:border-box`)
      + box(`left:${x0 + u}px;top:${r1(y0 + u)}px;width:${r1(lw)}px;height:${r1(lh)}px;border:1px solid var(--hair);box-sizing:border-box`)
      + at(x0 + u, y0 + u, art('colour', lw));
    const midY = y0 + u + lh / 2, midX = x0 + u + lw / 2;
    const across = (x) => hl(x, midY, u, t2) + vl(x, midY - 6, 13, t2) + vl(x + u - 1, midY - 6, 13, t2) + at(x, midY - 26, 'x', { cls: 'sg-n', w: u, style: 'text-align:center;color:var(--quiet)' });
    const down = (yy) => vl(midX, yy, u, t2) + hl(midX - 6, yy, 13, t2) + hl(midX - 6, yy + u - 1, 13, t2) + at(midX + 10, yy + u / 2 - 9, 'x', { cls: 'sg-n', style: 'color:var(--quiet)' });
    const rp = para(X0, y0 - 6, COLW, ruleText);
    const ky = y0 - 6 + rp.h + 12;
    const rows = kv.map(([k, v], i) => hl(X0, ky + i * 22, COLW) + at(X0, ky + i * 22 + 6, A(k), { cls: 'sg-n', style: 'color:var(--quiet)' }) + at(X0, ky + i * 22 + 6, typeof v === 'function' ? v() : slot ? A(v) : v, { cls: 'sg-n', w: COLW, style: 'text-align:right' })).join('') + hl(X0, ky + kv.length * 22, COLW);
    return sub(X0, y, CW, 'Clear space') + rp.html + rows + frame + across(x0) + across(x0 + u + lw) + down(y0) + down(y0 + u + lh) + xScale(x0, y0, fwX, u, 'var(--quiet)', slot);
  };

  // B: the colourways, each on the ground it is drawn for (colourways that are the same drawing are one tile)
  // the slot edition draws one frame whatever the drawing, so its tiles are one per colourway (never two colourways on one tile); the showcase edition one per drawing
  const groups = [];
  for (const g of LF.grounds) {
    const key = slot ? `${g.groundHex.toLowerCase()}|${g.label}` : JSON.stringify(g.cw);
    const f = groups.find((o) => o.key2 === key);
    if (f) f.labels.push(g.label); else groups.push({ ...g, key2: key, labels: [g.label] });
  }
  // a brand can carry many colourways: the page draws the first six (two rows) so the clear-space drawing keeps its room, and says so for the markdown
  if (groups.length > maxTiles) groups.length = maxTiles;
  // the ground is named once, in the section's note (its hex in mono, no #); each tile carries only its colourway
  const groundList = [...new Map(LF.grounds.map((g) => [g.groundHex.toLowerCase(), g])).values()];
  const groundNote = { html: groundList.map((g) => (groundList.length > 1 ? A(g.ground) : `${A(g.ground)} ${fig(g.groundHex.replace('#', '').toUpperCase())}`)).join(', ') };
  const five = groups.length === 5 && (slot ? slotW(ctx, 100) : 100) + 30 <= Math.floor((CW - 48) / 5), lgw0 = five ? 100 : Math.min(180, Math.max(116, Math.round((44 * G.w) / G.h))), lgw = slot ? slotW(ctx, lgw0) : lgw0;
  // four tiles go in one row when the logo frame fits a quarter of the page: the room it saves goes to the clear-space drawing
  const four = groups.length === 4 && lgw + 30 <= Math.floor((CW - 48) / 4);
  let perRow = five ? 5 : four ? 4 : Math.ceil(groups.length / Math.ceil(groups.length / 3)), tw = five ? Math.floor((CW - 48) / 5) : four ? Math.floor((CW - 48) / 4) : perRow === 2 ? Math.floor((CW - 25) / 2) : COLW, tx0 = (i) => (five ? X0 + (i % 5) * (tw + 12) : four ? X0 + (i % 4) * (tw + 16) : perRow === 2 ? X0 + (i % 2) * (tw + 25) : COL[i % 3]);
  if (lgw + 30 > tw && !five && !four && perRow > 2 && groups.length > 1) { perRow = 2; tw = Math.floor((CW - 25) / 2); tx0 = (i) => X0 + (i % 2) * (tw + 25); }
  if (lgw + 30 > tw && !five && !four) { perRow = 1; tw = CW; tx0 = () => X0; }
  const lgh = (lgw * G.h) / G.w, rows = Math.ceil(groups.length / perRow), th0 = slot && lgh < 40 ? Math.ceil(14 + lgh + 10 + 22 + 10) : Math.max(104, Math.ceil(14 + lgh + 12 + 30 + 10));
  if (lgw + 30 > tw) throw new Error(`Swiss Field guide: the colourway tile is ${tw} px wide and the logo frame needs ${lgw + 30}`);
  const B_h = SUBH + 16 + rows * th0 + (rows - 1) * 16;
  const drawB = (y) => {
    const th = th0;
    return sub(X0, y, CW, 'Colourways', groundNote) + groups.map((g, i) => {
      const x = tx0(i), ty = y + SUBH + 16 + Math.floor(i / perRow) * (th + 16), ink = inkOn(ctx, g.groundHex);
      return box(`left:${x}px;top:${ty}px;width:${tw}px;height:${th}px;background:${g.groundHex};box-sizing:border-box;border:1px solid var(--hair);color:${ink}`,
        at(15, 15, art('colour', lgw, { colourway: g.key, color: ink })) + at(15, th - (slot && lgh < 40 ? 32 : 30), `<div class="sg-h">${A(g.labels.join(' and '))}</div>`));
    }).join('');
  };

  // C: the smallest size, drawn at the size it names
  const mn = L.minSize, xpx = (mn.screenPx * unit) / G.w, xmm = (mn.printMm * unit) / G.w;
  const minText = slot ? `Never set the logo narrower than ${mn.screenPx} px on screen or ${mn.printMm} mm in print, so the name keeps reading.` : `Never set the logo narrower than ${mn.screenPx} px on screen or ${mn.printMm} mm in print. At that size x is ${xpx.toFixed(1)} px, or ${xmm.toFixed(1)} mm.`;
  // drawn at exactly the minimum, in the slot edition too: a frame too short to hold its word carries the word beneath it instead
  const minW = mn.screenPx, minH = (minW * G.h) / G.w, labelInside = minH >= SLOT_MIN_H;
  const cText = para(COL[1], 0, CW - COLW - 25, minText);
  const C_h = SUBH + 16 + Math.max(slot ? Math.ceil(minH) + (labelInside ? 0 : 24) : mn.screenH, cText.h, 24);
  const minArt = slot ? ctx.logo.html('colour', { width: minW, label: labelInside ? 'Logo' : '' }) : art('colour', minW);
  const drawC = (y) => sub(X0, y, CW, 'Smallest size', { html: fig(`${mn.screenPx} px · ${mn.printMm} mm`) }) + at(X0, y + SUBH + 16, minArt)
    + (slot && !labelInside ? at(X0, y + SUBH + 16 + Math.ceil(minH) + 6, 'Logo', { cls: 'sg-n', style: 'color:var(--quiet)' }) : '')
    + para(COL[1], y + SUBH + 14, CW - COLW - 25, minText).html;

  // D: four ways to spoil it
  // the wrong colour is one of the brand's own that the logo never wears: the link colour, else the action colour (the slot frame sets its words in it)
  // (darkened until it reads on the ground, as the slot frame's word is set in it)
  const wrongHue = (ctx.colours.find((c) => c.role === 'link') || m.action).hex;
  const wrongFill = (() => {
    const n = parseInt(wrongHue.slice(1), 16);
    for (let k = 1; k >= 0.4; k -= 0.05) {
      const hex = '#' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k).toString(16).padStart(2, '0')).join('');
      if (ctx.C.ratio(hex, m.ground.hex) >= 4.5) return hex;
    }
    return wrongHue;
  })();
  const dw = Math.floor((CW - 3 * 16) / 4), dh = slot ? 64 : 72, mw = slot ? slotW(ctx, 100) : 100, mh = (mw * G.h) / G.w;
  // the slot edition holds no mark to spoil, so its tiles are the rule in words; the showcase draws each wrong version from the brand's own logo parts
  const misuse = (w, fill) => L.forMisuse(w, { fill });
  const geoM = L.geo, partsM = G.parts, hasRole = (r) => partsM.some((p) => p.role === r);
  // the mark redrawn with some of its parts changed, in its own full colour so the fault is the only change (a part takes its role's colour in the colour way, else the name's, as the logo draws it)
  const cwC = ctx.brand.logo.colourways.colour;
  const redraw = (w, ps) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${G.w.toFixed(2)} ${G.h.toFixed(2)}" width="${r1(w)}" height="${r1((w * G.h) / G.w)}" role="img" aria-label="Misuse">${ps.map((p) => `<path d="${p.d}" fill="${cwC[p.role] || cwC.name}"${p.tf ? ` transform="${p.tf}"` : ''}/>`).join('')}</svg>`;
  const swap = (role, f) => partsM.map((p) => (p.role === role ? { ...p, ...f(p) } : p));
  const brandCases = [];
  if (hasRole('sun') && hasRole('rule')) {
    // the horizon line is as wide as the name, and the sun rises from it
    brandCases.push(['Floating sun', 'The sun rises from the line. It never floats above it.', (w) => redraw(w, swap('sun', (p) => ({ tf: `translate(0 ${(-geoM.cap * 0.5).toFixed(2)}) ${p.tf}`.trim() })))]);
    brandCases.push(['Short line', 'The line is as wide as the name, no less.', (w) => redraw(w, swap('rule', (p) => ({ tf: `scale(0.55 1) ${p.tf}`.trim() })))]);
  } else if (hasRole('kerb')) {
    // the kerb runs the length of the name and steps down after its last letter
    const y0 = geoM.cap + geoM.gap, T = geoM.T, total = geoM.W + geoM.tail, step = geoM.W * 0.42;
    const f = (n) => n.toFixed(2);
    brandCases.push(['Moved step', 'The step falls after the last letter, not under the name.', (w) => redraw(w, swap('kerb', () => ({ d: `M0 ${f(y0)} H${f(step)} V${f(y0 + T)} H${f(total)} V${f(y0 + 2 * T)} H${f(step - T)} V${f(y0 + T)} H0 Z`, tf: '' })))]);
    brandCases.push(['Flat line', 'The kerb drawn flat. It always steps down.', (w) => redraw(w, swap('kerb', () => ({ d: `M0 ${f(y0)} H${f(total)} V${f(y0 + T)} H0 Z`, tf: '' })))]);
  } else {
    brandCases.push(['Stretch', 'Pulled wider than drawn.', (w) => L.forMisuse(w, { fill: 'var(--ink)' })]);
    brandCases.push(['Squash', 'Pressed shorter than drawn.', (w) => L.forMisuse(w, { fill: 'var(--ink)' })]);
  }
  const cases = [
    ...brandCases.map(([n, why, draw]) => ({ n, why, draw: (cx, cy) => at(cx - mw / 2, cy - mh / 2, draw(mw), { style: n === 'Squash' ? 'transform:scaleY(0.6)' : n === 'Stretch' ? `transform:scaleX(${mw * 1.4 <= dw - 8 ? 1.4 : 1})` : '' }) })),
    { n: 'Recolour', why: 'The logo keeps the colours it is drawn in.', draw: (cx, cy) => at(cx - mw / 2, cy - mh / 2, misuse(mw, wrongFill)) },
    { n: 'Crowd', why: 'Keep one x clear on every side.', draw: (cx, cy) => at(cx - mw / 2, cy - mh / 2 - 4, misuse(mw, 'var(--ink)')) + box(`left:${cx - mw / 2}px;top:${r1(cy + mh / 2 - 1)}px;width:${mw}px;height:8px;background:var(--ink)`) },
  ];
  const D_h = SUBH + 16 + dh + 8 + 18;
  const drawD = (y) => sub(X0, y, CW, 'Never') + cases.map((c, i) => {
    const x = X0 + i * (dw + 16), ty = y + SUBH + 16;
    if (slot) {
      const p = para(0, 0, dw - 24, c.why, { size: 11, lh: 14 });
      if (p.h > dh - 16) throw new Error(`Swiss Field guide: the logo "${c.n}" caption takes ${p.lines} lines and the tile holds ${Math.floor((dh - 16) / 14)}`);
      return box(`left:${x}px;top:${ty}px;width:${dw}px;height:${dh}px;box-sizing:border-box;border:1px solid var(--hair);padding:8px 12px;display:flex;align-items:center`, `<div class="sg-n" style="font-size:11px;line-height:14px;color:var(--quiet);text-wrap:pretty">${A(c.why)}</div>`) + at(x, ty + dh + 8, A(c.n), { cls: 'sg-h', style: 'font-weight:400' });
    }
    return box(`left:${x}px;top:${ty}px;width:${dw}px;height:${dh}px;box-sizing:border-box;border:1px solid var(--hair);overflow:hidden`, c.draw(dw / 2, dh / 2)) + at(x, ty + dh + 8, A(c.n), { cls: 'sg-h', style: 'font-weight:400' });
  }).join('');

  // E: the lockups the brand defines beside the full-colour logo: horizontal, stacked and symbol, each with the line that says when to use it
  // (the slot edition carries neutral lines: the places a brand lists for each are the brand's to say)
  const LK = [['horizontal', 'Horizontal'], ['stacked', 'Stacked'], ['symbol', 'Symbol']];
  const lkWhen = (id) => (slot ? { horizontal: 'Headers, signatures, wide spaces.', stacked: 'Squarer spaces, such as avatars.', symbol: 'App icon, favicon and stamp.' }[id] : ctx.brand.logo.when[id]);
  const lkTile = slot ? 40 : 52, lkMaxH = slot ? 24 : 36, lkMaxW = COLW - 32;
  const lkW = (id) => { const g = L.geos[id], w = Math.min(lkMaxW, (lkMaxH * g.w) / g.h); return slot ? Math.max(w, Math.ceil((SLOT_MIN_H * g.w) / g.h)) : w; };
  const lkCaps = LK.map(([id]) => para(0, 0, COLW, lkWhen(id), { size: 11, lh: 14 }));
  const E_h = SUBH + 16 + lkTile + 8 + 18 + 4 + Math.max(...lkCaps.map((p) => p.h));
  const drawE = (y) => sub(X0, y, CW, 'Lockups') + LK.map(([id, name], i) => {
    const x = COL[i], ty = y + SUBH + 16, w = lkW(id), h = (w * L.geos[id].h) / L.geos[id].w;
    return box(`left:${x}px;top:${ty}px;width:${COLW}px;height:${lkTile}px;box-sizing:border-box;border:1px solid var(--hair)`, at((COLW - w) / 2 - 1, (lkTile - h) / 2 - 1, art(id, w)))
      + at(x, ty + lkTile + 8, A(name), { cls: 'sg-h', style: 'font-weight:400' }) + para(x, ty + lkTile + 8 + 18 + 4, COLW, lkWhen(id), { size: 11, lh: 14, style: 'font-size:11px;line-height:14px;color:var(--quiet)' }).html;
  }).join('');

  // the clear-space drawing takes what the other sections leave: as tall as the room, as wide as the columns, one x on every side
  {
    const room = BOT - t.top - (B_h + C_h + D_h + E_h + 4 * 18) - SUBH - 28, textH = rule.h + 12 + kv.length * 22 + 12;
    const u = Math.max(12, Math.floor(Math.min((CW - COLW - 25) / fwX, room / fhX, 60)));
    Object.assign(gA, { u, fw: fwX * u, fh: fhX * u, lw: xw * u, lh: xh * u, h: SUBH + 28 + Math.max(fhX * u, textH) });
  }
  // checked before the hooks are written, so the one-row retry leaves no second copy
  if (gA.h + B_h + E_h + C_h + D_h + 4 * 18 > BOT - t.top && groups.length > perRow) return { fewer: perRow };
  ctx.logoShown = groups.flatMap((g) => g.labels.map((label, i) => ({ key: i ? LF.grounds.find((o) => o.label === label).key : g.key, label })));
  hook(ctx, { lockups: LK.map(([id, name]) => [name, lkWhen(id)]) });
  if (slot) hookAdd(ctx, 'supply', [['Logo', 'Horizontal, stacked and symbol, SVG']]);
  const body = t.html + flow('logo', t.top, [
    { h: gA.h, draw: drawA }, { h: B_h, draw: drawB }, { h: E_h, draw: drawE }, { h: C_h, draw: drawC }, { h: D_h, draw: drawD },
  ], { gap: 18, maxGap: 80 });
  return shell(ctx, 'logo', { body });
}

// ---------------------------------------------------------------- colour
function colourPage(ctx) {
  const m = model(ctx), cw = CW, F = colourFacts(ctx);
  const t = title(ctx, 'colour', copyOf(ctx, 'colour', [`${cap1(spell(F.length))} colours, widest first.`]), cw, 3);
  // print values: the data's CMYK where it has one, else computed from the hex and said to be
  const cmykOf = ([r, g, b]) => { const k = 1 - Math.max(r, g, b) / 255; return k >= 1 ? [0, 0, 0, 100] : [r, g, b].map((v) => (1 - v / 255 - k) / (1 - k) * 100).concat(k * 100).map(Math.round); };
  const computed = F.some((f) => !f.cmyk);
  const footText = computed ? 'CMYK * is computed from the hex: proof before print.' : '', footH = footText ? para(X0, 0, cw, footText).h : 0;
  const n = F.length, rowH = Math.floor((BOT - footH - 14 - t.top) / n), ls = Math.max(18, Math.min(24, Math.floor((rowH - 78) / 4)));
  // one swatch edge for every row: clear of the widest "Text" line, never nearer than 176 px to the margin
  const inkW = (f) => textWidth(CHROME[400], f.ink.name, 13) + 6 + textWidth(MONO, `${f.ink.ratioText}:1`, 12) + 6 + textWidth(CHROME[400], f.ink.grade, 13);
  const sx = Math.max(X0 + 176, Math.ceil(X0 + 56 + Math.max(...F.map(inkW)) + 16));
  if (X0 + cw - sx < 60) throw new Error('Swiss Field guide: the colour page swatch has no room');
  const maxShare = Math.max(...F.map((f) => f.share ?? 0)) || 1;   // the swatch is as wide as the colour's share: the widest runs the full width, none is under 32 px
  const rows = F.map((f, i) => {
    const y = t.top + i * rowH, [r, g, b] = f.rgb;
    const cmyk = f.cmyk ? (Array.isArray(f.cmyk) ? f.cmyk.join(' ') : String(f.cmyk)) : `${cmykOf(f.rgb).join(' ')} *`;
    // HEX (no #, as everywhere), RGB and CMYK are literal values, set in mono; the Text row is a colour's name, then its ratio in mono, then the grade
    const kv = [['HEX', f.hex.replace('#', '').toUpperCase(), true], ['RGB', `${r} ${g} ${b}`, true], ['CMYK', cmyk, true]];
    return hl(X0, y, cw, i === 0 ? 'var(--ink)' : 'var(--hair)')
      + box(`left:${sx}px;top:${y + 14}px;width:${Math.max(32, Math.round((X0 + cw - sx) * ((f.share ?? 0) / maxShare)))}px;height:${rowH - 14 - 22}px;background:${f.hex};box-sizing:border-box;border:1px solid var(--hair)`)
      + at(X0, y + 10, A(f.name), { cls: 'sg-h', style: 'font-size:15px;line-height:20px' })
      + at(X0, y + 32, A(`${cap1(f.role)}, ${fmtShare(f.share ?? 0)}`), { cls: 'sg-n', style: 'color:var(--quiet)' })
      + kv.map(([k, v], j) => at(X0, y + 64 + j * ls, A(k), { cls: 'sg-n', style: 'color:var(--quiet)' }) + mono(X0 + 56, y + 64 + j * ls + 1, v)).join('')
      + at(X0, y + 64 + 3 * ls, A('Text'), { cls: 'sg-n', style: 'color:var(--quiet)' }) + at(X0 + 56, y + 64 + 3 * ls, `${A(f.ink.name)} ${fig(`${f.ink.ratioText}:1`)} ${A(f.ink.grade)}`, { cls: 'sg-n' });
  }).join('');
  return shell(ctx, 'colour', { body: t.html + rows + (footText ? para(X0, BOT - footH, cw, footText, { style: 'color:var(--quiet)' }).html : '') });
}

// ---------------------------------------------------------------- ruler
function rulerPage(ctx) {
  const m = model(ctx), B = ctx.brand, P = pageRuler(ctx);
  const t = title(ctx, 'ruler', copyOf(ctx, 'ruler', [`${m.ground.name} holds ${fmtShare(m.ground.share ?? 0)} of the width. Every other colour is cut by share.`, 'Every colour is cut by share.']), CW);
  const ruleText = `Each colour is as wide as its share. On these pages ${m.action.name} is drawn as a hatch, not a fill: it is kept for the one action.`;
  const rp = para(X0, 0, CW, ruleText, { size: 15, lh: 22 });
  // the ruler is drawn once, at the foot of every page; this page says how it is cut and names each width
  const intro = { h: rp.h, draw: (y) => para(X0, y, CW, ruleText, { size: 15, lh: 22 }).html };

  const cols = { name: X0 + 22, share: 420, a4: 584, slide: XR };
  // each row carries a bar as long as its share (the largest share is the full bar); the action colour is a hatch, as everywhere on these pages
  const maxShare = Math.max(...m.segs.map((s) => s.c.share ?? 0)) || 1, BX = X0 + 148, BW = 150;
  // a column's width is a colour's share of the page, except where the cut keeps a narrow colour at its floor: the ground gives up the difference, and the page says so
  const SLIDE = 1920, off = [];
  m.segs.forEach((s, i) => { for (const [col, total, w] of [['A4', W, P.segs[i].w], ['slide', SLIDE, s.w]]) { const want = Math.round((s.c.share ?? 0) * total); if (Math.abs(w - want) >= 2) off.push({ s, col, total, want, w }); } });
  const o0 = off[0], noteTxt = o0 ? `${o0.s.c.name} is ${o0.w} px on the ${o0.col} where its share gives ${o0.want} px: ${o0.want - o0.w} px go to keep the narrowest colour at its floor.` : '';
  const noteHtml = o0 ? `${A(o0.s.c.name)} is ${fig(`${o0.w} px`)} on the ${A(o0.col)} where its share gives ${fig(`${o0.want} px`)}: ${fig(`${o0.want - o0.w} px`)} go to keep the narrowest colour at its floor.` : '';
  const noteH = noteTxt ? 16 + wrap(CHROME[400], noteTxt, 13, CW).length * 18 : 0;
  const rh0 = 30, table = { h: SUBH + 2 + m.segs.length * rh0 + noteH, flex: m.segs.length * 40, draw: (y, extra) => {
    const rh = rh0 + Math.floor(extra / m.segs.length), ty = y + SUBH - 24, bh = Math.max(12, Math.min(28, Math.round(rh * 0.4)));
    const ink = (s, w, h, x, yy) => box(`left:${x}px;top:${yy}px;width:${w}px;height:${h}px;box-sizing:border-box;border:1px solid ${s.c.id === m.action.id ? 'var(--quiet)' : 'var(--hair)'};${s.c.id === m.action.id ? `background-color:var(--ground);${hatch(ctx)}` : `background:${s.c.hex};`}`);
    const right = (x, yy, s, style = '') => at(x - 120, yy, A(s), { cls: 'sg-m', w: 120, style: `text-align:right;${style}` });
    // the column heads are words, set in the sans; the figures under them are mono
    const headR = (x, s) => at(x - 150, y + 9, s, { cls: 'sg-n', w: 150, style: 'text-align:right;color:var(--quiet)' });
    let h = sub(X0, y, CW) + at(X0 + 22, y + 9, 'Colour', { cls: 'sg-n', style: 'color:var(--quiet)' }) + headR(cols.share, 'Share') + headR(cols.a4, `A4 ${fig(`${W} px`)}`) + headR(cols.slide, `Slide ${fig(`${SLIDE} px`)}`);
    m.segs.forEach((s, i) => {
      const yy = ty + 24 + i * rh, pw = P.segs[i].w;
      h += hl(X0, yy, CW) + ink(s, 12, 12, X0, yy + Math.round((rh - 12) / 2))
        + ink(s, Math.max(4, Math.round(BW * ((s.c.share ?? 0) / maxShare))), bh, BX, yy + Math.round((rh - bh) / 2))
        + at(cols.name, yy + (rh - 18) / 2, A(s.c.name), { cls: 'sg-h', style: 'font-weight:400' })
        + right(cols.share, yy + (rh - 16) / 2, fmtShare(s.c.share ?? 0)) + right(cols.a4, yy + (rh - 16) / 2, `${pw} px`) + right(cols.slide, yy + (rh - 16) / 2, `${s.w} px`);
    });
    h += hl(X0, ty + 24 + m.segs.length * rh, CW);
    return h + (noteTxt ? at(X0, ty + 24 + m.segs.length * rh + 10, noteHtml, { cls: 'sg-n', w: CW, style: 'color:var(--quiet)' }) : '');
  } };

  // the slot edition has no mark, so the rules that describe the brand's own mark are left out of it
  const markRules = copyRaw(ctx, 'markRules', []);
  const rules = ((B.guideB && B.guideB.rules) || []).filter((_, i) => !(ctx.edition === 'slot' && markRules.includes(i))).map((r) => (typeof r === 'string' ? { title: '', text: r } : { title: r.title || '', text: r.text || '' }));
  const rw = CW, rm = rules.map((r) => { const tl = r.title ? 22 : 0, pl = para(0, 0, rw, r.text, { size: 15, lh: 22 }); return { ...r, tl, pl, h: 18 + tl + pl.h + 14 }; });
  const rulesSec = rm.length ? { h: SUBH + sum(rm.map((r) => r.h)), flex: rm.length * 16, draw: (y, extra) => {
    let yy = y + SUBH, h = sub(X0, y, CW, `Rules for ${B.name}`);
    rm.forEach((r, i) => {
      const rh = r.h + Math.floor(extra / rm.length);
      h += hl(X0, yy, CW);
      if (r.title) h += at(X0, yy + 16, A(r.title), { cls: 'sg-b', style: 'font-weight:500' });
      h += para(X0, yy + 16 + r.tl, rw, r.text, { size: 15, lh: 22, style: r.title ? 'color:var(--ink)' : '' }).html;
      yy += rh;
    });
    return h + hl(X0, yy, CW);
  } } : null;

  return shell(ctx, 'ruler', { body: t.html + flow('ruler', t.top, [intro, table, rulesSec].filter(Boolean)) });
}

// ---------------------------------------------------------------- type
function typePage(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono, S = B.type.sample || {};
  const ladder = typeLadder(ctx), st = (d.stretch || 100) / 100;
  const t = title(ctx, 'type', copyOf(ctx, 'type', [`${d.family} sets the display, ${b.family} sets the words.`, 'Two faces on one scale.']), CW);
  // each display-face step sets a different line of the brand's; the label is the button's own word, so no sentence is set twice
  const dispLines = [...new Set([S.headline, B.lines.primary, ...(B.lines.others || []), ...((B.applications && B.applications.social) || [])].filter(Boolean))];
  const dispSteps = ladder.filter((t) => t.face === 'display').map((t) => t.token), verbs = copyRaw(ctx, 'verbs', {});
  const textOf = (tk) => {
    if (tk.face === 'display') return dispLines[Math.min(dispSteps.indexOf(tk.token), dispLines.length - 1)];
    if (tk.token === 'body') return S.paragraph || S.headline || B.lines.primary;
    if (tk.token === 'label') return verbs.primary || usageFacts(ctx).button.primary;
    return S.caption || S.headline || B.lines.primary;
  };
  // a specimen is whole sentences, never a run of words cut short: the step's own line, else its sentences one at a time, else another of the brand's lines
  const sentences = (t) => (t.match(/[^.!?]+[.!?]+(?=\s|$)/g) || [t]).map((x) => x.trim());
  const pool = [...new Set([S.headline, B.lines.primary, ...(B.lines.others || []), ...((B.applications && B.applications.social) || [])].filter(Boolean))];
  const used = new Set(), specimens = copyRaw(ctx, 'typeSpecimens', {});
  const fit = (tk) => {
    const isD = tk.face === 'display', w = isD ? dispWeight(ctx, tk.weight) : tk.weight, stem = faceStem(ctx, isD ? 'display' : 'body', w);
    const text = textOf(tk), maxLines = tk.size >= 60 ? 2 : 2;
    const sets = (s) => wrap(stem, s, tk.size, CW / (isD ? st : 1), isD ? -0.01 : 0).length;
    // the brand's own sentence for the step, where it gives one (each is spent on this step alone), then the step's usual text
    const own = specimens[tk.token] || [];
    const cands = [...own, text, ...sentences(text), ...(isD ? pool.flatMap((l) => [l, ...sentences(l)]) : [])];
    // a display step sets on one line where it can; a text step sets the brand's whole sample (its own sentence, else the sample's full text) in up to three lines, never one sentence of it
    const first = isD ? cands.find((c) => sets(c) <= 1) ?? cands.find((c) => sets(c) <= maxLines) : cands.find((c) => sets(c) <= 3);
    // no sentence is set twice when another whole one sets in no more lines
    const pick = (first !== undefined && used.has(first) ? cands.find((c) => !used.has(c) && sets(c) <= sets(first)) : undefined) ?? first;
    used.add(pick);
    if (pick === undefined) throw new Error(`Swiss Field guide: no whole sentence sets the ${tk.name} step in ${maxLines} lines`);
    return { text: pick, lines: sets(pick), w, isD };
  };
  const rows = ladder.map((tk) => { const f = fit(tk); return { tk, f, h: 26 + f.lines * tk.line + 10 }; });
  // every step names the face and the weight it is set in, right-aligned in the last column (the display face with its width axis where it has one)
  const rowFace = (r) => `${r.f.isD ? dispFace(d) : r.tk.family}, ${weightName(r.f.w)}`;
  rows.forEach((r) => { const face = rowFace(r); if (textWidth(CHROME[400], face, 13) > COLW) throw new Error(`Swiss Field guide: type face line "${face}" is too wide`); });
  const ladderSec = { h: SUBH + sum(rows.map((r) => r.h)), flex: rows.length * 12, draw: (y, extra) => {
    let yy = y + SUBH, h = sub(X0, y, CW, 'Type scale', 'px · rem');
    rows.forEach((r) => {
      const rh = r.h + Math.floor(extra / rows.length), tk = r.tk;
      h += hl(X0, yy, CW) + at(X0, yy + 6, A(tk.name), { cls: 'sg-h' }) + mono(X0 + 96, yy + 7, `${tk.size} / ${tk.line} px · ${tk.rem}`) + at(COL[2], yy + 6, A(rowFace(r)), { cls: 'sg-n', w: COLW, style: 'color:var(--quiet);text-align:right' });
      const fam = r.f.isD ? 'var(--display)' : 'var(--body)';
      h += at(X0, yy + 26, A(r.f.text), { w: CW, style: `font:${r.f.w} ${tk.size}px/${tk.line}px ${fam};${r.f.isD ? `font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;` : ''}${r.f.lines === 1 ? 'white-space:nowrap;' : 'text-wrap:balance;'}` });
      yy += rh;
    });
    return h + hl(X0, yy, CW);
  } };
  const faces = [
    { fam: 'var(--display)', name: dispFace(d), role: `Display, ${dispNames(ctx)}`, w: dispWeights(ctx)[0], extra: `font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;` },
    { fam: 'var(--body)', name: b.family, role: `Text, ${weightName(ctx.weights.regular)}`, w: ctx.weights.regular, extra: '' },
    ...(mo ? [{ fam: 'var(--bmono)', name: mo.family, role: 'Mono, Regular', w: 400, extra: '' }] : []),
  ];
  const glyphs = ['ABCDEFGHIJKLM', 'abcdefghijklm', '0123456789 &?!'];
  const facesSec = { h: SUBH + 20 + 104 + glyphs.length * 20 + 4, draw: (y) => {
    let h = sub(X0, y, CW, 'Faces');
    faces.forEach((f, i) => {
      const x = COL[i], fy = y + SUBH + 20;
      h += at(x, fy, 'Aa', { style: `font:${f.w} 48px/48px ${f.fam};${f.extra}` })
        + at(x, fy + 58, A(f.name), { cls: 'sg-h' }) + at(x, fy + 76, A(f.role), { cls: 'sg-n', style: 'color:var(--quiet)' })
        + glyphs.map((gl, j) => at(x, fy + 104 + j * 20, A(gl), { w: COLW, style: `font:${f.w} 14px/20px ${f.fam};white-space:nowrap;${f.fam === 'var(--display)' ? `font-stretch:${d.stretch || 100}%;` : ''}` })).join('');
    });
    return h;
  } };
  return shell(ctx, 'type', { body: t.html + flow('type', t.top, [ladderSec, facesSec], { gap: 20 }) });
}

// ---------------------------------------------------------------- contrast
function contrastPage(ctx) {
  const F = contrastFacts(ctx), pairs = F.pairs, d = ctx.brand.fonts.display;
  const t = title(ctx, 'contrast', copyOf(ctx, 'contrast', [`${cap1(spell(pairs.length))} pairs set the text, each with its ratio.`, 'Every pair, with its ratio.']), CW);
  const AX = 424, AW = 240, xr = (v) => AX + (Math.min(v, 21) / 21) * AW, labW = 284;
  // a use the brand's own rules forbid for the pair (Signal as a poster's ground) is cut to the use they allow
  const pairUse = copyRaw(ctx, 'pairUse', {});
  const rows = pairs.map((p) => {
    const u0 = pairUse[p.use] || p.use;
    const use = p.minSize && !new RegExp(`${p.minSize}\\s*px`).test(u0) ? `${u0.replace(/\.$/, '')}, ${p.minSize} px and up` : u0;
    const lines = wrap(CHROME[400], use, 13, labW).length;
    return { p, use, lines, h: Math.max(48, 10 + 18 + lines * 18 + 4) };
  });
  const pairsSec = { h: SUBH + 24 + sum(rows.map((r) => r.h)), flex: rows.length * 18, draw: (y, extra) => {
    const hh = rows.map((r) => r.h + Math.floor(extra / rows.length)), total = sum(hh), top = y + SUBH + 24;
    let h = sub(X0, y, CW, 'Pairs in use');
    for (const v of [4.5, 7, 21]) h += vl(xr(v), top - 6, total + 6, 'var(--hair)') + at(xr(v) - 14, y + 8, String(v), { cls: 'sg-s', w: 28, style: 'text-align:center;color:var(--quiet)' });
    let yy = top;
    rows.forEach((r, i) => {
      const p = r.p, rh = hh[i], ch = Math.min(rh - 16, 44), cy = yy + (rh - ch) / 2, ss = p.sample;
      const isD = ss.face === 'display', size = Math.min(28, ss.size);
      h += hl(X0, yy, CW)
        + box(`left:${X0}px;top:${cy}px;width:72px;height:${ch}px;background:${p.bgHex};color:${p.fgHex};box-sizing:border-box;border:1px solid var(--hair);display:flex;align-items:center;justify-content:center;font:${ss.weight} ${size}px/1 ${isD ? 'var(--display)' : 'var(--body)'};${isD ? `font-stretch:${d.stretch || 100}%;` : ''}`, 'Aa')
        + at(132, yy + 9, A(p.label), { cls: 'sg-h' }) + at(132, yy + 27, A(r.use), { cls: 'sg-n', w: labW, style: 'color:var(--quiet)' })
        + box(`left:${AX}px;top:${yy + rh / 2 - 3}px;width:${r1((Math.min(p.ratio, 21) / 21) * AW)}px;height:6px;background:var(--ink)`)
        + mono(676, yy + rh / 2 - 17, `${p.ratioText}:1`, { w: 70 }) + at(676, yy + rh / 2 + 1, A(p.grade), { cls: 'sg-n', w: 70, style: 'color:var(--quiet)' });
      yy += rh;
    });
    return h + hl(X0, yy);
  } };
  // the tones: two to a row, name, hex and role
  // every colour the guide itself draws that is not on the palette is named here: the pairs' tones, then the quiet text, hairline, disabled pair and hover the pages use
  // (the engine lists them, so style-guide.md carries the same tones; a tone the brand names keeps the brand's own name)
  const brandTone = (hex) => (ctx.brand.tones || []).find((o) => o.hex.toLowerCase() === hex.toLowerCase());
  const tones = [...F.tones, ...F.interfaceTones].map((tn) => ({ ...tn, name: (brandTone(tn.hex) || {}).name || tn.name }));
  hook(ctx, { tones: tones.map((tn) => ({ name: tn.name, hex: tn.hex.toUpperCase(), use: cap1(tn.role) })) });
  const tCols = tones.length <= 3 ? 1 : 2, TW = Math.floor((CW - 25 * (tCols - 1)) / tCols), tRows = Math.ceil(tones.length / tCols);
  const tonesSec = tones.length ? { h: SUBH + tRows * 30 + 4, draw: (y) => sub(X0, y, CW, 'Tones', 'Tones the interface uses that are not on the palette') + tones.map((tn, i) => {
    const x = X0 + (i % tCols) * (TW + 25), yy = y + SUBH + 4 + Math.floor(i / tCols) * 30, role = cap1(tn.role);
    // the hex follows the name's own width; the role is left out when it is the name again
    const hx = tn.hex.replace('#', '').toUpperCase();
    const hexX = x + 22 + Math.ceil(textWidth(CHROME[400], tn.name, 13)) + 12, roleX = hexX + Math.ceil(textWidth(MONO, hx, 12)) + 16;
    return hl(x, yy, TW) + box(`left:${x}px;top:${yy + 9}px;width:12px;height:12px;background:${tn.hex};box-sizing:border-box;border:1px solid var(--hair)`)
      + at(x + 22, yy + 6, A(tn.name), { cls: 'sg-h', style: 'font-weight:400' }) + mono(hexX, yy + 7, hx)
      + (role.toLowerCase() !== tn.name.toLowerCase() && textWidth(CHROME[400], role, 13) <= x + TW - roleX ? at(roleX, yy + 6, A(role), { cls: 'sg-n', style: 'color:var(--quiet);white-space:nowrap' }) : '');
  }).join('') } : null;
  // the pairs that fail, drawn: the ground of the pair as a chip, the colour that would be the type as a bar across it, the ratio beside it. No text sits in a chip, so none is read as text
  // contrast is the same either way round, so each failing pair is drawn and counted once
  const seen = new Set(), bad = ctx.unusedPairs.filter((p) => { const k = [p.fgHex, p.bgHex].map((x) => x.toLowerCase()).sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; }), bName = (p) => `${ctx.byId[p.fg].name} on ${ctx.byId[p.bg].name}`;
  // each cell is as wide as the widest pair name under its chip, so the names say which pair to avoid
  const cellW = Math.max(120, ...bad.map((p) => Math.ceil(textWidth(CHROME[400], bName(p), 13)))) + 16, perRow = Math.max(1, Math.floor((CW + 16) / cellW)), bRows = Math.ceil(bad.length / perRow);
  const failSec = bad.length ? { h: SUBH + 16 + bRows * 62 - 14, draw: (y) => sub(X0, y, CW, 'Pairs that fail') + bad.map((p, i) => {
    const x = X0 + (i % perRow) * cellW, yy = y + SUBH + 16 + Math.floor(i / perRow) * 62;
    return box(`left:${x}px;top:${yy}px;width:56px;height:28px;background:${p.bgHex};box-sizing:border-box;border:1px solid var(--hair)`, box(`left:10px;top:11px;width:34px;height:4px;background:${p.fgHex}`))
      + mono(x + 64, yy + 6, `${p.ratioText}:1`, { size: 11 }) + at(x, yy + 34, A(bName(p)), { cls: 'sg-n', style: 'color:var(--quiet);white-space:nowrap' });
  }).join('') } : null;
  const np = para(0, 0, CW, GRADE_NOTE);
  const notesSec = { h: np.h + 2, draw: (y) => para(X0, y, CW, GRADE_NOTE, { style: 'color:var(--quiet)' }).html };
  return shell(ctx, 'contrast', { body: t.html + flow('contrast', t.top, [pairsSec, tonesSec, failSec, notesSec].filter(Boolean), { gap: 16 }) });
}

// ---------------------------------------------------------------- tokens
function tokensPage(ctx) {
  const T = tokenGroups(ctx), space = T.space;
  const t = title(ctx, 'tokens', copyOf(ctx, 'tokens', [`${cap1(spell(space.length))} steps of space, then radii and borders.`, 'Space, radii and borders.']), CW);
  const useW = COLW - 4;
  const srows = space.map((s) => { const lines = s.use ? wrap(CHROME[400], s.use, 13, useW).length : 0; return { s, lines, h: Math.max(40, 12 + 18 + lines * 18 + 8) }; });
  const maxSp = Math.max(1, ...space.map((s) => s.px)), sk = Math.max(1, Math.min(6, Math.floor((XR - COL[1]) / maxSp)));
  const spaceSec = { h: SUBH + sum(srows.map((r) => r.h)), draw: (y) => {
    let yy = y + SUBH, h = sub(X0, y, CW, 'Space', sk > 1 ? { html: `bars drawn at ${fig(`${sk}×`)} the step` } : 'bars at the step');
    srows.forEach((r) => {
      const rh = r.h;
      h += hl(X0, yy, CW) + mono(X0, yy + 11, r.s.token) + mono(X0 + 110, yy + 11, `${r.s.px} px`, { w: 80 }) + (r.s.use ? at(X0, yy + 30, A(r.s.use), { cls: 'sg-n', w: useW, style: 'color:var(--quiet)' }) : '')
        + box(`left:${COL[1]}px;top:${yy + 12}px;width:${r.s.px * sk}px;height:12px;background:var(--ink)`);
      yy += rh;
    });
    return h + hl(X0, yy);
  } };
  // the corners are drawn at the largest whole multiple (up to 4) that leaves the biggest one a true corner, so 6 px and 10 px are told apart; the section says the scale
  const radii = T.radii, sq0 = 88, maxR = Math.max(...radii.filter((r) => r.px < 999).map((r) => r.px), 1), scale = Math.max(1, Math.min(4, Math.floor((sq0 / 2) / maxR)));
  const radiiSec = { h: SUBH + 16 + sq0, flex: 16, draw: (y, extra) => sub(X0, y, CW, 'Radius', scale > 1 ? { html: `corners drawn at ${fig(`${scale}×`)}` } : '') + radii.map((r, i) => {
    const sq = sq0 + extra, x = COL[i % 3], rad = Math.min(r.px * scale, sq / 2);
    return box(`left:${x}px;top:${y + SUBH + 16}px;width:${sq}px;height:${sq}px;border:1px solid var(--ink);border-radius:${rad}px;box-sizing:border-box`)
      + (r.px >= 999 ? at(x + sq + 16, y + SUBH + 15, 'Round', { cls: 'sg-n', w: COLW - sq - 16 }) : mono(x + sq + 16, y + SUBH + 16, `${r.px} px`, { w: COLW - sq - 16 }))
      + at(x + sq + 16, y + SUBH + 36, r.tokens.map((tk) => `<div class="sg-s">${A(tk)}</div>`).join(''), { w: COLW - sq - 16, style: 'color:var(--quiet)' });
  }).join('') };
  // the brand gives a focus colour and one control border, no width of its own for the ring: the ring is drawn at the control border's width, as the row says
  const ctl0 = ctx.borders.find((b) => b.token === 'border-control');
  const bord = [...T.borders.map((b) => ({ ...b, tokens: b.tokens.filter((tk) => tk !== 'border-focus') })).filter((b) => b.tokens.length), { tokens: ['Focus ring'], px: ctl0.px, focus: true }], fc = ctx.roles.light.focus, fcName = (ctx.colours.find((c) => c.hex.toLowerCase() === fc.toLowerCase()) || {}).name || '';
  // each border is drawn in the colour it takes in use: the focus ring in the focus colour, a control edge in the border colour, a hairline in the divider
  const L = ctx.roles.light, bordCol = (b) => (b.focus ? L.focus : b.tokens.includes('border-control') ? L.border : L.divider);
  const bordUseW = CW - (COL[1] - X0) - 256, bordText = (b) => [...(b.uses || []).map(A), ...(b.focus ? [`${fcName ? `${A(fcName)} ` : ''}${fig(fc.replace('#', '').toUpperCase())} at ${fig('border-control')}`] : [])].join(', ');
  const bordPlain = (b) => [...(b.uses || []), ...(b.focus ? [`${fcName ? `${fcName} ` : ''}${fc.replace('#', '').toUpperCase()} at border-control`] : [])].join(', ');
  const bordH = bord.map((b) => Math.max(40, 10 + wrap(CHROME[400], bordPlain(b), 13, bordUseW).length * 18 + 8, 7 + b.tokens.length * 16 + 9));
  const bordY = bordH.map((_, i) => sum(bordH.slice(0, i)));
  const bordSec = { h: SUBH + sum(bordH) + 4, draw: (y) => sub(X0, y, CW, 'Borders', 'drawn at their real width and colour') + bord.map((b, i) => {
    const yy = y + SUBH + 4 + bordY[i];
    return hl(X0, yy, CW) + at(X0, yy + 7, b.tokens.map((tk) => `<div class="sg-s">${A(tk)}</div>`).join(''), { style: 'color:var(--ink)' }) + mono(X0 + 150, yy + 11, `${b.px} px`, { w: 60 }) + box(`left:${COL[1]}px;top:${yy + 20 - b.px / 2}px;width:240px;height:${b.px}px;background:${bordCol(b)}`)
      + at(COL[1] + 256, yy + 10, bordText(b), { cls: 'sg-n', w: bordUseW, style: 'color:var(--quiet)' });
  }).join('') };
  hook(ctx, { borders: bord.map((b) => (b.focus ? ['Focus ring', `${fcName ? `${fcName} ` : ''}\`#${fc.replace('#', '').toUpperCase()}\` at \`border-control\` ${b.px} px`] : [b.tokens.map((tk) => `\`${tk}\``).join(', '), `${b.px} px`])) });
  // elevation: the brand's own sentence, with an edge drawn as it says, in the text colour at the control border's width
  const elev = (ctx.brand.ui || {}).elevationNote, ctl = ctx.borders.find((b) => b.token === 'border-control'), mm = model(ctx);
  const ep = elev ? para(0, 0, COL[2] - X0 - 32, elev, { size: 15, lh: 22 }) : null, EHt = ep ? Math.max(ep.h, 76) : 0;
  // the sample is a card as the Usage page builds it, edge in the text colour at the control border's width, lying on the panel colour
  const cdk = usageFacts(ctx).card;
  const elevSec = ep ? { h: SUBH + 16 + EHt, draw: (y) => sub(X0, y, CW, 'Elevation', 'edges, not shadows') + para(X0, y + SUBH + 16, COL[2] - X0 - 32, elev, { size: 15, lh: 22 }).html
    + box(`left:${COL[2]}px;top:${y + SUBH + 16}px;width:${COLW}px;height:${EHt}px;box-sizing:border-box;background:${cdk.fill};border:${ctl ? ctl.px : 1.5}px solid ${mm.text.hex};border-radius:${cdk.radius.px}px;padding:0 14px;display:flex;align-items:center`, `<span class="sg-n" style="color:var(--ink)">Card</span>`) } : null;
  return shell(ctx, 'tokens', { body: t.html + flow('tokens', t.top, [spaceSec, radiiSec, bordSec, elevSec].filter(Boolean), { maxGap: 72 }) });
}

// ---------------------------------------------------------------- usage
function usagePage(ctx) {
  const B = ctx.brand, m = model(ctx), U = usageFacts(ctx), bt = buttonOf(ctx), cd = U.card, lk = U.link, d = B.fonts.display, L = ctx.roles.light;
  const t = title(ctx, 'usage', copyOf(ctx, 'usage', ['The button, the link and the card, built from the tokens.', 'Built from the tokens.']), CW);
  const fam = (tk) => (tk.face === 'display' ? 'var(--display)' : 'var(--body)');
  const famX = (tk) => (tk.face === 'display' ? `font-stretch:${d.stretch || 100}%;` : '');
  const font = (tk) => `font:${tk.weight} ${tk.size}px/${tk.line}px ${fam(tk)};${famX(tk)}`;
  // a spec row is a key and a value; a value is a list of parts, words in sans and {m} figures (px, size / line, rem) in mono
  const SPEC_K = 58, SPEC_W = COL[1] - X0 - 24 - SPEC_K;
  const partsW = (v) => sum(v.map((p) => (typeof p === 'string' ? textWidth(CHROME[400], p, 13) : textWidth(MONO, p.m, 12))));
  const specRows = (lines, sw = SPEC_W) => { let yy = 0; return lines.map(([k, v]) => { const r = { k, v, y: yy, n: Math.ceil((partsW(v) * 1.08) / sw) || 1 }; yy += 20 + (r.n - 1) * 18; return r; }); };
  const specH = (lines, sw = SPEC_W) => { const r = specRows(lines, sw), l = r[r.length - 1]; return l.y + 20 + (l.n - 1) * 18; };
  const spec = (x, y, lines, sw = SPEC_W) => specRows(lines, sw).map((r) => at(x, y + r.y, A(r.k), { cls: 'sg-n', style: 'color:var(--quiet)' })
    + at(x + SPEC_K, y + r.y, r.v.map((p) => (typeof p === 'string' ? A(p) : fig(p.m))).join(''), { cls: 'sg-n', w: sw })).join('');
  // the brand's own button words: the call to action its data names (the data's generic ones are not on the page)
  const V = copyRaw(ctx, 'verbs', {}), vPrimary = V.primary || bt.primary;

  // button: the filled one, at its real size (no secondary button or link is drawn: the data names one call to action and no words for another)
  const padY = bt.padY.px, padX = bt.padX.px, bh = padY * 2 + bt.type.line;
  const btnW = (s) => Math.ceil(textWidth(faceStem(ctx, bt.type.face, bt.type.weight), s, bt.type.size) * (bt.type.face === 'display' ? (d.stretch || 100) / 100 : 1)) + 2 * padX;
  const bspec = [['Fill', [bt.fillName]], ['Label', [bt.labelName]], ['Radius', [{ m: `${bt.radius.token},` }, ' ', { m: `${bt.radius.px} px` }]], ['Type', [{ m: `${bt.type.name}, ${bt.type.size} / ${bt.type.line}` }]], ['Padding', [{ m: `${bt.padY.token} by ${bt.padX.token}` }]]];
  const bstyle = `display:flex;align-items:center;justify-content:center;height:${bh}px;box-sizing:border-box;border-radius:${bt.radius.px}px;${font(bt.type)}white-space:nowrap`;
  const w1 = btnW(vPrimary);
  // the spec in two columns, the button in the third
  const bsw = COLW - SPEC_K - 8, bA = bspec.slice(0, 3), bB = bspec.slice(3);
  const buttonSec = { h: SUBH + 16 + Math.max(specH(bA, bsw), specH(bB, bsw), bh), draw: (y) => {
    const by = y + SUBH + 16;
    return sub(X0, y, CW, 'Button') + spec(X0, by, bA, bsw) + spec(COL[1], by, bB, bsw)
      + box(`left:${COL[2]}px;top:${by}px;width:${w1}px;background:${bt.fill};color:${bt.label};${bstyle}`, A(vPrimary));
  } };

  // the primary button in its four states: the hover fill from the Contrast page, the focus ring from Tokens, the disabled pair
  const states = [['Rest', `background:${bt.fill};color:${bt.label}`], ['Hover', `background:${L.actionHover};color:${bt.label}`], ...(L.actionPressed ? [['Pressed', `background:${L.actionPressed};color:${bt.label}`]] : []), ['Focus', `background:${bt.fill};color:${bt.label};outline:${bt.border ? bt.border.px : 1.5}px solid ${L.focus};outline-offset:2px`], ['Disabled', `background:${L.disabledBg};color:${L.disabledText}`]];
  // four across when they fit, two by two when the brand's own button word is too long for that
  const nSt = states.length, perRow = Math.floor((CW - nSt * w1) / (nSt - 1)) >= 12 ? nSt : Math.ceil(nSt / 2), stGap = Math.min(40, Math.floor((CW - perRow * w1) / (perRow - 1))), stRows = Math.ceil(nSt / perRow), stRowH = bh + 8 + 16 + 14;
  const statesSec = { h: SUBH + 16 + stRows * stRowH - 16, draw: (y) => sub(X0, y, CW, 'States', 'the primary button') + states.map(([n, css], i) => {
    const x = X0 + (i % perRow) * (w1 + stGap), by = y + SUBH + 16 + Math.floor(i / perRow) * stRowH;
    return box(`left:${x}px;top:${by}px;width:${w1}px;${css};${bstyle}`, A(vPrimary)) + at(x, by + bh + 8, A(n), { cls: 'sg-n', style: 'color:var(--quiet)' });
  }).join('') };

  // link
  const lkCol = ctx.colours.find((c) => c.role === 'link') || m.text, lspec = [['Type', [{ m: `${lk.type.name}, ${lk.type.size} / ${lk.type.line}` }]], ['Colour', [lkCol.name]], ['Line', lk.border ? [{ m: `${lk.border.token},` }, ' ', { m: `${lk.border.px} px` }] : ['none']]];

  hook(ctx, { usage: {
    button: `${bt.fillName} fill, ${bt.labelName} label, \`${bt.radius.token}\` ${bt.radius.px} px, ${bt.type.name} ${bt.type.size}/${bt.type.line} px at ${bt.type.weight}, \`${bt.padY.token}\` over and \`${bt.padX.token}\` across`,
    link: `${lk.type.name} ${lk.type.size}/${lk.type.line} px at ${lk.type.weight}, ${lkCol.name}, underlined at \`${lk.border.token}\` ${lk.border.px} px`,
  } });
  // card: the same card the panel below sets, as a spec (the markdown lists the same row)
  const cspec = [['Fill', [cd.fillName]], ['Edge', [{ m: `${cd.edge.token},` }, ' ', { m: `${cd.edge.px} px` }, ` ${cd.edgeName}`]], ['Radius', [{ m: `${cd.radius.token},` }, ' ', { m: `${cd.radius.px} px` }]], ['Padding', [{ m: cd.pad.token }]], ['Title', [{ m: `${cd.title.name}, ${cd.title.size} / ${cd.title.line}` }]], ['Text', [{ m: `${cd.body.name}, ${cd.body.size} / ${cd.body.line}` }]]];
  // the link in the first column and the card's spec across the other two (the card itself is the one in use below); both specs are set at the column's own width
  const sw1 = COLW - SPEC_K - 8, cA = cspec.slice(0, 3), cB = cspec.slice(3);
  // the link drawn under its spec: the brand's own link word, in the link colour, underlined at the control border's width
  const lkY = specH(lspec, sw1) + 12, lcH = Math.max(lkY + lk.type.line, specH(cA, sw1), specH(cB, sw1));
  const linkCardSec = { h: SUBH + 16 + lcH, draw: (y) => { const py = y + SUBH + 16; return sub(X0, y, COLW, 'Link') + spec(X0, py, lspec, sw1)
    + at(X0, py + lkY, A(lk.text), { style: `${font(lk.type)}color:${lkCol.hex};text-decoration:underline;text-decoration-thickness:${lk.border ? lk.border.px : 1.5}px;text-underline-offset:3px;white-space:nowrap` })
    + sub(COL[1], y, XR - COL[1], 'Card', 'the one in use below') + spec(COL[1], py, cA, sw1) + spec(COL[2], py, cB, sw1); } };

  // in use: the ground leads, as on every page the brand makes. The logo, the brand's line and a card of its own on it, and the action colour on the one button
  const act = m.action, cardW = 340, pad = cd.pad.px;
  const titleStem = faceStem(ctx, cd.title.face, cd.title.weight), bodyStem = faceStem(ctx, cd.body.face, cd.body.weight);
  // the card's edge is the elevation rule's own: the text colour at the control border's width (the Tokens page draws the same)
  const ctlB = ctx.borders.find((b) => b.token === 'border-control'), edgePx = ctlB ? ctlB.px : 1.5, edgeCss = `${edgePx}px solid ${m.text.hex}`;
  const tx = cardW - 2 * pad - 2 * edgePx;
  const tsz = cd.title.face === 'display' ? (d.stretch || 100) / 100 : 1;
  // the card's own words: the brand's message to a customer, not the line the field already sets
  const em = (B.guideB && B.guideB.email) || {}, emBody = Array.isArray(em.body) ? em.body[em.body.length - 1] : em.body;
  // a brand may give the card words of its own, so it does not set the email the Applied page already shows
  const own0 = copyRaw(ctx, 'card', null), emp = own0 && own0.empty ? (B.ui.screen && B.ui.screen.content && B.ui.screen.content.empty) || null : null;
  // a brand's empty state (ui.screen.content.empty) is one piece: its title, its body and its call to action
  const own = emp ? { title: emp.title, body: emp.body, verb: emp.cta } : own0, cardTitle = (own && own.title) || em.subject || cd.titleText;
  // a leading sentence that only says again what the subject says is cut from the body
  const said = new Set((cardTitle.toLowerCase().match(/[a-z0-9:]+/g) || []));
  const restates = (s) => { const w = (s.toLowerCase().match(/[a-z0-9:]{4,}/g) || []).filter((x) => !['your', 'this', 'that', 'with', 'from'].includes(x)); return w.length > 0 && w.every((x) => said.has(x)); };
  // a brand may give the card no body at all (own.body === ''), where the data holds no sentence for it that the email does not already set
  let cardBody = own && typeof own.body === 'string' ? own.body : emBody || cd.bodyText;
  for (let f = firstSentence(cardBody); f.rest && restates(f.first); f = firstSentence(cardBody)) cardBody = f.rest;
  // the button is the next action for this message, so it carries the brand's own message verb
  const vMsg = (own && own.verb) || V.message || vPrimary, w3 = btnW(vMsg);
  const cardH = (txt) => 2 * pad + 2 * edgePx + wrap(titleStem, cardTitle, cd.title.size, tx / tsz).length * cd.title.line + (txt ? 12 + wrap(bodyStem, txt, cd.body.size, tx).length * cd.body.line : 0) + 16 + bh;
  const bodyTxt = emp || cardH(cardBody) <= 215 ? cardBody : firstSentence(cardBody).first;
  const cH = cardH(bodyTxt), pH0 = Math.max(cH + 44, 240);
  const G = ctx.logo.geos.colour, lgw = ctx.edition === 'slot' ? slotW(ctx, 150) : 150;
  // the panel's own line: the one the guide sets nowhere else (the brand's last line when it has no copy for it)
  const panelLine = copyRaw(ctx, 'panel', null) || (B.lines.others || []).slice(-1)[0] || B.lines.primary;
  // the largest size the line sets at in the room above the logo: a short line fills the column rather than leaving it empty
  const lineW = CW - 64 - cardW - 32, pStem = faceStem(ctx, 'display', ctx.weights.heading), pW = lineW / ((d.stretch || 100) / 100);
  const ds = [64, 56, 48, 42, 38, 34, 30, 26, 22].find((s) => panelLine.split(/\s+/).every((w) => textWidth(pStem, w, s, -0.01) <= pW) && wrap(pStem, panelLine, s, pW, -0.01).length <= 2 && wrap(pStem, panelLine, s, pW, -0.01).length * s * 1.05 <= pH0 - 64 - (lgw * G.h) / G.w - 24) || 22;
  const panelSec = { h: SUBH + 16 + pH0, flex: 60, draw: (y, extra) => {
    const ph = pH0 + extra, py = y + SUBH + 16;
    const inner = at(32, 32, logoArt(ctx, 'colour', lgw))
      + box(`left:32px;bottom:32px;width:${lineW}px;font-size:${ds}px;line-height:1.05;color:var(--ink)`, `<div class="disp" style="color:var(--ink)">${nbu(A(panelLine))}</div>`)
      + box(`left:${CW - 32 - cardW}px;bottom:32px;width:${cardW}px;height:${cH}px;background:${cd.fill};box-sizing:border-box;padding:${pad}px;border:${edgeCss};border-radius:${cd.radius.px}px;color:var(--ink)`,
        `<div style="${font(cd.title)}color:var(--ink);text-wrap:balance">${nbu(cardTitle)}</div>${bodyTxt ? `<div style="margin-top:12px;${font(cd.body)}color:var(--ink)">${nbu(bodyTxt)}</div>` : ''}`
        + `<div style="margin-top:16px;width:${w3}px;background:${bt.fill};color:${bt.label};${bstyle}">${A(vMsg)}</div>`);
    return sub(X0, y, CW, 'In use', `${m.ground.name} first, ${act.name} on the one action`) + box(`left:${X0}px;top:${py}px;width:${CW}px;height:${ph}px;background:var(--ground);box-sizing:border-box;border:1px solid var(--hair)`, inner);
  } };
  return shell(ctx, 'usage', { body: t.html + flow('usage', t.top, [buttonSec, statesSec, linkCardSec, panelSec], { gap: 14 }) });
}

// ---------------------------------------------------------------- applied
// The brand's own things in use: a photograph and the street poster for a brand that has them (the jacket, the bag), flat board, cover and email for one that has none.
// Every line is the brand's own (its signage, its lines, its card, its email); the colour lands where the ruler gives it its share.
function appliedPage(ctx) {
  const B = ctx.brand, m = model(ctx), act = m.action, slot = ctx.edition === 'slot', d = B.fonts.display, st = (d.stretch || 100) / 100, G = ctx.logo.geos.colour;
  const appliedTitles = copyOf(ctx, 'applied', ['The brand in use, on its own surfaces.', 'The brand in use.']);
  let t = title(ctx, 'applied', appliedTitles, CW, 3);
  const dispStem = faceStem(ctx, 'display', ctx.weights.heading);
  const disp = (size, line) => `font:${ctx.weights.heading} ${size}px/${line}px var(--display);font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;`;
  const lines = B.lines.others || [], app = B.applications;
  // the signage line is "<object>, <size>: <line>"
  const sg = /^(.+?), ([\d.]+ x [\d.]+ mm): (.+)$/.exec(app.signage || '') || [null, (app.signage || '').split(':')[0], '', (app.signage || '').split(':').slice(1).join(':').trim()];
  const sign = { object: sg[1], size: sg[2], line: sg[3] };
  const shots = (B.imagery.shots || []).filter((s) => s.photo), street = shots.find((s) => s.id === 'busstop'), ph = shots.filter((s) => s.id !== 'busstop').slice(0, 2);
  const photographed = !!street && ph.length === 2;
  const lh = (w) => (w * G.h) / G.w;
  const frame = (x, y, w, h, inner = '', style = '') => box(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;border:1px solid var(--hair);overflow:hidden;${style}`, inner);
  const brief = (x, y, w, h, text) => briefBox(x, y, w, h, text);
  const caption = (x, y, w, name, detail) => at(x, y, name.html ?? A(name), { cls: 'sg-h' }) + (detail ? at(x, y + 18, A(detail), { cls: 'sg-n', w, style: 'color:var(--quiet)' }) : '');
  const CAPH = 40;
  // the button as the Usage page draws it, at its real size
  const bt = buttonOf(ctx), V = copyRaw(ctx, 'verbs', {});
  const bh = bt.padY.px * 2 + bt.type.line;
  const btnStyle = (w) => `display:flex;align-items:center;justify-content:center;width:${w}px;height:${bh}px;box-sizing:border-box;border-radius:${bt.radius.px}px;font:${bt.type.weight} ${bt.type.size}px/${bt.type.line}px ${bt.type.face === 'display' ? 'var(--display)' : 'var(--body)'};${bt.type.face === 'display' ? `font-stretch:${d.stretch || 100}%;` : ''}white-space:nowrap;background:${bt.fill};color:${bt.label}`;
  const btnW = (s) => Math.ceil(textWidth(faceStem(ctx, bt.type.face, bt.type.weight), s, bt.type.size) * (bt.type.face === 'display' ? st : 1)) + 2 * bt.padX.px;

  const scene = (bw, bh2, url, zoom, fx, fy) => {
    const s = Math.max(bw / 1536, bh2 / 1024) * zoom, w = 1536 * s, h = 1024 * s, left = Math.min(0, Math.max(bw - w, bw / 2 - fx * w)), top = Math.min(0, Math.max(bh2 - h, bh2 / 2 - fy * h));
    return `<img src="${A(url)}" alt="${A(`${B.name} on site`)}" style="position:absolute;left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;display:block">`;
  };

  // the brand's own do and don't for its photographs (imagery.rules), one row each: the do at the left, the don't at the right
  const rulesSec = (() => {
    const rs = ((B.imagery && B.imagery.rules) || []).filter((r) => r.do && r.dont), RW = 305, DX = X0 + 349;
    if (!rs.length) return null;
    const rows = rs.map((r) => { const a = para(0, 0, RW, r.do), b = para(0, 0, RW, r.dont); return { r, h: Math.max(a.lines, b.lines) * 18 + 14 }; });
    return { h: SUBH + sum(rows.map((r) => r.h)), flex: rows.length * 24, draw: (y, extra = 0) => {
      let yy = y + SUBH, h = sub(X0, y, CW, 'Photograph rules');
      const add = Math.floor(extra / rows.length), pt = 7 + Math.floor(add / 2);
      rows.forEach(({ r, h: rh0 }) => {
        const rh = rh0 + add;
        h += hl(X0, yy, CW) + at(X0, yy + pt, 'Do', { cls: 'sg-n', style: 'color:var(--quiet)' }) + para(X0 + 44, yy + pt, RW, r.do).html
          + at(DX, yy + pt, 'Don’t', { cls: 'sg-n', style: 'color:var(--quiet)' }) + para(DX + 44, yy + pt, RW, r.dont).html;
        yy += rh;
      });
      return h + hl(X0, yy, CW);
    } };
  })();
  // a shot's brief as the data writes it: "<Name>: <what to shoot>" is a heading and a brief
  const briefOf = (s) => { const k = (s.slot || '').indexOf(':'); return k > 0 ? { name: s.slot.slice(0, k), text: cap1(s.slot.slice(k + 1).trim()) } : { name: 'Photograph', text: s.slot || '' }; };

  let secs;
  // the slot edition's photographs are the client's to supply: style-guide.md lists each brief as the brand's data writes it
  const supplyShots = (ids) => { if (slot) hookAdd(ctx, 'supply', ids.map((id) => (B.imagery.shots || []).find((o) => o.id === id)).filter((s) => s && s.slot).map((s) => ['Photograph', s.slot])); };
  if (photographed) {
    supplyShots(copyRaw(ctx, 'slotPhotos', []));
    // ---- the photographs, then the street poster in its shelter
    const PH0 = slot ? 160 : 190, wide = COL[2] - COL[0] - 32;
    const photos = copyRaw(ctx, 'photos', {}), photoPos = copyRaw(ctx, 'photoPos', {});
    // a shot the data marks as generated is said to be, in the section's note
    const generated = shots.some((s) => s.generated);
    // the slot edition holds no photograph: it shows the brief of a shot the brand commissions where the photograph goes, the brief's own name under it
    const slotShots = copyRaw(ctx, 'slotPhotos', []).map((id) => (B.imagery.shots || []).find((o) => o.id === id)).filter(Boolean).map(briefOf);
    const shotCap = (s, i, x, y, w) => (slot ? (slotShots[i] ? caption(x, y, w, slotShots[i].name, '') : '') : caption(x, y, w, s.caption, photos[s.id]));
    const shotBox = (s, i, x, y, w, h) => (slot ? brief(x, y, w, h, (slotShots[i] || {}).text || (B.imagery.direction || {}).crop || '') : box(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden`, ctx.photo(s.id, { pos: photoPos[s.id] || '50% 50%', style: 'width:100%;height:100%' })));
    const photosSec = { h: SUBH + 16 + PH0 + 12 + (slot ? 20 : CAPH), flex: slot ? 120 : 70, draw: (y, extra) => {
      const hh = PH0 + extra, py = y + SUBH + 16;
      // the slot edition shows every brief the brand commissions for its photographs, in equal columns; the showcase, its two photographs
      const cells = slot ? slotShots.map((s, i) => [ph[i % ph.length], i, COL[i % 3], COLW]) : [[ph[0], 0, COL[0], wide], [ph[1], 1, COL[2], COLW]];
      return sub(X0, y, CW, 'Photographs', slot ? 'photo briefs, for your own photographs' : generated ? 'generated images' : '')
        + cells.map(([s, i, x, w]) => shotBox(s, i, x, py, w, hh) + shotCap(s, i, x, py + hh + 12, w)).join('');
    } };

    // the street: the poster in its shelter, across the page. The type is the text colour and the band behind the first sentence is the text colour reversed; the action colour stays on the riders' own things
    const SH2 = slot ? 280 : 240, aw = 360, ah = Math.round(aw / ctx.sceneInfo('photo-busstop').quads[0].aspect);
    // the poster sets the line the data's signage gives it, not one written for the guide
    const fs = firstSentence(sign.line);
    // the first sentence sets on one line: the largest size that fits the poster's width
    const fsz = [40, 36, 32, 28, 24].find((s) => wrap(dispStem, fs.first, s, (aw - 56) / st, -0.01).length === 1) || 24, lineH = Math.round(fsz * 1.05);
    const lineCss = `padding:22px 28px;box-sizing:border-box;${disp(fsz, lineH)}`;
    // the slot frame is drawn smaller than it is set, so its width is chosen to leave the frame tall enough to hold its word at the size it shows
    const k0 = (SH2 - 2) / ah, posterLogoW = slot ? Math.max(180, Math.ceil(slotW(ctx, 0) / k0)) : 150, posterLogo = slot ? logoArt(ctx, 'colour', posterLogoW) : ctx.logo.html('colour', { width: 150 });
    // the field between the logo and the band holds the rider photograph (the slot edition, its brief)
    const restLines = fs.rest ? wrap(dispStem, fs.rest, fsz, (aw - 56) / st, -0.01).length : 0, bandH = lineH + 44 + (restLines ? restLines * lineH + 22 : 0);
    const fTop = 28 + Math.ceil((posterLogoW * G.h) / G.w) + 24, fBot = 40 + bandH + 24, fH = ah - fTop - fBot;
    const posterPhoto = fH >= 100 ? (slot ? briefBox(28, fTop, aw - 56, fH, (B.imagery.direction || {}).crop || ph[0].alt, 12)
      : box(`left:28px;top:${fTop}px;width:${aw - 56}px;height:${fH}px;overflow:hidden`, ctx.photo(ph[0].id, { pos: photoPos[ph[0].id] || '50% 50%', style: 'width:100%;height:100%' }))) : '';
    const posterInner = `<div style="position:absolute;inset:0;background:var(--ground)">`
      + `<div style="position:absolute;left:28px;top:28px">${posterLogo}</div>` + posterPhoto
      + `<div style="position:absolute;left:0;right:0;bottom:40px"><div style="${lineCss}background:${m.text.hex};color:${m.label[m.text.id]}">${nbu(A(fs.first))}</div>${fs.rest ? `<div style="${lineCss}padding-bottom:0;color:${m.text.hex}">${nbu(A(fs.rest))}</div>` : ''}</div></div>`;
    const streetUrl = slot ? '' : ctx.mockup('photo-busstop', [{ html: ctx.artPage(posterInner, { w: aw, h: ah, css: guideCss() }), w: aw, h: ah }]);
    const signCap = { html: `${A(sign.object)}${sign.size ? `, <span style="font-weight:400">${sizeFig(sign.size)}</span>` : ''}` };
    const streetSec = slot
      // the poster flat at its own proportion, with the brief for the street it is set in beside it
      ? { h: SUBH + 16 + SH2, flex: 182, draw: (y, extra) => {
        const py = y + SUBH + 16, phh = SH2 + extra, k = (phh - 2) / ah, pw = Math.round(aw * k) + 2;
        const rows = [['Sign', sign.object], ['Size', sign.size && sizeFig(sign.size), true], ['Proportion', fig(`${(1185 / 1750).toFixed(2)} to 1`), true], ['Ground', m.ground.name], ['Type', m.text.name], ['Band', `${m.text.name}, type in ${m.ground.name}`]].filter((r) => r[1]);
        const rx = X0 + pw + 24;
        return sub(X0, y, CW, 'Poster', `${m.text.name} band behind the first sentence`)
          + frame(X0, py, pw, phh, box(`left:0;top:0;width:${aw}px;height:${ah}px;transform:scale(${k.toFixed(4)});transform-origin:0 0`, posterInner), 'background:var(--ground)')
          + rows.map((r, i) => at(rx, py + i * 20, r[0], { cls: 'sg-n', style: 'color:var(--quiet)' }) + at(rx + 100, py + i * 20, r[2] ? r[1] : A(r[1]), { cls: 'sg-n', w: CW - pw - 24 - 100 })).join('');
      } }
      : { h: SUBH + 16 + SH2 + 12 + CAPH, draw: (y) => {
        const py = y + SUBH + 16;
        return sub(X0, y, CW, 'On the street', `poster set into ${street.generated ? 'a generated photograph' : 'a photograph'}`)
          + box(`left:${X0}px;top:${py}px;width:${CW}px;height:${SH2}px;overflow:hidden`, scene(CW, SH2, streetUrl, 1, 0.76, 0.56))
          + caption(X0, py + SH2 + 12, CW, signCap, street.caption);
      } };
    secs = [photosSec, streetSec, rulesSec].filter(Boolean);
  } else {
    // ---- a brand with no photographs: the hoarding on its fence, then the quote cover and the install-day email, side by side. The ground leads on all three; the action colour is the one button
    const inkOnGround = m.text.hex, card = app.card || {}, url = app.site && app.site.url;
    const boardLine = sign.line || B.lines.primary;
    // the hoarding: drawn at the aspect of the scene's board, placed on the photograph of a fence
    // (HB is the section's height; where the page is full it is brought down, the slot's frame narrowing with it at the drawn aspect. Size and proportion rows show only when the stated size matches that aspect)
    const sceneAspect = ctx.sceneInfo('hoarding-site').quads[0].aspect, HH = 280, aw = Math.round(HH * sceneAspect);
    let FW = slot ? 380 : CW, HB = slot ? Math.round(((FW - 2) / aw) * HH) + 2 : 200;
    const setHB = (h) => { HB = h; if (slot) FW = Math.round(((h - 2) / HH) * aw) + 2; hoardSec.h = SUBH + 16 + HB; };
    const hoardInnerAt = (k) => { const lw = slot ? Math.max(210, Math.ceil(slotW(ctx, 0) / k)) : 210; return `<div style="position:absolute;inset:0;background:var(--ground)">`
      + `<div style="position:absolute;left:56px;top:50%;transform:translateY(-50%)">${slot ? logoArt(ctx, 'colour', lw) : ctx.logo.html('colour', { width: 210 })}</div>`
      + `<div style="position:absolute;left:${Math.max(360, 56 + lw + 40)}px;right:56px;top:50%;transform:translateY(-50%);${disp(52, 54)}color:${inkOnGround}">${nbu(boardLine)}</div></div>`; };
    const hoardInner = hoardInnerAt(1), hoardUrl = slot ? '' : ctx.mockup('hoarding-site', [{ html: ctx.artPage(hoardInner, { w: aw, h: HH, css: guideCss() }), w: aw, h: HH }]);
    // the slot edition holds no photograph to caption, so the flat artwork carries the sign's spec in rows
    const sz = /([\d.]+) x ([\d.]+) mm/.exec(sign.size || '');
    const szR = sz ? sz[1] / sz[2] : 0, drawnR = aw / HH, ratioOk = sz && Math.abs(szR - drawnR) / drawnR < 0.05;
    const hoardSpec = [['Sign', String(sign.object || '').trim().toLowerCase() === 'sign' ? '' : sign.object], ['Size', ratioOk && sizeFig(sign.size), true], ...(ratioOk ? [['Proportion', fig(`${(sz[1] / sz[2]).toFixed(2)} to 1`), true]] : []), ['Ground', m.ground.name], ['Type', m.text.name]].filter((r) => r[1]);
    const hoardSec = { h: SUBH + 16 + HB, draw: (y, more = 0) => {
      const py = y + SUBH + 16, HBd = HB + more;
      // slot: the artwork flat, at the board's drawn aspect, its spec in rows beside it; showcase: the same artwork placed in a mockup scene, and said to be
      return sub(X0, y, CW, 'Hoarding', slot ? `${m.ground.name} first` : { html: `${A(m.ground.name)} first, ${A(sign.object)}${sign.size ? `, ${sizeFig(sign.size)}` : ''}` })
        + (slot ? frame(X0, py, FW, HB, box(`left:0;top:0;width:${aw}px;height:${HH}px;transform:scale(${((FW - 2) / aw).toFixed(4)});transform-origin:0 0`, hoardInnerAt((FW - 2) / aw)), 'background:var(--ground)') : box(`left:${X0}px;top:${py}px;width:${CW}px;height:${HBd}px;overflow:hidden`, scene(CW, HBd, hoardUrl, 1, 0.5, 0.45)))
        + (slot ? hoardSpec.map(([k, v, raw], i) => at(X0 + FW + 24, py + i * 20, A(k), { cls: 'sg-n', style: 'color:var(--quiet)' }) + at(X0 + FW + 24 + 88, py + i * 20, raw ? v : A(v), { cls: 'sg-n', w: CW - FW - 24 - 88 })).join('') : '');
    } };

    // the photographs the brand commissions: the data holds the briefs and no files, so each is a dashed frame at its crop (both of these are wide), the shot's name under it
    const wanted = copyRaw(ctx, 'shotsShown', []);
    supplyShots(wanted);
    const briefs = wanted.map((id) => (B.imagery.shots || []).find((o) => o.id === id)).filter(Boolean).map(briefOf);
    // the briefs sit three to a row in the page's own columns, each dashed chip headed with the shot's name, its brief under it as the data writes it
    const BW = COLW, BPAD = 12, BTW = BW - 2 * BPAD - 2, bRows = Math.ceil(briefs.length / 3), BGAP = 12;
    const BFH = BPAD * 2 + 2 + 18 + 4 + Math.max(0, ...briefs.map((o) => para(0, 0, BTW, o.text).h));
    const shotsSec = { h: briefs.length ? SUBH + 16 + bRows * BFH + (bRows - 1) * BGAP : 0, draw: (y) => sub(X0, y, CW, 'Photographs', 'photo briefs, for your own photographs')
      + briefs.map((o, i) => {
        const py = y + SUBH + 16 + Math.floor(i / 3) * (BFH + BGAP), bx = COL[i % 3];
        return box(`left:${bx}px;top:${py}px;width:${BW}px;height:${BFH}px;box-sizing:border-box;border:1px dashed var(--quiet);padding:${BPAD}px;overflow:hidden`, `<div class="sg-h" style="color:var(--ink)">${A(o.name)}</div><div class="sg-n" style="margin-top:4px;color:var(--quiet)">${nbu(A(o.text))}</div>`);
      }).join('') };

    // the install-day email, across the page: the sender and time, the subject at display size, the greeting, the body and the one button (the next action for this message)
    const EX = X0, EW = CW;
    const em = (B.guideB && B.guideB.email) || {}, pad = 24, tw = EW - 2 * pad;
    const subject = em.subject || '', body = (Array.isArray(em.body) ? em.body.join(' ') : em.body) || '';
    const subjLines = wrap(dispStem, subject, 24, tw / st, -0.01).length;
    const gp = em.greeting ? para(0, 0, tw, em.greeting) : { h: -8 }, bp = para(0, 0, tw, body);
    // the email ends on the brand's own body: the data gives it no call to action, so none is drawn
    const EHn = pad + 38 + subjLines * 28 + 12 + gp.h + 8 + bp.h + pad;
    const EH = EHn;
    const pairSec = { h: SUBH + 16 + EH, flex: 64, draw: (y, more = 0) => {
      const py = y + SUBH + 16, ex = EX, ey = py, by = ey + pad + 38 + subjLines * 28 + 12;
      const mail = frame(ex, ey, EW, EH + more, '', 'background:var(--ground)')
        + at(ex + pad, ey + pad, `<span class="sg-h">${A(em.person || card.person || '')}</span> <span class="sg-n" style="color:var(--quiet)">${A(em.role || card.role || '')}</span>`)
        + at(ex + EW - pad - 200, ey + pad, A(em.time || ''), { cls: 'sg-n', w: 200, style: 'text-align:right;color:var(--quiet)' })
        + hl(ex + pad, ey + pad + 26, tw)
        + at(ex + pad, ey + pad + 38, nbu(A(subject)), { w: tw, style: `${disp(24, 28)}color:${inkOnGround}` })
        + (em.greeting ? para(ex + pad, by, tw, em.greeting).html : '')
        + para(ex + pad, by + gp.h + 8, tw, body).html;
      return sub(X0, y, CW, 'Install-day email', `${m.ground.name} first`) + mail;
    } };
    secs = [hoardSec, shotsSec, rulesSec, pairSec].filter((s) => s && s.h);
    // where the page cannot hold all four, the hoarding comes down first (to 120 px), then the photograph rules give way; the briefs stay, as the page's job is to say what to shoot
    const gapA = photographed || !slot ? 28 : 20, over = () => sum(secs.map((s) => s.h)) + gapA * (secs.length - 1) - (BOT - t.top);
    if (over() > 0) setHB(Math.max(120, HB - over()));
    if (over() > 0) secs = secs.filter((s) => s !== rulesSec);
    if (over() > 0) setHB(Math.max(100, HB - over()));
    // the hoarding takes the room that is left, up to its own height in the scene
    if (!slot && over() < 0) hoardSec.flex = Math.min(HH - HB, -over());
    if (slot && over() < 0) setHB(Math.min(HB - over(), Math.floor(((CW - 24 - 88 - 160 - 2) / aw) * HH) + 2));
  }
  return shell(ctx, 'applied', { body: t.html + flow('applied', t.top, secs, { gap: photographed && !slot ? 26 : photographed || !slot ? 28 : 20, maxGap: 72 }) });
}

const withFaces = (fn) => (ctx) => withHooks(ctx, () => { useFaces(ctx); return fn(ctx); });
export const guide = makeGuide({
  cover: withFaces(cover), logo: withFaces(logoPage), colour: withFaces(colourPage), ruler: withFaces(rulerPage), type: withFaces(typePage), contrast: withFaces(contrastPage),
  tokens: withFaces(tokensPage), usage: withFaces(usagePage), applied: withFaces(appliedPage),
}, { order: PAGE_IDS, extra: ['ruler', 'applied'] });

export function guideCss() {
  return `/* Swiss Field style guide: A4 portrait. The ruler strip, the head and the title follow the 1920 book's rules at page scale; sizes are 11, 12, 13 and 15 px, with the page title at the scale's own Title step. */
.pg{--chrome:var(--body);--cmono:var(--bmono)}
.pg .sg-h{font:500 13px/18px var(--chrome);white-space:nowrap}
.pg .sg-l12{font-size:12px;line-height:16px}
.pg .sg-n{font:400 13px/18px var(--chrome);text-wrap:pretty}
.pg .sg-b{font:400 15px/22px var(--chrome);text-wrap:pretty}
.pg .sg-m{font:400 12px/16px var(--cmono);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .sg-s{font:400 11px/14px var(--cmono);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .sg-i{font-family:var(--cmono);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .sg-t{text-wrap:balance}
.pg .sg-fo{font-variant-numeric:tabular-nums}
`;
}
