// Theme 28, Print Shop: the style guide's contrast, tokens and usage pages, drawn from the shared facts (engine/styleguide.js) in the proof-sheet kit.
import { contrastFacts, tokenGroups, usageFacts, stateFacts, typeLadder, GRADE_NOTE } from '../../engine/styleguide.js';
import { copyOf } from './guide-copy.js';
import { X0, XR, CW, SUBH, A, r1, faceCss, faceFor, stems, one, at, rect, hr, chip, para, sub, safeInk, page, flowTry, real, realLines } from './guide-kit.js';
import { inkW } from './sheet.js';

const faceRole = (f) => (f === 'display' ? 'display' : 'body');

// ---------------------------------------------------------------- contrast
export function contrastPage(ctx) {
  const S = stems(ctx), ct = contrastFacts(ctx), seen = new Set(), ladderMin = Math.min(...typeLadder(ctx).map((t) => t.size));
  const failing = (ctx.unusedPairs || []).filter((p) => { const k = [p.fgHex, p.bgHex].map((x) => x.toLowerCase()).sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
  return page(ctx, 'contrast', copyOf('contrast'), (top) => {
    const make = (o) => {
      const RH = o.rowH, cw = o.chip, lx = X0 + cw + 16, lw = o.labelW, ux = lx + lw + 14, uw = XR - 130 - 14 - ux;
      const rows = { h: SUBH + 6 + ct.pairs.length * RH, draw: (y) => {
        const y0 = y + SUBH + 6;
        return sub(S, X0, y, CW, 'Pairs in use', `${ct.pairs.length} pairs carry text`) + ct.pairs.map((p, i) => {
          const yy = y0 + i * RH, sz = Math.min(o.aa, p.minSize || (p.large || p.ratio < 4.5 ? 24 : 16));
          const lab = para(S.b4, lx, 0, lw, p.label, { max: o.lines }), use = para(S.b4, ux, 0, uw, p.use, { size: 12, max: o.lines });
          return hr(X0, yy, CW, 'var(--hair)')
            + chip(X0, yy + 3, cw, RH - 6, p.bgHex, '', `color:${p.fgHex};${faceCss(ctx, faceRole(p.sample.face), p.sample.weight)};font-size:${sz}px;line-height:${RH - 8}px;text-align:center;overflow:hidden`).replace('></div>', `>Aa</div>`)
            + para(S.b4, lx, yy + (RH - lab.h) / 2, lw, p.label, { max: o.lines }).html
            + para(S.b4, ux, yy + (RH - use.h) / 2, uw, p.use, { size: 12, max: o.lines }).html
            + at(XR - 130, yy + (RH - 16) / 2, A(`${p.ratioText}:1`), { cls: 'g-m', style: 'width:60px;text-align:right' })
            + at(XR - 62, yy + (RH - 14) / 2, A(p.grade), { cls: 'c-label nw' });
        }).join('') + hr(X0, y0 + ct.pairs.length * RH, CW, 'var(--hair)');
      } };
      const n = Math.min(failing.length, o.fail), per = 6, tw = Math.floor((CW - (per - 1) * 12) / per), th = o.tile, pitch = th + 24;
      const fail = n ? { h: SUBH + 8 + Math.ceil(n / per) * pitch - 8, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Pairs that fail', `${failing.length} never carry text`) + failing.slice(0, n).map((p, i) => {
          const x = X0 + (i % per) * (tw + 12), yy = y0 + Math.floor(i / per) * pitch, r = ctx.ratio(p.fgHex, p.bgHex);
          return rect(x, yy, tw, th, 'border:1px solid var(--key);overflow:hidden', rect(0, 0, tw / 2, th, `background:${p.fgHex}`) + rect(tw / 2, 0, tw / 2, th, `background:${p.bgHex}`)) + at(x, yy + th + 4, `${ctx.fmt(r)}:1`, { cls: 'g-s' });
        }).join('');
      } } : null;
      // the smallest a pair is set: the pair's own minimum, else 24 px where it is under 4.5:1 (large text only), else the smallest step of the ladder
      const mins = ct.pairs.map((p) => p.minSize || (p.ratio >= 4.5 ? ladderMin : 24)), lo = Math.min(...mins), hi = Math.max(...mins), p0 = ct.pairs.find((p) => (p.minSize || ladderMin) === hi) || ct.pairs[0];
      const sentence = lo === hi ? `No pair carries text smaller than ${lo} px.` : `Text goes down to ${lo} px; the pairs under 4.5:1 carry nothing smaller than ${hi} px.`;
      const sizes = [...new Set([lo, 16, 24, 32].filter((s) => s >= lo))].slice(0, 4);
      const minSec = o.min && p0 ? { h: SUBH + 8 + 24 + 8 + 44, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Minimum text size', 'the smallest size each pair carries')
          + para(S.b4, X0, y0, CW, sentence, { max: 1 }).html
          + sizes.map((s, i) => chip(X0 + i * 124, y0 + 32, 112, 44, p0.bgHex, `Aa ${s}`, `color:${p0.fgHex};${faceCss(ctx, faceRole(p0.sample.face), p0.sample.weight)};font-size:${s}px;line-height:42px;padding-left:10px;box-sizing:border-box;overflow:hidden;white-space:nowrap`)).join('');
      } } : null;
      const note = { h: para(S.b4, 0, 0, CW, GRADE_NOTE, { size: 12, max: 3 }).h, draw: (y) => para(S.b4, X0, y, CW, GRADE_NOTE, { size: 12, max: 3 }).html };
      return [rows, minSec, fail, note];
    };
    const O = (rowH, aa, chipW, labelW, lines, tile, fail, min) => ({ rowH, aa, chip: chipW, labelW, lines, tile, fail, min });
    return flowTry('contrast', top, [O(76, 44, 104, 290, 2, 56, 12, true), O(60, 40, 96, 290, 2, 44, 12, true), O(54, 40, 88, 290, 2, 44, 12, true), O(48, 32, 80, 290, 2, 36, 12, true), O(44, 28, 72, 270, 2, 32, 12, false), O(40, 28, 72, 250, 1, 28, 12, false), O(34, 28, 72, 250, 1, 28, 12, false), O(30, 28, 72, 250, 1, 28, 6, false), O(26, 24, 72, 250, 1, 28, 0, false), O(24, 24, 72, 250, 1, 28, 0, false)], make, { gap: 24, maxGap: 56 });
  });
}

// ---------------------------------------------------------------- tokens
export function tokensPage(ctx) {
  const S = stems(ctx), tg = tokenGroups(ctx);
  return page(ctx, 'tokens', copyOf('tokens'), (top) => {
    const make = (o) => {
      const sp = tg.space, mx = Math.max(1, ...sp.map((s) => s.px)), RH = o.rowH;
      const space = { h: SUBH + 6 + sp.length * RH, draw: (y) => {
        const y0 = y + SUBH + 6;
        return sub(S, X0, y, CW, 'Spacing', `${sp.length} steps`) + sp.map((s, i) => {
          const yy = y0 + i * RH;
          return at(X0, yy + (RH - 16) / 2, A(s.token), { cls: 'g-m' }) + at(X0 + 150, yy + (RH - 16) / 2, `${s.px} px`, { cls: 'g-m', style: 'width:56px;text-align:right' })
            + rect(X0 + 224, yy + (RH - 12) / 2, Math.max(2, Math.round((s.px / mx) * 250)), 12, 'background:var(--plate);border:1px solid var(--key)')
            + at(X0 + 500, yy + (RH - 17) / 2, A(one(S.b4, s.use || '', 12, 198)), { cls: 'c-note nw' });
        }).join('');
      } };
      const rd = tg.radii, rw = Math.min(110, Math.floor((CW - 12 * (rd.length - 1)) / Math.max(1, rd.length))), sz = Math.min(o.sw, rw);
      const radii = rd.length ? { h: SUBH + 8 + sz + 8 + 34, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Corners') + rd.map((r, i) => {
          const x = X0 + i * (rw + 12), px = r.px >= 9999 ? sz / 2 : Math.min(r.px, sz / 2);
          return rect(x, y0, sz, sz, `border:2px solid var(--key);border-radius:${px}px;background:var(--paper)`)
            + at(x, y0 + sz + 8, A(r.px >= 9999 ? 'full' : `${r.px} px`), { cls: 'g-m' }) + at(x, y0 + sz + 24, A(one(S.b4, r.tokens.join(', '), 11, rw + 8)), { cls: 'c-foot nw' });
        }).join('');
      } } : null;
      const bd = tg.borders;
      const borders = bd.length && o.borders ? { h: SUBH + 6 + bd.length * 28, draw: (y) => {
        const y0 = y + SUBH + 6;
        return sub(S, X0, y, CW, 'Edges') + bd.map((b, i) => {
          const yy = y0 + i * 28;
          return rect(X0, yy + 12, 120, Math.max(1, b.px), 'background:var(--key)') + at(X0 + 140, yy + 6, `${b.px} px`, { cls: 'g-m', style: 'width:56px' }) + at(X0 + 210, yy + 5, A(one(S.b4, b.tokens.join(', '), 12, 480)), { cls: 'c-note nw' });
        }).join('');
      } } : null;
      return [space, radii, borders];
    };
    return flowTry('tokens', top, [{ rowH: 36, sw: 88, borders: true }, { rowH: 34, sw: 88, borders: true }, { rowH: 30, sw: 64, borders: true }, { rowH: 26, sw: 64, borders: true }, { rowH: 22, sw: 64, borders: true }, { rowH: 20, sw: 64, borders: false }], make, { gap: 28, maxGap: 56 });
  });
}

// ---------------------------------------------------------------- usage
export function usagePage(ctx) {
  const S = stems(ctx), U = usageFacts(ctx), L = ctx.roles.light, b = U.button, c = U.card, k = U.link;
  const tstem = (t) => faceFor(ctx, faceRole(t.face), t.weight).stem;
  const SF = stateFacts(ctx), name = ctx.brand.name;
  // the brand's own sample title and paragraph; a stand-in line from the skeleton is never printed
  const cardTitle = real(c.titleText) || realLines(ctx)[0], cardBody = real(c.bodyText) || `${name} sets every card the same way: a title, a short paragraph and room around both. The fill, the edge and the corner come from the tokens on the page before, so no card is drawn by eye.`;
  const linkText = k.text.length < 6 ? 'Read the style guide' : k.text;
  return page(ctx, 'usage', copyOf('usage'), (top) => {
    const make = (o) => {
      const bh = b.padY.px * 2 + b.type.line, bw = (s) => Math.ceil(inkW(tstem(b.type), s, b.type.size)) + 2 * b.padX.px;
      const bcss = `${faceCss(ctx, faceRole(b.type.face), b.type.weight)};font-size:${b.type.size}px;line-height:${b.type.line}px;white-space:nowrap;text-align:center;border-radius:${b.radius.px}px;`;
      const prim = safeInk(ctx, b.fill, b.label, { size: b.type.size, weight: b.type.weight }), sec = safeInk(ctx, ctx.roles.light.surface || '#ffffff', b.ink);
      const buttons = { h: SUBH + 8 + bh, draw: (y) => {
        const y0 = y + SUBH + 8, w1 = bw(b.primary), w2 = bw(b.secondary), edge = Math.max(1, (b.border || {}).px || 1);
        return sub(S, X0, y, CW, 'Button')
          + rect(X0, y0, w1, bh, `${bcss}background:${b.fill};color:${prim};padding-top:${b.padY.px}px;box-sizing:border-box;${b.edge ? `border:${edge}px solid ${b.edge};` : ''}`, A(b.primary))
          + rect(X0 + w1 + 16, y0, w2, bh, `${bcss}background:transparent;color:${sec};padding-top:${b.padY.px}px;box-sizing:border-box;border:${edge}px solid ${b.borderColour};`, A(b.secondary))
          + at(X0 + w1 + w2 + 48, y0 + (bh - 17) / 2, A(one(S.b4, `${b.type.name} ${b.type.size}/${b.type.line} px, ${b.radius.token} ${b.radius.px} px`, 12, XR - X0 - w1 - w2 - 48)), { cls: 'c-note nw' });
      } };
      // the button's states: hover, pressed and disabled from the state facts, and the focus ring (a 2 px gap of the surface, then 2 px of the focus colour)
      const sw = Math.max(bw(b.primary), 110), sp = sw + 32, ringW = ((ctx.borders.find((q) => q.token === 'border-focus') || {}).px) || 2;
      const items = [...SF.list.map((s) => ({ cap: s.cap, fill: s.hex, ink: s.label, sub: `${s.hex}  ${s.ratioText}:1` })), { cap: 'Focus', fill: b.fill, ink: prim, ring: L.focus, sub: `${ringW} px ${String(L.focus).toUpperCase()}` }];
      const states = o.states ? { h: SUBH + 8 + bh + 12 + 34, draw: (y) => {
        const y0 = y + SUBH + 8, edge = Math.max(1, (b.border || {}).px || 1);
        return sub(S, X0, y, CW, 'States', 'the same button, one change each') + items.map((s, i) => {
          const x = X0 + i * sp;
          return rect(x, y0, sw, bh, `${bcss}background:${s.fill};color:${s.ink};padding-top:${b.padY.px}px;box-sizing:border-box;${b.edge && !s.ring ? `border:${edge}px solid ${b.edge};` : ''}${s.ring ? `box-shadow:0 0 0 2px var(--paper),0 0 0 ${2 + ringW}px ${s.ring};` : ''}`, A(b.primary))
            + at(x, y0 + bh + 12, A(s.cap), { cls: 'c-label nw' }) + at(x, y0 + bh + 28, A(s.sub), { cls: 'g-s' });
        }).join('');
      } } : null;
      const full = o.full, pad = c.pad.px, cw = full ? CW : 360, tw = cw - 2 * pad, ink = safeInk(ctx, c.fill, L.text);
      const tt = one(tstem(c.title), cardTitle, c.title.size, tw), bp = para(tstem(c.body), 0, 0, tw, cardBody, { size: c.body.size, lh: c.body.line, max: o.bodyMax });
      const ch = pad * 2 + c.title.line + 8 + bp.h;
      const cardSpec = [`${c.fillName} fill, ${c.radius.token} ${c.radius.px} px`, `${(c.edge || {}).token || 'edge'} ${(c.edge || {}).px || 1} px, ${c.edgeName}`, `padding ${c.pad.token} ${pad} px`];
      const cardSec = { h: SUBH + 8 + ch + (full ? 12 + 17 : 0), draw: (y) => {
        const y0 = y + SUBH + 8, f = (t) => `${faceCss(ctx, faceRole(t.face), t.weight)};font-size:${t.size}px;line-height:${t.line}px`, cx = [0, 232, 520], cwid = [216, 272, 178];
        return sub(S, X0, y, CW, 'Card')
          + rect(X0, y0, cw, ch, `background:${c.fill};border:${(c.edge || {}).px || 1}px solid ${c.edgeColour};border-radius:${c.radius.px}px;box-sizing:border-box`)
          + at(X0 + pad, y0 + pad, A(tt), { cls: 'nw', style: `${f(c.title)};color:${ink}` })
          + para(tstem(c.body), X0 + pad, y0 + pad + c.title.line + 8, tw, cardBody, { size: c.body.size, lh: c.body.line, max: o.bodyMax, style: `${f(c.body)};color:${ink}` }).html
          + cardSpec.map((t, i) => (full ? at(X0 + cx[i], y0 + ch + 12, A(one(S.b4, t, 12, cwid[i])),{ cls: 'c-note nw' }) : at(X0 + cw + 24, y0 + i * 22, A(one(S.b4, t, 12, CW - cw - 24)), { cls: 'c-note nw' }))).join('');
      } };
      const lt = k.type, lh = lt.line, lcol = safeInk(ctx, L.surface || '#ffffff', L.text), vcol = safeInk(ctx, L.surface || '#ffffff', L.quiet || L.text), lw = Math.ceil(inkW(tstem(lt), linkText, lt.size)), ledge = Math.max(1, (k.border || {}).px || 1);
      const lf = `${faceCss(ctx, faceRole(lt.face), lt.weight)};font-size:${lt.size}px;line-height:${lh}px`;
      const linkSec = { h: o.linkStates ? SUBH + 8 + lh + 6 + 12 + 34 : SUBH + 8 + lh + 6, draw: (y) => {
        const y0 = y + SUBH + 8, lp = lw + 56, one1 = (i, col, edge, bg, cap, sub2) => {
          const x = X0 + i * lp;
          return (bg ? rect(x - 6, y0 - 2, lw + 12, lh + 6 + edge, `background:${bg}`) : '') + at(x, y0, A(linkText), { cls: 'nw', style: `${lf};color:${col}` }) + rect(x, y0 + lh, lw, edge, `background:${col}`)
            + (cap ? at(x, y0 + lh + 18, A(cap), { cls: 'c-label nw' }) + at(x, y0 + lh + 34, A(sub2), { cls: 'g-s' }) : '');
        };
        return sub(S, X0, y, CW, 'Link', o.linkStates ? 'underlined in every state' : '')
          + (o.linkStates ? one1(0, lcol, ledge, '', 'Default', `${lcol.toUpperCase()}, ${ledge} px rule`) + one1(1, vcol, ledge, '', 'Visited', `${vcol.toUpperCase()}, ${ledge} px rule`) + one1(2, lcol, ledge + 1, L.sunken || '', 'Hover', `${ledge + 1} px rule${L.sunken ? ', sunken fill' : ''}`) : one1(0, lcol, ledge, '', '', ''));
      } };
      return [buttons, states, cardSec, linkSec];
    };
    return flowTry('usage', top, [{ states: true, full: true, bodyMax: 6, linkStates: true }, { states: true, full: true, bodyMax: 4, linkStates: true }, { states: true, full: false, bodyMax: 4, linkStates: true }, { states: false, full: false, bodyMax: 6, linkStates: false }, { states: false, full: false, bodyMax: 4, linkStates: false }, { states: false, full: false, bodyMax: 2, linkStates: false }], make, { gap: 32, maxGap: 64 });
  });
}
