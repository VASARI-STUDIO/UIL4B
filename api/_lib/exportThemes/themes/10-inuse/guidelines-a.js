// Guidelines pages for theme 10 (In use), run A: intro, personality, voice, write-this, messaging, logo, clear-space, min-size,
// logo-grounds, logo-misuse, palette, proportion, colour-values. Styles are in css-a.js (classes start a-). See guidelines.js for the split.
// The product on phones with numbered notes beside what they point at: every page here is a phone (or a row of phone tops) and a numbered key.
import { A, fit, std, mk, phoneToday } from './helpers.js';

const hexName = (ctx, hex) => ctx.colours.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.name || hex;
const isGround = (ctx, hex) => hex.toLowerCase() === ctx.roles.light.surface.toLowerCase();
const isHair = (ctx, hex) => isGround(ctx, hex) || hex.toLowerCase() === '#ffffff';
const sentences = (s) => s.split(/(?<=\.)\s+/);
const words = (s) => s.trim().split(/\s+/).length;
const NUM = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
// a numbered marker laid over a screen or a drawing (position from the style); light=true on a dark fill
const mkA = (n, style, light = false) => `<span class="mk a-abs${light ? ' a-mk--lt' : ''}" style="${style}">${n}</span>`;
// a note beside a screen: its marker, a bold line, the detail
const note = (n, title, body = '', cls = '') => `<li class="a-n ${cls}">${mk(n)}<div><b>${A(title)}</b>${A(body)}</div></li>`;
// the cross that marks a wrong example
const CROSS = `<svg class="a-cross" viewBox="0 0 24 24" width="24" height="24" role="img" aria-label="Not allowed"><circle cx="12" cy="12" r="12" fill="currentColor"/><path d="M8 8l8 8M16 8l-8 8" stroke="var(--ground)" stroke-width="2" stroke-linecap="square" fill="none"/></svg>`;

// a phone in the flow of the page (w x h); the base .ph class draws the case
const ph = (w, h, inner, cls = '', st = '') => `<div class="ph a-ph ${cls}" style="--w:${w}px;--h:${h}px;${st}" aria-hidden="true">${inner}</div>`;
const sbar = (ctx) => `<div class="sb">${A(ctx.brand.ui.screen.content.time)}</div>`;
// a phone top: a status bar and a ground, cut off where the phone runs on (a row of these is a row of phones)
const pc = (ctx, { ground, fg, hair, h, w = 214, inner = '', marks = '', cls = '' }) => `<div class="a-pc ${hair ? 'hairline' : ''} ${cls}" style="background:${ground};color:${fg};height:${h}px;--w:${w}px"><div class="sb">${A(ctx.brand.ui.screen.content.time)}</div>${inner}${marks}</div>`;

// the Messages screen: the brand's own lines as messages, each marked
function messagesPhone(ctx, style) {
  const B = ctx.brand, V = B.voice, S = B.ui.screen.content;
  const msgs = [[V.principles[0].example, 'Reminder, 2 pm'], [V.principles[2].example, 'When we say no'], [V.principles[1].example, 'After the lesson']];
  const cards = msgs.map(([t, m], i) => `<div class="a-msg"><p>${A(t)}</p><div><b>${A(m)}</b></div>${mkA(i + 1, 'right:12px;top:12px')}</div>`).join('');
  return `<div class="ph" style="${style}" aria-hidden="true"><div class="sb">${A(S.time)}</div><div class="a-fm"><div class="a-fm-h">Messages</div><div class="a-msgs">${cards}</div></div></div>`;
}

// the Book a lesson screen at a width and height, the five palette colours marked where they land (1 Chalk, 2 White, 3 Deep end, 4 Lane, 5 Float)
function bookPhone(ctx, w, h) {
  const S = ctx.brand.ui.screen.content, F = S.form;
  const field = (l, v, i) => `<div class="a-fld"><span>${A(l)}</span><b>${A(v)}</b>${i === 0 ? mkA(2, 'right:12px;top:12px') : ''}</div>`;
  return ph(w, h, `${sbar(ctx)}
<div class="a-fm"><div class="a-fm-t"><span class="a-fm-h">${A(F.title)}</span>${mkA(3, 'right:0;top:2px')}</div>
${[[F.pickup, F.pickupValue], [F.dropoff, F.dropoffValue], [F.ready, F.readyValue]].map(([l, v], i) => field(l, v, i)).join('')}
<div class="teach"><span class="av" style="position:relative">${A(S.initials)}${mkA(5, 'right:-14px;top:-14px')}</span><div><b>${A(S.rider.split(',')[0])}</b><span>${A(S.riderNote)}</span></div></div></div>
${mkA(1, `right:16px;top:${h - 200}px`)}<div class="a-btn">${A(F.book)}${mkA(4, 'right:10px;top:10px', true)}</div>`);
}

export const guidelinesA = {
  intro(ctx) {
    const B = ctx.brand, S = B.ui.screen.content; const [first, ...rest] = sentences(B.description);
    const left = `<div class="a-il"><h1 class="a-h1 a-h1--s">${A(first)}</h1><p class="a-body a-body--s">${A(rest.join(' '))}</p>
<div class="a-blk"><h2 class="a-h3">What it does</h2><p class="a-lead">${A(B.product)}</p></div><div class="a-blk"><h2 class="a-h3">Who it serves</h2><p class="a-lead">${A(B.audience)}</p></div>
<ul class="a-notes">${note(1, 'The lane', S.eta + '.')}${note(2, 'The teacher', S.pickup)}</ul></div>`;
    const phone = `<div class="a-abs a-introph">${phoneToday(ctx, 'left:0;top:0')}${mkA(1, 'left:226px;top:204px')}${mkA(2, 'left:48px;top:348px')}</div>`;
    return std(ctx, 'intro', 'Introduction', left + phone);
  },

  personality(ctx) {
    const B = ctx.brand; const [l1, l2] = B.lines.others;
    const traits = B.personality.map((t, i) => `<li>${mk(i + 1)}<div><h2 class="a-trait">${A(t.trait)}</h2><p class="a-soft">${A(t.means)}</p></div></li>`).join('');
    const inner = `<p class="a-lines"><span>${A(l1)}</span><span>${A(l2)}</span></p>
<div class="a-pers"><div class="a-pers-l"><p class="a-lead">${NUM[B.personality.length]} traits shape how ${A(B.name)} sounds. Each one shows in the messages a parent reads.</p><ul class="a-traits">${traits}</ul></div></div>
${messagesPhone(ctx, 'left:378px;top:330px;height:560px')}`;
    return std(ctx, 'personality', 'Personality', inner);
  },

  // the four habits as four messages in a thread; the key names the habit behind each
  voice(ctx) {
    const V = ctx.brand.voice;
    const msgs = V.principles.map((p, i) => `<div class="a-msg"><p>${A(p.example)}</p>${mkA(i + 1, 'right:12px;top:12px')}</div>`).join('');
    const phone = ph(360, 540, `${sbar(ctx)}<div class="a-fm"><div class="a-fm-h">Messages</div><div class="a-msgs">${msgs}</div></div>`);
    const key = `<ul class="a-notes a-notes--t">${V.principles.map((p, i) => note(i + 1, p.title)).join('')}</ul>`;
    return std(ctx, 'voice', 'Voice', `<p class="a-lead" style="margin-top:8px">${NUM[V.principles.length]} habits keep ${A(ctx.brand.name)} sounding like a person at the pool door. Each has a line we have already written.</p><div class="a-duo">${phone}${key}</div>`);
  },

  // two phones side by side, the same five messages written two ways; the because lines are the key
  'write-this'(ctx) {
    const W = ctx.brand.voice.writeThis;
    const side = (title, cls, pick) => ph(321, 600, `${sbar(ctx)}<div class="a-fm"><div class="a-fm-h">${A(title)}</div><div class="a-msgs">${W.map((r, i) => `<div class="a-msg ${cls}"><p>${A(pick(r))}</p>${mkA(i + 1, 'right:12px;top:12px')}</div>`).join('')}</div></div>`);
    const key = `<h2 class="a-h3" style="margin-top:28px">Because</h2><ul class="a-keyc">${W.map((r, i) => `<li class="a-n">${mk(i + 1)}<div>${A(r.because)}</div></li>`).join('')}</ul>`;
    return std(ctx, 'write-this', 'Write this, not that', `<p class="a-lead" style="margin-top:8px">${NUM[W.length]} lines as a parent would want to read them, beside the lines they replace.</p><div class="a-two2" style="margin-top:28px">${side('Write this', 'a-msg--w', (r) => r.write)}${side('Not that', 'a-msg--n', (r) => r.not)}</div>${key}`);
  },

  // a first-run screen carries the lines; the key carries the boilerplate and the name rules
  messaging(ctx) {
    const B = ctx.brand, V = B.voice, L = ctx.logo, cw = B.logo.colourways.colour, [first, ...others] = [B.lines.primary, ...B.lines.others];
    const line = (t, i, cls) => `<div class="a-fr-l ${cls}"><p>${A(t)}</p>${mkA(i + 1, 'right:0;top:0')}</div>`;
    const phone = ph(360, 580, `${sbar(ctx)}<div class="a-fr"><div class="a-fr-logo">${L.html('colour', { width: 88, color: cw.name, label: 'Logo' })}</div>${line(first, 0, 'a-fr-l--h')}${others.map((t, i) => line(t, i + 1, '')).join('')}</div>`);
    const bp = (label, t) => `<div class="a-blk"><h2 class="a-h3">${label}, ${words(t)} words</h2><p class="a-soft">${A(t)}</p></div>`;
    const key = `<div><ul class="a-notes a-notes--t">${note(1, 'The line', `${words(first)} words`)}${others.map((t, i) => note(i + 2, 'Supporting line', `${words(t)} words`)).join('')}</ul><div class="a-bp">${bp('Short', V.boilerplate25)}${bp('Long', V.boilerplate50)}</div></div>`;
    const name = `<div class="a-blk a-namebar"><h2 class="a-h3">Writing the name</h2><p class="a-nr">${A(V.nameRules)}</p></div>`;
    return std(ctx, 'messaging', 'Lines in use', `<div class="a-duo">${phone}${key}</div>${name}`);
  },

  // the logo in use: an app icon on a home screen, a splash screen and an app header, each a numbered note; the anatomy sits under them
  logo(ctx) {
    const L = ctx.logo, B = ctx.brand, cw = B.logo.colourways, g = L.geos.colour, G = L.geo, slot = ctx.edition === 'slot';
    const cwOf = (id) => cw[L.colourwayOf(id)], S = B.ui.screen.content;
    const blank = (n) => Array.from({ length: n }, () => '<i class="a-ic"></i>').join('');
    const sym = cwOf('symbol');
    const home = ph(214, 400, `${sbar(ctx)}<div class="a-home"><span class="a-ic a-ic--app" style="background:${sym.ground}">${L.html('symbol', { width: fit(ctx, 'symbol', 34, 34), color: sym.name, label: 'Logo' })}${mkA(1, 'right:-8px;top:-8px')}</span>${blank(8)}</div><div class="a-dock">${blank(3)}</div>`, 'a-ph--home');
    const rv = cwOf('reversed');
    const splash = ph(214, 400, `<div class="sb" style="color:${rv.name}">${A(S.time)}</div><div class="a-splash">${L.html('reversed', { width: 150, color: rv.name, label: 'Logo' })}</div>${mkA(2, 'right:12px;top:10px', true)}`, '', 'background:' + rv.ground);
    const hz = cwOf('horizontal');
    const header = ph(214, 400, `${sbar(ctx)}<div class="a-bar a-bar--s">${L.html('horizontal', { width: fit(ctx, 'horizontal', 120, 36), color: hz.name, label: 'Logo' })}${mkA(3, 'right:12px;top:14px')}</div><div class="a-scr"><span class="chip" style="background:${ctx.status[0].light.bg};color:${ctx.status[0].light.fg}">${A(ctx.status[0].label)}</span><div class="disp a-t26">${A(S.eta)}</div><div class="pool a-pool"><span class="fl" style="left:20px">${A(S.to)}</span></div></div>`);
    const col = (p, n, title, id, body) => `<div class="a-lcol">${p}<div class="a-n a-n--b">${mk(n)}<div><b>${A(title)}</b>${A(L.labels[id])}. ${A(body)}</div></div></div>`;
    const w = 330, s = w / g.w, h = g.h * s, T = (G.T || 0) * s;
    const marks = slot ? '' : `${mkA(4, `right:-40px;top:${Math.round((h - T - (G.gap || 0) * s) / 2 - 12)}px`)}${mkA(5, `right:-40px;top:${Math.round(h - T / 2 - 12)}px`)}`;
    const anatomy = `<div class="a-anat"><div class="a-anat-l hairline" style="background:${cw.colour.ground}"><div class="a-lw" style="width:${w}px">${L.html('colour', { width: w, color: cw.colour.name, label: 'Your logo goes here' })}${marks}</div></div><div>${slot ? '' : `<ul class="a-notes">${note(4, 'The name', 'Set in ' + B.fonts.display.family + ' 700, outlined, in Deep end.')}${note(5, 'The rope', 'Round dashes in Lane, as wide as the name, drawn with it every time.')}</ul>`}<p class="cap" style="margin-top:16px"><b>${A(L.labels.colour)}</b>${A(B.logo.when.colour)} ${A(B.logo.showcase.symbolNote)}</p></div></div>`;
    return std(ctx, 'logo', 'The logo', `<p class="a-lead" style="margin-top:8px;max-width:600px">${A(B.logo.idea)}</p><div class="a-lrow">${col(home, 1, 'App icon', 'symbol', B.logo.when.symbol)}${col(splash, 2, 'Splash screen', 'reversed', B.logo.when.reversed)}${col(header, 3, 'App header', 'horizontal', B.logo.when.horizontal)}</div>${anatomy}`);
  },

  // the zone drawn round the name on a splash and round the symbol as an app icon, x on every side
  'clear-space'(ctx) {
    const L = ctx.logo, B = ctx.brand, g = L.geos.colour, lw = 190, s = lw / g.w, lh = g.h * s, X = L.geo.cap * s;
    const cw = B.logo.colourways.colour, share = L.clearShare, r = (n) => n.toFixed(1);
    const unitBox = (st) => `<span class="a-unit" style="${st};width:${r(X)}px;height:${r(X)}px">x</span>`;
    const mkZone = (id, w, h, marks) => `<div class="a-zone" style="width:${r(w + 2 * X)}px;height:${r(h + 2 * X)}px">${unitBox('left:0;top:0')}${unitBox('right:0;top:0')}${unitBox('left:0;bottom:0')}${unitBox('right:0;bottom:0')}
<div class="a-zin" style="left:${r(X)}px;top:${r(X)}px;width:${r(w)}px;height:${r(h)}px">${L.html(id, { width: Math.round(w), color: cw.name, label: id === 'colour' ? 'Your logo goes here' : 'Logo' })}</div>${marks}</div>`;
    const sg = L.geos.symbol, sw = Math.max(56, sg.w * s * 1.4), sh = sw * sg.h / sg.w;
    const blank = (n) => Array.from({ length: n }, () => '<i class="a-ic"></i>').join('');
    const phA = ph(321, 560, `${sbar(ctx)}<div class="a-cen">${mkZone('colour', lw, lh, `${mkA(1, 'left:-12px;top:-12px')}${mkA(2, 'right:-12px;top:50%;margin-top:-12px')}`)}</div>`);
    const phB = ph(321, 560, `${sbar(ctx)}<div class="a-cen">${mkZone('symbol', sw, sh, mkA(3, 'left:-12px;top:-12px'))}</div><div class="a-dock a-dock--w">${blank(4)}</div>`, 'a-ph--home');
    const unit = ctx.edition === 'slot' ? `x is ${share}% of the logo's height.` : `x is the height of the P, ${share}% of the logo's height.`;
    const notes = `<ul class="a-notes a-notes--3">${note(1, 'Clear zone', `Keep a clear zone around the logo, x on every side. ${unit}`)}${note(2, 'Nothing enters it', 'No type, no edges, no other logos. Measure from the edge of the logo, on all four sides.')}${note(3, 'The symbol', 'The symbol keeps the same x, so it takes the same room as the name does.')}</ul>`;
    return std(ctx, 'clear-space', 'Clear space', `<div class="a-two2" style="margin-top:32px">${phA}${phB}</div>${notes}`);
  },

  // the phone shows the logo at its screen minimum in an app header; the key draws both minimums at true size
  'min-size'(ctx) {
    const L = ctx.logo, m = L.minSize, cw = ctx.brand.logo.colourways.colour, S = ctx.brand.ui.screen.content;
    const mmPx = (mm) => (mm * 96) / 25.4;
    const spec = (n, w, head, sub) => `<li class="a-n a-n--sp">${mk(n)}<div><div class="a-spec">${L.html('colour', { width: Math.round(w), color: cw.name, label: 'Logo' })}<i class="a-ruler" style="width:${Math.round(w)}px"></i></div><b>${head}</b>${sub}</div></li>`;
    const bar = `<div class="a-bar">${L.html('colour', { width: m.screenPx, color: cw.name, label: 'Logo' })}<span>${A(S.rider.split(',')[0])}</span>${mkA(1, 'left:116px;top:4px')}</div>`;
    const crop = `<div class="a-crop">${phoneToday(ctx, 'left:0;top:0;height:560px;border-radius:28px 28px 0 0;box-shadow:none').replace('<div class="scr">', `${bar}<div class="scr">`)}</div>`;
    const key = `<ul class="a-notes">${note(1, 'On a phone', `The logo at ${m.screenPx} px in an app header on a phone 360 px wide. Anything narrower uses the symbol, where the name is already nearby.`)}${spec(2, m.screenPx, `Screen: ${m.screenPx} px wide`, `${m.screenH} px high. The smallest it appears on a page or a screen.`)}${spec(3, mmPx(m.printMm), `Print: ${m.printMm} mm wide`, `${m.printH} mm high. The smallest it prints, on any paper.`)}</ul>`;
    return std(ctx, 'min-size', 'Minimum size', `<p class="a-lead" style="margin-top:8px">The logo never goes smaller than these widths. Both are drawn at actual size: on screen at one pixel to the pixel, in print at true millimetres.</p><div class="a-duo">${crop}${key}</div>`);
  },

  // seven phone tops, one per ground, numbered; the key on the left says what sits on each
  'logo-grounds'(ctx) {
    const L = ctx.logo, cw = ctx.brand.logo.colourways, keys = ['colour', 'mono-dark', 'mono-light', 'reversed', 'on-float', 'on-lane'];
    const ml = cw['mono-light'], dark = new Set(['mono-light', 'reversed', 'on-lane']);
    const desc = (c) => (c.name.toLowerCase() === c.lane.toLowerCase() ? `${hexName(ctx, c.name)} name and rope` : `${hexName(ctx, c.name)} name, ${hexName(ctx, c.lane)} rope`);
    const cell = (key, n) => {
      const c = cw[key];
      return pc(ctx, { ground: c.ground, fg: c.name, hair: isHair(ctx, c.ground), h: 190, inner: `<div class="a-pcb">${L.html('colour', { width: 150, colourway: key, color: c.name, label: 'Logo' })}</div>`, marks: mkA(n, 'right:12px;top:10px', dark.has(key)) });
    };
    const photo = pc(ctx, { ground: 'var(--ink)', fg: '#FFFFFF', h: 404, cls: 'a-pc--photo', inner: `${ctx.photo('pool-door', { cls: 'a-fillimg' })}<span class="a-onphoto">${L.html('mono-light', { width: 160, colourway: 'mono-light', color: ml.name, label: 'Logo' })}</span>`, marks: mkA(7, 'right:12px;top:10px', true) });
    const names = [...new Set(keys.map((k) => hexName(ctx, cw[k].ground)))];
    const key = `<ul class="a-notes a-gkey">${keys.map((k, i) => note(i + 1, 'On ' + hexName(ctx, cw[k].ground), desc(cw[k]))).join('')}${note(7, 'On a photo', 'Mono light, on a quiet, dark part of the picture. Keep it clear of faces, lane ropes and water.')}</ul>`;
    const inner = `<p class="a-lead" style="margin-top:8px">The logo sits on ${names.slice(0, -1).map((n) => A(n)).join(', ')} and ${A(names.at(-1))}, each in its own colourway. On a photo it goes in mono light.</p><div class="a-gd">${key}<div class="a-gcells">${photo}${keys.map((k, i) => cell(k, i + 1)).join('')}</div></div>`;
    return std(ctx, 'logo-grounds', 'Logo on colour and photos', inner);
  },

  // six wrong versions on phone tops, each crossed and numbered; the key on the right says why
  'logo-misuse'(ctx) {
    const L = ctx.logo, B = ctx.brand, w = 150, cw = B.logo.colourways;
    const off = ctx.C.toOklch(ctx.colours.find((c) => c.role === 'action').hex); const wrong = ctx.C.fromOklch(Math.min(off.L, 0.5), off.C, (off.H + 150) % 360);
    // water: wavy bands in the palette's own colours, a ground no logo may sit on
    const band = (y, c) => `<path d="M0 ${y} q 18 -14 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0 t 36 0" fill="none" stroke="${c}" stroke-width="9"/>`;
    const water = `<svg class="a-fillimg" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="280" height="160" fill="${cw['on-lane'].ground}"/>${[18, 44, 70, 96, 122, 148].map((y, i) => band(y, i % 2 ? cw.reversed.lane : cw.colour.ground)).join('')}</svg>`;
    const items = [
      ['Stretched', 'Never squash or stretch it. Scale it evenly.', `<div style="transform:scale(1.2,0.72)">${L.forMisuse(w)}</div>`],
      ['Recoloured', 'Never recolour it. Use a colourway from the versions page.', L.forMisuse(w, { fill: wrong })],
      ['Rotated', 'Never tilt or turn it. It sits level with the page.', `<div style="transform:rotate(-14deg)">${L.forMisuse(w)}</div>`],
      ['Effects', 'No shadows, glows or bevels.', `<div style="filter:drop-shadow(5px 6px 4px rgba(${ctx.C.hexToRgb(cw.colour.name).join(',')},0.55))">${L.forMisuse(w)}</div>`],
      ['Busy ground', 'Never over lane ropes or splashing water. Use a flat colour or a quiet photo.', `${water}<span class="a-onphoto a-onphoto--mid">${L.forMisuse(w)}</span>`],
      ['Outlined or boxed', 'No outlines, no boxes, no frames around it.', `<div class="a-boxed">${L.forMisuse(w - 36)}</div>`],
    ];
    const tile = ([, , html], i) => pc(ctx, { ground: 'var(--card)', fg: 'var(--ink)', hair: true, h: 250, inner: `<div class="a-pcb">${html}</div>`, marks: `${CROSS}${mkA(i + 1, 'left:12px;bottom:12px', i === 4)}` });
    const key = `<ul class="a-notes a-gkey">${items.map(([t, cap], i) => note(i + 1, t, cap)).join('')}</ul>`;
    return std(ctx, 'logo-misuse', 'Logo misuse', `<p class="a-lead" style="margin-top:8px">Six ways the logo goes wrong. Use the supplied files as they are, and none of these.</p><div class="a-md"><div class="a-mcells">${items.map(tile).join('')}</div>${key}</div>`);
  },

  // the key sits on the left, the phone on the right: the colours where they land
  palette(ctx) {
    const cs = ctx.colours, g = cs.find((c) => c.role === 'ground') || cs[0];
    const ord = ['ground', 'card', 'text', 'action', 'highlight'].map((r) => cs.find((c) => c.role === r)).filter(Boolean);
    const sw = (c) => `<span class="a-sw ${isHair(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></span>`;
    const notes = ord.map((c, i) => `<li class="a-n a-n--pal">${mk(i + 1)}${sw(c)}<div><b>${A(c.name)}</b>${A(ctx.cap(c.role))}. ${A(c.lands)}</div></li>`).join('');
    const inner = `<p class="a-lead" style="margin-top:8px;max-width:600px">${NUM[cs.length]} colours, each named for where it lands. Most of every screen is ${A(g.name)}. The other four each do one job.</p>
<div class="a-duo a-duo--r"><ul class="a-notes">${notes}</ul>${bookPhone(ctx, 360, 740)}</div>`;
    return std(ctx, 'palette', 'The palette at work', inner);
  },

  proportion(ctx) {
    const cs = [...ctx.colours].sort((a, b) => b.share - a.share), pc = (c) => Math.round(c.share * 100);
    const [g, p, ...rest] = cs, total = cs.reduce((s, c) => s + c.share, 0);
    const col2 = 1 - g.share / total, pH = p.share / total / col2, restH = 1 - pH, restW = rest.reduce((s, c) => s + c.share, 0);
    const block = (c) => `<div style="background:${c.hex}"></div>`;
    const phone = `<div class="a-pg" style="grid-template-columns:${(g.share / total * 100).toFixed(2)}fr ${(col2 * 100).toFixed(2)}fr" role="img" aria-label="A phone screen with each colour's area drawn to its share">${block(g)}<div class="a-pgcol" style="grid-template-rows:${(pH * 100).toFixed(2)}fr ${(restH * 100).toFixed(2)}fr">${block(p)}<div class="a-pgrow" style="grid-template-columns:${rest.map((c) => (c.share / restW * 100).toFixed(2) + 'fr').join(' ')}">${rest.map(block).join('')}</div></div></div>`;
    const list = cs.map((c) => `<li><span class="a-sw ${isHair(ctx, c.hex) ? 'hairline' : ''}" style="background:${c.hex}"></span><span class="a-pcn">${A(c.name)}</span><span class="a-pct num">${pc(c)}%</span></li>`).join('');
    const restText = rest.map((c) => A(c.name)).join(', ').replace(/, ([^,]*)$/, ' and $1');
    const inner = `<div class="a-prop"><figure>${phone}<figcaption class="cap" style="margin-top:12px"><b>One screen, drawn to scale</b>Each colour's area is its share of the screen.</figcaption></figure>
<div class="a-prop-side"><p class="a-lead">Most of every page is ${A(g.name)}. ${A(p.name)} holds the one thing on each card, and ${restText} take ${rest.map((c) => pc(c) + ' per cent').join(', ').replace(/, ([^,]*)$/, ' and $1')} between them, so they stay the loudest things on the page.</p><ul class="a-plist">${list}</ul></div></div>`;
    return std(ctx, 'proportion', 'Proportion', inner);
  },

  // the phone with the five colours marked, and a numbered key: swatch, three values, a slim ramp strip
  'colour-values'(ctx) {
    const steps = Object.keys(ctx.colours[0].ramp), action = ctx.colours.find((c) => c.role === 'action') || ctx.colours[0];
    const hl = (hex) => (isHair(ctx, hex) ? 'hairline' : '');
    const ord = ['ground', 'card', 'text', 'action', 'highlight'].map((r) => ctx.colours.find((c) => c.role === r)).filter(Boolean);
    const rest = ctx.colours.filter((c) => !ord.includes(c)); const list = [...ord, ...rest];
    const row = (c, i) => `<li class="a-kv"><div class="a-kvh">${mk(i + 1)}<i class="a-sw ${hl(c.hex)}" style="background:${c.hex}"></i><b>${A(c.name)}</b></div>
<p class="a-kvv"><span class="a-mono">${A(c.hex)}</span><span class="a-mono">${A(c.rgb.replace(/R(\d+) G(\d+) B(\d+)/, 'R $1  G $2  B $3'))}</span></p><p class="a-kvv"><span class="a-mono">${A(c.oklch)}</span></p>
${c.rampBase === 50 ? `<p class="a-rampnote">${c.role === 'ground' ? 'The ground.' : 'The card colour.'} No tints.</p>` : `<div class="a-ramp">${steps.map((k) => `<span class="${String(k) === String(c.rampBase) ? 'base' : ''}"><i class="${hl(c.ramp[k])}" style="background:${c.ramp[k]}"></i><em class="num">${A(k)}</em></span>`).join('')}</div>`}</li>`;
    const tones = ctx.tones.map((t) => `<li><i class="a-sw ${hl(t.hex)}" style="background:${t.hex}"></i><span><b>${A(t.name)}</b><span class="a-mono">${A(t.hex)}</span></span></li>`).join('');
    const inner = `<div class="a-duo a-duo--v">${bookPhone(ctx, 300, 640)}<ul class="a-kvs">${list.map(row).join('')}</ul></div><div class="a-vbot"><div><h2 class="a-h3">Tones</h2><ul class="a-tones">${tones}</ul></div><p class="a-soft">Values are for screens. Print can shift a colour, so ask your printer for a proof before a run, and match ${A(action.name)} to the proof. The ringed step on each ramp is the colour itself. Chalk and White are grounds, so they have no ramp. Every ramp step is in the palette files in the brand kit.</p></div>`;
    return std(ctx, 'colour-values', 'Colour values', inner);
  },
};
