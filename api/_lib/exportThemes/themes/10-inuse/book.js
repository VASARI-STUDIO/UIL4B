// Brand book markup for theme 10 (In use): nine sections. The product on a phone with numbered notes beside what they point at,
// Chalk ground, one Float panel behind the opening phone, a round numbered marker for every section.
// Every section that has a subject uses the same device: a phone (or a phone-sized screen) on one side, a numbered key on the other.
// The engine wraps these in the shell (skip link, section nav, light and dark switch) and adds the behaviour.
// Copy, the type tester and the downloads read data attributes the engine script understands: data-copy, data-tester-*.
// Phone text that is not in brand data (the Done screen, the week) is the approved copy from the T10 boards.
import { A, fit, wordsHex } from './helpers.js';

const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
const hairlineOn = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();

// a copy button: visible text is the action, the accessible name says what it copies
const copyBtn = (text, value, what, cls = '') => `<button type="button" class="bk-btn ${cls}" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(text + ' ' + what)}"><span class="bk-btn__t">${A(text)}</span></button>`;
const head = (id, title, lead, tag = 'h2') => `<div class="bk-head"><${tag} class="bk-title" id="h-${id}"><span class="bk-mk" aria-hidden="true"></span>${A(title)}</${tag}>${lead ? `<p class="bk-lead">${lead}</p>` : ''}</div>`;
const sub = (t) => `<h3 class="bk-h3">${A(t)}</h3>`;
const dl = (f, label) => (f ? `<a class="bk-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(f.ext)}</a>` : '');
const rulesList = (rules) => `<ul class="bk-rules">${rules.map((r) => `<li><p class="bk-do"><b>Do</b>${A(r.do)}</p><p class="bk-dont"><b>Don't</b>${A(r.dont)}</p></li>`).join('')}</ul>`;
const sec = (id, cls, inner) => `<section class="bk-sec ${cls}" id="${id}" aria-labelledby="h-${id}">${inner}</section>`;

// ---- the phone: a 360 wide screen from the brand's own screens, light roles always (it is the product, not the book's chrome) ----
const chipOf = (ctx, id) => { const s = ctx.status.find((x) => x.id === id) || ctx.status[0]; return `<span class="bk-chip" style="color:${wordsHex(ctx, s)}">${A(s.label)}</span>`; };
const floatChip = (text, style = '') => `<span class="bk-chip bk-chip--float" style="${style}">${A(text)}</span>`;
const mkr = (n) => `<span class="bk-mkr" aria-hidden="true">${n}</span>`;
// a note marker beside the phone: solid when the thing is on the screen, hollow when it is not
const keyMk = (n, on = true) => `<span class="bk-mkr bk-mkr--n${on ? '' : ' bk-mkr--o'}" aria-hidden="true">${n}</span>`;
// a ratio flag on the phone: the pair's number and its measured ratio
const flag = (n, ratio) => `<span class="bk-mkr bk-flag" aria-hidden="true">${n}<em>${A(ratio)}</em></span>`;
const phoneRaw = (label, inner, cls = '', style = '') => `<div class="bk-phone ${cls}" role="img" aria-label="${A(label)}"${style ? ` style="${style}"` : ''}>${inner}</div>`;
const phone = (label, time, body, foot = '') => phoneRaw(label, `<div class="bk-phone__sb">${A(time)}</div><div class="bk-phone__b">${body}</div>${foot}`);
// the Today screen: status, the one line a parent needs, the pool with their lane in it, the teacher
function phoneToday(ctx) {
  const S = ctx.brand.ui.screen.content;
  const lanes = [84, 150, 216, 282].map((x) => `<i style="left:${(x / 360 * 100).toFixed(2)}%"></i>`).join('');
  return phone(`${ctx.brand.name} Today screen: ${S.status}. ${S.eta}. ${S.rider}, ${S.riderNote}.`, S.time,
    `${chipOf(ctx, 'booked')}<p class="bk-phone__t">${A(S.eta)}</p><div class="bk-pool">${lanes}${floatChip(S.to)}</div><div class="bk-teach"><span class="bk-av">${A(S.initials)}</span><div><b>${A(S.rider.split(',')[0])}</b><span>${A(S.riderNote)}</span></div></div>`, `<div class="bk-phone__ft"><span class="bk-pbtn">${A(S.share)}</span></div>`);
}
// the Done screen. `m` names the markers drawn on it (a note number, a hollow number or a ratio flag): chip, head, para, card, label, fl, foot, btn
function phoneDone(ctx, m = {}) {
  const S = ctx.brand.ui.screen.content;
  return phone(`${ctx.brand.name} lesson done screen: Lesson done, Mia floated alone, next lesson Tuesday 4:15, Pool 2, lane 3.`, '4:52',
    `<div class="bk-m">${chipOf(ctx, 'done')}${m.chip || ''}</div><div class="bk-m"><p class="bk-phone__t">Mia floated<br>alone.</p>${m.head || ''}</div><div class="bk-m"><p class="bk-phone__p">Ten seconds on her back, no noodle.</p>${m.para || ''}</div>
<div class="bk-pcard"><span class="bk-pcard__l">Next lesson${m.label || ''}</span><b class="bk-disp">Tue 4:15, Pool 2</b><div class="bk-m">${floatChip(S.to)}${m.fl || ''}</div>${m.card || ''}</div>`,
    `<div class="bk-phone__ft"><span class="bk-pbtn">See her progress</span><span class="bk-pbtn bk-pbtn--go bk-m">Book next term${m.btn || ''}</span></div>${m.foot || ''}`);
}
// the week: days, two lessons with their lanes, one button
function phoneWeek(ctx) {
  const S = ctx.brand.ui.screen.content;
  const day = (d, l, m) => (l
    ? `<div class="bk-day bk-day--ls"><b>${d}</b><div class="bk-ls"><div><b>${A(l[0])}${m ? mkr(m[0]) : ''}</b><i>${A(l[1])}</i></div><span class="bk-m">${floatChip(l[2])}${m ? mkr(m[1]) : ''}</span></div></div>`
    : `<div class="bk-day"><b>${d}</b><i>Nothing booked</i></div>`);
  return phone(`${ctx.brand.name} week screen: two lessons this week, Tuesday and Thursday, both after school.`, '8:05',
    `<p class="bk-phone__t bk-phone__t--s">This week</p><p class="bk-phone__s">Two lessons, both after school</p>
<div class="bk-days">${day('Mon')}${day('Tue', ['Mia, Seal', '4:15 pm, Pool 2', S.to], [1, 2])}${day('Wed')}${day('Thu', ['Leo, Tadpole', '5:00 pm, Pool 1', 'Lane 1'])}${day('Fri')}</div>`,
    `<div class="bk-phone__ft"><span class="bk-pbtn bk-m">${A(S.share)}${mkr(3)}</span></div>`);
}
// numbered notes beside a phone: the marker, a bold line, a sentence
const notes = (items) => `<ol class="bk-notes">${items.map(([t, s, sw], i) => `<li>${keyMk(i + 1)}<div><b>${A(t)}${sw ? `<i class="bk-notes__sw${sw[1] ? ' is-hair' : ''}" style="background:${sw[0]}" aria-hidden="true"></i>` : ''}</b><p>${A(s)}</p></div></li>`).join('')}</ol>`;

function overview(ctx) {
  const B = ctx.brand;
  const s = ctx.shot('pool-door');
  return sec('overview', 'bk-sec--overview', `
<div class="bk-open">
<div class="bk-hero"><h1 class="disp bk-h1" id="h-overview">${A(B.lines.primary)}</h1><p class="bk-cap">${A(B.name)} brand book. ${A(ctx.versionLine)}.</p>
<p class="bk-lead">${A(B.description)}</p>
<div class="bk-stack"><div>${sub('What it does')}<p class="bk-body">${A(B.product)}</p></div><div>${sub('Who it serves')}<p class="bk-body">${A(B.audience)}</p></div></div></div>
<div class="bk-stripe"><div class="bk-stripe__in">${phoneToday(ctx)}<p class="bk-pnote"><b>Today, 3:58 pm</b>Mia's lesson starts in 17 minutes. The app leads with her lane, so a parent at the pool door knows where to go.</p></div></div>
</div>
<ul class="bk-traits">${B.personality.map((p, i) => `<li>${keyMk(i + 1)}<div><p class="bk-trait">${A(p.trait)}</p><p class="bk-body">${A(p.means)}</p></div></li>`).join('')}</ul>
<figure class="bk-wide">${ctx.photo('pool-door', { cls: 'bk-pho bk-pho--wide', pos: '50% 40%' })}<figcaption class="cap">${A(s.caption || 'Art-directed slot: the shot, the crop and the light.')}</figcaption></figure>`);
}

function voice(ctx) {
  const B = ctx.brand, V = B.voice;
  const lines = [B.lines.primary, ...B.lines.others];
  return sec('voice', 'bk-sec--voice', `
${head('voice', 'Voice', 'Four rules for how we write, each with a line from the brand.')}
<ol class="bk-principles">${V.principles.map((p, i) => `<li>${keyMk(i + 1)}<p class="bk-pt">${A(p.title)}</p><p class="bk-pe">${A(p.example)}</p></li>`).join('')}</ol>
<div class="bk-block">${sub('Lines in use')}<ul class="bk-lines">${lines.map((l) => `<li class="disp">${A(l)}</li>`).join('')}</ul></div>
<div class="bk-block">${sub('Write this, not that')}
<ol class="bk-wtn" aria-label="Write this, not that">
${V.writeThis.map((r, i) => `<li class="bk-wtn__r">${keyMk(i + 1)}<div class="bk-wtn__p"><p class="w"><b>Write this</b>${A(r.write)}</p><p class="n"><b>Not that</b><s>${A(r.not)}</s></p></div><p class="b"><b>Because</b>${A(r.because)}</p></li>`).join('')}
</ol></div>
<div class="bk-block bk-two bk-two--even">
<div>${sub('The brand in 25 words')}<p class="bk-body">${A(V.boilerplate25)}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}</div>
<div>${sub('The brand in 50 words')}<p class="bk-body">${A(V.boilerplate50)}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}</div>
</div>
<div class="bk-block">${sub('Writing the name')}<p class="bk-body bk-measure">${A(V.nameRules)}</p></div>`);
}

// the logo in use: an app icon on a home screen, the splash screen, the app header
function logoPhones(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, rev = cw.reversed, S = B.ui.screen.content;
  const blank = '<i class="bk-hs__b"></i>';
  const icon = `<span class="bk-hs__i" style="background:${cw['on-float'].ground}">${L.html('symbol', { colourway: 'on-float', width: 34, label: 'Logo' })}${mkr(1)}</span>`;
  const slots = Array.from({ length: 20 }, (_, i) => (i === 5 ? icon : blank)).join('');
  const home = phoneRaw(`${B.name} app icon on a phone home screen, among other apps.`, `<div class="bk-phone__sb">${A(S.time)}</div><div class="bk-hs">${slots}</div>`);
  const splash = phoneRaw(`${B.name} splash screen: the reversed logo on Deep end.`, `<div class="bk-phone__sb">${A(S.time)}</div><div class="bk-splash">${L.html('reversed', { width: 190, color: rev.name, label: 'Your logo goes here' })}${mkr(2)}</div>`, 'bk-phone--splash', `background:${rev.ground};color:${rev.name}`);
  const lanes = [84, 150, 216, 282].map((x) => `<i style="left:${(x / 360 * 100).toFixed(2)}%"></i>`).join('');
  const header = phoneRaw(`${B.name} app header: the horizontal logo above the Today screen.`, `<div class="bk-phone__sb">${A(S.time)}</div><div class="bk-hdr">${L.html('horizontal', { width: 124, label: 'Logo' })}${mkr(3)}</div><div class="bk-phone__b">${chipOf(ctx, 'booked')}<p class="bk-phone__t">${A(S.eta)}</p><div class="bk-pool">${lanes}${floatChip(S.to)}</div></div>`);
  const fig = (ph, n, title, when) => `<figure class="bk-lph"><div class="bk-lph__p">${ph}</div><figcaption class="bk-lnote">${keyMk(n)}<div><b>${A(title)}</b><p>${A(when)}</p></div></figcaption></figure>`;
  const w = B.logo.when;
  return `<div class="bk-lphs">${fig(home, 1, 'App icon on a home screen', w.symbol)}${fig(splash, 2, 'Splash screen', w.reversed)}${fig(header, 3, 'App header', w.horizontal)}</div>`;
}

function logo(ctx) {
  const B = ctx.brand, L = ctx.logo, cw = B.logo.colourways, slot = ctx.edition === 'slot';
  const cells = [['colour', [220, 100]], ['mono-dark', [200, 84]], ['mono-light', [200, 84]], ['reversed', [200, 84]], ['symbol', [60, 70]], ['horizontal', [230, 70]], ['stacked', [130, 100]]];
  const row = ([id, box]) => {
    const w = cw[L.colourwayOf(id)], files = ctx.book.logo(id), name = `${L.labels[id]} logo`;
    const links = slot ? '' : `<span class="bk-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide')}</span>`;
    return `<li class="bk-tile"><div class="bk-ground${hairlineOn(ctx, w.ground) ? ' is-hair' : ''}" style="background:${w.ground}">${L.html(id, { width: fit(ctx, id, ...box), color: w.name, label: L.labels[id] })}</div><div class="bk-capt"><span><b>${A(L.labels[id])}</b>${A(B.logo.when[id])}</span>${links}</div></li>`;
  };
  const g = L.geo, pad = Math.round((420 * g.height / g.width) * L.clearShare / 100);
  const ms = L.minSize;
  const minBlock = slot
    ? `<p class="bk-body">Set the smallest size once the logo is in place. Below that size the rope and the name stop reading as one mark.</p>`
    : `<div class="bk-min"><div class="bk-min__logo">${L.html('colour', { width: ms.screenPx })}</div><p class="bk-body">${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.</p></div>`;
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not cut, recolour or recount the dashes of the rope.', 'Do not set the name without its rope, or the rope alone.', 'Do not add shadows, glows or other effects.', 'Do not set it over lane ropes or splashing water.'];
  const dlSlot = slot ? `<p class="bk-body bk-measure bk-slotnote">This book has no logo files yet. The frames above hold the place and the proportion. The brand kit's logo folder says where the approved files go.</p>` : '';
  return sec('logo', 'bk-sec--logo', `
${head('logo', 'Logo', `${A(B.logo.idea)}`)}
${logoPhones(ctx)}
<div class="bk-block">${sub('Versions')}<ul class="bk-tiles">${cells.map(row).join('')}</ul>${dlSlot}</div>
<div class="bk-block"><ol class="bk-figs">
<li>${keyMk(1)}<div class="bk-fig"><div class="bk-clear" style="padding:${pad}px"><div style="width:${420}px;max-width:100%">${L.html('colour', { width: 420 })}</div></div></div><div>${sub('Clear space')}<p class="bk-body">Keep ${L.clearShare}% of the logo's height clear on every side.</p></div></li>
<li>${keyMk(2)}<div class="bk-fig"><div class="bk-min__logo">${L.html('colour', { width: ms.screenPx, label: 'Logo' })}</div></div><div>${sub('Smallest size')}${slot ? minBlock : `<p class="bk-body">${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.</p>`}</div></li>
</ol></div>
<div class="bk-block">${sub('Never')}<ol class="bk-never">${misuse.map((m, i) => `<li>${keyMk(i + 1, false)}<span>${A(m)}</span></li>`).join('')}</ol></div>`);
}

function colour(ctx) {
  const B = ctx.brand;
  const col = (id) => ctx.colours.find((c) => c.id === id);
  const tone = (id) => ctx.tones.find((t) => t.id === id);
  // one key entry: its number, the swatch (a copy button for a colour), name, use, share of a page, the three values with their copy buttons beneath
  const entry = (c, n, on) => {
    const rgb = rgbOf(ctx, c.hex), ok = c.oklch || ctx.C.oklchString(c.hex), hair = hairlineOn(ctx, c.hex) ? ' is-hair' : '';
    const pct = c.share != null ? Math.round(c.share * 100) : null;
    const sw = pct != null
      ? `<button type="button" class="bk-sw${hair}" style="background:${c.hex}" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"></button>`
      : `<span class="bk-chipsw${hair}" style="background:${c.hex}" aria-hidden="true"></span>`;
    const share = pct != null ? `<p class="bk-share"><span class="bk-share__bar"><i class="${hair.trim()}" style="width:${pct}%;background:${c.hex}"></i></span><span class="bk-cap num">${pct}% of a page</span></p>` : '';
    return `<li class="bk-crow">${keyMk(n, on)}<div class="bk-crow__b"><div class="bk-crow__h">${sw}<div class="bk-cinfo"><p class="bk-cname">${A(c.name)}</p><p class="bk-clands">${A(c.lands)}${on ? '' : ' <span class="bk-off">Not on this screen.</span>'}</p></div></div>${share}<dl class="bk-vals"><div><dt>HEX</dt><dd>${c.hex}</dd></div><div><dt>RGB</dt><dd>${rgb}</dd></div><div><dt>OKLCH</dt><dd>${ok}</dd></div></dl><div class="bk-copies">${copyBtn('Copy HEX', c.hex, `${c.name} HEX`)}${copyBtn('Copy RGB', rgb, `${c.name} RGB`)}${copyBtn('Copy OKLCH', ok, `${c.name} OKLCH`)}</div></div></li>`;
  };
  const done = ctx.status.find((s) => s.id === 'done') || ctx.status[0];
  const order = [col('deep-end'), col('white'), col('float'), col('chalk'), col('lane'), tone('quiet'), tone('soft'), tone('hover')];
  const items = order.map((c, i) => entry(c, i + 2, i < 6));
  const statusNote = `<li class="bk-knote">${keyMk(1)}<div class="bk-crow__b"><div class="bk-crow__h"><span class="bk-chipsw" style="background:${wordsHex(ctx, done)}" aria-hidden="true"></span><div class="bk-cinfo"><p class="bk-cname">Status words</p><p class="bk-clands">Each status is words in one colour. Its tint is for highlights, never under text.</p></div></div></div></li>`;
  const phoneA = phoneDone(ctx, { chip: mkr(1), head: mkr(2), card: mkr(3), fl: mkr(4), foot: mkr(5), btn: mkr(6), para: mkr(7) });

  // contrast: the same screen, each pair flagged where it sits; pairs the screen does not show are hollow
  const onScreen = { 0: 'head', 1: 'card', 3: 'para', 4: 'label', 5: 'btn', 7: 'fl' };
  const flags = {};
  for (const [i, slot] of Object.entries(onScreen)) flags[slot] = flag(+i + 1, ctx.pairs[+i].ratioText + ' : 1');
  const phoneB = phoneDone(ctx, flags);
  const pair = (p, i) => {
    const on = i in onScreen;
    return `<li class="bk-pair${hairlineOn(ctx, p.bgHex) ? ' is-hair' : ''}${p.large ? ' is-large' : ''}" style="background:${p.bgHex};color:${p.fgHex}"><span class="bk-mkr bk-mkr--n bk-mkr--p${on ? '' : ' bk-mkr--o'}" style="${on ? `background:${p.fgHex};color:${p.bgHex}` : `color:${p.fgHex}`}" aria-hidden="true">${i + 1}</span><span class="bk-pair__r">${A(p.ratioText)} : 1</span><span class="bk-pair__u">${A(p.use)}</span>${p.large ? '' : '<span class="bk-pair__n">Any size</span>'}</li>`;
  };
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roles = (mode) => {
    const r = ctx.roles[mode];
    const its = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    return `<ul class="bk-roles bk-for-${mode}">${its.map(([n, hx]) => `<li><button type="button" class="bk-role" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-role__sw${hairlineOn(ctx, hx) ? ' is-hair' : ''}" style="background:${hx}" aria-hidden="true"></span><span class="bk-role__n">${A(n)}</span><span class="bk-role__h">${hx}</span></button></li>`).join('')}</ul>`;
  };
  return sec('colour', 'bk-sec--colour', `
${head('colour', 'Colour', 'Each colour sits where it lives on a real screen. Click a swatch to copy its HEX. RGB and OKLCH are one button away. The slim bar under a name is its share of a page.')}
<div class="bk-stage">
<div class="bk-stage__ph">${phoneA}</div>
<div class="bk-key">${sub('Key')}<ol class="bk-clist">${statusNote}${items.join('')}</ol><p class="bk-cap bk-legend">Solid numbers are on the screen. Hollow numbers are colours the screen does not show.</p></div>
</div>
<div class="bk-stage bk-stage--flip">
<div class="bk-stage__ph">${phoneB}</div>
<div class="bk-key">${sub('Contrast, pair by pair')}<p class="bk-body bk-measure">Every text pair ${A(B.name)} uses, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1. Flags on the screen carry the same number as the pair.</p><ol class="bk-pairs">${ctx.pairs.map(pair).join('')}</ol><p class="bk-cap bk-legend">Solid numbers are flagged on the screen. Hollow numbers are pairs that appear elsewhere in the product.</p></div>
</div>
<div class="bk-block">${sub('Interface roles')}<p class="bk-body bk-measure">The same roles in the light and dark previews. Use the switch to see the other set.</p>${roles('light')}${roles('dark')}</div>`);
}

function typography(ctx) {
  const B = ctx.brand, F = B.fonts, T = B.type, alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789';
  const wlist = (f) => f.weights.join(', ');
  const face = (cls, f, note, style) => `<li class="bk-face"><p class="bk-face__aa ${cls}" aria-hidden="true">Aa</p><div><p class="bk-face__n">${A(f.family)}</p><p class="bk-cap">${note} Weights ${wlist(f)}.</p><p class="bk-face__al" style="${style}">${alpha}</p></div></li>`;
  // the styles that sit on the phone: title (3), body (4), label (5); the rest are set in full beside their spec
  const onPhone = ['title', 'body', 'label'];
  const scaleRows = T.scale.map((s, i) => {
    const on = onPhone.includes(s.token);
    const fam = s.face === 'display' ? 'var(--display)' : 'var(--body)';
    const st = s.face === 'display' ? 'letter-spacing:-0.01em;' : '';
    return `<li class="bk-scale">${keyMk(i + 1, on)}<div class="bk-scale__b"><p class="bk-scale__t">${A(ctx.cap(s.token))}</p><p class="bk-cap num">${s.size} px, line ${s.line}, weight ${s.weight}</p><p class="bk-cap">${A(s.use)}</p>${on ? '' : `<p class="bk-scale__s" style="font-family:${fam};font-weight:${s.weight};line-height:${s.line};${st}--size:${s.size}px">${A(T.sample.headline)}</p>`}</div></li>`;
  }).join('');
  const idx = (t) => T.scale.findIndex((s) => s.token === t) + 1;
  const phoneT = phoneDone(ctx, { chip: mkr(idx('label')), head: mkr(idx('title')), para: mkr(idx('body')) });
  return sec('typography', 'bk-sec--type', `
${head('typography', 'Typography', 'One face for the big line, one for everything a parent reads. Each style is called out by number on the screen.')}
<div class="bk-stage">
<div class="bk-stage__ph">${phoneT}</div>
<div class="bk-key">${sub('Styles')}<ol class="bk-scales">${scaleRows}</ol><p class="bk-cap bk-legend">Solid numbers are on the screen. Hollow numbers are set in full beside their spec.</p></div>
</div>
<div class="bk-block">${sub('Faces')}<ul class="bk-faces">${face('disp', F.display, 'For the wordmark and headlines, one to three lines at a time.', 'font-family:var(--display);font-weight:700;letter-spacing:-0.01em')}${face('', F.body, 'For reading text, labels and buttons.', 'font-family:var(--body)')}</ul>
<p class="bk-cap bk-measure">${A(F.mono.family)} is for a hex, a token or a code string only. All three faces are open licence (SIL OFL 1.1), free for commercial use.</p></div>
<div class="bk-block bk-tester" data-tester>
${sub('Try it')}
<div class="bk-tester__c"><div class="bk-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(T.sample.headline)}" data-tester-text data-default="${A(T.sample.headline)}" autocomplete="off" spellcheck="false"></div>
<div class="bk-field"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="bk-tester__d disp" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
<p class="bk-tester__b" data-tester-out aria-hidden="true">${A(T.sample.headline)}</p>
</div>
<div class="bk-block bk-two"><div>${sub('In use')}<p class="bk-use__h disp">${A(T.sample.headline)}</p><p class="bk-use__p">${A(T.sample.paragraph)}</p><p class="bk-cap">${A(T.sample.caption)}</p></div><div>${sub('Rules')}${rulesList(T.rules)}</div></div>`);
}

function imagery(ctx) {
  const B = ctx.brand, D = B.imagery.direction, shots = B.imagery.shots;
  const dirRows = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
  const fig = (s, i) => {
    const real = !!s.photo;
    const f = real ? ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`) : null;
    const cap = real ? `${A(s.caption || s.alt)}. Photo: ${A(s.credit)}.` : 'Art-directed slot: the shot, the crop and the light.';
    return `<figure class="bk-shot bk-shot--${i}"><div class="bk-shot__f">${ctx.photo(s.id, { cls: 'bk-pho', pos: '50% 50%' })}</div><figcaption class="bk-capt"><span>${cap}</span>${f ? `<span class="bk-dls">${dl(f, 'photo ' + (s.caption || s.id))}</span>` : ''}</figcaption></figure>`;
  };
  return sec('imagery', 'bk-sec--imagery', `
${head('imagery', 'Imagery', A(D.subject))}
<div class="bk-imgst"><div class="bk-imgst__n">${notes(dirRows.slice(1).map(([k, v]) => [k, v]))}</div>
<div class="bk-shots">${shots.map(fig).join('')}</div></div>
<div class="bk-block">${sub('Rules')}${rulesList(B.imagery.rules)}</div>`);
}

function layout(ctx) {
  const G = ctx.gridMeasures, B = ctx.brand;
  const m = (G.margin / G.page.w) * 100, inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100;
  const cols = Array.from({ length: G.columns }, () => '<i></i>').join('');
  const col = (Math.round(G.col * 10) / 10).toString();
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const pc = (v) => (v / G.page.w * 100).toFixed(2);
  const pin = (n, x, y) => `<span class="bk-mkr bk-mkr--n bk-pin" style="left:${x}%;top:${y}%" aria-hidden="true">${n}</span>`;
  const pins = pin(1, pc(G.margin / 2), 50) + pin(2, pc(G.margin + G.col + G.gutter / 2), 24) + pin(3, pc(G.margin + 2 * (G.col + G.gutter) + G.col / 2), 62) + pin(4, pc(G.margin + 4 * (G.col + G.gutter) + G.col / 2), 86);
  const meas = [['Margin', `${G.margin} px`], ['Gutter', `${G.gutter} px`], ['Column', `${col} px`], ['Base', `${G.base} px`]];
  return sec('layout', 'bk-sec--layout', `
${head('layout', 'Layout', `${G.columns} columns on a ${G.page.w} by ${G.page.h} page, a ${G.margin} px margin and a ${G.gutter} px gutter. Everything sits on a ${G.base} px base.`)}
<div class="bk-gridfig"><div class="bk-page" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};padding:${m.toFixed(3)}%"><div class="bk-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div>${pins}</div>
<ol class="bk-meas">${meas.map(([k, v], i) => `<li>${keyMk(i + 1)}<span class="bk-meas__k">${k}</span><span class="bk-meas__v num">${v}</span></li>`).join('')}</ol></div>
<div class="bk-block">${sub('Spacing')}<ul class="bk-space">${ctx.space.map((s) => `<li><i style="width:${s.px}px;height:${s.px}px"></i><span class="bk-cap num">${s.px}</span></li>`).join('')}</ul></div>
<div class="bk-block">${sub('Corners and edges')}<div class="bk-shape">${radii.map((r) => `<div><i style="border-radius:${r.px}px"></i><span class="bk-cap">${A(r.use)}, ${r.px} px</span></div>`).join('')}<div><i style="border-radius:999px"></i><span class="bk-cap">Buttons and chips, pill</span></div></div><p class="bk-body">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote)}</p></div>`);
}

function applications(ctx) {
  const B = ctx.brand, L = ctx.logo, ap = B.applications, cw = B.logo.colourways, rev = cw.reversed, R = ctx.roles.light;
  const hl = ctx.colours.find((c) => c.role === 'highlight').hex;
  const front = `<div class="bk-card bk-card--front"><div class="bk-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 200, 80), color: rev.name, label: 'Your logo goes here' })}</div><p class="bk-card__line">${A(B.lines.primary)}</p></div>`;
  const back = `<div class="bk-card bk-card--back"><div class="bk-card__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 40, 46), label: 'Logo' })}</div><div class="bk-card__who"><p class="nm">${A(ap.card.person)}</p><p class="rl">${A(ap.card.role)}</p><p class="ct">${A(ap.card.contact)}<br>${A(ap.site.url)}</p></div></div>`;
  const social = `<div class="bk-posts">
<div class="bk-post bk-post--sq" style="background:${R.action};color:${R.actionLabel}"><p class="disp">${A(ap.social[0])}</p><span class="bk-post__lg">${L.html('colour', { colourway: 'on-lane', width: 96, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--pt" style="background:${rev.ground};color:${rev.name}"><p class="disp">${A(ap.social[1])}</p><span class="bk-post__lg">${L.html('reversed', { width: 96, color: rev.name, label: 'Logo' })}</span></div>
<div class="bk-post bk-post--st" style="background:${hl};color:${R.text}"><p class="disp">${A(ap.social[2])}</p><span class="bk-post__lg">${L.html('colour', { colourway: 'on-float', width: 88, label: 'Logo' })}</span></div>
</div>`;
  const [signSize, signHead] = ap.signage.split(': ');
  const sign = `<figure class="bk-sign"><div class="bk-sign__b" style="background:${cw['on-lane'].ground};color:${cw['on-lane'].name}"><p class="disp">${A(signHead)}</p><p class="bk-sign__l">${A(B.lines.others[1])}</p><span class="bk-sign__lg">${L.html('colour', { colourway: 'on-lane', width: 150, label: 'Logo' })}</span></div><figcaption class="cap">${A(signSize.replace(/ x /g, ' × '))}.</figcaption></figure>`;
  const email = `<div class="bk-email"><p class="bk-email__n">${A(ap.email.person)}</p><p class="bk-email__r">${A(ap.email.role)}, ${A(B.name)}</p><p class="bk-email__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="bk-email__l">${L.html('horizontal', { width: 168, label: 'Logo' })}</div></div>`;
  const wkNotes = notes([
    ['The time first, then where, then who', 'A lesson row says when, then the pool, then the child and their level. Days with nothing say so.'],
    ['Your lane', 'Float fills the chip, under Deep end type. It marks where your child swims.'],
    ['One button a screen', 'The button names what happens: Add to my calendar, Book lessons.'],
  ]);
  const item = (title, body, cls = '') => `<div class="bk-app ${cls}">${sub(title)}${body}</div>`;
  return sec('applications', 'bk-sec--apps', `
${head('applications', 'Applications', 'The brand at work: the product first, then a card, a feed, a pool door and an inbox.')}
<div class="bk-use"><div class="bk-use__row"><div class="bk-use__ph">${phoneWeek(ctx)}</div>${wkNotes}</div></div>
<div class="bk-band">
${item('Business card', `<div class="bk-cards">${front}${back}</div><p class="bk-cap">90 by 55 mm, front and back.</p>`)}
${item('Social', social)}
<div class="bk-two bk-two--even">${item('Pool door sign', sign)}${item('Email signature', email)}</div>
</div>`);
}

// downloads: one phone-sized list screen per folder, the files as list rows
function downloads(ctx) {
  const D = ctx.book, L = ctx.logo, slot = ctx.edition === 'slot';
  const file = (f, note = '') => `<li class="bk-file"><span class="bk-file__n">${A(f.name)}</span><span class="bk-cap">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span><a class="bk-btn bk-btn--quiet" href="${A(f.href)}" download aria-label="Download ${A(f.name)}"><span class="bk-btn__t">Download</span></a></li>`;
  const group = (title, what, inner) => `<section class="bk-ds" aria-label="${A(title)} folder"><div class="bk-ds__h"><h3 class="bk-ds__t">${A(title)}</h3><p class="bk-cap">${A(what)}</p></div>${inner}</section>`;
  const logoRows = slot
    ? `<ul class="bk-files">${D.logoFiles.map((f) => file(f)).join('')}</ul>`
    : `<ul class="bk-files">${L.versions.map((id) => { const f = D.logo(id); const sizes = f.png.map((p) => `<a class="bk-dl" href="${A(p.href)}" download aria-label="Download ${A(L.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="bk-file bk-file--logo"><span class="bk-file__n">${A(L.labels[id])}</span><span class="bk-dls">${dl(f.svg, L.labels[id] + ' logo')}${dl(f.pdf, L.labels[id] + ' logo')}<span class="bk-pngs" role="group" aria-label="PNG widths in pixels"><span class="bk-cap">PNG</span>${sizes}</span></span></li>`; }).join('')}</ul>`;
  const icons = `<ul class="bk-icons">${D.icons.map((f) => `<li><a class="bk-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul><ul class="bk-files">${file(D.iconsLicence, 'Licence')}</ul>`;
  const photos = D.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/'));
  const pdfs = D.imagery.filter((f) => f.ext === 'PDF');
  return sec('downloads', 'bk-sec--down', `
${head('downloads', 'Downloads', `Everything in the brand kit, folder by folder. The zip holds all of it.`)}
<div class="bk-zip"><div><p class="bk-zip__n">${A(D.zip.name)}</p><p class="bk-cap">Every folder below. ${A(D.zip.sizeText)}.</p></div><a class="bk-btn bk-btn--primary" href="${A(D.zip.href)}" download aria-label="Download ${A(D.zip.name)}, ${A(D.zip.sizeText)}"><span class="bk-btn__t">Download the kit</span></a></div>
<div class="bk-dgrid">
${group('Read me', 'Start here: what is in the kit and how to use it.', `<ul class="bk-files">${[D.readmePdf, D.readme].filter(Boolean).map((f) => file(f)).join('')}</ul>`)}
${group('Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', logoRows)}
${group('Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', `<ul class="bk-files">${D.colour.map((f) => file(f)).join('')}</ul>`)}
${group('Type', 'The specimen sheet, and the faces with their links and licence.', `<ul class="bk-files">${D.type.map((f) => file(f)).join('')}</ul>`)}
${group('Icons', `${D.icons.length} interface icons, drawn in the brand's stroke.`, icons)}
${group('Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', `<ul class="bk-files">${[...pdfs, ...photos].map((f) => file(f)).join('')}</ul>`)}
</div>`);
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx)).join('\n');
}
