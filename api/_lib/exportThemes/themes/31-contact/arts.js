// Theme 31, Contact sheet: the art that goes on each scene's surface, and the crops that cut a frame (or an enlargement) from the render.
// Every colour is a brand colour picked by role or by luminance; nothing here names a sample brand's colour, photo or art.
import { componentsCss } from '../../engine/components.js';
import { plateImg } from '../../engine/plate.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { A, palette, cwOn, adv, wrap, fitLines, fitBalanced, px } from './helpers.js';

// the UI kit's tokens and components, scoped for art pages (the same recipe as theme 01's kit)
export function kitCss(ctx) {
  const g = tokenGroups(ctx), decl = (o) => Object.entries(o).map(([k, v]) => `--${k}:${v};`).join('');
  return `.pg--art{background:transparent}\n.pg .ui{${decl(colourMap(ctx, 'light'))}${decl(g.space)}${decl(g.radius)}${decl(g.width)}${decl(g.font)}${decl(g.text)}${decl(g.shadow)}}\n.pg .ui[data-theme="dark"]{${decl(colourMap(ctx, 'dark'))}}\n${componentsCss(ctx)}\n.ui-display{font-stretch:${ctx.brand.fonts.display.stretch || 100}%}\n.ui :where(h1,h2,h3,p,ul,ol,dl,dd){margin:0;padding:0}`;
}
const artOf = (ctx, html, w, h) => ({ html: ctx.artPage(html, { w, h, css: kitCss(ctx) }), w, h });
const box = (x, y, st, inner, w) => `<div style="position:absolute;left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${st}">${inner}</div>`;
const disp = (ctx, size, line, track = -0.02) => `font-family:var(--display);font-weight:${ctx.weights.heading};font-stretch:${ctx.brand.fonts.display.stretch || 100}%;font-size:${size}px;line-height:${line}px;letter-spacing:${track}em`;
const lines = (arr) => arr.map((l) => `<div style="white-space:nowrap">${A(l)}</div>`).join('');
const lineSet = (ctx) => { const B = ctx.brand, o = B.lines.others || [], pr = B.voice.principles || []; return [B.lines.primary, o[0] || pr[0].example, o[1] || pr[1].example]; };
const logoAt = (ctx, id, bg, w) => ctx.logo.html(id, { width: w, colourway: cwOn(ctx, bg) });
const hOf = (ctx, id, w) => (ctx.logo.geos[id].h / ctx.logo.geos[id].w) * w;
const widthFor = (ctx, aspect, h) => Math.round(aspect * h);
const aspectOf = (ctx, scene, i = 0) => ctx.sceneInfo(scene).quads[i].aspect;

// ---- the poster (art B): one line, the last word in the accent when it reads ----
function poster(ctx, bg, W, H, line, scale = 1) {
  const P = palette(ctx), ink = P.inkOn(bg), soft = P.softOn(bg), B = ctx.brand;
  const f = fitLines(ctx, 'display', line, 112, W - 64 - 76, 3, -0.02);
  const accentOk = ctx.ratio(ctx.roles.dark.action, bg) >= 3;
  const ls = f.lines.map((l, i) => {
    if (i < f.lines.length - 1 || !accentOk) return A(l);
    const sp = l.lastIndexOf(' '); return sp < 0 ? `<span style="color:${ctx.roles.dark.action}">${A(l)}</span>` : `${A(l.slice(0, sp + 1))}<span style="color:${ctx.roles.dark.action}">${A(l.slice(sp + 1))}</span>`;
  });
  const lh = Math.round(f.size * 108 / 112);
  const text = ls.map((l, i) => `<div style="white-space:nowrap;height:${lh}px">${l}</div>`).join('');
  const other = (B.lines.others || [B.voice.principles[0].example])[0], lw = 220;
  const ow = Math.min(256, W - 64 - lw - 40 - 64), ol = wrap(ctx, 'body', other, 18, ow);
  return `<div style="position:absolute;inset:0;background:${bg};color:${ink}">`
    + box(64, 220 - f.size * 0.78 - (lh - f.size * 0.78) / 2 + 0, `${disp(ctx, f.size, lh)};color:${ink}`, text)
    + box(64, H - 64 - hOf(ctx, 'colour', lw), '', logoAt(ctx, 'colour', bg, lw), lw)
    + box(W - 64 - ow, H - 64 - ol.length * 26, `font:400 18px/26px var(--body);color:${soft}`, lines(ol), ow) + `</div>`;
}

// ---- art builders per setup: each returns { surface: {html,w,h} } ----
const BUILD = {
  poster(ctx) {
    const P = palette(ctx), H = 1000, W = widthFor(ctx, aspectOf(ctx, SCENE.poster), H);
    return { print: artOf(ctx, poster(ctx, P.dark.hex, W, H, ctx.brand.lines.primary), W, H) };
  },
  night(ctx) {
    const P = palette(ctx), H = 1000, W = widthFor(ctx, aspectOf(ctx, 'poster-venue-night'), H), L = lineSet(ctx)[1];
    return { poster: artOf(ctx, poster(ctx, P.action.hex, W, H, L), W, H) };
  },
  sheets(ctx) {
    const P = palette(ctx), L = lineSet(ctx), H = 1000, W = widthFor(ctx, aspectOf(ctx, 'sheets-gallery-wall', 0), H);
    const sheet = (bg, text, foot) => {
      const ink = P.inkOn(bg), f = fitBalanced(ctx, 'display', text, 72, 595, 3, -0.01);
      return artOf(ctx, `<div style="position:absolute;inset:0;background:${bg};color:${ink}">${box(56, 176 - f.size * 0.7, `${disp(ctx, f.size, 76, -0.01)};color:${ink}`, lines(f.lines))}${foot(bg, ink)}</div>`, W, H);
    };
    const url = ctx.brand.applications.site.url;
    return {
      'sheet-left': sheet(P.dark.hex, L[0], (bg) => box(56, 944 - hOf(ctx, 'colour', 200), '', logoAt(ctx, 'colour', bg, 200), 200)),
      'sheet-mid': sheet(P.light.hex, L[1], (bg, ink) => box(56, 936 - 24, `font:400 20px/24px var(--body);color:${P.quietOn(bg)}`, A(url))),
      'sheet-right': sheet(P.action.hex, L[2], (bg, ink) => box(56, 944 - hOf(ctx, 'symbol', 128), '', ctx.logo.html('symbol', { width: 128, colourway: cwOn(ctx, bg) }), 128)),
    };
  },
  app(ctx) {
    const S = ctx.brand.ui.screen.content, ui = ctx.ui, w = 403, h = 844, R = ctx.roles.dark;
    const nav = (ctx.brand.ui.screen.content.example && ctx.brand.ui.screen.content.example.links) || [];
    const pg = Math.round(S.progress * 100);
    const inner = `<div class="ui" data-theme="dark" style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body)">`
      + box(20, 20, 'display:flex;justify-content:space-between;align-items:center;font:500 15px/20px var(--ff-body)', `<span>${A(S.time)}</span>${ctx.logo.html('horizontal', { width: 84, colourway: cwOn(ctx, R.surface) })}`, w - 40)
      + box(20, 84, '', ui.statusChip(S.deliveries[0].status), 300)
      + box(20, 124, `${'font-family:var(--ff-display);font-stretch:' + (ctx.brand.fonts.display.stretch || 100) + '%'};font-size:40px;line-height:44px;letter-spacing:-0.01em;color:var(--text)`, A(S.eta), w - 40)
      + box(20, 232, 'font:400 16px/24px var(--ff-body);color:var(--text-soft)', A(S.pickup), w - 40)
      + box(20, 316, 'height:1px;background:var(--divider)', `<i style="position:absolute;left:0;top:-1px;width:${pg}%;height:3px;background:var(--action)"></i>`, w - 40)
      + box(20, 340, 'display:flex;justify-content:space-between;font:400 14px/20px var(--ff-body);color:var(--quiet)', `<span>${A(S.from)}</span><span>${A(S.to)}</span>`, w - 40)
      + box(20, 392, '', ui.deliveryRows(4), w - 40)
      + box(20, 736, '', ui.btn(S.share, { variant: 'secondary', block: true }), w - 40) + `</div>`;
    return { 'screen-phone': artOf(ctx, inner, w, h) };
  },
  laptop(ctx) {
    const S = ctx.brand.ui.screen.content, ui = ctx.ui, R = ctx.roles.dark, pg = Math.round(S.progress * 100);
    const act = ctx.ratio(R.action, R.surface) >= 3 ? R.action : R.text;
    const nav = [['Proofs', 'image'], ['Book', 'plus'], ['Prints', 'printer']];
    const links = ctx.brand.ui.screen.content.example && ctx.brand.ui.screen.content.example.links ? ctx.brand.ui.screen.content.example.links : nav;
    const bar = `<nav class="ui-topbar" style="height:64px;padding:0 48px;gap:24px;display:flex;align-items:center;border-bottom:1px solid var(--divider)"><span style="display:block;width:44px">${ctx.logo.html('symbol', { width: 44, colourway: cwOn(ctx, R.surface) })}</span><span style="font:500 20px/24px var(--ff-body);margin-right:24px">${A(ctx.brand.ui.screen.title)}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const left = box(64, 152, '', `<div class="ui-display" style="font-size:96px;line-height:104px;letter-spacing:-0.02em;color:var(--text)">${A(S.time)}</div><div class="ui-display" style="margin-top:24px;font-size:40px;line-height:48px;color:${act}">${A(S.eta)}</div><div style="position:relative;margin-top:72px;height:1px;background:var(--divider)"><i style="position:absolute;left:0;top:-1px;width:${pg}%;height:3px;background:var(--action)"></i></div><div style="display:flex;justify-content:space-between;margin-top:24px;font:400 22px/28px var(--ff-body);color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p style="margin-top:56px;font:400 24px/36px var(--ff-body);color:var(--text-soft)">${A(S.pickup)}</p>`, 560);
    const right = box(728, 128, '', `<div style="width:432px;zoom:1.5">${ui.deliveryRows(5)}</div>`, 648);
    return { 'screen-laptop': artOf(ctx, `<div class="ui" data-theme="dark" style="position:relative;width:1440px;height:900px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body)">${bar}${left}${right}</div>`, 1440, 900) };
  },
  // the book scene is portrait, so a 3:2 frame cuts about 12% off the cover's top and bottom: the caption line sits inside that
  book(ctx) {
    const P = palette(ctx), H = 1000, W = widthFor(ctx, aspectOf(ctx, SCENE.book), H), bg = (P.panel || P.dark).hex, lw = Math.round(W * 0.4);
    const year = new Date(ctx.brand.version.date + 'T00:00:00Z').getUTCFullYear();
    const st = hOf(ctx, 'stacked', lw);
    return { cover: artOf(ctx, `<div style="position:absolute;inset:0;background:${bg};color:${P.inkOn(bg)}">${box((W - lw) / 2, H * 0.4 - st / 2, '', logoAt(ctx, 'stacked', bg, lw), lw)}${box(0, H * 0.8 - 15, `font:400 30px/30px var(--body);text-align:center;color:${P.quietOn(bg)}`, `Selected frames, ${year}`, W)}</div>`, W, H) };
  },
  tote(ctx) {
    const P = palette(ctx), H = 1000, W = widthFor(ctx, aspectOf(ctx, 'tote-hook'), H), lw = Math.round(W * 0.4), st = hOf(ctx, 'stacked', lw);
    return { 'tote-front': artOf(ctx, `<div style="position:absolute;inset:0;background:${P.dark.hex}">${box((W - lw) / 2, H * 0.45 - st / 2, '', logoAt(ctx, 'stacked', P.dark.hex, lw), lw)}</div>`, W, H) };
  },
  card(ctx) {
    const P = palette(ctx), c = ctx.brand.applications.card, cw = 1050, ch = Math.round(1050 / aspectOf(ctx, SCENE.card));
    const front = `<div style="position:absolute;inset:0;background:${P.dark.hex}">${box(64, ch / 2 - hOf(ctx, 'colour', 340) / 2, '', logoAt(ctx, 'colour', P.dark.hex, 340), 340)}</div>`;
    const bg = P.light.hex, ink = P.inkOn(bg);
    const back = `<div style="position:absolute;inset:0;background:${bg};color:${ink}">${box(64, 64, `${disp(ctx, 40, 44, -0.01)};color:${ink}`, A(c.person))}${box(64, 116, `font:400 20px/28px var(--body);color:${P.quietOn(bg)}`, A(c.role))}${box(64, ch - 64 - 56, `font:400 20px/28px var(--body);color:${ink}`, `${A(c.contact)}<br>${A(ctx.brand.applications.site.url)}`)}</div>`;
    return { 'card-front': artOf(ctx, front, cw, ch), 'card-back': artOf(ctx, back, cw, ch) };
  },
  letter(ctx) {
    const P = palette(ctx), E = ctx.brand.guideB.email, bg = P.light.hex, ink = P.inkOn(bg), H = 1000, W = widthFor(ctx, aspectOf(ctx, 'letterhead-linen', 0), H);
    const body = E.body.map((p) => `<p style="margin:0 0 18px">${A(p)}</p>`).join('');
    return { letterhead: artOf(ctx, `<div style="position:absolute;inset:0;background:${bg};color:${ink}">${box(64, 64, '', logoAt(ctx, 'colour', bg, 170), 170)}${box(64, 232, `font:400 16px/24px var(--body);color:${P.quietOn(bg)}`, A(E.to))}${box(64, 272, `${disp(ctx, 38, 44, -0.01)};color:${ink}`, A(E.subject), W - 128)}${box(64, 372, `font:400 18px/28px var(--body);color:${ink}`, body, W - 128)}${box(64, H - 112, `font:400 16px/24px var(--body);color:${ink}`, `${A(E.person || ctx.brand.applications.email.person)}<br><span style="color:${P.quietOn(bg)}">${A(ctx.brand.applications.email.role)}</span>`, 400)}</div>`, W, H) };
  },
  lightbox(ctx) {
    const P = palette(ctx), B = ctx.brand, c = B.applications.card, bg = P.light.hex, ink = P.inkOn(bg), q = P.quietOn(bg), H = 1000, W = widthFor(ctx, aspectOf(ctx, SCENE.lightbox), H);
    const f = fitBalanced(ctx, 'display', B.lines.primary, 96, 900, 2, -0.02);
    const stp = Math.round((W - 72) / 3), col = (i) => { const p = B.personality[i]; if (!p) return ''; const x = 72 + i * stp; return box(x, 640, `${disp(ctx, 28, 32, 0)};color:${ink}`, String(i + 1), stp - 72) + box(x, 690, `font:500 18px/26px var(--body);color:${ink}`, A(p.trait), stp - 72) + box(x, 724, `font:400 16px/24px var(--body);color:${q};max-height:144px;overflow:hidden`, A(p.means.split(/(?<=\.)\s/)[0]), stp - 72); };
    return { sheet: artOf(ctx, `<div style="position:absolute;inset:0;background:${bg};color:${ink}">${box(72, 72, '', logoAt(ctx, 'colour', bg, 240), 240)}${box(W - 72 - 500, 76, `font:500 16px/24px var(--body);color:${ink};text-align:right`, `${A(c.person)}, ${A(c.role)}`, 500)}${box(W - 72 - 500, 100, `font:400 14px/20px var(--body);color:${q};text-align:right`, A(c.contact), 500)}${box(72, 400 - f.size * 0.75, `${disp(ctx, f.size, 96)};color:${ink}`, lines(f.lines))}${[0, 1, 2].map(col).join('')}<div style="position:absolute;left:72px;top:912px;width:${W - 144}px;height:1px;background:${q}"></div>${box(72, 930, `font:400 14px/20px var(--body);color:${q}`, A(B.voice.boilerplate25), 900)}${box(W - 72 - 300, 930, `font:400 14px/20px var(--body);color:${ink};text-align:right`, A(B.applications.site.url), 300)}</div>`, W, H) };
  },
};

export const SCENE = { poster: 'room-studio-print', night: 'poster-venue-night', sheets: 'sheets-gallery-wall', app: 'phone-stone', laptop: 'late-laptop-desk', book: 'bench-book-hands', tote: 'tote-hook', card: 'late-box-office', letter: 'letterhead-linen', lightbox: 'room-proofs-loupe' };

// the composite's URL for a setup, built once per build. A setup named `photo-<shot>` is a brand photograph whose blank poster panel is the scene's surface
const cache = new WeakMap();
export function renderUrl(ctx, setup) {
  if (!cache.has(ctx)) cache.set(ctx, {});
  const c = cache.get(ctx);
  if (!c[setup]) c[setup] = ctx.mockup(SCENE[setup] || setup, BUILD[setup] ? BUILD[setup](ctx) : panelArt(ctx, setup));
  return c[setup];
}
// the brand's own line at poster size on the panel of a photographed street panel, on the action colour so it shows from across the road
function panelArt(ctx, scene) {
  const S = ctx.sceneInfo(scene), q = S.quads[0], H = 1000, W = Math.round(q.aspect * H);
  return { [S.surfaces[0]]: artOf(ctx, poster(ctx, palette(ctx).action.hex, W, H, ctx.brand.lines.primary), W, H) };
}
// the scene that holds this brand photograph, if the library has one
export function photoScene(ctx, shot) { try { const id = 'photo-' + shot.id; return ctx.sceneInfo(id) ? id : null; } catch { return null; } }

// a frame holding the brand's own k-th photograph, cropped by the 3:2 frame (v: the 1.10 or 1.22 bracket crop); the slot edition (or a brand with no photograph) gets a labelled, dashed frame
export function photoFrame(ctx, k, w, h, v = 0) {
  const shots = (ctx.brand.imagery.shots || []).filter((s) => s.photo);
  if (ctx.edition === 'slot' || !shots.length) return `<div class="a pslot" style="left:0;top:0;width:${w}px;height:${h}px"><span class="edge">Your photo</span></div>`;
  const s = shots[k % shots.length], sc = photoScene(ctx, s);
  if (sc) return cut(ctx, sc, v, w, h, s.alt);                      // a blank panel in the picture takes the brand's poster
  const z = [1, 1.10, 1.22][v] || 1, iw = w * z, ih = h * z;
  return ctx.photo(s.id, { style: `position:absolute;left:${px((w - iw) / 2)};top:${px((h - ih) / 2)};width:${px(iw)};height:${px(ih)};max-width:none` });
}
// the shot a photograph frame holds, for a caption
export function photoShot(ctx, k) { const shots = (ctx.brand.imagery.shots || []).filter((s) => s.photo); return ctx.edition === 'slot' || !shots.length ? null : shots[k % shots.length]; }

// a frame, or an enlargement, cut from a setup's render: v0 the whole, v1 a 1.10 crop, v2 a 1.22 crop, centred on the first surface's centroid and clamped inside
export function cut(ctx, setup, v, w, h, alt) {
  const S = ctx.sceneInfo(SCENE[setup] || setup), q = S.quads[0].corners, cx = q.reduce((s, p) => s + p[0], 0) / q.length, cy = q.reduce((s, p) => s + p[1], 0) / q.length;
  const z = [1, 1.10, 1.22][v] || 1, k = Math.max(w / S.w, h / S.h) * z, iw = S.w * k, ih = S.h * k;
  const ox = Math.min(0, Math.max(w - iw, w / 2 - cx * k)), oy = Math.min(0, Math.max(h - ih, h / 2 - cy * k));
  return plateImg(A(renderUrl(ctx, setup)), A(alt || ''), `position:absolute;left:${px(ox)};top:${px(oy)};width:${px(iw)};height:${px(ih)};max-width:none;display:block`);
}
// a scene's plate held in a 3:2 box the way object-fit:cover with an object-position would hold it (a server picture is an svg plate, which takes no object-position):
// sized and offset in shares of the box, so the crop holds at any size. pos: 'X% Y%', as the pages measure it.
export function fillBox(src, S, pos, alt) {
  const [fx, fy] = String(pos).split(' ').map((t) => parseFloat(t) / 100), r = S.w / S.h / 1.5, w = Math.max(1, r), h = Math.max(1, 1 / r);
  const pc = (n) => Math.round(n * 10000) / 100;
  return plateImg(A(src), A(alt || ''), `position:absolute;display:block;max-width:none;left:${pc((1 - w) * fx)}%;top:${pc((1 - h) * fy)}%;width:${pc(w)}%;height:${pc(h)}%`);
}
