// Theme 33, Flyleaf, slice 4b (the Circular pass): the mockup pages 24 Compositions, 26 Digital, 27 Print and 28 Social at 16:9 (A4 portrait keeps the as-built page until slice 5).
// Mockups on (the showcase): the page art is warped into the measured areas of the photographs (mockups.js) and lit by the photo's own light layers; page 28 draws four phones
// (no phone photograph has four screens, so they are drawn devices with a glass glare). Mockups off (every real export, and --showcase --no-mockups): the same art laid flat on Graphite.
// Every spec number is scaled by 2/3.
import {
  tones, geo, own, at, hr, mono, page, bare, textCol, groundsOf, n1,
} from './kit.js';
import { mockupsOn } from './kit.js';
import { guidelines as A } from './brand-a.js';
import { darkest, pic } from './brand-s2.js';
import { headOn } from './brand-s3.js';
import { photo } from './photos.js';
import { warp, areaOnPage, flat } from './mockups.js';
import { isShowcase } from './showcase.js';
import {
  coverArt, posterArt, bookmarkArt, webArt, phoneArt, letterArt, cardArt, storyArt,
} from './art.js';

const wide = (id, fn) => (ctx) => (geo(ctx).portrait ? A[id](ctx) : fn(ctx));
const SX = 427;
// the photographs' own ground where the running head and text sit on them (mean of the photo's quiet region)
const TONE = { flatlay: '#c6b7a8', laptop: '#2a251f', stationery: '#6b6b6b' };
const specRows = (x, y, w, rows, rowH = 28) => rows.map(([a, v], i) => hr(x, y + i * rowH, w) + at(x, y + i * rowH + 7, w, 14, `<span class="m">${a}</span><span class="m i" style="float:right">${v}</span>`)).join('');
const cap = (x, y, w, a, b) => at(x, y, w, 30, `<div class="m i">${a}</div>${b ? `<div class="m">${b}</div>` : ''}`);

export const guidelines = {
  // 5.2 Compositions (Liberty 06): IMG-05 at full bleed, the cover, the poster and the bookmark warped into the book, the sheet and the bookmark.
  compositions: wide('compositions', (ctx) => {
    const K = geo(ctx), line = 'The cover, a poster and a bookmark, set from the brand colours, type and photographs.';
    if (mockupsOn(ctx)) {
      const fr = { left: 0, top: 0, w: K.W, h: K.H, fx: 0.5, fy: 0.5 };
      const g = TONE.flatlay;
      const body = at(0, 0, K.W, K.H, photo(ctx, 'flatlay', { w: K.W, h: K.H, fx: 0.5, fy: 0.5, alt: 'A closed book, a bookmark and a sheet on a paper ground' }))
        + warp(ctx, 'IMG-05', 'sheet', fr, posterArt(ctx)) + warp(ctx, 'IMG-05', 'book', fr, coverArt(ctx)) + warp(ctx, 'IMG-05', 'bookmark', fr, bookmarkArt(ctx))
        + headOn(ctx, 'compositions', [g, g, darkest(ctx), g]) + textCol(ctx, 'compositions', line);
      return bare(ctx, 'compositions', { ground: g, body });
    }
    const g = darkest(ctx), base = 600, gap = 36, items = [['Cover', coverArt(ctx), 210], ['Poster', posterArt(ctx), 346], ['Bookmark', bookmarkArt(ctx), 92]];
    let x = SX;
    const body = items.map(([n, art, w]) => { const f = flat(art, x, base - art.h * w / art.w, w); const out = f.html + cap(x, base + 10, w + 40, n); x += w + gap; return out; }).join('');
    return page(ctx, 'compositions', { ground: g, body: textCol(ctx, 'compositions', line) + body });
  }),

  // 6.1 Digital (Liberty 02, Horizon 07): IMG-06 at full bleed with the web page in the laptop, IMG-09 inset with the phone page in the phone.
  digital: wide('digital', (ctx) => {
    const K = geo(ctx), line = 'The web page and the phone page, built from the brand colour, type and photographs.';
    if (mockupsOn(ctx)) {
      const fr = { left: 0, top: 0, w: K.W, h: K.H, fx: 0.5, fy: 0.5 }, px = { left: 944, top: 150, w: 280, h: 520, fx: 0.53, fy: 0.5 };
      const g = TONE.laptop;
      const body = at(0, 0, K.W, K.H, photo(ctx, 'laptop', { w: K.W, h: K.H, fx: 0.5, fy: 0.5, alt: 'A laptop on a stone plinth' })) + warp(ctx, 'IMG-06', 'screen', fr, webArt(ctx), { glass: true })
        + at(px.left, px.top, px.w, px.h, photo(ctx, 'phone', { w: px.w, h: px.h, fx: px.fx, fy: px.fy, alt: 'A hand holding a phone' }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-09', 'screen', px, phoneArt(ctx), { glass: true })
        + headOn(ctx, 'digital', [g, g, g, g]) + textCol(ctx, 'digital', line);
      return bare(ctx, 'digital', { ground: g, body });
    }
    const g = darkest(ctx), web = webArt(ctx), ph = phoneArt(ctx), ww = 560, pw = 196, y = 124;
    const f1 = flat(web, SX, y, ww), f2 = flat(ph, SX + ww + 40, y, pw);
    const rows = specRows(SX, y + f1.h + 52, ww, [['Web layout', '1280 px wide, drawn at 44%'], ['Phone layout', '390 px wide, drawn at 50%'], ['Header', 'Mark, three links, the line, one button']]);
    const body = f1.html + f2.html + cap(SX, y + f1.h + 10, ww, 'Web page, 1280 px layout') + cap(SX + ww + 40, y + f2.h + 10, pw + 20, 'Phone, 390 px layout') + rows;
    return page(ctx, 'digital', { ground: g, body: textCol(ctx, 'digital', line) + body });
  }),

  // 6.2 Print (Minimalist 15): IMG-07 bleeds from x 512, the letterhead and the two card faces warped onto the sheet and the cards. The text column sits on the left on Oatmeal.
  print: wide('print', (ctx) => {
    const K = geo(ctx), G = groundsOf(ctx), line = 'A business card, front and back, and a letterhead, each at its true proportion. The contact lines are the owner\'s to write.';
    const rows = [['Card', '85 x 55 mm'], ['Letterhead', 'A4, 210 x 297 mm'], ['Card front', 'The mark and the line on the brand colour'], ['Card back', 'The name, the person and the contact lines']];
    if (mockupsOn(ctx)) {
      const fr = { left: 512, top: 0, w: 768, h: 720, fx: 0.5, fy: 0.5 }, s = ctx.roles.light.surface, gp = TONE.stationery;
      const body = at(fr.left, 0, fr.w, fr.h, photo(ctx, 'stationery', { w: fr.w, h: fr.h, fx: fr.fx, fy: fr.fy, alt: 'A letterhead and two business cards on a grey ground' }), { style: 'overflow:hidden' })
        + warp(ctx, 'IMG-07', 'sheet', fr, letterArt(ctx)) + warp(ctx, 'IMG-07', 'card-a', fr, cardArt(ctx, 'front')) + warp(ctx, 'IMG-07', 'card-b', fr, cardArt(ctx, 'back'))
        + headOn(ctx, 'print', [s, s, null, gp]) + textCol(ctx, 'print', line) + specRows(K.tx.x, K.y1 - 4 * 28, K.tx.w, rows.slice(0, 2));
      void G;
      return bare(ctx, 'print', { ground: s, body });
    }
    const g = darkest(ctx), sheet = letterArt(ctx), a = cardArt(ctx, 'front'), b = cardArt(ctx, 'back'), y = 124, sh = 500, sw = sh * sheet.w / sheet.h, cx = SX + sw + 40, cw = 320;
    const f0 = flat(sheet, SX, y, sw), f1 = flat(a, cx, y, cw), f2 = flat(b, cx, y + f1.h + 46, cw);
    const body = f0.html + f1.html + f2.html + cap(SX, y + f0.h + 10, sw, 'Letterhead', 'A4, 210 x 297 mm') + cap(cx, y + f1.h + 6, cw, 'Card, front', '85 x 55 mm') + cap(cx, y + f1.h + 46 + f2.h + 6, cw, 'Card, back', '85 x 55 mm');
    return page(ctx, 'print', { ground: g, body: textCol(ctx, 'print', line) + body });
  }),

  // 6.3 Social (Horizon 08, Liberty 05): four phones on Graphite, each with a story.
  social: wide('social', (ctx) => {
    const K = geo(ctx), g = darkest(ctx), line = 'Four stories: a photograph or a colour field, one line, the name.';
    const pw = 184, gap = 18, y = 132, on = mockupsOn(ctx), b = on ? 7 : 0, sw = pw - 2 * b, k = sw / 390, sh = 844 * k, ph = sh + 2 * b;
    const names = ['Plum', 'Oatmeal', 'Oatmeal', 'Plum'];
    const body = [0, 1, 2, 3].map((i) => {
      const x = SX - 1 + i * (pw + gap), art = storyArt(ctx, i);
      if (!on) return flat(art, x, y, pw).html + cap(x, y + 844 * pw / 390 + 10, pw + 10, `Story ${i + 1}`, names[i]);
      const t = ctx.colours;
      void t;
      const dev = at(x, y, pw, ph, '', { style: `background:#0e0e0f;border-radius:${n1(pw * 0.16)}px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),0 22px 34px -16px rgba(0,0,0,.7)` })
        + at(x - 1.5, y + ph * 0.2, 1.5, 22, '', { style: 'background:#2a2a2c;border-radius:1px' }) + at(x + pw, y + ph * 0.18, 1.5, 38, '', { style: 'background:#2a2a2c;border-radius:1px' })
        + `<div class="a" style="left:${n1(x + b)}px;top:${n1(y + b)}px;width:${n1(sw)}px;height:${n1(sh)}px;border-radius:${n1(pw * 0.16 - b)}px;overflow:hidden;isolation:isolate">`
        + `<div style="position:absolute;left:0;top:0;width:390px;height:844px;transform:scale(${n1(k * 1000) / 1000});transform-origin:0 0">${art.html}</div>`
        + at(sw * 0.5 - sw * 0.14, sw * 0.045, sw * 0.28, sw * 0.075, '', { style: `background:#0e0e0f;border-radius:${n1(sw * 0.04)}px` })
        + `<div class="a" style="left:0;top:0;width:100%;height:100%;mix-blend-mode:screen;background:linear-gradient(112deg,rgba(255,255,255,.13) 0,rgba(255,255,255,.04) 34%,rgba(255,255,255,0) 35%)"></div></div>`;
      return dev + cap(x, y + ph + 12, pw + 10, `Story ${i + 1}`, names[i]);
    }).join('');
    const rows = specRows(K.tx.x, K.y1 - 3 * 28, K.tx.w, [['Format', '9:16'], ['Field', 'Plum or Oatmeal'], ['Line', 'One, set large']]);
    return page(ctx, 'social', { ground: g, body: textCol(ctx, 'social', line) + body + rows });
  }),
};
void areaOnPage; void pic; void isShowcase; void tones; void own; void mono;
