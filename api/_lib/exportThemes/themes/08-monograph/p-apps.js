// Guidelines pages: business-card, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-p-apps.js (classes start ra-).
// The riso press at work on the brand's own things. A printed thing (a card, a proof, the closing sheet) is a sheet of the paper with a
// registration cross at each corner; screens and the vinyl are not printed, so they carry no crosses. Every figure carries its job line:
// the drums it prints in, any tone, and the paper, as real swatches from the brand. Composites only; no separations on these pages.
import { A, fit } from './helpers.js';
import { page, corners, drums, drumNo, paper, byRole, readInk, Word, isSurface } from './guidelines-r.js';

const titleOf = (ctx, id) => ctx.pages.find((p) => p.id === id).title;
const px = (n) => +n.toFixed(2);
const lg = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: Math.round(w), label: w < 150 ? 'Logo' : 'Your logo goes here', ...o });
const tone = (ctx, role) => ctx.tones.find((t) => t.role === role);
// the job line, copied from p-image.js so the lanes print one form (review D1): each drum the figure prints, in drum order, its name
// in its own ink where that reads, then what it carries; whatever is in the paper's colour is the paper showing through; a tone that is
// no drum is named as it is. One line under the figure, flush with its left edge. uses: [[hex, what it prints], ...]. The photograph
// sentence is printed on photo-direction only, so it is left out here.
const hx = (h) => String(h).toLowerCase();
const drumOf = (ctx, hex) => drums(ctx).find((c) => hx(c.hex) === hx(hex));
const nameOfHex = (ctx, hex) => { const c = ctx.colours.find((x) => hx(x.hex) === hx(hex)) || ctx.tones.find((x) => hx(x.hex) === hx(hex)); return c ? c.name : ''; };
function job(ctx, uses) {
  const D = drums(ctx), p = paper(ctx), by = new Map(), through = [], other = [];
  for (const [hex, what] of uses) {
    const c = drumOf(ctx, hex);
    if (c) { if (!by.has(c)) by.set(c, []); if (!by.get(c).includes(what)) by.get(c).push(what); } else if (isSurface(ctx, hex) || hx(hex) === hx(p.hex)) through.push(what); else other.push([nameOfHex(ctx, hex), what]);
  }
  const used = D.filter((c) => by.has(c));
  const parts = used.map((c) => `<span class="ra-jd"><i class="ra-jsw" style="background:${c.hex}"></i><b style="color:${readInk(ctx, c.hex)}">Drum ${drumNo(ctx, c)} ${A(c.name)}</b>: ${by.get(c).join(', ')}.</span>`);
  const n = used.length, lead = `<span>${Word(n)} drum${n === 1 ? '' : 's'} on ${A(p.name)}.</span>`;
  const show = through.length ? ` <span>The paper shows through for ${through.join(', ')}.</span>` : '';
  const rest = other.map(([nm, what]) => ` <span>${A(nm)}: ${what}.</span>`).join('');
  return `<p class="ra-job">${lead} ${parts.join(' ')}${show}${rest}</p>`;
}
// an absolutely placed box at page scale k: x, y, w and h are in the thing's own units
const ab = (k, x, y, w, h, st = '', inner = '', cls = '') => `<div class="ra-ab ${cls}" style="left:${px(x * k)}px;top:${px(y * k)}px;${w ? `width:${px(w * k)}px;` : ''}${h ? `height:${px(h * k)}px;` : ''}${st}">${inner}</div>`;
// crop marks round a trimmed piece of w x h, drawn in the sheet's margin, outside the trim (o: the margin the svg spans)
const crop = (w, h, col, o = 20, g = 6) => {
  let d = '';
  for (const x of [o, o + w]) for (const y of [o, o + h]) {
    const lx = x === o ? x + 0.5 : x - 0.5, ly = y === o ? y + 0.5 : y - 0.5;
    d += `M${x === o ? 0 : x + g} ${ly}H${x === o ? o - g : w + 2 * o}M${lx} ${y === o ? 0 : y + g}V${y === o ? o - g : h + 2 * o}`;
  }
  return `<svg class="ra-crop" style="left:-${o}px;top:-${o}px" viewBox="0 0 ${w + 2 * o} ${h + 2 * o}" width="${w + 2 * o}" height="${h + 2 * o}" aria-hidden="true"><path d="${d}" stroke="${col}" stroke-width="1" fill="none"/></svg>`;
};
const full = 'width:100%;height:100%';

export const pApps = {
  // the card as two pulled sheets, front then back, each trimmed by crop marks inside its sheet; they step across the page in a zigzag,
  // each with its notes and job line on the open side, and a scale bar under the back that prints the true width
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed, ink = byRole(ctx, 'text'), p = paper(ctx);
    const [cw, ch, mm] = [90, 55, 4.8]; // Australian standard card, mm, drawn at 4.8 px to the millimetre
    const W = cw * mm, H = ch * mm;
    const sheet = (inner) => `<div class="r-sheet ra-bc__sh">${corners(ink.hex, 13)}<div class="ra-bc__trim" style="width:${W}px;height:${H}px">${crop(W, H, ink.hex)}${inner}</div></div>`;
    const front = sheet(`<div class="ra-card ra-card--f" style="background:${rev.ground};color:${rev.name}">${L.html('reversed', { width: fit(ctx, 'reversed', 150, 110), colourway: 'reversed', color: rev.name, label: 'Your logo goes here' })}</div>`);
    const back = sheet(`<div class="ra-card ra-card--b"><div class="ra-card__mk">${L.html('symbol', { width: fit(ctx, 'symbol', 44, 70), label: 'Logo' })}</div><p class="disp ra-card__nm">${A(c.person)}</p><p class="ra-card__rl">${A(c.role)}</p><p class="ra-card__ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div>`);
    const note = (h, t) => `<div class="ra-bc__n"><h2 class="r-tg__h">${h}</h2><p class="ra-tx">${t}</p></div>`;
    const plate = B.logo.colourways.colour.plate;
    const jobF = job(ctx, [[rev.ground, 'the ground'], [rev.plate, 'the plate'], [rev.name, 'the name']]);
    const jobB = job(ctx, [[ink.hex, 'the name and the type'], [plate, 'the plate']]);
    // a tick every 10 mm along the card's width
    const ticks = Array.from({ length: cw / 10 + 1 }, (_, i) => `<path d="M${px(i * 10 * mm) + (i === cw / 10 ? -0.5 : 0.5)} 0v${i === 0 || i === cw / 10 ? 10 : 6}"/>`).join('');
    const scale = `<div class="ra-scale" style="width:${W}px"><svg viewBox="0 0 ${W} 10" width="${W}" height="10" aria-hidden="true"><g stroke="${ink.hex}" stroke-width="1" fill="none"><path d="M0 9.5h${W}"/>${ticks}</g></svg><p class="ra-scale__l"><span class="num">0</span><span class="num">${cw} mm</span></p></div>`;
    const body = `<div class="ra-bc"><div class="ra-bc__r"><figure class="ra-fg">${front}<figcaption>${jobF}</figcaption></figure>${note('Front', `${A(L.labels.reversed)} logo on ${A(ink.name)}.`)}</div>`
      + `<div class="ra-bc__r ra-bc__r--b">${note('Back', `Name, role and contact. ${A(p.name)}, with the symbol.`)}<figure class="ra-fg">${back}${scale}<figcaption>${jobB}</figcaption></figure></div></div>`;
    return page(ctx, 'business-card', `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'business-card'))}</h1><p class="r-lead"><span class="num">${cw} × ${ch} mm</span>, shown at <span class="num">${mm}</span> px to the millimetre. Each side is trimmed from its own sheet.</p></div><div class="ra-b ra-b--bc">${body}</div>`);
  },

  // three posts at page scale: the story stands tall at the right, the square and the portrait stacked at its left; each post has its
  // size and its job line beneath; the three rules run across the foot
  social(ctx) {
    const B = ctx.brand, S = B.applications.social, cws = B.logo.colourways, bl = cws['on-blush'] || cws.colour, rev = cws.reversed;
    const ink = byRole(ctx, 'text'), k = 220 / 1080, ks = 346 / 1080;
    const post = (kk, h, inner, st, cls = '') => `<div class="ra-post ph-tight ${cls}" style="width:${px(1080 * kk)}px;height:${px(h * kk)}px;${st}">${inner}</div>`;
    const logo = (kk, id, x, y, w, o) => ab(kk, x, y, 0, 0, '', lg(ctx, id, w * kk, { label: 'Logo', ...o }), 'ra-lg');
    const square = post(k, 1080, `${logo(k, 'colour', 90, 90, 330, { colourway: 'on-blush', color: bl.name })}${ab(k, 90, 560, 900, 0, `font-size:${px(170 * k)}px;color:${bl.name}`, A(S[1]), 'disp ra-post__t')}`, `background:${bl.ground}`);
    const portrait = post(k, 1350, `${ab(k, 0, 0, 1080, 760, '', ctx.photo('late', { style: full, slotNote: false }))}${ab(k, 72, 830, 936, 0, `font-size:${px(96 * k)}px;color:${ink.hex}`, A(S[0]), 'disp ra-post__t')}${logo(k, 'horizontal', 72, 1196, 330, { colourway: 'colour', color: 'var(--ink)' })}`, `background:var(--ground)`, 'r-hair');
    const story = post(ks, 1920, `${ab(ks, 0, 0, 1080, 1100, '', ctx.photo('work', { style: full, slotNote: false }))}${ab(ks, 72, 1180, 936, 0, `font-size:${px(72 * ks)}px;color:${rev.name}`, A(S[2]), 'disp it ra-post__t')}${logo(ks, 'reversed', 72, 1620, 300, { colourway: 'reversed', color: rev.name })}`, `background:${rev.ground}`);
    const cap = (t, w, h) => `<p class="ra-cap"><span class="ra-cap__t">${t}</span> <span class="num">${w} × ${h} px</span></p>`;
    // one job line for the set of three, under it (a 220 px column would run each post's line to four lines)
    const jobs = job(ctx, [[bl.ground, 'the square\'s ground'], [bl.name, 'the lines'], [bl.plate, 'the logos'], [ink.hex, 'the lines'], [cws.colour.plate, 'the plates'],
      [rev.ground, 'the story\'s ground'], [rev.plate, 'the plates'], [rev.name, 'the story\'s line and name']]);
    const rules = [['Voice', 'One line a post, written like a label.'], ['Logo', 'Beside the line, never over a busy part of a photograph.'], ['Story', 'Keep the logo clear of the top and bottom, where the app puts its own controls.']];
    const body = `<div class="ra-so"><div class="ra-so__l"><figure>${square}<figcaption>${cap('Square', 1080, 1080)}</figcaption></figure><figure>${portrait}<figcaption>${cap('Portrait', 1080, 1350)}</figcaption></figure></div>`
      + `<figure class="ra-so__r" style="width:${px(1080 * ks)}px">${story}<figcaption>${cap('Story', 1080, 1920)}</figcaption></figure></div>${jobs}`
      + `<ul class="ra-so__ru">${rules.map(([h, t]) => `<li><h2 class="r-tg__h">${h}</h2><p class="ra-tx">${t}</p></li>`).join('')}</ul>`;
    return page(ctx, 'social', `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'social'))}</h1><p class="r-lead">Three sizes, one line a post, drawn at page scale.</p></div><div class="ra-b ra-b--so">${body}</div>`);
  },

  // the entrance wall, large at the left: the vinyl cut in one colour, its dashed edge, and its width and height dimensioned on the wall;
  // the sign's spec at the right. Vinyl is cut, not printed, so it has no crosses; its line names the one colour and the wall.
  signage(ctx) {
    const B = ctx.brand, sg = B.applications.signage, mono = B.logo.colourways['mono-dark'], ink = byRole(ctx, 'text'), panel = tone(ctx, 'panel') || paper(ctx);
    const real = ctx.real(sg), m = real.match(/(\d+)\s*x\s*(\d+)\s*mm/), [W, H] = m ? [+m[1], +m[2]] : [1200, 1800];
    const line = ctx.ph('applications.signage.line', real.split(': ').slice(1).join(': ') || ctx.real(B.lines.primary));
    const k = 0.32, vw = W * k, vh = H * k, X = 24, Y = 48, fw = Math.round(X + vw + 72), fh = Y + vh + 64;
    // k is page px per mm; the page is 96 px to the inch, so a mm is 96 / 25.4 px and the drawing's scale is that over k
    const ratio = Math.round((96 / 25.4) / k);
    const vinyl = `<div class="ra-vy" style="left:${X}px;top:${Y}px;width:${px(vw)}px;height:${px(vh)}px">${ab(k, 70, 130, 1060, 0, `font-size:${px(190 * k)}px;color:${mono.name}`, A(line), 'disp ra-vy__t ph-tight')}${ab(k, 70, H - 250, 0, 0, '', lg(ctx, 'horizontal', 480 * k, { colourway: 'mono-dark', color: mono.name, label: 'Logo' }), 'ra-lg')}</div>`;
    // dimension lines in Ink on the wall: the width under the vinyl, the height at its right with the figure along the line
    const dimW = `<svg class="ra-dim" style="left:${X}px;top:${px(Y + vh + 14)}px" width="${px(vw)}" height="9" viewBox="0 0 ${px(vw)} 9" aria-hidden="true"><path d="M0.5 0v9M${px(vw) - 0.5} 0v9M0 4.5h${px(vw)}" stroke="${ink.hex}" fill="none"/></svg><p class="ra-dim__l num" style="left:${X}px;width:${px(vw)}px;top:${px(Y + vh + 28)}px">${W} mm</p>`;
    const dimH = `<svg class="ra-dim" style="left:${px(X + vw + 14)}px;top:${Y}px" width="9" height="${px(vh)}" viewBox="0 0 9 ${px(vh)}" aria-hidden="true"><path d="M0 0.5h9M0 ${px(vh) - 0.5}h9M4.5 0v${px(vh)}" stroke="${ink.hex}" fill="none"/></svg><p class="ra-dim__l ra-dim__l--v num" style="left:${px(X + vw + 28)}px;top:${Y}px;height:${px(vh)}px">${H} mm</p>`;
    const wall = `<figure class="ra-sg__f"><div class="ra-wall" style="width:${fw}px;height:${px(fh)}px;background:${panel.hex}">${vinyl}${dimW}${dimH}</div><figcaption><p class="ra-cap">Drawn at <span class="num">1 : ${ratio}</span>. The dashed edge marks the vinyl and is not cut.</p>${job(ctx, [[mono.name, 'the vinyl'], [panel.hex, 'the wall']])}</figcaption></figure>`;
    const fact = (h, t) => `<div class="ra-sg__i"><h2 class="r-tg__h">${h}</h2><p class="ra-tx">${t}</p></div>`;
    const facts = `<div class="ra-sg__c">${fact('Sign', A(sg))}${fact('Type', `${A(B.fonts.display.family)} <span class="num">${B.fonts.display.weights[0]}</span> in ${A(ink.name)}, cut from vinyl.`)}${fact('Logo', `${A(ctx.logo.labels['mono-dark'])}, since vinyl is one colour.`)}`
      + `${fact('Contrast', `${A(ink.name)} on the ${A(panel.name)} wall, <span class="num">${ctx.fmt(ctx.ratio(ink.hex, panel.hex))} : 1</span>.`)}</div>`;
    return page(ctx, 'signage', `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'signage'))}</h1><p class="r-lead">The sign where it is fixed, drawn to scale with its sizes.</p></div><div class="ra-b ra-b--sg">${wall}${facts}</div>`);
  },

  // the signature pulled as a proof at twice its size, the logo's width dimensioned, the rules beside it on the same sheet; then the
  // whole email at its real size, with the job line at its side
  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card, ink = byRole(ctx, 'text'), q = tone(ctx, 'quiet text');
    const sig = `<div class="ra-sig"><div class="ra-sig__lg">${lg(ctx, 'horizontal', 150, { colourway: 'colour', color: 'var(--ink)', label: 'Logo' })}</div><p class="ra-sig__n">${A(e.person)}</p><p class="ra-sig__r">${A(e.role)}</p><p class="ra-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div>`;
    const dim = `<div class="ra-pf__dim"><svg width="300" height="9" viewBox="0 0 300 9" aria-hidden="true"><path d="M0.5 0v9M299.5 0v9M0 4.5h300" stroke="${ink.hex}" fill="none"/></svg><p class="num">150 px</p></div>`;
    const rules = [['Name', `In ${A(B.fonts.body.family)} <span class="num">500</span>, <span class="num">14</span> px. The role beneath, in the quiet grey.`], ['Logo', `The ${A(ctx.logo.labels.horizontal.toLowerCase())} logo, <span class="num">150</span> px wide. No other version.`], ['Links', 'Address and site as plain text, never as an image.']];
    // an email is never printed, so the proof has the screen's hairline edge and no crosses, the same as digital
    const proof = `<figure class="ra-pf"><div class="r-sheet ra-pf__sh"><div class="ra-pf__z">${dim}<div class="ra-pf__x2">${sig}</div></div><ul class="ra-pf__ru">${rules.map(([h, t]) => `<li><h2 class="r-tg__h">${h}</h2><p class="ra-tx">${t}</p></li>`).join('')}</ul></div>`
      + `<figcaption class="ra-cap">The signature at twice its size.</figcaption></figure>`;
    const head = [['From', `${A(e.person)} &lt;${A(c.contact)}&gt;`], ['To', A(g.to)], ['Subject', A(g.subject)], ['Sent', A(g.time)]].map(([t, d]) => `<p><span class="ra-ml__k">${t}</span> <span class="${t === 'Subject' ? 'ra-ml__s' : ''}">${d}</span></p>`).join('');
    const mail = `<figure class="ra-fg"><div class="ra-ml r-hair"><div class="ra-ml__h">${head}</div><div class="ra-ml__b">${g.body.map((t) => `<p>${A(t)}</p>`).join('')}${sig}</div></div>`
      + `<figcaption>${job(ctx, [[ink.hex, 'the type and the name'], [B.logo.colourways.colour.plate, 'the plate'], ...(q ? [[q.hex, 'the role']] : [])])}</figcaption></figure>`;
    const side = `<div class="ra-em__s"><h2 class="r-tg__h">The email</h2><p class="ra-tx">At its real size, as it lands.</p></div>`;
    return page(ctx, 'email-signature', `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'email-signature'))}</h1></div><div class="ra-b ra-b--em">${proof}<div class="ra-em">${mail}${side}</div></div>`);
  },

  // the rules first, in a row under the title; then the exhibition page, large across the measure, built from the UI kit.
  // A screen is not printed, so it has a hairline edge and no crosses; its line names the colours that land on it.
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, first = S.deliveries[0], ink = byRole(ctx, 'text'), act = byRole(ctx, 'action');
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="ra-scr__logo">${lg(ctx, 'horizontal', 150, { color: 'var(--ink)', label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links(S.example.links.map(([t]) => [t]), 0)}</div></nav>`;
    const hero = `<div class="ra-hero"><div class="ra-hero__t">${ui.crumbs([...S.example.crumbs])}<div class="ra-hero__s">${ui.statusChip('booked', { label: S.status })}<span>${A(S.eta)}</span></div><h2 class="ui-display ra-hero__h">${A(first.to)}</h2><p class="ra-hero__by">${A(S.rider)}</p><p class="ra-hero__p">${A(S.riderNote)}. ${A(S.pickup)}</p><div class="ra-hero__a">${ui.btn(S.form.book, {})}${ui.btn(S.example.secondary, { variant: 'secondary' })}</div><p class="ra-hero__f">${A(B.lines.primary)}</p></div><div class="ra-hero__i">${ctx.photo('work', { style: full })}</div></div>`;
    // the rows as the kit's deliveryRows draws them, but each status label taken from the brand's ui copy, so the slot edition slots it
    const stLabel = (id) => ((B.ui.status || []).find((s) => s.id === id) || {}).label;
    const rows = `<ul class="ui-list">${S.deliveries.slice(0, 4).map((d) => ui.row({ lead: ui.icon(d.icon || B.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status, { label: stLabel(d.status) }) })).join('')}</ul>`;
    const list = `<div class="ra-dl"><h3 class="ra-dl__h">${A(S.example.tabs[0])}</h3>${rows}</div>`;
    const W = 1100, Hh = 1010, k = 650 / W;
    const screen = `<div class="ra-scr r-hair" style="width:${px(W * k)}px;height:${px(Hh * k)}px"><div class="ra-scr__in ph-tight" style="width:${W}px;height:${Hh}px;transform:scale(${k})"><div class="ui ra-scr__ui">${bar}<div class="ra-scr__b">${hero}${list}</div></div></div></div>`;
    const rules = [['Page', `A main page on ${A(B.applications.site.url)}, built from the UI kit.`], ['Button', `${A(S.form.book)} is the one ${A(act.name)} fill on the screen. Statuses are plain words in ${A(ink.name)}.`], ['Type', `${A(B.fonts.display.family)} for the page's main name, ${A(B.fonts.body.family)} for the rest.`]];
    const top = `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'digital'))}</h1><ul class="ra-dg__ru">${rules.map(([h, t]) => `<li><h2 class="r-tg__h">${h}</h2><p class="ra-tx">${t}</p></li>`).join('')}</ul></div>`;
    return page(ctx, 'digital', `${top}<div class="ra-b ra-b--dg"><figure>${screen}<figcaption class="ra-dg__c"><p class="ra-cap">${A(B.applications.site.url)}, at <span class="num">${Math.round(k * 100)}</span> per cent.</p>${job(ctx, [[ink.hex, 'the type and the current page'], [act.hex, 'the button'], [B.logo.colourways.colour.plate, 'the plate']])}</figcaption></figure></div>`);
  },

  // the closing sheet: one print carrying the logo large and the lines, with the press's colour bar (each drum's solid, then the paper)
  // along its foot; under it, the tones, the two faces and the three rules
  summary(ctx) {
    const B = ctx.brand, f = B.fonts, G = B.guideB, D = drums(ctx), p = paper(ctx), ink = byRole(ctx, 'text');
    const cell = (c, label) => `<li><i class="${isSurface(ctx, c.hex) ? 'r-hair' : ''}" style="background:${c.hex}"></i><p><span class="ra-cb__k">${label}</span> ${A(c.name)}</p><p class="r-mono">${A(c.hex)}</p></li>`;
    const bar = `<ul class="ra-cb" style="grid-template-columns:repeat(${D.length + 1},minmax(0,1fr))">${D.map((c) => cell(c, `Drum ${drumNo(ctx, c)}`)).join('')}${cell(p, 'Paper')}</ul>`;
    const lines = `<div class="ra-su__ln"><p class="disp ra-su__l1">${A(B.lines.primary)}</p>${(B.lines.others || []).map((l) => `<p class="ra-su__l2">${A(l)}</p>`).join('')}</div>`;
    const sheet = `<div class="r-sheet ra-su__sh">${corners(ink.hex, 15)}<div class="ra-su__top"><div class="ra-su__lg">${lg(ctx, 'colour', 300, { color: 'var(--ink)' })}</div>${lines}</div>${bar}</div>`;
    const tones = ctx.tones.map((t) => `<span class="r-tone"><i class="${isSurface(ctx, t.hex) ? 'r-hair' : ''}" style="background:${t.hex}"></i>${A(t.name)} <span class="r-mono">${A(t.hex)}</span></span>`).join('');
    const type = `<div class="ra-su__ty"><h2 class="r-tg__h">Type</h2><p class="ra-fs"><span class="disp ra-fs__a">Aa</span><span>${A(f.display.family)}<br><span class="num">${f.display.weights.join(', ')}</span>, and italic</span></p><p class="ra-fs"><span class="ra-fs__a ra-fs__a--b">Aa</span><span>${A(f.body.family)}<br><span class="num">${f.body.weights.join(', ')}</span></span></p>`
      + (tones ? `<h2 class="r-tg__h ra-su__th">Tones</h2><p class="r-tones ra-su__tones">${tones}</p>` : '') + '</div>';
    const rules = `<div class="ra-su__ru"><h2 class="r-tg__h">Three rules</h2><ol>${G.rules.map((r, i) => `<li><span class="disp ra-su__n num">${i + 1}</span><div><p class="ra-su__rh">${A(r.title)}</p><p class="ra-tx">${A(r.body)}</p></div></li>`).join('')}</ol></div>`;
    return page(ctx, 'summary', `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'summary'))}</h1></div><div class="ra-b ra-b--su">${sheet}<div class="ra-su__ft">${type}${rules}</div></div>`);
  },

  // the last page: who to ask, set large; the run under it as the closing small print: this edition, what is in it, what is not
  'contact-scope'(ctx) {
    const B = ctx.brand, C = B.contact, G = B.guideB;
    const inDoc = ctx.sections.filter((s) => s.n).map((s) => `<li><span class="num ra-cs__n">${s.n}</span>${A(s.title)}</li>`).join('');
    const ask = `<div class="ra-cs__ask"><p class="disp ra-cs__q">Questions go to the ${A(C.owner.toLowerCase())}.</p><p class="ra-cs__m">${A(C.email)}</p></div>`;
    // the colophon, the small print that closes a riso run: each drum with its swatch and hex, the paper, the two faces. All from ctx.
    const D = drums(ctx), p = paper(ctx), f = B.fonts;
    const dr = (c, label = '') => `<span class="ra-co__d"><i class="${isSurface(ctx, c.hex) ? 'r-hair' : ''}" style="background:${c.hex}"></i>${label ? `${label} ` : ''}${A(c.name)} <span class="r-mono">${A(c.hex)}</span></span>`;
    const colo = `<div class="ra-co"><h2 class="r-tg__h">Colophon</h2><p class="ra-co__p">Printed in ${Word(D.length).toLowerCase()} drum${D.length === 1 ? '' : 's'}: ${D.map((c) => dr(c, `Drum ${drumNo(ctx, c)}`)).join(', ')}. On ${dr(p)}.</p>`
      + `<p class="ra-co__p">Set in <span class="disp">${A(f.display.family)}</span>, <span class="ra-co__b">${A(f.body.family)}</span> and <span class="r-mono">${A(f.mono.family)}</span>.</p></div>`;
    const run = `<div class="ra-cs__run"><div class="ra-cs__v"><h2 class="r-tg__h">Versions</h2><p class="ra-cs__vn"><span class="num">${A(B.version.number)}</span></p><p class="ra-tx">${A(ctx.date)}. First issue.</p></div>`
      + `<div><h2 class="r-tg__h">In this document</h2><ul class="ra-cs__in">${inDoc}</ul></div>`
      + `<div><h2 class="r-tg__h">Not in it</h2><ul class="ra-cs__not">${G.notIn.map((t) => `<li class="ra-tx">${A(t)}</li>`).join('')}</ul></div></div>`;
    return page(ctx, 'contact-scope', `<div class="r-top"><h1 class="r-h1">${A(titleOf(ctx, 'contact-scope'))}</h1></div><div class="ra-b ra-b--cs">${ask}<div class="ra-cs__ft">${colo}${run}</div></div>`);
  },
};
