// Theme 26, Notebook: the six round 1 gate spreads. All coordinates are leaf-local (see helpers.js).
import {
  A, U, row, px, nb, tokens, CHROME_STEMS, brandRoles, readable, nearPaper, block, rightText, advance, wrap, capRatio, lineOffset, folios,
  stick, tab, labelStripW, sceneCrop, printHtml, sceneImg, numberWord, weightName, spread, outline, loadFont, signSpec, photoAt,
  hasPh,
} from './helpers.js';
import { artKit } from './art.js';

const cw = (ctx) => ctx.brand.logo.colourways;

export const guidelines = {
  // ---- cover: the endpaper (a field of the reversed ground) and the flyleaf ----
  cover: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, rev = cw(ctx).reversed;
    const g = ctx.logo.geos.reversed, lw = 437, lh = lw * g.h / g.w;
    const field = `<div class="field" style="left:0;top:0;width:559px;height:794px;background:${rev.ground}"></div>`
      + `<div style="left:42px;top:${px(739 - lh)};width:${lw}px;z-index:3">${ctx.logo.html('reversed', { width: lw, color: rev.name })}</div>`;
    const label = `If found, return to ${B.contact.email}`;
    const recto = block(T['c-strong'], { x: 42, w: 300, baseline: 93, lines: ['Brand guidelines'], cls: 'c-strong' }).html
      + block(T['c-head'], { x: 42, w: 300, baseline: 112, lines: [ctx.versionLine], cls: 'c-head' }).html
      + `<div class="tape strip c-label13${hasPh(label) ? ' ph-tight' : ''}" style="left:42px;top:684px;width:${labelStripW(T, 'c-label13', label)}px;height:38px">${A(label)}</div>`;
    return spread(ctx, 'cover', { verso: field, recto, chrome: false, versoField: true, thread: false });
  },

  // ---- personality: the brand line, two prints of its own art, the traits ----
  personality: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, kit = artKit(ctx);
    // verso: the brand line as explicit sentence lines at 48/57 (38/38 only if a sentence will not fit), the second line, the docket print
    // under its tape, and the description on the bottom row beside it
    const sentences = String(B.lines.primary).split(/(?<=[.!?])\s+/).filter(Boolean);
    const [hSize, hLh] = [[48, 57], [38, 38]].find(([sz]) => sentences.every((l) => advance(T._displayStem, sz, l, -0.02) <= 475)) || [38, 38];
    const hk = { stem: T._displayStem, size: hSize, lh: hLh, track: -0.02 };
    const heroBl = row(Math.round((74 + capRatio(T._displayStem) * hSize - 17) / U));
    const h = block(hk, { x: 42, w: 475, lines: sentences, baseline: heroBl, cls: 'b-hero', style: `font-size:${hSize}px;line-height:${hLh}px;` });
    const lastBl = heroBl + hLh * (sentences.length - 1);
    const second = B.lines.others[0]
      ? block(T['b-line'], { x: 42, w: 475, lines: [B.lines.others[0]], baseline: row(Math.ceil((lastBl + 38 - 17) / U)), cls: 'b-line' }).html : '';
    // 228 to 238 wide (the docket starts at 289): the fewest lines, never a last line of one word
    let dl = wrap(T['b-body'].stem, 13, B.description, 228), dScore = dl.length + (dl.slice(-1)[0].includes(' ') ? 0 : 10);
    for (let dw = 229; dw <= 238; dw++) {
      const c = wrap(T['b-body'].stem, 13, B.description, dw), sc = c.length + (c.slice(-1)[0].includes(' ') ? 0 : 10);
      if (sc < dScore) { dl = c; dScore = sc; }
    }
    const desc = block(T['b-body'], { x: 42, w: 238, lines: dl, baseline: 739 - 19 * (dl.length - 1), cls: 'b-body' }).html;
    // the quote slip lies on the clipboard on the toolbox (library map: quote); the surface is 0.84 : 1, so the slip is drawn 451 x 537
    const dScene = ctx.sceneInfo('bench-clipboard-toolbox');
    const dUrl = ctx.mockup('bench-clipboard-toolbox', [kit.docket(451, 537)]);
    const dPrint = { x: 289, y: 339, w: 228, h: 342 };
    const vd = printHtml({ ...dPrint, inner: sceneImg(dUrl, sceneCrop(dScene, 228, 342, 0.8, 'w'), 'The quote slip'), label: 'The quote slip' })
      + stick(T, { ...dPrint, label: 'The quote slip' });

    // recto: the label (or the brand's own photograph) at size L, under its tape
    const shot = (B.imagery.shots || []).find((s) => s.photo);
    const mScene = ctx.sceneInfo('label-pine');
    const mUrl = ctx.mockup('label-pine', [kit.label(440, 210)]);
    const mPrint = { x: 42, y: 131, w: 456, h: 304 };
    const mInner = shot ? photoAt(ctx, shot.id, { style: 'width:100%;height:100%' }) : sceneImg(mUrl, sceneCrop(mScene, mPrint.w, mPrint.h), 'The brand label on a pine block');
    const mLabel = shot ? shot.caption : 'The label, on timber';
    let rc = printHtml({ ...mPrint, inner: mInner, label: shot ? (shot.alt || mLabel) : 'The brand label on a pine block' })
      + stick(T, { ...mPrint, label: mLabel });
    // traits: name in the left column, what it means in the right; each row is its lines plus one blank row
    let bl = row(Math.round((551 + 14.5 - 17) / U));
    B.personality.slice(0, 3).forEach((t) => {
      const ml = wrap(T['b-body'].stem, 13, t.means, 380);
      if (ctx.edition === 'slot') {   // slot: the trait's placeholder is wider than its 76 px column, so the name sits on its own row above the text
        rc += block(T['b-name'], { x: 42, w: 475, lines: [t.trait], baseline: bl, cls: 'b-name' }).html
          + block(T['b-body'], { x: 42, w: 475, lines: ml, baseline: bl + 19, cls: 'b-body' }).html;
        bl += 19 * ml.length + 38;
        return;
      }
      rc += block(T['b-name'], { x: 42, w: 76, lines: [t.trait], baseline: bl, cls: 'b-name' }).html
        + block(T['b-body'], { x: 137, w: 380, lines: ml, baseline: bl, cls: 'b-body' }).html;
      bl += 19 * ml.length + 19;
    });
    return spread(ctx, 'personality', { verso: h.html + second + vd + desc, recto: rc });
  },

  // ---- palette: each colour a full-height strip, as wide as its share of a page ----
  palette: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), N = nb(ctx);
    const cols = [...B.colours].sort((a, b) => b.share - a.share);
    // widths in whole units, at least 4, the remainder to the largest
    const units = cols.map((c) => Math.max(4, Math.round(c.share * 513 / U)));
    units[0] = 27 - units.slice(1).reduce((a, b) => a + b, 0);
    const first = (stem, size, lh, top) => row(Math.round((top + lineOffset(stem, size, lh) - 17) / U));

    // verso: the title, the lead, a row per colour, the contrast note
    const title = ctx.pages.find((p) => p.id === 'palette');
    let vc = block(T['b-title'], { x: 42, w: 475, lines: [(title && title.title) || 'Palette'], baseline: 93, cls: 'b-title' }).html;
    // 285 wide, a unit wider at a time until the last line is more than one word
    // the floor is named in the lead only when it was applied
    const floored = cols.slice(1).some((c) => Math.round(c.share * 513 / U) < 4);
    const leadText = `${numberWord(cols.length)} colours. Each colour strip on the right is as wide as the share of a page that colour takes.`
      + (floored ? ' The smallest are held at four dots wide so their names fit.' : '');
    let leadW = 285;
    while (leadW < 475 && wrap(T['b-body'].stem, 13, leadText, leadW).slice(-1)[0].split(' ').length < 2) leadW += U;
    vc += block(T['b-body'], { x: 42, w: leadW, top: 131, text: leadText, cls: 'b-body' }).html;
    let bl = first(T['b-name'].stem, 13, 19, 227);
    for (const c of cols) {
      const ll = wrap(T['b-body'].stem, 13, c.lands, 323);
      vc += block(T['b-name'], { x: 42, w: 76, lines: [c.name], baseline: bl, cls: 'b-name' }).html
        + block(T['c-mono'], { x: 137, w: 57, lines: [`${Math.round(c.share * 100)}%`], baseline: bl, cls: 'c-mono' }).html
        + block(T['b-body'], { x: 194, w: 323, lines: ll, baseline: bl, cls: 'b-body' }).html;
      bl += 19 * ll.length + 19;
    }
    const act = B.colours.find((c) => c.role === 'action');
    const pr = act && (B.pairs || []).find((p) => p.fg === act.id && B.colours.some((c) => c.id === p.bg));
    const note = pr ? `${R.actionName} is text on ${B.colours.find((c) => c.id === pr.bg).name} only.` : `${R.actionName} is never set as text.`;
    vc += block(T['c-note'], { x: 42, w: 475, top: 703, lines: [note], cls: 'c-note' }).html;

    // recto: the lengths, left to right; the text inside each is the colour that passes on it
    // the running head is right-aligned at the page's x 828 (leaf-local 269) when one colour holds all of it (then that colour's own text colour
    // passes behind it); if it would cross two lengths it stays at the left of the first, so the one exception to the right-aligned heads is a
    // contrast decision, not a taste one
    const pg = ctx.pages.find((q) => q.id === 'palette');
    const headText = pg.section ? `${pg.section.title}, ${pg.title}` : pg.title;
    const headW = Math.ceil(advance(T['c-head'].stem, 11, headText, 0.01));
    const spans = []; { let sx = 23; units.forEach((u) => { spans.push([sx, sx + u * U]); sx += u * U; }); }
    let headIn = spans.findIndex(([l, r]) => 269 - headW >= l + 10 && 269 <= r - 10);
    const headRight = headIn >= 0;
    if (!headRight) headIn = 0;
    let x = 23, rc = '';
    cols.forEach((c, i) => {
      const w = units[i] * U, ink = readable(ctx, c.hex, [R.text, R.ground.hex], `palette field ${c.name}`);
      const rgb = [1, 3, 5].map((k) => parseInt(c.hex.slice(k, k + 2), 16));
      const rgbLines = [`R ${rgb[0]}`, `G ${rgb[1]}`, `B ${rgb[2]}`];   // the same three rows in every field, so one layout whatever the width
      // the running head sits in one length and the folio in the last, so each is set in the colour that passes on its own ground
      const head = i !== headIn ? '' : headRight ? rightText(T['c-head'], { x: 269 - x, text: headText, baseline: 36, cls: 'c-head', color: ink, knock: false }).html
        : block(T['c-head'], { x: 19, w: 300, baseline: 36, lines: [headText], cls: 'c-head', color: ink, knock: false }).html;
      const folio = i === cols.length - 1 ? rightText(T['c-mono'], { x: w - 10, text: folios(ctx, 'palette')[1], baseline: 777, cls: 'c-mono', color: ink, knock: false }).html : '';
      const inner = head + folio
        + block(T['b-name'], { x: 10, w: w - 20, lines: [c.name], baseline: 93, cls: 'b-name', color: ink, knock: false }).html
        + block(T['c-mono'], { x: 10, w: w - 20, lines: [c.hex.toUpperCase()], baseline: 112, cls: 'c-mono', color: ink, knock: false }).html
        + block(T['c-mono'], { x: 10, w: w - 20, lines: rgbLines, baseline: 131, cls: 'c-mono', color: ink, knock: false }).html;
      rc += `<div class="field${nearPaper(ctx, c.hex) ? ' edge' : ''}" style="left:${x}px;top:0;width:${w}px;height:794px;box-sizing:border-box;background:${c.hex}">${inner}</div>`;
      x += w;
    });
    return spread(ctx, 'palette', {
      verso: vc, recto: rc, clear: [{ recto: true, x: 23, y: 0, w: 513, h: 794 }],
      rectoChrome: false,
    });
  },

  // ---- typefaces: the display face's "Aa" between a cap line and a baseline, the body face's weights, a clipboard ----
  typefaces: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), kit = artKit(ctx);
    // verso: "Aa" is drawn as a path (so the checker sees a shape, not text), sized so its cap height is a whole number of units
    const font = loadFont(T._displayStem), cr = capRatio(T._displayStem);
    let k = 13, size = 0, o;
    for (; k >= 8; k--) {
      size = k * U / cr; o = outline(font, 'Aa', size, 0);
      if (o.x2 - o.x1 <= 475) break;
    }
    k = Math.max(k, 8);
    const base = 587, cap = base - k * U;
    const aa = `<svg style="left:42px;top:${px(base + o.y1)};z-index:1;overflow:visible" width="${Math.ceil(o.x2 - o.x1)}" height="${Math.ceil(o.y2 - o.y1)}" viewBox="0 0 ${px(o.x2 - o.x1).replace('px', '')} ${px(o.y2 - o.y1).replace('px', '')}" role="img" aria-label="Aa, set in ${A(B.fonts.display.family)}"><path d="${o.d}" transform="translate(${px(-o.x1).replace('px', '')} ${px(-o.y1).replace('px', '')})" fill="var(--paper)" stroke="var(--paper)" stroke-width="9" stroke-linejoin="round"/><path d="${o.d}" transform="translate(${px(-o.x1).replace('px', '')} ${px(-o.y1).replace('px', '')})" fill="var(--ink)"/></svg>`;
    const line = (y) => `<div class="rule" style="left:23px;top:${y}px;width:513px;height:1px;z-index:2"></div>`;
    let vc = aa + line(base) + line(cap);
    vc += block(T['b-title'], { x: 42, w: 475, lines: [B.fonts.display.family], baseline: 663, cls: 'b-title' }).html;
    vc += rightText(T['c-note'], { x: 536, text: `${k} dots tall`, baseline: cap - 6, cls: 'c-note' }).html;
    vc += block(T['b-body'], { x: 42, w: 380, top: 684, text: B.type.rules[0].do, cls: 'b-body' }).html;

    // recto: the body face and its weights (the ones the brand loads in brand text, the rest in pencil grey), a sample, the mono, the licence
    const bw = B.fonts.body.weights;
    let rc = block(T['b-title'], { x: 42, w: 475, lines: [B.fonts.body.family], baseline: 93, cls: 'b-title' }).html;
    let sb = 150;
    for (const w of [300, 400, 500, 600, 700]) {
      // the stem of each weight (a greyed one is an extra face index.js loads): the line is measured at its own weight, so its knockout fits it
      const stem = (ctx.faces.find((f) => f.role === 'body' && f.style !== 'italic' && f.weight === w) || { stem: `${B.fonts.body.file}-${w}` }).stem;
      rc += block(T['b-stack'], { x: 42, w: 228, lines: [`${weightName(w)} ${w}`], widths: [advance(stem, 26, `${weightName(w)} ${w}`, 0)], baseline: sb, cls: 'b-stack', style: `font-weight:${w};color:${bw.includes(w) ? 'var(--ink)' : 'var(--unused)'};` }).html;
      // a weight the brand does not use says so in words, a little after its own name
      if (!bw.includes(w)) {
        rc += block(T['c-label'], { x: 42 + Math.ceil(advance(stem, 26, `${weightName(w)} ${w}`, 0)) + 14, w: 60, lines: ['Not used'], baseline: sb, cls: 'c-label', color: 'var(--graphite)' }).html;
      }
      sb += 38;
    }
    const para = block(T['b-body'], { x: 42, w: 228, top: 360, text: B.type.sample.paragraph, cls: 'b-body' });
    rc += para.html;
    const m = B.fonts.mono;
    if (m) {
      const paraEnd = para.baseline + 19 * (para.lines.length - 1);
      const mb = Math.max(row(Math.round((589 + 14.5 - 17) / U)), paraEnd + 38);
      rc += block(T['c-note'], { x: 42, w: 228, lines: [`Action colour, set in ${m.family}`], baseline: mb, cls: 'c-note' }).html
        + block(T['m-hex'], { x: 42, w: 228, lines: [R.action.toUpperCase()], baseline: mb + 19, cls: 'b-hex' }).html;
    }
    const nFaces = new Set(['display', 'body', 'mono'].map((r) => B.fonts[r] && B.fonts[r].family).filter(Boolean)).size;
    rc += block(T['c-note'], { x: 42, w: 475, top: 703, lines: [`All ${numberWord(nFaces).toLowerCase()} faces are under the SIL Open Font Licence.`], cls: 'c-note' }).html;
    const sheet = ctx.sceneInfo('clipboard');
    const sUrl = ctx.mockup('clipboard', [kit.clipboard(794, 1054)]);
    const p = { x: 289, y: 131, w: 228, h: 342 };
    rc += printHtml({ ...p, inner: sceneImg(sUrl, sceneCrop(sheet, p.w, p.h), 'An A4 sheet on a clipboard, set in the brand type'), label: 'An A4 sheet on a clipboard, set in the brand type' })
      + stick(T, { ...p, label: 'Type in use, on an A4 sheet' });
    return spread(ctx, 'typefaces', { verso: vc, recto: rc });
  },

  // ---- business-card (the applications spread): the sign and the card on the verso; the title and the phone on the recto ----
  'business-card': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, kit = artKit(ctx), ap = B.applications;
    // the signage scene is chosen by what the brand's own sign is called
    const sg = ap.signage.toLowerCase(), has = (...w) => w.some((x) => sg.includes(x));
    const sceneId = signSpec(ctx).poster ? 'kerb-shelter-morning' : has('ute', 'van door') ? signSpec(ctx).vehicle : has('wharf') ? 'wharf-sign' : has('shop', 'fascia') ? 'shopfront-fascia' : 'poster-wall';
    const sc = ctx.sceneInfo(sceneId), asp = sc.quads[0].aspect;
    const aw = asp >= 1 ? 1200 : 593, ah = Math.round(aw / asp);
    const portrait = asp < 1;
    const sUrl = ctx.mockup(sceneId, [kit.sign(aw, ah, signSpec(ctx).line)]);
    // verso: the sign on its own, as large as the page allows. A landscape sign is 456 x 418 with the sign filling 80% of the width; a portrait
    // poster is 304 x 456 with the poster filling 62% of the width
    const L = portrait ? { x: 42, y: 112, w: 304, h: 456 } : { x: 42, y: 112, w: 456, h: 418 };
    const sLabel = ap.signage.split(':')[0];
    const vc = printHtml({ ...L, inner: sceneImg(sUrl, portrait ? sceneCrop(sc, L.w, L.h) : sceneCrop(sc, L.w, L.h, 0.8, 'w'), `${sLabel}, in place`), label: `${sLabel}, in place` })
      + stick(T, { ...L, label: sLabel });

    // recto: the title, then a diagonal. The phone (266 x 380) hangs from the title's left edge; the business card (285 x 190) is bottom right,
    // with its own words in the corner it leaves, the last line level with the card's bottom edge
    let rc = block(T['b-title'], { x: 42, w: 475, lines: ['Applications'], baseline: 93, cls: 'b-title' }).html;
    const phoneUrl = ctx.mockup('phone-hand', [kit.phone(390, 868)]);
    const ps = ctx.sceneInfo('phone-hand'), P = { x: 42, y: 131, w: 266, h: 380 };
    // the phone's crop is placed by hand: the screen's quad fills 57% of the print's width and the phone's top edge (the bezel is about 4%
    // of the screen's width above the quad) sits 24 px under the print's top, so the tape (9 px into the print) clears the bezel
    const pq = ps.quads[0].corners, qx1 = Math.min(...pq.map((c) => c[0])), qx2 = Math.max(...pq.map((c) => c[0])), qy1 = Math.min(...pq.map((c) => c[1]));
    const ks = 0.57 * P.w / (qx2 - qx1), bezel = 0.04 * (qx2 - qx1);
    const pCrop = { iw: ps.w * ks, ih: ps.h * ks, left: Math.min(0, Math.max(P.w - ps.w * ks, P.w / 2 - (qx1 + qx2) / 2 * ks)), top: Math.min(0, Math.max(P.h - ps.h * ks, 24 - (qy1 - bezel) * ks)) };
    rc += printHtml({ ...P, inner: sceneImg(phoneUrl, pCrop, 'The app on a phone'), label: 'The app on a phone' }) + stick(T, { ...P, label: 'The app at 390 px' });
    const S = { x: 232, y: 549, w: 285, h: 190 };
    const cardUrl = ctx.mockup('counter-till-cards', { 'card-front': kit.cardFront(340, 208), 'card-back': kit.cardBack(340, 208) });
    const cs = ctx.sceneInfo('counter-till-cards');
    rc += printHtml({ ...S, inner: sceneImg(cardUrl, sceneCrop(cs, S.w, S.h, 0.92, 'w'),'The business card, front and back'), label: 'The business card, front and back' })
      + stick(T, { ...S, label: 'Business card, 90 x 55 mm' });
    const card = ap.card, nw = S.x - U - 42, bot = S.y + S.h;
    const pl = wrap(T['c-strong'].stem, 13, card.person, nw), rl = wrap(T['c-note'].stem, 13, card.role, nw);
    if (advance(T['c-mono'].stem, 11, card.contact, 0) > nw) throw new Error(`card contact "${card.contact}" does not fit ${nw} px`);
    rc += block(T['c-strong'], { x: 42, w: nw, baseline: bot - U * (pl.length + rl.length), lines: pl, cls: 'c-strong' }).html
      + block(T['c-note'], { x: 42, w: nw, baseline: bot - U * rl.length, lines: rl, cls: 'c-note' }).html
      + block(T['c-mono'], { x: 42, w: nw, baseline: bot, lines: [card.contact], cls: 'c-mono' }).html;
    return spread(ctx, 'business-card', { verso: vc, recto: rc, headText: 'Applications' });
  },

  // ---- logo: the dense proof. The verso shows the clear space as dots that stop; the recto is the seven versions as cut cards ----
  logo: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, R = brandRoles(ctx), N = nb(ctx), lg = ctx.logo, geo = lg.geos, sh = B.logo.showcase;
    const box = (x, bottom, w, id, html) => `<div style="left:${x}px;top:${px(bottom - w * geo[id].h / geo[id].w)};width:${w}px;z-index:1">${html}</div>`;
    // verso: the logo at about 20 units wide; the zone around it is exactly the brand's clear share of the logo's height on all four sides, and
    // a dot is hidden only when it is inside the zone. The width gives way a pixel at a time until no zone edge lands within 3 px of a dot
    // centre (so no dot is cut in half), which keeps the drawn brackets equal to the figure in the line below them.
    const lx = 99, lbot = row(18), share = lg.geo.unit / geo.colour.h;
    const nearDot = (v, o) => { const d = ((v - o) % U + U) % U; return Math.min(d, U - d) < 3; };
    let lw = 380, lh, pad, zone;
    for (const dw of [0, -1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6]) {
      lw = 380 + dw; lh = lw * geo.colour.h / geo.colour.w; pad = share * lh;
      const x0 = Math.round(lx - pad), x1 = Math.round(lx + lw + pad), y0 = Math.round(lbot - lh - pad), y1 = Math.round(lbot + pad);
      zone = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      if (![x0, x1].some((v) => nearDot(v, 23)) && ![y0, y1].some((v) => nearDot(v, 17))) break;
      if (dw === 6) throw new Error('logo page: no clear zone keeps every dot whole');
    }
    const frac = [[0.25, 'a quarter'], [1 / 3, 'a third'], [0.5, 'half']].find(([f]) => Math.abs(share - f) < 0.02);
    const shareText = frac ? frac[1] : `${Math.round(share * 100)}%`;
    let vc = box(lx, lbot, lw, 'colour', lg.html('colour', { width: lw, color: N.text }));
    vc += block(T['c-note'], { x: 42, w: 475, top: 475, lines: [`Clear space is where the dots stop: ${shareText} of the logo's height all round.`], cls: 'c-note' }).html;
    vc += block(T['b-body'], { x: 42, w: 380, top: 532, text: B.logo.idea, cls: 'b-body' }).html;
    const mw = sh.minScreenPx, mbot = row(36);
    // the small logo is on bare paper, so it gets the same knockout as text: a paper box 6 px bigger each side but the top (2 px, so the dot row
    // above it is left whole rather than cut in half; it is 4 px clear of the mark)
    const mh = mw * geo.colour.h / geo.colour.w;
    vc += `<div style="left:36px;top:${px(mbot - mh - 2)};width:${mw + 12}px;height:${px(mh + 8)};background:var(--paper);z-index:0"></div>`
      + box(42, mbot, mw, 'colour', lg.html('colour', { width: mw, color: N.text }));
    // a mixed line: the words are the notebook's plain sans, only the two values are mono
    // its width is measured by parts (the .m spans are 12 px mono with the space between number and unit pulled in by 0.3 em)
    const mono = (t) => advance(CHROME_STEMS.mono, 12, t, 0) - 0.3 * 12, rawW = mono(`${sh.minScreenPx} px`) + advance(T['c-note'].stem, 13, ' on screen, ', 0) + mono(`${sh.minPrintMm} mm`) + advance(T['c-note'].stem, 13, ' in print', 0);
    vc += block(T['c-note'], { x: 175, w: 342, baseline: mbot, raw: true, widths: [rawW], lines: [`<span class="m">${sh.minScreenPx} px</span> on screen, <span class="m">${sh.minPrintMm} mm</span> in print`], cls: 'c-note' }).html;
    // the clear zone's corners, as 1 px graphite ticks, one unit long each way, so the zone can be seen as well as counted
    const tk = (x, y, w, h) => `<div class="rule" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:2"></div>`;
    // the ticks sit just outside the zone (their inner edges are the zone's edges), so the space between a tick and the logo is the clear space
    const ox0 = zone.x - 1, oy0 = zone.y - 1, ox1 = zone.x + zone.w + 1, oy1 = zone.y + zone.h + 1;
    for (const [hx, vx, hy, vy] of [[ox0, ox0, oy0, oy0], [ox1 - U, ox1 - 1, oy0, oy0], [ox0, ox0, oy1 - 1, oy1 - U], [ox1 - U, ox1 - 1, oy1 - 1, oy1 - U]]) {
      vc += tk(hx, hy, U, 1) + tk(vx, vy, 1, U);
    }

    // recto: seven cells, each a card cut from the version's own ground with a tab on its top edge
    const cells = [['colour', 42, 112, 228], ['mono-dark', 289, 112, 228], ['mono-light', 42, 264, 228], ['reversed', 289, 264, 228],
      ['horizontal', 42, 416, 475], ['stacked', 42, 568, 228], ['symbol', 289, 568, 228]];
    let rc = '';
    for (const [id, x, y, w] of cells) {
      const h = 7 * U, wy = B.logo.colourways[lg.colourwayOf(id)], ground = wy.ground;
      const ink = readable(ctx, ground, [wy.name, R.text, R.ground.hex], `logo card ${id}`);
      // the wordmark's top is 28 px under the card's top (clear of the tab); it takes what is left above the description, at most 52 px.
      // The stacked version is the exception: it starts 18 px down (still 8 px clear of the tab) and takes all the room, so it can be 120 px wide
      const wl = wrap(T['b-small'].stem, 11, B.logo.when[id], w - 24);
      const g = geo[id], top = id === 'stacked' ? 18 : 28, cap = id === 'stacked' ? 1e9 : 52;
      const lhh = Math.min(cap, h - top - 12 - 14 * wl.length - 8, (w - 24) / (g.w / g.h)), lww = lhh * g.w / g.h;
      rc += `<div class="card stuck${nearPaper(ctx, ground) ? ' edge' : ''}" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;background:${ground}">`
        + `<div style="position:absolute;left:12px;top:${top}px;width:${px(lww)}">${lg.html(id, { width: lww, color: ink })}</div>`
        + `<div class="when${wl.some(hasPh) ? ' ph-tight' : ''}" style="width:${w - 24}px;color:${ink}">${wl.map((s) => `<span class="ln">${A(s)}</span>`).join('')}</div></div>`
        + tab(T, { x, y, label: lg.labels[id] });
    }
    return spread(ctx, 'logo', { verso: vc, recto: rc, clear: [{ x: zone.x - 1, y: zone.y - 1, w: zone.w + 2, h: zone.h + 2 }] });
  },
};
