// Theme 22, Ticket: lane g2, the six logo pages (logo, logo-versions, clear-space, min-size, logo-grounds, logo-misuse).
// The ticket, its perforation, notches and stub are the theme's fixed device (helpers.js); these pages change only what is printed on the body
// and what lies in the dark zone beneath it. Every colour is a role or a colourway from the brand; every size comes from ctx.logo.
import { plateImg } from '../../engine/plate.js';
import { A, px, T, roles, device, stub, textWidth, lineTop, trackOf } from './helpers.js';
import { isStreet } from './street.js';

const r1 = (n) => Math.round(n * 10) / 10;
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
const el = (x, y, cls, html, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${html}</div>`;
// a dark-zone note: the name in paper, then its text in the measured quiet colour (size 15 or 12/13)
const note = (x, y, w, name, text, small = false, tight = false) => `<div class="a g2-note" style="left:${px(x)};top:${px(y)};width:${px(w)}"><div class="${small ? 'c13' : 'c15'} b paper">${name}</div><div class="${small ? "c12" : "c15"} qt${tight ? " ph-tight" : ""}">${text}</div></div>`;
const v = (s) => `<span class="m">${s}</span>`;

// the page: the device (with optional photographs laid in as plates, under the holes), then the content and the stub
function ticketPage(ctx, R, id, { segments, body = '', zone = '', photos = '' }) {
  let dev = device(R, { segments });
  // the photographs go last among the plates (over their segment's flat colour) and under the SVG (so the holes still cut through them)
  if (photos) dev = dev.replace('</div><svg class="tk"', `${photos}</div><svg class="tk"`);
  return `<section class="pg g2" data-page="${id}" style="--ink:${R.fieldInk};--field:${R.field}">${dev}<div class="ct">${body}${stub(ctx, R, id)}${zone}</div></section>`;
}

// a brand colour's name from its hex (colours first, then tones), so captions say "Stock", never a hex
const nameOf = (ctx, hex) => ([...ctx.colours, ...ctx.tones].find((c) => same(c.hex, hex)) || { name: hex.toUpperCase() }).name;
const listAnd = (xs) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
// the colours a colourway prints the primary logo in, in part order, once each ("Stock and Cloakroom green")
const inksOf = (ctx, key) => {
  const cw = ctx.brand.logo.colourways[key];
  const hexes = ctx.logo.geos.colour.parts.map((p) => cw[p.role] || cw.name).filter((h, i, a) => a.findIndex((x) => same(x, h)) === i);
  return listAnd(hexes.map((h) => nameOf(ctx, h)));
};
// greedy wrap in the body face, so the line count laid out is the count that renders
function wrap(ctx, text, size, w, track = 0) {
  const out = [];
  for (const s of text.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g).map((x) => x.trim())) {
    let cur = '';
    for (const word of s.split(' ')) { const t = cur ? `${cur} ${word}` : word; if (cur && textWidth(ctx, 'body', t, size, track) > w * 0.94) { out.push(cur); cur = word; } else cur = t; }
    if (cur) out.push(cur);
  }
  return out;
}
const lines = (ls) => ls.map((l) => `<span class="ln">${A(l)}</span>`).join('');

// the logo (or, in the slot edition, its labelled frame) at a width; a frame too small for a 12 px label goes unlabelled
function mark(ctx, id, width, colourway, { label } = {}) {
  const cw = ctx.brand.logo.colourways[colourway];
  return ctx.logo.html(id, { width, colourway, color: cw.name, label: width >= 168 ? (label || 'Logo') : '' });
}

// a photograph from the theme's night scenes: the scene is given a plain field-coloured print (the build needs art on its surface),
// and only a part of the photograph away from that print is shown. win is that part, in scene pixels.
function scenePhoto(ctx, R, scene, win) {
  const si = ctx.sceneInfo(scene), q = si.quads[0], aw = 600, ah = Math.round(aw / q.aspect);
  const art = { html: ctx.artPage(`<div style="position:absolute;inset:0;background:${R.field}"></div>`, { w: aw, h: ah }), w: aw, h: ah };
  return { src: ctx.mockup(scene, [art]), si, win };
}
// the photograph cropped into a box: an <img> scaled so win fills it
const photoImg = (P, w, h) => {
  const k = Math.max(w / P.win.w, h / P.win.h);
  return `${plateImg(`${A(P.src)}`, ``, `position:absolute;left:${px(-P.win.x * k)};top:${px(-P.win.y * k)};width:${px(P.si.w * k)};height:${px(P.si.h * k)};max-width:none`)}`;
};

// a street brand's own photograph (the engine's night scenes are Encore's pub and bar): the shot with this photo name, cropped to win
// (px of the 2000 x 1333 file) into a w x h box. Returns null when the brand has no such photograph.
function streetPhoto(ctx, name, win, w, h) {
  const shot = ctx.brand.imagery.shots.find((s) => s.photo && s.photo.includes(name));
  if (!shot) return null;
  const k = Math.max(w / win.w, h / win.h);
  return { alt: shot.alt, html: `${plateImg(`${A(ctx.photoUrl(shot.photo))}`, ``, `position:absolute;left:${px(-win.x * k)};top:${px(-win.y * k)};width:${px(2000 * k)};height:${px(1333 * k)};max-width:none`)}` };
}

// a row of perforation holes from (x1, y1) to (x2, y2): 4 px holes about 10 px apart, as the ticket's own perforation is cut
const holeLine = (x1, y1, x2, y2, pitch = 10, r = 2) => {
  const len = Math.hypot(x2 - x1, y2 - y1), n = Math.round(len / pitch) + 1;
  return Array.from({ length: n }, (_, i) => `<circle cx="${r1(x1 + (x2 - x1) * i / (n - 1))}" cy="${r1(y1 + (y2 - y1) * i / (n - 1))}" r="${r}"/>`).join('');
};
const overlay = (inner) => `<svg class="a g2-ov" viewBox="0 0 1280 720" width="1280" height="720" aria-hidden="true">${inner}</svg>`;

export const guidelines = {
  // ---- the logo: the ticket printed on the full-colour version's own ground, the idea set as the ticket's lead, the logo across the foot ----
  logo: (ctx) => {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, cw = B.logo.colourways.colour, ground = cw.ground;
    const ink = R.inkOn(ground, 24, 500, '(Logo idea on the ticket)');
    const idea = wrap(ctx, B.logo.idea, 24, 640, -0.005);
    const ideaH = idea.length * 32;
    // the logo takes the full body width unless the idea leaves it too little height; it sits on the body's foot
    const room = 460 - (72 + ideaH + 48), lw = Math.min(864, room * L.geo.aspect), lh = lw / L.geo.aspect;
    const body = el(72, 72, 'c24', lines(idea), `color:${ink}`, 640)
      + el(72, 460 - lh, '', mark(ctx, 'colour', lw, 'colour', { label: 'Your logo goes here' }), `width:${px(lw)};height:${px(lh)}`);
    const zone = note(72, 532, 272, A(L.labels.colour), A(B.logo.when.colour))
      + note(368, 532, 272, 'Colours', A(`${inksOf(ctx, 'colour')}, on ${nameOf(ctx, ground)}.`));
    return ticketPage(ctx, R, 'logo', { segments: [{ x: T.x, w: T.bodyW, hex: ground }], body, zone });
  },

  // ---- versions: the three lockups printed on the field at one scale (the name is the same size in each); the four colourways of the
  // primary lie in the dark zone, each on a plate the size of its clear zone, or straight on the bar top when that is its ground ---- The three lockups sit on one centre line under their labels.
  'logo-versions': (ctx) => {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, onField = R.colourwayOn(R.field);
    const slots = [['horizontal', 72, 420], ['stacked', 516, 272], ['symbol', 812, 124]];
    const s = Math.min(...slots.map(([id, , w]) => Math.min(w / L.geos[id].w, 250 / L.geos[id].h)));
    let body = '';
    for (const [id, x, w] of slots) {
      const g = L.geos[id], lw = g.w * s, lh = g.h * s;
      body += el(x, 72, 'c13 b ink', A(L.labels[id]), '', w) + el(x, 90, 'c12 ink', A(B.logo.when[id]), '', w)
        + el(x, 295 - lh / 2, '', mark(ctx, id, lw, onField, { label: L.labels[id] }), `width:${px(lw)};height:${px(lh)}`);
    }
    // the dark zone: four columns of 198, each a plate (logo plus x on every side) over its label and when
    const ids = ['colour', 'mono-dark', 'mono-light', 'reversed'], colW = 198, u = L.geo.unit / L.geo.height;
    const whenLines = ids.map((id) => (ctx.edition === "slot" ? 2 : wrap(ctx, B.logo.when[id], 12, colW).length));   // slot: the compact placeholder wraps to two lines
    const plateH = Math.min(82, 156 - 8 - 18 - Math.max(...whenLines) * 16);
    // the logo height that fits a plate of plateH tall and colW wide
    const lh = Math.min(plateH / (1 + 2 * u), colW / (L.geo.aspect + 2 * u)), lw = lh * L.geo.aspect, X = lh * u;
    const pw = lw + 2 * X, ph = lh + 2 * X;
    let zone = '';
    ids.forEach((id, i) => {
      const x = 72 + i * (colW + 24), cw = cws[id], bare = same(cw.ground, R.table);
      const edge = !bare && R.nearTable(cw.ground) ? `box-shadow:inset 0 0 0 1px ${R.edge};` : '';
      zone += (bare ? '' : `<div class="a" style="left:${px(x)};top:532px;width:${px(pw)};height:${px(ph)};background:${cw.ground};${edge}"></div>`)
        + el(x + X, 532 + X, '', mark(ctx, id, lw, id), `width:${px(lw)};height:${px(lh)}`)
        + note(x, 532 + ph + 8, colW, A(L.labels[id]), A(B.logo.when[id]), true, ctx.edition === "slot");
    });
    return ticketPage(ctx, R, 'logo-versions', { body, zone });
  },

  // ---- clear space: the zone around the logo is cut as a perforation, the line nothing crosses; x is drawn in each corner ----
  'clear-space': (ctx) => {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, g = L.geos.colour, u = L.geo.unit, cwKey = R.colourwayOn(R.field);
    const s = Math.min(864 / (g.w + 2 * u), 340 / (g.h + 2 * u));
    const lw = g.w * s, lh = g.h * s, X = u * s, zw = lw + 2 * X, zh = lh + 2 * X;
    const zx = 72, zy = Math.round(72 + (388 - zh) / 2);
    const lx = zx + X, ly = zy + X;
    // the zone's outline as holes cut through to the bar top, corners included
    let holes = holeLine(zx, zy, zx + zw, zy) + holeLine(zx + zw, zy, zx + zw, zy + zh) + holeLine(zx + zw, zy + zh, zx, zy + zh) + holeLine(zx, zy + zh, zx, zy);
    let marks = `<rect x="${r1(lx)}" y="${r1(ly)}" width="${r1(lw)}" height="${r1(lh)}" fill="none" stroke="${R.fieldInk}" stroke-width="1"/>`;
    const corners = [[zx, zy], [lx + lw, zy], [zx, ly + lh], [lx + lw, ly + lh]];
    let xs = '';
    for (const [cx, cy] of corners) {
      marks += `<rect x="${r1(cx + 0.5)}" y="${r1(cy + 0.5)}" width="${r1(X - 1)}" height="${r1(X - 1)}" fill="none" stroke="${R.fieldInk}" stroke-width="1"/>`;
      xs += el(cx, cy + X / 2 - 9, 'c13 b ink g2-x', 'x', '', X);
    }
    const body = overlay(`<g fill="${R.hole}">${holes}</g>${marks}`) + xs
      + el(lx, ly, '', mark(ctx, 'colour', lw, cwKey, { label: 'Your logo goes here' }), `width:${px(lw)};height:${px(lh)}`);
    const share = L.clearShare;
    const what = ctx.edition === 'slot' || L.geo.unit !== L.geo.cap ? `x is ${share}% of the logo's height.` : `x is the wordmark's cap height, ${share}% of the logo's height.`;
    const zone = note(72, 532, 520, 'Clear space', A(`Keep x clear on every side, measured from the edge of the logo. ${what} Nothing enters the zone: no type, no edges, no other logos.`))
      + note(664, 532, 272, 'On this page', `x is ${v(`${Math.round(X)} px`)} and the logo ${v(`${Math.round(lw)} px`)} wide.`);
    return ticketPage(ctx, R, 'clear-space', { body, zone });
  },

  // ---- minimum size: the two smallest logos at actual size on an empty field, each over the number that is its width ----
  'min-size': (ctx) => {
    const R = roles(ctx), L = ctx.logo, m = L.minSize, cwKey = R.colourwayOn(R.field), tr = trackOf(ctx);
    const mmPx = m.printMm * 96 / 25.4;
    const cols = [
      { x: 72, title: 'On screen', w: m.screenPx, num: String(m.screenPx), unit: 'px', detail: `${m.screenPx} px wide, ${m.screenH} px high` },
      { x: 516, title: 'In print', w: mmPx, num: String(m.printMm), unit: 'mm', detail: `${m.printMm} mm wide, ${m.printH} mm high` },
    ];
    // both numbers at one size: the largest, up to 260, at which the wider fits 300 px
    let size = 260; while (size > 96 && Math.max(...cols.map((c) => textWidth(ctx, 'display', c.num, size, tr))) > 300) size -= 4;
    const base = 452;
    let body = '', rules = '';
    for (const c of cols) {
      const lh = c.w / L.geo.aspect;
      body += el(c.x, 72, 'c13 b ink', c.title) + el(c.x, 90, 'c12 ink nw', A(c.detail).replace(/(\d+(?:\.\d+)?) (px|mm)/g, (_, n, u2) => `${v(n)} ${u2}`))
        + el(c.x, 136, 'g2-min', mark(ctx, 'colour', c.w, cwKey), `width:${px(c.w)};height:${px(lh)}`)
        // the unit follows the number on its baseline, in the flow, so its gap does not depend on a measured width
        + `<div class="a ink g2-num" style="left:${px(c.x)};top:${px(lineTop(ctx, 'display', size, size, base))}"><span class="disp" style="font-size:${size}px;line-height:${size}px;letter-spacing:${tr}em">${c.num}</span><span class="c24" style="font-weight:600">${c.unit}</span></div>`;
      // a dimension line under each logo, exactly its width, with end ticks
      const y = 136 + lh + 10;
      rules += `<rect x="${r1(c.x)}" y="${r1(y)}" width="${r1(c.w)}" height="1"/><rect x="${r1(c.x)}" y="${r1(y - 4)}" width="1" height="9"/><rect x="${r1(c.x + c.w - 1)}" y="${r1(y - 4)}" width="1" height="9"/>`;
    }
    body += overlay(`<g fill="${R.fieldInk}">${rules}</g>`);
    const zone = note(72, 532, 520, 'Drawn at actual size', `On screen at one pixel to the pixel. In print at true millimetres, 96 px to the inch, so ${A(m.printMm)} mm is ${v(`${r1(mmPx)} px`)} on this page. Never smaller than these widths.`);
    return ticketPage(ctx, R, 'min-size', { body, zone });
  },

  // ---- grounds: the ticket printed on every stock the logo may sit on, joined by perforations, with a night photograph as the first ----
  'logo-grounds': (ctx) => {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, cws = B.logo.colourways, keys = Object.keys(cws);
    // one colourway per ground: full colour first, then reversed, then the brand's own "on" colourways, then the monos
    const order = ['colour', 'reversed', ...keys.filter((k) => !['colour', 'reversed', 'mono-dark', 'mono-light'].includes(k)), 'mono-dark', 'mono-light'].filter((k) => cws[k]);
    const grounds = [];
    for (const k of order) if (!grounds.some((x) => same(x.hex, cws[k].ground))) grounds.push({ hex: cws[k].ground, key: k });
    const gs = grounds.slice(0, 5), G = gs.length > 4 ? 132 : 164, P = T.bodyW - gs.length * G;
    const segs = [{ x: T.x, w: P, hex: R.table }];
    gs.forEach((g, i) => segs.push({ x: T.x + P + i * G, w: G, hex: g.hex }));
    // the photograph: the bar top under the lamp at night, a quiet part of the frame away from the ticket lying on it
    const photoKey = cws['mono-light'] ? 'mono-light' : R.colourwayOn(R.table);
    // a street brand shows a quiet stretch of its own road, not the pub's bar top
    const sp = isStreet(ctx) ? streetPhoto(ctx, 'evening', { x: 1000, y: 780, w: 900, h: 553 }, P, T.h) : null;
    const ph = sp ? null : scenePhoto(ctx, R, 'late-bar-ticket', { x: 1337, y: 700, w: 199, h: 324 });
    const photos = `<div class="pl g2-ph" role="img" aria-label="${sp ? 'A quiet stretch of road at evening' : 'A timber bar top at night'}" style="left:${T.x}px;top:${T.y}px;width:${P}px;height:${T.h}px;overflow:hidden">${sp ? sp.html : photoImg(ph, P, T.h)}</div>`;
    // every logo at one width, centred on the body's middle line
    const lw = G - 40, lh = lw / L.geo.aspect, cy = T.y + T.h / 2;
    let body = el(T.x + (P - lw) / 2, cy - lh / 2, '', mark(ctx, 'colour', lw, photoKey), `width:${px(lw)};height:${px(lh)}`);
    let zone = note(T.x + 24, 532, P - 48, 'On a photo', A(B.logo.when[photoKey] || `${L.labels[photoKey] || 'Mono light'}, on a quiet part of the picture.`), true);
    gs.forEach((g, i) => {
      const x = T.x + P + i * G;
      body += el(x + 20, cy - lh / 2, '', mark(ctx, 'colour', lw, g.key), `width:${px(lw)};height:${px(lh)}`);
      zone += note(x + 16, 532, G - 24, `On ${A(nameOf(ctx, g.hex))}`, A(`Logo in ${inksOf(ctx, g.key)}.`), true);
    });
    return ticketPage(ctx, R, 'logo-grounds', { segments: segs, body, zone, photos });
  },

  // ---- misuse: six wrong logos printed on the field, each cancelled with a cross of punched holes ----
  'logo-misuse': (ctx) => {
    const R = roles(ctx), B = ctx.brand, L = ctx.logo, cwKey = R.colourwayOn(R.field), cw = B.logo.colourways[cwKey];
    const aw = 272, ah = 118, w = 180, h = w / L.geo.aspect;
    // a colour that is not the brand's: the field's hue turned half way round, at a middle lightness
    const f = ctx.C.toOklch(R.field), wrong = ctx.C.fromOklch(0.5, Math.max(0.12, f.C), (f.H + 150) % 360);
    const slot = ctx.edition === 'slot';
    const svgAt = (ww, hh, fill) => (slot
      ? `<div class="logo-slot g2-mslot" style="width:${px(ww)};height:${px(hh)};border:1.5px dashed ${fill || cw.name}"></div>`
      : L.svg('colour', { colourway: cwKey, width: ww, fill }).replace(/height="[\d.]+"/, `height="${r1(hh)}"`).replace('<svg ', '<svg preserveAspectRatio="none" '));
    const shadow = ctx.C.hexToRgb(R.fieldInk).join(',');
    const busyStreet = isStreet(ctx) ? streetPhoto(ctx, 'busstop', { x: 0, y: 420, w: 900, h: 390 }, aw, ah) : null;
    const busy = busyStreet ? null : scenePhoto(ctx, R, 'late-bar-ticket', { x: 0, y: 0, w: 540, h: 234 });
    // the version that would be chosen for a dark ground, so the mistake shown is the busy picture and not a dark logo on a dark photo
    const onDark = R.colourwayOn(R.table);
    const items = [
      ['Stretched', 'Scale it evenly. Never squash or stretch it.', svgAt(w * 1.4, h * 0.6)],
      ['Recoloured', 'Use a colourway from the versions page, never a new colour.', svgAt(w, h, wrong)],
      ['Rotated', 'It sits level with the page. Never tilt or turn it.', `<div style="transform:rotate(-12deg)">${svgAt(w, h)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${shadow},0.5))">${svgAt(w, h)}</div>`],
      ['Busy ground', 'Keep it off busy photos. Put it on a quiet part of one.', null],
      ['Outlined or boxed', 'No outlines, boxes or frames around it.', `<div class="g2-boxed" style="border:2px solid ${cw.name}">${svgAt(w - 40, (w - 40) / L.geo.aspect)}</div>`],
    ];
    let body = '', cross = '';
    items.forEach(([title, text, art], i) => {
      const x = 72 + (i % 3) * 296, y = 72 + Math.floor(i / 3) * 200;
      if (art === null) {
        body += `<div class="a ar g2-art" role="img" aria-label="Logo on a busy photograph of ${busyStreet ? 'a shopping street' : 'a back bar'}" style="left:${x}px;top:${y}px;width:${aw}px;height:${ah}px">${busyStreet ? busyStreet.html : photoImg(busy, aw, ah)}<div class="g2-c" style="position:absolute;inset:0">${mark(ctx, 'colour', w, onDark)}</div></div>`;
      } else body += `<div class="a g2-art g2-c" style="left:${x}px;top:${y}px;width:${aw}px;height:${ah}px">${art}</div>`;
      body += el(x, y + ah + 8, 'c13 b ink', A(title), '', aw) + el(x, y + ah + 26, 'c12 ink', A(text), '', aw);
      // the cross: two rows of holes corner to corner, cut through to the bar top (on the photograph they are printed in the field colour)
      cross += `<g fill="${art === null ? R.field : R.hole}">${holeLine(x + 4, y + 4, x + aw - 4, y + ah - 4, 9)}${holeLine(x + 4, y + ah - 4, x + aw - 4, y + 4, 9)}</g>`;
    });
    body += overlay(cross).replace('class="a g2-ov"', 'class="a g2-ov g2-top"');
    const zone = note(72, 532, 520, 'Use the files as they are', A(`Take the logo from the logo folder, in one of its ${L.versions.length} versions, and place it as supplied.`));
    return ticketPage(ctx, R, 'logo-misuse', { body, zone });
  },
};

export function css() {
  return `.pg.g2 .g2-ov{left:0;top:0;width:1280px;height:720px;pointer-events:none}
.pg.g2 .g2-top{z-index:2}
.pg.g2 .g2-x{text-align:center}
.pg.g2 .g2-num{display:flex;align-items:baseline;gap:12px;white-space:nowrap}
.pg.g2 .g2-c{display:flex;align-items:center;justify-content:center}
.pg.g2 .g2-art{overflow:visible}
.pg.g2 .ar.g2-art{overflow:hidden}
.pg.g2 .g2-boxed{padding:16px;display:flex}
.pg.g2 .g2-mslot{box-sizing:border-box;padding:0!important}
.pg.g2 .g2-min .logo-slot{padding:0!important}
.pg.g2 .g2-ph img,.pg.g2 .g2-ph svg.pl{display:block}
.pg.g2 .a > svg{display:block}`;
}
