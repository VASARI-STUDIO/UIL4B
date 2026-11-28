// Theme 33, Flyleaf, slice 3 (the Circular pass): pages 13 to 15 and 17 to 21 at 16:9 (Colour: palette, tints, pairs; Type: opener, typefaces, scale, in use, type rules).
// Pages 12 (3.0 opener) and 16 (values) are kept as built. A4 portrait is slice 5, so every page here hands a portrait ctx back to the as-built page.
// Every number on the 1920 spec is scaled by 2/3. Colour, names, values, faces and the scale come from the engine; only the showcase copy is Margin's.
import { shareByWeight, typeLadder, grade } from '../../engine/styleguide.js';
import { rampBase, hexToRgb } from '../../engine/color.js';
import {
  tones, varsOf, ghost, geo, measure, own, realOf, at, hr, mono, page, bare, textCol, field, groundsOf, hslOf, n1, mix, pad2, refOf, folioOf, strike,
} from './kit.js';
import { guidelines as A, colours, edged, word, rowList, pageRows } from './brand-a.js';
import { fitIn, facesOf, weightsOf } from './brand-b.js';
import { fieldHex, pic, darkest } from './brand-s2.js';
import { copy, isShowcase } from './showcase.js';

const wide = (id, fn) => (ctx) => (geo(ctx).portrait ? A[id](ctx) : fn(ctx));
const WEIGHT_NAMES = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };

// The running head on a page whose ground changes under it (colour fields, a photograph): each of the four slots reads in the ink of the ground it sits on. No hairline.
export function headOn(ctx, id, gs) {
  const K = geo(ctx), R = refOf(ctx, id), E = ctx.esc;
  const slot = (x, w, g, html, align = '') => at(x, K.T, w, 14, `<span class="m i">${html}</span>`, { style: `${varsOf(tones(ctx, g))};${align}` });
  return slot(K.x(1), K.span(1, 3), gs[0], own(ctx, ctx.brand.name))
    + slot(K.x(4), K.span(1, 3), gs[1], R.secTitle ? E(R.secTitle) : '')
    + (gs[2] === null ? '' : slot(K.x(7), K.span(1, 4), gs[2], /\.0$/.test(R.ref) ? '' : R.ref ? `${R.ref} ${E(R.title)}` : E(R.title)))
    + slot(K.W - K.R - 60, 60, gs[3], pad2(folioOf(ctx, id)), 'text-align:right');
}
const isNeutral = (c) => { const [, s, l] = hslOf(c.hex); return s < 26 && l >= 90; };

export const guidelines = {
  // 3.1 Palette (Horizon 07): the primary colour takes 45% of the page at full height with the text on it; the other colours stand as columns in the top half,
  // the light neutrals sit in the bottom half sized to their share.
  palette: wide('palette', (ctx) => {
    const K = geo(ctx), M = measure(ctx), cs = colours(ctx), G = groundsOf(ctx), E = ctx.esc;
    const lead = cs.find((c) => c.hex.toLowerCase() === G.primary.toLowerCase()) || cs[0];
    const rest = cs.filter((c) => c !== lead);
    let bottom = rest.filter(isNeutral), top = rest.filter((c) => !isNeutral(c));
    if (!top.length) top = bottom.splice(0, Math.max(1, Math.ceil(bottom.length / 2)));
    const LW = Math.round(K.W * 0.45), RW = K.W - LW, hTop = bottom.length ? Math.round(K.H / 2) : K.H, hBot = K.H - hTop;
    const lines = (c) => { const cm = Array.isArray(c.cmyk) && c.cmyk.length === 4 ? `<div class="m">CMYK ${c.cmyk.join(' ')}</div>` : ''; return `<div class="m i">${c.hex.toUpperCase()}</div><div class="m">RGB ${hexToRgb(c.hex).join(' ')}</div>${cm}`; };
    const cell = (c, x, y, w, h, nameStyle = 'font-size:20px;line-height:1.1;margin-bottom:8px') => field(ctx, x, y, w, h, c.hex,
      `<div class="a" style="left:16px;right:12px;bottom:18px"><div class="d" style="${nameStyle};white-space:normal;letter-spacing:0">${own(ctx, c.name)}</div><div class="m w" style="margin-bottom:8px">${own(ctx, c.roleText)}</div>${lines(c)}</div>`, edged(ctx, c.hex));
    const tw = RW / top.length, topCells = top.map((c, i) => cell(c, LW + i * tw, 0, tw + 0.5, hTop)).join('');
    let sizes = shareByWeight(RW, bottom.map((c) => c.share), 112, 0), bx = LW;
    const botCells = bottom.map((c, i) => { const s = sizes[i], out = cell(c, bx, hTop, s + 0.5, hBot); bx += s; return out; }).join('');
    // the lead: the page's title and a line at the top, the name set large on the foot
    const big = Math.round(Math.min(150, M.fit(realOf(ctx, lead.name), LW - 40, 999)));
    const leadCell = field(ctx, 0, 0, LW + 0.5, K.H, lead.hex,
      `<div class="a" style="left:${K.L}px;top:${K.H * 0.29}px;width:${LW - K.L - 48}px"><div class="m">3.1</div><h2 class="d ti">Palette</h2><p class="b tp">${E('The colours of the brand, the lead colour first, with the values to build each one.')}</p></div>`
      + `<div class="a" style="left:${K.L}px;right:24px;bottom:18px"><div class="d" style="font-size:${big}px;line-height:1;letter-spacing:-0.02em;white-space:normal;margin-bottom:14px">${own(ctx, lead.name)}</div><div class="m w" style="margin-bottom:8px">${own(ctx, lead.roleText)}</div>${lines(lead)}</div>`, edged(ctx, lead.hex));
    const colAt = (x) => { const i = Math.min(top.length - 1, Math.floor((x - LW) / tw)); return top[Math.max(0, i)].hex; };
    const corner = (bottom.length ? bottom[bottom.length - 1] : top[top.length - 1]).hex;
    const head = headOn(ctx, 'palette', [lead.hex, lead.hex, colAt(K.x(7)), colAt(K.W - K.R - 30)]);
    return bare(ctx, 'palette', { ground: lead.hex, body: leadCell + topCells + botCells + head, creditOn: corner });
  }),

  // 3.2 Tints (Horizon 09, UI palette): a ramp per colour, full width, each step a block with its number and hex.
  tints: wide('tints', (ctx) => {
    const K = geo(ctx), cs = colours(ctx), E = ctx.esc, steps = Object.keys(cs[0].ramp), n = cs.length;
    const y0 = 100, y1 = K.H - 36, capH = 22, gap = 12, G = groundsOf(ctx);
    // the brand's own row is taller than the others (1.7 to 1), so the low plum steps do not set the page
    const wt = cs.map((c) => (c.hex.toLowerCase() === G.primary.toLowerCase() ? 1.7 : 1)), wsum = wt.reduce((a, b) => a + b, 0), unit = (y1 - y0) / wsum, sw = K.W / steps.length;
    let ry = y0;
    const out = cs.map((c, i) => {
      const pitch = unit * wt[i], y = ry, sh = pitch - capH - gap, base = String(rampBase(c.hex)); ry += pitch;
      const cells = steps.map((k, j) => {
        const hex = String(c.ramp[k]).toUpperCase(), mine = k === base, t = tones(ctx, c.ramp[k]);
        return field(ctx, j * sw, y + capH, sw + 0.5, sh, c.ramp[k],
          `<div class="a" style="left:10px;top:9px"><span class="m i">${k}${mine ? ' Brand' : ''}</span></div><div class="a" style="left:10px;bottom:9px"><span class="m${mine ? ' i' : ''}">${hex}</span></div>${mine ? `<div class="a" style="left:10px;right:10px;top:28px;border-top:1px solid var(--ink)"></div>` : ''}`, edged(ctx, c.ramp[k]));
      }).join('');
      return at(10, y + 2, 600, 14, `<span class="m i">${own(ctx, c.name)}</span> <span class="m">${c.hex.toUpperCase()}</span>`) + cells;
    }).join('');
    return page(ctx, 'tints', { body: out });
  }),

  // 3.3 Pairs (Horizon 08, colour combinations): every pair as a circle with an Aa, on the dark ground. A pair that fails gets a slash and is never used for text.
  pairs: wide('pairs', (ctx) => {
    const K = geo(ctx), g = darkest(ctx), t = tones(ctx, g), E = ctx.esc;
    const used = ctx.pairs.map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, g: grade(p.ratio), use: own(ctx, p.use), ok: true }));
    const seen = new Set(), bad = [];
    for (const p of ctx.unusedPairs) { const k = [p.fgHex, p.bgHex].map((h) => h.toLowerCase()).sort().join('|'); if (p.fgHex.toLowerCase() === p.bgHex.toLowerCase() || seen.has(k)) continue; seen.add(k); bad.push({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, g: grade(p.ratio), use: 'Do not use', ok: false }); }
    const list = [...used, ...bad].slice(0, 18), n = list.length;
    const ax = 427, aw = K.W - K.R - ax, ay = 100, ah = K.H - 40 - ay;
    const cols = Math.min(6, Math.max(3, Math.ceil(n / 3))), rows = Math.ceil(n / cols), pw = aw / cols, ph = ah / rows;
    const dia = Math.floor(Math.min(pw - 24, ph - 46, 168));
    const cells = list.map((p, i) => {
      const cx = ax + (i % cols) * pw, cy = ay + Math.floor(i / cols) * ph, aa = Math.round(dia * 0.4), edge = p.bg.toLowerCase() === g.toLowerCase() ? `box-shadow:inset 0 0 0 .5px ${t.hair};` : '';
      const circle = at(cx, cy, dia, dia, `<div class="a d" style="left:0;right:0;top:${n1(dia / 2 - aa * 0.55)}px;text-align:center;font-size:${aa}px;line-height:1;letter-spacing:0;color:${p.fg}">Aa</div>${p.ok ? '' : strike(dia, dia, tones(ctx, p.bg).ink)}`, { style: `background:${p.bg};border-radius:50%;overflow:hidden;${edge}`, cls: '' }).replace('class="a "', `class="a" ${p.ok ? '' : 'data-contrast="demo"'}`);
      const cap = p.ok ? `<div class="m i">${p.r}:1 ${p.g}</div><div class="m" style="white-space:normal">${p.use}</div>` : `<div class="m i">Do not use</div><div class="m">${p.r}:1 ${p.g}</div>`;
      return circle + at(cx, cy + dia + 10, pw - 12, 30, cap);
    }).join('');
    return page(ctx, 'pairs', { ground: g, body: textCol(ctx, 'pairs', 'Every text and ground pair, with its contrast. A slashed pair is never used for text.') + cells });
  }),

  // 4.0 opener (Horizon 08, Liberty 02): one giant Aa in the display face, cut by the right and bottom edges, a step off the ink ground.
  'open-type': wide('open-type', (ctx) => {
    const K = geo(ctx), M = measure(ctx), G = groundsOf(ctx), g = G.ink, t = tones(ctx, g), s = refOf(ctx, 'open-type').sec, E = ctx.esc;
    const gl = mix(g, t.ink, 0.3), S = 800, base = K.H + 36;
    const aa = `<div data-contrast="demo">${word(ctx, M, 400, base, 'Aa', S, { colour: gl })}</div>`;
    const line = copy(ctx, 'page.type.pairing', `${realOf(ctx, ctx.brand.fonts.display.family)} for titles, ${realOf(ctx, ctx.brand.fonts.body.family)} for reading.`);
    const col = at(K.L, 104, 300, null, `<div class="m">4.0</div><h2 class="d ti">Type</h2><p class="b tp">${E(line)}</p>`);
    const list = at(K.L, K.H - 36 - pageRows(s).length * 30, 300, pageRows(s).length * 30, rowList(ctx, 0, 0, 300, pageRows(s), 30).replace(/class="a /g, 'class="a '));
    return bare(ctx, 'open-type', { ground: g, body: aa + headOn(ctx, 'open-type', [g, g, g, g]) + col + list });
  }),

  // 4.1 Typefaces (Horizon 10, primary typeface): the display face's glyph set at the size of the page, the two faces named on the left.
  faces: wide('faces', (ctx) => {
    const K = geo(ctx), E = ctx.esc, ax = 427, aw = K.W - K.R - ax, ay = 100, ah = K.H - 40 - ay;
    const dFace = facesOf(ctx, 'display')[0] || ctx.faces[0], stem = dFace.stem;
    const lines = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '0123456789', '&!?.,:;@#%()'];
    const size = Math.floor(Math.min(ah / (lines.length * 1.06), ...lines.map((l) => fitIn(ctx, stem, l, aw, 96, 0))));
    const set = at(ax, ay, aw, ah, lines.map((l) => `<div style="font-family:var(--display);font-weight:${ctx.weights.heading};font-size:${size}px;line-height:1.06;white-space:nowrap">${l.replace('&', '&amp;')}</div>`).join(''));
    const info = [['display', 'Display', 252], ['body', 'Body', 440]].map(([role, label, y]) => {
      const fam = ctx.brand.fonts[role].family, ws = weightsOf(ctx, role);
      return hr(K.L, y, 300) + at(K.L, y + 12, 300, null, `<div class="m" style="margin-bottom:10px">${label}</div><div style="font-family:var(--${role});font-weight:${role === 'display' ? ctx.weights.heading : ctx.weights.regular};font-size:30px;line-height:1.1;white-space:nowrap;margin-bottom:10px">${E(fam)}</div><div class="m w">${ws.map((w) => `${w} ${WEIGHT_NAMES[w] || ''}`).join(', ')}</div>`);
    }).join('');
    return page(ctx, 'faces', { body: textCol(ctx, 'faces', 'The two faces the brand sets in, the weights it uses and every character they carry.') + info + set });
  }),

  // 4.2 Scale (Horizon 09, weights): every step of the scale at its own size in one sentence, the steps the brand's pages use in ink, the rest in grey.
  scale: wide('scale', (ctx) => {
    const K = geo(ctx), E = ctx.esc, g = darkest(ctx), t = tones(ctx, g), L = typeLadder(ctx), ax = 372, aw = K.W - K.R - ax, ay = 100, ah = K.H - 40 - ay;
    const text = copy(ctx, 'page.scale.text', 'Aa Bb Cc 0123 Dd Ee');
    const used = new Set(['headline', 'body', 'caption']);
    const wts = L.map((s) => s.line + 30), tot = wts.reduce((a, b) => a + b, 0);
    let y = ay;
    const rows = L.map((s, i) => {
      const h = ah * wts[i] / tot, ry = y; y += h;
      const on = used.has(s.token) || L.length <= 3, colour = on ? 'var(--ink)' : 'var(--quiet)';
      return hr(K.L, ry, K.W - K.L - K.R)
        + at(K.L, ry + 10, 330, 40, `<div class="m i">${E(s.name)}</div><div class="m">${s.size} / ${s.line} px, ${s.face === 'display' ? ctx.weights.heading : s.weight}</div>`)
        + at(ax, ry, aw, h, `<div style="font-family:var(--${s.face === 'display' ? 'display' : 'body'});font-weight:${s.face === 'display' ? ctx.weights.heading : s.weight};font-size:${s.size}px;line-height:1;white-space:nowrap;color:${colour};${s.face === 'display' && s.size > 40 ? 'letter-spacing:-0.02em;' : ''}">${E(text)}</div>`, { style: 'display:flex;align-items:center' });
    }).join('');
    return page(ctx, 'scale', { ground: g, body: rows });
  }),

  // 4.3 In use (Horizon 09, OOH): the train photograph at full bleed, the headline in the light ink on its quiet window.
  hierarchy: wide('hierarchy', (ctx) => {
    const K = geo(ctx), E = ctx.esc, g = darkest(ctx), t = tones(ctx, g), L = typeLadder(ctx);
    const head = copy(ctx, 'type.sample.headline'), para = copy(ctx, 'type.sample.paragraph');
    const sc = isShowcase(ctx);
    // a real export has no photograph: the right half is the photograph's box and the text sits on the dark ground at a size the placeholders can hold
    const fh = fieldHex(ctx, 'train'), ft = tones(ctx, fh);
    const ground = at(0, 0, K.W, K.H, pic(ctx, 'train', { w: K.W, h: K.H, fx: 0.5, fy: 0.5, alt: 'A reader on a train seat holding an open pocket book' }));
    // the headline sits high in the dark window (the spec's lower position runs into the book); the paragraph stays low on the sill
    const hs = sc ? 80 : 72, py = sc ? 128 : 112;
    const text = at(K.L, py, sc ? 560 : 480, null, `<div class="d" style="font-size:${hs}px;line-height:1.02;letter-spacing:-0.02em;white-space:normal">${ghost(ctx, head, 'type.sample.headline', 'A headline in the brand voice.')}</div>`, { style: sc ? '' : varsOf(ft) })
      + at(K.L, sc ? K.H - 104 : K.H - 150, sc ? 330 : 480, null, `<div class="b" style="font-size:${sc ? 14 : 15}px;line-height:1.5">${ghost(ctx, para, 'type.sample.paragraph', null)}</div>`, { style: sc ? '' : varsOf(ft) });
    const spec = at(K.L, 104, 300, null, `<div class="m i">${L.length ? E((L.find((s) => s.token === 'headline') || L[0]).name) : ''}</div>`);
    return bare(ctx, 'hierarchy', { ground: g, body: ground + headOn(ctx, 'hierarchy', sc ? [g, g, g, g] : [fh, fh, fh, fh]) + text });
  }),

  // 4.4 Type rules (Horizon 09, adding type to imagery): six crops of the photographs, each with the rule it shows set above it.
  'type-rules': wide('type-rules', (ctx) => {
    const K = geo(ctx), E = ctx.esc, L = ctx.roles.light, show = isShowcase(ctx);
    copy(ctx, 'type.rules.0.do');
    const rules = (ctx.brand.type.rules || []).slice(0, 6), n = Math.max(rules.length, 1);
    // each crop: the photograph, the focal point of the crop, the colour of the type that sits on it (light on the dark photographs) and the line
    const crops = [
      { id: 'train', fx: 0.22, fy: 0.5, ink: L.surface, line: 0, at: 'left:18px;top:20px;width:150px' },
      { id: 'paperbacks', fx: 0.5, fy: 0.3, ink: L.text, line: 1, at: 'left:18px;top:18px;width:230px' },
      { id: 'proofs', fx: 0.9, fy: 0.5, ink: L.surface, line: 2, at: 'right:16px;top:20px;width:110px;text-align:right' },
      { id: 'train', fx: 0.0, fy: 0.45, ink: L.surface, line: 3, at: 'left:18px;top:20px;width:170px;font-size:32px' },
      { id: 'paperbacks', fx: 0.5, fy: 0.08, ink: L.text, line: 0, at: 'left:18px;top:18px;width:230px' },
      { id: 'proofs', zoom: 1.7, fx: 0.98, fy: 0.9, ink: L.surface, line: 1, at: 'left:18px;top:20px;width:230px' },
    ];
    const sample = [0, 1, 2, 3].map((i) => copy(ctx, `applications.social.${i}`));
    const gx = 380, gw = K.W - K.R - gx, cw = (gw - 32) / 3, ih = show ? 236 : 180, rh = show ? 34 : 92, y0 = 100, rowP = rh + ih + (show ? 26 : 20);
    const cells = crops.slice(0, n).map((c, i) => {
      const x = gx + (i % 3) * (cw + 16), y = y0 + Math.floor(i / 3) * rowP, r = rules[i];
      const over = show ? `<div class="a d" style="font-size:${i % 3 === 1 ? 26 : 24}px;line-height:1.04;letter-spacing:-0.01em;white-space:normal;color:${c.ink};${c.at}">${E(sample[i % 4] || "")}</div>` : "";
      const img = at(x, y + rh, cw, ih, pic(ctx, c.id, { w: cw, h: ih, fx: c.fx, fy: c.fy, zoom: c.zoom, alt: 'A crop of the brand photograph' }) + over, { style: 'overflow:hidden' });
      return at(x, y, cw, rh - 6, `<span class="m" style="width:22px;flex:none">${pad2(i + 1)}</span><span class="b" style="font-size:12px;line-height:1.3;color:var(--ink)">${E(r ? r.do : '')}</span>`, { style: 'display:flex;gap:6px;align-items:flex-start' }) + img;
    }).join('');
    return page(ctx, 'type-rules', { body: textCol(ctx, 'type-rules', 'How to set type over the brand photographs. Each crop shows its rule kept.') + cells });
  }),
};
