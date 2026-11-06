// Guidelines pages for theme 05, Catalogue: business-card, social, signage, email-signature, digital, summary, contact-scope.
// Styles are in css-p-apps.js (classes start ka-). Every page is an open sheet from the gate (call number top left, rod hole at
// the foot), carrying the catalogue's furniture as its device: guide-card tabs dividing the sections, text hung on the card's
// first and second indention, "See" references and the tracings line at the foot. The business card is the one page here that
// shows a card whole. Label holders belong to drawer fronts, so none is used here.
// The sign is authored in its own units and shown with a transform scale; the posts are drawn at page size, so a slot chip
// inside one is never shrunk. Every value comes from ctx; no brand name or hex is written here.
import { A, nameOf, fit } from './helpers.js';
import { sheet, inkOn, same } from './guidelines-k.js';
import { typeToken } from '../../engine/typeToken.js';

const px = (n) => +n.toFixed(2);
const tok = (ctx, t) => typeToken(ctx.brand.type.scale, t);
const full = 'width:100%;height:100%';
// a drawing at its own size w x h, shown at k
const scaled = (k, w, h, inner, cls = '', st = '') => `<div class="ka-sc ${cls}" style="width:${px(w * k)}px;height:${px(h * k)}px"><div class="ka-sc__in" style="width:${w}px;height:${h}px;transform:scale(${k});${st}">${inner}</div></div>`;
const ab = (x, y, w, h, st = '', inner = '', cls = '') => `<div class="ka-ab ${cls}" style="left:${px(x)}px;top:${px(y)}px;${w ? `width:${px(w)}px;` : ''}${h ? `height:${px(h)}px;` : ''}${st}">${inner}</div>`;
// the brand's own name for a colour by its hex
const cname = (ctx, hex) => A((ctx.colours.find((c) => same(c.hex, hex)) || { name: '' }).name);
// numbered entries, as on the foot of a catalogue card: "1. ... 2. ..."
const tracings = (items, cls = '') => `<p class="k-trace ka-trace ${cls}">${items.map((t, i) => `<span class="num">${i + 1}.</span> ${t}`).join(' ')}</p>`;
// a cross-reference to another page of this document
const seeAlso = (ctx, id) => { const p = ctx.pages.find((x) => x.id === id); return p ? `${A(p.title)}, page <span class="num">${ctx.pageNo(id)}</span>` : ''; };
// a guide card's top edge with its tab standing up from it, cut first (left), second (centre) or third (right) across the width,
// as a real guide set is cut. The typefaces page is the model.
const guide = (cut, label, body, cls = '') => `<section class="ka-gc ka-gc--${cut} ${cls}"><h2 class="ka-gc__t">${label}</h2>${body}</section>`;

export const pApps = {
  // the card at 6 px to the millimetre, front and back staggered down the page, each captioned under it as printed matter is;
  // the card's type styles are its tracings at the foot
  'business-card'(ctx) {
    const B = ctx.brand, L = ctx.logo, c = B.applications.card, rev = B.logo.colourways.reversed;
    const [cw, ch] = [90, 55]; // Australian standard card, mm
    const pt = (n) => Math.round(n * (72 / 25.4) / 6); // px on the page at 6 px to the mm, as points in print
    // the logo has the top 60% of the face to itself; the line sits under that zone, so a slot frame never runs into it
    const front = `<div class="ka-bc ka-bc--front"><div class="ka-bc__logo">${L.html('reversed', { width: fit(ctx, 'reversed', 380, 150), color: rev.name, label: 'Your logo goes here' })}</div><p class="ka-bc__line">${A(B.lines.primary)}</p></div>`;
    const back = `<div class="ka-bc ka-bc--back"><div class="ka-bc__mark">${L.html('symbol', { width: fit(ctx, 'symbol', 72, 72), label: 'Logo' })}</div><div class="ka-bc__who"><p class="ka-bc__nm k-disp">${A(c.person)}</p><p class="ka-bc__rl">${A(c.role)}</p><p class="ka-bc__ct">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
    const cap = (t) => `<figcaption class="ka-cap">${t}</figcaption>`;
    const style = (cap, face, size) => `${cap}, ${face}, <span class="num">${size}</span> px on the page, <span class="num">${pt(size)}</span> pt printed.`;
    const inner = `<p class="k-lead">Printed <span class="num">${cw} × ${ch}</span> mm, shown at <span class="num">6</span> px to the millimetre.</p>
<div class="ka-bcs"><figure class="ka-bcf">${front}${cap(`Front. ${A(L.labels.reversed)} logo and the line.`)}</figure><figure class="ka-bcf ka-bcf--back">${back}${cap('Back. Name, role and contact.')}</figure></div>
<div class="ka-foot">${tracings([style('Name', A(B.fonts.display.family), 28), style('Role', A(B.fonts.body.family), 15), style('Contact', A(B.fonts.body.family), 15)])}</div>`;
    return sheet(ctx, 'business-card', inner, 'ka-pg-bc');
  },

  // three posts on the shelf, each with a plain caption under it giving the format and size: the story stands tall on the right.
  // A post is drawn at page size (its parts placed at k of their authored position), so nothing inside it is transformed.
  social(ctx) {
    const B = ctx.brand, S = B.applications.social, L = ctx.logo, R = ctx.roles.light, night = B.logo.colourways['mono-light'];
    const post = (k, w, h, bg, parts) => `<div class="ka-post" style="width:${px(w * k)}px;height:${px(h * k)}px;background:${bg}">${parts(k)}</div>`;
    // the copy block: the line at the top of the block, the logo at its foot, so a longer line (or a slot chip) pushes into the
    // space between them, never onto the logo. x, y, w and the clear foot pad are in the post's own units
    const copy = (k, x, y, w, pad, h, size, color, txt, lw, o) => ab(x * k, y * k, w * k, (h - y - pad) * k, 'display:flex;flex-direction:column;justify-content:space-between;gap:8px',
      `<div class="k-disp ka-th" style="font-size:${px(size * k)}px;line-height:1;color:${color}">${A(txt)}</div><div class="ka-post__logo">${L.html('horizontal', { width: Math.round(lw * k), label: 'Logo', ...o })}</div>`);
    const photo = (k, h, id) => ab(0, 0, 1080 * k, h * k, '', ctx.photo(id, { style: full, slotNote: false }));
    const square = post(0.24, 1080, 1080, R.action, (k) => copy(k, 96, 96, 880, 96, 1080, 150, R.surface, S[0], 380, { colourway: 'reversed', color: B.logo.colourways.reversed.name }));
    const portrait = post(0.24, 1080, 1350, R.surface, (k) => `${photo(k, 660, 'cover')}${copy(k, 72, 716, 936, 64, 1350, 96, R.text, S[1], 330, { colourway: 'colour', color: R.text })}`);
    const story = post(0.36, 1080, 1920, night.ground, (k) => `${photo(k, 1000, 'parcel')}${copy(k, 72, 1070, 936, 270, 1920, 100, night.name, S[2], 300, { colourway: 'mono-light', color: night.name })}`);
    const fig = (el, n, sz, c) => `<figure class="ka-sf">${el}<figcaption><p class="ka-cap">${n}, <span class="num">${sz}</span>.</p><p class="ka-sf__c">${c}</p></figcaption></figure>`;
    const inner = `<p class="k-lead">Three posts, one voice: a line from the brand, set in ${A(B.fonts.display.family)}, with the horizontal logo under it.</p>
<div class="ka-shelf"><div class="ka-shelf__l">${fig(square, 'Square', '1080 × 1080 px', `The line on ${cname(ctx, R.action)}, in ${cname(ctx, R.surface)}.`)}${fig(portrait, 'Portrait', '1080 × 1350 px', `A photo, then the line in ${cname(ctx, R.text)} on ${cname(ctx, R.surface)}.`)}</div>${fig(story, 'Story', '1080 × 1920 px', 'Keep type 250 px clear of the top and bottom.')}</div>
<p class="ka-see"><b>See also</b> ${seeAlso(ctx, 'photo-direction')}.</p>`;
    return sheet(ctx, 'social', inner, 'ka-pg-soc');
  },

  // the window sign large, its line read off the brand's own copy, captioned full width under it; the sign's specs are the
  // tracings at the foot
  signage(ctx) {
    const B = ctx.brand, real = ctx.real(B.applications.signage);
    // the size and the line are parsed from the sample text; the line shown is the brand line it names, so the slot edition keeps its placeholder
    const [w, h] = (real.match(/(\d+) x (\d+)/) || [0, 594, 841]).slice(1).map(Number), k = 508 / w; // 508 px wide, so the slot edition (a two-line tracings line) still keeps 16 px under the caption
    const said = real.slice(real.indexOf(': ') + 2);
    const lines = [B.lines.primary, ...B.lines.others], head = lines.find((l) => ctx.real(l) === said) || B.lines.primary;
    const g = ctx.logo.geos.reversed, lh = Math.ceil((300 * g.h) / g.w), ly = h - 48 - lh;
    // 73 units on the sign is 64 px on the page: the line takes two lines on the sign, not four
    const sign = `${ab(48, 52, w - 96, 0, `font-size:${px(64 / k)}px;line-height:1.02;color:var(--dark-ink)`, A(head), 'k-disp ka-th ka-sign__h')}${ab(48, ly - 32 - 78, w - 96, 0, 'font:500 30px/1.3 var(--body);color:var(--dark-ink);max-width:380px', A(B.lines.others[1]))}${ab(48, ly, 0, 0, '', ctx.logo.html('reversed', { width: 300, color: 'var(--dark-ink)', label: 'Your logo goes here' }))}`;
    const inner = `<p class="k-lead">A sign for the window. One line, large enough to read from the street, with the logo and a second line under it.</p>
<figure class="ka-sg">${scaled(k, w, h, sign, 'ka-sign')}<figcaption class="ka-sg__spec">${ctx.edition === 'slot' ? A(B.applications.signage) : `Window sign, <span class="num">${w} × ${h}</span> mm.`}</figcaption></figure>
<div class="ka-foot">${tracings([`${A(B.fonts.display.family)} for the line.`, `${A(B.fonts.body.family)} <span class="num">500</span> for the second line.`, `${A(ctx.logo.labels.reversed)} version, on ${cname(ctx, ctx.roles.light.action)}.`])}</div>`;
    return sheet(ctx, 'signage', inner, 'ka-pg-sgn');
  },

  // the signature in a mail client at the page's full measure, plain numerals in the right margin level with the logo, the name
  // and the live text; the notes hang on the first indention under it
  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card;
    const bd = tok(ctx, 'body'), sm = tok(ctx, 'small');
    const mk = (n) => `<span class="ka-mk num" aria-hidden="true">${n}</span>`;
    const lines = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const sig = `<div class="ka-sig"><div class="ka-sig__logo">${mk(1)}${ctx.logo.html('horizontal', { width: 190, label: 'Your logo goes here' })}</div><p class="ka-sig__n" style="font-size:${bd.size}px">${mk(2)}${A(e.person)}</p><p class="ka-sig__r" style="font-size:${sm.size}px">${A(e.role)}</p><p class="ka-sig__c" style="font-size:${sm.size}px">${mk(3)}${A(c.contact)}<br>${A(B.applications.site.url)}</p><p class="ka-sig__l" style="font-size:${sm.size}px">${A(B.lines.primary)}</p></div>`;
    const mail = `<div class="ka-mail"><div class="ka-mail__h"><p><i class="ka-mail__k">From</i><span class="ka-mail__v">${A(e.person)}, ${A(c.contact)}</span></p><p><i class="ka-mail__k">To</i><span class="ka-mail__v">${A(g.to)}</span></p><p><i class="ka-mail__k">Subject</i><b class="ka-mail__v">${A(g.subject)}</b></p><p class="ka-mail__t num">${A(g.time)}</p></div><div class="ka-mail__b">${lines}${sig}</div></div>`;
    const notes = [['Logo', `${A(ctx.logo.labels.horizontal)} version, <span class="num">190</span> px wide. ${A(B.logo.when.horizontal)}`], ['Type', `${A(B.fonts.body.family)}. Name at <span class="num">${bd.size}</span> px, weight <span class="num">500</span>. Role and contact at <span class="num">${sm.size}</span> px.`], ['Text', `Live text, not a picture, so it still reads with images off. Use Georgia where ${A(B.fonts.body.family)} is not installed.`]];
    const list = notes.map(([a, t], i) => `<li><span class="ka-mk num">${i + 1}</span><p><b>${a}.</b> ${t}</p></li>`).join('');
    const inner = `<p class="k-lead">The signature as it renders in a mail client: the logo, a name, a role and a way to reach us. Here it closes an email to a customer.</p>
${mail}<ol class="ka-notes">${list}</ol>
<p class="ka-see"><b>See also</b> ${seeAlso(ctx, 'business-card')}, for the same name, role and contact in print.</p>`;
    return sheet(ctx, 'email-signature', inner, 'ka-pg-em');
  },

  // a page of the site, built from the UI kit, the browser full width; the components it uses are its tracings
  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, first = S.deliveries[0];
    const pct = Math.round(S.progress * 100);
    // the list rows, as ui.deliveryRows draws them, with each state's word asked for through ctx.ph: the engine's status labels
    // have no placeholder of their own, so the slot edition would print the sample brand's words
    const stateOf = (id) => (ctx.status.find((s) => s.id === id) || { label: '' }).label;
    const rows = `<ul class="ui-list">${S.deliveries.slice(0, 4).map((d) => ui.row({ lead: '<i class="ka-cvr" aria-hidden="true"></i>', title: d.to, sub: d.when, end: d.price, chip: ui.statusChip(d.status, { label: ctx.ph('ui.screen.content.status', stateOf(d.status)) }) })).join('')}</ul>`;
    const bar = `<nav class="ui-topbar" aria-label="Main"><span class="ka-win__logo">${ctx.logo.html('horizontal', { width: 112, label: 'Logo' })}</span><div class="ui-topbar__links">${ui.links(S.example.links.map(([t]) => [t]), 0)}</div>${ui.btn(S.form.book, { size: 'sm' })}</nav>`;
    const page = `<div class="ka-bk">${ui.crumbs([...S.example.crumbs, first.to])}<div class="ka-bk__top">${ui.statusChip('pre-order', { label: S.status })}<span class="ka-bk__eta">${A(S.eta)}</span></div><h2 class="ui-display ka-bk__h">${A(first.to)}</h2><p class="ka-bk__by">${A(first.when)}</p>
<div class="ui-progress"><span class="ui-progress__bar"><i style="width:${pct}%"></i></span><span class="ui-progress__dot" style="left:${pct}%"></span></div><div class="ka-bk__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div><p class="ka-bk__p">${A(S.pickup)}</p>
<div class="ka-bk__au"><span class="ui-avatar" aria-hidden="true">${ctx.edition === 'slot' ? ui.icon('user', 18) : A(S.initials)}</span><div><p class="ka-bk__an">${A(S.rider)}</p><p class="ka-bk__as">${A(S.riderNote)}</p></div>${ui.btn(S.call, { variant: 'secondary' })}</div>
<div class="ka-bk__facts"><div><p class="ka-bk__fl">${A(S.deliverToLabel)}</p><p class="ka-bk__fv">${A(S.deliverTo)}</p></div><div><p class="ka-bk__fl">${A(S.paidLabel)}</p><p class="ka-bk__fv num">${A(S.paid)}</p></div>${ui.btn(S.form.book, {})}${ui.btn(S.share, { variant: 'quiet' })}</div></div>`;
    const list = `<div class="ka-dl"><h3 class="ka-dl__h">${A(S.example.tabs[0])}</h3>${rows}</div>`;
    const win = `<div class="ui ka-win"><div class="ka-win__url"><span class="k-mono">${A(B.applications.site.url)}</span></div>${bar}<div class="ka-win__body">${page}${list}</div></div>`;
    const inner = `<p class="k-lead">A page from the <span class="k-mono">${A(B.applications.site.url)}</span> site, built from the UI kit, with a list from the same kit under it.</p>
${win}
<div class="ka-foot">${tracings(['Top bar and links.', 'Breadcrumbs.', 'Status words.', 'Progress bar.', 'Buttons: primary, secondary and quiet.', 'List rows.'])}</div>`;
    return sheet(ctx, 'digital', inner, 'ka-pg-dig');
  },

  // the main entry for the brand, hung on the card's two indentions (drawn as hairlines): the logo as the heading, then (under it) the line on
  // the first indention and the other lines, as numbered entries, on the second. Guide tabs divide the colours, by share of a page, and the rules; the faces
  // are the tracings line at the foot, naming the faces the entry is set in
  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, [d, b] = [f.display, f.body];
    const cs = ctx.colours.slice().sort((x, y) => y.share - x.share);
    const tabs = cs.map((c) => `<li class="ka-st ph-tight" style="flex:${c.share} 1 0;background:${c.hex};color:${inkOn(ctx, c.hex)}"><span class="num">${Math.round(c.share * 100)}%</span></li>`).join('');
    const key = cs.map((c) => `<li><b>${A(c.name)}</b> <span class="k-mono">${A(c.hex)}</span></li>`).join('');
    
    const rules = G.rules.map((r, i) => `<li><span class="ka-rn num">${i + 1}.</span><div><h3 class="ka-rh">${A(r.title)}</h3><p class="ka-rp">${A(r.text)}</p></div></li>`).join('');
    const bw = b.weights.filter((w) => w <= 500);
    const faces = [`${A(d.family)}, display, weight <span class="num">${d.weights.join(', ')}</span>.`, `${A(b.family)}, body, weights <span class="num">${bw.join(' and ')}</span>.`];
    const inner = `<div class="ka-sum"><div class="ka-entry__logo">${ctx.logo.html('colour', { width: 220, label: 'Your logo goes here' })}</div>
<div class="ka-sum__b"><i class="ka-ind ka-ind--1" aria-hidden="true"></i><p class="ka-entry__p k-disp">${A(B.lines.primary)}</p>
<div class="ka-sum__r"><i class="ka-ind ka-ind--2" aria-hidden="true"></i>${tracings(B.lines.others.map((l) => A(l)), 'ka-entry__o')}
${guide(1, 'The colours, by share of a page', `<ol class="ka-stabs">${tabs}</ol><ul class="ka-key">${key}</ul>`)}
${guide(3, 'The rules', `<ol class="ka-rules">${rules}</ol>`)}
</div></div></div>
<div class="ka-foot ka-foot--sum">${tracings(faces)}</div>`;
    return sheet(ctx, 'summary', inner, 'ka-pg-sum');
  },

  // who to ask, what is in this document and what is not, and the version, each behind its own guide tab with the cuts stepped
  // left, centre, right and left again; the sections are one tracings paragraph on the first indention
  'contact-scope'(ctx) {
    const B = ctx.brand;
    const range = (s) => { const a = s.pages[0].no, z = s.pages.at(-1).no; return a === z ? `page <span class="num">${a}</span>` : `pages <span class="num">${a}</span> to <span class="num">${z}</span>`; };
    const secs = ctx.sections.map((s) => `${A(s.title)}, ${range(s)}.`);
    const not = [['Logo files, palettes and fonts', 'See the brand kit.'], ['Interface components and tokens', 'See the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c]) => `<li><b>${a}.</b> ${c}</li>`).join('');
    const inner = `<div class="ka-cs">
${guide(1, 'Who to ask', `<p class="ka-ask__p">${A(B.contact.owner)} owns this document. Write to <span class="k-mono">${A(B.contact.email)}</span> for a logo file, a missing asset or an exception.</p>`, 'ka-gc--lg')}
${guide(2, 'In this document', tracings(secs, 'ka-in1'))}
${guide(3, 'Not in this document', `<ul class="ka-notl">${not}</ul>`)}
${guide(1, 'Version history', `<p class="ka-coll">Version <span class="num">${A(B.version.number)}</span>, <span class="num">${A(ctx.date)}</span>. First release.</p>`)}
</div>
<p class="ka-see"><b>See also</b> ${seeAlso(ctx, 'contents')}.</p>`;
    return sheet(ctx, 'contact-scope', inner, 'ka-pg-cs');
  },
};
