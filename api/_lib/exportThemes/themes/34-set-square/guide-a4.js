// Theme 34, Set Square: pages 1 to 7 of the UI style guide (cover, contents, screen, dark, colour roles, tints and pairs, type), A4 portrait, as shop drawings.
// The sheet is the brand pages' sheet: a 7 x 10 module grid of 96 px (x 61 to 733, y 60 to 1020), the tick ruler and a two-row title block at the foot. The
// device is the leader (a part to its role name), the dimension line (a true token value), the schedule (a list set as rows) and the hatch (a pair that fails).
// The pages draw the engine's real components (componentsCss and the tokens, scoped to `.ui` inside `.pg.sg`), so a control is the control the kit ships.
// `.pg.sg` is used instead of `.pg.ss` on purpose: the brand pages' reset (`.pg.ss :where(div,span){padding:0}`) would strip the components' padding.
import { readableOn, rampBase } from '../../engine/color.js';
import { tokensCss } from '../../engine/tokens.js';
import { componentsCss } from '../../engine/components.js';
import { GRADE_NOTE, fontName } from '../../engine/styleguide.js';
import { tones, varsOf, geo, at, hr, fill, svgAt, dim, dimBg, grid, field, measure, own, standIn, realOf, n1, pad2, word } from './kit.js';
import { uiOrder, UI_PAGES, NAMES, SHOWS, CREDIT } from './guide-helpers.js';

export const X0 = 61, X1 = 733, GW = X1 - X0;
const SW = 1024, SH = 1058; // the screen is built at 1024 wide and drawn scaled

// ---- css ----
export function guideCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, W = ctx.weights;
  const tok = tokensCss(ctx), cut = tok.indexOf('@media (prefers-color-scheme');
  const scoped = tok.slice(0, cut).replace(/^:root \{/m, '.pg.sg .ui {').replace(/^\[data-theme="dark"\] \{/m, '.pg.sg .ui[data-theme="dark"] {');
  return `${scoped}\n${componentsCss(ctx)}
.pg.sg{--mono:'IBM Plex Mono',monospace;--display:'${d.family}',sans-serif;--body:'${b.family}',sans-serif;background:var(--g);color:var(--ink);font-family:var(--body);font-size:15px;line-height:22px;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate;overflow:hidden}
.pg.sg :where(h1,h2,h3,p){margin:0}
.pg.sg .a{position:absolute;box-sizing:border-box;min-width:0}
.pg.sg svg{display:block;overflow:visible}
.pg.sg .m{font:400 11px/16px var(--mono);letter-spacing:.02em;color:var(--quiet);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.sg .m.i{color:var(--ink)}
.pg.sg .m.w{white-space:normal}
.pg.sg .dm{font:400 11px/16px var(--mono);color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.sg .lb{font:400 11px/16px var(--body);color:var(--quiet);letter-spacing:.01em;white-space:nowrap}
.pg.sg .lb.i{color:var(--ink)}
.pg.sg .lb.r{font-size:13px;line-height:18px}
.pg.sg .lb.n{font-size:15px;line-height:20px}
.pg.sg .d{font-family:var(--display);font-weight:${W.heading};color:var(--ink);line-height:.9;white-space:nowrap;letter-spacing:-.035em}
.pg.sg .h1{font-size:48px;line-height:1.05;letter-spacing:-.025em;white-space:normal}
.pg.sg .h2{font-size:26px;line-height:1.1;letter-spacing:-.015em;white-space:normal}
.pg.sg .b{font-family:var(--body);font-weight:${W.regular};font-size:13px;line-height:19px;color:var(--ink);text-wrap:pretty;max-width:60ch}
.pg.sg .ph-c{border:0;padding:0;background:none;color:inherit;font:inherit;letter-spacing:0;text-transform:none;font-style:italic}
.pg.sg .ph-b{display:block;width:auto;border:0;padding:0}
.pg.sg .ui.tr{background:transparent}
.pg.sg .gs-in{transform-origin:0 0}
.pg.sg .x{text-decoration:none}
.pg.sg .sk{background:var(--g);padding:0 4px}`;
}

// ---- the sheet: ground, the drawn grid, the body, the title block ----
function block(ctx, id, scale) {
  const K = geo(ctx), no = Math.max(1, uiOrder(ctx).indexOf(id) + 1), E = ctx.esc;
  const rev = String(ctx.versionLine || 'Version 1.0, November 2026').replace(/^Version/, 'Rev').replace(/([A-Z][a-z]{2})[a-z]* (\d{4})/, '$1 $2');
  const cell = (x, label, val, right, y) => at(right ? x - 200 : x, y, 200, 34, `<div class="lb" style="text-align:${right ? 'right' : 'left'}">${label}</div><div class="m i" style="text-align:${right ? 'right' : 'left'}">${val}</div>`);
  const y1 = K.tb + 4, y2 = K.tb + 47;
  const last = ctx.skeleton ? at(K.gx1 - 200, y2 + 14, 200, 14, `<span class="m i" style="display:block;text-align:right;font-size:9px">${CREDIT}</span>`) : cell(K.gx1, 'Size', 'A4 portrait', true, y2);
  return `${hr(K.gx, K.tb, K.gx1 - K.gx, 'var(--ink)')}${cell(K.gx, 'Project', `${own(ctx, ctx.brand.name)} UI style guide`, false, y1)}${cell(K.gx + 336, 'Sheet', E(NAMES[id]), false, y1)}${cell(K.gx1, 'Sheet no.', `UI-${pad2(no)}`, true, y1)}`
    + `${hr(K.gx, K.tb + 43, K.gx1 - K.gx)}${cell(K.gx, 'Scale', scale, false, y2)}${cell(K.gx + 336, 'Issue', rev, false, y2)}${last}`;
}
export function sheet(ctx, id, { ground, body, scale = '1:1' }) {
  return `<section class="pg sg" data-page="${id}" style="${varsOf(tones(ctx, ground))}">${grid(ctx)}${body}${block(ctx, id, scale)}</section>`;
}

// ---- small drawing parts ----
export const slotNote = (ctx, path, lead = '') => {
  const en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  return en ? `<span class="m w">${lead}${ctx.esc(en.what)} ${ctx.esc(en.length)}.${en.example ? ` Example: ${ctx.esc(en.example)}.` : ''}</span>` : '';
};
export const para = (x, y, w, html, cls = 'b') => at(x, y, w, null, `<div class="${cls}">${html}</div>`);
export const title = (txt, size = 26, y = 72) => at(X0, y, 520, size * 1.2, ctx_h(txt, size));
const ctx_h = (txt, size) => `<h1 class="d h2" style="font-size:${size}px;line-height:${n1(size * 1.1)}px">${txt}</h1>`;
let hseq = 0;
// a hatch: lines at 45 degrees in the dimension colour, clipped to a rectangle
export const hatch = (x, y, w, h, colour, op = 1, gap = 6) => { const id = `sh${++hseq}`; return svgAt(x, y, w, h, `<defs><pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V${gap}" stroke="${colour}" stroke-width="1"/></pattern></defs><rect width="${n1(w)}" height="${n1(h)}" fill="url(#${id})" opacity="${op}"/><rect x=".5" y=".5" width="${n1(w - 1)}" height="${n1(h - 1)}" fill="none" stroke="${colour}" stroke-width="1" opacity="${op}"/>`); };
// a hexagon tag: the schedule's reference mark
export const hexTag = (x, y, label) => svgAt(x, y, 44, 40, `<path d="M11 .5H33L43.5 20L33 39.5H11L.5 20Z" fill="none" stroke="var(--ink)" stroke-width="1"/>`) + at(x, y + 12, 44, 16, `<span class="m i" style="display:block;text-align:center">${label}</span>`);
// a leader: a 1 px line from a dot on the part (ax, ay) to its label (lx, ly)
const ldr = (ax, ay, lx, ly, dot) => { const x0 = Math.min(ax, lx) - 4, y0 = Math.min(ay, ly) - 4; return svgAt(x0, y0, Math.abs(lx - ax) + 8, Math.abs(ly - ay) + 8, `<path d="M${n1(ax - x0)} ${n1(ay - y0)}L${n1(lx - x0)} ${n1(ly - y0)}" stroke="var(--ink)" stroke-width="1" fill="none"/><circle cx="${n1(ax - x0)}" cy="${n1(ay - y0)}" r="3" fill="${dot}" stroke="var(--ink)" stroke-width="1"/>`); };
// a vertical dimension in the sheet's left margin, with its extension lines running to the part it measures; the value is read from the render
export function marginDim(ctx, ground, y1, y2, value, x = 40) {
  const c = tones(ctx, ground).dim, len = y2 - y1, tick = (py) => `<path d="M${x - 4} ${n1(py + 4)}L${x + 4} ${n1(py - 4)}"/>`;
  return svgAt(0, 0, 794, 1123, `<g stroke="${c}" stroke-width="1" fill="none"><path d="M${x + .5} ${n1(y1)}V${n1(y2)}M${x - 5} ${n1(y1 + .5)}H${X0 - 4}M${x - 5} ${n1(y2 + .5)}H${X0 - 4}"/>${tick(y1)}${tick(y2)}</g>`)
    + at(x - 38, (y1 + y2) / 2 - 8, 32, 16, `<span class="m dm" style="display:block;text-align:right;background:${ground}">${value}</span>`);
}

// ---- the screen: the generic Organisation profile, built from the engine's components ----
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
// the screen at a scale, in a frame at (x, y); `crop` is the height in screen px that shows
export const screenAt = (ctx, mode, uid, x, y, s, crop = SH) => `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(SW * s)}px;height:${n1(crop * s)}px;overflow:hidden;box-shadow:0 0 0 1px var(--hair)"><div class="gs-in" style="width:${SW}px;height:${SH}px;transform:scale(${s.toFixed(5)})">${screenHtml(ctx, mode, uid)}</div></div>`;
// where each part sits on the screen at 1024 wide (px from its top left), read from the render
const PT = {
  topbar: { y: 0, h: 56 }, topbarAt: [520, 28], heading: [425, 140], email: { y: 394, h: 44 }, emailAt: [420, 394], org: { y: 290, h: 44 }, orgAt: [200, 290],
  help: [330, 556], btn: { y: 612, h: 44 }, btnAt: [210, 634], danger: [689, 276], link: [864, 46],
};
// dots sit on the part where its drop runs clear of text: in the empty end of a field, in the right margin, in the icon column of an alert
const MARKS = [['Surface', 'surface', [470, 28]], ['Text', 'text', [425, 140]], ['Text soft', 'textSoft', [985, 28]], ['Quiet', 'quiet', [330, 556]], ['Edge', 'border', [600, 394]], ['Danger', 'danger', [714, 276]], ['Action', 'action', [74, 634]], ['Focus', 'focus', [540, 288]]];
// an elbow leader: down from the dot to a level, along to the label's column, down to the label; levels are picked so no two leaders cross
function elbows(items, y0, yLabel, dotOf) {
  const segs = []; let out = '';
  const hit = (h, v) => v.x > Math.min(h.xa, h.xb) + 0.5 && v.x < Math.max(h.xa, h.xb) - 0.5 && h.y > v.ya + 0.5 && h.y < v.yb - 0.5;
  items.forEach((it) => {
    const [ax, ay] = it.p, lx = it.lx; let pick = y0;
    for (let y = y0; y < yLabel - 14; y += 10) {
      const H = { xa: ax, xb: lx, y }, V1 = { x: ax, ya: ay, yb: y }, V2 = { x: lx, ya: y, yb: yLabel };
      pick = y;
      const clash = segs.some((o) => hit(o.h, V1) || hit(o.h, V2) || hit(H, o.v1) || hit(H, o.v2) || (Math.abs(o.h.y - y) < 8 && Math.min(o.h.xa, o.h.xb) < Math.max(ax, lx) && Math.max(o.h.xa, o.h.xb) > Math.min(ax, lx)));
      if (!clash) break;
    }
    segs.push({ h: { xa: ax, xb: lx, y: pick }, v1: { x: ax, ya: ay, yb: pick }, v2: { x: lx, ya: pick, yb: yLabel } });
    out += svgAt(0, 0, 794, 1123, `<path d="M${n1(ax)} ${n1(ay)}V${pick}H${n1(lx)}V${yLabel}" stroke="var(--ink)" stroke-width="1" fill="none"/><circle cx="${n1(ax)}" cy="${n1(ay)}" r="3" fill="${dotOf}" stroke="var(--ink)" stroke-width="1"/>`);
  });
  return out;
}

function screenPage(ctx, id, mode) {
  const set = ctx.roles[mode], ground = mode === 'dark' ? set.surface : ctx.roles.light.sunken, t = tones(ctx, ground), s = GW / SW, FY = 156, E = ctx.esc;
  const px = (v) => [X0 + v[0] * s, FY + v[1] * s];
  const items = MARKS.map(([role, key, dot]) => ({ role, hex: roleHex(set, key), p: px(dot) })).sort((a, b) => a.p[0] - b.p[0]);
  items.forEach((it, i) => { it.lx = X0 + 4 + i * 84 + 3; });
  const drops = elbows(items, 700, 866, set.surface) + items.map((it, i) => {
    const lx = X0 + 4 + i * 84, brand = ctx.colours.find((c) => c.hex.toLowerCase() === it.hex.toLowerCase());
    return at(lx - 3, 874, 84, 60, `<div class="lb i r" style="line-height:18px">${it.role}</div><div class="m i" style="margin-top:2px">${it.hex}</div>${brand ? `<div class="lb" style="margin-top:2px;overflow:hidden;text-overflow:ellipsis">${E(brand.name)}</div>` : ''}`);
  }).join('');
  const dims = marginDim(ctx, ground, FY + PT.topbar.y * s, FY + (PT.topbar.y + PT.topbar.h) * s, 56)
    + marginDim(ctx, ground, FY + PT.email.y * s, FY + (PT.email.y + PT.email.h) * s, 44)
    + marginDim(ctx, ground, FY + PT.btn.y * s, FY + (PT.btn.y + PT.btn.h) * s, 44);
  const slots = [ctx.edition === 'slot' ? '<span class="m w">Your logo, SVG.</span>' : '', slotNote(ctx, 'colours.0.name', 'Colour names: ')].filter(Boolean);
  const body = title(NAMES[id]) + para(X0, 104, 330, mode === 'dark' ? 'The same screen in the dark set, in the same frame. Each leader joins a part to its role.' : 'The Organisation profile, drawn from the kit\'s own tokens. Each leader joins a part to its role.')
    + at(412, 74, 321, null, `<div class="lb" style="text-align:right">Drawn at ${s.toFixed(3)} of its true ${SW} px width. Values at left are true px.</div>`) + at(X0, 990, GW, null, slots.map((h) => `<div style="margin-bottom:2px">${h}</div>`).join(""))
    + dim(ctx, 'h', X0, FY - 12, GW, SW, { ground, ext: 5 }) + screenAt(ctx, mode, `ss-${id}`, X0, FY, s, 1024) + dims + drops + at(X0, 972, GW, 16, `<span class="lb">Each role is tabulated, light and dark, on UI-${pad2(uiOrder(ctx).indexOf('roles') + 1)}.</span>`);
  return sheet(ctx, id, { ground, body, scale: s.toFixed(3) });
}

// ---- the colours a page draws: the brand's own, then the light Surface and Text so a sparse brand still has a table ----
function swatches(ctx, max = 6) {
  const L = ctx.roles.light, seen = new Set(), out = [];
  const add = (hex, name) => { const h = String(hex).toLowerCase(); if (seen.has(h)) return; seen.add(h); out.push({ hex: String(hex).toUpperCase(), name }); };
  [...ctx.colours].filter((c) => c.role !== 'label').sort((a, b) => b.share - a.share).forEach((c) => add(c.hex, ctx.esc(c.name)));
  add(L.surface, 'Surface'); add(L.text, 'Text');
  return out.slice(0, max);
}

// ---- the pages ----
export const pages = {
  // ---- 1 Cover: the brand name stands on the datum at y 840; the screen at 0.5 above it, dimensioned across its top ----
  cover(ctx) {
    const L = ctx.roles.light, ground = L.surface, M = measure(ctx), stand = standIn(ctx), name = realOf(ctx, ctx.brand.name), E = ctx.esc;
    const size = Math.max(40, M.fit(name, GW, 96)), cap = Math.round(M.cap * size), base = 840, s = 0.5;
    const key = [['surface', [980, 28], 388, 'Surface'], ['textSoft', [864, 46], 436, 'Text soft'], ['focus', [624, 312], 548, 'Focus'], ['border', [624, 416], 596, 'Edge']].map(([k, a, ly, label]) => {
      const ax = X0 + a[0] * s, ay = 380 + a[1] * s, lx = X0 + 512 + 22;
      return ldr(ax, ay, lx, ly, L.surface)
        + at(lx + 8, ly - 9, 120, 36, `<div class="lb i r">${label}</div><div class="m">${roleHex(L, k)}</div>`);
    }).join('');
    const body = at(X0, 84, 520, 52, '<h1 class="d h1" style="font-size:44px;line-height:48px">UI style guide</h1>')
      + para(X0, 150, 300, 'Colour, type and components, drawn as the interface ships them.') + at(X0, 212, 300, 16, `<span class="m">${E(ctx.versionLine)}</span>`)
      + dim(ctx, 'h', X0, 366, 512, SW, { ground, ext: 5 }) + screenAt(ctx, 'light', 'ss-cover', X0, 380, s, 680) + key
      + word(M, X0, base, own(ctx, ctx.brand.name), size, { style: stand ? 'color:var(--quiet)' : '' }) + dim(ctx, 'v', 40, base - cap, cap, cap, { ground, ext: 6 }) + hr(X0, base, GW, "var(--ink)", 2)
      + at(X0, base + 14, GW, 16, `<span class="m">Datum. The name at ${n1(size)} px, cap height ${cap}.</span>`)
      + at(X0, base + 44, 520, null, [ctx.edition === 'slot' ? '<div class="m w">Your logo, SVG. Example: the wordmark.</div>' : '', slotNote(ctx, 'name')].filter(Boolean).join('<div style="height:4px"></div>'));
    return sheet(ctx, 'cover', { ground, body, scale: '0.5' });
  },

  // ---- 2 Contents: a drawing register, 13 rows of 48 px across the full grid, then the key to the drawing ----
  contents(ctx) {
    const L = ctx.roles.light, ground = L.raised || L.surface, t = tones(ctx, ground), rev = (String(ctx.versionLine).match(/\d+(\.\d+)*/) || ['1.0'])[0], E = ctx.esc;
    const head = [['Sheet', X0, 70, 'left'], ['Title', X0 + 100, 150, 'left'], ['Shows', X0 + 270, 240, 'left'], ['Rev', X0 + 520, 50, 'left'], ['Folio', X1 - 60, 60, 'right']].map(([l, x, w, al]) => at(x, 156, w, 16, `<span class="lb" style="display:block;text-align:${al}">${l}</span>`)).join('');
    const rows = UI_PAGES.map((id, i) => {
      const y = 176 + i * 48;
      return (i % 2 ? fill(X0, y, GW, 48, t.wash) : '') + hr(X0, y, GW, i ? 'var(--hair)' : 'var(--ink)')
        + at(X0 + 10, y + 16, 70, 16, `<span class="m i">UI-${pad2(i + 1)}</span>`) + at(X0 + 100, y + 13, 170, 22, `<span class="lb i n">${NAMES[id]}</span>`) + at(X0 + 270, y + 15, 250, 18, `<span class="lb r">${SHOWS[id]}</span>`)
        + at(X0 + 520, y + 16, 50, 16, `<span class="m">${rev}</span>`) + at(X1 - 70, y + 16, 60, 16, `<span class="m i" style="display:block;text-align:right">${pad2(i + 1)}</span>`);
    }).join('') + hr(X0, 176 + 13 * 48, GW, 'var(--ink)');
    const ky = 836, cols = [X0, X0 + 232, X0 + 464], sw = 190;
    const sampleLeader = svgAt(cols[0], ky + 32, 150, 24, `<path d="M4 12L146 12" stroke="var(--ink)" stroke-width="1" fill="none"/><circle cx="4" cy="12" r="3" fill="${ground}" stroke="var(--ink)" stroke-width="1"/>`) + at(cols[0] + 100, ky + 14, 60, 18, '<span class="lb i r">Action</span>');
    const keyRow = at(X0, ky - 4, GW, 16, '<span class="lb i r">How to read these sheets</span>')
      + sampleLeader + dim(ctx, 'h', cols[1] + 4, ky + 44, 120, 44, { ground, ext: 5 }) + hatch(cols[2], ky + 24, 120, 40, t.dim)
      + [['A leader joins a part to its role. The role is named at its end.', 0], ['A dimension line states a true token value, read from the render, in px.', 1], ['A hatched pair falls short of its need: 4.5 for text, 3 for an outline or ring.', 2]].map(([txt, i]) => para(cols[i], ky + 78, sw, txt, 'lb')).join('').replace(/class="lb"/g, 'class="lb" style="white-space:normal;line-height:16px"');
    return sheet(ctx, 'contents', { ground, scale: 'NTS', body: at(X0, 76, 560, 56, '<h1 class="d h1">Drawing register</h1>') + head + rows + hr(X0, ky - 12, GW) + keyRow + at(X0, 1000, 400, 16, `<span class="m">${E(ctx.versionLine)}</span>`) });
  },

  screen: (ctx) => screenPage(ctx, 'screen', 'light'),
  dark: (ctx) => screenPage(ctx, 'dark', 'dark'),

  // ---- 5 Colour roles: a finishes schedule, 15 rows with a hexagon tag, a chip each for light and dark, the hexes and the ratios ----
  roles(ctx) {
    const L = ctx.roles.light, D = ctx.roles.dark, E = ctx.esc, ground = L.raised || L.surface, t = tones(ctx, ground), RH = 54, Y = 140;
    const R = [['surface', 'Surface', 'text', 'surface', 'Text on it', 4.5], ['raised', 'Raised', 'text', 'raised', 'Text on it', 4.5], ['sunken', 'Sunken', 'text', 'sunken', 'Text on it', 4.5], ['text', 'Text', 'text', 'surface', 'On surface', 4.5], ['textSoft', 'Text soft', 'textSoft', 'surface', 'On surface', 4.5], ['quiet', 'Quiet', 'quiet', 'surface', 'On surface', 4.5], ['border', 'Edge', 'border', 'surface', 'Outline on surface', 3], ['divider', 'Divider', 'divider', 'surface', 'Hairline on surface', 0], ['action', 'Action', 'actionLabel', 'action', 'Label on it', 4.5], ['actionHover', 'Action hover', 'actionLabel', 'actionHover', 'Label on it', 4.5], ['actionPressed', 'Action pressed', 'actionLabel', 'actionPressed', 'Label on it', 4.5], ['actionLabel', 'Action label', 'actionLabel', 'action', 'On action', 4.5], ['focus', 'Focus', 'focus', 'surface', 'Ring on surface', 3], ['disabledBg', 'Disabled fill', 'disabledText', 'disabledBg', 'Text on it', 0], ['disabledText', 'Disabled text', 'disabledText', 'disabledBg', 'On disabled fill', 0]];
    const cx = { role: 208, lhex: 428, lr: 506, dhex: 590, dr: 673 };
    const heads = [['Role', cx.role, 'left', 200], ['Light', cx.lhex, 'left', 72], ['Ratio', cx.lr, 'right', 60], ['Dark', cx.dhex, 'left', 72], ['Ratio', cx.dr, 'right', 60]].map(([l, x, al, w]) => at(x, Y - 24, w, 16, `<span class="lb" style="display:block;text-align:${al}">${l}</span>`)).join('') + at(X0 + 51, Y - 24, 100, 16, '<span class="lb">Light and dark</span>');
    const ratio = (set, fg, bg, need, x, y) => {
      const r = ctx.ratio(set[fg], set[bg]), txt = ctx.fmt(r), fail = need && r < need;
      return fail ? hatch(x, y + 14, 60, 26, t.dim) + at(x + 8, y + 19, 44, 16, `<span class="m i sk" style="display:block;text-align:center;background:${ground};padding:0">${txt}</span>`) : at(x, y + 19, 60, 16, `<span class="m i" style="display:block;text-align:right">${txt}</span>`);
    };
    const rows = R.map(([k, name, fg, bg, note, need], i) => {
      const y = Y + i * RH, hex = String(L[k]).toUpperCase(), brand = ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
      return hr(X0, y, GW, i ? 'var(--hair)' : 'var(--ink)') + hexTag(X0, y + 7, `R-${pad2(i + 1)}`)
        + fill(X0 + 51, y + 7, 40, 40, L[k], 'box-shadow:0 0 0 1px var(--hair)') + fill(X0 + 95, y + 7, 40, 40, D[k], 'box-shadow:0 0 0 1px var(--hair)')
        + at(cx.role, y + 9, 215, 20, `<span class="lb i n">${name}</span>`) + at(cx.role, y + 29, 215, 16, `<span class="lb">${note}${brand ? ` &middot; ${E(brand.name)}` : ''}</span>`)
        + at(cx.lhex, y + 19, 72, 16, `<span class="m i">${hex}</span>`) + ratio(L, fg, bg, need, cx.lr, y)
        + at(cx.dhex, y + 19, 72, 16, `<span class="m i">${String(D[k]).toUpperCase()}</span>`) + ratio(D, fg, bg, need, cx.dr, y);
    }).join('') + hr(X0, Y + 15 * RH, GW, 'var(--ink)');
    const note = para(X0, Y + 15 * RH + 8, GW, `${E(GRADE_NOTE)} A ratio under its need is hatched: text needs 4.5, an outline or ring needs 3. Hairlines and disabled parts are exempt.`, 'lb')
      .replace('class="lb"', 'class="lb" style="white-space:normal;line-height:14px;max-width:none;color:var(--ink)"') + at(X0, Y + 15 * RH + 46, GW, 16, slotNote(ctx, 'colours.0.name', 'Colour names: '));
    return sheet(ctx, 'roles', { ground, scale: 'NTS', body: title('Colour roles', 26, 68) + at(X0 + 300, 76, 372, 16, '<span class="lb" style="display:block;text-align:right">Finishes schedule. Ratios are read from the kit.</span>') + heads + rows + note });
  },

  // ---- 6 Tints and pairs: a levelling staff per ramp, then a cross table of text on ground; a failing pair is hatched ----
  tints(ctx) {
    const L = ctx.roles.light, ground = L.surface, t = tones(ctx, ground), E = ctx.esc, cs = swatches(ctx), n = cs.length;
    const staffs = cs.map((c, i) => {
      const x = X0 + i * 112, r = ctx.C.ramp(c.hex), base = String(rampBase(c.hex));
      return at(x, 108, 100, 16, `<span class="lb i">${c.name}</span>`) + Object.keys(r).map((k, j) => {
        const y = 128 + j * 36, hex = String(r[k]).toUpperCase();
        return `<div class="a" style="left:${x - 7}px;top:${y + .5}px;width:7px;height:0;border-top:1px solid var(--quiet)"></div>` + field(ctx, x, y, 96, 36, r[k], at(8, 10, 44, 16, mono(k + (k === base ? ' *' : ''))) + at(40, 10, 50, 16, mono(hex, true), { style: 'text-align:right' }));
      }).join('');
    }).join('');
    const cw = 96, ty = 540, hh = 40, rh = 64;
    const head = [`<div class="a" style="left:${X0}px;top:${ty}px;width:${cw}px;height:${hh}px"><span class="lb" style="display:block;padding-top:2px;white-space:normal;line-height:14px">Text across, ground down</span></div>`,
      ...cs.map((c, j) => field(ctx, X0 + (j + 1) * cw, ty, cw, hh, c.hex, at(8, 4, 84, 16, `<span class="lb i" style="overflow:hidden;text-overflow:ellipsis;display:block">${c.name}</span>`) + at(8, 20, 84, 16, mono(c.hex, true))))].join('');
    const side = cs.map((c, i) => field(ctx, X0, ty + hh + i * rh, cw, rh, c.hex, at(8, 8, 84, 16, `<span class="lb i" style="overflow:hidden;text-overflow:ellipsis;display:block">${c.name}</span>`) + at(8, 26, 84, 16, mono(c.hex, true)))).join('');
    let nFail = 0;
    const cells = cs.map((bg, i) => cs.map((fg, j) => {
      const x = X0 + (j + 1) * cw, y = ty + hh + i * rh, tb = tones(ctx, bg.hex);
      if (i === j) return `<div class="a" style="left:${x}px;top:${y}px;width:${cw}px;height:${rh}px;background:${tb.wash}"></div>` + svgAt(x, y, cw, rh, `<path d="M0 ${rh}L${cw} 0" stroke="${tb.quiet}" stroke-width="1" fill="none"/>`);
      const r = ctx.ratio(fg.hex, bg.hex), ok = r >= 4.5; if (!ok) nFail++;
      const inner = `<span style="position:absolute;left:10px;top:12px;font:${ctx.weights.heading} 28px/1 var(--display);letter-spacing:-.02em;color:${fg.hex}">Aa</span>`;
      const label = at(x + 44, y + 40, 46, 16, `<span class="m i" style="display:block;text-align:right;color:var(--ink);background:${ground};padding:0 3px">${ctx.fmt(r)}</span>`);
      return `<div class="a"${ok ? '' : ' data-contrast="demo"'} style="left:${x}px;top:${y}px;width:${cw}px;height:${rh}px;background:${bg.hex}">${inner}</div>` + (ok ? '' : hatch(x, y, cw, rh, tb.dim, 0.6, 7)) + label;
    }).join('')).join('');
    const ly = ty + hh + n * rh + 14;
    const legend = hatch(X0, ly, 40, 20, t.dim) + at(X0 + 52, ly + 2, 560, 16, '<span class="lb i">Hatched: the pair falls short of 4.5, the least text needs. Each ratio is the kit\'s own.</span>')
      + at(X0, ly + 28, GW, 16, slotNote(ctx, 'colours.0.name', 'Colour names: '));
    return sheet(ctx, 'tints', { ground, scale: 'NTS', body: title('Tints and pairs', 26, 68) + at(X0 + 300, 76, 372, 16, '<span class="lb" style="display:block;text-align:right">Each ramp in ten steps. A star marks its base.</span>') + staffs + head + side + cells + legend });
  },

  // ---- 7 Type: a stair. Each step is a tread rising to the right; the text stands on it at its true size, and the riser is dimensioned to its line height ----
  type(ctx) {
    const L = ctx.roles.light, ground = L.raised || L.surface, B = ctx.brand, W = ctx.weights, t = tones(ctx, ground), E = ctx.esc;
    const steps = [...ctx.uiType].sort((a, b) => a.size - b.size), N = steps.length;
    const words = { headline: 'Nothing matches &quot;serif&quot;', title: 'Organisation profile', 'title-s': 'Discard your changes?', control: 'Save changes', body: 'Your edits to Contact email haven&#39;t been saved.', label: 'Contact email', caption: 'Shown on invoices and emails.' };
    // treads from the floor up: step i stands on T[i]; the band above it is its line height, 10 px of air under the text and 46 over it
    const T = [996]; steps.forEach((s) => T.push(T[T.length - 1] - (s.line + 56)));
    const sx = (i) => X0 + i * 24;
    let path = `M${sx(0)} ${T[0]}`; for (let i = 0; i < N; i++) path += `V${T[i + 1]}${i + 1 < N ? `H${sx(i + 1)}` : `H${X1}`}`;
    const stairs = svgAt(0, 0, 794, 1123, `<path d="${path}" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="miter"/>`
      + `<g stroke="var(--hair)" stroke-width="1" fill="none">${steps.map((_, i) => `<path d="M${sx(i)} ${T[i] + .5}H${X1}"/>`).join('')}</g>`);
    const parts = steps.map((s, i) => {
      const disp = s.face === 'display', top = T[i] - 10 - s.line, x = sx(i), c = tones(ctx, ground).dim;
      const rd = `<g stroke="${c}" stroke-width="1" fill="none"><path d="M${x - 13.5} ${top}V${top + s.line}M${x - 18} ${top + .5}H${x - 9}M${x - 18} ${top + s.line + .5}H${x - 9}"/><path d="M${x - 17.5} ${top + 4}L${x - 9.5} ${top - 4}M${x - 17.5} ${top + s.line + 4}L${x - 9.5} ${top + s.line - 4}"/></g>`;
      return svgAt(0, 0, 794, 1123, rd) + at(x - 56, top + s.line / 2 - 8, 36, 16, `<span class="m dm" style="display:block;text-align:right;background:${ground}">${s.line}</span>`)
        + at(x + 14, top, 700 - x, s.line, `<div class="${disp ? 'd' : 'b'}" style="font-size:${s.size}px;line-height:${s.line}px;font-weight:${disp ? W.heading : s.weight};white-space:nowrap;max-width:none;${disp ? 'letter-spacing:-.01em;font-family:var(--display)' : 'font-size:' + s.size + 'px'}">${words[s.token] || E(s.use)}</div>`)
        + at(X1 - 150, T[i] + 2, 150, 16, `<span class="m i" style="display:block;text-align:right">${s.token} ${s.size}/${s.line}</span>`);
    }).join('');
    const face = (x, label, f, fam, wt) => at(x, 150, 320, null, `<div class="lb">${label}</div><div style="font:${wt} 120px/1 var(--${fam});letter-spacing:-.03em;margin:4px 0 0 -4px;white-space:nowrap;color:var(--ink)">Aa</div><div class="lb i n" style="margin-top:6px;font-family:var(--${fam})">${E(fontName(f))}</div><div style="margin-top:4px"><span class="m i">${f.weights.join(', ')}</span></div>`);
    const body = at(X0, 76, 560, 56, '<h1 class="d h1">Type</h1>') + face(X0, 'Display', B.fonts.display, 'display', W.heading) + face(X0 + 336, 'Body', B.fonts.body, 'body', W.regular)
      + at(X0, T[N] - 52, 330, null, `<div class="lb">Each line is set at its true size and stands on its tread. The value left of a riser is its line height in px; the token and size over line sit under the tread.</div>`).replace('class="lb"', 'class="lb" style="white-space:normal;line-height:15px"')
      + stairs + parts;
    return sheet(ctx, 'type', { ground, body, scale: '1:1' });
  },
};
const mono = (txt, i) => `<span class="m${i === true ? ' i' : ''}">${txt}</span>`;
