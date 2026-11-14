// Round 1 gate pages for theme 21 (cover, personality, palette, typefaces; applications and layouts are still to do, see the report).
// Every page is laid out in px on the 1280 x 720 page from the spec (11_specs/21-presentation.md). Colours come by role, never by id;
// text is measured with the brand's own font files so a fitted size is a real fit. Styles: css-r1.js (classes r-).
import { plateImg } from '../../engine/plate.js';
import { A } from './helpers.js';
import { screenContent } from './once.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { quadMatrix } from '../../engine/mockup.js';
import { phoneScreen } from './uikit.js';

const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
// width of one line of text in px, from the font file (letter-spacing in em)
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
// greedy wrap: how many lines a text takes at a size and width
const lineCount = (ctx, role, weight, text, size, maxW, track = 0) => { let n = 1, cur = ''; for (const w of text.split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { n++; cur = w; } else cur = t; } return n; };
// the largest size from hi down to lo at which every text fits in maxLines lines of maxW
const fitSize = (ctx, role, weight, texts, hi, lo, maxW, maxLines = 1, track = -0.01) => { for (let s = hi; s > lo; s--) if (texts.every((t) => lineCount(ctx, role, weight, t, s, maxW, track) <= maxLines)) return s; return lo; };
// top of a text box so that its first baseline lands on y
const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };

// colour roles
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const nameOfHex = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// chrome rule: the brand's quiet tone that reaches 4.5:1 on the ground; else the best of the text colour, the page ground and the dark soft text
const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
const px = (n) => +(+n).toFixed(2);
// the print and screen values under a hex: RGB from the hex; CMYK only when the brand supplies it (c.cmyk as [c, m, y, k] or "c m y k"), never worked out here
const values = (c) => {
  const n = parseInt(c.hex.slice(1), 16), rgb = `RGB&nbsp;${(n >> 16) & 255}&nbsp;${(n >> 8) & 255}&nbsp;${n & 255}`;
  const k = c.cmyk ? (Array.isArray(c.cmyk) ? c.cmyk : String(c.cmyk).split(/[\s,]+/)).join('&nbsp;') : '';
  return k ? `${rgb}&nbsp;&nbsp;&nbsp;CMYK&nbsp;${k}` : rgb;
};
const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const colourwayOnGround = (ctx, hex) => Object.entries(ctx.brand.logo.colourways).find(([, v]) => v.ground.toLowerCase() === hex.toLowerCase())?.[0];

// the one running head: section number and title left, document name and a three-digit folio right. Each part takes the chrome colour of the field it sits on.
function head(ctx, id, { left, right, title } = {}) {
  const p = ctx.pages.find((x) => x.id === id), g = L(ctx).surface;
  const cl = chromeOn(ctx, left || g), cr = chromeOn(ctx, right || left || g);
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${p.ref ? `<b>${p.ref}</b>` : ''}${A(title || p.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(ctx.brand.name)} brand guidelines</i><b>${folio}</b></span></div>`;
}
const page = (id, cls, inner, bg) => `<section class="pg pg--r ${cls}" data-page="${id}" style="background:${bg}">${inner}</section>`;

// the shot for a use ("cover", "poster", "scene"): the first photo that asks for it, else the first photo with no use of its own; never one already used
function shotFor(ctx, use, used) {
  const shots = ctx.brand.imagery.shots.filter((s) => s.photo && !used.has(s.id));
  const s = shots.find((x) => (x.use || []).includes(use)) || shots.find((x) => !(x.use || []).length);
  if (s) used.add(s.id);
  return s || null;
}
// natural size of a jpeg, read from its header
function jpegSize() { throw new Error('theme 21: photograph files are not read by the server export'); }
// a photograph cropped to the shot's safe box, filling a w x h box with nothing laid over it
function cropped(ctx, s, x, y, w, h) {
  const n = jpegSize(); const c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) * (s.focus && s.focus.x != null ? s.focus.x / 100 : 0.5), oy = (h - c.h * k) / 2;
  return box(x, y, w, h, 'overflow:hidden', `${plateImg(`${A(ctx.photoUrl(s.photo))}`, `${A(s.alt)}`, `position:absolute;display:block;max-width:none;width:${px(n.w * k)}px;height:${px(n.h * k)}px;left:${px(ox - c.x * k)}px;top:${px(oy - c.y * k)}px`)}`);
}

// ---- applications and layouts helpers ----------------------------------------------------------------------------------------

// a box for art that is drawn outside a page (card, poster, slide): inline styles only, so it works with or without the page's r- rules
const ab = (x, y, w, st = '', inner = '') => `<div style="position:absolute;box-sizing:border-box;left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${st}">${inner}</div>`;
const abB = (x, bottom, w, st = '', inner = '') => `<div style="position:absolute;box-sizing:border-box;left:${px(x)}px;bottom:${px(bottom)}px;${w ? `width:${px(w)}px;` : ''}${st}">${inner}</div>`;
// the logo colourway whose ground is this colour, else full colour
const logoOn = (ctx, hex) => colourwayOnGround(ctx, hex) || 'colour';
const lockH = (ctx, w) => (w * ctx.logo.geos.colour.h) / ctx.logo.geos.colour.w;
// greedy wrap of one run of words at maxW
function greedy(ctx, role, weight, words, size, maxW, track) {
  const out = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
// the same line count as greedy, with the lines as even as they can be (the narrowest width that keeps the count)
function balanced(ctx, role, weight, text, size, maxW, track) {
  const words = text.split(' '), n = greedy(ctx, role, weight, words, size, maxW, track).length;
  if (n === 1) return [text];
  let lo = Math.max(...words.map((w) => textW(ctx, role, weight, w, size, track))), hi = maxW;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (greedy(ctx, role, weight, words, size, mid, track).length <= n) hi = mid; else lo = mid; }
  return greedy(ctx, role, weight, words, size, hi, track);
}
// explicit lines, so the lines laid out are the lines that render. The whole text on one line if it fits; else one sentence to a line;
// a sentence that is still too wide is balanced over the fewest lines. A break never falls inside a sentence unless it has to. Few words go one to a line.
function wrapLines(ctx, role, weight, text, size, maxW, track = -0.01, each = true) {
  const words = text.split(' ');
  if (each && words.length <= 3) return words;
  if (textW(ctx, role, weight, text, size, track) <= maxW) return [text];
  const lines = []; let cur = '';
  for (const s of text.split(/(?<=[.!?]) /)) {
    const t = cur ? `${cur} ${s}` : s;
    if (cur && textW(ctx, role, weight, t, size, track) > maxW) { lines.push(...balanced(ctx, role, weight, cur, size, maxW, track)); cur = s; } else cur = t;
  }
  if (cur) lines.push(...balanced(ctx, role, weight, cur, size, maxW, track));
  return lines;
}
// the largest size from hi down to lo (step 1) at which the text sets in maxLines lines or fewer of maxW
function fitSet(ctx, role, weight, text, hi, lo, maxW, maxLines, track = -0.01) {
  for (let s = hi; s > lo; s--) { const lines = wrapLines(ctx, role, weight, text, s, maxW, track, false); if (lines.length <= maxLines && lines.every((l) => textW(ctx, role, weight, l, s, track) <= maxW)) return { size: s, lines }; }
  return { size: lo, lines: wrapLines(ctx, role, weight, text, lo, maxW, track, false) };
}
// lines as blocks that never re-wrap
const lineHtml = (lines) => lines.map((l) => `<span class="r-ln">${A(l)}</span>`).join('');
// the largest size from hi down to lo at which every line fits maxW and the lines fit maxH
function fitLines(ctx, text, hi, lo, maxW, maxH, lh, each = true) {
  const dw = dispW(ctx);
  for (let s = hi; s > lo; s -= 2) {
    const lines = wrapLines(ctx, 'display', dw, text, s, maxW, -0.01, each);
    // a one-word line is fine at the end of a sentence ("welcome.") and where the text is only a few words set one to a line; mid-sentence it is a stranded word, so a smaller size is tried
    const stranded = !(each && text.split(' ').length <= 3) && lines.some((l) => !/\s/.test(l) && !/[.!?]$/.test(l));
    if (!stranded && lines.every((l) => textW(ctx, 'display', dw, l, s, -0.01) <= maxW) && lines.length * s * lh <= maxH) return { size: s, lines };
  }
  return { size: lo, lines: wrapLines(ctx, 'display', dw, text, lo, maxW, -0.01, each) };
}
// the line that goes on the poster and the cards: the brand's signage line, else its second line
const signHead = (ctx) => (ctx.brand.applications.signage.split(': ')[1] || ctx.brand.lines.others[1] || ctx.brand.lines.primary).trim();
// a second line for the poster foot that does not repeat the headline
const footLine = (ctx) => { const B = ctx.brand, h = signHead(ctx); return B.lines.primary === h ? (B.lines.others.find((l) => l !== h) || B.lines.primary) : B.lines.primary; };
// Which brand line goes where. A brand with three or more lines of its own keeps each page's natural choice. A brand with fewer (Long Room has two) would print its
// primary line on every page, so the pages that would repeat it take plain sentences from the brand's own boilerplate, and no line prints more than twice across the six pages
// (the voice examples in the Palette fields and the Statement notes count as prints).
// A brand rule that says "Say <word> once" (Long Room: "Say free once"): the word each sentence may carry once in the whole book, as a pattern. Null where the brand has no such rule.
const onceRe = (ctx) => { const m = ctx.brand.voice.principles.map((v) => /^say (\w+) once$/i.exec(v.title)).find(Boolean); return m ? new RegExp(String.raw`\b${m[1]}\b`, 'i') : null; };
// the text without the sentences that carry the once-word (they print on the cover and nowhere else)
const sayOnce = (ctx, text) => { const re = onceRe(ctx); return re ? text.split(/(?<=[.!?]) /).filter((s) => !re.test(s)).join(' ') : text; };
const sentences = (s) => (s || '').split(/(?<=[.!?]) /).map((x) => x.trim()).filter(Boolean);
function lineMap(ctx) {
  const m = lineMapBase(ctx), B = ctx.brand, re = onceRe(ctx), p = B.lines.primary;
  // the weight specimen on the Typefaces page: the first sentence of the primary line; where the brand says a word once, one of its sentences without that word
  m.specimen = re && re.test(sentences(p)[0] || '') ? (B.lines.others.find((l) => !re.test(l)) || sentences(p).find((s) => !re.test(s)) || sentences(p)[0]) : (sentences(p)[0] || p);
  return m;
}
function lineMapBase(ctx) {
  const B = ctx.brand, p = B.lines.primary, o = B.lines.others, sign = signHead(ctx), head = B.type.sample.headline;
  const nat = { cover: p, band: o[0] || '', wall: sign, wallFoot: footLine(ctx), card: p, pers: [...new Set([...o, p])].slice(0, 3), palHead: head, lposter: sign, editorial: head, statement: p };
  const own = [p, ...o], ex = [];
  for (const sn of `${B.voice.boilerplate25 || ''} ${B.voice.boilerplate50 || ''}`.split(/(?<=[.!?]) /)) {
    const t = sn.trim();
    if (t && t.length <= 60 && !t.includes(B.name) && !own.some((l) => l.includes(t)) && !ex.includes(t)) ex.push(t);
  }
  if (1 + o.length >= 3) {
    // three or more lines: each page keeps its natural line until that line has printed twice, then takes the shortest unused boilerplate sentence (shortest first: the card is small)
    const pool = [...ex].sort((a, b) => a.length - b.length), n = {}, out = {}, used = new Set();
    const take = (v) => { if ((n[v] || 0) < 2) { n[v] = (n[v] || 0) + 1; return v; } const alt = pool.find((s) => !used.has(s)) || pool.find((s) => (n[s] || 0) < 2); if (!alt) return v; used.add(alt); n[alt] = (n[alt] || 0) + 1; return alt; };
    for (const k of ['cover', 'wall', 'lposter', 'statement', 'editorial', 'band', 'card', 'pers', 'palHead', 'wallFoot']) out[k] = k === 'pers' ? nat.pers.map(take) : k === 'band' ? nat.band : take(nat[k]);
    return out;
  }
  const re = onceRe(ctx);
  if (re) {
    // a brand that says one word once (Long Room: free): the primary line keeps the cover, and no other slot prints a sentence with that word. The slots take whole sentences from the brand's own
    // copy (the primary line's second half, its other line, the boilerplate, the sample paragraph), each at most twice.
    const pool = [...new Set([...sentences(`${B.voice.boilerplate25 || ''} ${B.voice.boilerplate50 || ''}`), ...sentences(B.type.sample.paragraph), ...o].filter((s) => s.length <= 60 && !s.includes(B.name) && !re.test(s) && !p.includes(s)))];
    // pool: whole sentences, the last being the brand's own other line; no text twice on one page. The wall poster on the Applications page is the one application that carries the whole primary line
    const q = (i) => pool[i % pool.length] || p, last = pool.length - 1;
    return { cover: p, band: o[0] || '', wall: p, wallFoot: q(0), card: q(1), pers: [q(2), q(0), q(1)], palHead: q(last), lposter: q(1), editorial: q(0), statement: q(2) };
  }
  const x = (i) => (ex.length ? ex[i % ex.length] : p);
  return { cover: p, band: o[0] || '', wall: sign, wallFoot: x(3), card: o[0] || p, pers: [x(2), x(1)], palHead: x(0), lposter: x(0), editorial: x(1), statement: x(2) };
}

// the brand's entry times as a table in the field's ink: a title row, then a rule and a row for each time (date, time in the display face, what it is, its price).
// The rows are the product screen's list, a cancelled one left out. The hours sit right of the title when the screen gives both as times. Columns sit on the page's 296 px grid.
function timetable(ctx, x, y, ink) {
  const B = ctx.brand, c = screenContent(ctx), tone = (id) => (B.ui.status.find((s) => s.id === id) || {}).tone;
  const rows = (c.deliveries || []).filter((d) => tone(d.status) !== 'danger').slice(0, 4);
  if (rows.length < 2) return '';
  const dw = dispW(ctx), rowH = 44, cx = [0, 296, 592, 888].map((v) => x + v), isT = (t) => /\d\s?[ap]m/i.test(t || ''), W = ctx.size.w - 112;
  const bt = (cxi, base, cls, t) => box(cxi, topForBaseline(ctx, 'body', 400, 15, 1.6, base), 280, 0, `color:${ink}`, `<p class="r-t15 ${cls}">${A(t)}</p>`);
  const y0 = y + 40;
  let h = bt(cx[0], y + 17, 'r-w600', `${c.paidLabel || 'Entry'} times`);
  if (isT(c.from) && isT(c.to)) h += bt(cx[3], y + 17, '', `${c.from.replace(/\.$/, '')}. ${c.to.replace(/\.$/, '')}.`);
  rows.forEach((d, i) => {
    const t = y0 + i * rowH, [date, time] = d.when.split(/,\s*/);
    h += box(x, t, W, 1, `background:${ink}`) + bt(cx[0], t + 30, 'r-w500', date) +
      box(cx[1], topForBaseline(ctx, 'display', dw, 28, 1, t + 31), 280, 0, `color:${ink};font-size:28px;line-height:1`, `<p class="disp r-nw">${A((time || '').replace(/(\d) ([ap]m)\b/g, '$1\u00a0$2'))}</p>`) +
      bt(cx[2], t + 30, '', d.to) + bt(cx[3], t + 30, '', d.price || '');
  });
  return h + box(x, y0 + rows.length * rowH, W, 1, `background:${ink}`);
}

// How far a scene's art is shrunk on the page: the mean width of the scene's quads on the page, over the art's own width. pageK is the scene px to page px scale.
const quadEdge = (q) => { const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]); return (d(q[0], q[1]) + d(q[3], q[2])) / 2; };
const sceneK = (ctx, id, artW, pageK) => { const qs = ctx.sceneInfo(id).quads; return (qs.reduce((a, q) => a + quadEdge(q.corners), 0) / qs.length) * pageK / artW; };

// The logo, or in the slot edition the one frame this theme draws, on every object: a dashed line that reads 1.5 px and a 12 px body label as they land on the page
// (k is the scale the art is shown at). The label is "Your logo goes here" where that fits and "Logo" alone where it does not; the ink is the ground's own.
// min is the width the frame needs to hold a label at all, used only on the smallest objects (the slot edition's frame grows there; the logo's does not).
const logoAt = (ctx, id, width, { k = 1, ink, colourway, min = 0, minH = 0 } = {}) => {
  if (ctx.edition !== 'slot') return ctx.logo.html(id, { width, colourway, color: ink });
  const g = ctx.logo.geos[id], w = Math.max(width, Math.min(min, 3 * width)), h = Math.max((w * g.h) / g.w, minH / k), line = +(1.5 / k).toFixed(2);
  const bw = ctx.brand.fonts.body.weights.includes(500) ? 500 : ctx.brand.fonts.body.weights[0], per = (t) => textW(ctx, 'body', bw, t, 100, 0) / 100;
  const room = w - 2 * line - 8 / k, high = h - 2 * line;
  let text = 'Your logo goes here', fs = 12 / k;
  if (per(text) * fs > room) text = 'Logo';
  fs = Math.min(fs, room / per(text), high / 1.2);
  return `<div class="logo-slot" role="img" aria-label="Logo slot" style="width:${px(w)}px;height:${px(h)}px;box-sizing:border-box;border:${line}px dashed ${ink};color:${ink};display:flex;align-items:center;justify-content:center;font:${bw} ${px(fs)}px/1.2 var(--body);text-align:center;white-space:nowrap">${text}</div>`;
};

// the poster, drawn flat at W x H (1 px to the millimetre of the panel's width): action ground, the line, the foot line, the logo. k is the scale it is shown at.
function posterArt(ctx, W, H, k = 1) {
  const act = byRole(ctx, 'action').hex, ink = inkOn(ctx, act), dw = dispW(ctx);
  const g = ctx.logo.geos.colour, lw = Math.min(700, Math.floor((190 * g.w) / g.h)), lh = lockH(ctx, lw), footB = Math.max(300, 110 + lh + 80);
  const fit = fitLines(ctx, lineMap(ctx).wall, 200, 96, W - 192, H - 120 - footB - 124 - 96, 0.98);
  const foot = lineMap(ctx).wallFoot.split(/(?<=\.) /);
  return `<div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;background:${act}">` +
    ab(96, 120, W - 192, `color:${ink};font-size:${fit.size}px;line-height:0.98;font-stretch:${ctx.brand.fonts.display.stretch || 100}%`, fit.lines.map((l) => `<p class="disp" style="margin:0;white-space:nowrap">${A(l)}</p>`).join('')) +
    abB(96, footB, W - 192, `color:${ink};font:500 46px/62px var(--body)`, foot.map((l) => `<p style="margin:0">${A(l)}</p>`).join('')) +
    abB(96, 110, lw, '', logoAt(ctx, 'colour', lw, { k, ink, colourway: logoOn(ctx, act) })) + `</div>`;
}

// the shot's quad as width and height of the panel in the photo, to size the poster art to the panel it goes on
function quadAspect(q) {
  const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  return ((d(q[0], q[1]) + d(q[3], q[2])) / 2) / ((d(q[0], q[3]) + d(q[1], q[2])) / 2);
}

// the brand's own photograph with the poster set into its blank panel, in the page itself: the poster is warped onto the quad, and a grey copy of the
// photo, clipped to the quad and multiplied over it, carries the panel's own light. Nothing is laid over the photo outside the panel.
function shelterHero(ctx, s, x, y, w, h) {
  const n = jpegSize(), c = s.crop || { x: 0, y: 0, w: n.w, h: n.h }, q = s.quad;
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) / 2, oy = (h - c.h * k) / 2;
  const AW = 1185, AH = Math.round(AW / quadAspect(q)), url = A(ctx.photoUrl(s.photo));
  const poly = q.map((p) => `${p[0]}px ${p[1]}px`).join(',');
  const full = `position:absolute;left:0;top:0;width:${n.w}px;height:${n.h}px`;
  const inner = `${plateImg(`${url}`, `${A(s.alt)}`, `${full};display:block;max-width:none`)}` +
    `<div style="${full};clip-path:polygon(${poly})"><div style="width:${AW}px;height:${AH}px;transform-origin:0 0;transform:${quadMatrix(AW, AH, q)}">${posterArt(ctx, AW, AH, (quadEdge(q) * k) / AW)}</div></div>` +
    `<div style="${full};clip-path:polygon(${poly});mix-blend-mode:multiply">${plateImg(`${url}`, ``, `${full};display:block;max-width:none;filter:grayscale(1) brightness(0.98)`)}</div>`;
  return { html: box(x, y, w, h, 'overflow:hidden', `<div style="position:absolute;left:${px(ox - c.x * k)}px;top:${px(oy - c.y * k)}px;width:${n.w}px;height:${n.h}px;transform:scale(${k});transform-origin:0 0;isolation:isolate">${inner}</div>`), AW, AH };
}

// the two sides of the business card, drawn flat at 12 px to the millimetre (90 x 55 mm)
function cardArt(ctx) {
  const B = ctx.brand, c = B.applications.card, rev = B.logo.colourways.reversed, txt = byRole(ctx, 'text'), grd = byRole(ctx, 'ground'), W = 1080, H = 660;
  const g = ctx.logo.geos.reversed || ctx.logo.geos.colour, lw = Math.min(620, Math.floor((300 * g.w) / g.h)), lhh = lockH(ctx, lw), ly = Math.round(70 + (450 - lhh) / 2), tint = chromeOn(ctx, grd.hex);
  const k = sceneK(ctx, 'counter-till-cards', W, 496 / 1200), symW = ctx.edition === 'slot' ? Math.max(96, Math.ceil(30 / k)) : 96;
  const front = `<div style="position:absolute;inset:0;background:${txt.hex}">${ab(96, ly, lw, '', logoAt(ctx, 'reversed', lw, { k, ink: rev.name }))}${abB(96, 70, 888, `color:${rev.name};font:500 30px/36px var(--body)`, `<p style="margin:0">${A(lineMap(ctx).card)}</p>`)}</div>`;
  const back = `<div style="position:absolute;inset:0;background:${grd.hex}">${ab(984 - symW, 84, symW, '', logoAt(ctx, 'symbol', symW, { k, ink: inkOn(ctx, grd.hex) }))}${ab(96, 330, 888, `color:${inkOn(ctx, grd.hex)};font:500 40px/48px var(--body)`, `<p style="margin:0">${A(c.person)}</p>`)}${ab(96, 384, 888, `color:${tint};font:400 28px/36px var(--body)`, `<p style="margin:0">${A(c.role)}</p>`)}${abB(96, 84, 888, `color:${inkOn(ctx, grd.hex)};font:400 28px/42px var(--body)`, `<p style="margin:0">${A(c.contact)}</p><p style="margin:0">${A(B.applications.site.url)}</p>`)}</div>`;
  const art = (inner) => ({ html: ctx.artPage(inner, { w: W, h: H }), w: W, h: H });
  return { 'card-front': art(front), 'card-back': art(back) };
}

// the Track screen at 390 x 844, as the app draws it: the kit's own phone screen with the brand's logo in the header
function phoneArt(ctx, k) {
  const lg = logoAt(ctx, 'horizontal', 84, { k, ink: L(ctx).text, colourway: 'colour', min: Math.ceil(40 / k), minH: 16 });
  return { 'screen-phone': { html: ctx.artPage(phoneScreen(ctx, { logo: lg, cls: 'r-ph' }), { w: 390, h: 844 }), w: 390, h: 844 } };
}

export const r1 = {
  cover(ctx) {
    const B = ctx.brand, W = ctx.size.w, bandTop = 536, bandH = ctx.size.h - bandTop;
    const act = byRole(ctx, 'action'), txt = byRole(ctx, 'text'), rev = B.logo.colourways.reversed, g = ctx.logo.geos.colour;
    const s = shotFor(ctx, 'cover', new Set());
    const ink = rev.name, chrome = chromeOn(ctx, txt.hex);
    // With a photo: the lockup is 640 wide (smaller when the name is tall, so it fits the band with 40 px above and below), the brand line sits at the right.
    // With no photo (the common case): the action field carries the brand's own line at display scale (96 / 0.98, in the field's ink, x 56, last baseline y 480, so a descender
    // keeps 32 px to the band) with the brand's entry times above it as a table, and the band takes the horizontal lockup at 480 wide (the stacked one at 240 if the brand has no
    // horizontal), centred in the band. The line is not repeated in the band.
    let field, id, lw, third;
    if (s) { field = cropped(ctx, s, 0, 0, W, bandTop); id = 'reversed'; lw = Math.floor(Math.min(640, ((bandH - 80) * g.w) / g.h)); third = B.lines.primary; }
    else {
      const dw = dispW(ctx), fit = fitSet(ctx, 'display', dw, lineMap(ctx).cover, 96, 56, W - 112, 2, -0.01), n = fit.lines.length, onAct = inkOn(ctx, act.hex);
      const top0 = topForBaseline(ctx, 'display', dw, fit.size, 0.98, 480 - (n - 1) * fit.size * 0.98);
      field = box(0, 0, W, bandTop, `background:${act.hex}`) + box(56, top0, W - 112, 0, `color:${onAct};font-size:${fit.size}px;line-height:0.98;letter-spacing:-0.01em`, `<h2 class="disp">${lineHtml(fit.lines)}</h2>`) + timetable(ctx, 56, 56, onAct);
      [id, lw] = ctx.logo.geos.horizontal ? ['horizontal', 480] : ['stacked', 240]; third = lineMap(ctx).band;
    }
    const lg = ctx.logo.geos[id], lh = (lw * lg.h) / lg.w, top = bandTop + (bandH - lh) / 2, lockup = logoAt(ctx, id, lw, { ink, colourway: 'reversed' });
    const right = box(944, top, 280, lh, '', `<p class="r-t15 r-w600" style="color:${ink}">Brand guidelines</p><p class="r-t12" style="color:${chrome}">${A(ctx.versionLine)}</p>${third ? `<p class="r-t15 r-w500 r-bot" style="color:${ink}">${A(third)}</p>` : ''}`, 'r-col');
    return page('cover', 'r-cover', `${field}${box(0, bandTop, W, bandH, `background:${txt.hex}`)}${box(56, top, lw, lh, '', lockup)}${right}`, txt.hex);
  },

  personality(ctx) {
    const B = ctx.brand, W = ctx.size.w, n = B.personality.length, fw = W / n;
    const fields = [L(ctx).sunken, byRole(ctx, 'action').hex, byRole(ctx, 'text').hex];
    const hex = (i) => fields[i % 3], colW = fw - 112;
    // all traits take the smallest size that fits every word on one line (floor 32)
    const size = ctx.placeholders ? 15 : fitSize(ctx, 'display', dispW(ctx), B.personality.map((t) => t.trait), 54, 32, colW, 1); // slot: the trait is a compact placeholder, 15 px so its label sits on one line
    const cells = B.personality.map((t, i) => {
      const bg = hex(i), ink = inkOn(ctx, bg), x = i * fw + 56;
      return box(i * fw, 0, fw, 576, `background:${bg}`) + box(x, 104, colW, 96, `color:${ink}`, `<p class="r-t15">${A(sayOnce(ctx, t.means))}</p>`) +
        box(x, topForBaseline(ctx, 'display', dispW(ctx), size, 1, 536), colW, 0, `color:${ink};font-size:${size}px;line-height:1`, `<h2 class="disp r-nw">${A(t.trait)}</h2>`);
    }).join('');
    const gr = L(ctx).surface;
    const pl = lineMap(ctx).pers, foot = pl.map((l, i) => box(fw * (i + n - pl.length) + 56, 600, colW, 56, `color:${L(ctx).text}`, `<p class="r-lead">${lineHtml(wrapLines(ctx, 'body', 500, l, 22, colW, 0, false))}</p>`)).join('');
    return page('personality', '', `${cells}${foot}${head(ctx, 'personality', { left: hex(0), right: hex(Math.min(n, 3) - 1) })}`, gr);
  },

  palette(ctx) {
    const B = ctx.brand, V = B.voice.principles, act = byRole(ctx, 'action'), gr = L(ctx).surface, W = ctx.size.w;
    const rank = { text: 0, panel: 1, accent: 2, ground: 4 };
    const rest = ctx.colours.filter((c) => c !== act).sort((a, b) => (rank[a.role] ?? 3) - (rank[b.role] ?? 3));
    const cs = [act, ...rest], onAct = ctx.pairs.filter((p) => p.bgHex === act.hex), fgs = onAct.filter((p) => !p.large).map((p) => nameOfHex(ctx, p.fgHex)), big = onAct.find((p) => p.large);
    const lead = `${cs.length} colours, each named for where it lands. ${act.name} is the one people see us by.${fgs.length ? ` ${fgs[0]} type goes on it${big ? `, and ${nameOfHex(ctx, big.fgHex)} type only from ${big.minSize} px` : ''}.` : ''}`;
    const sentences = [null, V[0].example, V[1].example, V[3 % V.length].example];
    const leadW = W * 0.4, otherW = (W - leadW) / (cs.length - 1), hlLine = lineMap(ctx).palHead;
    const hl = fitSet(ctx, 'display', dispW(ctx), hlLine, 54, 36, leadW - 80, 2, -0.01), hlSize = hl.size;
    let x = 0;
    const fieldsHtml = cs.map((c, i) => {
      const w = i === 0 ? leadW : otherW, tx = i === 0 ? 56 : x + 24, tw = i === 0 ? 400 : w - 48, ink = inkOn(ctx, c.hex), ch = chromeOn(ctx, c.hex);
      const nameSize = i === 0 ? 40 : 26, edge = c.role === 'ground' ? 'box-shadow:inset 1px 0 0 ' + L(ctx).divider : '';
      const html = box(x, 128, w, 592, `background:${c.hex};${edge}`) +
        (i === 0 ? box(tx, 160, 432, 0, `color:${ink};font-size:${hlSize}px;line-height:1.02`, `<p class="disp">${lineHtml(hl.lines)}</p>`) : box(tx, 160, tw, 0, `color:${ink}`, `<p class="r-t15 ${c.role === 'text' ? 'r-w600' : 'r-w500'}">${A(sentences[Math.min(i, 3)]).replace(/(\d) ([ap]m)\b/g, '$1&nbsp;$2')}</p>`)) +
        box(tx, topForBaseline(ctx, 'display', dispW(ctx), nameSize, 1.05, 580), tw, 0, `color:${ink};font-size:${nameSize}px;line-height:1.05`, `<p class="disp r-nw">${A(c.name)}</p>`) +
        box(tx, 592, tw, 48, `color:${ch}`, `<p class="r-t12">${A(c.lands)}</p>`) + box(tx, 656, tw, 16, `color:${ink}`, `<p class="r-mono num">${A(c.hex)}</p>`) +
        box(tx, 676, tw, 16, `color:${ch}`, `<p class="r-t12 r-nw num">${values(c)}</p>`);
      x += w; return html;
    }).join('');
    return page('palette', '', `${box(56, 72, 760, 48, `color:${L(ctx).textSoft}`, `<p class="r-t15">${lineHtml(wrapLines(ctx, 'body', 400, lead, 15, 760, 0, false))}</p>`)}${fieldsHtml}${head(ctx, 'palette')}`, gr);
  },

  typefaces(ctx) {
    const B = ctx.brand, F = B.fonts, d = F.display, b = F.body, m = F.mono, sc = B.type.scale, ground = byRole(ctx, 'text').hex, W = ctx.size.w;
    const white = L(ctx).surface, soft = ctx.roles.dark.textSoft, ch = chromeOn(ctx, ground), wname = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold' };
    const toks = (f) => sc.filter((s) => s.face === f).map((s) => s.token).join(', ');
    const hair = ctx.ratio(L(ctx).textSoft, ground) > 1.3 ? L(ctx).textSoft : ctx.roles.dark.divider;
    const dw = dispW(ctx), name = d.family, size = fitSize(ctx, 'display', dw, [name], 200, 140, 1000, 1, -0.02);
    const f = loadFont(face(ctx, 'display', dw).stem), lsb = outline(f, name[0], size, 0).x1, capTop = topForBaseline(ctx, 'display', dw, size, 0.9, 160 + capHeight(f, size));
    const one = lineMap(ctx).specimen; // one sentence, so each weight sample sets on one line
    const weights = b.weights.slice(0, 3).map((w, i) => box([352, 648, 944][i], 500, 264, 0, `color:${ch}`, `<p class="r-t12">${wname[w] || w} ${w}</p><p class="r-t18 r-nw" style="color:${white};font-weight:${w}">${A(one)}</p>`)).join('');
    const note = `Weight ${d.weights.join(', ')}${d.stretch ? `, width ${d.stretch}` : ''}.${d.italics ? ` Italic ${d.italics.join(', ')} too.` : ''} Used for ${toks('display')}.`;
    const inner = box(56, 72, 560, 48, `color:${soft}`, `<p class="r-t15">${lineHtml(wrapLines(ctx, 'body', 400, `Two faces do the work. ${d.family} sets the line you read first. ${b.family} carries everything after it.`, 15, 560, 0, false))}</p>`) +
      box(944, 72, 280, 32, `color:${ch}`, `<p class="r-t12 r-w600" style="color:${white}">Display</p><p class="r-t12">${A(note)}</p>`) +
      box(56 - lsb, capTop, 0, 0, `color:${white};font-size:${size}px;line-height:0.9;letter-spacing:-0.02em`, `<h2 class="disp r-nw" style="letter-spacing:-0.02em">${A(name)}</h2>`) +
      box(56, 352, 860, 90, `color:${white}`,`<p class="disp r-set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p>`) +
      box(56, 480, W - 112, 1, `background:${hair}`) +
      box(56, 500, 260, 0, `color:${ch}`, `<p class="r-t22" style="color:${white}">${A(b.family)}</p><p class="r-t12 r-w600" style="color:${white}">Body</p><p class="r-t12">Used for ${A(toks('body'))}.</p>`) + weights +
      box(944, 352, 280, 0, `color:${ch}`,`<p class="r-mono r-t22 num" style="color:${white}">${A(L(ctx).action)}</p><p class="r-t12 r-w600" style="color:${white}">${A(m.family)}</p><p class="r-t12">Only for a hex, a token or a code string.</p>`) +
      box(56, 648, 560, 32, `color:${ch}`, `<p class="r-t12">${A(d.family)}, ${A(b.family)} and ${A(m.family)} are open source under the SIL Open Font Licence. ${A(onceRe(ctx)?.test('Free to use in print and on screen, and free to download from Google Fonts.') ? 'Use them in print and on screen, and download them from Google Fonts.' : 'Free to use in print and on screen, and free to download from Google Fonts.')}</p>`) +
      head(ctx, 'typefaces', { left: ground });
    return page('typefaces', 'r-dark', inner, ground);
  },

  // Applications: three photographed objects (the shelter poster, the card, the phone). The type stays at 12 px and sits in the white strips.
  'business-card'(ctx) {
    const B = ctx.brand, act = byRole(ctx, 'action'), grd = byRole(ctx, 'ground'), rev = B.logo.colourways.reversed, soft = L(ctx).quiet, ink = L(ctx).text;
    const cap = (x, y, w, label, text) => box(x, y, w, 0, '', `<p class="r-t12" style="color:${soft}"><span class="r-w600" style="color:${ink}">${A(label)}</span> ${A(text)}</p>`);
    // a scene photograph cropped to a box: the scene's own pixels, the crop given in scene px
    const crop = (url, sw, sh, c, x, y, w, h, alt) => { const k = Math.max(w / c.w, h / c.h); return box(x, y, w, h, 'overflow:hidden', `${plateImg(`${A(url)}`, `${A(alt)}`, `position:absolute;display:block;max-width:none;width:${px(sw * k)}px;height:${px(sh * k)}px;left:${px((w - c.w * k) / 2 - c.x * k)}px;top:${px((h - c.h * k) / 2 - c.y * k)}px`)}`); };
    const shot = B.imagery.shots.find((s) => s.photo && s.quad && (s.use || []).includes('scene'));
    let hero;
    if (shot) hero = shelterHero(ctx, shot, 0, 72, 768, 600).html;
    else {
      // no scene photograph of the brand's own: the theme's poster wall, centred on the poster
      const sc = ctx.sceneInfo('room-gallery-panel'), q = sc.quads[0], art = { html: ctx.artPage(posterArt(ctx, 1185, Math.round(1185 / q.aspect), sceneK(ctx, 'room-gallery-panel', 1185, 768 / sc.w)), { w: 1185, h: Math.round(1185 / q.aspect) }), w: 1185, h: Math.round(1185 / q.aspect) };
      const cy = q.corners.reduce((a, p) => a + p[1], 0) / 4, ch = (600 * sc.w) / 768;
      hero = crop(ctx.mockup('room-gallery-panel', { panel: art }), sc.w, sc.h, { x: 0, y: Math.max(0, Math.min(sc.h - ch, cy - ch / 2)), w: sc.w, h: ch }, 0, 72, 768, 600, `${B.name} poster on a wall`);
    }
    const cs = ctx.sceneInfo('counter-till-cards'), cardUrl = ctx.mockup('counter-till-cards', cardArt(ctx));
    // the card and phone frames are 496 x 280: the window of each scene that holds its surfaces, in scene px
    const cardWin = { x: 168, y: 330, w: 1200, h: 677 }, phoneWin = { x: 0, y: 133, w: 1024, h: 578 };
    const ps = ctx.sceneInfo('kerb-crossing-phone'), phoneUrl = ctx.mockup('kerb-crossing-phone', phoneArt(ctx, sceneK(ctx, 'kerb-crossing-phone', 390, 496 / 1024)));
    const live = B.ui.status.find((t) => t.id === B.ui.screen.content.deliveries[0].status), liveTone = live && live.tone === 'action';
    const [spec] = B.applications.signage.split(': ');
    const dim = ctx.brand.applications.signage.includes('x') ? spec.replace(/ x /g, ' × ') : spec;
    const inner = hero +
      crop(cardUrl, cs.w, cs.h, cardWin, 784, 72, 496, 280, `${B.name} business card, front and back, on a till counter`) +
      crop(phoneUrl, ps.w, ps.h, phoneWin, 784, 392, 496, 280, `${B.name} ${B.ui.screen.title} screen on a phone at a crossing`) +
      cap(800, 364, 424, 'Business card, 90 × 55 mm.', `Front reversed on ${nameOfHex(ctx, rev.ground)}, back on ${grd.name}.`) +
      cap(56, 680, 700, `${dim}.`, `${act.name} field, the line and the logo in ${nameOfHex(ctx, inkOn(ctx, act.hex))}.`) +
      cap(800, 680, 424, `${B.ui.screen.title} screen, 390 px.`, `${liveTone ? `The arrival time is the largest line. ${act.name} marks the live status only.` : `The time is the largest line. ${act.name} is spent once on the screen.`}`) +
      head(ctx, 'business-card', { title: 'Applications' });
    return page('business-card', '', inner, L(ctx).surface);
  },

  // Layouts: three real slides, each built as a full 1280 x 720 slide and scaled, so the type on them is the type on the real slide.
  layouts(ctx) {
    const B = ctx.brand, act = byRole(ctx, 'action'), txt = byRole(ctx, 'text'), V = B.voice.principles, dw = dispW(ctx), cols = B.layout.columns || 12;
    const ink = L(ctx).text, soft = L(ctx).textSoft, quiet = L(ctx).quiet, panelHex = L(ctx).sunken, onAct = inkOn(ctx, act.hex);
    const dispCss = (size, lh, color) => `color:${color};font-size:${size}px;line-height:${lh};font-stretch:${B.fonts.display.stretch || 100}%`;
    const slide = (x, y, k, inner) => box(x, y, 1280 * k, 720 * k, 'overflow:hidden', `<div style="position:absolute;left:0;top:0;width:1280px;height:720px;zoom:${k};overflow:hidden;background:${L(ctx).surface}">${inner}</div>`) +
      box(x, y, 1280 * k, 720 * k, `box-shadow:inset 0 0 0 1px ${panelHex}`);
    const cap = (x, y, w, label, text) => box(x, y, w, 0, '', `<p class="r-t12 r-w600" style="color:${ink}">${A(label)}</p><p class="r-t12" style="color:${quiet}">${A(text)}</p>`);

    // poster: the photograph across 8 of 12 columns, the line and the logo on the action colour
    const LM = lineMap(ctx), s = shotFor(ctx, 'poster', new Set()), headline = LM.lposter, pw = 363;
    const words = headline.split(' '), ps = fitSize(ctx, 'display', dw, words, 54, 40, pw, 1);
    const pLines = wrapLines(ctx, 'display', dw, headline, ps, pw, -0.01, false);
    const lw = 220, lh = lockH(ctx, lw), kp = 0.25;
    // with no photograph the 8 columns are a typographic poster of the show: its title at display scale in the display italic (the brand's rule for names of shows),
    // and its wall label at the foot (artist, room, time), all from the product screen. The one logo stays on the action colour.
    const ct = screenContent(ctx), d0 = (ct.deliveries || [])[0], it = B.fonts.display.italics;
    const artist = (ct.rider || '').split(',')[0].trim(), lab = [artist, ct.deliverTo, d0 && d0.when].filter(Boolean);
    const tsz = d0 ? fitSize(ctx, 'display', dw, [d0.to], 200, 48, 725, 1, -0.02) : 0;
    const wall = ab(0, 0, 837, `height:720px;background:${panelHex}`) +
      (d0 ? ab(56, 56, 725, `${dispCss(tsz, 0.95, ink)};letter-spacing:-0.02em;${it ? 'font-style:italic' : ''}`, `<p class="disp" style="white-space:nowrap">${A(d0.to)}</p>`) +
        abB(56, 56, 560, `font:400 20px/28px var(--body);color:${soft}`, lab.map((t, n) => `<p${n ? '' : ` style="font-weight:600;color:${ink}"`}>${A(t)}</p>`).join('')) : '');
    const left = s ? cropped(ctx, s, 0, 0, 837, 720) : wall;
    const poster = left + ab(837, 0, 443, `height:720px;background:${act.hex}`) +
      ab(877, 56, pw, dispCss(ps, 1.02, onAct), pLines.map((l) => `<p class="disp" style="white-space:nowrap">${A(l)}</p>`).join('')) +
      ab(877, 664 - lh, lw, '', logoAt(ctx, 'colour', lw, { k: kp, ink: onAct, colourway: logoOn(ctx, act.hex) }));

    // editorial: headline on 5 columns, text on 4, the product flat on the panel colour across the last 6
    const e = fitLines(ctx, LM.editorial, 54, 36, 461.3, 200, 1.02, false), eh = e.lines.length * e.size * 1.02;
    const bodyTop = Math.max(220, Math.round(56 + eh + 32));
    const editorial = ab(56, 56, 461.3, dispCss(e.size, 1.02, ink), e.lines.map((l) => `<p class="disp" style="white-space:nowrap">${A(l)}</p>`).join('')) +
      ab(56, bodyTop, 362.7, `color:${soft};font:400 20px/28px var(--body)`, `<p>${A(sayOnce(ctx, B.voice.boilerplate50))}</p>`) +
      abB(56, 56, 362.7, `color:${quiet};font:400 18px/24px var(--body)`, `<p>${A(B.type.sample.caption)}</p>`) +
      ab(648, 56, 576, `height:608px;background:${panelHex}`) +
      ab(648 + (576 - 242) / 2, 96, 242, 'height:523px;overflow:hidden', `<div style="zoom:0.62;width:390px;height:844px">${phoneScreen(ctx, { logo: logoAt(ctx, 'horizontal', 84, { k: 0.62 * 0.4437, ink, colourway: 'colour', min: Math.ceil(40 / (0.62 * 0.4437)), minH: 16 }), cls: 'r-ph' })}</div>`) +
      ab(648 + (576 - 242) / 2, 96, 242, `height:523px;box-shadow:0 0 0 1px ${ink}`);

    // statement: one line across 9 columns, three notes of 4 columns under it
    const st = fitSet(ctx, 'display', dw, LM.statement, 80, 48, 872, 2), sl = st.lines, ss = st.size;
    const notes = [V[0], V[1], V[3 % V.length]];
    const statement = ab(56, 56, 872, dispCss(ss, 0.95, ink), sl.map((l) => `<p class="disp" style="white-space:nowrap">${A(l)}</p>`).join('')) +
      notes.map((n, i) => { const x = 56 + i * 394.7; return ab(x, 480, 362.7, `height:2px;background:${ink}`) + ab(x, 496, 362.7, '', `<p style="font:600 18px/26px var(--body);color:${ink}">${A(n.title)}</p><p style="font:400 18px/26px var(--body);text-wrap:balance;color:${soft}">${A(n.example)}</p>`); }).join('');

    // the two layouts with the most to read (the Editorial and the Statement) side by side at the larger scale; the Poster, a photograph and one line, is
    // readable small, so it sits under them with the page's lead beside it
    const lead = `Three layouts on a ${cols}-column grid.`, kt = 0.4437, tw = 1280 * kt;
    const inner = slide(56, 96, kt, editorial) + cap(56, 423, tw, 'Editorial', `Headline on columns 1 to 5, text under it on 1 to 4. The product, flat on ${nameOfHex(ctx, panelHex)}, takes 7 to 12.`) +
      slide(56 + tw + 24, 96, kt, statement) + cap(56 + tw + 24, 423, tw, 'Statement', 'One line across 9 columns. Three notes under it, 4 columns each.') +
      slide(56, 488, 0.25, poster) +
      box(56 + 320 + 24, 488, 600, 48, `color:${soft}`, `<p class="r-t15">${lineHtml(wrapLines(ctx, 'body', 400, lead, 15, 600, 0, false))}</p>`) +
      cap(56 + 320 + 24, 540, 600, 'Poster', `${s ? 'Photo' : 'Field'} across 8 of ${cols} columns. The line and the logo take the other 4, on ${act.name}.`) +
      head(ctx, 'layouts');
    return page('layouts', '', inner, L(ctx).surface);
  },
};
