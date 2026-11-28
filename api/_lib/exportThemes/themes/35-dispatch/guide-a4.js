// Theme 35, Dispatch: pages 1 to 7 of the UI style guide (cover, contents, screen, dark, colour roles, tints and pairs, type), A4 portrait, as consignment labels.
// Every page is a label with the brand pages' A4 stub at the foot (page time, a Code 128 barcode that encodes the page, the mark). The device is the route line (a numbered
// stop on a part of the screen, run out to the margin), the docket (a role set as a row with its ratio) and the void (a ratio under its need, struck through).
// Hard blocks of Signal and Asphalt carry the grounds. The pages draw the engine's real components (componentsCss and the tokens, scoped to `.ui` inside `.pg.dg`).
// `.pg.dg` is used instead of `.pg.ds` on purpose: the brand pages' reset (`.pg.ds :where(div,span){padding:0}`) would strip the components' padding.
import { rampBase } from '../../engine/color.js';
import { tokensCss } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { GRADE_NOTE, fontName } from '../../engine/styleguide.js';
import { barcodeRects } from './barcode.js';
import { copy } from './showcase.js';
import { css as kitCss, groundsOf, tones, varsOf, timeOf, pad, at, hr, vr, fill, svgAt, field, measure, word, n1 } from './kit.js';
import { realOf } from './pages-2.js';
import { uiOrder, UI_PAGES, NAMES, SHOWS } from './guide-helpers.js';

export const L = 40, R = 754, CW = 714;
const SW = 1024, SH = 900; // the screen is built at 1024 wide and drawn scaled
const own = (ctx, s) => ctx.esc(realOf(ctx, s));
const standIn = (ctx) => realOf(ctx, ctx.brand.name) === 'Your brand';

// ---- css: the brand pages' own css under `.pg.dg`, the tokens scoped to `.ui`, and the engine's components ----
export function guideCss(ctx) {
  const tok = tokensCss(ctx), cut = tok.indexOf('@media (prefers-color-scheme');
  const scoped = tok.slice(0, cut).replace(/^:root \{/m, '.pg.dg .ui {').replace(/^\[data-theme="dark"\] \{/m, '.pg.dg .ui[data-theme="dark"] {');
  const base = kitCss(ctx, '').replace(/\.pg\.ds/g, '.pg.dg').replace(':where(h1,h2,h3,p,div,span){margin:0;padding:0}', ':where(h1,h2,h3,p){margin:0}');
  return `${scoped}\n${componentsCss(ctx)}\n${base}
.pg.dg .ph-c{border:0;padding:0;background:none;color:inherit;font:inherit;letter-spacing:0;text-transform:none;font-style:italic}
.pg.dg .pn .ph-c{font-style:normal;color:var(--ink)}
.pg.dg .gs-in{transform-origin:0 0}
.pg.dg .ui.tr{background:transparent}
.pg.dg .strike{text-decoration:line-through;text-decoration-thickness:2px}`;
}

// ---- the label: ground, body, the A4 stub at the foot (the page's place in the guide, not in the brand book) ----
const place = (ctx, id) => { const o = uiOrder(ctx), i = o.indexOf(id); return { n: (i < 0 ? UI_PAGES.indexOf(id) : i) + 1, N: o.length }; };
const codeOf = (ctx, id) => `${copy(ctx, 'page.code', 'BRAND00')}-G${pad(place(ctx, id).n)}`;
function stub(ctx, id, t) {
  const { n, N } = place(ctx, id), free = !!ctx.skeleton, G = groundsOf(ctx), g = ctx.logo.geos.symbol, mh = free ? 28 : 32, mw = mh * g.w / g.h;
  const cw = t.ground === G.primary ? 'on-signal' : t.ground === G.panel ? 'on-concrete' : t.ground === G.ink ? 'reversed' : 'colour';
  let html; try { html = ctx.logo.html('symbol', { width: mw, colourway: cw }); } catch (e) { html = ctx.logo.html('symbol', { width: mw }); }
  return svgAt(0, 1026, 794, 2, `<path d="M0 1H794" stroke="${t.perf}" stroke-width="2" stroke-dasharray="6 6" fill="none"/>`)
    + at(40, 1051, 120, 24, timeOf(n), { cls: 'm20' })
    + at(40, 1079, 120, 18, `${pad(n)}/${pad(N)}`, { cls: 'm13 q' })
    + svgAt(0, 0, 794, 1123, barcodeRects(codeOf(ctx, id), 184, 1051, 400, 48, { colour: t.ink }))
    + (free ? at(R - 100, 1040, 100, 14, '<span class="lb" style="font-size:10px;line-height:14px;display:block;text-align:right">Made with UIL4B</span>') : '')
    + at(R - mw, free ? 1067 : 1059, mw, mh, html);
}
export function label(ctx, id, ground, body) {
  return `<section class="pg dg" data-page="${id}" style="${varsOf(tones(ctx, ground))}">${body}${stub(ctx, id, tones(ctx, ground))}</section>`;
}
// the head of a label: three cells split by 4 px rules (item, page, due)
export function band(ctx, id) {
  const { n, N } = place(ctx, id), cell = (i, lab, v) => at(L + i * 238 + (i ? 20 : 0), 50, 210, 56, `<div class="lb">${lab}</div><div class="h2" style="margin-top:4px">${v}</div>`);
  return hr(L, 40, CW) + hr(L, 112, CW) + vr(L + 238, 44, 64) + vr(L + 476, 44, 64) + cell(0, 'Item', NAMES[id]) + cell(1, 'Page', `${pad(n)} of ${pad(N)}`) + cell(2, 'Due', timeOf(n));
}
export const note = (x, y, w, html, cls = 'nt') => at(x, y, w, null, `<div class="${cls}">${html}</div>`);

export const roleHex = (set, k) => String(typeof set[k] === 'object' ? set[k].fg : set[k]).toUpperCase();
function screenHtml(ctx, mode, uid) {
  const ui = ctx.ui, name = own(ctx, ctx.brand.name);
  const links = ['Profile', 'Notifications', 'Security'].map((t, i) => `<a class="ui-link" href="#"${i === 0 ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  const fld = (id, label, value, { help, state } = {}) => `<div class="ui-field"><label class="ui-label" for="${id}">${label}</label><div style="position:relative"><input class="ui-input${state ? ' is-' + state : ''}" id="${id}" type="text" value="${value}" readonly tabindex="-1"${help ? ` aria-describedby="${id}-m"` : ''}></div>${help ? `<p class="ui-help" id="${id}-m">${help}</p>` : ''}</div>`;
  // a slot edition has no logo yet: a ghost wordmark of about 120 x 32 stands in its place
  const logo = ctx.edition === 'slot' ? `<span class="ui-display" style="display:inline-flex;align-items:center;width:120px;height:32px;font-size:22px;color:var(--quiet);font-style:italic">Your logo</span>` : `<strong class="ui-display" style="font-size:22px">${name}</strong>`;
  return `<div class="ui" data-theme="${mode}" style="width:${SW}px;height:${SH}px;position:relative;overflow:hidden"><nav class="ui-topbar" aria-label="Main" style="padding:0 32px">${logo}<div class="ui-topbar__links">${links}</div></nav>
<div style="position:relative;display:grid;grid-template-columns:560px 1fr;column-gap:64px;padding:64px 64px 0">
<div><h1 class="ui-display" style="margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)">Organisation profile</h1><div style="margin-top:20px">${ui.alert('info', 'Changes apply to every page.')}</div>
<div style="margin-top:44px;display:flex;flex-direction:column;gap:36px">${fld(`${uid}-o`, 'Organisation name', name, { state: 'focus' })}${fld(`${uid}-e`, 'Contact email', 'name@example.com')}${fld(`${uid}-w`, 'Website', '', { help: 'Shown on invoices and emails.' })}</div>
<div style="margin-top:48px;display:flex;gap:12px;align-items:flex-start">${ui.btn('Save changes')}${ui.btn('Cancel', { variant: 'secondary' })}</div></div>
<div style="display:flex;flex-direction:column;gap:16px;padding-top:8px">${ui.alert('success', 'Profile saved.')}${ui.alert('warning', 'Your session ends in 5 minutes.')}${ui.alert('danger', "We couldn't save. Check your connection and try again.")}</div></div>
<div style="position:absolute;left:64px;bottom:40px">${ui.toast('Organisation profile saved.')}</div></div>`;
}
function swatches(ctx, max = 6) {
  const L = ctx.roles.light, seen = new Set(), out = [];
  const add = (hex, name) => { const h = String(hex).toLowerCase(); if (seen.has(h)) return; seen.add(h); out.push({ hex: String(hex).toUpperCase(), name }); };
  [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share).forEach((c) => add(c.hex, ctx.esc(c.name)));
  add(L.surface, 'Surface'); add(L.text, 'Text');
  return out.slice(0, max);
}
export const slotNote = (ctx, path, lead = '') => {
  const en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  return en ? `<div class="nt">${lead}${ctx.esc(en.what)} ${ctx.esc(en.length)}.${en.example ? ` Example: ${ctx.esc(en.example)}.` : ''}</div>` : '';
};
// the screen at a scale, in a frame at (x, y) with a 4 px rule round it; `crop` is the height in screen px that shows
export const screenAt = (ctx, mode, uid, x, y, s, crop = SH) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(SW * s)}px;height:${n1(crop * s)}px;overflow:hidden;box-shadow:0 0 0 4px var(--ink)"><div class="gs-in" style="width:${SW}px;height:${SH}px;transform:scale(${s.toFixed(5)})">${screenHtml(ctx, mode, uid)}</div></div>`;
export const stopDot = (n) => `<span style="display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--ink);color:var(--g);font:600 12px/1 var(--body)">${n}</span>`;

// ---- the route lines: eight stops on the screen, each a numbered stop in the right margin ----
// dot: where the stop sits on the screen at 1024 wide; a fourth value is the y of the track when the line first drops (a part with clear space under it)
const STOPS = [
  ['Surface', 'surface', [640, 10]], ['Text soft', 'textSoft', [1010, 28]], ['Danger', 'danger', [948, 276]], ['Focus', 'focus', [624, 312]],
  ['Edge', 'border', [624, 416]], ['Text', 'text', [124, 483]], ['Quiet', 'quiet', [276, 556]], ['Action', 'action', [76, 651], 700],
];
function routes(ctx, mode, ground, x0, y0, s) {
  const set = ctx.roles[mode], t = tones(ctx, ground), E = ctx.esc;
  const items = STOPS.map(([role, key, dot, drop]) => ({ role, key, hex: roleHex(set, key), dx: x0 + dot[0] * s, dy: y0 + dot[1] * s, ty: y0 + (drop || dot[1]) * s })).sort((a, b) => a.ty - b.ty);
  let ly = 0, lines = '', pins = '';
  items.forEach((it, i) => {
    it.n = i + 1; it.ly = ly = Math.max(it.ty, i ? ly + 30 : y0 + 11); it.lane = R - 34 - i * 8;
    lines += `<path d="M${n1(it.dx)} ${n1(it.dy)}V${n1(it.ty)}H${it.lane}V${n1(it.ly)}H${R - 22}" stroke="${t.ink}" stroke-width="2" fill="none"/>`
      + `<circle cx="${n1(it.dx)}" cy="${n1(it.dy)}" r="5" fill="${set.surface}" stroke="${t.ink}" stroke-width="2"/>`;
    pins += at(R - 22, it.ly - 11, 22, 22, stopDot(it.n));
  });
  const rows = items.map((it, i) => {
    const col = i % 2, row = (i - col) / 2, x = L + col * 357, y = 700 + row * 48, brand = ctx.colours.find((c) => c.hex.toLowerCase() === it.hex.toLowerCase());
    return hr(x, y, 357, row ? 'var(--hair)' : 'var(--ink)', row ? 1 : 4)
      + at(x, y + 12, 22, 22, stopDot(it.n))
      + at(x + 34, y + 8, 220, 16, `<span class="lb">${it.role}</span>`) + at(x + 34, y + 24, 300, 18, `<span class="m13">${it.hex}</span>${brand ? `<span class="cap" style="margin-left:10px;color:var(--quiet)">${E(brand.name)}</span>` : ''}`)
      + fill(x + 357 - 44, y + 10, 36, 28, set[it.key], 'box-shadow:0 0 0 1px var(--hair)');
  }).join('');
  return svgAt(0, 0, 794, 1123, lines) + pins + rows;
}
function screenPage(ctx, id, mode) {
  const ground = mode === 'dark' ? ctx.roles.dark.surface : ctx.roles.light.sunken, s = 0.6, Y = 132;
  const slots = [ctx.edition === 'slot' ? '<div class="nt">Your logo, SVG.</div>' : '', slotNote(ctx, 'colours.0.name', 'Colour names: ')].filter(Boolean).join('');
  const body = band(ctx, id) + screenAt(ctx, mode, `dg-${id}`, L, Y, s) + routes(ctx, mode, ground, L, Y, s)
    + at(L, 930, 330, null, slots) + at(L + 380, 930, CW - 380, null, `<div class="cap" style="text-align:right">${mode === 'dark' ? 'The same screen in the dark set, in the same frame.' : 'The Organisation profile, drawn from the kit\'s own tokens.'} Each stop names a role.</div>`);
  return label(ctx, id, ground, body);
}

// ---- the pages ----
export const pages = {
  // ---- 1 Cover: the name at the full measure on Signal; the screen on a heavy rule at the foot ----
  cover(ctx) {
    const G = groundsOf(ctx), M = measure(ctx), E = ctx.esc, N = uiOrder(ctx).length, ver = String(ctx.versionLine || 'Version 1.0, November 2026');
    const cells = [['Consignment', E(copy(ctx, 'page.code', 'BRAND00'))], ['Items', `${N} pages`], ['Version', E(ver.replace(/^Version\s+/, ''))]].map(([l, v], i) => at(L + i * 238 + (i ? 16 : 0), 54, 214, 36, `<div class="lb">${l}</div><div class="m13">${v}</div>`)).join('');
    const size = Math.max(48, M.fit(own(ctx, ctx.brand.name), CW, 180)), s = 0.5, base = 124 + size * 0.8;
    const rows = [['Pages', `${N}`], ['Sets', 'Light and dark'], ['Size', 'A4 portrait']].map(([l, v], i) => hr(L, 660 + i * 52, 190, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(L, 674 + i * 52, 190, 40, `<div class="lb">${l}</div><div class="m13">${v}</div>`)).join('');
    const body = hr(L, 40, CW) + cells + vr(L + 238, 44, 44) + vr(L + 476, 44, 44) + hr(L, 100, CW)
      + word(M, L, base, own(ctx, ctx.brand.name), size, { style: standIn(ctx) ? 'color:var(--soft)' : '' })
      + at(L, base + 36, CW, 52, '<h1 class="h1" style="font-size:44px">UI style guide</h1>')
      + at(L, 500, 190, null, '<div class="b" style="font-size:15px">Colour, type and components, drawn as the interface ships them.</div>')
      + rows + screenAt(ctx, 'light', 'dg-cover', R - SW * s, 486, s, SH)
      + hr(L, 936, CW)
      + at(L, 950, 260, null, [ctx.edition === 'slot' ? '<div class="nt">Your logo, SVG. Example: the wordmark.</div>' : '', slotNote(ctx, 'name')].join(''));
    return label(ctx, 'cover', G.primary, body);
  },

  // ---- 2 Contents: one route line down the page, a stop for each of the 13 pages ----
  contents(ctx) {
    const G = groundsOf(ctx), ground = G.panel, Y = 140, RH = 52, rx = 112;
    const rows = UI_PAGES.map((id, i) => {
      const y = Y + i * RH;
      return (i ? hr(146, y, R - 146, 'var(--hair)', 1) : '') + at(L, y + 16, 50, 18, `<span class="m13 q">${pad(i + 1)}</span>`)
        + svgAt(rx - 9, y + 17, 18, 18, `<rect x="1" y="1" width="16" height="16" fill="var(--ink)"/><rect x="6" y="6" width="6" height="6" fill="var(--g)"/>`)
        + at(146, y + 12, 220, 28, `<span class="h2" style="font-size:21px">${NAMES[id]}</span>`) + at(330, y + 17, 330, 18, `<span class="cap" style="color:var(--quiet)">${SHOWS[id]}</span>`)
        + at(R - 70, y + 16, 70, 18, `<span class="m13" style="display:block;text-align:right">${timeOf(i + 1)}</span>`);
    }).join('');
    const ky = Y + 13 * RH + 24, cols = [L, L + 250, L + 500];
    const key = hr(L, ky, CW) + at(L, ky + 12, CW, 16, '<span class="lb">How to read these pages</span>')
      + svgAt(cols[0], ky + 44, 150, 28, `<path d="M4 14H110V4" stroke="var(--ink)" stroke-width="2" fill="none"/><circle cx="4" cy="14" r="4.5" fill="var(--g)" stroke="var(--ink)" stroke-width="2"/>`) + at(cols[0] + 118, ky + 40, 24, 24, stopDot(1))
      + at(cols[1], ky + 46, 120, 22, '<span class="m13">4.5 : 1</span>') + at(cols[2], ky + 44, 76, 26, '<span class="m13 strike">2.1 : 1</span>', { style: `background:${tones(ctx, ground).wash};padding:4px 6px` })
      + [['A route line joins a part of the screen to its role. Its stop carries the number.', 0], ['A docket sets a role as a row, with its ratio against what it needs.', 1], ['A struck ratio is under its need: 4.5 for text, 3 for an outline or ring.', 2]].map(([txt, i]) => at(cols[i], ky + 84, 214, null, `<div class="cap">${txt}</div>`)).join('');
    const body = band(ctx, 'contents') + at(rx - 2, Y + 26, 4, RH * 12, '', { style: 'background:var(--ink)' }) + rows + key;
    return label(ctx, 'contents', ground, body);
  },

  screen: (ctx) => screenPage(ctx, 'screen', 'light'),
  dark: (ctx) => screenPage(ctx, 'dark', 'dark'),

  // ---- 5 Colour roles: a docket of 15 rows, light and dark; a ratio under its need is struck ----
  roles(ctx) {
    const L0 = ctx.roles.light, D = ctx.roles.dark, E = ctx.esc, ground = L0.surface, t = tones(ctx, ground), RH = 48, Y = 148;
    const R_ = [['surface', 'Surface', 'text', 'surface', 'Text on it', 4.5], ['raised', 'Raised', 'text', 'raised', 'Text on it', 4.5], ['sunken', 'Sunken', 'text', 'sunken', 'Text on it', 4.5], ['text', 'Text', 'text', 'surface', 'On surface', 4.5], ['textSoft', 'Text soft', 'textSoft', 'surface', 'On surface', 4.5], ['quiet', 'Quiet', 'quiet', 'surface', 'On surface', 4.5], ['border', 'Edge', 'border', 'surface', 'Outline on surface', 3], ['divider', 'Divider', 'divider', 'surface', 'Hairline on surface', 0], ['action', 'Action', 'actionLabel', 'action', 'Label on it', 4.5], ['actionHover', 'Action hover', 'actionLabel', 'actionHover', 'Label on it', 4.5], ['actionPressed', 'Action pressed', 'actionLabel', 'actionPressed', 'Label on it', 4.5], ['actionLabel', 'Action label', 'actionLabel', 'action', 'On action', 4.5], ['focus', 'Focus', 'focus', 'surface', 'Ring on surface', 3], ['disabledBg', 'Disabled fill', 'disabledText', 'disabledBg', 'Text on it', 0], ['disabledText', 'Disabled text', 'disabledText', 'disabledBg', 'On disabled fill', 0]];
    const cx = { sl: L, role: 80, lh: 300, lr: 376, sd: 476, dh: 514, dr: 594, need: 674 };
    const heads = [['Role', cx.role, 'left', 200], ['Light', cx.lh, 'left', 76], ['Ratio', cx.lr, 'right', 60], ['Dark', cx.dh, 'left', 76], ['Ratio', cx.dr, 'right', 60], ['Needs', cx.need, 'right', 80]].map(([l, x, al, w]) => at(x, Y - 24, w, 16, `<span class="lb" style="display:block;text-align:${al}">${l}</span>`)).join('');
    const ratio = (set, fg, bg, need, x, y) => {
      const r = ctx.ratio(set[fg], set[bg]), txt = ctx.fmt(r), fail = need && r < need;
      return fail ? at(x, y + 12, 60, 24, `<span class="m13 strike" style="display:block;text-align:right">${txt}</span>`, { style: `background:${t.wash};padding:3px 6px` }) : at(x, y + 15, 60, 18, `<span class="m13" style="display:block;text-align:right">${txt}</span>`);
    };
    const groupEnd = new Set([2, 5, 7, 11, 12]);
    const rows = R_.map(([k, name, fg, bg, nt, need], i) => {
      const y = Y + i * RH, hex = String(L0[k]).toUpperCase(), brand = ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase()), g = groupEnd.has(i - 1);
      return (i ? hr(L, y, CW, g ? 'var(--ink)' : 'var(--hair)', g ? 2 : 1) : '')
        + fill(cx.sl, y + 10, 28, 28, L0[k], 'box-shadow:0 0 0 1px var(--hair)') + fill(cx.sd, y + 10, 28, 28, D[k], 'box-shadow:0 0 0 1px var(--hair)')
        + at(cx.role, y + 4, 210, 22, `<span class="b" style="font-weight:600;font-size:15px">${name}</span>`) + at(cx.role, y + 26, 215, 16, `<span class="cap" style="font-size:11px;line-height:16px;color:var(--quiet)">${nt}${brand ? ` &middot; ${E(brand.name)}` : ''}</span>`)
        + at(cx.lh, y + 15, 76, 18, `<span class="m13">${hex}</span>`) + ratio(L0, fg, bg, need, cx.lr, y)
        + at(cx.dh, y + 15, 76, 18, `<span class="m13">${String(D[k]).toUpperCase()}</span>`) + ratio(D, fg, bg, need, cx.dr, y)
        + at(cx.need, y + 15, 80, 18, `<span class="m13" style="display:block;text-align:right">${need ? need.toFixed(1) : 'none'}</span>`);
    }).join('');
    const ey = Y + 15 * RH, foot = hr(L, ey, CW) + at(L, ey + 14, CW, null, `<div class="cap">${E(GRADE_NOTE)} A struck ratio is under its need: text needs 4.5, an outline or ring needs 3. Hairlines and disabled parts are exempt.</div>`)
      + at(L, ey + 70, CW, null, slotNote(ctx, 'colours.0.name', 'Colour names: '));
    return label(ctx, 'roles', ground, band(ctx, 'roles') + hr(L, Y - 4, CW, 'var(--ink)', 4) + heads + rows + foot);
  },

  // ---- 6 Tints and pairs: the primary ramp as full-bleed bands, the others as strips, then "Aa" on each legal pair ----
  tints(ctx) {
    const G = groundsOf(ctx), ground = G.panel, t = tones(ctx, ground), W = ctx.weights, cs = swatches(ctx);
    const prim = cs.find((c) => c.hex.toLowerCase() === G.primary.toLowerCase()) || cs[0], others = cs.filter((c) => c !== prim).slice(0, 3);
    const ramp = ctx.C.ramp(prim.hex), keys = Object.keys(ramp), base = String(rampBase(prim.hex)), BH = 33, Y = 128;
    const bands = keys.map((k, j) => field(ctx, 0, Y + j * BH, 794, BH, ramp[k], at(L, 8, 200, 18, `<span class="m13">${k}${k === base ? ' base' : ''}</span>`) + at(R - 140, 8, 140, 18, `<span class="m13" style="display:block;text-align:right">${String(ramp[k]).toUpperCase()}</span>`))).join('');
    const sy = Y + keys.length * BH + 16, strips = others.map((c, i) => {
      const r = ctx.C.ramp(c.hex), ks = Object.keys(r), y = sy + i * 24;
      return at(L, y + 1, 120, 16, `<span class="lb" style="display:block;overflow:hidden;text-overflow:ellipsis">${c.name}</span>`) + ks.map((k, j) => fill(170 + j * 58.4, y, 58.4, 18, r[k])).join('');
    }).join('');
    const py = sy + others.length * 24 + 18;
    const legal = [], bad = [];
    cs.forEach((bg) => cs.forEach((fg) => { if (fg === bg) return; const r = ctx.ratio(fg.hex, bg.hex); (r >= 4.5 ? legal : bad).push({ fg, bg, r }); }));
    legal.sort((a, b) => b.r - a.r); bad.sort((a, b) => b.r - a.r);
    const pitch = (CW - 80) / 5, circle = (p, x, y, d, size, fail) => {
      const tb = tones(ctx, p.bg.hex);
      return `<div class="a"${fail ? ' data-contrast="demo"' : ''} style="left:${n1(x)}px;top:${y}px;width:${d}px;height:${d}px;border-radius:50%;background:${p.bg.hex};box-shadow:inset 0 0 0 1px ${t.hair}"><span style="position:absolute;inset:0;display:grid;place-items:center;font:${W.heading} ${size}px/1 var(--display);letter-spacing:-.02em;color:${p.fg.hex}">Aa</span></div>`
        + (fail ? svgAt(x, y, d, d, `<path d="M${d * 0.15} ${d * 0.85}L${d * 0.85} ${d * 0.15}" stroke="${tb.ink}" stroke-width="3" fill="none"/>`) : '')
        + at(x - 24, y + d + 6, d + 48, 52, `<div class="m13" style="text-align:center${fail ? ';text-decoration:line-through' : ''}">${ctx.fmt(p.r)}</div>${fail ? '' : `<div class="cap pn" style="text-align:center;font-size:12px;line-height:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.fg.name}</div><div class="cap pn" style="text-align:center;font-size:12px;line-height:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">on ${p.bg.name}</div>`}`);
    };
    let y = py, out = at(L, y, CW, 16, '<span class="lb">Legal pairs, 4.5 or more</span>') + hr(L, y + 20, CW, 'var(--ink)', 4); y += 36;
    legal.slice(0, 12).forEach((p, i) => { const col = i % 6, row = (i - col) / 6; out += circle(p, L + col * pitch, y + row * 134, 80, 34, false); });
    y += Math.ceil(Math.min(legal.length, 12) / 6) * 134 + 2;
    if (bad.length && y < 900) {
      out += at(L, y, CW, 16, '<span class="lb">Under 4.5, never set as text</span>') + hr(L, y + 20, CW, 'var(--ink)', 4); y += 34;
      bad.slice(0, 6).forEach((p, i) => { out += circle(p, L + i * pitch, y, 48, 20, true); });
      y += 92;
    }
    out += at(L, Math.min(y, 988), CW, null, slotNote(ctx, 'colours.0.name', 'Colour names: '));
    return label(ctx, 'tints', ground, band(ctx, 'tints') + bands + strips + out);
  },

  // ---- 7 Type: Asphalt as the ground; the largest step at its true size, the rest descending, the token and size/line to the left ----
  type(ctx) {
    const G = groundsOf(ctx), ground = G.ink, B = ctx.brand, W = ctx.weights, E = ctx.esc;
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size), N = steps.length;
    const words = { headline: 'Nothing matches &quot;serif&quot;', title: 'Organisation profile', 'title-s': 'Discard your changes?', control: 'Save changes', body: 'Your edits to Contact email haven&#39;t been saved.', label: 'Contact email', caption: 'Shown on invoices and emails.' };
    const face = (x, label, f, fam, wt) => at(x, 128, 330, null, `<div class="lb">${label}</div><div style="font:${wt} 120px/1 var(--${fam});letter-spacing:-.03em;margin:4px 0 0 -4px;white-space:nowrap;color:var(--ink)">Aa</div><div class="h2" style="margin-top:6px;font-family:var(--${fam});font-size:20px">${E(fontName(f))}</div><div class="m13" style="margin-top:4px">${f.weights.join(', ')}</div>`);
    const top = 392, sum = steps.reduce((a, s) => a + s.line, 0), gap = Math.max(12, Math.min(30, Math.floor((590 - sum) / N)));
    let y = top; const rows = steps.map((s, i) => {
      const disp = s.face === 'display', h = s.line + gap, ry = y; y += h;
      return hr(L, ry, CW, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 4) + at(L, ry + gap / 2 + Math.max(0, (s.line - 36) / 2) + 2, 220, 36, `<div class="m13">${s.token}</div><div class="m13 q">${s.size} / ${s.line}</div>`)
        + at(288, ry + gap / 2 + 2, R - 288, s.line, `<div style="font-size:${s.size}px;line-height:${s.line}px;font-weight:${disp ? W.heading : s.weight};font-family:var(--${disp ? 'display' : 'body'});${disp ? 'letter-spacing:-.01em;' : ''}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)">${words[s.token] || E(s.use)}</div>`);
    }).join('') + hr(L, y, CW, 'var(--ink)', 4);
    const body = band(ctx, 'type') + face(L, 'Display', B.fonts.display, 'display', W.heading) + face(L + 360, 'Body', B.fonts.body, 'body', W.regular)
      + rows + at(L, Math.min(y + 14, 990), CW, null, '<div class="cap">Each line is set at its true size, in the screen\'s own words. The token and its size over line height are at left.</div>');
    return label(ctx, 'type', ground, body);
  },
};
