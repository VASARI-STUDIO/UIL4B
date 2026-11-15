// Theme 31, Contact sheet, lane g1: the brand and voice pages (contents, personality, voice, write-this, messaging, summary, contact-scope).
// Every page keeps the theme's device: the strip with its circled frame, the caption column at x 996 that notes the circled frame, and the foot.
// What sits under the strip is each page's own, laid out on the frame grid (frames at x 60, 294, 528, 762; the stage ends at 972).
// Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
import { A, tokens, palette, cwOn, put, hline, adv, wrap, fitLines, fontOf, shell, captionHead, px, rollOf, frameLabel } from './helpers.js';
import { cut, photoFrame, photoShot } from './arts.js';

// ---- shared bits, copied from guidelines.js (its helpers are not exported) ----
const frameFn = (ctx) => (setup, k, w, h, f, v = 0) => (setup === 'photo' ? photoFrame(ctx, k, w, h, v) : cut(ctx, setup, k, w, h, 'Frame ' + f));
const page = (ctx, id, body) => shell(ctx, id, tokens(ctx), body, frameFn(ctx));
const capNo = (ctx, id) => String(ctx.pageNo(id)).padStart(2, '0');
const fullDate = (ctx) => new Date(ctx.brand.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
const firstSentence = (t) => { const m = t.match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : t; };
const listJoin = (a) => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
const words = (t) => t.trim().split(/\s+/).length;
const DTRACK = -0.01;   // the .disp class tracking

// cap height of a face as a share of the em, so a line can hang from the top of its capitals
const capOf = (ctx, role, weight) => { const f = fontOf(ctx, role, weight); return (f.tables.os2.sCapHeight || f.unitsPerEm * 0.7) / f.unitsPerEm; };
// a block of text whose first line's capitals start at `capTop`: returns the markup and its bottom edge
function para(ctx, { x, capTop, w, text, size = 14, line = 22, weight, colour = 'var(--soft)', role = 'body', extra = '' }) {
  const wt = weight ?? ctx.weights.regular, n = wrap(ctx, role, text, size, w - 2, 0, wt).length, base = capTop + capOf(ctx, role, wt) * size;
  const html = put(ctx, { x, baseline: base, w, h: n * line, role, size, line, weight: wt, style: `font:${wt} ${size}px/${line}px var(--${role});color:${colour};white-space:normal;text-wrap:pretty;${extra}`, html: A(text) });
  return { html, n, bottom: base + (n - 1) * line + size * 0.3 };
}
// display lines, one div each so the line count laid out is the count that renders
function dispBlock(ctx, { x, capTop, w, lines, size, line }) {
  const wt = ctx.weights.heading, base0 = capTop + capOf(ctx, 'display', wt) * size;
  const html = lines.map((l, i) => put(ctx, { x, baseline: base0 + i * line, w, h: line, cls: 'disp', role: 'display', size, line, weight: wt, style: `font-size:${size}px;line-height:${line}px`, html: A(l) })).join('');
  return { html, base0, bottom: base0 + (lines.length - 1) * line + size * 0.25 };
}
// the largest display size from `from` down (step 4) at which every text wraps into `maxLines` within `w`
function fitAll(ctx, texts, from, w, maxLines, min = 20) {
  const wt = ctx.weights.heading;
  for (let s = from; s >= min; s -= 4) {
    const ls = texts.map((t) => wrap(ctx, 'display', t, s, w - 2, DTRACK, wt));
    if (ls.every((l) => l.length <= maxLines && l.every((x) => adv(ctx, 'display', x, s, DTRACK, wt) <= w - 2))) return { size: s, lines: ls };
  }
  return { size: min, lines: texts.map((t) => wrap(ctx, 'display', t, min, w - 2, DTRACK, wt)) };
}

// ---- the caption for whichever frame the loop circles: the theme names the setup, the brand fills the words ----
function frameCap(ctx, f) {
  const B = ctx.brand, P = palette(ctx), r = rollOf(ctx)[f], title = B.ui && B.ui.screen ? B.ui.screen.title : B.name;
  if (!r) return { title: 'Unexposed frame', text: 'The roll has ended.' };
  if (r[0] === 'photo') {
    const s = photoShot(ctx, r[1]);
    return s ? { title: s.caption || s.slot.split(':')[0], text: (s.generated ? '' : `Photo: ${s.credit || 'the studio'}.`) } : { title: 'Your photograph', text: 'The frame the book circles is your own photograph, as shot, in the daylight you work in.' };
  }
  const posterNote = B.applications.signage.includes(B.lines.primary) ? B.applications.signage : `The primary line at poster size, on ${P.dark.name}.`;
  const C = {
    poster: ['Poster in a black frame, studio corner', posterNote],
    night: ['Poster on brick, at night', `The line at poster size, on ${P.action.name}.`],
    sheets: ['Three sheets, gallery wall', `The three lines at A1, on ${P.dark.name}, ${P.light.name} and ${P.action.name}.`],
    app: ['Phone on travertine', `${title}, in the app's dark theme.`],
    laptop: ['Laptop on a night desk', `${title} at desktop width, in the dark theme.`],
    book: ['Portfolio book, in hand', `The stacked logo on ${(P.panel || P.dark).name} cloth.`],
    tote: ['Print bag on the studio hook', `The stacked logo on ${P.dark.name} canvas.`],
    card: ['Cards on the box-office sill', `The front on ${P.dark.name}, the back on ${P.light.name}.`],
    letter: ['Print order letter on linen', `${B.fonts.body.family} for the letter, ${B.fonts.display.family} for the one line that matters.`],
    lightbox: ['The studio sheet under the loupe', `A4 landscape on ${P.light.name}.`],
  }[r[0]] || ['Frame ' + frameLabel(f), ''];
  return { title: C[0], text: C[1] };
}
// the caption column's head (spec 4.5): the circled frame's number, its title and words, then the hairline at 488
const capCol = (ctx, id) => { const c = frameCap(ctx, ctx.pageNo(id)); return captionHead(ctx, { no: capNo(ctx, id), title: c.title, text: c.text, lines: 2 }) + hline(996, 488, 444); };

export const guidelines = {
  // The roll's index, laid out like the label strip of a negative file: each section starts on a frame, its frame number in the edge-print
  // numerals, its title in the display face, and its pages as frames under the circled frame's column (x 528).
  contents(ctx) {
    const secs = ctx.sections, wt = ctx.weights.heading, NW = 14, GAP = 20;
    // section titles share one size: 32 if every title fits cols 2 to 4 (x 177 to 504), else the size that does
    const tf = fitAll(ctx, secs.map((s) => s.title), 32, 327, 1, 20), ts = tf.size, tl = Math.round(ts * 8 / 7);
    // each section's pages as entries "08 The logo", filled into lines of 444 px; whole entries only, never broken
    const entryW = (p) => adv(ctx, 'edge', frameLabel(p.no), NW, 0, 600) + 6 + adv(ctx, 'body', p.title, 14, 0, ctx.weights.regular);
    const rowsOf = (s) => { const out = [[]]; let w = 0; for (const p of s.pages) { const ew = entryW(p); if (out[out.length - 1].length && w + GAP + ew > 440) { out.push([]); w = 0; } w += (out[out.length - 1].length ? GAP : 0) + ew; out[out.length - 1].push(p); } return out; };
    const blocks = secs.map((s) => ({ s, rows: rowsOf(s) }));
    const hOf = (b) => Math.max(tl, b.rows.length * 22);
    let gap = 28; const total = (g) => blocks.reduce((t, b) => t + hOf(b), 0) + g * (blocks.length - 1);
    while (total(gap) > 620 && gap > 12) gap -= 4;
    let y = 316, html = '';
    blocks.forEach((b, i) => {
      if (i) html += hline(60, y - gap / 2, 912);
      const capTop = y + (tl - ts * capOf(ctx, 'display', wt)) / 2;
      const base = capTop + capOf(ctx, 'display', wt) * ts;
      html += put(ctx, { x: 60, baseline: base, w: 93, h: tl, cls: 'num', role: 'edge', size: ts, line: tl, weight: 600, style: `font:600 ${ts}px/${tl}px var(--chrome);font-stretch:75%;color:var(--ink)`, html: A(frameLabel(b.s.pages[0].no)) });
      html += put(ctx, { x: 177, baseline: base, w: 327, h: tl, cls: 'disp', role: 'display', size: ts, line: tl, weight: wt, style: `font-size:${ts}px;line-height:${tl}px`, html: A(b.s.title) });
      // the page list's first baseline sits on the title's baseline
      b.rows.forEach((r, j) => { html += put(ctx, { x: 528, baseline: base + j * 22, w: 444, h: 22, cls: 'g1-lst', role: 'body', size: 14, line: 22, html: r.map((p) => `<span class="g1-e"><span class="g1-n">${A(frameLabel(p.no))}</span>${A(p.title)}</span>`).join('') }); });
      y += hOf(b) + gap;
    });
    const n = ctx.pages.length, ns = secs.length;
    const how = para(ctx, { x: 996, capTop: 544, w: 444, text: `Every page is one frame of the roll, printed with its neighbours. The frame circled on the strip is the page you are on, and its number is the page number. ${n} pages in ${ns} sections.` });
    return page(ctx, 'contents', html + capCol(ctx, 'contents') + label(ctx, 996, 512, 'Reading the roll') + how.html);
  },

  // The traits set as large as the display face goes, each with what it means beside it in the circled frame's column, the way a photographer
  // writes a word under a print and the reason in the margin.
  personality(ctx) {
    const B = ctx.brand, T = B.personality.slice(0, 4), wt = ctx.weights.heading, n = T.length;
    const top = Math.min(96, (B.type.scale.find((s) => s.token === 'display') || { size: 96 }).size);
    let ts = top; while (ts > 40 && T.some((t) => adv(ctx, 'display', t.trait, ts, DTRACK, wt) > 440)) ts -= 4;
    const capD = capOf(ctx, 'display', wt) * ts, pitch = n > 1 ? Math.min(200, (620 - 120) / (n - 1)) : 0;
    const rows = T.map((t, i) => {
      const capTop = 316 + i * pitch;
      const word = put(ctx, { x: 60, baseline: capTop + capD, w: 444, h: Math.round(ts * 1.1), cls: 'disp', role: 'display', size: ts, line: Math.round(ts * 1.1), weight: wt, style: `font-size:${ts}px;line-height:${Math.round(ts * 1.1)}px`, html: A(t.trait) });
      const m = para(ctx, { x: 528, capTop, w: 444, text: t.means, size: 16, line: 24 });
      return word + m.html;
    }).join('');
    const aud = para(ctx, { x: 996, capTop: 544, w: 444, text: B.audience });
    return page(ctx, 'personality', rows + capCol(ctx, 'personality') + label(ctx, 996, 512, 'Who we work for') + aud.html);
  },

  // The voice heard in its own words: each habit named small under frame 1, its example set in the display face across frames 2 to 4.
  voice(ctx) {
    const B = ctx.brand, P = B.voice.principles.slice(0, 5), wt = ctx.weights.heading, mw = ctx.weights.medium;
    const n = P.length;
    // the size at which every example holds two lines, then the gap that keeps the whole list inside the stage
    let f = fitAll(ctx, P.map((p) => p.example), 40, 678, 2, 24), lh = Math.round(f.size * 1.1);
    const tLines = P.map((p) => wrap(ctx, 'body', p.title, 16, 206, 0, mw).length);
    const slotRows = !!ctx.placeholders;  // slot: each row is a fixed 80 px, so the descriptor boxes sit between the rules
    const hOf = (i) => (slotRows ? 80 : Math.max(f.lines[i].length * lh, tLines[i] * 24));
    let gap = 48; while (P.reduce((t, _, i) => t + hOf(i), 0) + gap * (n - 1) > 600 && gap > 24) gap -= 8;
    let y = 316, html = '';
    P.forEach((p, i) => {
      if (i) html += hline(60, y - gap / 2, 912);
      const capTop = y + (lh - f.size * capOf(ctx, 'display', wt)) / 2, base = capTop + capOf(ctx, 'display', wt) * f.size;
      html += put(ctx, { x: 60, y, baseline: slotRows ? null : base, w: 210, h: tLines[i] * 24, role: 'body', size: 16, line: 24, weight: mw, style: `font:${mw} 16px/24px var(--body);color:var(--ink);white-space:normal`, html: A(p.title) });
      html += f.lines[i].map((l, j) => put(ctx, { x: 294, y: y + j * lh, baseline: slotRows ? null : base + j * lh, w: 678, h: lh, cls: 'disp', role: 'display', size: f.size, line: lh, weight: wt, style: `font-size:${f.size}px;line-height:${lh}px`, html: A(l) })).join('');
      y += hOf(i) + gap;
    });
    // the product saying it: the screen's own alert, toast and empty-state words, each under the name of the component that carries it
    const S = (B.ui && B.ui.screen && B.ui.screen.content) || {};
    const said = [['Alert', S.alert], ['Toast', S.toast], ['Empty state', S.empty && S.empty.body]].filter((x) => x[1]);
    let ry = 512, right = label(ctx, 996, ry, 'In the product'); ry += 32;
    for (const [k, t] of said) {
      right += put(ctx, { x: 996, y: ry, w: 120, h: 22, role: 'chrome', size: 12, line: 22, weight: 500, cls: 'nl', style: 'line-height:22px', html: A(k) });
      const p = para(ctx, { x: 1113, capTop: ry + (22 - 14 * capOf(ctx, 'body')) / 2, w: 327, text: t, size: 14, line: 22, colour: 'var(--ink)' });
      right += p.html; ry += p.n * 22 + 16;
    }
    return page(ctx, 'voice', html + capCol(ctx, 'voice') + right);
  },

  // The keeper and the reject: what to write in the display face, why under it, and the line it replaces struck through in the quiet tone,
  // as a photographer strikes a frame on the sheet.
  'write-this'(ctx) {
    const B = ctx.brand, W = B.voice.writeThis.slice(0, 6), wt = ctx.weights.heading, n = W.length, NX = 645, NW = 327;
    const f = fitAll(ctx, W.map((r) => r.write), 28, 558, 3, 24), lh = Math.round(f.size * 1.18);
    const bec = W.map((r) => wrap(ctx, 'body', r.because, 14, 556, 0, ctx.weights.regular).length);
    const nots = W.map((r) => wrap(ctx, 'body', r.not, 16, NW - 2, 0, ctx.weights.regular).length);
    const hOf = (i) => Math.max(f.lines[i].length * lh + 8 + bec[i] * 22, nots[i] * 24);
    let gap = 40; while (W.reduce((t, _, i) => t + hOf(i), 0) + gap * (n - 1) > 588 && gap > 16) gap -= 8;
    let y = 348, html = label(ctx, 60, 316, 'Write this', 558) + label(ctx, NX, 316, 'Not that', NW);
    W.forEach((r, i) => {
      if (i) html += hline(60, y - gap / 2, 912);
      const capTop = y + (lh - f.size * capOf(ctx, 'display', wt)) / 2, base = capTop + capOf(ctx, 'display', wt) * f.size;
      html += f.lines[i].map((l, j) => put(ctx, { x: 60, baseline: base + j * lh, w: 558, h: lh, cls: 'disp', role: 'display', size: f.size, line: lh, weight: wt, style: `font-size:${f.size}px;line-height:${lh}px`, html: A(l) })).join('');
      html += put(ctx, { x: 60, y: y + f.lines[i].length * lh + 8, w: 558, h: bec[i] * 22, cls: 'cx', html: A(r.because) });
      html += put(ctx, { x: NX, baseline: base, w: NW, h: nots[i] * 24, cls: 'g1-not', role: 'body', size: 16, line: 24, html: A(r.not) });
      y += hOf(i) + gap;
    });
    // the brand's own first rule, which every one of these lines obeys
    const R = (B.guideB && B.guideB.rules && B.guideB.rules[0]) || null;
    let right = '';
    if (R) {
      right += put(ctx, { x: 996, y: 512, w: 444, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: A(R.title) });
      right += para(ctx, { x: 996, capTop: 544 + (22 - 14 * capOf(ctx, 'body')) / 2, w: 444, text: R.text }).html;
    }
    return page(ctx, 'write-this', html + capCol(ctx, 'write-this') + right);
  },

  // The lines: the primary line as large as one or two lines allow across the stage, the others under it, and how to write the name at the foot.
  // The boilerplates go in the caption column, each headed by its real word count.
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, wt = ctx.weights.heading, others = (B.lines.others || []).slice(0, 3);
    const pf = fitLines(ctx, 'display', B.lines.primary, 80, 910, 2, -0.02, wt, 4, 40);
    // a two-line primary breaks at its full stop when it has one, so a sentence keeps its own line
    let pl = pf.lines;
    if (pl.length === 2) { const st = B.lines.primary.search(/[.!?]\s/); if (st > 0) { const a = B.lines.primary.slice(0, st + 1), b = B.lines.primary.slice(st + 2); if ([a, b].every((l) => adv(ctx, 'display', l, pf.size, -0.02, wt) <= 910)) pl = [a, b]; } }
    const plh = Math.round(pf.size * 1.04);
    const prim = dispBlock(ctx, { x: 60, capTop: 348, w: 912, lines: pl, size: pf.size, line: plh });
    const primHtml = prim.html.replace(/class="a disp"/g, 'class="a disp g1-tight"');
    let html = label(ctx, 60, 316, 'The line', 444) + primHtml;
    // the other lines, one per frame column pair (x 60 and 528), in the title size
    const of = fitAll(ctx, others, 32, 440, 2, 24), olh = Math.round(of.size * 1.2);
    const oy = Math.round(prim.bottom + 56);
    if (others.length) html += label(ctx, 60, oy, 'Also in use', 444);
    others.forEach((l, i) => { const x = i % 2 ? 528 : 60, yy = oy + 32 + Math.floor(i / 2) * (olh * 2 + 24); html += dispBlock(ctx, { x, capTop: yy, w: 444, lines: of.lines[i], size: of.size, line: olh }).html; });
    // writing the name, hung from the foot of the stage
    const nr = wrap(ctx, 'body', V.nameRules, 14, 676, 0, ctx.weights.regular).length, ny = 936 - nr * 22;
    html += label(ctx, 60, ny - 28, 'Writing the name', 678) + put(ctx, { x: 60, y: ny, w: 678, h: nr * 22, cls: 'cx', html: A(V.nameRules) });
    // the boilerplates, short then long
    let ry = 512, right = '';
    for (const [k, t] of [['Short', V.boilerplate25], ['Long', V.boilerplate50]]) {
      if (!t) continue;
      const ln = wrap(ctx, 'body', t, 14, 442, 0, ctx.weights.regular).length;
      right += label(ctx, 996, ry, `${k}, ${words(t)} words`) + put(ctx, { x: 996, y: ry + 24, w: 444, h: ln * 22, cls: 'cx', html: A(t) });
      ry += 24 + ln * 22 + 32;
    }
    return page(ctx, 'messaging', html + capCol(ctx, 'messaging') + right);
  },

  // The brand on one page: the logo and the line at the head, the palette as one thin test strip in proportion, the brand's rules,
  // and the three faces each named in itself in the caption column.
  summary(ctx) {
    const B = ctx.brand, T = tokens(ctx), P = palette(ctx), wt = ctx.weights.heading, L = ctx.logo, slot = ctx.edition === 'slot';
    // the logo, large enough to keep its symbol's detail, in the colourway drawn on the page ground
    const lw = 240, lgh = (L.geos.colour.h / L.geos.colour.w) * lw;
    let html = `<div class="a" style="left:60px;top:316px;width:${lw}px">${L.html('colour', { width: lw, colourway: cwOn(ctx, T.ground), ...(slot ? { label: 'Your logo' } : {}) })}</div>`;
    const lf = fitLines(ctx, 'display', B.lines.primary, 40, 442, 2, DTRACK, wt, 4, 24), llh = Math.round(lf.size * 1.1);
    html += dispBlock(ctx, { x: 528, capTop: 316 + 4, w: 444, lines: lf.lines, size: lf.size, line: llh }).html;
    // the test strip: every colour by its share, the last field taking the remainder; a 1 px hairline so a field that matches the ground keeps its edge
    const cols = [...B.colours].sort((a, b) => b.share - a.share).slice(0, 6), sy = Math.max(316 + lgh, 316 + lf.lines.length * llh) + 56;
    let x = 60; const ws = cols.map((c, i) => (i === cols.length - 1 ? 912 - cols.slice(0, i).reduce((s, d) => s + Math.floor(912 * d.share), 0) : Math.floor(912 * c.share)));
    cols.forEach((c, i) => {
      const w = ws[i], pct = `${Math.round(c.share * 100)}%`;
      html += `<div class="a" style="left:${x}px;top:${px(sy)};width:${w}px;height:48px;background:${c.hex}"></div>`;
      // under the field: the name over the share, each only where it fits the field, nothing cut
      const room = w - 8, tn = adv(ctx, 'chrome', c.name, 12, 0.02, 500) <= room ? c.name : '', tp = adv(ctx, 'chrome', pct, 12, 0.02, 500) <= room ? pct : '';
      if (tn) html += put(ctx, { x, y: sy + 56, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(tn) });
      if (tp) html += put(ctx, { x, y: sy + (tn ? 74 : 56), w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, style: 'color:var(--soft)', html: A(tp) });
      x += w;
    });
    html += `<div class="a" style="left:60px;top:${px(sy)};width:912px;height:48px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
    // the rules: title in the display face under frames 1 and 2, the text under frames 3 and 4
    const R = ((B.guideB && B.guideB.rules) || []).slice(0, 4);
    const rf = fitAll(ctx, R.map((r) => r.title), 40, 444, 2, 20), rlh = Math.round(rf.size * 8 / 7);
    const rt = R.map((r) => wrap(ctx, 'body', r.text, 14, 442, 0, ctx.weights.regular).length);
    const hOf = (i) => Math.max(rf.lines[i].length * rlh, rt[i] * 22);
    const ry0 = sy + 48 + 56;
    let gap = 40; while (R.reduce((t, _, i) => t + hOf(i), 0) + gap * (R.length - 1) > 936 - ry0 && gap > 12) gap -= 4;
    let y = ry0;
    R.forEach((r, i) => {
      if (i) html += hline(60, y - gap / 2, 912);
      const capTop = y + (rlh - rf.size * capOf(ctx, 'display', wt)) / 2, base = capTop + capOf(ctx, 'display', wt) * rf.size;
      html += rf.lines[i].map((l, j) => put(ctx, { x: 60, baseline: base + j * rlh, w: 444, h: rlh, cls: 'disp', role: 'display', size: rf.size, line: rlh, weight: wt, style: `font-size:${rf.size}px;line-height:${rlh}px`, html: A(l) })).join('');
      html += put(ctx, { x: 528, baseline: base, w: 444, h: rt[i] * 22, cls: 'cx', role: 'body', size: 14, line: 22, html: A(r.text) });
      y += hOf(i) + gap;
    });
    // the faces, each named in itself
    const F = B.fonts, dstr = F.display.stretch || 100;
    const face = (yy, role, fam, size, line, wght, extra = '') => label(ctx, 996, yy, role) + put(ctx, { x: 996, y: yy + 22, w: 444, h: line, role: fam, size, line, weight: wght, style: `font:${wght} ${size}px/${line}px var(--${fam});color:var(--ink);${extra}`, html: A(F[fam].family) });
    const right = face(512, 'Display', 'display', 28, 34, wt, `font-stretch:${dstr}%;letter-spacing:-0.01em`)
      + face(584, 'Body', 'body', 20, 28, ctx.weights.medium)
      + face(650, 'Mono, for values only', 'mono', 16, 24, 400);
    return page(ctx, 'summary', html + capCol(ctx, 'summary') + right);
  },

  // The end of the roll: who to write to, set as the page's one large line; what this book holds and what it leaves to the kits.
  'contact-scope'(ctx) {
    const B = ctx.brand, wt = ctx.weights.heading, Cn = B.contact || {};
    const ef = fitLines(ctx, 'display', Cn.email || B.name, 56, 910, 1, DTRACK, wt, 4, 28), elh = Math.round(ef.size * 1.1);
    const em = dispBlock(ctx, { x: 60, capTop: 348, w: 912, lines: ef.lines, size: ef.size, line: elh });
    const say = para(ctx, { x: 60, capTop: Math.round(em.bottom + 32), w: 558, text: `${Cn.owner || 'The brand team'} owns this document. Write for a logo file, a missing asset or an exception.`, size: 16, line: 24 });
    let html = label(ctx, 60, 316, 'Who to ask', 444) + em.html + say.html;
    // in this document: each section by the frame it starts on
    const secs = ctx.sections, sy = 936 - secs.length * 26 + 4;
    html += label(ctx, 60, sy - 32, 'In this document', 444);
    secs.forEach((s, i) => {
      const yy = sy + i * 26;
      html += put(ctx, { x: 60, y: yy, w: 40, h: 22, cls: 'num', role: 'edge', size: 14, line: 22, weight: 600, style: 'font:600 14px/22px var(--chrome);font-stretch:75%;color:var(--quiet)', html: A(frameLabel(s.pages[0].no)) })
        + put(ctx, { x: 100, y: yy, w: 404, h: 22, role: 'body', size: 14, line: 22, style: 'font:400 14px/22px var(--body);color:var(--ink)', html: A(s.title) });
    });
    // not in this document: where those things live instead
    const NOT = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']];
    html += label(ctx, 528, sy - 32, 'Not in this document', 444);
    let ny = sy;
    for (const [a, b] of NOT) {
      html += put(ctx, { x: 528, y: ny, w: 444, h: 22, role: 'body', size: 14, line: 22, weight: ctx.weights.medium, style: `font:${ctx.weights.medium} 14px/22px var(--body);color:var(--ink)`, html: A(a) })
        + put(ctx, { x: 528, y: ny + 22, w: 444, h: 22, cls: 'cx', html: A(b) });
      ny += 44 + 16;
    }
    const right = label(ctx, 996, 512, 'Version') + put(ctx, { x: 996, y: 536, w: 444, h: 22, cls: 'cx', html: A(`Version ${B.version.number}, ${fullDate(ctx)}`) }) + put(ctx, { x: 996, y: 568, w: 444, h: 22, cls: 'cx', html: A('Made with UIL4B') });
    return page(ctx, 'contact-scope', html + capCol(ctx, 'contact-scope') + right);
  },
};

export function css() {
  return `.pg .g1-lst{font:400 14px/22px var(--body);color:var(--soft)}
.pg .g1-e{margin-right:20px}
.pg .g1-e:last-child{margin-right:0}
.pg .g1-n{font:600 14px/22px var(--chrome);font-stretch:75%;font-variant-numeric:tabular-nums;color:var(--quiet);margin-right:6px}
.pg .g1-not{font:400 16px/24px var(--body);color:var(--quiet);white-space:normal;text-decoration:line-through;text-decoration-thickness:1px;text-decoration-color:var(--quiet)}
.pg .g1-tight{letter-spacing:-0.02em}
`;
}
