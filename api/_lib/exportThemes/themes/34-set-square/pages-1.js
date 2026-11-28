// Theme 34, Set Square: pages 1 to 7 (cover, contents, the Brand section with its opener, and the Logo opener). 16:9 only (1280 x 720); A4 is a later slice.
// Families: DS drawing sheet (cover), PL floor plan (contents), DO datum (every opener), PS panorama (who), SP spec columns (voice), RM redline (words).
import { copy } from './showcase.js';
import { ratio } from '../../engine/color.js';
import { photo } from './photos.js';
import {
  SECTIONS, refOf, sheetsOf, pad2, fullFolio, tones, groundsOf, geo, measure, own, standIn, realOf, at, hr, vr, mono, fill, svgAt, dim, sheet, leaf, field, word, ghost, isGhost, mix,
  voidField, PHOTO_NOTE, n1, dimBg,
} from './kit.js';

const hexName = (ctx, hex) => { const c = ctx.colours.find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return c ? own(ctx, c.name) : ''; };

// ---- DO: the datum opener ----
// A 2 px datum at y 552 ("FFL 0.00", finished floor level); the section name at 176 px stands on it from x 64 with its cap height dimensioned at x 40; the plumb line hangs from
// y 0 at x 1120 to a 16 px bob just above the datum; the sheets are listed below in four mono columns.
function opener(ctx, id) {
  const K = geo(ctx), R = refOf(ctx, id), s = R.sec, ground = leaf(ctx, s.n), t = tones(ctx, ground), M = measure(ctx), size = 176, base = 552;
  const cap = Math.round(M.cap * size);
  const sheets = sheetsOf(s);
  const list = sheets.map((p, i) => at(64 + i * 288, 584, 270, 52, `<div class="m i">${p.sheet}</div><div class="lb i" style="margin-top:2px;font-size:13px;line-height:18px">${ctx.esc(p.title)}</div><div class="m" style="margin-top:0">${pad2(p.folio)}</div>`)).join('');
  const bob = `<path d="M1117 520H1123V527L1120 536L1117 527Z" fill="${t.dim}"/>`;
  const body = `${at(64, 96, 400, 16, `<span class="m i">Section ${s.n}.0</span>`)}${at(64, 116, 520, 22, `<span class="lb" style="font-size:13px">${R.sheet} to ${s.ser}-${pad2(s.pages.length)}</span>`)}`
    + `<div data-contrast="demo">${word(M, 1076 - M.width(String(s.n), 560), base, String(s.n), 560, { style: `color:${mix(ground, t.ink, 0.17)};font-variant-numeric:tabular-nums` })}</div>`
    + word(M, 64, base, ctx.esc(s.name), size) + dim(ctx, 'v', 40, base - cap, cap, cap, { ground, ext: 6 })
    + fill(64, base, 1152, 2, 'var(--ink)') + at(1016, base - 24, 200, 16, '<span class="m i" style="text-align:right;display:block">FFL 0.00</span>')
    + svgAt(1100, 0, 40, 540, `<path d="M20.5 0V520" stroke="var(--ink)" stroke-width="1" fill="none"/><path d="M17 520H23V527L20 536L17 527Z" fill="${t.dim}"/>`)
    + list;
  return sheet(ctx, id, { ground, body });
}

export const guidelines = {
  // ---- 1 Cover (DS) ----
  // The wordmark at 1024 wide on its set-out: cap line, x-height and baseline carried across the sheet, the plumb line dropping from the l to the datum (FFL 0.00),
  // the width as a large dimension above. The logo's own plumb ends on the datum, so the drop is the logo's own length.
  cover(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), M = measure(ctx), E = ctx.esc;
    const slot = ctx.edition === 'slot', W = 1024, base = 440;
    let mark, top, bottom;
    if (!slot) {
      const g = ctx.logo.geo, h = W / g.aspect, frac = g.top ? g.top / (g.top + g.cap) : 0.55;
      top = base - frac * h; bottom = top + h;
      mark = at(64, top, W, h, ctx.logo.html('colour', { width: W, colourway: 'colour' }));
    } else {
      const size = M.fit('Your wordmark', W, 400);
      top = base - M.cap * size; bottom = base + 0.157 * W;
      mark = word(M, 64, base, 'Your wordmark', size, { style: 'color:var(--quiet)' }) + at(64, base + 20, 500, 16, '<span class="m">Your logo, SVG.</span>');
    }
    const datum = Math.round(bottom), tp = Math.round(top), xh = Math.round(base - 0.68 * (base - top)), px = Math.round(64 + 0.163 * W), dy = tp - 44;
    const legend = [['Ink', G.ink], ['Dimension', G.primary], ['Datum', G.accent]].map(([l, hex], i) =>
      at(992, 96 + i * 24, 224, 18, `<span style="display:inline-block;width:12px;height:12px;vertical-align:-2px;margin-right:10px;background:${hex};box-shadow:inset 0 0 1px var(--hair)"></span><span class="lb i">${l}</span><span class="lb" style="margin-left:8px">${hexName(ctx, hex)}</span>`)).join('');
    const c = t.dim, tick = (x, y) => `<path d="M${x - 4} ${y + 4}L${x + 4} ${y - 4}"/>`, gap = 132, mid = 64 + W / 2;
    const setout = svgAt(0, 0, 1280, 720, `<g stroke="${c}" stroke-width="1" fill="none" opacity=".6"><path d="M40 ${tp + 0.5}H1216M40 ${base + 0.5}H1216M64.5 ${dy}V${datum}M${64 + W + 0.5} ${dy}V${base}M${px + 0.5} ${dy}V${base}"/><path d="M40 ${xh + 0.5}H1216" stroke-dasharray="5 5"/></g>`
      + `<g stroke="${c}" stroke-width="1" fill="none"><path d="M64 ${dy}H${mid - gap / 2}M${mid + gap / 2} ${dy}H${64 + W}"/>${tick(64, dy)}${tick(64 + W, dy)}</g>`
      + (slot ? `<path d="M${px + 0.5} ${base}V${datum - 9}" stroke="var(--ink)" stroke-width="1" fill="none"/><path d="M${px - 3} ${datum - 9}H${px + 4}V${datum - 2}L${px + 0.5} ${datum}L${px - 3} ${datum - 2}Z" fill="${c}"/>` : ''))
      + at(mid - gap / 2, dy - 18, gap, 36, `<span class="m" style="display:block;text-align:center;font-size:28px;line-height:36px;color:${c}">${W}</span>`)
      + [['CAP LINE', tp], ['X-HEIGHT', xh], ['BASELINE', base]].map(([l, y]) => at(1096, y - 18, 120, 16, `<span class="m" style="display:block;text-align:right">${l}</span>`)).join('')
      + fill(64, datum, 1152, 2, 'var(--ink)') + at(1016, datum - 24, 200, 16, '<span class="m i" style="display:block;text-align:right">FFL 0.00</span>')
      + dim(ctx, 'v', 1160, base, datum - base, datum - base, { ground: G.surface, ext: 6 });
    const body = at(64, 96, 640, 52, `<h1 class="d h1">${E(copy(ctx, 'page.cover.title', 'Brand guidelines.'))}</h1>`)
      + at(64, 160, 520, 80, `<div class="d h2" style="font-weight:${ctx.weights.regular}">${ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary')}</div>`)
      + legend + setout + mark;
    return sheet(ctx, 'cover', { ground: G.surface, body });
  },

  // ---- 2 Contents (PL): a floor plan, one room per section, sized by page count ----
  contents(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx);
    const X = 64, Y = 120, PW = 1152, PH = 480, total = SECTIONS.reduce((a, s) => a + s.pages.length, 0);
    const rowsDef = [SECTIONS.slice(0, 3), SECTIONS.slice(3)];
    const counts = rowsDef.map((r) => r.reduce((a, s) => a + s.pages.length, 0));
    let y = Y, rooms = '', walls = '', doors = '', gaps = '';
    rowsDef.forEach((row, ri) => {
      const h = PH * counts[ri] / total; let x = X;
      row.forEach((s) => {
        const w = PW * s.pages.length / counts[ri];
        walls += `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}"/>`;
        // a door on the outer wall: the top wall of the upper row, the bottom wall of the lower row; the arc swings into the room
        const R = 56, dx = ri === 0 ? x + w - 30 - R : x + 30;
        if (ri === 0) { gaps += `<rect x="${n1(dx)}" y="${n1(y - 4)}" width="${R}" height="8"/>`; doors += `<path d="M${n1(dx + R)} ${n1(y)}V${n1(y + R)}M${n1(dx)} ${n1(y)}A${R} ${R} 0 0 0 ${n1(dx + R)} ${n1(y + R)}"/>`; }
        else { gaps += `<rect x="${n1(dx)}" y="${n1(y + h - 4)}" width="${R}" height="8"/>`; doors += `<path d="M${n1(dx)} ${n1(y + h)}V${n1(y + h - R)}M${n1(dx + R)} ${n1(y + h)}A${R} ${R} 0 0 0 ${n1(dx)} ${n1(y + h - R)}"/>`; }
        const list = sheetsOf(s).map((p, i) => `<div style="display:flex;gap:8px;height:20px;align-items:center"><span class="m i" style="width:36px;flex:none">${p.sheet}</span><span class="m" style="flex:1;min-width:0;overflow:hidden;text-overflow:clip">${ctx.esc(p.title)}</span><span class="m">${pad2(p.folio)}</span></div>`).join('');
        rooms += at(x + 24, y + 24, w - 48, 40, `<div style="display:flex;align-items:baseline;gap:10px"><span class="d h2" style="font-size:24px">${s.name}</span><span class="m">${pad2(fullFolio(s.open))}</span></div>`)
          + at(x + 24, y + 72, w - 48, s.pages.length * 20, list)
          + word(M, x + w - 24 - 120, y + h - 24, pad2(s.pages.length), 72, { w: 120, style: 'text-align:right;color:var(--quiet)' });
        x += w;
      });
      y += h;
    });
    // the plan
    const plan = svgAt(0, 0, K.W, K.H, `<g fill="${t.wash}" stroke="none"><rect x="${X}" y="${Y}" width="${n1(PW * counts[0] / counts[0] * 0.0 + 0)}" height="0"/></g><g fill="none" stroke="var(--ink)" stroke-width="6" stroke-linejoin="miter">${walls}</g><g fill="${g}" stroke="none">${gaps}</g><g fill="none" stroke="var(--ink)" stroke-width="1.25">${doors}</g>`);
    const body = at(64, 64, 480, 52, '<h1 class="d h1" style="line-height:48px">Contents</h1>')
      + at(736, 82, 480, 16, '<span class="m" style="display:block;text-align:right">Seven rooms. A room is as big as the pages it holds.</span>')
      + plan + rooms
      + dim(ctx, 'h', 64, 624, 1152, 1152, { ground: g, ext: 6 }) + dim(ctx, 'v', 1244, 120, 480, 480, { ground: g, ext: 6 });
    return sheet(ctx, 'contents', { ground: g, body });
  },

  'open-brand': (ctx) => opener(ctx, 'open-brand'),
  'open-logo': (ctx) => opener(ctx, 'open-logo'),
  'open-colour': (ctx) => opener(ctx, 'open-colour'),
  'open-type': (ctx) => opener(ctx, 'open-type'),
  'open-layout': (ctx) => opener(ctx, 'open-layout'),
  'open-use': (ctx) => opener(ctx, 'open-use'),
  'open-close': (ctx) => opener(ctx, 'open-close'),

  // ---- 4 Who we are (PS): a panorama strip, then three columns ----
  who(ctx) {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), B = ctx.brand, E = ctx.esc;
    const photoOn = ctx.edition === 'showcase';
    const strip = photoOn ? at(0, 72, 1280, 288, photo(ctx, 'midjob', { w: 1280, h: 288, fx: 0.5, fy: 0.5 })) : voidField(ctx, 0, 72, 1280, 288, G.ink, PHOTO_NOTE);
    const cols = [['Description', B.description, 'description', 'What the brand is, in one sentence.', true], ['What it does', B.product, 'product', 'What a customer does with it.', false], ['Who it serves', B.audience, 'audience', 'Who it is for, and what they want.', false]];
    const x = [64, 448, 832];
    const out = cols.map(([label, v, path, ph, lead], i) => at(x[i], 408, 352, 20, `<span class="m i">A-01.${i + 1}</span><span class="lb" style="margin-left:12px">${label}</span>`)
      + hr(x[i], 400, 320, 'var(--ink)') + at(x[i], 440, 320, 160, `<div class="${lead ? 'd h2' : 'b'}" style="${lead ? 'font-size:24px;' : ''}white-space:normal">${ghost(ctx, v, path, ph, { what: false })}</div>`)).join('');
    const body = strip + dim(ctx, 'h', 0, 378, 1280, 1280, { ground: G.surface, ext: 6 }) + out;
    return sheet(ctx, 'who', { ground: G.surface, body, gridOpts: { y0: 360 } });
  },

  // ---- 5 Voice (SP): the three words stand as stepped elevations, each on its own tread; the rises are dimensioned ----
  voice(ctx) {
    const G = groundsOf(ctx), g = G.surface, M = measure(ctx), B = ctx.brand, list = (B.personality || []).slice(0, 3);
    const xs = [64, 448, 832], bases = [228, 368, 508], tints = [0.16, 0.26, 0.36];
    const tint = (f) => { const q = tones(ctx, g).quiet; let k = f, b = mix(g, G.accent, k); while (k > 0.02 && ratio(q, b) < 4.8) { k -= 0.02; b = mix(g, G.accent, k); } return b; };
    const bg = tints.map(tint);
    const fits = list.map((p, i) => M.fit(isGhost(ctx, p.trait) ? 'A quality' : String(p.trait), 1208 - xs[i] - 40, 168) * (isGhost(ctx, p.trait) ? 0.88 : 1)), common = Math.min(...fits);
    const treads = list.map((p, i) => fill(xs[i], bases[i], 1216 - xs[i], 648 - bases[i], bg[i]) + hr(xs[i], bases[i], 1216 - xs[i], 'var(--ink)', 2) + vr(xs[i], bases[i], 648 - bases[i], 'var(--ink)')).join('');
    const words = list.map((p, i) => {
      const ghosted = isGhost(ctx, p.trait), size = Math.max(56, ghosted ? fits[i] : common), b = bases[i], x = xs[i] + (i ? 16 : 0), cap = Math.round(M.cap * size);
      const trait = ghost(ctx, p.trait, `personality.${i}.trait`, 'A quality', { what: false });
      return at(x, b - cap - 30, 200, 16, `<span class="m i">A-02.${i + 1}</span><span class="lb" style="margin-left:12px">Clause</span>`)
        + word(M, x, b, trait, size, { w: 1216 - x - 8 })
        + at(x, b + (ghosted ? 70 : 44), 352, 90, `<div class="b" style="font-size:20px;line-height:27px">${ghost(ctx, p.means, `personality.${i}.means`, 'How it shows up, in one or two sentences.', { what: false, example: false })}</div>`);
    }).join('');
    const rises = [1, 2].map((i) => dimBg(ctx, 'v', xs[i] - 26, bases[i - 1], bases[i] - bases[i - 1], bases[i] - bases[i - 1], bg[i - 1], 5)).join('')
      + dim(ctx, 'v', 1244, bases[0], bases[2] - bases[0], bases[2] - bases[0], { ground: g, ext: 5 });
    const body = treads + words + rises + at(900, 92, 316, 40, '<div class="m w">Three clauses, each stepped in from the one above.</div>');
    return sheet(ctx, 'voice', { ground: g, body });
  },

  // ---- 6 Words (RM): the boilerplate issued, and each weaker line superseded by a redline ----
  words(ctx) {
    const G = groundsOf(ctx), t = tones(ctx, G.surface), V = ctx.brand.voice, E = ctx.esc;
    const rows = (V.writeThis || []).slice(0, 3);
    const tri = (x, y) => svgAt(x, y, 20, 18, `<path d="M10 1L19 17H1Z" fill="none" stroke="var(--dim)" stroke-width="1.25"/>`) + at(x, y + 5, 20, 14, '<span class="dm" style="display:block;text-align:center;font-size:10px;line-height:14px">1</span>');
    const boiler = at(64, 88, 960, 270, `<div class="d" style="font-size:48px;line-height:52px;white-space:normal;letter-spacing:-.025em">${ghost(ctx, V.boilerplate25, 'voice.boilerplate25', 'The brand in about 25 words.', { what: false })}</div>`);
    const head = at(64, 380, 400, 16, '<span class="m i">Issued</span>') + at(640, 380, 400, 16, '<span class="m i">Superseded</span>') + hr(64, 404, 1152, 'var(--ink)');
    const out = rows.map((r, i) => {
      const y = 404 + i * 80;
      return hr(64, y + 80, 1152) + vr(616, y, 80)
        + at(64, y + 14, 512, 64, `<div class="d" style="font-size:24px;line-height:29px;white-space:normal;letter-spacing:-.01em">${ghost(ctx, r.write, `voice.writeThis.${i}.write`, 'A line the brand writes.', { what: false, example: i === 0 })}</div>`)
        + tri(640, y + 17)
        + at(676, y + 14, 540, 64, `<div class="d rl" style="font-size:24px;line-height:29px;white-space:normal;letter-spacing:-.01em;color:var(--quiet)">${ghost(ctx, r.not, `voice.writeThis.${i}.not`, 'The weaker line it replaces.', { what: false, example: false })}</div>`);
    }).join('');
    return sheet(ctx, 'words', { ground: G.surface, body: boiler + head + out });
  },
};
