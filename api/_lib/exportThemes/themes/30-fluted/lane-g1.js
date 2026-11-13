// Theme 30, Fluted, lane g1: the brand and voice pages (contents, voice, write-this, messaging, summary, contact-scope).
// Every page keeps the band at y 768 to 1152 and puts data behind it, never ornament: what the reeds bend is a measure of the page's own content
// (pages per section, one reed per word, colour by share, one reed per page). Each measure is a window: a column with a round head, the arch of the
// personality page, whose width is the value. Its head is a curve, and a curve is what reeds visibly bend (a flat field behind vertical reeds reads only
// as stripes); the widest head on each page rises 48 px clear of the band, so it is seen flat, then reeded. Values are printed in the key row under the band.
// Colours come from ctx roles and brand data only; no brand colour id, hex or name is written here.
import { A, put, shell, rect, tokens, adv, fitSize, logoHtml, PW, FIELD_MIN } from './helpers.js';
import { paletteCols, warpPath } from './glass.js';
import { UIKIT_PAGES } from '../../engine/pages.js';

const P = 12;            // the reed pitch
const LIP = 720;         // the top of the widest head on a page: 48 px of it flat above the band's top edge
const BB = 1152, KEY = 1184;
const TRACK = -0.02;
const pad3 = (n) => String(n).padStart(3, '0');
const longDate = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// counted, never printed: the words of a brand string, for the measures behind the glass
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
// slot edition: a placeholder is one token, so a measure that counts words or lines takes the length the placeholder asks for instead (`nominal`)
const isPh = (ctx, t) => !!ctx.placeholders && String(t).includes('\uE000');
const wordsOf = (ctx, t, nominal) => (isPh(ctx, t) ? nominal : words(t));
const snap = (x) => Math.round(x / P) * P;   // a reed boundary, where the bend is zero, so a window's straight sides stay straight in the glass
const plural = (n, one, many) => `<span class="num">${n}</span> ${n === 1 ? one : many}`;

// the number of lines a run wraps to in a box `w` wide (measurement only; the browser sets the text whole)
function lineCount(ctx, role, text, size, w, weight, slotLines = 1) {
  if (isPh(ctx, text)) return slotLines;
  const sp = adv(ctx, role, ' ', size, 0, weight);
  let n = 1, x = 0;
  for (const wd of text.trim().split(/\s+/)) {
    const a = adv(ctx, role, wd, size, 0, weight) * 1.03;
    if (x > 0 && x + sp + a > w) { n++; x = a; } else x += (x > 0 ? sp : 0) + a;
  }
  return n;
}

// The window: straight sides from the band's foot up to a round head of radius w / 2 whose top is `top`. Returns the flat drawing (seen above the band),
// the same outline bent by the reeds (drawn over them, see warpPath), and a rect of its body for the glass to sample (so the reed profile is weakened over a pale window).
function windowMark(x, w, top, { fill = null, stroke = null } = {}) {
  const r = w / 2, cx = x + r, cy = top + r, ins = stroke ? 1 : 0;   // a hollow window's 2 px line sits wholly inside its box
  const pts = [[x + ins, BB], [x + ins, cy]];
  for (let a = 180; a <= 360; a += 0.5) pts.push([cx + (r - ins) * Math.cos(a * Math.PI / 180), cy + (r - ins) * Math.sin(a * Math.PI / 180)]);
  pts.push([x + w - ins, cy], [x + w - ins, BB]);
  const d = `M${pts.map(([px, py]) => `${px.toFixed(2)} ${py.toFixed(2)}`).join('L')}${fill ? 'Z' : ''}`;
  const paint = fill ? `fill="${fill}"` : `fill="none" stroke="${stroke}" stroke-width="2"`;
  const wd = warpPath(d, 0, 0, {});
  return { flat: `<path d="${d}" ${paint}/>`, over: `<path d="${wd || d}" ${paint}/>`, body: fill ? rect(x, Math.round(cy), w, BB - Math.round(cy), fill) : '' };
}
const joinMarks = (ms) => ({ flat: ms.map((m) => m.flat).join(''), over: ms.map((m) => m.over).join(''), shape: ms.map((m) => m.body).join('') });
const page = (ctx, id, T, ms, html) => { const J = joinMarks(ms); return shell(ctx, id, T, { flat: J.flat, shape: J.shape, fields: false, band: { over: J.over }, html }); };

// the mark colours: the strong colour, then the brand's other colours by share, each kept only if it stands 0.12 OKLCH L off the ground
function marks(ctx, T) {
  const L = (h) => ctx.C.toOklch(h).L, g = L(T.ground), lo = (h) => h.toLowerCase();
  const cs = ctx.colours.slice().sort((a, b) => b.share - a.share).map((c) => c.hex).filter((h) => lo(h) !== lo(T.ground) && lo(h) !== lo(T.strong));
  return [T.strong, ...cs].filter((h) => Math.abs(L(h) - g) >= 0.12);
}

const headline = (ctx, l1, l2, { y = 96, w = 777 } = {}) => {
  const s = Math.min(64, fitSize(ctx, 'display', l2 && l2.length > l1.length ? l2 : l1, 64, w, TRACK, ctx.weights.heading, 40));
  return put(ctx, { x: 64, y, w, cls: 'disp', html: `<div style="font-size:${s}px;line-height:64px;color:var(--ink)">${A(l1)}</div>${l2 ? `<div style="font-size:${s}px;line-height:64px;color:var(--quiet)">${A(l2)}</div>` : ''}` });
};
const keyAt = (ctx, x, w, html, cls = 'k') => put(ctx, { x, y: KEY, w, cls, html });
const body = (ctx, x, y, w, html, style = '') => put(ctx, { x, y, w, cls: 'body', style: `white-space:normal;${style}`, html });

// ---- 002 contents: the sections as rows; in the band the document itself, one window per section, as wide as its share of the pages ----
function contents(ctx) {
  const T = tokens(ctx), S = ctx.sections, M = marks(ctx, T);
  const total = S.reduce((a, s) => a + s.pages.length, 0);
  // the 80 reeds between the margins (x 60 to 1020) shared out by pages (largest remainder), each section then giving one reed to the gap after it,
  // so the key under the first window starts on the margin and not at the page edge
  const R = 80, raw = S.map((s) => (s.pages.length / total) * R), n = raw.map(Math.floor);
  raw.map((r, i) => [r - n[i], i]).sort((a, b) => b[0] - a[0]).slice(0, R - n.reduce((a, b) => a + b, 0)).forEach(([, i]) => { n[i]++; });
  const wMax = Math.max(...n) * P - P, ys = LIP + wMax / 2;
  let x = 60 - P / 2, keys = '';
  const ms = S.map((s, i) => {
    const w = n[i] * P - P, m = windowMark(x + P / 2, w, ys - w / 2, { fill: M[i % M.length] });
    keys += put(ctx, { x: x + P / 2, y: KEY, w: Math.max(w, 24), cls: 'v num', html: String(s.n).padStart(2, '0') });
    x += n[i] * P;
    return m;
  });
  // the windows sit half a reed in from each page edge; their sides then fall on reed centres, where the bend is also zero
  const head = headline(ctx, 'Contents', '');
  const sum = body(ctx, 64, 176, 468, `${total} pages in ${S.length} sections. In the glass, one window for each section, as wide as its share of the pages.`);
  const RY = 280, STEP = Math.min(48, Math.floor((LIP - 40 - RY) / S.length));
  const rows = S.map((s, i) => {
    const y = RY + i * STEP, a = s.pages[0].no, b = s.pages[s.pages.length - 1].no;
    return `<div class="hair" style="left:64px;top:${y - 8}px;width:952px"></div>`
      + put(ctx, { x: 64, y, w: 100, cls: 'v num', html: String(s.n).padStart(2, '0'), style: 'line-height:32px' })
      + put(ctx, { x: 185, y, w: 460, cls: 'disp', html: `<span style="font-size:28px;line-height:32px">${A(s.title)}</span>` })
      + put(ctx, { x: 669, y, w: 120, cls: 'k', html: plural(s.pages.length, 'page', 'pages'), style: 'line-height:32px' })
      + put(ctx, { x: 790, y, w: 226, cls: 'v num', align: 'right', html: a === b ? pad3(a) : `${pad3(a)} to ${pad3(b)}`, style: 'line-height:32px' });
  }).join('');
  return page(ctx, 'contents', T, ms, head + sum + rows + keys);
}

// ---- 005 voice: the principles in columns, each example under its rule; in the band one reed for each word of the example ----
function voice(ctx) {
  const T = tokens(ctx), B = ctx.brand, V = B.voice.principles, k = V.length, W = ctx.weights;
  const CW = Math.floor((952 - 24 * (k - 1)) / k), cx = (i) => 64 + i * (CW + 24);
  const TS = 28, TL = 32, maxReeds = Math.floor(CW / P);
  const tl = Math.max(...V.map((p) => lineCount(ctx, 'display', p.title, TS, CW, W.heading, 2)));
  const el = Math.max(...V.map((p) => lineCount(ctx, 'body', p.example, 18, CW, W.regular, 2)));
  const n = V.map((p) => wordsOf(ctx, p.example, 6)), w = n.map((c) => Math.min(c, maxReeds) * P), ys = LIP + Math.max(...w) / 2;
  // the text block hangs above the tallest head, 40 px clear of it
  const exY = LIP - 40 - el * 28, tY = exY - 16 - tl * TL;
  const head = headline(ctx, `How ${B.name} writes`, '');
  const lead = body(ctx, 64, 176, 468, `${k} rules for every sentence. Under each rule, an example. In the glass, one reed for each word of it.`);
  let cols = '', keys = '';
  const ms = V.map((p, i) => {
    cols += `<div class="hair" style="left:${cx(i)}px;top:${tY - 24}px;width:${CW}px"></div>`
      + put(ctx, { x: cx(i), y: tY, w: CW, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:${TS}px;line-height:${TL}px;color:var(--ink)">${A(p.title)}</div>` })
      + put(ctx, { x: cx(i), y: exY, w: CW, style: `white-space:normal;font:${W.regular} 18px/28px var(--body);color:var(--ink)`, html: A(p.example) });
    keys += keyAt(ctx, cx(i), CW, plural(n[i], 'word', 'words'));
    return windowMark(snap(cx(i)), w[i], ys - w[i] / 2, { fill: T.strong });
  });
  return page(ctx, 'voice', T, ms, head + lead + cols + keys);
}

// ---- 006 write-this: one column per pair; in the band a solid window for the line we write, a hollow one for the line it replaces, one reed per word ----
function writeThis(ctx) {
  const T = tokens(ctx), R = ctx.brand.voice.writeThis, k = R.length, W = ctx.weights;
  const CW = Math.floor((952 - 16 * (k - 1)) / k), cx = (i) => 64 + i * (CW + 16), maxReeds = Math.floor(CW / P);
  // the write line at the largest of 24, 22, 20 or 18 px at which the three blocks fit between the lead and the heads
  const top = 304, room = LIP - 40 - top;
  let WS, wl, nl, bl;
  for (WS of [24, 22, 20, 18]) {
    wl = Math.max(...R.map((r) => lineCount(ctx, 'display', r.write, WS, CW, W.heading, 2)));
    nl = Math.max(...R.map((r) => lineCount(ctx, 'body', r.not, 16, CW, W.regular, 2)));
    bl = Math.max(...R.map((r) => lineCount(ctx, 'body', r.because, 15, CW, W.regular, 2)));
    if (wl * (WS + 4) + 16 + nl * 24 + 16 + bl * 22 <= room) break;
  }
  const WL = WS + 4, nY = top + wl * WL + 16, bY = nY + nl * 24 + 16;
  const head = headline(ctx, 'Write this', 'Not that');
  const nW = R.map((r) => Math.min(wordsOf(ctx, r.write, 5), maxReeds) * P), nN = R.map((r) => Math.min(wordsOf(ctx, r.not, 5), maxReeds) * P);
  const ys = LIP + Math.max(...nW, ...nN) / 2;
  let cols = '', keys = '';
  const ms = [];
  R.forEach((r, i) => {
    cols += `<div class="hair" style="left:${cx(i)}px;top:${top - 24}px;width:${CW}px"></div>`
      + put(ctx, { x: cx(i), y: top, w: CW, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:${WS}px;line-height:${WL}px;color:var(--ink)">${A(r.write)}</div>` })
      + put(ctx, { x: cx(i), y: nY, w: CW, style: `white-space:normal;font:${W.regular} 16px/24px var(--body);color:var(--quiet);text-decoration:line-through;text-decoration-thickness:1px`, html: A(r.not) })
      + put(ctx, { x: cx(i), y: bY, w: CW, style: `white-space:normal;font:${W.regular} 15px/22px var(--body);color:var(--soft)`, html: A(r.because) });
    keys += keyAt(ctx, cx(i), CW, `${plural(wordsOf(ctx, r.write, 5), 'word', 'words')}, not <span class="num">${wordsOf(ctx, r.not, 5)}</span>`);
    // both windows stand on the column's centre line; the solid one first, so the hollow outline is never hidden under it
    const c = snap(cx(i) + CW / 2) + (nW[i] / P % 2 ? P / 2 : 0), c2 = snap(cx(i) + CW / 2) + (nN[i] / P % 2 ? P / 2 : 0);
    ms.push(windowMark(c - nW[i] / 2, nW[i], ys - nW[i] / 2, { fill: T.strong }), windowMark(c2 - nN[i] / 2, nN[i], ys - nN[i] / 2, { stroke: T.ink }));
  });
  return page(ctx, 'write-this', T, ms, head + cols + keys);
}

// ---- 007 messaging: the lines large; the name rule; the two boilerplates, each above a window one reed per word wide ----
function messaging(ctx) {
  const T = tokens(ctx), B = ctx.brand, V = B.voice, W = ctx.weights;
  const lines = [B.lines.primary, ...B.lines.others];
  const LS = Math.min(...lines.map((l) => fitSize(ctx, 'display', l, 56, 900, TRACK, W.heading, 32))), LL = Math.round(LS * 1.08);
  const stack = put(ctx, { x: 64, y: 96, w: 952, cls: 'disp', html: lines.map((l, i) => `<div style="font-size:${LS}px;line-height:${LL}px;color:var(${i ? '--quiet' : '--ink'})">${A(l)}</div>`).join('') });
  const nameY = 96 + lines.length * LL + 40;
  const nameH = put(ctx, { x: 64, y: nameY, w: 226, cls: 'kn', html: 'Writing the name' });
  const nameB = body(ctx, 306, nameY - 3, 589, A(V.nameRules));
  // the windows: 25 and 50 words, one reed each, a reed's gap between; if the two would run past the right margin, a word takes less than a reed
  const c25 = wordsOf(ctx, V.boilerplate25, 25), c50 = wordsOf(ctx, V.boilerplate50, 50), x0 = 60;
  const unit = Math.min(P, Math.floor((1020 - x0 - P) / (c25 + c50))), w25 = c25 * unit, w50 = c50 * unit, x50 = snap(x0 + w25 + P);
  const ys = LIP + Math.max(w25, w50) / 2;
  const tw25 = Math.max(w25 - 16, 260), tw50 = Math.min(w50 - 16, 1016 - x50 - 4);
  const bl = Math.max(lineCount(ctx, 'body', V.boilerplate25, 16, tw25, W.regular, 2), lineCount(ctx, 'body', V.boilerplate50, 16, tw50, W.regular, 2));
  const bY = LIP - 40 - bl * 25, hY = bY - 28;
  const t25 = put(ctx, { x: x0 + 4, y: hY, w: tw25, cls: 'kn', html: 'Short boilerplate' }) + body(ctx, x0 + 4, bY, tw25, A(V.boilerplate25));
  const t50 = put(ctx, { x: x50 + 4, y: hY, w: tw50, cls: 'kn', html: 'Long boilerplate' }) + body(ctx, x50 + 4, bY, tw50, A(V.boilerplate50));
  const ms = [windowMark(x0, w25, ys - w25 / 2, { fill: T.strong }), windowMark(x50, w50, ys - w50 / 2, { fill: T.strong })];
  const keys = keyAt(ctx, x0 + 4, w25, plural(c25, 'word', 'words')) + keyAt(ctx, x50 + 4, 360, plural(c50, 'word', 'words'))
    + keyAt(ctx, 790, 226, unit === P ? 'One reed is one word' : `${unit} px is one word`, 'k');
  return page(ctx, 'messaging', T, ms, stack + nameH + nameB + t25 + t50 + keys);
}

// ---- 032 summary: the logo, the lines, the faces and the three rules; in the band the palette by share, one window for each colour ----
function summary(ctx) {
  const T = tokens(ctx), B = ctx.brand, W = ctx.weights, f = B.fonts;
  const logo = `<div class="a" style="left:64px;top:96px">${logoHtml(ctx, T, 'colour', { width: 280 })}</div>`;
  const lines = [B.lines.primary, ...B.lines.others];
  const LS = Math.min(40, ...lines.map((l) => fitSize(ctx, 'display', l, 40, 589, TRACK, W.heading, 24)));
  const stack = put(ctx, { x: 427, y: 96, w: 589, cls: 'disp', html: lines.map((l, i) => `<div style="font-size:${LS}px;line-height:${Math.round(LS * 1.15)}px;color:var(${i ? '--quiet' : '--ink'})">${A(l)}</div>`).join('') });
  const faces = put(ctx, { x: 427, y: 96 + lines.length * Math.round(LS * 1.15) + 24, w: 589, cls: 'k', style: 'white-space:normal',
    html: `<span class="kn">${A(f.display.family)}</span> ${A(f.display.weights.join(', '))} for display. <span class="kn">${A(f.body.family)}</span> ${A(f.body.weights.join(', '))} for text.` });
  const G = B.guideB.rules, k = G.length, CW = Math.floor((952 - 24 * (k - 1)) / k), cx = (i) => 64 + i * (CW + 24);
  const tl = Math.max(...G.map((r) => lineCount(ctx, 'display', r.title, 24, CW, W.heading, 2)));
  const xl = Math.max(...G.map((r) => lineCount(ctx, 'body', r.text, 16, CW, W.regular, 2)));
  const rY = LIP - 40 - xl * 25 - 12 - tl * 28;
  const rules = G.map((r, i) => `<div class="hair" style="left:${cx(i)}px;top:${rY - 24}px;width:${CW}px"></div>`
    + put(ctx, { x: cx(i), y: rY, w: CW, cls: 'disp', style: 'white-space:normal', html: `<div style="font-size:24px;line-height:28px">${A(r.title)}</div>` })
    + body(ctx, cx(i), rY + tl * 28 + 12, CW, A(r.text))).join('');
  // the palette: the theme's fields by share (two-hue rule included), each field a window inset half a reed from its edges; the ground's own window is a hollow outline
  // the fields' list and shares come from the theme's palette (two-hue rule included); their widths are shared out again over the 80 reeds between the margins
  // (largest remainder, at least 12 reeds each so the value line fits), so the first key starts on the margin and not at the page edge
  const cols = paletteCols(ctx, { ground: T.ground, actionHex: T.strong, minW: FIELD_MIN }), RN = 80, MINR = 12;
  const raw = cols.map((c) => c.share * RN), rn = raw.map((r) => Math.max(MINR, Math.floor(r)));
  while (rn.reduce((a, b) => a + b, 0) > RN) rn[rn.indexOf(Math.max(...rn))]--;
  raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rn.reduce((a, b) => a + b, 0) < RN) rn[i]++; });
  const ws = rn.map((n) => n * P - P), ys = LIP + Math.max(...ws) / 2, lo = (h) => h.toLowerCase();
  let keys = '', at = 60;
  const ms = cols.map((c, i) => {
    const x = at, w = ws[i], isG = lo(c.hex) === lo(T.ground), named = ctx.colours.find((x2) => lo(x2.hex) === lo(c.hex));
    keys += put(ctx, { x, y: KEY, w: Math.max(w, 140), cls: 'kn', html: named ? A(named.name) : 'Ramp step' })
      + put(ctx, { x, y: KEY + 22, w: Math.max(w, 140), cls: 'v num', html: `${Math.round(c.share * 100)}% ${c.hex.toUpperCase()}` });
    at += rn[i] * P;
    return windowMark(x, w, ys - w / 2, isG ? { stroke: T.ink } : { fill: c.hex });
  });
  return page(ctx, 'summary', T, ms, logo + stack + faces + rules + keys);
}

// ---- 033 contact-scope: who to ask and what is in this document; in the band this document and the UI kit, one reed per page ----
function contactScope(ctx) {
  const T = tokens(ctx), B = ctx.brand, S = ctx.sections;
  const head = headline(ctx, 'Who to ask', '');
  const owner = body(ctx, 64, 184, 468, `${A(B.contact.owner)} owns this document. Write for a logo file, a missing asset or an exception.`);
  const ES = fitSize(ctx, 'display', B.contact.email, 40, 952, TRACK, ctx.weights.heading, 24);
  const email = put(ctx, { x: 64, y: 252, w: 952, cls: 'disp', html: `<span style="font-size:${ES}px;line-height:48px">${A(B.contact.email)}</span>` });
  const ver = put(ctx, { x: 64, y: 316, w: 468, cls: 'k', html: `Version ${A(B.version.number)}, ${longDate(B.version.date)}` });
  const LY = 400;
  const inH = put(ctx, { x: 64, y: LY, w: 468, cls: 'kn', html: 'In this document' });
  const inL = S.map((s, i) => put(ctx, { x: 64, y: LY + 32 + i * 28, w: 468, html: `<span class="v num" style="display:inline-block;width:40px">${String(s.n).padStart(2, '0')}</span><span style="font:400 16px/28px var(--body);color:var(--soft)">${A(s.title)}</span>`, style: 'line-height:28px' })).join('');
  const not = [['Logo files, palettes and fonts.', 'They are in the brand kit.'], ['Interface components and tokens.', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values.', 'Ask your printer for a proof.']];
  const notH = put(ctx, { x: 548, y: LY, w: 468, cls: 'kn', html: 'Not in this document' });
  const notL = not.map(([a, b], i) => body(ctx, 548, LY + 32 + i * 64, 468, `<span style="color:var(--ink)">${a}</span> ${b}`)).join('');
  // the windows: this document's pages and the UI kit's, a reed each
  const nd = ctx.pages.length, nk = UIKIT_PAGES.length, wd = nd * P, wk = nk * P, x0 = 60, xk = x0 + wd + 2 * P, ys = LIP + Math.max(wd, wk) / 2;
  const ms = [windowMark(x0, wd, ys - wd / 2, { fill: T.strong }), windowMark(xk, wk, ys - wk / 2, { stroke: T.ink })];
  const keys = keyAt(ctx, x0 + 4, wd, `This document, ${plural(nd, 'page', 'pages')}`) + keyAt(ctx, xk + 4, wk, `The UI kit, ${plural(nk, 'page', 'pages')}`)
    + keyAt(ctx, 790, 226, 'One reed is one page');
  return page(ctx, 'contact-scope', T, ms, head + owner + email + ver + inH + inL + notH + notL + keys);
}

export const guidelines = { contents, voice, 'write-this': writeThis, messaging, summary, 'contact-scope': contactScope };
