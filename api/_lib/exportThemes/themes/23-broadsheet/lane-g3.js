// Theme 23, Broadsheet, lane g3: the colour and type pages the round-1 gate left out (proportion, contrast, colour-values, hierarchy, type-in-use,
// type-rules). palette and typefaces are round 1's and are not touched here. Each page is laid out from a part of a newspaper:
//   proportion     the palette set like copy, running down the four columns in order of share (a story that runs on from column to column)
//   contrast       a weather table: every pair a row, its ratio as the reading and a bar against the 4.5 mark
//   colour-values  a stocks listing for the values, and each tint ramp printed as a press colour bar
//   hierarchy      a head schedule: every step of the brand's scale set at its true size, with its count to the column
//   type-in-use    a story as the sub-editor sends it: headline, plate, caption and body at the brand's own sizes, the spec ruled under it
//   type-rules     the style book: what to set on the paper, and what not to on the "don't" ground
// Every string is brand data or a short theme template; every number is computed from ctx. CSS is scoped under .pg with the g3- prefix.
import { A, N, G, E, col, hr, px, jump, folio, fitLines, headLines, measure, measureRole, linesIn, bodyWeight, displayWeight, TRACK, copyGuard, plateInner, plateBox } from './helpers.js';

const page = (ctx, id, inner) => copyGuard(ctx, id, `<section class="pg" data-page="${id}">${inner}</section>`);

// counts in a headline are words up to twenty, the way a paper sets them
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const word = (n) => WORDS[n] ?? String(n);
const up = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// a page headline in the display face, 64 down to 48, at most two lines across the measure
const headline = (ctx, text, { w = 1000, maxLines = 2 } = {}) => {
  const f = fitLines(ctx, text, { w, max: 64, min: 48, maxLines }), lh = Math.round(f.size * 68 / 64);
  return { h: f.lines.length * lh, html: E(G.left, G.top, 'story', headLines(f.lines, f.size, lh), { w }) };
};

// a colour or tone's name by its id
const nameOf = (ctx, id) => (ctx.colours.find((c) => c.id === id) || ctx.tones.find((t) => t.id === id) || { name: id }).name;
// a pair's name: "Bluestone on Newsprint"; a tone already named for its ground ("Quiet on Newsprint") is not named twice
const pairName = (ctx, p) => { const f = nameOf(ctx, p.fg), b = nameOf(ctx, p.bg); return f.endsWith(` on ${b}`) ? f : / on /.test(f) ? `${f}, over ${b}` : `${f} on ${b}`; };
// a colour too close to the paper to show its own edge gets a hairline
const faint = (ctx, hex) => ctx.ratio(hex, N.paper) < 1.3;
const edge = (ctx, hex) => (faint(ctx, hex) ? 'box-shadow:inset 0 0 0 .75px var(--hair);' : '');
// the label colour on a field: the press ink or the paper when one holds 4.5 : 1, else whichever brand colour or tone holds the most
const onFill = (ctx, hex) => {
  const best = (xs) => xs.reduce((a, b) => (ctx.ratio(b, hex) > ctx.ratio(a, hex) ? b : a));
  const t = best([N.ink, N.paper]);
  return ctx.ratio(t, hex) >= 4.5 ? t : best([t, ...ctx.colours.map((c) => c.hex), ...ctx.tones.map((x) => x.hex)]);
};
// a step of the brand's type scale: its family and the loaded weight it sets in (a "chrome" step is the brand's body face)
const faceOf = (ctx, t) => {
  const F = ctx.brand.fonts;
  if (t.face === 'display') return { role: 'display', family: F.display.family, weight: displayWeight(ctx), css: 'var(--display)' };
  if (t.face === 'mono' && F.mono) return { role: 'mono', family: F.mono.family, weight: 400, css: 'var(--bmono)' };
  return { role: 'body', family: F.body.family, weight: bodyWeight(ctx, t.weight || 400), css: 'var(--body)' };
};
const lineOf = (t) => Math.round(t.size * t.line);
const sentence1 = (s) => String(s || '').split(/(?<=[.!?])\s+/)[0];
// The sample paragraph without the brand's lines in it: the typefaces page sets the paragraph whole; the pages that set the same sample again
// take the rest of it, so the sign line is not printed on every type page.
const bare = (ctx) => {
  const B = ctx.brand, own = new Set([B.lines.primary, ...B.lines.others].map((l) => l.replace(/[.!?]+$/, '').toLowerCase())), p = B.type.sample.paragraph;
  const ss = p.split(/(?<=[.!?])\s+/).filter((x) => !own.has(x.replace(/[.!?]+$/, '').toLowerCase()));
  return ss.length ? ss.join(' ') : p;
};

export const guidelines = {
  // ---- proportion: the palette set like copy. Every colour runs down the four columns in order of its share, the way a story runs from the
  // foot of one column to the head of the next, so the depth it takes is its share of every page. The columns are drawn to scale. ----
  proportion: (ctx) => {
    const cs = ctx.colours, sh = cs.map((c) => (typeof c.share === 'number' ? c.share : 1 / cs.length)), sum = sh.reduce((a, b) => a + b, 0);
    const list = cs.map((c, i) => ({ c, s: sh[i] / sum })).sort((a, b) => b.s - a.s), top = list[0];
    const cols = Math.round(top.s * 40) / 10, cw = Number.isInteger(cols) ? word(cols) : cols % 1 === 0.5 ? `${word(Math.floor(cols))} and a half` : cols.toFixed(1);
    const hd = headline(ctx, `${top.c.name} fills ${cw} of the four columns.`);
    const deckT = 'Each colour runs down the columns in order of its share, the way a story runs on from one column to the next. How deep it goes is how much of every page it takes.';
    const yD = G.top + hd.h + 32, deckH = linesIn(ctx, 'body', deckT, 24, 488, bodyWeight(ctx, 500)) * 32;
    const deck = col(G.left, yD, 488, `<p class="b-deck">${A(deckT)}</p>`);
    // the four columns: as deep as the page allows, at most 720
    const yF = yD + deckH + 56, H = Math.min(720, G.floor - 96 - yF), total = 4 * H;
    let cum = 0, fields = '', labels = '';
    const missed = [];
    for (const { c, s } of list) {
      const a = Math.round(cum * total), b = Math.round((cum + s) * total); cum += s;
      const pct = `${Math.round(s * 100)}%`, on = onFill(ctx, c.hex);
      let first = true, shown = false;
      for (let k = 0; k < 4; k++) {
        const lo = Math.max(a, k * H), hi = Math.min(b, (k + 1) * H);
        if (hi - lo < 1) continue;
        const y = yF + lo - k * H, h = hi - lo;
        fields += E(G.x[k], y, 'g3-fld', '', { w: G.col, h, style: `background:${c.hex};${edge(ctx, c.hex)}` });
        if (first && h >= 60) { labels += E(G.x[k] + 16, y + 12, '', `<p class="c-label" style="color:${on}">${A(c.name)}</p><p class="c-folio" style="color:${on}">${pct}</p>`, { w: G.col - 32 }); shown = true; }
        else if (first && h >= 34) { labels += E(G.x[k] + 16, y + 6, 'c-label nw', `<span style="color:${on}">${A(c.name)} ${pct}</span>`, { w: G.col - 32 }); shown = true; }
        // the colour carries on at the head of the next column, marked the way a paper marks a story that runs on
        else if (!first && h >= 60) labels += E(G.x[k] + 16, y + 12, 'c-cap', `<span style="color:${on}">${A(c.name)}, continued</span>`, { w: G.col - 32 });
        first = false;
      }
      if (!shown) missed.push(`${c.name} ${pct}`);
    }
    // a colour too shallow to carry its own name is named under the columns
    const capT = `Drawn to scale: the four columns are the whole page, read from the head of the first.${missed.length ? ` Too shallow to label: ${missed.join(', ')}.` : ''}`;
    const foot = col(G.left, yF + H + 16, 488, `<p class="c-cap c-quiet">${A(capT)}</p>${jump(ctx, 'contrast', 'Text pairs and their contrast')}`);
    return page(ctx, 'proportion', folio(ctx, 'proportion') + hd.html + deck + fields + labels + foot);
  },

  // ---- contrast: the weather table. Each pair the brand sets text in is a row: its sample, what it is used for, a bar on a scale of 1 to 21
  // with the mark it has to clear, and the reading. The pairs kept off text follow in a quieter table of their own. ----
  contrast: (ctx) => {
    const used = ctx.pairs, un = ctx.unusedPairs;
    const hd = headline(ctx, un.length ? `${up(word(used.length))} pairs carry text. ${up(word(un.length))} never do.` : `${up(word(used.length))} pairs carry text.`);
    const deckT = 'Text needs 4.5 : 1 against its ground, and type 24 px and over needs 3 : 1. Every pair is measured, and a pair under its mark is kept off text.';
    const yD = G.top + hd.h + 32, deckH = linesIn(ctx, 'body', deckT, 24, 744, bodyWeight(ctx, 500)) * 32;
    const deck = col(G.left, yD, 744, `<p class="b-deck">${A(deckT)}</p>${jump(ctx, 'colour-values', 'Values for each colour')}`);
    const yT = yD + deckH + 16 + 22 + 48;
    // row heights shrink, within limits, so both tables stand above the floor
    let rh = 60, rh2 = 40;
    const need = () => 30 + used.length * rh + (un.length ? 48 + 30 + un.length * rh2 : 0);
    while (need() > G.floor - yT && rh > 48) rh -= 2;
    while (need() > G.floor - yT && rh2 > 32) rh2 -= 2;
    const scale = (r) => px(G.col * (Math.min(r, 21) - 1) / 20);
    const dW = displayWeight(ctx), bW = bodyWeight(ctx, 400);
    const th = (y) => E(G.x[0], y, 'c-folio c-quiet', 'Pair') + E(G.x[1], y, 'c-folio c-quiet', 'Used for') + E(G.x[2], y, 'c-folio c-quiet', 'On a scale of 1 to 21')
      + E(G.x[3], y, 'c-folio c-quiet c-right', 'Ratio', { w: G.col }) + hr(G.left, y + 28, 1000, 1);
    const row = (p, i, n) => {
      const big = !!p.large, mark = big ? 3 : 4.5;
      // the sample is set at the smallest size the pair is cleared for: the body face at 16 px, or the display face at the pair's large size
      const aa = big ? `<span class="g3-aa" style="font-family:var(--display);font-weight:${dW};font-size:${Math.max(24, p.minSize || 24)}px;line-height:1">Aa</span>` : `<span class="g3-aa" style="font-family:var(--body);font-weight:${bW};font-size:16px;line-height:1">Aa</span>`;
      return `<div class="g3-cr${i === n - 1 ? ' last' : ''}" style="height:${rh}px">`
        + `<div class="g3-cp"><span class="g3-chip" style="background:${p.bgHex};color:${p.fgHex};${edge(ctx, p.bgHex)}">${aa}</span><p class="c-label">${A(pairName(ctx, p))}</p></div>`
        + `<div><p class="c-cap c-ink">${A(p.use)}</p>${big && !/\bpx\b/.test(p.use) ? `<p class="c-cap c-quiet">${Math.max(24, p.minSize || 24)} px and over</p>` : ''}</div>`
        + `<span class="g3-track"><i class="g3-bar" style="width:${scale(p.ratio)}"></i><i class="g3-tick" style="left:${scale(mark)}"></i></span>`
        + `<p class="g3-ratio">${p.ratioText}<span> : 1</span></p></div>`;
    };
    const rowU = (p, i, n) => `<div class="g3-cr g3-cr--u${i === n - 1 ? ' last' : ''}" style="height:${rh2}px">`
      + `<div class="g3-cp"><span class="g3-chip g3-chip--u" style="background:${p.bgHex};${edge(ctx, p.bgHex)}"><i style="background:${p.fgHex}"></i></span><p class="c-label nw">${A(pairName(ctx, p))}</p></div>`
      + `<span class="g3-track"><i class="g3-bar g3-bar--u" style="width:${scale(p.ratio)}"></i><i class="g3-tick" style="left:${scale(4.5)}"></i></span>`
      + `<p class="c-label c-quiet c-right">${p.ratioText} : 1</p></div>`;
    let out = th(yT) + col(G.left, yT + 29, 1000, used.map((p, i) => row(p, i, used.length)).join(''));
    if (un.length) {
      const yU = yT + 30 + used.length * rh + 48;
      out += E(G.left, yU, 'c-label c-ink', 'Kept off text') + hr(G.left, yU + 28, 1000, 1)
        + col(G.left, yU + 29, 1000, un.map((p, i) => rowU(p, i, un.length)).join(''));
    }
    return page(ctx, 'contrast', folio(ctx, 'contrast') + hd.html + deck + out);
  },

  // ---- colour-values: the listings. Each colour is a line of a stocks table (hex, RGB, OKLCH), with its tint ramp under it printed as a
  // press colour bar: ten abutting patches, the colour's own step marked. The print note and the tones close the page. ----
  'colour-values': (ctx) => {
    const B = ctx.brand, cs = ctx.colours, steps = Object.keys(cs[0].ramp);
    const hd = headline(ctx, `Every ${B.name} colour, by the numbers.`);
    const yT = G.top + hd.h + 48;
    const th = E(G.x[0], yT, 'c-folio c-quiet', 'Colour') + E(G.x[1], yT, 'c-folio c-quiet', 'Hex') + E(G.x[2], yT, 'c-folio c-quiet', 'RGB') + E(G.x[3], yT, 'c-folio c-quiet', 'OKLCH') + hr(G.left, yT + 28, 1000, 1);
    // a bar is 40 deep for up to five colours; more colours, shallower bars
    const bh = cs.length <= 5 ? 40 : 24, pw = 1000 / steps.length;
    let y = yT + 29 + 16, blocks = '';
    cs.forEach((c, i) => {
      blocks += E(G.x[0], y, '', `<p class="g3-name">${A(c.name)}</p><p class="c-cap c-quiet">${A(ctx.cap(c.role))}</p>`, { w: G.col })
        + E(G.x[1], y + 2, 'c-mono', A(c.hex)) + E(G.x[2], y + 2, 'c-mono', A(c.rgb)) + E(G.x[3], y + 2, 'c-mono nw', A(c.oklch))
        + (ctx.C.cmykOf(c) ? E(G.x[1], y + 24, 'c-mono nw', A(ctx.C.cmykOf(c))) : '');
      const yb = y + 56;
      blocks += steps.map((k, j) => {
        const base = +k === c.rampBase, hex = c.ramp[k], x = G.left + j * pw;
        return E(x, yb, 'g3-patch', '', { w: pw, h: bh, style: `background:${hex};${edge(ctx, hex)}` })
          + (base ? hr(x, yb + bh + 4, pw, 3) : '')
          + E(x, yb + bh + 12, `c-folio ${base ? 'c-ink' : 'c-quiet'}`, k);
      }).join('');
      y = yb + bh + 12 + 22 + 20;
      if (i < cs.length - 1) { blocks += hr(G.left, y, 1000, .75, 'hair'); y += 16; }
    });
    blocks += hr(G.left, y, 1000, 1);
    // the print note, and the tones the brand measured for text
    const act = cs.find((c) => c.hex.toLowerCase() === ctx.roles.light.action.toLowerCase());
    const noteT = `Values are for screens. Print shifts colour, so ask your printer for a proof before a run, and match ${act ? act.name : 'the action colour'} to the proof. Every tint is in the palette files in the brand kit.`;
    const yN = y + 48;
    const note = col(G.left, yN, 488, `<p class="c-note c-ink">${A(noteT)}</p><p class="c-cap c-quiet" style="margin-top:8px">The bar under a step marks the colour itself.</p>${jump(ctx, 'typefaces', 'The typefaces')}`);
    const tones = ctx.tones.length ? col(G.x[2], yN, 488, `<p class="c-label c-ink">Tones</p><div class="g3-tones">${ctx.tones.map((t) => `<div class="g3-tone"><i class="g3-key" style="background:${t.hex};${edge(ctx, t.hex)}"></i><p class="c-label">${A(t.name)}</p><p class="c-cap c-quiet">${A(ctx.cap(t.role))}</p><p class="c-mono c-right">${A(t.hex)}</p></div>`).join('')}</div>`, { rule: true }) : '';
    return page(ctx, 'colour-values', folio(ctx, 'colour-values') + hd.html + th + blocks + note + tones);
  },

  // ---- hierarchy: the head schedule. Every step of the brand's scale set at its true size in its own face, largest first, with its size, face,
  // job and count to the column (how many characters of it a 232 px column holds) set beside it in the fourth column. ----
  hierarchy: (ctx) => {
    const B = ctx.brand, T = B.type.sample, scale = [...B.type.scale].sort((a, b) => b.size - a.size);
    // a sample for every step, never the same line twice: the display steps take the name, the sample headline, then lines the brand wrote;
    // the body steps take what that step is for
    const dPool = [B.name, T.headline, ...B.voice.writeThis.map((w) => w.write).filter((w) => w.length <= 40)], usedS = new Set();
    const take = (pool) => { const s = pool.find((x) => x && !usedS.has(x)); usedS.add(s); return s; };
    const forBody = (t) => ({ body: bare(ctx), caption: T.caption, label: B.ui.screen.content.form.book }[t.token]) || sentence1(B.description);
    const rows = scale.map((t) => {
      const f = faceOf(ctx, t), lh = lineOf(t);
      let spec;
      if (f.role === 'display') {
        const text = take(dPool), fl = fitLines(ctx, text, { w: 744, max: t.size, min: t.size, maxLines: 3 });
        spec = { html: `<div class="g3-disp" style="font-size:${t.size}px;line-height:${lh}px">${fl.lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</div>`, text };
      } else {
        const text = usedS.has(forBody(t)) ? sentence1(B.voice.boilerplate25) : forBody(t); usedS.add(text);
        spec = { html: `<p lang="en-AU" style="font-family:${f.css};font-weight:${f.weight};font-size:${t.size}px;line-height:${lh}px;max-width:488px;hyphens:manual">${A(text)}</p>`, text };
      }
      // the count: the column's width over the sample's average character
      const avg = (f.role === 'display' ? measure(ctx, spec.text, t.size) : measureRole(ctx, f.role, spec.text, t.size, f.weight)) / spec.text.length;
      const count = Math.floor(G.col / avg);
      const side = `<p class="c-label c-ink">${A(ctx.cap(t.token))}</p><p class="c-cap c-ink"><span class="c-mono">${t.size}/${lh}</span> ${A(f.family)} ${f.weight}</p><p class="c-cap c-quiet">${A(t.use)}</p><p class="c-cap c-quiet">About ${count} characters to a column</p>`;
      return `<div class="g3-hs">${spec.html}<div class="g3-hs-side">${side}</div></div>`;
    }).join('');
    const head = E(G.x[0], G.top, 'c-folio c-quiet', 'Each step at its own size') + E(G.x[3], G.top, 'c-folio c-quiet', 'Size, face and job') + hr(G.left, G.top + 28, 1000, 1);
    const sched = `<div class="a colm${ctx.placeholders ? ' ph-tight' : ''}" style="left:${px(G.left)};top:${px(G.top + 29)};width:1000px"><i class="g3-vr"></i>${rows}${jump(ctx, 'type-in-use', 'The type in use')}</div>`;
    return page(ctx, 'hierarchy', folio(ctx, 'hierarchy') + head + sched);
  },

  // ---- type-in-use: a story as it goes to press, at the brand's own sizes: the headline, the screened plate with its caption, the body
  // beside it. What each part is set in follows as a ruled table under the story. ----
  'type-in-use': (ctx) => {
    const B = ctx.brand, T = B.type.sample, S = B.type.scale, tok = (n) => S.find((t) => t.token === n);
    const disp = S.filter((t) => t.face === 'display').sort((a, b) => b.size - a.size);
    const hT = tok('headline') || disp[1] || disp[0], bT = tok('body') || S.find((t) => t.face !== 'display'), cT = tok('caption') || [...S].sort((a, b) => a.size - b.size)[0];
    const hF = faceOf(ctx, hT), bF = faceOf(ctx, bT), cF = faceOf(ctx, cT), hl = lineOf(hT), bl = lineOf(bT), cl = lineOf(cT);
    const fl = fitLines(ctx, T.headline, { w: 744, max: hT.size, min: hT.size, maxLines: 3 });
    const head = E(G.left, G.top, 'story', `<h1 class="g3-disp" style="font-size:${hT.size}px;line-height:${hl}px">${fl.lines.map((l) => `<span class="ln">${A(l)}</span>`).join('')}</h1>`, { w: 744 });
    const yP = G.top + fl.lines.length * hl + 40;
    // the plate is the intro's screened photograph; its caption is the photograph's own, set as the brand sets a caption. With no photograph the
    // caption is the type sample's, under the body.
    const pb = plateBox(ctx, 'cover'), capStyle = `font-family:${cF.css};font-weight:${cF.weight};font-size:${cT.size}px;line-height:${cl}px`;
    let plate = '', capT = T.caption;
    if (pb) {
      const inner = plateInner(ctx, 'cover'), img = (inner.match(/<div class="plate">[\s\S]*?<\/div>/) || [''])[0], m = inner.match(/<p class="c-cap c-ink"[^>]*>([\s\S]*?)<\/p>/);
      plate = col(G.left, yP, pb.w, `${img}<p class="c-quiet" style="${capStyle};margin-top:8px">${m ? m[1] : A(capT)}</p>`);
    }
    const bodyP = `<p class="b-body" lang="en-AU" style="font-family:${bF.css};font-weight:${bF.weight};font-size:${bT.size}px;line-height:${bl}px">${A(bare(ctx))}</p>`;
    const capP = pb ? '' : `<p class="c-quiet" style="${capStyle};margin-top:16px">${A(capT)}</p>`;
    const body = col(pb ? G.x[3] : G.left, yP, G.col, `${bodyP}${capP}${jump(ctx, 'type-rules', 'Type rules')}`, { rule: !!pb });
    // the spec, 96 under the story: what each part is set in, and the job the brand gives that step. The paper below it stays bare.
    const rowsS = [['Headline', hT, hF, hl], ['Body', bT, bF, bl], ['Caption', cT, cF, cl]];
    const bodyH = linesIn(ctx, 'body', bare(ctx), bT.size, G.col, bF.weight) * bl + 16 + 22 + (pb ? 0 : 16 + cl * 2);
    const rh = 72, yS = Math.min(G.floor - 30 - rowsS.length * rh, yP + Math.max(pb ? pb.h + 8 + cl * 2 : 0, bodyH) + 128);
    const tbl = E(G.x[0], yS, 'c-folio c-quiet', 'In this story') + E(G.x[1], yS, 'c-folio c-quiet', 'Face') + E(G.x[2], yS, 'c-folio c-quiet', 'Size and line') + E(G.x[3], yS, 'c-folio c-quiet', 'Its job')
      + hr(G.left, yS + 28, 1000, 1)
      + col(G.left, yS + 29, 1000, rowsS.map(([n, t, f, l], i) => `<div class="g3-sr${i === rowsS.length - 1 ? ' last' : ''}" style="height:${rh}px"><p class="c-label">${n}</p><p class="c-cap c-ink">${A(f.family)} ${f.weight}</p><p class="c-mono">${t.size}/${l}</p><p class="c-cap c-quiet">${A(t.use)}</p></div>`).join(''));
    return page(ctx, 'type-in-use', folio(ctx, 'type-in-use') + head + plate + body + tbl);
  },

  // ---- type-rules: the style book. Each rule is a row: set it this way on the paper, and not this way on the "don't" ground, which runs as one
  // band down the third and fourth columns. Where a rule can be shown, both sides show it in the brand's own faces. ----
  'type-rules': (ctx) => {
    const B = ctx.brand, R = B.type.rules, own = new Set([B.lines.primary, ...B.lines.others]);
    // each demonstration sets its own line (a story the brand wrote, not one of its lines), so no one line runs down the page; the "not this way" side is a specimen, drawn as art
    const pool = [...B.voice.writeThis.map((w) => w.write).filter((w) => w.length <= 40 && !own.has(w)), B.type.sample.headline]; let used = 0;
    const nextLine = () => pool[used++ % pool.length] || B.lines.primary;
    const hd = headline(ctx, `${up(word(R.length))} rules for setting ${B.name} type.`);
    const yT = G.top + hd.h + 48, W = 440, dW = displayWeight(ctx);
    // which rule a demonstration fits, read from its words
    const kind = (r) => { const t = `${r.do} ${r.dont}`; return /capital|upper ?case|sentence case/i.test(t) ? 'case' : /letter-?spac|tracking/i.test(t) ? 'track' : /opacity|fade/i.test(t) ? 'fade' : /\bmono\b/i.test(t) ? 'mono' : /\d+\s*px/i.test(t) ? 'size' : null; };
    // a display line set at the largest size (40 down to 20) where the wider of the two settings holds one line
    const dl = (text, s, extra) => `<p class="g3-disp g3-demo" style="font-size:${s}px;line-height:${Math.round(s * 1.1)}px;${extra}">${A(text)}</p>`;
    const fitS = (wide) => Math.max(20, Math.min(56, Math.floor(40 * (W - 8) * 1.7 / wide(40))));
    const demo = (r) => {
      const k = kind(r), line = k === 'case' || k === 'track' || k === 'fade' ? nextLine() : '';
      if (k === 'case') { const s = fitS((z) => measure(ctx, line.toUpperCase(), z)); return [dl(line, s, ''), dl(line, s, 'text-transform:uppercase')]; }
      if (k === 'track') { const s = fitS((z) => measure(ctx, line, z, 0.12)); return [dl(line, s, ''), dl(line, s, 'letter-spacing:.12em')]; }
      if (k === 'size') {
        const n = +((r.do.match(/(\d+)\s*px/) || [])[1] || 14), lo = +((r.dont.match(/(\d+)\s*px/) || [])[1] || n) - 3, t = sentence1(bare(ctx));
        const p = (z) => `<p class="g3-demo" lang="en-AU" style="font-family:var(--body);font-weight:${bodyWeight(ctx, 400)};font-size:${z}px;line-height:${Math.round(z * 1.5)}px;max-width:${W}px">${A(t)}</p>`;
        return [p(n), p(Math.max(6, lo))];
      }
      if (k === 'fade') return [`<div class="g3-demo"><p style="font-family:var(--body);font-weight:${bodyWeight(ctx, 700)};font-size:16px;line-height:24px">${A(line)}</p><p class="c-quiet" style="font-family:var(--body);font-weight:${bodyWeight(ctx, 400)};font-size:16px;line-height:24px">${A(B.type.sample.caption)}</p></div>`, ''];
      if (k === 'mono') {
        const m = `font-family:var(--bmono);font-weight:400;font-size:16px;line-height:24px`;
        return [`<p class="g3-demo" style="${m}">${A(ctx.roles.light.action)}</p>`, `<p class="g3-demo" style="${m}">${A(B.ui.screen.content.form.book)}</p>`];
      }
      return ['', ''];
    };
    const th = E(G.x[0], yT, 'c-folio c-quiet', 'Set it this way') + E(G.x[2] + 24, yT, 'c-folio c-quiet', 'Not this way') + hr(G.left, yT + 28, 1000, 1);
    const rows = R.map((r, i) => { const [a, b] = demo(r); return `<div class="g3-tr${i === R.length - 1 ? ' last' : ''}"><div class="g3-do">${a}<p class="c-note c-ink">${A(r.do)}</p></div><div class="g3-dont">${b ? `<!--art-->${b}<!--/art-->` : b}<p class="c-note c-ink">${A(r.dont)}</p></div></div>`; }).join('');
    // the band behind the "not" column is drawn from the table's own markup, so it is exactly as deep as the rows
    const tbl = `<div class="a colm g3-rules" style="left:${px(G.left)};top:${px(yT + 29)};width:1000px"><i class="g3-band"></i>${rows}${jump(ctx, 'photo-direction', 'Photography')}</div>`;
    return page(ctx, 'type-rules', folio(ctx, 'type-rules') + hd.html + th + tbl);
  },
};

export function css(ctx) {
  const d = ctx.brand.fonts.display;
  return `
/* lane g3: colour and type pages */
.pg .g3-disp{font-family:var(--display);font-weight:${displayWeight(ctx)};font-stretch:${d.stretch || 100}%;letter-spacing:${TRACK}em;font-variant-numeric:lining-nums;font-kerning:normal}
.pg .g3-fld,.pg .g3-patch{display:block}

/* contrast: the weather table */
.pg .g3-cr{display:grid;grid-template-columns:232px 232px 232px 232px;column-gap:24px;align-items:center;border-bottom:.75px solid var(--hair);box-sizing:border-box}
.pg .g3-cr.last{border-bottom:1px solid var(--ink)}
.pg .g3-cp{display:flex;align-items:center;gap:16px}
.pg .g3-cp .c-label{min-width:0}
.pg .g3-chip{flex:none;display:flex;align-items:center;justify-content:center;width:64px;height:40px}
.pg .g3-chip--u{height:24px}
.pg .g3-cr--u .g3-cp{grid-column:span 2}
.pg .g3-chip--u i{display:block;width:32px;height:4px}
.pg .g3-track{position:relative;display:block;height:24px}
.pg .g3-track::before{content:'';position:absolute;left:0;right:0;top:11.625px;height:.75px;background:var(--hair)}
.pg .g3-bar{position:absolute;left:0;top:8px;height:8px;background:var(--ink)}
.pg .g3-bar--u{background:var(--quiet)}
.pg .g3-tick{position:absolute;top:2px;width:1px;height:20px;margin-left:-.5px;background:var(--ink)}
.pg .g3-ratio{font:700 28px/32px 'Sofia Sans Condensed',sans-serif;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.pg .g3-ratio span{font:600 17px/22px 'Sofia Sans Condensed',sans-serif;color:var(--quiet)}

/* colour-values: the listings and the press colour bars */
.pg .g3-name{font:700 20px/24px 'Sofia Sans Condensed',sans-serif}
.pg .g3-tones{margin-top:8px;border-top:1px solid var(--ink)}
.pg .g3-tone{display:grid;grid-template-columns:16px 200px minmax(0,1fr) 96px;column-gap:16px;align-items:center;height:36px;border-bottom:.75px solid var(--hair)}
.pg .g3-tone:last-child{border-bottom:1px solid var(--ink)}
.pg .g3-tone .c-label,.pg .g3-tone .c-cap{white-space:nowrap}
.pg .g3-key{display:block;width:16px;height:16px}

/* hierarchy: the head schedule */
.pg .g3-hs{display:grid;grid-template-columns:744px 232px;column-gap:24px;align-items:start;padding:40px 0;border-bottom:.75px solid var(--hair)}
.pg .g3-hs:last-of-type{border-bottom:1px solid var(--ink)}
.pg .g3-hs-side .c-label{margin-bottom:4px}
.pg .g3-vr{position:absolute;left:755.625px;top:0;bottom:38px;width:.75px;background:var(--hair)}

/* type-in-use: the spec hung from the floor */
.pg .g3-sr{display:grid;grid-template-columns:232px 232px 232px 232px;column-gap:24px;align-items:center;border-bottom:.75px solid var(--hair);box-sizing:border-box}
.pg .g3-sr.last{border-bottom:1px solid var(--ink)}

/* type-rules: the style book, the "don't" ground one band down the third and fourth columns */
.pg .g3-rules{isolation:isolate}
.pg .g3-band{position:absolute;left:512px;width:488px;top:0;bottom:38px;background:var(--paper2);z-index:-1}
.pg .g3-tr{display:grid;grid-template-columns:488px 488px;column-gap:24px;border-bottom:.75px solid var(--hair)}
.pg .g3-tr.last{border-bottom:1px solid var(--ink)}
.pg .g3-do{padding:56px 24px 56px 0}
.pg .g3-dont{padding:56px 24px}
.pg .g3-demo{margin-bottom:12px;overflow-wrap:break-word}
`;
}
