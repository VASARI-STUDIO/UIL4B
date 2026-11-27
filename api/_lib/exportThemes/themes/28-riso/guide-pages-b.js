// Theme 28, Print Shop: the style guide's applied and type pages. Applied shows the brand's own words on a card, a sign, three posts and an email, all in its own palette; type draws the ladder at its true size.
import { inkFor, hook } from '../../engine/guide-layout.js';
import { colourFacts, typeLadder, displayWeightNote, logoFacts } from '../../engine/styleguide.js';
import { copyOf } from './guide-copy.js';
import {
  X0, XR, CW, SUBH, A, r1, faceCss, faceFor, stems, nl, clamp, one, at, rect, hr, chip, para, sub,
  page, flowTry, logoFit, real, realLines,
} from './guide-kit.js';

const faceRole = (f) => (f === 'display' ? 'display' : 'body');

// ---------------------------------------------------------------- applied
export function appliedPage(ctx) {
  const S = stems(ctx), B = ctx.brand, app = B.applications || {}, card = app.card || {}, em = (B.guideB && B.guideB.email) || {};
  const cs = colourFacts(ctx), LF = logoFacts(ctx), g0 = LF.grounds[0], H = ctx.weights.heading;
  // the signage line is "<object>, <size>: <line>"
  const sg = /^(.+?), ([\d.]+ x [\d.]+ mm): (.+)$/.exec(app.signage || '') || [null, String(app.signage || '').split(':')[0], '', String(app.signage || '').split(':').slice(1).join(':').trim()];
  // the brand's own lines; a generic sample only where it has none
  const own = realLines(ctx).filter((l) => l !== B.name), pick = (i, generic) => own[i] || generic;
  const sign = { object: sg[1] || 'Sign', size: sg[2] || '', text: real(sg[3]) || pick(0, B.name) };
  const GEN = ['New this week.', 'Open every day.', 'Thank you for coming.'];
  const posts = (Array.isArray(app.social) ? app.social : []).filter(Boolean).slice(0, 3).map((p, i) => real(p) || pick(i + 1, GEN[i] || GEN[0]));
  const body = real(Array.isArray(em.body) ? em.body.join(' ') : em.body) || `Thanks for getting in touch. Here is how to find us, and what happens next.`;
  const emSubject = real(em.subject) || pick(0, `A note from ${B.name}`);
  const cardPerson = real(card.person), cardRole = real(card.role);
  const dispStyle = (size, lead) => `${faceCss(ctx, 'display', H)};font-size:${size}px;line-height:${lead}px;letter-spacing:-.01em`;
  // a text in the display face, set in a box: the size steps down until it sets in `max` lines
  // (or `maxH` px tall, whichever allows fewer lines); the smallest size takes the text cut short where it still does not set
  const display = (text, w, max, sizes, maxH = Infinity) => {
    const fits = (z) => { const n = nl(S.d, text, z, w, -0.01); return n <= max && n * Math.round(z * 1.12) <= maxH; };
    const s = sizes.find(fits) || sizes[sizes.length - 1], lead = Math.round(s * 1.12), lines = Math.max(1, Math.min(max, Math.floor(maxH / lead)));
    const t = clamp(S.d, text, s, w, lines, -0.01);
    return { t, size: s, lead, h: nl(S.d, t, s, w, -0.01) * lead };
  };
  return page(ctx, 'applied', copyOf('applied'), (top) => {
    const make = (o) => {
      const cH = o.cardH, cW = Math.round(cH * 1.75), pw = CW - cW - 32;
      const ground = g0 ? g0.groundHex : (cs[0] || {}).hex;
      const gInk = inkFor(ctx, ground), lk = g0 ? g0.key : 'colour';
      // row one: the business card at its own proportion, and the sign beside it
      const cardSec = { h: SUBH + 8 + cH, draw: (y) => {
        const y0 = y + SUBH + 8, lg = logoFit(ctx, cW * 0.5, cH * 0.22, { colourway: lk, color: gInk }), tx = X0 + 18, tw = cW - 36;
        const nm = one(S.b6, cardPerson || B.name, 14, tw), rl = one(S.b4, cardRole || '', 12, tw), ct = (Array.isArray(card.contact) ? card.contact : [card.contact]).map(real).filter(Boolean).join('  ');
        const sz = display(sign.text, pw - 36, o.signLines, [36, 32, 28, 24, 20], cH - 36 - 24);
        const ctY = y0 + cH - 16 - 14, rlY = (ct ? ctY - 4 : y0 + cH - 16) - 17, nmY = rlY - 21;
        return sub(S, X0, y, CW, 'Card and sign')
          + chip(X0, y0, cW, cH, ground) + at(tx, y0 + 16, lg.html, { style: `width:${r1(lg.w)}px;height:${r1(lg.h)}px` })
          + at(tx, nmY, A(nm), { cls: 'c-label nw', style: `color:${gInk};font-size:14px;line-height:21px` })
          + at(tx, rlY, A(rl), { cls: 'c-note nw', style: `color:${gInk}` })
          + (ct ? at(tx, ctY, A(one(S.b4, ct, 11, tw)), { cls: 'c-foot nw', style: `color:${gInk}` }) : '')
          + chip(X0 + cW + 32, y0, pw, cH, 'var(--plate)') + at(X0 + cW + 32 + 18, y0 + 18, A(sz.t), { w: pw - 36, cls: 'g-ti', style: `${dispStyle(sz.size, sz.lead)};color:var(--ptxt);overflow-wrap:anywhere` })
          + at(X0 + cW + 32 + 18, y0 + cH - 16 - 14, A(one(S.b4, `${sign.object}${sign.size ? `, ${sign.size}` : ''}`, 11, pw - 36)), { cls: 'c-foot nw', style: 'color:var(--ptxt)' });
      } };
      // row two: three posts, each on one of the brand's colours
      const tH = o.postH, tW = Math.floor((CW - 2 * 24) / 3);
      const postSec = posts.length ? { h: SUBH + 8 + tH + 8 + 15, draw: (y) => {
        const y0 = y + SUBH + 8;
        return sub(S, X0, y, CW, 'Posts', `${posts.length} on the brand's colours`) + posts.map((p, i) => {
          const c = cs[(i + (cs.length > 2 ? 1 : 0)) % cs.length], ink = inkFor(ctx, c.hex), x = X0 + i * (tW + 24);
          const ds = display(p, tW - 32, 6, [26, 22, 20, 18, 16], tH - 18 - 36);
          return chip(x, y0, tW, tH, c.hex) + at(x + 16, y0 + 18, A(ds.t), { w: tW - 32, cls: 'g-ti', style: `${dispStyle(ds.size, ds.lead)};color:${ink};overflow-wrap:anywhere` })
            + at(x + 16, y0 + tH - 14 - 14, A(one(S.b6, B.name, 11, tW - 32)), { cls: 'c-label nw', style: `color:${ink}` })
            + at(x, y0 + tH + 8, A(c.hex), { cls: 'g-s' });
        }).join('');
      } } : null;
      // row three: the email, across the page
      const pad = 20, tw = CW - 2 * pad, subj = display(emSubject, tw, 2, [24, 22, 20]), bp = para(S.b4, 0, 0, tw, body, { max: o.bodyMax });
      const eH = pad + 18 + 12 + subj.h + 10 + bp.h + pad;
      const mailSec = { h: SUBH + 8 + eH, draw: (y) => {
        const y0 = y + SUBH + 8, sender = cardPerson ? `${cardPerson}${cardRole ? `, ${cardRole}` : ''}` : B.name;
        return sub(S, X0, y, CW, 'Email')
          + rect(X0, y0, CW, eH, 'background:var(--paper);border:1px solid var(--key)')
          + at(X0 + pad, y0 + pad, A(one(S.b6, sender, 11, tw - 150)), { cls: 'c-label nw' })
          + (em.time ? at(XR - pad - 140, y0 + pad, A(em.time), { cls: 'g-s', style: 'width:140px;text-align:right' }) : '')
          + hr(X0 + pad, y0 + pad + 18, tw, 'var(--hair)')
          + at(X0 + pad, y0 + pad + 18 + 12, A(subj.t), { w: tw, cls: 'g-ti', style: `${dispStyle(subj.size, subj.lead)};overflow-wrap:anywhere` })
          + para(S.b4, X0 + pad, y0 + pad + 18 + 12 + subj.h + 10, tw, body, { max: o.bodyMax }).html;
      } };
      return [cardSec, postSec, mailSec];
    };
    return flowTry('applied', top, [
      { cardH: 194, postH: 210, bodyMax: 6, signLines: 4 }, { cardH: 170, postH: 180, bodyMax: 5, signLines: 4 }, { cardH: 150, postH: 150, bodyMax: 4, signLines: 3 },
      { cardH: 130, postH: 120, bodyMax: 3, signLines: 3 }, { cardH: 130, postH: 96, bodyMax: 2, signLines: 2 },
    ], make, { gap: 28, maxGap: 56 });
  });
}

// ---------------------------------------------------------------- type
export function typePage(ctx) {
  const S = stems(ctx), B = ctx.brand, ladder = typeLadder(ctx), sample = (B.type && B.type.sample) || {}, H = ctx.weights.heading;
  const dnote = displayWeightNote(ctx), disp = B.fonts.display, bod = B.fonts.body;
  // the brand's own headline and paragraph; a generic specimen only where it has none
  const headText = real(sample.headline) || realLines(ctx)[0] || B.name;
  const paraText = real(sample.paragraph) || 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs, then sphinx of black quartz, judge my vow.';
  let noteShown = false;
  return page(ctx, 'type', copyOf('type'), (top) => {
    const make = (o) => {
      const rows = ladder.map((t) => {
        const role = faceRole(t.face), w = t.face === 'display' ? H : t.weight, st = faceFor(ctx, role, w).stem, tw = 548, text = t.face === 'display' ? headText : paraText;
        const track = 0, max = t.face === 'display' ? 1 : o.bodyLines, tt = clamp(st, text, t.size, tw, max, track), n = Math.max(1, nl(st, tt, t.size, tw, track));
        return { t, role, w, tt, n, h: Math.max(n * t.line, 30) + o.pad * 2 };
      });
      const ladderSec = { h: SUBH + rows.reduce((s, r) => s + r.h, 0) + 1, draw: (y) => {
        let yy = y + SUBH, html = sub(S, X0, y, CW, 'Ladder', `${ladder.length} steps, true size`);
        for (const r of rows) {
          const { t } = r;
          html += hr(X0, yy, CW, 'var(--hair)')
            + at(X0, yy + o.pad, A(one(S.b6, t.name, 11, 128)), { cls: 'c-label nw' })
            + at(X0, yy + o.pad + 16, `${t.size}/${t.line} px, ${r.w}`, { cls: 'g-s' })
            + at(X0 + 150, yy + o.pad, A(r.tt), { w: 548, cls: 'g-t', style: `${faceCss(ctx, r.role, r.w)};font-size:${t.size}px;line-height:${t.line}px;${t.face === 'display' ? 'letter-spacing:0;white-space:nowrap;' : ''}` });
          yy += r.h;
        }
        return html + hr(X0, yy, CW, 'var(--hair)');
      } };
      let faces = null;
      if (o.faces) {
        const cw = 216, fh = 64;
        const np = dnote && !o.setting ? para(S.b4, X0, 0, CW, dnote, { size: 12, max: 2 }) : { h: 0 };
        noteShown = !!dnote;
        faces = { h: SUBH + 8 + fh + 8 + 17 + (np.h ? 8 + np.h : 0), draw: (y) => {
          const y0 = y + SUBH + 8;
          return sub(S, X0, y, CW, 'Faces') + [
            [`${faceCss(ctx, 'display', H)}`, 'Aa', 'Headings', disp.family],
            [`${faceCss(ctx, 'body', 400)}`, 'Aa', 'Body', bod.family],
            ['font-family:var(--cmono);font-weight:400', '12 4.5', 'Values', 'Sono Mono'],
          ].map(([css, sampleText, role, fam], i) => {
            const x = X0 + i * 241;
            return at(x, y0, A(sampleText), { cls: 'g-ti nw', style: `${css};font-size:44px;line-height:64px` })
              + at(x, y0 + fh + 8, A(one(S.b6, `${role}: ${fam}`, 11, cw)), { cls: 'c-label nw' });
          }).join('') + (np.h ? para(S.b4, X0, y0 + fh + 8 + 17 + 8, CW, dnote, { size: 12, max: 2 }).html : '');
        } };
      } else noteShown = false;
      // how the faces are set: the figures in the values face, and a headline on the plate colour
      let setting = null;
      if (o.faces && o.setting) {
        const sh = 84, hw = CW - 241 - 32, hs = clamp(S.d, headText, 28, hw, 2, -0.01), hn = Math.max(1, nl(S.d, hs, 28, hw, -0.01));
        const np = dnote ? para(S.b4, X0, 0, CW, dnote, { size: 12, max: 2 }) : { h: 0 };
        setting = { h: SUBH + 8 + sh + 8 + 17 + (np.h ? 8 + np.h : 0), draw: (y) => {
          const y0 = y + SUBH + 8;
          return sub(S, X0, y, CW, 'Setting')
            + chip(X0, y0, 216, sh, 'var(--paper)') + at(X0 + 16, y0, '0123456789', { cls: 'g-ti nw', style: `font-family:var(--cmono);font-weight:400;font-size:28px;line-height:${sh}px` })
            + at(X0, y0 + sh + 8, 'Figures: Sono Mono', { cls: 'c-label nw' })
            + chip(X0 + 241, y0, CW - 241, sh, 'var(--plate)')
            + at(X0 + 241 + 16, y0 + (sh - hn * 32) / 2, A(hs), { w: hw, cls: 'g-ti', style: `${faceCss(ctx, 'display', H)};font-size:28px;line-height:32px;letter-spacing:-.01em;color:var(--ptxt);overflow-wrap:anywhere` })
            + at(X0 + 241, y0 + sh + 8, 'Headline on the plate colour', { cls: 'c-label nw' })
            + (np.h ? para(S.b4, X0, y0 + sh + 8 + 17 + 8, CW, dnote, { size: 12, max: 2 }).html : '');
        } };
      }
      return [ladderSec, setting, faces];
    };
    const out = flowTry('type', top, [
      { faces: true, setting: true, bodyLines: 3, pad: 10 }, { faces: true, setting: true, bodyLines: 2, pad: 8 }, { faces: true, bodyLines: 3, pad: 10 }, { faces: true, bodyLines: 2, pad: 8 }, { faces: true, bodyLines: 1, pad: 8 }, { faces: false, bodyLines: 2, pad: 8 }, { faces: false, bodyLines: 1, pad: 6 }, { faces: false, bodyLines: 1, pad: 3 },
    ], make, { gap: 28, maxGap: 56 });
    // the file says the weight note only where the page does
    if (dnote && !noteShown) hook(ctx, { displayNote: null });
    return out;
  });
}
