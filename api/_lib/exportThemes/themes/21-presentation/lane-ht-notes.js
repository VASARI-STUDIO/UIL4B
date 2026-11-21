// Lane ht: the notes under each slide of the guidelines site. A deck published to the web keeps its speaker notes: here they are
// the page's rules as readable text, so the guidelines work on a phone where the slide is only a picture. Each page gets one big
// line (the slide's one idea, in words) and its notes; brand copy is printed whole, every value is read from ctx.
// The notes are drawn from the site's context (lane-ht-clean.js): a value the project has not written is an empty string there, and an
// empty value is a line, a row or a block that is not printed.
import { A, L, lower, nameOfHex, fieldStyle, darkF, actF, panelF, fitSize, words, inkOn, cwFor, byRole } from './lane-ht-lib.js';
import { onceRe, sayOnce } from './lane-g3-kit.js';
import { distinctColours, servedFamily, standInNote, ratioText } from './helpers.js';

// A brand that says one word once (Long Room: "Say free once") prints it on the slide and nowhere else: these notes leave it off, as the print pages do.
const ok = (ctx, t) => { const re = onceRe(ctx); return !!t && !(re && re.test(t)); };
const keep = (ctx, t) => (ok(ctx, t) ? t : '');
// the one line a page leads with: the primary line, or the brand's next line where the primary line carries the word, else the name (or nothing)
const lead = (ctx) => { const B = ctx.brand; return ok(ctx, B.lines.primary) ? B.lines.primary : (B.lines.others.find((t) => ok(ctx, t)) || B.name || ''); };
const NONE = { big: '', html: '' };

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
// a face by its brand name, and where the page is set in a stand-in, the face it is shown in
const faceName = (F) => (servedFamily(F) !== F.family ? `${F.family}, shown here in ${servedFamily(F)}` : F.family);
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
const colourField = (ctx, c, full = false) => ({
  hex: c.hex, what: `site colour ${c.name}`, size: 24,
  html: `<p class="ht-d ht-field__w" style="--ws:clamp(24px, 10cqw, 36px)">${A(c.name)}</p><p class="ht-field__c">${A(c.lands || '')}<span class="ht-m">${A(c.hex)}</span>${full ? `<span class="ht-m">rgb(${ctx.C.hexToRgb(c.hex).join(', ')})</span><span class="ht-field__r">The ${A(c.roleText || c.role)} colour.</span>` : ''}</p>`,
});

// 3.5: one tile per colour the brand has, each filled with the colour it names and showing the version of the logo that goes on it,
// then a tile for a photograph (a calm part of the picture takes the reversed logo)
const cwCaption = (cw, k, ctx, hex) => {
  if (cw[k] && lower(cw[k].ground) === lower(hex)) return k === 'colour' ? 'Full-colour logo' : k === 'reversed' ? 'Reversed logo' : `${cap1(k.replace(/-/g, ' '))} logo`;
  return lower(inkOn(ctx, hex)) === lower(L(ctx).text) ? 'One-colour logo, in the dark text colour' : 'One-colour logo, in the light ground colour';
};
const groundTiles = (ctx) => {
  const cw = ctx.brand.logo.colourways, geo = 'colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0], dk = darkF(ctx);
  const tiles = distinctColours(ctx).slice(0, 5).map((c) => {
    const k = cwFor(ctx, c.hex), own = cw[k] && lower(cw[k].ground) === lower(c.hex), ink = own ? cw[k].name : inkOn(ctx, c.hex);
    return { hex: c.hex, what: `site logo ground ${c.name}`, html: `<div class="ht-field__logo">${ctx.logo.html(geo, { width: 180, ...(own ? { colourway: k } : {}), color: ink, label: 'Logo' })}</div><p class="ht-field__c"><b>${A(c.name)}</b><br>${A(cwCaption(cw, k, ctx, c.hex))}</p>` };
  });
  const ink = inkOn(ctx, dk);
  tiles.push({ hex: dk, what: 'site logo ground photo', html: `<span class="ht-field__ph" style="background:${actF(ctx)}"></span><div class="ht-field__logo">${ctx.logo.html(geo, { width: 180, colourway: 'reversed', color: ink, label: 'Logo' })}</div><p class="ht-field__c"><b>On a photo</b><br>Reversed logo, on the calmest part of the picture.</p>` });
  return fields(ctx, tiles, 3);
};

// 5.1: each face as a specimen: its "Aa" large, the alphabet and figures, then up to three of its weights
const SPEC_ROLE = { display: ['Display', 'var(--disp)', 'ht-d'], body: ['Body', 'var(--body)', ''], mono: ['Mono', 'var(--mono)', ''] };
const spread3 = (w) => (w.length <= 3 ? w : [w[0], w[Math.floor(w.length / 2)], w[w.length - 1]]);
const specimen = (ctx, role) => {
  const F = ctx.brand.fonts[role], [label, fam, cls] = SPEC_ROLE[role], ws = spread3(F.weights), last = F.weights[F.weights.length - 1];
  const wt = (w) => `font-weight:${w}`;
  return `<section class="ht-spec" aria-label="${label}"><div class="ht-spec__h"><p class="ht-k">${label}</p><p class="ht-spec__n">${A(faceName(F))}</p><p class="ht-m">${F.weights.join(', ')}</p></div><div class="ht-spec__s"><p class="ht-spec__aa ${cls}" style="font-family:${fam};${wt(role === 'display' ? last : F.weights.includes(400) ? 400 : F.weights[0])}" aria-hidden="true">Aa</p><p class="ht-spec__g ${cls}" style="font-family:${fam};${wt(role === 'display' ? last : 400)}">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p><ul class="ht-spec__w">${ws.map((w) => `<li class="${cls}" style="font-family:${fam};${wt(w)}"><span>Aa Bb Cc 123</span><span class="ht-m">${w}</span></li>`).join('')}</ul></div></section>`;
};

// 8.1: the applications as they would be made, drawn from the palette and the name: a 90 x 55 mm card, a sign panel, a phone screen
const mockups = (ctx) => {
  const B = ctx.brand, A_ = B.applications, act = actF(ctx), dk = darkF(ctx), geo = 'colour' in ctx.logo.geos ? 'colour' : ctx.logo.versions[0];
  const accent = (byRole(ctx, 'accent') || {}).hex || L(ctx).accent || act, ph = L(ctx).sunken;
  const wm = (hex, width) => ctx.logo.html(geo, { width, colourway: 'reversed', color: inkOn(ctx, hex), label: 'Logo' });
  const card = A_.card || {}, sign = A_.signage || '', who = [card.person, card.role].filter(Boolean), contact = [card.contact].filter(Boolean);
  const fig = (cls, body, t, n) => `<figure class="ht-mk ${cls}">${body}<figcaption><b>${A(t)}</b> ${A(n)}</figcaption></figure>`;
  const cardHtml = `<div class="ht-mk__card" style="${fieldStyle(ctx, act, 'site mock-up card')}"><div class="ht-mk__logo">${wm(act, 150)}</div><span class="ht-mk__rule" style="background:${accent}"></span>${who.length || contact.length ? `<p class="ht-mk__p">${[...who, ...contact].map(A).join('<br>')}</p>` : ''}</div>`;
  const signHtml = `<div class="ht-mk__sign" style="${fieldStyle(ctx, dk, 'site mock-up sign')}"><div class="ht-mk__logo">${wm(dk, 170)}</div>${sign ? `<p class="ht-d ht-mk__line">${A(sign)}</p>` : ''}<span class="ht-mk__bar" style="background:${accent}"></span></div>`;
  const phoneHtml = `<div class="ht-mk__phone"><div class="ht-mk__top" style="${fieldStyle(ctx, act, 'site mock-up phone bar')}">${wm(act, 110)}</div><div class="ht-mk__scr"><p class="ht-d ht-mk__h">Overview</p><div class="ht-mk__panel" style="${fieldStyle(ctx, ph, 'site mock-up phone card')}"><p class="ht-k">Items done</p><p class="ht-d ht-mk__v">12</p><p class="ht-k">Total</p><p class="ht-mk__pr">$24.50</p></div><p class="ht-mk__btn" style="${fieldStyle(ctx, act, 'site mock-up phone button')}">View order</p></div></div>`;
  return `<div class="ht-mks">${fig('ht-mk--card', cardHtml, 'Business card', '90 × 55 mm. The logo reversed on the action colour, with a rule in the accent.')}${fig('ht-mk--sign', signHtml, 'Sign panel', 'The logo reversed on the dark field, with the accent as its base.')}${fig('ht-mk--phone', phoneHtml, 'Phone screen', '390 px wide. The action colour for the bar and the button, the page ground behind.')}</div>`;
};

// 5.1 type in use: each step at the size it is specified at, set with the brand's own line, its name and a price
const PRICE = '$24.50';
const typeInUse = (ctx) => {
  const T = ctx.brand.type, B = ctx.brand, step = (t) => T.scale.find((x) => x.token === t), name = B.name || '';
  const line = lead(ctx) || name || 'Headline', body = keep(ctx, B.product) || `${name ? `${name}: ` : ''}your order of 3 items is on its way.`, capt = `Total ${PRICE}`;
  const rows = [['headline', line], ['body', body], ['caption', capt]].map(([t, text]) => [step(t), text]).filter(([x]) => x);
  return { big: line, html: `<ol class="ht-scale">${rows.map(([x, text]) => `<li><p class="ht-k">${A(x.token === 'body' ? 'Paragraph' : cap1(x.token))}<span class="num">${x.size} px, line ${x.line}, ${A(servedFamily(ctx.brand.fonts[x.face]))} ${x.weight}</span></p><p class="ht-scale__s ${x.face === 'display' ? 'ht-d' : ''}" style="font-size:${x.size}px;line-height:${x.line < 3 ? x.line : (x.line / x.size).toFixed(2)};font-weight:${x.weight};${x.face === 'mono' ? 'font-family:var(--mono)' : ''}">${A(text)}</p></li>`).join('')}</ol>` };
};

export const NOTES = {
  intro: (ctx) => { const B = ctx.brand; return { big: lead(ctx), html: p(A(keep(ctx, B.description)), 'ht-lead') + dl([['What it does', A(keep(ctx, B.product))], ['Who it serves', A(B.audience)], ['Where', A(B.city)]]) }; },
  personality: (ctx) => {
    const P = ctx.brand.personality, g = [panelF(ctx), actF(ctx), darkF(ctx)];
    if (!P.length) return NONE;
    const ws = fitSize(ctx, P.map((x) => x.trait), 0.9, 48, 24);
    return { big: `${words(P.length)} traits`, html: fields(ctx, P.map((x, i) => ({ hex: g[i % 3], what: 'site trait field', html: `<p class="ht-field__c">${A(sayOnce(ctx, x.means))}</p><p class="ht-d ht-field__w" style="--ws:${ws}">${A(x.trait)}</p>` })), Math.min(P.length, 3)) };
  },
  voice: (ctx) => { const P = ctx.brand.voice.principles.filter((x) => ok(ctx, x.title) && ok(ctx, x.example)); return P.length ? { big: P[0].example, html: list(P.map((x) => `<b>${A(x.title)}</b>${A(x.example)}`)) } : NONE; },
  'write-this': (ctx) => { const W = ctx.brand.voice.writeThis.filter((r) => ok(ctx, r.write) && ok(ctx, r.not) && ok(ctx, r.because)); return W.length ? { big: W[0].write, html: pair(W.map((r) => [A(r.write), `${A(r.not)}<br><span class="ht-field__q">${A(r.because)}</span>`]), ['Write this', 'Not that, and why']) } : NONE; },
  messaging: (ctx) => { const B = ctx.brand, V = B.voice; return { big: lead(ctx), html: list(B.lines.others.filter((t) => ok(ctx, t)).map(A)) + dl([['In 25 words', A(sayOnce(ctx, V.boilerplate25))], ['In 50 words', A(sayOnce(ctx, V.boilerplate50))], ['Writing the name', A(V.nameRules)]]) }; },
  logo: (ctx) => ({ big: ctx.brand.logo.idea || '', html: dl([['Writing the name', A(ctx.brand.voice.nameRules)]]) }),
  'logo-versions': (ctx) => {
    const Lg = ctx.logo, cw = ctx.brand.logo.colourways;
    return { big: `${words(Lg.versions.length)} versions`, html: fields(ctx, Lg.versions.map((id) => { const w = cw[Lg.colourwayOf(id)]; return { hex: w.ground, what: `site logo ${id}`, html: `<div class="ht-field__logo">${Lg.html(id, { width: id === 'symbol' ? 72 : 200, label: Lg.labels[id] })}</div><p class="ht-field__c"><b>${A(Lg.labels[id])}</b>${ctx.brand.logo.when[id] ? `<br>${A(ctx.brand.logo.when[id])}` : ''}</p>` }; }), 2) };
  },
  'clear-space': (ctx) => ({ big: `Keep ${ctx.logo.clearShare}% of the logo's height clear on every side.`, html: p('The clear space is measured from the logo itself, so it grows and shrinks with it. Nothing else sits inside it: no type, no edge, no other mark.', 'ht-lead') }),
  'min-size': (ctx) => { const ms = ctx.logo.minSize; return { big: `${ms.screenPx} px on screen. ${ms.printMm} mm in print.`, html: p('Below the smallest size the logo stops reading as one shape. Where a space is smaller, use the symbol.', 'ht-lead') + dl([['On screen', m(`${ms.screenPx} px`)], ['In print', m(`${ms.printMm} mm`)]]) }; },
  'logo-grounds': (ctx) => ({ big: 'Each ground has one version.', html: groundTiles(ctx) }),
  'logo-misuse': (ctx) => ({ big: 'Use the logo as it is drawn.', html: misuseTiles(ctx) }),
  palette: (ctx) => {
    const cs = distinctColours(ctx).sort((a, b) => (a.role === 'action' ? -1 : b.role === 'action' ? 1 : 0));
    return { big: `${words(cs.length)} colours`, html: fields(ctx, cs.map((c) => colourField(ctx, c, true)), 3) };
  },
  proportion: (ctx) => {
    const cs = distinctColours(ctx).sort((a, b) => b.share - a.share), ps = pcts(cs);
    return { big: `${ps[0]} ${cs[0].name}`, html: `<div class="ht-stripe" role="img" aria-label="${A(cs.map((c, i) => `${c.name} ${ps[i]}`).join(', '))}">${cs.map((c, i) => `<div style="flex:${c.share};${fieldStyle(ctx, c.hex, `site proportion ${c.name}`)}${lower(c.hex) === lower(L(ctx).surface) ? ';box-shadow:inset 0 0 0 1px var(--h)' : ''}"><span class="num">${ps[i]}</span></div>`).join('')}</div>` + dl(cs.map((c, i) => [c.name, `<span class="num">${ps[i]}</span>. ${A(c.lands || '')}`])) };
  },
  contrast: (ctx) => ({
    big: `${words(ctx.pairs.length)} pairs that pass`,
    html: `<ol class="ht-scale">${ctx.pairs.map((q) => `<li><p class="ht-k">${A(ratioText(q.ratioText))}<span>${q.large ? '24 px and over' : 'Any size'}</span></p><p class="ht-scale__s" style="background:${q.bgHex};color:${q.fgHex};padding:16px 20px;font-size:${q.large ? 24 : 17}px;line-height:1.35;${q.large ? 'font-weight:600;' : ''}${lower(q.bgHex) === lower(L(ctx).surface) ? 'box-shadow:inset 0 0 0 1px var(--h)' : ''}">${A(nameOfHex(ctx, q.fgHex))} on ${A(nameOfHex(ctx, q.bgHex))}. ${A(q.use || '')}</p></li>`).join('')}</ol>`,
  }),
  'colour-values': (ctx) => ({ big: 'Copy the values as written.', html: dl([...distinctColours(ctx), ...ctx.tones].map((c) => [c.name, `${m(c.hex)} ${m(`rgb(${ctx.C.hexToRgb(c.hex).join(', ')})`)}${ctx.C.cmykOf(c) ? ` ${m(ctx.C.cmykOf(c))}` : ''}`])) }),
  typefaces: (ctx) => { const F = ctx.brand.fonts, sn = [...new Set(['display', 'body', 'mono'].map((r) => standInNote(F[r])).filter(Boolean))].join(' '); return { big: F.display.family, html: `<div class="ht-specs">${['display', 'body', 'mono'].map((r) => specimen(ctx, r)).join('')}</div>${p(A(`${sn}${sn ? ' ' : ''}The mono face is for literal values only.`))}` }; },
  hierarchy: (ctx) => ({
    big: `${words(ctx.brand.type.scale.length)} steps`,
    html: `<ol class="ht-scale">${ctx.brand.type.scale.map((t) => { const role = t.face === 'display' ? 'ht-d' : ''; return `<li><p class="ht-k">${A(t.token)}<span class="num">${t.size} px, weight ${t.weight}</span></p><p class="ht-scale__s ${role}" style="font-size:min(${t.size}px, 12cqw);line-height:${t.line < 3 ? t.line : (t.line / t.size).toFixed(2)};font-weight:${t.weight};${t.face === 'mono' ? 'font-family:var(--mono)' : ''}">${A(t.use)}</p></li>`; }).join('')}</ol>`,
  }),
  'type-in-use': typeInUse,
  'type-rules': (ctx) => { const R = ctx.brand.type.rules; return R.length ? { big: R[0].do, html: doDont(R) } : NONE; },
  'photo-direction': (ctx) => { const D = ctx.brand.imagery.direction; return { big: D.subject || '', html: dl(Object.entries(D).filter(([k]) => k !== 'subject').map(([k, v]) => [ctx.cap ? ctx.cap(k) : k, A(v)])) }; },
  'shot-list': (ctx) => { const S = ctx.brand.imagery.shots; return S.length ? { big: `${words(S.length)} shots`, html: list(S.map((s) => `<b>${A(s.caption || s.alt)}</b>${A(s.alt)}${s.credit && !s.generated ? ` Photo: ${A(s.credit)}.` : ''}`)) } : NONE; },
  'imagery-rules': (ctx) => { const R = ctx.brand.imagery.rules; return R.length ? { big: R[0].do, html: doDont(R) } : NONE; },
  grid: (ctx) => { const G = ctx.brand.layout; return { big: `${G.columns} columns`, html: dl([['Page', m(`${G.page.w} × ${G.page.h} px`)], ['Margin', m(`${G.margin} px`)], ['Columns', `<span class="num">${G.columns}</span>`], ['Gutter', m(`${G.gutter} px`)], ['Base unit', m(`${G.base} px`)]]) }; },
  layouts: (ctx) => ({ big: 'One idea a slide.', html: p(`Every slide carries one thing at display size, a line, a word or a photograph, set on a full field of ${ctx.brand.name ? `${A(ctx.brand.name)}'s` : 'the brand’s'} colours. Everything else is small.`, 'ht-lead') }),
  // 8.1: the card, the sign and the phone screen are drawn here from the palette, so the page shows them, not a list of their words
  'business-card': (ctx) => ({ big: '', html: mockups(ctx) }),
  social: (ctx) => { const S = ctx.brand.applications.social.filter((t) => ok(ctx, t)); return S.length ? { big: S[0], html: list(S.map(A)) } : NONE; },
  // the whole signage string, as the print page's sign carries it; brand copy is never cut at its colon
  signage: (ctx) => ({ big: ctx.brand.applications.signage || '', html: '' }),
  'email-signature': (ctx) => { const E = ctx.brand.applications.email; return { big: E.person || '', html: dl([['Role', A(E.role)], ['Web', m(ctx.brand.applications.site.url)]]) }; },
  digital: (ctx) => ({ big: ok(ctx, ctx.brand.product) ? ctx.brand.product : ctx.brand.applications.site.url || '', html: dl([['Web', m(ctx.brand.applications.site.url)]]) }),
  summary: (ctx) => { const B = ctx.brand; return { big: lead(ctx), html: fields(ctx, distinctColours(ctx).map((c) => colourField(ctx, c)), 2) + dl([['Display', A(faceName(B.fonts.display))], ['Body', A(faceName(B.fonts.body))]]) }; },
  'contact-scope': (ctx) => { const B = ctx.brand; return { big: B.contact.email || '', html: dl([['Owner', A(B.contact.owner)], ['Email', m(B.contact.email)], ['Version', `<span class="num">${A(B.version.number)}</span>`], ['Issued', A(ctx.versionLine)]]) }; },
};
