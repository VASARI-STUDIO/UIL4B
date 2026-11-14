// Theme 30, Fluted, kit site: the page frame (heading, the real components, the glass figure and its key row, previous and next) and the shell (bar, pages menu).
// Brand copy is printed whole through A(). Every class here starts hk-.
import { A, adv } from './helpers.js';
import { colourMap } from '../../engine/tokens.js';
import { figure, keys } from './lane-hk-glass.js';

export const sc = (ctx) => ctx.brand.ui.screen.content;
export const pad3 = (n) => String(n).padStart(3, '0');
export const v = (s) => `<span class="hk-v">${A(s)}</span>`;           // a literal value: token, hex, size
export const ratio = (ctx, a, b) => ctx.fmt(ctx.ratio(a, b));
export const titleOf = (K, id) => (K.pages.find((p) => p.id === id) || { title: id }).title;

// a labelled group (a hairline, the arch, the label) and a matrix of labelled cells
export const grp = (label, inner, cls = '') => `<section class="hk-g ${cls}"><h2 class="hk-gl">${A(label)}</h2>${inner}</section>`;
export const cols = (n, inner) => `<div class="hk-cols" style="--n:${n}">${inner}</div>`;
export const cell = (label, inner) => `<div class="hk-cell"><span class="hk-cl">${A(label)}</span>${inner}</div>`;
export const rows = (title, cells, n = 5) => `<div class="hk-row"><h3 class="hk-rn">${A(title)}</h3><div class="hk-mx" style="--n:${n}">${cells.map(([l, c]) => cell(l, c)).join('')}</div></div>`;
export const na = (t) => `<span class="hk-na">${A(t)}</span>`;
export const ui = (inner, cls = '') => `<div class="ui hk-ui ${cls}">${inner}</div>`;

// the brand's colours that stand off the ground, for marks that carry no meaning of their own colour
export function marksOf(ctx, M) {
  const L = (h) => ctx.C.toOklch(h).L, g = L(M.surface), lo = (h) => h.toLowerCase();
  const cs = ctx.colours.slice().sort((a, b) => b.share - a.share).map((c) => c.hex).filter((h) => lo(h) !== lo(M.surface) && lo(h) !== lo(M.action));
  return [M.action, ...cs].filter((h) => Math.abs(L(h) - g) >= 0.12);
}
export const sizeOf = (ctx, token) => (ctx.uiType.find((t) => t.token === token) || { size: 16 }).size;
// the shortest of a brand's labels, measured (so it fits a narrow cell whole); never cut
export const shortest = (ctx, list, size, weight) => (list || []).filter((s) => typeof s === 'string' && s.length)
  .map((s) => [s, adv(ctx, 'body', s, size, 0, weight)]).sort((a, b) => a[1] - b[1]).map((x) => x[0])[0] || '';
// a window as faint as the ground gets a quiet outline
export const faint = (ctx, M, hex) => ctx.ratio(hex, M.surface) < 1.3;

// ---------------------------------------------------------------- the band: figure, keys and a closing line, for one mode
function band(ctx, K, mode, build) {
  const M = colourMap(ctx, mode), b = build(M, mode);
  return `<div class="hk-band">${figure(ctx, `hk-${K.page.id}-${mode[0]}`, M, b.art, { lines: b.lines || [] })}${keys(b.items)}${b.note ? `<p class="hk-note">${b.note}</p>` : ''}</div>`;
}

// the page: its heading, the real components (show), the glass figure (build(M, mode) gives { art, items, lines, note }). mode: a page printed on one mode's surface;
// without it the page follows the reader's mode and carries a figure for each.
export function frame(ctx, K, { title, sub = '', lead = '', mode = null, show, build, big = false }) {
  const head = `<header class="hk-top${big ? ' hk-big' : ''}"><h1 class="hk-h1">${A(title)}${sub ? `<span class="hk-sub">${A(sub)}</span>` : ''}</h1>${lead ? `<p class="hk-lead">${lead}</p>` : ''}</header>`;
  const body = mode
    ? `<div class="ui hk-m-${mode} hk-fixed"><div class="hk-show">${show}</div>${band(ctx, K, mode, build)}</div>`
    : `<div class="ui hk-show">${show}</div><div class="hk-md hk-md--l">${band(ctx, K, 'light', build)}</div><div class="hk-md hk-md--d">${band(ctx, K, 'dark', build)}</div>`;
  const nav = (p, dir) => (p ? `<a class="hk-pl hk-pl--${dir}" href="${K.href(p.id)}"><span class="hk-pk">${dir === 'prev' ? 'Previous' : 'Next'}</span><span class="hk-pt">${A(p.title)}</span></a>` : '<span></span>');
  const foot = `<nav class="hk-pn" aria-label="Previous and next page">${nav(K.prev, 'prev')}<span class="hk-v hk-pos">${K.page.no} of ${K.pages.length}</span>${nav(K.next, 'next')}</nav>`;
  return `<main class="hk-pg" id="hk-main">${head}${body}${foot}</main>`;
}

// ---------------------------------------------------------------- the shell
export function shell(ctx, K, body) {
  const menu = K.sections.map((s) => `<div class="hk-ms"><p class="hk-mt">${A(s.title)}</p><ul>${s.pages.map((p) => `<li><a href="${K.href(p.id)}"${p.id === K.page.id ? ' aria-current="page"' : ''}>${A(p.title)}</a></li>`).join('')}</ul></div>`).join('');
  const front = K.pages.filter((p) => !p.section).map((p) => `<li><a href="${K.href(p.id)}"${p.id === K.page.id ? ' aria-current="page"' : ''}>${A(p.title)}</a></li>`).join('');
  const bar = `<header class="hk-bar"><div class="hk-bar__in"><a class="hk-name" href="${K.href('cover')}">${A(ctx.brand.name)}</a><span class="hk-ver">UI kit, version ${A(ctx.brand.version.number)}</span>`
    + `<div class="hk-bar__r"><button class="hk-btn" type="button" data-disclosure aria-controls="hk-menu" aria-expanded="false">Pages</button>`
    + `<span class="hk-mode" role="group" aria-label="Colour mode"><button class="hk-btn" type="button" data-mode="light" aria-pressed="true">Light</button><button class="hk-btn" type="button" data-mode="dark" aria-pressed="false">Dark</button></span></div></div></header>`;
  const nav = `<nav class="hk-menu" id="hk-menu" aria-label="Pages"><div class="hk-menu__in"><div class="hk-ms"><p class="hk-mt">Start</p><ul>${front}</ul></div>${menu}</div></nav>`;
  return `<div class="sx hk-root">${bar}${nav}${body}</div>`;
}
