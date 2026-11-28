// Theme 36, Doorlist: the A4 portrait edition (794 x 1123), pages 1 to 16 (cover, contents, the openers, Brand, Logo, Colour). pages-a4b.js has 17 to 31; pages-a4.js joins them.
// Doorlist stays a door list: margins 40, four columns of 165 with 18 gutters (x 40, 223, 406, 589; right edge 754), rows of 48 from y 40, and the list row at y 1075 to 1123
// (number, name on its bar, venue cell, count). Every page is composed for portrait: nothing is a squeezed 16:9 page, nothing is rotated except the cover's stamp.
// Mockup pages draw designed flat layouts. Encore's words come from showcase.js through copy(); a fallback here is neutral. A slot is real-size ghost type with one mono note,
// and photo slots are colour fields.
import { ratio, hexToRgb } from '../../engine/color.js';
import { SECTIONS, fullFolio, pad, groundsOf, tones, onTone, mix, at, hr, fill, svgAt, field, measure, word, baseTop, ghost, ghostRule, isGhost, hl, PHOTO_NOTE, nameOf as cust, page, n1 } from './kit.js';
import { copy } from './showcase.js';
import { photo } from './photos.js';
import { logoAt, fitW, colours, coloursBy, own, cwKey, cws, colourName } from './pages-2.js';

export const L = 40, R = 754, CW = 714, FOOT = 1075;
const slotOn = (ctx) => ctx.edition === 'slot';
const nt = (ctx, s) => `<span class="nt">${ctx.esc(s)}</span>`;
const gl = (ctx, line) => ghostRule(ctx, line, '');
const sec = (open) => SECTIONS.find((s) => s.open === open);
const logoHtml = (ctx, id, opts) => { try { return ctx.logo.html(id, opts); } catch (e) { const { colourway, ...rest } = opts; return ctx.logo.html(id, rest); } };
const H1 = (txt, x = L, y = 40, w = CW, size = 40) => at(x, y, w, Math.round(size * 1.15), `<h1 class="h1" style="font-size:${size}px;line-height:1.1">${txt}</h1>`);

// ---- the opener, family WB "Wristband": a band y 384 to 672 across the page, the die cut at x 640 setting off the tab, the name fitted to 560 and capped at 128, the section's pages as rows under it ----
function opener(ctx, open) {
  const s = sec(open), n = fullFolio(open), G = groundsOf(ctx), M = measure(ctx), E = ctx.esc;
  const ground = G[s.ground], band = G[s.band], tb = tones(ctx, band), nameInk = onTone(ctx, G[s.ink], band, 3);
  const size = Math.min(128, M.fit(s.name, 560, 128)), cw = s.band === 'red' ? 'reversed' : 'colour';
  const serial = `No. ${copy(ctx, 'page.serial', '0000')}-${pad(n)}`;
  const top = at(L, 40, 400, 16, `<span class="lb">Section ${s.n} of ${SECTIONS.length}</span>`) + hr(L, 64, CW, 'var(--ink)', 2)
    + word(M, L - 6, 340, String(s.n), 250, { style: 'color:var(--soft)' });
  let out = top + fill(0, 384, 794, 288, band) + fill(640, 384, 2, 288, ground)
    + at(L, 408, 580, 16, `<span class="lb" style="color:${tb.ink}">${E(cust(ctx))}. Section ${s.n} of ${SECTIONS.length}. Not transferable.</span>`)
    + word(M, L, 600, E(s.name), size, { style: `color:${nameInk}` })
    + at(681, 454, 72, 72, logoHtml(ctx, 'symbol', { width: 72, colourway: cw }))
    + at(642, 542, 150, 16, `<span class="m" style="color:${tb.ink}">${E(serial)}</span>`, { style: 'text-align:center' });
  s.pages.forEach(([id, name], i) => {
    const y = 720 + i * 64;
    out += hr(L, y, CW, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 2) + at(L, y + 24, 48, 16, `<span class="m q">${pad(fullFolio(id))}</span>`) + word(M, L + 64, y + 42, E(name), 26);
  });
  return page(ctx, open, ground, out);
}

// ---- 1 Cover, family HS "Hand stamp": the record disc cropped by the top and right edges, the name fitted to the measure under it, the line in two ----
function cover(ctx) {
  const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const cx = 570, cy = 300, Rd = 360, disc = slot ? mix(G.night, G.stock, 0.14) : G.red, groove = mix(disc, G.night, slot ? 0.4 : 0.28);
  let rings = '';
  for (let k = 0; k < 48; k++) rings += `<circle cx="${cx}" cy="${cy}" r="${n1(74 + k * (Rd - 90 - 74) / 47)}" fill="none" stroke="${groove}" stroke-width="1"/>`;
  const stamp = svgAt(0, 0, 794, FOOT, `<g transform="rotate(-8 ${cx} ${cy})"><circle cx="${cx}" cy="${cy}" r="${Rd}" fill="${disc}"/>${rings}`
    + `<circle cx="${cx}" cy="${cy}" r="64" fill="${G.night}"/><circle cx="${cx}" cy="${cy}" r="6" fill="${disc}"/><rect x="${cx - 3}" y="${cy - 64}" width="6" height="16" fill="${disc}"/></g>`);
  const nm = cust(ctx) || 'Your name', size = M.fit(nm, CW, 300);
  const mark = word(M, L, 790, E(nm), size) + (slot ? at(L, 806, 600, 16, nt(ctx, 'Your logo, SVG, replaces the name.')) : '');
  const red = onTone(ctx, G.red, G.night, 4.5);
  let line;
  if (slot) line = ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary', 'Your line, one sentence.', { what: false, example: false });
  else {
    const a = copy(ctx, 'page.cover.a', ''), b = copy(ctx, 'page.cover.b', '');
    line = `${E(a)}<br><span style="color:${red}">${E(b)}</span>`;
  }
  const sz = slot ? 44 : n1(Math.min(44, M.fit(copy(ctx, 'page.cover.b', ''), CW, 44)));
  const lead = at(L, 846, CW, 110, line, { cls: 'd', style: `font-size:${sz}px;line-height:1.08;white-space:normal` });
  const ver = copy(ctx, 'page.cover.ver', String(ctx.versionLine || 'Version 1.0'));
  const title = hr(L, 984, CW, 'var(--hair)') + at(L, 1000, CW, 24, `<span class="b">${E(copy(ctx, 'page.cover.title', 'Brand guidelines.'))} ${E(ver)}</span>`, { style: 'color:var(--quiet)' });
  return page(ctx, 'cover', G.night, stamp + mark + lead + title);
}

// ---- 2 Contents, family CL "Clipboard list": the whole list in two columns of 347, rows of 52 from y 178; seven heads and every other page by name ----
function contents(ctx) {
  const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx), RH = 52, CWd = 347;
  const row = (x, y, num, inner, head) => at(x, y, CWd, RH, `<span class="mono13 ${head ? '' : 'q'}" style="position:absolute;left:0;top:17px">${num}</span>${inner}`) + hr(x, y + RH - 1, CWd, 'var(--hair)');
  const items = [{ id: 'cover', t: 'You' }, { id: 'contents', t: 'Contents' }, ...SECTIONS.flatMap((s) => [{ head: s }, ...s.pages.map(([id, t]) => ({ id, t }))])];
  let out = '';
  [items.slice(0, 16), items.slice(16)].forEach((col, ci) => {
    const x = L + ci * 367;
    col.forEach((it, ri) => {
      const y = 178 + ri * RH;
      if (it.head) {
        const s = it.head;
        out += row(x, y, pad(fullFolio(s.open)), `<span style="position:absolute;left:56px;top:18px;width:16px;height:16px;background:${G[s.band]};border:1px solid ${G.night}"></span><span class="lb" style="position:absolute;left:84px;top:18px">${E(s.name)}</span>`, true);
      } else {
        const label = it.id === 'cover' ? hl(ctx, E(it.t)) : E(it.t);
        out += row(x, y, pad(fullFolio(it.id)), `<span style="position:absolute;left:56px;top:0;line-height:52px;white-space:nowrap">${label}</span>`);
      }
    });
  });
  const title = word(M, L, 104, E(copy(ctx, 'page.contents.title', 'Contents')), 52);
  const line = slot ? gl(ctx, 'Your event or company, one line.') : E(copy(ctx, 'page.contents.line', ''));
  return page(ctx, 'contents', G.stock, title + at(L, 124, CW, 28, `<span class="b q" style="color:var(--quiet)">${line}</span>`) + hr(L, 176, CW, 'var(--ink)', 2) + out);
}

// ---- 4 Who we are, family BR "Back of the room": the photograph to y 1075 at its 3:4 crop, the sentence in the dark of the crowd, one body line under it ----
function who(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = slotOn(ctx);
  const desc = copy(ctx, 'description'), ghosted = slot && isGhost(ctx, desc);
  const h1 = ghosted ? ghostRule(ctx, 'What the brand is, in one sentence.', '15 to 25 words.') : E(desc);
  let pic, note = '';
  if (!slot) pic = at(0, 0, 794, FOOT, photo(ctx, 'IMG-01', { w: 794, h: FOOT, fx: 0.5, fy: 0.62 }));
  else {
    pic = field(ctx, 0, 0, 794, FOOT, G.stage, svgAt(0, 0, 794, FOOT, `<circle cx="760" cy="${FOOT / 2}" r="470" fill="${mix(G.stage, G.stock, 0.1)}"/>`));
    note = at(L, 1000, 640, 40, nt(ctx, PHOTO_NOTE));
  }
  const ink = tones(ctx, slot ? G.stage : G.night).ink;
  const head = at(L, 520, 620, 360, `<h1 class="h1 whog" style="font-size:42px;line-height:1.1;color:${ink}">${h1}</h1>`, { style: 'display:flex;align-items:flex-end' });
  const bodyTxt = slot ? gl(ctx, 'One line on who it is for.') : E(copy(ctx, 'page.who.body', ''));
  const body = at(L, baseTop(944, 16, 24), 620, 24, `<div class="b" style="color:${ink}">${bodyTxt}</div>`);
  return page(ctx, 'who', slot ? G.stage : G.night, pic + head + body + note);
}

// ---- 5 Voice, family VL "Volumes": three registers stacked and ruled, each set at its own volume, the rule beside its label ----
function voice(ctx) {
  const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, slot = slotOn(ctx);
  const reg = (y, label, k) => hr(L, y, CW, 'var(--hair)') + at(L, y + 16, 165, 16, `<span class="lb">${label}</span>`)
    + (slot ? '' : at(223, y + 12, 531, 24, `<div class="b" style="color:var(--quiet)">${E(copy(ctx, `page.voice.rule.${k}`, ''))}</div>`));
  const lines = [0, 1, 2].map((i) => copy(ctx, `page.voice.${i}`, ''));
  const psz = slot ? 72 : n1(Math.min(96, ...lines.map((l) => M.fit(l, CW, 96))));
  const poster = slot ? gl(ctx, 'A line for a poster') : lines.map((l) => E(l)).join('<br>');
  const ticket = slot ? gl(ctx, 'A line for a ticket, with names and a place') : E(copy(ctx, 'page.voice.t', ''));
  const small = slot ? gl(ctx, 'A line of small print') : E(copy(ctx, 'page.voice.s', ''));
  const out = reg(40, 'Poster', 0) + at(L, 96, CW, 330, `<div class="big" style="font-size:${psz}px;line-height:.92;text-wrap:wrap">${poster}</div>`)
    + reg(480, 'Ticket', 1) + at(L, 540, CW, 190, `<div class="big" style="font-size:34px;line-height:1.22;text-wrap:pretty">${ticket}</div>`)
    + reg(860, 'Small print', 2) + at(L, 920, 560, 60, `<div class="b">${small}</div>`)
    + (slot ? at(L, 1000, 640, 32, nt(ctx, 'One line for each register, set at the size it is set.'))
      : hr(L, 976, CW, 'var(--hair)') + [['Poster', `${psz} px`], ['Ticket', '34 px'], ['Small print', '17 px'], ['Poster to small', `${n1(psz / 17)} to 1`]]
        .map(([k, v], i) => at(L + i * 183, 992, 165, 40, `<span class="lb q">${k}</span><div class="m13" style="margin-top:6px">${v}</div>`)).join(''));
  return page(ctx, 'voice', G.night, out);
}

// ---- 6 Words, family HL "Highlighted list": the boilerplate, then one list of six rows of 118; lines the brand says are highlighted, lines it turns away are set quiet ----
function words(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = slotOn(ctx), RH = 118;
  const boiler = ghost(ctx, copy(ctx, 'voice.boilerplate25'), 'voice.boilerplate25', 'The brand in about 30 words.');
  let out = at(L, 40, CW, 190, `<p class="big" style="font-size:27px;line-height:35px">${boiler}</p>`) + hr(L, 244, CW, 'var(--ink)', 2);
  const lines = [];
  for (let i = 0; i < 3; i++) lines.push([copy(ctx, `voice.writeThis.${i}.write`), true]);
  for (let i = 0; i < 3; i++) lines.push([copy(ctx, `voice.writeThis.${i}.not`), false]);
  lines.forEach(([v, keep], i) => {
    const y = 246 + i * RH, ghosted = slot && isGhost(ctx, v), txt = ghosted ? gl(ctx, keep ? 'A line you say' : 'A line you don\'t') : E(v);
    const h2 = keep ? (ghosted ? `<span class="hl" style="display:inline-block;--quiet:${tones(ctx, G.red).ink};--soft:${tones(ctx, G.red).ink}">${txt}</span>` : hl(ctx, txt)) : txt;
    out += at(L, y + (RH - 16) / 2, 48, 16, `<span class="mono13 q">${pad(i + 1)}</span>`)
      + at(96, y, 520, RH, `<div class="h2" style="font-size:24px;line-height:32px;${keep ? '' : 'color:var(--quiet)'}">${h2}</div>`, { style: 'display:flex;align-items:center' })
      + at(640, y + (RH - 16) / 2, 114, 16, `<span class="lb ${keep ? '' : 'q'}">${keep ? 'In' : 'Turned away'}</span>`)
      + hr(L, y + RH - 1, CW, 'var(--hair)');
  });
  if (slot) out += at(96, 972, 600, 16, nt(ctx, 'Three lines you say, three you do not, in your own voice.'));
  return page(ctx, 'words', G.stock, out);
}

// ---- 8 The mark, family PP "Print and press": the photograph across the top, the mark at 354 on Night under it with the sentence beside ----
function mark(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, slot = slotOn(ctx), t = tones(ctx, G.night), PH = 500;
  const pic = slot ? field(ctx, 0, 0, 794, PH, G.red, at(L, PH - 60, CW, 48, nt(ctx, PHOTO_NOTE))) : at(0, 0, 794, PH, photo(ctx, 'IMG-02', { w: 794, h: PH, fx: 0.5, fy: 0.45 }));
  const lg = logoAt(ctx, 'symbol', 354, { colourway: cwKey(ctx, 'colour'), color: t.ink });
  const text = `<div class="h2">${E(copy(ctx, 'page.mark.title', 'The mark as drawn.'))}</div><div class="b" style="margin-top:10px;font-size:15px;line-height:22px;color:var(--quiet)">${E(copy(ctx, 'page.mark.text', 'Use the mark as drawn. Never redraw, stretch or recolour it.'))}</div>`;
  const cap = slot ? '' : at(L, PH + 14, CW, 18, `<span class="m q">${E(copy(ctx, 'page.mark.cap', ''))}</span>`);
  return page(ctx, 'mark', G.night, pic + cap + H1('The mark', L, 568, 330) + hr(L, 640, 330, 'var(--hair)') + at(L, 656, 330, 180, text)
    + hr(L, 968, CW, 'var(--hair)') + [['Tile', '354 px here'], ['Clear space', '88 px, a quarter'], ['Tile colour', String(G.red).toUpperCase()], ['Mark colour', String(t.ink).toUpperCase()]]
      .map(([k, v], i) => at(L + i * 183, 984, 165, 40, `<span class="lb q">${k}</span><div class="m13" style="margin-top:6px">${v}</div>`)).join('')
    + at(400, 568, lg.w, lg.h, lg.html) + (slot ? at(400, 936, 354, 16, nt(ctx, 'Your mark, SVG.')) : ''));
}

// ---- 9 Versions, family TR "Ticket roll": the roll runs down the page, five tickets of 170 torn along horizontal perforations, each a lockup on its own pair ----
function versions(ctx) {
  const G = groundsOf(ctx), E = ctx.esc, g = G.stage, t = tones(ctx, g), TH = 166, Y0 = 170;
  const defs = [
    { id: 'colour', key: 'mono-light', fb: 'Dark ground', mw: 216, mh: 110 },
    { id: 'stacked', key: 'colour', fb: 'Light ground', mw: 216, mh: 112 },
    { id: 'horizontal', key: 'reversed', fb: 'Signal ground', mw: 232, mh: 90 },
    { id: 'symbol', key: 'on-stage', fb: 'Second dark', mw: 92, mh: 92, alt: 'mono-light' },
    { id: 'colour', key: 'mono-dark', fb: 'One colour', mw: 216, mh: 110 },
  ];
  let out = '';
  defs.forEach((d, i) => {
    const key = cwKey(ctx, d.key, d.alt || 'colour'), cw = cws(ctx)[key] || {}, ground = cw.ground || G.stock, gt = tones(ctx, ground);
    const y = Y0 + i * TH, w = fitW(ctx, d.id, d.mw, d.mh), lg = logoAt(ctx, d.id, w, { colourway: key, color: gt.ink });
    const inner = at((300 - lg.w) / 2, (TH - lg.h) / 2, lg.w, lg.h, lg.html)
      + `<div class="a" style="left:318px;top:0;width:2px;height:${TH}px;background:repeating-linear-gradient(to bottom,${g} 0 6px,transparent 6px 12px)"></div>`
      + at(348, 38, 340, 16, `<span class="m q">${pad(i + 1)}</span>`)
      + at(348, 62, 340, 24, `<div class="lb">${E(copy(ctx, `page.versions.${i}`, d.fb))}</div>`)
      + at(348, 84, 340, 40, `<div class="cap" style="line-height:18px">${colourName(ctx, gt.ink)} on ${colourName(ctx, ground)}</div>`);
    out += field(ctx, L, y, CW, TH, ground, inner, ratio(ground, g) < 1.6 ? `box-shadow:inset 0 0 0 1px ${t.hair}` : '');
  });
  let perf = '';
  for (let k = 1; k < 5; k++) {
    const y = Y0 + k * TH;
    perf += svgAt(L - 8, y - 8, CW + 16, 16, `<line x1="8" y1="8" x2="${CW + 8}" y2="8" stroke="${g}" stroke-width="2" stroke-dasharray="6 6"/><circle cx="8" cy="8" r="8" fill="${g}"/><circle cx="${CW + 8}" cy="8" r="8" fill="${g}"/>`);
  }
  const lead = at(L, 100, 560, 48, `<div class="b">${E(copy(ctx, 'page.versions.text', 'Each version is made for one ground. Use the one that fits the ground; never put one on another.'))}</div>`);
  return page(ctx, 'versions', g, H1('Versions') + lead + out + perf + at(L, Y0 + 5 * TH + 14, CW, 18, '<span class="cap q">Each ticket is drawn at the size it is shown, on the ground it is made for.</span>'));
}

// ---- 10 Space and size, family CR "Clear ring": the mark in its ring of clear space on Door red, then the wristband at actual size and the smallest size ----
function space(ctx) {
  const G = groundsOf(ctx), g = G.red, t = tones(ctx, g), E = ctx.esc, M = measure(ctx);
  const S = 256, q = S / 4, cx = 397, cy = 410, half = S / 2 + q, Rr = half * Math.SQRT2;
  const lg = logoAt(ctx, 'symbol', S, { colourway: cwKey(ctx, 'mono-dark'), color: t.ink });
  const ring = svgAt(0, 0, 794, FOOT, `<circle cx="${cx}" cy="${cy}" r="${n1(Rr)}" fill="none" stroke="${t.ink}" stroke-width="1"/>`
    + `<rect x="${cx - half + .5}" y="${cy - half + .5}" width="${half * 2 - 1}" height="${half * 2 - 1}" fill="none" stroke="${t.ink}" stroke-width="1" stroke-dasharray="4 4"/>`
    + `<path d="M${cx - half} ${cy - half - 14}V${cy - half - 4}M${cx - S / 2} ${cy - half - 14}V${cy - half - 4}M${cx - half} ${cy - half - 9}H${cx - S / 2}" stroke="${t.ink}" stroke-width="1" fill="none"/>`);
  const dim = at(cx - S / 2 + 8, cy - half - 21, 60, 16, '<span class="m">g</span>');
  const min = ctx.logo.minSize, mw = min.screenPx, by = 780;
  const bt = tones(ctx, G.stock), bl = logoAt(ctx, 'colour', mw, { colourway: cwKey(ctx, 'colour'), color: bt.ink });
  const band = field(ctx, L, by, 472, 94, G.stock, at(24, (94 - bl.h) / 2, bl.w, bl.h, bl.html)) + fill(L, by, 472, 94, 'transparent', `border:1px solid ${t.ink}`);
  const words = at(L, 96, CW, 48, `<div class="b" style="color:${t.ink}">${E(copy(ctx, 'page.space.text', 'Clear space: g on every side, where g is a quarter of the tile. Nothing enters the ring.'))}</div>`);
  const szw = Math.min(72, M.fit(`${min.screenPx} px`, 214, 72));
  const small = at(540, by - 26, 214, 16, '<span class="lb">Smallest</span>') + word(M, 540, by + 60, `${min.screenPx} px`, szw, { style: `color:${t.ink}` })
    + at(540, by + 76, 214, 40, `<div class="m13">on screen</div><div class="m13" style="margin-top:2px">${min.printMm} mm in print</div>`);
  return page(ctx, 'space', g, H1('Space and size', L, 40, CW, Math.min(40, n1(M.fit('Space and size', CW, 40) * 0.97))) + words + ring + dim + at(cx - S / 2, cy - S / 2, lg.w, lg.h, lg.html)
    + hr(L, by - 48, CW, t.ink) + at(L, by - 26, 472, 16, '<span class="lb">Wristband, 25 mm deep, actual size</span>') + band + small
    + hr(L, 960, CW, t.ink) + [['Tile on this page', `${S} px`], ['Clear space', `${q} px`], ['Ring radius', `${Math.round(Rr)} px`], ['Wristband depth', '25 mm']]
      .map(([k, v], i) => at(L + i * 183, 976, 165, 40, `<span class="lb">${k}</span><div class="m13" style="margin-top:6px">${v}</div>`)).join(''));
}

// ---- 11 Misuse, family VT "Void tickets": two rows of three tickets stamped void, the misuse above the tear and the reason under the ticket ----
function misuse(ctx) {
  const G = groundsOf(ctx), g = G.night, E = ctx.esc, st = tones(ctx, G.stock), slot = slotOn(ctx), W = 224, H = 330, WS = W - 32;
  const reasons = [
    copy(ctx, 'page.misuse.0', 'Mirrored.'), copy(ctx, 'page.misuse.1', 'Stretched.'), copy(ctx, 'page.misuse.2', 'Rotated.'),
    `${colourName(ctx, G.red)} on ${colourName(ctx, G.stage)}, small.`, copy(ctx, 'page.misuse.4', 'Outline only.'), copy(ctx, 'page.misuse.5', 'Over a face in a photo.'),
  ];
  const outline = (html) => (slot ? html : html.replace(/fill="[^"]*"/g, `fill="none" stroke="${st.ink}" stroke-width="1.5" vector-effect="non-scaling-stroke"`));
  const win = (i) => {
    const cw = cwKey(ctx, 'colour'), ink = st.ink;
    if (i === 0) return { l: logoAt(ctx, 'colour', 144, { colourway: cw, color: ink }), style: 'transform:scaleX(-1)' };
    if (i === 1) return { l: logoAt(ctx, 'symbol', 100, { colourway: cw, color: ink }), style: 'transform:scaleX(1.7)' };
    if (i === 2) return { l: logoAt(ctx, 'colour', 144, { colourway: cw, color: ink }), style: 'transform:rotate(-16deg)' };
    if (i === 3) return { l: logoAt(ctx, 'colour', 76, { colourway: cw, fill: G.red, color: G.red }), style: '', bg: G.stage };
    if (i === 4) { const l = logoAt(ctx, 'colour', 154, { colourway: cw, color: ink }); return { l: { ...l, html: outline(l.html) }, style: '' }; }
    return { l: logoAt(ctx, 'colour', 144, { colourway: cwKey(ctx, 'mono-light'), color: tones(ctx, G.stage).ink }), style: '', photo: true };
  };
  let out = '';
  for (let i = 0; i < 6; i++) {
    const x = L + (i % 3) * 245, y = 140 + Math.floor(i / 3) * 410, w = win(i), bg = w.bg || null;
    let inner = fill((W - 24) / 2, 18, 24, 24, G.red, 'border-radius:50%');
    inner += w.photo
      ? (slot ? fill(16, 60, WS, WS, mix(G.stage, G.night, 0.5)) : at(16, 60, WS, WS, photo(ctx, 'IMG-01', { w: WS, h: WS, fx: 0.38, fy: 0.78, zoom: 3 })))
      : fill(16, 60, WS, WS, bg || 'transparent', `border:1px solid ${bg ? bg : 'var(--hair)'}`);
    inner += at(16 + (WS - w.l.w) / 2, 60 + (WS - w.l.h) / 2, w.l.w, w.l.h, `<div style="width:${n1(w.l.w)}px;height:${n1(w.l.h)}px;${w.style}">${w.l.html}</div>`);
    inner += svgAt(0, 284, W, 2, `<line x1="0" y1="1" x2="${W}" y2="1" stroke="${st.ink}" stroke-width="2" stroke-dasharray="6 6"/>`) + at(16, 298, 152, 16, '<span class="lb">Void</span>');
    out += field(ctx, x, y, W, H, G.stock, inner)
      + at(x, y + H + 16, W, 80, `<div class="m q">${pad(i + 1)}</div><div class="b" style="font-size:15px;line-height:22px;margin-top:4px">${reasons[i].includes('<') ? reasons[i] : E(reasons[i])}</div>`);
  }
  const lead = at(L, 92, CW, 28, `<div class="b" style="color:var(--quiet)">${E(copy(ctx, 'page.misuse.text', 'Six ways the mark goes wrong. Each one is void.'))}</div>`);
  return page(ctx, 'misuse', g, H1('Misuse') + lead + out);
}

// ---- 13 Palette, family RG "Record rings": the record at 714 wide across the top, each colour a ring sized by its share; the names run along the foot, led up to their rings by 1 px lines ----
function palette(ctx) {
  const G = groundsOf(ctx), g = G.stock, t = tones(ctx, g), E = ctx.esc, lum = (h) => ratio(h, '#000000');
  const all = colours(ctx), first = all.find((c) => c.role === 'action') || all[0];
  const cs = [first, ...all.filter((c) => c !== first).sort((a, b) => lum(b.hex) - lum(a.hex))];
  const tot = cs.reduce((a, c) => a + (c.share || 0), 0) || 1, CX = 397, RMAX = 357, CY = 76 + RMAX, N = cs.length, LY = 846;
  let cum = 0;
  const rings = cs.map((c) => { cum += (c.share || 0) / tot; return { c, R: RMAX * Math.sqrt(cum) }; });
  rings.forEach((r, i) => { r.r = i ? rings[i - 1].R : 0; r.rm = (r.R + r.r) / 2; r.i = i; });
  const gap = N > 4 ? 12 : 18, cw = (CW - (N - 1) * gap) / N, colX = (k) => L + k * (cw + gap), lead = (k) => colX(k) + 16;
  // inner rings take the columns nearest the middle
  const free = cs.map((_, k) => k);
  [...rings].sort((a, b) => a.rm - b.rm).forEach((r) => { free.sort((a, b) => Math.abs(lead(a) - CX) - Math.abs(lead(b) - CX)); r.col = free.shift(); });
  const edge = (hex) => ratio(hex, g) < 1.3;
  let svg = '', lines = '', text = '';
  [...rings].reverse().forEach((r) => { svg += `<circle cx="${CX}" cy="${CY}" r="${n1(r.R)}" fill="${r.c.hex}"${edge(r.c.hex) ? ` stroke="${t.ink}" stroke-width="1"` : ''}/>`; });
  const Rt = rings[rings.length - 1].R;
  rings.forEach((r) => {
    const lx = lead(r.col), dx = lx - CX, yOf = (rad) => CY + Math.sqrt(Math.max(rad * rad - dx * dx, 0));
    const rr = Math.min(r.R - 6, Math.max(r.r + 6, r.rm, Math.abs(dx) + 8)), pin = yOf(Math.max(rr, Math.abs(dx) + 1));
    if (Math.abs(dx) < Rt) lines += fill(lx, yOf(Rt), 1, LY - yOf(Rt), t.ink);
    else lines += fill(lx, pin, 1, LY - pin, t.ink);
    if (Math.abs(dx) < Rt) {
      for (let j = rings.length - 1; j >= r.i; j--) {
        const top = j === r.i ? pin : yOf(rings[j].r), bot = yOf(rings[j].R);
        lines += fill(lx, top, 1, Math.max(bot - top, 0), tones(ctx, rings[j].c.hex).ink);
      }
    }
    svg += `<circle cx="${n1(lx)}" cy="${n1(pin)}" r="3.5" fill="${tones(ctx, r.c.hex).ink}"/>`;
    const c = r.c, rgb = hexToRgb(c.hex).join(' '), pct = Math.round(((c.share || 0) / tot) * 100);
    const lands = c.lands ? `<div class="b" style="font-size:13px;line-height:18px;margin-top:8px;color:var(--quiet);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">${own(ctx, c.lands)}</div>` : '';
    text += at(colX(r.col), LY + 14, cw, 190, `<div class="h2" style="font-size:18px;line-height:22px;overflow-wrap:anywhere">${own(ctx, c.name)}</div><div class="m13" style="margin-top:6px">${c.hex.toUpperCase()}</div><div class="m13" style="margin-top:2px">${rgb}</div><div class="m13" style="margin-top:2px">${pct}%</div>${lands}`);
  });
  return page(ctx, 'palette', g, at(L, 40, 520, 16, '<span class="lb">Rings sized by share of use</span>') + svgAt(0, 0, 794, FOOT, svg) + hr(L, LY, CW, 'var(--ink)') + lines + text);
}

// ---- 14 Tints, family WS "Wristband stack": a stack of wristbands for each hue, one band to a step, each counted in like the list; the base step wears the highlighter bar ----
function tints(ctx) {
  const G = groundsOf(ctx), g = G.night, t = tones(ctx, g), E = ctx.esc;
  const hues = coloursBy(ctx).filter((c) => c.ramp && Object.keys(c.ramp).length && (c.role !== 'ground' || ctx.colours.length <= 3)).slice(0, 3);
  const n = hues.length || 1, gap = 18, cw = (CW - (n - 1) * gap) / n;
  let out = '';
  hues.forEach((h, k) => {
    const x = L + k * (cw + gap), keys = Object.keys(h.ramp), N = keys.length, sh = Math.min(84, Math.floor(870 / N));
    const base = keys.find((q) => String(h.ramp[q]).toLowerCase() === h.hex.toLowerCase()) || keys[Math.floor(N / 2)];
    out += at(x, 40, cw, 56, `<div class="h2" style="line-height:26px">${own(ctx, h.name)}</div><div class="m13 q" style="margin-top:4px">Base ${E(base)}, ${h.hex.toUpperCase()}</div>`) + hr(x, 104, cw, 'var(--ink)', 2);
    keys.forEach((q, j) => {
      const hex = String(h.ramp[q]), y = 112 + j * sh, bt = tones(ctx, hex), mine = q === base;
      const key = mine ? `<span class="hlbar" style="background:${G.red};color:${tones(ctx, G.red).ink};outline:2px solid ${bt.ink};outline-offset:1px;margin-left:0;font:600 13px/22px var(--body)">${E(q)}</span>` : `<span class="m13">${E(q)}</span>`;
      out += field(ctx, x, y, cw, sh, hex, at(14, (sh - 22) / 2, 80, 22, key, { style: 'line-height:22px' })
        + at(cw - 114, (sh - 38) / 2, 100, 38, `<span class="m" style="display:block;text-align:right">${hex.toUpperCase()}</span><span class="m13" style="display:block;text-align:right;margin-top:2px">${mine ? 'In: ' : ''}${j + 1} of ${N}</span>`), `box-shadow:inset 0 0 0 1px ${t.hair}`);
    });
  });
  return page(ctx, 'tints', g, out + at(L, 1004, CW, 18, `<span class="cap q">${E(copy(ctx, 'page.tints.text', 'The bar marks the colour itself. Every other step is its tint or shade, counted in.'))}</span>`));
}

// ---- 15 Pairs, family RB "Run-on band": six full-width rows, one pair each, with the line set in each pair at the width of the measure ----
function pairs(ctx) {
  const G = groundsOf(ctx), g = G.stage, M = measure(ctx), E = ctx.esc;
  const seen = new Set(), pool = ctx.pairs.filter((p) => { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  pool.sort((a, b) => (b.ratio < 4.5 ? 1 : 0) - (a.ratio < 4.5 ? 1 : 0));
  const picked = [], used = new Set();
  for (const p of pool) if (picked.length < 6 && !used.has(p.bgHex.toLowerCase())) { picked.push(p); used.add(p.bgHex.toLowerCase()); }
  for (const p of pool) if (picked.length < 6 && !picked.includes(p)) picked.push(p);
  const rej = new Set(picked.map((p) => `${p.fgHex}|${p.bgHex}`.toLowerCase()));
  for (const p of ctx.unusedPairs || []) { const k = `${p.fgHex}|${p.bgHex}`.toLowerCase(); if (picked.length < 6 && !rej.has(k)) { rej.add(k); picked.push({ ...p, use: 'Not used for text' }); } }
  for (let i = 1; i < picked.length; i++) if (picked[i].bgHex === picked[i - 1].bgHex) { const j = picked.findIndex((q, k) => k > i && q.bgHex !== picked[i - 1].bgHex); if (j > 0) [picked[i], picked[j]] = [picked[j], picked[i]]; }
  const N = picked.length || 1, RH = FOOT / N, line = E(copy(ctx, 'page.pairs.line', 'Read this line.'));
  const size = n1(Math.min(96, M.fit(line.replace(/&[a-z#0-9]+;/g, 'x'), CW, 96)));
  const out = picked.map((p, i) => {
    const y = Math.round(i * RH), h = (i === N - 1 ? FOOT : Math.round((i + 1) * RH)) - y, r = p.ratio, floor = p.minSize || (r >= 4.5 ? 0 : r >= 3 ? 24 : 999), bad = floor >= 999;
    const head = at(L, 24, 480, 22, `<div class="h2" style="font-size:16px;line-height:22px">${colourName(ctx, p.fgHex)} on ${colourName(ctx, p.bgHex)}</div>`)
      + at(L, 48, 480, 16, `<div class="cap" style="font-size:12px;line-height:16px">${own(ctx, p.use)}</div>`)
      + at(554, 24, 200, 18, `<div class="m13" style="text-align:right">${p.ratioText}:1</div>`) + at(554, 44, 200, 16, `<div class="m" style="text-align:right">${bad ? 'Not for text' : floor ? `${floor} px and up` : 'Any size'}</div>`);
    const run = word(M, L, h - 26, line, size, { style: `color:${p.fgHex};${bad ? 'text-decoration:line-through;text-decoration-thickness:4px' : ''}` });
    return field(ctx, 0, y, 794, h, p.bgHex, head + `<div data-contrast="demo">${run}</div>`);
  }).join('');
  return page(ctx, 'pairs', g, out);
}

// ---- 16 Values, family FC "Full-height columns": every colour a full-width row, its name and wording left, the share of use big in the middle, the values at the right ----
function values(ctx) {
  const G = groundsOf(ctx), g = G.night, E = ctx.esc, M = measure(ctx);
  const allShare = colours(ctx).reduce((q, c) => q + (c.share || 0), 0), cs = coloursBy(ctx).slice(0, 5), N = cs.length || 1, RH = FOOT / N;
  const hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4);
  const out = cs.map((c, i) => {
    const y = Math.round(i * RH), h = (i === N - 1 ? FOOT : Math.round((i + 1) * RH)) - y, rgb = hexToRgb(c.hex).join(' ');
    const rS = ratio(c.hex, G.stock).toFixed(1), rN = ratio(c.hex, G.night).toFixed(1), pct = Math.round(((c.share || 0) / (allShare || 1)) * 100);
    const lands = c.lands ? `<div class="b" style="font-size:14px;line-height:20px;max-width:340px">${own(ctx, c.lands)}</div>` : '';
    const nsz = Math.min(90, Math.round(h * 0.38)), size = Math.min(nsz, M.fit(String(pct), 160, nsz));
    const num = allShare > 0 ? word(M, 223, h - 44, String(pct), size, { style: `color:${tones(ctx, c.hex).soft}` }) + at(223, h - 34, 160, 16, '<span class="lb q">% of use</span>') : '';
    const vals = `<div class="m13">${c.hex.toUpperCase()}</div><div class="m13" style="margin-top:4px">RGB ${rgb}</div>`
      + (hasCmyk ? `<div class="m13" style="margin-top:4px">CMYK ${Array.isArray(c.cmyk) ? c.cmyk.join(' ') : 'Not set'}</div>` : '')
      + `<div class="m13" style="margin-top:4px">${rS}:1 on ${colourName(ctx, G.stock)}</div><div class="m13" style="margin-top:4px">${rN}:1 on ${colourName(ctx, G.night)}</div>`;
    return field(ctx, 0, y, 794, h, c.hex, at(L, 24, 60, 16, `<span class="m q">${pad(i + 1)}</span>`)
      + at(L, 48, 165, 100, `<h2 class="h1" style="font-size:${N > 4 ? 22 : 28}px;overflow-wrap:anywhere">${own(ctx, c.name)}</h2>`) + at(223, 24, 348, 90, lands) + num
      + hr(589, 24, 165, 'var(--ink)') + at(589, 36, 165, h - 48, vals));
  }).join('');
  return page(ctx, 'values', g, out);
}

export const a4a = {
  cover, contents,
  'open-brand': (ctx) => opener(ctx, 'open-brand'), who, voice, words,
  'open-logo': (ctx) => opener(ctx, 'open-logo'), mark, versions, space, misuse,
  'open-colour': (ctx) => opener(ctx, 'open-colour'), palette, tints, pairs, values,
  'open-type': (ctx) => opener(ctx, 'open-type'), 'open-layout': (ctx) => opener(ctx, 'open-layout'), 'open-use': (ctx) => opener(ctx, 'open-use'), 'open-close': (ctx) => opener(ctx, 'open-close'),
};
export { opener, cover, palette };
