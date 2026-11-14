// Theme 22, Ticket: the six gate pages (cover, personality, palette, typefaces, layouts, signage). Round 2 adds the other 27.
import { plateImg } from '../../engine/plate.js';
import { A, px, T, page, roles, fitBlock, textWidth, inkWidth, lineTop, trackOf, weightName, listAnd, longDate, checkWordmark } from './helpers.js';
import { sheetArt, screenArt, posterArt, ticketArt } from './art.js';
import { isStreet, signageStreet } from './street.js';
// the night scenes from the new library: the door poster under its wall lamp, the ticket on the bar top
const NIGHT_POSTER = 'late-door-poster', NIGHT_TICKET = 'late-bar-ticket';

// an absolutely placed element inside .ct
const el = (x, y, cls, text, style = '', w = null) => `<div class="a ${cls}" style="left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${style}">${text}</div>`;
// a dark-zone note: a 15/22 name in paper over a 15/22 line in the quiet colour
const note = (x, y, w, name, text, gap = 0) => `<div class="a zone" style="left:${px(x)};top:${px(y)};width:${px(w)}"><div class="c15 b paper">${name}</div><div class="c15 qt" style="margin-top:${gap}px">${text}</div></div>`;

export const guidelines = {
  // ---- 001: the logo at extreme scale is the one element ----
  cover: (ctx) => {
    checkWordmark(ctx);
    const R = roles(ctx), B = ctx.brand, asp = ctx.logo.geo.aspect;
    const lw = Math.min(864, 216 * asp), lh = lw / asp;
    const logo = `<div class="a" style="left:72px;top:88px;width:${px(lw)};height:${px(lh)}">${ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.field), color: R.inkOn(R.field, 13, 400, '(Logo slot frame)'), label: 'Logo' })}</div>`;
    // the tagline is the brand's second line: the first is the personality page's headline and the poster's
    const line = `<div class="a c24 ink" style="left:72px;bottom:${720 - 444}px;width:600px">${A(B.lines.others[0])}</div>`;
    // the dark zone: what the brand is, in the left two thirds (a 24/32 paragraph of its own description), and the document's facts stacked under the stub's column
    const facts = [['Version', B.version.number], ['Issued', longDate(B.version.date)], B.city ? ['From', B.city] : null].filter(Boolean);
    const zone = el(72, 532, 'c24 paper', A(B.description), 'font-weight:400', 560)
      + facts.map(([k, v], i) => note(T.inX, 532 + i * 52, T.inW, A(k), A(v))).join('');
    return page(ctx, R, 'cover', { cover: true, body: logo + line, zone });
  },

  // ---- 004: the brand's messaging at the size a door poster would print it; this one is on a Stock ticket ----
  personality: (ctx) => {
    const R = roles(ctx).onPaper(), B = ctx.brand;
    const big = fitBlock(ctx, B.lines.primary, { x: 72, y: 80, w: 864, max: 128, min: 72, maxLines: 2, color: R.fieldInk });
    const slot = ctx.edition === 'slot';   // slot placeholders are boxes, not text: rows get a fixed height and the compact form (ph-tight)
    const second = el(72, 428, `c24 ink${slot ? ' ph-tight' : ''}`, A(B.lines.others[1]), 'font-weight:600', 600);
    // the three traits as rows of a fare table: the name in a narrow column, what it means beside it (not the three equal columns of the other pages)
    let ty = 532;
    const traits = B.personality.slice(0, 3).map((t) => {
      const n = slot ? 1 : Math.max(1, Math.ceil(textWidth(ctx, 'body', t.means, 15) / (640 * 0.94))), y = ty;
      ty += n * 22 + (slot ? 28 : 14);
      const tc = slot ? ' ph-tight' : '';
      return `<div class="a c15 b paper${tc}" style="left:72px;top:${y}px;width:200px">${A(t.trait)}</div><div class="a c15 qt${tc}" style="left:296px;top:${y}px;width:640px">${A(t.means)}</div>`;
    }).join('');
    return page(ctx, R, 'personality', { body: big.html + second, zone: traits });
  },

  // ---- 018: the "Aa" is the one extreme element; the three families sit beside it, each in its own face ----
  typefaces: (ctx) => {
    const R = roles(ctx), B = ctx.brand, F = B.fonts, tr = trackOf(ctx), scale = B.type.scale;
    let size = 340, ink = inkWidth(ctx, 'display', 'Aa', size, tr);
    while (size > 40 && ink.w > 400) { size -= 2; ink = inkWidth(ctx, 'display', 'Aa', size, tr); }
    const aa = `<div class="a disp" style="left:${px(72 - ink.x1)};top:${px(lineTop(ctx, 'display', size, size, 452))};font-size:${size}px;line-height:${size}px;letter-spacing:${tr}em;color:${R.fieldInk};white-space:nowrap">Aa</div>`;
    const axes = F.display.axes ? `, ${F.display.axes.replace(/^wdth/, 'width')}` : '';
    const usedFor = (face) => (scale.find((s) => s.face === face) || {}).use || '';
    const monoRule = (B.type.rules || []).find((r) => /mono/i.test(r.do));
    const monoLine = monoRule ? `Weight ${F.mono.weights[0]}. ${(s => s[0].toUpperCase() + s.slice(1))(monoRule.do.replace(/^Use the mono face /i, ''))}` : `Weight ${F.mono.weights[0]}. Literal values only.`;
    const wordsX = F.body.weights.map((w) => `<span style="font-weight:${w}">${weightName(w)}</span>`).join('');
    // the two family names are equals: both 36 px, the display face at its one weight and the body face at its heaviest
    const bodyHeavy = Math.max(...F.body.weights);
    const right = el(516, 72, 'disp ink nw', A(F.display.family), `font-size:36px;line-height:40px;letter-spacing:${tr}em;color:${R.fieldInk}`, 420)
      + el(516, 120, 'c13 ink', `Weight${F.display.weights.length > 1 ? 's' : ''} ${F.display.weights.join(', ')}${axes}<br>${A(usedFor('display'))}`, '', 420)
      + el(516, 196, 'ink nw', A(F.body.family), `font:${bodyHeavy} 36px/40px var(--body);letter-spacing:-0.01em;color:${R.fieldInk}`, 420)
      + el(516, 244, 'c13 ink', `Weights ${listAnd(F.body.weights)}<br>${A(usedFor('body'))}`, '', 420)
      + el(516, 296, 'c20 ink', wordsX, `display:flex;gap:24px;color:${R.fieldInk}`, 420)
      + el(516, 388, 'ink nw', A(F.mono.family), `font:${F.mono.weights[0]} 20px/28px var(--mono);color:${R.fieldInk}`, 420)
      + el(516, 420, 'c12 ink', A(monoLine), '', 420);
    // the character set at +0.05 em (the display face's tight tracking fuses its letters at this size; +0.01 and +0.025 still left IJKL, MNO and ghijkl within 1.5 px): both lines share the smaller fit
    const lines = ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz 0123456789'], ct = 0.05;
    let cs = 40; while (cs > 24 && lines.some((l) => textWidth(ctx, 'display', l, cs, ct) > 864 * 0.98)) cs -= 2;
    const lh = Math.round(cs * 1.1);
    const set = `<div class="a disp paper" style="left:72px;top:532px;width:864px;font-size:${cs}px;line-height:${lh}px;letter-spacing:${ct}em">${lines.map((l) => `<span class="ln">${l}</span>`).join('')}</div>`;
    const fams = [F.display.family, F.body.family, F.mono.family].filter((f, i, a) => a.indexOf(f) === i);
    const lic = `<div class="a c15 qt" style="left:72px;top:${532 + 2 * lh + 20}px;width:780px">${A(`${listAnd(fams)} ${fams.length > 1 ? 'are' : 'is'} open source under the SIL Open Font Licence: free in print and on screen, and free to download from Google Fonts.`)}</div>`;
    return page(ctx, R, 'typefaces', { body: aa + right, zone: set + lic });
  },

  // ---- 026: the dense page, on a Stock ticket. Two real pieces, each cropped to the detail that can be read at the size it is shown ----
  layouts: (ctx) => {
    const R = roles(ctx).onPaper(), B = ctx.brand, g = B.layout;
    const kA = 0.8, cropA = { w: 375, h: 485 }, A_ = sheetArt(ctx, R, cropA);
    const S = screenArt(ctx, R, true), kB = 540 / S.crop.w, bx = 396;
    // zoom, not transform: see index.js
    const frame = (x, y, w, h, k, art, label) => `<div class="a ar" role="img" aria-label="${A(label)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="sc" style="width:${art.w}px;height:${art.h}px;zoom:${k}">${art.html}</div></div>`;
    let bars = '';
    for (let i = 0; i < S.grid.n; i++) if (S.grid.colX(i) + S.grid.col <= S.crop.w) bars += `<div class="a" style="left:${px(bx + S.grid.colX(i) * kB)};top:56px;width:${px(S.grid.col * kB)};height:8px;background:${R.fieldInk}"></div>`;
    const v = (s) => `<span class="m">${s}</span>`;
    const hB = Math.round(S.crop.h * kB);
    const body = frame(72, 72, 300, Math.round(cropA.h * kA), kA, A_, 'Detail of the list sheet, A4') + bars + frame(bx, 72, 540, hB, kB, S, 'Detail of the screen, 1920 by 1080')
      + el(bx, 424, 'c13 ink nw', `${v(g.columns)} columns, the left seven shown, ${v(g.margin)} px margins, ${v(g.gutter)} px gutters, on a ${v(g.base)} px base.`, '', 560)
      + el(bx, 442, 'c13 ink nw', `Drawn at ${v(`${S.w} × ${S.h}`)}, every value is ${v(S.grid.k)} times: ${v(S.grid.mg)} px margins, ${v(S.grid.gut)} px gutters.`, '', 560);
    const zone = note(72, 532, 300, 'A4 sheet', 'The product&rsquo;s list, one row each, status in words.')
      + note(bx, 532, 540, `Screen, ${S.w} × ${S.h}`, 'The headline runs across seven of the twelve columns.');
    return page(ctx, R, 'layouts', { body, zone });
  },

  // ---- 029: the applications page, two night photographs printed on the field ----
  signage: (ctx) => {
    // a brand with the bus-shelter shot is photographed in daylight on the street (street.js); the night plates below are Encore's
    if (isStreet(ctx)) return signageStreet(ctx, note);
    const R = roles(ctx), B = ctx.brand, shade = 1;
    // the new night scenes carry their own light, so the engine's shade lights the plain prints (the old bar-top and brick-wall relight in light.js is for the retired scenes)
    const poster = posterArt(ctx, R), tick = ticketArt(ctx, R);
    const art = (a) => ({ html: ctx.artPage(a.html, { w: a.w, h: a.h }), w: a.w, h: a.h });
    const SP = NIGHT_POSTER, ST = NIGHT_TICKET;
    const p1 = ctx.mockup(SP, [art(poster)], { shade }), p2 = ctx.mockup(ST, [art(tick)], { shade });
    const noun = /ticket/i.test(B.description) ? 'Ticket' : 'Docket';
    const kind = B.applications.signage.split(/:\s+/)[0];
    // the photographs are cropped to the print: win is the part of the scene shown, in scene pixels, in a box of the same proportion
    const photo = (x, y, w, h, src, scene, win, alt, over) => {
      const k = w / win.w, si = ctx.sceneInfo(scene);
      return `<div class="a ar" role="img" aria-label="${A(alt)}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${plateImg(`${A(src)}`, ``, `position:absolute;left:${px(-win.x * k)};top:${px(-win.y * k)};width:${px(si.w * k)};height:${px(si.h * k)}`)}${over(win, w, h)}</div>`;
    };
    const wP = { x: 524, y: 40, w: 500, h: 750 }, wT = { x: 380, y: 464, w: 800, h: 560 };
    const body = photo(56, 56, 280, 420, p1, SP, wP, `${B.name} street poster on a brick wall at night`, () => '')
      + photo(352, 56, 600, 420, p2, ST, wT, `${B.name} ${noun.toLowerCase()} on a bar top at night`, () => '');
    const zone = note(56, 532, 280, A(kind), 'One line, as large as the sheet allows, with the logo at the foot.') + note(352, 532, 600, A(`${noun}, 156 x 60 mm, 350 gsm card`), A(B.ui.screen.content.pickup));
    return page(ctx, R, 'signage', { body, zone });
  },

  // ---- 014: a strip of joined colour tickets, one per brand colour, each as wide as its share ----
  // A brand with one colour at half the strip or more gets separate tickets with the bar top showing between them: joined, that colour is a full-height column.
  palette: (ctx) => {
    const R = roles(ctx);
    const cols = ctx.colours.map((c, i) => ({ ...c, i })).sort((a, b) => b.share - a.share || a.i - b.i);
    // inset: the last ticket stops 16 px short of the stub and closes its own right edge, so the strip ends on a ticket and not on the stub's notches
    const inset = cols[0].share >= 0.5, gap = inset ? 24 : 0, tail = inset ? 16 : 0, avail = T.bodyW - gap * (cols.length - 1) - tail;
    // widths: the strip x share by largest remainder, then a 96 px floor taken proportionally from the rest
    const total = cols.reduce((s, k) => s + k.share, 0), raw = cols.map((c) => avail * c.share / total);
    const w = raw.map(Math.floor);
    let left = avail - w.reduce((s, n) => s + n, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).forEach(([, i]) => { if (left > 0) { w[i]++; left--; } });
    const small = w.map((n) => n < 96);
    if (small.some(Boolean)) {
      const need = w.reduce((s, n, i) => s + (small[i] ? 96 - n : 0), 0), pool = w.reduce((s, n, i) => s + (small[i] ? 0 : n), 0);
      w.forEach((n, i) => { w[i] = small[i] ? 96 : n - Math.round(need * n / pool); });
      w[w.indexOf(Math.max(...w))] += avail - w.reduce((s, n) => s + n, 0);
    }
    let x = T.x;
    const segs = cols.map((c, i) => { const s = { x, w: w[i], hex: c.hex, c }; x += w[i] + gap; return s; });
    // the share's size: the largest that fits its ticket, and equal shares print at one size (the smaller of their fits)
    // (a separate ticket has its perforation 12 px inside its right edge: the share stops 16 px short of the holes)
    const fit = segs.map((s) => {
      const txt = `${Math.round(s.c.share * 100)}%`, room = inset ? s.w - 44 : s.w - 32, floor = inset ? 28 : 32;
      let size = 56; while (size > floor && textWidth(ctx, 'display', txt, size, trackOf(ctx)) > room * 0.98) size -= 2;
      return size;
    });
    const sizeOf = (s, i) => Math.min(...segs.map((t, j) => (t.c.share === s.c.share ? fit[j] : 99)));
    let body = '', zone = '';
    for (const [i, s] of segs.entries()) {
      const ink = R.inkOn(s.hex, 13, 600, '(Palette ticket text)'), cx = s.x + 16;
      body += el(cx, 72, 'c13 b', A(s.c.name), `color:${ink};white-space:nowrap`) + el(cx, 90, 'm', s.hex.toUpperCase(), `color:${ink}`);
      const txt = `${Math.round(s.c.share * 100)}%`;
      const size = sizeOf(s, i);
      body += `<div class="a disp" style="left:${px(cx)};top:${460 - size}px;font-size:${size}px;line-height:${size}px;letter-spacing:${trackOf(ctx)}em;color:${ink};white-space:nowrap">${txt}</div>`;
      // the note sits below the ticket, where the table shows: a separate ticket's note may run to 8 px past its edge (the next one's starts 40 px on)
      zone += `<div class="a c15 qt" style="left:${px(cx)};top:532px;width:${Math.max(inset ? s.w - 8 : s.w - 24, 117)}px">${A(s.c.lands)}</div>`;
    }
    return page(ctx, R, 'palette', { segments: segs, body, zone, inset });
  },
};
