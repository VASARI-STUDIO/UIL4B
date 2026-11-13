// Theme 25, Label, lane g3: the colour and type pages that round 1 left out (proportion, contrast, colour-values, hierarchy, type-in-use, type-rules).
// Every page is still one wall: one work, or one keyed group, hung on the centre of the hang and the sightline, the wall title at x 712, y 96, and the label card fixed at
// x 712, y 416. The colour pages hang colour as flat works (a nested-square painting by share, a stack of canvases lettered in their pairs, a colour chart with a tombstone
// under each column); the type pages letter the brand's type straight onto the wall, as a gallery letters its wall text, and the rules go up as a house-rules board.
// Label is Free, so it ships the Free twelve only: this lane exports contrast (007) and hierarchy (009). The other four functions were drafted before that scope was set;
// they stay in the file, unexported and unpolished, so a Free build never ships them. Folios follow the Free twelve (helpers.folio); every brand string is printed whole, through esc.
import { folio, roles, solid, key, hung, hungX, token, wrapLines, advance, tie, wallText, labelCard, A, px, numberWord, listAnd, OBJ_TOP, OBJ_BOTTOM, HANG, EDGE_BELOW } from './helpers.js';

const MAX_H = OBJ_BOTTOM - OBJ_TOP;                       // 576: the tallest an object may hang
const MAX_W = HANG.x1 - HANG.x0;                         // 616: the widest
const even = (n) => Math.ceil(n / 2) * 2;                // hung() refuses odd sizes, which would sit half a pixel off the sightline
const pct = (c) => `${Math.round(c.share * 100)}%`;

// ---- the page, as helpers.page() builds it, with the folio from the book's own numbering ----
const fol = (ctx, id) => folio(id);
const seeAlso = (ctx, id, name) => `See also ${name}, page ${fol(ctx, id)}`;
function page(ctx, id, { object, wall, label }) {
  const head = `<div class="hd"><span>${A(ctx.brand.name)} brand guidelines</span></div>`;
  return `<section class="pg" data-page="${id}">${head}<div class="hang">${object}</div>${wallText(ctx, id, wall)}${labelCard(ctx, id, label)}<div class="fo num">${fol(ctx, id)}</div></section>`;
}

// how many lines `text` sets in, or Infinity when a run is wider than the box
const count = (ctx, role, weight, size, text, width) => { try { return wrapLines(ctx, role, weight, size, text, width).length; } catch { return Infinity; } };
// a colour or tone by id, with its name (a tone carries one too)
const named = (ctx, id) => ctx.byId[id];

// ---- proportion: one painting of nested squares, outside in by share; each square shows exactly its share of the painting's area ----
// The squares sit low, the way Albers hung his: three quarters of each margin above, one quarter below. A square inside a square of nearly its own tone gets the theme's edge.
function proportion(ctx) {
  const R = roles(ctx), B = ctx.brand;
  const cs = [...B.colours].sort((a, b) => b.share - a.share), total = cs.reduce((s, c) => s + c.share, 0);
  const S = 512, x0 = hungX(S), y0 = hung(S);
  let rest = total, inner = '';
  const sides = cs.map((c) => { const s = S * Math.sqrt(rest / total); rest -= c.share; return s; });
  cs.forEach((c, i) => {
    if (i === 0) return;
    const s = Math.round(sides[i]), m = S - s, edge = ctx.ratio(c.hex, cs[i - 1].hex) < EDGE_BELOW ? ' edge' : '';
    inner += `<div class="g3-sq${edge}" style="left:${px(m / 2)};top:${px(m * 0.75)};width:${s}px;height:${s}px;background:${c.hex}"></div>`;
  });
  const object = solid(R, x0, y0, S, S, cs[0].hex, inner);
  return page(ctx, 'proportion', {
    object,
    wall: { title: 'Proportion' },
    label: {
      title: `${numberWord(cs.length)} colours, by area`, detail: 'Outside in, each square is its share of a page.',
      items: cs.map((c) => ({ term: c.name, text: pct(c) })), mode: 'table', credit: seeAlso(ctx, 'contrast', 'Contrast'),
    },
  });
}

// ---- contrast: one canvas for each background the brand sets text on, lettered in every colour it carries; under them, the pairs that fail, as squares with no text ----
function contrast(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights;
  const bgs = [...new Set(ctx.pairs.map((p) => p.bg))];
  const cellW = 176, gapX = 16, pad = 20, gapY = 12;
  const bodyRole = 'body', disp = 'display';
  // a cell: the colour's name and the ratio on one line (on two if they do not fit), then what the pair is for. A pair that passes only large is set at its size in the display face, name and ratio, and says no more.
  const cells = (bg) => ctx.pairs.filter((p) => p.bg === bg).map((p) => {
    const nm = named(ctx, p.fg).name, ratio = `${p.ratioText}:1`;
    if (p.minSize) {
      const sz = p.minSize, ln = Math.round(sz * 1.2);
      ctx.pair(p.fgHex, p.bgHex, { size: sz, weight: W.heading, what: `(contrast page, ${p.fg} on ${p.bg})` });
      const one = advance(ctx, disp, W.heading, `${nm} ${ratio}`, sz) * 1.04 <= cellW;
      return { p, h: one ? ln : 2 * ln, html: `<div class="disp g3-cl" style="font-size:${sz}px;line-height:${ln}px;color:${p.fgHex}">${A(nm)}${one ? ' ' : '<br>'}<span class="num">${A(ratio)}</span></div>` };
    }
    ctx.pair(p.fgHex, p.bgHex, { size: 13, weight: W.regular, what: `(contrast page, ${p.fg} on ${p.bg})` });
    const one = (advance(ctx, bodyRole, W.strong, nm, 15) + 6 + advance(ctx, 'mono', B.fonts.mono.weights[0], ratio, 13)) * 1.04 <= cellW;
    const use = tie(p.use, { max: 18 }), ul = count(ctx, bodyRole, W.regular, 13, use, cellW);
    if (ul > 2) throw new Error(`contrast: "${p.use}" runs to ${ul} lines in its ${cellW} px cell`);
    return { p, h: (one ? 20 : 38) + 4 + ul * 18,
      html: `<div style="color:${p.fgHex}"><p class="g3-cn">${A(nm)}${one ? ' ' : '<br>'}<span class="g3-mono">${A(ratio)}</span></p><p class="g3-cu">${A(use)}</p></div>` };
  });
    const bands = bgs.map((bg) => { const cl = cells(bg); return { bg, hex: ctx.hex(bg), cl, w: cl.length * cellW + (cl.length - 1) * gapX + 2 * pad, h: even(Math.max(...cl.map((c) => c.h)) + 2 * pad) }; });
  // the pairs that fail: a square of the ground with a square of the text colour inside it, its ratio under it on the wall; never lettered
  // as many failing pairs as fit one row of the hang (eleven); a brand with more shows the first eleven
  const chip = 32, chipGap = 24, fails = ctx.unusedPairs.slice(0, Math.floor((MAX_W + chipGap) / (chip + chipGap))), failsW = fails.length ? fails.length * chip + (fails.length - 1) * chipGap : 0;
  const failsH = fails.length ? 24 + chip + 4 + 16 : 0;
  const H = even(bands.reduce((s, b) => s + b.h, 0) + gapY * (bands.length - 1) + failsH);
  if (H > MAX_H) throw new Error(`contrast: the canvases run to ${H} px and the hang holds ${MAX_H}`);
  if (failsW > MAX_W) throw new Error(`contrast: ${fails.length} failing pairs run to ${failsW} px`);
  let y = hung(H);
  const canvases = bands.map((b) => {
    const x = hungX(even(b.w));
    const inner = b.cl.map((c, i) => `<div style="left:${pad + i * (cellW + gapX)}px;top:${pad}px;width:${cellW}px">${c.html}</div>`).join('');
    const o = solid(R, x, y, even(b.w), b.h, b.hex, inner);
    y += b.h + gapY; return o;
  }).join('');
  y += 24 - gapY;
  const fx = hungX(even(failsW));
  const chips = fails.map((f, i) => {
    const x = fx + i * (chip + chipGap), s = 12;
    return solid(R, x, y, chip, chip, f.bgHex, `<div style="left:${(chip - s) / 2}px;top:${(chip - s) / 2}px;width:${s}px;height:${s}px;background:${f.fgHex}"></div>`)
      + `<span class="g3-mono g3-fr" style="left:${x}px;top:${y + chip + 4}px">${A(f.ratioText)}:1</span>`;
  }).join('');
  const large = ctx.pairs.find((p) => p.minSize);
  const largeLine = large ? `${named(ctx, large.fg).name} on ${named(ctx, large.bg).name} passes from ${large.minSize} px up, so it is set that large.` : '';
  return page(ctx, 'contrast', {
    object: canvases + chips,
    wall: { title: 'Contrast' },
    label: {
      title: 'Text on colour', detail: `${numberWord(ctx.pairs.length)} pairs in use, each lettered on its ground.`,
      // the bands run top to bottom; two light grounds can look alike, so the card names them in order (a head on each band would not fit the hang for a brand with five)
      paragraph: `The grounds, top to bottom: ${listAnd(bgs.map((bg) => named(ctx, bg).name))}. The small squares are pairs that fail and never carry text.${largeLine ? ' ' : ''}${largeLine}`,
      grow: true, credit: seeAlso(ctx, 'palette', 'Colour'),
    },
  });
}

// ---- colour-values: a colour chart. Each colour is one work, its ten tints from 50 at the top to 900 at the foot, the step it sits on marked with its number; a tombstone under each gives hex, RGB and OKLCH ----
function colourValues(ctx) {
  const R = roles(ctx);
  const cs = [...ctx.colours].sort((a, b) => b.share - a.share), n = cs.length, gap = 16;
  const colW = Math.floor((MAX_W - gap * (n - 1)) / n / 2) * 2, cell = 32, steps = Object.keys(cs[0].ramp), stripH = cell * steps.length;
  const tombH = 16 + 18 + 3 * 16, H = even(stripH + tombH), gw = n * colW + (n - 1) * gap, x0 = hungX(gw), y0 = hung(H);
  const mono = ctx.brand.fonts.mono.weights[0];
  const work = cs.map((c, i) => {
    const x = x0 + i * (colW + gap);
    const cells = steps.map((s, j) => {
      const fill = c.ramp[s], base = String(s) === String(c.rampBase);
      const mark = base ? `<span class="g3-step num" style="color:${R.onColour(fill, 12, 500)}">${A(s)}</span>` : '';
      return `<div class="g3-c" style="top:${j * cell}px;height:${cell}px;background:${fill}">${mark}</div>`;
    }).join('');
    const { L, C, H: h } = ctx.C.toOklch(c.hex), [r, g, b] = ctx.C.hexToRgb(c.hex);
    const ok = `${L.toFixed(2)} ${C.toFixed(3)} ${C < 0.002 ? 0 : Math.round(h)}`;
    for (const v of [c.hex, `${r} ${g} ${b}`, ok]) if (advance(ctx, 'mono', mono, v, 12) * 1.04 > colW) throw new Error(`colour-values: "${v}" is wider than its ${colW} px column`);
    const tomb = `<div class="g3-tb" style="left:${x}px;top:${y0 + stripH + 16}px;width:${colW}px"><p class="g3-tn">${A(c.name)}</p>`
      + `<p class="g3-mono">${A(c.hex.toUpperCase())}</p><p class="g3-mono">${r} ${g} ${b}</p><p class="g3-mono">${ok}</p></div>`;
    // the strip is outlined when its lightest tint is close to the wall, as every object is
    return solid(R, x, y0, colW, stripH, c.ramp[steps[0]], cells) + tomb;
  }).join('');
  return page(ctx, 'colour-values', {
    object: work,
    wall: { title: 'Colour values' },
    label: {
      title: 'Ten tints to a colour', detail: 'The number marks where the colour itself sits. Under each: hex, RGB, then OKLCH.',
      paragraph: 'For print, ask your printer for a proof against these values.', credit: seeAlso(ctx, 'proportion', 'Proportion'),
    },
  });
}

// ---- hierarchy: the scale lettered on the wall, largest first. Each step is set at its own size in the words the brand gives for its use (or the brand's name, where that is the use and the words would not fit one line) ----
function hierarchy(ctx) {
  const B = ctx.brand, W = ctx.weights, scale = B.type.scale, capW = 40, sx = HANG.x0 + capW + 16, sw = HANG.x1 - sx, gap = 16;
  const used = new Set();
  const rows = scale.map((t) => {
    const role = t.face === 'display' ? 'display' : 'body', wt = t.face === 'display' ? W.heading : t.weight, line = Math.round(t.size * t.line);
    // the brand's own words in order of preference; a string a larger row already carries is passed over, so no two rows say the same thing
    const fits = (s) => count(ctx, role, wt, t.size, tie(s, { tail: false, max: 40 }), sw) === 1;
    const pool = [t.use, ...B.lines.others, B.lines.primary, B.type.sample.headline, B.name];
    const text = pool.find((s) => fits(s) && !used.has(s)) || pool.find(fits);
    used.add(text);
    if (!text) throw new Error(`hierarchy: nothing fits one line at the ${t.token} size`);
    return { t, role, wt, line, text };
  });
  const H = even(rows.reduce((s, r) => s + Math.max(r.line, 16), 0) + gap * (rows.length - 1));
  if (H > MAX_H) throw new Error(`hierarchy: the scale runs to ${H} px`);
  let y = hung(H);
  const object = rows.map((r) => {
    const h = Math.max(r.line, 16);
    const o = `<div class="g3-hr" style="left:${HANG.x0}px;top:${y}px;width:${MAX_W}px;height:${h}px">`
      + `<span class="g3-hc g3-mono" style="width:${capW}px">${r.t.size}/${r.line}</span>`
      + `<span class="${r.role === 'display' ? 'disp ' : ''}g3-hs" style="font-size:${r.t.size}px;line-height:${r.line}px;font-weight:${r.wt}">${A(tie(r.text, { tail: false, max: 40 }))}</span></div>`;
    y += h + gap; return o;
  }).join('');
  const d = B.fonts.display.family, b = B.fonts.body.family;
  return page(ctx, 'hierarchy', {
    object,
    wall: { title: 'Hierarchy' },
    label: {
      title: `The ${B.name} type scale`, detail: `${numberWord(scale.length)} sizes, in ${d} and ${b}.`,
      paragraph: 'Each size is set in what it is for, or in the brand\'s own words where that will not fit. Beside it, size over line height in px.',
      credit: seeAlso(ctx, 'typefaces', 'Typography'),
    },
  });
}

// ---- type-in-use: a title wall. The brand's headline lettered large, its paragraph in a column to the right, its caption under that, keyed 1 to 3 ----
function typeInUse(ctx) {
  const B = ctx.brand, W = ctx.weights, s = B.type.sample;
  const hl = token(ctx, 'headline'), bd = token(ctx, 'body'), cp = token(ctx, 'caption');
  const head = tie(s.headline, { max: 20 });
  // the headline takes the narrowest measure (from 416 up to the full hang) at which it sets in two or three lines; the paragraph and caption hang in a column from x + 248
  const hw = [416, 464, 512, 560, MAX_W].find((w) => count(ctx, 'display', W.heading, hl.size, head, w) <= 3) || MAX_W;
  const hn = count(ctx, 'display', W.heading, hl.size, head, hw);
  if (!isFinite(hn) || hn > 3) throw new Error(`type-in-use: the headline runs to ${hn} lines`);
  const colX = 248, colW = MAX_W - colX, para = tie(s.paragraph, { max: 20 }), cap = tie(s.caption, { max: 20 });
  const pn = count(ctx, 'body', W.regular, bd.size, para, colW), cn = count(ctx, 'body', W.regular, cp.size, cap, colW);
  const hH = hn * hl.line, pH = pn * bd.line, cH = cn * cp.line, gapA = 40, gapB = 32;
  const H = even(hH + gapA + pH + gapB + cH + 24);
  if (H > MAX_H) throw new Error(`type-in-use: the wall text runs to ${H} px`);
  const x = HANG.x0, y = hung(H), py = y + hH + gapA, cy = py + pH + gapB;
  const object = `<div class="disp g3-ih" style="left:${x}px;top:${y}px;width:${hw}px;font-size:${hl.size}px;line-height:${hl.line}px">${A(head)}</div>`
    + `<p class="g3-ip" style="left:${x + colX}px;top:${py}px;width:${colW}px;font-size:${bd.size}px;line-height:${bd.line}px">${A(para)}</p>`
    + `<p class="g3-ic" style="left:${x + colX}px;top:${cy}px;width:${colW}px;font-size:${cp.size}px;line-height:${cp.line}px">${A(cap)}</p>`
    + key(1, x, y + hH) + key(2, x + colX, py + pH) + key(3, x + colX, cy + cH);
  const d = B.fonts.display.family, b = B.fonts.body.family;
  return page(ctx, 'type-in-use', {
    object,
    wall: { title: 'Type in use' },
    label: {
      title: 'Headline, paragraph, caption', detail: `${d} and ${b}, at the brand's own sizes.`,
      keys: [{ n: 1, text: `Headline, ${hl.size}/${hl.line} px` }, { n: 2, text: `Paragraph, ${bd.size}/${bd.line} px` }, { n: 3, text: `Caption, ${cp.size}/${cp.line} px` }], cols: 1,
      credit: seeAlso(ctx, 'type-rules', 'Type rules'),
    },
  });
}

// ---- type-rules: the house-rules board a gallery hangs by its door, in the brand's own faces. What to do on the left, what never happens on the right, one rule to a row ----
function typeRules(ctx) {
  const R = roles(ctx), B = ctx.brand, W = ctx.weights, rules = B.type.rules, tt = token(ctx, 'title');
  const pad = 32, numW = 24, gapC = 24, colW = (MAX_W - 2 * pad - numW - 2 * gapC) / 2, line = 22, gapR = 16, headGap = 24;
  const rows = rules.map((r) => {
    const d = tie(r.do, { max: 22 }), n = tie(r.dont, { max: 22 });
    return { d, n, h: Math.max(count(ctx, 'body', W.regular, 15, d, colW), count(ctx, 'body', W.regular, 15, n, colW)) * line };
  });
  const headH = Math.round(tt.size * 1.2);
  const H = even(2 * pad + headH + headGap + rows.reduce((s, r) => s + r.h, 0) + gapR * (rows.length - 1));
  if (H > MAX_H) throw new Error(`type-rules: the board runs to ${H} px`);
  let y = pad + headH + headGap;
  const grid = `grid-template-columns:${numW}px ${colW}px ${colW}px;column-gap:${gapC}px`;
  const inner = `<div class="g3-rr" style="left:${pad}px;top:${pad}px;${grid}"><span></span><span class="disp g3-rh" style="font-size:${tt.size}px;line-height:${headH}px">Do</span><span class="disp g3-rh" style="font-size:${tt.size}px;line-height:${headH}px">Never</span></div>`
    + rows.map((r, i) => { const o = `<div class="g3-rr" style="left:${pad}px;top:${y}px;${grid}"><span class="g3-rn num">${i + 1}</span><span class="g3-rt">${A(r.d)}</span><span class="g3-rt">${A(r.n)}</span></div>`; y += r.h + gapR; return o; }).join('');
  ctx.pair(R.ink, R.panel, { size: 15, weight: W.regular, what: '(type rules board)' });
  return page(ctx, 'type-rules', {
    object: solid(R, hungX(MAX_W), hung(H), MAX_W, H, R.panel, inner),
    wall: { title: 'Type rules' },
    label: {
      title: 'House rules for type', detail: `${numberWord(rules.length)} rules, each beside what never happens.`,
      paragraph: `Set in ${listAnd([B.fonts.display.family, B.fonts.body.family])}, as every page of this book is.`, credit: seeAlso(ctx, 'hierarchy', 'Hierarchy'),
    },
  });
}

// Free twelve scope (lead, 11 Nov): only these two ship. proportion, colourValues, typeInUse and typeRules are kept above, unexported.
export const guidelines = { contrast, hierarchy };
void [proportion, colourValues, typeInUse, typeRules];

export function css(ctx) {
  const W = ctx.weights, m = ctx.brand.fonts.mono;
  return `.pg .g3-sq{position:absolute}
.pg .g3-mono{font-family:var(--mono);font-weight:${m ? m.weights[0] : 400};font-size:12px;line-height:16px;font-variant-numeric:tabular-nums}
.pg .g3-cl{white-space:nowrap}
.pg .g3-cn{font-size:15px;line-height:20px;font-weight:${W.strong};white-space:nowrap}
.pg .g3-cn .g3-mono{font-size:13px;line-height:18px;font-weight:${m ? m.weights[0] : 400}}
.pg .g3-cu{margin-top:4px;font-size:13px;line-height:18px;font-weight:${W.regular};text-wrap:pretty}
.pg .g3-fr{position:absolute;color:var(--ink);white-space:nowrap}
.pg .g3-c{position:absolute;left:0;right:0}
.pg .g3-step{position:absolute;left:8px;top:8px;font:500 12px/16px var(--chrome)}
.pg .g3-tb{position:absolute;color:var(--ink)}
.pg .g3-tn{font-size:13px;line-height:18px;font-weight:${W.strong};white-space:nowrap}
.pg .g3-tb .g3-mono{display:block;white-space:nowrap}
.pg .g3-hr{position:absolute;display:flex;align-items:baseline;column-gap:16px}
.pg .g3-hc{flex:none;color:var(--quiet);white-space:nowrap}
.pg .g3-hs{flex:1;min-width:0;white-space:nowrap;color:var(--ink)}
.pg .g3-ih{position:absolute;color:var(--ink);font-weight:${W.heading};text-wrap:balance}
.pg .g3-ip{position:absolute;color:var(--ink);font-weight:${W.regular};text-wrap:pretty}
.pg .g3-ic{position:absolute;color:var(--quiet);font-weight:${W.regular};text-wrap:pretty}
.pg .g3-rr{position:absolute;display:grid;align-items:baseline}
.pg .g3-rh{color:var(--ink);font-weight:${W.heading}}
.pg .g3-rn{font:500 12px/22px var(--chrome);color:var(--ink)}
.pg .g3-rt{font-size:15px;line-height:22px;font-weight:${W.regular};color:var(--ink);text-wrap:pretty}
`;
}
