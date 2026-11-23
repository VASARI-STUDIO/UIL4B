// Theme 24, Standards: the style guide's contrast, tokens and usage pages. Hairline registers, bars measured against a scale of 21, spacing quoted in x.
import { contrastFacts, colourFacts, tokenGroups, usageFacts, GRADE_NOTE } from '../../engine/styleguide.js';
import { r1, sum, hook } from '../../engine/guide-layout.js';
import { A } from './helpers.js';
import { copyOf } from './guide-copy.js';
import { buttonKit } from './guide-pages-b.js';
import { X0, XR, CW, SUBH, cap1, numberWord, inX, nLines, stemOf, para, kit, at, rect, hr, obj, sec, catNo, register, shell, title, flow } from './guide-kit.js';

// ---------------------------------------------------------------- contrast
export function contrastPage(ctx) {
  const K = kit(ctx), { R } = K, F = contrastFacts(ctx), P = F.pairs;
  const t = title(ctx, K, 'contrast', copyOf(ctx, 'contrast', [`${cap1(numberWord(P.length))} pairs the interface uses, each measured.`, 'Every pair the interface uses, measured.']));
  const RH = 40, AX = 360, AW = 170;
  const pairs = { h: SUBH + 8 + P.length * RH + 1, flex: P.length * 72, draw: (y, extra = 0) => {
    const rh = RH + Math.floor(extra / Math.max(1, P.length)), sh = Math.max(28, Math.min(56, rh - 12));
    return sec(K, X0, y, CW, catNo(ctx, 'contrast', 1), 'Pairs', 'ratio of text to ground, out of 21') + P.map((p, i) => {
      const yy = y + SUBH + 8 + i * rh, fam = p.sample && p.sample.face === 'display' ? 'var(--display)' : 'var(--body)', sz = Math.min((p.sample || {}).size || 15, 20);
      const mid = Math.floor(rh / 2);
      return hr(X0, yy, CW, R.edge)
        + obj(K, X0, yy + Math.floor((rh - sh) / 2), 56, sh, p.bgHex, at(0, 0, `<div style="width:56px;height:${sh}px;display:flex;align-items:center;justify-content:center;font-family:${fam};font-weight:${(p.sample || {}).weight || 400};font-size:${sz}px;line-height:1;color:${p.fgHex}">Aa</div>`))
        + at(X0 + 72, yy + Math.floor((rh - 34) / 2), `<div class="ga-h ga-e" style="width:${AX - X0 - 88}px">${A(p.label)}</div><div class="ga-r ga-q ga-e" style="width:${AX - X0 - 88}px">${A(p.use || '')}</div>`)
        + rect(AX, yy + mid, AW, 1, `background:${R.edge}`)
        + rect(AX, yy + mid - 3, Math.max(1, r1((Math.min(p.ratio, 21) / 21) * AW)), 6, `background:${R.ink}`)
        + at(AX + AW + 16, yy + mid - 8, A(`${p.ratioText}:1`), { w: 60, cls: 'ga-m' })
        + at(AX + AW + 76, yy + mid - 8, A(p.grade), { w: XR - (AX + AW + 76), cls: 'ga-r ga-e', style: `line-height:16px;color:${R.ink};font-weight:600` });
    }).join('') + hr(X0, y + SUBH + 8 + P.length * rh, CW, R.edge);
  } };
  // the tones the guide draws that the palette does not carry
  const brandTone = (hex) => (ctx.brand.tones || []).find((o) => o.hex.toLowerCase() === hex.toLowerCase());
  const tones = [...F.tones, ...F.interfaceTones].map((tn) => ({ ...tn, name: (brandTone(tn.hex) || {}).name || tn.name }));
  hook(ctx, { tones: tones.map((tn) => ({ name: tn.name, hex: tn.hex.toUpperCase(), use: cap1(tn.role) })) });
  const tc = tones.length <= 3 ? 1 : 3, TWd = Math.floor((CW - 12 * (tc - 1)) / tc), trows = Math.ceil(tones.length / tc);
  const tonesSec = tones.length ? { h: SUBH + 8 + trows * 30, flex: trows * 24, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'contrast', 2), 'Tones', 'in use, not on the palette') + tones.map((tn, i) => {
    const x = X0 + (i % tc) * (TWd + 12), yy = y + SUBH + 8 + Math.floor(i / tc) * (30 + Math.floor(extra / trows));
    return obj(K, x, yy + 2, 22, 22, tn.hex) + at(x + 32, yy, `<div class="ga-h ga-e" style="width:${TWd - 40}px">${A(tn.name)}</div><div class="ga-m ga-q" style="font-size:11px;line-height:14px">${A(tn.hex.replace('#', '').toUpperCase())}</div>`);
  }).join('') } : null;
  // the pairs the interface leaves out, by the palette's own names, the six nearest to passing
  const palName = (id) => { const c = ctx.byId[id]; return !c ? String(id) : ctx.tones.some((tn) => tn.id === id) && c.role.endsWith('text') ? ctx.cap(c.role) : c.name; };
  const unused = (ctx.unusedPairs || []).slice().sort((a, b) => parseFloat(b.ratioText) - parseFloat(a.ratioText)).slice(0, 6);
  const note = `${GRADE_NOTE}${unused.length ? ` Not used: ${unused.map((u) => `${palName(u.fg)} on ${palName(u.bg)} (${u.ratioText}:1)`).join(', ')}.` : ''}`;
  const noteH = para(note, CW - 88, { size: 12, lh: 16, stem: K.S.body }).h;
  const noteSec = { h: SUBH + 8 + noteH + 8 + 1, draw: (y) => sec(K, X0, y, CW, catNo(ctx, 'contrast', tones.length ? 3 : 2), 'Note')
    + register(K, X0, y + SUBH + 8, CW, [['Reading', `<div class="ga-r" style="line-height:16px;font-family:var(--chrome)">${A(note)}</div>`, noteH + 8]], { kw: 88 }) };
  // the grades: four cells, each the least ratio that earns it, drawn on the same bar as the pairs
  const GR = [['Fail', 'under 3:1', 0], ['AA Large', '3:1 and over', 3], ['AA', '4.5:1 and over', 4.5], ['AAA', '7:1 and over', 7]], GW = Math.floor((CW - 12 * 3) / 4), GH = 64;
  const gradesSec = { h: SUBH + 8 + GH, draw: (y) => sec(K, X0, y, CW, catNo(ctx, 'contrast', 4 - (tones.length ? 0 : 1)), 'Grades', 'least ratio for each, out of 21') + GR.map(([n, r, min], i) => {
    const x = X0 + i * (GW + 12), yy = y + SUBH + 8, next = i < 3 ? GR[i + 1][2] : 21;
    return hr(x, yy, GW, R.edge) + at(x, yy + 6, `<div class="ga-h">${A(n)}</div><div class="ga-r ga-q">${A(r)}</div>`, { w: GW })
      + rect(x, yy + GH - 14, GW, 1, `background:${R.edge}`) + rect(x + r1((min / 21) * GW), yy + GH - 17, Math.max(3, r1(((next - min) / 21) * GW)), 6, `background:${R.ink}`);
  }).join('') };
  return shell(ctx, 'contrast', t.html + flow('contrast', t.top, [pairs, tonesSec, noteSec, gradesSec].filter(Boolean), { gap: 20, maxGap: 40 }));
}

// ---------------------------------------------------------------- tokens
export function tokensPage(ctx) {
  const K = kit(ctx), { R } = K, T = tokenGroups(ctx), L = ctx.roles.light;
  const t = title(ctx, K, 'tokens', copyOf(ctx, 'tokens', ['Spacing, corners and edges, as set.', 'The spacing, corners and edges.']));
  const maxPx = Math.max(...T.space.map((s) => s.px), 1), BW = 200, spRow = 28;
  const base = Math.min(...T.space.map((s) => s.px)) || 4;
  const spaceSec = { h: SUBH + 8 + T.space.length * spRow + 1, flex: T.space.length * 20, draw: (y, extra = 0) => {
    const rh = spRow + Math.floor(extra / Math.max(1, T.space.length));
    return sec(K, X0, y, CW, catNo(ctx, 'tokens', 1), 'Spacing', `x is ${K.X} px, base ${base} px`) + T.space.map((s, i) => {
      const yy = y + SUBH + 8 + i * rh, ty = yy + Math.floor((rh - 16) / 2);
      return hr(X0, yy, CW, R.edge) + at(X0, ty, A(s.token), { w: 90, cls: 'ga-m ga-e' }) + at(X0 + 96, ty, `${s.px} px`, { w: 52, cls: 'ga-m' }) + at(X0 + 148, ty, inX(K, s.px), { w: 40, cls: 'ga-m ga-q' })
        + rect(X0 + 196, yy + Math.floor((rh - 10) / 2), Math.max(1, Math.round((s.px / maxPx) * BW)), 10, `background:${R.ink}`)
        + at(X0 + 196 + BW + 16, ty, A(s.use || ''), { w: XR - (X0 + 196 + BW + 16), cls: 'ga-r ga-q ga-e' });
    }).join('') + hr(X0, y + SUBH + 8 + T.space.length * rh, CW, R.edge);
  } };
  // corners: drawn at the largest whole multiple that leaves the biggest one a true corner (the section says so)
  const radii = T.radii, sq = 96, maxR = Math.max(...radii.filter((r) => r.px < 999).map((r) => r.px), 1), scale = Math.max(1, Math.min(4, Math.floor((sq / 2 - 1) / maxR)));
  const rc = Math.max(1, Math.min(radii.length, 3)), RWd = Math.floor((CW - 12 * (rc - 1)) / rc), rrows = Math.ceil(radii.length / rc);
  const radiiSec = radii.length ? { h: SUBH + 8 + rrows * (sq + 12) - 12, flex: 0, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'tokens', 2), 'Corners', scale > 1 ? `drawn at ${scale}x` : '') + radii.map((r, i) => {
    const x = X0 + (i % rc) * (RWd + 12), yy = y + SUBH + 8 + Math.floor(i / rc) * (sq + 12 + Math.floor(extra / rrows)), rad = Math.min(r.px * scale, sq / 2);
    return obj(K, x, yy, sq, sq, R.ground, '', { frame: true, style: `border-radius:${rad}px` })
      + at(x + sq + 12, yy, `<div class="ga-h">${r.px >= 999 ? 'Round' : `${r.px} px`}</div>` + r.tokens.map((tk) => `<div class="ga-m ga-q" style="font-size:11px;line-height:14px">${A(tk)}</div>`).join(''), { w: RWd - sq - 12 });
  }).join('') } : null;
  // borders at their real width and colour; the focus ring in the focus colour, at the control border's width
  const ctl0 = ctx.borders.find((b) => b.token === 'border-control'), fc = L.focus, fcName = (ctx.colours.find((c) => c.hex.toLowerCase() === fc.toLowerCase()) || {}).name || '';
  const bord = [...T.borders.map((b) => ({ ...b, tokens: b.tokens.filter((tk) => tk !== 'border-focus') })).filter((b) => b.tokens.length), ...(ctl0 ? [{ tokens: ['Focus ring'], px: ctl0.px, focus: true }] : [])];
  const bordCol = (b) => (b.focus ? L.focus : b.tokens.includes('border-control') ? L.border : L.divider);
  const bordText = (b) => [...(b.uses || []), ...(b.focus ? [`${fcName ? `${fcName} ` : ''}${fc.replace('#', '').toUpperCase()} at border-control`] : [])].join(', ');
  const BR = 44, uW = XR - (X0 + 402);
  const bordSec = { h: SUBH + 8 + bord.length * BR + 1, flex: bord.length * 40, draw: (y, extra = 0) => sec(K, X0, y, CW, catNo(ctx, 'tokens', radii.length ? 3 : 2), 'Borders', 'at their real width and colour') + bord.map((b, i) => {
    const br = BR + Math.floor(extra / bord.length), yy = y + SUBH + 8 + i * br;
    return hr(X0, yy, CW, R.edge) + at(X0, yy + Math.floor((br - 16 * b.tokens.length) / 2), b.tokens.map((tk) => `<div class="ga-m ga-e">${A(tk)}</div>`).join(''), { w: 130 }) + at(X0 + 136, yy + Math.floor((br - 16) / 2), `${b.px} px`, { w: 44, cls: 'ga-m' })
      + rect(X0 + 186, yy + Math.floor(br / 2) - b.px / 2, 200, b.px, `background:${bordCol(b)}`)
      + at(X0 + 402, yy + Math.floor((br - 16) / 2), A(bordText(b)), { w: uW, cls: 'ga-r ga-q ga-e' });
  }).join('') + hr(X0, y + SUBH + 8 + bord.length * (BR + Math.floor(extra / bord.length)), CW, R.edge) };
  hook(ctx, { borders: bord.map((b) => (b.focus ? ['Focus ring', `${fcName ? `${fcName} ` : ''}\`#${fc.replace('#', '').toUpperCase()}\` at \`border-control\` ${b.px} px`] : [b.tokens.map((tk) => `\`${tk}\``).join(', '), `${b.px} px`])) });
  return shell(ctx, 'tokens', t.html + flow('tokens', t.top, [spaceSec, radiiSec, bordSec].filter(Boolean), { gap: 24, maxGap: 48 }));
}

// ---------------------------------------------------------------- usage
export function usagePage(ctx) {
  const K = kit(ctx), { R, S } = K, U = usageFacts(ctx), cd = U.card, lk = U.link, L = ctx.roles.light;
  const { bt, font, vPrimary, bh, w1, bstyle } = buttonKit(ctx, K);
  const t = title(ctx, K, 'usage', copyOf(ctx, 'usage', ['The button, the link and the card, built from the tokens.', 'Built from the tokens.']));
  const SPW = 346, PLX = X0 + SPW + 16, PLW = XR - PLX, KW = 88;
  // a spec register: key, value rows. Values share one left column. Mono values are measured in the mono face at 12px, the rest in the body chrome at 13px
  const rowN = (v, mono) => Math.max(1, mono ? nLines(S.mono, v, 12, SPW - KW) : nLines(stemOf(ctx, 'body', 400), v, 13, SPW - KW));
  const rowH = (v, mono) => rowN(v, mono) * 18 + 8;
  const specH = (rows) => sum(rows.map(([, v, mono]) => rowH(v, mono))) + 1;
  const specReg = (x, y, rows) => register(K, x, y, SPW, rows.map(([k, v, mono]) => [k, `<div class="${mono ? 'ga-m' : 'ga-n'}" style="line-height:18px;${mono ? 'white-space:normal;overflow-wrap:anywhere' : ''}">${A(v)}</div>`, rowH(v, mono)]), { kw: KW });
  const bspec = [['Fill', bt.fillName], ['Label', bt.labelName], ['Radius', `${bt.radius.token}, ${bt.radius.px} px`, 1], ['Type', `${bt.type.name}, ${bt.type.size} / ${bt.type.line}`, 1], ['Padding', `${bt.padY.token} by ${bt.padX.token}`, 1]];
  const bH = Math.max(specH(bspec), bh + 48);
  const buttonSec = { h: SUBH + 8 + bH, draw: (y) => {
    const by = y + SUBH + 8;
    return sec(K, X0, y, CW, catNo(ctx, 'usage', 1), 'Button') + specReg(X0, by, bspec)
      + obj(K, PLX, by, PLW, bH, R.ground, rect(Math.floor((PLW - w1) / 2), Math.floor((bH - bh) / 2), w1, bh, `background:${bt.fill};color:${bt.label};${bstyle}`, A(vPrimary)), { frame: true });
  } };
  // the states
  const states = [['Rest', `background:${bt.fill};color:${bt.label}`], ['Hover', `background:${L.actionHover};color:${bt.label}`], ...(L.actionPressed ? [['Pressed', `background:${L.actionPressed};color:${bt.label}`]] : []), ['Focus', `background:${bt.fill};color:${bt.label};outline:${bt.border ? bt.border.px : 1.5}px solid ${L.focus};outline-offset:2px`], ['Disabled', `background:${L.disabledBg};color:${L.disabledText}`]];
  const nSt = states.length, perRow = Math.floor((CW - 48 - nSt * w1) / (nSt - 1)) >= 12 ? nSt : Math.ceil(nSt / 2), stRows = Math.ceil(nSt / perRow), stGap = perRow > 1 ? Math.min(32, Math.floor((CW - 48 - perRow * w1) / (perRow - 1))) : 0;
  const stRowH = bh + 8 + 16 + 16, sH = 24 + stRows * stRowH - 16 + 8;
  const statesSec = { h: SUBH + 8 + sH, draw: (y) => sec(K, X0, y, CW, catNo(ctx, 'usage', 2), 'States', 'the button, each way it shows') + obj(K, X0, y + SUBH + 8, CW, sH, R.ground, states.map(([n, css], i) => {
    const x = 24 + (i % perRow) * (w1 + stGap), by = 24 + Math.floor(i / perRow) * stRowH;
    return rect(x, by, w1, bh, `${css};${bstyle}`, A(vPrimary)) + at(x, by + bh + 8, A(n), { cls: 'ga-r ga-q' });
  }).join(''), { frame: true }) };
  // the link's colour is the foreground of the contrast pair the interface labels "Links"; failing that, the ink, named by its own name
  const lkPair = contrastFacts(ctx).pairs.find((p) => /^links?$/i.test(String(p.label).trim()) || /^links?$/i.test(String(p.use).trim()));
  const lkHexName = (hex) => ([...ctx.colours, ...ctx.tones].find((c) => c.hex.toLowerCase() === hex.toLowerCase()) || {}).name;
  const lkCol = lkPair ? { hex: lkPair.fgHex, name: lkPair.fgName } : { hex: R.ink, name: lkHexName(R.ink) || R.ink.replace('#', '').toUpperCase() };
  const lspec = [['Type', `${lk.type.name}, ${lk.type.size} / ${lk.type.line}`, 1], ['Colour', lkCol.name], ['Line', lk.border ? `${lk.border.token}, ${lk.border.px} px` : 'none', 1]];
  const lH = Math.max(specH(lspec), lk.type.line + 48);
  const linkSec = { h: SUBH + 8 + lH, draw: (y) => {
    const by = y + SUBH + 8;
    return sec(K, X0, y, CW, catNo(ctx, 'usage', 3), 'Link') + specReg(X0, by, lspec)
      + obj(K, PLX, by, PLW, lH, R.ground, at(24, Math.floor((lH - lk.type.line) / 2), A(lk.text), { style: `${font(lk.type)}color:${lkCol.hex};text-decoration:underline;text-decoration-thickness:${lk.border ? lk.border.px : 1.5}px;text-underline-offset:3px;white-space:nowrap` }), { frame: true });
  } };
  // the card's ink: its colour's own ink when that reads at 4.5, else the text colour, else the best of the ink, black and white
  const cardInk = (() => {
    let own = null;
    try { const cf = colourFacts(ctx).find((c) => c.hex.toLowerCase() === String(cd.fill).toLowerCase()); own = cf && cf.ink ? cf.ink.hex : null; } catch { /* no colour facts: fall through to the text colour */ }
    const cands = [own, L.text, R.ink, '#000000', '#ffffff'].filter(Boolean);
    return cands.find((h) => ctx.ratio(h, cd.fill) >= 4.5) || cands.reduce((a, b) => (ctx.ratio(b, cd.fill) > ctx.ratio(a, cd.fill) ? b : a));
  })();
  const cardInkName = lkHexName(cardInk) || cardInk.replace('#', '').toUpperCase();
  const edgeText = cd.edge ? `${cd.edge.token}, ${cd.edge.px} px ${cd.edgeName}` : 'no edge';
  const cardLine = `${cd.fillName} fill, \`${cd.radius.token}\` ${cd.radius.px} px, ${cd.edge ? `\`${cd.edge.token}\` ${cd.edge.px} px ${cd.edgeName} edge` : 'no edge'}, padding \`${cd.pad.token}\`, ${cd.title.name} ${cd.title.size}/${cd.title.line} px for the title and ${cd.body.name} ${cd.body.size}/${cd.body.line} px for the text, both in ${cardInkName}`;
  hook(ctx, { usage: {
    button: `${bt.fillName} fill, ${bt.labelName} label, \`${bt.radius.token}\` ${bt.radius.px} px, ${bt.type.name} ${bt.type.size}/${bt.type.line} px at ${bt.type.weight}, \`${bt.padY.token}\` over and \`${bt.padX.token}\` across`,
    link: `${lk.type.name} ${lk.type.size}/${lk.type.line} px at ${lk.type.weight}, ${lkCol.name}, ${lk.border ? `underlined at \`${lk.border.token}\` ${lk.border.px} px` : 'not underlined'}`,
    card: cardLine,
  } });
  // the card, drawn as its spec says
  const cspec = [['Fill', cd.fillName], ['Edge', edgeText, 1], ['Radius', `${cd.radius.token}, ${cd.radius.px} px`, 1], ['Padding', cd.pad.token, 1], ['Title', `${cd.title.name}, ${cd.title.size} / ${cd.title.line}`, 1], ['Text', `${cd.body.name}, ${cd.body.size} / ${cd.body.line}, ${cardInkName}`, 1]];
  const pad = cd.pad.px, edgePx = cd.edge ? cd.edge.px : 0, cardW = Math.min(PLW - 48, 300), tx = cardW - 2 * pad - 2 * edgePx;
  const tSt = cd.title.face === 'display' ? K.st : 1, tStem = stemOf(ctx, cd.title.face, cd.title.weight), bStem = stemOf(ctx, cd.body.face, cd.body.weight);
  // a brand's own paragraph can run to several sentences: the card shows the first that fits four lines, else the words that do, ending in an ellipsis
  const fit4 = (s) => nLines(bStem, s, cd.body.size, tx) <= 4, words = String(cd.bodyText).split(/\s+/);
  let bodyText = cd.bodyText;
  if (!fit4(bodyText)) {
    const first = (String(cd.bodyText).match(/^.*?[.!?](?=\s|$)/) || [''])[0];
    if (first && fit4(first)) bodyText = first;
    else { let n = words.length; while (n > 1 && !fit4(words.slice(0, n).join(' ') + '…')) n--; bodyText = words.slice(0, n).join(' ').replace(/[,;:\s]+$/, '') + '…'; }
  }
  const ctH = nLines(tStem, cd.titleText, cd.title.size, tx, tSt) * cd.title.line, cbH = nLines(bStem, bodyText, cd.body.size, tx) * cd.body.line, cardH = 2 * edgePx + 2 * pad + ctH + 8 + cbH;
  const cH = Math.max(specH(cspec), cardH + 48);
  const cardSec = { h: SUBH + 8 + cH, flex: 80, draw: (y, extra = 0) => {
    const by = y + SUBH + 8, hh = cH + extra;
    return sec(K, X0, y, CW, catNo(ctx, 'usage', 4), 'Card') + specReg(X0, by, cspec)
      + obj(K, PLX, by, PLW, hh, R.ground, rect(Math.floor((PLW - cardW) / 2), Math.floor((hh - cardH) / 2), cardW, cardH, `background:${cd.fill};border:${edgePx}px solid ${cd.edgeColour};padding:${pad}px;border-radius:${cd.radius.px}px`,
        `<div style="${font(cd.title)}color:${cardInk}">${A(cd.titleText)}</div><div style="margin-top:8px;${font(cd.body)}color:${cardInk}">${A(bodyText)}</div>`), { frame: true });
  } };
  return shell(ctx, 'usage', t.html + flow('usage', t.top, [buttonSec, statesSec, linkSec, cardSec], { gap: 20, maxGap: 40 }));
}
