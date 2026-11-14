// Lane g2 (overnight, 11 Nov): the six logo pages of theme 21, in its slide language. Each page is one slide on the 1280 x 720 page: full-height fields of the
// brand's colours meeting at straight edges, one element at display scale, everything else at 12 to 15 px, the one running head at y 28.
// The deck has a horizon at y 576 (the Personality fields end there), and the logo pages stand their objects on it.
// Colours come by role and by the brand's own colourways, never by id; the helpers below are copied from guidelines-r1.js, which does not export them.
import { plateImg } from '../../engine/plate.js';
import { A } from './helpers.js';
import { outline, capHeight } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';

// ---- measuring (copied from guidelines-r1.js) ------------------------------------------------------------------------------------
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const bodyW = (ctx, w) => (ctx.brand.fonts.body.weights.includes(w) ? w : ctx.brand.fonts.body.weights[0]);
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
const lineCount = (ctx, role, weight, text, size, maxW, track = 0) => { let n = 1, cur = ''; for (const w of text.split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { n++; cur = w; } else cur = t; } return n; };
const fitSize = (ctx, role, weight, texts, hi, lo, maxW, maxLines = 1, track = -0.01) => { for (let s = hi; s > lo; s--) if (texts.every((t) => lineCount(ctx, role, weight, t, s, maxW, track) <= maxLines)) return s; return lo; };
const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };

// ---- colour roles (copied from guidelines-r1.js) ---------------------------------------------------------------------------------
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const nameOfHex = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// chrome rule (spec 2.3): the brand's quiet tone that reaches 4.5:1 on the ground; else the best of the text colour, the page ground and the dark soft text
const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
const px = (n) => +(+n).toFixed(2);
const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const page = (id, cls, inner, bg) => `<section class="pg pg--r g2 ${cls}" data-page="${id}" style="background:${bg}">${inner}</section>`;
const same = (a, b) => a.toLowerCase() === b.toLowerCase();

// the one running head (spec 2.5): each part takes the chrome colour of the field it sits on
function head(ctx, id, { left, right } = {}) {
  const p = ctx.pages.find((x) => x.id === id), g = L(ctx).surface;
  const cl = chromeOn(ctx, left || g), cr = chromeOn(ctx, right || left || g);
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${p.ref ? `<b>${p.ref}</b>` : ''}${A(p.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(ctx.brand.name)} brand guidelines</i><b>${folio}</b></span></div>`;
}

// ---- photographs (copied from guidelines-r1.js) ----------------------------------------------------------------------------------
function jpegSize() { throw new Error('theme 21: photograph files are not read by the server export'); }
// a photograph cropped to the shot's safe box, filling a w x h box with nothing laid over it (fx: where across the safe box the crop sits, 0 left to 1 right)
function cropped(ctx, s, x, y, w, h, extra = '', fx = (s.focus && s.focus.x != null ? s.focus.x / 100 : 0.5)) {
  const n = jpegSize(); const c = s.crop || { x: 0, y: 0, w: n.w, h: n.h };
  const k = Math.max(w / c.w, h / c.h), ox = (w - c.w * k) * fx, oy = (h - c.h * k) / 2;
  return box(x, y, w, h, 'overflow:hidden', `${plateImg(`${A(ctx.photoUrl(s.photo))}`, `${A(s.alt || '')}`, `position:absolute;display:block;max-width:none;width:${px(n.w * k)}px;height:${px(n.h * k)}px;left:${px(ox - c.x * k)}px;top:${px(oy - c.y * k)}px`)}${extra}`);
}
// the shot for a use: the first photo that asks for it, else the first photo whose use is not in avoid, else any photo; null when the brand has none
function shotFor(ctx, use, avoid = []) {
  const shots = ctx.brand.imagery.shots.filter((s) => s.photo);
  return shots.find((x) => (x.use || []).includes(use)) || shots.find((x) => !(x.use || []).some((u) => avoid.includes(u))) || shots[0] || null;
}

// ---- the logo ------------------------------------------------------------------------------------------------------------------
// the colourway the brand gives for a ground: its own named colourway first, mono only when nothing else fits
const colourwayFor = (ctx, hex) => { const e = Object.entries(ctx.brand.logo.colourways).filter(([, v]) => same(v.ground, hex)); return (e.find(([k]) => !k.startsWith('mono')) || e[0] || [])[0]; };
// width of a version that fits a box
const fitW = (ctx, id, maxW, maxH) => { const g = ctx.logo.geos[id]; return Math.floor(Math.min(maxW, (maxH * g.w) / g.h)); };
const hOf = (ctx, id, w) => (w * ctx.logo.geos[id].h) / ctx.logo.geos[id].w;
// The slot edition's frame, drawn here rather than by the engine so its label keeps the page's 12 px floor: "Your logo goes here" where it fits,
// "Logo" where that does not, and no word at all in a frame too small to hold one (the minimum size page draws the frame at true size).
function slotFrame(ctx, id, width, ink, label = 'Your logo goes here') {
  const h = hOf(ctx, id, width), bw = bodyW(ctx, 500), room = width - 12, per = (t) => textW(ctx, 'body', bw, t, 12, 0);
  const text = per(label) <= room && h >= 20 ? label : per('Logo') <= room && h >= 20 ? 'Logo' : '';
  return `<div class="logo-slot" role="img" aria-label="Logo slot" style="width:${px(width)}px;height:${px(h)}px;box-sizing:border-box;border:1.5px dashed ${ink};color:${ink};display:flex;align-items:center;justify-content:center;font:${bw} 12px/16px var(--body);white-space:nowrap">${text}</div>`;
}
// the logo (showcase) or the slot frame (slot) at a width, in a colourway; ink is the slot frame's colour
const logo = (ctx, id, width, { colourway, ink, label, fill } = {}) => {
  if (ctx.edition === 'slot') return slotFrame(ctx, id, width, ink || inkOn(ctx, ctx.brand.logo.colourways[colourway || ctx.logo.colourwayOf(id)].ground), label);
  return ctx.logo.svg(id, { colourway: colourway || ctx.logo.colourwayOf(id), width, fill });
};
// a colourway's parts in words, by its own keys: "White name, Signal kerb" or "Asphalt name and kerb"
function partsOf(ctx, key) {
  const cw = ctx.brand.logo.colourways[key], parts = Object.entries(cw).filter(([k]) => k !== 'ground');
  const hexes = [...new Set(parts.map(([, v]) => v.toLowerCase()))];
  if (hexes.length === 1) return `${nameOfHex(ctx, parts[0][1])} ${parts.map(([k]) => k).join(' and ')}`;
  return parts.map(([k, v]) => `${nameOfHex(ctx, v)} ${k}`).join(', ');
}
const sentencesOf = (s) => (s || '').split(/(?<=[.!?]) /).map((x) => x.trim()).filter(Boolean);
// a caption: the label in the field's ink at 600, the note under it in the field's chrome colour
const cap = (ctx, bg, label, note) => `<p class="r-t12 r-w600" style="color:${inkOn(ctx, bg)}">${A(label)}</p>${note ? `<p class="r-t12" style="color:${chromeOn(ctx, bg)}">${A(note)}</p>` : ''}`;

// ---- the pages ------------------------------------------------------------------------------------------------------------------
export const guidelines = {
  // The logo: the reveal slide. The primary logo alone on its own ground, as wide as the page allows, standing on the horizon; the band under it holds its idea,
  // one sentence a column, on the text colour (the road the cover stands on).
  logo(ctx) {
    const B = ctx.brand, W = ctx.size.w, ground = B.logo.colourways.colour.ground, band = byRole(ctx, 'text').hex, bandInk = inkOn(ctx, band);
    const lw = fitW(ctx, 'colour', W - 112, 288), lh = hOf(ctx, 'colour', lw), top = 504 - lh;
    const ss = sentencesOf(B.logo.idea), cols = ss.length > 2 ? [ss[0], ss.slice(1).join(' ')] : ss;
    const colX = [482.67, 909.33], colW = 314.67;
    // the idea at 15/24 when every column sets in four lines; at 12/16 when it would not fit the band
    const big = cols.every((t) => lineCount(ctx, 'body', 400, t, 15, colW) <= 4);
    const idea = cols.length === 1
      ? box(colX[0], 600, W - 56 - colX[0], 0, `color:${bandInk}`, `<p class="${big ? 'r-t15' : 'r-t12'}">${A(cols[0])}</p>`)
      : cols.map((t, i) => box(colX[i], 600, colW, 0, `color:${bandInk}`, `<p class="${big ? 'r-t15' : 'r-t12'}">${A(t)}</p>`)).join('');
    const inner = box(56, top, lw, lh, '', logo(ctx, 'colour', lw, { colourway: 'colour', ink: inkOn(ctx, ground) })) +
      box(0, 576, W, 144, `background:${band}`) +
      box(56, 600, 314.67, 0, '', cap(ctx, band, ctx.logo.labels.colour, B.logo.when.colour)) + idea +
      head(ctx, 'logo', { left: ground });
    return page('logo', 'g2-logo', inner, ground);
  },

  // Logo versions: two fields, split by the ground each version sits on. The light field holds the primary large and the four shapes standing on the horizon;
  // the dark field holds the versions made for dark grounds. A version is never shown on a ground it is not made for.
  'logo-versions'(ctx) {
    const B = ctx.brand, Lg = ctx.logo, cw = B.logo.colourways, W = ctx.size.w;
    const light = cw.colour.ground, dark = cw.reversed.ground, split = (W * 2) / 3;
    const onDark = ['reversed', 'mono-light'].filter((id) => same(cw[Lg.colourwayOf(id)].ground, dark));
    const onLight = ['mono-dark', 'horizontal', 'stacked', 'symbol'].filter((id) => same(cw[Lg.colourwayOf(id)].ground, light));
    const piece = (id, x, y, w, h, bg, capW, bottom) => {
      const lw = fitW(ctx, id, w, h), lh = hOf(ctx, id, lw), ly = bottom ? y - lh : y, cwk = Lg.colourwayOf(id);
      return box(x, ly, lw, lh, '', logo(ctx, id, lw, { colourway: cwk, ink: inkOn(ctx, bg), label: 'Logo' })) +
        box(x, bottom ? y + 24 : ly + lh + 24, capW, 0, '', cap(ctx, bg, Lg.labels[id], B.logo.when[id]));
    };
    // the hero: the full colour logo at the top of the light field
    let inner = box(0, 0, split, 720, `background:${light}`) + box(split, 0, W - split, 720, `background:${dark}`) +
      piece('colour', 56, 104, 560, 150, light, 360, false);
    // the shapes: two columns on the light field, each logo standing on a horizon line (two rows: 440 and 608), its caption under it
    const n = onLight.length, gap = 40, cols = n > 2 ? 2 : Math.max(n, 1), rows = Math.ceil(n / cols), colW = (split - 112 - gap * (cols - 1)) / cols;
    const base = rows > 1 ? [440, 608] : [560], maxH = rows > 1 ? 96 : 140;
    onLight.forEach((id, i) => { inner += piece(id, 56 + (i % cols) * (colW + gap), base[Math.floor(i / cols)], colW, maxH, light, colW, true); });
    // the dark field: reversed at the top, mono light on the lowest horizon
    const dx = split + 56, dw = W - split - 112;
    if (onDark[0]) inner += piece(onDark[0], dx, 104, dw, 150, dark, dw, false);
    if (onDark[1]) inner += piece(onDark[1], dx, 608, dw, 96, dark, dw, true);
    return page('logo-versions', 'g2-versions', inner + head(ctx, 'logo-versions', { left: light, right: dark }), light);
  },

  // Clear space: the zone is drawn as a field in the panel colour, exactly the logo plus x on every side, with x shown as a square of the action colour in each corner.
  // The rule and the measure sit in the right-hand column.
  'clear-space'(ctx) {
    const B = ctx.brand, Lg = ctx.logo, g = Lg.geos.colour, u = Lg.geo.unit, ground = L(ctx).surface, panel = L(ctx).sunken, act = byRole(ctx, 'action').hex;
    // the other versions made for this ground go under the primary at one share of the row, so the primary stands a little lower than the page allows
    const cwAll = B.logo.colourways, others = ['horizontal', 'stacked', 'symbol', 'mono-dark'].filter((id) => Lg.geos[id] && same(cwAll[Lg.colourwayOf(id)].ground, cwAll.colour.ground));
    const maxW = 832, maxH = others.length ? 320 : 440;
    const lw = Math.min((maxW * g.w) / (g.w + 2 * u), (maxH * g.w) / (g.h + 2 * u)), k = lw / g.w, lh = g.h * k, X = u * k;
    const zw = lw + 2 * X, zh = lh + 2 * X, zx = 56, zy = 104;
    const cwk = colourwayFor(ctx, panel) || 'colour', sq = (x, y) => box(x, y, X, X, `background:${act}`);
    const xInk = inkOn(ctx, act), label = X >= 24 ? box(zx, zy, X, X, `color:${xInk};display:flex;align-items:center;justify-content:center`, '<p class="r-t12 r-w600">x</p>') : '';
    // the edge the zone is measured from: a hairline round the logo's own box (the slot frame already draws one)
    const edge = ctx.edition === 'slot' ? '' : box(zx + X, zy + X, lw, lh, `box-shadow:0 0 0 1px ${chromeOn(ctx, panel)}`);
    const first = [...(B.logo.showcase.wordmark || B.name)][0];
    const unit = ctx.edition === 'slot' || Math.abs(Lg.geo.unit - Lg.geo.cap) > 0.01 ? `x is ${Lg.clearShare}% of the logo’s height.`
      : `x is the cap height of the ${/[A-Z]/.test(first) ? first : 'name'}, ${Lg.clearShare}% of the logo’s height.`;
    const soft = L(ctx).textSoft;
    const right = box(944, 104, 280, 0, '', `<p class="r-t12 r-w600" style="color:${L(ctx).text}">Clear space</p>` +
      `<p class="r-t15" style="color:${soft};margin-top:8px">Keep x clear on every side of the logo. ${A(unit)}</p>` +
      `<p class="r-t15" style="color:${soft};margin-top:16px">Nothing enters the zone: no type, no edges, no other logos.</p>` +
      `<p class="r-t12" style="color:${chromeOn(ctx, ground)};margin-top:16px">Measured from the edge of the logo. Drawn here at ${Math.round(lw)} px wide, where x is ${Math.round(X)} px.</p>`);
    // under the primary: the same x on the brand's other versions made for this ground, so the page is not half empty
    let more = '', rowEnd = 0;
    if (others.length) {
      // each version at the width that fits its share of the row; x is the same share of that version's own height, as the rule says
      const gap = 40, y0 = zy + zh + 72, sh = Lg.clearShare / 100, bw = (1168 - gap * (others.length - 1)) / others.length, bh = 680 - 48 - y0;
      let ox = zx;
      more = box(zx, y0 - 40, 760, 0, `color:${L(ctx).text}`, '<p class="r-t12 r-w600">The same x on the other versions</p>');
      for (const id of others) {
        const g2 = Lg.geos[id], r = g2.h / g2.w, w2 = Math.min(bw / (1 + 2 * sh * r), bh / (r * (1 + 2 * sh)), lw * 0.6), h2 = w2 * r, x2 = sh * h2, cw2 = w2 + 2 * x2, ch2 = h2 + 2 * x2, sq2 = (x, y) => box(x, y, x2, x2, `background:${act}`);
        more += box(ox, y0, cw2, ch2, `background:${panel}`) + sq2(ox, y0) + sq2(ox + cw2 - x2, y0) + sq2(ox, y0 + ch2 - x2) + sq2(ox + cw2 - x2, y0 + ch2 - x2) +
          box(ox + x2, y0 + x2, w2, h2, '', logo(ctx, id, w2, { colourway: Lg.colourwayOf(id), ink: inkOn(ctx, panel) })) +
          box(ox, y0 + ch2 + 8, Math.max(cw2, 160), 0, '', cap(ctx, ground, Lg.labels[id], ''));
        ox += cw2 + gap; rowEnd = ox - gap;
      }
    }
    // under the rule, in the right column, where the row above leaves it free: the same zone on the reversed logo on the dark ground, so the third under the text is not empty
    const dk = cwAll.reversed && cwAll.reversed.ground;
    if (dk && !same(dk, cwAll.colour.ground) && rowEnd <= 920) {
      const dw = 280, dl = Math.min((dw * g.w) / (g.w + 2 * u), 190 * g.w / (g.h + 2 * u)), dkk = dl / g.w, dlh = g.h * dkk, dX = u * dkk, dzh = dlh + 2 * dX, dzw = dl + 2 * dX, dy = 392;
      const sqd = (x, y) => box(x, y, dX, dX, `background:${act}`);
      more += box(944, dy - 36, dw, 0, `color:${L(ctx).text}`, '<p class="r-t12 r-w600">The same x on the dark ground</p>') + box(944, dy, dzw, dzh, `background:${dk}`) +
        sqd(944, dy) + sqd(944 + dzw - dX, dy) + sqd(944, dy + dzh - dX) + sqd(944 + dzw - dX, dy + dzh - dX) +
        box(944 + dX, dy + dX, dl, dlh, '', logo(ctx, 'colour', dl, { colourway: 'reversed', ink: inkOn(ctx, dk) })) +
        box(944, dy + dzh + 8, dw, 0, '', cap(ctx, ground, 'Reversed', ''));
    }
    const inner = box(zx, zy, zw, zh, `background:${panel}`) + sq(zx, zy) + sq(zx + zw - X, zy) + sq(zx, zy + zh - X) + sq(zx + zw - X, zy + zh - X) + label + edge +
      box(zx + X, zy + X, lw, lh, '', logo(ctx, 'colour', lw, { colourway: cwk, ink: inkOn(ctx, panel) })) + right + more + head(ctx, 'clear-space');
    return page('clear-space', 'g2-clear', inner, ground);
  },

  // Minimum size: two fields, screen on the dark ground (a screen) and print on the light one (paper). Each smallest width is the slide's display line,
  // and under it the logo at that true size with a ruler its exact width. The size of the number against the size of the logo is the point.
  'min-size'(ctx) {
    const B = ctx.brand, Lg = ctx.logo, m = Lg.minSize, W = ctx.size.w, cw = B.logo.colourways, half = W / 2, dw = dispW(ctx);
    const mmPx = (mm) => (mm * 96) / 25.4;
    const sides = [
      { bg: cw.reversed.ground, key: 'reversed', big: `${m.screenPx} px`, w: m.screenPx, title: 'On screen', note: `${m.screenPx} px wide and ${m.screenH} px high: the smallest it appears on a page or a screen.`, foot: 'Drawn at 1 px to the pixel.' },
      { bg: cw.colour.ground, key: 'colour', big: `${m.printMm} mm`, w: mmPx(m.printMm), title: 'In print', note: `${m.printMm} mm wide and ${m.printH} mm high: the smallest it prints, on any paper.`, foot: 'Drawn at true size when this page prints at 100%.' },
    ];
    const size = fitSize(ctx, 'display', dw, sides.map((s) => s.big), 200, 96, half - 112, 1, -0.02);
    const inner = sides.map((s, i) => {
      const x = i * half, ink = inkOn(ctx, s.bg), ch = chromeOn(ctx, s.bg), lh = hOf(ctx, 'colour', s.w);
      return box(x, 0, half, 720, `background:${s.bg}`) +
        box(x + 56, topForBaseline(ctx, 'display', dw, size, 1, 296), half - 112, 0, `color:${ink};font-size:${size}px;line-height:1;letter-spacing:-0.02em`, `<h2 class="disp r-nw num">${A(s.big)}</h2>`) +
        box(x + 56, 328, 360, 0, '', `<p class="r-t15 r-w600" style="color:${ink}">${A(s.title)}</p><p class="r-t15" style="color:${ch}">${A(s.note)}</p>`) +
        box(x + 56, 536 - lh, s.w, lh, '', logo(ctx, 'colour', s.w, { colourway: s.key, ink, label: '' })) +
        // the ruler: a hairline the logo's exact width, with a tick at each end
        box(x + 56, 552, s.w, 1, `background:${ch}`) + box(x + 56, 548, 1, 9, `background:${ch}`) + box(x + 56 + s.w - 1, 548, 1, 9, `background:${ch}`) +
        box(x + 56, 600, 360, 0, `color:${ch}`, `<p class="r-t12">${A(s.foot)}</p>`);
    }).join('');
    return page('min-size', 'g2-min', inner + head(ctx, 'min-size', { left: sides[0].bg, right: sides[1].bg }), sides[1].bg);
  },

  // On colour and photos: a field for each colour the logo is made for, in the brand's own colourway for it, and the photograph as the widest field.
  // The captions sit under the fields on the page ground; nothing is written on the photograph.
  'logo-grounds'(ctx) {
    const B = ctx.brand, Lg = ctx.logo, cw = B.logo.colourways, W = ctx.size.w, gr = L(ctx).surface;
    const rank = { action: 0, text: 1, accent: 2, panel: 3, ground: 4 };
    const roleOf = (hex) => ctx.colours.find((c) => same(c.hex, hex))?.role;
    const grounds = [...new Set(Object.values(cw).map((v) => v.ground.toLowerCase()))].sort((a, b) => (rank[roleOf(a)] ?? 5) - (rank[roleOf(b)] ?? 5));
    const shot = shotFor(ctx, 'poster', ['cover']), photoW = 512, fy = 128, fh = 472, n = grounds.length, fw = (W - photoW) / n;
    const names = grounds.map((h) => nameOfHex(ctx, h)), ml = 'mono-light';
    const lead = `The logo sits on ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]}, each in its own colourway. On a photo it goes in ${Lg.labels[ml].toLowerCase()}, on a quiet, dark part of the picture.`;
    let inner = box(56, 72, 760, 0, `color:${L(ctx).textSoft}`, `<p class="r-t15">${A(lead)}</p>`);
    grounds.forEach((hex, i) => {
      const x = i * fw, key = colourwayFor(ctx, hex), lw = fitW(ctx, 'colour', fw - 48, 72), edge = same(hex, gr) ? `;box-shadow:inset 0 0 0 1px ${L(ctx).divider}` : '';
      inner += box(x, fy, fw, fh, `background:${hex}${edge}`) +
        box(x + (fw - lw) / 2, fy + 64, lw, 0, '', logo(ctx, 'colour', lw, { colourway: key, ink: inkOn(ctx, hex), label: 'Logo' })) +
        box(x + 24, 616, fw - 40, 0, '', cap(ctx, gr, `On ${nameOfHex(ctx, hex)}`, `${partsOf(ctx, key)}.`));
    });
    const px0 = W - photoW, rule = (B.imagery.rules || []).find((r) => /logo/i.test(`${r.do} ${r.dont}`));
    const mlw = fitW(ctx, ml, photoW - 112, 72), mlLogo = box(56, 64, mlw, 0, '', logo(ctx, ml, mlw, { colourway: ml, ink: cw[ml].name }));
    // a shot may carry a `quiet` crop: its dark, even part, where the white wordmark reads
    if (shot) inner += cropped(ctx, shot.quiet ? { ...shot, crop: shot.quiet } : shot, px0, fy, photoW, fh, mlLogo);
    else {
      // no photograph yet: the field is the photo slot, in the panel colour, with the brief for the shot that goes there
      const slot = B.imagery.shots[0], p = L(ctx).sunken, ink = inkOn(ctx, p);
      inner += box(px0, fy, photoW, fh, `background:${p}`) + box(px0 + 24, fy + 24, photoW - 48, fh - 48, `border:1.5px dashed ${chromeOn(ctx, p)}`) +
        box(px0 + 56, fy + 64, photoW - 112, 0, '', `<p class="r-t12 r-w600" style="color:${ink}">A photo goes here</p>${slot && slot.slot ? `<p class="r-t15" style="color:${chromeOn(ctx, p)};margin-top:8px">${A(slot.slot)}</p>` : ''}`);
    }
    inner += box(px0 + 56, 616, photoW - 112, 0, '', cap(ctx, gr, 'On a photo', `${Lg.labels[ml]}, on a quiet, dark part of the picture.${rule ? ` ${rule.do}` : ''}`));
    return page('logo-grounds', 'g2-grounds', inner + head(ctx, 'logo-grounds'), gr);
  },

  // Misuse: the one dark slide in the section. Six columns on the page grid, each a wrong use crossed through in the action colour, its caption under the horizon.
  // The busy ground is a window of the brand's own photograph; a brand with no photograph shows the logo across the edge of two of its colours instead.
  'logo-misuse'(ctx) {
    const B = ctx.brand, cw = B.logo.colourways, dark = cw.reversed.ground, act = byRole(ctx, 'action').hex, W = ctx.size.w;
    const ink = inkOn(ctx, dark), ch = chromeOn(ctx, dark), hair = ctx.roles.dark.divider || L(ctx).textSoft;
    const colX = (n) => 56 + n * 98.667, span2 = 2 * 82.667 + 16, w = 124;
    const off = ctx.C.toOklch(act), wrong = ctx.C.fromOklch(Math.max(off.L, 0.62), Math.max(off.C, 0.1), (off.H + 180) % 360);
    const base = (o = {}) => logo(ctx, 'colour', o.w || w, { colourway: 'reversed', ink, fill: o.fill, label: 'Logo' });
    const shot = shotFor(ctx, 'cover', ['poster']);
    // the cross: two strokes from corner to corner of the art's square, in the action colour where it reads on the ground (3:1), else in the page's ink
    const xc = ctx.ratio(act, dark) >= 3 ? act : ink;
    const cross = (cx, cy, s) => box(cx - s / 2, cy - s / 2, s, s, '', `<svg width="${px(s)}" height="${px(s)}" viewBox="0 0 ${px(s)} ${px(s)}" aria-hidden="true"><path d="M1 1L${px(s - 1)} ${px(s - 1)}M${px(s - 1)} 1L1 ${px(s - 1)}" stroke="${xc}" stroke-width="2" fill="none"/></svg>`);
    const lh = hOf(ctx, 'colour', w), cy = 324;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.3,0.7)">${base()}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', base({ fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${base()}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 5px 0 ${act})">${base()}</div>`],
      shot ? ['Busy ground', 'Never on a busy part of a photo. Use a quiet one, or a flat colour.', null]
        : ['Busy ground', 'Never across the edge of two colours or a busy photo. Give it one flat ground.', null],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div style="box-sizing:border-box;padding:12px;border:1.5px solid ${cw.reversed.name}">${base({ w: w - 28 })}</div>`],
    ];
    let inner = '';
    items.forEach(([t, note, art], i) => {
      const x = colX(2 * i), cx = x + span2 / 2;
      if (i) inner += box(x - 8, 72, 1, 648, `background:${hair}`);
      if (art === null) {
        // the busy ground: a window of the photograph in this column, from the head zone to the horizon, the logo set across it
        const fx0 = x - 8, fw = span2 + 16, logoBox = box(cx - fx0 - w / 2, cy - 72 - lh / 2, w, lh, '', base());
        if (shot) inner += cropped(ctx, shot, fx0, 72, fw, 504, logoBox);
        else {
          const split = byRole(ctx, 'action').hex;
          inner += box(fx0, 72, fw, 252, `background:${split}`) + box(fx0, 324, fw, 252, `background:${L(ctx).surface}`) + box(cx - w / 2, cy - lh / 2, w, lh, '', logo(ctx, 'colour', w, { colourway: colourwayFor(ctx, split) || 'colour', ink: inkOn(ctx, split), label: '' }));
        }
      } else inner += box(cx - w / 2, cy - lh / 2, w, lh, '', art);
      inner += cross(cx, cy, 120) + box(x, 600, span2, 0, '', `<p class="r-t12 r-w600" style="color:${ink}">${A(t)}</p><p class="r-t12" style="color:${ch}">${A(note)}</p>`);
    });
    return page('logo-misuse', 'g2-misuse', inner + head(ctx, 'logo-misuse', { left: dark }), dark);
  },
};

// The lane's own rules: nothing the pages need beyond inline styles and the theme's r- classes, except the slot frame's label, which must not wrap.
export function css() {
  return `.pg.g2 .logo-slot{flex:none}
.pg.g2 svg{display:block}`;
}
