// Theme 26, Notebook, lane g1: the brand and voice spreads (contents, intro, voice, write-this, messaging, summary, contact-scope).
// The same notebook as the gate spreads: dot-grid leaves, the fold and its thread, and everything that is the brand stuck in on square-cut
// tape that carries its own label. Each spread takes its layout from a different part of a kept notebook: thumb-index tabs, a label-maker
// strip beside a struck-out line, a print taped low on the leaf, a length of tape across the gutter, the back endpaper.
// Coordinates are leaf-local (see helpers.js); every edge lands on a dot and every baseline on a dot row.
import {
  A, U, row, px, nb, tokens, brandRoles, readable, nearPaper, block, advance, wrap, capRatio, lineOffset, fitLines, folios,
  stick, labelStripW, sceneCrop, printHtml, sceneImg, spread, numberWord, photoAt,
  hasPh,
} from './helpers.js';
import { artKit } from './art.js';
import { billboard } from './lane-g1-art.js';

const DOTS_X = (i) => 23 + U * i;                         // dot column i on a leaf
const upCol = (x) => DOTS_X(Math.ceil((x - 23) / U - 1e-6));    // the first dot column at or right of x
const downCol = (x) => DOTS_X(Math.floor((x - 23) / U + 1e-6)); // the last dot column at or left of x
const upRow = (y) => row(Math.ceil((y - 17) / U - 1e-6));
const title = (ctx, id) => (ctx.pages.find((p) => p.id === id) || {}).title || '';

// a piece of label tape with no print under it: 1 unit tall (11 px label) or 2 (13 px), as wide as its label plus 20, in whole units
function tapeLabel(T, x, y, text, big = false) {
  const key = big ? 'c-label13' : 'c-label', w = labelStripW(T, key, text);
  return `<div class="tape ${big ? 'strip c-label13' : 'tab c-label'}${hasPh(text) ? ' ph-tight' : ''}" style="left:${px(x)};top:${px(y)};width:${w}px;height:${big ? 2 * U : U}px">${A(text)}</div>`;
}
// the brand's display face at the largest listed size that sets text in maxLines across w
function hero(T, text, w, sizes, maxLines) {
  const f = fitLines(T._displayStem, text, w, sizes, maxLines, -0.02);
  return { ...f, tk: { stem: T._displayStem, size: f.size, lh: f.lh, track: -0.02 }, cap: capRatio(T._displayStem) * f.size };
}
const heroBlock = (h, o) => block(h.tk, { ...o, lines: h.lines, cls: 'b-hero', style: `font-size:${h.size}px;line-height:${h.lh}px;` });

export const guidelines = {
  // ---- contents: a thumb index. Each section is a tab of tape wrapped round the fore-edge (off the left edge of the verso, the right edge of
  // the recto), with its pages listed under it and each page's verso folio beside it. The lists hang from the outer edges; the fold side is empty.
  contents: (ctx) => {
    const T = tokens(ctx), secs = ctx.sections.filter((s) => s.pages.length);
    const step = (s) => U * s.pages.length + 3 * U;              // a tab, a row, the pages, a blank row
    // the verso holds as many sections as fit under its title, the recto the rest
    let y = 150, split = 0;
    while (split < secs.length && y + step(secs[split]) - 2 * U <= 739) { y += step(secs[split]); split++; }
    const leaf = (list, top, recto) => {
      let out = '', t = top;
      for (const s of list) {
        const label = `${s.n} ${s.title}`, lw = advance(T['c-label'].stem, 11, label, 0.01);
        // the tab runs off the fore-edge; its inner end lands on the first dot past the label's padding
        if (!recto) {
          const r = upCol(42 + lw + 10 + 1);
          out += `<div class="tape c-label g1-fore${hasPh(label) ? ' ph-tight' : ''}" style="left:0;top:${t}px;width:${r}px;height:${U}px;padding:0 0 0 42px">${A(label)}</div>`;
        } else {
          const l = downCol(517 - lw - 10 - 1);
          out += `<div class="tape c-label g1-fore${hasPh(label) ? ' ph-tight' : ''}" style="left:${l}px;top:${t}px;width:${559 - l}px;height:${U}px;padding:0 42px 0 0;text-align:right">${A(label)}</div>`;
        }
        s.pages.forEach((p, k) => {
          const bl = t + 2 * U + k * U, fo = folios(ctx, p.id)[0];
          const x = recto ? 232 : 42;
          out += block(T['c-note'], { x, w: 228, baseline: bl, lines: [p.title], cls: 'c-note g1-entry' }).html
            + block(T['c-mono'], { x: x + 247, w: 38, baseline: bl, lines: [fo], cls: 'c-mono', align: 'right' }).html;
        });
        t += step(s);
      }
      if (t - 2 * U > 739 + U) throw new Error(`contents: the ${recto ? 'recto' : 'verso'} list runs to ${t - 2 * U}`);
      return out;
    };
    const vc = block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, 'contents')], baseline: 93, cls: 'b-title' }).html + leaf(secs.slice(0, split), 150, false);
    const rc = leaf(secs.slice(split), 74, true);
    return spread(ctx, 'contents', { verso: vc, recto: rc });
  },

  // ---- write this, not that: each line to write is printed on a label-maker strip of the brand's tape on the verso; across the fold, level
  // with it, is the line it replaces, struck through once in graphite, with the reason under it ----
  'write-this': (ctx) => {
    const T = tokens(ctx), W = ctx.brand.voice.writeThis;
    const nameStem = T['b-name'].stem, bodyStem = T['b-body'].stem;
    const off = lineOffset(nameStem, 13, 19);
    const rows = W.map((r) => {
      const wl = wrap(nameStem, 13, r.write, 455), nl = wrap(bodyStem, 13, r.not, 380), bl = wrap(bodyStem, 13, r.because, 380);
      const tw = Math.ceil((Math.max(...wl.map((s) => advance(nameStem, 13, s))) + 20 + 1) / U) * U;
      return { r, wl, nl, bl, tw, th: U * (wl.length + 1) };
    });
    const lay = (gap) => {
      let y = 150; const at = [];
      for (const o of rows) {
        const first = row(Math.round((y + U / 2 + off - 17) / U));                     // the struck line's baseline, level with the strip's text
        const end = Math.max(y + o.th, first + U * (o.nl.length + o.bl.length - 1) + 5);
        at.push({ y, first }); y = upRow(end) + gap;
      }
      return { at, end: y - gap };
    };
    let L = lay(2 * U); if (L.end > 739) L = lay(U);
    let vc = block(T['b-title'], { x: 42, w: 475, lines: ['Write this'], baseline: 93, cls: 'b-title' }).html;
    let rc = block(T['b-title'], { x: 42, w: 475, lines: ['Not that'], baseline: 93, cls: 'b-title' }).html;
    rows.forEach((o, i) => {
      const { y, first } = L.at[i];
      vc += `<div class="tape b-name g1-wt${o.wl.some(hasPh) ? ' ph-tight' : ''}" style="left:42px;top:${y}px;width:${o.tw}px;height:${o.th}px">${o.wl.map((s) => `<span class="ln">${A(s)}</span>`).join('')}</div>`;
      rc += block(T['b-body'], { x: 42, w: 380, baseline: first, lines: o.nl, cls: 'b-body g1-not' }).html
        + block(T['b-body'], { x: 42, w: 380, baseline: first + U * o.nl.length, lines: o.bl, cls: 'b-body' }).html;
    });
    return spread(ctx, 'write-this', { verso: vc, recto: rc });
  },

  // ---- intro (who we are): who the brand serves at the head of the verso, with the brand's own picture taped low on the same leaf; what it
  // does, set large in the display face, at the head of the recto, and the description on the recto's last rows. The reverse of the
  // personality spread that follows it (hero on the verso, print on the recto). The picture is the brand's second real photograph when it
  // has one (the first is on the personality spread), else its app photographed on a kerb.
  intro: (ctx) => {
    const T = tokens(ctx), B = ctx.brand;
    let vc = tapeLabel(T, 42, 74, 'Who it serves')
      + block(T['b-body'], { x: 42, w: 380, top: 112, text: B.audience, cls: 'b-body' }).html;
    const P = { x: 42, y: 397, w: 456, h: 304 };
    const shot = (B.imagery.shots || []).filter((s) => s.photo)[1];
    let inner, label, alt;
    if (shot) {
      inner = photoAt(ctx, shot.id, { style: 'width:100%;height:100%' }); label = shot.caption; alt = shot.alt || shot.caption;
    } else {
      const sc = ctx.sceneInfo('phone-kerb'), a = sc.quads[0].aspect, aw = 390, ah = Math.round(aw / a);
      const url = ctx.mockup('phone-kerb', [artKit(ctx).phone(aw, ah)]);
      inner = sceneImg(url, sceneCrop(sc, P.w, P.h), 'The app on a phone, on a kerb'); label = 'The app, out on the kerb'; alt = 'The app on a phone, on a kerb';
    }
    vc += printHtml({ ...P, inner, label: alt }) + stick(T, { ...P, label });

    const h = hero(T, B.product, 475, [[48, 57], [38, 38], [32, 38], [26, 38]], 4);
    const hb = row(Math.round((131 + h.cap - 17) / U));
    let rc = tapeLabel(T, 42, 74, 'What it does') + heroBlock(h, { x: 42, w: 475, baseline: hb }).html;
    const dl = wrap(T['b-body'].stem, 13, B.description, 285);
    rc += block(T['b-body'], { x: 42, w: 285, baseline: 739 - U * (dl.length - 1), lines: dl, cls: 'b-body' }).html;
    return spread(ctx, 'intro', { verso: vc, recto: rc });
  },

  // ---- voice (how we sound): the first habit's example set low on the verso at hero size, its habit on the tape above it; the other habits
  // run down the recto, each example in the display face under its own label ----
  voice: (ctx) => {
    const T = tokens(ctx), P = ctx.brand.voice.principles;
    const h = hero(T, P[0].example, 475, [[76, 76], [64, 76], [57, 57], [48, 57], [38, 38]], 3);
    const lastBl = 663, firstBl = lastBl - h.lh * (h.lines.length - 1);
    const labelTop = row(Math.floor((firstBl - h.cap - 2 * U - 17) / U));
    const vc = tapeLabel(T, 42, labelTop, P[0].title) + heroBlock(h, { x: 42, w: 475, baseline: firstBl }).html;
    let rc = '', y = 74;
    const t = T['b-title'];
    for (const p of P.slice(1)) {
      const ls = wrap(t.stem, t.size, p.example, 475);
      const bl = row(Math.round((y + 2 * U + lineOffset(t.stem, t.size, t.lh) - 17) / U));
      rc += tapeLabel(T, 42, y, p.title) + block(t, { x: 42, w: 475, baseline: bl, lines: ls, cls: 'b-title' }).html;
      y = bl + t.lh * (ls.length - 1) + 3 * U;
    }
    if (y - 3 * U > 739) throw new Error(`voice: the recto runs to ${y - 3 * U}`);
    return spread(ctx, 'voice', { verso: vc, recto: rc });
  },

  // ---- messaging (lines and boilerplate): a billboard of the brand's line taped across the verso, the lines it may use under it; the recto
  // is the copy to paste, each block under its own label ----
  messaging: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, V = B.voice;
    const sc = ctx.sceneInfo('kerb-hoarding-footpath'), a = sc.quads[0].aspect, aw = 1150, ah = Math.round(aw / a);
    const url = ctx.mockup('kerb-hoarding-footpath', [billboard(ctx, aw, ah)]);
    const P = { x: 42, y: 112, w: 456, h: 304 };
    let vc = printHtml({ ...P, inner: sceneImg(url, sceneCrop(sc, P.w, P.h, 0.8, 'w'), 'The brand line on a billboard'), label: 'The brand line on a billboard' })
      + stick(T, { ...P, label: 'The line, on a billboard' });
    const t = T['b-title'], all = [B.lines.primary, ...(B.lines.others || [])];
    let bl = row(Math.round((513 + lineOffset(t.stem, t.size, t.lh) - 17) / U));
    vc += tapeLabel(T, 42, 475, 'Lines in use');
    for (const l of all) {
      const ls = wrap(t.stem, t.size, l, 475);
      vc += block(t, { x: 42, w: 475, baseline: bl, lines: ls, cls: 'b-title' }).html;
      bl += t.lh * ls.length;
    }
    if (bl - t.lh > 739) throw new Error(`messaging: the lines run to ${bl - t.lh}`);
    let rc = '', y = 74;
    for (const [k, v] of [['Writing the name', V.nameRules], ['Short boilerplate', V.boilerplate25], ['Long boilerplate', V.boilerplate50]]) {
      const ls = wrap(T['b-body'].stem, 13, v, 380);
      rc += tapeLabel(T, 42, y, k) + block(T['b-body'], { x: 42, w: 380, baseline: y + 2 * U, lines: ls, cls: 'b-body' }).html;
      y = upRow(y + 2 * U + U * (ls.length - 1)) + 3 * U;
    }
    return spread(ctx, 'messaging', { verso: vc, recto: rc });
  },

  // ---- summary (the brand on one page): the logo and its lines on the verso, the three rules on the recto, and across the gutter one length
  // of tape per colour, each as long as its share, with the two faces under it ----
  summary: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), W = ctx.weights, cw = B.logo.colourways.colour;
    const g = ctx.logo.geos.colour, lw = 285, lh = lw * g.h / g.w;
    let vc = `<div style="left:42px;top:74px;width:${lw}px;z-index:3">${ctx.logo.html('colour', { width: lw, color: cw.name })}</div>`;
    const t = T['b-title'];
    let bl = row(Math.ceil((74 + lh + 2 * U + lineOffset(t.stem, t.size, t.lh) - 17) / U));
    const pl = wrap(t.stem, t.size, B.lines.primary, 475);
    vc += block(t, { x: 42, w: 475, baseline: bl, lines: pl, cls: 'b-title' }).html;
    bl += t.lh * (pl.length - 1) + 2 * U;
    for (const l of B.lines.others || []) { vc += block(T['b-line'], { x: 42, w: 475, baseline: bl, lines: [l], cls: 'b-line' }).html; bl += U; }
    if (bl - U > 435) throw new Error(`summary: the lines run to ${bl - U}`);

    // the band: page x 42 to 1076 (a dot on each leaf), y 454 to 530; each boundary snaps to the nearest dot of whichever leaf it falls on
    const cols = [...B.colours].sort((a, b) => b.share - a.share), tot = cols.reduce((s, c) => s + c.share, 0);
    // no boundary lands within a few units of the fold, so no length's name starts under the thread
    const dotsPage = [...Array(28).keys()].flatMap((i) => [23 + U * i, 582 + U * i]).filter((x) => x <= 498 || x >= 601).sort((a, b) => a - b);
    const snap = (x) => dotsPage.reduce((b, d) => (Math.abs(d - x) < Math.abs(b - x) ? d : b), dotsPage[0]);
    let acc = 0; const edges = [42];
    cols.forEach((c, i) => { acc += c.share; edges.push(i === cols.length - 1 ? 1076 : Math.max(snap(42 + 1034 * acc / tot), edges[i] + 4 * U)); });
    let band = '';
    cols.forEach((c, i) => {
      const x = edges[i], w = edges[i + 1] - x, ink = readable(ctx, c.hex, [R.text, R.ground.hex], `summary band ${c.name}`);
      band += `<div class="g1-band${nearPaper(ctx, c.hex) ? ' edge' : ''}" style="left:${x}px;top:454px;width:${w}px;height:76px;background:${c.hex}"></div>`
        + block(T['b-name'], { x: x + 10, w: w - 20, baseline: 487, lines: [c.name], cls: 'b-name g1-on', color: ink, knock: false }).html
        + block(T['c-mono'], { x: x + 10, w: w - 20, baseline: 506, lines: [`${Math.round(c.share * 100)}%`], cls: 'c-mono g1-on', color: ink, knock: false }).html;
    });
    vc += band;

    // the faces under the band: "Aa" in each, its family, its weights in use
    const d = B.fonts.display, b = B.fonts.body;
    const dk = { stem: T._displayStem, size: 76, lh: 76, track: -0.02 }, bk = { stem: T['b-body'].stem, size: 76, lh: 76, track: 0 };
    const fx = (k) => upCol(42 + advance(k.stem, 76, 'Aa', k.track) + U);
    const face = (k, f, cls, style) => block(k, { x: 42, w: 228, baseline: 663, lines: ['Aa'], cls, style }).html
      + block(T['b-name'], { x: fx(k), w: 200, baseline: 644, lines: [f.family], cls: 'b-name' }).html
      + block(T['c-mono'], { x: fx(k), w: 200, baseline: 663, lines: [f.weights.join(' ')], cls: 'c-mono' }).html;
    vc += face(dk, d, 'b-hero', 'font-size:76px;line-height:76px;');
    let rc = face(bk, b, '', `font-family:var(--body);font-weight:${W.regular};font-size:76px;line-height:76px;color:var(--ink);`);

    // the rules on the recto, above the band
    let y = 74;
    for (const r of B.guideB.rules.slice(0, 3)) {
      const ls = wrap(T['b-body'].stem, 13, r.text, 380);
      rc += tapeLabel(T, 42, y, r.title) + block(T['b-body'], { x: 42, w: 380, baseline: y + 2 * U, lines: ls, cls: 'b-body' }).html;
      y = upRow(y + 2 * U + U * (ls.length - 1)) + 2 * U;
    }
    if (y - 2 * U > 435) throw new Error(`summary: the rules run to ${y - 2 * U}`);
    return spread(ctx, 'summary', { verso: vc, recto: rc });
  },

  // ---- contact and scope: the last leaf, then the back endpaper (the reversed ground again, closing what the cover opened). The verso says
  // who to ask on the same strip the cover's "if found" line uses, then what this book holds and what it leaves to the kits ----
  'contact-scope': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, rev = B.logo.colourways.reversed;
    let vc = block(T['b-title'], { x: 42, w: 475, lines: ['Who to ask'], baseline: 93, cls: 'b-title' }).html;
    const who = `${B.contact.owner} owns this document. For a logo file, a missing asset or an exception, write to the address on the tape.`;
    vc += block(T['b-body'], { x: 42, w: 285, top: 131, text: who, cls: 'b-body' }).html;
    vc += tapeLabel(T, 42, 207, B.contact.email, true);
    // in this document: the sections; not in it: what the kits hold
    vc += block(T['c-strong'], { x: 42, w: 209, baseline: 340, lines: ['In this document'], cls: 'c-strong' }).html;
    ctx.sections.filter((s) => s.pages.length).forEach((s, i) => {
      vc += block(T['c-note'], { x: 42, w: 209, baseline: 378 + U * i, lines: [`${s.n} ${s.title}`], cls: 'c-note g1-entry' }).html;
    });
    vc += block(T['c-strong'], { x: 289, w: 228, baseline: 340, lines: ['Not in this document'], cls: 'c-strong' }).html;
    let nb_ = 378;
    for (const s of ['Logo files, palettes and fonts are in the brand kit.', 'Interface components and tokens are in the UI kit.', 'Print specifications: ask your printer for a proof.']) {
      const ls = wrap(T['c-note'].stem, 13, s, 228);
      vc += block(T['c-note'], { x: 289, w: 228, baseline: nb_, lines: ls, cls: 'c-note g1-entry' }).html;
      nb_ += U * ls.length + U;
    }
    vc += block(T['c-head'], { x: 42, w: 300, baseline: 739, lines: [ctx.versionLine], cls: 'c-head' }).html;
    // the endpaper is the field alone: the cover's endpaper carries the logo, the back one closes the book on the ground
    const rc = `<div class="field" style="left:0;top:0;width:559px;height:794px;background:${rev.ground}"></div>`;
    return spread(ctx, 'contact-scope', { verso: vc, recto: rc, thread: false, rectoChrome: false });
  },
};

export function css() {
  return `.pg .g1-fore{line-height:19px;box-sizing:border-box}
.pg .g1-entry{color:var(--graphite-ink)}
.pg .g1-wt{color:var(--tape-label);padding:9.5px 10px;line-height:19px;box-sizing:border-box}
.pg .g1-not{color:var(--graphite);text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--graphite)}
.pg .g1-band{z-index:3;box-sizing:border-box}
.pg .g1-band.edge{border:1px solid var(--fold)}`;
}
