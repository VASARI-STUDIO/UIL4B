// Swiss Field, the six gate pages (round 2). Every page stands on the share ruler (swiss.js); a field rises where the page means something by it.
// Ground-side columns hang on one 256 px module (x 80, 336, 592, 848), the same grid the logo row uses. Nothing here names a colour id, a hex or a photo.
import {
  A, nb, M, PAGE_W, PAGE_H, CHROME, at, box, page, model, valuesBlock, contentR, textWidth, wrap, faceStem, pickSize, statementHtml, titleHtml, twoTone, firstSentence,
  spell, cap1, weightName, colourwayOn, logoH, fmtShare, MONO,
} from './swiss.js';

const r2 = (n) => Math.round(n * 100) / 100;
const hair = (x, y, w, color = 'var(--hair)') => box(`left:${r2(x)}px;top:${y}px;width:${r2(w)}px;height:1px;background:${color}`);
const head = (t, color = 'var(--ink)') => `<div class="c-head" style="color:${color}">${A(t)}</div>`;
const note = (t, color = 'var(--quiet)', cls = '') => `<div class="c-note ${cls}" style="color:${color}">${nb(t)}</div>`;
const val = (t) => `<span class="c-value">${A(t)}</span>`;
const riseAll = (m, mode) => new Map(m.segs.slice(1).map((s) => [s.c.id, mode]));
const sentences = (s) => (String(s).match(/[^.!?]+[.!?]+/g) || [String(s)]).map((x) => x.trim());
const MOD = 256, col = (k) => M + MOD * k; // the grid: 80, 336, 592, 848, 1104

// ---------------------------------------------------------------- cover
function cover(ctx) {
  const m = model(ctx), B = ctx.brand, maxW = m.R - M;
  const logo = at(M, 144, ctx.logo.html('colour', { width: Math.min(720, maxW) }));
  const { t1, t2 } = twoTone(ctx, B.lines.primary, B.lines.others[0]);
  // a statement that sets in two lines at 72 px or more beats one that sets in three (a wide face leaves "twelve." alone on its line); else the largest that fits three
  const two = pickSize(ctx, [t1, t2], [96, 80, 72], maxW, 2);
  const { size } = two.lines <= 2 ? two : pickSize(ctx, [t1, t2], [96, 80, 64], maxW, 3);
  const statement = statementHtml(ctx, { t1, t2, size, maxW, bottom: 944, c1: 'var(--ink)', c2: 'var(--tone2)' });
  return page(ctx, 'cover', { rise: riseAll(m, 'compact'), head: 'cover', body: logo + statement });
}

// ---------------------------------------------------------------- intro (a section opener on a turned ground)
// The field holds one display sentence; the second is body text under it, a size step and not a tone step. Both in the field's full label colour.
function intro(ctx) {
  const m = model(ctx), B = ctx.brand, a = m.action, maxW = m.R - M, lab = m.label[a.id];
  const { first, rest } = firstSentence(B.description);
  const { size } = pickSize(ctx, [first], [88, 80, 72, 64, 56, 48], maxW, 4);
  const stack = box(`left:${M}px;bottom:${PAGE_H - 944}px;width:${maxW}px`,
    `<div class="disp" style="font-size:${size}px;line-height:${size >= 56 ? 0.95 : 1};color:${lab}">${nb(first)}</div>`
    + (rest ? `<div class="bf bal" style="margin-top:32px;max-width:560px;font-size:24px;line-height:32px;color:${lab}">${A(rest)}</div>` : ''));
  const turnedBody = valuesBlock(ctx, { ...m.segOf(a), w: 999 }, 'turned', M) + stack;
  const x0 = m.groundW + 48, w = PAGE_W - M - x0;
  // the title is the brand's own last line, so it says something the rows do not; the city joins the audience row unless that row already names it
  const voice = B.lines.others.length ? B.lines.others[B.lines.others.length - 1] : B.lines.primary;
  const who = B.audience.toLowerCase().includes(B.city.toLowerCase()) ? B.audience : `${B.audience.replace(/[.]$/, '')} in ${B.city}.`;
  // the line is one unit: if it does not fit beside "Introduction." it drops to its own line whole, never "Sun / in, bills down."
  const unit = textWidth(CHROME[500], voice, 48, -0.02) <= w ? voice.replace(/ /g, ' ') : voice;
  const title = titleHtml(ctx, 'Introduction', [unit], { x: x0, w });
  const rows = [['What it does', B.product], ['Who it is for', who]].map(([label, value], i) => {
    const y = 304 + 144 * i;
    return hair(x0, y, w) + at(x0, y + 16, head(label, 'var(--quiet)')) + at(x0, y + 48, `<div class="bf bal" style="font-size:20px;line-height:30px;color:var(--ink)">${nb(value).replace(/ (and|or) /g, ' $1&nbsp;')}</div>`, { w });
  }).join('');
  return page(ctx, 'intro', { turned: a, turnedBody, head: 'turned', body: title + rows });
}

// ---------------------------------------------------------------- palette
function palette(ctx) {
  const m = model(ctx), n = m.segs.length, rise = riseAll(m, 'full'), R = contentR(ctx, rise);
  const narrow = R < 1000, typeW = 200, typeX = R - typeW, landsX = narrow ? col(1) : col(2), landsW = typeX - 24 - landsX;
  const lines = Math.max(...m.segs.map((s) => wrap(CHROME[400], s.c.lands, 17, landsW).length));
  const rowH = Math.max(narrow ? 88 : 72, 32 + 24 * lines), top = 344;
  const typeOn = (c) => {
    const p = ctx.pairs.find((q) => q.bg === c.id);
    if (p) return [ctx.byId[p.fg].name, `${p.ratioText}:1`];
    const q = ctx.pairs.find((x) => x.fg === c.id);
    return q ? [`On ${ctx.byId[q.bg].name}`, `${q.ratioText}:1`] : ['', ''];
  };
  const list = m.segs.map((s, i) => {
    const c = s.c, y = top + i * rowH, [who, ratio] = typeOn(c);
    // wide ground: name, role, lands, type-on-it on the 256 grid; narrow ground: the role sits under the name and the lands move to the second column
    return hair(M, y, R - M)
      + (narrow ? at(M, y + 16, head(c.name) + note(c.role), { w: col(1) - M - 16 }) : at(M, y + 16, head(c.name), { w: col(1) - M - 16 }) + at(col(1), y + 16, note(c.role), { w: col(2) - col(1) - 16 }))
      + at(landsX, y + 16, note(c.lands, 'var(--ink)'), { w: landsW })
      + at(typeX, y + 16, `<div class="c-note" style="text-align:right;color:var(--quiet)">${A(who)} ${val(ratio)}</div>`, { w: typeW });
  }).join('') + hair(M, top + n * rowH, R - M);
  // never invent CMYK: say what is not supplied and what to do
  const hasCmyk = m.segs.some((s) => s.c.cmyk);
  const printNote = hasCmyk ? '' : at(M, top + n * rowH + 24, note('No CMYK is set for this brand. Send the HEX to your printer and ask for a proof.', 'var(--ink)'), { w: R - M });
  const title = titleHtml(ctx, 'Palette', [`${cap1(spell(n))} colours, cut by share, widest first.`]);
  return page(ctx, 'palette', { rise, body: title + list + printNote });
}

// ---------------------------------------------------------------- typefaces
function typefaces(ctx) {
  const m = model(ctx), B = ctx.brand, d = B.fonts.display, b = B.fonts.body, mo = B.fonts.mono;
  const tx = m.text, rise = new Map([[tx.id, 'compact']]);
  const R = contentR(ctx, rise), maxW = R - M, wide = maxW >= 1300; // wide: the text field sits far right, so the specimen and the body block use the room
  const W = ctx.weights, stemD = faceStem(ctx, 'display', W.heading);
  const title = titleHtml(ctx, 'Typefaces', [
    `${d.family} sets the name and the headlines. ${b.family} sets what you read.`,
    `${d.family} sets the headlines. ${b.family} sets what you read.`,
    `${d.family} for headlines, ${b.family} for reading.`], { w: Math.min(1000, maxW) });
  // the display family name: as large as the room allows (240 px where wide, else 144), never under 72
  const per = textWidth(stemD, d.family, 100, -0.01) / 100;
  const nameSize = Math.min(wide ? 240 : 144, Math.max(72, Math.floor((maxW * 0.98) / per)));
  const yName = 304, yW = yName + nameSize + 32;
  const familyName = at(M, yName, `<div class="disp nw" style="font-size:${nameSize}px;line-height:1;color:var(--ink)">${A(d.family)}</div>`);
  // weights: heading and logo weights share a row when they are the same weight
  const wrow = (w, use, face = '') => `<div class="c-body nw"><span style="color:var(--ink)${face}">${weightName(w)}</span> ${val(w)} <span style="color:var(--quiet);margin-left:8px">${A(use)}</span></div>`;
  const rows = W.heading === W.logo ? [[W.heading, 'Headlines and the wordmark.']] : [[W.heading, 'Headlines and titles.'], [W.logo, 'The wordmark only.']];
  // each display weight is named in the display face at that weight, so the page shows what it lists (a Black row beside a Bold specimen would otherwise never be seen)
  const dispFace = (w) => `;font-family:var(--display);font-stretch:${d.stretch || 100}%;font-weight:${w};letter-spacing:-0.01em`;
  const weights = rows.map(([w, use], i) => at(M, yW + 30 * i, wrow(w, use, dispFace(w)))).join('');
  // character set: the real letters. Capitals in ink, small letters and figures in the quiet colour (6.9 : 1, so it is safe at 32 px)
  const yC = yW + 30 * rows.length + 28;
  const setLine = (a, c) => `<div class="disp nw" style="font-size:32px;line-height:${c}px">${a}</div>`;
  const caps = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', low = 'abcdefghijklmnopqrstuvwxyz', fig = '0123456789';
  const one = textWidth(stemD, `${low} ${fig}`, 32, -0.01) <= maxW * 0.98;
  const q = (s) => `<span style="color:var(--quiet)">${s}</span>`;
  const capsHtml = `<span style="color:var(--ink)">${caps}</span>`;
  // too wide for two lines (a wide face on a narrow ground): three lines at 36
  const charH = one ? 80 : 108;
  const charset = at(M, yC, one ? `${setLine(capsHtml, 40)}${setLine(`${q(low)} ${q(fig)}`, 40)}` : `${setLine(capsHtml, 36)}${setLine(q(low), 36)}${setLine(q(fig), 36)}`);
  const yRule = yC + charH + 32, yBody = yRule + 32;
  const rule = hair(M, yRule, R - M);
  const bodyName = at(M, yBody, `<div class="bf" style="font-size:48px;line-height:52px;font-weight:${W.medium};color:var(--ink)">${A(b.family)}</div>`);
  const bw = [[W.regular, 'Reading text.'], [W.medium, 'Buttons and labels.']];
  const stacked = wide || R - col(2) < 340;
  const bodyWeights = stacked
    ? bw.map(([w, use], i) => at(col(2), yBody + 64 * i, `<div class="c-body nw"><span style="color:var(--ink)">${weightName(w)}</span> ${val(w)}</div>${note(use)}`, { w: 240 })).join('')
    : bw.map(([w, use], i) => at(col(2), yBody + 30 * i, wrow(w, use))).join('');
  // the sample sits under the name on a narrow page; on a wide one it is the third column, on the 848 line
  const sampleHtml = () => `<div class="bf" style="font-size:20px;line-height:30px;color:var(--ink)">${A(B.type.sample.paragraph)}</div>`;
  const sample = wide ? at(col(3), yBody + 8, sampleHtml(), { w: Math.min(624, R - col(3)) }) : at(M, yBody + 72, sampleHtml(), { w: 496 });
  // the text field carries the mono face and the action hex: where code is read; its first line sits on the body row
  const lab = m.label[tx.id];
  const field = mo ? at(12, yBody, `${head(`${mo.family} ${mo.weights[0]}`, lab)}${note('Hex, tokens and code.', lab)}`)
    + at(12, yBody + 64, `<div style="font:400 20px/28px var(--bmono);color:${lab}">${A(m.action.hex.toUpperCase())}</div>`) : '';
  return page(ctx, 'typefaces', { rise, fieldBody: new Map([[tx.id, field]]), body: title + familyName + weights + charset + rule + bodyName + sample + bodyWeights });
}

// ---------------------------------------------------------------- applications (page id business-card)
// The mini ruler: the page's strip drawn at the foot of a piece. Segments keep their order and their share (6 px at least), flush to the right edge,
// and a 1 px edge in `edge` runs the whole width, so a segment that matches the piece's own ground still reads as part of the strip.
// `withGround` draws the page ground's own segment first (for a piece whose ground is a strip colour, so the strip does not open with that colour).
function mini(ctx, pw, ph, edge, withGround = false) {
  const m = model(ctx), h = Math.max(20, Math.round((56 * Math.min(pw, ph)) / PAGE_H)), s = pw / PAGE_W, pos = new Map();
  let end = pw, html = '';
  for (const seg of [...m.segs.slice(1)].reverse()) {
    const w = Math.max(6, seg.w * s), x = end - w; end = x; pos.set(seg.c.id, { x, w });
    html += box(`left:${r2(x)}px;top:${ph - h}px;width:${r2(w)}px;height:${h}px;background:${seg.c.hex}`);
  }
  if (withGround) html += box(`left:0;top:${ph - h}px;width:${r2(end)}px;height:${h}px;background:${m.ground.hex}`);
  html += hair(0, ph - h, pw, edge);
  return { html, pos, h };
}
const bestCw = (ctx, hex) => {
  const cws = ctx.brand.logo.colourways;
  return colourwayOn(ctx, hex) || Object.keys(cws).sort((a, b) => ctx.C.ratio(cws[b].name, hex) - ctx.C.ratio(cws[a].name, hex))[0];
};

function applications(ctx) {
  const m = model(ctx), B = ctx.brand, a = m.action, tx = m.text, AP = B.applications, lab = m.label[a.id], txLab = m.label[tx.id];
  const trim = box('left:0;top:0;width:100%;height:100%;border:1px solid var(--hair);pointer-events:none');
  const piece = (x, y, w, h, bg, inner) => box(`left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg}`, inner);
  const rise = (mp, id, ph) => box(`left:${r2(mp.get(id).x)}px;top:0;width:${r2(mp.get(id).w)}px;height:${ph}px;background:${ctx.byId[id].hex}`);
  // one band, 640 px tall (y 304 to 944): two cards stacked, the square post, the story. The story's right edge is the page's right margin.
  const T = 304, H = 640, g = 16, pad = 28, cH = (H - g) / 2, cW = Math.round((cH * 90) / 55), sW = Math.round((H * 9) / 16);
  const xCard = M, xStory = PAGE_W - M - sW, xPost = Math.round((xCard + cW + xStory - H) / 2);

  // card front: the ground, the action field risen, the logo, and the brand's line
  const f = mini(ctx, cW, cH, 'var(--hair)'), tagW = Math.floor(f.pos.get(a.id).x - pad - 24);
  // the line sits under a 1 px ink rule that runs to the stripe, one sentence to a line (the first in ink, the rest in the quiet tone); the stripe prints its own share when it fits
  const tagLines = sentences(B.lines.primary), tagSize = pickSize(ctx, tagLines, [24, 22, 20], tagW, 3).size, tagLh = Math.round(tagSize * 7 / 6); // 24/28
  const fa = f.pos.get(a.id), shareTxt = fmtShare(a.share ?? 0);
  const stripeShare = a.share != null && textWidth(MONO, shareTxt, 16) <= fa.w - 20 ? at(fa.x + 10, pad, `<span class="c-value">${shareTxt}</span>`, { style: `color:${lab}` }) : '';
  const front = piece(xCard, T, cW, cH, 'var(--ground)', rise(f.pos, a.id, cH) + stripeShare + f.html + at(pad, pad, ctx.logo.html('colour', { width: 232 }))
    + box(`left:${pad}px;bottom:${f.h + pad}px;width:${tagW}px;font-size:${tagSize}px;line-height:${tagLh}px;border-top:1px solid var(--ink);padding-top:12px`,
      tagLines.map((t, i) => `<div class="disp" style="color:${i ? 'var(--quiet)' : 'var(--ink)'}">${A(t)}</div>`).join('')) + trim);
  // card back: the text colour, name and role, the contact lines, the symbol top right
  const bk = mini(ctx, cW, cH, txLab), cwBack = colourwayOn(ctx, tx.hex, ['reversed', 'mono-light']) || bestCw(ctx, tx.hex);
  const line = (t, y) => at(pad, y, `<div class="bf" style="font-size:20px;line-height:28px;color:${txLab}">${A(t)}</div>`);
  const back = piece(xCard, T + cH + g, cW, cH, tx.hex, bk.html
    + at(pad, pad, `<div class="disp nw" style="font-size:32px;line-height:36px;color:${txLab}">${A(AP.card.person)}</div>`)
    + at(pad, pad + 40, note(AP.card.role, m.quietOn[tx.id]))
    + line(AP.card.contact, cH - bk.h - pad - 56) + line(AP.site.url, cH - bk.h - pad - 28)
    + at(cW - pad - 48, pad, ctx.logo.html('symbol', { width: 48, colourway: cwBack })));
  // square post: the action ground, the logo that belongs on it, then the first line large and the second a size smaller, one sentence to a line; both in the full label colour
  // the strip opens with the page ground, not the action colour the post is set on
  const pk = mini(ctx, H, H, lab, a.hex.toUpperCase() !== m.ground.hex.toUpperCase()), cwPost = bestCw(ctx, a.hex), social = AP.social, tw = H - 96;
  // two lines at the largest size from 72 down to 56 that holds them; a three-line headline ends on a single word, so it only runs when two lines cannot be had
  const two = pickSize(ctx, [social[0]], [72, 68, 64, 62, 60, 58, 56], tw, 2);
  const s1 = two.lines <= 2 ? two.size : pickSize(ctx, [social[0]], [72, 64, 56, 48], tw, 3).size;
  const post = piece(xPost, T, H, H, a.hex, pk.html + at(48, 48, ctx.logo.html('horizontal', { width: 260, colourway: cwPost }))
    + box(`left:48px;bottom:${pk.h + 48}px;width:${tw}px`,
      `<div class="disp" style="font-size:${s1}px;line-height:${Math.round(s1 * 0.96)}px;color:${lab}">${A(social[0])}</div>`
      + sentences(social[1]).map((t, i) => `<div class="disp" style="margin-top:${i ? 4 : 24}px;font-size:32px;line-height:36px;color:${lab}">${A(t)}</div>`).join('')));
  // story: the action field risen at its share, the symbol, the third line, the address
  const st = mini(ctx, sW, H, 'var(--hair)'), sx = st.pos.get(a.id).x, stw = Math.floor(sx - pad - 20);
  const s3 = pickSize(ctx, [social[2]], [36, 32, 28], stw, 4).size;
  const story = piece(xStory, T, sW, H, 'var(--ground)', rise(st.pos, a.id, H) + st.html
    + at(pad, pad, ctx.logo.html('symbol', { width: 56, colourway: 'colour' }))
    + at(pad, 136, `<div class="disp" style="font-size:${s3}px;line-height:${Math.round(s3 * 1.05)}px;color:var(--ink)">${A(social[2])}</div>`, { w: stw })
    + at(pad, H - st.h - pad - 24, note(AP.site.url, 'var(--ink)'), { w: stw }) + trim);
  const cap = (x, t, v, tail = '') => at(x, T + H + 16, `<div class="c-note" style="color:var(--quiet)">${A(t)} ${val(v)}${A(tail)}</div>`, { cls: 'nw' });
  const caps = cap(xCard, 'Business card,', '90 × 55 mm', ', front and back') + cap(xPost, 'Square post,', '1080 × 1080 px') + cap(xStory, 'Story,', '1080 × 1920 px');
  const title = titleHtml(ctx, 'Applications', ['The card, the post and the story, each with the strip at its foot.'], { w: 1160 });
  return page(ctx, 'business-card', { body: title + front + back + post + story + caps });
}

// ---------------------------------------------------------------- logo
function logo(ctx) {
  const m = model(ctx), B = ctx.brand, L = B.logo, cws = L.colourways, up = (h) => h.toUpperCase();
  const geo = ctx.logo.geos.colour, narrow = m.groundW < 1100;

  // the fields that rise: every colour that is the ground of a colourway of the logo
  const onField = (c) => Object.keys(cws).filter((k) => up(cws[k].ground) === up(c.hex));
  const ink = (k) => new Set(Object.entries(cws[k]).filter(([p]) => p !== 'ground').map(([, v]) => up(v))).size;
  const fields = [], rise = new Map();
  for (const s of m.segs.slice(1)) {
    // the fullest colourway first: the one that uses the most colours (reversed before mono)
    const keys = onField(s.c).sort((a, b) => ink(b) - ink(a)).slice(0, 3);
    if (!keys.length) continue;
    rise.set(s.c.id, 'compact');
    if (s.w >= 150) fields.push({ s, keys });
  }
  // one art width in every field (the narrowest field's), so the art height and the label line are the same in each
  const w = fields.length ? Math.min(...fields.map((f) => f.s.w - 48)) : 0, h = w ? logoH(ctx, 'colour', w) : 0;
  const fieldBody = new Map();
  for (const { s, keys } of fields) {
    const ys = keys.length === 1 ? [304] : keys.length === 2 ? [304, 600] : [304, 552, 800];
    const nameOf = (hex) => (m.segs.find((g) => up(g.c.hex) === up(hex)) || {}).c;
    fieldBody.set(s.c.id, keys.map((k, i) => {
      const nc = nameOf(cws[k].name), label = ctx.logo.labels[k] || `On ${s.c.name}`;
      const when = L.when[k] || `The logo on ${s.c.name}, with the name in ${nc ? nc.name : cws[k].name}.`;
      // a field with one version says why: it is the only colourway of the logo whose ground is this colour
      const only = keys.length === 1 ? note(`Only this version sits on ${s.c.name}.`, m.quietOn[s.c.id], 'bal') : '';
      return at(24, ys[i], ctx.logo.html('colour', { width: w, colourway: k }))
        + at(24, ys[i] + h + 16, head(label, m.label[s.c.id]) + note(when, m.label[s.c.id], 'bal') + only, { w: s.w - 48 });
    }).join(''));
  }

  // title and the clear-space drawing
  const { first, rest } = firstSentence(L.idea);
  const title = titleHtml(ctx, 'Logo', [first, `${first.split(/[:;,]/)[0]}.`]);
  const avail = narrow ? m.R - M : col(3) - 48 - M;
  const k = geo.w ? (2 * ctx.logo.geo.unit) / geo.w : 0;
  const lw = Math.min(520, avail / (1 + k)), u = (ctx.logo.geo.unit * lw) / geo.w, lh = logoH(ctx, 'colour', lw), fw = lw + 2 * u, fh = lh + 2 * u;
  const corner = (x, y) => box(`left:${r2(x)}px;top:${r2(y)}px;width:${r2(u)}px;height:${r2(u)}px;border:1px solid var(--hair);display:flex;align-items:center;justify-content:center`, u >= 24 ? '<span class="c-note" style="color:var(--quiet)">x</span>' : '');
  const clear = box(`left:${M}px;top:304px;width:${r2(fw)}px;height:${r2(fh)}px;border:1px solid var(--tone2)`)
    + corner(M, 304) + corner(M + fw - u, 304) + corner(M, 304 + fh - u) + corner(M + fw - u, 304 + fh - u)
    + at(M + u, 304 + u, ctx.logo.html('colour', { width: lw }));

  // notes: beside the drawing on the 848 line, or under it where the ground is narrow
  const minPx = (L.showcase && L.showcase.minScreenPx) || 80, minMm = (L.showcase && L.showcase.minPrintMm) || 20;
  const clearNote = () => head('Clear space') + note('One x on every side. x is the cap height.');
  const minCap = () => `<div class="c-note" style="color:var(--quiet)">${val(`${minPx} px`)} on screen, ${val(`${minMm} mm`)} in print</div>`;
  const minH = logoH(ctx, 'colour', minPx);
  let notes;
  if (!narrow) {
    const x = col(3), nw = m.R - x, n = rest ? wrap(CHROME[400], rest, 20, nw).length : 0;
    const y1 = 304 + (n ? 30 * n + 40 : 0), y2 = y1 + 24 + 48 + 32;
    notes = (rest ? at(x, 304, `<div class="c-body bal" style="color:var(--ink)">${A(rest)}</div>`, { w: nw }) : '')
      + at(x, y1, clearNote(), { w: nw }) + at(x, y2, head('Smallest'), { w: nw })
      + at(x, y2 + 32, ctx.logo.html('colour', { width: minPx })) + at(x, y2 + 32 + minH + 12, minCap(), { w: nw });
  } else {
    const y0 = Math.max(560, 304 + fh + 40), lines = rest ? wrap(CHROME[400], rest, 20, 720).length : 0, y1 = y0 + 30 * lines + (lines ? 32 : 0);
    notes = (rest ? at(M, y0, `<div class="c-body bal" style="color:var(--ink)">${A(rest)}</div>`, { w: 720 }) : '')
      + at(M, y1, clearNote(), { w: col(1) - M - 32 }) + at(col(1), y1, head('Smallest'), { w: 420 })
      + at(col(1), y1 + 32, ctx.logo.html('colour', { width: minPx })) + at(col(1), y1 + 32 + minH + 12, minCap(), { w: 420 });
  }

  // bottom row: versions on the page ground, art bottom-aligned at y 896, name only beneath. Widths are the art's own; the row scales down to fit the ground.
  const groundCw = Object.keys(cws).filter((c) => up(cws[c].ground) === up(m.L.surface));
  const mono = groundCw.includes('mono-dark') ? 'mono-dark' : groundCw.find((c) => c !== 'colour') || 'colour';
  const defs = [['colour', mono, 200, ctx.logo.labels[mono] || 'Mono'], ['horizontal', 'colour', 300, 'Horizontal'], ['stacked', 'colour', 120 * ctx.logo.geos.stacked.w / ctx.logo.geos.stacked.h, 'Stacked'], ['symbol', 'colour', 80 * ctx.logo.geos.symbol.w / ctx.logo.geos.symbol.h, 'Symbol']];
  const gapX = 40, f = Math.min(1, (m.R - M - gapX * 3) / defs.reduce((t, d) => t + d[2], 0));
  let rx = M;
  const row = defs.map(([g, cw, dw, label]) => {
    const gw = dw * f, gg = ctx.logo.geos[g], hh = (gw * gg.h) / gg.w, x = rx; rx += gw + gapX;
    return at(x, 896 - hh, ctx.logo.html(g, { width: r2(gw), colourway: cw })) + at(x, 912, head(label), { w: Math.max(gw, 120) });
  }).join('');
  return page(ctx, 'logo', { rise, fieldBody, body: title + clear + notes + row });
}

export const guidelines = { cover, intro, palette, typefaces, 'business-card': applications, logo };
// the strip drawn on a piece and the logo colourway for a ground, for lane-g5.js (applications are split there into business-card and social; `applications` above is the old one-page draft)
export { mini, bestCw };
