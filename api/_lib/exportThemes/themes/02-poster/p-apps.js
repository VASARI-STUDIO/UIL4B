// Guidelines pages for theme 02, Ticket: business-card, social, signage, email-signature, digital, summary, contact-scope.
// Styles are in css-p-apps.js (classes start ta-). Open Stock pages: the ticket's parts are edge devices here (the perforation as a rule,
// serials as running numbers, fact fields label over value, the condensed stub face for small labels). Whole tickets only on the
// summary (three, no more). The digital page is the one screen after dark: Night ground. No hex is written here; colours come from the roles.
import { A, ratioText, fit } from './helpers.js';
import { page, fields, perf, serial, inkOn, byRole, bySize, edgeOn } from './gate.js';

const full = 'width:100%;height:100%';
// small logo slots cannot hold the long label
const lg = (ctx, id, w, o = {}) => ctx.logo.html(id, { width: Math.round(w), label: w < 150 ? 'Logo' : undefined, ...o });
const px = (k) => (n) => +(n * k).toFixed(2);
const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
// the perforation as a rule on an open page: holes in the quiet ink of the ground it sits on
const holes = (ctx, night) => (night ? ctx.roles.dark : ctx.roles.light).quiet;
const hRule = (ctx, night = false, cls = '') => `<div class="ta-hr ${cls}" aria-hidden="true">${perf(holes(ctx, night), { d: 3, p: 9, dir: 'h' })}</div>`;
const vRule = (ctx, night = false) => perf(holes(ctx, night), { d: 3, p: 9 });
const fmtR = (ctx, fg, bg) => `<span class="num">${ratioText(ctx.fmt(ctx.ratio(fg, bg)))}</span>`;

export const pApps = {
  // the card is the subject: the lead under the title with the size as a fact field beside it, a perforated rule, then front and
  // back at 6 px to the millimetre (the large thing), each with its fact field over it
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, red = byRole(ctx, 'action'), rev = B.logo.colourways.reversed;
    const S = 6, [cw, ch] = [90, 55]; // Australian standard card, mm; drawn at 6 px to the millimetre
    const W = cw * S, H = ch * S, ink = inkOn(ctx, red.hex), up = ctx.roles.light.raised;
    const front = `<div class="ta-card ta-card--front" style="width:${W}px;height:${H}px;background:${red.hex};color:${ink}"><div class="ta-card__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 360, 104), color: rev.name, label: 'Your logo goes here' })}</div><p class="ta-card__line">${A(B.lines.primary)}</p></div>`;
    const back = `<div class="ta-card ta-card--back${edgeOn(ctx, up)}" style="width:${W}px;height:${H}px;background:${up}"><div class="ta-card__mark">${lg(ctx, 'symbol', fit(ctx, 'symbol', 64, 72))}</div><div class="ta-card__who"><p class="ta-card__nm">${A(c.person)}</p><p class="ta-card__rl">${A(c.role)}</p><p class="ta-card__ct">${A(c.contact)}</p></div><p class="ta-card__site">${A(B.applications.site.url)}</p></div>`;
    const fig = (card, label, text) => `<figure class="ta-bc__fig">${fields([[label, A(text)]], 'ta-ff')}${card}</figure>`;
    const top = `<div class="ta-bc__top"><p class="tk-lead ta-lead">The Australian standard card. Shown here at ${S} px to the millimetre.</p>${fields([['Size', `<span class="num">${cw} × ${ch} mm</span>`]], 'ta-ff ta-ff--bc')}</div>`;
    return page(ctx, 'business-card', `<div class="ta-bc">${top}${hRule(ctx)}<div class="ta-bc__cards">${fig(front, 'Front', 'The logo and the line')}${fig(back, 'Back', 'Name, role and contact')}</div></div>`, 'ta--card');
  },

  // three posts at one scale on a perforated baseline, a run of serials under them; the stub column beyond a perforation bills each format,
  // the tallest first and set biggest
  social(ctx) {
    const k = 0.24, p = px(k), S = ctx.brand.applications.social;
    const red = byRole(ctx, 'action'), night = byRole(ctx, 'ink'), stage = byRole(ctx, 'panel');
    const post = (w, h, bg, inner) => `<div class="ta-post" style="width:${p(w)}px;height:${p(h)}px;background:${bg.hex};color:${inkOn(ctx, bg.hex)}">${inner}</div>`;
    const at = (x, y, w, st, inner) => `<div class="ta-ab" style="left:${p(x)}px;top:${p(y)}px;${w ? `width:${p(w)}px;` : ''}${st}">${inner}</div>`;
    const hl = (x, y, w, size, html, colour = '') => at(x, y, w, `font-size:${p(size)}px;${colour ? `color:${colour};` : ''}`, `<p class="disp ta-post__l">${html}</p>`);
    // the story keeps its type 250 px clear of the top and the bottom
    const story = post(1080, 1920, night, `${at(0, 0, 1080, `height:${p(1000)}px`, ctx.photo('queue', { style: full }))}${hl(72, 1040, 936, 120, A(S[2]), red.hex)}${at(72, 1580, 0, '', lg(ctx, 'horizontal', 300 * k, { colourway: 'on-stage' }))}`);
    const portrait = post(1080, 1350, stage, `${at(0, 0, 1080, `height:${p(800)}px`, ctx.photo('stage', { style: full }))}${hl(72, 860, 936, 112, A(S[1]))}${at(72, 1220, 0, '', lg(ctx, 'horizontal', 330 * k, { colourway: 'on-stage' }))}`);
    const square = post(1080, 1080, red, `${hl(80, 80, 920, 150, A(S[0]))}${at(80, 900, 0, '', lg(ctx, 'horizontal', 380 * k, { colourway: 'reversed' }))}`);
    const posts = [story, portrait, square].map((x, i) => `<li class="ta-so__post">${x}<span class="tk-sn">${serial(i + 1)}</span></li>`).join('');
    const bill = [['Story', '1080 × 1920 px', 'Keep type 250 px clear of the top and bottom.'], ['Portrait', '1080 × 1350 px', `A photo, then the line on ${A(stage.name)}.`], ['Square', '1080 × 1080 px', `The line and the horizontal logo on ${A(red.name)}.`]]
      .map(([n, s, t], i) => `<li class="ta-bill ta-bill--${i + 1}"><span class="tk-sn">${serial(i + 1)}</span><h3 class="ta-bill__n">${n}</h3><p class="ta-bill__s num">${s}</p><p class="ta-bill__t">${t}</p></li>`).join('');
    return page(ctx, 'social', `<div class="ta-so"><div class="ta-so__run"><ol class="ta-so__posts">${posts}</ol>${hRule(ctx, false, 'ta-so__base')}</div><div class="ta-so__stub">${vRule(ctx)}<ol class="ta-bills">${bill}</ol></div></div>`, 'ta--social');
  },

  // the street poster drawn to scale on the right, its dimension lines beside and under it; on the left the lead under the title,
  // the brand's own spec line set large, then the facts as fields
  signage(ctx) {
    const B = ctx.brand, sg = B.applications.signage, gig = B.ui.screen.content.deliveries[0], slot = ctx.edition === 'slot';
    // the lit line is the act in showcase; a list item's title is not a line for any brand, so the slot takes the brand's next line
    const red = byRole(ctx, 'action'), night = byRole(ctx, 'ink'), stock = byRole(ctx, 'ground');
    // the sheet's size is data inside the spec line: read from the real words, never cut from the string on the page
    const m = ctx.real(sg).match(/(\d+) x (\d+) mm/), [w, h] = m ? [+m[1], +m[2]] : [594, 841];
    const ph = 548, pw = Math.round((ph * w) / h);
    const poster = `<div class="ta-poster" style="width:${pw}px;height:${ph}px;background:${night.hex};color:${stock.hex}"><div class="ta-poster__top"><p class="disp ta-poster__act" style="color:${red.hex}">${A(slot ? B.lines.others[0] : gig.to)}</p><p class="ta-poster__when">${A(gig.when)}</p></div><h2 class="disp ta-poster__h">${A(B.lines.primary)}</h2><div class="ta-poster__ft">${lg(ctx, 'horizontal', 150, { colourway: 'mono-light' })}</div></div>`;
    const dims = `<div class="ta-sgw" style="grid-template-rows:${ph}px 24px;grid-template-columns:${pw}px 64px">${poster}<span class="ta-dim ta-dim--v"><i></i><b class="num">${h} mm</b><i></i></span><span class="ta-dim ta-dim--h"><i></i><b class="num">${w} mm</b><i></i></span><span></span></div>`;
    const rows = [['Size', `<span class="num">${w} × ${h} mm</span>, portrait`], ['Ground', `${A(night.name)}, with ${A(stock.name)} type.`], ['Contrast', `${A(stock.name)} on ${A(night.name)}, ${fmtR(ctx, stock.hex, night.hex)}. ${A(red.name)} on ${A(night.name)}, ${fmtR(ctx, red.hex, night.hex)}.`],
      ['Headline', `The main line, in ${A(B.fonts.display.family)}, as large as the sheet allows.`], ['The lit line', `One short line over the date, in ${A(red.name)}. The one lit thing on the sheet.`], ['Logo', `${A(ctx.logo.labels.horizontal)} version in ${A(ctx.logo.labels['mono-light'])}, at the foot.`]];
    const side = `<div class="ta-sg__l"><p class="tk-lead ta-lead">One time, one line, and one lit thing, readable from across the street.</p><p class="ta-sg__spec">${A(sg)}</p>${hRule(ctx)}${fields(rows, 'ta-ff ta-ff--sg')}</div>`;
    return page(ctx, 'signage', `<div class="ta-sg">${side}${dims}</div>`, 'ta--signage');
  },

  // rows: the lead under the title, the mail as it arrives (its header as fact fields over the client's own hairline, the signature under the body),
  // then the three specs along the foot, each with its serial
  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card;
    const bd = tok(ctx, 'body'), lb = tok(ctx, 'label');
    const lines = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const sig = `<div class="ta-sig"><div class="ta-sig__logo">${lg(ctx, 'horizontal', 190, { colourway: 'mono-dark', color: 'var(--ink)' })}</div><div><p class="ta-sig__n" style="font-size:${bd.size}px">${A(e.person)}</p><p class="ta-sig__r" style="font-size:${lb.size}px">${A(e.role)}</p><p class="ta-sig__c" style="font-size:${lb.size}px">${A(c.contact)} · ${A(B.applications.site.url)}</p><p class="ta-sig__l ta-sig-tag">${A(B.lines.primary)}</p></div></div>`;
    const head = fields([['From', `${A(e.person)}, ${A(c.contact)}`], ['To', A(g.to)], ['Subject', A(g.subject)], ['Sent', `<span class="num">${A(g.time)}</span>`]], 'ta-ff ta-ff--mail');
    const mail = `<div class="ta-mail">${head}<div class="ta-mail__hr" aria-hidden="true"></div><div class="ta-mail__b"><div class="ta-mail__t">${lines}</div>${sig}</div></div>`;
    const specs = [['Logo', `${A(ctx.logo.labels.horizontal)} version in mono dark, 190 px wide. A mail client is a light ground.`], ['Type', `${A(B.fonts.body.family)}. Name at ${bd.size} px, weight 600. Role and contact at ${lb.size} px.`], ['Text', `Live text, not a picture, so it still reads with images off. Use Arial where ${A(B.fonts.body.family)} is not installed.`]];
    const foot = `<ol class="ta-es__specs">${specs.map(([a, t], i) => `<li><span class="tk-sn">${serial(i + 1, 2)}</span><h3 class="ta-es__sh">${a}</h3><p>${t}</p></li>`).join('')}</ol>`;
    return page(ctx, 'email-signature', `<p class="tk-lead ta-lead">The signature as it renders in a mail client: the logo, a name, a role and a way to reach us.</p>${mail}${foot}`, `ta--email${ctx.edition === 'slot' ? ' ta--slot' : ''}`);
  },

  // the screen after dark: Encore's tickets screen as shipped, built from the UI kit's own components in the dark mode, the whole page
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, X = S.example;
    const pct = Math.round(S.progress * 100);
    // a status is plain words in one colour, never a tinted pill: the engine's own chip, drawn here in the dark tokens
    const word = (id, label) => ui.statusChip(id, label ? { label } : {});
    const track = `<div class="ta-trk"><div class="ta-trk__top">${word('doors-open', S.status)}<span class="ta-trk__t">${A(B.ui.screen.title)}</span></div><h2 class="ui-display ta-trk__eta">${A(S.eta)}</h2><div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div><div class="ta-trk__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p class="ta-trk__p">${A(S.pickup)}</p>
<div class="ta-trk__act"><span class="ui-avatar" aria-hidden="true">${A(S.initials)}</span><div><p class="ta-trk__rn">${A(S.rider)}</p><p class="ta-trk__rs">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary', iconLeft: 'clock' })}</div>
<div class="ta-trk__facts"><div><p class="ta-trk__fl">${A(S.deliverToLabel)}</p><p class="ta-trk__fv">${A(S.deliverTo)}</p></div><div><p class="ta-trk__fl">${A(S.paidLabel)}</p><p class="ta-trk__fv num">${A(S.paid)}</p></div>${ui.btn(S.share, { variant: 'quiet', iconRight: 'arrow-right' })}</div></div>`;
    // gig rows lead with the date, as event lists do: month over day on Stage. The date is data inside the row's words, read from the
    // real string; the slot has no date to read, so its block numbers the item instead
    const stage = byRole(ctx, 'panel'), slot = ctx.edition === 'slot';
    const dateBlock = (d, i) => {
      const m = slot ? null : ctx.real(d.when).match(/(\d{1,2}) ([A-Z][a-z]{2})/);
      const [mo, dy] = m ? [m[2], m[1]] : ['Item', String(i + 1)];
      return `<span class="ta-date" style="background:${stage.hex};color:${inkOn(ctx, stage.hex)}"><span class="ta-date__m">${A(mo)}</span><span class="ta-date__d num">${A(dy)}</span></span>`;
    };
    const rows = S.deliveries.slice(0, 4).map((d, i) => ui.row({ lead: dateBlock(d, i), title: d.to, sub: d.when, end: d.price, chip: word(d.status) })).join('');
    const list = `<aside class="ta-dl"><h3 class="ta-dl__h">${A(X.crumbs[0])}</h3><ul class="ui-list">${rows}</ul></aside>`;
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="ta-bar__logo">${lg(ctx, 'horizontal', 130, { colourway: 'on-stage' })}</span><div class="ui-topbar__links">${ui.links(X.links, 0)}</div>${ui.btn(S.form.book, { size: 'sm' })}</nav>`;
    const win = `<div class="ui ta-win"><div class="ta-win__url"><span>${A(B.applications.site.url)}${slot ? '' : '/tickets'}</span></div>${bar}<div class="ta-win__body">${track}${list}</div></div>`;
    return page(ctx, 'digital', win, 'ta--night ta--digital');
  },

  // the brand on one page: three tickets off one roll (the primary line on the hard ticket, the other lines on the two after it),
  // the colours as a strip by share, and the three rules along the foot in a run of serials
  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, [d, b] = [f.display, f.body], rev = B.logo.colourways.reversed;
    const red = byRole(ctx, 'action'), night = byRole(ctx, 'ink'), stage = byRole(ctx, 'panel');
    const [first, ...rest] = [B.lines.primary, ...B.lines.others];
    const hole = ctx.roles.light.surface;
    const W = 720, H = Math.round(W / 2.75), bw = Math.round(W * 4 / 5.5), sw = W - bw;
    const faces = fields([['Display', `${A(d.family)}, ${d.weights.join(', ')}`], ['Body', `${A(b.family)}, ${b.weights.join(', ')}`]], 'ta-ff ta-ff--faces');
    const hard = `<div class="ta-tk" style="min-height:${H}px;color:${inkOn(ctx, red.hex)}"><div class="ta-tk__body" style="width:${bw}px;background:${red.hex}"><div class="ta-tk__logo">${ctx.logo.html('reversed', { width: fit(ctx, 'reversed', 240, 56), color: rev.name, label: 'Logo' })}</div><p class="disp ta-tk__line">${A(first)}</p>${faces}</div>
<div class="ta-tk__stub" style="width:${sw}px;background:${red.hex}">${perf(hole, { d: 4, p: 10 })}<span class="tk-sn">${serial(1)}</span><p class="ta-tk__stubname">${A(B.name)}</p></div></div>`;
    const small = (line, c, n) => `<div class="ta-tk ta-tk--sm" style="color:${inkOn(ctx, c.hex)}"><div class="ta-tk__body" style="background:${c.hex}"><p class="disp ta-tk__line2">${A(line)}</p></div><div class="ta-tk__stub" style="background:${c.hex}">${perf(hole, { d: 4, p: 10 })}<span class="tk-sn">${serial(n)}</span></div></div>`;
    const smalls = rest.map((l, i) => small(l, [night, stage][i % 2], i + 2)).join('');
    const strip = bySize(ctx).map((c) => `<li class="${edgeOn(ctx, c.hex)}" style="flex:${c.share};background:${c.hex};color:${inkOn(ctx, c.hex)}"><b>${A(c.name)}</b><span class="num">${Math.round(c.share * 100)}%</span><span class="tk-mono">${A(c.hex)}</span></li>`).join('');
    const rules = G.rules.map((r, i) => `<li><span class="tk-sn">${serial(i + 1, 2)}</span><h3 class="ta-sum__rh">${A(r.title)}</h3><p>${A(r.text)}</p></li>`).join('');
    return page(ctx, 'summary', `<div class="ta-sum__tks">${hard}<div class="ta-sum__sm">${smalls}</div></div><ul class="ta-strip">${strip}</ul>${hRule(ctx)}<ol class="ta-sum__rules">${rules}</ol>`, `ta--summary${ctx.edition === 'slot' ? ' ta--slot' : ''}`);
  },

  // who to ask is the body you keep, set large with the version as fact fields; beyond a perforation the stub carries the running order
  // of sections as serials, and what is not in this document
  'contact-scope'(ctx) {
    const B = ctx.brand;
    const secs = ctx.sections.map((s) => `<li><span class="tk-sn">${serial(s.n, 2)}</span><span class="ta-cs__st">${A(s.title)}</span></li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c]) => `<li><b>${a}.</b> ${c}</li>`).join('');
    const ver = fields([['Version', `<span class="num">${A(B.version.number)}</span>`], ['Date', A(ctx.date)], ['Change', 'First release.']], 'ta-ff ta-ff--ver');
    const body = `<div class="ta-cs__a"><h2 class="disp ta-cs__h">Who to ask</h2><p class="ta-cs__p">${A(B.contact.owner)} owns this document. Write to <span class="tk-mono ta-cs__mail">${A(B.contact.email)}</span> for a logo file, a missing asset or an exception.</p><div class="ta-cs__v"><h3 class="tk-h3">Version history</h3>${ver}</div></div>`;
    const stub = `<div class="ta-cs__stub">${vRule(ctx)}<div><h3 class="tk-h3">In this document</h3><ol class="ta-cs__in">${secs}</ol></div>${hRule(ctx)}<div><h3 class="tk-h3">Not in this document</h3><ul class="ta-cs__not">${not}</ul></div></div>`;
    return page(ctx, 'contact-scope', `<div class="ta-cs">${body}${stub}</div>`, 'ta--contact');
  },
};
