// Lane ht: the notes under each slide of the guidelines site. A deck published to the web keeps its speaker notes: here they are
// the page's rules as readable text, so the guidelines work on a phone where the slide is only a picture. Each page gets one big
// line (the slide's one idea, in words) and its notes; brand copy is printed whole, every value is read from ctx.
// The notes are drawn from the site's context (lane-ht-clean.js): a value the project has not written is an empty string there, and an
// empty value is a line, a row or a block that is not printed.
import { A, L, lower, nameOfHex, fieldStyle, darkF, actF, panelF, fitSize, words, inkOn, cwFor, byRole } from './lane-ht-lib.js';
import { onceRe, sayOnce } from './lane-g3-kit.js';
import { distinctColours, servedFamily, ratioText, clearTimes } from './helpers.js';
import { screenContent, exampleDemo } from './once.js';

// A brand that says one word once (Long Room: "Say free once") prints it on the slide and nowhere else: these notes leave it off, as the print pages do.
const ok = (ctx, t) => { const re = onceRe(ctx); return !!t && !(re && re.test(t)); };
const keep = (ctx, t) => (ok(ctx, t) ? t : '');
// the one line a page leads with: the primary line, or the brand's next line where the primary line carries the word, else the name (or nothing)
const lead = (ctx) => { const B = ctx.brand; return ok(ctx, B.lines.primary) ? B.lines.primary : (B.lines.others.find((t) => ok(ctx, t)) || B.name || ''); };
const NONE = { big: '', html: '' };
const VOICE_PAIRS = [
  ['Order 1042 is packed. It should reach you by 11:40 am.', 'Your order has been processed and will be dispatched in due course.'],
  ['We could not take that card. Check the details and try again.', 'Error 402: payment declined.'],
];
// A photograph the brand has still to choose is shown as a drawn scene in its own colours (a market stall at work), so a frame is never
// empty: the sky is the calm part of the picture, where the type or the reversed logo goes.
const accentFor = (ctx, ...against) => [(byRole(ctx, 'accent') || {}).hex, L(ctx).accent, ...distinctColours(ctx).map((c) => c.hex)].find((h) => h && against.every((g) => ctx.ratio(h, g) >= 1.8)) || '';
const scene = (ctx, { sky, a, b, post, crate, fruit, ground }, label = '') => {
  const awn = (_, i) => `<rect x="${48 + i * 38}" y="88" width="38" height="44" fill="${i % 2 ? b : a}"/><path d="M${48 + i * 38} 132h38a19 14 0 0 1-38 0z" fill="${i % 2 ? b : a}"/>`;
  const crates = [0, 1, 2].map((i) => { const x = 76 + i * 100; return `<rect x="${x}" y="162" width="72" height="34" fill="${crate}"/><rect x="${x}" y="176" width="72" height="3" fill="${post}"/>${[14, 36, 58].map((d, k) => `<circle cx="${x + d}" cy="156" r="10" fill="${fruit[(i + k) % 2]}"/>`).join('')}`; }).join('');
  return `<svg class="ht-scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"${label ? ` role="img" aria-label="${A(label)}"` : ' aria-hidden="true"'}><rect width="400" height="300" fill="${sky}"/><rect y="250" width="400" height="50" fill="${ground}"/><rect x="60" y="132" width="8" height="118" fill="${post}"/><rect x="332" y="132" width="8" height="118" fill="${post}"/>${Array.from({ length: 8 }, awn).join('')}<rect x="40" y="196" width="320" height="54" fill="${post}"/><rect x="34" y="190" width="332" height="10" fill="${a}"/>${crates}</svg>`;
};
// the scene on the page ground (photo direction)
const sceneOnPage = (ctx, label) => { const act = actF(ctx), dk = darkF(ctx), sky = L(ctx).sunken; return scene(ctx, { sky, a: act, b: accentFor(ctx, act, sky) || dk, post: dk, crate: L(ctx).surface, fruit: [act, accentFor(ctx, L(ctx).surface, dk) || act], ground: act }, label); };
// the scene as a photograph the logo is set on: the action colour is the sky, the reversed logo sits on it
const sceneOnAction = (ctx) => { const act = actF(ctx), dk = darkF(ctx), light = L(ctx).surface; return scene(ctx, { sky: act, a: light, b: accentFor(ctx, act, dk) || dk, post: dk, crate: light, fruit: [accentFor(ctx, act, dk) || light, dk], ground: dk }); };
const PHOTO_BRIEF = [['Subject', 'People at work, caught mid-task, not posed.'], ['Light', 'Daylight from the side. No flash.'], ['Crop', 'Close in, with clear space round the subject for type.']];

const dl = (rows) => { const r = rows.filter(([, v]) => v); return r.length ? `<dl class="ht-dl">${r.map(([k, v]) => `<dt>${A(k)}</dt><dd>${v}</dd>`).join('')}</dl>` : ''; };
const pair = (rows, [h1, h2]) => (rows.length ? `<ul class="ht-pair"><li><p class="ht-pair__h">${A(h1)}</p><p class="ht-pair__h">${A(h2)}</p></li>${rows.map(([a, b]) => `<li><p><span class="ht-pair__k">${A(h1)}</span>${a}</p><p><span class="ht-pair__k">${A(h2)}</span>${b}</p></li>`).join('')}</ul>` : '');
const list = (items) => (items.length ? `<ol class="ht-list">${items.map((x) => `<li><span>${x}</span></li>`).join('')}</ol>` : '');
const p = (t, cls = 'ht-p') => (t ? `<p class="${cls}">${t}</p>` : '');
const m = (t) => (t ? `<span class="ht-m">${A(t)}</span>` : '');
// whole percentages that add to 100: the largest remainders take the spare points
const pcts = (cs) => {
  const total = cs.reduce((a, c) => a + c.share, 0) || 1, raw = cs.map((c) => (c.share / total) * 100), out = raw.map(Math.floor);
  let left = 100 - out.reduce((a, b) => a + b, 0);
  raw.map((r, i) => [r - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
  return out.map((n) => `${n}%`);
};
// a face by its brand name: which font file stands in for it is the maker's business, not the reader's
const faceName = (F) => F.family;
// a number with its unit, set in the body face with tabular figures and one plain space (the mono face is for hex and code only)
const nv = (t) => (t ? `<span class="num">${A(t)}</span>` : '');
// the brand's device: its colours as flat blocks, each as wide as its share of the colour proportion (the page ground is not a block: it
// is the paper the blocks sit on), a bar under a section's title, stepped on the cover
export const device = (ctx, cover = false) => {
  const cs = distinctColours(ctx).filter((c) => lower(c.hex) !== lower(L(ctx).surface)).sort((a, b) => b.share - a.share).slice(0, 5);
  if (cs.length < 2) return '';
  // both the width and (on the cover) the height of a block come from its share of the colour proportion
  const top = cs[0].share || 1;
  const h = (c) => (cover ? `height:${Math.max(18, Math.round(((c.share || 1) / top) * 100))}%;` : '');
  return `<div class="ht-dev${cover ? ' ht-dev--cv' : ''}" aria-hidden="true">${cs.map((c) => `<span style="flex:${c.share || 1};${h(c)}background:${c.hex}"></span>`).join('')}</div>`;
};
const cap1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// fields that meet at straight edges; a field on the page ground gets a hairline so it reads against the ground.
// The grid fits its content: when the last row would be short, the last field takes the rest of it (--ls at the wide layout; a lone last
// field takes the whole row of the two-up tablet layout), so a row of five in three columns has no empty cell.
const fields = (ctx, items, n = items.length) => {
  const k = items.length, rest = k % n, ls = rest ? n - rest + 1 : 1;
  if (!k) return '';
  return `<div class="ht-fields" style="--n:${n};--ls:${ls}">${items.map((f, i) => `<div class="ht-field${lower(f.hex) === lower(L(ctx).surface) ? ' ht-field--hair' : ''}${lower(f.hex) === lower(darkF(ctx)) ? ' ht-field--dk' : ''}${i === k - 1 && ls > 1 ? ' ht-field--last' : ''}${i === k - 1 && k % 2 ? ' ht-field--odd' : ''}" style="${fieldStyle(ctx, f.hex, f.what || 'site notes field', f.size || 15)}${f.style || ''}">${f.html}</div>`).join('')}</div>`;
};
const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo. The pattern here stands in for one.', 'Do not outline it or put it in a box.'];
// The six misuses as tiles, each the real mark with its fault really applied (stretched, recoloured, rotated, shadowed, set on a busy ground, boxed)
// and a small red mark in the corner that says "wrong". Three across on a wide page, two on a phone. The mark sits above its ground (z-index 1 in an isolated tile).
// Where the mark is drawn from the name (the published sites) it takes 60% of its tile, measured in the tile's own width.
const misuseTiles = (ctx) => {
  const cw = ctx.brand.logo.colourways, g = cw.reversed.ground, act = actF(ctx), geo = 'colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0];
  const seen = [], spare = ctx.colours.map((c) => c.hex).filter((h) => { const k = lower(h); if (seen.includes(k)) return false; seen.push(k); return k !== lower(g) && k !== lower(cw.reversed.name); });
  const bands = spare.length ? spare.slice(0, 4) : [L(ctx).surface, L(ctx).text];
  const shade = ctx.ratio(L(ctx).text, g) >= 1.8 ? L(ctx).text : L(ctx).surface;
  // a fill that visibly differs from the version's own colour and still shows on the ground
  const wrong = [act, ...spare, L(ctx).surface].find((c) => ctx.ratio(c, g) >= 3 && ctx.ratio(c, cw.reversed.name) >= 1.3) || act;
  const bad = L(ctx).danger?.fg || '#C0392B';
  const share = ctx.logo.drawn ? { share: 0.6 } : {};
  // twelve narrow stripes turned off the square: a busy ground, labelled as the pattern it is
  const stripes = `<span class="ht-tile__p">${bands.concat(bands, bands).slice(0, 12).map((c, i) => `<span class="ht-tile__b" style="left:${(i * 100) / 12}%;width:${100 / 12}%;background:${c}"></span>`).join('')}</span>`;
  const mark = (extra = {}) => ctx.logo.html(geo, { width: 88, colourway: 'reversed', color: cw.reversed.name, label: 'Logo', ...share, ...extra });
  const items = [
    ['Stretched', 'transform:scale(1.5,0.5)', '', mark()], ['Recoloured', '', '', ctx.logo.forMisuse(88, { fill: wrong, ...share })], ['Rotated', 'transform:rotate(-14deg)', '', mark()],
    ['Effects', `filter:drop-shadow(0 6px 6px ${shade})`, '', mark()], ['Busy ground', '', stripes, mark()], ['Outlined or boxed', `border:1.5px solid ${cw.reversed.name};padding:10px`, '', mark()],
  ];
  const no = `<span class="ht-tile__no" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="12" fill="${bad}"/><path d="M8 8l8 8M16 8l-8 8" stroke="${L(ctx).surface}" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg></span>`;
  return `<ul class="ht-tiles">${items.map(([t, st, bg, mk], i) => `<li class="ht-tile"><div class="ht-tile__a" style="${fieldStyle(ctx, g, 'site misuse tile')}">${bg}<span class="ht-tile__m" style="${st}">${mk}</span>${no}</div><p class="ht-tile__t">${A(t)}</p><p class="ht-tile__n">${A(misuse[i])}</p></li>`).join('')}</ul>`;
};
const doDont = (rules) => pair(rules.map((r) => [A(r.do), A(r.dont)]), ['Do', 'Do not']);
// a colour as a field: its name, what it is for in words, then its values. `full` adds the RGB and the role line the palette slide carries.
// Every name is set at one size, so a row of colours reads as one list.
// The names step down with the colour's rank (the first colour is the largest), so the palette reads in order.
const NAME_SIZE = ['clamp(36px, 15cqw, 56px)', 'clamp(30px, 12cqw, 44px)', 'clamp(26px, 10cqw, 36px)'];
const colourField = (ctx, c, full = false, i = 9) => ({
  hex: c.hex, what: `site colour ${c.name}`, size: 24,
  html: `<p class="ht-d ht-field__w" style="--ws:${NAME_SIZE[Math.min(i, 2)]}">${A(c.name)}</p><p class="ht-field__c">${A(c.lands || '')}<span class="ht-m">${A(c.hex)}</span>${full ? `<span class="num">rgb(${ctx.C.hexToRgb(c.hex).join(', ')})</span><span class="ht-field__r">The ${A(c.roleText || c.role)} colour.</span>` : ''}</p>`,
});

// 3.5: one tile per colour the brand has, each filled with the colour it names and showing the version of the logo that goes on it,
// then a tile for a photograph (a calm part of the picture takes the reversed logo)
const cwCaption = (cw, k, ctx, hex) => {
  if (cw[k] && lower(cw[k].ground) === lower(hex)) return k === 'colour' ? 'Full-colour logo' : k === 'reversed' ? 'Reversed logo' : '';
  return lower(inkOn(ctx, hex)) === lower(L(ctx).text) ? 'One-colour logo, in the dark text colour' : 'One-colour logo, in the light ground colour';
};
const groundTiles = (ctx) => {
  const cw = ctx.brand.logo.colourways, geo = 'colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0], dk = darkF(ctx);
  const tiles = distinctColours(ctx).slice(0, 5).map((c) => {
    const k = cwFor(ctx, c.hex), own = cw[k] && lower(cw[k].ground) === lower(c.hex), ink = own ? cw[k].name : inkOn(ctx, c.hex);
    return { hex: c.hex, what: `site logo ground ${c.name}`, html: `<div class="ht-field__logo">${ctx.logo.html(geo, { width: 180, ...(own ? { colourway: k } : {}), color: ink, label: 'Logo' })}</div><p class="ht-field__c"><b>${A(c.name)}</b>${cwCaption(cw, k, ctx, c.hex) ? `<br>${A(cwCaption(cw, k, ctx, c.hex))}` : ''}</p>` };
  });
  tiles.push({ hex: dk, what: 'site logo ground photo', html: `<div class="ht-field__img">${sceneOnAction(ctx)}<div class="ht-field__imglogo">${ctx.logo.html(geo, { width: 150, colourway: 'reversed', color: inkOn(ctx, actF(ctx)), label: 'Logo' })}</div></div><p class="ht-field__c"><b>On a photo</b><br>Set the reversed logo on the calmest part of the picture, here the sky.</p>` });
  return fields(ctx, tiles, 3);
};

// 5.1: each face as a specimen: its "Aa" large, the alphabet and figures, then up to three of its weights
const SPEC_ROLE = { display: ['Display', 'var(--disp)', 'ht-d'], body: ['Body', 'var(--body)', ''], mono: ['Mono', 'var(--mono)', ''] };
const spread3 = (w) => (w.length <= 3 ? w : [w[0], w[Math.floor(w.length / 2)], w[w.length - 1]]);
const specimen = (ctx, role) => {
  const F = ctx.brand.fonts[role], [label, fam, cls] = SPEC_ROLE[role], ws = spread3(F.weights), last = F.weights[F.weights.length - 1];
  const wt = (w) => `font-weight:${w}`;
  return `<section class="ht-spec" aria-label="${label}"><div class="ht-spec__h"><p class="ht-k">${label}</p><p class="ht-spec__n">${A(faceName(F))}</p><p class="ht-m">${F.weights.join(', ')}</p></div><div class="ht-spec__s"><p class="ht-spec__aa ${cls}" style="font-family:${fam};${wt(role === 'display' ? last : F.weights.includes(400) ? 400 : F.weights[0])}" aria-hidden="true">Aa</p><p class="ht-spec__g ${cls}" style="font-family:${fam};${wt(role === 'display' ? last : 400)}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p><ul class="ht-spec__w">${ws.map((w) => `<li${cls ? ` class="${cls}"` : ""} style="font-family:${fam};${wt(w)}"><span>Aa Bb Cc 123</span><span class="ht-m">${w}</span></li>`).join('')}</ul></div></section>`;
};

// 8.1: the applications as they would be made, drawn from the palette and the name: a 90 x 55 mm card, a sign panel, a phone screen.
// The screens read the shared sample order (the same one the UI kit's lists, cards and dialog use), so the two sites tell one story.
const ORDER = { screen: 'Orders', id: 'Order 1042', status: 'Packing', due: 'Due 11:40 am', total: 'Total $84.35', action: 'Track order' };
const mockups = (ctx, { spread = false } = {}) => {
  const B = ctx.brand, A_ = B.applications, act = actF(ctx), dk = darkF(ctx), geo = 'colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0];
  const ph = L(ctx).sunken;
  // the card's rule and the sign's base are accents that show on their own grounds (the ground's own colour would vanish)
  const rule = accentFor(ctx, act), base = accentFor(ctx, dk);
  const wm = (hex, width) => ctx.logo.html(geo, { width, colourway: 'reversed', color: inkOn(ctx, hex), label: 'Logo' });
  const card = A_.card || {}, sign = A_.signage || 'Pick up here';
  const who = [card.person, card.role].filter(Boolean), contact = [card.contact].filter(Boolean);
  const lines = who.length || contact.length ? [...who, ...contact] : ['Jo Hartley', 'Packing lead', 'jo.hartley@example.com', '0412 345 678'];
  const fig = (cls, body, t, n) => `<figure class="ht-mk ${cls}">${body}${spread ? '' : `<figcaption><b>${A(t)}</b> ${A(n)}</figcaption>`}</figure>`;
  const cardHtml = `<div class="ht-mk__card" style="${fieldStyle(ctx, act, 'site mock-up card')}"><div class="ht-mk__logo">${wm(act, 150)}</div>${rule ? `<span class="ht-mk__rule" style="background:${rule}"></span>` : ''}<p class="ht-mk__p">${lines.map(A).join('<br>')}</p></div>`;
  const signHtml = `<div class="ht-mk__sign" style="${fieldStyle(ctx, dk, 'site mock-up sign')}"><div class="ht-mk__logo">${wm(dk, 170)}</div><p class="ht-d ht-mk__line">${A(sign)}</p>${base ? `<span class="ht-mk__bar" style="background:${base}"></span>` : ''}</div>`;
  const phoneHtml = `<div class="ht-mk__phone"><div class="ht-mk__top" style="${fieldStyle(ctx, act, 'site mock-up phone bar')}">${wm(act, 110)}</div><div class="ht-mk__scr"><p class="ht-d ht-mk__h">${ORDER.screen}</p><div class="ht-mk__panel" style="${fieldStyle(ctx, ph, 'site mock-up phone card')}"><p class="ht-k">${ORDER.id}</p><p class="ht-d ht-mk__v">${ORDER.status}</p><p class="ht-k">${ORDER.due}</p><p class="ht-mk__pr num">${ORDER.total}</p></div><p class="ht-mk__btn" style="${fieldStyle(ctx, act, 'site mock-up phone button')}">${ORDER.action}</p></div></div>`;
  return `<div class="ht-mks${spread ? ' ht-mks--sp' : ''}">${fig('ht-mk--card', cardHtml, 'Business card', `90 × 55 mm. The logo reversed on the action colour${rule ? ', with a rule in the accent' : ''}.`)}${fig('ht-mk--sign', signHtml, 'Sign panel', `The logo reversed on the dark field${base ? ', with the accent as its base' : ''}.`)}${fig('ht-mk--phone', phoneHtml, 'Phone screen', '390 px wide. The action colour for the bar and the button, the page ground behind.')}</div>`;
};
// 8.5: the website on a laptop and on a phone, drawn from the palette and the shared sample order
const digitalFigs = (ctx) => {
  const act = actF(ctx), dk = darkF(ctx), geo = 'colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0], ph = L(ctx).sunken;
  const wm = (hex, width) => ctx.logo.html(geo, { width, colourway: 'reversed', color: inkOn(ctx, hex), label: 'Logo' });
  const btn = (c) => `<p class="ht-dg__b" style="${fieldStyle(ctx, c, 'site mock-up website button')}">${ORDER.action}</p>`;
  const hero = (cls) => `<div class="ht-dg__hero ${cls}" style="${fieldStyle(ctx, dk, 'site mock-up website hero')}"><p class="ht-d ht-dg__h">Where is my order?</p><p class="ht-dg__t">${ORDER.id} is packing. ${ORDER.due}.</p>${btn(act)}</div>`;
  const stat = (n, t) => `<div class="ht-dg__st" style="${fieldStyle(ctx, ph, 'site mock-up website stat')}"><p class="ht-d ht-dg__n">${n}</p><p class="ht-dg__t">${t}</p></div>`;
  const laptop = `<div class="ht-lt"><div class="ht-lt__s"><div class="ht-dg__nav" style="${fieldStyle(ctx, act, 'site mock-up website bar')}">${wm(act, 120)}<span class="ht-dg__lk">Orders</span><span class="ht-dg__lk">Help</span></div>${hero('')}<div class="ht-dg__row">${stat('4', 'Open')}${stat('1', 'Late')}${stat('1', 'Closed')}</div></div><div class="ht-lt__base"></div></div>`;
  const phone = `<div class="ht-mk__phone"><div class="ht-mk__top" style="${fieldStyle(ctx, act, 'site mock-up phone bar')}">${wm(act, 110)}</div>${hero('ht-dg__hero--m')}</div>`;
  const fig = (cls, body, t, n) => `<figure class="ht-mk ${cls}">${body}<figcaption><b>${A(t)}</b> ${A(n)}</figcaption></figure>`;
  return `<div class="ht-mks ht-mks--dg">${fig('ht-mk--lt', laptop, 'On a laptop', 'The action colour for the bar and the button, the dark field for the lead.')}${fig('ht-mk--phone', phone, 'On a phone', 'The same lead, one column.')}</div>`;
};

// 5.1 type in use: each step at the size it is specified at, set with the brand's own line, its name and a price
const PRICE = '$84.35';
const typeInUse = (ctx) => {
  const T = ctx.brand.type, B = ctx.brand, step = (t) => T.scale.find((x) => x.token === t), name = B.name || '';
  const line = lead(ctx) || name || 'Headline', body = keep(ctx, B.product) || `${name ? `${name}: ` : ''}order 1042 is packed and due at 11:40 am.`, capt = `Total ${PRICE}`;
  const rows = [['headline', line], ['body', body], ['caption', capt]].map(([t, text]) => [step(t), text]).filter(([x]) => x);
  return { big: line, html: `<ol class="ht-scale">${rows.map(([x, text]) => `<li><p class="ht-k">${A(x.token === 'body' ? 'Paragraph' : cap1(x.token))}<span class="num">${x.size} px, line ${x.line}, ${A(servedFamily(ctx.brand.fonts[x.face]))} ${x.weight}</span></p><p class="ht-scale__s ${x.face === 'display' ? 'ht-d' : ''}" style="font-size:${x.size}px;line-height:${x.line < 3 ? x.line : (x.line / x.size).toFixed(2)};font-weight:${x.weight};${x.face === 'mono' ? 'font-family:var(--mono)' : ''}">${A(text)}</p></li>`).join('')}</ol>` };
};

// ---- figures drawn at the column's own size. Below 1024 a slide is not scaled to the column (its 12 px type would print at 4 px): the two
// slides that carry small type, the clear space and the smallest size, are drawn again here as figures whose type is 14 px, and the
// layouts page shows its slides as specimens that reflow (type in container units, with a 12 px floor). ----
const geoOf = (ctx) => ('colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0]);
// the logo for a ground, in the colourway the brand draws for it (else one colour in the ground's ink), as a share of its container
const logoOn = (ctx, hex, o) => {
  const cw = ctx.brand.logo.colourways, k = cwFor(ctx, hex), own = cw[k] && lower(cw[k].ground) === lower(hex);
  return ctx.logo.html(geoOf(ctx), { ...o, ...(own ? { colourway: k } : {}), color: own ? cw[k].name : inkOn(ctx, hex), label: 'Logo' });
};
// the clear space: the logo and x on every side, x drawn as a square of the action colour in each corner. Every measure is a share of the
// zone, so the figure keeps its proportions at any width.
const zoneFig = (ctx, ground, name, note) => {
  const Lg = ctx.logo, g = Lg.geos.colour || Lg.geos[Lg.versions[0]], u = Lg.geo.unit, zw = g.w + 2 * u, zh = g.h + 2 * u;
  // the squares are the action colour where it shows against the ground (on the dark ground it may be the ground itself): else an accent, else the ground's ink
  const act = [actF(ctx), accentFor(ctx, ground)].find((h) => h && ctx.ratio(h, ground) >= 1.8) || inkOn(ctx, ground);
  const pc = (a, b) => `${((a / b) * 100).toFixed(3)}%`;
  const sq = (r, b) => `<i style="${r ? 'right' : 'left'}:0;${b ? 'bottom' : 'top'}:0;width:${pc(u, zw)};height:${pc(u, zh)};background:${act}"></i>`;
  const label = `The logo on ${name}, with the clear space round it: x is ${clearTimes(Lg.clearShare)} the logo's height`;
  return `<figure class="ht-cs"><div class="ht-cs__z" role="img" aria-label="${A(label)}" style="aspect-ratio:${zw.toFixed(2)}/${zh.toFixed(2)};background:${ground}">${sq(0, 0)}${sq(1, 0)}${sq(0, 1)}${sq(1, 1)}<span class="ht-cs__l" style="left:${pc(u, zw)};top:${pc(u, zh)};width:${pc(g.w, zw)};height:${pc(g.h, zh)}">${logoOn(ctx, ground, { share: g.w / zw })}</span></div><figcaption>${note}</figcaption></figure>`;
};
const clearFig = (ctx) => {
  const cw = ctx.brand.logo.colourways, light = panelF(ctx), dark = cw.reversed && cw.reversed.ground, act = actF(ctx);
  const key = `<span class="ht-cs__sw" style="background:${act}"></span>`;
  return `<div class="ht-css">${zoneFig(ctx, light, 'the light ground', `${key}<b>x</b> is ${clearTimes(ctx.logo.clearShare)} the logo's height, on every side.`)}${dark && lower(dark) !== lower(light) ? zoneFig(ctx, dark, 'the dark ground', 'The same x on the dark ground.') : ''}</div>`;
};
// the smallest size: the logo at the pixels (and, in print, the millimetres) it is specified at, with a ruler its exact width
const sizeFig = (ctx) => {
  const ms = ctx.logo.minSize, cw = ctx.brand.logo.colourways, mmPx = (mm) => (mm * 96) / 25.4;
  const side = (key, big, w, title, note) => {
    const hex = cw[key].ground;
    return `<div class="ht-ms" style="${fieldStyle(ctx, hex, `site smallest size ${title}`)}"><p class="ht-d ht-ms__n">${A(big)}</p><p class="ht-ms__t"><b>${A(title)}</b> ${A(note)}</p><span class="ht-ms__w" style="width:${w.toFixed(1)}px">${ctx.logo.html(geoOf(ctx), { width: w, colourway: key, color: cw[key].name, label: 'Logo' })}<span class="ht-ms__r"></span></span></div>`;
  };
  return `<div class="ht-mss">${side('reversed', `${ms.screenPx} px`, ms.screenPx, 'On screen', `${ms.screenPx} px wide, drawn at 1 px to the pixel.`)}${side('colour', `${ms.printMm} mm`, mmPx(ms.printMm), 'In print', `${ms.printMm} mm wide, drawn at true size at 100%.`)}</div>`;
};
// 6.2: three slides as the deck lays them out, drawn from the shared orders story (the count, the total and the late order are read
// from the same sample the kit's lists use). Each is a 16:9 field whose type is in container units, so it reflows at any width.
const layoutSlides = (ctx) => {
  const S = screenContent(ctx), n = S.deliveries.length, late = S.deliveries.filter((d) => /late/i.test(d.when || '')).length;
  const money = (exampleDemo(ctx).stat || [])[0], dk = darkF(ctx), act = actF(ctx), pn = panelF(ctx);
  const sl = (hex, what, inner, t, d) => `<figure class="ht-slf"><div class="ht-sl" style="${fieldStyle(ctx, hex, `site layout ${what}`)}"><div class="ht-sl__in">${inner}</div></div><figcaption><b>${A(t)}.</b> ${A(d)}</figcaption></figure>`;
  const tally = `${words(n)} orders${late ? `, ${words(late).toLowerCase()} late` : ''}.`;
  const title = sl(dk, 'title', `<div class="ht-sl__lg">${logoOn(ctx, dk, { share: 0.34 })}</div><div><p class="ht-d ht-sl__d">Today's orders</p><p class="ht-sl__k">${A(tally)}</p></div>`, 'Title', 'The logo and the name of the page, on the dark field.');
  const idea = sl(act, 'one idea', `<p class="ht-sl__k">${A(ORDER.screen)}</p><div><p class="ht-d ht-sl__d">${A(ORDER.id)} is packing.</p><p class="ht-sl__k">${A(ORDER.due)}.</p></div>`, 'One idea', 'One line at display size on the action colour.');
  const num = sl(pn, 'number', `<p class="ht-sl__k">${A(money ? 'Taken today' : 'Orders today')}</p><div><p class="ht-d ht-sl__n">${A(money || words(n))}</p><p class="ht-sl__k">${A(tally)}</p></div>`, 'A number', 'One figure from the data, with a line to say what it counts.');
  return `<div class="ht-sls">${title}${idea}${num}</div>`;
};

export const NOTES = {
  intro: (ctx) => { const B = ctx.brand; return { big: lead(ctx), html: p(A(keep(ctx, B.description)), 'ht-lead') + dl([['What it does', A(keep(ctx, B.product))], ['Who it serves', A(B.audience)], ['Where', A(B.city)]]) }; },
  personality: (ctx) => {
    const P = ctx.brand.personality, g = [panelF(ctx), actF(ctx), darkF(ctx)];
    if (!P.length) return NONE;
    const ws = fitSize(ctx, P.map((x) => x.trait), 0.9, 48, 24);
    return { big: `${words(P.length)} traits`, html: fields(ctx, P.map((x, i) => ({ hex: g[i % 3], what: 'site trait field', html: `<p class="ht-field__c">${A(sayOnce(ctx, x.means))}</p><p class="ht-d ht-field__w" style="--ws:${ws}">${A(x.trait)}</p>` })), Math.min(P.length, 3)) };
  },
  // with no principles written, the page still shows the voice at work: two lines written the way the product speaks, and the way it does not
  voice: (ctx) => {
    const P = ctx.brand.voice.principles.filter((x) => ok(ctx, x.title) && ok(ctx, x.example));
    if (P.length) return { big: P[0].example, html: list(P.map((x) => `<b>${A(x.title)}</b>${A(x.example)}`)) };
    return { big: 'Say what happened, then what to do next.', html: pair(VOICE_PAIRS.map(([w, n]) => [A(w), A(n)]), ['Write this', 'Not that']) };
  },
  'write-this': (ctx) => { const W = ctx.brand.voice.writeThis.filter((r) => ok(ctx, r.write) && ok(ctx, r.not) && ok(ctx, r.because)); return W.length ? { big: W[0].write, html: pair(W.map((r) => [A(r.write), `${A(r.not)}<br><span class="ht-field__q">${A(r.because)}</span>`]), ['Write this', 'Not that, and why']) } : NONE; },
  messaging: (ctx) => { const B = ctx.brand, V = B.voice; return { big: lead(ctx), html: list(B.lines.others.filter((t) => ok(ctx, t)).map(A)) + dl([['In 25 words', A(sayOnce(ctx, V.boilerplate25))], ['In 50 words', A(sayOnce(ctx, V.boilerplate50))], ['Writing the name', A(V.nameRules)]]) }; },
  logo: (ctx) => ({ big: ctx.brand.logo.idea || '', html: dl([['Writing the name', A(ctx.brand.voice.nameRules)]]) }),
  'logo-versions': (ctx) => {
    const Lg = ctx.logo, cw = ctx.brand.logo.colourways;
    return { big: `${words(Lg.versions.length)} versions`, html: fields(ctx, Lg.versions.map((id) => { const k = Lg.colourwayOf(id), w = cw[k]; return { hex: w.ground, what: `site logo ${id}`, html: `<div class="ht-field__logo">${Lg.html(id, { width: id === 'symbol' ? 72 : id === 'stacked' ? 120 : 200, colourway: k, color: w.name, label: Lg.labels[id] })}</div><p class="ht-field__c"><b>${A(Lg.labels[id])}</b>${ctx.brand.logo.when[id] ? `<br>${A(ctx.brand.logo.when[id])}` : ''}</p>` }; }), 2) };
  },
  'clear-space': (ctx) => ({ big: `Keep ${clearTimes(ctx.logo.clearShare)} the logo's height clear on every side.`, html: `<div class="ht-nf">${clearFig(ctx)}</div>` + p('The clear space is measured from the logo itself, so it grows and shrinks with it. Nothing else sits inside it: no type, no edge, no other mark.', 'ht-lead') }),
  'min-size': (ctx) => { const ms = ctx.logo.minSize; return { big: `${ms.screenPx} px on screen. ${ms.printMm} mm in print.`, html: `<div class="ht-nf">${sizeFig(ctx)}</div>` + p('Below the smallest size the logo stops reading as one shape. Where a space is smaller, use the symbol.', 'ht-lead') + dl([['On screen', nv(`${ms.screenPx} px`)], ['In print', nv(`${ms.printMm} mm`)]]) }; },
  // the rule is said once, under the tiles: a tile names its ground and, where it differs, its version
  'logo-grounds': (ctx) => ({ big: 'Each ground has one version.', html: groundTiles(ctx) + p('Each tile shows the version drawn for its ground. Where none is drawn, the logo is set in one colour, dark or light, whichever reads on it.') }),
  'logo-misuse': (ctx) => ({ big: 'Use the logo as it is drawn.', html: misuseTiles(ctx) }),
  palette: (ctx) => {
    const cs = distinctColours(ctx).sort((a, b) => (a.role === 'action' ? -1 : b.role === 'action' ? 1 : 0));
    return { big: `${words(cs.length)} colours`, html: fields(ctx, cs.map((c, i) => colourField(ctx, c, true, i)), 3) };
  },
  proportion: (ctx) => {
    const cs = distinctColours(ctx).sort((a, b) => b.share - a.share), ps = pcts(cs);
    return { big: `${ps[0]} ${cs[0].name}`, html: `<div class="ht-stripe" role="img" aria-label="${A(cs.map((c, i) => `${c.name} ${ps[i]}`).join(', '))}">${cs.map((c, i) => `<div style="flex:${c.share};${fieldStyle(ctx, c.hex, `site proportion ${c.name}`)}${lower(c.hex) === lower(L(ctx).surface) ? ';box-shadow:inset 0 0 0 1px var(--h)' : ''}"><span class="num">${ps[i]}</span></div>`).join('')}</div>` + dl(cs.map((c, i) => [c.name, `<span class="num">${ps[i]}</span>. ${A(c.lands || '')}`])) };
  },
  contrast: (ctx) => ({
    big: `${words(ctx.pairs.length)} pairs that pass`,
    html: `<ol class="ht-scale">${ctx.pairs.map((q) => `<li><p class="ht-k">${A(ratioText(q.ratioText))}<span>${q.large ? '24 px and over' : 'Any size'}</span></p><p class="ht-scale__s" style="background:${q.bgHex};color:${q.fgHex};padding:16px 20px;font-size:${q.large ? 24 : 17}px;line-height:1.35;${q.large ? 'font-weight:600;' : ''}${lower(q.bgHex) === lower(L(ctx).surface) ? 'box-shadow:inset 0 0 0 1px var(--h)' : ''}">${A(nameOfHex(ctx, q.fgHex))} on ${A(nameOfHex(ctx, q.bgHex))}. ${A(q.use || '')}</p></li>`).join('')}</ol>`,
  }),
  'colour-values': (ctx) => ({ big: 'Copy the values as written.', html: dl([...distinctColours(ctx), ...ctx.tones].map((c) => [c.name, `<span class="ht-vals">${m(c.hex)}<span class="num">rgb(${ctx.C.hexToRgb(c.hex).join(', ')})</span>${ctx.C.cmykOf(c) ? `<span class="num">${A(ctx.C.cmykOf(c))}</span>` : ''}</span>`])) }),
  typefaces: (ctx) => { const F = ctx.brand.fonts; return { big: F.display.family, html: `<div class="ht-specs">${['display', 'body', 'mono'].map((r) => specimen(ctx, r)).join('')}</div>${p('The mono face is for literal values only: hex codes, sizes in code, file names.')}` }; },
  hierarchy: (ctx) => ({
    big: `${words(ctx.brand.type.scale.length)} steps`,
    html: `<ol class="ht-scale">${ctx.brand.type.scale.map((t) => { const role = t.face === 'display' ? 'ht-d' : ''; return `<li><p class="ht-k">${A(t.token)}<span class="num">${t.size} px, weight ${t.weight}</span></p><p class="ht-scale__s ${role}" style="font-size:min(${t.size}px, 12cqw);line-height:${t.line < 3 ? t.line : (t.line / t.size).toFixed(2)};font-weight:${t.weight};${t.face === 'mono' ? 'font-family:var(--mono)' : ''}">${A(t.use)}</p></li>`; }).join('')}</ol>`,
  }),
  'type-in-use': typeInUse,
  'type-rules': (ctx) => { const R = ctx.brand.type.rules; return R.length ? { big: R[0].do, html: doDont(R) } : NONE; },
  // 6.1: a frame for the photograph the brand has still to choose, with its direction beside it (the brand's own where it wrote one)
  'photo-direction': (ctx) => {
    const D = ctx.brand.imagery.direction, rows = Object.entries(D).filter(([k, v]) => k !== 'subject' && v).map(([k, v]) => [ctx.cap ? ctx.cap(k) : k, A(v)]);
    const frame = `<figure class="ht-pf">${sceneOnPage(ctx, 'A drawn market stall in the brand colours: the direction at 4:3')}<figcaption>The direction at 4:3, drawn in the brand's colours: people at work, close in, with clear sky above for type.</figcaption></figure>`;
    return D.subject || rows.length ? { big: D.subject || '', html: frame + dl(rows) } : { big: PHOTO_BRIEF[0][1], html: frame + dl(PHOTO_BRIEF.map(([k, v]) => [k, A(v)])) };
  },
  // with no shots written there is no list: a row of empty crop-mark frames is not a page
  'shot-list': (ctx) => { const S = ctx.brand.imagery.shots.filter((s) => s.caption || s.alt); return S.length ? { big: `${words(S.length)} shots`, html: list(S.map((s) => `<b>${A(s.caption || s.alt)}</b>${A(s.alt)}${s.credit && !s.generated ? ` Photo: ${A(s.credit)}.` : ''}`)) } : NONE; },
  'imagery-rules': (ctx) => { const R = ctx.brand.imagery.rules; return R.length ? { big: R[0].do, html: doDont(R) } : NONE; },
  // the grid drawn as the page it is for: A4 portrait (794 x 1123 px), its margins, its columns and the gutters between them
  grid: (ctx) => {
    const G = ctx.brand.layout, W = 794, H = 1123, gt = ((G.gutter / (W - 2 * G.margin)) * 100).toFixed(2);
    const fig = `<figure class="ht-gp"><div class="ht-gp__pg" style="aspect-ratio:${W}/${H};padding:${((G.margin / W) * 100).toFixed(2)}%" role="img" aria-label="A4 portrait page with ${G.columns} columns, ${G.margin} px margins and ${G.gutter} px gutters"><div class="ht-gp__in" style="grid-template-columns:repeat(${G.columns},minmax(0,1fr));column-gap:${gt}%">${Array.from({ length: G.columns }, () => '<span></span>').join('')}</div></div><figcaption><b>A4 portrait.</b> ${G.columns} columns, ${nv(`${G.margin} px`)} margins, ${nv(`${G.gutter} px`)} gutters.</figcaption></figure>`;
    return { big: `${G.columns} columns`, html: fig + dl([['Page', 'A4 portrait'], ['Margin', nv(`${G.margin} px`)], ['Columns', `<span class="num">${G.columns}</span>`], ['Gutter', nv(`${G.gutter} px`)], ['Base unit', nv(`${G.base} px`)]]) };
  },
  layouts: (ctx) => ({ big: 'One idea a slide.', html: layoutSlides(ctx) + p(`Every slide carries one thing at display size, a line, a word or a photograph, set on a full field of ${ctx.brand.name ? `${A(ctx.brand.name)}'s` : 'the brand’s'} colours. Everything else is small.`, 'ht-lead') }),
  // 8.1: the card, the sign and the phone screen are drawn here from the palette, so the page shows them, not a list of their words
  'business-card': (ctx) => ({ big: '', html: mockups(ctx) }),
  social: (ctx) => { const S = ctx.brand.applications.social.filter((t) => ok(ctx, t)); return S.length ? { big: S[0], html: list(S.map(A)) } : NONE; },
  // the whole signage string, as the print page's sign carries it; brand copy is never cut at its colon
  signage: (ctx) => ({ big: ctx.brand.applications.signage || '', html: '' }),
  'email-signature': (ctx) => { const E = ctx.brand.applications.email; return { big: E.person || '', html: dl([['Role', A(E.role)], ['Web', m(ctx.brand.applications.site.url)]]) }; },
  // 8.5: the laptop and the phone are drawn here, so they show at every width
  digital: (ctx) => ({ big: ok(ctx, ctx.brand.product) ? ctx.brand.product : ctx.brand.applications.site.url || '', html: digitalFigs(ctx) + dl([['Web', m(ctx.brand.applications.site.url)]]) }),
  // 9.1: the system at work as an applications spread (the colours and the type are on their own pages, so they are not repeated here)
  summary: (ctx) => { const B = ctx.brand; return { big: lead(ctx), html: mockups(ctx, { spread: true }) + dl([['Display', A(faceName(B.fonts.display))], ['Body', A(faceName(B.fonts.body))]]) }; },
  // the version and date alone are not a page: it is built only when the project named who owns the guidelines or how to reach them
  'contact-scope': (ctx) => { const B = ctx.brand; if (!B.contact.owner && !B.contact.email) return NONE; return { big: B.contact.email || '', html: dl([['Owner', A(B.contact.owner)], ['Email', m(B.contact.email)], ['Version', `<span class="num">${A(B.version.number)}</span>`], ['Issued', A(ctx.versionLine)]]) }; },
};
