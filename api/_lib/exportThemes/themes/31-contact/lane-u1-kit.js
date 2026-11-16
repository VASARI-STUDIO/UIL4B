// Theme 31, Contact sheet, lane u1: the UI kit's chrome, shared read-only with lanes u2 and u3.
// The kit is the second roll: the product photographed on the bench. Same strip, loop on position 3, caption column and foot as the guidelines;
// frame n is kit page n, and the roll puts the screen a page documents under the loop. No export here is named like a lane export, so the loader merges nothing from this file.
// Colours come from ctx roles and brand data; no brand colour id, hex or name is written here.
import { plateImg } from '../../engine/plate.js';
import { A, tokens, put, cwOn, frameLabel, loopPath, loopSvg, captionHead, px } from './helpers.js';
import { kitCss, renderUrl, photoFrame, photoShot, SCENE } from './arts.js';

// ---- the roll: [setup, bracket crop] or ['photo', k]. Frames past the last page are the tail: unexposed, numbered ----
export const KIT_ROLL = {
  1: ['laptop', 0], 2: ['photo', 0], 3: ['desk', 0], 4: ['laptop', 1], 5: ['app', 0], 6: ['hand', 0], 7: ['form', 0], 8: ['dialog', 0],
  9: ['hand', 1], 10: ['form', 1], 11: ['form', 2], 12: ['photo', 1], 13: ['desk', 1], 14: ['laptop', 2], 15: ['app', 1], 16: ['desk', 2],
  17: ['photo', 2], 18: ['dialog', 1], 19: ['desk', 0], 20: ['hand', 2], 21: ['desk', 1], 22: ['laptop', 0], 23: ['app', 2], 24: ['photo', 3], 25: ['desk', 2],
};
// The kit's four photographed setups, one scene id each. These are old-library scenes, held until the new library lands: swap a scene here and nothing else changes
// (the art takes its aspect from the scene). The captions in kitFrameCap name the setting, so change those words with the scene.
export const KIT_SCENE_DESK = 'bench-laptop-shoulder';
export const KIT_SCENE_HAND = 'phone-hand';
export const KIT_SCENE_FORM = 'phone-pool-edge';
export const KIT_SCENE_DIALOG = 'phone-kerb';
const KSCENE = { desk: KIT_SCENE_DESK, hand: KIT_SCENE_HAND, form: KIT_SCENE_FORM, dialog: KIT_SCENE_DIALOG };

// ---- art for the kit's own setups: the real components, in the mode the scene shows ----
const box = (x, y, st, inner, w) => `<div style="position:absolute;left:${px(x)};top:${px(y)};${w ? `width:${px(w)};` : ''}${st}">${inner}</div>`;
const artOf = (ctx, html, w, h) => ({ html: ctx.artPage(html, { w, h, css: kitCss(ctx) }), w, h });
const aspect = (ctx, scene) => ctx.sceneInfo(scene).quads[0].aspect;
const screen = (ctx, mode, w, h, inner) => `<div class="ui"${mode === 'dark' ? ' data-theme="dark"' : ''} style="position:relative;width:${w}px;height:${h}px;overflow:hidden;background:var(--surface);color:var(--text);font-family:var(--ff-body)">${inner}</div>`;
const dstretch = (ctx) => `font-stretch:${ctx.brand.fonts.display.stretch || 100}%`;
function phoneTop(ctx, mode, w) {
  const S = ctx.brand.ui.screen.content, g = ctx.roles[mode].surface;
  return box(20, 20, 'display:flex;justify-content:space-between;align-items:center;font:500 15px/20px var(--ff-body)', `<span>${A(S.time)}</span>${ctx.logo.html('horizontal', { width: 84, colourway: cwOn(ctx, g) })}`, w - 40);
}
const KART = {
  desk(ctx) {
    const S = ctx.brand.ui.screen.content, ui = ctx.ui, R = ctx.roles.light, H = 900, W = Math.round(aspect(ctx, KSCENE.desk) * H), pg = Math.round(S.progress * 100);
    const links = (S.example && S.example.links) || [];
    const bar = `<nav class="ui-topbar" style="height:64px;padding:0 48px;gap:24px;justify-content:flex-start"><span style="display:block;width:44px">${ctx.logo.html('symbol', { width: 44, colourway: cwOn(ctx, R.surface) })}</span><span style="font:500 20px/24px var(--ff-body);margin-right:24px">${A(ctx.brand.ui.screen.title)}</span><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const left = box(64, 152, '', `<div class="ui-display" style="${dstretch(ctx)};font-size:96px;line-height:104px;letter-spacing:-0.02em">${A(S.time)}</div><div class="ui-display" style="${dstretch(ctx)};margin-top:24px;font-size:40px;line-height:48px">${A(S.eta)}</div><div style="position:relative;margin-top:72px;height:1px;background:var(--divider)"><i style="position:absolute;left:0;top:-1px;width:${pg}%;height:3px;background:var(--text)"></i></div><div style="display:flex;justify-content:space-between;margin-top:24px;font:400 22px/28px var(--ff-body);color:var(--quiet)"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p style="margin-top:56px;font:400 24px/36px var(--ff-body);color:var(--text-soft)">${A(S.pickup)}</p>`, 560);
    const right = box(W - 712, 128, '', `<div style="width:432px;zoom:1.5">${ui.deliveryRows(5)}</div>`, 648);
    return { 'screen-laptop': artOf(ctx, screen(ctx, 'light', W, H, bar + left + right), W, H) };
  },
  hand(ctx) {
    const S = ctx.brand.ui.screen.content, ui = ctx.ui, h = 844, w = Math.round(aspect(ctx, KSCENE.hand) * h);
    const inner = phoneTop(ctx, 'light', w) + box(20, 84, '', ui.statusChip(S.deliveries[0].status), w - 40)
      + box(20, 124, `font-family:var(--ff-display);font-weight:${ctx.weights.heading};${dstretch(ctx)};font-size:40px;line-height:44px;letter-spacing:-0.01em;text-wrap:balance`, A(S.eta), w - 40)
      + box(20, 232, 'font:400 16px/24px var(--ff-body);color:var(--text-soft)', A(S.pickup), w - 40)
      + box(20, 340, '', ui.deliveryRows(4), w - 40) + box(20, h - 108, '', ui.btn(S.form.book, { block: true }), w - 40);
    return { 'screen-phone': artOf(ctx, screen(ctx, 'light', w, h, inner), w, h) };
  },
  form(ctx) {
    const F = ctx.brand.ui.screen.content.form, ui = ctx.ui, h = 844, w = Math.round(aspect(ctx, KSCENE.form) * h);
    const fields = `<div style="display:flex;flex-direction:column;gap:20px">${ui.field({ id: 'u1f1', label: F.pickup, value: F.pickupValue })}${ui.field({ id: 'u1f2', label: F.dropoff, value: F.dropoffValue })}${ui.field({ id: 'u1f3', label: F.ready, value: F.readyValue, state: 'focus' })}<div class="ui-field"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 1)}</div></div>`;
    const inner = phoneTop(ctx, 'light', w) + box(20, 84, `font-family:var(--ff-display);font-weight:${ctx.weights.heading};${dstretch(ctx)};font-size:32px;line-height:36px;letter-spacing:-0.01em`, A(F.title), w - 40)
      + box(20, 152, '', fields, w - 40) + box(20, h - 108, '', ui.btn(F.book, { block: true }), w - 40);
    return { 'screen-phone': artOf(ctx, screen(ctx, 'light', w, h, inner), w, h) };
  },
  dialog(ctx) {
    const D = ctx.brand.ui.screen.content.dialog, ui = ctx.ui, h = 844, w = Math.round(aspect(ctx, KSCENE.dialog) * h);
    const inner = `<div class="ui-scrim" style="position:absolute;inset:0;padding:20px">${ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }).replace(/dlg-t/g, 'u1-dlg')}</div>`;
    return { 'screen-phone': artOf(ctx, screen(ctx, 'dark', w, h, inner), w, h) };
  },
};
const kcache = new WeakMap();
function kitUrl(ctx, setup) {
  if (!KART[setup]) return renderUrl(ctx, setup);               // laptop and app: the guidelines' own dark renders
  if (!kcache.has(ctx)) kcache.set(ctx, {});
  const c = kcache.get(ctx);
  return (c[setup] ||= ctx.mockup(KSCENE[setup], KART[setup](ctx)));
}
const sceneOf = (setup) => KSCENE[setup] || { laptop: SCENE.laptop, app: SCENE.app }[setup];
// a frame or an enlargement cut from a setup's render: v0 whole, v1 a 1.10 crop, v2 a 1.22 crop, centred on the surface and clamped inside
export function kitCut(ctx, setup, v, w, h, alt) {
  const S = ctx.sceneInfo(sceneOf(setup)), q = S.quads[0].corners, cx = q.reduce((s, p) => s + p[0], 0) / q.length, cy = q.reduce((s, p) => s + p[1], 0) / q.length;
  const z = [1, 1.10, 1.22][v] || 1, k = Math.max(w / S.w, h / S.h) * z, iw = S.w * k, ih = S.h * k;
  const ox = Math.min(0, Math.max(w - iw, w / 2 - cx * k)), oy = Math.min(0, Math.max(h - ih, h / 2 - cy * k));
  return plateImg(A(kitUrl(ctx, setup)), A(alt || ''), `position:absolute;left:${px(ox)};top:${px(oy)};width:${px(iw)};height:${px(ih)};max-width:none;display:block`);
}
// frame f's contents at w x h
export const kitFrameHtml = (ctx, f, w, h) => { const r = KIT_ROLL[f]; return r[0] === 'photo' ? photoFrame(ctx, r[1], w, h, 0) : kitCut(ctx, r[0], r[1], w, h, kitFrameCap(ctx, f).title); };
// frame f printed large on the page (the enlargement), with the theme's inset outline
export const kitPrint = (ctx, f, x, y, w, h) => `<div class="a fr" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${kitFrameHtml(ctx, f, w, h)}</div>`;

// what the notes say about frame f: the theme names the setup, the brand fills the words
export function kitFrameCap(ctx, f) {
  const B = ctx.brand, S = B.ui.screen.content, t = B.ui.screen.title, r = KIT_ROLL[f];
  if (!r) return { title: 'Unexposed frame', text: 'The roll has ended.' };
  if (r[0] === 'photo') { const s = photoShot(ctx, r[1]); return s ? { title: s.caption || s.slot.split(':')[0], text: `${s.generated ? '' : `Photo: ${s.credit || 'the studio'}. `}The people the product is for.` } : { title: 'Your photograph', text: 'A photograph of the people the product is for, as shot.' }; }
  return {
    laptop: { title: 'Laptop on a night desk', text: `${t} at desktop width, in the dark theme.` },
    desk: { title: 'Laptop at a shared table', text: `${t} at desktop width, in the light theme.` },
    app: { title: 'Phone on travertine', text: `${t} on a phone, in the dark theme.` },
    hand: { title: 'Phone in hand', text: `${t} on a phone, in the light theme.` },
    form: { title: 'Phone at the pool edge', text: `${S.form.title}: the form, in the light theme.` },
    dialog: { title: 'Phone on a granite kerb', text: 'The dialog over its scrim, in the dark theme.' },
  }[r[0]];
}

// ---- the strip, as helpers.js draws it, reading the kit's roll ----
const GX = [60, 294, 528, 762, 996, 1230];
function kitStrip(ctx, T, n, head) {
  const O = 48, last = ctx.pages.length;
  let holes = '';
  for (let j = 0; j < 48; j++) { const x = 62.625 + 29.25 * j - 6 - O; holes += `<rect x="${+x.toFixed(2)}" y="${54 - O}" width="12" height="17" rx="2.5"/><rect x="${+x.toFixed(2)}" y="${245 - O}" width="12" height="17" rx="2.5"/>`; }
  let frames = '', nums = '';
  GX.forEach((gx, i) => {
    const f = n - 3 + i + 1, lx = gx - O, ly = 88 - O;
    if (f < 1 || f > 36) return;                                       // the leader and past the roll's end: plain film
    const tail = f > last || !KIT_ROLL[f];
    frames += tail ? `<div class="a fr fr--empty" style="left:${lx}px;top:${ly}px;width:210px;height:140px"></div>`
      : `<div class="a fr" style="left:${lx}px;top:${ly}px;width:210px;height:140px">${kitFrameHtml(ctx, f, 210, 140)}</div>`;
    nums += put(ctx, { x: gx + 105 - 40 - O, baseline: 240 - O, w: 80, h: 12, cls: 'edge', role: 'edge', size: 12, line: 12, weight: 600, align: 'center', html: frameLabel(f) + '<i class="tri"></i>' });
  });
  const hd = (x, t, raw) => put(ctx, { x: x - O, baseline: 84 - O, w: 196, h: 16, cls: 'edge', role: 'edge', size: 12, line: 16, weight: 600, style: 'line-height:16px;overflow:hidden;text-overflow:ellipsis;white-space:pre', html: raw ? t : A(t) });
  const stock = `${A(ctx.brand.name.toUpperCase())} 400<i class="tri"></i>${String(n).padStart(2, '0')}B`;   // B: the second roll
  return `<div class="a strip" style="left:${O}px;top:${O}px;width:1404px;height:220px;background:${T.film};overflow:hidden"><svg class="a" style="left:0;top:0" width="1404" height="220" viewBox="0 0 1404 220" aria-hidden="true" fill="${T.hole}">${holes}</svg>${frames}${nums}${hd(68, head[0]) + hd(302, stock, true) + hd(770, head[1]) + hd(1238, head[2])}</div>`;
}
const monthYear = (ctx) => new Date(ctx.brand.version.date + 'T00:00:00Z').toLocaleDateString('en-AU', { month: 'long', year: 'numeric', timeZone: 'UTC' });
export function kitHead(ctx, id) {
  const B = ctx.brand, p = ctx.pages.find((x) => x.id === id), a = `${B.name}  UI KIT ${B.version.number}`;
  return id === 'cover' ? [a, B.city || '', monthYear(ctx)] : [a, p.section ? p.section.title : '', p.title];
}
export const kitFoot = (ctx) => put(ctx, { x: 60, baseline: 968, w: 700, h: 16, cls: 'ft', role: 'chrome', size: 12, line: 16, weight: 400, html: A(`${ctx.brand.name} UI kit, version ${ctx.brand.version.number}, ${monthYear(ctx)}`) });

// the page: strip, loop, body, foot. `cls` adds the lane's own class to the section.
export function kitPage(ctx, id, body, cls = '') {
  const T = tokens(ctx), n = ctx.pageNo(id), slug = ctx.slug || ctx.brand.slug;
  return `<section class="pg u1-kit ${cls}" data-page="${id}">${kitStrip(ctx, T, n, kitHead(ctx, id))}${loopSvg(T, loopPath(slug, 'kit:' + id))}${body}${kitFoot(ctx)}</section>`;
}
// the caption column's head for the page's own (circled) frame, then the hairline at 488; the page's words start at 512
export function kitCaption(ctx, id, opts = {}) {
  const f = ctx.pageNo(id), c = kitFrameCap(ctx, f);
  return captionHead(ctx, { no: String(f).padStart(2, '0'), title: c.title, text: c.text, lines: 2, ...opts }) + (opts.noRule ? '' : `<div class="a" style="left:996px;top:488px;width:444px;height:1px;background:var(--hair)"></div>`);
}
// a note label (12/16 chrome 500, quiet)
export const kitLabel = (ctx, x, y, t, w = 444) => put(ctx, { x, y, w, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
// a real component region: dark sits straight on the page ground (the dark surface is the ground), light is a print on paper
export const uiDark = (x, y, w, h, inner, st = '') => `<div class="a ui" data-theme="dark" style="left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}white-space:normal;${st}">${inner}</div>`;
export const uiLight = (x, y, w, h, inner, st = '') => `<div class="a ui" style="left:${x}px;top:${y}px;width:${w}px;${h ? `height:${h}px;` : ''}white-space:normal;${st}">${inner}</div>`;
// the kit's tokens and components for the uikit document (lane-u1.js adds this to the theme css)
export const kitDocCss = (ctx) => (ctx.kind === 'uikit' ? kitCss(ctx) : '');
