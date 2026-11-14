// Theme 26, Notebook, lane g3: the colour and type spreads (proportion, contrast, colour-values, hierarchy, type-in-use, type-rules).
// palette and typefaces are the round 1 gate spreads in guidelines.js. The same notebook: dot-grid leaves, the fold and its thread, and what is
// the brand stuck in. Each spread takes its layout from something a kept notebook would hold: a hundred squares filled in on the grid, label
// strips cut from the brand's own colour pairs, paint-chip ramps, a type scale whose baselines are the dot rows (so each row of dots runs from
// a size across the fold to its values), a piece of the brand's own work cut from its ground and annotated across the gutter, and a list of
// rules marked with the tape. Coordinates are leaf-local (see helpers.js).
import {
  A, U, row, px, nb, tokens, brandRoles, readable, nearPaper, block, rightText, advance, wrap, lineOffset, capRatio, fitLines,
  numberWord, spread, tab, labelStripW, pairName, hasPh,
} from './helpers.js';

const title = (ctx, id) => (ctx.pages.find((p) => p.id === id) || {}).title || '';
const upRow = (y) => row(Math.ceil((y - 17) / U - 1e-6));
const upCol = (x) => 23 + U * Math.ceil((x - 23) / U - 1e-6);
const ceilU = (v) => Math.ceil(v / U - 1e-6) * U;
const nameOf = (ctx, id) => (ctx.byId[id] || {}).name || id;
// the brand colour or tone with this hex, for naming the colour a line of type is set in
const nameOfHex = (ctx, hex) => {
  const all = [...ctx.brand.colours, ...(ctx.brand.tones || [])];
  return (all.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || {}).name || hex.toUpperCase();
};
const ratioOf = (p) => `${p.ratioText} : 1`;
// a piece of label tape with no print under it, 1 unit tall, as wide as its label plus 20 in whole units (the g1 label strip)
function tapeLabel(T, x, y, text) {
  const w = labelStripW(T, 'c-label', text);
  return `<div class="tape tab c-label" style="left:${px(x)};top:${px(y)};width:${w}px;height:${U}px">${A(text)}</div>`;
}
const pageTitle = (T, ctx, id) => block(T['b-title'], { x: 42, w: 475, lines: [title(ctx, id)], baseline: 93, cls: 'b-title' }).html;
// the brand face a step of the type scale is set in; the build stops when the brand does not load that weight
function scaleFace(ctx, s) {
  const f = ctx.faces.find((x) => x.role === s.face && x.style !== 'italic' && x.weight === s.weight);
  if (!f) throw new Error(`type scale ${s.token}: no ${s.face} face at ${s.weight} is loaded`);
  return f;
}
const family = (ctx, s) => ctx.brand.fonts[s.face].family;
const stepCss = (ctx, s) => `font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.weight};font-size:${s.size}px;`
  + `line-height:${px(s.size * s.line)};letter-spacing:0;${s.face === 'display' ? `font-stretch:${ctx.brand.fonts.display.stretch || 100}%;` : ''}`;
const stepTk = (ctx, s) => ({ stem: scaleFace(ctx, s).stem, size: s.size, lh: s.size * s.line, track: 0 });
const stepOf = (ctx, token, face) => {
  const sc = ctx.brand.type.scale;
  return sc.find((s) => s.token === token) || sc.find((s) => s.face === face);
};

export const guidelines = {
  // ---- proportion: a hundred squares cut on the grid, one per cent of a page each, filled in share order from the top left. The square hangs
  // from the foot of the recto; the key stands at the head of the verso, each colour beside one square of itself ----
  proportion: (ctx) => {
    const T = tokens(ctx), N = nb(ctx);
    const cols = [...ctx.brand.colours].sort((a, b) => b.share - a.share), tot = cols.reduce((s, c) => s + c.share, 0);
    const n = cols.map((c) => Math.round((c.share / tot) * 100));
    n[0] += 100 - n.reduce((a, b) => a + b, 0);
    const rounded = cols.some((c, i) => Math.abs((c.share / tot) * 100 - n[i]) > 0.01);
    // the square: 10 x 10 cells of 2 units, x 42 to 422, its foot on the content box's last row; a 1 px paper gap between cells
    const S = 2 * U, X0 = 42, Y0 = 739 - 10 * S;
    let rects = '', k = 0;
    cols.forEach((c, i) => {
      const edge = nearPaper(ctx, c.hex);
      for (let m = 0; m < n[i]; m++, k++) {
        const cx = X0 + (k % 10) * S, cy = Y0 + Math.floor(k / 10) * S;
        rects += edge ? `<rect x="${cx + 0.5}" y="${cy + 0.5}" width="${S - 2}" height="${S - 2}" fill="${c.hex}" stroke="${N.fold}" stroke-width="1"/>`
          : `<rect x="${cx}" y="${cy}" width="${S - 1}" height="${S - 1}" fill="${c.hex}"/>`;
      }
    });
    const aria = `A hundred squares: ${cols.map((c, i) => `${c.name} ${n[i]}`).join(', ')}`;
    const rc = `<svg class="g3-sq" style="left:0;top:0" width="559" height="794" viewBox="0 0 559 794" role="img" aria-label="${A(aria)}">${rects}</svg>`;

    // verso: the title, the lead, and the key (a square of each colour, its name, its count)
    let vc = pageTitle(T, ctx, 'proportion');
    const lead = `A hundred squares, one for each per cent of a page. The ${numberWord(cols.length).toLowerCase()} colours fill them in order of their share, largest first, from the top left.`;
    const lb = block(T['b-body'], { x: 42, w: 285, top: 131, text: lead, cls: 'b-body' });
    vc += lb.html;
    let y = upRow(lb.baseline + U * (lb.lines.length - 1) + 2 * U);
    cols.forEach((c, i) => {
      vc += `<div class="g3-key${nearPaper(ctx, c.hex) ? ' edge' : ''}" style="left:42px;top:${y}px;width:${S - 1}px;height:${S - 1}px;background:${c.hex}"></div>`
        + block(T['b-name'], { x: 99, w: 152, lines: [c.name], baseline: y + U, cls: 'b-name' }).html
        + block(T['c-note'], { x: 251, w: 152, lines: [`${n[i]} ${n[i] === 1 ? 'square' : 'squares'}`], baseline: y + U, cls: 'c-note' }).html;
      y += 3 * U;
    });
    if (y - U > 739) throw new Error(`proportion: the key runs to ${y - U}`);
    if (rounded) vc += block(T['c-note'], { x: 42, w: 475, baseline: 739, lines: ['Each share is rounded to whole squares.'], cls: 'c-note' }).html;
    return spread(ctx, 'proportion', { verso: vc, recto: rc, clear: [{ recto: true, x: X0 - U, y: Y0 - U, w: 10 * S + 2 * U, h: 10 * S + 2 * U }] });
  },

  // ---- contrast: each text pair the brand uses is a label strip cut from its ground and printed in its text colour, with the ratio beside it
  // in the same row. The recto's card is the large-type pair, its own ratio set large in it. Pairs that fail are listed by name, never set ----
  contrast: (ctx) => {
    const T = tokens(ctx), B = ctx.brand;
    const hero = ctx.pairs.find((p) => p.large) || ctx.pairs[0];
    const list = ctx.pairs.filter((p) => p !== hero);
    const bStem = T['b-body'].stem;
    let vc = pageTitle(T, ctx, 'contrast');
    const lead = `Every text pair ${B.name} uses, printed in its own colours, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1.`;
    const lb = block(T['b-body'], { x: 42, w: 380, top: 131, text: lead, cls: 'b-body' });
    vc += lb.html;
    let y = upRow(lb.baseline + U * (lb.lines.length - 1) + 2 * U);
    for (const p of list) {
      // a large-only pair is printed at 26 px in the display face, every other pair at 13 px in the body face
      const big = p.large, stem = big ? T._displayStem : bStem, size = big ? 26 : 13, lh = big ? 38 : 19;
      const ls = wrap(stem, size, p.use, 209);
      const w = Math.max(4 * U, ceilU(Math.min(209, Math.max(...ls.map((s) => advance(stem, size, s)))) + 20 + 1));
      const h = big ? lh * ls.length : U * (ls.length + 1);
      const edge = nearPaper(ctx, p.bgHex);
      vc += `<div class="g3-strip ${big ? 'b-title g3-big' : 'b-body'}${edge ? ' edge' : ''}${ls.some(hasPh) ? ' ph-tight' : ''}" style="left:42px;top:${y}px;width:${w}px;height:${h}px;background:${p.bgHex};color:${p.fgHex}">`
        + ls.map((s) => `<span class="ln">${A(s)}</span>`).join('') + '</div>';
      const bl = y + (big ? 0 : U / 2) + lineOffset(stem, size, lh);
      const nl = wrap(T['c-note'].stem, 13, pairName(ctx, p.fg, p.bg), 171);
      vc += block(T['c-note'], { x: 270, w: 171, baseline: bl, lines: nl, cls: 'c-note' }).html
        + rightText(T['c-mono'], { x: 517, text: ratioOf(p), baseline: bl, cls: 'c-mono' }).html;
      y += Math.max(h, U * (nl.length + 1)) + U;
    }
    if (y - U > 739) throw new Error(`contrast: the strips run to ${y - U}`);

    // recto: the card, cut from the hero pair's ground, its tab naming the pair; the ratio in the pair's own colours at hero size, its use under it
    const C = { x: 42, y: 93, w: 456 };
    const r = fitLines(T._displayStem, ratioOf(hero), C.w - 2 * U, [[76, 76], [64, 76], [57, 57], [48, 57]], 1, 0);
    const rBl = ceilU(28 + capRatio(T._displayStem) * r.size);
    const ul = wrap(T._displayStem, 26, hero.use, C.w - 2 * U);
    const uBl = rBl + 2 * U;
    const ch = ceilU(uBl + 38 * (ul.length - 1) + U);
    let rc = `<div class="card stuck g3-card${nearPaper(ctx, hero.bgHex) ? ' edge' : ''}" style="left:${C.x}px;top:${C.y}px;width:${C.w}px;height:${ch}px;background:${hero.bgHex}">`
      + block({ stem: T._displayStem, size: r.size, lh: r.lh, track: 0 }, { x: U, w: C.w - 2 * U, baseline: rBl, lines: r.lines, cls: 'b-hero num', color: hero.fgHex, knock: false, style: `font-size:${r.size}px;line-height:${r.lh}px;letter-spacing:0;` }).html
      + block(T['b-title'], { x: U, w: C.w - 2 * U, baseline: uBl, lines: ul, cls: 'b-title', color: hero.fgHex, knock: false }).html
      + '</div>' + tab(T, { x: C.x + U, y: C.y, label: pairName(ctx, hero.fg, hero.bg) });
    let ry = upRow(C.y + ch + U);
    if (hero.large) {
      const note = `${pairName(ctx, hero.fg, hero.bg)} is for type ${hero.minSize || 24} px and over only.`;
      const nb_ = block(T['c-note'], { x: 42, w: 475, baseline: ry, text: note, cls: 'c-note' });
      rc += nb_.html;
      ry += U * nb_.lines.length;
    }
    // not used: a chip of the ground with a square of the text colour in it, the pair's names, its ratio
    if (ctx.unusedPairs.length) {
      ry = upRow(ry + 2 * U);
      rc += tapeLabel(T, 42, ry - lineOffset(T['c-label'].stem, 11, 19), 'Not used for text');
      ry += 2 * U;
      // each pair prints once: a pair that is the hero or a listed pair turned round (same colours, same ratio) is the same pair
      const shown = new Set([hero, ...list].map((p) => `${p.bg}|${p.fg}`)), seenName = new Set();
      const unused = ctx.unusedPairs.filter((p) => {
        const k = `${pairName(ctx, p.fg, p.bg)}|${p.ratioText}`;
        if (shown.has(`${p.fg}|${p.bg}`) || seenName.has(k)) return false;
        seenName.add(k); return true;
      });
      for (const p of unused) {
        const t = pairName(ctx, p.fg, p.bg);
        const chip = `<span class="g3-chip${nearPaper(ctx, p.bgHex) ? ' edge' : ''}" style="background:${p.bgHex}"><i style="background:${p.fgHex}"></i></span>`;
        rc += block(T['c-note'], { x: 42, w: 380, baseline: ry, raw: true, lines: [chip + A(t)], widths: [19 + advance(T['c-note'].stem, 13, t)], cls: 'c-note' }).html
          + rightText(T['c-mono'], { x: 517, text: ratioOf(p), baseline: ry, cls: 'c-mono' }).html;
        ry += U;
      }
      if (ry - U > 739) throw new Error(`contrast: the unused pairs run to ${ry - U}`);
    }
    return spread(ctx, 'contrast', { verso: vc, recto: rc });
  },

  // ---- colour values: each colour's ramp as a run of paint chips on the recto, its own step standing a unit proud of the run, its HEX, RGB and
  // OKLCH under it; the verso holds the print note and the text tones, each a strip cut from the tone ----
  'colour-values': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), L = ctx.roles.light;
    // ground last, so the step numbers head a full ramp of tints
    const cols = [...ctx.colours].sort((a, b) => (a.role === 'ground') - (b.role === 'ground') || b.share - a.share);
    const steps = Object.keys(cols[0].ramp).sort((a, b) => a - b), S = 2 * U, X = 137;
    if (X + S * steps.length > 517) throw new Error(`colour-values: ${steps.length} ramp steps do not fit`);
    let rc = steps.map((s, k) => block(T['c-mono'], { x: X + S * k, w: S, baseline: row(5), lines: [s], cls: 'c-mono', align: 'center' }).html).join('');
    let j = 8;
    for (const c of cols) {
      rc += block(T['b-name'], { x: 42, w: 76, lines: [c.name], baseline: row(j), cls: 'b-name' }).html;
      steps.forEach((s, k) => {
        const hex = c.ramp[s], base = +s === c.rampBase;
        rc += `<div class="g3-step${nearPaper(ctx, hex) ? ' edge' : ''}" style="left:${X + S * k}px;top:${row(base ? j - 2 : j - 1)}px;width:${S}px;height:${base ? 3 * U : S}px;background:${hex}"></div>`;
      });
      const rgb = [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16));
      const vals = [[X, c.hex.toUpperCase()], [X + 4 * U, `R ${rgb[0]}  G ${rgb[1]}  B ${rgb[2]}`], [X + 11 * U, c.oklch]];
      // cmyk (only when the brand gives it) takes the next grid row under the values
      if (ctx.C.cmykOf(c)) rc += block(T['c-mono'], { x: X, w: 517 - X, lines: [ctx.C.cmykOf(c)], baseline: row(j + 3), cls: 'c-mono g3-val' }).html;
      for (const [x, v] of vals) {
        if (x + advance(T['c-mono'].stem, 11, v) > 517) throw new Error(`colour-values: ${v} runs past the margin`);
        rc += block(T['c-mono'], { x, w: 517 - x, lines: [v], baseline: row(j + 2), cls: 'c-mono g3-val' }).html;
      }
      j += 7;
    }
    if (row(j - 5) > 739) throw new Error(`colour-values: the ramps run to ${row(j - 5)}`);

    // verso: the title, the print note, then the text tones hung from the foot of the leaf
    let vc = pageTitle(T, ctx, 'colour-values');
    const actName = (cols.find((c) => c.role === 'action') || cols[0]).name;
    const lead = `These values are for screens. Print can shift a colour, so ask your printer for a proof before a run and match ${actName} to the proof. Every step of each ramp is in the palette files in the brand kit.`;
    vc += block(T['b-body'], { x: 42, w: 285, top: 131, text: lead, cls: 'b-body' }).html;
    const tones = B.tones || [];
    if (tones.length) {
      const nStem = T['b-name'].stem;
      const sw = Math.max(6 * U, ...tones.map((t) => ceilU(advance(nStem, 13, t.name) + 20 + 1)));
      const rows_ = tones.map((t) => ({ t, ll: wrap(T['c-note'].stem, 13, t.lands, 266) }));
      const hOf = (o) => Math.max(S, U * (o.ll.length + 1)) + U;
      let ty = upRow(739 - rows_.reduce((s, o) => s + hOf(o), 0) + U - 2 * U);
      vc += tapeLabel(T, 42, ty - U, 'Text tones');
      ty += U;
      for (const o of rows_) {
        const ink = readable(ctx, o.t.hex, [R.ground.hex, R.text, L.actionLabel], `colour-values tone ${o.t.name}`);
        const bl = ty + lineOffset(nStem, 13, S);
        vc += `<div class="g3-strip b-name g3-tone${nearPaper(ctx, o.t.hex) ? ' edge' : ''}" style="left:42px;top:${ty}px;width:${sw}px;height:${S}px;background:${o.t.hex};color:${ink}">${A(o.t.name)}</div>`
          + block(T['c-mono'], { x: 251, w: 266, lines: [o.t.hex.toUpperCase()], baseline: bl, cls: 'c-mono' }).html
          + block(T['c-note'], { x: 251, w: 266, lines: o.ll, baseline: bl + U, cls: 'c-note' }).html;
        ty += hOf(o);
      }
      if (ty - U > 739) throw new Error(`colour-values: the tones run to ${ty - U}`);
    }
    return spread(ctx, 'colour-values', { verso: vc, recto: rc });
  },

  // ---- hierarchy: the scale as a ladder of its own names, each set at its true size with its baseline on a dot row. That row of dots runs on
  // across the fold to the step's values on the recto, so the grid itself reads each size across ----
  hierarchy: (ctx) => {
    const T = tokens(ctx), sc = ctx.brand.type.scale;
    let vc = pageTitle(T, ctx, 'hierarchy');
    const lead = `${numberWord(sc.length)} steps, each with one job. Each is set at its true size; its values are on the same row across the fold.`;
    const lb = block(T['b-body'], { x: 42, w: 380, top: 131, text: lead, cls: 'b-body' });
    vc += lb.html;
    let bl = upRow(lb.baseline + U * (lb.lines.length - 1) + 2 * U + capRatio(scaleFace(ctx, sc[0]).stem) * sc[0].size);
    // the recto's two columns, headed by tape
    let rc = tapeLabel(T, 42, 74, 'Size, line, face') + tapeLabel(T, 270, 74, 'Use');
    if (bl < row(7)) bl = row(7);
    sc.forEach((s, i) => {
      if (i) bl += ceilU(s.size * s.line) + 2 * U;   // two rows apart at least, so each step's two note lines stand clear of the next
      const tk = stepTk(ctx, s), word = ctx.cap(s.token);
      if (advance(tk.stem, s.size, word) > 475) throw new Error(`hierarchy: ${word} at ${s.size} px is wider than the leaf`);
      vc += block(tk, { x: 42, w: 475, lines: [word], baseline: bl, cls: `g3-spec${s.face === 'display' ? ' b-hero' : ' b-body'}`, style: stepCss(ctx, s) }).html;
      rc += block(T['c-note'], { x: 42, w: 209, lines: [`${s.size} px, line ${s.line}`, `${family(ctx, s)} ${s.weight}`], baseline: bl, cls: 'c-note g3-ink' }).html;
      const ul = wrap(T['c-note'].stem, 13, s.use, 247);
      rc += block(T['c-note'], { x: 270, w: 247, lines: ul, baseline: bl, cls: 'c-note' }).html;
      const next = sc[i + 1];
      if (next && Math.max(2, ul.length) * U > ceilU(next.size * next.line) + 2 * U) throw new Error(`hierarchy: the notes for ${s.token} run into the next step`);
    });
    if (bl > 739) throw new Error(`hierarchy: the ladder runs to ${bl}`);
    rc += block(T['c-note'], { x: 42, w: 475, baseline: row(6), lines: ['Interface type has its own scale, in the UI kit.'], cls: 'c-note' }).html;
    return spread(ctx, 'hierarchy', { verso: vc, recto: rc });
  },

  // ---- type in use: a piece of the brand's own work cut from its ground and stuck on the verso: the logo, the headline, a paragraph and a
  // caption, each at the size, line and colour the brand sets it. Across the fold, level with each, what it is set in ----
  'type-in-use': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), L = ctx.roles.light, S = B.type.sample;
    const hS = stepOf(ctx, 'headline', 'display'), pS = stepOf(ctx, 'body', 'body'), cS = stepOf(ctx, 'caption', 'body');
    const hT = stepTk(ctx, hS), pT = stepTk(ctx, pS), cT = stepTk(ctx, cS);
    const ground = R.ground.hex;
    const hInk = readable(ctx, ground, [R.text], 'type-in-use headline');
    const pInk = [L.textSoft, R.text].find((c) => c && ctx.ratio(c, ground) >= 4.5);
    const cInk = [L.quiet, L.textSoft, R.text].find((c) => c && ctx.ratio(c, ground) >= 4.5);
    const C = { x: 42, y: 93, w: 456 }, inner = C.w - 4 * U;
    // card-local: the card's top is on a dot row, so a baseline a whole number of units down is on one too
    const g = ctx.logo.geos.colour, lgw = Math.min(152, (U * g.w) / g.h), lgh = (lgw * g.h) / g.w;
    const hl = wrap(hT.stem, hS.size, S.headline, inner);
    const hBl = ceilU(2 * U + lgh + 2 * U + capRatio(hT.stem) * hS.size);
    const hEnd = hBl + hT.lh * (hl.length - 1);
    const pl = wrap(pT.stem, pS.size, S.paragraph, inner);
    const pBl = ceilU(hEnd + 0.25 * hS.size + U + capRatio(pT.stem) * pS.size);
    const pEnd = pBl + pT.lh * (pl.length - 1);
    const cl = wrap(cT.stem, cS.size, S.caption, inner);
    const rule = ceilU(pEnd + U);
    const cBl = rule + U;
    const ch = ceilU(cBl + cT.lh * (cl.length - 1) + 2 * U);
    if (C.y + ch > 739) throw new Error(`type-in-use: the card runs to ${C.y + ch}`);
    const cw = B.logo.colourways.colour;
    const vc = `<div class="card stuck g3-card${nearPaper(ctx, ground) ? ' edge' : ''}" style="left:${C.x}px;top:${C.y}px;width:${C.w}px;height:${ch}px;background:${ground}">`
      + `<div style="position:absolute;left:${2 * U}px;top:${2 * U}px;width:${px(lgw)}">${ctx.logo.html('colour', { width: lgw, color: cw.name })}</div>`
      + block(hT, { x: 2 * U, w: inner, baseline: hBl, lines: hl, cls: 'b-hero', color: hInk, knock: false, style: stepCss(ctx, hS) }).html
      + block(pT, { x: 2 * U, w: inner, baseline: pBl, lines: pl, cls: 'b-body', color: pInk, knock: false, style: stepCss(ctx, pS) }).html
      + `<div class="g3-rule" style="left:${2 * U}px;top:${rule}px;width:${inner}px;background:${L.divider}"></div>`
      + block(cT, { x: 2 * U, w: inner, baseline: cBl, lines: cl, cls: 'b-body', color: cInk, knock: false, style: stepCss(ctx, cS) }).html
      + '</div>' + tab(T, { x: C.x + U, y: C.y, label: 'Set at true size' });

    // recto: the title and lead at the head; level with each part of the card, the face, size, line and colour it is set in
    let rc = pageTitle(T, ctx, 'type-in-use');
    const lead = `A headline, a paragraph and a caption, set the way ${B.name} sets them.`;
    const lb = block(T['b-body'], { x: 42, w: 380, top: 131, text: lead, cls: 'b-body' });
    rc += lb.html;
    const leadEnd = lb.baseline + U * (lb.lines.length - 1);
    const notes = [['Headline', hS, hInk, C.y + hBl], ['Paragraph', pS, pInk, C.y + pBl], ['Caption', cS, cInk, C.y + cBl]];
    if (notes[0][3] < leadEnd + 2 * U) throw new Error('type-in-use: the headline note meets the lead');
    for (const [k, s, ink, y] of notes) {
      rc += block(T['b-name'], { x: 42, w: 95, lines: [k], baseline: y, cls: 'b-name' }).html
        + block(T['c-note'], { x: 137, w: 380, lines: [`${family(ctx, s)} ${s.weight}, ${s.size} px, line ${s.line}`, `In ${nameOfHex(ctx, ink)}`], baseline: y, cls: 'c-note' }).html;
    }
    return spread(ctx, 'type-in-use', { verso: vc, recto: rc });
  },

  // ---- type rules: each rule as a pair, the thing to do marked with the tape and the thing that never happens under it in pencil grey. The
  // first half hangs from the verso's title, the rest stands on the recto's foot, so the list runs corner to corner ----
  'type-rules': (ctx) => {
    const T = tokens(ctx), R = ctx.brand.type.rules;
    const doW = labelStripW(T, 'c-label', 'Do'), dontW = advance(T['c-label'].stem, 11, "Don't", 0.01);
    const tx = upCol(42 + Math.max(doW, dontW) + U), tw = Math.min(380, 517 - tx);
    const lab = lineOffset(T['c-label'].stem, 11, 19);
    const sets = R.map((r) => ({ r, dl: wrap(T['b-name'].stem, 13, r.do, tw), nl: wrap(T['b-body'].stem, 13, r.dont, tw) }));
    const hOf = (o) => U * (o.dl.length + o.nl.length);
    const pair = (o, bl) => tapeLabel(T, 42, bl - lab, 'Do')
      + block(T['b-name'], { x: tx, w: tw, lines: o.dl, baseline: bl, cls: 'b-name' }).html
      + block(T['c-label'], { x: 42, w: tx - 42, lines: ["Don't"], baseline: bl + U * o.dl.length, cls: 'c-label g3-dont' }).html
      + block(T['b-body'], { x: tx, w: tw, lines: o.nl, baseline: bl + U * o.dl.length, cls: 'b-body g3-dont' }).html;
    let vc = pageTitle(T, ctx, 'type-rules');
    const lead = `${numberWord(R.length)} rules for setting type. Each says what to do, and what never happens.`;
    const lb = block(T['b-body'], { x: 42, w: 380, top: 131, text: lead, cls: 'b-body' });
    vc += lb.html;
    const half = Math.ceil(sets.length / 2);
    let bl = upRow(lb.baseline + U * (lb.lines.length - 1) + 3 * U);
    for (const o of sets.slice(0, half)) { vc += pair(o, bl); bl += hOf(o) + 2 * U; }
    if (bl - 3 * U > 739) throw new Error(`type-rules: the verso runs to ${bl - 3 * U}`);
    const rest = sets.slice(half);
    let rb = 739 - rest.reduce((s, o) => s + hOf(o) + 2 * U, 0) + 3 * U;
    let rc = '';
    for (const o of rest) { rc += pair(o, rb); rb += hOf(o) + 2 * U; }
    return spread(ctx, 'type-rules', { verso: vc, recto: rc });
  },
};

export function css() {
  return `.pg .g3-sq{position:absolute;z-index:2}
.pg .g3-key{z-index:3;box-sizing:border-box}
.pg .g3-key.edge{border:1px solid var(--fold)}
.pg .g3-strip{z-index:3;box-sizing:border-box;white-space:nowrap;padding:9.5px 10px;line-height:19px}
.pg .g3-strip.g3-big{padding:0 10px;line-height:38px}
.pg .g3-strip.g3-tone{padding:0 10px;line-height:38px}
.pg .g3-strip.edge{border:1px solid var(--fold);padding-left:9px}
.pg .g3-strip.edge:not(.g3-big):not(.g3-tone){padding-top:8.5px}
.pg .g3-strip.g3-big.edge,.pg .g3-strip.g3-tone.edge{line-height:36px}
.pg .g3-chip{display:inline-block;position:relative;width:11px;height:11px;margin-right:8px;vertical-align:-1px;box-sizing:border-box}
.pg .g3-chip.edge{border:1px solid var(--fold)}
.pg .g3-chip i{position:absolute;left:50%;top:50%;width:5px;height:5px;margin:-2.5px 0 0 -2.5px}
.pg .g3-step{z-index:3;box-sizing:border-box}
.pg .g3-step.edge{border:1px solid var(--fold)}
.pg .g3-card{box-sizing:border-box}
.pg .g3-card .t{z-index:1}
.pg .g3-rule{position:absolute;height:1px}
.pg .g3-ink{color:var(--graphite-ink)}
.pg .g3-dont{color:var(--graphite)}`;
}
