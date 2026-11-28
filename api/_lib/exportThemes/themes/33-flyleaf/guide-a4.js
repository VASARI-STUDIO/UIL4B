// Theme 33, Flyleaf: pages 1 to 7 of the UI style guide (cover, contents, screen, dark, colour roles, tints and pairs, type), A4 portrait, the edited-proof device.
// The pages draw the engine's real components (componentsCss and the tokens, scoped to `.ui` inside `.pg.gf`), so a control is the control the kit ships.
// `.pg.gf` is used instead of `.pg.fl` on purpose: the brand pages' reset (`.pg.fl :where(div,span...){padding:0}`) would strip the components' padding.
import { readableOn, rampBase } from '../../engine/color.js';
import { tokensCss, tokenGroups, statusText } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';
import { contrastFacts, primaryColour, GRADE_NOTE, fontName, WEIGHT_NAMES } from '../../engine/styleguide.js';
import { tones, varsOf, geo, at, hr, mono, rule4, creditHtml, own, standIn, realOf, measure, strike, n1, pad2, field } from './kit.js';
import { uiOrder, UI_PAGES, NAMES } from './helpers.js';

const SW = 1024, SH = 1058; // the screen is built at 1024 wide and drawn scaled
const FRAME = { x: 64, y: 220, w: 658 }; const SCALE = FRAME.w / SW; // 0.643

// ---- css ----
export function guideCss(ctx) {
  const B = ctx.brand, d = B.fonts.display, b = B.fonts.body, W = ctx.weights, K = geo(ctx);
  const tok = tokensCss(ctx), cut = tok.indexOf('@media (prefers-color-scheme');
  const scoped = tok.slice(0, cut).replace(/^:root \{/m, '.pg.gf .ui {').replace(/^\[data-theme="dark"\] \{/m, '.pg.gf .ui[data-theme="dark"] {');
  return `${scoped}\n${componentsCss(ctx)}
.pg.gf{--mono:'DM Mono',monospace;--display:'${d.family}',serif;--body:'${b.family}',serif;background:var(--g);color:var(--ink);font-family:var(--body);font-size:${K.body}px;line-height:1.5;-webkit-font-smoothing:antialiased;font-kerning:normal;isolation:isolate}
.pg.gf .a{position:absolute;box-sizing:border-box;min-width:0}
.pg.gf .m{font:400 ${K.ms}px/1.4 var(--mono);text-transform:uppercase;letter-spacing:.06em;color:var(--quiet);font-variant-numeric:tabular-nums;white-space:nowrap}
.pg.gf .m.i{color:var(--ink)}
.pg.gf .m.v{text-transform:none;letter-spacing:.02em}
.pg.gf .m.w{white-space:normal}
.pg.gf .d{font-family:var(--display);font-weight:${W.heading};font-stretch:${d.stretch || 100}%;color:var(--ink);line-height:1;white-space:nowrap}
.pg.gf .b{font-family:var(--body);font-weight:${W.regular};color:var(--ink)}
.pg.gf .q{color:var(--quiet)}
.pg.gf .hr{height:0;border-top:.5px solid var(--hair)}
.pg.gf svg{display:block}
.pg.gf .ph-c{border:0;padding:0;background:none;color:var(--quiet);font:inherit;letter-spacing:0;text-transform:none;font-style:italic}
.pg.gf .gs-in{transform-origin:0 0}
.pg.gf .gs{position:relative;overflow:hidden}
.pg.gf .gn{font:400 calc(${K.ms}px / var(--k,1))/0 var(--mono);color:var(--n);position:relative;top:-.7em;margin-left:.2em;white-space:nowrap;vertical-align:baseline}
.pg.gf .gn--in{position:absolute;right:-26px;top:22px;margin:0}
.pg.gf .gl{flex:1;border-bottom:1px dotted var(--hair);transform:translateY(-5px)}
.pg.gf .gt th,.pg.gf .gt td{padding:0 10px}
.pg.gf .gt th{height:36px;font-size:11px}
.pg.gf .gt td{height:44px;font-size:12.5px;line-height:1.25}
.pg.gf .gt .hx{font:400 10.5px/1 var(--mono);letter-spacing:.02em}
.pg.gf .gt .sw{display:block;width:24px;height:24px;border:1px solid var(--divider)}
.pg.gf .gt .nt{display:block;font-size:10.5px;color:var(--quiet)}
.pg.gf .gt .x{color:var(--quiet);text-decoration:line-through}
.pg.gf .gc{position:absolute;box-sizing:border-box;width:88px;height:88px;border-radius:50%;display:grid;place-items:center;box-shadow:0 0 0 1px var(--hair)}
.pg.gf .gc span{font:${W.heading} 36px/1 var(--display)}
.pg.gf .cap{font-size:11px;line-height:14px;white-space:normal;color:var(--ink)}
.pg.gf .cap .q{color:var(--quiet)}
.pg.gf .lb{font:${W.medium} 11px/14px var(--body);color:var(--quiet);white-space:nowrap}
.pg.gf .lb .gn{font-size:9.5px}
.pg.gf .ui.pn{padding:24px}
.pg.gf .ui.tr{background:transparent}
.pg.gf .hv{display:flex;justify-content:space-between;gap:10px;break-inside:avoid;font:400 10px/16px var(--mono);letter-spacing:.01em;color:var(--ink)}
.pg.gf .hv span:last-child{color:var(--quiet);text-align:right;overflow-wrap:anywhere}
.pg.gf .hv i{display:inline-block;width:8px;height:8px;margin-right:6px;border:1px solid var(--hair);vertical-align:-0.5px}
.pg.gf .hg{break-inside:avoid;font:${W.medium} 11px/14px var(--body);color:var(--ink);margin:14px 0 4px;padding-top:6px;border-top:.5px solid var(--hair)}
.pg.gf .hg:first-child{margin-top:0}
.pg.gf .kx{font:400 13px/1 var(--mono);color:var(--ink);font-variant-numeric:tabular-nums}`;
}

// ---- the page frame: running head (mono 9.5 at y 36, hairline y 48), page title in display 22 at y 72, the rule at x 32, the credit line on Free ----
function sheet(ctx, id, { ground, body, title, under = ground, bare = false }) {
  const K = geo(ctx), t = tones(ctx, ground), no = Math.max(1, uiOrder(ctx).indexOf(id) + 1), L = ctx.roles.light;
  const hd = (x, w, html, al = '') => at(x, 31, w, 14, `<span class="m i">${html}</span>`, { style: al });
  const head = hd(K.L, 200, own(ctx, ctx.brand.name)) + hd(K.x(3), 200, 'UI style guide') + hd(K.W - K.R - 60, 60, pad2(no), 'text-align:right') + hr(K.L, 48, K.W - K.L - K.R);
  const ttl = title ? at(K.L, 72, 500, 28, ctx.esc(title), { cls: 'd', style: 'font-size:22px;letter-spacing:-.01em' }) : '';
  return `<section class="pg gf" data-page="${id}" style="${varsOf(t)};--n:${readableOn(ground, [L.action, L.text], { size: 12 })}">${bare ? '' : head + ttl}${body}${rule4(ctx, K)}${creditHtml(ctx, K, under)}</section>`;
}
const txt = (x, y, w, html, size = 13.5) => at(x, y, w, null, `<div class="b" style="font-size:${size}px;line-height:1.5;text-wrap:pretty">${html}</div>`);

// ---- the screen: the generic Organisation profile, built from the engine's components ----
const MARKS = [
  [1, 'Surface', 'surface', 'The ground of the screen, the top bar and every field.'],
  [2, 'Text', 'text', 'Headings and the values people type.'],
  [3, 'Text soft', 'textSoft', 'Links that are not the current page.'],
  [4, 'Quiet', 'quiet', 'Help text under a field.'],
  [5, 'Edge', 'border', 'The outline of a field at rest.'],
  [6, 'Danger', 'danger', 'The edge and icon of a failed save.'],
  [7, 'Action', 'action', 'The primary button. Its label is Action label.'],
  [8, 'Focus', 'focus', 'The ring on the field being edited.'],
];
const roleHex = (set, k) => String(typeof set[k] === 'object' ? set[k].fg : set[k]).toUpperCase();

function screenHtml(ctx, mode, marks) {
  const ui = ctx.ui, A = ctx.esc, name = own(ctx, ctx.brand.name), n = (k) => (marks ? `<sup class="gn">${k}</sup>` : '');
  const links = ['Profile', 'Notifications', 'Security'].map((t, i) => `<a class="ui-link" href="#"${i === 0 ? ' aria-current="page"' : ''}>${t}${i === 1 ? n(3) : ''}</a>`).join('');
  const fld = (id, label, valueHtml, { help, state, nIn, nHelp } = {}) => `<div class="ui-field"><label class="ui-label" for="${id}">${label}</label><div style="position:relative"><input class="ui-input${state ? ' is-' + state : ''}" id="${id}" type="text" value="${valueHtml}" readonly tabindex="-1"${help ? ` aria-describedby="${id}-m"` : ''}>${nIn && marks ? `<sup class="gn gn--in">${nIn}</sup>` : ''}</div>${help ? `<p class="ui-help" id="${id}-m">${help}${nHelp ? n(nHelp) : ''}</p>` : ''}</div>`;
  const danger = ui.alert('danger', "We couldn't save. Check your connection and try again.").replace(/<\/span><\/div>$/, `${n(6)}</span></div>`);
  // a slot edition has no logo yet: a ghost wordmark of about 120 x 32 stands in its place (the note for it is on the page)
  const logo = ctx.edition === 'slot' ? `<span class="ui-display" style="display:inline-flex;align-items:center;width:120px;height:32px;font-size:22px;color:var(--quiet);font-style:italic">Your logo</span>` : `<strong class="ui-display" style="font-size:22px">${name}</strong>`;
  return `<div class="ui gs" data-theme="${mode}" style="width:${SW}px;height:${SH}px"><nav class="ui-topbar" aria-label="Main" style="padding:0 32px">${logo}<div class="ui-topbar__links">${links}</div></nav>
<div style="position:relative;display:grid;grid-template-columns:560px 1fr;column-gap:64px;padding:64px 64px 0">${marks ? `<sup class="gn" style="position:absolute;left:30px;top:96px;margin:0">1</sup>` : ''}
<div><h1 class="ui-display" style="margin:0;font-size:var(--fs-headline);line-height:var(--lh-headline)">Organisation profile${n(2)}</h1><div style="margin-top:20px">${ui.alert('info', 'Changes apply to every page.')}</div>
<div style="margin-top:44px;display:flex;flex-direction:column;gap:36px">${fld('gs-o-' + mode, 'Organisation name', name, { state: 'focus', nIn: 8 })}${fld('gs-e-' + mode, 'Contact email', 'name@example.com', { nIn: 5 })}${fld('gs-w-' + mode, 'Website', '', { help: 'Shown on invoices and emails.', nHelp: 4 })}</div>
<div style="margin-top:48px;display:flex;gap:12px;align-items:flex-start"><span style="display:inline-flex;align-items:flex-start">${ui.btn('Save changes')}${n(7)}</span>${ui.btn('Cancel', { variant: 'secondary' })}</div></div>
<div style="display:flex;flex-direction:column;gap:16px;padding-top:8px">${ui.alert('success', 'Profile saved.')}${ui.alert('warning', 'Your session ends in 5 minutes.')}${danger}</div></div>
<div style="position:absolute;left:64px;bottom:40px">${ui.toast('Organisation profile saved.')}</div></div>`;
}
// the screen at a scale, in a frame at (x, y). The numerals are counter-scaled (--k) so they print at 9.5 px.
const screenAt = (ctx, mode, x, y, s, marks) => {
  const set = ctx.roles[mode], nc = readableOn(set.surface, mode === 'dark' ? [set.textSoft, set.text] : [set.action, set.text], { size: 14 });
  return `<div class="a" style="left:${n1(x)}px;top:${n1(y)}px;width:${n1(SW * s)}px;height:${n1(SH * s)}px;overflow:hidden;box-shadow:0 0 0 1px var(--hair);--k:${s.toFixed(4)};--n:${nc}"><div class="gs-in" style="width:${SW}px;height:${SH}px;transform:scale(${s.toFixed(4)})">${screenHtml(ctx, mode, marks)}</div></div>`;
};
function notes(ctx, mode, under) {
  const K = geo(ctx), set = ctx.roles[mode], nc = readableOn(under, [set.action, set.text], { size: 12 }), W = ctx.weights;
  const one = ([k, role, key, where], i) => {
    const hex = roleHex(set, key), brand = ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
    const col = i < 4 ? 0 : 1, y = 928 + (i % 4) * 26;
    return at(col ? 400 : K.L, y, col ? 322 : 318, 26, `<span class="m" style="color:${nc}">${k}</span> <span style="font-weight:${W.strong}">${role}</span> <span class="m i v">${hex}</span>${brand ? ` <span class="q">${ctx.esc(brand.name)}</span>` : ''} <span class="q">${where}</span>`, { cls: 'b', style: 'font-size:9.5px;line-height:13px' });
  };
  return hr(K.L, 916, K.W - K.L - K.R) + MARKS.map(one).join('');
}
// the one mono note a slot edition prints for a kind of slot (what goes there, how long, an example); nothing on a finished project
const slotNote = (ctx, path, lead = '') => {
  const en = ctx.placeholders && ctx.placeholders.entries.find((x) => x.path === path);
  return en ? mono(`${lead}${ctx.esc(en.what)} ${ctx.esc(en.length)}.${en.example ? ` Example: ${ctx.esc(en.example)}.` : ''}`, 'v w') : '';
};
const logoNote = (ctx) => (ctx.edition === 'slot' ? mono('Your logo, SVG. Example: the wordmark.', 'v w') : '');
const screenPage = (ctx, id, mode, title, line) => {
  const set = ctx.roles[mode], g = set.surface, ground = mode === 'dark' ? g : ctx.roles.light.sunken;
  const slots = [logoNote(ctx), slotNote(ctx, 'colours.0.name', 'Colour names: ')].filter(Boolean).map((h) => `<div style="margin-top:6px;white-space:normal">${h}</div>`).join('');
  const body = txt(64, 112, 330, line) + at(512, 112, 210, null, `<div class="b" style="font-size:11px;line-height:1.5">Shown at ${SCALE.toFixed(3)} of its true ${SW} px width.</div>${slots}`) + screenAt(ctx, mode, FRAME.x, FRAME.y, SCALE, true) + notes(ctx, mode, ground);
  return sheet(ctx, id, { ground, body, title });
};

// ---- helpers for pages 8 to 13 ----
const U = (html, style = '') => `<div class="ui tr" data-theme="light" style="${style}">${html}</div>`; // engine parts on the page's own ground
const lb = (x, y, w, html) => at(x, y, w || 400, 14, `<span class="lb">${html}</span>`);
const sup = (k) => `<sup class="gn">${k}</sup>`;
const hexOf = (ctx, k) => roleHex(ctx.roles.light, k);
// footnotes in the page's two columns at the foot (four to a column): numeral, name, value, where it lands
function fnotes(ctx, items) {
  const K = geo(ctx), W = ctx.weights;
  return hr(K.L, 916, K.W - K.L - K.R) + items.map(([k, title, val, where], i) => at(i < 4 ? K.L : 400, 928 + (i % 4) * 26, i < 4 ? 318 : 322, 26, `<span class="m" style="color:var(--n)">${k}</span> <span style="font-weight:${W.strong}">${title}</span> <span class="m i v">${val}</span> <span class="q">${where}</span>`, { cls: 'b', style: 'font-size:9.5px;line-height:13px' })).join('');
}

// ---- the pages ----
export const pages = {
  cover(ctx) {
    const K = geo(ctx), L = ctx.roles.light, M = measure(ctx), name = realOf(ctx, ctx.brand.name), stand = standIn(ctx), act = L.action;
    const size = Math.max(40, M.fit(name, K.W - K.L - 40, 96)), top = 560 - size * M.base;
    const inner = at(K.L, 64, 400, 28, 'UI style guide', { cls: 'd', style: 'font-size:22px;letter-spacing:-.01em' }) + at(K.L - 4, top, K.W - K.L, size * 1.1, own(ctx, ctx.brand.name), { cls: 'd', style: `font-size:${n1(size)}px;letter-spacing:-0.02em;${stand ? 'color:var(--quiet);' : ''}` }) + at(K.L, 584, 400, 14, mono(ctx.esc(ctx.versionLine), 'v'));
    const body = field(ctx, 0, 0, K.W, 618, act, inner) + txt(K.L, 664, 270, 'Colour, type and components, drawn as the interface ships them.') + screenAt(ctx, 'light', 400, 700, 0.45, false);
    return sheet(ctx, 'cover', { ground: L.surface, body, title: '', under: L.surface, bare: true });
  },
  contents(ctx) {
    const K = geo(ctx), g = ctx.roles.light.text;
    const rows = UI_PAGES.map((id, i) => at(K.L, 160 + 44 * i, K.W - K.L - K.R, 32, `<span class="d" style="font-size:20px;letter-spacing:-.01em">${NAMES[id]}</span><span class="gl"></span><span class="m i">${pad2(i + 1)}</span>`, { style: 'display:flex;align-items:baseline;gap:10px' })).join('');
    // the lower third: how to read the proof (three marks, each with a real sample), then the version line
    const L = ctx.roles.light, key = (x, sample, line) => at(x, 842, 200, null, `<div>${sample}</div><div class="b" style="margin-top:10px;font-size:11px;line-height:1.5;color:var(--quiet);text-wrap:pretty">${line}</div>`);
    const how = hr(K.L, 772, K.W - K.L - K.R) + at(K.L, 786, 400, 28, 'How to read these pages', { cls: 'd', style: 'font-size:20px;letter-spacing:-.01em' })
      + at(K.L, 822, 300, 14, '<span class="b q" style="font-size:11px">Every colour, size and state is read from the tokens the kit ships.</span>')
      + key(K.L, '<span class="kx" style="color:var(--n)">1</span>', 'A numeral marks a part of the drawing. Its footnote gives the role, its hex and where it lands.')
      + key(288, `<span class="kx" style="color:var(--quiet);text-decoration:line-through">${ctx.fmt(2.1)}</span>`, 'A ratio struck through falls short of its need: 4.5 for text, 3 for an outline or ring.')
      + key(512, `<span class="kx">${String(L.action).toUpperCase()}</span>`, 'Mono type is for values only: hexes, ratios and sizes, read from the kit.')
      + at(K.L, 1000, 400, 14, mono(ctx.esc(ctx.versionLine), 'v'));
    return sheet(ctx, 'contents', { ground: g, title: 'Contents', body: rows + how });
  },
  screen: (ctx) => screenPage(ctx, 'screen', 'light', 'Screen', 'The Organisation profile, drawn from the kit\'s own tokens. Each numeral points to a role in the notes below.'),
  dark: (ctx) => screenPage(ctx, 'dark', 'dark', 'Dark', 'The same screen in the dark set, in the same frame. The numerals and notes follow page 3.'),

  roles(ctx) {
    const K = geo(ctx), L = ctx.roles.light, D = ctx.roles.dark, E = ctx.esc;
    const R = [['surface', 'Surface', 'text', 'surface', 'Text on it', 4.5], ['raised', 'Raised', 'text', 'raised', 'Text on it', 4.5], ['sunken', 'Sunken', 'text', 'sunken', 'Text on it', 4.5], ['text', 'Text', 'text', 'surface', 'On surface', 4.5], ['textSoft', 'Text soft', 'textSoft', 'surface', 'On surface', 4.5], ['quiet', 'Quiet', 'quiet', 'surface', 'On surface', 4.5], ['border', 'Edge', 'border', 'surface', 'Outline on surface', 3], ['divider', 'Divider', 'divider', 'surface', 'Hairline on surface', 0], ['action', 'Action', 'actionLabel', 'action', 'Label on it', 4.5], ['actionHover', 'Action hover', 'actionLabel', 'actionHover', 'Label on it', 4.5], ['actionPressed', 'Action pressed', 'actionLabel', 'actionPressed', 'Label on it', 4.5], ['actionLabel', 'Action label', 'actionLabel', 'action', 'On action', 4.5], ['focus', 'Focus', 'focus', 'surface', 'Ring on surface', 3], ['disabledBg', 'Disabled fill', 'disabledText', 'disabledBg', 'Text on it', 0], ['disabledText', 'Disabled text', 'disabledText', 'disabledBg', 'On disabled fill', 0]];
    const cell = (set, k, fg, bg, need) => { const r = ctx.ratio(set[fg], set[bg]), t = ctx.fmt(r); return { hex: String(set[k]).toUpperCase(), r: need && r < need ? `<span class="x">${t}</span>` : t }; };
    const rows = R.map(([k, name, fg, bg, note, need]) => {
      const a = cell(L, k, fg, bg, need), b = cell(D, k, fg, bg, need), brand = ctx.colours.find((c) => c.hex.toLowerCase() === a.hex.toLowerCase());
      return `<tr><td><span class="sw" style="background:${L[k]}"></span></td><td>${name}<span class="nt">${note}${brand ? ` &middot; ${E(brand.name)}` : ''}</span></td><td class="hx">${a.hex}</td><td class="is-num">${a.r}</td><td><span class="sw" style="background:${D[k]}"></span></td><td class="hx">${b.hex}</td><td class="is-num">${b.r}</td></tr>`;
    }).join('');
    const table = `<div class="a ui" data-theme="light" style="left:64px;top:140px;width:658px;background:transparent"><table class="ui-table gt"><colgroup><col style="width:44px"><col style="width:250px"><col style="width:96px"><col style="width:64px"><col style="width:44px"><col style="width:96px"><col style="width:64px"></colgroup><thead><tr><th aria-label="Light colour"></th><th>Role</th><th>Light</th><th class="is-num">Ratio</th><th aria-label="Dark colour"></th><th>Dark</th><th class="is-num">Ratio</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return sheet(ctx, 'roles', { ground: L.surface, title: 'Colour roles', body: table + txt(64, 856, 658, `${E(GRADE_NOTE)} A ratio under its need is struck through: text needs 4.5, an outline or ring needs 3. Hairlines and disabled parts are exempt.`, 9.5) + at(64, 904, 658, null, slotNote(ctx, 'colours.0.name', 'Colour names: ')) });
  },

  tints(ctx) {
    const K = geo(ctx), L = ctx.roles.light, pc = primaryColour(ctx), r = ctx.C.ramp(pc.hex), base = String(rampBase(pc.hex)), F = contrastFacts(ctx);
    const bands = Object.keys(r).map((k, i) => field(ctx, 0, 120 + 56 * i, K.W, 56, r[k], at(K.L, 21, 120, 14, mono(k + (k === base ? ' *' : ''), 'i')) + at(K.W - K.R - 120, 21, 120, 14, mono(String(r[k]).toUpperCase(), 'i v'), { style: 'text-align:right' }))).join('');
    const seen = new Set(), key = (a, b) => [a, b].map((x) => x.toLowerCase()).sort().join('|');
    const legal = F.pairs.map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, names: `${ctx.esc(p.fgName)} on ${ctx.esc(p.bgName)}`, ok: true }));
    legal.forEach((p) => seen.add(key(p.fg, p.bg)));
    const fails = [...ctx.unusedPairs].sort((a, b) => b.ratio - a.ratio).filter((p) => { const k = key(p.fgHex, p.bgHex); if (seen.has(k)) return false; seen.add(k); return true; })
      .map((p) => ({ fg: p.fgHex, bg: p.bgHex, r: p.ratioText, names: `${ctx.esc((ctx.byId[p.fg] || {}).name || '')} on ${ctx.esc((ctx.byId[p.bg] || {}).name || '')}`, ok: false }));
    const all = [...legal.slice(0, 6), ...fails].slice(0, 12), pitch = (658 - 88) / 5;
    const circles = all.map((p, i) => {
      const x = 64 + (i % 6) * pitch, y = 744 + Math.floor(i / 6) * 138;
      return `<div class="gc" style="left:${n1(x)}px;top:${n1(y)}px;background:${p.bg}"${p.ok ? '' : ' data-contrast="demo"'}><span style="color:${p.fg}">Aa</span>${p.ok ? '' : strike(88, 88, 'var(--quiet)')}</div>`
        + at(x - 8, y + 96, 104, 36, `<div class="m i v${p.ok ? '' : ' x'}" style="font-size:12px;${p.ok ? '' : 'text-decoration:line-through;color:var(--quiet)'}">${p.r}</div><div class="cap q" style="margin-top:2px">${p.names}</div>`, { style: 'text-align:center' });
    }).join('');
    return sheet(ctx, 'tints', { ground: L.surface, title: 'Tints and pairs', body: bands + txt(512, 72, 210, 'The brand colour in ten steps. The star marks its own step.', 9.5) + at(K.L, 684, 658, null, `<div class="b q" style="font-size:11px">Pairs the brand sets text in, then pairs it never does (struck through).</div><div style="margin-top:6px">${slotNote(ctx, 'colours.0.name', 'Colour names: ')}</div>`) + circles });
  },

  type(ctx) {
    const K = geo(ctx), L = ctx.roles.light, B = ctx.brand, W = ctx.weights;
    const words = { headline: 'Nothing matches &quot;serif&quot;', title: 'Organisation profile', 'title-s': 'Discard your changes?', control: 'Save changes', body: 'Your edits to Contact email haven&#39;t been saved.', label: 'Contact email', caption: 'Shown on invoices and emails.' };
    let y = 128;
    const rows = [...ctx.uiType].sort((a, b) => b.size - a.size).map((t) => {
      const disp = t.face === 'display', top = y; y += Math.max(t.line, 30) + 40;
      return at(K.L, top + 3, 200, 30, `${mono(t.token, 'i v')}<br>${mono(`${t.size}/${t.line}`, 'v')}`) + at(288, top, 434, t.line, `<div class="${disp ? 'd' : 'b'}" style="font-size:${t.size}px;line-height:${t.line}px;font-weight:${disp ? W.heading : t.weight};white-space:normal;${disp ? 'letter-spacing:-.01em' : ''}">${words[t.token] || ctx.esc(t.use)}</div>`);
    }).join('');
    // the faces: each one as a specimen (a large Aa, its name, its weights and its alphabet), so the foot of the page is the loudest thing on it
    const face = (x, label, f, fam) => at(x, 694, 318, null, `<div class="b q" style="font-size:11px">${label}</div><div style="font:${label === 'Display' ? W.heading : W.regular} 128px/1 var(--${fam});letter-spacing:-.03em;margin:6px 0 0 -6px;white-space:nowrap">Aa</div><div class="d" style="font-size:26px;margin-top:10px;font-family:var(--${fam})">${ctx.esc(fontName(f))}</div><div style="margin-top:8px">${mono(f.weights.join(', '), 'i v')}</div><div class="b" style="margin-top:12px;font-family:var(--${fam});font-size:14px;line-height:1.5;color:var(--quiet);white-space:normal;word-break:break-all">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789 &amp;?!@%</div>`);
    return sheet(ctx, 'type', { ground: L.text, title: 'Type', body: rows + hr(K.L, 676, K.W - K.L - K.R) + face(K.L, 'Display', B.fonts.display, 'display') + face(404, 'Body', B.fonts.body, 'body') });
  },

  // ---- pages 8 to 13: the engine's own components, each state forced with its documentation class (is-hover, is-pressed, is-focus, is-disabled, aria-invalid) ----
  buttons(ctx) {
    const K = geo(ctx), L = ctx.roles.light, ui = ctx.ui, ctl = ctx.uiType.find((t) => t.token === 'control') || { size: 16, weight: 500 };
    const sp5 = (ctx.space.find((s) => s.token === 'space-5') || { px: 20 }).px;
    const variants = [['Primary', 'primary', 'Save', 'Once on a screen'], ['Secondary', 'secondary', 'Cancel', 'Beside the primary'], ['Quiet', 'quiet', 'Skip', 'Inside text, low weight'], ['Danger', 'danger', 'Discard', 'Throws something away']];
    const states = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Pressed with focus'], keys = ['', 'hover', 'pressed', 'focus', 'disabled', 'pf'];
    const btn = (v, label, st) => { const h = ui.btn(label, { variant: v, state: st === 'pf' ? 'pressed' : st || undefined }); return st === 'pf' ? h.replace('is-pressed', 'is-pressed is-focus') : h; };
    const hero = at(K.L, 128, 658, 176, U(ui.btn('Save changes'), 'transform:scale(4);transform-origin:0 0;width:max-content'));
    const dims = at(K.L, 316, 658, 14, mono(`Save changes at 4x. Height 44, padding ${sp5} each side, radius ${ctx.radius.button}, label ${ctl.size}/${ctl.line} at ${ctl.weight}.`, 'v'));
    const heads = states.map((s, i) => at(K.L + i * 104, 350, 98, 28, `<div class="lb" style="white-space:normal">${s}${sup(i + 1)}</div>`)).join('');
    const rows = variants.map(([name, v, label, use], r) => {
      const y = 392 + r * 84;
      return at(K.L, y, 400, 14, `<span class="lb" style="color:var(--ink)">${name}</span> <span class="lb">${use}</span>`)
        + keys.map((k, c) => { const cell = at(K.L + c * 104, y + 20, 104, 52, U(btn(v, label, k))); return k === 'disabled' ? cell.replace('<div class="a ', '<div data-contrast="demo" class="a ') : cell; }).join('');
    }).join('');
    const size = (cap, html) => `<div style="display:flex;flex-direction:column;align-items:flex-start;gap:10px">${html}<span class="lb">${cap}</span></div>`;
    const sizes = at(K.L, 734, 400, 14, '<span class="lb" style="color:var(--ink)">Sizes and icons</span>')
      + at(K.L, 756, 658, 80, U(`<div style="display:flex;gap:20px;align-items:flex-start">${size('Small, 36', ui.btn('Add', { size: 'sm' }))}${size('Default, 44', ui.btn('Add'))}${size('Large, 52', ui.btn('Add', { size: 'lg' }))}${size('Icon left', ui.btn('Add', { iconLeft: 'plus' }))}${size('Icon right', ui.btn('Next', { iconRight: 'arrow-right' }))}${size('Icon only, 44', ui.btn('', { size: 'icon', iconLeft: 'plus', attrs: 'aria-label="Add"' }))}</div>`));
    const fn = [[1, 'Default', hexOf(ctx, 'action'), 'Fill Action, label Action label.'], [2, 'Hover', hexOf(ctx, 'actionHover'), 'Fill darkens. Secondary and quiet use Sunken; danger uses Text.'], [3, 'Pressed', hexOf(ctx, 'actionPressed'), 'Fill Action pressed, and the button shrinks to 0.97.'],
      [4, 'Focus', hexOf(ctx, 'focus'), 'A 2 px ring in Focus, 2 px off the edge.'], [5, 'Disabled', hexOf(ctx, 'disabledBg'), 'Disabled fill and text. No hover, no press.'], [6, 'Pressed with focus', hexOf(ctx, 'actionPressed'), 'Both at once: pressed fill, focus ring.']];
    return sheet(ctx, 'buttons', { ground: L.surface, title: 'Buttons', body: hero + dims + heads + rows + sizes + fnotes(ctx, fn) });
  },

  fields(ctx) {
    const K = geo(ctx), L = ctx.roles.light, ui = ctx.ui, brand = ctx.esc(realOf(ctx, ctx.brand.name));
    const opts = ['Profile', 'Notifications', 'Security'];
    const fld = (id, label, k, { value = '', help, error, state, disabled, kind = 'input' } = {}) => {
      const d = error ? ` aria-invalid="true" aria-describedby="${id}-m"` : help ? ` aria-describedby="${id}-m"` : '';
      const c = `${kind === 'select' ? 'ui-select' : kind === 'textarea' ? 'ui-textarea' : 'ui-input'}${state ? ' is-' + state : ''}`, dis = disabled ? ' disabled' : '';
      const ctl = kind === 'select' ? `<select class="${c}" id="${id}"${dis}${d}>${opts.map((o) => `<option${o === value ? ' selected' : ''}>${o}</option>`).join('')}</select>`
        : kind === 'textarea' ? `<textarea class="${c}" id="${id}" rows="3" readonly tabindex="-1"${dis}${d}>${value}</textarea>` : `<input class="${c}" id="${id}" type="text" value="${value}" readonly tabindex="-1"${dis}${d}>`;
      const m = error ? `<p class="ui-error" id="${id}-m">${error}</p>` : help ? `<p class="ui-help" id="${id}-m">${help}</p>` : '';
      return `<div class="ui-field"><label class="ui-label" for="${id}">${label}${k ? sup(k) : ''}</label>${ctl}${m}</div>`;
    };
    const panel = (html, gap) => `<div class="ui pn" data-theme="light" style="display:flex;flex-direction:column;gap:${gap}px;width:336px">${html}</div>`;
    const form = at(K.L, 128, 336, null, panel([fld('f-d', 'Website', 1, { help: 'Shown on invoices and emails.' }), fld('f-f', 'Organisation name', 2, { value: brand, state: 'focus' }), fld('f-v', 'Contact email', 3, { value: 'name@example.com' }),
      fld('f-e', 'Contact email', 4, { value: 'name.example.com', error: 'Enter an email address with an @, like name@example.com.' }), fld('f-x', 'Website', 5, { disabled: true }), fld('f-t', 'Notes, text area', 0, { kind: 'textarea' })].join(''), 30));
    const cell = (type, k) => { const a = k === 'on' ? ' checked' : k === 'disabled' ? ' disabled' : ''; const cl = type === 'switch' ? ' class="ui-switch' + (k === 'focus' ? ' is-focus' : '') + '"' : k === 'focus' ? ' class="is-focus"' : ''; const h = `<label class="ui-choice" style="min-height:48px"><input type="${type === 'switch' ? 'checkbox' : type}"${type === 'switch' ? ' role="switch"' : ''}${cl}${a}></label>`; return k === 'disabled' ? `<span data-contrast="demo">${h}</span>` : h; };
    const cs = ['off', 'on', 'focus', 'disabled'], cx = (c) => 440 + 70 + c * 54;
    const choices = ['Off', 'On', 'Focus', 'Disabled'].map((t, c) => at(cx(c), 134, 54, 14, `<span class="lb">${t}</span>`)).join('')
      + [['Checkbox', 'checkbox'], ['Radio', 'radio'], ['Switch', 'switch']].map(([n, t], r) => at(440, 164 + r * 54 + 17, 70, 14, `<span class="lb" style="color:var(--ink)">${n}</span>`) + cs.map((k, c) => at(cx(c), 164 + r * 54, 54, 48, U(cell(t, k)))).join('')).join('');
    const right = at(440, 346, 282, null, panel([fld('s-d', 'Select, default', 0, { kind: 'select', value: 'Profile' }), fld('s-f', 'Select, focus', 0, { kind: 'select', value: 'Notifications', state: 'focus' }), fld('s-x', 'Select, disabled', 0, { kind: 'select', value: 'Security', disabled: true })].join(''), 26).replace('width:336px', 'width:282px'));
    const seg = (cap, dis) => `<div class="ui-field"><span class="ui-label">${cap}</span>${ui.segmented(['Day', 'Week', 'Month'], 1, { disabled: dis })}</div>`;
    const segs = at(440, 700, 282, null, panel(seg('Segmented, default', false) + seg('Segmented, disabled', true), 26).replace('width:336px', 'width:282px'));
    const fn = [[1, 'Default and hover', hexOf(ctx, 'border'), 'The kit gives a field no hover change: its edge stays Edge.'], [2, 'Focus', hexOf(ctx, 'focus'), 'The edge turns Text and a 2 px Focus ring sits off it.'], [3, 'Filled', hexOf(ctx, 'text'), 'The value is set in Text on Surface.'],
      [4, 'Error', hexOf(ctx, 'danger'), 'The edge and the message turn Danger; the message says how to fix it.'], [5, 'Disabled', hexOf(ctx, 'disabledBg'), 'Fill and text drop to the disabled pair. No edge.']];
    return sheet(ctx, 'fields', { ground: L.sunken, title: 'Fields', body: form + choices + right + segs + fnotes(ctx, fn) });
  },

  feedback(ctx) {
    const K = geo(ctx), L = ctx.roles.light, ui = ctx.ui, N = iconSet(ctx).length;
    const toast = at(K.L, 124, 658, 100, U(ui.toast('Organisation profile saved.'), 'transform:scale(2);transform-origin:0 0;width:max-content'));
    const alerts = at(K.L, 296, 300, null, U(`<div style="display:flex;flex-direction:column;gap:18px">${ui.alert('info', 'Changes apply to every page.')}${ui.alert('success', 'Profile saved.')}${ui.alert('warning', 'Your session ends in 5 minutes.')}${ui.alert('danger', "We couldn't save. Check your connection and try again.")}</div>`));
    const stat = ctx.status.slice(0, 6).map((s) => { const hex = String(statusText(ctx, 'light', s).hex).toUpperCase(); return `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:.5px solid var(--hair)">${ui.statusChip(s.id)}${mono(`${hex} &middot; ${ctx.fmt(ctx.ratio(hex, L.surface))}`, 'v')}</div>`; }).join('');
    const words = at(400, 296, 322, null, U(`<div style="border-top:.5px solid var(--hair)">${stat}</div>`));
    const load = at(400, 560, 322, null, U(`<div style="display:flex;gap:24px;align-items:center">${ui.spinner()}<div style="display:flex;flex-direction:column;gap:10px;flex:1">${ui.skeleton('100%')}${ui.skeleton('76%')}${ui.skeleton('48%')}</div></div>`));
    const empty = at(K.L, 700, 658, null, U(`<div class="ui-empty"><h3 class="ui-empty__title">Nothing matches &quot;serif&quot;</h3><p class="ui-empty__text">Clear the search to see all ${N} icons.</p>${ui.btn('Clear search', { variant: 'secondary' })}</div>`));
    const lbs = lb(K.L, 100, 300, `Toast, shown at 2x${sup(1)}`) + lb(K.L, 272, 300, `Alerts${sup(2)}`) + lb(400, 272, 300, `Status words${sup(3)}`) + lb(400, 536, 300, `Loading${sup(4)}`) + lb(K.L, 676, 300, `Empty state${sup(5)}`);
    const fn = [[1, 'Toast', hexOf(ctx, 'text'), 'A Text fill with Surface words; the one dark thing on the screen.'], [2, 'Alerts', hexOf(ctx, 'info'), 'A 2 px edge and an icon carry the tone. The words stay in Text.'], [3, 'Status', hexOf(ctx, 'success'), 'Plain words in one colour, never a pill. Each shows its ratio on Surface.'],
      [4, 'Loading', hexOf(ctx, 'sunken'), 'A Sunken track and a Text arc; the skeleton is Sunken.'], [5, 'Empty', hexOf(ctx, 'raised'), 'Raised, with one way out.']];
    return sheet(ctx, 'feedback', { ground: L.surface, title: 'Feedback', body: toast + lbs + alerts + words + load + empty + fnotes(ctx, fn) });
  },

  overlays(ctx) {
    const K = geo(ctx), L = ctx.roles.light, ui = ctx.ui, W = ctx.weights, H = n1(SH * SCALE);
    const dlg = ui.dialog({ title: 'Discard your changes?', body: "Your edits to Contact email haven't been saved.", keep: 'Keep editing', confirm: 'Discard', danger: true }).replace('class="ui-dialog"', 'class="ui-dialog" style="max-width:480px"');
    // the scrim is the engine's own; some palettes make it solid, so it is laid over the screen at 78% to leave the screen readable beneath it
    const under = screenAt(ctx, 'light', K.L, 112, SCALE, false).replace('<div class="a" style', '<div data-contrast="demo" class="a" style') + `<div class="a ui ui-scrim" data-theme="light" style="left:${K.L}px;top:112px;width:658px;height:${H}px;opacity:.78" aria-hidden="true"></div><div class="a ui tr" data-theme="light" style="left:${K.L}px;top:112px;width:658px;height:${H}px;display:grid;place-items:center">${dlg}</div>`;
    const cap = at(K.L, 112 + H + 10, 658, 14, `<span class="lb">The light screen under the scrim (shown at 78%), with the dialog at its true 480 px. Scrim ${mono(hexOf(ctx, 'scrim'), 'i v')}</span>`);
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size).slice(0, 3);
    const rows = steps.map((t, i) => `<tr${i === 1 ? ' class="is-hover"' : ''}><td>${ctx.esc(t.token)}</td><td class="hx">${t.size}/${t.line}</td><td>${WEIGHT_NAMES[t.weight] || t.weight}</td><td>${ctx.esc(t.use)}</td></tr>`).join('');
    const table = `<div class="a ui" data-theme="light" style="left:${K.L}px;top:${112 + H + 40}px;width:658px"><table class="ui-table gt"><colgroup><col style="width:110px"><col style="width:96px"><col style="width:96px"><col></colgroup><thead><tr><th>Step</th><th>Size / line</th><th>Weight</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return sheet(ctx, 'overlays', { ground: L.text, title: 'Overlays', body: under + cap + table });
  },

  space(ctx) {
    const K = geo(ctx), L = ctx.roles.light, ui = ctx.ui, icons = iconSet(ctx);
    const steps = [...ctx.space].sort((a, b) => b.px - a.px);
    let x = K.L, y = 138, rowH = 0, sq = '';
    steps.forEach((s) => {
      const w = Math.max(s.px, 56) + 14;
      if (x + w > 722 && x > K.L) { x = K.L; y += rowH + 40; rowH = 0; }
      sq += at(x, y, s.px, s.px, '', { style: `background:${L.action}` }) + at(x, y + s.px + 8, w, 26, `<div class="m i v">${ctx.esc(String(s.token).replace(/^space-/, ''))}</div><div class="m v">${s.px} px</div>`);
      x += w; rowH = Math.max(rowH, s.px);
    });
    let ry = y + rowH + 66;
    const radii = [...ctx.radii].sort((a, b) => a.px - b.px).map((r, i) => {
      const rx = K.L + (i % 4) * 166, rrow = ry + Math.floor(i / 4) * 134;
      return at(rx, rrow, 120, 80, '', { style: `border:1.5px solid var(--ink);background:var(--wash);border-radius:${Math.min(r.px, 40)}px` }) + at(rx, rrow + 88, 150, 26, `<div class="m i v">${ctx.esc(String(r.token).replace(/^radius-/, ''))}</div><div class="m v">${r.px >= 999 ? 'full' : r.px + ' px'}</div>`);
    }).join('');
    const rEnd = ry + Math.ceil(ctx.radii.length / 4) * 134;
    const iy = rEnd + 22, shown = icons.slice(0, 24), pitch = (658 - 96) / 5;
    const cells = shown.map((n, i) => {
      let svg = ''; try { svg = ui.icon(n, 24); } catch { /* an icon the loader lacks stays an empty cell */ }
      return at(K.L + (i % 6) * pitch, iy + 24 + Math.floor(i / 6) * 104, 96, 96, `<div class="ui" style="position:absolute;left:36px;top:26px;width:24px;height:24px;background:transparent;color:var(--ink)">${svg}</div><div class="m v" style="position:absolute;left:0;right:0;bottom:12px;text-align:center">${ctx.esc(n)}</div>`, { style: 'border:.5px solid var(--hair)' });
    }).join('');
    // borders at their true widths, and the float shadow on a card
    const by = iy + 24 + Math.ceil(shown.length / 6) * 104 + 30, B = ctx.brand.ui, sh = ctx.esc(String(tokenGroups(ctx).shadow['shadow-float']));
    const lines = [['hairline', '1 px'], ['control', `${B.border} px`], ['focus', '2 px']].map(([n, w], i) => at(K.L + i * 120, by + 26, 104, 40, `<div style="border-top:${w} solid var(--ink);margin-top:8px"></div><div class="m i v" style="margin-top:12px">${n}</div><div class="m v">${w}</div>`)).join('');
    const float = at(K.L + 380, by + 22, 150, 56, '', { style: `background:${L.surface};border:.5px solid var(--hair);border-radius:${ctx.radius.card}px;box-shadow:${sh === 'none' ? 'none' : sh}` }) + at(K.L + 550, by + 34, 108, 30, `<div class="m i v">shadow-float</div><div class="m v">${sh === 'none' ? 'none' : 'on a card'}</div>`);
    const lbs = lb(K.L, by, 400, 'Borders and shadow') + lb(K.L, 110, 400, 'Spacing, at true size') + lb(K.L, ry - 28, 400, 'Radius, as the kit sets it') + lb(K.L, iy, 600, `Icons, 24 px${icons.length > 24 ? `, 24 of ${icons.length}` : `, all ${icons.length}`}`);
    return sheet(ctx, 'space', { ground: L.surface, title: 'Space', body: sq + lbs + radii + cells + lines + float });
  },

  handoff(ctx) {
    const K = geo(ctx), L = ctx.roles.light, B = ctx.brand, tok = tokensCss(ctx), block = tok.slice(tok.indexOf(':root {') + 7, tok.indexOf('}'));
    const grp = (n) => (/^(sp)-/.test(n) ? 'Space' : /^r-/.test(n) ? 'Radius' : /^w-/.test(n) ? 'Width' : /^ff-/.test(n) ? 'Font' : /^(fs|lh|fw)-/.test(n) ? 'Text' : /^shadow-/.test(n) ? 'Shadow' : /^palette-/.test(n) ? 'Palette' : 'Colour');
    let cur = '', lines = 0, groups = 0;
    const vars = block.split('\n').map((l) => /^\s*--([\w-]+):\s*(.+?);\s*$/.exec(l)).filter(Boolean).map(([, n, v]) => {
      const g = grp(n), head = g !== cur ? (groups++, `<div class="hg">${g}${g === 'Colour' ? ', light' : ''}</div>`) : ''; cur = g; lines++;
      return `${head}<div class="hv"><span>${/^#[0-9a-f]{6}$/i.test(v) ? `<i style="background:${v}"></i>` : ''}--${n}</span><span>${ctx.esc(v)}</span></div>`;
    }).join('');
    const listH = Math.ceil((lines * 16 + groups * 36) / 2) + 24, top = 150;
    const dark = ctx.esc(String(ctx.roles.dark.surface).toUpperCase());
    const intro = txt(K.L, 104, 520, `The variables of tokens.css, light set. The dark set is on [data-theme="dark"], where Surface is ${dark}. Everything above is read from these.`, 11);
    const list = at(K.L, top, 658, null, vars, { style: 'column-count:2;column-gap:14px' });
    const cy = Math.min(top + listH + 36, 900);
    const colo = hr(K.L, cy, K.W - K.L - K.R)
      + at(K.L, cy + 18, 658, null, `<div class="d" style="font-size:44px;line-height:1.1;letter-spacing:-.02em;white-space:normal">Set in ${ctx.esc(fontName(B.fonts.display))} and ${ctx.esc(fontName(B.fonts.body))}.</div><div style="margin-top:10px">${mono(ctx.esc(ctx.versionLine), 'v')}</div><div class="b q" style="margin-top:14px;font-size:11px;line-height:1.6;white-space:normal">The kit holds tokens.css, tokens.json, tokens.ts, tailwind.css, components.css, fonts.css, example.html and a README.</div>`);
    return sheet(ctx, 'handoff', { ground: L.text, title: 'Handoff', body: intro + list + colo });
  },
};
