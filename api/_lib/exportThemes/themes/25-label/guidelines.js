// The six gate pages of theme 25, Label. Geometry is the theme's; copy comes from copy.js (brand facts and the theme's own frames).
// Every object or group is hung on the centre of the hang (x 356) and the sightline (y 384). A page-height object runs y 96 to 672, the same top as the wall title
// and the same bottom as the label. The wall is the brand's ground colour; an object is drawn in its real application colours, with a 1 px edge only when it is close to the wall in tone.
import { roles, box, solid, key, hung, hungX, token, inkWidth, ascent, descent, lineTop, page, A, px, wrapLines, tie, HANG, OBJ_TOP, OBJ_H, H_SIGN, H_PANELS, H_FIELD, NB } from './helpers.js';
import { coverCopy, personalityCopy, logoCopy, paletteCopy, typefacesCopy, cardCopy } from './copy.js';

const weightName = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };

// the largest display size, from the headline token down to the title token, at which `text` sets in `width` with no word wider than the box and at most `maxLines` lines
function fitDisplay(ctx, text, width, maxLines) {
  const hl = token(ctx, 'headline'), tt = token(ctx, 'title');
  for (let size = hl.size; size >= tt.size; size -= 2) {
    const line = Math.round(size * hl.line / hl.size);
    try { if (wrapLines(ctx, 'display', ctx.weights.heading, size, text, width).length <= maxLines) return { size, line }; } catch { /* a word is wider than the box: try smaller */ }
  }
  return tt;
}

// ---- 001 cover: a field hung like a painting, the name small on it ----
function cover(ctx) {
  const R = roles(ctx), g = ctx.logo.geo, c = coverCopy(ctx);
  const wide = g.aspect > 4;                                  // a wide wordmark turns the field landscape
  const f = wide ? { w: 576, h: 352 } : { w: 360, h: H_FIELD };
  const lw = wide ? 384 : 288, lh = lw / g.aspect;
  const logo = ctx.logo.html('colour', { width: lw, colourway: R.colourwayOn(R.action), color: R.onColour(R.action, 11) });   // color: the slot frame's label, a passing pair on its ground
  const object = solid(R, hungX(f.w), hung(f.h), f.w, f.h, R.action, `<div class="cv-logo" style="left:32px;top:${px(f.h - 32 - lh)}">${logo}</div>`);
  return page(ctx, 'cover', { object, wall: c.wall, label: c.label });
}

// ---- 002 personality: the shop window sign at real proportion, carrying the brand's line ----
function personality(ctx) {
  const R = roles(ctx), B = ctx.brand, c = personalityCopy(ctx);
  const [, sw, sh] = /([\d.]+) x ([\d.]+) mm/.exec(B.applications.signage);
  const H = H_SIGN, W = Math.round(H * sw / sh / 2) * 2;
  const hasRule = !!B.logo.colourways.colour.rule;            // Margin's logo is a name beside a rule; a brand without one draws none
  // the foot logo, and where its name starts: a logo with a rule puts its name a rule-and-gap from the left edge, and the headline and the brand's other line are set on that same x
  const wide = ctx.logo.geo.aspect > 4;
  const lw = wide ? 200 : 128, geoF = wide ? ctx.logo.geo : ctx.logo.geos.horizontal, lh = wide ? lw / geoF.aspect : lw / geoF.w * geoF.h;
  const G = ctx.logo.geo, nameX = hasRule && G.T && G.gap ? 32 + (G.T + G.gap) * lw / geoF.w : 0;
  const lx = hasRule ? Math.round(nameX * 100) / 100 : 32, tw = W - lx - 32;
  // the brand's headline size when the line sets in it; on a narrower sign, the largest size (in steps of 2 px, down to the title token) that sets in no more than 5 lines without a word spilling out
  const T = fitDisplay(ctx, tie(c.line, { max: 16 }), tw, 5);
  const lines = wrapLines(ctx, 'display', ctx.weights.heading, T.size, tie(c.line, { max: 16 }), tw).length;
  // the rule runs the height of the headline only, so the sign carries one vertical and the logo's own rule is the second
  const rule = hasRule ? `<div style="left:32px;top:52px;width:3px;height:${lines * T.line - 8}px;background:${R.action}"></div>` : '';
  const text = `<div class="disp sg-line" style="left:${lx}px;top:48px;width:${tw}px;font-size:${T.size}px;line-height:${T.line}px;color:${R.ink}">${A(tie(c.line, { max: 16 }))}</div>`;
  const other = B.lines.others.find((l) => l !== c.line) || B.lines.primary;
  // the foot: the logo at the left edge of the sign (its own rule lines up with the headline's rule at x 32), the brand's other line above it, set to the logo's name edge
  const foot = `<div class="sg-note" style="left:${lx}px;bottom:${32 + lh + 16}px;width:${tw}px">${A(tie(other, { max: 16 }))}</div>`
    + `<div style="left:32px;top:${px(H - 32 - lh)}">${ctx.logo.html(wide ? 'colour' : 'horizontal', { width: lw })}</div>`;
  return page(ctx, 'personality', { object: solid(R, hungX(W), hung(H), W, H, R.panel, rule + text + foot), wall: c.wall, label: c.label });
}

// ---- 006 palette: the colours hung as panels, each as wide and as tall as its share; a ground drawn as the brand stores it is the wall itself and is not hung, one drawn tinted (white as paper) is hung as the brand's own colour ----
function palette(ctx) {
  const R = roles(ctx);
  const tinted = R.wall.toLowerCase() !== R.groundHex.toLowerCase();
  const hungC = ctx.colours.filter((c) => tinted || c.hex.toLowerCase() !== R.groundHex.toLowerCase()).sort((a, b) => b.share - a.share);
  const n = hungC.length, gap = 24, total = HANG.x1 - HANG.x0, sum = hungC.reduce((s, c) => s + c.share, 0), avail = total - gap * (n - 1), minW = 112;
  const widths = hungC.map((c) => Math.max(minW, Math.round(avail * c.share / sum)));
  const big = widths.indexOf(Math.max(...widths));
  widths[big] -= widths.reduce((s, w) => s + w, 0) - avail;   // the widest panel gives up what the narrow ones were lifted by, so the group is exactly 616 wide
  const top = Math.max(...hungC.map((c) => c.share));
  let x = HANG.x0;
  const panels = hungC.map((c, i) => {
    const w = widths[i], H = Math.round((280 + (H_PANELS - 280) * c.share / top) / 8) * 8, y = hung(H), tc = R.onColour(c.hex, 13), [r, g, b] = ctx.C.hexToRgb(c.hex);
    const cm = Array.isArray(c.cmyk) ? ['C', 'M', 'Y', 'K'].map((k, j) => `<span class="sw-v mono">${k} ${c.cmyk[j]}</span>`).join('') : '';
    const inner = `<div style="left:24px;top:24px;color:${tc}"><span class="sw-n">${A(c.name)}</span><span class="sw-v mono" style="margin-top:4px">${A(c.hex)}</span>`
      + `<span class="sw-v mono" style="margin-top:8px">R ${r}</span><span class="sw-v mono">G ${g}</span><span class="sw-v mono">B ${b}</span>`
      + (cm ? `<div style="margin-top:8px">${cm}</div>` : '') + `</div>`
      + `<div class="sw-s" style="left:24px;bottom:24px;color:${tc}">${Math.round(c.share * 100)}%</div>`;
    const p = solid(R, x, y, w, H, c.hex, inner);
    x += w + gap; return p;
  }).join('');
  const c = paletteCopy(ctx, R, hungC);
  return page(ctx, 'palette', { object: panels, wall: c.wall, label: c.label });
}

// ---- 008 typefaces: two plates hung as a pair on the sightline: the tall one carries the glyph pair, the small one the sample and the weights ----
function typefaces(ctx) {
  const R = roles(ctx), B = ctx.brand, d = B.fonts.display, b = B.fonts.body, c = typefacesCopy(ctx);
  const ink280 = inkWidth(ctx, 'display', 'Gg', 280);
  // plate A takes what plate B leaves of the 616 hang; it grows to fit the glyph pair at 280 px (inset 24 each side), and a wider face keeps the plate at its largest and sets the pair smaller
  // the sample paragraph is printed whole, so plate B is sized to it: 232 wide, so the paragraph sets in a measure it can breathe in (plate A gives up width, and a wide glyph pair is set a little smaller), then as tall as it needs
  const sample = B.type.sample.paragraph, sampleT = token(ctx, 'body'), ws = b.weights.slice(0, 3), gap = 24, total = HANG.x1 - HANG.x0;
  const needH = (w) => 24 + wrapLines(ctx, 'body', ctx.weights.regular, sampleT.size, tie(sample, { max: 18 }), w - 48).length * sampleT.line + 24 + 24 * ws.length + 24;
  const Aw0 = Math.max(360, Math.ceil((ink280.w + 48) / 8) * 8);
  const Bw = 232, Bh = Math.max(264, Math.ceil(needH(Bw) / 8) * 8), maxA = total - gap - Bw;
  if (Bh > OBJ_H) throw new Error(`typefaces: the sample paragraph needs a plate ${Bh} px tall and the hang holds ${OBJ_H}`);
  let Aw = Aw0, size = 280;
  if (Aw > maxA) { Aw = maxA; size = Math.floor((maxA - 48) / ink280.w * 280 / 4) * 4; }
  const H = OBJ_H, y = hung(H), gx = hungX(Aw + gap + Bw), bx = gx + Aw + gap, By = hung(Bh);
  const k = size / 280, up = ascent(ctx, 'display', 'Gg', size), down = descent(ctx, 'display', 'Gg', size);
  const free = H - 64 - 24;                                    // above the name and the caption
  const baseline = (free - (up + down)) / 2 + up;              // the pair sits in the middle of what is left above the caption
  const gTop = lineTop(ctx, 'display', size, size, baseline);
  const dMin = Math.min(...B.type.scale.filter((x) => x.face === 'display').map((x) => x.size));
  const plateA = solid(R, gx, y, Aw, H, R.panel,
    `<div class="disp pl-g" style="left:${24 - ink280.x1 * k}px;top:${px(gTop)};font-size:${size}px;line-height:${size}px;color:${R.ink}">Gg</div>`
    + `<div class="pl-n" style="left:24px;top:${H - 64}px">${A(d.family)}</div><div class="pl-r" style="left:24px;top:${H - 42}px">${A(tie(c.caption(dMin)))}</div>`);
  const plateB = solid(R, bx, By, Bw, Bh, R.panel,
    `<div class="pl-b" style="left:24px;top:24px;width:${Bw - 48}px;font-size:${sampleT.size}px;line-height:${sampleT.line}px">${A(tie(sample, { max: 18 })).replace(/\S+-\S+/g, (m) => `<span style="white-space:nowrap">${m}</span>`)}</div>`
    + `<div style="left:24px;top:${Bh - 24 - 24 * ws.length}px">${ws.map((w) => `<div class="pl-w" style="font-weight:${w}">${weightName[w] || w}${NB}${w}</div>`).join('')}</div>`);
  return page(ctx, 'typefaces', { object: plateA + plateB, wall: c.wall, label: c.label });
}

// ---- 010 applications: a business card (front over back, 85 x 55 mm at 3.2 px to the millimetre) and a square post, hung as one group of three ----
function businessCard(ctx) {
  const R = roles(ctx), B = ctx.brand, ap = B.applications, g = ctx.logo.geos, c = cardCopy(ctx, R), cws = B.logo.colourways;
  const fw = 272, fh = 176, gap = 48, post = 248, apart = 64;                 // the two cards stand 48 apart (a key sits 8 below its card and has 24 to spare above the next); the post stands 64 off
  const gw = fw + apart + post, gh = 2 * fh + gap;                              // the group: 584 x 400, hung on the centre and the sightline
  const x = hungX(gw), y0 = hung(gh), px_ = x + fw + apart, py = hung(post);
  const wide = ctx.logo.geo.aspect > 4, lw = wide ? 168 : 136;                  // one lock-up on the front, and on the post: the wordmark when it is wide (a horizontal lock-up of symbol and wordmark would read as two), else the horizontal logo
  const lockup = wide ? 'colour' : 'horizontal';
  const front = solid(R, x, y0, fw, fh, R.panel,
    `<div style="left:24px;top:24px">${ctx.logo.html(lockup, { width: lw, color: R.onColour(R.panel, 11) })}</div>`
    + `<div class="cd" style="left:24px;bottom:24px"><div class="cd-n">${A(ap.card.person)}</div><div class="cd-r">${A(ap.card.role)}</div><div class="cd-e">${A(ap.card.contact)}</div></div>`);
  const symH = 64, symW = symH * g.symbol.w / g.symbol.h;                       // one lock-up on the back: the symbol
  const sym = ctx.logo.html('symbol', { width: symW, colourway: R.colourwayOn(R.action), color: R.onColour(R.action, 11) });
  const back = solid(R, x, y0 + fh + gap, fw, fh, R.action, `<div style="left:${px((fw - symW) / 2)};top:${px((fh - symH) / 2)}">${sym}</div>`);
  // the post: the brand's line in display type, the horizontal logo at the foot, on the colourway drawn on the ink
  const cwKey = ['reversed', 'mono-light'].find((k) => cws[k] && cws[k].ground.toLowerCase() === R.ink.toLowerCase()) || 'reversed';
  const pfill = cws[cwKey].ground, ptext = R.onColour(pfill, 13);
  const plw = wide ? 168 : 136, plh = wide ? plw / ctx.logo.geo.aspect : plw / g.horizontal.w * g.horizontal.h, room = post - 48 - plh - 16;
  const line = tie(B.lines.primary, { max: 16 });
  const T = fitDisplay(ctx, line, post - 48, Math.floor(room / token(ctx, 'headline').line));
  if (wrapLines(ctx, 'display', ctx.weights.heading, T.size, line, post - 48).length * T.line > room) throw new Error(`the post's line "${B.lines.primary}" does not fit the post at the title size`);
  const pBox = solid(R, px_, py, post, post, pfill,
    `<div class="disp" style="left:24px;top:24px;width:${post - 48}px;font-size:${T.size}px;line-height:${T.line}px;color:${ptext}">${A(line)}</div>`
    + `<div style="left:24px;top:${px(post - 24 - plh)}">${ctx.logo.html(lockup, { width: plw, colourway: cwKey, color: R.onColour(pfill, 11) })}</div>`);
  const keys = key(1, x, y0 + fh) + key(2, x, y0 + gh) + key(3, px_, py + post);
  return page(ctx, 'business-card', { object: front + back + pBox + keys, wall: c.wall, label: c.label });
}

// ---- 004 logo: the primary large with its clear space, and a row of versions (stacked, symbol, reversed and, where the brand has a one-colour version, mono), each its own object ----
function logo(ctx) {
  const R = roles(ctx), B = ctx.brand, g = ctx.logo.geos, geo = ctx.logo.geo, cws = B.logo.colourways;
  const mono = !!cws['mono-dark'];                                   // a brand with no one-colour version gets no Mono tile
  const names = ['Colour', 'Stacked', 'Symbol', 'Reversed', ...(mono ? ['Mono'] : [])];
  const W = 616, X0 = hungX(W);                                    // the group, 616 wide, hung on the centre
  const bigH = 352, rowH = 96, gapCase = 24, gapRow = 24, n = names.length - 1, tw = (W - (n - 1) * gapRow) / n;   // tiles 96 high, 24 apart, 24 below the case
  const H = bigH + gapCase + rowH, Y0 = hung(H), rowY = Y0 + bigH + gapCase;
  // the primary: the largest it can be with its four clear-space squares inside the plate
  const pad = 24, region = bigH - 2 * pad;
  const perW = 1 / geo.aspect + 2 * geo.unit / geo.width;          // block height (logo plus clear space both sides) per px of logo width
  const pw = Math.floor(Math.min(geo.aspect > 4 ? 460 : 400, region / perW, (W - 2 * pad) / (1 + 2 * geo.unit / geo.width))), ph = pw / geo.aspect, u = Math.round(geo.unit * pw / geo.width);
  const px0 = (W - pw) / 2, py0 = (bigH - ph) / 2;
  const sq = (x, y) => `<div style="left:${px(x)};top:${px(y)};width:${u}px;height:${u}px;border:1px solid var(--edge);box-sizing:border-box"></div>`;
  const cl = Math.round(px0 - u), cr = Math.round(px0 + pw), ct = Math.round(py0 - u), cb = Math.round(py0 + ph);
  const primary = solid(R, X0, Y0, W, bigH, R.panel,
    `<div style="left:${px(px0)};top:${px(py0)}">${ctx.logo.html('colour', { width: pw, colourway: R.colourwayOn(R.panel), color: R.onColour(R.panel, 11) })}</div>` + sq(cl, ct) + sq(cr, ct) + sq(cl, cb) + sq(cr, cb));
  const fit = (id, maxW, maxH) => { const k = Math.min(maxW / g[id].w, maxH / g[id].h); return { w: g[id].w * k, h: g[id].h * k }; };
  const plate = (x, id, cw, fill) => {
    const f = fit(id, tw - 32, rowH - 32);
    return solid(R, x, rowY, tw, rowH, fill, `<div style="left:${px((tw - f.w) / 2)};top:${px((rowH - f.h) / 2)}">${ctx.logo.html(id, { width: f.w, colourway: cw, color: R.onColour(fill, 11) })}</div>`);
  };
  const xs = Array.from({ length: n }, (_, i) => X0 + i * (tw + gapRow));
  const tiles = [['stacked', R.colourwayOn(R.panel), R.panel], ['symbol', R.colourwayOn(R.panel), R.panel], ['colour', 'reversed', cws.reversed.ground], ...(mono ? [['colour', 'mono-dark', R.panel]] : [])];
  const versions = tiles.map(([id, cw, fill], i) => plate(xs[i], id, cw, fill)).join('');
  const keys = key(1, X0, Y0 + bigH) + xs.map((x, i) => key(i + 2, x, rowY + rowH)).join('');
  const c = logoCopy(ctx, names);
  return page(ctx, 'logo', { object: primary + versions + keys, wall: c.wall, label: c.label });
}

export const guidelines = { cover, personality, logo, palette, typefaces, 'business-card': businessCard };
