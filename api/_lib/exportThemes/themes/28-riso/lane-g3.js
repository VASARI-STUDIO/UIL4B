// Lane g3 for theme 28 (Riso): the colour and type pages this theme did not have yet (proportion, contrast, colour-values, hierarchy,
// type-in-use, type-rules). Every page is one sheet off the press, made by sheet(): a plate, a pass and a hit. As in lane g1, the hit numeral
// is always a real count (or share) taken from ctx, and the words beside it on the plate say what it counts.
// Truth: every hex, ratio and size is read from ctx (ctx.colours, ctx.tones, ctx.pairs, ctx.unusedPairs, brand.type) or worked out by the
// press (pressOf). Where two drums cross, the browser's multiply makes the colour, and the value printed under it is mul(), the same sum.
// Brand copy is printed whole through A(); text is measured only to choose a size or a row height, and the browser wraps it.
import { sheet, A, wrap, inkW, faceFor, faceCss, pressOf, inkLayers, val, mul, X0 } from './sheet.js';
import { bookBrand } from './copy.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const stem = (ctx, role, weight = 400) => faceFor(ctx, role, weight).stem;
// lines a text takes at this size: measured 12 px narrower than it is set, so the browser never wraps sooner than the count says
const nLines = (st, t, size, w, track = 0) => wrap(st, String(t || ''), size, w - 12, track).length;
const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${t}</p>`;
const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
const hair = (y, x = X0, w = 578, c = '') => `<i class="a g3-hr" style="left:${x}px;top:${y}px;width:${w}px${c ? `;border-color:${c}` : ''}"></i>`;
const same = (a, b) => String(a).toUpperCase() === String(b).toUpperCase();
// a chip as light as the paper gets a hairline edge, so it still reads as a chip
const edge = (ctx, hex) => (ctx.ratio(hex, pressOf(ctx).paper) < 1.3 ? ';box-shadow:inset 0 0 0 .5px var(--hair)' : '');
const nameOf = (ctx, id) => ((ctx.colours.find((c) => c.id === id) || ctx.tones.find((t) => t.id === id) || { name: id }).name);
const ratioV = (t) => `${t} : 1`;
// a pair named for print: a tone already named for its ground ("Quiet on Wall") is not named twice
const pairName = (ctx, p) => {
  const f = nameOf(ctx, p.fg), b = nameOf(ctx, p.bg);
  return f.endsWith(` on ${b}`) ? f : f.includes(' on ') ? `${f}, set on ${b}` : `${f} on ${b}`;
};
const lh = (s) => Math.round(s.size * s.line);

export function css() {
  return `.pg .g3-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .g3-chip{position:absolute;isolation:isolate}
.pg .g3-chip p{position:absolute}
.pg .g3-chip .ph-n{white-space:normal!important}
.pg .g3-chip .ph-c{font-size:1em}  /* slot edition: a large-text pair is only large at its full size, so the placeholder is not capped at 20 px */
.pg .g3-ov{position:absolute;isolation:isolate}
.pg .g3-ov i{position:absolute;inset:0}
.pg .g3-mk{position:absolute;height:3px;background:var(--key)}
.pg .g3-piece{position:absolute;overflow:hidden;background:var(--paper);box-shadow:inset 0 0 0 .5px var(--hair)}
.pg .g3-piece .g3-t{position:absolute;inset:0;z-index:3}
.pg .g3-piece .g3-t p{position:absolute}
`;
}

export const guidelines = {
  // Proportion: one sheet of the brand drawn to scale. The sheet is the ground colour; every other colour is a band across its head, as deep
  // as its share of a page, stacked in share order the way the plate sits at the head of every sheet here. The hit is the ground's share.
  proportion(ctx) {
    const cols = [...ctx.colours].sort((a, b) => b.share - a.share);
    const g = cols.find((c) => c.role === 'ground') || cols[0], rest = cols.filter((c) => c !== g);
    const tot = cols.reduce((a, c) => a + c.share, 0), pc = (c) => Math.round((c.share / tot) * 100);
    const FX = 49, FY = 280, FW = 330, FH = Math.round(FW * Math.SQRT2);
    // the bands: cumulative rounding, so the bands and the ground add up to the sheet with no gap
    let acc = 0, bands = '';
    const tops = rest.map((c) => { const t = Math.round((acc / tot) * FH); acc += c.share; return { c, t, b: Math.round((acc / tot) * FH) }; });
    for (const { c, t, b } of tops) bands += `<i class="a" style="left:0;top:${t}px;width:${FW}px;height:${b - t}px;background:${c.hex}${edge(ctx, c.hex)}"></i>`;
    const fig = `<div class="a" style="left:${FX}px;top:${FY}px;width:${FW}px;height:${FH}px;background:${g.hex};box-shadow:inset 0 0 0 .5px var(--hair)">${bands}</div>`;
    // the key: one entry a colour, in the sheet's order (bands from the head down, then the ground), each held level with its band where it can be
    const bst = stem(ctx, 'body', 400);
    let y = FY, key = '';
    const items = [...tops.map((x) => ({ c: x.c, at: FY + x.t })), { c: g, at: FY + (tops.length ? tops[tops.length - 1].b : 0) }];
    for (const { c, at } of items) {
      y = Math.max(y, at);
      key += `<i class="a" style="left:403px;top:${y + 3}px;width:10px;height:10px;background:${c.hex}${edge(ctx, c.hex)}"></i>
<p class="a c-note nw" style="left:419px;top:${y}px;font-weight:600">${A(c.name)}</p><p class="a c-value nw" style="left:${419 + Math.ceil(inkW(stem(ctx, 'body', 600), c.name, 12)) + 24}px;top:${y + 1}px">${pc(c)}%</p>
<p class="a c-note" style="left:419px;top:${y + 20}px;width:208px">${A(c.lands)}</p>`;
      y += 20 + nLines(bst, c.lands, 12, 208) * 17 + 24;
    }
    const inner = `${plateLabel('Proportion')}
${plateNote(`Per cent of every page is ${A(g.name)}. The sheet below is one page drawn to scale: each colour takes the share it takes in use.`, 403, 72, 224)}
${fig}${key}`;
    return sheet(ctx, 'proportion', { hp: 232, hit: { text: String(pc(g)), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Contrast: a proof of every text pair. Each pair is pulled as a strip in its own two colours, its use and its ratio set in it, so the strip
  // is the pair at work; who it is and the mark it clears sit beside it. The pairs below their mark run along the foot, as swatches only.
  // The hit is how many pairs carry text.
  contrast(ctx) {
    const P = pressOf(ctx), B = ctx.brand, used = ctx.pairs, un = ctx.unusedPairs || [];
    const ust = stem(ctx, 'body', 600), mst = 'SonoMono-400', CW = 330;
    let y = 288, rows = '';
    for (const p of used) {
      const big = !!p.large, us = big ? Math.max(24, p.minSize || 24) : 14, ul = big ? us + 6 : 20, rs = big ? us : 18;
      const rt = ratioV(p.ratioText), rw = Math.ceil(inkW(mst, rt, rs)) + 4, tw = CW - 24 - rw - 16;
      const n = ctx.placeholders && big ? 2 : nLines(ust, p.use, us, tw + 12), h = Math.max(n * ul, rs + 6) + 16;
      const onPlate = same(p.fgHex, P.textOnPlate) && same(p.bgHex, P.plate);
      const nm = pairName(ctx, p);
      const mark = big ? `Clears 3 : 1 at ${us} px and over only.` : 'Clears 4.5 : 1 for text at any size.';
      rows += `<div class="g3-chip" style="left:49px;top:${y}px;width:${CW}px;height:${h}px;background:${p.bgHex}${edge(ctx, p.bgHex)}">
<p style="left:12px;top:8px;width:${tw}px;${faceCss(ctx, 'body', 600)};font-size:${us}px;line-height:${ul}px;color:${p.fgHex}">${A(p.use)}</p>
<p class="nw" style="right:12px;top:${Math.round((h - (rs + 6)) / 2)}px;font:400 ${rs}px/${rs + 6}px var(--cmono);font-variant-numeric:tabular-nums;color:${p.fgHex}">${rt}</p></div>
<p class="a c-note" style="left:403px;top:${y}px;width:224px;font-weight:600">${A(nm)}</p>
<p class="a c-note" style="left:403px;top:${y + 17}px;width:224px">${mark}${onPlate ? ' The press sets its words on the plate in this pair.' : ''}</p>`;
      y += Math.max(h, onPlate ? 17 + 3 * 17 : 36) + 6;
    }
    let nu = '';
    if (un.length) {
      y += 16;
      nu += `${hair(y)}<p class="a c-label" style="left:49px;top:${y + 12}px">Not used for text</p>`;
      y += 34;
      const per = 3, cw = 196;
      // each row of swatches is as deep as its longest name needs
      const nl = un.map((p) => nLines(stem(ctx, 'body', 600), pairName(ctx, p), 12, 168)), rowY = [];
      for (let r = 0, yy = y; r * per < un.length; r++) { rowY.push(yy); yy += 17 * Math.max(...nl.slice(r * per, r * per + per)) + 14 + 10; }
      un.forEach((p, i) => {
        const x = 49 + (i % per) * cw, yy = rowY[Math.floor(i / per)];
        nu += `<span class="a" style="left:${x}px;top:${yy + 2}px;width:24px;height:24px;background:${p.bgHex}${edge(ctx, p.bgHex)}"><i style="position:absolute;left:6px;top:6px;width:12px;height:12px;background:${p.fgHex}${edge(ctx, p.fgHex)}"></i></span>
<p class="a c-note" style="left:${x + 32}px;top:${yy}px;width:156px;font-weight:600">${A(pairName(ctx, p))}</p><p class="a c-value nw" style="left:${x + 32}px;top:${yy + 17 * nLines(stem(ctx, 'body', 600), pairName(ctx, p), 12, 168)}px">${ratioV(p.ratioText)}</p>`;
      });
    }
    const inner = `${plateLabel('Contrast')}
${plateNote(`Pairs carry ${A(B.name)} text. Text needs 4.5 : 1; type 24 px and over needs 3 : 1. A pair below its mark is never used for text.`, 403, 72, 224)}
<p class="a c-label" style="left:49px;top:264px">In use</p>${rows}${nu}`;
    return sheet(ctx, 'contrast', { hp: 232, hit: { text: String(used.length), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Colour values: one row a colour, its HEX, RGB and OKLCH, and under them the ramp it tints to, each step with its own value; the colour
  // itself is marked under its step. Then the tones, and what the drums make where two of them cross, solid on solid: the browser's multiply
  // prints it and mul() gives its value. The hit is how many colours the brand has.
  'colour-values'(ctx) {
    const P = pressOf(ctx), cols = ctx.colours, n = cols.length, tones = ctx.tones || [];
    const drums = P.drums.map((d) => cols.find((c) => same(c.hex, d.hex)) || d);
    const pairs = [];
    for (let i = 0; i < drums.length; i++) for (let j = i + 1; j < drums.length; j++) pairs.push([drums[i], drums[j]]);
    const steps = Object.keys(cols[0].ramp || {}), ns = steps.length, SW = Math.floor(578 / Math.max(1, ns));
    // the lower block (tones beside the overprints) is laid first, so the rows take what is left
    const lowH = 36 + Math.max(tones.length * 22, pairs.length ? 64 + 34 : 0) + 64;
    const rowH = Math.min(128, Math.floor((1040 - 264 - lowH) / n)), full = rowH >= 112;
    const role = (c) => (P.drums.some((d) => same(d.hex, c.hex)) ? `Drum ${P.num(c)}` : same(c.hex, P.paper) ? 'The paper' : P.paperTints.includes(c) ? 'Paper tint, not printed' : 'Spot, not printed');
    // paper first, then the drums in drum order, then the rest in brand order
    const order = [...cols.filter((c) => same(c.hex, P.paper)), ...drums.filter((d) => cols.includes(d)), ...cols.filter((c) => !same(c.hex, P.paper) && !drums.includes(c))];
    let y = 264, rows = '';
    for (const c of order) {
      const ok = c.oklch.replace('oklch(', '').replace(')', '');
      rows += `${hair(y)}<i class="a" style="left:49px;top:${y + 14}px;width:16px;height:16px;background:${c.hex}${edge(ctx, c.hex)}"></i>
<p class="a nw" style="left:73px;top:${y + 11}px;${faceCss(ctx, 'body', 600)};font-size:16px;line-height:22px">${A(c.name)}</p>
<p class="a c-note nw" style="left:73px;top:${y + 34}px">${role(c)}</p>
<p class="a c-label" style="left:245px;top:${y + 14}px">HEX</p><p class="a c-value nw" style="left:245px;top:${y + 34}px">${A(c.hex)}</p>
<p class="a c-label" style="left:323px;top:${y + 14}px">RGB</p><p class="a c-value nw" style="left:323px;top:${y + 34}px">${ctx.C.hexToRgb(c.hex).join(' ')}</p>
<p class="a c-label" style="left:427px;top:${y + 14}px">OKLCH</p><p class="a c-value nw" style="left:427px;top:${y + 34}px">${A(ok)}</p>${ctx.C.cmykParts(c) ? `<p class="a c-label" style="left:547px;top:${y + 14}px">CMYK</p><p class="a c-value nw" style="left:547px;top:${y + 34}px">${ctx.C.cmykParts(c).join(' ')}</p>` : ''}`;
      const ry = y + 60;
      if (c.rampBase === 50 || !c.ramp) {
        rows += `<p class="a c-note" style="left:73px;top:${ry}px;width:330px">${same(c.hex, P.paper) ? 'The paper the run is printed on. It has no tints.' : 'The ground. It has no tints.'}</p>`;
      } else {
        steps.forEach((k, i) => {
          const x = 49 + i * SW, hx = c.ramp[k], base = +k === c.rampBase;
          rows += `<i class="a" style="left:${x}px;top:${ry}px;width:${SW}px;height:24px;background:${hx}${edge(ctx, hx)}"></i>${base ? `<i class="g3-mk" style="left:${x}px;top:${ry + 26}px;width:${SW}px"></i>` : ''}
<p class="a c-value nw" style="left:${x}px;top:${ry + 32}px">${k}</p>${full ? `<p class="a c-value nw" style="left:${x}px;top:${ry + 46}px">${A(hx.toUpperCase())}</p>` : ''}`;
        });
      }
      y += rowH;
    }
    rows += hair(y);
    // the tones, then the overprints of the drums, side by side under the rows
    const ly = y + 32;
    let low = '';
    if (tones.length) {
      low += `<p class="a c-label" style="left:49px;top:${ly}px">Tones</p>`;
      tones.forEach((t, i) => {
        const ty = ly + 24 + i * 22;
        low += `<i class="a" style="left:49px;top:${ty + 2}px;width:12px;height:12px;background:${t.hex}${edge(ctx, t.hex)}"></i><p class="a c-note nw" style="left:69px;top:${ty}px;font-weight:600">${A(t.name)}</p><p class="a c-value nw" style="left:245px;top:${ty + 1}px">${A(t.hex)}</p>`;
      });
    }
    if (pairs.length) {
      low += `<p class="a c-label" style="left:345px;top:${ly}px">Where two drums cross</p>`;
      const cw = Math.min(88, Math.floor((282 - (pairs.length - 1) * 8) / pairs.length));
      pairs.forEach(([a, b], i) => {
        const x = 345 + i * (cw + 8);
        low += `<span class="g3-ov" style="left:${x}px;top:${ly + 24}px;width:${cw}px;height:40px"><i style="background:${a.hex}"></i><i style="background:${b.hex};mix-blend-mode:multiply"></i></span>
<p class="a c-value nw" style="left:${x}px;top:${ly + 70}px">${mul(a.hex, b.hex)}</p>`;
      });
      const names = pairs.map(([a, b]) => `${A(a.name)} and ${A(b.name)}`).join('; ');
      low += `<p class="a c-note" style="left:345px;top:${ly + 92}px;width:282px">${names}. Results of the press, not brand colours; never specify them.</p>`;
    }
    const ny = 1040 - 21 * 2;
    const inner = `${plateLabel('Colour values')}
${plateNote(`Colours, each with its values and the tints it ramps to.${tones.length ? ` ${Word(tones.length)} tone${tones.length === 1 ? '' : 's'} sit beside them.` : ''}`, 403, 72, 224)}
${rows}${low}
<p class="a c-body" style="left:49px;top:${ny}px;width:578px">Values are for screens. A drum prints its own ink and paper shifts it, so ask your printer for a proof before a run.</p>`;
    return sheet(ctx, 'colour-values', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Hierarchy: the scale pulled as a proof, largest first. Each step is set at its true size across the full measure, with its token, size,
  // face and job on one line above it. The samples are the brand's own lines, each used once, each the longest that keeps to the step's lines.
  hierarchy(ctx) {
    const B = bookBrand(ctx), S = B.type.scale, n = S.length;
    // lines.primary is left out: it is the introduction's headline, said once. Each step draws from the brand copy made for its job.
    const K = (B.ui && B.ui.screen && B.ui.screen.content) || {}, form = K.form || {};
    const lines = [B.type.sample.headline, ...(B.lines.others || [])].filter((t) => t && t !== B.lines.primary);
    const pools = { big: [...lines, B.name], title: [K.rider, ...lines, B.name], body: [B.type.sample.paragraph, B.voice.boilerplate25], label: [form.title, K.call, K.status, K.share], caption: [B.type.sample.caption, K.riderNote, K.pickup] };
    const usedT = new Set();
    const body = S.find((s) => s.token === 'body') || S[S.length - 1];
    let y = 264, rows = '';
    for (const s of S) {
      const role = s.face === 'display' ? 'display' : s.face === 'mono' ? 'mono' : 'body', st = stem(ctx, role, s.weight), track = role === 'display' ? -0.01 : 0;
      const kind = s.size >= 40 ? 'big' : role === 'display' || s.size > body.size ? 'title' : s.size === body.size ? 'body' : s.token === 'label' ? 'label' : 'caption';
      const maxL = { big: 1, title: 1, body: 4, label: 1, caption: 2 }[kind];
      const pool = pools[kind].filter((t, i, a) => t && a.indexOf(t) === i);
      const fits = (t) => (maxL === 1 ? inkW(st, t, s.size, track) <= 566 : nLines(st, t, s.size, 578, track) <= maxL);
      const free = pool.filter((t) => !usedT.has(t) && fits(t));
      // the reading sizes take a sentence or more; the display steps the longest line that fits
      const pick = (kind === 'big' ? free.sort((a, b) => b.length - a.length)[0] : free[0]) || (fits(B.name) ? B.name : 'Aa');
      usedT.add(pick);
      const L = lh(s), lines = maxL === 1 ? 1 : nLines(st, pick, s.size, 578, track);
      const fam = B.fonts[role === 'mono' ? 'mono' : role].family;
      rows += `${hair(y)}<p class="a c-label nw" style="left:49px;top:${y + 12}px">${A(ctx.cap(s.token))}</p>
<p class="a c-value nw" style="left:167px;top:${y + 12}px">${s.size} / ${L}</p>
<p class="a c-note nw" style="left:245px;top:${y + 11}px">${A(fam)} ${faceFor(ctx, role, s.weight).weight}</p>
<p class="a c-note" style="left:403px;top:${y + 11}px;width:224px">${A(s.use)}</p>
<p class="a${maxL === 1 ? ' nw' : ''}" style="left:49px;top:${y + 40}px;width:578px;${faceCss(ctx, role, s.weight)};font-size:${s.size}px;line-height:${L}px${track ? ';letter-spacing:-.01em' : ''}">${A(pick)}</p>`;
      const useH = nLines(stem(ctx, 'body', 400), s.use, 12, 224) * 17;
      y += Math.max(40 + lines * L, 11 + useH + 12) + 24;
    }
    const inner = `${plateLabel('Hierarchy')}
${plateNote(`Steps in the scale, each with one job. Reading text is ${body.size} px; nothing in ${A(B.name)} is set between the steps.`, 403, 72, 224)}${rows}${hair(y)}`;
    return sheet(ctx, 'hierarchy', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Type in use: a handout pulled on the same press, its own plate and pass overprinting, with the brand's headline set in the key over the
  // plate, the paragraph and the caption on the paper, each at its step's true size. Every element is marked in the margin like a proof.
  // The hit is how many steps of the scale set the piece.
  'type-in-use'(ctx) {
    const B = bookBrand(ctx), T = B.type, S = T.scale, F = B.fonts;
    const tok = (k, d) => S.find((s) => s.token === k) || S[d];
    const used = [['Headline', tok('headline', 1), T.sample.headline], ['Body', tok('body', 3), T.sample.paragraph], ['Caption', tok('caption', S.length - 1), T.sample.caption]];
    const roleOf = (s) => (s.face === 'display' ? 'display' : s.face === 'mono' ? 'mono' : 'body');
    const PW = 440, PH = Math.round(PW * Math.SQRT2), PX = 49, PY = 264, pad = 28, passW = 44, tw = PW - pad - passW - 16;
    const [hS, bS, cS] = used.map((u) => u[1]);
    const hst = stem(ctx, roleOf(hS), hS.weight), hL = lh(hS), hn = nLines(hst, T.sample.headline, hS.size, tw, roleOf(hS) === 'display' ? -0.01 : 0);
    const plateH = Math.max(200, pad + hn * hL + 40);
    const bst = stem(ctx, roleOf(bS), bS.weight), bL = lh(bS), bn = nLines(bst, T.sample.paragraph, bS.size, tw);
    const cst = stem(ctx, roleOf(cS), cS.weight), cL = lh(cS), cn = nLines(cst, T.sample.caption, cS.size, tw);
    const ys = [pad, plateH + 32, PH - pad - cn * cL];
    const ink = inkLayers(ctx, 'type-in-use:piece', { w: PW, h: PH, plate: { x: 0, y: 0, w: PW, h: plateH }, pass: { x: PW - passW, y: -4, w: passW + 4, h: PH + 8 }, hit: null });
    const set = (u, y, colour) => { const s = u[1], r = roleOf(s); return `<p style="left:${pad}px;top:${y}px;width:${tw}px;${faceCss(ctx, r, s.weight)};font-size:${s.size}px;line-height:${lh(s)}px${r === 'display' ? ';letter-spacing:-.01em' : ''}${colour ? `;color:${colour}` : ''}">${A(u[2])}</p>`; };
    const piece = `<div class="g3-piece fib" style="left:${PX}px;top:${PY}px;width:${PW}px;height:${PH}px">${ink.html}<div class="g3-t">
${set(used[0], ys[0], 'var(--ptxt)')}${set(used[1], ys[1])}${set(used[2], ys[2])}</div></div>`;
    // the proof marks in the margin: a short rule from the piece's edge to each element's spec
    const MX = PX + PW + 20, marks = used.map((u, i) => {
      const s = u[1], r = roleOf(s), y = PY + ys[i];
      return `${hair(y + 7, PX + PW + 4, 12)}<p class="a c-label nw" style="left:${MX}px;top:${y}px">${u[0]}</p>
<p class="a c-note" style="left:${MX}px;top:${y + 18}px;width:${627 - MX}px">${A(F[r].family)} ${faceFor(ctx, r, s.weight).weight}</p>
<p class="a c-value nw" style="left:${MX}px;top:${y + 18 + nLines(stem(ctx, 'body', 400), `${F[r].family} ${s.weight}`, 12, 627 - MX) * 17 + 2}px">${s.size} / ${lh(s)}</p>`;
    }).join('');
    const inner = `${plateLabel('Type in use')}
${plateNote(`Steps of the scale set this handout: a headline, a paragraph and a caption, the way ${A(B.name)} sets them.`, 403, 72, 224)}
${piece}${marks}`;
    return sheet(ctx, 'type-in-use', { hp: 232, hit: { text: String(used.length), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Type rules: the one sheet in the run with the plate flooded to the foot, so the rules are printed in the key over the brand's own fill,
  // with the pass crossing every one of them. What to do is set large in the brand's body face; what never happens sits beside it.
  // The hit is how many rules there are. A brand whose key does not read on its plate gets a shallow plate and the rules on paper.
  'type-rules'(ctx) {
    const P = pressOf(ctx), B = bookBrand(ctx), R = B.type.rules, n = R.length;
    const flood = P.onPlate === 'key', tc = flood ? 'var(--ptxt)' : 'var(--key)';
    const dst = stem(ctx, 'body', 600), bst = stem(ctx, 'body', 400), top = 320, floor = 1016;
    let sz = null;
    for (const [ds, dl] of [[20, 28], [18, 26], [17, 24], [16, 23], [15, 22]]) {
      const hs = R.map((r) => Math.max(nLines(dst, r.do, ds, 330) * dl, 18 + nLines(bst, r.dont, 14, 224) * 21));
      sz = { ds, dl, hs }; if (hs.reduce((a, b) => a + b, 0) + n * 40 <= floor - top) break;
    }
    const gap = Math.min(64, Math.floor((floor - top - sz.hs.reduce((a, b) => a + b, 0)) / n));
    let y = top, rows = '';
    R.forEach((r, i) => {
      rows += `${hair(y, X0, 578, tc)}<p class="a" style="left:49px;top:${y + 16}px;width:330px;${faceCss(ctx, 'body', 600)};font-size:${sz.ds}px;line-height:${sz.dl}px;color:${tc}">${A(r.do)}</p>
<p class="a c-label" style="left:403px;top:${y + 18}px;color:${tc}">Never</p>
<p class="a" style="left:403px;top:${y + 36}px;width:224px;${faceCss(ctx, 'body', 400)};font-size:14px;line-height:21px;color:${tc}">${A(r.dont)}</p>`;
      y += sz.hs[i] + gap;
    });
    const inner = `${plateLabel('Type rules')}
<p class="a c-body" style="left:403px;top:72px;width:224px;color:var(--ptxt)">Rules for setting ${A(B.name)} type. Each says what to do, and what never happens.</p>${rows}`;
    return sheet(ctx, 'type-rules', { hp: flood ? 1052 : 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },
};
