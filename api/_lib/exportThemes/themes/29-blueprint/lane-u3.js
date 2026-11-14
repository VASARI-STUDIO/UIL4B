// Theme 29 (Blueprint), lane u3: the UI kit's screens and code sheets (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// The same drawing language as lanes u1 and u2: each component is the shipped one (ctx.ui, componentsCss through lane u1's kit tokens), drawn on a plate of
// the surface it ships on, with red dimensions only where a true size in px is printed, numbered keys read across to a schedule, and general notes on the
// content floor. Chrome and drafting helpers come from lane-u1.js (read-only); lane-u3-parts.js holds this lane's helpers and the two product screens.
import { esc as A } from '../../engine/brand.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { wrap, displayStem, shown } from './measure.js';
import { plate, at, svgAll, drawingTitle, bubble, keyTag, spread, sc, uiT, textW, linesOf, ratioOf, pickSpace, sheetNo, reds, ZX, r1 } from './lane-u1.js';
import { pxOf, hexOf, frame, rowAt, mono, zoomFit, noteBlock, head, sheetOf, uniq, schedule, desktopScreen, phoneScreen } from './lane-u3-parts.js';

export { css } from './lane-u3-parts.js';

// a leader from a point inside a plate to the plate's edge, then on to a key
// p.ex, when given, is the y the leader leaves the plate at (it goes up or down to it first)
const leader = (p, edge, KX, ky, inside, outside = 'var(--ink)') => { const ey = p.ex ?? p.y; return `<path d="M${r1(p.x)} ${r1(p.y)}${p.ex != null ? `V${r1(ey)}` : ''}H${r1(edge)}" stroke="${inside}" stroke-width="1" fill="none"/><circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="2.5" fill="${inside}"/><path d="M${r1(edge)} ${r1(ey)}H${r1(edge + 10)}L${r1(KX - 12)} ${r1(ky)}" stroke="${outside}" stroke-width="1" fill="none"/>`; };
// a key read down a column: the tag, the part, and its token and value under it
const keyLine = (x, y, i, a, l) => keyTag(x, y, i + 1) + rowAt(x + 24, y - 18, A(a)) + rowAt(x + 24, y + 2, A(l), 'u1-m u3-q');

// ---------------------------------------------------------------- dialog

function dialog(ctx) {
  const ui = ctx.ui, S = sc(ctx), D = S.dialog, M = colourMap(ctx, 'light'), MD = colourMap(ctx, 'dark'), R = reds(), g = tokenGroups(ctx);
  const bw = pxOf(ctx.borders, 'border-control', 1), tT = uiT(ctx, 'title-s'), tB = uiT(ctx, 'body'), rc = ctx.radius.card;
  const inW = 440 - 2 * bw - 48, tl = linesOf(ctx, 'display', D.title, tT.size, inW, ctx.weights.heading), bl = linesOf(ctx, 'body', D.body, tB.size, inW);
  const dH = 2 * bw + 48 + tl * tT.line + 12 + bl * tB.line + 24 + 44;
  // detail 1: the confirmation at 2:1, its parts dimensioned and keyed
  const K = 2, ux = 44, uy = 40, Pw = ux + 440 + 16, Ph = uy + dH + 24, FX = 40, FY = 40, x0 = FX + ux * K, y0 = FY + uy * K;
  let html = zoomFit(FX, FY, Pw * K, Ph * K, K, at(ux, uy, uniq(ui.dialog({ ...D, danger: true }), 'u3d-a'), 'width:440px'));
  let svg = frame(FX, FY, Pw * K, Ph * K);
  R.dim([x0, y0], [x0 + 440 * K, y0], [0, -1], { d: 28, value: '440 px' });
  R.dim([x0, y0], [x0, y0 + dH * K], [-1, 0], { d: 28, value: `${dH} px`, place: 'left' });
  R.dim([x0 + bw * K, y0 + dH * K], [x0 + (bw + 24) * K, y0 + dH * K], [0, 1], { d: 28, value: '24 px' });
  const rx = x0 + (440 - 12) * K, tags = [
    [rx, y0 + (bw + 24 + tT.line / 2) * K],
    [rx, y0 + (bw + 24 + tl * tT.line + 12 + tB.line / 2) * K],
    [x0 + (bw + 12) * K, y0 + (dH - bw - 24 - 22) * K],
    [x0 + 440 * K, y0 + (bw + 24 + tl * tT.line + 6) * K],
  ];
  tags.forEach(([cx, cy], i) => { html += keyTag(cx, cy, i + 1); });
  const gap = pickSpace(ctx, 12);
  const sch = schedule(64, 1040, FY + Ph * K + 28 + 27 + 36, [['Key', 0], ['Part', 40], ['Token', 200, 1], ['Value', 400, 1]], [
    ['Title', 'title-s', `${tT.size} / ${tT.line} / ${tT.weight}`],
    ['Text', '--text-soft', `${ratioOf(ctx, M['text-soft'], M.surface)} : 1 on --surface`],
    ['Actions', gap.token, `${gap.px} px apart, the safe answer first`],
    ['Edge', '--text', `${bw} px, ${rc} px corner`],
  ]);
  html += drawingTitle(FX + 24, FY + Ph * K + 28, 1, 'Confirmation, danger action', '[2:1]') + sch.html;
  svg += sch.svg;
  // details 2 and 3: the modal on its scrim at 1:1, light then dark
  const RX = 1547 - 488, SH = dH + 48, scrim = (ui2, d) => `<div class="ui-scrim" style="position:absolute;inset:0">${uniq(ui2, d)}</div>`;
  const Ay = 40, By = Ay + SH + 28 + 27 + 32;
  html += plate(RX, Ay, 488, SH, 'light', scrim(ui.dialog({ ...D }), 'u3d-b')) + drawingTitle(RX + 24, Ay + SH + 28, 2, 'Modal on its scrim, light', '[1:1]');
  html += plate(RX, By, 488, SH, 'dark', scrim(ui.dialog({ ...D, danger: true }), 'u3d-c')) + drawingTitle(RX + 24, By + SH + 28, 3, 'Confirmation, dark', '[1:1]');
  svg += frame(RX, Ay, 488, SH) + frame(RX, By, 488, SH);
  const items = [
    'A dialog asks one question. The title is the question and the two buttons answer it, with the safe answer first.',
    `The scrim is [--scrim], [${hexOf(M, 'scrim')}] in light and [${hexOf(MD, 'scrim')}] in dark. The dialog keeps a [${bw} px] edge in [--text]. ${ctx.brand.ui.shadows === 'none' ? 'Its float shadow is [none].' : 'It also carries [--shadow-float].'}`,
    'On a native [dialog] element the scrim is its [::backdrop] and Esc closes it.',
  ];
  html += noteBlock(RX, 488, items);
  return sheetOf(ctx, 'dialog', html + svgAll(svg) + R.svg(), '[2:1] and [1:1], sizes in px');
}

// ---------------------------------------------------------------- table

function table(ctx) {
  const ui = ctx.ui, S = sc(ctx), d = S.deliveries, M = colourMap(ctx, 'light'), R = reds(), tL = uiT(ctx, 'label');
  const hd = [S.deliverToLabel, 'When', 'Status', S.paidLabel];
  const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon(dir === 'asc' ? 'arrow-up' : 'arrow-down', 14) : ''}</button>`;
  const rows = d.map((r, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(r.to)}</td><td class="ui-num">${A(r.when)}</td><td>${ui.statusChip(r.status)}</td><td class="is-num">${A(r.price)}</td></tr>`).join('');
  const tbl = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(hd[0], 'asc')}</th><th scope="col">${sortBtn(hd[1])}</th><th scope="col">${hd[2]}</th><th scope="col" class="is-num">${sortBtn(hd[3])}</th></tr></thead><tbody>${rows}</tbody></table>`;
  // detail 1: the table as it ships, 1:1, its row heights dimensioned
  const P = { x: 140, y: 72, w: 1000 }, TW = P.w - 48, HH = 44, RH = 52, TX = P.x + 24, TY = P.y + 24;
  P.h = 48 + HH + RH * d.length;
  let html = plate(P.x, P.y, P.w, P.h, 'light', at(24, 24, tbl, `width:${TW}px`)), svg = frame(P.x, P.y, P.w, P.h);
  R.dim([TX, TY], [TX, TY + HH], [-1, 0], { d: 24, value: `${HH} px`, place: 'left' });
  R.dim([TX, TY + HH], [TX, TY + HH + RH], [-1, 0], { d: 24, value: `${RH} px`, place: 'left' });
  const edge = P.x + P.w, KX = edge + 56, rt = (i) => TY + HH + RH * i;
  // the dots sit in the right padding of their row so no leader crosses a cell; the sorted header's goes up into the plate's top padding
  const dx = TX + TW - 6, mid = (i) => rt(i) + RH / 2;
  const pts = [
    { x: TX + 12 + textW(ctx, 'body', hd[0], tL.size, ctx.weights.medium) + 6 + 14 + 6, y: TY + HH / 2, ex: P.y + 12, a: 'Sorted header', l: 'aria-sort, an icon 14 px' },
    { x: dx, y: mid(0), a: 'Selected row', l: '--raised, a 3 px bar in --action' },
    { x: dx, y: mid(2), a: 'Hover row', l: '--raised, pointer only' },
    { x: dx, y: mid(4), a: 'Numbers', l: 'right, tabular figures' },
  ].sort((a, b) => a.y - b.y);
  const ky = spread(pts.map((p) => p.ex ?? p.y), 56, P.y + 32, P.y + P.h - 32);
  pts.forEach((p, i) => { svg += leader(p, edge, KX, ky[i], M.text); html += keyLine(KX, ky[i], i, p.a, p.l); });
  html += drawingTitle(P.x + 24, P.y + P.h + 28, 1, 'Data table', '[1:1]');
  // detail 2: the selected row and its header at 2:1, the bar and the cell padding dimensioned
  const K = 2, ux = 40, uy = 16, TW2 = 300, Pw = ux + TW2 + 16, Ph = uy + HH + RH + 24, FX = P.x, FY = P.y + P.h + 28 + 27 + 40;
  const t2 = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(hd[0], 'asc')}</th><th scope="col" class="is-num">${hd[3]}</th></tr></thead><tbody><tr aria-selected="true"><td>${A(d[0].to)}</td><td class="is-num">${A(d[0].price)}</td></tr></tbody></table>`;
  html += zoomFit(FX, FY, Pw * K, Ph * K, K, at(ux, uy, t2, `width:${TW2}px`));
  svg += frame(FX, FY, Pw * K, Ph * K);
  const X0 = FX + ux * K, Y0 = FY + uy * K;
  R.dim([X0, Y0], [X0, Y0 + HH * K], [-1, 0], { d: 28, value: `${HH} px`, place: 'left' });
  R.dim([X0, Y0 + HH * K], [X0, Y0 + (HH + RH) * K], [-1, 0], { d: 28, value: `${RH} px`, place: 'left' });
  R.dim([X0, Y0 + (HH + RH) * K], [X0 + 3 * K, Y0 + (HH + RH) * K], [0, 1], { d: 28, value: '3 px' });
  R.dim([X0 + (TW2 - 12) * K, Y0 + (HH + RH) * K], [X0 + TW2 * K, Y0 + (HH + RH) * K], [0, 1], { d: 28, value: '12 px' });
  html += drawingTitle(FX + 24, FY + Ph * K + 28, 2, 'Selected row and sorted header', '[2:1]');
  const items = [
    'A header names the data. A sortable header is a button, and the sorted one shows its direction.',
    'Numbers sit to the right and use tabular figures, so a column lines up.',
    'A selected row steps up to [--raised] and takes a [3 px] bar in [--action] on its left. A hover row steps up the same way on pointer devices only.',
  ];
  html += noteBlock(1196, 330, items);
  return sheetOf(ctx, 'table', html + svgAll(svg) + R.svg(), '[1:1] and [2:1], sizes in px');
}

// ---------------------------------------------------------------- empty

function empty(ctx) {
  const ui = ctx.ui, S = sc(ctx), E = S.empty, F = S.form, M = colourMap(ctx, 'light'), R = reds();
  const tH = uiT(ctx, 'headline'), tB = uiT(ctx, 'body'), rc = ctx.radius.card;
  // detail 1: the empty state at 2:1
  const K = 2, ux = 52, uy = 36, eW = 360, inW = eW - 64;
  // the text is held to 36ch, the width of 36 zeros (measured: the render's box is 64 + title + 12 + text + 12 + 44 high)
  const tl = linesOf(ctx, 'display', E.title, tH.size, inW + 6, ctx.weights.heading), bl = linesOf(ctx, 'body', E.body, tB.size, Math.min(inW, 36 * textW(ctx, 'body', '0', tB.size)));
  const eH = 64 + tl * tH.line + 12 + bl * tB.line + 12 + 44;
  const Pw = ux + eW + 16, Ph = uy + eH + 40, FX = 40, FY = 40, x0 = FX + ux * K, y0 = FY + uy * K;
  let html = zoomFit(FX, FY, Pw * K, Ph * K, K, at(ux, uy, `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`, `width:${eW}px`));
  let svg = frame(FX, FY, Pw * K, Ph * K);
  R.dim([x0, y0], [x0 + eW * K, y0], [0, -1], { d: 28, value: `${eW} px` });
  R.dim([x0, y0], [x0, y0 + eH * K], [-1, 0], { d: 28, value: `${eH} px`, place: 'left' });
  R.dim([x0, y0 + eH * K], [x0 + 32 * K, y0 + eH * K], [0, 1], { d: 28, value: '32 px' });
  const rx = x0 + (eW - 16) * K;
  [[rx, y0 + (32 + tH.line / 2) * K], [rx, y0 + (32 + tl * tH.line + 12 + tB.line / 2) * K], [rx, y0 + (eH - 32 - 22) * K], [rx, y0 + 16 * K]].forEach(([cx, cy], i) => { html += keyTag(cx, cy, i + 1); });
  html += drawingTitle(FX + 24, FY + Ph * K + 28, 1, 'Empty state', '[2:1]');
  // detail 2: first run at 1:1, a list of what is needed in the order it is asked
  const RX = 1547 - 488, fr = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="u3-steps"><li><b>1</b>${A(F.pickup)}</li><li><b>2</b>${A(F.dropoff)}</li><li><b>3</b>${A(F.ready)}</li></ol>${ui.btn(F.book, { disabled: true })}<p class="ui-help">${A(F.bookWhy)}</p></div>`;
  // 24 plate padding, 64 empty-state padding, the title, 12 gap, three 24 px steps 8 apart (88), 12, the 44 px button, 12, the 16 px help line
  const hh = 48 + 64 + linesOf(ctx, 'display', F.title, tH.size, 376, ctx.weights.heading) * tH.line + 12 + 88 + 12 + 44 + 12 + 16;
  html += plate(RX, 40, 488, hh, 'light', at(24, 24, fr, 'width:440px')) + drawingTitle(RX + 24, 40 + hh + 28, 2, 'First run', '[1:1]');
  svg += frame(RX, 40, 488, hh);
  const sy = 40 + hh + 28 + 27 + 36;
  const sch = schedule(912, 1547, sy, [['Key', 0], ['Part', 40], ['Token', 190, 1], ['Value', 340, 1]], [
    ['Headline', 'headline', `${tH.size} / ${tH.line} / ${tH.weight}`],
    ['Text', '--text-soft', `${ratioOf(ctx, M['text-soft'], M.raised)} : 1 on --raised`],
    ['Action', '--action', `${ratioOf(ctx, M['action-label'], M.action)} : 1 for the label`],
    ['Ground', '--raised', `${hexOf(M, 'raised')}, no edge`],
  ]);
  html += sch.html;
  svg += sch.svg;
  const items = [
    'Say what is missing and offer the one action that fixes it.',
    `First run lists what is needed in the order it is asked. The action stays off until it can work, and the line under it says why.`,
    `The state sits on [--raised] with no edge and a [${rc} px] corner, so it does not read as a card.`,
  ];
  html += noteBlock(912, 635, items);
  return sheetOf(ctx, 'empty', html + svgAll(svg) + R.svg(), '[2:1] and [1:1], sizes in px');
}

// ---------------------------------------------------------------- the product screens

// y of each part of the track panel (screen px), from the shipped line heights; measured in the render: the panel starts 88 down, the progress bar
// centre is 21 below the progress block's top, the route labels 40, and the rider, detail and share blocks follow at 24 px gaps (42, 74 and 44 high)
function trackY(ctx, S) {
  const tT = uiT(ctx, 'title'), tB = uiT(ctx, 'body'), hl = wrap(displayStem(ctx), S.eta, tT.size, 460 - 6, -0.01);
  const chip = 114, head = chip + 17 + 8, pick = head + hl.length * tT.line + 8, prog = pick + linesOf(ctx, 'body', S.pickup, tB.size, 460) * tB.line + 24;
  const share = prog + 48 + 24 + 42 + 24 + 74 + 24;
  return { chip, head, pick, prog, share, hl0: hl[0], tT, tB };
}

function screenSheet(ctx, id, dark) {
  const S = sc(ctx), B = ctx.brand, mode = dark ? 'dark' : 'light', M = colourMap(ctx, 'light'), Md = colourMap(ctx, mode), R = reds();
  const W = 1100, H = 620, SX = 130, SY = 100, colX = W - 32 - 460, T = trackY(ctx, S), tL = uiT(ctx, 'label');
  let html = plate(SX, SY, W, H, mode, at(0, 0, desktopScreen(ctx, W, H, dark))), svg = frame(SX, SY, W, H);
  const edge = SX + W, st = ctx.status.find((s) => s.id === S.deliveries[0].status);
  const hx = colX + textW(ctx, 'display', T.hl0, T.tT.size) + 12, hy = T.head + T.tT.line / 2;
  html += drawingTitle(SX + 24, SY + H + 28, 1, `${B.ui.screen.title}, desktop, ${mode}`, '[1:1]', shown(ctx, `${B.ui.screen.title}, desktop, ${mode}`));
  // a part's leader: its dot (x, y in screen px), the y it leaves the plate at (ex, when it first has to climb out of the way), then on to the key
  const lead = (p, KX, ky, inside, outside) => leader({ x: SX + p.x, y: SY + p.y, ex: p.ex != null ? SY + p.ex : null }, edge, KX, ky, inside, outside);
  if (!dark) {
    // each part read across to the sheet that draws it; the navigation's dot sits in the bar clear of the links and its leader runs above the clock
    const refs = [
      { id: 'navigation', x: 800, y: 28, ex: 8 },
      { id: 'status', x: colX + textW(ctx, 'body', st.label, tL.size, ctx.weights.medium) + 8, y: T.chip + 8 },
      { id: 'type-scale', x: hx, y: hy },
      { id: 'buttons', x: W - 32 - 8, y: T.share + 22 },
    ].sort((a, b) => (a.ex ?? a.y) - (b.ex ?? b.y));
    const BX = edge + 80, by = spread(refs.map((r) => SY + (r.ex ?? r.y)), 56, SY + 24, SY + H - 24);
    refs.forEach((r, i) => {
      svg += lead(r, BX - 10, by[i], M.text);
      html += bubble(BX, by[i], i + 1, sheetNo(ctx, r.id)) + `<span class="a c-note nw" style="left:${BX + 32}px;top:${r1(by[i] - 10)}px">${A(ctx.pages.find((x) => x.id === r.id).title)}</span>`;
    });
    R.dim([SX, SY], [SX + W, SY], [0, -1], { d: 28, value: `${W} px` });
    R.dim([SX, SY], [SX, SY + H], [-1, 0], { d: 28, value: `${H} px`, place: 'left' });
  } else {
    // the colours it is drawn in, each read across with its ratio on the ground
    const pickX = colX + Math.min(460, textW(ctx, 'body', S.pickup, T.tB.size) + 8);
    const pts = [
      { x: W - 8, y: 56, t: '--divider', v: `${ratioOf(ctx, Md.divider, Md.surface)} : 1, a 1 px rule` },
      { x: hx, y: hy, t: '--text', v: `${hexOf(Md, 'text')}, ${ratioOf(ctx, Md.text, Md.surface)} : 1` },
      { x: pickX, y: T.pick + 12, t: '--text-soft', v: `${hexOf(Md, 'text-soft')}, ${ratioOf(ctx, Md['text-soft'], Md.surface)} : 1` },
      { x: colX + 0.6 * 460, y: T.prog + 21, ex: T.prog - 10, t: '--action', v: `${hexOf(Md, 'action')}, ${ratioOf(ctx, Md.action, Md.surface)} : 1` },
      { x: colX + 460 + 6, y: T.prog + 40, t: '--quiet', v: `${hexOf(Md, 'quiet')}, ${ratioOf(ctx, Md.quiet, Md.surface)} : 1` },
    ].sort((a, b) => (a.ex ?? a.y) - (b.ex ?? b.y));
    const KX = edge + 80, ky = spread(pts.map((p) => SY + (p.ex ?? p.y)), 56, SY + 28, SY + H - 28);
    pts.forEach((p, i) => {
      svg += lead(p, KX, ky[i], Md.text);
      html += keyTag(KX, ky[i], i + 1) + rowAt(KX + 24, ky[i] - 18, A(p.t), 'u1-m') + rowAt(KX + 24, ky[i] + 2, A(p.v), 'u1-m u3-q');
    });
  }
  const items = dark ? [
    `The same markup as the light screen. Dark is [data-theme="dark"] on the plate, and every token swaps its value, never its name.`,
    `The ground is [--surface], [${hexOf(Md, 'surface')}]. Each ratio is the colour against it, from the engine's pair rules.`,
  ] : [
    'Every part is a shipped component. A reference on the right names the sheet that draws it.',
    `The status words take their colour from the status, and the action colour marks the live part only.`,
  ];
  html += noteBlock(640, 560, items);
  return sheetOf(ctx, id, html + svgAll(svg) + R.svg(), '[1:1], sizes in px');
}

function mobile(ctx) {
  const S = sc(ctx), M = colourMap(ctx, 'light'), R = reds(), tT = uiT(ctx, 'title'), tB = uiT(ctx, 'body'), tL = uiT(ctx, 'label'), bh = pxOf(ctx.borders, 'border-hairline', 1);
  const SX = 240, SY = 100, W = 390, H = 844;
  let html = plate(SX, SY, W, H, 'light', at(0, 0, phoneScreen(ctx))), svg = frame(SX, SY, W, H);
  R.dim([SX, SY], [SX + W, SY], [0, -1], { d: 28, value: `${W} px` });
  R.dim([SX, SY], [SX, SY + H], [-1, 0], { d: 100, value: `${H} px`, place: 'left' });
  [[0, 56, '56 px'], [720, 764, '44 px'], [780, 844, '64 px']].forEach(([a, b, v]) => R.dim([SX, SY + a], [SX, SY + b], [-1, 0], { d: 28, value: v, place: 'left' }));
  // the parts, y from the shipped line heights (measured in the render: the status sits in a 24 px line, the rider row is 42 high, the card 120)
  const hl = wrap(displayStem(ctx), S.eta, tT.size, W - 32 - 6, -0.01), yHead = 56 + 24 + 24 + 8, yPick = yHead + hl.length * tT.line + 8;
  const yProg = yPick + linesOf(ctx, 'body', S.pickup, tB.size, W - 32) * tB.line + 24, cardTop = yProg + 48 + 24 + 42 + 24;
  const st = ctx.status.find((s) => s.id === S.deliveries[0].status), stt = statusText(ctx, 'light', st);
  const pts = [
    { x: W - 8, y: 28, a: 'Top bar', t: '--divider', v: `${bh} px rule, 56 px high` },
    { x: 16 + textW(ctx, 'body', st.label, tL.size, ctx.weights.medium) + 8, y: 56 + 24 + 12, a: 'Status', t: stt.token, v: `${ratioOf(ctx, stt.hex, M.surface)} : 1 on --surface` },
    { x: 16 + textW(ctx, 'display', hl[0], tT.size) + 12, y: yHead + tT.line / 2, a: 'Headline', t: 'title', v: `${tT.size} / ${tT.line} / ${tT.weight}` },
    { x: W - 1, y: cardTop + 14, a: 'Card', t: '--divider', v: `${bh} px, ${hexOf(M, 'divider')}` },
    { x: W - 8, y: 742, a: 'Button', t: 'control', v: '44 px high, full width' },
    { x: 90, y: 781.5, a: 'Tab bar', t: '--action', v: 'a 3 px bar on the current tab' },
  ].sort((a, b) => a.y - b.y);
  // a numbered tag by each part, close to the phone; the schedule that names them sits in the right column
  const edge = SX + W, KX = edge + 36, ky = spread(pts.map((p) => SY + p.y), 36, SY + 16, SY + H - 16);
  pts.forEach((p, i) => { svg += leader({ x: SX + p.x, y: SY + p.y }, edge, KX, ky[i], M.text); html += keyTag(KX, ky[i], i + 1); });
  const X0 = 730;
  const sch = schedule(X0, 1547, SY, [['Key', 0], ['Part', 40], ['Token', 190, 1], ['Value', 350, 1]], pts.map((p) => [p.a, p.t, p.v]), 40);
  html += sch.html;
  svg += sch.svg;
  html += drawingTitle(X0 + 24, sch.end + 28, 1, `${ctx.brand.ui.screen.title}, 390 px`, '[1:1]', shown(ctx, `${ctx.brand.ui.screen.title}, 390 px`));
  // detail 2: the statuses the screen can show, in the brand's own words
  const D2 = { x: X0, y: sch.end + 28 + 27 + 40, w: 1547 - X0, h: 56 }, n = ctx.status.length, cw = D2.w / n;
  html += plate(D2.x, D2.y, D2.w, D2.h, 'light', ctx.status.map((s, i) => at(i * cw + 16, 19, ctx.ui.statusChip(s.id))).join(''));
  svg += frame(D2.x, D2.y, D2.w, D2.h);
  // the token names are mono, about 7.2 px a character; the last column slides left so its name stays inside the plate
  ctx.status.forEach((s, i) => { const t = statusText(ctx, 'light', s); const o = (i % 2) * 40, lx = Math.min(D2.x + i * cw + 16, D2.x + D2.w - 12 - t.token.length * 7.2); html += mono(lx, D2.y + D2.h + 12 + o, t.token) + mono(lx, D2.y + D2.h + 30 + o, `${ratioOf(ctx, t.hex, M.surface)} : 1`); });
  html += drawingTitle(D2.x + 24, D2.y + D2.h + 100, 2, 'The headline takes any status', '[1:1]');
  const items = [
    'The phone is [390 px] wide. The top bar is [56 px] and the tab bar [64 px]; every control is at least [44 px] high.',
    'The arrival is the headline. The status beside it says where the build is, in the words the brand gave it.',
    'Under [480 px] the top bar wraps its links onto a second line.',
  ];
  html += noteBlock(X0, 560, items);
  return sheetOf(ctx, 'screen-mobile', html + svgAll(svg) + R.svg(), '[1:1], sizes in px');
}

// ---------------------------------------------------------------- tokens: a schedule in four ruled columns

function tokens(ctx) {
  const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), RH = 22, TOP = 64;
  let html = '', svg = '';
  const grp = (x, y, w, title, cols) => {
    html += `<h3 class="a c-head nw" style="left:${x}px;top:${y}px">${A(title)}</h3>`;
    cols.forEach(([t, dx]) => { html += `<span class="a c-label" style="left:${x + dx}px;top:${y + 26}px">${A(t)}</span>`; });
    svg += `<path d="M${x} ${y + 50}H${x + w}" stroke="var(--ink)" stroke-width="1.5"/>`;
    return y + 54;
  };
  const line = (x, y, w, name, val, sw) => {
    html += `<span class="u3-tk" style="left:${x}px;top:${y + 3}px">${A(name)}</span>`;
    if (sw) html += `<i class="sw" style="left:${x + 196}px;top:${y + 5}px;background:${sw[0]}"></i><span class="u3-tk" style="left:${x + 214}px;top:${y + 3}px">${A(String(val).toUpperCase())}</span>`;
    else html += `<span class="u3-tk" style="left:${x + 118}px;top:${y + 3}px">${A(val)}</span>`;
    svg += `<path d="M${x} ${y + RH - 0.5}H${x + w}" stroke="var(--hair)" stroke-width="1"/>`;
  };
  const keys = Object.keys(L), half = Math.ceil(keys.length / 2), CW = 396;
  [[64, keys.slice(0, half)], [480, keys.slice(half)]].forEach(([x, ks], ci) => {
    let y = grp(x, TOP, CW, ci ? 'Colour, continued' : 'Colour, light then dark', [['Token', 0], ['Light', 196], ['Dark', 300]]);
    ks.forEach((k) => {
      html += `<span class="u3-tk" style="left:${x}px;top:${y + 3}px">--${A(k)}</span><i class="sw" style="left:${x + 196}px;top:${y + 5}px;background:${L[k]}"></i><span class="u3-tk" style="left:${x + 214}px;top:${y + 3}px">${A(String(L[k]).toUpperCase())}</span><i class="sw" style="left:${x + 300}px;top:${y + 5}px;background:${D[k]}"></i><span class="u3-tk" style="left:${x + 318}px;top:${y + 3}px">${A(String(D[k]).toUpperCase())}</span>`;
      svg += `<path d="M${x} ${y + RH - 0.5}H${x + CW}" stroke="var(--hair)" stroke-width="1"/>`;
      y += RH;
    });
  });
  const kv = (x, y, w, title, obj, pre = '--') => { let yy = grp(x, y, w, title, [['Token', 0], ['Value', 118]]); for (const [k, v] of Object.entries(obj)) { line(x, yy, w, pre + k, v); yy += RH; } return yy + 18; };
  let y = TOP;
  y = kv(896, y, 290, 'Space', g.space);
  y = kv(896, y, 290, 'Radius', g.radius);
  kv(896, y, 290, 'Border width', g.width);
  const fam = (id) => ctx.brand.fonts[id].family;
  let y2 = grp(1210, TOP, 337, 'Fonts', [['Token', 0], ['Family', 118]]);
  [['ff-display', fam('display')], ['ff-body', fam('body')], ['ff-mono', fam('mono')]].forEach(([k, v]) => { line(1210, y2, 337, '--' + k, v); y2 += RH; });
  y2 += 18;
  y2 = grp(1210, y2, 337, 'Type', [['Token', 0], ['Size / line / weight', 118]]);
  ctx.uiType.forEach((t) => { line(1210, y2, 337, t.token, `${t.size} / ${t.line} / ${t.weight}`); y2 += RH; });
  y2 += 18;
  y2 = grp(1210, y2, 337, 'Palette', [['Token', 0], ['Value', 196]]);
  ctx.colours.forEach((c) => { line(1210, y2, 337, `--palette-${c.id}`, c.hex, [c.hex]); y2 += RH; });
  const items = [
    'Light values sit on [:root], dark on [data-theme="dark"] and the system setting. A dark value swaps the colour and keeps the name.',
    'The same tokens ship as [tokens.css], [tokens.json], [tokens.ts] and [tailwind.css].',
  ];
  html += noteBlock(1210, 337, items);
  return sheetOf(ctx, 'tokens', html + svgAll(svg), 'As noted, values as shipped');
}

// ---------------------------------------------------------------- code

function code(ctx) {
  const F = sc(ctx).form, MD = colourMap(ctx, 'dark');
  const fam = [...new Set(ctx.faces.map((f) => f.family))].join(', ');
  const files = [
    ['README.md', 'Install, use, token naming, light and dark, accessibility notes.'],
    ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
    ['tokens.json', 'The same tokens in the W3C design tokens format, a dark value on each colour.'],
    ['tokens.ts', 'The same values as a typed export.'],
    ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
    ['components.css', 'Classes for every component, built only on the tokens.'],
    ['example.html', 'Every component live, with a light and dark switch.'],
    ['fonts.css', `@font-face rules for ${fam}, and the Google Fonts link as an alternative.`],
    ['assets/', 'Logo, icons and font files.'],
  ];
  const RH = 52, LX = 64, LW = 600;
  let html = head([['File', LX], ['What it holds', LX + 150]], 64, LX, LX + LW), svg = '';
  files.forEach(([n, t], i) => {
    const y = 64 + 24 + i * RH;
    html += `<span class="a v c-mono" style="left:${LX}px;top:${y + 8}px">${A(n)}</span><p class="a c-note" style="left:${LX + 150}px;top:${y + 6}px;width:${LW - 150}px">${A(t)}</p>`;
    svg += `<path d="M${LX} ${y + RH - 0.5}H${LX + LW}" stroke="var(--hair)" stroke-width="1"/>`;
  });
  html += drawingTitle(LX + 14, 64 + 24 + files.length * RH + 28, 1, 'In the package', '[ui-kit-code/]');
  const snippets = [
    ['Install', `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">${F.book}</button>\n</body>`],
    ['Dark mode', '<html data-theme="dark">'],
    ['Tailwind v4', '@import "tailwindcss";\n@import "./tokens.css";\n@import "./tailwind.css";'],
  ];
  const CX = 720, CW = 1547 - CX;
  let y = 64;
  snippets.forEach(([t, c], i) => {
    const h = c.split('\n').length * 20 + 32;
    html += plate(CX, y, CW, h, 'dark', `<pre class="u3-code">${A(c)}</pre>`);
    svg += frame(CX, y, CW, h);
    html += drawingTitle(CX + 24, y + h + 28, i + 2, t, '');
    y += h + 28 + 27 + 32;
  });
  const items = [
    `Plain CSS, no framework. Copy the folder, link three stylesheets, and put the class [ui] on the body.`,
    `A colour token names a job: [--surface], [--text], [--action]. Dark swaps the values and keeps the names.`,
    `Controls are real elements. State is carried by [disabled], [aria-invalid], [aria-pressed] and [aria-current].`,
  ];
  html += noteBlock(LX, LW, items);
  return sheetOf(ctx, 'code', html + svgAll(svg), 'As noted');
}

export const uikit = {
  dialog, table, empty,
  'screen-light': (ctx) => screenSheet(ctx, 'screen-light', false),
  'screen-dark': (ctx) => screenSheet(ctx, 'screen-dark', true),
  'screen-mobile': mobile,
  tokens, code,
};
