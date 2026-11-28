// Theme 36, Doorlist: pages 8 to 13 of the UI style guide (buttons, fields, feedback, overlays, space, handoff), A4 portrait, on the door list.
// Same list row and device as pages 1 to 7 (guide-a4.js): a state is named on a highlighter bar, a marker ties a part to its row, and a disabled part is turned away.
// Every part is the engine's real component through its forced classes (is-hover, is-pressed, is-focus, is-disabled, aria-invalid); nothing imitates it with inline style.
import { tokensCss, tokenGroups, statusText } from '../../engine/tokens.js';
import { iconSet } from '../../engine/components.js';
import { fontName } from '../../engine/styleguide.js';
import { groundsOf, tones, at, hr, vr, fill, field, n1 } from './kit.js';
import { L, R, CW, realOf, sheet, head, U, demo, lb, mono, cap, mk, bar, roleHex, sec, screenAt, bodyWidth } from './guide-a4.js';

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
  // ---- 8 Buttons: the primary at 3x on a Night band with its facts; the variants by state, a name on a bar for each row; the sizes on one baseline ----
  buttons(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, ui = ctx.ui, ground = Lt.surface, t0 = tones(ctx, ground);
    const ctl = ctx.uiType.find((x) => x.token === 'control') || { size: 16, line: 16, weight: 500 };
    const sp5 = (ctx.space.find((s) => s.token === 'space-5') || { px: 20 }).px;
    // the 3x zoom is limited so a wide label font still fits its box
    const bw = bodyWidth(ctx, 'Save changes', ctl.size, ctl.weight) + sp5 * 2 + 12, Z = Math.max(1.6, Math.min(3, 440 / bw));
    const facts = [['Height', '44 px'], ['Sides', `${sp5} px`], ['Corner', `${ctx.radius.button} px`], ['Label', `${ctl.size}/${ctl.line}, ${ctl.weight}`]];
    const hero = field(ctx, 0, 128, 794, 164, D.surface, at(L, 16, 450, 132, U(ui.btn('Save changes'), 'dark', `zoom:${n1(Z)}`), { style: 'overflow:hidden' })
      + facts.map(([k, v], i) => hr(520, 14 + i * 34, 234, 'var(--hair)', 1) + lb(520, 24 + i * 34, 80, k) + mono(600, 23 + i * 34, 154, v, 'right', 'm13')).join('') + mono(L, 148, 300, `primary, ${n1(Z)}x`, 'left', 'm q'));
    // the variants by state, 1:1: a name on a bar down the left, a cell for each state
    const variants = [['Primary', 'primary', 'Save', 'Once per screen'], ['Secondary', 'secondary', 'Cancel', 'Beside the primary'], ['Quiet', 'quiet', 'Skip', 'Inside text'], ['Danger', 'danger', 'Discard', 'Throws work away']];
    const states = ['Default', 'Hover', 'Pressed', 'Focus', 'Disabled', 'Pressed, focus'], keys = ['', 'hover', 'pressed', 'focus', 'disabled', 'pf'];
    const btn = (v, lab, st) => { const h = ui.btn(lab, { variant: v, state: st === 'pf' ? 'pressed' : st || undefined }); return st === 'pf' ? h.replace('is-pressed', 'is-pressed is-focus') : h; };
    const MY = 346, HH = 56, RH = 72, RW = 108, c0 = L + RW, CWc = (CW - RW) / 6;
    let dk = sec(L, MY - 30, CW, 'Variants by state, 1:1', 'sides 10 px, as wide as the cell') + hr(L, MY, CW, 'var(--ink)', 1);
    states.forEach((s, i) => { dk += at(c0 + i * CWc + 4, MY + 8, 22, 22, mk(i + 1)) + at(c0 + i * CWc + 4, MY + 32, CWc - 6, 16, `<span class="lb" style="display:block;font-size:10px;letter-spacing:.04em;white-space:nowrap">${s}</span>`); });
    dk += hr(L, MY + HH, CW, 'var(--ink)', 2);
    variants.forEach(([n, v, lab, use], r) => {
      const y = MY + HH + r * RH;
      if (r) dk += hr(L, y, CW, 'var(--hair)', 1);
      dk += at(L, y + 10, RW - 8, 22, bar(ctx, n)) + at(L, y + 34, RW - 8, 28, `<div class="cap" style="font-size:11px;line-height:14px;color:var(--quiet);white-space:normal">${use}</div>`);
      keys.forEach((k, c) => {
        const h = btn(v, lab, k).replace(/^<(button|a) /, `<$1 style="padding:0 10px;max-width:${n1(CWc - 6)}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" `);
        dk += at(c0 + c * CWc, y + 14, CWc - 2, 44, `<div style="display:flex;justify-content:flex-start">${U(k === 'disabled' ? demo(h) : h)}</div>`);
      });
    });
    const fy = MY + HH + RH * 4;
    dk += hr(L, fy, CW, 'var(--ink)', 2) + lb(L, fy + 14, RW - 10, 'Primary fill');
    [roleHex(Lt, 'action'), roleHex(Lt, 'actionHover'), roleHex(Lt, 'actionPressed'), roleHex(Lt, 'focus'), roleHex(Lt, 'disabledBg'), roleHex(Lt, 'actionPressed')].forEach((h, i) => {
      dk += mono(c0 + i * CWc + 4, fy + 8, CWc, h, 'left') + mono(c0 + i * CWc + 4, fy + 24, CWc, ['fill', 'fill', 'fill', 'ring', 'fill', 'fill + ring'][i], 'left', 'm q');
    });
    dk += hr(L, fy + 48, CW, 'var(--hair)', 1);
    dk += at(L, fy + 58, CW, null, `<div class="cap" style="font-size:12px;line-height:17px">A disabled button is turned away: it can't be pressed or focused. Pressed with focus keeps the ring of ${roleHex(Lt, 'focus')} round the pressed fill.</div>`);
    // the sizes, standing on one baseline, a cell each
    const sy = fy + 140, sizes = [['Small', 36, { size: 'sm' }, 'Add'], ['Default', 44, {}, 'Add'], ['Large', 52, { size: 'lg' }, 'Add'], ['Icon left', 44, { iconLeft: 'plus' }, 'Add'], ['Icon right', 44, { iconRight: 'arrow-right' }, 'Next'], ['Icon only', 44, { size: 'icon', iconLeft: 'plus', attrs: 'aria-label="Add"' }, '']];
    let sz = sec(L, sy - 30, CW, 'Sizes, on one baseline') + '', cw = CW / 6;
    sizes.forEach(([n, h, o, lab], i) => {
      sz += (i ? vr(L + i * cw, sy + 6, 98, t0.hair) : '') + at(L + i * cw + 8, sy + 8 + (52 - h), cw - 12, h, `<div style="display:flex">${U(ui.btn(lab, o))}</div>`)
        + mono(L + i * cw + 8, sy + 70, cw - 12, n.toLowerCase(), 'left', 'm') + mono(L + i * cw + 8, sy + 86, cw - 12, `${h} px`, 'left', 'm q');
    });
    sz += hr(L, sy + 112, CW, 'var(--ink)', 2);
    return sheet(ctx, 'buttons', ground, head(ctx, 'buttons', 'Four variants in six states, in the kit\'s own CSS. Nothing here imitates a button.') + hero + dk + sz);
  },

  // ---- 9 Fields: each state in its own card under its name on a bar; the choices and selects on a dark card ----
  fields(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, ui = ctx.ui, ground = G.stock, t0 = tones(ctx, ground), brand = ctx.esc(realOf(ctx, ctx.brand.name)), bw = ctx.brand.ui.border;
    const cards = [
      ['Default', fld('d1', 'Website', { help: 'Shown on invoices and emails.' }), 146, `Edge ${roleHex(Lt, 'border')}, ${bw} px.`],
      ['Focus', fld('d2', 'Organisation name', { value: brand, state: 'focus' }), 146, `Ring ${roleHex(Lt, 'focus')}, 2 px, offset 2.`],
      ['Filled', fld('d3', 'Contact email', { value: 'name@example.com' }), 146, `Text ${roleHex(Lt, 'text')} on ${roleHex(Lt, 'surface')}.`],
      ['Error', fld('d4', 'Contact email', { value: 'name.example.com', error: 'Enter an email address with an @, like name@example.com.' }), 146, `Danger edge, ${roleHex(Lt, 'danger')}.`],
      ['Disabled', demo(fld('d5', 'Website', { disabled: true })), 146, `Turned away. Fill ${roleHex(Lt, 'disabledBg')}.`],
      ['Select', fld('d6', 'Section', { kind: 'select', opts: ['Profile', 'Notifications', 'Security'], value: 'Profile' }), 146, 'Same edge and ring as a field.'],
    ];
    let out = '';
    cards.forEach(([name, html, h, note], i) => {
      const col = i % 2, row = Math.floor(i / 2), x = L + col * 366, y = 128 + row * 180;
      out += at(x, y, 200, 22, bar(ctx, name)) + at(x + 96, y + 3, 252, 18, `<span class="cap" style="font-size:11px;line-height:18px;display:block;text-align:right;color:var(--quiet);white-space:nowrap">${note}</span>`) + field(ctx, x, y + 30, 348, h, Lt.surface, at(16, 14, 316, null, U(html)), `box-shadow:0 0 0 1px ${t0.hair}`);
    });
    // the choices and the segmented control, on the dark set
    const by = 128 + 3 * 180 + 4, bh = 1050 - by, ds = tones(ctx, D.surface), st = ['off', 'on', 'focus', 'disabled'], px = (c) => 120 + c * 62;
    let bk = lb(16, 14, 300, 'Choices, dark set') + hr(16, 36, 330, ds.ink, 2);
    ['Off', 'On', 'Focus', 'Disabled'].forEach((n, c) => { bk += at(px(c) - 6, 44, 62, 14, `<span class="lb" style="display:block;font-size:10px;letter-spacing:.04em;white-space:nowrap">${n}</span>`); });
    [['Checkbox', 'checkbox'], ['Radio', 'radio'], ['Switch', 'switch']].forEach(([n, ty], r) => {
      const y = 62 + r * 50; bk += hr(16, y, 330, ds.hair, 1) + at(16, y + 18, 100, 16, `<span class="lb">${n}</span>`);
      st.forEach((k, c) => { bk += at(px(c) - 6, y + 2, 62, 46, `<div style="display:flex">${U(choice(ty, k), 'dark')}</div>`); });
    });
    const seg = (dis) => ui.segmented(['Day', 'Week', 'Month'], 1, { disabled: dis }), sx = 392;
    bk += lb(sx, 14, 300, 'Segmented') + hr(sx, 36, 306, ds.ink, 2) + at(sx, 50, 260, null, U(seg(false), 'dark')) + mono(sx, 96, 100, 'default', 'left', 'm')
      + at(sx, 124, 260, null, demo(U(seg(true), 'dark'))) + mono(sx, 170, 200, 'disabled, turned away', 'left', 'm');
    const so = ['Profile', 'Notifications', 'Security'];
    bk += lb(16, 236, 300, 'Select, dark set') + hr(16, 258, 682, ds.ink, 2);
    [['Default', fld('s1', '', { kind: 'select', opts: so, value: 'Profile' })], ['Focus', fld('s2', '', { kind: 'select', opts: so, value: 'Notifications', state: 'focus' })], ['Disabled, turned away', demo(fld('s3', '', { kind: 'select', opts: so, value: 'Security', disabled: true }))]].forEach(([n, h], i) => {
      bk += at(16 + i * 236, 278, 210, null, U(h, 'dark', 'width:210px')) + mono(16 + i * 236, 332, 210, n, 'left', 'm');
    });
    out += field(ctx, L, by, CW, Math.min(bh, 372), D.surface, bk);
    return sheet(ctx, 'fields', ground, head(ctx, 'fields', 'Every state is the engine\'s own class: is-focus, is-disabled, aria-invalid.') + out);
  },

  // ---- 10 Feedback: alerts in both sets, status words as a list, the toast at 2x on a Night band, then loading and the empty state ----
  feedback(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, D = ctx.roles.dark, ui = ctx.ui, ground = G.stock, N = iconSet(ctx).length;
    const al = [['info', 'Changes apply to every page.'], ['success', 'Profile saved.'], ['warning', 'Your session ends in 5 minutes.'], ['danger', "We couldn't save. Check your connection and try again."]];
    const stack = () => al.map(([k, t], i) => `<div style="margin-bottom:${i < 3 ? 12 : 0}px">${ui.alert(k, t)}</div>`).join('');
    const AY = 128, AH = 292, panel = (set, mode, x, title) => field(ctx, x, AY, 345, AH, set.surface, lb(16, 14, 300, title) + hr(16, 36, 313, tones(ctx, set.surface).ink, 2) + at(16, 50, 313, null, U(stack(), mode)), `box-shadow:0 0 0 1px ${tones(ctx, ground).hair}`);
    const stat = ctx.status.slice(0, 6), sy = AY + AH + 48;
    let st = sec(L, sy, CW, 'Status words', 'one colour, never a pill');
    stat.forEach((s, i) => {
      const col = i % 2, r = Math.floor(i / 2), x = L + col * 366, y = sy + 38 + r * 44, hex = String(statusText(ctx, 'light', s).hex).toUpperCase();
      st += hr(x, y, 348, 'var(--hair)', 1) + at(x, y + 8, 130, 28, U(ui.statusChip(s.id))) + mono(x + 150, y + 14, 90, hex, 'left', 'm13') + mono(x + 250, y + 14, 98, `${ctx.fmt(ctx.ratio(hex, Lt.surface))} : 1`, 'right', 'm13 q');
    });
    const ty = sy + 38 + Math.ceil(stat.length / 2) * 44 + 36;
    const toast = field(ctx, 0, ty, 794, 128, G.night, at(L, 24, CW - 60, 80, U(ui.toast('Organisation profile saved.'), 'dark', 'zoom:2'), { style: 'overflow:hidden' }) + mono(R - 60, 100, 60, "2x", 'right', 'm q'));
    const ly = ty + 128 + 40;
    const load = sec(L, ly, 330, 'Loading') + at(L, ly + 38, 330, 40, `<div style="display:flex;gap:20px;align-items:center">${U(ui.spinner())}${U(`<div style="display:flex;flex-direction:column;gap:8px;width:220px">${ui.skeleton('100%')}${ui.skeleton('72%')}</div>`)}</div>`);
    const empty = sec(L + 366, ly, 348, 'Empty state') + at(L + 366, ly + 34, 348, null, U(`<div class="ui-empty"><h3 class="ui-empty__title">Nothing matches &quot;serif&quot;</h3><p class="ui-empty__text">Clear the search to see all ${N} icons.</p>${ui.btn('Clear search', { variant: 'secondary' })}</div>`));
    return sheet(ctx, 'feedback', ground, head(ctx, 'feedback', 'Four alerts in both sets, status as plain words, the toast, loading and an empty list.') + panel(Lt, 'light', L, 'Alerts, light set') + panel(D, 'dark', L + 369, 'Alerts, dark set') + st + toast + load + empty);
  },

  // ---- 11 Overlays: the dark table with its hover row, then the screen under its scrim with the 480 dialog, three markers and their rows ----
  overlays(ctx) {
    const D = ctx.roles.dark, Lt = ctx.roles.light, ground = D.surface, ui = ctx.ui, t = tones(ctx, ground), E = ctx.esc;
    const steps = [...ctx.uiType].sort((a, b) => b.size - a.size).slice(0, 3), TY = 168;
    const rows = steps.map((st, i) => `<tr${i === 1 ? ' class="is-hover"' : ''}><td>${E(st.token)}</td><td style="font-variant-numeric:tabular-nums">${st.size}/${st.line}</td><td>${st.weight}</td><td>${E(st.use)}</td></tr>`).join('');
    const table = sec(L, 128, CW, 'Table, dark set', 'row 2 is the hover row') + `<div class="a ui" data-theme="dark" style="left:${L}px;top:${TY}px;width:${CW}px"><table class="ui-table"><colgroup><col style="width:130px"><col style="width:110px"><col style="width:110px"><col></colgroup><thead><tr><th>Step</th><th>Size / line</th><th>Weight</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const PY = 446, PH = 392, s = CW / 1024, DW = 480, dx0 = L + (CW - DW) / 2, mid = PY + PH / 2;
    const dlg = ui.dialog({ title: 'Discard your changes?', body: "Your edits to Contact email haven't been saved.", keep: 'Keep editing', confirm: 'Discard', danger: true }).replace('class="ui-dialog"', 'class="ui-dialog" style="max-width:480px;width:480px"');
    const scene = sec(L, PY - 38, CW, 'Dialog over the scrim', 'the light screen under it')
      + `<div class="a" data-contrast="demo" style="left:${L}px;top:${PY}px;width:${CW}px;height:${PH}px;overflow:hidden">${screenAt(ctx, 'light', 'lg-ov', 0, 0, s, PH / s, false)}</div>`
      + `<div class="a ui ui-scrim" data-theme="light" style="left:${L}px;top:${PY}px;width:${CW}px;height:${PH}px;opacity:.78;padding:0" aria-hidden="true"></div>`
      + `<div class="a ui tr" data-theme="light" style="left:${L}px;top:${PY}px;width:${CW}px;height:${PH}px;display:grid;place-items:center">${dlg}</div>`
      + at(L + 10, PY + PH - 30, 20, 20, mk(1)) + at(dx0 + DW - 10, mid - 74, 20, 20, mk(2)) + at(dx0 + DW - 44, mid + 52, 20, 20, mk(3));
    const info = [['Scrim', roleHex(Lt, 'scrim'), 'Laid at 78% over the screen. Padding 24, content centred.'], ['Dialog', roleHex(Lt, 'surface'), `Surface, ${ctx.brand.ui.border} px edge, corner ${ctx.radius.card}. 480 wide.`], ['Danger button', roleHex(Lt, 'danger'), 'The one way to throw work away. Keep editing comes first.']];
    const iy = PY + PH + 18;
    const list = info.map(([n, hex, d], i) => hr(L, iy + i * 48, CW, i ? t.hair : t.ink, i ? 1 : 2) + at(L, iy + i * 48 + 14, 24, 22, mk(i + 1)) + at(L + 36, iy + i * 48 + 10, 150, 28, `<span class="h2" style="font-size:18px;line-height:28px">${n}</span>`)
      + mono(L + 190, iy + i * 48 + 16, 90, hex, 'left', 'm13') + cap(L + 290, iy + i * 48 + 8, 424, d, 'font-size:12px;line-height:17px')).join('');
    return sheet(ctx, 'overlays', ground, head(ctx, 'overlays', 'A dialog sits over a scrim at 78%. The table keeps one row in its hover state.') + table + scene + list);
  },

  // ---- 12 Space: spacing as bars on a list, radii as corners, icons in four columns, borders and the float shadow ----
  space(ctx) {
    const G = groundsOf(ctx), Lt = ctx.roles.light, ui = ctx.ui, ground = G.stock, E = ctx.esc, t = tones(ctx, ground);
    const steps = [...ctx.space].sort((a, b) => a.px - b.px), RH = 22;
    let y = 128, out = sec(L, y, CW, 'Spacing, true size', `${steps.length} steps`); y += 32;
    steps.forEach((s, i) => {
      out += mono(L, y + i * RH + 3, 120, E(String(s.token)), 'left', 'm') + at(L + 130, y + i * RH + 3, Math.min(s.px, 520), 16, '', { style: `background:var(--sig)` }) + mono(L + 130 + Math.min(s.px, 520) + 10, y + i * RH + 3, 60, `${s.px}`, 'left', 'm13');
    });
    y += steps.length * RH + 20;
    const radii = [...ctx.radii].sort((a, b) => a.px - b.px).slice(0, 7), rw = CW / Math.max(1, radii.length);
    out += sec(L, y, CW, 'Radius, as the kit sets it'); y += 32;
    radii.forEach((r, i) => { out += at(L + i * rw, y, rw - 14, 64, '', { style: `background:var(--ink);border-radius:${Math.min(r.px, 32)}px` }) + mono(L + i * rw, y + 72, rw, E(String(r.token).replace(/^radius-/, '')), 'left', 'm') + mono(L + i * rw, y + 88, rw, r.px >= 999 ? 'full' : `${r.px} px`, 'left', 'm q'); });
    y += 120;
    const B = ctx.brand.ui, sh = E(String(tokenGroups(ctx).shadow['shadow-float'])), icons = iconSet(ctx), CH = 44;
    const avail = Math.max(2, Math.floor((1056 - 92 - y - 40) / CH)), shown = icons.slice(0, Math.min(24, avail * 4)), rows = Math.ceil(shown.length / 4);
    out += sec(L, y, CW, 'Icons, 24 px', shown.length === icons.length ? `all ${icons.length}` : `${shown.length} of ${icons.length}`); y += 32;
    shown.forEach((n, i) => {
      let sv = ''; try { sv = ui.icon(n, 24); } catch { /* an icon the loader lacks stays an empty cell */ }
      const cx = L + (i % 4) * 183, cy = y + Math.floor(i / 4) * CH;
      out += (i % 4 === 0 ? hr(L, cy, CW, t.hair, 1) : '') + at(cx, cy + 10, 24, 24, `<div class="ui tr" data-theme="light" style="width:24px;height:24px;color:var(--ink)">${sv}</div>`) + mono(cx + 34, cy + 14, 130, E(n), 'left', 'm');
    });
    y += rows * CH + 14;
    out += sec(L, y, CW, 'Borders and shadow'); y += 32;
    out += at(L, y + 10, 150, 0, '', { style: `border-top:${B.border}px solid ${Lt.border}` }) + mono(L, y + 20, 160, `Edge, ${B.border} px`, 'left', 'm')
      + at(L + 190, y + 10, 150, 0, '', { style: `border-top:1px solid ${Lt.divider}` }) + mono(L + 190, y + 20, 160, 'Divider, 1 px', 'left', 'm')
      + at(L + 400, y - 2, 150, 44, '', { style: `background:${Lt.surface};border:${B.border}px solid ${Lt.border};border-radius:${ctx.radius.card}px;box-shadow:${sh === 'none' ? 'none' : sh}` }) + mono(L + 570, y + 6, 144, 'shadow-float', 'left', 'm') + mono(L + 570, y + 22, 144, sh === 'none' ? 'none' : 'on a card', 'left', 'm q');
    return sheet(ctx, 'space', ground, head(ctx, 'space', 'Spacing, radius and icons at true size, as the tokens set them.') + out);
  },

  // ---- 13 Handoff: "Set in" on Night, then the tokens.css variables in three columns and the files ----
  handoff(ctx) {
    const G = groundsOf(ctx), D = ctx.roles.dark, B = ctx.brand, E = ctx.esc, ground = G.night;
    const tok = tokensCss(ctx), blockCss = tok.slice(tok.indexOf(':root {') + 7, tok.indexOf('}'));
    const grp = (n) => (/^sp-/.test(n) ? 'Space' : /^r-/.test(n) ? 'Radius' : /^w-/.test(n) ? 'Width' : /^ff-/.test(n) ? 'Font' : /^(fs|lh|fw)-/.test(n) ? 'Text' : /^shadow-/.test(n) ? 'Shadow' : /^palette-/.test(n) ? 'Palette' : 'Colour');
    const groups = {};
    blockCss.split('\n').map((l) => /^\s*--([\w-]+):\s*(.+?);\s*$/.exec(l)).filter(Boolean).forEach(([, n, v]) => { (groups[grp(n)] = groups[grp(n)] || []).push([n, v]); });
    const hero = at(L, 128, 440, 22, bar(ctx, 'Set in')) + at(L, 164, 450, null, `<div class="d" style="font-size:38px;line-height:1.08;white-space:normal">${E(fontName(B.fonts.display))} and ${E(fontName(B.fonts.body))}.</div>`)
      + at(L, 236, 440, 40, `<div class="m13" style="white-space:normal">${E(ctx.versionLine || '')}</div>`)
      + hr(540, 128, 214, 'var(--ink)', 2) + lb(540, 138, 214, 'Files in the kit')
      + at(540, 162, 214, null, '<div class="m13" style="white-space:normal;line-height:19px;columns:2;column-gap:12px">tokens.css<br>tokens.json<br>tokens.ts<br>tailwind.css<br>components.css<br>fonts.css<br>example.html<br>README</div>');
    const names = Object.keys(groups), LH = 15, HEAD = 34, CWc = 238, cols = [[], [], []], hs = [0, 0, 0];
    names.map((g) => [g, HEAD + groups[g].length * LH + 12]).sort((a, b) => b[1] - a[1]).forEach(([g, h]) => { const c = hs.indexOf(Math.min(...hs)); cols[c].push(g); hs[c] += h; });
    const T0 = 346; let body = '';
    cols.forEach((gs, c) => {
      let y = T0; const x = L + c * CWc;
      gs.forEach((g) => {
        body += hr(x, y, CWc - 20, 'var(--ink)', 2) + lb(x, y + 10, CWc - 70, g === 'Colour' ? 'Colour, light set' : g) + mono(x, y + 10, CWc - 20, `${groups[g].length}`, 'right', 'm q');
        groups[g].forEach(([nm, v], i) => {
          const yy = y + HEAD + i * LH, sw = /^#[0-9a-f]{6}$/i.test(v) ? `<i style="display:inline-block;width:9px;height:9px;margin-right:5px;background:${v};box-shadow:0 0 0 1px var(--hair)"></i>` : '';
          body += at(x, yy, 112, LH, `<span class="m" style="display:block;overflow:hidden;text-overflow:ellipsis">--${nm}</span>`) + at(x + 114, yy, CWc - 136, LH, `<span class="m q" style="display:block;overflow:hidden;text-overflow:ellipsis">${sw}${E(v)}</span>`);
        });
        y += HEAD + groups[g].length * LH + 12;
      });
    });
    const end = T0 + Math.max(...hs);
    body += cap(L, Math.min(end + 6, 1030), CW, `The variables of tokens.css, light set. The dark set is on [data-theme="dark"], where Surface is ${E(String(D.surface).toUpperCase())}. Every page of this guide is read from these.`, 'font-size:12px;line-height:17px');
    return sheet(ctx, 'handoff', ground, head(ctx, 'handoff', 'The type, the variables of tokens.css and the files in the kit.') + hero + body);
  },
};
