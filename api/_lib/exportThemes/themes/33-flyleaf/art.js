// Theme 33, Flyleaf: the art for the mockup pages (24 Compositions, 26 Digital, 27 Print, 28 Social). Each piece is the brand's own page art at the real aspect of the
// thing it goes on (a pocket book cover, an A-series poster, a 16:10 web page, a 390 x 868 phone screen, an 85 x 55 card, an A4 letter, a story). The same pieces are
// warped into the photographs (mockups.js) when mockups are on, and laid flat on Graphite when they are off, so a download shows the user's own pages. Every piece is
// { html, w, h } drawn at its own size: warp or scale it, never redraw it. Colour, names and faces come from the engine; the showcase copy is Margin's (showcase.js).
import { tones, measure, own, realOf, at, field, groundsOf, n1 } from './kit.js';
import { ratio, readableOn } from '../../engine/color.js';
import { fieldHex, pic, darkest } from './brand-s2.js';
import { copy, isShowcase } from './showcase.js';

const D = (txt, size, { lh = 1.02, color = 'var(--ink)', style = '' } = {}) => `<div class="d" style="font-size:${n1(size)}px;line-height:${lh};letter-spacing:-0.02em;white-space:normal;color:${color};${style}">${txt}</div>`;
const mono = (txt, style = '') => `<div class="m" style="${style}">${txt}</div>`;
// the logo in the colourway the brand made for the ground (its own, else the reversed or light one on a dark ground)
function logoOn(ctx, kind, width, ground) {
  const cws = (ctx.brand.logo && ctx.brand.logo.colourways) || null;
  if (!cws) return ctx.logo.html(kind, { width, color: tones(ctx, ground).ink });
  const own = Object.keys(cws).find((k) => cws[k].ground && cws[k].ground.toLowerCase() === String(ground).toLowerCase());
  const dark = ratio(ground, '#ffffff') > ratio(ground, '#000000');
  const cw = own || (dark ? (cws.reversed ? 'reversed' : cws['mono-light'] ? 'mono-light' : 'colour') : 'colour');
  return ctx.logo.html(kind, { width, colourway: cw, color: cws[cw].name });
}
const logo = (ctx, kind, x, y, width, ground) => at(x, y, null, null, logoOn(ctx, kind, width, ground), { cls: 'lj', style: 'color:var(--ink)' });
const piece = (ctx, w, h, ground, inner, style = '') => ({ w, h, html: field(ctx, 0, 0, w, h, ground, inner, `overflow:hidden;${style}`).replace('<div class="a"', '<div class="a post"') });
const line = (ctx) => ctx.esc(copy(ctx, 'lines.primary'));

// the pocket book cover (about 188 x 345 on the photograph)
export function coverArt(ctx) {
  const G = groundsOf(ctx), M = measure(ctx), t = tones(ctx, G.primary), W = 376, H = 690, name = realOf(ctx, ctx.brand.name);
  const size = Math.max(40, M.fit(name, W - 56, 110));
  return piece(ctx, W, H, G.primary,
    logo(ctx, 'symbol', 28, 28, 34, G.primary)
    + at(28, 112, W - 56, null, D(line(ctx), 50))
    + at(28, H - 28 - size * 1.1 - 40, W - 56, 14, mono(ctx.esc(ctx.versionLine), 'color:var(--ink)'))
    + at(24, H - 28 - size * 1.1, W - 48, size * 1.1, own(ctx, ctx.brand.name), { cls: 'd', style: `font-size:${n1(size)}px;line-height:1.1;letter-spacing:-0.02em;color:${t.ink}` }));
}

// the poster: the In use page's photograph and headline, set to an A-series sheet
export function posterArt(ctx) {
  const g = darkest(ctx), W = 595, H = 842;
  return piece(ctx, W, H, isShowcase(ctx) ? g : fieldHex(ctx, 'train'),
    at(0, 0, W, H, pic(ctx, 'train', { w: W, h: H, fx: 0.52, fy: 0.5, alt: 'A reader on a train seat holding an open pocket book' }))
    + at(40, 64, W - 80, null, D(ctx.esc(copy(ctx, 'type.sample.headline')), 66))
    + at(40, H - 56, W - 80, 14, mono(own(ctx, ctx.brand.name), 'color:var(--ink)')));
}

// the bookmark (a narrow strip, about 90 x 381)
export function bookmarkArt(ctx) {
  const g = darkest(ctx), W = 180, H = 762;
  return piece(ctx, W, H, g,
    logo(ctx, 'symbol', 24, 28, 32, g)
    + at(24, 130, W - 48, null, D(ctx.esc(copy(ctx, 'applications.social.1')), 54, { lh: 1 }))
    + at(24, H - 44, W - 48, 14, mono(own(ctx, ctx.brand.name), 'color:var(--ink)')));
}

// a 16:10 web page, the brand's header and hero
export function webArt(ctx) {
  const G = groundsOf(ctx), W = 1280, H = 782, s = ctx.roles.light.surface, ts = tones(ctx, s), tp = tones(ctx, G.primary);
  const links = (isShowcase(ctx) ? ['Books', 'Writers', 'Journal'] : ['Home', 'About', 'Contact']).map((l, i) => at(330 + i * 110, 42, 100, 20, `<span class="b" style="font-size:16px;color:var(--ink)">${l}</span>`)).join('');
  const btn = at(64, 660, 260, 56, `<div class="b" style="height:100%;display:flex;align-items:center;justify-content:center;font-size:18px;color:${tp.ink}">${ctx.esc(copy(ctx, 'page.web.button', 'Read more'))}</div>`, { style: `background:${G.primary};border-radius:${ctx.radii && ctx.radii.button != null ? ctx.radii.button : 4}px` });
  return piece(ctx, W, H, s,
    logo(ctx, 'colour', 64, 32, 150, s) + links + at(64, 96, W - 128, 0, '', { cls: 'hr' })
    + at(64, 196, 600, null, mono(isShowcase(ctx) ? 'New pocket editions' : 'A short tagline', 'color:var(--ink)'))
    + at(64, 236, 610, null, D(ctx.esc(copy(ctx, 'page.web.hero', 'A headline for the page.')), isShowcase(ctx) ? 104 : 88, { lh: 0.98 }))
    + at(64, isShowcase(ctx) ? 480 : 510, 480, null, `<div class="b" style="font-size:19px;line-height:1.45;color:var(--ink)">${ctx.esc(copy(ctx, 'type.sample.paragraph'))}</div>`) + btn
    + at(700, 97, 580, 685, pic(ctx, 'paperbacks', { w: 580, h: 685, fx: 0.5, fy: 0.64, alt: 'Five plain paperbacks stacked on linen' })), `--ts:${ts.ink}`);
}

// a 390 x 868 phone screen: the same page for a phone (status bar, bar, photograph, headline, button)
export function phoneArt(ctx) {
  const G = groundsOf(ctx), W = 390, H = 868, s = ctx.roles.light.surface, tp = tones(ctx, G.primary);
  return piece(ctx, W, H, s,
    at(32, 20, 80, 16, `<span class="m i" style="font-size:14px;letter-spacing:0">9:41</span>`)
    + logo(ctx, 'colour', 24, 66, 96, s) + at(W - 24 - 64, 70, 64, 16, mono('Menu', 'text-align:right;color:var(--ink)'), {})
    + at(0, 116, W, 300, pic(ctx, 'train', { w: W, h: 300, fx: 0.56, fy: 0.5, alt: 'A reader on a train seat' }))
    + at(24, 444, W - 48, null, D(ctx.esc(copy(ctx, 'page.web.hero', 'A headline for the page.')), 52, { lh: 1 }))
    + at(24, 574, W - 48, null, `<div class="b" style="font-size:16px;line-height:1.45;color:var(--ink)">${ctx.esc(copy(ctx, 'type.sample.paragraph'))}</div>`)
    + at(24, 770, W - 48, 52, `<div class="b" style="height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;color:${tp.ink}">${ctx.esc(copy(ctx, 'page.web.button', 'Read more'))}</div>`, { style: `background:${G.primary};border-radius:4px` }));
}

// the A4 letterhead (794 x 1123): the mark, a letter, the owner at the foot
export function letterArt(ctx) {
  const B = ctx.brand, s = ctx.roles.light.surface, ts = tones(ctx, s), W = 794, H = 1123, m = 80;
  const paras = isShowcase(ctx)
    ? ['description', 'product', 'audience'].map((p, i) => at(m + 120, 330 + i * 120, W - 2 * m - 120, null, `<div class="b" style="font-size:17px;line-height:1.55;color:var(--ink)">${ctx.esc(copy(ctx, p))}</div>`)).join('')
    : [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => at(m + 120, 330 + i * 24, (i % 4 === 3 ? 0.5 : 1) * (W - 2 * m - 120), 6, '', { style: `background:${ts.hair}` })).join('');
  return piece(ctx, W, H, s,
    logo(ctx, 'colour', m, m, 150, s)
    + at(m, 236, 100, 14, mono('Letter')) + at(m, 330, 100, 14, mono('To the writer'))
    + paras
    + at(m, H - m - 64, W - 2 * m, 64, `<div class="b" style="font-size:13px;line-height:1.55;color:var(--ink)">${ctx.esc(B.contact.owner)}<br>${ctx.esc(B.contact.email)}</div>`, { style: 'display:flex;flex-direction:column;justify-content:flex-end' }), `box-shadow:inset 0 0 0 .5px ${ts.hair}`);
}

// a business card face at 8 px to the mm (680 x 452 for the area's proportion)
export function cardArt(ctx, side) {
  const G = groundsOf(ctx), B = ctx.brand, s8 = 8, W = 680, H = 452, m = 6 * s8, pt = (p) => n1(p * 0.3528 * s8);
  if (side === 'front') {
    return piece(ctx, W, H, G.primary,
      logo(ctx, 'colour', m, H - m - 70, 170, G.primary)
      + at(m, m, W - 2 * m, null, D(line(ctx), pt(19), { lh: 1.08, style: 'max-width:62%' })));
  }
  const s = ctx.roles.light.surface, ts = tones(ctx, s);
  return piece(ctx, W, H, s,
    logo(ctx, 'symbol', m, m, 64, s)
    + at(m, H - m - 190, W - 2 * m, 190, `<div class="d" style="font-size:${pt(13)}px;line-height:1.2;white-space:normal;color:var(--ink)">${own(ctx, B.name)}</div><div class="b" style="font-size:${pt(9.5)}px;line-height:1.5;margin-top:10px;color:var(--ink)">${ctx.esc(B.applications.card.person)}<br>${ctx.esc(B.applications.card.role)}<br>${ctx.esc(B.applications.card.contact)}</div>`, { style: 'display:flex;flex-direction:column;justify-content:flex-end' }),
    `box-shadow:inset 0 0 0 .5px ${ts.hair}`);
}

// a story, 390 x 844: 0 books on Plum, 1 the train photograph on Oatmeal, 2 the pencil note, 3 the line on Plum with the button
export function storyArt(ctx, i) {
  const G = groundsOf(ctx), s = ctx.roles.light.surface, W = 390, H = 844, tp = tones(ctx, G.primary), ts = tones(ctx, s), raw = ctx.esc(copy(ctx, `applications.social.${i}`)), txt = !raw || (ctx.placeholders && ctx.placeholders.label(raw) !== raw) ? 'A short line.' : raw;
  const bar = (c) => at(16, 52, W - 32, 2, '', { style: `background:${c};opacity:.55;border-radius:2px` }) + at(16, 52, (W - 32) * 0.4, 2, '', { style: `background:${c};border-radius:2px` })
    + at(16, 66, 220, 14, mono(own(ctx, ctx.brand.name), `color:${c}`));
  const rr = (x, y, w, h, inner, r = 18) => at(x, y, w, h, inner, { style: `overflow:hidden;border-radius:${r}px` });
  if (i === 0) {
    const lab = readableOn(tp.wash, [ctx.roles.light.text, ctx.roles.light.surface], { size: 16 });
    return piece(ctx, W, H, G.primary, at(0, 0, W, 560, pic(ctx, 'paperbacks', { w: W, h: 560, fx: 0.5, fy: 0.64, label: lab, alt: 'Five plain paperbacks on linen' })) + bar(isShowcase(ctx) ? ts.ink : lab)
      + at(28, 598, W - 56, null, D(txt, 70, { color: tp.ink })));
  }
  if (i === 1) {
    return piece(ctx, W, H, s, bar(ts.ink) + at(28, 118, W - 56, null, D(txt, 70))
      + rr(28, 330, W - 56, 440, pic(ctx, 'train', { w: W - 56, h: 440, fx: 0.62, fy: 0.5, alt: 'A reader on a train seat' }), 22));
  }
  if (i === 2) {
    return piece(ctx, W, H, s, at(0, 0, W, H, pic(ctx, 'margin-note', { w: W, h: H, fx: 0.5, fy: 0.62, alt: 'A pencil note in the margin of a book' })) + bar(isShowcase(ctx) ? ts.ink : tones(ctx, fieldHex(ctx, 'margin-note')).ink)
      + at(28, 118, W - 56, null, D(txt, 70, isShowcase(ctx) ? {} : { color: tones(ctx, fieldHex(ctx, 'margin-note')).ink })));
  }
  return piece(ctx, W, H, G.primary, bar(tp.ink) + at(28, 118, W - 56, null, D(txt, 78, { color: tp.ink }))
    + rr(28, 470, W - 56, 220, pic(ctx, 'paperbacks', { w: W - 56, h: 220, fx: 0.5, fy: 0.72, label: readableOn(tp.wash, [ctx.roles.light.text, ctx.roles.light.surface], { size: 16 }), alt: 'Five plain paperbacks on linen' }), 18)
    + at(28, 724, 230, 52, `<div class="b" style="height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;color:${ts.ink}">${ctx.esc(copy(ctx, 'page.web.button', 'Read more'))}</div>`, { style: `background:${s};border-radius:26px` }));
}
