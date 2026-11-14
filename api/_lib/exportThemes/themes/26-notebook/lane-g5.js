// Theme 26, Notebook, lane g5: the applications spreads round 1 left out (social, signage, email-signature, digital). business-card is the
// round 1 page and stays as it is. The same notebook: dot-grid leaves, the fold and its thread, and the brand stuck in as prints held by one
// square piece of tape each (three at most a spread). Every spread carries the flat artwork itself, drawn here from the brand's data, and
// where the scene library has a photograph for it, the same art photographed in a working day as the proof:
//   social           no scene: the three posts as prints taped in at their own proportions (square, portrait, story)
//   signage          the hoarding panel's face as one long print taped across the gutter; under it, the panel on a site hoarding
//                    (kerb-hoarding-footpath, cropped wide so the panel stays whole)
//   email-signature  the signature at true size on a cut of the mail's own white; the laptop (bench-laptop-shoulder) cropped tight on the screen
//   digital          the product screen flat, a 1:1 cut of its form card, and the same laptop cropped wide, the whole room, as the proof
// Coordinates are leaf-local (see helpers.js); every print edge lands on a dot and every baseline on a dot row. Every class here starts g5-.
import {
  A, U, px, tokens, brandRoles, readable, nearPaper, block, advance, wrap, fitLines, capRatio, weightName, stick, printHtml, sceneImg, spread, signSpec, photoAt,
} from './helpers.js';
import { kitCss } from './lane-u1.js';
import { artKit } from './art.js';

const title = (ctx, id) => (ctx.pages.find((p) => p.id === id) || {}).title || '';
const r1 = (n) => Math.round(n * 10) / 10;
const snapUp = (n) => Math.ceil(n / U - 1e-6) * U;

// ---------------------------------------------------------------- the brand's own art (every colour, face, size and word from ctx)

function artStyle(ctx) {
  const B = ctx.brand, W = ctx.weights, d = B.fonts.display, b = B.fonts.body;
  const stretch = d.stretch ? `font-stretch:${d.stretch}%;` : '';
  const bodyStem = (w) => {
    const f = ctx.faces.find((x) => x.role === 'body' && x.style !== 'italic' && x.weight === w);
    if (!f) throw new Error(`g5: no body face at ${w}`);
    return f.stem;
  };
  return {
    dStem: tokens(ctx)._displayStem, bodyStem,
    disp: (size, lh, color) => `font-family:'${d.family}',sans-serif;font-weight:${W.heading};${stretch}font-size:${size}px;line-height:${lh}px;color:${color};`,
    body: (size, lh, weight, color) => `font-family:'${b.family}',sans-serif;font-weight:${weight};font-size:${size}px;line-height:${lh}px;color:${color};`,
    abs: (style, inner) => `<div style="position:absolute;${style}">${inner}</div>`,
    lines: (arr) => arr.map((s) => `<span style="display:block;white-space:nowrap">${A(s)}</span>`).join(''),
  };
}
// the colour's name in the palette, by hex (for the notes); the hex when the palette has no such colour
const colourName = (ctx, hex) => (ctx.brand.colours.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase()) || {}).name || hex;
// the logo colourway whose ground is the given colour, by data (no colourway id is named)
const colourwayOn = (ctx, hex) => Object.keys(ctx.brand.logo.colourways).find((k) => String(ctx.brand.logo.colourways[k].ground).toLowerCase() === hex.toLowerCase());
const logoH = (ctx, id, w) => w * ctx.logo.geos[id].h / ctx.logo.geos[id].w;

// the display line at the largest size (stepping by 4) that sets in maxLines across w and in h of height
function fitDisplay(S, text, w, h, maxSize, maxLines) {
  for (let size = maxSize; size >= 24; size -= 4) {
    const ls = wrap(S.dStem, size, text, w, 0);
    if (ls.length <= maxLines && ls.length * size <= h && ls.every((l) => advance(S.dStem, size, l, 0) <= w + 0.5)) return { size, ls };
  }
  return { size: 24, ls: wrap(S.dStem, 24, text, w, 0) };
}

// ---- social posts, drawn at 1080 wide. Each takes one of the brand's social lines whole, on its own ground. ----
const POSTS = [
  { id: 'square', w: 1080, h: 1080, name: 'Square post' },
  { id: 'portrait', w: 1080, h: 1350, name: 'Portrait post' },
  { id: 'story', w: 1080, h: 1920, name: 'Story' },
];
const STORY_SAFE = 250;      // the story keeps its type this far from the top and bottom, where the app draws its controls
function postGrounds(ctx) {
  const R = brandRoles(ctx), cw = ctx.brand.logo.colourways;
  const onAction = colourwayOn(ctx, R.action);
  return [
    { ground: R.ground.hex, cw: 'colour', ink: cw.colour.name },
    { ground: cw.reversed.ground, cw: 'reversed', ink: cw.reversed.name },
    onAction ? { ground: R.action, cw: onAction, ink: cw[onAction].name } : { ground: cw.reversed.ground, cw: 'reversed', ink: cw.reversed.name },
  ];
}
function post(ctx, i) {
  const B = ctx.brand, W = ctx.weights, S = artStyle(ctx), P = POSTS[i], G = postGrounds(ctx)[i], L = ctx.roles.light;
  const line = B.applications.social[i] || B.lines.primary;
  const ink = readable(ctx, G.ground, [G.ink, L.text, ctx.brand.logo.colourways.reversed.name], `g5 ${P.id} post line`);
  const mg = 88, top = P.id === 'story' ? STORY_SAFE : mg, bot = P.id === 'story' ? STORY_SAFE : mg;
  const lw = P.id === 'square' ? 330 : 300, lid = 'horizontal', lh = logoH(ctx, lid, lw);
  const room = P.h - top - bot - lh - 96;
  const f = fitDisplay(S, line, P.w - 2 * mg, room, P.id === 'story' ? 176 : 136, P.id === 'story' ? 5 : 4);
  const urlSize = 32;
  const inner = `<div style="position:absolute;left:0;top:0;width:${P.w}px;height:${P.h}px;background:${G.ground}">`
    + S.abs(`left:${mg}px;top:${top}px;${S.disp(f.size, f.size, ink)}`, S.lines(f.ls))
    + S.abs(`left:${mg}px;bottom:${bot}px`, ctx.logo.html(lid, { width: lw, colourway: G.cw, color: ink }))
    + S.abs(`right:${mg}px;bottom:${bot + (lh - 40) / 2}px;${S.body(urlSize, 40, W.strong, ink)}white-space:nowrap`, A(B.applications.site.url))
    + '</div>';
  return { inner, w: P.w, h: P.h, size: f.size, urlSize, ground: G.ground };
}

// ---- the hoarding panel: 1034 x 304 (3.4 : 1, the panel's own shape), reversed. The brand's line flush left at the largest size that sets
// in two lines; the address top right, the horizontal logo bottom right ----
const HOARD = { w: 1034, h: 304 };
function hoarding(ctx) {
  const B = ctx.brand, W = ctx.weights, S = artStyle(ctx), rev = B.logo.colourways.reversed;
  const ink = readable(ctx, rev.ground, [rev.name], 'g5 hoarding line');
  const mg = 38, lw = 228, lh = logoH(ctx, 'horizontal', lw), gap = 57;
  const f = fitDisplay(S, B.lines.primary, HOARD.w - 2 * mg - lw - gap, HOARD.h - 2 * mg, 112, 2);
  const urlSize = 16;
  const inner = `<div style="position:absolute;left:0;top:0;width:${HOARD.w}px;height:${HOARD.h}px;background:${rev.ground}">`
    + S.abs(`left:${mg}px;top:${mg}px;${S.disp(f.size, f.size, ink)}`, S.lines(f.ls))
    + S.abs(`right:${mg}px;top:${mg}px;${S.body(urlSize, 19, W.strong, ink)}white-space:nowrap`, A(B.applications.site.url))
    + S.abs(`right:${mg}px;bottom:${mg}px`, ctx.logo.html('horizontal', { width: lw, colourway: 'reversed', color: ink }))
    + '</div>';
  return { inner, size: f.size, n: f.ls.length, mg, lw, urlSize, ground: rev.ground };
}

// ---- the email signature at true size: name and role, the address lines, the horizontal logo 24 px tall ----
function signature(ctx) {
  const B = ctx.brand, W = ctx.weights, S = artStyle(ctx), L = ctx.roles.light, e = B.applications.email, c = B.applications.card;
  const quiet = readable(ctx, L.surface, [L.quiet, L.text], 'g5 signature role');
  const contact = c && c.person === e.person ? c.contact : '';
  const rows = [
    { t: e.person, size: 15, lh: 20, w: W.strong, col: L.text, gap: 0 },
    { t: e.role, size: 13, lh: 20, w: W.regular, col: quiet, gap: 0 },
    ...(contact ? [{ t: contact, size: 13, lh: 20, w: W.regular, col: L.text, gap: 12 }] : []),
    { t: B.applications.site.url, size: 13, lh: 20, w: W.regular, col: L.text, gap: contact ? 0 : 12 },
  ];
  const logoHt = 24, logoW = Math.min(200, logoHt * ctx.logo.geos.horizontal.w / ctx.logo.geos.horizontal.h);
  let y = 0, html = '', wMax = logoW;
  for (const r of rows) {
    y += r.gap;
    html += S.abs(`left:0;top:${y}px;${S.body(r.size, r.lh, r.w, r.col)}white-space:nowrap`, A(r.t));
    wMax = Math.max(wMax, advance(S.bodyStem(r.w), r.size, r.t));
    y += r.lh;
  }
  y += 16;
  html += S.abs(`left:0;top:${y}px`, ctx.logo.html('horizontal', { width: logoW }));
  const h = y + logo(ctx, logoW);
  return { html, w: Math.ceil(wMax), h: Math.ceil(h), rows, logoW, logoHt: r1(logo(ctx, logoW)), quiet, contact };
}
const logo = (ctx, w) => logoH(ctx, 'horizontal', w);

// ---- the mail open on the laptop, 1024 x 640 (the screen's 1.6 : 1): the brand's sample headline as the subject, the sender, the sample
// paragraph and the signature under it at its own size ----
function mailScreen(ctx) {
  const B = ctx.brand, W = ctx.weights, S = artStyle(ctx), L = ctx.roles.light, e = B.applications.email, t = B.type.sample;
  const sig = signature(ctx), quiet = sig.quiet, X = 96, CW = 640;
  const para = wrap(S.bodyStem(W.regular), 17, t.paragraph, CW);
  let y = 64, inner = '';
  inner += S.abs(`left:${X}px;top:${y}px;${S.body(28, 36, W.strong, L.text)}white-space:nowrap`, A(t.headline)); y += 60;
  inner += S.abs(`left:${X}px;top:${y}px;${S.body(16, 24, W.strong, L.text)}white-space:nowrap`, A(e.person)
    + (sig.contact ? ` <span style="font-weight:${W.regular};color:${quiet}">${A(sig.contact)}</span>` : ''));
  inner += S.abs(`left:${X + CW - 200}px;top:${y}px;width:200px;text-align:right;${S.body(16, 24, W.regular, quiet)}`, A(B.ui.screen.content.time)); y += 44;
  inner += S.abs(`left:${X}px;top:${y}px;width:${CW}px;height:1px;background:${L.divider}`, ''); y += 32;
  inner += S.abs(`left:${X}px;top:${y}px;${S.body(17, 28, W.regular, L.text)}`, S.lines(para)); y += para.length * 28 + 40;
  inner += S.abs(`left:${X}px;top:${y}px;width:${sig.w}px;height:${sig.h}px`, sig.html);
  if (y + sig.h > 600) throw new Error('g5: the mail does not fit the laptop screen');
  return { html: `<div style="position:absolute;left:0;top:0;width:1024px;height:640px;background:${L.surface}">${inner}</div>`, w: 1024, h: 640 };
}

// ---- the product screen, 1280 x 800 (1.6 : 1), built from the UI kit's components at 1:1, light ----
const SCR = { w: 1280, h: 800 };
function formCard(ctx) {
  const S = ctx.brand.ui.screen.content, F = S.form, ui = ctx.ui;
  const form = `<div class="g5-form">${ui.field({ id: 'g5-f1', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[0] })}`
    + `${ui.field({ id: 'g5-f2', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
  return ui.card({ title: F.title, raised: true, action: form });
}
function productScreen(ctx) {
  const S = ctx.brand.ui.screen.content, X = { links: [], account: 'Account', ...(S.example || {}) }, ui = ctx.ui;
  const live = (ctx.status.find((s) => s.label === S.status) || {}).id || S.deliveries[0].status;
  const p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  const lw = Math.min(150, 28 * ctx.logo.geos.horizontal.w / ctx.logo.geos.horizontal.h);
  const bar = `<nav class="ui-topbar" aria-label="Main"><span class="g5-logo" style="width:${px(lw)}">${ctx.logo.html('horizontal', { width: lw })}</span>`
    + `<div class="ui-topbar__links">${ui.links(X.links, 0)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
  const left = `<div class="g5-live">${ui.statusChip(live)}<h2 class="ui-display g5-eta">${A(S.eta)}</h2><p class="g5-soft">${A(S.pickup)}</p>`
    + `<div class="g5-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div>`
    + `<div class="g5-ends ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`
    + `<div class="g5-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="g5-who"><p class="g5-b">${A(S.rider)}</p><p class="g5-q ui-num">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div></div>`;
  const html = `<div class="ui g5-scr" style="width:${SCR.w}px;height:${SCR.h}px">${bar}<div class="g5-main">${left}<div class="g5-side">${formCard(ctx)}</div></div><div class="g5-rows">${ui.deliveryRows(3)}</div></div>`;
  return { html, w: SCR.w, h: SCR.h };
}

// ---------------------------------------------------------------- the notebook around the art

// a print holding flat art drawn at aw x ah, zoomed to the print's width (the art's aspect is the print's, within a pixel)
function flatPrint(ctx, { x, y, w, h, art, aw, ah, label, ground }) {
  const k = w / aw;
  if (Math.abs(ah * k - h) > 1.5) throw new Error(`g5: ${label}: ${aw} x ${ah} art does not fit a ${w} x ${h} print`);
  const edge = ground && nearPaper(ctx, ground) ? ' g5-edge' : '';
  return `<div class="print stuck g5-flat${edge}" style="left:${px(x)};top:${px(y)};width:${w}px;height:${h}px" role="img" aria-label="${A(label)}">`
    + `<div class="g5-zoom" style="width:${aw}px;height:${ah}px;zoom:${k}">${art}</div></div>`;
}
// a crop of a scene at scale s, centred on (cx, cy) in scene pixels, held inside the scene
function cropAt(sc, pw, ph, s, cx, cy) {
  const iw = sc.w * s, ih = sc.h * s, cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return { iw, ih, left: cl(pw / 2 - cx * s, pw - iw, 0), top: cl(ph / 2 - cy * s, ph - ih, 0) };
}
const quadBox = (sc) => {
  const pts = sc.quads[0].corners;
  const x1 = Math.min(...pts.map((p) => p[0])), x2 = Math.max(...pts.map((p) => p[0])), y1 = Math.min(...pts.map((p) => p[1])), y2 = Math.max(...pts.map((p) => p[1]));
  return { x1, x2, y1, y2, w: x2 - x1, h: y2 - y1, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 };
};
// notes as an appendix: a label in the chrome's strong face, its text beside it; returns the html and the baseline after the last row
function notes(T, { x, baseline, rows, labelW = 95, w = 475 }) {
  let html = '', bl = baseline;
  const tx = x + labelW + U, tw = w - labelW - U;
  for (const [k, v] of rows) {
    const ls = wrap(T['c-note'].stem, 13, v, tw);
    html += block(T['c-strong'], { x, w: labelW, baseline: bl, lines: [k], cls: 'c-strong' }).html
      + block(T['c-note'], { x: tx, w: tw, baseline: bl, lines: ls, cls: 'c-note g5-ink' }).html;
    bl += U * (ls.length + 1);
  }
  return { html, end: bl - U };
}
const head = (T, text, baseline = 93) => block(T['b-title'], { x: 42, w: 475, lines: [text], baseline, cls: 'b-title' }).html;

export const guidelines = {
  // ---- social: the square post taped large on the verso; the portrait and the story side by side on the recto under the title, their
  // tops level; what the three share as notes on the recto's last rows ----
  social: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, W = ctx.weights, posts = POSTS.map((_, i) => post(ctx, i));
    const at = [{ x: 42, y: 112, w: 456, h: 456 }, { x: 42, y: 150, w: 228, h: 285 }, { x: 289, y: 150, w: 171, h: 304 }];
    const piece = (i) => {
      const P = at[i], a = posts[i], name = `${POSTS[i].name}, ${POSTS[i].w} x ${POSTS[i].h} px`;
      return flatPrint(ctx, { ...P, art: a.inner, aw: a.w, ah: a.h, label: `${B.name} ${POSTS[i].name.toLowerCase()}`, ground: a.ground })
        + stick(T, { ...P, label: name });
    };
    const vc = piece(0);
    let rc = head(T, title(ctx, 'social')) + piece(1) + piece(2);
    const g = posts.map((p) => colourName(ctx, p.ground));
    const minPx = Math.min(...posts.map((p) => p.urlSize));
    rc += notes(T, {
      x: 42, baseline: 549, rows: [
        ['Grounds', `The square on ${g[0]}, the portrait on ${g[1]}, the story on ${g[2]}. One line a post, never two.`],
        ['Type', `The line in ${B.fonts.display.family} ${weightName(W.heading)}, the address in ${B.fonts.body.family}. Nothing on a post is smaller than ${minPx} px at full size.`],
        ['Story', `The type stays ${STORY_SAFE} px clear of the top and the bottom, where the app draws its own controls.`],
      ],
    }).html;
    return spread(ctx, 'social', { verso: vc, recto: rc });
  },

  // ---- signage: the panel's face as one long print taped across both leaves, the hero; under it on the verso the panel photographed on a
  // site hoarding, and on the recto how the face is built, measured from the art ----
  signage: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, W = ctx.weights, ss = signSpec(ctx);
    if (ss.poster) {
      // a brand whose sign is a poster (a bus shelter panel): the poster itself, large, on the verso; the photograph of the street it lives on
      // and how the face is built on the recto
      const aw = 593, ah = Math.round(aw / 0.677), sg = artKit(ctx).sign(aw, ah, ss.line);
      const pw = 373, ph = 551, pic = { x: 42, y: 74 };
      const sLabel = B.applications.signage.split(':')[0];
      let vc = flatPrint(ctx, { x: pic.x, y: pic.y, w: pw, h: ph, art: sg.inner, aw, ah, label: `${B.name} poster`, ground: sg.ground })
        + `<div class="tape piece" style="left:${px(pic.x - U)};top:${px(pic.y - U / 2)};width:${5 * U}px;height:${U}px"></div>`
        + block(T['c-note'], { x: 42, w: 456, baseline: pic.y + ph + U, lines: [`${sLabel}: the poster face`], cls: 'c-note' }).html;
      const shot = (B.imagery.shots || []).find((s) => s.id === 'busstop') || (B.imagery.shots || []).filter((s) => s.photo)[2];
      const P = { x: 42, y: 74, w: 456, h: 304 };
      let rc = '';
      if (shot && shot.photo) {
        rc += `<div class="print stuck" style="left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px">${photoAt(ctx, shot.id, { style: 'width:100%;height:100%' })}</div>`
          + `<div class="tape piece" style="left:${px(P.x - U)};top:${px(P.y - U / 2)};width:${5 * U}px;height:${U}px"></div>`
          + block(T['c-note'], { x: 42, w: 456, baseline: P.y + P.h + U, lines: [shot.caption || shot.alt], cls: 'c-note' }).html;
      }
      const lwPct = Math.round(100 * 240 / aw), mgPct = Math.round(100 * 40 / aw);
      rc += notes(T, {
        x: 42, baseline: 454, rows: [
          ['Main sign', B.applications.signage],
          ['The line', `${B.fonts.display.family} ${weightName(W.heading)}, flush left across the top of the poster.`],
          ['The logo', `Horizontal, reversed, bottom left, ${lwPct}% of the poster's width.`],
          ['Address', `${B.fonts.body.family} ${weightName(W.strong)}, left, above the logo.`],
          ['Margin', `${mgPct}% of the poster's width on the left and at the foot.`],
        ],
      }).html;
      return spread(ctx, 'signage', { verso: vc, recto: rc });
    }
    const hd = hoarding(ctx);
    const band = { x: 42, y: 74, w: HOARD.w, h: HOARD.h };
    const asp = r1(HOARD.w / HOARD.h);
    let vc = flatPrint(ctx, { ...band, art: hd.inner, aw: HOARD.w, ah: HOARD.h, label: `${B.name} hoarding panel`, ground: hd.ground }).replace('g5-flat', 'g5-flat g5-band')
      + `<div class="tape piece g5-bandtape" style="left:${px(band.x - U)};top:${px(band.y - U / 2)};width:${5 * U}px;height:${U}px"></div>`
      + block(T['c-note'], { x: 42, w: 456, baseline: band.y + band.h + U, lines: [`Hoarding panel, ${asp} : 1, the face at full width`], cls: 'c-note' }).html;
    // the photograph: the panel on its hoarding, cropped so the panel spans 84% of the print and the scaffold above it is cut away
    const sc = ctx.sceneInfo('kerb-hoarding-footpath'), q = quadBox(sc);
    const art = ctx.artPage(`<div style="position:absolute;left:0;top:0;width:${HOARD.w}px;height:${HOARD.h}px;zoom:1.5">${hd.inner}</div>`, { w: HOARD.w * 1.5, h: HOARD.h * 1.5 });
    const url = ctx.mockup('kerb-hoarding-footpath', [{ html: art, w: HOARD.w * 1.5, h: HOARD.h * 1.5 }]);
    const P = { x: 42, y: 435, w: 456, h: 285 }, s = 0.76 * P.w / q.w;
    const crop = cropAt(sc, P.w, P.h, s, q.cx, q.y1 - 19 / s + P.h / 2 / s);
    vc += printHtml({ ...P, inner: sceneImg(url, crop, 'The panel on a site hoarding'), label: 'The panel on a site hoarding' })
      + stick(T, { ...P, label: 'On a site hoarding, at the footpath' });

    const capPct = Math.round(100 * capRatio(T._displayStem) * hd.size / HOARD.h);
    const logoPct = Math.round(100 * hd.lw / HOARD.w), mgPct = Math.round(100 * hd.mg / HOARD.h);
    const rc = notes(T, {
      x: 42, baseline: 454, rows: [
        ['Main sign', B.applications.signage],
        ['The line', `${B.fonts.display.family} ${weightName(W.heading)}, flush left in ${hd.n === 1 ? 'one line' : `${hd.n} lines`}. Its capitals are ${capPct}% of the panel's height.`],
        ['The logo', `Horizontal, reversed, bottom right, ${logoPct}% of the panel's width.`],
        ['Address', `${B.fonts.body.family} ${weightName(W.strong)}, top right, level with the line's first row.`],
        ['Margin', `${mgPct}% of the panel's height on all four sides. Any length of panel keeps the same three parts in the same corners.`],
      ],
    }).html;
    return spread(ctx, 'signage', { verso: vc, recto: rc });
  },

  // ---- email-signature: the laptop on the bench, cropped tight on the open mail, taped on the verso with the plain-text version under it;
  // the signature at true size on the recto, on a cut of the mail's own white, and how it is set ----
  'email-signature': (ctx) => {
    const T = tokens(ctx), B = ctx.brand, W = ctx.weights, L = ctx.roles.light, sig = signature(ctx), mail = mailScreen(ctx);
    const sc = ctx.sceneInfo('bench-laptop-shoulder'), q = quadBox(sc);
    const url = ctx.mockup('bench-laptop-shoulder', [{ html: ctx.artPage(mail.html, { w: mail.w, h: mail.h }), w: mail.w, h: mail.h }]);
    const P = { x: 42, y: 112, w: 456, h: 418 };
    let vc = printHtml({ ...P, inner: sceneImg(url, cropAt(sc, P.w, P.h, 0.9 * P.w / q.w, q.cx, q.cy + 40), 'The signature in a mail, on a laptop'), label: 'The signature in a mail, on a laptop' })
      + stick(T, { ...P, label: 'In a mail, on the bench' });
    const plain = sig.rows.map((r) => r.t);
    vc += block(T['c-strong'], { x: 42, w: 228, baseline: 625, lines: ['Plain text'], cls: 'c-strong' }).html
      + block(T['c-mono'], { x: 175, w: 342, baseline: 625, lines: plain, cls: 'c-mono' }).html;

    let rc = head(T, title(ctx, 'email-signature'));
    const pad = 38, S = { x: 42, y: 150, w: snapUp(sig.w + 2 * pad), h: snapUp(sig.h + 2 * pad) };
    rc += `<div class="print stuck${nearPaper(ctx, L.surface) ? ' g5-edge' : ''}" style="left:${S.x}px;top:${S.y}px;width:${S.w}px;height:${S.h}px;background:${L.surface}" role="img" aria-label="${A(`${B.name} email signature at full size`)}">`
      + `<div style="position:absolute;left:${pad}px;top:${px((S.h - sig.h) / 2)};width:${sig.w}px;height:${sig.h}px">${sig.html}</div></div>`
      + stick(T, { ...S, label: `At full size, ${sig.w} px wide` });
    const [n, r] = sig.rows;
    rc += notes(T, {
      x: 42, baseline: S.y + S.h + 3 * U, rows: [
        ['Name', `${B.fonts.body.family} ${weightName(n.w)}, ${n.size} px, in ${colourName(ctx, n.col)}.`],
        ['Role', `${B.fonts.body.family} ${weightName(r.w)}, ${r.size} px, in ${colourName(ctx, r.col)}.`],
        ['Logo', `Horizontal, ${sig.logoHt} px tall, under the address, linked to ${B.applications.site.url}.`],
        ['Leave out', 'No quote, no banner, no second logo. The plain-text version goes where the mail has no formatting.'],
      ],
    }).html;
    return spread(ctx, 'email-signature', { verso: vc, recto: rc });
  },

  // ---- digital: the product screen flat on the verso under the title, with the same laptop as the email spread cropped wide (the room, not
  // the screen) under it; the screen's form card cut out at 1:1 on the recto, with what it is built from ----
  digital: (ctx) => {
    const T = tokens(ctx), B = ctx.brand, scr = productScreen(ctx), F = B.ui.screen.content.form, R = brandRoles(ctx), L = ctx.roles.light;
    let vc = head(T, title(ctx, 'digital'));
    // the screen printed on the brand's panel colour with a one-unit border, so the tape holds the border and never the top bar's logo
    const P = { x: 42, y: 112, w: 456, h: 304 }, panel = (B.colours.find((c) => c.role === 'panel') || { hex: L.surface }).hex, k = (P.w - 2 * U) / scr.w;
    vc += `<div class="print stuck${nearPaper(ctx, panel) ? ' g5-edge' : ''}" style="left:${P.x}px;top:${P.y}px;width:${P.w}px;height:${P.h}px;background:${panel}" role="img" aria-label="${A(`${B.name} product screen`)}">`
      + `<div class="g5-zoom" style="position:absolute;left:${U / k}px;top:${U / k}px;width:${scr.w}px;height:${scr.h}px;zoom:${k}">${scr.html}</div></div>`
      + stick(T, { ...P, label: `The screen at ${scr.w} x ${scr.h} px, from the UI kit` });
    const sc = ctx.sceneInfo('bench-laptop-shoulder');
    const url = ctx.mockup('bench-laptop-shoulder', [{ html: ctx.artPage(scr.html, { w: scr.w, h: scr.h }), w: scr.w, h: scr.h }]);
    const Q = { x: 42, y: 492, w: 342, h: 228 };
    vc += printHtml({ ...Q, inner: sceneImg(url, cropAt(sc, Q.w, Q.h, Q.w / sc.w, sc.w / 2, sc.h / 2), 'The screen on a laptop at a shared bench'), label: 'The screen on a laptop at a shared bench' })
      + stick(T, { ...Q, label: 'At the shared bench' });

    const C = { x: 42, y: 74, w: 418, h: 361 };
    let rc = `<div class="print stuck g5-cut${nearPaper(ctx, L.surface) ? ' g5-edge' : ''}" style="left:${C.x}px;top:${C.y}px;width:${C.w}px;height:${C.h}px;background:${L.surface}" role="img" aria-label="${A(`${F.title}, at full size`)}">`
      + `<div class="ui g5-cutin">${formCard(ctx)}</div></div>`
      + stick(T, { ...C, label: 'The form card at 1:1' });
    rc += notes(T, {
      x: 42, baseline: C.y + C.h + 3 * U, rows: [
        ['Built from', 'The top bar, a status chip, the progress bar, a list and a card with two fields, all from the UI kit as it ships. Nothing is restyled for the page.'],
        ['One action', `${F.book} is the only filled button on the screen, in ${R.actionName}.`],
        ['Sizes', `Drawn at ${scr.w} px wide. The cut above is at 1:1, as it renders in a browser.`],
      ],
    }).html;
    return spread(ctx, 'digital', { verso: vc, recto: rc });
  },
};

export function css(ctx) {
  // the shipped component styles and tokens, for the screen on the digital spread (lane u1 writes them for the UI kit document only)
  const kit = ctx.kind === 'guidelines' ? kitCss(ctx) : '';
  return `${kit}
.pg .g5-ink{color:var(--graphite-ink)}
.pg .g5-flat .g5-zoom{position:absolute;left:0;top:0}
.pg .g5-edge{outline:1px solid var(--fold);outline-offset:-1px}
.pg .leaf>.g5-band{z-index:6}
.pg .leaf>.g5-bandtape{z-index:7}
.pg .g5-cutin{position:absolute;left:0;top:0;right:0;bottom:0;padding:38px;box-sizing:border-box}
.pg .g5-scr{position:relative;display:flex;flex-direction:column;overflow:hidden;background:var(--surface)}
.pg .g5-scr .ui-topbar{padding-left:48px;padding-right:48px}
.pg .g5-logo{display:block;flex:none}
.pg .g5-main{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:64px;padding:48px 48px 0}
.pg .g5-live{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-width:0}
.pg .g5-live>*{max-width:100%}
.pg .g5-eta{margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .g5-soft{margin:0;color:var(--text-soft);max-width:44ch}
.pg .g5-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.pg .g5-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .g5-rider{width:100%;display:flex;align-items:center;gap:12px}
.pg .g5-who{flex:1;min-width:0}
.pg .g5-b{margin:0;font-weight:600;line-height:var(--lh-label)}
.pg .g5-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .g5-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.pg .g5-rows{padding:32px 48px 0}
`;
}
