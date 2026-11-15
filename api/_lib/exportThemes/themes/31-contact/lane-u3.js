// Theme 31, Contact sheet, lane u3: the UI kit's patterns and handoff pages (dialog, table, empty, the three product screens, tokens, code).
// On a contact sheet the chosen frames come back as prints, so every page here is a print of the real thing: the components and screens are live ctx.ui markup,
// enlarged or reduced on the stage with zoom (never transform, which shrinks the PDF), and the tokens and code are printed from engine/tokens.js, never typed.
// The chrome (strip, roll, loop, caption column, foot) is lane u1's, imported read-only. Every class here starts u3-.
import { A, put } from './helpers.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { kitPage, kitCaption, kitLabel, uiDark, uiLight } from './lane-u1-kit.js';
import { deskScreen, DESK_W, DESK_H, DESK_PARTS, phoneHome, phoneForm, phoneList, PHONE_W, PHONE_H, screensCss } from './lane-u3-screens.js';

const sc = (ctx) => ctx.brand.ui.screen.content;
const text = (ctx, x, y, w, h, s) => put(ctx, { x, y, w, h, cls: 'cx', html: A(s) });
const head = (ctx, x, y, w, s) => put(ctx, { x, y, w, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(s) });
const lit = (ctx, x, y, w, s, c = 'var(--quiet)') => put(ctx, { x, y, w, h: 18, role: 'mono', size: 12, line: 18, style: `font:400 12px/18px var(--mono);color:${c};white-space:normal`, html: A(s) });
const pct = (k) => `${Math.round(k * 100)} per cent`;
const spTok = (ctx, v) => (ctx.space.find((s) => s.px === v) || {}).token;
const uiT = (ctx, id) => ctx.uiType.find((t) => t.token === id) || ctx.uiType[0];
const g = (ctx) => tokenGroups(ctx);

// a print of live markup: `inner` laid out at w x h css px and printed at k, light on paper or dark straight on the darkroom ground with a thin edge
function print(ctx, mode, x, y, w, h, k, inner, cls = '') {
  return `<div class="a ui u3-print ${mode === 'dark' ? 'u3-print--dark' : ''} ${cls}"${mode === 'dark' ? ' data-theme="dark"' : ''} style="left:${x}px;top:${y}px;width:${Math.round(w * k)}px;height:${Math.round(h * k)}px"><div style="zoom:${k};width:${w}px;height:${h}px">${inner}</div></div>`;
}

// ---- dialog: the brand's own dialog over its scrim, enlarged half again; the specs run under it as an appendix ----
function dialog(ctx) {
  const D = sc(ctx).dialog, ui = ctx.ui, k = 1.5, G = g(ctx), tS = uiT(ctx, 'title-s'), tB = uiT(ctx, 'body'), pad = spTok(ctx, 24), gap = spTok(ctx, 12);
  const dlg = ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }).replace(/dlg-t/g, 'u3-dlg');
  const stage = uiDark(60, 316, 912, 452, `<div class="ui-scrim u3-scrim"><div style="zoom:${k};width:440px">${dlg}</div></div>`);
  const sp = (t, v) => (t ? [`--${t.replace('space-', 'sp-')} ${v}px`] : []);
  const specs = [
    [60, 'Title', [`--fs-title-s ${tS.size}px`, `--lh-title-s ${tS.line}px`, `--fw-title-s ${tS.weight}`]],
    [294, 'Text', [`--fs-body ${tB.size}px`, `--lh-body ${tB.line}px`, `--fw-body ${tB.weight}`]],
    [528, 'Frame', [`--r-card ${G.radius['r-card']}`, `--w-control ${G.width['w-control']}`, ...sp(pad, 24)]],
    [762, 'Answers', ['Secondary, then primary', ...sp(gap, 12)]],
  ].map(([x, t, v]) => head(ctx, x, 824, 210, t) + v.map((l, i) => lit(ctx, x, 848 + i * 18, 210, l)).join('')).join('');
  const words = kitLabel(ctx, 996, 512, 'One question')
    + text(ctx, 996, 536, 444, 132, 'A dialog asks one thing. Its title is the question, the text gives the facts that decide it, and the two buttons answer it: the way out first, then the action, named for what it does. Esc and a click on the scrim close it.');
  return kitPage(ctx, 'dialog', stage + text(ctx, 60, 784, 444, 22, `Drawn at ${k} times.`) + specs + kitCaption(ctx, 'dialog') + words, 'u3-dialog');
}

// ---- the product screens: the whole desktop screen as one print across the stage ----
function screenPage(ctx, id, mode) {
  const k = 912 / DESK_W, L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
  const pr = print(ctx, mode, 60, 316, DESK_W, DESK_H, k, deskScreen(ctx, mode));
  const note = text(ctx, 60, 916, 600, 22, `${DESK_W} by ${DESK_H} px, printed at ${pct(k)}.`);
  let words;
  if (mode === 'light') {
    words = kitLabel(ctx, 996, 512, 'Built from') + DESK_PARTS.map(([n, c], i) => put(ctx, { x: 996, y: 538 + i * 26, w: 200, h: 20, role: 'body', size: 14, line: 20, style: 'font:400 14px/20px var(--body);color:var(--soft)', html: A(n) })
      + lit(ctx, 1200, 539 + i * 26, 240, c)).join('')
      + text(ctx, 996, 538 + DESK_PARTS.length * 26 + 16, 444, 66, 'Nothing on this screen is drawn for the page. It is the kit\'s own markup, and the code package ships the same classes.');
  } else {
    const roles = ['surface', 'raised', 'text', 'text-soft', 'quiet', 'action', 'focus'];
    words = kitLabel(ctx, 996, 512, 'Same markup, dark values')
      + text(ctx, 996, 536, 444, 66, `The screen on page ${ctx.pageNo('screen-light')} with data-theme="dark" on its root. No class changes; each role takes its dark value.`)
      + put(ctx, { x: 1196, y: 618, w: 120, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: 'Light' }) + put(ctx, { x: 1320, y: 618, w: 120, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: 'Dark' })
      + roles.map((r, i) => { const y = 642 + i * 28;
        return lit(ctx, 996, y, 190, '--' + r, 'var(--soft)') + `<i class="a u3-sw" style="left:1196px;top:${y + 3}px;background:${L[r]}"></i>` + lit(ctx, 1216, y, 100, L[r])
          + `<i class="a u3-sw" style="left:1320px;top:${y + 3}px;background:${D[r]}"></i>` + lit(ctx, 1340, y, 100, D[r]); }).join('');
  }
  return kitPage(ctx, id, pr + note + kitCaption(ctx, id) + words, `u3-screen u3-screen--${mode}`);
}

// ---- table: every booking as a table of record, printed on paper a quarter up; the three row states are read off the print underneath ----
function table(ctx) {
  const S = sc(ctx), ui = ctx.ui, k = 1.25, first = S.deliveries[0];
  // sorted for real: the header that says ascending is telling the truth about the rows under it
  const rows = [...S.deliveries].sort((a, b) => a.to.localeCompare(b.to, 'en-AU'));
  const hover = rows.find((d) => d !== first && rows.indexOf(d) >= 2) || rows[rows.length - 1];
  const sortBtn = (t, on) => `<button type="button">${A(t)}${on ? ui.icon('arrow-up', 14) : ''}</button>`;
  const body = rows.map((d) => `<tr${d === first ? ' aria-selected="true"' : ''}${d === hover ? ' class="is-hover"' : ''}><td>${A(d.to)}</td><td>${A(d.when)}</td><td>${ui.statusChip(d.status)}</td><td class="is-num">${A(d.price)}</td></tr>`).join('');
  const tbl = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn('Booking', true)}</th><th scope="col">${sortBtn('When')}</th><th scope="col">Status</th><th scope="col" class="is-num">${sortBtn(S.paidLabel || 'Paid')}</th></tr></thead><tbody>${body}</tbody></table>`;
  const w = Math.round((912 - 64) / k), h = 44 + rows.length * 52;
  const paper = uiLight(60, 316, 912, Math.round(h * k) + 64, '') + print(ctx, 'light', 92, 348, w, h, k, tbl);
  const py = 316 + Math.round(h * k) + 64 + 24;
  const notes = [
    [60, 'Sorted', 'Booking, A to Z. A sortable header is a button; the sorted one carries its arrow.'],
    [294, 'Selected', `${first.to}: the raised ground and a bar in the action colour.`],
    [528, 'Hover', `${hover.to}: the raised ground alone, on pointer devices only.`],
    [762, S.paidLabel || 'Paid', 'Money sits right, in tabular figures, so the column reads down.'],
  ].map(([x, t, s]) => head(ctx, x, py, 210, t) + text(ctx, x, py + 24, 210, 88, s)).join('');
  const words = kitLabel(ctx, 996, 512, 'Rows of record')
    + text(ctx, 996, 536, 444, 110, 'A table is for comparing many of one thing. Status stays as plain words in its own colour, never a tinted pill, and the row is the target: one click opens the booking.');
  return kitPage(ctx, 'table', paper + notes + kitCaption(ctx, 'table') + words, 'u3-table');
}

// ---- empty: the brand's empty state as the big print, dark, and the first run beside it on paper ----
function empty(ctx) {
  const S = sc(ctx), E = S.empty, F = S.form, ui = ctx.ui, k = 1.25;
  const none = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
  const first = `<div class="ui-empty"><h3 class="ui-empty__title">${A(F.title)}</h3><ol class="u3-steps">${[F.pickup, F.dropoff, F.ready].map((t) => `<li>${A(t)}</li>`).join('')}</ol>${ui.btn(F.book)}</div>`;
  const big = uiDark(60, 316, 600, 0, `<div style="zoom:${k};width:480px">${none}</div>`);
  const small = uiLight(60, 604, 444, 0, `<div style="padding:16px">${first}</div>`);
  const notes = head(ctx, 692, 316, 280, 'Nothing yet') + text(ctx, 692, 340, 280, 110, 'Say what is missing, and offer the one action that fills it. The title states the fact; the button names the job.')
    + head(ctx, 528, 604, 444, 'First run') + text(ctx, 528, 628, 444, 88, 'Before the first booking, list what will be asked, in the order the form asks it, and start the form from here.')
    + text(ctx, 692, 456, 280, 22, `Drawn at ${k} times.`);
  const words = kitLabel(ctx, 996, 512, 'An unexposed frame')
    + text(ctx, 996, 536, 444, 110, 'Like a frame that was never shot, an empty state still has its place on the roll. It sits on the raised ground with no edge, so it never reads as a card, and it never apologises.');
  return kitPage(ctx, 'empty', big + small + notes + kitCaption(ctx, 'empty') + words, 'u3-empty');
}

// ---- screen-mobile: the home screen printed large, dark; the form and the list beside it, light, as smaller prints off the same roll ----
function screenMobile(ctx) {
  // all three at one size, as large as the stage allows (the prints' own text is 16 px at 73 per cent); their captions run down the right-hand column
  const k = 612 / PHONE_H, F = sc(ctx).form;
  const w1 = Math.round(PHONE_W * k), gap = Math.floor((912 - 3 * w1) / 2), x2 = 60 + w1 + gap, x3 = x2 + w1 + gap;
  const prints = print(ctx, 'dark', 60, 316, PHONE_W, PHONE_H, k, phoneHome(ctx, 'dark'))
    + print(ctx, 'light', x2, 316, PHONE_W, PHONE_H, k, phoneForm(ctx)) + print(ctx, 'light', x3, 316, PHONE_W, PHONE_H, k, phoneList(ctx));
  const caps = [['Home', 'Dark. The job in progress, who has it and what is next.'], [F.title, 'Light. One field in error, said plainly, with the fix.'], [ctx.brand.ui.screen.title, 'Light. The toast confirms the booking, with Undo.']]
    .map(([t, s], i) => head(ctx, 996, 664 + i * 84, 444, t) + text(ctx, 996, 688 + i * 84, 444, 44, s)).join('')
    + text(ctx, 996, 916, 444, 22, `${PHONE_W} by ${PHONE_H} px, printed at ${pct(k)}.`);
  const words = kitLabel(ctx, 996, 512, `At ${PHONE_W} wide`)
    + text(ctx, 996, 536, 444, 88, `One column of the same components. The main action sits in reach of the thumb, and the tab bar holds the ${ctx.brand.ui.screen.content.example && ctx.brand.ui.screen.content.example.links ? ctx.brand.ui.screen.content.example.links.length + 1 : 4} places the app goes.`);
  return kitPage(ctx, 'screen-mobile', prints + caps + kitCaption(ctx, 'screen-mobile') + words, 'u3-mobile');
}

// ---- tokens: the reference, printed from engine/tokens.js. Colour across the stage (light and dark side by side), the rest in the notes ----
function tokensPage(ctx) {
  const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), G = g(ctx), keys = Object.keys(L);
  const half = Math.ceil(keys.length / 2), rh = Math.max(18, Math.min(24, Math.floor(470 / half)));
  const col = (x, list) => [['Light', x + 196], ['Dark', x + 320]].map(([t, cx]) => put(ctx, { x: cx, y: 316, w: 120, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: t })).join('')
    + list.map((key, i) => { const y = 344 + i * rh;
      return lit(ctx, x, y, 190, '--' + key, 'var(--soft)') + `<i class="a u3-sw" style="left:${x + 196}px;top:${y + 3}px;background:${L[key]}"></i>` + lit(ctx, x + 214, y, 104, L[key])
        + `<i class="a u3-sw" style="left:${x + 320}px;top:${y + 3}px;background:${D[key]}"></i>` + lit(ctx, x + 338, y, 104, D[key]); }).join('');
  const colour = col(60, keys.slice(0, half)) + col(528, keys.slice(half));
  // the brand's own colours along the foot of the stage, one patch per frame column
  const py = 344 + half * rh + 32, pal = ctx.colours.slice(0, 8), pw = Math.floor((912 - (pal.length - 1) * 16) / pal.length);
  const palette = put(ctx, { x: 60, y: py, w: 444, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: 'Palette' })
    + pal.map((c, i) => { const x = 60 + i * (pw + 16);
      return `<div class="a" style="left:${x}px;top:${py + 24}px;width:${pw}px;height:40px;background:${c.hex};box-shadow:inset 0 0 0 1px oklch(1 0 0 / .1)"></div>` + lit(ctx, x, py + 72, pw, `--palette-${c.id}`, 'var(--soft)') + lit(ctx, x, py + 90, pw, c.hex); }).join('');
  // the rest of the reference as one column of groups in normal flow, each value kept whole on its line
  const grp = (t, list) => `<div class="u3-tg"><div class="nl">${A(t)}</div><div class="u3-tv">${list.map((v) => `<span>${A(v)}</span>`).join('')}</div></div>`;
  const notes = `<div class="a u3-tgs" style="left:996px;top:512px;width:444px">${[
    grp('Space', Object.entries(G.space).map(([k2, v]) => `--${k2} ${v}`)),
    grp('Radius', Object.entries(G.radius).map(([k2, v]) => `--${k2} ${v}`)),
    grp('Border width', Object.entries(G.width).map(([k2, v]) => `--${k2} ${v}`)),
    grp('Type, size / line / weight', ctx.uiType.map((t) => `${t.token} ${t.size}/${t.line}/${t.weight}`)),
    grp('Fonts', ['display', 'body', 'mono'].map((r) => `--ff-${r} ${ctx.brand.fonts[r].family}`)),
    grp('Shadow', [`--shadow-float ${G.shadow['shadow-float']}`]),
  ].join('')}</div>`;
  return kitPage(ctx, 'tokens', colour + palette + kitCaption(ctx, 'tokens') + notes, 'u3-tokens');
}

// ---- code: the install lines and the head of tokens.css, printed as the package writes them; line numbers in the film's edge print ----
const codeBlock = (ctx, x, y, w, lines, from = 1) => lines.map((l, i) => put(ctx, { x, y: y + i * 20, w: 28, h: 20, cls: 'edge u3-ln', role: 'edge', size: 12, line: 20, weight: 600, align: 'right', html: String(from + i) })
  + put(ctx, { x: x + 40, y: y + i * 20, w: w - 40, h: 20, cls: 'u3-code', role: 'mono', size: 12, line: 20, html: A(l) || ' ' })).join('');
function code(ctx) {
  const ui = ctx.ui, F = sc(ctx).form;
  const btn = ui.btn(ctx.placeholders ? 'Button label' : F.book).replace(/\s+>/, '>');
  const install = ['<link rel="stylesheet" href="fonts.css">', '<link rel="stylesheet" href="tokens.css">', '<link rel="stylesheet" href="components.css">', '', '<body class="ui">', '  ' + btn, '</body>'];
  const use = (tailwindCss(ctx).match(/Use with: ([^*]+)\*\//) || [null, ''])[1].split(';').map((s) => s.trim()).filter(Boolean).map((s) => s + ';');
  const css = tokensCss(ctx).split('\n'), from = css.indexOf(':root {') + 1, n = 27, show = css.slice(from - 1, from - 1 + n);
  const lab = (x, y, t) => put(ctx, { x, y, w: 400, h: 16, cls: 'nl', role: 'chrome', size: 12, line: 16, weight: 500, html: A(t) });
  const left = lab(60, 316, 'index.html') + codeBlock(ctx, 60, 340, 444, install)
    + lab(60, 516, 'Dark mode') + codeBlock(ctx, 60, 540, 444, ['<html data-theme="dark">'])
    + lab(60, 596, 'Tailwind CSS v4') + codeBlock(ctx, 60, 620, 444, use);
  const right = lab(528, 316, `tokens.css, lines ${from} to ${from + show.length - 1} of ${css.length - 1}`) + codeBlock(ctx, 528, 340, 444, show, from);
  const files = [['tokens.css', 'Custom properties, light and dark'], ['tokens.json', 'The same, in the DTCG format'], ['tokens.ts', 'A typed export'], ['tailwind.css', 'A Tailwind v4 @theme block'], ['components.css', 'Every component in this kit'], ['example.html', 'Every component, live'], ['fonts.css', 'The @font-face rules'], ['assets/', 'Logo, icons and font files']];
  const words = kitLabel(ctx, 996, 512, 'In the package') + files.map(([f, d], i) => lit(ctx, 996, 538 + i * 24, 150, f, 'var(--ink)') + put(ctx, { x: 1150, y: 537 + i * 24, w: 290, h: 20, role: 'body', size: 14, line: 20, style: 'font:400 14px/20px var(--body);color:var(--soft)', html: A(d) })).join('')
    + text(ctx, 996, 538 + files.length * 24 + 16, 444, 88, 'Plain CSS and no framework. Copy the folder, link three stylesheets and put class "ui" on the body. Colour tokens name a job, so dark mode swaps values and keeps every name.');
  return kitPage(ctx, 'code', left + right + kitCaption(ctx, 'code') + words, 'u3-codepage');
}

export const uikit = {
  dialog,
  table,
  empty,
  'screen-mobile': screenMobile,
  tokens: tokensPage,
  code,
  'screen-light': (ctx) => screenPage(ctx, 'screen-light', 'light'),
  'screen-dark': (ctx) => screenPage(ctx, 'screen-dark', 'dark'),
};

export const css = (ctx) => (ctx.kind === 'uikit' ? screensCss(ctx) + `
.pg .u3-print{overflow:hidden;background:var(--surface)}
.pg .u3-print--dark::after{content:"";position:absolute;inset:0;box-shadow:inset 0 0 0 1px oklch(1 0 0 / .12);pointer-events:none}
.pg .u3-scrim{height:100%;padding:0}
.pg .u3-sw{width:12px;height:12px;box-shadow:inset 0 0 0 1px oklch(0.5 0 0 / .4)}
.pg .u3-steps{display:flex;flex-direction:column;gap:8px;margin:4px 0;counter-reset:u3s;list-style:none}
.pg .u3-steps li{display:flex;gap:12px;color:var(--text-soft)}
.pg .u3-steps li::before{counter-increment:u3s;content:counter(u3s);min-width:12px;color:var(--quiet);font-variant-numeric:tabular-nums}
.pg .u3-code{font:400 12px/20px var(--mono);color:var(--soft);white-space:pre}
.pg .u3-ln{line-height:20px}
.pg .u3-tgs{white-space:normal;display:flex;flex-direction:column;gap:14px}
.pg .u3-tv{display:flex;flex-wrap:wrap;gap:0 20px;margin-top:4px;font:400 12px/18px var(--mono);color:var(--soft)}
.pg .u3-tv span{white-space:nowrap}
` : '');
