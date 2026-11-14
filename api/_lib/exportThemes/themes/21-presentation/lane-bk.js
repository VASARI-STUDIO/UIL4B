// Lane bk: theme 21's own brand book. The deck turned into a long read: every slide becomes a full-width band you scroll through,
// still one idea a band, set on the brand's colour fields, with the deck's running head (section ref and title left, book name and a
// three-digit folio right) at the top of each band. Fields meet at straight edges and stack into stripes on a phone.
// The engine wraps this in its shell (skip link, section nav, light and dark switch) and owns the behaviour: data-copy, data-tester-*.
// Nothing here names a brand's colour, photo or logo: roles, colourways and shot uses are read from the brand.
import { plateImg } from '../../engine/plate.js';
import { onceRe, sentences } from './lane-g3-kit.js';
import { screenContent } from './once.js';
import { esc as A } from '../../engine/brand.js';
import { outline } from '../../engine/logo.js';
import { loadFont } from '../../engine/nodeFont.js';
import { bookCss } from './lane-bk-css.js';
// A brand that says a word once (Long Room: "Say free once") prints it on the cover, the lines page, the voice rules and the one poster, not on every type sample.
// sayLine is a whole brand line for the other places: the primary line, or where that carries the word, the brand's other line.
const carries = (ctx, t) => !!onceRe(ctx)?.test(t || '');
const sayLine = (ctx) => { const B = ctx.brand; return carries(ctx, B.lines.primary) ? (B.lines.others.find((l) => !carries(ctx, l)) || B.lines.primary) : B.lines.primary; };
// the type sample's headline and paragraph, without the word
const sampleHead = (ctx) => (carries(ctx, ctx.brand.type.sample.headline) ? sayLine(ctx) : ctx.brand.type.sample.headline);
// a text without the sentences that carry the word; the text as it is for a brand with no such rule
const dropSay = (ctx, t) => (onceRe(ctx) ? sentences(t).filter((x) => !carries(ctx, x)).join(' ') : t);
const samplePara = (ctx) => { const p = ctx.brand.type.sample.paragraph; return onceRe(ctx) ? (sentences(p).filter((t) => !carries(ctx, t)).join(' ') || p) : p; };
// the application's social lines: the ones without the word, then the first sentence of the short boilerplate
const socialLines = (ctx) => {
  const B = ctx.brand, s = B.applications.social || [];
  if (!onceRe(ctx)) return s;
  const ok = s.filter((t) => !carries(ctx, t)), more = sentences(B.voice.boilerplate25).find((t) => !carries(ctx, t));
  return [ok[0], ok[1], ok[2] || more].map((t, i) => t || s[i]);
};

export { bookCss };

// ---- colour by role, and the ink that reads on a field ----
const L = (ctx) => ctx.roles.light;
const DK = (ctx) => ctx.roles.dark;
const byRole = (ctx, role) => ctx.colours.find((c) => c.role === role);
const lower = (h) => String(h).toLowerCase();
const inkOn = (ctx, hex) => (ctx.ratio(L(ctx).text, hex) >= ctx.ratio(L(ctx).surface, hex) ? L(ctx).text : L(ctx).surface);
// the deck's chrome rule: the quiet tone that reaches 4.5:1 on the field, else the best of text, ground and dark soft text
const chromeOn = (ctx, hex) => {
  const q = [L(ctx).quiet, L(ctx).quietOnSunken, DK(ctx).quiet].find((c) => ctx.ratio(c, hex) >= 4.5);
  return q || [L(ctx).text, L(ctx).surface, DK(ctx).textSoft].sort((a, b) => ctx.ratio(b, hex) - ctx.ratio(a, hex))[0];
};
// reading text on a field: the soft text tone of the matching mode when it passes, else the ink
const softOn = (ctx, hex) => {
  const ink = inkOn(ctx, hex), soft = lower(ink) === lower(L(ctx).text) ? L(ctx).textSoft : DK(ctx).textSoft;
  return ctx.ratio(soft, hex) >= 4.5 ? soft : ink;
};
const nameOfHex = (ctx, hex) => [...ctx.colours, ...ctx.tones].find((c) => lower(c.hex) === lower(hex))?.name || hex;
// the brand's own colourway for a ground; the one-colour versions only when nothing else is drawn for it
const cwOnGround = (ctx, hex) => Object.entries(ctx.brand.logo.colourways).filter(([, v]) => lower(v.ground) === lower(hex)).sort(([a], [b]) => a.startsWith('mono') - b.startsWith('mono'))[0]?.[0];
// the logo colourway for a field: the brand's own for that ground, else the one-colour version in the field's ink
const cwFor = (ctx, hex) => cwOnGround(ctx, hex) || (lower(inkOn(ctx, hex)) === lower(L(ctx).text) ? 'mono-dark' : 'mono-light');
const rgbOf = (ctx, hex) => { const [r, g, b] = ctx.C.hexToRgb(hex); return `rgb(${r}, ${g}, ${b})`; };
// the colours a field gets: background, ink, chrome and reading tone as custom properties, each pair checked
const fieldStyle = (ctx, hex, what, size = 12) => {
  const ink = inkOn(ctx, hex);
  ctx.pair(ink, hex, { size: Math.max(size, 15), what });
  return `background:${hex};color:${ink};--q:${chromeOn(ctx, hex)};--soft:${softOn(ctx, hex)};--ink:${ink};--bg:${hex}`;
};

// ---- measured type: a display size that fits the longest word into a share of its container, as cqw with a cap ----
const face = (ctx, role, weight) => ctx.faces.find((f) => f.role === role && f.style !== 'italic' && f.weight === weight) || ctx.faces.find((f) => f.role === role && f.style !== 'italic');
const dispW = (ctx) => ctx.brand.fonts.display.weights[ctx.brand.fonts.display.weights.length - 1];
const advance = (ctx, role, weight, text) => { const o = outline(loadFont(face(ctx, role, weight).stem), text, 100, role === 'display' ? -0.01 : 0); return ((o.x2 - Math.min(0, o.x1)) / 100) * 1.04; };
// byLen: a sentence sets as a paragraph of display type, so the cap steps down with its length (a word stays a poster)
const lenCap = (t, cap) => { const n = String(t).length; return Math.min(cap, n > 90 ? 40 : n > 50 ? 56 : n > 30 ? 96 : cap); };
function fitSize(ctx, texts, share, cap, { role = 'display', weight, whole = false, byLen = false } = {}) {
  if (ctx.real) texts = texts.map((t) => ctx.real(t)); // slot: size from the brand's real words, not from the placeholder marks
  const w = weight ?? (role === 'display' ? dispW(ctx) : 400);
  if (byLen) cap = lenCap(texts.join(' '), cap);
  const widest = Math.max(...texts.flatMap((t) => (whole ? [t] : String(t).split(/\s+/))).filter(Boolean).map((x) => advance(ctx, role, w, x)));
  return `min(${cap}px, ${((share * 100) / widest).toFixed(3)}cqw)`;
}

// ---- photographs: the crop the brand asks for, as an object-position on a box of the crop's shape ----
function jpegSize() { throw new Error('theme 21: photograph files are not read by the server export'); }
function framing(ctx, s) {
  const n = s.photo ? jpegSize() : null, c = s.crop;
  if (!n || !c) return { pos: '50% 50%', ratio: n ? n.w / n.h : 1.5 };
  const p = (o, size, full) => (full > size ? ((o / (full - size)) * 100).toFixed(1) : '50');
  return { pos: `${s.focus && s.focus.x != null ? s.focus.x : p(c.x, c.w, n.w)}% ${p(c.y, c.h, n.h)}%`, ratio: c.w / c.h }; // focus.x: where across the photo a narrower frame sits
}
// the shot for a use: the first photo that asks for it, else the first photo with no use of its own, never one already used
function shotFor(ctx, use, used) {
  const shots = ctx.brand.imagery.shots.filter((s) => s.photo && !used.has(s.id));
  const s = shots.find((x) => (x.use || []).includes(use)) || shots.find((x) => !(x.use || []).length);
  if (s) used.add(s.id);
  return s || null;
}
const credit = (s) => `${A(s.caption || s.alt)}.${s.credit && !s.generated ? ` Photo: ${A(s.credit)}.` : ''}`;

// ---- controls the engine script drives ----
const copyBtn = (label, value, what) => `<button type="button" class="bk-btn pz-btn" data-copy="${A(value)}" data-copy-label="${A(what)}" aria-label="${A(label + ' ' + what)}"><span class="bk-btn__t">${A(label)}</span></button>`;
const valBtn = (kind, value, name) => `<button type="button" class="bk-btn pz-val" data-copy="${A(value)}" data-copy-label="${A(name + ' ' + kind)}" aria-label="Copy ${kind} ${A(value)}, ${A(name)}"><span class="pz-val__k">${kind}</span><span class="bk-btn__t">${A(value)}</span></button>`;
const dl = (f, label, text) => (f ? `<a class="pz-dl" href="${A(f.href)}" download aria-label="Download ${A(label)}, ${A(f.ext)}, ${A(f.sizeText)}">${A(text || f.ext)}</a>` : '');

// ---- the band: one slide of the deck, full width, with the running head at its top ----
// st carries the folio across the book; a band's ref is section.number within the section
function head(ctx, st, sec, title, { h2 = false } = {}) {
  st.n += 1; st.folio += 1;
  const ref = `${sec.n}.${st.n}`, folio = String(st.folio).padStart(3, '0');
  const tag = h2 ? 'h2' : 'p';
  return {
    left: `<${tag} class="pz-hl"${h2 ? ` id="h-${sec.id}"` : ''}><b class="num">${ref}</b> ${A(title)}</${tag}>`,
    right: `<p class="pz-hr num"><span>${A(ctx.brand.name)} brand book</span> <b>${folio}</b></p>`,
  };
}
// a band on the page ground (follows the light and dark preview) or on one brand colour (fixed)
function band(ctx, st, sec, title, inner, { hex, cls = '', h2 = false, what = 'book band' } = {}) {
  const h = head(ctx, st, sec, title, { h2 });
  const style = hex ? ` style="${fieldStyle(ctx, hex, `${what} ${title}`)}"` : '';
  return `<div class="pz-band ${hex ? 'pz-f' : 'pz-g'} ${cls}"${style}><div class="pz-hd">${h.left}${h.right}</div>${inner}</div>`;
}
// a band split into fields that meet at straight edges: the head's left part sits on the first field, its right part on the last
function split(ctx, st, sec, title, fields, { cls = '', h2 = false, endAt } = {}) {
  const h = head(ctx, st, sec, title, { h2 });
  const last = endAt ?? fields.length - 1;
  const cells = fields.map((f, i) => {
    const style = f.hex ? fieldStyle(ctx, f.hex, `${f.what || 'book field'} ${title}`) : '';
    const hd = (i === 0 ? h.left : '') + (i === last ? h.right : '');
    return `<div class="pz-cell ${f.hex ? 'pz-f' : 'pz-g'} ${f.cls || ''}"${style || f.style ? ` style="${style}${f.style || ''}"` : ''}><div class="pz-hd${i === 0 ? '' : ' is-end'}">${hd}</div>${f.html}</div>`;
  }).join('');
  return `<div class="pz-split ${cls}">${cells}</div>`;
}
const section = (sec, inner) => `<section class="bk-sec pz-sec" id="${sec.id}" aria-labelledby="h-${sec.id}">${inner}</section>`;
const words = (n) => ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'][n] || String(n);

// ---- 1 Overview: the cover, what the brand is, and its three traits as three fields ----
function overview(ctx, st) {
  const B = ctx.brand, sec = { n: 1, id: 'overview' }, rev = B.logo.colourways.reversed, used = st.used;
  st.n = 0;
  const shot = shotFor(ctx, 'cover', used), act = L(ctx).action, panel = L(ctx).sunken, text = byRole(ctx, 'text')?.hex || L(ctx).text;
  ctx.pair(rev.name, rev.ground, { size: 15, what: 'book cover band' });
  // the cover: the photograph at full exposure, nothing on it; the logo and every word on the solid band under it
  let top;
  if (shot) { const fr = framing(ctx, shot); top = `<figure class="pz-cover__ph" style="--ar:${fr.ratio.toFixed(4)}">${ctx.photo(shot.id, { cls: 'pz-img', pos: fr.pos })}</figure>`; }
  else {
    // no photograph: the field carries the brand's own entry times, as the guidelines cover does, instead of an empty slab
    const c = (B.ui && B.ui.screen && B.ui.screen.content) || {}, tone = (id) => ((B.ui.status || []).find((x) => x.id === id) || {}).tone;
    const rows = (c.deliveries || []).filter((d) => tone(d.status) !== 'danger').slice(0, 4);
    top = rows.length >= 2
      ? `<div class="pz-cover__tt" style="${fieldStyle(ctx, act, 'book cover entry times')}"><p class="pz-l pz-cover__tth">${A(c.paidLabel || 'Entry')} times</p><ul class="pz-cover__ttl">${rows.map((d) => { const [date, time] = String(d.when).split(/,\s*/); return `<li><span class="pz-cover__ttd">${A(date)}</span><span class="pz-d pz-cover__ttt num">${A((time || '').replace(/(\d) ([ap]m)\b/g, '$1 $2'))}</span><span class="pz-cover__ttw">${A(d.to)}</span></li>`; }).join('')}</ul></div>`
      : `<div class="pz-cover__field" style="background:${act}" aria-hidden="true"></div>`;
  }
  const quiet = chromeOn(ctx, rev.ground);
  const cover = `<div class="pz-cover">${top}<div class="pz-cover__band" style="background:${rev.ground};color:${rev.name};--q:${quiet}">
<div class="pz-cover__logo" style="--ar:${(ctx.logo.geos.reversed.w / ctx.logo.geos.reversed.h).toFixed(4)}">${ctx.logo.html('reversed', { width: 640, label: 'Your logo goes here' })}</div>
<div class="pz-cover__t"><h1 class="pz-cover__h">${A(B.name)} brand book</h1><p class="pz-c">${A(ctx.versionLine)}</p><p class="pz-cover__line">${A(B.lines.primary)}</p></div></div>
${shot ? `<p class="pz-cover__cap pz-c">${credit(shot)}</p>` : ''}</div>`;

  // what it is: the description, whole, as the one big line; product and audience on the action field beside it
  const say = split(ctx, st, sec, 'Overview', [
    { cls: 'pz-say', html: `<p class="pz-d pz-say__h" style="font-size:${fitSize(ctx, [carries(ctx, B.description) ? sayLine(ctx) : B.description], 0.9, 56, { byLen: true })}">${A(carries(ctx, B.description) ? sayLine(ctx) : B.description)}</p>` },
    { hex: act, what: 'book overview field', cls: 'pz-say__side', html: `${carries(ctx, B.product) ? '' : `<div class="pz-pair"><h3 class="pz-l">What it does</h3><p class="pz-t">${A(B.product)}</p></div>`}<div class="pz-pair"><h3 class="pz-l">Who it serves</h3><p class="pz-t">${A(B.audience)}</p></div>` },
  ], { h2: true, cls: 'pz-split--say' });

  // personality: panel, action and text fields, the meaning at the top of each and the trait at the foot
  const P = B.personality, grounds = [panel, act, text];
  const tsize = fitSize(ctx, P.map((p) => p.trait), 0.92, 84);
  const traits = split(ctx, st, sec, 'Personality', P.map((p, i) => ({
    hex: grounds[i % 3], what: 'book trait field', cls: 'pz-trait',
    html: `<p class="pz-t pz-trait__m">${A(dropSay(ctx, p.means))}</p><h3 class="pz-d pz-trait__w" style="font-size:${tsize}">${A(p.trait)}</h3>`,
  })), { cls: 'pz-split--3' });
  const lines = B.lines.others.length ? B.lines.others : [B.lines.primary];
  // the lines themselves print once, in Voice under Lines in use; here only their count, so no line repeats down the first screen
  const breath = `<div class="pz-band pz-g pz-breath"><p class="pz-lead pz-breath__i">${words(P.length)} traits shape how ${A(B.name)} sounds and behaves. ${words(lines.length)} ${lines.length === 1 ? 'line says' : 'lines say'} it in a breath, and Voice sets ${lines.length === 1 ? 'it' : 'them'} out.</p></div>`;
  return section(sec, cover + say + traits + breath);
}

// ---- 2 Voice: the first rule as a title slide, the rest as a run of lines, write this and not that, the boilerplate ----
function voice(ctx, st) {
  const B = ctx.brand, V = B.voice, sec = { n: 2, id: 'voice' }, text = byRole(ctx, 'text')?.hex || L(ctx).text, act = L(ctx).action, panel = L(ctx).sunken;
  st.n = 0;
  const [p0, ...ps] = V.principles;
  const opener = band(ctx, st, sec, 'Voice', `<div class="pz-open"><p class="pz-d pz-open__h" style="font-size:${fitSize(ctx, [p0.example], 0.82, 168, { byLen: true })}">${A(p0.example)}</p>
<div class="pz-open__n"><h3 class="pz-l">${A(p0.title)}</h3><p class="pz-t">${words(V.principles.length)} rules for how ${A(B.name)} writes. Each one comes with a line it has already written.</p></div></div>`, { hex: text, h2: true, cls: 'pz-band--tall', what: 'book voice opener' });
  const rules = band(ctx, st, sec, 'How we write', `<ol class="pz-rules">${ps.map((p) => `<li><h3 class="pz-l">${A(p.title)}</h3><p class="pz-d pz-rules__e">${A(p.example)}</p></li>`).join('')}</ol>`);
  const W = V.writeThis;
  const wtn = split(ctx, st, sec, 'Write this, not that', [
    { cls: 'pz-wt', html: `<h3 class="pz-d pz-wt__h">Write this</h3><ul class="pz-wt__l">${W.map((r) => `<li><p class="pz-lead">${A(r.write)}</p><p class="pz-c">${A(r.because)}</p></li>`).join('')}</ul>` },
    { hex: panel, what: 'book not that field', cls: 'pz-wt pz-wt--not', html: `<h3 class="pz-d pz-wt__h">Not that</h3><ul class="pz-wt__l">${W.map((r) => `<li><p class="pz-lead">${A(r.not)}</p></li>`).join('')}</ul>` },
  ], { cls: 'pz-split--2' });
  const boiler = split(ctx, st, sec, 'The brand in a few words', [
    { hex: act, what: 'book boilerplate field', cls: 'pz-bp pz-bp--25', html: `<h3 class="pz-l">In 25 words</h3><p class="pz-bp__t">${A(dropSay(ctx, V.boilerplate25))}</p>${copyBtn('Copy text', V.boilerplate25, '25-word boilerplate')}` },
    { cls: 'pz-bp', html: `<h3 class="pz-l">In 50 words</h3><p class="pz-t">${A(dropSay(ctx, V.boilerplate50))}</p>${copyBtn('Copy text', V.boilerplate50, '50-word boilerplate')}<h3 class="pz-l pz-bp__nh">Writing the name</h3><p class="pz-t">${A(V.nameRules)}</p>` },
  ], { cls: 'pz-split--2' });
  // the lines as the deck's statement slide: the primary line across the band, the others under it
  const lines = band(ctx, st, sec, 'Lines in use', `<p class="pz-d pz-state__h" style="font-size:${fitSize(ctx, [sayLine(ctx)], 0.7, 128)}">${A(sayLine(ctx))}</p>${B.lines.others.length ? `<ul class="pz-state__o">${B.lines.others.map((l) => `<li class="pz-d">${A(l)}</li>`).join('')}</ul>` : ''}`, { cls: 'pz-state' });
  return section(sec, opener + rules + wtn + boiler + lines);
}

// ---- 3 Logo: the logo alone on its dark ground, then every version on its own field, clear space and size, the don'ts ----
function logo(ctx, st) {
  const B = ctx.brand, Lg = ctx.logo, cw = B.logo.colourways, sec = { n: 3, id: 'logo' }, slot = ctx.edition === 'slot';
  st.n = 0;
  const rev = cw.reversed;
  const opener = band(ctx, st, sec, 'Logo', `<div class="pz-lgo"><div class="pz-lgo__m" style="--ar:${(Lg.geos.reversed.w / Lg.geos.reversed.h).toFixed(4)}">${Lg.html('reversed', { width: 860, label: 'Your logo goes here' })}</div><p class="pz-lead pz-lgo__i">${A(B.logo.idea)}</p></div>`, { hex: rev.ground, h2: true, cls: 'pz-band--tall', what: 'book logo opener' });
  // versions: each on the ground of its colourway, as abutting fields; the primary one takes a wide field of its own
  const ids = Lg.versions;
  const vfield = (id, i) => {
    const w = cw[Lg.colourwayOf(id)], g = Lg.geos[id], files = slot ? null : ctx.book.logo(id), name = `${Lg.labels[id]} logo`;
    const share = id === 'symbol' ? 0.22 : g.w / g.h > 3 ? 0.62 : 0.4;
    const links = files ? `<span class="pz-dls">${dl(files.svg, name)}${dl(files.png.find((p) => p.w === 1024), name + ', 1024 px wide', 'PNG')}</span>` : '';
    return { hex: w.ground, what: `book logo version ${id}`, cls: `pz-ver${i === 0 ? ' pz-ver--lead' : ''}${lower(w.ground) === lower(L(ctx).surface) ? ' is-hair' : ''}`, html: `<div class="pz-ver__a"><div class="pz-ver__m" style="width:${(share * 100).toFixed(0)}%;--ar:${(g.w / g.h).toFixed(4)}">${Lg.html(id, { width: 420, label: Lg.labels[id] })}</div></div><div class="pz-ver__c"><p class="pz-c"><b class="pz-l">${A(Lg.labels[id])}</b> ${A(B.logo.when[id] || '')}</p>${links}</div>` };
  };
  // the head's right part goes on the top row's last field (the lead takes two columns of four)
  const vers = split(ctx, st, sec, 'Versions', ids.map(vfield), { cls: 'pz-split--ver', endAt: Math.min(2, ids.length - 1) });
  // clear space: the logo on its ground inside the zone that stays clear, drawn in the panel colour; the smallest size at true size
  const g = Lg.geo, padK = ((g.height / g.width) * Lg.clearShare) / 100, ms = Lg.minSize, panel = L(ctx).sunken, ground = L(ctx).surface;
  const minBlock = slot
    ? `<p class="pz-t">Set the smallest size once the logo is in place. Below it the mark stops reading as one shape.</p>`
    : `<div class="pz-min__l" style="width:${ms.screenPx}px">${Lg.html('colour', { width: ms.screenPx })}</div><p class="pz-t num">${ms.screenPx} px wide on screen. ${ms.printMm} mm wide in print.</p>`;
  const clear = band(ctx, st, sec, 'Clear space and smallest size', `<div class="pz-clear"><figure class="pz-cs" style="padding:${((padK / (1 + 2 * padK)) * 100).toFixed(3)}%;background:${panel}"><div class="pz-cs__in" style="background:${ground};color:${L(ctx).text};--ar:${(g.width / g.height).toFixed(4)}">${Lg.html('colour', { width: 480 })}</div></figure>
<div class="pz-clear__n"><p class="pz-lead">Keep ${Lg.clearShare}% of the logo's height clear on every side.</p><p class="pz-c">The shaded zone is the clear space. Nothing else sits inside it: no type, no edge, no other mark.</p><div class="pz-min"><h3 class="pz-l">Smallest size</h3>${minBlock}</div></div></div>`);
  const misuse = ['Do not stretch, squash or skew it.', 'Do not recolour it outside the versions above.', 'Do not rotate it.', 'Do not add shadows, glows or other effects.', 'Do not set it on a busy part of a photo.', 'Do not outline it or put it in a box.'];
  const never = band(ctx, st, sec, 'Never', `<ul class="pz-never">${misuse.map((m) => `<li class="pz-d">${A(m)}</li>`).join('')}</ul>`, { hex: panel, what: 'book logo never' });
  return section(sec, opener + vers + clear + never);
}

// ---- 4 Colour: the proportion as stripes, the action colour alone, the rest side by side, the pairs in their own colours ----
function colour(ctx, st) {
  const B = ctx.brand, sec = { n: 4, id: 'colour' }, cols = ctx.colours;
  st.n = 0;
  const pc = (c) => Math.round(c.share * 100);
  const hair = (hex) => (lower(hex) === lower(L(ctx).surface) ? ' is-hair' : '');
  // proportion: each colour a stripe whose height is its share of an 720 px stack, at least one line tall; the share set to fit the stripe
  const total = 720, sorted = [...cols].sort((a, b) => b.share - a.share);
  const stripes = sorted.map((c) => {
    const h = Math.max(64, Math.round(c.share * total)), fs = Math.max(32, Math.min(200, Math.round(h * 0.62)));
    return `<li class="pz-prop__s${hair(c.hex)}" style="${fieldStyle(ctx, c.hex, `book proportion ${c.name}`)};--h:${h}px"><span class="pz-d pz-prop__n num" style="font-size:${fitSize(ctx, [pc(c) + '%'], 0.4, fs, { whole: true })}">${pc(c)}%</span><span class="pz-prop__t"><b class="pz-l">${A(c.name)}</b> <span class="pz-c">${A(c.lands)}</span></span>${valBtnSmall(c)}</li>`;
  }).join('');
  function valBtnSmall(c) { return `<button type="button" class="bk-btn pz-hexb" data-copy="${c.hex}" data-copy-label="${A(c.name)} HEX ${c.hex}" aria-label="Copy HEX ${A(c.hex)}, ${A(c.name)}"><span class="bk-btn__t">${c.hex}</span></button>`; }
  const opener = band(ctx, st, sec, 'Colour', `<p class="pz-lead pz-prop__i">${words(cols.length)} colours, each drawn at its share of the brand. Click a value to copy it.</p><ul class="pz-prop">${stripes}</ul>`, { h2: true, cls: 'pz-band--flush' });
  const vals = (c) => `<div class="pz-vals">${valBtn('HEX', c.hex, c.name)}${valBtn('RGB', rgbOf(ctx, c.hex), c.name)}${valBtn('OKLCH', c.oklch || ctx.C.oklchString(c.hex), c.name)}${ctx.C.cmykOf(c) ? valBtn('CMYK', ctx.C.cmykOf(c), c.name) : ''}</div>`;
  const steps = Object.keys(cols[0].ramp);
  const ramp = (c) => `<ol class="pz-ramp" aria-label="${A(c.name)} tints, 50 to 900">${steps.map((k) => `<li${+k === c.rampBase ? ' class="is-base"' : ''}><i style="background:${c.ramp[k]}"></i><span class="pz-ramp__k num">${k}</span></li>`).join('')}</ol>`;
  // the action colour alone, as the deck's palette lead field; then the others share one band
  const lead = cols.find((c) => c.role === 'action') || cols[0];
  const leadBand = band(ctx, st, sec, lead.name, `<div class="pz-clead"><h3 class="pz-d pz-clead__n" style="font-size:${fitSize(ctx, [lead.name], 0.6, 220)}">${A(lead.name)}</h3><div class="pz-clead__s"><p class="pz-lead">${A(lead.lands)}</p>${vals(lead)}</div></div>${ramp(lead)}`, { hex: lead.hex, cls: `pz-band--tall${hair(lead.hex)}`, what: 'book colour lead' });
  const others = cols.filter((c) => c !== lead);
  const nsize = fitSize(ctx, others.map((c) => c.name), 0.9, 64);
  const rest = split(ctx, st, sec, 'The palette', others.map((c) => ({ hex: c.hex, what: `book colour ${c.name}`, cls: `pz-col${hair(c.hex)}`, html: `<h3 class="pz-d pz-col__n" style="font-size:${nsize}">${A(c.name)}</h3><p class="pz-c pz-col__l">${A(c.lands)}</p>${vals(c)}${ramp(c)}` })), { cls: `pz-split--${others.length}` });
  // tones: the text tones and fills the interface leans on, each a row on the page ground
  const tones = ctx.tones.length ? band(ctx, st, sec, 'Tones', `<p class="pz-t pz-tones__i">Tones are not brand colours. They are the steps between them that text and the interface need.</p><ul class="pz-tones">${ctx.tones.map((t) => `<li><span class="pz-tones__sw" style="background:${t.hex}" aria-hidden="true"></span><span class="pz-tones__n"><b class="pz-l">${A(t.name)}</b><span class="pz-c">${A(t.lands || ctx.cap(t.role))}</span></span>${valBtn('HEX', t.hex, t.name)}</li>`).join('')}</ul>`) : '';
  // contrast: every pair the brand uses, each row set in its own two colours, the ratio as the big number
  const pairs = band(ctx, st, sec, 'Contrast', `<p class="pz-t pz-pairs__i">Every text pair ${A(B.name)} uses, set in its own colours, with its WCAG ratio. Text needs 4.5 : 1. Type at 24 px and over needs 3 : 1.</p><ul class="pz-pairs">${ctx.pairs.map((p) => `<li class="${hair(p.bgHex).trim()}" style="background:${p.bgHex};color:${p.fgHex}"><span class="pz-d pz-pairs__r num">${A(p.ratioText)}<i> : 1</i></span><span class="pz-pairs__u"${p.large ? ` style="color:${inkOn(ctx, p.bgHex)}"` : ''}><b class="pz-pairs__w">${A(nameOfHex(ctx, p.fgHex))} on ${A(nameOfHex(ctx, p.bgHex))}</b><span>${A(p.use)}${p.large ? '. Only at 24 px and over' : ''}</span></span></li>`).join('')}</ul>`, { cls: 'pz-band--flush' });
  // interface roles, light and dark, both always shown: the switch above previews the book in either
  const roleKeys = [['surface', 'Surface'], ['raised', 'Raised'], ['text', 'Text'], ['quiet', 'Quiet text'], ['border', 'Border'], ['action', 'Action'], ['actionLabel', 'Action label'], ['focus', 'Focus']];
  const toneKeys = [['success', 'Success'], ['warning', 'Warning'], ['danger', 'Danger'], ['info', 'Info']];
  const roleList = (mode) => {
    const r = ctx.roles[mode], items = [...roleKeys.map(([k, n]) => [n, r[k]]), ...toneKeys.map(([k, n]) => [n, r[k].fg])];
    ctx.pair(r.text, r.surface, { size: 13, what: `book roles ${mode}` }); ctx.pair(r.quiet, r.surface, { size: 12, what: `book roles ${mode} quiet` });
    return { hex: r.surface, what: `book roles ${mode}`, cls: `pz-roles${mode === 'light' && lower(r.surface) === lower(L(ctx).surface) ? ' is-hair' : ''}`, style: `;color:${r.text};--q:${r.quiet};--ink:${r.text};--bg:${r.surface};--div:${r.divider}`, html: `<h3 class="pz-l">${mode === 'light' ? 'Light' : 'Dark'}</h3><ul>${items.map(([n, hx]) => `<li><span class="pz-roles__sw" style="background:${hx};box-shadow:inset 0 0 0 1px ${r.divider}" aria-hidden="true"></span><span class="pz-roles__n">${A(n)}</span><button type="button" class="bk-btn pz-hexb" data-copy="${hx}" data-copy-label="${mode} ${A(n)} HEX ${hx}" aria-label="Copy HEX ${A(hx)}, ${mode} ${A(n)}"><span class="bk-btn__t">${hx}</span></button></li>`).join('')}</ul>` };
  };
  const roles = split(ctx, st, sec, 'Interface roles', [roleList('light'), roleList('dark')], { cls: 'pz-split--2' });
  return section(sec, opener + leadBand + rest + tones + pairs + roles);
}

// ---- 5 Typography: the display face named in itself on the dark field, the reading face, the scale at true size, the tester ----
function typography(ctx, st) {
  const B = ctx.brand, F = B.fonts, T = B.type, sec = { n: 5, id: 'typography' }, text = byRole(ctx, 'text')?.hex || L(ctx).text, act = L(ctx).action;
  st.n = 0;
  const dstyle = `font-family:var(--ff-display);font-weight:${dispW(ctx)};font-stretch:${F.display.stretch || 100}%`;
  const roles = (face) => T.scale.filter((s) => s.face === face).map((s) => s.token).join(', ');
  const opener = band(ctx, st, sec, 'Typography', `<div class="pz-face"><p class="pz-d pz-face__n" style="font-size:${fitSize(ctx, [F.display.family], 0.96, 240, { whole: true })}">${A(F.display.family)}</p>
<p class="pz-d pz-face__set">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz<br>0123456789</p>
<div class="pz-face__n2"><h3 class="pz-l">Display</h3><p class="pz-c">Weight ${F.display.weights.join(', ')}${F.display.stretch ? `, width ${F.display.stretch}` : ''}. Used for ${A(roles('display'))}.</p></div></div>`, { hex: text, h2: true, what: 'book type opener' });
  const bw = F.body.weights, wname = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };
  const body = band(ctx, st, sec, F.body.family, `<div class="pz-body"><div class="pz-body__h"><p class="pz-body__n" style="font-size:${fitSize(ctx, [F.body.family], 0.9, 72, { role: 'body', weight: 500, whole: true })}">${A(F.body.family)}</p><p class="pz-c">Body. Used for ${A(roles('body'))}.</p></div>
<ul class="pz-weights">${bw.map((w) => `<li><span class="pz-c num">${wname[w] || 'Weight'} ${w}</span><span class="pz-weights__s" style="font-weight:${w}">${A(sayLine(ctx))}</span></li>`).join('')}</ul>
<div class="pz-mono"><span class="pz-mono__s">${A(byRole(ctx, 'action')?.hex || L(ctx).action)}</span><p class="pz-c"><b class="pz-l">${A(F.mono.family)}</b> Only for a hex, a token or a code string.</p></div>
<p class="pz-c pz-lic">${A([F.display.family, F.body.family, F.mono.family].filter((v, i, a) => a.indexOf(v) === i).join(', ').replace(/, ([^,]*)$/, ' and $1'))} are open source under the SIL Open Font Licence.${onceRe(ctx)?.test('free') ? '' : ' Free to use in print and on screen.'}</p></div>`);
  // the scale: the sample line at each step's true size (scaled down only where the screen is narrower than the word), its values beside
  const scale = band(ctx, st, sec, 'Hierarchy', `<ol class="pz-scale">${T.scale.map((s) => {
    const disp = s.face === 'display', fam = disp ? dstyle : `font-family:var(--ff-body);font-weight:${s.weight}`;
    const sample = disp ? sampleHead(ctx) : s.size >= 14 ? sayLine(ctx) : T.sample.caption;
    const size = disp ? fitSize(ctx, [sample], 0.98, s.size) : `${s.size}px`;
    return `<li><p class="pz-scale__s" style="${fam};font-size:${size};line-height:${s.line}">${A(sample)}</p><p class="pz-scale__m"><b class="pz-l">${A(ctx.cap(s.token))}</b> <span class="pz-c num">${s.size} px, line ${s.line}, weight ${s.weight}</span> <span class="pz-c">${A(s.use)}</span></p></li>`;
  }).join('')}</ol>`);
  const tester = `<div class="pz-band pz-g pz-tester bk-tester" data-tester><div class="pz-hd">${(() => { const h = head(ctx, st, sec, 'Try it'); return h.left + h.right; })()}</div>
<div class="pz-tester__c"><div class="pz-field"><label for="tester-text">Your line</label><input id="tester-text" type="text" value="${A(sampleHead(ctx))}" data-tester-text data-default="${A(sampleHead(ctx))}" autocomplete="off" spellcheck="false"></div>
<div class="pz-field pz-field--r"><label for="tester-size">Size <output for="tester-size" data-tester-value class="num">64 px</output></label><input id="tester-size" type="range" min="14" max="120" step="1" value="64" data-tester-size></div></div>
<p class="pz-d pz-tester__d" data-tester-out aria-hidden="true">${A(sampleHead(ctx))}</p>
<p class="pz-tester__b" data-tester-out aria-hidden="true">${A(sampleHead(ctx))}</p></div>`;
  const inUse = band(ctx, st, sec, 'Type in use', `<div class="pz-use"><p class="pz-d pz-use__h" style="font-size:${fitSize(ctx, [sampleHead(ctx)], 0.62, 112, { byLen: true })}">${A(sampleHead(ctx))}</p><div class="pz-use__p"><p class="pz-t">${A(samplePara(ctx))}</p><p class="pz-c">${A(T.sample.caption)}</p></div></div>`, { hex: act, cls: 'pz-band--tall', what: 'book type in use' });
  const rules = split(ctx, st, sec, 'Type rules', [
    { cls: 'pz-do', html: `<h3 class="pz-d pz-do__h">Do</h3><ul>${T.rules.map((r) => `<li class="pz-t">${A(r.do)}</li>`).join('')}</ul>` },
    { hex: text, what: 'book type dont', cls: 'pz-do', html: `<h3 class="pz-d pz-do__h">Don't</h3><ul>${T.rules.map((r) => `<li class="pz-t">${A(r.dont)}</li>`).join('')}</ul>` },
  ], { cls: 'pz-split--2' });
  return section(sec, opener + body + scale + tester + inUse + rules);
}

// ---- 6 Imagery: one photograph across the band, the direction as a run of lines, the shot list, the rules ----
function imagery(ctx, st) {
  const B = ctx.brand, I = B.imagery, D = I.direction, sec = { n: 6, id: 'imagery' }, panel = L(ctx).sunken;
  st.n = 0;
  const lead = shotFor(ctx, 'poster', new Set()) || I.shots.find((s) => s.photo) || null;
  const leadFile = lead ? ctx.book.find(`05 Imagery/photos/${lead.photo.split('/').pop()}`) : null;
  const fr = lead ? framing(ctx, lead) : null;
  const opener = band(ctx, st, sec, 'Imagery', `<p class="pz-d pz-img__h" style="font-size:${fitSize(ctx, [D.subject], 0.8, 72, { byLen: true })}">${A(D.subject)}</p>`, { h2: true, cls: 'pz-band--open' })
    + (lead ? `<figure class="pz-bleed" style="--ar:${fr.ratio.toFixed(4)}">${ctx.photo(lead.id, { cls: 'pz-img', pos: fr.pos })}<figcaption class="pz-bleed__c"><span class="pz-c">${credit(lead)}</span>${leadFile ? dl(leadFile, 'photo ' + (lead.caption || lead.id), 'Download') : ''}</figcaption></figure>` : '');
  const dir = band(ctx, st, sec, 'Direction', `<dl class="pz-dir">${[['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]].filter(([, v]) => v).map(([k, v]) => `<div><dt class="pz-l">${k}</dt><dd class="pz-lead">${A(v)}</dd></div>`).join('')}</dl>`);
  // the shot list: photographs in pairs of unequal width, so the run never settles into a grid; shots still to be taken as a run of
  // small frames, each with its brief beside it, so an unshot list reads as a brief and not as a wall of empty boxes
  const rest = I.shots.filter((s) => !lead || s.id !== lead.id), shot = rest.filter((s) => s.photo), toTake = rest.filter((s) => !s.photo);
  const fig = (s, i) => {
    const f = ctx.book.find(`05 Imagery/photos/${s.photo.split('/').pop()}`), frm = framing(ctx, s);
    return `<figure class="pz-shot pz-shot--${i % 4}">${ctx.photo(s.id, { cls: 'pz-img', pos: frm.pos })}<figcaption><span class="pz-c">${credit(s)}</span>${f ? dl(f, 'photo ' + (s.caption || s.id), 'Download') : ''}</figcaption></figure>`;
  };
  const slotRow = (s) => `<li><div class="pz-take__f"><div class="photo-slot pz-img" role="img" aria-label="${A('Photo slot. ' + (s.slot || ''))}"><span>To shoot</span></div></div><div class="pz-take__t"><h3 class="pz-l">${A(s.caption || ctx.cap(s.id))}</h3><p class="pz-t">${A(s.slot || s.alt || '')}</p></div></li>`;
  const shots = rest.length ? band(ctx, st, sec, 'Shot list', `${shot.length ? `<div class="pz-shots">${shot.map(fig).join('')}</div>` : ''}${toTake.length ? `<p class="pz-c pz-take__i">${words(toTake.length)} still to shoot, to the direction above. Each frame holds its place in the layouts.</p><ol class="pz-take">${toTake.map(slotRow).join('')}</ol>` : ''}`) : '';
  const rules = band(ctx, st, sec, 'Imagery rules', `<ul class="pz-irules">${I.rules.map((r) => `<li><p class="pz-lead"><b class="pz-l">Do</b> ${A(r.do)}</p><p class="pz-t"><b class="pz-l">Don't</b> ${A(r.dont)}</p></li>`).join('')}</ul>`, { hex: panel, what: 'book imagery rules' });
  return section(sec, opener + dir + shots + rules);
}

// ---- 7 Layout: the brand's page with its columns, the measures as four big numbers, spacing and corners ----
function layout(ctx, st) {
  const G = ctx.gridMeasures, B = ctx.brand, sec = { n: 7, id: 'layout' }, panel = L(ctx).sunken, ground = L(ctx).surface;
  st.n = 0;
  const inner = G.page.w - 2 * G.margin, gap = (G.gutter / inner) * 100, padX = (G.margin / G.page.w) * 100;
  const cols = Array.from({ length: G.columns }, () => `<i style="background:${panel}"></i>`).join('');
  const col = Math.round(G.col * 10) / 10;
  const portrait = G.page.h > G.page.w;
  const page = `<figure class="pz-page${portrait ? ' is-portrait' : ''}" role="img" aria-label="The page grid: ${G.columns} columns, ${G.margin} pixel margin, ${G.gutter} pixel gutter" style="aspect-ratio:${G.page.w}/${G.page.h};background:${ground};padding:${((G.margin / G.page.h) * 100 * (G.page.h / G.page.w)).toFixed(3)}% ${padX.toFixed(3)}%"><div class="pz-page__g" style="column-gap:${gap.toFixed(3)}%;grid-template-columns:repeat(${G.columns},minmax(0,1fr))">${cols}</div></figure>`;
  const meas = [['Margin', `${G.margin}`], ['Gutter', `${G.gutter}`], ['Column', `${col}`], ['Base', `${G.base}`]];
  const grid = band(ctx, st, sec, 'Layout', `<div class="pz-grid"><div class="pz-grid__f" style="background:${panel}">${page}</div><div class="pz-grid__n"><p class="pz-lead">${G.columns} columns on a ${G.page.w} by ${G.page.h} page. Everything sits on a ${G.base} px base.</p><dl class="pz-meas">${meas.map(([k, v]) => `<div><dt class="pz-l">${k}</dt><dd class="pz-d num">${v}<i> px</i></dd></div>`).join('')}</dl></div></div>`, { h2: true });
  const space = band(ctx, st, sec, 'Spacing', `<p class="pz-t pz-space__i">${words(ctx.space.length)} steps. The gap inside a group is always smaller than the gap between groups.</p><ol class="pz-space">${ctx.space.map((s) => `<li><span class="pz-c num">${A(s.token)}</span><i style="width:${s.px * 4}px"></i><span class="pz-v num">${s.px} px</span></li>`).join('')}</ol>`);
  const radii = ctx.radii.filter((r) => r.px < 9999);
  const round = ctx.radii.find((r) => r.px >= 9999);
  const corners = band(ctx, st, sec, 'Corners and edges', `<ul class="pz-shape">${radii.map((r) => `<li><i style="border-radius:${r.px}px"></i><span class="pz-c"><b class="pz-l num">${r.px} px</b> ${A(r.use)}</span></li>`).join('')}${round ? `<li><i class="is-round"></i><span class="pz-c"><b class="pz-l">Round</b> ${A(round.use)}</span></li>` : ''}</ul><p class="pz-t pz-shape__n">Edges are ${B.ui.border} px. ${A(B.ui.elevationNote || '')}</p>`);
  return section(sec, grid + space + corners);
}

// ---- photographed objects. Every scene this book draws on is named here and only here: the scene library is being replaced ----
const SCENES = { card: 'counter-till-cards', street: 'photo-busstop', wall: 'room-gallery-panel' };
const quadEdge = (q) => { const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]); return (d(q[0], q[1]) + d(q[3], q[2])) / 2; };
// how far the art shrinks when its scene is shown pageW px wide (the slot frame's line and label are drawn at 1/k so they land at 1.5 px and 12 px)
const sceneK = (ctx, id, artW, pageW) => { const s = ctx.sceneInfo(id); return ((s.quads.reduce((a, q) => a + quadEdge(q.corners), 0) / s.quads.length) * (pageW / s.w)) / artW; };
// the logo on a photographed object: the brand's colourway for that ground, or in the slot edition one dashed frame sized for the scale it is seen at
function artLogo(ctx, id, width, hex, k) {
  if (ctx.edition !== 'slot') return `<div class="lgw" style="width:${width}px">${ctx.logo.html(id, { width, colourway: cwFor(ctx, hex) })}</div>`;
  const g = ctx.logo.geos[id], ink = inkOn(ctx, hex), h = Math.max((width * g.h) / g.w, 40 / k);
  return `<div class="logo-slot" role="img" aria-label="Logo slot" style="width:${width}px;height:${h.toFixed(1)}px;border:${(1.5 / k).toFixed(2)}px dashed ${ink};color:${ink};display:flex;align-items:center;justify-content:center;font:500 ${(12 / k).toFixed(1)}px/1.2 var(--body);white-space:nowrap">Logo</div>`;
}
const ART_CSS = '.lgw>svg{display:block;width:100%;height:auto}';
const artDoc = (ctx, inner, W, H) => ({ html: ctx.artPage(`<div style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">${inner}</div>`, { w: W, h: H, css: ART_CSS }), w: W, h: H });
// the business card, 90 x 55 mm at 12 px to the millimetre: front on the reversed ground, back on the page ground
function cardArts(ctx, k) {
  const B = ctx.brand, c = B.applications.card, rev = B.logo.colourways.reversed, back = L(ctx).surface, ink = inkOn(ctx, back), W = 1080, H = 660;
  const g = ctx.logo.geos.reversed, lw = Math.round(Math.min(620, (280 * g.w) / g.h)), sw = 96;
  const front = `<div style="position:absolute;inset:0;background:${rev.ground};color:${rev.name}"><div style="position:absolute;left:96px;top:96px">${artLogo(ctx, 'reversed', lw, rev.ground, k)}</div><p style="position:absolute;left:96px;right:96px;bottom:84px;margin:0;font:500 34px/42px var(--body)">${A(sayLine(ctx))}</p></div>`;
  const rear = `<div style="position:absolute;inset:0;background:${back};color:${ink}"><div style="position:absolute;right:96px;top:84px">${artLogo(ctx, 'symbol', sw, back, k)}</div>
<div style="position:absolute;left:96px;right:96px;bottom:84px;font-family:var(--body)"><p style="margin:0;font-size:42px;line-height:50px;font-weight:600">${A(c.person)}</p><p style="margin:0;font-size:30px;line-height:40px;color:${chromeOn(ctx, back)}">${A(c.role)}</p><p style="margin:36px 0 0;font-size:30px;line-height:42px">${A(c.contact)}<br>${A(B.applications.site.url)}</p></div></div>`;
  return { 'card-front': artDoc(ctx, front, W, H), 'card-back': artDoc(ctx, rear, W, H) };
}
// the poster, W x H at the panel's own shape: the action field, one line in the display face, the primary line and the logo at the foot
function posterArt(ctx, W, H, k) {
  const B = ctx.brand, act = L(ctx).action, ink = inkOn(ctx, act), pad = Math.round(W * 0.08);
  const line = B.lines.others[B.lines.others.length - 1] || B.lines.primary, g = ctx.logo.geos.colour, lw = Math.round(Math.min(W * 0.5, (190 * g.w) / g.h));
  return `<div style="position:absolute;inset:0;padding:${pad}px;background:${act};color:${ink};display:flex;flex-direction:column;container-type:inline-size">
<p style="margin:0;font-family:var(--display);font-weight:${dispW(ctx)};font-stretch:${ctx.brand.fonts.display.stretch || 100}%;letter-spacing:-0.01em;line-height:.98;font-size:${fitSize(ctx, [line], 0.84, Math.round(W * 0.2))}">${A(line)}</p>
<div style="margin-top:auto;display:flex;flex-direction:column;gap:${Math.round(pad * 0.6)}px"><p style="margin:0;font:500 ${Math.max(12, Math.round(W * 0.036))}px/1.3 var(--body)">${A(B.lines.primary)}</p>${artLogo(ctx, 'colour', lw, act, k)}</div></div>`;
}
// a scene photograph cropped to a box of shape ar, centred on its surfaces
function sceneFig(ctx, id, url, ar, alt, cls = '') {
  const s = ctx.sceneInfo(id), pts = s.quads.flatMap((q) => q.corners), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const bw = ar > s.w / s.h ? s.w : s.h * ar, bh = ar > s.w / s.h ? s.w / ar : s.h;
  const p = (c, b, full) => (full > b + 1 ? Math.max(0, Math.min(100, ((c - b / 2) / (full - b)) * 100)).toFixed(1) : '50');
  return `<figure class="pz-mock ${cls}" style="--ar:${ar.toFixed(4)}">${plateImg(`${A(url)}`, `${A(alt)}`, `object-position:${p(cx, bw, s.w)}% ${p(cy, bh, s.h)}%`, `pz-img`)}</figure>`;
}

// ---- 8 Applications: each object drawn at its true proportion on a field, the product screen last ----
function applications(ctx, st) {
  const B = ctx.brand, Lg = ctx.logo, ap = B.applications, cw = B.logo.colourways, rev = cw.reversed, sec = { n: 8, id: 'applications' };
  const act = L(ctx).action, panel = L(ctx).sunken, ground = L(ctx).surface, S = screenContent(ctx);
  st.n = 0;
  const rows = (S.deliveries || []).slice(0, 3);
  const lg = (id, hex, w, label = 'Logo') => Lg.html(id, { width: w, colourway: cwFor(ctx, hex), label });
  // business card, 90 by 55 mm, photographed: front on the reversed ground, back on the page ground, both set into the card scene
  ctx.pair(rev.name, rev.ground, { size: 15, what: 'book card front' });
  ctx.pair(L(ctx).text, ground, { size: 15, what: 'book card back' });
  const cardUrl = ctx.mockup(SCENES.card, cardArts(ctx, sceneK(ctx, SCENES.card, 1080, 1328)));
  const cardFig = sceneFig(ctx, SCENES.card, cardUrl, 1536 / 640, `${B.name} business card, front and back`, 'pz-mock--card');
  const card = band(ctx, st, sec, 'Applications', `${cardFig}<p class="pz-c pz-cap"><b class="pz-l">Business card, 90 × 55 mm.</b> Front on ${A(nameOfHex(ctx, rev.ground))}, back on ${A(nameOfHex(ctx, ground))}.</p>`, { hex: panel, h2: true, cls: 'pz-band--card', what: 'book card field' });
  // social: a square, a portrait and a story, each one line on one field, the logo in its colourway for that field; each line fitted to its own post
  // the size is capped three ways: 56 px, the longest word across the post, and the area the whole line has above the logo (as a share of the width, so it holds when the post shrinks)
  const POST = { sq: 1, pt: 4 / 5, st: 9 / 16 };
  const postSize = (cls, line) => { const cw = 480 * POST[cls] - 64, ch = 480 - 64 - 72, area = Math.sqrt((cw * ch) / Math.max(1, String(line).length)); return `${fitSize(ctx, [line], 0.86, 56).slice(0, -1)}, ${((Math.min(56, area) / cw) * 100).toFixed(3)}cqw)`; };
  const post = (cls, hex, line) => { ctx.pair(inkOn(ctx, hex), hex, { size: 24, what: 'book social post' }); return `<div class="pz-post pz-post--${cls}${lower(hex) === lower(ground) ? ' is-hair' : ''}" style="background:${hex};color:${inkOn(ctx, hex)}"><p class="pz-d" style="font-size:${postSize(cls, line)}">${A(line)}</p><span class="pz-post__lg" style="--ar:${(Lg.geos.colour.w / Lg.geos.colour.h).toFixed(4)}">${lg('colour', hex, 160)}</span></div>`; };
  const soc = socialLines(ctx);
  const social = band(ctx, st, sec, 'Social', `<div class="pz-posts">${post('sq', act, soc[0] || B.lines.primary)}${post('pt', rev.ground, soc[1] || B.lines.primary)}${post('st', panel, soc[2] || B.lines.primary)}</div><p class="pz-c pz-cap"><b class="pz-l">Social.</b> A square post, a portrait post and a story. One line each, set in the display face.</p>`);
  // signage: the poster photographed where it lives (the street when the brand shoots the street, else a wall), and flat beside it at the panel's shape
  const street = B.imagery.shots.some((s) => s.quad && (s.use || []).includes('scene')), sid = street ? SCENES.street : SCENES.wall;
  const sq = ctx.sceneInfo(sid).quads[0], PH = 2000, PW = Math.round(PH * sq.aspect), land = ctx.sceneInfo(sid).w > ctx.sceneInfo(sid).h;
  const signUrl = ctx.mockup(sid, [artDoc(ctx, posterArt(ctx, PW, PH, sceneK(ctx, sid, PW, 728)), PW, PH)]);
  ctx.pair(inkOn(ctx, act), act, { size: 24, what: 'book poster' });
  const FW = 320, flat = `<div class="pz-poster" style="width:${FW}px;height:${Math.round(FW / sq.aspect)}px">${posterArt(ctx, FW, Math.round(FW / sq.aspect), 1)}</div>`;
  const sign = split(ctx, st, sec, 'Signage', [
    { cls: 'pz-sign__ph', html: `${sceneFig(ctx, sid, signUrl, land ? ctx.sceneInfo(sid).w / ctx.sceneInfo(sid).h : 4 / 5, `${B.name} poster, ${street ? 'in a bus shelter on the street' : 'on a wall'}`, 'pz-mock--sign')}<p class="pz-c pz-cap">${A(ap.signage || '')}</p>` },
    { hex: panel, what: 'book signage field', cls: 'pz-sign', html: `${flat}<p class="pz-c pz-cap"><b class="pz-l">Flat.</b> The line in the display face, the logo at the foot.</p>` },
  ], { cls: 'pz-split--sign' });
  // email signature: a message foot drawn as it lands in an inbox, on white
  ctx.pair(L(ctx).quiet, ground, { size: 13, what: 'book email' });
  const email = band(ctx, st, sec, 'Email signature', `<div class="pz-mail is-hair" style="background:${ground};color:${L(ctx).text}"><p class="pz-mail__n">${A(ap.email.person)}</p><p class="pz-mail__r" style="color:${L(ctx).quiet}">${A(ap.email.role)}, ${A(B.name)}</p><p class="pz-mail__c">${A(ap.card.contact)}<br>${A(ap.site.url)}</p><div class="pz-mail__l" style="--ar:${(Lg.geos.horizontal.w / Lg.geos.horizontal.h).toFixed(4)}">${Lg.html('horizontal', { width: 168, label: 'Logo' })}</div></div><p class="pz-c pz-cap"><b class="pz-l">Email signature.</b> Name, role and how to reach us, then the horizontal logo. No banner, no quote.</p>`);
  // the product: the real components in a phone frame, following the light and dark preview
  const screen = `<div class="pz-phone"><div class="ui pz-scr" role="img" aria-label="${A(B.name)} product screen: ${A(S.title || S.status)}. ${A(S.eta)}. ${A(S.rider)}, ${A(S.riderNote)}." inert>
<div class="pz-scr__top"><span class="ui-num">${A(S.time)}</span>${ctx.ui.statusChip(rows[0]?.status || ctx.status[0].id)}</div>
<p class="ui-display pz-scr__eta">${A(S.eta)}</p><p class="pz-scr__note">${A(S.pickup)}</p>
<div class="ui-progress"><div class="ui-progress__bar"><i style="width:${S.progress * 100}%"></i></div><span class="ui-progress__dot" style="left:${S.progress * 100}%"></span></div>
<div class="pz-scr__ft"><span>${A(S.from)}</span><span>${A(S.to)}</span></div>
<ul class="ui-list pz-scr__who">${ctx.ui.row({ lead: `<span class="ui-avatar">${A(S.initials)}</span>`, title: S.rider, sub: S.riderNote, endHtml: ctx.ui.btn(S.call, { variant: 'secondary', size: 'sm' }) })}</ul>
<ul class="ui-list">${rows.map((d) => ctx.ui.row({ lead: ctx.ui.icon(d.icon || B.ui.rowIcon || 'package', 18), title: d.to, sub: d.when, end: d.price, chip: ctx.ui.statusChip(d.status) })).join('')}</ul>
</div></div>`;
  const product = split(ctx, st, sec, 'Product screen', [
    { cls: 'pz-prod__n', html: `<p class="pz-d pz-prod__h" style="font-size:${fitSize(ctx, [S.eta], 0.9, 72)}">${A(S.eta)}</p><p class="pz-t">The answer people opened the app for is the largest line on the screen. ${A(nameOfHex(ctx, act))} marks the one thing that is live, and nothing else.</p><p class="pz-c">Built from the brand's own components. Switch the preview to see the dark screen.</p>` },
    { hex: act, what: 'book product field', cls: 'pz-prod', html: screen },
  ], { cls: 'pz-split--prod' });
  return section(sec, card + social + sign + email + product);
}

// ---- 9 Downloads: the deck's contents slide. The kit on the dark field, held while the folders scroll past beside it ----
function downloads(ctx, st) {
  const B = ctx.brand, Dk = ctx.book, Lg = ctx.logo, sec = { n: 9, id: 'downloads' }, slot = ctx.edition === 'slot', text = byRole(ctx, 'text')?.hex || L(ctx).text;
  st.n = 0;
  const file = (f, note = '') => `<li class="pz-file"><span class="pz-file__n">${A(f.name)}</span><span class="pz-c num">${note ? A(note) + '. ' : ''}${A(f.ext)}, ${A(f.sizeText)}</span><a class="pz-dl" href="${A(f.href)}" download aria-label="Download ${A(f.name)}">Download</a></li>`;
  const logoRows = slot
    ? Dk.logoFiles.map((f) => file(f)).join('')
    : Lg.versions.map((id) => { const f = Dk.logo(id); const pngs = f.png.map((p) => `<a class="pz-dl num" href="${A(p.href)}" download aria-label="Download ${A(Lg.labels[id])} logo, PNG, ${p.w} px wide, ${A(p.sizeText)}">${p.w}</a>`).join(''); return `<li class="pz-file pz-file--logo"><span class="pz-file__n">${A(Lg.labels[id])}</span><span class="pz-dls">${dl(f.svg, Lg.labels[id] + ' logo')}${dl(f.pdf, Lg.labels[id] + ' logo')}<span class="pz-pngs" role="group" aria-label="PNG widths in pixels"><span class="pz-c">PNG</span>${pngs}</span></span></li>`; }).join('');
  const photos = Dk.imagery.filter((f) => f.rel.startsWith('05 Imagery/photos/')), pdfs = Dk.imagery.filter((f) => f.ext === 'PDF');
  const icons = `<ul class="pz-icons">${Dk.icons.map((f) => `<li><a class="pz-icon" href="${A(f.href)}" download aria-label="Download ${A(f.name)} icon, SVG">${ctx.ui.icon(f.name.replace('.svg', ''), 24)}<span>${A(f.name.replace('.svg', ''))}</span></a></li>`).join('')}</ul>${Dk.iconsLicence ? `<ul class="pz-files">${file(Dk.iconsLicence, 'Licence')}</ul>` : ''}`;
  const groups = [
    ['Read me', 'Start here: what is in the kit and how to use it.', `<ul class="pz-files">${[Dk.readmePdf, Dk.readme].filter(Boolean).map((f) => file(f)).join('')}</ul>`],
    ['Logo', slot ? 'The labelled slot frame, and where the approved files go.' : 'Each version as SVG and PDF, and as PNG at three widths, transparent.', `<ul class="pz-files">${logoRows}</ul>`],
    ['Colour', 'The palette for Adobe, CSS and JSON, and a swatch sheet.', `<ul class="pz-files">${Dk.colour.map((f) => file(f)).join('')}</ul>`],
    ['Type', 'The specimen sheet, and the faces with their links and licence.', `<ul class="pz-files">${Dk.type.map((f) => file(f)).join('')}</ul>`],
    ['Icons', `${Dk.icons.length} interface icons, drawn in the brand's stroke.`, icons],
    ['Imagery', photos.length ? 'The photography direction, and the photos.' : 'The photography direction and shot list.', `<ul class="pz-files">${[...pdfs, ...photos].map((f) => file(f)).join('')}</ul>`],
  ];
  const ink = inkOn(ctx, text);
  ctx.pair(ink, text, { size: 15, what: 'book downloads field' });
  const kit = { hex: text, what: 'book downloads kit', cls: 'pz-kit', html: `<div class="pz-kit__in"><p class="pz-d pz-kit__h" style="font-size:${fitSize(ctx, ['Downloads'], 0.9, 96, { whole: true })}">Downloads</p><p class="pz-t">Everything in the brand kit, folder by folder. The zip holds all of it.</p><p class="pz-v pz-kit__z">${A(Dk.zip.name)}</p><a class="pz-cta" href="${A(Dk.zip.href)}" download aria-label="Download ${A(Dk.zip.name)}, ${A(Dk.zip.sizeText)}">Download the kit <span class="num">${A(Dk.zip.sizeText)}</span></a></div>` };
  const list = { cls: 'pz-folders', html: `<ol class="pz-fold">${groups.map(([t, what, inner], i) => `<li><div class="pz-fold__h"><span class="pz-c num">${String(i + 1).padStart(2, '0')}</span><h3 class="pz-d">${A(t)}</h3></div><p class="pz-c">${A(what)}</p>${inner}</li>`).join('')}</ol>` };
  return section(sec, split(ctx, st, sec, 'Downloads', [kit, list], { cls: 'pz-split--dl', h2: true }));
}

export function brandBook(ctx) {
  if (!ctx.book) throw new Error('brandBook needs ctx.book (set by the engine book builder)');
  const st = { n: 0, folio: 0, used: new Set() };
  return [overview, voice, logo, colour, typography, imagery, layout, applications, downloads].map((f) => f(ctx, st)).join('\n');
}
