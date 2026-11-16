// Theme 23, Broadsheet, lane g5: the applications pages (business-card, social, signage, email-signature, digital). business-card is redrawn here (12 Nov) on the library's scenes.
// Each page is one story on the paper: the application drawn flat at size (the post, the sign face, the signature, the screen) as the story's picture,
// with its captions in the fourth column and its specs as the page's appendix, hung from the floor. Signage carries the one photograph, the
// sign scene at its own 3:2 (counter-fascia-opening, or the brand's own pick in applications.scenes). Every string is read from brand data or ctx; no colour id, photo id or brand name is written here.
import { plateImg } from '../../engine/plate.js';
import { A, N, G, E, hr, px, jump, folio, fitLines, balance2, headLines, fitLogo, bodyWeight, measureBody, copyGuard, signLine, postLine, shopHead, appsHead, pullQuote } from './helpers.js';
import { kitCss } from './lane-u1-kit.js';
import { css as screensCss, desktop, phone, classesIn } from './lane-u3-screens.js';

const page = (ctx, id, inner, art = []) => copyGuard(ctx, id, `<section class="pg" data-page="${id}">${inner}</section>`, art);
// the platform's own ground (a feed, a mail client, a browser bar): a cool near-white, a theme material like the newsprint, never a brand colour
const PLATFORM = '#F4F5F7';

// the page's headline, set from G.top; returns its markup and the y its last line ends on
const head = (ctx, text, { max = 64, min = 48, maxLines = 2, cls = 'b-head', k = 68 / 64 } = {}) => {
  const hd = fitLines(ctx, text, { w: 1000, max, min, maxLines }), lh = Math.round(hd.size * k);
  return { html: E(G.left, G.top, 'story', headLines(hd.lines, hd.size, lh, cls), { w: 1000 }), bottom: G.top + hd.lines.length * lh };
};
// art drawn at its own size and shown at k of it (zoom, not transform, so the PDF stays 1:1), with a hairline edge
const figIn = (w, h, k, ground, inner) => `<div class="g5-fig-in" style="width:${w}px;height:${h}px;zoom:${k};background:${ground}"><!--art-->${inner}<!--/art--></div>`;
const fig = (x, y, w, h, k, ground, inner, cls = '') => `<div class="a g5-fig ${cls}" style="left:${px(x)};top:${px(y)};width:${px(w * k)};height:${px(h * k)}">${figIn(w, h, k, ground, inner)}</div>`;
// the same, in the flow of a block
const figFlow = (w, h, k, ground, inner) => `<div class="g5-fig" style="width:${px(w * k)};height:${px(h * k)}">${figIn(w, h, k, ground, inner)}</div>`;
// the signature's type: [size, line-height] for the name and for the other lines (the CSS below and the page's appendix both read these)
const SIG = { n: [16, 22], s: [14, 20] };
const cname = (ctx, hex) => (ctx.colours.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || {}).name;
const lum = (hex) => { const n = parseInt(String(hex).slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
// the logo colourway for a ground: the one drawn for that ground, else the light or dark one by the ground's lightness
const cwFor = (ctx, ground) => {
  const cws = ctx.brand.logo.colourways, own = Object.keys(cws).find((k) => cws[k].ground.toLowerCase() === String(ground).toLowerCase());
  if (own) return own;
  return lum(ground) < 0.5 ? (cws.reversed ? 'reversed' : cws['mono-light'] ? 'mono-light' : 'colour') : cws['mono-dark'] && !cws.colour ? 'mono-dark' : 'colour';
};
const logo = (ctx, v, w, ground, label = 'Logo') => { const cws = ctx.brand.logo.colourways, cw = cwFor(ctx, ground); return ctx.logo.html(v, { width: w, colourway: cw, color: cws[cw].name, label }); };
const logoH = (ctx, v, w) => w * ctx.logo.geos[v].h / ctx.logo.geos[v].w;
const radius = (ctx) => (ctx.radii.find((r) => r.token === 'radius-control') || { px: 0 }).px;
const mono = (s) => `<span class="c-mono c-ink">${A(s)}</span>`;
const note = (label, body) => `<div class="g5-note"><p class="c-label c-ink">${label}</p><i class="hr-flow"></i><p class="c-cap c-quiet">${body}</p></div>`;
// a photograph for the portrait post: the last shot with a photograph that the theme's two plates do not screen, else the last with one
const postShot = (B) => {
  const p = B.imagery.plates || {}, used = new Set([p.cover?.shot ?? 0, p.intro?.shot ?? 2]), sh = B.imagery.shots.map((s, i) => [s, i]).filter(([s]) => s.photo);
  const free = sh.filter(([, i]) => !used.has(i));
  return (free.length ? free[free.length - 1] : sh[sh.length - 1] || [null])[0];
};

// ---- the scenes the applications are photographed in. The brand may pick its own in brand.json applications.scenes { card, pack, sign }; the
// defaults are the theme's own (the till counter, the paper bag handed over, the fascia over the door). Each scene names its surface, what it is
// called on the page and what the photograph shows ----
const SCENES = {
  card: { 'counter-till-cards': { alt: 'two blank business cards on a stone till counter' }, 'bench-cards-offcuts': { alt: 'two blank business cards on a pine bench' } },
  pack: { 'counter-bag-handover': { surface: 'bag-front', label: 'Paper bag', alt: 'a paper bag handed across a counter' }, 'counter-carton-door': { surface: 'carton-label', label: 'Carton label', alt: 'a carton at a shop door with a label on its side' } },
  sign: { 'counter-fascia-opening': { surface: 'fascia', label: 'Fascia', head: 'The name over the door. One line for the street.', alt: 'fascia board over a brick shopfront' }, 'kerb-hoarding-footpath': { surface: 'hoarding', label: 'Hoarding', head: 'The name on the hoarding. One line for the street.', alt: 'site hoarding beside a footpath' } },
};
const DEFAULT_SCENE = { card: 'counter-till-cards', pack: 'counter-bag-handover', sign: 'counter-fascia-opening' };
const sceneFor = (ctx, kind) => { const id = ((ctx.brand.applications || {}).scenes || {})[kind] || DEFAULT_SCENE[kind]; if (!SCENES[kind][id]) throw new Error('g5: no ' + kind + ' scene named ' + id); return { id, ...SCENES[kind][id] }; };
// a scene photograph cropped to a box bw x bh: ww scene px wide, centred on (cx, cy) as far as the photograph allows
const sceneImg = (sc, url, alt, ww, bw, bh, cx, cy) => {
  const k = bw / ww, wh = ww * bh / bw, x0 = Math.max(0, Math.min(sc.w - ww, cx - ww / 2)), y0 = Math.max(0, Math.min(sc.h - wh, cy - wh / 2));
  return plateImg(A(url), A(alt), `position:absolute;left:${px(-x0 * k)};top:${px(-y0 * k)};width:${px(sc.w * k)};height:${px(sc.h * k)};max-width:none`);
};
const centre = (q) => [q.corners.reduce((a, c) => a + c[0], 0) / 4, q.corners.reduce((a, c) => a + c[1], 0) / 4];
// the intro's pull quote, as guidelines.js reads it: the applications headline keeps clear of it
const introQuote = (ctx) => { const B = ctx.brand, ledgerText = B.ui.screen.content.deliveries.slice(0, 5).flatMap((d) => [d.to, d.when, d.price]); return pullQuote(ctx, [B.lines.others[1], B.description, ...ledgerText]); };

// ---- the three posts, each drawn at its real pixel size ---------------------------------------------------------------------------------
// square 1080 x 1080: the line on the action colour, the horizontal logo under it, the address at its right
function squarePost(ctx, line) {
  const B = ctx.brand, S = ctx.roles.light;
  let hd = balance2(ctx, line, { w: 936, max: 120, min: 72 });
  if (!hd.ok) hd = fitLines(ctx, line, { w: 936, max: 104, min: 56, maxLines: 4 });
  const lw = fitLogo(ctx, 'horizontal', 360, 72), lh = logoH(ctx, 'horizontal', lw);
  return {
    size: hd.size, ground: S.action,
    html: E(72, 96, 'g5-pl', hd.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: 936, style: `font-size:${hd.size}px;line-height:${hd.size}px;color:${S.actionLabel}` })
      + E(72, 1008 - lh, 'ar-logo', logo(ctx, 'horizontal', lw, S.action), { w: lw, h: lh })
      + E(1008 - 440, 1008 - lh / 2 - 18, 'g5-pa', A(B.applications.site.url), { w: 440, style: `color:${S.actionLabel};text-align:right` }),
  };
}
// portrait 1080 x 1350: a front page in a post. The logo as nameplate, the thin-thick rule, the line as the story, a photograph as the plate (clean, never screened)
function portraitPost(ctx, line) {
  const B = ctx.brand, S = ctx.roles.light, shot = postShot(B);
  const lw = fitLogo(ctx, 'colour', 760, 128), lh = logoH(ctx, 'colour', lw), ry = 72 + 128 + 32;
  const hd = fitLines(ctx, line, { w: 936, max: shot ? 96 : 128, min: 64, maxLines: 3 }), llh = Math.round(hd.size * 1.04), ly = ry + 14 + 40;
  const py = ly + hd.lines.length * llh + 48, ph = 1350 - 72 - py;
  const photo = shot && ph >= 320 ? E(72, py, 'g5-pph', ctx.photo(shot.id, { style: 'width:100%;height:100%;object-fit:cover;display:block' }), { w: 936, h: ph }) : '';
  return {
    size: hd.size, ground: S.surface, shot: photo ? shot : null,
    html: E(540 - lw / 2, 72 + (128 - lh) / 2, 'ar-logo', logo(ctx, 'colour', lw, S.surface), { w: lw, h: lh })
      + `<i class="a" style="left:72px;top:${ry}px;width:936px;height:6px;background:${S.text}"></i><i class="a" style="left:72px;top:${ry + 12}px;width:936px;height:2px;background:${S.text}"></i>`
      + E(72, ly, 'g5-pl', hd.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: 936, style: `font-size:${hd.size}px;line-height:${llh}px;color:${S.text}` })
      + photo,
  };
}
// story 1080 x 1920, on the dark roles: the logo, the line, the week's list and one button, all 250 px clear of the top and the bottom
function storyPost(ctx, line) {
  const B = ctx.brand, D = ctx.roles.dark, C = ctx.C, scr = B.ui.screen, c = scr.content, SAFE = 250;
  const lw = fitLogo(ctx, 'horizontal', 420, 80), lh = logoH(ctx, 'horizontal', lw);
  const hd = fitLines(ctx, line, { w: 936, max: 112, min: 64, maxLines: 4 }), llh = Math.round(hd.size * 1.04), ly = SAFE + 80 + 72;
  const price = C.ratio(D.action, D.surface) >= 4.5 ? D.action : D.text;
  const by = 1920 - SAFE - 112, top = ly + hd.lines.length * llh + 88, rowH = 132;
  const n = Math.max(0, Math.min(3, Math.floor((by - 56 - top - 56) / rowH)));
  const rows = c.deliveries.slice(0, n).map((d, i) => E(72, top + 56 + i * rowH, 'g5-sr', `<p class="g5-sr-to" style="color:${D.text}">${A(d.to)}</p><p class="g5-sr-sub"><span style="color:${D.quiet}">${A(d.when)}</span><b style="color:${price}">${A(d.price)}</b></p>`, { w: 936, h: rowH, style: `border-bottom:2px solid ${D.divider}` })).join('');
  return {
    size: hd.size, ground: D.surface, rows: n,
    html: E(72, SAFE, 'ar-logo', logo(ctx, 'horizontal', lw, D.surface), { w: lw, h: lh })
      + E(72, ly, 'g5-pl', hd.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: 936, style: `font-size:${hd.size}px;line-height:${llh}px;color:${D.text}` })
      + (n ? E(72, top, 'g5-st', A(scr.title), { w: 936, h: 56, style: `color:${D.text};border-bottom:4px solid ${D.text}` }) + rows : '')
      + E(72, by, 'g5-sb', A(c.form.book), { w: 936, h: 112, style: `background:${D.action};color:${D.actionLabel};border-radius:${radius(ctx) * 2}px` }),
  };
}

const ICONS = {
  like: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  reply: '<path d="M4 5h16v11H9l-5 4z"/>',
  send: '<path d="M21 3 3 10.5l7 2.5 2.5 7z"/><path d="M10 13l11-10"/>',
  save: '<path d="M6 3h12v18l-6-4.5L6 21z"/>',
};
const icon = (k) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${ICONS[k]}</svg>`;

export const guidelines = {
  // ---- social: the three formats. The portrait post in the feed it is read in is the story's picture; the story and the square stand in
  // the third and fourth columns at a fifth of their size; the formats' specs close the page from the floor ----
  social: (ctx) => {
    const B = ctx.brand, L = ctx.logo;
    // the posts carry the brand's lines but not the sign line, which the cover, the typefaces and the shop sign already print: its own social lines first, then its other lines, printed whole
    const soc = [...(B.applications.social || []), ...B.lines.others, B.lines.primary].filter((l, i, a) => l !== signLine(ctx) && a.indexOf(l) === i), ln = (i) => soc[i % soc.length];
    const h = head(ctx, 'One line a post. The name signs it.');
    const sq = squarePost(ctx, ln(0)), po = portraitPost(ctx, ln(1)), st = storyPost(ctx, ln(2));
    const y0 = h.bottom + 48, k = 488 / 1080;
    // the feed: the account's head, the post, the actions, the caption the brand posts with it
    const sym = L.geos.symbol ? 'symbol' : 'colour', sw = fitLogo(ctx, sym, 26, 26), sh = logoH(ctx, sym, sw);
    // the caption is the account's description; one that opens with the name does not get the name in bold before it as well
    const named = B.description.toLowerCase().startsWith(B.name.toLowerCase());
    const feed = `<div class="a g5-feed" style="left:${px(G.left)};top:${px(y0)};width:488px">`
      + `<div class="g5-feed-h"><span class="g5-av" style="background:${ctx.roles.light.surface}"><span class="ar-logo" style="width:${px(sw)};height:${px(sh)}">${logo(ctx, sym, sw, ctx.roles.light.surface)}</span></span><div><p class="g5-feed-n">${A(B.name)}</p>${B.city ? `<p class="g5-feed-c">${A(B.city)}</p>` : ''}</div></div>`
      + `<div class="g5-feed-p" style="height:${px(1350 * k)}"><div class="g5-fig-in" style="width:1080px;height:1350px;zoom:${k};background:${po.ground}"><!--art-->${po.html}<!--/art--></div></div>`
      + `<div class="g5-feed-a"><span>${icon('like')}${icon('reply')}${icon('send')}</span>${icon('save')}</div>`
      + `<p class="g5-feed-t">${named ? '' : `<b>${A(B.name)}</b> `}${A(B.description)}</p></div>`;
    const feedH = 64 + 1350 * k + 48 + Math.ceil(B.description.length * 7.6 / 456) * 22 + 16;
    const capP = col3(G.left, y0 + feedH + 16, 488, `<p class="c-label c-ink">Portrait ${mono('1080 × 1350')}, in the feed</p><p class="c-cap c-quiet">A front page in a post: the logo as the nameplate, the head rules, the line as the story${po.shot ? ', a photograph under it, never screened' : ''}.</p>`);
    // the story and the square, shown at the column's width
    const ks = G.col / 1080, ys = y0 + 64;
    const story = fig(G.x[2], ys, 1080, 1920, ks, st.ground, st.html);
    const square = fig(G.x[3], ys, 1080, 1080, ks, sq.ground, sq.html);
    const D = ctx.roles.dark, S = ctx.roles.light;
    const capS = col3(G.x[2], ys + 1920 * ks + 12, G.col, `<p class="c-label c-ink">Story ${mono('1080 × 1920')}</p><p class="c-cap c-quiet">On the dark ground: the line, ${A(B.ui.screen.title.toLowerCase())}${st.rows ? '' : ' left out'}, one button. Type keeps 250 px clear of the top and the bottom.</p>`);
    const capQ = col3(G.x[3], ys + 1080 * ks + 12, G.col, `<p class="c-label c-ink">Square ${mono('1080 × 1080')}</p><p class="c-cap c-quiet">The line on ${A(cname(ctx, S.action) || 'the action colour')}, the ${A(L.labels.horizontal.toLowerCase())} logo under it.</p>${jump(ctx, 'signage', 'Signs')}`);
    // the appendix: one row a format
    const rows = [['Square', '1080 × 1080', S.action, sq.size], ['Portrait', '1080 × 1350', S.surface, po.size], ['Story', '1080 × 1920', D.surface, st.size]];
    const ty = G.floor - 40 - rows.length * 44;
    const th = [['Format', 0], ['Pixels', 1], ['Ground', 2], ['The line', 3]].map(([t, i]) => E(G.x[i], ty, 'c-folio c-quiet', t, { w: G.col })).join('');
    const tr = rows.map(([f, s, g, z], i) => `<div class="a g5-row${i === rows.length - 1 ? ' last' : ''}" style="left:${px(G.left)};top:${px(ty + 30 + i * 44)};width:1000px"><p class="c-label">${f}</p><p class="c-mono">${s}</p><p class="c-cap"><i class="g5-key" style="background:${g}"></i>${A(cname(ctx, g) || (g === D.surface ? 'Dark surface' : 'Ground'))} <span class="c-mono">${A(g)}</span></p><p class="c-cap">${A(B.fonts.display.family)}, ${mono(`${z} px`)}</p></div>`).join('');
    const rules = hr(G.rule[1], y0, 0.75, feedH, 'hair') + hr(G.rule[2], ys, 0.75, 1920 * ks, 'hair');
    return page(ctx, 'social', folio(ctx, 'social') + h.html + feed + capP + story + square + capS + capQ + rules + th + hr(G.left, ty + 28, 1000, 1) + tr, [ln(0), ln(1), ln(2)]);
  },

  // ---- business-card: the stationery and the packing, both photographed on the library scenes. The cards on a counter or bench, front on the
  // reversed ground and back on the paper; the carton or bag under it, with a label the brand prints. Scenes: brand.json applications.scenes ----
  'business-card': (ctx) => {
    const B = ctx.brand, L = ctx.logo, S = ctx.roles.light, cws = B.logo.colourways, cd = B.applications.card, ct = B.contact;
    const line = signLine(ctx), ah = appsHead(ctx, introQuote(ctx)), hd = ah || balance2(ctx, shopHead(ctx), { w: 1000, max: 64, min: 48 });
    const head = E(G.left, G.top, 'story', headLines(hd.lines, hd.size, Math.round(hd.size * 68 / 64)), { w: 1000 });
    // a one-line headline leaves a line's height more: both rows move up by it and the lower photograph grows by it, so it still stands on y 1480
    const dy = hd.lines.length < 2 ? Math.round(hd.size * 68 / 64) : 0, Y1 = 296 - dy, Y2 = 840 - dy, BH = 640 + dy, PW = 744;
    // photo 1: two cards, 90 x 55 mm, drawn 360 x 220 (the scene's 1.636 : 1)
    const CS = sceneFor(ctx, 'card'), cs = ctx.sceneInfo(CS.id), CW = 360, CH = 220;
    const fg = cws.reversed ? cws.reversed.ground : S.surface, fcw = cwFor(ctx, fg), fl = fitLogo(ctx, 'horizontal', CW * 0.62, CH * 0.3), flh = logoH(ctx, 'horizontal', fl);
    const front = `<i class="ar-fill" style="background:${fg}"></i>` + E(CW / 2 - fl / 2, CH / 2 - flh / 2, 'ar-logo', L.html('horizontal', { width: fl, colourway: fcw, color: cws[fcw].name, label: 'Logo' }), { w: fl, h: flh });
    const nz = fitLines(ctx, cd.person, { w: CW - 56, max: 30, min: 20, maxLines: 1 });
    const back = `<i class="ar-fill" style="background:${S.surface}"></i><i class="a" style="left:28px;top:28px;width:${CW - 56}px;height:4px;background:${S.text}"></i><i class="a" style="left:28px;top:36px;width:${CW - 56}px;height:1.5px;background:${S.text}"></i>`
      + E(28, 56, 'ar-pline', A(cd.person), { w: CW - 56, style: `font-size:${nz.size}px;line-height:${nz.size + 6}px;color:${S.text}` })
      + E(28, 56 + nz.size + 8, 'ar-addr', A(cd.role), { w: CW - 56, style: `font-size:16px;color:${S.quiet}` })
      + E(28, CH - 28 - 48, 'ar-addr', `${A(cd.contact)}<br>${A(B.applications.site.url)}`, { w: CW - 56, style: `font-size:16px;line-height:24px;color:${S.text}` });
    const urlC = ctx.mockup(CS.id, { 'card-front': { html: ctx.artPage(front, { w: CW, h: CH }), w: CW, h: CH }, 'card-back': { html: ctx.artPage(back, { w: CW, h: CH }), w: CW, h: CH } });
    const p1 = E(G.left, Y1, 'ph', sceneImg(cs, urlC, `${B.name} business card, front and back, ${CS.alt}`, cs.w, PW, 496, cs.w / 2, cs.h / 2), { w: PW, h: 496 });
    const gname = cname(ctx, fg);
    const cap1 = col3(G.x[3], Y1, G.col, `<p class="c-label c-ink">Business card</p><p class="c-cap c-quiet" style="margin-top:4px">Front: ${A(L.labels.horizontal.toLowerCase())} logo${gname ? ` on ${A(gname)}` : ''}. Back: the name, the role and where to write, on the paper.</p><p class="c-cap c-quiet" style="margin-top:4px">${mono('90 × 55')} mm.</p>`);
    // photo 2: the pack label, drawn to its surface's proportion
    const PS = sceneFor(ctx, 'pack'), ps = ctx.sceneInfo(PS.id), pq = ps.quads[ps.surfaces.indexOf(PS.surface)], tall = pq.aspect < 1;
    const LW = tall ? 380 : 420, LH = Math.round(LW / pq.aspect), pcw = tall && cws['mono-dark'] ? 'mono-dark' : cwFor(ctx, S.surface), K = cws[pcw];
    const packLine = [B.lines.primary, ...B.lines.others].find((l) => l !== line && l !== postLine(ctx) && (ah || l !== shopHead(ctx))) || B.lines.primary;
    let label;
    if (tall) {
      const sv = L.geos.stacked ? 'stacked' : 'colour', sw = fitLogo(ctx, sv, LW * 0.62, LH * 0.3), sh = logoH(ctx, sv, sw), pl = fitLines(ctx, packLine, { w: LW - 80, max: 36, min: 24, maxLines: 3 });
      label = `<i class="ar-fill" style="background:${K.ground}"></i>` + E(LW / 2 - sw / 2, 64, 'ar-logo', L.html(sv, { width: sw, colourway: pcw, color: K.name, label: 'Logo' }), { w: sw, h: sh })
        + E(40, 64 + sh + 48, 'ar-pline', pl.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: LW - 80, style: `font-size:${pl.size}px;line-height:${Math.round(pl.size * 1.12)}px;text-align:center;color:${K.name}` })
        + E(0, LH - 64, 'ar-addr', A(B.applications.site.url), { w: LW, style: `text-align:center;color:${K.name}` });
    } else {
      const hw = fitLogo(ctx, 'horizontal', LW - 64, 60), hh = logoH(ctx, 'horizontal', hw), pl = fitLines(ctx, packLine, { w: LW - 64, max: 30, min: 20, maxLines: 3 }), ry = 32 + hh + 20;
      label = `<i class="ar-fill" style="background:${S.surface}"></i>` + E(32, 32, 'ar-logo', logo(ctx, 'horizontal', hw, S.surface), { w: hw, h: hh })
        + `<i class="a" style="left:32px;top:${ry}px;width:${LW - 64}px;height:5px;background:${S.text}"></i><i class="a" style="left:32px;top:${ry + 9}px;width:${LW - 64}px;height:1.5px;background:${S.text}"></i>`
        + E(32, ry + 28, 'ar-pline', pl.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: LW - 64, style: `font-size:${pl.size}px;line-height:${Math.round(pl.size * 1.1)}px;color:${S.text}` })
        + E(32, LH - 32 - 24, 'ar-addr', A(B.applications.site.url), { w: LW - 64, style: `color:${S.text}` });
    }
    const urlP = ctx.mockup(PS.id, { [PS.surface]: { html: ctx.artPage(label, { w: LW, h: LH }), w: LW, h: LH } });
    const [px0, py0] = centre(pq), ww = Math.min(ps.w, ps.h * PW / BH);
    const p2 = E(G.left, Y2, 'ph', sceneImg(ps, urlP, `${B.name} ${PS.alt}`, ww, PW, BH, px0, py0), { w: PW, h: BH });
    const cap2 = col3(G.x[3], Y2, G.col, `<p class="c-label c-ink">${A(PS.label)}</p><p class="c-cap c-quiet" style="margin-top:4px">${A(B.logo.when[pcw] || B.logo.when.colour || '')}</p>${jump(ctx, 'social', 'Social posts')}`);
    // the contact box stands on the lower photograph's bottom edge (y 1480), in the fourth column
    const contact = `<div class="a colm" style="left:${px(G.x[3])};bottom:${1587 - 1480}px;width:${G.col}px"><i class="hr-flow"></i><p class="c-label c-ink" style="margin-top:8px">Contact</p>`
      + `<p class="c-note c-ink" style="margin-top:8px">${A(cd.person)}</p><p class="c-cap c-quiet">${A(cd.role)}</p><p class="c-mono" style="margin-top:4px">${A(cd.contact)}</p><p class="c-mono">${A(B.applications.site.url)}</p>`
      + `<p class="c-cap c-quiet" style="margin-top:16px">${A(ct.owner)}</p><p class="c-mono">${A(ct.email)}</p></div>`;
    return page(ctx, 'business-card', folio(ctx, 'business-card') + head + p1 + cap1 + p2 + cap2 + contact + hr(817.5, Y1, .75, 496, 'hair') + hr(817.5, Y2, .75, BH, 'hair'), [packLine]);
  },

  // ---- signage: the fascia over the door, photographed, then flat at the measure; the street sign the brand names, set as a news bill ----
  signage: (ctx) => {
    const B = ctx.brand, L = ctx.logo, S = ctx.roles.light, cws = B.logo.colourways;
    const SG = sceneFor(ctx, 'sign'), h = head(ctx, SG.head);
    // the fascia board, drawn at the scene's own proportion: the logo centred on the board, on the reversed ground when the brand has one
    const sc = ctx.sceneInfo(SG.id), fa = sc.quads[0].aspect, FW = 1000, FH = Math.round(FW / fa);
    const fg = cws.reversed ? cws.reversed.ground : S.surface, fcw = cwFor(ctx, fg);
    const flw = fitLogo(ctx, 'horizontal', FW * 0.56, FH * 0.5), flh = logoH(ctx, 'horizontal', flw);
    const fascia = E(FW / 2 - flw / 2, FH / 2 - flh / 2, 'ar-logo', L.html('horizontal', { width: flw, colourway: fcw, color: cws[fcw].name, label: 'Logo' }), { w: flw, h: flh });
    const url = ctx.mockup(SG.id, { [SG.surface]: { html: ctx.artPage(`<i class="ar-fill" style="background:${fg}"></i>${fascia}`, { w: FW, h: FH }), w: FW, h: FH } });
    const Y1 = h.bottom + 48, PW = 744, PH = Math.round(PW * sc.h / sc.w);
    const photo = E(G.left, Y1, 'ph', plateImg(A(url), `${A(B.name)} ${A(SG.alt)}`, `width:${PW}px;height:${PH}px`), { w: PW, h: PH });
    const gname = cname(ctx, fg);
    const cap1 = col3(G.x[3], Y1, G.col, `<p class="c-label c-ink">${A(SG.label)}</p><p class="c-cap c-quiet" style="margin-top:4px">${A(L.labels.horizontal)} logo${gname ? ` on ${A(gname)}` : ''}, centred, about half the board's height.</p><p class="c-cap c-quiet" style="margin-top:4px">${B.logo.when[fcw] ? A(B.logo.when[fcw]) : ''}</p>`);
    // the street sign the brand names: its proportion read from the brand's own size, set as a news bill in the first two columns and hung
    // from the floor, as tall as the room under the photograph lets it be
    const sg = String(B.applications.signage || ''), mm = /(\d+)\s*[x×]\s*(\d+)/.exec(sg), ar = mm ? +mm[1] / +mm[2] : 3 / 4;
    const Y2 = Y1 + PH + 48, SW2 = G.span(0, 1), SH = Math.min(G.floor - Y2, SW2 / ar), Y3 = G.floor - SH, AW = 600, AH = Math.round(AW / ar), kS = SH / AH;
    const sv = L.geos.stacked ? 'stacked' : 'colour', slw = fitLogo(ctx, sv, AW - 160, AH * 0.2), slh = logoH(ctx, sv, slw), ry = 48 + slh + 32;
    // the line: the largest size whose lines fit both the measure and the height left between the rules and the address
    const line = signLine(ctx), room = AH - (ry + 54) - 48 - 32 - 24;
    let sl = null;
    for (let z = 112; z >= 32; z -= 4) { const f = fitLines(ctx, line, { w: AW - 96, max: z, min: z, maxLines: 8 }); if (f.ok && f.lines.length * Math.round(z * 1.04) <= room) { sl = f; break; } }
    sl = sl || fitLines(ctx, line, { w: AW - 96, max: 32, min: 32, maxLines: 8 });
    const slh2 = Math.round(sl.size * 1.04);
    const bill = E(AW / 2 - slw / 2, 48, 'ar-logo', logo(ctx, sv, slw, S.surface), { w: slw, h: slh })
      + `<i class="a" style="left:48px;top:${ry}px;width:${AW - 96}px;height:6px;background:${S.text}"></i><i class="a" style="left:48px;top:${ry + 12}px;width:${AW - 96}px;height:2px;background:${S.text}"></i>`
      + E(48, ry + 14 + 40, 'g5-pl', sl.lines.map((t) => `<span class="ln">${A(t)}</span>`).join(''), { w: AW - 96, style: `font-size:${sl.size}px;line-height:${slh2}px;color:${S.text}` })
      + E(48, AH - 48 - 32, 'g5-pa', A(B.applications.site.url), { w: AW - 96, style: `color:${S.text};font-size:24px;line-height:32px` });
    const sign = fig(G.left, Y3, AW, AH, kS, S.surface, bill);
    // beside it, in the third and fourth columns: the board flat, then the sign's and the logo's notes. The sign's line is on the sign, so the
    // note gives only its size
    const kF = SW2 / FW;
    const side = `<div class="a g5-side" style="left:${px(G.x[2])};top:${px(Y3)};width:${px(SW2)}">${figFlow(FW, FH, kF, fg, fascia)}`
      + `<p class="c-cap c-quiet g5-side-c">The board flat, ${mono(`${FW} × ${FH}`)} at ${mono(`${+fa.toFixed(2)} : 1`)}, the proportion of the board in the photograph.</p>`
      + `<div class="g5-side-n">${colFlow(`<p class="c-label c-ink">Street sign${mm ? ` ${mono(`${mm[1]} × ${mm[2]} mm`)}` : ''}</p><p class="c-cap c-quiet" style="margin-top:4px">Set as a news bill: the ${A(L.labels[sv] ? L.labels[sv].toLowerCase() : 'stacked')} logo over the head rules, the line as large as the measure lets it.</p>`)}`
      + `${colFlow(`<p class="c-label c-ink">Logo</p><p class="c-cap c-quiet" style="margin-top:4px">${A(B.logo.when[sv] || B.logo.when.colour || '')}</p>${jump(ctx, 'email-signature', 'Email signature')}`, true)}</div></div>`;
    return page(ctx, 'signage', folio(ctx, 'signage') + h.html + photo + cap1 + hr(G.rule[2], Y1, 0.75, PH, 'hair') + sign + hr(G.rule[1], Y3, 0.75, SH, 'hair') + side, [line]);
  },

  // ---- email-signature: the letter as it arrives. The message in a mail client across three columns, the rules in the fourth; the signature
  // at twice its size and its plain-text version close the page from the floor ----
  'email-signature': (ctx) => {
    const B = ctx.brand, L = ctx.logo, S = ctx.roles.light, e = B.applications.email, c = B.applications.card, g = B.guideB?.email || {};
    const slot = !!ctx.placeholders;   // slot: no brand copy in the headline, a fixed text width and the compact placeholder in the signature
    const h = head(ctx, g.to && !slot ? `The signature, as ${g.to} reads it.` : 'The signature, as it arrives.');
    // the signature, sized from its own text: the logo, a rule, the four lines
    const w6 = bodyWeight(ctx, 600), lines = [c.contact, B.applications.site.url];
    const tw = slot ? 240 : Math.ceil(Math.max(measureBody(ctx, e.person, 16, w6), measureBody(ctx, e.role, 14, 400), ...lines.map((t) => measureBody(ctx, t, 14, 400)))) + 2;
    const lw = fitLogo(ctx, 'horizontal', 160, 36), lh = logoH(ctx, 'horizontal', lw), sigW = Math.ceil(lw + 33 + tw);
    const sig = () => `<div class="g5-sig${slot ? ' ph-tight' : ''}" style="width:${sigW}px"><span class="ar-logo" style="width:${px(lw)};height:${px(lh)}">${L.html('horizontal', { width: lw, colourway: cwFor(ctx, S.surface), label: 'Logo' })}</span><i class="g5-sig-r" style="background:${S.divider}"></i>`
      + `<div class="g5-sig-t"><p class="g5-sig-n" style="color:${S.text}">${A(e.person)}</p><p class="g5-sig-s" style="color:${S.quiet}">${A(e.role)}</p>${lines.map((t) => `<p class="g5-sig-s" style="color:${S.text}">${A(t)}</p>`).join('')}</div></div>`;
    // the message: the client's head rows, the brand's own letter, the signature
    const row = (k, v, b = false) => `<p class="g5-mh"><span class="g5-mk">${k}</span>${b ? `<b>${A(v)}</b>` : A(v)}</p>`;
    const y0 = h.bottom + 48;
    const mail = `<div class="g5-mail"><div class="g5-mail-h">${row('From', `${e.person}, ${c.contact}`)}${g.to ? row('To', g.to) : ''}${g.subject ? row('Subject', g.subject, true) : ''}${g.time ? `<p class="g5-mt c-mono">${A(g.time)}</p>` : ''}</div>`
      + `<div class="g5-mail-b" style="background:${S.surface}">${(g.body || []).map((t) => `<p class="g5-mb" style="color:${S.text}">${A(t)}</p>`).join('')}<!--art-->${sig()}<!--/art--></div></div>`;
    // beside the message: the logo and text notes, and the same lines as plain text
    const specs = colFlow(note('Logo', `${A(L.labels.horizontal)}, ${mono(`${Math.round(lw)} px`)} wide. ${A(B.logo.when.horizontal || '')}`)
      + note('Text', 'Live text, not a picture, so it still reads with images turned off.')
      + `<div class="g5-note"><p class="c-label c-ink">Plain-text version</p><i class="hr-flow"></i><div class="g5-plain">${[e.person, e.role, ...lines].map((t) => `<p class="c-mono">${A(t)}</p>`).join('')}</div><p class="c-cap c-quiet" style="margin-top:8px">For mail sent without formatting: the same lines, no logo.</p>${jump(ctx, 'digital', 'Website and app')}</div>`, true);
    // under the message, across the measure: the signature enlarged in quarter steps up to two and a half times (the box is the text's own
    // height plus its padding, and as wide as the measure)
    const bw = sigW + 48, bh = 64 + Math.max(lh, SIG.n[1] + (1 + lines.length) * SIG.s[1]), k = Math.min(2.5, Math.floor((1000 / bw) * 4) / 4);
    const big = `<div class="g5-es-big"><p class="c-label c-ink">The signature, at ${k === 2 ? 'twice its size' : `${k * 100}%`}</p>${figFlow(1000 / k, bh, k, S.surface, `<div class="g5-sig-pad">${sig()}</div>`)}</div>`;
    // the message and the signature stacked on the grid, so the second row starts where the taller first-row cell ends
    const story = `<div class="a g5-es" style="left:${px(G.left)};top:${px(y0)};width:1000px">${mail}${specs}${big}</div>`;
    // the appendix, from the floor: one row a line of the signature
    const rows = [['Name', w6, SIG.n, S.text, 'Text'], ['Role', 400, SIG.s, S.quiet, 'Quiet'], ['Contact', 400, SIG.s, S.text, 'Text'], ['Website', 400, SIG.s, S.text, 'Text']];
    const ty = G.floor - 40 - rows.length * 44;
    const th = [['Line', 0], ['Face', 1], ['Size', 2], ['Colour', 3]].map(([t, i]) => E(G.x[i], ty, 'c-folio c-quiet', t, { w: G.col })).join('');
    const tr = rows.map(([f, wt, [z, zl], col, role], i) => `<div class="a g5-row${i === rows.length - 1 ? ' last' : ''}" style="left:${px(G.left)};top:${px(ty + 30 + i * 44)};width:1000px"><p class="c-label">${f}</p><p class="c-cap">${A(B.fonts.body.family)}, weight ${wt}</p><p class="c-mono">${z} / ${zl} px</p><p class="c-cap"><i class="g5-key" style="background:${col}"></i>${A(cname(ctx, col) || role)} <span class="c-mono">${A(col)}</span></p></div>`).join('');
    return page(ctx, 'email-signature', folio(ctx, 'email-signature') + h.html + story + th + hr(G.left, ty + 28, 1000, 1) + tr);
  },

  // ---- digital: the online edition. The address is the headline; the working screen at full size across the measure in a browser's frame;
  // the phone at half size in the fourth column, the notes beside it ----
  digital: (ctx) => {
    const B = ctx.brand, S = ctx.roles.light, url = B.applications.site.url;
    const h = head(ctx, url, { max: 120, min: 64, maxLines: 1, cls: 'b-headxl', k: 1 });
    const deck = E(G.left, h.bottom + 16, 'b-deck', 'The website and the app, built from the UI kit: its components, on its light tokens.', { w: 744 });
    const y0 = h.bottom + 16 + 64 + 40, SH = 680, inner = desktop(ctx);
    const win = `<div class="a g5-win" style="left:${px(G.left)};top:${px(y0)};width:1000px"><div class="g5-win-bar"><span class="c-mono g5-win-u">${A(url)}</span></div>`
      + `<div class="ui g5-win-s" style="height:${SH}px;background:${S.surface}"><!--art--><div class="u3-app">${inner}</div><!--/art--></div></div>`;
    const yB = y0 + 40 + SH + 2, kP = 0.5, PW = 390, PH = 844, pTop = G.floor - PH * kP;
    const ph = `<div class="a g5-fig ui" style="left:${px(G.x[3] + (G.col - PW * kP) / 2)};top:${px(pTop)};width:${px(PW * kP)};height:${px(PH * kP)};background:${S.surface}"><div class="g5-fig-in" style="width:${PW}px;height:${PH}px;zoom:${kP}"><!--art-->${phone(ctx)}<!--/art--></div></div>`;
    const parts = classesIn(inner);
    const yN = yB + 40;
    const notes = col3(G.left, yN, G.col, note('The screen', `Drawn at full size, ${mono('1000 px')} wide, by components.css on the light tokens. Nothing on it is restyled for this page.`))
      + col3(G.x[1], yN, G.col, `<div class="g5-note"><p class="c-label c-ink">The parts in it</p><i class="hr-flow"></i><ul class="g5-parts">${parts.map((p) => `<li class="c-mono">.${A(p)}</li>`).join('')}</ul></div>`, true)
      // the phone's caption, hung from the floor beside it
      + hang(G.x[2], pTop, G.col, `<p class="c-label c-ink">Phone ${mono(`${PW} × ${PH}`)}</p><p class="c-cap c-quiet">The same parts in one column, shown at half size.</p>${jump(ctx, 'summary', 'The brand on one page')}`, true);
    return page(ctx, 'digital', folio(ctx, 'digital') + h.html + deck + win + ph + notes);
  },
};

// a column block on the grid, optionally with the hairline column rule in the gutter to its left
function col3(x, y, w, inner, rule = false) { return `<div class="a colm g5-col" style="left:${px(x)};top:${px(y)};width:${px(w)}">${rule ? '<i class="vr"></i>' : ''}${inner}</div>`; }
// a column block in the flow of a larger block (its rule spans the block, not the cell)
function colFlow(inner, rule = false, style = '') { return `<div class="g5-col" style="position:relative;${style}">${rule ? '<i class="vr"></i>' : ''}${inner}</div>`; }
// a column block hung from the floor: the box runs from y to the floor and sets its text at the bottom
function hang(x, y, w, inner, rule = false) { return `<div class="a g5-hang" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(G.floor - y)}">${colFlow(inner, rule)}</div>`; }

export function css(ctx) {
  const d = ctx.brand.fonts.display, dw = (ctx.faces.filter((x) => x.role === 'display' && x.style !== 'italic').reduce((a, b) => (b.weight > a.weight ? b : a))).weight;
  const b5 = bodyWeight(ctx, 500), b6 = bodyWeight(ctx, 600), b7 = bodyWeight(ctx, 700);
  return `${ctx.kind === 'guidelines' ? `${kitCss(ctx)}\n${screensCss(ctx)}` : ''}
/* lane g5: the applications pages; every rule is under .pg and the g5- prefix */
.pg .g5-col .hr-flow{display:block;height:1px;background:var(--ink)}
.pg .g5-col .c-label+.c-cap{margin-top:4px}
.pg .g5-note+.g5-note{margin-top:24px}
.pg .g5-note .hr-flow{margin:8px 0}
.pg .g5-hang{display:flex;flex-direction:column;justify-content:flex-end}
.pg .g5-side-c{margin-top:8px}
.pg .g5-side-n{display:grid;grid-template-columns:232px 232px;column-gap:24px;align-items:start;margin-top:32px}
.pg .g5-fig{overflow:hidden;box-shadow:0 0 0 .75px var(--hair);isolation:isolate}
.pg .g5-fig-in{position:relative;overflow:hidden}
.pg .g5-pl{font-family:var(--display);font-weight:${dw};font-stretch:${d.stretch || 100}%;letter-spacing:-0.01em;font-variant-numeric:lining-nums}
.pg .g5-pa{font:500 28px/36px var(--body);font-weight:${b5};white-space:nowrap}
.pg .g5-pph{overflow:hidden}
.pg .g5-st{font:700 32px/40px var(--body);font-weight:${b7};box-sizing:border-box}
.pg .g5-sr{box-sizing:border-box;padding-top:24px}
.pg .g5-sr-to{font:500 36px/44px var(--body);font-weight:${b5};white-space:nowrap}
.pg .g5-sr-sub{display:flex;justify-content:space-between;gap:24px;margin-top:8px;font:400 28px/36px var(--body)}
.pg .g5-sr-sub b{font-weight:${b7};white-space:nowrap}
.pg .g5-sb{display:flex;align-items:center;justify-content:center;font:600 40px/48px var(--body);font-weight:${b6}}

/* the feed and the mail client: the platform's frame, a 1 px ink rule round it */
.pg .g5-feed{box-sizing:border-box;border:1px solid var(--ink);background:${PLATFORM};color:var(--ink)}
.pg .g5-feed-h{display:flex;align-items:center;gap:12px;height:64px;padding:0 16px;box-sizing:border-box}
.pg .g5-av{display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;box-shadow:inset 0 0 0 1px var(--hair);flex:none}
.pg .g5-av svg{display:block}
.pg .g5-feed-n{font:600 16px/20px 'Sofia Sans',sans-serif}
.pg .g5-feed-c{font:400 15px/20px 'Sofia Sans',sans-serif;color:var(--quiet)}
.pg .g5-feed-p{position:relative;overflow:hidden;margin:0 -1px}
.pg .g5-feed-a{display:flex;justify-content:space-between;align-items:center;height:48px;padding:0 14px;box-sizing:border-box}
.pg .g5-feed-a span{display:flex;gap:16px}
.pg .g5-feed-a svg{display:block}
.pg .g5-feed-t{font:400 16px/22px 'Sofia Sans',sans-serif;padding:0 16px 16px}
.pg .g5-feed-t b{font-weight:700}
.pg .g5-row{display:grid;grid-template-columns:repeat(4,232px);column-gap:24px;align-items:center;height:44px;border-bottom:.75px solid var(--hair);box-sizing:border-box}
.pg .g5-row.last{border-bottom:1px solid var(--ink)}
.pg .g5-key{display:inline-block;width:12px;height:12px;margin-right:8px;box-shadow:inset 0 0 0 1px var(--hair);vertical-align:-1px}

.pg .g5-mail{box-sizing:border-box;border:1px solid var(--ink);background:${PLATFORM}}
.pg .g5-mail-h{position:relative;padding:16px 24px;border-bottom:.75px solid var(--hair)}
.pg .g5-mh{font:400 16px/28px 'Sofia Sans',sans-serif;color:var(--ink)}
.pg .g5-mh b{font-weight:700}
.pg .g5-mk{display:inline-block;width:80px;color:var(--quiet)}
.pg .g5-mt{position:absolute;right:24px;top:16px;line-height:28px;color:var(--quiet)}
.pg .g5-mail-b{padding:32px 24px 40px}
.pg .g5-mb{font:400 16px/24px var(--body);max-width:600px}
.pg .g5-mb+.g5-mb{margin-top:16px}
.pg .g5-mail-b .g5-sig{margin-top:40px}
.pg .g5-sig{display:flex;align-items:flex-start;gap:16px}
.pg .g5-sig .ar-logo{display:block;flex:none}
.pg .g5-sig-r{display:block;width:1px;align-self:stretch;flex:none}
.pg .g5-sig-t{white-space:nowrap}
.pg .g5-sig-n{font:600 ${SIG.n[0]}px/${SIG.n[1]}px var(--body);font-weight:${b6}}
.pg .g5-sig-s{font:400 ${SIG.s[0]}px/${SIG.s[1]}px var(--body)}
.pg .g5-es{display:grid;grid-template-columns:744px 232px;column-gap:24px;row-gap:48px;align-items:start}
.pg .g5-es-big{grid-column:1/-1}
.pg .g5-es .g5-fig{margin-top:8px}
.pg .g5-sig-pad{padding:32px 24px}

/* digital: a browser's frame round the screen */
.pg .g5-win{box-sizing:border-box;border:1px solid var(--ink);background:${PLATFORM}}
.pg .g5-win-bar{display:flex;align-items:center;height:40px;padding:0 16px;border-bottom:1px solid var(--ink);box-sizing:border-box}
.pg .g5-win-u{color:var(--quiet)}
.pg .g5-win-s{position:relative;overflow:hidden}
.pg .g5-parts{margin-top:0}
`;
}
