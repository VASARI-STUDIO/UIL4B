// Theme 23, Broadsheet, lane u2: the UI kit's components (states, buttons, inputs, choices, cards, navigation, lists, status, feedback).
// Each page is another part of the paper: the programme guide, the classifieds, the clip-out coupon, the reader ballot, the property pages,
// the section strip, the notices column, the weather key and the stop-press box. The components are the product, set into the columns as display ads
// (u1's ad box, on the brand's own surface); the documentation is the ruled columns around them. Components are never restyled.
// Chrome comes read-only from lane-u1-kit.js; u1's css() already writes the kit tokens, the .pg-nested componentsCss and the ad box.
import { A, E, G, col, hr } from './helpers.js';
import { colourMap } from '../../engine/tokens.js';
import { Word, word, mono, ratioText, kitPage, kitHead, adBox } from './lane-u1-kit.js';
import { more, moreCss } from './lane-u2-more.js';
import { sc, tok, ad, spOf, typeOf, notes } from './lane-u2-kit.js';

export function css() {
  return `
/* lane u2: components */
.pg .u2-guide{position:absolute;display:flex;flex-direction:column;gap:24px}
.pg .u2-gr{flex:1 1 0;display:grid;grid-template-columns:232px 744px;column-gap:24px;min-height:0}
.pg .u2-gn{border-top:1px solid var(--ink);padding-top:8px}
.pg .u2-gn p+p{margin-top:6px}
.pg .u2-ga{display:grid;grid-template-columns:148px 148px minmax(0,1fr) minmax(0,1fr);column-gap:16px;align-items:center}
.pg .u2-stack{display:flex;flex-direction:column;align-items:flex-start}
.pg .u2-center{display:grid;place-items:center}
.pg .u2-run{font:400 17px/22px 'Sofia Sans',sans-serif;color:var(--ink)}
.pg .u2-run b{font:700 20px/22px 'Sofia Sans Condensed',sans-serif}
.pg .u2-cl+.u2-cl{margin-top:40px}
.pg .u2-cl > .u1-ad{margin:12px 0 8px}
.pg .u2-sr{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:12px;align-items:baseline;padding:8px 0;border-bottom:.75px solid var(--hair)}
.pg .u2-sr:last-child{border-bottom:1px solid var(--ink)}
.pg .u2-sl{border-top:1px solid var(--ink);margin-top:12px}
${moreCss()}`;
}

export const uikit = {
  // ---- 009: the programme guide. The six states run down the page like the evening's timeslots; each is a band of the product in that state,
  // with the parts across it as the channels, and the note on what changes in the margin column ----
  states: (ctx) => {
    const S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), bw = ctx.brand.ui.border, fw = ctx.borders[2].px;
    const hd = kitHead(ctx, 'Six states, and what each one changes.', { max: 64, min: 48 });
    const y0 = hd.bottom + 64, cx = G.x[1] + 24, cw = [148, 148, 176, 176];
    const heads = ['Primary', 'Secondary', 'Field', 'Checkbox and switch'];
    let hx = cx, head = '';
    heads.forEach((h, i) => { head += E(hx, y0, 'c-folio c-quiet', A(h), { w: cw[i] }); hx += cw[i] + 16; });
    head += E(G.left, y0, 'c-folio c-quiet', 'State');
    const b = (st) => ui.btn(F.book, { state: st });
    const b2 = (st) => (X.secondary ? ui.btn(X.secondary, { variant: 'secondary', state: st }) : '');
    const fld = (k, o = {}) => ui.field({ id: `u2-st-${k}`, label: F.ready, value: F.readyValue, ...o });
    const ch = (o = {}) => `<div class="u2-stack">${ui.check((X.checks || [])[2] || F.notes, o)}${ui.switch((X.switches || [])[1] || F.notes, { ...o, checked: true })}</div>`;
    const r = (a, b_) => ratioText(ctx, M[a], M[b_]);
    const rows = [
      ['Rest', `${tok('action')} fill; fields and boxes take a ${bw} px ${tok('edge')}.`, `${mono(M.action)} label ${r('action-label', 'action')}`, [b(), b2(), fld('r'), ch()]],
      ['Hover', `The fill steps to ${tok('action-hover')}. Outlined buttons take ${tok('sunken')}.`, `${mono(M['action-hover'])} label ${r('action-label', 'action-hover')}`, [b('hover'), b2('hover'), '', '']],
      ['Focus', `A ${fw} px ring in ${tok('focus')}, set ${fw} px off the edge. A field's edge turns ${tok('text')}.`, `${mono(M.focus)} on surface ${r('focus', 'surface')}`, [b('focus'), b2('focus'), fld('f', { state: 'focus' }), ch({ state: 'focus' })]],
      ['Pressed', `${tok('action-pressed')}, and the button sets down to 0.97 of its size.`, `${mono(M['action-pressed'])} label ${r('action-label', 'action-pressed')}`, [b('pressed'), b2('pressed'), '', '']],
      ['Disabled', `${tok('disabled-bg')} ground and ${tok('disabled-text')} type. Nothing answers the pointer.`, `${mono(M['disabled-bg'])} type ${r('disabled-text', 'disabled-bg')}`, [b('disabled'), b2('disabled'), fld('d', { disabled: true }), ch({ disabled: true })]],
      ['Error', `The edge turns ${tok('danger')} and the message under the field says what to enter.`, `${mono(M.danger)} on surface ${r('danger', 'surface')}`, ['', '', fld('e', { error: F.readyError }), '']],
    ];
    const band = rows.map(([n, t, v, cells]) => `<div class="u2-gr"><div class="u2-gn"><p class="u1-sh c-ink">${A(n)}</p><p class="c-cap c-ink">${t}</p><p class="c-cap c-quiet">${v}</p></div>`
      + ad(cells.map((c) => `<div>${c}</div>`).join(''), { pad: 24, cls: 'u2-ga' }) + '</div>').join('');
    const y1 = y0 + 40;
    const guide = `<div class="u2-guide" style="left:${G.left}px;top:${y1}px;width:1000px;height:${G.floor - y1}px">${band}</div>`;
    return kitPage(ctx, 'states', hd.html + head + guide);
  },

  // ---- 010: the classifieds. One display ad across three columns holds the button at three times its size, with its spec in the fourth;
  // below, the small ads run in four ruled columns, a run-in head, the button at its true size, and the class that draws it ----
  buttons: (ctx) => {
    const S = sc(ctx), F = S.form, X = S.example || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), bw = ctx.brand.ui.border, Z = 4;
    const hd = kitHead(ctx, 'Four kinds of button, in three heights.', { max: 64, min: 48 });
    const y0 = hd.bottom + 56, bigH = 480;
    const big = adBox(ctx, G.left, y0, 744, `<div style="zoom:${Z}">${ui.btn(F.book)}</div>`, { h: bigH, pad: 0, cls: 'u2-center' });
    const ctl = typeOf(ctx, 'control'), lab = typeOf(ctx, 'label');
    const spec = [
      ['Height', '44px'], ['--sp-5', `${spOf(ctx, 5, 20)}px`], ['--r-button', `${ctx.radius.button}px`], ['--fs-control', `${ctl.size}px`], ['--fw-control', `${ctl.weight}`],
      ['--action', M.action], ['--action-label', M['action-label']], ['Label on fill', ratioText(ctx, M['action-label'], M.action)],
    ];
    const specCol = col(G.x[3], y0, G.col, `<p class="u1-sh c-ink">The primary button, ${word(Z)} times its size</p><div class="u2-sl">${spec.map(([k, v]) => `<div class="u2-sr">${k.startsWith('--') ? mono(k) : `<span class="c-cap c-quiet">${A(k)}</span>`}${mono(v)}</div>`).join('')}</div>`, { rule: true });
    const entry = (name, text, html, cls) => `<div class="u2-cl"><p class="u2-run"><b>${A(name)}.</b> ${text}</p>${ad(html, { pad: 20 })}<p class="c-cap c-quiet">${mono(cls)}</p></div>`;
    const ent = [
      entry('Primary', `${tok('action')} fill with an ${tok('action-label')} label, at ${ratioText(ctx, M['action-label'], M.action)}.`, ui.btn(F.book), '.ui-btn'),
      entry('Secondary', `${tok('surface')} ground, ${tok('text')} type and a ${bw} px ${tok('text')} edge.`, X.secondary ? ui.btn(X.secondary, { variant: 'secondary' }) : '', '.ui-btn--secondary'),
      entry('Quiet', 'No fill and no edge. The label is underlined.', ui.btn(X.quiet, { variant: 'quiet' }), '.ui-btn--quiet'),
      entry('Danger', `${tok('danger')} fill with a ${tok('surface')} label, at ${ratioText(ctx, M.surface, M.danger)}.`, ui.btn(X.danger, { variant: 'danger' }), '.ui-btn--danger'),
      entry('Small', `36 px high, the label at ${tok('fs-label')}, ${lab.size} px.`, ui.btn(X.small, { size: 'sm' }), '.ui-btn--sm'),
      entry('Large', `52 px high, with ${tok('sp-6')} of ${spOf(ctx, 6, 24)} px each side.`, ui.btn(F.book, { size: 'lg' }), '.ui-btn--lg'),
      entry('With an icon', `An 18 px icon in the label's colour, ${tok('sp-2')} from the words.`, ui.btn(X.small, { iconLeft: 'plus' }), '.ui-btn'),
      entry('Disabled', 'The reason sits beside it, in words.', `<div class="u2-stack" style="gap:12px">${ui.btn(F.book, { disabled: true })}<p class="ui-inline-msg">${ui.icon('info', 16)}${A(F.bookWhy)}</p></div>`, '[disabled]'),
    ];
    const y1 = y0 + bigH + 64;
    const cols = [0, 1, 2, 3].map((i) => col(G.x[i], y1, G.col, ent[i * 2] + ent[i * 2 + 1], { rule: i > 0 })).join('');
    return kitPage(ctx, 'buttons', hd.html + big + specCol + hr(G.left, y1 - 24, 1000, 1) + cols);
  },
  ...more,
};
