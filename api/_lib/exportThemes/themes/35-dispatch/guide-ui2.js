// Theme 35, Dispatch: pages 8 to 13 of the UI style guide (buttons, fields, feedback, overlays, space, handoff), A4 portrait, as consignment labels.
// Same label as pages 1 to 7 (guide-a4.js): the head band, the A4 stub at the foot, route lines, dockets and hard blocks of Signal and Asphalt.
// Every part is the engine's real component through its forced classes (is-hover, is-pressed, is-focus, is-disabled, aria-invalid); nothing imitates it with inline style.
import { tokensCss, tokenGroups, statusText } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';
import { fontName } from '../../engine/styleguide.js';
import { groundsOf, tones, at, hr, vr, fill, svgAt, field, n1, pad } from './kit.js';
import { realOf } from './pages-2.js';
import { L, R, CW, label, band, roleHex, screenAt, stopDot } from './guide-a4.js';

// ---- parts ----
const U = (html, style = '', mode = 'light') => `<div class="ui tr" data-theme="${mode}" style="${style}">${html}</div>`;
const demo = (html) => `<span data-contrast="demo" style="display:contents">${html}</span>`; // a disabled control is exempt from contrast
const lb = (x, y, w, html, al = 'left') => at(x, y, w, 16, `<span class="lb" style="display:block;text-align:${al}">${html}</span>`);
const mono = (x, y, w, html, al = 'left', cls = 'm') => at(x, y, w, 16, `<span class="${cls}" style="display:block;text-align:${al}">${html}</span>`);
const cap = (x, y, w, html, style = '') => at(x, y, w, null, `<div class="cap" style="${style}">${html}</div>`);
// a section head: a 4 px rule, then the label (and a note at the right)
const sec = (x, y, w, text, right = '') => hr(x, y, w) + lb(x, y + 10, w, text) + (right ? mono(x, y + 10, w, right, 'right') : '');
// a block of one ground, full bleed or not: the inner parts are placed from its own top left
const block = (ctx, x, y, w, h, ground, inner) => field(ctx, x, y, w, h, ground, inner);
const th = (set, k) => roleHex(set, k);

// the engine's field, as the screen builds it
const fld = (id, lab, { value = '', help, error, state, disabled, kind = 'input', opts = [] } = {}) => {
  const d = error ? ` aria-invalid="true" aria-describedby="${id}-m"` : help ? ` aria-describedby="${id}-m"` : '', dis = disabled ? ' disabled' : '';
  const c = `${kind === 'select' ? 'ui-select' : 'ui-input'}${state ? ' is-' + state : ''}`;
  const ctl = kind === 'select' ? `<select class="${c}" id="${id}"${dis}${d}>${opts.map((o) => `<option${o === value ? ' selected' : ''}>${o}</option>`).join('')}</select>`
    : `<input class="${c}" id="${id}" type="text" value="${value}" readonly tabindex="-1"${dis}${d}>`;
  const m = error ? `<p class="ui-error" id="${id}-m">${error}</p>` : help ? `<p class="ui-help" id="${id}-m">${help}</p>` : '';
  return `<div class="ui-field">${lab ? `<label class="ui-label" for="${id}">${lab}</label>` : ''}${ctl}${m}</div>`;
};
const choice = (type, k) => {
  const a = k === 'on' ? ' checked' : k === 'disabled' ? ' disabled' : '', sw = type === 'switch';
  const cl = sw ? ` class="ui-switch${k === 'focus' ? ' is-focus' : ''}"` : k === 'focus' ? ' class="is-focus"' : '';
  const h = `<label class="ui-choice" style="min-height:44px"><input type="${sw ? 'checkbox' : type}"${sw ? ' role="switch"' : ''}${cl}${a} aria-label="${type}"></label>`;
  return k === 'disabled' ? demo(h) : h;
};

export const pages2 = {
  // ---- 8 Buttons: the primary at 4x on an Asphalt block; a docket of variants by state with a Signal rail; the sizes on one baseline ----
  buttons(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, ui = ctx.ui, ground = Lt.surface, sig = tones(ctx, G.primary);
    const Z = 4, ctl = ctx.uiType.find((x) => x.token === 'control') || { size: 16, line: 16, weight: 500 };
    const sp5 = (ctx.space.find((s) => s.token === 'space-5') || { px: 20 }).px;
    const hero = block(ctx, 0, 124, 794, 208, D.surface, at(L, 16, CW - 72, 176, U(ui.btn('Save changes'), `zoom:${Z}`, 'dark'), { style: 'overflow:hidden' })
      + at(R - 56, 16, 56, 56, `<div style="width:56px;height:56px;background:${G.primary};color:${sig.ink};display:grid;place-items:center;font:${ctx.weights.heading} 26px/1 var(--display)">4x</div>`));
    const facts = [['Height', '44 px'], ['Sides', `${sp5} px`], ['Corner', `${ctx.radius.button} px`], ['Label', `${ctl.size}/${ctl.line}, ${ctl.weight}`]]
      .map(([k, v], i) => hr(L + i * 180, 348, 168, 'var(--ink)', 4) + lb(L + i * 180, 358, 168, k) + mono(L + i * 180, 376, 168, v, 'left', 'm13')).join('');
    // the docket: a Signal rail of variants, a column per state
    const variants = [['Primary', 'primary', 'Save', 'Once per screen'], ['Secondary', 'secondary', 'Cancel', 'Beside the primary'], ['Quiet', 'quiet', 'Skip', 'Inside text'], ['Danger', 'danger', 'Discard', 'Throws work away']];
    const states = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Pressed + focus'], keys = ['', 'hover', 'pressed', 'focus', 'disabled', 'pf'];
    const btn = (v, lab, st) => { const h = ui.btn(lab, { variant: v, state: st === 'pf' ? 'pressed' : st || undefined }); return st === 'pf' ? h.replace('is-pressed', 'is-pressed is-focus') : h; };
    const MY = 420, HH = 60, RH = 64, RW = 100, c0 = L + RW, CWc = (CW - RW) / 6;
    let dk = lb(L, MY - 24, 360, 'Variants by state, 1:1') + mono(L, MY - 24, CW, 'sides 10 px, width 96 px, to fit each cell', 'right') + hr(L, MY, CW);
    states.forEach((s, i) => { dk += at(c0 + i * CWc + CWc / 2 - 11, MY + 10, 22, 22, stopDot(i + 1)) + at(c0 + i * CWc + 2, MY + 38, CWc - 4, 16, `<span class="lb" style="display:block;text-align:center;font-size:10px;letter-spacing:.04em">${s}</span>`); });
    dk += hr(L, MY + HH, CW, 'var(--ink)', 2);
    const rail = block(ctx, L, MY + HH + 2, RW - 10, RH * 4, G.primary, variants.map(([n, , , use], r) => (r ? hr(0, r * RH, RW - 10, sig.ink, 2) : '') + at(10, r * RH + 12, RW - 20, 44, `<div class="h2" style="font-size:16px;line-height:18px">${n}</div><div class="cap" style="font-size:11px;line-height:14px;margin-top:2px;white-space:normal">${use}</div>`)).join(''));
    dk += rail;
    variants.forEach(([, v, lab], r) => {
      const y = MY + HH + 2 + r * RH;
      if (r) dk += hr(c0, y, CW - RW, 'var(--hair)', 1);
      keys.forEach((k, c) => {
        const h = btn(v, lab, k).replace(/^<(button|a) /, `<$1 style="padding:0 10px;max-width:${n1(CWc - 8)}px" `);
        dk += at(c0 + c * CWc, y + 10, CWc, 44, `<div style="display:flex;justify-content:center">${U(k === 'disabled' ? demo(h) : h)}</div>`);
      });
    });
    const fy = MY + HH + 2 + RH * 4 + 2;
    dk += hr(L, fy, CW, 'var(--ink)', 2) + lb(L, fy + 14, RW - 10, 'Primary fill');
    [th(Lt, 'action'), th(Lt, 'actionHover'), th(Lt, 'actionPressed'), th(Lt, 'focus'), th(Lt, 'disabledBg'), th(Lt, 'actionPressed')].forEach((h, i) => {
      dk += mono(c0 + i * CWc, fy + 6, CWc, h, 'center') + mono(c0 + i * CWc, fy + 22, CWc, ['fill', 'fill', 'fill', 'ring', 'fill', '+ ring'][i], 'center', 'm q');
    });
    dk += hr(L, fy + 46, CW);
    // the sizes, standing on one baseline, a cell each
    const sy = fy + 78, sizes = [['Small', 36, { size: 'sm' }, 'Add'], ['Default', 44, {}, 'Add'], ['Large', 52, { size: 'lg' }, 'Add'], ['Icon left', 44, { iconLeft: 'plus' }, 'Add'], ['Icon right', 44, { iconRight: 'arrow-right' }, 'Next'], ['Icon only', 44, { size: 'icon', iconLeft: 'plus', attrs: 'aria-label="Add"' }, '']];
    let sz = lb(L, sy - 24, 360, 'Sizes, on one baseline') + hr(L, sy, CW), cw = CW / 6;
    sizes.forEach(([n, h, o, lab], i) => {
      sz += (i ? vr(L + i * cw, sy + 6, 100) : '') + at(L + i * cw + 10, sy + 12 + (52 - h), cw - 20, h, `<div style="display:flex">${U(ui.btn(lab, o))}</div>`)
        + mono(L + i * cw + 10, sy + 76, cw - 12, n.toLowerCase(), 'left', 'm') + mono(L + i * cw + 10, sy + 92, cw - 12, `${h} px`, 'left', 'm q');
    });
    sz += hr(L, sy + 116, CW, 'var(--ink)', 4);
    return label(ctx, 'buttons', ground, band(ctx, 'buttons') + hero + facts + dk + sz);
  },

  // ---- 9 Fields: five states of the form, each on a route line to its note; the choices and the select on an Asphalt block ----
  fields(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, ui = ctx.ui, ground = Lt.surface, brand = ctx.esc(realOf(ctx, ctx.brand.name)), bw = ctx.brand.ui.border;
    const rows = [
      ['Default', fld('d1', 'Website', { help: 'Shown on invoices and emails.' }), 88, `Edge ${th(Lt, 'border')}, ${bw} px. The kit sets no hover change.`],
      ['Focus', fld('d2', 'Organisation name', { value: brand, state: 'focus' }), 88, `A 2 px ring in ${th(Lt, 'focus')}, set off by 2 px.`],
      ['Filled', fld('d3', 'Contact email', { value: 'name@example.com' }), 88, `Text ${th(Lt, 'text')} on ${th(Lt, 'surface')}.`],
      ['Error', fld('d4', 'Contact email', { value: 'name.example.com', error: 'Enter an email address with an @, like name@example.com.' }), 130, `Danger edge and message, ${th(Lt, 'danger')}. Says what to do.`],
      ['Disabled', demo(fld('d5', 'Website', { disabled: true })), 88, `Fill ${th(Lt, 'disabledBg')}, text ${th(Lt, 'disabledText')}. Not focusable.`],
    ];
    let y = 128, out = lb(L, y - 4, 300, 'The form, 1:1') + mono(L, y - 4, CW, 'a stop on each field, a note at right', 'right'); y += 18;
    out += hr(L, y, CW); y += 4;
    rows.forEach(([name, html, h, desc], i) => {
      out += (i ? hr(L, y, CW, 'var(--hair)', 1) : '') + at(L, y + 12, 330, h - 12, U(html, 'width:330px'))
        + svgAt(0, 0, 794, 1123, `<path d="M${L + 336} ${y + 12 + 42}H414" stroke="var(--ink)" stroke-width="2" fill="none"/>`) + at(L + 330 + 4, y + 12 + 42 - 4, 8, 8, '', { style: 'background:var(--ink);border-radius:50%' })
        + at(414, y + 12 + 31, 22, 22, stopDot(i + 1)) + at(446, y + 12 + 22, R - 446, 20, `<span class="h2" style="font-size:19px">${name}</span>`) + at(446, y + 12 + 46, R - 446, null, `<div class="cap">${desc}</div>`);
      y += h;
    });
    out += hr(L, y, CW, 'var(--ink)', 4);
    // the choices and the selects, on Asphalt
    const by = y + 26, bh = 1004 - by, ds = tones(ctx, D.surface);
    const cs = ['off', 'on', 'focus', 'disabled'], px = (c) => L + 96 + c * 66;
    let bk = lb(L, 18, 300, 'Choices') + hr(L, 40, 354, ds.ink, 2);
    ['Off', 'On', 'Focus', 'Disabled'].forEach((n, c) => { bk += at(px(c) - 14, 50, 66, 14, `<span class="lb" style="display:block;text-align:center;font-size:10px;letter-spacing:.04em">${n}</span>`); });
    [['Checkbox', 'checkbox'], ['Radio', 'radio'], ['Switch', 'switch']].forEach(([n, ty], r) => {
      const yy = 74 + r * 50; bk += hr(L, yy, 354, ds.hair, 1) + at(L, yy + 20, 90, 16, `<span class="lb">${n}</span>`);
      cs.forEach((k, c) => { bk += at(px(c) - 14, yy + 2, 66, 46, `<div style="display:flex;justify-content:center">${U(choice(ty, k), '', 'dark')}</div>`); });
    });
    bk += hr(L, 74 + 150, 354, ds.ink, 2);
    const seg = (dis) => ui.segmented(['Day', 'Week', 'Month'], 1, { disabled: dis });
    bk += at(L, 74 + 150 + 14, 220, null, U(seg(false), '', 'dark')) + mono(L + 240, 74 + 150 + 26, 110, 'segmented', 'left', 'm q') + at(L, 74 + 150 + 60, 220, null, demo(U(seg(true), '', 'dark'))) + mono(L + 240, 74 + 150 + 72, 110, 'disabled', 'left', 'm q');
    const sx = 440;
    bk += lb(sx, 18, 300, 'Select') + hr(sx, 40, R - sx, ds.ink, 2);
    const o = ['Profile', 'Notifications', 'Security'];
    [['Default', fld('s1', '', { kind: 'select', opts: o, value: 'Profile' })], ['Focus', fld('s2', '', { kind: 'select', opts: o, value: 'Notifications', state: 'focus' })], ['Disabled', demo(fld('s3', '', { kind: 'select', opts: o, value: 'Security', disabled: true }))]].forEach(([n, h], i) => {
      const yy = 56 + i * 64; bk += at(sx, yy, 200, null, U(h, 'width:200px', 'dark')) + mono(sx + 216, yy + 14, 98, n.toLowerCase(), 'left', 'm');
    });
    bk += hr(sx, 56 + 3 * 64, R - sx, ds.hair, 1) + at(sx, 56 + 3 * 64 + 10, R - sx, null, `<div class="cap" style="font-size:12px;line-height:17px">Every state is the engine's own class: is-focus, is-disabled, aria-invalid.</div>`);
    return label(ctx, 'fields', ground, band(ctx, 'fields') + out + block(ctx, 0, by, 794, bh, D.surface, bk));
  },

  // ---- 10 Feedback: the toast at 2x on Signal; alerts light and dark; status words as a docket; the empty state and loading ----
  feedback(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, ui = ctx.ui, ground = Lt.surface, sig = tones(ctx, G.primary), N = iconSet(ctx).length;
    const hero = block(ctx, 0, 124, 794, 124, G.primary, at(L, 16, CW, 96, U(ui.toast('Organisation profile saved.'), 'zoom:2'), { style: 'overflow:hidden' }) + mono(R - 120, 96, 120, 'toast, 2x', 'right', 'm'));
    const al = [['info', 'Changes apply to every page.'], ['success', 'Profile saved.'], ['warning', 'Your session ends in 5 minutes.'], ['danger', "We couldn't save. Check your connection and try again."]];
    const ay = 292, aw = 340;
    const stack = (mode) => al.map(([k, t], i) => `<div style="margin-bottom:${i < 3 ? 12 : 0}px">${ui.alert(k, t)}</div>`).join('');
    const light = lb(L, ay - 24, 300, 'Alerts, light set') + hr(L, ay - 4, aw) + at(L, ay + 8, aw, null, U(stack('light')));
    const dk = D.surface, dt = tones(ctx, dk);
    const dark = block(ctx, 404, ay - 28, 390, 268, dk, lb(26, 4, 300, 'Alerts, dark set') + hr(26, 24, 340, dt.ink, 4) + at(26, 36, aw, null, U(stack('dark'), '', 'dark')));
    // status words as a manifest
    const sy = ay + 268 + 36, stat = ctx.status.slice(0, 6);
    let st = lb(L, sy - 24, 300, 'Status words') + mono(L, sy - 24, CW, 'one colour, never a pill', 'right') + hr(L, sy - 4, CW);
    stat.forEach((s, i) => {
      const col = i % 3, r = Math.floor(i / 3), x = L + col * 240, yy = sy + 4 + r * 40, hex = String(statusText(ctx, 'light', s).hex).toUpperCase();
      st += (col ? vr(x - 10, yy, 32) : '') + at(x, yy + 4, 100, 24, U(ui.statusChip(s.id))) + mono(x + 100, yy + 2, 70, hex, 'left', 'm') + mono(x + 100, yy + 18, 70, `${ctx.fmt(ctx.ratio(hex, Lt.surface))} : 1`, 'left', 'm q');
      if (col === 2 || i === stat.length - 1) st += hr(L, yy + 36, CW, 'var(--hair)', 1);
    });
    st += hr(L, sy + 4 + Math.ceil(stat.length / 3) * 40 + 0, CW, 'var(--ink)', 4);
    // loading, then the empty state
    const ly = sy + 4 + Math.ceil(stat.length / 3) * 40 + 38;
    const load = lb(L, ly - 24, 300, 'Loading') + hr(L, ly - 4, 300) + at(L, ly + 14, 300, 40, `<div style="display:flex;gap:20px;align-items:center">${U(ui.spinner())}${U(`<div style="display:flex;flex-direction:column;gap:8px;width:220px">${ui.skeleton('100%')}${ui.skeleton('72%')}</div>`)}</div>`)
      + cap(L, ly + 68, 300, 'Spinner 24 and skeleton 14, in Sunken and Text.', 'font-size:12px;line-height:17px');
    const empty = lb(L + 340, ly - 24, 300, 'Empty state') + hr(L + 340, ly - 4, 374) + at(L + 340, ly + 14, 374, null, U(`<div class="ui-empty"><h3 class="ui-empty__title">Nothing matches &quot;serif&quot;</h3><p class="ui-empty__text">Clear the search to see all ${N} icons.</p>${ui.btn('Clear search', { variant: 'secondary' })}</div>`));
    return label(ctx, 'feedback', ground, band(ctx, 'feedback') + hero + light + dark + st + load + empty);
  },

  // ---- 11 Overlays: the light screen under the scrim as a plan, the dialog at its true width, three stops, then the table with a hover row ----
  overlays(ctx) {
    const D = ctx.roles.dark, Lt = ctx.roles.light, ground = D.surface, ui = ctx.ui, t = tones(ctx, ground), G = groundsOf(ctx), sig = tones(ctx, G.primary);
    const PY = 124, PH = 440, DW = 480, s = 794 / 1024;
    const dlg = ui.dialog({ title: 'Discard your changes?', body: "Your edits to Contact email haven't been saved.", keep: 'Keep editing', confirm: 'Discard', danger: true }).replace('class="ui-dialog"', 'class="ui-dialog" style="max-width:480px;width:480px"');
    const under = `<div class="a" data-contrast="demo" style="left:0;top:${PY}px;width:794px;height:${PH}px;overflow:hidden">${screenAt(ctx, 'light', 'dg-ov', 0, 0, s, PH / s).replace('box-shadow:0 0 0 4px var(--ink)', 'box-shadow:none')}</div>`
      + `<div class="a ui ui-scrim" data-theme="light" style="left:0;top:${PY}px;width:794px;height:${PH}px;opacity:.78;padding:0" aria-hidden="true"></div>`
      + `<div class="a ui tr" data-theme="light" style="left:0;top:${PY}px;width:794px;height:${PH}px;display:grid;place-items:center">${dlg}</div>`;
    const dot = (n, x, y) => at(x - 11, y - 11, 22, 22, `<span style="display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:${G.primary};color:${sig.ink};font:600 12px/1 var(--body);box-shadow:0 0 0 2px ${ground}">${n}</span>`);
    const dx0 = (794 - DW) / 2, mid = PY + PH / 2;
    const dots = dot(1, 30, PY + PH - 30) + dot(2, dx0 + DW - 2, mid - 70) + dot(3, dx0 + DW - 36, mid + 56);
    const dk = [['Scrim', th(Lt, 'scrim'), 'Laid at 78% over the screen. Padding 24, content centred.'], ['Dialog', th(Lt, 'surface'), `Surface, ${ctx.brand.ui.border} px edge, corner ${ctx.radius.card}. 480 wide.`], ['Danger button', th(Lt, 'danger'), 'The one way to throw work away. Keep editing is the first button.']];
    const ky = PY + PH + 28;
    let dg = lb(L, ky - 4, 300, 'Stops on the plan') + hr(L, ky + 16, CW, t.ink, 4);
    dk.forEach(([n, hex, d], i) => { const y = ky + 22 + i * 40; dg += (i ? hr(L, y, CW, t.hair, 1) : '') + at(L, y + 9, 22, 22, stopDot(i + 1)) + at(L + 38, y + 10, 150, 20, `<span class="h2" style="font-size:17px">${n}</span>`) + mono(L + 190, y + 12, 90, hex, 'left', 'm13') + cap(L + 290, y + 7, 424, d, 'font-size:12px;line-height:17px'); });
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size).slice(0, 3), TY = ky + 22 + 3 * 40 + 52;
    const rows = steps.map((st, i) => `<tr${i === 1 ? ' class="is-hover"' : ''}><td>${ctx.esc(st.token)}</td><td style="font-variant-numeric:tabular-nums">${st.size}/${st.line}</td><td>${st.weight}</td><td>${ctx.esc(st.use)}</td></tr>`).join('');
    const table = lb(L, TY - 28, 340, 'Table, dark set') + mono(L, TY - 28, CW, 'row 2 is the hover row', 'right') + `<div class="a ui" data-theme="dark" style="left:${L}px;top:${TY}px;width:${CW}px"><table class="ui-table"><colgroup><col style="width:130px"><col style="width:110px"><col style="width:110px"><col></colgroup><thead><tr><th>Step</th><th>Size / line</th><th>Weight</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    return label(ctx, 'overlays', ground, band(ctx, 'overlays') + under + dots + dg + table);
  },

  // ---- 12 Space: squares of each step on a baseline, radii as Asphalt blocks, icons in a docket grid, borders and the float shadow ----
  space(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, ui = ctx.ui, ground = Lt.surface, E = ctx.esc;
    const steps = [...ctx.space].sort((a, b) => a.px - b.px);
    let y = 128, out = sec(L, y, CW, 'Spacing, true size', `${steps.length} steps`); y += 34;
    // squares stand on one baseline; a step that would run past the margin starts a new row
    let x = L, rowTop = y, rowH = 0; const items = [];
    steps.forEach((s) => { if (x + s.px > R) { y += rowH + 44; x = L; rowH = 0; } items.push({ s, x, y }); rowH = Math.max(rowH, s.px); x += Math.max(s.px, 44) + 14; });
    items.forEach(({ s, x: ix, y: iy }) => {
      const base = iy + rowH0(items, iy);
      out += at(ix, base - s.px, s.px, s.px, '', { style: 'background:var(--ink)' }) + mono(ix, base + 6, 50, String(s.px), 'left', 'm13') + mono(ix, base + 24, 56, E(String(s.token).replace(/^space-/, '')), 'left', 'm q');
    });
    y = items.length ? Math.max(...items.map((i) => i.y + rowH0(items, i.y))) + 54 : y;
    // radii
    const radii = [...ctx.radii].sort((a, b) => a.px - b.px).slice(0, 7);
    out += sec(L, y, CW, 'Radius, as the kit sets it'); y += 34;
    const rw = CW / Math.max(1, radii.length);
    radii.forEach((r, i) => { out += at(L + i * rw, y, rw - 14, 84, '', { style: `background:var(--ink);border-radius:${Math.min(r.px, 32)}px` }) + mono(L + i * rw, y + 92, rw, E(String(r.token).replace(/^radius-/, '')), 'left', 'm') + mono(L + i * rw, y + 108, rw, r.px >= 999 ? 'full' : `${r.px} px`, 'left', 'm q'); });
    y += 146;
    // icons
    const icons = iconSet(ctx), shown = icons.slice(0, 24), rows = Math.ceil(shown.length / 6), CH = 84, cw = CW / 6;
    out += sec(L, y, CW, `Icons, 24 px`, shown.length === icons.length ? `all ${icons.length}` : `${shown.length} of ${icons.length}`); y += 34;
    out += block(ctx, 0, y, 794, rows * CH, G.panel, shown.map((n, i) => {
      let sv = ''; try { sv = ui.icon(n, 24); } catch { /* an icon the loader lacks stays an empty cell */ }
      const cx = L + (i % 6) * cw, cy = Math.floor(i / 6) * CH;
      return ((i % 6) ? vr(cx, cy + 8, CH - 16, tones(ctx, G.panel).hair) : '') + (i % 6 === 0 && cy ? hr(L, cy, CW, tones(ctx, G.panel).hair, 1) : '') + at(cx + cw / 2 - 12, cy + 16, 24, 24, `<div class="ui tr" data-theme="light" style="width:24px;height:24px;color:var(--ink)">${sv}</div>`) + at(cx + 4, cy + 52, cw - 8, 16, `<span class="m" style="display:block;text-align:center;overflow:hidden;text-overflow:ellipsis">${E(n)}</span>`);
    }).join(''));
    y += rows * CH + 28;
    // borders and the float shadow
    const B = ctx.brand.ui, sh = E(String(tokenGroups(ctx).shadow['shadow-float']));
    out += sec(L, y, CW, 'Borders and shadow'); y += 34;
    out += at(L, y + 4, 150, 0, '', { style: `border-top:${B.border}px solid ${Lt.border}` }) + mono(L, y + 14, 160, `Edge, ${B.border} px`, 'left', 'm')
      + at(L + 190, y + 4, 150, 0, '', { style: `border-top:1px solid ${Lt.divider}` }) + mono(L + 190, y + 14, 160, 'Divider, 1 px', 'left', 'm')
      + at(L + 400, y - 4, 150, 52, '', { style: `background:${Lt.surface};border:${B.border}px solid ${Lt.border};border-radius:${ctx.radius.card}px;box-shadow:${sh === 'none' ? 'none' : sh}` }) + mono(L + 570, y + 8, 144, 'shadow-float', 'left', 'm') + mono(L + 570, y + 24, 144, sh === 'none' ? 'none' : 'on a card', 'left', 'm q');
    return label(ctx, 'space', ground, band(ctx, 'space') + out);
  },

  // ---- 13 Handoff: a Signal block carries "Set in"; the tokens.css variables as a manifest in columns, then the files ----
  handoff(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, B = ctx.brand, E = ctx.esc, sig = tones(ctx, G.primary);
    const tok = tokensCss(ctx), blockCss = tok.slice(tok.indexOf(':root {') + 7, tok.indexOf('}'));
    const grp = (n) => (/^sp-/.test(n) ? 'Space' : /^r-/.test(n) ? 'Radius' : /^w-/.test(n) ? 'Width' : /^ff-/.test(n) ? 'Font' : /^(fs|lh|fw)-/.test(n) ? 'Text' : /^shadow-/.test(n) ? 'Shadow' : /^palette-/.test(n) ? 'Palette' : 'Colour');
    const groups = {};
    blockCss.split('\n').map((l) => /^\s*--([\w-]+):\s*(.+?);\s*$/.exec(l)).filter(Boolean).forEach(([, n, v]) => { (groups[grp(n)] = groups[grp(n)] || []).push([n, v]); });
    const hero = block(ctx, 0, 124, 794, 196, G.primary,
      at(L, 18, 440, 16, '<span class="lb">Set in</span>') + at(L, 42, 440, null, `<div class="d" style="font-size:38px;line-height:1.08;white-space:normal;color:var(--ink)">${E(fontName(B.fonts.display))} and ${E(fontName(B.fonts.body))}.</div>`)
      + at(L, 150, 440, 40, `<div class="m13" style="white-space:normal">${E(ctx.versionLine || '')}</div>`)
      + hr(512, 18, 242, sig.ink, 4) + at(512, 30, 242, 16, '<span class="lb">Files in the kit</span>')
      + at(512, 52, 242, null, `<div class="m13" style="white-space:normal;line-height:17px;columns:2;column-gap:12px">tokens.css<br>tokens.json<br>tokens.ts<br>tailwind.css<br>components.css<br>fonts.css<br>example.html<br>README</div>`));
    // the variables: groups balanced over three columns, tallest first
    const names = Object.keys(groups), LH = 15, HEAD = 34, CWc = 238, cols = [[], [], []], hs = [0, 0, 0];
    names.map((g) => [g, HEAD + groups[g].length * LH + 12]).sort((a, b) => b[1] - a[1]).forEach(([g, h]) => { const c = hs.indexOf(Math.min(...hs)); cols[c].push(g); hs[c] += h; });
    const T0 = 346; let body = '';
    cols.forEach((gs, c) => {
      let y = T0; const x = L + c * CWc;
      gs.forEach((g) => {
        body += hr(x, y, CWc - 20, 'var(--ink)', 4) + lb(x, y + 10, CWc - 70, g === 'Colour' ? 'Colour, light set' : g) + mono(x, y + 10, CWc - 20, `${groups[g].length}`, 'right', 'm q');
        groups[g].forEach(([nm, v], i) => {
          const yy = y + HEAD + i * LH, sw = /^#[0-9a-f]{6}$/i.test(v) ? `<i style="display:inline-block;width:9px;height:9px;margin-right:5px;background:${v};box-shadow:0 0 0 1px var(--hair)"></i>` : '';
          body += at(x, yy, 112, LH, `<span class="m" style="display:block;overflow:hidden;text-overflow:ellipsis">--${nm}</span>`) + at(x + 114, yy, CWc - 136, LH, `<span class="m q" style="display:block;overflow:hidden;text-overflow:ellipsis">${sw}${E(v)}</span>`);
        });
        y += HEAD + groups[g].length * LH + 12;
      });
    });
    const end = T0 + Math.max(...hs);
    body += cap(L, Math.min(end + 6, 984), CW, `The variables of tokens.css, light set. The dark set is on [data-theme="dark"], where Surface is ${E(String(D.surface).toUpperCase())}. Every page of this guide is read from these.`, 'font-size:12px;line-height:17px');
    return label(ctx, 'handoff', Lt.surface, band(ctx, 'handoff') + hero + body);
  },
};

// the tallest square in the row that starts at y (rows are told apart by their y)
function rowH0(items, y) { return Math.max(...items.filter((i) => i.y === y).map((i) => i.s.px)); }
