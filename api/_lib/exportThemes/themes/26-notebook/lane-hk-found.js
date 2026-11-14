// Theme 26, Notebook, lane hk: the foundation pages of the kit site (cover, contents, colour, type, spacing, radii and borders, elevation).
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';
import { readable, nb } from './helpers.js';
import { modeLabel } from './lane-u1.js';
import { sc, ex, ut, E, uid, piece, says, ladder, pair, stack, appendix, sec, note, mono, ink, name, cap, ratio, tapeTab } from './lane-hk-parts.js';

// ---- cover: the endpaper in the reversed ground with "UI kit" at the extreme of the display face, and the flyleaf beside it ----
function cover(ctx, K) {
  const B = ctx.brand, rev = B.logo.colourways.reversed, F = sc(ctx).form || {};
  const inkc = readable(ctx, rev.ground, [rev.name, nb(ctx).paper], 'kit cover');
  const faces = [B.fonts.display.family, B.fonts.body.family].filter((f, i, a) => a.indexOf(f) === i).join(' and ');
  const btn = (m) => piece(ctx, m, `<div class="hk-stack">${ctx.ui.btn(F.book || sc(ctx).share)}</div>`, { label: modeLabel(m) });
  return `<div class="hk-cover"><div class="hk-end" style="background:${rev.ground};color:${inkc}"><span class="hk-end__logo">${ctx.logo.html('reversed', { width: 171, color: rev.name })}</span><h1>UI kit</h1></div>`
    + `<div class="hk-fly"><h2>${E(ctx, B.name)} UI kit</h2>${note(ctx, ctx.versionLine)}${note(ctx, `Set in ${faces}. Light and dark.`)}${btn('light')}${btn('dark')}`
    + `<a class="hk-tape" href="${K.href('contents')}">Open the contents</a></div></div>`;
}

// ---- contents: each part a length of tape, two units long for every page it holds; its pages listed under it with their numbers ----
function contents(ctx, K) {
  const part = (s) => `<section class="hk-part"><h2 class="hk-tape" style="width:${Math.max(48 * s.pages.length, 0)}px;min-width:fit-content">${E(ctx, `${s.n} ${s.title}`)}</h2><div class="hk-pages">${s.pages.map((p) => `<a href="${K.href(p.id)}"><span>${E(ctx, p.title)}</span><span>${E(ctx, p.ref || '')}</span></a>`).join('')}</div></section>`;
  const key = `<section class="hk-sec"><h2 class="hk-tape hk-h2">How this kit is kept</h2>${note(ctx, 'Tape names a piece or a value.')}`
    + `<div class="hk-two">${piece(ctx, 'light', ctx.ui.btn(sc(ctx).form.book), { label: 'Light' })}${piece(ctx, 'dark', ctx.ui.btn(sc(ctx).form.book), { label: 'Dark' })}</div>`
    + `${note(ctx, 'A piece cut from the light or the dark surface holds real components at 1:1. The page behind it can be light or dark; the pieces do not change.')}</section>`;
  return `<div class="hk-body">${ctx.sections.map(part).join('')}${key}</div>`;
}

// ---- colour: the product's live line and every text role on the mode's surface, then every fill as a swatch with its words ----
function colour(ctx, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), W = ctx.weights, r = (a, b) => ratio(ctx, a, b);
  const inks = [['text', S.rider, W.strong], ['text-soft', S.pickup, W.regular], ['quiet', S.deliverTo, W.regular]];
  const seen = new Set(inks.map((x) => x[0]));
  for (const s of ctx.status) { const t = statusText(ctx, mode, s), tok = t.token.slice(2); if (seen.has(tok)) continue; seen.add(tok); inks.push([tok, s.label, W.medium]); }
  const rows = inks.map(([tok, text, wt]) => `<div class="hk-inkrow"><span style="font:${wt} 15px/22px var(--hk-body);color:var(--${tok})">${E(ctx, text)}</span><span class="hk-vals"><span class="hk-mono" style="background:transparent">--${tok}</span><span class="hk-mono" style="background:transparent">${r(M[tok], M.surface)}</span></span></div>`).join('');
  const live = `<p class="hk-big" style="font-size:clamp(32px,6vw,57px);line-height:1.1;color:var(--text)">${E(ctx, S.eta)}</p>`;
  const verso = piece(ctx, mode, `${live}<div style="margin-top:24px">${rows}</div>`, { label: `Surface, ${modeLabel(mode).toLowerCase()}` });
  const scrimInk = ctx.ratio(M.surface, M.scrim) >= ctx.ratio(M.text, M.scrim) ? 'surface' : 'text';
  const fills = [
    ['Surface', 'surface', 'text'], ['Raised', 'raised', 'text'], ['Sunken', 'sunken', 'text'], ['Action', 'action', 'action-label'], ['Action hover', 'action-hover', 'action-label'],
    ['Action pressed', 'action-pressed', 'action-label'], ['Disabled', 'disabled-bg', 'disabled-text'], ['Scrim', 'scrim', scrimInk],
    ['Control edge', 'edge', 'text', `inset 0 0 0 ${ctx.brand.ui.border}px ${M.edge}`], ['Divider', 'divider', 'text', `inset 0 -1px 0 ${M.divider}`], ['Focus ring', 'focus', 'text', `inset 0 0 0 2px ${M.focus}`],
  ];
  const sw = fills.map(([nm, tok, fg, line]) => {
    const bg = line ? M.surface : M[tok], edge = !line && ctx.ratio(bg, nb(ctx).paper) < 1.15 ? ' is-edge' : '';
    return `<div class="hk-swr"><div class="hk-sw${edge}" style="background:${bg};color:${M[fg]};${line ? `box-shadow:${line}` : ''}">${E(ctx, nm)}</div><div class="hk-vals">${mono(ctx, '--' + tok)}${mono(ctx, M[tok])}${mono(ctx, line ? r(M[tok], M.surface) : r(M[fg], bg))}</div></div>`;
  }).join('');
  const say = mode === 'dark' ? 'Dark is the same markup under data-theme="dark". Components read roles such as --action, never a palette name.' : 'Light is the default, on :root. Components read roles such as --action, never a palette name.';
  return `<div class="hk-body">${sec(ctx, '', `${verso}${note(ctx, say)}`)}${sec(ctx, 'Fills', `${sw}${note(ctx, 'Each swatch is measured with the words it carries; each line against the surface. Text under 24 px needs 4.5 : 1, edges and the focus ring 3 : 1.')}`)}</div>`;
}

// ---- type scale: each size set at the size it ships, largest first, one real line of the product per size ----
function typeScale(ctx) {
  const B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {}, stretch = B.fonts.display.stretch || 100;
  const sample = { caption: F.notesHelp, label: F.pickup, body: S.pickup, control: F.book, 'title-s': D.title, title: S.rider, headline: S.eta };
  const rows = [...ctx.uiType].sort((a, b) => b.size - a.size).map((t) => {
    const disp = t.face === 'display';
    const face = disp ? `font-family:var(--hk-display);font-stretch:${stretch}%;letter-spacing:-0.01em` : 'font-family:var(--hk-body)';
    return `<div class="hk-ts"><div>${tapeTab(ctx, t.token)}${mono(ctx, `${t.size} / ${t.line} / ${t.weight}`)}</div><div><p class="hk-ts__s" style="${face};font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${E(ctx, sample[t.token] || t.use)}</p>${note(ctx, t.use)}</div></div>`;
  }).join('');
  const min = Math.min(...ctx.uiType.map((t) => t.size)), d = B.fonts.display, b = B.fonts.body;
  return `<div class="hk-body"><div>${rows}</div>${note(ctx, `Every line is printed at its own size. Nothing on screen is smaller than ${min} px, and figures that change are tabular.`)}${note(ctx, `${d.family} sets titles and the live line; ${b.family} sets everything people read and press. Size, line height and weight are in px.`)}</div>`;
}

// ---- spacing: each step as a square of tape at its true size, then a form with its gaps marked ----
function spacing(ctx) {
  const sp = ctx.space, base = ctx.brand.ui.spacingBase, S = sc(ctx), F = S.form || {};
  const allOn = sp.every((s) => s.px % base === 0);
  const squares = `<div class="hk-sq">${sp.map((s) => `<div><i style="width:${s.px}px;height:${s.px}px"></i>${ink(ctx, `${s.px} px`)}${mono(ctx, `sp-${s.token.replace('space-', '')}`)}</div>`).join('')}</div>`;
  const gIn = (sp[2] || sp[sp.length - 1]).px, gOut = (sp[5] || sp[sp.length - 1]).px, pad = (sp[4] || sp[sp.length - 1]).px;
  const gap = (h, label) => `<span class="hk-gapw" style="height:${h}px"><b></b><span>${E(ctx, label)}</span></span>`;
  const form = `<div style="padding:${pad}px;display:flex;flex-direction:column;align-items:stretch;max-width:420px">${ctx.ui.field({ id: uid('sp'), label: F.pickup || 'Name', value: F.pickupValue || '' })}${gap(gIn, `${gIn} px in a group`)}${ctx.ui.field({ id: uid('sp'), label: F.dropoff || 'Address', value: F.dropoffValue || '' })}${gap(gOut, `${gOut} px between`)}<div>${ctx.ui.btn(F.book || S.share)}</div></div>`;
  const head = `${sp.length} steps, ${sp[0].px} to ${sp[sp.length - 1].px} px`;
  return `<div class="hk-body">${sec(ctx, head, `${allOn ? note(ctx, `Every gap and padding in the product is one of these, each a multiple of ${base} px.`) : ''}${squares}${note(ctx, 'Squares at true size.')}`)}`
    + `${sec(ctx, 'Form, at 1:1', `${piece(ctx, 'light', form.replace('padding:', 'margin:-36px -24px -24px;padding:'), { label: 'Light' })}${mono(ctx, `padding ${pad} px, inside a group ${gIn} px, between groups ${gOut} px`)}${note(ctx, `The gap inside a group, ${gIn} px, is smaller than the gap between groups, ${gOut} px, so what belongs together reads together.`)}`)}</div>`;
}

// ---- radii and borders: an input's corner drawn at 8 times with its ring and gap, and the real controls at 1:1 ----
function radii(ctx) {
  const S = sc(ctx), F = S.form || {}, ui = ctx.ui, M = colourMap(ctx, 'light');
  const R = ctx.radius.input, bw = ctx.brand.ui.border, [bh, bc, bf] = ctx.borders, ring = bf.px, gap = 2, k = 8;
  const o = (ring + gap) * k, rr = R * k;
  const drawn = `<div class="hk-corner hk-lt" style="--ch:${Math.round(o + bw * k + rr + 80)}px;--co:${o}px"><i style="border:${bw * k}px solid ${M.edge};border-top-left-radius:${rr}px;box-shadow:0 0 0 ${gap * k}px ${M.surface},0 0 0 ${(gap + ring) * k}px ${M.focus};margin:0"></i></div>`;
  const items = [
    [ui.field({ id: uid('rb'), label: F.pickup || 'Name', value: F.pickupValue || '', state: 'focus' }), 'Input, focused', `${ctx.radius.input} px, edge ${bc.px} px, ring ${bf.px} px`],
    [ui.btn(F.book || S.share), 'Button', `${ctx.radius.button} px`],
    [`<div style="display:flex;align-items:center;gap:16px"><span class="ui-avatar">${E(ctx, S.initials || '')}</span>${ui.switch(S.call || 'On', { checked: true })}</div>`, 'Round', 'Avatars and switches only'],
    [ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.riderNote }), 'Card', `${ctx.radius.card} px, divider ${bh.px} px`],
  ];
  const rows = items.map(([h, nm, v]) => [piece(ctx, 'light', `<div class="hk-stack">${h}</div>`, { label: nm }), says(ctx, nm, '', v)]);
  return `<div class="hk-body">${sec(ctx, "An input's corner, drawn at 8 times", `${drawn}${ink(ctx, `Radius ${R} px, edge ${bw} px, gap ${gap} px, ring ${ring} px`)}${note(ctx, `Drawn at ${k} times: the ring is ${ring} px on a ${gap} px gap of the ground, the edge ${bw} px, the corner ${R} px.`)}`)}`
    + `${sec(ctx, 'The controls at 1:1', ladder(rows))}${note(ctx, `Controls take ${ctx.radius.control} px and cards ${ctx.radius.card} px. The notebook is square, so the product's corners show only where it ships.`)}</div>`;
}

// ---- elevation: sunken well, surface holding a raised card, and the dialog floating; light beside dark ----
function elevation(ctx) {
  const B = ctx.brand, S = sc(ctx), D = S.dialog || {}, ui = ctx.ui, shadow = tokenGroups(ctx).shadow['shadow-float'];
  const leaf = (mode) => {
    const M = colourMap(ctx, mode), id = uid('dlg');
    const card = ui.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true });
    const dlg = ui.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || 'Cancel' }).replace(/dlg-t/g, id);
    const layers = `<div class="hk-stack" style="gap:24px;align-items:stretch">${cap(ctx, 'Sunken')}<div style="background:var(--surface);padding:24px;border:1px solid var(--hk-fold)"><div class="hk-stack" style="gap:12px">${cap(ctx, 'Surface')}${card}</div></div></div>`;
    return `<div class="hk-sec">${piece(ctx, mode, layers, { label: modeLabel(mode), bg: 'sunk' })}${piece(ctx, mode, dlg, { label: 'Floating' })}`
      + [['Sunken', '--sunken', M.sunken], ['Surface', '--surface', M.surface], ['Raised', '--raised', M.raised], ['Floating', `${B.ui.border} px edge`, '--text']].map(([n, t, v]) => `<div class="hk-vals">${name(ctx, n)}${mono(ctx, t)}${mono(ctx, v)}</div>`).join('') + '</div>';
  };
  return `<div class="hk-body">${note(ctx, B.ui.elevationNote || 'Grounds step from the surface; anything that floats has an edge.')}${pair(leaf('light'), leaf('dark'))}${note(ctx, `The float shadow token, --shadow-float, is ${shadow}. Dark steps the same way, on the dark grounds.`)}</div>`;
}

export const found = { cover, contents, 'colour-light': (c) => colour(c, 'light'), 'colour-dark': (c) => colour(c, 'dark'), 'type-scale': typeScale, spacing, 'radii-borders': radii, elevation };
