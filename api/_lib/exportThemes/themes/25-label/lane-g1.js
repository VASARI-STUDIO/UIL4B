// Theme 25, Label, lane g1: the brand and voice pages (contents, intro, voice, write-this, messaging, summary, contact-scope).
// Every page is still one wall: one object, or one keyed group, hung on the centre of the hang and the sightline, the wall title at x 712, y 96, and the label card fixed
// at x 712, y 416. What changes is the object, and each is a real thing a gallery or the brand would print: a room guide, an introduction panel, a run of didactic strips,
// a vitrine of copy, a poster with its press sheets, a one-page sheet and a compliments slip. Free, so every object is flat and drawn from brand data.
// Free, so only write-this and summary are built here, with folios from the Free twelve (helpers.folio) and cross-references only to pages in the twelve; the other
// five pages are kept, unexported, for a Pro edition and number themselves from ctx.pageNo. This lane also corrects personality's credit (see the foot of the file).
// Every brand string is printed whole, through esc, never cut.
import { guidelines as round1 } from './guidelines.js';
import { FREE_TWELVE, folio, roles, solid, key, hung, hungX, token, wrapLines, advance, tie, wallText, labelCard, A, px, numberWord, longDate, NB, WALLTEXT, OBJ_TOP, OBJ_BOTTOM, HANG } from './helpers.js';

const MAX_H = OBJ_BOTTOM - OBJ_TOP;                       // 576: the tallest an object may hang
const MAX_W = HANG.x1 - HANG.x0;                         // 616: the widest
const even = (n) => Math.ceil(n / 2) * 2;                // hung() refuses odd sizes, which would sit half a pixel off the sightline

// ---- the page, as helpers.page() builds it, with an optional foot-left line. A page of the Free twelve takes its folio from the twelve; a draft page from the full book ----
const fol = (ctx, id) => (FREE_TWELVE.includes(id) ? folio(id) : String(ctx.pageNo(id)).padStart(3, '0'));
const seeAlso = (ctx, id, name) => `See also ${name}, page ${fol(ctx, id)}`;
function page(ctx, id, { object, wall, label, foot = '' }) {
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg" data-page="${id}">${head}<div class="hang">${object}</div>${wallText(ctx, id, wall)}${labelCard(ctx, id, label)}`
    + `${foot ? `<div class="g1-fl">${A(foot)}</div>` : ''}<div class="fo num">${fol(ctx, id)}</div></section>`;
}

// A lighter binding than tie() for large display lines: a number stays with the word after it and the last two words stay together. tie() also binds a word to the
// number after it and chains short words, which in a large line makes runs like "at 10:52 from 88 Brunswick" that leave a word alone on the next line.
const light = (s) => s.replace(/(\d) (?=\S)/g, `$1${NB}`).replace(/ (\S+)$/, `${NB}$1`);

// ---- measuring ----
// the display sizes from one of the brand's tokens down to another, in steps of 2 px, each with its line height at the upper token's ratio
function dispSizes(ctx, from, to) {
  const a = token(ctx, from), b = token(ctx, to), out = [];
  for (let s = a.size; s >= b.size; s -= 2) out.push({ size: s, line: Math.round(s * a.line / a.size) });
  return out;
}
// how many lines `text` sets in, or Infinity when a run is wider than the box
const count = (ctx, role, weight, size, text, width) => { try { return wrapLines(ctx, role, weight, size, text, width).length; } catch { return Infinity; } };
const widest = (ctx, role, weight, size, lines) => Math.max(...lines.map((l) => advance(ctx, role, weight, l, size) * 1.04));
// The wall title: the first of `options` that sets in two lines at 28 px, bound the way wallText binds it; a wide display face falls back to a shorter name
const wallTitle = (ctx, ...options) => options.find((t) => count(ctx, 'display', ctx.weights.heading, 28, tie(t, { tail: false, max: 14 }), WALLTEXT.w) <= 2) || options[options.length - 1];
// a block of text placed inside an object; children of an object are absolutely placed by the theme's css
const txt = (x, y, w, cls, style, text) => `<div class="${cls}" style="left:${px(x)};top:${px(y)};width:${px(w)};${style}">${A(text)}</div>`;

// ---- 002 contents: the room guide by the door. The sections as a directory board, each at the page it starts on ----
function contents(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, secs = ctx.sections;
  const BW = 416, pad = 40, noW = 48, tw = BW - 2 * pad - noW;
  // one size for every row: the largest from the title token down that sets each section's name on one line
  const S = dispSizes(ctx, 'title', 'title').concat([{ size: 20, line: 24 }, { size: 18, line: 22 }])
    .find((s) => secs.every((x) => count(ctx, 'display', W.heading, s.size, tie(x.title), tw) === 1)) || { size: 16, line: 20 };
  const rowH = S.line + 20, nameT = token(ctx, 'title');
  const head = tie(B.name, { max: 30 }), hl = count(ctx, 'display', W.heading, nameT.size, head, BW - 2 * pad);
  const BH = even(Math.min(MAX_H, pad + hl * nameT.line + 48 + secs.length * rowH + pad - 20));
  const y0 = BH - pad - secs.length * rowH + 20;
  // the page number sits on the row's baseline in the chrome face, as a room number is set on a gallery's directory
  const rows = secs.map((s, i) => {
    const y = y0 + i * rowH;
    return `<div class="g1-no num" style="left:${pad}px;top:${px(y + S.line - 20)};color:var(--quiet-panel)">${fol(ctx, s.pages[0].id)}</div>`
      + txt(pad + noW, y, tw, 'disp g1-nw', `font-size:${S.size}px;line-height:${S.line}px;color:${R.ink}`, tie(s.title));
  }).join('');
  const name = txt(pad, pad, BW - 2 * pad, 'disp', `font-size:${nameT.size}px;line-height:${nameT.line}px;color:${R.ink}`, head);
  const object = solid(R, hungX(BW), hung(BH), BW, BH, R.panel, name + rows);
  return page(ctx, 'contents', {
    object, wall: { title: 'Contents' },
    label: {
      title: 'How to read this book', detail: `${numberWord(secs.length)} sections, ${ctx.pages.length} pages.`,
      paragraph: 'Each page hangs one thing on the wall. This label says what it is, and where to read more.',
      credit: seeAlso(ctx, 'intro', 'Who we are'),
    },
  });
}

// ---- 003 intro: the introduction panel at the door of a room. The brand's own description, large, on a dark panel ----
function intro(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights;
  const PW = 576, PH = 448, pad = 40, tw = PW - 2 * pad;
  const text = light(B.description);
  // the largest size from the headline token down that sets the description in no more than seven lines inside the panel
  const S = dispSizes(ctx, 'headline', 'title').find((s) => { const n = count(ctx, 'display', W.heading, s.size, text, tw); return n <= 7 && n * s.line <= PH - 2 * pad; })
    || token(ctx, 'title');
  const fg = R.onColour(R.ink, S.size, W.heading);
  const object = solid(R, hungX(PW), hung(PH), PW, PH, R.ink, txt(pad, pad, tw, 'disp g1-gr', `font-size:${S.size}px;line-height:${S.line}px;color:${fg}`, text));
  const where = B.city ? `${B.name}, ${B.city}` : B.name;
  return page(ctx, 'intro', {
    object, wall: { title: wallTitle(ctx, 'Who we are', 'About') },
    label: {
      title: where,
      items: [{ term: 'Audience:', text: B.audience }, { term: 'Product:', text: B.product }], mode: 'inline',
      credit: seeAlso(ctx, 'personality', 'Personality'),
    },
  });
}

// ---- 005 voice: one didactic strip per principle, each carrying the brand's own example, hung as a keyed column of unequal lengths ----
function voice(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, ps = B.voice.principles;
  const padX = 24, padY = 20, gap = 40, maxText = MAX_W - 2 * padX;
  const ex = ps.map((p) => light(p.example));
  // one size for all four: the largest from the headline token down where every example sets in three lines or fewer and the column fits the hang
  const fits = (s) => {
    const ls = ex.map((t) => { try { return wrapLines(ctx, 'display', W.heading, s.size, t, maxText); } catch { return null; } });
    if (ls.some((l) => !l || l.length > 3)) return null;
    const h = ls.reduce((a, l) => a + l.length * s.line + 2 * padY, 0) + gap * (ls.length - 1);
    return h <= MAX_H - 32 ? { ls, h } : null;
  };
  let S = null, F = null;
  for (const s of dispSizes(ctx, 'headline', 'title')) { F = fits(s); if (F) { S = s; break; } }
  if (!F) { S = token(ctx, 'title'); F = fits(S); }
  if (!F) throw new Error('voice: the examples do not fit the hang at the title size');
  // each strip is as narrow as its example allows without adding a line, so the lines come out even and the strips unequal; the example is set whole and the browser
  // breaks it greedily in that width (the measure carries 4% slack, so it breaks where it was measured)
  const tws = ex.map((t, i) => { const n = F.ls[i].length; let lo = 40, hi = maxText; while (hi - lo > 2) { const m = (lo + hi) / 2; if (count(ctx, 'display', W.heading, S.size, t, m) <= n) hi = m; else lo = m; } return Math.ceil(hi); });
  const widths = tws.map((w) => even(Math.min(MAX_W, w + 2 * padX)));
  const gw = Math.max(...widths), x0 = hungX(gw), gh = even(F.h);
  let y = hung(gh);
  const parts = F.ls.map((l, i) => {
    const h = l.length * S.line + 2 * padY, w = widths[i];
    const strip = solid(R, x0, y, w, h, R.panel, txt(padX, padY, w - 2 * padX, 'disp g1-gr', `font-size:${S.size}px;line-height:${S.line}px;color:${R.ink}`, ex[i]));
    const k = key(i + 1, x0, y + h);
    y += h + gap; return strip + k;
  }).join('');
  return page(ctx, 'voice', {
    object: parts, wall: { title: wallTitle(ctx, 'How we sound', 'Voice') },
    label: {
      title: `${numberWord(ps.length)} principles`, detail: 'Each with a line in use.',
      keys: ps.map((p, i) => ({ n: i + 1, text: p.title })), cols: 1,
      credit: seeAlso(ctx, 'write-this', 'Write this'),
    },
  });
}

// ---- 003 write-this: a vitrine of copy. Each pair is what we write, in ink, over what we cut, struck out, with the reason beside it ----
function writeThis(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, rows = B.voice.writeThis;
  const CW = MAX_W, pad = 32, gapC = 32, rightW = 192, leftW = CW - 2 * pad - gapC - rightW, rowGap = 24;
  const bt = token(ctx, 'body');
  const sizes = [{ size: bt.size, line: bt.line }, { size: 15, line: 22 }, { size: 14, line: 20 }];
  const measure = (s) => rows.map((r) => {
    const w = count(ctx, 'body', W.strong, s.size, tie(r.write), leftW), n = count(ctx, 'body', W.regular, 13, tie(r.not), leftW), b = count(ctx, 'body', W.regular, 13, tie(r.because), rightW);
    return { w, n, b, h: Math.max(w * s.line + 4 + n * 18, b * 18) };
  });
  let S = sizes[sizes.length - 1], M = measure(S);
  for (const s of sizes) { const m = measure(s); if (m.reduce((a, r) => a + r.h, 0) + rowGap * (rows.length - 1) + 2 * pad <= MAX_H) { S = s; M = m; break; } }
  const CH = even(M.reduce((a, r) => a + r.h, 0) + rowGap * (rows.length - 1) + 2 * pad);
  if (CH > MAX_H) throw new Error(`write-this: the vitrine is ${CH} px tall and the hang holds ${MAX_H}`);
  let y = pad;
  const inner = rows.map((r, i) => {
    const m = M[i], h = txt(pad, y, leftW, 'g1-w', `font-size:${S.size}px;line-height:${S.line}px;font-weight:${W.strong};color:${R.ink}`, tie(r.write))
      + txt(pad, y + m.w * S.line + 4, leftW, 'g1-not', '', tie(r.not))
      + txt(pad + leftW + gapC, y + (S.line - 18) / 2, rightW, 'g1-why', '', tie(r.because));
    y += m.h + rowGap; return h;
  }).join('');
  return page(ctx, 'write-this', {
    object: solid(R, hungX(CW), hung(CH), CW, CH, R.panel, inner), wall: { title: wallTitle(ctx, 'Write this, not that', 'Write this') },
    label: {
      title: `${numberWord(rows.length)} pairs`, detail: 'What we write, what we cut, and why.',
      paragraph: 'What we write is set in ink. What we cut is struck out under it. The reason sits beside each pair.',
      credit: seeAlso(ctx, 'personality', 'Personality'),
    },
  });
}

// ---- 007 messaging: the brand's line on a poster in its action colour, with the two boilerplates beside it as press sheets ----
function messaging(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, v = B.voice;
  const gap = 24, PW = 296, SW = MAX_W - PW - gap, pad = 24, sgap = 40;
  const words = (s) => s.trim().split(/\s+/).length;
  // the sheets: a caption with the real word count, then the text; the body token if both sheets fit the hang, else a step down
  const bt = token(ctx, 'body');
  const sheetH = (s, t) => even(pad + 16 + 12 + count(ctx, 'body', W.regular, s.size, tie(t), SW - 2 * pad) * s.line + pad);
  const S = [{ size: bt.size, line: bt.line }, { size: 15, line: 22 }, { size: 14, line: 20 }, { size: 13, line: 19 }]
    .find((s) => sheetH(s, v.boilerplate25) + sgap + sheetH(s, v.boilerplate50) <= MAX_H) || { size: 13, line: 19 };
  const h25 = sheetH(S, v.boilerplate25), h50 = sheetH(S, v.boilerplate50), colH = h25 + sgap + h50;
  const PH = even(Math.max(416, Math.min(MAX_H, colH)));
  const GH = Math.max(PH, colH), x0 = hungX(PW + gap + SW);
  // the poster: the primary line large at the top; the brand's other lines small at its foot
  const line = tie(B.lines.primary, { max: 16 });
  const others = B.lines.others.filter((l) => l !== B.lines.primary);
  const footH = others.reduce((a, l) => a + count(ctx, 'body', W.regular, 13, tie(l), PW - 2 * pad) * 18, 0) + 8 * Math.max(0, others.length - 1);
  const T = dispSizes(ctx, 'headline', 'title').find((s) => { const n = count(ctx, 'display', W.heading, s.size, line, PW - 2 * pad); return n <= 5 && n * s.line <= PH - 2 * pad - footH - 32; }) || token(ctx, 'title');
  const pfg = R.onColour(R.action, T.size, W.heading), sfg = R.onColour(R.action, 13, W.regular);
  let fy = PH - pad - footH;
  const foot = others.map((l) => { const n = count(ctx, 'body', W.regular, 13, tie(l), PW - 2 * pad), h = txt(pad, fy, PW - 2 * pad, 'g1-pf', `color:${sfg}`, tie(l)); fy += n * 18 + 8; return h; }).join('');
  const poster = solid(R, x0, hung(PH), PW, PH, R.action, txt(pad, pad, PW - 2 * pad, 'disp', `font-size:${T.size}px;line-height:${T.line}px;color:${pfg}`, line) + foot);
  const sy = hung(even(colH));
  const sheet = (y, h, t) => solid(R, x0 + PW + gap, y, SW, h, R.panel,
    `<div class="g1-cap num" style="left:${pad}px;top:${pad}px">${words(t)}${NB}words</div>`
    + txt(pad, pad + 28, SW - 2 * pad, 'g1-bp', `font-size:${S.size}px;line-height:${S.line}px`, tie(t)));
  const object = poster + sheet(sy, h25, v.boilerplate25) + sheet(sy + h25 + sgap, h50, v.boilerplate50);
  return page(ctx, 'messaging', {
    object, wall: { title: wallTitle(ctx, 'Lines and boilerplate', 'Messaging') },
    label: { title: 'Writing the name', paragraph: v.nameRules, credit: seeAlso(ctx, 'voice', 'Voice') },
  });
}

// ---- 012 summary: the brand on one page, hung as the page itself: the logo, the line, the colours by share, the two faces and the three rules ----
function summary(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, g = ctx.logo.geo;
  const SW = 400, SH = 564, pad = 32, iw = SW - 2 * pad;          // a sheet at the proportion of A-series paper
  const wide = g.aspect > 4, lw = wide ? 208 : 144, lh = lw / g.aspect;
  const logo = `<div style="left:${pad}px;top:${pad}px">${ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.panel) })}</div>`;
  const tt = token(ctx, 'title'), line = tie(B.lines.primary, { max: 16 });
  const T = [tt, ...dispSizes(ctx, 'title', 'title').slice(1), { size: 20, line: 24 }].find((s) => count(ctx, 'display', W.heading, s.size, line, iw) <= 2) || { size: 18, line: 22 };
  const ly = pad + Math.ceil(lh) + 32;
  const lineH = count(ctx, 'display', W.heading, T.size, line, iw) * T.line;
  // the colours, every one, as a single bar divided by share (largest first), so the ground's share shows too
  const cs = [...ctx.colours].sort((a, b) => b.share - a.share), sum = cs.reduce((a, c) => a + c.share, 0);
  let bx = 0;
  const by = ly + lineH + 32;
  const bar = cs.map((c, i) => {
    const w = i === cs.length - 1 ? iw - bx : Math.round(iw * c.share / sum);
    // a segment close in tone to the sheet it is printed on gets the theme's one edge, as an object close to the wall does, so it never reads as a gap
    const close = R.nearWall(c.hex) || ctx.ratio(c.hex, R.panel) < 1.3;
    const h = `<div class="ob${close ? ' edge' : ''}" style="left:${px(pad + bx)};top:${px(by)};width:${px(w)};height:40px;background:${c.hex}"></div>`; bx += w; return h;
  }).join('');
  // the faces: each family's name set in itself
  const fy = by + 40 + 32, d = B.fonts.display, b = B.fonts.body;
  const faces = txt(pad, fy, iw, 'disp g1-nw', `font-size:20px;line-height:24px;color:${R.ink}`, tie(d.family, { max: 40 }))
    + txt(pad, fy + 28, iw, 'g1-nw', `font:${W.regular} 15px/20px var(--body);color:${R.ink}`, tie(b.family, { max: 40 }));
  // the rules, by title, at the foot of the sheet
  const rules = (B.guideB && B.guideB.rules ? B.guideB.rules : []).slice(0, 3);
  const ry = SH - pad - rules.length * 22;
  if (ry < fy + 28 + 20 + 24) throw new Error('summary: the sheet has no room for its rules');
  const rl = rules.map((r, i) => `<div class="g1-rl" style="left:${pad}px;top:${ry + i * 22}px;width:${iw}px"><b class="num">${i + 1}</b>${A(tie(r.title))}</div>`).join('');
  const object = solid(R, hungX(SW), hung(SH), SW, SH, R.panel, logo + txt(pad, ly, iw, 'disp', `font-size:${T.size}px;line-height:${T.line}px;color:${R.ink}`, line) + bar + faces + rl);
  const nC = ctx.colours.length;
  return page(ctx, 'summary', {
    object, wall: { title: wallTitle(ctx, 'The brand on one page', 'On one page', 'Summary') }, foot: 'Made with UIL4B',
    label: {
      title: `${B.name} on one sheet`, detail: `${numberWord(nC)} colours, ${numberWord(2).toLowerCase()} typefaces and ${numberWord(rules.length).toLowerCase()} rules.`,
      paragraph: B.description || B.voice.boilerplate25, credit: seeAlso(ctx, 'palette', 'Colour'),
    },
  });
}

// ---- 033 contact-scope: the compliments slip at the exit. Who to ask, the address large; what this book holds and what lives elsewhere on the label ----
function contactScope(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, C = B.contact || {};
  const PW = 576, PH = 272, pad = 32, tw = PW - 2 * pad;   // 210 x 99 mm, the DL slip, at 2.74 px to the millimetre
  const email = C.email || B.name;
  const S = dispSizes(ctx, 'headline', 'title').find((s) => count(ctx, 'display', W.heading, s.size, email, tw) === 1)
    || [22, 20, 18, 16].map((s) => ({ size: s, line: Math.round(s * 1.2) })).find((s) => count(ctx, 'display', W.heading, s.size, email, tw) === 1) || { size: 16, line: 20 };
  const fg = R.onColour(R.action, S.size, W.heading), sfg = R.onColour(R.action, 15, W.strong);
  const inner = txt(pad, pad, tw, 'g1-ow', `color:${sfg}`, C.owner || 'Brand team')
    + txt(pad, PH - pad - S.line, tw, 'disp g1-nw', `font-size:${S.size}px;line-height:${S.line}px;color:${fg}`, email);
  const object = solid(R, hungX(PW), hung(PH), PW, PH, R.action, inner);
  const secs = ctx.sections;
  return page(ctx, 'contact-scope', {
    object, wall: { title: wallTitle(ctx, 'Contact and scope', 'Contact') }, foot: ctx.versionLine,
    label: {
      title: 'Who to ask', detail: `Version ${B.version.number}, ${longDate(B.version.date)}`,
      items: [
        { term: 'Inside:', text: `${numberWord(secs.length)} sections over ${ctx.pages.length} pages.` },
        { term: 'Elsewhere:', text: 'Logo files and fonts are in the brand kit. Components and tokens are in the UI kit.' },
      ], mode: 'inline',
      credit: seeAlso(ctx, 'contents', 'Contents'),
    },
  });
}

// ---- 002 personality (round 1, guidelines.js) prints helpers.seeAlso('write-this'), whose shared name for that page is "Voice". helpers.js and copy.js are shared, so the
// credit is corrected here, on the built page: the name becomes the write-this page's own wall title, or "Write this" where the full title would run past the label ----
const basePersonality = round1.personality;
const CHROME = (ctx) => ({ ...ctx, faces: [{ role: 'chrome', stem: 'SchibstedGrotesk-400', weight: 400, style: 'normal' }] });
const LABEL_INNER = 200;                                   // the label is 240 wide with 20 px padding; the credit is one line, never wrapped
function personality(ctx) {
  const html = basePersonality(ctx);
  const full = wallTitle(ctx, 'Write this, not that', 'Write this');
  const name = advance(CHROME(ctx), 'chrome', 400, `See also ${full}, page ${folio('write-this')}`, 12) * 1.04 <= LABEL_INNER ? full : 'Write this';
  const out = html.replace(/(<p class="lb-c">See(?:\s|&nbsp;|\u00a0)+also(?:\s|&nbsp;|\u00a0)+)Voice(?=,)/, (_, a) => a + A(name));
  if (out === html) throw new Error('personality: the "See also Voice" credit was not found, so it cannot be corrected');
  return out;
}

// Free: only pages of the twelve are exported. The five Pro pages stay here for a later edition; export them to build them.
export const guidelines = { personality, 'write-this': writeThis, summary };
export const draftG1Pages = { contents, intro, voice, messaging, 'contact-scope': contactScope };

export function css(ctx) {
  return `.pg .g1-fl{position:absolute;left:48px;top:748px;font:400 12px/16px var(--chrome);color:var(--quiet)}
.pg .g1-nw{white-space:nowrap}
.pg .g1-gr{text-wrap:wrap}
.pg .g1-no{font:500 13px/16px var(--chrome)}
.pg .g1-w{text-wrap:pretty}
.pg .g1-not{font-size:13px;line-height:18px;color:var(--quiet-panel);text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--quiet-panel);text-wrap:pretty}
.pg .g1-why{font-size:13px;line-height:18px;color:var(--ink);text-wrap:pretty}
.pg .g1-pf{font-size:13px;line-height:18px;text-wrap:pretty}
.pg .g1-cap{font:500 12px/16px var(--chrome);color:var(--quiet-panel)}
.pg .g1-bp{color:var(--ink);text-wrap:pretty}
.pg .g1-rl{font-size:15px;line-height:22px;color:var(--ink);white-space:nowrap}
.pg .g1-rl b{display:inline-block;width:20px;font:500 13px/22px var(--chrome)}
.pg .g1-ow{font-size:15px;line-height:20px;font-weight:${ctx.weights.strong}}
`;
}
