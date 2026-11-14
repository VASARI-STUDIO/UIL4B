// Lane hk, screens and code for theme 28 (Riso): dialog, table, empty, the three product screens, tokens, code. The screens are composed only
// from kit components, at the width the page gives them; every measurement of a component is read from componentsCss(ctx) as the package ships
// it, and every token name, value and code line from the engine's own exports. The words on the screens are the brand's own, printed whole.
import { A, val, sc, Word, word, rt, sheet, lab, note, b, pan, ruled, tok, chip, code } from './lane-hk-lib.js';
import { colourMap, tokenGroups, tokensCss, tailwindCss } from '../../engine/tokens.js';
import { componentsCss, iconSet } from '../../engine/components.js';

const uiT = (ctx, token) => ctx.uiType.find((t) => t.token === token) || ctx.uiType[ctx.uiType.length - 1];
const ex = (ctx) => ({ account: 'Account', crumbs: ['Home', 'Section'], tabs: ['One', 'Two', 'Three'], links: [['One', 'map-pin'], ['Two', 'plus'], ['Three', 'clock']], ...(sc(ctx).example || {}) });
const liveStatus = (ctx) => (ctx.status.find((s) => s.label === sc(ctx).status) || {}).id || sc(ctx).deliveries[0].status;
const title = (ctx) => ex(ctx).crumbs[ex(ctx).crumbs.length - 1] || ctx.brand.ui.screen.title;
const sec = (inner) => `<div class="hk-sec">${inner}</div>`;
const rl = (h) => `<span class="hk-r" style="display:block">${h}</span>`;

const cssCache = new WeakMap();
function shipped(ctx, sel, prop) {
  if (!cssCache.has(ctx)) cssCache.set(ctx, componentsCss(ctx));
  const css = cssCache.get(ctx), key = `\n${sel} {`, i = css.indexOf(key);
  if (i < 0) throw new Error(`riso hk: ${sel} is not in componentsCss`);
  const rule = css.slice(i + key.length, css.indexOf('}', i));
  const m = new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(rule);
  if (!m) throw new Error(`riso hk: ${sel} has no ${prop}`);
  return m[1].trim();
}
const shippedPx = (ctx, sel, prop) => parseFloat(shipped(ctx, sel, prop));
const tokPx = (ctx, g, k) => parseFloat(tokenGroups(ctx)[g][k]);
const kitClasses = (html) => new Set([...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter((c) => /^ui-[a-z]+$/.test(c) && !['ui-display', 'ui-num', 'ui-icon'].includes(c)));
const pressables = (html) => (html.match(/<(a|button)[\s>]/g) || []).length;

const wordmark = (ctx) => `<strong class="ui-display hk-wm">${A(ctx.brand.logo.showcase.wordmark)}</strong>`;
function topbar(ctx, active) {
  const X = ex(ctx), S = sc(ctx);
  return `<nav class="ui-topbar" aria-label="Main">${wordmark(ctx)}<div class="ui-topbar__links">${ctx.ui.links(X.links, active)}</div><span class="ui-avatar" aria-label="${A(X.account)}">${A(S.initials)}</span></nav>`;
}
function progress(ctx) {
  const S = sc(ctx), p = Math.max(0, Math.min(1, S.progress || 0)) * 100;
  return `<div class="hk-prog"><div class="ui-progress" role="img" aria-label="${A(S.from)} to ${A(S.to)}"><div class="ui-progress__bar"><i style="width:${p}%"></i></div><span class="ui-progress__dot" style="left:${p}%"></span></div><div class="hk-ends ui-num"><span>${A(S.from)}</span><span>${A(S.to)}</span></div></div>`;
}
function riderRow(ctx) {
  const S = sc(ctx);
  return `<div class="hk-rider ph-tight"><span class="ui-avatar">${A(S.initials)}</span><div class="hk-who"><p class="hk-ub">${A(S.rider)}</p><p class="hk-uq ui-num">${A(S.riderNote)}</p></div>${ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' })}</div>`;
}
function facts(ctx) {
  const S = sc(ctx);
  return `<dl class="hk-dl"><div><dt>${A(S.deliverToLabel)}</dt><dd>${A(S.deliverTo)}</dd></div><div><dt>${A(S.paidLabel)}</dt><dd class="ui-num">${A(S.paid)}</dd></div></dl>`;
}
const liveTop = (ctx) => `<div class="hk-live">${ctx.ui.statusChip(liveStatus(ctx))}<h2 class="ui-display hk-eta">${A(sc(ctx).eta)}</h2><p class="hk-soft">${A(sc(ctx).pickup)}</p>${progress(ctx)}${riderRow(ctx)}</div>`;

export const scr = {
  // Dialog: the shipped dialog on the shipped scrim, then each part of it read off: its measure, the token it takes.
  dialog(ctx, K) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), D = S.dialog, g = tokenGroups(ctx);
    const maxW = shippedPx(ctx, '.ui-dialog', 'max-width'), pad = shippedPx(ctx, '.ui-dialog', 'padding'), gap = shippedPx(ctx, '.ui-dialog', 'gap');
    const bw = tokPx(ctx, 'width', 'w-control'), tt = uiT(ctx, 'title-s'), bt = uiT(ctx, 'body');
    const dlg = ctx.ui.dialog({ ...D, danger: true }).replace(/dlg-t/g, 'hk-dlg-t');
    const shadow = g.shadow['shadow-float'];
    const T = ruled('120px minmax(0,1fr) 110px 90px', ['Part', 'Set in', 'Value', '<span class="hk-r" style="display:block">On the surface</span>'], [
      ['The box', 'max-width', `${maxW} px`, ''], ['Inside', 'padding', `${pad} px`, ''], ['Its edge', '--w-control, --text', `${bw} px`, rt(ctx, M.text, M.surface)],
      ['Its corners', '--r-card', g.radius['r-card'] === '0px' || g.radius['r-card'] === '0' ? 'square' : g.radius['r-card'], ''], ['Its lift', '--shadow-float', shadow === 'none' ? 'none' : 'shadow', ''],
      ['The question', `--fs-title-s, ${tt.size} / ${tt.line}`, `weight ${tt.weight}`, rt(ctx, M.text, M.surface)], ['What happens', `--fs-body, ${bt.size} / ${bt.line}`, '--text-soft', rt(ctx, M['text-soft'], M.surface)],
      ['Two answers', 'gap', `${gap} px`, ''],
    ].map((r) => [`<span class="hk-b">${A(r[0])}</span>`, tok(r[1]), tok(r[2]), r[3] ? rl(tok(r[3])) : '']));
    const body = sec(`${lab('At true size, on its scrim')}${pan(`<div class="ui-scrim hk-scrim" style="padding:48px 24px;display:flex;justify-content:center">${dlg}</div>`, { mode: 'light', style: 'padding:0' })}`)
      + sec(`${lab('Each part and what it takes')}${T}${note(`Markup carries ${val('role="dialog"')}, ${val('aria-modal')} and ${val('aria-labelledby')}. A native ${val('dialog')} element takes the same ${val('--scrim')} for its backdrop.`)}`);
    return sheet(ctx, K, { label: 'Dialog', hit: 4, hitLeft: false, plate: `${b(`${Word(4)} parts`)}<br>a question, what happens next, and two buttons. Nothing else.`, body });
  },

  // Table: the shipped table with its three row states forced, then what each one does.
  table(ctx, K) {
    const M = colourMap(ctx, 'light'), S = sc(ctx), ui = ctx.ui, rowsN = S.deliveries.length;
    const thH = shippedPx(ctx, '.ui-table th', 'height'), tdH = shippedPx(ctx, '.ui-table td', 'height'), bw = tokPx(ctx, 'width', 'w-control');
    const bar = /inset (\d+(?:\.\d+)?)px 0 0/.exec(shipped(ctx, '.ui-table tbody tr[aria-selected="true"]', 'box-shadow'))[1];
    const heads = [S.deliverToLabel, 'When', 'Status', S.paidLabel];
    const sortBtn = (t, up) => `<button type="button">${A(t)}${up ? ui.icon('arrow-up', 14) : ''}</button>`;
    const bodyRows = S.deliveries.map((d, i) => `<tr${i === 0 ? ' aria-selected="true"' : ''}${i === 2 ? ' class="is-hover"' : ''}><td data-l="${A(heads[0])}">${A(d.to)}</td><td data-l="${A(heads[1])}" class="ui-num" style="white-space:nowrap">${A(d.when)}</td><td data-l="${A(heads[2])}">${ui.statusChip(d.status)}</td><td data-l="${A(heads[3])}" class="is-num">${A(d.price)}</td></tr>`).join('');
    const tbl = `<table class="ui-table"><thead><tr><th scope="col" aria-sort="ascending">${sortBtn(heads[0], true)}</th><th scope="col">${A(heads[1])}</th><th scope="col">${A(heads[2])}</th><th scope="col" class="is-num">${sortBtn(heads[3])}</th></tr></thead><tbody>${bodyRows}</tbody></table>`;
    const T = ruled('130px minmax(0,1fr) 110px', ['State', 'What the table does', '<span class="hk-r" style="display:block">Set in</span>'], [
      ['Sorted', 'The header is a button. Its arrow shows the way the rows run.', 'aria-sort'],
      ['Selected', `A ${bar} px bar in the action colour, on the raised ground.`, '--raised'],
      ['Under a pointer', 'The raised ground, and only where a pointer exists.', '--raised'],
      ['Figures', 'Set right, in tabular figures, so a column adds up by eye.', 'is-num'],
      ['Rows', `${tdH} px tall, with a hairline between them.`, '--divider'],
      ['The header', `${thH} px tall, ruled with ${bw} px in the text colour.`, '--w-control'],
    ].map(([a, c, d]) => [`<span class="hk-b">${A(a)}</span>`, A(c).replace(/(\d+(?:\.\d+)? px)/g, '<span class="hk-v">$1</span>'), rl(tok(d))]));
    const body = sec(`${lab('On the light surface')}${pan(`<div class="hk-tblz">${tbl}</div>`, { mode: 'light', style: 'padding:0 0 8px' })}`)
      + sec(`${lab('What each state does')}${T}${note(`Status is a word in a chip, never a colour alone. The first row is selected and the third is held in its hover state with ${val('is-hover')}.`)}`);
    return sheet(ctx, K, { label: 'Table', hit: rowsN, hitLeft: true, plate: `${b(`${Word(rowsN)} rows`)}<br>from the product's own list, each with its status in words.`, body });
  },

  // Empty states: what the product says when a list has nothing in it, and the same list while it waits for its rows.
  empty(ctx, K) {
    const S = sc(ctx), E = S.empty, ui = ctx.ui, hd = uiT(ctx, 'headline');
    const empty = `<div class="ui-empty"><h3 class="ui-empty__title">${A(E.title)}</h3><p class="ui-empty__text">${A(E.body)}</p>${ui.btn(E.cta)}</div>`;
    const sk = (a, c) => `<li><div class="ui-row"><span class="ui-row__lead"></span><div class="hk-skr">${ui.skeleton(a)}${ui.skeleton(c)}</div></div></li>`;
    const loading = `<ul class="ui-list" aria-busy="true">${sk('62%', '38%')}${sk('48%', '30%')}${sk('56%', '42%')}</ul>`;
    const body = sec(`${lab('Empty')}${pan(`<div class="hk-pad">${empty}</div>`, { mode: 'light', style: 'padding:0' })}`)
      + `<div class="hk-two"><div class="hk-sec">${lab('Loading')}${pan(`<div style="padding:8px 24px">${loading}</div>`, { mode: 'light', style: 'padding:0' })}</div>
<div class="hk-sec" style="justify-content:flex-end;gap:16px">${note(`The title is ${val('--fs-headline')}, ${val(hd.size + ' / ' + hd.line)}. It sits on ${val('--raised')} with no edge, so it never reads as a card.`)}${note(`A loading list draws the rows it is waiting for, in ${val('--sunken')}, and never a spinner on its own.`)}</div></div>`;
    return sheet(ctx, K, { label: 'Empty states', hit: 2, hitLeft: false, plate: `${b(`${Word(2)} states`)}<br>what is missing, and the same list while its rows are on the way.`, body });
  },

  // Product screen, light: the product's list screen in one column.
  'screen-light'(ctx, K) {
    const S = sc(ctx), F = S.form, X = ex(ctx), ui = ctx.ui;
    const form = `<div class="hk-form">${ui.field({ id: 'hk-f1', label: F.dropoff, value: F.dropoffValue })}${ui.btn(F.book, { block: true })}</div>`;
    const scrn = `<div class="hk-scr">${topbar(ctx, 0)}<div class="hk-main"><div>${ui.crumbs(X.crumbs)}<h2 class="ui-display hk-h" style="margin-top:8px">${A(title(ctx))}</h2></div>${ui.tabs(X.tabs, 0)}${ui.deliveryRows(3)}${ui.card({ title: F.title, raised: true, action: form })}</div></div>`;
    const n = kitClasses(scrn).size;
    const body = sec(`${lab(`${A(ctx.brand.ui.screen.title)}, in daylight`)}${pan(scrn, { mode: 'light', style: 'padding:0;max-width:720px' })}`);
    return sheet(ctx, K, { label: 'Product screen, light', hit: n, hitLeft: true, plate: `${b(`${Word(n)} kit classes`)}<br>and nothing drawn for the page: the screen is built from the components.`, body });
  },

  // Product screen, dark: the live screen at night, the same markup under data-theme="dark".
  'screen-dark'(ctx, K) {
    const S = sc(ctx), ui = ctx.ui, L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark');
    const changed = Object.keys(L).filter((k) => L[k] !== D[k]).length;
    const scrn = `<div class="hk-scr">${topbar(ctx, 0)}<div class="hk-main" style="gap:28px">${liveTop(ctx)}<div class="hk-two" style="gap:24px"><div class="hk-col">${ui.alert('warning', S.alert)}</div><div class="hk-col">${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div></div></div></div>`;
    const body = sec(`${lab('The live screen, after dark')}${pan(scrn, { mode: 'dark', style: 'padding:0 0 24px;max-width:720px' })}`)
      + `<div class="hk-two"><p class="hk-note">The live line is ${val('--fs-headline')}, the largest type in the kit. The status word above it says where things stand, in words.</p><p class="hk-note">The same markup under ${val('data-theme="dark"')}. Only the token values change.</p></div>`;
    return sheet(ctx, K, { label: 'Product screen, dark', hit: changed, hitLeft: false, plate: `${b(`${Word(changed)} roles change`)}<br>between light and dark. No component changes with them.`, body });
  },

  // Product screen, mobile: the phone at true width, with the parts of the screen named beside it.
  'screen-mobile'(ctx, K) {
    const S = sc(ctx), X = ex(ctx), ui = ctx.ui;
    const tabs = [...X.links.slice(0, 3), [X.account, 'user']].filter(([t], k, a) => a.findIndex(([u]) => u === t) === k);
    const phHtml = `<div class="hk-sb">${A(S.time)}</div><div class="hk-pbar">${wordmark(ctx)}<span class="ui-avatar">${A(S.initials)}</span></div>
<div class="hk-pbody">${liveTop(ctx)}<div class="hk-pin">${facts(ctx)}${ui.btn(S.share, { variant: 'secondary', block: true })}</div></div>
<nav class="ui-tabbar" aria-label="Destinations">${tabs.map(([t, i], k) => `<a href="#"${k === 0 ? ' aria-current="page"' : ''}>${ui.icon(i, 20)}${A(t)}</a>`).join('')}</nav>`;
    const n = pressables(phHtml), btnH = shippedPx(ctx, '.ui-btn', 'height');
    const phone = pan(phHtml, { mode: 'dark', cls: 'hk-phone' });
    const side = ruledSide(ctx, btnH, tabs.length);
    const body = `<div class="hk-two" style="align-items:start"><div class="hk-sec">${lab('At 390 px wide, after dark')}${phone}</div><div class="hk-sec">${lab('Parts of the screen')}${side}</div></div>`;
    return sheet(ctx, K, { label: 'Product screen, mobile', hit: n, hitLeft: false, plate: `${b(`${Word(n)} things to press`)}<br>in one column, from the top bar down to the tab bar.`, body });
  },

  // Tokens: every role, space, radius and line the code package writes on :root, with the dark value of each colour beside its light one.
  tokens(ctx, K) {
    const g = tokenGroups(ctx), L = colourMap(ctx, 'light'), D = colourMap(ctx, 'dark'), keys = Object.keys(L);
    const nTok = keys.length + ctx.colours.length + ['space', 'radius', 'width', 'font', 'text', 'shadow'].reduce((a, k) => a + Object.keys(g[k]).length, 0);
    const colRows = keys.map((k) => [`${chip(L[k])}${chip(D[k])}${tok('--' + k)}`, tok(L[k]), tok(D[k])]);
    const kv = (o, f = (v) => v) => Object.entries(o).map(([k, v]) => [tok('--' + k), rl(tok(f(v)))]);
    const grp = (name, rows) => `<div class="hk-sec" style="gap:8px">${lab(name)}${ruled('minmax(0,1fr) auto', null, rows)}</div>`;
    const ln = [...kv(g.width), ...kv(g.shadow, (v) => (v === 'none' ? 'none' : 'set'))];
    const body = sec(`${lab('Colour, light then dark')}${ruled('minmax(0,1.6fr) 100px 100px', ['Token', 'Light', 'Dark'], colRows)}`)
      + `<div class="hk-two">${grp('Space', kv(g.space))}${grp('Radius', kv(g.radius))}${grp('Lines', ln)}${grp('Type, size / line', ctx.uiType.map((t) => [tok(t.token), rl(tok(`${t.size} / ${t.line}`))]))}
${grp('Fonts', Object.entries(g.font).map(([k, v]) => [tok('--' + k), rl(A(v.split(',')[0].replace(/['"]/g, '')))]))}${grp('Palette', ctx.colours.map((c) => [`${chip(c.hex)}${tok('--palette-' + c.id)}`, rl(tok(c.hex))]))}</div>`;
    return sheet(ctx, K, { label: 'Token reference', hit: nTok, hitLeft: false, plate: `${b(`${Word(nTok)} tokens`)}<br>written in tokens.css, read from the package. Each colour is shown in light, then dark.`, body });
  },

  // Code: how to use the package, and the shipped tokens.css and tailwind.css as they are written.
  code(ctx, K) {
    const F = sc(ctx).form;
    const install = `<link rel="stylesheet" href="fonts.css">\n<link rel="stylesheet" href="tokens.css">\n<link rel="stylesheet" href="components.css">\n\n<body class="ui">\n  <button class="ui-btn" type="button">\n    ${F.book}\n  </button>\n</body>`;
    const want = ['surface', 'text', 'action', 'action-label'], blocks = tokensCss(ctx).split('\n');
    const block = (open) => {
      const i = blocks.indexOf(open), out = [open];
      for (let j = i + 1; j < blocks.length && blocks[j] !== '}'; j++) if (want.some((w) => blocks[j].startsWith(`  --${w}:`))) out.push(blocks[j]);
      if (i < 0 || out.length !== want.length + 1) throw new Error(`riso hk: tokens.css has no ${open} block with ${want.join(', ')}`);
      return [...out, '}'].join('\n');
    };
    const cssCut = `${block(':root {')}\n${block('[data-theme="dark"] {')}`;
    const tw = tailwindCss(ctx).split('\n'), ti = tw.indexOf('@theme inline {');
    if (ti < 0) throw new Error('riso hk: tailwind.css has no @theme inline block');
    const twCut = [tw[ti], ...tw.slice(ti + 1).filter((l) => ['surface', 'text', 'action'].some((w) => l.startsWith(`  --color-${w}:`))), '}'].join('\n');
    const fams = [...new Set(ctx.faces.map((f) => f.family))];
    const files = [
      ['README.md', 'How to install and use the kit.'], ['tokens.css', 'Custom properties, light and dark.'], ['tokens.json', 'The same tokens in the W3C format.'],
      ['tokens.ts', 'A typed export of the same values.'], ['tailwind.css', 'A Tailwind CSS v4 theme block.'], ['components.css', 'Every component, built on the tokens.'],
      ['example.html', 'Every component live, light and dark.'], ['fonts.css', `Font rules for ${word(fams.length)} ${fams.length === 1 ? 'family' : 'families'}.`],
    ];
    const T = ruled('160px minmax(0,1fr)', ['In the package', 'What it is'], [...files.map(([a, c]) => [tok(a), A(c)]), [tok('assets/'), A(`The logo, ${iconSet(ctx).length} icons and the fonts.`)]]);
    const body = sec(`${lab('Install')}${code(install, 'the install snippet')}`)
      + sec(`${lab('Dark mode')}${code('<html data-theme="dark">', 'the dark mode attribute')}`)
      + `<div class="hk-two"><div class="hk-sec">${lab('From tokens.css')}${code(cssCut, 'tokens.css')}</div><div class="hk-sec">${lab('From tailwind.css')}${code(twCut, 'tailwind.css')}</div></div>`
      + sec(`${lab('What is in the package')}${T}`);
    return sheet(ctx, K, { label: 'The code package', hit: files.length, hitLeft: true, plate: `${b(`${Word(files.length)} files`)}<br>and an assets folder: the tokens, the components and an example page.`, body });
  },
};

// the parts of the phone screen, named beside it
function ruledSide(ctx, btnH, nTabs) {
  const hd = uiT(ctx, 'headline');
  return ruled('110px minmax(0,1fr)', null, [
    ['The bar', `The brand's name and the account, ${val('56 px')} deep.`],
    ['The live line', `A status word, then the line in ${val('--fs-headline')}, ${val(hd.size + ' / ' + hd.line)}: the largest type in the kit.`],
    ['One action', `${val(btnH + ' px')} tall, full width.`],
    ['The tab bar', `${Word(nTabs)} places, ${val('64 px')} deep, the current one marked.`],
  ].map((r) => [`<span class="hk-b">${A(r[0])}</span>`, r[1]]));
}
