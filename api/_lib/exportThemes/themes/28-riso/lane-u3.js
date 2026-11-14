// Lane u3 for theme 28 (Riso): the UI kit's screens and code (dialog, table, empty, screen-light, screen-dark, screen-mobile, tokens, code).
// Each is a kit sheet off the brand's press (lane u1's chrome, imported read-only): a plate, a pass and a hit, and the hit is always a real
// count from ctx, named on the plate. The product is never printed with the press: a .ui panel is the product's own surface pasted clean onto
// the sheet, and the real components (ctx.ui, componentsCss, written once by lane u1's css()) sit inside it unrestyled. The three screens are
// composed only from kit components, at true size in one column (the phone straddles the plate's edge, like a proof taped over a sheet).
// Every token name, value, ratio and code line is read from the engine's own exports; every measurement of a component is read from
// componentsCss(ctx) as the package ships it. The words on the screens are the brand's own (ui.screen.content), printed whole.
// Every class here starts u3-.
import { A, val, X0, X1, W, faceFor } from './sheet.js';
import { kitSheet, plateLabel, plateNote, label, note, hair, table, swatch, Word, word, rt, sc, nLines } from './lane-u1.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';

const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[ctx.uiType.length - 1];
// the demo copy the shipped example page uses: brand.json ui.screen.content.example, else the engine's own neutral words
const ex = (ctx) => ({ account: 'Account', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;
const title = (ctx) => ex(ctx).crumbs[ex(ctx).crumbs.length - 1] || ctx.brand.ui.screen.title;

// a measurement as the shipped components.css writes it, so a number printed on a page is the shipped one
const cssCache = new WeakMap();
function shipped(ctx, sel, prop) {
  if (!cssCache.has(ctx)) cssCache.set(ctx, componentsCss(ctx));
  const css = cssCache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`riso u3: ${sel} is not in componentsCss`);
  const rule = css.slice(i + key.length, css.indexOf('}', i));
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(rule);
  if (!m) throw new Error(`riso u3: ${sel} has no ${prop}`);
  return m[1].trim();
}
const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));
const tokPx = (ctx, g, k) => parseFloat(tokenGroups(ctx)[g][k]);
// the kit's own classes (ui-*) a block of markup uses, not counting the type and number utilities or the icons
const kitClasses = (html) => new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => /^ui-[a-z]+$/.test(c) && !['ui-display', 'ui-num', 'ui-icon'].includes(c)));
const pressables = (html) => (html.match(/<(a|button)[\s>]/g) || []).length;
const stemOf = (ctx, t) => faceFor(ctx, t.face === 'display' ? 'display' : 'body', t.weight).stem;

// ---------------------------------------------------------------- css

export function css() {
  return `
.pg .u3-scr{display:flex;flex-direction:column}
.pg .u3-wm{font-size:20px;line-height:24px;white-space:nowrap}
.pg .u3-main{padding:24px 24px 0;display:flex;flex-direction:column;gap:20px}
.pg .u3-h{margin:0;font-size:var(--fs-title);line-height:var(--lh-title)}
.pg .u3-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.pg .u3-live{display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.pg .u3-live>*{max-width:100%}
.pg .u3-eta{margin:0;text-wrap:balance;font-size:var(--fs-headline);line-height:var(--lh-headline)}
.pg .u3-soft{margin:0;color:var(--text-soft);max-width:44ch}
.pg .u3-prog{width:100%;display:flex;flex-direction:column;gap:4px}
.pg .u3-ends{display:flex;justify-content:space-between;gap:12px;font-size:var(--fs-caption);line-height:var(--lh-caption);color:var(--quiet)}
.pg .u3-rider{width:100%;display:flex;align-items:center;gap:12px}
.pg .u3-who{flex:1;min-width:0}
.pg .u3-b{margin:0;font-weight:600;line-height:var(--lh-label)}
.pg .u3-q{margin:0;color:var(--quiet);font-size:var(--fs-label);line-height:var(--lh-label)}
.pg .u3-dl{margin:0;display:flex;flex-direction:column;gap:12px}
.pg .u3-dl dt{font-size:var(--fs-label);line-height:var(--lh-label);color:var(--quiet)}
.pg .u3-dl dd{margin:0;font-weight:600}
.pg .u3-two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:start}
.pg .u3-col{display:flex;flex-direction:column;gap:16px}
.pg .u3-skr{display:flex;flex-direction:column;gap:8px;flex:1}
.pg .u3-pad{padding:24px;display:flex;flex-direction:column;gap:24px}
.pg .u3-ph{position:absolute;display:flex;flex-direction:column;overflow:hidden}
.pg .u3-sb{flex:none;display:flex;align-items:center;padding:0 20px;font-weight:600;font-variant-numeric:tabular-nums}
.pg .u3-pbar{flex:none;display:flex;align-items:center;justify-content:space-between;padding:0 20px;border-bottom:var(--w-hairline) solid var(--divider)}
.pg .u3-pbody{flex:1;min-height:0;padding:20px;display:flex;flex-direction:column;gap:20px}
.pg .u3-ph .ui-tabbar{flex:none}
.pg .u3-pin{margin-top:auto;display:flex;flex-direction:column;gap:20px}
.pg .u3-pre{position:absolute;margin:0;font:400 11px/16px var(--cmono);white-space:pre;font-variant-numeric:tabular-nums}
.pg .u3-tk{position:absolute}
.pg .u3-tk p{position:absolute;white-space:nowrap;margin:0}
`;
}

// a screen's top bar, as the product has it: the wordmark, the links, the account
const wordmark = (ctx) => `<strong class="ui-display u3-wm">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
function topbar(ctx, active) {
  const X = ex(ctx), S = sc(ctx);
  return `<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ctx.ui.links(X.links, active)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
}
function progress(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  return `<div class="u3-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div>`
    + `<div class="u3-ends ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
}
function riderRow(ctx) {
  const S = sc(ctx);
  return `<div class="u3-rider"><span class="ui-avatar">${A(S.initials)}</span><div class="u3-who"><p class="u3-b">${A(S.rider)}</p><p class="u3-q ui-num">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
}
function facts(ctx) {
  const S = sc(ctx);
  return `<dl class="u3-dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;
}
const liveTop = (ctx) => `<div class="u3-live">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display u3-eta">${A(sc(ctx).eta)}</h2><p class="u3-soft">${A(sc(ctx).pickup)}</p>${progress(ctx)}${riderRow(ctx)}</div>`;

// the plate's label and note, for a hit on the left (note at 403) or on the right (note at 49)
const plateTxt = (ctx, name, bold, rest, hitLeft) => plateLabel(name, hitLeft ? 403 : 49) + plateNote(`<b style="font-weight:600">${bold}</b><br>${rest}`, hitLeft ? 403 : 49, 72, hitLeft ? 224 : 272);
const HIT = (text, left) => ({ text: String(text), x: left ? 49 : 403, base: 200, size: 200, maxW: left ? 300 : 224 });

// ---------------------------------------------------------------- the pages

export const uikit = {
  // Dialog: the shipped dialog on the shipped scrim at true size, then each part of it read off: its measure, the token it takes.
  dialog(ctx) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog, g = tokenGroups(ctx);
    const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), gap = shippedPx(ctx, '.ui-dialog', 'gap');
    const bw = tokPx(ctx, 'width', 'w-control'), cw = maxW - 2 * pad - 2 * bw;
    const tt = uiT(ctx, 'title-s'), bt = uiT(ctx, 'body');
    const dh = 2 * bw + 2 * pad + nLines(stemOf(ctx, tt), D.title, tt.size, cw) * tt.line + gap + nLines(stemOf(ctx, bt), D.body, bt.size, cw) * bt.line + gap + shippedPx(ctx, '.ui-dialog__actions', 'margin-top') + shippedPx(ctx, '.ui-btn', 'height');
    const sh = Math.max(300, Math.round(dh + 96));
    const dlg = ctx.ui.dialog({ ...D, danger: true }).replace(/dlg-t/g, 'u3-dlg-t');
    const pan = `<div class="ui u1-pan" style="left:49px;top:288px;width:578px"><div class="ui-scrim" style="height:${sh}px">${dlg}</div></div>`;
    const shadow = g.shadow['shadow-float'], ty = 288 + sh + 40;
    const cols = [{ x: 49, w: 120, head: 'Part', cls: 'c-note u1-b' }, { x: 177, w: 210, head: 'Set in', cls: 'c-value' }, { x: 395, w: 140, head: 'Value', cls: 'c-value' }, { x: 507, w: 120, head: 'On the surface', right: true, cls: 'c-value' }];
    const rows = [
      ['The box', 'max-width', A(`${maxW} px`), ''],
      ['Inside', 'padding', A(`${pad} px`), ''],
      ['Its edge', '--w-control, --text', A(`${bw} px`), A(rt(ctx, M.text, M.surface))],
      ['Its corners', '--r-card', A(g.radius['r-card'] === '0px' || g.radius['r-card'] === '0' ? 'square' : g.radius['r-card']), ''],
      ['Its lift', '--shadow-float', A(shadow === 'none' ? 'none' : 'shadow'), ''],
      ['The question', `--fs-title-s, ${tt.size} / ${tt.line}`, A(`weight ${tt.weight}`), A(rt(ctx, M.text, M.surface))],
      ['What happens', `--fs-body, ${bt.size} / ${bt.line}`, '--text-soft', A(rt(ctx, M['text-soft'], M.surface))],
      ['Two answers', 'gap', A(`${gap} px`), ''],
    ];
    const T = table(ctx, ty, cols, rows, { rowH: 22 });
    const inner = `${plateTxt(ctx, 'Dialog', `${Word(4)} parts`, 'a question, what happens next, and two buttons. Nothing else.', false)}
${label(49, 264, 'At true size, on its scrim')}${pan}${T.html}
${note(49, T.y + 16, 578, `Markup carries ${val('role="dialog"')}, ${val('aria-modal')} and ${val('aria-labelledby')}. A native ${val('dialog')} element takes the same ${val('--scrim')} for its backdrop.`)}`;
    return kitSheet(ctx, 'dialog', { hp: 232, hit: HIT(4, false) }, inner);
  },

  // Table: the shipped table at true size with its three row states forced, then a ledger of what each one does.
  table(ctx) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), ui = ctx.ui, rowsN = S.deliveries.length;
    const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height'), bw = tokPx(ctx, 'width', 'w-control');
    const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
    const heads = [S.deliverToLabel, 'When', 'Status', S.paidLabel];
    const sortBtn = (t, up) => `<button type="button">${A(t)}${up ? ui.icon('arrow-up', 14) : ''}</button>`;
    const body = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td class="ui-num" style="white-space:nowrap">${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
    const tbl = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], true)}</th><th scope="col">${A(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${body}</tbody></table>`;
    const ph = thH + rowsN * (tdH + 1) + 8;
    const pan = `<div class="ui u1-pan" style="left:49px;top:288px;width:578px;height:${ph}px">${tbl}</div>`;
    const ty = 288 + ph + 48;
    const cols = [{ x: 49, w: 120, head: 'State', cls: 'c-note u1-b' }, { x: 177, w: 330, head: 'What the table does' }, { x: 507, w: 120, head: 'Set in', right: true, cls: 'c-value' }];
    const rows = [
      ['Sorted', `The header is a button. Its arrow shows the way the rows run.`, 'aria-sort'],
      ['Selected', `A ${val(bar + ' px')} bar in the action colour, on the raised ground.`, '--raised'],
      ['Under a pointer', 'The raised ground, and only where a pointer exists.', '--raised'],
      ['Figures', 'Set right, in tabular figures, so a column adds up by eye.', 'is-num'],
      ['Rows', `${tdH} px tall, with a hairline between them.`, '--divider'],
      ['The header', `${thH} px tall, ruled with ${bw} px in the text colour.`, '--w-control'],
    ].map(([a, b, c]) => [a, b, A(c)]);
    const T = table(ctx, ty, cols, rows, { rowH: 22 });
    const inner = `${plateTxt(ctx, 'Table', `${Word(rowsN)} rows`, 'from the product\'s own list, each with its status in words.', true)}
${label(49, 264, 'At true size on the light surface')}${pan}${T.html}
${note(49, T.y + 16, 578, `Status is a word in a chip, never a colour alone. The first row is selected and the third is held in its hover state with ${val('is-hover')}.`)}`;
    return kitSheet(ctx, 'table', { hp: 232, hit: HIT(rowsN, true) }, inner);
  },

  // Empty states: what the product says when a list has nothing in it, and the same list while it waits for its rows.
  empty(ctx) {
    const S = sc(ctx), E = S.empty, ui = ctx.ui, hd = uiT(ctx, 'headline');
    const empty = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const sk = (a, b) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="u3-skr">${ui.skeleton(a)}${ui.skeleton(b)}</div></div></li>`;
    const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
    const p1 = `<div class="ui u1-pan" style="left:49px;top:372px;width:578px"><div class="u3-pad">${empty}</div></div>`;
    const p2 = `<div class="ui u1-pan" style="left:49px;top:752px;width:322px"><div class="u3-pad" style="padding:8px 24px">${loading}</div></div>`;
    const inner = `${plateTxt(ctx, 'Empty states', `${Word(2)} states`, 'what is missing, and the same list while its rows are on the way.', false)}
${label(49, 348, 'Empty')}${p1}
${label(49, 728, 'Loading')}${p2}
${note(403, 752, 224, `The title is ${val('--fs-headline')}, ${val(hd.size + ' / ' + hd.line)}. It sits on ${val('--raised')} with no edge, so it never reads as a card.`)}
${note(403, 836, 224, `A loading list draws the rows it is waiting for, in ${val('--sunken')}, and never a spinner on its own.`)}`;
    return kitSheet(ctx, 'empty', { hp: 232, hit: HIT(2, false) }, inner);
  },

  // Product screen, light: the product's list screen in one column at true size.
  'screen-light'(ctx) {
    const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui;
    const form = `<div class="u3-form">${ui.field({ id: 'u3-f1', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
    const scr = `<div class="u3-scr">${topbar(ctx, 0)}<div class="u3-main"><div>${ui.crumbs(X.crumbs)}<h2 class="ui-display u3-h" style="margin-top:8px">${A(title(ctx))}</h2></div>${ui.tabs(X.tabs, 0)}${ui.deliveryRows(3)}${ui.card({ title: F.title, raised: true, action: form })}</div></div>`;
    const n = kitClasses(scr).size;
    const pan = `<div class="ui u1-pan" style="left:49px;top:288px;width:578px;height:690px">${scr}</div>`;
    const inner = `${plateTxt(ctx, 'Product screen, light', `${Word(n)} kit classes`, 'and nothing drawn for the page: the screen is built from the components.', true)}
${label(49, 264, `${A(ctx.brand.ui.screen.title)}, in daylight`)}${pan}`;
    return kitSheet(ctx, 'screen-light', { hp: 232, hit: HIT(n, true) }, inner);
  },

  // Product screen, dark: the live screen at night, the same markup under data-theme="dark".
  'screen-dark'(ctx) {
    const S = sc(ctx), ui = ctx.ui, L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const changed = Object.keys(L).filter((k) => L[k] !== D[k]).length;
    const scr = `<div class="u3-scr">${topbar(ctx, 0)}<div class="u3-main" style="gap:28px">${liveTop(ctx)}<div class="u3-two"><div class="u3-col">${ui.alert('warning', S.alert)}</div><div class="u3-col">${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div></div></div></div>`;
    const pan = `<div class="ui u1-pan" data-theme="dark" style="left:49px;top:288px;width:578px;height:560px">${scr}</div>`;
    const inner = `${plateTxt(ctx, 'Product screen, dark', `${Word(changed)} roles change`, 'between light and dark. No component changes with them.', false)}
${label(49, 264, 'The live screen, after dark')}${pan}
${note(49, 868, 330, `The live line is ${val('--fs-headline')}, the largest type in the kit. The status word above it says where things stand, in words.`)}
${note(403, 868, 224, `The same markup under ${val('data-theme="dark"')}. Only the token values change.`)}`;
    return kitSheet(ctx, 'screen-dark', { hp: 232, hit: HIT(changed, false) }, inner);
  },

  // Product screen, mobile: the phone at true width, taped over the plate's edge, with the parts of the screen named level with where they sit.
  'screen-mobile'(ctx) {
    const S = sc(ctx), X = ex(ctx), ui = ctx.ui;
    const PH = { w: 390, h: 700, status: 44, bar: 56, tab: 64, top: 204 };
    // a place is named once: the account tab is left off when a link already carries its label
    const tabs = [...X.links.slice(0, 3), [X.account, 'user']].filter(([t], k, a) => a.findIndex(([u]) => u === t) === k);
    const phHtml = `<div class="u3-sb" style="height:${PH.status}px">${A(S.time)}</div>
<div class="u3-pbar" style="height:${PH.bar}px">${wordmark(ctx)}<span class="ui-avatar">${A(S.initials)}</span></div>
<div class="u3-pbody">${liveTop(ctx)}<div class="u3-pin">${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div></div>
<nav class="ui-tabbar" aria-label="Sections">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const n = pressables(phHtml), btnH = shippedPx(ctx, '.ui-btn', 'height');
    const phone = `<div class="ui u1-pan u3-ph" data-theme="dark" style="left:49px;top:${PH.top}px;width:${PH.w}px;height:${PH.h}px;z-index:4">${phHtml}</div>`;
    const cx = 459, cw = 168, y0 = PH.top;
    const mark = (y, name, text) => `${hair(y, cx, cw)}${label(cx, y + 8, name)}${note(cx, y + 28, cw, text)}`;
    const side = mark(y0 + PH.status, 'The bar', `The brand's name and the account, ${PH.bar} px deep.`)
      + mark(y0 + PH.status + PH.bar + 20, 'The live line', `A status word, then the line in ${val('--fs-headline')}, ${val(uiT(ctx, 'headline').size + ' / ' + uiT(ctx, 'headline').line)}: the largest type in the kit.`)
      + mark(y0 + PH.h - PH.tab - 20 - btnH, 'One action', `${val(btnH + ' px')} tall, full width.`)
      + mark(y0 + PH.h - PH.tab, 'The tab bar', `${Word(tabs.length)} places, ${PH.tab} px deep, the current one marked.`);
    const inner = `${plateTxt(ctx, 'Product screen, mobile', `${Word(n)} things to press`, 'in one column, from the top bar down to the tab bar.', false)}
${phone}${side}`;
    return kitSheet(ctx, 'screen-mobile', { hp: 232, hit: HIT(n, false) }, inner);
  },

  // Tokens: every role, space, radius and line the code package writes on :root, with the dark value of each colour beside its light one.
  tokens(ctx) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const keys = Object.keys(L), per = Math.ceil(keys.length / 2), rowH = 17;
    const nTok = keys.length + ctx.colours.length + ['space', 'radius', 'width', 'font', 'text', 'shadow'].reduce((a, k) => a + Object.keys(g[k]).length, 0);
    let out = '';
    [0, 1].forEach((c) => {
      const x0 = c ? 345 : 49, ks = keys.slice(c * per, (c + 1) * per);
      out += `<p class="a c-label nw" style="left:${x0 + 34}px;top:264px">${c ? 'Token' : 'Colour token'}</p><p class="a c-label nw" style="left:${x0 + 168}px;top:264px">Light</p><p class="a c-label nw" style="left:${x0 + 230}px;top:264px">Dark</p>${hair(284, x0, 282)}`;
      ks.forEach((k, i) => {
        const y = 292 + i * rowH;
        out += swatch(ctx, x0, y + 3, L[k], 11) + swatch(ctx, x0 + 15, y + 3, D[k], 11)
          + `<p class="a c-value nw" style="left:${x0 + 34}px;top:${y}px">--${A(k)}</p><p class="a c-value nw" style="left:${x0 + 168}px;top:${y}px">${A(L[k])}</p><p class="a c-value nw" style="left:${x0 + 230}px;top:${y}px">${A(D[k])}</p>`;
      });
    });
    let y = 292 + per * rowH + 28;
    const grp = (x, w, head, list) => `<p class="a c-label nw" style="left:${x}px;top:${y}px">${A(head)}</p>${hair(y + 20, x, w)}` + list.map(([k, v], i) => `<p class="a c-value nw" style="left:${x}px;top:${y + 26 + i * 17}px">${A(k)}</p><p class="a c-value nw" style="right:${W - x - w}px;top:${y + 26 + i * 17}px">${A(v)}</p>`).join('');
    const sp = Object.entries(g.space).map(([k, v]) => ['--' + k, v]), rd = Object.entries(g.radius).map(([k, v]) => ['--' + k, v]);
    const ln = [...Object.entries(g.width).map(([k, v]) => ['--' + k, v]), ...Object.entries(g.shadow).map(([k, v]) => ['--' + k, v === 'none' ? 'none' : 'set'])];
    const ty = ctx.uiType.map((t) => [t.token, `${t.size} / ${t.line}`]);
    out += grp(49, 115, 'Space', sp) + grp(180, 120, 'Radius', rd) + grp(320, 155, 'Lines', ln) + grp(497, 130, 'Type, size / line', ty);
    const rows = Math.max(sp.length, rd.length, ln.length, ty.length);
    y += 26 + rows * 17 + 28;
    const ff = Object.entries(g.font);
    out += `<p class="a c-label nw" style="left:49px;top:${y}px">Fonts</p>${hair(y + 20, 49, 278)}` + ff.map(([k, v], i) => `<p class="a c-value nw" style="left:49px;top:${y + 26 + i * 17}px">--${A(k)}</p><p class="a c-note nw" style="left:149px;top:${y + 25 + i * 17}px">${A(v.split(',')[0].replace(/['"]/g, ''))}</p>`).join('');
    out += `<p class="a c-label nw" style="left:345px;top:${y}px">Palette</p>${hair(y + 20, 345, 282)}` + ctx.colours.map((c, i) => `${swatch(ctx, 345, y + 29 + i * 17, c.hex, 11)}<p class="a c-value nw" style="left:365px;top:${y + 26 + i * 17}px">--palette-${A(c.id)}</p><p class="a c-value nw" style="right:${W - 627}px;top:${y + 26 + i * 17}px">${A(c.hex)}</p>`).join('');
    const inner = `${plateTxt(ctx, 'Token reference', `${Word(nTok)} tokens`, `written in tokens.css, read from the package. Each colour is shown in light, then dark.`, false)}${out}`;
    return kitSheet(ctx, 'tokens', { hp: 232, hit: HIT(nTok, false) }, inner);
  },

  // Code: how to use the package, and the shipped tokens.css and tailwind.css as they are written.
  code(ctx) {
    const F = sc(ctx).form;
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book}\n  </button>\n</body>`;
    const want = ['surface', 'text', 'action', 'action-label'], blocks = tokensCss(ctx).split('\n');
    const block = (open) => {
      const i = blocks.indexOf(open), out = [open];
      for (let j = i + 1; j < blocks.length && blocks[j] !== '}'; j++) if (want.some((w) => blocks[j].startsWith(`  --${w}:`))) out.push(blocks[j]);
      if (i < 0 || out.length !== want.length + 1) throw new Error(`riso u3: tokens.css has no ${open} block with ${want.join(', ')}`);
      return [...out, '}'].join('\n');
    };
    const cssCut = `${block(':root {')}\n${block('[data-theme="dark"] {')}`;
    const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
    if (ti < 0) throw new Error('riso u3: tailwind.css has no @theme inline block');
    const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
    const fams = [...new Set(ctx.faces.map((f) => f.family))];
    const files = [
      ['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in the W3C format.'],
      ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 theme block.'], ['components.css', 'Every component, built on the tokens.'],
      ['example.html', 'Every component live, light and dark.'], ['fonts.css', `Font rules for ${word(fams.length)} ${fams.length === 1 ? 'family' : 'families'}.`],
    ];
    const pre = (x, y, code) => `<pre class="u3-pre" style="left:${x}px;top:${y}px">${A(code)}</pre>`;
    const nIn = install.split('\n').length, nCss = cssCut.split('\n').length;
    let y = 264;
    let out = `${label(49, y, 'Install')}${hair(y + 20)}${pre(49, y + 28, install)}`;
    y += 28 + nIn * 16 + 32;
    out += `${label(49, y, 'Dark mode')}${hair(y + 20)}${pre(49, y + 28, '<html data-theme="dark">')}`;
    y += 28 + 16 + 32;
    out += `${label(49, y, 'From tokens.css')}${hair(y + 20, 49, 278)}${pre(49, y + 28, cssCut)}${label(345, y, 'From tailwind.css')}${hair(y + 20, 345, 282)}${pre(345, y + 28, twCut)}`;
    y += 28 + nCss * 16 + 32;
    const cols = [{ x: 49, w: 150, head: 'In the package', cls: 'c-value' }, { x: 217, w: 410, head: 'What it is' }];
    const T = table(ctx, y, cols, [...files.map(([a, b]) => [A(a), A(b)]), ['assets/', A(`The logo, ${iconSet(ctx).length} icons and the fonts.`)]], { rowH: 22 });
    const inner = `${plateTxt(ctx, 'The code package', `${Word(files.length)} files`, 'and an assets folder: the tokens, the components and an example page.', true)}${out}${T.html}`;
    return kitSheet(ctx, 'code', { hp: 232, hit: HIT(files.length, true) }, inner);
  },
};
