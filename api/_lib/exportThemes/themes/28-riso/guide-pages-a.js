// Theme 28, Print Shop: the style guide's first four pages: cover, logo, colour and proportion. Each draws from the shared facts (engine/styleguide.js) in the proof-sheet kit (guide-kit.js).
import { PAGE_IDS, hook, inkFor, headLabel } from '../../engine/guide-layout.js';
import { colourFacts, roleLabel, logoFacts, listedTones, stateFacts } from '../../engine/styleguide.js';
import { copyOf } from './guide-copy.js';
import {
  X0, XR, CW, SUBH, NAME, A, r1, pad2, pct, MONO, logoOnPlate, faceCss, stems, nl, clamp, one, mono, at, rect, hr, chip, line, para, sub, safeInk,
  folio, page, coverSheet, flowTry, flow, logoBox, logoFit, coverLogo, isSlot,
} from './guide-kit.js';
import { inkW } from './sheet.js';

const fig = (t) => `<span class="g-s">${A(t)}</span>`;
const cmykText = (k) => { try { const v = Array.isArray(k) ? k : k && typeof k === 'object' ? Object.values(k) : null; return v && v.length ? v.map((n) => Math.round(+n)).join(' ') : ''; } catch { return ''; } };

// ---------------------------------------------------------------- cover
export function cover(ctx) {
  const S = stems(ctx), B = ctx.brand, cs = colourFacts(ctx).slice(0, 6), PH = 640, NW = 400;
  const ids = (ctx._g28ids || PAGE_IDS).filter((id) => id !== 'cover');
  // the mark sits on the left margin, 160 px wide (120 tall at most, so the title under it is never crowded), in solid ink
  const lg = coverLogo(ctx, logoOnPlate(ctx));
  let size = 64; while (size > 34 && nl(S.d, B.name, size, NW, -0.01) > 3) size -= 6;
  const lead = Math.round(size * 1.05), nameText = clamp(S.d, B.name, size, NW, 3, -0.01);
  const ver = `Version ${B.version && B.version.number != null ? B.version.number : '1'}, ${ctx.date || ''}`.replace(/,\s*$/, '');
  const nameY = Math.max(210, 80 + Math.ceil(lg.h) + 40), nameH = nl(S.d, nameText, size, NW, -0.01) * lead;
  const head = line(X0, 36, 'Style guide', 'c-label', 'color:var(--ptxt)')
    + at(X0, 80, lg.html, { style: `width:${r1(lg.w)}px;height:${r1(lg.h)}px` })
    + at(X0, nameY, A(nameText), { w: NW, cls: 'g-ti', style: `${faceCss(ctx, 'display', ctx.weights.heading)};font-size:${size}px;line-height:${lead}px;letter-spacing:-.01em;color:var(--ptxt);overflow-wrap:anywhere` })
    + at(X0, nameY + nameH + 14, A(one(S.b4, ver, 11, NW)), { cls: 'c-value nw', style: 'color:var(--ptxt)' });
  const inks = { h: SUBH + 8 + 64 + 6 + 30 + 14, draw: (y) => {
    const y0 = y + SUBH + 8;
    return sub(S, X0, y, CW, 'Inks', `${cs.length} on this press`)
      + cs.map((c, i) => chip(X0 + i * 118, y0, 105, 64, c.hex) + para(S.b6, X0 + i * 118, y0 + 70, 105, c.name, { size: 11, lh: 14, max: 2, cls: 'c-label' }).html + at(X0 + i * 118, y0 + 70 + 14 * 2 + 2, A(c.hex), { cls: 'g-s' })).join('');
  } };
  const rows = Math.ceil(ids.length / 2), CH = 26;
  const contents = { h: SUBH + 8 + rows * CH, draw: (y) => sub(S, X0, y, 396, 'Contents') + ids.map((id, i) => {
    const col = Math.floor(i / rows), r = i % rows, x = X0 + col * 200, yy = y + SUBH + 8 + r * CH;
    return at(x, yy, A(pad2(i + 2)), { cls: 'g-s', style: 'width:28px' }) + at(x + 34, yy - 1, A(NAME[id]), { cls: 'c-body nw' });
  }).join('') };
  // two or three inks overprinted: where they overlap the colours multiply, as on the press
  const demo = cs.slice(0, 3), dw = 96, dh = 64, step = 52;
  const over = { h: SUBH + 8 + dh + 8 + 17, draw: (y) => {
    const x0 = X0 + 448, y0 = y + SUBH + 8;
    return sub(S, x0, y, XR - x0, 'Overprint')
      + rect(x0, y0, dw + step * (demo.length - 1), dh, 'isolation:isolate', demo.map((c, i) => rect(i * step, 0, dw, dh, `background:${c.hex};mix-blend-mode:multiply`)).join(''))
      + para(S.b4, x0, y0 + dh + 8, XR - x0, 'Where two inks overlap, they multiply.', { size: 12, max: 1 }).html;
  } };
  const lower = { h: Math.max(contents.h, over.h), flex: 40, draw: (y) => contents.draw(y) + over.draw(y) };
  const body = flow('cover', PH + 36, [inks, lower], { gap: 28, maxGap: 60 });
  return coverSheet(ctx, PH, head, body, { x: 470, base: PH - 40, size: 300, maxW: 262 });
}

// ---------------------------------------------------------------- logo
export function logoPage(ctx) {
  const S = stems(ctx), LF = logoFacts(ctx), G = ctx.logo.geos.colour, L = ctx.logo, slot = isSlot(ctx);
  // one tile per ground: two colourways on the same ground would draw the same tile
  const seenGround = new Set(), shown = LF.grounds.filter((g) => { const k = String(g.groundHex).toLowerCase(); if (seenGround.has(k)) return false; seenGround.add(k); return true; }).slice(0, 6);
  if (LF.grounds.length > shown.length) ctx.logoShown = shown.map((g) => ({ key: g.key, label: g.label }));
  const unit = L.geo.unit, mn = L.minSize, g0 = shown[0];
  return page(ctx, 'logo', copyOf('logo', { unit: LF.unitText }), (top) => {
    const make = (o) => {
      // the first ground gets a full-width tile (o.prim tall); the rest sit in two columns, an odd last one across the page
      const tw = (CW - 16) / 2, th = o.th, prim = o.prim && shown.length > 1 ? o.prim : 0, rest = shown.length - (prim ? 1 : 0), rows = Math.ceil(rest / 2), RH = th + 6 + 16 + 12;
      const P = prim ? prim + 6 + 16 + 12 : 0, g0only = shown.length === 1 && o.prim;
      const grounds = { h: SUBH + 8 + (g0only ? o.prim + 22 : P + rows * RH - 12), draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Colourways', `${shown.length} on ${shown.length === 1 ? 'its' : 'their'} ground${shown.length === 1 ? '' : 's'}`) + shown.map((g, i) => {
          const full = g0only || (prim && i === 0), j = prim ? i - 1 : i, last = !full && j === rest - 1 && rest % 2 === 1;
          const w = full || last ? CW : tw, h = full ? (g0only ? o.prim : prim) : th;
          const x = full || last ? X0 : X0 + (j % 2) * (tw + 16), yy = y0 + (full ? 0 : P + Math.floor(j / 2) * RH);
          const lf = logoFit(ctx, full ? 360 : w - 48, h - 32, { colourway: g.key, color: inkFor(ctx, g.groundHex), solid: true });
          return chip(x, yy, w, h, g.groundHex) + at(x + (w - lf.w) / 2, yy + (h - lf.h) / 2, lf.html, { style: `width:${r1(lf.w)}px;height:${r1(lf.h)}px` })
            + at(x, yy + h + 6, A(one(S.b6, g.label, 11, w * 0.6)), { cls: 'c-label nw' })
            + at(x + w - 140, yy + h + 6, A(`${g.groundHex.toUpperCase()}`), { cls: 'g-s', style: 'width:140px;text-align:right' });
        }).join('');
      } };
      let clear = null;
      if (o.clear) {
        const wTry = Math.min(240, Math.floor((o.fig * G.w) / (G.h + 2 * unit))), lb = logoBox(ctx, wTry, { colourway: g0.key, color: inkFor(ctx, g0.groundHex) });
        const u = (lb.w * unit) / G.w, fw = lb.w + 2 * u, fh = lb.h + 2 * u, tx = X0 + fw + 28, tw2 = XR - tx;
        // where the page has no Smallest size section, its rule goes in the third line here
        const room = tw2 >= 160, minLine = `Never under ${mn.screenPx} px wide on screen, or ${mn.printMm} mm wide in print.`;
        const p1 = room ? para(S.b4, tx, 0, tw2, `Keep ${LF.unitText} clear on every side.`, { max: 2 }) : { html: '', h: 0 };
        const p2 = room ? para(S.b4, tx, 0, tw2, `That is ${L.clearShare}% of the logo's height. In this drawing it is ${Math.round(u)} px.`, { size: 12, max: 3 }) : { html: '', h: 0 };
        const p3 = room && !o.min ? para(S.b4, tx, 0, tw2, minLine, { size: 12, max: 2 }) : { html: '', h: 0 };
        clear = { h: SUBH + 8 + Math.max(fh, 60, p1.h + 6 + p2.h + (p3.h ? 6 + p3.h : 0)), draw: (y) => {
          const y0 = y + SUBH + 8;
          const txt = room ? para(S.b4, tx, y0, tw2, `Keep ${LF.unitText} clear on every side.`, { max: 2 }) : { html: '', h: 0 };
          const t2 = room ? para(S.b4, tx, y0 + txt.h + 6, tw2, `That is ${L.clearShare}% of the logo's height. In this drawing it is ${Math.round(u)} px.`, { size: 12, max: 3 }) : { html: '', h: 0 };
          const t3 = p3.h ? para(S.b4, tx, y0 + txt.h + 6 + t2.h + 6, tw2, minLine, { size: 12, max: 2 }) : { html: '' };
          return sub(S, X0, y, CW, 'Clear space')
            + rect(X0, y0, fw, fh, 'border:1px dashed var(--key)', '') + chip(X0 + u, y0 + u, lb.w, lb.h, g0.groundHex)
            + at(X0 + u, y0 + u, lb.html, { style: `width:${r1(lb.w)}px;height:${r1(lb.h)}px` }) + txt.html + t2.html + t3.html;
        } };
      }
      let min = null;
      if (o.min) {
        const lb = logoBox(ctx, Math.min(mn.screenPx, 150), { colourway: g0.key, color: inkFor(ctx, g0.groundHex) }), px = Math.round(lb.w), tx = X0 + 150 + 28;
        min = { h: SUBH + 8 + Math.max(lb.h, 40), draw: (y) => {
          const y0 = y + SUBH + 8;
          return sub(S, X0, y, CW, 'Smallest size') + chip(X0, y0, lb.w, lb.h, g0.groundHex, '', 'box-sizing:content-box')
            + at(X0, y0, lb.html, { style: `width:${r1(lb.w)}px;height:${r1(lb.h)}px` })
            + para(S.b4, tx, y0, XR - tx, `Never under ${mn.screenPx} px wide on screen, or ${mn.printMm} mm wide in print.`, { max: 2 }).html
            + para(S.b4, tx, y0 + 46, XR - tx, px < mn.screenPx ? `Drawn here at ${px} px so it fits the page.` : `Drawn here at ${px} px, its smallest.`, { size: 12, max: 1 }).html;
        } };
      }
      // four ways not to use it: each drawn on the first ground, so the fault is the only difference
      let mis = null;
      if (o.mis) {
        const mw = Math.floor((CW - 3 * 16) / 4), mh = o.mis, lf = logoFit(ctx, Math.min(mw - 56, 84), Math.floor(mh * 0.5), { colourway: g0.key, color: inkFor(ctx, g0.groundHex) });
        const wrong = [
          ['Stretched', 'transform:scaleX(1.55)', null],
          ['Recoloured', 'filter:hue-rotate(150deg) saturate(1.8)', '#D6336C'],
          ['Low contrast', 'opacity:.22', null],
          ['Rotated', 'transform:rotate(-14deg)', null],
        ];
        mis = { h: SUBH + 8 + mh + 6 + 16, draw: (y) => {
          const y0 = y + SUBH + 8;
          return sub(S, X0, y, CW, 'Misuse', 'never do these') + wrong.map(([label, css, tint], i) => {
            const x = X0 + i * (mw + 16), l2 = tint ? logoFit(ctx, Math.min(mw - 56, 84), Math.floor(mh * 0.5), { colourway: g0.key, color: tint }) : lf;
            return chip(x, y0, mw, mh, g0.groundHex, at((mw - l2.w) / 2, (mh - l2.h) / 2, l2.html, { style: `width:${r1(l2.w)}px;height:${r1(l2.h)}px;${css}` }), 'overflow:hidden')
              + at(x, y0 + mh + 6, A(`× ${label}`), { cls: 'c-label nw' });
          }).join('');
        } };
      }
      return [grounds, clear, min, mis];
    };
    return flowTry('logo', top, [{ prim: 200, th: 96, clear: true, min: true, mis: 72, fig: 80 }, { prim: 200, th: 84, clear: true, min: false, mis: 72, fig: 80 }, { prim: 160, th: 84, clear: true, min: true, mis: 64, fig: 80 }, { prim: 140, th: 72, clear: true, min: false, mis: 64, fig: 72 }, { th: 120, clear: true, min: true, fig: 118 },{ th: 96, clear: true, min: true, fig: 110 }, { th: 72, clear: true, min: true, fig: 96 }, { th: 64, clear: true, min: false, fig: 80 }, { th: 56, clear: false, min: false, fig: 60 }], make);
  });
}

// ---------------------------------------------------------------- colour
export function colourPage(ctx) {
  const S = stems(ctx), cs = colourFacts(ctx), SF = stateFacts(ctx), tonesAll = listedTones(ctx), toneMax = 6;
  let shown = [];
  return page(ctx, 'colour', copyOf('colour', { count: cs.length }), (top) => {
    const make = (o) => {
      const RH = o.rowH, tall = RH >= 44;
      const off = tall ? Math.round((RH - 52) / 2) : 0;
      const swatches = { h: SUBH + 30 + cs.length * RH, draw: (y) => {
        const y0 = y + SUBH + 4;
        let html = sub(S, X0, y, CW, 'Inks', `${cs.length} in the palette`);
        html += [['Ink', X0], ['Hex, RGB', 400], ['Share', 520], ['Best text on it', 590]].map(([t, x]) => line(x, y0 + 2, t, 'c-label')).join('');
        cs.forEach((c, i) => {
          const yy = y0 + 30 + i * RH, ink = inkFor(ctx, c.hex, { size: 11, weight: 400 }), best = c.ink;
          html += hr(X0, yy, CW, 'var(--hair)')
            + chip(X0, yy + 3, 110, RH - 6, c.hex, '', 'overflow:hidden')
            + at(X0 + 8, yy + 3 + (RH - 6 - 14) / 2, A(c.hex), { cls: 'g-s', style: `color:${ink}` });
          const rl = roleLabel(ctx, c);
          html += tall
            ? at(172, yy + 6 + off, A(one(S.b6, c.name, 14, 220)), { cls: 'c-body nw', style: 'font-weight:600' }) + at(172, yy + 28 + off, A(one(S.b4, rl, 12, 220)), { cls: 'c-note nw' })
            : at(172, yy + (RH - 21) / 2, A(one(S.b4, `${c.name}, ${rl}`, 14, 220)), { cls: 'c-body nw' });
          html += tall
            ? at(400, yy + 5 + off, A(c.hex), { cls: 'g-m' }) + at(400, yy + 21 + off, A(c.rgb.join(' ')), { cls: 'g-s' }) + (cmykText(c.cmyk) ? at(400, yy + 35 + off, A(`CMYK ${cmykText(c.cmyk)}`), { cls: 'g-s' }) : '')
            : at(400, yy + (RH - 16) / 2, A(c.hex), { cls: 'g-m' });
          html += at(520,yy + (RH - 16) / 2, A(pct(c.share)), { cls: 'g-m' });
          html += tall
            ? chip(590, yy + 8 + off, 14, 14, best.hex) + at(612, yy + 5 + off, A(one(S.b4, best.name, 12, 134)), { cls: 'c-note nw' }) + at(612, yy + 24 + off, A(`${best.ratioText}:1 ${best.grade}`), { cls: 'g-s' })
            : chip(590, yy + (RH - 14) / 2, 14, 14, best.hex) + at(612, yy + (RH - 14) / 2,A(`${best.ratioText}:1 ${best.grade}`), { cls: 'g-s' });
        });
        return html + hr(X0, y0 + 30 + cs.length * RH, CW, 'var(--hair)');
      } };
      const tones = o.tones && tonesAll.length ? tonesAll.slice(0, toneMax) : [];
      shown = tones;
      const toneSec = tones.length ? { h: SUBH + 8 + Math.ceil(tones.length / 3) * 38 - 8, draw: (y) => {
        return sub(S, X0, y, CW, 'Tones', 'in use, not on the list') + tones.map((t, i) => {
          const x = X0 + (i % 3) * 241, yy = y + SUBH + 8 + Math.floor(i / 3) * 38;
          return chip(x, yy, 28, 28, t.hex) + at(x + 38, yy, A(one(S.b6, t.name, 11, 170)), { cls: 'c-label nw' }) + at(x + 38, yy + 14, A(t.hex.toUpperCase()), { cls: 'g-s' });
        }).join('');
      } } : null;
      const SP = o.stateH;
      const states = o.states ? { h: SUBH + 8 + SF.list.length * SP - (SP - 24), draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Button states', 'each label on its fill') + SF.list.map((q, i) => {
          const yy = y0 + i * SP, lab = para(S.b4, 0, 0, 140, `Label ${q.labelName}`, { size: 12, max: SP >= 34 ? 2 : 1 });
          return chip(X0, yy, 70, 24, q.hex) + rect(X0 + 28, yy + 7, 10, 10, `background:${q.label};border:1px solid var(--key)`)
            + at(X0 + 84, yy + 2, A(q.cap), { cls: 'c-label nw' }) + at(X0 + 146, yy + 1, A(one(S.b4, q.name, 14, 230)), { cls: 'c-body nw' })
            + at(X0 + 386, yy + 4, A(q.hex), { cls: 'g-s' }) + para(S.b4, X0 + 462, yy + 12 - lab.h / 2, 140, `Label ${q.labelName}`, { size: 12, max: SP >= 34 ? 2 : 1 }).html
            + at(XR - 90, yy + 4, A(`${q.ratioText}:1 ${q.grade}`), { cls: 'g-s', style: 'width:90px;text-align:right' });
        }).join('');
      } } : null;
      return [swatches, toneSec, states];
    };
    const out = flowTry('colour', top, [{ rowH: 58, tones: true, states: true, stateH: 36 }, { rowH: 52, tones: true, states: true, stateH: 34 }, { rowH: 52, tones: true, states: true, stateH: 30 }, { rowH: 52, tones: false, states: true, stateH: 30 }, { rowH: 40, tones: false, states: true, stateH: 30 }, { rowH: 34, tones: false, states: true, stateH: 30 }, { rowH: 30, tones: false, states: false, stateH: 30 }], make, { gap: 24 });
    // the file lists the tones the page lists, and no others
    if (shown.length !== tonesAll.length) hook(ctx, { tones: shown.map((t) => ({ name: t.name, hex: t.hex.toUpperCase(), use: t.use || t.role })) });
    return out;
  });
}

// ---------------------------------------------------------------- proportion
export function rulerPage(ctx) {
  const S = stems(ctx), cs = colourFacts(ctx), total = cs.reduce((t, c) => t + (+c.share || 0), 0) || 1;
  const share = (c) => (+c.share || 0) / total, maxShare = Math.max(...cs.map(share)) || 1;
  return page(ctx, 'ruler', copyOf('ruler'), (top) => {
    const make = (o) => {
      const BH = o.bh;
      const bar ={ h: SUBH + 8 + BH + 8 + 18, draw: (y) => {
        const y0 = y + SUBH + 8;
        let x = X0, html = sub(S, X0, y, CW, 'The sheet', 'share of the sheet by ink');
        cs.forEach((c, i) => { const w = i === cs.length - 1 ? XR - x : Math.round(share(c) * CW * 10) / 10; html += rect(x, y0, w, BH, `background:${c.hex};border-right:${i === cs.length - 1 ? 0 : 1}px solid var(--key)`); x += w; });
        html += rect(X0, y0, CW, BH, 'border:1px solid var(--key)');
        html += [0, 25, 50, 75, 100].map((p) => { const px = X0 + (CW * p) / 100; return rect(px, y0 + BH, 1, 6, 'background:var(--key)') + (p === 100 ? at(px - 40, y0 + BH + 8, A(`${p}%`), { cls: 'g-s', style: 'width:40px;text-align:right' }) : at(px - 20, y0 + BH + 8, A(`${p}%`), { cls: 'g-s', style: 'width:40px;text-align:center' })); }).join('');
        return html;
      } };
      const RH = o.rowH;
      const legend = { h: SUBH + 8 + cs.length * RH, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Share by ink') + cs.map((c, i) => {
          const yy = y0 + i * RH, bw = Math.max(2, Math.round(share(c) / maxShare * 340));
          return chip(X0, yy + (RH - 18) / 2, 18, 18, c.hex) + at(X0 + 30, yy + (RH - 21) / 2, A(one(S.b4, c.name, 14, 230)), { cls: 'c-body nw' })
            + at(X0 + 272, yy + (RH - 16) / 2, A(pct(share(c))), { cls: 'g-m', style: 'width:60px;text-align:right' })
            + rect(X0 + 352, yy + (RH - o.bar) / 2, bw, o.bar, `background:${c.hex};border:1px solid var(--key)`);
        }).join('');
      } };
      const np = Math.min(o.pairs, cs.length), pairs = cs.slice(0, 4).map((c, i, a) => [c, a[(i + 1) % a.length]]).slice(0, np), pitch = np >= 4 ? 175 : 241, sw = np >= 4 ? 130 : 130, mh = o.mixH;
      const labels = pairs.map(([a, b]) => para(S.b4, 0, 0, pitch - 14, `${a.name} over ${b.name}`, { size: 12, max: o.lines }));
      const mix = o.mix && cs.length > 1 ? { h: SUBH + 8 + mh + 8 + Math.max(...labels.map((l) => l.h)), draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Ink on ink', 'overprinted, they multiply') + pairs.map(([a, b], i) => {
          const x = X0 + i * pitch;
          return rect(x, y0, sw, mh, 'isolation:isolate', rect(0, 0, 80, mh, `background:${a.hex};mix-blend-mode:multiply`) + rect(50, 0, 80, mh, `background:${b.hex};mix-blend-mode:multiply`))
            + para(S.b4, x, y0 + mh + 8, pitch - 14, `${a.name} over ${b.name}`, { size: 12, max: o.lines }).html;
        }).join('');
      } } : null;
      return [bar, legend, mix];
    };
    const R = (bh, rowH, bar, mix, pairs, mixH, lines) => ({ bh, rowH, bar, mix, pairs, mixH, lines });
    return flowTry('ruler', top, [R(112, 40, 20, true, 4, 84, 2), R(100, 36, 18, true, 4, 76, 2), R(84, 30, 14, true, 3, 60, 1), R(84, 24, 14, true, 3, 60, 1), R(84, 22, 14, false, 3, 60, 1)], make, { gap: 28 });
  });
}
