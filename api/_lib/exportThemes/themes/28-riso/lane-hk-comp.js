// Lane hk, components for theme 28 (Riso): states, buttons, inputs, choices, cards, navigation, lists, status, feedback. The components are the
// shipped ones (ctx.ui), pasted onto the paper on the product's own surface and never restyled; a state that only shows under a pointer or a key
// is forced with the class the code ships (is-hover, is-focus, is-pressed) or the disabled attribute. Each page is a ledger: a note on paper level
// with the component it describes. Every token value and ratio is read from ctx; the words on the components are the brand's own, printed whole.
import { A, val, sc, Word, word, rt, sheet, lab, note, b, pan, live, ledger, rowLab, ruled, tok, pgRef } from './lane-hk-lib.js';
import { fitW } from './sheet.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[ctx.uiType.length - 1];
const ex = (S) => S.example || {};
const sec = (inner) => `<div class="hk-sec">${inner}</div>`;
const rl = (right) => `<span class="hk-r" style="display:block">${right}</span>`;

export const comp = {
  // States: the six states a control can be in, one row each, every one forced by its class. A primary button is never shown disabled.
  states(ctx, K) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), ui = ctx.ui, bw = ctx.brand.ui.border;
    const second = X.secondary || S.call;
    const fld = (id, o = {}) => `<div style="flex:1 1 220px;min-width:0">${ui.field({ id, label: F.ready, value: F.readyValue, ...o })}</div>`;
    const P = (st) => ui.btn(F.book, { state: st }), Sb = (st, o = {}) => ui.btn(second, { variant: 'secondary', state: st, ...o });
    const rows = [
      [rowLab('Rest', 'As the code ships it, with nothing pressed or pointed at.'), fld('hk-st1') + P() + Sb()],
      [rowLab('Hover', `${val('is-hover')}. The fill steps to ${val('--action-hover')}; an outline fills ${val('--sunken')}. A field holds still.`), P('hover') + Sb('hover')],
      [rowLab('Focus', `${val('is-focus')}. A ${val('2 px')} ring in ${val('--focus')}, ${val('2 px')} off the edge.`), fld('hk-st2', { state: 'focus' }) + P('focus') + Sb('focus')],
      [rowLab('Pressed', `${val('is-pressed')}. The fill goes to ${val('--action-pressed')} and the button scales to ${val('0.97')}.`), P('pressed') + Sb('pressed')],
      [rowLab('Disabled', `${val('disabled')}. ${val('--disabled-bg')} ground and no edge. The primary action is never disabled.`), fld('hk-st3', { disabled: true }) + Sb('disabled', { disabled: true })],
      [rowLab('Error', `${val('aria-invalid')}. A ${val(bw + ' px')} ${val('--danger')} edge, and the message says what to enter.`), `<div style="flex:1 1 280px;min-width:0">${ui.field({ id: 'hk-st4', label: F.ready, value: F.readyValue, error: F.readyError })}</div>`],
    ];
    const n = rows.length;
    const body = sec(`${lab('State and class')}${ledger(rows)}${note(`Checkboxes, radios, switches and segments take the same ring. Their states are on page ${pgRef(K, 'choices')}, Choices.`)}`);
    return sheet(ctx, K, { label: 'States', hit: n, hitLeft: true, plate: `${b(`${Word(n)} states`)}<br>a control can be in, each forced here by the class the code ships, so the page shows what the browser draws.`, body });
  },

  // Buttons: the primary button drawn large with its measurements, then the four variants at rest, on hover and pressed, then the three sizes.
  buttons(ctx, K) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), D = S.dialog || {}, ui = ctx.ui, M = colourMap(ctx, 'light'), R = ctx.radius, bw = ctx.brand.ui.border;
    const ctl = uiT(ctx, 'control'), padX = parseFloat(tokenGroups(ctx).space['sp-5']) || 20;
    const spec = [['Height', '44 px'], ['Padding', `${padX} px each side`], ['Radius', `${R.button} px`], ['Edge', bw + ' px'], ['Label', null, `${A(ctx.brand.fonts.body.family)} ${val(ctl.weight)}, ${val(ctl.size + ' px')}`], ['On the fill', rt(ctx, M['action-label'], M.action)]];
    const zoom = `<div class="ui hk-pan" data-theme="light" style="padding:32px 24px;overflow:hidden"><div style="zoom:2;display:inline-block">${ui.btn(F.book)}</div></div>`;
    const V = [
      ['Primary', F.book, 'primary', `${val('--action')} fill, ${val('--action-label')} words.`],
      ['Secondary', X.secondary || S.call, 'secondary', `${val('--surface')} with a ${val(bw + ' px')} ${val('--text')} edge.`],
      ['Quiet', X.quiet || S.call, 'quiet', 'No fill, an underlined label.'],
      ['Danger', X.danger || D.confirm, 'danger', `${val('--danger')} fill, for what cannot be undone.`],
    ];
    const rows = V.map(([name, l, variant, how]) => [rowLab(name, how), [undefined, 'hover', 'pressed'].map((s) => ui.btn(l, { variant, state: s })).join('')]);
    const small = X.small || F.book;
    rows.push([rowLab('Sizes', `${val('36')}, ${val('44')} and ${val('52 px')} tall: in a row, on a form, once a screen.`), [['sm', small], [undefined, F.book], ['lg', F.book, 'arrow-right']].map(([size, l, icon]) => ui.btn(l, { size, iconRight: icon })).join('')]);
    const n = V.length;
    const body = `<div class="hk-two"><div class="hk-sec">${lab('The primary button, twice its size')}${zoom}</div>
<div class="hk-sec">${lab('At 1 : 1')}${ruled('minmax(0,1fr) auto', null, spec.map(([l, v, html]) => [l, `<span class="hk-r" style="display:block">${html || val(v)}</span>`]))}</div></div>
${sec(`${lab('Variant, at rest, on hover and pressed')}${ledger(rows)}`)}`;
    return sheet(ctx, K, { label: 'Buttons', hit: n, hitLeft: false, plate: `${b(`${Word(n)} variants`)}<br>of the one button, each at rest, on hover and pressed, then the three sizes.`, body });
  },

  // Inputs: the product's own form, field by field, each in a different state.
  inputs(ctx, K) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), ui = ctx.ui, M = colourMap(ctx, 'light'), bw = ctx.brand.ui.border;
    const fields = [F.pickup, F.dropoff, F.ready, F.size, F.notes].filter(Boolean), n = fields.length;
    const f = (o) => ui.field(o);
    const rows = [
      [rowLab('Filled', `The value in ${val('--text')}, a ${val(bw + ' px')} ${val('--edge')} edge. The label always sits above.`), f({ id: 'hk-in1', label: F.pickup, value: F.pickupValue })],
      [rowLab('Focus', `${val('is-focus')}. The edge turns ${val('--text')} and a ${val('2 px')} ${val('--focus')} ring sits ${val('2 px')} off it.`), f({ id: 'hk-in2', label: F.dropoff, value: F.dropoffValue, state: 'focus' })],
      [rowLab('Error', `A ${val('--danger')} edge. The message says what to enter, at ${rt(ctx, M.danger, M.surface)}.`), f({ id: 'hk-in3', label: F.ready, value: F.readyValue, error: F.readyError })],
      [rowLab('Select', `The same box, with a chevron in ${val('--quiet')}.`), f({ id: 'hk-in4', label: F.size, kind: 'select', options: F.sizes || [], value: (F.sizes || [])[1] })],
      [rowLab('Help', `In ${val('--quiet')} under the field, at ${rt(ctx, M.quiet, M.surface)}. An error takes its place.`), f({ id: 'hk-in5', label: F.notes, kind: 'textarea', help: F.notesHelp })],
      [rowLab('Disabled', `${val('--disabled-text')} on ${val('--disabled-bg')}, ${rt(ctx, M['disabled-text'], M['disabled-bg'])}, and no edge.`), f({ id: 'hk-in6', label: X.account || F.pickup, value: ctx.brand.name, disabled: true })],
    ];
    const body = sec(`${lab(A(F.title || F.book))}${ledger(rows, { mirror: true, pad: '16px 24px' })}`);
    return sheet(ctx, K, { label: 'Inputs', hit: n, hitLeft: true, plate: `${b(`${Word(n)} fields`)}<br>in the form ${A(F.title || F.book)}, each set here in a different state.`, body });
  },

  // Choices: the four controls with the product's own options, each option in a different state; then what each state changes.
  choices(ctx, K) {
    const S = sc(ctx), F = S.form || {}, X = ex(S), ui = ctx.ui, M = colourMap(ctx, 'light');
    const checks = X.checks || [], radios = X.radios || [], sw = X.switches || [], sizes = F.sizes || [];
    const cState = ['checked', 'is-focus', 'disabled'], rState = ['checked', 'is-focus'], wState = ['on, is-focus', 'off'];
    const cHtml = checks.slice(0, 3).map((t, i) => ui.check(t, { checked: i === 0, state: i === 1 ? 'focus' : undefined, disabled: i === 2 })).join('');
    const rHtml = radios.slice(0, 2).map((t, i) => ui.check(t, { type: 'radio', name: 'hk-rd', checked: i === 0, state: i === 1 ? 'focus' : undefined })).join('');
    const wHtml = sw.slice(0, 2).map((t, i) => ui.switch(t, { checked: i === 0, state: i === 0 ? 'focus' : undefined })).join('');
    const seg = ui.segmented(sizes, 1).replace('<button type="button" aria-pressed="false"', '<button type="button" class="is-focus" aria-pressed="false"');
    const segOff = ui.segmented(sizes, 1, { disabled: true });
    const said = (items, states) => items.map((t, i) => `${A(t)}: ${states[i]}`).join('. ') + '.';
    const col = (name, html, n) => `<div class="hk-sec" style="gap:12px">${lab(name)}<div class="hk-flowc" style="gap:4px;align-items:stretch">${html}</div>${note(n)}</div>`;
    const panel = pan(`<div class="hk-two" style="gap:24px 32px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));display:grid">${col('Checkbox', cHtml, said(checks.slice(0, 3), cState))}${col('Radio', rHtml, said(radios.slice(0, 2), rState))}${col('Switch', wHtml, said(sw.slice(0, 2), wState))}</div>
<div class="hk-flow" style="margin-top:24px;gap:24px">${seg}${segOff}</div>`, { mode: 'light' });
    const T = ruled('90px repeat(4,minmax(0,1fr))', ['State', 'Checkbox', 'Radio', 'Switch', 'Segmented'], [
      ['Off', '--edge edge', '--edge edge', '--edge knob', '--surface'], ['On', '--text fill', '--text dot', '--action track', '--text fill'],
      ['Focus', '--focus ring', '--focus ring', '--focus ring', '--focus inset'], ['Disabled', '--disabled-bg', '--disabled-bg', '--disabled-bg', '--disabled-bg'],
    ].map((r) => r.map((c, i) => (i ? tok(c) : `<span class="hk-b">${A(c)}</span>`))));
    const n = 4;
    const body = sec(`${lab('The product\'s own options')}${panel}${note(`Segmented, ${A(sizes[1] || '')} selected, focus on ${A(sizes[0] || '')}; then the same control disabled, every segment greyed together.`)}`)
      + sec(`${lab('What each state changes')}${T}${note(`On the light surface the switch's ${val('--action')} track sits at ${rt(ctx, M.action, M.surface)}, with a ${val('--text')} knob.`)}`);
    return sheet(ctx, K, { label: 'Choices', hit: n, hitLeft: false, plate: `${b(`${Word(n)} controls`)}<br>for a choice, set with the product's own options, each option in a different state.`, body });
  },

  // Cards: one surface holding the four forms the code ships; under it, what each holds.
  cards(ctx, K) {
    const S = sc(ctx), X = ex(S), ui = ctx.ui, M = colourMap(ctx, 'light');
    const placeholder = '<div class="ui-card__media" role="img" aria-label="Picture frame, 16 : 9" style="position:relative;display:flex;align-items:flex-end;padding:12px;width:100%;aspect-ratio:16/9;background:var(--sunken);box-shadow:inset 0 0 0 1px var(--divider);color:var(--text-soft);font-size:var(--fs-label)"><svg aria-hidden="true" width="100%" height="100%" preserveAspectRatio="none" style="position:absolute;inset:0" fill="none" stroke="var(--divider)"><line x1="0" y1="0" x2="100%" y2="100%"/><line x1="100%" y1="0" x2="0" y2="100%"/></svg><span style="position:relative;background:var(--sunken);padding:2px 6px">Picture, 16 : 9</span></div>';
    // a real photo when the brand has one (its focus point sets the crop, a percent pair or a 0-1 pair), else the framed placeholder
    const shot = (ctx.brand.imagery.shots || []).find((x) => x.photo);
    const fp = shot && shot.focus, pct = (v) => Math.round(v <= 1 ? v * 100 : v), pos = Array.isArray(fp) ? `${pct(fp[0])}% ${pct(fp[1])}%` : fp ? `${pct(fp.x)}% ${pct(fp.y)}%` : '50% 50%';
    const media = shot ? ctx.photo(shot.id, { cls: 'ui-card__media', slotNote: false, pos, style: 'width:100%;aspect-ratio:16/9;height:auto' }) : placeholder;
    const act = `<div style="margin-top:6px">${ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
    const left = ui.card({ media, meta: S.status, title: S.eta, text: S.pickup, action: act });
    const right = `${ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.deliverTo.includes(S.to) ? '' : S.to })}${ui.card({ title: S.rider, text: S.riderNote, raised: true })}${ui.stat(S.paid, X.statLabel || S.paidLabel)}`;
    const panel = pan(`<div class="hk-two" style="gap:24px;align-items:start"><div>${left}</div><div class="hk-col" style="gap:16px">${right}</div></div>`, { mode: 'light' });
    const T = ruled('110px minmax(0,1fr) minmax(0,1fr)', ['Form', 'Holds', 'Ground and edge'], [
      ['With media', 'A 16 : 9 picture, meta, title, text, an action', `${val('--surface')}, ${val('1 px')} ${val('--divider')}`],
      ['Without', 'Meta, title, one line of text', `${val('--surface')}, ${val('1 px')} ${val('--divider')}`],
      ['Raised', 'The same, a level up', `${val('--raised')}, no edge`],
      ['Stat', 'One figure and its label', `${val('--surface')}, ${val('1 px')} ${val('--divider')}`],
    ].map((r) => [`<span class="hk-b">${A(r[0])}</span>`, A(r[1]), r[2]]));
    const n = 4;
    const body = sec(`${lab('With media, then without, raised, and a stat')}${panel}`) + sec(`${lab('What each form holds')}${T}`);
    return sheet(ctx, K, { label: 'Cards', hit: n, hitLeft: true, plate: `${b(`${Word(n)} forms`)}<br>of card, each holding the product's own words. Text on a card reads at ${rt(ctx, M['text-soft'], M.surface)}.`, body });
  },

  // Navigation: a slice of the product's desktop with the top bar, sidebar, breadcrumbs and tabs in place, then the phone's tab bar.
  navigation(ctx, K) {
    const S = sc(ctx), X = ex(S), ui = ctx.ui;
    const links = X.links || [], tabs = X.tabs || [], crumbs = [...(X.crumbs || []), S.deliverTo];
    const lgw = fitW(ctx, 'colour', 130, 26);
    const logo = `<div style="width:${lgw}px;flex:none">${ctx.logo.html('colour', { width: lgw, colourway: 'colour', label: 'Logo' })}</div>`;
    const top = `<nav class="ui-topbar" aria-label="Main">${logo}<div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    const side = `<nav class="ui-sidebar" aria-label="Sections">${ui.links(links, 0)}</nav>`;
    const inner = `<div style="display:flex;flex-wrap:wrap;gap:24px;padding:24px;align-items:flex-start">${side}<div class="hk-col" style="flex:1 1 240px;gap:24px">${ui.crumbs(crumbs)}${ui.tabs(tabs, 0)}</div></div>`;
    const items = [...links];
    if (X.account && !items.some(([t]) => t === X.account)) items.push([X.account, 'user']);
    const bar = `<nav class="ui-tabbar" aria-label="Destinations" style="grid-template-columns:repeat(${items.length},1fr)">${items.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i || 'chevron-right', 20)}${A(t)}</a>`).join('')}</nav>`;
    const T = ruled('130px minmax(0,1fr)', ['Pattern', 'Marks the page you are on with'], [
      ['Top bar', `A ${val('3 px')} ${val('--action')} bar under the link, the words in ${val('--text')}`],
      ['Sidebar', `A ${val('--surface')} ground and a ${val('3 px')} ${val('--action')} bar on the left`],
      ['Breadcrumbs', `The page itself in ${val('--text')}, not a link`],
      ['Tabs', `A ${val('3 px')} ${val('--action')} bar under the tab; tabs change the view, not the page`],
      ['Tab bar', `A ${val('3 px')} ${val('--action')} bar above it, ${word(items.length)} destinations`],
    ].map((r) => [`<span class="hk-b">${A(r[0])}</span>`, r[1]]));
    const n = 5;
    const body = sec(`${lab('Desktop: top bar, sidebar, breadcrumbs and tabs')}${pan(top + inner, { mode: 'light', style: 'padding:0' })}`)
      + `<div class="hk-two"><div class="hk-sec">${lab('Phone: the tab bar')}${pan(bar, { mode: 'light', style: 'padding:0;max-width:390px' })}${note(`At the foot of a ${val('390 px')} screen, ${val('64 px')} tall. Each destination has an icon and its word.`)}</div></div>`
      + sec(`${lab('How each marks the page')}${T}`);
    return sheet(ctx, K, { label: 'Navigation', hit: n, hitLeft: false, plate: `${b(`${Word(n)} patterns`)}<br>for finding the way, each marking the page you are on.`, body });
  },

  // Lists: the product's own list, every row, on one surface; then rows without a lead, each a link, and what the parts are set in.
  lists(ctx, K) {
    const S = sc(ctx), ui = ctx.ui, M = colourMap(ctx, 'light'), d = S.deliveries || [], n = d.length;
    const main = pan(ui.deliveryRows(n).replace('class="ui-list"', 'class="ui-list" style="border-top:0"'), { mode: 'light', style: 'padding:4px 24px 0' });
    const linkRows = `<ul class="ui-list" style="border-top:0">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price, href: '#' })).join('')}</ul>`;
    const lt = uiT(ctx, 'label'), bt = uiT(ctx, 'body');
    const T = ruled('110px minmax(0,1fr) minmax(0,1fr)', ['Part', 'Set in', 'On the surface'], [
      ['Lead', `A ${val('40 px')} circle of ${val('--sunken')}`, ''],
      ['Title', `${val(bt.size + ' px')}, ${val('--text')}`, val(rt(ctx, M.text, M.surface))],
      ['Time', `${val(lt.size + ' px')}, ${val('--quiet')}, tabular`, val(rt(ctx, M.quiet, M.surface))],
      ['Status', 'Its own words in one colour', `page ${pgRef(K, 'status')}`],
    ].map((r) => [`<span class="hk-b">${A(r[0])}</span>`, r[1], r[2]]));
    const body = sec(`${lab('Lead, title and time, price and status')}${main}`)
      + `<div class="hk-two"><div class="hk-sec">${lab('Without a lead, each row a link')}${pan(linkRows, { mode: 'light', style: 'padding:4px 24px 0' })}</div><div class="hk-sec" style="justify-content:flex-end">${note(`The whole row is the target. A row that opens nothing is a ${val('div')}, never a link.`)}</div></div>`
      + sec(`${lab('The parts')}${T}`);
    return sheet(ctx, K, { label: 'Lists', hit: n, hitLeft: true, plate: `${b(`${Word(n)} rows`)}<br>from the product's own list, each with a lead, a title, a time and its status.`, body });
  },

  // Status: every state the product names, in its words, on the light surface and the dark one side by side, with the ratio each reads at.
  status(ctx, K) {
    const S = sc(ctx), ui = ctx.ui, d = S.deliveries || [], st = ctx.status, n = st.length;
    const L = colourMap(ctx, 'light'), Dk = colourMap(ctx, 'dark');
    const count = (id) => d.filter((x) => x.status === id).length;
    const cell = (mode, html) => `<div class="ui hk-pan" data-theme="${mode}" style="padding:18px 20px">${html}</div>`;
    const rows = st.map((s) => {
      const lt = statusText(ctx, 'light', s), dt = statusText(ctx, 'dark', s), c = count(s.id);
      const tk = lt.token === dt.token ? tok(lt.token) : `${tok(lt.token)}, ${tok(dt.token)} dark`;
      return `<div class="hk-sr">${cell('light', ui.statusChip(s.id))}${cell('dark', ui.statusChip(s.id))}<p class="hk-note">${tk}<br>${A(rt(ctx, lt.hex, L.surface))} light, ${A(rt(ctx, dt.hex, Dk.surface))} dark<br>${c ? `${Word(c)} in the list` : 'None in the list'}</p></div>`;
    });
    const top = [...st].sort((a, c) => count(c.id) - count(a.id))[0], tc = count(top.id);
    const badge = (mode) => cell(mode, `<span class="hk-flow" style="gap:8px">${ui.statusChip(top.id)}<span class="ui-badge">${tc}</span></span>`);
    const bRow = tc ? `<div class="hk-sr">${badge('light')}${badge('dark')}<p class="hk-note">A count badge: ${word(tc)} ${tc === 1 ? 'row is' : 'rows are'} in this state. ${val('--action')} under ${val('--action-label')}, ${A(rt(ctx, L['action-label'], L.action))}</p></div>` : '';
    const body = sec(`<div class="hk-sr hk-srh"><p class="hk-lab">Light</p><p class="hk-lab">Dark</p><p class="hk-lab">Token, ratio on the surface</p></div><div class="hk-sl">${rows.join('')}${bRow}</div>${note(`Each ratio is the words on the surface they print on: ${val(L.surface)} light, ${val(Dk.surface)} dark.`)}`);
    return sheet(ctx, K, { label: 'Status', hit: n, hitLeft: false, plate: `${b(`${Word(n)} states`)}<br>the product names, in plain words in one colour, never a tinted pill.`, body });
  },

  // Feedback: the alert in each of its four tones with the product's own messages, then the toast, the inline message and loading.
  feedback(ctx, K) {
    const S = sc(ctx), ui = ctx.ui, M = colourMap(ctx, 'light');
    const tones = [['info', S.pickup], ['success', S.toast], ['warning', S.alert], ['danger', (S.form || {}).readyError]];
    const n = tones.length;
    const alerts = `<div class="hk-col" style="gap:16px">${tones.map(([t, m]) => ui.alert(t, m)).join('')}</div>`;
    const T = ruled('100px 110px 100px minmax(0,1fr) 80px', ['Tone', 'Token', 'Value', 'Icon and edge', '<span class="hk-r" style="display:block">Ratio</span>'],
      tones.map(([t]) => [`<span class="hk-b">${A(t[0].toUpperCase() + t.slice(1))}</span>`, tok('--' + t), tok(M[t]), 'On the surface', `<span class="hk-r hk-v" style="display:block">${A(rt(ctx, M[t], M.surface))}</span>`]));
    const panelIn = `<div class="hk-two" style="gap:32px"><div class="hk-col" style="gap:20px">${ui.toast(S.toast)}<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p></div>
<div class="hk-flow" style="gap:20px;align-items:flex-start;flex-wrap:nowrap">${ui.spinner()}<div class="hk-col" style="gap:10px">${ui.skeleton('150px')}${ui.skeleton('110px')}${ui.skeleton('130px')}</div></div></div>`;
    const body = sec(`${lab('Alerts, in the product\'s own messages')}${pan(alerts, { mode: 'light' })}`)
      + sec(`${lab('The tones')}${T}`)
      + sec(`${lab('Toast and inline message, then loading')}${pan(panelIn, { mode: 'light' })}
<div class="hk-two"><p class="hk-note">A toast leaves by itself and keeps its undo. An alert stays until it is dealt with.</p><p class="hk-note">The spinner is for a short wait; a list waits in skeleton lines the shape of its rows.</p></div>`);
    return sheet(ctx, K, { label: 'Feedback', hit: n, hitLeft: true, plate: `${b(`${Word(n)} tones`)}<br>for an alert. The icon and a ${val('2 px')} edge carry the tone; the words stay in ${val('--text')}.`, body });
  },
};
