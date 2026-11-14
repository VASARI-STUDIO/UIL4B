// Theme 26, Notebook, lane hk: the small builders every kit page uses. A piece is a .ui region cut from the product's own ground (light under
// .hk-lt, dark under data-theme), a tape tab names it, and notes on the paper say what it shows. The components inside are ctx.ui's, unchanged.
import { ratioText } from './lane-u1.js';

export const sc = (ctx) => ctx.brand.ui.screen.content;
// the demo words the code package falls back on, overridden by the brand's own
export const ex = (ctx) => ({ secondary: 'Secondary', quiet: 'Skip', danger: 'Delete', small: 'Add', account: 'Account', checks: ['Checked', 'Unchecked', 'Disabled'], switches: ['Switch on', 'Switch off'], radios: ['First choice', 'Second choice'], statLabel: 'Total', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
export const ut = (ctx, token) => ctx.uiType.find((t) => t.token === token);
export const E = (ctx, s) => ctx.esc(s == null ? '' : String(s));
export { ratioText };

let n = 0;
export const uid = (p) => `hk-${p}-${++n}`;

export const tapeTab = (ctx, text) => `<span class="hk-tape">${E(ctx, text)}</span>`;
export const note = (ctx, text) => `<p class="hk-note">${E(ctx, text)}</p>`;
export const mono = (ctx, text) => `<p class="hk-mono">${E(ctx, text)}</p>`;
export const ink = (ctx, text) => `<p class="hk-ink">${E(ctx, text)}</p>`;
export const name = (ctx, text) => `<p class="hk-name">${E(ctx, text)}</p>`;
export const cap = (ctx, text) => `<span class="hk-cap">${E(ctx, text)}</span>`;
export const sec = (ctx, title, inner) => `<section class="hk-sec">${title ? `<h2 class="hk-tape hk-h2">${E(ctx, title)}</h2>` : ''}${inner}</section>`;

// a piece cut from one of the product's grounds; label is the tape on its top edge
export function piece(ctx, mode, inner, { label = '', cls = '', style = '', bg = '' } = {}) {
  const dark = mode === 'dark';
  return `<figure class="hk-pc">${label ? tapeTab(ctx, label) : ''}<div class="ui hk-ui ${dark ? 'hk-dk' : 'hk-lt'}${bg ? ' hk-' + bg : ''}${cls ? ' ' + cls : ''}"${dark ? ' data-theme="dark"' : ''}${style ? ` style="${style}"` : ''}>${inner}</div></figure>`;
}
// the notes that sit level with a piece: the name on tape, what it shows, and its token or value
export function says(ctx, nm, words, val) {
  return `<div class="hk-says">${tapeTab(ctx, nm)}${words ? note(ctx, words) : ''}${val ? mono(ctx, val) : ''}</div>`;
}
export const ladder = (rows) => `<div class="hk-sec">${rows.map(([p, s]) => `<div class="hk-lrow">${p}${s}</div>`).join('')}</div>`;
export const pair = (a, b) => `<div class="hk-two">${a}${b}</div>`;
export const stack = (html) => `<div class="hk-stack">${html}</div>`;
export const appendix = (ctx, title, rows) => sec(ctx, title, `<div class="hk-app">${rows.map(([k, v]) => `<div>${note(ctx, k)}${mono(ctx, v)}</div>`).join('')}</div>`);
export const ratio = (ctx, a, b) => ratioText(ctx, a, b);
