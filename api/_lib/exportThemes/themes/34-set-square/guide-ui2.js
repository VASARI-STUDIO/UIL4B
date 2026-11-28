// Theme 34, Set Square: pages 8 to 13 of the UI style guide (buttons, fields, feedback, overlays, space, handoff), A4 portrait, as shop drawings.
// Same sheet as pages 1 to 7 (guide-a4.js): the 7 x 10 module grid, the title block, leaders, dimension lines, schedules and the hatch.
// Every part is the engine's real component through its forced classes (is-hover, is-pressed, is-focus, is-disabled, aria-invalid); nothing imitates it with inline style.
// A dimension states a true token value. `data-m` marks an element whose size a dimension states, so a measuring script can compare the page with the render.
import { tokensCss, tokenGroups, statusText } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';
import { fontName, WEIGHT_NAMES } from '../../engine/styleguide.js';
import { tones, at, hr, vr, fill, svgAt, n1, pad2, own } from './kit.js';
import { X0, X1, GW, sheet, title, para, hexTag, hatch, marginDim, screenAt, roleHex } from './guide-a4.js';
import { NAMES } from './guide-helpers.js';

// ---- drawing parts ----
const U = (html, style = '', mode = 'light') => `<div class="ui tr" data-theme="${mode}" style="${style}">${html}</div>`;
const demo = (html) => `<span data-contrast="demo" style="display:contents">${html}</span>`; // a disabled control is exempt from contrast
const cap = (x, y, w, html, cls = 'lb') => at(x, y, w, null, `<div class="${cls}" style="white-space:normal;line-height:15px">${html}</div>`);
const lab = (x, y, html, ink) => at(x, y, 400, 16, `<span class="lb${ink ? ' i' : ''}">${html}</span>`);
const mono = (x, y, html, w = 200, al = 'left', ink = true) => at(x, y, w, 16, `<span class="m${ink ? ' i' : ''}" style="display:block;text-align:${al}">${html}</span>`);
const mm = (html, spec) => html.replace(/^<(\w+)/, `<$1 data-m="${spec}"`);
const dimc = (ctx, ground) => tones(ctx, ground).dim;
const tick = (x, y) => `<path d="M${n1(x - 4)} ${n1(y + 4)}L${n1(x + 4)} ${n1(y - 4)}"/>`;
// a vertical dimension at x from y1 to y2, the value beside it (right or left), 45 degree ticks
function vd(ctx, ground, x, y1, y2, value, side = 'r') {
  return svgAt(0, 0, 794, 1123, `<g stroke="${dimc(ctx, ground)}" stroke-width="1" fill="none"><path d="M${n1(x + .5)} ${n1(y1)}V${n1(y2)}"/>${tick(x, y1)}${tick(x, y2)}</g>`)
    + at(side === 'r' ? x + 8 : x - 68, (y1 + y2) / 2 - 8, 60, 16, `<span class="m dm" style="background:var(--g);display:block;text-align:${side === 'r' ? 'left' : 'right'}">${value}</span>`);
}
// a horizontal dimension at y from x1 to x2, the value centred above or below it
function hd(ctx, ground, x1, x2, y, value, side = 'a') {
  return svgAt(0, 0, 794, 1123, `<g stroke="${dimc(ctx, ground)}" stroke-width="1" fill="none"><path d="M${n1(x1)} ${n1(y + .5)}H${n1(x2)}"/>${tick(x1, y)}${tick(x2, y)}</g>`)
    + at((x1 + x2) / 2 - 40, side === 'a' ? y - 20 : y + 5, 80, 16, `<span class="m dm" style="background:var(--g);display:block;text-align:center">${value}</span>`);
}
const line = (ctx, ground, d, dash) => svgAt(0, 0, 794, 1123, `<path d="${d}" stroke="${dimc(ctx, ground)}" stroke-width="1" fill="none"${dash ? ' stroke-dasharray="4 3"' : ''}/>`);
const th = (ctx, k) => roleHex(ctx.roles.light, k);

// the stroke, cap and join of the kit's icons, read from one real icon
const iconFacts = (ctx) => { const s = ctx.ui.icon('plus', 24); const g = (a) => (new RegExp(`${a}="([^"]*)"`).exec(s) || [0, '?'])[1]; return { stroke: g('stroke-width'), cap: g('stroke-linecap'), join: g('stroke-linejoin') }; };

// ---- the form field, as the screen builds it ----
const fld = (id, label, { value = '', help, error, state, disabled, kind = 'input', opts = [] } = {}) => {
  const d = error ? ` aria-invalid="true" aria-describedby="${id}-m"` : help ? ` aria-describedby="${id}-m"` : '', dis = disabled ? ' disabled' : '';
  const c = `${kind === 'select' ? 'ui-select' : 'ui-input'}${state ? ' is-' + state : ''}`;
  const ctl = kind === 'select' ? `<select class="${c}" id="${id}"${dis}${d}>${opts.map((o) => `<option${o === value ? ' selected' : ''}>${o}</option>`).join('')}</select>`
    : `<input class="${c}" id="${id}" type="text" value="${value}" readonly tabindex="-1"${dis}${d}>`;
  const m = error ? `<p class="ui-error" id="${id}-m">${error}</p>` : help ? `<p class="ui-help" id="${id}-m">${help}</p>` : '';
  return `<div class="ui-field">${label ? `<label class="ui-label" for="${id}">${label}</label>` : ''}${ctl}${m}</div>`;
};

// measured heights of engine parts, px (the render reads the same; palette-independent)
const HT = { toast: 48, alert1: 42, alert2: 42, alert3: 42, alert4: 64, empty: 236, dialog: 180 };

export const pages2 = {
  // ---- 8 Buttons: the primary at 4x with its height, padding, radius and label dimensioned; a door schedule of variants by state; the sizes on one datum ----
  buttons(ctx) {
    const L = ctx.roles.light, ground = L.surface, ui = ctx.ui, t = tones(ctx, ground), dc = t.dim;
    const ctl = ctx.uiType.find((x) => x.token === 'control') || { size: 16, line: 16, weight: 500 };
    const sp5 = (ctx.space.find((s) => s.token === 'space-5') || { px: 20 }).px, bw = ctx.brand.ui.border, rb = ctx.radius.button, Z = 4, bx = X0 + 56, by = 156;
    // the 4x specimen: padding bands are drawn inside the zoomed box, so they follow the button's own width
    const pb = (bw + sp5) * Z;
    const padDim = (right) => `<svg style="position:absolute;${right ? 'right' : 'left'}:0;top:${44 * Z + 4}px" width="${pb}" height="30" aria-hidden="true"><g stroke="${dc}" stroke-width="1" fill="none"><path d="M${right ? 0 : bw * Z} 0V26M${right ? sp5 * Z : pb} 0V26M${right ? 0 : bw * Z} 16H${right ? sp5 * Z : pb}"/>${tick(right ? 0 : bw * Z, 16)}${tick(right ? sp5 * Z : pb, 16)}</g></svg><span class="m dm" style="position:absolute;${right ? "right" : "left"}:${bw * Z}px;top:${44 * Z + 34}px;width:${sp5 * Z}px;text-align:center">${sp5}</span>`;
    const hero = at(bx, by, null, null, `<div style="position:relative;display:inline-block">${U(mm(ui.btn('Save changes'), `h${44}`), `zoom:${Z}`)}${padDim(false)}${padDim(true)}`
      + `<div style="position:absolute;left:${pb}px;right:${pb}px;top:${44 * Z + 20}px;border-top:1px solid ${dc};text-align:center"><span class="m dm" style="background:var(--g);padding:0 6px;position:relative;top:-9px">label ${ctl.size}/${ctl.line}, ${ctl.weight}</span></div></div>`);
    const cx = bx + rb * Z, cy = by + rb * Z, ax = cx - rb * Z * 0.7071, ay = cy - rb * Z * 0.7071;
    const radius = svgAt(0, 0, 794, 1123, `<g stroke="${dc}" stroke-width="1" fill="none"><path d="M${n1(cx)} ${n1(cy)}L${n1(ax)} ${n1(ay)}M${n1(cx - 5)} ${n1(cy)}H${n1(cx + 5)}M${n1(cx)} ${n1(cy - 5)}V${n1(cy + 5)}M${n1(ax)} ${n1(ay)}V${by - 22}H${bx + 70}"/></g><circle cx="${n1(ax)}" cy="${n1(ay)}" r="3" fill="${ground}" stroke="${dc}"/>`)
      + mono(bx + 76, by - 30, `radius ${rb}`, 120, 'left', false).replace('class="m i"', 'class="m dm"');
    const heightDim = vd(ctx, ground, bx - 24, by, by + 44 * Z, '44', 'l') + svgAt(0, 0, 794, 1123, `<g stroke="${t.hair}" stroke-width="1"><path d="M${bx - 30} ${by + .5}H${bx - 4}M${bx - 30} ${by + 44 * Z - .5}H${bx - 4}"/></g>`);
    const intro = cap(bx + 4, by - 52, 340, 'The primary at 4x. Every value is a true px: the box is 44 high, the sides take the kit\'s padding, the corner its radius.');
    // the door schedule: a mark per state across, a row per variant, the engine's own button in every cell
    const variants = [['Primary', 'primary', 'Save', 'Once on a screen'], ['Secondary', 'secondary', 'Cancel', 'Beside the primary'], ['Quiet', 'quiet', 'Skip', 'Inside text'], ['Danger', 'danger', 'Discard', 'Throws work away']];
    const states = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Pressed with focus'], keys = ['', 'hover', 'pressed', 'focus', 'disabled', 'pf'];
    const btn = (v, label, st) => { const h = ui.btn(label, { variant: v, state: st === 'pf' ? 'pressed' : st || undefined }); return st === 'pf' ? h.replace('is-pressed', 'is-pressed is-focus') : h; };
    const SY = 404, HH = 66, RH = 62, c0 = X0 + 88, CW = 96;
    let sch = lab(X0, SY - 24, 'Button schedule, 1:1', true) + hr(X0, SY, GW, 'var(--ink)');
    states.forEach((s, i) => { sch += hexTag(c0 + i * CW + 26, SY + 6, `B-${pad2(i + 1)}`) + at(c0 + i * CW, SY + 48, CW, 16, `<span class="lb i" style="display:block;text-align:center;white-space:normal;line-height:13px">${s === 'Pressed with focus' ? 'Pressed + focus' : s}</span>`); });
    sch += hr(X0, SY + HH, GW);
    variants.forEach(([name, v, label, use], r) => {
      const y = SY + HH + r * RH;
      sch += at(X0, y + 10, 84, 40, `<div class="lb i r" style="line-height:16px">${name}</div><div class="lb" style="white-space:normal;line-height:13px">${use}</div>`) + (r < 3 ? hr(X0, y + RH) : '');
      keys.forEach((k, c) => { const cell = at(c0 + c * CW, y + 9, CW, 44, `<div style="display:flex;justify-content:center">${U(btn(v, label, k))}</div>`); sch += k === 'disabled' ? cell.replace('<div class="a ', '<div data-contrast="demo" class="a ') : cell; });
    });
    const fy = SY + HH + 4 * RH;
    sch += hr(X0, fy, GW, 'var(--ink)') + at(X0, fy + 10, 84, 16, '<span class="lb i">Primary fill</span>');
    [[th(ctx, 'action')], [th(ctx, 'actionHover')], [th(ctx, 'actionPressed')], [th(ctx, 'focus') + ' ring'], [th(ctx, 'disabledBg')], [th(ctx, 'actionPressed') + ' + ring']].forEach(([h], i) => {
      sch += mono(c0 + i * CW, fy + 10, h.replace(' + ring', '').replace(' ring', ''), CW, 'center') + (h.includes('ring') ? at(c0 + i * CW, fy + 26, CW, 14, `<span class="lb" style="display:block;text-align:center">${h.includes('+') ? 'and ring' : 'ring'}</span>`) : '');
    });
    sch += hr(X0, fy + 46, GW, 'var(--ink)');
    // sizes stand on one datum, each with its height
    const dy = 986, sizes = [['Small', 36, { size: 'sm' }, 'Add'], ['Default', 44, {}, 'Add'], ['Large', 52, { size: 'lg' }, 'Add'], ['Icon left', 44, { iconLeft: 'plus' }, 'Add'], ['Icon right', 44, { iconRight: 'arrow-right' }, 'Next'], ['Icon only', 44, { size: 'icon', iconLeft: 'plus', attrs: 'aria-label="Add"' }, '']];
    const row = sizes.map(([n, h, o, label]) => `<div style="display:flex;flex-direction:column;align-items:flex-start"><div style="display:flex;align-items:flex-end;gap:8px;height:52px">${U(mm(ui.btn(label, o), `h${h}`))}<svg width="9" height="${h}" aria-hidden="true"><g stroke="${dc}" stroke-width="1" fill="none"><path d="M4.5 0V${h}M0 .5H9M0 ${h - .5}H9"/></g></svg></div><span class="m i" style="margin-top:22px;white-space:nowrap">${n.replace('Icon ', 'icon ').toLowerCase()} ${h}</span></div>`).join('');
    const sz = lab(X0, dy - 108, 'Sizes, standing on one datum', true) + at(X0 + 8, dy - 52, null, null, `<div style="display:flex;gap:24px;align-items:flex-start">${row}</div>`) + hr(X0, dy, GW, 'var(--ink)', 2);
    return sheet(ctx, 'buttons', { ground, scale: '1:1', body: title('Buttons', 26, 68) + at(X0 + 340, 76, 332, 16, `<span class="lb" style="display:block;text-align:right">Door schedule: a mark per state, a row per variant.</span>`) + hero + heightDim + radius + sch + sz });
  },

  // ---- 9 Fields: the focus detail at 2x with a detail circle on its ring; the states as a schedule at 1:1; the choices below ----
  fields(ctx) {
    const L = ctx.roles.light, ground = L.raised || L.surface, ui = ctx.ui, t = tones(ctx, ground), dc = t.dim, bw = ctx.brand.ui.border, ri = ctx.radius.input, brand = own(ctx, ctx.brand.name);
    const bx = X0 + 44, by = 152, Z = 2, W = 170, R = 120, cX = X1 - R, cY = 240;
    const spec = at(bx, by, null, null, U(`<input class="ui-input is-focus" type="text" readonly tabindex="-1" aria-label="Website" style="width:${W}px">`, `zoom:${Z}`));
    // the detail circle: the same input at 8x (a transform), its top right corner on the circle's centre
    const K = 8, tx = R - W * K, ty = R;
    const detail = `<div class="a" style="left:${cX - R}px;top:${cY - R}px;width:${R * 2}px;height:${R * 2}px;border-radius:50%;overflow:hidden;background:${ground};box-shadow:0 0 0 1px var(--ink)"><div class="ui tr" data-theme="light" style="position:absolute;left:0;top:0;width:${W}px;transform:translate(${tx}px,${ty}px) scale(${K});transform-origin:0 0"><input class="ui-input is-focus" type="text" readonly tabindex="-1" aria-label="Detail" style="width:${W}px"></div></div>`;
    const sy = cY - R + 200, sx = cX - R + R; // strip y in the circle, centre x
    const segs = [[sx - 12, sx, 'A'], [sx, sx + 16, 'B'], [sx + 16, sx + 32, 'C']];
    const strip = svgAt(0, 0, 794, 1123, `<g stroke="${dc}" stroke-width="1" fill="none"><path d="M${sx - 20} ${sy + .5}H${sx + 40}${[sx - 12, sx, sx + 16, sx + 32].map((x) => `M${x + .5} ${sy - 8}V${sy + 8}`).join('')}"/></g>`)
      + segs.map(([a, b, l]) => at(a, sy + 9, b - a, 14, `<span class="m dm" style="background:var(--g);display:block;text-align:center">${l}</span>`)).join('');
    const link = line(ctx, ground, `M${bx + W * Z} ${by} L${cX - R * 0.6} ${cY - R * 0.8}`) + svgAt(0, 0, 794, 1123, `<circle cx="${bx + W * Z}" cy="${by}" r="14" fill="none" stroke="${dc}" stroke-width="1"/>`);
    const dims = vd(ctx, ground, bx - 22, by, by + 44 * Z, '44', 'l') + svgAt(0, 0, 794, 1123, `<g stroke="${t.hair}" stroke-width="1"><path d="M${bx - 28} ${by + .5}H${bx - 4}M${bx - 28} ${by + 44 * Z - .5}H${bx - 4}"/></g>`);
    const abc = [['A', 'Border', `${bw} px`, 'Edge turns Text'], ['B', 'Offset', '2 px', 'Surface'], ['C', 'Ring', '2 px', th(ctx, 'focus')]];
    let key = lab(bx, by + 44 * Z + 20, 'Detail of the focus ring, 8x', true) + hr(bx, by + 44 * Z + 42, 384, 'var(--ink)');
    abc.forEach(([k, n, v, d], i) => { const y = by + 44 * Z + 48 + i * 22; key += mono(bx + 6, y, k) + at(bx + 30, y, 90, 16, `<span class="lb i r">${n}</span>`) + mono(bx + 120, y, v, 60) + at(bx + 190, y, 200, 16, `<span class="m">${d}</span>`) + hr(bx, y + 22, 384); });
    key += at(bx, by + 44 * Z + 48 + 66 + 4, 384, 16, `<span class="m">height 44, padding 12, radius ${ri}</span>`);
    // the states at 1:1 as a schedule: a mark and a name, then the engine's own field
    const cells = [['Default', fld('a1', 'Website', {})], ['Hover', fld('a2', 'Website', { help: 'The kit sets no hover change.' })], ['Focus', fld('a3', 'Organisation name', { value: brand, state: 'focus' })], ['Filled', fld('a4', 'Contact email', { value: 'name@example.com' })],
      ['Error', fld('a5', 'Contact email', { value: 'name.example.com', error: 'Enter an email address with an @, like name@example.com.' })], ['Disabled', demo(fld('a6', 'Website', { disabled: true }))]];
    const SY = 406, rows = [92, 92, 118];
    let st = lab(X0, SY - 22, 'Field schedule, 1:1', true) + hr(X0, SY, GW, 'var(--ink)');
    let y = SY;
    cells.forEach(([n, h], i) => {
      const r = Math.floor(i / 2), x = X0 + (i % 2) * 336; if (i % 2 === 0 && r) y += rows[r - 1];
      st += hexTag(x, y + 12, `F-${pad2(i + 1)}`) + at(x - 4, y + 54, 52, 16, `<span class="lb i" style="display:block;text-align:center">${n}</span>`) + at(x + 56, y + 12, 272, null, U(h, 'width:272px'));
      if (i % 2 === 0) st += vr(X0 + 336 - 8, y + 6, rows[r] - 12);
      if (i % 2 === 1) st += hr(X0, y + rows[r], GW);
    });
    const cEnd = SY + rows[0] + rows[1] + rows[2];
    st += hr(X0, cEnd, GW, 'var(--ink)');
    // the choices: checkbox, radio and switch across four states; select and segmented below and beside
    const cell = (type, k) => { const a = k === 'on' ? ' checked' : k === 'disabled' ? ' disabled' : ''; const cl = type === 'switch' ? ` class="ui-switch${k === 'focus' ? ' is-focus' : ''}"` : k === 'focus' ? ' class="is-focus"' : ''; const h = `<label class="ui-choice" style="min-height:48px"><input type="${type === 'switch' ? 'checkbox' : type}"${type === 'switch' ? ' role="switch"' : ''}${cl}${a} aria-label="${type}"></label>`; return k === 'disabled' ? demo(h) : h; };
    const CY = cEnd + 30, cs = ['off', 'on', 'focus', 'disabled'], px = (c) => X0 + 84 + c * 62;
    let ch = lab(X0, CY - 22, 'Choices', true) + hr(X0, CY, 336, 'var(--ink)');
    ['Off', 'On', 'Focus', 'Disabled'].forEach((n, c) => { ch += at(px(c) - 6, CY + 6, 62, 14, `<span class="lb" style="display:block;text-align:center">${n}</span>`); });
    [['Checkbox', 'checkbox', 22], ['Radio', 'radio', 22], ['Switch', 'switch', 26]].forEach(([n, ty2, h], r) => {
      const y2 = CY + 28 + r * 50; ch += hr(X0, y2, 336) + at(X0, y2 + 16, 80, 16, `<span class="lb i">${n}</span>`);
      cs.forEach((k, c) => { ch += at(px(c) - 6, y2 + 1, 62, 48, `<div style="display:flex;justify-content:center">${U(cell(ty2, k))}</div>`); });
    });
    ch += hr(X0, CY + 28 + 150, 336, 'var(--ink)');
    const seg = (dis) => ui.segmented(['Day', 'Week', 'Month'], 1, { disabled: dis });
    const gy = CY + 28 + 150 + 18;
    ch += at(X0, gy, 200, null, U(seg(false))) + cap(X0 + 220, gy + 12, 120, 'Segmented, 42 high') + at(X0, gy + 52, 200, null, demo(U(seg(true)))) .replace('<div class="a ', '<div data-contrast="demo" class="a ') + cap(X0 + 220, gy + 64, 120, 'Disabled');
    const rx = X0 + 372;
    let sel = lab(rx, CY - 22, 'Select', true) + hr(rx, CY, 300, 'var(--ink)');
    [['Default', fld('s1', '', { kind: 'select', opts: ['Profile', 'Notifications', 'Security'], value: 'Profile' })], ['Focus', fld('s2', '', { kind: 'select', opts: ['Profile', 'Notifications', 'Security'], value: 'Notifications', state: 'focus' })], ['Disabled', demo(fld('s3', '', { kind: 'select', opts: ['Profile', 'Notifications', 'Security'], value: 'Security', disabled: true }))]].forEach(([n, h], i) => {
      const y2 = CY + 22 + i * 62; sel += at(rx, y2, 190, null, U(h, 'width:190px')) + at(rx + 204, y2 + 14, 96, 16, `<span class="lb">${n}</span>`);
    });
    sel += hr(rx, CY + 22 + 3 * 62 - 6, 300, 'var(--ink)');
    sel += cap(rx, CY + 22 + 3 * 62 + 4, 300, 'Every state is the engine\'s class: is-focus, is-disabled, aria-invalid. The kit gives the field and the choices no hover change.');
    return sheet(ctx, 'fields', { ground, scale: '1:1, specimen 2x, detail 8x', body: title('Fields', 26, 68) + at(X0 + 340, 76, 332, 16, `<span class="lb" style="display:block;text-align:right">Detail of the focus ring, then a schedule of states.</span>`) + spec + dims + link + detail + strip + key + st + ch + sel });
  },

  // ---- 10 Feedback: an elevation. Each part stands on a module line at 1:1 with its height dimensioned; status words in a key ----
  feedback(ctx) {
    const L = ctx.roles.light, ground = L.surface, ui = ctx.ui, t = tones(ctx, ground), N = iconSet(ctx).length;
    const items = [
      ['Toast', 'toast', mm(ui.toast('Organisation profile saved.'), 'h48'), HT.toast, 'Fill Text, words Surface. The one dark thing on the screen.', 'text'],
      ['Alert, info', 'a1', ui.alert('info', 'Changes apply to every page.'), HT.alert1, 'A 2 px edge and an icon carry the tone.', 'info'],
      ['Alert, success', 'a2', ui.alert('success', 'Profile saved.'), HT.alert2, 'The words stay in Text.', 'success'],
      ['Alert, warning', 'a3', ui.alert('warning', 'Your session ends in 5 minutes.'), HT.alert3, 'The words stay in Text.', 'warning'],
      ['Alert, danger', 'a4', ui.alert('danger', "We couldn't save. Check your connection and try again."), HT.alert4, 'Says what failed and what to do.', 'danger'],
      ['Loading', 'ld', `<div style="display:flex;gap:20px;align-items:center">${ui.spinner()}<div style="display:flex;flex-direction:column;gap:8px;width:220px">${ui.skeleton('100%')}${ui.skeleton('72%')}</div></div>`, 40, 'Spinner 24, skeleton 14. Sunken track, Text arc.', 'sunken'],
      ['Empty state', 'em', `<div class="ui-empty"><h3 class="ui-empty__title">Nothing matches &quot;serif&quot;</h3><p class="ui-empty__text">Clear the search to see all ${N} icons.</p>${ui.btn('Clear search', { variant: 'secondary' })}</div>`, HT.empty, 'Raised, with one way out.', 'raised'],
    ];
    let y = 120, body = '';
    items.forEach(([name, key, html, h, note, role], i) => {
      const rowH = Math.max(h, 40), base = y + rowH, top = base - h, x = X0 + 76, w = key === 'em' ? 336 : key === 'ld' ? 280 : 336;
      body += hexTag(X0, y + (rowH - 40) / 2, `F-${pad2(i + 1)}`) + vd(ctx, ground, X0 + 56, top, base, String(h), 'l') + at(x, top, w, h, U(html, `width:${w}px`))
        + hr(X0 + 56, base, X1 - X0 - 56, 'var(--hair)') + at(X0 + 432, y + rowH - 40, 240, 40, `<div class="lb i r" style="line-height:16px">${name}</div><div class="lb" style="white-space:normal;line-height:14px">${note}</div>`);
      y = base + 22;
    });
    // the key to the status words: plain words in one colour, never a pill
    const ky = Math.max(y + 18, 800), stat = ctx.status.slice(0, 6);
    let key = lab(X0, ky - 24, 'Key to status words', true) + hr(X0, ky, GW, 'var(--ink)');
    stat.forEach((s, i) => {
      const hex = String(statusText(ctx, 'light', s).hex).toUpperCase(), col = i % 2, r = Math.floor(i / 2), yy = ky + 6 + r * 32, x = X0 + col * 340;
      key += at(x, yy + 3, 120, 22, U(ui.statusChip(s.id))) + mono(x + 130, yy + 5, hex, 80) + mono(x + 220, yy + 5, ctx.fmt(ctx.ratio(hex, L.surface)), 50, 'right') + (col === 0 ? vr(X0 + 330, yy, 30) : '');
      if (col === 1 || i === stat.length - 1) key += hr(X0, yy + 30, GW);
    });
    key += cap(X0, ky + 6 + Math.ceil(stat.length / 2) * 32 + 8, GW, 'Each word is one colour on Surface; the ratio is read from the kit. A word and an icon carry the meaning, never colour alone.');
    return sheet(ctx, 'feedback', { ground, scale: '1:1', body: title('Feedback', 26, 68) + at(X0 + 340, 76, 332, 16, `<span class="lb" style="display:block;text-align:right">An elevation: each part stands on a line, height dimensioned.</span>`) + body + key });
  },

  // ---- 11 Overlays: a plan of the dialog over the scrim over the screen, a section through the three, and the table as a schedule ----
  overlays(ctx) {
    const set = ctx.roles.dark, L = ctx.roles.light, ground = set.surface, ui = ctx.ui, t = tones(ctx, ground), dc = t.dim, bw = ctx.brand.ui.border;
    const VX = X0, VY = 150, VW = 672, VH = 372, DW = 480, DH = HT.dialog, dx = VX + (VW - DW) / 2, dy = VY + (VH - DH) / 2;
    const dlg = ui.dialog({ title: 'Discard your changes?', body: "Your edits to Contact email haven't been saved.", keep: 'Keep editing', confirm: 'Discard', danger: true }).replace('class="ui-dialog"', 'data-m="w480" class="ui-dialog" style="max-width:480px"');
    const under = `<div class="a" data-contrast="demo" style="left:${VX}px;top:${VY}px;width:${VW}px;height:${VH}px;overflow:hidden">${screenAt(ctx, 'light', 'ss-ov', 0, 0, 1, VH)}</div>`
      + `<div class="a ui ui-scrim" data-theme="light" style="left:${VX}px;top:${VY}px;width:${VW}px;height:${VH}px;opacity:.78;padding:0" aria-hidden="true"></div>`
      + hatch(VX, VY, VW, VH, dc, 0.3, 8)
      + `<div class="a ui tr" data-theme="light" style="left:${VX}px;top:${VY}px;width:${VW}px;height:${VH}px;display:grid;place-items:center">${dlg}</div>`;
    const pdim = hd(ctx, ground, dx, dx + DW, VY - 18, '480') + svgAt(0, 0, 794, 1123, `<g stroke="${t.hair}" stroke-width="1"><path d="M${dx + .5} ${VY - 26}V${VY - 6}M${dx + DW - .5} ${VY - 26}V${VY - 6}"/></g>`)
      + vd(ctx, ground, VX + VW + 0 - 52, dy, dy + DH, String(DH), 'l') + line(ctx, ground, `M${VX} ${VY + VH / 2}H${VX + 28}M${VX + VW - 28} ${VY + VH / 2}H${VX + VW}`, true)
      + at(VX + 4, VY + VH / 2 - 22, 20, 16, '<span class="m dm" style="background:var(--g)">A</span>') + at(VX + VW - 20, VY + VH / 2 - 22, 20, 16, '<span class="m dm" style="background:var(--g)">A</span>');
    const pcap = lab(VX, VY + VH + 12, 'Plan. The light screen at 1:1 under the scrim, the dialog at its true width. Hatching marks the scrim.');
    // section A-A: three layers, exploded in height, in proportion across (0.6)
    const SY = 580, sw = 400, dw = Math.round(sw * DW / VW), sx = VX + 8, ex = (n) => SY + 14 + n * 30;
    const bar = (n, w, x, fillc, hatchit, name, sub) => (hatchit ? hatch(x, ex(n), w, 14, dc, 0.9, 6) : '') + `<div class="a" style="left:${x}px;top:${ex(n)}px;width:${w}px;height:14px;background:${fillc};${hatchit ? 'opacity:.9;' : ''}box-shadow:0 0 0 1px var(--ink)"></div>`
      + at(VX + 428, ex(n) - 6, 244, 30, `<div class="lb i r" style="line-height:15px">${name}</div><div class="m">${sub}</div>`);
    const section = lab(VX, SY - 14, 'Section A-A, layers exploded', true)
      + bar(2, sw, sx, L.surface, false, 'L-03 Screen', th(ctx, 'surface'))
      + bar(1, sw, sx, 'transparent', true, 'L-02 Scrim', `${th(ctx, 'scrim')}, padding 24`)
      + bar(0, dw, sx + (sw - dw) / 2, L.surface, false, 'L-01 Dialog', `${th(ctx, 'surface')}, border ${bw}, radius ${ctx.radius.card}`)
      + line(ctx, ground, `M${sx + (sw - dw) / 2 + .5} ${ex(0) + 14}V${ex(2)}M${sx + (sw + dw) / 2 - .5} ${ex(0) + 14}V${ex(2)}`, true);
    // the type scale as a schedule: head 44, rows 52, row 2 in the kit's hover state
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size).slice(0, 3), TY = 742;
    const rows = steps.map((s, i) => `<tr${i === 1 ? ' class="is-hover"' : ''}><td>${ctx.esc(s.token)}</td><td style="font-variant-numeric:tabular-nums">${s.size}/${s.line}</td><td>${WEIGHT_NAMES[s.weight] || s.weight}</td><td>${ctx.esc(s.use)}</td></tr>`).join('');
    const table = `<div class="a ui" data-theme="dark" style="left:${X0}px;top:${TY}px;width:${GW}px"><table class="ui-table"><colgroup><col style="width:130px"><col style="width:110px"><col style="width:110px"><col></colgroup><thead><tr><th>Step</th><th>Size / line</th><th>Weight</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const tdims = marginDim(ctx, ground, TY, TY + 44, 44) + marginDim(ctx, ground, TY + 44, TY + 96, 52) + marginDim(ctx, ground, TY + 96, TY + 148, 52);
    const note = lab(X0, TY - 24, 'Table schedule, dark set', true) + cap(X0, TY + 44 + 156 + 6, 560, 'Row 2 is the kit\'s hover row: Raised under the cursor. Head 44 high, rows 52.');
    return sheet(ctx, 'overlays', { ground, scale: '1:1, section NTS', body: title('Overlays', 26, 68) + at(X0 + 340, 76, 332, 16, `<span class="lb" style="display:block;text-align:right">A plan, a section and a schedule.</span>`) + under + pdim + pcap + section + note + table + tdims });
  },

  // ---- 12 Space: each spacing step as a bar of its true length; radii as corner details; the icons set out on a 24 px tile ----
  space(ctx) {
    const L = ctx.roles.light, ground = L.raised || L.surface, ui = ctx.ui, t = tones(ctx, ground), dc = t.dim, E = ctx.esc;
    const steps = [...ctx.space].sort((a, b) => a.px - b.px), pitch = Math.min(26, Math.floor(270 / steps.length)), y0 = 128;
    let sp = lab(X0, y0 - 22, 'Spacing, full size', true) + hr(X0, y0, GW, 'var(--ink)');
    steps.forEach((s, i) => {
      const y = y0 + 6 + i * pitch, x = X0 + 130;
      sp += mono(X0, y + 2, E(String(s.token).replace(/^space-/, 'space ')), 120) + `<div class="a" style="left:${x}px;top:${y + 3}px;width:${s.px}px;height:${Math.min(12, pitch - 10)}px;background:${L.action}"></div>`
        + svgAt(0, 0, 794, 1123, `<g stroke="${dc}" stroke-width="1" fill="none"><path d="M${x + .5} ${y - 1}V${y + pitch - 8}M${x + s.px - .5} ${y - 1}V${y + pitch - 8}"/></g>`) + at(x + s.px + 10, y + 2, 60, 16, `<span class="m dm">${s.px}</span>`);
    });
    const ry = y0 + 6 + steps.length * pitch + 36;
    sp += hr(X0, ry - 18, GW, 'var(--ink)');
    // radii: a corner at full size with its centre and radius line
    const radii = [...ctx.radii].sort((a, b) => a.px - b.px).slice(0, 7);
    let rd = lab(X0, ry - 38, 'Radius, as a corner', true);
    radii.forEach((r, i) => {
      const x = X0 + i * 96 + 4, cap2 = Math.min(r.px, 40), cx = x + cap2, cy = ry + cap2;
      rd += `<div class="a" style="left:${x}px;top:${ry}px;width:80px;height:64px;border-top:1.5px solid var(--ink);border-left:1.5px solid var(--ink);border-top-left-radius:${cap2}px;background:var(--wash)"></div>`
        + svgAt(0, 0, 794, 1123, `<g stroke="${dc}" stroke-width="1" fill="none"><path d="M${n1(cx - 4)} ${n1(cy)}H${n1(cx + 4)}M${n1(cx)} ${n1(cy - 4)}V${n1(cy + 4)}M${n1(cx)} ${n1(cy)}L${n1(cx - cap2 * 0.7071)} ${n1(cy - cap2 * 0.7071)}"/></g>`)
        + at(x, ry + 70, 90, 30, `<div class="m i">${E(String(r.token).replace(/^radius-/, ''))}</div><div class="m dm" style="color:var(--dim)">${r.px >= 999 ? 'full' : r.px}</div>`);
    });
    // the icons: one set out at 4x on its 24 px tile, then the grid
    const F = iconFacts(ctx), icons = iconSet(ctx), iy = ry + 134, tx = X0 + 40, Z = 4;
    const first = icons[0] || 'plus';
    let svg; try { svg = ui.icon(first, 24); } catch { svg = ''; }
    const tile = `<div class="a" style="left:${tx}px;top:${iy}px;width:96px;height:96px;box-shadow:0 0 0 1px var(--ink);background:var(--g)"></div>`
      + svgAt(tx, iy, 96, 96, `<g stroke="${dc}" stroke-width="1" fill="none"><rect x="8.5" y="8.5" width="79" height="79" stroke-dasharray="4 3"/><path d="M48.5 0V96M0 48.5H96" stroke="${t.hair}"/></g>`)
      + at(tx, iy, 96, 96, `<div class="ui tr" data-theme="light" style="zoom:${Z};width:24px;height:24px;color:var(--ink)">${svg}</div>`)
      + hd(ctx, ground, tx, tx + 96, iy - 14, '24') + vd(ctx, ground, tx + 96 + 22, iy + 8, iy + 88, '20', 'r');
    const sch = [['Tile', '24 px'], ['Keyline', '20 px'], ['Stroke', `${F.stroke} px`], ['Caps', F.cap], ['Joins', F.join]].map(([k, v], i) => hr(X0 + 280, iy + i * 22, 392) + at(X0 + 286, iy + 3 + i * 22, 100, 16, `<span class="lb i r">${k}</span>`) + mono(X0 + 400, iy + 3 + i * 22, v, 200)).join('') + hr(X0 + 280, iy + 110, 392, 'var(--ink)');
    const gy = iy + 150, cells = icons.slice(0, 21), rows = Math.ceil(cells.length / 7);
    let gr = lab(X0, gy - 22, `Icons, ${cells.length === icons.length ? `all ${icons.length}` : `${cells.length} of ${icons.length}`}, on the same tile`, true);
    for (let r = 0; r <= rows; r++) gr += hr(X0, gy + r * 78, GW, r === 0 || r === rows ? 'var(--ink)' : 'var(--hair)');
    for (let c = 0; c <= 7; c++) gr += vr(X0 + c * 96, gy, rows * 78, 'var(--hair)');
    cells.forEach((n, i) => {
      let s2 = ''; try { s2 = ui.icon(n, 24); } catch { /* an icon the loader lacks stays an empty cell */ }
      const x = X0 + (i % 7) * 96, y = gy + Math.floor(i / 7) * 78;
      gr += at(x + 36, y + 14, 24, 24, `<div class="ui tr" data-theme="light" style="width:24px;height:24px;color:var(--ink)">${s2}</div>`) + at(x + 2, y + 50, 92, 16, `<span class="m i" style="display:block;text-align:center;overflow:hidden;text-overflow:ellipsis">${E(n)}</span>`);
    });
    return sheet(ctx, 'space', { ground, scale: '1:1, tile 4x', body: title('Space', 26, 68) + at(X0 + 340, 76, 332, 16, `<span class="lb" style="display:block;text-align:right">Spacing, radius and icons at full size.</span>`) + sp + rd + tile + sch + gr });
  },

  // ---- 13 Handoff: the title block enlarged to the sheet, the tokens.css variables set as specification notes in its cells ----
  handoff(ctx) {
    const set = ctx.roles.dark, ground = set.surface, B = ctx.brand, E = ctx.esc, tok = tokensCss(ctx), block = tok.slice(tok.indexOf(':root {') + 7, tok.indexOf('}'));
    const grp = (n) => (/^sp-/.test(n) ? 'Space' : /^r-/.test(n) ? 'Radius' : /^w-/.test(n) ? 'Width' : /^ff-/.test(n) ? 'Font' : /^(fs|lh|fw)-/.test(n) ? 'Text' : /^shadow-/.test(n) ? 'Shadow' : /^palette-/.test(n) ? 'Palette' : 'Colour');
    const groups = {};
    block.split('\n').map((l) => /^\s*--([\w-]+):\s*(.+?);\s*$/.exec(l)).filter(Boolean).forEach(([, n, v]) => { (groups[grp(n)] = groups[grp(n)] || []).push([n, v]); });
    const names = Object.keys(groups), LH = 15, HEAD = 34, CW = 224;
    // balance the groups over three columns, tallest first
    const cols = [[], [], []], hs = [0, 0, 0];
    names.map((g) => [g, HEAD + groups[g].length * LH + 14]).sort((a, b) => b[1] - a[1]).forEach(([g, h]) => { const c = hs.indexOf(Math.min(...hs)); cols[c].push(g); hs[c] += h; });
    const T0 = 128, TH = Math.max(...hs) + 12;
    let body = hr(X0, T0, GW, 'var(--ink)', 2) + hr(X0, T0 + TH, GW, 'var(--ink)') + vr(X0 + CW, T0, TH, 'var(--hair)') + vr(X0 + 2 * CW, T0, TH, 'var(--hair)');
    let n = 0;
    cols.forEach((gs, c) => {
      let y = T0 + 10;
      gs.forEach((g) => {
        n++;
        const label = g === 'Colour' ? 'Colour, light set' : g;
        body += at(X0 + c * CW + 12, y, CW - 24, 18, `<span class="lb i r" style="font-weight:600">N-${pad2(n)}&nbsp; ${label}</span>`);
        groups[g].forEach(([nm, v], i) => {
          const yy = y + HEAD - 6 + i * LH, sw = /^#[0-9a-f]{6}$/i.test(v) ? `<i style="display:inline-block;width:9px;height:9px;margin-right:5px;background:${v};box-shadow:0 0 0 1px var(--hair)"></i>` : '';
          body += at(X0 + c * CW + 12, yy, 108, LH, `<span class="m" style="display:block;overflow:hidden;text-overflow:ellipsis">--${nm}</span>`) + at(X0 + c * CW + 122, yy, CW - 134, LH, `<span class="m i" style="display:block;overflow:hidden;text-overflow:ellipsis">${sw}${E(v)}</span>`);
        });
        y += HEAD + groups[g].length * LH + 14;
      });
    });
    // the foot cells: the faces, then the version and the files
    const FY = T0 + TH + 28, dark = E(String(set.surface).toUpperCase());
    body += hr(X0, FY, GW, 'var(--ink)', 2) + hr(X0, FY + 190, GW, 'var(--ink)') + vr(X0 + 2 * CW, FY, 190, 'var(--hair)')
      + at(X0 + 12, FY + 12, 2 * CW - 24, 18, '<span class="lb i r">Set in</span>')
      + at(X0 + 12, FY + 34, 2 * CW - 24, null, `<div class="d" style="font-size:34px;line-height:1.1;letter-spacing:-.02em;white-space:normal">${E(fontName(B.fonts.display))} and ${E(fontName(B.fonts.body))}.</div>`)
      + at(X0 + 12, FY + 140, 2 * CW - 24, 40, `<div class="m i" style="white-space:normal">${E(ctx.versionLine)}</div>`)
      + at(X0 + 2 * CW + 12, FY + 12, CW - 24, 18, '<span class="lb i r">Files in the kit</span>')
      + at(X0 + 2 * CW + 12, FY + 38, CW - 24, null, `<div class="m i" style="white-space:normal;line-height:19px">tokens.css<br>tokens.json<br>tokens.ts<br>tailwind.css<br>components.css<br>fonts.css<br>example.html<br>README</div>`);
    body += cap(X0, FY + 204, GW, `The variables of tokens.css, light set. The dark set is on [data-theme="dark"], where Surface is ${dark}. Every page of this guide is read from these.`, 'lb i');
    return sheet(ctx, 'handoff', { ground, scale: 'NTS', body: title('Handoff', 26, 68) + at(X0 + 340, 76, 332, 16, `<span class="lb" style="display:block;text-align:right">The title block, enlarged: the specification notes.</span>`) + body });
  },
};
