// Theme 29, Drawing Sheet: the style guide's applied and type pages, and the button kit the applied email and the usage page share.
import { typeLadder, usageFacts } from '../../engine/styleguide.js';
import { esc as A } from '../../engine/brand.js';
import { copyOf, copyRaw } from './guide-copy.js';
import { X0, XR, CW, SUBH, CH, cap1, numberWord, weightName, listAnd, tw, nLines, stemOf, para, kit, art as logoArt, at, rect, hr, obj, sec, register, shell, title, flow, dimH, sum } from './guide-kit.js';

// the button as the engine reports it, its label set in the scale's own Label step
const buttonOf = (ctx) => { const bt = usageFacts(ctx).button, lab = typeLadder(ctx).find((t) => t.token === 'label'); return lab && bt.type.token !== 'control' ? { ...bt, type: { ...bt.type, ...lab } } : bt; };
// the brand's primary button: its measured size and the style that draws it (the usage page and the order email share it)
export function buttonKit(ctx, K) {
  const bt = buttonOf(ctx), d = ctx.brand.fonts.display;
  const fam = (tk) => (tk.face === 'display' ? 'var(--display)' : 'var(--body)');
  const font = (tk) => `font:${tk.weight} ${tk.size}px/${tk.line}px ${fam(tk)};${tk.face === 'display' ? `font-stretch:${d.stretch || 100}%;` : ''}`;
  const V = copyRaw(ctx, 'verbs', {}), vPrimary = V.primary || bt.primary;
  const padY = bt.padY.px, padX = bt.padX.px, bh = padY * 2 + bt.type.line;
  const btnW = (s) => Math.ceil(tw(stemOf(ctx, bt.type.face, bt.type.weight), s, bt.type.size) * (bt.type.face === 'display' ? K.st : 1)) + 2 * padX;
  const w1 = btnW(vPrimary), bstyle = `display:flex;align-items:center;justify-content:center;height:${bh}px;box-sizing:border-box;border-radius:${bt.radius.px}px;${font(bt.type)}white-space:nowrap`;
  return { bt, font, vPrimary, bh, btnW, w1, bstyle };
}

// ---------------------------------------------------------------- applied
export function appliedPage(ctx) {
  const K = kit(ctx), { R, S } = K, B = ctx.brand, G = ctx.logo.geos.colour, app = B.applications || {}, st = K.st, svg = [];
  const t = title(ctx, K, 'applied', copyOf(ctx, 'applied', ['The brand in use, on its own surfaces.', 'The brand in use.']));
  const m = /^(.+?), ([\d.]+) x ([\d.]+) mm: (.+)$/.exec(app.signage || '');
  const sg = m ? { name: m[1], mm: `${m[2]} x ${m[3]} mm`, w: +m[2], h: +m[3], line: m[4] } : { name: 'Sign', mm: '', w: 594, h: 841, line: app.signage || B.lines.primary };
  const OH = 320, sw = Math.max(120, Math.min(250, Math.round((OH * sg.w) / sg.h))), cdW = 256, cdH = 168;
  const so = { x: X0, w: sw }, co = { x: X0 + sw + 24, w: cdW }, sx = co.x + cdW + 24, soW = XR - sx;
  // under each object: its width in mm, measured, then its name and size
  const card0 = app.card || {}, DIM = 28;
  const caps = [{ name: sg.name, detail: sg.mm, w: sw, mm: sg.w }, { name: 'Business card', detail: '85 x 54 mm', w: cdW, mm: 85 }];
  const capH = Math.max(...caps.map((c) => 20 + (c.detail ? para(c.detail, c.w, { size: 12, lh: 16 }).h : 0)));
  const sInk = R.onColour(R.action, 13, 500), swCw = R.colourwayOn(R.action), lw0 = Math.min(sw - 32, 110), lh0 = ctx.edition === 'slot' ? 44 : (lw0 * G.h) / G.w;
  const sRoom = OH - 32 - lh0 - 16;
  const sSize = [26, 22, 18, 16, 14].find((s) => nLines(S.disp, sg.line, s, sw - 32, st) * Math.round(s * 1.15) <= sRoom) || 14;
  const sign = (y0, oh) => obj(K, so.x, y0, sw, oh, R.action, at(16, 16, logoArt(ctx, 'colour', Math.min(sw - 32, lw0), { colourway: swCw, color: sInk, h: ctx.edition === 'slot' ? lh0 : undefined })) + at(16, 16 + lh0 + 16, A(sg.line), { w: sw - 32, cls: 'ga-d', style: `font-size:${sSize}px;line-height:${Math.round(sSize * 1.15)}px;color:${sInk}` }), { style: 'overflow:hidden' });
  const cLw = Math.min(cdW - 32, 96), cInk = R.onColour(R.ground, 13, 500);
  const bizcard = (y0) => obj(K, co.x, y0, cdW, cdH, R.ground,
    at(16, 16, logoArt(ctx, 'colour', cLw, { h: ctx.edition === 'slot' ? 40 : undefined })) + at(16, cdH - 16 - 54, `<div class="ga-body" style="font-weight:500;color:${cInk}">${A(card0.person || '')}</div><div class="ga-r" style="color:${cInk}">${A(card0.role || '')}</div><div class="ga-m" style="color:${cInk}">${A(card0.contact || '')}</div>`, { w: cdW - 32 }), { frame: true, style: 'overflow:hidden' });
  const social = (ctx.edition === 'slot' ? ['Post 1, image and caption', 'Post 2, image and caption', 'Post 3, image and caption'] : (app.social || [])).slice(0, 3), sRows = social.map((s) => Math.max(24, para(s, soW - 72).h + 8)), sH = 1 + sum(sRows);
  const rowSec = { h: SUBH + 8 + OH + DIM + capH, flex: 80, draw: (y, extra = 0) => {
    const oh = OH + extra, y0 = y + SUBH + 8, cy = y0 + oh - cdH;
    caps.forEach((c, i) => svg.push(dimH({ x1: i ? co.x : so.x, x2: (i ? co.x : so.x) + c.w, y: y0 + oh + 16, label: `${c.mm} mm`, obj: y0 + oh })));
    return sec(K, X0, y, CW, '01', 'Sign, card and social', 'each drawn to its own scale')
      + sign(y0, oh) + bizcard(cy)
      + [so, co].map((o, i) => at(o.x, y0 + oh + DIM,`<div class="ga-h">${A(caps[i].name)}</div>${caps[i].detail ? `<div class="ga-r ga-q">${A(caps[i].detail)}</div>` : ''}`, { w: o.w })).join('')
      + (social.length && sH <= OH ? register(K, sx, y0, soW, social.map((s, i) => [i ? '' : 'Social', `<div class="ga-n">${A(s)}</div>`, sRows[i]]), { kw: 64 }) : '');
  } };
  // the order email, across the sheet
  const em = (B.guideB && B.guideB.email) || {}, emBody = (Array.isArray(em.body) ? em.body.reduce((s, p) => (s && /,$/.test(s) ? s + ' ' + p.charAt(0).toLowerCase() + p.slice(1) : s ? s + ' ' + p : p), '') : em.body) || '', pad = 24, tW = CW - 2 * pad;
  const subject = em.subject || '', subjLines = nLines(S.disp, subject, 22, tW, st), bp = para(emBody, tW, { stem: S.body });
  const BK = buttonKit(ctx, K);
  const EH = pad + 20 + 14 + subjLines * 26 + 12 + bp.h + 20 + BK.bh + pad;
  const emSec = { h: SUBH + 8 + EH, flex: 40, draw: (y, extra = 0) => {
    const ey = y + SUBH + 8, ink = R.onColour(R.ground, 13, 500), by = pad + 34 + subjLines * 26 + 12 + bp.h + 20;
    return sec(K, X0, y, CW, '02', 'Order email')
      + obj(K, X0, ey, CW, EH + extra, R.ground, at(pad, pad, `<span class="ga-h">${A(em.to ? `To ${em.to}` : (card0.person || ''))}</span>`, { w: tW - 280, style: `color:${ink}` })
        + at(CW - pad - 260, pad, A(em.time || ''), { w: 260, cls: 'ga-m', style: `text-align:right;color:${ink}` })
        + at(pad, pad + 34, A(subject), { w: tW, cls: 'ga-d', style: `font-size:22px;line-height:26px;color:${ink}` })
        + at(pad, pad + 34 + subjLines * 26 + 12, A(emBody), { w: tW, cls: 'ga-body', style: `color:${ink}` })
        + rect(pad, by, BK.w1, BK.bh, `background:${BK.bt.fill};color:${BK.bt.label};${BK.bstyle}`, A(BK.vPrimary)), { frame: true });
  } };
  const body = flow('applied', t.top, [rowSec, emSec], { gap: 24, maxGap: 60 });
  return shell(ctx, 'applied', t.html + body, svg.join(''));
}

// ---------------------------------------------------------------- type
export function typePage(ctx) {
  const K = kit(ctx), { R } = K, B = ctx.brand, LAD = typeLadder(ctx), d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono;
  const fams = [...new Set([d.family, b.family])];
  const t = title(ctx, K, 'type', copyOf(ctx, 'type', [`${cap1(numberWord(LAD.length))} steps, set in ${listAnd(fams)}.`, 'The scale, step by step.']));
  const sp = copyRaw(ctx, 'typeSpecimens', {}), lines0 = [B.lines.primary, ...(B.lines.others || [])].filter(Boolean);
  const specimen = (s) => {
    if (ctx.edition === 'slot') return s.face === 'display' ? 'Aa Bb Cc 123' : 'A line of text set in this step.';
    const own = (sp[s.token] || [])[0] || (s.token === 'display' && sp.display && sp.display[0]);
    return own || (s.face === 'display' ? lines0[0] : (lines0.find((l) => l.length > 18) || lines0[0] || s.name));
  };
  // faces: plates (the display face, the text face, the mono face when there is one)
  const plates = [[d.family, weightName(ctx.weights.heading), 'display'], [b.family, `${weightName(ctx.weights.regular)} and ${weightName(ctx.weights.medium)}`, 'body']];
  if (mo) plates.push([mo.family, weightName(400), 'mono']);
  const pw = Math.floor((CW - 12 * (plates.length - 1)) / plates.length), PH = 96;
  const facesSec = { h: SUBH + 8 + PH, flex: 60, draw: (y, extra = 0) => sec(K, X0, y, CW, '01', 'Faces') + plates.map(([fam, wt, role], i) => {
    const x = X0 + i * (pw + 12), w = role === 'display' ? ctx.weights.heading : 400, fam2 = role === 'display' ? 'var(--display)' : role === 'mono' ? 'var(--bmono)' : 'var(--body)';
    return obj(K, x, y + SUBH + 8, pw, PH + extra, R.ground, at(16, 10 + Math.floor(extra / 2), `<span style="font-family:${fam2};font-weight:${w};font-size:40px;line-height:44px">Aa</span>`, { cls: 'ga-nw' })
      + at(16, 60 + extra, `<div class="ga-h ga-e" style="width:${pw - 32}px">${A(fam)}</div><div class="ga-r ga-q ga-e" style="width:${pw - 32}px">${A(wt)}</div>`), { frame: true });
  }).join('') };
  // the ladder: each step at its own size (a display step over 56 px is shown at 56 and says so), its name and numbers in the first column, a hairline between steps
  const CAP = 56, LW = 168, SX = X0 + LW + 16, SW = XR - SX;
  // a step is never shown larger than the one above it was, and a long specimen that would shrink the step a long way is swapped for a short one
  let prev = null;
  const rowsD = LAD.map((s) => {
    const stem = stemOf(ctx, s.face, s.weight), mult = s.face === 'display' ? K.st : 1, want = Math.min(s.size, CAP);
    const fit = (w, from) => { let z = from; while (z > 14 && tw(stem, w, z) * mult * 1.2 > SW) z -= 2; return z; };
    let word = specimen(s), sz = want;
    if (prev && prev.shrunk && s.size < prev.s.size) sz = Math.min(sz, Math.floor((prev.sz * 0.8) / 2) * 2);
    sz = fit(word, sz);
    if (sz < want * 0.7 && s.face === 'display') { word = 'Aa Bb Cc 123'; sz = fit(word, want); }
    const lh = Math.max(Math.round((s.line / s.size) * sz), Math.ceil(sz * 1.2), 20);
    return (prev = { s, sz, lh, word, h: Math.max(lh, 34) + 16, shrunk: sz < s.size });
  });
  const lH = sum(rowsD.map((r) => r.h)) + 1;
  const ladSec = { h: SUBH + 8 + lH, flex: 44 * rowsD.length, draw: (y, extra = 0) => {
    const add = Math.floor(extra / rowsD.length);
    let yy = y + SUBH + 8;
    const out = sec(K, X0, y, CW, '02', 'Scale', `${LAD.length} steps`) + rowsD.map((r) => {
      const { s } = r, fam = s.face === 'display' ? 'var(--display)' : s.face === 'mono' ? 'var(--bmono)' : 'var(--body)', h = r.h + add;
      const row = hr(X0, yy, CW, R.hair)
        + at(X0, yy + 8, `<div class="ga-h">${A(s.name)}</div><div class="ga-r ga-q">${s.size} / ${s.line}, ${A(weightName(s.weight))}</div>${r.shrunk ? `<div class="ga-r ga-q">shown at ${r.sz}</div>` : ''}`, { w: LW })
        + at(SX, yy + Math.floor((h - r.lh) / 2), A(r.word), { w: SW, cls: 'ga-spec', style: `font-family:${fam};font-weight:${s.weight};font-size:${r.sz}px;line-height:${r.lh}px;${s.face === 'display' ? `font-stretch:${d.stretch || 100}%;` : ''}height:${r.lh}px` });
      yy += h;
      return row;
    }).join('');
    return out + hr(X0, yy, CW, R.hair);
  } };
  return shell(ctx, 'type', t.html + flow('type', t.top, [facesSec, ladSec], { gap: 24, maxGap: 48 }));
}
