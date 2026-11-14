// Theme 24, Standards, lane hk: the kit site's front and foundation pages (cover, contents, colour-light, colour-dark, type-scale,
// spacing, radii-borders, elevation, states). Each keeps the theme's move: the drawing then the thing. Components are ctx.ui, never restyled.
import { A, xOf, fx, adv, wrap, bodyFace, dispFace, typeOf, sc, f2, pad3, hv, ratioText, shippedPx, ex, T, sp, ceilTo, btnW, dimH, dimV, chainH, chainV, drawing, ui, sec, reg, cap, title, swatch, Word, WORD, ruler } from './lane-hk-parts.js';
import { dateLong } from './lane-u1.js';
import { colourMap, tokenGroups, statusText } from '../../engine/tokens.js';

const split = (t, stage, r = false) => `<div class="hk-split${r ? ' hk-split--r' : ''}">${t}<div class="hk-stage">${stage}</div></div>`;
// the largest size at which a line sets on one measure
const fitOne = (font, text, w, sizes, track = 0) => sizes.find((s) => adv(font, text, s, track) <= w) || sizes[sizes.length - 1];
const spreadR = (r, s) => (r === 0 ? 0 : r >= s ? r + s : r + s * (1 + Math.pow(r / s - 1, 3)));

// forced states on markup the helpers take no state for: a class on the nth tag
const nth = (html, tag, map) => { let i = -1; return html.replace(new RegExp(`<${tag} `, 'g'), (m) => { i++; return map[i] ? `<${tag} data-hk="${map[i]}" ` : m; }).replace(/ data-hk="([^"]+)"( class=")?/g, (m, c, k) => (k ? ` class="${c} ` : ` class="${c}" `)); };
const seg = (ctx, items, active, { hoverAt, focusAt, disabled } = {}) => nth(ctx.ui.segmented(items, active, { disabled }), 'button', { [hoverAt]: 'is-hover', [focusAt]: 'is-focus' });
const bare = (value, label, state, disabled) => `<input class="ui-input${state ? ' is-' + state : ''}" type="text" value="${A(value)}" aria-label="${A(label)}"${disabled ? ' disabled' : ''}>`;
const flow = (items) => `<div class="hk-flow">${items.map((h) => `<div>${h}</div>`).join('')}</div>`;

export const pagesA = {
  // ---- cover: the volume on the product's dark surface; the primary button drawn at 3:1 and dimensioned, the real one at 1:1; the parts indexed ----
  cover(ctx, K) {
    const B = ctx.brand, D = ctx.roles.dark, x = xOf(ctx), S = sc(ctx), F = S.form || {}, label = F.book || S.call;
    const w1 = ceilTo(btnW(ctx, label), x), h1 = 44, btn = ctx.ui.btn(label, { block: true });
    const cws = B.logo.colourways, L = (h) => ctx.C.toOklch(h).L, dL = (k) => Math.round(Math.abs(L(cws[k].ground) - L(D.surface)) * 50);
    const cw = Object.keys(cws).sort((a, b) => dL(a) - dL(b) || (b === 'reversed') - (a === 'reversed'))[0];
    const asp = ctx.logo.geo.aspect; let lw = 280, lh = lw / asp; if (lh > 40) { lh = 40; lw = lh * asp; }
    const parts = ctx.sections.map((s) => `<a href="${K.href(s.pages[0].id)}"><span>${s.n}</span><b>${A(s.title)}</b><span>${pad3(ctx.pageNo(s.pages[0].id))}</span></a>`).join('');
    return `<div class="hk-cover"><div>
      <div class="hk-cover__logo">${ctx.logo.html('colour', { width: f2(lw), colourway: cw, color: D.text, label: 'Logo' })}</div>
      <h1 class="hk-t">UI kit</h1>
      <p class="hk-lead hk-q">${A(B.name)}, version ${A(B.version.number)}. ${A(dateLong(B.version.date))}.</p>
      <div class="hk-flow" style="margin-top:40px">
        <div>${drawing({ k: 3, km: 1.5, w: w1, html: btn, dark: true, hdims: dimH(w1, fx(ctx, w1)), vdims: dimV(h1, fx(ctx, h1)), cap: 'Primary button, drawn at 3:1' })}</div>
        <div>${drawing({ k: 1, w: w1, html: btn, dark: true, hdims: dimH(w1, fx(ctx, w1)), vdims: dimV(h1, fx(ctx, h1)), cap: 'At size' })}</div>
      </div></div>
      <nav class="hk-parts" aria-label="Parts of the kit">${parts}</nav></div>
      <p class="hk-scale">Sizes are given in px, the unit the code uses, and in x. One x is ${x} px, the step of the spacing scale.</p>`;
  },

  // ---- contents: the whole kit as one bar of cells, a cell a page, each part's run dimensioned with its page count; the parts as rows ----
  contents(ctx, K) {
    const N = ctx.pages.length, secs = ctx.sections, front = ctx.pages.filter((q) => !q.section).length, x = xOf(ctx);
    const cells = ctx.pages.map((q) => `<i class="${q.section ? '' : 'is-sp'}${q.id === 'contents' ? ' is-here' : ''}"></i>`).join('');
    const runs = `<div class="hk-runs" aria-hidden="true"><div style="flex:${front}"></div>${secs.map((s) => `<div style="flex:${s.pages.length}"><span class="hk-dh" style="--w:1"><b>${s.pages.length}<span class="hk-w"> ${s.pages.length === 1 ? 'page' : 'pages'}</span></b><i><u></u></i></span></div>`).join('')}</div>`;
    const toc = secs.map((s) => `<li><span class="hk-t" style="font-size:20px;line-height:24px">${s.n}</span><h2>${A(s.title)}</h2><ul>${s.pages.map((q) => `<li><a href="${K.href(q.id)}"${q.id === K.page.id ? ' aria-current="page"' : ''}><b>${A(q.title)}</b><span class="hk-v">${pad3(ctx.pageNo(q.id))}</span></a></li>`).join('')}</ul></li>`).join('');
    return split(title(ctx, K, `${Word(N)} pages in ${WORD[secs.length] || secs.length} parts. The bar is the kit at one cell a page, each run a part; the shaded cell is this page.`),
      reg([['Pages', String(N)], ['Parts', String(secs.length)], ['Unit', `1x = ${x} px`]]))
      + `<div class="hk-sec"><h2 class="hk-h">The kit, a cell a page</h2>${runs}<div class="hk-bar24" aria-hidden="true">${cells}</div></div>`
      + `<ul class="hk-toc hk-sec" style="border-top:0;padding-top:0">${toc}</ul>`;
  },

  'colour-light': (ctx, K) => colour(ctx, K, 'light'),
  'colour-dark': (ctx, K) => colour(ctx, K, 'dark'),

  // ---- type-scale: every text style, largest first, in a line of the product at the size it ships; each line box measured in x ----
  'type-scale'(ctx, K) {
    const B = ctx.brand, S = sc(ctx), F = S.form || {}, D = S.dialog || {}, E = S.empty || {};
    const cand = { headline: [S.eta, E.title], title: [S.rider, B.ui.screen.title], time: [S.time], 'title-s': [D.title, F.title], control: [F.book], body: [S.pickup, S.riderNote], label: [F.pickup, F.dropoff], caption: [F.notesHelp, F.bookWhy] };
    const rows = [...ctx.uiType].sort((a, b) => b.size - a.size || b.line - a.line), SW = 340, disp = (t) => t.face === 'display';
    const pick = (t) => {
      const f = disp(t) ? dispFace(ctx, t.weight) : bodyFace(ctx, t.weight), tr = disp(t) ? -0.01 : 0;
      return [...(cand[t.token] || []), S.status, S.eta].filter(Boolean).find((s) => adv(f, s, t.size, tr) <= SW) || t.use;
    };
    const min = Math.min(...rows.map((t) => t.size)), d = B.fonts.display, b = B.fonts.body;
    const list = rows.map((t) => `<li><div style="--k:1">${dimV(t.line, fx(ctx, t.line))}</div>
      <p class="hk-smp" style="font-family:var(${disp(t) ? '--display' : '--body'});${disp(t) ? 'letter-spacing:-0.01em;' : ''}font-size:${t.size}px;line-height:${t.line}px;font-weight:${t.weight}">${A(pick(t))}</p>
      <div class="hk-meta"><b>${A(t.token)}</b><span class="hk-v">${t.size} / ${t.line} px, ${t.weight}</span><span>${disp(t) ? 'Display' : 'Body'}</span></div></li>`).join('');
    return title(ctx, K, `${Word(rows.length)} styles in two faces, ${A(d.family)} and ${A(b.family)}, largest first. Each line is the product's own, at the size it ships; nothing is smaller than ${min} px.`)
      + `<ul class="hk-ts hk-sec" style="border-top:0;padding-top:0">${list}</ul>`;
  },

  // ---- spacing: the steps drawn at 4:1 in the brand's highlight, each dimensioned in x with its token, and at true size under it ----
  spacing(ctx, K) {
    const sp0 = ctx.space, keys = Object.keys(tokenGroups(ctx).space), n = sp0.length, k = 4;
    const steps = sp0.map((s, i) => `<div class="hk-step" style="--p:${s.px}">${dimH(s.px, fx(ctx, s.px))}<div class="hk-bx"></div><span class="hk-v">--${A(keys[i])}</span><span class="hk-v" style="color:var(--qt)">${s.px} px</span><div class="hk-tr"></div></div>`).join('');
    return title(ctx, K, `${Word(n)} steps, each a whole number of x. Each is drawn at ${k}:1 over its token, and at true size under it. Every gap and padding in the kit is one of these.`)
      + `<div class="hk-steps" style="--k:${k};--km:2;margin-top:8px">${steps}</div>`;
  },

  // ---- radii-borders: detail A, the top-left corner of a focused input at 16:1 (the ring, the gap of surface, the edge, the radius), beside the real input ----
  'radii-borders'(ctx, K) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), F = S.form || {}, u = ctx.ui;
    const r = ctx.radius.input, b = ctx.brand.ui.border, k = 16, RX0 = -6, RY0 = -6, RW = 30, RH = 22, W = RW * k, H = RH * k;
    const px = (v) => (v - RX0) * k, py = (v) => (v - RY0) * k, FAR = 2000;
    const rr = (o, rad) => { const x0 = px(o), y0 = py(o), q = rad * k; return `M${f2(x0 + q)} ${f2(y0)}H${FAR}V${FAR}H${f2(x0)}V${f2(y0 + q)}${q ? `A${f2(q)} ${f2(q)} 0 0 1 ${f2(x0 + q)} ${f2(y0)}` : ''}Z`; };
    const svg = `<svg class="hk-detail" viewBox="0 0 ${W} ${H}" role="img" aria-label="Detail A: the top-left corner of a focused input, drawn at ${k}:1"><clipPath id="hk-rc"><rect width="${W}" height="${H}"/></clipPath><g clip-path="url(#hk-rc)">`
      + `<rect width="${W}" height="${H}" fill="${M.surface}"/><path fill="${M.focus}" fill-rule="evenodd" d="${rr(-4, spreadR(r, 4))} ${rr(-2, spreadR(r, 2))}"/>`
      + `<path fill="${M.edge}" fill-rule="evenodd" d="${rr(0, r)} ${rr(b, Math.max(0, r - b))}"/></g><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" fill="none" stroke="var(--ink)"/></svg>`;
    const bands = [['Focus ring', '2 px'], ['Gap of surface', '2 px'], ['Edge', `${b} px`], ['Radius', `${r} px`]];
    const regs = [...ctx.radii.map((q) => [q.token.replace('radius-', 'r-'), q.px, q.use]), ...ctx.borders.map((q) => [q.token.replace('border-', 'w-'), q.px, q.use])];
    const real = ui(`<div class="hk-flow" style="align-items:flex-end"><div style="width:240px;max-width:100%">${u.field({ id: 'hk-rbf', label: F.dropoff, value: F.dropoffValue, state: 'focus' })}</div>${u.btn(F.book)}<span class="ui-avatar">${A(S.initials || '')}</span></div><div style="width:272px;max-width:100%;margin-top:24px">${u.card({ meta: S.status, title: S.rider, text: S.riderNote })}</div>`);
    return split(title(ctx, K, `Corners and line widths. Detail A is the top-left corner of a focused input, drawn at ${k}:1: the focus ring, a gap of surface, the edge and its radius.`),
      `<div class="hk-pair"><div><span class="hk-lab">Detail A, drawn at ${k}:1</span>${svg}${reg(bands.map(([a, v]) => [a, v]))}</div><div><span class="hk-lab">The real components, at size</span>${real}</div></div>`)
      + sec('Radii and line widths', reg(regs.slice(0, 6).map(([t, v, use]) => [hv('--' + t), `${v} px`, A(use)]), 'hk-reg--3'));
  },

  // ---- elevation: the real components, and under each its section: below the surface, on it, a step up, or floating on its edge ----
  elevation(ctx, K) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog || {}, u = ctx.ui, bw = ctx.brand.ui.border, shadow = tokenGroups(ctx).shadow['shadow-float'];
    const plan = [
      `<div class="hk-sk">${u.skeleton('100%')}${u.skeleton('72%')}${u.skeleton('86%')}</div>`,
      u.card({ meta: S.status, title: S.rider, text: S.riderNote }),
      u.card({ meta: S.deliverToLabel, title: S.deliverTo, text: S.paid, raised: true }),
      u.dialog({ title: D.title || S.share, body: D.body || S.pickup, confirm: D.confirm || S.share, keep: D.keep || S.call }).replace(/dlg-t/g, 'hk-dlg'),
    ];
    // each section: [top of the slab, its depth, fill, edge colour, edge width] on a 112 px box whose surface line is at 96
    const sect = [[96, 16, M.sunken, 'var(--ink)', 1], [80, 16, M.surface, 'var(--ink)', 1], [64, 32, M.raised, 'var(--ink)', 1], [8, 16, M.surface, M.text, bw]];
    const labels = [['Sunken', 'sunken', 'Below the surface: wells and loading bars.'], ['Surface', 'surface', `On the surface, a ${ctx.borders[0].px} px divider round it.`], ['Raised', 'raised', 'A step up in the ground, no line.'], ['Floating', 'surface', `A ${bw} px edge in ${hv('--text')}; the shadow token is ${hv(shadow)}.`]];
    const cols = labels.map(([n, tok, note], i) => {
      const [top, dep, fc, ec, ew] = sect[i];
      return `<div class="hk-slab-col"><div class="hk-plan">${ui(plan[i], { cls: i === 3 ? '' : 'hk-ui--tight', style: 'padding:12px' })}</div>
        <div class="hk-slab" style="height:112px;margin-top:8px;border-right:1px dashed var(--qt)"><i style="position:absolute;left:-1px;right:-1px;top:${top}px;height:${dep}px;background:${fc};border:${ew}px solid ${ec}"></i><b style="position:absolute;left:-1px;right:-1px;top:96px;height:1px;background:var(--ink)"></b></div>
        <h2 class="hk-lab" style="margin-top:12px">${A(n)}</h2>${hv('--' + tok)} ${hv(M[tok])}<p class="hk-cap">${note}</p></div>`;
    }).join('');
    const lead = ctx.brand.ui.elevationNote ? A(ctx.brand.ui.elevationNote) : 'Depth is shown by the ground a component sits on and by its edge.';
    return title(ctx, K, lead) + `<div class="hk-slabs" style="margin-top:8px">${cols}</div>`;
  },

  // ---- states: the pressed button drawn at 3:1 inside a dashed line of itself at rest; under it the five rules, each shown on the real controls it changes ----
  states(ctx, K) {
    const S = sc(ctx), F = S.form || {}, E = ex(ctx), x = xOf(ctx), W = ctx.weights, u = ctx.ui, PRESS = 0.97, RING = 2;
    const label = F.book || S.call, w1 = ceilTo(btnW(ctx, label), x), h1 = 44, val2 = F.dropoffValue || S.deliverTo;
    const sizes = F.sizes || E.tabs || [], sw = (E.switches || [S.share])[0], ck = (E.checks || [F.notes || S.share])[0];
    const draw = drawing({ k: 3, km: 1.5, w: w1, html: u.btn(label, { block: true, state: 'pressed' }), cls: 'hk-fig--rest',
      hdims: dimH(w1, fx(ctx, w1)) + `<div style="display:flex;justify-content:center;margin-top:4px">${dimH(w1 * PRESS, fx(ctx, w1 * PRESS))}</div>`, vdims: dimV(h1, fx(ctx, h1)),
      cap: 'Primary button pressed, drawn at 3:1. The dashed line is the same button at rest.' });
    const P = (st) => u.btn(label, { state: st }), Sec = (st, opt = {}) => u.btn(E.secondary || S.call, { variant: 'secondary', state: st, ...opt });
    const rule = (n, r, items) => `<div class="hk-rule"><h3>${n}</h3><p>${r}</p>${flow(items)}</div>`;
    const rules = [
      rule('Hover', `Fill to ${hv('--action-hover')}, or to ${hv('--sunken')}`, [ui(P('hover'), { cls: 'hk-ui--tight' }), ui(Sec('hover'), { cls: 'hk-ui--tight' }), ui(seg(ctx, sizes, 0, { hoverAt: 1 }), { cls: 'hk-ui--tight' }), ui(u.btn(E.quiet || S.call, { variant: 'quiet', state: 'hover' }), { cls: 'hk-ui--tight' })]),
      rule('Focus', `A ${RING} px ring in ${hv('--focus')}, ${RING} px clear`, [ui(P('focus'), { cls: 'hk-ui--tight' }), ui(`<div style="width:200px;max-width:100%">${bare(val2, F.dropoff || S.deliverToLabel, 'focus')}</div>`, { cls: 'hk-ui--tight' }), ui(u.check(ck, { state: 'focus' }), { cls: 'hk-ui--tight' }), ui(u.switch(sw, { state: 'focus' }), { cls: 'hk-ui--tight' })]),
      rule('Pressed', `Fill to ${hv('--action-pressed')}, scaled to ${Math.round(PRESS * 100)}%`, [ui(P('pressed'), { cls: 'hk-ui--tight' }), ui(Sec('pressed'), { cls: 'hk-ui--tight' }), ui(u.btn(E.danger || S.call, { variant: 'danger', state: 'pressed' }), { cls: 'hk-ui--tight' })]),
      rule('Disabled', `${hv('--disabled-text')} on ${hv('--disabled-bg')}. A primary button is never disabled.`, [ui(Sec(undefined, { disabled: true }), { cls: 'hk-ui--tight' }), ui(`<div style="width:200px;max-width:100%">${bare(val2, F.dropoff || S.deliverToLabel, null, true)}</div>`, { cls: 'hk-ui--tight' }), ui(u.check(ck, { disabled: true }), { cls: 'hk-ui--tight' }), ui(u.switch(sw, { disabled: true }), { cls: 'hk-ui--tight' }), ui(seg(ctx, sizes, 0, { disabled: true }), { cls: 'hk-ui--tight' })]),
      rule('Error', `Edge and message in ${hv('--danger')}`, [ui(`<div style="width:280px;max-width:100%">${u.field({ id: 'hk-st-err', label: F.ready || F.pickup, value: F.readyValue || '', error: F.readyError })}</div>`, { cls: 'hk-ui--tight' })]),
    ].join('');
    void W;
    return split(title(ctx, K, `Five rules every control follows. Each state is forced here with its class, ${hv('is-hover')}, ${hv('is-focus')} or ${hv('is-pressed')}; in use the pseudo-class sets it.`), draw)
      + sec('The five rules, on the controls they change', rules);
  },
};

// ---- colour (light and dark share one composition so the two compare) ----
function colour(ctx, K, mode) {
  const M = colourMap(ctx, mode), S = sc(ctx), F = S.form || {}, u = ctx.ui, W = ctx.weights, dark = mode === 'dark';
  const r = (a, b) => ratioText(ctx, a, b), cell = (html, tok, hex, ratio) => `<div class="hk-cell">${html}<span class="hk-v">--${A(tok)}</span><span class="hk-v">${A(hex)} ${ratio}</span></div>`;
  const hero = `<p class="hk-hero" style="color:${M.text};font-weight:${W.heading}">${A(S.eta)}</p><p class="hk-cap hk-onui" style="color:${M.quiet}">${hv('--text')} ${hv(M.text)} on ${hv('--surface')} ${hv(M.surface)}, ${r(M.text, M.surface)}</p>`;
  const inks = [['text-soft', `<p class="hk-line" style="font-weight:${W.medium};color:${M['text-soft']}">${A(S.rider)}</p>`], ['quiet', `<p class="hk-line" style="color:${M.quiet}">${A(S.riderNote)}</p>`]];
  if (M['action-text'] !== M.text) inks.push(['action-text', `<p class="hk-line" style="font-weight:${W.medium};color:${M['action-text']}">${A(S.call)}</p>`]);
  const seen = new Set(inks.map((k) => k[0]));
  for (const s of ctx.status) { const t = statusText(ctx, mode, s), tok = t.token.slice(2); if (seen.has(tok)) continue; seen.add(tok); inks.push([tok, u.statusChip(s.id)]); }
  const states = [['action', null, M['action-label'], M.action], ['action-hover', 'hover', M['action-label'], M['action-hover']], ['action-pressed', 'pressed', M['action-label'], M['action-pressed']], ['focus', 'focus', M.focus, M.surface]];
  const plate = `<div class="ui hk-ui hk-onui" ${dark ? 'data-theme="dark" ' : ''}style="padding:40px;--k:1">${hero}
    <h2 class="hk-h" style="margin:40px 0 16px;border-top:1px solid var(--divider);padding-top:12px;color:var(--text)">Text and status on the surface</h2>
    <div class="hk-inks">${inks.map(([tok, html]) => cell(html, tok, M[tok], r(M[tok], M.surface))).join('')}</div>
    <h2 class="hk-h" style="margin:40px 0 16px;border-top:1px solid var(--divider);padding-top:12px;color:var(--text)">The action, and the focus ring</h2>
    <div class="hk-inks">${states.map(([tok, st, a, b]) => cell(u.btn(F.book, { block: true, state: st || undefined }), tok, M[tok], r(a, b))).join('')}</div></div>`;
  const regRows = [['Raised', 'raised', r(M.text, M.raised)], ['Sunken', 'sunken', r(M.text, M.sunken)], ['Divider', 'divider', r(M.divider, M.surface)], ['Control edge', 'edge', r(M.edge, M.surface)], ['Disabled', 'disabled-bg', r(M['disabled-text'], M['disabled-bg'])], ['Scrim', 'scrim', '']];
  const lead = dark
    ? `The same roles under ${hv('data-theme="dark"')}, measured again on the dark surface. Each ratio is the words on their fill, or the line on the surface.`
    : `The product's light roles, each measured where it is used. Components read a role such as ${hv('--action')}, never a palette name.`;
  return split(`<div class="hk-lcol">` + title(ctx, K, lead) + `<h2 class="hk-h" style="margin-top:8px;border-top:1px solid var(--ink);padding-top:12px">Grounds and lines</h2>`
    + `<ul class="hk-reg hk-reg--sw">${regRows.map(([n, tok, rt]) => `<li>${swatch(M[tok])}<span class="hk-rn">${A(n)}</span><span class="hk-rv">${hv(M[tok])} ${rt}</span></li>`).join('')}</ul></div>`, plate);
}
void typeOf; void sp; void shippedPx; void ruler; void chainH; void chainV; void cap; void wrap; void T;
