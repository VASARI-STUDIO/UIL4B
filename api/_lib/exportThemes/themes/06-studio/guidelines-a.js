// Guidelines pages for theme 06, Studio, run A: intro, personality, voice, write-this, messaging, logo, clear-space, min-size,
// logo-grounds, logo-misuse, palette, proportion, colour-values. Styles are in css-a.js (classes start a-). See guidelines.js for the split.
// Studio's way: the brand's real UI (White cards, chips, buttons) sits on Steel panels, lists are hairline-ruled, measures are drawn.
import { A, fit, std } from './helpers.js';
import { colourMap, statusText } from '../../engine/tokens.js';

const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const words = (n) => NUM[n] || String(n);
const sentences = (s) => s.split(/(?<=\.)\s+/);
const lc = (s) => s.toLowerCase();
const hexName = (ctx, hex) => ctx.colours.find((c) => lc(c.hex) === lc(hex))?.name || hex;
const byRole = (ctx, role, n = 0) => ctx.colours.find((c) => c.role === role) || ctx.colours[n];
const isGround = (ctx, hex) => lc(hex) === lc(ctx.roles.light.surface);
const list = (a) => (a.length > 1 ? `${a.slice(0, -1).join(', ')} and ${a.at(-1)}` : a[0] || '');
const wordCount = (s) => s.trim().split(/\s+/).length;

const CROSS = `<svg class="a-cross" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Not allowed"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M8 8l8 8M16 8l-8 8" stroke="var(--ground)" stroke-width="2" stroke-linecap="square" fill="none"/></svg>`;
const TICK = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="square"/></svg>`;
const NOPE = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="var(--quiet)" stroke-width="2" stroke-linecap="square"/></svg>`;

// the brand's real UI, built from ui.screen.content and ui.status
const content = (ctx) => ctx.brand.ui.screen.content;
const statusOf = (ctx, id) => ctx.brand.ui.status.find((s) => s.id === id);
const chip = (ctx, id, short) => { const s = ctx.status.find((x) => x.id === id) || ctx.status[0]; return `<span class="a-chip2" style="color:${statusText(ctx, 'light', s).hex}">${A(short ? s.label.split(' ')[0] : s.label)}</span>`; };
const delivery = (ctx, status) => content(ctx).deliveries.find((d) => d.status === status);
const listRow = (ctx, d) => `<div class="a-r"><div><b>${A(d.to)}</b><i>${A(d.when)}</i></div>${chip(ctx, d.status)}<span class="a-amt num">${A(d.price)}</span></div>`;
const toast = (text) => { const m = text.match(/^(.*?)\s+(\S+)$/); return `<div class="a-toast"><span>${A(m ? m[1] : text)}</span>${m ? `<u>${A(m[2])}</u>` : ''}</div>`; };

// the clear-space and minimum-size drawings: a dimension line with end ticks and a label
const dim = (dir, cls, st, label) => `<i class="a-dim a-dim--${dir} ${cls}" style="${st}">${label ? `<b>${label}</b>` : ''}</i>`;

// annotation devices. A pin is a leader line from a point on the UI to a numbered disc (dir r, l, t or b). It sits inside the element it
// points at (that element gets position:relative from the :has rule in css-a.js), or at explicit left/top inside a relative box.
// `lab` is an optional callout label set beside the disc.
const pin = (n, len, dir = 'r', st = '', lab = '') => `<i class="a-pin a-pin--${dir}" style="--len:${len}px;${st}"><u class="a-pd">${n}</u>${lab ? `<s class="a-pl">${lab}</s>` : ''}</i>`;
const disc = (n) => `<u class="a-pd a-pd--in">${n}</u>`;
// a ruled key: number, title, text
const keyList = (rows) => `<ol class="a-key">${rows.map(([n, t, p]) => `<li>${disc(n)}<h3 class="h3">${t}</h3><p>${p}</p></li>`).join('')}</ol>`;
// a flow dimension line: end ticks and a label in the middle
const dimf = (label) => `<div class="a-dimf"><i></i><b>${label}</b><i></i></div>`;
// the token a colour is stored under, found by value in the light colour map
const tokenOf = (ctx, hex) => { const e = Object.entries(colourMap(ctx, 'light')).find(([, v]) => typeof v === 'string' && lc(v) === lc(hex)); return e ? `--${e[0]}` : ''; };
const CARET = (open) => `<svg class="a-caret" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="${open ? 'M2 4l4 4 4-4' : 'M4 2l4 4-4 4'}" fill="none" stroke="var(--ink)" stroke-width="1.5" stroke-linecap="square"/></svg>`;

// shared with guidelines.js (the base pages use the same annotation devices)
export { pin, disc, dim, dimf, keyList };

export const guidelinesA = {
  intro(ctx) {
    const B = ctx.brand, c = content(ctx), f = c.form; const [first, ...rest] = sentences(B.description);
    // the quote screen with three callouts: who it serves (the client field), what it does (the total), the one button
    const lab = (t, p) => `<b>${t}</b><span>${p}</span>`;
    const card = `<div class="a-card a-ui a-qc"><h3>${A(f.title)}</h3><div class="a-field">${pin(1, 48, 'r', '', lab('Who it serves', A(B.audience)))}<span>${A(f.pickup)}</span><b>${A(f.pickupValue)}</b></div><div class="a-field"><span>${A(f.dropoff)}</span><b>${A(f.dropoffValue)}</b></div><div class="a-tot"><span>${A(c.paidLabel)}</span><span class="disp num">${A(c.paid)}${pin(2, 48, 'r', '', lab('What it does', A(B.product)))}</span></div><span class="a-btn">${A(f.book)}${pin(3, 48, 'r', '', lab(`One ${A(byRole(ctx, 'action').name)} button,`, 'and it says what happens next.'))}</span></div>`;
    const inner = `<div class="a-intro"><div class="a-intro-top"><h2 class="disp a-h2">${A(first)}</h2><p class="a-body">${A(rest.join(' '))}</p></div>
<figure><div class="a-panel a-intro-panel">${card}</div><figcaption class="cap" style="margin-top:12px"><b>The quote screen</b></figcaption></figure></div>`;
    return std(ctx, 'intro', inner, { title: 'Who we are' });
  },

  personality(ctx) {
    const B = ctx.brand, c = content(ctx), [l2] = B.lines.others;
    const quick = ((B.personality[2]?.means.match(/: ([^.]+)\./) || [])[1] || '').split(/,\s*|\s+and\s+/).filter(Boolean);
    const od = delivery(ctx, 'overdue');
    const proofs = [
      toast(`${c.toast} Undo`),
      `<div class="a-card a-card--row a-ui"><div class="a-r a-r--solo"><div><b>${A(od.to)}</b><i>${A(od.when.split(', ').pop().replace(/^./, (x) => x.toUpperCase()))}</i></div>${chip(ctx, od.status)}<span class="a-amt num">${A(od.price)}</span></div></div>`,
      `<div class="a-btns">${[c.form.book, ...quick.slice(0, 3).filter((q) => q !== c.form.book)].slice(0, 3).map((q, i) => `<span class="a-btn ${i ? 'a-btn--out' : ''}">${A(q)}</span>`).join('')}</div>`,
    ];
    const rows = B.personality.map((t, i) => `<li><div class="a-proof a-ui"><div class="a-pw">${proofs[i % proofs.length]}${pin(i + 1, 34)}</div></div><div class="a-trait"><h3 class="disp">${A(t.trait)}</h3><p>${A(t.means)}</p></div></li>`).join('');
    const inner = `<div class="a-lines"><span class="disp">${A(B.lines.primary)}</span><span class="a-2">${A(l2)}</span></div><ul class="a-traits">${rows}</ul>`;
    return std(ctx, 'personality', inner, { lead: `${words(B.personality.length)} traits shape how ${B.name} sounds and behaves. Two lines say it in a breath.` });
  },

  voice(ctx) {
    const B = ctx.brand, P = B.voice.principles;
    const [l1, ...l2] = sentences(B.lines.primary);
    const kerry = delivery(ctx, 'overdue');
    // the three real pieces of UI, each pinned with the kind of surface and the principle it shows
    const specs = [
      [`<div class="a-notice a-ui"><div class="t"><span style="font-weight:600;color:var(--ink)">${A(B.name)}</span><span>now</span></div><div class="b">${A(P[0].example)}</div></div>`, 'Push notification', P[0].title],
      [`<div class="a-card a-card--row a-ui"><div class="a-r a-r--solo" style="grid-template-columns:minmax(0,1fr) auto"><div><b>${A(kerry.to)}</b><i>${A(P[1].example)}</i></div><span class="a-btn a-btn--out">Send reminder</span></div></div>`, 'Invoice list', P[1].title],
      [`<div class="a-ui">${toast(P[2].example)}</div>`, 'Toast', P[2].title],
    ];
    const rows = specs.map(([ui, kind, title], i) => `<div class="a-vw">${ui}${pin(i + 1, 40, 'r', '', `<b>${kind}</b><span>${A(title)}</span>`)}</div>`).join('');
    const inner = `<div><div class="disp a-voice-big">${A(l1)}<br>${A(l2.join(' '))}</div><p class="cap a-voice-cap"><b>${A(P[3].title)}</b>The brand line. Always both halves, on two lines.</p></div>
<div class="a-panel a-vpanel">${rows}</div>`;
    return std(ctx, 'voice', inner, { lead: 'Dollars and days, said the way you would say them on site. Real amounts, real weekdays, no exclamation marks.' });
  },

  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    // a White card for the line to write, a ghost card for the line it replaces, and a leader from the ghost card to the reason
    const rows = W.map((r, i) => `<div class="a-wt-r"><div class="a-wc a-ui">${TICK}<p class="a-w">${A(r.write)}</p></div><div class="a-wg">${NOPE}<p class="a-n">${A(r.not)}</p>${pin(i + 1, 26)}</div><p class="a-b">${A(r.because)}</p></div>`).join('');
    const inner = `<div class="a-panel a-fill"><div class="a-wt"><div class="a-wt-h a-wt-r"><span>Write this</span><span>Not that</span><span>Because</span></div>${rows}</div></div>`;
    return std(ctx, 'write-this', inner, { lead: `${words(W.length)} lines as you would say them on site, beside the lines they replace.` });
  },

  messaging(ctx) {
    const B = ctx.brand, V = B.voice, all = [B.lines.primary, ...B.lines.others];
    const lines = all.map((l, i) => `<div class="a-lc ${i ? '' : 'a-first'}">${A(l)}</div>`).join('');
    const bad = ((V.nameRules.match(/Never ([^.]+)\.?\s*$/) || [])[1] || '').split(/,\s*|\s+or\s+/).map((s) => s.trim()).filter(Boolean);
    const nrows = `<div class="a-nrow">${TICK}${A(B.name)}</div>${bad.map((n) => `<div class="a-nrow bad">${NOPE}${A(n)}</div>`).join('')}`;
    // each boilerplate is a White card with its length drawn as a dimension line along the foot
    const bp = (title, text) => `<div class="a-bpc"><h3 class="h3">${title}</h3><div class="a-panel a-bpp"><div class="a-card a-bpcard"><p>${A(text)}</p>${dimf(`${wordCount(text)} words`)}</div></div></div>`;
    const inner = `<div class="a-msg"><div class="a-msg-top"><div class="a-mcol"><h3 class="h3">Lines in use</h3><div class="a-panel a-lp">${lines}</div></div>
<div class="a-mcol"><h3 class="h3">Writing the name</h3><p class="a-body" style="font-size:14px">${A(V.nameRules)}</p><div class="a-panel a-names">${nrows}</div></div></div>
<div class="a-bp">${bp('Short boilerplate', V.boilerplate25)}${bp('Long boilerplate', V.boilerplate50)}</div></div>`;
    return std(ctx, 'messaging', inner, { lead: `The lines ${B.name} uses, two boilerplates to copy, and how to write the name.` });
  },

  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, c = content(ctx), cw = B.logo.colourways.colour, sw = B.logo.colourways['on-steel'] || cw;
    const slot = ctx.edition === 'slot';
    const [s1, ...s2] = sentences(B.logo.idea);   // the idea belongs to the showcase logo; the slot edition describes the slot instead
    const lead = slot ? 'The full-colour logo is the default. It is a marked slot here until your approved files go in.' : s1;
    const note1 = slot ? ['Full colour', B.logo.when.colour] : ['How it is made', s2.join(' ') || B.logo.when.symbol];
    const symNote = slot ? B.logo.when.symbol : B.logo.showcase.symbolNote || B.logo.when.symbol;
    const gc = L.geos.colour, lh = (w) => (w * gc.h) / gc.w;
    const lab = (w) => (w >= 120 ? 'Logo' : '');
    // a width mark under the thing it measures, label below the line
    const below = (left, top, w, text) => dim('h', '', `left:${left}px;top:${top}px;width:${w}px`, '').replace('</i>', `<b style="top:8px">${text}</b></i>`);
    // 1 hero: the full-colour logo on its own ground, width and height drawn
    const HW = 260, HH = lh(HW);
    const hero = `<div class="a-panel a-lhero"><div class="a-lstage ${isGround(ctx, cw.ground) ? 'a-hair' : ''}" style="background:${cw.ground}"><div class="a-hw" style="width:${HW}px;height:${HH.toFixed(1)}px">${L.html('colour', { width: HW, color: cw.name, label: 'Your logo goes here' })}${below(0, HH + 14, HW, `${HW} px`)}${dim('v', '', `left:${HW + 16}px;top:0;height:${HH.toFixed(1)}px`, `${Math.round(HH)} px`)}</div></div></div>`;
    // 2 app header: a bar with the logo at the left and the one button at the right
    const hdW = 132, barH = 72;
    const header = `<div class="a-panel a-lctx"><div class="a-cw"><div class="a-card a-ui a-hbar" style="height:${barH}px">${L.html('colour', { width: hdW, color: cw.name, label: lab(hdW) })}<span class="a-btn a-btn--s">${A(c.empty.cta)}</span></div>${below(24, barH + 14, hdW, `${hdW} px`)}</div></div>`;
    // 3 app icon: the symbol on its colourway ground, in a rounded tile
    const tile = 88, sym = fit(ctx, 'symbol', 52, 52);
    const icon = `<div class="a-panel a-lctx"><div class="a-cw"><div class="a-card a-iconcard"><div class="a-tile" style="width:${tile}px;height:${tile}px;background:${sw.ground}">${L.html('symbol', { width: sym, colourway: 'on-steel', color: sw.name, label: 'Symbol' })}</div></div>${below(16, 134, tile, `${tile} px`)}</div></div>`;
    // 4 invoice: the logo at the head of a client invoice
    const invW = 96, paid = delivery(ctx, 'paid') || c.deliveries[0];
    const invoice = `<div class="a-panel a-lctx"><div class="a-cw"><div class="a-card a-ui a-inv">${L.html('colour', { width: invW, color: cw.name, label: '' })}<div class="a-invr">${A(paid.to)}</div><div class="a-invt"><span>${A(c.paidLabel)}</span><b class="num">${A(c.paid)}</b></div></div>${below(16, 134, invW, `${invW} px`)}</div></div>`;
    // 5 favicon: the symbol alone, 16 px, in a browser tab
    const fav = `<div class="a-panel a-lctx"><div class="a-cw"><div class="a-tab a-ui">${L.html('symbol', { width: 16, colourway: 'on-steel', color: sw.name, label: '' })}<span>${A(B.name)}</span></div>${below(14, 52, 16, '16 px')}</div></div>`;
    const cap = (t, p) => `<figcaption class="cap" style="margin-top:12px"><b>${t}</b>${p}</figcaption>`;
    const inner = `<div class="a-lrow"><figure>${hero}${cap(A(L.labels.colour), A(B.logo.when.colour))}</figure>
<ul class="a-gate-notes"><li><h3 class="h3">${note1[0]}</h3><p>${A(note1[1])}</p></li><li><h3 class="h3">Where the symbol goes</h3><p>${A(B.logo.when.symbol)}</p></li></ul></div>
<div class="a-ctx"><figure class="a-ctx-w">${header}${cap('App header', 'The full-colour logo at the left, the one button at the right.')}</figure>
<figure>${icon}${cap(A(L.labels.symbol), A(symNote))}</figure>
<figure>${invoice}${cap('Invoice', 'The full-colour logo at the head of every invoice.')}</figure>
<figure>${fav}${cap('Favicon', 'The symbol alone, at 16 px, where only a small mark fits.')}</figure></div>`;
    return std(ctx, 'logo', inner, { lead });
  },

  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways.colour, share = L.clearShare, r = (n) => n.toFixed(1);
    // the logo version `id` at scale s (px per logo unit) inside its clear zone; x = the clear-space unit, labelled when `marks`
    const zoneOf = (id, s, marks) => {
      const g = L.geos[id], lw = g.w * s, lh = g.h * s, X = L.geo.unit * s, zw = lw + 2 * X, zh = lh + 2 * X;
      const unit = (st) => `<span class="a-unit" style="${st};width:${r(X)}px;height:${r(X)}px"></span>`;
      const d = marks ? `${dim('h', '', `left:0;top:${r(zh / 2)}px;width:${r(X)}px`, 'x')}${dim('h', '', `left:${r(zw - X)}px;top:${r(zh / 2)}px;width:${r(X)}px`, 'x')}${dim('v', '', `left:${r(zw / 2)}px;top:0;height:${r(X)}px`, 'x')}${dim('v', '', `left:${r(zw / 2)}px;top:${r(zh - X)}px;height:${r(X)}px`, 'x')}` : '';
      // three pins on the big drawing, one per rule: a dot in a clear strip (1), at the logo's edge (2), on the zone's outer line (3)
      const pins = marks ? `${pin(1, 22, 't', '--x:50%;--oy:0px')}${pin(2, r(X + 22), 'b', `--x:25%;--oy:${r(-X)}px`)}${pin(3, 22, 'b', '--x:80%;--oy:0px')}` : '';
      return `<div class="a-zone" style="width:${r(zw)}px;height:${r(zh)}px">${unit('left:0;top:0')}${unit('right:0;top:0')}${unit('left:0;bottom:0')}${unit('right:0;bottom:0')}${d}<div class="a-zin" style="left:${r(X)}px;top:${r(X)}px;width:${r(lw)}px;height:${r(lh)}px">${L.html(id, { width: lw, colourway: L.colourwayOf(id) === 'colour' ? 'colour' : undefined, color: cw.name, label: id === 'colour' ? 'Your logo goes here' : 'Logo' })}</div>${pins}</div>`;
    };
    const zone = zoneOf('colour', 440 / L.geos.colour.w, true);
    const small = ['horizontal', 'stacked', 'symbol'];
    const s2 = 176 / (Math.max(...small.map((id) => L.geos[id].w)) + 2 * L.geo.unit);
    const row = small.map((id) => `<figure><div class="a-panel a-zsm">${zoneOf(id, s2, false)}</div><figcaption class="cap"><b>${A(L.labels[id])}</b>The same x, from the same type size.</figcaption></figure>`).join('');
    const size = ctx.edition === 'slot' ? `x is ${share}% of the logo's height.` : `x is a quarter of the type size, ${share}% of the logo's height.`;
    const inner = `<figure><div class="a-panel a-zonewrap">${zone}</div><figcaption class="cap" style="margin-top:12px"><b>Clear space</b>Measured from the edge of the logo, on all four sides.</figcaption></figure>
${keyList([[1, 'x on every side', A(size)], [2, 'Nothing inside the zone', 'No type, no edges and no other logos enter it.'], [3, 'More is fine', 'Give the logo more room whenever the page has it. Never less.']])}
<div class="a-zrow">${row}</div>`;
    return std(ctx, 'clear-space', inner, { lead: `Keep a clear zone around the logo, ${share}% of its height on every side.` });
  },

  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour, lh = (w) => (w * L.geo.height) / L.geo.width;
    const mmPx = (mm) => (mm * 96) / 25.4; // CSS px for a length in mm
    // one White cell: the logo at its minimum, with the width drawn under it and the height at its side, and a numbered disc keyed to the table
    const cell = (n, w, wText, hText) => {
      const h = lh(w);
      return `<div class="a-msbox"><u class="a-pd a-mn">${n}</u><div class="a-mslogo" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px">${L.html('colour', { width: w, color: cw.name, label: 'Logo' })}${dim('h', '', `left:0;top:${(h + 18).toFixed(1)}px;width:${w.toFixed(1)}px`, '').replace('</i>', `<b style="top:8px">${wText}</b></i>`)}${dim('v', '', `left:${(w + 18).toFixed(1)}px;top:0;height:${h.toFixed(1)}px`, hText)}</div></div>`;
    };
    const specs = [['Screen', m.screenPx, `${m.screenPx} px`, `${m.screenH} px`, 'The smallest it appears on a screen.'], ['Print', mmPx(m.printMm), `${m.printMm} mm`, `${m.printH} mm`, 'The smallest it prints, on any paper.']];
    const tbl = `<div class="a-tbl a-spec">${specs.map(([t, , w, h, note], i) => `<div class="a-tr a-tr--s">${disc(i + 1)}<b>${t}</b><span class="a-sv">${w} wide</span><span class="a-sv">${h} high</span><span class="a-ln">${note}</span></div>`).join('')}</div>`;
    const steps = [1, 2, 3];
    const ladder = steps.map((k) => `<figure>${L.html('colour', { width: m.screenPx * k, color: cw.name, label: 'Logo' })}${dimf(`${Math.round(m.screenPx * k)} px`)}</figure>`).join('');
    const inner = `<div class="a-panel a-ms2">${specs.map(([, w, wt, ht], i) => cell(i + 1, w, wt, ht)).join('')}</div>
${tbl}
<div><h3 class="h3" style="margin-bottom:12px">At the minimum and above</h3><div class="a-panel a-ladder">${ladder}</div></div>`;
    return std(ctx, 'min-size', inner, { lead: 'The logo never goes smaller than these widths. Both are drawn at actual size: on screen at 1 px to the pixel, in print at true millimetres.' });
  },

  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, keys = ['colour', 'on-steel', 'on-toolbox', 'reversed'].filter((k) => cw[k]);
    const ml = cw['mono-light'];
    // the photo is key 1; the flat grounds are 2 to 5, each a strip of the ground with the logo on it, and a key beside it
    const photo = `<figure><div class="a-panel a-phw"><div class="a-gt a-gt--photo">${ctx.photo('ute', { cls: 'a-fillimg', pos: '50% 50%' })}<span class="a-onphoto">${L.html('mono-light', { width: 190, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span><u class="a-pd a-mn">1</u></div></div><figcaption class="cap" style="margin-top:12px"><b>On a photo</b>Mono light, on a quiet dark part of the picture. Clear of faces and edges.</figcaption></figure>`;
    const rows = keys.map((key, i) => {
      const c = cw[key], same = lc(c.name) === lc(c.cut);
      const desc = same ? `${hexName(ctx, c.name)} name and wedge` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c.cut)} wedge`;
      return `<div class="a-gr"><div class="a-gs ${isGround(ctx, c.ground) ? 'a-hair' : ''}" style="background:${c.ground}">${L.html('colour', { width: 150, colourway: key, color: c.name, label: 'Logo' })}</div><div class="a-gx">${disc(i + 2)}<div><b>On ${A(hexName(ctx, c.ground))}</b><span>${A(desc)}</span><code class="a-mono">${A(c.ground)}</code></div></div></div>`;
    }).join('');
    const names = [...new Set(keys.map((k) => hexName(ctx, cw[k].ground)))];
    const inner = `${photo}<div class="a-grs">${rows}</div>`;
    return std(ctx, 'logo-grounds', inner, { lead: `The logo sits on ${list(names)}, each in its own colourway. On a photo it goes in mono light.` });
  },

  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, w = 150;
    const off = ctx.C.toOklch(byRole(ctx, 'action').hex); const wrong = ctx.C.fromOklch(Math.min(off.L, 0.42), off.C, (off.H + 180) % 360);
    // a busy ground: loose strokes in the brand's own colours, laid at random angles
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cols = ctx.colours.map((c) => c.hex);
    const strokes = Array.from({ length: 46 }, (_, i) => `<rect x="${(rnd() * 300 - 20).toFixed(0)}" y="${(rnd() * 200 - 30).toFixed(0)}" width="${(8 + rnd() * 12).toFixed(0)}" height="${(50 + rnd() * 70).toFixed(0)}" fill="${cols[i % cols.length]}" transform="rotate(${(rnd() * 180).toFixed(0)} 150 100)"/>`).join('');
    const busy = `<svg class="bg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${strokes}</svg><span class="a-lg">${L.forMisuse(w)}</span>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.3,0.7)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${ctx.C.hexToRgb(B.logo.colourways.colour.name).join(',')},0.55))">${L.forMisuse(w)}</div>`],
      ['Busy ground', 'Never on a busy image. Use a flat colour, or mono light on a quiet part of a photo.', busy],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="a-boxed">${L.forMisuse(w - 36)}</div>`],
    ];
    // a specimen is crossed twice: corner to corner in hairline, and a cross badge; the numbered disc keys it to its caption
    const X = `<svg class="a-x" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0L100 100M100 0L0 100" vector-effect="non-scaling-stroke"/></svg>`;
    const tile = ([t, cap, html], i) => `<figure class="a-mf"><div class="a-mt ${t === 'Busy ground' ? 'a-mt--busy' : ''} ${ctx.edition === 'slot' ? 'a-mt--slot' : ''}">${html}${X}<u class="a-pd a-mn">${i + 1}</u>${CROSS}</div><figcaption class="cap a-mc">${disc(i + 1)}<span><b>${t}</b>${cap}</span></figcaption></figure>`;
    return std(ctx, 'logo-misuse', `<div class="a-mgrid">${items.map(tile).join('')}</div>`, { lead: 'Six ways the logo goes wrong. Use the supplied files as they are, and none of these.' });
  },

  palette(ctx) {
    const cs = ctx.colours, action = byRole(ctx, 'action'), c = content(ctx), B = ctx.brand;
    const onAction = ctx.pairs.filter((p) => p.bgHex === action.hex && !p.large);
    const lead = `${words(cs.length)} colours, each named for where it lands. ${action.name} is the one people see us by.${onAction.length ? ` ${hexName(ctx, onAction[0].fgHex)} type goes on it.` : ''}`;
    const btn = (action.lands.match(/like ([^,.]+)/) || [])[1] || c.empty.cta;
    // the annotated screen: four pins, one per colour, each naming the colour, its role and its value where it is used
    const ink = byRole(ctx, 'text'), steel = byRole(ctx, 'panel'), white = byRole(ctx, 'ground');
    const lab = (k) => `<b>${A(k.name)}</b><span>${A(ctx.cap(k.role))} <code class="a-mono">${A(k.hex)}</code></span>`;
    const dl = ['sent', 'overdue', 'paid'].map((s) => delivery(ctx, s)).filter(Boolean);
    const rows = dl.map((d, i) => `<div class="a-r"><div><b>${A(d.to)}</b><i>${A(d.when)}</i></div>${chip(ctx, d.status)}<span class="a-amt num">${A(d.price)}${i === 0 ? pin(2, 48, 'r', '', lab(ink)) : ''}</span></div>`).join('');
    const ui = `<div class="a-card a-ui a-pcard"><div class="a-pal-head"><h3 class="disp">${A(B.ui.screen.content.example.crumbs?.[0] || 'Invoices')}</h3><span class="a-btn">${A(btn)}${pin(1, 48, 'r', '', lab(action))}</span></div>${rows}${pin(3, 24, 'r', '--y:62%', lab(white))}</div><span class="a-steelpt">${pin(4, 44, 'r', '--ox:-20px', lab(steel))}</span>`;
    const order = [action, ink, white, steel];
    const tr = (k, n) => `<div class="a-tr"><span class="a-tc">${disc(n)}<i class="a-sw ${isGround(ctx, k.hex) ? 'a-hair' : ''}" style="background:${k.hex}"></i><b>${A(k.name)}</b></span><span class="a-tk"><code class="a-mono">--palette-${A(k.id)}</code><code class="a-mono">${A(tokenOf(ctx, k.hex))}</code></span><code class="a-mono">${A(k.hex)}</code><span class="a-ln">${A(k.lands)}</span></div>`;
    const insp = `<div class="a-tbl"><div class="a-tr a-tr--h"><span>Colour</span><span>Token</span><span>HEX</span><span>Where it lands</span></div>${order.map((k, i) => tr(k, i + 1)).join('')}</div>`;
    const chips = ['paid', 'overdue', 'sent', 'draft'].filter((s) => statusOf(ctx, s)).map((s) => chip(ctx, s, true)).join('');
    const inner = `<figure><div class="a-panel a-pal-panel">${ui}</div><figcaption class="cap" style="margin-top:12px"><b>The invoice list, actual size</b>White cards on Steel, Ink for text, one ${A(action.name)} button.</figcaption></figure>
${insp}
<div class="a-pchips">${chips}<p class="a-pcap">A status is words in its own colour, so ${A(action.name)} never means ${A(statusOf(ctx, 'overdue')?.tone === 'danger' ? 'overdue' : 'a status')}.</p></div>`;
    return std(ctx, 'palette', inner, { lead });
  },

  proportion(ctx) {
    // biggest share is the ground; the page drawing is split by area, so every share is true to the percent
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pc = (c) => Math.round(c.share * 100), action = byRole(ctx, 'action');
    const [g, p, ...rest] = cs;
    const total = cs.reduce((s, c) => s + c.share, 0), col2 = 1 - g.share / total, pH = p.share / total / col2, restW = rest.reduce((s, c) => s + c.share, 0);
    const block = (c) => `<div style="background:${c.hex}"></div>`;
    const W = 280, H = 396, gw = (g.share / total) * W, cw = W - gw;   // the page drawing, px
    const page = `<div class="a-pg" style="grid-template-columns:${(g.share / total * 100).toFixed(2)}fr ${(col2 * 100).toFixed(2)}fr"><div class="a-pgb" style="background:${g.hex}"></div><div class="a-pgcol" style="grid-template-rows:${(pH * 100).toFixed(2)}fr ${((1 - pH) * 100).toFixed(2)}fr">${block(p)}<div class="a-pgrow" style="grid-template-columns:${rest.map((c) => (c.share / restW * 100).toFixed(2) + 'fr').join(' ')}">${rest.map(block).join('')}</div></div></div>`;
    // one pin per colour, in order of share: the ground from the left edge, the second from the right, the rest down from the foot
    const lab = (c) => `<b>${A(c.name)}</b><span class="a-pc num">${pc(c)}%</span>`;
    let cum = 0;
    const pins = [pin(1, 40, 'l', `left:0;top:${(H / 2).toFixed(0)}px`, lab(g)), pin(2, 40, 'r', `left:${W}px;top:${((pH * H) / 2).toFixed(0)}px`, lab(p)),
      ...rest.map((c, i) => { const f = c.share / restW, x = gw + cw * (cum + f / 2); cum += f; const h = pin(3 + i, 22, 'b', `left:${x.toFixed(0)}px;top:${H}px`, lab(c)); return i < rest.length / 2 ? h.replace('a-pin--b', 'a-pin--b a-pin--bl') : h; })].join('');
    const dims = `${dim('h', '', `left:0;top:-22px;width:${gw.toFixed(0)}px`, `${Math.round((g.share / total) * 100)}%`)}${dim('h', '', `left:${gw.toFixed(0)}px;top:-22px;width:${cw.toFixed(0)}px`, `${Math.round(col2 * 100)}%`)}`;
    const rows = cs.map((c, i) => `<div class="a-pr">${disc(i + 1)}<i class="a-sw ${isGround(ctx, c.hex) ? 'a-hair' : ''}" style="background:${c.hex}"></i><b>${A(c.name)}</b><i class="a-bar ${isGround(ctx, c.hex) ? 'a-hair' : ''}" style="width:${(c.share / g.share * 100).toFixed(1)}%;background:${c.hex}"></i><span class="a-pct num">${pc(c)}%</span></div>`).join('');
    const inner = `<figure><div class="a-panel a-prop"><div class="a-pgw" style="width:${W}px;height:${H}px">${page}${dims}${pins}</div></div><figcaption class="cap" style="margin-top:12px"><b>One page, drawn to scale</b>Each colour's area is its share of the page.</figcaption></figure><div class="a-prt">${rows}</div>`;
    return std(ctx, 'proportion', inner, { lead: `Most of every page is ${g.name}, and ${p.name} holds the quiet work. ${action.name} takes ${pc(action)} per cent, so it stays the one thing the eye goes to.` });
  },

  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp), action = byRole(ctx, 'action'), surface = lc(ctx.roles.light.surface);
    // the inspector: a dev-tools pane. One row per colour (caret, swatch, name, token, HEX, RGB, OKLCH); a colour with a ramp is expanded to its stepped scale bar.
    const head = (c, open, tokens) => `<div class="a-irow">${CARET(open)}<i class="a-sw ${isGround(ctx, c.hex) ? 'a-hair' : ''}" style="background:${c.hex}"></i><b>${A(c.name)}</b><span class="a-itk">${tokens}</span><code class="a-mono">${A(c.hex)}</code>${c.rgb ? `<code class="a-mono">${A(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1 G $2 B $3'))}</code><code class="a-mono">${A(c.oklch)}</code>` : ''}</div>`;
    const scale = (c) => `<div class="a-scale">${steps.map((k) => `<div class="${+k === c.rampBase ? 'a-base' : ''}"><i class="${lc(c.ramp[k]) === surface ? 'a-hair' : ''}" style="background:${c.ramp[k]}"></i><span>${k}</span></div>`).join('')}</div>`;
    const row = (c) => `<div class="a-ic">${head(c, c.rampBase !== 50, `<code class="a-mono">--palette-${A(c.id)}</code>`)}${c.rampBase === 50 ? `<p class="a-rampnote">The ground. No tints.</p>` : scale(c)}</div>`;
    const tone = (t) => `<div class="a-irow a-irow--t">${CARET(false)}<i class="a-sw ${isGround(ctx, t.hex) ? 'a-hair' : ''}" style="background:${t.hex}"></i><b>${A(t.name)}</b><span class="a-itk"><code class="a-mono">${A(tokenOf(ctx, t.hex))}</code></span><code class="a-mono">${A(t.hex)}</code></div>`;
    const cols = `<div class="a-icols"><span></span><span></span><span>Colour</span><span>Token</span><span>HEX</span><span>RGB</span><span>OKLCH</span></div>`;
    const inner = `<div class="a-panel a-insp">${cols}${ctx.colours.map(row).join('')}<div class="a-ic a-ic--t"><h3 class="h3">Tones</h3>${ctx.tones.map(tone).join('')}</div></div>
<p class="a-body" style="font-size:14px">Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(action.name)} to the proof. Every ramp step is in the palette files in the brand kit.</p>`;
    return std(ctx, 'colour-values', inner, { lead: 'HEX, RGB and OKLCH for each colour, with its ramp from lightest to darkest, except the ground. The underlined step is the colour itself.' });
  },
};
