// Theme 10 guidelines pages, wave 2 run B: typefaces, hierarchy, type-in-use, type-rules, photo-direction, shot-list, imagery-rules,
// grid, layouts, social, signage, email-signature, digital, summary, contact-scope. Styles are in css-b.js (classes start b-).
// Distinct pass: every page is the product on a phone with numbered notes beside what they point at, and a numbered key.
import { A, std, mk, fit, phoneToday } from './helpers.js';

const tok = (ctx, t) => ctx.brand.type.scale.find((s) => s.token === t);
const first = (s) => s.split(/(?<=\.)\s+/)[0];
const shotTitle = (s) => s.slot.split(':')[0];
// numbered notes beside a drawing; each entry is [title, html text]
const notes = (items, cls = '') => `<ol class="b-notes ${cls}">${items.map(([t, d], i) => `<li>${mk(i + 1)}<div><b>${A(t)}</b>${d}</div></li>`).join('')}</ol>`;
// a marker set on the phone itself, level with the thing it names
const mkm = (n, top, cls = '') => `<span class="mk b-m ${cls}" style="top:${top}px">${n}</span>`;
// a marker that belongs to an item on the screen: it sits level with the item, outside the phone, with a leader back to it
const mkp = (n, cls = '', style = '') => `<span class="mk b-pm ${cls}" style="${style}">${n}</span>`;
// the product screen scaled to a box: authored at w x h, shown at scale k
const scaled = (k, w, h, inner, cls = '', style = '') => `<div class="b-sc ${cls}" style="width:${Math.round(w * k)}px;height:${Math.round(h * k)}px;${style}"><div class="b-sc__in" style="width:${w}px;height:${h}px;transform:scale(${k})">${inner}</div></div>`;
// two phones side by side, one row per demo (left the rule followed, right the rule broken); the notes sit in the gap between them
const duo = (time, tick, demos, h, rh) => {
  const col = (side, ok) => `<div class="ph b-vp" style="left:${ok ? 0 : 360}px;top:0;width:322px;height:${h}px"><div class="sb"><span>${A(time)}</span>${tick(ok)}</div><div class="b-rowsw">${demos.map((d, i) => `<div class="b-pi b-drow" style="height:${rh}px">${d[side]}${ok ? mkp(i + 1, 'b-pm--d') : ''}</div>`).join('')}</div></div>`;
  return `<div class="b-duo" style="height:${h}px">${col(0, true)}${col(1, false)}</div>`;
};
// the Today screen with its rows and a pinned foot, so the phone reads as a whole screen
const phoneFull = (ctx, style) => {
  const S = ctx.brand.ui.screen.content;
  const rows = `<div class="b-rows"><p><span>${A(S.deliverToLabel)}</span><span>${A(S.deliverTo)}</span></p><p><span>${A(S.paidLabel)}</span><span class="num">${A(S.paid)}</span></p></div>`;
  const foot = `<div class="b-foot"><span class="b-pill">${A(S.share)}</span></div>`;
  return phoneToday(ctx, style).replace(/<\/div><\/div>$/, `${rows}</div>${foot}</div>`);
};
const wname = { 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold' };

const own = {
  typefaces(ctx) {
    const F = ctx.brand.fonts, d = F.display, b = F.body, m = F.mono, sc = ctx.brand.type.scale;
    const tokens = (face) => sc.filter((s) => s.face === face).map((s) => s.token).join(', ');
    const ws = (f) => f.weights.map((w) => wname[w] || w).join(', ');
    const phone = `${phoneFull(ctx, 'left:0;top:0')}${mkm(1, 58)}${mkm(2, 104)}${mkm(3, 384)}`;
    const list = notes([
      [`${b.family}, ${ws(b)}`, `Body. Chips, labels and buttons take the heavier weights: ${A(tokens('body'))} set the rest.`],
      [`${d.family}, ${ws(d)}`, `<span class="disp b-spec" aria-hidden="true">Aa Bb Cc 0123</span>Display. The wordmark and the line a screen opens with. Used for ${A(tokens('display'))}.`],
      [`${b.family}, Regular`, `Reading text and the notes under a name. One thing at a time, in sentence case.`],
    ]);
    const mono = `<div class="b-monorow"><span class="b-mono">${A(ctx.roles.light.action)}</span><p class="cap"><b>${A(m.family)}</b>Only for a hex, a token or a code string.</p></div>`;
    const licence = `<p class="cap b-lic">${A(d.family)}, ${A(b.family)} and ${A(m.family)} are open source under the SIL Open Font Licence. Free to use in print and on screen, and free to download from Google Fonts.</p>`;
    return std(ctx, 'typefaces', 'Typefaces', `<div class="b-two"><div class="b-pw">${phone}</div><div class="b-side">${list}${mono}</div></div>${licence}`);
  },

  hierarchy(ctx) {
    const S = ctx.brand.type, c = ctx.brand.ui.screen.content;
    const time = (c.eta.match(/\d{1,2}:\d{2}/) || [c.eta])[0];
    const samples = { display: time, headline: ctx.brand.lines.others[1], title: c.eta, body: first(S.sample.paragraph), label: c.form.book, caption: S.sample.caption };
    // the six styles set on one screen, each with a note on the screen's edge; the key gives each spec
    const items = S.scale.map((t, i) => {
      const face = t.face === 'display';
      const style = `font-size:${t.size}px;line-height:${t.line};${face ? '' : `font-family:var(--body);font-weight:${t.weight};`}`;
      return `<div class="b-pi b-ti">${mkp(i + 1, '', '--pmx:36px')}<p class="${face ? 'disp ' : ''}b-ti__s" style="${style}">${A(samples[t.token] || t.use)}</p></div>`;
    }).join('');
    const phone = `<div class="ph b-vp" style="left:0;top:0"><div class="sb">${A(c.time)}</div><div class="b-tscr">${items}</div></div>`;
    const key = `<ol class="b-notes b-key">${S.scale.map((t, i) => `<li>${mk(i + 1)}<div><b>${A(ctx.cap(t.token))}</b><span class="num">${t.size} px, line ${t.line}, weight ${t.weight}</span>${A(t.use)}</div></li>`).join('')}</ol>`;
    const body = tok(ctx, 'body'), cap = tok(ctx, 'caption');
    return std(ctx, 'hierarchy', 'Hierarchy', `<p class="b-lead">${S.scale.length} steps, each with one job. Reading text is ${body.size} px and captions are ${cap.size} px. Nothing sits between.</p><div class="b-two"><div class="b-pw">${phone}</div><div class="b-side">${key}</div></div>`);
  },

  'type-in-use'(ctx) {
    const S = ctx.brand.type, h = tok(ctx, 'headline'), bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const fam = (t) => ctx.brand.fonts[t.face].family;
    const spec = (t) => `${t.size} px, line ${t.line}, ${A(fam(t))} ${t.weight}`;
    const L = 'b-pm--l', X = '--pmx:52px';
    // the welcome sheet rising over a phone screen; its three notes sit on the screen's left edge
    const sheet = `<div class="b-bsheet"><i class="b-bsheet__bar"></i>
<div class="b-pi">${mkp(1, L, X)}<h2 class="disp b-sh" style="font-size:${h.size}px;line-height:${h.line}">${A(S.sample.headline)}</h2></div>
<div class="b-pi">${mkp(2, L, X)}<p class="b-sp" style="font-size:${bd.size}px;line-height:${bd.line}">${A(S.sample.paragraph)}</p></div>
<div class="b-pi b-it--foot">${mkp(3, L, X)}<p class="b-sc3" style="font-size:${cp.size}px;line-height:${cp.line}">${A(S.sample.caption)}</p></div></div>`;
    const phone = `<div class="ph b-vp" style="left:60px;top:0"><div class="sb">${A(ctx.brand.ui.screen.content.time)}</div>${sheet}</div>`;
    const list = notes([['Headline', `${spec(h)}. Sentence case, three lines at most.`], ['Paragraph', `${spec(bd)}. Colour is Soft Deep end on Chalk.`], ['Caption', `${spec(cp)}. Quiet text, never faded.`]]);
    return std(ctx, 'type-in-use', 'Type in use', `<p class="b-lead">A welcome sheet, handed over at the pool door: a headline, a paragraph and a caption, set the way ${A(ctx.brand.name)} sets them.</p><div class="b-two"><div class="b-side b-side--l">${list}</div><div class="b-pw b-pw--r">${phone}</div></div>`);
  },

  'type-rules'(ctx) {
    const R = ctx.brand.type.rules, c = ctx.brand.ui.screen.content, line = c.eta, action = ctx.roles.light.action;
    const d = (s, extra = '') => `<span class="disp b-dd" style="font-size:19px;${extra}">${A(s)}</span>`;
    const demos = [
      [d(line), d(line, 'text-transform:uppercase')],
      [d(line), d(line, 'letter-spacing:0.1em')],
      [`<span class="b-d" style="font-size:16px">${A(c.eta)}.</span>`, `<span class="b-d" style="font-size:9px">${A(c.eta)}.</span>`],
      [`<span class="b-d" style="font-size:14px;color:var(--quiet)">${A(c.riderNote)}</span>`, `<span class="b-bars" aria-hidden="true"><i style="width:140px"></i><i style="width:96px"></i></span>`],
      [`<span class="b-mono">${A(action)}</span>`, `<span class="b-mono">${A(c.form.book)}</span>`],
    ];
    const tick = (ok) => `<span class="b-tk ${ok ? 'b-tk--ok' : 'b-tk--no'}">${ctx.ui.icon(ok ? 'check' : 'x', 14)}</span>`;
    const h = 44 + 5 * 104 + 24;
    const key = `<ol class="b-kr">${R.map((r, i) => `<li>${mk(i + 1)}<p class="cap">${tick(true)}<span>${A(r.do)}</span></p><p class="cap">${tick(false)}<span>${A(r.dont)}</span></p></li>`).join('')}</ol>`;
    return std(ctx, 'type-rules', 'Type rules', `${duo(c.time, tick, demos, h, 104)}${key}`);
  },

  'photo-direction'(ctx) {
    const D = ctx.brand.imagery.direction, S = ctx.brand.ui.screen.content;
    const items = [['Subject', D.subject], ['Light', D.light], ['Crop', D.crop], ['Colour', D.colour], ['People', D.people]];
    // the photo full bleed on a phone, a note down the screen's left edge for each part of the direction
    const phone = `<div class="ph b-vp" style="left:60px;top:0"><div class="sb">${A(S.time)}</div>${ctx.photo('pool-door', { cls: 'b-pfull' })}<span class="b-room">Room for a line of type<span class="mk b-gdm">3</span></span><span class="b-gd" style="left:16px;top:60px;width:180px;height:76px"><span class="mk b-gdm">2</span></span><span class="b-gd" style="left:16px;top:156px;width:180px;height:150px"><span class="mk b-gdm">1</span></span><span class="b-gd" style="left:16px;top:326px;width:180px;height:110px"><span class="mk b-gdm">5</span></span><i class="b-cap4"></i><span class="mk b-gdm" style="left:76px;top:210px">4</span></div>`;
    return std(ctx, 'photo-direction', 'Photo direction', `<p class="b-lead">The child is the subject. Everything else in the frame is there to show where she is learning.</p><div class="b-two"><div class="b-side b-side--l">${notes(items.map(([t, d]) => [t, A(d)]))}</div><div class="b-pw b-pw--r">${phone}</div></div>`);
  },

  'shot-list'(ctx) {
    const shots = ctx.brand.imagery.shots, S = ctx.brand.ui.screen.content;
    const cell = (s, i) => `<figure class="b-shot b-drow b-drow--shot">${ctx.photo(s.id, { cls: 'b-shp' })}<figcaption>${mk(i + 1)}<b>${A(shotTitle(s))}</b></figcaption></figure>`;
    const col = (from, left) => `<div class="ph b-vp" style="left:${left}px;top:0;width:322px;height:716px"><div class="sb">${A(S.time)}</div><div class="b-rowsw b-rowsw--shots">${[0, 1, 2].map((k) => cell(shots[from + k], from + k)).join('')}</div></div>`;
    return std(ctx, 'shot-list', 'Shot list', `<p class="b-lead">Six shots to book first. Each says the shot, the crop and the light. Until the photos exist, the slot holds the brief.</p><div class="b-duo" style="height:716px">${col(0, 0)}${col(3, 360)}</div>`);
  },

  'imagery-rules'(ctx) {
    const R = ctx.brand.imagery.rules, S = ctx.brand.ui.screen.content;
    const lanes = '<i style="left:25%"></i><i style="left:50%"></i><i style="left:75%"></i>';
    const sw = (cls = '', inner = '') => `<div class="b-ill ${cls}"><span class="b-lanes" aria-hidden="true">${lanes}</span>${inner}</div>`;
    const swimmer = '<span class="b-swim" aria-hidden="true"></span>';
    const sym = (extra) => `<span class="b-sym">${ctx.logo.html('symbol', { width: fit(ctx, 'symbol', 40, 44), label: 'Logo', color: ctx.roles.light.text })}</span>${extra || ''}`;
    const demos = [
      [sw('b-ill--pool', swimmer), `<div class="b-ill b-ill--wall">${swimmer}</div>`],
      [sw('b-ill--pool', swimmer), sw('b-ill--wash', swimmer)],
      [`<div class="b-ill ui b-ill--ui">${ctx.ui.check(S.example.checks[2], { checked: true })}</div>`, `<div class="b-ill b-ill--wall b-ill--stock"><span>Stock photo</span></div>`],
      [`<div class="b-ill b-ill--flat">${sym()}</div>`, sw('b-ill--pool', sym())],
    ];
    const tick = (ok) => `<span class="b-tk ${ok ? 'b-tk--ok' : 'b-tk--no'}">${ctx.ui.icon(ok ? 'check' : 'x', 14)}</span>`;
    const rh = 136, h = 44 + 4 * rh + 24;
    const key = `<ol class="b-kr">${R.map((r, i) => `<li>${mk(i + 1)}<p class="cap">${tick(true)}<span>${A(r.do)}</span></p><p class="cap">${tick(false)}<span>${A(r.dont)}</span></p></li>`).join('')}</ol>`;
    return std(ctx, 'imagery-rules', 'Imagery rules', `${duo(S.time, tick, demos, h, rh)}${key}`);
  },

  grid(ctx) {
    const G = ctx.gridMeasures, k = 0.5, W = G.page.w, H = G.page.h, col = G.col;
    const x = (i) => G.margin + i * (col + G.gutter);
    const cols = Array.from({ length: G.columns }, (_, i) => `<i class="b-col" style="left:${x(i) * k}px;width:${col * k}px;top:${G.margin * k}px;bottom:${G.margin * k}px"></i>`).join('');
    // the phone on the left margin, its three notes starting in the fifth column (as on the Layouts page)
    const onPage = `<div class="b-ab" style="left:${G.margin * k}px;top:${112 * k}px">${scaled(k, 360, 740, phoneToday(ctx, 'left:0;top:0'), '')}</div>${[0, 1, 2].map((i) => `<i class="b-bar" style="left:${x(4) * k}px;top:${(236 + i * 120) * k}px;width:${100}px;height:7px"></i><i class="b-bar" style="left:${x(4) * k}px;top:${(236 + i * 120) * k + 14}px;width:70px;height:5px"></i>`).join('')}`;
    const at =(n, cx) => `<span class="mk b-md" style="left:${(cx - 12).toFixed(1)}px">${n}</span>`;
    const marks = at(1, (G.margin * k) / 2) + at(2, (x(2) + col / 2) * k) + at(3, (x(3) + col + G.gutter / 2) * k);
    const cell = 12;
    const base = `<svg class="b-base" width="${cell * 5}" height="${cell * 5}" viewBox="0 0 ${cell * 5} ${cell * 5}" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => `<path d="M${i * cell} 0V${cell * 5}M0 ${i * cell}H${cell * 5}" stroke="${ctx.roles.light.divider}" stroke-width="1"/>`).join('')}<rect x="${cell}" y="${cell}" width="${cell * 3}" height="${cell * 2}" fill="${ctx.roles.light.action}"/></svg>`;
    const list = notes([
      ['Margin', `${G.margin} px on every side of the ${W} × ${H} page.`],
      ['Columns', `${G.columns} columns, ${+col.toFixed(1)} px each.`],
      ['Gutter', `${G.gutter} px between columns.`],
      ['Base', `${G.base} px. Every space and every size in a layout is a multiple of it.${base}`],
    ]);
    const page = `<div class="b-gw"><div class="b-mini" style="width:${W * k}px;height:${H * k}px">${cols}${onPage}</div>${marks}</div>`;
    return std(ctx, 'grid', 'Grid', `<p class="b-lead">One page, six columns. A phone sits on the left margin, and its notes start in the fifth column.</p><div class="b-two b-two--grid">${page}<div class="b-side">${list}</div></div>`);
  },

  // run G: the cover layout drawn large with its parts pinned, the other two beside it, and a numbered note for every part
  layouts(ctx) {
    const G = ctx.gridMeasures, B = ctx.brand, S = B.ui.screen.content, W = G.page.w, H = G.page.h;
    const x = (i) => G.margin + i * (G.col + G.gutter);
    const cols = Array.from({ length: G.columns }, (_, i) => `<i class="b-gc" style="left:${x(i)}px;width:${G.col}px"></i>`).join('');
    const bar = (l, t, w, h = 14) => `<i class="b-bar" style="left:${l}px;top:${t}px;width:${w}px;height:${h}px"></i>`;
    const logo = (l, t, w) => `<div class="b-ab" style="left:${l}px;top:${t}px">${ctx.logo.html('colour', { width: w, label: 'Logo' })}</div>`;
    const ph = (l, t) => `<div class="b-ab" style="left:${l}px;top:${t}px;width:360px;height:740px">${phoneToday(ctx, 'left:0;top:0')}</div>`;
    const dot = (l, t) => `<span class="mk b-ab" style="left:${l}px;top:${t}px"></span>`;
    const draw = (k, inner, pins) => `<div class="b-lcell" style="width:${Math.round(W * k)}px">${scaled(k, W, H, `<div class="b-lay">${cols}${inner}</div>`, 'b-thumb')}${pins.map(([n, px, py]) => `<span class="mk b-lpin" style="left:${Math.round(px * k - 12)}px;top:${Math.round(py * k - 12)}px">${n}</span>`).join('')}</div>`;
    const phL = W - G.margin - 360;
    const a = draw(0.57, `<i class="b-stripe" style="left:${x(3)}px;width:${G.col * 2 + G.gutter}px"></i>${logo(G.margin, 140, 330)}${bar(G.margin, 300, 220)}${ph(phL, 560)}`, [[1, G.margin + 330 + 28, 200], [2, x(3) + G.col + G.gutter / 2, 70], [3, phL + 330, 590]]);
    const b = draw(0.27, `${bar(G.margin, 112, 260, 28)}${ph(G.margin, 172)}${[0, 1, 2].map((i) => `${dot(x(4), 236 + i * 120)}${bar(x(4) + 40, 240 + i * 120, 150)}${bar(x(4) + 40, 264 + i * 120, 110, 10)}`).join('')}`, [[4, G.margin + 330, 200], [5, x(4) + 110, 170]]);
    const c = draw(0.27, `${bar(G.margin, 112, 260, 28)}<div class="b-ab" style="left:${G.margin}px;top:172px;width:${W - 2 * G.margin}px;height:520px">${ctx.photo('pool-door', { slotNote: false, style: 'width:100%;height:100%;border-radius:20px' })}</div><h2 class="disp b-ab b-lh" style="left:${G.margin}px;top:740px;width:${W - 2 * G.margin}px">${A(B.lines.others[1])}</h2><span class="b-pbtn b-ab" style="left:${G.margin}px;top:930px">${A(S.empty.cta)}</span>`, [[6, W - G.margin - 40, 230], [7, W - G.margin - 40, 790]]);
    const grp = (title, items) => `<section class="b-lg"><h2 class="b-lh2">${title}</h2><ol>${items.map(([n, t]) => `<li>${mk(n)}<p>${t}</p></li>`).join('')}</ol></section>`;
    const notes = `<div class="b-lgs">${grp('Cover', [[1, 'The name in columns 1 to 3.'], [2, 'A Float stripe over columns 4 and 5.'], [3, 'The phone on the right margin.']])}${grp('Screen with notes', [[4, 'The phone on the left margin.'], [5, 'Markers and notes in columns 5 and 6.']])}${grp('Line and photo', [[6, 'A photo across all six columns.'], [7, 'The line under it, one button, nothing else.']])}</div>`;
    return std(ctx, 'layouts', 'Layouts', `<p class="b-lead">Three layouts, each on the same six columns. The columns show behind each one.</p><div class="b-lrow">${a}<div class="b-lcol">${b}${c}</div></div>${notes}`);
  },

  social(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, [p1, p2, p3] = B.applications.social, cw = B.logo.colourways;
    const k = 0.298, lg = (id, w, cwName) => ctx.logo.html(id, { width: w, colourway: cwName, color: cw[cwName || id].name, label: 'Logo' });
    const square = `<div class="b-post b-post--float"><div class="b-ab" style="left:84px;top:84px">${lg('colour', 360, 'on-float')}</div><h2 class="disp b-ph1" style="left:84px;bottom:84px;width:912px">${A(p1)}</h2></div>`;
    const portrait = `<div class="b-post b-post--ink"><div class="b-ab" style="left:84px;top:84px">${lg('reversed', 360)}</div><h2 class="disp b-ph1" style="left:84px;top:430px;width:912px;font-size:120px;color:var(--ground)">${A(p2)}</h2><span class="b-pchip b-ab" style="left:84px;bottom:100px">${A(S.to)}</span></div>`;
    const story = `<div class="b-post b-post--ground"><div class="b-ab" style="left:84px;top:120px">${lg('colour', 360)}</div><h2 class="disp b-ph1" style="left:84px;top:330px;width:912px;font-size:120px">${A(p3)}</h2><span class="b-ppill b-ab" style="left:84px;top:720px">${A(S.empty.cta)}</span><div class="b-ab" style="left:180px;top:960px;width:360px;height:740px;transform:scale(2);transform-origin:0 0">${phoneToday(ctx, 'left:0;top:0')}</div></div>`;
    const cap = (n, t, d) => `<p class="b-pc">${mk(n)}<span><b>${t}</b>${d}</span></p>`;
    return std(ctx, 'social', 'Social', `<div class="b-soc"><div class="b-soc__c">${scaled(k, 1080, 1920, story, 'b-thumb')}${cap(1, 'Story, 1080 × 1920', 'The product, cropped, under the line and one button.')}</div><div class="b-soc__c">${scaled(k, 1080, 1080, square, 'b-thumb')}${cap(2, 'Square, 1080 × 1080', 'Float behind Deep end type, the logo on Float.')}${scaled(k, 1080, 1350, portrait, 'b-thumb')}${cap(3, 'Portrait, 1080 × 1350', 'Deep end, the reversed logo and the lane as a Float chip.')}</div></div>`);
  },

  signage(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, cw = B.logo.colourways;
    const [spec0, head0] = B.applications.signage.split(': ');
    const m = spec0.match(/(\d+)\s*x\s*(\d+)\s*mm/) || [0, 600, 900];
    const head = head0 || B.lines.primary, SW = 360, SH = Math.round((SW * m[2]) / m[1]), px = SW / m[1];
    const logo = ctx.logo.html('stacked', { width: 150, colourway: 'on-float', color: cw['on-float'].name, label: 'Logo' });
    const sign = `<div class="b-sign" style="width:${SW}px;height:${SH}px"><span class="b-screw" style="left:20px"></span><span class="b-screw" style="right:20px"></span><div class="b-ab" style="left:32px;top:56px">${logo}</div><h2 class="disp b-sign__h">${A(head)}</h2><p class="b-sign__n">${A(S.pickup)}</p></div>`;
    const dims = `<span class="b-dim b-dim--w" style="left:48px;top:52px;width:${SW}px"><em class="num">${m[1]} mm</em></span><span class="b-dim b-dim--h" style="left:22px;top:88px;height:${SH}px"><em class="num">${m[2]} mm</em></span>`;
    const wall = `<div class="b-pw b-pw--wall"><div class="b-wall">${sign}${dims}${mkm(1, 207)}${mkm(2, 383)}${mkm(3, 550)}${mkm(4, 600)}</div></div>`;
    const list = notes([
      ['Stacked logo on Float', `The stacked version in the on Float colourway, top left. ${A(B.logo.when.stacked)}`],
      ['One line', `The primary line in ${A(B.fonts.display.family)}, Deep end on Float. Sentence case, as many short lines as it takes.`],
      ['One notice', `A sentence in ${A(B.fonts.body.family)} that tells a parent what to do next: ${A(first(S.pickup))}`],
      ['Size', `${m[1]} × ${m[2]} mm, drawn at ${px.toFixed(1)} px to the millimetre. Float is the ground, so no photo sits behind it.`],
    ]);
    return std(ctx, 'signage', 'Signage', `<div class="b-two b-two--sign">${wall}<div class="b-side">${list}</div></div>`);
  },

  'email-signature'(ctx) {
    const B = ctx.brand, e = B.applications.email, g = B.guideB.email, c = B.applications.card, S = B.ui.screen.content;
    const bd = tok(ctx, 'body'), cp = tok(ctx, 'caption');
    const body = g.body.map((t) => `<p>${A(t)}</p>`).join('');
    const sg = (n, inner) => `<div class="b-pi b-sg">${mkp(n, 'b-pm--l', '--pmx:36px')}${inner}</div>`;
    const sig = `<div class="b-sig">${sg(1, `<div class="b-sig__logo">${ctx.logo.html('horizontal', { width: 190, label: 'Logo' })}</div>`)}${sg(2, `<p class="b-sig__n">${A(e.person)}</p><p class="b-sig__r">${A(e.role)}</p>`)}${sg(3, `<p class="b-sig__c">${A(c.contact)}<br>${A(B.applications.site.url)}</p>`)}</div>`;
    const mail = `<div class="b-mail"><div class="b-mail__h"><p><span>From</span>${A(e.person)}, ${A(c.contact)}</p><p><span>To</span>${A(g.to)}</p><p><span>Subject</span><b>${A(g.subject)}</b></p><p class="b-mail__t num">${A(g.time)}</p></div><div class="b-mail__b">${body}${sig}</div></div>`;
    const phone = `<div class="ph b-vp" style="left:60px;top:0;height:540px"><div class="sb">${A(S.time)}</div>${mail}</div>`;
    const list = notes([
      ['Logo', `The ${A(ctx.logo.labels.horizontal.toLowerCase())} version, 190 px wide. ${A(B.logo.when.horizontal)}`],
      ['Name and role', `${A(B.fonts.body.family)}. The name at ${bd.size} px, weight 600. The role at ${cp.size} px, in the quiet tone.`],
      ['Contact', `An address and a site, as live text. Arial stands in where ${A(B.fonts.body.family)} is not installed.`],
    ]);
    const plain = `<div class="b-plain"><p class="b-plain__h">With images off</p><p class="b-plain__t"><span>${A(e.person)}</span><span>${A(e.role)}</span><span>${A(B.name)}, ${A(c.contact)}</span><span>${A(B.applications.site.url)}</span></p><p class="cap">The logo drops out and the text stays. That is why the contact is never part of the picture.</p></div>`;
    return std(ctx, 'email-signature', 'Email signature', `<div class="b-two"><div class="b-side b-side--l">${list}${plain}</div><div class="b-pw b-pw--r" style="height:540px">${phone}</div></div>`);
  },

  digital(ctx) {
    const B = ctx.brand, S = B.ui.screen.content, ui = ctx.ui, F = S.form, X = S.example, k = 0.88;
    const sb = `<div class="sb">${A(S.time)}</div>`;
    const book = `<div class="ph ui b-app" style="left:0;top:0">${sb}<div class="b-app__in"><h2 class="ui-display b-app__t">${A(F.title)}</h2>${ui.field({ id: 'dg-who', label: F.pickup, value: F.pickupValue })}<div class="ui-field"><span class="ui-label">${A(F.size)}</span>${ui.segmented(F.sizes, 1)}</div>${ui.field({ id: 'dg-day', label: F.ready, value: F.readyValue, error: F.readyError })}</div><div class="b-app__foot">${ui.btn(F.book, { block: true })}</div></div>`;
    const week = `<div class="ph ui b-app" style="left:0;top:0">${sb}<div class="b-app__in"><h2 class="b-app__h">${A(X.crumbs[0])}</h2>${ui.tabs(X.tabs, 1)}${ui.deliveryRows(4)}</div><nav class="b-nav">${ui.links(X.links, 2)}</nav></div>`;
    const pw = Math.round(360 * k), ph = Math.round(740 * k), gx = 365;
    const stage = `<div class="b-dg" style="height:${ph}px">${scaled(k, 360, 740, book, '', 'position:absolute;left:0;top:0')}${scaled(k, 360, 740, week, '', `position:absolute;left:${gx}px;top:0`)}<span class="mk b-dm b-dm--l" style="top:315px">1</span><span class="mk b-dm b-dm--l" style="top:200px">2</span><span class="mk b-dm b-dm--r" style="top:96px">3</span><span class="mk b-dm b-dm--r" style="top:171px">4</span></div>`;
    const list = notes([
      ['Say no once', `The error names the day and the nearest yes: ${A(F.readyError)}`],
      ['Short choices', `${A(F.size)} is a segmented control: ${A(F.sizes.join(', '))}. The chosen one fills with Deep end.`],
      ['Tabs', `${A(X.tabs.join(', '))}. The current tab has a Lane underline, and one Lane button sits at the foot of a screen.`],
      ['Rows', `A lesson is a row: the swimmer, the time and lane, the price and a status.`],
    ], 'b-notes--2');
    return std(ctx, 'digital', 'Digital', `${stage}${list}`);
  },

  summary(ctx) {
    const B = ctx.brand, G = B.guideB, f = B.fonts, cw = B.logo.colourways, hl = tok(ctx, 'headline'), S = B.ui.screen.content;
    const by = (id) => ctx.colours.find((c) => c.id === id);
    // the brand on one screen: each colour noted where it lives, top to bottom; the key gives name, share and hex
    const order = ['float', 'deep-end', 'white', 'lane', 'chalk'].map(by);
    const mkc = (id, style) => mkp(order.indexOf(by(id)) + 1, '', style);
    const phone = `<div class="ph b-vp" style="left:0;top:0">
<div class="b-pi b-sfl">${mkc('float', '--pmx:16px;top:70px')}<div class="b-ab" style="left:24px;top:64px">${ctx.logo.html('colour', { width: 220, colourway: 'on-float', color: cw['on-float'].name, label: 'Logo' })}</div><h2 class="disp b-sfl__h" style="font-size:${Math.round(hl.size * 0.8)}px">${A(B.lines.primary)}</h2></div>
<div class="sb">${A(S.time)}</div>
<div class="b-pi b-sbody">${mkc('chalk', '--pmx:16px;top:276px')}
<div class="b-pi b-scard">${mkc('white', '--pmx:36px;top:auto;bottom:8px')}<div class="b-pi">${mkc('deep-end', '--pmx:56px;top:6px')}<p class="disp b-scard__t">${A(S.eta)}</p></div><div class="teach"><span class="av">${A(S.initials)}</span><div><b>${A(S.rider.split(',')[0])}</b><span>${A(S.riderNote)}</span></div></div></div>
<div class="b-pi b-sbtn">${mkc('lane', '--pmx:36px;top:10px')}<span class="b-pbtn">${A(S.empty.cta)}</span></div></div></div>`;
    const key = `<ol class="b-notes b-ckey">${order.map((c, i) => `<li>${mk(i + 1)}<div><b>${A(c.name)}</b><span class="num">${Math.round(c.share * 100)}%</span> <span class="b-mono">${A(c.hex)}</span></div></li>`).join('')}</ol>`;
    const faces = [[f.display, 'Display'], [f.body, 'Body'], [f.mono, 'Code strings']].map(([x, u]) => `<li><b>${A(x.family)}</b><span>${A(u)}, ${x.weights.join(', ')}</span></li>`).join('');
    const lines = [B.lines.primary, ...B.lines.others].map((l) => `<li><b>${A(l)}</b></li>`).join('');
    const rules = G.rules.map((r, i) => `<li>${mk(i + 1)}<h3 class="b-rh">${A(r.title)}</h3><p class="b-rp">${A(r.text)}</p></li>`).join('');
    return std(ctx, 'summary', 'Summary', `<div class="b-two"><div class="b-pw">${phone}</div><div class="b-side">${key}<p class="b-sh2">Faces</p><ul class="b-lst">${faces}</ul><p class="b-sh2">Lines</p><ul class="b-lst">${lines}</ul></div></div><ol class="b-rules3">${rules}</ol>`);
  },

  'contact-scope'(ctx) {
    const B = ctx.brand;
    const screen = (title, inner) => `<div class="b-lp"><i class="b-lp__n" aria-hidden="true"></i><p class="b-cs__k">${title}</p>${inner}</div>`;
    const secs = ctx.sections.map((s) => `<li><span class="num b-sn">${s.n}</span>${A(s.title)}</li>`).join('');
    const not = [['Logo files, palettes and fonts', 'They are in the brand kit.'], ['Interface components and tokens', 'They are in the UI kit.'], ['Print specifications, CMYK and Pantone values', 'Ask your printer for a proof.']].map(([a, c]) => `<li><b>${a}.</b> ${c}</li>`).join('');
    const ask = `<div class="b-ask"><h2 class="disp b-ask__h">Who to ask</h2><div class="b-ask__r"><p class="b-ask__p">${A(B.contact.owner)} owns this document. Write for a logo file, a missing asset or an exception.</p><p class="b-mail2"><span class="b-mono">${A(B.contact.email)}</span></p></div></div>`;
    const ver = `<table class="b-vt"><tbody><tr><td class="num">${A(B.version.number)}</td><td>${A(ctx.date)}</td></tr><tr><td colspan="2">First release.</td></tr></tbody></table>`;
    return std(ctx, 'contact-scope', 'Contact and scope', `${ask}<div class="b-cs">${screen('Version history', ver)}${screen('In this document', `<ol class="b-in">${secs}</ol>`)}${screen('Not in this document', `<ul class="b-not">${not}</ul>`)}</div>`);
  },
};

export const guidelinesB = own;
