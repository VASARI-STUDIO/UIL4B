// Theme 23, Broadsheet, lane u3: the UI kit's screens and code (dialog, table, empty, the three screens, tokens, code).
// The kit is the paper's supplement. A screen is the product set as a full-page display ad or a front-page picture; the tokens are a stocks table;
// the code is set like a listings page. Components are drawn by ctx.ui at their true size inside an ad box (lane-u1-kit.js, read-only); the page is styled
// around them and never restyles them. Every value printed is read from ctx, engine/tokens.js or the CSS the code package ships.
import { esc } from '../../engine/brand.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss, tokensTs } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';
import { A, E, G, px, pad3, col, hr } from './helpers.js';
import { word, Word, mono, ratioText, kitPage, kitHead, adBox } from './lane-u1-kit.js';
import { css as screensCss, shell, desktop, bookingScreen, phone, classesIn, indexOf } from './lane-u3-screens.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const X = (ctx) => sc(ctx).example || {};
const step = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[0];

// ---- code, set as a listing: the line number in the condensed bold of the folio, the line in mono with a hanging indent when it wraps ----
function listing(lines, { start = 1, size = 'm', first = false } = {}) {
  return `<div class="u3-code u3-code--${size}">${lines.map((l, i) => `<div class="u3-l"><b>${first && i ? '' : start + i}</b><span>${l === '' ? '&#8203;' : esc(l)}</span></div>`).join('')}</div>`;
}
// a rule from components.css as the package ships it, one declaration a line, with the line it starts on in that file
function shippedRule(ctx, sel) {
  const css = componentsCss(ctx), lines = css.split('\n');
  const i = lines.findIndex((l) => l.startsWith(sel + ' {'));
  if (i < 0) return { lines: [], start: 1 };
  const body = lines[i].slice(sel.length + 2).replace(/\}\s*$/, '');
  return { lines: [`${sel} {`, ...body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => `  ${d};`), '}'], start: i + 1 };
}
// the appendix on a component page: the rules it is drawn by, as shipped. Each rule is one line in the file, so only its first line carries a number
function shippedBlock(ctx, x, y, w, sels, label) {
  const rules = sels.map((s) => shippedRule(ctx, s)).filter((r) => r.lines.length);
  const body = rules.map((r) => listing(r.lines, { start: r.start, size: 's', first: true })).join('<i class="u3-gap"></i>');
  return col(x, y, w, `<p class="c-label c-ink u3-lh">${A(label)}</p>${body}`, { rule: true });
}
// a margin note: a label, then a caption; values inside go through mono()
const note = (label, text) => `<div class="u3-note"><p class="c-label c-ink">${A(label)}</p><p class="c-cap c-quiet">${text}</p></div>`;

export function css(ctx) {
  if (ctx.kind !== 'uikit') return '';
  return `
/* lane u3: screens and code */
.pg .u3-note + .u3-note{margin-top:20px}
.pg .u3-note .c-label{padding-top:8px;border-top:1px solid var(--ink);margin-bottom:4px}
.pg .u3-lh{padding-bottom:8px;border-bottom:1px solid var(--ink);margin-bottom:8px}
.pg .u3-code{font:400 14px/20px 'Fragment Mono',monospace;color:var(--ink)}
.pg .u3-code--s{font-size:13px;line-height:20px}
.pg .u3-l{display:grid;grid-template-columns:32px minmax(0,1fr);column-gap:8px}
.pg .u3-l b{font:700 15px/20px 'Sofia Sans Condensed',sans-serif;font-variant-numeric:tabular-nums;color:var(--quiet);text-align:right}
.pg .u3-l span{white-space:pre-wrap;overflow-wrap:anywhere;padding-left:2ch;text-indent:-2ch}
.pg .u3-gap{display:block;height:20px}
.pg .u3-rule{display:block;height:1px;background:var(--ink);margin-bottom:12px}
.pg .u3-cap{font:400 17px/22px 'Sofia Sans',sans-serif;color:var(--quiet)}
.pg .u3-fill{position:absolute;left:0;top:0;right:0;bottom:0}
${screensCss(ctx)}
.pg .u3-ix{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;align-items:center;height:36px;border-bottom:.75px solid var(--hair)}
.pg .u3-ix:last-child{border-bottom:1px solid var(--ink)}
.pg .u3-ixc{display:flex;flex-direction:column;gap:4px}
.pg .u3-ixn{font:700 56px/60px 'Sofia Sans Condensed',sans-serif;font-variant-numeric:tabular-nums}
.pg .u3-vr{display:block;width:.75px;background:var(--hair)}
.pg .u3-tg{padding-top:20px}.pg .u3-tg:first-child{padding-top:0}
.pg .u3-tg .u1-sh{padding-bottom:6px;border-bottom:1px solid var(--ink)}
.pg .u3-tr{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;align-items:center;min-height:30px;border-bottom:.75px solid var(--hair)}
.pg .u3-tr--c,.pg .u3-tr--h{grid-template-columns:minmax(0,1fr) 120px 120px}
.pg .u3-tr--h{min-height:26px}
.pg .u3-tr--f{grid-template-columns:1fr;padding:4px 0}
.pg .u3-fv{font:400 15px/22px 'Fragment Mono',monospace;color:var(--quiet)}
.pg .u3-kv{display:flex;align-items:center;gap:8px}
.pg .u3-pair{display:grid;grid-template-columns:232px 232px;column-gap:24px}
.pg .u3-nt{display:flex;flex-direction:column;gap:2px;padding:8px 0;border-bottom:.75px solid var(--hair)}
.pg .u3-nt.last{border-bottom:1px solid var(--ink)}
.pg .u3-nv{display:flex;align-items:center;gap:6px}
.pg .u3-nv .u1-m + .u1-key{margin-left:8px}
.pg .u3-st{font-size:36px;line-height:40px;margin-top:4px}
.pg .u3-ch{font:700 22px/26px 'Sofia Sans Condensed',sans-serif;margin-bottom:6px}
.pg .u3-file + .u3-file{margin-top:12px}`;
}

export const uikit = {
  // ---- dialog: the stop-press box. The scrim and the dialog at true size across three columns; its parts noted in the fourth; the rules under it ----
  dialog: (ctx) => {
    const S = sc(ctx), D = S.dialog || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), t = step(ctx, 'title-s');
    const hd = kitHead(ctx, 'A dialog asks one question and waits for the answer.', { w: 744, max: 64, min: 48 });
    const y0 = hd.bottom + 56, h = 640;
    const dlg = ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep, danger: true }).replace(/dlg-t/g, 'u3-dlg');
    const ad = adBox(ctx, G.left, y0, 744, `<div class="ui-scrim u3-fill">${dlg}</div>`, { h, pad: 0 });
    const shadow = tokenGroups(ctx).shadow['shadow-float'];
    const notes = col(G.x[3], y0, G.col,
      note('The question', `Set in the display face at ${mono(`${t.size}/${t.line}`)}, ${mono('--fs-title-s')}.`)
      + note('What happens next', `${mono('--text-soft')}, ${mono(ratioText(ctx, M['text-soft'], M.surface))} on the surface.`)
      + note(D.keep, `The safe answer comes first, as the secondary button.`)
      + note(D.confirm, `The danger fill, ${mono('--danger')}. Its label reads ${mono(ratioText(ctx, M.surface, M.danger))}.`)
      + note('The ground', `${mono('--scrim')} ${mono(M.scrim)} behind, a ${mono(`${ctx.brand.ui.border}px`)} edge in ${mono('--text')}, ${shadow === 'none' ? 'no shadow' : `${mono('--shadow-float')}`}.`), { rule: true });
    const y1 = y0 + h + 48;
    const rules = [
      ['Two answers', 'The safe answer sits first. The answer that changes something carries the danger fill and says what it does.'],
      ['A way out', 'Esc and a press on the scrim close it, the same as the first button. Focus goes back to what opened it.'],
    ].map(([l, s], i) => col(G.x[i], y1, G.col, `<p class="c-label c-ink u3-lh">${A(l)}</p><p class="c-note c-ink">${A(s)}</p>`, { rule: i > 0 })).join('');
    const code = shippedBlock(ctx, G.x[2], y1, 488, ['.ui-scrim', '.ui-dialog'], 'As components.css ships it');
    return kitPage(ctx, 'dialog', hd.html + ad + notes + rules + code);
  },

  // ---- screen-light: the full-page display ad. The product's working screen at true size across the measure, then the index of the parts in it ----
  'screen-light': (ctx) => {
    // the ad takes the page from the folio rule down: the brand's line as its headline, the product's sentence as its deck, the working screen at true
    // size as its picture, and the signature (the logo and the one button) at its foot. Under it, the paper's own credit line and the index of parts.
    const B = ctx.brand, S = sc(ctx), L = ctx.logo, inner = desktop(ctx), sh = 660, fw = 1000 - 2 - 2 * 48 - 2 * ctx.brand.ui.border;
    const lw = Math.min(L.geos.colour.w * 48 / L.geos.colour.h, 240);
    const adInner = `<div class="u3-ad">`
      + `<p class="ui-display u3-adh">${A(B.lines.primary)}</p><p class="u3-add">${A(B.product)}</p>`
      + `<div class="u3-frame" style="height:${sh}px">${shell(ctx, inner)}</div>`
      + `<div class="u3-sig"><span class="u3-logo" style="width:${px(lw)}">${L.html('colour', { width: lw, label: 'Logo' })}</span>${ctx.ui.btn(S.form.book, { size: 'lg', iconRight: 'arrow-right' })}</div></div>`;
    const ad = adBox(ctx, G.left, G.top, 1000, adInner, { pad: 48, h: 1196 });
    const idx = indexOf(ctx, classesIn(inner)), y1 = G.top + 1196 + 12;
    const cap = E(G.left, y1, 'u3-cap', `The screen is drawn at full size, ${mono(`${fw} px`)} wide, by components.css on the light tokens. Its parts, and the page each is set out on:`, { w: 1000 });
    return kitPage(ctx, 'screen-light', ad + cap + idxBlock(ctx, idx, y1 + 44));
  },

  // ---- table: the market report. The list as a table across the measure, its four states noted under it, then the markup and the CSS it ships ----
  table: (ctx) => {
    const S = sc(ctx), ui = ctx.ui, css = componentsCss(ctx);
    const heads = ['Item', 'When', 'Status', 'Price'];
    // sorted for real, A to Z on the first column, since its header says so
    const rows = [...S.deliveries].sort((a, b) => a.to.localeCompare(b.to, 'en-AU'));
    const bar = (/tr\[aria-selected="true"\] \{[^}]*inset (\d+(?:\.\d+)?)px/.exec(css) || [])[1];
    const sortBtn = (t, dir) => `<button type="button">${A(t)}${dir ? ui.icon('arrow-up', 14) : ''}</button>`;
    const tr = (d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`;
    const table = `<table class="ui-table"><colgroup><col style="width:31%"><col style="width:33%"><col style="width:21%"><col style="width:15%"></colgroup><thead><tr>`
      + `<th scope="col" aria-sort="ascending">${sortBtn(heads[0], 'asc')}</th><th scope="col">${sortBtn(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th>`
      + `</tr></thead><tbody>${rows.map(tr).join('')}</tbody></table>`;
    const hd = kitHead(ctx, 'A table sorts, chooses one row and keeps its figures in line.', { w: 1000, max: 64, min: 48 });
    const y0 = hd.bottom + 56, h = 44 + rows.length * 52 + 2 * 32 + 2 + 54;
    const ad = adBox(ctx, G.left, y0, 1000, `<div class="u3-head" style="margin-bottom:16px"><h2 class="ui-display u3-t">${A(ctx.brand.ui.screen.title)}</h2></div>${table}`, { h, pad: 32 });
    const y1 = y0 + h + 32;
    const notes = [
      ['Sorted', `The sorted header is a button that shows its direction: ${A(heads[0])}, A to Z, with ${mono('aria-sort')} set.`],
      ['Chosen', `The chosen row takes ${mono('--raised')} and a ${mono(`${bar || 3}px`)} bar of ${mono('--action')} on its left.`],
      ['Under the pointer', `On a device with a pointer, the row under it takes ${mono('--raised')} too, without the bar.`],
      ['Figures', `Prices sit right, in tabular figures, so the columns of numbers line up.`],
    ].map(([l, s], i) => col(G.x[i], y1, G.col, `<p class="c-label c-ink u3-lh">${A(l)}</p><p class="c-cap c-ink">${s}</p>`, { rule: i > 0 })).join('');
    // the chosen row's markup, as written, and the rules that draw it
    const d0 = rows[0], st = ctx.status.find((s) => s.id === d0.status);
    const chip = /<span class="([^"]+)">/.exec(ui.statusChip(d0.status))[1];
    const mk = ['<tr aria-selected="true">', `  <td>${d0.to}</td>`, `  <td>${d0.when}</td>`, `  <td><span class="${chip}">${st.label}</span></td>`, `  <td class="is-num">${d0.price}</td>`, '</tr>'];
    const y2 = y1 + 176;
    const markup = col(G.left, y2, 488, `<p class="c-label c-ink u3-lh">The chosen row, as written</p>${listing(mk, { size: 's' })}`);
    const code = shippedBlock(ctx, G.x[2], y2, 488, ['.ui-table td', '.ui-table .is-num', '.ui-table tbody tr[aria-selected="true"]'], 'As components.css ships it');
    return kitPage(ctx, 'table', hd.html + ad + notes + markup + code);
  },

  // ---- empty: space to let. A tall ad across three columns holds the list with nothing in it; the rules and the two other states run down the first ----
  empty: (ctx) => {
    const S = sc(ctx), Em = S.empty || {}, ui = ctx.ui, X = sc(ctx).example || {};
    const hd = kitHead(ctx, 'An empty list says what is missing and how to fill it.', { w: 1000, max: 64, min: 48 });
    const y0 = hd.bottom + 56, h = 720, x = G.x[1], w = G.span(1, 3);
    const inner = `<div class="u3-body" style="padding:0"><h2 class="ui-display u3-t">${A(ctx.brand.ui.screen.title)}</h2>${X.tabs ? ui.tabs(X.tabs, 0) : ''}`
      + `<div class="ui-empty"><h3 class="ui-empty__title">${A(Em.title)}</h3><p class="ui-empty__text">${A(Em.body)}</p>${ui.btn(Em.cta)}</div></div>`;
    const ad = adBox(ctx, x, y0, w, inner, { h, pad: 40 });
    const rules = [
      ['Say what is missing', 'The title names what is not there yet, in the product’s own words.'],
      ['Offer the fix', 'One button, and it is the action that fills the list.'],
      ['No edge', `It sits on ${mono('--raised')} with no edge, so it does not read as a card.`],
    ].map(([l, s]) => `<p class="c-label c-ink u3-lh">${A(l)}</p><p class="c-cap c-ink" style="margin-bottom:24px">${s}</p>`).join('');
    const left = col(G.left, y0, G.col, rules);
    // the two other states of a list, small, at the foot of the first column
    const ly = y0 + h - 360;
    const loading = E(G.left, ly, 'c-label c-ink', 'While it loads') + adBox(ctx, G.left, ly + 30, G.col, `<div class="u3-checks">${ui.skeleton('80%')}${ui.skeleton('55%')}${ui.skeleton('70%')}</div><div style="margin-top:20px">${ui.spinner()}</div>`, { h: 150, pad: 20 });
    const notice = S.alert ? E(G.left, ly + 204, 'c-label c-ink', 'A notice, in place') + adBox(ctx, G.left, ly + 234, G.col, ui.alert('warning', S.alert), { h: 126, pad: 12 }) : '';
    const code = shippedBlock(ctx, x, y0 + h + 40, w, ['.ui-empty', '.ui-empty__text'], 'As components.css ships it');
    return kitPage(ctx, 'empty', hd.html + ad + left + loading + notice + code);
  },

  // ---- screen-dark: the front-page picture. The order form on the dark ground across three columns, captioned; what changes at night in the fourth ----
  'screen-dark': (ctx) => {
    const Lt = colourMap(ctx, 'light'), Dk = colourMap(ctx, 'dark'), w = G.span(0, 2), inner = bookingScreen(ctx);
    const hd = kitHead(ctx, 'The same parts, after dark.', { w: 744, max: 64, min: 48 });
    const y0 = hd.bottom + 56, h = G.floor - y0 - 72;
    const ad = adBox(ctx, G.left, y0, w, shell(ctx, inner), { h, pad: 0, dark: true });
    const fw = w - 2;
    const cap = E(G.left, y0 + h + 12, 'u3-cap', `The order form on the dark tokens, drawn at full size, ${mono(`${fw} px`)} wide. Nothing is redrawn for the night: the names stay and the values change.`, { w });
    const toks = ['surface', 'raised', 'sunken', 'text', 'text-soft', 'quiet', 'edge', 'divider', 'action', 'action-label', 'focus', 'scrim'];
    const key = (c) => `<i class="u1-key" style="background:${c}"></i>`;
    const rows = toks.map((t, i) => `<div class="u3-nt${i === toks.length - 1 ? ' last' : ''}"><span class="u1-m c-ink">--${t}</span><span class="u3-nv">${key(Lt[t])}<span class="u1-m c-quiet">${Lt[t].toUpperCase()}</span>${key(Dk[t])}<span class="u1-m c-ink">${Dk[t].toUpperCase()}</span></span></div>`).join('');
    const side = col(G.x[3], y0, G.col, `<p class="c-label c-ink u3-lh">What changes at night</p><p class="c-cap c-quiet" style="margin-bottom:12px">Light, then dark.</p>${rows}`, { rule: true });
    return kitPage(ctx, 'screen-dark', hd.html + ad + cap + side);
  },

  // ---- screen-mobile: one column of the paper is a phone's width. The phone at true size on the right; down the left, each state as the list says it ----
  'screen-mobile': (ctx) => {
    const S = sc(ctx), W = 390, H = 844, css = componentsCss(ctx);
    const hd = kitHead(ctx, 'One column, held in one hand.', { w: 488, max: 64, min: 48, maxLines: 3 });
    const px0 = G.right - W, ad = adBox(ctx, px0, G.top + 8, W, shell(ctx, phone(ctx), 'u3-ph'), { h: H, pad: 0 });
    // one row a state, from the list: the status in the chrome's label face, the line the list gives it in the brand's display face
    const states = ctx.status.map((s) => [s, S.deliveries.find((d) => d.status === s.id)]).filter(([, d]) => d);
    const y0 = hd.bottom + 64, pitch = Math.min(200, Math.floor((G.floor - y0) / states.length));
    const ladder = states.map(([s, d], i) => E(G.left, y0 + i * pitch, '', `<i class="u3-rule"></i><p class="c-folio c-ink">${A(s.label)}</p><p class="b-head u3-st">${A(d.when)}</p>`, { w: 488 })).join('');
    const tabH = (/\.ui-tabbar \{[^}]*height: (\d+)px/.exec(css) || [])[1];
    const ny = G.top + 8 + H + 32;
    const notes = col(G.x[2], ny, G.col, note('The frame', `${mono(`${W} px`)} by ${mono(`${H} px`)}, drawn at full size.`))
      + col(G.x[3], ny, G.col, note('The tab bar', `Four places, an icon over each name${tabH ? `, ${mono(`${tabH}px`)} tall` : ''}, on the floor of the screen.`), { rule: true });
    return kitPage(ctx, 'screen-mobile', hd.html + E(G.left, y0 - 34, 'c-label c-ink', 'Each state, as the list says it') + ladder + ad + notes);
  },

  // ---- tokens: the stocks table. An index strip of the groups and their counts, then every token in agate, four columns of ruled listings ----
  tokens: (ctx) => {
    const g = tokenGroups(ctx), Lt = colourMap(ctx, 'light'), Dk = colourMap(ctx, 'dark');
    const pal = Object.fromEntries(ctx.colours.map((c) => [`palette-${c.id}`, c.hex]));
    const groups = [['Colour', Object.keys(Lt).length], ['Palette', Object.keys(pal).length], ['Space', Object.keys(g.space).length], ['Radius', Object.keys(g.radius).length],
      ['Width', Object.keys(g.width).length], ['Type', Object.keys(g.text).length], ['Font', Object.keys(g.font).length], ['Shadow', Object.keys(g.shadow).length]];
    const total = groups.reduce((a, [, n]) => a + n, 0);
    const hd = kitHead(ctx, `${Word(total)} tokens, light and dark.`, { w: 1000, max: 64, min: 48 });
    // the index strip: eight groups, eight cells, the count in the condensed bold of the folio at display size
    const y0 = hd.bottom + 40, cw = 1000 / groups.length;
    const strip = hr(G.left, y0, 1000, 3) + hr(G.left, y0 + 7, 1000, 1)
      + groups.map(([n, c], i) => E(G.left + i * cw, y0 + 20, 'u3-ixc', `<span class="u3-ixn c-ink">${c}</span><span class="c-folio c-ink">${A(n)}</span>`, { w: cw - 8 })
        + (i ? `<i class="a u3-vr" style="left:${px(G.left + i * cw - 6)};top:${px(y0 + 20)};height:80px"></i>` : '')).join('')
      + hr(G.left, y0 + 116, 1000, 1);
    const y1 = y0 + 152;
    const key = (c) => `<i class="u1-key" style="background:${c}"></i>`;
    const head = (t, cols) => `<div class="u3-tg"><p class="u1-sh c-ink">${A(t)}</p>${cols ? `<div class="u3-tr u3-tr--h c-folio c-quiet">${cols.map((c) => `<span>${A(c)}</span>`).join('')}</div>` : ''}</div>`;
    const two = (k, v) => `<div class="u3-tr"><span class="u1-m c-ink">--${A(k)}</span><span class="u1-m c-ink c-right">${A(v)}</span></div>`;
    const colour = head('Colour', ['Token', 'Light', 'Dark']) + Object.keys(Lt).map((k) => `<div class="u3-tr u3-tr--c"><span class="u1-m c-ink">--${A(k)}</span><span class="u3-kv">${key(Lt[k])}<span class="u1-m c-ink">${A(Lt[k].toUpperCase())}</span></span><span class="u3-kv">${key(Dk[k])}<span class="u1-m c-ink">${A(Dk[k].toUpperCase())}</span></span></div>`).join('');
    const block = (t, o) => head(t) + Object.entries(o).map(([k, v]) => two(k, v)).join('');
    const fonts = head('Font') + Object.entries(g.font).map(([k, v]) => `<div class="u3-tr u3-tr--f"><span class="u1-m c-ink">--${A(k)}</span><span class="u3-fv">${esc(v)}</span></div>`).join('');
    const palette = head('Palette') + Object.entries(pal).map(([k, v]) => `<div class="u3-tr u3-tr--f"><span class="u1-m c-ink">--${A(k)}</span><span class="u3-kv">${key(v)}<span class="u1-m c-ink">${A(v.toUpperCase())}</span></span></div>`).join('');
    const body = col(G.left, y1, 488, colour, { cls: 'u3-tt' })
      + col(G.x[2], y1, G.col, block('Space', g.space) + block('Radius', g.radius) + block('Width', g.width) + block('Shadow', g.shadow), { rule: true, cls: 'u3-tt' })
      + col(G.x[3], y1, G.col, block('Type', g.text), { rule: true, cls: 'u3-tt' });
    // fonts and palette hang from the floor of the third column's neighbour, under the type listing
    const tail = col(G.x[2], G.floor - 53 * Math.max(Object.keys(pal).length, 3) - 50, 488, `<div class="u3-pair"><div>${palette}</div><div>${fonts}</div></div>`, { cls: 'u3-tt' });
    return kitPage(ctx, 'tokens', hd.html + strip + body + tail);
  },

  // ---- code: the listings page. The three lines that install it as the feature, then each file in the package as a channel, its first lines numbered ----
  code: (ctx) => {
    const F = sc(ctx).form, B = ctx.brand;
    const hd = kitHead(ctx, 'Three stylesheets and a class on the body.', { w: 744, max: 64, min: 48 });
    const y0 = hd.bottom + 56;
    const start = ['<link rel="stylesheet" href="fonts.css">', '<link rel="stylesheet" href="tokens.css">', '<link rel="stylesheet" href="components.css">', '',
      '<body class="ui">', '  <button class="ui-btn" type="button">', `    ${F.book}`, '  </button>', '</body>'];
    const dark = ['<html data-theme="dark">'];
    const feature = col(G.left, y0, 488, `<p class="u3-ch c-ink">Start here</p><i class="u3-rule"></i>${listing(start)}`
      + `<p class="u3-ch c-ink" style="margin-top:32px">For the night</p><i class="u3-rule"></i>${listing(dark)}<p class="c-cap c-quiet" style="margin-top:12px">Without it, the page follows the system’s setting.</p>`);
    const cssL = tokensCss(ctx).split('\n');
    const toks = col(G.x[2], y0, 488, `<p class="u3-ch c-ink">tokens.css</p><i class="u3-rule"></i>${listing(cssL.slice(0, 14))}`, { rule: true });
    const y1 = y0 + 420;
    const tw = tailwindCss(ctx).split('\n'), twAt = tw.findIndex((l) => l.startsWith('@theme'));
    const ts = tokensTs(ctx).split('\n');
    const btn = shippedRule(ctx, '.ui-btn');
    const row2 = col(G.left, y1, 488, `<p class="u3-ch c-ink">components.css</p><i class="u3-rule"></i>${listing(btn.lines, { start: btn.start, size: 's', first: true })}`)
      + col(G.x[2], y1, 488, `<p class="u3-ch c-ink">tailwind.css</p><i class="u3-rule"></i>${listing(tw.slice(twAt, twAt + 7), { start: twAt + 1, size: 's' })}`
        + `<p class="u3-ch c-ink" style="margin-top:24px">tokens.ts</p><i class="u3-rule"></i>${listing(ts.slice(0, 5), { size: 's' })}`, { rule: true });
    // the package, as the guide at the foot of a listings page: the file, then what is in it
    const fams = [...new Set(ctx.faces.map((f) => f.family))].join(', ');
    const files = [
      ['tokens.css', 'Custom properties. Light on :root, dark on [data-theme="dark"] and the system setting.'],
      ['tokens.json', 'The same tokens in the W3C design token format, with a dark value on each colour.'],
      ['tokens.ts', 'A typed export of the same values.'],
      ['tailwind.css', 'A Tailwind CSS v4 @theme block mapped to the tokens.'],
      ['components.css', 'Classes for every component in this kit, built only on the tokens.'],
      ['example.html', 'Every component live, with a light and dark switch.'],
      ['fonts.css', `@font-face rules for ${fams}.`],
      ['assets', `The logo, ${iconSet(ctx).length} icons and the font files.`],
    ];
    const per = 2, gy = G.floor - 2 * 92;
    const guide = [0, 1, 2, 3].map((c) => col(G.x[c], gy, G.col, `<i class="u3-rule"></i>${files.slice(c * per, c * per + per).map(([n, d]) => `<div class="u3-file"><p class="u1-m c-ink">${A(n)}</p><p class="c-cap c-quiet">${A(d)}</p></div>`).join('')}`, { rule: c > 0 })).join('');
    return kitPage(ctx, 'code', hd.html + feature + toks + row2 + E(G.left, gy - 34, 'c-label c-ink', `In the package, ${word(files.length)} entries`) + guide);
  },
};

// the index of the parts in a screen, as a newspaper's index box: the class in mono, then the page that documents it
function idxBlock(ctx, idx, y) {
  const per = Math.ceil(idx.length / 4);
  return [0, 1, 2, 3].map((c) => {
    const part = idx.slice(c * per, c * per + per);
    if (!part.length) return '';
    return col(G.x[c], y, G.col, `<i class="u3-rule"></i>${part.map(([cls, no]) => `<div class="u3-ix"><span class="u1-m c-ink">${A(cls)}</span><b class="c-folio-no c-ink">${no ? pad3(no) : ''}</b></div>`).join('')}`, { rule: c > 0 });
  }).join('');
}
