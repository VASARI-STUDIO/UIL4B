// Theme 33, Flyleaf, slice 2 (the Circular pass): pages 1 to 11 at 16:9 (cover, contents, Brand: who, voice, words; Logo: mark, versions, space, misuse).
// A4 portrait is slice 5, so every page here hands a portrait ctx back to the as-built page in brand-a.js. Layout helpers for later slices: pic(), darkest(), bigLine().
import { logoFacts } from '../../engine/styleguide.js';
import { ratio } from '../../engine/color.js';
import {
  SECTIONS, tones, mix, geo, measure, own, standIn, realOf, at, hr, mono, ghost, page, bare, textCol, field, groundsOf, hslOf, n1, pad2, fullFolio, logoAr,
} from './kit.js';
import { guidelines as A, word, edged, pageRows } from './brand-a.js';
import { photo } from './photos.js';
import { copy, isShowcase } from './showcase.js';

// a page that is only drawn at 16:9 here; A4 keeps the as-built page until slice 5
const wide = (id, fn) => (ctx) => (geo(ctx).portrait ? A[id](ctx) : fn(ctx));

// A photograph in the showcase edition. A real export has no photograph to show, so the same box is a flat wash with a one-line note (the user's own picture goes there).
export function pic(ctx, id, o) {
  if (isShowcase(ctx)) return photo(ctx, id, o);
  return fieldPic(ctx, id, o);
}
// What the photograph in a slot would show (the mono caption), by photo id
const EXAMPLE = {
  paperbacks: 'five plain paperbacks stacked on linen', proofs: 'an editor marking proofs at a desk', train: 'a reader on a train, dusk light',
  flatlay: 'a card, a bookmark and a sheet on paper', laptop: 'a laptop on a stone plinth', stationery: 'a letterhead and two cards',
  'margin-note': 'a pencil note in a book margin', phone: 'a hand holding a phone',
};
const IDS = Object.keys(EXAMPLE);
// There is no stock photograph in a customer's export. A slot is a full-bleed field in one of the brand's own colours with a large ghost "Aa" in the display face,
// cropped the way the photograph would be, and a mono caption saying what goes there. The "Aa" is decoration (marked demo for the contrast check); the caption passes.
export function fieldHex(ctx, id) {
  const L = ctx.roles.light;
  // the brand's colours that are not the page's own ground, most saturated first, so the field reads as colour and not as black or paper
  const pool = ctx.colours.map((c) => c.hex).filter((h) => h.toLowerCase() !== L.surface.toLowerCase() && hslOf(h)[2] > 12 && hslOf(h)[2] < 92)
    .sort((a, b) => hslOf(b)[1] - hslOf(a)[1]);
  const hex = pool.length ? pool[Math.max(0, IDS.indexOf(id)) % pool.length] : L.sunken;
  return hex;
}
export function fieldPic(ctx, id, o) {
  const hex = fieldHex(ctx, id);
  const t = tones(ctx, hex), w = o.w, h = o.h, S = Math.min(h * 1.25, w * 0.95);
  const ghost = mix(hex, t.ink, 0.16);
  const aa = `<div class="a d" data-contrast="demo" style="left:${n1(w - S * 0.82)}px;top:${n1(h - S * 0.8)}px;font-size:${n1(S)}px;line-height:1;letter-spacing:-0.04em;color:${ghost};font-weight:${ctx.weights.heading}">Aa</div>`;
  const cap = w >= 150 && h >= 70 ? `<div class="a" style="left:14px;bottom:12px;right:${n1(Math.max(14, w * 0.3))}px"><span class="m w" style="color:${o.label || t.ink}">${w < 300 ? 'Your photograph.' : `Your photograph. Example: ${EXAMPLE[id] || 'the picture for this page'}.`}</span></div>` : '';
  return `<div class="fl-im" style="position:relative;overflow:hidden;width:${n1(w)}px;height:${n1(h)}px;background:${hex};box-sizing:border-box">${aa}${cap}</div>`;
}
// the darkest colour of the palette (Graphite in Margin): the ground for the pages that sit on black in the Circular books
export const darkest = (ctx) => [...ctx.colours].sort((a, b) => ratio(a.hex, '#000000') - ratio(b.hex, '#000000'))[0].hex;
// a display line that may wrap in its box and be cropped by the page edge: x can be negative
export const bigLine = (x, y, w, text, size, { lh = 1, colour = '', track = -0.02, style = '' } = {}) =>
  at(x, y, w, null, `<div class="d" style="font-size:${n1(size)}px;line-height:${lh};white-space:normal;letter-spacing:${track}em;${colour ? `color:${colour};` : ''}${style}">${text}</div>`);

const SX = 427; // the specimen area starts here (640 on the 1920 spec)

export const guidelines = {
  cover: wide('cover', (ctx) => {
    const K = geo(ctx), G = groundsOf(ctx), M = measure(ctx), name = realOf(ctx, ctx.brand.name), stand = standIn(ctx);
    const px = 768, room = px - K.L, size = Math.max(64, M.fit(name, room * 1.03, 330)), base = K.H - 68;
    const ph = (ctx.placeholders && ctx.placeholders.entries.find((e) => e.path === 'name')) || null;
    const note = stand && ph ? `<span class="m">${ctx.esc(ph.label)}, ${ctx.esc(ph.length)}</span>` : '';
    // the name is drawn first and the photograph (or the leaf) over it, so the name runs on under the edge
    const nameBox = at(K.L - 8, base - size * M.base - 6, px - K.L + size, size * 1.1, own(ctx, ctx.brand.name), { cls: 'd', style: `font-size:${n1(size)}px;letter-spacing:-0.02em;${stand ? 'color:var(--quiet);' : ''}` });
    const right = isShowcase(ctx) ? at(px, 0, K.W - px, K.H, photo(ctx, 'paperbacks', { w: K.W - px, h: K.H, fx: 0.5, fy: 0.66, alt: 'Five plain paperbacks stacked on linen' }))
      : at(px, 0, K.W - px, K.H, '', { style: `background:${G.primary}` });
    const body = `${nameBox}${right}${at(K.L, K.T, 340, 14, '<span class="m i">Brand guidelines</span>')}${at(K.L, K.T + 18, 340, 14, `<span class="m">${ctx.esc(ctx.versionLine)}</span>`)}${note ? at(K.L, base - size * 0.72 - 40, px - K.L, 14, note) : ''}`;
    return bare(ctx, 'cover', { ground: G.surface, body, creditOn: isShowcase(ctx) ? G.surface : G.primary });
  }),

  contents: wide('contents', (ctx) => {
    const K = geo(ctx), M = measure(ctx), g = darkest(ctx);
    const cols = [[1, 2], [3, 4], [5, 6, 7]], xs = [64, 469, 875], cw = 341, y0 = 133, rowH = 18, headH = 30;
    const out = cols.map((ns, ci) => {
      let y = y0; const x = xs[ci];
      return ns.map((n) => {
        const s = SECTIONS[n - 1];
        const head = hr(x, y, cw) + at(x, y + 6, cw, headH, `<span class="m i" style="width:34px;flex:none">${n}.0</span><span class="m i" style="flex:1">${s.name}</span><span class="m">${pad2(fullFolio(s.open))}</span>`, { style: 'display:flex;align-items:center;gap:8px;font-size:11px' });
        const rows = pageRows(s).map((r, i) => at(x, y + headH + 8 + i * rowH, cw, rowH, `<span class="m" style="width:34px;flex:none">${r.ref}</span><span class="m" style="flex:1;color:var(--ink)">${r.title}</span><span class="m">${pad2(r.folio)}</span>`, { style: 'display:flex;align-items:center;gap:8px;font-size:11px' })).join('');
        y += headH + 8 + s.pages.length * rowH + 28;
        return head + rows;
      }).join('');
    }).join('');
    // the one big thing: the word, on the foot margin, in the display face
    const big = word(ctx, M, 56, K.H - 56, 'Contents', 190, { colour: 'var(--ink)' });
    return page(ctx, 'contents', { ground: g, body: out + big });
  }),

  who: wide('who', (ctx) => {
    const K = geo(ctx), E = ctx.esc;
    const px = SX, pw = K.W - K.R - px, ph = 400, py = 107, cwid = (pw - 2 * 24) / 3;
    const img = at(px, py, pw, ph, pic(ctx, 'proofs', { w: pw, h: ph, fx: 0.34, fy: 0.5, alt: 'An editor marking printed proofs with a pencil' }));
    // the headline starts left of the page edge and is cropped by it; it wraps inside the room left of the photograph
    const head = bigLine(isShowcase(ctx) ? -8 : 64, 296, isShowcase(ctx) ? 392 : 330, ghost(ctx, copy(ctx, 'lines.primary'), 'lines.primary', 'A line the brand lives by.'), 80, { lh: 1.0 });
    const items = [['Description', copy(ctx, 'description')], ['What it does', copy(ctx, 'product')], ['Who it serves', copy(ctx, 'audience')]];
    const cols = items.map(([l, v], i) => at(px + i * (cwid + 24), py + ph + 24, cwid, K.y1 - (py + ph + 24), `<div class="m" style="margin-bottom:10px">${l}</div><div class="b" style="font-size:13px;line-height:1.45">${E(v)}</div>`)).join('');
    return page(ctx, 'who', { body: textCol(ctx, 'who', 'What the brand is, what it does and who it is for.') + head + img + cols });
  }),

  voice: wide('voice', (ctx) => {
    const K = geo(ctx), E = ctx.esc, g = groundsOf(ctx).ink;
    const list = [0, 1, 2].map((i) => ({ trait: copy(ctx, `personality.${i}.trait`), means: copy(ctx, `personality.${i}.means`) })).filter((p) => p.trait != null);
    const top = 104, rh = Math.floor((K.y1 - top) / Math.max(list.length, 1)), px = 640;
    const out = list.map((p, i) => {
      const y = top + i * rh;
      return hr(K.L, y, K.W - K.L - K.R) + at(K.L, y + 14, 60, 14, mono(pad2(i + 1)))
        + at(K.L, y + 34, 560, rh - 40, `<div class="d" style="font-size:104px;line-height:1;white-space:normal;letter-spacing:-0.02em">${ghost(ctx, p.trait, `personality.${i}.trait`, 'A quality')}</div>`)
        + at(px, y + 14, 330, rh - 22, `<div class="m" style="margin-bottom:8px">In practice</div><div class="b" style="font-size:14px;line-height:1.5">${ghost(ctx, p.means, `personality.${i}.means`, null)}</div>`);
    }).join('');
    return page(ctx, 'voice', { ground: g, body: out });
  }),

  words: wide('words', (ctx) => {
    const K = geo(ctx), E = ctx.esc, V = ctx.brand.voice;
    const x = SX, w = K.W - K.R - x;
    copy(ctx, 'voice.boilerplate25');
    const rows = [0, 1, 2].map((i) => V.writeThis && V.writeThis[i]).filter(Boolean);
    const boiler = at(x, 104, w, 300, `<div class="m" style="margin-bottom:14px">The brand in 25 words</div><div class="d" style="font-size:46px;line-height:1.14;white-space:normal;letter-spacing:-0.015em">${ghost(ctx, V.boilerplate25, 'voice.boilerplate25', null)}</div>`);
    // three rows, write this on the left and not this on the right: each struck line has a half column to itself, so it stays on one line
    const half = (w - 40) / 2, top = isShowcase(ctx) ? 436 : 392, rh = isShowcase(ctx) ? 66 : 84, show = isShowcase(ctx);
    const pairs = at(x, top, half, 14, mono('Write this')) + at(x + half + 40, top, half, 14, mono('Not this')) + rows.map((r, i) => {
      const y = top + 26 + i * rh;
      return hr(x, y, w) + at(x, y + 14, half, rh - 18, `<div class="d wc" style="font-size:22px;line-height:1.2;white-space:normal;letter-spacing:0">${ghost(ctx, r.write, `voice.writeThis.${i}.write`, null)}</div>`)
        + at(x + half + 40, y + 14, half, rh - 18, `<div class="d wc${show ? "" : " strk"}" style="font-size:22px;line-height:1.2;white-space:${show ? 'nowrap' : 'normal'};letter-spacing:0;color:var(--quiet);${show ? 'text-decoration:line-through;text-decoration-color:var(--quiet)' : ''}">${ghost(ctx, r.not, `voice.writeThis.${i}.not`, null)}</div>`);
    }).join('');
    return page(ctx, 'words', { body: textCol(ctx, 'words', 'Lines the brand would write, the weaker ones they replace, and the brand in a breath.') + boiler + pairs });
  }),

  mark: wide('mark', (ctx) => {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), E = ctx.esc, L = ctx.logo, ar = L.geo.symbolAspect, slot = ctx.edition === 'slot';
    // the giant mark: 1000 wide, set high and right so the top and right edges cut it
    const pa = logoAr(ctx), bw = slot ? 900 : 1500, bh = bw / pa, bx = slot ? SX + 90 : SX, by = slot ? 150 : 330 - bh / 2;
    const logo = at(bx, by, bw, bh, L.html('colour', { width: bw, color: t.ink }), { cls: 'lf', style: `color:${t.ink};--wm:${isShowcase(ctx) ? 1 : 0.35}` });
    const idea = at(K.tx.x, K.tx.y + 150, K.tx.w, null, `<div class="m" style="margin-bottom:8px">The idea</div><div class="b" style="font-size:${K.body}px;line-height:1.5">${E(copy(ctx, 'logo.idea'))}</div>`);
    return page(ctx, 'mark', { body: logo + textCol(ctx, 'mark', 'The mark, cut by the edge of the page so it reads as a part of something larger.') + idea });
  }),

  versions: wide('versions', (ctx) => {
    const K = geo(ctx), F = logoFacts(ctx), E = ctx.esc;
    const seen = new Set(), picks = [];
    for (const g of F.grounds) { const h = g.groundHex.toLowerCase(); if (!seen.has(h)) { seen.add(h); picks.push(g); } }
    const four = picks.slice(0, 4), top = 107, x0 = SX, w = K.W - x0, hh = K.H - top, cw = w / 2, ch = hh / 2;
    const cells = four.map((g, i) => {
      const cx = x0 + (i % 2) * cw, cy = top + Math.floor(i / 2) * ch, t = tones(ctx, g.groundHex), lw = ctx.edition === 'slot' ? Math.min(cw * 0.7, ch * 0.9) : Math.min(cw * 0.5, 230);
      const when = ctx.brand.logo.when && ctx.brand.logo.when[g.key];
      const ground = (ctx.colours.find((c) => c.hex.toLowerCase() === g.groundHex.toLowerCase()) || {}).name;
      const cap = isShowcase(ctx) && i === 0 ? copy(ctx, 'page.versions.caption') : when;
      const inner = `<div class="a lf" style="width:${n1(lw)}px;height:${n1(lw / logoAr(ctx))}px;left:${n1(ctx.edition === 'slot' ? cw / 2 - lw / 2 : 32)}px;top:${n1(ctx.edition === 'slot' ? Math.max(8, (ch - 100) / 2 - lw / logoAr(ctx) / 2) : ch * 0.16)}px;color:${t.ink}">${ctx.logo.html('colour', { width: lw, colourway: g.key, color: t.ink })}</div>`
        + `<div class="a" style="left:32px;bottom:22px;right:24px"><div class="m i">${E(g.label)}</div><div class="m">${ground ? own(ctx, ground) : ''} ${g.groundHex.toUpperCase()}</div>${cap ? `<div class="ph-tight m w" style="margin-top:4px">${E(cap)}</div>` : ''}</div>`;
      return field(ctx, cx, cy, cw + 1, ch + 1, g.groundHex, inner, edged(ctx, g.groundHex));
    }).join('');
    return page(ctx, 'versions', { body: textCol(ctx, 'versions', 'The logo on each ground it is drawn for.') + cells });
  }),

  space: wide('space', (ctx) => {
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.surface), F = logoFacts(ctx), L = ctx.logo, E = ctx.esc;
    const ar = logoAr(ctx), min = Math.max(32, F.min.screenPx), top = 107;
    // one big rung in ink (62 percent of the specimen width), then four small ones in a row under it, faded back; the smallest the logo goes is in ink again
    const lw = [Math.round((K.W - K.R - SX) * 0.62), 232, 168, Math.max(124, Math.round(min * 1.3)), min];
    const lad = []; let x = SX; const rowBase = K.y1 - 34;
    lad.push(at(SX, top, lw[0], lw[0] / ar, L.html('colour', { width: lw[0], color: t.ink }), { cls: 'lf', style: `color:${t.ink}` }) + at(SX + lw[0] + 28, top + lw[0] / ar * (ctx.edition === 'slot' ? 0.92 : 1) - 14, 200, 14, `<span class="m i">${lw[0]} px</span>`));
    lw.slice(1).forEach((w, i) => {
      const last = i === 3, h = w / ar;
      lad.push(at(x, rowBase - h, w, h, L.html('colour', { width: w, color: t.ink }), { cls: 'lf', style: `color:${t.ink};opacity:${last ? 1 : 0.22}` })
        + at(x, rowBase + 12, w + 60, 14, `<span class="m${last ? ' i' : ''}">${last ? `Minimum ${w} px` : `${w} px`}</span>`));
      x += w + 36;
    });
    // the clear space: the logo's cap height on every side, small, under the title
    const LW = 180, LH = LW / ar, u = Math.max(6, L.geo.unit * (LW / L.geo.width)), bx = K.tx.x + u, by = 470;
    const rect = (x, yy, ww, hh2, st) => at(x, yy, ww, hh2, '', { style: `border:.5px ${st} var(--${st === 'dashed' ? 'quiet' : 'hair'})` });
    const dia = rect(bx - u, by - u, LW + 2 * u, LH + 2 * u, 'dashed') + rect(bx, by, LW, LH, 'solid') + at(bx, by, LW, LH, L.html('colour', { width: LW, color: t.ink }), { cls: 'lf', style: `color:${t.ink}` })
      + at(K.tx.x, by + LH + u + 14, 276, 14, mono(`x = ${F.unitText}`)) + at(K.tx.x, by - u - 28, 200, 14, mono('Clear space'));
    const smallest = copy(ctx, 'page.space.smallest', `Smallest: ${F.min.printMm} mm in print, ${F.min.screenPx} px on screen.`);
    return page(ctx, 'space', { body: textCol(ctx, 'space', E(smallest)) + dia + lad.join('') });
  }),

  misuse: wide('misuse', (ctx) => {
    // the as-built grid, moved onto the specimen area with the slash in the primary colour
    const K = geo(ctx), G = groundsOf(ctx), t = tones(ctx, G.raised), L = ctx.logo, e = { x: SX, y: 107, w: K.W - K.R - SX, h: K.y1 - 107 };
    const cols = 3, rowsN = 2, gap = 16, cap = 26;
    const cw = (e.w - gap * (cols - 1)) / cols, ch = (e.h - gap * (rowsN - 1)) / rowsN - cap;
    const slot = ctx.edition === 'slot', lid = slot ? 'symbol' : 'colour';
    const lw = slot ? Math.min(cw * 0.46, ch * 0.62 * L.geo.symbolAspect, 170) : Math.min(cw * 0.56, 210), lh = lw / (slot ? L.geo.symbolAspect : L.geo.aspect);
    const inv = ctx.colours.map((c) => c.hex).find((h) => ratio(h, t.ground) >= 3 && ratio(h, t.ground) < 6 && h.toLowerCase() !== G.ink.toLowerCase()) || t.quiet;
    const fg = (() => { let best = null; for (const a of ctx.colours) for (const b of ctx.colours) { const r = ratio(a.hex, b.hex); if (a.hex.toLowerCase() !== b.hex.toLowerCase() && r < 3 && (!best || r > best.r)) best = { fg: a.hex, bg: b.hex, r }; } return best || { fg: t.hair, bg: t.ground }; })();
    const logoAt = (colour, st = '') => `<div class="a" style="left:${n1(cw / 2 - lw / 2)}px;top:${n1(ch / 2 - lh / 2)}px;color:${colour};${st}">${L.html(lid, { width: lw, color: colour })}</div>`;
    const crowd = [[-0.6, -0.9], [0.9, 0.7]].map(([dx, dy]) => `<div class="a" style="left:${n1(cw / 2 - lw / 2 + (dx > 0 ? lw + 4 : -lw * 0.6 - 4))}px;top:${n1(ch / 2 - lh / 2 + (dy > 0 ? 6 : -6))}px;width:${n1(lw * 0.6)}px;height:${n1(lh)}px;background:${t.hair}"></div>`).join('');
    const items = [
      ['Do not stretch', t.ground, logoAt(t.ink, 'transform:scaleX(1.5);transform-origin:center')],
      ['Do not recolour', t.ground, logoAt(inv)],
      ['Do not outline', t.ground, `<div class="a" style="left:${n1(cw / 2 - lw / 2 - 8)}px;top:${n1(ch / 2 - lh / 2 - 8)}px;width:${n1(lw + 16)}px;height:${n1(lh + 16)}px;border:1px solid ${t.ink}"></div>${logoAt(t.ink)}`],
      ['Do not rotate', t.ground, logoAt(t.ink, 'transform:rotate(-14deg)')],
      ['Do not use on a ground it fails on', fg.bg, logoAt(fg.fg)],
      ['Do not crowd it', t.ground, crowd + logoAt(t.ink)],
    ];
    const cells = items.map(([label, gnd, inner], i) => {
      const x = e.x + (i % cols) * (cw + gap), y = e.y + Math.floor(i / cols) * (ch + cap + gap);
      const slash = `<svg class="a" style="left:0;top:0" width="${n1(cw)}" height="${n1(ch)}" viewBox="0 0 ${n1(cw)} ${n1(ch)}" aria-hidden="true"><line x1="0" y1="${n1(ch)}" x2="${n1(cw)}" y2="0" stroke="${G.primary}" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>`;
      return at(x, y, cw, ch, `${inner}${slash}`, { cls: 'wm', style: `background:${gnd};border:.5px solid ${t.hair};overflow:hidden` }) + at(x, y + ch + 8, cw, 14, mono(label));
    }).join('');
    return page(ctx, 'misuse', { ground: G.raised, body: textCol(ctx, 'misuse', 'Six ways the logo is never drawn.') + cells });
  }),
};
