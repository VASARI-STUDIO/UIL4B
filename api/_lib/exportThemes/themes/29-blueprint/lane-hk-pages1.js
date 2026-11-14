// Theme 29 (Blueprint), lane hk: the kit site's cover, contents and foundation sheets.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { A, pad2, sc, ex, mono, tag, det, plate, kr, notes, ttl, label, sch, logoBoth } from './lane-hk-parts.js';

const HEX = (v) => String(v).toUpperCase();
const sw = (v) => `<i class="hk-sw" style="background:${A(v)}"></i>`;

// ---------------------------------------------------------------- cover and contents

const register = (K, withNo) => `<div class="hk-regs">${K.sections.map((s) => `<div class="hk-reg"><h2>${pad2(s.n)} ${A(s.title)}</h2>${s.pages.map((u) => `<a href="${A(K.href(u.id))}"><span class="hk-m">${A(u.ref || '')}</span><span>${A(u.title)}</span>${withNo ? `<span class="hk-m">${pad2(u.no)}</span>` : '<span></span>'}</a>`).join('')}</div>`).join('')}</div>`;

function cover(ctx, K) {
  const B = ctx.brand, S = sc(ctx), F = S.form, ui = ctx.ui, d = B.fonts.display;
  const hero = `<h1 class="hk-hero" id="h-cover" style="--hd:'${A(d.family)}',sans-serif;--hw:${ctx.weights.heading};--fl:88px">${A(B.lines.primary)}</h1>`;
  const live = plate(`<div class="hk-lh">${ui.statusChip(S.deliveries[0].status)}<p class="ui-display" style="font-size:var(--fs-title);line-height:var(--lh-title)">${A(S.eta)}</p><p>${A(S.pickup)}</p></div>${ui.btn(F.book)}`, { cls: 'hk-plate--c' });
  const live2 = plate(`<div class="hk-lh">${ui.statusChip(S.deliveries[0].status)}<p class="ui-display" style="font-size:var(--fs-title);line-height:var(--lh-title)">${A(S.eta)}</p><p>${A(S.pickup)}</p></div>${ui.btn(F.book)}`, { dark: true, cls: 'hk-plate--c' });
  return `<div class="hk-ttl">${hero}<p>${A(B.name)} UI kit. The same components the code package ships, drawn as they are.</p></div>
${det(1, 'The product, as shipped', '<span class="hk-m">1:1</span>', `<div class="hk-2">${live}${live2}</div>`)}
${det(2, 'Drawing register', '', register(K, true))}`;
}

function contents(ctx, K) {
  return `${ttl('Contents', 'Every sheet in the UI kit, by section. Each opens its own page.')}${register(K, true)}`;
}

// ---------------------------------------------------------------- colour

function colourPage(ctx, K, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), ui = ctx.ui, dark = mode === 'dark';
  const keys = Object.keys(M).filter((k) => !k.startsWith('status-') && !k.startsWith('palette-'));
  const pairs = { text: 'surface', 'text-soft': 'surface', quiet: 'surface', 'quiet-sunken': 'sunken', 'action-label': 'action', 'action-text': 'surface', action: 'surface', 'disabled-text': 'disabled-bg', focus: 'surface', 'action-hover': 'surface', 'action-pressed': 'surface', edge: 'surface', divider: 'surface' };
  ['success', 'warning', 'danger', 'info'].forEach((t) => { pairs[t] = t + '-bg'; });
  const rows = keys.map((k) => {
    const v = String(M[k]), hex = /^#[0-9a-f]{6}$/i.test(v);
    const pr = pairs[k] && hex && /^#[0-9a-f]{6}$/i.test(String(M[pairs[k]])) ? `${mono(ctx.fmt(ctx.ratio(M[k], M[pairs[k]])) + ' : 1')} <span class="hk-lab">on ${A(pairs[k])}</span>` : '';
    return [sw(v), mono('--' + k), mono(hex ? HEX(v) : v), pr || ''];
  });
  const live = plate(`<div class="hk-lh">${ui.statusChip(S.deliveries[0].status)}<p class="ui-display" style="font-size:var(--fs-title);line-height:var(--lh-title)">${A(S.eta)}</p><p>${A(S.pickup)}</p></div>
${ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo })}<div class="hk-plate--row">${ui.btn(S.form.book)}${ui.btn(ex(ctx).secondary, { variant: 'secondary' })}${ui.btn(ex(ctx).quiet, { variant: 'quiet' })}</div>${ui.alert('info', S.pickup)}`, { dark, style: 'max-width:520px' });
  return `${ttl(dark ? 'Colour, dark' : 'Colour, light', `Every role is a token on the ${dark ? 'dark' : 'light'} surface. Components read the token, never the hex.`)}
<div class="hk-cols">${det(1, 'Roles at work', '<span class="hk-m">1:1</span>', live)}${det(2, 'Role schedule', '', sch(['', 'Token', 'Value', 'Contrast'], rows, 'hk-sr--4'))}</div>`;
}

// ---------------------------------------------------------------- type, spacing, radii, elevation

function typeScale(ctx) {
  const S = sc(ctx), F = S.form, rows = ctx.uiType.map((t, i) => {
    const text = t.token === 'caption' ? S.inline : t.token === 'label' ? S.deliverToLabel : t.face === 'display' ? S.eta : S.pickup;
    const face = t.face === 'display' ? 'var(--ff-display)' : 'var(--ff-body)';
    const st = `font:${t.weight} ${t.size}px/${t.line}px ${face};${t.face === 'display' ? 'font-stretch:var(--ds);letter-spacing:-0.01em;' : ''}`;
    return kr(i + 1, t.token, `${mono(`${t.size} / ${t.line}, ${t.weight}`)}<br>${A(t.use)}`, `<span class="hk-ts" style="${st}">${A(text)}</span>`, { cls: '' });
  });
  return `${ttl('Type scale', 'Each token is a size, a line height and a weight, set in the brand’s display or body face.')}<div class="hk-kl">${rows.join('')}</div>`;
}

function spacing(ctx) {
  const rows = ctx.space.map((s) => [mono('--' + s.token.replace('space-', 'sp-')), `<span class="hk-dim" style="width:${s.px}px"></span>`, `<span class="hk-rv">${s.px} px</span>`]);
  const live = plate(ctx.ui.deliveryRows(3), { cls: 'hk-plate--c hk-plate--fill', style: 'padding:var(--sp-4,16px)' });
  return `${ttl('Spacing', 'One scale. Every gap and padding in the kit is a step on it.')}
<div class="hk-cols hk-cols--r">${det(1, 'Scale', '<span class="hk-m">1:1</span>', sch(['Token', 'Size', 'Value'], rows, 'hk-sr--3'))}${det(2, 'Rows at work', '<span class="hk-m">1:1</span>', live)}</div>`;
}

function radiiBorders(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form;
  const live = {
    'radius-control': `${ui.btn(F.book)}${ui.field({ id: 'hk-rb-f', label: F.pickup, value: F.pickupValue })}`,
    'radius-card': ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo }),
    'radius-round': `<span class="ui-avatar">${A(S.initials || '')}</span>${ui.switch(ex(ctx).switches[0], { checked: true })}`,
  };
  const radii = ctx.radii.map((r, i) => kr(i + 1, r.token, `${mono(r.px >= 9999 ? 'Full round' : r.px + ' px')}<br>${A(r.use)}`, live[r.token] || ui.btn(F.book))).join('');
  const bl = { 'border-hairline': ui.deliveryRows(2), 'border-control': ui.field({ id: 'hk-rb-g', label: F.dropoff, value: F.dropoffValue }), 'border-focus': ui.btn(F.book, { state: 'focus' }) };
  const borders = ctx.borders.map((b, i) => kr(ctx.radii.length + i + 1, b.token, `${mono(b.px + ' px')}<br>${A(b.use)}`, bl[b.token] || '')).join('');
  return `${ttl('Radii and borders', 'Corners and edges come from a short list. Nothing in the kit sets its own.')}
<div class="hk-cols hk-cols--r">${det(1, 'Radii', '<span class="hk-m">1:1</span>', `<div class="hk-kl">${radii}</div>`)}${det(2, 'Borders', '<span class="hk-m">1:1</span>', `<div class="hk-kl">${borders}</div>`)}</div>`;
}

function elevation(ctx) {
  const ui = ctx.ui, S = sc(ctx), D = S.dialog, g = tokenGroups(ctx).shadow['shadow-float'];
  const lv = (dark) => `${ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo })}${ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo, raised: true })}`;
  const dlg = (dark, id) => ui.dialog({ ...D }).replace(/dlg-t/g, id);
  return `${ttl('Elevation', 'Surfaces sit flat. A raised card and a dialog lift off the page, and the float shadow is one token.')}
<div class="hk-cols hk-cols--r">${det(1, 'Levels, light', '<span class="hk-m">1:1</span>', `<div class="hk-kl">${kr(1, 'Surface and raised', 'Card, then raised card', lv(false))}${kr(2, 'Float', `${mono('--shadow-float')}<br>${mono(g)}`, dlg(false, 'hk-el-a'))}</div>`)}
${det(2, 'Levels, dark', '<span class="hk-m">1:1</span>', `<div class="hk-kl">${kr(3, 'Surface and raised', 'Card, then raised card', lv(true), { dark: true })}${kr(4, 'Float', `${mono('--shadow-float')}<br>${mono(g)}`, dlg(true, 'hk-el-b'), { dark: true })}</div>`)}</div>`;
}

// ---------------------------------------------------------------- states

function states(ctx) {
  const ui = ctx.ui, S = sc(ctx), F = S.form, X = ex(ctx);
  const ST = ['Rest', 'Hover', 'Focus', 'Pressed', 'Disabled'], BS = [undefined, 'hover', 'focus', 'pressed', 'disabled'];
  const btn = (v, lab) => `<div class="hk-grid5">${ST.map((n, i) => `<div class="hk-cell"><span class="hk-lab">${n}</span>${ui.btn(lab, { variant: v, state: BS[i] === 'disabled' ? undefined : BS[i], disabled: BS[i] === 'disabled' })}</div>`).join('')}</div>`;
  const fld = [['Rest', {}], ['Focus', { state: 'focus' }], ['Error', { error: F.readyError }], ['Disabled', { disabled: true }]];
  const fields = `<div class="hk-2">${fld.map(([n, o], i) => `<div class="hk-cell"><span class="hk-lab">${n}</span>${ui.field({ id: `hk-st-${i}`, label: o.error ? F.ready : F.pickup, value: o.error ? F.readyValue : F.pickupValue, ...o })}</div>`).join('')}</div>`;
  const chk = `<div class="hk-2"><div class="hk-cell"><span class="hk-lab">Checked</span>${ui.check(X.checks[0], { checked: true, name: 'hk-st-c1' })}</div><div class="hk-cell"><span class="hk-lab">Focus</span>${ui.check(X.checks[1], { state: 'focus', name: 'hk-st-c2' })}</div><div class="hk-cell"><span class="hk-lab">Disabled</span>${ui.check(X.checks[2], { disabled: true, name: 'hk-st-c3' })}</div><div class="hk-cell"><span class="hk-lab">Switch, disabled</span>${ui.switch(X.switches[1], { disabled: true })}</div></div>`;
  return `${ttl('States', 'Rest, hover, focus, pressed and disabled, forced on the live components with the classes the code package ships.')}
${det(1, 'Primary button', '', plate(btn('primary', F.book), { cls: 'hk-plate--fill' }))}
${det(2, 'Secondary button', '', plate(btn('secondary', X.secondary), { cls: 'hk-plate--fill' }))}
${det(3, 'Text field', '', plate(fields, { cls: 'hk-plate--fill' }))}
${det(4, 'Choices', '', plate(chk, { cls: 'hk-plate--fill' }))}
${det(5, 'Primary button, dark', '', plate(btn('primary', F.book), { dark: true, cls: 'hk-plate--fill' }))}`;
}

export const pages1 = {
  cover,
  contents,
  'colour-light': (ctx, K) => colourPage(ctx, K, 'light'),
  'colour-dark': (ctx, K) => colourPage(ctx, K, 'dark'),
  'type-scale': typeScale,
  spacing,
  'radii-borders': radiiBorders,
  elevation,
  states,
};
