// Guidelines pages for theme 06, Studio. Base pages: cover, contents, logo-versions, contrast, business-card.
// The other pages live in guidelines-a.js and guidelines-b.js and are merged below. Helpers are in helpers.js, styles in index.js (classes g-).
// Studio's way: Steel panels hold the brand's real UI, measures are drawn (dimension marks), parts are pinned with numbered callouts.
// The annotation devices (pin, disc, dim, dimf, keyList) are run A's, from guidelines-a.js.
import { A, ratioText, nameOf, fit, std } from './helpers.js';
import { guidelinesA, pin, disc, dim, dimf, keyList } from './guidelines-a.js';
import { guidelinesB } from './guidelines-b.js';

const lc = (s) => s.toLowerCase();
const r1 = (n) => n.toFixed(1);
const isGround = (ctx, hex) => lc(hex) === lc(ctx.roles.light.surface);
const content = (ctx) => ctx.brand.ui.screen.content;
const delivery = (ctx, status) => content(ctx).deliveries.find((d) => d.status === status) || content(ctx).deliveries[0];
// a width mark under the thing it measures (end ticks, label under the line)
const below = (left, top, w, text) => dim('h', '', `left:${r1(left)}px;top:${r1(top)}px;width:${r1(w)}px`, '').replace('</i>', `<b style="top:8px">${text}</b></i>`);
const ICON = (d) => `<svg class="g-ic" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${d}" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
const FOLDER = ICON('M1.75 3.75h4.25l1.5 1.75h6.75v7.25h-12.5z');
const FILE = ICON('M3.5 1.75h5.5l3.5 3.5v9h-9zM9 1.75v3.5h3.5');
const CARET = `<svg class="g-caret" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="square"/></svg>`;

const own = {
  cover(ctx) {
    const B = ctx.brand, L = ctx.logo, W = 520, u = (L.geo.unit * W) / L.geo.width;   // logo width and one clear-space unit, in px
    const lh = (W * L.geo.height) / L.geo.width, zw = W + 2 * u, zh = lh + 2 * u;
    const logo = L.html('colour', { width: W, label: 'Your logo goes here' });
    // the logo in its clear zone, drawn: four x units, x marked on every side, two pins keyed to the list under it
    const unit = (st) => `<span class="a-unit" style="${st};width:${r1(u)}px;height:${r1(u)}px"></span>`;
    const marks = `${dim('h', '', `left:0;top:${r1(zh / 2)}px;width:${r1(u)}px`, 'x')}${dim('h', '', `left:${r1(zw - u)}px;top:${r1(zh / 2)}px;width:${r1(u)}px`, 'x')}${dim('v', '', `left:${r1(zw / 2)}px;top:0;height:${r1(u)}px`, 'x')}${dim('v', '', `left:${r1(zw / 2)}px;top:${r1(zh - u)}px;height:${r1(u)}px`, 'x')}`;
    const zone = `<div class="a-zone" style="width:${r1(zw)}px;height:${r1(zh)}px">${unit('left:0;top:0')}${unit('right:0;top:0')}${unit('left:0;bottom:0')}${unit('right:0;bottom:0')}${marks}<div class="a-zin" style="left:${r1(u)}px;top:${r1(u)}px;width:${W}px;height:${r1(lh)}px">${logo}</div>${pin(1, 44, 't', `--x:18%;--oy:${r1(-u / 2)}px`)}${pin(2, r1(u + 44), 'b', `--x:70%;--oy:${r1(-u)}px`)}</div>`;
    const small = fit(ctx, 'colour', 120, 60);
    const smallLogo = `<figure class="g-cvs"><div class="a-panel g-cvsp"><div class="a-card g-cvc"><div style="width:${small}px">${L.html('colour', { width: small, label: 'Logo' })}${dimf(`${small} px`)}</div></div></div><figcaption class="cap">Shown at ${small} px wide</figcaption></figure>`;
    const key = keyList([[1, 'x', 'Clear space is a quarter of the type size, marked x.'], [2, 'Logo', `${(L.geo.width / 100 * 18).toFixed(0)} px wide at the 18 px type size.`]]);
    return `<section class="pg pg--cover" data-page="cover">
<header class="hd"><span class="hd__t">${A(B.name)} brand guidelines</span><span>${A(ctx.versionLine)}</span></header>
<div class="g-cvbody"><div class="a-panel g-cvz">${zone}</div>${key}</div>
<div class="g-cvfoot">${smallLogo}</div>
<footer class="fo"><span>The line, the voice, colour and type<br>for ${A(B.name)}: ${A(B.product.charAt(0).toLowerCase() + B.product.slice(1, -1))}.</span><span class="r">${A(B.lines.primary)}<br>${A(ctx.date)}</span></footer>
</section>`;
  },

  // contents as a project file tree: the document a folder, each section a folder, each page a file with its folio
  contents(ctx) {
    const B = ctx.brand, secs = ctx.sections, pg = (id) => ctx.pages.find((p) => p.id === id);
    const file = (p) => `<li class="g-row g-row--f">${FILE}<span class="g-fn">${A(p.title)}</span><span class="g-fo num">${p.no}</span></li>`;
    const folder = (s) => `<li class="g-d"><div class="g-row g-row--d">${CARET}${FOLDER}<span class="g-sn num">${s.n}</span><b>${A(s.title)}</b><span class="g-fo num">${s.pages[0].no}</span></div><ul class="g-fl">${s.pages.map(file).join('')}</ul></li>`;
    const rows = (s) => 1 + s.pages.length;
    // two panes, split where the row counts come closest (the root, cover and contents sit in the first)
    let at = 1, gap = Infinity;
    for (let k = 1; k < secs.length; k++) {
      const d = Math.abs(3 + secs.slice(0, k).reduce((t, s) => t + rows(s), 0) - secs.slice(k).reduce((t, s) => t + rows(s), 0));
      if (d < gap) { gap = d; at = k; }
    }
    const head = `<div class="g-row g-row--r">${CARET}${FOLDER}<b>${A(B.name)} brand guidelines</b></div>`;
    const top = ['cover', 'contents'].map((id) => file(pg(id))).join('');
    const paneA = `<div class="a-card g-pane">${head}<ul class="g-tl">${top}${secs.slice(0, at).map(folder).join('')}</ul></div>`;
    const paneB = `<div class="a-card g-pane"><ul class="g-tl">${secs.slice(at).map(folder).join('')}</ul></div>`;
    return std(ctx, 'contents', `<div class="a-panel g-tree">${paneA}${paneB}</div>`, { title: 'Contents' });
  },

  // each version in a real place it is used, in a Steel panel, its drawn width marked under it
  'logo-versions'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways, c = content(ctx), P = delivery(ctx, 'paid'), S = delivery(ctx, 'sent');
    const lab = (id, w) => (w >= 100 ? L.labels[id] : '');
    const mark = (id, w, o = {}) => L.html(id, { width: w, color: cw[L.colourwayOf(id)].name, label: lab(id, w), ...o });
    const hOf = (id, w) => (w * L.geos[id].h) / L.geos[id].w;
    const H = 104;   // card height in the 3-up rows
    const panel = (card, marks, cls = '') => `<div class="a-panel g-vp ${cls}"><div class="a-cw g-vcw">${card}${marks}</div></div>`;
    const fig = (id, body) => `<figure class="g-vf">${body}<figcaption class="cap" style="margin-top:10px"><b>${A(L.labels[id])}</b>${A(B.logo.when[id])}</figcaption></figure>`;
    // 1 full colour: the head of a quote, on White
    const hw = 200, hh = hOf('colour', hw), qH = 96;
    const colour = fig('colour', panel(`<div class="a-card a-ui g-qd" style="height:${qH}px">${mark('colour', hw)}<div class="g-qr"><span>${A(S.to)}</span><i>${A(S.when)}</i></div><div class="g-qt"><span>${A(c.paidLabel)}</span><b class="num">${A(c.paid)}</b></div></div>`,
      `${below(24, qH + 14, hw, `${hw} px`)}${dim('v', '', `left:${r1(24 + hw + 14)}px;top:${r1((qH - hh) / 2)}px;height:${r1(hh)}px`, `${Math.round(hh)} px`)}`, 'g-vp--w'));
    // 2 mono dark: an invoice printed in black
    const pad = 14;
    const dw = 104;
    const dark = fig('mono-dark', panel(`<div class="a-card a-ui g-pp" style="height:${H}px">${mark('mono-dark', dw)}<div class="g-pr"><span>${A(P.to)}</span><b class="num">${A(P.price)}</b></div></div>`, below(16, H + 12, dw, `${dw} px`)));
    // 3 mono light: on a quiet dark part of a photo
    const lw = 120;
    const light = fig('mono-light', panel(`<div class="a-gt a-gt--photo g-ph" style="height:${H}px">${ctx.photo('ute', { cls: 'a-fillimg', pos: '50% 50%' })}<span class="a-onphoto" style="left:16px;top:16px">${mark('mono-light', lw, { colourway: 'mono-light' })}</span></div>`, below(16, H + 12, lw, `${lw} px`)));
    // 4 reversed: the app on Ink
    const rw = 104;
    const rev = fig('reversed', panel(`<div class="g-dk" style="height:${H}px">${mark('reversed', rw)}<div class="g-pr"><span>${A(S.to)}</span><b class="num">${A(S.price)}</b></div></div>`, below(16, H + 12, rw, `${rw} px`)));
    // 5 symbol: the app icon and the favicon
    const tile = 64, sw = fit(ctx, 'symbol', 36, 36), on = cw['on-steel'] || cw.colour;
    const tabX = pad + tile + 14;   // card-relative start of the tab (the card has 16px padding inside the panel)
    const sym = fig('symbol', panel(`<div class="a-card a-ui g-ic2" style="height:${H}px"><div class="a-tile g-tile" style="width:${tile}px;height:${tile}px;background:${on.ground}">${L.html('symbol', { width: sw, colourway: 'on-steel', color: on.name, label: '' })}</div><div class="a-tab g-tab">${L.html('symbol', { width: 16, colourway: 'on-steel', color: on.name, label: '' })}<span>${A(B.name)}</span></div></div>`,
      `${below(16 + (tile - sw) / 2, H + 12, sw, `${sw} px`)}${below(16 + tile + 14 + 14, H + 12, 16, '16 px')}`));
    // 6 stacked: a profile image
    const stw = fit(ctx, 'stacked', 44, 44);
    const stk = fig('stacked', panel(`<div class="a-card a-ui g-av" style="height:${H}px"><div class="g-circ">${mark('stacked', stw, { label: '' })}</div></div>`, below((164 - 2 * pad - stw) / 2, H + 12, stw, `${stw} px`)));
    // 7 horizontal: an email signature
    const hz = fit(ctx, 'horizontal', 120, 30), cd = B.applications.card;
    const hor = fig('horizontal', panel(`<div class="a-card a-ui g-sig" style="height:${H}px">${mark('horizontal', hz, { label: '' })}<div class="g-sg2"><b>${A(cd.person)}</b><span>${A(cd.role)}</span><span>${A(cd.contact)}</span></div></div>`, below(16, H + 12, hz, `${hz} px`)));
    const inner = `${colour}<div class="g-v3"><div class="g-vr g-vr--a">${dark}${light}${rev}</div><div class="g-vr g-vr--b">${sym}${stk}${hor}</div></div>`;
    return std(ctx, 'logo-versions', inner, { lead: 'Seven versions, no more. Start with full colour, and reach for another only when the ground or the space asks for it.' });
  },

  // the real UI with every text pair pinned where it is used, then the pairs as an inspector table
  contrast(ctx) {
    const B = ctx.brand, c = content(ctx), f = c.form, ok = ctx.pairs;
    const find = (fg, bg) => ok.find((p) => p.fg === fg && p.bg === bg);
    const crumb = c.example.crumbs?.[0] || 'Invoices';
    const btnW = 160;
    // the parts of the screen, top to bottom: [text colour, ground, row kind, the part]. Steel rows sit on the app ground, card rows in the White card, full rows span the screen.
    const parts = [
      ['ink', 'steel', 's', `<span class="g-t g-h disp">${A(crumb)}</span>`],
      ['soft', 'steel', 's', `<span class="g-t g-p">${A(f.notesHelp)}</span>`],
      ['quiet', 'steel', 's', `<span class="g-t g-c">${A(f.bookWhy)}</span>`],
      ['ink', 'white', 'c', `<span class="g-t g-n">${A(f.pickupValue)}</span>`],
      ['soft', 'white', 'c', `<span class="g-t g-p">${A(c.pickup)}</span>`],
      ['quiet', 'white', 'c', `<span class="g-t g-c g-c--w">${A(c.eta)}</span>`],
      ['toolbox', 'white', 'c', `<span class="g-t g-a">${A(c.share)}</span>`],
      ['white', 'toolbox', 'c', `<span class="a-btn g-btn" style="width:${btnW}px">${A(f.book)}</span>`],
      ['white', 'ink', 'f', `<div class="a-toast g-fx"><span>${A(c.toast)}</span><u>Undo</u></div>`],
      ['toolbox', 'ink', 'f', `<div class="g-tot g-fx"><span>${A(c.paidLabel)}</span><span class="g-t g-big disp num">${A(c.paid)}</span></div>`],
    ];
    const placed = parts.map(([fg, bg, kind, html]) => ({ p: find(fg, bg), kind, html })).filter((x) => x.p);
    const ordered = [...placed.map((x) => x.p), ...ok.filter((p) => !placed.some((x) => x.p === p))];
    const ln = (x, i) => `<div class="g-ln g-ln--${x.kind}">${x.html}<i class="g-lead"></i><span class="g-co">${disc(i + 1)}<b class="g-rt num">${ratioText(x.p.ratioText)}</b></span></div>`;
    const rows = placed.map(ln);
    const steel = rows.slice(0, placed.filter((x) => x.kind === 's').length).join('');
    const ns = placed.filter((x) => x.kind === 's').length, nc = placed.filter((x) => x.kind === 'c').length;
    const card = rows.slice(ns, ns + nc).join(''), dk = rows.slice(ns + nc).join('');
    const screen = `<div class="g-screen"><div class="g-sg">${steel}</div><div class="a-card g-cd">${card}</div><div class="g-dg">${dk}</div></div>`;
    const sp = (hexBg, hexFg) => `<i class="g-sp ${isGround(ctx, hexBg) ? 'g-sp--h' : ''}" style="background:${hexBg}"><b style="background:${hexFg}"></b></i>`;
    const tr = (p, i) => `<div class="g-tr">${disc(i + 1)}${sp(p.bgHex, p.fgHex)}<span class="g-tx"><b>${A(p.use)}</b><i>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</i></span><span class="g-rr num">${ratioText(p.ratioText)}</span></div>`;
    const table = `<div class="g-tbl" style="grid-template-rows:repeat(${Math.ceil(ordered.length / 2)},auto)">${ordered.map(tr).join("")}</div>`;
    const nu = ctx.unusedPairs.map((p) => `<div class="g-nu">${sp(p.bgHex, p.fgHex)}<span class="cap"><b>${A(nameOf(ctx, p.fg))} on ${A(nameOf(ctx, p.bg))}</b>${ratioText(p.ratioText)}, not used</span></div>`).join('');
    const inner = `<div class="a-panel g-cp">${screen}</div>${table}<div><h2 class="h3" style="margin-bottom:10px">Not used for text</h2><div class="g-nus">${nu}</div></div>`;
    return std(ctx, 'contrast', inner, { cls: 'g-contrast', lead: `Every text pair ${B.name} uses, with its contrast ratio. Text needs 4.5 : 1, and type 24 px and over needs 3 : 1. A pair below its mark is not used for text.` });
  },

  // front and back at 4.5 px to the mm on Steel: 90 and 55 mm drawn, each part pinned
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed;
    const fw = fit(ctx, 'reversed', 330, 140), fh = (fw * L.geos.reversed.h) / L.geos.reversed.w;
    const sw = fit(ctx, 'symbol', 52, 52), sh = (sw * L.geos.symbol.h) / L.geos.symbol.w;
    const front = `<div class="card card--front"><div class="mk g-hl">${L.html('reversed', { width: fw, color: rev.name, label: 'Your logo goes here' })}</div><span class="ln g-hl">${A(B.lines.primary)}</span></div>`;
    const back = `<div class="card card--back"><div class="mk g-hl">${L.html('symbol', { width: sw, label: 'Logo' })}</div><div class="who g-hl"><p class="nm">${A(c.person)}</p><p class="rl">${A(c.role)}</p><p class="ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    // pins sit on the card's right edge at the height of the part they name (a dashed lead runs from the part to the edge)
    const pt = (n, y, label) => `<span class="g-pt" style="position:absolute;left:100%;top:${y}px;width:0;height:0">${pin(n, 28, 'r', '', label)}</span>`;
    const sizes = () => `${dim('h', '', 'left:0;top:-22px;width:405px', '90 mm')}${dim('v', 'g-dl', 'left:-24px;top:0;height:248px', '55 mm')}`;
    const fig = (card, pins, cap) => `<figure class="g-bcf"><div class="g-bcw">${card}${pins}${sizes()}</div><figcaption class="cap">${cap}</figcaption></figure>`;
    const inner = `<div class="a-panel g-bc">${fig(front, `${pt(1, 124, 'Reversed logo')}${pt(2, 213, 'The line')}`, `<b>Front</b>${A(L.labels.reversed)} logo and the line`)}${fig(back, `${pt(3, 28 + sh / 2, 'Symbol')}${pt(4, 170, 'Name and contact')}`, '<b>Back</b>Name, role and contact. Printed 90 × 55 mm, shown at 4.5 px to the millimetre')}</div>`;
    return std(ctx, 'business-card', inner, { lead: 'Front and back at actual proportion, on the Steel the app sits on.' });
  },
};

export const guidelines = { ...guidelinesA, ...guidelinesB, ...own };
