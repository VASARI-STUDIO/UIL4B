// Theme 23, Broadsheet: the six gate pages (cover, intro, palette, typefaces, layouts, business-card used as the round-1 applications page).
// Round 2 adds the other 27. Every string is read from brand data; no colour id, photo id or brand name is written here.
import { plateImg } from '../../engine/plate.js';
import { frontPage, phoneArt, postArt } from './frontpage.js';
import { ttl, A, N, G, E, col, hr, px, pad3, jump, pageOf, editionLine, folio, fitLines, headLines, fitLogo, plateInner, plateBox, bodyWeight, displayWeight, measureBody, measureRole, balance2, measure, copyGuard, pullQuote, appsHead, ledger, glyphLines, GLYPHS, linesIn, signLine, postLine, sheetLine, foldLine, plateExample, shopHead } from './helpers.js';

// the intro's pull quote: a story the brand wrote that is neither the headline, the description nor a line of the market report (the applications page reads it too, to keep clear of it)
const introQuote = (ctx) => {
  const B = ctx.brand, ledgerText = B.ui.screen.content.deliveries.slice(0, 5).flatMap((d) => [d.to, d.when, d.price]);
  return { q: pullQuote(ctx, [B.lines.others[1], B.description, ...ledgerText]), ledgerText };
};
const page = (ctx, id, inner, art = []) => copyGuard(ctx, id, `<section class="pg" data-page="${id}">${inner}</section>`, art);

export const guidelines = {
  // ---- 001: the front page. The nameplate is the one extreme element; the plate sits below the fold ----
  cover: (ctx) => {
    const B = ctx.brand, L = ctx.logo;
    const ears = E(G.left, 40, 'c-folio c-ink', 'Brand guidelines')
      + E(G.mid - 250, 40, 'c-folio c-quiet', A(editionLine(ctx)), { w: 500, style: 'text-align:center' })
      + (B.city ? E(G.right - 200, 40, 'c-folio c-ink c-right', A(B.city), { w: 200 }) : '')
      + hr(G.left, 72, 1000, 1);
    let w = fitLogo(ctx, 'colour', 1000, 192), h = w * L.geos.colour.h / L.geos.colour.w, nx = G.left + (1000 - w) / 2;
    // a wordmark with a tail (the kerb) is centred on its name, not on the name and the tail together, as long as the tail still clears the measure
    const gm = L.geo || {};
    if (gm.W && gm.tail && ctx.edition !== 'slot') {
      const s = Math.min(w / (gm.W + gm.tail), (G.right - G.mid) / (gm.W / 2 + gm.tail));
      w = s * (gm.W + gm.tail); h = w * L.geos.colour.h / L.geos.colour.w; nx = G.mid - gm.W * s / 2;
    }
    const plate = E(nx, 96 + (192 - h) / 2, 'nameplate', L.html('colour', { width: w, color: N.ink, label: 'Logo' }), { w, h });
    const dbl = hr(G.left, 312, 1000, 3) + hr(G.left, 319, 1000, 1);
    const hd = fitLines(ctx, B.lines.primary, { w: 744, max: 64, min: 52, maxLines: 2 });
    const head = E(G.left, 360, 'story', headLines(hd.lines, hd.size, Math.round(hd.size * 68 / 64)), { w: 744 });
    const deck = E(G.left, 528, 'b-deck', A(B.voice.boilerplate25), { w: 488 });
    // Inside: one row per section, with its first page
    const rows = ctx.sections.slice(0, 10).map((s, i, a) => `<div class="ins-row${i === a.length - 1 ? ' last' : ''}"><span class="c-folio c-quiet">${String(s.n).padStart(2, '0')}</span><span class="c-note c-ink">${A(s.title)}</span><span class="c-label">${pad3(ctx.pageNo(s.pages[0].id))}</span></div>`).join('');
    const inside = col(G.x[3], 360, G.col, `<p class="c-label c-ink" style="margin-bottom:8px">Inside</p><div class="ins-list" style="border-top:1px solid ${N.ink}">${rows}</div>`, { rule: true });
    // the plate, below the fold; a brand with no photograph gets a text plate
    const pl = col(G.left, 816, 744, plateInner(ctx, "cover", 0));
    const pr = B.voice.principles[1];
    // a price the brief shows is the price of what the plate shows: a ledger price in the example becomes the price of the ledger row the plate's caption names
    const ex = plateExample(ctx, pr.example);
    const brief = col(G.x[3], 816, G.col, `${ttl(ctx, ex, G.col)}<p class="c-cap c-quiet" style="margin-top:16px">${A(pr.title)}.</p>${jump(ctx, 'voice', 'Voice and tone')}`, { rule: true });
    return page(ctx, 'cover', ears + plate + dbl + head + deck + inside + pl + brief);
  },

  // ---- intro: the brand's news as an extreme headline, its description, its voice as briefs and its sell-out line as the pull quote ----
  intro: (ctx) => {
    const B = ctx.brand, headline = B.lines.others[1];
    const hd = fitLines(ctx, headline, { w: 1000, max: 144, min: 96, maxLines: 3, step: 1 });
    const lh = Math.round(hd.size * 0.95), headH = hd.lines.length * lh;
    const head = E(G.left, G.top, 'story', headLines(hd.lines, hd.size, lh, 'b-headxl'), { w: 1000 });
    // everything below hangs from the deck's top, which is the spec's y 456 unless a taller headline pushes it down
    const y0 = Math.max(456, G.top + headH + 40);
    // the deck is set one step up (28/36) so the left column is as tall as the right one (plate and quote)
    const deck = col(G.left, y0, 488, `<p class="b-deck${ctx.placeholders ? ' ph-tight' : ''}" style="font-size:28px;line-height:36px">${A(B.description)}</p>`);
    // the pull quote is a story the brand wrote that is neither the headline, the description nor a line of the market report
    const { q, ledgerText } = introQuote(ctx);
    // a short quote is set big, in two balanced lines; a long one smaller, in as many as it needs
    const q2 = q.write.length <= 48 ? balance2(ctx, q.write, { w: 488, max: 64, min: 40 }) : null;
    const qf = q2 && q2.ok ? q2 : fitLines(ctx, q.write, { w: 488, max: 40, min: 28, maxLines: 5, step: 2 });
    const qlh = qf.size >= 48 ? Math.round(qf.size * 68 / 64) : qf.size === 40 ? 44 : Math.round(qf.size * 1.1);
    const right = col(G.x[2], y0, 488, `${plateInner(ctx, 'intro', 0)}<i class="hr-flow" style="margin-top:32px"></i><div style="margin-top:16px">${headLines(qf.lines, qf.size, qlh, 'b-title')}</div><p class="c-cap c-quiet" style="margin-top:16px">${A(q.because)}</p>`, { rule: true });
    // briefs: a principle and the rule behind it. The example is not printed (the headline, the pull quote and the market report already show it in use);
    // a principle with no written rule shows its example, unless the page has it already
    const wt = B.voice.writeThis, printed = `${headline} ${q.write} ${B.description} ${ledgerText.join(' ')}`;
    const words = (t) => new Set(t.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean));
    const said = (t) => { const a = words(t), b = words(q.write); return [...a].filter((x) => b.has(x)).length >= 4; };
    const ps = B.voice.principles.slice(0, 4).map((p) => {
      const w = wt.find((t) => p.example.includes(t.write.replace(/[.!?]+$/, '')) && t.write !== q.write);
      // a brief's rule loses any sentence the pull quote already says; a brief with nothing left is dropped
      if (w) {
        const body = w.because.split(/(?<=[.!?])s+/).filter((t) => t.replace(/[.!?]+$/, '') !== q.write.replace(/[.!?]+$/, '')).join(' ');
        return !body || said(body) || said(p.example) ? null : { title: p.title, body, not: w.not };
      }
      if (said(p.example)) return null;
      return printed.includes(p.example.replace(/[.!?]+$/, '')) || ledgerText.some((t) => p.example.includes(t)) || p.example === q.write ? null : { title: p.title, body: p.example };
    }).filter(Boolean);
    const one = (p) => `<div class="brief"><p class="b-brief">${A(p.title)}</p><p class="b-body">${A(p.body)}</p>${p.not ? `<p class="c-cap c-quiet" style="margin-top:4px">Not “${A(p.not)}”</p>` : ''}</div>`;
    // the ledger's rows take up the slack: it starts 64 below the end of the right column (plate, quote, its note), rows between 64 and 84 tall
    const pb = plateBox(ctx, 'intro'), noteH = Math.ceil(q.because.length * 8.4 / 488) * 22, rBottom = y0 + (pb ? pb.h + 8 + 20 : 0) + 49 + qf.lines.length * qlh + 16 + noteH + 16;
    const rowH = Math.max(64, Math.min(84, Math.floor((G.floor - (rBottom + 64) - 40) / 5)));
    const half = Math.ceil(ps.length / 2), c1 = ps.slice(0, half), c2 = ps.slice(half);
    // "How we talk" hangs 64 below the deck's last line
    const deckH = (ctx.placeholders ? 2 : linesIn(ctx, 'body', B.description, 28, 488, bodyWeight(ctx, 500))) * 36;   // slot: the compact placeholder, two lines
    const yT = y0 + deckH + 64, yB = yT + 46;
    const talk = E(G.left, yT, 'c-label c-ink', 'How we talk', { w: 488 }) + hr(G.left, yT + 30, 488, 1);
    // the jump line sits under the shorter column (the right one when they are even)
    const jmp = jump(ctx, 'personality', 'Personality');
    const colA = col(G.x[0], yB, G.col, `<div class="briefs" style="margin-top:0">${c1.map(one).join('')}</div>`);
    const colB = col(G.x[1], yB, G.col, `<div class="briefs" style="margin-top:0">${c2.map(one).join('')}</div>${jmp}`, { rule: true });
    const jcol = '';
    return page(ctx, 'intro', folio(ctx, 'intro') + head + deck + right + talk + colA + colB + jcol + ledger(ctx, { rowH }));
  },

  // ---- palette: colour by how much of the page it covers; the fields are the page's mass ----
  palette: (ctx) => {
    const B = ctx.brand, C = ctx.C, cs = ctx.colours;
    const shares = cs.map((c) => (typeof c.share === 'number' ? c.share : 1 / cs.length)), sum = shares.reduce((a, b) => a + b, 0);
    const top = cs[shares.indexOf(Math.max(...shares))], pct = Math.round(Math.max(...shares) / sum * 100);
    const hd = fitLines(ctx, `${top.name} is ${pct}% of every ${B.name} screen.`, { w: 1000, max: 64, min: 48, maxLines: 2 });
    const hlh = Math.round(hd.size * 68 / 64);
    const head = E(G.left, G.top, 'story', headLines(hd.lines, hd.size, hlh), { w: 1000 });
    // the band: one full-height field per colour, abutting, width by share; the last takes the remainder
    const yb = Math.max(216, G.top + hd.lines.length * hlh + 40), BH = 680;
    let x = G.left, used = 0, fields = '', narrow = '', prevNarrowRight = null, row = 0;
    cs.forEach((c, i) => {
      const w = i === cs.length - 1 ? 1000 - used : Math.round(1000 * shares[i] / sum); used += w;
      const faint = C.ratio(c.hex, N.paper) < 1.3, share = `${Math.round(shares[i] / sum * 100)}%`;
      const on = C.ratio(c.hex, N.ink) >= C.ratio(c.hex, N.paper) ? N.ink : N.paper;
      fields += E(x, yb, 'fld', '', { w, h: BH, style: `background:${c.hex};${faint ? 'box-shadow:inset 0 0 0 1px var(--hair)' : ''}` });
      if (w >= 96) fields += E(x + 16, yb + 16, 'fld-lab', `<p class="c-label" style="color:${on}">${A(c.name)}</p><p class="c-folio" style="color:${on}">${share}</p>`, { w: w - 32 });
      else if (w >= 40) fields += E(x + 8, yb + 16, 'fld-lab', `<p class="c-folio" style="color:${on}">${share}</p>`, { w: w - 16 });
      else {
        // a field too narrow for its share: the label hangs under the band at its right edge; a second one beside it goes a row lower
        const right = x + w;
        row = prevNarrowRight != null && prevNarrowRight - right < 110 ? row + 1 : 0; prevNarrowRight = right;
        narrow += E(right - 96, yb + BH + 16 + row * 24, 'c-label c-ink c-right nw', `${A(c.name)} ${share}`, { w: 96 });
      }
      x += w;
    });
    // the table: colour, its share, hex, where it lands
    const yt = yb + BH + 64;
    const head2 = [['Colour', G.left], ['Share', 373.5 - 80], ['Hex', 397.5], ['Where it lands', 573.5]]
      .map(([t, l], i) => E(l, yt, 'c-folio c-quiet' + (i === 1 ? ' c-right' : ''), t, i === 1 ? { w: 80 } : {})).join('');
    const rows = cs.map((c, i) => {
      const faint = C.ratio(c.hex, N.paper) < 1.3;
      return `<div class="prow"><div class="p1"><i class="key" style="background:${c.hex};${faint ? 'box-shadow:inset 0 0 0 1px var(--hair)' : ''}"></i><div><p class="c-label">${A(c.name)}</p><p class="c-cap c-quiet">${A(c.role)}</p></div></div>`
        + `<p class="c-label p2">${Math.round(shares[i] / sum * 100)}%</p><p class="c-mono p3">${A(c.hex)}</p><p class="c-cap c-ink p4">${A(c.lands)}</p></div>`;
    }).join('');
    // the colour rule: the first rule that names one of the brand's colours
    const r = (B.guideB?.rules || []).find((u) => cs.some((c) => new RegExp(`\\b${c.name}\\b`, 'i').test(`${u.title} ${u.text}`)));
    // a sentence of the rule that the table already prints is left out
    const rtext = r ? r.text.split(/(?<=[.!?])\s+/).filter((t) => !cs.some((c) => String(c.lands).includes(t))).join(' ') || r.text : '';
    const rule = r ? `<div class="crule"><p class="b-body">${rtext.toLowerCase().startsWith(r.title.split(' ')[0].toLowerCase()) ? '' : `<b class="b-brief">${A(r.title)}.</b> `}${A(rtext)}</p>${jump(ctx, 'contrast', 'Text pairs and their contrast')}</div>` : jump(ctx, 'contrast', 'Text pairs and their contrast');
    const tbl = col(G.left, yt + 28, 1000, `<div class="ptab">${rows}</div>${rule}`);
    return page(ctx, 'palette', folio(ctx, 'palette') + head + fields + narrow + head2 + hr(G.left, yt + 28, 1000, 1) + tbl);
  },

  // ---- typefaces: the headline as the specimen ----
  typefaces: (ctx) => {
    const B = ctx.brand, T = B.type.sample, F = B.fonts;
    // slot: the headline is a placeholder box, so it is set at a fixed size in a reserved height (three lines and the box's label and length)
    const slot = ctx.placeholders, tc = slot ? ' ph-tight' : '';
    const hd = slot ? { size: 44, lines: [T.headline] } : fitLines(ctx, T.headline, { w: 1000, max: 144, min: 96, maxLines: 3, step: 1 });
    const lh = Math.round(hd.size * 0.95);
    const head = E(G.left, G.top, 'story', headLines(hd.lines, hd.size, lh, 'b-headxl'), { w: 1000 });
    const yR = Math.max(554, G.top + (slot ? 3 * 48 + 72 : hd.lines.length * lh) + 24);
    const key = (x, face, role, own) => col(x, yR + 16, G.col, `<p class="fk-name" style="font-family:'${face.family}',sans-serif;${own}">${A(face.family)}</p><p class="c-cap c-quiet">${role}</p><p class="c-cap c-quiet">Weights <span class="c-mono c-ink">${face.weights.join(' ')}</span></p>`);
    let keys = key(G.x[0], F.display, 'Display face', `font-weight:${displayWeight(ctx)};`) + key(G.x[1], F.body, 'Body face', 'font-weight:400;');
    if (F.mono) keys += key(G.x[2], F.mono, 'Code face', 'font-weight:400;');
    const jx = F.mono ? G.x[3] : G.x[2];
    keys += col(jx, yR + 16, G.col, jump(ctx, 'hierarchy', 'Type scale and rules'), { cls: 'fkj' });
    const y2 = yR + 144;
    const spec = (t) => `<p class="c-cap c-quiet" style="margin-top:16px">${t}</p>`;
    // the deck is the brand's description in the body face; the paragraph and the caption are the three sizes it sets
    const deck = col(G.left, y2, 488, `<p class="b-deck sm${tc}">${A(B.description)}</p>${spec(`Body ${bodyWeight(ctx, 500)}, <span class="c-mono c-ink">24/32</span>`)}`);
    const body = col(G.x[2], y2, G.col, `<p class="b-body sm${tc}" lang="en-AU" style="font-size:18px;line-height:27px">${A(T.paragraph)}</p>${spec(`Body ${bodyWeight(ctx, 400)}, <span class="c-mono c-ink">18/27</span>`)}`, { rule: true });
    const cap = col(G.x[3], y2, G.col, `<p class="b-cap${tc}" style="font-size:17px;line-height:24px">${A(T.caption)}</p>${spec('Body 400, <span class="c-mono c-ink">17/24</span>')}`, { rule: true });
    // the glyph sets: the display face, the body face and the code face, each the largest size that holds its lines across the measure
    // slot: the compact placeholder is measured as a fixed number of lines, not as the sentinel
    const deckH = (slot ? 2 : linesIn(ctx, 'body', B.description, 24, 488, bodyWeight(ctx, 500))) * 32 + 38;
    const bodyH = (slot ? 3 : linesIn(ctx, 'body', T.paragraph, 18, G.col, 400)) * 27 + 38;
    const capH = (slot ? 2 : linesIn(ctx, 'body', T.caption, 17, G.col, 400)) * 24 + 38;
    const yG = y2 + Math.max(deckH, bodyH, capH) + 40;
    const dg = glyphLines((t, z) => measure(ctx, t, z), { w: 1000, max: 56, min: 40, sets: [GLYPHS.three, GLYPHS.five] }), dlh = dg.size + 8;
    const bg = glyphLines((t, z) => measureRole(ctx, 'body', t, z, 400), { w: 1000, max: 32, min: 24, sets: [GLYPHS.two, GLYPHS.three] }), blh = Math.round(bg.size * 1.25);
    const mg = F.mono ? glyphLines((t, z) => measureRole(ctx, 'mono', t, z, 400), { w: 1000, max: 24, min: 18, sets: [GLYPHS.two, GLYPHS.three] }) : null, mlh = mg ? Math.round(mg.size * 4 / 3) : 0;
    const block = (y, cls, g, lh, label) => E(G.left, y, `gl ${cls}`, g.lines.map((l) => `<span class="ln" style="font-size:${g.size}px;line-height:${lh}px">${A(l)}</span>`).join(''), { w: 1000 })
      + E(G.left, y + g.lines.length * lh + 8, 'c-cap c-quiet', label, { w: 1000 });
    const hh = (g, lh) => g.lines.length * lh + 8 + 22;
    // the foot: if the blocks end above y 1470 the slack is shared among the gaps (up to 12 px each), so the page ends near the same place on every brand
    const end0 = yG + 24 + hh(dg, dlh) + 48 + hh(bg, blh) + (mg ? 48 + hh(mg, mlh) : 0), ex = Math.max(0, Math.min(12, Math.round((1470 - end0) / (mg ? 6 : 4)))), gp = 24 + ex;
    let y = yG + ex + gp, glyphs = hr(G.left, yG + ex, 1000, 1);
    glyphs += block(y, 'gl-d', dg, dlh, `Display ${displayWeight(ctx)}, <span class="c-mono c-ink">${dg.size}/${dlh}</span>`); y += hh(dg, dlh) + gp;
    glyphs += hr(G.left, y, 1000, .75, 'hair'); y += gp;
    glyphs += block(y, 'gl-b', bg, blh, `Body 400, <span class="c-mono c-ink">${bg.size}/${blh}</span>`); y += hh(bg, blh) + gp;
    if (mg) { glyphs += hr(G.left, y, 1000, .75, 'hair'); y += gp; glyphs += block(y, 'gl-m', mg, mlh, `Code 400, <span class="c-mono c-ink">${mg.size}/${mlh}</span>`); y += hh(mg, mlh); }
    ctx.__tfEnd = y;
    return page(ctx, 'typefaces', folio(ctx, 'typefaces') + head + hr(G.left, yR, 1000, 1) + keys + deck + body + cap + glyphs);
  },

  // ---- layouts: the brand's paper, phone and post; the dense page ----
  layouts: (ctx) => {
    const B = ctx.brand, S = ctx.roles.light;
    const hd = balance2(ctx, B.product, { w: 1000, max: 64, min: 48 });
    const head = E(G.left, G.top, 'story', headLines(hd.lines, hd.size, Math.round(hd.size * 68 / 64)), { w: 1000 });
    // the photograph: the brand's sheet on the counter (the top half of the A3 sheet is what shows)
    const SW = 1123, SH = 1587, TH = Math.round(SW / ctx.sceneInfo('newspaper-counter').quads[0].aspect);
    const art = frontPage(ctx);
    const url = ctx.mockup('newspaper-counter', { 'front-page': { html: ctx.artPage(`${`<i class="ar-fill" style="background:var(--paper)"></i>`}${art}`, { w: SW, h: TH }), w: SW, h: TH } });
    // the photograph runs three columns wide and the A3 sheet is told beside it; the phone and the post stand below at the sizes their type can be read at
    const photo = E(G.left, 256, 'ph', plateImg(A(url), `${A(B.name)} front page, folded once, on a stone counter`, 'width:744px;height:496px'), { w: 744, h: 496 });
    const cap = col(G.x[3], 256, G.col, `<p class="c-label c-ink">A3 sheet</p><p class="c-cap c-quiet" style="margin-top:4px">The front of an A3 sheet, folded once on the counter. Nameplate, one story, the list in the fourth column.</p>`, { rule: true });
    // two figures, each drawn at its own size and shown at a fraction of it, with a hairline edge; they stand on one baseline and share a caption line
    const fig = (x, y, iw, ih, k, inner) => `<div class="a fig" style="left:${px(x)};top:${px(y)};width:${px(iw * k)};height:${px(ih * k)}"><div class="fig-in" style="width:${iw}px;height:${ih}px;transform:scale(${k})"><!--art-->${inner}<!--/art--></div></div>`;
    const BASE = 1479, YC = 1495, kp = 0.76, kq = 0.474;
    const phone = fig(G.left, BASE - 844 * kp, 390, 844, kp, phoneArt(ctx));
    const post = fig(G.right - 1080 * kq, BASE - 1350 * kq, 1080, 1350, kq, postArt(ctx));
    const caps = col(G.left, YC, G.col, `<p class="c-label c-ink">Phone <span class="c-mono">390 × 844</span></p><p class="c-cap c-quiet">The list, one action.</p>`)
      + col(G.right - 1080 * kq, YC, 400, `<p class="c-label c-ink">Post <span class="c-mono">1080 × 1350</span></p><p class="c-cap c-quiet">One line on the action colour.</p>`);
    // the lines the figures and the photographed sheet print: the sheet's story and the post's line
    return page(ctx, 'layouts', folio(ctx, 'layouts') + head + photo + cap + phone + post + caps, [sheetLine(ctx), postLine(ctx)]);
  },

  // ---- applications (round 1 uses the business-card id): the shop fascia and the paper bag, both clean photographs ----
  'business-card': (ctx) => {
    const B = ctx.brand, L = ctx.logo, S = ctx.roles.light, cws = B.logo.colourways;
    const line = signLine(ctx), ah = appsHead(ctx, introQuote(ctx).q), hd = ah || balance2(ctx, shopHead(ctx), { w: 1000, max: 64, min: 48 });
    const head = E(G.left, G.top, 'story', headLines(hd.lines, hd.size, Math.round(hd.size * 68 / 64)), { w: 1000 });
    // a one-line headline leaves a line's height less above the photographs: both rows move up by it, and the bag photograph grows by it so it still stands on y 1480
    const dy = hd.lines.length < 2 ? Math.round(hd.size * 68 / 64) : 0, Y1 = 296 - dy, Y2 = 840 - dy, BH = 640 + dy;

    // photo 1: the fascia, art drawn at the scene's own proportion (1 px = 5 mm)
    const fq = ctx.sceneInfo('counter-fascia-opening'), fa = fq.quads[fq.surfaces.indexOf('fascia')].aspect, FH = 200, FW = Math.round(FH * fa);
    const lw = fitLogo(ctx, 'horizontal', 380, 104), lh = lw * L.geos.horizontal.h / L.geos.horizontal.w;
    let fs = 28; while (fs > 20 && measureBody(ctx, line, fs, 500) > 440) fs -= 2;
    const fascia = `<i class="ar-fill" style="background:${S.surface}"></i>`
      + E(64, 100 - lh / 2, 'ar-logo', L.html('horizontal', { width: lw, colourway: 'colour', label: 'Logo' }), { w: lw, h: lh })
      + E(FW - 64 - 440, 100 - 18, 'ar-line', A(line), { w: 440, style: `font-size:${fs}px;line-height:36px;text-align:right;color:${S.text}` });
    const urlF = ctx.mockup('counter-fascia-opening', { fascia: { html: ctx.artPage(fascia, { w: FW, h: FH }), w: FW, h: FH } });
    const ground = (ctx.colours.find((c) => c.hex.toLowerCase() === S.surface.toLowerCase()) || {}).name;
    const cap1 = col(G.x[3], Y1, G.col, `<p class="c-label c-ink">Shop fascia</p><p class="c-cap c-quiet" style="margin-top:4px">${A(L.labels.horizontal)} logo in full colour on ${ground ? A(ground) : 'the ground'}. The brand line at the right.</p><p class="c-cap c-quiet" style="margin-top:4px">Drawn at <span class="c-mono c-ink">${FW * 5} × ${FH * 5}</span> mm.</p>`);

    // photo 2: the bag, one ink as a bag is printed, cropped to 488 : 512 around the bag
    const cw = cws['mono-dark'] ? 'mono-dark' : 'colour', K = cws[cw];
    const bq = ctx.sceneInfo('counter-bag-handover'), bw = 418, bh = Math.round(bw / bq.quads[bq.surfaces.indexOf('bag-front')].aspect);
    const sv = L.geos.stacked ? 'stacked' : 'colour', sw = fitLogo(ctx, sv, 260, 160), sh = sw * L.geos[sv].h / L.geos[sv].w;
    // the bag prints a brand line the fascia and the post do not carry (and not the headline above, when that is a brand line)
    const bagLine = [B.lines.primary, ...B.lines.others].find((l) => l !== line && l !== postLine(ctx) && (ah || l !== shopHead(ctx))) || B.lines.primary;
    const pl = fitLines(ctx, bagLine, { w: 340, max: 32, min: 24, maxLines: 3 });
    const bag = `<i class="ar-fill" style="background:${K.ground}"></i>`
      + E(bw / 2 - sw / 2, 64, 'ar-logo', L.html(sv, { width: sw, colourway: cw, label: 'Logo' }), { w: sw, h: sh })
      + E(bw / 2 - 170, 300, 'ar-pline', pl.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: 340, style: `font-size:${pl.size}px;line-height:36px;text-align:center;color:${K.name}` })
      + E(0, 436, 'ar-addr', A(B.applications.site.url), { w: bw, style: `text-align:center;color:${K.name}` });
    const urlB = ctx.mockup('counter-bag-handover', { 'bag-front': { html: ctx.artPage(bag, { w: bw, h: bh }), w: bw, h: bh } });
    // the bag photograph, 744 x BH like the fascia's, scaled so its height fills the box and shifted so the bag's label sits in the middle
    const kb = BH / bq.h, mid = bq.quads[0].corners.reduce((a, c) => a + c[0], 0) / 4, x0 = Math.max(0, Math.min(bq.w * kb - 744, mid * kb - 372));
    const photo = (x, y, w, h, url, alt, inner = plateImg(A(url), A(alt), `width:${w}px;height:${h}px`)) => E(x, y, 'ph', inner, { w, h });
    const p1 = photo(G.left, Y1, 744, 496, urlF, `${B.name} shop fascia over a brick shopfront`);
    const p2 = photo(G.left, Y2, 744, BH, urlB, `${B.name} paper bag handed across a counter`, plateImg(A(urlB), `${A(B.name)} paper bag handed across a counter`, `position:absolute;left:${px(-x0)};top:0;height:${BH}px;width:${px(bq.w * kb)};max-width:none`));
    const cap2 = col(G.x[3], Y2, G.col, `<p class="c-label c-ink">Paper bag</p><p class="c-cap c-quiet" style="margin-top:4px">${A(B.logo.when[cw])}</p>${jump(ctx, 'social', 'Social posts')}`);
    // the contact box stands on the bag photograph's bottom edge (y 1480), in the fourth column
    const cd = B.applications.card, ct = B.contact;
    const contact = `<div class="a colm" style="left:${px(G.x[3])};bottom:${1587 - 1480}px;width:${G.col}px"><i class="hr-flow"></i><p class="c-label c-ink" style="margin-top:8px">Contact</p>`
      + `<p class="c-note c-ink" style="margin-top:8px">${A(cd.person)}</p><p class="c-cap c-quiet">${A(cd.role)}</p><p class="c-mono" style="margin-top:4px">${A(cd.contact)}</p><p class="c-mono">${A(B.applications.site.url)}</p>`
      + `<p class="c-cap c-quiet" style="margin-top:16px">${A(ct.owner)}</p><p class="c-mono">${A(ct.email)}</p></div>`;
    return page(ctx, 'business-card', folio(ctx, 'business-card') + head + p1 + cap1 + p2 + cap2 + contact + hr(817.5, Y1, .75, 496, 'hair') + hr(817.5, Y2, .75, BH, 'hair'), [line, bagLine]);
  },
};
