// Theme 32, Dieline, lane hk: the kit site's own parts. A specimen is a die-cut window in a panel of the net with the live component in it, and
// its markup on a sealed strip under the window, torn open with a copy tab. The bench is the main component through one window with two rows
// of tabs (kind, state) and the computed values for every state read back from the browser (K.scan). Classes are hk-*.
import { A, win, quiet, svgH } from './lane-ht-net.js';
import { roles, pack } from './geom.js';

// ---- the brand's kit copy, with the same fallbacks as lane-u2 for a brand that leaves the examples out ----
export function copyOf(ctx) {
  const C = ctx.brand.ui.screen.content, F = C.form, E = C.example || {}, D = C.dialog || {}, M = C.empty || {};
  const st = (id) => (ctx.status.find((s) => s.id === id) || ctx.status[0]).label;
  return {
    C, F, E, D, M, st,
    book: F.book, secondary: E.secondary || F.book, quiet: E.quiet || E.secondary || F.book, danger: E.danger || D.confirm || F.book, small: E.small || F.book,
    checks: E.checks || [F.size], radios: E.radios || F.sizes || [F.size], switches: E.switches || E.checks || [F.size],
    tabs: E.tabs || F.sizes || [], crumbs: E.crumbs || [], links: E.links || [['Track', 'map-pin']], account: E.account || '',
    statLabel: E.statLabel || C.paidLabel,
  };
}
// the shortest of a list (the one most likely to hold one line in a narrow window)
export const shortest = (xs) => [...xs].sort((a, b) => String(a).length - String(b).length)[0];

const memo = new WeakMap();
export function env(ctx) {
  let e = memo.get(ctx);
  if (!e) { e = { R: roles(ctx), P: pack(ctx) }; memo.set(ctx, e); }
  return e;
}

// the element the bench drives: the first control tag in a component's markup
export const tgt = (html, re = /<(button|input|select|textarea)\b/) => html.replace(re, (m) => `${m} data-target`);
export const untgt = (html) => html.replace(/ data-target\b/g, '');

// a caption with its literal values (tokens, hex, px, ratios) in mono
const VAL = /--[a-z0-9-]+|#[0-9A-Fa-f]{6}\b|\d+(?:\.\d+)?(?::1| px| ms)?/g;
export const mixed = (s) => { s = String(s); let o = '', i = 0; for (const m of s.matchAll(VAL)) { o += A(s.slice(i, m.index)) + `<span class="m">${A(m[0])}</span>`; i = m.index + m[0].length; } return o + A(s.slice(i)); };
export const note = (s) => quiet(mixed(s));

// ---- copy ----
export const copyBtn = (text, name, label = 'Copy') => `<button type="button" class="hk-copy" data-copy="${A(text)}" data-copy-name="${A(name)}" aria-label="${A(label)}, ${A(name)}"><span data-copy-text>${A(label)}</span></button>`;
// the markup on a sealed strip: the copy tab on the perforation
export function code(K, html, name, { lang = 'HTML', variant, hidden = false } = {}) {
  // the logo's path data is the brand pack's file, not markup to copy: the strip names it instead of printing a wall of coordinates
  const t = lang === 'HTML' ? K.prettyHtml(untgt(html).replace(/<svg\b[^>]*\brole="img"[^>]*>[\s\S]*?<\/svg>/g, '<!-- the logo SVG from the brand pack -->')) : String(html);
  return `<div class="hk-code"${variant ? ` data-for-variant="${A(variant)}"` : ''}${hidden ? ' hidden' : ''}><div class="hk-code__bar"><span class="hk-code__k">${A(lang)}, ${A(name)}</span>${copyBtn(t, name)}${svgH('seal', 'hk-perf')}</div><pre class="hk-pre"><code>${A(t)}</code></pre></div>`;
}

// ---- a specimen: a heading, a note, the live window and its markup ----
export function spec(K, { title, text, live, html, dark = false, cls = '', name, wcls = '' }) {
  return `<section class="hk-spec ${cls}">${title ? `<h2 class="hs-h2">${A(title)}</h2>` : ''}${text ? note(text) : ''}${win(live, { dark, label: title || name, cls: wcls })}${html ? code(K, html, name || title) : ''}</section>`;
}
export const specs = (list) => `<div class="hk-specs">${list.join('')}</div>`;

// ---- the bench ----
export const BTN_STATES = [
  { id: 'rest', label: 'Rest' }, { id: 'hover', label: 'Hover', cls: 'is-hover' }, { id: 'focus', label: 'Focus', cls: 'is-focus' },
  { id: 'pressed', label: 'Pressed', cls: 'is-pressed' }, { id: 'disabled', label: 'Disabled', attr: { disabled: '' } },
];
export const BENCH_ROWS = ['rest', 'hover', 'focus', 'pressed', 'disabled', 'checked'];

const tabs = (label, items) => `<div class="hk-grp" role="group" aria-label="${A(label)}"><span class="hk-grp__k" aria-hidden="true">${A(label)}</span><div class="hk-tabs">${items}</div></div>`;
// the controls and the live figure (the first panel of the page)
export function benchTop(K, label) {
  const B = K.bench; if (!B) return '';
  const v0 = B.variants[0].id, s0 = B.states[0];
  const vs = B.variants.map((v) => `<button type="button" data-set-variant="${A(v.id)}" aria-pressed="${v.id === v0}">${A(v.label)}</button>`).join('');
  const ss = B.states.map((s) => `<button type="button" data-set-state="${A(s.id)}" data-state-cls="${A(s.cls || '')}" data-state-attr="${A(JSON.stringify(s.attr || {}))}" data-label="${A(s.label)}" aria-pressed="${s.id === s0.id}">${A(s.label)}</button>`).join('');
  const fig = B.variants.map((v) => `<div class="hk-fv" data-for-variant="${A(v.id)}"${v.id === v0 ? '' : ' hidden'}>${v.html}</div>`).join('');
  return `<div class="hk-ctl">${tabs('Kind', vs)}${tabs('State', ss)}</div>
<div class="hk-fig" data-fig>${win(fig, { label, cls: 'hk-benchwin' })}</div>
<p class="hk-now">Showing <span data-bench-label>${A(s0.label)}</span></p>`;
}
// a value read back from the browser: the token when one matches in both modes, the two hexes either way
function val(p) {
  if (!p || (!p.light && !p.dark)) return '<span class="hk-none">None</span>';
  const dots = `<span class="hk-dots" aria-hidden="true"><i style="background:${p.light || 'transparent'}"></i><i style="background:${p.dark || 'transparent'}"></i></span>`;
  return `${dots}<span class="hk-tv">${p.token ? `<span class="m hk-tn">--${A(p.token)}</span>` : ''}<span class="m hk-hx">${A(p.light || 'None')}</span><span class="m hk-hx">${A(p.dark || 'None')}</span></span>`;
}
// the states matrix for each kind (one shows at a time, with the variant tabs); the row of the state on the figure is marked
export function benchMatrix(K) {
  const B = K.bench, S = K.scan; if (!B || !S) return '';
  const head = ['State', 'Fill', 'Label', 'Edge', 'Ring', 'Scale'];
  const hrow = `<div class="hk-mx__r hk-mx__h" role="row">${head.map((h) => `<span role="columnheader">${h}</span>`).join('')}</div>`;
  return B.variants.map((v, i) => {
    const rows = B.states.map((s) => {
      const r = (S[v.id] || {})[s.id]; if (!r) return '';
      const edge = r.border && (r.border.light || r.border.dark) ? `${val(r.border)}<span class="m hk-w">${r.border.width} px</span>` : val(null);
      const cells = [['Fill', val(r.bg)], ['Label', val(r.fg)], ['Edge', edge], ['Ring', val(r.outline)], ['Scale', r.scale ? `<span class="m">${r.scale}%</span>` : '<span class="hk-none">None</span>']];
      return `<div class="hk-mx__r" role="row" data-row="${A(s.id)}"><span role="rowheader" class="hk-mx__s">${A(s.label)}</span>${cells.map(([k, h]) => `<span role="cell" data-k="${k}">${h}</span>`).join('')}</div>`;
    }).join('');
    return `<div class="hk-mx" role="table" aria-label="${A(v.label)}, computed in light and dark" data-for-variant="${A(v.id)}"${i ? ' hidden' : ''}>${hrow}${rows}</div>`;
  }).join('');
}
export function benchCode(K) {
  const B = K.bench; if (!B) return '';
  return `<div class="hk-bcode" data-bench-code>${B.variants.map((v, i) => code(K, v.html, v.label, { variant: v.id, hidden: i > 0 })).join('')}</div>`;
}
// the attributes the bench needs on its wrapper
export const benchAttrs = (K) => (K.bench ? ` data-bench data-variant="${A(K.bench.variants[0].id)}" data-state="${A(K.bench.states[0].id)}"` : '');
