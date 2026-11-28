// Theme 36, Doorlist: pages 1 to 7 of the UI style guide (cover, contents, screen, dark, colour roles, tints and pairs, type), A4 portrait (794 x 1123), on the door list.
// Every page is one name on the list, marked in along the foot by the list row ("In: 5 of 13"). The device: the highlighter bar names a part, a numbered marker ties a part of the
// screen to its row, a ticket carries one pair (a pair under its need is turned away, struck), and a state reads like a door decision. The pages draw the engine's real
// components (componentsCss and the tokens, scoped to `.ui` inside `.pg.lg`). `.pg.lg` is used instead of `.pg.dl` on purpose: the brand pages' reset
// (`.pg.dl :where(div,span){padding:0}`) would strip the components' padding.
import { rampBase } from '../../engine/color.js';
import { tokensCss } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { GRADE_NOTE, fontName } from '../../engine/styleguide.js';
import { css as kitCss, groundsOf, tones, varsOf, pad, at, hr, vr, fill, svgAt, field, measure, n1 } from './kit.js';
import { UI_PAGES, NAMES, SHOWS, CREDIT } from './guide-helpers.js';

export const L = 40, R = 754, CW = 714, FOOT = 1075;
const SW = 1024, SH = 900; // the screen is built at 1024 wide and drawn scaled
export const realOf = (ctx, s) => (typeof ctx.real === 'function' ? ctx.real(s) : String(s));
const own = (ctx, s) => ctx.esc(realOf(ctx, s));
const standIn = (ctx) => realOf(ctx, ctx.brand.name) === 'Your brand';

// ---- css: the brand pages' own css under `.pg.lg`, the tokens scoped to `.ui`, and the engine's components ----
export function guideCss(ctx) {
  const tok = tokensCss(ctx), cut = tok.indexOf('@media (prefers-color-scheme'), G = groundsOf(ctx);
  const scoped = tok.slice(0, cut).replace(/^:root \{/m, '.pg.lg .ui {').replace(/^\[data-theme="dark"\] \{/m, '.pg.lg .ui[data-theme="dark"] {');
  const base = kitCss(ctx, '').replace(/\.pg\.dl/g, '.pg.lg').replace(':where(h1,h2,h3,p,div,span){margin:0;padding:0}', ':where(h1,h2,h3,p){margin:0}');
  return `${scoped}\n${componentsCss(ctx)}\n${base}
.pg.lg .gs-in{transform-origin:0 0}
.pg.lg .ui.tr{background:transparent}
.pg.lg .strike{text-decoration:line-through;text-decoration-thickness:2px}
.pg.lg .mk{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 4px;box-sizing:border-box;background:${G.red};color:${tones(ctx, G.red).ink};font:600 12px/1 var(--body);letter-spacing:0}
.pg.lg .ph-c{border:0;padding:0;background:none;color:inherit;font:inherit;letter-spacing:0;text-transform:none;font-style:italic}`;
}

// ---- the page: ground, body, the guide's list row at the foot ----
export const place = (ctx, id) => UI_PAGES.indexOf(id) + 1;
// y 1075 to 1123, always Stock: the number, the page's name on its bar, the venue cell (the Free 7 print the credit), and the running count of the 13
export function guideRow(ctx, id) {
  const G = groundsOf(ctx), t = tones(ctx, G.stock), n = place(ctx, id), free = !!ctx.skeleton, bar = tones(ctx, G.red).ink;
  return `<div class="a lr" style="left:0;top:${FOOT}px;width:794px;height:48px;background:${G.stock};${varsOf(t)}">`
    + `<div class="a" style="left:0;top:0;width:794px;height:2px;background:${G.night}"></div>`
    + `<div class="a mono13" style="left:40px;top:9px;width:48px;height:22px;line-height:22px">${pad(n)}</div>`
    + `<div class="a" style="left:88px;top:13px;height:22px;line-height:22px;white-space:nowrap"><span class="hlbar" style="background:${G.red};color:${bar}">${NAMES[id]}</span></div>`
    + `<div class="a cap" style="left:406px;top:10px;width:230px;line-height:22px;color:var(--ink);white-space:nowrap">${free ? CREDIT : 'UI style guide'}</div>`
    + `<div class="a mono13" style="left:554px;top:9px;width:200px;line-height:22px;text-align:right">In: ${n} of ${UI_PAGES.length}</div></div>`;
}
export function sheet(ctx, id, ground, body, over = '') {
  return `<section class="pg lg" data-page="${id}" style="${varsOf(tones(ctx, ground))}">${body}${guideRow(ctx, id)}${over}</section>`;
}
// the head of a page: its name in display, one line under it, a 2 px rule
export const head = (ctx, id, sub) => at(L, 32, CW, 44, `<h1 class="h1" style="font-size:36px;line-height:44px">${NAMES[id]}</h1>`)
  + at(L, 80, CW, 18, `<span class="cap" style="display:block;color:var(--quiet)">${sub}</span>`) + hr(L, 110, CW, 'var(--ink)', 2);

// ---- small parts, shared with guide-ui2.js ----
export const U = (html, mode = 'light', style = '') => `<div class="ui tr" data-theme="${mode}" style="${style}">${html}</div>`;
export const demo = (html) => `<span data-contrast="demo" style="display:contents">${html}</span>`; // a disabled control is exempt from contrast
export const lb = (x, y, w, html, al = 'left') => at(x, y, w, 16, `<span class="lb" style="display:block;text-align:${al}">${html}</span>`);
export const mono = (x, y, w, html, al = 'left', cls = 'm') => at(x, y, w, 16, `<span class="${cls}" style="display:block;text-align:${al}">${html}</span>`);
export const cap = (x, y, w, html, style = '') => at(x, y, w, null, `<div class="cap" style="${style}">${html}</div>`);
export const mk = (n) => `<span class="mk">${n}</span>`;
export const bar = (ctx, text, extra = '') => `<span class="hlbar" style="background:${groundsOf(ctx).red};color:${tones(ctx, groundsOf(ctx).red).ink};${extra}">${text}</span>`;
export const roleHex = (set, k) => String(typeof set[k] === 'object' ? set[k].fg : set[k]).toUpperCase();
// a section head: a 2 px rule, then the label (and a value at the right)
export const sec = (x, y, w, text, right = '') => hr(x, y, w, 'var(--ink)', 2) + lb(x, y + 10, w, text) + (right ? mono(x, y + 10, w, right, 'right') : '');
export const slotNote = (ctx, path, lead = '') => {
  const en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  return en ? `<div class="nt">${lead}${ctx.esc(en.what)} ${ctx.esc(en.length)}.${en.example ? ` Example: ${ctx.esc(en.example)}.` : ''}</div>` : '';
};
// the width of a line in the body face (for fitting a label at a zoom)
export function bodyWidth(ctx, s, size, weight) {
  try {
    const face = ctx.faces.find((f) => f.role === 'body' && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === 'body'), font = ctx.loadFont(face.stem), upm = font.unitsPerEm;
    return [...String(s)].reduce((a, ch) => a + font.charToGlyph(ch).advanceWidth * size / upm, 0);
  } catch (e) { return String(s).length * size * 0.62; }
}

// ---- the screen: the Organisation profile, built at 1024 x 900 and drawn scaled ----
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
// the screen at a scale, in a frame at (x, y) with a 2 px rule round it; `crop` is the height in screen px that shows
export const screenAt = (ctx, mode, uid, x, y, s, crop = SH, ring = true) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(SW * s)}px;height:${n1(crop * s)}px;overflow:hidden;${ring ? 'box-shadow:0 0 0 2px var(--ink)' : ''}"><div class="gs-in" style="width:${SW}px;height:${SH}px;transform:scale(${s.toFixed(5)})">${screenHtml(ctx, mode, uid)}</div></div>`;

// ---- the markers: eight parts of the screen, each tied to a row under it ----
// dot: where the marker sits on the screen at 1024 wide
const MARKS = [
  ['Surface', 'surface', [640, 10]], ['Text soft', 'textSoft', [1000, 28]], ['Danger', 'danger', [992, 280]], ['Focus', 'focus', [624, 312]],
  ['Edge', 'border', [636, 416]], ['Text', 'text', [440, 143]], ['Quiet', 'quiet', [276, 556]], ['Action', 'action', [58, 606]],
];
function screenPage(ctx, id, mode) {
  const ground = mode === 'dark' ? ctx.roles.dark.surface : ctx.roles.light.sunken, set = ctx.roles[mode], s = CW / SW, Y = 128, E = ctx.esc;
  const sub = mode === 'dark' ? 'The same screen in the dark set, in the same frame as the light one.' : 'The Organisation profile, drawn from the kit\'s own tokens. Each marker is a role.';
  const pins = MARKS.map(([, , d], i) => at(L + d[0] * s - 10, Y + d[1] * s - 10, 20, 20, mk(i + 1))).join('');
  const y0 = Y + SH * s + 22;
  const rows = MARKS.map(([name, key], i) => {
    const col = i < 4 ? 0 : 1, r = i % 4, x = L + col * 357, y = y0 + r * 48, hex = roleHex(set, key), brand = ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    return hr(x, y, 333, r ? 'var(--hair)' : 'var(--ink)', r ? 1 : 2) + at(x, y + 14, 24, 22, mk(i + 1))
      + at(x + 34, y + 6, 160, 20, `<span class="b" style="font-weight:600;font-size:15px;line-height:20px">${name}</span>`)
      + at(x + 34, y + 26, 250, 16, `<span class="m">${hex}</span>${brand ? `<span class="cap" style="margin-left:10px;color:var(--quiet);font-size:12px">${E(brand.name)}</span>` : ''}`)
      + fill(x + 333 - 44, y + 10, 44, 28, set[key], 'box-shadow:0 0 0 1px var(--hair)');
  }).join('');
  const notes = [ctx.edition === 'slot' ? '<div class="nt">Your logo, SVG. Example: the wordmark.</div>' : '', slotNote(ctx, 'colours.0.name', 'Colour names: ')].filter(Boolean).join('');
  return sheet(ctx, id, ground, head(ctx, id, sub) + screenAt(ctx, mode, `lg-${id}`, L, Y, s) + pins + rows + at(L, y0 + 4 * 48 + 14, CW, null, notes));
}

// ---- the pages ----
export const pages = {
  // ---- 1 Cover: the name at the full measure on Door red, the screen standing on a Night stub with three facts ----
  cover(ctx) {
    const G = groundsOf(ctx), M = measure(ctx), N = UI_PAGES.length, nm = own(ctx, ctx.brand.name), ver = String(ctx.versionLine || 'Version 1.0, November 2026');
    const size = Math.max(48, M.fit(realOf(ctx, ctx.brand.name), CW, 150)), base = 70 + size * 0.84, s = 0.53, sy = 462;
    const stub = field(ctx, 0, 944, 794, 131, G.night, [['Pages', `${N}`], ['Sets', 'Light and dark'], ['Size', 'A4 portrait'], ['Version', ctx.esc(ver.replace(/^Version\s+/, ''))]]
      .map(([l, v], i) => at(L + i * 180, 28, 170, 60, `<div class="lb">${l}</div><div class="m13" style="margin-top:6px;white-space:normal">${v}</div>`)).join('') + hr(L, 100, CW, 'var(--hair)', 1));
    return sheet(ctx, 'cover', G.red, lb(L, 36, 400, 'UI style guide') + hr(L, 60, CW, 'var(--ink)', 2)
      + at(L, base - size * 0.84, CW, size, nm, { cls: 'd', style: `font-size:${n1(size)}px;${standIn(ctx) ? 'color:var(--soft)' : ''}` })
      + at(L, base + 26, CW, 52, '<h1 class="h1" style="font-size:44px">UI style guide</h1>')
      + at(L, base + 90, 340, null, '<div class="b" style="font-size:15px">Colour, type and components, drawn as the interface ships them. Every part is the kit\'s own tokens.</div>')
      + at(L, base + 156, 340, null, [ctx.edition === 'slot' ? '<div class="nt">Your logo, SVG. Example: the wordmark.</div>' : '', slotNote(ctx, 'name')].join(''))
      + screenAt(ctx, 'light', 'lg-cover', R - SW * s, sy, s, 900) + stub);
  },

  // ---- 2 Contents: the list. Thirteen names, ruled like a list, each with what it shows ----
  contents(ctx) {
    const G = groundsOf(ctx), M = measure(ctx), ground = G.night, Y = 128, RH = 48;
    const rows = UI_PAGES.map((id, i) => {
      const y = Y + i * RH;
      return hr(L, y, CW, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 2) + at(L, y + 15, 48, 18, `<span class="m13 q">${pad(i + 1)}</span>`)
        + at(L + 56, y + 9, 250, 30, `<span class="h2" style="font-size:22px;line-height:30px;white-space:nowrap">${NAMES[id]}</span>`)
        + at(L + 300, y + 15, CW - 300, 18, `<span class="cap" style="color:var(--quiet);white-space:nowrap">${SHOWS[id]}</span>`);
    }).join('') + hr(L, Y + UI_PAGES.length * RH, CW, 'var(--ink)', 2);
    const ky = Y + UI_PAGES.length * RH + 36, t = tones(ctx, ground), cw = 228;
    const key = lb(L, ky, 300, 'How to read these pages')
      + [[`${bar(ctx, 'Default')}`, 'A name on a bar is a part or a state of the kit, drawn in its real CSS.'], [mk(1), 'A numbered marker ties a part of the screen to its role in the row below.'],
        [`<span class="m13 strike" style="background:${t.wash};padding:3px 6px">2.1 : 1</span>`, 'A struck ratio is turned away: under 4.5 for text, or 3 for an outline or ring.']]
        .map(([mark, txt], i) => at(L + i * 243, ky + 30, cw, 28, mark) + cap(L + i * 243, ky + 66, cw, txt)).join('');
    return sheet(ctx, 'contents', ground, head(ctx, 'contents', `${UI_PAGES.length} names on the list. The Free edition draws seven of them.`) + rows + key);
  },

  screen: (ctx) => screenPage(ctx, 'screen', 'light'),
  dark: (ctx) => screenPage(ctx, 'dark', 'dark'),

  // ---- 5 Colour roles: the light set and the dark set as two cards, one row a role; a ratio under its need is turned away ----
  roles(ctx) {
    const Lt = ctx.roles.light, D = ctx.roles.dark, E = ctx.esc, G = groundsOf(ctx), ground = G.stock, RH = 46, Y = 128, PW = 345, PH = 52 + 15 * RH;
    const R_ = [['surface', 'Surface', 'text', 'surface', 'Text on it', 4.5], ['raised', 'Raised', 'text', 'raised', 'Text on it', 4.5], ['sunken', 'Sunken', 'text', 'sunken', 'Text on it', 4.5], ['text', 'Text', 'text', 'surface', 'On surface', 4.5], ['textSoft', 'Text soft', 'textSoft', 'surface', 'On surface', 4.5], ['quiet', 'Quiet', 'quiet', 'surface', 'On surface', 4.5], ['border', 'Edge', 'border', 'surface', 'Outline, 3', 3], ['divider', 'Divider', 'divider', 'surface', 'Hairline', 0], ['action', 'Action', 'actionLabel', 'action', 'Label on it', 4.5], ['actionHover', 'Action hover', 'actionLabel', 'actionHover', 'Label on it', 4.5], ['actionPressed', 'Action pressed', 'actionLabel', 'actionPressed', 'Label on it', 4.5], ['actionLabel', 'Action label', 'actionLabel', 'action', 'On action', 4.5], ['focus', 'Focus', 'focus', 'surface', 'Ring, 3', 3], ['disabledBg', 'Disabled fill', 'disabledText', 'disabledBg', 'Exempt', 0], ['disabledText', 'Disabled text', 'disabledText', 'disabledBg', 'Exempt', 0]];
    const card = (set, x, title) => {
      const t = tones(ctx, set.surface);
      const rows = R_.map(([k, name, fg, bg, nt, need], i) => {
        const y = 52 + i * RH, r = ctx.ratio(set[fg], set[bg]), fail = need && r < need, txt = `${ctx.fmt(r)} : 1`, hex = roleHex(set, k), brand = ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
        return (i ? hr(14, y, PW - 28, 'var(--hair)', 1) : '') + fill(14, y + 9, 28, 28, set[k], 'box-shadow:0 0 0 1px var(--hair)')
          + at(54, y + 5, 126, 20, `<span class="b" style="font-weight:600;font-size:14px;line-height:20px">${name}</span>`)
          + at(54, y + 25, 130, 16, `<span class="cap" style="font-size:11px;line-height:16px;color:var(--quiet);white-space:nowrap">${nt}${brand ? ` &middot; ${E(brand.name)}` : ''}</span>`)
          + at(180, y + 14, 74, 18, `<span class="m13">${hex}</span>`)
          + (fail ? at(PW - 14 - 76, y + 11, 76, 24, `<span class="m13 strike" data-contrast="demo" style="display:block;text-align:right">${txt}</span>`, { style: `background:${t.wash};padding:3px 6px` })
            : at(PW - 14 - 70, y + 14, 70, 18, `<span class="m13" style="display:block;text-align:right">${need ? txt : 'none'}</span>`));
      }).join('');
      return field(ctx, x, Y, PW, PH, set.surface, at(14, 16, 200, 20, `<span class="lb">${title}</span>`) + hr(14, 40, PW - 28, 'var(--ink)', 2) + rows, 'box-shadow:0 0 0 1px ' + tones(ctx, ground).hair);
    };
    const ey = Y + PH + 22;
    const foot = at(L, ey, CW, null, `<div class="cap">${E(GRADE_NOTE)} A struck ratio is turned away: it is under its need, 4.5 for text and 3 for an outline or ring. Hairlines and disabled parts are exempt.</div>`)
      + at(L, ey + 72, CW, null, slotNote(ctx, 'colours.0.name', 'Colour names: '));
    return sheet(ctx, 'roles', ground, head(ctx, 'roles', 'Fifteen roles in each set. The ratio is the role against the ground it sits on.') + card(Lt, L, 'Light set') + card(D, L + PW + 24, 'Dark set') + foot);
  },

  // ---- 6 Tints and pairs: the primary ramp as tall wristband columns, the other ramps as strips, then a ticket for each pair ----
  tints(ctx) {
    const G = groundsOf(ctx), ground = G.stage, E = ctx.esc, W = ctx.weights, t = tones(ctx, ground);
    const all = [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share);
    const seen = new Set(), cs = [];
    const add = (hex, name) => { const h = String(hex).toLowerCase(); if (seen.has(h)) return; seen.add(h); cs.push({ hex: String(hex).toUpperCase(), name }); };
    all.forEach((c) => add(c.hex, E(c.name))); add(ctx.roles.light.surface, 'Surface'); add(ctx.roles.light.text, 'Text');
    const prim = cs.find((c) => c.hex.toLowerCase() === G.red.toLowerCase()) || cs[0], others = cs.filter((c) => c !== prim).slice(0, 3);
    const ramp = ctx.C.ramp(prim.hex), keys = Object.keys(ramp), base = String(rampBase(prim.hex)), Y = 128, CWc = CW / keys.length, BH = 220;
    const cols = keys.map((k, j) => field(ctx, L + j * CWc, Y, CWc, BH, ramp[k], at(6, 10, CWc - 8, 16, `<span class="m">${k}</span>`) + (k === base ? at(6, 32, CWc - 8, 18, `<span class="m q">base</span>`) : '')
      + at(6, BH - 26, CWc - 8, 16, `<span class="m" style="font-size:10px">${String(ramp[k]).toUpperCase()}</span>`))).join('');
    const sy = Y + BH + 22, strips = others.map((c, i) => {
      const r = ctx.C.ramp(c.hex), ks = Object.keys(r), y = sy + i * 34, w = (CW - 150) / ks.length;
      return at(L, y + 6, 140, 16, `<span class="lb" style="display:block;overflow:hidden;text-overflow:ellipsis">${c.name}</span>`) + ks.map((k, j) => fill(L + 150 + j * w, y, w, 26, r[k])).join('');
    }).join('');
    const legal = [], bad = [];
    cs.forEach((bg) => cs.forEach((fg) => { if (fg === bg) return; const r = ctx.ratio(fg.hex, bg.hex); (r >= 4.5 ? legal : bad).push({ fg, bg, r }); }));
    legal.sort((a, b) => b.r - a.r); bad.sort((a, b) => b.r - a.r);
    const TW = 165, TH = 112, ticket = (p, x, y, fail) => {
      const tb = tones(ctx, p.bg.hex), nm = (n) => `<div class="cap" style="font-size:12px;line-height:15px;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n}</div>`;
      return field(ctx, x, y, TW, TH, p.bg.hex, `<span${fail ? ' data-contrast="demo"' : ''} style="position:absolute;left:12px;top:10px;font:${W.heading} 40px/1 var(--display);letter-spacing:-.02em;color:${p.fg.hex}">Aa</span>`
        + `<div class="a" style="left:76px;top:12px;width:1px;height:${TH - 24}px;border-left:1px dashed ${tb.hair}"></div>`
        + `<div class="a" style="left:70px;top:-6px;width:12px;height:12px;border-radius:50%;background:${ground}"></div><div class="a" style="left:70px;top:${TH - 6}px;width:12px;height:12px;border-radius:50%;background:${ground}"></div>`
        + `<div class="a" style="left:86px;top:12px;width:74px"><div class="lb" style="font-size:10px;letter-spacing:.02em">${fail ? 'Turned away' : 'In'}</div><div class="m13${fail ? ' strike' : ''}" style="margin-top:6px">${ctx.fmt(p.r)} : 1</div></div>`
        + `<div class="a" style="left:12px;top:64px;width:${TW - 24}px">${nm(p.fg.name)}${nm(`on ${p.bg.name}`)}</div>`, `box-shadow:0 0 0 1px ${t.hair}`);
    };
    let y = sy + others.length * 34 + 18, out = sec(L, y, CW, 'Pairs that get in', '4.5 : 1 or more'); y += 30;
    legal.slice(0, 8).forEach((p, i) => { out += ticket(p, L + (i % 4) * 183, y + Math.floor(i / 4) * 128, false); });
    y += Math.ceil(Math.min(legal.length, 8) / 4) * 128 + 6;
    if (bad.length) { out += sec(L, y, CW, 'Pairs turned away', 'never set as text'); y += 30; bad.slice(0, 4).forEach((p, i) => { out += ticket(p, L + i * 183, y, true); }); y += TH + 14; }
    out += at(L, Math.min(y, 1020), CW, null, slotNote(ctx, 'colours.0.name', 'Colour names: '));
    return sheet(ctx, 'tints', ground, head(ctx, 'tints', 'The primary ramp, the other ramps, then each pair of colours on a ticket.') + cols + strips + out);
  },

  // ---- 7 Type: two name tags (display on Door red, body on Night), then each step at its true size with its token at the right ----
  type(ctx) {
    const G = groundsOf(ctx), ground = G.stock, B = ctx.brand, W = ctx.weights, E = ctx.esc, Y = 128;
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size), N = steps.length;
    const words = { headline: 'Nothing matches &quot;serif&quot;', title: 'Organisation profile', 'title-s': 'Discard your changes?', control: 'Save changes', body: 'Your edits to Contact email haven&#39;t been saved.', label: 'Contact email', caption: 'Shown on invoices and emails.' };
    const tag = (x, g, label, f, fam, wt) => field(ctx, x, Y, 348, 170, g, `<div class="lb" style="position:absolute;left:16px;top:14px">${label}</div><div style="position:absolute;left:12px;top:34px;font:${wt} 70px/1 var(--${fam});letter-spacing:-.03em;white-space:nowrap">Aa</div>`
      + `<div class="h2" style="position:absolute;left:16px;bottom:34px;font-family:var(--${fam});font-size:20px;line-height:24px;white-space:nowrap">${E(fontName(f))}</div><div class="m13" style="position:absolute;left:16px;bottom:12px">${f.weights.join(', ')}</div>`);
    const top = Y + 170 + 26, sum = steps.reduce((a, s) => a + s.line, 0), gap = Math.max(12, Math.min(30, Math.floor((1040 - top - sum - 40) / N)));
    let y = top; const rows = steps.map((s, i) => {
      const disp = s.face === 'display', ry = y; y += s.line + gap;
      return hr(L, ry, CW, i ? 'var(--hair)' : 'var(--ink)', i ? 1 : 2)
        + at(L, ry + gap / 2, 520, s.line, `<div style="font-size:${s.size}px;line-height:${s.line}px;font-weight:${disp ? W.heading : s.weight};font-family:var(--${disp ? 'display' : 'body'});${disp ? 'letter-spacing:-.01em;' : ''}white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink)">${words[s.token] || E(s.use)}</div>`)
        + at(R - 170, ry + gap / 2 + Math.max(0, (s.line - 36) / 2), 170, 36, `<div class="m13" style="text-align:right">${s.token}</div><div class="m13 q" style="text-align:right">${s.size} / ${s.line}</div>`);
    }).join('') + hr(L, y, CW, 'var(--ink)', 2);
    return sheet(ctx, 'type', ground, head(ctx, 'type', 'Each step at its true size, in the screen\'s own words. Token, size and line height at the right.')
      + tag(L, G.red, 'Display', B.fonts.display, 'display', W.heading) + tag(L + 366, G.night, 'Body', B.fonts.body, 'body', W.regular) + rows);
  },
};
