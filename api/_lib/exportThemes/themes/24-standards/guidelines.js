// Guidelines pages for theme 24 (Standards), round 1: the six gate pages (cover, personality, palette, typefaces, business-card as the applications page, digital).
// Absolute layout on a 1123 x 794 page: field divs and text blocks at the spec's coordinates, one full-page svg overlay for the ruler, dimension lines and display type.
import { ratio } from '../../engine/color.js';
import { A, G, f2, pad3, xOf, fx, posX, half, roles, adv, wrap, displayFont, outline, capHeight, loadFont, blk, fill, stxt, dimH, dimV, cropTicks, ruler, tab, head, page, colourwayFor, dateLong, span } from './helpers.js';

import { applications } from './applications.js';
import { libScene } from './scene-pick.js';

export const guidelines = {
  // ---- page 5: applications (in the page list as business-card) ----
  'business-card': applications,

  // ---- page 1: the cover. The whole page is the field; the logo is the hero and the ruler lights up its width ----
  cover(ctx) {
    const R = roles(ctx), B = ctx.brand, x = xOf(ctx), geo = ctx.logo.geos.colour, slot = ctx.edition === 'slot';
    let LW = 832, LH = (LW * geo.h) / geo.w;
    if (LH > 224) { LH = 224; LW = (LH * geo.w) / geo.h; }
    const bottom = 642, top = f2(bottom - LH), dimY = Math.max(140, Math.round(top - 27));
    const cw = colourwayFor(ctx, R.field);
    const logo = slot
      ? `<div class="slot-box c-micro" style="width:${f2(LW)}px;height:${f2(LH)}px;color:${R.fieldInk}">Logo, ${fx(ctx, LW)} wide</div>`
      : `<div class="logo-box">${ctx.logo.svg('colour', { colourway: cw, width: f2(LW) })}</div>`;
    const idx = ctx.sections.map((s) => {
      const ty = G.top + (s.n - 1) * G.tabPitch;
      return blk(900, ty + 4, 183, 16, 'idx', `<span class="c-head">${A(s.title)}</span><span class="c-micro">${pad3(s.pages[0].no)}</span>`, `display:flex;justify-content:space-between;color:${R.fieldInk}`);
    }).join('');
    const tabs = ctx.sections.map((s) => tab(ctx, s.n)).join('');
    const body = fill(0, 0, ctx.size.w, ctx.size.h, R.field)
      + blk(56, 48, 400, 24, 'c-title', 'Brand standards', `color:${R.fieldInk}`, 'h1')
      + blk(56, 76, 400, 40, 'c-body', `${A(B.name)}, version ${A(B.version.number)}. ${A(dateLong(B.version.date))}.`, `color:${R.fieldInk}`, 'p')
      + idx + tabs
      + blk(56, top, LW, LH, '', logo, `color:${R.fieldInk}`)
      + blk(56, 676, 440, 40, 'c-body', `Every size in this manual is given in x. One x is ${x} px on screen, the step of the spacing scale.`, `color:${R.fieldInk}`, 'p');
    const svg = dimH(ctx, { x1: 56, x2: 56 + LW, y: dimY, label: fx(ctx, LW), col: R.fieldInk, qcol: R.fieldQuiet, obj: +top })
      + dimV(ctx, { x: 40, y1: +top, y2: bottom, label: fx(ctx, LH), col: R.fieldInk, qcol: R.fieldQuiet, obj: 56 })
      + ruler(ctx, { uid: 'cover', pieces: [{ x1: G.L, x2: G.R, ink: R.fieldInk, quiet: R.fieldQuiet, hair: R.fieldQuiet }], live: [56, 56 + LW] });
    return page(ctx, 'cover', { bg: R.field, body, svg, cls: 'pg--cover' });
  },

  // ---- page 2: personality. A dark field carries the primary line, measured; the traits sit on the ground ----
  personality(ctx) {
    const R = roles(ctx), B = ctx.brand, p = ctx.pages.find((q) => q.id === 'personality');
    const line = B.lines.primary, dw = B.fonts.display.weights[B.fonts.display.weights.length - 1], font = displayFont(ctx, dw);
    // one sentence: the largest of 120, 104, 88, 72 px that sets in at most 3 lines inside 448 px (the field is 560 wide).
    // Several sentences: each keeps its own line (never a break inside a sentence) at the largest size that leaves the traits a 296 px column;
    // the field widens to the hero (56 in, 40 of air) and the traits stack their name over their text.
    const slot = ctx.edition === 'slot';   // slot: the line is one placeholder, set at 72 px on one line
    const sents = line.split(/(?<=[.!?])\s+/), multi = !slot && sents.length > 1, sw = (t, s) => outline(font, t, s, 0).x2;
    let FW = 560, size = 72, lines = wrap(font, line, 72, 448);
    if (multi) {
      for (const s of [120, 104, 88, 80, 72, 64, 56, 52, 48, 44, 40]) {
        const fw = Math.max(560, Math.ceil(56 + Math.max(...sents.map((t) => sw(t, s))) + 40));
        if (sents.length <= 3 && 1064 - (fw + 12) >= 296) { size = s; lines = sents; FW = fw; break; }
      }
    } else {
      for (const s of (slot ? [72] : [120, 104, 88, 72])) { const l = wrap(font, line, s, 448); if (l.length <= 3) { size = s; lines = l; break; } }
    }
    const CX = FW + 12, CW = 1064 - CX, stack = CW < 400;
    const cap = capHeight(font, size), capTop = 300, lead = size * (multi ? 1.1 : 0.92);
    const outl = lines.map((t) => outline(font, t, size, 0));
    const widest = Math.max(...outl.map((o) => o.x2));
    const dtext = lines.map((t, i) => stxt(56, capTop + cap + i * lead, t, { col: R.darkInk, w: dw, size, style: 'font-family:var(--display)' })).join('');
    const l1 = outl[0].x2, wide1 = l1 > 470;
    const pieces = [{ x1: 56, x2: FW - 12, ink: R.darkInk, quiet: R.darkQuiet, hair: R.darkQuiet }, { x1: CX, x2: 1064, ink: R.ink, quiet: R.quiet, hair: R.hair }];
    // the second line at 32 px (24 on a wide field, where the hero already leads), or smaller if a wide display face would run out of the field
    const ow = B.fonts.display.weights[0], other = B.lines.others[0] || '';
    const oRoom = FW - 112, oBase = multi ? 24 : 32;
    const otherSize = other ? Math.min(oBase, Math.floor((oBase * oRoom * 0.98) / adv(displayFont(ctx, ow), other, oBase))) : oBase;
    // the traits use the display weight nearest 600 (a face with one heavy weight has no 600 to ask for)
    const tw = B.fonts.display.weights.reduce((b, w) => (Math.abs(w - 600) < Math.abs(b - 600) ? w : b));
    const TT = slot ? ' ph-tight' : '', TF = (s) => (slot ? 'font-size:13px;line-height:20px' : `font-size:${s}px;line-height:32px`);   // slot: compact placeholders, set small so they fit the rows
    const trait = (t, i) => {
      if (stack) {
        const y = 264 + i * 136;
        return fill(CX, y, CW, 1, R.hair)
          + blk(CX, y + 14, CW, 32, 'disp' + TT, A(t.trait), `${TF(28)};font-weight:${tw};color:${R.ink}`, 'h3')
          + blk(CX, y + 54, CW, 80, 'c-body lands' + TT, A(t.means), `color:${R.ink}`, 'p');
      }
      const y = 430 + i * 92;
      return fill(CX, y, 492, 1, R.hair)
        + blk(CX, y + 14, 168, 64, 'disp' + TT, A(t.trait), `${TF(24)};font-weight:${tw};color:${R.ink}`, 'h3')
        + blk(CX + 172, y + 16, 320, 60, 'c-body' + TT, A(t.means), `color:${R.ink}`, 'p');
    };
    const body = fill(0, 0, FW, ctx.size.h, R.dark)
      + head(ctx, 'personality', [
        { x1: 56, x2: FW - 56, col: R.darkInk, slots: [[56, `${B.name} brand standards`], [314, `${p.section.n} ${p.section.title}`]] },
        { x1: CX, x2: 1064, col: R.ink, slots: [[CX, p.title]] }])
      + blk(CX, 88, CW, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(CX, 120, stack ? CW : 380, 60, 'c-body', 'Three traits, and what each one asks of a message, a sign or a screen.', `color:${R.quiet}`, 'p')
      + (B.lines.others[0] ? blk(56, 640, oRoom, 32, 'disp nw', A(B.lines.others[0]), `font-size:${otherSize}px;line-height:32px;font-weight:${ow};color:${R.darkInk}`, 'p') : '')
      + B.personality.slice(0, 3).map(trait).join('')
      + tab(ctx, p.section.n);
    // the cap-height dimension sits just past the first line (24 px off it on a wide field), its label centred on the line
    const svg = dtext
      + dimV(ctx, { x: multi ? Math.round(56 + l1 + 24) : 520, y1: capTop, y2: capTop + cap, label: fx(ctx, cap), col: R.darkInk, qcol: R.darkQuiet, obj: 56 + l1, right: wide1 || multi })
      + ruler(ctx, { uid: 'pers', pieces, live: [56, 56 + widest] });
    return page(ctx, 'personality', { bg: R.ground, body, svg });
  },

  // ---- page 3: palette. Each colour is a column as wide as its share of a page; the ruler lights up the ground's share ----
  palette(ctx) {
    const R = roles(ctx), B = ctx.brand, p = ctx.pages.find((q) => q.id === 'palette'), W = ctx.size.w;
    const cols = columns(ctx);
    const gcol = cols[0], dkIdx = cols.findIndex((c) => c.hex.toLowerCase() === R.dark.toLowerCase());
    const tabInv = dkIdx === cols.length - 1;
    let body = '', svg = '';
    const pieces = [];
    // a column too narrow for its own label block (name, hex, role) keeps its true width: the block sits on the widest column before it and a leader line runs across to it
    const f600 = loadFont('PublicSans-600'), NARROW = 64, narrow = cols.filter((c, i) => i && c.w < NARROW);
    const host = [...cols].reverse().find((c) => c.x < (narrow[0]?.x ?? 0) && c.w >= 160);
    let leaders = '', lead = 192;
    cols.forEach((c, i) => {
      const ink = R.inkOn(c.hex), q = R.quietOn(c.hex), x0 = c.x, bx = i === 0 ? G.L : x0 + (c.w < 80 ? 8 : 12), isN = host && narrow.includes(c), tc = isN ? R.inkOn(host.hex) : ink;
      body += fill(x0, 0, c.w, ctx.size.h, c.hex, i && ratioOf(c.hex, R.ground) < 1.1 ? `box-shadow:inset 1px 0 0 ${R.hair}` : '');
      // the share, on one line at y 176 across the full drawn width of its own column; the label sits in the line when it fits, else in the label block
      const lab = `${Math.round(c.share * 100)}%`, ltw = adv(f600, lab, 12), inline = c.w >= ltw + 12 + 14;
      const nm = `<div class="vn" style="color:${tc}">${A(c.name)}</div><div class="val" style="color:${tc}">${A(c.hex)}</div><div class="c-head" style="color:${tc}">${A(cap1(c.role))}</div>${inline ? '' : `<div class="c-head" style="color:${tc};font-weight:600">${lab} of the page</div>`}`;
      if (isN) {
        const bw = Math.ceil(Math.max(adv(f600, c.name, 13), c.hex.length * 7.2, adv(f600, cap1(c.role), 12), inline ? 0 : adv(f600, `${lab} of the page`, 12))) + 4;
        const bxl = host.x + host.w - 24 - 96, bh = inline ? 52 : 68, ly = lead + 8, tx = c.x + c.w / 2;
        lead += bh + 24;
        body += blk(bxl, ly - 8, bw, bh, 'val-blk', nm);
        // the leader: from the block to the middle of its own column, each stretch in the ink of the column it crosses, ending in a 3 px dot
        let from = bxl + bw + 8;
        for (const k of cols.filter((k) => k.x + k.w > from && k.x <= tx)) { const to = k === c ? tx : k.x + k.w, kc = R.inkOn(k.hex); if (to > from) leaders += `<path d="M${f2(from)} ${ly + 0.5}H${f2(to)}" stroke="${kc}" stroke-width="1" fill="none"/>`; from = to; }
        leaders += `<circle cx="${f2(tx)}" cy="${ly + 0.5}" r="3" fill="${ink}"/>`;
      } else body += blk(bx, 88, c.w - (bx - x0) - 4, 56, 'val-blk', nm);
      svg += dimH(ctx, { x1: i === 0 ? Math.max(x0, 16) : x0, x2: x0 + c.w, y: 176, label: inline ? lab : '', col: ink, qcol: q, outside: !inline }).replace(/<text[^>]*><\/text>/, ''); // no label (the share is in the block): no empty text node
      if (x0 < G.R && x0 + c.w > G.L) pieces.push({ x1: Math.max(G.L, x0), x2: Math.min(G.R, x0 + c.w), ink, quiet: q, hair: q });
    });
    svg += leaders;
    const rows = cols.filter((c) => c.lands), many = rows.length > 5, shown = many ? rows.slice(0, 5) : rows;
    const table = shown.map((c, i) => {
      const y = 440 + i * 48;
      return fill(56, y, 500, 1, R.hair) + blk(56, y + 4, 112, 20, 'c-name nw', A(c.name), `color:${R.ink}`) + blk(172, y + 4, 384, 40, 'c-body lands', A(c.lands), `color:${R.quiet}`);
    }).join('') + (many ? (() => { const y = 440 + 5 * 48; return fill(56, y, 500, 1, R.hair) + blk(56, y + 4, 500, 20, 'c-body', `and ${rows.length - 5} more, page ${pad3(ctx.pageNo('colour-values'))}`, `color:${R.quiet}`); })() : '');
    const nWord = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][cols.length] || String(cols.length);
    body += head(ctx, 'palette', [{ x1: G.L, x2: gcol.x + gcol.w - 24, col: R.ink, slots: [[G.col[0], `${p.section.n} ${p.section.title}`], [G.col[3], p.title]] }])
      + blk(56, 300, 360, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 336, 360, 60, 'c-body', `${nWord} colours, each drawn at the share of a page it takes. Most of every page is ${A(gcol.name)}.`, `color:${R.quiet}`, 'p')
      + table + tab(ctx, p.section.n, { inverted: tabInv });
    svg += ruler(ctx, { uid: 'pal', pieces, live: [G.L, gcol.x + gcol.w], endAnchor: cols.length > 1 });
    return page(ctx, 'palette', { bg: R.ground, body, svg });
  },

  // ---- page 4: typefaces. One specimen at extreme scale, measured: cap height 64x, with the four guide lines named ----
  typefaces(ctx) {
    const R = roles(ctx), B = ctx.brand, p = ctx.pages.find((q) => q.id === 'typefaces'), x = xOf(ctx);
    const dws = B.fonts.display.weights, dw = dws[dws.length - 1], font = displayFont(ctx, dw);
    const baseY = 560, want = 64 * x;
    let size = want / capHeight(font, 1);
    let o = outline(font, 'Ag', size, 0);
    // the guide names sit at the right end of the guide lines (x 720), so the specimen stops short of the widest name
    const maxW = 720 - 8 - Math.max(...['Cap height', 'x-height', 'Baseline', 'Descender'].map((n) => adv(loadFont('PublicSans-400'), n, 11))) - 142;
    if (o.x2 - o.x1 > maxW) { size *= maxW / (o.x2 - o.x1); o = outline(font, 'Ag', size, 0); }
    const cap = capHeight(font, size), xh = (font.tables.os2.sxHeight / font.unitsPerEm) * size, desc = outline(font, 'g', size, 0).y2;
    const left = 142, inkL = left, inkR = left + (o.x2 - o.x1);
    const guide = (dy, name) => fill(90, baseY + dy, 630, 1, R.hair) + blk(520, baseY + dy - 20, 200, 16, 'c-micro nw', name, `text-align:right;color:${R.quiet}`);
    const guides = guide(-Math.round(cap), 'Cap height') + guide(-Math.round(xh), 'x-height') + guide(0, 'Baseline') + guide(Math.round(desc), 'Descender');
    const names = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra Bold' };
    const words = (f, ws, fam, sz, lh) => ws.map((w) => `<span style="font-family:${fam};font-weight:${w};font-size:${sz}px;line-height:${lh}px">${names[w] || w}</span>`).join(' ');
    const allFree = [B.fonts.display, B.fonts.body, B.fonts.mono].every((f) => f.css);
    const lic = (f) => (allFree ? '' : f.css ? 'SIL Open Font Licence. Free in print and on screen.' : 'Licence: see the foundry.');
    const block = (y, label, f, ws, fam, nameW, nameSz, nameLh, wSz, wLh) => blk(744, y, 320, 140, '',
      `<div class="c-micro" style="color:${R.quiet}">${label}</div><div style="font-family:${fam};font-weight:${nameW};font-size:${nameSz}px;line-height:${nameLh}px;margin-top:4px;color:${R.ink}">${A(f.family)}</div>`
      + `<div style="margin-top:8px;color:${R.ink};display:flex;gap:12px;white-space:nowrap">${words(f, ws, fam, wSz, wLh)}</div>${lic(f) ? `<div class="c-micro" style="margin-top:8px;color:${R.quiet}">${lic(f)}</div>` : ''}`);
    const bf = B.fonts.body, mono = B.fonts.mono;
    const body = head(ctx, 'typefaces')
      + blk(744, 88, 320, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(744, 120, 320, 60, 'c-body', `Two faces do the work: ${A(B.fonts.display.family)} for the line you read first, ${A(bf.family)} for everything after it. A third, mono, sets values.`, `color:${R.quiet}`, 'p')
      + guides
      + block(300, 'Display', B.fonts.display, dws, 'var(--display)', dw, 40, 44, 28, 32)
      + block(470, 'Body', bf, bf.weights, 'var(--body)', bf.weights[0], 40, 44, 22, 28)
      + blk(744, 650, 320, 40, 'c-body', `Mono, for a hex, a token or a code string:<br><span class="val" style="font-size:12px">${A(mono.family)}</span>`, `color:${R.ink}`, 'p')
      + (allFree ? blk(744, 698, 320, 16, 'c-micro', 'SIL Open Font Licence. All three faces, print and screen.', `color:${R.quiet}`) : '')
      + tab(ctx, p.section.n);
    const a = (v) => Math.round(v);
    const svg = `<path d="${o.d}" fill="${R.ink}" transform="translate(${f2(left - o.x1)} ${baseY})"/>`
      + dimV(ctx, { x: 96, y1: baseY - a(xh), y2: baseY, label: fx(ctx, xh), col: R.ink, qcol: R.quiet, obj: left, labelAt: 90 })
      + dimV(ctx, { x: 128, y1: baseY - a(cap), y2: baseY, label: fx(ctx, cap), col: R.ink, qcol: R.quiet, obj: left, labelAt: 122, labelY: baseY - a(cap) + 24 })
      + dimV(ctx, { x: 128, y1: baseY, y2: baseY + a(desc), label: fx(ctx, desc), col: R.ink, qcol: R.quiet, obj: left, labelAt: 122 })
      + ruler(ctx, { uid: 'tf', live: [inkL, inkR] });
    return page(ctx, 'typefaces', { bg: R.ground, body, svg });
  },

  // ---- page 6: digital. The phone screen at 390 px, drawn at 2/3 with dimensions in x, beside the same screen in a hand ----
  digital(ctx) {
    const R = roles(ctx), B = ctx.brand, p = ctx.pages.find((q) => q.id === 'digital'), x = xOf(ctx);
    const k = 563 / 844, sy = (t) => 120 + t * k, SX = 372;
    const phoneArt = { html: ctx.artPage(phoneShot(ctx), { w: 390, h: 844 }), w: 390, h: 844 };
    const pScene = libScene(B.applications.scenes && B.applications.scenes.phone) || 'kerb-crossing-phone';
    const url = ctx.mockup(pScene, { 'screen-phone': phoneArt }, { shade: 0.5 });
    const sc = ctx.sceneInfo(pScene), cs = sc.quads[0].corners;
    const cx = cs.reduce((a, q) => a + q[0], 0) / cs.length, cy = cs.reduce((a, q) => a + q[1], 0) / cs.length;
    const s = Math.max(406 / sc.w, 626 / sc.h), iw = sc.w * s, ih = sc.h * s;
    const ox = Math.min(Math.max(cx * s - 203, 0), iw - 406), oy = Math.min(Math.max(cy * s - 313, 0), ih - 626);
    const photo = `<div class="a" style="left:658px;top:88px;width:406px;height:626px;overflow:hidden"><img src="${A(url)}" alt="${A(B.name)} app on a phone, at a crossing" style="position:absolute;left:${f2(-ox)}px;top:${f2(-oy)}px;width:${f2(iw)}px;height:${f2(ih)}px;max-width:none"></div>`;
    const rowsT = [['Top bar', PH.top], ['Answer block', PH.answer], ['Row', PH.row], ['Button', PH.btn], ['Side margin', PH.margin]];
    const TY = 683 - rowsT.length * 32;
    const table = rowsT.map(([n, px], i) => fill(56, TY + i * 32, 226, 1, R.hair) + blk(56, TY + i * 32 + 6, 226, 20, 'c-body trow', `<span>${n}</span><span>${px} px <span style="color:${R.quiet}">${fx(ctx, px)}</span></span>`, `color:${R.ink}`)).join('')
      + fill(56, 683, 226, 1, R.hair);
    const screen = `<div class="a" style="left:${SX}px;top:120px;width:260px;height:563px;overflow:hidden;background:var(--ground)"><div style="width:390px;height:844px;transform:scale(${f2(2 / 3)});transform-origin:0 0">${phone(ctx)}</div></div>`
      + fill(SX, 120, 260, 563, 'transparent', `border:1px solid ${R.hair}`);
    const body = head(ctx, 'digital')
      + blk(56, 88, 226, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 226, 100, 'c-body', `The app at 390 px. Every height is a whole number of x, so rows, buttons and gaps keep to the ${x} px step.`, `color:${R.quiet}`, 'p')
      + table + screen + photo + tab(ctx, p.section.n);
    const seg = (a, b) => dimV(ctx, { x: 352, y1: sy(a), y2: sy(b), label: fx(ctx, b - a), col: R.ink, qcol: R.quiet, obj: SX, labelAt: 346 });
    const svg = cropTicks(SX, 120, 260, 563, R.ink)
      + dimH(ctx, { x1: SX, x2: SX + 260, y: 104, label: '390 px', col: R.ink, qcol: R.quiet, obj: 120 })
      + seg(0, PH.top) + seg(PH.top, PH.top + PH.answer) + seg(PH.top + PH.answer, PH.top + PH.answer + PH.row) + seg(PH.top + PH.answer + PH.row, PH.top + PH.answer + 2 * PH.row) + seg(844 - PH.margin - PH.btn, 844 - PH.margin)
      + ruler(ctx, { uid: 'dig', live: [SX, SX + 260] });
    return page(ctx, 'digital', { bg: R.ground, body, svg });
  },
};

// the phone screen, built from the brand's screen content with fixed heights (px, all whole x): top bar 56, answer block 176, rows 72, button 44, side margin 16
const PH = { top: 56, answer: 176, row: 72, btn: 44, margin: 16 };
function phone(ctx, h = 844, lift = 0) {
  const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui;
  return `<div class="ui ph" style="height:${h}px"><div class="ph-top"><span>${ctx.logo.html('horizontal', { width: 112, label: 'Logo' })}</span><span class="ph-time">${A(S.time)}</span></div>`
    + `<div class="ph-ans"><div class="ph-line">${ui.statusChip(S.deliveries[0].status, { label: S.status })}<span class="ph-ft">${A(S.from)} to ${A(S.to)}</span></div><h2 class="ui-display ph-eta">${A(S.eta)}</h2><p class="ph-note">${A(S.pickup)}</p></div>`
    + `${ui.deliveryRows(5)}<div class="ph-btn"${lift ? ` style="bottom:${lift}px"` : ''}>${ui.btn(S.form.book, { block: true })}</div></div>`;
}

// the screen as photographed: a 24 px status row above the app (so the logo clears the rounded corner), the button lifted off the bottom bezel, and a flat 6% black wedge of glare on the glass
function phoneShot(ctx) {
  const t = '9:41', bars = [4, 7, 10, 13].map((hh, i) => `<rect x="${i * 5}" y="${13 - hh}" width="3" height="${hh}" rx="0.5" fill="currentColor"/>`).join('');
  return `<div class="ui" style="position:relative;width:390px;height:844px;overflow:hidden"><div style="display:flex;justify-content:space-between;align-items:center;height:24px;padding:0 32px;box-sizing:border-box;font-size:12px;line-height:16px;font-weight:600;color:var(--text)"><span>${t}</span>`
    + `<svg width="44" height="13" viewBox="0 0 44 13" aria-hidden="true"><g>${bars}</g><rect x="26.5" y="1.5" width="16" height="10" rx="2.5" fill="none" stroke="currentColor"/><rect x="28" y="3" width="10" height="7" rx="1.2" fill="currentColor"/></svg></div>`
    + `<div style="position:absolute;left:0;top:24px;width:390px;height:820px;overflow:hidden">${phone(ctx, 820, 48)}</div>`
    + `<svg style="position:absolute;left:0;top:0" width="390" height="844" viewBox="0 0 390 844" aria-hidden="true"><polygon points="0,0 250,0 0,330" fill="#000" opacity="0.06"/></svg></div>`;
}
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ratioOf = ratio;
// column widths (page 3): ground first, the rest by share descending; each drawn at its true share of the page width (rounded to a px), remainder to the ground. No minimum width: a column too narrow for its label gets a leader line instead.
function columns(ctx) {
  const W = ctx.size.w, all = ctx.brand.colours;
  const ground = all.find((c) => c.role === 'ground') || all[0];
  const rest = all.filter((c) => c !== ground);
  const hasShare = all.every((c) => c.share > 0);
  const sum = all.reduce((a, c) => a + (c.share || 0), 0);
  const list = [ground, ...rest.sort((a, b) => (b.share || 0) - (a.share || 0))].map((c) => ({ ...c, share: hasShare ? c.share / sum : c === ground ? 0.5 : 0.5 / rest.length }));
  const w = list.map((c) => c.share * W);
  const out = w.map((v, i) => (i === 0 ? 0 : Math.round(v)));
  out[0] = W - out.slice(1).reduce((a, b) => a + b, 0);
  let x = 0; return list.map((c, i) => { const r = { ...c, x, w: out[i] }; x += out[i]; return r; });
}
