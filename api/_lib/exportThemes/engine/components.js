// Working components built only on the tokens in tokens.css. CSS plus markup helpers shared by every theme.
import { esc } from './brand.js';
import { cssIdent, cssNum, commentText } from './escape.js';

// Lucide (ISC) icon drawn with the brand's stroke and corner style. ctx.loaders.icon(name) gives the icon's inner svg markup.
export function icon(ctx, name, size = 20) {
  const inner = ctx.loaders.icon(name);
  const s = ctx.iconStyle;
  return `<svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${cssNum(s.stroke, 'icon stroke')}" stroke-linecap="${s.cap}" stroke-linejoin="${s.join}" aria-hidden="true" focusable="false">${inner}</svg>`;
}
export const ICON_SET = ['map-pin', 'clock', 'package', 'phone', 'user', 'calendar', 'search', 'check', 'x', 'plus', 'menu', 'chevron-right', 'arrow-right', 'triangle-alert', 'info'];
// the icons shipped in the kit: brand data ui.icons (Lucide names) if it lists some, else the default set
export const iconSet = (ctx) => ctx.brand.ui.icons || ICON_SET;
// the display face as the brand sets it: its heaviest weight and its width axis (100 when it has none)
export const displayType = (ctx) => { const d = ctx.brand.fonts.display; return { DW: cssNum(ctx.weights.heading, 'heading weight'), DS: cssNum(d.stretch || 100, 'display stretch') }; };

// emit a state rule for both a real pseudo-class and a forced class used in documentation
const st = (sel, pseudo, cls, body, extra = '') => `@media (hover:hover){${sel}:${pseudo}${extra}{${body}}}\n${sel}.${cls}{${body}}`;

export function componentsCss(ctx) {
  const { DW, DS } = displayType(ctx), W = Object.fromEntries(Object.entries(ctx.weights).map(([k, v]) => [k, cssNum(v, `${k} weight`)]));
  const statusCss = ctx.status.filter((s) => s.custom).map((s) => `.ui-chip--s-${cssIdent(s.id)} { color: var(--status-${cssIdent(s.id)}-text); }`).join(" ");
  return `/* ${commentText(ctx.brand.name)} components. Built only on tokens.css. */
.ui, .ui * { box-sizing: border-box; }
.ui { font-family: var(--ff-body); font-size: var(--fs-body); line-height: var(--lh-body); color: var(--text); background: var(--surface); }
.ui-icon { flex: none; display: inline-block; vertical-align: middle; }
.ui-display { font-family: var(--ff-display); font-weight: ${DW}; letter-spacing: -0.01em; }
.ui-num { font-variant-numeric: tabular-nums; }
:where(.ui) :focus-visible, .ui-focus-ring:focus-visible { outline: 2px solid transparent; box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--focus); }
.ui .is-focus { outline: 2px solid transparent; box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--focus); }

/* buttons */
.ui-btn { --bg: var(--action); --fg: var(--action-label); --edge-c: var(--action-edge, transparent); display: inline-flex; align-items: center; justify-content: center; gap: var(--sp-2); height: 44px; padding: 0 var(--sp-5, 20px); border: var(--w-control) solid var(--edge-c); border-radius: var(--r-button); background: var(--bg); color: var(--fg); font: var(--fw-control) var(--fs-control)/1 var(--ff-body); white-space: nowrap; cursor: pointer; text-decoration: none; transition: background-color 120ms ease-out, transform 120ms ease-out, border-color 120ms ease-out; }
.ui-btn--secondary { --bg: var(--surface); --fg: var(--text); --edge-c: var(--text); }
.ui-btn--quiet { --bg: transparent; --fg: var(--text); padding: 0 var(--sp-3); text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1.5px; }
.ui-btn--danger { --bg: var(--danger); --fg: var(--surface); }
.ui-btn--sm { height: 36px; padding: 0 var(--sp-4); font-size: var(--fs-label); }
.ui-btn--lg { height: 52px; padding: 0 var(--sp-6); }
.ui-btn--block { display: flex; width: 100%; }
.ui-btn--icon { width: 44px; padding: 0; }
${st('.ui-btn', 'hover', 'is-hover', '--bg: var(--action-hover);', ':not(:disabled):not([aria-disabled="true"])')}
${st('.ui-btn--secondary', 'hover', 'is-hover', '--bg: var(--sunken);', ':not(:disabled):not([aria-disabled="true"])')}
${st('.ui-btn--quiet', 'hover', 'is-hover', '--bg: var(--sunken);', ':not(:disabled):not([aria-disabled="true"])')}
${st('.ui-btn--danger', 'hover', 'is-hover', '--bg: var(--text);', ':not(:disabled):not([aria-disabled="true"])')}
.ui-btn:active:not(:disabled):not([aria-disabled="true"]), .ui-btn.is-pressed { --bg: var(--action-pressed); transform: scale(0.97); }
.ui-btn--secondary:active:not(:disabled):not([aria-disabled="true"]), .ui-btn--secondary.is-pressed { --bg: var(--sunken); }
.ui-btn--quiet:active:not(:disabled):not([aria-disabled="true"]), .ui-btn--quiet.is-pressed { --bg: var(--sunken); }
.ui-btn--danger:active:not(:disabled):not([aria-disabled="true"]), .ui-btn--danger.is-pressed { --bg: var(--text); }
.ui-btn:disabled, .ui-btn[aria-disabled="true"], .ui-btn.is-disabled { --bg: var(--disabled-bg); --fg: var(--disabled-text); --edge-c: transparent; cursor: not-allowed; transform: none; text-decoration: none; }

/* fields */
.ui-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ui-label { font: var(--fw-label) var(--fs-label)/var(--lh-label) var(--ff-body); color: var(--text); }
.ui-input, .ui-select, .ui-textarea { width: 100%; height: 44px; padding: 0 12px; border: var(--w-control) solid var(--edge); border-radius: var(--r-input); background: var(--surface); color: var(--text); font: ${W.regular} var(--fs-control)/var(--lh-control) var(--ff-body); transition: border-color 120ms ease-out; }
.ui-textarea { height: auto; min-height: 96px; padding: 10px 12px; resize: vertical; }
.ui-select { appearance: none; padding-right: 40px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${ctx.roles.light.quiet.slice(1)}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
[data-theme="dark"] .ui-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${ctx.roles.dark.quiet.slice(1)}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .ui-select { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${ctx.roles.dark.quiet.slice(1)}' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); } }
.ui-input::placeholder, .ui-textarea::placeholder { color: var(--quiet); }
.ui-input:focus-visible, .ui-select:focus-visible, .ui-textarea:focus-visible, .ui-input.is-focus, .ui-select.is-focus, .ui-textarea.is-focus { border-color: var(--text); }
.ui-input[aria-invalid="true"], .ui-select[aria-invalid="true"], .ui-textarea[aria-invalid="true"] { border-color: var(--danger); }
.ui-input:disabled, .ui-select:disabled, .ui-textarea:disabled { background: var(--disabled-bg); color: var(--disabled-text); border-color: transparent; cursor: not-allowed; }
.ui-help { margin: 0; font-size: var(--fs-caption); line-height: var(--lh-caption); color: var(--quiet); }
.ui-error { margin: 0; color: var(--danger); font: ${W.medium} var(--fs-label)/1.4 var(--ff-body); }

/* choices */
.ui-choice { display: inline-flex; align-items: center; gap: 12px; min-height: 44px; font: ${W.regular} var(--fs-control)/var(--lh-control) var(--ff-body); color: var(--text); cursor: pointer; }
.ui-choice input { appearance: none; margin: 0; flex: none; width: 22px; height: 22px; border: var(--w-control) solid var(--edge); background: var(--surface); display: grid; place-content: center; cursor: inherit; transition: background-color 120ms ease-out; }
.ui-choice input[type="checkbox"] { border-radius: var(--r-input); }
.ui-choice input[type="radio"] { border-radius: var(--r-round); }
.ui-choice input[type="checkbox"]:checked { background: var(--text); border-color: var(--text); }
.ui-choice input[type="checkbox"]:checked::after { content: ""; width: 10px; height: 5px; border-left: 2px solid var(--surface); border-bottom: 2px solid var(--surface); transform: translateY(-1px) rotate(-45deg); }
.ui-choice input[type="radio"]:checked { border-color: var(--text); }
.ui-choice input[type="radio"]:checked::after { content: ""; width: 10px; height: 10px; border-radius: var(--r-round); background: var(--text); }
.ui-choice input:focus-visible, .ui-choice input.is-focus { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--focus); }
.ui-choice input:disabled { background: var(--disabled-bg); border-color: transparent; }
.ui-choice input:disabled ~ span { color: var(--disabled-text); }
.ui-choice:has(input:disabled) { cursor: not-allowed; }
.ui-choice input.ui-switch { position: relative; flex: none; width: 44px; height: 26px; margin: 0; appearance: none; border: var(--w-control) solid var(--edge); border-radius: var(--r-round); background: var(--surface); cursor: pointer; transition: background-color 120ms ease-out; }
.ui-choice input.ui-switch::after { content: ""; border: 0; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: var(--r-round); background: var(--edge); transition: transform 120ms ease-out, background-color 120ms ease-out; }
.ui-choice input.ui-switch:checked { background: var(--action); border-color: var(--text); }
.ui-choice input.ui-switch:checked::after { width: 16px; height: 16px; border: 0; transform: translateX(18px); background: var(--text); }
.ui-choice input.ui-switch:focus-visible, .ui-choice input.ui-switch.is-focus { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--focus); }
.ui-choice input.ui-switch:disabled { background: var(--disabled-bg); border-color: transparent; cursor: not-allowed; }
.ui-choice input.ui-switch:disabled::after { background: var(--disabled-text); }
.ui-segmented { display: inline-flex; border: var(--w-control) solid var(--text); border-radius: var(--r-button); overflow: hidden; }
.ui-segmented button { height: 40px; padding: 0 16px; border: 0; border-left: var(--w-control) solid var(--text); background: var(--surface); color: var(--text); font: ${W.medium} var(--fs-label)/1 var(--ff-body); cursor: pointer; transition: background-color 120ms ease-out; }
.ui-segmented button:first-child { border-left: 0; }
.ui-segmented button[aria-pressed="true"] { background: var(--text); color: var(--surface); }
@media (hover:hover) { .ui-segmented button[aria-pressed="false"]:hover { background: var(--sunken); } }
.ui-segmented button:focus-visible, .ui-segmented button.is-focus { outline: 2px solid transparent; box-shadow: inset 0 0 0 2px var(--focus); }
.ui-segmented button:disabled { background: var(--disabled-bg); color: var(--disabled-text); cursor: not-allowed; }

/* cards: edges, not shadows */
.ui-card { display: flex; flex-direction: column; min-width: 0; background: var(--surface); border: var(--w-hairline) solid var(--divider); border-radius: var(--r-card); overflow: hidden; }
.ui-card--raised { background: var(--raised); border-color: transparent; }
.ui-card__media { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: var(--sunken); }
.ui-card__body { display: flex; flex-direction: column; gap: 6px; padding: 16px; }
.ui-card__title { margin: 0; font: ${DW} var(--fs-title-s)/var(--lh-title-s) var(--ff-display); font-stretch: ${DS}%; letter-spacing: -0.01em; }
.ui-card__text { margin: 0; color: var(--text-soft); font-size: var(--fs-body); line-height: 1.5; }
.ui-card__meta { margin: 0; color: var(--quiet); font-size: var(--fs-label); }
.ui-stat { display: flex; flex-direction: column; gap: 4px; padding: 16px; border: var(--w-hairline) solid var(--divider); border-radius: var(--r-card); background: var(--surface); }
.ui-stat__value { font: ${DW} var(--fs-title)/var(--lh-title) var(--ff-display); font-stretch: ${DS}%; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; }
.ui-stat__label { color: var(--quiet); font-size: var(--fs-label); }

/* navigation */
.ui-topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 56px; padding: 0 16px; background: var(--surface); border-bottom: var(--w-hairline) solid var(--divider); }
.ui-topbar__links { display: flex; gap: 4px; }
@media (max-width: 480px) { .ui-topbar { height: auto; flex-wrap: wrap; padding: 8px 16px; } .ui-topbar__links { flex-wrap: wrap; } }
.ui-link { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px; border-radius: var(--r-control); color: var(--text-soft); font: ${W.medium} var(--fs-label)/1 var(--ff-body); text-decoration: none; transition: background-color 120ms ease-out; }
.ui-link[aria-current="page"], .ui-link[aria-current="true"] { color: var(--text); box-shadow: inset 0 -3px 0 var(--action); border-radius: 0; }
@media (hover:hover) { .ui-link:hover { background: var(--sunken); color: var(--text); } }
.ui-tabs { display: flex; gap: 4px; border-bottom: var(--w-hairline) solid var(--divider); }
.ui-tabs [role="tab"] { height: 44px; padding: 0 16px; border: 0; background: transparent; color: var(--text-soft); font: ${W.medium} var(--fs-label)/1 var(--ff-body); cursor: pointer; }
.ui-tabs [role="tab"][aria-selected="true"] { color: var(--text); box-shadow: inset 0 -3px 0 var(--action); }
@media (hover:hover) { .ui-tabs [role="tab"]:hover { background: var(--sunken); } }
.ui-sidebar { display: flex; flex-direction: column; gap: 2px; width: 220px; padding: 12px; background: var(--raised); border-radius: var(--r-card); }
.ui-sidebar .ui-link { width: 100%; }
.ui-sidebar .ui-link[aria-current="page"] { background: var(--surface); box-shadow: inset 3px 0 0 var(--action); }
.ui-crumbs { display: flex; align-items: center; gap: 6px; margin: 0; padding: 0; list-style: none; font-size: var(--fs-label); color: var(--quiet); }
.ui-crumbs a { color: var(--text-soft); text-underline-offset: 3px; }
.ui-crumbs li + li::before { content: "/"; margin-right: 6px; color: var(--quiet); }
.ui-crumbs [aria-current="page"] { color: var(--text); font-weight: ${W.medium}; }
.ui-tabbar { display: grid; grid-template-columns: repeat(4, 1fr); height: 64px; background: var(--surface); border-top: var(--w-hairline) solid var(--divider); }
.ui-tabbar a { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; color: var(--quiet); font: ${W.medium} var(--fs-caption)/1 var(--ff-body); text-decoration: none; }
.ui-tabbar a[aria-current="page"] { color: var(--text); box-shadow: inset 0 3px 0 var(--action); }

/* lists */
.ui-list { margin: 0; padding: 0; list-style: none; border-top: var(--w-hairline) solid var(--divider); }
.ui-row { display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 12px 0; border-bottom: var(--w-hairline) solid var(--divider); }
.ui-row__lead { flex: none; display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--r-round); background: var(--sunken); color: var(--text); font: ${W.strong} var(--fs-label)/1 var(--ff-body); }
.ui-row__main { flex: 1; min-width: 0; }
.ui-row__title { margin: -4px 0; padding: 4px 0; font: ${W.medium} var(--fs-body)/var(--lh-label) var(--ff-body); overflow-wrap: break-word; }
.ui-row__sub { margin: 0; color: var(--quiet); font-size: var(--fs-label); font-variant-numeric: tabular-nums; }
.ui-row__end { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; font-variant-numeric: tabular-nums; font-size: var(--fs-label); }
a.ui-row { color: inherit; text-decoration: none; }
@media (hover:hover) { a.ui-row:hover { background: var(--raised); } }

/* status: plain words in one colour, never a tinted pill */
.ui-chip { display: inline-flex; align-items: center; font: ${W.medium} var(--fs-label)/1.3 var(--ff-body); white-space: nowrap; }
.ui-chip--action { color: var(--action-text); }
.ui-chip--success { color: var(--success); }
.ui-chip--warning { color: var(--warning); }
.ui-chip--danger { color: var(--danger); }
.ui-chip--info { color: var(--info); }
.ui-chip--neutral { color: var(--text-soft); }
${statusCss}
.ui-badge { display: inline-grid; place-items: center; min-width: 20px; height: 20px; padding: 0 6px; border-radius: var(--r-round); background: var(--action); color: var(--action-label); font: ${W.strong} var(--fs-caption)/1 var(--ff-body); font-variant-numeric: tabular-nums; }

/* feedback */
/* an alert is words on the page ground: the icon and a 2 px edge carry the tone, the text stays in the text colour */
.ui-alert { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0 10px 14px; border-left: 2px solid var(--edge); color: var(--text); font-size: var(--fs-body); line-height: 1.45; }
.ui-alert .ui-icon { margin-top: 2px; }
.ui-alert--info { border-left-color: var(--info); } .ui-alert--info .ui-icon { color: var(--info); }
.ui-alert--success { border-left-color: var(--success); } .ui-alert--success .ui-icon { color: var(--success); }
.ui-alert--warning { border-left-color: var(--warning); } .ui-alert--warning .ui-icon { color: var(--warning); }
.ui-alert--danger { border-left-color: var(--danger); } .ui-alert--danger .ui-icon { color: var(--danger); }
.ui-toast { display: inline-flex; align-items: center; gap: 12px; padding: 12px 16px; border-radius: var(--r-control); background: var(--text); color: var(--surface); font-size: var(--fs-body); }
.ui-toast button { margin-left: 8px; border: 0; background: transparent; color: inherit; font: ${W.strong} var(--fs-label)/1 var(--ff-body); text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.ui-inline-msg { display: flex; align-items: center; gap: 8px; margin: 0; font-size: var(--fs-label); color: var(--text-soft); }
.ui-spinner { width: 24px; height: 24px; border: 3px solid var(--sunken); border-top-color: var(--text); border-radius: var(--r-round); animation: ui-spin 900ms linear infinite; }
@keyframes ui-spin { to { transform: rotate(360deg); } }
.ui-skeleton { display: block; height: 14px; border-radius: var(--r-control); background: var(--sunken); }
@media (prefers-reduced-motion: reduce) { .ui-spinner { animation: none; border-top-color: var(--text); border-right-color: var(--text); } .ui-btn, .ui-input, .ui-switch, .ui-switch::after { transition: none; } .ui-btn:active { transform: none; } }

/* dialog */
.ui-scrim { display: grid; place-items: center; padding: 24px; background: var(--scrim); }
.ui-dialog { width: 100%; max-width: 440px; padding: 24px; background: var(--surface); color: var(--text); border: var(--w-control) solid var(--text); border-radius: var(--r-card); box-shadow: var(--shadow-float); display: flex; flex-direction: column; gap: 12px; }
.ui-dialog__title { margin: 0; font: ${DW} var(--fs-title-s)/var(--lh-title-s) var(--ff-display); font-stretch: ${DS}%; letter-spacing: -0.01em; }
.ui-dialog__text { margin: 0; color: var(--text-soft); }
.ui-dialog__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; flex-wrap: wrap; }
dialog.ui-dialog::backdrop { background: var(--scrim); }

/* table */
.ui-table { width: 100%; border-collapse: collapse; font-size: var(--fs-body); }
.ui-table th { height: 44px; padding: 0 12px; text-align: left; background: var(--raised); color: var(--text); font: ${W.medium} var(--fs-label)/1 var(--ff-body); border-bottom: var(--w-control) solid var(--text); white-space: nowrap; }
.ui-table th button { all: unset; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.ui-table th button:focus-visible { box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--focus); }
.ui-table td { height: 52px; padding: 0 12px; border-bottom: var(--w-hairline) solid var(--divider); }
.ui-table .is-num { text-align: right; font-variant-numeric: tabular-nums; }
.ui-table tbody tr[aria-selected="true"] { background: var(--raised); box-shadow: inset 3px 0 0 var(--action); }
@media (hover:hover) { .ui-table tbody tr:hover { background: var(--raised); } }
.ui-table tbody tr.is-hover { background: var(--raised); }

/* empty */
.ui-empty { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; padding: 32px; border-radius: var(--r-card); background: var(--raised); }
.ui-empty__title { margin: 0; font: ${DW} var(--fs-headline)/var(--lh-headline) var(--ff-display); font-stretch: ${DS}%; letter-spacing: -0.01em; }
/* a wide display face at headline size can be wider than a phone: on a narrow screen the title steps down with the width */
@media (max-width: 480px) { .ui-empty__title { font-size: min(var(--fs-headline), 10vw); } }
.ui-empty__text { margin: 0; color: var(--text-soft); max-width: 36ch; }
.ui-progress { position: relative; height: 24px; }
.ui-progress__bar { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: var(--sunken); }
.ui-progress__bar > i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--text); }
.ui-progress__dot { position: absolute; bottom: -4px; width: 14px; height: 14px; margin-left: -7px; border-radius: var(--r-round); background: var(--action); border: 2px solid var(--text); }
.ui-avatar { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: var(--r-round); background: var(--text); color: var(--surface); font: ${W.strong} var(--fs-label)/1 var(--ff-body); }
`;
}

// the product screen's content: a theme may adjust it (meta.screenContent, e.g. a brand that says a word only once); else the brand's own
const screenOf = (ctx) => (ctx.theme && typeof ctx.theme.screenContent === 'function' ? ctx.theme.screenContent(ctx) : ctx.brand.ui.screen.content);

// markup helpers; every function returns a string
export function makeUi(ctx) {
  const A = esc;
  const ic = (n, s) => icon(ctx, n, s);
  const cls = (...a) => a.filter(Boolean).join(' ');
  const S = screenOf(ctx);
  const ui = {
    icon: ic,
    btn(label, { variant = 'primary', size, state, iconLeft, iconRight, block, disabled, tag = 'button', attrs = '' } = {}) {
      const c = cls('ui-btn', variant !== 'primary' && `ui-btn--${cssIdent(variant)}`, size && `ui-btn--${cssIdent(size)}`, state && `is-${cssIdent(state)}`, block && 'ui-btn--block');
      const dis = disabled || state === 'disabled' ? (tag === 'button' ? ' disabled' : ' aria-disabled="true"') : '';
      return `<${tag} class="${c}"${tag === 'button' ? ' type="button"' : ''}${dis} ${attrs}>${iconLeft ? ic(iconLeft, 18) : ''}${A(label)}${iconRight ? ic(iconRight, 18) : ''}</${tag}>`;
    },
    chip(label, tone = 'neutral') { return `<span class="ui-chip ui-chip--${cssIdent(tone)}">${A(label)}</span>`; },
    statusChip(id, { label } = {}) { const s = ctx.status.find((x) => x.id === id) || ctx.status[0]; return `<span class="ui-chip ${s.custom ? 'ui-chip--s-' + cssIdent(s.id) : 'ui-chip--' + cssIdent(s.tone)}">${A(label || s.label)}</span>`; },
    field({ id, label, value = '', type = 'text', help, error, disabled, state, placeholder, kind = 'input', options = [] }) {
      const d = error ? ` aria-invalid="true" aria-describedby="${id}-m"` : help ? ` aria-describedby="${id}-m"` : '';
      let ctl;
      if (kind === 'select') ctl = `<select class="ui-select ${state ? 'is-' + state : ''}" id="${id}"${disabled ? ' disabled' : ''}${d}>${options.map((o) => `<option${o === value ? ' selected' : ''}>${A(o)}</option>`).join('')}</select>`;
      else if (kind === 'textarea') ctl = `<textarea class="ui-textarea ${state ? 'is-' + state : ''}" id="${id}" rows="3"${disabled ? ' disabled' : ''}${placeholder ? ` placeholder="${A(placeholder)}"` : ''}${d}>${A(value)}</textarea>`;
      else ctl = `<input class="ui-input ${state ? 'is-' + state : ''}" id="${id}" type="${type}" value="${A(value)}"${disabled ? ' disabled' : ''}${placeholder ? ` placeholder="${A(placeholder)}"` : ''}${d}>`;
      const m = error ? `<p class="ui-error" id="${id}-m">${A(error)}</p>` : help ? `<p class="ui-help" id="${id}-m">${A(help)}</p>` : '';
      return `<div class="ui-field"><label class="ui-label" for="${id}">${A(label)}</label>${ctl}${m}</div>`;
    },
    check(label, { checked, disabled, name, type = 'checkbox', state } = {}) { return `<label class="ui-choice"><input type="${type}"${name ? ` name="${name}"` : ''}${checked ? ' checked' : ''}${disabled ? ' disabled' : ''} class="${state ? 'is-' + state : ''}"><span>${A(label)}</span></label>`; },
    switch(label, { checked, disabled, state } = {}) { return `<label class="ui-choice"><input class="ui-switch ${state ? 'is-' + state : ''}" type="checkbox" role="switch"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}><span>${A(label)}</span></label>`; },
    segmented(items, active, { disabled } = {}) { return `<div class="ui-segmented" role="group">${items.map((t, i) => `<button type="button" aria-pressed="${i === active}"${disabled ? ' disabled' : ''}>${A(t)}</button>`).join('')}</div>`; },
    row({ lead, title, sub, end, endHtml, chip, href }) {
      const tag = href ? 'a' : 'div';
      return `<li><${tag} class="ui-row"${href ? ` href="${href}"` : ''}>${lead ? `<span class="ui-row__lead">${lead}</span>` : ''}<div class="ui-row__main"><p class="ui-row__title">${A(title)}</p>${sub ? `<p class="ui-row__sub">${A(sub)}</p>` : ''}</div><div class="ui-row__end">${end ? `<span>${A(end)}</span>` : ''}${endHtml || ''}${chip || ''}</div></${tag}></li>`;
    },
    deliveryRows(n = 5) { return `<ul class="ui-list">${S.deliveries.slice(0, n).map((d) => ui.row({ lead: ic(d.icon || ctx.brand.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status) })).join('')}</ul>`; },
    alert(tone, text) { const i = { info: 'info', success: 'check', warning: 'triangle-alert', danger: 'triangle-alert' }[tone]; return `<div class="ui-alert ui-alert--${cssIdent(tone)}" role="${tone === 'danger' ? 'alert' : 'status'}">${ic(i, 20)}<span>${A(text)}</span></div>`; },
    toast(text) { return `<div class="ui-toast" role="status"><span>${A(text)}</span><button type="button">Undo</button></div>`; },
    dialog({ title, body, confirm, keep, danger }) { return `<div class="ui-dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h3 class="ui-dialog__title" id="dlg-t">${A(title)}</h3><p class="ui-dialog__text">${A(body)}</p><div class="ui-dialog__actions">${ui.btn(keep, { variant: 'secondary' })}${ui.btn(confirm, { variant: danger ? 'danger' : 'primary' })}</div></div>`; },
    card({ title, text, meta, media, raised, action }) { return `<article class="ui-card ${raised ? 'ui-card--raised' : ''}">${media || ''}<div class="ui-card__body">${meta ? `<p class="ui-card__meta">${A(meta)}</p>` : ''}<h3 class="ui-card__title">${A(title)}</h3>${text ? `<p class="ui-card__text">${A(text)}</p>` : ''}${action || ''}</div></article>`; },
    stat(value, label) { return `<div class="ui-stat"><span class="ui-stat__value">${A(value)}</span><span class="ui-stat__label">${A(label)}</span></div>`; },
    crumbs(items) { return `<nav aria-label="Breadcrumb"><ol class="ui-crumbs">${items.map((t, i) => (i === items.length - 1 ? `<li><span aria-current="page">${A(t)}</span></li>` : `<li><a href="#">${A(t)}</a></li>`)).join('')}</ol></nav>`; },
    tabs(items, active) { return `<div class="ui-tabs" role="tablist">${items.map((t, i) => `<button role="tab" type="button" aria-selected="${i === active}">${A(t)}</button>`).join('')}</div>`; },
    links(items, active, kind = 'page') { return items.map(([t, i], k) => `<a class="ui-link" href="#"${k === active ? ` aria-current="${kind}"` : ''}>${i ? ic(i, 18) : ''}${A(t)}</a>`).join(''); },
    spinner() { return '<div class="ui-spinner" role="status" aria-label="Loading"></div>'; },
    skeleton(w) { return `<span class="ui-skeleton" style="width:${w}"></span>`; },
  };
  return ui;
}

// example.html for the code package: every component live, light/dark switch
export function exampleHtml(ctx) {
  const ui = ctx.ui, S = screenOf(ctx), F = S.form, { DW, DS } = displayType(ctx);
  // sample copy for the demo page: brand data ui.screen.content.example, else neutral words
  const X = { secondary: 'Secondary', quiet: 'Skip', danger: 'Delete', small: 'Add', account: 'Account', checks: ['Checked', 'Unchecked', 'Disabled'], switches: ['Switch on', 'Switch off'], radios: ['First choice', 'Second choice'], statLabel: 'Total', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(S.example || {}) };
  const sec = (t, body) => `<section class="ex"><h2>${esc(t)}</h2>${body}</section>`;
  const row = (...x) => `<div class="exrow">${x.join('')}</div>`;
  return `<!doctype html>
<html lang="en-AU" data-theme="light">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(ctx.brand.name)} components</title>
<link rel="stylesheet" href="fonts.css"><link rel="stylesheet" href="tokens.css"><link rel="stylesheet" href="components.css">
<style>
body{margin:0;background:var(--surface);color:var(--text);font-family:var(--ff-body)}
.ex-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px 16px;padding:16px 24px;border-bottom:1px solid var(--divider);position:sticky;top:0;background:var(--surface);z-index:2}
.ex-head h1{margin:0;font:${DW} 20px/1 var(--ff-display);font-stretch:${DS}%;letter-spacing:-0.01em}
main{max-width:960px;margin:0 auto;padding:24px}
.ex{padding:32px 0;border-bottom:1px solid var(--divider)}
.ex h2{margin:0 0 16px;font:500 13px/1.4 var(--ff-body);color:var(--quiet)}
.exrow{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:16px}
.exrow>.ui-field{flex:1 1 240px}
code{font-family:var(--ff-mono);font-size:13px}
</style></head>
<body class="ui">
<header class="ex-head"><h1>${esc(ctx.brand.name)} components</h1><div class="ui-segmented" role="group" aria-label="Colour mode"><button type="button" aria-pressed="true" data-mode="light">Light</button><button type="button" aria-pressed="false" data-mode="dark">Dark</button></div></header>
<main>
${sec('Buttons', row(ui.btn(F.book), ui.btn(X.secondary, { variant: 'secondary' }), ui.btn(X.quiet, { variant: 'quiet' }), ui.btn(X.danger, { variant: 'danger' }), ui.btn(F.book, { disabled: true }), ui.btn(X.small, { size: 'sm' }), ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' })))}
${sec('Inputs', row(ui.field({ id: 'e1', label: F.pickup, value: F.pickupValue }), ui.field({ id: 'e2', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })) + row(ui.field({ id: 'e3', label: F.ready, value: F.readyValue, error: F.readyError }), ui.field({ id: 'e4', label: F.notes, kind: 'textarea', help: F.notesHelp })) + row(ui.field({ id: 'e5', label: X.account, value: ctx.brand.name, disabled: true })))}
${sec('Choices', row(ui.check(X.checks[0], { checked: true }), ui.check(X.checks[1]), ui.check(X.checks[2], { disabled: true }), ui.switch(X.switches[0], { checked: true }), ui.switch(X.switches[1])) + row(ui.check(X.radios[0], { type: 'radio', name: 'v', checked: true }), ui.check(X.radios[1], { type: 'radio', name: 'v' }), ui.segmented(F.sizes, 1)))}
${sec('Status', row(...ctx.status.map((s) => ui.statusChip(s.id)), '<span class="ui-badge">3</span>'))}
${sec('Cards', row(ui.card({ title: S.eta, text: S.pickup, meta: S.status }), ui.card({ title: S.rider, text: S.riderNote, raised: true }), ui.stat(S.paid, X.statLabel)))}
${sec('Navigation', ui.crumbs([...X.crumbs, S.deliverTo]) + '<div style="height:16px"></div>' + ui.tabs(X.tabs, 0) + '<div style="height:16px"></div><nav class="ui-topbar" aria-label="Main"><strong class="ui-display">' + esc(ctx.brand.logo.showcase.wordmark) + '</strong><div class="ui-topbar__links">' + ui.links(X.links, 0) + '</div></nav>')}
${sec('List', ui.deliveryRows(5))}
${sec('Feedback', ui.alert('warning', S.alert) + '<div style="height:12px"></div>' + ui.alert('success', S.toast) + '<div style="height:12px"></div>' + ui.toast(S.toast) + '<div style="height:12px"></div>' + row(ui.spinner(), ui.skeleton('160px')))}
${sec('Dialog', '<div class="ui-scrim">' + ui.dialog({ ...S.dialog, danger: true }) + '</div>')}
${sec('Empty state', `<div class="ui-empty"><h3 class="ui-empty__title">${esc(S.empty.title)}</h3><p class="ui-empty__text">${esc(S.empty.body)}</p>${ui.btn(S.empty.cta)}</div>`)}
</main>
<script>
document.querySelectorAll('[data-mode]').forEach(function (b) {
  b.addEventListener('click', function () {
    document.documentElement.setAttribute('data-theme', b.dataset.mode);
    document.querySelectorAll('[data-mode]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
  });
});
</script>
</body></html>
`;
}
