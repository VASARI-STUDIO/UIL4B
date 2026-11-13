// Theme 24, Standards, lane g5: the applications pages (social, signage, email-signature) that sit beside business-card and digital.
// The device stays the theme's own: the drawing, then the thing. Each page holds the flat art, drawn at one stated scale with crop
// ticks and dimension lines (screen work in x, print in mm from the brand's own size), and the photographed scene as its proof.
// Nothing is drawn on a photograph; the ruler stops at a photo's edge. Every art is HTML, so the drawing on the page and the art on
// the photographed surface are one markup; brand strings are printed whole through A() and only measured, never cut.
// A sign whose brand size is not the shape of the boards photographed is measured in x as drawn, never given millimetres.
import { A, G, f2, xOf, fx, half, roles, adv, wrap, displayFont, loadFont, capHeight, blk, fill, dimH, dimV, cropTicks, ruler, tab, head, page, colourwayFor } from './helpers.js';
import { signScenes, signLine, signScene, signWhere, sceneClearX } from './scene-pick.js';

const WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n) => WORD[n] || String(n);
const pg = (ctx, id) => ctx.pages.find((q) => q.id === id);
const topW = (f) => f.weights[f.weights.length - 1];
const dfont = (ctx) => displayFont(ctx, topW(ctx.brand.fonts.display));
const dispStyle = (ctx) => `font-family:var(--display);font-weight:${topW(ctx.brand.fonts.display)};font-stretch:${ctx.brand.fonts.display.stretch || 100}%`;
const bodyFace = (ctx, w) => {
  const fs = ctx.faces.filter((f) => f.role === 'body' && f.style !== 'italic');
  return loadFont(fs.reduce((b, f) => (Math.abs(f.weight - w) < Math.abs(b.weight - w) ? f : b)).stem);
};
const chrome = (w) => loadFont(`PublicSans-${w}`);
// the largest size at which text sets in at most maxLines lines inside w (4% slack, so the browser's own break never adds a line)
function fit(font, text, w, sizes, maxLines) {
  for (const s of sizes) { const l = wrap(font, text, s, w * 0.96); if (l.length <= maxLines) return { size: s, n: l.length }; }
  const s = sizes[sizes.length - 1]; return { size: s, n: wrap(font, text, s, w * 0.96).length };
}
const tok = (ctx, id) => (ctx.brand.type.scale || []).find((t) => t.token === id) || { size: 14, line: 1.4, weight: 400 };
const mmOf = (v) => `${Math.round(v)} mm`;

// the logo inside an art: the real logo in the colourway whose ground is bg, or in the slot edition a dashed frame of the same size
function artLogo(ctx, id, bg, ink, w) {
  const g = ctx.logo.geos[id], h = (w * g.h) / g.w;
  if (ctx.edition === 'slot') return `<span style="display:block;width:${f2(w)}px;height:${f2(h)}px;box-sizing:border-box;border:${f2(Math.max(1.5, w / 120))}px dashed ${ink}"></span>`;
  return ctx.logo.svg(id, { colourway: colourwayFor(ctx, bg), width: f2(w) });
}
// an art drawn on the page at scale k: the same markup the photographed surface carries, zoomed (zoom keeps the PDF at 1:1)
const drawn = (x, y, art, k, extra = '') => `<div class="a g5-dr" style="left:${f2(x)}px;top:${f2(y)}px;width:${f2(art.w * k)}px;height:${f2(art.h * k)}px;${extra}"><div style="zoom:${k};width:${art.w}px;height:${art.h}px">${art.inner}</div></div>`;
// a photographed scene in a window (page px), zoomed so its surface fills `share` of the window's height, centred on the surface
function photo(ctx, url, sceneId, x, y, w, h, share, alt) {
  const sc = ctx.sceneInfo(sceneId), q = sc.quads[0].corners, xs = q.map((c) => c[0]), ys = q.map((c) => c[1]);
  const qh = Math.max(...ys) - Math.min(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const sx = sceneClearX(sceneId), k = Math.max((share * h) / qh, w / (sc.w * sx), h / sc.h), cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const left = cl(w / 2 - cx * k, w - sc.w * k * sx, 0), top = cl(h / 2 - cy * k, h - sc.h * k, 0);
  return `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden"><img src="${A(url)}" alt="${A(alt)}" style="position:absolute;left:${f2(left)}px;top:${f2(top)}px;width:${f2(sc.w * k)}px;height:${f2(sc.h * k)}px;max-width:none"></div>`;
}

export const css = () => `
.pg .g5-dr{overflow:hidden}
.pg .g5-art{position:relative;overflow:hidden;box-sizing:border-box}
.pg .g5-art .g5-ln{position:absolute;margin:0;letter-spacing:-0.01em;text-wrap:wrap}
.pg .g5-art .g5-lg{position:absolute;line-height:0}
.pg .g5-art .g5-lg svg{display:block}
.pg .g5-mail{background:var(--g5-raised);border:1px solid var(--hair)}
.pg .g5-hd{display:flex;gap:16px;white-space:nowrap}
.pg .g5-hd span:first-child{width:56px;flex:none}
.pg .g5-msg p{margin:0 0 12px;max-width:520px;font-family:var(--body);font-weight:400}
.pg .g5-sig{font-family:var(--body)}
.pg .g5-sig p{margin:0;white-space:nowrap}
`;

// ---- the sign face at w x h art px: the field, the brand's line top-left a fifteenth of the width in, the logo a third of the width at the foot.
// Upright boards take more lines than the frame's two, so the line sets at the largest of 0.12 to 0.06 of the height in at most four. ----
function signFace(ctx, w, h) {
  const R = roles(ctx), B = ctx.brand, inset = w / 15, room = w - 2 * inset, lw = w / 3, font = dfont(ctx);
  const SL = signLine(ctx), ln = fit(font, SL, room, [0.12, 0.11, 0.10, 0.09, 0.08, 0.07, 0.06].map((k) => Math.round(k * h)), 4);
  const inner = `<div class="g5-art" style="width:${w}px;height:${h}px;background:${R.field};color:${R.fieldInk}">`
    + `<p class="g5-ln" style="left:${f2(inset)}px;top:${f2(inset)}px;width:${f2(room)}px;${dispStyle(ctx)};font-size:${ln.size}px;line-height:${f2(ln.size * 1.02)}px">${A(SL)}</p>`
    + `<div class="g5-lg" style="left:${f2(inset)}px;bottom:${f2(inset)}px;width:${f2(lw)}px">${artLogo(ctx, 'colour', R.field, R.fieldInk, lw)}</div></div>`;
  return { w, h, inner, inset, lw, size: ln.size, cap: capHeight(font, ln.size) };
}

// ---- a social post at its true px size. Square on the ground, portrait on the dark, story on the field; one of the brand's social lines each ----
const FORMATS = [
  { id: 'square', name: 'Square', w: 1080, h: 1080, maxL: 4 },
  { id: 'portrait', name: 'Portrait', w: 1080, h: 1350, maxL: 4 },
  { id: 'story', name: 'Story', w: 1080, h: 1920, maxL: 5 },
];
function post(ctx, f, i) {
  const R = roles(ctx), S = ctx.brand.applications.social || [ctx.brand.lines.primary], text = S[i % S.length];
  const [bg, ink] = [[R.ground, R.ink], [R.dark, R.darkInk], [R.field, R.fieldInk]][i % 3], pad = 96, font = dfont(ctx);
  const ln = fit(font, text, f.w - 2 * pad, [176, 160, 144, 128, 112, 100, 88, 76], f.maxL), lh = f2(ln.size * 1.02);
  const line = (pos) => `<p class="g5-ln" style="left:${pad}px;${pos};width:${f.w - 2 * pad}px;${dispStyle(ctx)};font-size:${ln.size}px;line-height:${lh}px">${A(text)}</p>`;
  const logo = (pos, w) => `<div class="g5-lg" style="left:${pad}px;${pos};width:${w}px">${artLogo(ctx, 'colour', bg, ink, w)}</div>`;
  const body = f.id === 'square' ? line(`top:${pad}px`) + logo(`bottom:${pad}px`, 380)
    : f.id === 'portrait' ? logo(`top:${pad}px`, 320) + line(`bottom:${pad}px`)
      : line('top:420px') + logo('bottom:300px', 380);
  return { w: f.w, h: f.h, bg, ink, inner: `<div class="g5-art" style="width:${f.w}px;height:${f.h}px;background:${bg};color:${ink}">${body}</div>` };
}
// the story as it plays on the phone (390 x 844): a status row, the story at 390 wide with its progress marks and the brand's name over its
// clear top band, and the reply row under it. The viewer is drawn in the brand's dark.
function storyScreen(ctx, story, count) {
  const R = roles(ctx), B = ctx.brand, k = 390 / story.w, sh = Math.round(story.h * k), top = 44;
  const bars = [4, 7, 10, 13].map((hh, i) => `<rect x="${i * 5}" y="${13 - hh}" width="3" height="${hh}" fill="currentColor"/>`).join('');
  const segW = (390 - 16 - (count - 1) * 4) / count;
  const segs = Array.from({ length: count }, (_, i) => `<span style="position:absolute;top:8px;left:${f2(8 + i * (segW + 4))}px;width:${f2(segW)}px;height:2px;background:${i < 2 % count ? story.ink : R.quiet}"></span>`).join('');
  const sym = ctx.edition === 'slot' ? `<span style="display:block;width:28px;height:28px;border:1.5px dashed ${story.ink};border-radius:50%"></span>` : ctx.logo.svg('symbol', { colourway: colourwayFor(ctx, story.bg), width: 28 });
  const inner = `<div class="g5-art" style="width:390px;height:844px;background:${R.dark};color:${R.darkInk}">`
    + `<div style="display:flex;justify-content:space-between;align-items:center;height:${top}px;padding:0 32px;font-family:var(--body);font-size:15px;font-weight:600"><span>9:41</span>`
    + `<svg width="44" height="13" viewBox="0 0 44 13" aria-hidden="true"><g>${bars}</g><rect x="26.5" y="1.5" width="16" height="10" rx="2.5" fill="none" stroke="currentColor"/><rect x="28" y="3" width="10" height="7" rx="1.2" fill="currentColor"/></svg></div>`
    + `<div style="position:absolute;left:0;top:${top}px;width:390px;height:${sh}px;overflow:hidden;border-radius:8px"><div style="zoom:${f2(k)}">${story.inner}</div>${segs}`
    + `<div style="position:absolute;left:12px;top:20px;display:flex;align-items:center;gap:8px;font-family:var(--body);font-size:14px;font-weight:600;color:${story.ink}"><span style="display:block;width:28px;height:28px;line-height:0">${sym}</span><span>${A(B.name)}</span></div></div>`
    + `<div style="position:absolute;left:16px;right:16px;top:${top + sh + 20}px;height:44px;border:1px solid ${R.darkQuiet};border-radius:22px"></div></div>`;
  return { w: 390, h: 844, html: ctx.artPage(inner, { w: 390, h: 844 }) };
}

const PHONE_SCENE = 'kerb-crossing-phone';

export const guidelines = {
  // ---- signage: the sign face drawn as the hero, measured round its edges, beside the same face fixed to the wharf board (the anchor)
  // and, smaller, in a bus shelter and a tram-stop panel ----
  signage(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'signage'), sn = p.section.n, SIGN_SCENES = signScenes(ctx);
    // the brand's own sign size, used only when it is the shape of the boards photographed (within 5% of each surface)
    const aspects = SIGN_SCENES.map((s) => ctx.sceneInfo(s.id).quads[0].aspect);
    const m = /(\d+)\s*[x×]\s*(\d+)\s*mm/.exec(B.applications.signage || '');
    const mm = m && aspects.every((a) => Math.abs(m[1] / m[2] / a - 1) < 0.05) ? [+m[1], +m[2]] : null;
    const AW = 800, AH = Math.round(AW / (mm ? mm[0] / mm[1] : aspects[0]));
    const face = signFace(ctx, AW, AH), art = { html: ctx.artPage(face.inner, { w: AW, h: AH }), w: AW, h: AH };
    const urls = SIGN_SCENES.map((s) => ctx.mockup(s.id, { [ctx.sceneInfo(s.id).surfaces[0]]: art }));

    // the drawing: 424 px tall, its left edge clear of the height dimension's label
    const DY = 224, DH = 424, k = DH / AH, DW = AW * k, DX = 136;
    const lab = (art_px, real) => (mm ? mmOf(real) : fx(ctx, art_px * k));
    const inset = face.inset, lw = face.lw;
    // one scene (the wharf board) takes the whole right side; two (shelter and tram panel, both tall) share it, the second 214 wide at x 850
    const PX = 486, PH = 602, SX = 850, SW = 214, PW = SIGN_SCENES.length === 1 ? 578 : 340;
    const alts = { 'kerb-wharf-board': 'on a timber wharf board', 'kerb-shelter-morning': 'in a bus shelter', 'late-tram-panel': 'on a lit tram-stop panel at night' };
    const pics = photo(ctx, urls[0], SIGN_SCENES[0].id, PX, 88, PW, PH, 0.86, `${B.name} sign ${alts[SIGN_SCENES[0].id]}`)
      + (SIGN_SCENES[1] ? photo(ctx, urls[1], SIGN_SCENES[1].id, SX, 88, SW, PH, 0.58, `${B.name} sign ${alts[SIGN_SCENES[1].id]}`) : '');
    const lead = mm
      ? `One face for the street, drawn to the brand's ${mm[0]} × ${mm[1]} mm and fixed ${SIGN_SCENES.length === 1 ? "in one place" : `in ${word(SIGN_SCENES.length)} places`}. The line's capitals stand ${mmOf((face.cap * mm[0]) / AW)} tall.`
      : `One face for the street, drawn to the shape of the boards it is fixed to. The brand sizes its sign at another shape, so this drawing is measured in x as drawn, not in millimetres.`;
    const body = head(ctx, 'signage')
      + blk(56, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 380, 60, 'c-body', lead, `color:${R.quiet}`, 'p')
      + drawn(DX, DY, face, k)
      + blk(56, 682, 380, 32, 'c-micro', `From the brand: ${A(B.applications.signage || '')}`, `color:${R.quiet}`, 'p')
      + pics
      + blk(PX, 698, PW, 16, 'c-micro nw', SIGN_SCENES[0].where, `color:${R.quiet}`)
      + (SIGN_SCENES[1] ? blk(SX, 698, SW, 16, 'c-micro nw', SIGN_SCENES[1].where, `color:${R.quiet}`) : '')
      + tab(ctx, sn);
    const iw = inset * k, lwp = lw * k, by = DY + DH + 16, tw = adv(chrome(600), lab(inset, mm ? mm[0] / 15 : 0), 12);
    const svg = cropTicks(DX, DY, DW, DH, R.ink)
      + dimH(ctx, { x1: DX, x2: DX + DW, y: DY - 16, label: lab(AW, mm && mm[0]), col: R.ink, qcol: R.quiet, obj: DY })
      + dimV(ctx, { x: DX - 16, y1: DY, y2: DY + DH, label: lab(AH, mm && mm[1]), col: R.ink, qcol: R.quiet, obj: DX })
      // along the foot, chained: the margin, then the logo's width
      + dimH(ctx, { x1: DX, x2: DX + iw, y: by, label: lab(inset, mm && mm[0] / 15), col: R.ink, qcol: R.quiet, obj: DY + DH, outside: true, labelAt: DX - 8 - tw })
      + dimH(ctx, { x1: DX + iw, x2: DX + iw + lwp, y: by, label: lab(lw, mm && mm[0] / 3), col: R.ink, qcol: R.quiet, obj: DY + DH })
      + ruler(ctx, { uid: 'g5s', live: [DX, DX + DW] });
    return page(ctx, 'signage', { bg: R.ground, body, svg });
  },

  // ---- social: the three formats drawn at one scale, bottom-aligned so their heights compare, each measured in x; the story shown made
  // on a rider's phone, the photograph bleeding off the left edge ----
  social(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'social'), sn = p.section.n, nS = (B.applications.social || []).length;
    const posts = FORMATS.map((f, i) => ({ f, art: post(ctx, f, i) }));
    const story = posts[2].art, scr = storyScreen(ctx, story, Math.max(1, nS));
    const url = ctx.mockup(PHONE_SCENE, { 'screen-phone': scr }, { shade: 0.5 });
    const PW = 300, CX = 324, k = 1 / 6, BASE = 600, X0 = 376, GAP = 72, w = 1080 * k;
    const xs = posts.map((_, i) => X0 + i * (w + GAP));
    const body = photo(ctx, url, PHONE_SCENE, 0, 0, PW, 794, 0.56, `${B.name} story post on a phone held at a street crossing`)
      + head(ctx, 'social', [{ x1: CX, x2: G.R, col: R.ink, slots: [[CX, `${B.name} brand standards`], [G.col[6], `${sn} ${p.section.title}`], [G.col[9], p.title]] }])
      + blk(CX, 88, 380, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(CX, 120, 400, 60, 'c-body', `${word(posts.length)[0].toUpperCase()}${word(posts.length).slice(1)} formats at one sixth of their size, each carrying one of the brand's social lines. Sizes are the post's own, in x; the story is shown made, at left.`, `color:${R.quiet}`, 'p')
      + posts.map(({ f, art }, i) => drawn(xs[i], BASE - art.h * k, art, k, art.bg === R.ground ? `outline:1px solid ${R.hair};outline-offset:-1px` : "")
        + blk(xs[i], BASE + 16, w, 20, 'c-name nw', f.name, `color:${R.ink}`, 'h2')
        + blk(xs[i], BASE + 36, w + 40, 16, 'c-micro nw', `${f.w} × ${f.h} px`, `color:${R.quiet}`)).join('')
      + blk(CX, 682, 400, 16, 'c-micro nw', 'Left: the story, on a phone at a crossing.', `color:${R.quiet}`)
      + tab(ctx, sn);
    const svg = posts.map(({ art }, i) => {
      const x = xs[i], h = art.h * k, y = BASE - h;
      return cropTicks(x, y, w, h, R.ink)
        + dimH(ctx, { x1: x, x2: x + w, y: y - 16, label: fx(ctx, art.w), col: R.ink, qcol: R.quiet, obj: y })
        + dimV(ctx, { x: x - 16, y1: y, y2: BASE, label: fx(ctx, art.h), col: R.ink, qcol: R.quiet, obj: x });
    }).join('')
      + ruler(ctx, { uid: 'g5p', pieces: [{ x1: CX, x2: G.R, ink: R.ink, quiet: R.quiet, hair: R.hair }], live: [X0, xs[2] + w], edgeAnchor: false });
    return page(ctx, 'social', { bg: R.ground, body, svg });
  },

  // ---- email-signature: no photograph. The message at 1:1 in a mail client's reading pane, the signature at its foot measured in x,
  // and its sizes in one table ----
  'email-signature'(ctx) {
    const R = roles(ctx), B = ctx.brand, p = pg(ctx, 'email-signature'), sn = p.section.n;
    const e = B.applications.email || {}, card = B.applications.card || {}, site = (B.applications.site || {}).url, M = (B.guideB && B.guideB.email) || null;
    const raised = B.ui.light.raised, quiet = R.quietOn(raised);
    const tb = tok(ctx, 'body'), tl = tok(ctx, 'label'), blh = Math.round(tb.size * tb.line), llh = Math.round(tl.size * tl.line);
    const fB = bodyFace(ctx, 400), fN = bodyFace(ctx, 600), fL = bodyFace(ctx, tl.weight);
    // the pane
    const PX = 400, PY = 88, PW = G.R - PX, PH = 714 - PY, IX = PX + 32;
    const hdr = M ? [['From', `${A(e.person)}, ${A(card.contact)}`], ['To', A(M.to)], ['Subject', `<b style="font-weight:600">${A(M.subject)}</b>`]] : [['From', `${A(e.person)}, ${A(card.contact)}`]];
    let y = PY + 24;
    const hdrHtml = hdr.map(([a, v], i) => blk(IX, y + i * 24, PW - 64 - 80, 20, 'c-body g5-hd', `<span style="color:${quiet}">${a}</span><span>${v}</span>`, `color:${R.ink}`)).join('')
      + (M ? blk(PX + PW - 32 - 80, y, 80, 20, 'c-body nw', A(M.time), `text-align:right;color:${quiet}`) : '');
    y += hdr.length * 24 + 16;
    const rule = fill(IX, y, PW - 64, 1, R.hair);
    y += 32;
    const paras = M ? M.body : [];
    const msgH = paras.reduce((s, t) => s + wrap(fB, t, tb.size, 518).length * blh + 12, 0);
    const msg = paras.length ? blk(IX, y, 520, msgH + 8, 'g5-msg', paras.map((t) => `<p style="font-size:${tb.size}px;line-height:${blh}px">${A(t)}</p>`).join(''), `color:${R.ink}`) : '';
    // the signature, 1:1: the horizontal logo 40x wide, a 12x gap holding a hairline, then the name, the role and two ways to reach them
    const LW = 40 * xOf(ctx), geo = ctx.logo.geos.horizontal, LH = (LW * geo.h) / geo.w, GAP = 12 * xOf(ctx);
    const rows = [[e.person, fN, tb.size, blh, 600, R.ink], [e.role, fL, tl.size, llh, tl.weight, quiet], [card.contact, fL, tl.size, llh, tl.weight, R.ink], [site, fL, tl.size, llh, tl.weight, R.ink]].filter((r) => r[0]);
    const TW = ctx.edition === 'slot' ? 260 : Math.ceil(Math.max(...rows.map(([t, f, s]) => adv(f, t, s)))), TH = rows.reduce((s, r) => s + r[3], 0) + 8;
    const SY = Math.max(y + msgH + 72, 440), SX = IX, SW = LW + GAP + TW, SH = Math.max(LH, TH), TX = SX + LW + GAP;
    const logo = ctx.edition === 'slot'
      ? `<div class="slot-box c-micro" style="width:${f2(LW)}px;height:${f2(Math.max(LH, 24))}px;color:${R.ink};padding:2px 6px">Logo</div>`
      : ctx.logo.svg('horizontal', { colourway: colourwayFor(ctx, raised) === 'mono-dark' ? colourwayFor(ctx, R.ground) : colourwayFor(ctx, raised), width: LW });
    let ty = 0;
    const sigText = rows.map(([t, , s, lh, w, c], i) => { const out = `<p style="font-size:${s}px;line-height:${lh}px;font-weight:${w};color:${c};${i === 2 ? 'margin-top:8px' : ''}">${A(t)}</p>`; ty += lh; return out; }).join('');
    const sig = blk(SX, SY, LW, LH, 'logo-box', logo, '')
      + fill(SX + LW + GAP / 2, SY, 1, SH, R.hair)
      + blk(TX, SY, TW + 4, TH, 'g5-sig' + (ctx.edition === 'slot' ? ' ph-tight' : ''), sigText, '');
    // the table: the signature's sizes
    const famB = B.fonts.body.family;
    const tRows = [['Logo, horizontal', `${LW} px <span style="color:${R.quiet}">${fx(ctx, LW)}</span>`], ['Name', `${tb.size} px, 600`], ['Role and contact', `${tl.size} px, ${tl.weight}`],
      ['Logo to text', `${GAP} px <span style="color:${R.quiet}">${fx(ctx, GAP)}</span>`], ['Whole signature', `${Math.round(SW)} px <span style="color:${R.quiet}">${fx(ctx, SW)}</span>`]];
    const TY = 683 - tRows.length * 32;
    const table = tRows.map(([n, v], i) => fill(56, TY + i * 32, 312, 1, R.hair) + blk(56, TY + i * 32 + 6, 312, 20, 'c-body trow', `<span>${n}</span><span>${v}</span>`, `color:${R.ink}`)).join('') + fill(56, 683, 312, 1, R.hair);
    const body = head(ctx, 'email-signature')
      + blk(56, 88, 312, 24, 'c-title', A(p.title), `color:${R.ink}`, 'h1')
      + blk(56, 120, 312, 100, 'c-body', `The signature at 1:1, as it reads at the foot of a message: the logo, then a name, a role and two ways to reach ${A(B.name)}. Every word is live text in ${A(famB)}, so it still reads with images off.`, `color:${R.quiet}`, 'p')
      + table
      + `<div class="a g5-mail" style="left:${PX}px;top:${PY}px;width:${PW}px;height:${PH}px;--g5-raised:${raised}"></div>`
      + hdrHtml + rule + msg + sig
      + tab(ctx, sn);
    const by = SY + SH + 16;
    const svg = cropTicks(SX, SY, SW, SH, R.ink)
      + dimH(ctx, { x1: SX, x2: SX + SW, y: SY - 16, label: fx(ctx, SW), col: R.ink, qcol: R.quiet, obj: SY })
      + dimH(ctx, { x1: SX, x2: SX + LW, y: by, label: fx(ctx, LW), col: R.ink, qcol: R.quiet, obj: SY + LH })
      + dimH(ctx, { x1: SX + LW, x2: TX, y: by, label: fx(ctx, GAP), col: R.ink, qcol: R.quiet, obj: SY + SH, outside: true })
      + dimV(ctx, { x: SX + SW + 16, y1: SY, y2: SY + TH, label: fx(ctx, TH), col: R.ink, qcol: R.quiet, obj: SX + SW, right: true })
      + ruler(ctx, { uid: 'g5e', live: [SX, SX + SW] });
    return page(ctx, 'email-signature', { bg: R.ground, body, svg });
  },
};
