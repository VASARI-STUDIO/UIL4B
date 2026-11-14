// Lane hk, foundations for theme 28 (Riso): cover, contents, colour, type, spacing, radii and borders, elevation. Each page is a plate with its
// hit numeral (always a real count from ctx, named on the plate), then the paper: the product's own surfaces with the real components in them,
// and a ruled list of what each part is set in. Every hex, ratio and size is read from ctx; copy is the brand's own, printed whole.
import { A, val, sc, Word, word, rt, sheet, lab, note, b, pan, live, ledger, rowLab, ruled, tok, chip, folio } from './lane-hk-lib.js';
import { fitW, longDate, faceCss } from './sheet.js';
import { colourMap, tokenGroups } from '../../engine/tokens.js';

const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[ctx.uiType.length - 1];
const sec = (inner) => `<div class="hk-sec">${inner}</div>`;
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const nTokens = (ctx) => {
  const g = tokenGroups(ctx);
  return Object.keys(colourMap(ctx, 'light')).length + ctx.colours.length + ['space', 'radius', 'width', 'font', 'text', 'shadow'].reduce((a, k) => a + Object.keys(g[k]).length, 0);
};

function colourPage(ctx, K, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, ui = ctx.ui, isDark = mode === 'dark';
  const exempt = !!(ctx.brand.ui[mode] || {}).actionExempt;
  const G = [
    [['Surface', 'surface', 'Text on it', M.text, M.surface, 4.5], ['Raised', 'raised', 'Text on it', M.text, M.raised, 4.5], ['Sunken', 'sunken', 'Quiet text on it', M['quiet-sunken'], M.sunken, 4.5]],
    [['Text', 'text', 'On surface', M.text, M.surface, 4.5], ['Soft text', 'text-soft', 'On surface', M['text-soft'], M.surface, 4.5], ['Quiet text', 'quiet', 'On surface', M.quiet, M.surface, 4.5]],
    [['Control edge', 'edge', 'On surface', M.edge, M.surface, 3], ['Divider', 'divider', 'On surface', M.divider, M.surface, 0], ['Focus ring', 'focus', 'On surface', M.focus, M.surface, 3]],
    [['Action', 'action', 'On surface', M.action, M.surface, exempt ? -1 : 3], ['Action hover', 'action-hover', 'Label on it', M['action-label'], M['action-hover'], 4.5],
      ['Action pressed', 'action-pressed', 'Label on it', M['action-label'], M['action-pressed'], 4.5], ['Action label', 'action-label', 'On action', M['action-label'], M.action, 4.5]],
    [['Disabled ground', 'disabled-bg', 'Disabled text on it', M['disabled-text'], M['disabled-bg'], 4.5], ['Scrim', 'scrim', 'Behind a dialog', null, null, 0]],
    ['success', 'warning', 'danger', 'info'].map((t) => [cap(t), t, 'On its own ground', M[t], M[t + '-bg'], 4.5]),
  ];
  const n = G.reduce((a, g) => a + g.length, 0);
  const need = (v) => (v > 0 ? val(`${v} : 1`) : v < 0 ? 'Exempt' : 'None');
  const rows = [];
  G.forEach((g, gi) => {
    if (gi) rows.push(null);
    for (const [name, t, how, fg, bg, nd] of g) rows.push([`${chip(M[t])}<span class="hk-b">${A(name)}</span>`, tok('--' + t), tok(M[t]), A(how), need(nd), fg ? `<span class="hk-v">${A(rt(ctx, fg, bg))}</span>` : '']);
  });
  const hd = uiT(ctx, 'headline');
  const left = `<div class="hk-flowc" style="gap:20px"><div class="hk-flowc" style="gap:6px"><p class="ui-caption" style="color:var(--quiet)">${A(S.rider)}</p>
<p class="ui-display" style="font-size:${hd.size}px;line-height:${hd.line}px;color:var(--text);overflow-wrap:anywhere">${A(S.eta)}</p><p style="color:var(--text-soft)">${A(S.pickup)}</p></div>
<div class="hk-flow">${ui.btn(F.book || S.share)}${ui.btn(S.call, { variant: 'secondary' })}</div></div>`;
  const right = `<div class="hk-flowc">${ctx.status.map((s) => ui.statusChip(s.id)).join('')}</div>`;
  const body = sec(`${lab(isDark ? 'In use, on the dark surface' : 'In use, on the light surface')}${pan(`<div class="hk-two" style="gap:24px 32px">${left}${right}</div>`, { mode })}`)
    + sec(`${lab('Every role, measured on the ground it prints on')}${ruled('minmax(0,1.3fr) minmax(0,1.1fr) 90px minmax(0,1.2fr) 80px 80px', ['Role', 'Token', 'Value', 'Measured', '<span class="hk-r" style="display:block">Needs</span>', '<span class="hk-r" style="display:block">Ratio</span>'], rows.map((r) => (r ? [r[0], r[1], r[2], r[3], `<span class="hk-r" style="display:block">${r[4]}</span>`, `<span class="hk-r" style="display:block">${r[5]}</span>`] : null)))}
${note(isDark ? `The same markup under ${val('data-theme="dark"')}. Components read the role, never a palette name.` : `The default, on ${val(':root')}. Components read the role, never a palette name.`)}`);
  return sheet(ctx, K, { label: isDark ? 'Colour, dark' : 'Colour, light', hit: n, hitLeft: true, plate: `${b(`${Word(n)} roles`)}<br>a component reads in ${mode} mode, each measured on the ground it prints on.`, body });
}

export const found = {
  cover(ctx, K) {
    const B = ctx.brand, nTok = nTokens(ctx), nDark = Object.keys(colourMap(ctx, 'dark')).length;
    const lw = fitW(ctx, 'colour', 330, 150);
    const F = B.fonts, faces = [...new Set([F.display.family, F.body.family])];
    const fact = (l, v) => `<div class="hk-sec" style="gap:4px"><p class="hk-lab">${l}</p><p>${v}</p></div>`;
    const start = [['colour-light', 'Colour'], ['buttons', 'Buttons'], ['screen-light', 'Product screen'], ['code', 'The code package']].filter(([id]) => K.pages.some((p) => p.id === id));
    const body = `<div class="hk-sec"><div style="width:${lw}px;max-width:100%">${ctx.logo.html('colour', { width: lw, colourway: 'colour', label: 'Your logo goes here' })}</div>
<p style="max-width:36ch">${A(B.product)}</p></div>
<div class="hk-two" style="gap:24px 48px">${fact('Version', val(B.version.number))}${fact('Modes', 'Light and dark')}${fact('Faces', faces.map(A).join(', '))}</div>
<div class="hk-sec">${lab('Start with')}${ruled('minmax(0,1fr) 60px', null, start.map(([id, t]) => [`<a href="${K.href(id)}" class="hk-b">${A(t)}</a>`, `<span class="hk-v hk-r" style="display:block">${folio(K, id)}</span>`]))}</div>`;
    return sheet(ctx, K, {
      label: 'UI kit', hit: nTok, tall: true, hitLeft: true,
      plate: `${b('Tokens')}<br>in the code package, on ${val(':root')}. Dark mode changes ${nDark} of them.<br>Edition ${val(B.version.number)}, ${A(longDate(B.version.date))}`, body,
    });
  },

  contents(ctx, K) {
    const np = K.pages.length, parts = [];
    K.pages.forEach((p, i) => { if (!p.section) return; let g = parts.find((x) => x.n === p.section.n); if (!g) { g = { n: p.section.n, title: p.section.title, pages: [] }; parts.push(g); } g.pages.push({ ...p, f: i + 1 }); });
    const lists = parts.map((s) => `<div class="hk-sec" style="gap:8px"><p class="hk-lab"><span class="hk-v">${String(s.n).padStart(2, '0')}</span> ${A(s.title)}</p>${ruled('minmax(0,1fr) 56px', null, s.pages.map((p) => [`<a href="${p.href}">${A(p.title)}</a>`, `<span class="hk-v hk-r" style="display:block">${String(p.f).padStart(3, '0')}</span>`]))}</div>`).join('');
    return sheet(ctx, K, { label: 'Contents', hit: np, hitLeft: false, plate: `${b(`${Word(np)} pages`)}<br>in ${word(parts.length)} parts, from the cover to the code package.`, body: `<div class="hk-two">${lists}</div>` });
  },

  'colour-light': (ctx, K) => colourPage(ctx, K, 'light'),
  'colour-dark': (ctx, K) => colourPage(ctx, K, 'dark'),

  'type-scale'(ctx, K) {
    const S = sc(ctx), F = S.form || {}, D = S.dialog || {}, n = ctx.uiType.length;
    const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': D.title, title: S.rider, headline: S.eta };
    const steps = [...ctx.uiType].sort((a, c) => c.size - a.size);
    const rows = steps.map((t) => {
      const role = t.face === 'display' ? 'display' : 'body', text = sample[t.token] || t.use, fam = ctx.brand.fonts[role].family;
      return [`<p style="${faceCss(ctx, role, t.weight)};font-size:${t.size}px;line-height:${t.line}px;overflow-wrap:anywhere">${A(text)}</p>`, `<p class="hk-lab">${A(t.token)}</p><p class="hk-v">${t.size} / ${t.line} / ${t.weight}</p><p class="hk-note">${A(fam)}</p>`];
    });
    const min = Math.min(...ctx.uiType.map((t) => t.size));
    const body = sec(`${lab('Token, size / line / weight')}${ruled('minmax(0,1fr) 220px', null, rows)}${note(`Sizes and line heights in px. Nothing on screen is set smaller than ${val(min + ' px')}.`)}`);
    return sheet(ctx, K, { label: 'Type scale', hit: n, hitLeft: false, plate: `${b(`${Word(n)} steps`)}<br>from the headline down to the caption, each set here at the size it ships.`, body });
  },

  spacing(ctx, K) {
    const sp = ctx.space, n = sp.length, base = ctx.brand.ui.spacingBase;
    const allOn = base && sp.every((s) => s.px % base === 0);
    const first = sp[0].token.replace('space-', 'sp-'), last = sp[n - 1].token.replace('space-', 'sp-');
    const rows = sp.map((s) => [tok('--' + s.token.replace('space-', 'sp-')), tok(s.px + ' px'), `<i style="display:block;height:${s.px}px;max-width:460px;background:var(--hk-plate)"></i>`]);
    const body = sec(`${lab('Each band is as deep as its step')}${ruled('110px 70px minmax(0,1fr)', null, rows)}`)
      + `<div class="hk-two"><div class="hk-sec" style="gap:6px">${lab(allOn ? `A ${base} px base` : 'The steps')}${note(allOn ? `Every step is a whole number of ${val(base + ' px')} units, so edges land on the same lines across a screen.` : 'The steps are set by the brand, not by a single base.')}</div>
<div class="hk-sec" style="gap:6px">${lab('In the code')}${note(`Written as ${val('--' + first)} to ${val('--' + last)} in tokens.css.`)}</div></div>`;
    return sheet(ctx, K, { label: 'Spacing', hit: n, hitLeft: true, plate: `${b(`${Word(n)} steps`)}<br>for every gap and padding, from ${val(sp[0].px + ' px')} to ${val(sp[n - 1].px + ' px')}.`, body });
  },

  'radii-borders'(ctx, K) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, ui = ctx.ui, g = tokenGroups(ctx), R = ctx.radius;
    const rIn = R.input, bw = ctx.brand.ui.border;
    const k = Math.max(4, Math.min(24, Math.floor(160 / Math.max(rIn, 1)), Math.floor(32 / bw)));
    const ro = rIn * k, ri = Math.max(0, rIn - bw) * k, e = bw * k, BW = 200, BH = 220, bx = 28, by = 28;
    const rr = (x, y, w, h, rad) => `M${x + rad} ${y}H${x + w}V${y + h}H${x}V${y + rad}${rad ? `A${rad} ${rad} 0 0 1 ${x + rad} ${y}` : ''}Z`;
    const corner = `<svg width="100%" style="max-width:${BW + bx}px" viewBox="0 0 ${BW + bx} ${BH + by}" role="img" aria-label="An input's corner, ${k} times its size"><clipPath id="hk-cc"><rect x="${bx - 1}" y="${by - 1}" width="${BW + 1}" height="${BH + 1}"/></clipPath>
<path clip-path="url(#hk-cc)" fill="${M.edge}" fill-rule="evenodd" d="${rr(bx, by, 900, 900, ro)} ${rr(bx + e, by + e, 900, 900, ri)}"/>
<g fill="currentColor"><rect x="${bx}" y="${by - 14}" width="${Math.max(ro, 12)}" height="1"/><rect x="${bx - 14}" y="${by}" width="1" height="${e}"/></g></svg>`;
    const demo = `<div class="hk-flowc" style="gap:24px;width:100%;max-width:300px">${ui.field({ id: 'hk-rb1', label: F.dropoff || S.deliverToLabel, value: F.dropoffValue || S.deliverTo, state: 'focus' })}
<div class="hk-flow">${ui.btn(F.book || S.share)}<span class="ui-avatar">${A(S.initials || '')}</span></div>${ui.switch(S.share, { checked: true })}
<div style="width:100%">${ui.card({ meta: S.deliverToLabel, title: S.rider, text: S.riderNote })}</div></div>`;
    const used = { 'r-control': 'Any control without its own', 'r-button': 'Buttons', 'r-input': 'Inputs and selects', 'r-chip': 'Chips', 'r-card': 'Cards and dialogs', 'r-round': 'Avatars and switches', 'w-hairline': 'Dividers and card edges', 'w-control': 'Control edges and dialog edges', 'w-focus': 'The focus ring' };
    const nR = Object.keys(g.radius).length;
    const rows = [...Object.entries(g.radius).map(([t, v]) => [tok('--' + t), tok(t === 'r-round' ? 'round' : v), A(used[t] || '')]), null, ...Object.entries(g.width).map(([t, v]) => [tok('--' + t), tok(v), A(used[t] || '')])];
    const square = ['control', 'button', 'input', 'chip', 'card'].every((x) => !R[x]);
    const body = `<div class="hk-two"><div class="hk-sec">${lab(`An input's corner, ${k} times its size`)}<div style="color:var(--hk-key)">${corner}</div>${note(`Radius ${val(rIn + ' px')}. Edge ${val(bw + ' px')}.`)}</div>
<div class="hk-sec">${lab('At true size')}${pan(demo, { mode: 'light' })}</div></div>
${sec(`${lab('Every radius and line token')}${ruled('minmax(0,1fr) 100px minmax(0,1.6fr)', ['Token', 'Value', 'Used on'], rows)}`)}`;
    return sheet(ctx, K, { label: 'Radii and borders', hit: nR, hitLeft: true, plate: `${b(`${Word(nR)} radius tokens`)}<br>${square ? 'Every control and card is square; only avatars and switches are round.' : `Controls take ${val(R.control + ' px')}, cards ${val(R.card + ' px')}.`}`, body });
  },

  elevation(ctx, K) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog || {}, ui = ctx.ui, sh = tokenGroups(ctx).shadow['shadow-float'];
    const L = (h) => ctx.C.toOklch(h).L.toFixed(2);
    const dlg = ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || S.call }).replace(/dlg-t/g, 'hk-dlg');
    const levels = [
      ['Floating', 'surface', sh === 'none' ? `A ${ctx.brand.ui.border} px edge in the text colour` : tok('--shadow-float'), dlg],
      ['Raised', 'raised', 'A step up in the ground, no edge', ui.card({ meta: S.paidLabel, title: S.deliverTo, text: S.paid, raised: true })],
      ['Surface', 'surface', `A ${ctx.borders[0].px} px divider round the card`, ui.card({ meta: S.deliverToLabel, title: S.rider, text: S.riderNote })],
      ['Sunken', 'sunken', 'Skeletons and wells, while content loads', `<div class="hk-sk">${ui.skeleton('220px')}${ui.skeleton('160px')}${ui.skeleton('190px')}</div>`],
    ];
    const n = levels.length;
    const rows = levels.map(([name, t, how, comp]) => [`<p class="hk-b">${A(name)}</p><p class="hk-v">--${A(t)} ${A(M[t])}, L ${L(M[t])}</p><p class="hk-note">${how}</p>`, comp]);
    const body = sec(`${lab('A stack, read top down')}${ledger(rows, { mode: 'light', pad: '20px' })}`);
    return sheet(ctx, K, { label: 'Elevation', hit: n, hitLeft: false, plate: `${b(`${Word(n)} levels.`)} ${A(ctx.brand.ui.elevationNote || '')}`, body });
  },
};
