// Theme 28, Print Shop: the style guide's first four pages: cover, logo, colour and proportion. Each draws from the shared facts (engine/styleguide.js) in the proof-sheet kit (guide-kit.js).
import { PAGE_IDS, hook, inkFor, headLabel } from '../../engine/guide-layout.js';
import { colourFacts, roleLabel, logoFacts, listedTones, stateFacts } from '../../engine/styleguide.js';
import { copyOf } from './guide-copy.js';
import {
  X0, XR, CW, SUBH, NAME, A, r1, pad2, pct, MONO, pressOf, logoOnPlate, faceCss, stems, nl, clamp, one, mono, at, rect, hr, chip, line, para, sub, safeInk,
  folio, page, coverSheet, flowTry, flow, logoBox, logoFit, isSlot,
} from './guide-kit.js';
import { inkW } from './sheet.js';

const fig = (t) => `<span class="g-s">${A(t)}</span>`;
const cmykText = (k) => { try { const v = Array.isArray(k) ? k : k && typeof k === 'object' ? Object.values(k) : null; return v && v.length ? v.map((n) => Math.round(+n)).join(' ') : ''; } catch { return ''; } };

// ---------------------------------------------------------------- cover
export function cover(ctx) {
  const P = pressOf(ctx), S = stems(ctx), B = ctx.brand, cs = colourFacts(ctx).slice(0, 6), PH = 640, NW = 400;
  const ids = (ctx._g28ids || PAGE_IDS).filter((id) => id !== 'cover');
  const cw = logoOnPlate(ctx), lg = logoFit(ctx, 260, 90, { colourway: cw, color: P.textOnPlate });
  let size = 64; while (size > 34 && nl(S.d, B.name, size, NW, -0.01) > 3) size -= 6;
  const lead = Math.round(size * 1.05), nameText = clamp(S.d, B.name, size, NW, 3, -0.01);
  const ver = `Version ${B.version && B.version.number != null ? B.version.number : '1'}, ${ctx.date || ''}`.replace(/,\s*$/, '');
  const head = line(X0, 36, 'Style guide', 'c-label', 'color:var(--ptxt)')
    + at(X0, 80, lg.html, { style: `width:${r1(lg.w)}px;height:${r1(lg.h)}px` })
    + at(X0, 210, A(nameText), { w: NW, cls: 'g-ti', style: `${faceCss(ctx, 'display', ctx.weights.heading)};font-size:${size}px;line-height:${lead}px;letter-spacing:-.01em;color:var(--ptxt);overflow-wrap:anywhere` })
    + at(X0, PH - 52, A(one(S.b4, ver, 11, NW)), { cls: 'c-value nw', style: 'color:var(--ptxt)' });
  const inks = { h: SUBH + 8 + 64 + 6 + 30, draw: (y) => {
    const y0 = y + SUBH + 8;
    return sub(S, X0, y, CW, 'Inks', `${cs.length} on this press`)
      + cs.map((c, i) => chip(X0 + i * 118, y0, 105, 64, c.hex) + at(X0 + i * 118, y0 + 70, A(one(S.b6, c.name, 11, 105)), { cls: 'c-label nw' }) + at(X0 + i * 118, y0 + 85, A(c.hex), { cls: 'g-s' })).join('');
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
  const shown = LF.grounds.slice(0, 6);
  if (LF.grounds.length > shown.length) ctx.logoShown = shown.map((g) => ({ key: g.key, label: g.label }));
  const unit = L.geo.unit, mn = L.minSize, g0 = shown[0];
  return page(ctx, 'logo', copyOf('logo', { unit: LF.unitText }), (top) => {
    const make = (o) => {
      const tw = (CW - 16) / 2, th = o.th, rows = Math.ceil(shown.length / 2), RH = th + 6 + 16 + 12;
      const grounds = { h: SUBH + 8 + rows * RH - 12, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Colourways', `${shown.length} on their grounds`) + shown.map((g, i) => {
          const x = X0 + (i % 2) * (tw + 16), yy = y0 + Math.floor(i / 2) * RH, lf = logoFit(ctx, tw - 48, th - 32, { colourway: g.key, color: inkFor(ctx, g.groundHex) });
          return chip(x, yy, tw, th, g.groundHex) + at(x + (tw - lf.w) / 2, yy + (th - lf.h) / 2, lf.html, { style: `width:${r1(lf.w)}px;height:${r1(lf.h)}px` })
            + at(x, yy + th + 6, A(one(S.b6, g.label, 11, tw * 0.6)), { cls: 'c-label nw' })
            + at(x + tw - 140, yy + th + 6, A(`${g.groundHex.toUpperCase()}`), { cls: 'g-s', style: 'width:140px;text-align:right' });
        }).join('');
      } };
      let clear = null;
      if (o.clear) {
        const wTry = Math.min(240, Math.floor((o.fig * G.w) / (G.h + 2 * unit))), lb = logoBox(ctx, wTry, { colourway: g0.key, color: inkFor(ctx, g0.groundHex) });
        const u = (lb.w * unit) / G.w, fw = lb.w + 2 * u, fh = lb.h + 2 * u, tx = X0 + fw + 28, tw2 = XR - tx;
        clear = { h: SUBH + 8 + Math.max(fh, 60), draw: (y) => {
          const y0 = y + SUBH + 8;
          const txt = tw2 >= 160 ? para(S.b4, tx, y0, tw2, `Keep ${LF.unitText} clear on every side.`, { max: 2 }) : { html: '', h: 0 };
          const t2 = tw2 >= 160 ? para(S.b4, tx, y0 + txt.h + 6, tw2, `That is ${L.clearShare}% of the logo's height. In this drawing it is ${Math.round(u)} px.`, { size: 12, max: 3 }) : { html: '' };
          return sub(S, X0, y, CW, 'Clear space')
            + rect(X0, y0, fw, fh, 'border:1px dashed var(--key)', '') + chip(X0 + u, y0 + u, lb.w, lb.h, g0.groundHex)
            + at(X0 + u, y0 + u, lb.html, { style: `width:${r1(lb.w)}px;height:${r1(lb.h)}px` }) + txt.html + t2.html;
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
      return [grounds, clear, min];
    };
    return flowTry('logo', top, [{ th: 120, clear: true, min: true, fig: 118 }, { th: 96, clear: true, min: true, fig: 110 }, { th: 72, clear: true, min: true, fig: 96 }, { th: 64, clear: true, min: false, fig: 80 }, { th: 56, clear: false, min: false, fig: 60 }], make);
  });
}

// ---------------------------------------------------------------- colour
export function colourPage(ctx) {
  const S = stems(ctx), cs = colourFacts(ctx), SF = stateFacts(ctx), tonesAll = listedTones(ctx), toneMax = 6;
  let shown = [];
  return page(ctx, 'colour', copyOf('colour', { count: cs.length }), (top) => {
    const make = (o) => {
      const RH = o.rowH, tall = RH >= 44;
      const swatches = { h: SUBH + 22 + cs.length * RH, draw: (y) => {
        const y0 = y + SUBH + 4;
        let html = sub(S, X0, y, CW, 'Inks', `${cs.length} in the palette`);
        html += [['Ink', X0], ['Hex, RGB', 376], ['Share', 510], ['Best text on it', 596]].map(([t, x]) => line(x, y0 + 12, t, 'c-label')).join('');
        cs.forEach((c, i) => {
          const yy = y0 + 22 + i * RH, ink = inkFor(ctx, c.hex, { size: 11, weight: 400 }), best = c.ink;
          html += hr(X0, yy, CW, 'var(--hair)')
            + chip(X0, yy + 3, 110, RH - 6, c.hex, '', 'overflow:hidden')
            + at(X0 + 8, yy + 3 + (RH - 6 - 14) / 2, A(c.hex), { cls: 'g-s', style: `color:${ink}` });
          const rl = roleLabel(ctx, c);
          html += tall
            ? at(172, yy + 6, A(one(S.b6, c.name, 14, 190)), { cls: 'c-body nw', style: 'font-weight:600' }) + at(172, yy + 28, A(one(S.b4, rl, 12, 190)), { cls: 'c-note nw' })
            : at(172, yy + (RH - 21) / 2, A(one(S.b4, `${c.name}, ${rl}`, 14, 196)), { cls: 'c-body nw' });
          html += tall
            ? at(376, yy + 5, A(c.hex), { cls: 'g-m' }) + at(376, yy + 21, A(c.rgb.join(' ')), { cls: 'g-s' }) + (cmykText(c.cmyk) ? at(376, yy + 35, A(`CMYK ${cmykText(c.cmyk)}`), { cls: 'g-s' }) : '')
            : at(376, yy + (RH - 16) / 2, A(c.hex), { cls: 'g-m' });
          html += at(510, yy + (RH - 16) / 2, A(pct(c.share)), { cls: 'g-m' });
          html += tall
            ? chip(596, yy + 8, 14, 14, best.hex) + at(618, yy + 5, A(one(S.b4, best.name, 12, 126)), { cls: 'c-note nw' }) + at(618, yy + 24, A(`${best.ratioText}:1 ${best.grade}`), { cls: 'g-s' })
            : chip(596, yy + (RH - 14) / 2, 14, 14, best.hex) + at(618, yy + (RH - 14) / 2, A(`${best.ratioText}:1 ${best.grade}`), { cls: 'g-s' });
        });
        return html + hr(X0, y0 + 22 + cs.length * RH, CW, 'var(--hair)');
      } };
      const tones = o.tones && tonesAll.length ? tonesAll.slice(0, toneMax) : [];
      shown = tones;
      const toneSec = tones.length ? { h: SUBH + 8 + Math.ceil(tones.length / 3) * 38 - 8, draw: (y) => {
        return sub(S, X0, y, CW, 'Tones', 'in use, not on the list') + tones.map((t, i) => {
          const x = X0 + (i % 3) * 241, yy = y + SUBH + 8 + Math.floor(i / 3) * 38;
          return chip(x, yy, 28, 28, t.hex) + at(x + 38, yy, A(one(S.b6, t.name, 11, 170)), { cls: 'c-label nw' }) + at(x + 38, yy + 14, A(t.hex.toUpperCase()), { cls: 'g-s' });
        }).join('');
      } } : null;
      const states = o.states ? { h: SUBH + 8 + SF.list.length * 30, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Button states', 'each label on its fill') + SF.list.map((q, i) => {
          const yy = y0 + i * 30;
          return chip(X0, yy, 70, 24, q.hex) + rect(X0 + 28, yy + 7, 10, 10, `background:${q.label};border:1px solid var(--key)`)
            + at(X0 + 84, yy + 2, A(q.cap), { cls: 'c-label nw' }) + at(X0 + 146, yy + 1, A(one(S.b4, q.name, 14, 180)), { cls: 'c-body nw' })
            + at(X0 + 340, yy + 4, A(q.hex), { cls: 'g-s' }) + at(X0 + 410, yy + 3, A(one(S.b4, `Label ${q.labelName}`, 12, 170)), { cls: 'c-note nw' })
            + at(XR - 130, yy + 4, A(`${q.ratioText}:1 ${q.grade}`), { cls: 'g-s', style: 'width:130px;text-align:right' });
        }).join('');
      } } : null;
      return [swatches, toneSec, states];
    };
    const out = flowTry('colour', top, [{ rowH: 52, tones: true, states: true }, { rowH: 52, tones: false, states: true }, { rowH: 40, tones: false, states: true }, { rowH: 34, tones: false, states: true }, { rowH: 30, tones: false, states: false }], make, { gap: 24 });
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
      const BH = 84;
      const bar = { h: SUBH + 8 + BH + 8 + 18, draw: (y) => {
        const y0 = y + SUBH + 8;
        let x = X0, html = sub(S, X0, y, CW, 'The sheet', 'share of the sheet by ink');
        cs.forEach((c, i) => { const w = i === cs.length - 1 ? XR - x : Math.round(share(c) * CW * 10) / 10; html += rect(x, y0, w, BH, `background:${c.hex};border-right:${i === cs.length - 1 ? 0 : 1}px solid var(--key)`); x += w; });
        html += rect(X0, y0, CW, BH, 'border:1px solid var(--key)');
        html += [0, 25, 50, 75, 100].map((p) => { const px = X0 + (CW * p) / 100; return rect(px, y0 + BH, 1, 6, 'background:var(--key)') + at(px - 20, y0 + BH + 8, A(`${p}%`), { cls: 'g-s', style: `width:40px;text-align:center` }); }).join('');
        return html;
      } };
      const RH = o.rowH;
      const legend = { h: SUBH + 8 + cs.length * RH, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Share by ink') + cs.map((c, i) => {
          const yy = y0 + i * RH, bw = Math.max(2, Math.round(share(c) / maxShare * 250));
          return chip(X0, yy + (RH - 18) / 2, 18, 18, c.hex) + at(X0 + 30, yy + (RH - 21) / 2, A(one(S.b4, c.name, 14, 190)), { cls: 'c-body nw' })
            + at(X0 + 232, yy + (RH - 16) / 2, A(pct(share(c))), { cls: 'g-m', style: 'width:60px;text-align:right' })
            + rect(X0 + 312, yy + (RH - 14) / 2, bw, 14, `background:${c.hex};border:1px solid var(--key)`);
        }).join('');
      } };
      const mix = o.mix && cs.length > 1 ? { h: SUBH + 8 + 60 + 8 + 17, draw: (y) => {
        const y0 = y + SUBH + 8, pairs = cs.slice(0, 4).map((c, i, a) => [c, a[(i + 1) % a.length]]).slice(0, Math.min(3, cs.length));
        return sub(S, X0, y, CW, 'Ink on ink', 'overprinted, they multiply') + pairs.map(([a, b], i) => {
          const x = X0 + i * 241;
          return rect(x, y0, 130, 60, 'isolation:isolate', rect(0, 0, 80, 60, `background:${a.hex};mix-blend-mode:multiply`) + rect(50, 0, 80, 60, `background:${b.hex};mix-blend-mode:multiply`))
            + at(x, y0 + 68, A(one(S.b4, `${a.name} over ${b.name}`, 12, 226)), { cls: 'c-note nw' });
        }).join('');
      } } : null;
      return [bar, legend, mix];
    };
    return flowTry('ruler', top, [{ rowH: 30, mix: true }, { rowH: 24, mix: true }, { rowH: 22, mix: false }], make, { gap: 28 });
  });
}
