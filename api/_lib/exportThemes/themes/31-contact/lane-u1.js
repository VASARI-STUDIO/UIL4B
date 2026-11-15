// Theme 31, Contact sheet, lane u1: the UI kit's opening and foundation pages. The chrome (strip, roll, loop, caption column, foot) is in lane-u1-kit.js.
// The design for every page is in .scratch/11_overnight/03_handoffs/31-u1.md.
import { A, put, cwOn, wrap, adv } from './helpers.js';
import { colourMap } from '../../engine/tokens.js';
import { kitPage, kitCaption, kitPrint, kitFrameCap, kitLabel, kitDocCss, uiDark } from './lane-u1-kit.js';

const text = (ctx, x, y, w, h, s, st = '') => put(ctx, { x, y, w, h, cls: 'cx', style: st, html: A(s) });

const NB = String.fromCharCode(160);   // a no-break space: a ratio never breaks across lines
const ratioText = (ctx, a, b) => `${ctx.fmt(ctx.ratio(a, b))}${NB}:${NB}1`;
// the neutral roles of one mode as a step wedge, lightest to darkest. Like a printed step tablet, each band's token, value and ratio on the surface are
// printed under the band, on the paper (light) or the ground (dark): a mid-tone band passes 4.5 : 1 with neither the text nor the surface role.
function wedge(ctx, mode, x, y, w, h) {
  const M = colourMap(ctx, mode), C = ctx.C, keys = ['surface', 'raised', 'sunken', 'divider', 'edge', 'quiet', 'text-soft', 'text'];
  const ks = [...new Set(keys)].sort((a, b) => C.toOklch(M[b]).L - C.toOklch(M[a]).L), bw = Math.floor(w / ks.length);
  const ink = mode === 'dark' ? 'var(--ink)' : M.text, q = mode === 'dark' ? 'var(--quiet)' : M.quiet, ly = y + h + 12;
  return ks.map((k, i) => {
    const bx = x + i * bw, bwi = i === ks.length - 1 ? w - i * bw : bw, bg = M[k];
    return `<div class="a" style="left:${bx}px;top:${y}px;width:${bwi}px;height:${h}px;background:${bg}"></div>`
      + put(ctx, { x: bx, y: ly, w: bwi - 8, h: 16, role: 'chrome', size: 12, line: 16, weight: 500, style: `font:500 12px/16px var(--chrome);color:${ink}`, html: A('--' + k) })
      + put(ctx, { x: bx, y: ly + 20, w: bwi - 8, h: 18, role: 'mono', size: 12, line: 18, style: `font:400 12px/18px var(--mono);color:${q}`, html: A(bg) })
      + put(ctx, { x: bx, y: ly + 38, w: bwi - 8, h: 18, role: 'mono', size: 12, line: 18, style: `font:400 12px/18px var(--mono);color:${q}`, html: A(k === 'surface' ? 'ground' : ratioText(ctx, bg, M.surface)) });
  }).join('') + `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
}
// the action and status tones as rows on the stage: swatch, name, token, ratio on the surface
function tones(ctx, mode, x, y) {
  const M = colourMap(ctx, mode), ink = mode === 'dark' ? 'var(--ink)' : M.text, q = mode === 'dark' ? 'var(--quiet)' : M.quiet, list = [['Action', 'action'], ['Success', 'success'], ['Warning', 'warning'], ['Danger', 'danger'], ['Info', 'info']];
  return list.map(([n, k], i) => { const ry = y + i * 40;
    return `<div class="a" style="left:${x}px;top:${ry}px;width:24px;height:24px;background:${M[k]};box-shadow:inset 0 0 0 1px var(--hair)"></div>`
      + put(ctx, { x: x + 40, y: ry + 2, w: 140, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: `font:500 14px/20px var(--body);color:${ink}`, html: A(n) })
      + put(ctx, { x: x + 180, y: ry + 3, w: 150, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: `color:${q}`, html: A('--' + k) })
      + put(ctx, { x: x + 330, y: ry + 3, w: 120, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: `text-align:right;color:${q}`, html: A(ratioText(ctx, M[k], M.surface)) }); }).join('');
}
function colourPage(ctx, id, mode) {
  const M = colourMap(ctx, mode), dark = mode === 'dark', R = (a, b) => ratioText(ctx, M[a], M[b]);
  // light is a print on paper with a margin; dark sits straight on the darkroom ground
  const paper = dark ? '' : `<div class="a" style="left:60px;top:316px;width:912px;height:620px;background:${M.surface}"></div>`;
  const wx = dark ? 60 : 92, ww = dark ? 912 : 848, wy = dark ? 316 : 348;
  const pairs = [['Text on surface', 'text', 'surface'], ['Quiet text on surface', 'quiet', 'surface'], ['Control edge on surface', 'edge', 'surface'], ['Focus ring on surface', 'focus', 'surface'], ['Button label on action', 'action-label', 'action']];
  const notes = kitLabel(ctx, 996, 512, dark ? 'Dark, measured' : 'Light, measured') + pairs.map(([n, a, b], i) => put(ctx, { x: 996, y: 540 + i * 28, w: 300, h: 20, role: 'body', size: 14, line: 20, style: 'font:400 14px/20px var(--body);color:var(--soft)', html: A(n) })
    + put(ctx, { x: 1300, y: 541 + i * 28, w: 140, h: 18, cls: 'mono', role: 'mono', size: 12, line: 18, style: 'text-align:right', html: A(R(a, b)) })).join('')
    + text(ctx, 996, 696, 444, 66, 'Roles name a job, not a colour, so the markup is the same in both modes. Text under 24 px needs 4.5' + NB + ':' + NB + '1; edges and the focus ring need 3' + NB + ':' + NB + '1.');
  return kitPage(ctx, id, paper + wedge(ctx, mode, wx, wy, ww, 200) + tones(ctx, mode, wx, wy + 300) + kitCaption(ctx, id) + notes, dark ? 'u1-dark' : 'u1-light');
}

// ---- small type for the stage: a token name, a literal value, a line of use ----
const tok = (ctx, x, y, t, w, c = 'var(--ink)') => put(ctx, { x, y, w, h: 16, role: 'chrome', size: 12, line: 16, weight: 500, style: `font:500 12px/16px var(--chrome);color:${c}`, html: A(t) });
const lit = (ctx, x, y, t, w, c = 'var(--quiet)', st = '') => put(ctx, { x, y, w, h: 18, role: 'mono', size: 12, line: 18, style: `font:400 12px/18px var(--mono);color:${c};${st}`, html: A(t) });
const use = (ctx, x, y, t, w, c = 'var(--soft)') => put(ctx, { x, y, w, h: 18, role: 'body', size: 12, line: 18, style: `font:400 12px/18px var(--body);color:${c}`, html: A(t) });
const hair = (x, y, w) => `<div class="a" style="left:${x}px;top:${Math.round(y)}px;width:${w}px;height:1px;background:var(--hair)"></div>`;
const lcFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const pxOf = (list, token) => (list.find((t) => t.token === token) || {}).px;

// type-scale: every UI size at true size, largest first, each set in a line the product really says
function typeScale(ctx) {
  const B = ctx.brand, S = B.ui.screen.content, F = B.fonts, dstr = F.display.stretch || 100;
  const sample = { headline: S.eta, title: B.ui.screen.title, 'title-s': S.dialog.title, control: S.form.book, body: S.pickup, label: S.form.pickup, caption: S.form.notesHelp };
  const rows = [...ctx.uiType].sort((a, b) => b.size - a.size).map((t) => {
    const fam = t.face === 'display' ? 'display' : 'body', lines = wrap(ctx, fam, sample[t.token] || t.use, t.size, 678, 0, t.weight);
    return { t, fam, lines, h: Math.max(lines.length * t.line, 34) };
  });
  const total = rows.reduce((s, r) => s + r.h, 0), gap = Math.max(16, Math.min(56, Math.floor((620 - total) / Math.max(1, rows.length - 1))));
  let y = 316, out = '';
  rows.forEach((r, i) => {
    const { t, fam } = r, fst = fam === 'display' ? `font-stretch:${dstr}%;` : '';
    out += put(ctx, { x: 60, y, w: 678, h: r.lines.length * t.line, role: fam, size: t.size, line: t.line, weight: t.weight, style: `font:${t.weight} ${t.size}px/${t.line}px var(--${fam});${fst}color:var(--ink)`, html: r.lines.map(A).join('<br>') })
      + tok(ctx, 762, y, t.token, 210) + lit(ctx, 762, y + 16, `${t.size} / ${t.line}, ${t.weight}`, 210);
    y += r.h;
    if (i < rows.length - 1) { out += hair(60, y + gap / 2, 912); y += gap; }
  });
  const sizes = rows.map((r) => r.t), min = sizes[sizes.length - 1], max = sizes[0], lr = (t) => (t.line / t.size).toFixed(2);
  const self = (y, fam, size, line, wgt) => put(ctx, { x: 996, y, w: 444, h: line, role: fam, size, line, weight: wgt, style: `font:${wgt} ${size}px/${line}px var(--${fam});${fam === 'display' ? `font-stretch:${dstr}%;` : ''}color:var(--ink)`, html: A(F[fam].family) });
  const words = kitLabel(ctx, 996, 512, 'Two families') + self(536, 'display', 28, 36, ctx.weights.heading) + self(576, 'body', 20, 28, ctx.weights.regular)
    + text(ctx, 996, 624, 444, 88, `${sizes.length} sizes, ${min.size} to ${max.size} px. The smallest is for ${lcFirst(min.use)}. Line height runs from ${lr(min)} times the size at ${min.size} px to ${lr(max)} at ${max.size} px.`);
  return kitPage(ctx, 'type-scale', out + kitCaption(ctx, 'type-scale') + words, 'u1-type');
}

// spacing: the scale as nested squares from one corner, like an enlarging easel's frames; each square's lower edge runs out to its line in the legend
const SPACE_USE = { 4: 'Tab and link gaps', 8: 'Icon to label', 12: 'Row gap, input inset', 16: 'Card padding', 24: 'Dialog padding', 32: 'Empty state padding' };   // from components.css, keyed by px
function spacing(ctx) {
  const sp = ctx.space, base = ctx.brand.ui.spacingBase || sp[0].px, max = sp[sp.length - 1].px, k = Math.max(1, Math.floor(560 / max)), X = 60, Y = 316;
  const squares = [...sp].reverse().map((t, i, a) => { const s = t.px * k, first = i === a.length - 1;
    return `<div class="a" style="left:${X}px;top:${Y}px;width:${s}px;height:${s}px;${first ? 'background:var(--strong);' : ''}box-shadow:inset 0 0 0 1px var(--quiet)"></div>`; }).join('');
  let prev = -Infinity, legend = '';
  sp.forEach((t) => {
    const s = t.px * k, ly = Y + s, ty = Math.max(ly - 20, prev + 24); prev = ty;
    if (ty === ly - 20) legend += hair(X + s, ly - 1, 637 - X - s);
    legend += tok(ctx, 645, ty, t.token, 92) + lit(ctx, 745, ty - 1, `${t.px} px`, 52) + use(ctx, 805, ty - 1, SPACE_USE[t.px] || '', 167);
  });
  const whole = sp.every((t) => t.px % base === 0), steps = 44 / base;
  const words = kitLabel(ctx, 996, 512, 'The scale')
    + text(ctx, 996, 536, 444, 66, `${sp.length} steps on a ${base} px base${whole ? ', each a whole number of base steps' : ''}.`)
    + (Number.isInteger(steps) ? text(ctx, 996, 590, 444, 44, `Controls are 44 px tall: ${steps} base steps.`) : '');
  return kitPage(ctx, 'spacing', squares + legend + text(ctx, X, Y + max * k + 20, 500, 22, `Drawn at ${k} times.`) + kitCaption(ctx, 'spacing') + words, 'u1-space');
}

// radii-borders: one focused input enlarged to show the corner where radius, edge and ring meet; beside it the six specimens at true size
const ZOOM = 12;
function radiiBorders(ctx) {
  const B = ctx.brand, S = B.ui.screen.content, F = S.form, ui = ctx.ui, L = colourMap(ctx, 'light');
  const rc = pxOf(ctx.radii, 'radius-control'), rCard = pxOf(ctx.radii, 'radius-card'), rRound = pxOf(ctx.radii, 'radius-round');
  const ri = B.ui.radius.input ?? rc, rb = B.ui.radius.button ?? rc, riTok = B.ui.radius.input != null ? 'radius-input' : 'radius-control', rbTok = B.ui.radius.button != null ? 'radius-button' : 'radius-control';
  const bHair = pxOf(ctx.borders, 'border-hairline'), bCtl = pxOf(ctx.borders, 'border-control'), bFoc = pxOf(ctx.borders, 'border-focus');
  // the enlargement, in print pixels: the input's corner sits at 8 css px, so the ring (2 px clear, then the focus width) shows above and left of it
  const o = 8 * ZOOM, R = ri * ZOOM, ring = (2 + bFoc) * ZOOM, pr = o + R - R / Math.SQRT2;
  const leads = [
    { tok: riTok, val: `${ri} px`, from: [pr, pr], y: 184 },
    { tok: 'border-control', val: `${bCtl} px`, from: [o + bCtl * ZOOM / 2, 260], y: 260 },
    { tok: 'border-focus', val: `${bFoc} px, 2 px clear`, from: [o - ring + bFoc * ZOOM / 2, 330], y: 330 },
  ];
  const svg = `<svg class="a" style="left:0;top:0" width="444" height="444" viewBox="0 0 444 444" aria-hidden="true" fill="none" stroke="${L.text}" stroke-width="1">${leads.map((l) => `<path d="M${l.from[0].toFixed(1)} ${l.from[1].toFixed(1)}L232 ${l.y}"/><circle cx="${l.from[0].toFixed(1)}" cy="${l.from[1].toFixed(1)}" r="3" fill="${L.text}" stroke="none"/>`).join('')}</svg>`;
  const labels = leads.map((l) => tok(ctx, 240, l.y - 8, l.tok, 192, L.text) + lit(ctx, 240, l.y + 10, l.val, 192, L.quiet)).join('');
  const print = `<div class="a ui" style="left:60px;top:316px;width:444px;height:444px;overflow:hidden;background:var(--surface);white-space:normal"><div style="position:absolute;left:0;top:0;zoom:${ZOOM}"><div class="ui-input is-focus" style="position:absolute;left:8px;top:8px;width:60px"></div></div>${svg}${labels}</div>`;
  const d0 = S.deliveries[0], field = (cls) => `<div class="ui-input ${cls}" style="display:flex;align-items:center;white-space:nowrap">${A(cls ? F.readyValue : F.pickupValue)}</div>`;
  const items = [
    [ui.btn(F.book), rbTok, rb, 'Buttons and links'],
    [ui.card({ meta: d0.price, title: d0.to, text: d0.when }), 'radius-card', rCard, 'Cards, dialogs, panels'],
    [`<div style="display:flex;align-items:center;gap:16px"><span class="ui-avatar">${A(S.initials)}</span><label class="ui-choice"><input class="ui-switch" type="checkbox" role="switch" checked aria-label="${A(S.share)}"></label></div>`, 'radius-round', rRound, 'Avatars and switches only'],
    [`<ul class="ui-list">${ui.row({ title: d0.to, sub: d0.when })}</ul>`, 'border-hairline', bHair, 'Dividers between rows'],
    [field(''), 'border-control', bCtl, 'Control edges'],
    [field('is-focus'), 'border-focus', bFoc, 'Focus ring, 2 px clear of the edge'],
  ].map(([spec, t, v, u]) => `<div style="display:flex;align-items:center;gap:24px"><div style="width:220px;flex:none">${spec}</div><div style="min-width:0"><div style="font:500 12px/16px var(--chrome);color:var(--text)">${A(t)}</div><div style="font:400 12px/18px var(--mono);color:var(--quiet)">${A(v + ' px')}</div><div style="font:400 12px/18px var(--body);color:var(--text-soft)">${A(u)}</div></div></div>`).join('');
  const words = kitLabel(ctx, 996, 512, 'Corners and edges')
    + text(ctx, 996, 536, 444, 88, `Controls turn their corners at ${rc} px and cards at ${rCard} px; only avatars and switches go fully round. Edges are ${bCtl} px, and focus adds a ${bFoc} px ring that stands 2 px clear.`);
  return kitPage(ctx, 'radii-borders', print + text(ctx, 60, 776, 444, 22, `An input with focus, drawn at ${ZOOM} times.`)
    + uiDark(528, 316, 444, 620, items, 'display:flex;flex-direction:column;justify-content:space-between') + kitCaption(ctx, 'radii-borders') + words, 'u1-radii');
}

// elevation: three levels across the first three columns, from the ground to the dialog over its scrim
function elevation(ctx) {
  const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, M = colourMap(ctx, 'dark'), d0 = S.deliveries[0], D = S.dialog, flat = B.ui.shadows === 'none';
  const steps = ['raised', 'surface', 'sunken'].map((k, i) => `<div class="a" style="left:60px;top:${316 + i * 100}px;width:210px;height:100px;background:${M[k]}"></div>`
    + tok(ctx, 76, 316 + i * 100 + 62, '--' + k, 178) + lit(ctx, 76, 316 + i * 100 + 78, M[k], 178, 'var(--soft)')).join('')
    + `<div class="a" style="left:60px;top:316px;width:210px;height:300px;box-shadow:inset 0 0 0 1px var(--hair);pointer-events:none"></div>`;
  const card = uiDark(294, 316, 210, 0, ui.card({ meta: d0.price, title: d0.to, text: d0.when }));
  const dlg = uiDark(528, 316, 444, 300, `<div class="ui-scrim" style="height:100%;box-sizing:border-box;padding:20px">${ui.dialog({ title: D.title, body: D.body, confirm: D.confirm, keep: D.keep }).replace(/dlg-t/g, 'u1-elev-dlg')}</div>`);
  const caps = [
    [60, 210, 'Ground', `Sunken, surface, raised: the page steps by ground${flat ? ', not by shadow' : ''}.`],
    [294, 210, 'Resting', `A card rests on the ground with a ${pxOf(ctx.borders, 'border-hairline')} px edge in the divider tone.`],
    [528, 444, 'Floating', `A dialog floats over the scrim with a ${pxOf(ctx.borders, 'border-control')} px edge in the text tone${flat ? ' and no shadow' : ''}.`],
  ].map(([x, w, t, s]) => put(ctx, { x, y: 640, w, h: 20, role: 'body', size: 14, line: 20, weight: 500, style: 'font:500 14px/20px var(--body);color:var(--ink)', html: A(t) }) + text(ctx, x, 664, w, 66, s)).join('');
  const sh = flat ? 'none' : B.ui.shadows;
  const words = kitLabel(ctx, 996, 512, 'Elevation') + text(ctx, 996, 536, 444, 88, B.ui.elevationNote) + lit(ctx, 996, 640, `--shadow-float: ${sh}`, 444);
  return kitPage(ctx, 'elevation', steps + card + dlg + caps + kitCaption(ctx, 'elevation') + words, 'u1-elev');
}

export const uikit = {
  cover(ctx) {
    const B = ctx.brand, T = ctx.roles.dark, wt = ctx.weights.heading, lw = 288, lh = (ctx.logo.geos.colour.h / ctx.logo.geos.colour.w) * lw, by = Math.round(316 + lh + 64);
    const logo = `<div class="a" style="left:60px;top:316px;width:${lw}px">${ctx.logo.html('colour', { width: lw, colourway: cwOn(ctx, T.surface) })}</div>`;
    const left = put(ctx, { x: 60, y: by, w: 444, h: 24, cls: 'ct', role: 'body', size: 16, line: 24, weight: 500, html: 'UI kit' })
      + text(ctx, 60, by + 28, 444, 22, ctx.versionLine) + text(ctx, 60, by + 64, 560, 88, B.product);
    const big = put(ctx, { x: 60, baseline: 876, w: 660, h: 116, cls: 'disp', role: 'display', size: 120, line: 116, weight: wt, style: 'font-size:120px;line-height:116px;letter-spacing:-0.02em', html: 'UI kit' });
    const cap = kitCaption(ctx, 'cover', { x: 762, w: 678, head: 792, baseline: 824, titleY: 848, textY: 876, noRule: true });
    return kitPage(ctx, 'cover', logo + left + big + kitPrint(ctx, 1, 762, 316, 678, 452) + cap, 'u1-cover');
  },
  contents(ctx) {
    const cols = [60, 294, 528, 762], wt0 = ctx.weights.heading; let ts = 36; while (ts > 20 && Math.max(...ctx.sections.slice(0, 4).map((s) => adv(ctx, 'display', s.title, ts, 0, wt0))) > 206) ts -= 2;
    const body = ctx.sections.slice(0, 4).map((s, i) => {
      const x = cols[i];
      return put(ctx, { x, y: 316, w: 210, h: 44, cls: 'disp', role: 'display', size: ts, line: 44, weight: ctx.weights.heading, style: `font-size:${ts}px;line-height:44px`, html: A(s.title) })
        + s.pages.map((p, k) => put(ctx, { x, y: 400 + k * 42, w: 34, h: 24, cls: 'edge num', role: 'edge', size: 14, line: 24, weight: 600, style: 'line-height:24px;color:var(--quiet)', html: String(p.no).padStart(2, '0') })
          + put(ctx, { x: x + 36, y: 400 + k * 42, w: 174, h: 24, role: 'body', size: 16, line: 24, style: 'font:400 16px/24px var(--body);color:var(--soft);overflow:hidden;text-overflow:ellipsis', html: A(p.title) })).join('');
    }).join('');
    const words = kitLabel(ctx, 996, 512, 'Reading the roll') + text(ctx, 996, 536, 444, 88, 'Each page is one frame of the roll, and its page number is the frame number printed on the film. The circled frame is the screen the page is about.');
    return kitPage(ctx, 'contents', body + kitCaption(ctx, 'contents') + words, 'u1-contents');
  },
  'colour-light': (ctx) => colourPage(ctx, 'colour-light', 'light'),
  'colour-dark': (ctx) => colourPage(ctx, 'colour-dark', 'dark'),
  'type-scale': typeScale,
  spacing,
  'radii-borders': radiiBorders,
  elevation,
};

export const css = (ctx) => kitDocCss(ctx) + `\n.pg.u1-kit .ui{white-space:normal}`;
