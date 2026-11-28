// Theme 34, Set Square: pages 8 to 16 (Logo: mark, versions, space, misuse; Colour: palette, tints, pairs, values). 16:9 only (A4 is a later slice).
// Families: SO setting-out (mark), CO courses (versions), DC detail callout (space), DL defects list (misuse), WS wall section (palette), ST levelling staffs (tints),
// SB sample board (pairs, stronger than the spec's cross table), SC schedule with swatch tabs (values).
import { copy } from './showcase.js';
import { hexToRgb, rampBase, ratio } from '../../engine/color.js';
import { logoFacts } from '../../engine/styleguide.js';
import {
  tones, groundsOf, geo, measure, own, realOf, at, hr, vr, fill, svgAt, dim, sheet, field, word, ghost, mix, n1, leader,
} from './kit.js';

const E2 = (ctx, s) => ctx.esc(s);
// distinct colours by share, biggest first
const coloursBy = (ctx) => { const seen = new Set(); return [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share).filter((c) => { const h = c.hex.toLowerCase(); if (seen.has(h)) return false; seen.add(h); return true; }); };
const ROLE = { action: 'Dimensions and the one accent', text: 'Text and dark grounds', panel: 'Paper', ground: 'Every page', highlight: 'Timber signage and datum' };
const slotOn = (ctx) => ctx.edition === 'slot';
// whole-pixel sizes along a length, by share, none under `min`; the last takes the rounding
export function shareSizes(shares, len, min) {
  const n = shares.length, fixed = new Array(n).fill(false); let out = [];
  for (let k = 0; k <= n; k++) {
    const free = shares.reduce((a, v, i) => a + (fixed[i] ? 0 : v), 0) || 1, room = len - min * fixed.filter(Boolean).length;
    out = shares.map((v, i) => (fixed[i] ? min : (room * v) / free));
    const bad = out.findIndex((w, i) => !fixed[i] && w < min);
    if (bad < 0) break; fixed[bad] = true;
  }
  out = out.map(Math.round); out[n - 1] += len - out.reduce((a, b) => a + b, 0);
  return out;
}
// the logo (or, in the slot edition, a ghosted "Your wordmark") with its top-left at x, y and its width w; returns { html, h }
export function markAt(ctx, M, t, x, y, w, kind = 'colour', color) {
  if (slotOn(ctx)) {
    const size = M.fit('Your wordmark', w, 400), h = M.cap * size * 1.4;
    return { h, html: word(M, x, y + M.cap * size, 'Your wordmark', size, { style: `color:${t.quiet}` }) };
  }
  const h = w / ctx.logo.geo.aspect;
  return { h, html: at(x, y, w, h, ctx.logo.html(kind, { width: w, colourway: kind, color: color || t.ink }), { style: `color:${color || t.ink}` }) };
}
const H1 = (txt, x = 64, y = 96, w = 480) => at(x, y, w, 52, `<h1 class="d h1" style="line-height:48px">${txt}</h1>`);
const NOTE = (ctx, key, fb, x, y, w) => at(x, y, w, 80, `<div class="b">${E2(ctx, copy(ctx, key, fb))}</div>`);

export const guidelines = {
  // ---- 8 The mark (SO) ----
  mark(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), W = 960, X = 160, Y = 248;
    const m = markAt(ctx, M, t, X, Y, W), h = Math.round(m.h);
    const br = t.dim;
    const lines = svgAt(0, 0, 1280, 720, `<g stroke="${br}" stroke-width="1" fill="none"><path d="M${X + 0.5} ${Y - 40}V${Y + h + 40}M${X + W + 0.5} ${Y - 40}V${Y + h + 40}M${X - 40} ${Y + 0.5}H${X + W + 40}M${X - 40} ${Y + h + 0.5}H${X + W + 40}"/><path d="M${X - 40} ${Y + h * 0.55}H${X + W + 40}" stroke-dasharray="4 4"/></g>`);
    const body = H1('The mark') + NOTE(ctx, 'page.mark.text', 'Use the mark as drawn. Never redraw, stretch or recolour it.', 64, 152, 360)
      + `<div data-contrast="demo">${word(M, 1090 - M.width('960', 240), 640, '960', 240, { style: `color:${mix(g, t.ink, 0.12)}` })}</div>`
      + lines + m.html
      + dim(ctx, 'h', X, Y - 40, W, W, { ground: g, ext: 6 }) + dim(ctx, 'v', X + W + 40, Y, h, h, { ground: g, ext: 6 })
      + at(X, Y + h + 52, 400, 16, `<span class="m">${ctx.esc(copy(ctx, 'page.mark.dims', 'Width, height and the line through the x-height, drawn in the accent.'))}</span>`);
    return sheet(ctx, 'mark', { ground: g, body });
  },

  // ---- 9 Versions (CO): four full-bleed courses, tallest for the most-used version ----
  versions(ctx) {
    const G = groundsOf(ctx), M = measure(ctx), F = logoFacts(ctx), seen = new Set(), picks = [];
    for (const g of F.grounds) { const h = g.groundHex.toLowerCase(); if (!seen.has(h)) { seen.add(h); picks.push(g); } }
    const hs = [288, 192, 144, 96], four = picks.slice(0, 4);
    let y = 0;
    const bands = four.map((g, i) => {
      const t = tones(ctx, g.groundHex), h = hs[i], by = y; y += h;
      const w = Math.round(Math.min(560, h * 2.2)), m = markAt(ctx, M, t, 64, (h - Math.round(w / (slotOn(ctx) ? 4 : ctx.logo.geo.aspect))) / 2, w, ctx.logo && ctx.logo.geos && ctx.logo.geos[g.key] ? g.key : 'colour', t.ink);
      const when = ctx.brand.logo.when && ctx.brand.logo.when[g.key];
      return field(ctx, 0, by, 1280, h + 0.5, g.groundHex, m.html
        + at(720, 20, 496, 16, `<span class="m i">${E2(ctx, g.label)}</span>`)
        + at(720, 40, 496, h - 48, `<div class="m w">${g.groundHex.toUpperCase()}${when ? `<br>${when}` : ''}</div>`)
        + at(1100, 20, 116, 16, `<span class="m" style="display:block;text-align:right">L-02.${i + 1}</span>`));
    }).join('');
    const t0 = tones(ctx, four[0].groundHex);
    return `<section class="pg ss" data-page="versions" style="${`--g:${t0.ground};--ink:${t0.ink};--quiet:${t0.quiet};--hair:${t0.hair};--wash:${t0.wash};--dim:${t0.dim};--grid:${t0.grid}`}">${bands}${at(64, 700, 600, 16, `<span class="m" style="color:${tones(ctx, four[3].groundHex).quiet}">Course heights 288, 192, 144, 96 px: by how often the version is used.</span>`)}</section>`;
  },

  // ---- 10 Space and size (DC): the mark at its smallest, led to a detail circle at 1:5 ----
  space(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), M = measure(ctx), F = logoFacts(ctx);
    const min = F.min.screenPx || 96, cx = 880, cy = 360, R = 240, ar = slotOn(ctx) ? 4 : ctx.logo.geo.aspect;
    const lw = 288, lh = lw / ar, u = Math.round(lh * 0.5), sq = u;
    const small = markAt(ctx, M, t, 64, 392, min);
    const lx = cx - lw / 2, ly = cy - lh / 2;
    const clear = svgAt(0, 0, 1280, 720, `<defs><clipPath id="dc"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${R}" fill="${G.panel}" stroke="var(--ink)" stroke-width="2"/>`
      + `<g clip-path="url(#dc)" stroke="${t.dim}" stroke-width="1" fill="none" stroke-dasharray="4 4"><path d="M${lx - u} ${ly - u}H${lx + lw + u}V${ly + lh + u}H${lx - u}Z"/></g>`
      + `<path d="M${lx + 0.5} ${ly - u}V${ly + lh + u}M${lx + lw + 0.5} ${ly - u}V${ly + lh + u}M${lx - u} ${ly + 0.5}H${lx + lw + u}M${lx - u} ${ly + lh + 0.5}H${lx + lw + u}" stroke="var(--hair)" stroke-width="1" fill="none"/>`
      + `<path d="M${64 + min} ${456 + 8}L${cx - R * 0.8} ${cy + R * 0.6}" stroke="var(--quiet)" stroke-width="1" fill="none"/>`);
    const m = markAt(ctx, M, tones(ctx, G.panel), lx, ly, lw);
    const sqs = [[lx - u, ly - u], [lx + lw, ly + lh]].map(([x, y]) => fill(x, y, u, u, 'none', `border:1px solid ${t.dim}`)).join('');
    const body = H1('Space and size') + NOTE(ctx, 'page.space.text', 'Smallest: 24 mm wide in print, 96 px on screen. Clear space: one bob height, b, on every side.', 64, 152, 360)
      + `<div data-contrast="demo">${word(M, 64, 640, '24', 240, { style: `color:${mix(g, t.ink, 0.12)}` })}</div>`
      + small.html + dim(ctx, 'h', 64, 376, min, min, { ground: g, ext: 4 })
      + clear + m.html + sqs
      + at(lx - u, ly + lh + u + 12, 300, 16, `<span class="m" style="color:${tones(ctx, G.panel).quiet}">b = ${F.unitText || u + ' px'}, shown at 1:5</span>`)
      + at(64, 440, 320, 16, `<span class="m i">Minimum ${min} px</span>`);
    return sheet(ctx, 'space', { ground: g, body });
  },

  // ---- 11 Misuse (DL): a defects list, six 88 px rows ----
  misuse(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), L = ctx.logo;
    const rows = [[copy(ctx, 'page.misuse.0', 'Part of the mark removed.'), ''], ['Line at an angle.', 'transform:rotate(-8deg)'], ['Mark stretched.', 'transform:scaleX(1.6)'], ['Wrong ground.', ''], ['Outline added.', ''], ['Mark in a box.', '']];
    const names = rows.map((r) => r[0]);
    const out = rows.map(([label, st], i) => {
      const y = 120 + i * 88, thumbBg = i === 3 ? G.accent : g, tt = tones(ctx, thumbBg), w = 112;
      const ar = slotOn(ctx) ? 4 : L.geo.aspect, h = w / ar;
      const ink = i === 3 ? G.primary : tt.ink;
      const logo = slotOn(ctx) ? word(M, 24, 44 + M.cap * 18, 'Your wordmark', 18, { style: 'color:var(--quiet)' }) : at(24, 44 - h / 2, w, h, L.html('colour', { width: w, color: ink }), { style: `color:${ink};${st};transform-origin:center` });
      const extra = i === 4 ? at(16, 44 - h / 2 - 8, w + 16, h + 16, '', { style: `border:1px solid ${tt.ink}` }) : i === 5 ? at(8, 8, 144, 72, '', { style: `border:2px solid ${tt.ink}` }) : '';
      return hr(64, y, 1152) + field(ctx, 64, y + 4, 160, 80, thumbBg, `${extra}${logo}`, `box-shadow:inset 0 0 0 1px ${t.hair};overflow:hidden`)
        + at(256, y + 12, 80, 16, `<span class="m i">D-0${i + 1}</span>`)
        + at(256, y + 36, 640, 32, `<span class="d h2" style="font-size:24px">${E2(ctx, copy(ctx, `page.misuse.${i}`, label))}</span>`)
        + at(1016, y + 36, 200, 32, `<span class="d" style="display:block;text-align:right;font-size:15px;line-height:24px;letter-spacing:0;color:${t.dim}">Rejected</span>`)
        + at(1016, y + 12, 200, 16, '<span class="m" style="display:block;text-align:right">Defect, not to be built</span>');
    }).join('');
    return sheet(ctx, 'misuse', { ground: g, body: H1('Misuse', 64, 60, 480) + out + hr(64, 648, 1152) + at(256, 76, 600, 16, `<span class="m">Defects list: six ways the mark is never drawn.</span>`), gridOpts: { y0: 72 } });
  },

  // ---- 13 Palette (WS): the wall section stood up the sheet: full-height bands sized by share of use, chain-dimensioned, names and values set large on the bands ----
  palette(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), cs = coloursBy(ctx), n = cs.length;
    const X = 64, W = 1152, Y = 156, H = 492, tot = cs.reduce((a, c) => a + c.share, 0);
    const ws = shareSizes(cs.map((c) => c.share / tot), W, Math.min(150, Math.floor((W * 0.6) / n)));
    let x = X;
    const bands = cs.map((c, i) => {
      const ct = tones(ctx, c.hex), w = ws[i], bx = x; x += w;
      const rgb = hexToRgb(c.hex).join(' '), cm = Array.isArray(c.cmyk) && c.cmyk.length === 4 ? c.cmyk.join(' ') : '';
      const hatch = i % 2 ? `<svg class="a" style="left:0;top:0;overflow:hidden" width="${w}" height="${H}" aria-hidden="true"><path d="${Array.from({ length: Math.ceil((w + H) / 16) }, (_, k) => `M${k * 16} 0L${k * 16 - H} ${H}`).join('')}" stroke="${mix(c.hex, ct.ink, 0.12)}" stroke-width="1" fill="none"/></svg>` : '';
      const low = ratio(ct.ink, c.hex) < 5.4, tab = low ? `background:${g};color:${t.ink};padding:0 6px;` : '';
      const wrap = w < 200, size = Math.max(16, Math.min(M.fit(own(ctx, c.name), (w - 32) * (wrap ? 1.1 : 1), 56), 56)), role = own(ctx, c.roleText) || ROLE[c.role] || '';
      const mono = (px, lh, txt, ink) => `<div class="m ${ink ? 'i' : ''}" style="font-size:${px}px;line-height:${lh}px;${low ? '' : `color:${ink ? ct.ink : ct.quiet}`}"><span style="${tab}display:inline-block">${txt}</span></div>`;
      const inner = hatch + at(16, 16, w - 32, 16, `<span class="m i" style="${tab}display:inline-block">C-0${i + 1}</span>`)
        + (wrap ? at(16, 38, w - 32, size * 2.2, `<span class="d" style="font-size:${size}px;line-height:1;white-space:normal;color:${ct.ink};${tab}">${own(ctx, c.name)}</span>`) : word(M, 16, 40 + M.cap * size, own(ctx, c.name), size, { style: `color:${ct.ink}` }))
        + at(16, H - 16 - (w >= 200 ? 124 : 104), w - 32, w >= 200 ? 124 : 104, `<div style="display:flex;flex-direction:column;justify-content:flex-end;height:100%">${w >= 200 ? `<div class="m w" style="font-size:12px;line-height:16px;margin-bottom:8px;${low ? '' : `color:${ct.quiet}`}"><span style="${tab}">${role}</span></div>` : ''}${mono(12, 18, `RGB ${rgb}`, false)}${cm ? mono(12, 18, `CMYK ${cm}`, false) : ''}<div style="height:6px"></div>${mono(24, 28, c.hex.toUpperCase(), true)}</div>`);
      return field(ctx, bx, Y, w, H, c.hex, inner, `box-shadow:inset 0 0 0 .5px ${t.hair};overflow:hidden`)
        + at(bx, 100, w, 22, `<span class="d" style="font-size:22px;line-height:22px;letter-spacing:-.02em;display:block;padding-left:4px;font-variant-numeric:tabular-nums">${Math.round((c.share / tot) * 100)}%</span>`)
        + dim(ctx, 'h', bx, 138, w, w, { ground: g, ext: 6 });
    }).join('');
    const head = at(64, 40, 312, 52, '<h1 class="d h1" style="line-height:48px">Palette</h1>') + at(284, 66, 600, 16, `<span class="m">${ctx.esc(copy(ctx, 'page.palette.caption', 'The first colour is the ground. The accent marks the measurements.'))}</span>`);
    return sheet(ctx, 'palette', { ground: g, body: bands + head + dim(ctx, 'v', 1244, Y, H, H, { ground: g, ext: 6 }), gridOpts: { y0: 128 } });
  },

  // ---- 14 Tints (ST): a drawn schedule, a column of ten large chips to each colour, the base step ringed and called out by one Brick leader ----
  tints(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), M = measure(ctx), cs = coloursBy(ctx).slice(0, 6), n = cs.length;
    const steps = Object.keys(cs[0].ramp), Y0 = 148, sh = (648 - Y0) / steps.length, PITCH = Math.min(200, Math.floor(1016 / n)), CW = PITCH - 30, XR = 64 + (n - 1) * PITCH + CW;
    let call = '';
    const staffs = cs.map((c, i) => {
      const x = 64 + i * PITCH, base = String(rampBase(c.hex));
      const chip = (k, j, ring) => {
        const hex = String(c.ramp[k]), ct = tones(ctx, hex), y = Y0 + j * sh, mine = k === base;
        const body = fill(x, y, CW, sh + (ring ? 0 : 0.5), hex, `box-shadow:inset 0 0 0 .5px ${t.hair}`)
          + at(x + 12, y + sh / 2 - 8, 80, 16, `<span class="m" style="font-size:13px;color:${ct.ink}${mine ? ';text-decoration:underline' : ''}">${k}${mine ? ' BASE' : ''}</span>`)
          + at(x + CW - 92, y + sh / 2 - 8, 80, 16, `<span class="m" style="display:block;text-align:right;font-size:13px;color:${ct.ink}">${hex.toUpperCase()}</span>`);
        return body;
      };
      const cells = steps.map((k, j) => (k === base ? '' : chip(k, j, false))).join('');
      const j = steps.indexOf(base), y = Y0 + j * sh;
      const ring = fill(x - 6, y - 6, CW + 12, sh + 12, g) + chip(base, j, true) + `<div class="a" style="left:${x - 6}px;top:${n1(y - 6)}px;width:${CW + 12}px;height:${n1(sh + 12)}px;border:2px solid var(--ink)"></div>`
        + `<div class="a" style="left:${x - 18}px;top:${n1(y + sh / 2 - 1)}px;width:12px;border-top:3px solid ${t.dim}"></div>`;
      if (i === n - 1) {
        const yc = y + sh / 2, lx = XR + 78;
        call = svgAt(XR + 6, yc - 5, lx - XR - 6, 10, `<path d="M0 5H${lx - XR - 6}" stroke="${t.dim}" stroke-width="1.5" fill="none"/><circle cx="2" cy="5" r="3" fill="${t.dim}"/>`)
          + at(lx + 8, yc - 40, 1216 - lx - 8, 92, `<div class="m" style="color:${t.dim}">BASE STEP ${base}</div><div class="b" style="font-size:15px;line-height:20px;margin-top:4px">The colour itself. Lighter steps above it, darker below.</div>`);
      }
      return cells + ring + at(x, Y0 - 38, CW, 28, `<span class="d h2" style="font-size:${Math.max(12, Math.min(22, Math.round(M.fit(own(ctx, c.name), CW, 22))))}px;line-height:28px;white-space:nowrap">${own(ctx, c.name)}</span>`);
    }).join('');
    const head = at(64, 40, 312, 52, '<h1 class="d h1" style="line-height:48px">Tints</h1>') + at(244, 66, 600, 16, '<span class="m">Ten steps to a colour. The ringed chip is the colour itself.</span>');
    return sheet(ctx, 'tints', { ground: g, body: head + staffs + call, gridOpts: { y0: 128 } });
  },

  // ---- 15 Pairs (SB): a sample board, each pair pinned as a card; failures hatched ----
  pairs(ctx) {
    const G = groundsOf(ctx), g = G.surface, t = tones(ctx, g), M = measure(ctx);
    const used = ctx.pairs.map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, ok: true, use: own(ctx, p.use) }));
    const seen = new Set(); const bad = [];
    for (const p of ctx.unusedPairs) { const k = [p.fgHex, p.bgHex].map((h) => h.toLowerCase()).sort().join('|'); if (p.fgHex.toLowerCase() === p.bgHex.toLowerCase() || seen.has(k)) continue; seen.add(k); bad.push({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, ok: false, use: 'Do not use' }); }
    const cards = [...used.slice(0, 6), ...bad].slice(0, 8);
    // the card's paper: the brand's panel colour when it is light enough to carry ink, else the sheet's own ground (a dark panel would swallow the labels)
    const paper = ratio(tones(ctx, G.panel).ink, G.panel) >= 7 && ratio(G.panel, '#000000') > ratio(G.panel, '#FFFFFF') ? G.panel : g;
    const out = cards.map((p, i) => {
      const x = 64 + (i % 4) * 296, y = 96 + Math.floor(i / 4) * 272, w = 272, h = 248, ct = tones(ctx, p.bg);
      const hatch = p.ok ? '' : `<svg class="a" style="left:0;top:0;overflow:hidden" width="${w}" height="160" aria-hidden="true"><path d="${Array.from({ length: 30 }, (_, k) => `M${k * 14} 0L${k * 14 - 160} 160`).join('')}" stroke="${t.dim}" stroke-width="1" opacity=".5" fill="none"/></svg>`;
      const tile = field(ctx, 0, 0, w, 160, p.bg, `${hatch}${at(20, 24, 200, 90, `<span class="d" style="font-size:72px;line-height:72px;color:${p.fg};letter-spacing:-.03em">Aa</span>`)}${at(20, 126, 232, 16, `<span class="m" style="color:${p.fg}">${p.fg.toUpperCase()} on ${p.bg.toUpperCase()}</span>`)}`, 'overflow:hidden');
      const demo = p.ok ? tile : `<div data-contrast="demo">${tile}</div>`;
      const lab = at(20, 172, 100, 16, `<span class="m i">S-${String(i + 1).padStart(2, '0')}</span>`) + at(w - 120, 172, 100, 16, `<span class="m" style="display:block;text-align:right;color:${p.ok ? 'var(--ink)' : 'var(--dim)'}">${p.ok ? 'Pass' : 'Fail'} ${p.r}</span>`)
        + at(20, 196, w - 40, 40, `<div class="lb i" style="font-size:13px;line-height:18px;white-space:normal">${p.use}</div>`);
      // a drawing pin: tick marks at the top corners
      const pin = svgAt(0, -4, w, 8, `<path d="M${w / 2 - 6} 4H${w / 2 + 6}" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
      return field(ctx, x, y, w, h, paper, demo + lab + pin, `box-shadow:0 0 0 1px ${t.hair};overflow:visible`);
    }).join('');
    return sheet(ctx, 'pairs', { ground: g, body: at(64, 60, 600, 16, '<span class="m i">Sample board: each pair pinned as it will be used. Hatched cards are rejected.</span>') + out });
  },

  // ---- 16 Values (SC): a specification schedule led by a large swatch tab on every row and the HEX set big beside it ----
  values(ctx) {
    const G = groundsOf(ctx), g = G.panel, t = tones(ctx, g), cs = coloursBy(ctx), M = measure(ctx), n = cs.length;
    const hasCmyk = cs.some((c) => Array.isArray(c.cmyk) && c.cmyk.length === 4), Y0 = 136, rh = Math.min(100, Math.floor(510 / n)), hs = Math.min(54,Math.round(rh * 0.55)), ns = Math.min(28, Math.round(rh * 0.3));
    const rows = cs.map((c, i) => {
      const y = Y0 + i * rh, ct = tones(ctx, c.hex), rgb = hexToRgb(c.hex).join(' '), onG = ratio(c.hex, G.surface), th = rh - 8;
      const tag = `<svg class="a" style="left:0;top:0" width="224" height="${th}" aria-hidden="true"><path d="M.5 .5H194L223.5 ${th / 2}L194 ${th - 0.5}H.5Z" fill="${c.hex}" stroke="${t.hair}" stroke-width="1"/></svg>`;
      const kv = (k, v) => `<div style="height:18px;line-height:18px"><span class="m" style="font-size:13px">${k} </span><span class="m i" style="font-size:13px">${v}</span></div>`;
      return hr(64, y + rh, 1152, i === n - 1 ? 'var(--ink)' : 'var(--hair)') + `<div class="a" style="left:64px;top:${y + 4}px;width:224px;height:${th}px">${tag}</div>`
        + at(80, y + 4 + th / 2 - 10, 80, 20, `<span class="m" style="font-size:14px;line-height:20px;color:${ct.ink}">C-0${i + 1}</span>`)
        + at(312, y + rh / 2 - ns * 0.6 - 10, 280, ns * 1.2, `<span class="d h2" style="font-size:${ns}px;line-height:1.2">${own(ctx, c.name)}</span>`)
        + at(312, y + rh / 2 + ns * 0.6 - 6, 280, 16, `<span class="m">${(own(ctx, c.roleText) || ROLE[c.role] || '')}</span>`)
        + word(M, 600, y + rh / 2 + M.cap * hs / 2, c.hex.toUpperCase(), hs, { style: 'font-variant-numeric:tabular-nums;letter-spacing:-.02em', track: -0.02 })
        + at(884, y + rh / 2 - 27, 332, 54, kv('RGB', rgb) + (hasCmyk ? kv('CMYK', Array.isArray(c.cmyk) ? c.cmyk.join(' ') : '') : kv('On White', `${(Math.round(ratio(c.hex, G.panel) * 10) / 10).toFixed(1)}:1`)) + kv(copy(ctx, 'page.values.on', 'On ground'), `${(Math.round(onG * 10) / 10).toFixed(1)}:1`));
    }).join('');
    const head = at(64, 40, 312, 52, `<h1 class="d h1" style="line-height:48px">${ctx.skeleton ? 'Tokens' : 'Values'}</h1>`) + at(284, 66, 600, 16, '<span class="m">Every value as written, HEX first.</span>')
      + hr(64, Y0, 1152, 'var(--ink)') + at(312, Y0 - 22, 200, 16, '<span class="m i">Name and use</span>') + at(600, Y0 - 22, 200, 16, '<span class="m i">HEX</span>') + at(884, Y0 - 22, 200, 16, '<span class="m i">RGB, CMYK, ratio</span>');
    return sheet(ctx, 'values', { ground: g, body: head + rows, gridOpts: { y0: 128 } });
  },
};
