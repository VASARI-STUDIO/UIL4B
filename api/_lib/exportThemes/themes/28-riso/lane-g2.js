// Lane g2 for theme 28 (Riso): the logo pages (logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// Each page is one sheet off the press, made by sheet(): a plate, a pass and a hit. As in lane g1, the hit numeral is always a real count taken
// from ctx (the inks the logo prints in, its versions, the sides its clear space keeps, the pixels of its smallest width, the grounds it may sit
// on, the misuses shown), and the words beside it say what it counts.
// The logo itself is never misregistered, mottled or overprinted (spec never-do 1): it sits clean on the paper, on a clean chip of its ground,
// or on the plate in the colourway made for the plate. Only the misuse page shows it otherwise, struck through.
import { sheet, A, fitW, wrap, inkW, faceFor, faceCss, pressOf, inkLayers, val, X0 } from './sheet.js';
import { toOklch } from '../../engine/color.js';

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n) => WORDS[n] || String(n);
const Word = (n) => { const w = word(n); return w[0].toUpperCase() + w.slice(1); };
const andList = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`);
const stem = (ctx, role, weight = 400) => faceFor(ctx, role, weight).stem;
const nLines = (st, t, size, w) => wrap(st, String(t || ''), size, w - 12).length;
const fit = (st, texts, sizes, w, maxLines) => sizes.find(([s]) => texts.every((t) => nLines(st, t, s, w) <= maxLines && (maxLines > 1 || inkW(st, String(t || ''), s) <= w - 12))) || sizes[sizes.length - 1];
const plateLabel = (t, x = 403) => `<p class="a c-label" style="left:${x}px;top:48px;color:var(--ptxt)">${t}</p>`;
const plateNote = (t, x, y, w) => `<p class="a c-body" style="left:${x}px;top:${y}px;width:${w}px;color:var(--ptxt)">${t}</p>`;
const hair = (y, x = X0, w = 578) => `<i class="a g2-hr" style="left:${x}px;top:${y}px;width:${w}px"></i>`;
const r1 = (n) => Math.round(n * 10) / 10;
const MM = 96 / 25.4; // css px in a millimetre

// a brand colour's name from its hex (the colourways give hexes); a hex that is no brand colour is shown as the value it is
const hexName = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toUpperCase() === String(hex).toUpperCase()); return c ? A(c.name) : val(String(hex).toUpperCase()); };
// the inks of a colourway: every part colour it names (all keys but the ground), each once, in the colourway's order
const fillsOf = (cw) => [...new Set(Object.entries(cw).filter(([k]) => k !== 'ground').map(([, v]) => String(v).toUpperCase()))];
// "Ink name, Blush plate" or "Ink name and plate": which part of the logo prints in which colour, from the colourway's own role keys
const partsOf = (ctx, cw) => fillsOf(cw).map((h) => `${hexName(ctx, h)} ${andList(Object.entries(cw).filter(([k, v]) => k !== 'ground' && String(v).toUpperCase() === h).map(([k]) => k))}`).join(', ');
// the type colour that reads on a ground: the key if it passes, else the paper; the slot frame takes the same colour
const inkOn = (ctx, ground) => { const P = pressOf(ctx); return ctx.ratio(P.key, ground) >= ctx.ratio(P.paper, ground) ? 'var(--key)' : 'var(--paper)'; };
const near = (ctx, a, b) => ctx.ratio(a, b) < 1.3;
// the logo svg with only the parts printed in one ink kept (a separation); every other part is left unprinted
const separation = (svg, hex) => svg.replace(/fill="([^"]+)"/g, (m, f) => (f.toUpperCase() === hex ? m : 'fill="none"'));

export function css() {
  return `.pg .g2-hr{display:block;height:0;border-top:.5px solid var(--hair)}
.pg .g2-chip{position:absolute;display:flex;align-items:center}
.pg .g2-edge{box-shadow:inset 0 0 0 .5px var(--hair)}
.pg .g2-box{position:absolute;border:.5px dashed var(--key)}
.pg .g2-tick{position:absolute;display:block;background:var(--key)}
.pg .g2-art{position:absolute;display:flex;align-items:center;justify-content:center;overflow:hidden}
.pg .g2-ph{position:absolute;overflow:hidden;background:var(--key)}
.pg .g2-ph img,.pg .g2-ph svg.pl{width:100%;height:100%}
.pg .g2-ph .photo-slot{position:absolute;inset:0;background:var(--key)}
.pg .g2-ph .photo-slot::after{content:'';position:absolute;inset:8px;border:1px dashed var(--paper)}
.pg .g2-ph .photo-slot span{position:absolute;right:16px;bottom:12px;width:224px;font:400 12px/17px var(--chrome);color:var(--paper);text-align:right}
.pg .g2-boxed{border:1px solid var(--key);padding:12px 16px}
.pg .g2-strike{position:absolute;pointer-events:none}
`;
}

// a ruler drawn in the key: one tick every `step` px over `len` px, a long tick every `major` steps
function ruler(x, y, len, step, major) {
  let t = `<i class="g2-tick" style="left:${x}px;top:${y}px;width:${r1(len)}px;height:.5px"></i>`;
  const n = Math.round(len / step);
  for (let i = 0; i <= n; i++) t += `<i class="g2-tick" style="left:${r1(x + Math.min(i * step, len) - 0.25)}px;top:${y}px;width:.5px;height:${i % major === 0 || i === n ? 8 : 4}px"></i>`;
  return t;
}

export const guidelines = {
  // The logo: printed large and clean on the paper, with its idea under it. The hit is the number of inks the full-colour logo prints in, and the
  // foot of the sheet pulls the logo apart into those inks, one separation each, as a press would make its drums.
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways[L.colourwayOf('colour')], inks = fillsOf(cw), n = inks.length;
    const lw = fitW(ctx, 'colour', 578, 280), lh = (lw * L.geos.colour.h) / L.geos.colour.w, ly = 296;
    const logo = `<div class="a" style="left:49px;top:${ly}px;width:${lw}px">${L.html('colour', { width: lw, label: 'Your logo goes here' })}</div>`;
    const dst = stem(ctx, 'display', 500);
    const iy = Math.round(ly + lh + 64);
    const [is, il] = fit(dst, [B.logo.idea], [[30, 38], [28, 36], [26, 34], [24, 32], [22, 30], [20, 28]], 520, 5);
    const ideaH = nLines(dst, B.logo.idea, is, 520) * il;
    // the separations: each ink's parts alone, in that ink, in register with each other, at one size
    const sy = Math.max(iy + ideaH + 64, 812), cwid = Math.floor((578 - (n - 1) * 24) / n);
    // the separations are drawn no taller than the room left above the floor (their two caption lines take 52 px under them)
    const sw = fitW(ctx, 'colour', Math.min(cwid, 224), Math.max(32, Math.min(96, 1048 - 52 - (sy + 32)))), sh = (sw * L.geos.colour.h) / L.geos.colour.w;
    const full = L.svg('colour', { width: sw });
    const seps = inks.map((h, i) => {
      const x = 49 + i * (cwid + 24);
      const art = ctx.edition === 'slot' ? L.html('colour', { width: sw, label: 'Logo' }) : separation(full, h);
      return `<div class="a" style="left:${x}px;top:${sy + 32}px;width:${sw}px">${art}</div>
<p class="a c-note" style="left:${x}px;top:${Math.round(sy + 32 + sh + 16)}px;font-weight:600">Ink ${i + 1}: ${hexName(ctx, h)}</p>
<p class="a c-value" style="left:${x}px;top:${Math.round(sy + 32 + sh + 34)}px">${A(h)}</p>`;
    }).join('');
    const inner = `${plateLabel('Logo')}
${plateNote(`${Word(n)} ink${n === 1 ? '' : 's'} print the full-colour logo: ${andList(inks.map((h) => hexName(ctx, h)))}.`, 403, 72, 224)}
${logo}
<p class="a" style="left:49px;top:${iy}px;width:520px;${faceCss(ctx, 'display', 500)};font-size:${is}px;line-height:${il}px;letter-spacing:-.01em">${A(B.logo.idea)}</p>
${hair(sy)}<p class="a c-label" style="left:49px;top:${sy + 12}px">How it prints, one ink at a time</p>${seps}`;
    return sheet(ctx, 'logo', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Logo versions: the run of versions, one to a line. A version whose ground is the paper prints straight on the stock; every other version
  // sits on a clean chip of its own ground. Each line says which colour prints which part, and when to use it, in the brand's words.
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, P = pressOf(ctx), ids = L.versions, n = ids.length, bst = stem(ctx, 'body', 400);
    const top = 264, floor = 1040, firstH = 144, gap = 12;
    const rowH = Math.floor((floor - top - firstH - gap * (n - 1)) / Math.max(1, n - 1));
    let y = top, rows = '';
    ids.forEach((id, i) => {
      const cw = B.logo.colourways[L.colourwayOf(id)], h = i === 0 ? firstH : rowH, onPaper = cw.ground.toUpperCase() === P.paper.toUpperCase();
      const cwid = i === 0 ? 330 : 224, ch = h - 16;
      const lw = fitW(ctx, id, cwid - (onPaper ? 0 : 48), ch - (onPaper ? 4 : 20));
      const art = L.html(id, { width: lw, label: 'Logo', color: inkOn(ctx, cw.ground) });
      const chip = onPaper
        ? `<div class="a" style="left:49px;top:${y + 12 + Math.round((ch - (lw * L.geos[id].h) / L.geos[id].w) / 2)}px;width:${lw}px">${art}</div>`
        : `<div class="g2-chip${near(ctx, cw.ground, P.paper) ? ' g2-edge' : ''}" style="left:49px;top:${y + 12}px;width:${cwid}px;height:${ch}px;padding-left:24px;background:${cw.ground};color:${inkOn(ctx, cw.ground)}"><div style="width:${lw}px">${art}</div></div>`;
      const tx = i === 0 ? 403 : 285, tw = i === 0 ? 224 : 342;
      rows += `${hair(y)}${chip}
<p class="a nw" style="left:${tx}px;top:${y + 12}px;${faceCss(ctx, 'display', 500)};font-size:20px;line-height:26px">${A(L.labels[id])}</p>
<p class="a c-note" style="left:${tx}px;top:${y + 40}px;width:${tw}px">${A((B.logo.when || {})[id] || '')}</p>
<p class="a c-label" style="left:${tx}px;top:${y + 40 + nLines(bst, (B.logo.when || {})[id] || '', 12, tw) * 17 + 6}px;width:${tw}px">${partsOf(ctx, cw)}, on ${hexName(ctx, cw.ground)}.</p>`;
      y += h + gap;
    });
    const inner = `${plateLabel('Logo versions')}
${plateNote(`${Word(n)} versions, no more. Start with ${A(L.labels[ids[0]].toLowerCase())}, and reach for another only when the ground or the space asks for it.`, 403, 72, 224)}${rows}`;
    return sheet(ctx, 'logo-versions', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 } }, inner);
  },

  // Clear space: the plate is cut back around the logo by x on every side, so the clear zone is a window of bare paper in the ink. The logo
  // sits in the window in register; x is marked on each side. The hit is the four sides the zone keeps. Under the plate, x at the sizes that matter.
  'clear-space'(ctx) {
    const L = ctx.logo, g = L.geos.colour, k = L.geo.unit / L.geo.width, m = L.minSize;
    // the largest logo whose zone fits 578 x 300 px
    const lw = Math.floor(Math.min(578 / (1 + 2 * k), 300 / (g.h / g.w + 2 * k))), lh = (lw * g.h) / g.w, X = lw * k;
    const zw = lw + 2 * X, zh = lh + 2 * X, zx = 49, zy = 96;
    const lx = zx + X, ly = zy + X;
    // a dimension mark: a hairline across the margin with a tick at each end, and x beside it
    const dimV = (cx, y0) => `<i class="g2-tick" style="left:${r1(cx)}px;top:${r1(y0)}px;width:.5px;height:${r1(X)}px"></i><i class="g2-tick" style="left:${r1(cx - 4)}px;top:${r1(y0)}px;width:8px;height:.5px"></i><i class="g2-tick" style="left:${r1(cx - 4)}px;top:${r1(y0 + X - 0.5)}px;width:8px;height:.5px"></i><p class="a c-label" style="left:${r1(cx + 8)}px;top:${r1(y0 + X / 2 - 7)}px">x</p>`;
    const dimH = (x0, cy) => `<i class="g2-tick" style="left:${r1(x0)}px;top:${r1(cy)}px;width:${r1(X)}px;height:.5px"></i><i class="g2-tick" style="left:${r1(x0)}px;top:${r1(cy - 4)}px;width:.5px;height:8px"></i><i class="g2-tick" style="left:${r1(x0 + X - 0.5)}px;top:${r1(cy - 4)}px;width:.5px;height:8px"></i><p class="a c-label" style="left:${r1(x0 + X / 2 - 3)}px;top:${r1(cy + 6)}px">x</p>`;
    const win = `<div class="a fib" style="left:${zx}px;top:${zy}px;width:${r1(zw)}px;height:${r1(zh)}px;background:var(--paper)"></div>
<i class="g2-box" style="left:${r1(lx)}px;top:${r1(ly)}px;width:${r1(lw)}px;height:${r1(lh)}px"></i>
<div class="a" style="left:${r1(lx)}px;top:${r1(ly)}px;width:${lw}px">${L.html('colour', { width: lw, label: 'Your logo goes here' })}</div>
${dimV(zx + zw / 2, zy)}${dimV(zx + zw / 2, ly + lh)}${dimH(zx, zy + zh / 2)}${dimH(lx + lw, zy + zh / 2)}`;
    const zb = Math.round(zy + zh), base = zb + 200, hp = base + 40;
    const sizes = [['The smallest on screen', m.screenPx, 'px'], ['The smallest in print', m.printMm, 'mm'], ['As drawn on this sheet', lw, 'px']];
    let y = hp + 48, tbl = `<p class="a c-label" style="left:49px;top:${y - 24}px">x at the sizes that matter</p>`;
    for (const [t, w, u] of sizes) {
      tbl += `${hair(y)}<p class="a c-note" style="left:49px;top:${y + 10}px">${t}</p><p class="a c-note" style="left:403px;top:${y + 10}px">${val(`${w} ${u}`)} wide, x is ${val(`${r1(w * k)} ${u}`)}</p>`;
      y += 40;
    }
    tbl += hair(y);
    const inner = `${plateLabel('Clear space', 49)}${win}
${plateNote(`${Word(4)} sides, each kept clear by x. x is ${val(L.clearShare + '%')} of the logo's height, measured from its edge.`, 285, zb + 48, 342)}
${tbl}
<p class="a c-body" style="left:49px;top:${y + 32}px;width:578px">Nothing enters the zone: no type, no edges, no other logos. Where the plate meets the logo, it stops x short of it, as it does here.</p>`;
    return sheet(ctx, 'clear-space', { hp, hit: { text: '4', x: 49, base, size: 200, maxW: 200 } }, inner);
  },

  // Minimum size: the hit is the logo's smallest width on screen, in pixels. On the paper the logo steps down to that floor at true size, once in
  // pixels and once in millimetres, with a ruler under the smallest.
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, g = L.geos.colour, asp = g.h / g.w;
    const ladder = (y, unit, floorV, toPx, step, major) => {
      const steps = [2, 1.5, 1].map((f) => floorV * f);
      const ws = steps.map(toPx), h = ws[0] * asp;
      let x = 49, out = '';
      steps.forEach((v, i) => {
        const w = ws[i], top = y + h - w * asp;
        out += `<div class="a" style="left:${r1(x)}px;top:${r1(top)}px;width:${r1(w)}px">${L.html('colour', { width: r1(w), label: 'Logo' })}</div>
<p class="a c-value nw" style="left:${r1(x)}px;top:${r1(y + h + 24)}px">${r1(v)} ${unit}${i === 2 ? ', the floor' : ''}</p>`;
        if (i === 2) out += ruler(x, y + h + 10, w, step, major);
        x += w + 40;
      });
      return { html: out, h: h + 40 };
    };
    const yS = 472, S = ladder(yS, 'px', m.screenPx, (v) => v, 8, 4);
    const yP = Math.round(yS + S.h + 96), Pr = ladder(yP, 'mm', m.printMm, (v) => v * MM, MM, 5);
    const yN = Math.round(yP + Pr.h + 48);
    const inner = `${plateLabel('Minimum size')}
${plateNote(`Pixels wide: the smallest the logo appears on a screen. In print it never goes under ${val(m.printMm + ' mm')}.`, 403, 72, 224)}
<p class="a c-label" style="left:49px;top:${yS - 32}px">On screen, ${val(m.screenPx + ' × ' + m.screenH + ' px')} at the smallest</p>${S.html}
${hair(yP - 48)}<p class="a c-label" style="left:49px;top:${yP - 32}px">In print, ${val(m.printMm + ' × ' + m.printH + ' mm')} at the smallest</p>${Pr.html}
<p class="a c-note" style="left:49px;top:${yN}px;width:430px">Drawn at true size: one px to the pixel on screen, and true millimetres when this sheet prints at 100%. Larger is always fine.</p>`;
    return sheet(ctx, 'min-size', { hp: 400, hit: { text: String(m.screenPx), x: 49, base: 352, size: 300, maxW: 330 } }, inner);
  },

  // The logo on its grounds. The plate is one of them, so the logo is shown on the sheet's own plate in the colourway made for it; the paper is
  // another, so the full-colour logo prints on the stock. Every other ground is a clean band, and the last band is a photograph. The hit is the
  // number of brand colours the logo may sit on.
  'logo-grounds'(ctx) {
    const L = ctx.logo, B = ctx.brand, P = pressOf(ctx), cws = B.logo.colourways;
    const base4 = ['colour', 'reversed', 'mono-dark', 'mono-light'];
    const order = ['colour', 'reversed', ...Object.keys(cws).filter((k) => !base4.includes(k)), 'mono-dark', 'mono-light'].filter((k) => cws[k]);
    const grounds = [];
    for (const k of order) { const gh = cws[k].ground.toUpperCase(); if (!grounds.some((x) => x.hex === gh)) grounds.push({ hex: gh, key: k }); }
    const n = grounds.length;
    const onPlate = grounds.find((x) => x.hex === P.plate.toUpperCase()), onPaper = grounds.find((x) => x.hex === P.paper.toUpperCase());
    const rest = grounds.filter((x) => x !== onPlate && x !== onPaper);
    const cap = (x, y, gr, colr, w = 224) => `<p class="a c-label" style="left:${x}px;top:${y}px;color:${colr}">On ${hexName(ctx, gr.hex)}</p>
<p class="a c-note" style="left:${x}px;top:${y + 18}px;width:${w}px;color:${colr}">${partsOf(ctx, cws[gr.key])}.</p>`;
    let plateArt = '';
    if (onPlate) {
      const lw = fitW(ctx, 'colour', 300, 150), lh = (lw * L.geos.colour.h) / L.geos.colour.w;
      plateArt = `<div class="a" style="left:49px;top:112px;width:${lw}px">${L.html('colour', { width: lw, colourway: onPlate.key, color: 'var(--ptxt)', label: 'Your logo goes here' })}</div>
${cap(49, Math.round(112 + lh + 32), onPlate, 'var(--ptxt)')}`;
    }
    const hp = 400;
    let y = hp + 32, body = '';
    if (onPaper) {
      const lw = fitW(ctx, 'colour', 330, 110), lh = (lw * L.geos.colour.h) / L.geos.colour.w;
      body += `<div class="a" style="left:49px;top:${y + 8}px;width:${lw}px">${L.html('colour', { width: lw, colourway: onPaper.key, label: 'Your logo goes here' })}</div>
${cap(403, y + 8, onPaper, 'var(--key)')}`;
      y += Math.max(Math.round(lh), 48) + 48;
    }
    // the bands: the other grounds, then the photograph (taller), sharing what is left above the floor
    const photoH = 200, gapB = 8, bandH = Math.min(120, Math.floor((1040 - 56 - y - photoH - gapB * rest.length) / Math.max(1, rest.length)));
    for (const gr of rest) {
      const ink = inkOn(ctx, gr.hex), lw = fitW(ctx, 'colour', 260, bandH - 40), lh = (lw * L.geos.colour.h) / L.geos.colour.w;
      body += `<div class="a${near(ctx, gr.hex, P.paper) ? ' g2-edge' : ''}" style="left:49px;top:${y}px;width:578px;height:${bandH}px;background:${gr.hex}">
<div class="a" style="left:24px;top:${Math.round((bandH - lh) / 2)}px;width:${lw}px">${L.html('colour', { width: lw, colourway: gr.key, color: ink, label: 'Logo' })}</div>
${cap(354, 20, gr, ink)}</div>`;
      y += bandH + gapB;
    }
    // the photograph: mono light wants a quiet, dark part of a picture, so a real photo whose description says it was shot in low light comes
    // first (the alt text is only read to choose, never printed), then the first real photo, then the first art-directed slot
    const real = B.imagery.shots.filter((s) => s.photo);
    const shot = real.find((s) => /\b(evening|night|dusk|dark|low light|shade|shadow)/i.test(s.alt || '')) || real[0] || B.imagery.shots[0];
    // the lockup sits low on the right, over the plain road, not across the busy building and trees at the top (the brand's own imagery rule)
    const lw = fitW(ctx, 'mono-light', 220, 80);
    body += `<div class="g2-ph" style="left:49px;top:${y}px;width:578px;height:${photoH}px">${ctx.photo(shot.id, { pos: '50% 50%' })}
<div class="a" style="${shot.photo ? 'right:24px;bottom:24px' : 'left:24px;top:24px'};width:${lw}px">${L.html('mono-light', { width: lw, color: 'var(--paper)', label: 'Logo' })}</div></div>
<p class="a c-label" style="left:49px;top:${y + photoH + 12}px">On a photograph, ${A(L.labels['mono-light'].toLowerCase())}</p>
<p class="a c-note" style="left:285px;top:${y + photoH + 12}px;width:342px">${A((B.logo.when || {})['mono-light'] || '')}</p>`;
    const inner = `${plateLabel('Logo on its grounds')}
${plateNote(`Brand colours the logo may sit on, each in its own colourway. Anywhere else, it goes on a photograph in ${A(L.labels['mono-light'].toLowerCase())}.`, 403, 72, 224)}${plateArt}${body}`;
    return sheet(ctx, 'logo-grounds', { hp, hit: { text: String(n), x: 403, base: 352, size: 240, maxW: 224 } }, inner);
  },

  // Misuse: six spoils pulled from the run and struck through in the hit ink, as a printer marks a sheet that must not go out. Two columns of
  // three, each with what went wrong and what to do instead.
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, P = pressOf(ctx), cws = B.logo.colourways, slot = ctx.edition === 'slot';
    const aw = 272, ah = 150, w = fitW(ctx, 'colour', 176, 92), wh = (w * L.geos.colour.h) / L.geos.colour.w;
    // the wrong ink: a brand colour no colourway prints the whole logo in, that shows on the paper (2 : 1 or more), the one with the most chroma.
    // A real brand colour, so the example is the mistake people make (the logo all in the accent), not a colour from nowhere.
    const whole = new Set(Object.values(cws).map((c) => fillsOf(c)).filter((f) => f.length === 1).map((f) => f[0]));
    const pool = ctx.colours.filter((c) => !whole.has(c.hex.toUpperCase()) && c.hex.toUpperCase() !== P.paper.toUpperCase());
    const wrong = pool.filter((c) => ctx.ratio(c.hex, P.paper) >= 2).sort((a, b) => toOklch(b.hex).C - toOklch(a.hex).C)[0]
      || pool.sort((a, b) => ctx.ratio(b.hex, P.paper) - ctx.ratio(a.hex, P.paper))[0] || { name: 'its accent', hex: P.plate };
    const plain = (fill) => L.forMisuse(w, fill ? { fill } : {});
    // the busy ground: a scrap of the press itself, the plate's edge and the pass crossing under the logo (the inks multiply into the paper)
    const busy = inkLayers(ctx, 'logo-misuse:busy', { w: aw, h: ah, plate: { x: 0, y: 0, w: aw, h: Math.round(ah / 2) }, pass: { x: 168, y: -8, w: 56, h: ah + 16 }, hit: null }).html;
    const doubled = slot
      ? `<div style="position:relative;width:${w}px;height:${r1(wh)}px"><div style="position:absolute;left:4px;top:3px">${L.html('colour', { width: w, label: '' })}</div><div style="position:absolute;left:0;top:0">${plain()}</div></div>`
      : `<div style="position:relative;width:${w}px;height:${r1(wh)}px"><div style="position:absolute;left:4px;top:3px;mix-blend-mode:multiply">${L.svg('colour', { width: w, fill: P.plate })}</div><div style="position:absolute;left:0;top:0;mix-blend-mode:multiply">${plain()}</div></div>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly, by its corner.', `<div style="transform:scale(1.4,.66)">${plain()}</div>`],
      // in the slot edition the frame takes the wrong ink with no label, since a label in a light ink would not read
      ['Recoloured', `Never print it in an ink that isn't its own, even ${A(wrong.name)}. Use a colourway from the versions page.`, slot ? L.html('colour', { width: w, color: wrong.hex, label: '' }) : plain(wrong.hex)],
      ['Rotated', 'Never tilt or turn it. It sits square to the sheet.', `<div style="transform:rotate(-12deg)">${plain()}</div>`],
      ['Effects', 'No shadows, no glows and no doubled or misregistered prints. It prints once, in register.', doubled],
      ['Busy ground', 'Never across two inks or the edge of the plate. It sits on one flat ground.', null],
      ['Outlined or boxed', 'No outlines, no boxes and no frames around it.', `<div class="g2-boxed">${L.forMisuse(w - 40)}</div>`],
    ];
    const top = 264, rowH = Math.floor((1040 - top) / 3);
    let html = '', tab = '';
    items.forEach(([t, capT, art], i) => {
      const col = i % 2, row = Math.floor(i / 2), x = col ? 345 : 49, y = top + row * rowH, cw = col ? 282 : 272;
      const ay = y + 16;
      if (art === null) {
        // the press scrap goes under the content (it is ink, so it multiplies into the paper like the plate does)
        tab += `<div style="position:absolute;left:${x}px;top:${ay}px;width:${aw}px;height:${ah}px;overflow:hidden">${busy}</div>`;
        html += `<div class="a" style="left:${r1(x + 32)}px;top:${r1(ay + ah / 2 - wh / 2)}px;width:${w}px">${plain()}</div>`;
      } else html += `<div class="g2-art" style="left:${x}px;top:${ay}px;width:${aw}px;height:${ah}px">${art}</div>`;
      html += `<svg class="g2-strike" style="left:${x}px;top:${ay}px" width="${aw}" height="${ah}" viewBox="0 0 ${aw} ${ah}" aria-hidden="true"><path d="M8 ${ah - 8}L${aw - 8} 8" stroke="var(--hit)" stroke-width="2" fill="none"/></svg>`;
      html += `${hair(y, x, cw)}<p class="a nw" style="left:${x}px;top:${ay + ah + 12}px;${faceCss(ctx, 'display', 500)};font-size:20px;line-height:26px">${t}</p>
<p class="a c-note" style="left:${x}px;top:${ay + ah + 42}px;width:${cw}px">${capT}</p>`;
    });
    const n = items.length;
    const inner = `${plateLabel('Misuse')}
${plateNote(`${Word(n)} ways the logo goes wrong. Use the supplied files as they are, and none of these.`, 403, 72, 224)}${html}`;
    return sheet(ctx, 'logo-misuse', { hp: 232, hit: { text: String(n), x: 49, base: 200, size: 200, maxW: 300 }, tab }, inner);
  },
};
