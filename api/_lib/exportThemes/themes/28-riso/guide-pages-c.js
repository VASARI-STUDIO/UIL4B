// Theme 28, Print Shop: the style guide's contrast, tokens and usage pages, drawn from the shared facts (engine/styleguide.js) in the proof-sheet kit.
import { contrastFacts, tokenGroups, usageFacts, GRADE_NOTE } from '../../engine/styleguide.js';
import { copyOf } from './guide-copy.js';
import { X0, XR, CW, SUBH, A, r1, faceCss, faceFor, stems, one, at, rect, hr, chip, para, sub, safeInk, page, flowTry } from './guide-kit.js';
import { inkW } from './sheet.js';

const faceRole = (f) => (f === 'display' ? 'display' : 'body');

// ---------------------------------------------------------------- contrast
export function contrastPage(ctx) {
  const S = stems(ctx), ct = contrastFacts(ctx), seen = new Set();
  const failing = (ctx.unusedPairs || []).filter((p) => { const k = [p.fgHex, p.bgHex].map((x) => x.toLowerCase()).sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
  return page(ctx, 'contrast', copyOf('contrast'), (top) => {
    const make = (o) => {
      const RH = o.rowH;
      const rows = { h: SUBH + 6 + ct.pairs.length * RH, draw: (y) => {
        const y0 = y + SUBH + 6;
        return sub(S, X0, y, CW, 'Pairs in use', `${ct.pairs.length} pairs carry text`) + ct.pairs.map((p, i) => {
          const yy = y0 + i * RH, sz = Math.min(28, p.minSize || (p.large || p.ratio < 4.5 ? 24 : 16));
          return hr(X0, yy, CW, 'var(--hair)')
            + chip(X0, yy + 3, 72, RH - 6, p.bgHex, '', `color:${p.fgHex};${faceCss(ctx, faceRole(p.sample.face), p.sample.weight)};font-size:${sz}px;line-height:${RH - 8}px;text-align:center;overflow:hidden`).replace('></div>', `>Aa</div>`)
            + at(X0 + 88, yy + (RH - 21) / 2, A(one(S.b4, p.label, 14, 250)), { cls: 'c-body nw' })
            + at(X0 + 354, yy + (RH - 17) / 2, A(one(S.b4, p.use, 12, 220)), { cls: 'c-note nw' })
            + at(XR - 130, yy + (RH - 16) / 2, A(`${p.ratioText}:1`), { cls: 'g-m', style: 'width:60px;text-align:right' })
            + at(XR - 62, yy + (RH - 14) / 2, A(p.grade), { cls: 'c-label nw' });
        }).join('') + hr(X0, y0 + ct.pairs.length * RH, CW, 'var(--hair)');
      } };
      const n = Math.min(failing.length, o.fail), per = 6, tw = Math.floor((CW - (per - 1) * 12) / per);
      const fail = n ? { h: SUBH + 8 + Math.ceil(n / per) * 52 - 8, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Pairs that fail', `${failing.length} never carry text`) + failing.slice(0, n).map((p, i) => {
          const x = X0 + (i % per) * (tw + 12), yy = y0 + Math.floor(i / per) * 52, r = ctx.ratio(p.fgHex, p.bgHex);
          return rect(x, yy, tw, 28, 'border:1px solid var(--key);overflow:hidden', rect(0, 0, tw / 2, 28, `background:${p.fgHex}`) + rect(tw / 2, 0, tw / 2, 28, `background:${p.bgHex}`)) + at(x, yy + 32, `${ctx.fmt(r)}:1`, { cls: 'g-s' });
        }).join('');
      } } : null;
      const note = { h: para(S.b4, 0, 0, CW, GRADE_NOTE, { size: 12, max: 3 }).h, draw: (y) => para(S.b4, X0, y, CW, GRADE_NOTE, { size: 12, max: 3 }).html };
      return [rows, fail, note];
    };
    return flowTry('contrast', top, [{ rowH: 40, fail: 12 }, { rowH: 34, fail: 12 }, { rowH: 30, fail: 6 }, { rowH: 26, fail: 0 }, { rowH: 24, fail: 0 }], make, { gap: 24, maxGap: 48 });
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
      const rd = tg.radii, rw = Math.min(110, Math.floor((CW - 12 * (rd.length - 1)) / Math.max(1, rd.length))), sz = Math.min(64, rw);
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
    return flowTry('tokens', top, [{ rowH: 30, borders: true }, { rowH: 26, borders: true }, { rowH: 22, borders: true }, { rowH: 20, borders: false }], make, { gap: 28, maxGap: 56 });
  });
}

// ---------------------------------------------------------------- usage
export function usagePage(ctx) {
  const S = stems(ctx), U = usageFacts(ctx), L = ctx.roles.light, b = U.button, c = U.card, k = U.link;
  const tstem = (t) => faceFor(ctx, faceRole(t.face), t.weight).stem;
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
      const pad = c.pad.px, cw = 360, tw = cw - 2 * pad, ink = safeInk(ctx, c.fill, L.text);
      const tt = one(tstem(c.title), c.titleText || '', c.title.size, tw), bp = para(tstem(c.body), 0, 0, tw, c.bodyText || '', { size: c.body.size, lh: c.body.line, max: o.bodyMax });
      const ch = pad * 2 + c.title.line + 8 + bp.h;
      const cardSec = { h: SUBH + 8 + ch, draw: (y) => {
        const y0 = y + SUBH + 8, f = (t) => `${faceCss(ctx, faceRole(t.face), t.weight)};font-size:${t.size}px;line-height:${t.line}px`;
        return sub(S, X0, y, CW, 'Card')
          + rect(X0, y0, cw, ch, `background:${c.fill};border:${(c.edge || {}).px || 1}px solid ${c.edgeColour};border-radius:${c.radius.px}px;box-sizing:border-box`)
          + at(X0 + pad, y0 + pad, A(tt), { cls: 'nw', style: `${f(c.title)};color:${ink}` })
          + para(tstem(c.body), X0 + pad, y0 + pad + c.title.line + 8, tw, c.bodyText || '', { size: c.body.size, lh: c.body.line, max: o.bodyMax, style: `${f(c.body)};color:${ink}` }).html
          + at(X0 + cw + 24, y0, A(one(S.b4, `${c.fillName} fill, ${c.radius.token} ${c.radius.px} px`, 12, CW - cw - 24)), { cls: 'c-note nw' })
          + at(X0 + cw + 24, y0 + 22, A(one(S.b4, `${(c.edge || {}).token || 'edge'} ${(c.edge || {}).px || 1} px, ${c.edgeName}`, 12, CW - cw - 24)), { cls: 'c-note nw' })
          + at(X0 + cw + 24, y0 + 44, A(one(S.b4, `padding ${c.pad.token} ${pad} px`, 12, CW - cw - 24)), { cls: 'c-note nw' });
      } };
      const linkSec = { h: SUBH + 8 + k.type.line + 6, draw: (y) => {
        const y0 = y + SUBH + 8, lw = Math.ceil(inkW(tstem(k.type), k.text, k.type.size));
        return sub(S, X0, y, CW, 'Link')
          + at(X0, y0, A(k.text), { cls: 'nw', style: `${faceCss(ctx, faceRole(k.type.face), k.type.weight)};font-size:${k.type.size}px;line-height:${k.type.line}px;color:${safeInk(ctx, L.surface || '#ffffff', L.text)}` })
          + rect(X0, y0 + k.type.line, lw, Math.max(1, (k.border || {}).px || 1), `background:${safeInk(ctx, L.surface || '#ffffff', L.text)}`);
      } };
      return [buttons, cardSec, linkSec];
    };
    return flowTry('usage', top, [{ bodyMax: 6 }, { bodyMax: 4 }, { bodyMax: 2 }], make, { gap: 32, maxGap: 64 });
  });
}
