// Theme 29 (Blueprint), lane hk: the kit site's screens, tokens and code sheets.
import { colourMap, tokenGroups } from '../../engine/tokens.js';
import { A, sc, ex, mono, det, plate, kr, ttl, sch } from './lane-hk-parts.js';

const x1 = '<span class="hk-m">1:1</span>';
const HEXRE = /^#[0-9a-f]{6}$/i;
const sw = (v) => `<i class="hk-sw" style="background:${A(v)}"></i>`;

const logo = (ctx, dark) => `<span style="display:block;width:120px">${ctx.logo.html('horizontal', { width: 120, colourway: ctx.edition === 'slot' ? undefined : (dark ? 'reversed' : 'colour') })}</span>`;
const progress = (S) => { const p = Math.round((S.progress ?? 0.6) * 100); return `<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="hk-scr__rt"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>`; };
const rider = (ctx, S) => `<div class="hk-scr__rd${ctx.placeholders ? " ph-tight" : ""}"><span class="ui-avatar">${A(S.initials || '')}</span><div><p class="hk-scr__rn">${A(S.rider)}</p><p class="hk-scr__rs">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm', iconLeft: 'phone' })}</div>`;
const detail = (S) => `<dl class="hk-scr__dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;

function desktop(ctx, dark) {
  const S = sc(ctx), ui = ctx.ui, X = ex(ctx), ttlText = ctx.brand.ui.screen.title;
  return `<div class="hk-scr"><nav class="ui-topbar" aria-label="Main">${logo(ctx, dark)}<div class="ui-topbar__links">${ui.links(X.links.slice(0, 3), 0)}</div><span class="hk-scr__clock ui-num">${A(S.time)}</span></nav>
<div class="hk-scr__main"><section class="hk-scr__track" aria-label="${A(ttlText)}"><p class="hk-scr__ttl">${A(ttlText)}</p><div class="hk-scr__eta">${ui.statusChip(S.deliveries[0].status)}<p class="ui-display hk-scr__time">${A(S.eta)}</p></div><p>${A(S.pickup)}</p>${progress(S)}${rider(ctx, S)}${detail(S)}${ui.btn(S.share, { variant: 'secondary', block: true })}</section>
<section class="hk-scr__deliv" aria-label="${A(S.deliverToLabel)}">${ui.deliveryRows(S.deliveries.length)}${ui.btn(S.form.book, { iconRight: 'arrow-right' })}</section></div></div>`;
}

function phone(ctx, dark) {
  const S = sc(ctx), ui = ctx.ui, X = ex(ctx), all = [...X.links.slice(0, 3), [X.account, 'user']];
  return `<div class="hk-scr hk-scr__phone"><div class="ui-topbar">${logo(ctx, dark)}<span class="hk-scr__clock ui-num">${A(S.time)}</span></div>
<div class="hk-scr__body">${ui.statusChip(S.deliveries[0].status)}<p class="ui-display hk-scr__time" style="font-size:var(--fs-headline);line-height:var(--lh-headline)">${A(S.eta)}</p><p>${A(S.pickup)}</p>${progress(S)}${rider(ctx, S)}${ui.card({ meta: S.paidLabel, title: S.paid, text: S.deliverTo })}${ui.btn(S.share, { variant: 'secondary', block: true })}</div>
<nav class="ui-tabbar" aria-label="Sections">${all.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav></div>`;
}

const screenPage = (dark) => (ctx) => `${ttl(dark ? 'Desktop screen, dark' : 'Desktop screen, light', `${A(ctx.brand.ui.screen.title)}, built from the kit's own components and nothing else.`)}
${det(1, dark ? 'Desktop, dark' : 'Desktop, light', x1, plate(desktop(ctx, dark), { dark, cls: 'hk-plate--fill', style: 'padding:0' }))}`;

function mobile(ctx) {
  return `${ttl('Phone screen', `${A(ctx.brand.ui.screen.title)} on a phone: the tab bar takes the page links and the main action stays in reach.`)}
<div class="hk-2">${det(1, 'Phone, light', x1, plate(phone(ctx, false), { cls: 'hk-plate--fill', style: 'padding:0' }))}${det(2, 'Phone, dark', x1, plate(phone(ctx, true), { dark: true, cls: 'hk-plate--fill', style: 'padding:0' }))}</div>`;
}

// ---------------------------------------------------------------- tokens and code

function tokens(ctx) {
  const L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), g = tokenGroups(ctx);
  const crows = Object.keys(L).filter((k) => HEXRE.test(String(L[k]))).map((k) => [sw(L[k]), mono('--' + k), mono(String(L[k]).toUpperCase()), mono(HEXRE.test(String(D[k])) ? String(D[k]).toUpperCase() : String(D[k]))]);
  const grp = (o) => sch(['Token', 'Value'], Object.entries(o).map(([k, v]) => [mono('--' + k), mono(v)]), 'hk-sr--f');
  const hd = (t) => `<h3 class="hk-lab" style="font-weight:500;color:var(--ink)">${t}</h3>`;
  return `${ttl('Tokens', 'The values behind every sheet, as the code package writes them.')}
${det(1, 'Colour', '', sch(['', 'Token', 'Light', 'Dark'], crows, 'hk-sr--4'))}
${det(2, 'Space, radius and width', '', `<div class="hk-2"><div class="hk-col">${hd('Space')}${grp(g.space)}</div><div class="hk-col">${hd('Radius')}${grp(g.radius)}${hd('Width')}${grp(g.width)}</div></div>`)}
${det(3, 'Type and shadow', '', `<div class="hk-2"><div class="hk-col">${hd('Font')}${grp(g.font)}${hd('Shadow')}${grp(g.shadow)}</div><div class="hk-col">${hd('Size, line and weight')}${grp(g.text)}</div></div>`)}`;
}

function code(ctx, K) {
  const ui = ctx.ui, S = sc(ctx), L = colourMap(ctx, 'light'), g = tokenGroups(ctx);
  const first = (o, n) => Object.entries(o).filter(([, v]) => HEXRE.test(String(v))).slice(0, n).map(([k, v]) => `  --${k}: ${String(v).toUpperCase()};`).join('\n');
  const files = [['tokens.css', 'Colour, space, radius, width, font, type and shadow as custom properties'], ['tokens.json', 'The same tokens as data'], ['tokens.ts', 'The same tokens for TypeScript'], ['tailwind.css', 'The tokens as a Tailwind theme'], ['components.css', 'Every component on this site, built on the tokens'], ['fonts.css', 'The brand’s font files'], ['example.html', 'A page that uses it all']];
  const block = (n, name, text) => `<div class="hk-col"><div class="hk-plate--row" style="gap:12px">${n ? '' : ''}<b class="hk-m" style="font-weight:400">${A(name)}</b><button type="button" class="hk-copy" data-copy>Copy<span data-copy-text hidden>${A(text)}</span></button></div><pre class="hk-code">${A(text)}</pre></div>`;
  const head = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">`;
  const btn = K.prettyHtml(ui.btn(S.form.book));
  const chip = K.prettyHtml(ui.statusChip(S.deliveries[0].status));
  const css = `:root {\n${first(L, 6)}\n}`;
  return `${ttl('Code', 'Link three files and the components work. Tokens are custom properties; dark is a data attribute.')}
${det(1, 'Files', '', sch(['File', 'What it holds'], files.map(([f, t]) => [mono(f), A(t)]), 'hk-sr--f'))}
${det(2, 'Link the files', '', block(1, 'head', head))}
${det(3, 'Use a component', '', `<div class="hk-2">${block(2, 'button', btn)}${block(3, 'status chip', chip)}</div>`)}
${det(4, 'Read a token', '', block(4, 'tokens.css', css))}`;
}

export const pages3 = { 'screen-light': screenPage(false), 'screen-dark': screenPage(true), 'screen-mobile': mobile, tokens, code };
