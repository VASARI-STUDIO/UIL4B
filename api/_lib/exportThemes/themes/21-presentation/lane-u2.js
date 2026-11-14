// Lane u2 for theme 21 (UI kit components): states, buttons, inputs, choices, cards, navigation, lists, status, feedback.
// The pages carry on from lane-u1.js in the guidelines' slide language: full-height fields in the brand's role colours meeting at straight edges,
// one big thing a slide (a display line, or one component drawn large), chrome at 12 to 15 px, and the one running head at y 28 with its folio.
// Every component is the real ctx.ui markup inside a .ui region, with states forced by the .is-* classes components.css ships, so the page
// documents the code package and never restyles it. Colours come by role, values are read from ctx, and copy comes from brand.json.
// The kit tokens and componentsCss are already in the theme's css (css-kit.js), so this lane adds only its own u2- layout classes.
import { deliveryRows } from './once.js';
import { A } from './helpers.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { colourMap, statusText } from '../../engine/tokens.js';

// ---- measuring (copied from lane-u1.js, which keeps them private) ------------------------------------------------------------
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const textW = (ctx, role, weight, text, size, track = 0) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, size, track); return (o.x2 - Math.min(0, o.x1)) * 1.02; };
const topForBaseline = (ctx, role, weight, size, lh, y) => { const f = loadFont(face(ctx, role, weight).stem), u = f.unitsPerEm, asc = f.ascender / u, desc = -f.descender / u; return +(y - ((lh * size - (asc + desc) * size) / 2 + asc * size)).toFixed(1); };
function greedy(ctx, role, weight, text, size, maxW, track = 0) {
  const out = []; let cur = '';
  for (const w of String(text).split(' ')) { const t = cur ? `${cur} ${w}` : w; if (cur && textW(ctx, role, weight, t, size, track) > maxW) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}
const fitOne = (ctx, texts, hi, lo, maxW, track = -0.01) => { for (let s = hi; s > lo; s--) if (texts.every((t) => textW(ctx, 'display', dispW(ctx), t, s, track) <= maxW)) return s; return lo; };
function fitLines(ctx, text, hi, lo, maxW, maxLines) {
  for (let s = hi; s > lo; s--) { const l = greedy(ctx, 'display', dispW(ctx), text, s, maxW, -0.01); if (l.length <= maxLines) return { size: s, lines: l }; }
  return { size: lo, lines: greedy(ctx, 'display', dispW(ctx), text, lo, maxW, -0.01) };
}
const lineHtml = (lines) => lines.map((l) => `<span class="r-ln">${A(l)}</span>`).join('');
const px = (n) => +(+n).toFixed(2);
const words = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'][n] || String(n);

// ---- colour roles and the chrome rule (as in lane-u1.js) ---------------------------------------------------------------------
const L = (ctx) => ctx.roles.light;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
const chromeOn = (ctx, ...hexes) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, ctx.roles.dark.quiet].find((c) => hexes.every((h) => ctx.ratio(c, h) >= 4.5));
  return q || [L(ctx).text, L(ctx).surface, ctx.roles.dark.textSoft].sort((a, b) => Math.min(...hexes.map((h) => ctx.ratio(b, h))) - Math.min(...hexes.map((h) => ctx.ratio(a, h))))[0];
};
const rt = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}&nbsp;:&nbsp;1`;

const box = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="r-a ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
const field = (x, y, w, h, hex, st = '') => box(x, y, w, h, `background:${hex};${st}`);
const p = (cls, text, st = '') => `<p class="${cls}"${st ? ` style="${st}"` : ''}>${text}</p>`;
const mono = (t) => `<span class="u2-m">${A(t)}</span>`;
const grid = (ctx) => { const cw = (ctx.size.w - 112 - 11 * 16) / 12; return { col: (n) => 56 + n * (cw + 16), span: (k) => k * cw + (k - 1) * 16 }; };

// the one running head, the same form lane-u1.js draws
const docName = (ctx) => `${ctx.brand.name} UI kit`;
function head(ctx, id, { left = [L(ctx).surface], right } = {}) {
  const pg = ctx.pages.find((x) => x.id === id);
  const cl = chromeOn(ctx, ...left), cr = chromeOn(ctx, ...(right || left));
  const folio = String(ctx.pageNo(id)).padStart(3, '0');
  return `<div class="r-hd"><span class="r-hl num" style="color:${cl}">${pg.ref ? `<b>${pg.ref}</b>` : ''}${A(pg.title)}</span><span class="r-hr num" style="color:${cr}"><i>${A(docName(ctx))}</i><b>${folio}</b></span></div>`;
}
const page = (id, inner, bg, cls = '') => `<section class="pg pg--r u2 ${cls}" data-page="${id}" style="background:${bg}">${inner}</section>`;
// a .ui region that reads the kit's tokens but lets the field show through; zoom draws a component larger and keeps its text vector
const uiR = (inner, { dark = false, st = '', zoom } = {}) => `<div class="ui u2-ui"${dark ? ' data-theme="dark"' : ''} style="${zoom ? `zoom:${zoom};` : ''}${st}">${inner}</div>`;
import { screenContent as sc } from './once.js';
// the panel field that components can sit on: the sunken ground if the quiet text still reads on it, else the raised one
const panelOf = (ctx) => [L(ctx).sunken, L(ctx).raised].find((c) => ctx.ratio(L(ctx).quiet, c) >= 4.5) || L(ctx).surface;
// the extra sample words the code package's example page uses (brand.json ui.screen.content.example)
const ex = (ctx) => sc(ctx).example || {};

// a display line at the largest size from hi down to lo that sets in maxLines of w, its last baseline at y
function display(ctx, text, x, y, w, ink, { hi = 54, lo = 32, maxLines = 2, lh = 1.02 } = {}) {
  const f = fitLines(ctx, text, hi, lo, w, maxLines), first = y - (f.lines.length - 1) * f.size * lh;
  return { html: box(x, topForBaseline(ctx, 'display', dispW(ctx), f.size, lh, first), w, 0, `color:${ink};font-size:${f.size}px;line-height:${lh}`, `<h2 class="disp">${lineHtml(f.lines)}</h2>`), size: f.size, lines: f.lines.length, top: topForBaseline(ctx, 'display', dispW(ctx), f.size, lh, first) };
}
// body copy wrapped into explicit lines, so the line count laid out is the count that renders
const copy = (ctx, text, x, y, w, ink, size = 15, weight = 400) => box(x, y, w, 0, `color:${ink}`, p(size === 15 ? `r-t15${weight === 600 ? ' r-w600' : ''}` : 'r-t12', lineHtml(greedy(ctx, 'body', weight, text, size, w))));
const nLines = (ctx, text, w, size = 12, weight = 400) => greedy(ctx, 'body', weight, text, size, w).length;

export const uikit = {
  // States: the deck's band carries the rule; under it the same controls stand in five columns, rest to disabled, as one build.
  states(ctx) {
    const W = ctx.size.w, R = L(ctx), S = sc(ctx), F = S.form, E = ex(ctx), ui = ctx.ui, G = grid(ctx), act = byRole(ctx, 'action').hex, onA = inkOn(ctx, act), white = R.surface;
    const bandH = 232, ch = chromeOn(ctx, white);
    let out = field(0, 0, W, bandH, act);
    out += display(ctx, 'One control, five states.', 56, bandH - 40, G.span(7), onA).html;
    out += copy(ctx, 'A state changes the fill, the edge or the ring, never the layout, so nothing on the screen jumps when a hand or a key arrives.', G.col(8), 104, G.span(4), onA);
    const n = 5, cw = (W - 112 - (n - 1) * 16) / n, fw = ctx.borders[2].px;
    const tok = (t) => mono(t);
    const cols = [
      ['Rest', `The control as it sits on the page.`, ''],
      ['Hover', `Action steps to ${tok('--action-hover')}. Outlined buttons fill ${tok('--sunken')}.`, 'hover'],
      ['Focus', `A ${fw} px ring in ${tok('--focus')}, on a ${fw} px gap of the ground.`, 'focus'],
      ['Pressed', `Action steps to ${tok('--action-pressed')} and the button scales to 0.97.`, 'pressed'],
      ['Disabled', `${tok('--disabled-bg')} fill, ${tok('--disabled-text')} type, no edge.`, 'disabled'],
    ];
    const nameSize = fitOne(ctx, cols.map((c) => c[0]), 26, 18, cw);
    const sec = E.secondary || S.call;
    cols.forEach(([name, note, st], j) => {
      const x = 56 + j * (cw + 16);
      out += box(x, topForBaseline(ctx, 'display', dispW(ctx), nameSize, 1.1, 288), cw, 0, `color:${R.text};font-size:${nameSize}px;line-height:1.1`, `<h2 class="disp r-nw">${A(name)}</h2>`);
      out += box(x, 304, cw, 48, `color:${ch}`, p('r-t12', note));
      // the primary is never shown disabled: in that column it keeps its place and says what it does instead
      const prim = st === 'disabled' ? box(x, 368, cw, 48, `color:${R.text}`, p('r-t12', `A primary is never disabled. It stays live and says what is missing: ${A(F.bookWhy)}`))
        : box(x, 368, cw, 44, '', uiR(ui.btn(F.book, { state: st || undefined })));
      out += prim + box(x, 428, cw, 44, '', uiR(ui.btn(sec, { variant: 'secondary', state: st || undefined })));
      if (st === 'hover' || st === 'pressed') {
        out += box(x, 488, cw, 0, `color:${ch}`, p('r-t12', 'Fields and choices have no hover or pressed state. They answer to focus.'));
      } else {
        const fid = `u2st${j}`;
        out += box(x, 488, cw, 0, '', uiR(ui.field({ id: fid, label: F.ready, value: F.readyValue, state: st === 'focus' ? 'focus' : undefined, disabled: st === 'disabled' })));
        out += box(x, 580, cw, 44, '', uiR(ui.check((E.checks || [F.notes])[0], { checked: true, state: st === 'focus' ? 'focus' : undefined, disabled: st === 'disabled' })));
      }
    });
    return page('states', out + head(ctx, 'states', { left: [act] }), white);
  },

  // Buttons: the primary drawn three times its size on the text field, as the slide's one big thing; the variants stand down the white beside it.
  buttons(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), F = S.form, E = ex(ctx), ui = ctx.ui, dark = byRole(ctx, 'text').hex, white = R.surface;
    const onD = inkOn(ctx, dark), chD = chromeOn(ctx, dark), chW = chromeOn(ctx, white), fx = 640, Z = 3;
    const act = byRole(ctx, 'action'), ctl = ctx.uiType.find((t) => t.token === 'control'), pad = ctx.space.find((s) => s.token === 'space-5') || { px: 20 };
    let out = field(0, 0, fx, H, dark);
    out += display(ctx, 'One action a screen, and it says what it does.', 56, 224, fx - 112, onD, { maxLines: 3, lo: 30 }).html;
    out += box(56, 264, fx - 112, 44 * Z, '', uiR(ui.btn(F.book), { zoom: Z }));
    out += box(56, 264 + 44 * Z + 16, fx - 112, 16, `color:${chD}`, p('r-t12', `Drawn at ${Z} times. The values below are at true size.`));
    const spec = [
      ['Height', '44 px'], ['Padding', `${pad.px} px a side`], ['Radius', `${ctx.radius.button} px`],
      ['Label', `${ctx.brand.fonts.body.family} ${ctl.weight}, ${ctl.size} px`], ['Fill', act.hex], ['Label on fill', rt(ctx, R.actionLabel, R.action)],
    ];
    spec.forEach(([k, v], i) => {
      const x = 56 + (i % 3) * 184, y = 560 + Math.floor(i / 3) * 48;
      out += box(x, y, 168, 40, '', p('r-t12', A(k), `color:${chD}`) + p('r-t15 num', v.startsWith('#') ? mono(v) : v.includes('&nbsp;') ? v : A(v), `color:${onD}`));
    });
    // the variants, one to a row on the white, the real button left and what it is for right
    const rows = [
      [ui.btn(F.book), 'Primary', `${act.name} fill. One a screen, for the step that moves things on.`],
      [ui.btn(E.secondary || S.call, { variant: 'secondary' }), 'Secondary', `A ${ctx.borders[1].px} px edge in the text colour. Everything else a screen offers.`],
      [ui.btn(E.quiet || S.call, { variant: 'quiet' }), 'Quiet', 'Underlined, no fill. For a way out that costs nothing.'],
      [ui.btn(E.danger || S.dialog.confirm, { variant: 'danger' }), 'Danger', 'Only for what cannot be undone, and only after a dialog asks.'],
      [ui.btn(E.small || F.book, { variant: 'secondary', size: 'sm' }), 'Small, 36 px', 'Inside rows and cards, where 44 would crowd the line.'],
      [ui.btn(F.book, { size: 'lg', iconRight: 'arrow-right' }), 'Large, 52 px', 'The last step of a flow. One a screen at most.'],
    ];
    const rx = fx + 56, cw = 232, tx = rx + cw + 24, tw = W - 56 - tx;
    rows.forEach(([b, n, u], i) => {
      const y = 96 + i * 92;
      out += box(rx, y, W - 56 - rx, 92, `box-shadow:inset 0 1px 0 ${R.divider}`);
      out += box(rx, y + 24, cw, 52, 'display:flex;align-items:center', uiR(b));
      out += box(tx, y + 20, tw, 0, `color:${R.text}`, p('r-t15 r-w600 r-nw', A(n)) + p('r-t12', lineHtml(greedy(ctx, 'body', 400, u, 12, tw)), `color:${chW}`));
    });
    out += box(rx, 96 + rows.length * 92, W - 56 - rx, 1, `background:${R.divider}`);
    return page('buttons', out + head(ctx, 'buttons', { left: [dark], right: [white] }), white);
  },

  // Inputs: the rule as the slide's line on the white; the text field's five states run down the panel field, the select and text area beside them.
  inputs(ctx) {
    const W = ctx.size.w, R = L(ctx), S = sc(ctx), F = S.form, ui = ctx.ui, white = R.surface, panel = panelOf(ctx), fx = 512;
    const chW = chromeOn(ctx, white), chP = chromeOn(ctx, panel);
    let out = field(fx, 0, W - fx, ctx.size.h, panel);
    const hl = display(ctx, 'The label always shows.', 56, 216, fx - 112, R.text, { maxLines: 3 });
    out += hl.html;
    out += copy(ctx, 'It sits above the field and never moves into it. A hint sits under the field and turns into the error when there is one.', 56, 256, fx - 112 - 24, R.text);
    out += copy(ctx, `An error says what to enter, not what went wrong: ${F.readyError}`, 56, 256 + 24 * nLines(ctx, 'It sits above the field and never moves into it. A hint sits under the field and turns into the error when there is one.', fx - 136, 15) + 24, fx - 112 - 24, R.text);
    const fw = ctx.borders[2].px;
    const rows = [
      ['Rest', `${mono('--edge')}, ${ctx.borders[1].px} px`, { id: 'u2in1', label: F.pickup }],
      ['Focus', `Edge to ${mono('--text')}, ${fw} px ring`, { id: 'u2in2', label: F.pickup, value: F.pickupValue, state: 'focus' }],
      ['Filled', 'Type in the text colour', { id: 'u2in3', label: F.dropoff, value: F.dropoffValue }],
      ['Error', `Edge and message in ${mono('--danger')}`, { id: 'u2in4', label: F.ready, value: F.readyValue, error: F.readyError }],
      ['Disabled', `${mono('--disabled-bg')}, no edge`, { id: 'u2in5', label: F.pickup, value: F.pickupValue, disabled: true }],
    ];
    const nx = fx + 56, cx = nx + 128, cw = 296;
    let y = 96;
    rows.forEach(([n, note, o]) => {
      // the name sits level with the control, under the field's label
      out += box(nx, y + 26, 112, 0, '', p('r-t15 r-w600 r-nw', A(n), `color:${R.text}`) + p('r-t12', note, `color:${chP}`));
      out += box(cx, y, cw, 0, '', uiR(ui.field(o)));
      y += o.error ? 96 + 18 * nLines(ctx, o.error, cw, 14, 500) : 104;
    });
    const sx = cx + cw + 40, sw = W - 56 - sx;
    out += box(sx, 96, sw, 0, '', uiR(ui.field({ id: 'u2in6', label: F.size, kind: 'select', options: F.sizes, value: F.sizes[1] })));
    out += box(sx, 200, sw, 0, '', uiR(ui.field({ id: 'u2in7', label: F.notes, kind: 'textarea', help: F.notesHelp })));
    out += box(sx, 404, sw, 0, `color:${chP}`, p('r-t12', 'The select and the text area take the same edge, ring and states as the text field.'));
    return page('inputs', out + head(ctx, 'inputs', { left: [white], right: [panel] }), white);
  },

  // Choices: three fields side by side, one control each, the way Personality stands its three traits; the segmented control on the dark band below.
  choices(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), D = ctx.roles.dark, S = sc(ctx), F = S.form, E = ex(ctx), ui = ctx.ui, bandTop = 560;
    const grounds = [R.surface, R.raised, R.sunken], fw = W / 3, dark = byRole(ctx, 'text').hex;
    const pick = (list, i) => (list && list.length ? list[i % list.length] : F.notes);
    const states = [['Off', {}], ['On', { checked: true }], ['Focus', { checked: true, state: 'focus' }], ['Disabled', { disabled: true }], ['Disabled, on', { disabled: true, checked: true }]];
    const kinds = [
      ['Checkbox', (o, i) => ui.check(pick(E.checks, i), o), 'Any number can be on. A tick on the text colour.'],
      ['Radio', (o, i) => ui.check(pick(E.radios, i), { ...o, type: 'radio', name: `u2rd${i}` }), 'One of a set, so one is always on. A dot in the text colour.'],
      ['Switch', (o, i) => ui.switch(pick(E.switches, i), o), 'Takes effect at once, with no Save. On fills with the action colour.'],
    ];
    const size = fitOne(ctx, kinds.map((k) => k[0]), 54, 32, fw - 88);
    let out = '';
    kinds.forEach(([name, make, rule], k) => {
      const x = k * fw, bg = grounds[k], ch = chromeOn(ctx, bg), tx = x + 56, tw = fw - 88;
      out += field(x, 0, fw, bandTop, bg, k ? `box-shadow:inset 1px 0 0 ${R.divider}` : '');
      out += box(tx, topForBaseline(ctx, 'display', dispW(ctx), size, 1, 152), tw, 0, `color:${R.text};font-size:${size}px;line-height:1`, `<h2 class="disp r-nw">${A(name)}</h2>`);
      states.forEach(([sn, o], i) => {
        const y = 192 + i * 56;
        out += box(tx, y + 14, 88, 16, `color:${ch}`, p('r-t12 r-nw', A(sn)));
        out += box(tx + 96, y, tw - 96, 44, '', uiR(make(o, i)));
      });
      out += copy(ctx, rule, tx, 192 + states.length * 56 + 16, tw, ch, 12);
    });
    const onD = inkOn(ctx, dark), chD = chromeOn(ctx, dark);
    out += field(0, bandTop, W, H - bandTop, dark);
    const seg = box(56, bandTop + 52, 0, 44, 'white-space:nowrap', uiR(ui.segmented(F.sizes, 1), { dark: true }));
    const segW = 2 + F.sizes.reduce((s, t) => s + textW(ctx, 'body', 500, t, ctx.uiType.find((x) => x.token === 'label').size) + 32 + 2, 0);
    out += seg + box(Math.max(56 + segW + 48, grid(ctx).col(6)), bandTop + 48, grid(ctx).span(5), 0, '', p('r-t15 r-w600', 'Segmented', `color:${onD}`) +
      p('r-t12', lineHtml(greedy(ctx, 'body', 400, 'One choice from a few, always one selected. The selected segment fills with the text colour. Shown here in dark mode.', 12, grid(ctx).span(5))), `color:${chD}`));
    return page('choices', out + head(ctx, 'choices', { left: [grounds[0]], right: [grounds[2]] }), R.surface);
  },

  // Cards: the rule on the action field; the real cards at true size on the white, the one with media largest.
  cards(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), E = ex(ctx), ui = ctx.ui, B = ctx.brand, white = R.surface, fx = 448;
    const act = byRole(ctx, 'action').hex, onA = inkOn(ctx, act), ch = chromeOn(ctx, white);
    let out = field(0, 0, fx, H, act);
    out += display(ctx, 'A card holds one thing.', 56, 216, fx - 112, onA, { maxLines: 3 }).html;
    out += copy(ctx, `A card is the surface with a ${ctx.borders[0].px} px hairline. A raised card swaps the hairline for the raised ground. Neither casts a shadow.`, 56, 256, fx - 112, onA);
    // the card's photo: a shot the brand has not given to its cover, else its first; a brand with no photos gets the engine's photo slot
    const shots = (B.imagery && B.imagery.shots) || [];
    // the cover shot is the brand's widest safe frame (the kit has no photo cover of its own, so it is not shown twice here)
    const shot = shots.find((s) => s.photo && (s.use || []).includes('cover')) || shots.find((s) => s.photo) || shots[0];
    const media = shot ? ctx.photo(shot.id, { cls: 'ui-card__media', slotNote: false, pos: shot.focus ? `${shot.focus.x ?? 50}% ${shot.focus.y ?? 50}%` : undefined }) : '';
    const mx = fx + 56, mw = 360, rx = mx + mw + 32, rw = W - 56 - rx;
    out += box(mx, 96, mw, 0, '', uiR(ui.card({ media, meta: S.status, title: S.eta, text: S.pickup, action: `<div>${ui.btn(E.secondary || S.call, { variant: 'secondary', size: 'sm' })}</div>` })));
    out += box(mx, 512, mw, 0, `color:${ch}`, p('r-t15 r-w600', shot ? 'With media' : 'With a media slot', `color:${R.text}`) + p('r-t12', lineHtml(greedy(ctx, 'body', 400, 'The photo takes 16 : 9 at the top and the card keeps its hairline round it.', 12, mw))));
    out += box(rx, 96, rw, 0, '', uiR(ui.card({ meta: S.status, title: S.rider, text: S.riderNote })));
    out += box(rx, 240, rw, 0, '', uiR(ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.eta, raised: true })));
    out += box(rx, 384, rw, 0, '', uiR(ui.stat(S.paid, S.paidLabel)));
    const notes = [['Plain', 'Meta, title and one line, on the hairline.'], ['Raised', `The ${mono('--raised')} ground and no edge, for a second level.`], ['Stat', 'One number and its label. The number is in the display face.']];
    out += box(rx, 500, rw, 0, `color:${ch}`, notes.map(([t, d]) => `<p class="r-t12 u2-note"><b style="color:${R.text}">${A(t)}.</b> ${d}</p>`).join(''));
    return page('cards', out + head(ctx, 'cards', { left: [act], right: [white] }), white);
  },

  // Navigation: the top bar runs off the page's left edge like a screen; the dark field on the right holds the rule and the phone's tab bar at its foot.
  navigation(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), E = ex(ctx), ui = ctx.ui, B = ctx.brand, white = R.surface, dark = byRole(ctx, 'text').hex, fx = 832;
    const onD = inkOn(ctx, dark), chD = chromeOn(ctx, dark), ch = chromeOn(ctx, white), actName = byRole(ctx, 'action').name;
    const links = (E.links && E.links.length ? E.links : [[S.status, 'map-pin']]).slice(0, 3);
    const acct = E.account || S.deliverToLabel, four = [...links, ...(links.some(([t]) => t === acct) ? [] : [[acct, 'user']])].slice(0, 4); // the account item is left out where a link already carries its name
    const top = `<nav class="ui-topbar" aria-label="Main"><strong class="ui-display">${A(B.logo.showcase.wordmark)}</strong><div class="ui-topbar__links">${ui.links(links, 0)}</div></nav>`;
    let out = box(0, 80, fx, 56, '', uiR(top));
    out += box(56, 152, fx - 112, 0, `color:${ch}`, p('r-t12', `Top bar. The current page has a 3 px bar in ${A(actName)} under it. Links are 44 px tall.`));
    out += box(56, 232, 220, 0, '', uiR(`<nav class="ui-sidebar" aria-label="Sections">${ui.links(four, 0)}</nav>`));
    out += box(56, 232 + 24 + four.length * 46 + 16, 220, 0, `color:${ch}`, p('r-t12', 'Sidebar. A bar on the left marks the current page.'));
    const tx = 336, tw = fx - 56 - tx;
    out += box(tx, 232, tw, 0, '', uiR(ui.tabs(E.tabs || [S.status], 0)));
    out += box(tx, 292, tw, 0, `color:${ch}`, p('r-t12', 'Tabs switch views of the same list. They never change the page.'));
    out += box(tx, 360, tw, 0, '', uiR(ui.crumbs([...(E.crumbs || []), S.deliverTo])));
    out += box(tx, 392, tw, 0, `color:${ch}`, p('r-t12', 'Breadcrumbs. Quiet, with the current page in full ink.'));
    out += field(fx, 0, W - fx, H, dark);
    out += display(ctx, 'The current place is always marked.', fx + 56, 216, W - fx - 112, onD, { maxLines: 3, lo: 30 }).html;
    const bar = `<nav class="ui-tabbar" aria-label="Sections">${four.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const bw = Math.min(390, W - fx - 48), bx = fx + (W - fx - bw) / 2;
    out += box(fx + 56, H - 64 - 24 - 32, W - fx - 112, 0, `color:${chD}`, p('r-t12', lineHtml(greedy(ctx, 'body', 400, `Mobile tab bar, ${four.length} places at most, 64 px tall.`, 12, W - fx - 112))));
    out += box(bx, H - 64, bw, 64, '', uiR(bar));
    return page('navigation', out + head(ctx, 'navigation', { left: [white], right: [dark] }), white);
  },

  // Lists: the list under its screen title is the slide; the panel field holds the two other ways a row is set and the rules.
  lists(ctx) {
    const W = ctx.size.w, R = L(ctx), S = sc(ctx), E = ex(ctx), ui = ctx.ui, white = R.surface, panel = panelOf(ctx), fx = 768, d = S.deliveries;
    const chP = chromeOn(ctx, panel);
    const title = (E.tabs && E.tabs[0]) || S.status;
    let out = display(ctx, title, 56, 152, fx - 112 - 48, R.text, { maxLines: 1, lo: 32 }).html;
    out += box(56, 184, fx - 112 - 48, 0, '', uiR(deliveryRows(ctx, 5)));
    out += field(fx, 0, W - fx, ctx.size.h, panel);
    const px0 = fx + 48, pw = W - 56 - px0;
    out += box(px0, 96, pw, 0, '', p('r-t15 r-w600', 'Without a lead', `color:${R.text}`));
    out += box(px0, 128, pw, 0, '', uiR(`<ul class="ui-list">${d.slice(0, 2).map((x) => ui.row({ title: x.to, sub: x.when, end: x.price })).join('')}</ul>`));
    out += box(px0, 288, pw, 0, '', p('r-t15 r-w600', 'As a link', `color:${R.text}`));
    out += box(px0, 320, pw, 0, '', uiR(`<ul class="ui-list">${ui.row({ lead: ui.icon(ctx.brand.ui.rowIcon || 'package', 18), title: d[0].to, sub: d[0].when, end: d[0].price, href: '#' })}</ul>`));
    const rules = ['One row is one item. The title names it, the line under it gives the time, and the status is the only colour.', 'Times and prices use tabular figures, so a column lines up.', 'A row that opens is a link, and the whole row is the target.'];
    out += box(px0, 456, pw, 0, `color:${chP}`, rules.map((r) => `<p class="r-t12 u2-note">${A(r)}</p>`).join(''));
    return page('lists', out + head(ctx, 'lists', { left: [white], right: [panel] }), white);
  },

  // Status: the words are the status, so each is drawn twice its size in its own colour, light on the left and dark on the right, with its ratio.
  status(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), DM = colourMap(ctx, 'dark'), S = sc(ctx), ui = ctx.ui, white = R.surface, darkBg = DM.surface, half = W / 2;
    const n = ctx.status.length, chW = chromeOn(ctx, white), chD = [DM.quiet, DM['text-soft'], DM.text].find((c) => ctx.ratio(c, darkBg) >= 4.5);
    let out = field(half, 0, half, H, darkBg);
    out += display(ctx, `${words(n)} states, in plain words.`, 56, 168, half - 112, R.text, { maxLines: 2 }).html;
    out += copy(ctx, 'A status is words in one colour with no fill. Dark mode sets the same words in its own tones.', half + 56, 104, half - 112 - 96, DM.text);
    const top = 232, rh = Math.min(80, Math.floor((H - 72 - top) / n));
    ctx.status.forEach((s, i) => {
      const y = top + i * rh, Lt = statusText(ctx, 'light', s), Dt = statusText(ctx, 'dark', s);
      out += box(56, y, half - 112, rh, `box-shadow:inset 0 1px 0 ${R.divider}`);
      out += box(half + 56, y, half - 112, rh, `box-shadow:inset 0 1px 0 ${DM.divider}`);
      const cy = y + (rh - 36) / 2;
      out += box(56, cy, 300, 36, '', uiR(ui.statusChip(s.id), { zoom: 2 }));
      out += box(half - 56 - 200, y + (rh - 40) / 2, 200, 40, 'text-align:right', p('r-t15 num', rt(ctx, Lt.hex, white), `color:${R.text}`) + p('r-t12 r-nw', mono(Lt.token), `color:${chW}`));
      out += box(half + 56, cy, 300, 36, '', uiR(ui.statusChip(s.id), { zoom: 2, dark: true }));
      out += box(W - 56 - 200, y + (rh - 40) / 2, 200, 40, 'text-align:right', p('r-t15 num', rt(ctx, Dt.hex, darkBg), `color:${DM.text}`) + p('r-t12 r-nw', mono(Dt.token), `color:${chD}`));
    });
    const by = top + n * rh;
    out += box(56, by, half - 112, 1, `background:${R.divider}`) + box(half + 56, by, half - 112, 1, `background:${DM.divider}`);
    out += box(56, by + 20, half - 112, 24, 'display:flex;align-items:center;gap:12px', p('r-t12 r-nw', 'A count sits on a tab or an icon as a badge.', `color:${chW}`) + uiR(`<span class="ui-badge">${S.deliveries.length}</span>`));
    return page('status', out + head(ctx, 'status', { left: [white], right: [darkBg] }), white);
  },

  // Feedback: the alerts, the inline message and loading down the white; the toast drawn large on the action field as the slide's one big thing.
  feedback(ctx) {
    const W = ctx.size.w, H = ctx.size.h, R = L(ctx), S = sc(ctx), F = S.form, ui = ctx.ui, white = R.surface, fx = 704;
    const act = byRole(ctx, 'action').hex, onA = inkOn(ctx, act), ch = chromeOn(ctx, white), cw = fx - 112 - 32;
    let out = box(56, 96, cw, 0, '', p('r-t15 r-w600', 'Alerts', `color:${R.text}`));
    out += box(56, 128, cw, 0, '', uiR(`<div class="u2-stack">${ui.alert('info', S.pickup)}${ui.alert('success', S.toast)}${ui.alert('warning', S.alert)}${ui.alert('danger', F.readyError)}</div>`));
    const aH = [S.pickup, S.toast, S.alert, F.readyError].reduce((s, t) => s + 20 + 23 * (ctx.placeholders ? 2 : nLines(ctx, t, cw - 46, 16)), 0) + 3 * 12; // slot: a compact placeholder may take two lines
    let y = 128 + aH + 16;
    out += copy(ctx, 'A banner stays until it is dealt with. The edge and the icon carry the tone; the words stay in the text colour.', 56, y, cw, ch, 12);
    y += 72;
    out += box(56, y, cw, 0, '', p('r-t15 r-w600', 'Inline message', `color:${R.text}`));
    out += box(56, y + 32, cw, 24, '', uiR(`<p class="ui-inline-msg">${ui.icon('info', 16)}${A(S.inline)}</p>`));
    y += 88;
    out += box(56, y, cw, 0, '', p('r-t15 r-w600', 'Loading', `color:${R.text}`));
    out += box(56, y + 32, cw, 0, '', uiR(`<div class="u2-load">${ui.spinner()}<div class="u2-skel">${ui.skeleton('220px')}${ui.skeleton('150px')}${ui.skeleton('180px')}</div></div>`));
    out += copy(ctx, 'A spinner for a wait of a moment. A longer list gets skeleton lines in the shape of its rows.', 56 + 280, y + 32, cw - 280, ch, 12);
    out += field(fx, 0, W - fx, H, act);
    const tw = W - fx - 112;
    out += display(ctx, 'Say what happened, then what to do.', fx + 56, 216, tw, onA, { maxLines: 3 }).html;
    out += box(fx + 56, 312, tw, 0, '', uiR(ui.toast(S.toast), { zoom: 1.5 }));
    out += copy(ctx, 'Toast, drawn at one and a half times. It leaves by itself, and Undo stays reachable by keyboard while it shows.', fx + 56, 400, tw - 48, onA, 12);
    return page('feedback', out + head(ctx, 'feedback', { left: [white], right: [act] }), white);
  },
};

export function css(ctx) {
  return `
.pg.u2 .u2-ui{background:transparent}
.pg.u2 .u2-m{font-family:'${ctx.brand.fonts.mono.family}',monospace;font-variant-numeric:tabular-nums}
.pg.u2 .u2-note{margin:0 0 8px}
.pg.u2 .u2-note b{font-weight:600}
.pg.u2 .u2-stack{display:flex;flex-direction:column;gap:12px}
.pg.u2 .u2-load{display:flex;align-items:center;gap:24px}
.pg.u2 .u2-skel{display:flex;flex-direction:column;gap:10px}
`;
}
