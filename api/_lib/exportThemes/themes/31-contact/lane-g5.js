// Theme 31, Contact sheet, lane g5: the application pages round 1 left out (social, signage, email-signature, digital). business-card is round 1's.
// Each page is a sheet from the applications shoot. The flat artwork is the enlargement on the stage (the posts, the sign face, the message, the screen);
// the photographed scene is the page's own frame on the strip, circled, with a work print of it beside the enlargement. The words live in the caption column.
// Scenes (library map, row 31): signage room-gallery-panel, email-signature room-hall-laptop, digital late-laptop-desk. The map gives social no scene, so its
// circled frame stays the brand's own photograph, and the square post is cut from it. Brand copy is printed whole; the measured sizes are caps.
import { plateImg } from '../../engine/plate.js';
import { A, tokens, palette, cwOn, put, hline, adv, shown, wrap, fitLines, shell, captionHead, px, rollOf } from './helpers.js';
import { cut, photoFrame, photoShot, kitCss } from './arts.js';

const r2 = (n) => Math.round(n * 100) / 100;
const capNo = (ctx, id) => String(ctx.pageNo(id)).padStart(2, '0');
const stop = (t) => (/[.!?]$/.test(t.trim()) ? t.trim() : t.trim() + '.');
const geo = (ctx, id) => ctx.logo.geos[id] || ctx.logo.geos.colour;
const hOf = (ctx, id, w) => (geo(ctx, id).h / geo(ctx, id).w) * w;
const logoAt = (ctx, id, bg, w) => ctx.logo.html(id, { width: w, colourway: cwOn(ctx, bg), color: palette(ctx).inkOn(bg) });
const stretch = (ctx) => ctx.brand.fonts.display.stretch || 100;
const box = (x, y, st, inner, w) => `<div style="position:absolute;left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${st}">${inner}</div>`;

// ---- the shoot: which scene each of this lane's frames holds ----
const OWN = { signage: 'room-gallery-panel', 'email-signature': 'room-hall-laptop', digital: 'late-laptop-desk' };
const ownFrames = (ctx) => Object.fromEntries(Object.entries(OWN).map(([id, s]) => [ctx.pageNo(id), s]));
const doc = (ctx, a) => ({ html: ctx.artPage(a.html, { w: a.w, h: a.h, css: kitCss(ctx) }), w: a.w, h: a.h });
const ARTS = {
  'room-gallery-panel': (ctx) => ({ panel: doc(ctx, signFace(ctx)) }),
  'room-hall-laptop': (ctx) => ({ 'screen-laptop': doc(ctx, mailScreen(ctx)) }),
  'late-laptop-desk': (ctx) => ({ 'screen-laptop': doc(ctx, productScreen(ctx)) }),
};
const urls = new WeakMap();
function sceneUrl(ctx, scene) {
  if (!urls.has(ctx)) urls.set(ctx, {});
  const c = urls.get(ctx);
  return c[scene] || (c[scene] = ctx.mockup(scene, ARTS[scene](ctx)));
}
// a crop of a scene, centred on its surface and clamped inside the photograph; z > 1 comes closer
function sceneCut(ctx, scene, w, h, z = 1, alt = '') {
  const S = ctx.sceneInfo(scene), q = S.quads[0].corners, cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  const k = Math.max(w / S.w, h / S.h) * z, iw = S.w * k, ih = S.h * k;
  const ox = Math.min(0, Math.max(w - iw, w / 2 - cx * k)), oy = Math.min(0, Math.max(h - ih, h / 2 - cy * k));
  return plateImg(A(sceneUrl(ctx, scene)), A(alt), `position:absolute;left:${px(ox)};top:${px(oy)};width:${px(iw)};height:${px(ih)};max-width:none;display:block`);
}
const scenePrint = (ctx, scene, x, y, w, h, z, alt) => `<div class="a fr" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(h)}">${sceneCut(ctx, scene, w, h, z, alt)}</div>`;
// the strip: this lane's frames hold their scenes, every other frame keeps the roll
const frameFn = (ctx) => { const own = ownFrames(ctx);
  return (setup, k, w, h, f, v = 0) => (own[f] ? sceneCut(ctx, own[f], w, h, 1, 'Frame ' + f) : setup === 'photo' ? photoFrame(ctx, k, w, h, v) : cut(ctx, setup, k, w, h, 'Frame ' + f)); };
const page = (ctx, id, body) => shell(ctx, id, tokens(ctx), body, frameFn(ctx));

// ---- text ----
// a brand line set whole in one box: the size steps down until it wraps into maxLines; the box is the measured lines' height
function lineBlock(ctx, { x, y, w, text, from, maxLines, min = 24, lh = 1.04, color, track = -0.01, role = 'display', weight, align = 'left' }) {
  const wt = weight ?? (role === 'display' ? ctx.weights.heading : 400);
  const f = fitLines(ctx, role, text, from, w, maxLines, track, wt, 4, min), L = Math.round(f.size * lh);
  const fam = role === 'display' ? `font-family:var(--display);font-stretch:${stretch(ctx)}%` : 'font-family:var(--body)';
  const html = `<div style="position:absolute;left:${px(x)};top:${px(y)};width:${px(w + 2)};height:${f.lines.length * L}px;${fam};font-weight:${wt};font-size:${f.size}px;line-height:${L}px;letter-spacing:${track}em;color:${color};white-space:normal;text-align:${align}">${A(text)}</div>`;
  return { html, h: f.lines.length * L, size: f.size, n: f.lines.length };
}
const label = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
function para(ctx, x, y, w, text, { size = 14, line = 22, color = 'var(--soft)', weight = 400, max = 6 } = {}) {
  const n = Math.min(max, wrap(ctx, 'body', text, size, w, 0, weight).length);
  return { h: n * line, html: put(ctx, { x, y, w, h: n * line, role: 'body', size, line, weight, style: `font:${weight} ${size}px/${line}px var(--body);color:${color};white-space:normal;text-wrap:pretty`, html: A(text) }) };
}
const name14 = (ctx, x, y, w, t) => put(ctx, { x, y, w, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(t) });
const mono = (ctx, x, y, w, t, align = 'left') => put(ctx, { x, y, w, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: align === 'right' ? 'text-align:right' : '', html: A(t) });
const swatch = (x, y, hex) => `<div class="a" style="left:${x}px;top:${y}px;width:16px;height:16px;background:${hex};box-shadow:inset 0 0 0 1px var(--hair)"></div>`;
// a colour row in the notes: swatch, name, what it does here, hex
const colourRow = (ctx, y, hex, name, use) => swatch(996, y + 2, hex) + name14(ctx, 1028, y, 300, name) + put(ctx, { x: 1028, y: y + 22, w: 300, h: 18, role: 'body', size: 12, line: 18, style: 'font:400 12px/18px var(--body);color:var(--quiet)', html: A(use) }) + mono(ctx, 1316, y + 1, 124, hex.toUpperCase(), 'right');
const colourName = (ctx, hex) => { const c = [...ctx.brand.colours, ...(ctx.brand.tones || [])].find((x) => x.hex.toLowerCase() === hex.toLowerCase()); return c ? c.name : null; };

// flat art drawn at its own size and zoomed into its slot (zoom keeps the text vector in the PDF)
const flat = (x, y, w, art, alt) => { const k = w / art.w;
  return `<div class="a fr g5-flat" role="img" aria-label="${A(alt)}" style="left:${px(x)};top:${px(y)};width:${px(w)};height:${px(art.h * k)}"><div style="position:relative;width:${art.w}px;height:${art.h}px;zoom:${r2(k * 10000) / 10000}">${art.html}</div></div>`; };

// ================================================================ the art
// the line the signage brief quotes, when it quotes one of the brand's lines whole; else the primary line
const signLine = (ctx) => { const B = ctx.brand; return [B.lines.primary, ...(B.lines.others || [])].find((l) => B.applications.signage.includes(l)) || B.lines.primary; };

// the sign face, 2 : 3: the logo at the head, the line low on the panel, the address under it
function signFace(ctx) {
  const P = palette(ctx), B = ctx.brand, W = 1000, H = 1500, bg = [P.action, P.panel, P.dark].find((c) => c && ctx.ratio(P.inkOn(c.hex), c.hex) >= 4.5 && ctx.ratio(P.quietOn(c.hex), c.hex) >= 4.5).hex, ink = P.inkOn(bg), q = P.quietOn(bg), lw = 300;
  const t = lineBlock(ctx, { x: 80, y: 0, w: 840, text: signLine(ctx), from: 168, maxLines: 4, min: 64, lh: 1.02, color: ink });
  const ty = H - 80 - 40 - 72 - t.h;
  const html = `<div style="position:absolute;inset:0;background:${bg};color:${ink}">`
    + box(80, 88, '', logoAt(ctx, 'colour', bg, lw), lw)
    + t.html.replace('top:0px', `top:${px(ty)}`)
    + box(80, H - 80 - 40, `font:400 30px/40px var(--body);color:${q};white-space:nowrap`, A(B.applications.site.url), 840) + '</div>';
  return { html, w: W, h: H, bg };
}

// the posts: the ground each sits on, chosen by what its text reads on
function postGrounds(ctx) {
  const P = palette(ctx), ok = (hex) => ctx.ratio(P.inkOn(hex), hex) >= 4.5;
  const loud = [P.action, P.panel, P.light].find((c) => c && ok(c.hex) && c.hex !== P.dark.hex) || P.light;
  const light = [P.light, P.panel].find((c) => c && c.hex !== loud.hex && ok(c.hex)) || P.light;
  return { square: P.dark, portrait: loud, story: light };
}
function squarePost(ctx, k) {
  const B = ctx.brand, G = postGrounds(ctx).square, bg = G.hex, ink = palette(ctx).inkOn(bg), S = 1080, sw = 112, sh = hOf(ctx, 'symbol', sw);
  const t = lineBlock(ctx, { x: 72, y: 720 + 56, w: S - 144 - sw - 48, text: B.applications.social[0], from: 88, maxLines: 2, min: 48, lh: 1.06, color: ink });
  return { w: S, h: S, bg, html: `<div style="position:absolute;inset:0;background:${bg}"><div style="position:absolute;left:0;top:0;width:${S}px;height:720px;overflow:hidden">${photoFrame(ctx, k, S, 720, 0)}</div>${t.html}${box(S - 72 - sw, S - 72 - sh, '', logoAt(ctx, 'symbol', bg, sw), sw)}</div>` };
}
function portraitPost(ctx) {
  const B = ctx.brand, P = palette(ctx), G = postGrounds(ctx).portrait, bg = G.hex, ink = P.inkOn(bg), W = 1080, H = 1350, lw = 300;
  const t = lineBlock(ctx, { x: 72, y: 96, w: 936, text: B.applications.social[1], from: 156, maxLines: 4, min: 64, lh: 1.02, color: ink });
  return { w: W, h: H, bg, html: `<div style="position:absolute;inset:0;background:${bg}">${t.html}${box(72, H - 80 - hOf(ctx, 'colour', lw), '', logoAt(ctx, 'colour', bg, lw), lw)}${box(W - 72 - 420, H - 80 - 40, `font:400 32px/40px var(--body);color:${ink};text-align:right;white-space:nowrap`, A(B.applications.site.url), 420)}</div>` };
}
function storyPost(ctx) {
  const B = ctx.brand, P = palette(ctx), G = postGrounds(ctx).story, bg = G.hex, ink = P.inkOn(bg), W = 1080, H = 1920, lw = 340;
  const t = lineBlock(ctx, { x: 80, y: 0, w: 920, text: B.applications.social[2], from: 152, maxLines: 5, min: 64, lh: 1.02, color: ink });
  return { w: W, h: H, bg, html: `<div style="position:absolute;inset:0;background:${bg}">${box(80, 140, '', logoAt(ctx, 'colour', bg, lw), lw)}${t.html.replace('top:0px', `top:${px(Math.round(H * 0.46 - t.h / 2))}`)}${box(80, H - 160 - 44, `font:400 36px/44px var(--body);color:${P.quietOn(bg)};white-space:nowrap`, A(B.applications.site.url), 920)}</div>` };
}

// the signature at 1 : 1, as a mail client sets it: the horizontal logo, the name, the role, the address and the site
const SIG = { logo: 120, gap: 14, name: [15, 20, 600], small: [13, 18, 400] };
function signature(ctx, R) {
  const B = ctx.brand, E = B.applications.email, c = B.applications.card, link = ctx.ratio(R.action, R.surface) >= 4.5 ? R.action : R.text;
  const lh = hOf(ctx, 'horizontal', SIG.logo), [ns, nl, nw] = SIG.name, [ss, sl] = SIG.small;
  const rows = [[E.person, `font:${nw} ${ns}px/${nl}px var(--body);color:${R.text}`, nl, ns, nw], [E.role, `font:400 ${ss}px/${sl}px var(--body);color:${R.quiet}`, sl, ss, 400]];
  if (c.person === E.person) rows.push([c.contact, `font:400 ${ss}px/${sl}px var(--body);color:${R.text}`, sl, ss, 400]);
  rows.push([B.applications.site.url, `font:400 ${ss}px/${sl}px var(--body);color:${link}`, sl, ss, 400]);
  let y = lh + SIG.gap, html = box(0, 0, '', ctx.logo.html('horizontal', { width: SIG.logo, colourway: cwOn(ctx, R.surface), color: R.text }), SIG.logo);
  let w = SIG.logo;
  for (const [t, st, L, s, wt] of rows) { html += box(0, y, `${st};white-space:nowrap`, A(t)); w = Math.max(w, adv(ctx, 'body', shown(ctx, t), s, 0, wt) + (ctx.placeholders ? 12 : 0)); y += L; }
  return { html, w: Math.ceil(w), h: y, link };
}
// the message at 1 : 1 in a light mail pane: subject, who and when, the body, then the signature
function mailPane(ctx, W) {
  const B = ctx.brand, E = B.guideB.email, R = ctx.roles.light, pad = 32, iw = W - pad * 2, sig = signature(ctx, R);
  let y = pad, h = '';
  const sub = lineBlock(ctx, { x: pad, y, w: iw, text: E.subject, from: 20, maxLines: 1, min: 14, lh: 1.4, color: R.text, role: 'body', weight: 600, track: 0 });
  h += sub.html; y += sub.h + 4;
  h += box(pad, y, `font:400 13px/20px var(--body);color:${R.quiet};white-space:nowrap`, `${A(E.person || B.applications.email.person)} to ${A(E.to)}`, iw - 120);
  h += box(W - pad - 120, y, `font:400 13px/20px var(--body);color:${R.quiet};text-align:right;white-space:nowrap`, A(E.time), 120);
  y += 20 + 16; h += box(pad, y, `height:1px;background:${R.divider}`, '', iw); y += 1 + 24;
  for (const p of E.body) { const n = wrap(ctx, 'body', p, 15, iw, 0, 400).length; h += box(pad, y, `font:400 15px/24px var(--body);color:${R.text};white-space:normal`, A(p), iw + 2); y += n * 24 + 12; }
  y += 16; h += box(pad, y, '', sig.html, sig.w); y += sig.h + pad;
  return { html: `<div style="position:absolute;inset:0;background:${R.surface};color:${R.text}">${h}</div>`, w: W, h: y, sig, R };
}
// the same message on the laptop: the pane centred on the sunken ground of the light roles, at screen scale
function mailScreen(ctx) {
  const R = ctx.roles.light, W = 1440, H = 900, m = mailPane(ctx, 912), z = 1.3, ph = Math.min(m.h, (H - 96) / z);
  return { w: W, h: H, html: `<div style="position:absolute;inset:0;background:${R.sunken}"><div style="position:absolute;left:${px((W - 912 * z) / 2)};top:48px;width:912px;height:${px(ph)};zoom:${z};overflow:hidden;box-shadow:0 0 0 1px ${R.divider}">${m.html}</div></div>` };
}
// the product screen, dark roles, from the UI kit's own components (the desktop layout the theme's roll uses)
function productScreen(ctx) {
  const S = ctx.brand.ui.screen.content, ui = ctx.ui, R = ctx.roles.dark, pg = Math.round(S.progress * 100);
  const act = ctx.ratio(R.action, R.surface) >= 3 ? R.action : R.text;
  const links = (S.example && S.example.links) || [['Proofs', 'image'], ['Book', 'plus'], ['Prints', 'printer']];
  const bar = `<nav class="ui-topbar" style="height:64px;padding:0 48px;gap:24px;display:flex;align-items:center;border-bottom:1px solid var(--divider)"><span style="display:block;width:44px">${ctx.logo.html('symbol', { width: 44, colourway: cwOn(ctx, R.surface), color: R.text })}</span><span style="font:500 20px/24px var(--ff-body);margin-right:24px;white-space:nowrap">${A(ctx.brand.ui.screen.title)}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
  const left = box(64, 152, '', `<div class="ui-display" style="font-size:96px;line-height:104px;letter-spacing:-0.02em;color:var(--text);white-space:nowrap">${A(S.time)}</div><div class="ui-display" style="margin-top:24px;font-size:40px;line-height:48px;color:${act}">${A(S.eta)}</div><div style="position:relative;margin-top:72px;height:1px;background:var(--divider)"><i style="position:absolute;left:0;top:-1px;width:${pg}%;height:3px;background:var(--action)"></i></div><div style="display:flex;justify-content:space-between;margin-top:24px;font:400 22px/28px var(--ff-body);color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p style="margin-top:56px;font:400 24px/36px var(--ff-body);color:var(--text-soft)">${A(S.pickup)}</p>`, 560);
  const right = box(728, 128, '', `<div style="width:432px;zoom:1.5">${ui.deliveryRows(5)}</div>`, 648);
  return { w: 1440, h: 900, html: `<div class="ui" data-theme="dark" style="position:relative;width:1440px;height:900px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body);white-space:normal">${bar}${left}${right}</div>` };
}

// ================================================================ the pages
// the circled frame's caption at the head of the column
const sceneCap = (ctx, id, title, text, lines = 3) => captionHead(ctx, { no: capNo(ctx, id), title, text, lines });

export const guidelines = {
  // Social: the three posts printed side by side, standing on one line; the square is cut from the brand photograph the strip circles
  social(ctx) {
    const B = ctx.brand, P = palette(ctx), id = 'social', n = ctx.pageNo(id), r = rollOf(ctx)[n], G = postGrounds(ctx);
    const k = r && r[0] === 'photo' ? r[1] : 0;
    const posts = [['Square', squarePost(ctx, k), 60, 452, '1080 × 1080'], ['Portrait', portraitPost(ctx), 540, 240, '1080 × 1350'], ['Story', storyPost(ctx), 804, 168, '1080 × 1920']];
    let body = '';
    for (const [nm, art, x, w, size] of posts) {
      const h = art.h * w / art.w;
      body += flat(x, 768 - h, w, art, `${B.name} ${nm.toLowerCase()} post`) + name14(ctx, x, 792, w, nm) + mono(ctx, x, 816, w, size);
    }
    const s = r && r[0] === 'photo' ? photoShot(ctx, r[1]) : null;
    const cap = sceneCap(ctx, id, s ? s.caption : 'Your photograph', s ? `${s.generated ? '' : `Photo: ${s.credit || 'the studio'}. `}The square post is cut from this frame.` : 'Your own photograph goes in this frame, and the square post is cut from it.');
    const rows = [['Square', G.square], ['Portrait', G.portrait], ['Story', G.story]].map(([nm, c], i) => colourRow(ctx, 512 + i * 56, c.hex, c.name, `The ${nm.toLowerCase()} post’s ground`)).join('');
    const note = para(ctx, 996, 704, 444, `Each post carries one line, whole, and the logo once. The line is set in ${B.fonts.display.family} as large as the post holds it.`, { max: 4 });
    return page(ctx, id, body + cap + hline(996, 488, 444) + rows + note.html);
  },

  // Signage: the sign face at full height, and a work print of the panel on the gallery wall beside it
  signage(ctx) {
    const B = ctx.brand, P = palette(ctx), id = 'signage', face = signFace(ctx), scene = OWN[id];
    const fw = 596 * face.w / face.h;
    const body = flat(60, 316, fw, face, `${B.name} sign face`)
      + label(ctx, 620, 472, `Frame ${capNo(ctx, id)}, printed`, 352) + scenePrint(ctx, scene, 620, 496, 352, 416, 1, `${B.name} sign on a gallery wall`);
    const cap = sceneCap(ctx, id, 'Wall panel in a gallery', `The sign face hung where people stop to read, on ${colourName(ctx, face.bg) || P.dark.name}, two wide by three high.`);
    const ink = P.inkOn(face.bg), q = P.quietOn(face.bg);
    const rows = colourRow(ctx, 512, face.bg, colourName(ctx, face.bg) || P.dark.name, 'The face') + colourRow(ctx, 568, ink, colourName(ctx, ink) || 'Ink', 'The line and the logo') + (q.toLowerCase() !== ink.toLowerCase() ? colourRow(ctx, 624, q, colourName(ctx, q) || 'Quiet', 'The address') : '');
    const ny = q.toLowerCase() !== ink.toLowerCase() ? 704 : 648;
    const note = para(ctx, 996, ny, 444, `The logo at the head, the line in ${B.fonts.display.family} low on the panel, and the address under it. Nothing else goes on the face.`, { max: 4 });
    return page(ctx, id, body + cap + hline(996, 488, 444) + rows + note.html);
  },

  // Email signature: the message as the mail client sets it, at 1 : 1 (a contact print); the signature enlarged in the column; the laptop in the hall as a print
  'email-signature'(ctx) {
    const B = ctx.brand, P = palette(ctx), id = 'email-signature', E = B.guideB.email, scene = OWN[id];
    const m = mailPane(ctx, 912), R = m.R, sig = m.sig;
    let body = `<div class="a fr" role="img" aria-label="${A(`${B.name} email with its signature`)}" style="left:60px;top:316px;width:912px;height:${m.h}px">${m.html}</div>`;
    const py = 316 + m.h + 24, ph = 912 - py, pw = Math.round(ph * 1.5);
    if (ph >= 120) {
      body += scenePrint(ctx, scene, 60, py, pw, ph, 1.5, `${B.name} email open on a laptop in a hallway`);
      const sx = 60 + pw + 24, sw = 972 - sx, fam = B.fonts.body.family;
      const spec = [['Name', `${fam}, ${SIG.name[0]} px, weight ${SIG.name[2]}`], ['Role and contact', `${fam}, ${SIG.small[0]} px`], ['Logo', `Horizontal, ${SIG.logo} px wide`]];
      body += spec.map(([a, b], i) => label(ctx, sx, py + i * 48, a, sw) + put(ctx, { x: sx, y: py + i * 48 + 18, w: sw, h: 22, role: 'body', size: 14, line: 22, style: 'font:400 14px/22px var(--body);color:var(--soft)', html: A(b) })).join('');
    }
    // the enlargement: the signature alone, as large as the column holds it, on the same light ground
    const pad = 24, z = Math.min(2, (444 - pad * 2) / sig.w), eh = Math.round(sig.h * z + pad * 2 + 16);
    const enl = `<div class="a fr" role="img" aria-label="${A(`${B.name} email signature, enlarged`)}" style="left:996px;top:512px;width:444px;height:${eh}px;background:${R.surface}"><div style="position:absolute;left:${pad}px;top:${pad}px;width:${sig.w}px;height:${sig.h}px;zoom:${r2(z * 100) / 100}">${sig.html}</div></div>`;
    const zt = Number.isInteger(r2(z)) ? String(r2(z)) : r2(z).toFixed(2).replace(/0$/, '');
    const enlCap = para(ctx, 996, 512 + eh + 16, 444, `The signature at ${zt}×, on the light ground the mail client gives it. It closes the message, with nothing after it.`, { max: 3 });
    const cap = sceneCap(ctx, id, 'Laptop on a hall table, at dusk', `${stop(E.subject)} The message open on the hall table, signed by ${B.applications.email.person}.`);
    return page(ctx, id, body + cap + hline(996, 488, 444) + enl + enlCap.html);
  },

  // Digital: the product screen as the enlargement, from the UI kit's own components; the laptop on the desk at night as a print in the column
  digital(ctx) {
    const B = ctx.brand, P = palette(ctx), id = 'digital', scene = OWN[id], art = productScreen(ctx), w = 912, h = art.h * w / art.w;
    const pct = Math.round(w / art.w * 100);
    const body = flat(60, 316, w, art, `${B.name} ${B.ui.screen.title} screen`)
      + mono(ctx, 60, 316 + h + 16, 300, `${art.w} × ${art.h}`) + put(ctx, { x: 360, y: 316 + h + 14, w: 612, h: 22, role: 'body', size: 14, line: 22, align: 'right', style: 'font:400 14px/22px var(--body);color:var(--quiet)', html: A(`Desktop, dark roles, shown at ${pct}%`) });
    const R = ctx.roles.dark, onBar = colourName(ctx, R.action) || P.action.name;
    const cap = sceneCap(ctx, id, 'Laptop on a desk, at night', `${B.ui.screen.title} on the dark screen, with ${onBar} on the progress bar.`);
    const print = scenePrint(ctx, scene, 996, 512, 444, 296, 1.15, `${B.name} screen on a laptop at night`);
    const note = para(ctx, 996, 832, 444, 'Every part of the screen is a component from the UI kit, in the dark roles. Build the site and the app from the kit, not from this picture.', { max: 4 });
    return page(ctx, id, body + cap + hline(996, 488, 444) + print + note.html);
  },
};

// the kit's tokens and components, so the screen on the digital page draws with the real component set (the UI kit document has its own copy)
export function css(ctx) {
  return (ctx && ctx.kind !== 'uikit' ? kitCss(ctx) : '') + `\n.pg .g5-flat .ui{white-space:normal}`;
}
