// Theme 23, Broadsheet, lane u2: small helpers shared by lane-u2.js and lane-u2-more.js (not auto-loaded).
import { A } from './helpers.js';
import { mono } from './lane-u1-kit.js';

export const sc = (ctx) => ctx.brand.ui.screen.content;
// a token name, as a literal value
export const tok = (name) => mono(`--${name}`);
// the display ad set in the flow (u1's adBox places it absolutely): the same classes, so u1's css draws it
export const ad = (inner, { dark = false, pad = 24, cls = '', style = '' } = {}) =>
  `<div class="ui u1-ad ${cls}"${dark ? ' data-theme="dark"' : ''} style="padding:${pad}px;${style}"><!--art-->${inner}<!--/art--></div>`;
// a spacing step's px by its number (--sp-n), with the code's own fallback
export const spOf = (ctx, n, fb) => (ctx.space.find((s) => s.token === `space-${n}`) || { px: fb }).px;
// a UI type step by token
export const typeOf = (ctx, token) => ctx.uiType.find((t) => t.token === token) || { size: 16, line: 24, weight: 400 };
// a ruled run of notes: [[head, html]]
export const notes = (rows) => `<div class="u2-sl">${rows.map(([k, v]) => `<div class="u2-nr"><p class="c-label c-ink">${A(k)}</p><p class="c-cap c-ink">${v}</p></div>`).join('')}</div>`;
