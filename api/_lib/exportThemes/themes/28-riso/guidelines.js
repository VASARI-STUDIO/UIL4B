// Guidelines pages for theme 28 (Riso), round 1: cover, intro, palette, typefaces, business-card (applications), layouts. Every page is one A4 sheet (794 x 1123) made by sheet():
// a plate, a pass and a hit, then clean, in-register content. Coordinates are the spec's.
import { sheet, A, fitW, longDate, wrap, displayStem, faceCss, faceFor, sectionNo, pressOf, inkW, inkLayers, logoOnPlate, fitSentences, r1, val, PAGE_LABEL, W, X0, X1 } from './sheet.js';
import { mul, scr } from './press.js';
import { wallLight, wallSvg } from './wall.js';
import { bookBrand } from './copy.js';
import { plateImg } from '../../engine/plate.js';

// the brand's display line in explicit lines: the largest size in `sizes` that wraps to at most `maxLines` in maxW
function setLine(ctx, text, sizes, maxW, maxLines) {
  const stem = displayStem(ctx);
  let pick = null;
  for (const [size, line] of sizes) { const lines = phraseWrap(stem, text, size, maxW, -0.01); pick = { size, line, lines }; if (lines.length <= maxLines) break; }
  // balance: narrow the measure while the line count holds, so the lines come out near equal (text-wrap: balance, done by hand so the count is the count)
  // (a text of several sentences keeps one sentence to a line, so there is nothing to balance)
  if (sentences(text).length < 2) for (let w = maxW - 8; w > 120; w -= 8) { const l = phraseWrap(stem, text, pick.size, w, -0.01); if (l.length !== pick.lines.length) break; pick.lines = l; }
  return pick;
}
// a poster headline in explicit lines, broken where the sentence breaks: each sentence stays whole on a line where it fits; where it must wrap, no line
// ends on a function word and no line is a lone word shorter than eight letters. The largest size that meets the line budget wins (one line per sentence, then up to two).
const FN = new Set('a an the and or but nor of to in on at by for from with as if so is are was be it its we you our your their this that before after than into onto over under up out off per via'.split(' '));
function posterLines(ctx, text, maxW, sizes) {
  const stem = displayStem(ctx), units = sentences(text).length ? sentences(text) : [String(text).trim()];
  const bare = (w) => w.replace(/[^\p{L}\p{N}]+/gu, '').toLowerCase();
  // every way to cut the words of one unit into k lines, kept when each line fits, none of them stops on a function word and none is a lone short word
  const layouts = (words, size, k) => {
    const out = [], rec = (i, acc) => {
      if (acc.length === k - 1) { acc = [...acc, words.slice(i)]; } else { for (let j = i + 1; j < words.length; j++) rec(j, [...acc, words.slice(i, j)]); return; }
      const lines = acc.map((l) => l.join(' '));
      if (acc.some((l) => !l.length)) return;
      if (lines.some((t) => inkW(stem, t, size, -0.01) > maxW)) return;
      if (k > 1 && acc.some((l, n) => (n < k - 1 && FN.has(bare(l[l.length - 1]))) || (l.length === 1 && bare(l[0]).length < 8))) return;
      const ws = lines.map((t) => inkW(stem, t, size, -0.01));
      out.push({ lines, spread: Math.max(...ws) - Math.min(...ws) });
    };
    rec(0, []);
    return out.sort((a, b) => a.spread - b.spread)[0] || null;
  };
  const fit = (size, budget) => {
    const per = units.map((u) => { const w = u.split(/\s+/); for (let k = 1; k <= Math.min(w.length, 3); k++) { const l = layouts(w, size, k); if (l) return l.lines; } return null; });
    if (per.some((x) => !x)) return null;
    const lines = per.flat();
    return lines.length <= budget ? lines : null;
  };
  // a headline never goes below `floor` to save a line on the first pass; only when no layout of a headline that size is clean does the second pass take the smaller sizes
  for (const floor of [34, 0]) for (const budget of [units.length, units.length + 1, units.length * 2, 4]) for (const [size, line] of sizes.filter(([z]) => z >= floor)) { const lines = fit(size, budget); if (lines) return { size, line, lines }; }
  const [size, line] = sizes[sizes.length - 1];
  return { size, line, lines: wrap(stem, text, size, maxW, -0.01) };
}
// a text of several sentences breaks between its sentences (a sentence that is too wide for the measure wraps inside itself); one sentence wraps by words
function phraseWrap(stem, text, size, maxW, track) {
  const ss = sentences(text);
  return ss.length < 2 ? wrap(stem, text, size, maxW, track) : ss.flatMap((s) => wrap(stem, s, size, maxW, track));
}
// a wrap with no widow: if the last line is one word, narrow the measure while the line count holds until it carries two
function wrapNW(stem, text, size, maxW, track = 0) {
  let lines = wrap(stem, text, size, maxW, track);
  if (lines.length > 1 && !/\s/.test(lines[lines.length - 1])) {
    for (let w = maxW - 4; w > maxW * 0.6; w -= 4) { const l = wrap(stem, text, size, w, track); if (l.length !== lines.length) break; if (/\s/.test(l[l.length - 1])) { lines = l; break; } }
  }
  return lines;
}

// whole sentences of a text (each ends at its own full stop, never mid-phrase)
const sentences = (t) => (String(t || '').match(/[^.!?]+[.!?]+/g) || []).map((x) => x.trim());
// the brand's lines, one for each surface, so no line prints on more than two surfaces and the pages that carry two show two different lines:
// a = lines.primary (intro, hero poster); b = lines.others[0] (poster 2, Thursday piece); c = lines.others[1], else the first sentence of the third social post
// (poster 3, type specimen); d = the first principle example that is not a variant of a, b or c, by its first two words (type display sample, flood card).
// All of it is brand data; nothing is written here.
function lineSet(ctx) {
  const B = bookBrand(ctx), o = B.lines.others || [];
  const a = B.lines.primary, b = o[0] || a;
  const c = o[1] || sentences((B.applications.social || [])[2])[0] || b;
  const fw = (t) => String(t).toLowerCase().split(/\s+/).slice(0, 2).join(' ');
  const taken = [a, b, c].map(fw);
  // (an example that is only a sentence of line a, once the book has cut a word from it, is not a new line)
  const inA = (e) => sentences(e).every((x) => sentences(a).some((y) => norm(x) === norm(y)));
  const d = (B.voice.principles || []).map((p) => p.example).find((e) => e && !taken.includes(fw(e)) && !inA(e)) || b;
  return { a, b, c, d };
}

// ---- the copy plan: every printed line allotted once, from brand data, so no sentence prints on two pages ----
// Slots are filled in an order; each takes the first candidate that clashes with nothing already printed (same sentence, or one that holds the other
// when the shorter has 4+ words). When a brand's pool runs dry, the candidate with the fewest clashes is taken, so reuse is the least the data allows.
// The hero line (a) is the one deliberate share: the intro headline and the hero poster are the same line.
const norm = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}:]+/gu, ' ').trim();
const nwords = (n) => (n ? n.split(' ').length : 0);
const units = (t) => { const s = sentences(t); return s.length ? s : (String(t || '').trim() ? [String(t).trim()] : []); };
const cap1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function copyPlan(ctx) {
  if (ctx._copy) return ctx._copy;
  const B = bookBrand(ctx), V = B.voice, T = B.type, L = lineSet(ctx), uses = new Map();
  const keys = (t) => units(t).map(norm).filter(Boolean);
  const clash = (t, m = uses) => keys(t).filter((n) => [...m.keys()].some((u) => u === n || (nwords(u) >= 3 && n.includes(u)) || (nwords(n) >= 3 && u.includes(n)))).length;
  const take = (t, m = uses) => { keys(t).forEach((n) => m.set(n, (m.get(n) || 0) + 1)); return t; };
  const pick = (cands, max = 1e9) => {
    const c = cands.filter((t) => t && t.length <= max); let best = null;
    for (const t of c) if (best === null || clash(t) < clash(best)) best = t;
    return best === null ? '' : take(best);
  };
  const free = (arr) => arr.filter((t) => clash(t) === 0);
  const plan = { a: L.a, p1: B.poster1 || L.a };
  take(L.a);
  if (B.poster1) take(plan.p1);
  plan.introBody = free(units(V.boilerplate50)).join(' ') || V.boilerplate50;
  take(plan.introBody);
  take(T.sample.paragraph);
  // the pool for the display slots: whole lines first, then each of their sentences, then the rest of the brand's own copy
  const pool = [...new Set([L.d, L.c, L.b, ...[L.d, L.c, L.b].flatMap(units), ...units(V.boilerplate25), ...units(T.sample.caption), ...(B.applications.social || []).flatMap(units),
    ...V.principles.flatMap((p) => units(p.example)), ...units(T.sample.headline)])].filter((t) => norm(t).length > 3);
  // the posters first (the hero line a is the one share); a street brand has no third poster (see business-card)
  plan.p2 = pick([L.b, L.c, L.d, ...pool], 60);
  plan.p3 = /street/i.test(JSON.stringify(B.imagery)) ? '' : pick([L.c, L.d, L.b, ...pool], 60);
  // the Thursday piece: the second principle's example, cut at its first comma (or before "from") into two halves; a half a poster already carries is left out
  const ex = V.principles[1].example, cut = ex.match(/^(.+?)(?:,\s+|\s+(?=from\b))(.+)$/);
  const halves = cut ? [cut[1].replace(/[.!?]+$/, '') + '.', cap1(cut[2])] : [ex];
  const hf = free(halves);
  // when a poster already carries one half, the other would print as a recapitalised fragment: print the whole sentence instead
  const use = hf.length === halves.length ? hf : [ex];
  plan.exHead = use[0]; plan.exClause = use[1] || ''; take(use.join(' '));
  // the handout: the boilerplate's sentences that nothing else prints
  let hs = free(units(V.boilerplate25));
  if (!hs.length) hs = [pick(units(V.boilerplate25))]; else take(hs.join(' '));
  plan.hoHead = hs[0]; plan.hoRest = hs.slice(1).join(' ');
  plan.tfHead = pick([L.c, L.d, L.b, ...pool], 30);
  plan.tfDisp = pick([L.d, L.c, ...pool], 56);
  const cap = free(units(T.sample.caption));
  plan.label = cap.length ? cap.join(' ') : pick([T.sample.caption]);
  if (cap.length) take(plan.label);
  // the flood card: a line only if nothing else prints it; else the card is the colour and the logo
  // (it also stays clear of the three trait lines the intro prints: a poster or label may echo them, a bare card may not)
  const soft = new Map(); (B.personality || []).slice(0, 3).forEach((t) => take(t.means, soft));
  const fl = [L.d, L.c, L.b, ...pool].find((t) => t.length <= 56 && clash(t) === 0 && clash(t, soft) === 0);
  plan.flood = fl ? take(fl) : '';
  // specimen rows: whole short copy from the voice (the write-this examples and the pool), the longest that fits; clash-free first
  // (the product's own microcopy joins them: a toast, an alert, a hint and an error are text the brand prints)
  const S = ((B.ui || {}).screen || {}).content || {}, Fm = S.form || {};
  const rowPool = [...new Set([...(V.writeThis || []).flatMap((w) => units(w.write)), ...[S.toast, S.alert, S.inline, Fm.readyError, Fm.bookWhy].filter(Boolean).flatMap(units), ...pool])];
  // a session has its own tally, so a page built twice (two editions) picks the same rows twice
  // the display and headline sizes are wide: when no sentence fits, a short label the product prints (a button, a title) is the row
  const Ex = S.example || {};
  const labelPool = [...new Set([Fm.title, Fm.book, (S.empty || {}).cta, Ex.secondary, Ex.small, Ex.quiet, Ex.danger, (S.dialog || {}).confirm].filter(Boolean))];
  plan.rowSession = () => {
    const m = new Map(uses);
    return (fits, labels) => { const ok = (labels ? labelPool : rowPool).filter(fits).sort((x, y) => clash(x, m) + clash(x, soft) - clash(y, m) - clash(y, soft) || y.length - x.length); return ok.length ? take(ok[0], m) : ''; };
  };
  return (ctx._copy = plan);
}

const own = {
  cover(ctx) {
    const B = ctx.brand, v = B.version.number, num = v.length > 4 ? v.split('.')[0] : v;
    copyPlan(ctx); // fixes the order the lines are allotted in, whichever page is built first
    const lw = fitW(ctx, 'colour', 578, 280), P = pressOf(ctx), g = ctx.logo.geos.colour;
    const logo = ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' });
    // a brand whose logo plate is the plate drum and whose lockup is stacked (the plate above the name): the logo's own square hangs flush
    // under the plate as a tab, printed with multiply so it meets the plate as one ink. Otherwise the logo stands clear below.
    const tabOK = String(((B.logo.colourways || {}).colour || {}).plate || '').toUpperCase() === P.plate.toUpperCase() && g.h / g.w > 0.3;
    const inner = `<p class="a c-body" style="left:49px;top:48px;font-weight:600;color:var(--key)">Brand guidelines</p>
<p class="a c-body" style="left:49px;top:69px;color:var(--key)">Edition <span class="v">${A(v)}</span>, ${A(longDate(B.version.date))}</p>${tabOK ? '' : `
<div class="a" style="left:49px;top:716px;width:${lw}px">${logo}</div>`}`;
    const tab = tabOK ? `<div class="a" style="left:49px;top:676px;width:${lw}px;z-index:2;mix-blend-mode:multiply">${logo}</div>` : '';
    return sheet(ctx, 'cover', { hp: 676, hit: { text: num, x: 49, base: 628, size: 200 }, tab }, inner);
  },
  intro(ctx) {
    const B = bookBrand(ctx), CP = copyPlan(ctx), ln = setLine(ctx, CP.a, [[56, 60], [48, 52], [40, 44]], 578, 2);
    const pers = B.personality.slice(0, 3);
    const rows = pers.map((t, i) => `<div class="a" style="left:49px;top:${789 + i * 62}px;width:578px;height:62px;border-top:.5px solid var(--hair)"></div>
<p class="a bn" style="left:49px;top:${789 + i * 62 + 12}px;width:106px;font:600 14px/20px var(--body)">${A(t.trait)}</p>
<p class="a bn" style="left:167px;top:${789 + i * 62 + 12}px;width:460px;font:400 13px/19px var(--body)">${A(t.means)}</p>`).join('');
    const inner = `<p class="a c-label" style="left:49px;top:48px;color:var(--ptxt)">Introduction</p>
<h1 class="a bd" style="left:49px;top:96px;width:578px;margin:0;${faceCss(ctx, 'display', 500)};font-size:${ln.size}px;line-height:${ln.line}px;letter-spacing:-.01em;color:var(--ptxt);white-space:nowrap">${ln.lines.map(A).join('<br>')}</h1>
<p class="a c-label" style="left:49px;top:592px">Who we are</p>
<p class="a bn" style="left:49px;top:616px;width:460px;white-space:nowrap;font:400 16px/25px var(--body)">${wrapNW(faceFor(ctx, 'body', 400).stem, CP.introBody, 16, 460, 0).map(A).join('<br>')}</p>${rows}`;
    return sheet(ctx, 'intro', { hp: 560, hit: { text: sectionNo(ctx, 'intro'), x: 49, base: 512, size: 240 } }, inner);
  },
  palette(ctx) {
    const P = pressOf(ctx), B = ctx.brand, cols = ctx.colours, n = cols.length;
    const words = ['zero', 'one', 'two', 'three', 'four'];
    const paperCol = cols.find((c) => c.hex.toUpperCase() === P.paper.toUpperCase());
    const paperName = paperCol ? paperCol.name : 'Offset', paperShare = paperCol ? Math.round(paperCol.share * 100) : 0;
    // the share panel: each other colour a flat square whose area is its share of one page (173,400 px2), drums in drum order, then spots, then paper tints
    const printed = P.drums.map((d) => cols.find((c) => c.hex.toUpperCase() === d.hex.toUpperCase())).filter(Boolean);
    const order = [...printed, ...P.spots, ...P.paperTints].filter((c, i, a) => a.indexOf(c) === i);
    const PX0 = 49, PW = 578, PB = 504, AREA = 173400;
    let x = PX0, rowBottom = PB, rowTop = PB, chips = '', labs = '';
    const placed = [];
    for (const c of order) {
      const side = Math.min(228, Math.max(24, Math.round(Math.sqrt(c.share * AREA))));
      if (x + side > PX0 + PW + 0.5 && x > PX0) { x = PX0; rowBottom = rowTop; }
      placed.push({ c, x, side, bottom: rowBottom });
      rowTop = Math.min(rowTop, rowBottom - side);
      x += side;
    }
    const edge = (hex) => ctx.ratio(hex, P.paper) < 1.3;
    for (const p of placed) {
      chips += `<div class="a" style="left:${p.x}px;top:${p.bottom - p.side}px;width:${p.side}px;height:${p.side}px;background:${p.c.hex}${edge(p.c.hex) ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : ''}"></div>`;
    }
    // labels under the panel, only for the bottom row (the chips on the first row); a chip under 60 wide shows only its share
    placed.filter((p) => p.bottom === PB).forEach((p) => {
      labs += `<p class="a c-note nw" style="left:${p.x}px;top:516px;font-weight:600">${p.side >= 60 ? A(p.c.name) : ''}</p><p class="a c-value nw" style="left:${p.x}px;top:${p.side >= 60 ? 530 : 516}px">${Math.round(p.c.share * 100)}%</p>`;
    });
    const nm = P.drums.length;
    // what the press makes where two inks cross: the real overlap, two layers with multiply, in register, no mottle; a screen shown as a screen
    const passName = P.passScreen ? `${P.passDrum.name} screen` : P.passDrum.name;
    const ovr = [
      { name: `${passName} on ${paperName}`, under: P.paper, over: P.pass, scr: P.passScreen, val: P.passOnPaper, approx: !!P.passScreen },
      { name: `${passName} over ${P.plateDrum.name}`, under: P.plate, over: P.passPlate || P.pass, scr: P.passScreen, val: P.passOnPlate, approx: !!P.passScreen },
      { name: `${P.hitDrum.name} over ${P.plateDrum.name}`, under: P.plate, over: P.hit, scr: 0, val: P.hitOnPlate, approx: false },
    ].filter((o, i, a) => a.findIndex((q) => q.val === o.val) === i);
    const seq = ovr.map((o, i) => {
      const cx = 49 + i * 136;
      return `<div class="a" style="left:${cx}px;top:588px;width:120px;height:64px;isolation:isolate${edge(o.under) ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : ''}"><i style="position:absolute;inset:0;background:${o.under}"></i><i class="${o.scr ? 'mk' + o.scr : ''}" style="position:absolute;inset:0;background:${o.over};mix-blend-mode:multiply"></i></div>
<div class="a" style="left:${cx}px;top:660px;width:120px"><p class="c-note" style="margin:0;font-weight:600">${A(o.name)}</p><p class="c-value nw" style="margin:2px 0 0">${o.approx ? '≈ ' : ''}${o.val}</p></div>`;
    }).join('');
    // the values table
    const TY = 752, rh = Math.min(44, Math.floor((1048 - TY - 20) / n)); // 32 px of clear paper above the table: the chip captions end at about 696
    const role = (c) => P.drums.some((d) => d.hex.toUpperCase() === c.hex.toUpperCase()) ? `Printed ${P.num(c)} of ${nm}` : c.hex.toUpperCase() === P.paper.toUpperCase() ? 'Paper' : P.paperTints.includes(c) ? 'Paper tint, not printed' : 'Not printed';
    const ordered = [...cols];
    const head = [['Name', 73], ['On the press', 167], ['HEX', 285], ['RGB', 357], ['OKLCH', 457]].map(([h, hx]) => `<p class="a c-label" style="left:${hx}px;top:${TY}px">${h}</p>`).join('');
    const rows = ordered.map((c, i) => {
      const y = TY + 20 + i * rh, oklch = c.oklch.replace('oklch(', '').replace(')', '');
      return `<div class="a" style="left:49px;top:${y}px;width:578px;border-top:.5px solid var(--hair)"></div>
<i class="a" style="left:49px;top:${y + (rh - 16) / 2}px;width:16px;height:16px;background:${c.hex}${edge(c.hex) ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : ''}"></i>
<p class="a bn nw" style="left:73px;top:${y + (rh - 18) / 2}px;font:600 13px/18px var(--body)">${A(c.name)}</p>
<p class="a c-note nw" style="left:167px;top:${y + (rh - 17) / 2}px">${role(c)}</p>
<p class="a c-value nw" style="left:285px;top:${y + (rh - 14) / 2}px">${A(c.hex)}</p>
<p class="a c-value nw" style="left:357px;top:${y + (rh - 14) / 2}px">${ctx.C.hexToRgb(c.hex).join(' ')}</p>
<p class="a c-value nw" style="left:457px;top:${y + (rh - 14) / 2}px">${A(oklch)}</p>`;
    }).join('');
    const sub = P.offset ? `Printed in ${words[nm]} inks on Offset, a stock, not a brand colour.` : `Printed in ${words[nm] || nm} ink${nm === 1 ? '' : 's'} on ${paperName}.`;
    const inner = `<p class="a c-label" style="left:403px;top:48px;color:var(--ptxt)">${PAGE_LABEL.palette}</p>
<p class="a c-body" style="left:403px;top:68px;width:224px;color:var(--ptxt)">${A(sub)}</p>
<div class="a" style="left:49px;top:264px;width:578px;height:240px;border:.5px solid var(--hair)"></div>
<p class="a c-note nw" style="left:61px;top:276px"><b style="font-weight:600">${A(paperName)}</b> <span class="c-value">${paperShare}%</span></p>
${chips}${labs}
<p class="a c-label" style="left:49px;top:568px">On the press</p>${seq}
<p class="a c-note" style="left:465px;top:588px;width:162px">These colours happen on the press where two inks cross. They are not brand colours; never specify them.</p>
${head}${rows}<div class="a" style="left:49px;top:${TY + 20 + n * rh}px;width:578px;border-top:.5px solid var(--hair)"></div>`;
    return sheet(ctx, 'palette', { hp: 232, hit: { text: sectionNo(ctx, 'palette'), x: 49, base: 200, size: 200 } }, inner);
  },
  'business-card'(ctx) {
    const B = ctx.brand, P = pressOf(ctx), g = ctx.logo.geos.colour, CP = copyPlan(ctx);
    // an A2 poster, 420 x 594 mm at 1 px per mm: plate, pass, a knocked-out numeral, the line, the logo. The plate and the pass bleed 8 px past the sheet so a drum
    // out of register never leaves a sliver of bare paper along the edge (it would read as a bright rim round the poster in its scene)
    // land: the same poster turned to A2 landscape (594 x 420 mm) for the drawings wall, whose sheets are 1.414:1; the plate is a column on the left, the pass a band at the right
    const poster = (i, text, land = false) => {
      const PW = land ? 594 : 420, PH = land ? 420 : 594;
      const ln = posterLines(ctx, text, land ? 232 : 296, Array.from({ length: 33 }, (_, n) => [60 - n, Math.round((60 - n) * 1.1)]));
      const lw = fitW(ctx, 'colour', 120, 80), lh = (g.h * lw) / g.w;
      const ink = inkLayers(ctx, `poster:${i}`, land ? { w: PW, h: PH, plate: { x: -8, y: -8, w: 244, h: 436 }, pass: { x: 512, y: -8, w: 90, h: 436 }, hit: { text: String(i + 1), x: 24, base: 290, size: 160, maxW: 196 } }
        : { w: PW, h: PH, plate: { x: -8, y: -8, w: 436, h: 258 }, pass: { x: 336, y: -8, w: 92, h: 610 }, hit: { text: String(i + 1), x: 28, base: 224, size: 160, maxW: 300 } });
      const inner = `${ink.html}<div class="lay" style="z-index:3">
<h1 class="a" style="left:${land ? 260 : 28}px;top:${land ? 48 : 280}px;width:${land ? 232 : 296}px;margin:0;${faceCss(ctx, 'display', 500)};font-size:${ln.size}px;line-height:${ln.line}px;letter-spacing:-.01em;color:var(--key);white-space:nowrap">${ln.lines.map(A).join('<br>')}</h1>
<div class="a" style="left:${land ? 260 : 28}px;top:${(land ? 392 : 566) - lh}px;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div></div>`;
      return { html: ctx.artPage(inner, { w: PW, h: PH }), w: PW, h: PH };
    };
    // a business card, 90 x 55 mm at 4 px per mm
    const cwPlate = logoOnPlate(ctx), lwF = fitW(ctx, 'colour', 200, 100), lhF = (g.h * lwF) / g.w;
    const front = (() => {
      const ink = inkLayers(ctx, 'card:front', { w: 360, h: 220, plate: { x: 0, y: 0, w: 360, h: 220 }, pass: { x: 320, y: -4, w: 44, h: 228 }, hit: null });
      const inner = `${ink.html}<div class="lay" style="z-index:3"><div class="a" style="left:${Math.round((320 - lwF) / 2)}px;top:${Math.round((220 - lhF) / 2)}px;width:${lwF}px">${ctx.logo.html('colour', { width: lwF, colourway: cwPlate, label: 'Your logo goes here' })}</div></div>`;
      return { html: ctx.artPage(inner, { w: 360, h: 220 }), w: 360, h: 220 };
    })();
    const c = B.applications.card, url = B.applications.site.url, urlCol = ctx.ratio(P.hit, P.paper) >= 4.5 ? 'var(--hit)' : 'var(--key)';
    // the back's copy is set so it prints at 9 px or more in the photo (the card is about 0.7 of its art size there)
    const back = (() => {
      const inner = `<div class="lay" style="z-index:3">
<p class="a nw" style="left:24px;top:22px;${faceCss(ctx, 'body', 600)};font-size:24px;line-height:28px;color:var(--key)">${A(c.person)}</p>
<p class="a nw" style="left:24px;top:52px;${faceCss(ctx, 'body', 400)};font-size:16px;line-height:20px;color:var(--key)">${A(c.role)}</p>
<p class="a nw" style="left:24px;top:150px;${faceCss(ctx, 'body', 400)};font-size:16px;line-height:20px;color:var(--key)">${A(c.contact)}</p>
<p class="a nw" style="left:24px;top:174px;${faceCss(ctx, 'body', 600)};font-size:16px;line-height:20px;color:${urlCol}">${A(url)}</p></div>`;
      return { html: ctx.artPage(inner, { w: 360, h: 220 }), w: 360, h: 220 };
    })();
    // a street brand (by its imagery brief): the hero poster on a painted wall (counter-wall-poster), poster 2 on a brick wall at night (late-door-poster); both new scenes carry their own light, so no wall.js overlay. Any other brand: the hero on a wall
    // of its own and two smaller ones on the drawings wall. The cards close up either way.
    const street = /street/i.test(JSON.stringify(B.imagery));
    const pHero = street ? ctx.mockup('counter-wall-poster', { poster: poster(0, CP.p1) }) : null;
    const pSmall = street ? ctx.mockup('late-door-poster', { poster: poster(1, CP.p2) }) : ctx.mockup('bench-drawings-wall', { 'sheet-left': poster(0, CP.p1, true), 'sheet-mid': poster(1, CP.p2, true), 'sheet-right': poster(2, CP.p3, true) });
    const pCards = ctx.mockup('card-black-paper', { 'card-front': front, 'card-back': back });
    // a crop of a photographed scene (sw x sh px): the box x0,y0,w,h of it, shown dw px wide at left,top. lit = [scene id, the quads (surface numbers) a poster is on]:
    // the light and shadow of that scene go over the crop (wall.js), so a sheet sits in its wall instead of on it
    const crop = (src, sw, sh, x0, y0, w, h, dw, left, top, alt, lit) => {
      const k = dw / w, sc = lit && ctx.sceneInfo(lit[0]), map = (p) => [(p[0] - x0) * k, (p[1] - y0) * k];
      const over = lit ? wallSvg(dw, h * k, lit[1].map((q) => wallLight(sc, q, map, P, 250 / 594))) : '';
      return `<div class="a" style="left:${left}px;top:${top}px;width:${dw}px;height:${r1(h * k)}px;overflow:hidden">${plateImg(A(src), A(alt), `position:absolute;left:${r1(-x0 * k)}px;top:${r1(-y0 * k)}px;width:${r1(sw * k)}px;height:${r1(sh * k)}px;max-width:none;display:block`)}${over}</div>`;
    };
    // Street brand: two posters side by side, one height, with one caption under them; any other brand: all three posters on the drawings wall, full width.
    // The cards caption sits directly above the cards.
    const posterCap = (y) => `<p class="a c-note" style="left:49px;top:${y}px;width:578px">Posters, A2: ${val('420 × 594 mm')}.</p>`;
    const cardsCap = (y) => `<p class="a c-note" style="left:49px;top:${y}px;width:578px">Business cards, ${val('90 × 55 mm')}, front and back.</p>`;
    const inner = `<p class="a c-label" style="left:403px;top:48px;color:var(--ptxt)">${PAGE_LABEL['business-card']}</p>
${street ? `${crop(pHero, 1024, 1536, 90, 100, 674, 830, 272, 49, 332, `${B.name} poster on a painted wall`)}
${crop(pSmall, 1024, 1536, 410, 90, 614, 700, 294, 333, 332, `${B.name} poster on a brick wall at night`)}
${posterCap(679)}${cardsCap(715)}
${crop(pCards, 1536, 1024, 150, 165, 1237, 690, 540, 68, 740,`${B.name} business card, front and back, on black paper`)}` : `${crop(pSmall, 1536, 1024, 100, 165, 1240, 566, 578, 49, 332, `${B.name} three posters on a drawings wall`)}
${posterCap(608)}${cardsCap(644)}
${crop(pCards, 1536, 1024, 150, 134, 1237, 773, 578, 49, 669, `${B.name} business card, front and back, on black paper`)}`}`;
    return sheet(ctx, 'business-card', { hp: 300, hit: { text: sectionNo(ctx, 'business-card') || '08', x: 49, base: 268, size: 220 } }, inner);
  },
  layouts(ctx) {
    const B = bookBrand(ctx), P = pressOf(ctx), gC = ctx.logo.geos.colour, gS = ctx.logo.geos.symbol, CP = copyPlan(ctx);
    const SX = 63, SY = 268, SW = 550, SH = 774;
    const cwPlate = logoOnPlate(ctx);
    const bStem = (w) => faceFor(ctx, 'body', w).stem;
    const para = (text, w, size, lh, maxW, extra = '') => `<p class="a nw" style="${faceCss(ctx, 'body', w)};font-size:${size}px;line-height:${lh}px;${extra}">${wrapNW(bStem(w), text, size, maxW, 0).map(A).join('<br>')}</p>`;
    const paraLines = (lines, w, size, lh, extra = '') => `<p class="a nw" style="${faceCss(ctx, 'body', w)};font-size:${size}px;line-height:${lh}px;${extra}">${lines.map(A).join('<br>')}</p>`;
    // one piece: its ink (plate, pass, hit) misregistered by its own seed, clipped at the trim, then its words and logo clean
    const piece = (key, px, py, pw, ph, ink, content, blend = "") => {
      const Lk = inkLayers(ctx, 'piece:' + key, { w: pw, h: ph, ...ink });
      // the trim: a stock tint under the piece and a half-point line of the key at 40% on its edge, so a piece with no plate still reads as a cut sheet
      return `<div class="a" style="left:${r1(px - SX)}px;top:${r1(py - SY)}px;width:${pw}px;height:${ph}px;overflow:hidden;background:rgba(0,0,0,.035)">${Lk.html}${blend}<div class="lay" style="z-index:3">${content}</div><i class="a" style="inset:0;z-index:5;box-shadow:inset 0 0 0 .5px color-mix(in srgb,var(--key) 40%,transparent)"></i></div>`;
    };
    const logoAt = (id, cw, w, x, y) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px">${ctx.logo.html(id, { width: w, colourway: cw, label: 'Your logo goes here' })}</div>`;
    // an 8 px gutter of bare paper between the pieces; the six pieces are centred on the sheet
    const AW = 254.6, AH5 = 361.2, AH6 = 180.6, G = 8;
    const X1_ = r1(SX + (SW - 2 * AW - G) / 2), X2_ = r1(X1_ + AW + G), Y1_ = r1(SY + (SH - AH5 - 2 * AH6 - 2 * G) / 2), Y2_ = r1(Y1_ + AH5 + G), Y3_ = r1(Y2_ + AH6 + G);
    const lw72 = 72, lh72 = (gC.h * lw72) / gC.w;
        const dispAt = (ln, x, y, col, w = 200) => `<h2 class="a" style="left:${x}px;top:${y}px;width:${w}px;margin:0;${faceCss(ctx, 'display', 500)};font-size:${ln.size}px;line-height:${ln.line}px;letter-spacing:-.01em;color:${col};white-space:nowrap">${ln.lines.map(A).join('<br>')}</h2>`;
    // 1. A5 handout: the logo symbol on the plate, then the boilerplate: its first sentence is the headline (no brand line), the rest is the body
    const swH = Math.round((44 * gS.w) / gS.h);
    const head1 = CP.hoHead, rest = CP.hoRest;
    // the largest headline for which the first whole sentence of the body still clears the logo; the body is cut at the last whole sentence that fits
    let prim = null, bf = { lines: [] }, bTop = 0;
    for (const [sz, ln] of [[24, 28], [22, 26], [20, 24]]) {
      prim = setLine(ctx, head1, [[sz, ln]], 186, 4); bTop = 168 + prim.lines.length * prim.line + 12;
      const room = Math.floor((AH5 - 16 - lh72 - 12 - bTop) / 16);
      if (!rest) break;
      bf = fitSentences(bStem(400), rest, 12, 188, Math.max(1, room));
      if (bf.lines.length <= room && wrap(bStem(400), sentences(rest)[0], 12, 188, 0).length <= room) break;
    }
    const p1 = piece('handout', X1_, Y1_, AW, AH5, { plate: { x: 0, y: 0, w: AW, h: 144 }, pass: { x: AW - 30, y: -4, w: 30, h: AH5 + 8 }, hit: null },
      `${logoAt('symbol', cwPlate, swH, 24, 24)}${dispAt(prim, 16, 168, 'var(--key)')}<div style="position:absolute;left:16px;top:${bTop}px">${paraLines(bf.lines, 400, 12, 16)}</div>${logoAt('colour', 'colour', lw72, 16, r1(AH5 - 16 - lh72))}`);
    // 2. A5 Thursday: the plate floods the piece; the hour of the example, if it has one, is the hit
    // the headline and the clause under it are the two halves of the second principle's example (see copyPlan), so nothing here is a line the posters carry
    const oth = setLine(ctx, CP.exHead, [[28, 32], [24, 28]], 200, 4);
    const ex = B.voice.principles[1].example, hm = ex.match(/\b(\d{1,2}):\d\d\b/) || ex.match(/\b(\d{1,2})\s?(?:am|pm)\b/i);
    const clause = CP.exClause;
    const exTop = Math.max(120, 24 + oth.lines.length * oth.line + 16);
    let hit2 = null;
    if (hm) { const t = hm[1]; let sz = 120, w = inkW(displayStem(ctx), t, sz, -0.02); while (sz > 64 && AW - 16 - w < 16 + lw72 + 16) { sz -= 4; w = inkW(displayStem(ctx), t, sz, -0.02); } hit2 = { text: t, x: r1(AW - 16 - w), base: AH5 - 24, size: sz }; }
    const p2 = piece('thursday', X2_, Y1_, AW, AH5, { plate: { x: 0, y: 0, w: AW, h: AH5 }, pass: null, hit: hit2 },
      `${dispAt(oth, 16, 24, 'var(--ptxt)')}${clause ? `<div style="position:absolute;left:16px;top:${exTop}px">${para(clause, 600, 13, 18, 200, 'color:var(--ptxt)')}</div>` : ''}${logoAt('colour', cwPlate, lw72, 16, r1(AH5 - 16 - lh72))}`);
    // 3. A6 card, logo: the plate is a band from the card's edge to the logo's own plate shape (the first bar of the lockup that is printed in the
    // plate colour: Long Room's square, Kerbside's kerb), so band and logo read as one shape. The logo is printed with multiply, so it takes the
    // grain of the plate where the two meet. If the lockup has no such bar, the band is a plain strip at the edge and the logo stands clear.
    const lwC = fitW(ctx, 'colour', 140, 80), lhC = (gC.h * lwC) / gC.w, kC = lwC / gC.w;
    const cwC = (B.logo.colourways || {}).colour || {};
    const barPart = gC.parts.find((p) => !p.tf && String(cwC[p.role] || '').toUpperCase() === P.plate.toUpperCase());
    const bm = barPart && barPart.d.match(/^M\s*([\d.]+)\s+([\d.]+)\s*H\s*([\d.]+)\s*V\s*([\d.]+)/);
    const logoTop = r1((AH6 - lhC) / 2);
    let p3;
    if (bm) {
      const by = r1(logoTop + +bm[2] * kC), bh = r1((+bm[4] - +bm[2]) * kC), lx = Math.round((AW - lwC) / 2 + 24);
      p3 = piece('card-logo', X1_, Y2_, AW, AH6, { plate: { x: 0, y: by, w: lx, h: bh }, pass: null, hit: null }, '',
        `<div class="a" style="inset:0;z-index:2;mix-blend-mode:multiply">${logoAt('colour', 'colour', lwC, lx, logoTop)}</div>`);
    } else {
      p3 = piece('card-logo', X1_, Y2_, AW, AH6, { plate: { x: 0, y: 0, w: 40, h: AH6 }, pass: null, hit: null },
        logoAt('colour', 'colour', lwC, r1(40 + (AW - 40 - lwC) / 2), logoTop));
    }
    // 4. A6 card, label: a plate square, the pass beside it (a strip across the square would read as a logo square)
    const p4 = piece('card-label', X2_, Y2_, AW, AH6, { plate: { x: AW - 30 - 12 - 48, y: AH6 - 16 - 48, w: 48, h: 48 }, pass: { x: AW - 30, y: -4, w: 30, h: AH6 + 8 }, hit: null },
      para(CP.label, 600, 13, 18, 200, 'left:16px;top:16px;color:var(--key)'));
    // 5. A6 card, flood
    // the plate floods the card; line d in the display face, the logo below it
    const fl = CP.flood ? setLine(ctx, CP.flood, [[22, 26], [20, 24]], AW - 32, 3) : null;
    const p5 = piece('card-flood', X1_, Y3_, AW, AH6, { plate: { x: 0, y: 0, w: AW, h: AH6 }, pass: null, hit: null },
      `${fl ? dispAt(fl, 16, 16, 'var(--ptxt)', AW - 32) : ''}${logoAt('colour', cwPlate, lw72, 16, r1(AH6 - 16 - lh72))}`);
    // 6. A6 card, back: the site in the hit if it reads on paper, the email, the symbol (44 px high, as on the handout: the Bodoni L loses its hairlines below that)
    const urlCol = ctx.ratio(P.hit, P.paper) >= 4.5 ? 'var(--hit)' : 'var(--key)';
    const sh6 = 44, sw = Math.round((sh6 * gS.w) / gS.h);
    const p6 = piece('card-back', X2_, Y3_, AW, AH6, { plate: null, pass: null, hit: null },
      `${para(B.applications.site.url, 600, 14, 18, 200, `left:16px;top:16px;color:${urlCol}`)}${para(B.contact.email, 400, 12, 16, 200, 'left:16px;top:40px;color:var(--key)')}${logoAt('symbol', 'colour', sw, r1(AW - 16 - sw), r1(AH6 - 16 - sh6))}`);
    // registration crosses at the sheet's corners (the only crosses in the book), and crop marks at every corner of every piece:
    // 12 px long, 3 px off the trim, in the margin; across a gutter the mark runs from 1.5 px off one piece to 1.5 px off the next
    const cx = [10.5, SW - 10.5], cy = [10.5, SH - 10.5];
    let d = '';
    for (const x of cx) for (const y of cy) d += `M${x - 6.5} ${y}H${x + 6.5}M${x} ${y - 6.5}V${y + 6.5}`;
    const boxes = [[X1_, Y1_, AW, AH5], [X2_, Y1_, AW, AH5], [X1_, Y2_, AW, AH6], [X2_, Y2_, AW, AH6], [X1_, Y3_, AW, AH6], [X2_, Y3_, AW, AH6]].map(([x, y, w, h]) => ({ x1: x, y1: y, x2: x + w, y2: y + h }));
    const marks_ = new Set();
    const add = (ax, ay, bx, by) => marks_.add(`M${r1(ax - SX)} ${r1(ay - SY)}${ay === by ? `H${r1(bx - SX)}` : `V${r1(by - SY)}`}`);
    for (const b of boxes) for (const [px, py, sx, sy] of [[b.x1, b.y1, -1, -1], [b.x2, b.y1, 1, -1], [b.x1, b.y2, -1, 1], [b.x2, b.y2, 1, 1]]) {
      // along x from this corner, outward: the next piece whose box holds this y, on the side sx
      const nx = boxes.filter((o) => o !== b && o.y1 - 0.05 <= py && py <= o.y2 + 0.05 && (sx < 0 ? o.x2 <= px + 0.05 && o.x2 > px - 40 : o.x1 >= px - 0.05 && o.x1 < px + 40));
      if (nx.length) { const gap = Math.abs((sx < 0 ? nx[0].x2 : nx[0].x1) - px); add(px + sx * 1.5, py, px + sx * (gap - 1.5), py); } else add(px + sx * 3, py, px + sx * 15, py);
      const ny = boxes.filter((o) => o !== b && o.x1 - 0.05 <= px && px <= o.x2 + 0.05 && (sy < 0 ? o.y2 <= py + 0.05 && o.y2 > py - 40 : o.y1 >= py - 0.05 && o.y1 < py + 40));
      if (ny.length) { const gap = Math.abs((sy < 0 ? ny[0].y2 : ny[0].y1) - py); add(px, py + sy * 1.5, px, py + sy * (gap - 1.5)); } else add(px, py + sy * 3, px, py + sy * 15);
    }
    d += [...marks_].join('');
    const circles = cx.flatMap((x) => cy.map((y) => `<circle cx="${x}" cy="${y}" r="3.5"/>`)).join('');
    const marks = `<svg class="a" width="${SW}" height="${SH}" viewBox="0 0 ${SW} ${SH}" style="left:0;top:0;z-index:4" aria-hidden="true"><g fill="none" style="stroke:var(--key);stroke-width:.5"><path d="${d}"/>${circles}</g></svg>`;
    const sheetBox = `<div class="a fib" style="left:${SX}px;top:${SY}px;width:${SW}px;height:${SH}px;background:var(--paper);border:.5px solid var(--hair)"><div class="a" style="left:-.5px;top:-.5px;width:${SW}px;height:${SH}px">${p1}${p2}${p3}${p4}${p5}${p6}${marks}</div></div>`;
    const inner = `<p class="a c-label" style="left:403px;top:48px;color:var(--ptxt)">${PAGE_LABEL.layouts}</p>
<p class="a c-body" style="left:403px;top:68px;width:224px;color:var(--ptxt)">One SRA3 sheet: two A5 handouts and four A6 cards, trimmed after printing.</p>${sheetBox}`;
    return sheet(ctx, 'layouts', { hp: 232, hit: { text: sectionNo(ctx, 'layouts') || '07', x: 49, base: 200, size: 200 } }, inner);
  },
  typefaces(ctx) {
    const B = bookBrand(ctx), F = B.fonts, T = B.type, CP = copyPlan(ctx);
    const hasMono = !!F.mono, monoRole = hasMono ? 'mono' : 'body';
    const dItal = !!(F.display.italics && F.display.italics.length);
    // specimen line: the brand line c in the brand display, 3 lines at 60/64 (stepping down if the face is wide)
    const sp = setLine(ctx, CP.tfHead, [[60, 64], [52, 56], [44, 48]], 342, 3);
    const spec = `<p class="a c-label" style="left:49px;top:48px;color:var(--ptxt)">${PAGE_LABEL.typefaces}</p>
<h1 class="a bd" style="left:49px;top:96px;width:342px;margin:0;${faceCss(ctx, 'display', 500)};font-size:${sp.size}px;line-height:${sp.line}px;letter-spacing:-.01em;color:var(--ptxt);white-space:nowrap">${sp.lines.map(A).join('<br>')}</h1>`;
    // the three faces
    const wl = (f, it) => [...f.weights.map(String), ...(it || []).map((w) => `italic ${w}`)].join(', ') + (f.stretch ? `, width ${f.stretch}` : '');
    // display sample: line d, whole
    const dStem = faceFor(ctx, 'display', 500, dItal).stem;
    let dLines = phraseWrap(dStem, CP.tfDisp, 22, 224, -0.01);
    // balance a two-line sample so the last line is not one word
    if (dLines.length === 2 && sentences(CP.tfDisp).length < 2) for (let w = 220; w >= 120; w -= 4) { const t = wrap(dStem, CP.tfDisp, 22, w, -0.01); if (t.length !== 2) break; dLines = t; }
    // the mono column is as wide as the family name needs on one line (16 px), at the right edge; the body column takes what is left of the row
    const bStem = faceFor(ctx, 'body', 400).stem;
    const monoName = (F.mono || F.body).family, monoNeed = Math.ceil(inkW(faceFor(ctx, monoRole, 400).stem, monoName, 16, 0)) + 2;
    const MX = Math.min(521, 627 - monoNeed), BW = Math.min(224, MX - 16 - 285);
    // body paragraph: cut at the last whole sentence that fits 7 lines
    const bLines = fitSentences(bStem, T.sample.paragraph, 14, BW, 7).lines;
    const lines = (arr) => arr.map(A).join('<br>');
    const mStem = faceFor(ctx, monoRole, 400).stem;
    const actionCol = ctx.colours.find((c) => c.role === 'action') || ctx.colours[1] || ctx.colours[0];
    const famLines = (stem, name, size, w) => wrap(stem, name, size, w, 0);
    const dFam = famLines(faceFor(ctx, 'display', 500).stem, F.display.family, 24, 224), bFam = famLines(faceFor(ctx, 'body', 400).stem, F.body.family, 24, 224);
    const mFam = famLines(mStem, monoName, 16, 627 - MX);
    const dFamH = dFam.length * 30, bFamH = bFam.length * 30, mFamH = mFam.length * 20;
    const wy = (h) => 472 + h + 6;
    const blocks = `<p class="a c-label" style="left:49px;top:452px">Display</p>
<p class="a nw" style="left:49px;top:472px;${faceCss(ctx, 'display', 500)};font-size:24px;line-height:30px">${lines(dFam)}</p>
<p class="a c-note nw" style="left:49px;top:${wy(dFamH)}px">${A(wl(F.display, F.display.italics))}</p>
<p class="a nw" style="left:49px;width:224px;top:${wy(dFamH) + 28}px;${faceCss(ctx, 'display', 500, dItal)};font-size:22px;line-height:28px;letter-spacing:-.01em">${lines(dLines)}</p>
<p class="a c-label" style="left:285px;top:452px">Body</p>
<p class="a nw" style="left:285px;top:472px;${faceCss(ctx, 'body', 400)};font-size:24px;line-height:30px">${lines(bFam)}</p>
<p class="a c-note nw" style="left:285px;top:${wy(bFamH)}px">${A(wl(F.body))}</p>
<p class="a nw" style="left:285px;width:${BW}px;top:${wy(bFamH) + 28}px;${faceCss(ctx, 'body', 400)};font-size:14px;line-height:21px">${lines(bLines)}</p>
<p class="a c-label" style="left:${MX}px;top:452px">Mono</p>
<p class="a nw" style="left:${MX}px;top:472px;${faceCss(ctx, monoRole, 400)};font-size:16px;line-height:20px">${lines(mFam)}</p>
<p class="a c-note nw" style="left:${MX}px;top:${wy(mFamH)}px">${A(wl(F.mono || F.body))}</p>
<p class="a nw" style="left:${MX}px;top:${wy(mFamH) + 28}px;${faceCss(ctx, monoRole, 400)};font-size:14px;line-height:20px">${A(actionCol.hex.toUpperCase())}</p>`;
    // the scale table: one row per token, the live sample set in the token's own face, size, weight and line
    const sc = T.scale, nr = sc.length, lhs = sc.map((s) => Math.round(s.size * s.line));
    const pad = Math.min(12, Math.floor((288 - lhs.reduce((a, b) => a + b, 0)) / nr));
    const TY = 760;
    // 32 px of clear paper between the end of the "Size / line" header and the "Weight" header
    const WX = 589, SZX = Math.floor(WX - 32 - inkW(faceFor(ctx, 'body', 600).stem, 'Size / line', 11, 0.11));
    const SW_ = SZX - 16 - 167;
    const head = [['Token', 49], ['Sample', 167], ['Size / line', SZX], ['Weight', WX]].map(([h, hx]) => `<p class="a c-label nw" style="left:${hx}px;top:736px">${h}</p>`).join('');
    // the sample of a row: the longest whole sentence of the brand's copy that fits the column at the token's size and face.
    // If no sentence fits a size, a short label the product prints (see labelPool); else "Aa".
    // (the rows take their own copy, brand text and not the principle titles, which are advice: whatever no other page prints, see copyPlan)
    const nextRow = CP.rowSession();
    let y = TY, rows = '';
    sc.forEach((s, i) => {
      const lh = lhs[i], rh = lh + pad, role = s.face === 'display' ? 'display' : s.face === 'mono' ? monoRole : 'body';
      const stem = faceFor(ctx, role, s.weight).stem, track = role === 'display' ? -0.01 : 0;
      const fits = (t) => inkW(stem, t, s.size, track) <= SW_;
      const shown = nextRow(fits) || nextRow(fits, true) || 'Aa';
      rows += `<div class="a" style="left:49px;top:${y}px;width:578px;border-top:.5px solid var(--hair)"></div>
<p class="a c-note nw" style="left:49px;top:${y + (rh - 17) / 2}px;font-weight:600">${A(s.token)}</p>
<p class="a nw ph-ts" style="left:167px;top:${y + pad / 2}px;max-width:${SW_}px;${faceCss(ctx, role, s.weight)};font-size:${s.size}px;line-height:${lh}px;${role === 'display' ? 'letter-spacing:-.01em;' : ''}">${A(shown)}</p>
<p class="a c-value nw" style="left:${SZX}px;top:${y + (rh - 14) / 2}px">${s.size} / ${lh}</p>
<p class="a c-value nw" style="left:${WX}px;top:${y + (rh - 14) / 2}px">${s.weight}</p>`;
      y += rh;
    });
    rows += `<div class="a" style="left:49px;top:${y}px;width:578px;border-top:.5px solid var(--hair)"></div>`;
    return sheet(ctx, 'typefaces', { hp: 420, hit: { text: sectionNo(ctx, 'typefaces'), x: Math.min(403, r1(639 - 24 - inkW(displayStem(ctx), sectionNo(ctx, 'typefaces'), 180, -0.02))), base: 372, size: 180 } }, spec + blocks + head + rows);
  },
};

export const guidelines = own;
